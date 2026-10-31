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

// Each test is a fresh visit: the booth remembers its line cursor in localStorage per voice
// and batch (booth-cursor.js), and one test's cursor must not open the next test's Start.
beforeEach(() => { if (typeof localStorage === 'undefined') return; for (const k of Object.keys(localStorage)) if (k.startsWith('recordist.cursor.')) localStorage.removeItem(k) })

vi.mock('@/composables/useTapRecorder', async () => {
  const { ref } = await import('vue')
  return {
    DEFAULT_CAPTURE_PROFILE: 'phone',
    // The real one, deliberately: what the room opens on IS this function's
    // answer, so mocking it out would leave the assertions below testing
    // nothing at all.
    resolveCaptureProfile: (await import('@/composables/useTapRecorder')).resolveCaptureProfile,
    useTapRecorder: () => ({
      isRecording: ref(false), level: ref(0), clipping: ref(false), devices: ref([]),
      appliedSettings: ref({}), profile: ref('phone'), error: ref(null),
      lineHasSpeech: ref(false), quietMs: ref(0), meterTrusted: ref(true),
      inputPeak: ref(0), roomTone: ref(0),
      listDevices: vi.fn(), start: vi.fn(), beginLine: vi.fn(), endLine: vi.fn(),
      discardLine: vi.fn(), stop: vi.fn(),
    }),
  }
})
// No vue-router mock: the room injects the router optionally (inject(routerKey, null)), like the other RecordistRoom suites.

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
    expect(resolveCaptureProfile()).toBe('phone')
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
    w.vm.captureProfile = 'pro'
    await flushPromises()
    const stored = JSON.parse(localStorage.getItem('recordist.booth.v1'))
    const mine = stored.human_tom_zzz.byDevice[stored.human_tom_zzz.lastMicKey]
    expect(mine.captureProfile).toBe('pro')

    const again = await mountRoom()
    expect(again.vm.captureProfile).toBe('pro')
  })

  it('is visibly different from the recommendation whenever it differs', async () => {
    // The half of the 2026-09-02 fix that is load-bearing forever: a remembered
    // choice must never be an invisible one. The template draws `.dry-warning`
    // off exactly this comparison (`captureProfile !== recommendedProfile`);
    // this asserts the comparison rather than the element because the warning
    // lives inside the ready-phase card and this suite never loads a queue.
    const w = await mountRoom()
    expect(w.vm.recommendedProfile).toBe('phone')
    expect(w.vm.captureProfile).toBe(w.vm.recommendedProfile)
    w.vm.captureProfile = 'pro'
    await flushPromises()
    expect(w.vm.captureProfile).not.toBe(w.vm.recommendedProfile)
  })

  it("one artist's memory is not another's", async () => {
    const w = await mountRoom()
    w.vm.captureProfile = 'pro'
    await flushPromises()
    const stored = JSON.parse(localStorage.getItem('recordist.booth.v1'))
    expect(Object.keys(stored)).toEqual(['human_tom_zzz'])
  })
})

describe('the booth asks one question about the setup', () => {
  it('shows Phone? and the pro mic choice, and no raw DSP toggles', async () => {
    const w = await mountRoom()
    // the ready-phase card is not rendered without a queue, so assert the source it renders from
    const src = (await import('node:fs')).readFileSync('src/views/RecordistRoom.vue', 'utf8')
    expect(src).toContain('<strong>Phone?</strong>')
    expect(src).toContain('Recording with a professional plugged-in mic')
    expect(src).toContain('Hold at comfortable reading distance so you can clearly see the phone screen. About the distance you hold the phone when texting. iPhone 16 or later for best results.')
    expect(src).not.toContain('Record the raw microphone')
    expect(w.vm.captureProfile).toBe('phone')
  })

  it('maps a remembered legacy profile onto the nearest setup', async () => {
    localStorage.setItem('recordist.booth.v1', JSON.stringify({ human_tom_zzz: { last: { captureProfile: 'dry' }, lastMicKey: null, byDevice: {} } }))
    // whatever shape booth-settings reads, a stored 'dry' must not leave an unknown profile
    const w = await mountRoom()
    expect(['phone', 'pro']).toContain(w.vm.captureProfile)
  })
})

describe('the mic decides the setup unless the recordist has (2026-10-31)', () => {
  it('opens on Popty-chooses, and a remembered default phone record is not a choice', async () => {
    localStorage.setItem('recordist.booth.v1', JSON.stringify({ human_tom_zzz: { lastMicKey: 'label:iPhone Microphone', byDevice: { 'label:iPhone Microphone': { captureProfile: 'phone' } } } }))
    const w = await mountRoom()
    expect(w.vm.setupByHand).toBe(false)
    expect(w.vm.setupToAsk()).toBe('auto')
  })

  it('a remembered pro pick from before detection stays the recordist\'s choice', async () => {
    localStorage.setItem('recordist.booth.v1', JSON.stringify({ human_tom_zzz: { lastMicKey: 'label:Blue Snowball', byDevice: { 'label:Blue Snowball': { captureProfile: 'pro' } } } }))
    const w = await mountRoom()
    expect(w.vm.setupByHand).toBe(true)
    expect(w.vm.setupToAsk()).toBe('pro')
  })

  it('the hand-picked flag is remembered, and "Let Popty choose" clears it', async () => {
    const w = await mountRoom()
    w.vm.setupByHand = true
    w.vm.captureProfile = 'pro'
    await flushPromises()
    const stored = JSON.parse(localStorage.getItem('recordist.booth.v1'))
    expect(stored.human_tom_zzz.byDevice[stored.human_tom_zzz.lastMicKey].setupByHand).toBe(true)
    w.vm.setupByHand = false
    await flushPromises()
    // nothing identified in this test, so Popty's choice is the phone setup
    expect(w.vm.captureProfile).toBe('phone')
    expect(w.vm.setupToAsk()).toBe('auto')
  })
})

describe('the hiss note (2026-10-31)', () => {
  it('speaks only for a flagged take on the line just read, and never on a clean one', async () => {
    const w = await mountRoom()
    w.vm.lastLine = { id: 'L1', text: 'x' }
    w.vm.lastNoise = { lineId: 'L1', result: { verdict: 'clean', reason: 'room 45 dB under the voice' } }
    await flushPromises()
    expect(w.vm.hissNote).toBe(null)
    w.vm.lastNoise = { lineId: 'L1', result: { verdict: 'hiss', reason: 'room is only 22 dB under the voice (after the read)' } }
    await flushPromises()
    expect(w.vm.hissNote).toMatch(/hiss in the quiet after that take/)
    expect(w.vm.hissNote).toMatch(/saved/)
    // a note about an earlier line never shows against a newer one
    w.vm.lastLine = { id: 'L2', text: 'y' }
    await flushPromises()
    expect(w.vm.hissNote).toBe(null)
  })
})
