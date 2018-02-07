'use strict'

const _ = require('lodash')
const su = require('../lib/station_utils')
const moment = require('moment')
const grib2 = require('../lib/grib2')

const path = require('path')
const fs = require('fs-extra')


async function getWindSpeed(time_start, {longitude: longitude, latitude: latitude}, gribBasePath) {
  var u_10m = await grib2.readTimeSeriesFromGribFiles(time_start, {longitude: longitude, latitude: latitude}, 'u_10m', gribBasePath)
  var v_10m = await grib2.readTimeSeriesFromGribFiles(time_start, {longitude: longitude, latitude: latitude}, 'v_10m', gribBasePath)
  const result = []
  _.forEach(u_10m, (u_10mItem) => {
    const v_10mItem = _.find(v_10m, (v_10mItem) => {
      return v_10mItem.verificationTime == u_10mItem.verificationTime
    })

    if (_.isNil(v_10mItem)) {
      return
    }

    const speed = Math.sqrt(u_10mItem.value * u_10mItem.value + v_10mItem.value * v_10mItem.value)
    result.push({
      referenceTime: u_10mItem.referenceTime,
      verificationTime: u_10mItem.verificationTime,
      value: speed
    })
  })

  return result
}

async function getWindDirection(time_start, {longitude: longitude, latitude: latitude}, gribBasePath) {
  var u_10m = await grib2.readTimeSeriesFromGribFiles(time_start, {longitude: longitude, latitude: latitude}, 'u_10m', gribBasePath)
  var v_10m = await grib2.readTimeSeriesFromGribFiles(time_start, {longitude: longitude, latitude: latitude}, 'v_10m', gribBasePath)
  const result = []
  _.forEach(u_10m, (u_10mItem) => {
    const v_10mItem = _.find(v_10m, (v_10mItem) => {
      return v_10mItem.verificationTime == u_10mItem.verificationTime
    })

    if (_.isNil(v_10mItem)) {
      return
    }

    var alpha = null
    if (u_10mItem.value === 0 && v_10mItem.value <= 0) {
      alpha = 0
    } else if (u_10mItem.value === 0 && v_10mItem.value > 0) {
      alpha = 180
    } else if (v_10mItem.value === 0 && u_10mItem.value > 0) {
      alpha = 270
    } else if (v_10mItem.value === 0 && u_10mItem.value < 0) {
      alpha = 90
    } else {
      console.log(u_10mItem.value)
      console.log(v_10mItem.value)
      if (u_10mItem.value > 0) {
        alpha = Math.atan2(u_10mItem.value, v_10mItem.value) * 180 / Math.PI
      } else {
        alpha = Math.atan2(u_10mItem.value, v_10mItem.value) * 180 / Math.PI + 360
      }
      alpha += 180

      if (alpha >= 360) {
        alpha -= 360
      }
      console.log('alpha: ' + alpha)

    }

    result.push({
      referenceTime: u_10mItem.referenceTime,
      verificationTime: u_10mItem.verificationTime,
      value: alpha
    })
  })

  return result
}

function getForecasts27(dataRootPath, voisConfiguration) {
  return async function (req, res, next) {
    // ToDo: return real world
    return
  }
}

