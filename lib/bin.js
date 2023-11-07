#!/usr/bin/env node
'use strict'
// Standalone semver comparison program.
// Exits successfully and prints matching version(s) if
// any supplied version is valid and passes all tests.

var semver = require('./semver')

var argv = process.argv.slice(2)
var range = []
var version = require('../package.json').version

var versions = []
var inc = null
var loose = false
var includePrerelease = false
var coerce = false
var identifier
var reverse = false

main()

function main() {
  if (!argv.length) return help()

  while (argv.length) {
    var a = argv.shift()
    var indexOfEqualSign = a.indexOf('=')
    if (indexOfEqualSign >= 0) {
      argv.unshift(a.slice(indexOfEqualSign + 1))
      a = a.slice(0, indexOfEqualSign)
    }

    switch (a) {
      case '-rv':
      case '-rev':
      case '--rev':
      case '--reverse':
        reverse = true
        break
      case '-l':
      case '--loose':
        loose = true
        break
      case '-p':
      case '--include-prerelease':
        includePrerelease = true
        break
      case '-v':
      case '--version':
        versions.push(argv.shift())
        break
      case '-i':
      case '--inc':
      case '--increment':
        switch (argv[0]) {
          case 'major':
          case 'minor':
          case 'patch':
          case 'prerelease':
          case 'premajor':
          case 'preminor':
          case 'prepatch':
            inc = argv.shift()
            break
          default:
            inc = 'patch'
            break
        }
        break
      case '--preid':
        identifier = argv.shift()
        break
      case '-r':
      case '--range':
        range.push(argv.shift())
        break
      case '-c':
      case '--coerce':
        coerce = true
        break
      case '-h':
      case '--help':
      case '-?':
        return help()
      default:
        versions.push(a)
        break
    }
  }

  var options = { loose: loose, includePrerelease: includePrerelease }

  versions = versions
    .map(function (v) {
      return coerce ? (semver.coerce(v) || { version: v }).version : v
    })
    .filter(function (v) {
      return semver.valid(v)
    })
  if (!versions.length) return fail()
  if (inc && (versions.length !== 1 || range.length)) return failInc()

  var empty = range.some(function (r) {
    versions = versions.filter(function (v) {
      return semver.satisfies(v, r, options)
    })
    return !versions.length
  })
  return empty ? fail() : success(options)
}

function failInc() {
  console.error('--inc can only be used on a single version with no range')
  fail()
}

function fail() {
  process.exit(1)
}

function success(options) {
  var compareFn = reverse ? semver.rcompare : semver.compare
  versions
    .sort(function (a, b) {
      return compareFn(a, b, options)
    })
    .map(function (v) {
      return semver.clean(v, options)
    })
    .map(function (v) {
      return inc ? semver.inc(v, inc, options, identifier) : v
    })
    .forEach(function (v) {
      console.log(v)
    })
}

function help() {
  console.log(
    'SemVer ' +
      version +
      "\n\nA JavaScript implementation of the https://semver.org/ specification\nCopyright Isaac Z. Schlueter\n\nUsage: semver [options] <version> [<version> [...]]\nPrints valid versions sorted by SemVer precedence\n\nOptions:\n-r --range <range>\n        Print versions that match the specified range.\n\n-i --increment [<level>]\n        Increment a version by the specified level.  Level can\n        be one of: major, minor, patch, premajor, preminor,\n        prepatch, or prerelease.  Default level is 'patch'.\n        Only one version may be specified.\n\n--preid <identifier>\n        Identifier to be used to prefix premajor, preminor,\n        prepatch or prerelease version increments.\n\n-l --loose\n        Interpret versions and ranges loosely\n\n-p --include-prerelease\n        Always include prerelease versions in range matching\n\n-c --coerce\n        Coerce a string into SemVer if possible\n        (does not imply --loose)\n\nProgram exits successfully if any valid version satisfies\nall supplied ranges, and prints all satisfying versions.\n\nIf no satisfying versions are found, then exits failure.\n\nVersions are printed in ascending order, so supplying\nmultiple versions to the utility will just sort them."
  )
}
