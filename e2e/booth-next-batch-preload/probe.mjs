// cs #306 probe: Next batch timing with the preload on/off, and the edit race (a reconcile that set
// out before an edit, held, then released). Simulated answers only: every request off the preview's
// origin is aborted, so nothing reaches production Popty. Not a test suite; run by hand:
//   npm run build && npx vite preview --port 4806 --strictPort &
//   REPO=$PWD node e2e/booth-next-batch-preload/probe.mjs chromium http://localhost:4806 "$CS_SCRATCH/shots"
//   (WebKit: . ~/.pwlibs/wkenv.sh first, then 'webkit'). Screenshots go to scratch, never committed.
import { createRequire } from 'module'
const require = createRequire(process.env.REPO + '/package.json')
const pw = require('playwright')
const [browserName, BASE, SHOTS] = process.argv.slice(2)
const VOICE = 'human_tom_zzz'
const TRACK = 'seed.zzz_test2_for_eng'
const COLD_MS = 17300
const mk = (b, recorded) => Array.from({ length: 12 }, (_, i) => ({ id: `B${b}-L${i + 1}`, text: `llinell ${b}.${i + 1}`, knownText: `line ${b}.${i + 1}`, recorded, clipUrl: null, canEditText: true }))
const answer = (b, lines) => ({ displayName: 'Tom', languageName: 'Test', track: TRACK, batch: b, total: 12, recorded: lines.filter(l => l.recorded).length, remaining: 12 - lines.filter(l => l.recorded).length, lines })
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

async function setup(browser, mode) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'light' })
  await ctx.addInitScript(() => localStorage.setItem('popty-theme', 'light'))
  const page = await ctx.newPage()
  const log = { preloads: 0, b3reads: 0 }
  let release = null
  const held = new Promise(r => { release = r })
  const origin = new URL(BASE).origin
  await page.route('**/*', (route) => (new URL(route.request().url()).origin === origin ? route.fallback() : route.abort()))
  await page.route('**/api/recording/voice/*/summary*', (route) => route.fulfill({ json: {
    home: true, displayName: 'Tom', languageName: 'Test',
    tracks: [{ key: TRACK, kind: 'seed', courseCode: 'zzz_test2_for_eng', newCourse: true, title: 'New sentences', total: 36, recorded: 12,
      batches: [1, 2, 3].map((n) => ({ n, total: 12, recorded: n <= 2 ? 12 : 0 })) }],
  } }))
  await page.route('**/api/recording/voice/*/line/*/text', (route) => {
    const body = JSON.parse(route.request().postData() || '{}')
    route.fulfill({ json: { text: body.text } })
  })
  await page.route(/\/api\/recording\/voice\/[^/?]+\?/, async (route) => {
    const u = new URL(route.request().url())
    const b = Number(u.searchParams.get('batch'))
    if (u.searchParams.get('preload') === '1') {
      log.preloads++
      if (mode === 'off') return route.fulfill({ status: 204, body: '' })
      return route.fulfill({ json: answer(b, mk(b, false)) })
    }
    if (b !== 3) return route.fulfill({ json: answer(b, mk(b, true)) })
    log.b3reads++
    if (mode === 'race' && log.b3reads === 1) {
      await held // a reconcile read BEFORE her edit: old words, and a take of them on the server
      const lines = mk(3, false); lines[0].recorded = true
      return route.fulfill({ json: answer(3, lines) })
    }
    if (mode === 'race') { const lines = mk(3, false); lines[0].text = 'llinell 3.1 newydd'; return route.fulfill({ json: answer(3, lines) }) }
    await sleep(COLD_MS) // the cold rebuild #216 measured
    return route.fulfill({ json: answer(3, mk(3, false)) })
  })
  // An unlisted GET to any API on this origin answers empty rather than reaching anything real.
  await page.route('**/api/**', (route, req) => route.fallback())
  return { ctx, page, log, release }
}

async function openNext(page) {
  await page.goto(`${BASE}/r/${VOICE}?track=${TRACK}&batch=2`)
  const next = page.locator('[data-test="next-batch"]').first()
  await next.waitFor({ state: 'visible', timeout: 30000 })
  await sleep(2500) // the preload goes out 1.5 s after the batch loads
  const t0 = Date.now()
  await next.click()
  await page.locator('[data-test="ready"]').waitFor({ state: 'visible', timeout: 60000 })
  await page.getByText('llinell 3.1', { exact: false }).first().waitFor({ timeout: 60000 })
  return Date.now() - t0
}

const browser = await pw[browserName].launch()
const out = { browser: browserName }
for (const mode of ['off', 'on']) {
  const { ctx, page, log } = await setup(browser, mode)
  out[`next_${mode}_ms`] = await openNext(page)
  out[`preloads_${mode}`] = log.preloads
  await page.screenshot({ path: `${SHOTS}/${browserName}-next-${mode}.png` })
  await sleep(3000) // give quiet reads/reconcile/watchers the chance to ask again
  out[`preloads_${mode}_after_wait`] = log.preloads
  await ctx.close()
}
{
  const { ctx, page, log, release } = await setup(browser, 'race')
  out.race_next_ms = await openNext(page)
  await page.locator('[data-test="open-sheet"]').first().click()
  await sleep(800)
  await page.evaluate(() => document.querySelector('[data-test="grid-toggle"]').click())
  await sleep(400)
  await page.evaluate(() => document.querySelector('.roster-toggle').click()); await sleep(300); await page.evaluate(() => document.querySelector('.roster-list .sh-btn').click())
  await sleep(500)
  await page.locator('span.row-text', { hasText: /^llinell 3\.1$/ }).first().click()
  const box = page.locator('textarea.row-edit').first()
  await box.fill('llinell 3.1 newydd')
  await box.press('Enter')
  await page.locator('span.row-text', { hasText: 'llinell 3.1 newydd' }).first().waitFor({ timeout: 10000 })
  await page.screenshot({ path: `${SHOTS}/${browserName}-race-edited-reconcile-held.png` })
  release() // the reconcile that set out BEFORE the edit now lands: old words, line recorded
  await sleep(2500)
  const rowLi = page.locator('span.row-text', { hasText: /^llinell 3\.1( newydd)?$/ }).first()
  out.race_line_text = (await rowLi.textContent()).trim()
  out.race_row_state = (await rowLi.locator('xpath=following-sibling::span[contains(@class,"row-state")][1]').textContent()).trim()
  await page.locator('[data-test="close-sheet"]').first().click().catch(() => {})
  await sleep(500)
  out.race_progress = (await page.getByText(/lines — \d+ recorded/).first().textContent().catch(() => '')).trim()
  out.race_b3_reads = log.b3reads
  out.race_edit_survived = out.race_line_text === 'llinell 3.1 newydd'
  out.race_no_tick = /— 0 recorded/.test(out.race_progress)
  await page.screenshot({ path: `${SHOTS}/${browserName}-edit-race.png` })
  await ctx.close()
}
await browser.close()
console.log(JSON.stringify(out))
