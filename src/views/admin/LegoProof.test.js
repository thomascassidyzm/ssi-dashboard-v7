// @vitest-environment jsdom
// Switching North <-> South while a request is in flight must never cross the courses: a flag queued on a North LEGO is
// saved to North, and a slow North list arriving after South has loaded does not replace the South list.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('../../services/api', () => ({ getApiBaseUrl: () => '' }))
vi.mock('vue-router', () => ({ useRoute: () => ({ query: {} }), useRouter: () => ({ replace() {} }) }))

const row = (id, cy) => ({ id, n: 1, isNew: true, cy, en: cy + ' (en)', flagged: false, note: '', by: null, at: null })
const NORTH = { legos: [row('S1003L03', 'mor aml â phosib')] }
const SOUTH = { legos: [row('S1003L03', 'mor aml â phosib (de)')] }

// Every request waits until the test releases it, so the test decides the order responses arrive in.
let pending
const reply = (body) => ({ ok: true, json: async () => body })
beforeEach(() => {
  pending = []
  globalThis.fetch = vi.fn((url, init) => new Promise((resolve) => pending.push({ url: String(url), init, resolve })))
})
const take = (pred) => { const i = pending.findIndex(pred); if (i < 0) throw new Error("no such request in flight"); return pending.splice(i, 1)[0] }
const isList = (p) => p.url.endsWith('/lego-proof/')

async function open() {
  const LegoProof = (await import('./LegoProof.vue')).default
  return mount(LegoProof)
}
const tapCourse = async (w, label) => { await w.findAll('.seg button').find((b) => b.text() === label).trigger('click'); await flushPromises() }

describe('LegoProof course switching', () => {
  it('a flag or note queued on a North LEGO is saved to North after switching to South', async () => {
    const w = await open()
    take(isList).resolve(reply(NORTH)); await flushPromises()

    await w.find('.flag').trigger('click')           // save #1 in flight
    await w.find('.flag').trigger('click')           // queued behind it
    await tapCourse(w, 'South')
    take(isList).resolve(reply(SOUTH)); await flushPromises()
    take((p) => p.url.includes('/flag')).resolve(reply({ ok: true })); await flushPromises()

    const queued = take((p) => p.url.includes('/flag'))
    expect(queued.url).toContain('/cym_nv2_for_eng/')
    expect(JSON.parse(queued.init.body)).toMatchObject({ legoId: 'S1003L03', flagged: false })
    queued.resolve(reply({ ok: true })); await flushPromises()
    // The South row with the same id was never touched.
    expect(w.find('.row').classes()).not.toContain('flagged')
  })

  it('a debounced North note fires after switching to South and still goes to North', async () => {
    const w = await open()
    take(isList).resolve(reply(NORTH)); await flushPromises()
    await w.find('.flag').trigger('click')
    take((p) => p.url.includes('/flag')).resolve(reply({ ok: true })); await flushPromises()
    await w.find('.noteinp').setValue('soft mutation?')
    await tapCourse(w, 'South')
    take(isList).resolve(reply(SOUTH)); await flushPromises()
    await new Promise((r) => setTimeout(r, 900)); await flushPromises()   // past the 700 ms note debounce
    const note = take((p) => p.url.includes('/flag'))
    expect(note.url).toContain('/cym_nv2_for_eng/')
    expect(JSON.parse(note.init.body)).toMatchObject({ legoId: 'S1003L03', flagged: true, note: 'soft mutation?' })
  })

  it('a slow North list arriving after South has loaded is ignored', async () => {
    const w = await open()
    const north = take(isList)                       // North still loading…
    await tapCourse(w, 'South')
    take(isList).resolve(reply(SOUTH)); await flushPromises()
    north.resolve(reply(NORTH)); await flushPromises()
    expect(w.find('.cy').text()).toBe('mor aml â phosib (de)')
    expect(w.text()).not.toContain('Loading')
  })
})
