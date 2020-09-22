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
const ind = require('../index.js')

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
        return stations.map(item => formatJSONStationWithDistance(item))
      } else {
        return stations.map(item => formatJSONStationWithoutDistance(item))
      }
    }

    const csvLabels = 'name, url, distance \n'

    function formatCSVStationWithDistance (item) {
      const stationName = item.station.name
      const distance = item.distance
      return `${stationName}, ${getUrlOfTheStation(
        item.station,
        req
      )}, ${distance} \n`
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
        res.status(406).send('Not Acceptable')
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
      return stations.filter(station => station.stationId === stationId)
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

    function renderStationAsCSV (station) {
      const csvLabels = 'stationId,name,latitude,longitude,elevation'
      const stationId = station.stationId
      const name = station.name
      const latitude = station.location.latitude
      const longitude = station.location.longitude
      const elevation = station.location.elevation
      const stationString = [
        stationId,
        name,
        latitude,
        longitude,
        elevation
      ].join(',')

      return csvLabels + '\n' + stationString
    }

    if (station !== undefined) {
      res.format({
        'application/json': function () {
          res.status(200).send(renderStationAsJSON(station))
        },

        'text/csv': function () {
          res.status(200).send(renderStationAsCSV(station))
        },

        default: function () {
          res.status(406).send('Not Acceptable')
        }
      })
    } else {
      ind.respondWithNotFound(c, req, res, next)
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
      const voiConfig = _.find(voisConfigs, item => {
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
      const voiConfig = _.find(voisConfigs, item => {
        return item.target.key === voi
      })

      let timeseriesData
      if (!_.isNil(_.get(voiConfig, ['mosmix', 'key']))) {
        timeseriesData = timeseriesDataCollection[voiConfig.mosmix.key]
        timeseriesData = _.map(timeseriesData, item => {
          return {
            timestamp: item.timestamp,
            value: convertUnit(
              item.value,
              voiConfig.mosmix.unit,
              voiConfig.target.unit
            )
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
    const now = moment()
    const defaultStartTimestamp = now
      .startOf('day')
      .tz('Europe/Berlin')
      .format('x')
    const defaultEndTimestamp = now
      .endOf('day')
      .tz('Europe/Berlin')
      .format('x')
    const defaultParameter = ['t_2m']
    let startTimestamp = parseInt(req.query.from)
    let endTimestamp = parseInt(req.query.to)
    const voi = req.query.quantities
    let vois = defaultParameter
    if (voi) {
      vois = voi.split(',')
    }

    const splitUrl = req.path.split('/')
    const sid = splitUrl[2]

    if (isNaN(startTimestamp)) {
      startTimestamp = parseInt(defaultStartTimestamp)
    }

    if (isNaN(endTimestamp)) {
      endTimestamp = parseInt(defaultEndTimestamp)
    }

    function getVoiConfigsAsArray (vois) {
      const voiConfigs = []
      _.forEach(vois, function (voi) {
        const voiConfig = _.find(voisConfigs, item => {
          return item.target.key === voi
        })
        voiConfigs.push(voiConfig)
      })
      return voiConfigs
    }

    const voiConfigs = getVoiConfigsAsArray(vois)
    log.trace({ voiConfigs })
    const checkedVois = mvu.checkValidityOfQuantityIds(voiConfigs)
    log.trace({ checkedVois })

    if (_.includes(checkedVois, false)) {
      const config = {
        title: 'Schema validation Failed',
        status: 400,
        detail: 'Received request for unconfigured VOI'
      }
      ru.problemDetail(res, config)
      req.log.warn(
        { res: res },
        'received request for REPORT for unconfigured VOI'
      )
      return
    }

    log.debug('reading BEOB data from disk...')
    const timeseriesDataCollection = await csv.readTimeseriesDataReport(
      REPORT_DATA_BASE_PATH,
      startTimestamp,
      endTimestamp,
      sid
    )
    log.trace({ timeseriesDataCollection })

    const timeseriesDataArrayUnformatted = mvu.dropNaN(
      mvu.dropTimeseriesDataNotOfInterest(voiConfigs, timeseriesDataCollection)
    )
    log.trace({ timeseriesDataArrayUnformatted })

    const timeseriesDataArray = mvu.convertUnits(
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
          sid
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
        const config = {
          title: 'Not acceptable',
          status: 406,
          detail:
            'The requested (hyper-) media type is not supported for this resource'
        }
        ru.problemDetail(res, config)
      }
    })
  }
}

exports.getWeatherStations = getWeatherStations
exports.getSingleWeatherStation = getSingleWeatherStation
exports.getWeatherCosmoD2 = getWeatherCosmoD2
exports.getWeatherMosmix = getWeatherMosmix
exports.getMeasuredValues = getMeasuredValues
