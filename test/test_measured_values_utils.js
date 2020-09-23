// SPDX-FileCopyrightText: 2020 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

'use strict'

const fs = require('fs-extra')
const describe = require('mocha').describe
const it = require('mocha').it
const assert = require('chai').assert
const addContext = require('mochawesome/addContext')
const mvu = require('../lib/measured_values_utils')
const _ = require('lodash')

describe('Validate correctness of utility functions for loading BEOB data', async function () {
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

  describe('Identify unconfigured VOIs', async function () {
    const testCases = [
      { input: ['t_2m', 'pdml'], expected: [true, false] },
      { input: ['t_2m', 'pmsl', 'aswdir_s'], expected: [true, true, true] }
    ]
    testCases.forEach(function (test) {
      it('should return the expected output', async function () {
        const voisDataAccessConfigs = getVoiConfigsAsArray(test.input)
        const expected = test.expected
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

  describe('Load and pre-process data requested', function () {
    const timeseriesDataCollection = {
      t_2m: [
        { timestamp: 12345, value: 20 },
        { timestamp: 12346, value: 30 }
      ],
      pmsl: [
        { timestamp: 12345, value: 10020.1 },
        { timestamp: 12346, value: 10030.2 }
      ]
    }
    it('should pick only the requested quantities', function () {
      const expected = { t_2m: timeseriesDataCollection.t_2m }
      addContext(this, {
        title: 'expected output',
        value: expected
      })

      const actual = mvu.dropTimeseriesDataNotOfInterest(
        [{ report: { key: 't_2m' } }],
        timeseriesDataCollection
      )
      addContext(this, {
        title: 'actual output',
        value: actual
      })

      assert.deepEqual(actual, expected)
    })
    it.skip('should drop entries that are NaN', function () {
      assert.fail('Not yet implemented')
    })
    it.skip('should convert values to intended units', function () {
      assert.fail('Not yet implemented')
    })
  })
})

describe('Validate correctness of functions that generate CSV-representation', async function () {
  describe('Get first element', async function () {
    it('should return the expected output', async function () {
      const expected = [{ a: 1 }, { b: 2 }, { c: 3 }]
      addContext(this, {
        title: 'expected output',
        value: expected
      })

      const testData = [
        [{ a: 1 }, { g: 8 }, { h: 11 }],
        [{ b: 2 }, { f: 14 }, { o: 0 }],
        [{ c: 3 }, { r: 30 }, { q: 12 }]
      ]
      const actual = mvu.getHeadElementsFromTimeseries(testData)
      addContext(this, {
        title: 'actual output',
        value: actual
      })

      assert.deepEqual(actual, expected, 'Result does not match expectations')
    })
  })

  describe('Get all but first elements', async function () {
    it('should return the expected output', async function () {
      const expected = [
        [{ g: 8 }, { h: 11 }],
        [{ f: 14 }, { o: 0 }],
        [{ r: 30 }, { q: 12 }]
      ]
      addContext(this, {
        title: 'expected output',
        value: expected
      })

      const testData = [
        [{ a: 1 }, { g: 8 }, { h: 11 }],
        [{ b: 2 }, { f: 14 }, { o: 0 }],
        [{ c: 3 }, { r: 30 }, { q: 12 }]
      ]
      const actual = mvu.getTailElementsFromTimeseries(testData)
      addContext(this, {
        title: 'actual output',
        value: actual
      })

      assert.deepEqual(actual, expected, 'Result does not match expectations')
    })
  })

  describe('Assemble one row of CSV-representation', async function () {
    it('should return the expected output', async function () {
      const expected = '12345,Value1,Value2'
      addContext(this, {
        title: 'expected output',
        value: expected
      })

      const testData = [
        { timestamp: '12345', value: 'Value1' },
        { timestamp: '12345', value: 'Value2' }
      ]
      const actual = mvu.getValuesAsCSVString(testData)
      addContext(this, {
        title: 'actual output',
        value: actual
      })

      assert.deepEqual(actual, expected, 'Result does not match expectations')
    })
  })
})
