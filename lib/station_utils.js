// SPDX-FileCopyrightText: 2018 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

'use strict'

const geolib = require('geolib')

function findStationsInVicinityOf (coordinates, catalogue, radius, limit = 0) {
  // coordinates = {latitude: Float, longitude: Float} some arbitrary coordinates.
  // catalogue = stations from json, where station is one entry
  // radius = Integer() radius around my random coordinates in kilometers
  // @Review radius is optional, too!
  // limit = Integer() is max number of stations in given vicinity
  if (arguments.length === 0) {
    return [] // @Review "empty" values as a way of error handling introduces edge cases, throw instead
  }
  // @Review I think I would assume that the function call is correct and handle optional/non-
  // existent arguments at a higher level (where this function gets called)
  const radiusInMeters = radius * 1000
  const stationsInRadius = []

  // @Review readability might increase if lodash-function is used for iterating over array, i.e.
  // _.forEach(catalogue, function (stationEntry) {...})
  for (let i = 0; i < catalogue.length; i += 1) {
    const stationEntry = catalogue[i]
    const stationCoordinates = { latitude: stationEntry.location.latitude, longitude: stationEntry.location.longitude }

    if (geolib.isPointWithinRadius(stationCoordinates, coordinates, radiusInMeters)) {
      const distance = geolib.getDistance(coordinates, stationCoordinates)
      const stationObj = { station: stationEntry, distance: distance / 1000 }
      stationsInRadius.push(stationObj)
    }
  }

  stationsInRadius.sort((a, b) => a.distance - b.distance)

  if (limit > 0) {
    return stationsInRadius.slice(0, limit)
  }

  return stationsInRadius
}

exports.findStationsInVicinityOf = findStationsInVicinityOf
