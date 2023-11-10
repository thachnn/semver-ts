/// exports = module.exports = SemVer

let debug: Function
/* istanbul ignore next */
if (
  typeof process === 'object' &&
  process.env &&
  process.env.NODE_DEBUG &&
  /\bsemver\b/i.test(process.env.NODE_DEBUG)
) {
  debug = function () {
    const args: any = Array.prototype.slice.call(arguments, 0)
    args.unshift('SEMVER')
    console.log.apply(console, args)
  }
} else {
  debug = function () {}
}

// Note: this is the semver.org version of the spec that it implements
// Not necessarily the package version of this code.
export const SEMVER_SPEC_VERSION = '2.0.0'

const MAX_LENGTH = 256
const MAX_SAFE_INTEGER = (<any>Number).MAX_SAFE_INTEGER || 9007199254740991

// Max safe segment length for coercion.
const MAX_SAFE_COMPONENT_LENGTH = 16

type R =
  | 'NUMERICIDENTIFIER'
  | 'NUMERICIDENTIFIERLOOSE'
  | 'NONNUMERICIDENTIFIER'
  | 'MAINVERSION'
  | 'MAINVERSIONLOOSE'
  | 'PRERELEASEIDENTIFIER'
  | 'PRERELEASEIDENTIFIERLOOSE'
  | 'PRERELEASE'
  | 'PRERELEASELOOSE'
  | 'BUILDIDENTIFIER'
  | 'BUILD'
  | 'FULL'
  | 'LOOSE'
  | 'GTLT'
  | 'XRANGEIDENTIFIERLOOSE'
  | 'XRANGEIDENTIFIER'
  | 'XRANGEPLAIN'
  | 'XRANGEPLAINLOOSE'
  | 'XRANGE'
  | 'XRANGELOOSE'
  | 'COERCE'
  | 'LONETILDE'
  | 'TILDETRIM'
  | 'TILDE'
  | 'TILDELOOSE'
  | 'LONECARET'
  | 'CARETTRIM'
  | 'CARET'
  | 'CARETLOOSE'
  | 'COMPARATORLOOSE'
  | 'COMPARATOR'
  | 'COMPARATORTRIM'
  | 'HYPHENRANGE'
  | 'HYPHENRANGELOOSE'
  | 'STAR'

// The actual regexps go on exports.re
export const re = {} as Record<R, RegExp>
export const src = {} as Record<R, string>

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
src.MAINVERSION = `(${src.NUMERICIDENTIFIER})\\.(${src.NUMERICIDENTIFIER})\\.(${src.NUMERICIDENTIFIER})`
src.MAINVERSIONLOOSE = `(${src.NUMERICIDENTIFIERLOOSE})\\.(${src.NUMERICIDENTIFIERLOOSE})\\.(${src.NUMERICIDENTIFIERLOOSE})`

// ## Pre-release Version Identifier
// A numeric identifier, or a non-numeric identifier.
src.PRERELEASEIDENTIFIER = `(?:${src.NUMERICIDENTIFIER}|${src.NONNUMERICIDENTIFIER})`
src.PRERELEASEIDENTIFIERLOOSE = `(?:${src.NUMERICIDENTIFIERLOOSE}|${src.NONNUMERICIDENTIFIER})`

// ## Pre-release Version
// Hyphen, followed by one or more dot-separated pre-release version
// identifiers.
src.PRERELEASE = `(?:-(${src.PRERELEASEIDENTIFIER}(?:\\.${src.PRERELEASEIDENTIFIER})*))`
src.PRERELEASELOOSE = `(?:-?(${src.PRERELEASEIDENTIFIERLOOSE}(?:\\.${src.PRERELEASEIDENTIFIERLOOSE})*))`

// ## Build Metadata Identifier
// Any combination of digits, letters, or hyphens.
src.BUILDIDENTIFIER = '[0-9A-Za-z-]+'

// ## Build Metadata
// Plus sign, followed by one or more period-separated build metadata
// identifiers.
src.BUILD = `(?:\\+(${src.BUILDIDENTIFIER}(?:\\.${src.BUILDIDENTIFIER})*))`

