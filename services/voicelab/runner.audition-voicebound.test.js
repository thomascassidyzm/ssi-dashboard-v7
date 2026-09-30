// A Voice Lab audition must never be answered by ANOTHER voice's clip (job #954):
// the lookup the door runs is voice-bound, so an audition of Thiago on a line Elvira
// already has renders Thiago instead of handing back Elvira.
import { describe, it, expect } from 'vitest'
import runner from './runner.cjs'
import clipLibrary from '../shared/clip-library.cjs'

const { pickExistingClip } = clipLibrary

describe('voicelab audition door', () => {
  const cfg = { provider: 'cartesia', voiceId: 'abc', language: 'spa', speed: 1 }
  it('asks the door for this voice only', () => {
    const c = runner.providerConfig(cfg, { locale: 'es-ES', steer: 'es' })
    expect(c.door.voiceBound).toBe(true)
    expect(runner.providerConfig({ ...cfg, provider: 'azure', voiceId: 'es-ES-AlvaroNeural' }, null).door.voiceBound).toBe(true)
  })
  it('a voice-bound lookup does not fall back to another voice', () => {
    const rows = [{ id: '1', s3_key: 'k', text: 'Hola.', language: 'spa', voice_id: 'azure_es-ES-ElviraNeural' }]
    const want = { text: 'Hola.', language: 'spa', voiceId: 'cartesia_abc' }
    expect(pickExistingClip(rows, want)).not.toBeNull() // the pre-fix behaviour
    expect(pickExistingClip(rows, { ...want, voiceBound: true })).toBeNull()
  })
})
