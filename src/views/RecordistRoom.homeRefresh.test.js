// @vitest-environment jsdom
/**
 * Aran, 2026-10-15 17:09 BST (job #829): on his Chromebook "What I'm doing" still did not list
 * "New Welsh — North: whole sentences" after #823, though #823's render of his live summary did.
 * He has hundreds of takes for that section still uploading from the device, so it reads as
 * finished there. Reproduced here: a kept home that lacks the section, a summary read that fails
 * (the API restarting after a deploy), then the read that works — with every line of the section
 * still uploading on the device.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'

const unsent = vi.hoisted(() => ({ set: null }))

vi.mock('@/composables/useRecordistQueue', async () => {
  const { ref: r, reactive: re } = await import('vue')
  unsent.set = re(new Set())
  return {
    DURABLE_TAKES_FEATURE: 'durable-take-store-2026-09-03',
    useRecordistQueue: () => ({
      persistent: r(true), carriedOverCount: r(0), refusedCount: r(0), refusedTakes: r([]),
      isUnsent: (id) => unsent.set.has(id), attach: vi.fn(), teardown: vi.fn(), reconcile: vi.fn(),
      queueTake: vi.fn(), markFailed: vi.fn(),
      pendingCount: r(0), savedCount: r(0), failedCount: r(0),
      saved: new Map(), failed: new Map(), unsentLines: unsent.set,
      flush: vi.fn(), retryFailed: vi.fn(),
    }),
  }
})

vi.mock('@/composables/useTapRecorder', () => ({
  DEFAULT_CAPTURE_PROFILE: 'voice',
  resolveCaptureProfile: () => 'dry',
  useTapRecorder: () => ({
    isRecording: ref(false), level: ref(0), clipping: ref(false),
    devices: ref([]), appliedSettings: ref({}), profile: ref('voice'), error: ref(null),
    lineHasSpeech: ref(false), quietMs: ref(0), meterTrusted: ref(true),
    inputPeak: ref(0), roomTone: ref(0.001),
    listDevices: vi.fn(), start: vi.fn().mockResolvedValue(undefined),
    awaitLeadIn: vi.fn().mockResolvedValue(1200), activeAgeMs: () => 1200,
    beginLine: vi.fn(), endLine: vi.fn(), discardLine: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock('./recordist/BoothTeamStats.vue', () => ({ default: { render: () => null } }))

import RecordistRoom from './RecordistRoom.vue'

const VOICE = 'human_tom_zzz'
const SEED = 'seed.cym_nv2_for_eng'
const podTrack = { key: 'pod.health', kind: 'pod', courseCode: 'cym_n_for_eng', podSlug: 'health', podTitle: 'Health', total: 10, recorded: 10, batches: [{ n: 1, from: 1, to: 10, total: 10, recorded: 10 }] }
const seedTrack = { key: SEED, kind: 'seed', courseCode: 'cym_nv2_for_eng', newCourse: true, total: 100, recorded: 0, batches: [{ n: 1, from: 1, to: 100, total: 100, recorded: 0 }] }
const summary = (tracks) => ({ home: true, fresh: true, displayName: 'Tom', language: 'cym', languageName: 'Welsh', tracks })

let summaryAnswers
function stub() {
  global.fetch = vi.fn().mockImplementation(async (url) => {
    const u = String(url)
    if (u.includes('/summary')) {
      const next = summaryAnswers.length > 1 ? summaryAnswers.shift() : summaryAnswers[0]
      if (next instanceof Error) throw next
      return { ok: true, status: 200, json: async () => next }
    }
    if (u.includes('/rerecord')) return { ok: true, status: 200, json: async () => ({ fresh: true, total: 0, items: [], recordedAlso: [] }) }
    return { ok: true, status: 200, json: async () => ({ displayName: 'Tom', languageName: 'Welsh', total: 0, recorded: 0, remaining: 0, lines: [] }) }
  })
}

beforeEach(() => {
  unsent.set.clear()
  for (const k of Object.keys(localStorage)) localStorage.removeItem(k)
  window.history.pushState({}, '', '/')
  window.innerWidth = 1280
  // EVERY line of the section read on this device and still going up (#791), placed by batch.
  const places = {}
  for (let i = 0; i < 100; i++) { unsent.set.add(`seed:s${i}:target1`); places[`seed:s${i}:target1`] = [SEED, 1, false] }
  localStorage.setItem(`booth.home.places.${VOICE}`, JSON.stringify(places))
  // THE KEPT HOME, from before the section was in it.
  localStorage.setItem(`booth.home.summary.${VOICE}`, JSON.stringify({ at: Date.now(), data: summary([podTrack]) }))
})
afterEach(() => { vi.useRealTimers() })

describe('the kept home never outlives a failed read (job #829)', () => {
  it('a failed summary read is asked again, and the fresh answer replaces the kept home — the finished-on-device section is listed', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    summaryAnswers = [new TypeError('Failed to fetch'), summary([podTrack, seedTrack])]
    stub()
    const w = mount(RecordistRoom, { props: { voiceId: VOICE } })
    await flushPromises(); await flushPromises()
    // The kept home is up at once, without the section.
    expect(w.find('[data-test="tick-pod.health"]').exists()).toBe(true)
    expect(w.find(`[data-test="tick-${SEED}"]`).exists()).toBe(false)
    await vi.advanceTimersByTimeAsync(5000)
    await flushPromises(); await flushPromises()
    const row = w.find(`[data-test="tick-${SEED}"]`)
    expect(row.exists()).toBe(true)
    expect(row.text()).toContain('✓ all 100 read · 100 still uploading')
    // And on the left as a finished row, since it is ticked.
    expect(w.find(`[data-test="finished-${SEED}"]`).exists()).toBe(true)
    // The device keeps the fresh one, so the next arrival draws it.
    expect(JSON.parse(localStorage.getItem(`booth.home.summary.${VOICE}`)).data.tracks.map(t => t.key)).toContain(SEED)
    w.unmount()
  })

  it('a read that works replaces the kept home at once', async () => {
    summaryAnswers = [summary([podTrack, seedTrack])]
    stub()
    const w = mount(RecordistRoom, { props: { voiceId: VOICE } })
    await flushPromises(); await flushPromises()
    expect(w.find(`[data-test="tick-${SEED}"]`).text()).toContain('✓ all 100 read · 100 still uploading')
    w.unmount()
  })
})
