// SPDX-FileCopyrightText: 2020 UdS AES <https://www.uni-saarland.de/lehrstuhl/frey.html>
// SPDX-License-Identifier: MIT

const _ = require('lodash')
const url = require('url')
const got = require('got')
const chai = require('chai')
// const expect = chai.expect
const assert = chai.assert
const describe = require('mocha').describe
const it = require('mocha').it
const processenv = require('processenv')
const addContext = require('mochawesome/addContext')

const API_ORIGIN = processenv('API_ORIGIN')
const BEOB_FROM = parseInt(processenv('BEOB_FROM'))
const BEOB_TO = parseInt(processenv('BEOB_TO'))

// // Attempt to validate responses against OAS using a plugin for Chai
// const chaiResponseValidator = require('chai-openapi-response-validator')
// const PATH_TO_OPENAPI = processenv('PATH_TO_OPENAPI') // requires absolute path!
// chai.use(chaiResponseValidator(PATH_TO_OPENAPI))

describe('Verify behaviour of API-instance against OAS and/or expectations', function () {
  const instanceURL = new url.URL(API_ORIGIN)
  const apiInstance = got.extend({
    prefixUrl: instanceURL.origin, // https://www.npmjs.com/package/got#prefixurl
    timeout: 2000 // https://www.npmjs.com/package/got#timeout
  })

  // Define test configurations -- only 2xx, `got` throws otherwise
  const tests = [
    {
      stationId: '10704',
      resource: 'measured-values',
      quantities: null,
      from: null,
      to: null,
      type: 'application/json',
      expected: {
        statusCode: 200,
        type: 'application/json'
      }
    },
    {
      stationId: '10708',
      resource: 'measured-values',
      quantities: 'pmsl,relhum_2m,ws_10m',
      from: BEOB_FROM,
      to: BEOB_TO,
      type: 'application/json',
      expected: {
        statusCode: 200,
        type: 'application/json'
      }
    },
    {
      stationId: '10505',
      resource: 'measured-values',
      quantities: 'aswdir_s,aswdifd_s',
      from: BEOB_FROM,
      to: BEOB_TO,
      type: 'text/csv',
      expected: {
        statusCode: 200,
        type: 'text/csv'
      }
    },
    {
      stationId: '10675',
      resource: 'forecast',
      model: 'cosmo-d2',
      modelRun: '03',
      quantities: 'aswdir_s,aswdifd_s',
      from: BEOB_FROM,
      to: BEOB_TO,
      type: 'application/json',
      expected: {
        statusCode: 200,
        type: 'application/json'
      }
    },
    {
      stationId: '10686',
      resource: 'forecast',
      model: 'mosmix',
      modelRun: '15',
      quantities: 't_2m',
      from: BEOB_FROM,
      to: BEOB_TO,
      type: 'text/csv',
      expected: {
        statusCode: 200,
        type: 'text/csv'
      }
    }
  ]

  // Execute properly named tests
  tests.forEach(function (test) {
    const verb = 'GET'
    let path = `/weather-stations/${test.stationId}/${test.resource}`
    let concatSymbol = '?'
    if (!_.isNil(test.model)) {
      path += `${concatSymbol}model=${test.model}`
      concatSymbol = '&'
    }
    if (!_.isNil(test.modelRun)) {
      path += `${concatSymbol}model-run=${test.modelRun}`
      concatSymbol = '&'
    }
    if (!_.isNil(test.quantities)) {
      path += `${concatSymbol}quantities=${test.quantities}`
      concatSymbol = '&'
    }
    if (!_.isNil(test.from)) {
      path += `${concatSymbol}from=${test.from}`
      concatSymbol = '&'
    }
    if (!_.isNil(test.to)) {
      path += `${concatSymbol}to=${test.to}`
      concatSymbol = '&'
    }

    const testTitle = `${verb} ${path} as \`${test.type}\``

    describe(testTitle, function () {
      const options = {
        method: 'get',
        headers: {
          Accept: test.type
        },
        url: `weather-stations/${test.stationId}/${test.resource}`,
        searchParams: {}
      }
      if (!_.isNil(test.model)) {
        options.searchParams.model = test.model
      }
      if (!_.isNil(test.modelRun)) {
        options.searchParams['model-run'] = test.modelRun
      }
      if (!_.isNil(test.quantities)) {
        options.searchParams.quantities = test.quantities
      }
      if (!_.isNil(test.from)) {
        options.searchParams.from = test.from
      }
      if (!_.isNil(test.to)) {
        options.searchParams.to = test.to
      }

      let res
      let actual

      before(async function () {
        try {
          res = await apiInstance(options)
          if (test.type === 'application/json') {
            actual = JSON.parse(res.body)
          } else {
            actual = res.body
          }
        } catch (error) {
          console.error(error)
        }
      })

      it(`should return \`${test.expected.statusCode}\` with content-type \`${test.expected.type}\``, function () {
        addContext(this, {
          title: 'hyperlink',
          value: `${instanceURL.origin}${path}`
        })
        addContext(this, {
          title: 'test configuration',
          value: test
        })
        addContext(this, {
          title: 'result',
          value: actual
        })

        assert.equal(res.statusCode, test.expected.statusCode)
        assert.include(res.headers['content-type'], test.expected.type)
      })

      if (test.type === 'application/json') {
        if (!_.isNil(test.quantities)) {
          // Verify that timeseries for each requested quantity exists by checking label
          it('should meet expectations', function () {
            _.forEach(_.split(options.searchParams.quantities, ','), (q) => {
              assert(_.find(actual.data, { label: q }), `label ${q} is missing!`)
            })
          })

          // Chai OpenAPI Response Validator does NOT support `got`-response objects!
          // -> SKIP for now, possibly implement manually later/use Dredd
          it.skip('should match the OAS', function () {})
        }
      }
    })
  })
})
