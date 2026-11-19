#!/usr/bin/env node
/**
 * Azure → Cartesia RENDER RUNNER (cs #59, executing #35's plan v2 d/cbf754a1; Kai approved all batches 2026-11-19 16:01Z:
 * "Happy to approve all the batches you listed, provided you check you're within the limit every time.").
 *
 *   node ops/voice-casting/azure-to-cartesia/run-day.cjs --day N [--batch <dayN-batch.jsonl>] [--max-asks K]
 *
 * Talks to Popty over HTTP only — no DB code here. For each ask of the committed day list, ONE AT A TIME:
 *   1. POST :3470/api/audio/render (library-first, spend guard, one render, no retries) with Kai's approval token
 *      (x-cs-conv from CS_CONV_TOKEN, verified by approval-origin.cjs on the server);
 *   2. the render route files the clip but does NOT move slot pointers (audio-render-entry.cjs step 4 is store() only;
 *      only a presentation+legoId is bound), so EVERY slot the census listed is re-pointed with
 *      POST :3470/api/production/:course/link-clip, replace:true + expectCurrent = the clip the census saw there.
 *      Make-before-break by construction: the new clip exists before a pointer moves; nothing is ever deleted.
 *
 * LIMITS, checked before EVERY ask (own tally — Popty has no HTTP spend read and tts-cap.cjs reads the nightly QA copy
 * through the worker shim, so the live ledger is NOT readable from here; Popty's own guard, 1M/day, is the backstop):
 *   - per UTC day: this runner's charsSpent across ALL day logs dated today + item-9 reserve ≤ 600,000
 *   - four-day total: all runner logs + item-9 reserve ≤ 2,000,000 (=> remaining cycle credit 2.45M − total ≥ 450k)
 *     item-9 reserve = 52,000 (its published gross upper bound, #960·AI) while its night timer is still armed, else 0.
 *   - STOP at the first: HTTP 402; codes DAILY_TOTAL_CAP, DAILY_CAP, POOL_*, PROVIDER_POOL, USAGE_UNREADABLE, LEDGER,
 *     TRIPPED, STOPPED_BY_TOM, NOT_IN_CHAIN, APPROVAL_UNVERIFIED, RATE_CAPPED, IDENTITY_REQUIRED; any error text naming a
 *     quota/credit/limit/402; any other 5xx except a 503 (phase8 restarting), which counts as a timeout.
 *   - a timeout is one failed ask (logged, moved past); 5 in a row stops the day.
 *   - APPROVAL_UNVERIFIED while the Command Surface is DOWN: wait 2 min, send that one ask once more (Kai 19 Nov); surface UP: stop.
 *   - NEVER otherwise retries an ask or a batch. A relaunch resumes after the last logged ask: a rendered ask is never re-sent,
 *     and an ask whose render landed but whose links did not get logged is resumed at the link step only.
 * Results: ~/ssi-evidence/ssi-dashboard-v7/ops/voice-casting/azure-to-cartesia/dayN-results.jsonl (append-only).
 */
const fs = require('fs')
const path = require('path')
const os = require('os')
const { execFileSync } = require('child_process')

const argv = process.argv.slice(2)
const opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d }
const DAY = Number(opt('--day'))
if (!Number.isInteger(DAY) || DAY < 1 || DAY > 4) { console.error('usage: run-day.cjs --day N [--batch file] [--max-asks K]'); process.exit(1) }
const HERE = __dirname
const BATCH = opt('--batch', path.join(HERE, `day${DAY}-batch.jsonl`))
const MAX_ASKS = Number(opt('--max-asks', Infinity))
const EVID = path.join(os.homedir(), 'ssi-evidence/ssi-dashboard-v7/ops/voice-casting/azure-to-cartesia')
fs.mkdirSync(EVID, { recursive: true })
const LOG = path.join(EVID, `day${DAY}-results.jsonl`)
const SURFACE = (process.env.CS_SURFACE_URL || 'http://localhost:4317').replace(/\/$/, '')
const BASE = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '')

