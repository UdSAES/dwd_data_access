// dwd_forecast_service
//
// Copyright 2018 The dwd_forecast_service Developers. See the LICENSE file at
// the top-level directory of this distribution and at
// https://github.com/UdSAES/dwd_forecast_service/LICENSE
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
//
// dwd_forecast_service may be freely used and distributed under the MIT license

'use strict'

const _ = require('lodash')
const su = require('../lib/station_utils')
const moment = require('moment')
const grib2 = require('../lib/grib2')

const path = require('path')
const fs = require('fs-extra')

function getPoiForecastsCosmeDe27Poi (poiForecastsBaseDirectory, voisConfiguration) {
  return async function (req, res, next) {
    const poi_id = req.params.poi_id
    try {
      const fileContent = await fs.readJson(path.join(poiForecastsBaseDirectory, poi_id, '27h_forecast.json'), {encoding: 'utf8'})
      res.status(200).send(fileContent)
      res.end()
      return
    } catch (error) {
      res.status(404).send(error)
      res.end()
      return
    }
  }
}

function getPoiForecastsCosmeDe45Poi (poiForecastsBaseDirectory, voisConfiguration) {
  return async function (req, res, next) {
    const poi_id = req.params.poi_id
    try {
      const fileContent = await fs.readJson(path.join(poiForecastsBaseDirectory, poi_id, '45h_forecast.json'), {encoding: 'utf8'})
      res.status(200).send(fileContent)
      res.end()
      return
    } catch (error) {
      res.status(404).send(error)
      res.end()
      return
    }
  }
}

exports.getPoiForecastsCosmeDe27Poi = getPoiForecastsCosmeDe27Poi
exports.getPoiForecastsCosmeDe45Poi = getPoiForecastsCosmeDe45Poi
