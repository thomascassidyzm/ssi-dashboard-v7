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
