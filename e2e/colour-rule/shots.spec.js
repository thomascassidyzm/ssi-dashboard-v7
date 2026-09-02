import fs from 'node:fs'
import path from 'node:path'
import { test, expect } from '@playwright/test'
import { EMAIL, PASSWORD } from '../pod-recording/seed-test-user.cjs'

/**
 * THE ACCEPTANCE EVIDENCE for "colour means measurement" (Tom, 2026-09-02).
 *
 * Three screens × two widths × two themes = twelve photographs, plus the two
 * assertions the ruling can actually be tested by: no element on these pages
 * paints itself with the danger or accent hues, and Script Lab shows ONE column
 * until a language is chosen and THREE once one is.
 *
 * A HARNESS, DECLARED. Real login, real API, real rows; nothing stubbed. Every
 * request is a GET.
 */
const API_BASE = process.env.E2E_API_BASE || 'http://localhost:3470'
const OUT = process.env.E2E_SHOT_DIR || 'scripts/colour-rule-shots'
/* The script shot for (a) and (b) must be one that HAS a language layer,
   otherwise (b) cannot exist and the pair stops being a before/after of the
   same page. method-pod-43-scene carries 276 Italian rows and a real walk, so
   the coverage panel is populated in both shots. pod-1 — the core pod, which
   carries no language layer at all — is photographed separately, because
   "canonical only, and there is nothing to pick" is its own honest state. */
const SLUG = process.env.E2E_SLUG || 'method-pod-43-scene'
const SLUG_NO_LANG = process.env.E2E_SLUG_NO_LANG || 'pod-1' 

const VIEWPORTS = [
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'phone-430', width: 430, height: 932 },
]
const THEMES = ['dark', 'light']

fs.mkdirSync(OUT, { recursive: true })

async function prime (page, theme) {
  await page.addInitScript(({ apiBase, theme }) => {
    const realSetItem = window.localStorage.setItem.bind(window.localStorage)
    window.localStorage.setItem = function (key, value) {
      if (key === 'api_base_url') return
      return realSetItem(key, value)
    }
    realSetItem('api_base_url', apiBase)
    realSetItem('popty-theme', theme)
  }, { apiBase: API_BASE, theme })
}

