#!/usr/bin/env node
'use strict';
// tools/course-optimization/deu-deborah-oct-batch2-2026-10-14.cjs
//
// deu_for_eng — Deborah's second October batch (R787–R1187), the CLEAR fixes only, for Kai (job #130, 2026-10-14).
// Her R numbers are course_round_index rounds and match exactly; the one she marked "S0552(?)" (R1085) is S0522L03.
// Everything that needs a ruling (irgendwo, uns sicher, re-cuts, re-introductions, the "ich denke, dass" section) is
// NOT here — it is in the report for Kai. Precedent and shape: deu-deborah-oct-findings-2026-10-06.cjs (job #327).
//
// WHAT TURNED OUT NOT TO BE A DEFECT (measured, so nothing here touches it): "nach Hause" (R787, R889/R890) is taught
// at R226, "bleiben" (R793/R794) at R546, "Problem" (R825) at R324, "sechs" (R903) at R63, "egal" (R1142 Cons) at R142.
// Those rounds use known words; the later round is a second introduction, which is a question for Kai, not a fix.
// The intros she heard as gobbledygook / "food is food" / "question is question" / "the bloke" (R790, R806, R838,
// R839, R957) were replaced on 12 Oct by job #794·O (Tom-006, faded); Whisper hears the current clips clean.
//
// A  LEGO glosses with tag leaks or wrong English, Deborah naming the fix: R922 nearness → "nearby | in der Nähe"
//    (grows both sides; every row already says "in der Nähe"), R923 "hotel gen" → "of the hotel | des Hotels" (the
//    course's own shape: R761 "of the entrance | des Eingangs", R912 "of the problem | des Problems"), R930 "war gen" →
//    "war", intro "as in — 'during the war'" (Deborah's wording), R926 "a some" → "a few", R1101 that → this funny
//    story, R1105 those → these things (the builds say this/these), R1115 "so that order to" → "so that", R1143
//    "I don't care matter" → "don't care" (the seed's sense; B01 "equal" was a wrong gloss), R1163 "in a" → "in the",
//    R1170 "genitive of village" → "of the village | des Dorfes".
// B  LEGOs grow on the target side (the English already says it): R865 "there is | es gibt", R1142 "as if | als ob",
//    R1183 "they play | sie spielen", R1186 "I wished | ich wünschte" (Kai: a German verb never without its pronoun).
//    Their intros quote the unchanged known side, so the same clip is kept (re-linked in the same transaction).
// C  Capitalisation: R790/R890 Essen, R839 Frage, R957 Gründe (nouns); R940 "nächstes Mal" (mid-sentence, and the
//    course writes phrases lower-case initial). Case-only: the clips stay (the trigger keeps a clip whose words match).
// D  Words used before the LEGO that teaches them, the one genuine case: "eine Frage stellen" (ask a question) at R839,
//    R840, R841 before S0423L03 (R842) teaches it → the 5 rows MOVE there (same text, same clips).
// E  Builds whose English or German is broken, Deborah naming the round: R914 "the number of different" has no noun →
//    "the number of different words | die Anzahl der verschiedenen Wörter" ("different words | verschiedene Wörter" is
//    taught at R174); R919 "before the blue" → "before the blue one" (dem blauen is "the blue one"); R922 rows ending
//    "a shop near" → "nearby"; R958 "reasons about waiting" fragments (B03 re-texted, U05 deleted); R812 U05 "I think all
//    thought we could go" (English ≠ German) deleted; duplicate/non-mirroring bare builds deleted where the LEGO grew.
// F  Intro "as in" lines: R812 (hurried, made no sense) → "I thought we could go"; R958 → "I think the waiting is
//    important"; R1035 "she is making worries" → no as-in (no row says "worries"); R1113 eure Hände → "everyone, put
//    your hands up" (Kai 2026-10-14: English signals plural you with "everyone"); R963 sick / R1026 so that / R1164 mud,
//    heard with German sounds → a fresh take with an as-in from the basket. Every intro is Tom-006 (cast whole-intro
//    voice for deu_for_eng), rendered unbound, faded 80 ms into a NEW row (Tom 2026-10-12, job #794), then pointed.
// G  Audio only: R1000 (S0496L01) and R1093 (S0524L05) have the female German voice in BOTH slots → target2 re-rendered
//    in the male cast voice and swapped; R1140 "unrecht" (chopped, 0.33 s of speech) → both slots fresh in the cast
//    voices; and the 17 rows Deborah edited on 13–14 Oct whose regenerate failed ("Phase 8 audio server not reachable"
//    — Phase 8 is stopped under r-2026-10-13), S0535L05U04 and S0536L01B01 among them.
//
// AUDIO FIRST, then text (make-before-break): AUDIO=1 renders every clip the AFTER texts need through the one route
// (POST :3470/api/audio/render, voice-bound, dry run first) and writes them to a ledger; APPLY=1 then writes text and
// links in ONE transaction (the text-change trigger respects a link the writer sets in the same UPDATE), so no slot is
// ever silent. Old clips are never deleted.
//
//   node tools/course-optimization/deu-deborah-oct-batch2-2026-10-14.cjs              # VERIFY: exit 2 while a defect stands
//   DRY=1 AUDIO=1 node …                                                               # dry-run every render, print the chars
//   AUDIO=1 node …                                                                     # render (resumable; the ledger is read first)
//   APPLY=1 node …                                                                     # write text + links + swaps, then verify
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
process.env.INTRO_MIRROR_AT_EXIT = '0'; // components carry 149 pre-existing mismatches; the touched LEGOs are checked below

const COURSE = 'deu_for_eng';
const SWEEP = 'deu-deborah-oct-batch2-2026-10-14';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const JOB = '#130';
const AGENT = 'kai-deu-deborah-batch2-130';
const RENDER_URL = process.env.RENDER_URL || 'http://localhost:3470/api/audio/render';
const T6 = 'cartesia_d293d509-eb96-4df4-8cfd-80a693aa49a9'; // Tom-006: the cast whole-intro voice for deu_for_eng (voicing-policy.config.json)
const DEU_F = 'cartesia_b9de4a89-2257-424b-94c2-db18ba68c81a'; // voice_language_roles deu f rank 0
const DEU_M = 'cartesia_afa425cf-5489-4a09-8a3f-d3cb1f82150d'; // voice_language_roles deu m rank 0

/** The intro line as the #794 Tom-006 intros are written (the 10 ms marker is added by the fade). */
const intro = (x, ctx) => ctx ? `The German for: '${x}', as in — '${ctx}', is: <break time="300ms"/>` : `The German for: '${x}', is: <break time="300ms"/>`;

