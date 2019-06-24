const payloadForTest = require('../payload.sample.json');
const configForTest = require('../conf/dev/config.json');

var validator = require('../validator.js')(payloadForTest, configForTest);
let payloadTest = {};

describe('function validatePayload', () => {
	var validator = require('../validator.js')({}, {});
	it('expected object but received number', function() {
		expect(function() {
			var payloadTest = 3;
			validator.validatePayload(payloadTest);
		}).toThrow(new Error('a payload is required'));
	});
	it('expected object but received null', function() {
		expect(function() {
			var payloadTest = null;
			validator.validatePayload(payloadTest);
		}).toThrow(new Error('a payload is required'));
	});
	it('expected object and received empty object', function() {
		expect(function() {
			var payloadTest = {};
			validator.validatePayload(payloadTest);
		}).not.toThrow(new Error('a payload is required'));
	});
	it('expected object and got it', function() {
		expect(function() {
			var payloadTest = {
				'jobId': 'aa5165d6-3a0d-4b3f-a4a4-16fad32eac04'
			};
			validator.validatePayload(payloadTest);
		}).not.toThrow(new Error('a payload is required'));
	});

	it('expected object with field ingestionId but received empty object', function() {
		expect(function() {
			var payloadTest = {
				'source': {
					'someField': 'dropbox'
				}
			};
			validator.validatePayload(payloadTest);
		}).toThrow(new Error('ingestionId is required in payload'));
	});
	it('expected object with field ingestionId but received object without this field', function() {
		expect(function() {
			var payloadTest = {
				'jobId': 'aa5165d6-3a0d-4b3f-a4a4-16fad32eac04',
				'taskId': 'aa5165d6-3a0d-4b3f-a4a4-16fad32eac04-7e07f2cb-c0b4-46e3-a1e2-0478403809c7'
			};
			validator.validatePayload(payloadTest);
		}).toThrow(new Error('a source.ingestionID is required in payload'));
	});

	it('expected object with field ingestionId and received object with this field (but not real data from json)', function() {
		expect(function() {
			var payloadTest = {
				'jobId': 'aa5165d6-3a0d-4b3f-a4a4-16fad32eac04',
				'taskId': 'aa5165d6-3a0d-4b3f-a4a4-16fad32eac04-7e07f2cb-c0b4-46e3-a1e2-0478403809c7',
				'ingestionId': 'my own field'
			};
			validator.validatePayload(payloadTest);
		}).toThrow(new Error('a source.ingestionID is required in payload'));
	});
	it('expected object with field ingestionId and got it', function() {
		expect(function() {
			var payloadTest = {
				'jobId': 'aa5165d6-3a0d-4b3f-a4a4-16fad32eac04',
				'taskId': 'aa5165d6-3a0d-4b3f-a4a4-16fad32eac04-7e07f2cb-c0b4-46e3-a1e2-0478403809c7',
				'source': {
					'ingestionId': '37jjutd4'
				}
			};
			validator.validatePayload(payloadTest);
		}).not.toThrow(new Error('ingestionId is required in payload'));
	});

	it('expected object with field jobId but received empty object', function() {
		expect(function() {
			var payloadTest = {
				'NOTjobId': 'aa5165d6-3a0d-4b3f-a4a4-16fad32eac04',
				'taskId': 'aa5165d6-3a0d-4b3f-a4a4-16fad32eac04-7e07f2cb-c0b4-46e3-a1e2-0478403809c7',
				'source': {
					'ingestionId': '37jjutd4'
				}
			};
			validator.validatePayload(payloadTest);
		}).toThrow(new Error('jobId is required in payload'));
	});
	it('expected object with field jobId but received object without this field', function() {
		expect(function() {
			var payloadTest = {
				'NOTjobId': 'aa5165d6-3a0d-4b3f-a4a4-16fad32eac04',
				'taskId': 'aa5165d6-3a0d-4b3f-a4a4-16fad32eac04-7e07f2cb-c0b4-46e3-a1e2-0478403809c7',
				'source': {
					'ingestionId': '37jjutd4'
				}
			};
			validator.validatePayload(payloadTest);
		}).toThrow(new Error('jobId is required in payload'));
	});
	it('expected object with field jobId and got it', function() {
		expect(function() {
			var payloadTest = {
				'jobId': 'aa5165d6-3a0d-4b3f-a4a4-16fad32eac04',
				'taskId': 'aa5165d6-3a0d-4b3f-a4a4-16fad32eac04-7e07f2cb-c0b4-46e3-a1e2-0478403809c7',
				'source': {
					'ingestionId': '37jjutd4'
				}
			};
			validator.validatePayload(payloadTest);
		}).not.toThrow(new Error('jobId is required in payload'));
	});

	it('expected object with field taskId but received empty object', function() {
		expect(function() {
			var payloadTest = {
				'jobId': 'aa5165d6-3a0d-4b3f-a4a4-16fad32eac04',
				'NOTtaskId': 'aa5165d6-3a0d-4b3f-a4a4-16fad32eac04-7e07f2cb-c0b4-46e3-a1e2-0478403809c7',
				'source': {
					'ingestionId': '37jjutd4'
				}
			};
			validator.validatePayload(payloadTest);
		}).toThrow(new Error('taskId is required in payload'));
	});
	it('expected object with field taskId but received object without this field', function() {
		expect(function() {
			var payloadTest = {
				'jobId': 'aa5165d6-3a0d-4b3f-a4a4-16fad32eac04',
				'NOTtaskId': 'aa5165d6-3a0d-4b3f-a4a4-16fad32eac04-7e07f2cb-c0b4-46e3-a1e2-0478403809c7',
				'source': {
					'ingestionId': '37jjutd4'
				}
			};
			validator.validatePayload(payloadTest);
		}).toThrow(new Error('taskId is required in payload'));
	});
	it('expected object with field taskId and got it', function() {
		expect(function() {
			var payloadTest = {
				'jobId': 'aa5165d6-3a0d-4b3f-a4a4-16fad32eac04',
				'taskId': 'aa5165d6-3a0d-4b3f-a4a4-16fad32eac04-7e07f2cb-c0b4-46e3-a1e2-0478403809c7',
				'source': {
					'ingestionId': '37jjutd4'
				}
			};
			validator.validatePayload(payloadTest);
		}).not.toThrow(new Error('taskId is required in payload'));
	});
});

