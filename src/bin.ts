#!/usr/bin/env node
// Standalone semver comparison program.
// Exits successfully and prints matching version(s) if
// any supplied version is valid and passes all tests.

import * as semver from './semver'

const argv = process.argv.slice(2)
const range: string[] = []
const version = require('../package.json').version

let versions: string[] = []
let inc: semver.ReleaseType | null = null
let loose = false
let includePrerelease = false
let coerce = false
let identifier: string | undefined
let reverse = false

main()

function main() {
  if (!argv.length) return help()

  while (argv.length) {
    let a = argv.shift() as string
    const indexOfEqualSign = a.indexOf('=')
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
        versions.push(argv.shift() as string)
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
            inc = argv.shift() as semver.ReleaseType
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
        range.push(argv.shift() as string)
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

  const options: semver.Options = { loose, includePrerelease }

  versions = versions
    .map((v) => (coerce ? (semver.coerce(v) || { version: v }).version : v))
    .filter((v) => semver.valid(v))
  if (!versions.length) return fail()
  if (inc && (versions.length !== 1 || range.length)) return failInc()

  const empty = range.some((r) => {
    versions = versions.filter((v) => semver.satisfies(v, r, options))
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

function success(options?: boolean | semver.Options) {
  const compareFn = reverse ? semver.rcompare : semver.compare
  versions
    .sort((a, b) => compareFn(a, b, options))
    .map((v) => semver.clean(v, options))
    .map((v) => (inc ? semver.inc(v as string, inc, options, identifier) : v))
    .forEach((v) => console.log(v))
}

function help() {
  console.log(
    `SemVer ${version}

A JavaScript implementation of the https://semver.org/ specification
Copyright Isaac Z. Schlueter

Usage: semver [options] <version> [<version> [...]]
Prints valid versions sorted by SemVer precedence

Options:
-r --range <range>
        Print versions that match the specified range.

-i --increment [<level>]
        Increment a version by the specified level.  Level can
        be one of: major, minor, patch, premajor, preminor,
        prepatch, or prerelease.  Default level is 'patch'.
        Only one version may be specified.

--preid <identifier>
        Identifier to be used to prefix premajor, preminor,
        prepatch or prerelease version increments.

-l --loose
        Interpret versions and ranges loosely

-p --include-prerelease
        Always include prerelease versions in range matching

-c --coerce
        Coerce a string into SemVer if possible
        (does not imply --loose)

Program exits successfully if any valid version satisfies
all supplied ranges, and prints all satisfying versions.

If no satisfying versions are found, then exits failure.

Versions are printed in ascending order, so supplying
multiple versions to the utility will just sort them.`
  )
}
