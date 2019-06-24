FROM mhart/alpine-node:8

ARG DEFAULT_PAYLOAD_FILE=payload-scan.json
ARG VERITONE_TOKEN_ARG
ARG MANIFEST_FILE=./manifest_sftp.json
# Need to be able to switch this depending on where we deploy
ENV ENV_APP_HOME /app
ENV NODE_ENV production

RUN mkdir -p $ENV_APP_HOME && apk update && apk add -U git curl file libc6-compat

ADD . $ENV_APP_HOME
ENV PATH=/root/.local/bin/:$PATH

ADD ${MANIFEST_FILE} /var/manifest.json
WORKDIR $ENV_APP_HOME/

RUN cd $ENV_APP_HOME && npm install

ENTRYPOINT node app.js
