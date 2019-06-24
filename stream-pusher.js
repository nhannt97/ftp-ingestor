const SizeChunker = require('chunking-streams').SizeChunker;
const mime = require('mime');
const path = require('path');
const moment = require('moment');
const failureReason = require('./failure-reason');

module.exports = function(heart, logger, filename, fileModifiedDateTime, fileFfmpegFormat, chunkSize, kafkaProducer, streamOutKafkaTopic, streamOutKafkaPartition, streamKafkaPrefix) {
	let streamEndCallback = null;
	const chunker = new SizeChunker({
		chunkSize,
		flushTail: true // flush or not remainder of an incoming stream. Defaults to false
	});

	function start(callback) {
		logger.debug('Sending stream_init');
		const extention = path.extname(filename).toLowerCase();
		const contentType = mime.getType(extention);

		const streamInit = {
			type: 'stream_init',
			timestampUTC: moment().utc().valueOf(),
			taskId: heart.taskId,
			tdoId: heart.tdoId,
			jobId: heart.jobId,
			mediaName: filename,
			mediaStartTimeUTC: fileModifiedDateTime,
			offsetMS: 0,
			chunkSize: chunkSize,
			mimeType: contentType,
			ffmpegFormat: fileFfmpegFormat
		};

		// `stream_init`
		kafkaProducer.send([{
			topic: streamOutKafkaTopic,
			partition: streamOutKafkaPartition,
			messages: [JSON.stringify(streamInit)],
			key: `${streamKafkaPrefix}stream_init`
		}], (err) => {
			if (err) {
				logger.errorOccurred(`Error init stream`, err);
				throw new {reason: failureReason.FailureReasonAPIError, message: err.message};
			}
			logger.debug('stream_init sent');
			callback();
		});
	}

	function end(callback) {
		logger.debug('Sending stream_eof');
		const streamEnd = {
			type: 'stream_eof',
			timestampUTC: moment().utc().valueOf(),
			taskId: heart.taskId,
			tdoId: heart.tdoId,
			jobId: heart.jobId,
			forcedEOF: false
		};

		// `stream_eof`
		kafkaProducer.send([{
			topic: streamOutKafkaTopic,
			partition: streamOutKafkaPartition,
			messages: [JSON.stringify(streamEnd)],
			key: `${streamKafkaPrefix}stream_eof`
		}], (err) => {
			if (err) {
				logger.errorOccurred(`Error end stream`, err);
				throw {reason: failureReason.FailureReasonAPIError, message: err.message};
			}
			logger.debug('stream_eof sent');
			callback(err);
		});
	}

	chunker.on('data', function(chunk) {
		// update heart statistics
		heart.increaseBytesRead(chunk.data.length);
		// push to kafka `raw_stream`
		kafkaProducer.send([{
			topic: streamOutKafkaTopic,
			partition: streamOutKafkaPartition,
			messages: chunk.data,
			key: `${streamKafkaPrefix}raw_stream`
		}], (err) => {
			if (err) {
				logger.errorOccurred(`Error raw stream`, err);
				throw {reason: failureReason.FailureReasonAPIError, message: err.message};
			}
			heart.increaseBytesWritten(chunk.data.length);
			heart.increaseMessagesWritten();
		});
	});

	function push(stream) {
		stream.pipe(chunker);
	}

	function streamEnd() {
		return new Promise((resolve, reject) => {
			streamEndCallback = true;
			// waiting to write all bites
			end(() => {
				if (streamEndCallback) {
					let bytesWritten = heart.getBytesWritten();
					let bytesRead = heart.getBytesRead();
					return resolve({bytesRead, bytesWritten});
				}
			});
		});
	}

	return {
		start,
		push,
		streamEnd
	};
};
