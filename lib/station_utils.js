// SPDX-FileCopyrightText: 2018 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

'use strict'

const geolib = require('geolib')

function findStationsInVicinityOf (coordinates, catalogue, radius, limit = 0) {
  // coordinates = {latitude: Float, longitude: Float} some arbitrary coordinates.
  // catalogue = stations from json, where station is one entry
  // radius = Integer() radius around my random coordinates in kilometers
  // limit = Integer() is max number of stations in given vicinity
  if (arguments.length === 0) {
    return []
  }
  const radiusInMeters = radius * 1000
  const stationsInRadius = []

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
