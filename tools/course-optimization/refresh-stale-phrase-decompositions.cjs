#!/usr/bin/env node
// Refresh course_practice_phrases.decomposition rows whose stored per-word
// KNOWN glosses no longer describe the LEGO they are bound to.
//
// Why this exists (Deborah's eus_for_eng report, 2026-08-12):
//   The decomposition is computed ONCE at phrase-write time and stored. Each
//   block is bound to a lego_id SLOT (S0006L02) and carries the gloss that
//   slot held at that moment. When the LEGO in that slot is later re-authored
//   or re-indexed, the frozen gloss stays put and now labels a different word.
//   The player renders those stored `known` strings VERBATIM
//   (LearningPlayer.vue "Strategy 0 (authoritative)"), so the wrong gloss goes
//   straight to the learner.
//
//   Worked example — eus_for_eng seed 6. The stored decomposition of
//   "hitz bat esan nahi dut" still splits the LEGO "hitz bat" into
//   hitz -> S0006L01 and bat -> S0006L02, because at write time those slots
//   held hitz='word' and bat='a'. They now hold hitzak='words' and
//   hitz bat='a word'. Seed 30 is worse: the slots shifted by one, so
//   S0030L01 blocks are glossed 'yesterday' while that slot now holds
//   'to ask'.
//
// Why the existing drift detector misses it:
//   /api/admin/decomposition-audit and /api/admin/decomposition-backfill key
//   staleness off `decomposition_course_version < courses.version`. Only
//   178,018 of 613,801 decomposed phrases estate-wide carry that stamp at all
//   (29%); a NULL stamp fails the `<` test, so 71% of decompositions are
//   invisible to it. eus_for_eng reports 49 stale by that key; by content it
//   is 502 phrases / 543 blocks.
//
// So this tool keys staleness off CONTENT, not the version stamp: a block is
// stale when its stored `known` disagrees with the CURRENT known_text of the
// lego_id it names. It then recomputes with decomposeAnchored (the salient-
// anchored decomposer), which the version-keyed backfill does not use — that
// one calls plain decomposeText and so cannot restore a lost salient anchor.
//
// Scope of the write: the `decomposition` and `decomposition_course_version`
// columns ONLY. No phrase text, no LEGO, no audio row is touched, so nothing
// here can orphan a clip.
//
// Usage:
//   node tools/course-optimization/refresh-stale-phrase-decompositions.cjs --course=eus_for_eng
//   node tools/course-optimization/refresh-stale-phrase-decompositions.cjs --course=eus_for_eng --apply
//   node tools/course-optimization/refresh-stale-phrase-decompositions.cjs --all
//   ... --limit=50   cap rows considered (shakedown runs)
//   ... --out=<dir>  where the log JSON lands (default docs/decomposition-refresh-2026-08-12)
//
// Dry run is the DEFAULT. --apply is required to write.
//
// Every applied row's pre-write decomposition is kept verbatim in the log, so
// an apply is fully reversible:
//   node tools/course-optimization/refresh-stale-phrase-decompositions.cjs \
//     --undo=docs/decomposition-refresh-2026-08-12/eus_for_eng-applied-log.json --apply
// The undo asserts the row still holds the value this tool wrote before
// restoring; a row someone else has since changed is left alone and reported.

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env.psql') });
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { decomposeAnchored } = require('../../services/phrase-decomposer.cjs');

const args = process.argv.slice(2);
const flag = (name) => {
  const hit = args.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return null;
  return hit.includes('=') ? hit.slice(hit.indexOf('=') + 1) : true;
};

const APPLY = flag('apply') === true;
const ALL = flag('all') === true;
const ONE_COURSE = typeof flag('course') === 'string' ? flag('course') : null;
const LIMIT = flag('limit') ? parseInt(flag('limit'), 10) : null;
const STAMP = '2026-08-12';
const OUT_DIR = typeof flag('out') === 'string'
  ? flag('out')
  : path.join(__dirname, '..', '..', 'docs', `decomposition-refresh-${STAMP}`);

const UNDO = typeof flag('undo') === 'string' ? flag('undo') : null;

if (!ALL && !ONE_COURSE && !UNDO) {
  console.error('Specify --course=<code>, --all, or --undo=<applied-log.json>.');
  process.exit(1);
}

const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * Compare decompositions by CONTENT, never by raw JSON.stringify.
 *
 * `decomposition` is jsonb, and jsonb normalises object key order on write
 * (shortest key first, then bytewise). A value read back from the DB therefore
 * stringifies in a different key order than the in-memory object that was
 * written, even when the two are identical. Strict stringify comparison made
 * --undo skip every row it had itself applied as SKIP_NOT_OURS: verified on the
 * eus_for_eng applied log, 447/447 rows key-order-only mismatches, 0 genuinely
 * different. Sorting keys at every level makes both sides canonical.
 */
