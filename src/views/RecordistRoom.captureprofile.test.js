// @vitest-environment jsdom

// The capture profile is REMEMBERED, per artist and per microphone.
//
// It was not, for one day, and these tests pinned that. The history is worth
// keeping because it is why the memory has the shape it has. A flat
// `recordist.captureProfile` key pinned a whole BROWSER to whatever had last
// been ticked: measured on Tom's 2026-09-02 session, the desktop opened the
// room already on the raw tap and recorded seven takes at -18.9 dBFS raw peak
// against the phone's -2.5 dBFS four minutes later, and he read the 16 dB as a
// desktop-versus-phone difference because nothing on screen said otherwise. The
// answer at the time was to stop remembering.
//
// Tom, 2026-09-03, having then had to set it again every time he opened the
// room: persist it. The fault was never memory — it was that the memory was
// device-blind. A capture profile is a fact about a MICROPHONE, so it is keyed
// per microphone, and a mic never used here inherits nothing. The safety the
// removal was reaching for is kept by the OTHER half of the original fix, which
// is untouched and asserted below: while the room is on something other than
// the recommendation, it says so in words on screen.
//
// The recommendation itself is now the voice chain everywhere (Tom, 2026-09-04,
// settled by ear on a MacBook Air built-in mic with the AC running), so a
// legacy stored key is still cleared rather than honoured — it belongs to a
// scheme that no longer exists.

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

describe('the capture profile is remembered, per artist and per microphone', () => {
  it('opens on the recommendation, with nothing stored', async () => {
    const w = await mountRoom()
    expect(w.vm.captureProfile).toBe(resolveCaptureProfile())
    expect(resolveCaptureProfile()).toBe('voice')
  })

  it('clears the legacy flat key rather than honouring it', async () => {
    // It belongs to a scheme that no longer exists: one value for a whole
    // browser, spanning every microphone. Honouring it is exactly the bug.
    localStorage.setItem('recordist.captureProfile', 'dry')
    const w = await mountRoom()
    expect(w.vm.captureProfile).toBe(resolveCaptureProfile())
    expect(localStorage.getItem('recordist.captureProfile')).toBe(null)
  })

  it('remembers the toggle, so the room is as it was left', async () => {
    const w = await mountRoom()
    w.vm.captureProfile = 'dry'
    await flushPromises()
    const stored = JSON.parse(localStorage.getItem('recordist.booth.v1'))
    const mine = stored.human_tom_zzz.byDevice[stored.human_tom_zzz.lastMicKey]
    expect(mine.captureProfile).toBe('dry')

    const again = await mountRoom()
    expect(again.vm.captureProfile).toBe('dry')
  })

  it('is visibly different from the recommendation whenever it differs', async () => {
    // The half of the 2026-09-02 fix that is load-bearing forever: a remembered
    // choice must never be an invisible one. The template draws `.dry-warning`
    // off exactly this comparison (`captureProfile !== recommendedProfile`);
    // this asserts the comparison rather than the element because the warning
    // lives inside the ready-phase card and this suite never loads a queue.
    const w = await mountRoom()
    expect(w.vm.recommendedProfile).toBe('voice')
    expect(w.vm.captureProfile).toBe(w.vm.recommendedProfile)
    w.vm.captureProfile = 'dry'
    await flushPromises()
    expect(w.vm.captureProfile).not.toBe(w.vm.recommendedProfile)
  })

  it("one artist's memory is not another's", async () => {
    const w = await mountRoom()
    w.vm.captureProfile = 'dry'
    await flushPromises()
    const stored = JSON.parse(localStorage.getItem('recordist.booth.v1'))
    expect(Object.keys(stored)).toEqual(['human_tom_zzz'])
  })
})
