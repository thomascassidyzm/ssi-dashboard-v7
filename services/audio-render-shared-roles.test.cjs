/**
 * Job #464: welcome / encouragement / instruction take the ONE audio route (r-2026-09-29) like a target clip —
 * library first, spend guard (the door), one render, write back — spoken in the course's presentation voice.
 * A welcome's words default to the course's welcome script; a course that has a welcome is answered with it.
 * Guide lines are filed in shared_audio per (words, known language). No network, no DB.
 * Run: npx vitest run services/audio-render-shared-roles.test.cjs
 */
import { describe, it, expect } from 'vitest'
const { renderClip, roleNativeLanguage, voiceSlotFor } = require('./shared/audio-render-entry.cjs')
const { welcomeScriptFor, fillWelcome, targetSuffix } = require('./shared/welcome-script.cjs')

const req = (o = {}) => ({ courseCode: 'ind_for_eng', role: 'welcome', purpose: 'p', requestedBy: 't', ...o })

function deps(over = {}) {
  const calls = { resolve: [], speak: [], store: [], storeShared: [], link: 0, linkShared: 0 }
  return {
    calls,
    deps: {
      resolve: async (r) => { calls.resolve.push(r); return { language: 'eng', voiceId: 'cartesia_charlotte', provider: 'cartesia', providerConfig: {} } },
      link: async () => { calls.link++; return null },
      linkShared: async () => { calls.linkShared++; return null },
      speak: async (text, provider, cfg) => { calls.speak.push({ text, provider, cfg }); return cfg.door.dryRun ? { existingClip: null, wouldSpendChars: text.length } : { audioBuffer: Buffer.alloc(1), charsSpent: text.length } },
      store: async (x) => { calls.store.push(x); return { audioId: 'W1', s3Key: 'mastered/W1.mp3', durationMs: 1 } },
      storeShared: async (x) => { calls.storeShared.push(x); return { audioId: 'S1', s3Key: 'mastered/S1.mp3', durationMs: 1 } },
      welcomeScript: async () => 'Welcome to this unusual game that will help you to become an Indonesian speaker.',
      courseWelcome: async () => null,
      ...over,
    },
  }
}

