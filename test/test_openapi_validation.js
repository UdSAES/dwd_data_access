// SPDX-FileCopyrightText: 2020 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

const axios = require('axios')
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
  describe('GET /weather-stations as JSON', function () {
    it('should satisfy OpenAPI specification', async function () {
      const allStations = API_ORIGIN + '/weather-stations'
      const res = await axios.get(allStations, { headers: { Accept: 'application/json' } })
      expect(res.status).to.equal(200)
      assert.include(res.headers['content-type'], 'application/json')

      // Assert that the HTTP response satisfies the OpenAPI spec
      expect(res).to.satisfyApiSpec // eslint-disable-line
    })
  })

  describe('GET /weather-stations?radius=10 as JSON', function () {
    it('should satisfy OpenAPI specification', async function () {
      const filteredStationsUrl = API_ORIGIN + '/weather-stations?radius=10'
      const res = await axios.get(filteredStationsUrl, { headers: { Accept: 'application/json' } })
      expect(res.status).to.equal(200)
      assert.include(res.headers['content-type'], 'application/json')

      // Assert that the HTTP response satisfies the OpenAPI spec
      expect(res).to.satisfyApiSpec // eslint-disable-line
    })
  })

  describe('GET /weather-stations?limit=5 as JSON', function () {
    it('should satisfy OpenAPI specification', async function () {
      const filteredStationsUrl = API_ORIGIN + '/weather-stations?limit=5'
      const res = await axios.get(filteredStationsUrl, { headers: { Accept: 'application/json' } })
      expect(res.status).to.equal(200)
      assert.include(res.headers['content-type'], 'application/json')

      // Assert that the HTTP response satisfies the OpenAPI spec
      expect(res).to.satisfyApiSpec // eslint-disable-line
    })
  })

  describe('GET /weather-stations?in-vicinity-of=54.1663/7.451 as JSON', function () {
    it('should satisfy OpenAPI specification', async function () {
      const filteredStationsUrl = API_ORIGIN + '/weather-stations?in-vicinity-of=54.1663/7.451'
      const res = await axios.get(filteredStationsUrl, { headers: { Accept: 'application/json' } })
      expect(res.status).to.equal(200)
      assert.include(res.headers['content-type'], 'application/json')

      // Assert that the HTTP response satisfies the OpenAPI spec
      expect(res).to.satisfyApiSpec // eslint-disable-line
    })
  })

  describe('GET /weather-stations?in-vicinity-of=54.1663/7.451&radius=10 as JSON', function () {
    it('should satisfy OpenAPI specification', async function () {
      const filteredStationsUrl = API_ORIGIN + '/weather-stations?in-vicinity-of=54.1663/7.451&radius=10'
      const res = await axios.get(filteredStationsUrl, { headers: { Accept: 'application/json' } })
      expect(res.status).to.equal(200)
      assert.include(res.headers['content-type'], 'application/json')

      // Assert that the HTTP response satisfies the OpenAPI spec
      expect(res).to.satisfyApiSpec // eslint-disable-line
    })
  })

  describe('GET /weather-stations?in-vicinity-of=54.1663/7.451&limit=5 as JSON', function () {
    it('should satisfy OpenAPI specification', async function () {
      const filteredStationsUrl = API_ORIGIN + '/weather-stations?in-vicinity-of=54.1663/7.451&limit=5'
      const res = await axios.get(filteredStationsUrl, { headers: { Accept: 'application/json' } })
      expect(res.status).to.equal(200)
      assert.include(res.headers['content-type'], 'application/json')

      // Assert that the HTTP response satisfies the OpenAPI spec
      expect(res).to.satisfyApiSpec // eslint-disable-line
    })
  })

  describe('GET /weather-stations?in-vicinity-of=54.1663/7.451&radius=100&limit=5 as JSON', function () {
    it('should satisfy OpenAPI specification', async function () {
      const filteredStationsUrl = API_ORIGIN + '/weather-stations?in-vicinity-of=54.1663/7.451&radius=100&limit=5'
      const res = await axios.get(filteredStationsUrl, { headers: { Accept: 'application/json' } })
      expect(res.status).to.equal(200)
      assert.include(res.headers['content-type'], 'application/json')

      // Assert that the HTTP response satisfies the OpenAPI spec
      expect(res).to.satisfyApiSpec // eslint-disable-line
    })
  })

  describe('GET /weather-stations as CSV', function () {
    it('should return `200 OK`', async function () {
      const allStations = API_ORIGIN + '/weather-stations'
      const res = await axios.get(allStations, { headers: { Accept: 'text/csv' } })

      expect(res.status).to.equal(200)
      assert.include(res.headers['content-type'], 'text/csv')
    })
  })

  describe('GET /weather-stations?limit=5 as CSV', function () {
    it('should return `200 OK`', async function () {
      const filteredStationsUrl = API_ORIGIN + '/weather-stations?limit=5'
      const res = await axios.get(filteredStationsUrl, { headers: { Accept: 'text/csv' } })

      expect(res.status).to.equal(200)
      assert.include(res.headers['content-type'], 'text/csv')
    })
  })
})
