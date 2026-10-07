#!/usr/bin/env node
/**
 * COVERAGE MAP FOR EVERY COURSE — runs measure.cjs course by course, then
 * folds the results into one cross-course table of weak windows. READ-ONLY on
 * course content; writes evidence only.
 *
 * Courses come from the live DB (every course with at least MIN_PHRASES
 * BUILD/USE rows), smallest first so the map fills in fast and a long course
 * never blocks the short ones. Each course's JSON is written as it finishes
 * and skipped on a re-run, so a killed run resumes; the tag cache is shared,
 * so a re-run never re-pays for a text.
 *
 * Usage: node tools/frame-layer/v4/measure-all.cjs [--min 300] [--only a,b] [--fold-only]
 * Output: $V4_EVIDENCE/measure-<course>.json, cross-course.json
 */
const fs = require('fs');
const path = require('path');
const { query } = require('./db.cjs');
const { measure, EVIDENCE, WEAK } = require('./measure.cjs');

const SKIP = new Set(['eng_template', 'zzz_test2_for_eng']); // fixtures, not courses

function courses(min) {
  return query(`select course_code, count(*)::int n from course_practice_phrases where phrase_role in ('build','use')
    group by 1 having count(*) >= ${+min} order by 2`).filter(r => !SKIP.has(r.course_code)).map(r => r.course_code);
}

function fold(files) {
  const rows = files.map(f => JSON.parse(fs.readFileSync(f, 'utf8'))).map(m => ({
    course: m.course, known_language: m.known_language, rows: m.rows, max_seed: m.max_seed, ...m.summary,
    w20: m.windows.all.w20.map(w => ({ start: w.start, end: w.end, coverage: w.coverage, phrases: w.phrases })),
  }));
  rows.sort((a, b) => (a.mean_w20 ?? 1) - (b.mean_w20 ?? 1));
  return { generated: new Date().toISOString(), weak_threshold_w10: WEAK, courses: rows };
}

async function main() {
  const a = process.argv.slice(2);
  const opt = (k, d) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : d; };
  fs.mkdirSync(EVIDENCE, { recursive: true });
  const list = opt('--only', null) ? opt('--only').split(',') : courses(+opt('--min', 300));
  if (!a.includes('--fold-only')) {
    console.log(`${list.length} courses`);
    for (const c of list) {
      const file = path.join(EVIDENCE, `measure-${c}.json`);
      if (fs.existsSync(file)) continue;
      try {
        const m = await measure(c, { log: () => {} });
        fs.writeFileSync(file, JSON.stringify(m, null, 1));
        console.log(`${new Date().toISOString().slice(11, 19)} ${c}: w20 ${m.summary.mean_w20}, weak w10 ${m.summary.weak_w10}/${m.summary.w10_count}, +${m.tagging.texts_missing_before} texts, ${m.tagging.tokens} tokens, untagged ${m.tagging.untagged}`);
      } catch (e) { console.log(`${c}: FAILED ${e.message}`); }
    }
  }
  const files = list.map(c => path.join(EVIDENCE, `measure-${c}.json`)).filter(f => fs.existsSync(f));
  const out = fold(files);
  fs.writeFileSync(path.join(EVIDENCE, 'cross-course.json'), JSON.stringify(out, null, 1));
  console.log(`folded ${out.courses.length} courses → ${path.join(EVIDENCE, 'cross-course.json')}`);
}

module.exports = { fold, courses };
if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1); });
