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
const mmsc = require('../lib/mosmix_station_catalog')

const MOSMIX_STATION_CATALOG_PATH = './sample_data/mosmix_pdftotext.txt'
describe('./lib/mosxmix_station_catalog', () => {
  describe('readStationCatalogFromTextFile()', () => {
    it('should return a list of stations', async () => {
      const stationData = await mmsc.readStationCatalogFromTextFile(MOSMIX_STATION_CATALOG_PATH)
    }).timeout(0)
  })
})
