import { describe, it, expect, afterEach } from 'vitest'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { keyArgs } = require('./db.cjs')

describe('v4 db key passthrough', () => {
  afterEach(() => { delete process.env.V4_KEY; delete process.env.V4_AGENT_ID })
  it('passes no --key by default (shared key)', () => {
    expect(keyArgs('phrase-v4', undefined)).toEqual([])
  })
  it('V4_KEY=kai passes --key kai for a kai- agent', () => {
    expect(keyArgs('kai-gapfill', 'kai')).toEqual(['--key', 'kai'])
  })
  it('V4_KEY=kai refuses a bare kai or non-kai agent id', () => {
    expect(() => keyArgs('kai', 'kai')).toThrow(/kai-/)
    expect(() => keyArgs('phrase-v4', 'kai')).toThrow(/kai-/)
  })
  it('reads V4_KEY from the environment', () => {
    process.env.V4_KEY = 'kai'; process.env.V4_AGENT_ID = 'kai-x'
    expect(keyArgs()).toEqual(['--key', 'kai'])
  })
  it('rejects a malformed key name', () => {
    expect(() => keyArgs('a-b', '../x')).toThrow(/V4_KEY/)
  })
})
