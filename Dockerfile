# SPDX-FileCopyrightText: 2018 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
# SPDX-License-Identifier: MIT

# Start at current LTS release, but specify version explicitly
FROM node:14-alpine3.11

# Provide metadata according to namespace suggested by http://label-schema.org/
LABEL org.label-schema.schema-version="1.0.0-rc.1"
LABEL org.label-schema.name="dwd_data_access"
LABEL org.label-schema.description="Access to forecast/measurement data copied from DWD"
LABEL org.label-schema.vendor="UdS AES"
LABEL org.label-schema.vcs-url="https://github.com/UdSAES/dwd_data_access"

# Install dependencies on the base image level
RUN apk add --no-cache make gcc g++ python lz4

# Prepare directories
RUN mkdir /mnt/dwd_raw_data && chown node:node /mnt/dwd_raw_data
RUN mkdir /mnt/forecast_cache && chown node:node /mnt/forecast_cache
RUN mkdir /mnt/configuration && chown node:node /mnt/configuration
RUN mkdir /mnt/keys && chown node:node /mnt/keys

# Configure application according to directory structure created
ENV LISTEN_PORT=3000
ENV DATA_ROOT_PATH=/mnt/dwd_raw_data
ENV NEWEST_FORECAST_ROOT_PATH=/mnt/forecast_cache
ENV POIS_JSON_FILE_PATH=/mnt/configuration/pois.json
ENV JWT_PUBLIC_KEY_FILE_PATH=/mnt/keys/public_key.pem

ENV UI_URL_PATH=/ui
ENV UI_STATIC_FILES_PATH=/home/node/app/handlers/redoc.html

EXPOSE $LISTEN_PORT

# Prepare for running actual code
USER node
ENV NODE_ENV production

RUN mkdir /home/node/app
WORKDIR /home/node/app

# Install app-level dependencies
COPY --chown=node:node ./package.json /home/node/app
RUN npm install --production

# Install application code by copy-pasting the source to the image
# (subject to .dockerignore)
COPY --chown=node:node ./ /home/node/app/
COPY --chown=node:node ./docs/openapi_oas3_flat.yaml /home/node/app/docs/openapi_oas3_flat.yaml

# Store reference to commit in version control system in image
ARG VCS_REF
LABEL org.label-schema.vcs-ref=$VCS_REF

# Actually run this upon normal container start
ENTRYPOINT node index.js
