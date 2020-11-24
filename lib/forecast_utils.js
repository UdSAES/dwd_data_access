// SPDX-FileCopyrightText: 2020 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

'use strict'

const _ = require('lodash')
const gu = require('./general_utils.js')
const bmu = require('./beob_mosmix_utils.js')
const cd2u = require('./cosmo-d2_utils')
const tsCsv = require('./timeseries_as_csv')
const tsJson = require('./timeseries_as_json')


function dropTimeseriesDataNotOfInteresWithParameter (
  voiConfigs,
  timeseriesDataCollection,
  parameter
) {
  const result = []
  const keys = _.map(voiConfigs, function (o) {
    return o[parameter].key
  })
  _.forEach(timeseriesDataCollection, (timeseriesDataItem) => {
    result.push(_.pick(timeseriesDataItem, keys))
  })
  return result
}

function checkIfValidModelRun (allowed, modelRun) {
  return allowed.includes(modelRun)
}

function getConfigFromModel (model, COSMO_DATA_BASE_PATH, MOSMIX_DATA_BASE_PATH) {
  if (model === 'mosmix') {
    return {
      model: 'mosmix',
      allowedModelRuns: ['03', '09', '15', '21'],
      functionToReadData: bmu.readMosmixTimeseriesData,
      MODEL_DATA_PATH: MOSMIX_DATA_BASE_PATH,
      unitsConverter: gu.convertUnits,
      jsonRenderer: tsJson.renderTimeseriesAsJSON,
      csvRenderer: tsCsv.renderTimeseriesAsCSV
    }
  } else if (model === 'cosmo-d2') {
    return {
      model: 'cosmo-d2',
      allowedModelRuns: ['00', '03', '06', '09', '12', '15', '18', '21'],
      functionToReadData: cd2u.readTimeseriesDataCosmoD2,
      MODEL_DATA_PATH: COSMO_DATA_BASE_PATH,
      unitsConverter: (v, t, p) => {
        return t
      },
      jsonRenderer: tsJson.renderTimeseriesAsJSON,
      csvRenderer: tsCsv.renderTimeseriesAsCSV
    }
  } else {
    return {}
  }
}

exports.dropTimeseriesDataNotOfInteresWithParameter = dropTimeseriesDataNotOfInteresWithParameter
exports.checkIfValidModelRun = checkIfValidModelRun
exports.getConfigFromModel = getConfigFromModel
