#!/usr/bin/env node
/**
 * RESUMABLE DAILY DRIVER: re-voice the REST of ita_for_eng in Cartesia (job #759, Tom 2026-10-04 23:00Z by ear, ruling
 * r-2026-10-04-italian-ita-for-eng-pilot-approved). It runs EXACTLY the pilot's tool (charlotte-backfill.cjs: render route, write-ahead
 * ledger, verify-then-swap, undo) over the four passes the pilot covered:
 *   ita-target1 -> cast Italian female, ita-target2 -> cast Italian male (voice_language_roles),
 *   general (English female Azure/xAI -> Charlotte) and male (English male -> tom_001), roles known+presentation.
 * Clips already on a Cartesia voice are never selected; library clips are linked free by the route. Nothing here touches a provider.
 *
 * Spend: the automatic cap is 260,000 chars per UTC day ACROSS ALL AGENTS (never raised here). Each round budgets
 * min(CAP - spentToday - MARGIN); at the cap (or any spend-guard refusal) it sleeps to the next UTC day and resumes; the work queue is
 * re-derived from the DB each time, so a crash or restart loses nothing. Order: seeds 1-100 first, then 1-200 ... then the rest.
 * Exits 0 when every pass reports OUTSTANDING 0 in the unscoped tier.
 *
 *   systemd-run --user --unit=cs-long-ita-revoice-759 --slice=cs-workers.slice --working-directory=$PWD bash -lc 'node tools/audio/ita-revoice-759.cjs'
 */
const path = require('path')
const { spawnSync } = require('child_process')
require('dotenv').config({ path: path.join(__dirname, '../../.env.psql') })
const { Client } = require('pg')

const CAP = Number(process.env.CAP || 260000), MARGIN = Number(process.env.MARGIN || 12000)
const COURSE = 'ita_for_eng'
const TIERS = [100, 200, 300, 400, 500, null] // null = unscoped (the whole rest)
const PASSES = [['ita-target1', 'target1'], ['ita-target2', 'target2'], ['general', 'known,presentation'], ['male', 'known,presentation']]
const TOOL = path.join(__dirname, 'charlotte-backfill.cjs')
let stuck = 0
/** Pass output -> { outstanding, skippedBudget }. Budget-skipped clips are owed but merely unaffordable today: not a failure (job #834). */
function parsePass(out) {
  const o = /^OUTSTANDING (\d+)/m.exec(out), k = /^SKIPPED-BUDGET (\d+)/m.exec(out)
  return o ? { outstanding: Number(o[1]), skippedBudget: k ? Number(k[1]) : 0 } : null
}
const log = (...a) => console.log(`[${new Date().toISOString()}]`, ...a)

async function spentToday() {
  const pg = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await pg.connect()
  const { rows: [{ spent }] } = await pg.query(`select coalesce(sum(chars),0)::int spent from tts_spend_ledger where kind='call' and at >= date_trunc('day', now() at time zone 'UTC') at time zone 'UTC'`)
  await pg.end(); return spent
}
const sleep = ms => new Promise(r => setTimeout(r, ms))
const msToNextUtcDay = () => { const n = new Date(); return Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + 1, 0, 3) - n.getTime() }

if (require.main === module) (async () => {
  for (;;) {
    let outstanding = 0, stopped = false
    const budget0 = Math.max(0, CAP - (await spentToday()) - MARGIN)
    let budget = budget0
    log(`round start: budget ${budget0} (cap ${CAP}, margin ${MARGIN})`)
    for (const tier of TIERS) {
      let tierOutstanding = 0, tierSkipped = 0
      for (const [voices, roles] of PASSES) {
        if (budget < 200) { stopped = true; break }
        const args = [TOOL, '--course', COURSE, '--voices', voices, '--roles', roles, '--budget', String(budget), ...(tier ? ['--seeds', `1-${tier}`] : [])]
        const r = spawnSync('node', args, { encoding: 'utf8', maxBuffer: 1 << 28 })
        const out = (r.stdout || '') + (r.stderr || '')
        console.log(out.split('\n').filter(l => /^(done|REFUSED|FAIL|VERIFY-FAIL|SLOT-REFUSED|5 failures|NO CAST|Error)|: \d+ old clips/.test(l)).join('\n'))
        const spent = /(\d+) chars spent/.exec(out); budget -= spent ? Number(spent[1]) : 0
        const o = parsePass(out)
        if (!o || r.status !== 0) { log(`pass ${voices} tier ${tier} unreadable/exit ${r.status}; stopping the round`); stopped = true; break }
        tierOutstanding += o.outstanding - o.skippedBudget; tierSkipped += o.skippedBudget
        if (/REFUSED \(the answer/.test(out)) { log('spend guard refused: stopping for today'); stopped = true; break }
      }
      if (tierSkipped > 0) { log(`tier ${tier}: ${tierSkipped} clips do not fit today's budget: stopping for today`); stopped = true }
      if (stopped) { outstanding = 1; break }
      if (tierOutstanding > 0) { outstanding = tierOutstanding; break } // a tier owes work (verify/failure): do not run later seeds past it
    }
    log(`round over: spent ${budget0 - budget}, outstanding ${outstanding}, stopped ${stopped}`)
    if (!outstanding && !stopped) { log('ALL DONE'); return }
    const wait = stopped ? msToNextUtcDay() : 5 * 60e3 // a tier owing failed work retries in 5 min; cap/refusal waits for tomorrow
    if (!stopped) { if (++stuck > 6) { log('same work still outstanding after 6 retries: giving up for a human'); process.exit(2) } } else stuck = 0
    log(`sleeping ${Math.round(wait / 60e3)} min`); await sleep(wait)
  }
})().catch(e => { console.error(e); process.exit(1) })

module.exports = { parsePass }
