#!/usr/bin/env node
// tools/pods/retire-pod0-remnants-2026-09-13.cjs
//
// Follow-up to job #512 (pod-0 retired estate-wide). Tom's ruling: ZERO
// references to pod-0. Astra cold-check #525 found what #512 left behind in the
// production DB; none of it is learner-facing (Popty room, 2026-09-13), but the
// ruling is literal, so this finishes it:
//
//   (1) listening_pods: the 40 held parked rows (slugs `retired-<date>` /
//       `unrecorded` / `pod-1-staged-…`) whose TITLE still says "— Pod 0".
//       The title becomes "— pod-1" with the same history prefix/suffix, and
//       metadata.held_reason drops its "(only pod-0 and pod-1 are served)".
//   (2) recording_provenance for zzz_test_for_eng (the e2e TEST course, no
//       learner data): 12 notes whose pod_id is the never-existing
//       `zzz_test_for_eng-pod-0`, and 83 notes #512 rewrote to
//       `zzz_test_for_eng:pod-1`, which does not exist either — the course has
//       NO listening_pods row and NO course_audio row at all. These are
//       orphans of past e2e runs (e2e/pod-recording seeds and tears down its
//       own fixtures), so they are DELETED, not repointed: there is nothing to
//       point at.
//
// Gated: --dry-run prints the plan; --apply re-asserts each row's before-state
// inside the transaction and aborts on any drift. Every write is attributed
// via content_edit_events (serviceIdentity, same as the other tools/ sweeps).
//
//   node tools/pods/retire-pod0-remnants-2026-09-13.cjs --dry-run
//   node tools/pods/retire-pod0-remnants-2026-09-13.cjs --apply

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');

const APPLY = process.argv.includes('--apply');
const SURFACE = 'tools:pods/retire-pod0-remnants-2026-09-13';
const TITLE_RE = /\bPod 0\b/;
const HELD_OLD = 'no course serves this slug (only pod-0 and pod-1 are served)';
const HELD_NEW = 'no course serves this slug (only pod-1 is served)';

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  for (const p of [path.join(__dirname, '../../.env.psql'), path.join(process.env.HOME || '', 'SSi/ssi-dashboard-v7-clean/.env.psql')]) {
    if (!fs.existsSync(p)) continue;
    const m = fs.readFileSync(p, 'utf8').match(/^DATABASE_URL=(.+)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  }
  throw new Error('DATABASE_URL not found (.env.psql)');
}

function newTitle(title) {
  if (!TITLE_RE.test(title)) throw new Error(`title has no "Pod 0": ${title}`);
  return title.replace(TITLE_RE, 'pod-1');
}

