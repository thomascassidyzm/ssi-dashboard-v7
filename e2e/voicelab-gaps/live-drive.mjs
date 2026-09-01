/**
 * THE LIVE PROBE — the three gaps, driven on the DEPLOYED site.
 *
 * Not a test suite: one targeted walk of popty.app against the watson-1
 * production API, because "it works on a local build" is not the claim being
 * made. Screenshots default to scripts/vl-gaps/shots-live (gitignored); set
 * E2E_SHOT_DIR to put them somewhere a human can open them.
 */
import { chromium } from 'playwright'
import { fileURLToPath } from 'url'
import path from 'path'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { EMAIL, PASSWORD } = require('../pod-recording/seed-test-user.cjs')

const BASE = process.env.E2E_BASE_URL || 'https://popty.app'
const API = process.env.E2E_API_BASE || 'https://watson-1.tail4968cb.ts.net:8443'
const OUT = process.env.E2E_SHOT_DIR || path.dirname(fileURLToPath(import.meta.url)) + '/../../scripts/vl-gaps/shots-live'
const MIC = process.env.E2E_MIC_WAV
/**
 * THE VOICE THE CONSENT WALK USES. A TEST ROW, always, and never a real
 * person: a consent record is about somebody, and a probe that writes one onto
 * a real voice has forged it. Create and remove it with
 * scripts/vl-gaps/test-voice.cjs.
 */
const PROBE = process.env.E2E_PROBE_VOICE || 'Consent probe (test)'

const browser = await chromium.launch({
  args: [
    '--use-fake-device-for-media-stream',
    '--use-fake-ui-for-media-stream',
    '--autoplay-policy=no-user-gesture-required',
    ...(MIC ? [`--use-file-for-fake-audio-capture=${MIC}`] : []),
    // popty.app is a public origin and watson-1 sits in the CGNAT range
    // Chromium calls PRIVATE, so it blocks the lab's fetches. Browser network
    // policy, not the lab. Chromium also runs its own DNS, so MagicDNS names
    // need mapping.
    '--disable-features=BlockInsecurePrivateNetworkRequests,PrivateNetworkAccessSendPreflights,PrivateNetworkAccessRespectPreflightResults,LocalNetworkAccessChecks',
    '--host-resolver-rules=MAP watson-1.tail4968cb.ts.net 100.108.9.37',
  ],
})
const ctx = await browser.newContext({
  permissions: ['microphone'],
  ignoreHTTPSErrors: true,
  viewport: { width: 1280, height: 900 },
})
const page = await ctx.newPage()
page.setDefaultTimeout(90_000)

await page.addInitScript((apiBase) => {
  const real = window.localStorage.setItem.bind(window.localStorage)
  window.localStorage.setItem = function (k, v) { if (k === 'api_base_url') return; return real(k, v) }
  real('api_base_url', apiBase)
}, API)

await page.goto(`${BASE}/login`)
await page.getByPlaceholder('you@example.com').fill(EMAIL)
await page.getByRole('button', { name: 'Use password instead' }).click()
await page.getByPlaceholder('Enter your password').fill(PASSWORD)
await page.getByRole('button', { name: 'Sign In' }).click()
await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 90_000 })
console.log('signed in')

await page.goto(`${BASE}/admin/labs/voice`)
await page.locator('.ui-table').first().waitFor()
await page.locator('.ui-search').fill('english')
await page.getByRole('button', { name: 'Voices' }).first().click()
await page.locator('.vl-cand').first().waitFor()
console.log('language open')

// ── GAP 1 ────────────────────────────────────────────────────────────────────
const row = page.locator('.vl-cand', { hasText: PROBE }).first()
await row.scrollIntoViewIfNeeded()
try {
  await row.locator('.vl-cand-noconsent').waitFor({ timeout: 30_000 })
} catch (e) {
  await page.screenshot({ path: `${OUT}/0x-chip-not-visible.png`, fullPage: true })
  console.log('CHIP NOT VISIBLE. row html:', await row.innerHTML())
  throw e
}
await row.locator('..').screenshot({ path: `${OUT}/1a-before-no-cast-button.png` })
await row.locator('.vl-cand-noconsent').click()
const panel = page.locator('.cs-step')
await panel.waitFor()
await panel.getByRole('textbox', { name: 'Whose voice is this?' }).fill('Consent Probe')
await panel.locator('.cs-clip').first().waitFor()
await panel.scrollIntoViewIfNeeded()
await panel.screenshot({ path: `${OUT}/1b-consent-panel.png` })
await panel.getByRole('button', { name: '● Record' }).click()
await page.waitForTimeout(6000)
await panel.getByRole('button', { name: /Stop/ }).click()
await panel.locator('audio').waitFor()
await panel.scrollIntoViewIfNeeded()
await panel.screenshot({ path: `${OUT}/1c-line-read-aloud.png` })
await panel.getByRole('button', { name: 'Record this consent' }).click()

