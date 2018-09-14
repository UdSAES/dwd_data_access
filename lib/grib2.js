// dwd_data_access
//
// Copyright 2018 The dwd_data_access Developers. See the LICENSE file at
// the top-level directory of this distribution and at
// https://github.com/UdSAES/dwd_data_access/LICENSE
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
//
// dwd_data_access may be freely used and distributed under the MIT license

'use strict'

const fs = require('fs-extra')
const decompress = require('decompress')
const decompressBzip2 = require('decompress-bzip2')
const tmp = require('tmp-promise')
const grib2json = require('weacast-grib2json')
const path = require('path')
const exec = require('child-process-promise').exec
const _ = require('lodash')
const { VError } = require('verror')
const moment = require('moment')
const Parallel = require('async-parallel')
const grib2 = require('grib2-simple')
const inly = require('inly')
const delay = require('delay')

function getGribDirectoryPath (startUnixEpoch, voi) {
  const startMoment = moment.unix(startUnixEpoch)
  var startHour = '' + (Math.floor(startMoment.hour() / 3) * 3)

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

async function readValueFromGribFile (pathToWgrib2, pathToGribFile, position) {
  const referenceTimeColumn = 2
  const verificationTimeColumn = 3
  const forecastHourColumn = 4
  const valueColumn = 5
  const lonColumn = 5
  const latColumn = 5

  const fileContentBuffer = await fs.readFile(pathToGribFile, { encoding: null })
  const grib2Array = await grib2(fileContentBuffer)

  const result = []

  _.forEach(grib2Array, (grib2Object) => {
    const value = grib2Object.getValue(position.lon, position.lat)
    result.push({ referenceTimestamp: grib2Object.referenceTimestamp, forecastTimestamp: grib2Object.forecastTimestamp, value: value, lon: position.lon, lat: position.lat }
    )
  })
  return result
}

async function readValuesFromGrib2BzFile (pathToFile, position) {
  const tmpDir = await tmp.dir()

  if (process.platform === 'win32') {
    var result = await exec(path.join('bin', '7z.exe') + ' -o' + tmpDir.path + ' e ' + pathToFile, { maxBuffer: 10 * 1024 * 1024 })
  } else {
    await exec('lz4 -d ' + pathToFile + ' ' + path.join(tmpDir.path, 'dummy_file_name.grib2'))
  }

  var result = await fs.readdir(tmpDir.path)

  const filePath = path.join(tmpDir.path, result[0])

  if (process.platform === 'win32') {
    result = await readValueFromGribFile(path.join('bin', 'wgrib2.exe'), filePath, position)
  } else {
    result = await readValueFromGribFile(path.join('cdo'), filePath, position)
  }
  await fs.unlink(filePath)

  tmpDir.cleanup()
  return result
}

async function readTimeSeriesFromGribFiles (startUnixEpoch, position, voi, gribBasePath) {
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
  _.remove(fileNames, (fileName) => {
    // we only want to handle lz4 files and grib files with regular latitude longitude grid
    return path.extname(fileName) !== '.lz4' || fileName.indexOf('regular-lat-lon') < 0
  })

  const tmpResults = await Parallel.map(fileNames, async function (fileName) {
    const filePath = path.join(gribDirectoryPath, fileName)

    try {
      var data = await readValuesFromGrib2BzFile(filePath, position)
    } catch (error) {
      console.log('error')
      console.log(error)
      return null
    }
    return data
  }, 4)

  const results = []
  _.forEach(tmpResults, (tmpResult) => {
    _.forEach(tmpResult, (item) => {
      results.push(item)
    })
  })

  _.sortBy(results, (item) => {
    return item.forcastTimestamp
  })

  return results
}

exports.readValuesFromGrib2BzFile = readValuesFromGrib2BzFile
exports.readTimeSeriesFromGribFiles = readTimeSeriesFromGribFiles
