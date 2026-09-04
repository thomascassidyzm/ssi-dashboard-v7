// PHONE HIT-TEST FOR THE NAVIGATION. A rendered control is not a working one:
// on 2026-09-03 the avatar dropdown rendered fine on a phone and was completely
// untappable (an ancestor's overflow clip), and a screenshot showed nothing
// wrong. So this drives a real 390x844 phone viewport and asks
// document.elementFromPoint what is actually under each item's centre.
//
// It also checks the nav derivation end to end, as rendered: /builds keeps the
// Admin tab lit and its row up, and the admin sub-tab row and the hub cards
// list identical destinations. The unit-level guarantee is
// src/nav/navigation.guard.test.js; this is the same claim proved in a browser.
//
//   node tools/nav-phone-check.mjs                    # against a local `vite preview` on 4179
//   BASE=https://popty.app node tools/nav-phone-check.mjs
//
// On watson-1 chromium needs the pre-staged libs first:
//   export LD_LIBRARY_PATH=/home/tomcassidy/.pwlibs/root/usr/lib/x86_64-linux-gnu:$LD_LIBRARY_PATH
import { chromium } from '@playwright/test'
import { createRequire } from 'node:module'

const BASE = process.env.BASE || 'http://127.0.0.1:4179'
// The seeded e2e admin — same user the pod-recording suite logs in as.
const { EMAIL, PASSWORD } = createRequire(import.meta.url)('../e2e/pod-recording/seed-test-user.cjs')
const out = []
const say = (...a) => { const l = a.join(' '); out.push(l); console.log(l) }
let failures = 0
const check = (ok, label, detail = '') => { say(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ' — ' + detail : ''}`); if (!ok) failures++ }

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 })
const page = await ctx.newPage()
if (BASE.includes('127.0.0.1')) await page.addInitScript((apiBase) => {
  const real = window.localStorage.setItem.bind(window.localStorage)
  window.localStorage.setItem = function (k, v) { if (k === 'api_base_url') return; return real(k, v) }
  real('api_base_url', apiBase)
}, 'http://localhost:3470')

await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
await page.getByPlaceholder('you@example.com').fill(EMAIL)
await page.getByRole('button', { name: 'Use password instead' }).click()
await page.getByPlaceholder('Enter your password').fill(PASSWORD)
await page.getByRole('button', { name: 'Sign In' }).click()
await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 })
say(`logged in, landed on ${new URL(page.url()).pathname}`)

const navState = async (path) => {
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.app-navbar', { timeout: 15000 })
  await page.waitForTimeout(400)
  return page.evaluate(() => ({
    primary: [...document.querySelectorAll('.navbar-tabs .tab-item')].map((a) => a.textContent.trim() + (a.classList.contains('active') ? '*' : '')),
    sub: [...document.querySelectorAll('.navbar-subtabs .tab-item')].map((a) => a.textContent.trim() + (a.classList.contains('active') ? '*' : ''))
  }))
}

// 1. The defect that provoked this: /builds must keep the Admin tab lit and the row up.
let s = await navState('/builds')
say(`/builds primary=${s.primary.join(' | ')}  sub=${s.sub.join(' | ')}`)
check(s.primary.includes('Admin*'), '/builds keeps the Admin tab highlighted')
check(s.sub.length > 0, '/builds keeps the admin sub-tab row on screen')
check(s.sub.includes('Test builds*'), '/builds highlights its own tab')

// 2. Other sections still behave.
for (const [path, wantPrimary] of [['/courses', 'Courses*'], ['/how', 'How & Why*'], ['/stocktake', 'Admin*'], ['/admin/labs', 'Admin*'], ['/admin/board', 'Admin*']]) {
  s = await navState(path)
  check(s.primary.includes(wantPrimary) && s.sub.length > 0, `${path} → ${wantPrimary} with a sub-row`, `sub=${s.sub.join(' | ')}`)
}

// 3. The two admin surfaces list the same pages, as rendered.
s = await navState('/admin')
const cards = await page.$$eval('.hub-card', (els) => els.map((e) => e.getAttribute('href')))
const tabs = await page.$$eval('.navbar-subtabs .tab-item', (els) => els.map((e) => e.getAttribute('href')))
const missingCards = tabs.filter((t) => t !== '/admin' && !cards.includes(t))
const missingTabs = cards.filter((c) => !tabs.includes(c))
say(`admin tabs: ${tabs.join(' ')}`)
say(`admin cards: ${cards.join(' ')}`)
check(missingCards.length === 0 && missingTabs.length === 0, 'the rendered sub-tab row and hub cards list the same destinations', `tab-only=[${missingCards}] card-only=[${missingTabs}]`)

// 4. The avatar dropdown is genuinely TAPPABLE on a phone — hit-test, not a screenshot.
await page.tap('.avatar-btn')
await page.waitForSelector('.user-dropdown', { timeout: 5000 })
const hits = await page.evaluate(() => {
  const items = [...document.querySelectorAll('.user-dropdown a, .user-dropdown button')]
  return items.map((el) => {
    const r = el.getBoundingClientRect()
    const x = r.left + r.width / 2, y = r.top + r.height / 2
    const top = document.elementFromPoint(x, y)
    return {
      label: el.textContent.trim(),
      x: Math.round(x), y: Math.round(y),
      inViewport: r.top >= 0 && r.bottom <= window.innerHeight && r.left >= 0 && r.right <= window.innerWidth,
      hit: top ? (el === top || el.contains(top) ? 'itself' : top.tagName + '.' + top.className) : 'nothing'
    }
  })
})
for (const h of hits) check(h.inViewport && h.hit === 'itself', `dropdown item tappable: "${h.label}"`, `at ${h.x},${h.y} elementFromPoint=${h.hit}`)

// 5. And a real tap actually navigates.
await page.tap('.user-dropdown a[href="/admin"]')
await page.waitForURL('**/admin', { timeout: 10000 })
check(new URL(page.url()).pathname === '/admin', 'tapping Admin in the dropdown navigates')

if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT, fullPage: false })
await browser.close()
say(failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`)
process.exit(failures === 0 ? 0 : 1)
