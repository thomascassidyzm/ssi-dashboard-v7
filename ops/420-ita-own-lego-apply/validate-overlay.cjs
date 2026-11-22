#!/usr/bin/env node
// cs #420·AK: Kai's cleanup default (validator + rebuild) for the own-LEGO changesets, on the COPY only.
//   node validate-overlay.cjs reqs <course> <baskets.json> <out-requests.json>
//     request 0 = the course as the copy holds it; then one request per touched seed with that seed's phrases
//     overridden by the changeset (re-words replace, deletes drop), fromSeed = that seed. Feed to:
//     node ops/paid-cleanup-scan-447/copy-read.cjs validate <course> <requests.json> <answers.json>
//   node validate-overlay.cjs diff <course> <out-requests.json> <answers.json>
//     prints every failure in a touched seed that the baseline does not have (exit 1 if any).
const fs = require('fs'), path = require('path');
const cs = require('../../services/shared/changeset.cjs');
const [mode, course, a, b] = process.argv.slice(2);
const file = path.join(__dirname, course, 'changesets', 'own-lego-420.changeset.jsonl');
const { ops } = cs.read(file);
if (mode === 'reqs') {
  const rows = Object.values(JSON.parse(fs.readFileSync(a, 'utf8'))).flat();
  const byOp = new Map(ops.map((o) => [o.phrase_id, o]));
  const seeds = [...new Set(ops.map((o) => Number(o.phrase_id.split(':')[1].slice(1, 5))))].sort((x, y) => x - y);
  const reqs = [{ fromSeed: 0 }];
  for (const n of seeds) {
    const phrases = {};
    for (const r of rows.filter((r) => r.seed_number === n)) {
      const o = byOp.get(r.id);
      if (o && o.op === 'phrase.delete') continue;
      const p = { seed_number: n, lego_index: r.lego_index, known_text: r.known_text, target_text: r.target_text, phrase_role: r.phrase_role };
      if (o) Object.assign(p, { known_text: o.set.known_text ?? p.known_text, target_text: o.set.target_text });
      (phrases[`${n}:${r.lego_index}`] ||= []).push(p);
    }
    reqs.push({ fromSeed: n, override: { seed_number: n, phrases } });
  }
  fs.writeFileSync(b, JSON.stringify(reqs)); console.log(`${course}: ${reqs.length - 1} touched seed(s) + baseline -> ${b}`);
} else if (mode === 'diff') {
  const reqs = JSON.parse(fs.readFileSync(a, 'utf8')), ans = JSON.parse(fs.readFileSync(b, 'utf8'));
  const key = (s, i) => `${s}|${JSON.stringify(i)}`;
  const base = new Set(ans[0].failures.flatMap((f) => f.issues.map((i) => key(f.seed, i))));
  let neu = 0, gone = 0;
  reqs.forEach((rq, k) => {
    if (!k) return;
    const n = rq.override.seed_number;
    const mine = (ans[k].failures.find((f) => f.seed === n) || { issues: [] }).issues;
    const before = (ans[0].failures.find((f) => f.seed === n) || { issues: [] }).issues;
    for (const i of mine) if (!base.has(key(n, i))) { neu++; console.log(`NEW seed ${n}:`, JSON.stringify(i).slice(0, 300)); }
    const m = new Set(mine.map((i) => JSON.stringify(i)));
    for (const i of before) if (!m.has(JSON.stringify(i))) { gone++; console.log(`CLEARED seed ${n}:`, JSON.stringify(i).slice(0, 200)); }
  });
  console.log(`${course}: ${neu} new failure(s), ${gone} cleared, baseline course failures ${ans[0].failures.length} seed(s)`);
  process.exit(neu ? 1 : 0);
}
