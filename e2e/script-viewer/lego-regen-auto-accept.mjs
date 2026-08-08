// Live end-to-end check of LEGO regenerate auto-accept, in a real browser,
// reproducing Tom's exact path (2026-08-08 01:14): find the LEGO by SEARCH,
// regenerate Voice 2, then play the OTHER row for the same LEGO and see which
// s3 object it actually asks for.
import { chromium } from 'playwright'

const BASE = 'http://127.0.0.1:5197'
const API = 'http://localhost:3470'
const COURSE = process.env.COURSE || 'deu_for_eng'
const SEARCH = process.argv[2] || 'what I mean'
const PUNCT = process.argv[3] || '…'
const EMAIL = 'e2e-pod-recording-test@ssi-test.invalid'
const PASSWORD = 'E2E-pod-recording-test-pw-2026'

const browser = await chromium.launch()
const ctx = await browser.newContext()
// EnvironmentSwitcher forces api_base_url back to a remote tunnel on mount —
// pin ours (same trick as e2e/pod-recording/helpers.js).
await ctx.addInitScript((api) => {
  const real = window.localStorage.setItem.bind(window.localStorage)
  window.localStorage.setItem = (k, v) => { if (k === 'api_base_url') return; return real(k, v) }
  real('api_base_url', api)
}, API)
const page = await ctx.newPage()

const resolved = []
page.on('response', async r => {
  const u = r.url()
  if (u.includes('/audio/') && u.endsWith('/url')) {
    const uuid = u.split('/audio/')[1].replace('/url', '')
    try { const j = await r.json(); resolved.push({ uuid, key: (j.url || '').split('?')[0].split('.com/')[1] }) } catch {}
  }
})

await page.goto(`${BASE}/login`)
await page.getByPlaceholder('you@example.com').fill(EMAIL)
await page.getByRole('button', { name: 'Use password instead' }).click()
await page.getByPlaceholder('Enter your password').fill(PASSWORD)
await page.getByRole('button', { name: 'Sign In' }).click()
await page.waitForURL(u => !u.pathname.startsWith('/login'), { timeout: 30000 })
console.log('logged in')

await page.goto(`${BASE}/production/${COURSE}/script`)
const searchBox = page.locator('input[placeholder*="earch"]').first()
await searchBox.waitFor({ timeout: 120000 })
await searchBox.fill(SEARCH)
console.log(`searching "${SEARCH}" …`)
await page.waitForResponse(r => r.url().includes('/learning-journey/search'), { timeout: 300000 })
await page.waitForTimeout(2000)

const mic = page.locator('button[title="Regenerate LEGO audio (text is locked)"]')
console.log(`search view rendered, ${await mic.count()} regenerable LEGO rows on screen`)

// The play buttons that belong to THIS lego: the intro row and the debut row.
// Read what each is bound to BEFORE, by clicking them and recording the fetch.
const before = []
const playV2 = page.locator('button[title="Play Voice 2"]')
for (const i of [0, 1]) { await playV2.nth(i).click(); await page.waitForTimeout(1800) }
before.push(...resolved.splice(0))
console.log('before regeneration, the first two Voice 2 buttons served:')
for (const r of before) console.log('   ', r.uuid, '→', r.key)

await mic.first().click()
await page.waitForSelector('text=Regenerate LEGO audio', { timeout: 20000 })
console.log('dialog open on', (await page.locator('h3 span.font-mono').first().textContent())?.trim())

const boxes = page.locator('input[type="checkbox"]')
if (await boxes.nth(1).isChecked()) await boxes.nth(1).uncheck()
if (!(await boxes.nth(2).isChecked())) await boxes.nth(2).check()
await page.locator(`button[title="${PUNCT === '…' ? 'Append an ellipsis' : 'Append a comma'}"]`).nth(1).click()

await page.locator('button:has-text("Regenerate audio")').click()
await page.waitForSelector('.bg-emerald-900 audio', { timeout: 300000 })
console.log('panel:', (await page.locator('.bg-emerald-900').first().innerText()).replace(/\n+/g, ' | '))
resolved.splice(0)                                  // drop the audition fetch
await page.waitForTimeout(1500)
await page.locator('button:has-text("Close")').first().click()
await page.waitForTimeout(1000)

console.log('after regeneration, the same two Voice 2 buttons serve:')
for (const i of [0, 1]) { await playV2.nth(i).click(); await page.waitForTimeout(1800) }
for (const r of resolved) console.log('   ', r.uuid, '→', r.key)

const changed = resolved.filter((r, i) => before[i] && r.key !== before[i].key).length
console.log(changed === before.length && before.length > 0
  ? `PASS — all ${before.length} rows moved to the new clip`
  : `FAIL — ${changed}/${before.length} rows moved`)
await browser.close()
