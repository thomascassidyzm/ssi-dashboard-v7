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
 *     + FIX RESERVES (cs #79·AJ): every fixes.json entry with status "approved" and a "utc_day" (other than item9-night,
 *     counted above) reserves its Cartesia: on the four-day total, max(chars, its real spend) until its spend_file says
 *     done, then its real spend; on a UTC day, its real spend dated that day, plus (on its own utc_day, until done) what
 *     is left of chars. spend_file (under $HOME) = {done, total, byDay:{YYYY-MM-DD: n}}, written by that fix's runner.
 *     So item 20 (Sat 21 Nov) goes first and the a2c remainder takes what is left of both caps.
 *   - STOP at the first: HTTP 402; codes DAILY_TOTAL_CAP, DAILY_CAP, POOL_*, PROVIDER_POOL, USAGE_UNREADABLE, LEDGER,
 *     TRIPPED, STOPPED_BY_TOM, NOT_IN_CHAIN, APPROVAL_UNVERIFIED, RATE_CAPPED, IDENTITY_REQUIRED; any error text naming a
 *     quota/credit/limit/402; any other 5xx except a 503 (phase8 restarting), which counts as a timeout.
 *   - a timeout is one failed ask (logged, moved past); 5 in a row stops the day.
 *   - APPROVAL_UNVERIFIED while the Command Surface is DOWN: wait 2 min, send that one ask once more (Kai 19 Nov); surface UP: stop.
 *   - POPTY-RESTART RULE (Kai, 19 Nov, after Popty refused connections at 22:54:43Z and 5 eng_for_tam asks failed in 0.6 s):
 *     a CONNECTION-level failure only (fetch failed / ECONNREFUSED / socket reset; never a timeout, provider error, quota, 402
 *     or limit) polls :3470/health every 15 s for up to 10 min; once green, THAT ask is sent ONCE more and the run carries on.
 *     Still down after 10 min: stop. Asks logged with a connection failure BEFORE this rule existed (no connRule mark) get
 *     one more attempt at the END of their list (re-queue), under the same limit checks.
 *   - NEVER otherwise retries an ask or a batch. A relaunch resumes after the last logged ask: a rendered ask is never re-sent,
 *     and an ask whose render landed but whose links did not get logged is resumed at the link step only.
 * PACE FIX (cs #95, Kai 19 Nov): a paid render takes ~4.6 s whatever its length and 93% of asks are paid, so credit burned
 * before the 23 Nov 00:00Z reset is asks/h x chars/ask. Options used by chain.sh:
 *   --order chars-desc   longest asks first (stable); the list stays the same approved list, only its order changes.
 *   --until <ISO>        stop cleanly before the next ask once this instant is reached (the Cartesia cycle reset).
 *   --wait-day-cap       when ONLY the per-UTC-day cap blocks the next ask, sleep to the next UTC day (+1 min) and go on
 *                        (own pre-check, nothing was refused; a Popty refusal still stops at once).
 * RESUME IS KEYED ON THE ASK'S IDENTITY (course|role|voiceId|text), never on its position, so a re-ordered or re-built list
 * never re-sends a logged ask. Rows logged before cs #95 carry only idx: they are mapped through the committed list in its
 * file order, which is the order they were written against.
 * Results: ~/ssi-evidence/ssi-dashboard-v7/ops/voice-casting/azure-to-cartesia/dayN-results.jsonl (append-only).
 */
const fs = require('fs')
const path = require('path')
const os = require('os')
const { execFileSync } = require('child_process')

const argv = process.argv.slice(2)
const opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d }
const DAY = Number(opt('--day'))
if (!Number.isInteger(DAY) || DAY < 1 || DAY > 9) { console.error('usage: run-day.cjs --day N [--batch file] [--max-asks K] [--approver tom --cap CHARS --reason TEXT]'); process.exit(1) }
// EXTRA LISTS (cs #468·AK, Tom 22 Nov, r-2026-11-22-spanish-courses-use-the-cartesia-spanish): a course the census counted but
// no day list carried (spa_for_zho, 284k) runs as day 5+ under its OWN approver and its OWN character cap. --approver tom signs
// tom:YYYY-MM-DD:<reason> (the sending conversation must be on Tom's seat, approval-origin.cjs). With --cap, this list's own
// logged spend is the only pre-check (Kai's day / four-day / credit-reserve caps were the 19-22 Nov plan's budget, now spent);
// Popty's own 1M/day guard stays the backstop and every refusal still stops the run.
const APPROVER = opt('--approver', 'kai')
const LIST_CAP = opt('--cap', null) == null ? null : Number(opt('--cap'))
const REASON = opt('--reason', null)
// --library-only (cs #468·AK, Tom 22 Nov: "no re-record ... LINK the existing Cartesia clips from the library, rendering nothing"):
// feed it ONLY asks the clip index holds in the cast voice. Each is sent WITHOUT approval: a library hit links that existing clip
// (free) and its slots are re-pointed; a line not in the library is refused EXISTS_IN_LANGUAGE by the route (its Azure take exists)
// and logged kind:'gap', so a later paid run still sees it as unsent. No dry runs (the live route budgets them, agent-rate-cap.cjs).
// A real answer that is not a free library link stops the run at once; pair it with a small --cap.
const LIBRARY_ONLY = argv.includes('--library-only')
if (!['kai', 'tom'].includes(APPROVER) || (LIST_CAP != null && !(LIST_CAP > 0))) { console.error('bad --approver or --cap'); process.exit(1) }
if (APPROVER !== 'kai' && (LIST_CAP == null || !REASON)) { console.error('--approver tom needs --cap and --reason'); process.exit(1) }
const HERE = __dirname
const BATCH = opt('--batch', path.join(HERE, `day${DAY}-batch.jsonl`))
const MAX_ASKS = Number(opt('--max-asks', Infinity))
const ORDER = opt('--order', 'file')
const UNTIL = opt('--until', null) ? Date.parse(opt('--until')) : Infinity
const WAIT_DAY_CAP = argv.includes('--wait-day-cap')
// --requeue-timeouts (Kai 20 Nov): send ONLY the asks of this list whose latest row is a 120 s TIMEOUT, once each, nothing else.
const REQUEUE_TIMEOUTS = argv.includes('--requeue-timeouts')
// --gate-wait (cs #785·AK; Tom 18 Nov "Kai's Watson needs to never do any hammering. Ever."): before EVERY ask read Popty's
// load gate (GET /health -> dbLoadGate.level) and send nothing while it is not green; re-read every 30 s, and stop the run
// after 2 h of non-green (or an unreadable gate) rather than wait forever. Off by default, so older lists behave as before.
const GATE_WAIT = argv.includes('--gate-wait')
if (!['file', 'chars-desc'].includes(ORDER) || Number.isNaN(UNTIL)) { console.error('bad --order or --until'); process.exit(1) }
const askKey = (a) => [a.course, a.role, a.voiceId, a.text].join('|')
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
const AGENT = APPROVER === 'kai' ? 'kai-azure-to-cartesia' : `${APPROVER}-azure-to-cartesia`
const PURPOSE = APPROVER === 'kai' && REASON ? `azure-to-cartesia day ${DAY}: ${REASON}`
  : APPROVER === 'kai' ? `azure-to-cartesia day ${DAY} (cs #35 plan, Kai approved 19 Nov)` : `azure-to-cartesia day ${DAY}: ${REASON}`
