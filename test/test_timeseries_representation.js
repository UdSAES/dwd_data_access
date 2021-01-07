// SPDX-FileCopyrightText: 2020 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

'use strict'

const describe = require('mocha').describe
const it = require('mocha').it
const assert = require('chai').assert
const addContext = require('mochawesome/addContext')
const fu = require('../lib/forecast_utils')

const tsCsv = require('../lib/timeseries_as_csv')

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
      const actual = tsCsv.getHeadElementsFromTimeseries(testData)
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
      const actual = tsCsv.getTailElementsFromTimeseries(testData)
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
      const actual = tsCsv.getValuesAsCSVString(testData)
      addContext(this, {
        title: 'actual output',
        value: actual
      })

      assert.deepEqual(actual, expected, 'Result does not match expectations')
    })
  })

  describe('Return timeseries in a period', async function () {
    it('should return the expected output', async function () {
      const expected = {
        t_2m: [
          { timestamp: 1603206000000, value: 287.45 },
          { timestamp: 1603209600000, value: 287.25 }
        ],
        pmsl: [
          { timestamp: 1603206000000, value: 100980 },
          { timestamp: 1603209600000, value: 100960 }
        ]
      }
      addContext(this, {
        title: 'expected output',
        value: expected
      })

      const testData = {
        t_2m: [
          {
            timestamp: 1603202400000,
            value: 287.75
          },
          {
            timestamp: 1603206000000,
            value: 287.45
          },
          {
            timestamp: 1603209600000,
            value: 287.25
          },
          {
            timestamp: 1603213200000,
            value: 286.85
          }
        ],
        pmsl: [
          {
            timestamp: 1603202400000,
            value: 100970
          },
          {
            timestamp: 1603206000000,
            value: 100980
          },
          {
            timestamp: 1603209600000,
            value: 100960
          },
          {
            timestamp: 1603213200000,
            value: 100950
          }
        ]
      }
      const actual = fu.shortenTimeSeriesToPeriodCosmo(testData)
      addContext(this, {
        title: 'actual output',
        value: actual
      })

      assert.deepEqual(actual, expected, 'Result does not match expectations')
    })
  })
})
