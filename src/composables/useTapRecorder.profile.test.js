// The microphone is asked for the way a voice note asks for it (Tom,
// 2026-08-22: the takes save now, but "nowhere near an iPhone voice note").
//
// On WebKit `echoCancellation` is not a filter, it is the flag that picks the
// audio unit: false gives RemoteIO, the bare hardware tap with no gain staging
// at all, and true gives VoiceProcessingIO, which is where Apple keeps the
// gain along with the echo cancel and the noise suppression. So the default
// has to be true, and the two things that could quietly undo it are pinned
// here: the acquisition constraints, and the applyConstraints() call that runs
// straight after and would rebuild the unit if it ever disagreed.
//
// The dry profile stays reachable, because the room offers it as a choice and
// a choice that silently does nothing is worse than no choice.

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  useTapRecorder,
  CAPTURE_PROFILES,
  DEFAULT_CAPTURE_PROFILE,
  CAPTURE_BITRATE,
} from './useTapRecorder'

let gumCalls = []
let applied = []
let recorderOpts = []

class FakeMediaRecorder {
  static isTypeSupported() { return true }
  constructor(stream, opts) { recorderOpts.push(opts); this.state = 'inactive' }
  start() { this.state = 'recording' }
  stop() { this.state = 'inactive'; this.onstop?.() }
}

function fakeStream() {
  return {
    getAudioTracks: () => [{
      applyConstraints: async (c) => { applied.push(c) },
      getSettings: () => ({ sampleRate: 48000, echoCancellation: true }),
      stop: () => {},
    }],
    getTracks: () => [{ stop: () => {} }],
  }
}

beforeEach(() => {
  gumCalls = []; applied = []; recorderOpts = []
  vi.stubGlobal('MediaRecorder', FakeMediaRecorder)
  vi.stubGlobal('navigator', {
    mediaDevices: {
      getUserMedia: async (c) => { gumCalls.push(c); return fakeStream() },
      enumerateDevices: async () => [],
    },
  })
  // No AudioContext: the meter is optional and must stay optional.
  vi.stubGlobal('window', {})
  vi.stubGlobal('requestAnimationFrame', () => 0)
  vi.stubGlobal('cancelAnimationFrame', () => {})
})

describe('capture profile', () => {
  it('asks for the voice-processed chain by default', async () => {
    const rec = useTapRecorder()
    await rec.start()
    expect(gumCalls[0].audio).toMatchObject({
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    })
    expect(rec.profile.value).toBe('voice')
  })

  it('never contradicts itself in the follow-up applyConstraints', async () => {
    // A second call that disagreed with the first would tear the audio unit
    // down and rebuild it as the other one — the whole change, undone one line
    // after it was made.
    for (const name of Object.keys(CAPTURE_PROFILES)) {
      gumCalls = []; applied = []
      await useTapRecorder().start(null, name)
      expect(applied[0]).toMatchObject(CAPTURE_PROFILES[name])
      expect(gumCalls[0].audio.echoCancellation).toBe(applied[0].echoCancellation)
    }
  })

  it('still gives the dry tap to anyone who asks for it', async () => {
    const rec = useTapRecorder()
    await rec.start(null, 'dry')
    expect(gumCalls[0].audio).toMatchObject({
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    })
    expect(rec.profile.value).toBe('dry')
  })

  it('falls back to the default rather than an undefined constraint set', async () => {
    const rec = useTapRecorder()
    await rec.start(null, 'nonsense')
    expect(gumCalls[0].audio.echoCancellation).toBe(CAPTURE_PROFILES[DEFAULT_CAPTURE_PROFILE].echoCancellation)
    expect(rec.profile.value).toBe(DEFAULT_CAPTURE_PROFILE)
  })

  it('reports the profile alongside what the browser actually gave back', async () => {
    const rec = useTapRecorder()
    await rec.start(null, 'voice')
    expect(rec.appliedSettings.value.profile).toBe('voice')
    expect(rec.appliedSettings.value.sampleRate).toBe(48000)
  })

  it('encodes every take at the full bitrate', async () => {
    await useTapRecorder().start()
    expect(recorderOpts[0].audioBitsPerSecond).toBe(CAPTURE_BITRATE)
  })
})
