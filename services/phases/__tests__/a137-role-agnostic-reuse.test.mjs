// A-137: ONE voice pool per language, regardless of role.
//
// Tom, 2026-08-18: "of course the same - the player will play the voices at
// different speeds when necessary." Register differences between the
// instructional known side and target material are handled at PLAYBACK SPEED,
// so `role` leaves the reuse key and a clip rendered as target2 in one course
// answers the known side of another.
//
// What this file pins down:
//   1. cross-role reuse happens, and same-role still wins when both exist;
//   2. the Azure baked-speed guard is the ONE exception, and it is
//      engine-shaped, not role-shaped;
//   3. a lookup FAILURE is distinguishable from a cache MISS — the bug the
//      sizing doc found at both live call sites, where `catch {}` sent every
//      broken lookup straight to paid TTS looking exactly like "no sibling";
//   4. a repair is never answered with the bytes it was asked to replace;
//   5. the double-normalise whitespace hole is closed.
//
// Same harness as clip-identity-writers.test.mjs: phase8 is a CJS service
// module loaded natively, so its deps are stubbed by seeding Node's require
// cache before it loads. PHASE8_NO_LISTEN keeps it off port 3465. No DB, no
// network, NO TTS — nothing in this file can render or spend.
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { createRequire } from 'node:module'

const requireCjs = createRequire(import.meta.url)

const state = {
  audioRows: [],
  // Set to a message to make the NEXT course_audio select fail, which is how
  // "the lookup broke" is told apart from "there is no sibling".
  selectError: null,
  writes: [],
}

function makeMockSupabaseClient() {
  return {
    from(table) {
      const filters = {}
      let op = 'select'
      let payload = null
      const api = {
        select() { return api },
        eq(col, val) { filters[col] = { kind: 'eq', val }; return api },
        in(col, vals) { filters[col] = { kind: 'in', val: vals }; return api },
        neq(col, val) { filters[col] = { kind: 'neq', val }; return api },
        not() { return api },
        order() { return api },
        limit() { return api },
        then(onFulfilled, onRejected) { return resolve().then(onFulfilled, onRejected) },
        maybeSingle() { return resolve().then(r => ({ data: (r.data || [])[0] || null, error: r.error })) },
        single() { return resolve().then(r => ({ data: (r.data || [])[0] || null, error: r.error })) },
        upsert(p) { op = 'upsert'; payload = p; return api },
        update(p) { op = 'update'; payload = p; return api },
        insert(p) { op = 'insert'; payload = p; return api },
      }
      function resolve() {
        if (table === 'course_audio' && op === 'select') {
          if (state.selectError) {
            const message = state.selectError
            state.selectError = null
            return Promise.resolve({ data: null, error: { message } })
          }
          const rows = state.audioRows.filter(r =>
            Object.entries(filters).every(([k, f]) =>
              f.kind === 'in' ? f.val.includes(r[k])
                : f.kind === 'neq' ? r[k] !== f.val
                  : r[k] === f.val))
          return Promise.resolve({ data: rows, error: null })
        }
        if (op !== 'select') {
          state.writes.push({ table, op, payload, filters })
          return Promise.resolve({ data: [{ id: 'WRITTEN-ID' }], error: null })
        }
        return Promise.resolve({ data: [], error: null })
      }
      return api
    },
    channel: () => ({ on: () => ({ subscribe: () => {} }) }),
    rpc: () => Promise.resolve({ data: null, error: null }),
  }
}

function seedRequireCache(specifier, exports) {
  const resolved = requireCjs.resolve(specifier)
  requireCjs.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports }
}

let phase8

beforeAll(async () => {
  process.env.PHASE8_NO_LISTEN = '1'
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://stub.invalid'
  process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'stub'

  seedRequireCache('@supabase/supabase-js', { createClient: () => makeMockSupabaseClient() })
  seedRequireCache('../../tts-service.cjs', {
    generateWithRetry: async () => { throw new Error('stub: this suite must never render') },
    generateAudio: async () => { throw new Error('stub: this suite must never render') },
  })

  phase8 = await import('../phase8-audio-v13.cjs')
})

