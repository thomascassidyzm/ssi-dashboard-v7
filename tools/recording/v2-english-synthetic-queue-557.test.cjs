// tools/recording/v2-english-synthetic-queue-557.cjs — the switch touches the two v2 known castOn entries only (job #557).
//   npx vitest run tools/recording/v2-english-synthetic-queue-557.test.cjs
import { describe, it, expect } from 'vitest'
import tool from './v2-english-synthetic-queue-557.cjs'
const { withV2SyntheticMode, restoreV2Entries } = tool

const row = () => ({
  'm:known': { name: 'Aran', voiceId: 'human_aran_eng', castOn: [
    { courseCode: 'cym_n_for_eng', role: 'known', synthetic: 'queue', syntheticSeeds: ['x'] },
    { courseCode: 'cym_s_for_eng', role: 'known' },
    { courseCode: 'cym_nv2_for_eng', role: 'known' },
    { courseCode: 'cym_sv2_for_eng', role: 'known' },
  ] },
  'f:known': { name: 'Catrin', voiceId: 'human_catrinlliar_eng', castOn: [{ courseCode: 'cym_nv2_for_eng', role: 'known' }] },
})

describe('withV2SyntheticMode', () => {
  it('sets synthetic:queue on nv2/sv2 known for Aran only; live entries and other voices untouched', () => {
    const before = row()
    const out = withV2SyntheticMode(before, 'queue')
    const aran = out['m:known'].castOn
    expect(aran[2]).toEqual({ courseCode: 'cym_nv2_for_eng', role: 'known', synthetic: 'queue' })
    expect(aran[3]).toEqual({ courseCode: 'cym_sv2_for_eng', role: 'known', synthetic: 'queue' })
    expect(aran[0]).toEqual(before['m:known'].castOn[0])
    expect(aran[1]).toEqual(before['m:known'].castOn[1])
    expect(out['f:known']).toEqual(before['f:known'])
    expect(before['m:known'].castOn[2].synthetic).toBeUndefined() // pure
  })
  it('refuses a row without both v2 entries', () => {
    const r = row(); r['m:known'].castOn.pop()
    expect(() => withV2SyntheticMode(r, 'queue')).toThrow(/cym_sv2_for_eng/)
  })
})

describe('restoreV2Entries (undo)', () => {
  it('puts back only the two v2 entries; an unrelated edit made since survives', () => {
    const pre = row()
    const now = withV2SyntheticMode(pre, 'queue')
    now['m:known'].castOn[1].synthetic = 'queue' // somebody else's later edit on live South
    const out = restoreV2Entries(now, pre)
    expect(out['m:known'].castOn[2]).toEqual(pre['m:known'].castOn[2])
    expect(out['m:known'].castOn[3]).toEqual(pre['m:known'].castOn[3])
    expect(out['m:known'].castOn[1].synthetic).toBe('queue')
  })
})
