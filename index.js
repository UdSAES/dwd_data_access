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

//const pathToSwaggerUi = require('swagger-ui-dist').absolutePath()

const LISTEN_PORT = processenv('LISTEN_PORT')
const DATA_ROOT_PATH = processenv('DATA_ROOT_PATH')
const NEWEST_FORECAST_ROOT_PATH = processenv('NEWEST_FORECAST_ROOT_PATH')


const EXIT_CODE_LISTEN_PORT_NOT_A_NUMBER = 1
const EXIT_CODE_DATA_ROOT_PATH_NOT_A_STRING = 2
const EXIT_CODE_NEWEST_FORECAST_ROOT_PATH_NOT_A_STRING = 3
const EXIT_CODE_SERVER_ERROR = 4


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



console.log('LISTEN_PORT: ' + LISTEN_PORT)
console.log('DATA_ROOT_PATH: ' + DATA_ROOT_PATH)

const app = express()
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
    {method: 'get', openapiPath: '/pois', path: '/pois', handler: hpoi.getPois('./configuration/pois.json')}
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
