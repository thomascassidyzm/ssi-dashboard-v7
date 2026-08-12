// Live check of the word-mapping viewer/editor in a real browser.
//
// Proves the things a screenshot cannot: that flipping a row into the aligned
// grid does NOT change its height or move the rows below it (Tom's hard
// requirement, 2026-08-12), that the TARGET line sits above its gloss in the
// target's own order, that a row with nothing to align shows no glyph, that
// splitting / merging / nudging persists across a full reload, and that a row
// can be put BACK to the mapping nobody cut — through the UI, with no SQL.
//
//   npm run build
//   npx vite preview --port 5197 --strictPort --host 127.0.0.1 &
//   node e2e/script-viewer/word-mapping.mjs
//
// The same file drives the DEPLOYED site against the live backend, which is the
// only evidence that counts for a change to this gate:
//
//   LD_LIBRARY_PATH=/home/tomcassidy/.pwlibs/root/usr/lib/x86_64-linux-gnu \
//   BASE=https://popty.app MAPPING_API=https://watson-1.tail4968cb.ts.net:8443 \
//   node e2e/script-viewer/word-mapping.mjs
import { chromium } from 'playwright'

const BASE = process.env.BASE || 'http://127.0.0.1:5197'
const API = process.env.MAPPING_API || 'http://127.0.0.1:3479'
const COURSE = process.env.COURSE || 'eus_for_eng'
const EMAIL = 'e2e-pod-recording-test@ssi-test.invalid'
const PASSWORD = 'E2E-pod-recording-test-pw-2026'

const results = []
const check = (ok, label, detail = '') => {
  results.push({ ok, label, detail })
  console.log(`${ok ? '  ✓' : '  ✗'} ${label}${detail ? ' — ' + detail : ''}`)
}

const browser = await chromium.launch({
  args: [
    // Only bites on the deployed run: popty.app is a PUBLIC origin and the
    // backend's tailnet address is CGNAT, which Chromium classes as private, so
    // it blocks the fetch outright. Browser network policy, not CORS, not the
    // feature. Harmless locally.
    '--disable-features=BlockInsecurePrivateNetworkRequests,PrivateNetworkAccessSendPreflights,PrivateNetworkAccessRespectPreflightResults,LocalNetworkAccessChecks',
    // Chromium runs its own async resolver, which cannot see MagicDNS names.
    '--host-resolver-rules=MAP watson-1.tail4968cb.ts.net 100.108.9.37',
  ],
})
const ctx = await browser.newContext({
  viewport: { width: 1600, height: 1000 },
  ignoreHTTPSErrors: true,
})
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
  const tok = JSON.parse(Object.keys(localStorage)
    .filter(k => k.includes('auth-token')).map(k => localStorage.getItem(k))[0] || '{}')
  const r = await fetch(`${api}/api/production/${course}/learning-journey?maxLegos=25&offset=0`,
    { headers: { Authorization: `Bearer ${tok.access_token || ''}` } })
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
  const tok = JSON.parse(Object.keys(localStorage)
    .filter(k => k.includes('auth-token')).map(k => localStorage.getItem(k))[0] || '{}')
  const r = await fetch(`${api}/api/production/${course}/learning-journey?maxLegos=25&offset=0`,
    { headers: { Authorization: `Bearer ${tok.access_token || ''}` } })
  const d = await r.json()
  const it = (d.allItems || []).find(i => i.mapping
    && i.mapping.words.join(' ') === words.join(' '))
  return it ? {
    source: it.mapping.source,
    rowId: it.mapping.source === 'phrase' ? it.phrase_id : it.legoId,
    segments: it.mapping.segments,
    // Whether a HUMAN had cut this row before the run touched it. This decides
    // what "put it back" means at the end, and it is the state the revert path
    // exists to be able to return to.
    segmented: it.mapping.segmented,
  } : null
}, [COURSE, API, grid.words])
check(!!rowIdent, '7b. the edited row was identified for exact restore',
  rowIdent ? `${rowIdent.rowId}, hand-segmented before the run: ${rowIdent.segmented}` : '')

