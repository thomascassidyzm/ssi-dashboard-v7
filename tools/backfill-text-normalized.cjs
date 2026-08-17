#!/usr/bin/env node
/**
 * Backfill course_audio.text_normalized — the open item 20260806_audio_link_integrity.sql
 * recorded and deliberately left alone.
 *
 * ── WHY THE COLUMN IS STALE ─────────────────────────────────────────────────
 *
 * text_normalized is written by the audio_normalize_text trigger, which calls
 * normalize_text(). normalize_text() was REDEFINED to rtrim trailing '.?!¿¡。？！'
 * and the existing column was never backfilled. So a large number of rows hold a
 * text_normalized the current normaliser would not produce.
 *
 * That matters because text_normalized is what audio_id_for_text() and
 * link_audio_to_content() match on. On a stale row those functions are blind:
 * a clip that speaks exactly the right words looks like a clip for different
 * words. (The 2026-08-17 seed and phrase triggers work around it by ALSO testing
 * normalize_text(text) — that workaround stays; this backfill removes the need
 * for it to carry the whole load.)
 *
 * ── WHY IT WAS LEFT ALONE, AND THE RULE THIS TOOL FOLLOWS ───────────────────
 *
 * text_normalized feeds UNIQUE (course_code, text_normalized, language, role,
 * voice_id). Rewriting it can COLLIDE: two rows that differ today only by a
 * trailing '?' become indistinguishable once normalised.
 *
 * A collision is not a data-cleaning problem, it is a judgement call with
 * learner-audible consequences — which of two clips is canon. So this tool
 * NEVER resolves one. It backfills every non-colliding row and leaves every
 * colliding row exactly as it is, then hands the collision list over.
 *
 * It changes ONE column. It does not touch text, s3_key, voice_id, or any
 * *_audio_id link on any content table — and it proves that rather than
 * asserting it, by counting the links on all three content tables before and
 * after and refusing to commit a batch if any moved.
 *
 * ── USAGE ───────────────────────────────────────────────────────────────────
 *
 *   node tools/backfill-text-normalized.cjs --measure
 *       Count the stale rows and the collisions. Writes nothing. Start here.
 *
 *   node tools/backfill-text-normalized.cjs --course <code>
 *       Dry run for one course: what would change, and what would collide.
 *
 *   node tools/backfill-text-normalized.cjs --course <code> --commit
 *       Backfill that one course, in batches, verifying links after each.
 *
 *   node tools/backfill-text-normalized.cjs --all --commit
 *       Estate-wide, course by course, smallest first. Only after one course
 *       has been done and verified.
 *
 *   --batch N        rows per statement (default 500)
 *   --json <path>    write the full machine-readable report, collisions included
 *
 * No TTS. No deletes. No link writes.
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const REPO = path.resolve(__dirname, '..');
const BATCH_DEFAULT = 500;

function args(argv) {
  const a = {};
  for (let i = 2; i < argv.length; i++) {
    const t = argv[i];
    if (!t.startsWith('--')) continue;
    const k = t.slice(2);
    const v = argv[i + 1];
    if (v && !v.startsWith('--')) { a[k] = v; i++; } else a[k] = true;
  }
  return a;
}

function databaseUrl() {
  const p = path.join(REPO, '.env.psql');
  const m = fs.readFileSync(p, 'utf8').match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/);
  if (!m) throw new Error(`No DATABASE_URL in ${p}`);
  return m[1];
}

const q = async (c, sql, params = []) => (await c.query(sql, params)).rows;

// ── The stale set ────────────────────────────────────────────────────────────
// "Stale" is defined against the LIVE normalize_text(), not against a guess at
// what the old one did. A row is stale iff re-running the current normaliser on
// its real text would produce a different value from the one stored.
const STALE_PREDICATE = `text_normalized IS DISTINCT FROM normalize_text(text)`;

async function measure(c) {
  const total = (await q(c, `SELECT count(*)::bigint n FROM course_audio`))[0].n;
  const stale = (await q(c, `SELECT count(*)::bigint n FROM course_audio WHERE ${STALE_PREDICATE}`))[0].n;
  const byCourse = await q(c, `
    SELECT course_code, count(*)::int n
      FROM course_audio WHERE ${STALE_PREDICATE}
     GROUP BY 1 ORDER BY 2 ASC`);
  return { total: Number(total), stale: Number(stale), by_course: byCourse };
}

/**
 * Which stale rows would violate UNIQUE (course_code, text_normalized, language,
 * role, voice_id) once normalised.
 *
 * TWO ways to collide, and both are counted:
 *   (a) against a row that is ALREADY at its normalised value (stale row lands
 *       on top of a clean one);
 *   (b) against ANOTHER STALE ROW in the same batch (two rows both normalising
 *       to the same key). Missing (b) is the classic version of this bug — the
 *       first row writes fine and the second fails mid-batch.
 *
 * Computed as one query over the post-normalisation key space, so it cannot
 * disagree with what the UPDATE would actually do.
 *
 * CONSERVATIVE ON NULLS, deliberately. A plain UNIQUE index in Postgres treats
 * NULLs as distinct, so two rows with a NULL voice_id do NOT actually collide —
 * but PARTITION BY groups them together, so this reports them as if they did.
 * The error therefore only ever runs one way: it leaves a row alone that could
 * safely have been backfilled. Over-reporting a collision costs a row of
 * hygiene; under-reporting one costs a failed batch mid-run.
 */
