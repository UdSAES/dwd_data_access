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

function getStationIdFromUrlPath (path) {
  const splitUrl = path.split('/')
  const sid = splitUrl[2]
  return sid
}

function getVoisNamesFromQuery (query) {
  const voi = query.quantities
  const defaultParameter = ['t_2m']
  let vois = defaultParameter
  if (voi) {
    vois = voi.split(',')
  }
  return vois
}

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

exports.getVoiConfigsAsArray = getVoiConfigsAsArray
exports.getStationIdFromUrlPath = getStationIdFromUrlPath
exports.getVoisNamesFromQuery = getVoisNamesFromQuery
exports.getCSVLabels = getCSVLabels
exports.getHeadElementsFromTimeseries = getHeadElementsFromTimeseries
exports.getValuesAsCSVString = getValuesAsCSVString
exports.getStringsFromStationDataPayload = getStringsFromStationDataPayload
exports.checkValidityOfQuantityIds = checkValidityOfQuantityIds
exports.convertUnitsForMosmix = convertUnitsForMosmix
exports.convertUnitsForCosmo = convertUnitsForCosmo
exports.getVoiConfigsAsArray = getVoiConfigsAsArray
exports.convertUnits = convertUnits
