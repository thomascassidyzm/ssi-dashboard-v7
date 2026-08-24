/**
 * Unit tests: per-voice recording-plan construction (keystone §2) —
 * cue lines, scene boundaries, glue grouping, known-language queue, estimates.
 * Run: npx vitest run services/voice-engine
 */

import { describe, it, expect } from 'vitest'

const {
  buildRecordingPlan,
  groupGlueItems,
  sceneTitleFor,
  estimateSeconds,
} = require('../pods-plan.cjs')

// ── Fixture: one course, two pods, cast of two humans + the __explainer__
// (known-language) voice. explainer_text still sits on the fixture rows on
// purpose: the plan must IGNORE it, and a fixture with none could not show that.

const PODS = [
  {
    id: 'c:pod-0', slug: 'pod-0', title: 'First steps', pod_order: 0,
    metadata: { sections: [
      { number: 1, title: 'At the café', label: 'SC01' },
      { number: 2, title: 'The neighbour', label: 'SC02' },
    ] },
  },
  { id: 'c:pod-1', slug: 'pod-1', title: 'Out and about', pod_order: 1, metadata: {} },
]

function s(id, podId, scene, order, speaker, target, known, extra = {}) {
  return {
    id, pod_id: podId, scene_number: scene, global_order: order, speaker,
    target_text: target, known_text: known, explainer_text: null, glue_to_next: false,
    ...extra,
  }
}

const SENTENCES = [
  // pod-0 scene 1: Anna / Waiter / Anna / Waiter
  s('p0-1', 'c:pod-0', 1, 1, 'Anna', 'Bore da', 'Good morning', { explainer_text: 'Bore da is your all-day opener…' }),
  s('p0-2', 'c:pod-0', 1, 2, 'Waiter (M)', 'Croeso', 'Welcome'),
  s('p0-3', 'c:pod-0', 1, 3, 'Anna', 'Coffi, os gwelwch yn dda', 'Coffee, please'),
  s('p0-4', 'c:pod-0', 1, 4, 'Waiter (M)', 'Wrth gwrs', 'Of course', { explainer_text: '' }),
  // pod-0 scene 2: Neighbour glue chain (two rows = ONE utterance) then Anna
  s('p0-5', 'c:pod-0', 2, 5, 'Neighbour (8 am)', 'Helo —', 'Hello —', { glue_to_next: true }),
  s('p0-6', 'c:pod-0', 2, 6, 'Neighbour (8 am)', 'sut mae?', 'how are you?'),
  s('p0-7', 'c:pod-0', 2, 7, 'Anna', 'Da iawn, diolch', 'Very well, thanks'),
  // pod-1 scene 1
  s('p1-1', 'c:pod-1', 1, 1, 'Anna', 'Ble mae’r orsaf?', 'Where is the station?'),
  s('p1-2', 'c:pod-1', 1, 2, 'Waiter (M)', 'Dilynwch fi', 'Follow me'),
]

const POD_CAST = {
  'Anna': { voiceId: 'human_catrin_cym', name: 'Catrin', email: 'catrin@example.com' },
  'Waiter': { voiceId: 'human_aran_cym', name: 'Aran' },
  'Neighbour': { voiceId: 'human_aran_cym', name: 'Aran' },
  '__explainer__': { voiceId: 'human_tom_eng', name: 'Tom' },
}

function plan(voiceId, cueCount) {
  return buildRecordingPlan({
    pods: PODS, sentences: SENTENCES, podCast: POD_CAST, voiceId,
    ...(cueCount != null ? { cueCount } : {}),
  })
}

// ── Queue membership + order ─────────────────────────────────────────────────

