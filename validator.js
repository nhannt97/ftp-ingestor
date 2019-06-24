const _ = require('lodash');

module.exports = function createFunction(logger) {
	function validatePayload(payload, streamOutKafkaTopic, streamOutKafkaPartition, streamKafkaPrefix) {
		let valid = true;
		if (!_.isObject(payload)) {
			logger.error('payload is required');
			valid = false;
		}

		return valid && validatePayloadMode(payload, streamOutKafkaTopic, streamOutKafkaPartition, streamKafkaPrefix) && validatePayloadToken(payload);
	}

	function validatePayloadToken(payload) {
		let valid = true;
		if (!_.isString(payload.token)) {
			logger.error('payload.token doesnt exists');
			valid = false;
		}

		return valid;
	}

	function validateIngest(payload, streamOutKafkaTopic, streamOutKafkaPartition, streamKafkaPrefix) {
		let valid = true;
		if (!_.isString(payload.fileId)) {
			logger.error('payload.fileId doesnt exists');
			valid = false;
		}
		if (!_.isString(streamOutKafkaTopic)) {
			logger.error('streamOutKafkaTopic doesnt exists');
			valid = false;
		}
		if (!_.isString(streamOutKafkaPartition)) {
			logger.error('streamOutKafkaPartition doesnt exists');
			valid = false;
		}
		if (!_.isString(streamKafkaPrefix)) {
			logger.error('streamKafkaPrefix doesnt exists');
			valid = false;
		}
		return valid;
	}

	function validatePayloadMode(payload, streamOutKafkaTopic, streamOutKafkaPartition, streamKafkaPrefix) {
		let valid = true;
		if (!_.isString(payload.mode)) {
			logger.error('payload.mode is required');
			valid = false;
		}
		if (!_.isString(payload.sourceId)) {
			logger.error('payload.sourceId is required');
			valid = false;
		}
		if (payload.mode !== 'scan' && payload.mode !== 'ingest') {
			logger.error('payload.mode must be "scan" or "ingest"');
			valid = false;
		}
		if (payload.mode === 'ingest') {
			valid &= validateIngest(payload, streamOutKafkaTopic, streamOutKafkaPartition, streamKafkaPrefix);
		}

		return valid;
	}

	function validateDate(date) {
		if (!date) {
			return 0;
		}
		return date;
	}

	function validateSource(response) {
		console.log(JSON.stringify(response))
		if (response &&
			response.details &&
			response.state) {
			// yes we have some response
			const {host, port, username, password, directoryPaths, filePaths} = response.details;
			const { lastProcessedDateTime } = response.state;

			let valid = true;

			if (password) {

			}
			if (!host) {
				logger.error('host must be set');
				valid = false;
			}
			if (!port) {
				logger.error('port must be set');
				valid = false;
			}
			if (!username) {
				logger.error('username must be set');
				valid = false;
			}
			if (!directoryPaths && !filePaths) {
				logger.error('directoryPath or filePaths must be set');
				valid = false;
			}

			if (!_.isNumber(validateDate(lastProcessedDateTime))) {
				logger.error('lastProcessedDateTime must be set in unix format or null');
				valid = false;
			}

			return valid;
		} else {
			return false;
		}
	}

	return {
		validatePayload,
		validateSource
	};
};
