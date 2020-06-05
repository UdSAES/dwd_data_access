// SPDX-FileCopyrightText: 2018 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

'use strict'


const _ = require('lodash')
const fs = require('fs-extra')
const csv = require('csvtojson')
const path = require('path')

const parser = (jsonObj) => {
  const json = []
  for (let i = 0; i < jsonObj.length; i += 1) {
    const stationObj = {
      location:
          {
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

async function readStationsMosmixFromTxt (pathToTextFile) {
  var fileContent = await fs.readFile(pathToTextFile, { encoding: 'utf8' })
  fileContent = fileContent.replace(/\r\n/g, '\n')
  const sections = fileContent.split('Stations‐ID Name\n')

  const stations = []
  _.forEach(sections, (section) => {
    if (_.startsWith(section, 'MOSMIX Stationskatalog')) {
      return
    }

    const ids = _.pull(section.split('\nBreitengrad\n')[0].split('\n'), '')

    const nameStartIndex = section.split('\nBreitengrad\n')[1].indexOf('\n\n')
    const names = _.pull(section.split('\nBreitengrad\n')[1].substr(0, nameStartIndex).split('\n'), '')

    var latitudes = _.pull(section.split('\nBreitengrad\n')[1].substr(nameStartIndex).split('\nLängengrad Höhe ü. N.N.\n')[0].split('\n'), '')
    latitudes = _.slice(latitudes, 0, latitudes.length - 1)

    const heightStartIndex = section.split('\nBreitengrad\n')[1].substr(nameStartIndex).split('\nLängengrad Höhe ü. N.N.\n')[1].indexOf('\n\n')
    var longitudes = _.pull(section.split('\nBreitengrad\n')[1].substr(nameStartIndex).split('\nLängengrad Höhe ü. N.N.\n')[1].substr(0, heightStartIndex).split('\n'), '')

    var altitudes = _.pull(section.split('\nBreitengrad\n')[1].substr(nameStartIndex).split('\nLängengrad Höhe ü. N.N.\n')[1].substr(heightStartIndex).split('\n'), '')
    altitudes = _.pull(altitudes, '\f')

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i]
      const name = names[i]

      // ATTENTION: the minus sign in the original file is NOT a minus sign
      const latitude = latitudes[i].replace('‐', '-')
      const longitude = longitudes[i].replace('‐', '-')
      const altitude = altitudes[i].replace('‐', '-')

      stations.push({
        id: id,
        name: name,
        latitude: parseFloat(latitude.replace(',', '.')),
        longitude: parseFloat(longitude.replace(',', '.')),
        altitude: parseFloat(altitude.replace(',', '.'))
      })
    }
  })

  return stations
}

async function getAllStations (basePath) {
  const dwdStationsBeobHaAsCSV = path.join(basePath, 'dwd2017_stations_beob_ha.csv')
  const dwdStationsBeobNaAsCSV = path.join(basePath, 'dwd2018_stations_beob_na.csv')

  const dwdStationsBeobHa = await readStationsBeobHa(dwdStationsBeobHaAsCSV)
  const dwdStationsBeobNa = await readStationsBeobNa(dwdStationsBeobNaAsCSV)

  const stations = []

  // Merge `stations_ha` and `stations_na`, only keeping certain fields
  _.forEach(dwdStationsBeobHa, function (obj) {
    stations.push({
      location: obj.location,
      name: obj['Stations-Name'],
      stationId: obj['WMO-Kennung']
    })
  })

  _.forEach(dwdStationsBeobNa, function (obj) {
    stations.push({
      location: obj.location,
      name: obj.STATIONSNAME,
      stationId: obj.STATIONSKENNUNG
    })
  })

  // TODO Discard entries about stations for which no data was crawled

  return stations
}

exports.getAllStations = getAllStations // public interface
exports.readStationsBeobHa = readStationsBeobHa // for unit tests
exports.readStationsBeobNa = readStationsBeobNa // for unit tests
exports.readStationsMosmixFromTxt = readStationsMosmixFromTxt // for unit tests
