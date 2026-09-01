import { test, expect } from '@playwright/test'
import { EMAIL, PASSWORD } from '../pod-recording/seed-test-user.cjs'

/**
 * Not a check — a camera. Captures the three tabs of the lab, at a desktop and
 * a phone width, so a ruling on how it LOOKS can be made from a phone, which is
 * where Tom reads. It renders nothing and spends nothing.
 */
const API_BASE = process.env.E2E_API_BASE || 'http://localhost:3479'
const OUT = process.env.E2E_SHOT_DIR || 'scripts/voicelab-shots'

test('shots', async ({ page }) => {
  await page.addInitScript((apiBase) => {
    const realSetItem = window.localStorage.setItem.bind(window.localStorage)
    window.localStorage.setItem = function (key, value) {
      if (key === 'api_base_url') return
      return realSetItem(key, value)
    }
    realSetItem('api_base_url', apiBase)
  }, API_BASE)
  await page.setViewportSize({ width: 1280, height: 1400 })

  await page.goto('/login')
  await page.getByPlaceholder('you@example.com').fill(EMAIL)
  await page.getByRole('button', { name: 'Use password instead' }).click()
  await page.getByPlaceholder('Enter your password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 })

  await page.goto('/admin/labs/voice')

  // LANGUAGES is the landing tab.
  await expect(page.locator('.ui-table')).toBeVisible({ timeout: 30_000 })
  await page.screenshot({ path: `${OUT}/languages.png`, fullPage: true })

  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.locator('.slider')).toHaveCount(3)
  await page.locator('.play-textarea').fill('Guten Morgen, wie geht es dir?')
  await expect(page.locator('.play-cost')).toContainText('1 clip')
  await page.screenshot({ path: `${OUT}/play-mode.png`, fullPage: true })

  await page.getByRole('button', { name: 'Compare two' }).click()
  await page.screenshot({ path: `${OUT}/play-compare.png`, fullPage: true })

  await page.getByRole('button', { name: 'One setting' }).click()
  await page.getByRole('button', { name: 'Engineering', exact: true }).click()
  await page.screenshot({ path: `${OUT}/engineering.png`, fullPage: true })

  // The courses page, for the side-by-side that decides whether the two screens
  // read as one product.
  await page.goto('/courses')
  await expect(page.locator('.ui-table')).toBeVisible({ timeout: 30_000 })
  await page.screenshot({ path: `${OUT}/courses.png`, fullPage: true })

  // PHONE — where Tom actually reads.
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/admin/labs/voice')
  await expect(page.locator('.ui-table')).toBeVisible({ timeout: 30_000 })
  await page.screenshot({ path: `${OUT}/phone-languages.png`, fullPage: true })

  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.locator('.slider')).toHaveCount(3)
  await page.screenshot({ path: `${OUT}/phone-play.png`, fullPage: true })

  await page.getByRole('button', { name: 'Compare two' }).click()
  await page.screenshot({ path: `${OUT}/phone-play-compare.png`, fullPage: true })

  await page.goto('/courses')
  await expect(page.locator('.ui-table')).toBeVisible({ timeout: 30_000 })
  await page.screenshot({ path: `${OUT}/phone-courses.png`, fullPage: true })
})
