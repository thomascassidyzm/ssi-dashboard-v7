#!/usr/bin/env node
'use strict';
// READ-ONLY LOOKUPS an agent may run against the live SSi database (job #748, Tom 2026-10-15:
// "we can't be building a system that has so many restrictions that we can't use it").
//
// Why it exists: the no-hand-written-DB rule (#384) stands, so "is invite code TRK-172 used?" (#631),
// "what did this learner do in the hour before they wrote?" and "what's in this support thread?"
// had no sanctioned answer at all — workers stopped and reported a gap. This is that answer: a
// committed tool, run UNCHANGED, through the agent-db door (agent_script login, 5 s cap, key-cast lint).
//
// Every query hits an index on its key, is bounded by LIMIT, and returns only the columns the
// question needs (no metadata blobs, no emails; payloads and bodies truncated).
//
//   node tools/lookup/ssi-lookup.cjs invite <code>                      one code by its normalised text
//   node tools/lookup/ssi-lookup.cjs invite --school <uuid>             codes granting one school (≤50)
//   node tools/lookup/ssi-lookup.cjs events --learner|--user|--session <uuid> [--since ISO] [--until ISO] [--type T] [--limit N]
//        default window: the 24 h before --until (or now); window ≤ 31 days; limit ≤ 500 (default 200)
//   node tools/lookup/ssi-lookup.cjs support --thread|--school|--group <uuid> | --learner <id> [--limit N]
//        the thread and its newest messages (≤50)
//   node tools/lookup/ssi-lookup.cjs support --unanswered [--limit N]   inbound messages awaiting an answer (≤50)
//
// Output: JSON on stdout. Exit 64 on a usage error, 1 on a database error.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = 86400e3;

class UsageError extends Error {}
const usage = (m) => { throw new UsageError(m); };

function parseFlags(argv) {
  const flags = {}; const pos = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--unanswered') flags.unanswered = true;
    else if (a.startsWith('--')) { if (argv[i + 1] == null) usage(`${a} needs a value`); flags[a.slice(2)] = argv[++i]; }
    else pos.push(a);
  }
  return { flags, pos };
}
const uuid = (v, name) => { if (!UUID.test(String(v || ''))) usage(`${name} must be a uuid`); return String(v).toLowerCase(); };
const cap = (v, dflt, max) => { const n = v == null ? dflt : Number(v); if (!Number.isInteger(n) || n < 1) usage('--limit must be a positive integer'); return Math.min(n, max); };
const when = (v, name) => { const t = Date.parse(v); if (Number.isNaN(t)) usage(`${name} must be an ISO date/time`); return new Date(t); };

