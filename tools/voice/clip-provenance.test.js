import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'
const { summarise } = createRequire(import.meta.url)('./clip-provenance.cjs')

describe('summarise', () => {
  it('flags TTS and wrong-voice clips and missing ids', () => {
    const rows = [
      { id: 'a', origin: 'human', voice_id: 'human_aran_eng', duration_ms: 1000 },
      { id: 'b', origin: 'tts', voice_id: 'human_aran_eng', duration_ms: 1000 },
      { id: 'c', origin: 'human', voice_id: 'tom_clone', duration_ms: 1000 },
    ]
    const s = summarise(['a', 'b', 'c', 'd'], rows, 'human_aran_eng')
    expect(s.notVerified.map((r) => r.id)).toEqual(['b', 'c'])
    expect(s.missing).toEqual(['d'])
    expect(s.allVerified).toBe(false)
    expect(summarise(['a'], rows.slice(0, 1), 'human_aran_eng').allVerified).toBe(true)
  })
})
