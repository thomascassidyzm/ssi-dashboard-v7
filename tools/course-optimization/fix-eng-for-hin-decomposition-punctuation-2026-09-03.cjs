#!/usr/bin/env node
// eng_for_hin: repair the decomposition arrays left stale by the question-mark pass.
//
// WHAT BROKE. Commit fac22e5dc (2026-09-03) restored the missing English '?' on the
// target_text of 1,194 course_practice_phrases rows. It deliberately did not touch
// `decomposition`. The player (ssi-learning-app packages/player-vue LearningPlayer.vue,
// "Strategy 0 (authoritative)") only renders the served tiling when the blocks exactly
// reassemble the displayed target under whitespace normalisation:
//
//     norm(served.map(b => b.target).join('')) === norm(targetText)
//
// A trailing '?' present in target_text but absent from the blocks fails that test, so
// every one of those 1,194 phrases fell through to what the code's own comment calls
// "the fragile path that mis-aligned short LEGOs and dropped the salient". The course is
// live, so this is a learner-visible regression.
//
// THE CONVENTION, read off the live data rather than invented. Terminal punctuation lives
// in a GHOST block. Of the 380 eng_for_hin phrases that end in '?' / '.' / '!' and still
// concatenate cleanly:
//     370  end with a standalone ghost  { legoId: null, known: '', target: '?', isGhost: true }
//      10  end with a ghost whose residue already carries the mark (" tomorrow?", " him?")
//       0  have a standalone '?' ghost sitting after another ghost
// That distribution is exactly what services/phrase-decomposer.cjs produces. Its tokeniser
// (consumeOneToken, /^(\s*\S+)/) swallows the punctuation into the preceding token when that
// token is unmatched residue, whereas findLongestMatch stops a LEGO at a punctuation boundary
// and leaves the mark to become a ghost of its own. So the rule this tool applies is the
// decomposer's own behaviour, restricted to the trailing mark:
//     last block is a LEGO (isGhost false) -> append { legoId: null, known: '', target: '?', isGhost: true }
//     last block is a ghost                -> append '?' to that ghost's target
//
// SCOPE OF THE WRITE. The `decomposition` column only. No target_text, no known_text, no
// audio row, no approval state, no `decomposition_course_version` (the stamp is left alone
// deliberately: this is not a recompute against new vocabulary, and bumping it would hide
// genuine version drift from /api/admin/decomposition-backfill).
//
// GUARDS. Per row: re-read; refuse unless target_text, updated_at and the full decomposition
// still match what was read at scan time (optimistic concurrency — the checkout and the DB are
// shared with other agents); refuse unless the only discrepancy is the trailing mark; write
// filtered on id + target_text + updated_at; read back and assert the blocks now concatenate.
//
//   node tools/course-optimization/fix-eng-for-hin-decomposition-punctuation-2026-09-03.cjs          (dry run)
//   APPLY=1 node .../fix-eng-for-hin-decomposition-punctuation-2026-09-03.cjs                        (writes)
//
// There is no dashboard route that edits a phrase's decomposition surgically — the two that
// exist (/api/admin/decomposition-backfill and refresh-stale-phrase-decompositions.cjs)
// RECOMPUTE the whole tiling from current vocabulary, which would rewrite blocks that are
// correct and can lose a salient anchor. This tool therefore writes directly, minimally.

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const APPLY = process.env.APPLY === '1';
const COURSE = 'eng_for_hin';
const STAMP = '2026-09-03';
const outDir = process.env.OUT_DIR || path.join(__dirname, '..', '..', 'docs', `eng-for-hin-decomposition-punctuation-${STAMP}`);

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const norm = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
const concat = (blocks) => norm(blocks.map((b) => b.target).join(''));

// The whole-course concatenation check, i.e. the player's Strategy-0 guard.
function classify(row) {
  const d = row.decomposition;
  if (!Array.isArray(d) || d.length === 0) return { state: 'NO_DECOMPOSITION' };
  const j = concat(d);
  const t = norm(row.target_text);
  if (j === t) return { state: 'OK' };
  if (t.length > j.length && t.startsWith(j) && /^[?.!]+$/.test(t.slice(j.length))) {
    return { state: 'TRAILING_PUNCT', mark: t.slice(j.length) };
  }
  return { state: 'OTHER', joined: j, target: t };
}

function repaired(blocks, mark) {
  const out = blocks.map((b) => ({ ...b }));
  const last = out[out.length - 1];
  if (last.isGhost) {
    out[out.length - 1] = { ...last, target: last.target + mark };
  } else {
    out.push({ legoId: null, target: mark, known: '', isGhost: true });
  }
  return out;
}

