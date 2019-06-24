# FTP/SFTP ingestor

Real time ingestion adapter for FTP/SFTP. Ingestion adapter support new RT framework workflow to ingest files.

# Application modules

1. `app-wrapper.js` - a way to run application locally without setting a tons of environment variables
2. `app.js` - main application
3. `environment.js` - easy way to access to environment variables and constants
4. `graphql-requests.js` - graphQL requests wrapper
5. `heart.js` - sending heartbeats to appropriate topic. Provide functions to update app state and create sub jobs
6. `logger.js` - just a wrapper for console.log
7. `ftp-ingestor.js` - scan and ingest methods implementation
8. `stream-pusher.js` - reusable module for streaming readable stream to appropriate topics
9. `validator.js` - just check necessary fields are exists 

# Background heart beats
Every engine must sending state information to `engine_heartbeat`.
This adapter implementing this using heart module.

# Modes workflow
1. Scan mode. Scan remote folder for new files  
    a. Retrieve source configuration from veritone platform   
    b. Create FTP/SFTP client for scan the folder   
    c. Get all files stored in the folder   
    d. Filter files already ingested (by lastProcessedDateTime watermark)     
    e. Put full path to the file ID to "fileId" field  
    f. Send message to `ingestion_queue` to create an ingestion job for each file
    g. Update lastProcessedDateTime watermark (save to source configuration) 
2. Ingest mode. Download/streaming new files    
    a. Retrieve source configuration from veritone platform   
    b. Create FTP/SFTP client for ingest the file   
    c. Download the file using "fileId" field from the payload   
    d. Streaming file to `streamOutKafkaTopic` unsing stream-pusher module
    e. Remove the file downloaded  

# Payload necessary fields

1. `sourceId`
2. `token`
3. `veritoneApiBaseUrl`
4. `streamOutKafkaTopic` - for ingest job
5. `fileId` - for ingest job
6. `tdoId` - for ingest job