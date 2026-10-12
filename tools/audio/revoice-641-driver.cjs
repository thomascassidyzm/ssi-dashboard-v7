#!/usr/bin/env node
/**
 * RESUMABLE DAILY RENDER DRIVER (job #641, Tom 2026-10-12 01:22Z). Renders (render-only: NO pointer moves) the new-voice clips for
 * seeds 1-100 of spa_for_eng, fra_for_eng, spa_mx_for_eng, in Tom's order, inside the 260k chars/UTC-day cap (shared with every agent),
 * and sleeps to the next UTC day at the cap. Re-runs are free for clips already rendered (the route is library-first). Exits 0 when every pass reports OUTSTANDING 0.
 * Repointing is a separate, later step (same commands without --render-only) after the sample page is heard.
 *   systemd-run --user --unit=cs-long-641-driver --slice=cs-workers.slice --working-directory=$PWD -E DATABASE_URL=... bash -lc 'node tools/audio/revoice-641-driver.cjs'
 */
const path = require('path')
const { spawnSync } = require('child_process')
const { Client } = require('pg')
const CAP = Number(process.env.CAP || 260000), MARGIN = Number(process.env.MARGIN || 10000)
const STAGES = [['spa_for_eng', 'spa-target1'], ['spa_for_eng', 'spa-target2'], ['fra_for_eng', 'fra-target1'], ['fra_for_eng', 'fra-target2'], ['spa_mx_for_eng', 'spa_mx-target1'], ['spa_mx_for_eng', 'spa_mx-target2']]
const TOOL = path.join(__dirname, 'charlotte-backfill.cjs')
const log = (...a) => console.log(`[${new Date().toISOString()}]`, ...a)
const sleep = ms => new Promise(r => setTimeout(r, ms))
const msToNextUtcDay = () => { const n = new Date(); return Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + 1, 0, 3) - n.getTime() }
async function spentToday() {
  const pg = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }); await pg.connect()
  const { rows: [{ spent }] } = await pg.query(`select coalesce(sum(chars),0)::int spent from tts_spend_ledger where kind='call' and at >= date_trunc('day', now() at time zone 'UTC') at time zone 'UTC'`)
  await pg.end(); return spent
}
;(async () => {
  let stuck = 0
  for (;;) {
    let budget = Math.max(0, CAP - (await spentToday()) - MARGIN), outstanding = 0, stopped = false
    log(`round start: budget ${budget}`)
    for (const [course, pass] of STAGES) {
      if (budget < 300) { stopped = true; break }
      const r = spawnSync('node', [TOOL, '--course', course, '--voices', pass, '--seeds', '1-100', '--budget', String(budget), '--render-only'], { encoding: 'utf8', maxBuffer: 1 << 28, env: { ...process.env, CONCURRENCY: process.env.CONCURRENCY || '3' } })
      const out = (r.stdout || '') + (r.stderr || '')
      console.log(out.split('\n').filter(l => /^(done|REFUSED|FAIL|VERIFY-FAIL|NO CAST|Error)|old clips linked|5 failures/.test(l)).join('\n'))
      const spent = /(\d+) chars spent/.exec(out); budget -= spent ? Number(spent[1]) : 0
      const o = /^OUTSTANDING (\d+)/m.exec(out), k = /^SKIPPED-BUDGET (\d+)/m.exec(out)
      if (!o || r.status !== 0) { log(`${pass} unreadable/exit ${r.status}; stopping`); stopped = true; break }
      if (/REFUSED \(the answer/.test(out)) { log('spend guard refused: stopping for today'); stopped = true; break }
      const skipped = k ? Number(k[1]) : 0
      if (skipped > 0) { log(`${pass}: ${skipped} clips do not fit today's budget`); stopped = true; break }
      if (Number(o[1]) > 0) { outstanding = Number(o[1]); break }
    }
    log(`round over: outstanding ${outstanding}, stopped ${stopped}`)
    if (!outstanding && !stopped) { log('ALL RENDERED'); return }
    if (!stopped && ++stuck > 6) { log('same work outstanding after 6 retries: giving up for a human'); process.exit(2) }
    if (stopped) stuck = 0
    const wait = stopped ? msToNextUtcDay() : 5 * 60e3
    log(`sleeping ${Math.round(wait / 60e3)} min`); await sleep(wait)
  }
})().catch(e => { console.error(e); process.exit(1) })
