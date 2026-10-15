// A FINISHED POD LEADS TO THE NEXT ONE (Kai, 2026-10-15, job #682).
//
// Eleri and Dan hold one link each, /r/<voice>?course=cym_s_for_eng&pod=pod-1,
// and must never need another: a fully-read pod says "Pod N done" and offers the
// next pod in course order, loaded in place with the address rewritten; with no
// later lines it says "next block coming soon". A link with no ?pod= is unchanged.
//
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

const VOICE = 'human_eleri_cym_s'
const COURSE = 'cym_s_for_eng'
const POD1 = [
  { id: 'A1', text: 'Bore da.', podSlug: 'pod-1', recorded: true },
  { id: 'A2', text: 'Nos da.', podSlug: 'pod-1', recorded: true },
]
const POD2 = [
  { id: 'B1', text: 'Shwmae.', podSlug: 'pod-2', recorded: false },
]

function serve(byPod, blocks) {
  global.fetch = vi.fn(async (url) => {
    const u = new URL(String(url), 'http://x')
    if (u.pathname === `/api/recording/voice/${VOICE}`) {
      const pod = u.searchParams.get('pod')
      const lines = (byPod[pod] || []).map((l, i) => ({
        ...l, podId: `${COURSE}:${l.podSlug}`, order: i + 1, speaker: 'Sarah', courseCode: COURSE, kind: 'pod',
        clipUrl: l.recorded ? `/clip/${l.id}.mp3` : null,
      }))
      return { ok: true, status: 200, json: async () => ({
        displayName: 'Eleri', languageName: 'Welsh', pod,
        podBlocks: pod ? blocks : null,
        total: lines.length,
        recorded: lines.filter(l => l.recorded).length,
        remaining: lines.filter(l => !l.recorded).length,
        lines,
      }) }
    }
    throw new Error(`unexpected fetch ${u}`)
  })
}

const RouterLinkStub = { props: ['to'], template: '<a class="rl" :href="to"><slot/></a>' }
async function openBooth(search) {
  window.history.replaceState({}, '', `/r/${VOICE}${search}`)
  const w = mount(RecordistRoom, { props: { voiceId: VOICE }, global: { stubs: { RouterLink: RouterLinkStub } } })
  await flushPromises()
  await flushPromises()
  return w
}
const startText = (w) => {
  const b = w.findAll('button').find(b => b.text().startsWith('Start recording') || b.text() === 'Nothing left to read')
  return b ? b.text() : null
}

const BLOCKS = [
  { podId: `${COURSE}:pod-1`, slug: 'pod-1', title: 'Pod 1', total: 2, recorded: 2 },
  { podId: `${COURSE}:pod-2`, slug: 'pod-2', title: 'Market day', total: 1, recorded: 0 },
]

describe('RecordistRoom — a finished pod offers the next one', () => {
  beforeEach(() => { serve({ 'pod-1': POD1, 'pod-2': POD2 }, BLOCKS) })

  it('the old pod-1 link, fully read, says "Pod 1 done" and offers Pod 2', async () => {
    const w = await openBooth(`?course=${COURSE}&pod=pod-1`)
    expect(w.find('[data-test="pod-blocks"]').text()).toContain('Block 1 of 2')
    expect(w.find('[data-test="pod-done"]').text()).toBe('Pod 1 done')
    expect(w.find('[data-test="pod-next"]').text()).toBe('Start Pod 2 — Market day (1 line)')
  })

  it('the button loads Pod 2 in place and rewrites the address, nothing pushed', async () => {
    const w = await openBooth(`?course=${COURSE}&pod=pod-1`)
    const before = window.history.length
    await w.find('[data-test="pod-next"]').trigger('click')
    await flushPromises(); await flushPromises()
    expect(window.location.search).toBe(`?course=${COURSE}&pod=pod-2`)
    expect(window.history.length).toBe(before)
    expect(String(global.fetch.mock.calls.at(-1)[0])).toContain('pod=pod-2')
    expect(startText(w)).toBe('Start recording — Shwmae.')
    expect(w.find('[data-test="pod-blocks"]').text()).toContain('Block 2 of 2')
    expect(w.find('[data-test="pod-done"]').exists()).toBe(false)
  })

  it('a finished block can be opened again from the block row', async () => {
    const w = await openBooth(`?course=${COURSE}&pod=pod-2`)
    const back = w.findAll('.pb-chip').find(b => b.text().startsWith('Pod 1'))
    await back.trigger('click')
    await flushPromises(); await flushPromises()
    expect(window.location.search).toBe(`?course=${COURSE}&pod=pod-1`)
    expect(w.find('[data-test="pod-done"]').text()).toBe('Pod 1 done')
  })

  it('no later pod with lines -> "Next block coming soon", and no next button', async () => {
    serve({ 'pod-1': POD1 }, [BLOCKS[0]])
    const w = await openBooth(`?course=${COURSE}&pod=pod-1`)
    expect(w.find('[data-test="pod-soon"]').text()).toContain('Next block coming soon')
    expect(w.find('[data-test="pod-next"]').exists()).toBe(false)
    expect(w.find('[data-test="pod-blocks"]').text()).toContain('Block 1 of 1')
  })

  it('a link with no ?pod= draws no blocks at all', async () => {
    const w = await openBooth(`?course=${COURSE}`)
    expect(w.find('[data-test="pod-blocks"]').exists()).toBe(false)
  })
})