async function collisions(c, courseFilter) {
  const where = courseFilter ? `AND course_code = $1` : '';
  const params = courseFilter ? [courseFilter] : [];
  return q(c, `
    WITH proposed AS (
      SELECT id, course_code, text, text_normalized AS stored,
             normalize_text(text) AS proposed_norm,
             language, role, voice_id,
             (${STALE_PREDICATE}) AS is_stale
        FROM course_audio
       WHERE true ${where}
    ),
    keyed AS (
      SELECT *, count(*) OVER (
               PARTITION BY course_code, proposed_norm, language, role, voice_id
             ) AS peers
        FROM proposed
    )
    SELECT id, course_code, text, stored, proposed_norm, language, role, voice_id, peers
      FROM keyed
     WHERE is_stale AND peers > 1
     ORDER BY course_code, proposed_norm, id
  `, params);
}

// Links on all three content tables, FOR ONE COURSE. If the backfill is what it
// claims to be — one fingerprint column — not one of these numbers may move.
//
// ── WHY THIS IS SCOPED TO A COURSE AND NOT THE ESTATE ───────────────────────
//
// It was estate-wide, and that made it unusable: it reports "AUDIO LINKS MOVED"
// whenever ANY other agent writes a link ANYWHERE during the run, which on this
// estate is most of the time. Observed for real on 2026-08-17: a fin_for_eng
// backfill aborted on `course_practice_phrases`, and the audit log showed the
// mover was a concurrent audio-linking campaign on spa_mx_for_eng / eng_for_mar /
// eng_for_por / fra_ca_for_eng — 146 UPDATEs, 141 of them moving target1_audio_id,
// and `text_changed = 0`. Nothing to do with the backfill, which had touched no
// content row in any course at all.
//
// A check that cries wolf on other people's legitimate work does not add safety;
// it trains the operator to pass --force. Scoping it loses NO real detection
// power, because the backfill's write is
// `UPDATE course_audio SET text = text WHERE id = ANY(<ids all from one course>)`
// and the only triggers that fire on a course_audio UPDATE are
// trg_course_audio_normalize (the intended one), course_audio_audit and
// course_audio_touch_content_stamp. None of them writes an audio_id on any
// content table, and audio_autolink — the one that does — is AFTER INSERT only.
// So a link this backfill could move would have to be in the course it is
// touching, which is exactly what is still checked.
async function linkFingerprint(c, course) {
  const rows = await q(c, `
    SELECT 'course_seeds' AS t,
           count(known_audio_id)::bigint k, count(target1_audio_id)::bigint t1,
           count(target2_audio_id)::bigint t2,
           coalesce(md5(string_agg(
             coalesce(known_audio_id::text,'') || coalesce(target1_audio_id::text,'') ||
             coalesce(target2_audio_id::text,''), '|' ORDER BY id)), '') AS digest
      FROM course_seeds WHERE course_code = $1
    UNION ALL
    SELECT 'course_legos',
           count(known_audio_id), count(target1_audio_id), count(target2_audio_id),
           coalesce(md5(string_agg(
             coalesce(known_audio_id::text,'') || coalesce(target1_audio_id::text,'') ||
             coalesce(target2_audio_id::text,'') || coalesce(presentation_audio_id,''), '|' ORDER BY id)), '')
      FROM course_legos WHERE course_code = $1
    UNION ALL
    SELECT 'course_practice_phrases',
           count(known_audio_id), count(target1_audio_id), count(target2_audio_id),
           coalesce(md5(string_agg(
             coalesce(known_audio_id::text,'') || coalesce(target1_audio_id::text,'') ||
             coalesce(target2_audio_id::text,''), '|' ORDER BY id)), '')
      FROM course_practice_phrases WHERE course_code = $1
  `, [course]);
  return Object.fromEntries(rows.map(r => [r.t, r.digest + ':' + r.k + '/' + r.t1 + '/' + r.t2]));
}

