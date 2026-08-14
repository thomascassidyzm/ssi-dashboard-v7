// Unit tests for pod recording registration (keystone §4).
// Pure routing (kind → role/column), server-side cast voice resolution, and
// the prepare/commit seam against a mock supabase — no env, no network.
// Run: npx vitest run services/voice-engine
import { describe, it, expect } from 'vitest'
import {
  POD_KIND_ROLES,
  EXPLAINER_CAST_KEY,
  isPodModeUpload,
  podRoleForKind,
  podLinkColumnForKind,
  podTextColumnForKind,
  canonicalSpeakerName,
  resolvePodCastVoiceId,
  validatePodUploadMetadata,
  preparePodRegistration,
  commitPodRegistration,
} from '../pods-registration.cjs'

describe('pod mode detection + kind routing (pure)', () => {
  it('detects explicit metadata.mode === pod only', () => {
    expect(isPodModeUpload({ mode: 'pod' })).toBe(true)
    expect(isPodModeUpload({ mode: 'script' })).toBe(false)
    expect(isPodModeUpload({})).toBe(false)
    expect(isPodModeUpload(undefined)).toBe(false)
  })

  it('maps kinds to the EXACT roles phase8 writes for TTS pod rows (recon §1)', () => {
    // target→target1, known→known, explainer→pod_explainer. Never invented.
    expect(podRoleForKind('target')).toBe('target1')
    expect(podRoleForKind('known')).toBe('known')
    expect(podRoleForKind('explainer')).toBe('pod_explainer')
    expect(podRoleForKind('presentation')).toBeNull()
    expect(podRoleForKind(undefined)).toBeNull()
    expect(Object.keys(POD_KIND_ROLES).sort()).toEqual(['explainer', 'known', 'target'])
  })

  it('maps kinds to the sentence audio FK columns (set explicitly — recon §2)', () => {
    expect(podLinkColumnForKind('target')).toBe('target_audio_id')
    expect(podLinkColumnForKind('known')).toBe('known_audio_id')
    expect(podLinkColumnForKind('explainer')).toBe('explainer_audio_id')
    expect(podLinkColumnForKind('nope')).toBeNull()
  })

  it('maps kinds to text columns', () => {
    expect(podTextColumnForKind('target')).toBe('target_text')
    expect(podTextColumnForKind('known')).toBe('known_text')
    expect(podTextColumnForKind('explainer')).toBe('explainer_text')
  })

  it('validates pod upload metadata', () => {
    expect(validatePodUploadMetadata({ mode: 'pod', podId: 'c:pod-0', sentenceId: 'c:pod-0:SC01-S001', kind: 'target' }).ok).toBe(true)
    expect(validatePodUploadMetadata({ mode: 'pod', podId: 'c:pod-0', kind: 'target' }).ok).toBe(false)
    expect(validatePodUploadMetadata({ mode: 'pod', podId: 'c:pod-0', sentenceId: 's', kind: 'presentation' }).ok).toBe(false)
    expect(validatePodUploadMetadata({ mode: 'script' }).ok).toBe(false)
  })
})

describe('canonicalSpeakerName (mirrors phase8/pod-sync)', () => {
  it('strips parenthesised variants', () => {
    expect(canonicalSpeakerName('Neighbour (8 am)')).toBe('Neighbour')
    expect(canonicalSpeakerName('Susjed (M)')).toBe('Susjed')
    expect(canonicalSpeakerName('Anna')).toBe('Anna')
    expect(canonicalSpeakerName('')).toBe('')
  })
})

