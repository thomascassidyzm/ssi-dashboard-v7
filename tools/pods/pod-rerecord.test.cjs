// pod-rerecord: the old voice never survives in a Drill clip the player plays, and the cast follows gender.
import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { newTakeg, recastSpeakers } = require('./pod-rerecord.cjs')

const u = (s) => ({ kind: 'atom', target_surface: s })
const sent = (i) => `S${i}`

describe('pod-rerecord newTakeg', () => {
  it('a glued interjection + sentence that is the whole turn takes the new whole-turn take', () => {
    const row = { target_text: 'Hallo! Wie geht es dir?', atom_map_fine: [u('Hallo'), u('Wie geht es'), u('dir')], takeg_audio_ids: ['OLD'] }
    expect(newTakeg(row, 2, 'TAKE', sent)).toEqual(['TAKE'])
  })
  it('one-sentence groups take their sentence cuts', () => {
    const row = { target_text: 'Guten Morgen. Wie geht es dir?', atom_map_fine: [u('Guten Morgen'), u('Wie geht es dir')], takeg_audio_ids: ['OLD1', 'OLD2'] }
    expect(newTakeg(row, 2, 'TAKE', sent)).toEqual(['S0', 'S1'])
  })
  it('leaves an array the player ignores (length off its group count) alone', () => {
    const row = { target_text: 'Ja. Gut. Danke.', atom_map_fine: [u('Ja'), u('Gut'), u('Danke')], takeg_audio_ids: ['OLD'] }
    expect(newTakeg(row, 3, 'TAKE', sent)).toBeUndefined()
  })
})

describe('pod-rerecord recastSpeakers', () => {
  it('moves every speaker to the pick for its gender, an ungendered one by the voice it shares', () => {
    const speakers = { Sarah: { gender: 'f', target: { voice_id: 'lena' } }, Staff: { target: { voice_id: 'moritz' } }, James: { gender: 'm', target: { voice_id: 'moritz' } } }
    const picks = { m: { name: 'Nico', provider: 'cartesia', voice_id: 'nico' }, f: { name: 'Viktoria', provider: 'cartesia', voice_id: 'vik' } }
    const out = recastSpeakers(speakers, picks, 'deu')
    expect([out.Sarah.target.voice_id, out.Staff.target.voice_id, out.James.target.voice_id]).toEqual(['vik', 'nico', 'nico'])
    expect(out.Staff.gender).toBe('m')
  })
})
