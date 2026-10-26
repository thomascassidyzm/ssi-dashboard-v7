// AUTO-ADVANCE ON THE DEPLOYED STAGING BOOTH, WITH A FAKE MIC (job #99, Aran 2026-10-26).
// The artist's-day run taps every line; this one leaves auto-advance ON and times
// how long after the reading stops the next line appears, then reads the
// staging API log for the advance telemetry those takes carried.
//
//   node e2e/booth-artists-day/fixture.cjs reset && \
//   E2E_BASE_URL=https://staging.popty.app npx playwright test --config=e2e/booth-auto-advance-live/playwright.config.js
//
// Writes only to the e2e_booth test voice (fixture.cjs), exactly as artists-day does.
// WebKit cannot take a fake-audio file, so this is Chromium only.
import { test, expect, chromium } from '@playwright/test'
import { readFileSync, rmSync } from 'fs'
import { createRequire } from 'module'
import os from 'os'
import path from 'path'
import { buildMicWav } from '../booth-artists-day/make-mic-wav.js'

const require = createRequire(import.meta.url)
const { VOICE_ID, COURSE_CODE } = require('../booth-artists-day/fixture.cjs')
const BASE = process.env.E2E_BASE_URL || 'https://staging.popty.app'
const API_LOG = process.env.E2E_API_LOG || path.join(os.homedir(), 'wt-staging/staging-api.log')
const PROFILE = path.join(os.homedir(), '.cache', `booth-auto-advance-${process.pid}`)
const MIC_WAV = buildMicWav(path.join(os.homedir(), '.cache', `booth-auto-advance-mic-${process.pid}.wav`))
const LOUD = -30

async function peakDb(page) {
  const t = (await page.locator('[data-test=mic]').first().getAttribute('title').catch(() => '')) || ''
  const m = /Mic live · (−∞|-?\d+) dB/.exec(t)
  return m ? (m[1] === '−∞' ? -Infinity : Number(m[1])) : null
}
const lineText = async (page) => ((await page.locator('.line-target').first().textContent().catch(() => '')) || '').trim()

test('a loud line moves on by itself ~1.2 s after the reading stops, and the take logs advance=auto', async () => {
  const startedAt = new Date()
  const ctx = await chromium.launchPersistentContext(PROFILE, {
    viewport: { width: 390, height: 844 },
    args: [
      '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${MIC_WAV}`,
      // staging.popty.app is public and its API is on a 100.x tailnet address: Chromium's
      // local-network block refuses that fetch ("Failed to fetch"); iPhone Safari does not.
      '--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessSendPreflights,PrivateNetworkAccessRespectPreflightResults,BlockInsecurePrivateNetworkRequests',
    ],
  })
  try {
    const page = ctx.pages()[0] || await ctx.newPage()
    await page.goto(`${BASE}/r/${VOICE_ID}?course=${COURSE_CODE}&pod=pod-1`)
    await page.locator('.btn-begin').click()
    const auto = page.locator('.stage-auto input[type=checkbox]')
    if (await auto.count()) await auto.check()
    await expect(page.locator('.line-target')).toBeVisible()

    // Poll every 20 ms: the last loud frame, then the moment the line on the stage changes.
    const measured = []
    let lastLoudAt = null, sawLoud = false, line = await lineText(page)
    const t0 = Date.now()
    while (measured.length < 2 && Date.now() - t0 < 90_000) {
      const p = await peakDb(page)
      if (p !== null && p > LOUD) { lastLoudAt = Date.now(); sawLoud = true }
      const now = await lineText(page)
      if (now && now !== line) {
        if (sawLoud) measured.push({ from: line, ms: Date.now() - lastLoudAt })
        line = now; sawLoud = false
      }
      await page.waitForTimeout(20)
    }
    console.log('  · moved on after loud reading (ms):', JSON.stringify(measured))
    expect(measured.length, 'two loud lines moved on by themselves').toBeGreaterThanOrEqual(1)
    for (const m of measured) expect(m.ms).toBeLessThan(2000)
    // The takes upload in the background; give them time to reach the server's log.
    await page.waitForTimeout(15_000)
  } finally {
    await ctx.close()
    rmSync(PROFILE, { recursive: true, force: true })
  }
  const logged = readFileSync(API_LOG, 'utf8').split('\n')
    .filter((l) => l.includes('[BoothTake]') && l.includes(`voice=${VOICE_ID}`))
    .filter((l) => { const m = /\] (\S+Z) /.exec(l); return m && new Date(m[1]) >= startedAt })
  console.log(logged.map((l) => `  · ${l.slice(l.indexOf('[BoothTake]'))}`).join('\n'))
  expect(logged.some((l) => / advance=auto gapMs=\d+ thrSpeech=-?[\d.]+ thrQuiet=-?[\d.]+/.test(l)), 'a take logged advance=auto with its numbers').toBe(true)
})
