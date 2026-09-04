/**
 * AUDITION PANEL — a camera, not a check.
 *
 * Captures the panel at desktop and phone width, with the language filter open
 * and typed into, so a ruling on how it LOOKS can be made from a phone.
 *
 * SPENDS NOTHING. It selects a voice+language combination that has already been
 * rendered, so the panel serves the cached clip and no TTS call is made — which
 * is also the fastest way to see the cache working on screen.
 */
import { test, expect } from '@playwright/test'
import { EMAIL, PASSWORD } from '../pod-recording/seed-test-user.cjs'

const OUT = process.env.E2E_SHOT_DIR || 'scripts/audition-shots'

const API_BASE = process.env.E2E_API_BASE || 'http://127.0.0.1:3481'

test('audition shots', async ({ page }) => {
  // 127.0.0.1 makes getApiUrl() reach for its local-dev default (:3470), which is
  // main's API and has no audition routes. Pin it at the staging origin instead.
  await page.addInitScript((apiBase) => {
    const realSetItem = window.localStorage.setItem.bind(window.localStorage)
    window.localStorage.setItem = function (key, value) {
      if (key === 'api_base_url') return
      return realSetItem(key, value)
    }
    realSetItem('api_base_url', apiBase)
  }, API_BASE)
  await page.setViewportSize({ width: 1440, height: 1200 })
  await page.goto('/login')
  await page.getByPlaceholder('you@example.com').fill(EMAIL)
  await page.getByRole('button', { name: 'Use password instead' }).click()
  await page.getByPlaceholder('Enter your password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 60_000 })

  await page.goto('/admin/labs/voice')
  await page.getByRole('button', { name: 'Audition', exact: true }).click()
  await expect(page.getByText('What it will say')).toBeVisible({ timeout: 60_000 })

  // Pick Tom's clone by typing into the voice filter — the dropdown is
  // searchable, which is the standing rule for every dropdown on this estate.
  await page.locator('.aud-field').first().locator('.ss-button').click()
  await page.locator('.ss-search').fill("Tom's clone")
  await page.screenshot({ path: `${OUT}/01-voice-filter.png` })
  await page.locator('.ss-row').first().click()

  await expect(page.locator('.aud-para')).toBeVisible()
  await page.screenshot({ path: `${OUT}/02-panel-italian.png`, fullPage: true })

  // The language dropdown, filtered — dialects are their own entries.
  await page.locator('.aud-field').nth(1).locator('.ss-button').click()
  await page.locator('.ss-search').fill('sp')
  await page.screenshot({ path: `${OUT}/03-language-filter.png` })
  await page.locator('.ss-row').filter({ hasText: 'Mexican Spanish' }).first().click()
  await expect(page.locator('.aud-para')).toBeVisible()
  await page.screenshot({ path: `${OUT}/04-mexican-spanish.png`, fullPage: true })

  // A language with no paragraph yet reads as a gap, not as a broken button.
  await page.locator('.aud-field').nth(1).locator('.ss-button').click()
  await page.locator('.ss-search').fill('lebanese')
  await page.locator('.ss-row').filter({ hasText: 'Lebanese' }).first().click()
  await expect(page.locator('.aud-gap')).toBeVisible()
  await page.screenshot({ path: `${OUT}/05-not-yet-available.png`, fullPage: true })

  // Phone width, which is where the ruling gets made.
  await page.setViewportSize({ width: 390, height: 844 })
  await page.locator('.aud-field').nth(1).locator('.ss-button').click()
  await page.locator('.ss-search').fill('italian')
  await page.locator('.ss-row').filter({ hasText: /^Italian/ }).first().click()
  await expect(page.locator('.aud-audio')).toBeVisible({ timeout: 30_000 })
  await page.screenshot({ path: `${OUT}/06-phone.png`, fullPage: true })
})
