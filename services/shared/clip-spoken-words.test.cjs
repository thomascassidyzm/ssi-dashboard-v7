// Pins cs #160·AI: a clip is matched on the words it SAYS. Not run in CI (tests off estate-wide, r-2026-11-03); the rule is here.
import { describe, it, expect } from 'vitest'
const { saysOtherWords, attachVerdicts, spokenVerdictFor } = require('./clip-spoken-words.cjs')
const { usableClips } = require('./clip-library.cjs')

const female = { id: 'f1', text: 'sono sicuro', language: 'ita', voice_id: 'cartesia_x', s3_key: 'mastered/F.mp3', audio_revision: 2 }
const plain = { id: 'p1', text: 'sono sicuro', language: 'ita', voice_id: 'cartesia_y', s3_key: 'mastered/P.mp3', audio_revision: 1 }

describe('clip spoken words', () => {
  it('a re-record that says sicura never answers sicuro', () => {
    const rows = attachVerdicts([female, plain], new Map([['f1', { spoken_text: 'sono sicura', audio_revision: 2 }]]))
    expect(saysOtherWords(rows[0], 'sono sicuro')).toBe(true)
    expect(usableClips(rows, { text: 'sono sicuro', language: 'ita' }).map(r => r.id)).toEqual(['p1'])
    expect(usableClips(rows, { text: 'sono sicura', language: 'ita' }).map(r => r.id)).toEqual(['f1'])
  })
  it('a verdict for an older revision no longer binds', () => {
    const rows = attachVerdicts([female], new Map([['f1', { spoken_text: 'sono sicura', audio_revision: 1 }]]))
    expect(rows[0].spoken_text).toBeUndefined()
  })
  it('a pronunciation-override respelling leaves no verdict; a different-words spokenText does', () => {
    expect(spokenVerdictFor({ text: 'sono sicuro', explicitSpoken: null, overrideSpoken: 'sono sikuro' })).toBeNull()
    expect(spokenVerdictFor({ text: 'sono sicuro', explicitSpoken: 'sono sikuro', overrideSpoken: 'sono sikuro' })).toBeNull()
    expect(spokenVerdictFor({ text: 'Sono sicuro.', explicitSpoken: 'sono sicuro', overrideSpoken: null })).toBeNull()
    expect(spokenVerdictFor({ text: 'sono sicuro', explicitSpoken: 'sono sicura', overrideSpoken: null })).toEqual({ spoken_text: 'sono sicura' })
  })
})
