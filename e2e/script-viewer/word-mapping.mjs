// Live check of the word-mapping viewer/editor in a real browser.
//
// Proves the things a screenshot cannot: that flipping a row into two lines
// does NOT change its height or move the rows below it (Tom's hard requirement,
// 2026-08-12), that touching either partner lights up both, that a row with
// nothing to pair shows no glyph, and that a tap-tap re-pairing persists across
// a full reload.
//
//   npm run build
//   npx vite preview --port 5197 --strictPort --host 127.0.0.1 &
//   node e2e/script-viewer/word-mapping.mjs
import { chromium } from 'playwright'

const BASE = 'http://127.0.0.1:5197'
const API = process.env.MAPPING_API || 'http://127.0.0.1:3479'
const COURSE = process.env.COURSE || 'eus_for_eng'
const EMAIL = 'e2e-pod-recording-test@ssi-test.invalid'
const PASSWORD = 'E2E-pod-recording-test-pw-2026'

const results = []
const check = (ok, label, detail = '') => {
  results.push({ ok, label, detail })
  console.log(`${ok ? '  ✓' : '  ✗'} ${label}${detail ? ' — ' + detail : ''}`)
}

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } })
await ctx.addInitScript((api) => {
  const real = window.localStorage.setItem.bind(window.localStorage)
  window.localStorage.setItem = (k, v) => { if (k === 'api_base_url') return; return real(k, v) }
  real('api_base_url', api)
}, API)
const page = await ctx.newPage()
page.on('pageerror', e => console.log('  ! page error:', e.message))

await page.goto(`${BASE}/login`)
await page.getByPlaceholder('you@example.com').fill(EMAIL)
await page.getByRole('button', { name: 'Use password instead' }).click()
await page.getByPlaceholder('Enter your password').fill(PASSWORD)
await page.getByRole('button', { name: 'Sign In' }).click()
await page.waitForURL(u => !u.pathname.startsWith('/login'), { timeout: 30000 })
console.log('logged in')

const openJourney = async () => {
  await page.goto(`${BASE}/production/${COURSE}/script`)
  // Wait for the rounds themselves, not for a network event — by the time a
  // warm API answers, the response listener may already have missed it.
  await page.waitForSelector('.round-card', { timeout: 180000 })
  const expand = page.locator('button:has-text("Expand all")').first()
  for (let attempt = 0; attempt < 3; attempt++) {
    if (await expand.count()) { await expand.click(); }
    try {
      await page.waitForFunction(() => document.querySelectorAll('.item-row').length > 50,
        null, { timeout: 20000 })
      break
    } catch { await page.waitForTimeout(2000) }
  }
  await page.waitForTimeout(1500)
}
await openJourney()

const glyphs = page.locator('button[title="Check mapping"]')
const glyphCount = await glyphs.count()
check(glyphCount > 0, '1. "check mapping" glyph is on the rows that have a mapping', `${glyphCount} on screen`)

// Rows WITHOUT a mapping must have no glyph at all — no dead affordance.
const rowStats = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('.item-row')]
  return {
    total: rows.length,
    withGlyph: rows.filter(r => r.querySelector('button[title="Check mapping"]')).length,
  }
})
check(rowStats.withGlyph < rowStats.total,
  '2. rows with nothing to pair show no glyph',
  `${rowStats.total - rowStats.withGlyph} of ${rowStats.total} rows have none`)

// ── Row height: the hard requirement ──────────────────────────────────────
const target = glyphs.nth(Math.min(3, glyphCount - 1))
const row = target.locator('xpath=ancestor::div[contains(@class,"item-row")][1]')

// Measure EVERY row's top before and after. Nothing below the flipped row may
// move by even a pixel — that is the requirement, and a single following
// sibling is too weak a test for it (the row may be the last in its round).
const allTops = () => page.evaluate(() =>
  [...document.querySelectorAll('.item-row')].map(r => r.getBoundingClientRect().top + window.scrollY))
const allHeights = () => page.evaluate(() =>
  [...document.querySelectorAll('.item-row')].map(r => r.getBoundingClientRect().height))

const topsBefore = await allTops()
const heightsBefore = await allHeights()
const heightBefore = (await row.boundingBox()).height
await target.click()
await page.waitForTimeout(500)
const heightAfter = (await row.boundingBox()).height
const topsAfter = await allTops()
const heightsAfter = await allHeights()

check(Math.abs(heightAfter - heightBefore) < 1,
  '3. the row does not get deeper when the mapping opens',
  `${heightBefore.toFixed(1)}px -> ${heightAfter.toFixed(1)}px`)

const movedRows = topsBefore.filter((t, i) => Math.abs(t - topsAfter[i]) >= 1).length
const resizedRows = heightsBefore.filter((h, i) => Math.abs(h - heightsAfter[i]) >= 1).length
check(movedRows === 0 && resizedRows === 0,
  '4. not one of the other rows moves or resizes',
  `${topsBefore.length} rows measured, ${movedRows} moved, ${resizedRows} resized`)

const knownChips = row.locator('.mapping-chip-known')
const targetChips = row.locator('.mapping-chip-target')
const kN = await knownChips.count(); const tN = await targetChips.count()
check(kN > 0 && tN > 0, '5. two lines of chips, known above target', `${kN} known / ${tN} target`)

const lineTops = await row.evaluate(el => {
  const k = el.querySelector('.mapping-chip-known')?.getBoundingClientRect().top
  const t = el.querySelector('.mapping-chip-target')?.getBoundingClientRect().top
  return { k, t }
})
check(lineTops.k < lineTops.t, '6. the known line is the top line')

