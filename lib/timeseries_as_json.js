// SPDX-FileCopyrightText: 2020 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

'use strict'

const moment = require('moment')

function createDescriptionString (
  vois,
  stationId,
  model,
  modelRun,
  startTimestamp,
  endTimestamp
) {
  const showStartTimestamp = moment(startTimestamp)
    .tz('Europe/Berlin')
    .format('YYYY-MM-DDTHH:mmZ')
  const showEndTimestamp = moment(endTimestamp)
    .tz('Europe/Berlin')
    .format('YYYY-MM-DDTHH:mmZ')
  let description

  if (model.toLowerCase() === 'beob') {
    description = `Quantities ${vois} measured at station ${stationId} from ${showStartTimestamp} to ${showEndTimestamp}`
  } else {
    description = `Forecast for quantities ${vois.join(
      ', '
    )} at station ${stationId} based on the ${modelRun} o'clock run of the ${model.toUpperCase()} model from ${showStartTimestamp} to ${showEndTimestamp}`
  }

  return description
}

function renderTimeseriesAsJSON (
  voiConfigs,
  timeseriesDataCollection,
  vois,
  stationId,
  model,
  modelRun,
  startTimestamp,
  endTimestamp
) {
  const descriptionString = createDescriptionString(
    vois,
    stationId,
    model,
    modelRun,
    startTimestamp,
    endTimestamp
  )
  const result = {
    description: descriptionString,
    data: timeseriesDataCollection
  }

  return result
}

exports.renderTimeseriesAsJSON = renderTimeseriesAsJSON
