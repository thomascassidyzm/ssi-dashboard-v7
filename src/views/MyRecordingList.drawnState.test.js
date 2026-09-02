// THE TWO THINGS A REDESIGN WOULD SILENTLY BREAK ON THIS PAGE.
//
// 1. STATE IS DRAWN, NOT ANNOTATED (Tom's ruling). Recorded vs not-recorded is
//    carried by how the row is DRAWN — is-done (solid, filled) vs is-todo
//    (dashed outline, dimmed). The day someone "improves" this into a green
//    tick or a red "MISSING" badge, this test fails, which is the only reason
//    it exists. It asserts the class, and it asserts that no status class
//    smuggles a colour word in.
//
// 2. TAP IS THE ONLY AFFORDANCE, one degree of freedom. While one line's mic is
//    open every other line is inert — a second tap somewhere else must not open
//    a second recorder over the top of the first.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, reactive } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'

const queueTake = vi.fn()
// The real markFailed writes the reason into `failed`, and the row reads it
// from there — a stub that only counts calls would pass while the recordist
// still saw nothing on the row.
const failed = reactive(new Map())
const markFailed = vi.fn((lineId, reason) => failed.set(lineId, reason))

vi.mock('@/composables/useRecordistQueue', () => ({
  useRecordistQueue: () => ({
    queueTake, markFailed, reset: vi.fn(),
    pendingCount: ref(0), savedCount: ref(0),
    saved: reactive(new Map()), failed,
  }),
}))

const beginLine = vi.fn()
const start = vi.fn().mockResolvedValue(undefined)
vi.mock('@/composables/useTapRecorder', () => ({
  useTapRecorder: () => ({
    isRecording: ref(false), level: ref(0.3), clipping: ref(false),
    devices: ref([]), appliedSettings: ref({}), profile: ref('voice'), error: ref(null),
    lineHasSpeech: ref(true), quietMs: ref(0), meterTrusted: ref(true),
    inputPeak: ref(0.4), roomTone: ref(0.001),
    listDevices: vi.fn(), start, beginLine,
    endLine: vi.fn(() => Promise.resolve(new Blob([new Uint8Array(4096)], { type: 'audio/webm' }))),
    discardLine: vi.fn().mockResolvedValue(undefined), stop: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({ getAccessToken: vi.fn().mockResolvedValue('tok') }),
}))

import MyRecordingList from './MyRecordingList.vue'

const MINE = {
  email: 'catrin@example.com', name: 'Catrin',
  voices: [{ voiceId: 'human_catrinlliar_cym_n', displayName: 'Catrin', language: 'cym', languageName: 'Welsh', gender: 'f', dialect: 'north' }],
}
const QUEUE = {
  voiceId: 'human_catrinlliar_cym_n', displayName: 'Catrin', language: 'cym', languageName: 'Welsh',
  total: 3, recorded: 1, remaining: 2,
  lines: [
    { id: 'a', order: 1, text: 'Bore da.', knownText: 'Good morning.', recorded: false, clipUrl: null, alsoFills: 0 },
    { id: 'b', order: 2, text: 'Sut wyt ti?', knownText: 'How are you?', recorded: true, clipUrl: '/clip/b', alsoFills: 0 },
    { id: 'c', order: 3, text: 'Iawn diolch.', knownText: 'Fine thanks.', recorded: false, clipUrl: null, alsoFills: 0 },
  ],
}

function stubFetch() {
  global.fetch = vi.fn((url) => {
    if (String(url).includes('/api/recording/mine')) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(MINE) })
    }
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(QUEUE) })
  })
}

async function mountReady() {
  stubFetch()
  const wrapper = mount(MyRecordingList)
  await flushPromises()
  await flushPromises()
  return wrapper
}

beforeEach(() => { vi.clearAllMocks(); failed.clear(); start.mockResolvedValue(undefined) })

describe('MyRecordingList', () => {
  it('draws outstanding lines as dashed-outline slots and recorded lines as solid', async () => {
    const wrapper = await mountReady()
    // Recorded rows are hidden by default, so turn them on to see both states.
    await wrapper.find('.toggle-row input[type="checkbox"]').setValue(true)
    const rows = wrapper.findAll('.row')
    expect(rows).toHaveLength(3)
    expect(rows[0].classes()).toContain('is-todo')
    expect(rows[1].classes()).toContain('is-done')
    expect(rows[2].classes()).toContain('is-todo')
  })

  it('lists only the outstanding lines until asked for the rest', async () => {
    const wrapper = await mountReady()
    expect(wrapper.findAll('.row')).toHaveLength(2)
    expect(wrapper.text()).toContain('2')
    expect(wrapper.text()).toContain('still to record')
  })

  it('carries no colour-coded status class and no badge element', async () => {
    const wrapper = await mountReady()
    const html = wrapper.html()
    for (const word of ['badge', 'green', 'red-', 'text-red', 'text-green', 'status-ok', 'status-bad']) {
      expect(html).not.toContain(word)
    }
  })

  it('a tap opens the mic on that line, and a second tap files the take', async () => {
    const wrapper = await mountReady()
    const first = wrapper.findAll('.row-tap')[0]
    await first.trigger('click')
    await flushPromises()
    expect(start).toHaveBeenCalledTimes(1)
    expect(beginLine).toHaveBeenCalledTimes(1)
    expect(wrapper.findAll('.row')[0].classes()).toContain('is-live')

    await wrapper.findAll('.row-tap')[0].trigger('click')
    await flushPromises()
    expect(queueTake).toHaveBeenCalledTimes(1)
    expect(queueTake.mock.calls[0][0]).toMatchObject({ lineId: 'a', text: 'Bore da.', voiceId: 'human_catrinlliar_cym_n' })
  })

  it('while one line is live, every other line is inert — one degree of freedom', async () => {
    const wrapper = await mountReady()
    await wrapper.findAll('.row-tap')[0].trigger('click')
    await flushPromises()
    const others = wrapper.findAll('.row-tap').slice(1)
    for (const btn of others) expect(btn.attributes('disabled')).toBeDefined()
    await others[0].trigger('click')
    await flushPromises()
    expect(beginLine).toHaveBeenCalledTimes(1)
  })

  // 3. A FAILURE IS MARKED ON THE LINE IT HAPPENED TO. When the mic will not
  //    open, a banner at the top of the page is not enough: the row that was
  //    tapped went straight back to looking untouched, so nothing said which
  //    line had failed. The row itself must carry it.
  it('marks the tapped row when the microphone will not open, not just the page', async () => {
    const wrapper = await mountReady()
    start.mockRejectedValueOnce(Object.assign(new Error('no device'), { name: 'NotFoundError' }))
    await wrapper.findAll('.row-tap')[0].trigger('click')
    await flushPromises()

    const row = wrapper.findAll('.row')[0]
    expect(row.classes()).not.toContain('is-live')
    expect(row.classes()).toContain('is-failed')
    expect(row.text()).toContain('No microphone found')
    expect(row.text()).not.toContain('TO RECORD')
    expect(markFailed).toHaveBeenCalledWith('a', 'No microphone found.')
  })

  it('says plainly when the login has no recording voice, and names the address it looked under', async () => {
    global.fetch = vi.fn(() => Promise.resolve({
      ok: true, status: 200,
      json: () => Promise.resolve({ email: 'nobody@example.com', name: null, voices: [] }),
    }))
    const wrapper = mount(MyRecordingList)
    await flushPromises()
    expect(wrapper.text()).toContain('No recording voice for this login')
    expect(wrapper.text()).toContain('nobody@example.com')
  })
})
