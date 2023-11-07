'use strict'

const test = require('tape')
const spawn = require('child_process').spawn
const bin = require.resolve('../' + require('../package.json').bin.semver)

const run = (args) =>
  new Promise((resolve, reject) => {
    const c = spawn(process.execPath, [bin].concat(args))
    c.on('error', reject)
    const out = []
    const err = []
    c.stdout.setEncoding('utf-8')
    c.stdout.on('data', (chunk) => out.push(chunk))
    c.stderr.setEncoding('utf-8')
    c.stderr.on('data', (chunk) => err.push(chunk))
    c.on('close', (code, signal) => {
      resolve({
        out: out.join('').trimEnd(),
        err: err.join('').trimEnd(),
        code: code,
        signal: signal
      })
    })
  })

test('\ninc tests', (t) => {
  ;[
    [['-i', 'major', '1.0.0'], { out: '2.0.0', err: '', code: 0, signal: null }],
    [
      ['-i', 'major', '1.0.0', '1.0.1'],
      {
        out: '',
        err: '--inc can only be used on a single version with no range',
        code: 1,
        signal: null
      }
    ]
  ].forEach((c) => run(c[0]).then((r) => t.deepEqual(r, c[1]), t.fail))
  t.plan(2)
})