beforeEach(() => {
  state.audioRows = []
  state.selectError = null
  state.writes = []
})

// The clone: an xAI voice, so it carries no baked speed and may cross roles.
const CLONE = 'xai_gfzdpspr5fdp'
// Azure: speed is baked into the MP3 and course_audio persists no per-row
// speed, so its pace cannot be verified after the fact.
const SONIA = 'azure_en-GB-SoniaNeural'

const row = (over = {}) => ({
  id: 'SIB',
  course_code: 'eng_for_hin',
  text: 'i want to speak',
  text_normalized: 'i want to speak',
  language: 'eng',
  role: 'target2',
  voice_id: CLONE,
  s3_key: 'mastered/SIBLING.mp3',
  duration_ms: 1200,
  ...over,
})

// ─── 1. the ruling itself ────────────────────────────────────────────────────

describe('findSiblingCourseClip — the reuse key is role-agnostic (A-137)', () => {
  it("answers a known-side slot with a clip rendered as target2 elsewhere", async () => {
    // Tom's own worked example, 2026-08-07: an English sentence spoken by the
    // clone as target2 in eng_for_hin IS coverage for the English known side of
    // fra_for_eng. Before A-137 this returned null and the estate paid twice.
    state.audioRows = [row()]
    const found = await phase8.findSiblingCourseClip(
      'fra_for_eng', 'I want to speak', 'eng', 'known', CLONE)
    expect(found).toMatchObject({ s3_key: 'mastered/SIBLING.mp3', role: 'target2' })
  })

  it('prefers the same-role clip when both exist, so widening can only ADD a hit', async () => {
    state.audioRows = [
      row({ id: 'CROSS', role: 'target2', s3_key: 'mastered/CROSS.mp3' }),
      row({ id: 'SAME', role: 'known', s3_key: 'mastered/SAME.mp3' }),
    ]
    const found = await phase8.findSiblingCourseClip(
      'fra_for_eng', 'I want to speak', 'eng', 'known', CLONE)
    expect(found.s3_key).toBe('mastered/SAME.mp3')
  })

  it('restores the pre-A-137 strict key on request', async () => {
    state.audioRows = [row({ role: 'target2' })]
    const found = await phase8.findSiblingCourseClip(
      'fra_for_eng', 'I want to speak', 'eng', 'known', CLONE, { crossRole: false })
    expect(found).toBeNull()
  })

  it('still refuses a different language and the course own rows', async () => {
    state.audioRows = [
      row({ language: 'spa' }),
      row({ id: 'OWN', course_code: 'fra_for_eng', role: 'known' }),
    ]
    const found = await phase8.findSiblingCourseClip(
      'fra_for_eng', 'I want to speak', 'eng', 'known', CLONE)
    expect(found).toBeNull()
  })
})

// ─── 2. the ONE exception, and its shape ─────────────────────────────────────

describe('the Azure baked-speed guard is retired — one canonical rendered pace', () => {
  // FLIPPED DELIBERATELY, 2026-08-29. This test asserted the baked-speed guard,
  // which Tom retired: "playback speed is a player concern, not a baked-in
  // render concern … stop treating rendered pace as a reason for distinct
  // clips." isSpeedTrustedVoice is now a stub returning true for every voice,
  // so an Azure clip crosses roles like any other. Tom, on the cost to clips
  // already in the estate: "I don't care if anything notionally breaks... it's
  // only going to affect regeneration, or replacement."
  it('now crosses roles on an Azure clip too — the baked-speed guard is retired', async () => {
    state.audioRows = [row({ voice_id: SONIA, role: 'target2' })]
    const found = await phase8.findSiblingCourseClip(
      'fra_for_eng', 'I want to speak', 'eng', 'known', SONIA)
    expect(found).toMatchObject({ s3_key: 'mastered/SIBLING.mp3', role: 'target2' })
  })

  it('still reuses the SAME role on Azure — that is today behaviour, unchanged', async () => {
    state.audioRows = [row({ voice_id: SONIA, role: 'known' })]
    const found = await phase8.findSiblingCourseClip(
      'fra_for_eng', 'I want to speak', 'eng', 'known', SONIA)
    expect(found).toMatchObject({ s3_key: 'mastered/SIBLING.mp3' })
  })

  it('lets a BARE clone id cross roles — the guard tests for Azure, not for a good prefix', async () => {
    // Measured 2026-08-07: a prefix-shaped guard suppressed the clone's
    // cross-role coverage entirely, which is the exact distortion A-137 removes.
    state.audioRows = [row({ voice_id: 'gfzdpspr5fdp', role: 'target1' })]
    const found = await phase8.findSiblingCourseClip(
      'fra_for_eng', 'I want to speak', 'eng', 'known', CLONE)
    expect(found).toMatchObject({ s3_key: 'mastered/SIBLING.mp3' })
  })
})

