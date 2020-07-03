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

      const actual = await su.findStationsInVicinityOf({ longitude: 11.11, latitude: 60.19 }, stations, 630000, 1) // @Review no radius
      addContext(this, {
        title: 'actual output',
        value: actual
      })

      assert.deepEqual(actual, expected, 'Result does not match expectations')
    })
  })

  // @Review Doesn't make sense to me for internal function; if anything, the function should throw, which it would do automatically
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
      // @Review Better to read from file, gets hard to read otherwise
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
        },
        {
          station: {
            location: {
              latitude: 48.709746,
              longitude: 11.209617,
              elevation: 380
            },
            name: 'Neuburg/Donau (Flugplatz)',
            stationId: '10853',
            types: [
              'BEOB'
            ]
          },
          distance: 1277.992
        },
        {
          station: {
            location: {
              latitude: 47.884339,
              longitude: 12.540379,
              elevation: 551.2
            },
            name: 'Chieming',
            stationId: '10982',
            types: [
              'BEOB'
            ]
          },
          distance: 1372.965
        },
        {
          station: {
            location: {
              latitude: 47.800864,
              longitude: 11.010754,
              elevation: 977
            },
            name: 'Hohenpeißenberg',
            stationId: '10962',
            types: [
              'BEOB'
            ]
          },
          distance: 1379.167
        },
        {
          station: {
            location: {
              latitude: 47.874893,
              longitude: 8.003817,
              elevation: 1489.6
            },
            name: 'Feldberg/Schwarzwald',
            stationId: '10908',
            types: [
              'BEOB'
            ]
          },
          distance: 1385.485
        },
        {
          station: {
            location: {
              latitude: 47.709538,
              longitude: 9.865926,
              elevation: 666
            },
            name: 'Wangen/Allgäu-Schwaderberg',
            stationId: 'Q999',
            types: [
              'BEOB'
            ]
          },
          distance: 1391.644
        },
        {
          station: {
            location: {
              latitude: 47.48305,
              longitude: 11.062293,
              elevation: 719
            },
            name: 'Garmisch-Partenkirchen',
            stationId: '10963',
            types: [
              'BEOB'
            ]
          },
          distance: 1414.535
        },
        {
          station: {
            location: {
              latitude: 47.420868,
              longitude: 10.984724,
              elevation: 2964
            },
            name: 'Zugspitze',
            stationId: '10961',
            types: [
              'BEOB'
            ]
          },
          distance: 1421.476
        },
        {
          station: {
            location: {
              latitude: -70.673054,
              longitude: -8.27498,
              elevation: 40
            },
            name: 'GEORG VON NEUMAYER',
            stationId: '89002',
            types: [
              'BEOB'
            ]
          },
          distance: 14646.696
        }
      ]

      addContext(this, {
        title: 'expected output',
        value: expected
      })

      // @Review first letter of comment capitalized if on own line (minor style issue)
      // find stations accordingly
      const actual = await su.findStationsInVicinityOf({ longitude: 11.11, latitude: 60.19 }, stations, 900000) // @Review radius should be optional, do not use arbitrary value instead of null-value
      addContext(this, {
        title: 'actual output',
        value: actual
      })
      // Check whether actual result matches expectations
      assert.deepEqual(actual, expected, 'Result does not match expectations')
    })
  })

  describe('Return list limited to 3 stations', function () {
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

      const actual = await su.findStationsInVicinityOf({ longitude: 11.11, latitude: 60.19 }, stations, 9000000, 3) // @Review radius should be optional, do not use arbitrary value instead of null-value
      addContext(this, {
        title: 'actual output',
        value: actual
      })

      assert.deepEqual(actual, expected, 'Result does not match expectations')
    })
  })
})

describe('Return correct distance in kilometers', function () {
  it('should return the expected result', async function () {
    const expected = 930.304 // @Review where from?
    addContext(this, {
      title: 'expected output',
      value: expected
    })

    const berlinLocation = { latitude: 52.516272, longitude: 13.377722 }

    const actual = await su.findStationsInVicinityOf(berlinLocation,
      [{
        location: {
          latitude: 51.503333,
          longitude: -0.119722,
          elevation: 0
        },
        name: 'London',
        stationId: 'TEST',
        types: ['TEST']
      }], 9000000, 3)[0].distance // @Review radius should be optional, do not use arbitrary value instead of null-value
    addContext(this, {
      title: 'actual output',
      value: actual
    })

    assert.deepEqual(actual, expected, 'Result does not match expectations')
  })
})
