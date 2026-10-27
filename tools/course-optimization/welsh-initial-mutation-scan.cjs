#!/usr/bin/env node
'use strict';
// Read-only scan (job #343, Aran's rule: a mutation is not carried at the START of a phrase
// unless the phrase itself triggers it). Reads Popty's GET /api/production/:course/seeds dumps
// (--data a.json,b.json) and lists every seed / LEGO / component / phrase whose Welsh STARTS
// with a soft-mutated verb form. Writes nothing; no database access.
const fs = require('fs');
const norm = (t) => String(t || '').normalize('NFC').replace(/[’‘]/g, "'");
// first word -> unmutated proposal
const MAP = { fyddai: 'byddai', fydd: 'bydd', fyddwn: 'byddwn', fyddan: 'byddan', fydden: 'byddem'.replace('em', 'en'), fyddet: 'byddet',
  fasai: 'basai', fasen: 'basen', fasech: 'basech', fedra: 'medra', fedri: 'medri', fedrith: 'medrith', fedrwn: 'medrwn',
  ddylet: 'dylet', ddylwn: 'dylwn', ddylai: 'dylai', ddylen: 'dylen', ddylech: 'dylech', gaf: 'caf', gallwn: 'allwn' };
// 'gallwn'->'allwn' is not an unmutation of a soft mutation in the same direction; handled below by the draft review only.
delete MAP.gallwn; delete MAP.gaf; // g-dropping and gaf are Aran's call: listed separately, see EXTRA
const EXTRA = { gaf: 'caf', fues: 'bues', wnes: 'gwnes', wnaeth: 'gwnaeth', wnaf: 'gwnaf', wnawn: 'gwnawn' };
// leading words that make a mutation legitimate (trigger precedes) are simply not first, so a first-word test suffices;
// 'fe'/'mi' affirmative markers dropped are exactly the case we want.
function proposal(t) {
  const s = String(t || ''); const m = s.match(/^(\S+)(.*)$/s); if (!m) return null; // raw text: keep its curly apostrophes
  const w = norm(m[1]).toLowerCase().replace(/[.,;:!?]+$/, '');
  const repl = MAP[w] || EXTRA[w]; if (!repl) return null;
  const cap = m[1][0] !== m[1][0].toLowerCase();
  const r = (cap ? repl[0].toUpperCase() + repl.slice(1) : repl) + m[1].slice(w.length);
  return { first: w, text: r + m[2], tier: MAP[w] ? 'verb' : 'extra' };
}
function* rows(course, seeds) {
  for (const s of seeds) {
    yield { course, kind: 'seed', id: s.seed_id, known: s.known_text, target: s.target_text, recorded: !!(s.target1_audio_id || s.target2_audio_id), key: { seed_number: s.seed_number } };
    for (const l of s.legos || []) {
      yield { course, kind: 'lego', id: l.lego_id, known: l.known_text, target: l.target_text, recorded: !!(l.target1_audio_id || l.target2_audio_id), key: { lego_id: l.lego_id } };
      if (Array.isArray(l.components)) for (const [i, c] of l.components.entries()) if (c && c.target && c.target !== l.target_text) yield { course, kind: 'component', id: `${l.lego_id}#c${i}`, known: c.known, target: c.target, recorded: false, key: { lego_id: l.lego_id } };
      for (const p of l.basket_phrases || []) yield { course, kind: 'phrase', id: p.id, known: p.known_text, target: p.target_text, recorded: !!(p.target1_audio_id || p.target2_audio_id), key: { phrase_id: p.id } };
    }
  }
}
function scan(files) {
  const out = [];
  for (const f of files) {
    const d = JSON.parse(fs.readFileSync(f, 'utf8'));
    for (const r of rows(d.courseCode, d.seeds)) { const p = proposal(r.target); if (p) out.push({ ...r, ...p }); }
  }
  return out;
}
module.exports = { proposal, scan, rows };
if (require.main === module) {
  const i = process.argv.indexOf('--data'); const o = scan(process.argv[i + 1].split(','));
  fs.writeFileSync(process.argv[process.argv.indexOf('--out') + 1], JSON.stringify(o, null, 1));
  const by = {}; for (const r of o) { const k = `${r.course} ${r.kind} ${r.first}`; by[k] = (by[k] || 0) + 1; }
  console.log(o.length, JSON.stringify(by, null, 1));
}

// Genuine triggers the scan cannot see in the Welsh itself: a question (dropped 'a') and a negative
// (dropped 'ni') both soft-mutate the verb, so those lines are NOT drafted for unmutating.
const isQuestion = (r) => /\?\s*$/.test(r.known) || /\?\s*$/.test(r.target) ||
  /^(can|could|will|would|do|does|did|is|are|was|were|should|shall|how|what|why|where|when|who|which|have|has|had|may|might)\b/i.test(String(r.known).trim());
const isNegative = (r) => /\b(n't|not|never|no one|nobody|nothing|nowhere|cannot|without)\b|n’t/i.test(r.known) || /\bddim\b|\bfyth\b/i.test(r.target);
/** Round-robin across course/kind/first-word buckets so a capped page still shows every shape. */
function sample(rows, n) {
  const b = new Map();
  for (const r of rows) { const k = `${r.course}|${r.kind}|${r.first}`; (b.get(k) || b.set(k, []).get(k)).push(r); }
  const lists = [...b.values()]; const out = [];
  for (let i = 0; out.length < n && lists.some((l) => l[i]); i++) for (const l of lists) if (l[i] && out.length < n) out.push(l[i]);
  return out;
}
module.exports.isQuestion = isQuestion; module.exports.isNegative = isNegative; module.exports.sample = sample;
