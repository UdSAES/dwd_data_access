// SPDX-FileCopyrightText: 2018 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

'use strict'
const su = require('../lib/station_utils')
const mmsc = require('../lib/mosmix_station_catalog')

const MOSMIX_STATION_CATALOG_PATH = './lib/mosmix_station_catalog.txt'
describe('./lib/station_utils', () => {
  var stations = null
  before(async () => {
    stations = await mmsc.readStationCatalogFromTextFile(MOSMIX_STATION_CATALOG_PATH)
  })

  describe('findClosestStation()', () => {
    it('should return a list of stations', async () => {
      const closestStation = await su.findClosestStation({ longitude: 11.11, latitude: 60.19 }, stations)
      console.log(closestStation)
    }).timeout(0)
  })
})
