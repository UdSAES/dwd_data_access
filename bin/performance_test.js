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
