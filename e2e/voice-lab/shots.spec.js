import { test, expect } from '@playwright/test'
import { EMAIL, PASSWORD } from '../pod-recording/seed-test-user.cjs'

/**
 * Not a check — a camera. Captures Play mode and the Engineering layer behind
 * it so a ruling on how it LOOKS can be made from a phone, which is where Tom
 * reads. Run alongside the spec; it renders nothing and spends nothing.
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

  await page.goto('/admin/configs/voice')
  await expect(page.locator('.slider')).toHaveCount(3)
  await page.locator('.play-textarea').fill('Guten Morgen, wie geht es dir?')
  await expect(page.locator('.play-cost')).toContainText('1 clip')
  await page.screenshot({ path: `${OUT}/play-mode.png`, fullPage: true })

  await page.getByRole('button', { name: 'compare two settings' }).click()
  await page.screenshot({ path: `${OUT}/play-compare.png`, fullPage: true })

  await page.getByRole('button', { name: 'just one setting' }).click()
  await page.getByRole('button', { name: 'Engineering', exact: true }).click()
  await page.screenshot({ path: `${OUT}/engineering.png`, fullPage: true })
})
