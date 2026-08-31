/**
 * ONBOARDING CAPTURES CONSENT, OR IT MINTS NOTHING (Tom's ruling, 2026-08-31).
 *
 * The hard-block sweep of the same day left one door open and said so out loud:
 * `POST /assign-slot` minted a `human_*` voice id for a real person before any
 * consent existed, and gating it as it stood would have blocked onboarding
 * outright. Tom's answer was not an exemption — it was to move the consent
 * earlier. These tests are that promise, at the endpoint, as a user meets it:
 *
 *   1. Assigning a slot to somebody nobody has asked is REFUSED, and nothing is
 *      written — no voice id minted, no voice_config touched.
 *   2. The refusal is branchable (`needsOnboardingConsent`) so the screen opens
 *      the consent step rather than string-matching a sentence Tom may redline.
 *   3. Consent recorded by the spoken line mints the voice WITH the yes on it,
 *      in one `voices` write, status `authorised`, kind `spoken`.
 *   4. The same assignment then goes through, casting that id.
 *   5. A recordist may consent for themselves and for nobody else.
 *   6. An unread line is refused and QUOTES what was heard instead.
 *
 * The supabase client is a stub: what is under test is the gate, the mint and
 * the response, not PostgREST. Whisper is mocked for the same reason — its real
 * behaviour is pinned against real recordings in voicelab/declaration.test.js.
 */
import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import express from 'express'
import { createRequire } from 'node:module'

// require(), NOT `import x from './x.cjs'`. Vitest's ESM interop hands an ESM
// importer a WRAPPER around a CommonJS module's exports, so a vi.spyOn against
// the imported object patches the wrapper while the code under test keeps
// calling the original — the mock silently does nothing. Same reason
// voicelab/declaration.test.js does this.
const require = createRequire(import.meta.url)
const createTeamRouter = require('./team-router.cjs')
const audioVeracity = require('../audio-veracity.cjs')
const declaration = require('../voicelab/declaration.cjs')
const consentGate = require('../shared/voice-consent-gate.cjs')

/** Mutable estate the stub answers from. Reset before every test. */
let USERS
let COURSES
let VOICES
let writes

function stubDb () {
  return {
    from (name) {
      const state = { table: name, filters: {}, payload: null, op: 'select' }
      const rows = () => {
        if (name === 'dashboard_users') return USERS
        if (name === 'courses') return COURSES
        if (name === 'voices') return VOICES
        return []
      }
      const filtered = () => rows().filter((r) => {
        for (const [k, v] of Object.entries(state.filters)) {
          if (k === '__in') { if (!v.ids.includes(r[v.col])) return false; continue }
          if (k === '__neq') { if (r[v.col] === v.val) return false; continue }
          if (r[k] !== v) return false
        }
        return true
      })
      const chain = {
        select: () => chain,
        eq: (col, val) => { state.filters[col] = val; return chain },
        neq: (col, val) => { state.filters.__neq = { col, val }; return chain },
        in: (col, ids) => { state.filters.__in = { col, ids }; return chain },
        update: (payload) => { state.op = 'update'; state.payload = payload; return chain },
        upsert: (payload) => { state.op = 'upsert'; state.payload = payload; return chain },
        limit: () => chain,
        async single () { return finish(true) },
        async maybeSingle () { return finish(true) },
        then (resolve) { resolve(finish(false)) },
      }
      function finish (single) {
        if (state.op === 'update') {
          const hit = filtered()
          for (const r of hit) Object.assign(r, state.payload)
          writes.push({ table: name, op: 'update', payload: state.payload })
          return { data: hit, error: null }
        }
        if (state.op === 'upsert') {
          const row = state.payload
          const idx = rows().findIndex((r) => r.voice_id === row.voice_id)
          if (idx >= 0) rows()[idx] = { ...rows()[idx], ...row }
          else rows().push({ ...row })
          writes.push({ table: name, op: 'upsert', payload: row })
          return { data: rows().find((r) => r.voice_id === row.voice_id), error: null }
        }
        const hit = filtered()
        return single
          ? { data: hit[0] || null, error: hit[0] ? null : { code: 'PGRST116' } }
          : { data: hit, error: null }
      }
      return chain
    },
  }
}

let currentUser
let server
let base