// ## Full Version String
// A main version, followed optionally by a pre-release version and
// build metadata.

// Note that the only major, minor, patch, and pre-release sections of
// the version string are capturing groups.  The build metadata is not a
// capturing group, because it should not ever be used in version
// comparison.
const FULLPLAIN = `v?${src.MAINVERSION}${src.PRERELEASE}?${src.BUILD}?`
src.FULL = `^${FULLPLAIN}\$`

// like full, but allows v1.2.3 and =1.2.3, which people do sometimes.
// also, 1.0.0alpha1 (prerelease without the hyphen) which is pretty
// common in the npm registry.
const LOOSEPLAIN = `[v=\\s]*${src.MAINVERSIONLOOSE}${src.PRERELEASELOOSE}?${src.BUILD}?`
src.LOOSE = `^${LOOSEPLAIN}\$`

src.GTLT = '((?:<|>)?=?)'

// Something like "2.*" or "1.2.x".
// Note that "x.x" is a valid xRange identifier, meaning "any version"
// Only the first item is strictly required.
src.XRANGEIDENTIFIERLOOSE = src.NUMERICIDENTIFIERLOOSE + '|x|X|\\*'
src.XRANGEIDENTIFIER = src.NUMERICIDENTIFIER + '|x|X|\\*'

src.XRANGEPLAIN = `[v=\\s]*(${src.XRANGEIDENTIFIER})(?:\\.(${src.XRANGEIDENTIFIER})(?:\\.(${src.XRANGEIDENTIFIER})(?:${src.PRERELEASE})?${src.BUILD}?)?)?`
src.XRANGEPLAINLOOSE = `[v=\\s]*(${src.XRANGEIDENTIFIERLOOSE})(?:\\.(${src.XRANGEIDENTIFIERLOOSE})(?:\\.(${src.XRANGEIDENTIFIERLOOSE})(?:${src.PRERELEASELOOSE})?${src.BUILD}?)?)?`

src.XRANGE = `^${src.GTLT}\\s*${src.XRANGEPLAIN}\$`
src.XRANGELOOSE = `^${src.GTLT}\\s*${src.XRANGEPLAINLOOSE}\$`

// Coercion.
// Extract anything that could conceivably be a part of a valid semver
src.COERCE = `(?:^|[^\\d])(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}})(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?(?:\$|[^\\d])`

// Tilde ranges.
// Meaning is "reasonably at or greater than"
src.LONETILDE = '(?:~>?)'

src.TILDETRIM = `(\\s*)${src.LONETILDE}\\s+`
re.TILDETRIM = new RegExp(src.TILDETRIM, 'g')
const tildeTrimReplace = '$1~'

src.TILDE = `^${src.LONETILDE}${src.XRANGEPLAIN}\$`
src.TILDELOOSE = `^${src.LONETILDE}${src.XRANGEPLAINLOOSE}\$`

// Caret ranges.
// Meaning is "at least and backwards compatible with"
src.LONECARET = '(?:\\^)'

src.CARETTRIM = `(\\s*)${src.LONECARET}\\s+`
re.CARETTRIM = new RegExp(src.CARETTRIM, 'g')
const caretTrimReplace = '$1^'

src.CARET = `^${src.LONECARET}${src.XRANGEPLAIN}\$`
src.CARETLOOSE = `^${src.LONECARET}${src.XRANGEPLAINLOOSE}\$`

// A simple gt/lt/eq thing, or just "" to indicate "any version"
src.COMPARATORLOOSE = `^${src.GTLT}\\s*(${LOOSEPLAIN})\$|^\$`
src.COMPARATOR = `^${src.GTLT}\\s*(${FULLPLAIN})\$|^\$`

// An expression to strip any whitespace between the gtlt and the thing
// it modifies, so that `> 1.2.3` ==> `>1.2.3`
src.COMPARATORTRIM = `(\\s*)${src.GTLT}\\s*(${LOOSEPLAIN}|${src.XRANGEPLAIN})`

