'use strict'

const fs = require('fs-extra')
const {promisify} = require('util')
const execFile = promisify(require('child_process').execFile)
const path = require('path')
const _ = require('lodash')
const ROOT_DIR = './sample_data'

async function handleDirectory(directoryPath) {
  console.log('entering directory ' + directoryPath)
  const names = await fs.readdir(directoryPath)
  for (var i = 0; i < names.length; i++) {
    const name = names[i]
    const itemPath = path.join(directoryPath, name)
    const stat = await fs.stat(itemPath)

    if (stat.isDirectory()) {
      await handleDirectory(itemPath)
    } else if (stat.isFile() && path.extname(itemPath) === '.bz2') {
      console.log('handling file ' + itemPath)
      await execFile('bzip2', ['-kdf', itemPath])
      await execFile(
        'lz4',
        [
          '-9zf',
          path.join(path.dirname(itemPath), path.basename(itemPath, '.bz2')),
          path.join(path.dirname(itemPath), path.basename(itemPath, '.bz2') + '.lz4')
        ]
      )
      await fs.unlink(path.join(path.dirname(itemPath), path.basename(itemPath, '.bz2')))
    }
  }
}

async function run() {
  await handleDirectory(ROOT_DIR)
}

run()
