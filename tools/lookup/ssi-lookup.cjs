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
//   node tools/lookup/ssi-lookup.cjs learner --email <address>
//        job #889 (Support room): does this email have an account, and what does it have access to?
//        account yes/no, created, subscription (as api/_utils/courseAccess.ts computes active), direct
//        entitlements, pre-granted email access (not yet redeemed), offline-lease trials, class/school/
//        group names, last activity + events per day (14 d). Never returns the email, names, payloads.
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
  if (cmd === 'learner') return buildLearner(flags, pos, now);
  usage('subcommand must be invite, events, support or learner');
}

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}$/;
const isUuid = (v) => UUID.test(String(v || ''));

/**
 * learner --email: the plan is a keyed chain. `learner` is found by the GIN-indexed verified_emails
 * array (value lower-cased in JS, never the column); everything else is keyed on that row's id/user_id
 * or on the indexed email_access_grants.email_normalized. Reads only — nothing here can create an account.
 */
function buildLearner(flags, pos, now) {
  const raw = String(flags.email || pos[0] || '').trim().toLowerCase();
  if (!EMAIL.test(raw)) usage('learner needs --email <address>');
  const since = new Date(now.getTime() - 14 * DAY).toISOString();
  return { kind: 'learner', email: raw, now, steps: [
    { name: 'learner', text: 'SELECT id, user_id, created_at, educational_role, platform_role, is_demo, is_internal FROM learners WHERE verified_emails @> ARRAY[$1::text] LIMIT 3', values: [raw] },
    { name: 'emailGrants', text: 'SELECT access_type, granted_courses, duration_type, duration_days, is_active, created_at, redeemed_at FROM email_access_grants WHERE email_normalized = $1 ORDER BY created_at DESC LIMIT 10', values: [raw] },
    { name: 'subscription', bind: 'id', text: 'SELECT status, plan_name, provider, current_period_end, cancel_at_period_end, created_at FROM subscriptions WHERE learner_id = $1::uuid LIMIT 1' },
    { name: 'entitlements', bind: 'id', text: 'SELECT access_type, granted_courses, expires_at, redeemed_at FROM user_entitlements WHERE learner_id = $1::uuid ORDER BY redeemed_at DESC LIMIT 20' },
    { name: 'leases', bind: 'id', text: 'SELECT course_code, granted_at, expires_at, is_trial, revoked_at FROM offline_leases WHERE learner_id = $1::uuid ORDER BY expires_at DESC LIMIT 20' },
    { name: 'tags', bind: 'user_id', text: 'SELECT tag_type, tag_value, role_in_context FROM user_tags WHERE user_id = $1::text AND removed_at IS NULL LIMIT 20' },
    { name: 'lastEvent', bind: 'user_id', uuidOnly: true, text: 'SELECT occurred_at, event_type, course_code FROM player_events WHERE user_id = $1::uuid ORDER BY occurred_at DESC LIMIT 1' },
    { name: 'daily', bind: 'user_id', uuidOnly: true, extra: [since], text: "SELECT (occurred_at AT TIME ZONE 'UTC')::date AS day, count(*)::int AS events FROM player_events WHERE user_id = $1::uuid AND occurred_at >= $2::timestamptz GROUP BY 1 ORDER BY 1 DESC LIMIT 14" },
  ], names: [
    { name: 'classes', text: 'SELECT c.id, c.class_name, c.course_code, s.school_name FROM classes c LEFT JOIN schools s ON s.id = c.school_id WHERE c.id = ANY($1::uuid[]) LIMIT 20' },
    { name: 'groups', text: 'SELECT id, name FROM groups WHERE id = ANY($1::uuid[]) LIMIT 20' },
    { name: 'schools', text: 'SELECT id, school_name FROM schools WHERE id = ANY($1::uuid[]) LIMIT 20' },
  ] };
}

const live = (end, now) => end == null || new Date(end) > now;

async function runLearner(pg, plan) {
  const now = plan.now;
  const q = async (s, v) => (await pg.query(s.text, v)).rows;
  const [by, grantsStep, ...rest] = plan.steps;
  const found = await q(by, by.values);
  const grants = (await q(grantsStep, grantsStep.values)).map((g) => ({ ...g, usable: g.is_active && !g.redeemed_at }));
  const out = { kind: 'learner', query: plan.email, account: found.length > 0, accounts: found.length, emailGrants: grants };
  if (!found.length) {
    out.summary = grants.length ? 'No account yet for that email, but access is pre-granted to it (emailGrants).' : 'No account for that email.';
    return out;
  }
  const l = found[0];
  out.created = l.created_at; out.role = l.educational_role || l.platform_role || null; out.demoOrInternal = !!(l.is_demo || l.is_internal);
  const r = {};
  for (const s of rest) {
    if (s.uuidOnly && !isUuid(l.user_id)) { r[s.name] = []; continue; }
    r[s.name] = await q(s, [l[s.bind], ...(s.extra || [])]);
  }
  const sub = r.subscription[0];
  // Same rule as api/_utils/courseAccess.ts: status active AND (no period end OR end in the future).
  out.subscription = sub ? { ...sub, active: sub.status === 'active' && live(sub.current_period_end, now) } : null;
  out.entitlements = r.entitlements.map((e) => ({ access_type: e.access_type, granted_courses: e.granted_courses, expires_at: e.expires_at, active: live(e.expires_at, now) }));
  out.trialLeases = r.leases.map((x) => ({ course_code: x.course_code, is_trial: x.is_trial, expires_at: x.expires_at, revoked: !!x.revoked_at, active: !x.revoked_at && live(x.expires_at, now) }));
  const anyActive = out.subscription?.active || out.entitlements.some((e) => e.active);
  out.status = out.subscription?.active ? 'premium (active subscription)' : anyActive ? 'entitled (active entitlement)' : out.trialLeases.some((x) => x.is_trial && x.active) ? 'free trial (offline-lease taste)' : 'free (no active subscription or entitlement)';
  const ids = (type) => r.tags.filter((t) => t.tag_type === type).map((t) => String(t.tag_value).split(':').pop()).filter(isUuid);
  const memberships = [];
  for (const [n, type] of [['classes', 'class'], ['groups', 'group'], ['schools', 'school']]) {
    const want = ids(type);
    if (!want.length) continue;
    const rows = await q(plan.names.find((x) => x.name === n), [want]);
    for (const row of rows) memberships.push({ type, name: row.class_name || row.name || row.school_name, school: row.school_name && row.class_name ? row.school_name : undefined, course_code: row.course_code, role: r.tags.find((t) => t.tag_type === type && String(t.tag_value).endsWith(row.id))?.role_in_context });
  }
  out.memberships = memberships;
  out.activity = { last: r.lastEvent[0] || null, eventsPerDay14d: r.daily };
  return out;
}

/** Run the plan on a connected (agent-db) client. Returns the JSON-able answer. */
async function run(pg, plan) {
  if (plan.kind === 'learner') return runLearner(pg, plan);
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
