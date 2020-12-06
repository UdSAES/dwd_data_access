// SPDX-FileCopyrightText: 2020 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

'use strict'

const path = require('path')
const moment = require('moment')

const csv = require('dwd-csv-helper')
const log = require('./logger')

const secInHour = 3600
const milliseconds = 1000
const hoursInDay = 24

function deriveFilePath (csvBasePath, type, timestamp, stationId, modelRun) {
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
  const result = []
  let timestamp = startTimestamp - secInHour * milliseconds
  while (timestamp <= endTimestamp) {
    // Timestamp is increased by 24 hours in iteration
    // Model-run is explicitly += to the dayDateTimeString
    const filePath = deriveFilePath(
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

exports.readMosmixTimeseriesData = readMosmixTimeseriesData
