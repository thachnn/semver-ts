'use strict'
exports = module.exports = SemVer

var debug
/* istanbul ignore next */
if (
  typeof process === 'object' &&
  process.env &&
  process.env.NODE_DEBUG &&
  /\bsemver\b/i.test(process.env.NODE_DEBUG)
) {
  debug = function () {
    var args = Array.prototype.slice.call(arguments, 0)
    args.unshift('SEMVER')
    console.log.apply(console, args)
  }
} else {
  debug = function () {}
}

// Note: this is the semver.org version of the spec that it implements
// Not necessarily the package version of this code.
exports.SEMVER_SPEC_VERSION = '2.0.0'

var MAX_LENGTH = 256
var MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || 9007199254740991

// Max safe segment length for coercion.
var MAX_SAFE_COMPONENT_LENGTH = 16

// The actual regexps go on exports.re
var re = (exports.re = {})
var src = (exports.src = {})

// The following Regular Expressions can be used for tokenizing,
// validating, and parsing SemVer version strings.

// ## Numeric Identifier
// A single `0`, or a non-zero digit followed by zero or more digits.
src.NUMERICIDENTIFIER = '0|[1-9]\\d*'
src.NUMERICIDENTIFIERLOOSE = '[0-9]+'

// ## Non-numeric Identifier
// Zero or more digits, followed by a letter or hyphen, and then zero or
// more letters, digits, or hyphens.
src.NONNUMERICIDENTIFIER = '\\d*[a-zA-Z-][a-zA-Z0-9-]*'

// ## Main Version
// Three dot-separated numeric identifiers.
src.MAINVERSION =
  '(' +
  src.NUMERICIDENTIFIER +
  ')\\.(' +
  src.NUMERICIDENTIFIER +
  ')\\.(' +
  src.NUMERICIDENTIFIER +
  ')'
src.MAINVERSIONLOOSE =
  '(' +
  src.NUMERICIDENTIFIERLOOSE +
  ')\\.(' +
  src.NUMERICIDENTIFIERLOOSE +
  ')\\.(' +
  src.NUMERICIDENTIFIERLOOSE +
  ')'

// ## Pre-release Version Identifier
// A numeric identifier, or a non-numeric identifier.
src.PRERELEASEIDENTIFIER =
  '(?:' + src.NUMERICIDENTIFIER + '|' + src.NONNUMERICIDENTIFIER + ')'
src.PRERELEASEIDENTIFIERLOOSE =
  '(?:' + src.NUMERICIDENTIFIERLOOSE + '|' + src.NONNUMERICIDENTIFIER + ')'

// ## Pre-release Version
// Hyphen, followed by one or more dot-separated pre-release version
// identifiers.
src.PRERELEASE =
  '(?:-(' + src.PRERELEASEIDENTIFIER + '(?:\\.' + src.PRERELEASEIDENTIFIER + ')*))'
src.PRERELEASELOOSE =
  '(?:-?(' +
  src.PRERELEASEIDENTIFIERLOOSE +
  '(?:\\.' +
  src.PRERELEASEIDENTIFIERLOOSE +
  ')*))'

// ## Build Metadata Identifier
// Any combination of digits, letters, or hyphens.
src.BUILDIDENTIFIER = '[0-9A-Za-z-]+'

// ## Build Metadata
// Plus sign, followed by one or more period-separated build metadata
// identifiers.
src.BUILD = '(?:\\+(' + src.BUILDIDENTIFIER + '(?:\\.' + src.BUILDIDENTIFIER + ')*))'

// ## Full Version String
// A main version, followed optionally by a pre-release version and
// build metadata.

// Note that the only major, minor, patch, and pre-release sections of
// the version string are capturing groups.  The build metadata is not a
// capturing group, because it should not ever be used in version
// comparison.
var FULLPLAIN = 'v?' + src.MAINVERSION + src.PRERELEASE + '?' + src.BUILD + '?'
src.FULL = '^' + FULLPLAIN + '$'

// like full, but allows v1.2.3 and =1.2.3, which people do sometimes.
// also, 1.0.0alpha1 (prerelease without the hyphen) which is pretty
// common in the npm registry.
var LOOSEPLAIN =
  '[v=\\s]*' + src.MAINVERSIONLOOSE + src.PRERELEASELOOSE + '?' + src.BUILD + '?'
src.LOOSE = '^' + LOOSEPLAIN + '$'

src.GTLT = '((?:<|>)?=?)'

// Something like "2.*" or "1.2.x".
// Note that "x.x" is a valid xRange identifier, meaning "any version"
// Only the first item is strictly required.
src.XRANGEIDENTIFIERLOOSE = src.NUMERICIDENTIFIERLOOSE + '|x|X|\\*'
src.XRANGEIDENTIFIER = src.NUMERICIDENTIFIER + '|x|X|\\*'

src.XRANGEPLAIN =
  '[v=\\s]*(' +
  src.XRANGEIDENTIFIER +
  ')(?:\\.(' +
  src.XRANGEIDENTIFIER +
  ')(?:\\.(' +
  src.XRANGEIDENTIFIER +
  ')(?:' +
  src.PRERELEASE +
  ')?' +
  src.BUILD +
  '?)?)?'
src.XRANGEPLAINLOOSE =
  '[v=\\s]*(' +
  src.XRANGEIDENTIFIERLOOSE +
  ')(?:\\.(' +
  src.XRANGEIDENTIFIERLOOSE +
  ')(?:\\.(' +
  src.XRANGEIDENTIFIERLOOSE +
  ')(?:' +
  src.PRERELEASELOOSE +
  ')?' +
  src.BUILD +
  '?)?)?'

src.XRANGE = '^' + src.GTLT + '\\s*' + src.XRANGEPLAIN + '$'
src.XRANGELOOSE = '^' + src.GTLT + '\\s*' + src.XRANGEPLAINLOOSE + '$'

