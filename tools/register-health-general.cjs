#!/usr/bin/env node
/**
 * REGISTER THE FIRST SECTOR SEGMENT — health, general role, against spa_for_eng.
 *
 * This is the write the cross-course union-ZUT gate has been waiting for: the
 * gate (services/course-builder/lib/course-family.cjs) has shipped armed and
 * INERT because `resolveCourseFamily` returned null for every course in
 * production — no registry row existed. This script writes the first one, and
 * that is what wakes the gate: from the moment it lands, a health-segment
 * submission is ZUT-checked against the whole spa_for_eng family, in both
 * directions, unbounded by the anchor.
 *
 * IDEMPOTENT: upsert on the primary key (sector_course_code). Re-running changes
 * nothing but updated_at. Prints the before and after rows.
 *
 * Run:  DRY=1 node tools/register-health-general.cjs   (prints, writes nothing)
 *       node tools/register-health-general.cjs         (writes)
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const envPsql = fs.readFileSync(path.join(__dirname, '..', '.env.psql'), 'utf8');
const DATABASE_URL = /DATABASE_URL\s*=\s*"?([^"\n]+)"?/.exec(envPsql)[1];

// The role map: the canonical health general seed set is HG01–HG57, 57 seeds,
// every one of them a turn a general health worker produces in the first person.
// Roles are DERIVED, never authored — a role is a projection of the one authored
// dialogue graph. Only `general` is authored, so only `general` is offered:
// listing nurse/doctor here would advertise projections of content that does not
// exist. general is a strict 100% subset of nurse, so nothing registered here is
// ever re-authored when nurse follows.
const ROLES = ['general'];
const ROLE_MAP = { general: Array.from({ length: 57 }, (_, i) => i + 1) };

const ROW = {
  base_course_code: 'spa_for_eng',
  sector_slug: 'health',
  sector_course_code: 'spa_health_for_eng',
  roles: JSON.stringify(ROLES),
  role_map: JSON.stringify(ROLE_MAP),
  // THE ANCHOR IS THE IMMEDIACY, so it is the first lego of the course.
  // The canonical set fixes the anchor functionally as "scene 0 complete plus
  // the Appendix A inventory owned". A read-only census on 2026-09-01
  // (docs/sector-pods/health-anchor-spa-for-eng-2026-09-01.md) found BOTH halves
  // of that contract unbindable in this pair today: scene 0 (W1201–W1204) does
  // not exist in the content tables under any course code, and spa_for_eng owns
  // 0/169 of Appendix A at seed 1, 3% at seed 13 and only 26% at seed 668 — the
  // curve never gets steep, so there is no later position that buys anything.
  // Waiting would cost exactly the immediacy the helix exists for, so the anchor
  // is the earliest lego in the course and the whole inventory is shortfall the
  // segment authors itself as is_new = true, which is what the canonical set
  // prescribes for anything a pair does not own by its anchor.
  core_anchor_lego_id: process.env.ANCHOR || 'S0001L01',
  // No health overlay pod exists for spa_for_eng (live listening_pods holds
  // pod-0/pod-1 core and music/travel-situations choice pods, nothing health).
  // A slug naming a pod that does not exist would be a lie the lap scheduler
  // would later act on, so this stays null until one is authored.
  sector_pod_slug: null,
  // DRAFT, deliberately. The segment has no content: the canonical seed set is
  // the English known side only and no pair overlay has been authored, so no
  // learner may be offered this walk. The endpoint serves only status='live',
  // so the modal's list stays honestly empty. The ZUT gate does NOT filter by
  // status — a gate that only wakes at 'live' arrives after the damage.
  status: 'draft',
};

(async () => {
  const c = new Client({ connectionString: DATABASE_URL });
  await c.connect();
  const before = (await c.query('select * from course_sectors order by sector_course_code')).rows;
  console.log('BEFORE course_sectors rows:', before.length);
  for (const r of before) console.log('  ', r.sector_course_code, r.status, r.core_anchor_lego_id);

  if (!ROW.core_anchor_lego_id) {
    console.log('\nNo ANCHOR set. The anchor IS the immediacy — refusing to register a segment with a null anchor.');
    process.exit(1);
  }
  const anchorExists = (await c.query(
    'select lego_id, known_text, target_text from course_legos where course_code=$1 and lego_id=$2',
    [ROW.base_course_code, ROW.core_anchor_lego_id])).rows[0];
  if (!anchorExists) {
    console.log(`\nANCHOR ${ROW.core_anchor_lego_id} does not exist in ${ROW.base_course_code}. Refusing.`);
    process.exit(1);
  }
  console.log(`\nanchor ${anchorExists.lego_id}: "${anchorExists.known_text}" → "${anchorExists.target_text}"`);

  if (process.env.DRY) { console.log('\nDRY=1 — nothing written.'); await c.end(); return; }

  await c.query(`insert into course_sectors
      (base_course_code, sector_slug, sector_course_code, roles, role_map, core_anchor_lego_id, sector_pod_slug, status)
    values ($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7,$8)
    on conflict (sector_course_code) do update set
      base_course_code = excluded.base_course_code,
      sector_slug = excluded.sector_slug,
      roles = excluded.roles,
      role_map = excluded.role_map,
      core_anchor_lego_id = excluded.core_anchor_lego_id,
      sector_pod_slug = excluded.sector_pod_slug,
      status = excluded.status,
      updated_at = now()`,
    [ROW.base_course_code, ROW.sector_slug, ROW.sector_course_code, ROW.roles, ROW.role_map,
     ROW.core_anchor_lego_id, ROW.sector_pod_slug, ROW.status]);

  const after = (await c.query('select * from course_sectors order by sector_course_code')).rows;
  console.log('\nAFTER course_sectors rows:', after.length);
  for (const r of after) console.log('  ', JSON.stringify(r));
  await c.end();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
