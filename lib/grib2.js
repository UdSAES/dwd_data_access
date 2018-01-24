'use strict'

const fs = require('fs-extra')
const decompress = require('decompress')
const decompressBzip2 = require('decompress-bzip2')
const tmp = require('tmp-promise')
const grib2json = require('weacast-grib2json')
const path = require('path')
const exec = require('child-process-promise').exec
const _ = require('lodash')
const {VError} = require('verror')
const moment = require('moment')
const Parallel = require('async-parallel')

function getGribDirectoryPath(startUnixEpoch, voi) {
  const startMoment = moment.unix(startUnixEpoch)
  var startHour = '' + (Math.floor(startMoment.hour() / 3) * 3)

  var month = '' + (startMoment.month() + 1)
  if (month < 2) {
    month = '0' + month
  }

  var day = '' + startMoment.date()
  if (day < 2) {
    day = '0' + day
  }

  if (startHour.length < 2) {
    startHour = '0' + startHour
  }


  var pathElements = [
    '' + startMoment.year() + month + day + startHour,
    voi
  ]

  var resultPath = '.'
  for (var i = 0; i < pathElements.length; i++) {
    resultPath = path.join(resultPath, pathElements[i])
  }
  return resultPath
}


async function readValueFromGribFile(pathToWgrib2, pathToGribFile, position) {
  const referenceTimeColumn = 2
  const verificationTimeColumn = 3
  const forecastHourColumn = 4
  const valueColumn = 5

  const command = pathToWgrib2 + ' -unix_time -ftime -lon ' + position.longitude + ' ' + position.latitude + ' ' + pathToGribFile
  var result = await exec(command,
  {
    windowsHide: true,
    stdio: [process.stdin, process.stdout, 'ignore'] // don't pollute console with stderr output
  })

  const resultRow = _.pull(result.stdout.replace(/\r\n/g, '\n').split('\n'), '')[0]
  const columns = resultRow.split(':')

  const valueString = columns[valueColumn]
  const valueStartIndex = valueString.indexOf('val=')
  const value = parseFloat(valueString.substr(valueStartIndex+4))

  const referenceTimeString = columns[referenceTimeColumn]
  const rerenceTimeStartIndex = referenceTimeString.indexOf('unix_rt=')
  const referenceTime = parseFloat(referenceTimeString.substr(rerenceTimeStartIndex+8))

  const verificationTimeString = columns[verificationTimeColumn]
  const verificationTimeStartIndex = verificationTimeString.indexOf('unix_vt=')
  const verificationTime = parseFloat(verificationTimeString.substr(verificationTimeStartIndex+8))

  const forecastHourString = columns[forecastHourColumn]
  var forecastHour = 0
  if (forecastHourString !== 'anl') {
    forecastHour = parseFloat(forecastHourString.split(' ')[0])
  }
  return {referenceTime: referenceTime, forecastHour: forecastHour, verificationTime: verificationTime, value: value}
}

async function readValueFromGrib2BzFile(pathToFile, position) {
  const tmpDir = await tmp.dir()


  if (process.platform === 'win32') {
    var result = await exec(path.join('bin','7z.exe') + ' -o' + tmpDir.path + ' e ' + pathToFile, {maxBuffer: 10 * 1024 * 1024})
  } else {
    await exec('bzip2 -ckd ' + pathToFile + ' > ' + path.join(tmpDir.path, 'dummy_file_name.grib2'))
  }

  result = await fs.readdir(tmpDir.path)

  const filePath = path.join(tmpDir.path, result[0])

  //result = await exec(path.join('bin','wgrib2.exe') + ' -lon 7 49 ' + filePath)

  if (process.platform === 'win32') {
    result = await readValueFromGribFile(path.join('bin','wgrib2.exe'), filePath, position)
  } else {
    result = await readValueFromGribFile(path.join('bin','wgrib2'), filePath, position)
  }


  await fs.unlink(filePath)

  tmpDir.cleanup()
  return result
}

async function readTimeSeriesFromGribFiles(startUnixEpoch, position, voi, gribBasePath) {
  var gribDirectoryPath = path.join(gribBasePath, getGribDirectoryPath(startUnixEpoch, voi))

  try {
    var fileNames = await fs.readdir(gribDirectoryPath)
    fileNames = _.sortBy(fileNames)
  } catch (error) {
    throw new VError({
      name: 'NO_DATA_AVAILABLE',
      cause: error
    })
  }

  const results = await Parallel.map(fileNames, async function(fileName) {
    const filePath = path.join(gribDirectoryPath, fileName)

    try {
      var data = await readValueFromGrib2BzFile(filePath, position)
    } catch (error) {
      console.log(error)
    }
    return data
  }, 4)

  return results
}

exports.readValueFromGrib2BzFile = readValueFromGrib2BzFile
exports.readTimeSeriesFromGribFiles = readTimeSeriesFromGribFiles