describe('buildRecordingPlan — queue', () => {
  it('contains exactly the cast voice’s lines, ordered pod → scene → global_order', () => {
    const p = plan('human_catrin_cym')
    expect(p.items.map(i => i.sentenceId)).toEqual(['p0-1', 'p0-3', 'p0-7', 'p1-1'])
    expect(p.items.every(i => i.kind === 'target')).toBe(true)
    expect(p.castSpeakers).toEqual(['Anna'])
    expect(p.counts).toEqual({ target: 4, known: 0, total: 4 })
  })

  it('variants collapse: Neighbour (8 am) lines land on the Neighbour cast entry', () => {
    const p = plan('human_aran_cym')
    expect(p.items.map(i => i.sentenceId)).toEqual(['p0-2', 'p0-4', 'p0-5', 'p1-2'])
    expect(p.castSpeakers.sort()).toEqual(['Neighbour', 'Waiter'])
  })

  it('an uncast voice gets an empty queue, never an error', () => {
    const p = plan('human_nobody_cym')
    expect(p.items).toEqual([])
    expect(p.counts.total).toBe(0)
  })
})

// ── Cues ─────────────────────────────────────────────────────────────────────

describe('buildRecordingPlan — cues', () => {
  it('carries the preceding 2 dialogue lines with speaker + target + known gloss', () => {
    const p = plan('human_catrin_cym')
    const annaThird = p.items.find(i => i.sentenceId === 'p0-3')
    expect(annaThird.cues).toEqual([
      { speaker: 'Anna', target: 'Bore da', known: 'Good morning', draft: false },
      { speaker: 'Waiter', target: 'Croeso', known: 'Welcome', draft: false },
    ])
  })

  it('first line of a scene has no cues (context never bleeds across scenes)', () => {
    const p = plan('human_aran_cym')
    const neighbour = p.items.find(i => i.sentenceId === 'p0-5')
    expect(neighbour.cues).toEqual([])   // scene 2 opens with the Neighbour
    const pod1 = p.items.find(i => i.sentenceId === 'p1-2')
    expect(pod1.cues.length).toBe(1)     // only pod-1 scene 1's opening line
    expect(pod1.cues[0].speaker).toBe('Anna')
  })

  it('respects a custom cue count', () => {
    const p = plan('human_aran_cym', 1)
    const w2 = p.items.find(i => i.sentenceId === 'p0-4')
    expect(w2.cues.length).toBe(1)
    expect(w2.cues[0].target).toBe('Coffi, os gwelwch yn dda')
  })
})

// ── Scene boundaries ─────────────────────────────────────────────────────────

describe('buildRecordingPlan — scene boundaries', () => {
  it('marks sceneStart with the section title on boundaries of THIS queue', () => {
    const p = plan('human_catrin_cym')
    expect(p.items.map(i => [i.sceneStart, i.scene.title])).toEqual([
      [true, 'At the café'],
      [false, 'At the café'],
      [true, 'The neighbour'],
      [true, 'Scene 1'],          // pod-1 has no sections → fallback title
    ])
  })

  it('sceneTitleFor falls back to "Scene N" without metadata', () => {
    expect(sceneTitleFor(PODS[0], 2)).toBe('The neighbour')
    expect(sceneTitleFor(PODS[1], 3)).toBe('Scene 3')
    expect(sceneTitleFor(null, 1)).toBe('Scene 1')
  })
})

// ── Glue grouping ────────────────────────────────────────────────────────────

describe('buildRecordingPlan — glue_to_next', () => {
  it('glued rows form ONE recording item with joined text + all sentence ids', () => {
    const p = plan('human_aran_cym')
    const glued = p.items.find(i => i.sentenceId === 'p0-5')
    expect(glued.sentenceIds).toEqual(['p0-5', 'p0-6'])
    expect(glued.line).toBe('Helo — sut mae?')
    expect(glued.knownGloss).toBe('Hello — how are you?')
  })

  it('groupGlueItems breaks a chain on speaker change (defensive)', () => {
    const rows = [
      s('x1', 'p', 1, 1, 'A', 't1', 'k1', { glue_to_next: true }),
      s('x2', 'p', 1, 2, 'B', 't2', 'k2'),
    ]
    const items = groupGlueItems(rows)
    expect(items.length).toBe(2)
  })
})

