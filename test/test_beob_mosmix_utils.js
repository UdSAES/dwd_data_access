// SPDX-FileCopyrightText: 2020 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

'use strict'

// Load modules
const fs = require('fs-extra')
const path = require('path')
const it = require('mocha').it
const describe = require('mocha').describe
const assert = require('chai').assert
const moment = require('moment')

// Load functions to be tested
const parseCsvFile = require('../lib/beob_mosmix_utils.js').parseCsvFile
const readTimeseriesDataReport = require('../lib/beob_mosmix_utils.js')
  .readTimeseriesDataReport
const extractKmlFile = require('../lib/beob_mosmix_utils.js').extractKmlFile
const readTimeseriesDataMosmix = require('../lib/beob_mosmix_utils.js')
  .readTimeseriesDataMosmix

// Configuration
const TEST_DATA_BASE = path.join(__dirname, 'data', 'beob_utils', 'data')
const REFERENCE_DATA_BASE = path.join(__dirname, 'data', 'beob_utils', 'expected')

// Define unit tests
describe('BEOB-CSV. Unit Tests', function () {
  // Disable timeouts: https://mochajs.org/#timeouts
  this.timeout(0)

  describe.skip('function parseCsvFile', function () {
    it('should parse the specified .csv-file', async function () {
      const fileContent = await fs.readFile(
        path.join(
          TEST_DATA_BASE,
          'weather_reports',
          'poi',
          '20190101',
          '10704-BEOB.csv'
        ),
        { encoding: 'utf8' }
      )

      const parsedCsv = parseCsvFile(fileContent)
      console.log(parsedCsv)

      const expectedResult = await fs.readJson(
        path.join(REFERENCE_DATA_BASE, 'parseCsvFile', '20190101_10704-BEOB.json'),
        { encoding: 'utf8' }
      )
      console.log(expectedResult)
      assert.deepEqual(parsedCsv, expectedResult)
    })
  })

  describe.skip('async function readTimeseriesDataReport', function () {
    it('should extract timeseries from single .csv-file', async function () {
      const timeseries = await readTimeseriesDataReport(
        path.join(TEST_DATA_BASE, 'weather_reports'),
        moment
          .utc([2019, 0, 1])
          .startOf('day')
          .valueOf(),
        moment
          .utc([2019, 0, 1])
          .endOf('day')
          .valueOf(),
        '10704'
      )

      const expectedResult = await fs.readJson(
        path.join(
          REFERENCE_DATA_BASE,
          'readTimeseriesDataReport',
          'single',
          '20190101_10704-BEOB.json'
        ),
        { encoding: 'utf8' }
      )

      assert.deepEqual(timeseries, expectedResult)
    })
    it('should extract timeseries from multiple .csv-files', async function () {
      const timeseries = await readTimeseriesDataReport(
        path.join(TEST_DATA_BASE, 'weather_reports'),
        moment
          .utc('2018-11-19')
          .startOf('day')
          .valueOf(),
        moment
          .utc('2018-11-20')
          .endOf('day')
          .valueOf(),
        '10704'
      )

      // XXX add assertion
    })
  })

  describe.skip('async function extractKmlFile', function () {
    it('should extract .kml-file from .kmz-file', async function () {
      const fileContent = await extractKmlFile(
        path.join(
          TEST_DATA_BASE,
          'local_forecasts',
          'mos',
          '2018091203',
          '01001-MOSMIX.kmz'
        )
      )

      const expectedResult = await fs.readFile(
        path.join(REFERENCE_DATA_BASE, 'extractKmlFile', '2018091203_01001-MOSMIX.kml'),
        { encoding: 'utf8' }
      )

      assert.deepEqual(fileContent, expectedResult)
    })
  })

  describe('async function readTimeseriesDataMosmix', function () {
    it('should extract timeseries from .csv-file', async function () {
      const timeseries = await readTimeseriesDataMosmix(
        path.join(TEST_DATA_BASE, 'local_forecasts'),
        moment.utc('2018091106', 'YYYYMMDDHH').valueOf(),
        '01001'
      )

      const expectedResult = await fs.readJson(
        path.join(
          REFERENCE_DATA_BASE,
          'readTimeseriesDataMosmix',
          'csv-file',
          '2018091106_01001-MOSMIX.json'
        ),
        { encoding: 'utf8' }
      )

      assert.deepEqual(timeseries, expectedResult)
    })

    it('should throw if the .csv-file does not exist', async function () {
      try {
        await readTimeseriesDataMosmix(
          path.join(TEST_DATA_BASE, 'local_forecasts'),
          moment.utc([2018, 8, 11, 3]).valueOf(),
          'asdf'
        )
      } catch (error) {
        assert.instanceOf(error, Error, 'function does not return an instance of Error')
        assert.equal(error.code, 'ENOENT')
      }
    })

    it('should extract timeseries from .kmz-file', async function () {
      const timeseries = await readTimeseriesDataMosmix(
        path.join(TEST_DATA_BASE, 'local_forecasts'),
        moment.utc('2018091203', 'YYYYMMDDHH').valueOf(),
        '01001'
      )

      const expectedResult = await fs.readJson(
        path.join(
          REFERENCE_DATA_BASE,
          'readTimeseriesDataMosmix',
          'kmz-file',
          '2018091203_01001-MOSMIX.json'
        ),
        {
          encoding: 'utf8',
          reviver: function (key, value) {
            if (value === null) {
              return NaN
            } else {
              return value
            }
          }
        }
      )

      assert.deepEqual(timeseries, expectedResult)
    })

    it('should throw if the .kmz-file does not exist', async function () {
      try {
        await readTimeseriesDataMosmix(
          path.join(TEST_DATA_BASE, 'local_forecasts'),
          moment.utc([2018, 8, 12, 3]).valueOf(),
          'asdf'
        )
      } catch (error) {
        assert.instanceOf(error, Error, 'function does not return an instance of Error')
        assert.equal(error.code, 'ENOENT')
      }
    })
  })
})