/** argv (after the subcommand) → { kind, steps: [{ name, text, values }] }. Pure: no I/O. */
function buildQueries(cmd, argv, now = new Date()) {
  const { flags, pos } = parseFlags(argv);
  if (cmd === 'invite') {
    const cols = 'id, code, code_type, grants_region, grants_school_id, grants_class_id, grants_group_id, expires_at, max_uses, use_count, is_active, created_at';
    if (flags.school) return { kind: 'invite', steps: [{ name: 'codes', text: `SELECT ${cols} FROM invite_codes WHERE grants_school_id = $1::uuid ORDER BY created_at DESC LIMIT 50`, values: [uuid(flags.school, '--school')] }] };
    const code = String(pos[0] || '').trim();
    if (!code || code.length > 64) usage('invite <code> or invite --school <uuid>');
    return { kind: 'invite', steps: [{ name: 'codes', text: `SELECT ${cols} FROM invite_codes WHERE code_normalized = upper(regexp_replace($1::text, '[^A-Za-z0-9]', '', 'g')) LIMIT 5`, values: [code] }] };
  }
  if (cmd === 'events') {
    const keyCol = flags.learner ? 'learner_id' : flags.user ? 'user_id' : flags.session ? 'session_id' : null;
    if (!keyCol) usage('events needs --learner, --user or --session <uuid>');
    const key = uuid(flags.learner || flags.user || flags.session, `--${keyCol.replace('_id', '')}`);
    const until = flags.until ? when(flags.until, '--until') : now;
    const since = flags.since ? when(flags.since, '--since') : new Date(until.getTime() - DAY);
    if (since >= until) usage('--since must be before --until');
    if (until - since > 31 * DAY) usage('window is capped at 31 days');
    const limit = cap(flags.limit, 200, 500);
    const values = [key, since.toISOString(), until.toISOString()];
    let typeClause = '';
    if (flags.type) { values.push(String(flags.type)); typeClause = ` AND event_type = $${values.length}`; }
    return { kind: 'events', steps: [{ name: 'events',
      text: `SELECT id, occurred_at, event_type, course_code, session_id, learner_id, user_id, env, app_shell, device_type, ip_country, client_version, left(payload::text, 400) AS payload FROM player_events WHERE ${keyCol} = $1::uuid AND occurred_at >= $2::timestamptz AND occurred_at < $3::timestamptz${typeClause} ORDER BY occurred_at DESC LIMIT ${limit}`,
      values }] };
  }
  if (cmd === 'support') {
    const msgCols = 'id, thread_id, direction, author_source, author_name, left(body, 2000) AS body, created_at, answered_at, move, escalated_at, escalation_resolved_at';
    if (flags.unanswered) {
      const limit = cap(flags.limit, 50, 50);
      return { kind: 'support', steps: [{ name: 'unanswered', text: `SELECT id, thread_id, author_source, author_name, left(body, 300) AS body, created_at, escalated_at FROM support_messages WHERE direction = 'in' AND answered_at IS NULL ORDER BY created_at DESC LIMIT ${limit}`, values: [] }] };
    }
    const threadCols = 'id, school_id, group_id, learner_user_id, language, created_at, last_message_at, last_read_at';
    let where; let value;
    if (flags.thread) { where = 'id = $1::uuid'; value = uuid(flags.thread, '--thread'); }
    else if (flags.school) { where = 'school_id = $1::uuid'; value = uuid(flags.school, '--school'); }
    else if (flags.group) { where = 'group_id = $1::uuid'; value = uuid(flags.group, '--group'); }
    else if (flags.learner) { where = 'learner_user_id = $1::text'; value = String(flags.learner).trim(); if (!value || value.length > 64) usage('--learner must be a learner user id'); }
    else usage('support needs --thread, --school, --group, --learner or --unanswered');
    const limit = cap(flags.limit, 50, 50);
    return { kind: 'support', steps: [
      { name: 'threads', text: `SELECT ${threadCols} FROM support_threads WHERE ${where} ORDER BY created_at DESC LIMIT 20`, values: [value] },
      { name: 'messages', perThread: true, text: `SELECT ${msgCols} FROM support_messages WHERE thread_id = $1::uuid ORDER BY created_at DESC LIMIT ${limit}`, values: [] },
    ] };
  }
  usage('subcommand must be invite, events or support');
}

/** Run the plan on a connected (agent-db) client. Returns the JSON-able answer. */
async function run(pg, plan) {
  const out = { kind: plan.kind };
  for (const s of plan.steps) {
    if (s.perThread) {
      out.messages = {};
      for (const t of out.threads || []) out.messages[t.id] = (await pg.query(s.text, [t.id])).rows;
    } else {
      out[s.name] = (await pg.query(s.text, s.values)).rows;
    }
  }
  return out;
}

async function main(argv = process.argv.slice(2), { connect = () => require('../../services/shared/agent-db.cjs').connect(), print = (s) => console.log(s) } = {}) {
  const [cmd, ...rest] = argv;
  const plan = buildQueries(cmd, rest);
  const pg = await connect();
  try { print(JSON.stringify(await run(pg, plan), null, 2)); } finally { await pg.end(); }
}

if (require.main === module) {
  main().catch((e) => {
    if (e instanceof UsageError) { console.error(`ssi-lookup: ${e.message}`); process.exit(64); }
    console.error(`ssi-lookup: ${e.message}`); process.exit(1);
  });
}

module.exports = { buildQueries, run, main, UsageError };
