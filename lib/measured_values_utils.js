// SPDX-FileCopyrightText: 2020 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

'use strict'

const _ = require('lodash')
const gu = require('../lib/general_utils.js')


// General functions ---------------------------------------------------------------- //

function dropTimeseriesDataNotOfInterest (voiConfigs, timeseriesDataCollection) {
  const keys = _.map(voiConfigs, function (o) {
    return o.report.key
  })

  return _.pick(timeseriesDataCollection, keys)
}

function dropNaN (timeseriesDataCollection) {
  // Find timestamps for which at least one value is null and attempt to
  // find a timestamp for which the value is not null
  const timestampsToRemove = []
  _.forOwn(timeseriesDataCollection, function (timeseriesData, key) {
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

    _.remove(timeseriesData, (item) => {
      return _.includes(timestampsToRemove, item.timestamp) && _.isNil(item.value)
    })
  })

  return timeseriesDataCollection
}

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

// Export functions
exports.dropTimeseriesDataNotOfInterest = dropTimeseriesDataNotOfInterest
exports.dropNaN = dropNaN
exports.convertUnits = convertUnits
