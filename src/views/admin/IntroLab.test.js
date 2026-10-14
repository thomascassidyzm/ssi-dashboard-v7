// @vitest-environment jsdom
// The claim this page exists to make: after the spliced intro, the LEGO plays as the player plays a debut — both target voices at
// the speeds the server computed from the player's rules, the 2-second hold, and nothing else (no prompt/response/debut cycle).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('../../services/api', () => ({ getApiBaseUrl: () => '' }))

const LEGO = { legoId: 'S0001L01', seed: 1, type: 'A', known: 'to speak', target: 'praat', built: { recipe: 'bare', tail: 'is', pieces: [] },
  presentationAudioId: 'p1', knownAudioId: 'k1', target1AudioId: 't1', target2AudioId: 't2', introText: "The Afrikaans for: 'to speak', is:" }
const LIST = { courseCode: 'afr_for_eng', languageName: 'Afrikaans', frame: null,
  tails: [{ key: 'said-like-this', label: 'is said like this', id: 'x', isDefault: true }],
  speeds: { easy: { target1: { speed: 0.8 }, target2: { speed: 0.8 } }, fast: { target1: { speed: 0.9 }, target2: { speed: 0.9 } } },
  counts: { legos: 1, bare: 1, cut: 0, pieces: 0 }, legos: [LEGO] }
const DETAIL = { lego: LEGO, tomLegoId: null, donor: null, plans: { easy: {
  intro: [{ kind: 'prompt', audioId: 'p1', speed: 1 }, { kind: 'voice1', audioId: 't1', speed: 0.8 }, { kind: 'voice2', audioId: 't2', speed: 0.8 }, { kind: 'silence', ms: 2000, why: 'intro lingerMs' }] } } }

beforeEach(() => {
  globalThis.fetch = vi.fn(async (url) => {
    const u = String(url)
    if (u.includes('/clip/')) return { ok: true, arrayBuffer: async () => new ArrayBuffer(8), blob: async () => new Blob(['x']) }
    return { ok: true, json: async () => (u.includes('/lego/') ? DETAIL : LIST) }
  })
  globalThis.AudioContext = class {
    sampleRate = 8000
    resume() { return Promise.resolve() }
    decodeAudioData() { return Promise.resolve({ getChannelData: () => new Float32Array(800) }) }
    createBuffer() { return { copyToChannel() {} } }
    createBufferSource() { return { connect() {}, start() { setTimeout(() => this.onended && this.onended(), 5) }, stop() {} } }
  }
  globalThis.URL.createObjectURL = () => 'blob:x'
  globalThis.URL.revokeObjectURL = () => {}
  globalThis.audioSrcs = []
  globalThis.Audio = class { constructor(src) { globalThis.audioSrcs.push(src) } play() { setTimeout(() => this.onended && this.onended(), 5); return Promise.resolve() } pause() {} }
})

async function open() {
  const IntroLab = (await import('./IntroLab.vue')).default
  const w = mount(IntroLab, { global: { stubs: { RouterLink: true, LabCrumbs: true, CoursePicker: { template: '<button id="pick" @click="$emit(\'update:modelValue\', \'afr_for_eng\')">pick</button>', emits: ['update:modelValue'] } } } })
  await w.find('#pick').trigger('click')
  await flushPromises()
  return w
}

