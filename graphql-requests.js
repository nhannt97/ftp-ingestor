const request = require('superagent');
global.fetch = require('node-fetch');

module.exports = function createFunction(token, veritoneApiUrl, debug, maxRetry, retryDelay) {
	const adapterLib = require('adapter-nodejs-lib')();
	const logger = adapterLib.logger(debug);

	function executeQuery(query, operationName, callback) {
		let headers = {
			Authorization: 'Bearer ' + token
		};

		request
			.post(veritoneApiUrl)
			.set(headers)
			.field('query', query)
			.end((err, response) => {
				if (!err) {
					if (response.body.errors) {
						logger.failedRequest(`${operationName} failed`, query, JSON.stringify(response));
						return callback(response.body, response.body.errors);
					}
					// logger.debug(`${operationName} response: ${JSON.stringify(response.body)}`);
					callback(response.body);
				} else {
					console.log('err', JSON.stringify(err));
					logger.failedRequest(`${operationName} failed`, query, JSON.stringify(response));
					callback(response, err);
				}
			});
	}

	function executeQueryRetry(query, operationName, callback) {
		if (!maxRetry) {
			maxRetry = 5;
		}
		let iRetry = 0;
		function execute(cb) {
			iRetry++;
			executeQuery(query, operationName, (body, err) => {
				if (iRetry <= maxRetry && err) {
					console.log('Attempt ', iRetry);
					setTimeout(() => {
						execute(cb);
					}, retryDelay);
				} else {
					cb(body, null);
				}
			})
		}
		execute(callback);
	}

	/*
	 * updateTask function is used to update status of the processed task
	 * during scan mode.
	 * taskId - id of the task that is processed
	 * jobId - od of the job inside which the tassk is located
	 * status - current status of processing (e.g. running, failed, complete)
	 */
	function updateTask(taskId, jobId, status, callback) {
		const query = `
		mutation {
			updateTask(input: {
				id: "${taskId}"
				jobId: "${jobId}"
				status: ${status}
			})
			{
		 		id
		 		jobId
		 		status
			}
	 	}`;
		executeQueryRetry(query, 'Update Task', (body, err) => {
			if (err) {
				return callback(err);
			}

			callback();
		});
	}

	/*
	 * createJob function is used to create a Job for ingest module
	 *
	 */
	function createJob(tasks, callback) {
		let query = `
	mutation {
	   createJob( input: { tasks : [`;
		tasks.forEach((task, i) => {
			query += `{
		engineId: "${task.engineId}"
		payloadString: "${JSON.stringify(task.payload).replace(/"/g, '\\"')}"
	   }`;
			if (i !== tasks.length - 1) query += ', ';
		});

		query += ']})  { id tasks { records { id engineId } }   }}';

		executeQueryRetry(query, 'Create job', (body, err) => {
			if (err) {
				return callback(err);
			}

			callback();
		});
	}

	/*
	 * updateIngestion function is used to update last processed date of files
	 *
	 */

	function updateSource(sourceId, details, callback) {
		const query = `
			mutation {
				updateSource(input: {
					id: "${sourceId}",
					details: {
						host:  "${details.host}",
						port:  "${details.port}",
						username:  "${details.username}",
						password:  "${details.password}",    
						directoryPath: "${details.directoryPath}",
						passphrase:  "${details.passphrase}",
						privateKey:  "${details.privateKey}",
						secureOptions: {
							rejectUnauthorized:  "${details.rejectUnauthorized}"
						}
					},
					state: {
						lastProcessedDateTime: ${details.lastProcessedDateTime}
					}
				}) {
				id
			}
		}
	  `;
		executeQueryRetry(query, 'Update source', (body, err) => {
			if (err) {
				return callback(err);
			}

			callback();
		});
	}

	function createTDO(startDateTime, stopDateTime, source, isPublic, createTDOTaskId, callback) {
		// TODO: doesn't works since working env changed (dev->prod)
		const query = `mutation {
			createTDO(input: {
				status: "uploaded"
				startDateTime: ${startDateTime}
				stopDateTime: ${stopDateTime}
				source: "${source}"
				sourceData: {
					taskId: "${createTDOTaskId}"
				}
			}) {
			id
			createdDateTime
			sourceData {
				taskId
			}
			applicationId
		 }}`;

		executeQueryRetry(query, 'Create TDO', (body, err) => {
			if (err) {
				return callback(err);
			}

			logger.info(`TDO created. Id: ${body.data.createTDO.id}`);
			callback(null, body.data.createTDO.id);
		});
	}

	/*
	 * createAsset function is used to pass downloaded file
	 *
	 */

	function createAsset(size, filename, tdoId, contentType, buffer, callback) {
		let query = `mutation {
	  createAsset(input: {
		 containerId: "${tdoId}"
		 contentType: "${contentType}"
		 jsondata: {
		   size: ${size}
		   source: "Google Drive"
		   fileName: "${filename}"
		 }
		 assetType: "media"
	   }) {
		 id
		 uri
	   }
	}
	 `;
		let headers = {
			Authorization: 'Bearer ' + token
		};

		try {
			request
				.post(veritoneApiUrl)
				.set(headers)
				.field('query', query)
				.field('filename', filename)
				.attach('file', buffer, filename)
				.end(function gotResponse(err, response) {
					if (!err) {
						if (response.body.errors) {
							logger.failedRequest(`Create asset failed`, query, JSON.stringify(response));
							return callback(response.body.errors);
						}
						let responseData = JSON.parse(response.text);
						logger.debug(`Create asset response: ${JSON.stringify(response.body)}`);
						logger.info('New asset created with id ' + responseData.data.createAsset.id);
						callback();
					} else {
						logger.failedRequest(`Create asset failed`, query, JSON.stringify(err));
						callback(err);
					}
				});
		} catch (e) {
			console.log(e);
		}
	}

	/*
	 * completeIngestionModeTask function is used to set ingestion mode task as complete
	 *
	 */

	function completeIngestionModeTask(taskId, jobId, targetId, name, startDate, stopDate, callback) {
		const query = `
		mutation {
		 updateTask(input: {
		   id: "${taskId}"
		   jobId: "${jobId}"
		   status: complete
		   taskOutput : {
			 recordingId: ${targetId}
			 recording : {
				id: ${targetId}
				name: "${name}"
				startDateTime: ${startDate}
				stopDateTime: ${stopDate}
			  }
		   }
		 })
		 {
		   id
		   status
		 }
	   }
	  `;
		executeQueryRetry(query, 'Create asset', (body, err) => {
			if (err) {
				return callback(err);
			}
			callback(null, body);
		});
	}

	function createNextPipelineJobs(parentJobId, filename, targetId, callback) {
		const query = `
		mutation {
		  createNextPipelineJobs(input: {
			payload: {
			  fileId: "${filename}", 
			}, 
			targetInfo: {targetId: "${targetId}"}, 
			parentJobId: "${parentJobId}"}) {
			id
		  }
		}
	  `;
		executeQueryRetry(query, 'Create next pipeline jobs', (body, err) => {
			if (err) {
				return callback(err);
			}
			callback(null, body);
		});
	}

	function getSourceConfiguration(sourceId, callback) {
		const query = `
			  query {
				sources(id: "${sourceId}") {
				  records {
					id
					sourceType {
					  id
					  name
					}
					details
					state
				  }
				}
			  }
		`;
		executeQueryRetry(query, 'Get Source configuration', (body, err) => {
			if (err) {
				return callback(err);
			}
			callback(null, body);
		});
	}

	function getSourceJobStatus(sourceId, limit, offset, callback) {
		if (!limit) {
			limit = 1000;
		}
		if (!offset) {
			offset = 0;
		}
		const query = `
		query {
			scheduledJobs(primarySourceId:"${sourceId}") {
				records{
					jobs(limit: ${limit}, offset: ${offset}){
						count
						records{
							id
							tasks(status:[complete, running, queued]){
								records{
									id
									status
									completedDateTime
									payload
								}
							}
						}
					}
				}
			}
		}`;

		executeQueryRetry(query, 'Get source job status', (body, err) => {
			if (err) {
				return callback(err);
			}
			callback(null, body);
		});
	}

	return {
		updateTask,
		createJob,
		updateSource,
		createTDO,
		createAsset,
		completeIngestionModeTask,
		createNextPipelineJobs,
		getSourceConfiguration,
		getSourceJobStatus
	};
};
