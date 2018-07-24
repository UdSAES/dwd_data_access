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

const spherical = require('spherical')
const _ = require('lodash')
function findClosestStation(coordinates, catalog) {
  const latitude = coordinates.latitude
  const longitude = coordinates.longitude

  const from = [longitude, latitude]
  const distances = _.map(catalog, (station) => {
    const to = [station.longitude, station.latitude]

    return {station: station, distance: spherical.distance(from, to)}
  })

  return _.minBy(distances, (item) => {
    return item.distance
  })
}

exports.findClosestStation = findClosestStation
