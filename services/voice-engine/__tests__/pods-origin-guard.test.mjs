// GUARD CHECK (registration mission §4): phase8's precious-audio origin guard
// must refuse TTS regeneration over the human pod rows the registration
// branch writes.
//
// Two layers verified against the REAL phase8 module:
//   1. humanRowAtAudioKey (G1 guard helper, exported additively) finds a human
//      row carrying a POD role (target1 / known / pod_explainer) at the
//      5-column audio key — and fails CLOSED (throws) on query error instead
//      of silently clobbering.
//   2. generatePodAudio — the /generate-pods write path — returns
//      { reused: true } for a key occupied by a human row WITHOUT calling TTS
//      and WITHOUT upserting (the row is untouched). The /generate-pods queue
//      additionally skips sentences whose audio FK is already linked, so a
//      registered human pod row is never even enqueued.
//
// phase8-audio-v13.cjs is a CJS service module loaded natively by vitest
// (externalized), so vi.mock cannot intercept its deps — the DB client and
// TTS service are stubbed by seeding Node's require cache BEFORE the module
// loads. PHASE8_NO_LISTEN prevents the port bind (the module's documented
// helpers-only mode). No env, no network, no DB.
import { describe, it, expect, beforeAll } from 'vitest'
import { createRequire } from 'node:module'

const requireCjs = createRequire(import.meta.url)

const state = {
  audioRows: [],
  failNextSelect: false,
  // The guard retries a failed read three times before giving up, so proving it
  // fails CLOSED needs a failure that persists across all three.
  failAllSelects: false,
  upserts: [],
  ttsCalls: 0,
}

function makeMockSupabaseClient() {
  return {
    from(table) {
      const filters = {}
      let op = 'select'
      const api = {
        select() { return api },
        eq(col, val) { filters[col] = { kind: 'eq', val }; return api },
        in(col, vals) { filters[col] = { kind: 'in', val: vals }; return api },
        neq(col, val) { filters[col] = { kind: 'neq', val }; return api },
        order() { return api },
        not() { return api },
        lte() { return api },
        limit() { return api },
        // Several phase8 queries end on a filter and are awaited directly (the
        // precious-audio guard is one). Without a thenable the await yielded
        // the builder itself, `{ data, error }` destructured to undefined, and
        // the guard read as "no human row" — the failure this file exists to
        // catch, silently passing as null.
        then(onFulfilled, onRejected) { return resolve().then(onFulfilled, onRejected) },
        maybeSingle() { return resolve().then(r => ({ data: (r.data || [])[0] || null, error: r.error })) },
        single() { return resolve().then(r => ({ data: (r.data || [])[0] || null, error: r.error })) },
        upsert(row) { op = 'upsert'; state.upserts.push({ table, row }); return api },
        update() { return api },
      }
      function resolve() {
        if ((state.failNextSelect || state.failAllSelects) && op === 'select') {
          state.failNextSelect = false
          return Promise.resolve({ data: null, error: { message: 'transient query failure' } })
        }
        if (table === 'course_audio' && op === 'select') {
          const rows = state.audioRows.filter(r =>
            Object.entries(filters).every(([k, f]) =>
              f.kind === 'in' ? f.val.includes(r[k])
                : f.kind === 'neq' ? r[k] !== f.val
                  : r[k] === f.val))
          return Promise.resolve({ data: rows, error: null })
        }
        if (op === 'upsert') return Promise.resolve({ data: [{ id: 'UPSERTED-ID' }], error: null })
        return Promise.resolve({ data: [], error: null })
      }
      return api
    },
    channel: () => ({ on: () => ({ subscribe: () => {} }) }),
    rpc: () => Promise.resolve({ data: null, error: null }),
  }
}

/** Seed Node's require cache so phase8's native require() gets our stub. */
function seedRequireCache(specifier, exports) {
  const resolved = requireCjs.resolve(specifier)
  requireCjs.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports }
}

