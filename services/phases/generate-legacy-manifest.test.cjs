/**
 * The legacy export picks, for each text, the clip the COURSE links — not whichever course_audio row came last (job #427).
 * Run: npx vitest run services/phases/generate-legacy-manifest.test.cjs
 * Shapes are the real ita_for_eng rows from the 2026-10-27 export: an orphan June stage-0 "Lunedì." (xAI, ffmpeg-encoded,
 * no slot points at it) beside the clip S0316L02 links; and S0054L05, whose intro is linked in its slot but carries no
 * course_audio.lego_id stamp.
 */
import { describe, it, expect } from 'vitest'
const { collectLinkedAudioIds, indexAudioByText, indexPresentationsByLego, buildSamplesDictionary } = require('./generate-legacy-manifest.cjs')

const LINKED = '5710322d-4a2b-4888-9a48-a17347e4d6d7' // S0316L02 target1 slot
const ORPHAN = '22ee8de7-fa06-4579-9a15-50789b3a05cb' // June stage-0 row, no slot
const legos = [{ lego_id: 'S0316L02', target1_audio_id: LINKED, presentation_audio_id: null },
  { lego_id: 'S0054L05', presentation_audio_id: '04533962-199e-4920-8b9e-7cfbd663d224' }]
const audio = [
  { id: LINKED, text_normalized: 'lunedì', language: 'ita', role: 'target1', s3_key: `mastered/${LINKED.toUpperCase()}.mp3` },
  // listed AFTER the linked clip: last-row-wins picked this one
  { id: ORPHAN, text_normalized: 'lunedì.', language: 'ita', role: 'target1', s3_key: `mastered/${ORPHAN.toUpperCase()}.mp3` },
  { id: '04533962-199e-4920-8b9e-7cfbd663d224', text_normalized: "the italian for: 'a little more time', is:", language: 'eng', role: 'presentation', lego_id: null, s3_key: 'mastered/04533962-199E-4920-8B9E-7CFBD663D224.mp3' },
]

describe('legacy export: the linked clip speaks for a text', () => {
  const linked = collectLinkedAudioIds([], legos, [])

  it('a slot-linked clip beats a later unlinked clip of the same words', () => {
    expect(indexAudioByText(audio, linked).get('lunedì|ita|target1').id).toBe(LINKED)
    // pre-#427 behaviour, kept when nothing is linked: last row wins
    expect(indexAudioByText(audio, null).get('lunedì|ita|target1').id).toBe(ORPHAN)
  })

  it('the manifest sample for "lunedì" is the linked clip, not the orphan', () => {
    const { samples } = buildSamplesDictionary(audio, [{ text: 'lunedì', isKnown: false }], 'eng', 'ita', linked)
    expect(samples['lunedì'].map((s) => s.id)).toEqual([LINKED.toUpperCase()])
  })

  it("a LEGO's presentation is the clip its slot links, even with no lego_id stamp", () => {
    expect(indexPresentationsByLego(audio, legos).get('S0054L05')?.id).toBe('04533962-199e-4920-8b9e-7cfbd663d224')
  })

  it('a pending slot clip is not a presentation; the lego_id stamp is the fallback', () => {
    const pend = [{ id: 'p1', role: 'presentation', lego_id: 'S0001L01', s3_key: 'mastered/P0.mp3' }, { id: 'p2', role: 'presentation', s3_key: 'pending/x' }]
    expect(indexPresentationsByLego(pend, [{ lego_id: 'S0001L01', presentation_audio_id: 'p2' }]).get('S0001L01').id).toBe('p1')
  })
})