// LEGO edits. intro: the new line (rendered + faded + pointed in the same UPDATE); keepIntro: the known side did not
// change, so the intro clip linked today is kept (the trigger empties it on a target change; it is set back in the
// same transaction).
const LEGO_EDITS = [
  { lego: 'S0402L02', cls: 'C', r: 790, before: ['food', 'essen'], after: ['food', 'Essen'], why: 'noun: zum Essen' },
  { lego: 'S0447L02', cls: 'C', r: 890, before: ['meal', 'essen'], after: ['meal', 'Essen'], why: 'noun: nach dem Essen (same defect as R790)' },
  { lego: 'S0422L01', cls: 'C', r: 839, before: ['question', 'frage'], after: ['question', 'Frage'], why: 'noun' },
  { lego: 'S0475L02', cls: 'C', r: 957, before: ['reasons', 'gründe'], after: ['reasons', 'Gründe'], why: 'noun' },
  { lego: 'S0465L02', cls: 'C', r: 940, before: ['next time I will', 'Nächstes Mal werde ich'], after: ['next time I will', 'nächstes Mal werde ich'], why: 'Deborah R940: capital Nächstes, nächstes elsewhere' },
  { lego: 'S0436L01', cls: 'B', r: 865, before: ['there is', 'gibt'], after: ['there is', 'es gibt'], keepIntro: true, why: 'Deborah R865: "there is" is es gibt' },
  { lego: 'S0538L03', cls: 'B', r: 1142, before: ['as if', 'als'], after: ['as if', 'als ob'], keepIntro: true, why: 'Deborah R1142: als alone is "as"; every row says als ob' },
  { lego: 'S0556L03', cls: 'B', r: 1183, before: ['they play', 'spielen'], after: ['they play', 'sie spielen'], keepIntro: true, why: 'Deborah R1183 + Kai 2026-10-14: no German verb without its pronoun' },
  { lego: 'S0557L03', cls: 'B', r: 1186, before: ['I wished', 'wünschte'], after: ['I wished', 'ich wünschte'], keepIntro: true, why: 'Deborah R1186 + Kai 2026-10-14: no German verb without its pronoun' },
  { lego: 'S0460L02', cls: 'A', r: 922, before: ['nearness', 'Nähe'], after: ['nearby', 'in der Nähe'], intro: intro('nearby'), why: 'Deborah R922: nearness → nearby; every row says in der Nähe' },
  { lego: 'S0460L03', cls: 'A', r: 923, before: ['hotel gen', 'Hotels'], after: ['of the hotel', 'des Hotels'], intro: intro('of the hotel'), why: 'Deborah R923: "hotel gen" is a tag leak; the course shape is "of the entrance | des Eingangs"' },
  { lego: 'S0461L02', cls: 'A', r: 926, before: ['a some', 'ein paar'], after: ['a few', 'ein paar'], intro: intro('a few'), why: 'Deborah R926: the builds say "a few"' },
  { lego: 'S0462L03', cls: 'A', r: 930, before: ['war gen', 'Krieges'], after: ['war', 'Krieges'], intro: intro('war', 'during the war'), why: 'Deborah R930: "war" with a genitive example in the as-in' },
  { lego: 'S0527L04', cls: 'A', r: 1101, before: ['that funny story', 'diese lustige Geschichte'], after: ['this funny story', 'diese lustige Geschichte'], intro: intro('this funny story'), why: 'Deborah R1101: the builds say "this funny story"' },
  { lego: 'S0528L02', cls: 'A', r: 1105, before: ['those things', 'diese Sachen'], after: ['these things', 'diese Sachen'], intro: intro('these things'), why: 'Deborah R1105: the builds say "these things"' },
  { lego: 'S0530L01', cls: 'A', r: 1115, before: ['so that order to', 'damit'], after: ['so that', 'damit'], intro: intro('so that'), why: 'Deborah R1115: "so that order to" is a tag leak' },
  { lego: 'S0538L04', cls: 'A', r: 1143, before: ["I don't care matter", 'egal'], after: ["don't care", 'egal'], intro: intro("don't care"), why: "Deborah R1143: nonsense gloss; the seed says \"I don't care\"" },
  { lego: 'S0547L02', cls: 'A', r: 1163, before: ['in a', 'im'], after: ['in the', 'im'], intro: intro('in the'), why: 'Deborah R1163: im is "in the"' },
  { lego: 'S0550L01', cls: 'A', r: 1170, before: ['genitive of village', 'Dorfes'], after: ['of the village', 'des Dorfes'], intro: intro('of the village'), why: 'Deborah R1170: make the LEGO "des Dorfes"' },
];
// Intro-only re-renders (the LEGO's text does not change).
const INTROS = [
  { lego: 'S0412L01', cls: 'F', r: 812, text: intro('we could', 'I thought we could go'), why: 'Deborah R812: the as-in "I think all thought we could go" made no sense (its row is deleted)' },
  { lego: 'S0475L03', cls: 'F', r: 958, text: intro('waiting', 'I think the waiting is important'), why: 'Deborah R958: "there are many reasons about the waiting" is a fragment' },
  { lego: 'S0508L02', cls: 'F', r: 1035, text: intro('worries'), why: 'Deborah R1035: "she is making worries" is unnatural; no row now says "worries", so no as-in' },
  { lego: 'S0529L04', cls: 'F', r: 1113, text: intro('your hands', 'everyone, put your hands up'), why: 'Deborah R1113 + Kai 2026-10-14: plural you is signalled with "everyone"' },
  { lego: 'S0477L01', cls: 'F', r: 963, text: intro('sick', "I'm sick today"), why: 'Deborah R963: "sick" heard as German "zick" — a fresh take' },
  { lego: 'S0505L01', cls: 'F', r: 1026, text: intro('so that', 'I do that so that she can see'), why: 'Deborah R1026: "so" heard as German "zo" — a fresh take' },
  { lego: 'S0547L03', cls: 'F', r: 1164, text: intro('mud', 'the dog is in the mud'), why: 'Deborah R1164: "mud" sounded German — a fresh take' },
];
const PHRASE_EDITS = [
  ['C', 'S0402L02B01', ['food', 'essen'], ['food', 'Essen']],
  ['C', 'S0447L02B01', ['meal', 'essen'], ['meal', 'Essen']],
  ['C', 'S0422L01B01', ['question', 'frage'], ['question', 'Frage']],
  ['C', 'S0465L02U05', ['I think I will understand it next time', 'ich denke, dass ich es Nächstes Mal verstehen werde'], ['I think I will understand it next time', 'ich denke, dass ich es nächstes Mal verstehen werde']],
  ['C', 'S0465L02U07', ['next time I will get to know everyone', 'Nächstes Mal werde ich alle kennenlernen'], ['next time I will get to know everyone', 'nächstes Mal werde ich alle kennenlernen']],
  ['C', 'S0465L02U08', ['next time I will start at home', 'Nächstes Mal werde ich zu Hause anfangen'], ['next time I will start at home', 'nächstes Mal werde ich zu Hause anfangen']],
  ['B', 'S0436L01B01', ['there is', 'gibt'], ['there is', 'es gibt']],
  ['B', 'S0556L03B01', ['they play', 'spielen'], ['they play', 'sie spielen']],
  ['A', 'S0461L02B01', ['a some', 'ein paar'], ['a few', 'ein paar']],
  ['A', 'S0538L04B01', ['equal', 'egal'], ["don't care", 'egal']],
  ['A', 'S0547L02B01', ['in a', 'im'], ['in the', 'im']],
  ['A', 'S0460L02B01', ['near', 'Nähe'], ['nearby', 'in der Nähe']],
  ['E', 'S0460L02B03', ['a shop near', 'ein Geschäft in der Nähe'], ['a shop nearby', 'ein Geschäft in der Nähe']],
  ['E', 'S0460L02U01', ['I think there is a shop near', 'ich denke, dass es ein Geschäft in der Nähe gibt'], ['I think there is a shop nearby', 'ich denke, dass es ein Geschäft in der Nähe gibt']],
  ['E', 'S0460L02U02', ['I thought there was a shop near', 'ich dachte, dass es ein Geschäft in der Nähe gibt'], ['I thought there was a shop nearby', 'ich dachte, dass es ein Geschäft in der Nähe gibt']],
  ['E', 'S0460L02U03', ['she told me there was a shop near', 'sie hat mir gesagt, dass es ein Geschäft in der Nähe gibt'], ['she told me there was a shop nearby', 'sie hat mir gesagt, dass es ein Geschäft in der Nähe gibt']],
  ['E', 'S0460L02U04', ['I believe there is a shop near', 'ich glaube, dass es ein Geschäft in der Nähe gibt'], ['I believe there is a shop nearby', 'ich glaube, dass es ein Geschäft in der Nähe gibt']],
  ['E', 'S0460L02U05', ['I think all wanted a shop near', 'ich denke, dass alle ein Geschäft in der Nähe wollten'], ['I think all wanted a shop nearby', 'ich denke, dass alle ein Geschäft in der Nähe wollten']],
  ['E', 'S0460L02U06', ['I knew there was a shop near', 'ich wusste, dass es ein Geschäft in der Nähe gibt'], ['I knew there was a shop nearby', 'ich wusste, dass es ein Geschäft in der Nähe gibt']],
  ['E', 'S0457L04B02', ['the number of different', 'die Anzahl der verschiedenen'], ['the number of different words', 'die Anzahl der verschiedenen Wörter']],
  ['E', 'S0457L04U01', ['I think the number of different is important', 'ich denke, dass die Anzahl der verschiedenen wichtig ist'], ['I think the number of different words is important', 'ich denke, dass die Anzahl der verschiedenen Wörter wichtig ist']],
  ['E', 'S0457L04U02', ['I thought the number of different was important', 'ich dachte, dass die Anzahl der verschiedenen wichtig ist'], ['I thought the number of different words was important', 'ich dachte, dass die Anzahl der verschiedenen Wörter wichtig ist']],
  ['E', 'S0457L04U03', ['she told me the number of different was important', 'sie hat mir gesagt, dass die Anzahl der verschiedenen wichtig ist'], ['she told me the number of different words was important', 'sie hat mir gesagt, dass die Anzahl der verschiedenen Wörter wichtig ist']],
  ['E', 'S0457L04U04', ['I believe the number of different is important', 'ich glaube, dass die Anzahl der verschiedenen wichtig ist'], ['I believe the number of different words is important', 'ich glaube, dass die Anzahl der verschiedenen Wörter wichtig ist']],
  ['E', 'S0457L04U05', ['please could we reduce the number of different', 'bitte könnten wir die Anzahl der verschiedenen reduzieren'], ['please could we reduce the number of different words', 'bitte könnten wir die Anzahl der verschiedenen Wörter reduzieren']],
  ['E', 'S0457L04U06', ['I knew the number of different was important', 'ich wusste, dass die Anzahl der verschiedenen wichtig ist'], ['I knew the number of different words was important', 'ich wusste, dass die Anzahl der verschiedenen Wörter wichtig ist']],
  ['E', 'S0459L02B02', ['the blue', 'dem blauen'], ['the blue one', 'dem blauen']],
  ['E', 'S0459L02B03', ['not before the blue', 'nicht vor dem blauen'], ['not before the blue one', 'nicht vor dem blauen']],
  ['E', 'S0459L02U01', ['I think it was before the blue', 'ich denke, dass es vor dem blauen war'], ['I think it was before the blue one', 'ich denke, dass es vor dem blauen war']],
  ['E', 'S0459L02U02', ['I thought it was not before the blue', 'ich dachte, dass es nicht vor dem blauen war'], ['I thought it was not before the blue one', 'ich dachte, dass es nicht vor dem blauen war']],
  ['E', 'S0459L02U03', ['she told me it was not before the blue', 'sie hat mir gesagt, dass es nicht vor dem blauen war'], ['she told me it was not before the blue one', 'sie hat mir gesagt, dass es nicht vor dem blauen war']],
  ['E', 'S0459L02U04', ['I believe it was before the blue', 'ich glaube, dass es vor dem blauen war'], ['I believe it was before the blue one', 'ich glaube, dass es vor dem blauen war']],
  ['E', 'S0459L02U05', ['please could it be before the blue', 'bitte könnte es vor dem blauen sein'], ['please could it be before the blue one', 'bitte könnte es vor dem blauen sein']],
  ['E', 'S0459L02U06', ['I knew it was not before the blue', 'ich wusste, dass es nicht vor dem blauen war'], ['I knew it was not before the blue one', 'ich wusste, dass es nicht vor dem blauen war']],
  ['E', 'S0475L03B03', ['reasons about waiting', 'gründe, über das Warten'], ['about the waiting', 'über das Warten']],
].map(([cls, id, before, after]) => ({ cls, id, before, after }));
const DELETES = [
  { id: 'S0412L01U05', known: 'I think all thought we could go', target: 'ich denke, dass wir alle gehen konnten', why: 'Deborah R812: English ≠ German ("all thought" is not in the German); the intro no longer quotes it' },
  { id: 'S0460L02B02', known: 'in the near', target: 'in der Nähe', why: 'broken English; with the LEGO grown to "nearby | in der Nähe" it duplicates B01' },
  { id: 'S0460L03B01', known: 'hotel', target: 'Hotels', why: 'reads as plural "hotels"; B02 "of the hotel | des Hotels" is now the bare-LEGO build' },
  { id: 'S0475L03U05', known: 'there are many reasons about the waiting', target: 'es gibt viele Gründe, über das Warten', why: 'Deborah R958: a fragment in both languages' },
  { id: 'S0538L03B01', known: 'as', target: 'als', why: 'Deborah R1142: als alone is "as"; B02 "as if | als ob" is now the bare-LEGO build' },
];
const MOVES = [
  { from: 'S0422L01U06', to: 'S0423L03', why: 'Deborah R839 Build 6: "eine Frage stellen" (ask a question) is taught at R842' },
  { from: 'S0423L01U05', to: 'S0423L03', why: 'Deborah R840: "Frage stellen" is taught at R842' },
  { from: 'S0423L01U06', to: 'S0423L03', why: 'Deborah R840: "Frage stellen" is taught at R842' },
  { from: 'S0423L02U05', to: 'S0423L03', why: 'Deborah R841: "Frage stellen" is taught at R842' },
  { from: 'S0423L02U06', to: 'S0423L03', why: 'Deborah R841: "Frage stellen" is taught at R842' },
];
// G — audio-only.
const MALE_T2_LEGOS = ['S0496L01', 'S0524L05']; // R1000, R1093: every slot whose target2 is the female voice gets the male one
const FRESH_BOTH = [{ lego: 'S0537L02', rows: ['S0537L02B01'], text: 'unrecht', why: 'Deborah R1140: chopped (0.33 s of speech in the xAI take)' }];
const DEBORAH_SILENT = ['S0535L05U04', 'S0536L01B01', 'S0536L04U07', 'S0539L01B03', 'S0541L04U01', 'S0545L01U02', 'S0545L05B02', 'S0547L03U05', 'S0548L04U04', 'S0551L02U07', 'S0552L01U04', 'S0555L02U04', 'S0555L02U05', 'S0555L03U04', 'S0557L01B03', 'S0557L03U03', 'S0557L03U05'];

