// SPDX-FileCopyrightText: 2018 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

'use strict'

const _ = require('lodash')
const moment = require('moment')
const path = require('path')
const fs = require('fs-extra')

const COLUMN_SEPARATOR = ';'

function deriveCsvFilePath (csvBasePath, dayTimestamp, stationId) {
  const dayDateTimeString = moment.utc(dayTimestamp).format('YYYYMMDD')
  const fileName = stationId + '-BEOB.csv'

  return path.join(csvBasePath, dayDateTimeString, fileName)
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
      if (value === '---') {
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
    const date = moment.utc(value, 'DD.MM.YYYY').valueOf()

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

async function readTimeseriesData (
  csvBasePath,
  startTimestamp,
  endTimestamp,
  stationId
) {
  let dayTimestamp = moment
    .utc(startTimestamp)
    .startOf('day')
    .valueOf()

  const result = {}
  while (dayTimestamp < endTimestamp) {
    const filePath = deriveCsvFilePath(csvBasePath, dayTimestamp, stationId)
    const fileContent = await fs.readFile(filePath, {
      encoding: 'utf8'
    })

    const partialTimeseries = parseCsvFile(fileContent)
    dayTimestamp += 86400 * 1000
  }

  return result
}

exports.parseCsvFile = parseCsvFile
exports.deriveCsvFilePath = deriveCsvFilePath
exports.readTimeseriesData = readTimeseriesData
