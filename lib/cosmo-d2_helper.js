// dwd-grib-helper
//
// Copyright 2018 The dwd-grib-helper Developers. See the LICENSE file at
// the top-level directory of this distribution and at
// https://github.com/UdSAES/dwd-grib-helper/LICENSE
//
// THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
// REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
// AND FITNESS.IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
// INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
// LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
// OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
// PERFORMANCE OF THIS SOFTWARE.
//
// dwd-grib-helper may be freely used and distributed under the ISC license

'use strict'

const grib2 = require('grib2-simple')
const _ = require('lodash')
const fs = require('fs-extra')
const moment = require('moment')
const path = require('path')
const parallel = require('async-parallel')
const exec = require('child-process-promise').exec
const tmp = require('tmp-promise')

function convertIntegerNumberToString(number, minLength) {
  let numberString = '' + number
  while (numberString.length < minLength) {
    numberString = '0' + numberString
  }

  return numberString
}

function deriveGrib2FilePath(referenceTimeStamp, forecastTimestamp, sourceKey) {
  const referenceDateTimeString = moment.utc(referenceTimeStamp).format('YYYYMMDDHH')
  const timeOffsetHours = Math.floor((forecastTimestamp - referenceTimeStamp) / 1000 / 3600)

  let fileName

  // here we need a switch to handel COMSO DE files and COSME D2 files, switch has taken place on 15th May 2018
  if (referenceTimestamp >= moment.utc('2018-05-15').valueOf()) {
    fileName = 'cosmo-d2_germany_regular-lat-lon_single-level_' + referenceDateTimeString + '_' + convertIntegerNumberToString(timeOffsetHours, 3) + '_' + _.toUpper(sourceKey) + '.grib2.lz4'
  } else {
    fileName = 'COSMODE_single_level_elements_' + _.toUpper(sourceKey) + '_' + referenceDateTimeString + '_' + convertIntegerNumberToString(timeOffsetHours, 3) + '.grib2.lz4'
  }

  return fileName
}

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
  const result = await exec(execCommand)
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
