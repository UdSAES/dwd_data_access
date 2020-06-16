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
  // Read expected result from .json-file
  before(async function () {
    stations = await sc.getAllStations('./test/data')
  })

  describe('Find _the_ single closest station', function () {
    it('should return the expected result', async function () {
      const expected = [{
        station: {
          stationId: 'A159',
          name: 'Eggebek',
          location: {
            latitude: 54.62823,
            longitude: 9.364924,
            elevation: 17
          },
          types: ['BEOB']
        },
        distance: 627.856
      }]
      addContext(this, {
        title: 'expected output',
        value: expected
      })

      const actual = await su.findStationsInVicinityOf({ longitude: 11.11, latitude: 60.19 }, stations, 630000, 1)
      addContext(this, {
        title: 'actual output',
        value: actual
      })

      assert.deepEqual(actual, expected, 'Result does not match expectations')
    })
  })

  describe('Return empty list if no arguments are passed', function () {
    it('should return the expected result', async function () {
      const expected = []
      addContext(this, {
        title: 'expected output',
        value: expected
      })

      const actual = await su.findStationsInVicinityOf()
      addContext(this, {
        title: 'actual output',
        value: actual
      })

      assert.deepEqual(actual, expected, 'Result does not match expectations')
    })
  })

  describe('Return all stations if limit is 0', function () {
    it('should return the expected result', async function () {
      const expected = [
        {
          station: {
            location: {
              latitude: 54.62823,
              longitude: 9.364924,
              elevation: 17
            },
            name: 'Eggebek',
            stationId: 'A159',
            types: [
              'BEOB'
            ]
          },
          distance: 627.856
        },
        {
          station: {
            location: {
              latitude: 54.692781,
              longitude: 8.527128,
              elevation: 8
            },
            name: 'Wrixum/Föhr',
            stationId: 'A112',
            types: [
              'BEOB'
            ]
          },
          distance: 631.083
        },
        {
          station: {
            location: {
              latitude: 54.119305,
              longitude: 8.858369,
              elevation: 3
            },
            name: 'Büsum',
            stationId: 'A505',
            types: [
              'BEOB'
            ]
          },
          distance: 689.221
        },
        {
          station: {
            location: {
              latitude: 54.018844,
              longitude: 9.925507,
              elevation: 16.5
            },
            name: 'Padenstedt (Pony-Park)',
            stationId: 'A653',
            types: [
              'BEOB'
            ]
          },
          distance: 690.663
        },
        {
          station: {
            location: {
              latitude: 53.938481,
              longitude: 10.698267,
              elevation: 26
            },
            name: 'Schwartau,Bad -Groß Parin',
            stationId: 'A791',
            types: [
              'BEOB'
            ]
          },
          distance: 696.358
        },
        {
          station: {
            location: {
              latitude: 54.174957,
              longitude: 7.891954,
              elevation: 4
            },
            name: 'Helgoland',
            stationId: '10015',
            types: [
              'BEOB'
            ]
          },
          distance: 696.961
        },
        {
          station: {
            location: {
              latitude: 54.1667,
              longitude: 7.45,
              elevation: 0
            },
            name: 'UFS Deutsche Bucht',
            stationId: '10007',
            types: [
              'BEOB'
            ]
          },
          distance: 705.672
        }
      ]

      addContext(this, {
        title: 'expected output',
        value: expected
      })

      // find stations accordingly
      const actual = await su.findStationsInVicinityOf({ longitude: 11.11, latitude: 60.19 }, stations, 900000)
      addContext(this, {
        title: 'actual output',
        value: actual
      })
      // Check whether actual result matches expectations
      assert.deepEqual(actual, expected, 'Result does not match expectations')
    })
  })

  describe('Return empty list limited to 3 stations', function () {
    it('should return the expected result', async function () {
      const expected = [
        {
          station: {
            location: {
              latitude: 54.62823,
              longitude: 9.364924,
              elevation: 17
            },
            name: 'Eggebek',
            stationId: 'A159',
            types: [
              'BEOB'
            ]
          },
          distance: 627.856
        },
        {
          station: {
            location: {
              latitude: 54.692781,
              longitude: 8.527128,
              elevation: 8
            },
            name: 'Wrixum/Föhr',
            stationId: 'A112',
            types: [
              'BEOB'
            ]
          },
          distance: 631.083
        },
        {
          station: {
            location: {
              latitude: 54.119305,
              longitude: 8.858369,
              elevation: 3
            },
            name: 'Büsum',
            stationId: 'A505',
            types: [
              'BEOB'
            ]
          },
          distance: 689.221
        }
      ]
      addContext(this, {
        title: 'expected output',
        value: expected
      })

      const actual = await su.findStationsInVicinityOf({ longitude: 11.11, latitude: 60.19 }, stations, 9000000, 3)
      addContext(this, {
        title: 'actual output',
        value: actual
      })

      assert.deepEqual(actual, expected, 'Result does not match expectations')
    })
  })
})
