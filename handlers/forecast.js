// SPDX-FileCopyrightText: 2018 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

'use strict'

const path = require('path')
const fs = require('fs-extra')
const processenv = require('processenv')
var bunyan = require('bunyan')

// Instantiate logger
const LOG_LEVEL = String(processenv('LOG_LEVEL') || 'info')
var log = bunyan.createLogger({
  name: 'handler_cached_data_access',
  serializers: bunyan.stdSerializers,
  level: LOG_LEVEL
})
log.info('loaded module for handling requests for pre-calculated/cached data')

function getPoiForecastsCosmeDe27Poi (poiForecastsBaseDirectory, voisConfiguration) {
  return async function (req, res, next) {
    const poiID = req.params.poi_id
    try {
      const filePath = path.join(poiForecastsBaseDirectory, poiID, '27h_forecast.json')
      const fileContent = await fs.readJson(filePath, { encoding: 'utf8' }) // FIXME successfull even if `null` -- wrong
      res.status(200).send(fileContent)
      res.end()
      req.log.info(
        { res: res },
        `successfully handled ${req.method}-request on ${req.path}`
      )
      return
    } catch (error) {
      res.status(404).send(error)
      res.end()
      req.log.warn(
        { err: error, res: res },
        `error while handling ${req.method}-request on ${req.path}`
      )
    }
  }
}

function getPoiForecastsCosmeDe45Poi (poiForecastsBaseDirectory, voisConfiguration) {
  return async function (req, res, next) {
    const poiID = req.params.poi_id
    try {
      const filePath = path.join(poiForecastsBaseDirectory, poiID, '45h_forecast.json')
      const fileContent = await fs.readJson(filePath, { encoding: 'utf8' }) // FIXME successfull even if `null` -- wrong
      res.status(200).send(fileContent)
      res.end()
      req.log.info(
        { res: res },
        `successfully handled ${req.method}-request on ${req.path}`
      )
      return
    } catch (error) {
      res.status(404).send(error)
      res.end()
      req.log.warn(
        { err: error, res: res },
        `error while handling ${req.method}-request on ${req.path}`
      )
    }
  }
}

exports.getPoiForecastsCosmeDe27Poi = getPoiForecastsCosmeDe27Poi
exports.getPoiForecastsCosmeDe45Poi = getPoiForecastsCosmeDe45Poi
