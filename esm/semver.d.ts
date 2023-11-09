// Type definitions for semver v5.7.1

// Note: this is the semver.org version of the spec that it implements
// Not necessarily the package version of this code.
export declare const SEMVER_SPEC_VERSION = '2.0.0'

declare type R =
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
export declare const re: Record<R, RegExp>
export declare const src: Record<R, string>

export interface Options {
  loose?: boolean
  includePrerelease?: boolean
}

export declare type ReleaseType =
  | 'major'
  | 'premajor'
  | 'minor'
  | 'preminor'
  | 'patch'
  | 'prepatch'
  | 'pre'
  | 'prerelease'

export declare type CompareResult = 1 | 0 | -1
export declare type Operator = '' | '=' | '<' | '>' | '<=' | '>='

/**
 * Return the parsed version as a SemVer object, or null if it's not valid.
 */
export declare function parse(
  version: string | SemVer | null | undefined,
  options?: boolean | Options
): SemVer | null

/**
 * Return the parsed version as a string, or null if it's not valid.
 */
export declare function valid(
  version: string | SemVer | null | undefined,
  options?: boolean | Options
): string | null

/**
 * Returns cleaned (removed leading/trailing whitespace, remove '=v' prefix) and
 * parsed version, or null if version is invalid.
 */
export declare function clean(
  version: string,
  options?: boolean | Options
): string | null

export declare class SemVer {
  raw: string
  readonly loose: boolean
  readonly options: Options

  major: number
  minor: number
  patch: number
  version: string
  build: ReadonlyArray<string>
  prerelease: Array<string | number>

  constructor(version: string | SemVer, options?: boolean | Options)

  format(): string
  toString(): string

  /**
   * Compares two versions excluding build identifiers (the bit after `+` in
   * the semantic version string).
   *
   * @return
   * - `0` if `this` == `other`
   * - `1` if `this` is greater
   * - `-1` if `other` is greater
   */
  compare(other: string | SemVer): CompareResult

  /**
   * Compares the release portion of two versions.
   *
   * @return
   * - `0` if `this` == `other`
   * - `1` if `this` is greater
   * - `-1` if `other` is greater
   */
  compareMain(other: string | SemVer): CompareResult

  /**
   * Compares the prerelease portion of two versions.
   *
   * @return
   * - `0` if `this` == `other`
   * - `1` if `this` is greater
   * - `-1` if `other` is greater
   */
  comparePre(other: string | SemVer): CompareResult

  /**
   * preminor will bump the version up to the next minor release, and immediately
   * down to pre-release. premajor and prepatch work the same way.
   */
  inc(release: ReleaseType, identifier?: string | number): this
}

/**
 * Return the version incremented by the release type (major, minor, patch, or
 * prerelease), or null if it's not valid.
 */
export declare function inc(
  version: string | SemVer,
  release: ReleaseType,
  loose?: boolean | Options,
  identifier?: string | number
): string | null

export declare function inc(
  version: string | SemVer,
  release: ReleaseType,
  identifier?: string | number
): string | null

/**
 * Returns difference between two versions by the release type (major, premajor,
 * minor, preminor, patch, prepatch, or prerelease), or null if the versions are
 * the same.
 */
export declare function diff(
  version1: string | SemVer,
  version2: string | SemVer,
  loose?: boolean | Options
): ReleaseType | null | undefined

/**
 * Compares two identifiers, must be numeric strings or truthy/falsy values.
 *
 * Sorts in ascending order when passed to `Array.sort()`.
 */
export declare function compareIdentifiers(
  a: string | number,
  b: string | number
): CompareResult

/**
 * The reverse of compareIdentifiers.
 *
 * Sorts in descending order when passed to `Array.sort()`.
 */
export declare function rcompareIdentifiers(
  a: string | number,
  b: string | number
): CompareResult

/**
 * Return the major version number.
 */
export declare function major(a: string | SemVer, loose?: boolean | Options): number

/**
 * Return the minor version number.
 */
export declare function minor(a: string | SemVer, loose?: boolean | Options): number

/**
 * Return the patch version number.
 */
export declare function patch(a: string | SemVer, loose?: boolean | Options): number

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
export declare function compare(
  a: string | SemVer,
  b: string | SemVer,
  loose?: boolean | Options
): CompareResult

export declare function compareLoose(
  a: string | SemVer,
  b: string | SemVer
): CompareResult

/**
 * The reverse of compare.
 *
 * Sorts in descending order when passed to `Array.sort()`.
 */
export declare function rcompare(
  a: string | SemVer,
  b: string | SemVer,
  loose?: boolean | Options
): CompareResult

/**
 * Sorts an array of semver entries in ascending order using `compareBuild()`.
 */
export declare function sort<T extends string | SemVer>(
  list: T[],
  loose?: boolean | Options
): T[]

/**
 * Sorts an array of semver entries in descending order using `compareBuild()`.
 */
