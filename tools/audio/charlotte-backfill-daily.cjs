#!/usr/bin/env node
/**
 * DAILY, RESUMABLE DRIVER for the English->Charlotte backfill (job #573). Run once per UTC day by a systemd
 * timer; a re-run the same day just spends whatever headroom is left, and a crash loses nothing (the work
 * queue is "English clips still linked to an xAI/Azure voice", re-derived from the DB every time).
 *
 * Budget = min(DAILY_MAX, cap - spentToday - MARGIN). The cap is SHARED (every other agent's renders count),
 * so this never takes the last MARGIN chars and never more than DAILY_MAX in one day. 100,000 is the AUTOMATIC
 * cap; the 300,000 Tom-approved run is NOT assumed — if Tom signs it (tools/tts-cap.cjs approve "#573" ...),
 * raise CAP/DAILY_MAX via env: CAP=300000 DAILY_MAX=250000.
 * Order: see buildQueue (seeds 1-100 first, xAI then Azure, ita_for_eng first; then the rest). Roles: known+presentation of *_for_eng, target1+target2 of eng_for_*. Target-side Azure in other languages is NOT automated here: casting is Tom's.
 * A spend-guard refusal ends the day's run quietly (the refusal is the answer; tomorrow's run resumes).
 */
const path = require('path')
const { spawnSync } = require('child_process')
require('dotenv').config({ path: path.join(__dirname, '../../.env.psql') })
const { Client } = require('pg')

const CAP = Number(process.env.CAP || 100000), DAILY_MAX = Number(process.env.DAILY_MAX || 60000), MARGIN = Number(process.env.MARGIN || 10000)
/**
 * The order of the day (Tom 2026-10-04): SEEDS 1-SEED_SCOPE of every course first — xAI female+male (ita_for_eng, then every other
 * English-bearing course), then Azure (and any remaining female/male) within the same seeds — and only once seeds 1-100 are exhausted
 * (each scoped call finds nothing and spends nothing) the rest of the course as before. Male slots -> tom_001, only when malePass.
 * Exported and pure so the order is a test, not a comment.
 */
const SEED_SCOPE = 100
const xaiRoles = c => (/^eng_for_/.test(c) ? 'target1,target2' : 'known,presentation')
function buildQueue(codes, malePass) {
  const english = [...(codes.includes('ita_for_eng') ? ['ita_for_eng'] : []), ...codes.filter(c => /_for_eng$|^eng_for_/.test(c) && c !== 'ita_for_eng')]
  const pass = (voices, scope) => english.map(c => [c, xaiRoles(c), ['--voices', voices, ...(scope ? ['--seeds', `1-${SEED_SCOPE}`] : [])]])
  const passes = scope => [
    ...pass('xai-female', scope), ...(malePass ? pass('xai-male', scope) : []),
    ...pass('general', scope), ...(malePass ? pass('male', scope) : []),   // general = every female voice (Azure + xAI), male = every male voice
  ]
  return [...passes(true), ...passes(false)]
}
const TOOL = path.join(__dirname, 'charlotte-backfill.cjs')

if (require.main === module) (async () => {
  const pg = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await pg.connect()
  const { rows: [{ spent }] } = await pg.query(`select coalesce(sum(chars),0)::int spent from tts_spend_ledger where kind='call' and at >= date_trunc('day', now() at time zone 'UTC') at time zone 'UTC'`)
  const { rows: courses } = await pg.query(`select course_code from courses order by 1`)
  await pg.end()
  let budget = Math.max(0, Math.min(DAILY_MAX, CAP - spent - MARGIN))
  console.log(`[${new Date().toISOString()}] spent today ${spent}; this run's budget ${budget}`)
  const codes = courses.map(c => c.course_code)
  // xAI-voiced FEMALE English first (clicks heard by ear, Tom 2026-10-04): ita_for_eng, then every other course; male voices are NEVER mapped to Charlotte
  // (Tom 2026-10-04: English is two voices); the general pass below is female-only, males belong to the MALE_PASS=1 pass.
  const xaiRoles = c => (/^eng_for_/.test(c) ? 'target1,target2' : 'known,presentation')
  const queue = buildQueue(codes, process.env.MALE_PASS === '1')
  for (const [course, roles, extra = []] of queue) {
    if (budget < 200) break
    const r = spawnSync('node', [TOOL, '--course', course, '--roles', roles, '--budget', String(budget), ...extra], { encoding: 'utf8' })
    const out = (r.stdout || '') + (r.stderr || '')
    process.stdout.write(out.split('\n').filter(l => /^(done|REFUSED|FAIL|VERIFY-FAIL|SLOT-REFUSED|5 failures|Error)/.test(l) || /: \d+ old clips/.test(l)).join('\n') + '\n')
    const m = /(\d+) chars spent/.exec(out); budget -= m ? Number(m[1]) : 0
    if (/REFUSED \(the answer/.test(out) || r.status !== 0) { console.log('stopping for today:', r.status !== 0 ? `exit ${r.status}` : 'spend guard refused'); break }
  }
  console.log(`[${new Date().toISOString()}] run over; budget left ${budget}`)
})().catch(e => { console.error(e); process.exit(1) })

module.exports = { buildQueue, SEED_SCOPE }