// ── pure helpers (the test exercises these) ──────────────────────────────────────────
const words = (s) => String(s || '').toLowerCase().split(/[^\p{L}\p{M}ß']+/u).filter(Boolean);
/** word-multiset containment — the live gate's "phrase contains its LEGO" rule */
function containsWords(hay, needle) {
  const bag = new Map();
  for (const w of words(hay)) bag.set(w, (bag.get(w) || 0) + 1);
  for (const w of words(needle)) { const n = bag.get(w) || 0; if (!n) return false; bag.set(w, n - 1); }
  return words(needle).length > 0;
}
const legoOf = (id) => id.slice(0, 8);
const seedOf = (id) => Number(id.slice(1, 5));
/** next phrase id in a basket that no live row holds and no edit event ever named (a deleted id is never re-issued) */
function nextFreeId(lego, role, liveIds, everUsed) {
  const L = role === 'build' ? 'B' : 'U';
  for (let n = 1; n < 100; n++) { const id = `${lego}${L}${String(n).padStart(2, '0')}`; if (!liveIds.has(id) && !everUsed.has(id)) return id; }
  throw new Error(`no free id in ${lego}`);
}
/** the stored text a faded intro carries (tom006-fade-lib MARKER) */
const fadedText = (t) => `${t} <break time="10ms"/>`;
/** every seed this job edits (text, rows, intros) — all are unapproved */
function touchedSeeds() {
  return [...new Set([...LEGO_EDITS.map((l) => seedOf(l.lego)), ...INTROS.map((i) => seedOf(i.lego)), ...PHRASE_EDITS.map((e) => seedOf(e.id)), ...DELETES.map((d) => seedOf(d.id)), ...MOVES.flatMap((m) => [seedOf(m.from), seedOf(m.to)])])].sort((a, b) => a - b);
}

// ── DB ──────────────────────────────────────────────────────────────────────────────
async function load(pg) {
  const { rows: legos } = await pg.query(`SELECT l.id AS uuid, l.lego_id, l.seed_number, l.lego_index, l.is_new, l.known_text, l.target_text, l.presentation_audio_id, l.known_audio_id::text, l.target1_audio_id::text, l.target2_audio_id::text, r.round_index FROM course_legos l LEFT JOIN course_round_index r ON r.course_code=l.course_code AND r.lego_id=l.lego_id WHERE l.course_code=$1`, [COURSE]);
  const { rows: phrases } = await pg.query(`SELECT *, known_audio_id::text AS k, target1_audio_id::text AS t1, target2_audio_id::text AS t2 FROM course_practice_phrases WHERE course_code=$1`, [COURSE]);
  const { rows: seeds } = await pg.query('SELECT seed_number, known_text, target_text FROM course_seeds WHERE course_code=$1', [COURSE]);
  for (const p of phrases) p.sid = p.id.slice(COURSE.length + 1);
  return { legos, phrases, seeds, byId: new Map(phrases.map((p) => [p.sid, p])), legoById: new Map(legos.map((l) => [l.lego_id, l])) };
}
async function voices(pg, ids) {
  const { rows } = await pg.query('SELECT id::text, voice_id, text, duration_ms, s3_key FROM course_audio WHERE id::text = ANY($1)', [ids.filter(Boolean)]);
  return new Map(rows.map((r) => [r.id, r]));
}

/** ZUT strict count over the course as it stands (or with the AFTER texts overlaid) — audit-phrase-zut.cjs auditRows. */
function zutStrict(db, overlay) {
  const { auditRows } = require('./audit-phrase-zut.cjs');
  const le = overlay ? new Map(LEGO_EDITS.map((l) => [l.lego, l.after])) : new Map();
  const pe = overlay ? new Map(PHRASE_EDITS.map((e) => [e.id, e.after])) : new Map();
  const gone = overlay ? new Set(DELETES.map((d) => d.id)) : new Set();
  const legos = db.legos.map((l) => ({ id: l.lego_id, seed_number: l.seed_number, known_text: (le.get(l.lego_id) || [l.known_text])[0], target_text: (le.get(l.lego_id) || [, l.target_text])[1] }));
  const phrases = db.phrases.filter((p) => !gone.has(p.sid)).map((p) => ({ id: p.sid, seed_number: p.seed_number, phrase_role: p.phrase_role, known_text: (pe.get(p.sid) || [p.known_text])[0], target_text: (pe.get(p.sid) || [, p.target_text])[1] }));
  const out = auditRows({ legos, phrases, seeds: db.seeds });
  return out.bidirectional.violationsStrict;
}

/** VERIFY — every defect this job fixes, read from the live DB. Non-empty = not fixed. */
async function verify(pg, db) {
  const out = [];
  for (const l of LEGO_EDITS) { const r = db.legoById.get(l.lego); if (r.known_text !== l.after[0] || r.target_text !== l.after[1]) out.push(`${l.cls} ${l.lego} (R${l.r}) is "${r.known_text} | ${r.target_text}"`); }
  for (const e of PHRASE_EDITS) { const p = db.byId.get(e.id); if (!p || p.known_text !== e.after[0] || p.target_text !== e.after[1]) out.push(`${e.cls} ${e.id} does not hold its AFTER text`); }
  for (const d of DELETES) if (db.byId.has(d.id)) out.push(`E ${d.id} still present`);
  for (const m of MOVES) if (db.byId.has(m.from)) out.push(`D ${m.from} still sits a round before ${m.to}`);
  // every row under a LEGO whose German grew still contains it (P17). Only the grown ones: three M-LEGOs here
  // (S0465L02, S0527L04, S0528L02) already had baskets that drill a part of them — listed for Kai, not this job's to fix.
  for (const l of LEGO_EDITS.filter((x) => x.before[1].toLowerCase() !== x.after[1].toLowerCase())) for (const p of db.phrases) if (legoOf(p.sid) === l.lego && p.phrase_role !== 'component' && !containsWords(p.target_text, db.legoById.get(l.lego).target_text)) out.push(`P17 ${p.sid} "${p.target_text}" does not contain its LEGO "${db.legoById.get(l.lego).target_text}"`);
  // intros: the linked clip says the line (faded), in Tom-006
  const want = [...LEGO_EDITS.filter((l) => l.intro).map((l) => [l.lego, l.intro]), ...INTROS.map((i) => [i.lego, i.text])];
  const v = await voices(pg, want.map(([lego]) => db.legoById.get(lego).presentation_audio_id));
  for (const [lego, text] of want) { const a = v.get(db.legoById.get(lego).presentation_audio_id); if (!a || a.text !== fadedText(text) || a.voice_id !== T6) out.push(`F intro ${lego} links "${a && a.text}" (${a && a.voice_id})`); }
  for (const l of LEGO_EDITS.filter((x) => x.keepIntro)) if (!db.legoById.get(l.lego).presentation_audio_id) out.push(`B ${l.lego} intro is empty`);
  // every slot on a row or LEGO this job wrote holds a clip whose words are the row's words
  const slotRows = [...PHRASE_EDITS.map((e) => db.byId.get(e.id)), ...DEBORAH_SILENT.map((id) => db.byId.get(id))].filter(Boolean);
  const v2 = await voices(pg, slotRows.flatMap((p) => [p.k, p.t1, p.t2]).concat(LEGO_EDITS.flatMap((l) => { const r = db.legoById.get(l.lego); return [r.known_audio_id, r.target1_audio_id, r.target2_audio_id]; })));
  const norm = (s) => String(s || '').toLowerCase().replace(/[^\p{L}\p{M}ß' ]+/gu, ' ').replace(/\s+/g, ' ').trim();
  const checkSlot = (name, id, text) => { const a = v2.get(id); if (!a) out.push(`G ${name} is silent`); else if (norm(a.text) !== norm(text)) out.push(`G ${name} clip says "${a.text}", row says "${text}"`); };
  for (const p of slotRows) { checkSlot(`${p.sid} known`, p.k, p.known_text); checkSlot(`${p.sid} target1`, p.t1, p.target_text); checkSlot(`${p.sid} target2`, p.t2, p.target_text); }
  for (const l of LEGO_EDITS) { const r = db.legoById.get(l.lego); checkSlot(`${l.lego} known`, r.known_audio_id, r.known_text); checkSlot(`${l.lego} target1`, r.target1_audio_id, r.target_text); checkSlot(`${l.lego} target2`, r.target2_audio_id, r.target_text); }
  // G: male target2 on R1000/R1093, fresh unrecht
  const g = [...MALE_T2_LEGOS.flatMap((lego) => [db.legoById.get(lego), ...db.phrases.filter((p) => legoOf(p.sid) === lego && p.phrase_role !== 'component')])];
  const v3 = await voices(pg, g.flatMap((x) => [x.target2_audio_id || x.t2, x.target1_audio_id || x.t1]).concat(FRESH_BOTH.flatMap((f) => [db.legoById.get(f.lego).target1_audio_id, db.legoById.get(f.lego).target2_audio_id])));
  for (const x of g) { const a = v3.get(x.t2 || x.target2_audio_id); if (!a || a.voice_id !== DEU_M) out.push(`G ${x.sid || x.lego_id} target2 is ${a && a.voice_id}`); }
  for (const f of FRESH_BOTH) { const r = db.legoById.get(f.lego); for (const [c, vv] of [['target1_audio_id', DEU_F], ['target2_audio_id', DEU_M]]) { const a = v3.get(r[c]); if (!a || a.voice_id !== vv) out.push(`G ${f.lego} ${c} is ${a && a.voice_id}`); } }
  return out;
}

// ── audio: the plan of every clip the AFTER state needs ─────────────────────────────
/** One entry per clip to make. key is stable so the ledger can resume. */
function audioPlan(db) {
  const plan = [];
  const add = (key, role, text, voiceId, extra = {}) => { if (!plan.find((p) => p.key === key)) plan.push({ key, role, text, voiceId, ...extra }); };
  // intros (unbound render → fade → pointed by APPLY)
  for (const l of LEGO_EDITS.filter((x) => x.intro)) add(`intro:${l.lego}`, 'presentation', l.intro, T6, { lego: l.lego });
  for (const i of INTROS) add(`intro:${i.lego}`, 'presentation', i.text, T6, { lego: i.lego });
  // LEGO slots whose side changed beyond case
  const lower = (s) => String(s).toLowerCase();
  for (const l of LEGO_EDITS) {
    if (lower(l.before[0]) !== lower(l.after[0])) add(`known:${l.after[0]}`, 'known', l.after[0], null);
    if (lower(l.before[1]) !== lower(l.after[1])) { add(`t1:${l.after[1]}`, 'target1', l.after[1], DEU_F); add(`t2:${l.after[1]}`, 'target2', l.after[1], DEU_M); }
  }
  for (const e of PHRASE_EDITS) {
    if (lower(e.before[0]) !== lower(e.after[0])) add(`known:${e.after[0]}`, 'known', e.after[0], null);
    if (lower(e.before[1]) !== lower(e.after[1])) { add(`t1:${e.after[1]}`, 'target1', e.after[1], DEU_F); add(`t2:${e.after[1]}`, 'target2', e.after[1], DEU_M); }
  }
  // G: male target2 on R1000/R1093 (rows + LEGO), whose target2 is not already male
  for (const lego of MALE_T2_LEGOS) {
    const L = db.legoById.get(lego);
    add(`t2:${L.target_text}`, 'target2', L.target_text, DEU_M);
    for (const p of db.phrases) if (legoOf(p.sid) === lego && p.phrase_role !== 'component') add(`t2:${p.target_text}`, 'target2', p.target_text, DEU_M);
  }
  for (const f of FRESH_BOTH) { add(`t1fresh:${f.text}`, 'target1', f.text, DEU_F); add(`t2fresh:${f.text}`, 'target2', f.text, DEU_M); }
  for (const id of DEBORAH_SILENT) {
    const p = db.byId.get(id); if (!p) continue;
    if (!p.k) add(`known:${p.known_text}`, 'known', p.known_text, null);
    if (!p.t1) add(`t1:${p.target_text}`, 'target1', p.target_text, DEU_F);
    if (!p.t2) add(`t2:${p.target_text}`, 'target2', p.target_text, DEU_M);
  }
  return plan;
}

function ledgerPath() { return require('../lib/evidence-path.cjs').evidencePath(`tools/course-optimization/${SWEEP}/ledger.jsonl`); }
function readLedger() {
  const f = ledgerPath(); if (!fs.existsSync(f)) return new Map();
  const m = new Map(); for (const line of fs.readFileSync(f, 'utf8').split('\n').filter(Boolean)) { const e = JSON.parse(line); if (e.kind === 'clip') m.set(e.key, e); }
  return m;
}
const log = (e) => fs.appendFileSync(ledgerPath(), JSON.stringify({ at: new Date().toISOString(), ...e }) + '\n');

async function render(body) {
  const res = await fetch(RENDER_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify({ courseCode: COURSE, purpose: `kai ${JOB}: Deborah October batch 2`, job: JOB, voiceBound: true, ...body }) });
  return res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }));
}

