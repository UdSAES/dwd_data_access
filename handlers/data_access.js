// SPDX-FileCopyrightText: 2018 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

'use strict'

const url = require('url')
const path = require('path')
const moment = require('moment')
const csv = require('dwd-csv-helper')
const _ = require('lodash')
const { convertUnit } = require('../lib/unit_conversion.js')
const gf = require('../lib/grib_functions')
const su = require('../lib/station_utils.js')
const mvu = require('../lib/measured_values_utils.js')
const ru = require('../lib/response_utils.js')
const fu = require('../lib/forecast_utils.js')
const gu = require('../lib/general_utils.js')

// Instantiate logger
const log = require('../lib/logger.js')

const now = moment()
const defaultStartTimestamp = now
  .startOf('day')
  .tz('Europe/Berlin')
  .format('x')
const defaultEndTimestamp = now
  .endOf('day')
  .tz('Europe/Berlin')
  .format('x')

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

      default: function () {
        ru.sendProblemDetail(res, {
          title: 'Not acceptable',
          status: 406,
          detail: 'The requested (hyper-) media type is not supported for this resource'
        })
      }
    })
  }
}

// GET /weather-stations/:stationId
function getSingleWeatherStation (stationCatalog) {
  return async function (c, req, res, next) {
    const urlString = req.originalUrl
    const stations = su.findStationsInVicinityOf(
      stationCatalog,
      undefined,
      undefined,
      undefined
    )
    const stationId = urlString.split('/')[2]
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

        default: function () {
          ru.sendProblemDetail(res, {
            title: 'Not acceptable',
            status: 406,
            detail:
              'The requested (hyper-) media type is not supported for this resource'
          })
        }
      })
    } else {
      ru.respondWithNotFound(c, req, res, next)
    }
  }
}

// GET /weather/cosmo/d2/:referenceTimestamp/:voi?lat=...&lon=...
function getWeatherCosmoD2 (WEATHER_DATA_BASE_PATH, voisConfigs) {
  return async function (req, res, next) {
    const referenceTimestamp = parseInt(req.params.referenceTimestamp)
    const voi = req.params.voi
    const lat = parseFloat(req.query.lat)
    const lon = parseFloat(req.query.lon)
    const cosmoD2AvailableFrom = moment.utc('2018051509', 'YYYYMMDDHH')

    let gribBaseDirectory = null
    if (moment.utc(referenceTimestamp).isBefore(cosmoD2AvailableFrom)) {
      gribBaseDirectory = path.join(
        WEATHER_DATA_BASE_PATH,
        'weather',
        'cosmo',
        'de',
        'grib'
      )
    } else {
      gribBaseDirectory = path.join(
        WEATHER_DATA_BASE_PATH,
        'weather',
        'cosmo-d2',
        'grib'
      )
    }

    try {
      const voiConfig = _.find(voisConfigs, (item) => {
        return item.target.key === voi
      })

      let timeseriesData
      if (voiConfig.cosmo.functionType === 'loadBaseValue') {
        timeseriesData = await gf.loadBaseValue({
          gribBaseDirectory,
          referenceTimestamp,
          voi: voiConfig.cosmo.options.key,
          location: {
            lat,
            lon
          },
          sourceUnit: voiConfig.cosmo.options.unit,
          targetUnit: voiConfig.target.unit
        })
      } else if (voiConfig.cosmo.functionType === 'loadRadiationValue') {
        timeseriesData = await gf.loadRadiationValue({
          gribBaseDirectory,
          referenceTimestamp,
          voi: voiConfig.cosmo.options.key,
          location: {
            lat,
            lon
          },
          sourceUnit: voiConfig.cosmo.options.unit,
          targetUnit: voiConfig.target.unit
        })
      } else if (voiConfig.cosmo.functionType === 'load2DVectorNorm') {
        timeseriesData = await gf.load2DVectorNorm({
          gribBaseDirectory,
          referenceTimestamp,
          voi1: voiConfig.cosmo.options.voi1_key,
          voi2: voiConfig.cosmo.options.voi2_key,
          location: {
            lat,
            lon
          },
          sourceUnit1: voiConfig.cosmo.options.voi1_unit,
          sourceUnit2: voiConfig.cosmo.options.voi2_unit,
          targetUnit: voiConfig.target.unit
        })
      } else if (voiConfig.cosmo.functionType === 'load2DVectorAngle') {
        timeseriesData = await gf.load2DVectorAngle({
          gribBaseDirectory,
          referenceTimestamp,
          voi1: voiConfig.cosmo.options.voi1_key,
          voi2: voiConfig.cosmo.options.voi2_key,
          location: {
            lat,
            lon
          },
          sourceUnit1: voiConfig.cosmo.options.voi1_unit,
          sourceUnit2: voiConfig.cosmo.options.voi2_unit,
          targetUnit: voiConfig.target.unit
        })
      }

      const result = {
        label: voiConfig.target.key,
        unit: voiConfig.target.unit,
        data: timeseriesData.timeseriesData,
        location: timeseriesData.location
      }
      res.status(200).send(result)
      req.log.info(
        { res: res },
        `successfully handled ${req.method}-request on ${req.path}`
      )
    } catch (error) {
      res.status(500).send()
      req.log.warn(
        { err: error, res: res },
        `error while handling ${req.method}-request on ${req.path}`
      )
    }
  }
}

