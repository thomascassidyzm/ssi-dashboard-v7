/**
 * LIBRARY FIRST, ENFORCED (job #677).
 *
 * Tom, 2026-09-28 23:41Z: "I spent an evening building a proper clips library
 * and … the code is not using it, or something is not referencing it … it's a
 * licence to spank money on stuff."
 *
 * The clip library is public.clip_index + course_audio, asked by
 * services/shared/clip-library.cjs. These tests pin three things:
 *   1. every caller path asks the library, and a clip that is there costs 0;
 *   2. a planted DUPLICATE — a lookup that saw the clip in this voice but let it
 *      slip — is refused by the spend guard (IN_LIBRARY), not paid for;
 *   3. a planted BYPASS — a provider call with no lookup behind it, a hand-made
 *      ticket, a ticket for other words or another voice — is refused (NO_DOOR).
 * Plus the worked case from the night: #626·I re-rolled "ha detto qualcos'altro?"
 * six times; the committed repeat limit now stops the fourth.
 *
 * No network, no DB: the provider is a counting stub, the library is in memory,
 * the ledger is a temp file.
 * Run: npx vitest run services/library-first-door.test.cjs
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
const fs = require('fs')
const os = require('os')
const path = require('path')
const clipLib = require('./shared/clip-library.cjs')
const castGate = require('./shared/voice-cast-gate.cjs')
const guardMod = require('./shared/tts-spend-guard.cjs')
const { issueTicket, TICKET_TTL_MS } = require('./shared/door-ticket.cjs')

const KRITI = '33333333-3333-4333-8333-333333333333'
const KRITI_ID = `cartesia_${KRITI}`
let dir, restore = null

/** A course_audio row as the library holds it. */
const clip = (o) => ({ id: o.id, course_code: o.course || 'ita_for_eng', text: o.text, text_normalized: o.text, language: o.language || 'ita', voice_id: o.voice, s3_key: `mastered/${o.id}.mp3`, origin: 'tts', veracity_pass: true, ...o.extra })

/** tts-service with node-fetch replaced by a stub that COUNTS what would be paid. */
function door(rows = []) {
  clipLib.useClipLibrary(clipLib.memoryClipLibrary(rows))
  castGate.useCastRows(null)  // the cast gate is not what this file tests
  const nodeFetch = require('node-fetch')
  const mod = require.cache[require.resolve('node-fetch')]
  const original = mod.exports
  const paid = []
  const stub = async (url, opts) => {
    paid.push(JSON.parse(opts.body).transcript)
    const bytes = Buffer.alloc(8192, 1)
    return { ok: true, status: 200, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length) }
  }
  Object.keys(nodeFetch).forEach(k => { stub[k] = nodeFetch[k] })
  mod.exports = stub
  delete require.cache[require.resolve('./tts-service.cjs')]
  const svc = require('./tts-service.cjs')
  restore = () => { mod.exports = original; delete require.cache[require.resolve('./tts-service.cjs')] }
  return { svc, paid }
}

const ledger = () => {
  const p = path.join(dir, 'ledger.jsonl')
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8').trim().split('\n').map(JSON.parse).filter(e => e.kind === 'call') : []
}

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'library-first-'))
  const budgetPath = path.join(dir, 'budgets.json')
  fs.writeFileSync(budgetPath, JSON.stringify({}))   // the committed baseline, nothing lowered or raised
  guardMod.useSpendGuard(guardMod.createSpendGuard({
    ledgerPath: path.join(dir, 'ledger.jsonl'), budgetPath, notify() {}, logger: { warn() {}, error() {} },
  }))
})
afterEach(() => { if (restore) restore(); restore = null; castGate.useCastRows(null); clipLib.useClipLibrary(null); guardMod.useSpendGuard(null) })

const cartesia = (door = {}) => ({ apiKey: 'k', voiceId: KRITI, locale: 'hi-IN', phonologyGate: false, door: { courseCode: 'eng_for_hin', ...door } })
const elsa = (door = {}) => ({ subscriptionKey: 'k', region: 'westeurope', voiceName: 'it-IT-ElsaNeural', speed: 1, door: { courseCode: 'ita_for_eng', language: 'ita', ...door } })

