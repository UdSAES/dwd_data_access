// SPDX-FileCopyrightText: 2018 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

'use strict'

const spherical = require('spherical')
const _ = require('lodash')
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
