#!/usr/bin/env node
'use strict';
// tools/course-optimization/ita-513-151-607-2026-09-28.cjs
//
// ita_for_eng — three rulings Kai made on 2026-09-28, applied by job #667·I.
//
// (1) SEED 513 "it hurts most when I move my head up and down | fa più male quando muovo la testa su e giù".
//     S0513L03 "my head | la testa" is introduced as 'my head' OR 'your head' (Italian says the body part with
//     the article, and the pronoun that says whose sits on the verb) BECAUSE the words for the 'your head'
//     meaning are taught by 513 (ti — 40; ti piace — 104; fa male — 513 L02): the intro is HUMAN-AUTHORED and
//     still quotes the LEGO's English 'my head' (mirror). Every 'my head' phrase gets its mi ("mi fa male la
//     testa"; a bare "fa male la testa" / "la testa fa male" says nobody's head), two 'your head' rows are
//     added, and the seed-513 rows whose Italian did not say what the English said are rewritten from taught
//     words: S0513L04U04 "please don't move your head" was "non muovo" (= I don't move; the imperative
//     muovere / non muovere is taught nowhere), S0513L04U03 "when she moves" was "quando muovo" (K26),
//     S0513L04B03 "hurts when I move my head" had no "quando muovo". Sparse is fine (Kai).
//
// (2) SEED 151 "that wasn't what I was hoping would happen" → known side becomes "it wasn't what I was hoping
//     would happen" (natural — #648·I's read, accepted by Kai); the Italian "non era quello che speravo
//     succedesse" is unchanged. S0151L01 "wasn't | non era" (subject-less, K26) becomes "it wasn't | non era",
//     which is EXACTLY S0086L01 on both sides → a later duplicate → NOT NEW (L17, the duplicate rule; Kai
//     accepts it). A not-new basket is never played (P25), so its drill rows are REHOMED under a NEW LEGO each
//     one contains, with the vocabulary taught at that LEGO's seed:
//        B04 "that wasn't easy | quello non era facile"     → S0086L01 "it wasn't | non era"        as "it wasn't easy | non era facile"
//        U01 "…the same thing | non era la stessa cosa"     → S0143L01 "the same thing | la stessa cosa"
//        U02 "…a good idea | non era una buona idea"        → S0123L01 "idea | idea"
//        U07 "…what we were talking about | …di cui parlavamo" → S0143L02 "we were talking | parlavamo"
//        U09 "it wasn't easy, but it was interesting"       → S0112L01 "it was | era"   (text unchanged, clips kept)
//     B03 "that wasn't | quello non era" is DELETED: it no longer contains the LEGO (P17) and "that wasn't" over
//     quello non era beside "it wasn't" over non era is the clash the brief names — a phrase may go, a LEGO
//     never. U06 "that wasn't what I wanted to say" becomes, after the it-edit, an exact copy of S0086L01U04 and
//     is DELETED too. U03/U04 "that wasn't what I was thinking / what I thought | non era quello che pensavo"
//     contain no NEW LEGO on both sides (S0124L01 is "I thought that | pensavo che"; the English has no "that")
//     and cannot be edited to one without becoming a different phrase: they STAY under the not-new LEGO and are
//     LISTED for Kai (P25's "listed, never silently left"). B01/B02 become "it wasn't | non era" so the LEGO's
//     own builds contain it; C01/C02 (not | non, was | era) stay. The not-new LEGO carries no intro (S0519L04,
//     S0201L01 precedent): its Sonia clip is detached and kept, the drop logged. L02's seed-sentence rows B04/U03
//     take the seed's new English. Seed 159 is NOT touched (Kai).
//
// (3) SEED 607 "if I'd known I'd have done things differently | se avessi saputo, avrei fatto le cose
//     diversamente". S0607L02 "I would have done | avrei fatto" was not-new because S0152L01 taught that exact
//     pair; #649·I grew 152 to "I would have done it | l'avrei fatto", so 607 L02 lost its earlier pair. The
//     seed has no "it" / l' with this verb, so the LEGO is marked NEW (its text and components unchanged), given
//     a template intro, and a basket of phrases built from words taught by 607 that contain "I would have done |
//     avrei fatto" on both sides — and never "I would have done it", which is l'avrei fatto (P28).
//
// Rails: every phrase under a LEGO contains it on both sides (P17, word multiset as the live gate); a not-new
// LEGO stays not-new and its wanted rows move under a played LEGO (P25); duplicate = BOTH sides (Kai 2026-09-23);
// never delete a LEGO; O13 — the intros change in the same pass; O5 — every edited seed, and every seed that
// receives a row, is unapproved; ZUT strict must not rise (55 before). Job #660·I owns seed 376: untouched.
//
// Audio: changed Italian slots link an existing Elsa/Benigno clip by text or render one on Azure through the
// guarded door; changed English slots are detached for ita-sonia-temporary-fill (SCOPE=ids; Charlotte re-voice
// list); the seed-151 known clip is linked by text once its phrase twin has been filled (AUDIO_ONLY=1); intros
// render on the temporary Sonia presentation route (#546·I). Nothing is deleted from course_audio.
//
//   node tools/course-optimization/ita-513-151-607-2026-09-28.cjs             # plan (dry run, no writes)
//   APPLY=1 node tools/course-optimization/ita-513-151-607-2026-09-28.cjs     # write + Italian audio + intros
//   AUDIO_ONLY=1 node tools/course-optimization/ita-513-151-607-2026-09-28.cjs  # after the Sonia fill: still-silent Italian + seed-151 known link

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'ita_for_eng';
const JOB = '#667·I';
const SWEEP = 'ita-513-151-607-2026-09-28';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const RULING = "Kai, 2026-09-28 (job #667·I): 513 'my head' introduced as my/your head with mi on every my-head phrase and the wrong-person rows rewritten; 151 seed English → 'it wasn't…', S0151L01 → 'it wasn't | non era' NOT NEW (duplicate of S0086L01), drill rows rehomed under new LEGOs (P25), B03 deleted; 607 L02 'I would have done | avrei fatto' NEW with intro and basket (seed has no it/l')";
const ELSA = { voiceId: 'azure_it-IT-ElsaNeural', voiceName: 'it-IT-ElsaNeural' };
const BENIGNO = { voiceId: 'azure_it-IT-BenignoNeural', voiceName: 'it-IT-BenignoNeural' };
const AZURE_VOICE_IDS = { target1: ['azure_it-IT-ElsaNeural', 'it-IT-ElsaNeural'], target2: ['azure_it-IT-BenignoNeural', 'it-IT-BenignoNeural'] };
const SONIA = { voiceId: 'azure_en-GB-SoniaNeural', castVoiceId: 'en-GB-SoniaNeural', voiceName: 'en-GB-SoniaNeural' };
const SONIA_IDS = ['azure_en-GB-SoniaNeural', 'en-GB-SoniaNeural'];
const TEMP_PRES_ROW = { slot: 'presentation', language: 'eng', gender: 'f', rank: 1, voice_id: SONIA.castVoiceId };

