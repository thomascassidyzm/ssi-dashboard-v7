/**
 * The config hash is an identity, so what is pinned here is the things that
 * must NOT change it (key insertion order, a JSON round-trip) and the things
 * that must (any value, the key it is saved under, an array's order).
 */
import { describe, it, expect } from 'vitest'
import { hashConfig, canonicalJSON } from './config-hash.js'

describe('canonicalJSON', () => {
  it('sorts object keys at every depth, and leaves arrays in order', () => {
    expect(canonicalJSON({ b: 1, a: { d: [3, 1, 2], c: true } }))
      .toBe('{"a":{"c":true,"d":[3,1,2]},"b":1}')
  })

  it('drops undefined in objects and nulls it in arrays, as JSON does', () => {
    expect(canonicalJSON({ a: undefined, b: 1 })).toBe('{"b":1}')
    expect(canonicalJSON([1, undefined, 2])).toBe('[1,null,2]')
  })

  it('emits null for non-finite numbers rather than invalid JSON', () => {
    expect(canonicalJSON({ a: NaN, b: Infinity })).toBe('{"a":null,"b":null}')
  })
})

describe('hashConfig', () => {
  it('is deterministic under key reordering, at every depth', () => {
    const a = { pods: { gap: 1.5, tail: 2 }, spacedRepOffsets: [1, 2, 3], enabled: true }
    const b = { enabled: true, spacedRepOffsets: [1, 2, 3], pods: { tail: 2, gap: 1.5 } }
    expect(hashConfig('listening', a)).toBe(hashConfig('listening', b))
  })

  it('survives a JSON round-trip unchanged', () => {
    const config = { a: [{ z: 1, y: 2 }], nested: { deep: { k: 'v' } } }
    expect(hashConfig('pods', JSON.parse(JSON.stringify(config)))).toBe(hashConfig('pods', config))
  })

  it('changes when any value changes', () => {
    expect(hashConfig('pods', { gap: 1 })).not.toBe(hashConfig('pods', { gap: 1.0001 }))
    expect(hashConfig('pods', { gap: 1 })).not.toBe(hashConfig('pods', { gap: '1' }))
  })

  it('changes when the array order changes — order IS the content', () => {
    expect(hashConfig('pods', { offsets: [1, 2] })).not.toBe(hashConfig('pods', { offsets: [2, 1] }))
  })

  it('binds the config to its key, so one config under two keys gets two hashes', () => {
    const config = { gap: 1 }
    expect(hashConfig('pods', config)).not.toBe(hashConfig('listening', config))
  })

  it('is a sha256 hex digest', () => {
    expect(hashConfig('pods', { gap: 1 })).toMatch(/^[0-9a-f]{64}$/)
  })

  it('is stable across runs — a pinned value, so a refactor cannot silently rename every config', () => {
    // sha256 of {"config":{"gap":1},"key":"pods"}
    expect(hashConfig('pods', { gap: 1 }))
      .toBe('8d835ec496653d181bafe26445397407a06b53a83b740d3572b3be18ac40aedd')
  })

  it('refuses a missing key or config rather than hashing a hole', () => {
    expect(() => hashConfig('', { a: 1 })).toThrow()
    expect(() => hashConfig('pods', undefined)).toThrow()
  })
})
