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
    return { ok: false, status: 404, json: async () => ({ error: 'not in this test' }) }
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

  // Kai and Aran, 2026-10-16 (job #247): an actor is shown only what we put in their queue —
  // never "See your other lines", the door to Dan's ~2,456-line cast backlog.
  it('no next pod but other lines owed → pods done, and NO way to the rest', async () => {
    serve({ recorded: true, podsDone: { nextPod: null, remainingOutsidePods: 1291 } })
    const w = await openBooth()
    expect(w.find('[data-test="pods-all-done"]').text()).toBe('All your pods are done — thank you')
    expect(w.find('[data-test="other-lines"]').exists()).toBe(false)
    expect(w.text()).not.toContain('See your other lines')
  })

  // Job #247: Dan's controlled queue — Pod 1, then the 206 seed sentences (booth-actor-queue.cjs).
  const SEEDS = { step: 'seeds', title: 'Seed sentences', label: 'Seed sentences (206)', courseCode: 'cym_s_for_eng', podSlug: null, remaining: 206 }
  const POD1 = { step: 'pod-1', title: 'Pod 1', label: 'Pod 1', courseCode: 'cym_s_for_eng', podSlug: 'pod-1', remaining: 28 }

  it('a controlled queue: the header names the step ("Pod 1 · 2 left")', async () => {
    serve({ recorded: false, podsDone: { current: POD1, nextPod: SEEDS, remainingOutsidePods: 0 } })
    const w = await openBooth()
    expect(w.find('[data-test="batch-where"]').text()).toBe('Pod 1 · 2 left')
  })

  it('Pod 1 finished → "Next: Seed sentences (206)", which opens the seeds step', async () => {
    serve({ recorded: true, podsDone: { current: POD1, nextPod: SEEDS, remainingOutsidePods: 0 } })
    const w = await openBooth()
    const btn = w.find('[data-test="next-pod"]')
    expect(btn.text()).toBe('Next: Seed sentences (206) →')
    await btn.trigger('click')
    await flushPromises(); await flushPromises()
    const at = new URLSearchParams(window.location.search)
    expect(at.get('step')).toBe('seeds')
    expect(at.get('pod')).toBe(null)
    expect(asked.some(u => u.includes('&step=seeds'))).toBe(true)
  })

  // Eleri, 2026-10-23: a finished practice-phrase step leads on to the plan's NEXT BATCH, opened
  // by its home-screen address, not back to the step link (which serves the same batch again).
  it('phrase step finished → "Next: …batch 4 (193)", which opens track=phrase.1&batch=4', async () => {
    const BATCH4 = { step: 'sv2-phrases', title: 'New course: practice phrases', label: 'New course: practice phrases, pass 1 batch 4 (193)', courseCode: 'cym_sv2_for_eng', podSlug: null, track: 'phrase.1', batch: 4, remaining: 193 }
    serve({ recorded: true, podsDone: { current: POD1, nextPod: BATCH4, remainingOutsidePods: 0 } })
    const w = await openBooth()
    const btn = w.find('[data-test="next-pod"]')
    expect(btn.text()).toBe('Next: New course: practice phrases, pass 1 batch 4 (193) →')
    await btn.trigger('click')
    await flushPromises(); await flushPromises()
    const at = new URLSearchParams(window.location.search)
    expect(at.get('track')).toBe('phrase.1')
    expect(at.get('batch')).toBe('4')
    expect(at.get('step')).toBe(null)
    expect(at.get('pod')).toBe(null)
    expect(at.get('course')).toBe(null)
  })

  it('lines still owed in the pod → Start as before, no next-pod button', async () => {
    serve({ recorded: false, podsDone: { nextPod: NEXT, remainingOutsidePods: 0 } })
    const w = await openBooth()
    expect(w.find('[data-test="next-pod"]').exists()).toBe(false)
    expect(w.text()).toContain('Start recording')
  })
})
