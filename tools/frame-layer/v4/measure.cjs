#!/usr/bin/env node
/**
 * COVERAGE MAP for ANY course — course code in, coverage map out. READ-ONLY on
 * the course; writes evidence only.
 *
 * Tom, 2026-10-07: the frame codex and this pipeline are for EVERY course, not
 * just French. So nothing here knows a language: the course's known language
 * comes from its code (…_for_hin → Hindi), the frame tagger (Haiku reading
 * frame-codex.json) classifies every known text the course carries — seeds,
 * LEGOs, components, BUILD/USE phrases — and caches each text once for the
 * whole estate, so a second course sharing English known texts pays only for
 * the texts it does not share.
 *
 * Per course: the frame inventory (when each frame first becomes available, by
 * seed or by combination of taught chunks — frame-inventory.cjs), windows of
 * 20 seeds (headline) and 10 seeds (where the weak spots are), scored over all
 * BUILD+USE rows. Where a course carries v3 rows (metadata.pipeline = 'v3')
 * the same windows are also scored for v3 rows and non-v3 rows.
 *
 * Usage: node tools/frame-layer/v4/measure.cjs fra_for_eng [hin_for_eng ...]
 * Output: $V4_EVIDENCE/measure-<course>.json (default dir frame-coverage/)
 */
const fs = require('fs');
const path = require('path');
const { loadCourse } = require('./db.cjs');
const { inventory, availableAt } = require('./frame-inventory.cjs');
const { scoreCourseWindows } = require('./window-coverage.cjs');
const { tagCourse } = require('./tag-course.cjs');
const { CODEX, knownLanguageName } = require('../frame-tagger.cjs');

const EVIDENCE = process.env.V4_EVIDENCE || path.join(process.env.HOME, 'ssi-evidence', 'ssi-dashboard-v7', 'frame-coverage');
const WEAK = 0.5;   // a 10-seed window using under half its available frames is a weak window

const mean = (xs) => xs.length ? +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(3) : null;

async function measure(course, { data = loadCourse(course), log } = {}) {
  const ledger = await tagCourse(course, data, { log });
  const inv = inventory(course, data);
  const avail = (seed) => availableAt(inv, seed);
  const maxSeed = data.phrases.length ? Math.max(...data.phrases.map(p => p.seed_number)) : 0;
  const sets = { all: data.phrases };
  const v3 = data.phrases.filter(p => p.pipeline === 'v3');
  if (v3.length) { sets.v3 = v3; sets.not_v3 = data.phrases.filter(p => p.pipeline !== 'v3'); }
  const out = { course, known_language: knownLanguageName(course), codex: CODEX.version, generated: new Date().toISOString(),
    max_seed: maxSeed, seeds: data.seeds.length, rows: data.phrases.length, v3_rows: v3.length,
    tagging: { texts_missing_before: ledger.missing, calls: ledger.calls, tokens: ledger.tokens, untagged: ledger.untagged.length },
    inventory: inv.frames.map(({ id, name, by_seed, by_combination, available }) => ({ id, name, by_seed, by_combination, available })),
    windows: {} };
  for (const [name, rows] of Object.entries(sets)) {
    out.windows[name] = { w20: scoreCourseWindows(rows, avail, { size: 20, maxSeed }), w10: scoreCourseWindows(rows, avail, { size: 10, maxSeed, rarefyN: 40 }) };
  }
  out.summary = summarise(out);
  return out;
}

function summarise(m) {
  const w20 = m.windows.all.w20, w10 = m.windows.all.w10;
  const missingCount = {};
  for (const w of w20) for (const f of w.missing_ids) missingCount[f] = (missingCount[f] || 0) + 1;
  return {
    mean_w20: mean(w20.map(w => w.coverage)), mean_w10: mean(w10.map(w => w.coverage)),
    interjection_rate: mean(w20.map(w => w.interjection_rate)),
    weak_w10: w10.filter(w => w.coverage < WEAK).length, w10_count: w10.length,
    weakest_w10: [...w10].sort((a, b) => a.coverage - b.coverage || (a.rarefied_frames_at_n ?? 99) - (b.rarefied_frames_at_n ?? 99)).slice(0, 8)
      .map(w => ({ start: w.start, end: w.end, coverage: w.coverage, used: w.used, available: w.available, phrases: w.phrases, missing: w.missing_ids })),
    most_missing: Object.entries(missingCount).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id, n]) => ({ id, windows: n, of: w20.length })),
    never_available: m.inventory.filter(f => f.available == null).map(f => f.id),
  };
}

function print(m) {
  const s = m.summary;
  console.log(`${m.course} (${m.known_language} known): ${m.rows} phrases, mean coverage w20 ${s.mean_w20} w10 ${s.mean_w10}, weak 10-seed windows ${s.weak_w10}/${s.w10_count}, openers ${s.interjection_rate}; tagged ${m.tagging.texts_missing_before} new texts in ${m.tagging.calls} calls (${m.tagging.tokens} tokens)`);
  for (const x of m.windows.all.w20) console.log(`  ${String(x.start).padStart(3)}-${String(x.end).padStart(3)} avail ${String(x.available).padStart(2)} used ${String(x.used).padStart(2)} cov ${x.coverage}  rare60 ${x.rarefied_frames_at_n ?? '-'}  n ${x.phrases}  interj ${x.interjection_rate}  missing ${x.missing_ids.join(' ')}`);
}

module.exports = { measure, summarise, WEAK, EVIDENCE };

if (require.main === module) {
  fs.mkdirSync(EVIDENCE, { recursive: true });
  (async () => {
    for (const course of process.argv.slice(2).filter(a => !a.startsWith('--'))) {
      const m = await measure(course);
      fs.writeFileSync(path.join(EVIDENCE, `measure-${course}.json`), JSON.stringify(m, null, 1));
      print(m);
    }
  })().catch(e => { console.error(e.message); process.exit(1); });
}
