import { test, expect } from '@playwright/test'
import { EMAIL, PASSWORD } from '../pod-recording/seed-test-user.cjs'
import CORPORA from '../../tools/pods/pod-corpora.json' with { type: 'json' }
import { isIngestable } from '../../src/lib/walkGroups.js'

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

  // Status, read off the registry rather than off a remembered list — the third
  // time this bit: care-work was mapping-only at 11:29 and authored by 11:40.
  for (const w of [...CORPORA.walks, ...CORPORA.parked]) {
    await expect(page.locator(`[data-slug="${w.slug}"] .st-${w.status}`))
      .toHaveText(w.status.toUpperCase())
  }
  // And whatever is mapping-only shows as a mapping with no walk to open.
  for (const w of CORPORA.walks.filter(x => x.status === 'mapping-only')) {
    const card = page.locator(`[data-slug="${w.slug}"]`)
    await expect(card).toContainText('not in the canonical store')
    await expect(card.getByRole('link', { name: 'Open the script →' })).toHaveCount(0)
  }

  // The Welsh health overlay is labelled wherever it appears.
  await expect(page.locator('[data-slug="health"] .st-draft')).toContainText('DRAFT FOR ARAN')

  // The two Method cuts are ONE decision inside ONE frame.
  const paired = page.locator('.paired')
  await expect(paired).toContainText('One decision, two realisations')
  await expect(paired.locator('[data-slug="method-pod-chapters"]')).toBeVisible()
  await expect(paired.locator('[data-slug="method-pod-43-scene"]')).toBeVisible()

  // The object statement, with the variants that are its evidence.
  await expect(page.getByText('You are editing the canonical English master')).toBeVisible()
  await expect(page.getByText('24 distinct known texts across 46 courses')).toBeVisible()
  await expect(page.getByText('¡Buenos días, Sarah!')).toBeVisible()
  await expect(page.getByText('LIVE AT NEXT GENERATION')).toBeVisible()

  // Audio, reported BY LAYER — n/a here, fully rendered on the generated side.
  await expect(page.getByText('Audio is not a property of this layer')).toBeVisible()
  await expect(page.getByText('100% on both sides')).toBeVisible()

  // The naming trap defused: one slug, two meanings, mid-cutover.
  await expect(page.getByText('One slug, two meanings')).toBeVisible()
  await expect(page.getByText('22 of 68 courses in')).toBeVisible()

  // The parked pair, at their real size. ONE scene for travel-situations.
  await expect(page.locator('[data-slug="music"]')).toContainText('749 turns · 8 scenes')
  await expect(page.locator('[data-slug="travel-situations"]')).toContainText('72 turns · 1 scene ·')
  await expect(page.locator('[data-slug="travel-situations"]')).toContainText('1 known clips rendered')

  // The Welsh overlay: a pair overlay on the SEED SET, not target text.
  const health = page.locator('[data-slug="health"]')
  await expect(health).toContainText('Pair overlay eng → cym_n — DRAFT-FOR-ARAN')
  await expect(health).toContainText('57 seeds, 159 new LEGOs')
  await expect(health).toContainText('438-turn health conversation corpus')
  await expect(health).toContainText('recording worklist for Aran and Catrin')

  // The live store, read through the API: counts and Italian target text.
  await expect(page.locator('[data-slug="pod-1"]')).toContainText('22 scenes · 231 lines')
  await expect(page.locator('[data-slug="method-pod-43-scene"]')).toContainText('Italian — 276 lines')
  await expect(page.locator('[data-slug="method-pod-chapters"]')).toContainText('Italian — 309 lines')
  await expect(page.locator('[data-slug="learning-flagship"]')).toContainText('no target text')

  // INGESTABLE and DRIFT, asserted as INVARIANTS rather than as a fixed list.
  // The store is live and moves: five themed walks were ingested at 11:29 on
  // 2026-09-01 while this spec was being written, so a test naming which walks
  // are in the store would have gone red for being right. The rules are what is
  // stable. A walk offers INGESTABLE exactly when the registry says it is
  // ingestable AND it is not yet in the store; it flags DRIFT exactly when the
  // registry claims it is not in the store and the store has it anyway.
  //
  // The counts are read AFTER the store data has landed — the card renders from
  // the local registry first, so reading it earlier races the fetch.
  // "lines in the canonical store" appears only once the index fetch has landed.
  // Gating on "in the canonical store" does NOT work — "not in the canonical
  // store" contains it, so the gate passes on the pre-fetch render and every
  // card is then read mid-flight.
  await expect(page.locator('[data-slug="pod-1"]')).toContainText('lines in the canonical store')
  for (const w of [...CORPORA.walks, ...CORPORA.parked]) {
    const card = page.locator(`[data-slug="${w.slug}"]`)
    // Detected POSITIVELY. A negative check on "not in the canonical store"
    // matches the drift note's own prose, which says that phrase while
    // describing a walk that IS in the store — the detector then reads its own
    // copy and inverts itself.
    const inStore = (await card.innerText()).includes('lines in the canonical store')
    const claimsAbsent = w.status === 'mapping-only' || w.status === 'parked'
    await expect(card.locator('.st-ingestable')).toHaveCount(isIngestable(w) && !inStore ? 1 : 0)
    await expect(card.locator('.st-drift')).toHaveCount(claimsAbsent && inStore ? 1 : 0)
  }

  // Coverage — the read-out that makes a script a walk — still arrives, and the
  // CORE slate maps through the graph rather than reading 0/36 unmapped.
  await expect(page.locator('[data-slug="pod-1"]')).not.toContainText('0/36 shapes traversed')
  await expect(page.locator('[data-slug="pod-1"]')).toContainText('shapes traversed')
  await expect(page.locator('[data-slug="pod-1"]')).toContainText('read off row references')

  // THE DISTINCTION THAT MATTERS. A corpus declaring NO shapes and a corpus
  // declaring shapes the store cannot place are OPPOSITE facts, and must never
  // render the same. health declares none — it gets words, and must not show a
  // traversed count at all. trades declares 84 and fails to resolve 40 — it
  // gets numbers, and must not show the no-claims wording.
  await expect(health).toContainText('No shape claims')
  await expect(health).toContainText('not zero coverage')
  await expect(health).not.toContainText('shapes traversed')

  const trades = page.locator('[data-slug="trades"]')
  await expect(trades).toContainText('shape declarations UNRESOLVED')
  await expect(trades).not.toContainText('No shape claims')

  // The registry's rule is CITED on the page, not paraphrased.
  await expect(page.getByText("status === 'authored' && corpus && format")).toBeVisible()

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

test('the metagraph shows the core pod, not hides it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1400 })
  await signIn(page)
  await page.goto('/canonical/metagraph')

  // The HIDDEN set was written to hide two sacked slates. The 2026-09-01 rename
  // gave their old name to the live CORE pod, so the guard inverted and hid the
  // one pod this whole view exists for. It must arrive selected and labelled.
  await expect(page.getByText('POD 1').first()).toBeVisible()
  await expect(page.getByText('0 of 36')).toHaveCount(0)
  await page.screenshot({ path: `${OUT}/metagraph.png`, fullPage: true })
})
