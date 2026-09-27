// SSi HQ has to be READABLE in light mode. On 2026-09-27 Aran reported the key
// numbers illegible there: the cards were a translucent slate wash with
// near-white text, written for a dark canvas, so over the light canvas every
// line was pale-on-grey.
//
// This test reads Hq.vue's own stylesheet, resolves each text colour the way
// the browser would in light mode (a :root[data-theme="light"] rule wins over
// the base rule; var(--x) takes the light token from style.css) and checks it
// against WCAG AA on the background it actually sits on. A translucent
// background throws on sight, because its contrast cannot be known from the
// declaration alone — that was the bug.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'

const read = (f) => readFileSync(fileURLToPath(new URL(f, import.meta.url)), 'utf8')
const vue = read('./Hq.vue')
const css = vue.slice(vue.indexOf('<style'))
const theme = read('../style.css')

const AA_NORMAL_TEXT = 4.5

function lightTokens () {
  const block = theme.match(/:root\[data-theme="light"\]\s*\{([^}]*)\}/)[1]
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]))
}
const TOKENS = lightTokens()

const esc = (s) => s.replace(/[.[\]"()]/g, '\\$&')

function rule (selector, light) {
  const sel = light ? `:root[data-theme="light"] ${selector}` : selector
  const m = css.match(new RegExp(`^${esc(sel)}\\s*\\{([^}]*)\\}`, 'm'))
  return m ? m[1] : null
}

function decl (body, prop) {
  const m = body && body.match(new RegExp(`(?:^|;|\\{|\\s)${prop}\\s*:\\s*([^;]+)`))
  return m ? m[1].trim() : null
}

/** What the browser uses in light mode: the light override, else the base rule. */
function lightValue (selector, prop) {
  const v = decl(rule(selector, true), prop) ?? decl(rule(selector, false), prop)
  if (!v) throw new Error(`${selector} declares no ${prop}`)
  const tok = v.match(/^var\(--([\w-]+)\)$/)
  return tok ? TOKENS[tok[1]] : v
}

function channels (hex) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex || '')
  if (!m) throw new Error(`not an opaque hex colour: ${hex}`)
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function luminance (hex) {
  const [r, g, b] = channels(hex).map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast (fg, bg) {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a)
  return (hi + 0.05) / (lo + 0.05)
}

// Every text class inside a key-number card, on the card's own background.
const CARD_TEXT = [
  '.number-label', '.number-value', '.number-blank', '.direction.up', '.direction.down',
  '.direction.flat', '.prior', '.number-reason', '.number-unlock', '.number-note',
]
// The functions table and the page chrome sit straight on the canvas.
const CANVAS_TEXT = [
  '.section-note', '.hq-table td', '.cell-name', '.cell-owner', '.trace-source',
  '.trace-detail', '.trace-gap', '.seen', '.seen.stale', '.blank', '.hq-footer a',
]

describe('SSi HQ light-mode contrast', () => {
  const card = lightValue('.number-card', 'background')

  for (const sel of CARD_TEXT) {
    it(`${sel} clears WCAG AA on the key-number card`, () => {
      expect(contrast(lightValue(sel, 'color'), card)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT)
    })
  }

  for (const sel of CANVAS_TEXT) {
    it(`${sel} clears WCAG AA on the page canvas`, () => {
      expect(contrast(lightValue(sel, 'color'), TOKENS.canvas)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT)
    })
  }
})