// ── Pairing highlight, on hover AND on tap ────────────────────────────────
await knownChips.first().hover()
await page.waitForTimeout(250)
const pairedOnHover = await row.locator('.mapping-chip-paired').count()
check(pairedOnHover >= 2, '7. hovering one chip lights up BOTH partners', `${pairedOnHover} chips lit`)

const litSides = await row.evaluate(el => {
  const lit = [...el.querySelectorAll('.mapping-chip-paired')]
  return { known: lit.filter(c => c.classList.contains('mapping-chip-known')).length,
           target: lit.filter(c => c.classList.contains('mapping-chip-target')).length }
})
check(litSides.known >= 1 && litSides.target >= 1,
  '8. the lit pair spans both lines', `${litSides.known} known + ${litSides.target} target`)

// ── The re-pairing gesture ────────────────────────────────────────────────
const readPairs = async () => row.evaluate(el => ({
  known: [...el.querySelectorAll('.mapping-chip-known')].map(c => c.textContent.trim()),
  target: [...el.querySelectorAll('.mapping-chip-target')].map(c => c.textContent.trim()),
}))
const rowLabel = await row.locator('.type-badge').first().textContent()
const pairsBefore = await readPairs()

// Which target chip is the FIRST known chip paired with? That, not the order of
// the text, is what a re-pairing changes — both lines keep their own natural
// reading order, so the words never move; only the partner does.
const partnerOf0 = async (scope) => {
  await scope.locator('.mapping-chip-known').first().hover()
  await page.waitForTimeout(250)
  return scope.evaluate(el => [...el.querySelectorAll('.mapping-chip-target')]
    .findIndex(c => c.classList.contains('mapping-chip-paired')))
}
const partnerBefore = await partnerOf0(row)
console.log(`  editing the ${rowLabel.trim()} row: known ${JSON.stringify(pairsBefore.known)}`)

if (kN >= 2) {
  await knownChips.nth(0).click()
  await page.waitForTimeout(200)
  const armed = await row.locator('.mapping-chip-armed').count()
  check(armed === 1, '9. the first tap arms exactly one chip')

  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)
  check(await row.locator('.mapping-chip-armed').count() === 0, '10. Escape disarms it')

  // Tap a known chip, then a chip on the OTHER line that is NOT already its
  // partner — tapping a chip's own partner is correctly a no-op, so it proves
  // nothing about saving.
  await knownChips.nth(0).click()
  await page.waitForTimeout(300)
  const otherIdx = await row.evaluate(el => {
    const t = [...el.querySelectorAll('.mapping-chip-target')]
    return t.findIndex(c => !c.classList.contains('mapping-chip-paired'))
  })
  check(otherIdx >= 0, '10b. the armed chip has a non-partner to swap with', `target chip #${otherIdx}`)
  await targetChips.nth(otherIdx).click()
  await page.waitForResponse(r => r.url().includes('/mapping/'), { timeout: 30000 })
  await page.waitForTimeout(1200)

  const status = await row.locator('.mapping-status').textContent().catch(() => '')
  check((status || '').includes('Saved'), '11. the swap saves and says so on the row', `"${(status||'').trim()}"`)

  const pairsAfter = await readPairs()
  check(JSON.stringify(pairsAfter.known) === JSON.stringify(pairsBefore.known),
    '12. neither line reordered — the words stay where they read',
    JSON.stringify(pairsAfter.known))
  const partnerAfter = await partnerOf0(row)
  check(partnerAfter !== partnerBefore && partnerAfter >= 0,
    '12b. the first known word is now paired with a different target word',
    `target chip #${partnerBefore} -> #${partnerAfter}`)

  // ── Reload: is it really persisted? ─────────────────────────────────────
  await openJourney()
  const reloadedGlyph = page.locator('button[title="Check mapping"]').nth(Math.min(3, glyphCount - 1))
  const reloadedRow = reloadedGlyph.locator('xpath=ancestor::div[contains(@class,"item-row")][1]')
  await reloadedGlyph.click()
  await page.waitForTimeout(600)
  const partnerReloaded = await partnerOf0(reloadedRow)
  check(partnerReloaded === partnerAfter,
    '13. after a full reload the new pairing is still there',
    `target chip #${partnerReloaded}`)

  // Put it back.
  const rKnown = reloadedRow.locator('.mapping-chip-known')
  const rTarget = reloadedRow.locator('.mapping-chip-target')
  await rKnown.nth(0).click(); await page.waitForTimeout(300)
  const rOther = await reloadedRow.evaluate(el => {
    const t = [...el.querySelectorAll('.mapping-chip-target')]
    return t.findIndex(c => !c.classList.contains('mapping-chip-paired'))
  })
  await rTarget.nth(rOther).click()
  await page.waitForResponse(r => r.url().includes('/mapping/'), { timeout: 30000 })
  await page.waitForTimeout(1000)
  console.log('  restored the row to its original pairing')
}

// ── Nothing else regressed ────────────────────────────────────────────────
await page.screenshot({ path: '/tmp/word-mapping.png', fullPage: false })
const controls = await page.evaluate(() => ({
  pencils: document.querySelectorAll('button[title="Edit text"]').length,
  mics: document.querySelectorAll('button[title="Regenerate LEGO audio (text is locked)"]').length,
  narration: document.querySelectorAll('button[title="Edit intro narration & regenerate audio"]').length,
  plays: document.querySelectorAll('.play-item-btn').length,
  rounds: document.querySelectorAll('.round-card').length,
}))
check(controls.pencils > 0 && controls.mics > 0 && controls.narration > 0 && controls.plays > 0 && controls.rounds > 0,
  '14. the existing row controls are all still there', JSON.stringify(controls))

const failed = results.filter(r => !r.ok)
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`)
await browser.close()
process.exit(failed.length ? 1 : 0)
