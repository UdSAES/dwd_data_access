// SPDX-FileCopyrightText: 2020 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

'use strict'

const _ = require('lodash')
const { convertUnit } = require('../lib/unit_conversion.js')

// Functions that both used for getMeasuredValues and getForecastAtStation

function convertUnits (voiConfigs, timeseriesDataCollection) {
  // For each variable of interest, return the timeseries with converted values
  const data = {}
  _.forEach(voiConfigs, (voiConfig) => {
    const keyBeob = voiConfig.report.key
    const keyTarget = voiConfig.target.key
    data[keyTarget] = _.map(timeseriesDataCollection[keyBeob], (item) => {
      return {
        timestamp: item.timestamp,
        value: convertUnit(item.value, voiConfig.report.unit, voiConfig.target.unit)
      }
    })
  })

  return data
}

function getFormattedCosmoTimeseries (timeseriesDataArray) {
  const result = {}
  _.forEach(timeseriesDataArray, function (timeseriesDataItem) {
    const label = timeseriesDataItem.label
    const data = timeseriesDataItem.data
    result[label] = data
  })
  return result
}

function convertUnitsForMosmix (voiConfigs, timeseriesDataCollection, parameter) {
  // For each variable of interest, return the timeseries with converted values
  const data = {}
  _.forEach(voiConfigs, (voiConfig) => {
    const keyBeob = voiConfig[parameter].key
    const keyTarget = voiConfig.target.key
    _.forEach(timeseriesDataCollection, (timeseriesDataItem) => {
      data[keyTarget] = _.map(timeseriesDataItem[keyBeob], (item) => {
        return {
          timestamp: item.timestamp,
          value: convertUnit(
            item.value,
            voiConfig[parameter].unit,
            voiConfig.target.unit
          )
        }
      })
    })
  })

  return data
}

async function convertUnitsForCosmo (voiConfigs, timeseriesDataArray, parameter) {
  // For each variable of interest, return the timeseries with converted values
  const timeseriesDataCollection = getFormattedCosmoTimeseries(timeseriesDataArray)
  const data = {}
  _.forEach(voiConfigs, (voiConfig) => {
    const keyBeob = voiConfig.cosmo.options.key
    const keyTarget = voiConfig.target.key
    data[keyTarget] = _.map(timeseriesDataCollection[keyBeob], (item) => {
      return {
        timestamp: item.timestamp,
        value: convertUnit(
          item.value,
          voiConfig.cosmo.options.unit,
          voiConfig.target.unit
        )
      }
    })
  })

  return data
}

function getVoiConfigsAsArray (vois, voisConfigs) {
  const voiConfigs = []
  _.forEach(vois, function (voi) {
    const voiConfig = _.find(voisConfigs, (item) => {
      return item.target.key === voi
    })
    voiConfigs.push(voiConfig)
  })
  return voiConfigs
}



exports.getVoiConfigsAsArray = getVoiConfigsAsArray
exports.convertUnitsForMosmix = convertUnitsForMosmix
exports.convertUnitsForCosmo = convertUnitsForCosmo
exports.getVoiConfigsAsArray = getVoiConfigsAsArray
exports.convertUnits = convertUnits
