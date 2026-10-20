'use strict';
// tools/quality-census/checks.cjs — the scan-course structural checks (.claude/commands/scan-course.md Checks 1-10,
// 13, 15, 16, 17b) plus duplicate-LEGO, content mismatch and seed-sentence placement, as pure functions over one
// course snapshot (load.cjs). Read-only by construction: nothing here can write.
//
// Each check returns hits; a hit is a CANDIDATE. Regex and counting find candidates, they never decide a language
// verdict (Kai, 2026-10-15): the census reports hits × the precision measured by hand-reading a sample, never raw
// counts. Each check names the canon rule it serves (course-methodology-canon.md) and whether that rule blocks.
//
// Hit shape: { ref, seed, kind: 'seed'|'lego'|'build'|'use'|'component', known, target, why, sub? }

let normalizeForContainment;
try { ({ normalizeForContainment } = require('../../services/course-builder/lib/text-normalization.cjs')); }
catch { normalizeForContainment = (s) => String(s).toLowerCase().replace(/[.,!?;:¿¡()]/g, ' ').replace(/\s+/g, ' ').trim(); }

// The gate's normaliser, plus curly quotes and dashes, so "I’m" and "I'm" are one word.
const words = (t) => normalizeForContainment(String(t || '').replace(/[’‘]/g, "'").replace(/[…"“”„«»]/g, ' ')
  .replace(/[–—]/g, ' ')).replace(/(^|\s)'+|'+(\s|$)/g, ' ').split(' ').filter(Boolean);
const norm = (t) => words(t).join(' ');

function rowsOf(c, { components = true } = {}) {
  const out = [];
  for (const s of c.seeds) out.push({ ref: s.seed_id || `S${String(s.seed_number).padStart(4, '0')}`, seed: s.seed_number, kind: 'seed', known: s.known_text, target: s.target_text });
  for (const l of c.legos) out.push({ ref: l.lego_id, seed: l.seed_number, kind: 'lego', known: l.known_text, target: l.target_text, is_new: l.is_new !== false });
  for (const p of c.phrases) {
    if (!components && p.phrase_role === 'component') continue;
    out.push({ ref: p.id, seed: p.seed_number, kind: p.phrase_role, known: p.known_text, target: p.target_text, played: p.lego_is_new && p.phrase_role !== 'component' });
  }
  return out;
}
const hit = (r, why, extra = {}) => ({ ref: r.ref, seed: r.seed, kind: r.kind, known: r.known, target: r.target, why, ...extra });

// ── Check 1 · parenthetical / bracket tags (canon K11, HARD: "no parenthetical tags in courses, ever") ───────────
// Recipe looked at LEGO known_text only; a bracket anywhere a learner sees or a voice reads is the same defect.
function parentheticals(c) {
  const re = /[([][^)\]]*[)\]]/;
  return rowsOf(c).filter((r) => re.test(r.known || '') || re.test(r.target || ''))
    .map((r) => hit(r, `bracket: ${(re.exec(r.known || '') || re.exec(r.target || ''))[0]}`));
}

