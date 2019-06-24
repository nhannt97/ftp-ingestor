'use strict';

// init basic
const adapterLib = require('adapter-nodejs-lib')();
const isDebug = true;
const logger = adapterLib.logger(isDebug);
const kafka = require('kafka-node');
const environment = require('./environment')();
const payload = environment.engine.payload;
const sourceId = payload.sourceId;
const token = payload.token;
const veritoneUrl = payload.veritoneApiBaseUrl + '/v3/graphql';
const taskApi = adapterLib.graphqlClient(veritoneUrl, token, logger, payload);
const failureReason = adapterLib.failureReasons;
const tdoId = payload.tdoId;
const mode = payload.mode;

logger.debug(`FTP/SFTP adapter start. TaskId: ${payload.taskId}`);
const validator = require('./validator')(logger);
// init kafka messaging
const client = new kafka.KafkaClient({ kafkaHost: environment.kafkaBrokers });
const producer = new kafka.Producer(client);
// make sure producer is ready before start working with kafka
producer.on('ready', () => {
	// init heart
	const heart = adapterLib.heart(client,
		logger,
		producer,
		environment.engine.heartbeatTopic,
		environment.engine.engineId,
		environment.engine.engineInstanceId,
		environment.engine.payload.taskId,
		environment.engine.payload.jobId,
		environment.engine.heartbeatPushingInterval,
		tdoId,
		environment.engine.ingestionQueue);
	// heart.taskId  = taskId;
	heart.start().then(() => {
		taskApi.getSource(sourceId).then((response) => {
			if (!validator.validateSource(response)) {
				return failed({ reason: failureReason.FailureReasonInvalidData, message: 'Invalid data' }, heart);
			}
			const sourceDetails = response.details;
			//
			const filePaths = sourceDetails.filePaths == undefined ? null : sourceDetails.filePaths;
			const directoryPaths = sourceDetails.directoryPaths == undefined ? null : sourceDetails.directoryPaths;
			//
			const { name } = response.sourceType;
			const { lastProcessedDateTime } = response.state;
			// const lastProcessedDateTime = validator.validateDate(lastProcessedDateTime);
			let sourceTypeName = name.toLowerCase();
			const adapter = require('./ftp-ingestor')(
				taskApi, 
				logger, 
				sourceDetails, 
				sourceId, 
				sourceTypeName,
				producer,
				environment.engine.ingestionQueue,
				payload.jobId,
				payload.taskId
			);
			let modeRunner = null;
			const startTime = new Date();

			if (mode === 'scan') {
				modeRunner = adapter.scan(directoryPaths, filePaths, lastProcessedDateTime, heart, environment.engine);
			} else if (mode === 'ingest') {
				// console.log(`TaskId : ${taskId}. Runnning ingest mode`);
				const streamOutKafkaTopic = environment.engine.streamKafkaOutputTopic;
				const streamOutKafkaPartition = environment.engine.streamKafkaOutputPartition;
				const streamKafkaPrefix = environment.engine.streamKafkaPrefix;
				console.log('payload', payload);
				console.log(`streamOutKafkaTopic : ${streamOutKafkaTopic}. streamOutKafkaPartition : ${streamOutKafkaPartition}. streamKafkaPrefix : ${streamKafkaPrefix}`);
				const fileName = payload.metadata.fileName;
				const fileId = payload.fileId;
				const fileModifiedDateTime = payload.metadata.fileModifiedDateTime;
				const fileFfmpegFormat = '';
				const chunkSize = environment.engine.chunkSize;

				modeRunner = adapter.ingest(heart, producer, streamOutKafkaTopic, streamOutKafkaPartition, streamKafkaPrefix, chunkSize, fileName, fileId, fileModifiedDateTime, fileFfmpegFormat);
			} else {
				logger.info(`Unrecognized mode: ${mode}`);
				return failed({ reason: failureReason.FailureReasonInvalidData, message: 'This mode is not scan or ingest' }, heart);
			}

			// handle completion
			modeRunner
				.then((infoRaw) => {
					const endTime = new Date();
					if (mode === 'scan') {
						const infoMes = {
							startTime: startTime,
							endTime: endTime,
							numberScanFile: infoRaw.numberOfScanned
						};
						heart.done(JSON.stringify(infoMes)).then(() => {
							logger.info('Job done');
							stopKafka(() => {
								logger.info('Kafka stopped');
							});
						});
					} else {
						if (infoRaw.fileSize == infoRaw.bytesRead && infoRaw.bytesWritten == infoRaw.bytesRead) {
							const infoMes = {
								startTime: startTime,
								endTime: endTime,
								bytesRead: infoRaw.bytesRead,
								bytesWritten: infoRaw.bytesWritten,
								fileSize: infoRaw.fileSize
							}
							heart.done(JSON.stringify(infoMes)).then(() => {
								logger.info('Job done');
								stopKafka(() => {
									logger.info('Kafka stopped');
								});
							});
						} else {
							heart.fail(failureReason.FailureReasonOther, `The file size, byte read and written are different`).then(() => {
								logger.info('Job failed');
								stopKafka(() => {
									logger.info('Kafka stopped');
								});
							});
						}
					}
				}, (failureReason) => {
					return failed(failureReason, heart);
				});
		}).catch((err) => {
			if (err) {
				return failed({ reason: failureReason.FailureReasonAPIError, message: err.message }, heart);
			}
		});
	}).catch((err) => {
		if (err || !validator.validatePayload(payload, environment.engine.streamKafkaOutputTopic, environment.engine.streamKafkaOutputPartition, environment.engine.streamKafkaPrefix)) {
			if (!err) {
				return failed({ reason: failureReason.FailureReasonInvalidData, message: new Error('invalid_data').message }, heart);
			}
			return failed({ reason: failureReason.FailureReasonInvalidData, message: err.message }, heart);
		}

	});
});

// helpers
function stopKafka(callback) {
	client.close(callback);
}

function failed(failure, heart) {
	heart.fail(failure.reason, failure.message).then(() => {
		logger.info('Job failed');
		stopKafka(() => {
			logger.info('Kafka stopped');
		});
	});
}
