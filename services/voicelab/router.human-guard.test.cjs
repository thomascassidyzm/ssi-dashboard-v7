/**
 * THE VISIBLE REFUSAL, AT THE ENDPOINT (Tom's ruling, 2026-08-31).
 *
 * "A visible refusal beats a quiet one." These two tests are the whole promise
 * of the casting guard as a USER sees it:
 *
 *   Welsh — every course a cym cast could reach is human-recorded, so the PUT
 *           is refused with 409 and nothing is written anywhere.
 *   German — one course is, nine are not, so the cast is saved for the nine and
 *           the response NAMES the one it skipped, with the reason.
 *
 * The supabase client is a stub, because what is under test is the guard and
 * the response, not PostgREST.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import express from 'express'
import routerPkg from './router.cjs'
const { mount } = routerPkg

/**
 * The `voices` rows the consent gate reads. `cartesia_probe` is a vendor stock
 * voice — nobody behind it to ask — so it casts; `cartesia_clone` is a clone of
 * a real person nobody has authorised, so it must not.
 */
const VOICES = [
  { voice_id: 'cartesia_probe', type: 'tts', metadata_source: null, consent_status: 'not_recorded', display_name: 'Stock voice' },
  { voice_id: 'cartesia_clone', type: 'tts', metadata_source: 'cartesia-clone (Voice Lab)', consent_status: 'awaiting_authorisation', consent_person: 'Aran', display_name: 'Aran clone' },
]

const COURSES = [
  { course_code: 'cym_n_for_eng', target_lang: 'cym', known_lang: 'eng', voice_config: {} },
  { course_code: 'cym_s_for_eng', target_lang: 'cym', known_lang: 'eng', voice_config: {} },
  { course_code: 'eng_for_cym', target_lang: 'eng', known_lang: 'cym', voice_config: {} },
  { course_code: 'deu_for_eng', target_lang: 'deu', known_lang: 'eng', voice_config: {} },
  {
    course_code: 'deu_at_for_eng', target_lang: 'deu', known_lang: 'eng',
    voice_config: { voices: { target2: { voiceId: 'human_sasha_wanasky_deu_at', provider: 'human' } } },
  },
]

const upserts = []

/** The narrowest stub that answers every call this route makes. */
function stubSupabase () {
  const table = (name) => {
    const rowsFor = () => (name === 'courses' ? COURSES : [])
    let wanted = null
    const chain = {
      select: () => chain,
      eq: () => chain,
      // The consent gate looks a voice up under every spelling of its id.
      in: (_col, ids) => { wanted = ids; return chain },
      limit: async () => ({ data: VOICES.filter((v) => (wanted || []).includes(v.voice_id)), error: null }),
      maybeSingle: async () => ({ data: { voice_id: 'cartesia_probe', gender: 'f' } }),
      upsert: async (row) => { upserts.push({ table: name, row }); return { error: null } },
      then: (resolve) => resolve({ data: rowsFor(), error: null }),
    }
    return chain
  }
  return { from: table }
}

let server
let base

beforeAll(async () => {
  const app = express()
  app.use(express.json())
  mount(app, {
    requireAdmin: async () => ({ email: 'test@ssi' }),
    requireDashboardUser: async () => ({ email: 'test@ssi' }),
    logger: { log: () => {} },
    supabase: stubSupabase,
  })
  await new Promise((r) => { server = app.listen(0, r) })
  base = `http://127.0.0.1:${server.address().port}`
})

afterAll(() => server && server.close())

const castSlot = (language, body) => fetch(`${base}/api/voicelab/languages/${language}/slot`, {
  method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
})

describe('PUT /languages/:language/slot — the human-voice guard', () => {
  it('REFUSES a Welsh cast with 409 and writes nothing', async () => {
    upserts.length = 0
    const res = await castSlot('cym', { slot: 'phrase', gender: 'f', rank: 0, voiceId: 'cartesia_probe' })
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.code).toBe('HUMAN_RECORDED')
    expect(body.error).toMatch(/cym_n_for_eng/)
    expect(body.error).toMatch(/recording worklist/)
    // Nothing written — not the slot, and not even a `voices` registration.
    expect(upserts).toEqual([])
  })

  it('SAVES a German cast and names the one course it skipped', async () => {
    upserts.length = 0
    const res = await castSlot('deu', { slot: 'phrase', gender: 'f', rank: 0, voiceId: 'cartesia_probe' })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.skippedTotal).toBe(1)
    expect(body.skipped[0].course).toBe('deu_at_for_eng')
    expect(body.skipped[0].roles).toEqual(['target2'])
    expect(upserts.some((u) => u.table === 'voice_language_roles')).toBe(true)
  })

  it('SAVES a cast on a language with no human recordings at all, skipping nothing', async () => {
    upserts.length = 0
    const res = await castSlot('spa', { slot: 'phrase', gender: 'f', rank: 0, voiceId: 'cartesia_probe' })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.skippedTotal).toBe(0)
    expect(body.skipped).toEqual([])
  })
})

/**
 * NO CONSENT, NO CAST — at the endpoint, where the client cannot reach.
 *
 * Tom, 2026-08-31: "we are never going to use a voice without consent". The
 * screen hides the Cast button, but the screen is not the protection: this is
 * the request a stale tab, a curl or a future screen sends, and it has to be
 * refused on its own.
 */
describe('PUT /languages/:language/slot — the consent block', () => {
  it('REFUSES a clone nobody has authorised, and writes nothing at all', async () => {
    upserts.length = 0
    const res = await castSlot('deu', { slot: 'phrase', gender: 'f', rank: 0, voiceId: 'cartesia_clone' })
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.code).toBe('NO_RECORDED_CONSENT')
    expect(body.error).toMatch(/Aran has not authorised/)
    // Not the slot, and not a stray `voices` row for a person nobody has asked.
    expect(upserts).toEqual([])
  })

  it('still casts a vendor stock voice — the block is about people, not voices', async () => {
    upserts.length = 0
    const res = await castSlot('deu', { slot: 'phrase', gender: 'f', rank: 0, voiceId: 'cartesia_probe' })
    expect(res.status).toBe(200)
  })
})
