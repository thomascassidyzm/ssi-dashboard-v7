// Tests for services/pod-stage-draft.cjs — the stage-draft door (job #794).
import { describe, it, expect } from 'vitest'

const { parseStageDraftRequest, planStageDraft } = require('./pod-stage-draft.cjs')

const MIRROR = 'cym_n_for_eng:health'
const mirrorPod = {
  id: MIRROR, pod_type: 'choice', title: 'Health — ward and surgery', scene: null, difficulty: null,
  speakers: {
    'Nurse Siân': { gender: 'f', known: { name: 'Catrin', voice_id: 'human_catrinlliar_cym_n' }, target: { name: 'Catrin', voice_id: 'human_catrinlliar_cym_n' } },
    'Wil Hughes': { gender: 'm', known: { name: 'Aran', voice_id: 'human_aran_cym_n' }, target: { name: 'Aran', voice_id: 'human_aran_cym_n' } },
  },
}
const mirrorSentences = [
  { id: `${MIRROR}:SC01-F01-S02`, scene_number: 1, sentence_number: 2, global_order: 2, beat_label: 'b', speaker: 'Wil Hughes', variant_key: 'F01', glue_to_next: true, jump_in: null, target_audio_id: 'aaa' },
  { id: `${MIRROR}:SC01-F01-S01`, scene_number: 1, sentence_number: 1, global_order: 1, beat_label: 'b', speaker: 'Nurse Siân', glue_to_next: false, jump_in: true, target_audio_id: 'bbb' },
]
const body = (over = {}) => ({
  mirror: MIRROR,
  lines: [
    { id: 'SC01-F01-S01', target_text: "Dw i'n dysgu Cymraeg ar hyn o bryd.", known_text: "I'm learning Welsh." },
    { id: 'SC01-F01-S02', target_text: 'Chwarae teg i chi!', known_text: 'Chwarae teg i chi!' },
  ],
  ...over,
})
const facts = (over = {}) => ({ existingPod: null, mirrorPod, mirrorSentences, podCast: {}, by: 'kai-794', ...over })
const plan = (b = body(), f = facts()) => planStageDraft(parseStageDraftRequest('cym_s_for_eng', 'health', b), f)

describe('parseStageDraftRequest', () => {
  it('is a dry run unless apply is literally true', () => {
    expect(parseStageDraftRequest('cym_s_for_eng', 'health', body()).apply).toBe(false)
    expect(parseStageDraftRequest('cym_s_for_eng', 'health', body({ apply: true })).apply).toBe(true)
    expect(parseStageDraftRequest('cym_s_for_eng', 'health', body({ apply: 'yes' })).error).toMatch(/apply/)
  })
  it('REFUSES every slug the learner app serves', () => {
    for (const s of ['pod-1', 'pod-0', 'method-pod']) {
      expect(parseStageDraftRequest('cym_s_for_eng', s, body()).error).toMatch(/serves that slug/)
    }
  })
  it('refuses an empty target line rather than staging a blank', () => {
    const b = body(); b.lines[1].target_text = '  '
    expect(parseStageDraftRequest('cym_s_for_eng', 'health', b).error).toMatch(/SC01-F01-S02.*empty/)
  })
  it('requires a mirror pod id', () => {
    expect(parseStageDraftRequest('cym_s_for_eng', 'health', body({ mirror: '' })).error).toMatch(/mirror/)
  })
})

describe('planStageDraft', () => {
  it('creates the pod HELD (the column defaults to live) and as a topic pod', () => {
    const p = plan()
    expect(p.pod.visibility).toBe('held')
    expect(p.pod.pod_type).toBe('choice')
    expect(p.pod.id).toBe('cym_s_for_eng:health')
    expect(p.pod.required_role).toBeNull()
  })
  it('marks EVERY line a draft and carries NO audio, even where the mirror has audio', () => {
    const p = plan()
    expect(p.sentences).toHaveLength(2)
    for (const s of p.sentences) {
      expect(s.target_text_draft).toBe(true)
      expect(s.target_audio_id).toBeNull()
      expect(s.known_audio_id).toBeNull()
    }
  })
  it('copies structure from the mirror line with the same tail and text from the request, in order', () => {
    const [a, b] = plan().sentences
    expect(a).toMatchObject({ id: 'cym_s_for_eng:health:SC01-F01-S01', pod_id: 'cym_s_for_eng:health', global_order: 1, speaker: 'Nurse Siân', jump_in: true, glue_to_next: false, target_text: "Dw i'n dysgu Cymraeg ar hyn o bryd." })
    expect(a.variant_key).toBeNull()
    expect(b).toMatchObject({ global_order: 2, speaker: 'Wil Hughes', variant_key: 'F01', variant_key: 'F01', glue_to_next: true, known_text: 'Chwarae teg i chi!' })
  })
  it('keeps role names and genders but casts NO voice', () => {
    const { speakers } = plan().pod
    expect(speakers).toEqual({ 'Nurse Siân': { gender: 'f' }, 'Wil Hughes': { gender: 'm' } })
    expect(JSON.stringify(speakers)).not.toMatch(/voice_id|Catrin|Aran/)
  })
  it('REFUSES when a staged speaker is already cast on the course — draft lines must not reach a booth', () => {
    const p = plan(body(), facts({ podCast: { 'Wil Hughes': { voiceId: 'human_dan_cym_s' } } }))
    expect(p.error).toMatch(/Wil Hughes.*already cast.*booth/)
  })
  it('never overwrites an existing pod', () => {
    expect(plan(body(), facts({ existingPod: { id: 'cym_s_for_eng:health' } })).error).toMatch(/already exists/)
  })
  it('requires the lines to cover the mirror exactly', () => {
    const short = body(); short.lines.pop()
    expect(plan(short).error).toMatch(/not supplied.*SC01-F01-S02/)
    const extra = body(); extra.lines.push({ id: 'SC99', target_text: 'x', known_text: 'y' })
    expect(plan(extra).error).toMatch(/no mirror line.*SC99/)
    const dup = body(); dup.lines.push({ ...dup.lines[0] })
    expect(plan(dup).error).toMatch(/duplicate/)
  })
  it('refuses a missing mirror and a core mirror', () => {
    expect(plan(body(), facts({ mirrorPod: null })).error).toMatch(/not found/)
    expect(plan(body(), facts({ mirrorPod: { ...mirrorPod, pod_type: 'core' } })).error).toMatch(/core/)
  })
})
