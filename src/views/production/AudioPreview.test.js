// Audio preview page: the honest thing to test is what a person actually does
// with it — open it, see clips with their text, tap one, and have exactly one
// clip audible. Mounted against fixtures shaped like the live
// /audio-preview/clips payload (captured from fra_for_eng on 2026-08-05).
//
// The label assertions are not cosmetic: no per-clip veracity verdict is
// persisted, so a build that starts claiming a clip "passed" is a correctness
// regression, not a copy change. That is what the last test guards.
//
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import AudioPreview from './AudioPreview.vue'

vi.mock('@/services/api', () => ({ getApiUrl: () => 'http://api.test' }))

const push = vi.fn()
const replace = vi.fn()
vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {} }),
  useRouter: () => ({ push, replace }),
}))

const CLIPS = [
  {
    id: 'clip-a',
    courseCode: 'fra_for_eng',
    text: "je n'aime pas prendre le temps pour expliquer",
    role: 'target2',
    voiceId: 'xai_leo',
    origin: 'tts',
    legoId: null,
    durationMs: 2160,
    createdAt: '2026-08-04T23:46:05.802792+00:00',
    gateState: 'gate-era',
    audioUrlPath: '/api/production/fra_for_eng/audio/clip-a/url',
  },
  {
    id: 'clip-b',
    courseCode: 'fra_for_eng',
    text: 'she always insisted',
    role: 'known',
    voiceId: 'xai_leo',
    origin: 'tts',
    legoId: null,
    durationMs: 1080,
    createdAt: '2026-08-03T15:38:51.663001+00:00',
    gateState: 'pre-gate',
    audioUrlPath: '/api/production/fra_for_eng/audio/clip-b/url',
  },
]

const GATE = {
  liveFrom: '2026-08-04T23:00:00.000Z',
  perClipVerdictsPersisted: false,
  note: 'No per-clip veracity verdict is stored.',
}

function jsonResponse (body) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve(body) })
}

beforeEach(() => {
  push.mockClear()
  replace.mockClear()
  localStorage.clear()
  // jsdom has no media stack; play() is undefined on HTMLMediaElement there.
  HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined)
  HTMLMediaElement.prototype.pause = vi.fn()

  global.fetch = vi.fn((url) => {
    if (url.includes('/audio-preview/clips')) {
      return jsonResponse({ clips: CLIPS, total: 252, hasMore: true, filter: 'recent', gate: GATE })
    }
    if (url.includes('/audio-preview/sample')) {
      return jsonResponse({ clips: CLIPS, total: 252, filter: 'recent', gate: GATE })
    }
    if (url.includes('/audio-preview/quarantine')) {
      return jsonResponse({ entries: [], ledgerPresent: true, unparsedLines: 0 })
    }
    if (url.includes('/api/courses')) {
      return jsonResponse([{ code: 'fra_for_eng' }, { code: 'deu_for_eng' }])
    }
    if (url.includes('/audio/') && url.endsWith('/url')) {
      return jsonResponse({ url: 'https://s3.test/mastered/X.mp3' })
    }
    return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) })
  })
})

async function mountPage () {
  const wrapper = mount(AudioPreview, { props: { courseCode: 'fra_for_eng' } })
  await flushPromises()
  await flushPromises()
  return wrapper
}

describe('AudioPreview', () => {
  it('lists clips with the phrase text leading', async () => {
    const wrapper = await mountPage()
    const text = wrapper.text()
    expect(text).toContain("je n'aime pas prendre le temps pour expliquer")
    expect(text).toContain('she always insisted')
    expect(wrapper.findAll('audio')).toHaveLength(2)
  })

  it('plays only one clip at a time', async () => {
    const wrapper = await mountPage()
    const audios = wrapper.findAll('audio')

    await audios[0].trigger('play')
    await flushPromises()
    await audios[1].trigger('play')
    await flushPromises()

    // Starting the second clip must stop the first — the whole point of a
    // listening pass is hearing one thing.
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled()
    expect(wrapper.vm.playingId).toBe('clip-b')
  })

  it('fetches signed URLs lazily, not one per row up front', async () => {
    await mountPage()
    const urlCalls = global.fetch.mock.calls
      .filter(([u]) => typeof u === 'string' && u.endsWith('/url'))
    // The page primes the first screenful only; with 2 fixtures that is both,
    // but it must never be a fetch storm keyed off `total` (252 here).
    expect(urlCalls.length).toBeLessThanOrEqual(CLIPS.length)
  })

  it('draws a random sample and starts it playing', async () => {
    const wrapper = await mountPage()
    await wrapper.find('[data-walk="audio-preview-random-sample"]').trigger('click')
    await flushPromises()

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/audio-preview/sample?filter=recent&n=20'),
      expect.anything()
    )
    expect(wrapper.vm.sampleMode).toBe(true)
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled()
    expect(wrapper.text()).toContain('Stop')
  })

  it('never claims a clip passed the veracity gate', async () => {
    const wrapper = await mountPage()
    const text = wrapper.text().toLowerCase()
    expect(text).toContain('rendered under the gate')
    expect(text).toContain('never')
    expect(text).not.toMatch(/passed the (veracity )?gate/)
    expect(text).not.toMatch(/\bverified clean\b/)
  })

  it('carries the walkthrough anchors a future walk points at', async () => {
    const wrapper = await mountPage()
    for (const id of ['audio-preview-course-picker', 'audio-preview-filter',
      'audio-preview-play-first', 'audio-preview-random-sample']) {
      expect(wrapper.find(`[data-walk="${id}"]`).exists()).toBe(true)
    }
  })
})
