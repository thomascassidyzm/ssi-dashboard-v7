/**
 * AGENT RATE CAP on Popty's one audio route (job #699, 2026-11-05).
 *
 * HARM: a bulk agent job driving POST /api/audio/render hard enough to stall the ONE shared
 *   Supabase that live learners, the booth and Canolfan sign-ups use. 19 Oct (#3·T): daytime dry
 *   runs on prod → SSi audio proxy 504s. 5 Nov 17:37–17:53Z (cs-long-ara641-dry2, a bespoke
 *   ops/ara-female-641/render.cjs at --conc 6, 10,996 dry-run calls ≈ 12 req/s) ≈ 100 audio
 *   lookups/s at the DB, coinciding with a 2-min whole-DB stall and 17 Auth 504s (#692).
 *   Popty runs as the owner, so the agent_script login's caps (5 s, 15 conns) never saw it.
 * WHY HERE: the bespoke script was not the committed tools/audio/render.cjs — any batch can be
 *   written fresh, so the only place every caller passes is this route (production-api.cjs
 *   → phase8 /render → audio-render-entry.renderClip → library lookups on course_audio /
 *   clip_index). Each render call is several DB lookups even with dryRun:true.
 * TRIGGER (fixed — the resource is the one shared DB, and Tom's ruling that daytime bulk reads
 *   belong on the QA copy or in the night window):
 *   1. Rate: per caller identity (x-agent-id / x-service-name) ≤ RATE_PER_SEC (10/s, Watson's
 *      figure), and all callers together ≤ GLOBAL_PER_SEC (20/s). Over the rate a call is QUEUED
 *      (held, then served) — a batch just runs slower; only when the wait would pass MAX_WAIT_MS
 *      is it refused 429 RATE_CAPPED. Never silent.
 *   2. Daytime dry runs: UK 07:00–22:00 (the estate's night window is 22:00–07:00 UK), a caller
 *      gets DAY_DRY_BUDGET dry-run calls per rolling hour against live; past that 429
 *      DAYTIME_BULK_DRY_RUN pointing at the QA copy / night window. Real renders (dryRun false)
 *      are NEVER refused by this rule — they are only rate-capped.
 *   Booth and learner traffic do not use this route, so nothing here touches them.
 * OVERRIDE (Tom or a service unit only — env on the Popty service, never a request field an
 *   agent could set): POPTY_AGENT_RATE_CAP=off disables both; POPTY_AGENT_RATE_CAP_EXEMPT=a,b
 *   exempts named callers; POPTY_AGENT_RATE_PER_SEC / POPTY_AGENT_RATE_GLOBAL_PER_SEC /
 *   POPTY_DAY_DRY_BUDGET retune.
 * FIRINGS: every hold over 1 s and every refusal is logged by the route with tag [agent-rate-cap]
 *   (journalctl -u popty-production-api | grep agent-rate-cap). Register row: command-surface
 *   ops/GUARDS.md.
 * SUNSET: review after 14 days of firings — if no DB stall recurs and holds never fire, drop the
 *   global cap; if a stall recurs under the cap, lower RATE_PER_SEC or cap dry-runs separately.
 *   Remove the daytime rule if Popty gains a dry-run path that reads the QA copy.
 *
 * Pure: the clock is injected so the decision can be tested without the route.
 */
const RATE_PER_SEC = 10
const GLOBAL_PER_SEC = 20
const MAX_WAIT_MS = 10_000
const DAY_DRY_BUDGET = 100
const HOUR_MS = 3_600_000

const QA_POINTER = 'Bulk dry runs in UK daytime (07:00–22:00) do not run against the live shared DB: do the planning ' +
  'lookups with a committed tool against the QA copy (set -a; . ~/ssi-restore/qa-copy.env; set +a), or run the dry ' +
  'run in the night window (22:00–07:00 UK). Real renders are not affected.'

function ukHour(nowMs) {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', hourCycle: 'h23' }).format(new Date(nowMs)))
}
function isUkDaytime(nowMs) { const h = ukHour(nowMs); return h >= 7 && h < 22 }

function num(v, d) { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : d }

function createAgentRateCap({ env = process.env, now = Date.now } = {}) {
  const off = String(env.POPTY_AGENT_RATE_CAP || '').toLowerCase() === 'off'
  const exempt = new Set(String(env.POPTY_AGENT_RATE_CAP_EXEMPT || '').split(',').map(s => s.trim()).filter(Boolean))
  const perSec = num(env.POPTY_AGENT_RATE_PER_SEC, RATE_PER_SEC)
  const globalPerSec = num(env.POPTY_AGENT_RATE_GLOBAL_PER_SEC, GLOBAL_PER_SEC)
  const dayBudget = num(env.POPTY_DAY_DRY_BUDGET, DAY_DRY_BUDGET)
  // Next free slot per caller and globally: a call is served at max(now, nextCaller, nextGlobal),
  // and each admitted call pushes the slots on by 1/rate. That is a queue with no timers to leak.
  const nextAt = new Map()
  let nextGlobal = 0
  const dry = new Map() // who → timestamps of daytime dry-run calls in the last hour

  /** → { ok:true, waitMs } (hold that long, then serve) or { ok:false, status:429, code, error } */
  function admit(who, { dryRun = false } = {}) {
    if (off || exempt.has(who)) return { ok: true, waitMs: 0 }
    const t = now()
    if (dryRun && isUkDaytime(t)) {
      const recent = (dry.get(who) || []).filter(x => t - x < HOUR_MS)
      if (recent.length >= dayBudget) {
        dry.set(who, recent)
        return { ok: false, status: 429, code: 'DAYTIME_BULK_DRY_RUN', error: `${who}: ${recent.length} dry-run calls in the last hour. ${QA_POINTER}` }
      }
      recent.push(t); dry.set(who, recent)
    }
    const at = Math.max(t, nextAt.get(who) || 0, nextGlobal)
    const waitMs = at - t
    if (waitMs > MAX_WAIT_MS) {
      return { ok: false, status: 429, code: 'RATE_CAPPED', error: `${who}: over the agent rate cap (${perSec}/s per caller, ${globalPerSec}/s all callers) on the shared SSi DB — lower your concurrency and retry later. ${QA_POINTER}` }
    }
    nextAt.set(who, at + 1000 / perSec)
    nextGlobal = at + 1000 / globalPerSec
    return { ok: true, waitMs }
  }
  return { admit, settings: { off, exempt: [...exempt], perSec, globalPerSec, dayBudget, maxWaitMs: MAX_WAIT_MS } }
}

module.exports = { createAgentRateCap, isUkDaytime, RATE_PER_SEC, GLOBAL_PER_SEC, DAY_DRY_BUDGET, MAX_WAIT_MS }
