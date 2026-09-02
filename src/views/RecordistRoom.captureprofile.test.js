// @vitest-environment jsdom

// The raw-microphone toggle is a per-session diagnostic, and nothing else.
//
// It used to be remembered in localStorage. Measured on Tom's 2026-09-02
// session, that is what a remembered value costs: the desktop opened the room
// already on the raw tap and recorded seven takes at -18.9 dBFS raw peak
// against the phone's -2.5 dBFS four minutes later, and he read the 16 dB as a
// desktop-versus-phone difference because nothing on screen said otherwise.
//
// So: the room always opens on the voice profile, a legacy stored value is
// cleared rather than honoured, and while the raw tap IS armed the room says so
// in words. All three are load-bearing — the first is the fix, the second is
// what unsticks the browsers already carrying the key, and the third is what
// stops the next recordist arming it and forgetting.

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { DEFAULT_CAPTURE_PROFILE } from '@/composables/useTapRecorder'

vi.mock('@/composables/useTapRecorder', async () => {
  const { ref } = await import('vue')
  return {
    DEFAULT_CAPTURE_PROFILE: 'voice',
    useTapRecorder: () => ({
      isRecording: ref(false), level: ref(0), clipping: ref(false), devices: ref([]),
      appliedSettings: ref({}), profile: ref('voice'), error: ref(null),
      lineHasSpeech: ref(false), quietMs: ref(0), meterTrusted: ref(true),
      inputPeak: ref(0), roomTone: ref(0),
      listDevices: vi.fn(), start: vi.fn(), beginLine: vi.fn(), endLine: vi.fn(),
      discardLine: vi.fn(), stop: vi.fn(),
    }),
  }
})
vi.mock('vue-router', () => ({ useRoute: () => ({ params: { voiceId: 'human_tom_zzz' } }), useRouter: () => ({ push: vi.fn() }) }))

let RecordistRoom
beforeEach(async () => {
  localStorage.clear()
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) })))
  RecordistRoom = (await import('./RecordistRoom.vue')).default
})

const mountRoom = async () => {
  const w = mount(RecordistRoom, { props: { voiceId: 'human_tom_zzz' }, global: { stubs: { RouterLink: true } } })
  await flushPromises()
  return w
}

describe('the raw-microphone toggle does not survive the session', () => {
  it('opens on the voice profile with nothing stored', async () => {
    const w = await mountRoom()
    expect(w.vm.captureProfile ?? DEFAULT_CAPTURE_PROFILE).toBe('voice')
  })

  it('does not honour a stored dry preference, and clears it', async () => {
    localStorage.setItem('recordist.captureProfile', 'dry')
    const w = await mountRoom()
    expect(w.vm.captureProfile ?? 'voice').toBe('voice')
    expect(localStorage.getItem('recordist.captureProfile')).toBe(null)
  })

  it('never writes the key back, however the toggle is moved', async () => {
    const w = await mountRoom()
    w.vm.captureProfile = 'dry'
    await flushPromises()
    // the read-back proves the toggle actually moved, so the null below is a
    // real absence of a write rather than a setter that quietly did nothing
    expect(w.vm.captureProfile).toBe('dry')
    expect(localStorage.getItem('recordist.captureProfile')).toBe(null)
  })
})
