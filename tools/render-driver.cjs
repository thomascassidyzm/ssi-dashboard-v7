#!/usr/bin/env node
/**
 * THE RENDER DRIVER — the one way to re-post phase8 /generate until a course is
 * voiced, with a character budget it cannot run without (job #425).
 *
 * Why this exists: #382's driver (a bash loop) re-posted /generate "until the
 * missing count stops moving". The count moved — by 10 to 900 a pass — while
 * each pass re-rendered ~10,000 clips it already had. 37 passes, 7.63M Cartesia
 * characters, 36 of them buying nothing new. The driver watched COUNTS; it
 * never looked at MONEY. This one watches money first:
 *
 *   - no --budget-chars, no run. The budget is the whole run's, not a pass's;
 *     each pass is posted with budgetChars = what is left, so phase8's own cap
 *     (runSpendCap) enforces it inside the pass too.
 *   - a DRY RUN first, always: /generate {dryRun:true} reports wouldGenerate and
 *     wouldSpendChars. Without --go the driver prints that plan and exits; with
 *     --go it refuses a plan bigger than the budget.
 *   - after every pass, one JSON line to the log: chars spent, provider calls,
 *     slots attached, the host ledger's day/cycle totals.
 *   - it STOPS on: budget spent; a pass that attached nothing; a pass whose
 *     provider calls outnumber attached slots by more than 1.2x (the #382
 *     signature: ~60x); a pass phase8 itself capped; a service that does not
 *     report spend (an old phase8 — refusing to run blind); --max-passes; a
 *     dry run that finds nothing left to render.
 *
 *   node tools/render-driver.cjs --course eng_for_hin --budget-chars 700000            # plan only
 *   node tools/render-driver.cjs --course eng_for_hin --budget-chars 700000 --go \
 *        [--roles known,target1] [--concurrency 4] [--max-passes 4] [--job '#425·X']
 *
 * Long runs: launch under systemd-run (see ops/worker-doctrine.md), never as a
 * backgrounded shell child.
 */

const fs = require('fs')
const path = require('path')

const RATIO_LIMIT = 1.2

/**
 * The loop, with its I/O injected so it is testable without phase8.
 * post(body) → parsed /generate response. Returns { stopped, passes, spent }.
 */
async function runDriver({ post, log = () => {}, ledgerSnapshot = () => null, budgetChars, maxPasses = 5, go = false, base = {} }) {
  if (!(Number(budgetChars) > 0)) throw new Error('render-driver: --budget-chars is required (a whole-run character budget); refusing to run without one')
  const plan = await post({ ...base, dryRun: true })
  log({ event: 'plan', wouldGenerate: plan.wouldGenerate, wouldSpendChars: plan.wouldSpendChars, budgetChars })
  if (typeof plan.wouldSpendChars !== 'number') return stop('phase8 dry run does not report wouldSpendChars (old service) — refusing to run blind', 0, 0)
  if (!go) return stop('plan only (pass --go to render)', 0, 0)
  if (plan.wouldGenerate === 0) return stop('nothing to render', 0, 0)
  if (plan.wouldSpendChars > budgetChars) return stop(`plan needs up to ${plan.wouldSpendChars} chars, budget is ${budgetChars} — raise the budget with a human's approval or narrow --roles`, 0, 0)

  let spent = 0
  for (let pass = 1; pass <= maxPasses; pass++) {
    const remaining = budgetChars - spent
    if (remaining <= 0) return stop(`budget spent (${spent}/${budgetChars})`, pass - 1, spent)
    const r = await post({ ...base, budgetChars: remaining })
    const s = r.spend || {}
    const spentNow = Number(s.spentChars) || 0
    const calls = Number(s.providerCalls) || 0
    const attached = Number(r.attached)
    spent += spentNow
    log({ event: 'pass', pass, status: r.status, spentChars: spentNow, totalSpent: spent, budgetChars, providerCalls: calls, attached: Number.isFinite(attached) ? attached : null, tripKind: s.tripKind || null, failed: r.failed, ledger: ledgerSnapshot() })
    if (!r.spend || typeof s.spentChars !== 'number') return stop('phase8 did not report spend for the pass (old service) — refusing to post another', pass, spent)
    if (r.status === 'spend-capped') return stop(`phase8 capped the pass: ${s.capped}`, pass, spent)
    if (!Number.isFinite(attached) || attached === 0) return stop(`pass ${pass} attached ${Number.isFinite(attached) ? 0 : 'nothing reported'} — the next pass would fill nothing either`, pass, spent)
    if (calls > RATIO_LIMIT * attached) return stop(`pass ${pass} made ${calls} provider calls for ${attached} slots (> ${RATIO_LIMIT}x) — re-rendering what it already has`, pass, spent)
    if (spent >= budgetChars) return stop(`budget spent (${spent}/${budgetChars})`, pass, spent)
    const next = await post({ ...base, dryRun: true })
    if (!next.wouldGenerate) return stop('done — nothing left to render', pass, spent, true)
  }
  return stop(`--max-passes ${maxPasses} reached`, maxPasses, spent)

  function stop(reason, passes, spentChars, done = false) {
    log({ event: 'stop', reason, passes, spentChars, done })
    return { stopped: reason, passes, spent: spentChars, done }
  }
}

