// SPDX-FileCopyrightText: 2018 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

const geolib = require('geolib')
const ArrayKeyedMap = require('array-keyed-map')
const _ = require('lodash')

// Helper functions

const haveSameTypes = (args, key) => {
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] !== key[i]) {
      return false
    }
  }
  return true
}

function getStationLocation (station) {
  return { latitude: station.location.latitude, longitude: station.location.longitude }
}

function inKilometers (distance) {
  return distance / 1000
}

function inMeters (radius) {
  return radius * 1000
}

function sortByName (stations) {
  return stations.sort((a, b) => a.name.localeCompare(b.name))
}

function sortStationsByDistance (stations) {
  return stations.sort((a, b) => a.distance - b.distance)
}

function sortStationsByName (stations) {
  return sortByName(stations)
}

// Callback functions

function sortStationsByNameApplyLimit (stations, coordinates, radius, limit) {
  if (limit > 0) {
    return sortByName(stations).slice(0, limit)
  }
  return sortByName(stations)
}

function findStationsAroundCoordinates (stations, coordinates, radius, limit) {
  const stationObjects = []
  _.forEach(stations, function (stationEntry) {
    const stationLocation = getStationLocation(stationEntry)
    const dist = geolib.getDistance(coordinates, stationLocation)
    const stationObj = { station: stationEntry, distance: inKilometers(dist) }
    stationObjects.push(stationObj)
  })
  return sortStationsByDistance(stationObjects)
}

function sortStationsByDistanceApplyLimit (stations, coordinates, radius, limit) {
  const stationsList = findStationsAroundCoordinates(stations, coordinates)
  if (limit > 0) {
    return stationsList.slice(0, limit)
  } else {
    return stationsList
  }
}

function findStaionsInRadiusAroundCoordinates (stations, coordinates, radius, limit) {
  const radiusInMeters = inMeters(radius)
  const stationsInRadius = []

  _.forEach(stations, function (stationEntry) {
    const stationLocation = getStationLocation(stationEntry)
    const dist = geolib.getDistance(coordinates, stationLocation)
    if (geolib.isPointWithinRadius(stationLocation, coordinates, radiusInMeters)) {
      const distance = geolib.getDistance(coordinates, stationLocation)
      const stationObj = { station: stationEntry, distance: inKilometers(dist) }
      stationsInRadius.push(stationObj)
    }
  })
  return sortStationsByDistance(stationsInRadius)
}

function sortStationsByDistanceApplyRadius (stations, coordinates, radius, limit) {
  return findStaionsInRadiusAroundCoordinates(stations, coordinates, radius)
}

function sortStationsByDistanceApplyRadiusAndLimit (stations, coordinates, radius, limit) {
  const stationsList = sortStationsByDistanceApplyRadius(stations, coordinates, radius)
  if (limit > 0) {
    return stationsList.slice(0, limit)
  } else {
    return stationsList
  }
}

// Declaration of a contoller: which function to use according to the arguments passed

const dispatcher = new ArrayKeyedMap()
//                    vicinity, radius, limit
dispatcher.set(['undefined', 'undefined', 'undefined'], () => sortStationsByName)
dispatcher.set(['undefined', 'undefined', 'number'], () => sortStationsByNameApplyLimit)
dispatcher.set(['undefined', 'number', 'undefined'], () => sortStationsByName)
dispatcher.set(['undefined', 'number', 'number'], () => sortStationsByNameApplyLimit)
dispatcher.set(['object', 'undefined', 'undefined'], () => findStationsAroundCoordinates)
dispatcher.set(['object', 'undefined', 'number'], () => sortStationsByDistanceApplyLimit)
dispatcher.set(['object', 'number', 'undefined'], () => sortStationsByDistanceApplyRadius)
dispatcher.set(['object', 'number', 'number'], () => sortStationsByDistanceApplyRadiusAndLimit)

function returnProperCallback (coordinates, radius, limit) {
  const args = Object.values(arguments)
  const argTypes = args.map(item => typeof (item))
  const dispatcherKeys = Array.from(dispatcher.keys())
  for (let i = 0; i < dispatcherKeys.length; i += 1) {
    if (haveSameTypes(argTypes, dispatcherKeys[i])) {
      const callbackFunc = dispatcher.get(dispatcherKeys[i])
      return callbackFunc()
    }
  }
}

function findStationsInVicinityOf (catalogue, coordinates, radius, limit) {
  const callback = returnProperCallback(coordinates, radius, limit)
  return callback(catalogue, coordinates, radius, limit)
}

exports.findStationsInVicinityOf = findStationsInVicinityOf
