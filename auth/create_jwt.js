// Script to generate a JSON web token to be used for authenticating with the API

'use strict'

const fs = require('fs-extra')
const jwt = require('jsonwebtoken')

// Get key pair -- MUST be in PEM format
// The private key usually already is in PEM format, use
// `ssh-keygen -e -m pem -f id_rsa.pub` to convert the public key
const privateKey = './auth/sample_private_key.pem'
const publicKey = './auth/sample_public_key.pem'
// const privateKey = './local/jwt_private_key_nibbler.pem' // for deployment
// const publicKey = './local/jwt_public_key_nibbler.pem' // for deployment

var privateCert = fs.readFileSync(privateKey, { encoding: 'utf8' })
var publicCert = fs.readFileSync(publicKey, { encoding: 'utf8' })

// Create token and sign using the private key
const token = jwt.sign(
  {
    iss: 'UdS AES',
    sub: 'wetternachhersage.de'
  },
  privateCert,
  { algorithm: 'RS256' }
)
console.log(token)

// // Decode token without verification of signature
// const decoded = jwt.decode(token)
// console.log(decoded)

// Decode and verify token
try {
  const verified = jwt.verify(token, publicCert)
  console.log('\nverified!')
  console.log(verified)
} catch (error) {
  console.log(error)
}