// ─── 3. a broken lookup is not a cache miss ──────────────────────────────────

describe('lookupSiblingClip — the silent-fallback bug', () => {
  it('reports a lookup failure as an ERROR, not as "no sibling exists"', async () => {
    state.selectError = 'connection reset by peer'
    const result = await phase8.lookupSiblingClip(
      'fra_for_eng', 'I want to speak', 'eng', 'known', CLONE)
    expect(result.status).toBe('error')
    expect(result.clip).toBeNull()
    expect(result.error).toMatch(/connection reset/)
  })

  it('reports a genuine absence as a MISS, which is a different thing', async () => {
    state.audioRows = []
    const result = await phase8.lookupSiblingClip(
      'fra_for_eng', 'I want to speak', 'eng', 'known', CLONE)
    expect(result.status).toBe('miss')
    expect(result.error).toBeNull()
  })

  it('counts hits, misses and errors separately for /health', async () => {
    const before = { ...phase8.siblingLookupStats }
    state.audioRows = [row()]
    await phase8.lookupSiblingClip('fra_for_eng', 'I want to speak', 'eng', 'known', CLONE)
    state.audioRows = []
    await phase8.lookupSiblingClip('fra_for_eng', 'nothing here', 'eng', 'known', CLONE)
    state.selectError = 'boom'
    await phase8.lookupSiblingClip('fra_for_eng', 'I want to speak', 'eng', 'known', CLONE)
    expect(phase8.siblingLookupStats.hits).toBe(before.hits + 1)
    expect(phase8.siblingLookupStats.misses).toBe(before.misses + 1)
    expect(phase8.siblingLookupStats.errors).toBe(before.errors + 1)
    expect(phase8.siblingLookupStats.lastError).toBe('sibling-clip lookup failed: boom')
  })

  it('a lookup failure makes reuse decline, and it is COUNTED rather than swallowed', async () => {
    state.selectError = 'statement timeout'
    const counters = { reused: 0, crossRole: 0, lookupErrors: 0, linkErrors: 0 }
    const reused = await phase8.reuseSiblingIntoCourse({
      courseCode: 'fra_for_eng', text: 'I want to speak', language: 'eng',
      role: 'known', voiceId: CLONE, counters,
    })
    // Falling through to a render is still the right recovery — you cannot fail
    // a render because a cache lookup broke. Doing it INVISIBLY was the bug.
    expect(reused).toBeNull()
    expect(counters.lookupErrors).toBe(1)
    expect(counters.reused).toBe(0)
    // and nothing was written on the way past
    expect(state.writes).toHaveLength(0)
  })
})

// ─── 4. reuse answers a cache miss, never a repair ───────────────────────────

