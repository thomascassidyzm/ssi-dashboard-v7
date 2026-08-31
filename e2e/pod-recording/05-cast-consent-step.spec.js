// THE CONSENT STEP, in a real browser, on the screen a human actually uses.
//
// Tom, 2026-08-31: "we are never going to use a voice without consent." The
// block that ruling produced refuses PUT /pods/cast for any human_* id nobody
// has asked — which is every NEW pod speaker, because this panel mints their id
// the moment you type their name. Correct lock, and until now no key: casting a
// new pod speaker was impossible for anybody.
//
// This walks the whole of it: type a person nobody has asked, press save, be
// REFUSED, record their consent in the step that opens, and watch the same save
// go through. One pass, one screen, no trip to the Voice Lab.
import { test, expect } from '@playwright/test'
import { loginAsTestUser, TEST_COURSE } from './helpers.js'

// TWO people, because the pod is a two-hander and the panel will not solve a
// cast that cannot cover it. Both are people nobody has ever asked, so the save
// is refused twice and consented twice — which is the honest shape: each
// person's yes is their own, and the step re-opens on the next one.
const PEOPLE = [
  { name: 'E2E Consent Probe A', gender: 'f', email: 'e2e-consent-probe-a@ssi-test.invalid', voiceId: 'human_e2e_consent_probe_a_zzz_test' },
  { name: 'E2E Consent Probe B', gender: 'm', email: 'e2e-consent-probe-b@ssi-test.invalid', voiceId: 'human_e2e_consent_probe_b_zzz_test' },
]

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
async function rest (path, init = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  })
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`)
  return res.status === 204 ? null : res.json().catch(() => null)
}

let savedVoiceConfig = null

test.beforeAll(async () => {
  const rows = await rest(`courses?course_code=eq.${TEST_COURSE}&select=voice_config`)
  savedVoiceConfig = rows[0]?.voice_config ?? {}
  // Start from "nobody has ever asked this person", which is the state the
  // refusal is about.
  for (const p of PEOPLE) await rest(`voices?voice_id=eq.${p.voiceId}`, { method: 'DELETE' })
})

test.afterAll(async () => {
  await rest(`courses?course_code=eq.${TEST_COURSE}`, {
    method: 'PATCH', body: JSON.stringify({ voice_config: savedVoiceConfig }),
  })
  for (const p of PEOPLE) await rest(`voices?voice_id=eq.${p.voiceId}`, { method: 'DELETE' })
})

test('a new pod speaker: refused for want of consent, consented on the spot, then cast', async ({ page }) => {
  await loginAsTestUser(page)
  await page.goto(`/production/${TEST_COURSE}/pods`)
  await expect(page.getByText('Cast — two voices')).toBeVisible()

  const editCast = page.getByRole('button', { name: 'Edit cast' })
  await editCast.first().waitFor({ timeout: 20_000 }).catch(() => {})
  if (await editCast.count() > 0) await editCast.first().click()

  const personRows = page.locator('.cast-row').filter({ has: page.getByPlaceholder('Name') })
  await expect(personRows.first()).toBeVisible({ timeout: 15_000 })
  while (await page.locator('button[title="Remove this person"]').count() > PEOPLE.length) {
    await page.locator('button[title="Remove this person"]').first().click()
  }
  while (await personRows.count() < PEOPLE.length) {
    await page.getByRole('button', { name: /Add (another )?person/i }).first().click()
  }

  // People nobody has ever asked.
  for (const [i, p] of PEOPLE.entries()) {
    const row = personRows.nth(i)
    await row.getByPlaceholder('Name').fill(p.name)
    await row.getByPlaceholder(/mail/i).fill(p.email)
  }

  const save = page.getByRole('button', { name: /Save cast/ })
  await expect(save).toBeEnabled({ timeout: 30_000 })
  await save.click()

  const step = page.locator('.cs-step')

  // 1. REFUSED — a sentence about a person, not a stack trace — and nothing written.
  await expect(step).toBeVisible({ timeout: 30_000 })
  await expect(step).toContainText(/No consent is recorded/i)
  const mid = await rest(`courses?course_code=eq.${TEST_COURSE}&select=voice_config`)
  expect(JSON.stringify(mid[0].voice_config)).toBe(JSON.stringify(savedVoiceConfig))

  // 2. THE STEP, once per person. Each person's yes is their own, so the save
  //    refuses again on the next one and the step re-opens — no loop in the UI,
  //    just the honest iteration.
  for (let round = 0; round < PEOPLE.length; round += 1) {
    await expect(step).toBeVisible({ timeout: 30_000 })
    // The wording comes from the backend, so it is the same string the database
    // stores as what this person agreed to.
    await step.getByRole('button', { name: /not here/i }).click()
    await expect(step.locator('.cs-tick')).toContainText(/happy for it to be copied/i)
    await step.locator('input[type="checkbox"]').check()
    const inputs = step.locator('input:not([type="checkbox"])')
    // "Whose voice is this?" arrives prefilled from the cast on screen.
    const who = await inputs.first().inputValue()
    expect(who.length).toBeGreaterThan(0)
    await inputs.last().fill(who)
    await step.getByRole('button', { name: /Record this consent/i }).click()
    if (round < PEOPLE.length - 1) {
      // The next refusal replaces this one; wait for the person on the card to move.
      await expect(async () => {
        expect(await step.locator('input:not([type="checkbox"])').first().inputValue()).not.toBe(who)
      }).toPass({ timeout: 30_000 })
    }
  }

  // 3. AND THE SAVE IT INTERRUPTED FINISHES ITSELF.
  await expect(step).toBeHidden({ timeout: 30_000 })
  await expect(page.getByText(/Cast saved/i)).toBeVisible({ timeout: 30_000 })

  for (const p of PEOPLE) {
    const voice = await rest(`voices?voice_id=eq.${p.voiceId}&select=consent_status,consent_person,consent_declaration_kind`)
    expect(voice[0]?.consent_status).toBe('authorised')
    expect(voice[0]?.consent_person).toBe(p.name)
    expect(voice[0]?.consent_declaration_kind).toBe('attested')
  }

  const after = await rest(`courses?course_code=eq.${TEST_COURSE}&select=voice_config`)
  const cast = after[0].voice_config?.podCast || {}
  const castIds = new Set(Object.values(cast).map((e) => e && e.voiceId))
  for (const p of PEOPLE) expect(castIds.has(p.voiceId)).toBe(true)
})
