// SPDX-FileCopyrightText: 2018 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

'use strict'

const url = require('url')
const path = require('path')
const moment = require('moment')
const csv = require('dwd-csv-helper')
const _ = require('lodash')
const {
  convertUnit
} = require('../lib/unit_conversion.js')
const gf = require('../lib/grib_functions')
const su = require('../lib/station_utils.js')

// Instantiate logger
const processenv = require('processenv')
const LOG_LEVEL = String(processenv('LOG_LEVEL') || 'info')

var bunyan = require('bunyan')
var log = bunyan.createLogger({
  name: 'handler_non-cached_data_access',
  level: LOG_LEVEL,
  serializers: bunyan.stdSerializers
})
log.info('loaded module for handling requests for non-cached data')

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
        return csvLabels + stations.reduce((acc, item) => {
          acc += formatCSVStationWithDistance(item)
          return acc
        }, resultString)
      } else {
        return csvLabels + stations.reduce((acc, item) => {
          acc += formatCSVStationWithoutDistance(item)
          return acc
        }, resultString)
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
    const stations = su.findStationsInVicinityOf(stationCatalog, coordinates, radius, limit)

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

//
function getSingleWeatherStation (stationCatalog) {
  return async function (c, req, res, next) {}
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
      gribBaseDirectory = path.join(WEATHER_DATA_BASE_PATH, 'weather', 'cosmo', 'de', 'grib')
    } else {
      gribBaseDirectory = path.join(WEATHER_DATA_BASE_PATH, 'weather', 'cosmo-d2', 'grib')
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
      req.log.info({ res: res }, `successfully handled ${req.method}-request on ${req.path}`)
    } catch (error) {
      res.status(500).send()
      req.log.warn({ err: error, res: res }, `error while handling ${req.method}-request on ${req.path}`)
    }
  }
}

// GET /weather/local_forecasts/poi/:referenceTimestamp/:sid/:voi
function getWeatherMosmix (WEATHER_DATA_BASE_PATH, voisConfigs) {
  const MOSMIX_DATA_BASE_PATH = path.join(WEATHER_DATA_BASE_PATH, 'weather', 'local_forecasts')

  return async function (req, res, next) {
    const referenceTimestamp = parseInt(req.params.referenceTimestamp)
    const sid = req.params.sid
    const voi = req.params.voi

    try {
      const timeseriesDataCollection = await csv.readTimeseriesDataMosmix(MOSMIX_DATA_BASE_PATH, referenceTimestamp, sid)
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
      req.log.info({ res: res }, `successfully handled ${req.method}-request on ${req.path}`)
    } catch (error) {
      res.status(500).send()
      req.log.warn({ err: error, res: res }, `error while handling ${req.method}-request on ${req.path}`)
    }
  }
}

// http://localhost:5000/weather-stations/10505/measured-values?quantities=t_2m&from=1597140000000&to=1597226400000

