#!/usr/bin/env node
/**
 * THE DAILY TOTAL CAP — status, Tom's raise, and Tom's approval of one run (jobs #692, #913).
 *
 * Tom, 2026-09-29 00:25Z: "limit it to 50,000 characters per day TOTAL without my
 * express approval." The cap lives in tts_spend_reserve (ops/sql/20260930-tts-spend-tom-approved-run.sql):
 * 100,000 chars per UTC day (Tom 2026-09-29 14:31Z, was 50,000) summed over every provider.
 *
 * Tom, 2026-09-30 11:38Z (job #913): "If other people want to generate audio, we still
 * have 100,000 character cap. But if I am approving a run, we can just go ahead and do
 * it. It would probably be sensible to have a cap at something like maybe 300,000."
 * So an APPROVAL names one job; that job's renders (POST /api/audio/render with
 * job "#NNN", or tools/audio/render.cjs --job) spend from their own allowance, the
 * automatic 100k is counted without them, and nothing takes a day past 300,000.
 * Pair it with a jobRaises entry for the same job in ops/tts-spend-budgets.json, which
 * lifts the per-provider daily caps for that job alone.
 *
 *   node tools/tts-cap.cjs status
 *   TOM_SAID_RAISE=yes node tools/tts-cap.cjs raise <capChars> <days<=31> "<why, in Tom's words>"
 *   TOM_SAID_APPROVE=yes node tools/tts-cap.cjs approve "#NNN" <capChars<=300000> <days<=31> "<why, in Tom's words>"
 */
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')

const CEILING = 300000
const signed = (t = '') => `${t}by ~* '^\\s*tom\\M' and nullif(btrim(${t}why), '') is not null and ${t}until > now() and ${t}until <= ${t}at + interval '31 days'`

function psql(sql) {
  const f = [path.join(os.homedir(), 'ssi-dashboard-v7-clean', '.env.psql'), path.join(os.homedir(), 'SSi', 'ssi-dashboard-v7-clean', '.env.psql')].find(x => fs.existsSync(x))
  const url = process.env.DATABASE_URL || (f && (fs.readFileSync(f, 'utf8').match(/^DATABASE_URL=(.*)$/m) || [])[1])
  if (!url) throw new Error('no DATABASE_URL (.env.psql)')
  return execFileSync('psql', [url.trim().replace(/^["']|["']$/g, ''), '-v', 'ON_ERROR_STOP=1', '-Atc', sql], { encoding: 'utf8' }).trim()
}
const quote = (s) => `'${String(s).replace(/'/g, "''")}'`
const DAY = `date_trunc('day', now() at time zone 'UTC') at time zone 'UTC'`
const status = () => {
  console.log(psql(`select 'UTC day ' || to_char(now() at time zone 'UTC','YYYY-MM-DD') || ': ' || coalesce(sum(chars),0) || ' chars spent across all providers; automatic cap ' || least(${CEILING}, greatest(100000, (select coalesce(max(cap_chars),0) from tts_spend_total_cap_raises where job is null and ${signed()}))) || ', hard ceiling ${CEILING}' from tts_spend_ledger where kind='call' and at >= ${DAY}`))
  console.log(psql(`select coalesce(string_agg(provider || ' ' || chars_sum, ', ' order by provider), 'nothing rendered yet') from (select provider, sum(chars) chars_sum from tts_spend_ledger where kind='call' and at >= ${DAY} group by 1) x`))
  console.log(psql(`select coalesce(string_agg('Tom-approved run ' || r.job || ': ' || coalesce((select sum(chars) from tts_spend_ledger l where l.kind='call' and l.at >= ${DAY} and l.job ~ (r.job || '(?![0-9])')),0) || ' of ' || least(r.cap_chars, ${CEILING}) || ' chars today, until ' || to_char(r.until at time zone 'UTC','YYYY-MM-DD HH24:MI') || 'Z (' || r.why || ')', E'\\n'), 'no Tom-approved run in force') from tts_spend_total_cap_raises r where r.job is not null and ${signed('r.')}`))
}
const cmd = process.argv[2] || 'status'
if (cmd === 'raise') {
  if (process.env.TOM_SAID_RAISE !== 'yes') { console.error('Only Tom raises the cap. Run with TOM_SAID_RAISE=yes once he has said so, in chat.'); process.exit(2) }
  const [cap, days, why] = [Number(process.argv[3]), Number(process.argv[4]), process.argv[5]]
  if (!(cap > 100000 && cap <= CEILING) || !(days > 0 && days <= 31) || !why) { console.error(`usage: raise <capChars 100001..${CEILING}> <days 1..31> "<why>"`); process.exit(2) }
  psql(`insert into tts_spend_total_cap_raises (cap_chars, by, why, until) values (${cap}, 'Tom (in chat)', ${quote(why)}, now() + interval '${days} days')`)
  console.log(`cap raised to ${cap} for ${days} day(s)`)
} else if (cmd === 'approve') {
  if (process.env.TOM_SAID_APPROVE !== 'yes') { console.error('Only Tom approves a run. Run with TOM_SAID_APPROVE=yes once he has said so, in chat.'); process.exit(2) }
  const [job, cap, days, why] = [process.argv[3], Number(process.argv[4]), Number(process.argv[5]), process.argv[6]]
  if (!/^#\d+$/.test(job || '') || !(cap > 0 && cap <= CEILING) || !(days > 0 && days <= 31) || !why) { console.error(`usage: approve "#NNN" <capChars 1..${CEILING}> <days 1..31> "<why>"`); process.exit(2) }
  psql(`insert into tts_spend_total_cap_raises (cap_chars, by, why, until, job) values (${cap}, 'Tom (in chat)', ${quote(why)}, now() + interval '${days} days', ${quote(job)})`)
  console.log(`run ${job} approved to ${cap} chars/day for ${days} day(s)`)
}
status()
