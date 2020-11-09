// SPDX-FileCopyrightText: 2020 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

'use strict'

const csv = require('dwd-csv-helper')
const moment = require('moment')
const path = require('path')
const _ = require('lodash')
const gu = require('../lib/general_utils.js')
const su = require('../lib/station_utils.js')
const gf = require('../lib/grib_functions')
const bunyan = require('bunyan')
const log = bunyan.createLogger({
  name: 'dwd-csv-handler',
  serializers: bunyan.stdSerializers
})

const secInHour = 3600
const milliseconds = 1000
const hoursInDay = 24

const cosmoD2AvailableFrom = moment.utc('2018051509', 'YYYYMMDDHH')

function getGribDirectory (referenceTimestamp, WEATHER_DATA_BASE_PATH) {
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

function createDescriptionString (
  vois,
  stationId,
  modelRun,
  model,
  startTimestamp,
  endTimestamp
) {
  const showStartTimestamp = moment(startTimestamp).format('YYYY-MM-DDTHH:MM')
  const showEndTimestamp = moment(endTimestamp).format('YYYY-MM-DDTHH:MM')
  return `Forecast for quantities ${vois.join(
    ', '
  )} at station ${stationId} based on the ${modelRun} o'clock run of the ${model.toUpperCase()} model from ${showStartTimestamp} to ${showEndTimestamp}`
}

function renderJSONCosmoMosmix (
  vois,
  stationId,
  modelRun,
  model,
  startTimestamp,
  endTimestamp,
  voiConfigs,
  timeseriesDataArray
) {
  const descriptionString = createDescriptionString(
    vois,
    stationId,
    modelRun,
    model,
    startTimestamp,
    endTimestamp
  )
  const result = {
    description: descriptionString,
    data: []
  }

  _.forEach(voiConfigs, (voiConfig) => {
    result.data.push({
      label: voiConfig.target.key,
      unit: voiConfig.target.unit,
      timeseries: timeseriesDataArray[voiConfig.target.key]
    })
  })

  return result
}

function deriveCsvFilePath (csvBasePath, type, timestamp, stationId, modelRun) {
  // No test for this function
  let formatString
  let contentType
  let extension
  let subdir

  if (type === 'REPORT') {
    formatString = 'YYYYMMDD'
    contentType = 'BEOB'
    extension = '.csv'
    subdir = 'poi'
  } else if (type === 'MOSMIX_KMZ') {
    formatString = 'YYYYMMDDHH'
    contentType = 'MOSMIX'
    extension = '.kmz'
    subdir = 'mos'
  } else {
    formatString = 'YYYYMMDDHH'
    contentType = 'MOSMIX'
    extension = '.csv'
    subdir = 'poi'
  }

  const dayDateTimeString =
    moment
      .utc(timestamp)
      .format(formatString)
      .slice(0, -2) + modelRun
  const fileName = stationId + '-' + contentType + extension

  return path.join(csvBasePath, subdir, dayDateTimeString, fileName)
}

async function getMosmixDataDirectories (
  mosmixBasePath,
  startTimestamp,
  endTimestamp,
  stationId,
  modelRun
) {
  // No test for this function
  const result = []
  let timestamp = startTimestamp - secInHour * milliseconds
  while (timestamp <= endTimestamp) {
    // Timestamp is increased by 24 hours in iteration
    // Model-run is explicitly += to the dayDateTimeString
    const filePath = deriveCsvFilePath(
      mosmixBasePath,
      'MOSMIX_KMZ',
      timestamp,
      stationId,
      modelRun
    )
    result.push(filePath)
    timestamp += hoursInDay * secInHour * milliseconds
  }
  return [...new Set(result)]
}

async function readMosmixTimeseriesData (
  mosmixBasePath,
  voiConfigs,
  startTimestamp,
  endTimestamp,
  stationId,
  modelRun,
  stationCatalog
) {
  // No test for this function
  const resultArray = []
  const mosmixFiles = await getMosmixDataDirectories(
    mosmixBasePath,
    startTimestamp,
    endTimestamp,
    stationId,
    modelRun
  )
  for (let i = 0; i < mosmixFiles.length; i += 1) {
    const filePath = mosmixFiles[i]
    try {
      const fileContent = await csv.extractKmlFile(filePath)
      const result = await csv.parseKmlFile(fileContent)
      resultArray.push(result)
    } catch (error) {
      log.warn(error, `failed to extract the .kml-file from ${filePath}`)
    }
  }
  return resultArray
}

function renderForecastCSVCosmoMosmix (voiConfigs, timeseriesDataArray) {
  const csvLabels = gu.getCSVLabels(voiConfigs, timeseriesDataArray)
  const csvStrings = gu.getStringsFromStationDataPayload(timeseriesDataArray)
  return csvLabels + csvStrings.join('\n')
}

function dropTimeseriesDataNotOfInteresWithParameter (
  voiConfigs,
  timeseriesDataCollection,
  parameter
) {
  const result = []
  const keys = _.map(voiConfigs, function (o) {
    return o[parameter].key
  })
  _.forEach(timeseriesDataCollection, (timeseriesDataItem) => {
    result.push(_.pick(timeseriesDataItem, keys))
  })
  return result
}

function checkIfValidModelRun (allowed, modelRun) {
  return allowed.includes(modelRun)
}

function getConfigFromModel (model, COSMO_DATA_BASE_PATH, MOSMIX_DATA_BASE_PATH) {
  if (model === 'mosmix') {
    return {
      model: 'mosmix',
      allowedModelRuns: ['03', '09', '15', '21'],
      functionToReadData: readMosmixTimeseriesData,
      MODEL_DATA_PATH: MOSMIX_DATA_BASE_PATH,
      unitsConverter: gu.convertUnitsForMosmix,
      jsonRenderer: renderJSONCosmoMosmix,
      csvRenderer: renderForecastCSVCosmoMosmix
    }
  } else if (model === 'cosmo-d2') {
    return {
      model: 'cosmo-d2',
      allowedModelRuns: ['00', '03', '06', '09', '12', '15', '18', '21'],
      functionToReadData: readDataCosmoD2,
      MODEL_DATA_PATH: COSMO_DATA_BASE_PATH,
      unitsConverter: gu.convertUnitsForCosmo,
      jsonRenderer: renderJSONCosmoMosmix,
      csvRenderer: renderForecastCSVCosmoMosmix
    }
  } else {
    return {}
  }
}

function findClosestValidTimestamp (timestamp, modelRun) {
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

async function loadCosmoData (
  voiConfig,
  referenceTimestamp,
  lat,
  lon,
  gribBaseDirectory
) {
  let timeseriesData
  if (voiConfig.cosmo.functionType === 'loadBaseValue') {
    timeseriesData = await gf.loadBaseValue({
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
    timeseriesData = await gf.loadRadiationValue({
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
    timeseriesData = await gf.load2DVectorNorm({
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
    timeseriesData = await gf.load2DVectorAngle({
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
    data: timeseriesData.timeseriesData,
    location: timeseriesData.location
  }
  return result
}

async function readDataCosmoD2 (
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

  // Works with old and new directory structure.
  const timeseries = []
  let closestValidTimestamp = findClosestValidTimestamp(startTimestamp, modelRun)
  while (closestValidTimestamp <= endTimestamp) {
    const gribBaseDirectory = getGribDirectory(
      closestValidTimestamp,
      WEATHER_DATA_BASE_PATH
    )
    for (let i = 0; i < voisConfigs.length; i += 1) {
      try {
        const data = await loadCosmoData(
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

exports.getGribDirectory = getGribDirectory
exports.renderJSONCosmoMosmix = renderJSONCosmoMosmix
exports.readMosmixTimeseriesData = readMosmixTimeseriesData
exports.renderForecastCSVCosmoMosmix = renderForecastCSVCosmoMosmix
exports.dropTimeseriesDataNotOfInteresWithParameter = dropTimeseriesDataNotOfInteresWithParameter
exports.checkIfValidModelRun = checkIfValidModelRun
exports.getConfigFromModel = getConfigFromModel
exports.readDataCosmoD2 = readDataCosmoD2
exports.loadCosmoData = loadCosmoData
