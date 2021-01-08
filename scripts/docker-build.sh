#!/bin/bash

# Build #######################################################################"
echo -e "\nBuild Generic Docker Images & Run Code Analysis/Unit Tests #########"
cd $BUILD_DIR_GENERIC

# Build generic image
docker build --pull \
    --tag "$REGISTRY/$SERVICE_NAME:$TAG" \
    --build-arg VCS_REF=$(git rev-parse HEAD) .
echo -e "\n"