// cs #785·AK: --approver kai WITH --reason signs kai:<today>:<reason> (a later Kai approval, e.g. round 2 on 23 Nov);
// without --reason it keeps the 19 Nov four-day-plan token it always sent.
const APPROVAL = APPROVER === 'kai' && REASON ? `kai:${new Date().toISOString().slice(0, 10)}:${REASON}`
  : APPROVER === 'kai' ? 'kai:2026-11-19:azure-to-cartesia four-day plan, Kai approved all batches 16:01Z'
  : `${APPROVER}:${new Date().toISOString().slice(0, 10)}:${REASON}`
const STOP_CODES = new Set(['DAILY_TOTAL_CAP', 'DAILY_CAP', 'POOL_SHARE', 'POOL_OVERAGE', 'PROVIDER_POOL', 'USAGE_UNREADABLE', 'LEDGER',
  'TRIPPED', 'STOPPED_BY_TOM', 'NOT_IN_CHAIN', 'APPROVAL_UNVERIFIED', 'RATE_CAPPED', 'IDENTITY_REQUIRED'])
const LIMIT_TEXT = /quota|credit|insufficient|payment|\b402\b|limit (reached|exceeded)|exceed/i
const RENDER_TIMEOUT_MS = 120_000
const LINK_TIMEOUT_MS = 60_000

