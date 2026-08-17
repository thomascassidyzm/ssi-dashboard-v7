#!/usr/bin/env node
/**
 * deu-tier1.cjs — TIER-1 classifier for the eng_for_deu known-side findings.
 *
 * Kai's frame (2026-08-17): TIER 1 = "an uninstructed FORM of a word the learner knows".
 * So the question for every finding is NOT "is this token in the inventory" (the gate already
 * said no) but: **as of this phrase's seed, has the learner been given SOME form of this lexeme?**
 * If yes, they reach for the closest thing they know and are pleasantly surprised → fine.
 *
 * Two independent signals, both reported so a human can see WHY a pairing was made:
 *
 *  (A) MORPHOLOGY — German-specific, string-level, umlaut-folded:
 *      verb endings, ge-…-t/-en participle circumfix, separable prefix + zu-infix,
 *      adjective/determiner declension, noun plural/case, and known ablaut classes.
 *  (B) ENGLISH GLOSS — the known side is German, the target side English. If a lego taught
 *      earlier carries the same English content word this phrase's English uses, the concept
 *      is already the learner's. This catches the ablaut pairs morphology cannot see
 *      (war←sein, dachte←denken, weiß←wissen).
 *
 * A finding is TIER-1 CANDIDATE if either signal pairs it to a stem whose debut <= its seed.
 * Everything else drops to the remainder for learner's-shoes adjudication. The pairings are
 * PRINTED for hand review — this script proposes, it never decides.
 */
const fs = require('fs');
const path = require('path');
const d = JSON.parse(fs.readFileSync(path.join(__dirname, 'deu-findings.json'), 'utf8'));

const fold = (s) => s.toLowerCase()
  .replace(/äu/g, 'au').replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u')
  .replace(/ß/g, 'ss');

// debut seed for every taught stem
const debut = new Map(d.inventory.map(i => [i.stem, i.debut]));

// Ablaut / irregular families that share NO reliable string. Each family is one lexeme.
// Hand-built from the German strong-verb classes + the contract's own umlautIsPartOfTheStem list.
const FAMILIES = [
  ['sein', 'bin', 'bist', 'ist', 'sind', 'seid', 'war', 'warst', 'waren', 'wart', 'wäre', 'wärst', 'wären', 'gewesen'],
  ['haben', 'habe', 'hast', 'hat', 'habt', 'hatte', 'hattest', 'hatten', 'hattet', 'hätte', 'hätten', 'hättest', 'gehabt'],
  ['werden', 'werde', 'wirst', 'wird', 'werdet', 'wurde', 'wurden', 'würde', 'würdest', 'würden', 'geworden'],
  ['wissen', 'weiß', 'weißt', 'wisst', 'wusste', 'wusstest', 'wussten', 'gewusst'],
  ['denken', 'denke', 'denkst', 'denkt', 'dachte', 'dachten', 'gedacht'],
  ['finden', 'finde', 'findest', 'findet', 'fand', 'fanden', 'gefunden'],
  ['gehen', 'gehe', 'gehst', 'geht', 'ging', 'gingen', 'gegangen'],
  ['geben', 'gebe', 'gibst', 'gibt', 'gab', 'gaben', 'gegeben'],
  ['nehmen', 'nehme', 'nimmst', 'nimmt', 'nahm', 'nahmen', 'genommen'],
  ['sprechen', 'spreche', 'sprichst', 'spricht', 'sprach', 'sprachen', 'gesprochen'],
  ['treffen', 'treffe', 'triffst', 'trifft', 'traf', 'trafen', 'getroffen'],
  ['helfen', 'helfe', 'hilfst', 'hilft', 'half', 'halfen', 'geholfen', 'hilfe'],
  ['sehen', 'sehe', 'siehst', 'sieht', 'sah', 'sahen', 'gesehen'],
  ['trinken', 'trinke', 'trinkst', 'trinkt', 'trank', 'tranken', 'getrunken'],
  ['kommen', 'komme', 'kommst', 'kommt', 'kam', 'kamen', 'gekommen'],
  ['bekommen', 'bekomme', 'bekommst', 'bekommt', 'bekam', 'bekommen'],
  ['fahren', 'fahre', 'fährst', 'fährt', 'fuhr', 'fuhren', 'gefahren'],
  ['tun', 'tue', 'tust', 'tut', 'tat', 'getan'],
  ['können', 'kann', 'kannst', 'könnt', 'konnte', 'konntest', 'konnten', 'könnte', 'könntest', 'gekonnt'],
  ['müssen', 'muss', 'musst', 'müsst', 'musste', 'musstest', 'mussten', 'müsste', 'gemusst'],
  ['sollen', 'soll', 'sollst', 'sollt', 'sollte', 'solltest', 'sollten', 'gesollt'],
  ['wollen', 'will', 'willst', 'wollt', 'wollte', 'wolltest', 'wollten', 'gewollt'],
  ['dürfen', 'darf', 'darfst', 'dürft', 'durfte', 'dürfte', 'gedurft'],
  ['mögen', 'mag', 'magst', 'mögt', 'mochte', 'möchte', 'möchtest', 'möchten', 'gemocht'],
  ['essen', 'esse', 'isst', 'esst', 'aß', 'gegessen'],
  ['lesen', 'lese', 'liest', 'lest', 'las', 'gelesen'],
  ['schlafen', 'schlafe', 'schläfst', 'schläft', 'schlief', 'geschlafen'],
  ['bitten', 'bitte', 'bittest', 'bittet', 'bat', 'gebeten'],
  ['bleiben', 'bleibe', 'bleibst', 'bleibt', 'blieb', 'geblieben'],
  ['gut', 'gute', 'guter', 'gutes', 'guten', 'gutem', 'besser', 'bessere', 'besten', 'beste'],
  ['viel', 'viele', 'vielen', 'mehr', 'meisten'],
  ['gern', 'gerne', 'lieber', 'liebsten'],
  ['lang', 'lange', 'langen', 'länger', 'längsten'],
  ['hoch', 'hohe', 'höher'],
  ['nah', 'nahe', 'näher', 'nächste', 'nächsten'],
  ['meinen', 'meine', 'meinst', 'meint', 'gemeint'],   // the VERB 'mean' (homograph of the possessive)
];
const famOf = new Map();
FAMILIES.forEach((f, i) => f.forEach(w => { if (!famOf.has(w)) famOf.set(w, i); }));