function boot () {
  const app = express()
  app.use(express.json())
  app.use('/api/production/:courseCode/team', createTeamRouter({
    requireDashboardUser: async () => currentUser,
    userCanAccessCourse: () => true,
    getDb: () => stubDb(),
    logger: { info () {}, warn () {}, error () {} },
  }))
  return new Promise((resolve) => {
    server = app.listen(0, () => {
      base = `http://127.0.0.1:${server.address().port}/api/production/cym_n_for_eng/team`
      resolve()
    })
  })
}

beforeEach(async () => {
  USERS = [
    { email: 'aran@ssi', name: 'Aran', role: 'recorder', courses: ['cym_n_for_eng'], voice_id: null },
    { email: 'catrin@ssi', name: 'Catrin', role: 'recorder', courses: ['cym_n_for_eng'], voice_id: null },
    { email: 'lead@ssi', name: 'Lead', role: 'editor', courses: ['cym_n_for_eng'], voice_id: null },
  ]
  COURSES = [{ course_code: 'cym_n_for_eng', voice_config: { voices: { target1: { provider: 'azure', voiceId: 'azure_x' } } } }]
  VOICES = []
  writes = []
  currentUser = { email: 'lead@ssi', role: 'editor' }
  consentGate.clearCache()
  vi.restoreAllMocks()
  if (!server) await boot()
})

afterAll(() => { if (server) server.close() })

const post = (path, body) => fetch(`${base}${path}`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
})

function heardIs (text) {
  vi.spyOn(audioVeracity, 'availability').mockReturnValue({ available: true, missing: [], bin: '', model: '' })
  vi.spyOn(audioVeracity, 'decodeAudio').mockResolvedValue(text)
}

async function postSpokenConsent (email) {
  const form = new FormData()
  form.append('email', email)
  form.append('sampleFrom', 'record')
  form.append('clip', new Blob([Buffer.alloc(2048, 1)], { type: 'audio/webm' }), 'consent.webm')
  return fetch(`${base}/consent`, { method: 'POST', body: form })
}

describe('assign-slot refuses to mint a voice for somebody nobody has asked', () => {
  it('409s, names the missing step, and writes nothing', async () => {
    const res = await post('/assign-slot', { email: 'aran@ssi', slot: 'target1' })
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.code).toBe('NO_RECORDED_CONSENT')
    // Branchable, so the screen opens the consent step rather than reading prose.
    expect(body.needsOnboardingConsent).toBe(true)
    // Blames the missing consent, never the person.
    expect(body.error).toMatch(/has not agreed to their voice being used/i)
    // NOTHING happened: no voice id on the person, no cast on the course.
    expect(USERS.find((u) => u.email === 'aran@ssi').voice_id).toBeNull()
    expect(COURSES[0].voice_config.voices.target1.voiceId).toBe('azure_x')
    expect(writes).toEqual([])
  })

  it('still refuses when they hold a minted id with no voices row behind it', async () => {
    // The `human_sasha_wanasky_deu_at` shape: a real person, an id, no record
    // anywhere. Knowing nothing about somebody is never a reason to allow.
    USERS.find((u) => u.email === 'aran@ssi').voice_id = 'human_aran_cym_n'
    const res = await post('/assign-slot', { email: 'aran@ssi', slot: 'target1' })
    expect(res.status).toBe(409)
    expect((await res.json()).code).toBe('NO_RECORDED_CONSENT')
    expect(COURSES[0].voice_config.voices.target1.voiceId).toBe('azure_x')
  })
})