/** dry run (DRY=1) or render every planned clip not already in the ledger; intros are faded into a new row. A refusal stops the run. */
async function audio(pg, db, { dry }) {
  const plan = audioPlan(db), done = readLedger(), out = [];
  let supabase = null;
  for (const c of plan) {
    if (done.has(c.key)) { out.push({ key: c.key, ledger: done.get(c.key).audioId }); continue; }
    const body = { role: c.role, text: c.text, dryRun: dry, ...(c.voiceId ? { voiceId: c.voiceId } : {}), ...(c.role === 'presentation' ? { language: 'eng' } : {}) };
    const r = await render(body);
    if (!r.ok) { out.push({ key: c.key, text: c.text, refused: r.code || r.error }); if (!dry) { log({ kind: 'refused', key: c.key, text: c.text, r }); console.log('REFUSED — stopping, no retry:', c.key, JSON.stringify(r)); break; } continue; }
    if (dry) { out.push({ key: c.key, role: c.role, text: c.text, source: r.source, chars: r.wouldSpendChars || 0, voiceId: r.voiceId }); continue; }
    const v = (await voices(pg, [r.audioId])).get(r.audioId);
    if (!v || v.text.replace(/\s+/g, ' ').trim().toLowerCase() !== c.text.replace(/\s+/g, ' ').trim().toLowerCase() || (c.voiceId && v.voice_id !== c.voiceId)) { log({ kind: 'verify-failed', key: c.key, r, v }); console.log('VERIFY FAILED — stopping:', c.key, JSON.stringify(v)); break; }
    let audioId = r.audioId;
    if (c.role === 'presentation') {
      supabase = supabase || require('@supabase/supabase-js').createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
      log({ kind: 'raw-intro', key: c.key, rawId: r.audioId, source: r.source, charsSpent: r.charsSpent || 0 }); // write-ahead before the fade
      audioId = (await require('../audio/tom006-fade-lib.cjs').makeFaded(supabase, r.audioId)).newId;
    }
    const e = { kind: 'clip', key: c.key, role: c.role, text: c.text, audioId, rawId: r.audioId, voiceId: v.voice_id, source: r.source, charsSpent: r.charsSpent || 0 };
    log(e); out.push(e);
  }
  return out;
}