// GET /weather/local_forecasts/poi/:referenceTimestamp/:sid/:voi
function getWeatherMosmix (WEATHER_DATA_BASE_PATH, voisConfigs) {
  const MOSMIX_DATA_BASE_PATH = path.join(
    WEATHER_DATA_BASE_PATH,
    'weather',
    'local_forecasts'
  )

  return async function (req, res, next) {
    const referenceTimestamp = parseInt(req.params.referenceTimestamp)
    const sid = req.params.sid
    const voi = req.params.voi

    try {
      const timeseriesDataCollection = await csv.readTimeseriesDataMosmix(
        MOSMIX_DATA_BASE_PATH,
        referenceTimestamp,
        sid
      )
      const voiConfig = _.find(voisConfigs, (item) => {
        return item.target.key === voi
      })

      let timeseriesData
      if (!_.isNil(_.get(voiConfig, ['mosmix', 'key']))) {
        timeseriesData = timeseriesDataCollection[voiConfig.mosmix.key]
        timeseriesData = _.map(timeseriesData, (item) => {
          return {
            timestamp: item.timestamp,
            value: convertUnit(item.value, voiConfig.mosmix.unit, voiConfig.target.unit)
          }
        })
      } else {
        res.status(500).send()
      }

      const result = {
        label: voiConfig.target.key,
        unit: voiConfig.target.unit,
        data: timeseriesData
      }
      res.status(200).send(result)
      req.log.info(
        { res: res },
        `successfully handled ${req.method}-request on ${req.path}`
      )
    } catch (error) {
      res.status(500).send()
      req.log.warn(
        { err: error, res: res },
        `error while handling ${req.method}-request on ${req.path}`
      )
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

  return async function (c, req, res, next) {
    const defaultParameter = ['t_2m']
    const startTimestamp = parseInt(req.query.from)
      ? parseInt(req.query.from)
      : parseInt(defaultStartTimestamp)
    const endTimestamp = parseInt(req.query.to)
      ? parseInt(req.query.from)
      : parseInt(defaultEndTimestamp)
    const voi = req.query.quantities
    let vois = defaultParameter
    if (voi) {
      vois = voi.split(',')
    }

    const splitUrl = req.path.split('/')
    const stationId = splitUrl[2]

    const voiConfigs = gu.getVoiConfigsAsArray(vois, voisConfigs)
    log.trace({ voiConfigs })
    const checkedVois = gu.checkValidityOfQuantityIds(voiConfigs)
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
    const timeseriesDataCollection = await csv.readTimeseriesDataReport(
      REPORT_DATA_BASE_PATH,
      startTimestamp,
      endTimestamp,
      stationId
    )
    log.trace({ timeseriesDataCollection })

    const timeseriesDataArrayUnformatted = mvu.dropNaN(
      mvu.dropTimeseriesDataNotOfInterest(voiConfigs, timeseriesDataCollection)
    )
    log.trace({ timeseriesDataArrayUnformatted })

    const timeseriesDataArray = gu.convertUnits(
      voiConfigs,
      timeseriesDataArrayUnformatted
    )
    log.trace({ timeseriesDataArray })

    log.debug('rendering and sending response now')
    res.format({
      'application/json': function () {
        const measuredValues = mvu.renderMeasuredValuesAsJSON(
          voiConfigs,
          timeseriesDataArray,
          vois,
          stationId
        )
        res.status(200).send(measuredValues)
      },

      'text/csv': function () {
        const measuredValues = mvu.renderMeasuredValuesAsCSV(
          voiConfigs,
          timeseriesDataArray
        )
        res.status(200).send(measuredValues)
      },

      default: function () {
        ru.sendProblemDetail(res, {
          title: 'Not acceptable',
          status: 406,
          detail: 'The requested (hyper-) media type is not supported for this resource'
        })
      }
    })
  }
}

// GET /weather-stations/{stationId}/forecast?
// model=...&model-run=...quantities=...&from=...&to=...
function getForecastAtStation (WEATHER_DATA_BASE_PATH, voisConfigs, stationCatalog) {
  return async function (c, req, res, next) {
    const defaultModel = 'cosmo-d2'
    const defaultModelRun = '21'
    const stationId = gu.getStationIdFromUrlPath(req.path)
    // Get all query parameters
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

    if (!fu.checkIfValidModelRun(config.allowedModelRuns, modelRun)) {
      ru.sendProblemDetail(res, {
        title: 'Schema validation Failed',
        status: 400,
        detail: 'Received request for unconfigured MODEL-RUN'
      })
      req.log.warn(
        { res: res },
        'received request for REPORT for unconfigured MODEL-RUN'
      )
      return
    }
    const vois = gu.getVoisNamesFromQuery(req.query)

    const voiConfigs = gu.getVoiConfigsAsArray(vois, voisConfigs)
    log.trace({ voiConfigs })
    const checkedVois = gu.checkValidityOfQuantityIds(voiConfigs)
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
    const timeseriesDataCollection = await config.functionToReadData(
      config.MODEL_DATA_PATH,
      voiConfigs,
      startTimestamp,
      endTimestamp,
      stationId,
      modelRun,
      stationCatalog
    )
    log.trace({ timeseriesDataCollection })

    // const timeseriesDataArrayUnformatted = mvu.dropNaN(
    //   mvu.dropTimeseriesDataNotOfInteresWithParameter(voiConfigs, timeseriesDataCollection, "mosmix")
    // )
    // log.trace({ timeseriesDataArrayUnformatted })

    const timeseriesDataArray = await config.unitsConverter(
      voiConfigs,
      timeseriesDataCollection,
      config.model
    )
    log.trace({ timeseriesDataArray })

    log.debug('rendering and sending response now')
    res.format({
      'application/json': async function () {
        const localForecast = await config.jsonRenderer(
          vois,
          stationId,
          modelRun,
          model,
          startTimestamp,
          endTimestamp,
          voiConfigs,
          timeseriesDataArray
        )
        res.status(200).send(localForecast)
      },

      'text/csv': function () {
        const localForecast = config.csvRenderer(voiConfigs, timeseriesDataArray)
        res.status(200).send(localForecast)
      },

      default: function () {
        ru.sendProblemDetail(res, {
          title: 'Not acceptable',
          status: 406,
          detail: 'The requested (hyper-) media type is not supported for this resource'
        })
      }
    })
  }
}

exports.getWeatherStations = getWeatherStations
exports.getSingleWeatherStation = getSingleWeatherStation
exports.getWeatherCosmoD2 = getWeatherCosmoD2
exports.getWeatherMosmix = getWeatherMosmix
exports.getMeasuredValues = getMeasuredValues
exports.getForecastAtStation = getForecastAtStation