// this one has to use the /g flag
re.COMPARATORTRIM = new RegExp(src.COMPARATORTRIM, 'g')
const comparatorTrimReplace = '$1$2$3'

// Something like `1.2.3 - 1.2.4`
// Note that these all use the loose form, because they'll be
// checked against either the strict or loose comparator form
// later.
src.HYPHENRANGE = `^\\s*(${src.XRANGEPLAIN})\\s+-\\s+(${src.XRANGEPLAIN})\\s*\$`
src.HYPHENRANGELOOSE = `^\\s*(${src.XRANGEPLAINLOOSE})\\s+-\\s+(${src.XRANGEPLAINLOOSE})\\s*\$`

// Star ranges basically just allow anything at all.
src.STAR = '(<|>)?=?\\s*\\*'

// Compile to actual regexp objects.
// All are flag-free, unless they were created above with a flag.
;(Object.keys(src) as R[]).forEach((i, j) => {
  debug(j, i, src[i])
  if (!re[i]) {
    re[i] = new RegExp(src[i])
  }
})

export interface Options {
  loose?: boolean
  includePrerelease?: boolean
}

export type ReleaseType =
  | 'major'
  | 'premajor'
  | 'minor'
  | 'preminor'
  | 'patch'
  | 'prepatch'
  | 'pre'
  | 'prerelease'

export type CompareResult = 1 | 0 | -1
export type Operator = '' | '=' | '<' | '>' | '<=' | '>='

/**
 * Return the parsed version as a SemVer object, or null if it's not valid.
 */
export function parse(
  version: string | SemVer | null | undefined,
  options?: boolean | Options
): SemVer | null {
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

  const r = options.loose ? re.LOOSE : re.FULL
  if (!r.test(version)) {
    return null
  }

  try {
    return new SemVer(version, options)
  } catch (_) {
    return null
  }
}

/**
 * Return the parsed version as a string, or null if it's not valid.
 */
export function valid(
  version: string | SemVer | null | undefined,
  options?: boolean | Options
): string | null {
  const v = parse(version, options)
  return v ? v.version : null
}

/**
 * Returns cleaned (removed leading/trailing whitespace, remove '=v' prefix) and
 * parsed version, or null if version is invalid.
 */
export function clean(version: string, options?: boolean | Options): string | null {
  const s = parse(version.trim().replace(/^[=v]+/, ''), options)
  return s ? s.version : null
}

export class SemVer {
  raw: string
  readonly loose: boolean
  readonly options: Options

  major: number
  minor: number
  patch: number
  version!: string
  build: ReadonlyArray<string>
  prerelease: Array<string | number>

  constructor(version: string | SemVer, options?: boolean | Options) {
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
      throw new TypeError(`version is longer than ${MAX_LENGTH} characters`)
    }

    if (!(this instanceof SemVer)) {
      return new SemVer(version, options)
    }

    debug('SemVer', version, options)
    this.options = options
    this.loose = !!options.loose