// Coercion.
// Extract anything that could conceivably be a part of a valid semver
src.COERCE =
  '(?:^|[^\\d])(\\d{1,' +
  MAX_SAFE_COMPONENT_LENGTH +
  '})(?:\\.(\\d{1,' +
  MAX_SAFE_COMPONENT_LENGTH +
  '}))?(?:\\.(\\d{1,' +
  MAX_SAFE_COMPONENT_LENGTH +
  '}))?(?:$|[^\\d])'

// Tilde ranges.
// Meaning is "reasonably at or greater than"
src.LONETILDE = '(?:~>?)'

src.TILDETRIM = '(\\s*)' + src.LONETILDE + '\\s+'
re.TILDETRIM = new RegExp(src.TILDETRIM, 'g')
var tildeTrimReplace = '$1~'

src.TILDE = '^' + src.LONETILDE + src.XRANGEPLAIN + '$'
src.TILDELOOSE = '^' + src.LONETILDE + src.XRANGEPLAINLOOSE + '$'

// Caret ranges.
// Meaning is "at least and backwards compatible with"
src.LONECARET = '(?:\\^)'

src.CARETTRIM = '(\\s*)' + src.LONECARET + '\\s+'
re.CARETTRIM = new RegExp(src.CARETTRIM, 'g')
var caretTrimReplace = '$1^'

src.CARET = '^' + src.LONECARET + src.XRANGEPLAIN + '$'
src.CARETLOOSE = '^' + src.LONECARET + src.XRANGEPLAINLOOSE + '$'

// A simple gt/lt/eq thing, or just "" to indicate "any version"
src.COMPARATORLOOSE = '^' + src.GTLT + '\\s*(' + LOOSEPLAIN + ')$|^$'
src.COMPARATOR = '^' + src.GTLT + '\\s*(' + FULLPLAIN + ')$|^$'

// An expression to strip any whitespace between the gtlt and the thing
// it modifies, so that `> 1.2.3` ==> `>1.2.3`
src.COMPARATORTRIM =
  '(\\s*)' + src.GTLT + '\\s*(' + LOOSEPLAIN + '|' + src.XRANGEPLAIN + ')'

// this one has to use the /g flag
re.COMPARATORTRIM = new RegExp(src.COMPARATORTRIM, 'g')
var comparatorTrimReplace = '$1$2$3'

// Something like `1.2.3 - 1.2.4`
// Note that these all use the loose form, because they'll be
// checked against either the strict or loose comparator form
// later.
src.HYPHENRANGE =
  '^\\s*(' + src.XRANGEPLAIN + ')\\s+-\\s+(' + src.XRANGEPLAIN + ')\\s*$'
src.HYPHENRANGELOOSE =
  '^\\s*(' + src.XRANGEPLAINLOOSE + ')\\s+-\\s+(' + src.XRANGEPLAINLOOSE + ')\\s*$'

// Star ranges basically just allow anything at all.
src.STAR = '(<|>)?=?\\s*\\*'

// Compile to actual regexp objects.
// All are flag-free, unless they were created above with a flag.
Object.keys(src).forEach(function (i, j) {
  debug(j, i, src[i])
  if (!re[i]) {
    re[i] = new RegExp(src[i])
  }
})

/**
 * Return the parsed version as a SemVer object, or null if it's not valid.
 */
function parse(version, options) {
  if (!options || typeof options !== 'object') {
    options = {
      loose: !!options,
      includePrerelease: false
    }
  }

  if (version instanceof SemVer) {
    return version
  }

  if (typeof version !== 'string') {
    return null
  }

  if (version.length > MAX_LENGTH) {
    return null
  }

  var r = options.loose ? re.LOOSE : re.FULL
  if (!r.test(version)) {
    return null
  }

  try {
    return new SemVer(version, options)
  } catch (_) {
    return null
  }
}
exports.parse = parse

/**
 * Return the parsed version as a string, or null if it's not valid.
 */
function valid(version, options) {
  var v = parse(version, options)
  return v ? v.version : null
}
exports.valid = valid

/**
 * Returns cleaned (removed leading/trailing whitespace, remove '=v' prefix) and
 * parsed version, or null if version is invalid.
 */
function clean(version, options) {
  var s = parse(version.trim().replace(/^[=v]+/, ''), options)
  return s ? s.version : null
}
exports.clean = clean

/** @class */
function SemVer(version, options) {
  if (!options || typeof options !== 'object') {
    options = {
      loose: !!options,
      includePrerelease: false
    }
  }
  if (version instanceof SemVer) {
    if (version.loose === options.loose) {
      return version
    } else {
      version = version.version
    }
  } else if (typeof version !== 'string') {
    throw new TypeError('Invalid Version: ' + version)
  }

  if (version.length > MAX_LENGTH) {
    throw new TypeError('version is longer than ' + MAX_LENGTH + ' characters')
  }

  if (!(this instanceof SemVer)) {
    return new SemVer(version, options)
  }

  debug('SemVer', version, options)
  this.options = options
  this.loose = !!options.loose

  var m = version.trim().match(options.loose ? re.LOOSE : re.FULL)
  if (!m) {
    throw new TypeError('Invalid Version: ' + version)
  }

  this.raw = version

  // these are actually numbers
  this.major = +m[1]
  this.minor = +m[2]
  this.patch = +m[3]

  if (this.major > MAX_SAFE_INTEGER || this.major < 0) {
    throw new TypeError('Invalid major version')
  }

  if (this.minor > MAX_SAFE_INTEGER || this.minor < 0) {
    throw new TypeError('Invalid minor version')
  }

  if (this.patch > MAX_SAFE_INTEGER || this.patch < 0) {
    throw new TypeError('Invalid patch version')
  }

  // numberify any prerelease numeric ids
  if (!m[4]) {
    this.prerelease = []
  } else {
    this.prerelease = m[4].split('.').map(function (id) {
      if (/^[0-9]+$/.test(id)) {
        var num = +id
        if (num >= 0 && num < MAX_SAFE_INTEGER) {
          return num
        }
      }
      return id
    })
  }

  this.build = m[5] ? m[5].split('.') : []
  this.format()
}
exports.SemVer = SemVer

