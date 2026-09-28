/**
 * SURFACE MY-VOICE CLONES ARE NEVER COURSE VOICES (#587, Tom 2026-09-28).
 *
 * The command surface lets anyone clone their OWN voice for their own videos. Those clones live on
 * the same Cartesia account Popty registers course voices from, so without this guard any of them
 * could be cast into an SSi course. The surface publishes every clone id it has ever made to a
 * file on watson-1; registration refuses them, and refuses anything Cartesia names surface_*.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'

const file = path.join(os.tmpdir(), `surface-clones-${process.pid}.json`)
let guard, cartesia
beforeAll(async () => {
  fs.writeFileSync(file, JSON.stringify({ ids: ['abc-123-surface'] }))
  process.env.MY_VOICE_CLONE_LIST = file
  guard = (await import('./surface-clones.cjs')).default
  cartesia = (await import('./cartesia.cjs')).default
})
afterAll(() => { try { fs.unlinkSync(file) } catch {} })

describe('surface My-Voice clones', () => {
  it('knows a listed id under either spelling', () => {
    expect(guard.isSurfaceClone('abc-123-surface')).toBe(true)
    expect(guard.isSurfaceClone('cartesia_abc-123-surface')).toBe(true)
    expect(guard.isSurfaceClone('cartesia_stock-voice')).toBe(false)
  })
  it('knows one by the surface_ name even if the list missed it', () => {
    expect(guard.isSurfaceClone('unlisted', 'surface_kai_20260928')).toBe(true)
  })
  it('registerVoice refuses a surface clone with a clear 409 and writes nothing', async () => {
    const db = { from: () => { throw new Error('must not touch the db') } }
    await expect(cartesia.registerVoice(db, { voiceId: 'cartesia_abc-123-surface', name: 'x', language: 'en' }))
      .rejects.toMatchObject({ status: 409, code: 'SURFACE_PERSONAL_CLONE' })
    await expect(cartesia.registerVoice(db, { voiceId: 'abc-123-surface', name: 'x', language: 'en' }))
      .rejects.toThrow(/personal voice.*never.*course voice/i)
  })
  it('a missing list file refuses nothing on the list and still refuses by name', () => {
    process.env.MY_VOICE_CLONE_LIST = path.join(os.tmpdir(), 'no-such-list.json')
    expect(guard.isSurfaceClone('abc-123-surface')).toBe(false)
    expect(guard.isSurfaceClone('x', 'surface_dom_20260928')).toBe(true)
    process.env.MY_VOICE_CLONE_LIST = file
  })
})
