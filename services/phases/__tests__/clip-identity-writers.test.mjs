// One spelling for a clip's language and voice, on the pipeline write paths.
//
// Covers the four things this branch changed in phase8 / presentation-author /
// the (since deleted) pod explainer composite. The 'pod_explainer' role and the
// 'comp:' voice tags below are fixtures for clips that ALREADY EXIST: nothing
// produces them since explainers were deprecated on 2026-08-24, but every read
// path still has to spell them the same way:
//   1. writes compose language and voice_id through clip-identity;
//   2. the 'auto' split — generatePodAudio takes the clip's identity language
//      AND a separate xAI language cue, so a TTS tuning parameter stops being
//      written into an identity column;
//   3. reads (precious-audio guard, pod dedup, cross-course reuse) compare
//      canonical to canonical instead of one spelling to another;
//   4. a composite voice tag keeps its own namespace, part by part.
//
// Same harness as pods-origin-guard.test.mjs: phase8 is a CJS service module
// loaded natively, so its deps are stubbed by seeding Node's require cache
// before it loads. PHASE8_NO_LISTEN keeps it off port 3465. No DB, no network,
// no TTS.
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { createRequire } from 'node:module'

const requireCjs = createRequire(import.meta.url)

const state = {
  audioRows: [],
  ttsCalls: [],
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
        not() { return api },
        order() { return api },
        limit() { return api },
        then(onFulfilled, onRejected) { return resolve().then(onFulfilled, onRejected) },
        maybeSingle() { return resolve().then(r => ({ data: (r.data || [])[0] || null, error: r.error })) },
        single() { return resolve().then(r => ({ data: (r.data || [])[0] || null, error: r.error })) },
        upsert() { op = 'upsert'; return api },
        update() { return api },
      }
      function resolve() {
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

function seedRequireCache(specifier, exports) {
  const resolved = requireCjs.resolve(specifier)
  requireCjs.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports }
}

let phase8
let presentationAuthor

beforeAll(async () => {
  process.env.PHASE8_NO_LISTEN = '1'
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://stub.invalid'
  process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'stub'

  seedRequireCache('@supabase/supabase-js', { createClient: () => makeMockSupabaseClient() })
  // Records what the provider was actually told, then fails — every test here
  // is about the values, never about producing audio.
  seedRequireCache('../../tts-service.cjs', {
    generateWithRetry: async (text, provider, config) => {
      state.ttsCalls.push({ text, provider, config })
      throw new Error('stub: no audio in tests')
    },
    generateAudio: async (text, provider, config) => {
      state.ttsCalls.push({ text, provider, config })
      throw new Error('stub: no audio in tests')
    },
  })

  phase8 = await import('../phase8-audio-v13.cjs')
  presentationAuthor = requireCjs('../presentation-author.cjs')
})

beforeEach(() => {
  state.audioRows = []
  state.ttsCalls = []
})

const humanRow = (over = {}) => ({
  id: 'HUMAN-1',
  course_code: 'cym_n_for_eng',
  text_normalized: 'bore da',
  language: 'cym',
  role: 'target1',
  voice_id: 'human_catrin_cym',
  origin: 'human',
  s3_key: 'mastered/HUMAN-TAKE.mp3',
  ...over,
})

// ─── the composite tag ───────────────────────────────────────────────────────

