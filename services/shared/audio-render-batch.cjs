/**
 * AN AGREED AUDIO BATCH: RESERVE ONCE, RENDER 15 AT A TIME (cs #502·AK).
 *
 * Tom, 2026-11-22 (r-2026-11-22-once-an-audio-job-is-agreed): "There's no particular reason, once we've agreed to
 * a job, for that job to be running in series. One clip at a time. The size of the job is a fixed thing." Earlier the
 * same day: no home-made parallel loop in a caller; Popty's own route only. So the concurrency lives HERE, inside
 * Popty, behind phase8 POST /render-batch (production-api POST /api/audio/render-batch proxies to it).
 *
 * One call = one batch of at most MAX_ITEMS lines for ONE course and ONE job:
 *   1. RESERVE   spendGuard().reserveJob takes the batch's worst case (every line's characters, plus HEADROOM for
 *                spoken forms longer than the stored text) ONCE, under the same locks and caps as a single call.
 *                A re-record batch (rerecord:true or a grantId) is held only on a Tom grant that covers it.
 *   2. RENDER    each line runs the ordinary chain (renderClip: library first, gates, the door, one attempt,
 *                write back) inside chain.withJobHold, up to MAX_CONCURRENCY at once (Cartesia's real limit,
 *                r-2026-10-12; the process-wide slot limiter still bounds the provider calls). The spend guard
 *                draws each paid clip from the hold. Each clip is its own ledger row, re-record log row and edit event.
 *   3. RELEASE   in `finally`: the unspent remainder stops counting. A heartbeat every JOB_HOLD_HEARTBEAT_MS keeps
 *                the hold live; if this process dies, the hold goes stale in JOB_HOLD_STALE_MS by itself.
 * A refusal that stops everyone (Tom's stop, a trip, the daily total cap, the rate cap) stops the batch taking new
 * lines: a refusal is the answer, never retried.
 *
 * SWITCH: TTS_SPEND_JOB_HOLDS=on on the phase8 service. Off (the default), the route answers 409 JOB_HOLDS_OFF and
 * nothing here runs, because the SQL (ops/sql/20261122-tts-spend-job-holds.sql) needs Tom's go to apply.
 * The per-call POST /render path never comes through this file.
 *
 * Pure apart from its deps: { guard, renderOne(input), admit(), env, heartbeatMs, logger }.
 */
const chain = require('./chain-context.cjs')
const { JOB_HOLD_HEARTBEAT_MS } = require('./tts-spend-guard.cjs')

const MAX_ITEMS = 200
const MAX_CONCURRENCY = 15
/** A spoken form (pronunciation override, gender prep) may be a little longer than the stored text; the rest is released. */
const HEADROOM = 0.1
const HEADROOM_MIN_CHARS = 50
/** Codes after which the batch takes no new line: each one refuses every following clip the same way. */
const STOP_CODES = new Set(['STOPPED_BY_TOM', 'TRIPPED', 'DAILY_TOTAL_CAP', 'DAILY_CAP', 'POOL_SHARE', 'PROVIDER_POOL', 'PROVIDER_DIVERGENCE', 'USAGE_UNREADABLE', 'LEDGER', 'JOB_RESERVATION_EXPIRED', 'JOB_RESERVATION_GONE', 'JOB_RESERVATION_EXCEEDED', 'RATE_CAPPED', 'RETIRED'])
/** Per-line fields a batch may carry; everything that names the batch (course, job, who, why) comes from the batch. */
const ITEM_FIELDS = ['role', 'text', 'legoId', 'voiceId', 'language', 'replaceAudioId', 'spokenText', 'seedPosition', 'podSentenceId', 'podRecast', 'retake']

class BatchError extends Error {
  constructor(message, status = 400, code = 'BAD_REQUEST') { super(message); this.status = status; this.code = code }
}

const holdsOn = (env = process.env) => String(env.TTS_SPEND_JOB_HOLDS || '').toLowerCase() === 'on'

