// The safety banner has to be READABLE, in both themes, or it is not a safety
// banner — it is decoration that happens to contain the only sentence telling
// an artist whether a session's work is safe to walk away from.
//
// On 2026-09-18 Aran finished a health pod on cym_n_for_eng and the booth said
// "113 takes still to upload. Saved on this device and uploading now. Nothing
// is lost if you close this page." He could not read it: lilac on lilac, legible
// only when highlighted. The three variants were translucent tints that assumed
// a dark canvas underneath, and in light mode `.recordist` is white — so
// #cfe0ff over a 13%-blue wash on white came out at 1.15:1.
//
// This test reads the component's own stylesheet and recomputes the WCAG
// contrast of every variant in both themes. It is deliberately a check on the
// SHIPPED declarations rather than on a rendered screenshot: the failure it
// guards against is somebody reaching for a translucent tint again, and a
// translucent background fails here on sight because its contrast cannot be
// known from the declaration alone.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'

const css = readFileSync(fileURLToPath(new URL('./RecordistRoom.vue', import.meta.url)), 'utf8')

const VARIANTS = ['waiting', 'risk', 'refused']
const AA_NORMAL_TEXT = 4.5

function ruleFor(variant, theme) {
  const sel = theme === 'light'
    ? `:root\\[data-theme="light"\\] \\.safety-banner\\.${variant}`
    : `\\.safety-banner\\.${variant}`
  // `^` anchored so the dark lookup does not match the light rule's tail.
  const m = css.match(new RegExp(`^${sel}\\s*\\{([^}]*)\\}`, 'm'))
  return m ? m[1] : null
}

function decl(body, prop) {
  const m = body.match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`))
  return m ? m[1].trim() : null
}

function channels(hex) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!m) throw new Error(`not an opaque hex colour: ${hex}`)
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function relativeLuminance(hex) {
  const [r, g, b] = channels(hex).map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(fg, bg) {
  const a = relativeLuminance(fg)
  const b = relativeLuminance(bg)
  const [hi, lo] = a > b ? [a, b] : [b, a]
  return (hi + 0.05) / (lo + 0.05)
}

describe('recordist safety banner contrast', () => {
  for (const theme of ['dark', 'light']) {
    for (const variant of VARIANTS) {
      it(`${variant} clears WCAG AA in ${theme} mode, on an opaque background`, () => {
        const body = ruleFor(variant, theme)
        expect(body, `no .safety-banner.${variant} rule for ${theme} mode`).toBeTruthy()

        const color = decl(body, 'color')
        const background = decl(body, 'background')
        expect(color, `.safety-banner.${variant} (${theme}) declares no color`).toBeTruthy()
        expect(background, `.safety-banner.${variant} (${theme}) declares no background`).toBeTruthy()

        // An rgba() tint throws here by design: its real contrast depends on
        // whatever is painted behind the banner, which is the bug this test
        // exists to stop coming back.
        expect(contrast(color, background)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT)
      })
    }
  }
})