describe('canonicalClipVoiceId', () => {
  it('spells a bare Azure name and a bare xAI clone the way the estate does', () => {
    expect(phase8.canonicalClipVoiceId('en-GB-SoniaNeural')).toBe('azure_en-GB-SoniaNeural')
    expect(phase8.canonicalClipVoiceId('gfzdpspr5fdp', 'xai')).toBe('xai_gfzdpspr5fdp')
    expect(phase8.canonicalClipVoiceId('azure_en-GB-SoniaNeural')).toBe('azure_en-GB-SoniaNeural')
  })

  it('lets the id own prefix win over a defaulted provider hint, instead of throwing', () => {
    // getCourseContext defaults provider to 'azure'. A course carrying
    // {voiceId: 'xai_leo'} with no provider key would otherwise be a mismatch.
    expect(phase8.canonicalClipVoiceId('xai_leo', 'azure')).toBe('xai_leo')
  })

  it('keeps a composite in its own namespace and canonicalises each part', () => {
    // A spliced explainer is not the same audio as a single-voice render, so
    // the recipe must never collapse onto one of its parts.
    expect(phase8.canonicalClipVoiceId('comp:ga-IE-OrlaNeural+en-GB-SoniaNeural'))
      .toBe('comp:azure_ga-IE-OrlaNeural+azure_en-GB-SoniaNeural')
    expect(phase8.canonicalClipVoiceId('comp:leo', 'xai'))
      .not.toBe(phase8.canonicalClipVoiceId('leo', 'xai'))
  })

  it('refuses a voice it cannot resolve rather than guessing one', () => {
    expect(() => phase8.canonicalClipVoiceId('some-clone-id')).toThrow()
    expect(() => phase8.canonicalClipVoiceId('legacy_import')).toThrow()
  })
})

// ─── the precious-audio guard: widen, never narrow ───────────────────────────

describe('humanRowAtAudioKey — spelling drift must not hide a human take', () => {
  it('finds a human row stored under another spelling of the same language and voice', async () => {
    state.audioRows = [humanRow({
      course_code: 'fra_for_eng',
      text_normalized: 'bonjour',
      language: 'fr-FR',
      role: 'known',
      voice_id: 'en-GB-SoniaNeural',
    })]
    const found = await phase8.humanRowAtAudioKey(
      'fra_for_eng', 'bonjour', 'fra', 'known', 'azure_en-GB-SoniaNeural')
    expect(found).toMatchObject({ id: 'HUMAN-1', origin: 'human' })
  })

  it('treats a stored value it cannot canonicalise as occupying the key', async () => {
    // A false positive costs one skipped render; a false negative writes TTS
    // over a human recording. The asymmetry decides the default.
    state.audioRows = [humanRow({ voice_id: 'legacy_import' })]
    const found = await phase8.humanRowAtAudioKey(
      'cym_n_for_eng', 'bore da', 'cym', 'target1', 'azure_cy-GB-NiaNeural')
    expect(found).toMatchObject({ id: 'HUMAN-1' })
  })

  it('still says no when the row is a genuinely different voice', async () => {
    state.audioRows = [humanRow({ voice_id: 'human_gareth_cym' })]
    const found = await phase8.humanRowAtAudioKey(
      'cym_n_for_eng', 'bore da', 'cym', 'target1', 'human_catrin_cym')
    expect(found).toBeNull()
  })

  it('still says no when the row is a genuinely different language', async () => {
    state.audioRows = [humanRow({ language: 'eng' })]
    const found = await phase8.humanRowAtAudioKey(
      'cym_n_for_eng', 'bore da', 'cym', 'target1', 'human_catrin_cym')
    expect(found).toBeNull()
  })
})

// ─── dedup reads: canonical, but strict ──────────────────────────────────────

describe('findExistingAudio — one clip, however it was spelt', () => {
  it('reuses a clip stored under the other spelling of its voice', async () => {
    state.audioRows = [{
      id: 'CLIP-1',
      course_code: 'fra_for_eng',
      text_normalized: 'bonjour',
      language: 'fr',
      role: 'known',
      voice_id: 'leo',
    }]
    const found = await phase8.findExistingAudio(
      'fra_for_eng', 'Bonjour', 'fra', 'known', 'xai_leo')
    expect(found).toBe('CLIP-1')
  })

  it('does NOT reuse a different voice — a false match relinks the wrong audio', async () => {
    state.audioRows = [{
      id: 'CLIP-1',
      course_code: 'fra_for_eng',
      text_normalized: 'bonjour',
      language: 'fra',
      role: 'known',
      voice_id: 'xai_eve',
    }]
    const found = await phase8.findExistingAudio(
      'fra_for_eng', 'Bonjour', 'fra', 'known', 'xai_leo')
    expect(found).toBeNull()
  })

  it('does NOT let a composite collapse onto a plain render of the same text', async () => {
    state.audioRows = [{
      id: 'CLIP-PLAIN',
      course_code: 'gle_for_eng',
      text_normalized: 'dia duit means hello',
      language: 'gle',
      role: 'pod_explainer',
      voice_id: 'xai_leo',
    }]
    const found = await phase8.findExistingAudio(
      'gle_for_eng', 'dia duit means hello', 'gle', 'pod_explainer', 'comp:xai_leo+azure_en-GB-SoniaNeural')
    expect(found).toBeNull()
  })
})

