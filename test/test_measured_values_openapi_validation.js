// SPDX-FileCopyrightText: 2020 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

const axios = require('axios')
const http = require('http')
const chai = require('chai')
const expect = chai.expect
const assert = chai.assert
const describe = require('mocha').describe
const it = require('mocha').it
const processenv = require('processenv')
const chaiResponseValidator = require('chai-openapi-response-validator')

const PATH_TO_OPENAPI = processenv('PATH_TO_OPENAPI')
const API_ORIGIN = processenv('API_ORIGIN') // requires absolute path!

// Load an OpenAPI file (YAML or JSON) into this plugin
chai.use(chaiResponseValidator(PATH_TO_OPENAPI))

describe('Verify behaviour of API-instance against OAS and/or expectations', function () {
  callback = function (res) {
    expect(res.status).to.equal(200)
    assert.include(res.headers['content-type'], 'application/json')
    expect(res).to.satisfyApiSpec
  }

  describe('GET /weather-stations/10505/measured-values as JSON', function () {
    it('should satisfy OpenAPI specification', async function () {
      const options = {
        host: 'localhost',
        port: '5000',
        path: '/weather-stations/10505/measured-values',
        headers: { Accept: 'application/json' }
      }
      const res = await http.request(options, callback).end()
    })
  })

  describe('GET /weather-stations/10505/measured-values/?quantities=aswdir_s,pmsl as JSON', function () {
    it('should satisfy OpenAPI specification', async function () {
      const options = {
        host: 'localhost',
        port: '5000',
        path: '/weather-stations/10505/measured-values/?quantities=aswdir_s,pmsl',
        headers: { Accept: 'application/json' }
      }
      const res = await http.request(options, callback).end()
    })
  })

  describe('GET /weather-stations/10505/measured-values/?quantities=aswdir_s,pmsl&from=1597140000000 as JSON', function () {
    it('should satisfy OpenAPI specification', async function () {
      const options = {
        host: 'localhost',
        port: '5000',
        path: '/weather-stations/10505/measured-values/?quantities=aswdir_s,pmsl&from=1597140000000',
        headers: { Accept: 'application/json' }
      }
      const res = await http.request(options, callback).end()
    })
  })

  describe('GET /weather-stations/10505/measured-values/?quantities=aswdir_s,pmsl&to=1597147200000 as JSON', function () {
    it('should satisfy OpenAPI specification', async function () {
      const options = {
        host: 'localhost',
        port: '5000',
        path: '/weather-stations/10505/measured-values/?quantities=aswdir_s,pmsl&to=1597147200000',
        headers: { Accept: 'application/json' }
      }
      const res = await http.request(options, callback).end()
    })
  })

  describe('GET /weather-stations/10505/measured-values/?quantities=aswdir_s,pmsl&from=1597140000000&to=1597147200000 as JSON', function () {
    it('should satisfy OpenAPI specification', async function () {
      const options = {
        host: 'localhost',
        port: '5000',
        path: '/weather-stations/10505/measured-values/?quantities=aswdir_s,pmsl&from=1597140000000&to=1597147200000',
        headers: { Accept: 'application/json' }
      }
      const res = await http.request(options, callback).end()
    })
  })

  describe('GET /weather-stations/10505/measured-values/?quantities=aswdir_s,pmsl&from=1597140000000&to=1597147200000 as CSV', function () {
    it('should return `200 OK`', async function () {
      const options = {
        host: 'localhost',
        port: '5000',
        path: '/weather-stations/10505/measured-values/?quantities=aswdir_s,pmsl&from=1597140000000&to=1597147200000',
        headers: { Accept: 'application/json' }
      }

      callback = function (res) {
        expect(res.status).to.equal(200)
        assert.include(res.headers['content-type'], 'text/csv')
        expect(res).to.satisfyApiSpec
      }
      const res = await http.request(options, callback).end()
    })
  })
})
