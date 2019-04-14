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

const fs = require('fs-extra')
const processenv = require('processenv')
var bunyan = require('bunyan')

// Instantiate logger
const LOG_LEVEL = String(processenv('LOG_LEVEL') || 'info')
var log = bunyan.createLogger({
  name: 'handler_list_of_POIs',
  serializers: bunyan.stdSerializers,
  level: LOG_LEVEL
})
log.info('loaded module for handling requests for list of POIs')

function getPois (pathToPoisJsonFile) {
  return async function (req, res, next) {
    try {
      const fileContent = await fs.readJson(pathToPoisJsonFile, { encoding: 'utf8' })
      res.status(200).send(fileContent)
      res.end()
      log.info(`successfully handled ${req.method}-request on ${req.path}`)
      return
    } catch (error) {
      res.status(404).send(error)
      res.end()
      log.warn(error, `error while handling ${req.method}-request on ${req.path}`)
    }
  }
}

exports.getPois = getPois
