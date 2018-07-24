// dwd_data_access
//
// Copyright 2018 The dwd_data_access Developers. See the LICENSE file at
// the top-level directory of this distribution and at
// https://github.com/UdSAES/dwd_data_access/LICENSE
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
//
// dwd_data_access may be freely used and distributed under the MIT license

'use strict'
const assert = require('assert')
const _ = require('lodash')

const dictionary = [{
    su: '°C',
    tu: 'K',
    cf: function (v) {
      return v + 273.15
    }
  },
  {
    su: 'K',
    tu: '°C',
    cf: function (v) {
      return v - 273.15
    }
  },
  {
    su: 'hPa',
    tu: 'Pa',
    cf: function (v) {
      return v * 100
    }
  },
  {
    su: 'Pa',
    tu: 'hPa',
    cf: function (v) {
      return v / 100
    }
  },
  {
    su: '%',
    tu: '1',
    cf: function (v) {
      return v / 100
    }
  },
  {
    su: '1',
    tu: '%',
    cf: function (v) {
      return v * 100
    }
  },
  {
    su: 'kW/m²',
    tu: 'W/m²',
    cf: function (v) {
      return v * 1000
    }
  },
  {
    su: 'W/m²',
    tu: 'kW/m²',
    cf: function (v) {
      return v / 1000
    }
  },
  {
    su: 'km/h',
    tu: 'm/s',
    cf: function (v) {
      return v / 3.6
    }
  },
  {
    su: 'm/s',
    tu: 'km/h',
    cf: function (v) {
      return v * 3.6
    }
  }
]

function convertUnit(value, sourceUnit, targetUnit) {
  assert(_.isString(sourceUnit))
  assert(_.isString(targetUnit))

  if (!_.isNumber(value) || isNaN(value)) {
    return value
  }

  // no conversion
  if (sourceUnit === targetUnit) {
    return value
  }

  const di = _.find(dictionary, (di) => {
    return di.su === sourceUnit && di.tu === targetUnit
  })

  if (_.isNil(di)) {
    return value
  }


  return di.cf(value)
}

exports.convertUnit = convertUnit
exports.dictionary = dictionary
