const _ = require('lodash')

// General functions

function ensureVoiConfigsCorrectness (voiConfigs) {
  const trueVoisArray = []
  _.forEach(voiConfigs, function (voiConfig) {
    if (_.isNil(_.get(voiConfig, ['report', 'key']))) {
      trueVoisArray.push(false)
    } else {
      trueVoisArray.push(true)
    }
  })
  return trueVoisArray
}

function getTimeSeriesData (voiConfigs, timeseriesDataCollection) {
  const timeSeriesData = []
  voiConfigs.forEach(function (voiConfig) {
    timeSeriesData.push(timeseriesDataCollection[voiConfig.report.key])
  })
  return timeSeriesData
}

function formatTimeseriesDataArray (timeseriesDataArray) {
  const timestampsToRemove = []
  _.forEach(timeseriesDataArray, function (timeseriesData) {
    _.forEach(timeseriesData, (item) => {
      if (!_.isNil(item.value)) {
        return
      }

      const betterItem = _.find(timeseriesData, (item2) => {
        return item2.timestamp === item.timestamp && !_.isNil(item2.value)
      })

      if (!_.isNil(betterItem)) {
        timestampsToRemove.push(item.timestamp)
      }
    })
  })

  _.forEach(timeseriesDataArray, function (timeseriesData) {
    _.remove(timeseriesData, (item) => {
      return _.includes(timestampsToRemove, item.timestamp) && _.isNil(item.value)
    })
  })
  return timeseriesDataArray
}

// JSON

function renderMeasuredValuesAsJSON (voiConfigs, timeseriesDataArray, vois, sid) {
  const result = {
    description: `Quantities ${vois} measured at station ${sid}`,
    data: []
  }
  for (let i = 0; i < voiConfigs.length; i += 1) {
    const voiConfig = voiConfigs[i]
    const dataElement = {
      label: voiConfig.target.key,
      unit: voiConfig.target.unit,
      timeseries: timeseriesDataArray[i]
    }
    result.data.push(dataElement)
  }

  return result
}

// CSV

function getCSVLabels (voiConfigs) {
  let csvLabels = 'timestamp / ms,'
  _.forEach(voiConfigs, function (voiConfig) {
    const key = voiConfig.target.key
    const unit = voiConfig.target.unit
    csvLabels += `${key} / ${unit},`
  })
  csvLabels += '\n'
  return csvLabels
}

function getFirstElementsFromTimeseries (timeseriesDataArray) {
  const result = []
  _.forEach(timeseriesDataArray, function (item) {
    result.push(_.first(item))
  })
  return result
}

function getLastElementsFromTimeseries (timeseriesDataArray) {
  // returns from each array in timeseriesDataArray first element.
  const result = []
  _.forEach(timeseriesDataArray, function (item) {
    result.push(_.tail(item))
  })
  return result
}

function getValuesAsCSVString (timeStampsAndValues) {
  // Accepts the results from getFirstElementsFromTimeseries
  // timeStampsAndValues [{timestamp: 1, value: 2}, {...}]
  // item {timestamp: 1, value:2}
  const timestampValue = timeStampsAndValues[0].timestamp
  let result = `${timestampValue},`
  _.forEach(timeStampsAndValues, function (item) {
    result += `${item.value},`
  })
  return result
}

function getStringsFromStationDataPayload (timeseriesDataArray) {
  function helper (timeseries, result) {
    if (_.isEmpty(getFirstElementsFromTimeseries(timeseries)[0])) {
      return result
    }
    const stringWithValues = getFirstElementsFromTimeseries(timeseries)
    result.push(getValuesAsCSVString(stringWithValues))
    return helper(getLastElementsFromTimeseries(timeseries), result)
  }
  return helper(timeseriesDataArray, [])
}

function renderMeasuredValuesAsCSV (voiConfigs, timeseriesDataArray) {
  const csvLabels = getCSVLabels(voiConfigs, timeseriesDataArray)
  const csvStrings = getStringsFromStationDataPayload(timeseriesDataArray)
  return csvLabels + csvStrings.join('\n')
}

exports.ensureVoiConfigsCorrectness = ensureVoiConfigsCorrectness
exports.renderMeasuredValuesAsCSV = renderMeasuredValuesAsCSV
exports.renderMeasuredValuesAsJSON = renderMeasuredValuesAsJSON
exports.getTimeSeriesData = getTimeSeriesData
exports.formatTimeseriesDataArray = formatTimeseriesDataArray


//Export functions for testing
exports.getFirstElementsFromTimeseries = getFirstElementsFromTimeseries
exports.getLastElementsFromTimeseries = getLastElementsFromTimeseries