// ── APPLY ───────────────────────────────────────────────────────────────────────────
async function everUsedIds(pg) {
  const { rows } = await pg.query('SELECT scope, detail FROM content_edit_events WHERE course_code=$1', [COURSE]);
  const s = new Set(); const re = /S\d{4}L\d{2}[BU]\d{2}/g;
  for (const r of rows) for (const m of JSON.stringify([r.scope, r.detail]).match(re) || []) s.add(m);
  return s;
}

async function apply(pg, db) {
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const { mayPoint } = require('../../services/shared/resolve-voice.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const clips = readLedger();
  const clip = (key) => { const c = clips.get(key); if (!c) throw new Error(`no rendered clip for ${key} — run AUDIO=1 first`); return c.audioId; };
  const lower = (s) => String(s).toLowerCase();

  // guards: every row still holds its BEFORE text (Deborah edits live), and nothing new clashes on ZUT
  for (const l of LEGO_EDITS) { const r = db.legoById.get(l.lego); if (r.known_text !== l.before[0] || r.target_text !== l.before[1]) throw new Error(`${l.lego} holds "${r.known_text} | ${r.target_text}", not its BEFORE text`); }
  for (const e of PHRASE_EDITS) { const p = db.byId.get(e.id); if (!p || p.known_text !== e.before[0] || p.target_text !== e.before[1]) throw new Error(`${e.id} does not hold its BEFORE text`); }
  for (const d of DELETES) { const p = db.byId.get(d.id); if (!p || p.known_text !== d.known || p.target_text !== d.target) throw new Error(`${d.id} does not hold the expected text`); }
  const zb = new Set(zutStrict(db, false).map((v) => v.known_norm)), za = zutStrict(db, true).filter((v) => !zb.has(v.known_norm));
  if (za.length) throw new Error(`ZUT: new strict clash(es): ${za.map((v) => v.known_norm).join(', ')}`);

  // plan the links the AFTER state carries
  const legoLinks = LEGO_EDITS.map((l) => {
    const r = db.legoById.get(l.lego), s = {};
    if (lower(l.before[0]) !== lower(l.after[0])) s.known_audio_id = clip(`known:${l.after[0]}`);
    if (lower(l.before[1]) !== lower(l.after[1])) { s.target1_audio_id = clip(`t1:${l.after[1]}`); s.target2_audio_id = clip(`t2:${l.after[1]}`); }
    if (l.intro) s.presentation_audio_id = clip(`intro:${l.lego}`);
    return { l, r, s, keepIntro: l.keepIntro ? r.presentation_audio_id : null };
  });
  const phraseLinks = PHRASE_EDITS.map((e) => {
    const s = {};
    if (lower(e.before[0]) !== lower(e.after[0])) s.known_audio_id = clip(`known:${e.after[0]}`);
    if (lower(e.before[1]) !== lower(e.after[1])) { s.target1_audio_id = clip(`t1:${e.after[1]}`); s.target2_audio_id = clip(`t2:${e.after[1]}`); }
    return { e, s };
  });
  const swaps = []; // { tbl, key, col, from, to, name }
  for (const i of INTROS) { const r = db.legoById.get(i.lego); swaps.push({ tbl: 'course_legos', key: r.uuid, col: 'presentation_audio_id', from: r.presentation_audio_id, to: clip(`intro:${i.lego}`), name: `${i.lego} intro` }); }
  const v = await voices(pg, [...MALE_T2_LEGOS.flatMap((lego) => [db.legoById.get(lego).target2_audio_id, ...db.phrases.filter((p) => legoOf(p.sid) === lego).map((p) => p.t2)])]);
  for (const lego of MALE_T2_LEGOS) {
    const L = db.legoById.get(lego);
    if (v.get(L.target2_audio_id)?.voice_id !== DEU_M) swaps.push({ tbl: 'course_legos', key: L.uuid, col: 'target2_audio_id', from: L.target2_audio_id, to: clip(`t2:${L.target_text}`), name: `${lego} target2` });
    for (const p of db.phrases) if (legoOf(p.sid) === lego && p.phrase_role !== 'component' && v.get(p.t2)?.voice_id !== DEU_M) swaps.push({ tbl: 'course_practice_phrases', key: p.id, col: 'target2_audio_id', from: p.t2, to: clip(`t2:${p.target_text}`), name: `${p.sid} target2` });
  }
  for (const f of FRESH_BOTH) {
    const L = db.legoById.get(f.lego);
    swaps.push({ tbl: 'course_legos', key: L.uuid, col: 'target1_audio_id', from: L.target1_audio_id, to: clip(`t1fresh:${f.text}`), name: `${f.lego} target1` }, { tbl: 'course_legos', key: L.uuid, col: 'target2_audio_id', from: L.target2_audio_id, to: clip(`t2fresh:${f.text}`), name: `${f.lego} target2` });
    for (const id of f.rows) { const p = db.byId.get(id); swaps.push({ tbl: 'course_practice_phrases', key: p.id, col: 'target1_audio_id', from: p.t1, to: clip(`t1fresh:${f.text}`), name: `${id} target1` }, { tbl: 'course_practice_phrases', key: p.id, col: 'target2_audio_id', from: p.t2, to: clip(`t2fresh:${f.text}`), name: `${id} target2` }); }
  }
  for (const id of DEBORAH_SILENT) {
    const p = db.byId.get(id); if (!p) continue;
    if (!p.k) swaps.push({ tbl: 'course_practice_phrases', key: p.id, col: 'known_audio_id', from: null, to: clip(`known:${p.known_text}`), name: `${id} known` });
    if (!p.t1) swaps.push({ tbl: 'course_practice_phrases', key: p.id, col: 'target1_audio_id', from: null, to: clip(`t1:${p.target_text}`), name: `${id} target1` });
    if (!p.t2) swaps.push({ tbl: 'course_practice_phrases', key: p.id, col: 'target2_audio_id', from: null, to: clip(`t2:${p.target_text}`), name: `${id} target2` });
  }
  // the voice policy checks every pointer before anything is written (job #53)
  const pointers = [...legoLinks.flatMap(({ r, s }) => Object.entries(s).map(([col, to]) => ({ tbl: 'course_legos', key: r.uuid, col, to, from: r[col] }))), ...phraseLinks.flatMap(({ e, s }) => Object.entries(s).map(([col, to]) => ({ tbl: 'course_practice_phrases', key: db.byId.get(e.id).id, col, to, from: db.byId.get(e.id)[col] }))), ...swaps];
  for (const p of pointers) if (!await mayPoint(supabase, { courseCode: COURSE, col: p.col, to: p.to, tbl: p.tbl, key: p.key, from: p.from })) throw new Error(`voice policy refused ${p.tbl} ${p.key} ${p.col} → ${p.to}`);

  const used = await everUsedIds(pg), live = new Set(db.phrases.map((p) => p.sid));
  for (const m of MOVES) {
    const src = db.byId.get(m.from); if (!src) throw new Error(`${m.from} missing`);
    m.toId = nextFreeId(m.to, src.phrase_role, live, used); live.add(m.toId); used.add(m.toId);
    m.position = Math.max(0, ...db.phrases.filter((p) => legoOf(p.sid) === m.to).map((p) => p.position), ...MOVES.filter((x) => x.to === m.to && x.position).map((x) => x.position)) + 1;
    m.row = src;
  }
  const seeds = touchedSeeds();
  const { rows: approved } = await pg.query('SELECT seed_number, approved_at FROM course_seeds WHERE course_code=$1 AND seed_number = ANY($2) AND approved_at IS NOT NULL', [COURSE, seeds]);
  const ev = {};
  ev.lego = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'lego-edit', scope: { seed_numbers: [...new Set(LEGO_EDITS.map((l) => seedOf(l.lego)))], lego_ids: LEGO_EDITS.map((l) => l.lego), rows: LEGO_EDITS.length }, detail: { job: JOB, edits: legoLinks.map(({ l, s, keepIntro }) => ({ ...l, links: s, keepIntro })) } });
  ev.edit = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-edit', scope: { seed_numbers: [...new Set(PHRASE_EDITS.map((e) => seedOf(e.id)))], phrase_ids: PHRASE_EDITS.map((e) => `${COURSE}:${e.id}`), rows: PHRASE_EDITS.length }, detail: { job: JOB, edits: phraseLinks.map(({ e, s }) => ({ ...e, links: s })) } });
  ev.move = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-move', scope: { seed_numbers: [...new Set(MOVES.flatMap((m) => [seedOf(m.from), seedOf(m.to)]))], phrase_ids: MOVES.flatMap((m) => [`${COURSE}:${m.from}`, `${COURSE}:${m.toId}`]), rows: MOVES.length }, detail: { job: JOB, moves: MOVES.map((m) => ({ from: m.from, to: m.toId, why: m.why, known: m.row.known_text, target: m.row.target_text })) } });
  ev.del = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-delete', scope: { seed_numbers: [...new Set(DELETES.map((d) => seedOf(d.id)))], phrase_ids: DELETES.map((d) => `${COURSE}:${d.id}`), rows: DELETES.length }, detail: { job: JOB, deleted: DELETES.map((d) => ({ ...d, audio: { known: db.byId.get(d.id).k, target1: db.byId.get(d.id).t1, target2: db.byId.get(d.id).t2 } })) } });
  ev.audio = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'audio-relink', scope: { seed_numbers: [...new Set(swaps.map((s) => seedOf(s.name)))], rows: swaps.length }, detail: { job: JOB, swaps: swaps.map(({ name, col, from, to }) => ({ name, col, from, to })), why: 'intros re-voiced (Tom-006, faded), male target2 on R1000/R1093, fresh unrecht, and the slots of Deborah\'s 13–14 Oct edits; old clips kept' } });
  ev.unapprove = approved.length ? await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'unapprove', scope: { seed_numbers: approved.map((a) => a.seed_number), rows: approved.length }, detail: { job: JOB, why: "re-texted, moved, deleted or re-introduced for Deborah's October batch 2; they arrive unchecked", approved_at_before: approved } }) : null;

  await pg.query('BEGIN');
  try {
    for (const { l, r, s, keepIntro } of legoLinks) {
      const cols = Object.keys(s), vals = cols.map((c) => s[c]);
      const set = ['known_text=$1', 'target_text=$2', 'last_edit_event_id=$3', 'updated_at=now()', ...cols.map((c, i) => `${c}=$${i + 7}${c === 'presentation_audio_id' ? '' : '::uuid'}`)].join(', ');
      const u = await pg.query(`UPDATE course_legos SET ${set} WHERE course_code=$4 AND lego_id=$5 AND known_text=$6 AND target_text=$${cols.length + 7}`, [l.after[0], l.after[1], ev.lego, COURSE, l.lego, l.before[0], ...vals, l.before[1]]);
      if (u.rowCount !== 1) throw new Error(`${l.lego}: lego update ${u.rowCount}`);
      if (keepIntro) { const k = await pg.query('UPDATE course_legos SET presentation_audio_id=$1 WHERE id=$2 AND presentation_audio_id IS DISTINCT FROM $1', [keepIntro, r.uuid]); if (k.rowCount > 1) throw new Error(`${l.lego}: intro relink ${k.rowCount}`); }
    }
    for (const { e, s } of phraseLinks) {
      const [k, t] = e.after, cols = Object.keys(s);
      const set = ['known_text=$1', 'target_text=$2', 'word_count=$3', 'lego_count=$4', 'qa_checked=NULL', 'decomposition=NULL', 'decomposition_course_version=NULL', 'display_tiling=NULL', 'display_tiling_version=NULL', 'last_edit_event_id=$5', 'updated_at=now()', ...cols.map((c, i) => `${c}=$${i + 10}::uuid`)].join(', ');
      const u = await pg.query(`UPDATE course_practice_phrases SET ${set} WHERE course_code=$6 AND id=$7 AND known_text=$8 AND target_text=$9`, [k, t, t.length, t.split(/\s+/).length, ev.edit, COURSE, `${COURSE}:${e.id}`, e.before[0], e.before[1], ...cols.map((c) => s[c])]);
      if (u.rowCount !== 1) throw new Error(`${e.id}: update ${u.rowCount}`);
    }
    for (const m of MOVES) {
      const r = m.row, to = db.legoById.get(m.to);
      const ins = await pg.query(`INSERT INTO course_practice_phrases (id, course_code, seed_number, lego_index, position, known_text, target_text, word_count, lego_count, difficulty, register, metadata, status, release_batch, target_syllable_count, phrase_role, connected_lego_ids, lego_position, known_audio_id, target1_audio_id, target2_audio_id, target1_duration_ms, target2_duration_ms, lego_id, target_text_roman, introduce, last_edit_event_id)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)`,
        [`${COURSE}:${m.toId}`, COURSE, to.seed_number, to.lego_index, m.position, r.known_text, r.target_text, r.word_count, r.lego_count, r.difficulty, r.register, JSON.stringify({ ...(r.metadata || {}), moved_from: m.from, moved_by: `${SWEEP} ${JOB}`, move_why: m.why }), r.status, r.release_batch, r.target_syllable_count, r.phrase_role, r.connected_lego_ids, null, r.known_audio_id, r.target1_audio_id, r.target2_audio_id, r.target1_duration_ms, r.target2_duration_ms, m.to, r.target_text_roman, r.introduce, ev.move]);
      if (ins.rowCount !== 1) throw new Error(`${m.toId}: insert`);
      const del = await pg.query('DELETE FROM course_practice_phrases WHERE course_code=$1 AND id=$2 AND known_text=$3 AND target_text=$4', [COURSE, `${COURSE}:${m.from}`, r.known_text, r.target_text]);
      if (del.rowCount !== 1) throw new Error(`${m.from}: delete ${del.rowCount}`);
    }
    for (const d of DELETES) {
      const del = await pg.query('DELETE FROM course_practice_phrases WHERE course_code=$1 AND id=$2 AND known_text=$3 AND target_text=$4', [COURSE, `${COURSE}:${d.id}`, d.known, d.target]);
      if (del.rowCount !== 1) throw new Error(`${d.id}: delete ${del.rowCount}`);
    }
    for (const s of swaps) {
      const where = s.from == null ? `${s.col} IS NULL` : `${s.col}=$3${s.col === 'presentation_audio_id' ? '' : '::uuid'}`;
      const keyCol = s.tbl === 'course_legos' ? 'id' : 'id';
      const u = await pg.query(`UPDATE ${s.tbl} SET ${s.col}=$1${s.col === 'presentation_audio_id' ? '' : '::uuid'}, last_edit_event_id=$${s.from == null ? 3 : 4} WHERE ${keyCol}=$2 AND ${where}`, s.from == null ? [s.to, s.key, ev.audio] : [s.to, s.key, s.from, ev.audio]);
      if (u.rowCount !== 1) throw new Error(`${s.name}: swap ${u.rowCount} (slot moved under us?)`);
    }
    if (approved.length) await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number = ANY($3) AND approved_at IS NOT NULL', [ev.unapprove, COURSE, approved.map((a) => a.seed_number)]);
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  await require('../../services/shared/round-index-refresh.cjs').refreshNow();
  await require('../../services/shared/course-version.cjs').bumpCourseVersion(supabase, COURSE, 'patch');
  return { moves: MOVES.map((m) => `${m.from} → ${m.toId}`), swaps: swaps.length, unapproved: approved.map((a) => a.seed_number), events: ev };
}