const SEP_PREFIXES = ['an', 'auf', 'aus', 'ab', 'ein', 'mit', 'nach', 'vor', 'zu', 'zurück',
  'fern', 'weg', 'her', 'hin', 'los', 'um', 'wieder', 'bei', 'durch', 'über', 'unter', 'fest', 'frei'];
const VERB_ENDS = ['est', 'test', 'eten', 'etet', 'ten', 'tet', 'te', 'st', 'et', 'en', 'et', 't', 'e'];
const ADJ_ENDS = ['ere', 'eren', 'erem', 'erer', 'eres', 'sten', 'ste', 'er', 'es', 'en', 'em', 'e', 's'];
const NOUN_ENDS = ['ern', 'en', 'er', 'es', 'n', 'e', 's'];

// Strip a list of suffixes, longest first, returning all candidate bases (incl. the word itself).
function bases(w, ends) {
  const out = new Set([w]);
  for (const e of [...ends].sort((a, b) => b.length - a.length)) {
    if (w.length > e.length + 2 && w.endsWith(e)) out.add(w.slice(0, -e.length));
  }
  return [...out];
}

/** Every plausible lexeme-key for a German surface form, folded. */
function keys(word) {
  const w = word.toLowerCase();
  const out = new Set();
  const add = (s) => { if (s && s.length >= 2) out.add(fold(s)); };
  add(w);
  // family
  if (famOf.has(w)) out.add(`fam:${famOf.get(w)}`);
  // verb / adj / noun stems
  for (const b of bases(w, VERB_ENDS)) add(b);
  for (const b of bases(w, ADJ_ENDS)) add(b);
  for (const b of bases(w, NOUN_ENDS)) add(b);
  // participle ge-…-t / ge-…-en
  let m = /^ge(.+?)(t|en)$/.exec(w);
  if (m) { add(m[1]); add(m[1] + 'en'); }
  // separable prefix + zu-infix:  an+zu+fangen -> anfangen
  for (const p of SEP_PREFIXES) {
    if (w.startsWith(p + 'zu')) { add(p + w.slice(p.length + 2)); add(w.slice(p.length + 2)); }
    // bare prefixed verb -> also key on the bare stem (stranded-prefix equivalence)
    if (w.startsWith(p) && w.length > p.length + 3) add(w.slice(p.length));
  }
  return [...out];
}