const SELECT = 'id, seed_number, lego_index, position, phrase_role, target_text, updated_at, decomposition';

async function fetchAll() {
  const { data, error } = await supabase
    .from('course_practice_phrases')
    .select(SELECT)
    .eq('course_code', COURSE);
  if (error) throw new Error(`fetch failed — ${error.message}`);
  return data;
}

function census(rows) {
  const c = { total: rows.length, decomposed: 0, ok: 0, trailingPunct: 0, other: 0, none: 0 };
  for (const r of rows) {
    const k = classify(r);
    if (k.state === 'NO_DECOMPOSITION') { c.none++; continue; }
    c.decomposed++;
    if (k.state === 'OK') c.ok++;
    else if (k.state === 'TRAILING_PUNCT') c.trailingPunct++;
    else c.other++;
  }
  return c;
}

(async () => {
  fs.mkdirSync(outDir, { recursive: true });

  const before = await fetchAll();
  const beforeCensus = census(before);
  console.log('BEFORE', beforeCensus);

  const targets = before.filter((r) => classify(r).state === 'TRAILING_PUNCT');
  const marks = {};
  for (const r of targets) { const m = classify(r).mark; marks[m] = (marks[m] || 0) + 1; }
  console.log(`candidates: ${targets.length}`, marks);

  const log = [];
  for (const row of targets) {
    const k = classify(row);
    const next = repaired(row.decomposition, k.mark);
    const entry = {
      id: row.id,
      seed_number: row.seed_number,
      target_text: row.target_text,
      mark: k.mark,
      shape: row.decomposition[row.decomposition.length - 1].isGhost ? 'append-to-trailing-ghost' : 'new-ghost-block',
      before: row.decomposition,
      after: next
    };

    if (concat(next) !== norm(row.target_text)) {
      entry.status = 'ABORT_STILL_MISMATCHED';
      log.push(entry);
      continue;
    }
    if (!APPLY) { entry.status = 'DRY_RUN'; log.push(entry); continue; }

    // Re-read immediately before the write and assert nothing has moved.
    const { data: fresh, error: readErr } = await supabase
      .from('course_practice_phrases').select(SELECT).eq('id', row.id).single();
    if (readErr || !fresh) { entry.status = 'ABORT_REREAD_FAILED'; entry.error = readErr?.message; log.push(entry); continue; }
    if (fresh.target_text !== row.target_text || fresh.updated_at !== row.updated_at ||
        JSON.stringify(fresh.decomposition) !== JSON.stringify(row.decomposition)) {
      entry.status = 'ABORT_DRIFT';
      entry.drift = { target_text: fresh.target_text, updated_at: fresh.updated_at };
      log.push(entry);
      continue;
    }

    const { data: written, error: wErr } = await supabase
      .from('course_practice_phrases')
      .update({ decomposition: next })
      .eq('id', row.id)
      .eq('target_text', row.target_text)
      .eq('updated_at', row.updated_at)
      .select(SELECT);
    if (wErr) { entry.status = 'ERROR'; entry.error = wErr.message; log.push(entry); continue; }
    if (!written || written.length !== 1) { entry.status = 'ABORT_NO_ROW_MOVED'; log.push(entry); continue; }

    const back = written[0];
    if (back.target_text !== row.target_text) { entry.status = 'FATAL_TEXT_CHANGED'; log.push(entry); continue; }
    entry.status = concat(back.decomposition) === norm(back.target_text) ? 'APPLIED' : 'VERIFY_FAILED';
    entry.readback = back.decomposition;
    log.push(entry);
  }

  const counts = log.reduce((a, e) => (a[e.status] = (a[e.status] || 0) + 1, a), {});
  console.log('statuses', counts);

  const after = await fetchAll();
  const afterCensus = census(after);
  console.log('AFTER', afterCensus);

  // No text may have moved anywhere in the course.
  const beforeText = new Map(before.map((r) => [r.id, r.target_text]));
  const textChanged = after.filter((r) => beforeText.get(r.id) !== r.target_text);
  console.log('target_text rows changed during this run:', textChanged.length);

  const file = path.join(outDir, APPLY ? 'applied-log.json' : 'dryrun-log.json');
  fs.writeFileSync(file, JSON.stringify({
    course: COURSE, apply: APPLY, ranAt: new Date().toISOString(),
    beforeCensus, afterCensus, counts, marks,
    textChanged: textChanged.map((r) => r.id),
    rows: log
  }, null, 1));
  console.log('log →', file);
})().catch((e) => { console.error(e); process.exit(1); });