let phase8

beforeAll(async () => {
  process.env.PHASE8_NO_LISTEN = '1' // helpers-only mode — never binds 3465
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://stub.invalid'
  process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'stub'

  seedRequireCache('@supabase/supabase-js', { createClient: () => makeMockSupabaseClient() })
  seedRequireCache('../../tts-service.cjs', {
    generateWithRetry: async () => { state.ttsCalls++; return { audioBuffer: Buffer.from('x') } },
    generateAudio: async () => { state.ttsCalls++; return { audioBuffer: Buffer.from('x') } },
  })

  phase8 = await import('../../phases/phase8-audio-v13.cjs')
})

const humanPodRow = (role) => ({
  id: `HUMAN-${role}`,
  course_code: 'cym_n_for_eng',
  text_normalized: 'bore da',
  language: 'cym',
  role,
  voice_id: 'human_catrin_cym',
  origin: 'human',
  s3_key: 'mastered/HUMAN-TAKE.mp3',
})

describe('phase8 origin guard vs human pod rows', () => {
  it('exports the G1 guard helper (additive)', () => {
    expect(typeof phase8.humanRowAtAudioKey).toBe('function')
    expect(typeof phase8.generatePodAudio).toBe('function')
  })

  it('humanRowAtAudioKey finds human rows for every POD role at the audio key', async () => {
    for (const role of ['target1', 'known', 'pod_explainer']) {
      state.audioRows = [humanPodRow(role)]
      const found = await phase8.humanRowAtAudioKey(
        'cym_n_for_eng', 'bore da', 'cym', role, 'human_catrin_cym')
      expect(found).toMatchObject({ id: `HUMAN-${role}`, origin: 'human', role })
    }
  })

  it('humanRowAtAudioKey returns null when no human row holds the key', async () => {
    state.audioRows = [{ ...humanPodRow('target1'), origin: 'tts', id: 'TTS-ROW' }]
    const found = await phase8.humanRowAtAudioKey(
      'cym_n_for_eng', 'bore da', 'cym', 'target1', 'human_catrin_cym')
    expect(found).toBeNull()
  })

  it('humanRowAtAudioKey fails CLOSED on query failure (throws, never clobbers)', async () => {
    state.audioRows = [humanPodRow('target1')]
    state.failAllSelects = true
    try {
      await expect(phase8.humanRowAtAudioKey(
        'cym_n_for_eng', 'bore da', 'cym', 'target1', 'human_catrin_cym'
      )).rejects.toThrow(/precious-audio guard query failed/)
    } finally {
      state.failAllSelects = false
    }
  })

  it('generatePodAudio REUSES a human row at its key — no TTS call, no upsert', async () => {
    state.audioRows = [humanPodRow('target1')]
    state.upserts = []
    state.ttsCalls = 0
    const result = await phase8.generatePodAudio({
      courseCode: 'cym_n_for_eng',
      text: 'Bore da',
      language: 'cym',
      role: 'target1',
      voice: { voice_id: 'human_catrin_cym', provider: 'azure' },
    })
    expect(result).toMatchObject({ id: 'HUMAN-target1', reused: true })
    expect(state.ttsCalls).toBe(0)
    expect(state.upserts).toEqual([])
  })

  it('generatePodAudio fails CLOSED when the existing-audio lookup errors (no fall-through upsert)', async () => {
    state.audioRows = [humanPodRow('known')]
    state.failNextSelect = true
    state.upserts = []
    state.ttsCalls = 0
    await expect(phase8.generatePodAudio({
      courseCode: 'cym_n_for_eng',
      text: 'Bore da',
      language: 'cym',
      role: 'known',
      voice: { voice_id: 'human_catrin_cym', provider: 'azure' },
    })).rejects.toThrow(/findExistingAudio failed/)
    expect(state.ttsCalls).toBe(0)
    expect(state.upserts).toEqual([])
  })
})
