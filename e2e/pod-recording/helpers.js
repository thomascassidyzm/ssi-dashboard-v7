// Shared helpers for the pod-recording E2E suite.
import { EMAIL, PASSWORD } from './seed-test-user.cjs'
import { COURSE_CODE } from './seed-test-course.cjs'

export const TEST_EMAIL = EMAIL
export const TEST_PASSWORD = PASSWORD
export const TEST_COURSE = COURSE_CODE
export const API_BASE = process.env.E2E_API_BASE || 'http://localhost:3472'

/**
 * Point the app at our isolated local API instance before it boots, and keep
 * it pinned. EnvironmentSwitcher.vue unconditionally forces api_base_url back
 * to one of 4 hardcoded remote URLs (Tom's/Kai's/SSi's ngrok tunnel or
 * localhost:3470) on every mount — silently overriding any earlier value.
 * Left unguarded, the suite ends up exercising whatever remote machine is
 * live at the time instead of the local instance this suite starts and
 * seeds. Intercept writes to that one key so our pin always wins.
 */
export async function pinApiBase(page) {
  await page.addInitScript((apiBase) => {
    const realSetItem = window.localStorage.setItem.bind(window.localStorage)
    window.localStorage.setItem = function (key, value) {
      if (key === 'api_base_url') return
      return realSetItem(key, value)
    }
    realSetItem('api_base_url', apiBase)
  }, API_BASE)
}

/** Log in through the real LoginForm (email -> "Use password instead" -> password). */
export async function loginAsTestUser(page) {
  await pinApiBase(page)
  await page.goto('/login')
  await page.getByPlaceholder('you@example.com').fill(TEST_EMAIL)
  await page.getByRole('button', { name: 'Use password instead' }).click()
  await page.getByPlaceholder('Enter your password').fill(TEST_PASSWORD)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20_000 })
}

// ─── DB reads ──────────────────────────────────────────────────────────────
// The specs used to shell out to `/opt/homebrew/opt/postgresql@17/bin/psql`,
// a hardcoded macOS path. On any Linux box (watson-1, CI) every spec that read
// the DB died with `spawnSync ... ENOENT` before it exercised anything — the
// suite looked broken when the product was fine. These read through the
// Supabase REST API with the SERVICE key instead (the anon key silently hides
// rows), so the suite runs anywhere the rest of the dashboard runs.
import 'dotenv/config'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

async function rest(pathAndQuery, { head = false } = {}) {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY missing from .env — E2E DB reads cannot run')
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
    method: head ? 'HEAD' : 'GET',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      ...(head ? { Prefer: 'count=exact' } : {})
    }
  })
  if (!res.ok) throw new Error(`Supabase REST ${res.status}: ${await res.text()}`)
  if (head) {
    // content-range looks like "*/12"
    return Number((res.headers.get('content-range') || '/0').split('/')[1] || 0)
  }
  return res.json()
}

/** One column of one row, or null. */
export async function dbScalar(table, column, filters) {
  const q = new URLSearchParams({ select: column, limit: '1' })
  for (const [k, v] of Object.entries(filters)) q.append(k, `eq.${v}`)
  const rows = await rest(`${table}?${q}`)
  return rows.length ? rows[0][column] : null
}

/** Exact row count matching the filters. `is.` filters are passed through verbatim. */
export async function dbCount(table, filters) {
  const q = new URLSearchParams({ select: 'id' })
  for (const [k, v] of Object.entries(filters)) {
    q.append(k, typeof v === 'string' && /^(eq|is|not|gt|lt)\./.test(v) ? v : `eq.${v}`)
  }
  return rest(`${table}?${q}`, { head: true })
}