SemVer.prototype.format = function () {
  this.version = this.major + '.' + this.minor + '.' + this.patch
  if (this.prerelease.length) {
    this.version += '-' + this.prerelease.join('.')
  }
  return this.version
}

SemVer.prototype.toString = function () {
  return this.version
}

/**
 * Compares two versions excluding build identifiers (the bit after `+` in
 * the semantic version string).
 *
 * @return
 * - `0` if `this` == `other`
 * - `1` if `this` is greater
 * - `-1` if `other` is greater
 */
SemVer.prototype.compare = function (other) {
  debug('SemVer.compare', this.version, this.options, other)
  if (!(other instanceof SemVer)) {
    other = new SemVer(other, this.options)
  }

  return this.compareMain(other) || this.comparePre(other)
}

/**
 * Compares the release portion of two versions.
 *
 * @return
 * - `0` if `this` == `other`
 * - `1` if `this` is greater
 * - `-1` if `other` is greater
 */
SemVer.prototype.compareMain = function (other) {
  if (!(other instanceof SemVer)) {
    other = new SemVer(other, this.options)
  }

  return (
    compareIdentifiers(this.major, other.major) ||
    compareIdentifiers(this.minor, other.minor) ||
    compareIdentifiers(this.patch, other.patch)
  )
}

/**
 * Compares the prerelease portion of two versions.
 *
 * @return
 * - `0` if `this` == `other`
 * - `1` if `this` is greater
 * - `-1` if `other` is greater
 */
SemVer.prototype.comparePre = function (other) {
  if (!(other instanceof SemVer)) {
    other = new SemVer(other, this.options)
  }

  // NOT having a prerelease is > having one
  if (this.prerelease.length && !other.prerelease.length) {
    return -1
  } else if (!this.prerelease.length && other.prerelease.length) {
    return 1
  } else if (!this.prerelease.length && !other.prerelease.length) {
    return 0
  }

  for (var i = 0; ; i++) {
    var a = this.prerelease[i]
    var b = other.prerelease[i]
    debug('prerelease compare', i, a, b)
    if (a === undefined && b === undefined) {
      return 0
    } else if (b === undefined) {
      return 1
    } else if (a === undefined) {
      return -1
    } else if (a === b) {
      // continue
    } else {
      return compareIdentifiers(a, b)
    }
  }
}

/**
 * preminor will bump the version up to the next minor release, and immediately
 * down to pre-release. premajor and prepatch work the same way.
 */
SemVer.prototype.inc = function (release, identifier) {
  switch (release) {
    case 'premajor':
      this.prerelease.length = 0
      this.patch = 0
      this.minor = 0
      this.major++
      this.inc('pre', identifier)
      break
    case 'preminor':
      this.prerelease.length = 0
      this.patch = 0
      this.minor++
      this.inc('pre', identifier)
      break
    case 'prepatch':
      // If this is already a prerelease, it will bump to the next version
      // drop any prereleases that might already exist, since they are not
      // relevant at this point.
      this.prerelease.length = 0
      this.inc('patch', identifier)
      this.inc('pre', identifier)
      break
    // If the input is a non-prerelease version, this acts the same as
    // prepatch.
    case 'prerelease':
      if (this.prerelease.length === 0) {
        this.inc('patch', identifier)
      }
      this.inc('pre', identifier)
      break

    case 'major':
      // If this is a pre-major version, bump up to the same major version.
      // Otherwise increment major.
      // 1.0.0-5 bumps to 1.0.0
      // 1.1.0 bumps to 2.0.0
      if (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) {
        this.major++
      }
      this.minor = 0
      this.patch = 0
      this.prerelease = []
      break
    case 'minor':
      // If this is a pre-minor version, bump up to the same minor version.
      // Otherwise increment minor.
      // 1.2.0-5 bumps to 1.2.0
      // 1.2.1 bumps to 1.3.0
      if (this.patch !== 0 || this.prerelease.length === 0) {
        this.minor++
      }
      this.patch = 0
      this.prerelease = []
      break
    case 'patch':
      // If this is not a pre-release version, it will increment the patch.
      // If it is a pre-release it will bump up to the same patch version.
      // 1.2.0-5 patches to 1.2.0
      // 1.2.0 patches to 1.2.1
      if (this.prerelease.length === 0) {
        this.patch++
      }
      this.prerelease = []
      break
    // This probably shouldn't be used publicly.
    // 1.0.0 "pre" would become 1.0.0-0 which is the wrong direction.
    case 'pre':
      if (this.prerelease.length === 0) {
        this.prerelease = [0]
      } else {
        var i = this.prerelease.length
        var pr
        while (--i >= 0) {
          if (typeof (pr = this.prerelease[i]) === 'number') {
            this.prerelease[i] = pr + 1
            i = -2
          }
        }
        if (i === -1) {
          // didn't increment anything
          this.prerelease.push(0)
        }
      }
      if (identifier) {
        // 1.2.0-beta.1 bumps to 1.2.0-beta.2,
        // 1.2.0-beta.fooblz or 1.2.0-beta bumps to 1.2.0-beta.0
        if (this.prerelease[0] === identifier) {
          if (isNaN(this.prerelease[1])) {
            this.prerelease = [identifier, 0]
          }
        } else {
          this.prerelease = [identifier, 0]
        }
      }
      break

    default:
      throw new Error('invalid increment argument: ' + release)
  }
  this.format()
  this.raw = this.version
  return this
}

