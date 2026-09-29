/**
 * NAMED VOICES IN THE CLIP LIBRARY (job #703).
 *
 * Pins the four ways a clip used to be invisible to public.clip_index, and the
 * one rule that stops the fix guessing:
 *   1. a bare xAI id the voices table names            → filed as xai_<id>
 *   2. an artist's old spelling (policy aliases)       → filed under the artist
 *   3. a legacy take with an attribution row           → filed under the artist
 *   4. a gender-expanded clip that says its expansion  → filed under the words it says
 *   ·  a legacy take NOBODY has named                  → stays unindexed, counted "awaiting-name"
 * No network, no DB. Run: npx vitest run services/named-voices.test.cjs
 */
import { describe, it, expect } from 'vitest'
const clipIndex = require('./shared/clip-index.cjs')
const { buildVoiceResolver, whyUnnamed } = require('./shared/named-voices.cjs')

const row = (o) => ({ id: o.id, course_code: o.course || 'cym_n_for_eng', text: o.text || 'dw i isio', language: o.language || 'cym', role: o.role || 'target1',
  voice_id: o.voice, s3_key: 'mastered/X.mp3', origin: o.origin || 'tts', veracity_pass: null })
const courseOf = code => ({ course_code: code, known_lang: 'eng', target_lang: code.startsWith('cym') ? 'cym' : 'deu' })

const POLICY = [{ language: 'cym', voices: {
  f: { name: 'Catrin', voiceId: 'human_catrinlliar_cym_n', aliases: ['catrin_human', 'human_catrinv2_cym_n'] },
  m: { name: 'Aran', voiceId: 'human_aran_cym_n', aliases: ['Aran', 'human_aran_cym_n_2'] },
} }]
const VOICES = [{ voice_id: 'b1a7441b97a1', tts_engine: 'xai' }, { voice_id: 'azure_x', tts_engine: 'azure' }]

describe('named voices reach the index', () => {
  it('PRE-FIX behaviour: without resolvers all four kinds are skipped as voice-unnamed', () => {
    for (const v of ['b1a7441b97a1', 'catrin_human', 'legacy_import']) {
      expect(clipIndex.indexEntryFor(row({ id: 'a', voice: v, origin: v === 'b1a7441b97a1' ? 'tts' : 'human' }), 't', courseOf).skip).toBe('voice-unnamed')
    }
  })

  it('a bare xAI id is filed under its canonical name, from the voices table', () => {
    const r = buildVoiceResolver({ voices: VOICES, policyRows: POLICY })
    const e = clipIndex.indexEntryFor(row({ id: 'a', voice: 'b1a7441b97a1', course: 'deu_for_jpn', language: 'deu' }), 't', courseOf, r)
    expect(e.voice_id).toBe('xai_b1a7441b97a1')
  })

  it('an id the voices table does NOT know is not guessed at', () => {
    const r = buildVoiceResolver({ voices: VOICES, policyRows: POLICY })
    expect(clipIndex.indexEntryFor(row({ id: 'a', voice: 'ffffffffffff' }), 't', courseOf, r).skip).toBe('voice-unnamed')
  })

  it("an artist's old spelling is filed under the artist, in the artist's language key", () => {
    const r = buildVoiceResolver({ voices: VOICES, policyRows: POLICY })
    const e = clipIndex.indexEntryFor(row({ id: 'a', voice: 'catrin_human', origin: 'human', course: 'cym_anthem_for_jpn' }), 't', c => c === 'cym_anthem_for_jpn' ? { course_code: c, known_lang: 'jpn', target_lang: 'cym' } : null, r)
    expect(e.voice_id).toBe('human_catrinlliar_cym_n')
    expect(e.origin).toBe('human')
  })

  it('a legacy take is filed under the artist only when an attribution row says so', () => {
    const legacy = row({ id: 'L1', voice: 'legacy_import', origin: 'human' })
    const none = buildVoiceResolver({ voices: VOICES, policyRows: POLICY })
    expect(clipIndex.indexEntryFor(legacy, 't', courseOf, none).skip).toBe('voice-unnamed')
    expect(whyUnnamed(legacy)).toBe('awaiting-name')
    const named = buildVoiceResolver({ voices: VOICES, policyRows: POLICY, attributions: new Map([['L1', 'human_aran_cym_n']]) })
    expect(clipIndex.indexEntryFor(legacy, 't', courseOf, named).voice_id).toBe('human_aran_cym_n')
  })

  it('a clip that says its expansion is filed under the words it says; one that says its label is not moved', () => {
    const says = row({ id: 'G1', voice: 'azure_x', course: 'deu_for_eng', language: 'deu', text: 'ich bin müde' })
    const r = buildVoiceResolver({ voices: VOICES, policyRows: POLICY, spoken: new Map([['G1', 'ich bin müde (f)'.replace(' (f)', '')], ['G2', 'sie ist müde']]) })
    const expanded = buildVoiceResolver({ voices: VOICES, policyRows: POLICY, spoken: new Map([['G1', 'ich bin müdee']]) })
    expect(clipIndex.indexEntryFor(says, 't', courseOf, expanded).text_key).toBe('ich bin müdee')
    expect(clipIndex.indexEntryFor(says, 't', courseOf, r).text_key).toBe('ich bin müde')
    expect(clipIndex.indexEntryFor(row({ id: 'G3', voice: 'azure_x', language: 'deu', text: 'ich bin müde' }), 't', courseOf, expanded).text_key).toBe('ich bin müde')
  })

  it('a machine voice nothing names is not an "awaiting-name" person', () => {
    expect(whyUnnamed(row({ id: 'a', voice: 'EXAVITQu4vr4xnSDxMaL' }))).toBe('not-a-voice')
    expect(whyUnnamed(row({ id: 'a', voice: 'legacy_import', origin: 'tts' }))).toBe('not-a-voice')
  })
})

