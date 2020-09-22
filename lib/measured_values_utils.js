// SPDX-FileCopyrightText: 2020 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

'use strict'

const _ = require('lodash')
const {
  convertUnit
} = require('../lib/unit_conversion.js')

// General functions ---------------------------------------------------------------- //

function checkValidityOfQuantityIds (voiConfigs) {
  const voiExists = []
  _.forEach(voiConfigs, function (voiConfig) {
    if (_.isNil(_.get(voiConfig, ['report', 'key']))) {
      voiExists.push(false)
    } else {
      voiExists.push(true)
    }
  })
  return voiExists
}

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

// Functions for building JSON-representation --------------------------------------- //

function renderMeasuredValuesAsJSON (voiConfigs, timeseriesDataArray, vois, sid) {
  const result = {
    description: `Quantities ${vois} measured at station ${sid}`,
    data: []
  }

  _.forEach(voiConfigs, (voiConfig) => {
    result.data.push({
      label: voiConfig.target.key,
      unit: voiConfig.target.unit,
      timeseries: timeseriesDataArray[voiConfig.target.key]
    })
  })

  return result
}

// Functions for building CSV-representation ---------------------------------------- //

function getCSVLabels (voiConfigs) {
  let csvLabels = 'timestamp / ms,'
  _.forEach(voiConfigs, function (voiConfig) {
    const key = voiConfig.target.key
    const unit = voiConfig.target.unit
    csvLabels += `${key} / ${unit},`
  })
  csvLabels = _.trimEnd(csvLabels, ',') // trailing comma would indicate another column
  csvLabels += '\n'
  return csvLabels
}

function getHeadElementsFromTimeseries (timeseriesDataArray) {
  // returns from each array in timeseriesDataArray first element.
  const result = []
  _.forEach(timeseriesDataArray, function (item) {
    result.push(_.first(item))
  })
  return result
}

function getTailElementsFromTimeseries (timeseriesDataArray) {
  const result = []
  _.forEach(timeseriesDataArray, function (item) {
    result.push(_.tail(item))
  })
  return result
}

function getValuesAsCSVString (timeStampsAndValues) {
  // Accepts the results from getHeadElementsFromTimeseries
  // timeStampsAndValues [{timestamp: 1, value: 1}, {...}]
  // item {timestamp: 1, value:1}
  // returns csv: timestamp,value1,value2
  const timestampValue = timeStampsAndValues[0].timestamp
  let result = `${timestampValue}`
  _.forEach(timeStampsAndValues, function (item) {
    result += `,${item.value}`
  })
  return result
}

function getStringsFromStationDataPayload (timeseriesDataArray) {
  // TimeseriesDataArray is an array of arrays with timeseries for each voi.
  function helper (timeseries, result) {
    /* Iterate columnwise
    FROM:
    [[voi1_timeseries_el1, voi1_timeseries_el2],
     [voi2_timeseries_el1, voi2_timeseries_el2],
     [voi3_timeseries_el1, voi3_timeseries_el2]]

    TO:
    [[voi1_timeseries_el1, voi2_timeseries_el1, ... voiN...],
     [voi1_timeseries_el2, voi2_timeseries_el2m, ... voiN]]

     And extract values from each elements via getValuesAsCSVString
    */

    // Termination of loop condition
    if (_.isEmpty(getHeadElementsFromTimeseries(timeseries)[0])) {
      return result
    }

    const stringWithValues = getHeadElementsFromTimeseries(timeseries)
    result.push(getValuesAsCSVString(stringWithValues))
    return helper(getTailElementsFromTimeseries(timeseries), result)
  }
  return helper(timeseriesDataArray, [])
}

function renderMeasuredValuesAsCSV (voiConfigs, timeseriesDataArray) {
  const csvLabels = getCSVLabels(voiConfigs, timeseriesDataArray)
  const csvStrings = getStringsFromStationDataPayload(timeseriesDataArray)
  return csvLabels + csvStrings.join('\n')
}

// Export functions
exports.checkValidityOfQuantityIds = checkValidityOfQuantityIds
exports.renderMeasuredValuesAsCSV = renderMeasuredValuesAsCSV
exports.renderMeasuredValuesAsJSON = renderMeasuredValuesAsJSON
exports.dropTimeseriesDataNotOfInterest = dropTimeseriesDataNotOfInterest
exports.dropNaN = dropNaN
exports.convertUnits = convertUnits

// Export functions for testing
exports.getHeadElementsFromTimeseries = getHeadElementsFromTimeseries
exports.getTailElementsFromTimeseries = getTailElementsFromTimeseries
exports.getValuesAsCSVString = getValuesAsCSVString