describe('function validateConfig', () => {
	// tests
	it('expected object but received number', function() {
		expect(function() {
			var configTest = 3;
			validator.validateConfig(configTest);
		}).toThrow(new Error('a config is required'));
	});
	it('expected object but received null', function() {
		expect(function() {
			var configTest = null;
			validator.validateConfig(configTest);
		}).toThrow(new Error('a config is required'));
	});
	it('expected object and received empty object', function() {
		expect(function() {
			var configTest = {};
			validator.validateConfig(configTest);
		}).not.toThrow(new Error('a config is required'));
	});
	it('expected object and got it', function() {
		expect(function() {
			var configTest = {
				'veritone-api': {
					'token': 's3-scanner:11cd6b4c58e44c829918ae544435d00c12618f59bea141c595bafff95d4f9613',
					'baseUri': 'https://api.aws-dev-edge.veritone.com',
					'maxRetry': 3,
					'retryIntervalMs': 5000
				},
				'signedUrlExpireSeconds': 43200
			};
			validator.validateConfig(configTest);
		}).not.toThrow(new Error('a config is required'));
	});

	it('expected object[object] but received empty object', function() {
		expect(function() {
			var configTest = {};
			validator.validateConfig(configTest);
		}).toThrow(new Error('a config.veritone-api is required'));
	});
	it('expected object with field veritone-api as object but got object w/o this field', function() {
		expect(function() {
			var configTest = {
				'notVeritone-api': {
					'token': 's3-scanner:11cd6b4c58e44c829918ae544435d00c12618f59bea141c595bafff95d4f9613',
					'baseUri': 'https://api.aws-dev-edge.veritone.com',
					'maxRetry': 3,
					'retryIntervalMs': 5000
				},
				'signedUrlExpireSeconds': 43200
			};
			validator.validateConfig(configTest);
		}).toThrow(new Error('a config.veritone-api is required'));
	});
	it('expected object with field veritone-api as object but got object with this field bun not as object', function() {
		expect(function() {
			var configTest = {
				'veritone-api': 43200
			};
			validator.validateConfig(configTest);
		}).toThrow(new Error('a config.veritone-api is required'));
	});
	it('expected object with field veritone-api as object and got it', function() {
		expect(function() {
			var configTest = {
				'veritone-api': {
					'token': 's3-scanner:11cd6b4c58e44c829918ae544435d00c12618f59bea141c595bafff95d4f9613',
					'baseUri': 'https://api.aws-dev-edge.veritone.com',
					'maxRetry': 3,
					'retryIntervalMs': 5000
				},
				'signedUrlExpireSeconds': 43200
			};
			validator.validateConfig(configTest);
		}).not.toThrow(new Error('a config[\'veritone-api\'] is required'));
	});

	it('expected objectsignedUrlExpireSeconds as a number but objectsignedUrlExpireSeconds as null', function() {
		expect(function() {
			var configTest = {
				'veritone-api': {
					'token': 's3-scanner:11cd6b4c58e44c829918ae544435d00c12618f59bea141c595bafff95d4f9613',
					'baseUri': 'https://api.aws-dev-edge.veritone.com',
					'maxRetry': 3,
					'retryIntervalMs': 5000
				},
				'signedUrlExpireSeconds': null
			};
			validator.validateConfig(configTest);
		}).toThrow(new Error('a config.signedUrlExpireSeconds of type Number is required'));
	});
	it('expected objectsignedUrlExpireSeconds as a number but objectsignedUrlExpireSeconds as object', function() {
		expect(function() {
			var configTest = {
				'veritone-api': {
					'token': 's3-scanner:11cd6b4c58e44c829918ae544435d00c12618f59bea141c595bafff95d4f9613',
					'baseUri': 'https://api.aws-dev-edge.veritone.com',
					'maxRetry': 3,
					'retryIntervalMs': 5000
				},
				'signedUrlExpireSeconds': {
					'someField': 'someValue'
				}
			};
			validator.validateConfig(configTest);
		}).toThrow(new Error('a config.signedUrlExpireSeconds of type Number is required'));
	});
	it('expected objectsignedUrlExpireSeconds as a number and got it', function() {
		expect(function() {
			var configTest = {
				'veritone-api': {
					'token': 's3-scanner:11cd6b4c58e44c829918ae544435d00c12618f59bea141c595bafff95d4f9613',
					'baseUri': 'https://api.aws-dev-edge.veritone.com',
					'maxRetry': 3,
					'retryIntervalMs': 5000
				},
				'signedUrlExpireSeconds': 44
			};
			validator.validateConfig(configTest);
		}).not.toThrow(new Error('a config.signedUrlExpireSeconds of type Number is required'));
	});
});

