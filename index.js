// SPDX-FileCopyrightText: 2018 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

'use strict'

const express = require('express')
const _ = require('lodash')
const processenv = require('processenv')
// const hfc = require('./handlers/forecast')
const hda = require('./handlers/data_access')
// const hm = require('./handlers/measurements')
// const hpoi = require('./handlers/poi')
// const poifce = require('./lib/poi_forecast_engine')
// const path = require('path')
const { OpenAPIBackend } = require('openapi-backend')
const fs = require('fs-extra')
// const $RefParser = require('json-schema-ref-parser')
const cors = require('cors')
const sc = require('./lib/weather_stations')
var jwt = require('express-jwt')
var bunyan = require('bunyan')
const addRequestId = require('express-request-id')()

const LISTEN_PORT = processenv('LISTEN_PORT')
// const DATA_ROOT_PATH = processenv('DATA_ROOT_PATH')
// const NEWEST_FORECAST_ROOT_PATH = processenv('NEWEST_FORECAST_ROOT_PATH')
// const POIS_JSON_FILE_PATH = processenv('POIS_JSON_FILE_PATH')
const JWT_PUBLIC_KEY_FILE_PATH = processenv('JWT_PUBLIC_KEY_FILE_PATH')
const AUTHORIZATION_LIMIT_INTERVAL = processenv('AUTHORIZATION_LIMIT_INTERVAL') || 10
const AUTHORIZATION_LIMIT_VALUE = processenv('AUTHORIZATION_LIMIT_VALUE') || 1000
const ANONYMOUS_LIMIT_INTERVAL = processenv('ANONYMOUS_LIMIT_INTERVAL') || 10
const ANONYMOUS_LIMIT_VALUE = processenv('ANONYMOUS_LIMIT_VALUE') || 100
const UI_STATIC_FILES_PATH = String(processenv('UI_STATIC_FILES_PATH') || '')
const UI_URL_PATH = String(processenv('UI_URL_PATH') || '')
const LOG_LEVEL = String(processenv('LOG_LEVEL') || 'info')

const EXIT_CODE_LISTEN_PORT_NOT_A_NUMBER = 1
// const EXIT_CODE_DATA_ROOT_PATH_NOT_A_STRING = 2
// const EXIT_CODE_NEWEST_FORECAST_ROOT_PATH_NOT_A_STRING = 3
// const EXIT_CODE_POIS_JSON_FILE_PATH_NOT_A_STRING = 4
const EXIT_CODE_JWT_PUBLIC_KEY_FILE_PATH_NOT_A_STRING = 5
const EXIT_CODE_AUTHORIZATION_LIMIT_INTERVAL_NOT_A_POSITIVE_NUMBER = 6
const EXIT_CODE_AUTHORIZATION_LIMIT_VALUE_NOT_A_POSITIVE_NUMBER = 7
const EXIT_CODE_ANONYMOUS_LIMIT_INTERVAL_NOT_A_POSITIVE_NUMBER = 8
const EXIT_CODE_ANONYMOUS_LIMIT_VALUE_NOT_A_POSITIVE_NUMBER = 9
const EXIT_CODE_SERVER_ERROR = 10
const EXIT_CODE_PUBLIC_KEY_LOAD_ERROR = 11

// const VOIS_JSON_FILE_PATH = './config/vois.json'
// const VOIS_DATA_ACCESS_CONFIGS_PATH = './config/vois_data_access.json'
const API_SPECIFICATION_FILE_PATH = './docs/openapi_oas3.json'

// Instantiate logger
const log = bunyan.createLogger({
  name: 'dwd_data_access', // TODO make configurable?
  stream: process.stdout,
  level: LOG_LEVEL,
  serializers: {
    err: bunyan.stdSerializers.err,
    req: bunyan.stdSerializers.req,
    res: function (res) {
      if (!res || !res.statusCode) { return res }
      return {
        statusCode: res.statusCode,
        headers: res._headers
      }
    }
  }
})
log.info('instantiation of service initiated')

// Exit immediately on uncaught errors or unhandled promise rejections
process.on('unhandledRejection', function (error) {
  log.fatal('unhandled promise rejection', error)
  process.exit(EXIT_CODE_SERVER_ERROR)
})

process.on('uncaughtException', function (error) {
  log.fatal('uncaught exception', error)
  process.exit(EXIT_CODE_SERVER_ERROR)
})

