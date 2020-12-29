// SPDX-FileCopyrightText: 2018 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

'use strict'

const grib2 = require('grib2-simple')
const _ = require('lodash')
const fs = require('fs-extra')
const moment = require('moment')
const path = require('path')
const parallel = require('async-parallel')
const exec = require('child-process-promise').exec
const tmp = require('tmp-promise')

// Derive path of directory containing .grib2-files for specific model run/VOI
function deriveGrib2DirectoryPath (gribBasePath, referenceTimestamp, sourceKey) {
  const referenceDateTimeString = moment.utc(referenceTimestamp).format('YYYYMMDDHH')
  path.join(gribBasePath, referenceDateTimeString, _.toLower(sourceKey))
  return path.join(gribBasePath, referenceDateTimeString, _.toLower(sourceKey))
}

// Extract, read and parse exactly one .grib2.lz4-file
async function readAndParseGrib2File (filePath) {
  const tmpFile = await tmp.file()

  const execCommand = 'lz4 -d -f ' + filePath + ' ' + tmpFile.path
  const _ = await exec(execCommand)
  const fileContentBuffer = await fs.readFile(tmpFile.path, {
    encoding: null
  })

  tmpFile.cleanup()
  const grib2Array = grib2(fileContentBuffer)
  return grib2Array
}

// Read and parse entire directory of .grib2-files to construct timeseries
async function extractTimeseriesDataFromGrib2Directory (directoryPath, coordinates) {
  const fileNames = await fs.readdir(directoryPath)
  let filteredFileNames = _.filter(fileNames, (item) => {
    return item.indexOf('regular-lat-lon') >= 0 || item.indexOf('COSMODE') === 0
  })

  filteredFileNames = _.sortBy(filteredFileNames)
  let timeseriesData = []
  let gridLocation
  await parallel.each(
    filteredFileNames,
    async (fileName) => {
      const filePath = path.join(directoryPath, fileName)
      const grib2Array = await readAndParseGrib2File(filePath)

      _.forEach(grib2Array, (grib2Item) => {
        const value = grib2Item.getValue(coordinates.lon, coordinates.lat)
        gridLocation = grib2Item.getGridLocation(coordinates.lon, coordinates.lat)
        const timestamp = grib2Item.forecastTimestamp
        timeseriesData.push({
          timestamp,
          value
        })
      })
    },
    10
  )

  timeseriesData = _.sortBy(timeseriesData, (item) => {
    return item.timestamp
  })

  const result = {
    location: gridLocation,
    timeseriesData
  }
  return result
}

exports.deriveGrib2DirectoryPath = deriveGrib2DirectoryPath
exports.extractTimeseriesDataFromGrib2Directory = extractTimeseriesDataFromGrib2Directory
