// Audio preview page: the honest thing to test is what a person actually does
// with it — open it, see clips with their text, tap one, and have exactly one
// clip audible. Mounted against fixtures shaped like the live
// /audio-preview/clips payload (captured from fra_for_eng on 2026-08-05).
//
// The label assertions are not cosmetic. Each clip now carries a verdict its
// renderer stored on it, and the page's job is to show that verdict and no
// more: a build that renders an unchecked clip as a pass is a correctness
// regression, not a copy change. That is what the verdict tests guard.
//
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import AudioPreview from './AudioPreview.vue'

vi.mock('@/services/api', () => ({ getApiUrl: () => 'http://api.test' }))

const push = vi.fn()
const replace = vi.fn()
// Mutable so a test can mount the page the way a shared link arrives — with
// query params already on the URL.
let routeQuery = {}
vi.mock('vue-router', () => ({
  useRoute: () => ({ query: routeQuery }),
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
    verdict: {
      state: 'passed', checkedAt: '2026-08-05T14:02:11.000Z', checker: 'phase8-generate',
      reason: 'ok', reasonText: 'the words we asked for are in the clip', cer: 0.0125, attempts: 1,
    },
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
    // Rendered long before the gate existed: no check ever ran on it.
    verdict: {
      state: 'unchecked', checkedAt: null, checker: null, reason: null,
      reasonText: 'no quality check has ever run on this clip', cer: null, attempts: null,
    },
    audioUrlPath: '/api/production/fra_for_eng/audio/clip-b/url',
  },
]

// Shaped like the live /audio-preview/missing payload. Two dangling array
// slots and one dangling scalar, with one array column clean — the clean column
// has to keep reporting, because an unprinted zero and an unscanned column look
// identical to a reader.
const MISSING = {
  courseCode: 'fra_for_eng',
  podsScanned: 4,
  slots: [
    {
      courseCode: 'fra_for_eng',
      podId: 'fra_for_eng:pod-1',
      podTitle: 'At the market',
      podOrder: 1,
      sentenceId: 'fra_for_eng:pod-1:7',
      globalOrder: 7,
      sceneNumber: 2,
      sentenceNumber: 3,
      speaker: 'Marie',
      targetText: 'je voudrais deux baguettes',
      knownText: "I'd like two baguettes",
      column: 'sentence_known_audio_ids',
      kind: 'array',
      index: 1,
      audioId: 'dead-uuid-1',
    },
    {
      courseCode: 'fra_for_eng',
      podId: 'fra_for_eng:pod-1',
      podTitle: 'At the market',
      podOrder: 1,
      sentenceId: 'fra_for_eng:pod-1:9',
      globalOrder: 9,
      sceneNumber: 2,
      sentenceNumber: 5,
      speaker: 'Luc',
      targetText: 'et une tarte aux pommes',
      knownText: 'and an apple tart',
      column: 'sentence_audio_ids',
      kind: 'array',
      index: 0,
      audioId: 'dead-uuid-2',
    },
  ],
  byColumn: [
    { column: 'sentence_known_audio_ids', kind: 'array', referenced: 104, missing: 1, sentencesAffected: 1, unassignedSentences: 50, unassignedSlots: 0 },
    { column: 'sentence_audio_ids', kind: 'array', referenced: 40, missing: 1, sentencesAffected: 1, unassignedSentences: 50, unassignedSlots: 0 },
    { column: 'takeg_audio_ids', kind: 'array', referenced: 12, missing: 0, sentencesAffected: 0, unassignedSentences: 0, unassignedSlots: 0 },
    { column: 'target_audio_id', kind: 'scalar', referenced: 142, missing: 0, sentencesAffected: 0, unassignedSentences: 0, unassignedSlots: 0 },
    { column: 'known_audio_id', kind: 'scalar', referenced: 68, missing: 0, sentencesAffected: 0, unassignedSentences: 74, unassignedSlots: 0 },
    { column: 'explainer_audio_id', kind: 'scalar', referenced: 0, missing: 0, sentencesAffected: 0, unassignedSentences: 142, unassignedSlots: 0 },
    { column: 'note_audio_id', kind: 'scalar', referenced: 0, missing: 0, sentencesAffected: 0, unassignedSentences: 142, unassignedSlots: 0 },
  ],
  totals: { sentencesScanned: 142, slotsReferenced: 366, missing: 2, sentencesAffected: 2, columnsScanned: 7 },
  note: 'The id in this slot does not match any live course_audio row.',
}

const MISSING_CLEAN = {
  courseCode: 'deu_for_eng',
  podsScanned: 4,
  slots: [],
  byColumn: MISSING.byColumn.map(c => ({ ...c, missing: 0, sentencesAffected: 0 })),
  totals: { sentencesScanned: 142, slotsReferenced: 366, missing: 0, sentencesAffected: 0, columnsScanned: 7 },
  note: 'The id in this slot does not match any live course_audio row.',
}

const GATE = {
  perClipVerdictsPersisted: true,
  recentWindowDays: 7,
  note: 'Every clip carries the verdict the renderer recorded on it.',
}

// One passed, one never checked, nothing failed — the ordinary shape today.
const VERDICT_TOTALS = { passed: 1, failed: 0, unchecked: 251 }

function jsonResponse (body) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve(body) })
}

