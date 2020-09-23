// SPDX-FileCopyrightText: 2018 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

'use strict'

const _ = require('lodash')
const grib = require('dwd-grib-helper')
const { convertUnit } = require('./unit_conversion')

async function loadGribTimeseriesData (options) {
  const { gribBaseDirectory, referenceTimestamp, voi, location } = options

  const directoryPath = grib.deriveGrib2DirectoryPath(
    gribBaseDirectory,
    referenceTimestamp,
    voi
  )
  const timeseriesData = await grib.extractTimeseriesDataFromGrib2Directory(
    directoryPath,
    location
  )
  return timeseriesData
}

async function loadBaseValue (options) {
  const {
    gribBaseDirectory,
    referenceTimestamp,
    voi,
    location,
    sourceUnit,
    targetUnit
  } = options

  const timeseriesData = await loadGribTimeseriesData({
    gribBaseDirectory,
    referenceTimestamp,
    voi,
    location
  })

  const finalTimeseriesData = _.map(timeseriesData.timeseriesData, (item) => {
    return {
      timestamp: item.timestamp,
      value: convertUnit(item.value, sourceUnit, targetUnit)
    }
  })

  return {
    location: timeseriesData.location,
    timeseriesData: finalTimeseriesData
  }
}

async function loadRadiationValue (options) {
  const {
    gribBaseDirectory,
    referenceTimestamp,
    voi,
    location,
    sourceUnit,
    targetUnit
  } = options
  // console.log('options', options)
  const timeseriesDataComplete = await loadBaseValue(options)
  const timeseriesData = timeseriesDataComplete.timeseriesData
  const finalTimeseriesData = _.cloneDeep(timeseriesData)
  const t0 = timeseriesData[0].timestamp
  for (var j = 1; j < timeseriesData.length; j++) {
    const dt = (timeseriesData[j].timestamp - timeseriesData[j - 1].timestamp) / 1000
    finalTimeseriesData[j].value =
      (((timeseriesData[j].timestamp - t0) / 1000) * timeseriesData[j].value -
        ((timeseriesData[j - 1].timestamp - t0) / 1000) * timeseriesData[j - 1].value) /
      dt
  }

  return {
    location: timeseriesDataComplete.location,
    timeseriesData: finalTimeseriesData
  }
}

async function load2DVectorNorm (options) {
  const {
    gribBaseDirectory,
    referenceTimestamp,
    voi1,
    voi2,
    location,
    sourceUnit1,
    sourceUnit2,
    targetUnit
  } = options

  const tsd1 = await loadBaseValue({
    gribBaseDirectory,
    referenceTimestamp,
    voi: voi1,
    location,
    sourceUnit: sourceUnit1,
    targetUnit
  })

  const tsd2 = await loadBaseValue({
    gribBaseDirectory,
    referenceTimestamp,
    voi: voi2,
    location,
    sourceUnit: sourceUnit2,
    targetUnit
  })

  if (tsd1.timeseriesData.length !== tsd2.timeseriesData.length) {
    throw new Error('unequal length')
  }

  const ftsd = _.map(tsd1.timeseriesData, (v1, index) => {
    const v2 = tsd2.timeseriesData[index]
    if (v1.timestamp !== v2.timestamp) {
      throw new Error('unequal timestamp')
    }

    return {
      timestamp: v1.timestamp,
      value: Math.sqrt(v1.value * v1.value + v2.value * v2.value)
    }
  })

  return {
    location: tsd1.location,
    timeseriesData: ftsd
  }
}

async function load2DVectorAngle (options) {
  const {
    gribBaseDirectory,
    referenceTimestamp,
    voi1,
    voi2,
    location,
    sourceUnit1,
    sourceUnit2,
    targetUnit
  } = options

  const tsd1 = await loadBaseValue({
    gribBaseDirectory,
    referenceTimestamp,
    voi: voi1,
    location,
    sourceUnit: sourceUnit1,
    targetUnit: sourceUnit1
  })

  const tsd2 = await loadBaseValue({
    gribBaseDirectory,
    referenceTimestamp,
    voi: voi2,
    location,
    sourceUnit: sourceUnit2,
    targetUnit: sourceUnit2
  })

  if (tsd1.timeseriesData.length !== tsd2.timeseriesData.length) {
    throw new Error('unequal length')
  }

  const ftsd = _.map(tsd1.timeseriesData, (v1, index) => {
    const v2 = tsd2.timeseriesData[index]
    if (v1.timestamp !== v2.timestamp) {
      throw new Error('unequal timestamp')
    }
    const zonal_wind_10m_agItem = v1
    const meridional_wind_10m_agItem = v2
    var alpha = null

    if (v1.value === 0 && v2.value <= 0) {
      alpha = 0
    } else if (v1.value === 0 && v2.value > 0) {
      alpha = 180
    } else if (v2.value === 0 && v1.value > 0) {
      alpha = 270
    } else if (v2.value === 0 && v1.value < 0) {
      alpha = 90
    } else {
      if (v1.value > 0) {
        alpha = (Math.atan2(v1.value, v2.value) * 180) / Math.PI
      } else {
        alpha = (Math.atan2(v1.value, v2.value) * 180) / Math.PI + 360
      }
      alpha += 180

      if (alpha >= 360) {
        alpha -= 360
      }
    }

    return {
      timestamp: v1.timestamp,
      value: alpha
    }
  })

  return {
    location: tsd1.location,
    timeseriesData: ftsd
  }
}

exports.loadBaseValue = loadBaseValue
exports.loadRadiationValue = loadRadiationValue
exports.load2DVectorNorm = load2DVectorNorm
exports.load2DVectorAngle = load2DVectorAngle
