const payload = require('./payload-ingest');

// set environment vars here instead of set it in configs
process.env.KAFKA_BROKERS = '127.0.0.1:9092';
process.env.KAFKA_CHUNK_TOPIC = 'chunk_all';
process.env.VERITONE_API_BASE_URL = 'https://api.aws-dev.veritone.com';
process.env.ENGINE_ID = 's3-scanner';
process.env.ENGINE_INSTANCE_ID = '1';
process.env.KAFKA_INPUT_TOPIC = 'chunk_in_084f457c-4363-4aca-a455-66c07a9670d9';
process.env.KAFKA_CONSUMER_GROUP = 'group';
process.env.CHUNK_CACHE_BUCKET = 'chunk-cache';
process.env.CHUNK_CACHE_AWS_REGION = 'us-east-1';
process.env.END_IF_IDLE_SECS = '3600';
process.env.PAYLOAD_JSON = JSON.stringify(payload);
process.env.VERITONE_API_TOKEN = payload.token;
process.env.KAFKA_HEARTBEAT_TOPIC = 'engine_status';
process.env.KAFKA_INGESTION_TOPIC = 'ingestion_queue';
process.env.STREAM_OUTPUT_TOPIC = 'stream_b5e0466d-9afa-4d7d-98a5-625ce5549670-e6b475bb-7be6-4780-be52-3e7f19239f91:0';

require('./app');