// ─── CLI ────────────────────────────────────────────────────────────────────

function arg(name, dflt) {
  const i = process.argv.indexOf(`--${name}`)
  if (i < 0) return dflt
  const v = process.argv[i + 1]
  return v === undefined || v.startsWith('--') ? true : v
}

async function main() {
  const course = arg('course')
  if (!course) { console.error('usage: render-driver.cjs --course <code> --budget-chars <n> [--go] [--roles a,b] [--concurrency n] [--max-passes n] [--job label]'); process.exit(2) }
  const P8 = process.env.PHASE8_URL || 'http://localhost:3465'
  const job = arg('job', process.env.TTS_SPEND_JOB || null)
  const base = {
    authorScope: 'none',
    ...(arg('roles') ? { roles: String(arg('roles')).split(',') } : {}),
    concurrency: Number(arg('concurrency', 4)),
    ...(job ? { job } : {}),
  }
  const { evidencePath } = require('./lib/evidence-path.cjs')
  const logPath = arg('log') || evidencePath(`tools/render-driver/${course}-${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`)
  fs.mkdirSync(path.dirname(logPath), { recursive: true })
  const log = (e) => { const line = JSON.stringify({ at: new Date().toISOString(), course, ...e }); fs.appendFileSync(logPath, line + '\n'); console.log(line) }
  const { spendGuard } = require('../services/shared/tts-spend-guard.cjs')
  const ledgerSnapshot = () => { try { return spendGuard().snapshot('cartesia') } catch (e) { return { error: e.message } } }
  const post = async (body) => {
    const r = await fetch(`${P8}/generate/${course}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(24 * 3600e3) })
    const text = await r.text()
    try { return JSON.parse(text) } catch { throw new Error(`phase8 ${r.status}: ${text.slice(0, 300)}`) }
  }
  const out = await runDriver({ post, log, ledgerSnapshot, budgetChars: Number(arg('budget-chars')), maxPasses: Number(arg('max-passes', 5)), go: !!arg('go', false), base })
  console.log(`render-driver: ${out.done ? 'DONE' : 'STOPPED'} — ${out.stopped}; ${out.passes} pass(es), ${out.spent} chars. Log: ${logPath}`)
  process.exit(out.done || out.stopped.startsWith('plan only') ? 0 : 1)
}

if (require.main === module) main().catch(e => { console.error(`render-driver: ${e.message}`); process.exit(1) })

module.exports = { runDriver, RATIO_LIMIT }
