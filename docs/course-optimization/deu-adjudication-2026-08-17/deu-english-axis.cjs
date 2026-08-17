#!/usr/bin/env node
/**
 * deu-english-axis.cjs — the LEARNER'S-SHOES axis for eng_for_deu.
 *
 * eng_for_deu teaches ENGLISH to German speakers. known_lang=deu is the PROMPT; target_lang=eng
 * is what the learner produces. A native German speaker is never puzzled by a German word as
 * such — so the known-side gate's "this German word is not introduced yet" only bites for one
 * reason, and it is the ZUT reason: if that German word has no established German→English
 * mapping yet, the learner cannot know which English word is wanted.
 *
 * That makes the decisive question for every finding: **is the ENGLISH the prompt demands
 * already taught at this seed?** This script computes that, with light English stemming, and
 * cross-tabs it against the morphology verdict from deu-tier1.cjs.
 *
 *   English covered  + German form-variant  -> TIER 1 (reach for the closest thing, succeed)
 *   English covered  + German new lexeme    -> tier 1/2 boundary: they know the answer word
 *   English MISSING                          -> tier 2/3: no reach is available at all
 */
const fs = require('fs');
const path = require('path');
const d = JSON.parse(fs.readFileSync(path.join(__dirname, 'deu-findings.json'), 'utf8'));
const C = JSON.parse(fs.readFileSync(path.join(__dirname, 'deu-classified.json'), 'utf8'));
const legos = JSON.parse(fs.readFileSync(path.join(__dirname, 'deu-legos.json'), 'utf8'));

// English function words: supplied by the method as structure, not as vocabulary to be reached for.
const STOP = new Set(('a an the to of for with in at on i you he she it we they me him her us them my your his hers '
  + 'its their our mine yours theirs is am are was were be been being do does did doing done not no nor and or but '
  + 'if that this these those what which who whom whose when where why how so very just too also then than as up '
  + 'out about would could should shall will can may might must have has had s t re ll ve m d don doesn didn isn '
  + 'aren wasn weren won can cannot wouldn couldn shouldn haven hasn hadn some any more most all one there here '
  + 'because while before after again already yet still only ever never own such each both other else own').split(/\s+/));

/** Light English stemmer — enough to unify speak/speaking/speaks, like/liked, try/tries. */
function stem(w) {
  let s = w.toLowerCase().replace(/[^a-z]/g, '');
  if (s.length <= 3) return s;
  for (const [re, rep] of [[/ies$/, 'y'], [/ying$/, 'ie'], [/ing$/, ''], [/ied$/, 'y'],
    [/eed$/, 'eed'], [/ed$/, ''], [/es$/, ''], [/s$/, '']]) {
    if (re.test(s)) { s = s.replace(re, rep); break; }
  }
  return s.replace(/([^aeiou])\1$/, '$1').replace(/e$/, '');
}
const content = (t) => [...new Set((String(t || '').toLowerCase().match(/[a-z']+/g) || [])
  .filter(w => !STOP.has(w)).map(stem).filter(s => s.length > 1))];

// earliest seed each English content stem is TAUGHT at (lego target_text = the English)
const enFirst = new Map();
for (const l of legos) {
  for (const s of content(l.target_text)) {
    if (!enFirst.has(s) || enFirst.get(s) > l.seed_number) enFirst.set(s, l.seed_number);
  }
}

const morphOf = new Map();
for (const r of C.tier1) morphOf.set(r.phrase_id + '|' + r.problem, r.morph);

const rows = d.findings.filter(f => f.token).map(f => {
  const need = content(f.target);
  const missing = need.filter(s => !enFirst.has(s) || enFirst.get(s) > f.seed);
  return {
    ...f,
    morph: morphOf.get(f.phrase_id + '|' + f.problem) || null,
    en_missing: missing,
    en_missing_debuts: missing.map(s => `${s}${enFirst.has(s) ? '@S' + enFirst.get(s) : '@never'}`),
  };
});

const cell = (r) => (r.morph ? 'form-variant' : 'new-lexeme') + ' / ' + (r.en_missing.length ? 'ENGLISH-MISSING' : 'english-ok');
const tab = {};
for (const r of rows) tab[cell(r)] = (tab[cell(r)] || 0) + 1;
console.log('=== CROSS-TAB (486 findings) ===');
for (const [k, v] of Object.entries(tab).sort((a, b) => b[1] - a[1])) console.log(String(v).padStart(4), k);

const bad = rows.filter(r => r.en_missing.length);
console.log(`\n=== ENGLISH-MISSING: ${bad.length} findings over ${new Set(bad.map(r => r.phrase_id)).size} distinct phrases ===`);
const byPhrase = new Map();
for (const r of bad) {
  if (!byPhrase.has(r.phrase_id)) byPhrase.set(r.phrase_id, { r, toks: [] });
  byPhrase.get(r.phrase_id).toks.push(r.token);
}
for (const [pid, { r, toks }] of [...byPhrase].sort((a, b) => a[1].r.seed - b[1].r.seed)) {
  console.log(`S${String(r.seed).padStart(3)} ${pid}  [${r.role}]  german-tokens=${toks.join(',')} ${r.morph ? '(form-variant)' : '(new-lexeme)'}`);
  console.log(`      DE "${r.known}"`);
  console.log(`      EN "${r.target}"   <-- untaught English: ${r.en_missing_debuts.join(', ')}`);
}
fs.writeFileSync(path.join(__dirname, 'deu-english-axis.json'), JSON.stringify(rows, null, 2));
