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

const request = require('request-promise')
const Parallel = require('async-parallel')

const DWD_FORECAST_SERVICE_HOST = '127.0.0.1:12345'
async function main() {
  var attempts = []
  for (let i = 0; i < 10000; i++) {
    attempts.push(i)
  }

  console.time('start')
  await Parallel.each(attempts, async () => {
    const result = await request({
      method: 'get',
      url: 'http://' + DWD_FORECAST_SERVICE_HOST + '/poi_forecasts/cosmo_de_27/43139dbf-8cd3-4b85-9220-9340a8819ab7'
    })
    //console.log(result.length)
  }, 1000)
  console.timeEnd('start')
}

main()
