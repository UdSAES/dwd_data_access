// SPDX-FileCopyrightText: 2020 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

'use strict'

const _ = require('lodash')
const fs = require('fs-extra')
const describe = require('mocha').describe
const it = require('mocha').it
const assert = require('chai').assert
const addContext = require('mochawesome/addContext')

const gu = require('../lib/general_utils')
const reqU = require('../lib/request_utils.js')

describe('Validate correctness of utility functions for processing timeseries data', async function () {
  describe('Identify unconfigured VOIs', async function () {
    const testCases = [
      { input: ['t_2m', 'pdml'], expected: [true, false] },
      { input: ['t_2m', 'pmsl', 'aswdir_s'], expected: [true, true, true] }
    ]
    _.forEach(testCases, async function (test) {
      it('should return the expected output', async function () {
        const VOIS_DATA_ACCESS_CONFIGS_PATH = './config/vois_data_access.json'
        const voiConfigs = await fs.readJson(VOIS_DATA_ACCESS_CONFIGS_PATH, {
          encoding: 'utf8'
        })
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

  describe('Limit extent of timeseries to period', async function () {
    it('should return the expected output', async function () {
      const from = 1603206000000
      const to = 1603209600000

      const expected = [
        {
          timeseries: [
            { timestamp: from, value: 287.45 },
            { timestamp: to, value: 287.25 }
          ],
          label: 't_2m'
        },
        {
          timeseries: [
            { timestamp: from, value: 100980 },
            { timestamp: to, value: 100960 }
          ],
          label: 'pmsl'
        }
      ]
      addContext(this, {
        title: 'expected output',
        value: expected
      })

      const testData = [
        {
          timeseries: [
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
          label: 't_2m'
        },
        {
          timeseries: [
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
          ],
          label: 'pmsl'
        }
      ]
      const actual = gu.shortenTimeseriesToPeriod(testData, from, to)
      addContext(this, {
        title: 'actual output',
        value: actual
      })

      assert.deepEqual(actual, expected, 'Result does not match expectations')
    })
  })
})
