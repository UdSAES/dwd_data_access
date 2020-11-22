// SPDX-FileCopyrightText: 2020 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

'use strict'

const _ = require('lodash')

// Construct header
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

// Construct exactly one row of comma-separated data
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

// Recursively go through all variables and assemble columns
function getStringsFromStationDataPayload (timeseriesDataArray) {
  // timeseriesDataArray is an array of arrays with timeseries for each VOI.
  function helper (timeseries, result) {
    /* Iterate columnwise
    FROM:
    [[voi1_timeseries_el1, voi1_timeseries_el2],
     [voi2_timeseries_el1, voi2_timeseries_el2],
     [voi3_timeseries_el1, voi3_timeseries_el2]]

    TO:
    [[voi1_timeseries_el1, voi2_timeseries_el1, ... voiN...],
     [voi1_timeseries_el2, voi2_timeseries_el2m, ... voiN]]

     And construct rows via `getValuesAsCSVString()`
    */

    // Termination of loop condition
    if (_.isEmpty(getHeadElementsFromTimeseries(timeseries)[0])) {
      return result
    }

    const stringWithValues = getHeadElementsFromTimeseries(timeseries)
    result.push(getValuesAsCSVString(stringWithValues))
    return helper(getTailElementsFromTimeseries(timeseries), result)
  }

  // Recursion!
  return helper(timeseriesDataArray, [])
}

// Join header and columns
function renderTimeseriesAsCSV (voiConfigs, timeseriesDataArray) {
  const csvLabels = getCSVLabels(voiConfigs, timeseriesDataArray)
  const csvStrings = getStringsFromStationDataPayload(timeseriesDataArray)
  return csvLabels + csvStrings.join('\n')
}

// Export functions
exports.renderTimeseriesAsCSV = renderTimeseriesAsCSV

// Export functions for testing
exports.getHeadElementsFromTimeseries = getHeadElementsFromTimeseries
exports.getTailElementsFromTimeseries = getTailElementsFromTimeseries
exports.getValuesAsCSVString = getValuesAsCSVString
