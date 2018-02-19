'use strict'

const jwt = require('jsonwebtoken')
const fs = require('fs-extra')

var cert = fs.readFileSync('./sample_data/sample_private_key.pem')
jwt.sign({sub: 'test1@msaas.me'}, cert, {algorithm: 'RS256'}, function(error, data) {
  if (error != null) {
    console.log(error)
    return
  }

  console.log(data)
})
