const path = require('path');
const FTPClient = require('ftp');
const SFTPClient = require('sftpjs');
const mime = require('mime');
const utf8 = require('utf8');
const uuidv5 = require('uuid/v5');
const adapterLib = require('adapter-nodejs-lib')();
const fReasons = adapterLib.failureReasons;

module.exports = function createFunction(
	taskApi, 
	logger, 
	sourceDetails, 
	sourceId, 
	sourceTypeName, 
	producer,
	kafkaIngestionTopic,
	jobId, 
	taskId
	) {
	let passphrase = null;
	let privateKey = null;
	let host = sourceDetails.host.replace(/ /g, '');
	if (typeof sourceDetails.passphrase !== 'undefined' && sourceDetails.passphrase !== 'undefined') {
		passphrase = sourceDetails.passphrase;
	}
	if (typeof sourceDetails.privateKey !== 'undefined' && sourceDetails.privateKey !== 'undefined') {
		privateKey = sourceDetails.privateKey;
		privateKey = privateKey.replace('KEY-----', 'KEY-----\r\n');
		privateKey = privateKey.replace('-----END', '\r\n-----END');
		privateKey = Buffer.from(privateKey, 'utf8');
	}
	const ftpConfig = {
		host: host,
		port: sourceDetails.port,
		user: sourceDetails.username,
		password: sourceDetails.password,
		passphrase: passphrase,
		privateKey: privateKey,
		secureOptions: { rejectUnauthorized: sourceDetails.verifySSLCertificate }
	};
	if (!sourceDetails.password) {
		delete ftpConfig.password;
	}
	if (!ftpConfig.secureOptions.rejectUnauthorized) {
		delete ftpConfig.secureOptions;
	}

	const uuidNamespace = '84449a79-5e08-43cc-8c26-c56bf8824e8a';

	function sleep(ms) {
		return new Promise(resolve => {
			setTimeout(resolve, ms)
		})
	}

	function createIngestJob(files, heart, config) {
		return new Promise(async (resolve, reject) => {
			let numberOfScanned = 0;
			const processSpeed = config.processSpeed;
			let maxConcurrent = config.maxConcurrentJob;
			let i = 0;
			let waitingProcess = 0;
			let itemShouldWait = 0;
			for (const file of files) {
				i++;
				const fileId = file.fullPathName;
				const fileName = file.name;
				const fileModifiedDateTime = Math.round(Date.parse(file.date) / 1000);
				const itemPayload = {
					fileId: fileId,
					metadata: {
						fileName: fileName,
						fileModifiedDateTime: fileModifiedDateTime
					},
					mode: 'ingest'
				};

				logger.debug(`start creating subjobs to ingest`);
				const adapterLib = require('adapter-nodejs-lib')();
				const kafkaReq = adapterLib.kafkaRequests(logger, producer, kafkaIngestionTopic, jobId, taskId);
				await kafkaReq.createJob(itemPayload, sourceId).then().catch((err) => {
						logger.errorOccurred('Can not create ingestion job', err);
						return reject({ reason: fReasons.FailureReasonAPIError, message: err.message });
				});
				numberOfScanned++;
				itemShouldWait = Math.ceil(file.size * 1000 / (processSpeed * config.chunkSize));
				if (itemShouldWait > waitingProcess) {
					waitingProcess = itemShouldWait;
				}

				if (i % maxConcurrent === 0) {
					console.log('waitingProcess', waitingProcess);
					await sleep(waitingProcess);
					waitingProcess = 0;
				}
			}

			resolve(numberOfScanned);
		})
	}

	function getTotalIngestedFiles(sourceId) {
		return new Promise(async (resolve, reject) => {
			try {
				let limit = 1000;
				let offset = 0;
				let jobLength = 1;
				let ingestedFiles = [];
				while (jobLength > 0) {
					const [iFiles, jobLen] = await getIngestedFiles(sourceId, limit, offset);
					jobLength = jobLen;
					console.log('ingested files', iFiles.length);
					console.log('jobLength', jobLength);
					ingestedFiles = ingestedFiles.concat(iFiles);
					offset += jobLength;
				}
				console.log('ingestedFiles', ingestedFiles.length);
				resolve(ingestedFiles);
			} catch (failureReason) {
				return reject(failureReason);
			}
		});
	}

	function getIngestedFiles(sourceId, limit, offset) {
		return new Promise((resolve, reject) => {
			taskApi.getSourceJobStatus(sourceId, limit, offset).then((response) => {
				if (response.errors && response.errors.name === 'service_unavailable') {
					return reject({ reason: fReasons.FailureReasonUnknown, message: 'service_unavailable' });
				}
				let ingestedFiles = [], jobs = [], tasks = [];
				response.data.scheduledJobs.records.forEach((scheduledJob) => {
					jobs = jobs.concat(scheduledJob.jobs.records);
				});

				jobs.forEach((job) => {
					tasks = tasks.concat(job.tasks.records);
				});

				tasks.forEach(function (task) {
					if (task.payload.mode === 'ingest') {
						const hash = uuidv5(`${task.payload.metadata.fileModifiedDateTime}@@${task.payload.fileId}`, uuidNamespace);
						ingestedFiles.push(hash);
					}
				});

				resolve([ingestedFiles, jobs.length]);
			}).catch((err) => {
				if (err) {
					logger.errorOccurred('Task failed (scan mode, on getting source status)', JSON.stringify(err));
					return reject({ reason: fReasons.FailureReasonAPIError, message: err.message });
				}
			});
		});
	}

	function scan(directoryPaths, filePaths, lastProcessedDateTime, heart, config) {
		let numberOfScanned = 0;
		return new Promise((resolve, reject) => {
			workWithNewConnection(ftpConfig, (failureReason, connection) => {
				if (failureReason) {
					logger.errorOccurred('INFO: Task failed (error with ftp/sftp connection creation)', JSON.stringify(failureReason));
					return reject({ reason: fReasons.FailureReasonOther, message: JSON.stringify(failureReason) });
				}
				if (typeof lastProcessedDateTime === 'undefined') {
					lastProcessedDateTime = null;
				}
				let lastFileModificationDate = lastProcessedDateTime ? new Date(lastProcessedDateTime) : null;

				getAllFileInFolder(connection, directoryPaths, filePaths).then(async allFiles => {
					try {
						const ingestedFiles = await getTotalIngestedFiles(sourceId);
						const files = allFiles.filter((entry) => {
							const fileDate = Math.round(Date.parse(entry.date) / 1000);
							const hash = uuidv5(`${fileDate}@@${entry.fullPathName}`, uuidNamespace);
							if (ingestedFiles.length > 0 && ingestedFiles.indexOf(hash) > -1) {
								return false;
							}
							return true;
						});

						if (files.length === 0) {
							logger.info('Scan mode complete. Nothing to ingest');
							return resolve({ numberOfScanned });
						} else {
							logger.info(`Found ${files.length} non ingested files`);

							createIngestJob(files, heart, config).then((numberOfScanned) => {
								if (lastFileModificationDate > lastProcessedDateTime) {
									sourceDetails.lastProcessedDateTime = lastFileModificationDate;

									const details = sourceDetails;

									logger.info(`Seems we need to update LastModifiedDateTime field from ${lastProcessedDateTime} to ${lastFileModificationDate}`);

									taskApi.updateSource(sourceId, details, { lastProcessedDateTime: lastProcessedDateTime }).then().catch((err) => {
										if (err) {
											logger.errorOccurred('Can not update ingestion LastModifiedDateTime', JSON.stringify(err));
											return reject({ reason: fReasons.FailureReasonAPIError, message: JSON.stringify(err) });
										}
										logger.debug('Ingestion LastModifiedDateTime updated successfully');
									});
								}

								return resolve({ numberOfScanned });
							}).catch((fReason) => {
								return reject(fReason);
							});
						}
					} catch (failureReason) {
						logger.errorOccurred('Task failed (scan mode, can not create ingest jobs)', JSON.stringify(failureReason));
						return reject(failureReason);
					}
				}).catch(failureReason => {
					logger.errorOccurred('Task failed (scan mode, on getting folder content from remote ftp server)', JSON.stringify(failureReason));
					return reject(failureReason);
				});
			});
		});
	}

	function ingest(heart, producer, streamOutKafkaTopic, streamOutKafkaPartition, streamKafkaPrefix, chunkSize, fileName, fileId, fileModifiedDateTime, fileFfmpegFormat) {
		return new Promise((resolve, reject) => {
			workWithNewConnection(ftpConfig, (failure, connection) => {
				if (failure) {
					logger.errorOccurred('INFO: Task failed (error with ftp/sftp connection creation)', JSON.stringify(failure));
					return reject({ reason: fReasons.FailureReasonOther, message: JSON.stringify(failure) });
				}
				const file = { name: fileName, fullPath: fileId };
				const pusher = adapterLib.streamPusher(
					heart,
					logger,
					fileName,
					chunkSize,
					producer,
					streamOutKafkaTopic,
					fileModifiedDateTime,
					fileFfmpegFormat,
					streamOutKafkaPartition,
					streamKafkaPrefix);

				connection.get(file.fullPath, (err, readableStream) => {
					if (err) {
						// console.log(err);
						// Manually handle error to make them tolerable and loggable.
						return reject({ reason: fReasons.FailureReasonAPIError, message: err.message });
					}
					pusher.sendKafkaInit();
					readableStream.on('data', (chunk) => {
						pusher.push(chunk);
					});
					readableStream.on('end', async () => {
						console.log('finished downloading!');
						if (pusher) {
							await pusher.sendKafkaEnd();
							let dirPath = file.fullPath;
							dirPath = dirPath.split('/');
							dirPath.pop();
							dirPath = dirPath.join('/');
							connection.list(dirPath, (err, list) => {
								if (err) {
									return reject({ reason: fReasons.FailureReasonAPIError, message: err.message });
									connection.end();
								}
								connection.end();
								const targetFiles = list.filter(item => item.name == file.name);
								let bytesRead = heart.getBytesRead();
								let bytesWritten = heart.getBytesWritten();
								let fileSize = targetFiles[0].size;
								return resolve({ bytesRead, bytesWritten, fileSize });
							});
						}
					});
				});
			});
		});
	}

	function workWithNewConnection(ftpConfig, callback) {
		try {
			console.log('Creating new connection', sourceTypeName);

			let connection = sourceTypeName === 'ftp' ? new FTPClient() : new SFTPClient();
			console.log('Preparing connection', ftpConfig);

			if (ftpConfig.host) {
				let targetString = 'ftp://';
				let targetIndex = ftpConfig.host.indexOf(targetString);
				if (targetIndex === 0) {
					ftpConfig.host = ftpConfig.host.slice(targetString.length, ftpConfig.host.length);
				}
				let hostParts = ftpConfig.host.split('/');
				if (hostParts.length > 1) {
					ftpConfig.host = hostParts[0];
					if (!hostParts[hostParts.length - 1]) {
						hostParts.length--;
					}
				}
			}

			try {
				connection.on('ready', () => {
					console.log('Connection ready');
					callback(null, connection);
				}).on('error', (err) => {
					console.log(err);
					callback(err);
				}).connect(ftpConfig);
			} catch (e) {
				console.log(e.message);
				callback(e);
			}
		} catch (e) {
			console.log('? throw what the heck ?');
			callback(e);
		}
	}

	function getFolderContent(connection, directoryPath, callback) {
		let files = [];
		let dirs = [];
		connection.list(directoryPath, (err, list) => {
			if (err) {
				return callback({ reason: fReasons.FailureReasonAPIError, message: err.message });
			}

			list = list.filter(entry => entry.name[0] !== '.');

			if (list.length !== 0) {
				list.map(entry => {
					entry.nameDecoded = convertUnicode(entry);
					entry.fullPathName = directoryPath === '/' ? `${directoryPath}${entry.nameDecoded}` : `${directoryPath}/${entry.nameDecoded}`;
					entry.extention = path.extname(entry.nameDecoded).toLowerCase();
					entry.mimeType = mime.getType(entry.extention);
				});

				dirs = list.filter(entry => entry.type === 'd').map(entry => entry.fullPathName);

				files = list
					.filter(entry => entry.mimeType !== null && (entry.mimeType.indexOf('audio/') >= 0 || entry.mimeType.indexOf('video/') >= 0 || entry.mimeType.indexOf('image/') >= 0));
			}

			callback(null, files, dirs);
		});
	}

	function getFileOfSftp(connection, filePath, callback) {
		// split fileName and path
		filePath = filePath.split('/');
		let fileName = filePath.pop();
		filePath = filePath.join('/');
		connection.list(filePath, (err, list) => {
			if (err) {
				return callback({ reason: fReasons.FailureReasonAPIError, message: err.message });
			}
			list.map(entry => {
				entry.nameDecoded = convertUnicode(entry);
				entry.fullPathName = filePath + '/' + fileName;
				entry.extention = path.extname(entry.nameDecoded).toLowerCase();
				entry.mimeType = mime.getType(entry.extention);
			});

			const file = list
				.filter(entry => entry.mimeType != null && (entry.mimeType.indexOf('audio/') >= 0 || entry.mimeType.indexOf('video/') >= 0 || entry.mimeType.indexOf('image/') >= 0) && entry.name === fileName);
			return callback(null, file);
		});
	}

    /**
     *
     * @param connection
     * @param rootDir
     * @return {Promise<Array>}
     */
	async function getAllFileInFolder(connection, dirPaths, filePaths) {
		let allFiles = [];

		if (dirPaths != null) {
			for (let rootDir of dirPaths) {
				let filesOfDir = [];
				let subDirList = [];
				subDirList.push(rootDir);
				while (subDirList.length > 0) {
					const dir = subDirList.shift();
					let { dirs, files } = await new Promise((resolve, reject) => {
						getFolderContent(connection, dir, (failureReason, files, dirs) => {
							if (failureReason) return reject(failureReason);
							else return resolve({ files, dirs });
						});
					});
					subDirList = subDirList.concat(dirs);
					filesOfDir = filesOfDir.concat(files);
				}
				allFiles = allFiles.concat(filesOfDir);
			}
		} else if (filePaths != null) {
			for (let filePath of filePaths) {
				const file = await new Promise((resolve, reject) => {
					getFileOfSftp(connection, filePath, (failureReason, file) => {
						if (failureReason) return reject(failureReason);
						else return resolve(file);
					});
				});

				allFiles = allFiles.concat(file);
			}
		}

		await connection.end();
		return allFiles;
	}

	function convertUnicode(pathEntry) {
		let name = null;
		try {
			name = utf8.decode(pathEntry.name);
		} catch (err) {
			name = pathEntry.name;
		}
		return name;
	}

	return {
		scan,
		ingest
	};
};
