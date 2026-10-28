#!/usr/bin/env node
'use strict';
// tools/course-optimization/approve-seeds-by-latest-editor.cjs — approve the seeds whose latest TEXT save was a named
// native speaker's own (Kai ruling 2026-10-28: Auke is a Frisian speaker, so the fry_for_eng seeds Auke wrote/edited
// count as approved).
//
// The rule is "latest": a seed an agent re-saved after Auke is NOT Auke's and stays unapproved; a seed Auke never touched is
// never approved. Reads go through agent-db.cjs (agent login); the write is Popty's own edit-batch door (seed.update
// approved_at), dry run first. The route cannot name Auke as approver (the event actor is whoever calls), so the calling
// agent identity carries the reason in its label.
//
//   node tools/course-optimization/approve-seeds-by-latest-editor.cjs plan  <course> <name-fragment>
//   APPLY_CONFIRM=1 node … apply <course> <name-fragment>        # edit-batch dry run, then apply
//   node … verify <course> <name-fragment>                       # read back approved_at on the person's seeds
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
const AGENT = 'kai-ruling: native-speaker seed approval (Kai ruling 28 Oct)';
// Operations that write seed TEXT (people-report-lib.cjs OP_GROUPS.seedText).
const SEED_TEXT_OPS = ['translate', 'seed-update', 'seed-retranslate', 'orchestrator-seed-edit', 'seed-initialise', 'reset-translations', 'seed-deprecate'];

/** events: [{occurred_at, operation, actor_id, actor_label, seeds:[n]}]; returns Map seed → latest text-save event. */
function latestTextSave(events) {
  const latest = new Map();
  for (const e of events) {
    if (!SEED_TEXT_OPS.includes(e.operation)) continue;
    for (const n of (Array.isArray(e.seeds) ? e.seeds : []).map(Number).filter(Number.isFinite)) {
      const cur = latest.get(n);
      if (!cur || Date.parse(e.occurred_at) > Date.parse(cur.occurred_at)) latest.set(n, e);
    }
  }
  return latest;
}

/** Pure planner. isPerson(event) says whether the event's actor is the named person. */
function plan({ events, seeds, isPerson }) {
  const latest = latestTextSave(events);
  const out = { approve: [], alreadyApproved: [], notTheirs: [], neverSaved: [] };
  for (const s of seeds) {
    const e = latest.get(s.seed_number);
    if (!e) { out.neverSaved.push(s.seed_number); continue; }
    if (!isPerson(e)) { out.notTheirs.push({ seed: s.seed_number, by: e.actor_label || e.actor_id }); continue; }
    (s.approved_at ? out.alreadyApproved : out.approve).push(s.seed_number);
  }
  return out;
}

async function gather(course, fragment) {
  const pg = await require('../../services/shared/agent-db.cjs').connect({ app: 'tool:approve-seeds-by-latest-editor' });
  try {
    const users = (await pg.query('SELECT email, name, role FROM dashboard_users')).rows
      .filter((u) => `${u.name || ''} ${u.email || ''}`.toLowerCase().includes(fragment.toLowerCase()));
    const events = (await pg.query(
      `SELECT occurred_at, operation, actor_id, actor_label, actor_kind, scope->'seed_numbers' AS seeds
         FROM content_edit_events WHERE course_code = $1 AND scope ? 'seed_numbers' ORDER BY occurred_at`, [course])).rows;
    const seeds = (await pg.query('SELECT seed_number, approved_at FROM course_seeds WHERE course_code = $1 ORDER BY seed_number', [course])).rows;
    return { users, events, seeds };
  } finally { await pg.end(); }
}

function personMatcher(users, fragment) {
  const ids = new Set(users.flatMap((u) => [u.email, u.name].filter(Boolean).map((x) => x.toLowerCase())));
  const frag = fragment.toLowerCase();
  return (e) => e.actor_kind === 'human'
    && (ids.has(String(e.actor_id || '').toLowerCase()) || ids.has(String(e.actor_label || '').toLowerCase())
      || String(e.actor_label || '').toLowerCase().includes(frag));
}

async function call(course, body) {
  const r = await fetch(`${POPTY}/api/production/${course}/edit-batch`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body) });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

async function main() {
  const [mode, course, fragment] = process.argv.slice(2);
  if (!['plan', 'apply', 'verify'].includes(mode) || !course || !fragment) { console.error('usage: plan|apply|verify <course> <name-fragment>'); process.exit(2); }
  const d = await gather(course, fragment);
  console.log(`logins matching "${fragment}":`, d.users.map((u) => `${u.name} <${u.email}> ${u.role}`).join('; ') || 'NONE');
  const p = plan({ events: d.events, seeds: d.seeds, isPerson: personMatcher(d.users, fragment) });
  const by = {}; for (const x of p.notTheirs) by[x.by] = (by[x.by] || 0) + 1;
  console.log(JSON.stringify({ seeds: d.seeds.length, toApprove: p.approve.length, alreadyApproved: p.alreadyApproved.length,
    latestSaveByOthers: p.notTheirs.length, byWhom: by, neverSavedThroughLog: p.neverSaved.length, approvedNow: d.seeds.filter((s) => s.approved_at).length }));
  console.log('toApprove:', p.approve.join(','));
  if (mode === 'plan') return;
  if (mode === 'verify') {
    const set = new Set([...p.approve, ...p.alreadyApproved]);
    const bad = d.seeds.filter((s) => set.has(s.seed_number) && !s.approved_at).map((s) => s.seed_number);
    console.log(`VERIFY: ${set.size - bad.length}/${set.size} of the person's seeds approved; missing: ${bad.join(',') || 'none'}`); return;
  }
  if (!process.env.APPLY_CONFIRM) { console.error('set APPLY_CONFIRM=1 to apply'); process.exit(2); }
  const now = new Date().toISOString();
  const ops = p.approve.map((n) => ({ op: 'seed.update', seed_number: n, set: { approved_at: now } }));
  const dry = await call(course, { ops });
  console.log('dry run:', dry.status, JSON.stringify(dry.body).slice(0, 400));
  if (dry.status !== 200) process.exit(1);
  const done = await call(course, { ops, apply: true });
  console.log('apply:', done.status, JSON.stringify(done.body).slice(0, 600));
  if (done.status !== 200) process.exit(1);
}

module.exports = { latestTextSave, plan, SEED_TEXT_OPS };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
