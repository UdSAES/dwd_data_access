// SPDX-FileCopyrightText: 2018 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

'use strict'

const _ = require('lodash')
const path = require('path')
const moment = require('moment')
const fs = require('fs-extra')
const su = require('../lib/stations_utils')
const assert = require('assert')
const processenv = require('processenv')
var bunyan = require('bunyan')

// Instantiate logger
const LOG_LEVEL = String(processenv('LOG_LEVEL') || 'info')
var log = bunyan.createLogger({
  name: 'handler_measurement_data_access',
  serializers: bunyan.stdSerializers,
  level: LOG_LEVEL
})
log.info('loaded module for handling requests for measurement data')

function formatNumber (number, overAllDigits) {
  var result = String(number)

  while (result.length < overAllDigits) {
    result = '0' + result
  }

  return result
}

function parseCSV (fileContent) {
  assert(_.isString(fileContent))
  fileContent = fileContent.replace(/\r\n/g, '\n')
  const lineStrings = fileContent.split('\n')

  const lines = _.map(lineStrings, (lineString) => {
    return lineString.split(';')
  })
  return lines
}

async function getAvailableStationIDs (searchDirectoryPath) {
  const directoryContentNames = await fs.readdir(searchDirectoryPath)
  const ids = []
  for (let i = 0; i < directoryContentNames.length; i++) {
    var stationId = directoryContentNames[i].split('-')[0]
    ids.push(stationId.replace('_', ''))
  }

  return ids
}

function getNewestMeasurementDataPoi (
  measurementDataBaseDirectory,
  poisJSONFilePath,
  voisJSONFilePath,
  stationCatalog
) {
  return async function (req, res, next) {
    const poiID = req.params.poi_id

    try {
      const poisConfig = await fs.readJson(poisJSONFilePath, {
        encoding: 'utf8'
      })
      var poi = _.find(poisConfig, (item) => {
        return item.id === poiID
      })
    } catch (error) {
      res.status(500).send(error)
      res.end()
      req.log.error({ err: error, res: res }, `failed to read file ${poisJSONFilePath}`)
      return
    }

    if (_.isNil(poi)) {
      res.status(404).send('POI ' + poiID + ' is not known')
      res.end()
      req.log.warn('received request for POI that does not exist')
      return
    }

    try {
      var voisConfig = await fs.readJson(voisJSONFilePath, { encoding: 'utf8' })
    } catch (error) {
      res.status(500).send(error)
      res.end()
      req.log.error({ err: error, res: res }, `failed to read file ${voisJSONFilePath}`)
      return
    }

    const coordinates = {
      latitude: poi.lat,
      longitude: poi.lon
    }

    const m = moment()
      .tz('UTC')
      .startOf('day')
      .subtract(2, 'days')
    var closestStation = null

    try {
      const now = moment().tz('UTC')

      const resultItems = {}
      while (m.isBefore(now)) {
        try {
          const dateDirectoryName =
            formatNumber(m.year(), 4) +
            formatNumber(m.month() + 1, 2) +
            formatNumber(m.date(), 2)
          const dateDirectoryPath = path.join(
            measurementDataBaseDirectory,
            dateDirectoryName
          )
          const filteredStationIds = await getAvailableStationIDs(dateDirectoryPath)

          var filteredStationIdsMap = {}
          _.forEach(filteredStationIds, (item) => {
            filteredStationIdsMap[item] = item
          })

          const filteredStationCatalog = _.filter(stationCatalog, (item) => {
            return !_.isNil(filteredStationIdsMap[item.stationId])
          })
          closestStation = su.findClosestStation(coordinates, filteredStationCatalog)

          const filePath = path.join(
            dateDirectoryPath,
            _.pad(closestStation.station.stationId, 5, '_') + '-BEOB.csv'
          )

          const fileContentString = await fs.readFile(filePath, {
            encoding: 'utf8'
          })
          const table = parseCSV(fileContentString)

          _.forEach(voisConfig, (voiConfig, voiName) => {
            var columnIndex = null
            _.forEach(table[0], (column, index) => {
              if (column === voiConfig.csvLabel) {
                columnIndex = index
                return true
              }
            })

            if (_.isNil(columnIndex)) {
              return
            }

            var scalingOffset = voiConfig.csvScalingOffset || 0
            var scalingFactor = voiConfig.csvScalingFactor || 1

            for (let i = 3; i < table.length; i++) {
              // we don't handle invalid values (--> marked as '---' in CSV files)
              if (table[i][columnIndex] === '---') {
                continue
              }

              if (_.isNil(resultItems[voiName])) {
                resultItems[voiName] = []
              }

              const timestamp = moment(table[i][0], 'DD.MM.YY')
                .add(moment.duration(table[i][1]))
                .valueOf()

              if (timestamp < now.valueOf() - 49 * 3600 * 1000) {
                continue
              }

              resultItems[voiName].push({
                timestamp: timestamp,
                value:
                  (parseFloat(table[i][columnIndex].replace(',', '.')) +
                    scalingOffset) *
                  scalingFactor
              })
            }
          })
        } catch (error) {
          req.log.error(error, `failed to get newest measurement data for POI ${poiID}`)
        }
        m.add(1, 'day')
      }

      // if no closest station has been found, then there has been something wrong (we hope on client side ;-))
      if (_.isNil(closestStation)) {
        res.status(404).send({ error: 'no closest station found' })
        res.end()
        req.log.warn({ res: res }, 'unable to find station closest to POI')
        return
      }

      const result = {}
      result.poi = poiID
      result.sourceReference = {
        name: 'Data basis: Deutscher Wetterdienst, own elements added',
        url: 'https://www.dwd.de/EN/ourservices/opendata/opendata.html'
      }

      result.location = closestStation.station.location

      result.measurements = []

      _.forEach(resultItems, (resultItem, voiName) => {
        // sort timeseries by increasing timestamp
        resultItems[voiName] = _.sortBy(resultItem, (item) => {
          return item.timestamp
        })

        result.measurements.push({
          label: voiName,
          unit: voisConfig[voiName].resultUnit,
          data: resultItems[voiName]
        })
      })

      res.status(200).send(result)
      res.end()
      req.log.info(
        { res: res },
        `successfully handled ${req.method}-request on ${req.path}`
      )
      return
    } catch (error) {
      res.status(404).send(error.toString())
      res.end()
      req.log.warn(
        { err: error, res: res },
        `error while handling ${req.method}-request on ${req.path}`
      )
    }
  }
}

exports.getNewestMeasurementDataPoi = getNewestMeasurementDataPoi
