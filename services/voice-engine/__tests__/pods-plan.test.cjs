/**
 * Unit tests: per-voice recording-plan construction (keystone §2) —
 * cue lines, scene boundaries, glue grouping, explainer queue, estimates.
 * Run: npx vitest run services/voice-engine
 */

import { describe, it, expect } from 'vitest'

const {
  buildRecordingPlan,
  groupGlueItems,
  sceneTitleFor,
  estimateSeconds,
} = require('../pods-plan.cjs')

// ── Fixture: one course, two pods, cast of two humans + explainer ───────────

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
    expect(p.counts).toEqual({ target: 4, known: 0, explainer: 0, total: 4 })
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
      { speaker: 'Anna', target: 'Bore da', known: 'Good morning' },
      { speaker: 'Waiter', target: 'Croeso', known: 'Welcome' },
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

// ── Explainer queue ──────────────────────────────────────────────────────────

describe('buildRecordingPlan — explainer queue (__explainer__)', () => {
  it('carries every known line + every non-empty explainer_text', () => {
    const p = plan('human_tom_eng')
    expect(p.isExplainer).toBe(true)
    const known = p.items.filter(i => i.kind === 'known')
    const explainers = p.items.filter(i => i.kind === 'explainer')
    // 8 dialogue items (glue chain = one) each with known text
    expect(known.length).toBe(8)
    expect(known.find(i => i.sentenceId === 'p0-5').line).toBe('Hello — how are you?')
    // explainer_text: p0-1 has prose, p0-4 is '' (deliberately none, recon §5)
    expect(explainers.map(i => i.sentenceId)).toEqual(['p0-1'])
    expect(explainers[0].line).toMatch(/all-day opener/)
    expect(p.counts).toEqual({ target: 0, known: 8, explainer: 1, total: 9 })
  })

  it('a voice cast as BOTH a character and the explainer gets both queues', () => {
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
