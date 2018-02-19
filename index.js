// dwd_forecast_service
//
// Copyright 2018 The dwd_forecast_service Developers. See the LICENSE file at
// the top-level directory of this distribution and at
// https://github.com/UdSAES/dwd_forecast_service/LICENSE
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
//
// dwd_forecast_service may be freely used and distributed under the MIT license

'use strict'

const express = require('express')
const _ = require('lodash')
const processenv = require('processenv')
const hfc = require('./handlers/forecast')
const hpoi = require('./handlers/poi')
const poifce = require('./lib/poi_forecast_engine')
const path = require('path')
const swaggerTools = require('swagger-tools')
const fs = require('fs-extra')
const {promisify} = require('util')
const $RefParser = require('json-schema-ref-parser')
const cors = require('cors')
const mmsc = require('./lib/mosmix_station_catalog')
var jwt = require('express-jwt')


//const pathToSwaggerUi = require('swagger-ui-dist').absolutePath()

const LISTEN_PORT = processenv('LISTEN_PORT')
const DATA_ROOT_PATH = processenv('DATA_ROOT_PATH')
const NEWEST_FORECAST_ROOT_PATH = processenv('NEWEST_FORECAST_ROOT_PATH')
const POIS_JSON_FILE_PATH = processenv('POIS_JSON_FILE_PATH')
const JWT_PUBLIC_KEY_FILE_PATH = processenv('JWT_PUBLIC_KEY_FILE_PATH')
const AUTHORIZATION_LIMIT_INTERVAL = processenv('AUTHORIZATION_LIMIT_INTERVAL') || 10
const AUTHORIZATION_LIMIT_VALUE = processenv('AUTHORIZATION_LIMIT_VALUE') || 20
const ANONYMOUS_LIMIT_INTERVAL = processenv('ANONYMOUS_LIMIT_INTERVAL') || 10
const ANONYMOUS_LIMIT_VALUE = processenv('ANONYMOUS_LIMIT_VALUE') || 10


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


const MOSMIX_STATION_CATALOG_PATH = './sample_data/mosmix_pdftotext.txt'

if (!_.isNumber(LISTEN_PORT)) {
  console.error('LISTEN_PORT must be a number: ' + LISTEN_PORT)
  process.exit(EXIT_CODE_LISTEN_PORT_NOT_A_NUMBER)
}

if (!_.isString(DATA_ROOT_PATH)) {
  console.error('DATA_ROOT_PATH must be a string: ' + DATA_ROOT_PATH)
  process.exit(EXIT_CODE_DATA_ROOT_PATH_NOT_A_STRING)
}

if (!_.isString(NEWEST_FORECAST_ROOT_PATH)) {
  console.error('NEWEST_FORECAST_ROOT_PATH must be a string: ' + NEWEST_FORECAST_ROOT_PATH)
  process.exit(EXIT_CODE_NEWEST_FORECAST_ROOT_PATH_NOT_A_STRING)
}

if (!_.isString(POIS_JSON_FILE_PATH)) {
  console.error('POIS_JSON_FILE_PATH must be a string: ' + POIS_JSON_FILE_PATH)
  process.exit(EXIT_CODE_POIS_JSON_FILE_PATH_NOT_A_STRING)
}

if (!_.isString(JWT_PUBLIC_KEY_FILE_PATH)) {
  console.error('JWT_PUBLIC_KEY_FILE_PATH must be a string: ' + JWT_PUBLIC_KEY_FILE_PATH)
  process.exit(JWT_PUBLIC_KEY_FILE_PATH)
}

if (!_.isNumber(AUTHORIZATION_LIMIT_INTERVAL) || AUTHORIZATION_LIMIT_INTERVAL <= 0) {
  console.error('AUTHORIZATION_LIMIT_INTERVAL must be a positive number: ' + AUTHORIZATION_LIMIT_INTERVAL)
  process.exit(EXIT_CODE_AUTHORIZATION_LIMIT_INTERVAL_NOT_A_POSITIVE_NUMBER)
}

if (!_.isNumber(AUTHORIZATION_LIMIT_VALUE) || AUTHORIZATION_LIMIT_VALUE <= 0) {
  console.error('AUTHORIZATION_LIMIT_INTERVAL must be a positive number: ' + AUTHORIZATION_LIMIT_VALUE)
  process.exit(EXIT_CODE_AUTHORIZATION_LIMIT_VALUE_NOT_A_POSITIVE_NUMBER)
}

if (!_.isNumber(ANONYMOUS_LIMIT_INTERVAL) || ANONYMOUS_LIMIT_INTERVAL <= 0) {
  console.error('AUTHORIZATION_LIMIT_INTERVAL must be a positive number: ' + ANONYMOUS_LIMIT_INTERVAL)
  process.exit(EXIT_CODE_ANONYMOUS_LIMIT_INTERVAL_NOT_A_POSITIVE_NUMBER)
}

