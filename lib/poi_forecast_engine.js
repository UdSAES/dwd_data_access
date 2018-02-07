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

  var voisConfig = await fs.readJson(VOIS_CONFIG_PATH)

  voisConfig = _.map(voisConfig, (item, key) => {
    item.label = key
    return item
  })

  _.remove(voisConfig, (item) => {return !_.isNil(item.isCustomCalculation)})
  var now = moment('2018-01-18').add(9, 'hours')
  var forecast = null
  for (var i = 0; i < 8; i++) {
    forecast = null
    var results = await Parallel.map(voisConfig, async function (item) {
      if (item.isCustomCalculation === true) {
        return null
      }

      try {
        /*if (item.gribLabel !== 'aswdir_s') {
          return null
        }*/

        const ts = await grib2.readTimeSeriesFromGribFiles(now.unix(), {lon: lon, lat: lat}, item.gribLabel, gribBasePath)
        return {
          gribLabel: item.gribLabel,
          ts: ts
        }

      } catch (error) {

        return null
      }
    }, 1)


    results = _.pull(results, null)
    if (results.length !== voisConfig.length) {
      now.subtract(3, 'hours')
      forecast = null
      continue
    }

    const referenceTimestamp = results[0].ts[0].referenceTimestamp
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
      const configItem = _.find(voisConfig, (item) => {
        return item.gribLabel === result.gribLabel
      })

      const fc = {
        label: configItem.label,
        unit: configItem.resultUnit,
        timeseries: []
      }



      _.forEach(result.ts, (item) => {
        if (fc.timeseries.length >= configItem['27hForecastLength']) {
          return
        }

        fc.timeseries.push({
          timestamp: item.forecastTimestamp,
          value: item.value
        })
      })

      forecast.forecasts.push(fc)
    })

    var faulty = false
    _.forEach(forecast.forecasts, (item) => {

      const configItem = _.find(voisConfig, (configItem) => {
        return item.label === configItem.label
      })

      if (item.timeseries.length < configItem['27hForecastLength']) {
        faulty = true
        return false
      }

      for (var i = 0; i < item.timeseries.length - 1; i++) {
        const diff = item.timeseries[i+1].timestamp - item.timeseries[i].timestamp
        if (diff !== configItem['27hForecastdt']) {
          faulty = true
          return false
        }
      }
    })

    if (faulty) {
      now.subtract(3, 'hours')
      forecast = null
      continue
    }

    _.forEach(forecast.forecasts, (item) => {
      const configItem = _.find(voisConfig, (configItem) => {
        return item.label === configItem.label
      })

      if (configItem.scalingFactor == null) {
        return
      }

      for (var i = 0; i < item.timeseries.length; i++) {
        item.timeseries[i].value *= configItem.scalingFactor
      }
    })

    break
  }

  if (forecast === null) {
    return
  }


  await fs.writeFile(targetFilePath, JSON.stringify(forecast), {encoding: 'utf8'})  
}

exports.scanForNewestCosme27 = scanForNewestCosme27

async function run() {
  console.time('end')
  await scanForNewestCosme27('./sample_data/grib', {lon: 7.001, lat: 49.001}, '/tmp/forecast_result.json')
  console.timeEnd('end')
  console.time('end')
  await scanForNewestCosme27('./sample_data/grib', {lon: 7.001, lat: 49.001}, '/tmp/forecast_result.json')
  console.timeEnd('end')
}

run()
