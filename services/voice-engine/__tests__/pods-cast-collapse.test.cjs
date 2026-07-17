/**
 * Unit tests: legacy-cast collapse to the two-voice shape (founder ruling
 * 2026-07-17) + alias merging. Fixture mirrors the live Welsh pod-0 cast that
 * motivated the rule: the SAME two humans split across five version-suffixed
 * identities.
 * Run: npx vitest run services/voice-engine
 */

import { describe, it, expect } from 'vitest'

const {
  EXPLAINER_SPEAKER,
  collapseTwoVoiceCast,
  mergeCastAliases,
} = require('../pods-cast.cjs')

// The Welsh pod-0 shape: Aran (guide era), Aranv2/Aranv3, Catrin/Catrinv2 —
// two humans, five identities.
function welshLegacyCast() {
  return {
    [EXPLAINER_SPEAKER]: { voiceId: 'human_aran_cym', name: 'Aran' },
    Narrator: { voiceId: 'human_aran_cym', name: 'Aran' },
    Neighbour: { voiceId: 'human_aran_cym', name: 'Aran' },
    Guest: { voiceId: 'human_aranv2_cym', name: 'Aranv2', email: 'aran@ssi.example' },
    Driver: { voiceId: 'human_aranv2_cym', name: 'Aranv2' },
    Waiter: { voiceId: 'human_aranv3_cym', name: 'Aranv3' },
    Local: { voiceId: 'human_aranv3_cym', name: 'Aranv3' },
    Sarah: { voiceId: 'human_catrin_cym', name: 'Catrin' },
    Learner: { voiceId: 'human_catrin_cym', name: 'Catrin' },
    Anna: { voiceId: 'human_catrinv2_cym', name: 'Catrinv2', email: 'catrin@ssi.example' },
    Barista: { voiceId: 'human_catrinv2_cym', name: 'Catrinv2' },
  }
}

function welshSpeakers() {
  return [
    { speaker: 'Narrator', gender: 'n', lineCount: 100 },
    { speaker: 'Neighbour', gender: 'n', lineCount: 55 },
    { speaker: 'Guest', gender: 'm', lineCount: 20 },
    { speaker: 'Driver', gender: 'm', lineCount: 17 },
    { speaker: 'Waiter', gender: 'm', lineCount: 16 },
    { speaker: 'Local', gender: 'm', lineCount: 15 },
    { speaker: 'Sarah', gender: 'f', lineCount: 16 },
    { speaker: 'Learner', gender: 'f', lineCount: 15 },
    { speaker: 'Anna', gender: 'f', lineCount: 15 },
    { speaker: 'Barista', gender: 'f', lineCount: 15 },
  ]
}