/**
 * Return the version incremented by the release type (major, minor, patch, or
 * prerelease), or null if it's not valid.
 */
function inc(version, release, loose, identifier) {
  if (typeof loose === 'string' || typeof loose === 'number') {
    identifier = loose
    loose = undefined
  }

  try {
    return new SemVer(version, loose).inc(release, identifier).version
  } catch (_) {
    return null
  }
}
exports.inc = inc

/**
 * Returns difference between two versions by the release type (major, premajor,
 * minor, preminor, patch, prepatch, or prerelease), or null if the versions are
 * the same.
 */
function diff(version1, version2, loose) {
  if (eq(version1, version2, loose)) {
    return null
  }

  var v1 = parse(version1, loose)
  var v2 = parse(version2, loose)
  var prefix = ''
  var defaultResult
  if (v1.prerelease.length || v2.prerelease.length) {
    prefix = 'pre'
    defaultResult = 'prerelease'
  }
  for (var key in v1) {
    if (key === 'major' || key === 'minor' || key === 'patch') {
      if (v1[key] !== v2[key]) {
        return prefix + key
      }
    }
  }
  return defaultResult // may be undefined
}
exports.diff = diff

var numeric = /^[0-9]+$/
/**
 * Compares two identifiers, must be numeric strings or truthy/falsy values.
 *
 * Sorts in ascending order when passed to `Array.sort()`.
 */
function compareIdentifiers(a, b) {
  var anum = numeric.test(a)
  var bnum = numeric.test(b)

  if (anum && bnum) {
    a = +a
    b = +b
  }

  return a === b //
    ? 0
    : anum && !bnum
    ? -1
    : bnum && !anum
    ? 1
    : a < b
    ? -1
    : 1
}
exports.compareIdentifiers = compareIdentifiers

/**
 * The reverse of compareIdentifiers.
 *
 * Sorts in descending order when passed to `Array.sort()`.
 */
function rcompareIdentifiers(a, b) {
  return compareIdentifiers(b, a)
}
exports.rcompareIdentifiers = rcompareIdentifiers

/**
 * Return the major version number.
 */
function major(a, loose) {
  return new SemVer(a, loose).major
}
exports.major = major

/**
 * Return the minor version number.
 */
function minor(a, loose) {
  return new SemVer(a, loose).minor
}
exports.minor = minor

/**
 * Return the patch version number.
 */
function patch(a, loose) {
  return new SemVer(a, loose).patch
}
exports.patch = patch

/**
 * Compares two versions excluding build identifiers (the bit after `+` in
 * the semantic version string).
 *
 * Sorts in ascending order when passed to `Array.sort()`.
 *
 * @return
 * - `0` if `v1` == `v2`
 * - `1` if `v1` is greater
 * - `-1` if `v2` is greater
 */
function compare(a, b, loose) {
  return new SemVer(a, loose).compare(new SemVer(b, loose))
}
exports.compare = compare

function compareLoose(a, b) {
  return compare(a, b, true)
}
exports.compareLoose = compareLoose

/**
 * The reverse of compare.
 *
 * Sorts in descending order when passed to `Array.sort()`.
 */
function rcompare(a, b, loose) {
  return compare(b, a, loose)
}
exports.rcompare = rcompare

/**
 * Sorts an array of semver entries in ascending order using `compareBuild()`.
 */
function sort(list, loose) {
  return list.sort(function (a, b) {
    return compare(a, b, loose)
  })
}
exports.sort = sort

/**
 * Sorts an array of semver entries in descending order using `compareBuild()`.
 */
function rsort(list, loose) {
  return list.sort(function (a, b) {
    return rcompare(a, b, loose)
  })
}
exports.rsort = rsort

/** v1 > v2 */
function gt(a, b, loose) {
  return compare(a, b, loose) > 0
}
exports.gt = gt

/** v1 < v2 */
function lt(a, b, loose) {
  return compare(a, b, loose) < 0
}
exports.lt = lt

/**
 * v1 == v2 This is true if they're logically equivalent, even if they're not
 * the exact same string. You already know how to compare strings.
 */
function eq(a, b, loose) {
  return compare(a, b, loose) === 0
}
exports.eq = eq

/**
 * v1 != v2 The opposite of eq.
 */
function neq(a, b, loose) {
  return compare(a, b, loose) !== 0
}
exports.neq = neq

/** v1 >= v2 */
function gte(a, b, loose) {
  return compare(a, b, loose) >= 0
}
exports.gte = gte

/** v1 <= v2 */
function lte(a, b, loose) {
  return compare(a, b, loose) <= 0
}
exports.lte = lte

/**
 * Pass in a comparison string, and it'll call the corresponding semver comparison
 * function. "===" and "!==" do simple string comparison, but are included for
 * completeness. Throws if an invalid comparison string is provided.
 */
function cmp(a, op, b, loose) {
  switch (op) {
    case '===':
      if (typeof a === 'object') a = a.version
      if (typeof b === 'object') b = b.version
      return a === b

    case '!==':
      if (typeof a === 'object') a = a.version
      if (typeof b === 'object') b = b.version
      return a !== b

    case '':
    case '=':
    case '==':
      return eq(a, b, loose)

    case '!=':
      return neq(a, b, loose)

    case '>':
      return gt(a, b, loose)

    case '>=':
      return gte(a, b, loose)

    case '<':
      return lt(a, b, loose)

    case '<=':
      return lte(a, b, loose)

    default:
      throw new TypeError('Invalid operator: ' + op)
  }
}
exports.cmp = cmp

