// @vitest-environment jsdom
/**
 * A recordist cast as voice 2 must not be offered voice 1 as the default.
 *
 * deu_at_for_eng, 2026-08: the role picker listed Known / Target 1 / Target 2
 * as three equal, unnamed, un-preselected options and the script path skipped
 * it entirely with a bare `target1` fallback — so a real person's takes were
 * filed under voice 1's Azure voice.
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RoleSelector from './RoleSelector.vue'

const SLOT_OPTIONS = [
  { slot: 'target1', label: 'German — Voice 1', voiceName: 'Ingrid', isHuman: false },
  { slot: 'target2', label: 'German — Voice 2', voiceName: 'Sasha', isHuman: true }
]

const base = {
  courseName: 'Austrian German for English speakers',
  knownLanguage: 'English',
  targetLanguage: 'German',
  phraseCount: 12
}

describe('RoleSelector honours the recordist\'s cast slot', () => {
  it('pre-selects the assigned slot, so Begin Session starts as voice 2', async () => {
    const w = mount(RoleSelector, { props: { ...base, assignedSlot: 'target2', slotOptions: SLOT_OPTIONS } })
    await w.find('.begin-btn').trigger('click')
    expect(w.emitted('begin')[0][0].role).toBe('target2')
  })

  it('says who you are cast as, by voice name', () => {
    const w = mount(RoleSelector, { props: { ...base, assignedSlot: 'target2', slotOptions: SLOT_OPTIONS } })
    expect(w.find('.assigned-note').text()).toContain('Sasha')
  })

  it('marks the assigned option so the cast is visible, not just implied', () => {
    const w = mount(RoleSelector, { props: { ...base, assignedSlot: 'target2', slotOptions: SLOT_OPTIONS } })
    const mine = w.findAll('.role-option').filter(o => o.classes('mine'))
    expect(mine).toHaveLength(1)
    expect(mine[0].text()).toContain('Sasha')
  })

  it('shows the course\'s real cast — voices by name, no phantom third slot', () => {
    const w = mount(RoleSelector, { props: { ...base, slotOptions: SLOT_OPTIONS } })
    const options = w.findAll('.role-option')
    expect(options).toHaveLength(2)
    expect(options.map(o => o.text()).join(' ')).toContain('Ingrid')
  })

  it('with no cast supplied, falls back to the old three roles and no default', () => {
    const w = mount(RoleSelector, { props: base })
    expect(w.findAll('.role-option')).toHaveLength(3)
    expect(w.find('.begin-btn').attributes('disabled')).toBeDefined()
    expect(w.find('.assigned-note').exists()).toBe(false)
  })

  it('picks up the assignment when the cast arrives after mount (async voice_config)', async () => {
    const w = mount(RoleSelector, { props: { ...base, assignedSlot: null, slotOptions: [] } })
    expect(w.find('.begin-btn').attributes('disabled')).toBeDefined()
    await w.setProps({ assignedSlot: 'target2', slotOptions: SLOT_OPTIONS })
    await w.find('.begin-btn').trigger('click')
    expect(w.emitted('begin')[0][0].role).toBe('target2')
  })
})