// ── The __explainer__ (known-language) queue ─────────────────────────────────

describe('buildRecordingPlan — known-language queue (__explainer__)', () => {
  // FLIPPED 2026-08-24 (was 'carries every known line + every non-empty
  // explainer_text'): explainer narration is deprecated, so the __explainer__
  // voice's sitting is the known-language lines and nothing else. p0-1 still
  // carries explainer prose in the fixture and must produce NO item for it.
  it('carries every known line and NO explainer_text item', () => {
    const p = plan('human_tom_eng')
    expect(p.isExplainer).toBe(true)
    const known = p.items.filter(i => i.kind === 'known')
    // 8 dialogue items (glue chain = one) each with known text
    expect(known.length).toBe(8)
    expect(known.find(i => i.sentenceId === 'p0-5').line).toBe('Hello — how are you?')
    expect(p.items.some(i => i.kind === 'explainer')).toBe(false)
    expect(p.counts).toEqual({ target: 0, known: 8, total: 8 })
  })

  it('a voice cast as BOTH a character and the known voice gets both queues', () => {
    const cast = { ...POD_CAST, '__explainer__': { voiceId: 'human_catrin_cym', name: 'Catrin' } }
    const p = buildRecordingPlan({ pods: PODS, sentences: SENTENCES, podCast: cast, voiceId: 'human_catrin_cym' })
    expect(p.counts.target).toBe(4)
    expect(p.counts.known).toBe(8)
  })
})

// ── Estimates ────────────────────────────────────────────────────────────────

describe('buildRecordingPlan — estimated minutes', () => {
  it('every item carries seconds; plan totals to minutes', () => {
    const p = plan('human_catrin_cym')
    for (const item of p.items) expect(item.estimatedSeconds).toBeGreaterThan(0)
    const total = p.items.reduce((a, i) => a + i.estimatedSeconds, 0)
    expect(p.estimatedMinutes).toBeCloseTo(total / 60, 1)
    expect(estimateSeconds('')).toBe(3) // overhead only
  })
})

describe('buildRecordingPlan — guards', () => {
  it('requires a voiceId', () => {
    expect(() => buildRecordingPlan({ pods: PODS, sentences: SENTENCES, podCast: POD_CAST, voiceId: null }))
      .toThrow(/voiceId/)
  })
})

// ── DRAFT marker (Tom 2026-08-06: "opus drafts, Aran proofreads") ────────────
// A machine-written target line rides in target_text so the record room renders
// it and a proofreader can amend it inline. target_text_draft is what stops a
// recorder reading it as the course's finished words — so the plan MUST carry
// it, on the item and on the cue trail.
describe('buildRecordingPlan — DRAFT target text', () => {
  const DRAFTED = SENTENCES.map(r =>
    r.id === 'p0-2' ? { ...r, target_text_draft: true } : r)

  const draftPlan = (voiceId) => buildRecordingPlan({
    pods: PODS, sentences: DRAFTED, podCast: POD_CAST, voiceId,
  })

  it('marks the drafted line and only the drafted line', () => {
    const items = draftPlan('human_aran_cym').items.filter(i => i.kind === 'target')
    const drafted = items.filter(i => i.draft)
    expect(drafted.map(i => i.sentenceId)).toEqual(['p0-2'])
    expect(items.every(i => i.draft === (i.sentenceId === 'p0-2'))).toBe(true)
  })

  it('undrafted rows report draft:false, never undefined', () => {
    for (const it of draftPlan('human_catrin_cym').items) expect(it.draft ?? false).toBe(false)
  })

  it('a glued chain reads as draft if ANY of its rows is one', () => {
    const glued = SENTENCES.map(r => r.id === 'p0-6' ? { ...r, target_text_draft: true } : r)
    const item = buildRecordingPlan({ pods: PODS, sentences: glued, podCast: POD_CAST, voiceId: 'human_aran_cym' })
      .items.find(i => i.sentenceId === 'p0-5')
    expect(item.sentenceIds).toEqual(['p0-5', 'p0-6'])
    expect(item.draft).toBe(true)
  })

  it('cue lines carry the marker too — context is unproofread as well', () => {
    // p0-3 (Catrin) is cued by p0-2, the drafted Waiter line.
    const cues = draftPlan('human_catrin_cym').items.find(i => i.sentenceId === 'p0-3').cues
    const cue = cues.find(c => c.target === 'Croeso')
    expect(cue.draft).toBe(true)
    expect(cues.find(c => c.target === 'Bore da').draft).toBe(false)
  })
})

