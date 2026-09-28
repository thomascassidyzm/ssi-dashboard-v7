/**
 * SURFACE MY-VOICE CLONES ARE NEVER COURSE VOICES (#587, Tom 2026-09-28).
 *
 * The command surface lets anyone clone their OWN voice for their own videos. Those clones live on
 * the same Cartesia account Popty registers course voices from, so without this guard any of them
 * could be cast into an SSi course. The surface publishes every clone id it has ever made to a
 * file on watson-1; registration refuses them, and refuses anything Cartesia names surface_*.
 *
 * #595: UNLESS the owner has permitted it. The same file carries `coursePermitted` — ids whose owner,
 * by their own tap on the surface, said "may be used as a voice in Popty courses". Those pass; the
 * rest are refused at registration, casting AND render, so a withdrawal stops new audio.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'

const file = path.join(os.tmpdir(), `surface-clones-${process.pid}.json`)
let guard, cartesia, tts
beforeAll(async () => {
  fs.writeFileSync(file, JSON.stringify({ ids: ['abc-123-surface', 'ok-456-permitted'], coursePermitted: ['ok-456-permitted'] }))
  process.env.MY_VOICE_CLONE_LIST = file
  guard = (await import('./surface-clones.cjs')).default
  cartesia = (await import('./cartesia.cjs')).default
  tts = (await import('../tts-service.cjs')).default
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
  it('#595: a clone its owner permitted as a course voice is accepted, even named surface_*', () => {
    expect(guard.isSurfaceClone('ok-456-permitted')).toBe(false)
    expect(guard.isSurfaceClone('cartesia_ok-456-permitted', 'surface_dom_20260928_1932')).toBe(false)
    expect(() => guard.assertNotSurfaceClone('ok-456-permitted', 'surface_dom_20260928_1932')).not.toThrow()
    expect(guard.isSurfaceClone('abc-123-surface')).toBe(true)
    expect(guard.isSurfaceClone('never-listed', 'surface_dom_20260928_1932')).toBe(true)
  })
  it('#595: registerVoice lets a permitted clone past the surface guard', async () => {
    // an empty language is the next refusal after the guard — reaching it proves the guard let it through
    await expect(cartesia.registerVoice({}, { voiceId: 'cartesia_ok-456-permitted', name: 'surface_dom_x', language: '' }))
      .rejects.toThrow(/language/i)
  })
  it('#595: the render chokepoint refuses an unpermitted surface clone, so a withdrawal stops new audio', async () => {
    await expect(tts.assertConsentedVoice({ voiceId: 'cartesia_abc-123-surface' }, 'cartesia'))
      .rejects.toMatchObject({ code: 'SURFACE_PERSONAL_CLONE' })
    fs.writeFileSync(file, JSON.stringify({ ids: ['abc-123-surface', 'ok-456-permitted'], coursePermitted: [] }))
    await expect(tts.assertConsentedVoice({ voiceId: 'ok-456-permitted' }, 'cartesia'))
      .rejects.toMatchObject({ code: 'SURFACE_PERSONAL_CLONE' })
    fs.writeFileSync(file, JSON.stringify({ ids: ['abc-123-surface', 'ok-456-permitted'], coursePermitted: ['ok-456-permitted'] }))
  })
  it('a missing list file refuses nothing on the list and still refuses by name', () => {
    process.env.MY_VOICE_CLONE_LIST = path.join(os.tmpdir(), 'no-such-list.json')
    expect(guard.isSurfaceClone('abc-123-surface')).toBe(false)
    expect(guard.isSurfaceClone('x', 'surface_dom_20260928')).toBe(true)
    process.env.MY_VOICE_CLONE_LIST = file
  })
})