async function checkIfConfigIsValid () {
  if (!(_.isNumber(LISTEN_PORT) && LISTEN_PORT > 0 && LISTEN_PORT < 65535)) {
    log.fatal('LISTEN_PORT is ' + LISTEN_PORT + ' but must be an integer number larger than 0 and smaller than 65535')
    process.exit(EXIT_CODE_LISTEN_PORT_NOT_A_NUMBER)
  } else {
    log.debug('LISTEN_PORT is set to ' + LISTEN_PORT)
  }

  // if (!_.isString(DATA_ROOT_PATH)) {
  //   log.fatal('DATA_ROOT_PATH must be a string: ' + DATA_ROOT_PATH)
  //   process.exit(EXIT_CODE_DATA_ROOT_PATH_NOT_A_STRING)
  // } else {
  //   log.debug('DATA_ROOT_PATH is set to ' + DATA_ROOT_PATH)
  // }

  // if (!_.isString(NEWEST_FORECAST_ROOT_PATH)) {
  //   log.fatal('NEWEST_FORECAST_ROOT_PATH must be a string: ' + NEWEST_FORECAST_ROOT_PATH)
  //   process.exit(EXIT_CODE_NEWEST_FORECAST_ROOT_PATH_NOT_A_STRING)
  // } else {
  //   log.debug('NEWEST_FORECAST_ROOT_PATH is set to ' + NEWEST_FORECAST_ROOT_PATH)
  // }

  // if (!_.isString(POIS_JSON_FILE_PATH)) {
  //   log.fatal('POIS_JSON_FILE_PATH must be a string: ' + POIS_JSON_FILE_PATH)
  //   process.exit(EXIT_CODE_POIS_JSON_FILE_PATH_NOT_A_STRING)
  // } else {
  //   log.debug('POIS_JSON_FILE_PATH is set to ' + POIS_JSON_FILE_PATH)
  // }

  if (!_.isString(JWT_PUBLIC_KEY_FILE_PATH)) {
    log.fatal('JWT_PUBLIC_KEY_FILE_PATH must be a string: ' + JWT_PUBLIC_KEY_FILE_PATH)
    process.exit(EXIT_CODE_JWT_PUBLIC_KEY_FILE_PATH_NOT_A_STRING)
  } else {
    log.debug('JWT_PUBLIC_KEY_FILE_PATH is set to ' + JWT_PUBLIC_KEY_FILE_PATH)
  }

  if (!_.isNumber(AUTHORIZATION_LIMIT_INTERVAL) || AUTHORIZATION_LIMIT_INTERVAL <= 0) {
    log.fatal('AUTHORIZATION_LIMIT_INTERVAL must be a positive number: ' + AUTHORIZATION_LIMIT_INTERVAL)
    process.exit(EXIT_CODE_AUTHORIZATION_LIMIT_INTERVAL_NOT_A_POSITIVE_NUMBER)
  } else {
    log.debug('AUTHORIZATION_LIMIT_INTERVAL is set to ' + AUTHORIZATION_LIMIT_INTERVAL)
  }

  if (!_.isNumber(AUTHORIZATION_LIMIT_VALUE) || AUTHORIZATION_LIMIT_VALUE <= 0) {
    log.fatal('AUTHORIZATION_LIMIT_INTERVAL must be a positive number: ' + AUTHORIZATION_LIMIT_VALUE)
    process.exit(EXIT_CODE_AUTHORIZATION_LIMIT_VALUE_NOT_A_POSITIVE_NUMBER)
  } else {
    log.debug('AUTHORIZATION_LIMIT_VALUE is set to ' + AUTHORIZATION_LIMIT_VALUE)
  }

  if (!_.isNumber(ANONYMOUS_LIMIT_INTERVAL) || ANONYMOUS_LIMIT_INTERVAL <= 0) {
    log.fatal('AUTHORIZATION_LIMIT_INTERVAL must be a positive number: ' + ANONYMOUS_LIMIT_INTERVAL)
    process.exit(EXIT_CODE_ANONYMOUS_LIMIT_INTERVAL_NOT_A_POSITIVE_NUMBER)
  } else {
    log.debug('ANONYMOUS_LIMIT_INTERVAL is set to ' + ANONYMOUS_LIMIT_INTERVAL)
  }

  if (!_.isNumber(ANONYMOUS_LIMIT_VALUE) || ANONYMOUS_LIMIT_VALUE <= 0) {
    log.fatal('ANONYMOUS_LIMIT_VALUE must be a positive number: ' + ANONYMOUS_LIMIT_VALUE)
    process.exit(EXIT_CODE_ANONYMOUS_LIMIT_VALUE_NOT_A_POSITIVE_NUMBER)
  } else {
    log.debug('ANONYMOUS_LIMIT_VALUE is set to ' + ANONYMOUS_LIMIT_VALUE)
  }

  log.info('configuration is formally correct')
}

// Instantiate express-app
const app = express()
app.use(cors())
app.use(addRequestId)
const authorizedRequestStatisticsMap = {}

// Create child logger including req_id to be used in handlers
app.use(function (req, res, next) {
  req.log = log.child({ req_id: req.id })
  next()
})

var publicKey = null
try {
  publicKey = fs.readFileSync(JWT_PUBLIC_KEY_FILE_PATH)
} catch (error) {
  log.fatal(error, 'PUBLIC KEY could not be loaded')
  process.exit(EXIT_CODE_PUBLIC_KEY_LOAD_ERROR)
}

// Verify token
app.use(jwt({ secret: publicKey, credentialsRequired: false }))

// Continue if token is invalid
app.use((error, req, res, next) => {
  req.log.warn(error, 'caught some error')
  next()
})

