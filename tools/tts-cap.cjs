#!/usr/bin/env node
/**
 * THE DAILY TOTAL CAP — status and Tom's raise (job #692).
 *
 * Tom, 2026-09-29 00:25Z: "limit it to 50,000 characters per day TOTAL without my
 * express approval." The cap lives in tts_spend_reserve (ops/sql/20260929-tts-spend-total-cap.sql):
 * 50,000 chars per UTC day summed over every provider. Only a signed raise naming Tom lifts it.
 *
 *   node tools/tts-cap.cjs status
 *   TOM_SAID_RAISE=yes node tools/tts-cap.cjs raise <capChars> <days<=31> "<why, in Tom's words>"
 */
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')

function psql(sql) {
  const f = [path.join(os.homedir(), 'ssi-dashboard-v7-clean', '.env.psql'), path.join(os.homedir(), 'SSi', 'ssi-dashboard-v7-clean', '.env.psql')].find(x => fs.existsSync(x))
  const url = process.env.DATABASE_URL || (f && (fs.readFileSync(f, 'utf8').match(/^DATABASE_URL=(.*)$/m) || [])[1])
  if (!url) throw new Error('no DATABASE_URL (.env.psql)')
  return execFileSync('psql', [url.trim().replace(/^["']|["']$/g, ''), '-v', 'ON_ERROR_STOP=1', '-Atc', sql], { encoding: 'utf8' }).trim()
}
const status = () => {
  console.log(psql(`select 'UTC day ' || to_char(now() at time zone 'UTC','YYYY-MM-DD') || ': ' || coalesce(sum(chars),0) || ' chars spent across all providers; cap ' || greatest(50000, (select coalesce(max(cap_chars),0) from tts_spend_total_cap_raises where by ~* '^\\s*tom\\M' and until > now() and until <= at + interval '31 days')) from tts_spend_ledger where kind='call' and at >= date_trunc('day', now() at time zone 'UTC') at time zone 'UTC'`))
  console.log(psql(`select coalesce(string_agg(provider || ' ' || chars_sum, ', ' order by provider), 'nothing rendered yet') from (select provider, sum(chars) chars_sum from tts_spend_ledger where kind='call' and at >= date_trunc('day', now() at time zone 'UTC') at time zone 'UTC' group by 1) x`))
}
const cmd = process.argv[2] || 'status'
if (cmd === 'raise') {
  if (process.env.TOM_SAID_RAISE !== 'yes') { console.error('Only Tom raises the cap. Run with TOM_SAID_RAISE=yes once he has said so, in chat.'); process.exit(2) }
  const [cap, days, why] = [Number(process.argv[3]), Number(process.argv[4]), process.argv[5]]
  if (!(cap > 50000) || !(days > 0 && days <= 31) || !why) { console.error('usage: raise <capChars > 50000> <days 1..31> "<why>"'); process.exit(2) }
  psql(`insert into tts_spend_total_cap_raises (cap_chars, by, why, until) values (${cap}, 'Tom (in chat)', '${why.replace(/'/g, "''")}', now() + interval '${days} days')`)
  console.log(`cap raised to ${cap} for ${days} day(s)`)
}
status()