async function main() {
  const { Client } = require('pg');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  try {
    let db = await load(pg);
    if (process.env.ZUT === '1') { console.log('ZUT strict now:', zutStrict(db, false).length, ' with the AFTER texts:', zutStrict(db, true).length); }
    if (process.env.AUDIO === '1') {
      const dry = process.env.DRY === '1';
      const res = await audio(pg, db, { dry });
      console.log(JSON.stringify(res, null, 1));
      if (dry) console.log(`would spend ${res.reduce((n, x) => n + (x.chars || 0), 0)} chars over ${res.filter((x) => x.source === 'would-render').length} renders; ${res.filter((x) => x.source === 'library').length} library hits; ${res.filter((x) => x.refused).length} refused`);
      else console.log(`spent ${res.reduce((n, x) => n + (x.charsSpent || 0), 0)} chars`);
    }
    if (process.env.APPLY === '1') { console.log(JSON.stringify(await apply(pg, db), null, 1)); db = await load(pg); }
    const problems = await verify(pg, db);
    console.log(problems.length ? `VERIFY: ${problems.length} defect(s) stand:\n  ${problems.join('\n  ')}` : 'VERIFY: every clear fix in this batch holds in the live DB');
    process.exitCode = problems.length ? 2 : 0;
  } finally { await pg.end(); }
}
module.exports = { LEGO_EDITS, INTROS, PHRASE_EDITS, DELETES, MOVES, MALE_T2_LEGOS, FRESH_BOTH, DEBORAH_SILENT, intro, fadedText, containsWords, nextFreeId, touchedSeeds, audioPlan };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