// --batch-route (cs #516·AK, for Kai's Indic round; OFF by default — the serial loop below stays the default path). Tom 22 Nov
// (r-2026-11-22-once-an-audio-job-is-agreed): an agreed job need not run one clip at a time, but the concurrency lives INSIDE
// Popty (POST :3470/api/audio/render-batch, services/shared/audio-render-batch.cjs: one job hold, up to 15 lines at once), never
// in a home-made parallel loop here. This runner still sends ONE request at a time — now a chunk of up to --batch-size asks of
// one course — and links each returned clip serially exactly as before. Measured 22 Nov (d/d2979cbb): a known-side ask costs
// ~4.9 s end to end and nothing in it serialises across requests for long, so the gain is the route's concurrency.
// Needs --cap (the list cap is then the only own pre-check, which also sidesteps #479's trap: --approver kai without --cap
// reads the old four-day tally of 1,999,975 and stops at the first ask) and --job "#NNN" (the hold is filed under it).
// Answers 409 JOB_HOLDS_OFF until Kai switches TTS_SPEND_JOB_HOLDS=on on phase8; that 409, like every refusal, stops the run.
const BATCH_ROUTE = argv.includes('--batch-route')
const BATCH_SIZE = Number(opt('--batch-size', 30))
const BATCH_CONCURRENCY = Number(opt('--batch-concurrency', 15))
const BATCH_JOB = opt('--job', null)
// A chunk of 30 at 15 in flight answers in ~10-20 s; 15 min is far past any healthy chunk. A timeout is NEVER re-sent: the
// lines it carried are not logged, so a later relaunch sends them again and library-first answers any that were stored (free).
const BATCH_TIMEOUT_MS = 900_000
if (BATCH_ROUTE && (LIST_CAP == null || !/^#\d+/.test(String(BATCH_JOB || '')) || LIBRARY_ONLY || REQUEUE_TIMEOUTS
  || !(Number.isInteger(BATCH_SIZE) && BATCH_SIZE >= 1 && BATCH_SIZE <= 200) || !(Number.isInteger(BATCH_CONCURRENCY) && BATCH_CONCURRENCY >= 1 && BATCH_CONCURRENCY <= 15))) {
  console.error('--batch-route needs --cap CHARS and --job "#NNN"; --batch-size 1-200, --batch-concurrency 1-15; not with --library-only or --requeue-timeouts'); process.exit(1)
}

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
/**
 * This list's own spend today, for --cap: every logged render's charsSpent, PLUS every batch request that never answered
 * (timeout, connection lost, a 5xx) at its full size (Fable review #756·AK fix 8). phase8 may have gone on rendering such a
 * batch after we stopped listening, and none of its lines were logged, so counting them as nothing under-counted the cap by
 * a chunk per timeout. Over-counting instead is the safe side; Popty's own caps are unaffected either way.
 */
const ownSpentToday = () => allLogged().filter((r) => r.day === DAY).reduce((s2, r) => s2 + (r.kind === 'render' ? (Number(r.charsSpent) || 0) : r.kind === 'batch' ? (Number(r.charsAtRisk) || 0) : 0), 0)
function item9Armed() {
  try { return execFileSync('systemctl', ['--user', 'is-active', 'cs-long-keep-item9-night.timer'], { encoding: 'utf8' }).trim() === 'active' } catch { return false }
}
function item9Done() {
  try { return JSON.parse(fs.readFileSync(path.join(os.homedir(), 'ssi-evidence/ssi-dashboard-v7/ops/voice-casting/azure-to-cartesia/item9-spend.json'), 'utf8')).done === true } catch { return false }
}
function fixReserve(today) {
  let day = 0, total = 0
  let fixes = []
  try { fixes = JSON.parse(fs.readFileSync(path.join(HERE, 'fixes.json'), 'utf8')).fixes || [] } catch { return { day: 0, total: 0 } }
  for (const f of fixes) {
    // item 9 counts here too once its spend file says done (Kai 20 Nov: its night run finished 01:20Z; actual spend replaces the 52k hold-back).
    if (f.status !== 'approved' || !f.utc_day || (f.id === 'item9-night' && !item9Done())) continue
    let sp = { done: false, total: 0, byDay: {} }
    if (f.spend_file) try { sp = { ...sp, ...JSON.parse(fs.readFileSync(path.join(os.homedir(), f.spend_file), 'utf8')) } } catch {}
    const real = Number(sp.total) || 0
    total += sp.done ? real : Math.max(Number(f.chars) || 0, real)
    day += (Number((sp.byDay || {})[today]) || 0) + (!sp.done && f.utc_day === today ? Math.max(0, (Number(f.chars) || 0) - real) : 0)
  }
  return { day, total }
}
function tally() {
  const rows = allLogged().filter((r) => r.kind === 'render')
  const today = utcDay(Date.now())
  const spent = (rs) => rs.reduce((s, r) => s + (Number(r.charsSpent) || 0), 0)
  const item9 = item9Armed() && !item9Done() ? ITEM9_RESERVE : 0
  const fx = fixReserve(today)
  // reserve = what OTHER approved work holds back: on the total cap item 9 + fix totals; on the day cap item 9 + fix day.
  return { total: spent(rows) + fx.total, today: spent(rows.filter((r) => utcDay(r.at) === today)) + fx.day, reserve: item9, fixTotal: fx.total, fixDay: fx.day }
}