    const m = version.trim().match(options.loose ? re.LOOSE : re.FULL)
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
      this.prerelease = m[4].split('.').map((id) => {
        if (/^[0-9]+$/.test(id)) {
          const num = +id
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

  format(): string {
    this.version = `${this.major}.${this.minor}.${this.patch}`
    if (this.prerelease.length) {
      this.version += '-' + this.prerelease.join('.')
    }
    return this.version
  }

  toString(): string {
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
  compare(other: string | SemVer): CompareResult {
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
  compareMain(other: string | SemVer): CompareResult {
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
  comparePre(other: string | SemVer): CompareResult {
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

    for (let i = 0; ; i++) {
      const a = this.prerelease[i]
      const b = other.prerelease[i]
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
  inc(release: ReleaseType, identifier?: string | number): this {
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
          let i = this.prerelease.length
          let pr: string | number
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
            if (isNaN(this.prerelease[1] as number)) {
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
}

/**
 * Return the version incremented by the release type (major, minor, patch, or
 * prerelease), or null if it's not valid.
 */
export function inc(
  version: string | SemVer,
  release: ReleaseType,
  loose?: boolean | Options,
  identifier?: string | number
): string | null

export function inc(
  version: string | SemVer,
  release: ReleaseType,
  identifier?: string | number
): string | null

/**
 * Return the version incremented by the release type (major, minor, patch, or
 * prerelease), or null if it's not valid.
 */
export function inc(
  version: string | SemVer,
  release: ReleaseType,
  loose?: boolean | Options | typeof identifier,
  identifier?: string | number
): string | null {
  if (typeof loose === 'string' || typeof loose === 'number') {
    identifier = loose
    loose = undefined
  }

  try {
    return new SemVer(version, <boolean | Options | undefined>loose).inc(
      release,
      identifier
    ).version
  } catch (_) {
    return null
  }
}

/**
 * Returns difference between two versions by the release type (major, premajor,
 * minor, preminor, patch, prepatch, or prerelease), or null if the versions are
 * the same.
 */
export function diff(
  version1: string | SemVer,
  version2: string | SemVer,
  loose?: boolean | Options
): ReleaseType | null | undefined {
  if (eq(version1, version2, loose)) {
    return null
  }

  const v1 = parse(version1, loose) as SemVer
  const v2 = parse(version2, loose) as SemVer
  let prefix = ''
  let defaultResult: ReleaseType | undefined
  if (v1.prerelease.length || v2.prerelease.length) {
    prefix = 'pre'
    defaultResult = 'prerelease'
  }
  for (const key in v1) {
    if (key === 'major' || key === 'minor' || key === 'patch') {
      if (v1[key] !== v2[key]) {
        return (prefix + key) as ReleaseType
      }
    }
  }
  return defaultResult // may be undefined
}

const numeric = /^[0-9]+$/
/**
 * Compares two identifiers, must be numeric strings or truthy/falsy values.
 *
 * Sorts in ascending order when passed to `Array.sort()`.
 */
export function compareIdentifiers(
  a: string | number,
  b: string | number
): CompareResult {
  const anum = numeric.test(a as string)
  const bnum = numeric.test(b as string)

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

/**
 * The reverse of compareIdentifiers.
 *
 * Sorts in descending order when passed to `Array.sort()`.
 */
export function rcompareIdentifiers(
  a: string | number,
  b: string | number
): CompareResult {
  return compareIdentifiers(b, a)
}

/**
 * Return the major version number.
 */
export function major(a: string | SemVer, loose?: boolean | Options): number {
  return new SemVer(a, loose).major
}

/**
 * Return the minor version number.
 */
export function minor(a: string | SemVer, loose?: boolean | Options): number {
  return new SemVer(a, loose).minor
}

/**
 * Return the patch version number.
 */
export function patch(a: string | SemVer, loose?: boolean | Options): number {
  return new SemVer(a, loose).patch
}

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
export function compare(
  a: string | SemVer,
  b: string | SemVer,
  loose?: boolean | Options
): CompareResult {
  return new SemVer(a, loose).compare(new SemVer(b, loose))
}

export function compareLoose(a: string | SemVer, b: string | SemVer): CompareResult {
  return compare(a, b, true)
}

/**
 * The reverse of compare.
 *
 * Sorts in descending order when passed to `Array.sort()`.
 */
export function rcompare(
  a: string | SemVer,
  b: string | SemVer,
  loose?: boolean | Options
): CompareResult {
  return compare(b, a, loose)
}

/**
 * Sorts an array of semver entries in ascending order using `compareBuild()`.
 */
export function sort<T extends string | SemVer>(
  list: T[],
  loose?: boolean | Options
): T[] {
  return list.sort((a, b) => compare(a, b, loose))
}

/**
 * Sorts an array of semver entries in descending order using `compareBuild()`.
 */
export function rsort<T extends string | SemVer>(
  list: T[],
  loose?: boolean | Options
): T[] {
  return list.sort((a, b) => rcompare(a, b, loose))
}

/** v1 > v2 */
export function gt(
  a: string | SemVer,
  b: string | SemVer,
  loose?: boolean | Options
): boolean {
  return compare(a, b, loose) > 0
}

/** v1 < v2 */
export function lt(
  a: string | SemVer,
  b: string | SemVer,
  loose?: boolean | Options
): boolean {
  return compare(a, b, loose) < 0
}

/**
 * v1 == v2 This is true if they're logically equivalent, even if they're not
 * the exact same string. You already know how to compare strings.
 */
export function eq(
  a: string | SemVer,
  b: string | SemVer,
  loose?: boolean | Options
): boolean {
  return compare(a, b, loose) === 0
}

/**
 * v1 != v2 The opposite of eq.
 */
export function neq(
  a: string | SemVer,
  b: string | SemVer,
  loose?: boolean | Options
): boolean {
  return compare(a, b, loose) !== 0
}

/** v1 >= v2 */
export function gte(
  a: string | SemVer,
  b: string | SemVer,
  loose?: boolean | Options
): boolean {
  return compare(a, b, loose) >= 0
}

/** v1 <= v2 */
export function lte(
  a: string | SemVer,
  b: string | SemVer,
  loose?: boolean | Options
): boolean {
  return compare(a, b, loose) <= 0
}

/**
 * Pass in a comparison string, and it'll call the corresponding semver comparison
 * function. "===" and "!==" do simple string comparison, but are included for
 * completeness. Throws if an invalid comparison string is provided.
 */
export function cmp(
  a: string | SemVer,
  op: '===' | '!==' | '==' | '!=' | Operator,
  b: string | SemVer,
  loose?: boolean | Options
): boolean {
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

const ANY = {} as SemVer
export class Comparator {
  semver!: SemVer
  operator!: Operator
  readonly value: string
  readonly loose: boolean
  readonly options: Options

  constructor(comp: string | Comparator, options?: boolean | Options) {
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

  parse(comp: string): void {
    const r = this.options.loose ? re.COMPARATORLOOSE : re.COMPARATOR
    const m = comp.match(r)
    if (!m) {
      throw new TypeError('Invalid comparator: ' + comp)
    }

    this.operator = m[1] as Operator
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

  toString(): string {
    return this.value
  }

  test(version: string | SemVer): boolean {
    debug('Comparator.test', version, this.options.loose)

    if (this.semver === ANY) {
      return true
    }

    if (typeof version === 'string') {
      version = new SemVer(version, this.options)
    }

    return cmp(version, this.operator, this.semver, this.options)
  }

  intersects(comp: Comparator, options?: boolean | Options): boolean {
    if (!(comp instanceof Comparator)) {
      throw new TypeError('a Comparator is required')
    }

    if (!options || typeof options !== 'object') {
      options = {
        loose: !!options,
        includePrerelease: false
      }
    }

    let rangeTmp: Range
    if (this.operator === '') {
      rangeTmp = new Range(comp.value, options)
      return satisfies(this.value, rangeTmp, options)
    } else if (comp.operator === '') {
      rangeTmp = new Range(this.value, options)
      return satisfies(comp.semver, rangeTmp, options)
    }

    const sameDirectionIncreasing =
      (this.operator === '>=' || this.operator === '>') &&
      (comp.operator === '>=' || comp.operator === '>')
    const sameDirectionDecreasing =
      (this.operator === '<=' || this.operator === '<') &&
      (comp.operator === '<=' || comp.operator === '<')
    const sameSemVer = this.semver.version === comp.semver.version
    const differentDirectionsInclusive =
      (this.operator === '>=' || this.operator === '<=') &&
      (comp.operator === '>=' || comp.operator === '<=')
    const oppositeDirectionsLessThan =
      cmp(this.semver, '<', comp.semver, options) &&
      (this.operator === '>=' || this.operator === '>') &&
      (comp.operator === '<=' || comp.operator === '<')
    const oppositeDirectionsGreaterThan =
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
}

export class Range {
  range!: string
  readonly raw: string
  readonly loose: boolean
  readonly options: Options
  readonly includePrerelease: boolean

  set: ReadonlyArray<ReadonlyArray<Comparator>>

  constructor(range: string | Range | Comparator, options?: boolean | Options) {
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
      .map((range) => this.parseRange(range.trim()))
      // throw out any that are not relevant for whatever reason
      .filter((c) => c.length)

    if (!this.set.length) {
      throw new TypeError('Invalid SemVer Range: ' + range)
    }

    this.format()
  }

  format(): string {
    this.range = this.set
      .map((comps) => comps.join(' ').trim())
      .join('||')
      .trim()
    return this.range
  }

  toString(): string {
    return this.range
  }

  /** @param {string} range */
  parseRange(range: string): ReadonlyArray<Comparator> {
    const loose = this.options.loose
    range = range.trim()
    // `1.2.3 - 1.2.4` => `>=1.2.3 <=1.2.4`
    const hr = loose ? re.HYPHENRANGELOOSE : re.HYPHENRANGE
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

    const compRe = loose ? re.COMPARATORLOOSE : re.COMPARATOR
    let set = range
      .split(' ')
      .map((comp) => parseComparator(comp, this.options))
      .join(' ')
      .split(/\s+/)
    if (this.options.loose) {
      // in loose mode, throw out any that are not valid comparators
      set = set.filter((comp) => !!comp.match(compRe))
    }

    return set.map((comp) => new Comparator(comp, this.options))
  }

  intersects(range: Range, options?: boolean | Options): boolean {
    if (!(range instanceof Range)) {
      throw new TypeError('a Range is required')
    }

    return this.set.some((thisComparators) =>
      thisComparators.every((thisComparator) =>
        range.set.some((rangeComparators) =>
          rangeComparators.every((rangeComparator) =>
            thisComparator.intersects(rangeComparator, options)
          )
        )
      )
    )
  }

  /**
   * If ANY of the sets match ALL of its comparators, then pass.
   */
  test(version: string | SemVer | null | undefined): boolean {
    if (!version) {
      return false
    }

    if (typeof version === 'string') {
      version = new SemVer(version, this.options)
    }

    for (let i = 0; i < this.set.length; i++) {
      if (testSet(this.set[i], version, this.options)) {
        return true
      }
    }
    return false
  }
}

/**
 * Mostly just for testing and legacy API reasons.
 */
export function toComparators(
  range: string | Range | Comparator,
  options?: boolean | Options
): ReadonlyArray<ReadonlyArray<string>> {
  return new Range(range, options).set.map((comp) =>
    comp
      .map((c) => c.value)
      .join(' ')
      .trim()
      .split(' ')
  )
}

/**
 * comprised of xranges, tildes, stars, and gtlt's at this point.
 * already replaced the hyphen ranges turn into a set of JUST comparators.
 */
function parseComparator(comp: string, options: Options): string {
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

function isX(id: string | null | undefined): boolean {
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
function replaceTildes(comp: string, options: Options): string {
  return comp
    .trim()
    .split(/\s+/)
    .map((comp) => replaceTilde(comp, options))
    .join(' ')
}

function replaceTilde(comp: string, options: Options): string {
  const r = options.loose ? re.TILDELOOSE : re.TILDE
  return comp.replace(r, (_, M, m, p, pr) => {
    debug('tilde', comp, _, M, m, p, pr)
    let ret: string

    if (isX(M)) {
      ret = ''
    } else if (isX(m)) {
      ret = `>=${M}.0.0 <${+M + 1}.0.0`
    } else if (isX(p)) {
      // ~1.2 == >=1.2.0 <1.3.0
      ret = `>=${M}.${m}.0 <${M}.${+m + 1}.0`
    } else if (pr) {
      debug('replaceTilde pr', pr)
      ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0`
    } else {
      // ~1.2.3 == >=1.2.3 <1.3.0
      ret = `>=${M}.${m}.${p} <${M}.${+m + 1}.0`
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
function replaceCarets(comp: string, options: Options): string {
  return comp
    .trim()
    .split(/\s+/)
    .map((comp) => replaceCaret(comp, options))
    .join(' ')
}

function replaceCaret(comp: string, options: Options): string {
  debug('caret', comp, options)
  const r = options.loose ? re.CARETLOOSE : re.CARET
  return comp.replace(r, (_, M, m, p, pr) => {
    debug('caret', comp, _, M, m, p, pr)
    let ret: string

    if (isX(M)) {
      ret = ''
    } else if (isX(m)) {
      ret = `>=${M}.0.0 <${+M + 1}.0.0`
    } else if (isX(p)) {
      if (M === '0') {
        ret = `>=${M}.${m}.0 <${M}.${+m + 1}.0`
      } else {
        ret = `>=${M}.${m}.0 <${+M + 1}.0.0`
      }
    } else if (pr) {
      debug('replaceCaret pr', pr)
      if (M === '0') {
        if (m === '0') {
          ret = `>=${M}.${m}.${p}-${pr} <${M}.${m}.${+p + 1}`
        } else {
          ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0`
        }
      } else {
        ret = `>=${M}.${m}.${p}-${pr} <${+M + 1}.0.0`
      }
    } else {
      debug('no pr')
      if (M === '0') {
        if (m === '0') {
          ret = `>=${M}.${m}.${p} <${M}.${m}.${+p + 1}`
        } else {
          ret = `>=${M}.${m}.${p} <${M}.${+m + 1}.0`
        }
      } else {
        ret = `>=${M}.${m}.${p} <${+M + 1}.0.0`
      }
    }

    debug('caret return', ret)
    return ret
  })
}

function replaceXRanges(comp: string, options: Options): string {
  debug('replaceXRanges', comp, options)
  return comp
    .split(/\s+/)
    .map((comp) => replaceXRange(comp, options))
    .join(' ')
}

function replaceXRange(comp: string, options: Options): string {
  comp = comp.trim()
  const r = options.loose ? re.XRANGELOOSE : re.XRANGE
  return comp.replace(r, (ret, gtlt, M, m, p, pr) => {
    debug('xRange', comp, ret, gtlt, M, m, p, pr)
    const xM = isX(M)
    const xm = xM || isX(m)
    const xp = xm || isX(p)
    const anyX = xp

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

      ret = `${gtlt}${M}.${m}.${p}`
    } else if (xm) {
      ret = `>=${M}.0.0 <${+M + 1}.0.0`
    } else if (xp) {
      ret = `>=${M}.${m}.0 <${M}.${+m + 1}.0`
    }

    debug('xRange return', ret)

    return ret
  })
}

/**
 * Because * is AND-ed with everything else in the comparator,
 * and '' means "any version", just remove the *s entirely.
 */
function replaceStars(comp: string, options?: boolean | Options): string {
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
function hyphenReplace(
  $0: string,
  from: any, fM: any, fm: any, fp: any, fpr: any, fb: any,
  to: any, tM: any, tm: any, tp: any, tpr: any, _tb: any
): string {
  if (isX(fM)) {
    from = ''
  } else if (isX(fm)) {
    from = `>=${fM}.0.0`
  } else if (isX(fp)) {
    from = `>=${fM}.${fm}.0`
  } else {
    from = '>=' + from
  }

  if (isX(tM)) {
    to = ''
  } else if (isX(tm)) {
    to = `<${+tM + 1}.0.0`
  } else if (isX(tp)) {
    to = `<${tM}.${+tm + 1}.0`
  } else if (tpr) {
    to = `<=${tM}.${tm}.${tp}-${tpr}`
  } else {
    to = '<=' + to
  }

  return `${from} ${to}`.trim()
}

function testSet(
  set: ReadonlyArray<Comparator>,
  version: SemVer,
  options: Options
): boolean {
  let i: number
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
        const allowed = set[i].semver
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
export function satisfies(
  version: string | SemVer | null | undefined,
  range: string | Range | Comparator,
  options?: boolean | Options
): boolean {
  try {
    range = new Range(range, options)
  } catch (_) {
    return false
  }
  return range.test(version)
}

/**
 * Return the highest version in the list that satisfies the range, or
 * null if none of them do.
 */
export function maxSatisfying<T extends string | SemVer>(
  versions: ReadonlyArray<T>,
  range: string | Range | Comparator,
  options?: boolean | Options
): T | null {
  let max: T | null = null
  let maxSV = null as unknown as SemVer
  let rangeObj: Range
  try {
    rangeObj = new Range(range, options)
  } catch (_) {
    return null
  }
  versions.forEach((v) => {
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

/**
 * Return the lowest version in the list that satisfies the range, or
 * null if none of them do.
 */
export function minSatisfying<T extends string | SemVer>(
  versions: ReadonlyArray<T>,
  range: string | Range | Comparator,
  options?: boolean | Options
): T | null {
  let min: T | null = null
  let minSV = null as unknown as SemVer
  let rangeObj: Range
  try {
    rangeObj = new Range(range, options)
  } catch (_) {
    return null
  }
  versions.forEach((v) => {
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

/**
 * Return the lowest version that can possibly match the given range.
 */
export function minVersion(
  range: string | Range | Comparator,
  loose?: boolean | Options
): SemVer | null {
  range = new Range(range, loose)

  let minver: SemVer | null = new SemVer('0.0.0')
  if (range.test(minver)) {
    return minver
  }

  minver = new SemVer('0.0.0-0')
  if (range.test(minver)) {
    return minver
  }

  minver = null
  for (let i = 0; i < range.set.length; ++i) {
    const comparators = range.set[i]

    comparators.forEach((comparator) => {
      // Clone to avoid manipulating the comparator's semver object.
      const compver = new SemVer(comparator.semver.version)
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

/**
 * Return the valid range or null if it's not valid.
 */
export function validRange(
  range: string | Range | Comparator,
  options?: boolean | Options
): string | null {
  try {
    // Return '*' instead of '' so that truthiness works.
    // This will throw if it's invalid anyway
    return new Range(range, options).range || '*'
  } catch (_) {
    return null
  }
}

/**
 * Determine if version is less than all the versions possible in the range.
 */
export function ltr(
  version: string | SemVer,
  range: string | Range | Comparator,
  options?: boolean | Options
): boolean {
  return outside(version, range, '<', options)
}

/**
 * Determine if version is greater than all the versions possible in the range.
 */
export function gtr(
  version: string | SemVer,
  range: string | Range | Comparator,
  options?: boolean | Options
): boolean {
  return outside(version, range, '>', options)
}

/**
 * Return true if the version is outside the bounds of the range in either the
 * high or low direction. The hilo argument must be either the string '>' or '<'.
 * (This is the function called by gtr and ltr)
 */
export function outside(
  version: string | SemVer,
  range: string | Range | Comparator,
  hilo: '>' | '<',
  options?: boolean | Options
): boolean {
  version = new SemVer(version, options)
  range = new Range(range, options)

  let gtfn: Function, ltefn: Function, ltfn: Function, comp: string, ecomp: string
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

  for (let i = 0; i < range.set.length; ++i) {
    const comparators = range.set[i]

    /** @type {Comparator} */ let high = null as unknown as Comparator
    /** @type {Comparator} */ let low = null as unknown as Comparator

    for (let comparator of comparators) {
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

/**
 * Returns an array of prerelease components, or null if none exist.
 */
export function prerelease(
  version: string | SemVer,
  options?: boolean | Options
): Array<string | number> | null {
  const parsed = parse(version, options)
  return parsed && parsed.prerelease.length ? parsed.prerelease : null
}

/**
 * Return true if any of the ranges comparators intersect.
 */
export function intersects(
  r1: string | Range | Comparator,
  r2: string | Range | Comparator,
  options?: boolean | Options
): boolean {
  r1 = new Range(r1, options)
  r2 = new Range(r2, options)
  return r1.intersects(r2)
}

/**
 * Coerces a string to SemVer if possible.
 */
export function coerce(version: string | SemVer | null | undefined): SemVer | null {
  if (version instanceof SemVer) {
    return version
  }

  if (typeof version !== 'string') {
    return null
  }

  const match = version.match(re.COERCE)
  if (!match) {
    return null
  }

  return parse(`${match[1]}.${match[2] || '0'}.${match[3] || '0'}`)
}

export default SemVer
