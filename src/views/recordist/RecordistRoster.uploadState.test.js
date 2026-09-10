// A TAKE STILL GOING UP AND A TAKE THAT WOULD NOT SAVE ARE NOT THE SAME MARK.
//
// Aran, 2026-09-10, mid-session: "if I mouseover some of the phrases that are
// white/yet to read, there is stuff that I KNOW I recorded in the session today
// - so either those uploads have failed or they are still processing - would be
// super handy to know which".
//
// Both drew as an ordinary hollow square, identical to a line he had never
// read. They are opposite facts: one is safe and needs nothing from him, and the
// other has lost the take unless he reads it again. This pins that they are
// told apart — on the mark, in its label, in the panel, on the row and in the
// section's own caption — and that neither of them is ever a verdict on his
// reading.
//
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RecordistRoster from './RecordistRoster.vue'

const SECTIONS = [{
  key: 'pod', heading: 'SENEDD', blurb: 'The committee session.',
  rows: [
    { id: 'a', text: 'Diolch.', done: true, hasTake: true },
    { id: 'b', text: 'Bore da.', done: false, hasTake: false, pending: true },
    { id: 'c', text: 'Nos da.', done: false, hasTake: false, failed: true },
    { id: 'd', text: 'Sut mae?', done: false, hasTake: false },
  ],
}]

const mountRoster = () => mount(RecordistRoster, { props: { sections: SECTIONS } })

describe('RecordistRoster — where the take is', () => {
  it('gives the four states four marks', () => {
    const ticks = mountRoster().findAll('.tick')
    expect(ticks[0].classes()).toContain('done')
    expect(ticks[1].classes()).toContain('sending')
    expect(ticks[2].classes()).toContain('failed')
    expect(ticks[3].classes()).toContain('todo')
  })

  it('says which it is, in words, on the mark and in the panel', async () => {
    const w = mountRoster()
    expect(w.findAll('.tick')[1].attributes('aria-label')).toBe('Bore da. — Recorded — still going up')
    expect(w.findAll('.tick')[2].attributes('aria-label')).toBe('Nos da. — Did not save — read it again')
    await w.findAll('.tick')[2].trigger('click')
    expect(w.find('.peek-state').text()).toBe('Did not save — read it again')
  })

  it('counts a take on its way up as read, and one that would not save as still owed', () => {
    const tally = mountRoster().find('.sm-tally').text()
    expect(tally).toContain('1 recorded')
    // 'c' and 'd' are owed; 'b' is not — he has read it.
    expect(tally).toContain('2 still to read')
    expect(tally).toContain('1 still going up')
    expect(tally).toContain('1 did not save')
    // …and the whole-run line agrees with the section, because both are on
    // screen at once.
    expect(mountRoster().find('.strip-words').text()).toContain('2 still to read')
  })

  it('never turns either new state into a verdict on the reading', async () => {
    const w = mountRoster()
    await w.findAll('.tick')[2].trigger('click')
    const words = w.find('.peek').text().toLowerCase()
    for (const leak of ['reject', 'unusable', 'clipped', 'quality', 'bad', 'silent'])
      expect(words).not.toContain(leak)
  })
})
