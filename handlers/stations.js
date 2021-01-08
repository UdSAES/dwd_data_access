// SPDX-FileCopyrightText: 2018 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

'use strict'

const url = require('url')
const path = require('path')
const moment = require('moment')
const _ = require('lodash')
const su = require('../lib/stations_utils.js')
const bmu = require('../lib/beob_mosmix_utils.js')
const reqU = require('../lib/request_utils.js')
const ru = require('../lib/response_utils.js')
const fu = require('../lib/forecast_utils.js')
const gu = require('../lib/general_utils.js')
const tsCsv = require('../lib/timeseries_as_csv')
const tsJson = require('../lib/timeseries_as_json')
// Instantiate logger
const log = require('../lib/logger.js')

// GET /weather-stations
function getWeatherStations (stationCatalog) {
  return async function (c, req, res, next) {
    function getUrlOfTheStation (station, req) {
      return url.format({
        protocol: req.protocol,
        host: req.get('host'),
        pathname: 'weather-stations/' + station.stationId
      })
    }

    function formatJSONStationWithDistance (item) {
      const stationName = item.station.name
      const stationDistance = item.distance
      return {
        name: stationName,
        url: getUrlOfTheStation(item.station, req),
        distance: stationDistance
      }
    }

    function formatJSONStationWithoutDistance (item) {
      const stationName = item.name
      return {
        name: stationName,
        url: getUrlOfTheStation(item, req)
      }
    }

    function renderStationListAsJSON (stations) {
      if (stations === []) {
        return []
      } else if (_.has(stations[0], 'distance')) {
        return stations.map((item) => formatJSONStationWithDistance(item))
      } else {
        return stations.map((item) => formatJSONStationWithoutDistance(item))
      }
    }

    const csvLabels = 'name, url, distance \n'

    function formatCSVStationWithDistance (item) {
      const stationName = item.station.name
      const distance = item.distance
      return `${stationName}, ${getUrlOfTheStation(item.station, req)}, ${distance} \n`
    }

    function formatCSVStationWithoutDistance (item) {
      const stationName = item.name
      return `${stationName}, ${getUrlOfTheStation(item, req)}, \n`
    }

    function renderStationListAsCSV (stations) {
      const resultString = ''
      if (stations === []) {
        return []
      } else if (stations[0].distance) {
        return (
          csvLabels +
          stations.reduce((acc, item) => {
            acc += formatCSVStationWithDistance(item)
            return acc
          }, resultString)
        )
      } else {
        return (
          csvLabels +
          stations.reduce((acc, item) => {
            acc += formatCSVStationWithoutDistance(item)
            return acc
          }, resultString)
        )
      }
    }

    function parseCoordinates (coordinates) {
      if (coordinates === undefined || coordinates === null) {
        return undefined
      } else {
        const splitCoordinates = coordinates.split('/')
        return { latitude: splitCoordinates[0], longitude: splitCoordinates[1] }
      }
    }

    const queryString = req.query
    const coordinates = parseCoordinates(queryString['in-vicinity-of'])
    const radius = parseInt(queryString.radius)
    const limit = parseInt(queryString.limit)
    const stations = su.findStationsInVicinityOf(
      stationCatalog,
      coordinates,
      radius,
      limit
    )

    res.format({
      'application/json': function () {
        res.status(200).send(renderStationListAsJSON(stations))
      },

      'text/csv': function () {
        res.status(200).send(renderStationListAsCSV(stations))
      },

      default: ru.respondWithNotAcceptable
    })
  }
}

// GET /weather-stations/{stationId}
function getSingleWeatherStation (stationCatalog) {
  return async function (c, req, res, next) {
    const urlString = req.originalUrl
    const stations = su.findStationsInVicinityOf(
      stationCatalog,
      undefined,
      undefined,
      undefined
    )
    const stationId = reqU.getStationIdFromUrlPath(urlString)
    const station = getStationById(stations, stationId)[0]

    function getStationById (stations, stationId) {
      return stations.filter((station) => station.stationId === stationId)
    }

    function getUrlForMeasuredValuesOrForecast (station, req, parameter) {
      return url.format({
        protocol: req.protocol,
        host: req.get('host'),
        pathname: 'weather-stations/' + station.stationId + '/' + parameter
      })
    }

    function renderStationAsJSON (station) {
      return {
        name: station.name,
        location: {
          latitude: { unit: 'deg', value: station.location.latitude },
          longitude: { unit: 'deg', value: station.location.longitude },
          elevation: { unit: 'm', value: station.location.elevation }
        },
        stationId: station.stationId,
        measuredValues: getUrlForMeasuredValuesOrForecast(
          station,
          req,
          'measured-values'
        ),
        forecast: getUrlForMeasuredValuesOrForecast(station, req, 'forecast')
      }
    }

    if (station !== undefined) {
      res.format({
        'application/json': function () {
          res.status(200).send(renderStationAsJSON(station))
        },

        default: ru.respondWithNotAcceptable
      })
    } else {
      ru.respondWithNotFound(c, req, res, next)
    }
  }
}