var ANY = {}
/** @class */
function Comparator(comp, options) {
  if (!options || typeof options !== 'object') {
    options = {
      loose: !!options,
      includePrerelease: false
    }
  }

  if (comp instanceof Comparator) {
    if (comp.loose === !!options.loose) {
      return comp
    } else {
      comp = comp.value
    }
  }

  if (!(this instanceof Comparator)) {
    return new Comparator(comp, options)
  }

  debug('comparator', comp, options)
  this.options = options
  this.loose = !!options.loose
  this.parse(comp)

  if (this.semver === ANY) {
    this.value = ''
  } else {
    this.value = this.operator + this.semver.version
  }

  debug('comp', this)
}
exports.Comparator = Comparator

Comparator.prototype.parse = function (comp) {
  var r = this.options.loose ? re.COMPARATORLOOSE : re.COMPARATOR
  var m = comp.match(r)
  if (!m) {
    throw new TypeError('Invalid comparator: ' + comp)
  }

  this.operator = m[1]
  if (this.operator === '=') {
    this.operator = ''
  }

  // if it literally is just '>' or '' then allow anything.
  if (!m[2]) {
    this.semver = ANY
  } else {
    this.semver = new SemVer(m[2], this.options.loose)
  }
}

Comparator.prototype.toString = function () {
  return this.value
}

Comparator.prototype.test = function (version) {
  debug('Comparator.test', version, this.options.loose)

  if (this.semver === ANY) {
    return true
  }

  if (typeof version === 'string') {
    version = new SemVer(version, this.options)
  }

  return cmp(version, this.operator, this.semver, this.options)
}

Comparator.prototype.intersects = function (comp, options) {
  if (!(comp instanceof Comparator)) {
    throw new TypeError('a Comparator is required')
  }

  if (!options || typeof options !== 'object') {
    options = {
      loose: !!options,
      includePrerelease: false
    }
  }

  var rangeTmp

  if (this.operator === '') {
    rangeTmp = new Range(comp.value, options)
    return satisfies(this.value, rangeTmp, options)
  } else if (comp.operator === '') {
    rangeTmp = new Range(this.value, options)
    return satisfies(comp.semver, rangeTmp, options)
  }

  var sameDirectionIncreasing =
    (this.operator === '>=' || this.operator === '>') &&
    (comp.operator === '>=' || comp.operator === '>')
  var sameDirectionDecreasing =
    (this.operator === '<=' || this.operator === '<') &&
    (comp.operator === '<=' || comp.operator === '<')
  var sameSemVer = this.semver.version === comp.semver.version
  var differentDirectionsInclusive =
    (this.operator === '>=' || this.operator === '<=') &&
    (comp.operator === '>=' || comp.operator === '<=')
  var oppositeDirectionsLessThan =
    cmp(this.semver, '<', comp.semver, options) &&
    (this.operator === '>=' || this.operator === '>') &&
    (comp.operator === '<=' || comp.operator === '<')
  var oppositeDirectionsGreaterThan =
    cmp(this.semver, '>', comp.semver, options) &&
    (this.operator === '<=' || this.operator === '<') &&
    (comp.operator === '>=' || comp.operator === '>')

  return (
    sameDirectionIncreasing ||
    sameDirectionDecreasing ||
    (sameSemVer && differentDirectionsInclusive) ||
    oppositeDirectionsLessThan ||
    oppositeDirectionsGreaterThan
  )
}

/** @class */
function Range(range, options) {
  if (!options || typeof options !== 'object') {
    options = {
      loose: !!options,
      includePrerelease: false
    }
  }

  if (range instanceof Range) {
    if (
      range.loose === !!options.loose &&
      range.includePrerelease === !!options.includePrerelease
    ) {
      return range
    } else {
      return new Range(range.raw, options)
    }
  }

  if (range instanceof Comparator) {
    return new Range(range.value, options)
  }

  if (!(this instanceof Range)) {
    return new Range(range, options)
  }

  this.options = options
  this.loose = !!options.loose
  this.includePrerelease = !!options.includePrerelease

  // First, split based on boolean or ||
  this.raw = range
  this.set = range
    .split(/\s*\|\|\s*/)
    .map(function (range) {
      return this.parseRange(range.trim())
    }, this)
    // throw out any that are not relevant for whatever reason
    .filter(function (c) {
      return c.length
    })

  if (!this.set.length) {
    throw new TypeError('Invalid SemVer Range: ' + range)
  }

  this.format()
}
exports.Range = Range

Range.prototype.format = function () {
  this.range = this.set
    .map(function (comps) {
      return comps.join(' ').trim()
    })
    .join('||')
    .trim()
  return this.range
}

Range.prototype.toString = function () {
  return this.range
}

/** @param {string} range */
Range.prototype.parseRange = function (range) {
  var loose = this.options.loose
  range = range.trim()
  // `1.2.3 - 1.2.4` => `>=1.2.3 <=1.2.4`
  var hr = loose ? re.HYPHENRANGELOOSE : re.HYPHENRANGE
  range = range.replace(hr, hyphenReplace)
  debug('hyphen replace', range)
  // `> 1.2.3 < 1.2.5` => `>1.2.3 <1.2.5`
  range = range.replace(re.COMPARATORTRIM, comparatorTrimReplace)
  debug('comparator trim', range, re.COMPARATORTRIM)

  // `~ 1.2.3` => `~1.2.3`
  range = range.replace(re.TILDETRIM, tildeTrimReplace)

  // `^ 1.2.3` => `^1.2.3`
  range = range.replace(re.CARETTRIM, caretTrimReplace)

  // normalize spaces
  range = range.split(/\s+/).join(' ')

  // At this point, the range is completely trimmed and
  // ready to be split into comparators.

  var compRe = loose ? re.COMPARATORLOOSE : re.COMPARATOR
  var set = range
    .split(' ')
    .map(function (comp) {
      return parseComparator(comp, this.options)
    }, this)
    .join(' ')
    .split(/\s+/)
  if (this.options.loose) {
    // in loose mode, throw out any that are not valid comparators
    set = set.filter(function (comp) {
      return !!comp.match(compRe)
    })
  }

  return set.map(function (comp) {
    return new Comparator(comp, this.options)
  }, this)
}

