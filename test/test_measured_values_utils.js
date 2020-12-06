// SPDX-FileCopyrightText: 2020 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

'use strict'

const fs = require('fs-extra')
const describe = require('mocha').describe
const it = require('mocha').it
const assert = require('chai').assert
const addContext = require('mochawesome/addContext')

const mvu = require('../lib/measured_values_utils')
const gu = require('../lib/general_utils')
const reqU = require('../lib/request_utils.js')

describe('Validate correctness of utility functions for loading BEOB data', async function () {
  const VOIS_DATA_ACCESS_CONFIGS_PATH = './config/vois_data_access.json'
  const voiConfigs = await fs.readJson(VOIS_DATA_ACCESS_CONFIGS_PATH, {
    encoding: 'utf8'
  })

  describe('Identify unconfigured VOIs', async function () {
    const testCases = [
      { input: ['t_2m', 'pdml'], expected: [true, false] },
      { input: ['t_2m', 'pmsl', 'aswdir_s'], expected: [true, true, true] }
    ]
    testCases.forEach(function (test) {
      it('should return the expected output', async function () {
        const voisDataAccessConfigs = gu.getVoiConfigsAsArray(test.input, voiConfigs)
        const expected = test.expected
        addContext(this, {
          title: 'expected output',
          value: expected
        })

        const actual = reqU.checkValidityOfQuantityIds(voisDataAccessConfigs)
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