// ─── cross-course canon reuse: exact text, or nothing ────────────────────────
//
// Tom's ruling 2026-08-11 (decision 8 of the pod-0 survey): a pod line whose
// English is byte-identical canonical pod-0 text may point at a sibling course's
// identical clip instead of paying to render it again — but ONLY on exact canon
// text, and only from a pod already aligned to canon. The second test is the one
// that matters: near-miss text must NOT borrow, or a learner hears wrong words.

describe('findAudioRowForClip — cross-course reuse on exact canon text', () => {
  const CANON = "let's have a coffee"
  const canonTexts = new Set([CANON])

  const siblingRow = (over = {}) => ({
    id: 'SIB-CANON',
    course_code: 'deu_at_for_eng',
    text: CANON,
    text_normalized: "let's have a coffee",
    language: 'eng',
    role: 'known',
    voice_id: 'azure_en-GB-SoniaNeural',
    s3_key: 'mastered/CANON.mp3',
    ...over,
  })

  it('reuses a sibling course clip when the canon text matches byte for byte', async () => {
    state.audioRows = [siblingRow()]
    const found = await phase8.findAudioRowForClip(
      'cym_n_for_eng', CANON, 'eng', 'known', 'azure_en-GB-SoniaNeural', { canonTexts })
    expect(found).toMatchObject({ id: 'SIB-CANON', course_code: 'deu_at_for_eng' })
  })

  it('does NOT reuse when the stored text has drifted, even where normalisation agrees', async () => {
    // "…coffee!" and "…coffee" share one text_normalized (the DB trigger rtrims
    // '!'), so the course-scoped query finds it — the raw-text check is the only
    // thing standing between the learner and a clip of different words.
    state.audioRows = [siblingRow({ text: "let's have a coffee!" })]
    const found = await phase8.findAudioRowForClip(
      'cym_n_for_eng', CANON, 'eng', 'known', 'azure_en-GB-SoniaNeural', { canonTexts })
    expect(found).toBeNull()
  })

  it('does NOT reuse when the REQUESTING line has drifted off canon', async () => {
    state.audioRows = [siblingRow({ text: "let's have a coffee please", text_normalized: "let's have a coffee please" })]
    const found = await phase8.findAudioRowForClip(
      'cym_n_for_eng', "let's have a coffee please", 'eng', 'known', 'azure_en-GB-SoniaNeural', { canonTexts })
    expect(found).toBeNull()
  })

  it('stays course-scoped when no canon proof is supplied — the old behaviour, unchanged', async () => {
    state.audioRows = [siblingRow()]
    const found = await phase8.findAudioRowForClip(
      'cym_n_for_eng', CANON, 'eng', 'known', 'azure_en-GB-SoniaNeural')
    expect(found).toBeNull()
    expect(await phase8.findExistingAudio(
      'cym_n_for_eng', CANON, 'eng', 'known', 'azure_en-GB-SoniaNeural')).toBeNull()
  })

  it('never borrows a pending placeholder, and never a different voice or language', async () => {
    state.audioRows = [siblingRow({ s3_key: 'pending/whatever.mp3' })]
    expect(await phase8.findAudioRowForClip(
      'cym_n_for_eng', CANON, 'eng', 'known', 'azure_en-GB-SoniaNeural', { canonTexts })).toBeNull()

    state.audioRows = [siblingRow({ voice_id: 'xai_leo' })]
    expect(await phase8.findAudioRowForClip(
      'cym_n_for_eng', CANON, 'eng', 'known', 'azure_en-GB-SoniaNeural', { canonTexts })).toBeNull()

    state.audioRows = [siblingRow({ language: 'deu' })]
    expect(await phase8.findAudioRowForClip(
      'cym_n_for_eng', CANON, 'eng', 'known', 'azure_en-GB-SoniaNeural', { canonTexts })).toBeNull()
  })

  it('prefers the course own clip over a sibling', async () => {
    state.audioRows = [siblingRow(), siblingRow({ id: 'OWN', course_code: 'cym_n_for_eng' })]
    const found = await phase8.findAudioRowForClip(
      'cym_n_for_eng', CANON, 'eng', 'known', 'azure_en-GB-SoniaNeural', { canonTexts })
    expect(found).toMatchObject({ id: 'OWN' })
  })

  it('matches on the canon probe while requiring the stored text to be what we would render', async () => {
    // Multi-sentence pod turns are rendered with a " … " pause cue, derived
    // deterministically from the canon line — so both courses hold the same
    // stored text and the probe is still the un-paused canon line.
    const paused = 'hello … how are you'
    state.audioRows = [siblingRow({ text: paused, text_normalized: paused })]
    const found = await phase8.findAudioRowForClip(
      'cym_n_for_eng', paused, 'eng', 'known', 'azure_en-GB-SoniaNeural',
      { canonTexts: new Set(['hello. how are you']), canonProbe: 'hello. how are you' })
    expect(found).toMatchObject({ id: 'SIB-CANON' })
  })
})

