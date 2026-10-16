// A FINISHED POD LINK CARRIES ON INTO THE NEXT POD.
//
// Kai, 2026-10-16 (job #189): an actor sent a pod link (/r/:voiceId?course=&pod=;
// Dan, cym_s_for_eng pod-1) who has recorded every line of theirs in it used to
// see a dead "Nothing left to read" and wait for a new link. The server now says
// which pod is next (podsDone, booth-next-pod.cjs) and the booth offers it.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/composables/useTapRecorder', () => ({
  DEFAULT_CAPTURE_PROFILE: 'voice',
  resolveCaptureProfile: () => 'voice',
  useTapRecorder: () => ({
    isRecording: ref(false), level: ref(0), clipping: ref(false),
    devices: ref([]), appliedSettings: ref({}), profile: ref('voice'), error: ref(null),
    lineHasSpeech: ref(true), quietMs: ref(0), meterTrusted: ref(true),
    inputPeak: ref(0), roomTone: ref(0.001),
    listDevices: vi.fn(), start: vi.fn().mockResolvedValue(undefined),
    awaitLeadIn: vi.fn().mockResolvedValue(1200), activeAgeMs: () => 1200,
    beginLine: vi.fn(), endLine: vi.fn(), discardLine: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
  }),
}))

import RecordistRoom from './RecordistRoom.vue'

beforeEach(() => { if (typeof localStorage === 'undefined') return; for (const k of Object.keys(localStorage)) if (k.startsWith('recordist.cursor.')) localStorage.removeItem(k) })

const VOICE = 'human_dan_cym_s'
const asked = []

function serve({ recorded, podsDone }) {
  asked.length = 0
  global.fetch = vi.fn(async (url) => {
    const u = String(url)
    asked.push(u)
    if (u.includes(`/api/recording/voice/${VOICE}?`)) {
      const lines = [{ id: 'A' }, { id: 'B' }].map((l, i) => ({
        ...l, text: `line ${l.id}`, order: i + 1, speaker: 'Dan', courseCode: 'cym_s_for_eng', kind: 'pod',
        podSlug: 'pod-1', recorded, clipUrl: recorded ? `/clip/${l.id}.mp3` : null,
      }))
      return { ok: true, status: 200, json: async () => ({
        displayName: 'Dan', languageName: 'Welsh', pod: 'pod-1', podsDone,
        total: 2, recorded: recorded ? 2 : 0, remaining: recorded ? 0 : 2, lines,
      }) }
    }
    throw new Error(`unexpected fetch ${u}`)
  })
}

async function openBooth() {
  window.history.replaceState({}, '', `/r/${VOICE}?course=cym_s_for_eng&pod=pod-1`)
  const w = mount(RecordistRoom, { props: { voiceId: VOICE }, global: { stubs: { RouterLink: { props: ['to'], template: '<a><slot/></a>' } } } })
  await flushPromises(); await flushPromises()
  return w
}

const NEXT = { courseCode: 'cym_s_for_eng', podSlug: 'market', podTitle: 'At the market', remaining: 40 }

describe('RecordistRoom — a finished pod link offers the next pod', () => {
  it('every line recorded → "Next pod: <name>", which loads that pod in the same booth', async () => {
    serve({ recorded: true, podsDone: { nextPod: NEXT, remainingOutsidePods: 0 } })
    const w = await openBooth()
    const btn = w.find('[data-test="next-pod"]')
    expect(btn.exists()).toBe(true)
    expect(btn.text()).toBe('Next pod: At the market →')
    expect(w.text()).not.toContain('Nothing left to read')
    await btn.trigger('click')
    await flushPromises(); await flushPromises()
    expect(new URLSearchParams(window.location.search).get('pod')).toBe('market')
    expect(asked.some(u => u.includes('&pod=market'))).toBe(true)
  })

  it('no next pod and nothing else owed → "All done — thank you"', async () => {
    serve({ recorded: true, podsDone: { nextPod: null, remainingOutsidePods: 0 } })
    const w = await openBooth()
    expect(w.find('[data-test="next-pod"]').exists()).toBe(false)
    expect(w.find('[data-test="pods-all-done"]').text()).toBe('All done — thank you')
    expect(w.find('[data-test="other-lines"]').exists()).toBe(false)
  })

  it('no next pod but other lines owed → pods done, and a way to the rest', async () => {
    serve({ recorded: true, podsDone: { nextPod: null, remainingOutsidePods: 1291 } })
    const w = await openBooth()
    expect(w.find('[data-test="pods-all-done"]').text()).toBe('All your pods are done — thank you')
    expect(w.find('[data-test="other-lines"]').exists()).toBe(true)
  })

  it('lines still owed in the pod → Start as before, no next-pod button', async () => {
    serve({ recorded: false, podsDone: { nextPod: NEXT, remainingOutsidePods: 0 } })
    const w = await openBooth()
    expect(w.find('[data-test="next-pod"]').exists()).toBe(false)
    expect(w.text()).toContain('Start recording')
  })
})