// THE SECOND STAMP. Landed on main the same evening (19b1bb19a): a declaration
// alone no longer casts — the person hears the thing that will be used and
// answers, with a no exactly as easy as a yes. So the panel does not close on
// the declaration; it becomes the confirmation.
const confirm = page.locator('text=Now play the clone to them').first()
await confirm.waitFor({ timeout: 120_000 })
await panel.scrollIntoViewIfNeeded()
await panel.screenshot({ path: `${OUT}/1d-second-stamp.png` })
console.log('gap 1 ✓ declaration recorded live — the second stamp is now asking')
await page.getByRole('button', { name: /sounds like me/ }).click()
await panel.waitFor({ state: 'detached', timeout: 120_000 })
const after = page.locator('.vl-cand', { hasText: PROBE }).first()
await after.scrollIntoViewIfNeeded()
await after.locator('.vl-consent-pill', { hasText: 'authorised' }).waitFor()
await after.locator('.vl-cand-cast').waitFor()
await after.locator('..').screenshot({ path: `${OUT}/1e-after-authorised-and-castable.png` })
console.log('gap 1 ✓ confirmed live — authorised, and the Cast button is there')

// ── GAP 2 ────────────────────────────────────────────────────────────────────
const empty = page.locator('.vl-cand-play.is-empty').first()
await empty.scrollIntoViewIfNeeded()
const before2 = page.locator('.vl-cand').filter({ has: page.locator('.vl-cand-play.is-empty') }).first()
const name2 = (await before2.locator('.vl-cand-name').innerText()).trim()
await before2.locator('..').screenshot({ path: `${OUT}/2a-no-clip.png` })
await empty.click()
const row2 = page.locator('.vl-cand', { hasText: name2 }).first()
await row2.locator('.vl-cand-play:not(.is-empty)').first().waitFor({ timeout: 180_000 })
await row2.scrollIntoViewIfNeeded()
await row2.locator('..').screenshot({ path: `${OUT}/2b-rendered-and-playing.png` })
console.log(`gap 2 ✓ heard ${name2}, which had no clip`)

// ── GAP 3 ────────────────────────────────────────────────────────────────────
// ON THE VOICE GAP 2 JUST RENDERED, deliberately. The first pass of this probe
// opened the set on Tom_002 and reported three clips: Tom_002 is an unconsented
// clone, the consent gate refused both renders exactly as it should, two pills
// stayed dashed, and the line printed anyway because it asserted nothing. A
// probe that cannot fail is not a probe.
const row3 = page.locator('.vl-cand', { hasText: name2 }).first()
await row3.locator('.vl-cand-name').click()
const set = page.locator('.vl-cand-set').first()
await set.locator('.vl-cand-line').nth(2).waitFor()
await set.locator('..').screenshot({ path: `${OUT}/3a-judging-set.png` })
for (let i = 0; i < 3; i++) {
  const line = set.locator('.vl-cand-line').nth(i)
  await line.click()
  for (let t = 0; t < 180; t++) {
    if (!((await line.getAttribute('class')) || '').includes('is-empty')) break
    await page.waitForTimeout(1000)
  }
}
const stillEmpty = await set.locator('.vl-cand-line.is-empty').count()
if (stillEmpty) throw new Error(`gap 3 FAILED: ${stillEmpty} of 3 lines never rendered for ${name2}`)
await set.locator('..').screenshot({ path: `${OUT}/3b-three-clips-one-voice.png` })
console.log(`gap 3 ✓ three clips, three different lines, one voice — ${name2}`)

await browser.close()