Range.prototype.intersects = function (range, options) {
  if (!(range instanceof Range)) {
    throw new TypeError('a Range is required')
  }

  return this.set.some(function (thisComparators) {
    return thisComparators.every(function (thisComparator) {
      return range.set.some(function (rangeComparators) {
        return rangeComparators.every(function (rangeComparator) {
          return thisComparator.intersects(rangeComparator, options)
        })
      })
    })
  })
}

/**
 * If ANY of the sets match ALL of its comparators, then pass.
 */
Range.prototype.test = function (version) {
  if (!version) {
    return false
  }

  if (typeof version === 'string') {
    version = new SemVer(version, this.options)
  }

  for (var i = 0; i < this.set.length; i++) {
    if (testSet(this.set[i], version, this.options)) {
      return true
    }
  }
  return false
}

/**
 * Mostly just for testing and legacy API reasons.
 */
function toComparators(range, options) {
  return new Range(range, options).set.map(function (comp) {
    return comp
      .map(function (c) {
        return c.value
      })
      .join(' ')
      .trim()
      .split(' ')
  })
}
exports.toComparators = toComparators

/**
 * comprised of xranges, tildes, stars, and gtlt's at this point.
 * already replaced the hyphen ranges turn into a set of JUST comparators.
 */
function parseComparator(comp, options) {
  debug('comp', comp, options)
  comp = replaceCarets(comp, options)
  debug('caret', comp)
  comp = replaceTildes(comp, options)
  debug('tildes', comp)
  comp = replaceXRanges(comp, options)
  debug('xrange', comp)
  comp = replaceStars(comp, options)
  debug('stars', comp)
  return comp
}

function isX(id) {
  return !id || id.toLowerCase() === 'x' || id === '*'
}

/**
 * ~, ~> --> * (any, kinda silly)
 * ~2, ~2.x, ~2.x.x, ~>2, ~>2.x ~>2.x.x --> >=2.0.0 <3.0.0
 * ~2.0, ~2.0.x, ~>2.0, ~>2.0.x --> >=2.0.0 <2.1.0
 * ~1.2, ~1.2.x, ~>1.2, ~>1.2.x --> >=1.2.0 <1.3.0
 * ~1.2.3, ~>1.2.3 --> >=1.2.3 <1.3.0
 * ~1.2.0, ~>1.2.0 --> >=1.2.0 <1.3.0
 */
function replaceTildes(comp, options) {
  return comp
    .trim()
    .split(/\s+/)
    .map(function (comp) {
      return replaceTilde(comp, options)
    })
    .join(' ')
}

function replaceTilde(comp, options) {
  var r = options.loose ? re.TILDELOOSE : re.TILDE
  return comp.replace(r, function (_, M, m, p, pr) {
    debug('tilde', comp, _, M, m, p, pr)
    var ret

    if (isX(M)) {
      ret = ''
    } else if (isX(m)) {
      ret = '>=' + M + '.0.0 <' + (+M + 1) + '.0.0'
    } else if (isX(p)) {
      // ~1.2 == >=1.2.0 <1.3.0
      ret = '>=' + M + '.' + m + '.0 <' + M + '.' + (+m + 1) + '.0'
    } else if (pr) {
      debug('replaceTilde pr', pr)
      ret =
        '>=' + M + '.' + m + '.' + p + '-' + pr + ' <' + M + '.' + (+m + 1) + '.0'
    } else {
      // ~1.2.3 == >=1.2.3 <1.3.0
      ret = '>=' + M + '.' + m + '.' + p + ' <' + M + '.' + (+m + 1) + '.0'
    }

    debug('tilde return', ret)
    return ret
  })
}

/**
 * ^ --> * (any, kinda silly)
 * ^2, ^2.x, ^2.x.x --> >=2.0.0 <3.0.0
 * ^2.0, ^2.0.x --> >=2.0.0 <3.0.0
 * ^1.2, ^1.2.x --> >=1.2.0 <2.0.0
 * ^1.2.3 --> >=1.2.3 <2.0.0
 * ^1.2.0 --> >=1.2.0 <2.0.0
 */
function replaceCarets(comp, options) {
  return comp
    .trim()
    .split(/\s+/)
    .map(function (comp) {
      return replaceCaret(comp, options)
    })
    .join(' ')
}

function replaceCaret(comp, options) {
  debug('caret', comp, options)
  var r = options.loose ? re.CARETLOOSE : re.CARET
  return comp.replace(r, function (_, M, m, p, pr) {
    debug('caret', comp, _, M, m, p, pr)
    var ret

    if (isX(M)) {
      ret = ''
    } else if (isX(m)) {
      ret = '>=' + M + '.0.0 <' + (+M + 1) + '.0.0'
    } else if (isX(p)) {
      if (M === '0') {
        ret = '>=' + M + '.' + m + '.0 <' + M + '.' + (+m + 1) + '.0'
      } else {
        ret = '>=' + M + '.' + m + '.0 <' + (+M + 1) + '.0.0'
      }
    } else if (pr) {
      debug('replaceCaret pr', pr)
      if (M === '0') {
        if (m === '0') {
          ret =
            '>=' +
            M +
            '.' +
            m +
            '.' +
            p +
            '-' +
            pr +
            ' <' +
            M +
            '.' +
            m +
            '.' +
            (+p + 1)
        } else {
          ret =
            '>=' +
            M +
            '.' +
            m +
            '.' +
            p +
            '-' +
            pr +
            ' <' +
            M +
            '.' +
            (+m + 1) +
            '.0'
        }
      } else {
        ret = '>=' + M + '.' + m + '.' + p + '-' + pr + ' <' + (+M + 1) + '.0.0'
      }
    } else {
      debug('no pr')
      if (M === '0') {
        if (m === '0') {
          ret = '>=' + M + '.' + m + '.' + p + ' <' + M + '.' + m + '.' + (+p + 1)
        } else {
          ret = '>=' + M + '.' + m + '.' + p + ' <' + M + '.' + (+m + 1) + '.0'
        }
      } else {
        ret = '>=' + M + '.' + m + '.' + p + ' <' + (+M + 1) + '.0.0'
      }
    }

    debug('caret return', ret)
    return ret
  })
}

