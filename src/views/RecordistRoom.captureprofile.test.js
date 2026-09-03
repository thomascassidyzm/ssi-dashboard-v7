// @vitest-environment jsdom

// The raw-microphone toggle is a per-session diagnostic, and nothing else.
//
// It used to be remembered in localStorage. Measured on Tom's 2026-09-02
// session, that is what a remembered value costs: the desktop opened the room
// already on the raw tap and recorded seven takes at -18.9 dBFS raw peak
// against the phone's -2.5 dBFS four minutes later, and he read the 16 dB as a
// desktop-versus-phone difference because nothing on screen said otherwise.
//
// So: the room always opens on WHAT THIS DEVICE SHOULD HAVE, a legacy stored
// value is cleared rather than honoured, and while the room is on something
// other than that it says so in words. All three are load-bearing — the first
// is the fix, the second is what unsticks the browsers already carrying the
// key, and the third is what stops the next recordist arming something and
// forgetting.
//
// "Should have" stopped being a constant on 2026-09-03: a phone or a Safari
// device gets the voice chain, a desktop browser that is not Safari gets the
// raw tap, because Aran's Chrome-on-ChromeOS takes through the voice chain came
// back dead above 16 kHz. The invariant these tests exist for is unchanged —
// nothing is remembered, nothing is written back — so it is now asserted
// against resolveCaptureProfile() rather than against the word "voice".

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { resolveCaptureProfile } from '@/composables/useTapRecorder'

vi.mock('@/composables/useTapRecorder', async () => {
  const { ref } = await import('vue')
  return {
    DEFAULT_CAPTURE_PROFILE: 'voice',
    // The real one, deliberately: what the room opens on IS this function's
    // answer, so mocking it out would leave the assertions below testing
    // nothing at all.
    resolveCaptureProfile: (await import('@/composables/useTapRecorder')).resolveCaptureProfile,
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
  it('opens on what this device should have, with nothing stored', async () => {
    const w = await mountRoom()
    expect(w.vm.captureProfile).toBe(resolveCaptureProfile())
  })

  it('does not honour a stored preference, and clears it', async () => {
    // The opposite of whatever this device should have, so the assertion is a
    // real one on every device the suite might run on.
    const other = resolveCaptureProfile() === 'dry' ? 'voice' : 'dry'
    localStorage.setItem('recordist.captureProfile', other)
    const w = await mountRoom()
    expect(w.vm.captureProfile).toBe(resolveCaptureProfile())
    expect(localStorage.getItem('recordist.captureProfile')).toBe(null)
  })

  it('never writes the key back, however the toggle is moved', async () => {
    const w = await mountRoom()
    w.vm.captureProfile = w.vm.captureProfile === 'dry' ? 'voice' : 'dry'
    await flushPromises()
    // the read-back proves the toggle actually moved, so the null below is a
    // real absence of a write rather than a setter that quietly did nothing
    expect(w.vm.captureProfile).not.toBe(resolveCaptureProfile())
    expect(localStorage.getItem('recordist.captureProfile')).toBe(null)
    expect(localStorage.getItem('recordist.captureProfile.v2')).toBe(null)
  })
})
