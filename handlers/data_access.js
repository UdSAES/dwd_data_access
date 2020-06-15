// SPDX-FileCopyrightText: 2018 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

'use strict'

const path = require('path')
const moment = require('moment')
const csv = require('dwd-csv-helper')
const _ = require('lodash')
const {
  convertUnit
} = require('../lib/unit_conversion.js')
const gf = require('../lib/grib_functions')

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

// TODO @Georgii implement handler for `GET /weather-stations` here
// GET /weather-stations?in-vicinity-of=...&radius=...&limit=...
function getWeatherStations () {
  return async function (req, res, next) {
    // Load internal representation of list of stations
    res.send('')
    // Get parameters `in-vicinity-of`, `radius`, `limit` from `req`-object
    // https://expressjs.com/en/4x/api.html#req.query

    // Filter list according to parameters (if given)
    // --> call function `findStationsInVicinityOf()` in ./lib/station_utils.js

    // Render external representation according to `Accept`-HTTP header
    // -- JSON for `application/json`, CSV for `text/csv` -- and
    // send result with correct HTTP header and -status code
    // https://expressjs.com/en/4x/api.html#req.accepts
    // https://expressjs.com/en/4x/api.html#res.set
    // https://expressjs.com/en/4x/api.html#res.status
    // https://expressjs.com/en/4x/api.html#res.send
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

// GET /weather/weather_reports/poi/:sid/:voi?startTimestamp=...&endTimestamp=...
function getWeatherReport (WEATHER_DATA_BASE_PATH, voisConfigs) {
  const REPORT_DATA_BASE_PATH = path.join(WEATHER_DATA_BASE_PATH, 'weather', 'weather_reports')

  return async function (req, res, next) {
    let startTimestamp = parseInt(req.query.startTimestamp)
    let endTimestamp = parseInt(req.query.endTimestamp)
    const sid = req.params.sid
    const voi = req.params.voi

    if (isNaN(startTimestamp)) {
      startTimestamp = moment.utc().subtract(25, 'hours').valueOf()
    }

    if (isNaN(endTimestamp)) {
      endTimestamp = moment.utc().valueOf()
    }

    try {
      const timeseriesDataCollection = await csv.readTimeseriesDataReport(REPORT_DATA_BASE_PATH, startTimestamp, endTimestamp, sid)
      const voiConfig = _.find(voisConfigs, (item) => {
        return item.target.key === voi
      })

      if (_.isNil(_.get(voiConfig, ['report', 'key']))) {
        res.status(500).send('received request for REPORT for unconfigured VOI')
        req.log.warn({ res: res }, 'received request for REPORT for unconfigured VOI')
        return
      }

      let timeseriesData = timeseriesDataCollection[voiConfig.report.key]

      // Find timestamps for which at least one value is null and attempt to
      // find a timestamp for which the value is not null
      const timestampsToRemove = []
      _.forEach(timeseriesData, (item) => {
        // Skip item if value is not null
        if (!_.isNil(item.value)) {
          return
        }

        // If value is null, check if there exists another item with the same
        // timestamp which has a value that is not null; return true xor false
        const betterItem = _.find(timeseriesData, (item2) => {
          return item2.timestamp === item.timestamp && !_.isNil(item2.value)
        })

        // If betterItem is true, keep the timestamp; nominate timestamp
        // for removal otherwise
        if (!_.isNil(betterItem)) {
          timestampsToRemove.push(item.timestamp)
        }
      })

      // Remove items for which no value exists at timestamp
      _.remove(timeseriesData, (item) => {
        return _.includes(timestampsToRemove, item.timestamp) && _.isNil(item.value)
      })

      if (!_.isNil(voiConfig)) {
        timeseriesData = _.map(timeseriesData, (item) => {
          return {
            timestamp: item.timestamp,
            value: convertUnit(item.value, voiConfig.report.unit, voiConfig.target.unit)
          }
        })
      }

      const result = {
        label: voiConfig.target.key,
        unit: voiConfig.target.unit,
        data: timeseriesData
      }
      res.status(200).send(result) // FIXME successfull even if data is `[]`
      req.log.info({ res: res }, `successfully handled ${req.method}-request on ${req.path}`)
    } catch (error) {
      res.status(500).send()
      req.log.warn({ err: error, res: res }, `error while handling ${req.method}-request on ${req.path}`)
    }
  }
}

exports.getWeatherStations = getWeatherStations
exports.getWeatherCosmoD2 = getWeatherCosmoD2
exports.getWeatherMosmix = getWeatherMosmix
exports.getWeatherReport = getWeatherReport