export declare function rsort<T extends string | SemVer>(
  list: T[],
  loose?: boolean | Options
): T[]

/** v1 > v2 */
export declare function gt(
  a: string | SemVer,
  b: string | SemVer,
  loose?: boolean | Options
): boolean

/** v1 < v2 */
export declare function lt(
  a: string | SemVer,
  b: string | SemVer,
  loose?: boolean | Options
): boolean

/**
 * v1 == v2 This is true if they're logically equivalent, even if they're not
 * the exact same string. You already know how to compare strings.
 */
export declare function eq(
  a: string | SemVer,
  b: string | SemVer,
  loose?: boolean | Options
): boolean

/**
 * v1 != v2 The opposite of eq.
 */
export declare function neq(
  a: string | SemVer,
  b: string | SemVer,
  loose?: boolean | Options
): boolean

/** v1 >= v2 */
export declare function gte(
  a: string | SemVer,
  b: string | SemVer,
  loose?: boolean | Options
): boolean

/** v1 <= v2 */
export declare function lte(
  a: string | SemVer,
  b: string | SemVer,
  loose?: boolean | Options
): boolean

/**
 * Pass in a comparison string, and it'll call the corresponding semver comparison
 * function. "===" and "!==" do simple string comparison, but are included for
 * completeness. Throws if an invalid comparison string is provided.
 */
export declare function cmp(
  a: string | SemVer,
  op: '===' | '!==' | '==' | '!=' | Operator,
  b: string | SemVer,
  loose?: boolean | Options
): boolean

export declare class Comparator {
  semver: SemVer
  operator: Operator
  readonly value: string
  readonly loose: boolean
  readonly options: Options

  constructor(comp: string | Comparator, options?: boolean | Options)

  parse(comp: string): void
  toString(): string

  test(version: string | SemVer): boolean
  intersects(comp: Comparator, options?: boolean | Options): boolean
}

export declare class Range {
  range: string
  readonly raw: string
  readonly loose: boolean
  readonly options: Options
  readonly includePrerelease: boolean

  set: ReadonlyArray<ReadonlyArray<Comparator>>

  constructor(range: string | Range | Comparator, options?: boolean | Options)

  format(): string
  toString(): string

  parseRange(range: string): ReadonlyArray<Comparator>
  intersects(range: Range, options?: boolean | Options): boolean

  /**
   * If ANY of the sets match ALL of its comparators, then pass.
   */
  test(version: string | SemVer | null | undefined): boolean
}

/**
 * Mostly just for testing and legacy API reasons.
 */
export declare function toComparators(
  range: string | Range | Comparator,
  options?: boolean | Options
): ReadonlyArray<ReadonlyArray<string>>

/**
 * Return true if the version satisfies the range.
 */
export declare function satisfies(
  version: string | SemVer | null | undefined,
  range: string | Range | Comparator,
  options?: boolean | Options
): boolean

/**
 * Return the highest version in the list that satisfies the range, or
 * null if none of them do.
 */
export declare function maxSatisfying<T extends string | SemVer>(
  versions: ReadonlyArray<T>,
  range: string | Range | Comparator,
  options?: boolean | Options
): T | null

/**
 * Return the lowest version in the list that satisfies the range, or
 * null if none of them do.
 */
export declare function minSatisfying<T extends string | SemVer>(
  versions: ReadonlyArray<T>,
  range: string | Range | Comparator,
  options?: boolean | Options
): T | null

/**
 * Return the lowest version that can possibly match the given range.
 */
export declare function minVersion(
  range: string | Range | Comparator,
  loose?: boolean | Options
): SemVer | null

/**
 * Return the valid range or null if it's not valid.
 */
export declare function validRange(
  range: string | Range | Comparator,
  options?: boolean | Options
): string | null

/**
 * Determine if version is less than all the versions possible in the range.
 */
export declare function ltr(
  version: string | SemVer,
  range: string | Range,
  options?: boolean | Options
): boolean

/**
 * Determine if version is greater than all the versions possible in the range.
 */
export declare function gtr(
  version: string | SemVer,
  range: string | Range,
  options?: boolean | Options
): boolean

/**
 * Return true if the version is outside the bounds of the range in either the
 * high or low direction. The hilo argument must be either the string '>' or '<'.
 * (This is the function called by gtr and ltr)
 */
export declare function outside(
  version: string | SemVer,
  range: string | Range,
  hilo: '>' | '<',
  options?: boolean | Options
): boolean

/**
 * Returns an array of prerelease components, or null if none exist.
 */
export declare function prerelease(
  version: string | SemVer,
  options?: boolean | Options
): Array<string | number> | null

/**
 * Return true if any of the ranges comparators intersect.
 */
export declare function intersects(
  r1: string | Range,
  r2: string | Range,
  options?: boolean | Options
): boolean

/**
 * Coerces a string to SemVer if possible.
 */
export declare function coerce(
  version: string | SemVer | null | undefined
): SemVer | null

export default SemVer
