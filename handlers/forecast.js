'use strict'

const _ = require('lodash')
const su = require('../lib/station_utils')
const moment = require('moment')
const grib2 = require('../lib/grib2')

const path = require('path')
const fs = require('fs-extra')

function getPoiForecastsCosmeDe27Poi (poiForecastsBaseDirectory, voisConfiguration) {
  return async function (req, res, next) {
    const poi_id = req.params.poi_id
    try {
      const fileContent = await fs.readJson(path.join(poiForecastsBaseDirectory, poi_id, '27h_forecast.json'), {encoding: 'utf8'})
      res.status(200).send(fileContent)
      res.end()
      return
    } catch (error) {
      res.status(404).send(error)
      res.end()
      return
    }
  }
}

function getPoiForecastsCosmeDe45Poi (poiForecastsBaseDirectory, voisConfiguration) {
  return async function (req, res, next) {
    const poi_id = req.params.poi_id
    try {
      const fileContent = await fs.readJson(path.join(poiForecastsBaseDirectory, poi_id, '45h_forecast.json'), {encoding: 'utf8'})
      res.status(200).send(fileContent)
      res.end()
      return
    } catch (error) {
      res.status(404).send(error)
      res.end()
      return
    }
  }
}

exports.getPoiForecastsCosmeDe27Poi = getPoiForecastsCosmeDe27Poi
exports.getPoiForecastsCosmeDe45Poi = getPoiForecastsCosmeDe45Poi
