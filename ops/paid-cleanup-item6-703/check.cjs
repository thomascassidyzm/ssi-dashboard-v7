#!/usr/bin/env node
/**
 * Offline gate for the item-6 plan (cs #703·AI). NO database access: it reads a course dump made by
 * ops/paid-cleanup-scan-447/dump-course.py (Popty script-view) and a plan, applies the plan's ops
 * in memory, and runs the course-builder validator's own pure checks on every touched seed,
 * before and after, the same way POST /api/v2/validate does (routes/v2.cjs runSeedChecks):
 * tiling, LEGO containment, BUILD/USE floors, untaught vocabulary. On top of that it checks what
 * the validator does not: one known prompt → two targets anywhere in the course (ZUT, P16) for
 * every edited/inserted row, and exact duplicate rows inside a basket.
 *
 * Usage: node check.cjs <dump.json> <plan.json> <course>
 *   plan.json = [{course, ops:[{op:'seed'|'lego'|'phrase'|'delete'|'insert', id, known?, target?, lego?, role?}]}]
 * Prints JSON: {course, touchedSeeds, newIssues:[...], fixedIssues:[...], zut:[...], dups:[...]}
 */
const quiet = console.log; console.log = () => {};
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const V = require(path.join(ROOT, 'services/course-builder/lib/validation.cjs'));
const TN = require(path.join(ROOT, 'services/course-builder/lib/text-normalization.cjs'));
const { phraseContainsLego } = require(path.join(ROOT, 'services/course-builder/lib/separable-verbs.cjs'));
const { checkBuildUsePhrases } = require(path.join(ROOT, 'services/course-builder/lib/phrase-structure.cjs'));
const { isChinese } = require(path.join(ROOT, 'services/course-builder/lib/language-config.cjs'));

const [dumpPath, planPath, course] = process.argv.slice(2);
const dump = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));
const planAll = JSON.parse(fs.readFileSync(planPath, 'utf8'));
const ops = planAll.filter(p => p.course === course).flatMap(p => p.ops || []);
const chinese = isChinese(course);
const pid = p => (p.id.includes(':') ? p.id.split(':').pop() : null);

function model(d) {
  const seeds = d.seeds.map(s => ({
    n: s.n, known: s.known, target: s.target,
    legos: s.legos.map(l => ({ id: l.id, idx: l.idx, type: l.type, is_new: l.is_new, known: l.known, target: l.target,
      phrases: l.phrases.filter(p => p.type !== 'lego_debut').map(p => ({ id: pid(p), type: p.type, known: p.known, target: p.target })) })),
  }));
  return seeds;
}
const before = model(dump);
const after = JSON.parse(JSON.stringify(before));
const touched = new Set(); const editedKeys = new Set();
const find = (seeds, id) => {
  const m = /^SEED(\d+)$/.exec(id);
  for (const s of seeds) {
    if (m && s.n === +m[1]) return { s };
    for (const l of s.legos) {
      if (l.id === id) return { s, l };
      const p = l.phrases.find(x => x.id === id); if (p) return { s, l, p };
    }
  }
  return null;
};
const errors = [];
for (const o of ops) {
  if (o.op === 'insert') {
    const f = find(after, o.lego); if (!f) { errors.push(`insert: no LEGO ${o.lego}`); continue; }
    f.l.phrases.push({ id: o.id || `NEW:${o.lego}:${f.l.phrases.length}`, type: o.role || 'use', known: o.known, target: o.target, _new: true });
    touched.add(f.s.n); editedKeys.add(o.id || `NEW:${o.lego}:${f.l.phrases.length - 1}`); continue;
  }
  const f = find(after, o.id); if (!f) { errors.push(`${o.op}: no row ${o.id}`); continue; }
  touched.add(f.s.n);
  if (o.op === 'delete') { f.l.phrases = f.l.phrases.filter(p => p.id !== o.id); continue; }
  const row = f.p || f.l || f.s;
  if (o.known != null) row.known = o.known;
  if (o.target != null) row.target = o.target;
  if (o.role) row.type = o.role;
  editedKeys.add(o.id);
}

