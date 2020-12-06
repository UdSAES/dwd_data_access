// SPDX-FileCopyrightText: 2020 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

'use strict'

const _ = require('lodash')

function getStationIdFromUrlPath (path) {
  const splitUrl = path.split('/')
  const sid = splitUrl[2]
  return sid
}

function getVoisNamesFromQuery (query) {
  const voi = query.quantities
  const defaultParameter = ['t_2m']
  let vois = defaultParameter
  if (voi) {
    vois = voi.split(',')
  }
  return vois
}

function checkValidityOfQuantityIds (voiConfigs) {
  const voiExists = []
  _.forEach(voiConfigs, function (voiConfig) {
    if (_.isNil(_.get(voiConfig, ['target', 'key']))) {
      voiExists.push(false)
    } else {
      voiExists.push(true)
    }
  })
  return voiExists
}

exports.getStationIdFromUrlPath = getStationIdFromUrlPath
exports.getVoisNamesFromQuery = getVoisNamesFromQuery
exports.checkValidityOfQuantityIds = checkValidityOfQuantityIds
