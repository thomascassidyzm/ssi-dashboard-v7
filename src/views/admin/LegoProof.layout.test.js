// LEGO proof — readability and flag position (job #509, Aran 2026-10-13, proofing on phone + Chromebook).
// (1) The page read light-on-light: it took its text colour from an undefined --text var (fallback #e8eaed) while the
//     shell painted a light canvas. It now carries its own light palette, so the Welsh is dark ink on white.
// (2) The flag must sit straight after the Welsh words, not at the row's far edge, and tapping it must not also
//     toggle the English.
//
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

vi.mock('vue-router', () => ({ useRoute: () => ({ query: {} }), useRouter: () => ({ replace: vi.fn() }) }))
vi.mock('../../services/api', () => ({ getApiBaseUrl: () => '' }))

const LEGOS = [{ id: 'S1003L03', n: 12, cy: 'dw i isio', en: 'I want', isNew: true, flagged: false, note: '' }]

describe('LegoProof layout', () => {
  it('puts the flag inline right after the Welsh text, and a flag tap does not open the English', async () => {
    global.fetch = vi.fn(async (url, opts) => ({ ok: true, json: async () => (opts?.method === 'PUT' ? { ok: true } : { legos: structuredClone(LEGOS) }) }))
    const { default: LegoProof } = await import('./LegoProof.vue')
    const w = mount(LegoProof)
    await flushPromises()
    const line = w.find('.row .cyline')
    expect(line.exists()).toBe(true)
    const kids = line.element.children
    expect(kids[0].classList.contains('cy')).toBe(true)
    expect(kids[1].classList.contains('flag')).toBe(true)
    await w.find('.flag').trigger('click')
    expect(w.find('.en').exists()).toBe(false)
    expect(w.find('.flag').attributes('aria-pressed')).toBe('true')
  })

  it('carries its own dark-on-light palette rather than inheriting a light text colour', () => {
    const src = readFileSync(resolve(process.cwd(), 'src/views/admin/LegoProof.vue'), 'utf8')
    const css = src.slice(src.indexOf('<style'))
    expect(css).not.toMatch(/var\(--text/)
    expect(css).toMatch(/\.lp\s*\{[^}]*background:\s*var\(--lp-bg\)[^}]*color:\s*var\(--lp-ink\)/)
    expect(css).toMatch(/--lp-bg:\s*#ffffff/)
    expect(css).toMatch(/--lp-ink:\s*#0b1220/)
  })
})

// Job #522: the list is the whole course; HC-block rows carry a badge and the All / HC only / Old only filter hides
// rows without renumbering them.
describe('LegoProof whole course', () => {
  it('badges HC rows and filters All / HC only / Old only without renumbering', async () => {
    const rows = [
      { id: 'S0001L01', n: 1, cy: 'dw i isio', en: 'I want', isNew: true, hc: false, flagged: false, note: '' },
      { id: 'S1001L01', n: 2, cy: 'mor aml â phosib', en: 'as often as possible', isNew: true, hc: true, flagged: false, note: '' },
    ]
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ legos: structuredClone(rows) }) }))
    const { default: LegoProof } = await import('./LegoProof.vue')
    const w = mount(LegoProof)
    await flushPromises()
    const ids = () => w.findAll('.row .id').map((e) => e.text())
    const nums = () => w.findAll('.row .num small').map((e) => e.text())
    expect(ids()).toEqual(['S0001L01', 'S1001L01'])
    expect(w.findAll('.row')[0].find('.hc').exists()).toBe(false)
    expect(w.findAll('.row')[1].find('.hc').text()).toBe('HC')
    const tap = async (label) => { await w.findAll('.seg.part button').find((b) => b.text() === label).trigger('click') }
    await tap('HC only'); expect(ids()).toEqual(['S1001L01']); expect(nums()).toEqual(['#2'])
    await tap('Old only'); expect(ids()).toEqual(['S0001L01'])
    await tap('All'); expect(ids()).toEqual(['S0001L01', 'S1001L01'])
  })
})
