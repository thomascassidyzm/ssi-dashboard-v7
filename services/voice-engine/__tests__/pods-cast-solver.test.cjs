/**
 * Property tests: N-voice human cast solver (tools/pod-voice-colour-n.cjs).
 * Run: npx vitest run services/voice-engine
 */

import { describe, it, expect } from 'vitest'

const {
  proposeHumanCast,
  buildScenesFromSentences,
  canonicalSpeakerName,
  extractGenderMarker,
} = require('../../../tools/pod-voice-colour-n.cjs')

// ── Fixture builders ─────────────────────────────────────────────────────────

let ORDER = 0
function row(podId, scene, speaker, extra = {}) {
  ORDER += 1
  return {
    id: `${podId}:SC${String(scene).padStart(2, '0')}-S${String(ORDER).padStart(3, '0')}`,
    pod_id: podId,
    scene_number: scene,
    global_order: ORDER,
    speaker,
    target_text: `target line ${ORDER}`,
    known_text: `known line ${ORDER}`,
    glue_to_next: false,
    ...extra,
  }
}

function voices(n, genders = []) {
  return Array.from({ length: n }, (_, i) => ({
    voiceId: `human_v${i + 1}_cym`,
    name: `Human ${i + 1}`,
    email: `v${i + 1}@example.com`,
    gender: genders[i] || null,
  }))
}

// Two-pod course: Anna+Waiter+Neighbour converse in pod-0; Anna+Waiter+Friend
// in pod-1 (Anna spans both pods — the consistency case).
function twoPodSentences() {
  ORDER = 0
  return [
    // pod-0 scene 1: Anna ↔ Waiter back-and-forth
    row('c:pod-0', 1, 'Anna (F)'),
    row('c:pod-0', 1, 'Waiter (M)'),
    row('c:pod-0', 1, 'Anna (F)'),
    row('c:pod-0', 1, 'Waiter (M)'),
    // pod-0 scene 2: Anna ↔ Neighbour (variants collapse to one character)
    row('c:pod-0', 2, 'Neighbour (8 am)'),
    row('c:pod-0', 2, 'Anna (F)'),
    row('c:pod-0', 2, 'Neighbour (10:30 pm)'),
    // pod-1 scene 1: Anna ↔ Waiter ↔ Friend three-hander
    row('c:pod-1', 1, 'Anna (F)'),
    row('c:pod-1', 1, 'Friend (F)'),
    row('c:pod-1', 1, 'Waiter (M)'),
    row('c:pod-1', 1, 'Anna (F)'),
    row('c:pod-1', 1, 'Friend (F)'),
  ]
}

// Same-scene voice distinctness implies adjacent dialogue lines never share a
// voice. Check the stronger property pairwise over every scene.
function adjacentLinesShareNoVoice(sentences, castBySpeaker) {
  const ordered = [...sentences].sort((a, b) =>
    a.pod_id < b.pod_id ? -1 : a.pod_id > b.pod_id ? 1 : a.global_order - b.global_order)
  for (let i = 1; i < ordered.length; i++) {
    const prev = ordered[i - 1], cur = ordered[i]
    if (prev.pod_id !== cur.pod_id || prev.scene_number !== cur.scene_number) continue
    const a = canonicalSpeakerName(prev.speaker), b = canonicalSpeakerName(cur.speaker)
    if (a === b) continue
    if (castBySpeaker[a].voiceId === castBySpeaker[b].voiceId) return false
  }
  return true
}

// ── Solver properties ────────────────────────────────────────────────────────

describe('proposeHumanCast — alternation', () => {
  it('adjacent dialogue lines never share a voice when N suffices', () => {
    const sentences = twoPodSentences()
    const { castBySpeaker, report } = proposeHumanCast({ sentences, voices: voices(4) })
    expect(adjacentLinesShareNoVoice(sentences, castBySpeaker)).toBe(true)
    expect(report.forced).toEqual([])
    expect(report.adjacentCollisions.turns).toBe(0)
  })

  it('same-scene characters get distinct voices when N suffices (stronger property)', () => {
    const sentences = twoPodSentences()
    const { castBySpeaker } = proposeHumanCast({ sentences, voices: voices(5) })
    // pod-1 scene 1 has Anna+Friend+Waiter: all three differ
    const ids = ['Anna', 'Friend', 'Waiter'].map(s => castBySpeaker[s].voiceId)
    expect(new Set(ids).size).toBe(3)
  })

  it('reports forced reuse (never silent) when N is below a scene headcount', () => {
    ORDER = 0
    const sentences = [
      row('c:pod-0', 1, 'A'), row('c:pod-0', 1, 'B'),
      row('c:pod-0', 1, 'C'), row('c:pod-0', 1, 'D'),
    ]
    const { report } = proposeHumanCast({ sentences, voices: voices(2) })
    expect(report.forced.length).toBeGreaterThan(0)
    expect(report.voicesUsed).toBeLessThanOrEqual(2)
  })
})

