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

describe('Test correct filtering of station list', function () {
  let stations = null
  before(async function () {
    // stations = await sc.getAllStations('./test/data') // from raw data
    stations = await fs.readJson('./test/data/station_utils/test_stations.json')
  })

  describe('Return all stations sorted by name if coordinates, radius and limit are absent', function () {
    it('should return the expected result', async function () {
      const expected = await fs.readJson(
        './test/data/station_utils/test_stations_sorted_by_name.json'
      )

      addContext(this, {
        title: 'expected output',
        value: expected
      })

      // Find stations accordingly
      const actual = await su.findStationsInVicinityOf(
        stations,
        undefined,
        undefined,
        undefined
      )
      addContext(this, {
        title: 'actual output',
        value: actual
      })
      // Check whether actual result matches expectations
      assert.deepEqual(actual, expected, 'Result does not match expectations')
    })
  })

  describe('Return five stations from stations sorted by name if coordinates and radius are absent', function () {
    it('should return the expected result', async function () {
      const expected = await fs.readJson(
        './test/data/station_utils/test_stations_sorted_by_name_limited_to_five.json'
      )

      addContext(this, {
        title: 'expected output',
        value: expected
      })

      // Find stations accordingly
      const actual = await su.findStationsInVicinityOf(
        stations,
        undefined,
        undefined,
        5
      )
      addContext(this, {
        title: 'actual output',
        value: actual
      })
      // Check whether actual result matches expectations
      assert.deepEqual(actual, expected, 'Result does not match expectations')
    })
  })

  describe('Return stations sorted by name if coordinates and limit are absent', function () {
    it('should return the expected result', async function () {
      const expected = await fs.readJson(
        './test/data/station_utils/test_stations_sorted_by_name.json'
      )

      addContext(this, {
        title: 'expected output',
        value: expected
      })

      // Find stations accordingly
      const actual = await su.findStationsInVicinityOf(
        stations,
        undefined,
        1000,
        undefined
      )
      addContext(this, {
        title: 'actual output',
        value: actual
      })
      // Check whether actual result matches expectations
      assert.deepEqual(actual, expected, 'Result does not match expectations')
    })
  })

  describe('Return five stations from stations sorted by name if coordinates are absent', function () {
    it('should return the expected result', async function () {
      const expected = await fs.readJson(
        './test/data/station_utils/test_stations_sorted_by_name_limited_to_five.json'
      )

      addContext(this, {
        title: 'expected output',
        value: expected
      })

      // Find stations accordingly
      const actual = await su.findStationsInVicinityOf(stations, undefined, 1000, 5)
      addContext(this, {
        title: 'actual output',
        value: actual
      })
      // Check whether actual result matches expectations
      assert.deepEqual(actual, expected, 'Result does not match expectations')
    })
  })

  describe('Return stations sorted by distance when only coordinates specified', function () {
    it('should return the expected result', async function () {
      const expected = await fs.readJson(
        './test/data/station_utils/test_stations_sorted_by_distance.json'
      )

      addContext(this, {
        title: 'expected output',
        value: expected
      })

      // Find stations accordingly
      const actual = await su.findStationsInVicinityOf(
        stations,
        { longitude: 11.11, latitude: 60.19 },
        undefined,
        undefined
      )
      addContext(this, {
        title: 'actual output',
        value: actual
      })
      // Check whether actual result matches expectations
      assert.deepEqual(actual, expected, 'Result does not match expectations')
    })
  })

  describe('Return stations sorted by distance when coordinates and limit specified', function () {
    it('should return the expected result', async function () {
      const expected = await fs.readJson(
        './test/data/station_utils/test_stations_sorted_by_distance_limited_to_five.json'
      )

      addContext(this, {
        title: 'expected output',
        value: expected
      })

      // Find stations accordingly
      const actual = await su.findStationsInVicinityOf(
        stations,
        { longitude: 11.11, latitude: 60.19 },
        undefined,
        5
      )
      addContext(this, {
        title: 'actual output',
        value: actual
      })

      // Check whether actual result matches expectations
      assert.deepEqual(actual, expected, 'Result does not match expectations')
    })
  })

  describe('Return stations sorted by distance when coordinates and radius specified', function () {
    it('should return the expected result', async function () {
      const expected = await fs.readJson(
        './test/data/station_utils/test_stations_in_1000km_radius.json'
      )

      addContext(this, {
        title: 'expected output',
        value: expected
      })

      // Find stations accordingly
      const actual = await su.findStationsInVicinityOf(
        stations,
        { longitude: 11.11, latitude: 60.19 },
        1000,
        undefined
      )
      addContext(this, {
        title: 'actual output',
        value: actual
      })
      // Check whether actual result matches expectations
      assert.deepEqual(actual, expected, 'Result does not match expectations')
    })
  })

  describe('Return stations sorted by distance when coordinates, radius and limit are specified', function () {
    it('should return the expected result', async function () {
      const expected = await fs.readJson(
        './test/data/station_utils/test_stations_in_1000km_limited_to_five.json'
      )

      addContext(this, {
        title: 'expected output',
        value: expected
      })

      // Find stations accordingly
      const actual = await su.findStationsInVicinityOf(
        stations,
        { longitude: 11.11, latitude: 60.19 },
        1000,
        5
      )
      addContext(this, {
        title: 'actual output',
        value: actual
      })
      // Check whether actual result matches expectations
      assert.deepEqual(actual, expected, 'Result does not match expectations')
    })
  })

  describe('Return correct distance in kilometers', function () {
    it('should return the expected result', async function () {
      const distanceBetweenLondonAndBerlin = 913.543
      const expected = distanceBetweenLondonAndBerlin
      addContext(this, {
        title: 'expected output',
        value: expected
      })

      const berlinLocation = { latitude: 52.516272, longitude: 13.377722 }

      const actual = await su.findStationsInVicinityOf(
        [
          {
            location: {
              latitude: 51.503333,
              longitude: 0.1278,
              elevation: 0
            },
            name: 'London',
            stationId: 'TEST',
            types: ['TEST']
          }
        ],
        berlinLocation,
        9000000,
        1
      )[0].distance
      addContext(this, {
        title: 'actual output',
        value: actual
      })

      assert.deepEqual(actual, expected, 'Result does not match expectations')
    })
  })
})
