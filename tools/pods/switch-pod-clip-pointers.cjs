#!/usr/bin/env node
'use strict';
// Switch a live pod's clip pointers onto a re-recorded set, in ONE transaction, with a rollback file (job #938, 2026-09-30).
//
// WHY. Italian Pod 1 was re-recorded whole in two Cartesia voices (Tom 14:35Z: "regenerate the whole pod and make all
// the cuts so it solves the Aran drill problem as well"): one take per turn, per-sentence clips and the Drill's joined
// clips CUT from that take. The new clips are built and verified first; this tool is the moment the learner hears
// them. It is make-before-break by construction: it refuses unless every clip the plan points at already exists in
// course_audio, and it deletes nothing — the old clips stay in S3 and in course_audio, so the rollback file (the exact
// before-state of every row it touches) puts the pod back byte for byte.
//
// NOT A CONTENT MIGRATION. Learner progress is filed under a sentence's SLOT (learner_pod_state), and the app numbers a
// turn's sentences from its clip COUNT (podSentenceSplit.splitRowUnits). So the one invariant a re-record must keep is
// that every row keeps the same number of per-sentence clips (split stays split with the same count, unsplit stays
// unsplit). planProblems() refuses any plan that breaks it — that change needs tools/pods/pod-switchover.cjs, not this.
// A target_text change is allowed only as a small in-sentence edit (same sentence count): the pod's
// one-text-per-language trigger then carries it to the language canon and to every canonical-bound sibling pod
// (Tom's hard rule 2026-09-20), in this same transaction.
//
// PLAN FILE (JSON): { podId, jobLabel, speakers?: {before, after}, rows: [{ id, before: {fields}, after: {fields} }] }
// where fields ⊆ SWITCHABLE. Every row's current DB value must equal `before` for every field (drift → nothing written).
//
//   node tools/pods/switch-pod-clip-pointers.cjs <plan.json>                    # dry run: checks, prints the plan
//   node tools/pods/switch-pod-clip-pointers.cjs <plan.json> --apply            # writes rollback file, then switches
//   node tools/pods/switch-pod-clip-pointers.cjs <rollback.json> --apply        # a rollback file IS a plan (before/after swapped)
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });

const SWITCHABLE = ['target_text', 'target_audio_id', 'sentence_audio_ids', 'takeg_audio_ids', 'atom_map_fine'];
const JSONB = new Set(['atom_map_fine']);
const UUID_ARRAYS = new Set(['sentence_audio_ids', 'takeg_audio_ids']);
const BOUNDARY = /(?<=[.!?])\s+/; // the player's POD_SENTENCE_BOUNDARY
const sentenceCount = (t) => String(t || '').split(BOUNDARY).map((s) => s.trim()).filter(Boolean).length;
const clipCount = (ids) => (Array.isArray(ids) ? ids.filter(Boolean).length : 0);

/** Every clip id a set of fields points at. */
function clipIdsOf(fields) {
  const ids = [];
  if (fields.target_audio_id) ids.push(fields.target_audio_id);
  for (const k of UUID_ARRAYS) for (const id of fields[k] || []) if (id) ids.push(id);
  return ids;
}

/** Pure: what is wrong with a plan (empty = fine). `existing` = Set of course_audio ids that exist. */
function planProblems(plan, existing) {
  const out = [];
  if (!plan || !plan.podId || !Array.isArray(plan.rows) || !plan.rows.length) return ['plan needs podId and rows'];
  const seen = new Set();
  for (const r of plan.rows) {
    const tag = `row ${r.id}`;
    if (seen.has(r.id)) out.push(`${tag}: listed twice`);
    seen.add(r.id);
    const keys = Object.keys(r.after || {});
    for (const k of keys) {
      if (!SWITCHABLE.includes(k)) out.push(`${tag}: field ${k} is not switchable here`);
      if (!(k in (r.before || {}))) out.push(`${tag}: after.${k} has no before.${k} to check against`);
    }
    // THE SLOT INVARIANT: the unit count a learner's progress is filed under never moves.
    if ('sentence_audio_ids' in r.after) {
      const b = clipCount(r.before.sentence_audio_ids), a = clipCount(r.after.sentence_audio_ids);
      const unitsBefore = b >= 2 ? b : 1, unitsAfter = a >= 2 ? a : 1;
      if (unitsBefore !== unitsAfter) out.push(`${tag}: per-sentence units ${unitsBefore} → ${unitsAfter} moves learner slots — use pod-switchover.cjs`);
    }
    if ('target_text' in r.after && sentenceCount(r.after.target_text) !== sentenceCount(r.before.target_text)) {
      out.push(`${tag}: target_text changes its sentence count — that is a content change, not a re-record`);
    }
    if (existing) for (const id of clipIdsOf(r.after)) if (!existing.has(id)) out.push(`${tag}: clip ${id} does not exist — build before you switch`);
  }
  return out;
}

/** A rollback plan is the applied plan with before/after swapped (the after-state becomes the drift check). */
const invert = (plan) => ({
  ...plan, rollbackOf: plan.jobLabel,
  speakers: plan.speakers ? { before: plan.speakers.after, after: plan.speakers.before } : undefined,
  rows: plan.rows.map((r) => ({ id: r.id, before: r.after, after: r.before })),
});

/** Key-order-free JSON: Postgres jsonb hands objects back with its own key order, so a plan written from JS and the
 *  row read back from the database must be compared on content, never on the order of their keys. */
