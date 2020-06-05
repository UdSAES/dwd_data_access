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

describe('Test correct parsing of station catalogue(s)', function () {
  const dwdStationsBeobHaAsCSV = './test/data/dwd2017_stations_beob_ha.csv'
  const dwdStationsBeobNaAsCSV = './test/data/dwd2018_stations_beob_na.csv'

  describe('Parse the list of major weather stations used by DWD', async function () {
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
      assert.deepEqual(actual, expected, 'Result does not match expectations')
    })
  })

  describe('Parse the list of additional weather stations used by DWD', async function () {
    const dwdStationsBeobNaAsJSON = './test/data/dwd2018_stations_beob_na.json'

    it('should return the expected output', async function () {
      // Read expected result from .json-file
      const expected = await fs.readJson(dwdStationsBeobNaAsJSON)
      addContext(this, {
        title: 'expected output',
        value: expected
      })

      // Parse test file (shortened to a few lines)
      const actual = await sc.readStationsBeobNa(dwdStationsBeobNaAsCSV)
      addContext(this, {
        title: 'actual output',
        value: actual
      })

      // Check whether actual result matches expectations
      assert.deepEqual(actual, expected, 'Result does not match expectations')
    })
  })

  describe('Merge all lists of stations into one', async function () {
    const dwdStationsBeobAsJSON = './test/data/dwd2017_stations_beob.json'

    it('should return the expected output', async function () {
      // Read expected result from .json-file
      const expected = await fs.readJson(dwdStationsBeobAsJSON)
      addContext(this, {
        title: 'expected output',
        value: expected
      })

      // Read stations from files
      const actual = await sc.getAllStations('./test/data')
      addContext(this, {
        title: 'actual output',
        value: actual
      })

      // Check whether actual result matches expectations
      assert.deepEqual(actual, expected, 'Result does not match expectations')
    })
  })
})

describe('Test correct identification of weather stations in the vicinity of given coordinates', function () {
  let stations = null

  before(async function () {
    stations = await sc.getAllStations('./test/data')
  })

  describe('Find _the_ single closest station', function () {
    it('should return the expected result', async function () {
      const expected = {
        station: {
          stationId: 'A159',
          name: 'Eggebek',
          location: {
            latitude: 54.62823,
            longitude: 9.364924,
            elevation: 17
          }
        },
        distance: 627.855
      }
      addContext(this, {
        title: 'expected output',
        value: expected
      })

      const actual = await su.findClosestStation({ longitude: 11.11, latitude: 60.19 }, stations)
      addContext(this, {
        title: 'actual output',
        value: actual
      })

      assert.deepEqual(actual, expected, 'Result does not match expectations')
    })
  })
})