/** Refuse a malformed batch before anything is reserved. Returns the normalised batch. */
function validateBatch(body) {
  const b = body || {}
  if (!b.courseCode || !b.purpose || !b.requestedBy) throw new BatchError('a batch names courseCode, purpose and who is asking (x-agent-id)')
  if (!b.job || !/#\d+/.test(String(b.job))) throw new BatchError('an agreed batch names its job the way the estate writes it, e.g. "#913"', 400, 'JOB_REQUIRED')
  if (b.dryRun) throw new BatchError('a batch is real renders only; plan from the nightly QA copy (dry runs never run in bulk on live, job #699)', 400, 'BATCH_NOT_DRY')
  if (b.trial) throw new BatchError('trial renders are one-off clips, never a batch', 400, 'BATCH_NOT_TRIAL')
  if (!Array.isArray(b.items) || !b.items.length) throw new BatchError('items is a non-empty list of lines')
  if (b.items.length > MAX_ITEMS) throw new BatchError(`at most ${MAX_ITEMS} lines per batch; send the next batch when this one answers`, 413, 'BATCH_TOO_BIG')
  const items = b.items.map((it, i) => {
    const out = {}
    for (const k of ITEM_FIELDS) if (it && it[k] != null) out[k] = it[k]
    if (!out.role && b.role) out.role = String(b.role)
    if (!out.role || out.text == null || String(out.text).trim() === '') throw new BatchError(`item ${i} needs a role and its text`)
    if (String(out.text).length > 1000 || (out.spokenText && String(out.spokenText).length > 1000)) throw new BatchError(`item ${i}: longer than 1,000 characters — one clip, not a script`)
    return out
  })
  const concurrency = Math.max(1, Math.min(MAX_CONCURRENCY, Number(b.concurrency) || MAX_CONCURRENCY))
  const grantId = b.grantId == null ? null : Number(b.grantId)
  if (grantId != null && !(Number.isInteger(grantId) && grantId > 0)) throw new BatchError('grantId is a tts_rerecord_permissions id')
  return {
    courseCode: String(b.courseCode), job: String(b.job).slice(0, 100), purpose: String(b.purpose).slice(0, 300), requestedBy: String(b.requestedBy).slice(0, 100),
    provider: b.provider ? String(b.provider) : 'cartesia', approval: b.approval ? String(b.approval) : null,
    rerecord: b.rerecord === true || grantId != null || items.some(it => it.replaceAudioId), grantId, items, concurrency,
  }
}

/** The hold's size: every line's spoken characters, plus headroom. */
function batchChars(items) {
  const raw = items.reduce((n, it) => n + String(it.spokenText || it.text).length, 0)
  return raw + Math.max(HEADROOM_MIN_CHARS, Math.ceil(raw * HEADROOM))
}

/** An error from renderOne, as the per-call /render answers it. */
function itemError(e) {
  if (e && e.status && e.code) return { status: e.status, code: e.code, error: e.message }
  if (e && e.code === 'RERECORD_NOT_PERMITTED') return { status: 403, code: e.code, error: e.message }
  const refused = /\(402\)/.test(String(e && e.message))
  return { status: refused ? 402 : 500, code: (e && e.code) || (refused ? 'REFUSED' : 'RENDER_FAILED'), error: String((e && e.message) || e) }
}

async function renderBatch(body, { guard, renderOne, admit = async () => ({ ok: true }), env = process.env, heartbeatMs = JOB_HOLD_HEARTBEAT_MS, logger = console }) {
  if (!holdsOn(env)) throw new BatchError('job holds are switched off on this Popty (TTS_SPEND_JOB_HOLDS); the migration ops/sql/20261122-tts-spend-job-holds.sql needs Tom\'s go first. Send lines one at a time to POST /render', 409, 'JOB_HOLDS_OFF')
  const batch = validateBatch(body)
  const roles = [...new Set(batch.items.map(it => it.role))]
  // 1. RESERVE once. A refusal throws (TtsSpendGuardError, 402/403 by code) and nothing renders.
  const hold = await guard.reserveJob({ provider: batch.provider, courseCode: batch.courseCode, job: batch.job, roles, grantId: batch.grantId, rerecord: batch.rerecord, chars: batchChars(batch.items) })
  let dead = false
  const beat = setInterval(() => { guard.heartbeatJob(hold).then(ok => { if (!ok) dead = true }).catch(() => { dead = true }) }, heartbeatMs)
  if (beat.unref) beat.unref()
  const results = new Array(batch.items.length)
  let next = 0
  let stoppedBy = null
  const started = Date.now()
  try {
    // 2. RENDER, up to `concurrency` at once.
    const worker = async () => {
      for (;;) {
        const i = next++
        if (i >= batch.items.length) return
        if (stoppedBy || dead) { results[i] = { ok: false, idx: i, status: 409, code: 'NOT_SENT', error: `not sent: the batch stopped (${stoppedBy || 'its job reservation is no longer live'})` }; continue }
        const gate = await admit()
        if (!gate.ok) { stoppedBy = gate.code || 'RATE_CAPPED'; results[i] = { ok: false, idx: i, status: gate.status || 429, code: gate.code || 'RATE_CAPPED', error: gate.error }; continue }
        const input = { ...batch.items[i], courseCode: batch.courseCode, job: batch.job, purpose: batch.purpose, requestedBy: batch.requestedBy, ...(batch.approval ? { approval: batch.approval } : {}) }
        try {
          const out = await chain.withJobHold(hold, () => renderOne(input))
          results[i] = { idx: i, ...out }
        } catch (e) {
          const ie = itemError(e)
          results[i] = { ok: false, idx: i, ...ie }
          if (STOP_CODES.has(ie.code)) stoppedBy = ie.code
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(batch.concurrency, batch.items.length) }, worker))
  } finally {
    clearInterval(beat)
  }
  // 3. RELEASE the remainder (best effort; an unreleased hold goes stale on its own).
  const released = await guard.releaseJob(hold, `batch of ${batch.items.length} done${stoppedBy ? `, stopped by ${stoppedBy}` : ''}`)
  const counts = {}
  for (const r of results) { const k = r.ok === false ? `refused:${r.code}` : (r.source || 'done'); counts[k] = (counts[k] || 0) + 1 }
  const ms = Date.now() - started
  logger.info && logger.info(`[render-batch] ${batch.courseCode} ${batch.job} hold #${hold.id}: ${batch.items.length} lines in ${ms} ms at ${batch.concurrency} — ${JSON.stringify(counts)}`)
  return {
    ok: !stoppedBy, stoppedBy, ms, concurrency: batch.concurrency, counts,
    hold: { id: hold.id, reserved: hold.reserved, drawn: released ? released.drawn : null, released: released ? released.released : null, releaseOk: !!(released && released.ok) },
    charsSpent: results.reduce((n, r) => n + (Number(r && r.charsSpent) || 0), 0),
    results,
  }
}

module.exports = { renderBatch, validateBatch, batchChars, holdsOn, BatchError, MAX_ITEMS, MAX_CONCURRENCY, STOP_CODES }
