import { test, expect } from '@playwright/test'
import { EMAIL, PASSWORD } from '../pod-recording/seed-test-user.cjs'

const API_BASE = process.env.E2E_API_BASE || 'http://localhost:3470'
const OUT = process.env.E2E_SHOT_DIR || 'scripts/script-lab-shots'

async function signIn (page) {
  await page.addInitScript((apiBase) => {
    const realSetItem = window.localStorage.setItem.bind(window.localStorage)
    window.localStorage.setItem = function (key, value) {
      if (key === 'api_base_url') return
      return realSetItem(key, value)
    }
    realSetItem('api_base_url', apiBase)
  }, API_BASE)

  await page.goto('/login')
  await page.getByPlaceholder('you@example.com').fill(EMAIL)
  await page.getByRole('button', { name: 'Use password instead' }).click()
  await page.getByPlaceholder('Enter your password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 60_000 })
}

test('every walk, with its labels', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1600 })
  await signIn(page)
  await page.goto('/canonical/scripts')

  // Every walk in the registry, plus the parked pair, is on the page.
  for (const slug of [
    'pod-1', 'learning-flagship', 'method-pod-chapters', 'method-pod-43-scene',
    'health', 'retail', 'trades', 'hospitality', 'care-work', 'public-services',
    'music', 'travel-situations',
  ]) {
    await expect(page.locator(`[data-slug="${slug}"]`)).toBeVisible()
  }

  // CORE vs THEMED, and the category is never called "sector pods".
  await expect(page.locator('[data-slug="pod-1"] .cat-core')).toHaveText('CORE')
  await expect(page.locator('[data-slug="health"] .cat-themed')).toHaveText('THEMED')
  await expect(page.getByText(/sector pods/i)).toHaveCount(0)

  // Status.
  await expect(page.locator('[data-slug="care-work"] .st-mapping-only')).toHaveText('MAPPING-ONLY')
  await expect(page.locator('[data-slug="music"] .st-parked')).toHaveText('PARKED')

  // The Welsh health overlay is labelled wherever it appears.
  await expect(page.locator('[data-slug="health"] .st-draft')).toContainText('DRAFT FOR ARAN')

  // The two Method cuts are ONE decision inside ONE frame.
  const paired = page.locator('.paired')
  await expect(paired).toContainText('One decision, two realisations')
  await expect(paired.locator('[data-slug="method-pod-chapters"]')).toBeVisible()
  await expect(paired.locator('[data-slug="method-pod-43-scene"]')).toBeVisible()

  // The object statement, and the blast-radius banner.
  await expect(page.getByText('You are editing the canonical English master')).toBeVisible()
  await expect(page.getByText('LIVE AT NEXT GENERATION')).toBeVisible()
  await expect(page.getByText('The canonical store holds no audio at all')).toBeVisible()

  // The live store, read through the API: counts and Italian target text.
  await expect(page.locator('[data-slug="pod-1"]')).toContainText('22 scenes · 231 lines')
  await expect(page.locator('[data-slug="method-pod-43-scene"]')).toContainText('Italian — 276 lines')
  await expect(page.locator('[data-slug="method-pod-chapters"]')).toContainText('Italian — 309 lines')
  await expect(page.locator('[data-slug="learning-flagship"]')).toContainText('no target text')

  // The four authored themed walks are ingestable and not yet in the store.
  for (const slug of ['health', 'retail', 'trades', 'hospitality']) {
    await expect(page.locator(`[data-slug="${slug}"] .st-ingestable`)).toBeVisible()
  }
  await expect(page.locator('[data-slug="care-work"] .st-ingestable')).toHaveCount(0)

  // Coverage — the read-out that makes a script a walk — still arrives, and the
  // CORE slate maps through the graph rather than reading 0/36 unmapped.
  await expect(page.locator('[data-slug="pod-1"]')).not.toContainText('0/36 shapes traversed')
  await expect(page.locator('[data-slug="pod-1"]')).toContainText('shapes traversed')

  await page.screenshot({ path: `${OUT}/desktop.png`, fullPage: true })

  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: `${OUT}/phone.png`, fullPage: true })
})

test('the labs front door reaches it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1400 })
  await signIn(page)
  await page.goto('/admin/labs')
  await expect(page.getByRole('heading', { name: 'Script Lab' })).toBeVisible()
  await page.screenshot({ path: `${OUT}/labs-index.png`, fullPage: true })
  await page.getByRole('link', { name: /Open Script Lab/ }).click()
  await expect(page).toHaveURL(/\/canonical\/scripts$/)
})
