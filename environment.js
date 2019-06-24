module.exports = () => {
	const kafkaBrokers = process.env.KAFKA_BROKERS;
	const kafkaChunkTopic = process.env.KAFKA_CHUNK_TOPIC;
	const veritoneApiBaseUrl = process.env.VERITONE_API_BASE_URL;
	const clusterId = process.env.CLUSTER_ID;
	const redisAddr = process.env.REDIS_ADDR;
	const veritoneApiToken = process.env.VERITONE_API_TOKEN;
	const configPath = process.env.CONFIG_PATH;
	const engineId = process.env.ENGINE_ID;
	const engineInstanceId = process.env.ENGINE_INSTANCE_ID;
	const chunkCacheBucket = process.env.CHUNK_CACHE_BUCKET;
	const chunkCacheAwsRegion = process.env.CHUNK_CACHE_AWS_REGION;
	const payload = JSON.parse(process.env.PAYLOAD_JSON);
	const endIfIdleSec = process.env.END_IF_IDLE_SECS;
	const ingestionQueueTopic = process.env.KAFKA_INGESTION_TOPIC;

	let streamKafkaOutputTopic = '',
		streamKafkaOutputPartition = '',
		streamKafkaPrefix = '';

	if (process.env.STREAM_OUTPUT_TOPIC) {
		const kafkaOutArray = process.env.STREAM_OUTPUT_TOPIC.split(':');
		if (kafkaOutArray.length > 0) {
			streamKafkaOutputTopic = kafkaOutArray[0];
		}
		if (kafkaOutArray.length > 1) {
			streamKafkaOutputPartition = kafkaOutArray[1];
		}
		if (kafkaOutArray.length > 2) {
			streamKafkaPrefix = kafkaOutArray[2];
		}
	}
	return {
		kafkaBrokers,
		kafkaChunkTopic,
		veritoneApiBaseUrl,
		service: {
			clusterId,
			redisAddr,
			veritoneApiToken,
			configPath
		},
		engine: {
			engineId,
			engineInstanceId,
			streamKafkaOutputTopic,
			streamKafkaOutputPartition,
			streamKafkaPrefix,
			chunkCacheBucket,
			chunkCacheAwsRegion,
			payload,
			endIfIdleSec,
			heartbeatTopic: 'engine_status',
			heartbeatPushingInterval: 1000,
			chunkSize: 10240,
			processSpeed: 20,
			maxConcurrentJob: 10,
			maxRetry: 5,
			retryDelay: 1000,
			ingestionQueue: ingestionQueueTopic // 'ingestion_queue'
		}
	};
};