const DAY_CAP = 600_000
const TOTAL_CAP = 2_000_000
const CYCLE_CREDIT = 2_450_000
const RESERVE = 450_000
const ITEM9_RESERVE = 52_000
const CHECKPOINT = 50_000
const AGENT = 'kai-azure-to-cartesia'
const PURPOSE = `azure-to-cartesia day ${DAY} (cs #35 plan, Kai approved 19 Nov)`
const APPROVAL = 'kai:2026-11-19:azure-to-cartesia four-day plan, Kai approved all batches 16:01Z'
const STOP_CODES = new Set(['DAILY_TOTAL_CAP', 'DAILY_CAP', 'POOL_SHARE', 'POOL_OVERAGE', 'PROVIDER_POOL', 'USAGE_UNREADABLE', 'LEDGER',
  'TRIPPED', 'STOPPED_BY_TOM', 'NOT_IN_CHAIN', 'APPROVAL_UNVERIFIED', 'RATE_CAPPED', 'IDENTITY_REQUIRED'])
const LIMIT_TEXT = /quota|credit|insufficient|payment|\b402\b|limit (reached|exceeded)|exceed/i
const RENDER_TIMEOUT_MS = 120_000
const LINK_TIMEOUT_MS = 60_000

if (!process.env.CS_CONV_TOKEN) { console.error('CS_CONV_TOKEN is not set: the approval cannot be verified, refusing to start'); process.exit(1) }

const utcDay = (t) => new Date(t).toISOString().slice(0, 10)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Every runner log, every day: the own tally the limits are checked against.
function allLogged() {
  const rows = []
  for (const f of fs.readdirSync(EVID)) if (/^day\d-results\.jsonl$/.test(f)) {
    for (const l of fs.readFileSync(path.join(EVID, f), 'utf8').split('\n')) if (l.trim()) { try { rows.push(JSON.parse(l)) } catch {} }
  }
  return rows
}
function item9Armed() {
  try { return execFileSync('systemctl', ['--user', 'is-active', 'cs-long-keep-item9-night.timer'], { encoding: 'utf8' }).trim() === 'active' } catch { return false }
}
function tally() {
  const rows = allLogged().filter((r) => r.kind === 'render')
  const today = utcDay(Date.now())
  const spent = (rs) => rs.reduce((s, r) => s + (Number(r.charsSpent) || 0), 0)
  const reserve = item9Armed() ? ITEM9_RESERVE : 0
  return { total: spent(rows), today: spent(rows.filter((r) => utcDay(r.at) === today)), reserve }
}