const canon = (v) =>
  JSON.stringify(v, (_k, val) =>
    val && typeof val === 'object' && !Array.isArray(val)
      ? Object.fromEntries(Object.keys(val).sort().map((k) => [k, val[k]]))
      : val
  );
const legoIdOf = (seed, index) =>
  `S${String(seed).padStart(4, '0')}L${String(index).padStart(2, '0')}`;

/**
 * A block is STALE when it names a lego_id, carries a non-empty gloss, and
 * that gloss disagrees with the slot's CURRENT known_text.
 *
 * Only the `known` side is tested. A block's `target` is legitimately a
 * PARTIAL of the LEGO's canonical surface on the insert-split path
 * (decomposeAnchored emits one block per salient leg, with the gloss on the
 * first leg only), so a target mismatch is not by itself evidence of drift —
 * testing it would flag correct rows.
 */
function staleBlocks(decomposition, legoById) {
  if (!Array.isArray(decomposition)) return [];
  const out = [];
  for (const b of decomposition) {
    const id = b?.legoId;
    if (!id) continue;
    const lego = legoById.get(id);
    if (!lego) {
      out.push({ legoId: id, storedKnown: b.known ?? '', currentKnown: null, reason: 'lego_gone' });
      continue;
    }
    const stored = b.known ?? '';
    if (!stored) continue; // structural block (later salient leg) — no gloss to be wrong
    if (norm(stored) !== norm(lego.known_text)) {
      out.push({ legoId: id, storedKnown: stored, currentKnown: lego.known_text, reason: 'gloss_drift' });
    }
  }
  return out;
}

async function refreshCourse(client, courseCode, log) {
  const { rows: legoRows } = await client.query(
    `SELECT seed_number, lego_index, target_text, known_text
       FROM course_legos WHERE course_code = $1`,
    [courseCode]
  );
  if (legoRows.length === 0) {
    log.courses.push({ course: courseCode, status: 'SKIP_NO_LEGOS' });
    return;
  }

  const vocabulary = legoRows.map((l) => ({
    lego_id: legoIdOf(l.seed_number, l.lego_index),
    target_text: l.target_text,
    known_text: l.known_text,
    seed_number: l.seed_number,
  }));
  const legoById = new Map(vocabulary.map((l) => [l.lego_id, l]));

  const { rows: versionRows } = await client.query(
    'SELECT version FROM courses WHERE course_code = $1',
    [courseCode]
  );
  const courseVersion = versionRows[0]?.version ?? null;

  const { rows: phrases } = await client.query(
    `SELECT id, seed_number, lego_index, target_text, decomposition
       FROM course_practice_phrases
      WHERE course_code = $1 AND decomposition IS NOT NULL
      ORDER BY seed_number, lego_index, position`,
    [courseCode]
  );

  const summary = {
    course: courseCode,
    course_version: courseVersion,
    legos: vocabulary.length,
    phrases_with_decomposition: phrases.length,
    stale: 0,
    rewritten: 0,
    skipped_recompute_failed: 0,
    skipped_parent_unlocatable: 0,
    skipped_no_improvement: 0,
    aborted_drift: 0,
  };

  let considered = 0;
  for (const p of phrases) {
    if (LIMIT && considered >= LIMIT) break;

    const stale = staleBlocks(p.decomposition, legoById);
    if (stale.length === 0) continue;
    considered++;
    summary.stale++;

    const parentId = legoIdOf(p.seed_number, p.lego_index);
    const parentLego = legoById.get(parentId) || null;
    const vocabForPhrase = vocabulary.filter((l) => l.seed_number <= p.seed_number);

    let result;
    try {
      result = decomposeAnchored(p.target_text, vocabForPhrase, parentLego, courseCode);
    } catch (e) {
      summary.skipped_recompute_failed++;
      log.rows.push({
        course: courseCode, id: p.id, status: 'SKIP_RECOMPUTE_THREW',
        target_text: p.target_text, stale, error: e.message,
      });
      continue;
    }

    // kind 'error' means the phrase does not cleanly contain its own LEGO —
    // a content/production defect (conjugated or absent salient). Recomputing
    // would silently drop the salient anchor, so leave the row alone and log
    // it for human triage instead.
    if (result.kind === 'error') {
      summary.skipped_parent_unlocatable++;
      log.rows.push({
        course: courseCode, id: p.id, status: 'SKIP_PARENT_UNLOCATABLE',
        parent: parentId, target_text: p.target_text, stale,
      });
      continue;
    }

    // The recompute must actually clear the drift it was called for. If the
    // fresh blocks are still stale (or identical to what is stored), writing
    // buys nothing — log and move on rather than churn the row.
    const residual = staleBlocks(result.blocks, legoById);
    const unchanged = canon(result.blocks) === canon(p.decomposition);
    if (residual.length > 0 || unchanged) {
      summary.skipped_no_improvement++;
      log.rows.push({
        course: courseCode, id: p.id, status: 'SKIP_NO_IMPROVEMENT',
        target_text: p.target_text, stale, residual, unchanged,
      });
      continue;
    }

    const entry = {
      course: courseCode,
      id: p.id,
      parent: parentId,
      target_text: p.target_text,
      stale,
      kind: result.kind,
      before: p.decomposition,
      after: result.blocks,
      status: APPLY ? 'PENDING' : 'DRY_RUN',
    };

    if (!APPLY) {
      log.rows.push(entry);
      summary.rewritten++;
      continue;
    }

    // Before-state assertion: the row must still hold exactly what we read.
    // Shared checkout, parallel agents — abort this row on any drift.
    const { rows: live } = await client.query(
      'SELECT decomposition FROM course_practice_phrases WHERE id = $1',
      [p.id]
    );
    if (!live.length || canon(live[0].decomposition) !== canon(p.decomposition)) {
      entry.status = 'ABORT_DRIFT';
      log.rows.push(entry);
      summary.aborted_drift++;
      continue;
    }

    await client.query(
      `UPDATE course_practice_phrases
          SET decomposition = $1, decomposition_course_version = $2
        WHERE id = $3`,
      [JSON.stringify(result.blocks), courseVersion, p.id]
    );
    entry.status = 'APPLIED';
    log.rows.push(entry);
    summary.rewritten++;
  }

  log.courses.push(summary);
  console.log(
    `${courseCode}: ${summary.stale} stale phrase(s), ` +
    `${summary.rewritten} ${APPLY ? 'rewritten' : 'would be rewritten'}, ` +
    `${summary.skipped_parent_unlocatable} parent-unlocatable, ` +
    `${summary.skipped_no_improvement} no-improvement, ` +
    `${summary.skipped_recompute_failed} threw, ` +
    `${summary.aborted_drift} aborted-on-drift`
  );
}

