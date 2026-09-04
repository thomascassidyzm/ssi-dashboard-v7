#!/usr/bin/env node
/**
 * CHECK 2 — TWO COUNTS THAT MUST AGREE, AND NOTHING THAT COMPARES THEM.
 *
 * 環 RBF, 2026-09-03, on finding 2,974 audio clips in a course with zero
 * practice phrases:
 *
 *     Clips-against-no-phrases is one specimen of a general shape — two counts
 *     that must agree and nothing that compares them. Tonight already produced
 *     another: phase8 refuses audio reuse when canon and pod counts disagree,
 *     which is the SAME reconciliation done right, in one place, by accident of
 *     someone caring. So the detector is not new machinery, it is generalising
 *     a check that already exists in one corner.
 *
 * The corner is `podCanonReuseTexts` in services/phases/phase8-audio-v13.cjs
 * (~line 7480): `if (sentences.length !== canon.length) return null` — all or
 * nothing on a length disagreement, deliberately. This is that shape, standing.
 *
 * READ-ONLY. It deletes nothing. `ara_sy_for_eng` with 2,974 orphan clips is a
 * FINDING; what to do about it is a separate, authorised decision.
 *
 * ── WHICH DIRECTION IS THE DEFECT, AND WHICH IS ORDINARY ────────────────────
 * A course mid-build has MORE content than audio. That direction is ordinary
 * and is already counted every night by tools/qa/audio-gap — this must not
 * duplicate it and does not. The direction that cannot be true is the other
 * one: AUDIO THAT NO CONTENT ROW CAN REACH. Audio is expensive and is rendered
 * FROM content, so a course holding clips its own content cannot account for
 * means one of the two counts is lying about what the course is.
 *
 * Three pairs, each one "these two must agree":
 *   content_zero  — a course with zero content rows and clips anyway. Nothing
 *                   can ever reach them; this is ara_sy_for_eng.
 *   unlinked      — clips in a course that no content FK points at. Some of
 *                   this is ordinary (superseded takes, pod tracks, drafts), so
 *                   it is reported as a RATIO and never as the headline: it is
 *                   the number that tells you where to look, not what is wrong.
 *   pod_canon     — listening_pod_sentences against canonical_pod_scenarios for
 *                   the same pod. phase8's own comparison, standing.
 *
 *   node tools/qa/voice-variety/count-reconciliation.cjs [--json FILE] [--quiet]
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../../../.env.psql') });
const fs = require('fs');
const { Client } = require('pg');

/** Every FK a content row uses to point at a clip. */
const LINKS = [
  ['course_seeds', ['known_audio_id', 'target1_audio_id', 'target2_audio_id']],
  ['course_legos', ['known_audio_id', 'target1_audio_id', 'target2_audio_id', 'presentation_audio_id']],
  ['course_practice_phrases', ['known_audio_id', 'target1_audio_id', 'target2_audio_id', 'presentation_audio_id']],
];

const linkedSql = () => `
  SELECT course_code, count(DISTINCT audio_id)::bigint AS linked FROM (
    ${LINKS.flatMap(([t, cols]) => cols.map((c) =>
      `SELECT course_code, ${c}${c === 'presentation_audio_id' ? '::uuid' : ''} AS audio_id FROM ${t} WHERE ${c} IS NOT NULL`)).join('\n    UNION ALL\n    ')}
  ) x GROUP BY 1`;

const CONTENT_SQL = `
  SELECT course_code,
         sum(seeds)::bigint AS seeds, sum(legos)::bigint AS legos, sum(phrases)::bigint AS phrases
    FROM (
      SELECT course_code, count(*) AS seeds, 0 AS legos, 0 AS phrases FROM course_seeds GROUP BY 1
      UNION ALL SELECT course_code, 0, count(*), 0 FROM course_legos GROUP BY 1
      UNION ALL SELECT course_code, 0, 0, count(*) FROM course_practice_phrases GROUP BY 1
    ) x GROUP BY 1`;

