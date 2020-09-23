// SPDX-FileCopyrightText: 2018 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

'use strict'

const fs = require('fs-extra')
const processenv = require('processenv')
var bunyan = require('bunyan')

// Instantiate logger
const LOG_LEVEL = String(processenv('LOG_LEVEL') || 'info')
var log = bunyan.createLogger({
  name: 'handler_list_of_POIs',
  serializers: bunyan.stdSerializers,
  level: LOG_LEVEL
})
log.info('loaded module for handling requests for list of POIs')

function getPois (pathToPoisJsonFile) {
  return async function (req, res, next) {
    try {
      const fileContent = await fs.readJson(pathToPoisJsonFile, {
        encoding: 'utf8'
      })
      res.status(200).send(fileContent)
      res.end()
      req.log.info(
        { res: res },
        `successfully handled ${req.method}-request on ${req.path}`
      )
      return
    } catch (error) {
      res.status(404).send(error)
      res.end()
      req.log.warn(
        { err: error, res: res },
        `error while handling ${req.method}-request on ${req.path}`
      )
    }
  }
}

exports.getPois = getPois
