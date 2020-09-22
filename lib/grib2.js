// SPDX-FileCopyrightText: 2018 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

'use strict'

const fs = require('fs-extra')
const tmp = require('tmp-promise')
const path = require('path')
const exec = require('child-process-promise').exec
const _ = require('lodash')
const { VError } = require('verror')
const moment = require('moment')
const Parallel = require('async-parallel')
const grib2 = require('grib2-simple')
const processenv = require('processenv')
var bunyan = require('bunyan')

// Instantiate logger
const LOG_LEVEL = String(processenv('LOG_LEVEL') || 'info')
var log = bunyan.createLogger({
  name: 'lib_grib2',
  serializers: bunyan.stdSerializers,
  level: LOG_LEVEL
})
log.info(
  'loaded module used by poi_forecast_engine for dealing with grib2-files'
)

function getGribDirectoryPath (startUnixEpoch, voi) {
  const startMoment = moment.unix(startUnixEpoch)
  var startHour = '' + Math.floor(startMoment.hour() / 3) * 3

  var month = '' + (startMoment.month() + 1)
  if (month.length < 2) {
    month = '0' + month
  }

  var day = '' + startMoment.date()
  if (day.length < 2) {
    day = '0' + day
  }

  if (startHour.length < 2) {
    startHour = '0' + startHour
  }

  var pathElements = ['' + startMoment.year() + month + day + startHour, voi]

  var resultPath = '.'

  for (var i = 0; i < pathElements.length; i++) {
    resultPath = path.join(resultPath, pathElements[i])
  }

  return resultPath
}

async function readValueFromGribFile (pathToGribFile, position) {
  const fileContentBuffer = await fs.readFile(pathToGribFile, {
    encoding: null
  })
  const grib2Array = await grib2(fileContentBuffer)

  const result = []

  _.forEach(grib2Array, grib2Object => {
    const value = grib2Object.getValue(position.lon, position.lat)
    result.push({
      referenceTimestamp: grib2Object.referenceTimestamp,
      forecastTimestamp: grib2Object.forecastTimestamp,
      value: value,
      lon: position.lon,
      lat: position.lat
    })
  })
  return result
}

async function readValuesFromGrib2BzFile (pathToFile, position) {
  const tmpDir = await tmp.dir()

  if (process.platform === 'win32') {
    await exec(
      path.join('bin', '7z.exe') + ' -o' + tmpDir.path + ' e ' + pathToFile,
      { maxBuffer: 10 * 1024 * 1024 }
    )
  } else {
    try {
      await exec(
        'lz4 -d ' +
          pathToFile +
          ' ' +
          path.join(tmpDir.path, 'dummy_file_name.grib2')
      )
    } catch (error) {
      log.error(error, 'error while decompressing ' + pathToFile) // FIXME a bunch of errors are thrown here
      throw error
    }
  }

  var resultOfReadDir = await fs.readdir(tmpDir.path)
  const filePath = path.join(tmpDir.path, resultOfReadDir[0])

  const result = await readValueFromGribFile(filePath, position)

  await fs.unlink(filePath)
  await tmpDir.cleanup()

  return result
}

async function readTimeSeriesFromGribFiles (
  startUnixEpoch,
  position,
  voi,
  gribBasePath
) {
  var gribDirectoryPath = path.join(
    gribBasePath,
    getGribDirectoryPath(startUnixEpoch, voi)
  )

  try {
    var fileNames = await fs.readdir(gribDirectoryPath)
    fileNames = _.sortBy(fileNames)
  } catch (error) {
    throw new VError({
      name: 'NO_DATA_AVAILABLE',
      cause: error
    })
  }
  _.remove(fileNames, fileName => {
    // we only want to handle lz4 files and grib files with regular latitude longitude grid
    return (
      path.extname(fileName) !== '.lz4' ||
      fileName.indexOf('regular-lat-lon') < 0
    )
  })

  const tmpResults = await Parallel.map(
    fileNames,
    async function (fileName) {
      const filePath = path.join(gribDirectoryPath, fileName)

      try {
        var data = await readValuesFromGrib2BzFile(filePath, position)
      } catch (error) {
        // console.log('error')
        // console.log(error)
        return null
      }
      return data
    },
    4
  )

  const results = []
  _.forEach(tmpResults, tmpResult => {
    _.forEach(tmpResult, item => {
      results.push(item)
    })
  })

  _.sortBy(results, item => {
    return item.forcastTimestamp
  })

  return results
}

exports.readValuesFromGrib2BzFile = readValuesFromGrib2BzFile
exports.readTimeSeriesFromGribFiles = readTimeSeriesFromGribFiles
