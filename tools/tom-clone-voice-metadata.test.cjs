/**
 * Unit tests: THE ONE VOICE THE PROVIDER CANNOT ANSWER FOR (2026-08-11).
 *
 * `gfzdpspr5fdp` is a clone of a known human, not a catalogue voice, so its
 * gender comes from provenance rather than from xAI. That makes the guardrails
 * the whole point of the tool:
 *   (a) the patch carries gender + an HONEST source + a timestamp — and never
 *       an age, because nobody has stated one;
 *   (b) a missing row, or a row that has moved since (already gendered, renamed,
 *       re-engined), aborts instead of overwriting someone else's answer.
 *
 * Run: npx vitest run tools/tom-clone-voice-metadata
 */

import { describe, it, expect } from 'vitest'
import {
  VOICE_ID, GENDER, SOURCE, driftAgainstExpected, patchFor,
} from './tom-clone-voice-metadata.cjs'

const CLEAN = { voice_id: VOICE_ID, tts_engine: 'xai', tts_voice_name: 'Tom', gender: null }

describe('the patch', () => {
  it('writes gender, an honest provenance and a checked-at — and no age', () => {
    const patch = patchFor('2026-08-11T23:59:00.000Z')
    expect(patch).toEqual({
      gender: 'm',
      metadata_source: SOURCE,
      metadata_checked_at: '2026-08-11T23:59:00.000Z',
    })
    expect('age' in patch).toBe(false)
  })

  it('does not claim the provider said it', () => {
    expect(SOURCE).toMatch(/^human-known:/)
    expect(SOURCE).not.toMatch(/GET \/v1/)
    expect(GENDER).toBe('m')
  })
})

describe('before-state assertions', () => {
  it('passes on the row as reconciliation left it', () => {
    expect(driftAgainstExpected(CLEAN)).toEqual([])
  })

  it('aborts when the row is absent', () => {
    expect(driftAgainstExpected(null)).toEqual([`no voices row for ${VOICE_ID}`])
  })

  it('aborts when someone has already answered the question', () => {
    const drift = driftAgainstExpected({ ...CLEAN, gender: 'f' })
    expect(drift).toHaveLength(1)
    expect(drift[0]).toContain('gender')
  })

  it('aborts when the row is no longer the voice we mean', () => {
    expect(driftAgainstExpected({ ...CLEAN, tts_voice_name: 'Henry' })).toHaveLength(1)
    expect(driftAgainstExpected({ ...CLEAN, tts_engine: 'azure' })).toHaveLength(1)
  })
})
