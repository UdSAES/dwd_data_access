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
const _ = require('lodash')

async function readStationCatalogFromTextFile(pathToTextFile) {
  var fileContent = await fs.readFile(pathToTextFile, {encoding: 'utf8'})
  fileContent = fileContent.replace(/\r\n/g, '\n')
  const sections = fileContent.split('Stations‐ID Name\n')

  const stations = []
  _.forEach(sections, (section) => {
    if (_.startsWith(section, 'MOSMIX Stationskatalog')) {
      return
    }

    const ids = _.pull(section.split('\nBreitengrad\n')[0].split('\n'), '')


    const nameStartIndex = section.split('\nBreitengrad\n')[1].indexOf('\n\n')
    const names = _.pull(section.split('\nBreitengrad\n')[1].substr(0, nameStartIndex).split('\n'), '')

    var latitudes = _.pull(section.split('\nBreitengrad\n')[1].substr(nameStartIndex).split('\nLängengrad Höhe ü. N.N.\n')[0].split('\n'), '')
    latitudes = _.slice(latitudes, 0, latitudes.length - 1)

    const heightStartIndex = section.split('\nBreitengrad\n')[1].substr(nameStartIndex).split('\nLängengrad Höhe ü. N.N.\n')[1].indexOf('\n\n')
    var longitudes = _.pull(section.split('\nBreitengrad\n')[1].substr(nameStartIndex).split('\nLängengrad Höhe ü. N.N.\n')[1].substr(0, heightStartIndex).split('\n'), '')

    var altitudes = _.pull(section.split('\nBreitengrad\n')[1].substr(nameStartIndex).split('\nLängengrad Höhe ü. N.N.\n')[1].substr(heightStartIndex).split('\n'), '')
    altitudes = _.pull(altitudes, '\f')

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i]
      const name = names[i]

      // ATTENTIO: the minus sign in the original file is NOT a minus sign
      const latitude = latitudes[i].replace('‐', '-')
      const longitude = longitudes[i].replace('‐', '-')
      const altitude = altitudes[i].replace('‐', '-')

      stations.push({
        id: id,
        name: name,
        latitude: parseFloat(latitude.replace(',', '.')),
        longitude: parseFloat(longitude.replace(',', '.')),
        altitude: parseFloat(altitude.replace(',', '.'))
      })
    }
  })

  return stations
}

exports.readStationCatalogFromTextFile = readStationCatalogFromTextFile