/**
 * ── WHY THE ROLE SPLIT IS NOT OPTIONAL ──────────────────────────────────────
 * Only four roles are ever pointed at by a content row. `welcome`,
 * `instruction`, `encouragement` and every `pod_*` role are reached by other
 * paths entirely and are UNLINKED BY DESIGN. Counting them convicted twenty
 * courses on the first run whose entire audio holding is one shared `welcome`
 * clip — the exact wall of false positives that gets a nightly ignored. So the
 * reconciliation is done on content-role clips, and the rest are counted
 * separately so nobody re-derives them and believes they are damage.
 */
const CONTENT_ROLES = Object.freeze(['known', 'target1', 'target2', 'presentation']);

const AUDIO_SQL = `
  SELECT course_code,
         count(*)::bigint AS clips,
         count(*) FILTER (WHERE role = ANY($1))::bigint AS content_clips
    FROM course_audio GROUP BY 1`;

/**
 * phase8's comparison, lifted out of the render path. A pod's sentence rows and
 * the canonical scenario rows it was built from must be the same length, and
 * the same global_order set — phase8 checks both before it will reuse a clip.
 */
const POD_SQL = `
  SELECT p.id AS pod_id, p.course_code, p.slug,
         coalesce(s.n, 0)::int AS pod_sentences,
         coalesce(c.n, 0)::int AS canon_rows
    FROM listening_pods p
    LEFT JOIN (SELECT pod_id, count(*) AS n FROM listening_pod_sentences GROUP BY 1) s ON s.pod_id = p.id
    LEFT JOIN (SELECT pod_slug, count(*) AS n FROM canonical_pod_scenarios GROUP BY 1) c ON c.pod_slug = p.slug
   WHERE coalesce(c.n, 0) > 0
   ORDER BY p.course_code, p.slug`;

async function load(db) {
  const [content, audio, linked, pods] = await Promise.all([
    db.query(CONTENT_SQL), db.query(AUDIO_SQL, [CONTENT_ROLES]), db.query(linkedSql()), db.query(POD_SQL),
  ]);
  return { content: content.rows, audio: audio.rows, linked: linked.rows, pods: pods.rows };
}

function assess({ content, audio, linked, pods }) {
  const byCourse = new Map();
  const row = (code) => {
    if (!byCourse.has(code)) byCourse.set(code, { course_code: code, seeds: 0, legos: 0, phrases: 0, clips: 0, content_clips: 0, linked: 0 });
    return byCourse.get(code);
  };
  for (const c of content) Object.assign(row(c.course_code), { seeds: +c.seeds, legos: +c.legos, phrases: +c.phrases });
  for (const a of audio) Object.assign(row(a.course_code), { clips: +a.clips, content_clips: +a.content_clips });
  for (const l of linked) row(l.course_code).linked = +l.linked;

  const courses = [...byCourse.values()].map((r) => ({
    ...r,
    content_rows: r.seeds + r.legos + r.phrases,
    unlinked: Math.max(0, r.content_clips - r.linked),
    other_role_clips: r.clips - r.content_clips,
  }));

  // THE HEADLINE. Content cannot reach these clips at all, in either direction:
  // there is no row to point at them and no row they could have come from.
  const contentZero = courses
    .filter((r) => r.content_rows === 0 && r.content_clips > 0)
    .sort((a, b) => b.content_clips - a.content_clips);

  // Content exists but nothing links: the two counts disagree about whether
  // this course has been wired up. A course that was never rendered has clips
  // 0 and is not here; a course with clips and zero links has audio that got
  // written and never attached.
  const linkedZero = courses
    .filter((r) => r.content_rows > 0 && r.content_clips > 0 && r.linked === 0)
    .sort((a, b) => b.content_clips - a.content_clips);

  const podMismatch = pods
    .filter((p) => p.pod_sentences !== p.canon_rows)
    .map((p) => ({ ...p, delta: p.pod_sentences - p.canon_rows }));

  return {
    courses: courses.sort((a, b) => a.course_code.localeCompare(b.course_code)),
    content_zero: contentZero,
    linked_zero: linkedZero,
    pod_mismatch: podMismatch,
    unlinked_top: courses.filter((r) => r.unlinked > 0).sort((a, b) => b.unlinked - a.unlinked).slice(0, 20),
  };
}

