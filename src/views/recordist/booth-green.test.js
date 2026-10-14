// @vitest-environment jsdom
//
// THE BOOTH'S GREEN BUTTONS READ IN WHITE (Aran 2026-10-14, job #420), at WCAG AA or better, and
// the booth home carries no Booth · Popty row of its own (Popty's top bar is the one navigation).
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { mount } from '@vue/test-utils'
import BoothHome from './BoothHome.vue'

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8')
const room = read('../RecordistRoom.vue')
const home = read('./BoothHome.vue')

function luminance(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
const token = (name) => (room.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`)) || [])[1]
const rule = (src, selector) => {
  const at = src.indexOf(`\n${selector} {`)
  return at < 0 ? '' : src.slice(at, src.indexOf('}', at))
}

describe('green buttons on the booth', () => {
  it('are white text on a green that clears WCAG AA (4.5:1), whatever the theme', () => {
    expect(token('booth-go-ink')).toBe('#ffffff')
    expect(contrast(token('booth-go-ink'), token('booth-go-bg'))).toBeGreaterThanOrEqual(4.5)
    expect(contrast(token('booth-go-ink'), token('booth-go-bg-hover'))).toBeGreaterThanOrEqual(4.5)
  })

  it('every filled green button uses that pair, not dark ink on the theme green', () => {
    for (const [src, sel] of [[room, '.btn-begin'], [room, '.ctl-next'], [room, '.volume-btn.on'], [home, '.bh-go'], [home, '.bh-brow.next .bh-bn']]) {
      const r = rule(src, sel)
      expect(r, sel).toMatch(/background: var\(--booth-go-bg/)
      expect(r, sel).toMatch(/color: var\(--booth-go-ink/)
    }
  })
})

describe('the booth home', () => {
  it('has no Booth · Popty row: one navigation, the top bar', () => {
    const w = mount(BoothHome, {
      props: { displayName: 'Aran', tracks: [], unticked: [], trackKey: '', mainHeading: 'New sentences', notes: [] },
      global: { stubs: { RouterLink: { props: ['to'], template: '<a :href="to"><slot/></a>' }, BoothTicks: true, BoothTeamStats: true } },
    })
    expect(w.text()).toContain('Hello Aran')
    expect(w.find('.rc-nav').exists()).toBe(false)
    expect(w.find('[aria-label="Booth navigation"]').exists()).toBe(false)
    expect(w.text()).not.toMatch(/Booth\s*·\s*Popty/)
  })
})