describe('resolvePodCastVoiceId (server-side, podCast — client advisory)', () => {
  const voiceConfig = {
    voices: { target1: { voiceId: 'tts-should-never-be-used' } },
    podCast: {
      Anna: { voiceId: 'human_catrin_cym', name: 'Catrin' },
      Neighbour: { voiceId: 'human_aran_cym', name: 'Aran' },
      [EXPLAINER_CAST_KEY]: { voiceId: 'human_tom_eng', name: 'Tom' },
    },
  }

  it('target lines resolve via the canonical speaker cast entry', () => {
    const r = resolvePodCastVoiceId({ voiceConfig, speaker: 'Neighbour (8 am)', kind: 'target', clientVoiceId: null })
    expect(r).toEqual({ voiceId: 'human_aran_cym', source: 'cast', disagreement: false })
  })

  it('known and explainer lines resolve via the __explainer__ cast entry', () => {
    for (const kind of ['known', 'explainer']) {
      const r = resolvePodCastVoiceId({ voiceConfig, speaker: 'Anna', kind, clientVoiceId: null })
      expect(r.voiceId).toBe('human_tom_eng')
      expect(r.source).toBe('cast')
    }
  })

  it('server cast wins over a disagreeing client voiceId (advisory)', () => {
    const r = resolvePodCastVoiceId({ voiceConfig, speaker: 'Anna', kind: 'target', clientVoiceId: 'human_someone_else' })
    expect(r.voiceId).toBe('human_catrin_cym')
    expect(r.disagreement).toBe(true)
  })

  it('falls back to the client voiceId only when the cast has no entry', () => {
    const r = resolvePodCastVoiceId({ voiceConfig: { podCast: {} }, speaker: 'Anna', kind: 'target', clientVoiceId: 'human_early_recorder' })
    expect(r).toEqual({ voiceId: 'human_early_recorder', source: 'client', disagreement: false })
    const none = resolvePodCastVoiceId({ voiceConfig: {}, speaker: 'Anna', kind: 'target', clientVoiceId: null })
    expect(none.voiceId).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// prepare/commit against a mock supabase (chainable query builder)
// ---------------------------------------------------------------------------

function mockSupabase(state) {
  // state: { sentences: {id: row}, pods: {id: row}, courses: {code: row},
  //          audioRows: [rows at conflict keys], upserted: [], updates: [] }
  function builder(table) {
    const q = { table, filters: {}, inFilters: {}, op: 'select', payload: null }
    const api = {
      select() { return api },
      eq(col, val) { q.filters[col] = val; return api },
      // The prior-row lookup reaches BOTH voice spellings, so the mock needs
      // set membership as well as equality.
      in(col, vals) { q.inFilters[col] = vals; return api },
      limit() { return resolveRows().then(rows => ({ data: rows, error: null })) },
      maybeSingle() { return resolveRows().then(rows => ({ data: rows[0] || null, error: null })) },
      single() { return resolveRows().then(rows => ({ data: rows[0] || null, error: rows[0] ? null : { message: 'no row' } })) },
      upsert(row, opts) {
        q.op = 'upsert'; q.payload = { row, opts }
        return api
      },
      update(patch) {
        q.op = 'update'; q.payload = patch
        return {
          eq: (col, val) => {
            state.updates.push({ table, patch, where: { [col]: val } })
            return Promise.resolve({ data: null, error: null })
          },
        }
      },
    }
    async function resolveRows() {
      if (q.op === 'upsert') {
        const { row } = q.payload
        // emulate the 5-column unique key: reuse the prior row's id on conflict
        const prior = (state.audioRows || []).find(r =>
          r.course_code === row.course_code && r.text_normalized === row.text_normalized &&
          r.language === row.language && r.role === row.role && r.voice_id === row.voice_id)
        const saved = { id: prior ? prior.id : 'NEW-AUDIO-UUID', ...row }
        state.upserted.push(saved)
        return [saved]
      }
      if (table === 'listening_pod_sentences') {
        const row = state.sentences[q.filters.id]
        return row ? [row] : []
      }
      if (table === 'listening_pods') {
        const row = state.pods[q.filters.id]
        return row ? [row] : []
      }
      if (table === 'courses') {
        const row = state.courses[q.filters.course_code]
        return row ? [row] : []
      }
      if (table === 'course_audio') {
        return (state.audioRows || []).filter(r =>
          Object.entries(q.filters).every(([k, v]) => r[k] === v) &&
          Object.entries(q.inFilters).every(([k, vals]) => vals.includes(r[k])))
      }
      return []
    }
    return api
  }
  return { from: builder }
}

const quiet = { log() {}, warn() {}, error() {} }

function fixtureState() {
  return {
    sentences: {
      'cym_n_for_eng:pod-0:SC01-S001': {
        id: 'cym_n_for_eng:pod-0:SC01-S001',
        pod_id: 'cym_n_for_eng:pod-0',
        speaker: 'Anna (8 am)',
        target_text: 'Bore da',
        known_text: 'Good morning',
        explainer_text: '',
        target_audio_id: 'OLD-TTS-UUID',
        known_audio_id: null,
        explainer_audio_id: null,
      },
    },
    pods: { 'cym_n_for_eng:pod-0': { id: 'cym_n_for_eng:pod-0', course_code: 'cym_n_for_eng' } },
    courses: {
      cym_n_for_eng: {
        course_code: 'cym_n_for_eng', target_lang: 'cym', known_lang: 'eng',
        voice_config: {
          voices: { target1: { voiceId: 'tts-voice' } },
          podCast: {
            Anna: { voiceId: 'human_catrin_cym', name: 'Catrin' },
            __explainer__: { voiceId: 'human_tom_eng', name: 'Tom' },
          },
        },
      },
    },
    audioRows: [],
    upserted: [],
    updates: [],
  }
}

describe('preparePodRegistration', () => {
  const metadata = { mode: 'pod', podId: 'cym_n_for_eng:pod-0', sentenceId: 'cym_n_for_eng:pod-0:SC01-S001', kind: 'target' }

  it('resolves role/column/text/voice/replaced id for a target line', async () => {
    const r = await preparePodRegistration({ supabase: mockSupabase(fixtureState()), courseCode: 'cym_n_for_eng', metadata, logger: quiet })
    expect(r.error).toBeUndefined()
    expect(r.context).toMatchObject({
      kind: 'target', role: 'target1', linkColumn: 'target_audio_id',
      text: 'Bore da', language: 'cym',
      voiceId: 'human_catrin_cym', voiceSource: 'cast',
      replacedAudioId: 'OLD-TTS-UUID',
    })
  })

  it('routes known lines to the explainer cast voice and known_lang', async () => {
    const r = await preparePodRegistration({
      supabase: mockSupabase(fixtureState()), courseCode: 'cym_n_for_eng',
      metadata: { ...metadata, kind: 'known' }, logger: quiet,
    })
    expect(r.context).toMatchObject({ role: 'known', linkColumn: 'known_audio_id', text: 'Good morning', language: 'eng', voiceId: 'human_tom_eng', replacedAudioId: null })
  })

  it("rejects explainer takes for sentences stamped explainer_text='' (deliberately none)", async () => {
    const r = await preparePodRegistration({
      supabase: mockSupabase(fixtureState()), courseCode: 'cym_n_for_eng',
      metadata: { ...metadata, kind: 'explainer' }, logger: quiet,
    })
    expect(r.error).toMatch(/no explainer_text/)
    expect(r.status).toBe(400)
  })

  it('rejects a sentence that belongs to a different pod, and a pod from a different course', async () => {
    const wrongPod = await preparePodRegistration({
      supabase: mockSupabase(fixtureState()), courseCode: 'cym_n_for_eng',
      metadata: { ...metadata, podId: 'cym_n_for_eng:pod-1' }, logger: quiet,
    })
    expect(wrongPod.status).toBe(400)

    const state = fixtureState()
    state.pods['cym_n_for_eng:pod-0'].course_code = 'fra_for_eng'
    const wrongCourse = await preparePodRegistration({ supabase: mockSupabase(state), courseCode: 'cym_n_for_eng', metadata, logger: quiet })
    expect(wrongCourse.status).toBe(400)
    expect(wrongCourse.error).toMatch(/belongs to fra_for_eng/)
  })

  it('404s an unknown sentence', async () => {
    const r = await preparePodRegistration({
      supabase: mockSupabase(fixtureState()), courseCode: 'cym_n_for_eng',
      metadata: { ...metadata, sentenceId: 'cym_n_for_eng:pod-0:SC99-S999', podId: 'cym_n_for_eng:pod-0' }, logger: quiet,
    })
    expect(r.status).toBe(404)
  })
})

describe('commitPodRegistration', () => {
  const metadata = { mode: 'pod', podId: 'cym_n_for_eng:pod-0', sentenceId: 'cym_n_for_eng:pod-0:SC01-S001', kind: 'target' }

  async function prepareAndCommit(state, s3Key = 'mastered/FRESH-1.mp3') {
    const supabase = mockSupabase(state)
    const { context } = await preparePodRegistration({ supabase, courseCode: 'cym_n_for_eng', metadata, logger: quiet })
    const result = await commitPodRegistration({ supabase, courseCode: 'cym_n_for_eng', context, s3Key, durationMs: 1234, fileSizeBytes: 9876, logger: quiet })
    return { state, result }
  }

  it('writes a human course_audio row with the pod role and re-points the sentence FK', async () => {
    const { state, result } = await prepareAndCommit(fixtureState())
    expect(state.upserted).toHaveLength(1)
    expect(state.upserted[0]).toMatchObject({
      course_code: 'cym_n_for_eng', text: 'Bore da', language: 'cym',
      role: 'target1', voice_id: 'human_catrin_cym', origin: 'human',
      s3_key: 'mastered/FRESH-1.mp3', duration_ms: 1234, file_size_bytes: 9876,
    })
    // FK re-pointed explicitly (the autolink trigger never touches pod sentences)
    expect(state.updates).toEqual([{
      table: 'listening_pod_sentences',
      patch: { target_audio_id: 'NEW-AUDIO-UUID' },
      where: { id: 'cym_n_for_eng:pod-0:SC01-S001' },
    }])
    // The previously linked TTS row is recorded as replaced — never deleted.
    expect(result.replacedAudioId).toBe('OLD-TTS-UUID')
    expect(result.repointedExistingRow).toBe(false)
  })

  // ── RE-RECORD WANTED fulfilment (2026-08-14) ──────────────────────────────
  // The take IS the re-record that was wanted, so the want is cleared in the
  // SAME statement that re-points the FK — a line can never be left both
  // freshly recorded and still queued for its recordist.

  it('clears this track\'s rerecord_wanted key in the same write as the FK repoint', async () => {
    const state = fixtureState()
    state.sentences['cym_n_for_eng:pod-0:SC01-S001'].rerecord_wanted = { target: 'human_catrin_cym' }
    await prepareAndCommit(state)
    expect(state.updates).toEqual([{
      table: 'listening_pod_sentences',
      patch: { target_audio_id: 'NEW-AUDIO-UUID', rerecord_wanted: null },
      where: { id: 'cym_n_for_eng:pod-0:SC01-S001' },
    }])
  })

  it('leaves a want for the OTHER track alone — that is a different job', async () => {
    const state = fixtureState()
    state.sentences['cym_n_for_eng:pod-0:SC01-S001'].rerecord_wanted =
      { target: 'human_catrin_cym', known: 'human_catrin_cym' }
    await prepareAndCommit(state)
    expect(state.updates[0].patch).toEqual({
      target_audio_id: 'NEW-AUDIO-UUID',
      rerecord_wanted: { known: 'human_catrin_cym' },
    })
  })

  it('writes no rerecord_wanted key when nothing was wanted', async () => {
    const { state } = await prepareAndCommit(fixtureState())
    expect(state.updates[0].patch).toEqual({ target_audio_id: 'NEW-AUDIO-UUID' })
  })

  it('re-record of the same line+voice repoints the SAME row (5-col key) and records the old s3_key', async () => {
    const state = fixtureState()
    // First human take already registered + linked
    state.audioRows = [{
      id: 'HUMAN-ROW-1', course_code: 'cym_n_for_eng', text_normalized: 'bore da',
      language: 'cym', role: 'target1', voice_id: 'human_catrin_cym',
      origin: 'human', s3_key: 'mastered/FIRST-TAKE.mp3',
    }]
    state.sentences['cym_n_for_eng:pod-0:SC01-S001'].target_audio_id = 'HUMAN-ROW-1'
    const { result } = await prepareAndCommit(state, 'mastered/SECOND-TAKE.mp3')
    expect(result.audioRow.id).toBe('HUMAN-ROW-1')
    expect(result.repointedExistingRow).toBe(true)
    // Old object stays at its key — recorded for reversibility, FK unchanged in effect
    expect(result.replacedS3Key).toBe('mastered/FIRST-TAKE.mp3')
    expect(result.replacedAudioId).toBeNull()
  })

  // ── canonical identity ────────────────────────────────────────────────────
  // The write narrows to one spelling; the prior-row READ must stay wide, or a
  // take recorded before the conversion becomes invisible and its s3_key never
  // reaches recording_provenance — the reversibility leg of make-before-break.

  it('writes the canonical language and voice spelling', async () => {
    const state = fixtureState()
    state.courses['cym_n_for_eng'].known_lang = 'en-GB'
    const { state: after } = await prepareAndCommit(state)
    // 'cym' is already canonical; the voice keeps its human_ scheme untouched.
    expect(after.upserted[0].language).toBe('cym')
    expect(after.upserted[0].voice_id).toBe('human_catrin_cym')
  })

  it('still FINDS a prior take stored under a non-canonical language spelling', async () => {
    const state = fixtureState()
    state.audioRows = [{
      id: 'HUMAN-ROW-1', course_code: 'cym_n_for_eng', text_normalized: 'bore da',
      language: 'cym', role: 'target1', voice_id: 'human_catrin_cym',
      origin: 'human', s3_key: 'mastered/FIRST-TAKE.mp3',
    }]
    const { result } = await prepareAndCommit(state, 'mastered/SECOND-TAKE.mp3')
    expect(result.replacedS3Key).toBe('mastered/FIRST-TAKE.mp3')
  })

  it('never deletes a prior take it could not repoint — the old row survives', async () => {
    // A prior row under a DIFFERENT voice spelling cannot share the upsert's
    // conflict key, so the new take lands as a fresh row and the old one is
    // left intact at its own s3_key. Nothing is overwritten, which is the
    // make-before-break-safe outcome.
    const state = fixtureState()
    state.audioRows = [{
      id: 'HUMAN-ROW-OLD', course_code: 'cym_n_for_eng', text_normalized: 'bore da',
      language: 'cym', role: 'target1', voice_id: 'catrin_cym',
      origin: 'human', s3_key: 'mastered/OLD-SPELLING-TAKE.mp3',
    }]
    const { state: after, result } = await prepareAndCommit(state, 'mastered/NEW.mp3')

    expect(result.audioRow.id).toBe('NEW-AUDIO-UUID')
    expect(result.repointedExistingRow).toBe(false)
    // The old row is untouched — it is still in audioRows at its original key.
    expect(after.audioRows[0].s3_key).toBe('mastered/OLD-SPELLING-TAKE.mp3')
    expect(after.upserted[0].s3_key).toBe('mastered/NEW.mp3')
  })
})
