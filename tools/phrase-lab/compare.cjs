#!/usr/bin/env node
/**
 * Adjudicate the arms of the phrase-prompt comparison and emit the table.
 *
 * ARM 1 — LIVE: what is already in the database, which is the Sonnet 4.5
 *   baseline. It is read, not generated, so nothing is spent on it.
 * ARM 2+ — generated sets from tools/phrase-lab/generate.cjs, one file per model.
 *
 * BLIND WHERE IT CAN BE ARRANGED: every set is scored by identical code against
 * an inventory built from the same (course, seed, lego), and the arm label is
 * attached only after the score exists. The scorer never sees which model wrote
 * what — `scoreSet` takes an inventory and a list of phrases and has no argument
 * that could carry the arm.
 *
 * ARMS WITH HOLES ARE NOT ARMS THAT SCORED BADLY. A target a model failed to
 * produce is reported as a generation failure in its own column and excluded
 * from the per-axis means, never averaged in as a zero.
 *
 * READ-ONLY.
 *
 * Usage:
 *   node tools/phrase-lab/compare.cjs --course spa_for_eng --targets targets.json \
 *     --arm "Sonnet 4.5 (live)=live" --arm "Opus 5=opus.json" --arm "Sonnet 5=sonnet.json" \
 *     --md report.md
 */

require('dotenv').config({ quiet: true });
const fs = require('fs');
const { buildInventory } = require('./inventory.cjs');
const { scoreSet, fetchLivePhrases, FLOORS } = require('./score.cjs');

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const f2 = (x) => (x === null || x === undefined ? '—' : Number(x).toFixed(2));

// TOM'S RULING, 2026-08-27, verbatim: "One new distinction per practice phrase is
// not required really. / Each new LEGO is the distinction that's being enabled by
// practice." The `ascent` axis is therefore DROPPED from the reported table. It was
// never in the floors, and it was inverted anyway — it counts axis changes between
// consecutive phrases, so it penalised exactly what the pattern-variety axis rewards.
// score.cjs still computes it; nothing here scores, ranks or concludes on it.
const AXES = [
  ['gateFailed', 'layer-1 gate failures', 'lower'],
  ['inheritedAmbiguityPhrases', 'phrases inheriting course ambiguity', 'lower'],
  ['phrases', 'phrases written', 'higher'],
  ['edgeCombos', 'neighbour x pattern combos', 'higher'],
  ['distinctAdjacencies', 'distinct neighbours touched', 'higher'],
  ['positionSpread', 'positions reached (of 3)', 'higher'],
  ['fillingShare', 'share in the filling position', 'higher'],
  ['axesVaried', 'pattern axes varied (of 5)', 'higher'],
  ['distinctPatterns', 'distinct pattern signatures', 'higher'],
  ['recencyMass', 'recency mass', 'higher'],
  ['newEdgesPerSyllable', 'new edges per syllable', 'higher'],
  ['useCompleteShare', 'USE phrases standing alone', 'higher']
];

async function scoreArm(supabase, courseCode, targets, source) {
  const sets = [];
  const failures = [];
  const bySeed = new Map();
  if (source !== 'live') {
    for (const r of JSON.parse(fs.readFileSync(source, 'utf8'))) bySeed.set(`${r.seedNumber}:${r.legoIndex}`, r);
  }
  for (const t of targets) {
    const key = `${t.seed}:${t.lego}`;
    let phrases;
    if (source === 'live') {
      phrases = await fetchLivePhrases(supabase, courseCode, t.seed, t.lego);
    } else {
      const r = bySeed.get(key);
      if (!r || r.error || !r.phrases?.length) {
        failures.push({ ...t, why: r?.error || 'no set produced' });
        continue;
      }
      phrases = r.phrases;
    }
    const inv = await buildInventory(supabase, courseCode, t.seed, t.lego);
    const s = scoreSet(inv, phrases);   // <- no arm label reaches the scorer
    sets.push(s);
  }
  return { sets, failures };
}

