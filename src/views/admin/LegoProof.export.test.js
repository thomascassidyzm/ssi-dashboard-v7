// @vitest-environment jsdom
// Export flags must always put the flag list on screen as selectable text, even when the clipboard API is absent (job #551).
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('../../services/api', () => ({ getApiBaseUrl: () => '' }))
vi.mock('vue-router', () => ({ useRoute: () => ({ query: {} }), useRouter: () => ({ replace() {} }) }))

describe('LegoProof export', () => {
  it('shows id, Welsh, English and note in a fixed overlay, and Copy degrades without navigator.clipboard', async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ legos: [
      { id: 'S1003L03', n: 1, isNew: true, cy: 'mor aml â phosib', en: 'as often as possible', flagged: true, note: 'check mutation' },
      { id: 'S1003L04', n: 2, isNew: true, cy: 'arall', en: 'other', flagged: false, note: '' }] }) }))
    const w = mount((await import('./LegoProof.vue')).default, { attachTo: document.body })
    await flushPromises()
    await w.findAll('button').find((b) => b.text() === 'Export flags').trigger('click')
    const ta = w.find('.export-overlay textarea')
    expect(ta.element.value).toContain('S1003L03')
    expect(ta.element.value).toContain('Welsh: mor aml â phosib')
    expect(ta.element.value).toContain('English: as often as possible')
    expect(ta.element.value).toContain('Note: check mutation')
    expect(ta.element.value).not.toContain('S1003L04')
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
    document.execCommand = vi.fn(() => false)
    await w.findAll('button').find((b) => b.text() === 'Copy').trigger('click')
    await flushPromises()
    expect(w.find('.export-overlay .msg').text()).toMatch(/Could not copy/)
    expect(w.findAll('button').some((b) => b.text() === 'Download .txt')).toBe(true)
  })
})
