#!/usr/bin/env node
/**
 * TOM'S PERMISSION TO RE-RECORD — grant, revoke, status, and what the door refused.
 *
 * Tom, 2026-10-11: "there shouldn't be any re-recording done without express
 * permission by me." The TTS door refuses any render that would replace a
 * working clip (services/shared/rerecord-gate.cjs) unless a row this tool wrote
 * covers the course. Filling a slot that has NO clip never needs this.
 *
 *   node tools/audio/rerecord-permission.cjs status [course]
 *   node tools/audio/rerecord-permission.cjs refused [course] [hours=24]
 *   TOM_SAID_RERECORD=yes node tools/audio/rerecord-permission.cjs grant <course> <days 1..31> "<why, in Tom's words>" [--roles target1,target2] [--max N]
 *   node tools/audio/rerecord-permission.cjs revoke <id>
 *
 * Only Tom grants: an agent sets TOM_SAID_RERECORD=yes only after Tom has said
 * so in chat, and `why` carries his words. Anyone may revoke (it only tightens).
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
const quote = (s) => `'${String(s).replace(/'/g, "''")}'`
const COURSE = /^[a-z]{2,3}(_[a-z]{2,3})?_for_[a-z]{2,3}(_[a-z]{2,3})?$/

function flag(name) {
  const i = process.argv.indexOf(name)
  return i > 0 ? process.argv[i + 1] : null
}
function die(msg) { console.error(msg); process.exit(2) }

const [cmd = 'status', a1, a2, a3] = process.argv.slice(2)
if (cmd === 'grant') {
  if (process.env.TOM_SAID_RERECORD !== 'yes') die('Only Tom permits a re-record. Run with TOM_SAID_RERECORD=yes once he has said so, in chat, and put his words in "why".')
  const days = Number(a2), roles = flag('--roles'), max = flag('--max')
  if (!COURSE.test(a1 || '') || !(days > 0 && days <= 31) || !a3 || !a3.trim()) die('usage: grant <course_code> <days 1..31> "<why, in Tom\'s words>" [--roles target1,target2] [--max N]')
  if (max != null && !(Number(max) > 0)) die('--max must be a positive number of clips')
  const roleList = roles ? roles.split(',').map(r => r.trim()).filter(Boolean) : null
  if (roleList && roleList.some(r => !/^[a-z0-9_]+$/.test(r))) die('--roles is a comma list like target1,target2')
  const id = psql(`insert into tts_rerecord_permissions (course_code, roles, by, why, until, max_clips) values (${quote(a1)}, ${roleList ? `array[${roleList.map(quote).join(',')}]` : 'null'}, 'Tom (in chat)', ${quote(a3)}, now() + interval '${days} days', ${max != null ? Number(max) : 'null'}) returning id`)
  console.log(`permission #${id}: ${a1}${roleList ? ` (${roleList.join(', ')})` : ''} may be re-recorded for ${days} day(s)${max ? `, at most ${max} clip(s)` : ''}`)
} else if (cmd === 'revoke') {
  if (!/^\d+$/.test(a1 || '')) die('usage: revoke <permission id>')
  psql(`update tts_rerecord_permissions set revoked_at = now() where id = ${Number(a1)} and revoked_at is null`)
  console.log(`permission #${a1} revoked`)
} else if (cmd === 'refused') {
  const hours = Number(a2) > 0 ? Number(a2) : 24
  console.log(psql(`select coalesce(string_agg(to_char(at at time zone 'UTC','MM-DD HH24:MI') || 'Z ' || coalesce(course_code,'?') || ' ' || coalesce(role,'?') || ' ' || coalesce(voice_id,'?') || ' "' || left(coalesce(text,''),50) || '" via ' || coalesce(origin,'?') || coalesce(' ' || job, '') || case when dry_run then ' (dry run)' else '' end, E'\\n' order by at), 'nothing refused') from tts_rerecord_log where kind = 'refused' and at > now() - interval '${hours} hours'${a1 ? ` and course_code = ${quote(a1)}` : ''}`))
} else if (cmd !== 'status') {
  die('commands: status [course] | refused [course] [hours] | grant … | revoke <id>')
}
if (cmd !== 'refused') {
  const where = cmd === 'status' && a1 ? ` and p.course_code = ${quote(a1)}` : ''
  console.log(psql(`select coalesce(string_agg('#' || p.id || ' ' || p.course_code || coalesce(' [' || array_to_string(p.roles, ',') || ']', '') || ' until ' || to_char(p.until at time zone 'UTC','YYYY-MM-DD HH24:MI') || 'Z, used ' || (select count(*) from tts_rerecord_log l where l.permission_id = p.id and l.kind = 'permitted') || coalesce('/' || p.max_clips, '') || ' — ' || p.why, E'\\n' order by p.id), 'no re-record permission in force — every re-record is refused') from tts_rerecord_permissions p where p.revoked_at is null and p.until > now() and p.by ~* '^\\s*tom\\M' and p.until <= p.at + interval '31 days'${where}`))
}