async function post(url, body, headers, timeoutMs) {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT, ...headers }, body: JSON.stringify(body), signal: ctl.signal })
    const json = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status} (no JSON)` }))
    return { http: res.status, json }
  } catch (e) {
    return { http: 0, json: { ok: false, error: e.name === 'AbortError' ? 'TIMEOUT' : e.message } }
  } finally { clearTimeout(t) }
}

function stopReason(http, json) {
  if (http === 402) return `HTTP 402: ${json.error || json.code}`
  if (json && STOP_CODES.has(json.code)) return `${json.code}: ${json.error || ''}`
  if (json && json.ok === false && LIMIT_TEXT.test(String(json.error || ''))) return `limit-shaped error (${json.code || http}): ${json.error}`
  if (http >= 500 && http !== 503) return `HTTP ${http}: ${json.error || json.code || ''}`
  return null
}

async function surfaceDown(error) {
  if (/could not be reached|ECONNREFUSED|ECONNRESET|socket hang up/i.test(String(error || ''))) return true
  try { const res = await fetch(SURFACE + '/api/version', { signal: AbortSignal.timeout(5000) }); return !res.ok } catch { return true }
}

const linkOf = (s) => (s.legoId ? { legoId: s.legoId } : s.phraseId ? { phraseId: s.phraseId } : s.seedNumber != null ? { seedNumber: s.seedNumber } : null)

async function linkSlots(idx, ask, audioId) {
  const links = []
  let already = 0
  for (const s of ask.slots) {
    const k = linkOf(s)
    if (!k) continue
    if (s.current === audioId) { already++; continue }
    links.push({ ...k, role: ask.role, audioId, replace: true, expectCurrent: s.current })
  }
  if (!links.length) return { kind: 'link', idx, at: new Date().toISOString(), course: ask.course, audioId, linked: 0, already, codes: {} }
  const r = await post(`${BASE}/api/production/${encodeURIComponent(ask.course)}/link-clip`, { links }, {}, LINK_TIMEOUT_MS)
  const codes = {}
  for (const x of (r.json.results || [])) { const c = x.ok ? (x.changed === false ? 'UNCHANGED' : 'LINKED') : (x.code || 'ERR'); codes[c] = (codes[c] || 0) + 1 }
  return { kind: 'link', idx, at: new Date().toISOString(), course: ask.course, audioId, http: r.http, linked: r.json.linked || 0, already, sent: links.length, codes,
    error: r.json.ok === false && !(r.json.results || []).length ? (r.json.error || r.json.code) : undefined,
    failed: (r.json.results || []).filter((x) => !x.ok).slice(0, 5).map((x) => ({ slot: x.slot, code: x.code, error: String(x.error || '').slice(0, 200) })) }
}

async function main() {
  const asks = fs.readFileSync(BATCH, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l))
  const append = (o) => fs.appendFileSync(LOG, JSON.stringify(o) + '\n')
  const own = fs.existsSync(LOG) ? fs.readFileSync(LOG, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l)) : []
  const rendered = new Map(own.filter((r) => r.kind === 'render').map((r) => [r.idx, r]))
  const linkedIdx = new Set(own.filter((r) => r.kind === 'link').map((r) => r.idx))
  const start = tally()
  append({ kind: 'start', at: new Date().toISOString(), day: DAY, batch: path.relative(path.join(HERE, '../../..'), BATCH), asks: asks.length, resumedPast: rendered.size, tally: start })
  console.log(`day ${DAY}: ${asks.length} asks, ${rendered.size} already logged; own tally today ${start.today}, total ${start.total}, item-9 reserve ${start.reserve}`)

  let timeouts = 0, sent = 0, nextCheckpoint = null, stop = null
  for (let idx = 0; idx < asks.length; idx++) {
    const ask = asks[idx]
    const prior = rendered.get(idx)
    if (prior) {
      // Resume: a rendered/linked ask whose link step never got logged is linked now; nothing is re-sent to the render route.
      if (prior.audioId && !linkedIdx.has(idx)) append(await linkSlots(idx, ask, prior.audioId))
      continue
    }
    if (sent >= MAX_ASKS) { stop = `--max-asks ${MAX_ASKS} reached`; break }
    // LIMIT CHECK, every ask.
    const t = tally()
    if (nextCheckpoint === null) nextCheckpoint = Math.floor(t.total / CHECKPOINT) * CHECKPOINT + CHECKPOINT
    if (t.total >= nextCheckpoint) { append({ kind: 'checkpoint', at: new Date().toISOString(), idx, tally: t, creditLeft: CYCLE_CREDIT - t.total - t.reserve }); console.log(`checkpoint at ask ${idx}: today ${t.today}, total ${t.total}`); nextCheckpoint += CHECKPOINT }
    const want = Math.ceil((ask.chars || ask.text.length) * 1.25) + 5 // gender prep can lengthen a line a little
    if (t.today + t.reserve + want > DAY_CAP) { stop = `day cap: today ${t.today} + item-9 reserve ${t.reserve} + next ask ${want} > ${DAY_CAP}`; break }
    if (t.total + t.reserve + want > TOTAL_CAP) { stop = `four-day cap: total ${t.total} + item-9 reserve ${t.reserve} + next ask ${want} > ${TOTAL_CAP}`; break }
    if (CYCLE_CREDIT - (t.total + t.reserve + want) < RESERVE) { stop = `credit reserve: 2.45M − ${t.total + t.reserve + want} < 450k` ; break }

    const body = { courseCode: ask.course, role: ask.role, text: ask.text, voiceId: ask.voiceId, language: ask.language, purpose: PURPOSE, approval: APPROVAL }
    let r = await post(`${BASE}/api/audio/render`, body, { 'x-cs-conv': process.env.CS_CONV_TOKEN }, RENDER_TIMEOUT_MS)
    // SURFACE-DOWN ONE-RETRY (Kai, 19 Nov, after the 16:30:57Z surface restart refused ask 35): an APPROVAL_UNVERIFIED while the
    // Command Surface is DOWN (Popty could not reach it, or it does not answer now) waits 2 min and sends THAT ask once more.
    // Surface UP = a real seat refusal: stop as before. Never more than one extra send per ask.
    if (r.json && r.json.code === 'APPROVAL_UNVERIFIED' && await surfaceDown(r.json.error)) {
      append({ kind: 'surface-down', idx, at: new Date().toISOString(), error: String(r.json.error || '').slice(0, 300) })
      await sleep(120_000)
      r = await post(`${BASE}/api/audio/render`, body, { 'x-cs-conv': process.env.CS_CONV_TOKEN }, RENDER_TIMEOUT_MS)
    }
    sent++
    const j = r.json || {}
    const rec = { kind: 'render', idx, day: DAY, at: new Date().toISOString(), course: ask.course, role: ask.role, chars: ask.chars, http: r.http,
      ok: !!j.ok, source: j.source, code: j.code, charsSpent: Number(j.charsSpent) || 0, audioId: j.audioId, voiceId: j.voiceId,
      error: j.ok ? undefined : String(j.error || '').slice(0, 300) }
    if (j.ok && j.source === 'rendered' && !(Number(j.charsSpent) > 0)) rec.charsSpent = ask.chars // never under-count a paid render
    append(rec)
    const why = stopReason(r.http, j)
    if (why) { stop = `ask ${idx}: ${why}`; break }
    const timedOut = r.http === 0 || r.http === 503 || r.http === 504
    timeouts = timedOut ? timeouts + 1 : 0
    if (timeouts >= 5) { stop = `5 timeouts in a row (last at ask ${idx})`; break }
    if (j.ok && j.audioId) {
      const l = await linkSlots(idx, ask, j.audioId)
      append(l)
      if (l.http === 401 || l.http === 403) { stop = `link-clip refused identity (HTTP ${l.http}): ${l.error}`; break }
    }
    if (sent % 200 === 0) console.log(`${new Date().toISOString()} ask ${idx + 1}/${asks.length}`)
    await sleep(100)
  }
  const end = tally()
  const own2 = fs.readFileSync(LOG, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l))
  const R = own2.filter((r) => r.kind === 'render'), L = own2.filter((r) => r.kind === 'link')
  const count = (rs, f) => rs.reduce((m, r) => { const k = f(r); m[k] = (m[k] || 0) + 1; return m }, {})
  const linkCodes = {}
  for (const l of L) for (const [k, v] of Object.entries(l.codes || {})) linkCodes[k] = (linkCodes[k] || 0) + v
  const summary = { kind: 'end', at: new Date().toISOString(), day: DAY, asks: asks.length, logged: R.length, stop: stop || 'list complete',
    charsSpentDay: R.reduce((s, r) => s + r.charsSpent, 0), outcomes: count(R, (r) => (r.ok ? r.source : (r.code || `HTTP ${r.http}`))),
    slotsRepointed: L.reduce((s, l) => s + (l.linked || 0), 0), slotsAlready: L.reduce((s, l) => s + (l.already || 0), 0), linkCodes, tally: end,
    creditLeftOwnTally: CYCLE_CREDIT - end.total - end.reserve }
  append(summary)
  console.log(JSON.stringify(summary, null, 1))
}

main().catch((e) => { console.error(e); process.exit(1) })
