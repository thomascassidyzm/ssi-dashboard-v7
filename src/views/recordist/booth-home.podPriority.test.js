// @vitest-environment jsdom
// A STARTED POD IS THE PRIORITY (Kai, 2026-10-28, job #8·AA): "Pod 1 (and any pod-type batch a
// recorder has started) should come up as the priority." Dan, South Welsh, read 68 of his 91 Pod 1
// lines, then Up next (new sentences rank above scripts) sent him to 502 new sentences and the
// 23 left from scene 15 sat under "Other scripts". Nothing is locked: every other batch still opens.
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import BoothHome from './BoothHome.vue'
import { upNext, nextBatchAfter, isStartedPod, batchTickId } from './booth-home.js'

const track = (key, kind, batches, extra = {}) => ({
  key, kind, title: key, short: kind, what: '', cls: '', ...extra,
  total: batches.reduce((n, b) => n + b.total, 0), recorded: batches.reduce((n, b) => n + b.recorded, 0),
  batches: batches.map((b, i) => ({ n: i + 1, from: 1, to: b.total, ...b })),
})
// DAN'S HOME, 28 Oct, cut down.
const dan = ({ podRecorded = 68 } = {}) => [
  track('pod.pod-1', 'pod', [{ total: 91, recorded: podRecorded, firstLeft: { at: podRecorded + 1, order: 151, scene: 15 } }], { podSlug: 'pod-1', courseCode: 'cym_s_for_eng', title: 'Pod 1' }),
  track('seed.cym_sv2_for_eng', 'seed', [{ total: 100, recorded: 100 }, { total: 100, recorded: 60 }, { total: 100, recorded: 0 }], { newCourse: true, courseCode: 'cym_sv2_for_eng' }),
  track('lego.cym_sv2_for_eng', 'lego', [{ total: 100, recorded: 12 }], { newCourse: true }),
  track('phrase.1', 'phrase', [{ total: 200, recorded: 0, current: true }], { pass: 1 }),
]
const at = (r) => r && `${r.track.key}#${r.batch.n}`

describe('a started pod comes first', () => {
  it('Dan: Up next is Pod 1, not new sentences', () => {
    expect(at(upNext(dan()))).toBe('pod.pod-1#1')
  })
  it('a pod nobody has started keeps its old place, after new sentences', () => {
    expect(at(upNext(dan({ podRecorded: 0 })))).toBe('seed.cym_sv2_for_eng#2')
  })
  it('a finished pod is not offered', () => {
    expect(at(upNext(dan({ podRecorded: 91 })))).toBe('seed.cym_sv2_for_eng#2')
    expect(isStartedPod(dan({ podRecorded: 91 })[0])).toBe(false)
  })
  it('lines still uploading from this device count as started', () => {
    const t = dan({ podRecorded: 0 })
    t[0] = { ...t[0], uploading: 3 }
    expect(isStartedPod(t[0])).toBe(true)
  })
  it('the ticks still win: an unticked Pod 1 is not pushed on him', () => {
    expect(at(upNext(dan(), new Set(['pod.pod-1'])))).toBe('seed.cym_sv2_for_eng#2')
  })
  it('finishing a sentence batch leads back to Pod 1', () => {
    expect(at(nextBatchAfter(dan(), { track: 'seed.cym_sv2_for_eng', batch: 2 }))).toBe('pod.pod-1#1')
  })
  it('a sentence batch unticked by batch does not change any of this', () => {
    expect(at(upNext(dan(), new Set([batchTickId('seed.cym_sv2_for_eng', 2)])))).toBe('pod.pod-1#1')
  })
})

describe('the home screen says so', () => {
  beforeEach(() => { localStorage.clear(); window.innerWidth = 390 })
  const home = (tracks) => mount(BoothHome, { props: { tracks, unticked: new Set(), displayName: 'Dan' }, global: { stubs: { BoothTeamStats: true } } })

  it('Dan sees a priority card: 23 Pod 1 lines left, starting at scene 15, and Continue opens it', async () => {
    const w = home(dan())
    expect(w.find('[data-test="up-next-priority"]').exists()).toBe(true)
    expect(w.find('[data-test="priority-left"]').text()).toMatch(/^23\s*Pod 1 lines left$/)
    expect(w.find('[data-test="priority-resume"]').text()).toBe('Starts at scene 15, line 69 of 91.')
    const go = w.find('[data-test="up-next-start"]')
    expect(go.text()).toBe('Continue Pod 1 ›')
    await go.trigger('click')
    expect(w.emitted('open')[0]).toEqual(['pod.pod-1', 1])
  })
  it('every other card is still there and still opens', () => {
    const w = home(dan())
    for (const k of ['seed.cym_sv2_for_eng', 'lego.cym_sv2_for_eng', 'phrase.1']) {
      const c = w.find(`[data-test="card-${k}"]`)
      expect(c.exists(), k).toBe(true)
      expect(c.attributes('disabled'), k).toBeUndefined()
    }
  })
  it('with no pod started, Up next is the ordinary card', () => {
    const w = home(dan({ podRecorded: 0 }))
    expect(w.find('[data-test="up-next-priority"]').exists()).toBe(false)
    expect(w.find('[data-test="up-next"] .bh-h2').text()).toBe('seed.cym_sv2_for_eng')
  })
  it('a second started pod shown as a card is tagged Priority', () => {
    const t = [...dan(), track('pod.health', 'pod', [{ total: 10, recorded: 4 }], { podSlug: 'health' })]
    const w = home(t)
    expect(w.find('[data-test="card-priority-pod.health"]').exists()).toBe(true)
    expect(w.find('[data-test="card-priority-seed.cym_sv2_for_eng"]').exists()).toBe(false)
  })
})