// FLIPPED DELIBERATELY, 2026-08-31. These two tests asserted that the
// declaration at sign-up was the WHOLE of the consent and cast on its own.
// Tom's refinement of the same day makes it the first of two — "automatic
// consent is better and then a click to confirm or something, once voice clone
// has been generated" — so the voice is now born `awaiting_authorisation`, the
// standing block refuses it, and the assignment goes through only after the
// person has heard their clone and confirmed it. The old assertions are kept in
// substance, inverted, so the day anybody restores one-stamp consent this file
// says so out loud.
describe('the consent step mints the voice with the yes already on it', () => {
  it('spoken line heard → one voices write, declared but NOT castable until the clone is confirmed', async () => {
    heardIs(declaration.SPOKEN_PHRASE)

    const res = await postSpokenConsent('aran@ssi')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.voice_id).toBe('human_aran_cym_n')
    expect(body.consent.status).toBe('awaiting_authorisation')
    expect(body.consent.kind).toBe('spoken')
    expect(body.consent.declared_by).toBe('Aran')
    // The screen is told what is still outstanding, and both answers exist.
    expect(body.confirmation.stage).toBe('awaiting_hearing')
    expect(body.confirmation.answers.map((a) => a.decision)).toEqual(['confirm', 'reject'])

    // ONE write for the voice, and the consent is IN it — never a follow-up.
    const voiceWrites = writes.filter((w) => w.table === 'voices')
    expect(voiceWrites).toHaveLength(1)
    expect(voiceWrites[0].payload.consent_status).toBe('awaiting_authorisation')
    expect(voiceWrites[0].payload.consent_declaration).toBe(declaration.SPOKEN_PHRASE)
    expect(voiceWrites[0].payload.consent_authorised_at).toBeNull()
    expect(voiceWrites[0].payload.type).toBe('human')
    expect(voiceWrites[0].payload.human_email).toBe('aran@ssi')

    // AND THE ASSIGNMENT IS REFUSED, by the ordinary block, with no new state
    // for it to have learned: the refusal names the step that is left.
    const refused = await post('/assign-slot', { email: 'aran@ssi', slot: 'target1' })
    expect(refused.status).toBe(409)
    const refusedBody = await refused.json()
    expect(refusedBody.needsCloneConfirmation).toBe(true)
    expect(refusedBody.needsOnboardingConsent).toBe(false)
    expect(refusedBody.error).toMatch(/has not heard this clone yet/i)
    expect(COURSES[0].voice_config.voices.target1.voiceId).toBe('azure_x')

    // …and goes through the moment the confirmation is on the row.
    VOICES[0].consent_status = 'authorised'
    VOICES[0].consent_authorised_by = 'Aran'
    VOICES[0].consent_authorised_how = 'heard their own clone and confirmed it'
    VOICES[0].consent_authorised_at = new Date().toISOString()
    const assign = await post('/assign-slot', { email: 'aran@ssi', slot: 'target1' })
    expect(assign.status).toBe(200)
    expect((await assign.json()).voice_id).toBe('human_aran_cym_n')
    expect(COURSES[0].voice_config.voices.target1).toMatchObject({ provider: 'human', voiceId: 'human_aran_cym_n' })
  })

  it('the written statement is accepted, and recorded as the weaker claim it is', async () => {
    const res = await post('/consent', { email: 'catrin@ssi', declarationAgreed: true, attestedBy: 'Catrin Lliar' })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.consent.kind).toBe('attested')
    expect(body.consent.declared_by).toBe('Catrin Lliar')
    expect(body.consent.heard).toBeNull()
    expect(VOICES[0].consent_status).toBe('awaiting_authorisation')
    expect(VOICES[0].consent_declaration_kind).toBe('attested')
  })

  it('a line that was not read is refused, and quotes what was heard instead', async () => {
    heardIs('the quick brown fox jumped over the lazy dog')
    const res = await postSpokenConsent('aran@ssi')
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.declarationNotHeard).toBe(true)
    expect(body.error).toMatch(/quick brown fox/)
    expect(VOICES).toEqual([])
  })

  it('a tick with nobody behind it is not a permission', async () => {
    const res = await post('/consent', { email: 'catrin@ssi', declarationAgreed: true })
    expect(res.status).toBe(400)
    expect(VOICES).toEqual([])
  })
})

describe('who may record a consent', () => {
  it('a recordist may consent for themselves', async () => {
    currentUser = { email: 'aran@ssi', role: 'recorder' }
    const res = await post('/consent', { email: 'aran@ssi', declarationAgreed: true, attestedBy: 'Aran' })
    expect(res.status).toBe(200)
  })

  it('and for nobody else', async () => {
    currentUser = { email: 'aran@ssi', role: 'recorder' }
    const res = await post('/consent', { email: 'catrin@ssi', declarationAgreed: true, attestedBy: 'Aran' })
    expect(res.status).toBe(403)
    expect(VOICES).toEqual([])
  })

  it('and a recordist still cannot assign slots', async () => {
    currentUser = { email: 'aran@ssi', role: 'recorder' }
    const res = await post('/assign-slot', { email: 'aran@ssi', slot: 'target1' })
    expect(res.status).toBe(403)
  })
})
