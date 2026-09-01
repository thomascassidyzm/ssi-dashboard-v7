import { test, expect } from '@playwright/test'
import { stubAuth } from './helpers.js'

test.beforeEach(async ({ page }) => {
  await stubAuth(page)
})

// VAD Lab v2 smoke — tour contours render, lab browser works, and the
// record-yourself flow produces scores end-to-end with Chromium's fake mic.

test('listening tour renders ten cards with contour overlays and syllable ticks', async ({ page }) => {
  await page.goto('/admin/labs/vad')
  // 10 cards since the 2026-07-29 language-breadth round (was 6)
  await expect(page.locator('.tour-card')).toHaveCount(10)
  // every card overlays two energy polylines
  expect(await page.locator('.tour-card .vc > svg polyline').count()).toBeGreaterThanOrEqual(12)
  // syllable ticks shipped in lab-data v2
  expect(await page.locator('.tour-card .vc-tick').count()).toBeGreaterThan(20)
  // founder ruling: no human-vs-TTS tempo framing anywhere
  await expect(page.locator('main')).not.toContainText('Human tempo vs TTS tempo')
})

test('lab browser: selecting a pair shows dimensions, pitch track and AUC table', async ({ page }) => {
  await page.goto('/admin/labs/vad')
  await page.getByRole('button', { name: 'Browse the lab' }).click()
  await page.locator('.pair-row').first().click()
  await expect(page.locator('.pair-detail .combined-row')).toBeVisible()
  await expect(page.locator('.auc-table tbody tr')).toHaveCount(9)
  // experimental pitch track is present and labelled as never scored
  await expect(page.locator('.pair-detail .vc-pitch-label')).toContainText('EXPERIMENTAL')
  // aligned/raw toggle flips
  const toggle = page.locator('.pair-detail .align-toggle', { hasText: 'time-aligned' })
  await toggle.click()
  await expect(page.locator('.pair-detail .align-toggle', { hasText: 'raw shape' })).toBeVisible()
})

test('record yourself: fake mic attempt gets overlay + phrase-dim scores', async ({ page }) => {
  await page.goto('/admin/labs/vad')
  await page.getByRole('button', { name: 'Record yourself' }).click()
  await page.locator('.rec-list .pair-row').first().click()
  await page.getByRole('button', { name: /Record your attempt/ }).click()
  await expect(page.locator('.rec-btn.recording')).toBeVisible()
  await page.waitForTimeout(2500)
  await page.locator('.rec-btn.recording').click()
  // decode + extract both sides (model clip streams from the public proxy)
  await expect(page.locator('.rec-detail .combined-row')).toBeVisible({ timeout: 45_000 })
  await expect(page.locator('.rec-detail .verdict')).toBeVisible()
  // save gated on proficiency tag
  await expect(page.getByRole('button', { name: /Save to calibration corpus/ })).toBeDisabled()
  await page.locator('.rec-save select').selectOption('B1')
  await expect(page.getByRole('button', { name: /Save to calibration corpus/ })).toBeEnabled()
})