/**
 * Backfill one course, in batches, inside ONE transaction per batch.
 *
 * Colliding ids are excluded explicitly rather than filtered by a NOT EXISTS in
 * the UPDATE: an exclusion list computed up-front is auditable and is the same
 * list handed to Kai, whereas an inline filter would silently do something
 * slightly different from what was reported.
 */
async function backfillCourse(c, course, { batch, commit, excludeIds }) {
  const exclude = new Set(excludeIds.map(String));
  const targets = (await q(c, `
    SELECT id FROM course_audio WHERE course_code=$1 AND ${STALE_PREDICATE} ORDER BY id`, [course]))
    .map(r => r.id).filter(id => !exclude.has(String(id)));

  const result = { course, eligible: targets.length, updated: 0, skipped_colliding: 0, batches: 0 };
  result.skipped_colliding = excludeIds.filter(Boolean).length;
  if (!commit || !targets.length) return result;

  const before = await linkFingerprint(c, course);

  for (let i = 0; i < targets.length; i += batch) {
    const slice = targets.slice(i, i + batch);
    await c.query('BEGIN');
    try {
      // The trigger recomputes text_normalized on write, so touching the row is
      // enough — writing the value by hand would be a second implementation of
      // the normaliser and could drift from it. `text = text` is a real UPDATE
      // to Postgres and fires trg_course_audio_normalize.
      const r = await c.query(
        `UPDATE course_audio SET text = text WHERE id = ANY($1::uuid[])`, [slice]);
      const still = (await q(c,
        `SELECT count(*)::int n FROM course_audio WHERE id = ANY($1::uuid[]) AND ${STALE_PREDICATE}`,
        [slice]))[0].n;
      if (still !== 0) throw new Error(`${still} of ${slice.length} rows still stale after update — the trigger did not fire`);
      await c.query('COMMIT');
      result.updated += r.rowCount;
      result.batches += 1;
      process.stdout.write(`\r    ${course}: ${result.updated}/${targets.length}   `);
    } catch (e) {
      await c.query('ROLLBACK');
      throw new Error(`batch at offset ${i} rolled back: ${e.message}`);
    }
  }
  process.stdout.write('\n');

  // The claim "no learner impact" is proved here, not asserted.
  const after = await linkFingerprint(c, course);
  const moved = Object.keys(before).filter(k => before[k] !== after[k]);
  result.links_moved = moved;
  if (moved.length) {
    throw new Error(`AUDIO LINKS MOVED on ${moved.join(', ')} — this backfill was supposed to touch one fingerprint column. Stop and investigate; earlier batches are already committed.`);
  }
  return result;
}