function getForecastsComplete(dataRootPath, voisConfiguration) {
  return async function (req, res, next) {
    console.log('req.params')
    console.log(req.params)
    console.log('...')
    res.end()
    return

    const body = req.body
    const time_start = body.time_start
    const longitude = body.position.longitude
    const latitude = body.position.latitude
    var voi = body.voi

    const voiConfiguration = voisConfiguration[voi]

    if (_.isNil(voiConfiguration)) {
      res.status(404).send(error)
      res.end()
      return
    }

    const gribLabel = voiConfiguration.gribLabel
    const resultUnit = voiConfiguration.resultUnit
    const scalingFactor = voiConfiguration.scalingFactor

    try {

    } catch (error) {
      res.status(404)
      res.send('no prognosis data available')
      res.end()
    }

    try {
      if (voi === 'wind speed') {
        var gribResults = await getWindSpeed(time_start, {longitude: longitude, latitude: latitude}, path.join(dataRootPath, 'grib'))
      } else if (voi === 'wind direction') {
        var gribResults = await getWindDirection(time_start, {longitude: longitude, latitude: latitude}, path.join(dataRootPath, 'grib'))
      } else  {
        var gribResults = await grib2.readTimeSeriesFromGribFiles(time_start, {longitude: longitude, latitude: latitude}, gribLabel, path.join(dataRootPath, 'grib'))
      }
    } catch (error) {
      res.status(404).send(error)
      res.end()
      return
    }

    const resultObject = {
      unit: resultUnit,
      label: voi,
      aggregationMethod: 'sampled',
      data: []
    }

    _.forEach(gribResults, (gribItem) => {
      if (_.isNil(scalingFactor)) {
        scalingFactor = 1
      }

      resultObject.data.push({
        timestamp: gribItem.referenceTime + 3600 * gribItem.forecastHour,
        value: gribItem.value * scalingFactor
      })
    })

    res.status(200).send(resultObject)
    res.end()
    return
  }
}

function postForecast(dataRootPath, voisConfiguration) {
  return async function (req, res, next) {
    const body = req.body
    const time_start = body.time_start
    const longitude = body.position.longitude
    const latitude = body.position.latitude
    var voi = body.voi

    const voiConfiguration = voisConfiguration[voi]

    if (_.isNil(voiConfiguration)) {
      res.status(404).send(error)
      res.end()
      return
    }

    const gribLabel = voiConfiguration.gribLabel
    const resultUnit = voiConfiguration.resultUnit
    const scalingFactor = voiConfiguration.scalingFactor

    try {

    } catch (error) {
      res.status(404)
      res.send('no prognosis data available')
      res.end()
    }

    try {
      if (voi === 'wind speed') {
        var gribResults = await getWindSpeed(time_start, {longitude: longitude, latitude: latitude}, path.join(dataRootPath, 'grib'))
      } else if (voi === 'wind direction') {
        var gribResults = await getWindDirection(time_start, {longitude: longitude, latitude: latitude}, path.join(dataRootPath, 'grib'))
      } else  {
        var gribResults = await grib2.readTimeSeriesFromGribFiles(time_start, {longitude: longitude, latitude: latitude}, gribLabel, path.join(dataRootPath, 'grib'))
      }
    } catch (error) {
      res.status(404).send(error)
      res.end()
      return
    }

    const resultObject = {
      unit: resultUnit,
      label: voi,
      aggregationMethod: 'sampled',
      data: []
    }

    _.forEach(gribResults, (gribItem) => {
      if (_.isNil(scalingFactor)) {
        scalingFactor = 1
      }

      resultObject.data.push({
        timestamp: gribItem.referenceTime + 3600 * gribItem.forecastHour,
        value: gribItem.value * scalingFactor
      })
    })

    res.status(200).send(resultObject)
    res.end()
    return
  }
}

function getPoiForecastsCosmeDe27Poi (dataRootPath, voisConfiguration) {
  return async function (req, res, next) {
    console.log('request1')
    console.log(JSON.stringify(req.params))

    const fileContent = await fs.readFile('/tmp/forecast_result.json', {encoding: 'utf8'})

    res.status(200).send(JSON.parse(fileContent))
    res.end()
    return

    /*const voiConfiguration = voisConfiguration[voi]

    if (_.isNil(voiConfiguration)) {
      res.status(404).send(error)
      res.end()
      return
    }*/
  }
}
exports.getForecastsComplete = getForecastsComplete
exports.postForecast = postForecast
exports.getPoiForecastsCosmeDe27Poi = getPoiForecastsCosmeDe27Poi
