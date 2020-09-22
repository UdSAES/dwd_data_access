// SPDX-FileCopyrightText: 2018 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

'use strict'

const util = require('util')
const fs = require('fs-extra')
const _ = require('lodash')
const path = require('path')
const Parallel = require('async-parallel')
const grib2 = require('./grib2')
const moment = require('moment')
const assert = require('assert')
const delay = require('delay')
const { VError } = require('verror')

const VOIS_CONFIG_PATH = './config/vois.json'
const POIS_CONFIG_PATH = './config/pois.json'

// Instantiate logger
const processenv = require('processenv')
const LOG_LEVEL = String(processenv('LOG_LEVEL') || 'info')

var bunyan = require('bunyan')
var log = bunyan.createLogger({
  name: 'poi_forecast_engine',
  level: LOG_LEVEL,
  serializers: bunyan.stdSerializers
})
log.info('loaded module for caching of forecasts for specified POIs')

async function scanForNewestCosmeDe (gribBasePath, poi, forecastLength) {
  log.debug(
    'updating cached result for /poi_forecasts/cosmo_de_%d/%s',
    forecastLength,
    poi.id
  )
  assert(!_.isNil(poi))
  const lon = poi.lon
  const lat = poi.lat
  const id = poi.id
  assert(_.isNumber(lon))
  assert(_.isNumber(lat))
  assert(_.isString(id))
  assert(forecastLength === 27 || forecastLength === 45)

  // load value of interest configurations
  var voisConfig = await fs.readJson(VOIS_CONFIG_PATH)
  voisConfig = _.map(voisConfig, (item, key) => {
    item.label = key
    return item
  })

  // TODO: add support for custom calculated values of interest
  // _.remove(voisConfig, (item) => {return !_.isNil(item.isCustomCalculation)})

  var now = moment()
  var forecast = null

  // search for the newest complete 27 hours forecast within the last 24 hours (8 times 3 hours)
  for (var i = 0; i < 8; i++) {
    forecast = null

    // load the corresponding time series in parallel
    var directResults = await Parallel.map(
      voisConfig,
      async function (item) {
        if (item.isCustomCalculation === true) {
          return null
        }

        try {
          var ts = await grib2.readTimeSeriesFromGribFiles(
            now.unix(),
            { lon: lon, lat: lat },
            item.gribLabel,
            gribBasePath
          )
          if (
            item.label === 'down_solar_direct_radiation' ||
            item.label === 'down_solar_diffuse_radiation'
          ) {
            var ts_new = _.cloneDeep(ts)
            const t0 = ts[0].forecastTimestamp
            for (var j = 1; j < ts.length; j++) {
              const dt =
                (ts[j].forecastTimestamp - ts[j - 1].forecastTimestamp) / 1000
              ts_new[j].value =
                (((ts[j].forecastTimestamp - t0) / 1000) * ts[j].value -
                  ((ts[j - 1].forecastTimestamp - t0) / 1000) *
                    ts[j - 1].value) /
                dt
            }
            ts = ts_new
          }

          return {
            gribLabel: item.gribLabel,
            resultLabel: item.label,
            ts: ts
          }
        } catch (error) {
          return null
        }
      },
      1
    )

    // Check if for all vois the timeseries have been collected
    // if not, next try
    _.pull(directResults, null)

    var indirectResults = _.map(voisConfig, function (item) {
      if (item.isCustomCalculation !== true) {
        return null
      }

      if (item.label === 'wind_speed_10m_ag') {
        const zonal_wind_10m_ag = _.find(directResults, item => {
          return item.resultLabel === 'zonal_wind_10m_ag'
        })
        const meridional_wind_10m_ag = _.find(directResults, item => {
          return item.resultLabel === 'meridional_wind_10m_ag'
        })

        if (_.isNil(zonal_wind_10m_ag) || _.isNil(meridional_wind_10m_ag)) {
          return null
        }

        if (zonal_wind_10m_ag.ts.length !== meridional_wind_10m_ag.ts.length) {
          return null
        }

        const ts = []
        for (var i = 0; i < zonal_wind_10m_ag.ts.length; i++) {
          const speed = Math.sqrt(
            zonal_wind_10m_ag.ts[i].value * zonal_wind_10m_ag.ts[i].value +
              meridional_wind_10m_ag.ts[i].value *
                meridional_wind_10m_ag.ts[i].value
          )
          ts.push({
            referenceTimestamp: zonal_wind_10m_ag.ts[i].referenceTimestamp,
            forecastTimestamp: zonal_wind_10m_ag.ts[i].forecastTimestamp,
            value: speed,
            lon: zonal_wind_10m_ag.ts[i].lon,
            lat: zonal_wind_10m_ag.ts[i].lat
          })
        }

        return {
          gribLabel: item.gribLabel,
          resultLabel: item.label,
          ts: ts
        }
      } else if (item.label === 'wind_direction_10m_ag') {
        const zonal_wind_10m_ag = _.find(directResults, item => {
          return item.resultLabel === 'zonal_wind_10m_ag'
        })
        const meridional_wind_10m_ag = _.find(directResults, item => {
          return item.resultLabel === 'meridional_wind_10m_ag'
        })

        if (_.isNil(zonal_wind_10m_ag) || _.isNil(meridional_wind_10m_ag)) {
          return null
        }

        if (zonal_wind_10m_ag.ts.length !== meridional_wind_10m_ag.ts.length) {
          return null
        }

        const ts = []
        for (var i = 0; i < zonal_wind_10m_ag.ts.length; i++) {
          const zonal_wind_10m_agItem = zonal_wind_10m_ag.ts[i]
          const meridional_wind_10m_agItem = meridional_wind_10m_ag.ts[i]
          var alpha = null
          if (
            zonal_wind_10m_agItem.value === 0 &&
            meridional_wind_10m_agItem.value <= 0
          ) {
            alpha = 0
          } else if (
            zonal_wind_10m_agItem.value === 0 &&
            meridional_wind_10m_agItem.value > 0
          ) {
            alpha = 180
          } else if (
            meridional_wind_10m_agItem.value === 0 &&
            zonal_wind_10m_agItem.value > 0
          ) {
            alpha = 270
          } else if (
            meridional_wind_10m_agItem.value === 0 &&
            zonal_wind_10m_agItem.value < 0
          ) {
            alpha = 90
          } else {
            if (zonal_wind_10m_agItem.value > 0) {
              alpha =
                (Math.atan2(
                  zonal_wind_10m_agItem.value,
                  meridional_wind_10m_agItem.value
                ) *
                  180) /
                Math.PI
            } else {
              alpha =
                (Math.atan2(
                  zonal_wind_10m_agItem.value,
                  meridional_wind_10m_agItem.value
                ) *
                  180) /
                  Math.PI +
                360
            }
            alpha += 180

            if (alpha >= 360) {
              alpha -= 360
            }
          }

          ts.push({
            referenceTimestamp: zonal_wind_10m_ag.ts[i].referenceTimestamp,
            forecastTimestamp: zonal_wind_10m_ag.ts[i].forecastTimestamp,
            value: alpha,
            lon: zonal_wind_10m_ag.ts[i].lon,
            lat: zonal_wind_10m_ag.ts[i].lat
          })
        }

        return {
          gribLabel: item.gribLabel,
          resultLabel: item.label,
          ts: ts
        }
      } else {
        return null
      }
    })

    _.pull(indirectResults, null)

    var results = _.concat(directResults, indirectResults)
    if (results.length !== voisConfig.length) {
      now.subtract(3, 'hours')
      forecast = null
      continue
    }

    // Generate result object
    const referenceTimestamp = results[0].ts[0].referenceTimestamp
    forecast = {}
    forecast.sourceReference = {
      name: 'Data basis: Deutscher Wetterdienst, own elements added',
      url: 'https://www.dwd.de/EN/ourservices/opendata/opendata.html'
    }
    forecast.forecastModelType = 'COSMO_DE'
    forecast.location = {
      lon: results[0].ts[0].lon,
      lat: results[0].ts[0].lat
    }
    forecast.poi = poi
    forecast.referenceTimestamp = referenceTimestamp
    forecast.queryTimestamp = moment().valueOf()
    forecast.forecasts = []

    _.forEach(results, result => {
      const configItem = _.find(voisConfig, item => {
        return item.label === result.resultLabel
      })

      const numberOfForecastItems =
        forecastLength === 27
          ? configItem['27hForecastLength']
          : configItem['45hForecastLength']

      const fc = {
        label: configItem.label,
        unit: configItem.resultUnit,
        data: []
      }

      // only push time series if it is long enough
      _.forEach(result.ts, item => {
        if (fc.data.length >= numberOfForecastItems) {
          return
        }

        if (!_.isNil(configItem.scalingFactor)) {
          item.value *= configItem.scalingFactor
        }

        fc.data.push({
          timestamp: item.forecastTimestamp,
          value: item.value
        })
      })

      forecast.forecasts.push(fc)
    })

    var faulty = null

    // check all result objects
    _.forEach(forecast.forecasts, item => {
      const configItem = _.find(voisConfig, configItem => {
        return item.label === configItem.label
      })

      const numberOfForecastItems =
        forecastLength === 27
          ? configItem['27hForecastLength']
          : configItem['45hForecastLength']
      const forecastDt =
        forecastLength === 27
          ? configItem['27hForecastdt']
          : configItem['45hForecastdt']
      // check if data is too short
      if (item.data.length < numberOfForecastItems) {
        faulty = new Error(
          util.format(
            '%s | item.data.length < numberOfForecastItems | %d < %d',
            item.label,
            item.data.length,
            numberOfForecastItems
          )
        )
        return false
      }

      // check if intermediate point is missing
      for (var i = 0; i < item.data.length - 1; i++) {
        const diff = item.data[i + 1].timestamp - item.data[i].timestamp
        if (diff !== forecastDt) {
          faulty = new Error('diff !== forecastDt')
          return false
        }
      }
    })

    // if result is faulty, go to next iteration
    if (!_.isNil(faulty)) {
      now.subtract(3, 'hours')
      forecast = null
      continue
    }
    break
  }

  return forecast
}

