#!/usr/bin/env node
/**
 * PLAYBACK EVIDENCE FOR THE POPTY POD EMBED (job #628; asked by Astra's cold-verify #635): Popty's pods page frames the
 * app's own /listening/preview, so "does Popty's preview play?" is answered by opening exactly the address Popty mints
 * and recording what the browser does. No database access: the pass comes from Popty's own route
 * (GET /api/production/:course/pod-preview/:slug), everything else is the browser's network and console.
 *
 *   node tools/pods/pod-preview-evidence.mjs --course ita_for_eng --pod pod-1 --scene 4 [--mode immersion|drill|both]
 *
 * Writes <evidence dir>/<course>-<pod>-s<scene>-<mode>.json ({ summary, requests, console }) plus two screenshots, and
 * prints each summary. A summary names: the scene heading before and after, every /api/audio/ clip and its status, every
 * request that is not a GET/HEAD/OPTIONS (a preview must make none that writes), every request to a learner-telemetry
 * path, and every console error. CHROME_BIN picks the browser.
 */
import { chromium } from 'playwright'
import fs from 'fs'
import os from 'os'
import path from 'path'

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d }
const course = opt('--course', 'ita_for_eng'), pod = opt('--pod', 'pod-1'), scene = Number(opt('--scene', '1'))
const modes = opt('--mode', 'both') === 'both' ? ['immersion', 'drill'] : [opt('--mode')]
const OUT = opt('--out', path.join(os.homedir(), 'ssi-evidence', 'ssi-dashboard-v7', 'tools', 'pods', 'pod-preview-evidence'))
const POPTY = process.env.POPTY_API || 'http://localhost:3470'
// Paths a learner's telemetry or state would travel; a preview must reach none of them.
const LEARNER_PATH = /player-events|pod_state|learner|progress|telemetry/i

async function mint() {
  const r = await fetch(`${POPTY}/api/production/${course}/pod-preview/${pod}?scene=${scene}`, { headers: { 'x-agent-id': 'tools/pods/pod-preview-evidence' } })
  const body = await r.json().catch(() => ({}))
  if (!r.ok || !body.url) throw new Error(`pass refused: HTTP ${r.status} ${JSON.stringify(body).slice(0, 200)}`)
  return body.url
}

async function run(mode) {
  const url = await mint()
  const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN, args: ['--autoplay-policy=no-user-gesture-required'] })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  const requests = [], consoleLines = []
  const t0 = Date.now()
  page.on('requestfinished', async (rq) => {
    const r = await rq.response().catch(() => null)
    const u = new URL(rq.url())
    requests.push({ t: Date.now() - t0, method: rq.method(), host: u.host, path: u.pathname, status: r ? r.status() : null })
  })
  page.on('requestfailed', (rq) => { const u = new URL(rq.url()); requests.push({ t: Date.now() - t0, method: rq.method(), host: u.host, path: u.pathname, status: 'failed', why: rq.failure()?.errorText }) })
  page.on('console', (m) => consoleLines.push({ type: m.type(), text: m.text().slice(0, 300) }))
  page.on('pageerror', (e) => consoleLines.push({ type: 'pageerror', text: String(e.message).slice(0, 300) }))
  const stem = path.join(OUT, `${course}-${pod}-s${scene}-${mode}`)
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(6000)
  const heading = await page.locator('text=/Scene \\d+/').first().innerText().catch(() => null)
  await page.screenshot({ path: `${stem}-start.png` })
  if (mode === 'drill') { await page.locator('text=Drill').first().click().catch(() => {}); await page.waitForTimeout(1500) }
  const play = page.locator('[aria-label*="lay" i]').first()
  if (await play.count()) await play.click().catch(() => {})
  await page.waitForTimeout(45000)
  const headingAfter = await page.locator('text=/Scene \\d+/').first().innerText().catch(() => null)
  await page.screenshot({ path: `${stem}-after.png` })
  await browser.close()
  const audio = requests.filter((r) => r.path.startsWith('/api/audio/'))
  const summary = {
    course, pod, scene, mode, heading, headingAfter, requests: requests.length,
    audio: { n: audio.length, ok: audio.filter((r) => typeof r.status === 'number' && r.status < 400).length, bad: audio.filter((r) => !(typeof r.status === 'number' && r.status < 400)) },
    audioIds: [...new Set(audio.map((r) => r.path.slice('/api/audio/'.length)))],
    nonGetRequests: requests.filter((r) => !['GET', 'HEAD', 'OPTIONS'].includes(r.method)),
    learnerPathRequests: requests.filter((r) => LEARNER_PATH.test(r.path)),
    consoleErrors: consoleLines.filter((c) => c.type === 'error' || c.type === 'pageerror'),
    consoleLines: consoleLines.length,
  }
  fs.writeFileSync(`${stem}.json`, JSON.stringify({ summary, requests, console: consoleLines }, null, 1))
  return summary
}

fs.mkdirSync(OUT, { recursive: true })
for (const m of modes) console.log(JSON.stringify(await run(m)))
