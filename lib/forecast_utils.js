// SPDX-FileCopyrightText: 2020 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

'use strict'


const moment = require('moment')
const path = require('path')
const _ = require('lodash')


const cosmoD2AvailableFrom = moment.utc('2018051509', 'YYYYMMDDHH')

function getGribDirectory(referenceTimestamp, WEATHER_DATA_BASE_PATH) {
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
    gribBaseDirectory = path.join(
        WEATHER_DATA_BASE_PATH,
        'weather',
        'cosmo-d2',
        'grib'
    )
    }
    return gribBaseDirectory
}


function createDescriptionString(vois, stationId, modelRun, model, startTimestamp, endTimestamp) {
    const showStartTimestamp = moment(startTimestamp).format('YYYY-MM-DDTHH:MM')
    const showEndTimestamp = moment(endTimestamp).format('YYYY-MM-DDTHH:MM')
    return `Forecast for quantities ${vois.join(', ')} at station ${stationId} based on the ${modelRun} o'clock run of the ${model.toUpperCase()} model from ${showStartTimestamp} to ${showEndTimestamp}`
  }


function renderMeasuredValuesAsJSON (vois, stationId, modelRun, model, startTimestamp, endTimestamp, voiConfigs, timeseriesDataArray) {
    const descriptionString = createDescriptionString(vois, stationId, modelRun, model, startTimestamp, endTimestamp)
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


exports.getGribDirectory = getGribDirectory
exports.renderMeasuredValuesAsJSON = renderMeasuredValuesAsJSON