function comps(l) { return l.phrases.filter(p => p.type === 'component').map(p => ({ known: p.known, target: p.target })); }
function seedIssues(seeds) {
  const out = {}; const cum = new Set();
  const acc = (legos, set) => { for (const l of legos) { TN.extractVocab(l.target, chinese).forEach(v => set.add(v)); if (l.type === 'M') for (const c of comps(l)) TN.extractVocab(c.target, chinese).forEach(v => set.add(v)); } };
  for (const s of seeds) {
    if (touched.has(s.n)) {
      const issues = [];
      const t = V.checkTiling(s.target, s.legos.map(l => ({ target: l.target, type: l.type, components: comps(l) })), course, cum, { seedNumber: s.n });
      if (!t.valid) issues.push(`seed ${s.n} tiling: ${t.message}`);
      const vw = new Set(cum); acc(s.legos, vw);
      for (const l of s.legos) {
        if (!l.is_new) continue;
        const bu = l.phrases.filter(p => p.type === 'build' || p.type === 'use');
        const ltn = TN.normalizeForContainment(l.target);
        for (const p of bu) if (!phraseContainsLego({ courseCode: course, seedNumber: s.n, legoTarget: l.target, phraseTarget: p.target, baseline: (a, b) => TN.normalizeForContainment(b).includes(ltn) })) issues.push(`${p.id}: does not contain its LEGO ${l.id} "${l.target}"`);
        const cc = checkBuildUsePhrases({ idx: l.idx, type: l.type, known: l.known, target: l.target,
          build: bu.filter(p => p.type === 'build').map(p => ({ known: p.known, target: p.target })),
          use: bu.filter(p => p.type === 'use').map(p => ({ known: p.known, target: p.target })) }, course, s.n);
        if (!cc.valid) issues.push(`${l.id} floor: ${cc.error}`);
        for (const p of bu) {
          const vv = V.checkVocabViolations([{ target: p.target }], vw, course, { seedNumber: s.n, extraTexts: [s.target] });
          if (vv.length) issues.push(`${p.id}: untaught ${JSON.stringify(vv[0].unknown || vv[0].unknownWords || vv[0])}`);
        }
      }
      out[s.n] = issues;
    }
    acc(s.legos, cum);
  }
  return out;
}
const zn = t => TN.normalizeForZUT ? TN.normalizeForZUT(t || '') : String(t || '').toLowerCase().replace(/[^\p{L}\p{N} ]/gu, '').trim();
function zutMap(seeds) {
  const m = new Map();
  for (const s of seeds) {
    const add = (k, t, id) => { const kk = zn(k).toLowerCase(); if (!kk) return; if (!m.has(kk)) m.set(kk, new Map()); const tt = zn(t); if (!m.get(kk).has(tt)) m.get(kk).set(tt, []); m.get(kk).get(tt).push(id); };
    add(s.known, s.target, `SEED${s.n}`);
    for (const l of s.legos) { add(l.known, l.target, l.id); for (const p of l.phrases) if (p.type === 'use' || p.type === 'build') add(p.known, p.target, p.id); }
  }
  return m;
}
const bi = seedIssues(before), ai = seedIssues(after);
if (process.env.CHECK_DEBUG) for (const n of touched) process.stderr.write(`seed ${n}\n BEFORE ${JSON.stringify(bi[n])}\n AFTER ${JSON.stringify(ai[n])}\n`);
const newIssues = [], fixedIssues = [];
for (const n of touched) {
  const b = new Set(bi[n] || []), a = new Set(ai[n] || []);
  for (const x of a) if (!b.has(x)) newIssues.push(x);
  for (const x of b) if (!a.has(x)) fixedIssues.push(x);
}
const zb = zutMap(before), za = zutMap(after); const zut = [];
for (const [k, tm] of za) {
  if (tm.size < 2) continue;
  const ids = [...tm.values()].flat();
  if (!ids.some(id => editedKeys.has(id))) continue;
  const wasClash = zb.has(k) && zb.get(k).size >= 2 && [...zb.get(k).keys()].every(t => tm.has(t)) && zb.get(k).size === tm.size;
  zut.push({ known: k, targets: Object.fromEntries(tm), preexisting: !!wasClash });
}
const dups = [];
for (const s of after) for (const l of s.legos) {
  if (!l.phrases.some(p => editedKeys.has(p.id))) continue;
  const seen = new Map();
  for (const p of l.phrases.filter(p => p.type !== 'component')) { const k = zn(p.known).toLowerCase() + '|' + zn(p.target); if (seen.has(k)) dups.push([seen.get(k), p.id]); else seen.set(k, p.id); }
}
console.log = quiet;
console.log(JSON.stringify({ course, ops: ops.length, touchedSeeds: [...touched].sort((a, b) => a - b), errors, newIssues, fixedIssues, zut, dups }, null, 1));
