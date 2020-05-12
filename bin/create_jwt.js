'use strict'

const jwt = require('jsonwebtoken')
const fs = require('fs-extra')

// Get key pair -- MUST be in PEM format
// The private key usally already is in PEM format, use
// `ssh-keygen -e -m pem -f id_rsa.pub` to convert the public key
// const privateKey = './sample_data/sample_private_key.pem'
const privateKey = './local/jwt_private_key_nibbler.pem'
const publicKey = './local/jwt_public_key_nibbler.pem'

var privateCert = fs.readFileSync(privateKey, { encoding: 'utf8' })
var publicCert = fs.readFileSync(publicKey, { encoding: 'utf8' })

// Create token and sign using the private key
const token = jwt.sign(
  {
    iss: 'UdS AES',
    sub: 'UdS AES'
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
