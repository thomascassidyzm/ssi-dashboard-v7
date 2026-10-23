#!/usr/bin/env node
'use strict';
// READ-ONLY census (job #892, Aran 2026-10-23): standalone intros — LEGOs and their components —
// in cym_nv2/sv2 whose FIRST word is taught in a mutated form (soft, nasal or aspirate).
// Evidence rule, so a radical b-/d-/g- word is not called mutated by spelling alone: the
// radical it would come from must itself be ATTESTED as a word somewhere in the same course
// (any seed, LEGO, component or phrase). Input: the /seeds?status=all JSON saved per course
// (curl -H 'x-agent-id: …' "$POPTY/api/production/<course>/seeds?status=all" -o <course>.json).
// Usage: node census-mutated-intros.cjs <dir-with-course-json> > census.json
const fs = require('fs');
const dir = process.argv[2] || '.';

const SOFT = [['dd', ['d']], ['ll', []], ['rh', []], ['ch', []], ['ph', []], ['th', []], ['ng', []],
  ['b', ['p']], ['d', ['t']], ['g', ['c']], ['f', ['b', 'm']], ['l', ['ll']], ['r', ['rh']]];
const NASAL = [['ngh', ['c']], ['mh', ['p']], ['nh', ['t']], ['ng', ['g']], ['m', ['b']], ['n', ['d']]];
const ASP = [['ch', ['c']], ['ph', ['p']], ['th', ['t']]];
const VOWEL = /^[aeiouwyâêîôûŵŷ]/;
const norm = (w) => String(w || '').toLowerCase().replace(/[’‘`´]/g, "'").replace(/^[^\p{L}']+|[^\p{L}']+$/gu, '');
const words = (t) => String(t || '').split(/\s+/).map(norm).filter(Boolean);

function radicals(w) {
  const out = [];
  const take = (table, kind) => {
    for (const [m, rs] of table) if (w.startsWith(m)) { for (const r of rs) out.push({ kind, radical: r + w.slice(m.length) }); return; }
  };
  take(SOFT, 'soft'); take(NASAL, 'nasal'); take(ASP, 'aspirate');
  if (VOWEL.test(w)) out.push({ kind: 'soft', radical: 'g' + w });
  if (/^h[aeiouwyâêîôûŵŷ]/.test(w)) out.push({ kind: 'aspirate(h-)', radical: w.slice(1) });
  return out.filter((r) => r.radical !== w && r.radical.length > 1);
}

// Hand-read classes of first word (job #892). NOT_MUTATED: a radical word that only LOOKS like a
// mutation of another attested word (ar/gar, ma/ba, es i = I went). GRAMMATICAL: forms the course
// teaches mutated on purpose — a verb whose mi/fe particle is dropped (fedri, fydd, ddylet, allen,
// ddwedodd, chlywes), lexicalised function words (fod, ddim, beth, well) and time adverbials
// (ddydd Llun, fore, bnawn, bryd hynny). Everything else is CONTENT: a word mutated by a trigger
// that is not part of the intro — the class Aran's ruling is aimed at (banad o goffi).
const NOT_MUTATED = new Set(['ar', 'o', 'a', 'ei', 'na', 'nad', 'mai', 'ma', 'du', 'hyn', 'her', 'hardd', "hi'n", 'awn', 'gall',
  'chi', 'ni', 'di', 'dan', 'dde', 'dydy', 'dydyn', 'fi', 'es', 'est']);
const GRAMMATICAL = /^(fod|ddim|beth|well|fedr(i|a|an|wn)|fydd\S*|fyddai\S*|fydda|fyddet|fyddwn|fyddan|fydden|fyddi|ddyl(et|en|wn|ai)|all(en|i|a|et|ai)?|chlywes|ddwedodd|wela|ddydd|fore|bnawn|bryd)$/;
const classOf = (w) => (NOT_MUTATED.has(w) ? 'not_mutated' : GRAMMATICAL.test(w) ? 'grammatical' : 'content');

const report = {};
for (const c of ['cym_nv2_for_eng', 'cym_sv2_for_eng']) {
  const d = JSON.parse(fs.readFileSync(`${dir}/${c}.json`, 'utf8'));
  const vocab = new Set();
  const add = (t) => words(t).forEach((w) => vocab.add(w));
  for (const s of d.seeds) {
    add(s.target_text);
    for (const l of s.legos) { add(l.target_text); (l.components || []).forEach((k) => add(k.target)); (l.basket_phrases || []).forEach((p) => add(p.target_text)); }
  }
  const hits = [];
  const check = (kind, id, text, known, isNew, hasTake) => {
    const w = words(text)[0];
    if (!w) return;
    const rs = radicals(w).filter((r) => vocab.has(r.radical));
    if (rs.length) hits.push({ class: classOf(w), kind, id, text, known, first: w, from: rs.map((r) => `${r.radical} (${r.kind})`).join(', '), is_new: isNew, has_take: hasTake });
  };
  for (const s of d.seeds) for (const l of s.legos) {
    check('lego', l.lego_id, l.target_text, l.known_text, l.is_new, !!(l.target1_audio_id || l.target2_audio_id));
    (l.components || []).forEach((k, i) => check('component', `${l.lego_id}#${i}`, k.target, k.known, l.is_new, null));
  }
  const tally = {};
  for (const h of hits) {
    const t = (tally[h.class] = tally[h.class] || { legos: 0, legos_new: 0, components: 0, distinct_texts: new Set() });
    if (h.kind === 'lego') { t.legos++; if (h.is_new) t.legos_new++; } else t.components++;
    t.distinct_texts.add(h.text.toLowerCase());
  }
  for (const t of Object.values(tally)) t.distinct_texts = t.distinct_texts.size;
  report[c] = { tally, hits };
}
process.stdout.write(JSON.stringify(report, null, 1));