// The way back must not be offered on a row nobody has cut — there is nothing
// there to go back to.
if (rowIdent && !rowIdent.segmented) {
  check(await row.locator('.mapping-revert').count() === 0,
    '7c. a row nobody has cut offers no way back')
}

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

  // ── THE WAY BACK ────────────────────────────────────────────────────────
  // The row is now hand-segmented, whatever it looked like before. A person who
  // has been invited to explore must be able to undo that, with one tap, and
  // without anyone reaching for SQL afterwards.
  const revertBtn = reRow.locator('.mapping-revert')
  check(await revertBtn.count() === 1,
    '15. a row someone has cut offers a way back, in plain words',
    JSON.stringify((await revertBtn.textContent().catch(() => '')) || ''))

  // Geometry again, this time across the revert: the strip must not grow.
  const revertTops = await allTops()
  const revertHeights = await allHeights()
  const revertRowHeight = (await reRow.boundingBox()).height

  await revertBtn.click()
  await page.waitForResponse(r => r.url().includes('/mapping/'), { timeout: 30000 })
  await page.waitForTimeout(1200)

  const revertStatus = await reRow.locator('.mapping-status').textContent().catch(() => '')
  check(!/could not|cannot|non-empty/i.test(revertStatus || '') && !!(revertStatus || '').trim(),
    '16. the revert saves against the API and says so on the row',
    `"${(revertStatus || '').trim()}"`)
  check(await reRow.locator('.mapping-revert').count() === 0,
    '17. the way back disappears once the row is back to the original')

  const afterRevertTops = await allTops()
  const afterRevertHeights = await allHeights()
  const afterRevertRowHeight = (await reRow.boundingBox()).height
  const rMoved = revertTops.filter((t, i) => Math.abs(t - afterRevertTops[i]) >= 1).length
  const rResized = revertHeights.filter((h, i) => Math.abs(h - afterRevertHeights[i]) >= 1).length
  check(Math.abs(afterRevertRowHeight - revertRowHeight) < 1 && rMoved === 0 && rResized === 0,
    '18. reverting costs no row height and moves nothing',
    `${revertTops.length} measured, ${rMoved} moved, ${rResized} resized; ` +
    `row ${revertRowHeight.toFixed(1)}px -> ${afterRevertRowHeight.toFixed(1)}px`)

  // Reload the whole site: is the row REALLY back, or was that only local state?
  await openJourney()
  const backGlyph = page.locator('button[title="Check mapping"]').nth(Math.min(3, glyphCount - 1))
  const backRow = backGlyph.locator('xpath=ancestor::div[contains(@class,"item-row")][1]')
  await backGlyph.click()
  await page.waitForTimeout(800)
  const backGrid = await readGrid(backRow)
  check(JSON.stringify(backGrid.glosses) === JSON.stringify(grid.glosses)
        && backGrid.chunks === startChunks,
    '19. after a full reload the row reads as the original again',
    `${JSON.stringify(grid.glosses)} vs ${JSON.stringify(backGrid.glosses)}`)
  check(await backRow.locator('.mapping-revert').count() === 0,
    '20. and it is served as a row nobody has cut, not as a stored copy')

  // If the row HAD been cut by a person before this run, put their work back —
  // make-before-break: this run must not leave anyone's segmentation deleted.
  if (rowIdent && rowIdent.segmented) {
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
      "21. the row's original human segmentation is put back",
      `HTTP ${restore.status} ${JSON.stringify(restore.body?.segments || restore.body?.error)}`)
  } else {
    check(true, '21. the row was never hand-cut, so the revert IS the restore — no SQL needed')
  }
} else {
  check(false, '8-21. the chosen row had no multi-column chunk to split')
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
  '22. the existing row controls are all still there', JSON.stringify(controls))

const failed = results.filter(r => !r.ok)
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`)
await browser.close()
process.exit(failed.length ? 1 : 0)
