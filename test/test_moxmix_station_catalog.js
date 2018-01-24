'use strict'
const mmsc = require('../lib/mosmix_station_catalog')

const MOSMIX_STATION_CATALOG_PATH = './sample_data/mosmix_pdftotext.txt'
describe('./lib/mosxmix_station_catalog', () => {
  describe('readStationCatalogFromTextFile()', () => {
    it('should return a list of stations', async () => {
      const stationData = await mmsc.readStationCatalogFromTextFile(MOSMIX_STATION_CATALOG_PATH)
    }).timeout(0)
  })
})
