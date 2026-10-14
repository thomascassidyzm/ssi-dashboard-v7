// @vitest-environment jsdom
// 10-20k phrases per course: only a window of rows may be in the DOM, and a flag saves to the course it was ticked on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('../../services/api', () => ({ getApiBaseUrl: () => '' }))
vi.mock('vue-router', () => ({ useRoute: () => ({ query: {} }), useRouter: () => ({ replace() {} }) }))

const N = 15000
const body = (tag) => ({
  total: N, legos: [{ id: 'S0001L01', cy: 'lego' }],
  phrases: Array.from({ length: N }, (_, i) => ({ id: `S0001L01B${String(i + 1).padStart(5, '0')}`, n: i + 1, l: 0, cy: `${tag} ${i + 1}`, en: 'en' })),
})
let pending
beforeEach(() => {
  pending = []
  globalThis.fetch = vi.fn((url, init) => new Promise((resolve) => pending.push({ url: String(url), init, resolve })))
  window.scrollTo = () => {}
})
const reply = (b) => ({ ok: true, json: async () => b })
const take = (pred) => { const i = pending.findIndex(pred); if (i < 0) throw new Error('no such request'); return pending.splice(i, 1)[0] }

describe('PhraseProof', () => {
  it('renders a window of the 15k rows, belt-striped from white, and a flag on North saves to North after switching', async () => {
    const w = mount((await import('./PhraseProof.vue')).default, { attachTo: document.body })
    take((p) => p.url.endsWith('/phrase-proof/')).resolve(reply(body('north'))); await flushPromises()
    const rows = w.findAll('.row')
    expect(rows.length).toBeGreaterThan(10)
    expect(rows.length).toBeLessThan(300)
    expect(w.find('.stripe').classes()).toContain('white')
    expect(w.find('.count').text()).toContain('15000')

    await w.find('.flag').trigger('click')
    await w.findAll('.seg button').find((b) => b.text() === 'South').trigger('click'); await flushPromises()
    const save = take((p) => p.url.includes('/flag'))
    expect(save.url).toBe('/api/production/cym_nv2_for_eng/phrase-proof/flag')
    expect(JSON.parse(save.init.body)).toEqual({ phraseId: 'S0001L01B00001', flagged: true, note: '' })
    w.unmount()
  })
})

// Live on popty.app, Popty's own navbar is sticky at top: 0 above every page. A proof header also stuck at top: 0 slid
// under it once scrolled, leaving Flagged only / Export out of reach mid-list (seen live, job #562). Both proof pages
// must stick below the navbar's published height. jsdom has no layout, so this reads the rule itself.
import { readFileSync } from 'node:fs'
describe('proof page headers sit under the Popty navbar', () => {
  for (const f of ['PhraseProof.vue', 'LegoProof.vue']) {
    it(f, () => {
      const src = readFileSync(new URL('./' + f, import.meta.url), 'utf8')
      expect(src).toMatch(/\.top \{ position: sticky; top: var\(--app-navbar-height, 0px\);/)
    })
  }
})
