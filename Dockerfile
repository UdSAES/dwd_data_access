FROM node:9.6.1-alpine

MAINTAINER Florian Wagner

RUN apk add --no-cache make gcc g++ python lz4

RUN mkdir /mnt/dwd_raw_data && chown node:node /mnt/dwd_raw_data
RUN mkdir /mnt/forecast_cache && chown node:node /mnt/forecast_cache
RUN mkdir /mnt/configuration && chown node:node /mnt/configuration
RUN mkdir /mnt/keys && chown node:node /mnt/keys

ENV LISTEN_PORT=3000
ENV DATA_ROOT_PATH=/mnt/dwd_raw_data
ENV NEWEST_FORECAST_ROOT_PATH=/mnt/forecast_cache
ENV POIS_JSON_FILE_PATH=/mnt/configuration/pois.json
ENV JWT_PUBLIC_KEY_FILE_PATH=/mnt/keys/public_key.pem

USER node

RUN mkdir /home/node/app

WORKDIR /home/node/app

COPY --chown=node:node ./package.json /home/node/app

RUN npm install --production

COPY --chown=node:node ./ /home/node/app/

ENTRYPOINT node index.js
