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

const _ = require('lodash')
const path = require('path')
const moment = require('moment')
const fs = require('fs-extra')
const su = require('../lib/station_utils')
const assert = require('assert')

function formatNumber(number, overAllDigits) {
  var result = String(number)

  while(result.length < overAllDigits) {
    result = "0" + result
  }

  return result
}

function parseCSV(fileContent) {
  assert(_.isString(fileContent))
  fileContent = fileContent.replace(/\r\n/g, '\n')
  const lineStrings = fileContent.split('\n')

  const lines = _.map(lineStrings, (lineString) => {
    return lineString.split(';')
  })
  return lines
}

async function getAvailableStationIDs(searchDirectoryPath) {
  const directoryContentNames = await fs.readdir(searchDirectoryPath)
  const ids = []
  for(let i = 0; i < directoryContentNames.length; i++) {
    var stationId = directoryContentNames[i].split('-')[0]
    ids.push(stationId.replace('_', ''))
  }

  return ids
}

function getNewestMeasurementDataPoi(measurementDataBaseDirectory, poisJSONFilePath, voisJSONFilePath, stationCatalog) {
  return async function (req, res, next) {
    const poi_id = req.params.poi_id

    try {
      const poisConfig = await fs.readJson(poisJSONFilePath, {encoding: 'utf8'})
      var poi = _.find(poisConfig, (item) => {
        return item.id === poi_id
      })
    } catch (error) {
      console.log(error)
      res.status(500).send(error)
      res.end()
      return
    }

    if (_.isNil(poi)) {
      res.status(404).send("poi " + poi_id + " no known!")
      res.end()
      return
    }

    try {
      var voisConfig = await fs.readJson(voisJSONFilePath, {encoding: 'utf8'})
    } catch (error) {
      console.log(error)
      res.status(500).send(error)
      res.end()
      return
    }

    const coordinates = {
      latitude: poi.lat,
      longitude: poi.lon
    }


    const m = moment().tz('UTC').startOf('day').subtract(2, 'days')
    var closestStation = null

    try {
      const now = moment().tz('UTC')

      const resultItems = {}
      while (m.isBefore(now)) {
        try {
          const dateDirectoryName = formatNumber(m.year(), 4) + formatNumber(m.month() + 1, 2) + formatNumber(m.date(), 2)
          const dateDirectoryPath = path.join(measurementDataBaseDirectory, dateDirectoryName)
          const filteredStationIds = await getAvailableStationIDs(dateDirectoryPath)

          var filteredStationIdsMap = {}
          _.forEach(filteredStationIds, (item) => {
            filteredStationIdsMap[item] = item
          })

          const filteredStationCatalog = _.filter(stationCatalog, (item) => {
            return !_.isNil(filteredStationIdsMap[item.id])
          })
          closestStation = su.findClosestStation(coordinates, filteredStationCatalog)

          if (closestStation.station.id.length === 5) {
            var filePath = path.join(dateDirectoryPath, closestStation.station.id + '-BEOB.csv')
          } else {
            var filePath = path.join(dateDirectoryPath, closestStation.station.id + '_-BEOB.csv')
          }

          const fileContentString = await fs.readFile(filePath, {encoding: 'utf8'})
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

              const timestamp = moment(table[i][0], "DD.MM.YY").add(moment.duration(table[i][1])).valueOf()

              if (timestamp < now.valueOf() - 49 * 3600 * 1000) {
                continue
              }

              resultItems[voiName].push({
                timestamp: timestamp,
                value: (parseFloat(table[i][columnIndex].replace(',', '.')) + scalingOffset) * scalingFactor
              })
            }
          })
        } catch (error) {

        }
        m.add(1, 'day')
      }

      // if no closest station has been found, then there has been something wrong (we hope on client side ;-))
      if (_.isNil(closestStation)) {
        res.status(404).send({error: "no closest station found"})
        res.end()
        return
      }

      const result = {}
      result.poi = poi_id
      result.sourceReference = {
        name: 'data basis: Deutscher Wetterdienst, own elements added',
        url: 'https://www.dwd.de/EN/ourservices/opendata/opendata.html'
      }

      result.location = {
        longitude: closestStation.station.longitude,
        latitude: closestStation.station.latitude
      }

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
      return
    } catch (error) {
      res.status(404).send(error.toString())
      res.end()
      return
    }
  }
}

exports.getNewestMeasurementDataPoi = getNewestMeasurementDataPoi