function getMeasuredValues (WEATHER_DATA_BASE_PATH, voisConfigs) {
  const REPORT_DATA_BASE_PATH = path.join(WEATHER_DATA_BASE_PATH, 'weather', 'weather_reports')

  return async function (c, req, res, next) {
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
      startTimestamp = moment.utc().subtract(25, 'hours').valueOf()
    }

    if (isNaN(endTimestamp)) {
      endTimestamp = moment.utc().valueOf()
    }

    function getVoiConfigsAsArray (vois) {
      const voiConfigs = []
      _.forEach(vois, function (voi) {
        const voiConfig = _.find(voisConfigs, (item) => {
          return item.target.key === voi
        })
        voiConfigs.push(voiConfig)
      })
      return voiConfigs
    }

    function ensureVoiConfigsCorrectness (voiConfigs) {
      _.forEach(voiConfigs, function (voiConfig) {
        if (_.isNil(_.get(voiConfig, ['report', 'key']))) {
          res.status(500).send('Received request for REPORT for unconfigured VOI')
          req.log.warn({ res: res }, 'Received request for REPORT for unconfigured VOI')
        }
      })
    }

    function getTimeSeriesData (voiConfigs, timeseriesDataCollection) {
      const timeSeriesData = []
      voiConfigs.forEach(function (voiConfig) {
        timeSeriesData.push(timeseriesDataCollection[voiConfig.report.key])
      })
      return timeSeriesData
    }

    function formatTimeseriesDataArray (timeseriesDataArray) {
      const timestampsToRemove = []
      _.forEach(timeseriesDataArray, function (timeseriesData) {
        _.forEach(timeseriesData, (item) => {
          if (!_.isNil(item.value)) {
            return
          }

          const betterItem = _.find(timeseriesData, (item2) => {
            return item2.timestamp === item.timestamp && !_.isNil(item2.value)
          })

          if (!_.isNil(betterItem)) {
            timestampsToRemove.push(item.timestamp)
          }
        })
      })

      _.forEach(timeseriesDataArray, function (timeseriesData) {
        _.remove(timeseriesData, (item) => {
          return _.includes(timestampsToRemove, item.timestamp) && _.isNil(item.value)
        })
      })
      return timeseriesDataArray
    }

    function renderMeasuredValuesAsJSON (voiConfigs, timeseriesDataArray) {
      const result = {
        description: `Quantities ${vois} measured at station ${sid}`,
        data: []
      }
      for (let i = 0; i < voiConfigs.length; i += 1) {
        const voiConfig = voiConfigs[i]
        const dataElement = {
          label: voiConfig.target.key,
          unit: voiConfig.target.unit,
          timseries: timeseriesDataArray[i]
        }
        result.data.push(dataElement)
      }
      return result
    }

    function getCSVLabels (voiConfigs) {
      let csvLabels = 'timestamp / ms,'
      _.forEach(voiConfigs, function (voiConfig) {
        const key = voiConfig.target.key
        const unit = voiConfig.target.unit
        csvLabels += `${key} / ${unit},`
      })
      csvLabels += '\n'
      return csvLabels
    }

    function getFirstElementsFromTimeseries (timeseriesDataArray) {
      const result = []
      _.forEach(timeseriesDataArray, function (item) {
        result.push(_.first(item))
      })
      return result
    }

    function getLastElementsFromTimeseries (timeseriesDataArray) {
      // returns from each array in timeseriesDataArray first element.
      const result = []
      _.forEach(timeseriesDataArray, function (item) {
        result.push(_.tail(item))
      })
      return result
    }

    function getValuesAsCSVString (timeStampsAndValues) {
      // Accepts the results from getFirstElementsFromTimeseries
      // timeStampsAndValues [{timestamp: 1, value: 2}, {...}]
      // item {timestamp: 1, value:2}
      const timestampValue = timeStampsAndValues[0].timestamp
      let result = `${timestampValue},`
      _.forEach(timeStampsAndValues, function (item) {
        result += `${item.value},`
      })
      return result
    }

    function getStringsFromStationDataPayload (timeseriesDataArray) {
      function helper (timeseries, result) {
        if (_.isEmpty(getFirstElementsFromTimeseries(timeseries)[0])) {
          return result
        }
        const stringWithValues = getFirstElementsFromTimeseries(timeseries)
        result.push(getValuesAsCSVString(stringWithValues))
        return helper(getLastElementsFromTimeseries(timeseries), result)
      }
      return helper(timeseriesDataArray, [])
    }

    function renderMeasuredValuesAsCSV (voiConfigs, timeseriesDataArray) {
      const csvLabels = getCSVLabels(voiConfigs, timeseriesDataArray)
      const csvStrings = getStringsFromStationDataPayload(timeseriesDataArray)
      return csvLabels + csvStrings.join('\n')
    }

    const timeseriesDataCollection = await csv.readTimeseriesDataReport(REPORT_DATA_BASE_PATH, startTimestamp, endTimestamp, sid)
    const voiConfigs = getVoiConfigsAsArray(vois)
    ensureVoiConfigsCorrectness(voiConfigs)
    // timeseriesDataArray is an array for timeseries for each voi: [[{}, {}, {}], [{}, {}, {}]]
    // timeseriesDataArray = [[{str:int, str: null}, {...} <-tmstmp]<-voi,[{...}, {...}]<-voi]
    const timeseriesDataArray = formatTimeseriesDataArray(getTimeSeriesData(voiConfigs, timeseriesDataCollection))

    res.format({
      'application/json': function () {
        const measuredValues = renderMeasuredValuesAsJSON(voiConfigs, timeseriesDataArray)
        res.status(200).send(measuredValues)
      },

      'text/csv': function () {
        const measuredValues = renderMeasuredValuesAsCSV(voiConfigs, timeseriesDataArray)
        res.status(200).send(measuredValues)
      },

      default: function () {
        res.status(406).send('Not Acceptable')
      }
    })
  }
}

exports.getWeatherStations = getWeatherStations
exports.getSingleWeatherStation = getSingleWeatherStation
exports.getWeatherCosmoD2 = getWeatherCosmoD2
exports.getWeatherMosmix = getWeatherMosmix
exports.getMeasuredValues = getMeasuredValues