// ── Rules (re-stated so this file reads alone) ─────────────────────────────────────────────
const norm = (s) => String(s || '').toLowerCase().replace(/’/g, "'").replace(/[.,!?;:"«»“”]+/g, ' ').replace(/\s+/g, ' ').trim();
const words = (s) => norm(s).split(' ').filter(Boolean);
/** Live gate's phrase-contains-LEGO rule: word multiset. */
function containsWords(hay, needle) {
  const h = words(hay);
  for (const w of words(needle)) { const i = h.indexOf(w); if (i < 0) return false; h.splice(i, 1); }
  return true;
}
const sameWords = (a, b) => containsWords(a, b) && words(a).length === words(b).length;
/**
 * NAMED EXCEPTION (this tool, S0513L03 only): Italian says the body part with its article and puts the
 * possessor on the verb (mi/ti/le fa male la testa), so the English side of a "la testa" phrase reads
 * "my head" OR "your head" OR "her head". Kai's ruling introduces the LEGO as 'my head' or 'your head'
 * and asks for examples of both, which P17's word-for-word rule cannot admit on the known side; the
 * exception is recorded HERE, per LEGO, never as a loosening of P17 (the L28 / K31 pattern).
 */
const HEAD_FORMS = { S0513L03: ['my head', 'your head', 'her head'] };
const phraseContainsLego = (p, l) => (HEAD_FORMS[l.id] ? HEAD_FORMS[l.id].some((f) => containsWords(p.known, f)) : containsWords(p.known, l.known)) && containsWords(p.target, l.target);
/** Duplicate = BOTH sides match (Kai, 2026-09-23). */
const isDuplicate = (a, b) => sameWords(a.known, b.known) && sameWords(a.target, b.target);
/** Where the LEGO sits in the phrase's Italian (the column the builder fills the same way). */
function legoPosition(phraseTarget, legoTarget) {
  const p = norm(phraseTarget), l = norm(legoTarget);
  if (p === l) return null;
  if (p.startsWith(l + ' ')) return 'start';
  if (p.endsWith(' ' + l)) return 'end';
  return null;
}

// ── (1) Seed 513 ────────────────────────────────────────────────────────────────────────────
const S513 = {
  seed: 513,
  sentence: { known: 'it hurts most when I move my head up and down', target: 'fa più male quando muovo la testa su e giù' },
  lego: { id: 'S0513L03', known: 'my head', target: 'la testa' },
  // Human-authored, in Kai's words ('The Italian for "my head" or "your head" is…'); no colon and no dash so
  // the mirror check reads it as a free line that QUOTES 'my head' (services/shared/intro-mirror.cjs).
  intro: "The Italian for 'my head' or 'your head', as in 'my head hurts a lot' or 'does your head hurt?', is:",
  edits: [
    { id: 'S0513L03B02', lego: 'S0513L03', before: { known: 'my head hurts', target: 'fa male la testa' }, after: { known: 'my head hurts', target: 'mi fa male la testa' }, why: 'my head needs mi' },
    { id: 'S0513L03U01', lego: 'S0513L03', before: { known: 'my head hurts', target: 'la testa fa male' }, after: { known: 'my head really hurts', target: 'mi fa davvero male la testa' }, why: 'mi; and B02 already says "my head hurts" — davvero (496) keeps the row distinct' },
    { id: 'S0513L03U02', lego: 'S0513L03', before: { known: 'my head hurts a lot', target: 'la testa fa molto male' }, after: { known: 'my head hurts a lot', target: 'mi fa molto male la testa' }, why: 'my head needs mi' },
    { id: 'S0513L03U03', lego: 'S0513L03', before: { known: 'she said her head hurts', target: 'ha detto che la testa fa male' }, after: { known: 'she said her head hurts', target: 'ha detto che le fa male la testa' }, why: 'her head needs le (taught 464: le ho detto)' },
    { id: 'S0513L03U04', lego: 'S0513L03', before: { known: 'my head hurts when I move', target: 'la testa fa male quando muovo' }, after: { known: 'my head hurts when I move', target: 'mi fa male la testa quando muovo' }, why: 'my head needs mi' },
    { id: 'S0513L04B03', lego: 'S0513L04', before: { known: 'hurts when I move my head up and down', target: 'fa male la testa su e giù' }, after: { known: 'it hurts when I move my head up and down', target: 'fa male quando muovo la testa su e giù' }, why: 'the Italian had no "quando muovo"; the English had no subject' },
    { id: 'S0513L04U03', lego: 'S0513L04', before: { known: 'she said her head hurts when she moves up and down', target: 'ha detto che la testa fa male quando muovo su e giù' }, after: { known: 'I said it hurts most when I move my head up and down', target: 'ho detto che fa più male quando muovo la testa su e giù' }, why: 'K26: muovo is "I move", not "she moves" (muove is taught nowhere); the seed sentence reported' },
    { id: 'S0513L04U04', lego: 'S0513L04', before: { known: 'please don\'t move your head up and down now', target: 'per favore non muovo la testa su e giù adesso' }, after: { known: "it doesn't hurt anymore when I move my head up and down", target: 'non fa più male quando muovo la testa su e giù' }, why: 'non muovo = I don\'t move; the imperative is taught nowhere, so the phrase is rewritten from taught forms (non fa più male, 513 L02U02)' },
  ],
  adds: [
    { id: 'S0513L03U06', lego: 'S0513L03', lego_index: 3, known: 'does your head hurt?', target: 'ti fa male la testa?', why: "'your head' meaning — ti (40)" },
    { id: 'S0513L03U07', lego: 'S0513L03', lego_index: 3, known: 'does your head hurt a lot?', target: 'ti fa molto male la testa?', why: "'your head' meaning — ti (40), molto" },
  ],
};

// ── (2) Seed 151 ────────────────────────────────────────────────────────────────────────────
const S151 = {
  seed: 151,
  sentence: { before: { known: "that wasn't what I was hoping would happen", target: 'non era quello che speravo succedesse' }, after: { known: "it wasn't what I was hoping would happen", target: 'non era quello che speravo succedesse' } },
  lego: { id: 'S0151L01', from: { known: "wasn't", target: 'non era', is_new: true }, to: { known: "it wasn't", target: 'non era', is_new: false } },
  earlier: { id: 'S0086L01', known: "it wasn't", target: 'non era' }, // the exact pair that makes 151 L01 a later duplicate
  edits: [
    { id: 'S0151L01B01', lego: 'S0151L01', before: { known: "wasn't", target: 'non era' }, after: { known: "it wasn't", target: 'non era' }, why: 'the LEGO itself' },
    { id: 'S0151L01B02', lego: 'S0151L01', before: { known: "wasn't", target: 'non era' }, after: { known: "it wasn't", target: 'non era' }, why: 'the repeated build' },
    { id: 'S0151L02B04', lego: 'S0151L02', before: { known: "that wasn't what I was hoping would happen", target: 'non era quello che speravo succedesse' }, after: { known: "it wasn't what I was hoping would happen", target: 'non era quello che speravo succedesse' }, why: 'the seed sentence (P26) follows the seed' },
    { id: 'S0151L02U03', lego: 'S0151L02', before: { known: "that wasn't what I was hoping would happen yesterday", target: 'non era quello che speravo succedesse ieri' }, after: { known: "it wasn't what I was hoping would happen yesterday", target: 'non era quello che speravo succedesse ieri' }, why: 'follows the seed' },
  ],
  deletes: [
    { id: 'S0151L01B03', known: "that wasn't", target: 'quello non era', why: 'no longer contains the LEGO (P17); "that wasn\'t" over quello non era beside "it wasn\'t" over non era is the clash — a phrase may go' },
    { id: 'S0151L01U06', known: "that wasn't what I wanted to say", target: 'non era quello che volevo dire', why: 'after the it-edit an exact copy of S0086L01U04' },
  ],
  // from → to (new id under a NEW LEGO the row contains), vocabulary checked at the landing seed
  moves: [
    { from: 'S0151L01B04', before: { known: "that wasn't easy", target: 'quello non era facile' }, to: 'S0086L01U08', seed: 86, lego: 'S0086L01', lego_index: 1, after: { known: "it wasn't easy", target: 'non era facile' }, why: 'S0086L01 "it wasn\'t | non era" (NEW): facile 64' },
    { from: 'S0151L01U01', before: { known: "that wasn't the same thing", target: 'non era la stessa cosa' }, to: 'S0143L01U06', seed: 143, lego: 'S0143L01', lego_index: 1, after: { known: "it wasn't the same thing", target: 'non era la stessa cosa' }, why: 'S0143L01 "the same thing | la stessa cosa" (NEW)' },
    { from: 'S0151L01U02', before: { known: "that wasn't a good idea", target: 'non era una buona idea' }, to: 'S0123L01U10', seed: 123, lego: 'S0123L01', lego_index: 1, after: { known: "it wasn't a good idea", target: 'non era una buona idea' }, why: 'S0123L01 "idea | idea" (NEW): una buona idea is 123 B02' },
    { from: 'S0151L01U07', before: { known: "that wasn't what we were talking about", target: 'non era quello di cui parlavamo' }, to: 'S0143L02U06', seed: 143, lego: 'S0143L02', lego_index: 2, after: { known: "it wasn't what we were talking about", target: 'non era quello di cui parlavamo' }, why: 'S0143L02 "we were talking | parlavamo" (NEW): di cui is 143 L03' },
    { from: 'S0151L01U09', before: { known: "it wasn't easy, but it was interesting", target: 'non era facile, ma era interessante' }, to: 'S0112L01U06', seed: 112, lego: 'S0112L01', lego_index: 1, after: { known: "it wasn't easy, but it was interesting", target: 'non era facile, ma era interessante' }, why: 'S0112L01 "it was | era" (NEW): facile 64, interessante 58, ma 19; text unchanged, clips kept' },
  ],
  stay: [ // contain no NEW LEGO on both sides; cannot be edited to one without becoming a different phrase — Kai's call
    { id: 'S0151L01U03', known: "that wasn't what I was thinking", target: 'non era quello che pensavo' },
    { id: 'S0151L01U04', known: "that wasn't what I thought", target: 'non era quello che pensavo' },
  ],
};

// ── (3) Seed 607 ────────────────────────────────────────────────────────────────────────────
const S607 = {
  seed: 607,
  sentence: { known: "if I'd known I'd have done things differently", target: 'se avessi saputo, avrei fatto le cose diversamente' },
  lego: { id: 'S0607L02', known: 'I would have done', target: 'avrei fatto', from: { is_new: false }, to: { is_new: true }, components: [{ known: 'I would have', target: 'avrei' }, { known: 'done', target: 'fatto' }] },
  grown152: { id: 'S0152L01', known: 'I would have done it', target: "l'avrei fatto" }, // the pair 607 L02 no longer duplicates
  intro: "The Italian for: 'I would have done', as in — 'I would have done the same thing', is:",
  adds: [
    { id: 'S0607L02B01', role: 'build', known: 'I would have done', target: 'avrei fatto' },
    { id: 'S0607L02B02', role: 'build', known: 'I would have done', target: 'avrei fatto' },
    { id: 'S0607L02B03', role: 'build', known: 'I would have done the same thing', target: 'avrei fatto la stessa cosa' },
    { id: 'S0607L02B04', role: 'build', known: 'I would have done everything', target: 'avrei fatto tutto' },
    { id: 'S0607L02U01', role: 'use', known: 'I would have done the same thing for you', target: 'avrei fatto la stessa cosa per te' },
    { id: 'S0607L02U02', role: 'use', known: 'I think I would have done that', target: 'penso che avrei fatto quello' },
    { id: 'S0607L02U03', role: 'use', known: 'if I had known, I would have done the same thing', target: 'se avessi saputo, avrei fatto la stessa cosa' },
    { id: 'S0607L02U04', role: 'use', known: 'I would have done everything for you', target: 'avrei fatto tutto per te' },
    { id: 'S0607L02U05', role: 'use', known: 'I would have done that yesterday', target: 'avrei fatto quello ieri' },
    { id: 'S0607L02U06', role: 'use', known: 'I would have done the things differently', target: 'avrei fatto le cose diversamente' },
  ].map((a) => ({ ...a, lego: 'S0607L02', lego_index: 2 })),
};

const short = (id) => String(id).replace(/^ita_for_eng:/, '');
const full = (id) => (String(id).startsWith(`${COURSE}:`) ? id : `${COURSE}:${id}`);

/** Pure plan over a row snapshot (tested): every guard, every after-state, no DB. */
function plan(rows) {
  const byId = {}; for (const r of rows) byId[r.id] = r;
  const problems = [];
  const lego = (id) => byId[id];
  const expectLive = (id, before) => {
    const l = byId[id];
    if (!l) { problems.push(`${id}: not live`); return null; }
    if (before && (l.known !== before.known || l.target !== before.target)) problems.push(`${id}: live reads "${l.known}" | "${l.target}", expected "${before.known}" | "${before.target}"`);
    return l;
  };
  // (1) 513
  const l513 = expectLive(S513.lego.id, { known: S513.lego.known, target: S513.lego.target });
  if (l513 && l513.is_new !== true) problems.push(`${S513.lego.id}: is_new ${l513.is_new}`);
  if (!/'my head'/.test(S513.intro) || /[()\[\]]/.test(S513.intro) || /:\s*'/.test(S513.intro) || /—/.test(S513.intro)) problems.push('513 intro must quote the LEGO, carry no brackets, and read as a free line (no template colon/dash)');
  for (const e of S513.edits) {
    expectLive(e.id, e.before);
    const L = lego(e.lego); if (L && !phraseContainsLego(e.after, L)) problems.push(`${e.id}: after "${e.after.known}" | "${e.after.target}" does not contain ${e.lego}`);
    if (/\bfa male la testa\b/.test(e.after.target) && !/\b(mi|ti|le|gli) fa male la testa\b/.test(e.after.target)) problems.push(`${e.id}: "fa male la testa" without its pronoun`);
    if (/\bla testa fa\b/.test(e.after.target)) problems.push(`${e.id}: "la testa fa male" says nobody's head`);
  }
  for (const a of S513.adds) { if (byId[a.id]) problems.push(`${a.id}: already live`); const L = lego(a.lego); if (L && !phraseContainsLego(a, L)) problems.push(`${a.id}: does not contain ${a.lego}`); if (!/\bti\b/.test(a.target)) problems.push(`${a.id}: a 'your head' row needs ti`); }
  // (2) 151
  const seed151 = rows.find((r) => r.kind === 'seed' && r.sn === 151);
  if (seed151 && (seed151.known !== S151.sentence.before.known || seed151.target !== S151.sentence.before.target)) problems.push(`seed 151 reads "${seed151.known}" | "${seed151.target}"`);
  if (S151.sentence.after.target !== S151.sentence.before.target) problems.push('seed 151: the Italian must not change');
  const l151 = expectLive(S151.lego.id, S151.lego.from);
  if (l151 && l151.is_new !== true) problems.push(`${S151.lego.id}: is_new ${l151.is_new} (expected true before)`);
  const l86 = expectLive(S151.earlier.id, S151.earlier);
  if (l86 && !l86.is_new) problems.push(`${S151.earlier.id} is not new — then 151 L01 would not be the LATER duplicate`);
  if (!isDuplicate(S151.lego.to, S151.earlier)) problems.push(`${S151.lego.id} → "${S151.lego.to.known}" | "${S151.lego.to.target}" is NOT a both-sides duplicate of ${S151.earlier.id}; not-new is unjustified`);
  if (S151.lego.to.is_new !== false) problems.push('151 L01 must be marked not new');
  for (const e of S151.edits) { expectLive(e.id, e.before); const L = e.lego === S151.lego.id ? S151.lego.to : lego(e.lego); if (L && !phraseContainsLego(e.after, L)) problems.push(`${e.id}: after does not contain ${e.lego}`); }
  for (const d of S151.deletes) expectLive(d.id, d);
  if (byId['S0086L01U04'] && !isDuplicate(byId['S0086L01U04'], { known: "it wasn't what I wanted to say", target: 'non era quello che volevo dire' })) problems.push('S0151L01U06 delete: S0086L01U04 is not the twin it was written against');
  for (const m of S151.moves) {
    expectLive(m.from, m.before);
    if (byId[m.to]) problems.push(`${m.to}: landing id already live`);
    const L = lego(m.lego);
    if (!L) problems.push(`${m.lego}: landing LEGO not live`);
    else { if (!L.is_new) problems.push(`${m.lego}: landing LEGO is not new — P25`); if (!phraseContainsLego(m.after, L)) problems.push(`${m.to}: "${m.after.known}" | "${m.after.target}" does not contain ${m.lego} "${L.known}" | "${L.target}"`); if (L.sn !== m.seed) problems.push(`${m.lego}: seed ${L.sn} ≠ ${m.seed}`); }
    if (!containsWords(m.after.target, 'non era')) problems.push(`${m.to}: lost non era`);
  }
  for (const s of S151.stay) { expectLive(s.id, s); if (phraseContainsLego(s, S151.lego.to)) { /* fine: still under its (dark) LEGO */ } }
  // every non-component row still under 151 L01 after the pass contains "it wasn't | non era" or is a listed stay
  const under151 = rows.filter((r) => r.id.startsWith('S0151L01') && r.id !== 'S0151L01' && (r.kind === 'build' || r.kind === 'use'));
  for (const r of under151) {
    const e = S151.edits.find((x) => x.id === r.id); const after = e ? e.after : r;
    const gone = S151.deletes.some((d) => d.id === r.id) || S151.moves.some((m) => m.from === r.id);
    const stays = S151.stay.some((s) => s.id === r.id);
    if (!gone && !stays && !phraseContainsLego(after, S151.lego.to)) problems.push(`${r.id}: still under S0151L01 and does not contain "it wasn't | non era"`);
    if (!gone && !e && !stays) problems.push(`${r.id}: unaccounted row under S0151L01`);
  }
  if (rows.some((r) => r.sn === 159 && [...S151.edits, ...S151.deletes, ...S151.moves.map((m) => ({ id: m.from }))].some((x) => x.id === r.id))) problems.push('seed 159 touched');
  // (3) 607
  const seed607 = rows.find((r) => r.kind === 'seed' && r.sn === 607);
  if (seed607 && (seed607.known !== S607.sentence.known || seed607.target !== S607.sentence.target)) problems.push(`seed 607 reads "${seed607.known}" | "${seed607.target}"`);
  const hasIt = /\bl'avrei\b|\blo avrei\b/.test(S607.sentence.target) || /\b(i'd|i would) have done it\b/i.test(S607.sentence.known);
  if (hasIt) problems.push("seed 607 carries it/l' with this verb — the ruling's OTHER branch (grow to l'avrei fatto) applies; this tool marks it new instead");
  const l607 = expectLive(S607.lego.id, { known: S607.lego.known, target: S607.lego.target });
  if (l607 && l607.is_new !== false) problems.push(`${S607.lego.id}: is_new ${l607.is_new} (expected false before)`);
  if (l607 && JSON.stringify(l607.components) !== JSON.stringify(S607.lego.components)) problems.push(`${S607.lego.id}: components are ${JSON.stringify(l607.components)}`);
  const earlierPair = rows.filter((r) => r.kind === 'lego' && r.sn < 607 && isDuplicate(r, S607.lego));
  if (earlierPair.length) problems.push(`${S607.lego.id} still has an earlier exact pair: ${earlierPair.map((r) => r.id).join(', ')} — must stay not-new`);
  const g = byId[S607.grown152.id]; if (!g || g.known !== S607.grown152.known || g.target !== S607.grown152.target) problems.push(`${S607.grown152.id} does not read "${S607.grown152.known}" | "${S607.grown152.target}" — #649·I's grow is not in place`);
  if (!S607.intro.includes(`'${S607.lego.known}'`)) problems.push('607 intro does not quote the LEGO');
  if (!containsWords(S607.intro.split("as in — '")[1] || '', S607.lego.known)) problems.push('607 intro example does not contain the LEGO');
  for (const a of S607.adds) {
    if (byId[a.id]) problems.push(`${a.id}: already live`);
    if (!phraseContainsLego(a, S607.lego)) problems.push(`${a.id}: does not contain the LEGO`);
    if (/\bi would have done it\b/i.test(a.known) || /\bl'avrei\b/i.test(a.target)) problems.push(`${a.id}: "it" belongs to l'avrei fatto (S0152L01, P28)`);
  }
  if (!rows.some((r) => r.id === 'S0607L02B01') && !S607.adds.some((a) => a.id === 'S0607L02B01')) problems.push('607 L02 has no B01');
  // use rows never repeat a pair inside their basket (P-rules); builds may
  for (const [legoId, list] of [['S0513L03', [...S513.edits.filter((e) => e.lego === 'S0513L03').map((e) => ({ id: e.id, ...e.after })), ...S513.adds]], ['S0607L02', S607.adds.filter((a) => a.role === 'use')]]) {
    const seen = new Map();
    const others = rows.filter((r) => r.id.startsWith(legoId) && r.kind === 'use' && !list.some((x) => x.id === r.id));
    for (const p of [...others, ...list.filter((x) => !x.role || x.role === 'use')]) { const k = norm(p.known) + '|' + norm(p.target); if (seen.has(k)) problems.push(`${p.id} duplicates ${seen.get(k)} inside ${legoId}`); seen.set(k, p.id); }
  }
  // every written pair, for ZUT against the course
  const pairs = [
    ...S513.edits.map((e) => ({ id: e.id, ...e.after })), ...S513.adds.map((a) => ({ id: a.id, known: a.known, target: a.target })),
    { id: S151.lego.id, ...S151.lego.to, isLego: true }, ...S151.edits.map((e) => ({ id: e.id, ...e.after })), ...S151.moves.map((m) => ({ id: m.to, ...m.after })),
    ...S607.adds.map((a) => ({ id: a.id, known: a.known, target: a.target })),
  ];
  const seeds = { edited: [513, 151, 607], landing: [...new Set(S151.moves.map((m) => m.seed))] };
  return { problems, pairs, seeds };
}

/** The plan applied to a row snapshot, purely (tested; the live apply mirrors it row for row). */
function applyPlanToRows(rows) {
  const out = rows.map((r) => ({ ...r }));
  const byId = {}; for (const r of out) byId[r.id] = r;
  for (const e of [...S513.edits, ...S151.edits]) Object.assign(byId[e.id], e.after);
  byId.S0151.known = S151.sentence.after.known;
  Object.assign(byId[S151.lego.id], { known: S151.lego.to.known, target: S151.lego.to.target, is_new: false });
  byId[S607.lego.id].is_new = true;
  const gone = new Set([...S151.deletes.map((d) => d.id), ...S151.moves.map((m) => m.from)]);
  const kept = out.filter((r) => !gone.has(r.id));
  for (const m of S151.moves) kept.push({ kind: 'use', sn: m.seed, id: m.to, known: m.after.known, target: m.after.target });
  for (const a of S513.adds) kept.push({ kind: 'use', sn: 513, id: a.id, known: a.known, target: a.target });
  for (const a of S607.adds) kept.push({ kind: a.role, sn: 607, id: a.id, known: a.known, target: a.target });
  return kept;
}
/** What must be true of the course AFTER the pass (fails on the pre-fix course, passes on the post-fix one). */
function endStateProblems(rows) {
  const p = [];
  const byId = {}; for (const r of rows) byId[r.id] = r;
  const under = (legoId) => rows.filter((r) => r.id.startsWith(legoId) && r.id !== legoId && (r.kind === 'build' || r.kind === 'use'));
  // 513: every my-head phrase says whose head; no "I don't move" for "don't move"; every L03/L04 row contains its LEGO
  for (const r of rows.filter((r) => r.sn === 513 && r.kind !== 'lego' && r.kind !== 'seed' && r.kind !== 'component')) {
    if (/\bfa male la testa\b/.test(r.target) && !/\b(mi|ti|le|gli) fa (davvero |molto |più )?male la testa\b/.test(r.target) && !/\bmi fa (davvero |molto )?male la testa\b/.test(r.target)) p.push(`${r.id}: "${r.target}" — whose head?`);
    if (/\bla testa fa\b/.test(r.target)) p.push(`${r.id}: "la testa fa male" says nobody's head`);
    if (/\bnon muovo\b/.test(r.target) && /don't move/i.test(r.known)) p.push(`${r.id}: non muovo is "I don't move"`);
    if (/she moves/i.test(r.known) && /\bmuovo\b/.test(r.target)) p.push(`${r.id}: K26 person`);
  }
  for (const r of under('S0513L03')) if (!phraseContainsLego(r, { id: 'S0513L03', known: 'my head', target: 'la testa' })) p.push(`${r.id}: does not contain S0513L03`);
  for (const r of under('S0513L04')) if (!phraseContainsLego(r, { id: 'S0513L04', known: 'up and down', target: 'su e giù' })) p.push(`${r.id}: does not contain S0513L04`);
  if (!rows.some((r) => r.sn === 513 && r.kind === 'use' && /your head/i.test(r.known) && /\bti fa\b/.test(r.target))) p.push("513: no 'your head' example");
  // 151: seed says "it wasn't"; L01 is the not-new twin of 86 L01; every row under it contains it or is listed; no quello-non-era build
  if (!/^it wasn't /.test(byId.S0151?.known || '')) p.push(`seed 151 reads "${byId.S0151?.known}"`);
  const l = byId.S0151L01;
  if (!l || l.is_new !== false || !isDuplicate(l, byId.S0086L01)) p.push('S0151L01 is not the not-new twin of S0086L01');
  for (const r of under('S0151L01')) if (!phraseContainsLego(r, l) && !S151.stay.some((s) => s.id === r.id)) p.push(`${r.id}: under S0151L01 without containing it`);
  if (byId.S0151L01B03) p.push('S0151L01B03 "that wasn\'t | quello non era" still live');
  for (const m of S151.moves) { const r = byId[m.to]; const L = byId[m.lego]; if (!r || !L || !L.is_new || !phraseContainsLego(r, L)) p.push(`${m.to}: not under new ${m.lego} containing it`); }
  if (byId.S0159L01 && !(byId.S0159L01.known === "that isn't" && byId.S0159L01.target === 'non è' && byId.S0159L01.is_new === true)) p.push('seed 159 touched (S0159L01 must still read "that isn\'t | non è", new)');
  if (rows.filter((r) => r.sn === 159 && r.kind !== 'lego' && r.kind !== 'seed').length !== 23 && rows.some((r) => r.sn === 159 && r.kind === 'seed')) p.push('seed 159 row count moved');
  // 607: L02 new, with a played basket that contains it and never says "it"
  const l607 = byId.S0607L02;
  if (!l607 || l607.is_new !== true) p.push('S0607L02 is not new');
  const b = under('S0607L02');
  if (b.filter((r) => r.kind === 'build').length < 3 || b.filter((r) => r.kind === 'use').length < 5) p.push(`S0607L02 basket too thin (${b.length})`);
  for (const r of b) { if (!phraseContainsLego(r, l607 || S607.lego)) p.push(`${r.id}: does not contain S0607L02`); if (/\bl'avrei\b/.test(r.target)) p.push(`${r.id}: l'avrei belongs to 152`); }
  // never delete a LEGO
  const n = rows.filter((r) => r.kind === 'lego' && [151, 513, 607].includes(r.sn)).length;
  if (n !== 8) p.push(`LEGO count in 151/513/607 is ${n}, expected 8`);
  return p;
}

async function loadRows(pg) {
  const { rows } = await pg.query(
    `SELECT 'lego' AS kind, seed_number AS sn, lego_id AS id, known_text AS known, target_text AS target, components, is_new FROM course_legos WHERE course_code=$1
     UNION ALL SELECT phrase_role, seed_number, id, known_text, target_text, NULL, NULL FROM course_practice_phrases WHERE course_code=$1
     UNION ALL SELECT 'seed', seed_number, seed_id, known_text, target_text, NULL, NULL FROM course_seeds WHERE course_code=$1 ORDER BY 2, 3`, [COURSE]);
  return rows.map((r) => ({ ...r, sn: Number(r.sn), id: short(r.id) }));
}
/** A word is taught at seed N if any row at or before N carries it (same test as ita-future-in-past). */
async function newVocabulary(pg, seed, text, side) {
  const col = side === 'known' ? 'known_text' : 'target_text';
  const out = [];
  for (const w of new Set(words(text))) {
    const { rows } = await pg.query(
      `SELECT 1 FROM (SELECT seed_number, ${col} AS t FROM course_practice_phrases WHERE course_code=$1 UNION ALL SELECT seed_number, ${col} FROM course_legos WHERE course_code=$1 UNION ALL SELECT seed_number, ${col} FROM course_seeds WHERE course_code=$1) x
       WHERE seed_number <= $2 AND ' '||regexp_replace(lower(replace(t,'’','''')), '[.,!?;:"]', ' ', 'g')||' ' LIKE '% '||$3||' %' LIMIT 1`, [COURSE, seed, w]);
    if (!rows.length) out.push(w);
  }
  return out;
}
async function vocabularyGuards(pg) {
  const problems = [];
  const check = async (id, seed, known, target) => {
    const k = await newVocabulary(pg, seed, known, 'known'), t = await newVocabulary(pg, seed, target, 'target');
    if (k.length || t.length) problems.push(`${id} at seed ${seed} uses untaught words: ${[...k.map((w) => `en:${w}`), ...t.map((w) => `it:${w}`)].join(', ')}`);
  };
  for (const e of S513.edits) await check(e.id, 513, e.after.known, e.after.target);
  for (const a of S513.adds) await check(a.id, 513, a.known, a.target);
  for (const m of S151.moves) await check(m.to, m.seed, m.after.known, m.after.target);
  for (const a of S607.adds) await check(a.id, 607, a.known, a.target);
  return problems;
}
/** ZUT against the live course for every pair this job writes: K2 (one English → two Italians) is a HOLD. */
async function zutAgainstCourse(pg, D) {
  const ours = new Set([...D.pairs.map((p) => p.id), ...S151.deletes.map((d) => d.id), ...S151.moves.map((m) => m.from)]);
  const clashes = [];
  for (const p of D.pairs) {
    const { rows } = await pg.query(
      `SELECT id, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND phrase_role<>'component' AND id<>$4 AND ((lower(trim(known_text))=lower($2) AND lower(trim(target_text))<>lower($3)) OR (lower(trim(target_text))=lower($3) AND lower(trim(known_text))<>lower($2)))
       UNION ALL SELECT lego_id, known_text, target_text FROM course_legos WHERE course_code=$1 AND lego_id<>$5 AND ((lower(trim(known_text))=lower($2) AND lower(trim(target_text))<>lower($3)) OR (lower(trim(target_text))=lower($3) AND lower(trim(known_text))<>lower($2)))`,
      [COURSE, p.known, p.target, full(p.id), p.id]);
    for (const r of rows.filter((r) => !ours.has(short(r.id)))) clashes.push({ change: p.id, pair: `"${p.known}" → "${p.target}"`, vs: `${short(r.id)} "${r.known_text}" → "${r.target_text}"`, k2: r.known_text.trim().toLowerCase() === p.known.toLowerCase() });
  }
  return clashes;
}

// ── Apply ──────────────────────────────────────────────────────────────────────────────────
async function applyContent(pg, supabase, D, log) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const ev = (op, scope, detail) => recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: op, scope, detail });
  const { rows: approvedRows } = await pg.query('SELECT seed_number, approved_at FROM course_seeds WHERE course_code=$1 AND seed_number = ANY($2)', [COURSE, [...D.seeds.edited, ...D.seeds.landing]]);
  log.approvedBefore = Object.fromEntries(approvedRows.map((r) => [r.seed_number, r.approved_at]));
  const toUnapprove = [...new Set([...D.seeds.edited, ...D.seeds.landing])];
  const allEdits = [...S513.edits, ...S151.edits];
  const E = {};
  E.seed = await ev('seed-edit', { seed_numbers: [151], rows: 1 }, { ruling: RULING, job: JOB, changes: [{ seed: 151, from: S151.sentence.before, to: S151.sentence.after }] });
  E.lego = await ev('lego-edit', { seed_numbers: [151, 607], lego_ids: [S151.lego.id, S607.lego.id], rows: 2 }, { ruling: RULING, job: JOB, changes: [{ id: S151.lego.id, from: S151.lego.from, to: S151.lego.to, why: `later both-sides duplicate of ${S151.earlier.id}` }, { id: S607.lego.id, from: S607.lego.from, to: S607.lego.to, why: `no earlier exact pair since ${S607.grown152.id} grew; seed has no it/l'` }] });
  E.phrase = await ev('phrase-edit', { seed_numbers: [513, 151], phrase_ids: allEdits.map((e) => full(e.id)), rows: allEdits.length }, { ruling: RULING, job: JOB, changes: allEdits.map((e) => ({ id: full(e.id), from: e.before, to: e.after, why: e.why })) });
  E.move = await ev('phrase-move', { seed_numbers: [151, ...D.seeds.landing], phrase_ids: S151.moves.map((m) => full(m.to)), rows: S151.moves.length }, { ruling: RULING, job: JOB, moves: S151.moves.map((m) => ({ from: full(m.from), to: full(m.to), lego: m.lego, known_from: m.before.known, target_from: m.before.target, known_to: m.after.known, target_to: m.after.target, why: m.why })) });
  E.add = await ev('phrase-add', { seed_numbers: [513, 607], phrase_ids: [...S513.adds, ...S607.adds].map((a) => full(a.id)), rows: S513.adds.length + S607.adds.length }, { ruling: RULING, job: JOB, rows: [...S513.adds, ...S607.adds].map((a) => ({ id: full(a.id), lego: a.lego, known: a.known, target: a.target, why: a.why || null })) });
  E.del = await ev('phrase-delete', { seed_numbers: [151], phrase_ids: S151.deletes.map((d) => full(d.id)), rows: S151.deletes.length }, { ruling: RULING, job: JOB, rows: S151.deletes.map((d) => ({ id: full(d.id), known: d.known, target: d.target, why: d.why })) });
  E.unapprove = await ev('unapprove', { seed_numbers: toUnapprove, rows: toUnapprove.length }, { why: 'seeds edited (513, 151, 607) or given a rehomed row (86, 112, 123, 143) — Kai should read them', job: JOB, approved_at_before: log.approvedBefore });
  log.events = E;
  const src = {};
  for (const id of [...S151.moves.map((m) => m.from), 'S0151L01']) {
    const { rows: [r] } = await pg.query(`SELECT known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id, known_text, target_text FROM ${id === 'S0151L01' ? 'course_legos WHERE course_code=$1 AND lego_id=$2' : 'course_practice_phrases WHERE course_code=$1 AND id=$2'}`, [COURSE, id === 'S0151L01' ? id : full(id)]);
    src[id] = r;
  }
  const nextPos = {};
  const positionFor = async (seed) => { if (nextPos[seed] == null) { const { rows: [r] } = await pg.query('SELECT coalesce(max(position),0) AS m FROM course_practice_phrases WHERE course_code=$1 AND seed_number=$2', [COURSE, seed]); nextPos[seed] = Number(r.m); } return ++nextPos[seed]; };
  const insertRow = async (r, audio, event, legoTarget) => {
    const ins = await pg.query(`INSERT INTO course_practice_phrases (id, course_code, seed_number, lego_index, position, known_text, target_text, word_count, lego_count, metadata, status, phrase_role, connected_lego_ids, lego_position, lego_id, introduce, known_audio_id, target1_audio_id, target2_audio_id, last_edit_event_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'draft',$11,'{}',$12,$13,true,$14,$15,$16,$17)`,
      [full(r.id), COURSE, r.seed, r.lego_index, await positionFor(r.seed), r.known, r.target, r.target.length, r.target.split(/\s+/).length, JSON.stringify({ format: 'build_use', source: SWEEP, job: JOB, ...(r.movedFrom ? { moved_from: full(r.movedFrom) } : {}) }), r.role || 'use', legoPosition(r.target, legoTarget), r.lego, audio.known || null, audio.t1 || null, audio.t2 || null, event]);
    if (ins.rowCount !== 1) throw new Error(`${r.id}: insert ${ins.rowCount}`);
  };
  const legoTargets = {};
  for (const id of ['S0086L01', 'S0143L01', 'S0123L01', 'S0143L02', 'S0112L01', 'S0513L03', 'S0607L02']) legoTargets[id] = (await pg.query('SELECT target_text FROM course_legos WHERE course_code=$1 AND lego_id=$2', [COURSE, id])).rows[0].target_text;
  await pg.query('BEGIN');
  try {
    // seed 151: English only; its known clip is detached (linked back by text in AUDIO_ONLY once the phrase twin is filled)
    const s = await pg.query('UPDATE course_seeds SET known_text=$1, known_audio_id=NULL, last_edit_event_id=$2, updated_at=now() WHERE course_code=$3 AND seed_number=151 AND known_text=$4', [S151.sentence.after.known, E.seed, COURSE, S151.sentence.before.known]);
    if (s.rowCount !== 1) throw new Error(`seed 151: ${s.rowCount} rows`);
    // 151 L01: text, not-new, intro detached (kept) — a not-new LEGO carries no intro
    const u1 = await pg.query('UPDATE course_legos SET known_text=$1, is_new=false, known_audio_id=NULL, presentation_audio_id=NULL, last_edit_event_id=$2, updated_at=now() WHERE course_code=$3 AND lego_id=$4 AND known_text=$5 AND target_text=$6 AND is_new=true', [S151.lego.to.known, E.lego, COURSE, S151.lego.id, S151.lego.from.known, S151.lego.from.target]);
    if (u1.rowCount !== 1) throw new Error(`${S151.lego.id}: ${u1.rowCount} rows`);
    const oldIntro = src.S0151L01.presentation_audio_id;
    if (oldIntro) {
      await pg.query('UPDATE course_audio SET lego_id=NULL WHERE id::text=$1 AND lego_id=$2', [oldIntro, S151.lego.id]);
      await pg.query('UPDATE lego_introductions SET presentation_audio_id=NULL, audio_uuid=NULL, updated_at=now() WHERE course_code=$1 AND lego_id=$2', [COURSE, S151.lego.id]);
      const { rows: [oldClip] } = await pg.query('SELECT text, voice_id FROM course_audio WHERE id::text=$1', [oldIntro]);
      await pg.query(`INSERT INTO content_audio_link_drops (table_name, row_id, course_code, seed_number, column_name, role, old_audio_id, old_text, old_voice_id, new_text, reason) VALUES ('course_legos',$1,$2,151,'presentation_audio_id','presentation',$3,$4,$5,NULL,$6)`,
        [S151.lego.id, COURSE, oldIntro, oldClip?.text || null, oldClip?.voice_id || null, `${SWEEP}: LEGO marked not new (later duplicate of S0086L01, job ${JOB}, event ${E.lego}) — carries no intro; clip detached, asset kept`]);
      log.introDropped = { lego: S151.lego.id, clip: oldIntro, text: oldClip?.text };
    }
    // 607 L02: new (text and components untouched); its intro is written after the transaction
    const u2 = await pg.query('UPDATE course_legos SET is_new=true, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND lego_id=$3 AND known_text=$4 AND target_text=$5 AND is_new=false', [E.lego, COURSE, S607.lego.id, S607.lego.known, S607.lego.target]);
    if (u2.rowCount !== 1) throw new Error(`${S607.lego.id}: ${u2.rowCount} rows`);
    // phrase edits: a changed side drops its clip (never deleted), the other keeps it
    for (const c of allEdits) {
      const knownMoved = c.before.known !== c.after.known, targetMoved = c.before.target !== c.after.target;
      const r = await pg.query(`UPDATE course_practice_phrases SET known_text=$1, target_text=$2, word_count=$3, lego_count=$4, qa_checked=NULL, decomposition=NULL, decomposition_course_version=NULL, display_tiling=NULL, display_tiling_version=NULL,
          known_audio_id = CASE WHEN $10 THEN NULL ELSE known_audio_id END, target1_audio_id = CASE WHEN $11 THEN NULL ELSE target1_audio_id END, target2_audio_id = CASE WHEN $11 THEN NULL ELSE target2_audio_id END,
          lego_position=$12, last_edit_event_id=$5, updated_at=now() WHERE course_code=$6 AND id=$7 AND known_text=$8 AND target_text=$9`,
        [c.after.known, c.after.target, c.after.target.length, c.after.target.split(/\s+/).length, E.phrase, COURSE, full(c.id), c.before.known, c.before.target, knownMoved, targetMoved, legoPosition(c.after.target, legoTargets[c.lego] || (c.lego === 'S0151L01' ? 'non era' : c.lego === 'S0151L02' ? 'speravo succedesse' : 'su e giù'))]);
      if (r.rowCount !== 1) throw new Error(`${c.id}: ${r.rowCount} rows`);
    }
    // moves: insert under the new LEGO (clips kept where the side is unchanged), delete the old row
    for (const m of S151.moves) {
      const sr = src[m.from];
      const knownMoved = m.before.known !== m.after.known, targetMoved = m.before.target !== m.after.target;
      await insertRow({ id: m.to, seed: m.seed, lego_index: m.lego_index, lego: m.lego, known: m.after.known, target: m.after.target, role: 'use', movedFrom: m.from }, { known: knownMoved ? null : sr.known_audio_id, t1: targetMoved ? null : sr.target1_audio_id, t2: targetMoved ? null : sr.target2_audio_id }, E.move, legoTargets[m.lego]);
      const del = await pg.query('DELETE FROM course_practice_phrases WHERE course_code=$1 AND id=$2 AND known_text=$3 AND target_text=$4', [COURSE, full(m.from), m.before.known, m.before.target]);
      if (del.rowCount !== 1) throw new Error(`${m.from}: delete ${del.rowCount}`);
    }
    for (const a of S513.adds) await insertRow({ id: a.id, seed: 513, lego_index: a.lego_index, lego: a.lego, known: a.known, target: a.target, role: 'use' }, {}, E.add, legoTargets.S0513L03);
    for (const a of S607.adds) await insertRow({ id: a.id, seed: 607, lego_index: a.lego_index, lego: a.lego, known: a.known, target: a.target, role: a.role }, {}, E.add, legoTargets.S0607L02);
    for (const d of S151.deletes) {
      const del = await pg.query('DELETE FROM course_practice_phrases WHERE course_code=$1 AND id=$2 AND known_text=$3 AND target_text=$4', [COURSE, full(d.id), d.known, d.target]);
      if (del.rowCount !== 1) throw new Error(`${d.id}: delete ${del.rowCount}`);
    }
    const un = await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number = ANY($3)', [E.unapprove, COURSE, toUnapprove]);
    log.unapproved = { seeds: toUnapprove, rows: un.rowCount };
    // final guards inside the transaction
    const { rows: [n151] } = await pg.query('SELECT is_new FROM course_legos WHERE course_code=$1 AND lego_id=$2', [COURSE, S151.lego.id]);
    const { rows: [n607] } = await pg.query('SELECT is_new FROM course_legos WHERE course_code=$1 AND lego_id=$2', [COURSE, S607.lego.id]);
    if (n151.is_new !== false || n607.is_new !== true) throw new Error('is_new end state wrong');
    const { rows: [cnt] } = await pg.query('SELECT count(*)::int AS n FROM course_legos WHERE course_code=$1 AND seed_number IN (151,513,607)', [COURSE]);
    if (cnt.n !== 8) throw new Error(`LEGO count in 151/513/607 is ${cnt.n}, expected 8 — never delete a LEGO`);
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
  await refreshNow();
  const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs');
  log.audioPass = await queueAudioPass(supabase, { courseCode: COURSE, requestedBy: `@${SWEEP}`, reason: `job ${JOB}: seeds 513/151/607 — ${allEdits.length} phrases edited, ${S151.moves.length} rehomed, ${S513.adds.length + S607.adds.length} added, 2 deleted; Italian on Elsa/Benigno by the tool, English prompts on temporary Sonia (ita-sonia-temporary-fill SCOPE=ids), intros re-authored`, metadata: { job: JOB, seeds: toUnapprove } });
}

// ── Italian audio: existing Elsa/Benigno clip by text, else Azure through the guarded door ───
async function fillItalian(pg, supabase, log) {
  const ids = [...S513.edits.filter((e) => e.before.target !== e.after.target).map((e) => e.id), ...S513.adds.map((a) => a.id), ...S151.moves.filter((m) => m.before.target !== m.after.target).map((m) => m.to), ...S607.adds.map((a) => a.id)].map(full);
  const { rows } = await pg.query(`SELECT 'course_practice_phrases' AS tbl, id, target_text, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2)`, [COURSE, ids]);
  const slots = [];
  for (const r of rows) for (const role of ['target1', 'target2']) if (!r[`${role}_audio_id`]) slots.push({ tbl: r.tbl, id: r.id, role, text: r.target_text });
  const link = async (slot, audioId) => (await pg.query(`UPDATE ${slot.tbl} SET ${slot.role}_audio_id=$1 WHERE course_code=$2 AND id=$3 AND target_text=$4 AND ${slot.role}_audio_id IS NULL`, [audioId, COURSE, slot.id, slot.text])).rowCount === 1;
  const current = async (slot) => (await pg.query(`SELECT ${slot.role}_audio_id AS id FROM ${slot.tbl} WHERE course_code=$1 AND id=$2`, [COURSE, slot.id])).rows[0]?.id || null;
  log.italian = [];
  for (const slot of slots) {
    const entry = { ...slot }; log.italian.push(entry);
    const { rows: have } = await pg.query(`SELECT id, voice_id FROM course_audio WHERE language='ita' AND text_normalized=normalize_text($1) AND s3_key IS NOT NULL AND s3_key NOT LIKE 'pending/%' AND voice_id = ANY($2) ORDER BY (course_code=$3) DESC, (role=$4) DESC, created_at DESC LIMIT 1`, [slot.text, AZURE_VOICE_IDS[slot.role], COURSE, slot.role]);
    if (have[0]) {
      const already = await current(slot);
      entry.result = `linked existing ${have[0].voice_id} clip ${have[0].id}`;
      entry.linked = already ? (already === have[0].id || `slot already holds ${already}`) : await link(slot, have[0].id);
      continue;
    }
    entry.result = await renderItalian(supabase, slot, link, current);
    entry.linked = (await current(slot)) !== null;
  }
}
async function renderItalian(supabase, slot, link, current) {
  process.env.PHASE8_NO_LISTEN = '1';
  const phase8 = require('../../services/phases/phase8-audio-v13.cjs');
  const ttsService = require('../../services/tts-service.cjs');
  const veracity = require('../../services/audio-veracity.cjs');
  const voiceConfigService = require('../../services/voice-config-service.cjs');
  const { writeOrSwapClip } = require('../../services/shared/audio-revision-swap.cjs');
  const { normalizeForAudio } = require('../../services/shared/text-normalize.cjs');
  const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
  const { v4: uuidv4 } = require('uuid');
  const s3 = new S3Client({ region: process.env.AWS_REGION || 'eu-west-1' });
  const logger = console;
  const voice = slot.role === 'target1' ? ELSA : BENIGNO;
  try {
    const renderAndMaster = async () => {
      const out = await ttsService.generateWithRetry(slot.text, 'azure', { door: { courseCode: COURSE, intro: false, language: 'ita', voiceBound: true }, subscriptionKey: process.env.AZURE_SPEECH_KEY, region: process.env.AZURE_SPEECH_REGION || 'westeurope', voiceName: voice.voiceName, speed: 1 });
      if (out.existingClip && !AZURE_VOICE_IDS[slot.role].includes(out.existingClip.voice_id)) throw new Error(`door offered ${out.existingClip.voice_id}; Azure only`);
      const { buffer, durationMs } = await phase8.masterAudio(out.audioBuffer, slot.text, await voiceConfigService.masteringOptsFor(voice.voiceName, 'azure'));
      return { buffer, durationMs, wordBoundaries: out.wordBoundaries };
    };
    const gated = await veracity.renderChecked({ render: renderAndMaster, expectedText: slot.text, language: 'ita', sampler: veracity.ALWAYS_SAMPLER, logger, meta: { courseCode: COURSE, role: slot.role, voiceId: voice.voiceName, phrase_id: slot.id, originalText: slot.text } });
    if (!gated.published) throw new Error(`veracity gate: quarantined after ${gated.attempts} attempts (${gated.verdict?.reason})`);
    const newAudioId = uuidv4().toUpperCase(), newS3Key = `mastered/${newAudioId}.mp3`;
    await s3.send(new PutObjectCommand({ Bucket: phase8.S3_BUCKET, Key: newS3Key, Body: gated.buffer, ContentType: 'audio/mpeg', CacheControl: 'public, max-age=31536000, immutable' }));
    const verdictColumns = veracity.verdictColumns(gated.verdict, { checker: SWEEP, attempts: gated.attempts });
    const textNormalized = normalizeForAudio(slot.text);
    const base = { course_code: COURSE, text: slot.text, text_normalized: textNormalized, language: 'ita', role: slot.role, voice_id: voice.voiceId, origin: 'tts' };
    const out = await writeOrSwapClip({ supabase, identity: { course_code: COURSE, text_normalized: textNormalized, language: 'ita', role: slot.role, voice_id: voice.voiceId }, insertRow: { ...base, s3_key: newS3Key, duration_ms: gated.durationMs, word_boundaries: gated.wordBoundaries || null, ...verdictColumns }, swapPatch: { voice_id: voice.voiceId, origin: 'tts', word_boundaries: gated.wordBoundaries || null, text: slot.text, ...verdictColumns }, newS3Key, durationMs: gated.durationMs, source: SWEEP, acceptedBy: `${SWEEP} (${slot.role}, ${voice.voiceName})`, reason: RULING, logger });
    if (!(await current(slot))) await link(slot, out.audioId);
    return `rendered ${voice.voiceName} clip ${out.audioId} (${gated.durationMs} ms)`;
  } catch (e) { return `REFUSED/FAILED: ${e.message}`; }
}

// ── Intros: 513 L03 human-authored; 607 L02 template. Sonia presentation route (#546·I). ───
async function renderSoniaPresentation(pg, supabase, text, legoId) {
  process.env.PHASE8_NO_LISTEN = '1';
  const phase8 = require('../../services/phases/phase8-audio-v13.cjs');
  const ttsService = require('../../services/tts-service.cjs');
  const veracity = require('../../services/audio-veracity.cjs');
  const voiceConfigService = require('../../services/voice-config-service.cjs');
  const { normalizeForAudio } = require('../../services/shared/text-normalize.cjs');
  const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
  const { v4: uuidv4 } = require('uuid');
  const s3 = new S3Client({ region: process.env.AWS_REGION || 'eu-west-1' });
  const textNormalized = normalizeForAudio(text);
  const { rows: have } = await pg.query(`SELECT id, s3_key, duration_ms, word_boundaries FROM course_audio WHERE language='eng' AND text_normalized=normalize_text($1) AND s3_key IS NOT NULL AND s3_key NOT LIKE 'pending/%' AND voice_id = ANY($2) ORDER BY (course_code=$3) DESC, created_at DESC LIMIT 1`, [text, SONIA_IDS, COURSE]);
  let s3Key, durationMs, wordBoundaries, verdictColumns = {}, how;
  if (have[0]) { ({ s3_key: s3Key, duration_ms: durationMs, word_boundaries: wordBoundaries } = have[0]); how = `reused bytes of Sonia clip ${have[0].id}`; }
  else {
    const masterOpts = await voiceConfigService.masteringOptsFor(SONIA.voiceName, 'azure');
    const renderAndMaster = async () => {
      const out = await ttsService.generateWithRetry(text, 'azure', { door: { courseCode: COURSE, intro: false, language: 'eng', voiceBound: true }, subscriptionKey: process.env.AZURE_SPEECH_KEY, region: process.env.AZURE_SPEECH_REGION || 'westeurope', voiceName: SONIA.voiceName, speed: 1 });
      if (out.existingClip && !SONIA_IDS.includes(out.existingClip.voice_id)) throw new Error(`door offered a ${out.existingClip.voice_id} clip; Sonia only`);
      const { buffer, durationMs } = await phase8.masterAudio(out.audioBuffer, text, masterOpts);
      return { buffer, durationMs, wordBoundaries: out.wordBoundaries };
    };
    const gated = await veracity.renderChecked({ render: renderAndMaster, expectedText: text, language: 'eng', sampler: veracity.ALWAYS_SAMPLER, logger: console, meta: { courseCode: COURSE, role: 'presentation', voiceId: SONIA.voiceName, lego_id: legoId, originalText: text } });
    if (!gated.published) throw new Error(`veracity gate: quarantined after ${gated.attempts} attempts (${gated.verdict?.reason})`);
    const newAudioId = uuidv4().toUpperCase();
    s3Key = `mastered/${newAudioId}.mp3`;
    await s3.send(new PutObjectCommand({ Bucket: phase8.S3_BUCKET, Key: s3Key, Body: gated.buffer, ContentType: 'audio/mpeg', CacheControl: 'public, max-age=31536000, immutable' }));
    durationMs = gated.durationMs; wordBoundaries = gated.wordBoundaries || null;
    verdictColumns = veracity.verdictColumns(gated.verdict, { checker: SWEEP, attempts: gated.attempts });
    how = `rendered Sonia (${durationMs} ms)`;
  }
  const { data, error } = await supabase.from('course_audio').insert({ course_code: COURSE, text, text_normalized: textNormalized, language: 'eng', role: 'presentation', voice_id: SONIA.voiceId, origin: 'tts', s3_key: s3Key, duration_ms: durationMs, word_boundaries: wordBoundaries, lego_id: legoId, ...verdictColumns }).select('id').single();
  if (error) throw new Error(`course_audio insert refused: ${error.message}`);
  return { audioId: data.id, how };
}
async function writeIntros(pg, supabase, log) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const humanAuthored = require('../../services/shared/human-authored-presentations.cjs');
  const { sameCast } = require('./ita-sonia-temporary-fill-2026-09-28.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const lines = [
    { legoId: S513.lego.id, seed: 513, text: S513.intro, human: true },
    { legoId: S607.lego.id, seed: 607, text: S607.intro, human: false },
  ];
  for (const l of lines) {
    const { rows: [lego] } = await pg.query('SELECT lego_id, known_text, target_text, presentation_audio_id FROM course_legos WHERE course_code=$1 AND lego_id=$2', [COURSE, l.legoId]);
    l.live = lego;
    const { rows: [old] } = await pg.query('SELECT id, text, voice_id FROM course_audio WHERE id::text=$1', [lego?.presentation_audio_id || '']);
    l.old = old || null;
  }
  const eventId = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'presentation-edit', scope: { seed_numbers: [513, 607], lego_ids: lines.map((l) => l.legoId), rows: 2 }, detail: { ruling: RULING, job: JOB, lines: lines.map((l) => ({ lego_id: l.legoId, from: l.old?.text || null, to: l.text, old_audio_id: l.old?.id || null, human_authored: l.human })) } });
  log.introEvent = eventId; log.intros = [];
  const engCast = async () => (await pg.query(`SELECT slot, language, gender, rank, voice_id, notes, assigned_by, created_at, updated_at FROM voice_language_roles WHERE language='eng' ORDER BY slot, gender, rank, voice_id`)).rows;
  log.castBefore = await engCast();
  if (log.castBefore.some((r) => SONIA_IDS.includes(r.voice_id))) throw new Error('Sonia already in the English cast — a previous run did not restore it');
  let castRow = false;
  try {
    await pg.query(`INSERT INTO voice_language_roles (slot, language, gender, rank, voice_id, notes, assigned_by) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [TEMP_PRES_ROW.slot, TEMP_PRES_ROW.language, TEMP_PRES_ROW.gender, TEMP_PRES_ROW.rank, TEMP_PRES_ROW.voice_id, `TEMPORARY — ${RULING}. Removed by the same run.`, SWEEP]);
    castRow = true;
    for (const l of lines) {
      const entry = { legoId: l.legoId, text: l.text, from: l.old?.text || null, human: l.human }; log.intros.push(entry);
      if (l.human) {
        const mark = await humanAuthored.markHumanAuthored(supabase, { courseCode: COURSE, legoId: l.legoId, text: l.text, author: 'Kai (wording, 2026-09-28) — line written by job #667·I', authoredOn: '2026-09-28', source: `job ${JOB}`, lego: l.live, by: SWEEP, why: RULING });
        entry.markId = mark.id || mark.lego_id;
      }
      await pg.query('BEGIN');
      try {
        if (l.old) {
          await pg.query('UPDATE course_audio SET lego_id=NULL WHERE id=$1 AND lego_id=$2', [l.old.id, l.legoId]);
          await pg.query(`INSERT INTO content_audio_link_drops (table_name, row_id, course_code, seed_number, column_name, role, old_audio_id, old_text, old_voice_id, new_text, reason) VALUES ('course_legos',$1,$2,$3,'presentation_audio_id','presentation',$4,$5,$6,$7,$8)`,
            [l.legoId, COURSE, l.seed, l.old.id, l.old.text, l.old.voice_id, l.text, `${SWEEP}: intro re-authored (job ${JOB}, event ${eventId}); clip detached, asset kept`]);
        }
        await pg.query('UPDATE course_legos SET presentation_audio_id=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND lego_id=$3', [eventId, COURSE, l.legoId]);
        await pg.query('UPDATE lego_introductions SET presentation_audio_id=NULL, audio_uuid=NULL, updated_at=now() WHERE course_code=$1 AND lego_id=$2', [COURSE, l.legoId]);
        await pg.query('COMMIT');
      } catch (e) { await pg.query('ROLLBACK'); throw e; }
      try {
        const { audioId, how } = await renderSoniaPresentation(pg, supabase, l.text, l.legoId);
        await pg.query('UPDATE course_legos SET presentation_audio_id=$1 WHERE course_code=$2 AND lego_id=$3 AND presentation_audio_id IS NULL', [audioId, COURSE, l.legoId]);
        await pg.query('UPDATE lego_introductions SET presentation_audio_id=$1, audio_uuid=$1, updated_at=now() WHERE course_code=$2 AND lego_id=$3', [audioId, COURSE, l.legoId]);
        entry.audioId = audioId; entry.result = how;
      } catch (e) { entry.result = `SILENT — render refused: ${e.message}`; }
      const { rows: [chk] } = await pg.query('SELECT l.presentation_audio_id, a.text FROM course_legos l LEFT JOIN course_audio a ON a.id::text=l.presentation_audio_id WHERE l.course_code=$1 AND l.lego_id=$2', [COURSE, l.legoId]);
      entry.linkedText = chk?.text || null; entry.mirrors = !!chk?.text && chk.text === l.text;
    }
  } finally {
    if (castRow) await pg.query(`DELETE FROM voice_language_roles WHERE slot=$1 AND language=$2 AND gender=$3 AND rank=$4 AND voice_id=$5 AND assigned_by=$6`, [TEMP_PRES_ROW.slot, TEMP_PRES_ROW.language, TEMP_PRES_ROW.gender, TEMP_PRES_ROW.rank, TEMP_PRES_ROW.voice_id, SWEEP]);
    log.castAfter = await engCast(); log.castRestored = sameCast(log.castBefore, log.castAfter);
  }
}

/** Seed 151's known clip: link by text once a clip with the new English exists (its phrase twin S0151L02B04 is filled by the Sonia pass). */
async function linkSeedKnown(pg, log) {
  const { rows: [seed] } = await pg.query('SELECT known_text, known_audio_id FROM course_seeds WHERE course_code=$1 AND seed_number=151', [COURSE]);
  if (seed.known_audio_id) { log.seedKnown = `already linked ${seed.known_audio_id}`; return; }
  const { rows: have } = await pg.query(`SELECT id, voice_id FROM course_audio WHERE language='eng' AND text_normalized=normalize_text($1) AND s3_key IS NOT NULL AND s3_key NOT LIKE 'pending/%' AND role<>'presentation' ORDER BY (course_code=$2) DESC, (voice_id = ANY($3)) DESC, created_at DESC LIMIT 1`, [seed.known_text, COURSE, SONIA_IDS]);
  if (!have[0]) { log.seedKnown = `no eng clip yet for "${seed.known_text}" — run the Sonia fill for S0151L02B04 first, then AUDIO_ONLY=1 again`; return; }
  const r = await pg.query('UPDATE course_seeds SET known_audio_id=$1 WHERE course_code=$2 AND seed_number=151 AND known_audio_id IS NULL', [have[0].id, COURSE]);
  log.seedKnown = `linked ${have[0].voice_id} clip ${have[0].id} (${r.rowCount} row)`;
}

function englishIdsToFill() {
  return [
    S151.lego.id,
    ...S513.edits.filter((e) => e.before.known !== e.after.known).map((e) => full(e.id)),
    ...S151.edits.filter((e) => e.before.known !== e.after.known).map((e) => full(e.id)),
    ...S151.moves.filter((m) => m.before.known !== m.after.known).map((m) => full(m.to)),
    ...S513.adds.map((a) => full(a.id)), ...S607.adds.map((a) => full(a.id)),
  ];
}

async function main() {
  const APPLY = process.env.APPLY === '1';
  const { Client } = require('pg');
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const { createClient } = require('@supabase/supabase-js');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const supabase = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const log = { sweep: SWEEP, job: JOB, ruling: RULING, apply: APPLY, started: new Date().toISOString() };
  const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');
  try {
    if (process.env.CHECK === '1') {
      const probs = endStateProblems(await loadRows(pg));
      console.log(probs.length ? 'END STATE PROBLEMS:\n  ' + probs.join('\n  ') : 'end state holds on the live course');
      process.exitCode = probs.length ? 2 : 0; return;
    }
    if (process.env.AUDIO_ONLY === '1') {
      // SKIP_ITALIAN=1 while TTS is stopped estate-wide (Tom, 2026-09-28 23:40Z): link what exists, render nothing, retry nothing.
      if (process.env.SKIP_ITALIAN !== '1') { await fillItalian(pg, supabase(), log); for (const a of log.italian) console.log(`  ${short(a.id)} ${a.role} "${a.text}": ${a.result}${a.linked === true ? ' → linked' : a.linked ? ` (${a.linked})` : ''}`); }
      await linkSeedKnown(pg, log); console.log(`seed 151 known: ${log.seedKnown}`);
      const f = evidencePath(`tools/course-optimization/${SWEEP}/audio-only-${stamp()}.json`);
      fs.writeFileSync(f, JSON.stringify(log, null, 2)); console.log(`Wrote ${f}`);
      return;
    }
    const rows = await loadRows(pg);
    const D = plan(rows);
    D.problems.push(...(await vocabularyGuards(pg)));
    console.log(`\n══ ${COURSE} — seeds 513 / 151 / 607 — ${APPLY ? 'APPLY' : 'DRY RUN'} ══`);
    console.log(`(1) 513: intro S0513L03 → ${S513.intro}`);
    for (const e of S513.edits) console.log(`    ${e.id}  "${e.before.known}" | "${e.before.target}"  →  "${e.after.known}" | "${e.after.target}"`);
    for (const a of S513.adds) console.log(`    + ${a.id}  "${a.known}" | "${a.target}"`);
    console.log(`(2) 151: seed "${S151.sentence.before.known}" → "${S151.sentence.after.known}"; ${S151.lego.id} "${S151.lego.from.known}" → "${S151.lego.to.known}" | non era, is_new false (duplicate of ${S151.earlier.id}); intro detached`);
    for (const e of S151.edits) console.log(`    ${e.id}  "${e.before.known}"  →  "${e.after.known}"`);
    for (const d of S151.deletes) console.log(`    − ${d.id}  "${d.known}" | "${d.target}"  (${d.why.split(';')[0]})`);
    for (const m of S151.moves) console.log(`    ${m.from} → ${m.to}  "${m.after.known}" | "${m.after.target}"  (${m.why})`);
    for (const s of S151.stay) console.log(`    STAYS (dark, for Kai) ${s.id}  "${s.known}" | "${s.target}"`);
    console.log(`(3) 607: ${S607.lego.id} "${S607.lego.known}" | "${S607.lego.target}" → is_new TRUE; intro → ${S607.intro}`);
    for (const a of S607.adds) console.log(`    + ${a.id} ${a.role}  "${a.known}" | "${a.target}"`);
    const clashes = await zutAgainstCourse(pg, D);
    console.log(`ZUT against the course: ${clashes.length ? '\n  ' + clashes.map((z) => `${z.k2 ? 'K2 HOLD' : 'two Englishes, one Italian (not a defect)'}: ${z.change} ${z.pair} vs ${z.vs}`).join('\n  ') : 'no clash'}`);
    for (const z of clashes.filter((z) => z.k2)) D.problems.push(`ZUT K2: ${z.change} ${z.pair} vs ${z.vs}`);
    log.plan = D; log.zutInTool = clashes;
    if (D.problems.length) console.log('\nPROBLEMS:\n  ' + D.problems.join('\n  ')); else console.log('\nguards hold: live text matches, 151 L01 is a both-sides duplicate of 86 L01, 607 L02 has no earlier pair and its seed has no it/l\', every written phrase contains its LEGO, no untaught word, no K2 clash, 159 untouched');
    if (APPLY && !D.problems.length) {
      const sb = supabase();
      await applyContent(pg, sb, D, log);
      console.log(`APPLIED. events=${JSON.stringify(log.events)} unapproved=${JSON.stringify(log.unapproved)} audioPass=${JSON.stringify(log.audioPass)}`);
      await fillItalian(pg, sb, log);
      console.log('ITALIAN AUDIO:'); for (const a of log.italian) console.log(`  ${short(a.id)} ${a.role} "${a.text}": ${a.result}${a.linked === true ? ' → linked' : a.linked ? ` (${a.linked})` : ''}`);
      await writeIntros(pg, sb, log);
      console.log(`INTROS (cast ${log.castRestored ? 'RESTORED byte-for-byte' : 'NOT RESTORED — fix by hand'}):`); for (const e of log.intros) console.log(`  ${e.legoId}${e.human ? ' [human-authored]' : ''}: ${e.result}${e.mirrors ? ' → linked, mirrors' : ' → SILENT'}`);
      const ids = englishIdsToFill(); log.soniaIds = ids;
      console.log(`\nENGLISH prompts to fill on temporary Sonia (${ids.length}):\n  SCOPE=ids IDS=${ids.join(',')} APPLY=1 node tools/course-optimization/ita-sonia-temporary-fill-2026-09-28.cjs\nthen: AUDIO_ONLY=1 node ${SURFACE}   # links seed 151's known clip by text`);
    }
    const f = evidencePath(`tools/course-optimization/${SWEEP}/${APPLY ? 'applied' : 'dryrun'}-${stamp()}.json`);
    fs.writeFileSync(f, JSON.stringify(log, null, 2)); console.log(`Wrote ${f}`);
    if (D.problems.length) process.exitCode = 2;
  } finally { await pg.end(); }
}

module.exports = { renderSoniaPresentation, plan, applyPlanToRows, endStateProblems, S513, S151, S607, containsWords, sameWords, phraseContainsLego, isDuplicate, legoPosition, englishIdsToFill };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