/** Restore every APPLIED row in a prior log to its pre-write decomposition. */
async function undoFromLog(client, logPath) {
  const prior = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  const applied = (prior.rows || []).filter((r) => r.status === 'APPLIED');
  const out = { stamp: STAMP, mode: APPLY ? 'undo-applied' : 'undo-dryrun', source: logPath, rows: [] };
  let restored = 0, drifted = 0;

  for (const r of applied) {
    const { rows: live } = await client.query(
      'SELECT decomposition FROM course_practice_phrases WHERE id = $1',
      [r.id]
    );
    // Only roll back what this tool actually wrote — if the row has moved on
    // since, someone else owns it now.
    if (!live.length || canon(live[0].decomposition) !== canon(r.after)) {
      out.rows.push({ id: r.id, status: 'SKIP_NOT_OURS' });
      drifted++;
      continue;
    }
    if (APPLY) {
      await client.query(
        'UPDATE course_practice_phrases SET decomposition = $1 WHERE id = $2',
        [JSON.stringify(r.before), r.id]
      );
    }
    out.rows.push({ id: r.id, status: APPLY ? 'RESTORED' : 'WOULD_RESTORE' });
    restored++;
  }

  console.log(`undo: ${restored} ${APPLY ? 'restored' : 'would be restored'}, ${drifted} skipped (changed since)`);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, `undo-${path.basename(logPath)}`);
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`\nLog: ${outPath}`);
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  if (UNDO) {
    await undoFromLog(client, UNDO);
    await client.end();
    return;
  }

  let courseCodes;
  if (ALL) {
    const { rows } = await client.query(
      `SELECT DISTINCT course_code FROM course_practice_phrases
        WHERE decomposition IS NOT NULL ORDER BY course_code`
    );
    courseCodes = rows.map((r) => r.course_code);
  } else {
    courseCodes = [ONE_COURSE];
  }

  const log = { stamp: STAMP, mode: APPLY ? 'applied' : 'dryrun', limit: LIMIT, courses: [], rows: [] };
  for (const code of courseCodes) {
    await refreshCourse(client, code, log);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const suffix = APPLY ? 'applied' : 'dryrun';
  const name = ALL ? 'all-courses' : ONE_COURSE;
  const outPath = path.join(OUT_DIR, `${name}-${suffix}-log.json`);
  fs.writeFileSync(outPath, JSON.stringify(log, null, 2));
  console.log(`\nLog: ${outPath}`);

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
