// SPDX-FileCopyrightText: 2020 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

const axios = require('axios')
const chai = require('chai')
const expect = chai.expect
const describe = require('mocha').describe
const it = require('mocha').it
const processenv = require('processenv')
const chaiResponseValidator = require('chai-openapi-response-validator')

const PATH_TO_OPEANPI = processenv('PATH_TO_OPEANPI') // @Review Typo, can be hardcoded
// @Review only load origin from ENVVAR, path can be hardcoded
// Compare https://nodejs.org/docs/latest-v12.x/api/url.html#url_url_strings_and_url_objects
const ALL_STATIONS_URL = processenv('ALL_STATIONS_URL')
const FILTERED_STATIONS_URL = processenv('FILTERED_STATIONS_URL')

// Load an OpenAPI file (YAML or JSON) into this plugin
chai.use(chaiResponseValidator(PATH_TO_OPEANPI))

describe('GET /host/weather-stations', function () { // @Review just path (also below), "as JSON"
  it('should satisfy OpenAPI spec for all stations', async function () {
    // example: http://localhost:5000/weather-stations
    const res = await axios.get(ALL_STATIONS_URL, { headers: { Accept: 'application/json' } })

    expect(res.status).to.equal(200)

    // Assert that the HTTP response satisfies the OpenAPI spec
    expect(res).to.satisfyApiSpec
  })
})

// @Review same spec for all/filtered stations, no difference
describe('GET /host/weather-stations?in-vicinity-of=54.1663/7.451&radius=1000000&limit=5', function () {
  it('should satisfy OpenAPI spec for filtered stations', async function () {
    // example http://localhost:5000/weather-stations?in-vicinity-of=54.1663/7.451&radius=1000000&limit=5
    const res = await axios.get(FILTERED_STATIONS_URL, { headers: { Accept: 'application/json' } })

    expect(res.status).to.equal(200)

    // Assert that the HTTP response satisfies the OpenAPI spec
    expect(res).to.satisfyApiSpec
  })
})

describe.skip('GET /host/weather-stations', function () {
  it('should satisfy OpenAPI spec for all stations', async function () {
    // example: http://localhost:5000/weather-stations
    const res = await axios.get(ALL_STATIONS_URL, { headers: { Accept: 'text/csv' } })

    expect(res.status).to.equal(200)

    // Assert that the HTTP response satisfies the OpenAPI spec
    expect(res).to.satisfyApiSpec
  })
})

describe.skip('GET /host/weather-stations', function () {
  it('should satisfy OpenAPI spec for all stations', async function () {
    // example: http://localhost:5000/weather-stations
    const res = await axios.get(FILTERED_STATIONS_URL, { headers: { Accept: 'text/csv' } })

    expect(res.status).to.equal(200)

    // Assert that the HTTP response satisfies the OpenAPI spec
    expect(res).to.satisfyApiSpec
  })
})