describe('the welcome script (tracked templates)', () => {
  it('fills the English template for a target, with the dialect slot first and the base as fallback', () => {
    const s = welcomeScriptFor({ course_code: 'ind_for_eng', known_lang: 'eng', target_lang: 'ind' })
    expect(s).toMatch(/^Welcome to this unusual game that will help you to become an Indonesian speaker\./)
    expect(s).toContain('something in English')
    expect(s).not.toMatch(/\{/)
    expect(targetSuffix('ara_lb_for_eng', 'eng', 'ara')).toBe('lb')
    const data = { template: '{a_target_speaker}', targets: { ara: { a_target_speaker: 'base' }, ara_lb: { a_target_speaker: 'lebanese' } } }
    expect(fillWelcome(data, 'ara', 'lb')).toBe('lebanese')
    expect(fillWelcome(data, 'ara', 'eg')).toBe('base')
  })
  it('zho courses use the cmn keys; no template or no slot is null, never invented', () => {
    expect(welcomeScriptFor({ course_code: 'zho_for_eng', known_lang: 'eng', target_lang: 'zho' })).toMatch(/a Chinese speaker/)
    expect(welcomeScriptFor({ course_code: 'zho_for_gle', known_lang: 'gle', target_lang: 'zho' })).toBeNull()
    expect(welcomeScriptFor({ course_code: 'sbx_for_eng', known_lang: 'eng', target_lang: 'sbx' })).toBeNull()
  })
  it('every template fits one clip (the route refuses text over 1,000 characters)', () => {
    const fs = require('fs'), path = require('path')
    const dir = path.join(__dirname, 'shared', 'welcome-templates')
    for (const f of fs.readdirSync(dir)) {
      const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
      for (const t of Object.keys(d.targets)) expect(fillWelcome(d, t).length, `${f} ${t}`).toBeLessThanOrEqual(1000)
    }
  })
})

describe('shared roles speak in the presentation voice, on the known side', () => {
  it('welcome/encouragement/instruction are known-language and borrow the presentation slot', () => {
    for (const r of ['welcome', 'encouragement', 'instruction']) {
      expect(roleNativeLanguage(r, { known_lang: 'eng', target_lang: 'ind' })).toBe('eng')
      expect(voiceSlotFor(r)).toBe('presentation')
    }
    expect(voiceSlotFor('target1')).toBe('target1')
  })
})

describe('welcome through the one route', () => {
  it('no text: the course welcome script is said, through the door, and stored as the course welcome row', async () => {
    const { deps: d, calls } = deps()
    const out = await renderClip(req(), d)
    expect(calls.resolve[0].role).toBe('presentation')
    expect(calls.speak).toHaveLength(1)
    expect(calls.speak[0].text).toMatch(/Indonesian speaker/)
    expect(calls.speak[0].cfg.door).toMatchObject({ courseCode: 'ind_for_eng', slotRole: 'welcome', dryRun: false })
    expect(calls.store[0]).toMatchObject({ role: 'welcome', courseCode: 'ind_for_eng', language: 'eng', voiceId: 'cartesia_charlotte' })
    expect(out).toMatchObject({ ok: true, source: 'rendered', audioId: 'W1', role: 'welcome' })
  })
  it('a dry run spends nothing and stores nothing', async () => {
    const { deps: d, calls } = deps()
    const out = await renderClip(req({ dryRun: true }), d)
    expect(out).toMatchObject({ ok: true, source: 'would-render', dryRun: true, charsSpent: 0 })
    expect(out.wouldSpendChars).toBeGreaterThan(0)
    expect(calls.store).toHaveLength(0)
  })
  it('a course that already has a welcome is answered with it: no render, no second row', async () => {
    const { deps: d, calls } = deps({ courseWelcome: async () => ({ audioId: 'OLD', s3Key: 'mastered/OLD.mp3', voiceId: 'elevenlabs' }) })
    const out = await renderClip(req(), d)
    expect(out).toMatchObject({ ok: true, source: 'library', existing: true, audioId: 'OLD', charsSpent: 0 })
    expect(calls.speak).toHaveLength(0)
    expect(calls.store).toHaveLength(0)
  })
  it('library first: the same words in this voice elsewhere are linked, never re-rendered', async () => {
    const { deps: d, calls } = deps({ link: async () => ({ audioId: 'SIB', s3Key: 'mastered/SIB.mp3' }) })
    const out = await renderClip(req(), d)
    expect(out).toMatchObject({ source: 'library', audioId: 'SIB', charsSpent: 0 })
    expect(calls.speak).toHaveLength(0)
  })
  it('no script and no text is refused loudly, before any voice or spend', async () => {
    const { deps: d, calls } = deps({ welcomeScript: async () => null })
    await expect(renderClip(req({ courseCode: 'zho_for_gle' }), d)).rejects.toMatchObject({ code: 'NO_WELCOME_SCRIPT', status: 404 })
    expect(calls.resolve).toHaveLength(0)
  })
  it('a welcome takes no legoId or trial; every other role still needs text', async () => {
    const { deps: d } = deps()
    await expect(renderClip(req({ legoId: 'S0001L01' }), d)).rejects.toMatchObject({ code: 'SHARED_ROLE_ALONE' })
    await expect(renderClip(req({ role: 'target1' }), d)).rejects.toThrow(/missing required field\(s\): text/)
    await expect(renderClip(req({ role: 'encouragement' }), d)).rejects.toThrow(/text/)
  })
})

describe('encouragement / instruction are filed in shared_audio', () => {
  const line = (o = {}) => req({ role: 'encouragement', text: 'Well done, keep going.', ...o })
  it('a miss renders once and files a shared_audio row, never a course_audio one', async () => {
    const { deps: d, calls } = deps()
    const out = await renderClip(line(), d)
    expect(calls.linkShared).toBe(1)
    expect(calls.link).toBe(0)
    expect(calls.speak[0].cfg.door.slotRole).toBe('encouragement')
    expect(calls.store).toHaveLength(0)
    expect(calls.storeShared[0]).toMatchObject({ role: 'encouragement', language: 'eng', text: 'Well done, keep going.' })
    expect(out).toMatchObject({ source: 'rendered', audioId: 'S1' })
  })
  it('an existing shared_audio row for the words is the answer', async () => {
    const { deps: d, calls } = deps({ linkShared: async () => ({ audioId: 'HAVE', s3Key: 'mastered/HAVE.mp3' }) })
    const out = await renderClip(line(), d)
    expect(out).toMatchObject({ source: 'library', audioId: 'HAVE', charsSpent: 0 })
    expect(calls.speak).toHaveLength(0)
  })
  it('a clip the door found in the library is filed on its own object, nothing re-uploaded', async () => {
    const { deps: d, calls } = deps({ speak: async () => ({ audioBuffer: Buffer.alloc(1), existingClip: { s3_key: 'mastered/LIB.mp3', duration_ms: 900 }, charsSpent: 0 }) })
    const out = await renderClip(line(), d)
    expect(calls.storeShared[0]).toMatchObject({ s3Key: 'mastered/LIB.mp3', durationMs: 900 })
    expect(calls.storeShared[0].audioBuffer).toBeUndefined()
    expect(out.source).toBe('library')
  })
  it('an instruction carries its sequence; sequence on anything else is refused', async () => {
    const { deps: d, calls } = deps()
    await renderClip(line({ role: 'instruction', sequence: 7 }), d)
    expect(calls.storeShared[0].sequence).toBe(7)
    await expect(renderClip(line({ sequence: 3 }), d)).rejects.toMatchObject({ code: 'BAD_SEQUENCE' })
    await expect(renderClip(line({ replaceAudioId: 'X' }), d)).rejects.toMatchObject({ code: 'SHARED_ROLE_ALONE' })
  })
})
