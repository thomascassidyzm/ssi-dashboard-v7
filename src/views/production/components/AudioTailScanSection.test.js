// The tail-scan section: what a reviewer actually does with it — start a scan,
// watch it, read the per-voice calibration table, play a flagged clip, and send
// it to repair.
//
// The copy assertions are NOT cosmetic. This detector flags a TRIM, and on the
// listened-to set 4 flags in 20 were harmless; a screen that shows the count
// without that sentence turns triage into a damage report by the second time
// somebody quotes it. Same for the per-voice rate, which is how a reviewer tells
// an uncalibrated voice from real damage.
//
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import AudioTailScanSection from './AudioTailScanSection.vue'

vi.mock('@/services/api', () => ({ getApiUrl: () => 'http://api.test' }))

const DONE_JOB = {
  jobId: 'j1',
  courseCode: 'deu_for_eng',
  status: 'done',
  scope: { maxSeedNumber: 1, role: null, concurrency: 2 },
  startedAt: '2026-08-06T02:00:00.000Z',
  progress: { phase: 'done', done: 74, total: 74 },
  detector: { name: 'edge-shape', version: '2026-08-06', precision: 0.8 },
  flagMeaning: { headline: 'A flag means the clip was TRIMMED.' },
  totals: {
    flagged: 22, flaggedByTail: 3, flaggedByDuration: 20,
    measured: 74, measureFailures: 0, excludedUnrendered: 0, reported: 22, truncated: 0,
  },
  tailByVoice: {
    ara: { measured: 23, flagged: 1, failed: 0, flagRate: 0.0435 },
    eve: { measured: 28, flagged: 2, failed: 0, flagRate: 0.0714 },
    hot: { measured: 10, flagged: 9, failed: 0, flagRate: 0.9 },
  },
}

const REPORT = {
  ...DONE_JOB,
  matched: 1,
  items: [{
    audioId: 'f0404e5d',
    text: 'to speak German with you',
    role: 'target1',
    voiceId: 'eve',
    durationMs: 1176,
    revision: 1,
    categories: ['tail-truncation', 'duration'],
    detector: { flagged: true, reason: '21% shorter than its text implies', score: 0.79 },
    tail: {
      flagged: true, category: 'tail-truncation',
      reason: 'the shape of a trim, not an ending',
      shape: { fallRate: 1.23, zeroPadPct: 86.5, fallMs: 21 },
    },
    url: '/api/audio/repair/deu_for_eng/f0404e5d/current-audio',
  }],
}

/** Routes fetch by path, so a test can answer each surface independently. */
function stubFetch (routes) {
  global.fetch = vi.fn(async (url) => {
    for (const [match, body] of routes) {
      if (String(url).includes(match)) {
        const status = body.__status || 200
        return { ok: status < 400, status, json: async () => body }
      }
    }
    return { ok: true, status: 200, json: async () => ({ jobs: [] }) }
  })
}

const mountSection = () => mount(AudioTailScanSection, { props: { courseCode: 'deu_for_eng' } })

describe('tail-scan section', () => {
  beforeEach(() => { vi.restoreAllMocks() })

  it('says what a flag means before it shows a single count', async () => {
    stubFetch([['/jobs', { jobs: [] }]])
    const w = mountSection()
    await flushPromises()
    const text = w.text()
    expect(text).toMatch(/A flag means the clip was TRIMMED/)
    expect(text).toMatch(/16 were audibly damaged and 4 were trimmed harmlessly/)
    expect(text).toMatch(/never passes, repairs or deletes audio/)
  })

  it('adopts a finished scan the API still holds, so the page is never falsely empty', async () => {
    stubFetch([
      ['/report', REPORT],
      ['/jobs', { jobs: [DONE_JOB], detector: DONE_JOB.detector }],
    ])
    const w = mountSection()
    await flushPromises()
    await flushPromises()
    expect(w.text()).toMatch(/to speak German with you/)
  })

  it('shows the two detectors as separate counts, never one merged score', async () => {
    stubFetch([['/report', REPORT], ['/jobs', { jobs: [DONE_JOB] }]])
    const w = mountSection()
    await flushPromises(); await flushPromises()
    const text = w.text()
    expect(text).toMatch(/3\s*trimmed \(edge shape\)/)
    expect(text).toMatch(/20\s*short for its text \(duration\)/)
    expect(text).toMatch(/never added together/)
    // The flagged clip carries both badges rather than one blended verdict.
    expect(text).toMatch(/the shape of a trim, not an ending/)
    expect(text).toMatch(/21% shorter than its text implies/)
  })

  it('puts the per-voice flag rate up front and marks the outlier for the ear', async () => {
    stubFetch([['/report', REPORT], ['/jobs', { jobs: [DONE_JOB] }]])
    const w = mountSection()
    await flushPromises(); await flushPromises()
    const text = w.text()
    expect(text).toMatch(/Flag rate per voice — read this first/)
    expect(text).toMatch(/90\.0%/)
    expect(text).toMatch(/verify by ear before trusting/)
    // The calm voices are not marked.
    expect(text.match(/verify by ear before trusting/g)).toHaveLength(1)
  })

  it('gives every flagged clip a player and a route into the repair flow', async () => {
    stubFetch([['/report', REPORT], ['/jobs', { jobs: [DONE_JOB] }]])
    const w = mountSection()
    await flushPromises(); await flushPromises()
    expect(w.find('audio').attributes('src'))
      .toBe('http://api.test/api/audio/repair/deu_for_eng/f0404e5d/current-audio')
    await w.findAll('button').find(b => b.text() === 'Open in repair').trigger('click')
    expect(w.emitted('select-clip')[0][0].audioId).toBe('f0404e5d')
  })

  it('asks before scanning a whole course, and scopes without asking', async () => {
    stubFetch([['/tail-scan/deu_for_eng', { ...DONE_JOB, status: 'running' }], ['/jobs', { jobs: [] }]])
    const w = mountSection()
    await flushPromises()
    const run = () => w.findAll('button').find(b => b.text() === 'Run scan')

    await run().trigger('click')
    expect(w.text()).toMatch(/Scan the WHOLE course\?/)
    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('/api/audio/tail-scan/deu_for_eng'), expect.objectContaining({ method: 'POST' }))

    await w.findAll('button').find(b => b.text().includes('Cancel')).trigger('click')
    await w.find('input[type="number"]').setValue('2')
    await run().trigger('click')
    await flushPromises()
    const posted = global.fetch.mock.calls.find(c => c[1]?.method === 'POST')
    expect(JSON.parse(posted[1].body)).toMatchObject({ maxSeedNumber: 2 })
  })

  it('tells a reviewer a restart LOST the scan rather than that it failed', async () => {
    stubFetch([
      ['/tail-scan/deu_for_eng', { ...DONE_JOB, status: 'running' }],
      ['/jobs/j1', { __status: 404, error: 'no scan job j1', code: 'unknown_job' }],
      ['/jobs', { jobs: [] }],
    ])
    // Fake timers from the start, so the poll can be driven rather than waited on.
    vi.useFakeTimers()
    try {
      const w = mountSection()
      await flushPromises()
      await w.find('input[type="number"]').setValue('1')
      await w.findAll('button').find(b => b.text() === 'Run scan').trigger('click')
      await flushPromises()

      vi.advanceTimersByTime(2000)
      await flushPromises(); await flushPromises()

      expect(w.text()).toMatch(/it restarted while the scan was running/)
      expect(w.text()).toMatch(/Nothing was written/)
    } finally {
      vi.useRealTimers()
    }
  })
})