describe('reuseSiblingIntoCourse', () => {
  it('never hands back the very bytes the caller is replacing', async () => {
    // Physical sharing is estate doctrine: many rows across many courses point
    // at the SAME s3_key. So a repair CAN find its own broken object under
    // another course's row, and answering "make new bytes" with those bytes
    // would silently do nothing at all.
    state.audioRows = [row({ s3_key: 'mastered/BROKEN.mp3' })]
    const found = await phase8.findSiblingCourseClip(
      'fra_for_eng', 'I want to speak', 'eng', 'known', CLONE,
      { excludeS3Keys: ['mastered/BROKEN.mp3'] })
    expect(found).toBeNull()
  })

  it('links the sibling S3 object and carries its veracity verdict with the bytes', async () => {
    // The verdict describes the BYTES, and the bytes are the same object. The
    // alternative — a row carrying its old bytes' verdict next to new audio —
    // is the false claim the veracity columns exist to end.
    state.audioRows = [row({
      veracity_checked_at: '2026-08-17T00:00:00.000Z',
      veracity_pass: true,
      veracity_cer: 0.01,
      veracity_checker: 'phase8-generate',
    })]
    const counters = { reused: 0, crossRole: 0, lookupErrors: 0, linkErrors: 0 }
    const reused = await phase8.reuseSiblingIntoCourse({
      courseCode: 'fra_for_eng', text: 'I want to speak', language: 'eng',
      role: 'known', voiceId: CLONE, counters,
    })
    expect(reused).toMatchObject({ s3Key: 'mastered/SIBLING.mp3', crossedRole: true, fromRole: 'target2' })
    expect(counters).toMatchObject({ reused: 1, crossRole: 1 })
    const write = state.writes.find(w => w.table === 'course_audio')
    expect(write.op).toBe('upsert')
    expect(write.payload).toMatchObject({
      course_code: 'fra_for_eng',
      role: 'known',
      s3_key: 'mastered/SIBLING.mp3',
      veracity_pass: true,
      veracity_checker: 'phase8-generate',
    })
  })

  it('updates the named row in place when the caller owns one already', async () => {
    state.audioRows = [row()]
    const reused = await phase8.reuseSiblingIntoCourse({
      courseCode: 'fra_for_eng', text: 'I want to speak', language: 'eng',
      role: 'known', voiceId: CLONE, updateRowId: 'EXISTING-ROW',
    })
    expect(reused).toBeTruthy()
    const write = state.writes.find(w => w.table === 'course_audio')
    expect(write.op).toBe('update')
    expect(write.filters.id).toMatchObject({ val: 'EXISTING-ROW' })
  })

  it('declines quietly when reuse is switched off for the request', async () => {
    state.audioRows = [row()]
    const reused = await phase8.reuseSiblingIntoCourse({
      courseCode: 'fra_for_eng', text: 'I want to speak', language: 'eng',
      role: 'known', voiceId: CLONE, opts: { enabled: false },
    })
    expect(reused).toBeNull()
    expect(state.writes).toHaveLength(0)
  })
})

describe('reuseOptsFromRequest', () => {
  it('defaults both switches ON — a cache miss is the only reason to occupy the queue', () => {
    expect(phase8.reuseOptsFromRequest({ body: {} })).toEqual({ enabled: true, crossRole: true })
    expect(phase8.reuseOptsFromRequest({})).toEqual({ enabled: true, crossRole: true })
  })

  it('honours the escape hatches an operator who wants NEW bytes needs', () => {
    expect(phase8.reuseOptsFromRequest({ body: { reuse: false } }).enabled).toBe(false)
    expect(phase8.reuseOptsFromRequest({ body: { crossRole: false } }).crossRole).toBe(false)
  })
})

// ─── 5. the whitespace hole ──────────────────────────────────────────────────

describe('the double-normalise hole', () => {
  it('reaches a row stored with internal whitespace the DB convention keeps', async () => {
    // normalizeForAudio collapses internal whitespace; normalizeForDb must NOT,
    // because its whole job is to be byte-identical to SQL normalize_text().
    // Normalising twice fed the collapsed text into the DB-convention candidate,
    // so a row written with a double space was unreachable by either key.
    // Measured blast radius when found: 94 rows estate-wide.
    state.audioRows = [row({ text_normalized: 'i want  to speak', role: 'known' })]
    const found = await phase8.findSiblingCourseClip(
      'fra_for_eng', 'I want  to speak', 'eng', 'known', CLONE)
    expect(found).toMatchObject({ s3_key: 'mastered/SIBLING.mp3' })
  })

  it('still reaches the collapsed-whitespace convention for pre-March-2026 rows', async () => {
    state.audioRows = [row({ text_normalized: 'i want to speak', role: 'known' })]
    const found = await phase8.findSiblingCourseClip(
      'fra_for_eng', 'I want  to speak', 'eng', 'known', CLONE)
    expect(found).toMatchObject({ s3_key: 'mastered/SIBLING.mp3' })
  })
})
