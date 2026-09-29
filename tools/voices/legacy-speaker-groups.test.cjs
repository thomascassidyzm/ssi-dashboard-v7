/**
 * Speaker grouping (job #703): a slot recorded by one person is ONE group; a slot
 * where the voice changes at a seed is split at that seed; a clip whose words are
 * not in the course joins by sound. Synthetic fingerprints, no audio, no DB.
 * Run: npx vitest run tools/voices/legacy-speaker-groups.test.cjs
 */
import { describe, it, expect } from 'vitest'
const { splitSlot, genderOf } = require('./legacy-speaker-groups.cjs')

let seq = 0
// deterministic pseudo-noise so the test never flakes
const noise = () => { seq = (seq * 9301 + 49297) % 233280; return seq / 233280 - 0.5 }
const speaker = (f0, tilt) => () => ({ f0: f0 + noise() * 10, ltas: Array.from({ length: 16 }, (_, i) => (i - 8) * tilt + noise() * 3) })
const vecOf = d => [12 * Math.log2(d.f0 / 100), ...d.ltas.map(x => x * 0.35)]
const clipsFor = (spans, withUnseeded = 0) => {
  const out = []
  spans.forEach(([from, to, make]) => { for (let s = from; s < to; s++) for (let k = 0; k < 5; k++) out.push({ id: `c${out.length}`, seed: s, vec: vecOf(make()), f0: 0 }) })
  for (let k = 0; k < withUnseeded; k++) out.push({ id: `u${k}`, seed: null, vec: vecOf(spans[0][2]()), f0: 0 })
  return out
}

describe('splitSlot', () => {
  it('one speaker across the whole course stays one group', () => {
    const { groups } = splitSlot(clipsFor([[0, 300, speaker(140, 0.4)]]))
    expect(groups).toHaveLength(1)
    expect(groups[0].clips).toHaveLength(1500)
  })

  it('a voice that changes at seed 130 is split there, and nowhere else', () => {
    const { groups } = splitSlot(clipsFor([[0, 130, speaker(218, 1.6)], [130, 300, speaker(172, 0.1)]], 30))
    expect(groups).toHaveLength(2)
    const seeds = g => g.clips.filter(c => c.seed != null).map(c => c.seed)
    const [a, b] = groups.sort((x, y) => Math.min(...seeds(x)) - Math.min(...seeds(y)))
    expect(Math.max(...seeds(a))).toBeLessThan(130)
    expect(Math.min(...seeds(b))).toBeGreaterThanOrEqual(130)
  })

  it('a clip whose words are not in the course joins the group it sounds like', () => {
    const { groups } = splitSlot(clipsFor([[0, 130, speaker(218, 1.6)], [130, 300, speaker(172, 0.1)]], 30))
    const first = groups.find(g => g.clips.some(c => c.seed === 5))
    expect(first.clips.filter(c => c.id.startsWith('u')).length).toBeGreaterThan(20)
  })

  it('one odd window is a bad day, not a second person', () => {
    const odd = clipsFor([[0, 300, speaker(140, 0.4)]]).map(c => (c.seed >= 100 && c.seed < 110 ? { ...c, vec: c.vec.map((x, i) => x + (i === 0 ? 5 : 0)) } : c))
    expect(splitSlot(odd).groups).toHaveLength(1)
  })
})

describe('genderOf', () => {
  it('reads pitch as evidence and admits the middle', () => {
    expect(genderOf(135)).toBe('m')
    expect(genderOf(215)).toBe('f')
    expect(genderOf(175)).toBeNull()
  })
})