describe('a gendered clip is re-filed only on an affirmative hearing', () => {
  // the whisper-checked cases of job #703: Italian rows re-rendered after their expansion still SAY the label
  const { judgeHeard } = require('../tools/voices/reconcile-library.cjs')
  const { characterErrorRate, normalise } = require('./audio-veracity.cjs')
  const judge = (heard, label, expansion) => judgeHeard(heard, label, expansion, characterErrorRate, normalise)
  it('hears the expansion → moves', () => {
    expect(judge('Htijela bih razgovarati sa svima ostalima.', 'htio bih razgovarati sa svima ostalima', 'htjela bih razgovarati sa svima ostalima')).toBe('says-expansion')
    expect(judge('I thought she felt like talking.', 'I thought he felt like talking', 'I thought she felt like talking')).toBe('says-expansion')
  })
  it('hears the label (Italian re-render that bypassed the gender map) → stays where it is', () => {
    expect(judge('Non voglio sentirmi nervoso.', 'non voglio sentirmi nervoso', 'non voglio sentirmi nervosa')).toBe('says-label')
  })
  it('cannot tell (one letter apart, or noise) → undecided, filed under the label as before', () => {
    expect(judge('bla bla bla bla', 'non voglio sentirmi nervoso', 'non voglio sentirmi nervosa')).toBe('undecided')
  })
})

describe('the write side files a clip under the same identity as the reconcile', () => {
  const { supabaseResolversFor } = require('./shared/named-voices.cjs')
  // a tiny stand-in for the supabase client: from(table).select().limit()/in() resolve to rows
  const stub = (tables, fail = null) => ({
    from: table => {
      const q = { _rows: tables[table] || [] }
      q.select = () => q
      q.limit = () => Promise.resolve(fail ? { error: { message: fail } } : { data: q._rows })
      q.in = (_col, ids) => Promise.resolve({ data: q._rows.filter(r => ids.includes(r.audio_id)) })
      q.then = (res, rej) => Promise.resolve(fail ? { error: { message: fail } } : { data: q._rows }).then(res, rej)
      return q
    },
  })
  const tables = {
    voices: [{ voice_id: 'b1a7441b97a1', tts_engine: 'xai' }],
    language_recording_policy: POLICY,
    human_clip_attribution: [{ audio_id: 'L1', voice_id: 'human_aran_cym_n' }],
    clip_spoken_text: [{ audio_id: 'G1', spoken_text: 'ich bin müdee' }],
  }
  it('resolves attributed takes, bare ids and spoken words for the rows in hand', async () => {
    const legacy = row({ id: 'L1', voice: 'legacy_import', origin: 'human' })
    const gendered = row({ id: 'G1', voice: 'azure_x', language: 'deu', course: 'deu_for_eng', text: 'ich bin müde' })
    const r = await supabaseResolversFor(stub(tables), { log: { warn() {} } })([legacy, gendered])
    expect(clipIndex.indexEntryFor(legacy, 't', courseOf, r).voice_id).toBe('human_aran_cym_n')
    expect(clipIndex.indexEntryFor(gendered, 't', courseOf, r).text_key).toBe('ich bin müdee')
  })
  it('an unreadable table means the plain identity it always used, never a guess', async () => {
    const r = await supabaseResolversFor(stub(tables, 'boom'), { log: { warn() {} } })([row({ id: 'L1', voice: 'legacy_import', origin: 'human' })])
    expect(r).toBeNull()
  })
})
