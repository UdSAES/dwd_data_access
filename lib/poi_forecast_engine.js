'use strict'

const fs = require('fs-extra')
const _ = require('lodash')
const path = require('path')
const Parallel = require('async-parallel')
const grib2 = require('./grib2')
const moment = require('moment')
const assert = require('assert')

const VOIS_CONFIG_PATH = './configuration/vois.json'
async function scanForNewestCosme27(gribBasePath, poi, targetFilePath) {
  assert(!_.isNil(poi))

  const lon = poi.lon
  const lat = poi.lat

  assert(_.isNumber(lon))
  assert(_.isNumber(lat))

  const voisConfig = await fs.readJson(VOIS_CONFIG_PATH)
  var items = _.map(voisConfig, (item) => {return item})
  items = _.pull(items, (item) => {return !_.isNil(isCustomCalculation)})
  var now = moment('2018-01-18').add(9, 'hours')

  var forecast = null
  for (var i = 0; i < 8; i++) {
    forecast = null
    var results = await Parallel.map(items, async function (item) {
      if (item.isCustomCalculation === true) {
        return null
      }

      try {
        if (item.gribLabel !== 'aswdir_s') {
          return null
        }
        const ts = await grib2.readTimeSeriesFromGribFiles(now.unix(), {lon: lon, lat: lat}, item.gribLabel, gribBasePath)

        if (item.gribLabel === 'aswdir_s') {
          console.log(ts)
        }
        return {
          gribLabel: item.gribLabel,
          ts: ts
        }

      } catch (error) {

        return null
      }
    }, 1)

    results = _.pull(results, null)

    if (results.length === 0) {
      console.log('no results found')
      console.log('next try')
      now.subtract(3, 'hours')
      forecast = null
      continue
    }

    /*if (results.length !== items.length) {
      console.log('results are incomplete')
      console.log('next try')
      now.subtract(3, 'hours')
      forecast = null
      continue
    }*/

    const referenceTimestamp = results[0].ts[0].referenceTime * 1000
    forecast = {}
    forecast.forecastModelType = "COSMO_DE"
    forecast.location = {
      lon: results[0].ts[0].lon,
      lat: results[0].ts[0].lat
    }
    forecast.poi = poi
    forecast.referenceTimestamp = referenceTimestamp
    forecast.forecasts = []
    _.forEach(results, (result) => {
      const fc = {
        label: result.gribLabel,
        unit: 'NOT_DEFINED_YET',
        timeseries: []
      }

      _.forEach(result.ts, (item) => {
        if (fc.timeseries.length >= 28) {
          return
        }

        fc.timeseries.push({
          timestamp: item.referenceTime * 1000 + item.forecastHour * 3600 * 1000,
          value: item.value
        })
      })

      forecast.forecasts.push(fc)
    })

    var faulty = false
    _.forEach(forecast.forecasts, (item) => {


      if (item.timeseries.length !== 28) {
        faulty = true
        return false
      }

      for (var i = 0; i < item.timeseries.length - 1; i++) {
        const diff = item.timeseries[i+1].timestamp - item.timeseries[i].timestamp
        if (diff !== 3600 * 1000) {
          console.log('diff: ' + diff)
          console.log(item.timeseries)
          faulty = true
          return false
        }
      }
    })

    if (faulty) {
      console.log('results are faulty')
      console.log('next try')
      now.subtract(3, 'hours')
      forecast = null
      continue
    }

    break;
  }

  if (forecast === null) {
    console.log('no forecast found')
    return
  }

  await fs.writeFile(targetFilePath, JSON.stringify(forecast), {encoding: 'utf8'})
  console.log('done')
}

exports.scanForNewestCosme27 = scanForNewestCosme27

scanForNewestCosme27('./sample_data/grib', {lon: 7.001, lat: 49.501}, '/tmp/forecast_result.json')
