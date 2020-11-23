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

const cd2u = require('./cosmo-d2_utils')
const tsCsv = require('./timeseries_as_csv')
const tsJson = require('./timeseries_as_json')

const secInHour = 3600
const milliseconds = 1000
const hoursInDay = 24

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
  return [...new Set(result)]
}

async function readMosmixTimeseriesData (
  mosmixBasePath,
  voiConfigs,
  startTimestamp,
  endTimestamp,
  stationId,
  modelRun,
  stationCatalog
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
      functionToReadData: readMosmixTimeseriesData,
      MODEL_DATA_PATH: MOSMIX_DATA_BASE_PATH,
      unitsConverter: gu.convertUnitsForMosmix,
      jsonRenderer: tsJson.renderTimeseriesAsJSON,
      csvRenderer: tsCsv.renderTimeseriesAsCSV
    }
  } else if (model === 'cosmo-d2') {
    return {
      model: 'cosmo-d2',
      allowedModelRuns: ['00', '03', '06', '09', '12', '15', '18', '21'],
      functionToReadData: cd2u.readTimeseriesDataCosmoD2,
      MODEL_DATA_PATH: COSMO_DATA_BASE_PATH,
      unitsConverter: gu.convertUnitsForCosmo,
      jsonRenderer: tsJson.renderTimeseriesAsJSON,
      csvRenderer: tsCsv.renderTimeseriesAsCSV
    }
  } else {
    return {}
  }
}

exports.readMosmixTimeseriesData = readMosmixTimeseriesData
exports.dropTimeseriesDataNotOfInteresWithParameter = dropTimeseriesDataNotOfInteresWithParameter
exports.checkIfValidModelRun = checkIfValidModelRun
exports.getConfigFromModel = getConfigFromModel
