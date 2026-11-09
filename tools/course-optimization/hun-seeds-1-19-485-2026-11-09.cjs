#!/usr/bin/env node
'use strict';
// tools/course-optimization/hun-seeds-1-19-485-2026-11-09.cjs — job #485, Kai's Hungarian rulings of 9 Nov 2026 applied
// to hun_for_eng seeds 1-19, one FAMILY (stage) at a time, each stage followed by a fresh read + knock-on sweep.
//
// Source plan: #454 doc d/c82c6bcd (sections 3, 3a, 4, 4a) and #432 doc d/44d13c42. Kai's rulings (9 Nov):
//   K56 (canon) — a case-marked noun is taught WITH the verb that selects its form, as one chunk inside the LEGO; phrases
//     keep exactly the LEGO forms until ~seed 100; a definite form (akarja, akarom, szeretném, megpróbálom) only inside a
//     chunk/sentence that holds its object or clause.
//   H1 yes (a noun chunk may reappear with another taught form of its own verb), H2 yes (valamit/semmit/mindent/veled/
//   valaki mással free if their form is unchanged), H3 (seed 8 mit -> mire gondolok, on online evidence: Wiktionary
//   gondol sense 5 "to mean (with -ra/-re)"; Tatoeba 10895569 "elmagyarázzam, mire gondolok" = "explain what I meant"),
//   H4 (S0019L03 merges into "to stop talking"; no valid bare-abbahagyni phrases exist, so one chunk), H5 yes (seed-7
//   "I'm going to try" rows -> "I want to try").
//
// WHY THE LEGO SLOTS ARE RE-TEXTED: K47 (build-up order) needs some LEGOs re-ordered, and the player orders by lego_index
// (ssi-learning-app generateLearningScript.ts). Popty's edit door has no re-order op and lego.insert/delete need tom_go on
// a released course, so content moves between slots: lego.update re-texts a slot (copying the clips of the slot whose
// words it takes), and phrases move by phrase.insert + phrase.delete (a phrase belongs to (seed, lego_index)). A merge
// leaves one slot over; it becomes a NOT-NEW LEGO (never played, P25) and is listed for a lego.delete with tom_go.
//
// Every written phrase gets a fresh decomposition from services/phrase-decomposer.cjs (the player renders it verbatim);
// a phrase that would not contain its LEGO (decomposeAnchored kind 'error', or the known-side word multiset) STOPS the run.
//
//   node tools/course-optimization/hun-seeds-1-19-485-2026-11-09.cjs <stage A|B|C|D|E> <fresh seeds.json> <authoring snapshot seeds.json>
//   APPLY_CONFIRM=1 node … (applies after a clean dry run)
const fs = require('fs');
const COURSE = 'hun_for_eng';
const AGENT = 'hun-seeds-1-19-apply (job #485)';
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');

const c = (pairs) => pairs.map(([known, target]) => ({ known, target }));

