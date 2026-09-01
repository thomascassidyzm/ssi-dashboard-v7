import { test, expect } from '@playwright/test'
import { EMAIL, PASSWORD } from '../pod-recording/seed-test-user.cjs'

const API_BASE = process.env.E2E_API_BASE || 'http://localhost:3491'
const OUT = process.env.E2E_SHOT_DIR || 'scripts/vl-gaps/shots'
/** The test row created by scripts/vl-gaps/test-voice.cjs. Never a real person. */
const PROBE = 'Consent probe (test)'
const LANGUAGE = process.env.E2E_LANGUAGE || 'english'

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

/** The expanded language card — a shot of THIS is readable on a phone; a
 *  full-page shot of a sticky-header SPA is not. */
function card (page) { return page.locator('tbody tr.vl-expanded, tbody tr').last() }

async function openLanguage (page) {
  await page.goto('/admin/labs/voice')
  await expect(page.locator('.ui-table')).toBeVisible({ timeout: 60_000 })
  await page.locator('.ui-search').fill(LANGUAGE)
  await page.getByRole('button', { name: 'Voices' }).first().click()
  await expect(page.locator('.vl-cand').first()).toBeVisible({ timeout: 60_000 })
}

test('gap 1 — consent can be given to a voice, from the Voice Lab', async ({ page }) => {
  await signIn(page)
  await openLanguage(page)

  const row = page.locator('.vl-cand', { hasText: PROBE }).first()
  await row.scrollIntoViewIfNeeded()
  await expect(row.locator('.vl-cand-noconsent')).toBeVisible()
  await expect(row.locator('.vl-cand-cast')).toHaveCount(0)
  await row.locator('..').screenshot({ path: `${OUT}/1a-before-no-cast-button.png` })

  await row.locator('.vl-cand-noconsent').click()
  const panel = page.locator('.cs-step')
  await expect(panel).toBeVisible()
  await panel.getByRole('textbox', { name: 'Whose voice is this?' }).fill('Consent Probe')
  // You cannot consent to a voice you have not heard: the panel offers the
  // judging set for this voice, rendered on demand.
  await expect(panel.locator('.cs-clip')).toHaveCount(3, { timeout: 60_000 })
  await panel.scrollIntoViewIfNeeded(); await panel.screenshot({ path: `${OUT}/1b-consent-panel.png` })

  await panel.getByRole('button', { name: '● Record' }).click()
  await page.waitForTimeout(6000)
  await panel.getByRole('button', { name: /Stop/ }).click()
  await expect(panel.locator('audio')).toBeVisible()
  await panel.scrollIntoViewIfNeeded(); await panel.screenshot({ path: `${OUT}/1c-line-read-aloud.png` })

  await panel.getByRole('textbox', { name: 'Whose voice is this?' }).fill('Consent Probe')
  await panel.getByRole('button', { name: 'Record this consent' }).click()
  await expect(panel).toHaveCount(0, { timeout: 120_000 })

  const after = page.locator('.vl-cand', { hasText: PROBE }).first()
  await after.scrollIntoViewIfNeeded()
  await expect(after.locator('.vl-consent-pill')).toHaveText('authorised', { timeout: 60_000 })
  await expect(after.locator('.vl-cand-cast')).toBeVisible()
  await after.locator('..').screenshot({ path: `${OUT}/1d-after-authorised-and-castable.png` })
})

test('gap 2 — a voice with no clip can be heard', async ({ page }) => {
  await signIn(page)
  await openLanguage(page)

  const empty = page.locator('.vl-cand-play.is-empty').first()
  await empty.scrollIntoViewIfNeeded()
  const before = page.locator('.vl-cand').filter({ has: page.locator('.vl-cand-play.is-empty') }).first()
  const name = (await before.locator('.vl-cand-name').innerText()).trim()
  await before.locator('..').screenshot({ path: `${OUT}/2a-no-clip.png` })

  // One tap: it renders, then it plays. The row keeps the clip afterwards, so
  // the row has to be re-found by NAME — the dashed-outline locator that found
  // it is exactly the thing the tap removes.
  await empty.click()
  const row = page.locator('.vl-cand', { hasText: name }).first()
  await expect(row.locator('.vl-cand-play').first()).not.toHaveClass(/is-empty/, { timeout: 180_000 })
  await row.scrollIntoViewIfNeeded()
  await row.locator('..').screenshot({ path: `${OUT}/2b-rendered-and-playing.png` })
  console.log(`gap 2 drove: ${name}`)
})

test('gap 3 — one voice, several clips', async ({ page }) => {
  await signIn(page)
  await openLanguage(page)

  const row = page.locator('.vl-cand').first()
  const name = (await row.locator('.vl-cand-name').innerText()).trim()
  await row.locator('.vl-cand-name').click()

  const set = page.locator('.vl-cand-set').first()
  await expect(set.locator('.vl-cand-line')).toHaveCount(3, { timeout: 60_000 })
  await set.locator('..').screenshot({ path: `${OUT}/3a-judging-set.png` })

  for (let i = 0; i < 3; i++) {
    const line = set.locator('.vl-cand-line').nth(i)
    await line.click()
    await expect(line).not.toHaveClass(/is-empty/, { timeout: 180_000 })
  }
  await expect(set.locator('.vl-cand-line.is-empty')).toHaveCount(0)
  await set.locator('..').screenshot({ path: `${OUT}/3b-three-clips-one-voice.png` })
  console.log(`gap 3 drove: ${name}`)
})