describe('podCanonReuseTexts — only a pod aligned end to end may borrow', () => {
  const canon = [
    { global_order: 1, english_text: 'hello' },
    { global_order: 2, english_text: "I'm learning [target language]." },
    { global_order: 3, english_text: "let's have a coffee" },
  ]
  const aligned = [
    { global_order: 1, known_text: 'hello' },
    { global_order: 2, known_text: "I'm learning Welsh." },
    { global_order: 3, known_text: "let's have a coffee" },
  ]

  it('returns the shareable lines and excludes the per-course placeholder line', () => {
    const texts = phase8.podCanonReuseTexts(canon, aligned, 'known_text')
    expect([...texts].sort()).toEqual(['hello', "let's have a coffee"])
    // The substituted line names a language — sharing it would put "Welsh" in
    // the German course.
    expect(texts.has("I'm learning Welsh.")).toBe(false)
  })

  it('returns null for a pod whose English has drifted anywhere at all', () => {
    const drifted = aligned.map((r, i) => i === 2 ? { ...r, known_text: "let's have a coffee!" } : r)
    expect(phase8.podCanonReuseTexts(canon, drifted, 'known_text')).toBeNull()
  })

  it('returns null for a pod that is short of canon, or ordered differently', () => {
    expect(phase8.podCanonReuseTexts(canon, aligned.slice(0, 2), 'known_text')).toBeNull()
    const reordered = [{ ...aligned[0], global_order: 3 }, aligned[1], { ...aligned[2], global_order: 1 }]
    expect(phase8.podCanonReuseTexts(canon, reordered, 'known_text')).toBeNull()
  })

  it('reads the English side of an eng_for_* course from target_text', () => {
    const engTarget = aligned.map(r => ({ global_order: r.global_order, target_text: r.known_text, known_text: 'ぜんぜん' }))
    expect([...phase8.podCanonReuseTexts(canon, engTarget, 'target_text')].sort())
      .toEqual(['hello', "let's have a coffee"])
    expect(phase8.podCanonReuseTexts(canon, engTarget, 'known_text')).toBeNull()
  })

  it('says nothing is shareable when neither side of the course is English', () => {
    expect(phase8.englishColumnFor({ knownLang: 'eng', targetLang: 'cym' })).toBe('known_text')
    expect(phase8.englishColumnFor({ knownLang: 'jpn', targetLang: 'eng' })).toBe('target_text')
    expect(phase8.englishColumnFor({ knownLang: 'spa', targetLang: 'cym' })).toBeNull()
    expect(phase8.podCanonReuseTexts(canon, aligned, null)).toBeNull()
  })
})