// Limit access based on subject-claim of JWT -- if invalid or no token is
// provided, then the request is treated with user 'ANONYMOUS'
app.use((req, res, next) => {
  var sub = 'ANONYMOUS'
  if (req.user != null && req.user.sub != null) {
    sub = req.user.sub
  }
  req.log.info({ req: req }, `received ${req.method}-request on ${req.originalUrl} from user ${sub}`)

  var limitInterval = AUTHORIZATION_LIMIT_INTERVAL
  var limitValue = AUTHORIZATION_LIMIT_VALUE

  if (sub === 'ANONYMOUS') {
    limitInterval = ANONYMOUS_LIMIT_INTERVAL
    limitValue = ANONYMOUS_LIMIT_VALUE
  }

  if (authorizedRequestStatisticsMap[sub] == null) {
    authorizedRequestStatisticsMap[sub] = []
  }

  const now = Date.now()
  _.remove(authorizedRequestStatisticsMap[sub], (timestamp) => {
    if (Math.abs(now - timestamp) > limitInterval * 1000) {
      return true
    }
  })

  if (authorizedRequestStatisticsMap[sub].length >= limitValue) {
    res.status(429).send(authorizedRequestStatisticsMap[sub])
    res.end()
    req.log.warn({ res: res }, `user ${sub} is hitting the rate limit`)
    return
  }

  authorizedRequestStatisticsMap[sub].push(now)
  next()
})

app.use(express.json())
app.use(express.urlencoded()) // FIXME body-parser deprecated undefined extended: provide extended option index.js:209:17

app.on('error', (error) => {
  log.fatal(error)
  process.exit(EXIT_CODE_SERVER_ERROR)
})

async function respondWithNotImplemented (c, req, res, next) {
  res.set('Content-Type', 'application/problem+json')
  res.status(501).json({
    title: 'Not Implemented',
    status: 501,
    detail: 'The request was understood, but the underlying implementation is not available yet.'
  })
  log.info(`sent \`501 Not Implemented\` as response to ${req.method}-request on ${req.path}`)
}

async function respondWithNotFound (c, req, res, next) {
  res.set('Content-Type', 'application/problem+json')
  res.status(404).json({
    title: 'Not Found',
    status: 404,
    detail: 'The requested resource was not found on this server'
  })
  log.info('sent `404 Not Found` as response to ' + req.method + '-request on ' + req.path)
}

async function failValidation (c, req, res, next) {
  const firstError = c.validation.errors[0]

  res.set('Content-Type', 'application/problem+json')
  res.status(400).json({
    title: 'Schema Validation Failed',
    status: 400,
    detail: firstError.message,
    path: firstError.dataPath
  })

  log.info('schema validation failed -- request dropped', firstError)
}

async function init () {
  await checkIfConfigIsValid()

  // let api = await fs.readJson(API_SPECIFICATION_FILE_PATH)
  // api = await $RefParser.dereference(api)

  // Read API-specification and initialize backend
  let backend = null
  try {
    backend = new OpenAPIBackend({
      definition: API_SPECIFICATION_FILE_PATH,
      strict: true,
      validate: true,
      ajvOpts: {
        format: false
      }
    })
    log.info('successfully loaded API description ' + API_SPECIFICATION_FILE_PATH)
  } catch (error) {
    log.fatal('error while loading API description ' + API_SPECIFICATION_FILE_PATH)
    process.exit(EXIT_CODE_SERVER_ERROR)
  }

  backend.init()

  // Expose dereferenced OpenAPI-specification as /oas
  app.use('/oas', express.static(API_SPECIFICATION_FILE_PATH))

  // Expose UI iff UI_URL_PATH is not empty
  if (UI_URL_PATH !== '') {
    if (UI_STATIC_FILES_PATH !== '') {
      // Expose locally defined UI
      app.use(UI_URL_PATH, express.static(UI_STATIC_FILES_PATH))

      // Register UI in OAS that is provided as a resource
    } else {
      // Fall back to default-UI
      log.error('default-UI not implemented')
    }

    // Redirect GET-request on origin to UI iff UI is exposed
    app.get('', async (req, res) => {
      res.redirect(UI_URL_PATH)
    })
  }

  // Log all incoming requests
  app.use((req, res, next) => {
    log.info(`received ${req.method}-request on ${req.originalUrl}`)
    next()
  })

  // Pass requests to middleware
  app.use((req, res, next) => backend.handleRequest(req, req, res, next))

  // Load configuration
  const stationCatalog = await sc.getAllStations('./config/')
  // const voisDataAccessConfigs = await fs.readJson(VOIS_DATA_ACCESS_CONFIGS_PATH, {
  //   encoding: 'utf8'
  // })

  // Define routing
  backend.register('getFilteredListOfStations', hda.getWeatherStations(stationCatalog))
  backend.register('getStation', respondWithNotImplemented)
  // backend.register('getStation', hda.getSingleWeatherStation(stationCatalog))

  // Handle unsuccessful requests
  backend.register('validationFail', failValidation)
  backend.register('notImplemented', respondWithNotImplemented)
  backend.register('notFound', respondWithNotFound)

  log.info('configuration of service instance completed successfully')

  app.listen(LISTEN_PORT, () => {
    log.info('now listening on port ' + LISTEN_PORT)
  })
}

// Enter main tasks
if (require.main === module) {
  init()
}