/**
 * The known positive: ara_sy_for_eng holds 2,974 clips against zero content
 * rows. A reconciliation that runs clean while that sits in the estate is a
 * broken reconciliation that would then be trusted nightly.
 */
function calibrate(result) {
  const hit = result.content_zero.find((r) => r.course_code === 'ara_sy_for_eng');
  console.log('CALIBRATION ara_sy_for_eng — clips against no content rows:');
  console.log(hit
    ? `  FIRES — ${hit.content_clips} content-role clips (${hit.clips} in total), ${hit.content_rows} content rows`
    : '  DOES NOT FIRE — the reconciliation is wrong');
  console.log('');
  return Boolean(hit);
}

async function main(argv = process.argv) {
  const args = argv.slice(2);
  const quiet = args.includes('--quiet');
  const db = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await db.connect();
  let data;
  try { data = await load(db); } finally { await db.end(); }

  const result = assess(data);
  const calOk = calibrate(result);
  if (!calOk) {
    console.error('Refusing to report estate numbers from an uncalibrated reconciliation.');
    process.exitCode = 2;
  }

  const failures = result.content_zero.length + result.linked_zero.length + result.pod_mismatch.length;
  const snapshot = {
    generated_at: new Date().toISOString(),
    calibrated: calOk,
    totals: {
      failures,
      content_zero: result.content_zero.length,
      content_zero_clips: result.content_zero.reduce((n, r) => n + r.content_clips, 0),
      linked_zero: result.linked_zero.length,
      pod_mismatch: result.pod_mismatch.length,
      courses: result.courses.length,
    },
    content_zero: result.content_zero,
    linked_zero: result.linked_zero,
    pod_mismatch: result.pod_mismatch,
    unlinked_top: result.unlinked_top,
  };

  const jsonAt = args.indexOf('--json');
  if (jsonAt !== -1 && args[jsonAt + 1]) fs.writeFileSync(args[jsonAt + 1], JSON.stringify(snapshot, null, 2));

  if (!quiet) {
    console.log(`COUNT-RECONCILIATION FAILURES: ${failures}`);
    console.log('');
    console.log(`Audio no content row can reach (${result.content_zero.length} courses, ${snapshot.totals.content_zero_clips} clips):`);
    for (const r of result.content_zero) console.log(`  ${r.course_code.padEnd(22)} ${String(r.content_clips).padStart(6)} content-role clips (${r.clips} total)   0 seeds, 0 legos, 0 phrases`);
    console.log('');
    console.log(`Content and audio both present, nothing linked (${result.linked_zero.length}):`);
    for (const r of result.linked_zero) console.log(`  ${r.course_code.padEnd(22)} ${String(r.content_clips).padStart(6)} content-role clips   ${r.content_rows} content rows, 0 links`);
    console.log('');
    console.log(`Pod against canon, phase8's own comparison (${result.pod_mismatch.length}):`);
    for (const p of result.pod_mismatch) console.log(`  ${String(p.course_code).padEnd(22)} ${String(p.slug).padEnd(18)} pod ${p.pod_sentences} vs canon ${p.canon_rows} (${p.delta > 0 ? '+' : ''}${p.delta})`);
  }
  return snapshot;
}

if (require.main === module) {
  main().catch((e) => { console.error(e.message); process.exit(2); });
} else {
  module.exports = { main, assess, calibrate, CONTENT_ROLES, CONTENT_SQL, AUDIO_SQL, POD_SQL, linkedSql };
}
