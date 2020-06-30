// SPDX-FileCopyrightText: 2020 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

const axios = require('axios')
const chai = require('chai');
const expect = chai.expect;
const describe = require('mocha').describe
const before = require('mocha').before
const it = require('mocha').it
const assert = require('chai').assert
const processenv = require('processenv')
const chaiResponseValidator = require('chai-openapi-response-validator');

const PATH_TO_OPEANPI = processenv('PATH_TO_OPEANPI');
const ALL_STATIONS_URL = processenv('ALL_STATIONS_URL')
const FILTERED_STATIONS_URL = processenv('FILTERED_STATIONS_URL')

// Load an OpenAPI file (YAML or JSON) into this plugin
chai.use(chaiResponseValidator(PATH_TO_OPEANPI));


describe('GET /example/endpoint', function() {
  it('should satisfy OpenAPI spec for all stations', async function() {

    // example: http://localhost:5000/weather-stations
    const res = await axios.get(ALL_STATIONS_URL);

    expect(res.status).to.equal(200);

    // Assert that the HTTP response satisfies the OpenAPI spec
    expect(res).to.satisfyApiSpec;
  });
});

describe('GET /example/endpoint', function() {
  it('should satisfy OpenAPI spec for filtered stations', async function() {

    // example http://localhost:5000/weather-stations?in-vicinity-of=54.1663/7.451&radius=1000000&limit=5
    const res = await axios.get(FILTERED_STATIONS_URL);

    expect(res.status).to.equal(200);

    // Assert that the HTTP response satisfies the OpenAPI spec
    expect(res).to.satisfyApiSpec;
  });
});
