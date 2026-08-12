// Live check of the word-mapping viewer/editor in a real browser.
//
// Proves the things a screenshot cannot: that flipping a row into the aligned
// grid does NOT change its height or move the rows below it (Tom's hard
// requirement, 2026-08-12), that the TARGET line sits above its gloss in the
// target's own order, that a row with nothing to align shows no glyph, and that
// splitting / merging / nudging persists across a full reload.
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
check(glyphCount > 0, '1. "check mapping" glyph is on the rows that have an alignment', `${glyphCount} on screen`)

const rowStats = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('.item-row')]
  return {
    total: rows.length,
    withGlyph: rows.filter(r => r.querySelector('button[title="Check mapping"]')).length,
  }
})
check(rowStats.withGlyph < rowStats.total,
  '2. rows with nothing to align show no glyph',
  `${rowStats.total - rowStats.withGlyph} of ${rowStats.total} rows have none`)

// ── Row height: the hard requirement ──────────────────────────────────────
const target = glyphs.nth(Math.min(3, glyphCount - 1))
const row = target.locator('xpath=ancestor::div[contains(@class,"item-row")][1]')

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
  '3. the row does not get deeper when the alignment opens',
  `${heightBefore.toFixed(1)}px -> ${heightAfter.toFixed(1)}px`)
const movedRows = topsBefore.filter((t, i) => Math.abs(t - topsAfter[i]) >= 1).length
const resizedRows = heightsBefore.filter((h, i) => Math.abs(h - heightsAfter[i]) >= 1).length
check(movedRows === 0 && resizedRows === 0,
  '4. not one of the other rows moves or resizes',
  `${topsBefore.length} rows measured, ${movedRows} moved, ${resizedRows} resized`)

// ── Target order preserved, gloss underneath ──────────────────────────────
const readGrid = async (scope) => scope.evaluate(el => ({
  words: [...el.querySelectorAll('.mapping-word')].map(w => w.textContent.trim()),
  glosses: [...el.querySelectorAll('.mapping-gloss')].map(g => g.textContent.trim()),
  chunks: el.querySelectorAll('.mapping-col').length,
  wordTop: el.querySelector('.mapping-word')?.getBoundingClientRect().top,
  glossTop: el.querySelector('.mapping-gloss')?.getBoundingClientRect().top,
}))
const grid = await readGrid(row)
check(grid.words.length > 1, '5. one cell per target word', `${grid.words.length} words`)
check(grid.wordTop < grid.glossTop,
  '6. the TARGET line is on top, the literal gloss underneath it')

// The rendered target words must be the row's own target text, in its own
// order — never reordered to make the known side read naturally.
const rowTarget = await row.evaluate(el => {
  const one = el.querySelector('.mapping-oneline')
  return one ? one.lastElementChild.textContent.trim() : null
})
const targetFromApi = await page.evaluate(async ([course, api]) => {
  const r = await fetch(`${api}/api/production/${course}/learning-journey?maxLegos=25&offset=0`)
  const d = await r.json()
  return (d.allItems || []).filter(i => i.mapping).map(i => i.target_text)
}, [COURSE, API])
check(targetFromApi.some(t => t.split(/\s+/).join(' ') === grid.words.join(' ')),
  '7. the column words are a real target sentence, in target order',
  grid.words.join(' '))

// ── The three gestures ────────────────────────────────────────────────────
const chunksNow = async () => (await readGrid(row)).chunks
const glossesNow = async () => (await readGrid(row)).glosses

const startChunks = await chunksNow()
console.log(`  editing a row of ${grid.words.length} target words in ${startChunks} chunks:`,
  JSON.stringify(await glossesNow()))

