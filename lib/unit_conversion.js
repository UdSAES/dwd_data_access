// SPDX-FileCopyrightText: 2018 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

'use strict'
const assert = require('assert')
const _ = require('lodash')

const dictionary = [{
  su: '°C',
  tu: 'K',
  cf: function (v) {
    return v + 273.15
  }
},
{
  su: 'K',
  tu: '°C',
  cf: function (v) {
    return v - 273.15
  }
},
{
  su: 'hPa',
  tu: 'Pa',
  cf: function (v) {
    return v * 100
  }
},
{
  su: 'Pa',
  tu: 'hPa',
  cf: function (v) {
    return v / 100
  }
},
{
  su: '%',
  tu: '1',
  cf: function (v) {
    return v / 100
  }
},
{
  su: '1',
  tu: '%',
  cf: function (v) {
    return v * 100
  }
},
{
  su: 'kW/m²',
  tu: 'W/m²',
  cf: function (v) {
    return v * 1000
  }
},
{
  su: 'W/m²',
  tu: 'kW/m²',
  cf: function (v) {
    return v / 1000
  }
},
{
  su: 'kJ/m²',
  tu: 'W/m²',
  cf: function (v) {
    return v * (10 / 36)
  }
},
{
  su: 'W/m²',
  tu: 'kJ/m²',
  cf: function (v) {
    return v * (36 / 10)
  }
},
{
  su: 'km/h',
  tu: 'm/s',
  cf: function (v) {
    return v / 3.6
  }
},
{
  su: 'm/s',
  tu: 'km/h',
  cf: function (v) {
    return v * 3.6
  }
}
]

function convertUnit (value, sourceUnit, targetUnit) {
  assert(_.isString(sourceUnit))
  assert(_.isString(targetUnit))

  if (!_.isNumber(value) || isNaN(value)) {
    return value
  }

  // no conversion
  if (sourceUnit === targetUnit) {
    return value
  }

  const di = _.find(dictionary, (di) => {
    return di.su === sourceUnit && di.tu === targetUnit
  })

  if (_.isNil(di)) {
    return value
  }

  return di.cf(value)
}

exports.convertUnit = convertUnit
exports.dictionary = dictionary