describe('findSiblingCourseClip — the query that saves the money', () => {
  it('sees a sibling course clip stored under another spelling', async () => {
    state.audioRows = [{
      id: 'SIB-1',
      course_code: 'spa_for_eng',
      text_normalized: 'hello',
      language: 'en-GB',
      role: 'known',
      voice_id: 'en-GB-SoniaNeural',
      s3_key: 'mastered/AAA.mp3',
      duration_ms: 900,
    }]
    const found = await phase8.findSiblingCourseClip(
      'fra_for_eng', 'Hello', 'eng', 'known', 'azure_en-GB-SoniaNeural')
    expect(found).toMatchObject({ s3_key: 'mastered/AAA.mp3' })
  })

  it('never returns the course own rows, and never a pending placeholder', async () => {
    state.audioRows = [{
      id: 'OWN',
      course_code: 'fra_for_eng',
      text_normalized: 'hello',
      language: 'eng',
      role: 'known',
      voice_id: 'azure_en-GB-SoniaNeural',
      s3_key: 'mastered/OWN.mp3',
    }]
    const found = await phase8.findSiblingCourseClip(
      'fra_for_eng', 'Hello', 'eng', 'known', 'azure_en-GB-SoniaNeural')
    expect(found).toBeNull()
  })

  it('does not reuse a sibling in a different language', async () => {
    state.audioRows = [{
      id: 'SIB-2',
      course_code: 'spa_for_eng',
      text_normalized: 'no',
      language: 'spa',
      role: 'known',
      voice_id: 'azure_en-GB-SoniaNeural',
      s3_key: 'mastered/BBB.mp3',
    }]
    const found = await phase8.findSiblingCourseClip(
      'fra_for_eng', 'No', 'eng', 'known', 'azure_en-GB-SoniaNeural')
    expect(found).toBeNull()
  })
})

// ─── the 'auto' split ────────────────────────────────────────────────────────

describe("generatePodAudio — the clip's language and the TTS cue are two things", () => {
  const explainerVoice = { voice_id: 'gfzdpspr5fdp', provider: 'xai' }

  it("refuses 'auto' as an identity — it is a provider instruction, not a language", async () => {
    await expect(phase8.generatePodAudio({
      courseCode: 'fra_for_eng',
      text: 'bien means well',
      language: 'auto',
      role: 'pod_explainer',
      voice: explainerVoice,
    })).rejects.toThrow(/cannot canonicalise language/)
    expect(state.ttsCalls).toHaveLength(0)
  })

  it("passes the cue to xAI untouched while the identity is the course language", async () => {
    // The point of the whole split: nothing about the rendered audio changes.
    await expect(phase8.generatePodAudio({
      courseCode: 'fra_for_eng',
      text: 'bien means well',
      language: 'fra',
      ttsLanguageCue: 'auto',
      role: 'pod_explainer',
      voice: explainerVoice,
    })).rejects.toThrow()
    expect(state.ttsCalls).toHaveLength(1)
    expect(state.ttsCalls[0].provider).toBe('xai')
    expect(state.ttsCalls[0].config.language).toBe('auto')
  })

  it('looks the clip up under the identity language, not the cue', async () => {
    state.audioRows = [{
      id: 'EXPLAINER-1',
      course_code: 'fra_for_eng',
      text_normalized: 'bien means well',
      language: 'fra',
      role: 'pod_explainer',
      voice_id: 'xai_gfzdpspr5fdp',
    }]
    const result = await phase8.generatePodAudio({
      courseCode: 'fra_for_eng',
      text: 'bien means well',
      language: 'fra',
      ttsLanguageCue: 'auto',
      role: 'pod_explainer',
      voice: explainerVoice,
    })
    expect(result).toMatchObject({ id: 'EXPLAINER-1', reused: true })
    expect(state.ttsCalls).toHaveLength(0)
  })

  it('defaults the cue to the language, so callers that never had one are unchanged', async () => {
    await expect(phase8.generatePodAudio({
      courseCode: 'cym_n_for_eng',
      text: 'bore da',
      language: 'cym',
      role: 'target1',
      voice: { voice_id: 'cy-GB-NiaNeural', provider: 'azure' },
    })).rejects.toThrow()
    expect(state.ttsCalls).toHaveLength(1)
    // Azure config carries the voice name, not a language cue — the assertion
    // that matters is that the raw provider spelling survived untouched.
    expect(state.ttsCalls[0].config.voiceName).toBe('cy-GB-NiaNeural')
  })
})

