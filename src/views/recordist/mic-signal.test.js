import { describe, it, expect } from 'vitest'
import { micSignal } from './mic-signal.js'

describe('micSignal — one word for the mic, never two', () => {
  it('says Recording when the mic is open and nothing holds it', () => {
    expect(micSignal({}).word).toBe('Recording')
    expect(micSignal({ micDb: '-12 dB' }).title).toBe('Mic live · -12 dB')
  })
  it('a hold outranks everything: editing, then pause, then playback', () => {
    expect(micSignal({ editing: true, paused: true, playing: true }).word).toBe('Editing — mic paused')
    expect(micSignal({ paused: true, playing: true, clipping: true }).word).toBe('Paused')
    expect(micSignal({ playing: true, clipping: true }).word).toBe('Listening back')
  })
  it('is never "Too loud" while the mic is held (the speaker is not the reader)', () => {
    expect(micSignal({ playing: true, clipping: true }).cls).not.toContain('loud')
    expect(micSignal({ clipping: true }).word).toBe('Too loud')
  })
  it('a dead meter still says Recording and says the take is kept', () => {
    const s = micSignal({ meterTrusted: false })
    expect(s.word).toBe('Recording')
    expect(s.title).toContain('every take will be saved')
  })
  it('getting ready is its own word, before the line is shown', () => {
    expect(micSignal({ arming: true }).word).toBe('Getting ready')
  })
})
