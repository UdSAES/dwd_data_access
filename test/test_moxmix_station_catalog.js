// SPDX-FileCopyrightText: 2018 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

'use strict'
const mmsc = require('../lib/mosmix_station_catalog')

const MOSMIX_STATION_CATALOG_PATH = './lib/mosmix_station_catalog.txt'
describe('./lib/mosxmix_station_catalog', () => {
  describe('readStationCatalogFromTextFile()', () => {
    it('should return a list of stations', async () => {
      const stationData = await mmsc.readStationCatalogFromTextFile(MOSMIX_STATION_CATALOG_PATH)
    }).timeout(0)
  })
})
