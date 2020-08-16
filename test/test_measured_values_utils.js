// SPDX-FileCopyrightText: 2018 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

'use strict'

const fs = require('fs-extra')
const describe = require('mocha').describe
const before = require('mocha').before
const it = require('mocha').it
const assert = require('chai').assert
const addContext = require('mochawesome/addContext')
const mvu = require('../lib/measured_values_utils')
const _ = require('lodash')


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

  describe('Validate unconfigured vois do not pass', async function () {
    const vois = ['t_2m', 'pdml']
    const voisDataAccessConfigs = getVoiConfigsAsArray(vois)
    it('should return the expected output', async function () {
      // Read expected result from .json-file
      const expected = [true, false]
      addContext(this, {
        title: 'expected output',
        value: expected
      })

      // Parse test file (shortened to a few lines)
      const actual = mvu.ensureVoiConfigsCorrectness(voisDataAccessConfigs)
      addContext(this, {
        title: 'actual output',
        value: actual
      })

      // Check whether actual result matches expectations
      assert.deepEqual(actual, expected, 'Result does not match expectations')
    })
  })

  describe('Validate configured vois do pass', async function () {

    const vois = ['t_2m', 'pmsl', 'aswdir_s']
    const voisDataAccessConfigs = getVoiConfigsAsArray(vois)
    it('should return the expected output', async function () {
      // Read expected result from .json-file
      const expected = [true, true, true]
      addContext(this, {
        title: 'expected output',
        value: expected
      })

      // Parse test file (shortened to a few lines)
      const actual = mvu.ensureVoiConfigsCorrectness(voisDataAccessConfigs)
      addContext(this, {
        title: 'actual output',
        value: actual
      })

      // Check whether actual result matches expectations
      assert.deepEqual(actual, expected, 'Result does not match expectations')
    })
  })

})