let missingPayload = MISSING

beforeEach(() => {
  missingPayload = MISSING
  routeQuery = {}
  push.mockClear()
  replace.mockClear()
  localStorage.clear()
  // jsdom has no media stack; play() is undefined on HTMLMediaElement there.
  HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined)
  HTMLMediaElement.prototype.pause = vi.fn()

  global.fetch = vi.fn((url) => {
    if (url.includes('/audio-preview/clips')) {
      return jsonResponse({ clips: CLIPS, total: 252, hasMore: true, filter: 'checked', gate: GATE, verdictTotals: VERDICT_TOTALS })
    }
    if (url.includes('/audio-preview/sample')) {
      return jsonResponse({ clips: CLIPS, total: 252, filter: 'checked', gate: GATE, verdictTotals: VERDICT_TOTALS })
    }
    if (url.includes('/audio-preview/missing')) {
      return missingPayload === null
        ? Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) })
        : jsonResponse(missingPayload)
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
      expect.stringContaining('/audio-preview/sample?filter=checked&n=20'),
      expect.anything()
    )
    expect(wrapper.vm.sampleMode).toBe(true)
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled()
    expect(wrapper.text()).toContain('Stop')
  })

  // The defect this page was rebuilt to end: a clip nothing ever checked and a
  // clip that passed must not look alike. The badge is per-clip and measured,
  // so the fixture's two clips must render two different words.
  it('shows each clip its own stored verdict, and never dresses unchecked as passed', async () => {
    const wrapper = await mountPage()
    const text = wrapper.text().toLowerCase()
    expect(text).toContain('checked \u00b7 passed')
    expect(text).toContain('unchecked')
    // No inference from render time survives anywhere on the page.
    expect(text).not.toContain('after the gate shipped')
    expect(text).not.toContain('before the gate')
    expect(text).not.toMatch(/\bverified clean\b/)
  })

  it('states the verdict split of the whole filter, not just the rows on screen', async () => {
    const wrapper = await mountPage()
    const summary = wrapper.find('[data-walk="audio-preview-verdict-summary"]').text()
    // 251 unchecked out of 252 is the honest headline; a page that only badged
    // its 2 loaded rows would let a listener assume the rest was fine.
    expect(summary).toContain('251')
    expect(summary).toContain('unchecked')
    expect(summary.toLowerCase()).toContain('not a pass')
  })

  it('says a pass covers silence and truncation only, never pronunciation', async () => {
    const wrapper = await mountPage()
    expect(wrapper.text().toLowerCase()).toContain('silence and truncation only')
  })

  it('names all three states it is asking a person to judge between', async () => {
    const wrapper = await mountPage()
    const text = wrapper.text().toLowerCase()
    for (const state of ['plays', 'truncated', 'missing']) expect(text).toContain(state)
  })

  it('carries the walkthrough anchors a future walk points at', async () => {
    const wrapper = await mountPage()
    for (const id of ['audio-preview-course-picker', 'audio-preview-filter',
      'audio-preview-role', 'audio-preview-play-first', 'audio-preview-random-sample']) {
      expect(wrapper.find(`[data-walk="${id}"]`).exists()).toBe(true)
    }
  })
})