async function signIn (page) {
  await page.goto('/login')
  await page.getByPlaceholder('you@example.com').fill(EMAIL)
  await page.getByRole('button', { name: 'Use password instead' }).click()
  await page.getByPlaceholder('Enter your password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 60_000 })
}

/** main.js reads popty-theme on boot; assert what we actually got rather than
 *  trusting the seed, because a light-mode shot taken in dark is worthless. */
async function assertTheme (page, theme) {
  const actual = await page.evaluate(() => document.documentElement.dataset.theme || 'dark')
  expect(actual, `theme should be ${theme}`).toBe(theme)
}

/*
 * TWO PHOTOGRAPHS PER STATE, and the fold one is the point. A full-page shot of
 * a 231-line script is 25,000px tall: it is the record, but nobody can read it,
 * least of all on the phone this gets reviewed on. The fold shot is the screen
 * as a person actually meets it.
 */
async function shoot (page, name, anchor) {
  await page.waitForTimeout(600)
  await page.screenshot({ path: path.join(OUT, `${name}--fold.png`) })
  // A third photograph, anchored on the thing the ruling changed. On a 231-line
  // script the columns and the chip row are three screens below the fold, so a
  // top-of-page shot proves nothing about either.
  if (anchor && await page.locator(anchor).count()) {
    await page.locator(anchor).first().scrollIntoViewIfNeeded()
    await page.waitForTimeout(300)
    await page.screenshot({ path: path.join(OUT, `${name}--table.png`) })
  }
  await page.screenshot({ path: path.join(OUT, `${name}--full.png`), fullPage: true })
}

/**
 * THE RULE, AS AN ASSERTION. Every rendered element on the page is asked for
 * its computed colour / border-colour / background, and none of them may be in
 * the red or amber families. Blue is allowed — it is the single action colour.
 */
async function assertNoRedOrAmber (page, where) {
  const offenders = await page.evaluate(() => {
    const bad = []
    const parse = (s) => {
      const m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(s || '')
      return m ? [+m[1], +m[2], +m[3]] : null
    }
    // Red or amber = a clearly warm hue with real saturation. Greys, inks and
    // blues pass; #f87171, #ef4444, #f59e0b, #fbbf24, #d97706 do not.
    const warm = (rgb) => {
      if (!rgb) return false
      const [r, g, b] = rgb
      const max = Math.max(r, g, b), min = Math.min(r, g, b)
      if (max - min < 45) return false          // effectively grey
      if (r !== max) return false               // not red-dominant
      return b < r - 45 && (r - b) > (g - b)    // warm, i.e. red→amber, not pink/violet
    }
    // THE ONE NAMED EXEMPTION, and it is a fault light, not a measurement of
    // content: the Environment Switcher's connection dot goes red when the API
    // is unreachable. /courses — the reference implementation — keeps red for
    // exactly this class of thing (its .error-panel), so the estate's answer
    // sheet says red survives for a system fault and nothing else.
    const exempt = (el) => !!el.closest('.env-switcher-inline, .status-dot.disconnected')
    for (const el of document.querySelectorAll('body *')) {
      if (exempt(el)) continue
      const cs = getComputedStyle(el)
      if (cs.visibility === 'hidden' || cs.display === 'none') continue
      for (const prop of ['color', 'borderTopColor', 'borderLeftColor', 'backgroundColor', 'fill', 'stroke']) {
        const rgb = parse(cs[prop])
        if (!rgb) continue
        if (prop === 'backgroundColor' && cs.backgroundColor.startsWith('rgba(') && cs.backgroundColor.endsWith(', 0)')) continue
        if (warm(rgb)) {
          bad.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)} ${prop}=${cs[prop]}`)
        }
      }
    }
    return [...new Set(bad)].slice(0, 25)
  })
  expect(offenders, `${where} should carry no red or amber`).toEqual([])
}

for (const theme of THEMES) {
  for (const vp of VIEWPORTS) {
    test(`${theme} · ${vp.name} · the three screens`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await prime(page, theme)
      await signIn(page)
      await assertTheme(page, theme)

      // (a) SCRIPT LAB WITH NO COURSE SELECTED — canonical only, full width.
      await page.goto(`/canonical/scripts/${SLUG}`)
      await expect(page.locator('.lang-picker')).toBeVisible()
      await expect(page.locator('table.script-table.canonical-only').first()).toBeVisible()
      const headsBefore = await page.locator('table.script-table thead th').first()
        .locator('xpath=../th').count()
      expect(headsBefore, 'canonical-only is # / Speaker / Canonical / State').toBe(4)
      await shoot(page, `${theme}--${vp.name}--a-scriptlab-canonical-only`, '.lang-picker')
      await assertNoRedOrAmber(page, `script lab canonical-only (${theme})`)

      // (b) SCRIPT LAB WITH A LANGUAGE SELECTED — three columns.
      const langChips = page.locator('.lang-picker .lang-chip')
      const n = await langChips.count()
      if (n > 1) {
        await langChips.nth(1).click()
        await expect(page.locator('table.script-table.canonical-only')).toHaveCount(0)
        const headsAfter = await page.locator('table.script-table thead th').first()
          .locator('xpath=../th').count()
        expect(headsAfter, '# / Speaker / Canonical / Known / Target / State').toBe(6)
        await shoot(page, `${theme}--${vp.name}--b-scriptlab-three-columns`, '.lang-picker')
        await assertNoRedOrAmber(page, `script lab three columns (${theme})`)
      } else {
        // Reported, never papered over: a script with no target layer cannot
        // produce shot (b), and the harness says so rather than faking it.
        fs.writeFileSync(
          path.join(OUT, `${theme}--${vp.name}--b-scriptlab-three-columns.MISSING.txt`),
          `Script "${SLUG}" declares no target language, so there is no language to select `
          + `and no three-column state to photograph. Set E2E_SLUG to a script that carries one.\n`
        )
      }

      // (a2) THE SAME SCREEN ON A SCRIPT WITH NO LANGUAGE LAYER AT ALL — the
      //      chip row says so in words rather than offering a dead control.
      await page.goto(`/canonical/scripts/${SLUG_NO_LANG}`)
      await expect(page.locator('table.script-table.canonical-only').first()).toBeVisible()
      await expect(page.locator('.lang-picker')).toContainText('no target-language layer yet')
      await shoot(page, `${theme}--${vp.name}--a2-scriptlab-no-language-layer`, '.lang-picker')
      await assertNoRedOrAmber(page, `script lab, no language layer (${theme})`)

      // (c) THE METAGRAPH CARD GRID, with a pod laid over it so the two drawn
      //     states are both on screen.
      await page.goto('/canonical/metagraph')
      await expect(page.locator('svg[aria-label="the shape metagraph"]')).toBeVisible()
      // The pod list arrives from the API AFTER first paint, so the chip row
      // starts life with only "Graph only" in it. Counting it too early skips
      // the overlay entirely and photographs the resting graph — which is what
      // happened on the first run of this harness, and is why the wait is
      // explicit rather than a bare count.
      const podChips = page.locator('.flex.flex-wrap.gap-2.mb-3 button')
      await expect.poll(() => podChips.count(), { timeout: 60_000 }).toBeGreaterThan(1)
      await podChips.nth(1).click()
      // And wait for the OVERLAY to land, not merely for the click: the chip
      // carries "· loading…" until the fetch returns.
      await expect(page.locator('.tile-box.is-never').first()).toBeVisible({ timeout: 60_000 })
      await expect(page.locator('.tile-box.is-once, .tile-box.is-twice').first()).toBeVisible()
      await expect(page.locator('.flex.flex-wrap.gap-2.mb-3').first()).not.toContainText('loading')

      await shoot(page, `${theme}--${vp.name}--c-metagraph-cards`)
      await assertNoRedOrAmber(page, `metagraph (${theme})`)
    })
  }
}
