// SPDX-FileCopyrightText: 2020 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

'use strict'

const _ = require('lodash')
const { convertUnit } = require('./unit_conversion.js')

// Functions that are both used for `getMeasuredValues()` and `getForecastAtStation()`

// For each variable of interest, return the timeseries with converted values
function convertUnits (voiConfigs, timeseriesDataCollection, type) {
  const data = {}
  if (!_.isEmpty(timeseriesDataCollection)) {
    _.forEach(voiConfigs, (voiConfig) => {
      // TODO there are VOIs for which no MOSMIX-forecasts are available, e.g. aswdir_s
      const sourceKey = voiConfig[type].key // `type` is either `report` or `mosmix`
      const targetKey = voiConfig.target.key
      data[targetKey] = _.map(timeseriesDataCollection[sourceKey], (el) => {
        return {
          timestamp: el.timestamp,
          value: convertUnit(el.value, voiConfig[type].unit, voiConfig.target.unit)
        }
      })
    })
  }
  return data
}

// Discard VOI-config-objects for all but the specified quantities
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

exports.convertUnits = convertUnits
exports.getVoiConfigsAsArray = getVoiConfigsAsArray
