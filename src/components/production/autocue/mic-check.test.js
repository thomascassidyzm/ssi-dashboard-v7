// @vitest-environment jsdom
//
// The mic check as the recordist meets it: the two steps in order, the verdict,
// what a skip does, and — the one that matters most — that a failure is not a
// wall. Everything here drives the real component and the real composable; only
// the microphone is fake.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import MicCheck from './MicCheck.vue'
import { useVAD } from '@/composables/useVAD'

// A mic that idles quietly and speaks when told to.
function fakeAudioGraph() {
  const state = { amplitude: 0.001 }
  const analyser = {
    fftSize: 256,
    smoothingTimeConstant: 0.5,
    frequencyBinCount: 128,
    getFloatTimeDomainData(out) {
      for (let i = 0; i < out.length; i++) out[i] = state.amplitude * Math.sin((2 * Math.PI * 8 * i) / out.length)
    },
    getByteFrequencyData(out) { out.fill(110) }
  }
  global.AudioContext = class {
    createAnalyser() { return analyser }
    createMediaStreamSource() { return { connect() {} } }
    close() {}
  }
  return state
}

const FAKE_STREAM = {
  getTracks: () => [],
  getAudioTracks: () => [{ label: 'Test Mic', getSettings: () => ({ deviceId: 'dev-1' }) }]
}

// Let the component's timers and the VAD's poll loop run together.
async function tick(ms) {
  for (let t = 0; t < ms; t += 50) await vi.advanceTimersByTimeAsync(50)
  await flushPromises()
}

describe('MicCheck', () => {
  let audio, vad

  beforeEach(async () => {
    vi.useFakeTimers()
    audio = fakeAudioGraph()
    globalThis.localStorage?.clear?.()
    vad = useVAD()
    await vad.startListening(FAKE_STREAM)
  })

  afterEach(() => {
    vad.stopListening()
    vi.useRealTimers()
    delete global.AudioContext
  })

  it('asks for the room, then for the voice, and gives a verdict', async () => {
    const w = mount(MicCheck, { props: { existingVad: vad, stream: FAKE_STREAM } })
    expect(w.text()).toContain('Check your microphone')

    w.find('.mc-go').trigger('click')
    await flushPromises()
    expect(w.text()).toContain('Say nothing for a moment')

    await tick(2100)
    expect(w.text()).toContain('Now say something')
    audio.amplitude = 0.3      // the recordist speaks

    await tick(3100)
    expect(w.text()).toContain('Microphone is good')
    // The verdict carries the number it was reckoned from.
    expect(w.text()).toMatch(/\d+dB above your room/)
    expect(w.emitted('done')).toBeFalsy()   // not until they press Done
    w.find('.mc-go').trigger('click')
    expect(w.emitted('done')).toBeTruthy()
  })

  it('a mic that hears no voice fails loudly, and says what will be used instead', async () => {
    const w = mount(MicCheck, { props: { existingVad: vad, stream: FAKE_STREAM } })
    w.find('.mc-go').trigger('click')
    await flushPromises()
    await tick(5200)             // never raises amplitude — nobody speaks

    expect(w.text()).toContain('Mic check did not finish')
    expect(w.text()).toContain('standard silence setting')
    // The escape hatch is on screen, not buried.
    expect(w.findAll('button').some(b => b.text() === 'Carry on without it')).toBe(true)
  })

  it('skipping emits skip and stores nothing', async () => {
    const w = mount(MicCheck, { props: { existingVad: vad, stream: FAKE_STREAM } })
    w.find('.mc-skip').trigger('click')
    expect(w.emitted('skip')).toBeTruthy()
    expect(globalThis.localStorage.getItem('ssi.micCalibration.v1')).toBeNull()
  })

  it('remembers the result against the device, and shows it next time', async () => {
    const first = mount(MicCheck, { props: { existingVad: vad, stream: FAKE_STREAM } })
    first.find('.mc-go').trigger('click')
    await flushPromises()
    await tick(2100)
    audio.amplitude = 0.3
    await tick(3100)

    const stored = JSON.parse(globalThis.localStorage.getItem('ssi.micCalibration.v1'))
    expect(Object.keys(stored)).toEqual(['id:dev-1'])
    expect(stored['id:dev-1'].label).toBe('Test Mic')
    expect(stored['id:dev-1'].voiceLevel).toBeGreaterThan(0)

    const again = mount(MicCheck, { props: { existingVad: vad, stream: FAKE_STREAM } })
    await flushPromises()
    expect(again.text()).toContain('Last checked today')
    expect(again.text()).toContain('Test Mic')
  })
})
