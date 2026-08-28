import { test, expect } from '@playwright/test'
import { EMAIL, PASSWORD } from '../pod-recording/seed-test-user.cjs'

const API_BASE = process.env.E2E_API_BASE || 'http://localhost:3479'

/**
 * EnvironmentSwitcher.vue forces api_base_url back to one of its hardcoded
 * remote URLs on every mount, so a plain localStorage write loses. Same guard
 * the pod-recording suite uses: swallow writes to that one key after pinning.
 */
async function pinApiBase (page) {
  await page.addInitScript((apiBase) => {
    const realSetItem = window.localStorage.setItem.bind(window.localStorage)
    window.localStorage.setItem = function (key, value) {
      if (key === 'api_base_url') return
      return realSetItem(key, value)
    }
    realSetItem('api_base_url', apiBase)
  }, API_BASE)
}

async function login (page) {
  await pinApiBase(page)
  await page.goto('/login')
  await page.getByPlaceholder('you@example.com').fill(EMAIL)
  await page.getByRole('button', { name: 'Use password instead' }).click()
  await page.getByPlaceholder('Enter your password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 })
}

test.describe('Voice Lab — Play mode is the front door', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/admin/configs/voice')
    // The lab will not render at all without its params payload.
    await expect(page.getByRole('heading', { name: 'Voice Lab' })).toBeVisible()
    // LANDING TAB IS LANGUAGES since 2026-08-28 — Play is one click in, and
    // every test below is about Play, so open it here rather than in each.
    await page.getByRole('button', { name: 'Play', exact: true }).click()
  })

  test('Play is one click from the landing tab, with three sliders and no wall of numbers', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toHaveClass(/on/)

    // The three knobs, and nothing else pretending to be one.
    await expect(page.getByText('Pace', { exact: true })).toBeVisible()
    await expect(page.getByText('Loudness', { exact: true })).toBeVisible()
    await expect(page.getByText('Detail', { exact: true })).toBeVisible()
    expect(await page.locator('.slider').count()).toBe(3)

    // Engineering's gate-threshold estate must NOT be on the front door.
    await expect(page.getByText('Gate thresholds')).toHaveCount(0)
    await expect(page.getByText('Min Speech Ms')).toHaveCount(0)
  })

  test('the default voice is the clone, and pace is disabled WITH ITS REASON on xAI', async ({ page }) => {
    // Tom's clone is an xAI voice and xAI documents no speed parameter, so the
    // pace slider must be dead and must say why. A slider that silently does
    // nothing is the exact failure this lab exists to avoid.
    const pace = page.locator('.slider').filter({ hasText: 'Pace' })
    await expect(pace.locator('input[type=range]')).toBeDisabled()
    await expect(pace).toContainText('not on this voice')
    await expect(pace).toContainText(/no speed parameter/i)

    // Loudness and Detail are live on xAI, and each shows its real value small.
    const loudness = page.locator('.slider').filter({ hasText: 'Loudness' })
    await expect(loudness.locator('input[type=range]')).toBeEnabled()
    await expect(loudness).toContainText('house level')
    await expect(loudness).toContainText(/LUFS/)

    const detail = page.locator('.slider').filter({ hasText: 'Detail' })
    await expect(detail.locator('input[type=range]')).toBeEnabled()
    await expect(detail).toContainText(/kHz/)
  })

  test('the cost is shown and the button will not arm before it is', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Generate', exact: true })).toBeDisabled()
    await page.locator('.play-textarea').fill('Guten Morgen.')
    await expect(page.locator('.play-cost')).toContainText('1 clip')
    await expect(page.locator('.play-cost')).toContainText('characters left today')
    await expect(page.getByRole('button', { name: 'Generate', exact: true })).toBeEnabled()
  })

  test('Engineering keeps the full parameter estate, intact', async ({ page }) => {
    await page.getByRole('button', { name: 'Engineering', exact: true }).click()
    await expect(page.getByText('Gate thresholds')).toBeVisible()
    await expect(page.getByText('speech-span · where the speech actually is')).toBeVisible()
    await expect(page.getByText('loudness · integrated LUFS in band, true peak under the ceiling')).toBeVisible()
    // All four numbered layers still there.
    for (const t of ['Parameters', 'Tests', 'Experiments', 'Estate']) {
      await expect(page.locator('.tabs button', { hasText: t })).toBeVisible()
    }
  })

  test('generates a real clip and says admitted or not in ONE line', async ({ page }) => {
    // Moving the loudness slider proves the whole chain: the slider's real value
    // lands in the config, survives normaliseConfig, and reaches masterAudio.
    const loudness = page.locator('.slider').filter({ hasText: 'Loudness' })
    await loudness.locator('input[type=range]').fill('3')
    await expect(loudness).toContainText('a touch louder')

    await page.locator('.play-textarea').fill('Guten Morgen.')
    await expect(page.getByRole('button', { name: 'Generate', exact: true })).toBeEnabled()
    await page.getByRole('button', { name: 'Generate', exact: true }).click()

    // The clip is playable long before the gates finish — that is the designed
    // order, so the play button must arm first.
    await expect(page.locator('.play-play')).toContainText('Play it again', { timeout: 120_000 })

    // Then exactly one line of verdict, in words rather than fifteen numbers.
    await expect(page.locator('.verdict')).toContainText(/Admitted|Quarantined/, { timeout: 240_000 })
    expect(await page.locator('.verdict').count()).toBe(1)

    // …with the detail on tap, not on the page.
    await expect(page.locator('.play-detail ul')).toBeHidden()
    await page.locator('.play-detail summary').click()
    await expect(page.locator('.play-detail li')).toHaveCount(6)
  })

  test('"Compare two" is one gesture, blind, and reveals what differed', async ({ page }) => {
    // The switch is a segmented control now, not a text link (Tom, 2026-08-29:
    // "it's not obvious the A/B testing settings").
    await page.getByRole('button', { name: 'Compare two' }).click()
    await expect(page.getByRole('button', { name: 'Compare two' })).toHaveClass(/on/)

    // A and B in one box, both rows labelled, both readouts in one column.
    await expect(page.locator('.compare').first().locator('.cmp-tag')).toHaveText(['A', 'B'])

    // A comparison of two identical sides measures nothing, and the screen says so.
    await expect(page.getByText(/Both sides are identical/)).toBeVisible()

    const loudness = page.locator('.slider').filter({ hasText: 'Loudness' })
    await loudness.locator('.cmp-row').nth(1).locator('input[type=range]').fill('0')
    await expect(page.getByText(/Both sides are identical/)).toHaveCount(0)

    await page.locator('.play-textarea').fill('Guten Morgen.')
    await expect(page.locator('.play-cost')).toContainText('2 clips')
    await page.getByRole('button', { name: 'Generate both' }).click()

    // Blind by default: two sides, labelled by position only, in an order the
    // server chose. Nothing on screen says which is A until you ask.
    await expect(page.locator('.play-play').first()).toContainText('Left', { timeout: 180_000 })
    await expect(page.locator('.play-play').nth(1)).toContainText('Right', { timeout: 180_000 })
    await expect(page.locator('.play-diff')).toHaveCount(0)

    await page.getByRole('button', { name: 'Reveal which is which' }).click()
    await expect(page.locator('.play-diff')).toContainText('Loudness')
    await expect(page.locator('.play-diff')).toContainText('quieter')
  })
})
