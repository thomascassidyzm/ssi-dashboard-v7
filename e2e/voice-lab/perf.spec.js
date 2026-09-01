/**
 * THE LANGUAGES TAB, TIMED IN A REAL BROWSER (2026-08-31).
 *
 * Tom asked why the page is slow, so the answer has to come from a page, not a
 * curl. This logs in as the real E2E user, opens /admin/labs/voice against
 * whichever backend E2E_API_BASE names, and reports three numbers:
 *
 *   request     what the browser's own Resource Timing says the
 *               /api/voicelab/languages call cost, start to finish
 *   wire bytes  transferSize — what actually crossed the network
 *   to table    navigation start to the 88-row table being on screen
 *
 * Run it twice, once per backend, and the difference is the fix.
 * Spends nothing: it renders no audio and casts nothing.
 */
import { test, expect } from '@playwright/test'
import { EMAIL, PASSWORD } from '../pod-recording/seed-test-user.cjs'

const API_BASE = process.env.E2E_API_BASE || 'http://localhost:3470'
const LABEL = process.env.E2E_PERF_LABEL || API_BASE
const OUT = process.env.E2E_SHOT_DIR || 'scripts/vl-perf'

test('languages tab load', async ({ page }) => {
  await page.addInitScript((apiBase) => {
    const realSetItem = window.localStorage.setItem.bind(window.localStorage)
    window.localStorage.setItem = function (key, value) {
      if (key === 'api_base_url') return
      return realSetItem(key, value)
    }
    realSetItem('api_base_url', apiBase)
  }, API_BASE)
  await page.setViewportSize({ width: 1440, height: 1400 })

  await page.goto('/login')
  await page.getByPlaceholder('you@example.com').fill(EMAIL)
  await page.getByRole('button', { name: 'Use password instead' }).click()
  await page.getByPlaceholder('Enter your password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 60_000 })

  const t0 = Date.now()
  await page.goto('/admin/labs/voice')
  await expect(page.locator('.ui-table')).toBeVisible({ timeout: 60_000 })
  const rows = await page.locator('.ui-table tbody tr').count()
  const toTable = Date.now() - t0

  const timing = await page.evaluate(() => {
    const e = performance.getEntriesByType('resource')
      .filter((r) => r.name.includes('/api/voicelab/languages'))
      .pop()
    return e ? { duration: Math.round(e.duration), transferSize: e.transferSize, encodedBodySize: e.encodedBodySize, decodedBodySize: e.decodedBodySize } : null
  })

  const filters = await page.locator('.ui-filter-row').first().innerText()
  await page.screenshot({ path: `${OUT}/languages-${LABEL.replace(/\W+/g, '-')}.png`, fullPage: false })

  console.log(`\n### ${LABEL}`)
  console.log(`  rows on screen ......... ${rows}`)
  console.log(`  /languages request ..... ${timing?.duration} ms`)
  console.log(`  transferSize ........... ${timing?.transferSize} B  (decoded ${timing?.decodedBodySize} B)`)
  console.log(`  navigation -> table .... ${toTable} ms`)
  console.log(`  filter bar ............. ${filters.replace(/\s+/g, ' ')}\n`)
  expect(rows).toBeGreaterThan(80)
})
