// SPDX-FileCopyrightText: 2018 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

'use strict'

const express = require('express')
const _ = require('lodash')
const processenv = require('processenv')
const hfc = require('./handlers/forecast')
const hda = require('./handlers/data_access')
const hm = require('./handlers/measurements')
const hpoi = require('./handlers/poi')
const poifce = require('./lib/poi_forecast_engine')
const path = require('path')
const swaggerTools = require('swagger-tools')
const fs = require('fs-extra')
const $RefParser = require('json-schema-ref-parser')
const cors = require('cors')
const sc = require('./lib/weather_stations')
var jwt = require('express-jwt')
var bunyan = require('bunyan')
const addRequestId = require('express-request-id')()

const LISTEN_PORT = processenv('LISTEN_PORT')
const DATA_ROOT_PATH = processenv('DATA_ROOT_PATH')
const NEWEST_FORECAST_ROOT_PATH = processenv('NEWEST_FORECAST_ROOT_PATH')
const POIS_JSON_FILE_PATH = processenv('POIS_JSON_FILE_PATH')
const JWT_PUBLIC_KEY_FILE_PATH = processenv('JWT_PUBLIC_KEY_FILE_PATH')
const AUTHORIZATION_LIMIT_INTERVAL = processenv('AUTHORIZATION_LIMIT_INTERVAL') || 10
const AUTHORIZATION_LIMIT_VALUE = processenv('AUTHORIZATION_LIMIT_VALUE') || 1000
const ANONYMOUS_LIMIT_INTERVAL = processenv('ANONYMOUS_LIMIT_INTERVAL') || 10
const ANONYMOUS_LIMIT_VALUE = processenv('ANONYMOUS_LIMIT_VALUE') || 100
const UI_STATIC_FILES_PATH = String(processenv('UI_STATIC_FILES_PATH') || '')
const UI_URL_PATH = String(processenv('UI_URL_PATH') || '')
const LOG_LEVEL = String(processenv('LOG_LEVEL') || 'info')

const EXIT_CODE_LISTEN_PORT_NOT_A_NUMBER = 1
const EXIT_CODE_DATA_ROOT_PATH_NOT_A_STRING = 2
const EXIT_CODE_NEWEST_FORECAST_ROOT_PATH_NOT_A_STRING = 3
const EXIT_CODE_POIS_JSON_FILE_PATH_NOT_A_STRING = 4
const EXIT_CODE_JWT_PUBLIC_KEY_FILE_PATH_NOT_A_STRING = 5
const EXIT_CODE_AUTHORIZATION_LIMIT_INTERVAL_NOT_A_POSITIVE_NUMBER = 6
const EXIT_CODE_AUTHORIZATION_LIMIT_VALUE_NOT_A_POSITIVE_NUMBER = 7
const EXIT_CODE_ANONYMOUS_LIMIT_INTERVAL_NOT_A_POSITIVE_NUMBER = 8
const EXIT_CODE_ANONYMOUS_LIMIT_VALUE_NOT_A_POSITIVE_NUMBER = 9
const EXIT_CODE_SERVER_ERROR = 10
const EXIT_CODE_PUBLIC_KEY_LOAD_ERROR = 11

const VOIS_JSON_FILE_PATH = './config/vois.json'
const VOIS_DATA_ACCESS_CONFIGS_PATH = './config/vois_data_access.json'

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

function checkIfConfigIsValid () {
  if (!(_.isNumber(LISTEN_PORT) && LISTEN_PORT > 0 && LISTEN_PORT < 65535)) {
    log.fatal('LISTEN_PORT is ' + LISTEN_PORT + ' but must be an integer number larger than 0 and smaller than 65535')
    process.exit(EXIT_CODE_LISTEN_PORT_NOT_A_NUMBER)
  } else {
    log.debug('LISTEN_PORT is set to ' + LISTEN_PORT)
  }

  if (!_.isString(DATA_ROOT_PATH)) {
    log.fatal('DATA_ROOT_PATH must be a string: ' + DATA_ROOT_PATH)
    process.exit(EXIT_CODE_DATA_ROOT_PATH_NOT_A_STRING)
  } else {
    log.debug('DATA_ROOT_PATH is set to ' + DATA_ROOT_PATH)
  }

  if (!_.isString(NEWEST_FORECAST_ROOT_PATH)) {
    log.fatal('NEWEST_FORECAST_ROOT_PATH must be a string: ' + NEWEST_FORECAST_ROOT_PATH)
    process.exit(EXIT_CODE_NEWEST_FORECAST_ROOT_PATH_NOT_A_STRING)
  } else {
    log.debug('NEWEST_FORECAST_ROOT_PATH is set to ' + NEWEST_FORECAST_ROOT_PATH)
  }

  if (!_.isString(POIS_JSON_FILE_PATH)) {
    log.fatal('POIS_JSON_FILE_PATH must be a string: ' + POIS_JSON_FILE_PATH)
    process.exit(EXIT_CODE_POIS_JSON_FILE_PATH_NOT_A_STRING)
  } else {
    log.debug('POIS_JSON_FILE_PATH is set to ' + POIS_JSON_FILE_PATH)
  }

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

checkIfConfigIsValid()

// Instantiate express-app
const app = express()
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
    req.log({ res: res }, `user ${sub} is hitting the rate limit`)
    return
  }

  authorizedRequestStatisticsMap[sub].push(now)
  next()
})

