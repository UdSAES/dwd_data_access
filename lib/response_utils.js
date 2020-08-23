// SPDX-FileCopyrightText: 2018 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

'use strict'

function problemDetail(res, config){
  // Config is an object, contains the fields from RFC 7807 (detail, type, title, status, instance)
  res.set('Content-Type', 'application/problem+json')
  const statusCode = config.status
  res.status(statusCode).json(config)
}

exports.problemDetail = problemDetail