describe('Intro Lab page', () => {
  it('says plainly when a course has no Tom frame, and still offers the shipped intro', async () => {
    const w = await open()
    expect(w.text()).toContain('No Tom-006 “The Afrikaans for” frame clip exists')
    expect(w.text()).toContain('to speak')
  })

  it('plays intro → voice 1 → voice 2 at the player speeds → 2 s hold, and offers no debut cycle', async () => {
    const w = await open()
    expect(w.text()).not.toMatch(/debut/i)
    await w.find('.go').trigger('click')
    await vi.waitFor(() => expect(w.findAll('.steps li').length).toBe(4))
    const intro = w.findAll('.steps li').map((l) => l.text())
    expect(intro[0]).toMatch(/^Intro — shipped intro/)
    expect(intro[1]).toBe('target voice 1 at 0.8×')
    expect(intro[2]).toBe('target voice 2 at 0.8×')
    expect(intro[3]).toMatch(/hold 2000 ms/)
    // An <audio> element cannot send the Authorization header: every clip must arrive as a blob, never as the gated API URL.
    expect(globalThis.audioSrcs.length).toBeGreaterThan(0)
    expect(globalThis.audioSrcs.every((u) => u.startsWith('blob:'))).toBe(true)
    w.unmount()
  })

  it('drops a slow course response that arrives after a newer course was picked', async () => {
    const slow = { ...LIST, courseCode: 'old_course', languageName: 'Old', legos: [{ ...LEGO, legoId: 'OLD1', known: 'old known' }] }
    const fresh = { ...LIST, courseCode: 'new_course', languageName: 'New', legos: [{ ...LEGO, legoId: 'NEW1', known: 'new known' }] }
    let releaseOld
    globalThis.fetch = vi.fn((url) => {
      const u = String(url)
      if (u.includes('/lego/')) return Promise.resolve({ ok: true, json: async () => ({ ...DETAIL, lego: { ...LEGO, legoId: u.includes('OLD1') ? 'OLD1' : 'NEW1' } }) })
      if (u.includes('/old_course/')) return new Promise((res) => { releaseOld = () => res({ ok: true, json: async () => slow }) })
      return Promise.resolve({ ok: true, json: async () => fresh })
    })
    const IntroLab = (await import('./IntroLab.vue')).default
    let pick
    const w = mount(IntroLab, { global: { stubs: { RouterLink: true, LabCrumbs: true, CoursePicker: { props: ['modelValue'], emits: ['update:modelValue'], template: '<span/>', mounted() { pick = (c) => this.$emit('update:modelValue', c) } } } } })
    pick('old_course'); await flushPromises()
    pick('new_course'); await flushPromises()
    releaseOld(); await flushPromises()
    expect(w.text()).toContain('new known')
    expect(w.text()).not.toContain('old known')
    w.unmount()
  })

  it('plays the sample captured at Play: switching course mid-play never fetches clips from the new course', async () => {
    // Hold the FIRST clip request pending, switch course while it is in flight, release it: every clip requested after the
    // switch must still come from the course the play started on (#528 — the old test never switched course at all).
    const other = { ...LIST, courseCode: 'other_course', languageName: 'Other', legos: [{ ...LEGO, legoId: 'OTH1' }] }
    const plain = globalThis.fetch
    let release, heldOnce = false
    globalThis.fetch = vi.fn((url, ...rest) => {
      const u = String(url)
      if (u.includes('/clip/') && !heldOnce) { heldOnce = true; return new Promise((res) => { release = () => res({ ok: true, arrayBuffer: async () => new ArrayBuffer(8), blob: async () => new Blob(['x']) }) }) }
      if (u.includes('/other_course/') && !u.includes('/clip/') && !u.includes('/lego/')) return Promise.resolve({ ok: true, json: async () => other })
      return plain(url, ...rest)
    })
    const IntroLab = (await import('./IntroLab.vue')).default
    let pick
    const w = mount(IntroLab, { global: { stubs: { RouterLink: true, LabCrumbs: true, CoursePicker: { props: ['modelValue'], emits: ['update:modelValue'], template: '<span/>', mounted() { pick = (c) => this.$emit('update:modelValue', c) } } } } })
    pick('afr_for_eng'); await flushPromises()
    await w.find('.go').trigger('click')
    await vi.waitFor(() => expect(release).toBeTypeOf('function'))
    pick('other_course'); await flushPromises()
    release(); await flushPromises()
    await new Promise((r) => setTimeout(r, 150)); await flushPromises()
    const clips = globalThis.fetch.mock.calls.map((c) => String(c[0])).filter((u) => u.includes('/clip/'))
    expect(clips.length).toBeGreaterThan(1)   // requests were made after the switch, not just the held one
    expect(clips.every((u) => u.includes('/afr_for_eng/'))).toBe(true)
    expect(clips.some((u) => u.includes('/other_course/'))).toBe(false)
    w.unmount()
  })
})