app.use(cors())
app.use(express.json())
app.use(express.urlencoded())
app.use(express.static('./docs'))
app.use('/oas', express.static('./docs/openapi_oas2.json'))

// Expose UI iff UI_URL_PATH is not empty
if (UI_URL_PATH !== '') {
  if (UI_STATIC_FILES_PATH !== '') {
    // expose locally defined UI
    app.use(UI_URL_PATH, express.static(UI_STATIC_FILES_PATH))

    // register UI in OAS that is provided as a resource
  } else {
    // fall back to default-UI
    log.error('default-UI not implemented')
  }

  // redirect GET-request on origin to UI iff UI is exposed
  app.get('', async (req, res) => {
    res.redirect(UI_URL_PATH)
  })
}

app.on('error', (error) => {
  log.fatal(error)
  process.exit(EXIT_CODE_SERVER_ERROR)
})

app.listen(LISTEN_PORT, () => {
  log.info('now listening on port ' + LISTEN_PORT)
  init()
})

async function init () {
  const stationCatalog = await sc.getAllStations('./config/')
  const voisDataAccessConfigs = await fs.readJson(VOIS_DATA_ACCESS_CONFIGS_PATH, {
    encoding: 'utf8'
  })
  const endPointMapping = [
    {
      method: 'get',
      openapiPath: '/weather/cosmo/d2/{referenceTimestamp}/{voi}',
      path: '/weather/cosmo/d2/:referenceTimestamp/:voi',
      handler: hda.getWeatherCosmoD2(DATA_ROOT_PATH, voisDataAccessConfigs)
    },
    {
      method: 'get',
      openapiPath: '/weather/local_forecasts/poi/{referenceTimestamp}/{sid}/{voi}',
      path: '/weather/local_forecasts/poi/:referenceTimestamp/:sid/:voi',
      handler: hda.getWeatherMosmix(DATA_ROOT_PATH, voisDataAccessConfigs)
    },
    {
      method: 'get',
      openapiPath: '/weather/weather_reports/poi/{sid}/{voi}',
      path: '/weather/weather_reports/poi/:sid/:voi',
      handler: hda.getWeatherReport(DATA_ROOT_PATH, voisDataAccessConfigs)
    },
    {
      method: 'get',
      openapiPath: '/poi_forecasts/cosmo_de_27/{poi_id}',
      path: '/poi_forecasts/cosmo_de_27/:poi_id',
      handler: hfc.getPoiForecastsCosmeDe27Poi(NEWEST_FORECAST_ROOT_PATH, stationCatalog)
    },
    {
      method: 'get',
      openapiPath: '/poi_forecasts/cosmo_de_45/{poi_id}',
      path: '/poi_forecasts/cosmo_de_45/:poi_id',
      handler: hfc.getPoiForecastsCosmeDe45Poi(NEWEST_FORECAST_ROOT_PATH, stationCatalog)
    },
    {
      method: 'get',
      openapiPath: '/poi_measurements/{poi_id}',
      path: '/poi_measurements/:poi_id',
      handler: hm.getNewestMeasurementDataPoi(path.join(DATA_ROOT_PATH, 'weather', 'weather_reports', 'poi'), POIS_JSON_FILE_PATH, VOIS_JSON_FILE_PATH, stationCatalog)
    }, {
      method: 'get',
      openapiPath: '/pois',
      path: '/pois',
      handler: hpoi.getPois(POIS_JSON_FILE_PATH)
    }
  ]

  var api = await fs.readJson('./docs/openapi_oas2.json')
  api = await $RefParser.dereference(api)

  swaggerTools.initializeMiddleware(api, function (middleware) {
    // Interpret Swagger resources and attach metadata to request - must be first in swagger-tools middleware chain
    app.use(middleware.swaggerMetadata())

    // Validate Swagger requests
    app.use(middleware.swaggerValidator())

    const paths = _.get(api, ['paths'])
    _.forEach(paths, (pathDefinition, path) => {
      _.forEach(pathDefinition, (spec, method) => {
        const mapping = _.find(endPointMapping, (mapping) => {
          return _.lowerCase(mapping.method) === _.lowerCase(method) && _.lowerCase(mapping.openapiPath) === _.lowerCase(path)
        })

        if (_.isNil(mapping)) {
          log.error('no fitting mapping found for method ' + _.toUpper(method) + ' and resource ' + path)
          return
        }

        log.info('created mapping for method %s on resource %s', _.toUpper(method), mapping.path)
        app[method](mapping.path, mapping.handler)
      })
    })
  })

  log.info('configuration of service instance completed successfully')
}

// poifce.run(60, path.join(DATA_ROOT_PATH, 'weather', 'cosmo', 'de', 'grib'), NEWEST_FORECAST_ROOT_PATH)
poifce.run(60, path.join(DATA_ROOT_PATH, 'weather', 'cosmo-d2', 'grib'), NEWEST_FORECAST_ROOT_PATH)
