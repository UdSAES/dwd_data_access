'use strict'

const fs = require('fs-extra')
function getPois (pathToPoisJsonFile) {
  return async function (req, res, next) {
    try {
      const fileContent = await fs.readJson(pathToPoisJsonFile, {encoding: 'utf8'})
      res.status(200).send(fileContent)
      res.end()
      return
    } catch (error) {
      console.log(error)
      res.status(404).send(error)
      res.end()
      return
    }
  }
}

exports.getPois = getPois
