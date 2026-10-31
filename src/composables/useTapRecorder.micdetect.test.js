// The microphone decides the setup (Tom, 2026-10-31,
// r-2026-10-31-audio-quality-is-a-threshold-not): the phone's own mic keeps the
// phone setup exactly as before; a proper plugged-in mic gets every browser
// processor off; a hand-picked setup is never second-guessed; and plugging or
// unplugging mid-session re-applies the constraints to the live track.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useTapRecorder } from './useTapRecorder'

let gumCalls, applied, label, listeners
class FakeMediaRecorder {
  static isTypeSupported() { return true }
  constructor() { this.state = 'inactive' }
  start() { this.state = 'recording' }
  stop() { this.state = 'inactive'; this.onstop?.() }
}
function fakeStream(audio) {
  const track = {
    get label() { return label },
    applyConstraints: async (c) => { applied.push(c); Object.assign(audio, c) },
    getSettings: () => ({ deviceId: 'dev-1', sampleRate: 48000, channelCount: 1, ...audio }),
    stop: () => {},
  }
  return { getAudioTracks: () => [track], getTracks: () => [track] }
}
beforeEach(() => {
  gumCalls = []; applied = []; label = ''; listeners = {}
  vi.stubGlobal('MediaRecorder', FakeMediaRecorder)
  vi.stubGlobal('navigator', {
    mediaDevices: {
      getUserMedia: async (c) => { gumCalls.push(c); return fakeStream({ ...c.audio }) },
      enumerateDevices: async () => [],
      addEventListener: (ev, fn) => { listeners[ev] = fn },
      removeEventListener: (ev) => { delete listeners[ev] },
    },
  })
  vi.stubGlobal('window', {})
  vi.stubGlobal('requestAnimationFrame', () => 0)
  vi.stubGlobal('cancelAnimationFrame', () => {})
})

const OFF = { echoCancellation: false, noiseSuppression: false, autoGainControl: false }

describe('mic detection decides the capture setup', () => {
  it('a plugged-in USB mic is re-acquired with all three processors off', async () => {
    label = 'Scarlett 2i2 USB'
    const rec = useTapRecorder()
    await rec.start()
    expect(gumCalls).toHaveLength(2)
    expect(gumCalls[1].audio).toMatchObject({ ...OFF, deviceId: { exact: 'dev-1' } })
    expect(rec.profile.value).toBe('pro')
    expect(rec.micKind.value).toBe('external')
    expect(rec.appliedSettings.value).toMatchObject({ profile: 'pro', micKind: 'external', source: 'auto', ...OFF })
  })

  it("the iPhone's own mic keeps the phone setup, acquired once", async () => {
    label = 'iPhone Microphone'
    const rec = useTapRecorder()
    await rec.start()
    expect(gumCalls).toHaveLength(1)
    expect(gumCalls[0].audio).toMatchObject({ echoCancellation: true })
    expect(rec.profile.value).toBe('phone')
    expect(rec.appliedSettings.value).toMatchObject({ micKind: 'builtin', source: 'auto' })
  })

  it('a hand-picked setup is honoured even when the mic says otherwise', async () => {
    label = 'Scarlett 2i2 USB'
    const rec = useTapRecorder()
    await rec.start(null, 'phone')
    expect(gumCalls).toHaveLength(1)
    expect(rec.profile.value).toBe('phone')
    expect(rec.appliedSettings.value).toMatchObject({ source: 'hand', micKind: 'external' })
  })

  it('plugging a mic in mid-session turns the processors off on the live track', async () => {
    label = 'iPhone Microphone'
    const rec = useTapRecorder()
    await rec.start()
    applied = []
    label = 'Shure MV88'
    await listeners.devicechange()
    expect(applied.at(-1)).toMatchObject(OFF)
    expect(rec.profile.value).toBe('pro')
    // and unplugging puts the phone setup back
    label = 'iPhone Microphone'
    await listeners.devicechange()
    expect(applied.at(-1)).toMatchObject({ echoCancellation: true })
    expect(rec.profile.value).toBe('phone')
    await rec.stop()
    expect(listeners.devicechange).toBeUndefined()
  })
})
