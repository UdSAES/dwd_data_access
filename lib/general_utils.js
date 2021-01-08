// SPDX-FileCopyrightText: 2020 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

'use strict'

const _ = require('lodash')

// Functions that are both used for `getMeasuredValues()` and `getForecastAtStation()`

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

function shortenTimeseriesToPeriod (timeseriesDataCollection, from, to) {
  _.forEach(timeseriesDataCollection, (timeseriesObj) => {
    timeseriesObj.timeseries = _.filter(timeseriesObj.timeseries, (el) => {
      return el.timestamp >= from && el.timestamp <= to
    })
  })

  return timeseriesDataCollection
}

exports.getVoiConfigsAsArray = getVoiConfigsAsArray
exports.shortenTimeseriesToPeriod = shortenTimeseriesToPeriod
