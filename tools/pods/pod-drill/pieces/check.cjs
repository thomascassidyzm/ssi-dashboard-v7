#!/usr/bin/env node
// Data check over piece plans, against the live pod text (Popty pod-scripts, read-only). Not a test suite.
//   node tools/pods/pod-drill/pieces/check.cjs [course ...]     (default: every plan in ops/pod-drill)
// plan.throughScene bounds the plan (default 10).
// RED: a turn missing or unknown; pieces that do not join back to the turn's own text on either side
//      (whitespace aside, so spaceless scripts work); an empty piece; a parenthesis in any piece.
// plan.approvedExceptions: turn ids Tom approved by ear that do not join back; reported as warn, never edited here.
// RED (job #577): English pieces that are not exactly the master's (_eng-shared/split.txt) or listed joins of
//      neighbouring master pieces: master.cjs, the same rule wire-staging.cjs refuses on.
// WARN: a lone word beside a sibling four times its length, for a human to re-read. Not a failure.
const fs = require('fs'), path = require('path');
const { DATA: dir } = require('./paths.cjs');
const master = require('./master.cjs');
const squash = (s) => String(s).replace(/\s+/g, '');
const lone = (s) => !/\s/.test(s.trim()) && squash(s).length <= 8;
async function check(course) {
  const plan = JSON.parse(fs.readFileSync(path.join(dir, course, 'plan.json'), 'utf8'));
  const d = await (await fetch(`http://localhost:3470/api/pod-scripts/${plan.course}`)).json();
  const lines = new Map();
  for (const s of d.scenes) for (const l of s.lines) if (l.scene_number <= (plan.throughScene || 10)) lines.set(l.id.split(':').pop(), l);
  const red = [], warn = [], seen = new Set();
  let pieces = 0, whole = 0;
  for (const t of plan.turns) {
    const l = lines.get(t.id);
    if (!l) { red.push(`${t.id}: not a turn of scenes 1-10`); continue; }
    if (seen.has(t.id)) red.push(`${t.id}: listed twice`);
    seen.add(t.id);
    const english = master.englishSide(plan.course) === 0 ? l.target_text : l.known_text;
    red.push(...master.checkTurn(plan.course, plan, t, english).red);
    if (t.whole) { whole++; continue; }
    if (!Array.isArray(t.pieces) || t.pieces.length < 2) { red.push(`${t.id}: needs "whole" or at least two pieces`); continue; }
    pieces += t.pieces.length;
    for (const [side, i, text] of [['target', 0, l.target_text], ['known', 1, l.known_text]]) {
      const got = t.pieces.map((p) => p[i]);
      if (got.some((p) => !p || !p.trim())) red.push(`${t.id}: empty ${side} piece`);
      if (got.some((p) => /[()（）]/.test(p))) red.push(`${t.id}: parenthesis in ${side}`);
      if (squash(got.join('')) !== squash(text)) (plan.approvedExceptions || []).includes(t.id) ? warn.push(`${t.id}: approved exception, ${side} does not join back`) : red.push(`${t.id}: ${side} does not join back\n    text:   ${text}\n    pieces: ${got.join(' || ')}`);
      const longest = Math.max(...got.map((p) => squash(p).length));
      for (const p of got) if (lone(p) && longest >= 4 * squash(p).length && squash(text).length > 12) warn.push(`${t.id}: lone ${side} word "${p}" beside a long sibling`);
    }
  }
  for (const id of lines.keys()) if (!seen.has(id)) red.push(`${id}: no entry in the plan`);
  for (const id of Object.keys(plan.joins || {})) if (!seen.has(id)) red.push(`${id}: listed in plan.joins but not a turn of the plan`);
  return { course: plan.course, red, warn, pieces, whole, turns: plan.turns.length, of: lines.size };
}
(async () => {
  const args = process.argv.slice(2);
  const courses = args.length ? args : fs.readdirSync(dir).filter((f) => fs.existsSync(path.join(dir, f, 'plan.json')));
  let bad = 0;
  for (const c of courses) {
    const r = await check(c);
    console.log(`${r.red.length ? 'RED ' : 'ok  '} ${r.course}: ${r.turns}/${r.of} turns, ${r.whole} whole, ${r.pieces} pieces, ${r.red.length} red, ${r.warn.length} warn`);
    for (const m of r.red) console.log('  RED  ' + m);
    for (const m of r.warn) console.log('  warn ' + m);
    bad += r.red.length;
  }
  process.exit(bad ? 1 : 0);
})();
