#!/usr/bin/env node
/**
 * BLIND SAMPLE for the cross-family judge (#463 improvement 2: meaning-match
 * by a SECOND model family, never the writer's own).
 *
 * Per language: N USE phrases from each generator present in the pilot regions
 * (old builder, v3 where it exists, v4), shuffled, generator hidden. Writes
 * judge-sample-<course>.json (blind items) and judge-key-<course>.json (the
 * mapping) to the evidence dir, and prints the question to put to the judge.
 * The judge is asked, per item: does the target say exactly what the English
 * says (nothing more, nothing less); is the target a natural complete sentence
 * (tier 1 natural / 2 possible-but-clunky / 3 wrong); is the English natural.
 *
 * Usage: node tools/frame-layer/v4/judge-sample.cjs gle_for_eng 30
 */
const fs = require('fs');
const path = require('path');
const { loadCourse } = require('./db.cjs');
const { rarefy } = require('./window-coverage.cjs');
const EVIDENCE = process.env.V4_EVIDENCE || path.join(process.env.HOME, 'ssi-evidence', 'ssi-dashboard-v7', '468-frame-diversity');
const LANG = { fra_for_eng: 'French', deu_for_eng: 'German', gle_for_eng: 'Irish' };

function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function sample(arr, n, rnd) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); }

function build(course, n = 30) {
  const rnd = mulberry32(468);
  const files = fs.readdirSync(EVIDENCE).filter(f => f.startsWith(`v4-${course}-`) && f.endsWith('.json') && !f.includes('.candidates-'));
  const v4 = files.flatMap(f => { const o = JSON.parse(fs.readFileSync(path.join(EVIDENCE, f), 'utf8')); return o.kept.map(p => ({ ...p, region: o.region })); });
  const regions = files.map(f => JSON.parse(fs.readFileSync(path.join(EVIDENCE, f), 'utf8')).region);
  const data = loadCourse(course);
  const inRegions = (p) => regions.some(([s, e]) => p.seed_number >= s && p.seed_number <= e);
  const live = data.phrases.filter(p => inRegions(p) && p.phrase_role === 'use');
  const pools = { old: live.filter(p => p.pipeline !== 'v3'), v3: live.filter(p => p.pipeline === 'v3'), v4: v4.filter(p => p.phrase_role === 'use') };
  const items = [];
  for (const [gen, pool] of Object.entries(pools)) {
    if (!pool.length) continue;
    for (const p of sample(pool, n, rnd)) items.push({ gen, known: p.known_text, target: p.target_text, lego: `S${p.seed_number}L${p.lego_index}` });
  }
  const shuffled = sample(items, items.length, rnd).map((it, i) => ({ id: i + 1, ...it }));
  const blind = shuffled.map(({ id, known, target }) => ({ id, english: known, [LANG[course].toLowerCase()]: target }));
  fs.writeFileSync(path.join(EVIDENCE, `judge-sample-${course}.json`), JSON.stringify(blind, null, 1));
  fs.writeFileSync(path.join(EVIDENCE, `judge-key-${course}.json`), JSON.stringify(shuffled, null, 1));
  const q = `You are judging practice sentences from a ${LANG[course]} course for English speakers. Each item is an English prompt and the ${LANG[course]} sentence the learner is expected to say. Judge each item on its own, strictly, and answer for EVERY item.

For each item give: "meaning" — YES if the ${LANG[course]} says exactly what the English says, nothing added and nothing dropped, else NO with a four-word reason; "target_tier" — 1 if the ${LANG[course]} is a complete, natural sentence a native speaker would say, 2 if it is possible but clunky or needs special context, 3 if it is wrong or ungrammatical; "english_tier" — the same 1/2/3 for the English. Do not reward length or variety; judge only correctness and naturalness.

Reply with ONLY a JSON array, one object per item: [{"id":1,"meaning":"YES","target_tier":1,"english_tier":1}, ...]. Items:
${JSON.stringify(blind)}`;
  fs.writeFileSync(path.join(EVIDENCE, `judge-question-${course}.txt`), q);
  console.log(`${course}: ${Object.entries(pools).map(([k, v]) => `${k} pool ${v.length}`).join(', ')} → ${shuffled.length} blind items; question ${q.length} chars`);
  return { blind, shuffled, q };
}

module.exports = { build };
if (require.main === module) build(process.argv[2], +(process.argv[3] || 30));
