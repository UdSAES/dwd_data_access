// SPDX-FileCopyrightText: 2018 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

'use strict'

const describe = require('mocha').describe
const before = require('mocha').before
const it = require('mocha').it

const su = require('../lib/station_utils')
const mmsc = require('../lib/mosmix_station_catalog')

const MOSMIX_STATION_CATALOG_PATH = './lib/mosmix_station_catalog.txt'

describe('Test correct parsing of station catalogue(s)', () => {
  describe('Do not throw upon reading the station catalogue from the .txt file', () => {
    it('should return a list of stations', async () => {
      const stationData = await mmsc.readStationCatalogFromTextFile(MOSMIX_STATION_CATALOG_PATH)
    }).timeout(0)
  })
})

describe('Test correct identification of weather stations in the vicinity of given coordinates', () => {
  var stations = null
  before(async () => {
    stations = await mmsc.readStationCatalogFromTextFile(MOSMIX_STATION_CATALOG_PATH)
  })

  describe('Find _the_ single closest station', () => {
    it('should return a list of stations', async () => {
      const closestStation = await su.findClosestStation({ longitude: 11.11, latitude: 60.19 }, stations)
      console.log(closestStation)
    }).timeout(0)
  })
})
