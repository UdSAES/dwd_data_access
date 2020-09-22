// SPDX-FileCopyrightText: 2020 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

'use strict'

const bunyan = require('bunyan')
const processenv = require('processenv')

const LOG_LEVEL = String(processenv('LOG_LEVEL') || 'info')

// Create logger that can be reused accross modules using `require('./lib/logger.js')`
const logger = bunyan.createLogger({
  name: 'dwd_data_access', // TODO make configurable?
  stream: process.stdout,
  level: LOG_LEVEL,
  serializers: {
    err: bunyan.stdSerializers.err,
    req: bunyan.stdSerializers.req,
    res: function (res) {
      if (!res || !res.statusCode) {
        return res
      }
      return {
        statusCode: res.statusCode,
        headers: res._headers
      }
    }
  }
})

module.exports = logger // https://stackoverflow.com/a/15356715