async function post(url, body, headers, timeoutMs) {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT, ...headers }, body: JSON.stringify(body), signal: ctl.signal })
    const json = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status} (no JSON)` }))
    return { http: res.status, json }
  } catch (e) {
    return { http: 0, json: { ok: false, error: e.name === 'AbortError' ? 'TIMEOUT' : [e.message, e.cause && (e.cause.code || e.cause.message)].filter(Boolean).join(': ') } }
  } finally { clearTimeout(t) }
}

function stopReason(http, json) {
  if (http === 402) return `HTTP 402: ${json.error || json.code}`
  if (json && STOP_CODES.has(json.code)) return `${json.code}: ${json.error || ''}`
  if (json && json.ok === false && LIMIT_TEXT.test(String(json.error || ''))) return `limit-shaped error (${json.code || http}): ${json.error}`
  // ONE 5xx is an answer, not a stop: VOICE_POLICY 'cannot read the cast' (Popty's own DB read blipped, 20 Nov 12:33Z, nothing
  // spent). It is logged and counted with the timeouts below, so a lasting outage still stops the day after 5 in a row.
  // Every other 5xx — RENDER_FAILED (a provider error) included — still stops at once (Kai 19 Nov).
  const castBlip = json && json.code === 'VOICE_POLICY' && /cannot read the cast/i.test(String(json.error || ''))
  if (http >= 500 && http !== 503 && !castBlip) return `HTTP ${http}: ${json.code || ''} ${json.error || ''}`
  return null
}

async function surfaceDown(error) {
  if (/could not be reached|ECONNREFUSED|ECONNRESET|socket hang up/i.test(String(error || ''))) return true
  try { const res = await fetch(SURFACE + '/api/version', { signal: AbortSignal.timeout(5000) }); return !res.ok } catch { return true }
}

const CONN_FAIL = /fetch failed|ECONNREFUSED|ECONNRESET|socket hang up|other side closed|UND_ERR_SOCKET/i
const connFailed = (r) => r.http === 0 && r.json && r.json.error !== 'TIMEOUT' && CONN_FAIL.test(String(r.json.error || ''))
async function poptyGreen() {
  try { const res = await fetch(BASE + '/health', { signal: AbortSignal.timeout(5000) }); const j = await res.json(); return res.ok && j.status === 'ok' && j.supabase === 'connected' } catch { return false }
}
// Up to 10 min of /health polls every 15 s; true once Popty answers green.
async function gateLevel() {
  try { const res = await fetch(BASE + '/health', { signal: AbortSignal.timeout(5000) }); const j = await res.json(); return (j.dbLoadGate && j.dbLoadGate.level) || 'unreadable' } catch { return 'unreachable' }
}
// Resolves null once the gate is green, else the reason to stop after 2 h of waiting.
async function waitGateGreen(onWait) {
  const end = Date.now() + 7_200_000
  let lvl = await gateLevel(), told = false
  while (lvl !== 'green') {
    if (Date.now() >= end) return `load gate not green for 2 h (last: ${lvl})`
    if (!told) { onWait(lvl); told = true }
    await sleep(30_000); lvl = await gateLevel()
  }
  return null
}
async function waitPoptyGreen() {
  const end = Date.now() + 600_000
  while (Date.now() < end) { await sleep(15_000); if (await poptyGreen()) return true }
  return false
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

// THE BATCH PATH (--batch-route). Same list, same resume keys, same ledger rows (kind 'render' / 'link', plus one kind 'batch'
// row per request), same stop rules: every line's answer goes through stopReason, and the batch's own stoppedBy stops the run.
// A request that did not run as a batch at all (409 JOB_HOLDS_OFF, a 402/403 at the hold, connection lost, timeout) stops the
// run and is never re-sent. Lines the batch did not send (NOT_SENT after an in-batch stop) are not logged, so they stay unsent.
async function runBatched(items, rendered, linkedKey, append) {
  let sent = 0, stop = null, chunk = [], chunkWant = 0
  const ownSpent = ownSpentToday
  async function flush() {
    const lines = chunk
    chunk = []; chunkWant = 0
    if (!lines.length) return null
    const course = lines[0].ask.course
    const body = { courseCode: course, job: BATCH_JOB, purpose: PURPOSE, approval: APPROVAL, concurrency: BATCH_CONCURRENCY,
      items: lines.map(({ ask }) => ({ role: ask.role, text: ask.text, voiceId: ask.voiceId, language: ask.language })) }
    const r = await post(`${BASE}/api/audio/render-batch`, body, { 'x-cs-conv': process.env.CS_CONV_TOKEN }, BATCH_TIMEOUT_MS)
    const j = r.json || {}
    const at = new Date().toISOString()
    // No per-line answer and not a clean refusal (a refused hold renders nothing): phase8 may still be rendering this batch.
    const unanswered = !Array.isArray(j.results) && (r.http === 0 || r.http >= 500)
    append({ kind: 'batch', day: DAY, at, course, lines: lines.length, http: r.http, ok: !!j.ok, stoppedBy: j.stoppedBy || null, ms: j.ms, hold: j.hold,
      ...(unanswered ? { charsAtRisk: lines.reduce((s2, { ask }) => s2 + Math.ceil((ask.chars || ask.text.length) * 1.25) + 5, 0) } : {}),
      counts: j.counts, charsSpent: Number(j.charsSpent) || 0, code: j.code, error: Array.isArray(j.results) ? undefined : String(j.error || '').slice(0, 300) })
    if (!Array.isArray(j.results)) return `batch of ${lines.length} (${course}) answered HTTP ${r.http}: ${j.code || ''} ${String(j.error || '').slice(0, 300)}`
    let why = null
    for (let k = 0; k < lines.length; k++) {
      const { ask, idx, requeue } = lines[k]
      const x = j.results[k] || { ok: false, status: 500, code: 'NO_RESULT', error: 'the batch answer has no result for this line' }
      if (x.ok === false && x.code === 'NOT_SENT') continue
      const http = x.ok === false ? (Number(x.status) || 500) : 200
      sent++
      const rec = { kind: 'render', idx, key: askKey(ask), day: DAY, at, course: ask.course, role: ask.role, chars: ask.chars, http,
        ok: !!x.ok, source: x.source, code: x.code, charsSpent: Number(x.charsSpent) || 0, audioId: x.audioId, voiceId: x.voiceId,
        error: x.ok ? undefined : String(x.error || '').slice(0, 300), batch: true, hold: j.hold ? j.hold.id : null, ...(requeue ? { requeue: true } : {}) }
      if (x.ok && x.source === 'rendered' && !(Number(x.charsSpent) > 0)) rec.charsSpent = ask.chars // never under-count a paid render
      append(rec)
      const w = stopReason(http, x)
      if (w && !why) why = `ask ${idx}: ${w}`
      // a clip that exists is linked even after a stop: it is paid for, and make-before-break needs it in place first
      if (x.ok && x.audioId) {
        const l = { ...(await linkSlots(idx, ask, x.audioId)), key: askKey(ask) }
        append(l)
        if ((l.http === 401 || l.http === 403) && !why) why = `link-clip refused identity (HTTP ${l.http}): ${l.error}`
      }
    }
    if (j.stoppedBy && !why) why = `batch stopped by ${j.stoppedBy}`
    console.log(`${at} batch ${course} ${lines.length} lines in ${j.ms} ms: ${JSON.stringify(j.counts || {})}`)
    return why
  }
  for (let idx = 0; idx < items.length; idx++) {
    const { ask, requeue } = items[idx]
    const key = askKey(ask)
    const prior = requeue ? null : rendered.get(key)
    if (prior) {
      if (prior.audioId && !linkedKey.has(key)) append({ ...(await linkSlots(idx, ask, prior.audioId)), key })
      continue
    }
    if (sent + chunk.length >= MAX_ASKS) { stop = `--max-asks ${MAX_ASKS} reached`; break }
    if (Date.now() >= UNTIL) { stop = `until ${new Date(UNTIL).toISOString()} reached`; break }
    if (chunk.length && (chunk[0].ask.course !== ask.course || chunk.length >= BATCH_SIZE)) {
      stop = await flush()
      if (stop) break
      idx--; continue // re-check this ask against the cap with the chunk's real spend now logged
    }
    const want = Math.ceil((ask.chars || ask.text.length) * 1.25) + 5 // as the serial path: gender prep can lengthen a line
    const spent = ownSpent()
    if (spent + chunkWant + want > LIST_CAP) { stop = `list cap: day ${DAY} spent ${spent} + pending ${chunkWant} + next ask ${want} > ${LIST_CAP}`; break }
    chunk.push({ ask, idx, requeue }); chunkWant += want
  }
  if (chunk.length) { const s2 = await flush(); stop = stop || s2 } // what is pending passed every check before the stop
  return { stop, sent }
}

async function main() {
  const fileAsks = fs.readFileSync(BATCH, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l))
  const asks = ORDER === 'chars-desc'
    ? fileAsks.map((a, i) => [a, i]).sort((x, y) => ((y[0].chars || y[0].text.length) - (x[0].chars || x[0].text.length)) || (x[1] - y[1])).map((x) => x[0])
    : fileAsks
  const append = (o) => fs.appendFileSync(LOG, JSON.stringify(o) + '\n')
  const own = fs.existsSync(LOG) ? fs.readFileSync(LOG, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l)) : []
  // identity of a logged row: its own key, else (pre-cs #95 rows) the ask at that idx in the committed file order.
  const rowKey = (r) => r.key || (fileAsks[r.idx] ? askKey(fileAsks[r.idx]) : `idx:${r.idx}`)
  const rendered = new Map(own.filter((r) => r.kind === 'render').map((r) => [rowKey(r), r]))
  const linkedKey = new Set(own.filter((r) => r.kind === 'link').map(rowKey))
  const gapKey = new Set(own.filter((r) => r.kind === 'gap').map(rowKey))
  const start = tally()
  append({ kind: 'start', at: new Date().toISOString(), day: DAY, order: ORDER, until: Number.isFinite(UNTIL) ? new Date(UNTIL).toISOString() : null, batch: path.relative(path.join(HERE, '../../..'), BATCH), asks: asks.length, resumedPast: rendered.size, tally: start })
  console.log(`day ${DAY}: ${asks.length} asks, ${rendered.size} already logged; own tally today ${start.today}, total ${start.total}, item-9 reserve ${start.reserve}`)

  // RE-QUEUE (Kai 19 Nov): asks whose latest row is a pre-rule connection failure get ONE more attempt after the list.
  const requeue = asks.filter((a) => { const p = rendered.get(askKey(a)); return p && p.http === 0 && !p.connRule && !p.requeue && p.error !== 'TIMEOUT' })
  const timedOut = asks.filter((a) => { const p = rendered.get(askKey(a)); return p && p.http === 0 && p.error === 'TIMEOUT' && !p.requeue })
  const items = REQUEUE_TIMEOUTS
    ? timedOut.map((a) => ({ ask: a, requeue: true }))
    : [...asks.map((a) => ({ ask: a, requeue: false })), ...requeue.map((a) => ({ ask: a, requeue: true }))]
  if (REQUEUE_TIMEOUTS) console.log(`--requeue-timeouts: ${timedOut.length} timed-out ask(s), one attempt each`)
  if (requeue.length) console.log(`${requeue.length} pre-rule connection failure(s) re-queued at the end of the list`)
  let timeouts = 0, sent = 0, nextCheckpoint = null, stop = null
  if (BATCH_ROUTE) ({ stop, sent } = await runBatched(items, rendered, linkedKey, append))
  for (let idx = 0; !BATCH_ROUTE && idx < items.length; idx++) {
    const ask = items[idx].ask
    const isRequeue = items[idx].requeue
    const key = askKey(ask)
    const prior = isRequeue ? null : rendered.get(key)
    if (prior) {
      // Resume: a rendered/linked ask whose link step never got logged is linked now; nothing is re-sent to the render route.
      if (prior.audioId && !linkedKey.has(key)) append({ ...(await linkSlots(idx, ask, prior.audioId)), key })
      continue
    }
    if (sent >= MAX_ASKS) { stop = `--max-asks ${MAX_ASKS} reached`; break }
    if (Date.now() >= UNTIL) { stop = `until ${new Date(UNTIL).toISOString()} reached`; break }
    // LIMIT CHECK, every ask.
    const t = tally()
    if (nextCheckpoint === null) nextCheckpoint = Math.floor(t.total / CHECKPOINT) * CHECKPOINT + CHECKPOINT
    if (t.total >= nextCheckpoint) { append({ kind: 'checkpoint', at: new Date().toISOString(), idx, tally: t, creditLeft: CYCLE_CREDIT - t.total - t.reserve }); console.log(`checkpoint at ask ${idx}: today ${t.today}, total ${t.total}`); nextCheckpoint += CHECKPOINT }
    const want = Math.ceil((ask.chars || ask.text.length) * 1.25) + 5 // gender prep can lengthen a line a little
    if (LIST_CAP != null) {
      const ownSpent = ownSpentToday()
      if (ownSpent + want > LIST_CAP) { stop = `list cap: day ${DAY} spent ${ownSpent} + next ask ${want} > ${LIST_CAP}`; break }
    } else {
    if (t.today + t.reserve + want > DAY_CAP && WAIT_DAY_CAP && t.total + t.reserve + want <= TOTAL_CAP) {
      const next = Date.parse(utcDay(Date.now()) + 'T00:00:00Z') + 86_400_000 + 60_000
      if (next < UNTIL) {
        append({ kind: 'day-cap-wait', idx, key, at: new Date().toISOString(), until: new Date(next).toISOString(), tally: t })
        console.log(`day cap at ask ${idx}: waiting to ${new Date(next).toISOString()}`)
        await sleep(next - Date.now()); idx--; continue
      }
    }
    if (t.today + t.reserve + want > DAY_CAP) { stop = `day cap: today ${t.today} (incl. fix reserve ${t.fixDay}) + item-9 reserve ${t.reserve} + next ask ${want} > ${DAY_CAP}`; break }
    if (t.total + t.reserve + want > TOTAL_CAP) { stop = `four-day cap: total ${t.total} (incl. fix reserve ${t.fixTotal}) + item-9 reserve ${t.reserve} + next ask ${want} > ${TOTAL_CAP}`; break }
    if (CYCLE_CREDIT - (t.total + t.reserve + want) < RESERVE) { stop = `credit reserve: 2.45M − ${t.total + t.reserve + want} < 450k` ; break }
    }

    if (GATE_WAIT) {
      const g = await waitGateGreen((lvl) => { append({ kind: 'gate-wait', idx, key, at: new Date().toISOString(), level: lvl }); console.log(`load gate ${lvl} at ask ${idx}: waiting`) })
      if (g) { stop = g; break }
    }
    if (LIBRARY_ONLY && gapKey.has(key)) continue
    const body = LIBRARY_ONLY
      ? { courseCode: ask.course, role: ask.role, text: ask.text, voiceId: ask.voiceId, language: ask.language, purpose: PURPOSE } // no approval: cannot pass EXISTS_IN_LANGUAGE
      : { courseCode: ask.course, role: ask.role, text: ask.text, voiceId: ask.voiceId, language: ask.language, purpose: PURPOSE, approval: APPROVAL }
    let r = await post(`${BASE}/api/audio/render`, body, { 'x-cs-conv': process.env.CS_CONV_TOKEN }, RENDER_TIMEOUT_MS)
    // SURFACE-DOWN ONE-RETRY (Kai, 19 Nov, after the 16:30:57Z surface restart refused ask 35): an APPROVAL_UNVERIFIED while the
    // Command Surface is DOWN (Popty could not reach it, or it does not answer now) waits 2 min and sends THAT ask once more.
    // Surface UP = a real seat refusal: stop as before. Never more than one extra send per ask.
    if (r.json && r.json.code === 'APPROVAL_UNVERIFIED' && await surfaceDown(r.json.error)) {
      append({ kind: 'surface-down', idx, at: new Date().toISOString(), error: String(r.json.error || '').slice(0, 300) })
      await sleep(120_000)
      r = await post(`${BASE}/api/audio/render`, body, { 'x-cs-conv': process.env.CS_CONV_TOKEN }, RENDER_TIMEOUT_MS)
    }
    // POPTY-RESTART RULE (header): connection-level failure → wait for green /health (≤10 min) → this ask once more.
    let connRetried = false
    if (connFailed(r)) {
      append({ kind: 'popty-down', idx, key, at: new Date().toISOString(), error: String(r.json.error || '').slice(0, 300) })
      if (!(await waitPoptyGreen())) {
        append({ kind: 'render', idx, key, day: DAY, at: new Date().toISOString(), course: ask.course, role: ask.role, chars: ask.chars, http: 0, ok: false, charsSpent: 0, connRule: true, ...(isRequeue ? { requeue: true } : {}), error: String(r.json.error || '').slice(0, 300) })
        stop = `ask ${idx}: Popty unreachable and /health not green within 10 min (${r.json.error})`; break
      }
      r = await post(`${BASE}/api/audio/render`, body, { 'x-cs-conv': process.env.CS_CONV_TOKEN }, RENDER_TIMEOUT_MS)
      connRetried = true
    }
    sent++
    const j = r.json || {}
    const rec = { kind: 'render', idx, key, day: DAY, at: new Date().toISOString(), course: ask.course, role: ask.role, chars: ask.chars, http: r.http,
      ok: !!j.ok, source: j.source, code: j.code, charsSpent: Number(j.charsSpent) || 0, audioId: j.audioId, voiceId: j.voiceId,
      error: j.ok ? undefined : String(j.error || '').slice(0, 300), connRule: true, ...(connRetried ? { connRetried: true } : {}), ...(isRequeue ? { requeue: true } : {}) }
    if (j.ok && j.source === 'rendered' && !(Number(j.charsSpent) > 0)) rec.charsSpent = ask.chars // never under-count a paid render
    if (LIBRARY_ONLY && !j.ok && (j.code === 'EXISTS_IN_LANGUAGE' || j.code === 'RERECORD_NOT_PERMITTED')) {
      append({ kind: 'gap', idx, key, day: DAY, at: new Date().toISOString(), course: ask.course, role: ask.role, chars: ask.chars, slots: ask.slots.length, http: r.http, code: j.code })
      timeouts = 0; continue
    }
    append(rec)
    if (LIBRARY_ONLY && j.ok && (j.source !== 'library' || Number(j.charsSpent) > 0)) { stop = `ask ${idx}: --library-only got source ${j.source}, charsSpent ${j.charsSpent}`; break }
    const why = stopReason(r.http, j)
    if (why) { stop = `ask ${idx}: ${why}`; break }
    const timedOut = r.http === 0 || r.http >= 500
    timeouts = timedOut ? timeouts + 1 : 0
    if (timeouts >= 5) { stop = `5 timeouts in a row (last at ask ${idx})`; break }
    if (j.ok && j.audioId) {
      const l = { ...(await linkSlots(idx, ask, j.audioId)), key }
      append(l)
      if (l.http === 401 || l.http === 403) { stop = `link-clip refused identity (HTTP ${l.http}): ${l.error}`; break }
    }
    if (sent % 200 === 0) console.log(`${new Date().toISOString()} ask ${idx + 1}/${items.length}`)
    await sleep(100)
  }
  const end = tally()
  const own2 = fs.readFileSync(LOG, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l))
  const R = own2.filter((r) => r.kind === 'render'), L = own2.filter((r) => r.kind === 'link')
  const count = (rs, f) => rs.reduce((m, r) => { const k = f(r); m[k] = (m[k] || 0) + 1; return m }, {})
  const linkCodes = {}
  for (const l of L) for (const [k, v] of Object.entries(l.codes || {})) linkCodes[k] = (linkCodes[k] || 0) + v
  const G = own2.filter((r) => r.kind === 'gap')
  const summary = { kind: 'end', gaps: { asks: G.length, chars: G.reduce((s2, r) => s2 + (r.chars || 0), 0), slots: G.reduce((s2, r) => s2 + (r.slots || 0), 0), byRole: count(G, (r) => r.role), byCode: count(G, (r) => r.code || r.source) }, at: new Date().toISOString(), day: DAY, asks: asks.length, logged: R.length, stop: stop || 'list complete',
    charsSpentDay: R.reduce((s, r) => s + r.charsSpent, 0), outcomes: count(R, (r) => (r.ok ? r.source : (r.code || `HTTP ${r.http}`))),
    slotsRepointed: L.reduce((s, l) => s + (l.linked || 0), 0), slotsAlready: L.reduce((s, l) => s + (l.already || 0), 0), linkCodes, tally: end,
    creditLeftOwnTally: CYCLE_CREDIT - end.total - end.reserve }
  append(summary)
  console.log(JSON.stringify(summary, null, 1))
}

main().catch((e) => { console.error(e); process.exit(1) })