// ── RE-RECORD WANTED (make-before-break, 2026-08-14) ─────────────────────────
// listening_pod_sentences.rerecord_wanted = {"target":"<voiceId>","known":"<voiceId>"}
// routes a line to a named recordist WITHOUT unlinking its audio. Before this,
// the only lever was nulling {kind}_audio_id — which for the 81 clipped-but-real
// cym_n_for_eng takes meant taking playable audio off the learner's path first.
describe('buildRecordingPlan — rerecord_wanted', () => {
  const withWant = (id, want) => SENTENCES.map(r => r.id === id ? { ...r, rerecord_wanted: want } : r)

  const wantPlan = (sentences, voiceId) => buildRecordingPlan({
    pods: PODS, sentences, podCast: POD_CAST, voiceId,
  })

  it('emits a target line for a voice the cast does NOT hold', () => {
    // p0-1 is Anna = Catrin's character. Aran holds none of it.
    const sentences = withWant('p0-1', { target: 'human_aran_cym' })
    const items = wantPlan(sentences, 'human_aran_cym').items.filter(i => i.kind === 'target')
    expect(items.map(i => i.sentenceId)).toContain('p0-1')
    // and the want does not make Aran a cast member of Anna
    expect(wantPlan(sentences, 'human_aran_cym').castSpeakers).not.toContain('Anna')
  })

  it('emits a KNOWN line for a NON-explainer voice — the only way English reaches Catrin', () => {
    const sentences = withWant('p0-2', { known: 'human_catrin_cym' })
    const p = wantPlan(sentences, 'human_catrin_cym')
    expect(p.isExplainer).toBe(false)
    const known = p.items.filter(i => i.kind === 'known')
    expect(known.map(i => i.sentenceId)).toEqual(['p0-2'])
    expect(known[0].line).toBe('Welcome')
    expect(p.items.some(i => i.kind === 'explainer')).toBe(false)
  })

  it('wants only reach the named voice, and only the named track', () => {
    const sentences = withWant('p0-1', { target: 'human_aran_cym' })
    // Tom (the __explainer__ known-language voice) is unchanged by an Aran target want
    const tom = wantPlan(sentences, 'human_tom_eng')
    expect(tom.items.filter(i => i.kind === 'target')).toHaveLength(0)
    // no known item appears for Aran off a target want
    const aran = wantPlan(sentences, 'human_aran_cym')
    expect(aran.items.filter(i => i.kind === 'known')).toHaveLength(0)
  })

  it('a want on ANY row of a glued chain wants the whole utterance', () => {
    // p0-5+p0-6 glue into one Neighbour item; want it for Catrin off the 2nd row
    const sentences = withWant('p0-6', { target: 'human_catrin_cym' })
    const item = wantPlan(sentences, 'human_catrin_cym').items.find(i => i.sentenceId === 'p0-5')
    expect(item).toBeTruthy()
    expect(item.sentenceIds).toEqual(['p0-5', 'p0-6'])
  })

  it('leaves the plan untouched when nothing is wanted', () => {
    const before = JSON.stringify(wantPlan(SENTENCES, 'human_aran_cym'))
    const noise = SENTENCES.map(r => ({ ...r, rerecord_wanted: null }))
    expect(JSON.stringify(wantPlan(noise, 'human_aran_cym'))).toBe(before)
  })
})