describe('function validatePayloadMetadata', () => {
	it('expected payload.metadata as object but received null', function() {
		expect(function() {
			payloadTest = {};
			validator.validatePayloadMetadata(payloadTest);
		}).toThrow(new Error('a payload.metadata is required'));
	});
	it('expected payload.metadata as object but received string', function() {
		expect(function() {
			payloadTest = {
				'metadata': 'someValue'
			};
			validator.validatePayloadMetadata(payloadTest);
		}).toThrow(new Error('a payload.metadata is required'));
	});
	it('expected payload.metadata as object and received it', function() {
		expect(function() {
			payloadTest = {
				'metadata': {
					'someField': 'someValue'
				}
			};
			validator.validatePayloadMetadata(payloadTest);
		}).not.toThrow(new Error('a payload.metadata is required'));
	});
	it('expected payload.metadata.date as date but received null', function() {
		expect(function() {
			payloadTest = {
				'metadata': {
					'someField': 'someValue'
				}
			};
			validator.validatePayloadMetadata(payloadTest);
		}).toThrow(new Error('a payload.metadata.date is required'));
	});
	it('expected payload.metadata.date as object but received string', function() {
		expect(function() {
			payloadTest = {
				'metadata': {
					'date': 'NOTdateValue'
				}
			};
			validator.validatePayloadMetadata(payloadTest);
		}).toThrow(new Error('a payload.metadata.date is required'));
	});
	it('expected payload.metadata.date as date and received it', function() {
		expect(function() {
			payloadTest = {
				'metadata': {
					'date': '2017-12-21T00:29:07.885Z'
				}
			};
			validator.validatePayloadMetadata(payloadTest);
		}).not.toThrow(new Error('a payload.metadata.date is required'));
	});
});
