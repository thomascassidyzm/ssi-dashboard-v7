import { describe, it, expect } from 'vitest'
const {
  LEGO_TRIPLE, LEGO_REQUIRED_ROLES, SEVERITY,
  missingLegoRoles, isLegoComplete, legoVerdict,
  slotSeverity, shouldFightHardest, repairOrder
} = require('./audio-completeness.cjs')

const full = { presentation: 'i1', target1: 'v1', target2: 'v2' }

describe('the triple is intro + voice1 + voice2 (Tom, 2026-08-06)', () => {
  it('names the three clips exactly', () => {
    expect(LEGO_TRIPLE).toEqual({ presentation: 'intro', target1: 'voice1', target2: 'voice2' })
    expect(LEGO_REQUIRED_ROLES).toEqual(['presentation', 'target1', 'target2'])
  })
  it('is three, not "three target voices"', () => {
    expect(LEGO_REQUIRED_ROLES.filter(r => r.startsWith('target'))).toHaveLength(2)
  })
  it('a complete LEGO has all three', () => {
    expect(isLegoComplete(full)).toBe(true)
    expect(missingLegoRoles(full)).toEqual([])
  })
})

describe('the flattering metric must not exist', () => {
  it('prompt + voice 1 does NOT make a LEGO complete', () => {
    const lego = { known: 'k1', target1: 'v1' }
    expect(isLegoComplete(lego)).toBe(false)
    expect(legoVerdict(lego).severity).toBe(SEVERITY.COURSE_BREAKING)
  })
  it('the known/prompt clip is never consulted — adding it changes nothing', () => {
    const without = legoVerdict({ target1: 'v1', target2: 'v2' })
    const with_ = legoVerdict({ known: 'k1', target1: 'v1', target2: 'v2' })
    expect(with_).toEqual(without)
    expect(with_.complete).toBe(false) // still missing the intro
  })
})

describe('any single gap in the triple is course-breaking', () => {
  it('a voice-2-only gap is course-breaking on its own', () => {
    const v = legoVerdict({ presentation: 'i1', target1: 'v1' })
    expect(v.complete).toBe(false)
    expect(v.missing).toEqual(['target2'])
    expect(v.severity).toBe(SEVERITY.COURSE_BREAKING)
    expect(v.label).toContain('voice2')
  })
  it('a missing intro alone is course-breaking — both voices is not enough', () => {
    const v = legoVerdict({ target1: 'v1', target2: 'v2' })
    expect(v.severity).toBe(SEVERITY.COURSE_BREAKING)
    expect(v.introOnly).toBe(true)
  })
  it('introOnly flags the cheapest rescue, and only that case', () => {
    expect(legoVerdict({ target1: 'v1', target2: 'v2' }).introOnly).toBe(true)
    expect(legoVerdict({ presentation: 'i1', target1: 'v1' }).introOnly).toBe(false)
    expect(legoVerdict({}).introOnly).toBe(false)
    expect(legoVerdict(full).introOnly).toBe(false)
  })
  it('reads the *_audio_id column names too', () => {
    expect(isLegoComplete({
      presentation_audio_id: 'i', target1_audio_id: 'a', target2_audio_id: 'b'
    })).toBe(true)
    expect(isLegoComplete({ presentation_audio_id: null, target1_audio_id: 'a', target2_audio_id: 'b' }))
      .toBe(false)
  })
  it('empty string is not a link', () => {
    expect(isLegoComplete({ presentation: '', target1: 'v1', target2: 'v2' })).toBe(false)
  })
})

describe('severity is per-role, and phrases are minor', () => {
  it('a LEGO slot in the triple is course-breaking', () => {
    for (const role of LEGO_REQUIRED_ROLES) {
      expect(slotSeverity('lego', role)).toBe(SEVERITY.COURSE_BREAKING)
    }
  })
  it('the known side of a LEGO is NOT course-breaking', () => {
    expect(slotSeverity('lego', 'known')).toBe(SEVERITY.MINOR)
  })
  it('a practice-phrase gap is minor even on a target voice', () => {
    expect(slotSeverity('phrase', 'target1')).toBe(SEVERITY.MINOR)
    expect(slotSeverity('phrase', 'target2')).toBe(SEVERITY.MINOR)
  })
})

describe('fight hardest, and repair LEGOs before cycles', () => {
  it('fights hardest exactly for the LEGO triple', () => {
    expect(shouldFightHardest('lego', 'target2')).toBe(true)
    expect(shouldFightHardest('lego', 'presentation')).toBe(true)
    expect(shouldFightHardest('phrase', 'target1')).toBe(false)
    expect(shouldFightHardest('lego', 'known')).toBe(false)
  })
  it('orders LEGOs before seeds before phrases', () => {
    const q = [
      { slotKind: 'phrase' }, { slotKind: 'seed' }, { slotKind: 'lego' }
    ].sort(repairOrder)
    expect(q.map(x => x.slotKind)).toEqual(['lego', 'seed', 'phrase'])
  })
  it('puts intro-only rescues first within LEGOs', () => {
    const q = [
      { slotKind: 'lego', introOnly: false }, { slotKind: 'lego', introOnly: true }
    ].sort(repairOrder)
    expect(q[0].introOnly).toBe(true)
  })
})

describe('an unspecified slotKind must not be flattered into "minor"', () => {
  it('returns unknown, not minor, so a roll-up cannot silently report zero breakage', () => {
    expect(slotSeverity(undefined, 'target1')).toBe(SEVERITY.UNKNOWN)
    expect(slotSeverity(null, 'presentation')).toBe(SEVERITY.UNKNOWN)
    expect(slotSeverity('cycle', 'target2')).toBe(SEVERITY.UNKNOWN)
  })
  it('and does not claim to be course-breaking either', () => {
    expect(slotSeverity(undefined, 'target1')).not.toBe(SEVERITY.COURSE_BREAKING)
  })
  it('shouldFightHardest stays false for an unknown kind', () => {
    expect(shouldFightHardest(undefined, 'target1')).toBe(false)
  })
})