// Role selection. A recording session is judging one side of the phrase at a
// time, and the list is otherwise all four roles interleaved. The backend has
// applied ?role= since it shipped; these guard the wiring that reaches it.
describe('AudioPreview — role filter', () => {
  function clipUrls () {
    return global.fetch.mock.calls
      .map(([u]) => u)
      .filter(u => typeof u === 'string' && u.includes('/audio-preview/clips'))
  }

  function roleButton (wrapper, label) {
    return wrapper.find('[data-walk="audio-preview-role"]').findAll('button')
      .find(b => b.text() === label)
  }

  it('sends no role param at all when "All roles" is selected', async () => {
    await mountPage()
    // Absence, not role=all: the column holds no such value, so sending it
    // would filter every clip out.
    expect(clipUrls().every(u => !u.includes('role='))).toBe(true)
  })

  it('refetches with &role= when a role is picked, and stacks with the verdict filter', async () => {
    const wrapper = await mountPage()
    await roleButton(wrapper, 'target2').trigger('click')
    await flushPromises()

    const last = clipUrls().at(-1)
    expect(last).toContain('role=target2')
    expect(last).toContain('filter=checked')
  })

  it('drops the param again on returning to "All roles"', async () => {
    const wrapper = await mountPage()
    await roleButton(wrapper, 'known').trigger('click')
    await flushPromises()
    expect(clipUrls().at(-1)).toContain('role=known')

    await roleButton(wrapper, 'All roles').trigger('click')
    await flushPromises()
    expect(clipUrls().at(-1)).not.toContain('role=')
  })

  it('carries the role into the random sample, so the sample is of what is on screen', async () => {
    const wrapper = await mountPage()
    await roleButton(wrapper, 'presentation').trigger('click')
    await flushPromises()
    await wrapper.find('[data-walk="audio-preview-random-sample"]').trigger('click')
    await flushPromises()

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/audio-preview/sample?filter=checked&n=20&role=presentation'),
      expect.anything()
    )
  })

  it('pre-selects the role from ?role= so a link lands on the right set', async () => {
    routeQuery = { role: 'target1' }
    const wrapper = await mountPage()

    expect(wrapper.vm.role).toBe('target1')
    expect(clipUrls().at(-1)).toContain('role=target1')
  })

  it('ignores a role in the URL that is not one of the four', async () => {
    routeQuery = { role: 'target9; drop table' }
    await mountPage()
    expect(clipUrls().every(u => !u.includes('role='))).toBe(true)
  })
})

// The state the page could not show at all before: a slot holding a uuid with
// no clip behind it. There is nothing to list in course_audio, so if this block
// does not render it, nobody ever learns the line is dead.
describe('AudioPreview — missing audio', () => {
  it('banners the count before anyone scrolls or expands anything', async () => {
    const wrapper = await mountPage()
    const text = wrapper.text()
    expect(text).toContain('2 slots point at audio that no longer exists')
    expect(text).toContain('2 dialogue lines the pod cannot play')
  })

  it('shows each missing slot with course, pod, position and the dead line', async () => {
    const wrapper = await mountPage()
    await wrapper.find('[data-walk="audio-preview-missing-toggle"]').trigger('click')

    const slots = wrapper.findAll('[data-missing-slot]')
    expect(slots).toHaveLength(2)

    const first = slots[0].text()
    expect(first).toContain('fra_for_eng')
    expect(first).toContain('fra_for_eng:pod-1')
    expect(first).toContain('line 7')
    expect(first).toContain('Marie')
    expect(first).toContain('je voudrais deux baguettes')
    expect(first).toContain("I'd like two baguettes")
    // The address a repair needs: which column, which index, which dead id.
    expect(first).toContain('sentence_known_audio_ids[1]')
    expect(first).toContain('dead-uuid-1')
  })

  it('accounts for all seven audio-id columns, zeros included', async () => {
    const wrapper = await mountPage()
    await wrapper.find('[data-walk="audio-preview-missing-toggle"]').trigger('click')

    const rows = wrapper.findAll('[data-missing-column]')
    expect(rows).toHaveLength(7)
    const columns = rows.map(r => r.attributes('data-missing-column'))
    // Three arrays, not two. The uncounted column IS the bug.
    expect(columns).toContain('sentence_known_audio_ids')
    expect(columns).toContain('sentence_audio_ids')
    expect(columns).toContain('takeg_audio_ids')
    expect(columns).toContain('note_audio_id')
    // takeg is clean here, and still prints its zero.
    const takeg = rows[columns.indexOf('takeg_audio_ids')]
    expect(takeg.text()).toContain('0')
  })

  it('keeps "no clip assigned" out of the missing count', async () => {
    const wrapper = await mountPage()
    await wrapper.find('[data-walk="audio-preview-missing-toggle"]').trigger('click')
    const text = wrapper.text()
    // 74 French lines have no known-side clip assigned; that is not damage and
    // must never be added to the 2.
    expect(text).toContain('no clip assigned')
    expect(text).toContain('74')
    expect(text).toContain('2 slots point at audio that no longer exists')
  })

  it('raises no false alarm on a course with nothing missing', async () => {
    missingPayload = MISSING_CLEAN
    const wrapper = await mountPage()
    const text = wrapper.text()
    expect(text).not.toContain('point at audio that no longer exists')
    expect(text).toContain('No pod slot points at missing audio')
    expect(wrapper.findAll('[data-missing-slot]')).toHaveLength(0)
  })

  it('says so when the scan itself failed, rather than showing silence', async () => {
    missingPayload = null
    const wrapper = await mountPage()
    expect(wrapper.find('[data-walk="audio-preview-missing-error"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('cannot tell you whether any slots are dead')
    // A dead scan must not take the clip list down with it.
    expect(wrapper.findAll('audio')).toHaveLength(2)
  })
})