// ---------------------------------------------------------------------------------------------------------------------
// THE PLAN. edit: [id, newKnown|null, newTarget|null]; del: [id, why]; move: [id, toLego, newKnown|null, newTarget|null];
// add: [toLego, 'build'|'use', known, target]; legos: [{ id, to: {...}, copyClipsFrom?, comps? }]; seeds: [[n, newTarget]].
// ---------------------------------------------------------------------------------------------------------------------
const STAGES = {
  // A — DEFINITE vs INDEFINITE: the definite form only inside a chunk holding its object/clause (K56, K40); build-up
  // re-cuts of seeds 8, 12, 17, 19; seed 8 "what I mean" = hogy mire gondolok (H3); "she wants" (akarja) rows -> he/akar;
  // megpróbálom + object-less verb rows go; szeretnék/próbálok + hogyan-clause rows go (a clause object needs the
  // definite szeretném, untaught there: Wikipedia "Hungarian verbs" definite objects; Tatoeba 4451864 "Szeretném tudni,
  // hogy mi történt").
  A: {
    seeds: [[8, 'Megpróbálom elmagyarázni, hogy mire gondolok.']],
    legos: [
      { id: 'S0008L01', to: { known_text: 'to explain', target_text: 'elmagyarázni', type: 'A', components: [] }, copyClipsFrom: 'S0008L02', presentationFrom: 'S0008L02' },
      { id: 'S0008L02', to: { known_text: 'what I mean', target_text: 'hogy mire gondolok', type: 'M', components: c([['that', 'hogy'], ['what', 'mire'], ['I think', 'gondolok']]) }, copyClipsFrom: 'S0008L03', presentationFrom: 'S0008L03' },
      { id: 'S0008L03', to: { known_text: "i'm going to try to explain what I mean", target_text: 'megpróbálom elmagyarázni, hogy mire gondolok', type: 'M',
        components: c([["i'm going to try", 'megpróbálom'], ['to explain', 'elmagyarázni'], ['what I mean', 'hogy mire gondolok']]) } },
      { id: 'S0012L02', to: { known_text: 'to guess', target_text: 'kitalálni', type: 'A', components: [] }, copyClipsFrom: 'S0012L03', presentationFrom: 'S0012L03' },
      { id: 'S0012L03', to: { known_text: "what's going to happen", target_text: 'hogy mi fog történni', type: 'M', components: c([['that', 'hogy'], ['what', 'mi'], ['will', 'fog'], ['to happen', 'történni']]) }, copyClipsFrom: 'S0012L04', presentationFrom: 'S0012L04' },
      { id: 'S0012L04', to: { known_text: "I wouldn't like to guess what's going to happen", target_text: 'nem szeretném kitalálni, hogy mi fog történni', type: 'M',
        components: c([["I wouldn't like", 'nem szeretném'], ['to guess', 'kitalálni'], ["what's going to happen", 'hogy mi fog történni']]) } },
      { id: 'S0017L01', to: { is_new: false }, note: 'merge leftover: "the | a" is folded into the answer chunks; not new, basket emptied; needs lego.delete (tom_go)' },
      { id: 'S0017L02', to: { known_text: "what's the answer", target_text: 'mi a válasz', type: 'M', components: c([['what', 'mi'], ['the', 'a'], ['answer', 'válasz']]) } },
      { id: 'S0017L03', to: { known_text: 'what the answer is', target_text: 'hogy mi a válasz', type: 'M', components: c([['that', 'hogy'], ['what', 'mi'], ['the', 'a'], ['answer', 'válasz']]) } },
      { id: 'S0017L04', to: { known_text: 'she wants to find out what the answer is', target_text: 'meg akarja tudni, hogy mi a válasz', type: 'M',
        components: c([['she wants to find out', 'meg akarja tudni'], ['what the answer is', 'hogy mi a válasz']]) } },
      { id: 'S0019L02', to: { known_text: 'not', target_text: 'nem', type: 'A', components: [], is_new: false }, note: 'merge leftover: now a not-new repeat of S0010L01 "not | nem"; the definite akarom lives in S0019L04' },
      { id: 'S0019L03', to: { known_text: 'to stop talking', target_text: 'abbahagyni a beszélgetést', type: 'M', components: c([['to stop', 'abbahagyni'], ['the', 'a'], ['conversation', 'beszélgetés']]) } },
      { id: 'S0019L04', to: { known_text: "I don't want to stop talking", target_text: 'nem akarom abbahagyni a beszélgetést', type: 'M',
        components: c([['not', 'nem'], ['I want it', 'akarom'], ['to stop talking', 'abbahagyni a beszélgetést']]) } },
    ],
    del: [
      ...['S0008L01B03', 'S0008L01B01', 'S0008L01B02', 'S0008L01U03', 'S0008L01U02', 'S0008L01U01', 'S0008L01U04', 'S0008L01U05'].map((id) => [id, 'megpróbálom + a verb with no object (definite form without its selector)']),
      ['S0008L02B01', 'bare megpróbálom elmagyarázni: the definite form now lives only in the whole-seed chunk'],
      ['S0008L02U01', 'szeretnék + hogyan-clause object (needs untaught szeretném); also mondjak for "speak"'],
      ['S0008L02U03', 'szeretnék + hogyan-clause object (needs untaught szeretném)'],
      ['S0008L02U05', 'szeretnék + hogyan-clause object; mondjak for "speak"; broken "as often as"'],
      ['S0008L02U02', 'megpróbálom + valamit: valamit is indefinite'],
      ['S0008L03B04', 'szeretnék + hogy-clause object (needs untaught szeretném)'],
      ['S0008L03U02', 'szeretnék + hogy-clause object (needs untaught szeretném)'],
      ['S0008L03U05', 'broken half-sentence (szeretnék tanulni elmagyarázni)'],
      ['S0009L01U04', 'megpróbálom + object-less verb'],
      ['S0011L01U05', 'megpróbálom tudni beszélni: definite form with no object'],
      ['S0013L01U03', 'ma nagyon megpróbálom: no verb, definite form with no object'],
      ['S0003L04U01', 'szeretnék tanulni + hogyan-clause object (needs untaught szeretném)'],
      ['S0003L04U05', 'próbálok tanulni + hogyan-clause object (needs untaught próbálom)'],
      ['S0004L02U01', 'szeretnék tanulni + hogyan-clause object'],
      ['S0004L02U02', 'próbálok tanulni + hogyan-clause object'],
      ['S0004L02U03', 'szeretnék tanulni + hogyan-clause object'],
      ['S0012L02B01', 'bare nem szeretném (definite, no object)'], ['S0012L02B04', 'nem szeretném beszélni: definite, no object'],
      ['S0012L02B03', 'nem szeretném próbálkozni: próbálkozik has no definite forms'], ['S0012L02U02', 'nem szeretném gyakorolni: definite, no object'],
      ['S0012L03B01', 'nem szeretném kitalálni without its clause: now inside the S0012L04 chunk'], ['S0012L03B03', 'megpróbálom kitalálni: no object'],
      ['S0012L03U05', 'nem szeretném kitalálni without its clause'], ['S0012L03U04', 'megpróbálom + English "what to say" mismatch'],
      ['S0012L03U01', 'English "I don\'t want" untaught; the chunk is now "I wouldn\'t like to guess what\'s going to happen"'],
      ['S0012L04B02', 'plain question with no hogy: clashes with the embedded "what\'s going to happen | hogy mi fog történni"'],
      ['S0012L04U02', 'now the S0012L04 LEGO itself (twin of its build row)'],
      ['S0017L01B03', 'a szóra for "the word": -ra belongs to emlékezni, and "the | a" is no longer taught'],
      ...['S0017L02B03', 'S0017L02B01', 'S0017L02U02', 'S0017L02U04', 'S0017L02U03'].map((id) => [id, 'akarja with no definite object (she wants | akarja is re-cut)']),
      ['S0017L03B02', 'the noun válasz alone (K56: only inside its chunk)'], ['S0017L03B03', 'tudni a válasz: missing -t; választ untaught'],
      ['S0017L03U05', 'akarja tudni a válasz'], ['S0017L03U01', 'akarja tudni a válasz'], ['S0017L03U03', 'twin English of S0017L01U06 without hogy'],
      ['S0017L04B03', 'meg fogok tudni: meg is no longer a LEGO; native Q13'], ['S0017L04B02', 'meg szeretnék tudni: untaught'],
      ['S0017L04B01', 'meg akarja tudni without its clause (definite form without its selector)'], ['S0017L04U02', 'meg szeretnék tudni, hogy: a hogy-clause needs szeretném'],
      ['S0017L04U05', 'meg fogok tudni: untaught'],
      ...['S0019L02B03', 'S0019L02B02', 'S0019L02U05', 'S0019L02U03', 'S0019L02U02', 'S0019L02U04'].map((id) => [id, 'akarom with no definite object ("I do want" is re-cut)']),
      ...['S0019L03B01', 'S0019L03B02', 'S0019L03U03', 'S0019L03U02', 'S0019L03U04'].map((id) => [id, 'bare abbahagyni / akarom|akarja with no object / positive needs untaught abba…hagyni (H4: one chunk)']),
      ['S0019L04U05', 'akarom with English "I want": positive needs abba akarom hagyni (untaught)'], ['S0019L04U03', 'akarja: "she wants" re-cut'],
    ],
    move: [
      ['S0008L02B02', 'S0008L01', null, null], ['S0008L02B03', 'S0008L01', null, null], ['S0008L02U04', 'S0008L01', null, null],
      ['S0008L03B01', 'S0008L02', null, 'hogy mire gondolok'], ['S0008L03B02', 'S0008L02', null, 'elmagyarázni, hogy mire gondolok'],
      ['S0012L03B02', 'S0012L02', null, null], ['S0012L03U03', 'S0012L02', null, null],
      ['S0012L04B01', 'S0012L03', null, 'hogy mi fog történni'], ['S0012L04B03', 'S0012L03', null, 'nem vagyok biztos benne, hogy mi fog történni'],
      ['S0012L04U04', 'S0012L03', null, null], ['S0012L04U01', 'S0012L03', null, null],
      ['S0017L01U07', 'S0017L03', "i'm going to try to explain what the answer is", null], ['S0017L01U06', 'S0017L03', null, null],
      ['S0017L03B01', 'S0017L02', "what's the answer?", null], ['S0017L03U02', 'S0017L02', "what's the answer now?", null],
      ['S0019L04B01', 'S0019L03', 'to stop talking', null],
    ],
    edit: [
      ['S0008L03B03', null, 'megpróbálom elmagyarázni, hogy mire gondolok'],
      ['S0008L03U04', null, 'ma megpróbálom elmagyarázni, hogy mire gondolok'],
      ['S0008L03U01', null, 'most megpróbálom elmagyarázni, hogy mire gondolok'],
      ['S0010L02U01', "i'm not sure what I mean", 'nem vagyok biztos benne, hogy mire gondolok'],
      ['S0012L04B04', null, 'nem szeretném kitalálni, hogy mi fog történni'],
      ['S0019L04U02', "I don't want to stop talking now", null],
      ['S0018L02U03', "he wants to come at six o'clock this evening", 'ma este hat órakor akar jönni'],
      ['S0018L03U05', 'he wants to meet this evening', 'ma este akar találkozni'],
    ],
    add: [
      ['S0008L01', 'use', 'I want to explain something', 'szeretnék elmagyarázni valamit'],
      ['S0008L01', 'use', "i'm going to explain something", 'fogok elmagyarázni valamit'],
      ['S0008L01', 'use', 'I want to explain something now', 'most szeretnék elmagyarázni valamit'],
      ['S0008L01', 'use', "i'm going to explain something today", 'ma fogok elmagyarázni valamit'],
      ['S0008L02', 'build', 'to explain in Hungarian what I mean', 'magyarul elmagyarázni, hogy mire gondolok'],
      ['S0008L03', 'use', "i'm going to try to explain in Hungarian what I mean", 'megpróbálom magyarul elmagyarázni, hogy mire gondolok'],
      ['S0008L03', 'use', "today i'm going to try to explain in Hungarian what I mean", 'ma megpróbálom magyarul elmagyarázni, hogy mire gondolok'],
      ['S0012L02', 'build', 'to guess', 'kitalálni'],
      ['S0012L02', 'use', 'I want to guess something', 'szeretnék kitalálni valamit'],
      ['S0012L02', 'use', "i'm trying to guess something", 'próbálok kitalálni valamit'],
      ['S0012L03', 'use', "today i'm not sure what's going to happen", 'ma nem vagyok biztos benne, hogy mi fog történni'],
      ['S0012L03', 'use', "i'm going to try to explain what's going to happen tomorrow", 'megpróbálom elmagyarázni, hogy mi fog történni holnap'],
      ['S0012L04', 'use', "I wouldn't like to guess what's going to happen tomorrow", 'nem szeretném kitalálni, hogy mi fog történni holnap'],
      ['S0012L04', 'use', "today I wouldn't like to guess what's going to happen", 'ma nem szeretném kitalálni, hogy mi fog történni'],
      ['S0012L04', 'use', "now I wouldn't like to guess what's going to happen", 'most nem szeretném kitalálni, hogy mi fog történni'],
      ['S0017L02', 'use', "what's the answer today?", 'ma mi a válasz?'],
      ['S0017L03', 'build', 'what the answer is', 'hogy mi a válasz'],
      ['S0017L03', 'use', "I wouldn't like to guess what the answer is", 'nem szeretném kitalálni, hogy mi a válasz'],
      ['S0017L03', 'use', "today i'm not sure what the answer is", 'ma nem vagyok biztos benne, hogy mi a válasz'],
      ['S0017L04', 'use', 'now she wants to find out what the answer is', 'most meg akarja tudni, hogy mi a válasz'],
      ['S0017L04', 'use', 'today she wants to find out what the answer is', 'ma meg akarja tudni, hogy mi a válasz'],
      ['S0017L04', 'use', 'she wants to find out tomorrow what the answer is', 'holnap meg akarja tudni, hogy mi a válasz'],
      ['S0019L03', 'build', 'to stop talking now', 'most abbahagyni a beszélgetést'],
      ['S0019L03', 'build', 'to stop talking later', 'később abbahagyni a beszélgetést'],
      ['S0019L04', 'use', "I don't want to stop talking today", 'ma nem akarom abbahagyni a beszélgetést'],
      ['S0019L04', 'use', "this evening I don't want to stop talking", 'ma este nem akarom abbahagyni a beszélgetést'],
      ['S0019L04', 'use', "I don't want to stop talking with you", 'nem akarom abbahagyni a beszélgetést veled'],
      ['S0019L04', 'use', "but I don't want to stop talking with you", 'de nem akarom abbahagyni a beszélgetést veled'],
    ],
  },

  // B — NOUN WITH ITS VERB (K56) + EMBEDDED IF (K52 carried over): szóra / mondatra inside their emlékszik chunks; "if I
  // can remember | hogy emlékszem-e", always with hogy (Benő, PPKE: "Nem tudom, hogy jó helyen kopogok-e").
  B: {
    legos: [
      { id: 'S0006L02', to: { known_text: 'to remember a word', target_text: 'emlékezni egy szóra', type: 'M', components: c([['to remember', 'emlékezni'], ['a', 'egy'], ['word', 'szó']]) } },
      { id: 'S0010L04', to: { known_text: 'if I can remember', target_text: 'hogy emlékszem-e', type: 'M', components: c([['that', 'hogy'], ['do I remember', 'emlékszem-e']]) } },
      { id: 'S0010L05', to: { known_text: 'if I can remember the whole sentence', target_text: 'hogy emlékszem-e az egész mondatra', type: 'M',
        components: c([['if I can remember', 'hogy emlékszem-e'], ['the', 'az'], ['whole', 'egész'], ['sentence', 'mondat']]) } },
    ],
    del: [
      ['S0006L02B01', 'the noun alone (K56)'], ['S0006L02U03', 'twin English of S0006L02B04 with another order'],
      ['S0006L01U05', 'emlékezni + infinitive ("remember to speak") is not Hungarian'],
      ['S0010L05B03', 'not Hungarian: -ra has no verb to depend on'], ['S0010L05B01', 'the noun alone (K56)'],
      ['S0010L05B02', 'does not contain the grown LEGO'], ['S0010L05U02', 'does not contain the grown LEGO'], ['S0010L05U03', 'does not contain the grown LEGO'],
      ['S0010L05U04', 'megpróbálom + object-less emlékezni'],
      ['S0010L03B03', 'broken: "i\'m not sure about it, to explain what I mean"'], ['S0010L03B02', 'broken: "i\'m not sure about it, to try as hard as I can"'],
      ['S0010L03U05', 'becomes a twin of S0010L04U02 once fixed'],
      ['S0010L03U01', 'English "about it, how to speak" is broken, and without "about it" it no longer contains its LEGO; mondjak for "speak"'],
    ],
    edit: [
      ['S0006L02U04', "i'm going to remember a word in Hungarian", 'fogok emlékezni egy szóra magyarul'],
      ['S0006L02U05', "i'm trying to remember a word in Hungarian", 'próbálok emlékezni egy szóra magyarul'],
      ['S0010L04B02', "i'm not sure if I can remember", 'nem vagyok biztos benne, hogy emlékszem-e'],
      ['S0010L04B01', 'if I can remember a word', 'hogy emlékszem-e egy szóra'],
      ['S0010L04U01', "i'm not sure if I can remember how to speak Hungarian", 'nem vagyok biztos benne, hogy emlékszem-e, hogyan beszéljek magyarul'],
      ['S0010L04U03', 'if I can remember how to say something', 'hogy emlékszem-e, hogyan mondjak valamit'],
      ['S0010L04U02', "i'm not sure if I can remember a word", 'nem vagyok biztos benne, hogy emlékszem-e egy szóra'],
      ['S0010L04U05', "i'm not sure if I can remember how to say something", 'nem vagyok biztos benne, hogy emlékszem-e, hogyan mondjak valamit'],
      ['S0010L05B04', 'if I can remember the whole sentence', 'hogy emlékszem-e az egész mondatra'],
      ['S0010L02U02', null, 'nem vagyok biztos benne, hogyan beszéljek'],
    ],
    add: [
      ['S0006L02', 'use', 'I want to remember a word now', 'most szeretnék emlékezni egy szóra'],
      ['S0010L05', 'use', "today i'm not sure if I can remember the whole sentence", 'ma nem vagyok biztos benne, hogy emlékszem-e az egész mondatra'],
      ['S0010L05', 'use', "now i'm not sure if I can remember the whole sentence", 'most nem vagyok biztos benne, hogy emlékszem-e az egész mondatra'],
    ],
  },

  // C — PREVERB ORDER + WANT-YOU-TO: "he wants to come back | vissza akar jönni" (seed 16's own order; Wikipedia "Le
  // akarja írni"); "I want you to speak | szeretném, hogy beszélj" (Kai's want-you-to rule; Wikipedia imperative-subjunctive
  // after verbs of wishing).
  C: {
    legos: [
      { id: 'S0015L02', to: { known_text: 'I want you to speak', target_text: 'szeretném, hogy beszélj', type: 'M', components: c([["I'd like it", 'szeretném'], ['that', 'hogy'], ['you speak', 'beszélj']]) } },
      { id: 'S0016L04', to: { known_text: 'he wants to come back', target_text: 'vissza akar jönni', type: 'M', components: c([['back', 'vissza'], ['he wants', 'akar'], ['to come', 'jönni']]) } },
    ],
    del: [
      ['S0015L02U04', '"as often as possible" word order with the subjunctive unsourced'],
      ['S0016L04B04', 'bare "come back" (no longer a LEGO)'], ['S0016L04B03', 'twin of S0016L04U01 once fixed'], ['S0016L04B01', 'bare "come back"'],
      ['S0016L04U03', 'fog + preverb order (native Q7)'],
      ['S0016L05B02', 'bare "come back"'], ['S0016L05U04', 'fog + preverb order (native Q7)'], ['S0016L05U05', 'bare "come back"'],
      ['S0016L05U02', '"I want to come back": szeretne + preverb order untaught (native Q6)'],
      ['S0018L02U01', 'focus + preverb order unsourced'], ['S0018L04B03', 'szeretnénk + preverb order untaught (native Q6)'], ['S0018L04U03', 'same'],
    ],
    edit: [
      ['S0015L02B01', 'I want you to speak Hungarian', 'szeretném, hogy magyarul beszélj'],
      ['S0015L02B02', 'I want you to speak Hungarian tomorrow', 'szeretném, hogy holnap magyarul beszélj'],
      ['S0015L02U02', 'I want you to speak a little Hungarian today', 'szeretném, hogy ma egy kicsit magyarul beszélj'],
      ['S0015L02U01', 'I want you to speak Hungarian with someone else', 'szeretném, hogy valaki mással magyarul beszélj'],
      ['S0015L02U03', 'I want you to speak Hungarian very well', 'szeretném, hogy nagyon jól beszélj magyarul'],
      ['S0015L03U06', 'I want you to speak with me tomorrow', null],
      ['S0015L03U07', 'I want you to speak Hungarian with me', 'szeretném, hogy magyarul beszélj velem'],
      ['S0015L03U05', 'I want you to speak with me now', 'szeretném, hogy most beszélj velem'],
      ['S0015L03U03', 'I want you to speak with me today', 'szeretném, hogy ma beszélj velem'],
      ['S0016L01U01', 'I want you to speak Hungarian with me later', 'szeretném, hogy később magyarul beszélj velem'],
      ['S0018L01U01', 'I want you to speak Hungarian with me this evening', 'szeretném, hogy ma este magyarul beszélj velem'],
      ['S0016L04B02', null, 'vissza akar jönni'],
      ['S0016L04U05', 'he wants to come back and practise', 'vissza akar jönni és gyakorolni'],
      ['S0016L04U04', 'he wants to come back and speak with me', 'vissza akar jönni és beszélni velem'],
      ['S0016L04U02', 'he wants to come back and speak Hungarian', 'vissza akar jönni és magyarul beszélni'],
      ['S0016L04U01', null, 'később vissza akar jönni'],
      ['S0016L05B03', null, 'vissza akar jönni mindenki mással'],
      ['S0016L05U01', null, 'később vissza akar jönni mindenki mással'],
      ['S0018L01U02', 'he wants to come back this evening', 'ma este vissza akar jönni'],
      ['S0019L01U02', 'but he wants to come back', 'de vissza akar jönni'],
    ],
    add: [
      ['S0015L02', 'build', 'I want you to speak', 'szeretném, hogy beszélj'],
      ['S0015L02', 'use', 'I want you to speak now', 'szeretném, hogy most beszélj'],
      ['S0015L02', 'use', 'I want you to speak Hungarian all day', 'szeretném, hogy egész nap magyarul beszélj'],
      ['S0015L03', 'use', 'and I want you to speak Hungarian with me tomorrow', 'és szeretném, hogy holnap magyarul beszélj velem'],
      ['S0016L04', 'use', 'he wants to come back today', 'ma vissza akar jönni'],
      ['S0016L04', 'use', 'he wants to come back tomorrow', 'holnap vissza akar jönni'],
      ['S0016L04', 'use', 'he wants to come back now', 'most vissza akar jönni'],
      ['S0016L05', 'use', 'I want to speak Hungarian with everyone else', 'szeretnék magyarul beszélni mindenki mással'],
      ['S0016L05', 'use', "i'm going to practise with everyone else", 'fogok gyakorolni mindenki mással'],
      ['S0016L05', 'use', 'he wants to speak with everyone else', 'akar beszélni mindenki mással'],
      ['S0016L05', 'use', 'he wants to come back with everyone else tomorrow', 'holnap vissza akar jönni mindenki mással'],
    ],
  },

  // D — DROPPED / SWAPPED VERBS (Chris Taylor's report), BARE ENGLISH VERBS (K54 "to …"), ONE ENGLISH TWO ANSWERS (H5 and
  // "as hard as I can"), "as often as" (seed 3's own words: olyan gyakran, amilyen gyakran csak lehet, verb before it).
  D: {
    legos: [
      // "as often as" alone has no valid sentence before "as possible" is taught (the DB's debut guard refuses a debut with
      // only its bare row), so the seed's own words are one chunk and S0003L03 "as possible" is the not-new merge leftover.
      { id: 'S0003L02', to: { known_text: 'as often as possible', target_text: 'olyan gyakran, amilyen gyakran csak lehet', type: 'M',
        components: c([['as', 'olyan'], ['often', 'gyakran'], ['as', 'amilyen'], ['often', 'gyakran'], ['only', 'csak'], ['possible', 'lehet']]) } },
      { id: 'S0003L03', to: { is_new: false }, note: 'merge leftover: "as possible | csak lehet" now lives inside S0003L02; needs lego.delete (tom_go)' },
    ],
    del: [
      ['S0003L02B03', 'dangling "as often as" with nothing after it'], ['S0003L02B02', 'dangling "as often as"'], ['S0003L02U02', 'dangling "as often as"'],
      ['S0003L02U04', 'meaningless ("learn as often as I try")'],
      ['S0003L03B01', 'bare "as possible": its LEGO is now the not-new merge leftover'], ['S0003L03B02', 'twin of S0003L02B01 once the chunk is one LEGO'],
      ['S0007L02B02', 'H5: becomes "I want to try today", a twin of S0007L02U04'], ['S0007L02U02', 'verb dropped; próbálkozni + verb not attested'],
      ['S0007L02U05', 'verb dropped'], ['S0007L02B03', 'próbálkozni + infinitive not attested (native Q4)'], ['S0007L02U01', 'próbálkozni + infinitive'],
      ['S0007L02U03', 'próbálkozni + "as often as" fragment'],
      ['S0007L03B03', 'H5: twin of S0007L03B02 once reworded'], ['S0007L03B04', 'meaningless English ("speak as hard as")'],
      ['S0007L04B03', 'meaningless English ("speak as hard as I can")'],
    ],
    move: [
      ['S0003L02U03', 'S0003L02', null, 'próbálok magyarul beszélni olyan gyakran, amilyen gyakran csak lehet'],
      ['S0003L03B03', 'S0003L02', 'to speak as often as possible', 'beszélni olyan gyakran, amilyen gyakran csak lehet'],
      ['S0003L03U04', 'S0003L02', 'I want to speak with you as often as possible', 'szeretnék veled beszélni olyan gyakran, amilyen gyakran csak lehet'],
      ['S0003L03U05', 'S0003L02', null, 'most próbálok tanulni olyan gyakran, amilyen gyakran csak lehet'],
      ['S0003L03U02', 'S0003L02', null, 'szeretnék magyarul tanulni olyan gyakran, amilyen gyakran csak lehet'],
      ['S0003L03U01', 'S0003L02', null, 'szeretnék beszélni olyan gyakran, amilyen gyakran csak lehet'],
      ['S0003L03U03', 'S0003L02', null, 'próbálok veled beszélni olyan gyakran, amilyen gyakran csak lehet'],
    ],
    edit: [
      ['S0003L02B01', 'as often as possible', 'olyan gyakran, amilyen gyakran csak lehet'],
      ['S0001L05B01', 'to speak Hungarian now', null], ['S0001L05B02', 'to speak with you now', null],
      ['S0005L02U04', "i'm going to practise often", 'gyakran fogok gyakorolni'],
      ['S0005L02U05', "i'm going to practise Hungarian with you", null], ['S0005L02U02', "i'm going to practise with you", null],
      ['S0005L01U05', 'I want to practise Hungarian now', null], ['S0005L01U02', 'I want to practise Hungarian', null],
      ['S0005L01U03', "i'm trying to practise often", 'próbálok gyakran gyakorolni'], ['S0005L01U04', 'I want to practise with you', null],
      ['S0005L03U04', null, 'szeretnék gyakran gyakorolni valaki mással'],
      ['S0005L03U01', null, 'gyakorolni fogok beszélni valaki mással'],
      ['S0007L01U02', "i'm going to practise with you today", null],
      ['S0007L03U02', 'I want to speak as hard as possible', null], ['S0007L03U01', 'I want to try as hard as possible', null],
      ['S0007L04U02', 'I want to try as hard as I can today', 'ma annyira szeretnék próbálkozni, amennyire csak tudok'],
      ['S0009L02U05', null, 'most gyakran beszélek magyarul'],
      ['S0011L01U03', null, 'szeretnék tudni beszélni olyan gyakran, amilyen gyakran csak lehet'],
      ['S0011L02U04', 'I want to try after you finish', null],
      ['S0012L01B01', 'to speak tomorrow', null], ['S0012L01U06', "tomorrow i'm going to speak with you", null],
      ['S0012L01U07', 'tomorrow I want to learn', 'holnap szeretnék tanulni'], ['S0012L01U05', 'I want to practise tomorrow', null],
      ['S0013L02B03', 'to speak well with you', 'jól beszélni veled'], ['S0013L02B02', 'to speak Hungarian well', 'jól beszélni magyarul'],
      ['S0013L02B01', 'to speak very well', 'nagyon jól beszélni'], ['S0013L02U04', "i'm not sure i'm going to learn well", null],
      ['S0013L02U03', "i'm trying to learn well", null],
      ['S0013L03U03', 'you speak Hungarian with someone else', null], ['S0013L03U04', 'you speak Hungarian often', 'gyakran beszélsz magyarul'],
      ['S0014L01B03', 'to practise with you all day', 'egész nap veled gyakorolni'], ['S0014L01B04', 'to practise all day', null],
      ['S0014L01U06', "i'm trying to learn all day", null], ['S0014L01U05', 'I want to try all day', null],
      ['S0015L01U05', "and i'm trying to speak Hungarian", 'és próbálok magyarul beszélni'], ['S0015L01U03', null, 'és próbálok beszélni'],
      ['S0015L01U06', 'and I want to learn', null],
      ['S0016L03U02', null, 'akar jönni és beszélni velem'], ['S0016L02U05', 'I want to come and speak with you', 'szeretnék jönni és beszélni veled'],
      ['S0016L02U02', "i'm going to come today", null], ['S0016L01B03', 'to practise later', null],
      ['S0018L01U03', 'I want to try this evening', 'ma este szeretnék próbálkozni'], ['S0018L01B03', 'to practise this evening', null],
      ['S0018L02U02', "I want to speak Hungarian at six o'clock", 'hat órakor szeretnék magyarul beszélni'], ['S0018L02B03', "to come at six o'clock", null],
      ['S0018L04U02', null, 'szeretnénk magyarul beszélni'],
      ['S0018L03U03', 'I want to come and meet with you this evening', 'ma este szeretnék jönni és veled találkozni'],
      ['S0018L03U04', "to meet with you at six o'clock", null], ['S0018L03B03', 'to meet this evening', null],
      ['S0019L01U05', 'but I want to meet with you', 'de szeretnék veled találkozni'], ['S0019L01U03', null, 'de próbálok magyarul beszélni'],
      ['S0019L01U01', null, 'de nem vagyok biztos benne'],
    ],
    add: [
      ['S0007L02', 'use', 'I want to try now', 'most szeretnék próbálkozni'],
      ['S0007L02', 'use', 'I want to try with you', 'szeretnék veled próbálkozni'],
      ['S0007L02', 'use', 'I want to try with someone else', 'szeretnék valaki mással próbálkozni'],
    ],
  },
  // E — KNOCK-ON IN SEEDS 20+, forced rows only: a row that reuses a 1-19 chunk this job re-cut, fixed where the fix follows
  // mechanically from the chunk's new form (vissza akar jönni; he wants = akar with no definite object; the seed-8 mire chunk;
  // amilyen gyakran). Preverb before the auxiliary in the past as in the present: seed 139's own "vissza akartam jönni".
  // Rows whose fix needs a decision about a 20+ LEGO (akarod, akarjuk, akarta, szerettem volna, noun chunks) are PROPOSALS.
  E: {
    del: [
      ['S0020L01U03', 'twin of S0020L01U01 once "she" rows use "he"'], ['S0021L01U02', '"vissza jönni" is no longer taught as a piece'],
      ['S0022L03U02', 'broken: akik + infinitive'], ['S0022L01B03', 'mert akarja: definite with no object; "she wants" re-cut'],
      ['S0022L01U05', 'mert megpróbálom: English "I want to try" ≠ megpróbálom; definite with no object'],
      ['S0023L01U03', 'twin of S0023L01B02 once fixed'], ['S0023L01U01', '"come back soon tomorrow" is not a sentence'],
      ['S0025L01U05', 'verb dropped; bare vissza jönni'], ['S0025L01U03', 'verb dropped (akarja nekem)'],
      ['S0026L01U02', 'akarja + vissza menni: preverb order with menni untaught'], ['S0027L04U03', 'broken (akarja tölteni a válaszadással)'],
      ['S0028L02U04', 'verb dropped (akarja elkezdeni velem)'], ['S0029L01U04', 'verb dropped (akarja jobban magyarul)'],
      ['S0037L03U05', 'akarja + intransitive gondolkodni; "about it" untaught at L03'], ['S0044L01U02', 'bare vissza jönni'],
      ['S0054L03U03', 'akarja adni: no object'],
    ],
    edit: [
      ['S0020L01U01', 'he wants to come back quickly', 'gyorsan vissza akar jönni'],
      ['S0022L01U02', 'because he wants to come back', 'mert vissza akar jönni'],
      ['S0023L01B02', 'he wants to come back soon', 'hamarosan vissza akar jönni'],
      ['S0025L03U05', 'he wants to come back before I have to go', 'vissza akar jönni, mielőtt mennem kell'],
      ['S0026L04B03', null, 'szeretem azt érezni, hogy megpróbálom elmagyarázni, hogy mire gondolok'],
      ['S0034L03U02', 'when he wants to come back', 'amikor vissza akar jönni'],
      ['S0035L01U03', 'he wants to come back this afternoon', 'ma délután vissza akar jönni'],
      ['S0037L04U05', 'he wants to think about it carefully', 'akar gondolkodni alaposan rajta'],
      ['S0039L01U03', 'he wants to come back this morning', 'ma reggel vissza akar jönni'],
      ['S0052L03U02', null, 'múlt héten vissza akart jönni'],
      ['S0053L02U02', 'he wants to put something', 'akar tenni valamit'],
      ['S0054L01U02', null, 'múlt héten vissza akartunk jönni'],
      ['S0057L02U04', null, 'múlt héten vissza akartam jönni'],
      ['S0059L03U04', 'he wants to come back next week', 'jövő héten vissza akar jönni'],
      ['S0059L03U05', 'he wants to speak with me next week', 'jövő héten akar beszélni velem'],
      ['S0061L03U04', 'he wants to speak with me again', 'akar újra beszélni velem'],
      ['S0070L01U04', null, 'megmondani nekem, mire gondolok'],
      ['S0082L01U03', "he doesn't want to wait", 'nem akar várni'],
      ['S0082L02U02', "he doesn't want to wait for you", 'nem akar várni rád'],
      ['S0091L01U03', 'he wants to come back in time', 'időben vissza akar jönni'],
      ['S0095L03U03', 'he wants to come back on the next bus', 'vissza akar jönni a következő busszal'],
      ['S0097L01B01', null, 'igen, megpróbálom elmagyarázni, hogy mire gondolok'],
      ['S0110L04U05', 'he wants to relax', 'akar pihenni'],
      ['S0117L01U01', 'clearly he wants to speak with me', 'egyértelműen akar beszélni velem'],
      ['S0121L01B01', null, 'szokatlan próbálkozni magyarul olyan gyakran, amilyen gyakran csak lehet'],
      ['S0157L01U04', 'he wants to be there', 'ott akar lenni'],
    ],
    add: [
      ['S0003L04', 'use', 'how to speak as often as possible', 'hogyan beszéljek olyan gyakran, amilyen gyakran csak lehet'],
    ],
    move: [], legos: [],
  },
};