// ── Check 2 · slashes (canon L19: a slash is the LEGO asking for context; the learner hears one word) ───────────
function slashes(c) {
  return rowsOf(c).filter((r) => /\//.test(r.known || '') || /\//.test(r.target || '')).map((r) => hit(r, 'slash'));
}

// ── Checks 3 + 4 · wrong language on a side ────────────────────────────────────────────────────────────────────
// Script mismatch catches CJK/Arabic etc., but most pairs here are Latin on both sides (ita/eng), where script
// cannot tell English from Italian. So the markers are learned from the course itself: a word that is common on
// one side and NEVER appears on the other side anywhere in the course is a marker of that side's language (names
// and cognates appear on both sides, so they are never markers). A known text whose markers are mostly the
// target's is a candidate for "Italian on the English side", and vice versa.
const SCRIPTS = { zho: /\p{Script=Han}/u, jpn: /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u, kor: /\p{Script=Hangul}/u, ara: /\p{Script=Arabic}/u, hin: /\p{Script=Devanagari}/u, rus: /\p{Script=Cyrillic}/u, ell: /\p{Script=Greek}/u, heb: /\p{Script=Hebrew}/u, tha: /\p{Script=Thai}/u };
function sideMarkers(rows, minCount = 8) {
  const k = new Map(); const t = new Map();
  for (const r of rows) { for (const w of new Set(words(r.known))) k.set(w, (k.get(w) || 0) + 1); for (const w of new Set(words(r.target))) t.set(w, (t.get(w) || 0) + 1); }
  // "never on the other side" would let the very rows we hunt (Italian on the English side) un-mark their own words,
  // so a stray appearance or two on the other side is tolerated: at most 1, or 2% of the own-side count.
  const rare = (n, other) => (other || 0) <= Math.max(1, Math.floor(n * 0.02));
  const km = new Set([...k].filter(([w, n]) => n >= minCount && rare(n, t.get(w)) && w.length > 1).map(([w]) => w));
  const tm = new Set([...t].filter(([w, n]) => n >= minCount && rare(n, k.get(w)) && w.length > 1).map(([w]) => w));
  return { km, tm };
}
function wrongLanguage(c) {
  const rows = rowsOf(c);
  const out = [];
  const ks = SCRIPTS[c.known_lang]; const ts = SCRIPTS[c.target_lang];
  const { km, tm } = sideMarkers(rows);
  for (const r of rows) {
    // script test first (only meaningful when the two sides use different scripts)
    if (ts && !ks && ts.test(r.known || '')) { out.push(hit(r, `known side contains ${c.target_lang} script`, { sub: 'known' })); continue; }
    if (ks && !ts && ks.test(r.target || '')) { out.push(hit(r, `target side contains ${c.known_lang} script`, { sub: 'target' })); continue; }
    if (ts && !ks && !ts.test(r.target || '') && /\p{L}/u.test(r.target || '')) { out.push(hit(r, `target side has no ${c.target_lang} script`, { sub: 'target' })); continue; }
    const kw = words(r.known); const tw = words(r.target);
    const kInT = kw.filter((w) => tm.has(w)); const kInK = kw.filter((w) => km.has(w));
    const tInK = tw.filter((w) => km.has(w)); const tInT = tw.filter((w) => tm.has(w));
    if (kInT.length >= 1 && kInT.length > kInK.length) out.push(hit(r, `known side reads as target language: ${kInT.join(', ')}`, { sub: 'known' }));
    else if (tInK.length >= 1 && tInK.length > tInT.length) out.push(hit(r, `target side reads as known language: ${tInK.join(', ')}`, { sub: 'target' }));
  }
  return out;
}

// ── Check 5 · more than one sentence (canon P20: a USE phrase is never more than one sentence) ──────────────────
const ABBREV = /\b(mr|mrs|ms|dr|st|sig|sr|jr|etc|vs|ca)\.$/i;
function sentenceCount(t) {
  const s = String(t || '').trim();
  let n = 0;
  const re = /[.!?。！？]+(?=\s+\S)/g; let m;
  while ((m = re.exec(s))) { if (!ABBREV.test(s.slice(0, m.index + 1))) n++; }
  return n + 1;
}
function multiSentence(c) {
  return rowsOf(c).filter((r) => r.kind !== 'component' && (sentenceCount(r.known) > 1 || sentenceCount(r.target) > 1))
    .map((r) => hit(r, `sentences: known ${sentenceCount(r.known)}, target ${sentenceCount(r.target)}`));
}

// ── Check 6 · unpronounceable (no letter or digit on a side: TTS and the learner have nothing to say) ───────────
function unpronounceable(c) {
  return rowsOf(c).filter((r) => !/[\p{L}\p{N}]/u.test(r.known || '') || !/[\p{L}\p{N}]/u.test(r.target || '')).map((r) => hit(r, 'no letters on a side'));
}

// ── Check 7 · speech marks wrapping a whole side (shown on screen as quotes) ────────────────────────────────────
const WRAP = /^\s*(["“„«'‘])[\s\S]*(["”»'’])\s*$/;
function wrappingQuotes(c) {
  const wrapped = (t) => { const m = WRAP.exec(t || ''); return m && !(m[1] === "'" && m[2] === "'" && !/^\s*'/.test(t)) && (t || '').trim().length > 2; };
  return rowsOf(c).filter((r) => wrapped(r.known) || wrapped(r.target)).map((r) => hit(r, 'side wrapped in speech marks'));
}

// ── Check 8 · trailing full stop. INFORMATIONAL: canon A7 (Kai 2026-08-17) "Full stop makes no difference" ─────
function trailingPeriod(c) {
  return rowsOf(c).filter((r) => /[^.]\.\s*$/.test(r.known || '') || /[^.]\.\s*$/.test(r.target || '')).map((r) => hit(r, 'trailing full stop'));
}

// ── Check 9 · lowercase "i" as the English pronoun ──────────────────────────────────────────────────────────────
function lowercaseI(c) {
  const side = c.known_lang === 'eng' ? 'known' : c.target_lang === 'eng' ? 'target' : null;
  if (!side) return [];
  const re = /(^|[^\p{L}\p{N}'’])i(?=$|['’]|[^\p{L}\p{N}.])/u;   // "i" alone or i'm/i've, not "i.e."
  return rowsOf(c).filter((r) => re.test(r[side] || '')).map((r) => hit(r, `lowercase i on the ${side} side`));
}

// ── Check 10 · ZUT at LEGO level (canon K2/K4: one known prompt → one target; K3: the reverse is harmless) ───────
// is_new LEGOs grouped by normalised known text; more than one normalised target is a conflict. Pairs whose
// targets differ only by a final gender/number vowel (amico/amica) are split out as `gender` (scan-course: "either
// form is correct, not a real ZUT"; canon K5 leaves trivial form variation where there is no easy fix).
function genderOnly(a, b) {
  const x = a.split(' '); const y = b.split(' ');
  if (x.length !== y.length) return false;
  let d = 0;
  for (let i = 0; i < x.length; i++) {
    if (x[i] === y[i]) continue;
    if (x[i].slice(0, -1) === y[i].slice(0, -1) && /[oaie]$/.test(x[i]) && /[oaie]$/.test(y[i])) { d++; continue; }
    return false;
  }
  return d > 0;
}
// K23 (Kai): the standard for one known word with two targets is to KEEP the clash and explain the sense in the
// presentation ("as in — 'did you see that anywhere?'"). A group where every LEGO's intro carries such a context is
// `k23-explained`, not a conflict. Presentations come from Popty (c.presentations: lego_id → intro text), fetched by
// run.cjs for the conflict LEGOs only; without them a group stays `conflict`. Calibration 2026-10-19 (#239·T) on
// ita_for_eng: 3 groups, "it was" and "anywhere" both K23-explained (376 L02's line is Kai's own), 72/655 "I think
// that you're speaking" (tu / no tu) the one real conflict — open in canon K38.
const K23_CONTEXT = /\bas in\b|in (?:a |an )?(?:\w+ )?(?:phrase|sentence)s? like|\bin phrases like\b|\bwhen you\b/i;
function zutLego(c) {
  const by = new Map();
  for (const l of c.legos) {
    if (l.is_new === false) continue;
    const k = norm(l.known_text); if (!k) continue;
    if (!by.has(k)) by.set(k, []);
    by.get(k).push(l);
  }
  const out = [];
  for (const [k, ls] of by) {
    const targets = [...new Set(ls.map((l) => norm(l.target_text)))];
    if (targets.length < 2) continue;
    const allGender = targets.every((a) => targets.every((b) => a === b || genderOnly(a, b)));
    const pres = c.presentations || {};
    const explained = ls.every((l) => K23_CONTEXT.test(pres[l.lego_id] || ''));
    for (const l of ls) out.push({ ref: l.lego_id, seed: l.seed_number, kind: 'lego', known: l.known_text, target: l.target_text,
      why: `"${k}" → ${targets.join(' | ')}${pres[l.lego_id] ? ` · intro: ${pres[l.lego_id]}` : ''}`,
      sub: allGender ? 'gender' : explained ? 'k23-explained' : 'conflict', group: k });
  }
  return out;
}

// ── Check 13 · capitalisation: case-only duplicates, and first-letter outliers against a >80% convention ────────
function capitalisation(c) {
  const out = [];
  const rows = rowsOf(c, { components: false }).filter((r) => r.kind !== 'lego');
  for (const side of ['known', 'target']) {
    const g = new Map();
    for (const r of rows) { const t = (r[side] || '').trim(); if (!t) continue; const k = t.toLowerCase(); if (!g.has(k)) g.set(k, new Map()); g.get(k).set(t, r); }
    for (const [, variants] of g) if (variants.size > 1) for (const [, r] of variants) out.push(hit(r, `case-only duplicate on ${side}: ${[...variants.keys()].join(' ≠ ')}`, { sub: 'case-dup' }));
    const first = (t) => [...String(t || '').trim().replace(/^[¿¡"“'‘(«]+/, '')][0];
    // English "I…" at the start is required capitalisation: neither counted nor flagged.
    const engSide = side === (c.known_lang === 'eng' ? 'known' : c.target_lang === 'eng' ? 'target' : null);
    const iStart = (t) => engSide && /^\s*["“(«¿¡]*I\b/.test(t || '');
    let up = 0; let lo = 0;
    for (const r of rows) { const f = first(r[side]); if (!f || f.toUpperCase() === f.toLowerCase() || iStart(r[side])) continue; f === f.toUpperCase() ? up++ : lo++; }
    const dom = up >= lo ? 'upper' : 'lower';
    // A first word the course also writes capitalised MID-sentence on this side is a proper noun/adjective
    // ("Italian is important…"), not an outlier.
    const proper = new Set();
    for (const r of rows) {
      const ws = String(r[side] || '').trim().split(/\s+/);
      for (let i = 1; i < ws.length; i++) if (/^\p{Lu}/u.test(ws[i]) && !/[.?!:;,"“]$/.test(ws[i - 1])) proper.add(ws[i].replace(/[^\p{L}'’]/gu, ''));
    }
    if (Math.max(up, lo) / Math.max(1, up + lo) <= 0.8) continue;
    for (const r of rows) {
      const f = first(r[side]); if (!f || f.toUpperCase() === f.toLowerCase()) continue;
      const isUp = f === f.toUpperCase();
      if ((dom === 'lower') === isUp) {
        if (iStart(r[side]) || proper.has(String(r[side]).trim().split(/\s+/)[0].replace(/[^\p{L}'’]/gu, ''))) continue;
        out.push(hit(r, `${side} starts ${isUp ? 'upper' : 'lower'}case against a ${dom}case convention`, { sub: 'outlier' }));
      }
    }
  }
  return out;
}

// ── Check 15 · identical known and target (a missing translation), cognate allowlist from scan-course ───────────
const COGNATES = new Set(['in', 'email', 'hotel', 'internet', 'okay', 'ok', 'taxi', 'radio', 'pizza', 'me', 'idea', 'ideas', 'bar', 'total', 'yoga', 'no', 'si', 'sì', 'film', 'computer', 'sport', 'weekend', 'bus', 'menu', 'tennis', 'video', 'online']);
function identical(c) {
  // Proper nouns ("Africa") are judged on the ORIGINAL text — norm() lowercases. Calibration 2026-10-19 (#239·T):
  // before this, ita_for_eng gave 7 hits, all false (6 × "in | in", 1 × "Africa").
  const proper = (t) => String(t || '').trim().split(/\s+/).every((w) => /^\p{Lu}/u.test(w));
  return rowsOf(c).filter((r) => { const k = norm(r.known); return k && k === norm(r.target) && !proper(r.known) && !k.split(' ').every((w) => COGNATES.has(w)); })
    .map((r) => hit(r, 'known equals target'));
}

// ── Check 16 · underpopulated debut LEGOs (canon P10 / P30) ────────────────────────────────────────────────────
// P30 (Tom 2026-09-30): a debut with NO real practice phrase (BUILD or USE, never the bare LEGO) blocks release;
// BUILD-only (no USE ever reaches spaced repetition) and fewer than 2 USE are SOFT, reported.
function underpopulated(c) {
  const out = [];
  for (const l of c.legos) {
    if (l.is_new === false) continue;
    if (l.seed_number === 1 && l.lego_index === 1) continue;   // L18: LEGO 1 of seed 1 cannot carry practice; debut_practice_gaps() excepts it
    const bare = (p) => norm(p.known_text) === norm(l.known_text) && norm(p.target_text) === norm(l.target_text);
    const mine = c.phrases.filter((p) => p.lego_id === l.lego_id && p.phrase_role !== 'component' && !bare(p));
    const b = mine.filter((p) => p.phrase_role === 'build').length; const u = mine.filter((p) => p.phrase_role === 'use').length;
    const sub = b + u === 0 ? 'empty' : u === 0 ? 'no-use' : u < 2 ? 'few-use' : null;
    if (sub) out.push({ ref: l.lego_id, seed: l.seed_number, kind: 'lego', known: l.known_text, target: l.target_text, why: `${b} build, ${u} use`, sub });
  }
  return out;
}

// ── Check 17b · Italian: indicative after penso/credo che (scan-course 17b; canon K40 specimen is the subjunctive) ─
function italianSubjunctive(c) {
  const side = c.target_lang === 'ita' ? 'target' : c.known_lang === 'ita' ? 'known' : null;
  if (!side) return [];
  // The recipe's 3sg/3pl indicatives only, at most one word between "che" and the verb, and never a relative
  // "che" in that gap. Calibration 2026-10-19 (#239·T) with 1pl/2sg forms added read 9 of 9 hits as false: 1pl
  // indicative = subjunctive spelling (siamo, abbiamo), and "penso che quello che hai detto sia…" puts the matched
  // verb inside a relative clause.
  const re = /(?:^|[^\p{L}])(pens[oaiy]|pensiamo|pensate|pensano|cred[oaie]|crediamo|credete|credono|sembra|è possibile)\s+che\s+(?:(?!che\s)\p{L}+\s+)?(ha|hanno|è|sono|può|possono|deve|devono|vuole|vogliono|fa|fanno|va|vanno|viene|vengono|sa|sanno|dice|dicono)(?![\p{L}'’])/u;
  return rowsOf(c).filter((r) => re.test(r[side] || '')).map((r) => { const m = re.exec(r[side]); return hit(r, `${m[1]} che … ${m[2]}`); });
}

// ── Checks 17a/c/d/e · the other language patterns of scan-course, as candidate finders ────────────────────────
// UNCALIBRATED in stage 1 (ita only): each fires only on its own language, so it can be proven only on that course.
// 17a Spanish llevar + gerund: no time span (NO_TIME) or the span after the gerund (WRONG_ORDER) — Deborah, 2026-04-30.
const LLEVAR = /(?:^|[^\p{L}])(llev(?:o|as|a|amos|áis|an))\s+(\p{L}+ndo)(?![\p{L}])/iu;
const SPAN = /(cuánto tiempo|mucho tiempo|poco tiempo|un año|una hora|una semana|un mes|un día|todo el día|toda la semana|\d+\s+(años?|meses|semanas|días|horas|minutos)|(dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s+(años|meses|semanas|días|horas|minutos)|algún tiempo|bastante tiempo|desde hace|desde que)/iu;
function spanishLlevar(c) {
  const side = c.target_lang === 'spa' ? 'target' : c.known_lang === 'spa' ? 'known' : null;
  if (!side) return [];
  const out = [];
  for (const r of rowsOf(c)) {
    const t = r[side] || ''; const m = LLEVAR.exec(t); if (!m) continue;
    const before = t.slice(0, m.index + m[0].length - m[2].length); const after = t.slice(m.index + m[0].length);
    if (SPAN.test(before)) continue;   // a span anywhere before the gerund ("cuánto tiempo llevas hablando") is right
    out.push(hit(r, `${m[1]} … ${m[2]}`, { sub: SPAN.test(after) ? 'wrong-order' : 'no-time' }));
  }
  return out;
}
// 17c German subordinate clause: CANDIDATES for a verb-final read, never a verdict (scan-course says LLM/human only).
// Kept narrow: the clause after the subordinator ends in a word that is not a typical final verb form.
function germanVerbFinal(c) {
  if (c.target_lang !== 'deu') return [];
  const SUB = /(?:^|[^\p{L}])(weil|dass|ob|obwohl|nachdem|bevor|während|damit|falls|sobald)\s+([^,.;?!]+)/iu;
  return rowsOf(c).filter((r) => { const m = SUB.exec(r.target || ''); if (!m) return false; const last = m[2].trim().split(/\s+/).pop().toLowerCase(); return m[2].trim().split(/\s+/).length >= 3 && !/(en|ern|eln|t|te|ten|st|e|bin|ist|sind|bist|hat|habe|kann|will|muss|soll|darf|mag|war|wäre|würde|sei|wird|werde|weiß)$/.test(last); })
    .map((r) => hit(r, 'subordinate clause may not end in its verb'));
}
// 17d Japanese か + ?: the minority convention is flagged.
function japaneseKa(c) {
  if (c.target_lang !== 'jpn') return [];
  const rows = rowsOf(c, { components: false }).filter((r) => r.kind !== 'lego');
  const kaQ = rows.filter((r) => /か[?？]\s*$/.test(r.target || '')); const kaBare = rows.filter((r) => /か\s*$/.test(r.target || ''));
  const minority = kaQ.length >= kaBare.length ? kaBare : kaQ;
  return minority.map((r) => hit(r, kaQ.length >= kaBare.length ? 'ends か without ?' : 'ends か? against a bare-か course'));
}
// 17e European Portuguese: singular você on the pt-PT side (vocês is fine). \b fails after ê, so property escapes.
function europeanVoce(c) {
  const re = /(?<!\p{L})você(?!\p{L})/iu;
  const tgt = c.target_lang === 'por' && !/_br/.test(c.course); const kn = c.known_lang === 'por' && !/_for_por_br/.test(c.course);
  if (!tgt && !kn) return [];
  return rowsOf(c).filter((r) => (tgt && re.test(r.target || '')) || (kn && re.test(r.known || ''))).map((r) => hit(r, 'você in European Portuguese'));
}

// ── Duplicate LEGO (Kai 2026-09-23: a LEGO is a duplicate ONLY if BOTH sides match an earlier LEGO; canon L17/L31) ─
// repeat-debut: an is_new LEGO whose exact known+target pair an EARLIER LEGO already debuted (it should be not-new;
//   its intro re-announces a known item). same-target / different-known stays NEW and is never a hit.
// orphan-not-new: an is_new=false LEGO with NO earlier debut of the same pair (L31: re-judged, never left by inertia
//   — its basket is dark, P25, and the learner never had it introduced).
function duplicateLego(c) {
  const firstDebut = new Map();
  const out = [];
  for (const l of c.legos) {
    const key = `${norm(l.known_text)}||${norm(l.target_text)}`;
    const prev = firstDebut.get(key);
    if (l.is_new !== false) {
      if (prev) out.push({ ref: l.lego_id, seed: l.seed_number, kind: 'lego', known: l.known_text, target: l.target_text, why: `same pair debuted at ${prev.lego_id}`, sub: 'repeat-debut', twin: prev.lego_id });
      else firstDebut.set(key, l);
    } else if (!prev) {
      out.push({ ref: l.lego_id, seed: l.seed_number, kind: 'lego', known: l.known_text, target: l.target_text, why: 'not-new, but no earlier LEGO has this exact pair', sub: 'orphan-not-new' });
    }
  }
  return out;
}

// ── Content mismatch: known and target say different amounts (Kai's "length mismatch"; deu #118·T found 36 real) ─
// Word-count ratio was a 4% hit list on deu (36 real of 853 read), so the census uses the committed
// content-completeness detector (tools/qa/known-target-mismatch, Dice-aligned lexicon learned from the course),
// over PLAYED build/use rows, and takes its HIGH band.
function contentMismatch(c, { band = 'HIGH' } = {}) {
  const D = require('../qa/known-target-mismatch/detect-mismatch.cjs');
  const { buildBigramLexicon } = require('../qa/known-target-mismatch/lib/align.cjs');
  const all = c.phrases.filter((p) => p.known_text && p.target_text);
  const pairs = all.map((r) => [r.known_text, r.target_text]);
  const ctx = {
    lex: D.buildLexicon(pairs), revLex: D.buildLexicon(pairs.map(([k, t]) => [t, k])),
    blex: buildBigramLexicon(pairs), revBlex: buildBigramLexicon(pairs.map(([k, t]) => [t, k])),
    kFunc: D.functionWords(pairs.map((p) => p[0])), tFunc: D.functionWords(pairs.map((p) => p[1])),
    kPack: D.loadPack(c.known_lang), tPack: D.loadPack(c.target_lang),
  };
  const out = [];
  for (const p of all) {
    if (p.phrase_role === 'component' || !p.lego_is_new) continue;
    const a = D.analyse(p, ctx);
    const b = D.band(a.score);
    if (b === 'HIGH' || (band === 'MEDIUM' && b === 'MEDIUM')) {
      out.push({ ref: p.id, seed: p.seed_number, kind: p.phrase_role, known: p.known_text, target: p.target_text,
        why: a.signals.filter((s) => s.w > 0).map((s) => `${s.id}: ${s.detail}`).join('; '), sub: b, score: a.score });
    }
  }
  return out.sort((x, y) => y.score - x.score);
}

// ── Seed-sentence placement (canon P26, HARD: the exact seed sentence is a phrase under a NEW LEGO, so it is SAID) ─
// missing: no played row (build/use under an is_new LEGO) carries the seed's own known+target.
// early:   the only played copies sit under a LEGO that plays before the seed's last new LEGO (#363's defect: the
//          sentence is asked for before the words in it are taught).
// A seed with no new LEGO of its own is reported under `no-home` (P26: LISTED, never given an invented home).
function seedPlacement(c) {
  const legoById = new Map(c.legos.map((l) => [l.lego_id, l]));
  const played = new Map();
  for (const p of c.phrases) {
    if (p.phrase_role === 'component' || !p.lego_is_new) continue;
    const k = `${norm(p.known_text)}||${norm(p.target_text)}`;
    if (!played.has(k)) played.set(k, []);
    played.get(k).push(p);
  }
  const ord = (l) => l.seed_number * 1000 + l.lego_index;
  const out = [];
  for (const s of c.seeds) {
    const own = c.legos.filter((l) => l.seed_number === s.seed_number && l.is_new !== false);
    const home = own.length ? own.reduce((a, b) => (ord(b) > ord(a) ? b : a)) : null;
    const copies = played.get(`${norm(s.known_text)}||${norm(s.target_text)}`) || [];
    const base = { ref: s.seed_id || `S${String(s.seed_number).padStart(4, '0')}`, seed: s.seed_number, kind: 'seed', known: s.known_text, target: s.target_text };
    if (!copies.length) {
      // drifted: a played row keeps ONE side of the seed but not the other — the copy P26 placed, since edited on
      // one side, or the seed re-texted under it. Calibration 2026-10-19 (#239·T): ita_for_eng had 22 such rows,
      // e.g. seed 451 "hanno detto che cosa volevano fare" vs row U01 "…quello che volevano fare" — the same English
      // asks for two Italians (a ZUT pair as well as a P26 miss).
      const kt = norm(s.known_text); const tt = norm(s.target_text);
      const near = c.phrases.filter((p) => p.phrase_role !== 'component' && p.seed_number === s.seed_number && (norm(p.known_text) === kt || norm(p.target_text) === tt));
      if (near.length) { const p = near[0]; out.push({ ...base, why: `played copy differs: ${p.id} "${p.known_text} | ${p.target_text}"${p.lego_is_new ? '' : ' (under a not-new LEGO: never played)'}`, sub: 'drifted', near: p.id }); continue; }
      out.push({ ...base, why: home ? 'seed sentence is in no played basket' : 'no new LEGO in this seed and sentence not played elsewhere', sub: home ? 'missing' : 'no-home' });
      continue;
    }
    if (home && copies.every((p) => { const l = legoById.get(p.lego_id); return l && ord(l) < ord(home); })) {
      out.push({ ...base, why: `only under ${copies.map((p) => p.lego_id).join(', ')}, before ${home.lego_id}`, sub: 'early' });
    }
  }
  return out;
}

const CHECKS = [
  { id: 'parentheticals', scan: 'Check 1', rule: 'K11', blocks: true, run: parentheticals },
  { id: 'slashes', scan: 'Check 2', rule: 'L19', blocks: false, run: slashes },
  { id: 'wrong-language', scan: 'Checks 3+4', rule: 'K8/K16', blocks: true, run: wrongLanguage },
  { id: 'multi-sentence', scan: 'Check 5', rule: 'P20', blocks: false, run: multiSentence },
  { id: 'unpronounceable', scan: 'Check 6', rule: 'A16', blocks: true, run: unpronounceable },
  { id: 'wrapping-quotes', scan: 'Check 7', rule: 'display', blocks: false, run: wrappingQuotes },
  { id: 'trailing-period', scan: 'Check 8', rule: 'A7 (no difference)', blocks: false, run: trailingPeriod },
  { id: 'lowercase-i', scan: 'Check 9', rule: 'K9', blocks: false, run: lowercaseI },
  { id: 'zut-lego', scan: 'Check 10', rule: 'K2/K4', blocks: true, run: zutLego },
  { id: 'capitalisation', scan: 'Check 13', rule: 'display', blocks: false, run: capitalisation },
  { id: 'identical', scan: 'Check 15', rule: 'K16', blocks: true, run: identical },
  { id: 'underpopulated', scan: 'Check 16', rule: 'P10/P30', blocks: 'empty only', run: underpopulated },
  { id: 'ita-subjunctive', scan: 'Check 17b', rule: 'K16/K40', blocks: false, run: italianSubjunctive },
  { id: 'spa-llevar', scan: 'Check 17a', rule: 'K16', blocks: false, run: spanishLlevar, calibrated: false },
  { id: 'deu-verb-final', scan: 'Check 17c', rule: 'K16', blocks: false, run: germanVerbFinal, calibrated: false },
  { id: 'jpn-ka', scan: 'Check 17d', rule: 'A9', blocks: false, run: japaneseKa, calibrated: false },
  { id: 'por-voce', scan: 'Check 17e', rule: 'K12', blocks: false, run: europeanVoce, calibrated: false },
  { id: 'duplicate-lego', scan: 'new', rule: 'L17/L31/P25', blocks: false, run: duplicateLego },
  { id: 'content-mismatch', scan: 'new', rule: 'S7/K16', blocks: false, run: contentMismatch },
  { id: 'seed-placement', scan: 'new (P26)', rule: 'P26', blocks: true, run: seedPlacement },
];

module.exports = { CHECKS, words, norm, rowsOf, sentenceCount, genderOnly, sideMarkers,
  parentheticals, slashes, wrongLanguage, multiSentence, unpronounceable, wrappingQuotes, trailingPeriod, lowercaseI,
  zutLego, capitalisation, identical, underpopulated, italianSubjunctive, spanishLlevar, germanVerbFinal, japaneseKa, europeanVoce,
  duplicateLego, contentMismatch, seedPlacement };