describe('collapseTwoVoiceCast', () => {
  it('is a no-op for a cast already holding two or fewer voices', () => {
    const podCast = {
      [EXPLAINER_SPEAKER]: { voiceId: 'v_a', name: 'Aran' },
      Narrator: { voiceId: 'v_a', name: 'Aran' },
      Sarah: { voiceId: 'v_c', name: 'Catrin' },
    }
    const out = collapseTwoVoiceCast({ podCast, speakers: [] })
    expect(out.changed).toBe(false)
    expect(out.podCast).toEqual(podCast)
    expect(out.dropped).toEqual([])
  })

  it('collapses five versioned identities into one voice per gender', () => {
    const out = collapseTwoVoiceCast({
      podCast: welshLegacyCast(),
      speakers: welshSpeakers(),
      // The v2 links are the ones actually recorded against.
      takesByVoiceId: { human_aranv2_cym: 40, human_catrinv2_cym: 30, human_aran_cym: 5 },
    })
    expect(out.changed).toBe(true)
    const voiceIds = new Set(Object.values(out.podCast).map(e => e.voiceId))
    expect([...voiceIds].sort()).toEqual(['human_aranv2_cym', 'human_catrinv2_cym'])
    // Every character remapped; explainer follows its human's bucket.
    expect(out.podCast.Waiter.voiceId).toBe('human_aranv2_cym')
    expect(out.podCast.Sarah.voiceId).toBe('human_catrinv2_cym')
    expect(out.podCast[EXPLAINER_SPEAKER].voiceId).toBe('human_aranv2_cym')
    // Survivor identity carries its bucket's email and a hard gender.
    expect(out.podCast.Waiter.email).toBe('aran@ssi.example')
    expect(out.podCast.Waiter.gender).toBe('m')
    expect(out.podCast.Anna.gender).toBe('f')
    // Dropped ids alias to their survivor.
    expect(out.aliases.human_aranv2_cym.sort()).toEqual(['human_aran_cym', 'human_aranv3_cym'])
    expect(out.aliases.human_catrinv2_cym).toEqual(['human_catrin_cym'])
    expect(out.unresolved).toEqual([])
  })

  it('resolves an all-neutral identity through the version stem of its name', () => {
    // "Aran" plays only neutral characters — its gender comes from Aranv2.
    const out = collapseTwoVoiceCast({
      podCast: welshLegacyCast(),
      speakers: welshSpeakers(),
      takesByVoiceId: {},
    })
    const aranSpeakers = ['Narrator', 'Neighbour']
    for (const sp of aranSpeakers) {
      expect(out.podCast[sp].gender).toBe('m')
    }
  })

  it('prefers explicit entry gender over character majority', () => {
    const podCast = {
      A: { voiceId: 'v1', name: 'One', gender: 'f' },
      B: { voiceId: 'v2', name: 'Two' },
      C: { voiceId: 'v3', name: 'Three' },
    }
    const speakers = [
      { speaker: 'A', gender: 'm', lineCount: 50 }, // cross-gender casting: entry wins
      { speaker: 'B', gender: 'f', lineCount: 10 },
      { speaker: 'C', gender: 'm', lineCount: 10 },
    ]
    const out = collapseTwoVoiceCast({ podCast, speakers, takesByVoiceId: {} })
    expect(out.podCast.A.gender).toBe('f')
    expect(out.podCast.B.voiceId).toBe(out.podCast.A.voiceId) // f bucket: v1 has more lines
    expect(out.podCast.C.voiceId).toBe('v3')
  })

  it('leaves an unresolvable identity untouched and reports it', () => {
    const podCast = {
      A: { voiceId: 'v1', name: 'Alice' },
      B: { voiceId: 'v2', name: 'Bob' },
      X: { voiceId: 'v3', name: 'Mystery' },
    }
    const speakers = [
      { speaker: 'A', gender: 'f', lineCount: 10 },
      { speaker: 'B', gender: 'm', lineCount: 10 },
      { speaker: 'X', gender: 'n', lineCount: 5 },
    ]
    const out = collapseTwoVoiceCast({ podCast, speakers, takesByVoiceId: {} })
    expect(out.unresolved).toEqual(['v3'])
    expect(out.podCast.X).toEqual(podCast.X)
    expect(out.changed).toBe(false) // nothing actually dropped
  })

  it('never mutates its input', () => {
    const podCast = welshLegacyCast()
    const snapshot = JSON.parse(JSON.stringify(podCast))
    collapseTwoVoiceCast({ podCast, speakers: welshSpeakers(), takesByVoiceId: {} })
    expect(podCast).toEqual(snapshot)
  })
})

describe('mergeCastAliases', () => {
  it('chains an old survivor that has itself been dropped', () => {
    const old = { v2: ['v1'] } // earlier collapse: v1 → v2
    const fresh = { v3: ['v2'] } // now v2 → v3
    expect(mergeCastAliases(old, fresh)).toEqual({ v3: ['v2', 'v1'] })
  })

  it('unions lists without duplicates and tolerates null', () => {
    expect(mergeCastAliases(null, { a: ['b'] })).toEqual({ a: ['b'] })
    expect(mergeCastAliases({ a: ['b', 'c'] }, { a: ['b'] })).toEqual({ a: ['b', 'c'] })
  })
})