describe('proposeHumanCast — per-speaker consistency + N respected', () => {
  it('one character = one voice across ALL pods', () => {
    const sentences = twoPodSentences()
    const { castBySpeaker } = proposeHumanCast({ sentences, voices: voices(4) })
    // Anna appears in both pods but castBySpeaker is keyed once per canon —
    // and the variants collapse: only canonical names appear.
    expect(Object.keys(castBySpeaker).sort()).toEqual(['Anna', 'Friend', 'Neighbour', 'Waiter'])
    expect(castBySpeaker['Anna'].voiceId).toMatch(/^human_v\d_cym$/)
  })

  it('never proposes a voice outside the N given', () => {
    const sentences = twoPodSentences()
    for (const n of [1, 2, 3, 4, 5]) {
      const pool = voices(n)
      const allowed = new Set(pool.map(v => v.voiceId))
      const { castBySpeaker, report } = proposeHumanCast({ sentences, voices: pool })
      for (const entry of Object.values(castBySpeaker)) {
        expect(allowed.has(entry.voiceId)).toBe(true)
      }
      expect(report.voicesUsed).toBeLessThanOrEqual(n)
      expect(report.voicesAvailable).toBe(n)
    }
  })
})

describe('proposeHumanCast — gender + balance', () => {
  it('prefers gender-matched voices when the pool allows', () => {
    const sentences = twoPodSentences()
    const pool = voices(4, ['f', 'f', 'm', 'm'])
    const { castBySpeaker, report } = proposeHumanCast({
      sentences, voices: pool,
      genderBySpeaker: { Anna: 'f', Friend: 'f', Waiter: 'm', Neighbour: 'm' },
    })
    const genderOfVoice = new Map(pool.map(v => [v.voiceId, v.gender]))
    expect(genderOfVoice.get(castBySpeaker['Anna'].voiceId)).toBe('f')
    expect(genderOfVoice.get(castBySpeaker['Friend'].voiceId)).toBe('f')
    expect(genderOfVoice.get(castBySpeaker['Waiter'].voiceId)).toBe('m')
    expect(genderOfVoice.get(castBySpeaker['Neighbour'].voiceId)).toBe('m')
    expect(report.genderMismatches).toEqual([])
  })

  it('falls back to (F)/(M) variant markers when no genderBySpeaker given', () => {
    const sentences = twoPodSentences()
    const pool = voices(4, ['f', 'm', 'f', 'm'])
    const { castBySpeaker } = proposeHumanCast({ sentences, voices: pool })
    const genderOfVoice = new Map(pool.map(v => [v.voiceId, v.gender]))
    expect(genderOfVoice.get(castBySpeaker['Anna'].voiceId)).toBe('f')   // "Anna (F)"
    expect(genderOfVoice.get(castBySpeaker['Waiter'].voiceId)).toBe('m') // "Waiter (M)"
  })

  it('reports a gender mismatch instead of breaking distinctness', () => {
    ORDER = 0
    // Three women in one scene, pool has 2 f + 1 m: someone female must take
    // the male voice — distinctness wins, mismatch is reported.
    const sentences = [
      row('p', 1, 'A (F)'), row('p', 1, 'B (F)'), row('p', 1, 'C (F)'),
      row('p', 1, 'A (F)'), row('p', 1, 'B (F)'), row('p', 1, 'C (F)'),
    ]
    const pool = voices(3, ['f', 'f', 'm'])
    const { castBySpeaker, report } = proposeHumanCast({ sentences, voices: pool })
    const ids = ['A', 'B', 'C'].map(s => castBySpeaker[s].voiceId)
    expect(new Set(ids).size).toBe(3)
    expect(report.genderMismatches.length).toBe(1)
    expect(report.genderMismatches[0].voiceGender).toBe('m')
  })

  it('balances line counts across non-conversing characters', () => {
    ORDER = 0
    // Four characters in four separate scenes (no adjacency): 2 voices should
    // each take ~2 characters, not all four piling onto voice 1.
    const sentences = [
      row('p', 1, 'A'), row('p', 1, 'A'),
      row('p', 2, 'B'), row('p', 2, 'B'),
      row('p', 3, 'C'), row('p', 3, 'C'),
      row('p', 4, 'D'), row('p', 4, 'D'),
    ]
    const { report } = proposeHumanCast({ sentences, voices: voices(2) })
    const loads = Object.values(report.lineCounts.byVoice)
    expect(loads).toEqual([4, 4])
  })
})

describe('buildScenesFromSentences', () => {
  it('keys scenes per (pod, scene) so adjacency never bleeds across pods', () => {
    ORDER = 0
    const sentences = [
      row('p0', 1, 'A'), row('p0', 1, 'B'),
      row('p1', 1, 'C'), row('p1', 1, 'D'),
    ]
    const { scenes } = buildScenesFromSentences(sentences)
    expect(scenes).toEqual([['A', 'B'], ['C', 'D']])
  })

  it('counts a glue chain as ONE line item', () => {
    ORDER = 0
    const sentences = [
      row('p0', 1, 'A', { glue_to_next: true }),
      row('p0', 1, 'A'),
      row('p0', 1, 'B'),
    ]
    const { lineCountByCanon } = buildScenesFromSentences(sentences)
    expect(lineCountByCanon.get('A')).toBe(1)
    expect(lineCountByCanon.get('B')).toBe(1)
  })
})

describe('speaker helpers (local mirrors of pod-sync rules)', () => {
  it('canonicalSpeakerName strips all paren groups', () => {
    expect(canonicalSpeakerName('Susjed (08:00) (M)')).toBe('Susjed')
    expect(canonicalSpeakerName('Anna')).toBe('Anna')
  })
  it('extractGenderMarker reads standalone (F)/(M)/(N)', () => {
    expect(extractGenderMarker('Konobar (M)')).toBe('m')
    expect(extractGenderMarker('Susjeda (F)')).toBe('f')
    expect(extractGenderMarker('Anna (08:00, M)')).toBe(null)
  })
})