function replaceXRanges(comp, options) {
  debug('replaceXRanges', comp, options)
  return comp
    .split(/\s+/)
    .map(function (comp) {
      return replaceXRange(comp, options)
    })
    .join(' ')
}

function replaceXRange(comp, options) {
  comp = comp.trim()
  var r = options.loose ? re.XRANGELOOSE : re.XRANGE
  return comp.replace(r, function (ret, gtlt, M, m, p, pr) {
    debug('xRange', comp, ret, gtlt, M, m, p, pr)
    var xM = isX(M)
    var xm = xM || isX(m)
    var xp = xm || isX(p)
    var anyX = xp

    if (gtlt === '=' && anyX) {
      gtlt = ''
    }

    if (xM) {
      if (gtlt === '>' || gtlt === '<') {
        // nothing is allowed
        ret = '<0.0.0'
      } else {
        // nothing is forbidden
        ret = '*'
      }
    } else if (gtlt && anyX) {
      // we know patch is an x, because we have any x at all.
      // replace X with 0
      if (xm) {
        m = 0
      }
      p = 0

      if (gtlt === '>') {
        // >1 => >=2.0.0
        // >1.2 => >=1.3.0
        // >1.2.3 => >= 1.2.4
        gtlt = '>='
        if (xm) {
          M = +M + 1
          m = 0
          p = 0
        } else {
          m = +m + 1
          p = 0
        }
      } else if (gtlt === '<=') {
        // <=0.7.x is actually <0.8.0, since any 0.7.x should
        // pass.  Similarly, <=7.x is actually <8.0.0, etc.
        gtlt = '<'
        if (xm) {
          M = +M + 1
        } else {
          m = +m + 1
        }
      }

      ret = '' + gtlt + M + '.' + m + '.' + p
    } else if (xm) {
      ret = '>=' + M + '.0.0 <' + (+M + 1) + '.0.0'
    } else if (xp) {
      ret = '>=' + M + '.' + m + '.0 <' + M + '.' + (+m + 1) + '.0'
    }

    debug('xRange return', ret)

    return ret
  })
}

/**
 * Because * is AND-ed with everything else in the comparator,
 * and '' means "any version", just remove the *s entirely.
 */
function replaceStars(comp, options) {
  debug('replaceStars', comp, options)
  // Looseness is ignored here.  star is always as loose as it gets!
  return comp.trim().replace(re.STAR, '')
}

/**
 * This function is passed to string.replace(re.HYPHENRANGE)
 * M, m, patch, prerelease, build
 * 1.2 - 3.4.5 => >=1.2.0 <=3.4.5
 * 1.2.3 - 3.4 => >=1.2.0 <3.5.0 Any 3.4.x will do
 * 1.2 - 3.4 => >=1.2.0 <3.5.0
 */
function hyphenReplace($0, from, fM, fm, fp, fpr, fb, to, tM, tm, tp, tpr, _tb) {
  if (isX(fM)) {
    from = ''
  } else if (isX(fm)) {
    from = '>=' + fM + '.0.0'
  } else if (isX(fp)) {
    from = '>=' + fM + '.' + fm + '.0'
  } else {
    from = '>=' + from
  }

  if (isX(tM)) {
    to = ''
  } else if (isX(tm)) {
    to = '<' + (+tM + 1) + '.0.0'
  } else if (isX(tp)) {
    to = '<' + tM + '.' + (+tm + 1) + '.0'
  } else if (tpr) {
    to = '<=' + tM + '.' + tm + '.' + tp + '-' + tpr
  } else {
    to = '<=' + to
  }

  return (from + ' ' + to).trim()
}

function testSet(set, version, options) {
  var i
  for (i = 0; i < set.length; i++) {
    if (!set[i].test(version)) {
      return false
    }
  }

  if (version.prerelease.length && !options.includePrerelease) {
    // Find the set of versions that are allowed to have prereleases
    // For example, ^1.2.3-pr.1 desugars to >=1.2.3-pr.1 <2.0.0
    // That should allow `1.2.3-pr.2` to pass.
    // However, `1.2.4-alpha.notready` should NOT be allowed,
    // even though it's within the range set by the comparators.
    for (i = 0; i < set.length; i++) {
      debug(set[i].semver)
      if (set[i].semver === ANY) {
        continue
      }

      if (set[i].semver.prerelease.length > 0) {
        var allowed = set[i].semver
        if (
          allowed.major === version.major &&
          allowed.minor === version.minor &&
          allowed.patch === version.patch
        ) {
          return true
        }
      }
    }

    // Version has a -pre, but it's not one of the ones we like.
    return false
  }

  return true
}

/**
 * Return true if the version satisfies the range.
 */
function satisfies(version, range, options) {
  try {
    range = new Range(range, options)
  } catch (_) {
    return false
  }
  return range.test(version)
}
exports.satisfies = satisfies

/**
 * Return the highest version in the list that satisfies the range, or
 * null if none of them do.
 */