describe('1. every caller path asks the library first — a clip that is there costs nothing', () => {
  const HIN = [clip({ id: 'h1', course: 'hin_for_eng', text: 'मैं ठीक हूँ', language: 'hin', voice: KRITI_ID })]

  it('speak, generate and generateWithRetry (every name of the door) answer from the library with 0 provider calls', async () => {
    const { svc, paid } = door(HIN)
    for (const fn of ['speak', 'generate', 'generateWithRetry']) {
      const out = await svc[fn]('मैं ठीक हूँ', 'cartesia', cartesia())
      expect(out.existingClip && out.existingClip.id, fn).toBe('h1')
      expect(out.charsSpent, fn).toBe(0)
    }
    expect(paid).toEqual([])
    expect(ledger()).toEqual([])
  })

  it('a clip in ANOTHER course of the same language answers (per-language, not per-course)', async () => {
    const { svc, paid } = door(HIN)
    const out = await svc.speak('मैं ठीक हूँ', 'cartesia', cartesia({ courseCode: 'hin_for_tam' }))
    expect(out.existingClip.id).toBe('h1')
    expect(paid).toEqual([])
  })

  it('the Italian worked case: an Azure Elsa line (phase8 / Kai\'s ita scripts, voiceBound) is answered by the Elsa clip — stored under the bare voice name', async () => {
    // 5,377 ita rows carry voice_id 'it-IT-ElsaNeural' (no provider prefix); the door canonicalises both sides.
    const { svc, paid } = door([clip({ id: 'e1', text: "ha detto qualcos'altro?", voice: 'it-IT-ElsaNeural' })])
    const out = await svc.speak("ha detto qualcos'altro?", 'azure', elsa({ voiceBound: true }))
    expect(out.existingClip.id).toBe('e1')
    expect(paid).toEqual([])
    expect(ledger()).toEqual([])
  })

  it('an intro slot is answered by its own course\'s clip (intros are never borrowed, Tom 2026-08-07)', async () => {
    const intro = "The Italian for: 'I think', is:"
    const { svc } = door([clip({ id: 'i1', text: intro, language: 'eng', voice: 'azure_en-GB-SoniaNeural' })])
    const out = await svc.speak(intro, 'azure', { ...elsa({ intro: true, language: 'eng' }), voiceName: 'en-GB-SoniaNeural' })
    expect(out.existingClip.id).toBe('i1')
  })

  it('a true miss is paid for exactly once; once the caller has filed the clip, the next ask is a hit', async () => {
    const rows = []
    const { svc, paid } = door(rows)
    const first = await svc.speak('नया वाक्य', 'cartesia', cartesia())
    expect(first.existingClip).toBe(null)
    expect(paid).toEqual(['नया वाक्य'])
    rows.push(clip({ id: 'new1', course: 'eng_for_hin', text: 'नया वाक्य', language: 'hin', voice: KRITI_ID }))   // what phase8 / writeOrSwapClip does
    const second = await svc.speak('नया वाक्य', 'cartesia', cartesia())
    expect(second.existingClip.id).toBe('new1')
    expect(paid).toHaveLength(1)
  })

  it('the bake-off\'s own HTTP door asks the library too, and refuses a take that is already there', async () => {
    clipLib.useClipLibrary(clipLib.memoryClipLibrary([clip({ id: 'x1', text: 'ciao a tutti', voice: 'xai_eve' })]))
    const { httpSynthesise } = require('../tools/tts-bakeoff/lib/adapter-utils.cjs')
    const sent = []
    const realFetch = globalThis.fetch
    globalThis.fetch = async (...a) => { sent.push(a); throw new Error('must not be reached') }
    const env = process.env.PHASE2_SPEND_APPROVED
    process.env.PHASE2_SPEND_APPROVED = '1'
    try {
      const adapter = { id: 'xai', displayName: 'xAI', requiredEnv: [] }
      const req = { endpoint: 'https://example.invalid/v1/tts', method: 'POST', headers: {}, body: { text: 'ciao a tutti', voice_id: 'eve' } }
      await expect(httpSynthesise(adapter, req, { live: true, language: 'ita' })).rejects.toThrow(/already in the clip library/)
      await expect(httpSynthesise(adapter, req, { live: true })).rejects.toThrow(/cannot name this clip/)
      expect(sent).toEqual([])
    } finally {
      globalThis.fetch = realFetch
      if (env === undefined) delete process.env.PHASE2_SPEND_APPROVED; else process.env.PHASE2_SPEND_APPROVED = env
    }
  })
})

describe('2. a planted duplicate is refused by the guard, not paid for', () => {
  it('a library that SEES the clip in this voice but loses the hit: the guard refuses IN_LIBRARY and the provider is never called', async () => {
    const row = clip({ id: 'dup1', course: 'hin_for_eng', text: 'मैं ठीक हूँ', language: 'hin', voice: KRITI_ID })
    const { svc, paid } = door()
    // A broken pick: the rows reach pick() (the lookup saw them), but the answer is dropped.
    clipLib.useClipLibrary({ name: 'broken', async resolve(want, pick) { pick([row]); return null }, async bytes() { return Buffer.from('x') } })
    await expect(svc.speak('मैं ठीक हूँ', 'cartesia', cartesia())).rejects.toThrow(/\(402\) IN_LIBRARY/)
    expect(paid).toEqual([])
    expect(ledger()).toEqual([])
  })

  it('the ticket names what the lookup saw in this voice; a clip in another voice or another language is not a duplicate', async () => {
    const lib = clipLib.memoryClipLibrary([
      clip({ id: 'o1', text: 'buongiorno', voice: 'azure_it-IT-BenignoNeural' }),
      clip({ id: 'o2', text: 'buongiorno', language: 'eng', voice: 'azure_it-IT-ElsaNeural' }),
    ])
    const { clip: hit, ticket } = await clipLib.lookupForRender({ text: 'buongiorno', language: 'ita', voiceId: 'azure_it-IT-ElsaNeural', voiceBound: true }, lib)
    expect(hit).toBe(null)
    expect(ticket.inLibrary).toEqual([])
  })

  it('a regenerate that NAMES the take it replaces may render; the same call without naming it is refused', async () => {
    const row = clip({ id: 'r1', course: 'hin_for_eng', text: 'मैं ठीक हूँ', language: 'hin', voice: KRITI_ID })
    const g = guardMod.spendGuard()
    const lookup = (replacing) => clipLib.lookupForRender({ text: 'मैं ठीक हूँ', language: 'hin', voiceId: KRITI_ID, voiceBound: true, replacing }, { name: 'broken', async resolve(want, pick) { pick([row]); return null } })
    const { ticket: plain } = await lookup([])
    await expect(g.beforeProviderCall({ provider: 'cartesia', voiceId: KRITI_ID, text: 'मैं ठीक हूँ', ticket: plain })).rejects.toThrow(/IN_LIBRARY/)
    const { ticket: named } = await lookup([row.s3_key])
    await expect(g.beforeProviderCall({ provider: 'cartesia', voiceId: KRITI_ID, text: 'मैं ठीक हूँ', ticket: named })).resolves.toBeTruthy()
  })
})

