// SPDX-FileCopyrightText: 2020 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

'use strict'

const _ = require('lodash')

const bmu = require('./beob_mosmix_utils.js')
const cd2u = require('./cosmo-d2_utils')
const tsCsv = require('./timeseries_as_csv')
const tsJson = require('./timeseries_as_json')
const fu = require('./forecast_utils.js')

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
      jsonRenderer: tsJson.renderMosmixTimeseriesAsJSON,
      csvRenderer: tsCsv.renderTimeseriesAsCSVMosmix,
      timeseriesShortener: fu.shortenTimeSeriesToPeriodMosmix
    }
  } else if (model === 'cosmo-d2') {
    return {
      model: 'cosmo-d2',
      allowedModelRuns: ['00', '03', '06', '09', '12', '15', '18', '21'],
      functionToReadData: cd2u.readTimeseriesDataCosmoD2,
      MODEL_DATA_PATH: COSMO_DATA_BASE_PATH,
      jsonRenderer: tsJson.renderCosmoTimeseriesAsJSON,
      csvRenderer: tsCsv.renderTimeseriesAsCSVCosmo,
      timeseriesShortener: fu.shortenTimeSeriesToPeriodCosmo
    }
  } else {
    return {}
  }
}

function shortenTimeSeriesToPeriodMosmix (data, from, to) {
  if (_.isEmpty(data)) {
    return []
  }
  const timeseries = data[0]
  const keys = Object.keys(timeseries)
  const values = Object.values(timeseries)
  const result = {}
  for (let i = 0; i < values.length; i += 1) {
    const val = values[i].filter((el) => el.timestamp >= from && el.timestamp <= to)
    const key = keys[i]
    result[key] = val
  }
  return result
}

function shortenTimeSeriesToPeriodCosmo (timeseries, from, to) {
  const result = []
  for (let i = 0; i < timeseries.length; i += 1) {
    const label = timeseries[i].label
    const unit = timeseries[i].unit
    const location = timeseries[i].location
    const data = timeseries[i].data.filter(
      (el) => el.timestamp >= from && el.timestamp <= to
    )
    result.push({ label: label, unit: unit, data: data, location: location })
  }
  return result
}

exports.isValidModelRun = isValidModelRun
exports.getConfigFromModel = getConfigFromModel
exports.shortenTimeSeriesToPeriodMosmix = shortenTimeSeriesToPeriodMosmix
exports.shortenTimeSeriesToPeriodCosmo = shortenTimeSeriesToPeriodCosmo