// index the taught inventory by every key it can present, keeping the EARLIEST debut per key
const taughtByKey = new Map();
for (const { stem, debut: seed } of d.inventory) {
  for (const k of keys(stem)) {
    if (!taughtByKey.has(k) || taughtByKey.get(k).seed > seed) taughtByKey.set(k, { seed, stem });
  }
}

// ── English-gloss signal ──────────────────────────────────────────────────────────────
// Content words of each lego's ENGLISH text, with the earliest seed each appears at.
const EN_STOP = new Set(('a an the to of for with in at on i you he she it we they me him her us them my your his '
  + 'their our is am are was were be been do does did doing not no and or but if that this these those what which who '
  + 'when where why how so very just too also then than as up out about would could should will can may might must '
  + 'have has had s t re ll ve don t isn aren wasn didn won can wouldn couldn shouldn some any more most all one').split(' '));
const enFirst = new Map();
// (built from the dump's inventory sources, which carry the lego known_text; we need English,
//  so re-derive from the findings' own phrase targets is not enough — read legos again.)
const legoEn = JSON.parse(fs.readFileSync(path.join(__dirname, 'deu-legos.json'), 'utf8'));
for (const l of legoEn) {
  for (const w of String(l.target_text || '').toLowerCase().match(/[a-z']+/g) || []) {
    if (EN_STOP.has(w)) continue;
    if (!enFirst.has(w) || enFirst.get(w) > l.seed_number) enFirst.set(w, l.seed_number);
  }
}

// ── classify ─────────────────────────────────────────────────────────────────────────
const rows = [];
for (const f of d.findings) {
  const tok = f.token;
  if (!tok) continue;
  // (A) morphology: any key of the token that is taught at or before this seed
  let morph = null;
  for (const k of keys(tok)) {
    const t = taughtByKey.get(k);
    if (t && t.seed <= f.seed && fold(t.stem) !== fold(tok)) {
      if (!morph || t.seed < morph.seed) morph = { ...t, via: k };
    }
  }
  // (B) english gloss: content words of THIS phrase's English, taught at or before this seed
  const enWords = (String(f.target || '').toLowerCase().match(/[a-z']+/g) || []).filter(w => !EN_STOP.has(w));
  const enHits = enWords.filter(w => enFirst.has(w) && enFirst.get(w) <= f.seed);
  rows.push({ ...f, morph, en_covered: enHits.length === enWords.length && enWords.length > 0, en_missing: enWords.filter(w => !(enFirst.has(w) && enFirst.get(w) <= f.seed)) });
}

const tier1 = rows.filter(r => r.morph);
const rest = rows.filter(r => !r.morph);

// per-token report
function tokenTable(list) {
  const m = new Map();
  for (const r of list) {
    if (!m.has(r.token)) m.set(r.token, { n: 0, kind: r.kind, seeds: new Set(), morph: r.morph, debut: r.debut_seed, ex: r });
    const e = m.get(r.token); e.n++; e.seeds.add(r.seed);
    if (r.morph && (!e.morph || r.morph.seed < e.morph.seed)) e.morph = r.morph;
  }
  return [...m].sort((a, b) => b[1].n - a[1].n);
}

console.log(`=== TIER-1 CANDIDATES (morphology pairs to an earlier-taught form): ${tier1.length}/${rows.length} hits ===`);
for (const [t, e] of tokenTable(tier1)) {
  console.log(`${String(e.n).padStart(3)} ${e.kind === 'ordering' ? 'ORD' : 'ukg'} ${t.padEnd(16)} ← ${e.morph.stem.padEnd(14)} (S${e.morph.seed}, via "${e.morph.via}")  used S${[...e.seeds].sort((a, b) => a - b).join(',')}`);
}
console.log(`\n=== REMAINDER for learner's-shoes adjudication: ${rest.length} hits, ${new Set(rest.map(r => r.token)).size} tokens ===`);
for (const [t, e] of tokenTable(rest)) {
  console.log(`${String(e.n).padStart(3)} ${e.kind === 'ordering' ? 'ORD' : 'ukg'} ${t.padEnd(16)} ${e.kind === 'ordering' ? `debut S${e.debut} ` : ''}used S${[...e.seeds].sort((a, b) => a - b).join(',')}  en-uncovered=[${e.ex.en_missing.join(' ')}]`);
  console.log(`      e.g. S${e.ex.seed} "${e.ex.known}" / "${e.ex.target}"`);
}
fs.writeFileSync(path.join(__dirname, 'deu-classified.json'), JSON.stringify({ tier1, rest }, null, 2));
console.log(`\ntier1=${tier1.length} rest=${rest.length}`);