describe('3. a planted bypass is refused — no lookup, no payment', () => {
  const real = async (text = 'एक वाक्य', voiceId = KRITI_ID) => (await clipLib.lookupForRender({ text, language: 'hin', voiceId, voiceBound: true }, clipLib.memoryClipLibrary([]))).ticket
  const call = (extra) => guardMod.spendGuard().beforeProviderCall({ provider: 'cartesia', voiceId: KRITI_ID, text: 'एक वाक्य', ...extra })

  it('no ticket at all', async () => {
    await expect(call({})).rejects.toThrow(/\(402\) NO_DOOR: no proof of a clip-library lookup/)
    expect(ledger()).toEqual([])
  })

  it('a hand-made ticket with every right field', async () => {
    const forged = { ...(await real()) }
    await expect(call({ ticket: forged })).rejects.toThrow(/NO_DOOR: the ticket on this call was not issued/)
  })

  it('a real ticket for other words, or for another voice', async () => {
    await expect(call({ ticket: await real('दूसरा वाक्य') })).rejects.toThrow(/NO_DOOR: the lookup was for other words/)
    await expect(call({ ticket: await real('एक वाक्य', 'cartesia_someone-else') })).rejects.toThrow(/NO_DOOR: the lookup was for voice/)
  })

  it('a stale ticket (the library may have changed since)', async () => {
    const old = issueTicket({ language: 'hin', voiceId: KRITI_ID, text: 'एक वाक्य', now: Date.now() - TICKET_TTL_MS - 1000 })
    await expect(call({ ticket: old })).rejects.toThrow(/NO_DOOR: the clip-library lookup behind this call is \d+ minutes old/)
  })

  it('a real, fresh, matching ticket is accepted', async () => {
    await expect(call({ ticket: await real() })).resolves.toBeTruthy()
    expect(ledger()).toHaveLength(1)
  })

  it('the provider services that never ask the library (Google, ElevenLabs) are refused at the guard', async () => {
    const google = require('./google-tts-service.cjs')
    await expect(google.generateSpeech('hola', 'es-ES-Standard-A', 'spa', {})).rejects.toThrow(/\(402\) NO_DOOR/)
  })

  it('the static gate: only the clip-library lookup may mint a ticket', () => {
    const { findTicketIssuers } = require('../tools/check-tts-door.cjs')
    expect(findTicketIssuers({
      'tools/sneaky.cjs': "const t = require('../services/shared/door-ticket.cjs').issueTicket({ language: 'ita', voiceId: v, text })",
      'services/shared/clip-library.cjs': 'const ticket = issueTicket({ language: want.language })',
    }).map(h => h.file)).toEqual(['tools/sneaky.cjs'])
  })
})

describe('the night\'s specimen: #626·I re-rolled one line six times', () => {
  it('the committed repeat limit is 3 — one slot\'s veracity re-rolls, then a human listens', () => {
    expect(guardMod.DEFAULT_REPEAT.maxPerKey).toBe(3)
  })

  it('a rejected take never reaches the library, so a second slot with the same words asks again — and the 4th paid take is refused', async () => {
    const { svc, paid } = door([])   // every take quarantined: nothing is ever filed
    const line = "ha detto qualcos'altro?"
    const cfg = { apiKey: 'k', voiceId: KRITI, locale: 'it-IT', phonologyGate: false, door: { courseCode: 'ita_for_eng', job: '#626·I replay' } }
    let refused = 0
    for (let slot = 0; slot < 2; slot++) {          // S0360L01 then S0360L01B01
      for (let attempt = 0; attempt < 3; attempt++) { // renderChecked: 3 attempts per slot
        try { await svc.speak(line, 'cartesia', cfg, 1) } catch (e) { expect(e.message).toMatch(/REPEAT/); refused++ }
      }
    }
    expect(paid).toHaveLength(3)   // was 6 on the night
    expect(refused).toBe(3)
  })
})
