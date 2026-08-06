/**
 * Content-addressed algorithm config — the hash, and only the hash.
 *
 * `algorithm_config` is one row per key, upserted in place: no version, no
 * history, no draft/published split, and a five-minute cache in the learning
 * app (useAlgorithmConfig.ts:487) that turns a Save into a production deploy to
 * every learner with no undo. The fix is the one the audio store got — hash the
 * config, store it immutably, and let the live pointer name a hash.
 *
 * This file is the single definition of what that hash IS. Anything else that
 * needs to name a config (a migration back-fill, a lab, a report) computes it
 * here or reproduces this canonicalisation exactly — two spellings of one
 * identity is precisely the defect being removed.
 *
 * The canonical form is JSON with object keys sorted lexicographically at every
 * depth and arrays left in order (an array's order IS its content — reordering
 * it is a different config). The hashed document is {config, key}, so the same
 * object saved under two keys gets two hashes: a pointer names a config FOR a
 * key, and rollback must never be able to serve `pods` a `listening` config.
 *
 * Determinism holds across key insertion order, so a round-trip through a form,
 * a clipboard or JSON.parse cannot change a config's name.
 */

import crypto from 'crypto'

/**
 * Canonical JSON serialisation: recursively key-sorted objects, arrays in
 * order. Deliberately NOT JSON.stringify's replacer/space options — this string
 * is an identity, so it takes no formatting arguments at all.
 *
 * `undefined` and functions are dropped inside objects (as JSON.stringify does)
 * and become null inside arrays (likewise), so a canonical string is always
 * valid JSON.
 */
export function canonicalJSON(value) {
  return stringify(value)
}

function stringify(value) {
  if (value === null) return 'null'

  const type = typeof value
  if (type === 'number') return Number.isFinite(value) ? JSON.stringify(value) : 'null'
  if (type === 'boolean') return value ? 'true' : 'false'
  if (type === 'string') return JSON.stringify(value)
  if (type === 'bigint') throw new TypeError('Cannot serialise BigInt into a config hash')
  if (type !== 'object') return undefined // undefined, function, symbol

  // Dates and anything else with toJSON serialise through it, as JSON does.
  if (typeof value.toJSON === 'function') return stringify(value.toJSON())

  if (Array.isArray(value)) {
    const parts = value.map(v => {
      const s = stringify(v)
      return s === undefined ? 'null' : s
    })
    return `[${parts.join(',')}]`
  }

  const parts = []
  for (const k of Object.keys(value).sort()) {
    const s = stringify(value[k])
    if (s === undefined) continue
    parts.push(`${JSON.stringify(k)}:${s}`)
  }
  return `{${parts.join(',')}}`
}

/**
 * The content address of `config` as saved under `key`: sha256 hex of the
 * canonical JSON of {config, key}.
 */
export function hashConfig(key, config) {
  if (typeof key !== 'string' || !key) {
    throw new TypeError('hashConfig: key is required (non-empty string)')
  }
  if (config === undefined) {
    throw new TypeError('hashConfig: config is required')
  }
  return crypto.createHash('sha256').update(canonicalJSON({ key, config }), 'utf8').digest('hex')
}

export default { hashConfig, canonicalJSON }