function maxSatisfying(versions, range, options) {
  var max = null
  var maxSV = null
  var rangeObj
  try {
    rangeObj = new Range(range, options)
  } catch (_) {
    return null
  }
  versions.forEach(function (v) {
    if (rangeObj.test(v)) {
      // satisfies(v, range, options)
      if (!max || maxSV.compare(v) < 0) {
        // compare(max, v, true)
        max = v
        maxSV = new SemVer(max, options)
      }
    }
  })
  return max
}
exports.maxSatisfying = maxSatisfying

/**
 * Return the lowest version in the list that satisfies the range, or
 * null if none of them do.
 */
function minSatisfying(versions, range, options) {
  var min = null
  var minSV = null
  var rangeObj
  try {
    rangeObj = new Range(range, options)
  } catch (_) {
    return null
  }
  versions.forEach(function (v) {
    if (rangeObj.test(v)) {
      // satisfies(v, range, options)
      if (!min || minSV.compare(v) === 1) {
        // compare(min, v, true)
        min = v
        minSV = new SemVer(min, options)
      }
    }
  })
  return min
}
exports.minSatisfying = minSatisfying

/**
 * Return the lowest version that can possibly match the given range.
 */
function minVersion(range, loose) {
  range = new Range(range, loose)

  var minver = new SemVer('0.0.0')
  if (range.test(minver)) {
    return minver
  }

  minver = new SemVer('0.0.0-0')
  if (range.test(minver)) {
    return minver
  }

  minver = null
  for (var i = 0; i < range.set.length; ++i) {
    var comparators = range.set[i]

    comparators.forEach(function (comparator) {
      // Clone to avoid manipulating the comparator's semver object.
      var compver = new SemVer(comparator.semver.version)
      switch (comparator.operator) {
        case '>':
          if (compver.prerelease.length === 0) {
            compver.patch++
          } else {
            compver.prerelease.push(0)
          }
          compver.raw = compver.format()
        /* fallthrough */
        case '':
        case '>=':
          if (!minver || gt(minver, compver)) {
            minver = compver
          }
          break
        case '<':
        case '<=':
          /* Ignore maximum versions */
          break
        /* istanbul ignore next */
        default:
          throw new Error('Unexpected operation: ' + comparator.operator)
      }
    })
  }

  if (minver && range.test(minver)) {
    return minver
  }

  return null
}
exports.minVersion = minVersion

/**
 * Return the valid range or null if it's not valid.
 */
function validRange(range, options) {
  try {
    // Return '*' instead of '' so that truthiness works.
    // This will throw if it's invalid anyway
    return new Range(range, options).range || '*'
  } catch (_) {
    return null
  }
}
exports.validRange = validRange

/**
 * Determine if version is less than all the versions possible in the range.
 */
function ltr(version, range, options) {
  return outside(version, range, '<', options)
}
exports.ltr = ltr

/**
 * Determine if version is greater than all the versions possible in the range.
 */
function gtr(version, range, options) {
  return outside(version, range, '>', options)
}
exports.gtr = gtr

/**
 * Return true if the version is outside the bounds of the range in either the
 * high or low direction. The hilo argument must be either the string '>' or '<'.
 * (This is the function called by gtr and ltr)
 */
function outside(version, range, hilo, options) {
  version = new SemVer(version, options)
  range = new Range(range, options)

  var gtfn, ltefn, ltfn, comp, ecomp
  switch (hilo) {
    case '>':
      gtfn = gt
      ltefn = lte
      ltfn = lt
      comp = '>'
      ecomp = '>='
      break
    case '<':
      gtfn = lt
      ltefn = gte
      ltfn = gt
      comp = '<'
      ecomp = '<='
      break
    default:
      throw new TypeError('Must provide a hilo val of "<" or ">"')
  }

  // If it satisfies the range it is not outside
  if (satisfies(version, range, options)) {
    return false
  }

  // From now on, variable terms are as if we're in "gtr" mode.
  // but note that everything is flipped for the "ltr" function.

  for (var i = 0; i < range.set.length; ++i) {
    var comparators = range.set[i]

    /** @type {Comparator} */ var high = null
    /** @type {Comparator} */ var low = null

    for (var _i = 0; _i < comparators.length; _i++) {
      var comparator = comparators[_i]
      if (comparator.semver === ANY) {
        comparator = new Comparator('>=0.0.0')
      }
      high = high || comparator
      low = low || comparator
      if (gtfn(comparator.semver, high.semver, options)) {
        high = comparator
      } else if (ltfn(comparator.semver, low.semver, options)) {
        low = comparator
      }
    }

    // If the edge version comparator has a operator then our version
    // isn't outside it
    if (high.operator === comp || high.operator === ecomp) {
      return false
    }

    // If the lowest version comparator has an operator and our version
    // is less than it then it isn't higher than the range
    if ((!low.operator || low.operator === comp) && ltefn(version, low.semver)) {
      return false
    } else if (low.operator === ecomp && ltfn(version, low.semver)) {
      return false
    }
  }
  return true
}
exports.outside = outside

/**
 * Returns an array of prerelease components, or null if none exist.
 */
function prerelease(version, options) {
  var parsed = parse(version, options)
  return parsed && parsed.prerelease.length ? parsed.prerelease : null
}
exports.prerelease = prerelease

/**
 * Return true if any of the ranges comparators intersect.
 */
function intersects(r1, r2, options) {
  r1 = new Range(r1, options)
  r2 = new Range(r2, options)
  return r1.intersects(r2)
}
exports.intersects = intersects

/**
 * Coerces a string to SemVer if possible.
 */
function coerce(version) {
  if (version instanceof SemVer) {
    return version
  }

  if (typeof version !== 'string') {
    return null
  }

  var match = version.match(re.COERCE)
  if (!match) {
    return null
  }

  return parse(match[1] + '.' + (match[2] || '0') + '.' + (match[3] || '0'))
}
exports.coerce = coerce

exports['default'] = SemVer
