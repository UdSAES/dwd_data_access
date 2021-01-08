// SPDX-FileCopyrightText: 2018 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

'use strict'

const _ = require('lodash')
const moment = require('moment')
const path = require('path')
const fs = require('fs-extra')
const parser = require('xml-js')
const tmp = require('tmp-promise')
const yauzl = require('yauzl-promise')
const log = require('../lib/logger.js')
const COLUMN_SEPARATOR = ';'

function deriveCsvFilePath (csvBasePath, type, timestamp, stationId) {
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

  const dayDateTimeString = moment.utc(timestamp).format(formatString)
  const fileName = stationId + '-' + contentType + extension

  return path.join(csvBasePath, subdir, dayDateTimeString, fileName)
}

function parseCsvFile (fileContent) {
  fileContent = fileContent.replace(/\r\n/g, '\n')

  const lines = fileContent.split('\n')

  let headings = []
  const values = []
  _.forEach(lines, (line, index) => {
    if (line === '') {
      return
    }

    const columns = line.split(COLUMN_SEPARATOR)
    if (index === 0) {
      headings = columns
      return
    }

    if (index < 3) {
      return
    }

    if (index === 3) {
      _.forEach(columns, () => {
        values.push([])
      })
    }

    _.forEach(columns, (value, index) => {
      if (index < 2) {
        // do not attempt to parse DD.MM.YY and HH:mm as float
        values[index].push(value)
      } else if (value === '---') {
        // '---' is used to denote 'no data' in files by DWD
        values[index].push(null)
      } else {
        values[index].push(parseFloat(value.replace(',', '.')))
      }
    })
  })

  const result = {}

  _.forEach(values, (valueColumn, index) => {
    if (index < 2) {
      return
    }

    result[headings[index]] = valueColumn
  })

  _.forEach(values[0], (value, index) => {
    if (index === 0) {
      result.timestamp = []
    }
    const date = moment.utc(value, 'DD.MM.YY').valueOf()

    const time = moment
      .utc(values[1][index], 'HH:mm')
      .year(1970)
      .month(0)
      .date(1)
      .valueOf()
    result.timestamp.push(date + time)
  })

  return result
}

async function extractKmlFile (filePath) {
  const tmpFile = await tmp.file()
  const writeStream = fs.createWriteStream(tmpFile.path)

  const zipFile = await yauzl.open(filePath)
  const entry = await zipFile.readEntry()
  const readStream = await entry.openReadStream()
  readStream.pipe(writeStream)
  await zipFile.close()

  const kmlFileContent = await fs.readFile(tmpFile.path, { encoding: 'utf8' })
  tmpFile.cleanup()

  return kmlFileContent
}

async function parseKmlFile (fileContent) {
  // Read the .kml-file
  const xml2jsOptions = {
    compact: true,
    ignoreComment: true,
    alwaysChildren: true
  }
  const kmzFileJS = await parser.xml2js(fileContent, xml2jsOptions)

  // Build the expected object containing all the data
  const forecastCollection = {}

  let forecastTimeSteps =
    kmzFileJS['kml:kml']['kml:Document']['kml:ExtendedData']['dwd:ProductDefinition'][
      'dwd:ForecastTimeSteps'
    ]['dwd:TimeStep']
  forecastTimeSteps = _.map(forecastTimeSteps, (item) => {
    return moment(item._text).valueOf()
  })

  const forecastData =
    kmzFileJS['kml:kml']['kml:Document']['kml:Placemark']['kml:ExtendedData'][
      'dwd:Forecast'
    ]
  for (let i = 0; i < forecastData.length; i++) {
    const data = _.flatMap(forecastData[i]['dwd:value'], (stringOfValues) => {
      const separator = ';'
      stringOfValues = _.replace(_.trimStart(stringOfValues), /(\s+)/g, separator)
      const listOfValues = _.split(stringOfValues, separator)

      return _.map(listOfValues, (value) => {
        return parseFloat(value)
      })
    })

    if (forecastTimeSteps.length === data.length) {
      const forecast = []
      for (let i = 0; i < data.length; i++) {
        forecast.push({
          timestamp: forecastTimeSteps[i],
          value: data[i]
        })
      }

      const key = forecastData[i]._attributes['dwd:elementName']
      forecastCollection[key] = forecast
    }
  }

  return forecastCollection
}

