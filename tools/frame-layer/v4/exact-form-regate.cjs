#!/usr/bin/env node
/**
 * RE-GATE THE STAGED v4 ROWS AT THE EXACT FORM (job #970, Tom 2026-10-09).
 * READ-ONLY on the course database; writes only <dir>/staged-<course>.exact.json
 * and a summary. For each staged row the target must pass exactFormCheck against
 * the vocabulary available to THAT row's LEGO (prior LEGOs and components,
 * earlier LEGOs of its own seed, the LEGO itself) - the same window generate-v4's
 * gate uses. Coverage is recomputed per window over live phrases + surviving rows.
 *
 * Usage: node exact-form-regate.cjs <course>... [--dir <staged dir>]
 */
const fs = require('fs');
const path = require('path');
const { availableVocab } = require('../availability.cjs');
const { loadCourse } = require('./db.cjs');
const { exactFormCheck } = require('./exact-form.cjs');
const { inventory, availableAt } = require('./frame-inventory.cjs');
const { scoreWindow } = require('./window-coverage.cjs');
const { tagCourse } = require('./tag-course.cjs');
const { ensureTagged, knownLanguageName } = require('../frame-tagger.cjs');

const RUN_DIR = process.env.V4_RUN_DIR || path.join(process.env.HOME, 'ssi-evidence', 'ssi-dashboard-v7', '924-phrase-v4-all-courses');

// Same set generate-v4 uses: targets written without spaces tile by character.
const NO_SPACE = new Set(['zho', 'jpn', 'yue', 'hak', 'nan', 'tha', 'lao', 'khm', 'mya']);
const targetLangOf = (course) => String(course).split('_for_')[0].split('_')[0];

function regateRows(rows, data, opts = {}) {
  const kept = [], cut = [];
  for (const r of rows) {
    const vocab = availableVocab({ legos: data.legos, components: data.components, seed: r.seed_number, legoIndex: +r.lego_index });
    vocab.push({ target_text: r.lego_target });
    vocab.push(...data.components.filter(x => x.seed_number === r.seed_number && +x.lego_index === +r.lego_index));
    const c = exactFormCheck(r.target_text, vocab.map(v => v.target_text), { noSpace: !!opts.noSpace });
    if (c.ok) kept.push(r); else cut.push({ ...r, exact_form: { offending: c.offending, reason: c.reason } });
  }
  return { kept, cut };
}

/** `--dir <path>` is an option pair (its value is a directory, never a course). */
function parseArgs(argv) {
  const args = [...argv];
  let dir = null;
  const di = args.indexOf('--dir');
  if (di >= 0) { dir = args[di + 1]; args.splice(di, 2); }
  return { courses: args.filter(a => !a.startsWith('--')), dir };
}

async function main() {
  const { courses, dir: stagedDir } = parseArgs(process.argv.slice(2));
  const baseDir = stagedDir ? path.resolve(stagedDir) : RUN_DIR;
  const summary = {};
  for (const course of courses) {
    const dir = path.join(baseDir, course);
    const staged = JSON.parse(fs.readFileSync(path.join(dir, `staged-${course}.json`), 'utf8'));
    const data = loadCourse(course);
    await tagCourse(course, data);
    await ensureTagged(staged.rows.map(r => r.known_text), { knownLanguage: knownLanguageName(course) });
    const { kept, cut } = regateRows(staged.rows, data, { noSpace: NO_SPACE.has(targetLangOf(course)) });
    const inv = inventory(course, data);
    const covers = (rows, w) => {
      const available = availableAt(inv, w.end);
      const live = data.phrases.filter(p => p.seed_number >= w.start && p.seed_number <= w.end);
      const added = rows.filter(r => r.seed_number >= w.start && r.seed_number <= w.end);
      return scoreWindow([...live, ...added], available, { rarefyN: 60 }).coverage;
    };
    const windows = staged.windows.map(w => ({ start: w.start, end: w.end, live_only: covers([], w),
      before_cut: covers(staged.rows, w), after_cut: covers(kept, w), rows_before: staged.rows.filter(r => r.seed_number >= w.start && r.seed_number <= w.end).length,
      rows_after: kept.filter(r => r.seed_number >= w.start && r.seed_number <= w.end).length }));
    const mean = (k) => windows.length ? windows.reduce((a, w) => a + w[k], 0) / windows.length : 0;
    const liveBuildUse = data.phrases.length;
    summary[course] = { rows_before: staged.rows.length, rows_cut: cut.length, rows_kept: kept.length,
      live_phrases: liveBuildUse, growth_before: staged.rows.length / liveBuildUse, growth_after: kept.length / liveBuildUse,
      coverage_live_only: mean('live_only'), coverage_before_cut: mean('before_cut'), coverage_after_cut: mean('after_cut'), windows,
      examples: cut.slice(0, 5).map(c => ({ seed: c.seed_number, known: c.known_text, target: c.target_text, offending: c.exact_form.offending, reason: c.exact_form.reason })) };
    fs.writeFileSync(path.join(dir, `staged-${course}.exact.json`), JSON.stringify({ ...staged, regate: 'exact-form 2026-10-09', rows: kept, exact_form_cut: cut, windows }, null, 1));
    const s = summary[course];
    console.log(`${course}: ${s.rows_before} -> kept ${s.rows_kept}, cut ${s.rows_cut}; coverage ${s.coverage_before_cut.toFixed(3)} -> ${s.coverage_after_cut.toFixed(3)}`);
  }
  fs.writeFileSync(path.join(baseDir, 'exact-form-summary.json'), JSON.stringify(summary, null, 1));
}
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
module.exports = { regateRows, parseArgs };