(async () => {
  const a = args(process.argv);
  const batch = Number(a.batch || BATCH_DEFAULT);
  const commit = !!a.commit;
  const c = new Client({ connectionString: databaseUrl(), ssl: { rejectUnauthorized: false } });
  await c.connect();
  // The link fingerprint md5-aggregates three whole content tables, and the
  // stale predicate re-runs normalize_text() over 2.5M course_audio rows. Both
  // blow the server's default statement_timeout — observed for real on the first
  // --commit run (tur_for_eng, 2026-08-17): every batch committed and then the
  // AFTER fingerprint was cancelled, leaving the run reported as FAILED with the
  // writes already done. A read that proves safety must not be the thing that
  // times out.
  await c.query(`SET statement_timeout = '1800s'`);
  const report = { tool: 'backfill-text-normalized', generated_at: new Date().toISOString(), commit };
  try {
    console.log('\n  Measuring against the LIVE normalize_text() — not against a remembered number.\n');
    const m = await measure(c);
    report.measured = { total_rows: m.total, stale_rows: m.stale };
    console.log(`  course_audio rows:      ${m.total.toLocaleString()}`);
    console.log(`  STALE text_normalized:  ${m.stale.toLocaleString()}  (${(100 * m.stale / m.total).toFixed(2)}%)`);
    console.log(`  courses affected:       ${m.by_course.length}\n`);

    const scope = a.course && a.course !== true ? String(a.course) : null;
    const col = await collisions(c, scope);
    report.collisions = col;
    console.log(`  COLLISIONS under UNIQUE (course_code, text_normalized, language, role, voice_id): ${col.length}`);
    if (col.length) {
      const byCourse = {};
      for (const r of col) byCourse[r.course_code] = (byCourse[r.course_code] || 0) + 1;
      for (const [k, v] of Object.entries(byCourse).sort((x, y) => y[1] - x[1]).slice(0, 15)) {
        console.log(`      ${k.padEnd(24)} ${v}`);
      }
      console.log('  These are LEFT UNTOUCHED. Which of two indistinguishable clips is canon is a');
      console.log('  judgement call with learner-audible consequences, not a cleaning step.\n');
    } else {
      console.log('  none — every stale row can be normalised without a clash.\n');
    }

    if (a.measure) {
      report.mode = 'measure';
    } else {
      const courses = scope ? [scope]
        : a.all ? m.by_course.map(r => r.course_code)     // smallest first, by construction
        : null;
      if (!courses) {
        console.log('  No --course or --all given. Nothing was written.');
        console.log('  Smallest affected courses, a sensible place to start:');
        for (const r of m.by_course.slice(0, 8)) console.log(`      ${r.course_code.padEnd(24)} ${r.n}`);
        console.log('');
        report.mode = 'measure-only';
      } else {
        report.mode = commit ? 'backfill' : 'dry-run';
        report.courses = [];
        for (const course of courses) {
          const excludeIds = col.filter(r => r.course_code === course).map(r => r.id);
          const r = await backfillCourse(c, course, { batch, commit, excludeIds });
          report.courses.push(r);
          console.log(`  ${course}: ${commit ? `${r.updated} backfilled` : `${r.eligible} would be backfilled`}` +
            `, ${r.skipped_colliding} left alone (colliding)` +
            (r.links_moved ? `, links moved: ${r.links_moved.length ? r.links_moved.join(',') : 'none'}` : ''));
        }
        if (commit) {
          const post = await measure(c);
          report.remaining_stale = post.stale;
          console.log(`\n  stale rows remaining estate-wide: ${post.stale.toLocaleString()}`);
        }
      }
    }
  } catch (err) {
    report.error = err.message;
    console.error(`\n  BACKFILL FAILED: ${err.message}\n`);
    process.exitCode = 2;
  } finally {
    await c.end();
    if (a.json && a.json !== true) {
      fs.writeFileSync(a.json, JSON.stringify(report, null, 2));
      console.error(`  JSON report → ${a.json}`);
    }
  }
})();