/**
 * WHAT WOULD A HUMAN HAVE TO TOUCH, and how hard is the touch. This is the whole
 * cost question: Opus is only worth its price if it leaves fewer sets on the
 * human's desk, weighted by how expensive each kind of desk-visit is.
 *
 *   regenerate — a layer-1 gate failure. The set used vocabulary it may not use;
 *                it is not repairable by editing, it is rejected and re-asked.
 *   targeted   — clean gate, short on one or two named axes. The shortfall carries
 *                its own rewrite instruction, so this is a bounded edit.
 *   rewrite    — clean gate, short on three or more axes, or short on `phrases`
 *                (too few to edit into shape — the set has to be written again).
 *   clean      — clears every floor on both roles. No human time at all.
 */
function touchKind(set) {
  const gate = set.build.gateFailed + set.use.gateFailed;
  if (gate > 0) return 'regenerate';
  const sf = [...set.verdict.build.shortfalls, ...set.verdict.use.shortfalls];
  if (!sf.length) return 'clean';
  if (sf.some((x) => x.axis === 'phrases') || sf.length >= 3) return 'rewrite';
  return 'targeted';
}

function touchTally(sets) {
  const t = { clean: 0, targeted: 0, rewrite: 0, regenerate: 0 };
  for (const s of sets) t[touchKind(s)] += 1;
  return t;
}

/** One step of loosening / tightening per floor axis. */
const STEP = { phrases: 1, edgeCombos: 1, distinctAdjacencies: 1, positionSpread: 1, axesVaried: 1, recencyMass: 0.05, useCompleteShare: 0.1 };

/** Does a set clear a floors object? Recomputed from the stored axis values — no rescoring. */
function clearsFloors(set, role, floors) {
  if (set[role].gateFailed > 0) return false;
  for (const [axis, min] of Object.entries(floors)) {
    const v = set[role][axis];
    if (v === null || v === undefined) continue;
    if (v < min) return false;
  }
  return true;
}

/** Pass rate under floors moved by `dir` steps (-1 looser, 0 as-set, +1 tighter). */
function passRateAt(sets, role, dir) {
  if (!sets.length) return null;
  const floors = {};
  for (const [k, v] of Object.entries(FLOORS[role])) {
    let nv = v + dir * (STEP[k] || 1);
    if (k === 'useCompleteShare') nv = Math.min(1, Math.max(0, nv));
    floors[k] = Math.max(0, Number(nv.toFixed(2)));
  }
  return sets.filter((s) => clearsFloors(s, role, floors)).length / sets.length;
}

function aggregate(sets, role) {
  const out = {};
  for (const [axis] of AXES) {
    const vals = sets.map((s) => s[role][axis]).filter((v) => v !== null && v !== undefined);
    out[axis] = mean(vals);
  }
  out.floorPassRate = sets.length ? sets.filter((s) => s.verdict[role].pass).length / sets.length : null;
  const tally = {};
  for (const s of sets) for (const sf of s.verdict[role].shortfalls) tally[sf.axis] = (tally[sf.axis] || 0) + 1;
  out.shortfallTally = tally;
  out.sensitivity = { looser: passRateAt(sets, role, -1), asSet: passRateAt(sets, role, 0), tighter: passRateAt(sets, role, 1) };
  return out;
}

function table(armNames, rows, role, agg) {
  const lines = [`| axis | ${armNames.join(' | ')} |`, `|---|${armNames.map(() => '---').join('|')}|`];
  for (const [axis, label] of AXES) {
    const cells = armNames.map((n) => f2(agg[n][role][axis]));
    if (cells.every((c) => c === '—')) continue;
    lines.push(`| ${label} | ${cells.join(' | ')} |`);
  }
  lines.push(`| **clears every floor** | ${armNames.map((n) => (agg[n][role].floorPassRate === null ? '—' : `${Math.round(agg[n][role].floorPassRate * 100)}%`)).join(' | ')} |`);
  return lines.join('\n');
}

