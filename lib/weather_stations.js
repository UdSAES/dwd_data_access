// SPDX-FileCopyrightText: 2018 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

'use strict'

const _ = require('lodash')
const csv = require('csvtojson')
const path = require('path')

const parser = jsonObj => {
  const json = []
  for (let i = 0; i < jsonObj.length; i += 1) {
    const stationObj = {
      location: {
        latitude: null,
        longitude: null,
        elevation: null
      }
    }
    const station = jsonObj[i]
    Object.keys(station).forEach((key, index) => {
      if (key === 'GEOGR_BREITE') {
        stationObj.location.latitude = parseFloat(station[key])
      } else if (key === 'GEOGR_LAENGE') {
        stationObj.location.longitude = parseFloat(station[key])
      } else if (key === 'STATIONSHOEHE') {
        stationObj.location.elevation = parseFloat(station[key])
      } else {
        stationObj[key] = station[key]
      }
    })
    json.push(stationObj)
  }
  return json
}

async function readStationsBeobHa (filePath) {
  const converter = csv({
    trim: true,
    ignoreColumns: /(BG|BM|BS|LG|LM|LS)/
  })

  const jsonObj = await converter.fromFile(filePath)
  return await parser(jsonObj)
}

async function readStationsBeobNa (filePath) {
  const converter = csv({
    trim: true,
    includeColumns: /(STATIONSKENNUNG|STATIONSNAME|STATIONS_ID|GEOGR_BREITE|GEOGR_LAENGE|STATIONSHOEHE)/
  })

  const jsonObj = await converter.fromFile(filePath)
  return await parser(jsonObj)
}

async function getAllStations (basePath) {
  const dwdStationsBeobHaAsCSV = path.join(
    basePath,
    'dwd2017_stations_beob_ha.csv'
  )
  const dwdStationsBeobNaAsCSV = path.join(
    basePath,
    'dwd2018_stations_beob_na.csv'
  )

  const dwdStationsBeobHa = await readStationsBeobHa(dwdStationsBeobHaAsCSV)
  const dwdStationsBeobNa = await readStationsBeobNa(dwdStationsBeobNaAsCSV)

  const stations = []

  // Merge `stations_ha` and `stations_na`, only keeping certain fields
  _.forEach(dwdStationsBeobHa, function (obj) {
    stations.push({
      location: obj.location,
      name: obj['Stations-Name'],
      stationId: obj['WMO-Kennung'],
      types: ['BEOB']
    })
  })

  _.forEach(dwdStationsBeobNa, function (obj) {
    stations.push({
      location: obj.location,
      name: obj.STATIONSNAME,
      stationId: obj.STATIONSKENNUNG,
      types: ['BEOB']
    })
  })

  // TODO Discard entries about stations for which no data was crawled

  return stations
}

exports.getAllStations = getAllStations // public interface
exports.readStationsBeobHa = readStationsBeobHa // for unit tests
exports.readStationsBeobNa = readStationsBeobNa // for unit tests