// Capture the row's EXACT starting state so it can be put back precisely.
// Merging back only restores the chunk COUNT — a nudge moves a word across a
// break, and merging does not move it home again.
const rowIdent = await page.evaluate(async ([course, api, words]) => {
  const r = await fetch(`${api}/api/production/${course}/learning-journey?maxLegos=25&offset=0`)
  const d = await r.json()
  const it = (d.allItems || []).find(i => i.mapping
    && i.mapping.words.join(' ') === words.join(' '))
  return it ? {
    source: it.mapping.source,
    rowId: it.mapping.source === 'phrase' ? it.phrase_id : it.legoId,
    segments: it.mapping.segments,
  } : null
}, [COURSE, API, grid.words])
check(!!rowIdent, '7b. the edited row was identified for exact restore')

// SPLIT — tap the divider inside a multi-column chunk.
const splitBtn = row.locator('.mapping-split')
if (await splitBtn.count()) {
  await splitBtn.first().click()
  await page.waitForResponse(r => r.url().includes('/mapping/'), { timeout: 30000 })
  await page.waitForTimeout(1000)
  const afterSplit = await chunksNow()
  check(afterSplit === startChunks + 1, '8. tapping inside a chunk splits it',
    `${startChunks} -> ${afterSplit} chunks`)
  const st = await row.locator('.mapping-status').textContent().catch(() => '')
  check((st || '').includes('Saved'), '9. the split saves and says so on the row', `"${(st||'').trim()}"`)

  // NUDGE — move one gloss word across a divider; columns must not change.
  const beforeNudge = await readGrid(row)
  await row.locator('.mapping-nudge').first().click()
  await page.waitForResponse(r => r.url().includes('/mapping/'), { timeout: 30000 })
  await page.waitForTimeout(1000)
  const afterNudge = await readGrid(row)
  check(JSON.stringify(afterNudge.words) === JSON.stringify(beforeNudge.words),
    '10. nudging never moves a TARGET word')
  check(JSON.stringify(afterNudge.glosses) !== JSON.stringify(beforeNudge.glosses)
        || beforeNudge.glosses.every(g => g === '·'),
    '11. nudging moves a gloss word between chunks',
    `${JSON.stringify(beforeNudge.glosses)} -> ${JSON.stringify(afterNudge.glosses)}`)

  // Reload: is it really persisted?
  const persisted = await glossesNow()
  await openJourney()
  const reGlyph = page.locator('button[title="Check mapping"]').nth(Math.min(3, glyphCount - 1))
  const reRow = reGlyph.locator('xpath=ancestor::div[contains(@class,"item-row")][1]')
  await reGlyph.click()
  await page.waitForTimeout(600)
  const reloaded = await readGrid(reRow)
  check(JSON.stringify(reloaded.glosses) === JSON.stringify(persisted),
    '12. after a full reload the new cut is still there', JSON.stringify(reloaded.glosses))

  // MERGE back, twice if needed, to return the row to its starting shape.
  let guard = 0
  while ((await readGrid(reRow)).chunks > startChunks && guard++ < 6) {
    await reRow.locator('.mapping-merge').first().click()
    await page.waitForResponse(r => r.url().includes('/mapping/'), { timeout: 30000 })
    await page.waitForTimeout(900)
  }
  const back = await readGrid(reRow)
  check(back.chunks === startChunks, '13. merging returns the row to its original chunk count',
    `${back.chunks} chunks`)

  // Put the row back EXACTLY, through the same gated endpoint the UI uses.
  if (rowIdent) {
    const restore = await page.evaluate(async ([course, api, ident]) => {
      const tok = JSON.parse(Object.keys(localStorage)
        .filter(k => k.includes('auth-token')).map(k => localStorage.getItem(k))[0] || '{}')
      const r = await fetch(`${api}/api/production/${course}/mapping/${encodeURIComponent(ident.rowId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json',
                   Authorization: `Bearer ${tok.access_token || ''}` },
        body: JSON.stringify({ source: ident.source, segments: ident.segments }),
      })
      return { status: r.status, body: await r.json().catch(() => null) }
    }, [COURSE, API, rowIdent])
    check(restore.status === 200,
      '15. the edited row is restored to exactly how it was found',
      `HTTP ${restore.status} ${JSON.stringify(restore.body?.segments || restore.body?.error)}`)
  }
} else {
  check(false, '8-13. the chosen row had no multi-column chunk to split')
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
