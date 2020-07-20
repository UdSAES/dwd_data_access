// SPDX-FileCopyrightText: 2020 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

const axios = require('axios')
const chai = require('chai')
const expect = chai.expect
const describe = require('mocha').describe
const it = require('mocha').it
const processenv = require('processenv')
const chaiResponseValidator = require('chai-openapi-response-validator')

const PATH_TO_OPENAPI = processenv('PATH_TO_OPENAPI')
const HOST_URL = processenv('HOST_URL')

// Load an OpenAPI file (YAML or JSON) into this plugin
chai.use(chaiResponseValidator(PATH_TO_OPENAPI))

describe('GET /weather-stations as JSON', function () {
  it('should satisfy OpenAPI spec for all stations', async function () {
    // example: http://localhost:5000/weather-stations
    const allStations = HOST_URL + 'weather-stations'
    const res = await axios.get(allStations, { headers: { Accept: 'application/json' } })
    expect(res.status).to.equal(200)

    // Assert that the HTTP response satisfies the OpenAPI spec
    expect(res).to.satisfyApiSpec
  })
})

describe('GET /weather-stations?radius=1000000 as JSON', function () {
  it('should satisfy OpenAPI spec for filtered stations', async function () {
    // example http://localhost:5000/weather-stations?in-vicinity-of=54.1663/7.451&radius=1000000&limit=5
    const filteredStationsUrl = HOST_URL + 'weather-stations?radius=1000000'
    const res = await axios.get(filteredStationsUrl, { headers: { Accept: 'application/json' } })
    expect(res.status).to.equal(200)

    // Assert that the HTTP response satisfies the OpenAPI spec
    expect(res).to.satisfyApiSpec
  })
})

describe('GET /weather-stations?limit=5 as JSON', function () {
  it('should satisfy OpenAPI spec for filtered stations', async function () {
    // example http://localhost:5000/weather-stations?in-vicinity-of=54.1663/7.451&radius=1000000&limit=5
    const filteredStationsUrl = HOST_URL + 'weather-stations?limit=5'
    const res = await axios.get(filteredStationsUrl, { headers: { Accept: 'application/json' } })
    expect(res.status).to.equal(200)

    // Assert that the HTTP response satisfies the OpenAPI spec
    expect(res).to.satisfyApiSpec
  })
})

describe('GET /weather-stations?in-vicinity-of=54.1663/7.451 as JSON', function () {
  it('should satisfy OpenAPI spec for filtered stations', async function () {
    // example http://localhost:5000/weather-stations?in-vicinity-of=54.1663/7.451&radius=1000000&limit=5
    const filteredStationsUrl = HOST_URL + 'weather-stations?in-vicinity-of=54.1663/7.451'
    const res = await axios.get(filteredStationsUrl, { headers: { Accept: 'application/json' } })
    expect(res.status).to.equal(200)

    // Assert that the HTTP response satisfies the OpenAPI spec
    expect(res).to.satisfyApiSpec
  })
})

describe('GET /weather-stations?in-vicinity-of=54.1663/7.451&radius=1000000 as JSON', function () {
  it('should satisfy OpenAPI spec for filtered stations', async function () {
    // example http://localhost:5000/weather-stations?in-vicinity-of=54.1663/7.451&radius=1000000&limit=5
    const filteredStationsUrl = HOST_URL + 'weather-stations?in-vicinity-of=54.1663/7.451&radius=1000000'
    const res = await axios.get(filteredStationsUrl, { headers: { Accept: 'application/json' } })
    expect(res.status).to.equal(200)

    // Assert that the HTTP response satisfies the OpenAPI spec
    expect(res).to.satisfyApiSpec
  })
})

describe('GET /weather-stations?in-vicinity-of=54.1663/7.451&limit=5 as JSON', function () {
  it('should satisfy OpenAPI spec for filtered stations', async function () {
    // example http://localhost:5000/weather-stations?in-vicinity-of=54.1663/7.451&radius=1000000&limit=5
    const filteredStationsUrl = HOST_URL + 'weather-stations?in-vicinity-of=54.1663/7.451&limit=5'
    const res = await axios.get(filteredStationsUrl, { headers: { Accept: 'application/json' } })
    expect(res.status).to.equal(200)

    // Assert that the HTTP response satisfies the OpenAPI spec
    expect(res).to.satisfyApiSpec
  })
})

describe('GET /weather-stations?in-vicinity-of=54.1663/7.451&radius=1000000&limit=5 as JSON', function () {
  it('should satisfy OpenAPI spec for filtered stations', async function () {
    // example http://localhost:5000/weather-stations?in-vicinity-of=54.1663/7.451&radius=1000000&limit=5
    const filteredStationsUrl = HOST_URL + 'weather-stations?in-vicinity-of=54.1663/7.451&radius=1000000&limit=5'
    const res = await axios.get(filteredStationsUrl, { headers: { Accept: 'application/json' } })
    expect(res.status).to.equal(200)

    // Assert that the HTTP response satisfies the OpenAPI spec
    expect(res).to.satisfyApiSpec
  })
})

describe.skip('GET /weather-stations as CSV', function () {
  it('should satisfy OpenAPI spec for all stations', async function () {
    // example: http://localhost:5000/weather-stations
    const res = await axios.get(ALL_STATIONS_URL, { headers: { Accept: 'text/csv' } })

    expect(res.status).to.equal(200)

    // Assert that the HTTP response satisfies the OpenAPI spec
    expect(res).to.satisfyApiSpec
  })
})

describe.skip('GET /weather-stations as CSV', function () {
  it('should satisfy OpenAPI spec for all stations', async function () {
    // example: http://localhost:5000/weather-stations
    const res = await axios.get(FILTERED_STATIONS_URL, { headers: { Accept: 'text/csv' } })

    expect(res.status).to.equal(200)

    // Assert that the HTTP response satisfies the OpenAPI spec
    expect(res).to.satisfyApiSpec
  })
})
