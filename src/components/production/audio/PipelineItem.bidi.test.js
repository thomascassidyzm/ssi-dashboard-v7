// Pipeline queue row — bidi rendering (A-157).
//
// The honest test is to mount the real component and read the DOM, because the
// defect is a rendering one: Arabic target text painted inside an LTR row puts
// its trailing NEUTRAL punctuation on the wrong visual side. `!` (bidi class ON)
// moved; `؟` (class AL, strong RTL) never did — that asymmetry is the whole
// diagnosis, and it is why the fix is `dir` on the element rather than any edit
// to the stored string.
//
// This row is the mixed-direction case: the sentence shares a line with the LTR
// seed id, so it needs isolating as well as directing.
//
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PipelineItem from './PipelineItem.vue'

// Real ara_lb_for_eng rows, copied out of Supabase 2026-08-18 — not invented Arabic.
const ARA = 'أحكي عربي هلق!' // known: "speak Arabic now!"
const ARA_LONG = 'بدي أحكي عربي، معك!' // known: "I want to speak Arabic, with you!"
const ENG = 'I want to speak Arabic with you now.'

const item = (targetText, knownText = ENG) => ({
  uuid: '0f3a1c22-9b44-4d51-8f0e-77c1a2b3d4e5',
  seedId: 'S0001',
  targetText,
  knownText,
  status: 'complete',
  progress: 100,
  queuedAt: 1755500000000,
})

const mountItem = (targetText) => mount(PipelineItem, { props: { item: item(targetText) } })

describe('PipelineItem — target text carries its own direction', () => {
  it('marks an Arabic queue line rtl', () => {
    const text = mountItem(ARA).get('.item-text')
    expect(text.attributes('dir')).toBe('rtl')
    expect(text.text()).toContain('أحكي')
  })

  it('marks an English queue line ltr', () => {
    expect(mountItem(ENG).get('.item-text').attributes('dir')).toBe('ltr')
  })

  it('isolates the queue line, so the LTR seed id beside it cannot capture the neutral', () => {
    expect(mountItem(ARA).get('.item-text').classes()).toContain('bidi-isolate')
  })

  it('directs and isolates the expanded Target row too', async () => {
    const wrapper = mountItem(ARA_LONG)
    await wrapper.get('.item-header').trigger('click')
    const rows = wrapper.findAll('.detail-row')
    const targetRow = rows.find((r) => r.text().startsWith('Target:'))
    const value = targetRow.get('.detail-value')
    expect(value.attributes('dir')).toBe('rtl')
    expect(value.classes()).toContain('bidi-isolate')
    expect(value.text()).toBe(ARA_LONG)
  })

  it('leaves the known side alone — it is English and must stay ltr', async () => {
    const wrapper = mountItem(ARA)
    await wrapper.get('.item-header').trigger('click')
    const knownRow = wrapper.findAll('.detail-row').find((r) => r.text().startsWith('Known:'))
    expect(knownRow.get('.detail-value').attributes('dir')).toBeUndefined()
  })

  it('does not direct the row container — only the text that needs it', () => {
    const wrapper = mountItem(ARA)
    expect(wrapper.get('.pipeline-item').attributes('dir')).toBeUndefined()
    expect(wrapper.get('.item-header').attributes('dir')).toBeUndefined()
  })

  it('is safe when the queue row has no target text yet', () => {
    const wrapper = mount(PipelineItem, { props: { item: item(null, null) } })
    expect(wrapper.get('.item-text').attributes('dir')).toBe('ltr')
  })
})
