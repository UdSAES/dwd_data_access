// SPDX-FileCopyrightText: 2018 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

'use strict'

const spherical = require('spherical')
const _ = require('lodash')

// TODO @Georgii replace function `findClosestStation()` by..
function findStationsInVicinityOf (coordinates, catalogue, radius, limit = 0) {
  // Add field `distance` to station catalogue (code in `findClosestStation()`)

  // Filter list to those stations within the specified radius
  // - If no radius is specified, return the `limit` nearest stations
  // - If `limit` is not specified and thus defauls to 0, return the entire list

  // Sort list by distance (nearest first)

  // Return filtered and sorted list with additional property `distance`
}

// TODO @Georgii delete when `findStationsInVicinityOf` works
function findClosestStation (coordinates, catalog) {
  const latitude = coordinates.latitude
  const longitude = coordinates.longitude

  const from = [longitude, latitude]
  const distances = _.map(catalog, (station) => {
    const to = [station.location.longitude, station.location.latitude]

    return {
      station: station,
      distance: _.floor(spherical.distance(from, to) / 1000, 3) // m to km, 3 digits
    }
  })

  return _.minBy(distances, (item) => {
    return item.distance
  })
}

exports.findClosestStation = findClosestStation
