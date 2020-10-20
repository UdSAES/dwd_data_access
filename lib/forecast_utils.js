// SPDX-FileCopyrightText: 2020 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

'use strict'

const csv = require('dwd-csv-helper')
const moment = require('moment')
const path = require('path')
const _ = require('lodash')
const gu = require('../lib/general_utils.js')
const bunyan = require('bunyan')
const log = bunyan.createLogger({
  name: 'dwd-csv-handler',
  serializers: bunyan.stdSerializers
})

const secInHour = 3600
const milliseconds = 1000
const hoursInDay = 24

const cosmoD2AvailableFrom = moment.utc('2018051509', 'YYYYMMDDHH')

function getGribDirectory (referenceTimestamp, WEATHER_DATA_BASE_PATH) {
  let gribBaseDirectory = null
  if (moment.utc(referenceTimestamp).isBefore(cosmoD2AvailableFrom)) {
    gribBaseDirectory = path.join(
      WEATHER_DATA_BASE_PATH,
      'weather',
      'cosmo',
      'de',
      'grib'
    )
  } else {
    gribBaseDirectory = path.join(WEATHER_DATA_BASE_PATH, 'weather', 'cosmo-d2', 'grib')
  }
  return gribBaseDirectory
}

function createDescriptionString (
  vois,
  stationId,
  modelRun,
  model,
  startTimestamp,
  endTimestamp
) {
  const showStartTimestamp = moment(startTimestamp).format('YYYY-MM-DDTHH:MM')
  const showEndTimestamp = moment(endTimestamp).format('YYYY-MM-DDTHH:MM')
  return `Forecast for quantities ${vois.join(
    ', '
  )} at station ${stationId} based on the ${modelRun} o'clock run of the ${model.toUpperCase()} model from ${showStartTimestamp} to ${showEndTimestamp}`
}

function renderMeasuredValuesAsJSON (
  vois,
  stationId,
  modelRun,
  model,
  startTimestamp,
  endTimestamp,
  voiConfigs,
  timeseriesDataArray
) {
  const descriptionString = createDescriptionString(
    vois,
    stationId,
    modelRun,
    model,
    startTimestamp,
    endTimestamp
  )
  const result = {
    description: descriptionString,
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

function deriveCsvFilePath (csvBasePath, type, timestamp, stationId, modelRun) {
  // No test for this function
  let formatString
  let contentType
  let extension
  let subdir

  if (type === 'REPORT') {
    formatString = 'YYYYMMDD'
    contentType = 'BEOB'
    extension = '.csv'
    subdir = 'poi'
  } else if (type === 'MOSMIX_KMZ') {
    formatString = 'YYYYMMDDHH'
    contentType = 'MOSMIX'
    extension = '.kmz'
    subdir = 'mos'
  } else {
    formatString = 'YYYYMMDDHH'
    contentType = 'MOSMIX'
    extension = '.csv'
    subdir = 'poi'
  }

  const dayDateTimeString =
    moment
      .utc(timestamp)
      .format(formatString)
      .slice(0, -2) + modelRun
  const fileName = stationId + '-' + contentType + extension

  return path.join(csvBasePath, subdir, dayDateTimeString, fileName)
}

async function getMosmixDataDirectories (
  mosmixBasePath,
  startTimestamp,
  endTimestamp,
  stationId,
  modelRun
) {
  // No test for this function
  const result = []
  let timestamp = startTimestamp - secInHour * milliseconds
  while (timestamp <= endTimestamp) {
    // Timestamp is increased by 24 hours in iteration
    // Model-run is explicitly += to the dayDateTimeString
    const filePath = deriveCsvFilePath(
      mosmixBasePath,
      'MOSMIX_KMZ',
      timestamp,
      stationId,
      modelRun
    )
    result.push(filePath)
    timestamp += hoursInDay * secInHour * milliseconds
  }
  return result
}

async function readMosmixTimeseriesData (
  mosmixBasePath,
  startTimestamp,
  endTimestamp,
  stationId,
  modelRun
) {
  // No test for this function
  const resultArray = []
  const mosmixFiles = await getMosmixDataDirectories(
    mosmixBasePath,
    startTimestamp,
    endTimestamp,
    stationId,
    modelRun
  )
  for (let i = 0; i < mosmixFiles.length; i += 1) {
    const filePath = mosmixFiles[i]
    try {
      const fileContent = await csv.extractKmlFile(filePath)
      const result = await csv.parseKmlFile(fileContent)
      resultArray.push(result)
    } catch (error) {
      log.warn(error, `failed to extract the .kml-file from ${filePath}`)
    }
  }
  return resultArray
}

function renderMeasuredValuesAsCSV (voiConfigs, timeseriesDataArray) {
  return gu.renderMeasuredValuesAsCSV(voiConfigs, timeseriesDataArray)
}

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

function readDataCosmoD2 (
  cosmoBasePath,
  startTimestamp,
  endTimestamp,
  stationId,
  modelRun
) {
  return [cosmoBasePath, startTimestamp, endTimestamp, stationId, modelRun]
}

function getConfigFromModel (model, COSMO_DATA_BASE_PATH, MOSMIX_DATA_BASE_PATH) {
  if (model === 'mosmix') {
    return {
      model: 'mosmix',
      allowedModelRuns: ['03', '09', '15', '21'],
      functionToReadData: readMosmixTimeseriesData,
      MODEL_DATA_PATH: MOSMIX_DATA_BASE_PATH
    }
  } else if (model === 'cosmo-d2') {
    return {
      model: 'cosmo-d2',
      allowedModelRuns: ['00', '03', '06', '09', '12', '15', '18', '21'],
      functionToReadData: readDataCosmoD2,
      MODEL_DATA_PATH: COSMO_DATA_BASE_PATH
    }
  } else {
    return {}
  }
}

exports.getGribDirectory = getGribDirectory
exports.renderMeasuredValuesAsJSON = renderMeasuredValuesAsJSON
exports.readMosmixTimeseriesData = readMosmixTimeseriesData
exports.renderMeasuredValuesAsCSV = renderMeasuredValuesAsCSV
exports.dropTimeseriesDataNotOfInteresWithParameter = dropTimeseriesDataNotOfInteresWithParameter
exports.renderMeasuredValuesAsCSV = renderMeasuredValuesAsCSV
exports.checkIfValidModelRun = checkIfValidModelRun
exports.getConfigFromModel = getConfigFromModel