exports.scanForNewestCosmeDe = scanForNewestCosmeDe

async function run (cycleWaitTime, cosmoDeGribBasePath, poiForecastBasePath) {
  assert(_.isNumber(cycleWaitTime))
  assert(cycleWaitTime > 0)
  assert(_.isString(poiForecastBasePath))

  // endless loop
  for (;;) {
    // load confiration for points of interest

    try {
      var pois = await fs.readJson(POIS_CONFIG_PATH)
    } catch (error) {
      log.error(error, `failed to read file ${POIS_CONFIG_PATH}`)
      pois = []
    }

    // iterate over all points of interest
    for (let i = 0; i < pois.length; i++) {
      const poi = pois[i]

      try {
        const forecast27h = await scanForNewestCosmeDe(
          cosmoDeGribBasePath,
          poi,
          27
        )
        await fs.ensureDir(path.join(poiForecastBasePath, poi.id))
        await fs.writeFile(
          path.join(poiForecastBasePath, poi.id, '27h_forecast.json'),
          JSON.stringify(forecast27h),
          { encoding: 'utf8' }
        )
      } catch (error) {
        log.error(error, 'failed to update cached 27h-COSMO-D2 forecasts')
      }

      try {
        const forecast45h = await scanForNewestCosmeDe(
          cosmoDeGribBasePath,
          poi,
          45
        )
        await fs.ensureDir(path.join(poiForecastBasePath, poi.id))
        await fs.writeFile(
          path.join(poiForecastBasePath, poi.id, '45h_forecast.json'),
          JSON.stringify(forecast45h),
          { encoding: 'utf8' }
        )
      } catch (error) {
        log.error(error, 'failed to update cached 45h-COSMO-D2 forecasts')
      }
    }

    log.debug(
      'waiting for ' +
        cycleWaitTime +
        ' seconds before next run of caching routine for POIs'
    )
    await delay(cycleWaitTime * 1000)
  }
}

exports.run = run