const canon = (v) => (Array.isArray(v) ? `[${v.map(canon).join(',')}]`
  : v && typeof v === 'object' ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canon(v[k])}`).join(',')}}`
  : JSON.stringify(v ?? null));
const same = (k, a, b) => canon(a) === canon(b);

async function main() {
  const file = process.argv[2];
  const apply = process.argv.includes('--apply');
  if (!file) { console.error('usage: switch-pod-clip-pointers.cjs <plan.json> [--apply]'); process.exit(1); }
  const plan = JSON.parse(fs.readFileSync(file, 'utf8'));
  const { Client } = require('pg');
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  const allIds = [...new Set(plan.rows.flatMap((r) => clipIdsOf(r.after || {})))];
  const { rows: found } = await pg.query('select id::text from course_audio where id = any($1::uuid[])', [allIds]);
  const problems = planProblems(plan, new Set(found.map((f) => f.id)));
  const { rows: cur } = await pg.query(`select id, pod_id, ${SWITCHABLE.join(', ')} from listening_pod_sentences where id = any($1::text[])`, [plan.rows.map((r) => r.id)]);
  const byId = new Map(cur.map((c) => [c.id, c]));
  for (const r of plan.rows) {
    const c = byId.get(r.id);
    if (!c) { problems.push(`row ${r.id}: not in the database`); continue; }
    if (c.pod_id !== plan.podId) problems.push(`row ${r.id}: belongs to ${c.pod_id}, plan is for ${plan.podId}`);
    for (const k of Object.keys(r.after)) if (!same(k, c[k], r.before[k])) problems.push(`row ${r.id}: ${k} drifted since planning`);
  }
  if (plan.speakers) {
    const { rows: [p] } = await pg.query('select speakers from listening_pods where id = $1', [plan.podId]);
    if (!p || !same('speakers', p.speakers, plan.speakers.before)) problems.push('listening_pods.speakers drifted since planning');
  }
  const changed = plan.rows.map((r) => Object.keys(r.after).filter((k) => !same(k, r.before[k], r.after[k]))).flat();
  const tally = changed.reduce((m, k) => (m[k] = (m[k] || 0) + 1, m), {});
  console.log(`${plan.podId}: ${plan.rows.length} rows, ${allIds.length} clips (all exist: ${found.length === allIds.length}); fields changing: ${JSON.stringify(tally)}${plan.speakers ? '; speakers cast updated' : ''}`);
  if (problems.length) { console.error(`REFUSED — ${problems.length} problem(s):\n  ${problems.slice(0, 40).join('\n  ')}`); await pg.end(); process.exit(2); }
  if (!apply) { console.log('dry run clean — pass --apply to switch'); await pg.end(); return; }

  const rollbackPath = file.replace(/\.json$/, '') + `.rollback-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  fs.writeFileSync(rollbackPath, JSON.stringify(invert(plan), null, 1));
  console.log(`rollback file written first: ${rollbackPath}`);

  const { createClient } = require('@supabase/supabase-js');
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const course = plan.podId.split(':')[0];
  await recordContentEdit(sb, {
    identity: serviceIdentity('switch-pod-clip-pointers', { role: 'content-sweep' }),
    courseCode: course, surface: 'tools/pods/switch-pod-clip-pointers.cjs', operation: plan.rollbackOf ? 'pod-clip-pointer-rollback' : 'pod-clip-pointer-switch',
    scope: { rows: plan.rows.length, pod_id: plan.podId },
    detail: { job: plan.jobLabel || null, rollbackOf: plan.rollbackOf || null, rollbackFile: rollbackPath, fields: tally },
  });

  await pg.query('begin');
  try {
    for (const r of plan.rows) {
      const keys = Object.keys(r.after);
      const cast = (k) => (JSONB.has(k) ? '::jsonb' : UUID_ARRAYS.has(k) ? '::uuid[]' : k === 'target_audio_id' ? '::uuid' : '');
      const val = (k, v) => (JSONB.has(k) ? (v == null ? null : JSON.stringify(v)) : v);
      const params = [r.id];
      const sets = keys.map((k) => { params.push(val(k, r.after[k])); return `${k} = $${params.length}${cast(k)}`; });
      const guards = keys.map((k) => { params.push(val(k, r.before[k])); return `${k} is not distinct from $${params.length}${cast(k)}`; });
      const res = await pg.query(`update listening_pod_sentences set ${sets.join(', ')}, updated_at = now() where id = $1 and ${guards.join(' and ')}`, params);
      if (res.rowCount !== 1) throw new Error(`row ${r.id} changed under the switch — rolled back, nothing written`);
    }
    if (plan.speakers) {
      const res = await pg.query('update listening_pods set speakers = $2::jsonb, updated_at = now() where id = $1 and speakers = $3::jsonb', // jsonb = jsonb is order-free
        [plan.podId, JSON.stringify(plan.speakers.after), JSON.stringify(plan.speakers.before)]);
      if (res.rowCount !== 1) throw new Error('listening_pods.speakers changed under the switch — rolled back');
    }
    await pg.query('commit');
    console.log(`switched: ${plan.rows.length} rows of ${plan.podId} in one transaction`);
  } catch (e) {
    await pg.query('rollback');
    console.error(`ROLLED BACK: ${e.message}`);
    process.exitCode = 2;
  }
  await pg.end();
}

module.exports = { planProblems, invert, clipIdsOf, sentenceCount, same, SWITCHABLE };

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
