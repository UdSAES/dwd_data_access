// SPDX-FileCopyrightText: 2018 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

'use strict'

const processenv = require('processenv')
const fs = require('fs-extra')
const describe = require('mocha').describe
const it = require('mocha').it
const assert = require('chai').assert
const addContext = require('mochawesome/addContext')
const mvu = require('../lib/measured_values_utils')
const _ = require('lodash')
const csv = require('dwd-csv-helper')
const path = require('path')


describe('Validate correctness of functions that manipulate VOIS', async function () {
  const VOIS_DATA_ACCESS_CONFIGS_PATH = './config/vois_data_access.json'
  const voisDataAccessConfigs = await fs.readJson(VOIS_DATA_ACCESS_CONFIGS_PATH, {
    encoding: 'utf8'
  })

  function getVoiConfigsAsArray (vois) {
    const voiConfigs = []
    _.forEach(vois, function (voi) {
      const voiConfig = _.find(voisDataAccessConfigs, (item) => {
        return item.target.key === voi
      })
      voiConfigs.push(voiConfig)
    })
    return voiConfigs
  }

  describe('Validate there is as much timeseries as vois', async function () {
    it ('should return the same amoubt of timeseries as vois', async function () {
      const DATA_ROOT_PATH = processenv('DATA_ROOT_PATH')
      // Temperature in K and pressure in Pa.
      const vois = ['t_2m', 'pmsl']
      const stationId = 10505
      const startTimestamp = 1597140000000
      const endTimestamp = 1597150000000
      const voiConfigs = getVoiConfigsAsArray(vois)
      const timeseriesDataCollection = await csv.readTimeseriesDataReport(path.join(DATA_ROOT_PATH, 'weather', 'weather_reports'), startTimestamp, endTimestamp, stationId)
      const timeseriesDataArray = mvu.useSIunitsAndDropNaN(mvu.dropTimeseriesDataNotOfInterest(voiConfigs, timeseriesDataCollection))
      const voisLength = voiConfigs.length
      const timeseriesDataArrayLength = timeseriesDataArray.length
      const firstVoiUnit = voiConfigs[0].target.unit
      const secondVoiUnit = voiConfigs[1].target.unit
      assert.deepEqual(firstVoiUnit, 'K')
      assert.deepEqual(secondVoiUnit, 'Pa')
      const veryLowPressure = 500
      const veryHighTemperature = 500
      // Data used is not UnitConverted for shortness
      assert.isBelow(timeseriesDataArray[0][0].value, veryHighTemperature, 'Temperature was higher than 500 K')
      assert.isAbove(timeseriesDataArray[1][0].value, veryLowPressure, 'Pressure was below 500?')
      assert.deepEqual(voisLength, timeseriesDataArrayLength, 'VOI configs and timeseriesDataArray are not the same length')
    })
  })

  describe('Validate unconfigured vois do not pass', async function () {
    const vois = ['t_2m', 'pdml']
    const voisDataAccessConfigs = getVoiConfigsAsArray(vois)
    it('should return the expected output', async function () {
      const expected = [true, false]
      addContext(this, {
        title: 'expected output',
        value: expected
      })

      const actual = mvu.checkValidityOfQuantityIds(voisDataAccessConfigs)
      addContext(this, {
        title: 'actual output',
        value: actual
      })

      assert.deepEqual(actual, expected, 'Result does not match expectations')
    })
  })

  describe('Validate configured vois do pass', async function () {
    const vois = ['t_2m', 'pmsl', 'aswdir_s']
    const voisDataAccessConfigs = getVoiConfigsAsArray(vois)
    it('should return the expected output', async function () {
      const expected = [true, true, true]
      addContext(this, {
        title: 'expected output',
        value: expected
      })

      const actual = mvu.checkValidityOfQuantityIds(voisDataAccessConfigs)
      addContext(this, {
        title: 'actual output',
        value: actual
      })

      assert.deepEqual(actual, expected, 'Result does not match expectations')
    })
  })
})

describe('Validate correctness of functions that manipulate CSVs', async function () {
  describe('Validate first elements got correctly', async function () {
    it('should return the expected output', async function () {
      const expected = [{ a: 1 }, { b: 2 }, { c: 3 }]
      addContext(this, {
        title: 'expected output',
        value: expected
      })

      const testData = [[{ a: 1 }, { g: 8 }, { h: 11 }], [{ b: 2 }, { f: 14 }, { o: 0 }], [{ c: 3 }, { r: 30 }, { q: 12 }]]
      const actual = mvu.getHeadElementsFromTimeseries(testData)
      addContext(this, {
        title: 'actual output',
        value: actual
      })

      assert.deepEqual(actual, expected, 'Result does not match expectations')
    })
  })

  describe('Validate last elements got correctly', async function () {
    it('should return the expected output', async function () {
      const expected = [[{ g: 8 }, { h: 11 }], [{ f: 14 }, { o: 0 }], [{ r: 30 }, { q: 12 }]]
      addContext(this, {
        title: 'expected output',
        value: expected
      })

      const testData = [[{ a: 1 }, { g: 8 }, { h: 11 }], [{ b: 2 }, { f: 14 }, { o: 0 }], [{ c: 3 }, { r: 30 }, { q: 12 }]]
      const actual = mvu.getTailElementsFromTimeseries(testData)
      addContext(this, {
        title: 'actual output',
        value: actual
      })

      assert.deepEqual(actual, expected, 'Result does not match expectations')
    })
  })

  describe('Validate got cvs values correctly', async function () {
    it('should return the expected output', async function () {
      const expected = '12345,Value1,Value2,'
      addContext(this, {
        title: 'expected output',
        value: expected
      })

      const testData = [{ timestamp: '12345', value: 'Value1' }, { timestamp: '12345', value: 'Value2' }]
      const actual = mvu.getValuesAsCSVString(testData)
      addContext(this, {
        title: 'actual output',
        value: actual
      })

      assert.deepEqual(actual, expected, 'Result does not match expectations')
    })
  })
})
