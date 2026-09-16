// A POD LINK STARTS IN ITS POD.
//
// Aran, 2026-09-16, from a pod page: "no way I can see to start a recording
// session - leaves me wondering where I need to be to record." The pod pages
// now draw a door (RecordDoor.vue) at /r/:voiceId?course=<code>&pod=<slug>, and
// the promise that door makes is that Start reads the first line of THAT pod
// that still needs reading — not the top of everything he owes.
//
// A pod with nothing left in it falls through to the queue's own first unread
// line, because "Nothing left to read" while work is owed elsewhere is a lie.
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

const VOICE = 'human_aran_cym_n'
// Queue order is the server's: pod-1 first, then the pilot. His first unread
// line overall is in pod-1; his first unread line in the pilot is the third.
const QUEUE = [
  { id: 'P1', text: 'Bore da.', podSlug: 'pod-1', recorded: false },
  { id: 'P2', text: 'Nos da.', podSlug: 'pod-1', recorded: false },
  { id: 'H1', text: 'Sut wyt ti?', podSlug: 'health-ladder-pilot', recorded: true },
  { id: 'H2', text: 'Dw i wedi blino.', podSlug: 'health-ladder-pilot', recorded: false },
]

function serve(queue) {
  global.fetch = vi.fn(async (url) => {
    const u = String(url)
    if (u.includes(`/api/recording/voice/${VOICE}?`)) {
      const lines = queue.map((l, i) => ({
        ...l, order: i + 1, speaker: 'Aran', courseCode: 'cym_n_for_eng', kind: 'pod',
        clipUrl: l.recorded ? `/clip/${l.id}.mp3` : null,
      }))
      return { ok: true, status: 200, json: async () => ({
        displayName: 'Aran', languageName: 'Welsh',
        total: lines.length,
        recorded: lines.filter(l => l.recorded).length,
        remaining: lines.filter(l => !l.recorded).length,
        lines,
      }) }
    }
    throw new Error(`unexpected fetch ${u}`)
  })
}

function setAddress(search) {
  window.history.replaceState({}, '', `/r/${VOICE}${search}`)
}

const RouterLinkStub = { props: ['to'], template: '<a class="rl" :href="to"><slot/></a>' }
async function openBooth() {
  const w = mount(RecordistRoom, { props: { voiceId: VOICE }, global: { stubs: { RouterLink: RouterLinkStub } } })
  await flushPromises()
  await flushPromises()
  return w
}
const startText = (w) => {
  const b = w.findAll('button').find(b => b.text().startsWith('Start recording') || b.text() === 'Nothing left to read')
  return b ? b.text() : null
}

describe('RecordistRoom — ?pod= starts the run in that pod', () => {
  beforeEach(() => { serve(QUEUE) })

  it('lands Start on the named pod’s first unread line, not the queue’s', async () => {
    setAddress(`?course=cym_n_for_eng&pod=health-ladder-pilot`)
    expect(startText(await openBooth())).toBe('Start recording — Dw i wedi blino.')
  })

  it('with no pod named, Start is the queue’s own first unread line', async () => {
    setAddress(`?course=cym_n_for_eng`)
    expect(startText(await openBooth())).toBe('Start recording — Bore da.')
  })

  it('a pod with nothing owed falls through to the rest of the queue', async () => {
    serve([{ ...QUEUE[0] }, { ...QUEUE[2] }])
    setAddress(`?course=cym_n_for_eng&pod=health-ladder-pilot`)
    expect(startText(await openBooth())).toBe('Start recording — Bore da.')
  })
})
