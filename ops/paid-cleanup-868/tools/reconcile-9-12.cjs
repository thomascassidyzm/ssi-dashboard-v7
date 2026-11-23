#!/usr/bin/env node
// cs #868 (Kai's assistant, 23 Nov, after cold-verify #867·AK): RECONCILE paid-cleanup items 9 and 12, read-only.
// Item 12's runner (ops/paid-cleanup-717/item12/night-run.sh) applied WITHOUT the seed/LEGO pre-check, and its
// "ALL DONE" counted drift/refused ops as complete. This reports, per course and per changeset:
//   - ledger fate of every op (applied / already / drift / refused / never in the ledger);
//   - whether the NIGHTLY COPY holds it now (present = the op's after-state; changed = the row is there with other
//     text or another clip; gone = an inserted/updated row no longer exists; still = a deleted row is still there);
//   - consistency of every row the op wrote, against the copy's CURRENT seed and LEGO:
//       seed_sentence_mismatch: an item-12 seed-sentence row (metadata.seed_sentence_of) whose text is not its seed's;
//       lego_not_contained: a written row whose target does not contain its LEGO's target (P17; gapped/CJK LEGOs can
//         flag falsely, so this is a reading list, not a verdict);
//       guard_moved (item 9 only, it had guards): the seed or LEGO text differs from the guard the plan recorded.
// NO DATABASE: reads changesets + ledgers from the night runners' persistent worktrees (~/.cs-long/item9, item12) and
// copy dumps made by ops/paid-cleanup-scan-447/copy-read.cjs dump (one per course, <dumpDir>/<course>.json).
//   node reconcile-9-12.cjs <dumpDir> <out.json>
const fs = require('fs');
const path = require('path');
const os = require('os');
const [dumpDir, out] = process.argv.slice(2);
const H = os.homedir();
const files = [];
const I12 = path.join(H, '.cs-long/item12/popty/ops/paid-cleanup-717/item12');
for (const c of fs.readdirSync(I12)) { const f = path.join(I12, c, 'item12.changeset.jsonl'); if (fs.existsSync(f)) files.push({ item: 12, course: c, f }); }
const I9 = path.join(H, '.cs-long/item9/popty/ops/paid-cleanup-item9');
for (const c of fs.readdirSync(I9)) {
  const d = path.join(I9, c, 'changesets'); if (!fs.existsSync(d)) continue;
  for (const n of fs.readdirSync(d).filter((x) => x.endsWith('.changeset.jsonl'))) files.push({ item: 9, course: c, f: path.join(d, n) });
}
// combining marks (Arabic harakat, Indic vowel signs) are dropped on both sides: a voweled row vs an unvoweled LEGO is the same word
const norm = (t) => String(t == null ? '' : t).normalize('NFD').replace(/[\p{M}\u0640]/gu, '').normalize('NFC').toLowerCase().replace(/[\s\p{P}]+/gu, ' ').trim();
const tight = (t) => norm(t).replace(/ /g, '');
const contains = (row, lego) => { const r = norm(row), l = norm(lego); return !l || ` ${r} `.includes(` ${l} `) || tight(row).includes(tight(lego)); };
const dumps = new Map();
function idx(course) {
  if (dumps.has(course)) return dumps.get(course);
  const f = path.join(dumpDir, `${course}.json`);
  if (!fs.existsSync(f)) { dumps.set(course, null); return null; }
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  const P = new Map(), L = new Map(), S = new Map();
  for (const s of d.seeds) { S.set(s.n, s); for (const l of s.legos) { L.set(l.id, l); for (const p of l.phrases) if (p.type !== 'lego_debut') P.set(p.id, { ...p, l, s }); else L.get(l.id).debut = p; } }
  const r = { P, L, S, copy: d.copy_db }; dumps.set(course, r); return r;
}
const SLOT = { known: 'ka', target1: 't1', target2: 't2' };
const report = { built: new Date().toISOString(), copy: null, courses: {}, findings: [] };
for (const { item, course, f } of files) {
  const lines = fs.readFileSync(f, 'utf8').split('\n').filter((l) => l.trim());
  const header = JSON.parse(lines[0]); const ops = lines.slice(1).map((l) => JSON.parse(l));
  const fate = new Array(ops.length).fill('not_in_ledger');
  const lf = `${f}.applied.jsonl`;
  if (fs.existsSync(lf)) for (const l of fs.readFileSync(lf, 'utf8').split('\n').filter(Boolean)) {
    const e = JSON.parse(l); for (const i of e.ops || []) if (i < ops.length) fate[i] = e.status;
  }
  const gf = f.replace(/\.changeset\.jsonl$/, '.guards.json');
  const guards = fs.existsSync(gf) ? JSON.parse(fs.readFileSync(gf, 'utf8')).guards : null;
  const X = idx(course);
  if (X) report.copy = X.copy;
  const key = `${course}|item${item}|${path.basename(f)}`;
  const C = report.courses[key] = { item, course, file: path.relative(H, f), ops: ops.length, fate: {}, copy_state: {}, inconsistent: 0, no_dump: !X };
  ops.forEach((o, i) => {
    C.fate[fate[i]] = (C.fate[fate[i]] || 0) + 1;
    if (!X) return;
    let state = 'n/a', row = null;
    if (o.op === 'phrase.insert') { row = X.P.get(o.row.id); state = !row ? 'gone' : (norm(row.known) === norm(o.row.known_text) && norm(row.target) === norm(o.row.target_text) ? 'present' : 'changed'); }
    else if (o.op === 'phrase.delete') { state = X.P.has(o.phrase_id) ? 'still' : 'present'; }
    else if (o.op === 'phrase.update') { row = X.P.get(o.phrase_id); const s = o.set || {};
      state = !row ? 'gone' : ((s.known_text == null || norm(row.known) === norm(s.known_text)) && (s.target_text == null || norm(row.target) === norm(s.target_text)) ? 'present' : 'changed'); }
    else if (o.op === 'lego.update') { const l = X.L.get(o.lego_id); const s = o.set || {};
      state = !l ? 'gone' : ((s.known_text == null || norm(l.known) === norm(s.known_text)) && (s.target_text == null || norm(l.target) === norm(s.target_text)) ? 'present' : 'changed'); }
    else if (o.op === 'audio.link') {
      const r = o.target === 'phrase' ? X.P.get(o.phrase_id) : (o.target === 'lego' ? (X.L.get(o.lego_id) || {}).debut : null);
      state = !r ? (o.target === 'seed' ? 'n/a' : 'gone') : (r[SLOT[o.slot]] === o.audio_id ? 'present' : (r[SLOT[o.slot]] ? 'changed' : 'empty'));
    }
    C.copy_state[state] = (C.copy_state[state] || 0) + 1;
    const why = [];
    if (row && fate[i] !== 'drift' && fate[i] !== 'refused') {
      const meta = (o.row && o.row.metadata) || {};
      if (meta.seed_sentence_of) { const s = X.S.get(meta.seed_sentence_of);
        if (s && (norm(row.known) !== norm(s.known) || norm(row.target) !== norm(s.target))) why.push({ kind: 'seed_sentence_mismatch', seed: [s.known, s.target] }); }
      if (!contains(row.target, row.l.target)) why.push({ kind: 'lego_not_contained', lego: [row.l.id, row.l.known, row.l.target] });
      if (guards && guards[i]) { const g = guards[i]; const s = X.S.get(g.seed_number); const l = X.L.get(g.lego_id);
        if (s && (norm(s.known) !== norm(g.seed.known_text) || norm(s.target) !== norm(g.seed.target_text))) why.push({ kind: 'guard_moved', what: 'seed', copy: [s.known, s.target], planned: [g.seed.known_text, g.seed.target_text] });
        if (l && !g.lego.some((x) => norm(l.known) === norm(x.known_text) && norm(l.target) === norm(x.target_text))) why.push({ kind: 'guard_moved', what: 'lego', copy: [l.known, l.target], planned: [g.lego[0].known_text, g.lego[0].target_text] }); }
    }
    if (why.length || ['drift', 'refused', 'not_in_ledger'].includes(fate[i]) || ['changed', 'gone', 'still', 'empty'].includes(state)) {
      if (why.length) C.inconsistent++;
      report.findings.push({ course, item, file: path.basename(f), i, op: o.op, id: o.phrase_id || (o.row && o.row.id) || o.lego_id, slot: o.slot, fate: fate[i], copy_state: state,
        text: row ? [row.known, row.target] : undefined, why: why.length ? why : undefined });
    }
  });
}
fs.writeFileSync(out, JSON.stringify(report, null, 1));
const sum = {}; for (const c of Object.values(report.courses)) { const k = `item${c.item}`; sum[k] ||= { files: 0, ops: 0, fate: {}, copy_state: {}, inconsistent: 0 };
  const s = sum[k]; s.files++; s.ops += c.ops; s.inconsistent += c.inconsistent;
  for (const [a, b] of Object.entries(c.fate)) s.fate[a] = (s.fate[a] || 0) + b; for (const [a, b] of Object.entries(c.copy_state)) s.copy_state[a] = (s.copy_state[a] || 0) + b; }
console.log(JSON.stringify(sum, null, 1), '\nfindings', report.findings.length, 'copy', report.copy);