// ---------------------------------------------------------------------------------------------------------------------
const sid = (id) => String(id).split(':').pop();
const pid = (s) => `${COURSE}:${s}`;
const norm = (s) => String(s || '').toLowerCase().replace(/’/g, "'").replace(/[.,!?;:"«»]+/g, ' ').replace(/\s+/g, ' ').trim();
// contractions open up so "i'm" contains "I am" (the existing seed-10 rows already say "i'm not sure")
const CONTRACT = [[/\bi'm\b/g, 'i am'], [/\bdon't\b/g, 'do not'], [/\bwouldn't\b/g, 'would not'], [/\bwhat's\b/g, 'what is'], [/\bi'd\b/g, 'i would'], [/\bi'll\b/g, 'i will']];
const words = (s) => CONTRACT.reduce((t, [re, to]) => t.replace(re, to), norm(s)).split(' ').filter(Boolean);
function contains(hay, needle) { const have = {}; for (const w of words(hay)) have[w] = (have[w] || 0) + 1; for (const w of words(needle)) { if (!have[w]) return false; have[w]--; } return true; }
function legoPosition(known, legoKnown) { const k = norm(known), l = norm(legoKnown); if (k === l || k.startsWith(l + ' ')) return 'start'; if (k.endsWith(' ' + l)) return 'end'; return 'middle'; }
const legoIdOf = (seed, idx) => `S${String(seed).padStart(4, '0')}L${String(idx).padStart(2, '0')}`;
const COPY = ['status', 'register', 'difficulty', 'connected_lego_ids', 'target_text_roman', 'metadata', 'known_gloss_segments', 'introduce'];

function index(api) {
  const legos = [], phrases = [];
  for (const s of api.seeds) for (const l of s.legos || []) { legos.push(l); for (const p of l.basket_phrases || []) phrases.push({ ...p, _lego: l.lego_id }); }
  return { legos, phrases, L: new Map(legos.map((l) => [l.lego_id, l])), P: new Map(phrases.map((p) => [sid(p.id), p])), S: new Map(api.seeds.map((s) => [s.seed_number, s])) };
}

function plan(stageName, fresh, snap, dz = require('../../services/phrase-decomposer.cjs')) {
  const st = STAGES[stageName]; if (!st) throw new Error(`no stage ${stageName}`);
  const F = index(fresh), A = index(snap);
  const ops = [], problems = [], notes = [], touched = { phrases: new Set(), legos: new Set(), seeds: new Set() };
  const drift = (id) => { const f = F.P.get(id), a = A.P.get(id); if (!f) return `${id} gone`; if (!a) return null; if (f.known_text !== a.known_text || f.target_text !== a.target_text) return `${id} drifted: ${f.known_text} | ${f.target_text}`; return null; };

  // planned LEGO texts (for decomposition vocab + containment)
  const planned = new Map(F.legos.map((l) => [l.lego_id, { ...l }]));
  for (const lg of st.legos || []) {
    const cur = F.L.get(lg.id), auth = A.L.get(lg.id);
    if (!cur) { problems.push(`${lg.id} missing`); continue; }
    if (auth && (cur.known_text !== auth.known_text || cur.target_text !== auth.target_text)) { problems.push(`${lg.id} drifted: ${cur.known_text} | ${cur.target_text}`); continue; }
    planned.set(lg.id, { ...cur, ...lg.to });
  }
  // seeds
  for (const [n, newTarget] of st.seeds || []) {
    const s = F.S.get(n), a = A.S.get(n);
    if (!s || (a && s.target_text !== a.target_text)) { problems.push(`seed ${n} drifted`); continue; }
    ops.push({ op: 'seed.update', seed_number: n, set: { target_text: newTarget }, expect: { target_text: s.target_text } });
    touched.seeds.add(n); notes.push(`seed ${n}: ${s.target_text} → ${newTarget}`);
  }
  // LEGO updates: texts first (one op each), clip copies after, so the text-change trigger never overwrites a copied clip
  const clipOps = [], legoOps = [];
  for (const lg of st.legos || []) {
    const cur = F.L.get(lg.id); if (!cur) continue;
    legoOps.push({ op: 'lego.update', lego_id: lg.id, set: lg.to, expect: { known_text: cur.known_text, target_text: cur.target_text } });
    touched.legos.add(lg.id);
    notes.push(`LEGO ${lg.id}: ${cur.known_text} | ${cur.target_text}  →  ${planned.get(lg.id).known_text} | ${planned.get(lg.id).target_text}${lg.to.is_new === false ? '  (NOT NEW)' : ''}${lg.note ? '  — ' + lg.note : ''}`);
    if (lg.copyClipsFrom) {
      const src = F.L.get(lg.copyClipsFrom), to = planned.get(lg.id);
      if (src.known_text === to.known_text && src.known_audio_id) clipOps.push({ op: 'audio.link', target: 'lego', lego_id: lg.id, slot: 'known', audio_id: src.known_audio_id });
      if (src.target_text === to.target_text) for (const sl of ['target1', 'target2']) if (src[`${sl}_audio_id`]) clipOps.push({ op: 'audio.link', target: 'lego', lego_id: lg.id, slot: sl, audio_id: src[`${sl}_audio_id`] });
    }
    if (lg.presentationFrom) {
      const src = F.L.get(lg.presentationFrom);
      if (src.known_text === planned.get(lg.id).known_text && src.presentation_audio_id) clipOps.push({ op: 'audio.link', target: 'lego', lego_id: lg.id, slot: 'presentation', audio_id: src.presentation_audio_id });
    }
  }

  const vocabFor = (seedN) => [...planned.values()].filter((l) => l.seed_number <= seedN).map((l) => ({ lego_id: l.lego_id, target_text: l.target_text, known_text: l.known_text, seed_number: l.seed_number }));
  const decompose = (target, legoId, seedN, label) => {
    const lg = planned.get(legoId);
    const dec = dz.decomposeAnchored(target, vocabFor(seedN), { lego_id: lg.lego_id, target_text: lg.target_text, known_text: lg.known_text }, COURSE);
    if (!dec || dec.kind === 'error' || !dec.blocks) { problems.push(`${label}: target "${target}" does not contain its LEGO ${legoId} "${lg.target_text}"`); return null; }
    return dec.blocks;
  };
  const checkKnown = (known, legoId, label) => { const lg = planned.get(legoId); if (!contains(known, lg.known_text)) problems.push(`${label}: known "${known}" does not contain LEGO ${legoId} "${lg.known_text}"`); };

  // id allocation per target LEGO: past every id that exists now (deleted ones included) — no reuse inside one batch
  const nextNum = new Map(), nextPos = new Map();
  const alloc = (legoId, role) => {
    const letter = role === 'build' ? 'B' : role === 'use' ? 'U' : 'C';
    const key = legoId + letter;
    if (!nextNum.has(key)) {
      const nums = F.phrases.filter((p) => sid(p.id).startsWith(legoId + letter)).map((p) => Number(sid(p.id).slice(9)) || 0);
      nextNum.set(key, Math.max(0, ...nums) + 1);
    }
    const n = nextNum.get(key); nextNum.set(key, n + 1);
    if (!nextPos.has(legoId)) nextPos.set(legoId, Math.max(0, ...F.phrases.filter((p) => p._lego === legoId).map((p) => p.position || 0)) + 1);
    const pos = nextPos.get(legoId); nextPos.set(legoId, pos + 1);
    return { id: `${legoId}${letter}${String(n).padStart(2, '0')}`, position: pos };
  };
  const rowFor = (legoId, role, known, target, template, keepClips) => {
    const lg = planned.get(legoId);
    const { id, position } = alloc(legoId, role);
    const dec = role === 'component' ? [{ known: '', legoId: null, target, isGhost: true }] : decompose(target, legoId, lg.seed_number, id);
    if (role !== 'component') checkKnown(known, legoId, id);
    const row = { id: pid(id), course_code: COURSE, seed_number: lg.seed_number, lego_index: lg.lego_index, known_text: known, target_text: target,
      phrase_role: role, position, lego_position: role === 'component' ? 'middle' : legoPosition(known, lg.known_text), word_count: target.length,
      lego_count: dec ? dec.filter((b) => b.legoId).length : 1, introduce: true, status: 'draft', metadata: role === 'component' ? { buildup: 'component' } : { format: 'build_use' }, connected_lego_ids: [] };
    if (template) for (const k of COPY) if (template[k] !== undefined) row[k] = template[k];
    if (dec) row.decomposition = dec;
    if (keepClips && template) {
      if (template.known_text === known) row.known_audio_id = template.known_audio_id;
      if (template.target_text === target) { row.target1_audio_id = template.target1_audio_id; row.target2_audio_id = template.target2_audio_id; }
    }
    touched.phrases.add(id);
    return row;
  };

  const inserts = [], deletes = [];
  for (const [id, why] of st.del || []) {
    const d = drift(id); if (d) { problems.push(d); continue; }
    const p = F.P.get(id);
    deletes.push({ op: 'phrase.delete', phrase_id: p.id, expect: { known_text: p.known_text, target_text: p.target_text } });
    notes.push(`DEL ${id}: ${p.known_text} | ${p.target_text}  — ${why}`); touched.phrases.add(id);
  }
  for (const [id, to, nk, nt] of st.move || []) {
    const d = drift(id); if (d) { problems.push(d); continue; }
    const p = F.P.get(id), known = nk || p.known_text, target = nt || p.target_text;
    const role = p.phrase_role === 'component' ? 'component' : p.phrase_role;
    const row = rowFor(to, role, known, target, p, true);
    inserts.push({ op: 'phrase.insert', row });
    deletes.push({ op: 'phrase.delete', phrase_id: p.id, expect: { known_text: p.known_text, target_text: p.target_text } });
    notes.push(`MOVE ${id} → ${sid(row.id)}: ${p.known_text} | ${p.target_text}${nk || nt ? `  ⇒  ${known} | ${target}` : ''}`); touched.phrases.add(id);
  }
  for (const [to, role, known, target] of st.add || []) {
    const dup = F.phrases.find((q) => norm(q.known_text) === norm(known) && q.phrase_role !== 'component' && !(st.del || []).some((d) => d[0] === sid(q.id)) && !(st.move || []).some((m) => m[0] === sid(q.id)));
    if (dup) { problems.push(`ADD ${to} "${known}" twins existing ${sid(dup.id)} (${dup.target_text})`); continue; }
    const tpl = F.phrases.find((q) => q._lego === to && q.phrase_role === role) || F.phrases.find((q) => q._lego === to && q.phrase_role !== 'component');
    const row = rowFor(to, role, known, target, tpl, false);
    inserts.push({ op: 'phrase.insert', row });
    notes.push(`ADD ${sid(row.id)}: ${known} | ${target}`);
  }
  const edits = [];
  for (const [id, nk, nt] of st.edit || []) {
    const d = drift(id); if (d) { problems.push(d); continue; }
    const p = F.P.get(id), known = nk || p.known_text, target = nt || p.target_text;
    const set = { known_text: known, target_text: target, word_count: target.length };
    // an English-only edit keeps its stored decomposition (target tiles unchanged) unless its LEGO was re-texted
    const targetSame = target === p.target_text && !touched.legos.has(p._lego);
    const dec = targetSame ? null : decompose(target, p._lego, p.seed_number, id);
    if (known !== p.known_text || touched.legos.has(p._lego)) checkKnown(known, p._lego, id); // never re-judge English this job does not write
    if (dec) { set.decomposition = dec; set.lego_count = dec.filter((b) => b.legoId).length; }
    edits.push({ op: 'phrase.update', phrase_id: p.id, set, expect: { known_text: p.known_text, target_text: p.target_text } });
    notes.push(`EDIT ${id}: ${p.known_text} | ${p.target_text}  ⇒  ${known} | ${target}`); touched.phrases.add(id);
  }
  // component rows of every M LEGO whose components changed: old C rows go, new ones come in
  const compOps = [];
  for (const lg of st.legos || []) {
    if (!lg.to.components) continue;
    for (const p of F.phrases.filter((q) => q._lego === lg.id && q.phrase_role === 'component')) {
      compOps.push({ op: 'phrase.delete', phrase_id: p.id, expect: { known_text: p.known_text, target_text: p.target_text } }); touched.phrases.add(sid(p.id));
    }
    for (const comp of lg.to.components) {
      const row = rowFor(lg.id, 'component', comp.known, comp.target, null, false);
      compOps.push({ op: 'phrase.insert', row });
    }
  }
  // every untouched phrase in the basket of a re-texted LEGO: refresh its decomposition and prove it still contains its LEGO
  const refresh = [];
  const leftover = new Set((st.legos || []).filter((l) => l.to.is_new === false).map((l) => l.id));
  for (const lgId of touched.legos) {
    for (const p of F.phrases.filter((q) => q._lego === lgId && q.phrase_role !== 'component' && !touched.phrases.has(sid(q.id)))) {
      if (leftover.has(lgId)) { problems.push(`${sid(p.id)} still sits under the not-new ${lgId}`); continue; }
      const dec = decompose(p.target_text, lgId, p.seed_number, sid(p.id)); checkKnown(p.known_text, lgId, sid(p.id));
      if (dec) refresh.push({ op: 'phrase.update', phrase_id: p.id, set: { decomposition: dec, lego_count: dec.filter((b) => b.legoId).length }, expect: { known_text: p.known_text, target_text: p.target_text } });
    }
  }
  // LEGO re-texts go AFTER the phrase writes: the DB refuses a LEGO text change that would leave it no practising phrase
  // (DEBUT_WITHOUT_PRACTICE), checked at the moment of the LEGO update. Stage A (applied first) ran LEGOs first and passed.
  ops.push(...deletes, ...compOps.filter((o) => o.op === 'phrase.delete'), ...inserts, ...compOps.filter((o) => o.op === 'phrase.insert'), ...edits, ...refresh, ...legoOps, ...clipOps);
  return { ops, problems, notes, touched: { phrases: [...touched.phrases], legos: [...touched.legos], seeds: [...touched.seeds] } };
}

async function main() {
  const [stage, freshFile, snapFile] = process.argv.slice(2);
  if (!stage || !freshFile || !snapFile) throw new Error('usage: <stage> <fresh seeds.json> <authoring snapshot seeds.json>');
  const p = plan(stage, JSON.parse(fs.readFileSync(freshFile, 'utf8')), JSON.parse(fs.readFileSync(snapFile, 'utf8')));
  for (const n of p.notes) console.log('  ', n);
  if (p.problems.length) { console.log('STOP:'); for (const x of p.problems) console.log('   ', x); process.exitCode = 1; return; }
  const post = async (body) => { const r = await fetch(`${POPTY}/api/production/${COURSE}/edit-batch`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body) }); return { status: r.status, body: await r.json().catch(() => ({})) }; };
  const dry = await post({ ops: p.ops });
  console.log(`dry run ${dry.status} ${dry.body.error || ''} ${dry.body.code || ''} (${p.ops.length} ops)`);
  if (dry.status !== 200) { console.log(JSON.stringify(dry.body).slice(0, 2000)); process.exitCode = 1; return; }
  if (process.env.TOUCHED_OUT) fs.writeFileSync(process.env.TOUCHED_OUT, JSON.stringify(p.touched));
  if (process.env.APPLY_CONFIRM !== '1') return;
  const ap = await post({ ops: p.ops, apply: true });
  console.log(`APPLIED ${ap.status} event ${ap.body.event_id || ap.body.eventId || ''} undo ${ap.body.undo_file || ''} ${ap.body.error || ''}`);
  if (ap.status !== 200) { console.log(JSON.stringify(ap.body).slice(0, 2000)); process.exitCode = 1; }
  if (process.env.APPLY_OUT) fs.writeFileSync(process.env.APPLY_OUT, JSON.stringify(ap.body));
}
if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
module.exports = { plan, STAGES, contains };
