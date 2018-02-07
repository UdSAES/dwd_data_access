'use strict'

const {promisify} = require('util')
const tmp = require('tmp-promise')
const request = require('request-promise-native')
const grib2 = require('../lib/grib2')
const extract = promisify(require('extract-zip'))
const _ = require('lodash')
const fs = require('fs-extra')
const path = require('path')
const assert = require('assert')

const TEST_DATA_URL = 'http://static_file_server.agnew.msaas.me/test_data/dwd_forecast_service/sample_data.zip'
const GRIB_TEST_FILE_PATH = './2018011803/t_2m/COSMODE_single_level_elements_T_2M_2018011803_000.grib2.bz2'
const GRIB_TEST_POSITION = {longitude: 7, latitude: 49}
const VALID_GRIB_START_TIMESTAMP = 1516244400

describe('./lib/grib2.js', () => {
  var tmpDirObject
  var tmpDirPath

  before(async function() {
    this.timeout(0)
    tmpDirObject = await tmp.dir({unsafeCleanup: true})
    tmpDirPath = tmpDirObject.path

    const dataZip = await request({
      method: 'get',
      uri: TEST_DATA_URL,
      encoding: null,
      strictSSL: false,
      timeout: 120 * 1000
    })

    const tmpFileObject = await tmp.file()
    await fs.writeFile(tmpFileObject.path, dataZip, {encoding: null})
    try {
      await extract(tmpFileObject.path, {dir: tmpDirPath})
    } catch (error) {
      throw error
    } finally {
      tmpFileObject.cleanup()
    }

    const unzippedFiles =  await fs.readdir(tmpDirPath)
  })

  after(async function () {
    this.timeout(0)
    await tmpDirObject.cleanup()
  })

  describe('readTimeSeriesFromGribFiles()', () => {
    it('should read a time series from multiple grib files', async () => {
      const result = await grib2.readTimeSeriesFromGribFiles(VALID_GRIB_START_TIMESTAMP, {longitude: 7, latitude: 49}, 't_2m', path.join(tmpDirPath, 'sample_data', 'grib'))
      assert(_.isArray(result))
      assert(result.length === 46)
      _.forEach(result, (item) => {
        const keys = _.keys(item)
        assert(_.isEqual(keys.sort(), ['referenceTimestamp', 'forecastTimestamp', 'value', 'lon', 'lat'].sort()))
      })
    }).timeout(0)

    it('should return the error NO_DATA_AVAILABLE, if no data is available', async () => {
      try {
        await grib2.readTimeSeriesFromGribFiles(0, {longitude: 7, latitude: 49}, 't_2m', path.join(tmpDirPath, 'sample_data', 'grib'))
      } catch (error) {
        assert(_.isError(error))
        assert(error.name === 'NO_DATA_AVAILABLE')
        return
      }
      assert(false)
    }).timeout(0)
  })

  describe('readValueFromGrib2BzFile()', () => {
    it('should return the value from a grib file for the given position', async () => {
      const result = await grib2.readValuesFromGrib2BzFile(path.join(tmpDirPath, 'sample_data', 'grib', GRIB_TEST_FILE_PATH), GRIB_TEST_POSITION)
      _.forEach(result, (item) => {
        assert(_.isEqual(_.keys(item).sort(),['referenceTimestamp', 'forecastTimestamp', 'value', 'lon', 'lat'].sort()))
      })
    })

    it('should return an error when the file does not exist', async () => {
      try {
        await grib2.readValueFromGrib2BzFile(path.join(tmpDirPath, 'sample_data', 'grib', 'NONE_SENSE'), GRIB_TEST_POSITION)
      } catch (error) {
        assert(_.isError(error))
        return
      }
      assert(false)
    })
  })
})
