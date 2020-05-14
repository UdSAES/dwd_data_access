// SPDX-FileCopyrightText: 2018 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

'use strict'

const fs = require('fs-extra')
const describe = require('mocha').describe
const before = require('mocha').before
const it = require('mocha').it
const assert = require('chai').assert
const addContext = require('mochawesome/addContext')

const su = require('../lib/station_utils')
const sc = require('../lib/weather_stations')

const DWD_STATIONS_MOSMIX_FROM_PDF = './config/dwd2017_stations_mosmix_from_pdf.txt'

describe('Test correct parsing of station catalogue(s)', function () {
  describe('Do not throw upon reading the station catalogue from the old .txt file', function () {
    it('should return a list of stations', async function () {
      const stationData = await sc.readStationsMosmixFromTxt(DWD_STATIONS_MOSMIX_FROM_PDF)
    }).timeout(0)
  })

  describe('Parse the list of major weather stations used by DWD', async function () {
    const dwdStationsBeobHaAsCSV = './test/data/dwd2017_stations_beob_ha.csv'
    const dwdStationsBeobHaAsJSON = './test/data/dwd2017_stations_beob_ha.json'

    it('should return the expected output', async function () {
      // Read expected result from .json-file
      const expected = await fs.readJson(dwdStationsBeobHaAsJSON)
      addContext(this, {
        title: 'expected output',
        value: expected
      })

      // Parse test file (shortened to a few lines)
      const actual = await sc.readStationsBeobHa(dwdStationsBeobHaAsCSV)
      addContext(this, {
        title: 'actual output',
        value: actual
      })

      // Check whether actual result matches expectations
      assert(actual === expected, 'Result does not match expectations')
    })
  })
})

describe('Test correct identification of weather stations in the vicinity of given coordinates', function () {
  let stations = null

  before(async function () {
    stations = await sc.readStationsMosmixFromTxt(DWD_STATIONS_MOSMIX_FROM_PDF)
  })

  describe('Find _the_ single closest station', function () {
    it('should return a list of stations', async function () {
      const closestStation = await su.findClosestStation({ longitude: 11.11, latitude: 60.19 }, stations)
      console.log(closestStation)
    }).timeout(0)
  })
})