async function main() {
  const argv = process.argv.slice(2);
  const arg = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
  const courseCode = arg('--course');
  const targets = JSON.parse(fs.readFileSync(arg('--targets'), 'utf8'));
  const mdOut = arg('--md');
  const armSpecs = argv.map((a, i) => (a === '--arm' ? argv[i + 1] : null)).filter(Boolean)
    .map((s) => { const i = s.indexOf('='); return { name: s.slice(0, i), source: s.slice(i + 1) }; });

  const { supabase } = require('../../services/supabase-client.cjs');
  if (!supabase) throw new Error('no Supabase client — SUPABASE_URL / SUPABASE_SERVICE_KEY missing from .env');

  const agg = {};
  const armNames = [];
  const perSeed = {};
  const holes = {};
  for (const a of armSpecs) {
    const { sets, failures } = await scoreArm(supabase, courseCode, targets, a.source);
    agg[a.name] = { build: aggregate(sets, 'build'), use: aggregate(sets, 'use'), n: sets.length };
    perSeed[a.name] = sets;
    holes[a.name] = failures;
    armNames.push(a.name);
  }

  const md = [];
  md.push(`# Phrase prompt v3 — three-arm comparison (${courseCode})`);
  md.push('');
  const { syllableBasis } = require('./score.cjs');
  const basis = syllableBasis(String(courseCode).split('_')[0]);
  md.push(`${targets.length} real LEGOs, spread across the course. Every arm generated against the **identical** introduced-vocabulary state; every arm scored by identical code with no arm label reaching the scorer.`);
  md.push('');
  md.push('| arm | sets scored | generation failures |');
  md.push('|---|---|---|');
  for (const n of armNames) md.push(`| ${n} | ${agg[n].n} / ${targets.length} | ${holes[n].length} |`);
  md.push('');
  for (const role of ['build', 'use']) {
    md.push(`## ${role.toUpperCase()} phrases — per-LEGO means`);
    md.push('');
    md.push(table(armNames, perSeed, role, agg));
    md.push('');
    md.push(`Floors for ${role.toUpperCase()}: ${Object.entries(FLOORS[role]).map(([k, v]) => `${k} ≥ ${v}`).join(', ')}.`);
    md.push('');
    md.push('Where each arm falls short, counted over the LEGOs:');
    md.push('');
    md.push(`| shortfall axis | ${armNames.join(' | ')} |`);
    md.push(`|---|${armNames.map(() => '---').join('|')}|`);
    const axes = new Set(armNames.flatMap((n) => Object.keys(agg[n][role].shortfallTally)));
    for (const ax of axes) md.push(`| ${ax} | ${armNames.map((n) => agg[n][role].shortfallTally[ax] || 0).join(' | ')} |`);
    md.push('');
  }

  const pct = (x) => (x === null || x === undefined ? '—' : `${Math.round(x * 100)}%`);
  md.push('## Floor sensitivity — does the conclusion survive moving the bar?');
  md.push('');
  md.push('The floors are **not Tom\'s ruling** — the only one he set himself is "at least 6 distinct partner x pattern combinations". The rest are the Spanish run\'s calibration, kept unchanged here so all six courses are directly comparable. This is what the "clears every floor" figure does if every floor is loosened or tightened by one step (integers ±1, recencyMass ±0.05, useCompleteShare ±0.1).');
  md.push('');
  for (const role of ['build', 'use']) {
    md.push(`| ${role.toUpperCase()} — clears every floor | ${armNames.join(' | ')} |`);
    md.push(`|---|${armNames.map(() => '---').join('|')}|`);
    for (const [k, lab] of [['looser', 'one step LOOSER'], ['asSet', 'as set'], ['tighter', 'one step TIGHTER']]) {
      md.push(`| ${lab} | ${armNames.map((n) => pct(agg[n][role].sensitivity[k])).join(' | ')} |`);
    }
    md.push('');
  }

  md.push('## What a human would have to touch');
  md.push('');
  md.push('One row per arm, counted over the LEGOs. `clean` costs no human time; `targeted` is a bounded edit against a named shortfall; `rewrite` is the set written again; `regenerate` is a layer-1 gate failure — the set reached for vocabulary it may not use and is not repairable by editing.');
  md.push('');
  md.push(`| arm | clean | targeted | rewrite | regenerate |`);
  md.push('|---|---|---|---|---|');
  for (const n of armNames) {
    const t = touchTally(perSeed[n]);
    md.push(`| ${n} | ${t.clean} | ${t.targeted} | ${t.rewrite} | ${t.regenerate} |`);
  }
  md.push('');

  md.push('## Per-LEGO detail');
  md.push('');
  md.push(`| seed | LEGO | ${armNames.map((n) => `${n}: gate / pos / axes / combos`).join(' | ')} |`);
  md.push(`|---|---|${armNames.map(() => '---').join('|')}|`);
  for (const t of targets) {
    const cells = armNames.map((n) => {
      const s = perSeed[n].find((x) => x.seedNumber === t.seed && x.legoIndex === t.lego);
      if (!s) return '*(no set)*';
      const g = s.build.gateFailed + s.use.gateFailed;
      return `${g} / ${s.use.positionSpread || s.build.positionSpread} / ${s.use.axesVaried} / ${s.build.edgeCombos + s.use.edgeCombos}`;
    });
    const lab = perSeed[armNames[0]].find((x) => x.seedNumber === t.seed)?.lego;
    md.push(`| ${t.seed} | ${lab ? `"${lab.known}" → "${lab.target}"` : t.legoId || ''} | ${cells.join(' | ')} |`);
  }
  md.push('');

  md.push('---');
  md.push('');
  md.push('**Two axes that are reported but score nothing.** `one-distinction ascent` is dropped from these tables entirely: Tom ruled on 2026-08-27 that "one new distinction per practice phrase is not required really — each new LEGO is the distinction that\'s being enabled by practice". It was never in the floors and it was inverted anyway. `new edges per syllable` is in the tables but in no floor.');
  md.push('');
  if (basis === 'exact') md.push(`**Syllable basis: exact.** A real counter exists for this target language, so \`new edges per syllable\` is comparable with the other courses.`);
  else if (basis === 'approximate') md.push(`**Syllable basis: APPROXIMATE — read \`new edges per syllable\` with care.** Japanese kanji carry no reading in the stored text and this repo has no morphological analyser, so kana morae are counted exactly and each kanji is counted as 2 morae (the modal reading length). Measured against hand-counted specimens the estimate lands within about one mora per phrase. The axis is in no floor, so no verdict here depends on it, but it is **not like-for-like** with the Romance courses in the cross-course table.`);
  else md.push(`**Syllable basis: NOT COMPARABLE.** No counter exists for this target language and the fallback is a Latin-vowel-group guess that matches nothing in this script. \`new edges per syllable\` for this course is a fact about the tool, not about the language, and must not be compared with the other courses.`);
  md.push('');
  md.push('**Specimen confound, stated up front.** The positive and negative worked examples in the prompt are the two **Spanish** rows Tom hand-graded, identical for all six courses and labelled in the prompt as another course\'s Spanish shown for the SHAPE of the set. There is no Tom-graded specimen in any other course and no honest in-course positive to substitute, and holding them constant is what keeps the arms comparable across courses. It remains possible that a Spanish specimen helps a Romance course more than it helps Japanese; if the cross-course numbers show exactly that gradient, that is this caveat, not a finding about the language.');
  md.push('');

  const text = md.join('\n');
  if (mdOut) { fs.writeFileSync(mdOut, text); console.error(`wrote ${mdOut}`); }
  else console.log(text);
  if (arg('--json')) fs.writeFileSync(arg('--json'), JSON.stringify({ agg, perSeed, holes }, null, 2));
}

module.exports = { scoreArm, aggregate };

if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