// ─── the presentation voice ──────────────────────────────────────────────────

describe('resolvePresentationVoiceId — four paths, one spelling', () => {
  const withConfig = (known_lang, voice_config) => ({ known_lang, voice_config })

  // TOM'S RULING, 2026-09-03: the default English male voice is his CARTESIA
  // clone, estate-wide. The old assertions here are flipped deliberately —
  // they asserted the xAI clone, and that a stored xAI presentation voice won
  // over it. xAI is retired from selection, so neither can stand.
  it('returns the canonical Cartesia clone for an English-known course', () => {
    expect(presentationAuthor.resolvePresentationVoiceId(withConfig('eng', {})))
      .toBe('cartesia_8fef4d59-0a7e-4ad2-a261-6a3bb50734d2')
  })

  it('a stored xAI presentation voice no longer outranks the clone', () => {
    // deu_for_eng and fra_for_eng both carried Tom's own xAI clone here, so
    // honouring the stored value would have pinned them to the dead provider.
    expect(presentationAuthor.resolvePresentationVoiceId(
      withConfig('eng', { voices: { presentation: { provider: 'xai', voiceId: 'leo' } } })))
      .toBe('cartesia_8fef4d59-0a7e-4ad2-a261-6a3bb50734d2')
  })

  it('the constant matches the voice the language cast names', () => {
    // ONE VOICE, WRITTEN DOWN TWICE ON PURPOSE (see the comment on
    // ENG_PRESENTATION_VOICE). This test is the thing that stops the two
    // copies drifting: the id below is the voice_language_roles row
    // ('eng','m','phrase',rank 0) as applied on 2026-09-03.
    expect(presentationAuthor.ENG_PRESENTATION_VOICE)
      .toBe('cartesia_8fef4d59-0a7e-4ad2-a261-6a3bb50734d2')
  })

  it('spells the explicit-config and bare-config paths the same way', () => {
    const prefixed = presentationAuthor.resolvePresentationVoiceId(
      withConfig('cym', { voices: { presentation: { provider: 'azure', voiceId: 'cy-GB-NiaNeural' } } }))
    const bare = presentationAuthor.resolvePresentationVoiceId(
      withConfig('cym', { voices: { presentation: { voiceId: 'cy-GB-NiaNeural' } } }))
    // These two used to disagree — 'azure_cy-GB-NiaNeural' vs 'cy-GB-NiaNeural'
    // — which is one voice under two identities.
    expect(prefixed).toBe('azure_cy-GB-NiaNeural')
    expect(bare).toBe('azure_cy-GB-NiaNeural')
  })

  it('falls back to the known-role voice, canonically', () => {
    expect(presentationAuthor.resolvePresentationVoiceId(
      withConfig('cym', { voices: { known: { voiceId: 'cy-GB-AledNeural' } } })))
      .toBe('azure_cy-GB-AledNeural')
  })

  it('falls back to the default voice, canonically', () => {
    expect(presentationAuthor.resolvePresentationVoiceId(withConfig('cym', {})))
      .toBe('azure_en-GB-SoniaNeural')
  })

  it('throws rather than return a voice nobody can spell', () => {
    expect(() => presentationAuthor.resolvePresentationVoiceId(
      withConfig('cym', { voices: { presentation: { voiceId: 'mystery-clone' } } }))).toThrow()
  })
})