async function readTimeseriesDataBeob (
  csvBasePath,
  startTimestamp,
  endTimestamp,
  stationId,
  type = 'REPORT'
) {
  let dayTimestamp = moment
    .utc(startTimestamp)
    .startOf('day')
    .valueOf()

  const result = {}
  while (dayTimestamp < endTimestamp) {
    const filePath = deriveFilePath(csvBasePath, type, dayTimestamp, stationId)
    let fileContent
    try {
      fileContent = await fs.readFile(filePath, { encoding: 'utf8' })
    } catch (error) {
      log.warn(error, `failed to read measurement data from file ${filePath}`)
      // TODO This skips a day in millisecinds, triggering erroneous:
      // 2020100100 -> 2020100200 everything between is jumped through
      // However data can be there
      dayTimestamp += 86400 * 1000
      continue
    }

    const partialTimeseries = parseCsvFile(fileContent)

    // Trim to specified time interval and assemble object to return
    const timestamps = partialTimeseries.timestamp
    _.forEach(partialTimeseries, (values, key) => {
      if (key === 'timestamp') {
        return
      }

      // Iff key not yet in result, make key property of result
      if (!_.has(result, key)) {
        result[key] = []
      }

      _.forEach(values, (value, index) => {
        if (timestamps[index] < startTimestamp || timestamps[index] >= endTimestamp) {
          return
        }
        result[key].push({
          timestamp: timestamps[index],
          value: value
        })
      })
    })
    dayTimestamp += 86400 * 1000
  }

  _.forEach(result, (item, key) => {
    result[key] = _.sortBy(item, (item) => {
      return item.timestamp
    })
  })
  return result
}

async function readTimeseriesDataMosmix (mosmixBasePath, startTimestamp, stationId) {
  let dayTimestamp
  let filePath
  let fileContent
  let partialTimeseries
  let result = {}
  const newKeydd = 'DD'
  const newKeyff = 'FF'
  const newKeyTT = 'TTT'

  // Take care of the fact that DWD stopped providing .csv-files on 2018-09-17
  if (startTimestamp < moment.utc('2018-09-12').valueOf()) {
    // TODO: ensure that not only the 6 o'clock-run is used but the others as well
    dayTimestamp = moment
      .utc(startTimestamp)
      .startOf('day')
      .add(6, 'hours')
      .valueOf()
    filePath = deriveCsvFilePath(mosmixBasePath, 'MOSMIX', dayTimestamp, stationId)
    try {
      fileContent = await fs.readFile(filePath, { encoding: 'utf8' })
    } catch (error) {
      log.warn(error, `failed to read .csv-file ${filePath}`)
      throw error
    }
    partialTimeseries = parseCsvFile(fileContent)

    const timestamps = partialTimeseries.timestamp
    _.forEach(partialTimeseries, (values, key) => {
      if (key === 'timestamp') {
        return
      }

      _.forEach(values, (value, index) => {
        // Perform conversion to new format
        switch (key) {
          case 'TT':
            if (_.isNil(result[newKeyTT])) {
              result[newKeyTT] = []
            }
            result[newKeyTT].push({
              timestamp: timestamps[index],
              value: value + 273.15 // °C to K
            })
            break
          case 'PPPP':
            if (_.isNil(result[key])) {
              result[key] = []
            }
            result[key].push({
              timestamp: timestamps[index],
              value: value * 100 // hPa to Pa
            })
            break
          case 'Td':
            if (_.isNil(result[key])) {
              result[key] = []
            }
            result[key].push({
              timestamp: timestamps[index],
              value: value + 273.15 // °C to K
            })
            break
          case 'ff':
            if (_.isNil(result[newKeyff])) {
              result[newKeyff] = []
            }
            result[newKeyff].push({
              timestamp: timestamps[index],
              value: value / 3.6 // km/h to m/s
            })
            break
          case 'dd':
            if (_.isNil(result[newKeydd])) {
              result[newKeydd] = []
            }
            result[newKeydd].push({
              timestamp: timestamps[index],
              value: value
            })
            break
          // ..unless nothing has changed, which has to be found by manually
          // comparing MetElementDefinition.xml to the headings inside a .csv
          default:
            if (_.isNil(result[key])) {
              result[key] = []
            }
            result[key].push({
              timestamp: timestamps[index],
              value: value
            })
        }
      })
    })

    _.forEach(result, (item, key) => {
      result[key] = _.sortBy(item, (item) => {
        return item.timestamp
      })
    })
  } else {
    // TODO: ensure that not only the 3 o'clock-run is used but the others as well
    dayTimestamp = moment
      .utc(startTimestamp)
      .startOf('day')
      .add(3, 'hours')
      .valueOf()
    filePath = deriveCsvFilePath(mosmixBasePath, 'MOSMIX_KMZ', dayTimestamp, stationId)

    // Unzip the .kmz-file, then parse it
    try {
      fileContent = await extractKmlFile(filePath)
    } catch (error) {
      log.warn(error, `failed to extract the .kml-file from ${filePath}`)
      throw error
    }
    result = await parseKmlFile(fileContent)
  }

  return result
}

exports.parseCsvFile = parseCsvFile
exports.parseKmlFile = parseKmlFile
exports.extractKmlFile = extractKmlFile
exports.deriveCsvFilePath = deriveCsvFilePath
exports.readTimeseriesDataBeob = readTimeseriesDataBeob
exports.readTimeseriesDataMosmix = readTimeseriesDataMosmix

module.exports = exports