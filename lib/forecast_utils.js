// SPDX-FileCopyrightText: 2020 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

'use strict'

const _ = require('lodash')

const bmu = require('./beob_mosmix_utils.js')
const cd2u = require('./cosmo-d2_utils')
const tsCsv = require('./timeseries_as_csv')
const tsJson = require('./timeseries_as_json')

function isValidModelRun (allowed, modelRun) {
  return allowed.includes(modelRun)
}

function getConfigFromModel (model, COSMO_DATA_BASE_PATH, MOSMIX_DATA_BASE_PATH) {
  if (model === 'mosmix') {
    return {
      model: 'mosmix',
      allowedModelRuns: ['03', '09', '15', '21'],
      functionToReadData: bmu.readMosmixTimeseriesData,
      MODEL_DATA_PATH: MOSMIX_DATA_BASE_PATH,
      jsonRenderer: tsJson.renderTimeseriesAsJSON,
      csvRenderer: tsCsv.renderTimeseriesAsCSVMosmix,
      timeseriesShortener: shortenTimeSeriesToPeriod
    }
  } else if (model === 'cosmo-d2') {
    return {
      model: 'cosmo-d2',
      allowedModelRuns: ['00', '03', '06', '09', '12', '15', '18', '21'],
      functionToReadData: cd2u.readTimeseriesDataCosmoD2,
      MODEL_DATA_PATH: COSMO_DATA_BASE_PATH,
      jsonRenderer: tsJson.renderTimeseriesAsJSON,
      csvRenderer: tsCsv.renderTimeseriesAsCSVCosmo,
      timeseriesShortener: shortenTimeSeriesToPeriod
    }
  } else {
    return {}
  }
}

function shortenTimeSeriesToPeriod (timeseriesDataCollection, from, to) {
  _.forEach(timeseriesDataCollection, (timeseriesObj) => {
    timeseriesObj.timeseries = _.filter(timeseriesObj.timeseries, (el) => {
      return el.timestamp >= from && el.timestamp <= to
    })
  })

  return timeseriesDataCollection
}

exports.isValidModelRun = isValidModelRun
exports.getConfigFromModel = getConfigFromModel
exports.shortenTimeSeriesToPeriod = shortenTimeSeriesToPeriod