async function main() {
  const identity = serviceIdentity(SURFACE);
  const db = new Client({ connectionString: loadDatabaseUrl() });
  await db.connect();
  try {
    await db.query('BEGIN');

    // ── (1) titles ──────────────────────────────────────────────────────────
    const { rows: pods } = await db.query(
      `SELECT id, course_code, title, visibility, metadata->>'held_reason' AS held_reason
         FROM listening_pods WHERE title ~* 'pod[-_ ]?0' ORDER BY id`);
    const plan = pods.map(p => ({
      id: p.id, course_code: p.course_code, visibility: p.visibility,
      before: p.title, after: newTitle(p.title),
      held_before: p.held_reason,
      held_after: p.held_reason && p.held_reason.includes(HELD_OLD) ? p.held_reason.replace(HELD_OLD, HELD_NEW) : p.held_reason,
    }));
    for (const p of plan) {
      if (p.visibility !== 'held') throw new Error(`refusing: ${p.id} is ${p.visibility}, expected held`);
      if (/pod[-_ ]?0/i.test(p.after) || (p.held_after && /pod[-_ ]?0/i.test(p.held_after))) throw new Error(`still says pod-0 after rewrite: ${p.id}`);
    }

    // ── (2) zzz_test_for_eng provenance orphans ─────────────────────────────
    const { rows: prov } = await db.query(
      `SELECT audio_uuid, quality_notes::jsonb->>'pod_id' AS pod_id
         FROM recording_provenance rp
        WHERE quality_notes::jsonb->>'course_code' = 'zzz_test_for_eng'
          AND quality_notes::jsonb->>'mode' = 'pod'
          AND (quality_notes::text LIKE '%pod-0%' OR quality_notes::text LIKE '%zzz_test_for_eng:pod-1%')
          AND NOT EXISTS (SELECT 1 FROM course_audio ca WHERE ca.id::text = rp.audio_uuid)
          AND NOT EXISTS (SELECT 1 FROM listening_pods lp WHERE lp.id = quality_notes::jsonb->>'pod_id')`);
    const { rows: [{ n: zzzPods }] } = await db.query(`SELECT count(*)::int AS n FROM listening_pods WHERE course_code='zzz_test_for_eng'`);
    if (Number(zzzPods) !== 0) throw new Error(`zzz_test_for_eng now has ${zzzPods} listening_pods rows — repoint instead of delete; re-read before applying`);

    console.log(`[${APPLY ? 'APPLY' : 'DRY-RUN'}] titles to rewrite: ${plan.length}`);
    for (const p of plan) console.log(`  ${p.id}\n    - ${p.before}\n    + ${p.after}`);
    console.log(`[${APPLY ? 'APPLY' : 'DRY-RUN'}] zzz_test_for_eng provenance orphans to delete: ${prov.length}`
      + ` (pod-0: ${prov.filter(r => /pod-0/.test(r.pod_id)).length}, :pod-1 dangling: ${prov.filter(r => /:pod-1/.test(r.pod_id)).length})`);

    if (!APPLY) { await db.query('ROLLBACK'); return; }

    let titlesDone = 0;
    for (const p of plan) {
      const { rows: [ev] } = await db.query(
        `INSERT INTO content_edit_events (course_code, surface, operation, actor_kind, actor_id, actor_label, actor_verified, scope, detail)
         VALUES ($1,$2,'update',$3,$4,$5,$6,$7,$8) RETURNING id`,
        [p.course_code, SURFACE, identity.kind, identity.id, identity.label, identity.verified,
         { rows: [p.id], table: 'listening_pods' },
         { title_before: p.before, title_after: p.after, held_reason_changed: p.held_after !== p.held_before, ruling: 'Tom 2026-09-13: zero references to pod-0' }]);
      const res = await db.query(
        `UPDATE listening_pods
            SET title = $2,
                metadata = CASE WHEN $4::text IS NULL THEN metadata ELSE jsonb_set(metadata, '{held_reason}', to_jsonb($4::text)) END
                           || jsonb_build_object('pod0_title_retired_by', $5::text)
          WHERE id = $1 AND title = $3 AND visibility = 'held'`,
        [p.id, p.after, p.before, p.held_after === p.held_before ? null : p.held_after, ev.id]);
      if (res.rowCount !== 1) throw new Error(`drift: ${p.id} before-state changed, aborting (rowCount=${res.rowCount})`);
      titlesDone++;
    }

    const { rows: [ev2] } = await db.query(
      `INSERT INTO content_edit_events (course_code, surface, operation, actor_kind, actor_id, actor_label, actor_verified, scope, detail)
       VALUES ('zzz_test_for_eng',$1,'delete',$2,$3,$4,$5,$6,$7) RETURNING id`,
      [SURFACE, identity.kind, identity.id, identity.label, identity.verified,
       { table: 'recording_provenance', rows: prov.map(r => r.audio_uuid) },
       { reason: 'orphan e2e provenance: pod row and course_audio row both absent; nothing to repoint to', pod_ids: [...new Set(prov.map(r => r.pod_id))] }]);
    const del = await db.query(
      `DELETE FROM recording_provenance rp WHERE audio_uuid = ANY($1)
          AND NOT EXISTS (SELECT 1 FROM course_audio ca WHERE ca.id::text = rp.audio_uuid)`, [prov.map(r => r.audio_uuid)]);
    if (del.rowCount !== prov.length) throw new Error(`drift: expected ${prov.length} provenance deletes, got ${del.rowCount}; aborting`);

    await db.query('COMMIT');
    console.log(`applied: ${titlesDone} titles rewritten, ${del.rowCount} provenance rows deleted (events: ${plan.length}+1 → ${ev2.id})`);
  } catch (e) {
    await db.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    await db.end();
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