if (!_.isNumber(ANONYMOUS_LIMIT_VALUE) || ANONYMOUS_LIMIT_VALUE <= 0) {
  console.error('ANONYMOUS_LIMIT_VALUE must be a positive number: ' + ANONYMOUS_LIMIT_VALUE)
  process.exit(EXIT_CODE_ANONYMOUS_LIMIT_VALUE_NOT_A_POSITIVE_NUMBER)
}

console.log()
console.log('=== PARAMETERS ===')
console.log('LISTEN_PORT: ' + LISTEN_PORT)
console.log('DATA_ROOT_PATH: ' + DATA_ROOT_PATH)
console.log('NEWEST_FORECAST_ROOT_PATH: ' + NEWEST_FORECAST_ROOT_PATH)
console.log('POIS_JSON_FILE_PATH: ' + POIS_JSON_FILE_PATH)
console.log('JWT_PUBLIC_KEY_FILE_PATH: ' + JWT_PUBLIC_KEY_FILE_PATH)
console.log('AUTHORIZATION_LIMIT_INTERVAL: ' + AUTHORIZATION_LIMIT_INTERVAL)
console.log('AUTHORIZATION_LIMIT_VALUE: ' + AUTHORIZATION_LIMIT_VALUE)
console.log('ANONYMOUS_LIMIT_INTERVAL: ' + ANONYMOUS_LIMIT_INTERVAL)
console.log('ANONYMOUS_LIMIT_VALUE: ' + ANONYMOUS_LIMIT_VALUE)
console.log('=== END PARAMETERS ===')
console.log()


// global variables
const app = express()
const authorizedRequestStatisticsMap = {}

var publicKey = null
try {
  publicKey = fs.readFileSync(JWT_PUBLIC_KEY_FILE_PATH)
} catch (error) {
  console.log('PUBLIC KEY could not be loaded')
  console.log(error)
  process.exit(EXIT_CODE_PUBLIC_KEY_LOAD_ERROR)
}

// verify token
app.use(jwt({secret: publicKey, credentialsRequired: false}))

// continue if token is invalid
app.use((error, req, res, next) => {
  console.log(error)
  next()
})

// limit acces base on usage statistic of token
// if invalid or no token is provided, then request is treated with user
// 'ANONYMOUS'
app.use((req, res, next) => {

  var sub = 'ANONYMOUS'
  if (req.user != null && req.user.sub != null) {
    sub = req.user.sub
  }

  console.log('sub: ' + sub)

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
    return
  }

  authorizedRequestStatisticsMap[sub].push(now)
  next()
  return
})

app.use(cors())
app.use(express.json())
app.use(express.urlencoded())
app.use(express.static('./docs'))

app.on('error', (error) => {
  console.error('got an server error')
  console.error(error)
  process.exit(EXIT_CODE_SERVER_ERROR)
})

app.listen(LISTEN_PORT, () => {
  console.log('Listening on port ' + LISTEN_PORT)
  init()
})

async function init() {
  const stationCatalog = await mmsc.readStationCatalogFromTextFile(MOSMIX_STATION_CATALOG_PATH)

  const endPointMapping = [
    {method: 'get', openapiPath: '/poi_forecasts/cosmo_de_27/{poi_id}', path: '/poi_forecasts/cosmo_de_27/:poi_id', handler: hfc.getPoiForecastsCosmeDe27Poi('/tmp/poi_forecasts', stationCatalog)},
    {method: 'get', openapiPath: '/poi_forecasts/cosmo_de_45/{poi_id}', path: '/poi_forecasts/cosmo_de_45/:poi_id', handler: hfc.getPoiForecastsCosmeDe45Poi('/tmp/poi_forecasts', stationCatalog)},
    {method: 'get', openapiPath: '/pois', path: '/pois', handler: hpoi.getPois(POIS_JSON_FILE_PATH)}
  ]

  var api = await fs.readJson('./docs/openapi_oas2.json')
  api = await $RefParser.dereference(api)

  const models = _.get(api, ['definitions'])

  swaggerTools.initializeMiddleware(api, function (middleware) {

    // Interpret Swagger resources and attach metadata to request - must be first in swagger-tools middleware chain
    app.use(middleware.swaggerMetadata())

    // Validate Swagger requests
    app.use(middleware.swaggerValidator())

    // Serve the Swagger documents and Swagger UI
    app.use(middleware.swaggerUi())

    //console.log(app._router.stack)

    const paths = _.get(api, ['paths'])
    _.forEach(paths, (pathDefinition, path) => {
      _.forEach(pathDefinition, (spec, method) => {
        const mapping = _.find(endPointMapping, (mapping) => {
          return _.lowerCase(mapping.method) === _.lowerCase(method) && _.lowerCase(mapping.openapiPath) === _.lowerCase(path)
        })

        if (_.isNil(mapping)) {
          console.error('no fitting mapping found for method ' + method + ' and path ' + path)
          return
        }

        console.log(method, mapping.path)
        app[method](mapping.path, mapping.handler)
      })
    })
  })
}

poifce.run(60, path.join(DATA_ROOT_PATH, 'cosmo', 'de', 'grib'), NEWEST_FORECAST_ROOT_PATH)
