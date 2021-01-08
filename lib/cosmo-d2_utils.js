// SPDX-FileCopyrightText: 2018 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

'use strict'

const path = require('path')
const moment = require('moment')

const cd2f = require('./cosmo-d2_functions')
const su = require('./stations_utils')
const log = require('./logger')

// Find specific model run closest to given timestamp, formatted as epoch/milliseconds
function findClosestReferenceTimestamp (timestamp, modelRun) {
  const dayDateTimeString = moment.utc(timestamp).format('YYYYMMDDTHH')

  const closestModelRunTimestampSameDate =
    moment.utc(timestamp).format('YYYYMMDD') + 'T' + modelRun

  if (moment(dayDateTimeString).isAfter(moment(closestModelRunTimestampSameDate))) {
    // Case when timestamp is not same as modelrun time and closest modelRun timestamp is an earlier date than provided
    // E.g. 20201001T22, that means last possible modelRun for this date is not in scope
    // So the next date's timestamp with modelRun is returned
    const validTimestamp = parseInt(
      moment
        .utc(closestModelRunTimestampSameDate)
        .add(1, 'day')
        .format('x')
    )
    return validTimestamp
  } else {
    // Case when timestamp is not same as modelrun time and closest modelRun timestamp is returned
    // E.g. 20201001T10 -> 20201001T21, if 21 is modelRun (by default it is)
    const validTimestamp = parseInt(
      moment.utc(closestModelRunTimestampSameDate).format('x')
    )
    return validTimestamp
  }
}

// Get the path at which all .grib2-files containing the COSMO-D2 forecasts can be found
function getGribBaseDirectory (referenceTimestamp, WEATHER_DATA_BASE_PATH) {
  const cosmoD2AvailableFrom = moment.utc('2018051509', 'YYYYMMDDHH')

  let gribBaseDirectory = null
  if (moment.utc(referenceTimestamp).isBefore(cosmoD2AvailableFrom)) {
    gribBaseDirectory = path.join(
      WEATHER_DATA_BASE_PATH,
      'weather',
      'cosmo',
      'de',
      'grib'
    )
  } else {
    gribBaseDirectory = path.join(WEATHER_DATA_BASE_PATH, 'weather', 'cosmo-d2', 'grib')
  }
  return gribBaseDirectory
}

// Load COSMO-D2 forecast for exactly one variable from exactly one model run
async function loadCosmoD2Forecast (
  voiConfig,
  referenceTimestamp,
  lat,
  lon,
  gribBaseDirectory
) {
  let timeseriesData
  if (voiConfig.cosmo.functionType === 'loadBaseValue') {
    timeseriesData = await cd2f.loadBaseValue({
      gribBaseDirectory,
      referenceTimestamp,
      voi: voiConfig.cosmo.options.key,
      location: {
        lat,
        lon
      },
      sourceUnit: voiConfig.cosmo.options.unit,
      targetUnit: voiConfig.target.unit
    })
  } else if (voiConfig.cosmo.functionType === 'loadRadiationValue') {
    timeseriesData = await cd2f.loadRadiationValue({
      gribBaseDirectory,
      referenceTimestamp,
      voi: voiConfig.cosmo.options.key,
      location: {
        lat,
        lon
      },
      sourceUnit: voiConfig.cosmo.options.unit,
      targetUnit: voiConfig.target.unit
    })
  } else if (voiConfig.cosmo.functionType === 'load2DVectorNorm') {
    timeseriesData = await cd2f.load2DVectorNorm({
      gribBaseDirectory,
      referenceTimestamp,
      voi1: voiConfig.cosmo.options.voi1_key,
      voi2: voiConfig.cosmo.options.voi2_key,
      location: {
        lat,
        lon
      },
      sourceUnit1: voiConfig.cosmo.options.voi1_unit,
      sourceUnit2: voiConfig.cosmo.options.voi2_unit,
      targetUnit: voiConfig.target.unit
    })
  } else if (voiConfig.cosmo.functionType === 'load2DVectorAngle') {
    timeseriesData = await cd2f.load2DVectorAngle({
      gribBaseDirectory,
      referenceTimestamp,
      voi1: voiConfig.cosmo.options.voi1_key,
      voi2: voiConfig.cosmo.options.voi2_key,
      location: {
        lat,
        lon
      },
      sourceUnit1: voiConfig.cosmo.options.voi1_unit,
      sourceUnit2: voiConfig.cosmo.options.voi2_unit,
      targetUnit: voiConfig.target.unit
    })
  }

  const result = {
    label: voiConfig.target.key,
    unit: voiConfig.target.unit,
    timeseries: timeseriesData.timeseriesData,
    location: timeseriesData.location
  }
  return result
}

// Load COSMO-D2 forecasts created at model run for several variables for period of time
async function readTimeseriesDataCosmoD2 (
  WEATHER_DATA_BASE_PATH,
  voisConfigs,
  startTimestamp,
  endTimestamp,
  stationId,
  modelRun,
  stationCatalog
) {
  const stationObject = su.getStationById(stationCatalog, stationId)
  const stationLocation = su.getStationLocation(stationObject)
  const lat = stationLocation.latitude
  const lon = stationLocation.longitude

  const secInHour = 3600
  const milliseconds = 1000
  const hoursInDay = 24

  // Works with old and new directory structure.
  // TODO rewrite using moment.js-objects and  _.forEach!
  const timeseries = []
  let closestValidTimestamp = findClosestReferenceTimestamp(startTimestamp, modelRun)
  while (closestValidTimestamp <= endTimestamp) {
    const gribBaseDirectory = getGribBaseDirectory(
      closestValidTimestamp,
      WEATHER_DATA_BASE_PATH
    )
    for (let i = 0; i < voisConfigs.length; i += 1) {
      try {
        const data = await loadCosmoD2Forecast(
          voisConfigs[i],
          closestValidTimestamp,
          lat,
          lon,
          gribBaseDirectory
        )
        timeseries.push(data)
      } catch (error) {
        log.warn(error)
      }
    }
    closestValidTimestamp += hoursInDay * secInHour * milliseconds
  }
  return timeseries
}

exports.readTimeseriesDataCosmoD2 = readTimeseriesDataCosmoD2
exports.getGribBaseDirectory = getGribBaseDirectory