// GET /weather-stations/{stationId}/measured-values?quantities=...&from=...&to=...
function getMeasuredValues (WEATHER_DATA_BASE_PATH, voisConfigs) {
  const REPORT_DATA_BASE_PATH = path.join(
    WEATHER_DATA_BASE_PATH,
    'weather',
    'weather_reports'
  )

  const now = moment()
  const defaultStartTimestamp = now
    .startOf('day')
    .tz('Europe/Berlin')
    .format('x')
  const defaultEndTimestamp = now
    .endOf('day')
    .tz('Europe/Berlin')
    .format('x')

  return async function (c, req, res, next) {
    const startTimestamp = parseInt(req.query.from)
      ? parseInt(req.query.from)
      : parseInt(defaultStartTimestamp)
    const endTimestamp = parseInt(req.query.to)
      ? parseInt(req.query.to)
      : parseInt(defaultEndTimestamp)

    const vois = reqU.getVoisNamesFromQuery(req.query)
    const stationId = reqU.getStationIdFromUrlPath(req.path)

    const voiConfigs = gu.getVoiConfigsAsArray(vois, voisConfigs)
    log.trace({ voiConfigs }, 'see internal object `{ voiConfigs }`')
    const checkedVois = reqU.checkValidityOfQuantityIds(voiConfigs)
    log.trace({ checkedVois }, 'see internal object `{ checkedVois }`')

    if (_.includes(checkedVois, false)) {
      ru.sendProblemDetail(res, {
        title: 'Schema validation Failed',
        status: 400,
        detail: 'Received request for unconfigured VOI'
      })
      req.log.warn({ res: res }, 'Received request for unconfigured VOI')
      return
    }

    log.debug('reading timeseries data from disk...')
    const timeseriesDataCollection = await bmu.readTimeseriesDataBeob(
      REPORT_DATA_BASE_PATH,
      startTimestamp,
      endTimestamp,
      voiConfigs,
      stationId
    )
    log.trace(
      { timeseriesDataCollection },
      'see internal object `{ timeseriesDataCollection }`'
    )

    log.debug('rendering and sending response now')
    res.format({
      'application/json': function () {
        const measuredValues = tsJson.renderTimeseriesAsJSON(
          voiConfigs,
          timeseriesDataCollection,
          vois,
          stationId,
          'beob',
          null,
          startTimestamp,
          endTimestamp
        )
        res.status(200).send(measuredValues)
      },

      'text/csv': function () {
        const measuredValues = tsCsv.renderTimeseriesAsCSV(
          voiConfigs,
          timeseriesDataCollection
        )
        res.status(200).send(measuredValues)
      },

      default: ru.respondWithNotAcceptable
    })
  }
}

// GET /weather-stations/{stationId}/forecast?
// model=...&model-run=...quantities=...&from=...&to=...
function getForecastAtStation (WEATHER_DATA_BASE_PATH, voisConfigs, stationCatalog) {
  return async function (c, req, res, next) {
    const defaultModel = 'cosmo-d2'
    const defaultModelRun = '21'
    const stationId = reqU.getStationIdFromUrlPath(req.path)

    const now = moment()
    const defaultStartTimestamp = now
      .startOf('day')
      .tz('Europe/Berlin')
      .format('x')
    const defaultEndTimestamp = now
      .endOf('day')
      .tz('Europe/Berlin')
      .format('x')

    const startTimestamp = parseInt(req.query.from)
      ? parseInt(req.query.from)
      : parseInt(defaultStartTimestamp)
    const endTimestamp = parseInt(req.query.to)
      ? parseInt(req.query.to)
      : parseInt(defaultEndTimestamp)

    const modelRun = req.query['model-run'] ? req.query['model-run'] : defaultModelRun
    const model = req.query.model ? req.query.model : defaultModel

    const MOSMIX_DATA_BASE_PATH = path.join(
      WEATHER_DATA_BASE_PATH,
      'weather',
      'local_forecasts'
    )

    const config = fu.getConfigFromModel(
      model,
      WEATHER_DATA_BASE_PATH,
      MOSMIX_DATA_BASE_PATH
    )

    if (!fu.isValidModelRun(config.allowedModelRuns, modelRun)) {
      ru.sendProblemDetail(res, {
        title: 'Schema validation Failed',
        status: 400,
        detail: 'Received request for unconfigured MODEL-RUN'
      })
      req.log.warn(
        { res: res },
        `User supplied value for parameter "model-run" does not match available choices for model ${modelRun}`
      )
      return
    }

    const vois = reqU.getVoisNamesFromQuery(req.query)
    const voiConfigs = gu.getVoiConfigsAsArray(vois, voisConfigs)
    log.trace({ voiConfigs })
    const checkedVois = reqU.checkValidityOfQuantityIds(voiConfigs)
    log.trace({ checkedVois })

    if (_.includes(checkedVois, false)) {
      ru.sendProblemDetail(res, {
        title: 'Schema validation Failed',
        status: 400,
        detail: 'Received request for unconfigured VOI'
      })
      req.log.warn({ res: res }, 'received request for REPORT for unconfigured VOI')
      return
    }

    log.debug('reading BEOB data from disk...')
    let timeseriesDataCollection = await config.functionToReadData(
      config.MODEL_DATA_PATH,
      voiConfigs,
      startTimestamp,
      endTimestamp,
      stationId,
      modelRun,
      stationCatalog
    )
    log.trace({ timeseriesDataCollection })

    timeseriesDataCollection = config.timeseriesShortener(
      timeseriesDataCollection,
      startTimestamp,
      endTimestamp
    )

    log.debug('rendering and sending response now')
    res.format({
      'application/json': async function () {
        const forecastRepresentation = await config.jsonRenderer(
          voiConfigs,
          timeseriesDataCollection,
          vois,
          stationId,
          model,
          modelRun,
          startTimestamp,
          endTimestamp
        )

        res.status(200).send(forecastRepresentation)
      },
      'text/csv': function () {
        const forecastRepresentation = config.csvRenderer(
          voiConfigs,
          timeseriesDataCollection
        )
        res.status(200).send(forecastRepresentation)
      },

      default: ru.respondWithNotAcceptable
    })
  }
}

exports.getWeatherStations = getWeatherStations
exports.getSingleWeatherStation = getSingleWeatherStation
exports.getMeasuredValues = getMeasuredValues
exports.getForecastAtStation = getForecastAtStation
