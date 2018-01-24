'use strict'

const spherical = require('spherical')
const _ = require('lodash')
function findClosestStation(coordinates, catalog) {
  const latitude = coordinates.latitude
  const longitude = coordinates.longitude

  const from = [longitude, latitude]
  const distances = _.map(catalog, (station) => {
    const to = [station.longitude, station.latitude]

    return {station: station, distance: spherical.distance(from, to)}
  })

  return _.minBy(distances, (item) => {
    return item.distance
  })
}

exports.findClosestStation = findClosestStation
