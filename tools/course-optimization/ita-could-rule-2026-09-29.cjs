#!/usr/bin/env node
'use strict';
// tools/course-optimization/ita-could-rule-2026-09-29.cjs
//
// ita_for_eng — Kai's "could" rule (2026-09-29, job #886·I, on #865·I's proposal d/ae64cca6, Option D; rows d/d4523ae6).
// THE ENGLISH DECIDES THE ITALIAN (canon L32):
//   could with no past frame (possibility, offer, "if she wanted to")  → potrei / potrebbe / potremmo / potrebbero
//   could you…?                                                          → potresti / potrebbe (unchanged)
//   if … could                                                           → se potesse (unchanged)
//   said / told … could(n't)                                             → poteva / potevamo (imperfect)
//   plain couldn't (past inability)                                      → non poteva (unchanged)
//   I think / I'm sure / do you think … could                            → potrebbe — NOT possa, NOT poteva (Kai, today)
// The potere-vs-riuscire "couldn't" split (S0311 and its family) is OUT: job #885·I is researching it.
//
// WHAT IT WRITES (every row re-texted IN PLACE — progress is filed by slot; nothing is deleted):
//   S0313L01 GROWS on both sides (L25; never delete a LEGO): "he could | poteva" (A) → "he said that he couldn't |
//     ha detto che non poteva" (M, 8 syllables = the L3 cap; the seed's own wording). Positive "he could" with no frame
//     had no right answer (poteva vs potrebbe three seeds apart). Its nine basket rows all take the chunk (K33); four
//     component rows are added (he said|ha detto S0301L01, that|che, not|non, he could|poteva). New template intro.
//   said + could → poteva: 14 rows incl. seed 312. "se volesse" after a reported poteva becomes "se voleva" (S0359L02U02).
//   S0359 B-rows "he could turn" gain the seed's frame; "I'm sure … could" → potrebbe (3 poteva rows).
//   I think / do you think + could: possa → potrebbe (16 rows).
//
// AUDIO — make-before-break through the ONE route (POST /api/audio/render, Tom 2026-09-29): every new clip is made and
// verified FIRST (dry run, then one real call, no retries; voiceBound so no slot takes another voice's bytes), and only
// then does ONE transaction swap text and links together (the null-audio trigger respects a link set in the same
// UPDATE). If any clip is refused, NOTHING is written: a refusal is the answer and is reported. Old clips are kept.
// target1 (Elsa) speaks the female reading (course_gender_expansions.expanded_f); rows for new gendered texts are written.
//
//   node tools/course-optimization/ita-could-rule-2026-09-29.cjs             # dry run: guards + plan, no writes, no audio
//   RENDER_DRY=1 node …                                                      # + ask the route what each clip would cost
//   APPLY=1 node …                                                           # render, verify, write, unapprove, refresh
//   CHECK=1 node …                                                           # end-state rule + audio on the live course
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'ita_for_eng';
const JOB = '#886·I';
const SWEEP = 'ita-could-rule-2026-09-29';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const RULING = "Kai, 2026-09-29 (job #886·I, proposal d/ae64cca6 Option D): the English decides — no-frame could → conditional; said/told … could(n't) → imperfect (poteva); I think / I'm sure / do you think … could → potrebbe (not possa, not poteva); if … could → se potesse; S0313L01 grows to 'he said that he couldn't | ha detto che non poteva'. riuscire 'couldn't' excluded (#885·I).";
const VOICES = { known: 'en-GB-SoniaNeural', target1: 'it-IT-ElsaNeural', target2: 'it-IT-BenignoNeural', presentation: 'en-GB-SoniaNeural' };
const voiceOk = (want, got) => String(got || '').replace(/^azure_/, '') === want;

const norm = (s) => String(s || '').toLowerCase().replace(/’/g, "'").replace(/[.,!?;:"«»“”]+/g, ' ').replace(/\s+/g, ' ').trim();
const words = (s) => norm(s).split(' ').filter(Boolean);
const short = (id) => String(id).replace(/^ita_for_eng:/, '');
const full = (id) => (String(id).startsWith(`${COURSE}:`) ? id : `${COURSE}:${id}`);
const seedOf = (id) => Number(String(short(id)).slice(1, 5));
function containsWords(hay, needle) {
  const h = words(hay);
  for (const w of words(needle)) { const i = h.indexOf(w); if (i < 0) return false; h.splice(i, 1); }
  return true;
}
function legoPosition(phraseTarget, legoTarget) {
  const p = norm(phraseTarget), l = norm(legoTarget);
  if (p === l) return null;
  if (p.startsWith(l + ' ')) return 'start';
  if (p.endsWith(' ' + l)) return 'end';
  return 'middle';
}
/** Elsa's reading: only the speaker's own forms move ("sono sicuro" → "sono sicura"). */
const femaleReading = (t) => String(t).replace(/\bsono sicuro\b/g, 'sono sicura');

// ── The rule, as code (tested) ─────────────────────────────────────────────────────────────
const POTREBBE = /\bpotre(i|sti|bbe|mmo|ste|bbero)\b/;
const POTEVA = /\bpote(vo|vi|va|vamo|vate|vano)\b/;
const POSSA = /\bposs(a|ano)\b/;
/** "I think / I'm sure / do you think … could" (not couldn't): the Italian is the conditional. */
const isThinkCould = (known) => /\b(think|i'm sure)\b/.test(norm(known)) && /\bcould\b/.test(norm(known)) && !/\bcouldn't\b/.test(norm(known)) && !/\bif\b[^,]*\bcould\b/.test(norm(known));
/** "said / told … could(n't)", no "could you": the Italian is the imperfect. */
const isSaidCould = (known) => /\b(said|told)\b.*\bcould(n't)?\b/.test(norm(known)) && !/\bcould you\b/.test(norm(known));
/** The one LEGO this rule re-cuts, and what it becomes. */
const LEGO = {
  id: 'S0313L01', seed: 313,
  from: { known: 'he could', target: 'poteva', type: 'A', components: [] },
  to: { known: "he said that he couldn't", target: 'ha detto che non poteva', type: 'M',
    components: [{ known: 'he said', target: 'ha detto' }, { known: 'that', target: 'che' }, { known: 'not', target: 'non' }, { known: 'he could', target: 'poteva' }] },
  // Frame B: the context is the seed sentence, which contains the chunk (intro-mirror expectedLine)
  intro: "The Italian for: 'he said that he couldn't', as in — 'he said that he couldn't watch all five games', is:",
};
/**
 * End-state rule on a set of rows ({kind, id, known, target}): (1) think/sure + could → potrebbe, never possa/poteva;
 * (2) said + could(n't) (potere) → poteva, never the conditional; (3) S0313L01 is the grown LEGO and every played
 * row under it contains it on both sides. riuscire rows are out of scope and never judged here.
 */
function endStateProblems(rows) {
  const out = [];
  for (const r of rows) {
    if (r.kind === 'component' || r.kind === 'lego' || HELD_IDS.has(r.id)) continue;
    const t = norm(r.target);
    if (/\briusc/.test(t)) continue;
    if (isThinkCould(r.known) && (POSSA.test(t) || POTEVA.test(t))) out.push(`${r.id}: think/sure + could says "${r.target}" — rule: potrebbe`);
    if (isSaidCould(r.known) && POTREBBE.test(t) && !/\bif\b/.test(norm(r.known).split('could')[0])) out.push(`${r.id}: said + could says "${r.target}" — rule: poteva`);
  }
  const lego = rows.find((r) => r.kind === 'lego' && r.id === LEGO.id);
  if (!lego || norm(lego.known) !== norm(LEGO.to.known) || norm(lego.target) !== norm(LEGO.to.target)) out.push(`${LEGO.id} is not "${LEGO.to.known} | ${LEGO.to.target}"`);
  else for (const p of rows.filter((r) => ['build', 'use'].includes(r.kind) && r.id.startsWith(LEGO.id)))
    if (!containsWords(p.known, lego.known) || !containsWords(p.target, lego.target)) out.push(`${p.id} does not contain ${LEGO.id}`);
  const hc = new Set(rows.filter((r) => r.kind !== 'component' && norm(r.known) === 'he could').map((r) => norm(r.target)));
  if (hc.size > 1) out.push(`ZUT: "he could" → ${[...hc].join(' / ')}`);
  return out;
}

// ── The plan ───────────────────────────────────────────────────────────────────────────────
const E = (id, lego, group, before, after, why) => ({ id, lego, group, before, after, why });
const X = (known, target) => ({ known, target });
const EDITS = [
  // 1. S0313L01's basket — every row carries the grown chunk (K33); ids kept
  E('S0313L01B01', 'S0313L01', 'S0313L01 basket', X('he could', 'poteva'), X("he said that he couldn't", 'ha detto che non poteva'), 'the LEGO itself'),
  E('S0313L01B02', 'S0313L01', 'S0313L01 basket', X("he couldn't", 'non poteva'), X("he said that he couldn't come", 'ha detto che non poteva venire'), 'also ends the exact clash with S0311L01 "he couldn\'t | non riusciva a"'),
  E('S0313L01B03', 'S0313L01', 'S0313L01 basket', X("he couldn't watch", 'non poteva guardare'), X("he said that he couldn't watch", 'ha detto che non poteva guardare'), 'builds toward the seed'),
  E('S0313L01U01', 'S0313L01', 'S0313L01 basket', X("he said he couldn't do it", 'ha detto che non poteva farlo'), X("he said that he couldn't do it", 'ha detto che non poteva farlo'), 'English takes "that" (K33); Italian and its clips unchanged'),
  E('S0313L01U02', 'S0313L01', 'S0313L01 basket', X("she couldn't learn Italian yesterday", 'non poteva imparare italiano ieri'), X("he said that he couldn't learn Italian", 'ha detto che non poteva imparare italiano'), 'gets the frame; "yesterday" dropped (the frame carries the past)'),
  E('S0313L01U03', 'S0313L01', 'S0313L01 basket', X('he said he could write a story about that man', "ha detto che poteva scrivere una storia su quell'uomo"), X("he said that he couldn't write a story about that man", "ha detto che non poteva scrivere una storia su quell'uomo"), 'contains the chunk'),
  E('S0313L01U04', 'S0313L01', 'S0313L01 basket', X("she couldn't use the other room yesterday", "non poteva usare l'altra stanza ieri"), X("he said that he couldn't use the other room", "ha detto che non poteva usare l'altra stanza"), 'gets the frame'),
  E('S0313L01U05', 'S0313L01', 'S0313L01 basket', X('he said he could explain what happened', 'ha detto che poteva spiegare quello che è successo'), X("he said that he couldn't explain what happened", 'ha detto che non poteva spiegare quello che è successo'), 'contains the chunk'),
  E('S0313L01U06', 'S0313L01', 'S0313L01 basket', X("she couldn't sit down because she couldn't stop working", 'non poteva sedersi perché non poteva smettere di lavorare'), X("he said that he couldn't stop working", 'ha detto che non poteva smettere di lavorare'), 'gets the frame, shortened'),
  // 2. said + could → poteva (14 rows, seed 312 among them)
  // seeds 310–311 come BEFORE poteva is taught (S0313L01), so these two cannot say poteva and may not say potrebbe:
  // they leave the construction (P27), the #865·I precedent for S0310L02U03 ("said he wanted to | ha detto che voleva")
  E('S0310L01U05', 'S0310L01', 'said + could before 313 → wanted to', X('she said she could write a story of that young woman', 'ha detto che potrebbe scrivere una storia di quella giovane donna'), X('she said she wanted to write a story of that young woman', 'ha detto che voleva scrivere una storia di quella giovane donna'), 'poteva is untaught at 310 (P27); voleva S0052L01, the S0310L02U03 precedent'),
  E('S0311L02U05', 'S0311L02', 'said + could before 313 → wanted to', X('he said he could write a story about three most important facts', 'ha detto che potrebbe scrivere una storia su tre fatti più importanti'), X('he said he wanted to write a story about three most important facts', 'ha detto che voleva scrivere una storia su tre fatti più importanti'), 'poteva is untaught at 311 (P27); the S0310L02U03 precedent'),
  // SEED 312 and its three said-could rows are HELD for Kai (HELD below): poteva is taught one seed later.
  E('S0316L01U02', 'S0316L01', 'said + could → poteva', X('she said she could bring her brother', 'ha detto che potrebbe portare suo fratello'), X('she said she could bring her brother', 'ha detto che poteva portare suo fratello')),
  E('S0316L02U02', 'S0316L02', 'said + could → poteva', X('she said she could bring her brother on Monday', 'ha detto che potrebbe portare suo fratello lunedì'), X('she said she could bring her brother on Monday', 'ha detto che poteva portare suo fratello lunedì')),
  E('S0318L01U05', 'S0318L01', 'said + could → poteva', X('she said she could bring her brother this time if she wanted to', 'ha detto che potrebbe portare suo fratello questa volta se volesse'), X('she said she could bring her brother this time if she wanted to', 'ha detto che poteva portare suo fratello questa volta se voleva'), 'reported: poteva … se voleva (S0359L02U02)'),
  E('S0331L02U02', 'S0331L02', 'said + could → poteva', X('she said she could provide another way', "ha detto che potrebbe fornire un'altra possibilità"), X('she said she could provide another way', "ha detto che poteva fornire un'altra possibilità")),
  E('S0332L01U03', 'S0332L01', 'said + could → poteva', X('she said he could build something if he wanted to', 'ha detto che potrebbe costruire qualcosa se volesse'), X('she said he could build something if he wanted to', 'ha detto che poteva costruire qualcosa se voleva'), 'reported: poteva … se voleva (S0359L02U02)'),
  E('S0413L02U04', 'S0413L02', 'said + could → poteva', X('she said we could fall', 'ha detto che potremmo cadere'), X('she said we could fall', 'ha detto che potevamo cadere'), 'potevamo: non potevamo S0412L01'),
  E('S0413L03U04', 'S0413L03', 'said + could → poteva', X('she said we could fall if we go', 'ha detto che potremmo cadere se andiamo'), X('she said we could fall if we go', 'ha detto che potevamo cadere se andiamo'), 'se andiamo is the LEGO and mirrors "if we go"'),
  E('S0413L04U02', 'S0413L04', 'said + could → poteva', X('she said we could fall if too close to the edge', 'ha detto che potremmo cadere troppo vicino al bordo'), X('she said we could fall if too close to the edge', 'ha detto che potevamo cadere troppo vicino al bordo'), 'the English "if too close" is listed for Kai'),
  // 3. "he could turn" with no frame → the seed's frame; "I'm sure … could" → potrebbe (the 3 poteva rows)
  E('S0359L01B02', 'S0359L01', 'no-frame could → frame', X('he could turn', 'poteva girare'), X('your friend said he could turn', 'il tuo amico ha detto che poteva girare'), "gains the seed's frame"),
  E('S0359L02B03', 'S0359L02', 'no-frame could → frame', X('he could turn to the left', 'poteva girare a sinistra'), X('your friend said he could turn to the left', 'il tuo amico ha detto che poteva girare a sinistra'), "gains the seed's frame"),
  E('S0358L02U03', 'S0358L02', "I'm sure + could → potrebbe", X("I'm sure she could reach the top", 'sono sicuro che poteva raggiungere la cima'), X("I'm sure she could reach the top", 'sono sicuro che potrebbe raggiungere la cima')),
  E('S0359L01U03', 'S0359L01', "I'm sure + could → potrebbe", X("I'm sure he could turn if he wanted to", 'sono sicuro che poteva girare se volesse'), X("I'm sure he could turn if he wanted to", 'sono sicuro che potrebbe girare se volesse')),
  E('S0359L02U03', 'S0359L02', "I'm sure + could → potrebbe", X("I'm sure he could turn left to reach the top", 'sono sicuro che poteva girare a sinistra per raggiungere la cima'), X("I'm sure he could turn left to reach the top", 'sono sicuro che potrebbe girare a sinistra per raggiungere la cima')),
  // 4. I think / do you think + could: possa → potrebbe (16 rows)
  E('S0312L01U03', 'S0312L01', 'think + could: possa → potrebbe', X('I think she could use the other room tomorrow', "penso che possa usare l'altra stanza domani"), X('I think she could use the other room tomorrow', "penso che potrebbe usare l'altra stanza domani")),
  E('S0314L01U01', 'S0314L01', 'think + could: possa → potrebbe', X('I think she could put it on the table', 'penso che possa metterlo sul tavolo'), X('I think she could put it on the table', 'penso che potrebbe metterlo sul tavolo')),
  E('S0314L01U05', 'S0314L01', 'think + could: possa → potrebbe', X('I think that young man could put it on the table tomorrow', 'penso che quel giovane uomo possa metterlo sul tavolo domani'), X('I think that young man could put it on the table tomorrow', 'penso che quel giovane uomo potrebbe metterlo sul tavolo domani')),
  E('S0316L01B03', 'S0316L01', 'think + could: possa → potrebbe', X('do you think she could bring her brother?', 'pensi che possa portare suo fratello?'), X('do you think she could bring her brother?', 'pensi che potrebbe portare suo fratello?')),
  E('S0316L01U03', 'S0316L01', 'think + could: possa → potrebbe', X('I think she could bring her brother tomorrow', 'penso che possa portare suo fratello domani'), X('I think she could bring her brother tomorrow', 'penso che potrebbe portare suo fratello domani')),
  E('S0316L02B03', 'S0316L02', 'think + could: possa → potrebbe', X('do you think she could bring her brother on Monday?', 'pensi che possa portare suo fratello lunedì?'), X('do you think she could bring her brother on Monday?', 'pensi che potrebbe portare suo fratello lunedì?')),
  E('S0316L02U05', 'S0316L02', 'think + could: possa → potrebbe', X('do you think she could watch all five games on Monday?', 'pensi che possa guardare tutte e cinque le partite lunedì?'), X('do you think she could watch all five games on Monday?', 'pensi che potrebbe guardare tutte e cinque le partite lunedì?')),
  E('S0318L01B02', 'S0318L01', 'think + could: possa → potrebbe', X("I don't think she could this time", 'non penso che possa questa volta'), X("I don't think she could this time", 'non penso che potrebbe questa volta')),
  E('S0318L01B03', 'S0318L01', 'think + could: possa → potrebbe', X('I think she could this time', 'penso che possa questa volta'), X('I think she could this time', 'penso che potrebbe questa volta')),
  E('S0318L01U01', 'S0318L01', 'think + could: possa → potrebbe', X("I don't think she could bring her brother this time", 'non penso che possa portare suo fratello questa volta'), X("I don't think she could bring her brother this time", 'non penso che potrebbe portare suo fratello questa volta')),
  E('S0318L01U02', 'S0318L01', 'think + could: possa → potrebbe', X('I think she could use the other room this time', "penso che possa usare l'altra stanza questa volta"), X('I think she could use the other room this time', "penso che potrebbe usare l'altra stanza questa volta")),
  E('S0318L01U03', 'S0318L01', 'think + could: possa → potrebbe', X("I don't think she could work from home this time", 'non penso che possa lavorare da casa questa volta'), X("I don't think she could work from home this time", 'non penso che potrebbe lavorare da casa questa volta')),
  E('S0318L01U06', 'S0318L01', 'think + could: possa → potrebbe', X("I don't think she could watch all five games this time", 'non penso che possa guardare tutte e cinque le partite questa volta'), X("I don't think she could watch all five games this time", 'non penso che potrebbe guardare tutte e cinque le partite questa volta')),
  E('S0322L01U06', 'S0322L01', 'think + could: possa → potrebbe', X('do you think she could buy the same book this year?', "pensi che possa comprare lo stesso libro quest'anno?"), X('do you think she could buy the same book this year?', "pensi che potrebbe comprare lo stesso libro quest'anno?")),
  E('S0324L01U04', 'S0324L01', 'think + could: possa → potrebbe', X('I think that student could move to a different country', 'penso che quella studentessa possa trasferirsi in un paese diverso'), X('I think that student could move to a different country', 'penso che quella studentessa potrebbe trasferirsi in un paese diverso')),
  E('S0434L01B02', 'S0434L01', 'think + could: possa → potrebbe', X('I think they could reduce', 'penso che possano ridurre'), X('I think they could reduce', 'penso che potrebbero ridurre')),
];
/**
 * HELD for Kai — the rule says poteva, but poteva is first taught at S0313L01, one seed LATER. Seed 312 has no LEGO
 * that could carry it ("the other room" only). Options on the review page; nothing written.
 */
const HELD = [
  { id: 'S0312', known: 'she said that she could use the other room tomorrow night', target: "ha detto che potrebbe usare l'altra stanza domani sera" },
  { id: 'S0312L01B03', known: 'she said she could use the other room', target: "ha detto che potrebbe usare l'altra stanza" },
  { id: 'S0312L01U02', known: 'she said she could use the other room tomorrow night', target: "ha detto che potrebbe usare l'altra stanza domani sera" },
  { id: 'S0312L01U07', known: 'she said that she could use the other room tomorrow night', target: "ha detto che potrebbe usare l'altra stanza domani sera" },
];
const HELD_IDS = new Set(HELD.map((h) => h.id));
/** S0313L01's component rows (never played; the tiles), added. */
const COMPONENT_ADDS = LEGO.to.components.map((c, i) => ({ id: `S0313L01C0${i + 1}`, known: c.known, target: c.target }));
const SEEDS_TO_UNAPPROVE = [...new Set([...EDITS.map((e) => seedOf(e.id.replace('SEED:', 'S0'))), LEGO.seed])].sort((a, b) => a - b);

/** For Kai: the proposal's eleven defects and the rows met on the way that this rule does not settle. Nothing written. */
const FOR_KAI = [
  ['S0434L01B03 / U04', '"she / I asked if they could reduce → se potrebbero ridurre"', 'under the rule this is se potevano (or se potessero), but the rows sit under S0434L01 "could they cut | potrebbero ridurre" and would stop containing it — needs a re-home (and neither contains "could they cut" today)'],
  ['S0315L02U01 / U05', '"I think that he couldn\'t come today / tomorrow → non potesse venire oggi/domani"', 'potesse is past; the rule would say non potrebbe, but the rows must keep their LEGO (non potesse) — re-word the English (yesterday) or re-home'],
  ['S0412L01U01', '"we couldn\'t eat tonight → non potevamo mangiare stasera"', 'past tense with "tonight"; the row lives under "we couldn\'t | non potevamo", so the English wants a past time word (last night)'],
  ['S0479L01 vs L02', '"the least she could do → che poteva fare" vs "the least I could do → che potessi fare"', 'one construction, two moods — not the could rule'],
  ['S0116L03B04', '"I could make it → potrei fare"', '"it" missing (farlo); B01 and B02 are identical rows'],
  ['S0116L02U06', '"…the best choice we could make → penso che questa sia la scelta migliore"', '"we could make" not translated'],
  ['S0313L02U03', '"I find it hard to watch all five games in one day → non riuscivo a guardare…"', 'present English, "I couldn\'t" Italian — riuscire, left for #885·I'],
  ['S0332L03U05', '"she couldn\'t believe she could build a new life… → non riusciva a credere ai fatti di costruire…"', 'garbled Italian — riuscire, left for #885·I'],
  ['S0347L01U02', '"someone who could know what was happening → qualcuno che sapesse…"', '"could" not translated'],
  ['S0352L01U05', '"I\'m sure she could do it even if she wanted to"', 'the English makes no sense'],
  ['S0310L02U05', '"I don\'t think he wants to speak about that man → parlare di quell\'uomo"', 'does not contain its LEGO su quell\'uomo'],
  ['S0413L04B03 / U02', '"we could fall if too close to the edge → potremmo cadere troppo vicino al bordo"', 'English lacks "we go", Italian lacks "se" (U02 took poteva here)'],
  ['S0413L02U01 / S0413L03U01', '"we could fall here → potremmo cadere adesso", "if we go here → se andiamo adesso"', 'here ≠ adesso'],
  ['S0318L01U04', '"I think she could write a better story this time… → …scrivere una storia questa volta…"', '"better" missing'],
  ['S0358L02U05', '"I don\'t think she was able to reach the top → non penso che lei possa raggiungere la cima"', 'present subjunctive for "was able to" — not "could", so left'],
  ['S0358L01U04', '"I\'m sure she couldn\'t reach it → sono sicuro che non poteva raggiungere"', '"it" missing (raggiungerlo)'],
  ['S0497L03U03 vs S0272L01U05', '"it seems that it could be… → sembra che possa" vs "sembra che potrebbe"', 'seems + could has two forms; Kai\'s ruling names think/sure only'],
];

// ── Plan application (tested, no DB) ───────────────────────────────────────────────────────
function applyPlanToRows(rows) {
  const ed = Object.fromEntries(EDITS.map((e) => [e.id.replace('SEED:', 'S0'), e.after]));
  const out = rows.map((r) => {
    if (r.kind === 'lego' && r.id === LEGO.id) return { ...r, known: LEGO.to.known, target: LEGO.to.target, components: LEGO.to.components };
    return ed[r.id] ? { ...r, ...ed[r.id] } : r;
  });
  for (const c of COMPONENT_ADDS) out.push({ kind: 'component', sn: 313, id: c.id, known: c.known, target: c.target });
  return out;
}

// ── DB ─────────────────────────────────────────────────────────────────────────────────────
async function loadRows(pg) {
  const { rows } = await pg.query(
    `SELECT 'lego' AS kind, seed_number AS sn, lego_id AS id, known_text AS known, target_text AS target, components, is_new, type FROM course_legos WHERE course_code=$1
     UNION ALL SELECT phrase_role, seed_number, id, known_text, target_text, NULL, NULL, NULL FROM course_practice_phrases WHERE course_code=$1
     UNION ALL SELECT 'seed', seed_number, seed_id, known_text, target_text, NULL, NULL, NULL FROM course_seeds WHERE course_code=$1 ORDER BY 2, 3`, [COURSE]);
  return rows.map((r) => ({ ...r, sn: Number(r.sn), id: short(r.id) }));
}
function planProblems(rows) {
  const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
  const probs = [];
  const l = byId[LEGO.id];
  if (!l || l.known !== LEGO.from.known || l.target !== LEGO.from.target || l.type !== LEGO.from.type) probs.push(`${LEGO.id} live differs from the plan's before`);
  for (const e of EDITS) {
    const r = byId[e.id.replace('SEED:', 'S0')];
    if (!r || r.known !== e.before.known || r.target !== e.before.target) probs.push(`${e.id}: live row differs from the plan's before (${r ? `"${r.known}" | "${r.target}"` : 'missing'})`);
    if (e.lego) {
      const lg = e.lego === LEGO.id ? LEGO.to : byId[e.lego];
      // a row that did not contain its LEGO before (S0331L02U02 "to provide" etc., pre-existing) must not get worse
      const had = !!lg && containsWords(e.before.known, lg.known) && containsWords(e.before.target, lg.target);
      const has = !!lg && containsWords(e.after.known, lg.known) && containsWords(e.after.target, lg.target);
      if (!has && (had || e.lego === LEGO.id)) probs.push(`${e.id} would not contain ${e.lego}`);
    }
  }
  for (const c of COMPONENT_ADDS) if (byId[c.id]) probs.push(`${c.id} already exists`);
  return probs;
}
/** A word is taught at seed N if any row at or before N carries it. */
async function untaught(pg, seed, text, side) {
  const col = side === 'known' ? 'known_text' : 'target_text';
  const out = [];
  for (const w of new Set(words(text))) {
    const { rows } = await pg.query(
      `SELECT 1 FROM (SELECT seed_number, ${col} AS t FROM course_practice_phrases WHERE course_code=$1 UNION ALL SELECT seed_number, ${col} FROM course_legos WHERE course_code=$1 UNION ALL SELECT seed_number, ${col} FROM course_seeds WHERE course_code=$1) x
       WHERE seed_number <= $2 AND ' '||regexp_replace(lower(replace(t,'’','''')), '[.,!?;:"]', ' ', 'g')||' ' LIKE '% '||$3||' %' LIMIT 1`, [COURSE, seed, w]);
    if (!rows.length) out.push(`${side === 'known' ? 'en' : 'it'}:${w}`);
  }
  return out;
}
async function vocabularyGuards(pg) {
  const probs = [];
  for (const e of EDITS) {
    const s = seedOf(e.id.replace('SEED:', 'S0'));
    const u = [...await untaught(pg, s, e.after.known, 'known'), ...await untaught(pg, s, e.after.target, 'target')];
    if (u.length) probs.push(`${e.id} at seed ${s} uses untaught words: ${u.join(', ')}`);
  }
  return probs;
}
/** ZUT against the live course for every pair written: one English → two Italians is a HOLD. */
async function zutAgainstCourse(pg) {
  const pairs = [...EDITS.map((e) => ({ id: e.id, ...e.after })), { id: LEGO.id, ...LEGO.to }];
  const ours = new Set([...EDITS.map((e) => e.id.replace('SEED:', 'S0')), LEGO.id]);
  const after = Object.fromEntries(pairs.map((p) => [p.id.replace('SEED:', 'S0'), p]));
  const clashes = [];
  for (const p of pairs) {
    const { rows } = await pg.query(
      `SELECT id, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND phrase_role<>'component' AND lower(trim(known_text))=lower($2)
       UNION ALL SELECT lego_id, known_text, target_text FROM course_legos WHERE course_code=$1 AND lower(trim(known_text))=lower($2)
       UNION ALL SELECT seed_id, known_text, target_text FROM course_seeds WHERE course_code=$1 AND lower(trim(known_text))=lower($2)`, [COURSE, p.known]);
    for (const r of rows) {
      const id = short(r.id);
      const tgt = ours.has(id) ? after[id].target : r.target_text;
      if (id !== p.id.replace('SEED:', 'S0') && norm(tgt) !== norm(p.target)) clashes.push(`${p.id} "${p.known}" → "${p.target}" vs ${id} → "${tgt}"`);
    }
  }
  return [...new Set(clashes)];
}

// ── Audio: the ONE route, BEFORE any text moves ───────────────────────────────────────────
async function render(body) {
  const base = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
  const res = await fetch(`${base}/api/audio/render`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': `${SWEEP} (job 886-I)` }, body: JSON.stringify(body) });
  const out = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }));
  return { status: res.status, ...out };
}
/** Every clip the new state needs: a changed side gets a new clip; an unchanged side keeps its own. */
function neededClips() {
  const out = [];
  const add = (rowId, table, slot, text) => out.push({ rowId, table, slot, text, speak: slot === 'target1' ? femaleReading(text) : text });
  for (const e of EDITS) {
    const table = e.id.startsWith('SEED:') ? 'course_seeds' : 'course_practice_phrases';
    const rowId = e.id.startsWith('SEED:') ? `S0${e.id.slice(5)}` : e.id;
    if (norm(e.before.known) !== norm(e.after.known)) add(rowId, table, 'known', e.after.known);
    if (norm(e.before.target) !== norm(e.after.target)) { add(rowId, table, 'target1', e.after.target); add(rowId, table, 'target2', e.after.target); }
  }
  for (const s of ['known', 'target1', 'target2']) add(LEGO.id, 'course_legos', s, s === 'known' ? LEGO.to.known : LEGO.to.target);
  out.push({ rowId: LEGO.id, table: 'course_legos', slot: 'presentation', text: LEGO.intro, speak: LEGO.intro });
  for (const c of COMPONENT_ADDS) for (const s of ['known', 'target1', 'target2']) add(c.id, 'course_practice_phrases', s, s === 'known' ? c.known : c.target);
  return out;
}
async function makeClips(pg, log, { dryOnly }) {
  const need = neededClips();
  const keyOf = (n) => `${n.slot}\u0000${n.speak}`;
  const jobs = [...new Map(need.map((n) => [keyOf(n), n])).values()];
  log.audio = [];
  for (const n of jobs) {
    const body = { courseCode: COURSE, role: n.slot, text: n.speak, voiceId: VOICES[n.slot], voiceBound: true, purpose: `Kai 2026-09-29 could rule (${n.rowId})`, ...(n.slot === 'presentation' ? { legoId: LEGO.id } : {}) };
    const dry = await render({ ...body, dryRun: true });
    const entry = { role: n.slot, text: n.speak, dry: { status: dry.status, source: dry.source, code: dry.code, wouldSpendChars: dry.wouldSpendChars, error: dry.error } };
    log.audio.push(entry);
    if (!dry.ok) { entry.result = `REFUSED on dry run: ${dry.code || dry.status} ${dry.error || ''}`; continue; }
    if (dryOnly) { entry.result = 'dry'; continue; }
    const real = await render(body);
    entry.real = { status: real.status, source: real.source, code: real.code, audioId: real.audioId, charsSpent: real.charsSpent, error: real.error };
    if (!real.ok || !real.audioId) { entry.result = `REFUSED: ${real.code || real.status} ${real.error || ''}`; continue; }
    if (real.source === 'rendered' && !real.charsSpent) { entry.result = "NOT USED — 'rendered' with 0 chars spent"; continue; }
    const { rows: [clip] } = await pg.query('SELECT id, voice_id, text, duration_ms, s3_key FROM course_audio WHERE id=$1', [real.audioId]);
    entry.clip = clip;
    if (!clip || !voiceOk(VOICES[n.slot], clip.voice_id)) { entry.result = `NOT USED — ${clip?.voice_id} clip for ${n.slot}`; continue; }
    if (norm(clip.text) !== norm(n.speak)) { entry.result = `NOT USED — clip text "${clip.text}"`; continue; }
    if (!clip.duration_ms || clip.duration_ms < 200) { entry.result = `NOT USED — duration ${clip.duration_ms}`; continue; }
    entry.result = real.source;
  }
  const good = new Map(log.audio.filter((a) => a.clip && ['library', 'rendered'].includes(a.result)).map((a) => [`${a.role}\u0000${a.text}`, a.clip.id]));
  const missing = need.filter((n) => !good.get(keyOf(n)));
  return { need, clipFor: (n) => good.get(keyOf(n)), missing };
}

// ── Content: one transaction, text and links together ─────────────────────────────────────
async function applyContent(pg, supabase, clips, log) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const ev = (op, scope, detail) => recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: op, scope, detail });
  const slotOf = (rowId, slot) => { const n = clips.need.find((x) => x.rowId === rowId && x.slot === slot); return n ? clips.clipFor(n) : undefined; };
  log.approvedBefore = Object.fromEntries((await pg.query('SELECT seed_number, approved_at FROM course_seeds WHERE course_code=$1 AND seed_number = ANY($2)', [COURSE, SEEDS_TO_UNAPPROVE])).rows.map((r) => [r.seed_number, r.approved_at]));
  const phraseEdits = EDITS.filter((e) => !e.id.startsWith('SEED:'));
  const seedEdits = EDITS.filter((e) => e.id.startsWith('SEED:'));
  const Ev = {};
  Ev.lego = await ev('lego-edit', { seed_numbers: [LEGO.seed], lego_ids: [LEGO.id], rows: 1 }, { ruling: RULING, job: JOB, changes: [{ id: LEGO.id, from: LEGO.from, to: LEGO.to, why: 'grown on both sides to carry its frame (L25): positive "he could" had no right answer' }] });
  if (seedEdits.length) Ev.seed = await ev('seed-edit', { seed_numbers: seedEdits.map((e) => Number(e.id.slice(5))), rows: seedEdits.length }, { ruling: RULING, job: JOB, changes: seedEdits.map((e) => ({ seed: Number(e.id.slice(5)), from: e.before, to: e.after, why: e.why })) });
  Ev.phrase = await ev('phrase-edit', { seed_numbers: [...new Set(phraseEdits.map((e) => seedOf(e.id)))], phrase_ids: phraseEdits.map((e) => full(e.id)), rows: phraseEdits.length }, { ruling: RULING, job: JOB, changes: phraseEdits.map((e) => ({ id: full(e.id), group: e.group, from: e.before, to: e.after, why: e.why || e.group })) });
  Ev.add = await ev('phrase-add', { seed_numbers: [LEGO.seed], phrase_ids: COMPONENT_ADDS.map((c) => full(c.id)), rows: COMPONENT_ADDS.length }, { ruling: RULING, job: JOB, rows: COMPONENT_ADDS.map((c) => ({ id: full(c.id), lego: LEGO.id, known: c.known, target: c.target, role: 'component' })) });
  Ev.unapprove = await ev('unapprove', { seed_numbers: SEEDS_TO_UNAPPROVE, rows: SEEDS_TO_UNAPPROVE.length }, { why: 'seeds whose LEGO, seed text or phrases this job edited — edited rows arrive unchecked', job: JOB, approved_at_before: log.approvedBefore });
  log.events = Ev;
  const legoTargets = {};
  for (const id of [...new Set(phraseEdits.map((e) => e.lego))]) legoTargets[id] = id === LEGO.id ? LEGO.to.target : (await pg.query('SELECT target_text FROM course_legos WHERE course_code=$1 AND lego_id=$2', [COURSE, id])).rows[0].target_text;
  // set a slot only when this job made a clip for it; otherwise leave the column as it is (unchanged side keeps its clip)
  const setSlots = (rowId, startAt) => {
    const sets = [], vals = [];
    for (const s of ['known', 'target1', 'target2', 'presentation']) { const id = slotOf(rowId, s); if (id) { sets.push(`${s}_audio_id=$${startAt + vals.length}`); vals.push(id); } }
    return { sql: sets.length ? ', ' + sets.join(', ') : '', vals };
  };
  await pg.query('BEGIN');
  try {
    const ls = setSlots(LEGO.id, 8);
    const u = await pg.query(`UPDATE course_legos SET known_text=$1, target_text=$2, components=$3, type=$4, last_edit_event_id=$5, updated_at=now()${ls.sql}
      WHERE course_code=$6 AND lego_id=$7 AND known_text='he could' AND target_text='poteva'`, [LEGO.to.known, LEGO.to.target, JSON.stringify(LEGO.to.components), LEGO.to.type, Ev.lego, COURSE, LEGO.id, ...ls.vals]);
    if (u.rowCount !== 1) throw new Error(`${LEGO.id}: ${u.rowCount} rows`);
    const intro = slotOf(LEGO.id, 'presentation');
    const li = await pg.query('UPDATE lego_introductions SET presentation_audio_id=$1, audio_uuid=$1, updated_at=now() WHERE course_code=$2 AND lego_id=$3', [intro, COURSE, LEGO.id]);
    if (!li.rowCount) await pg.query('INSERT INTO lego_introductions (course_code, lego_id, audio_uuid, presentation_audio_id) VALUES ($1,$2,$3,$3)', [COURSE, LEGO.id, intro]);
    await pg.query('UPDATE course_audio SET lego_id=NULL WHERE course_code=$1 AND lego_id=$2 AND id<>$3', [COURSE, LEGO.id, intro]); // the old intro clip is kept, no longer keyed
    await pg.query('UPDATE course_audio SET lego_id=$1 WHERE id=$2', [LEGO.id, intro]);
    for (const e of phraseEdits) {
      const s = setSlots(e.id, 11);
      const r = await pg.query(`UPDATE course_practice_phrases SET known_text=$1, target_text=$2, word_count=$3, lego_count=$4, qa_checked=NULL, decomposition=NULL, decomposition_course_version=NULL, display_tiling=NULL, display_tiling_version=NULL,
          lego_position=$5, last_edit_event_id=$6, updated_at=now()${s.sql} WHERE course_code=$7 AND id=$8 AND known_text=$9 AND target_text=$10`,
        [e.after.known, e.after.target, e.after.target.length, e.after.target.split(/\s+/).length, legoPosition(e.after.target, legoTargets[e.lego]), Ev.phrase, COURSE, full(e.id), e.before.known, e.before.target, ...s.vals]);
      if (r.rowCount !== 1) throw new Error(`${e.id}: ${r.rowCount} rows`);
      // trg_null_phrase_audio_on_text_change (unlike the LEGO and seed triggers) does NOT respect a link set in the same
      // UPDATE: it re-resolves by same-voice text, so a female-reading Elsa clip ("sono sicura…") is dropped to NULL
      // (seen 2026-09-29 on S0358L02U03 / S0359L01U03 / S0359L02U03). Re-set our clips once the text has settled.
      for (const sl of ['known', 'target1', 'target2']) {
        const id = slotOf(e.id, sl); if (!id) continue;
        await pg.query(`UPDATE course_practice_phrases SET ${sl}_audio_id=$1 WHERE course_code=$2 AND id=$3 AND ${sl}_audio_id IS DISTINCT FROM $1`, [id, COURSE, full(e.id)]);
      }
    }
    for (const e of seedEdits) {
      const n = Number(e.id.slice(5));
      const s = setSlots(`S0${n}`, 7);
      const r = await pg.query(`UPDATE course_seeds SET known_text=$1, target_text=$2, last_edit_event_id=$3, updated_at=now()${s.sql} WHERE course_code=$4 AND seed_number=$5 AND target_text=$6`,
        [e.after.known, e.after.target, Ev.seed, COURSE, n, e.before.target, ...s.vals]);
      if (r.rowCount !== 1) throw new Error(`seed ${n}: ${r.rowCount} rows`);
    }
    const { rows: [m] } = await pg.query('SELECT coalesce(max(position),0) AS m FROM course_practice_phrases WHERE course_code=$1 AND seed_number=$2', [COURSE, LEGO.seed]);
    let pos = Number(m.m);
    for (const c of COMPONENT_ADDS) {
      const ins = await pg.query(`INSERT INTO course_practice_phrases (id, course_code, seed_number, lego_index, position, known_text, target_text, word_count, lego_count, metadata, status, phrase_role, connected_lego_ids, lego_position, lego_id, introduce, last_edit_event_id, known_audio_id, target1_audio_id, target2_audio_id)
        VALUES ($1,$2,$3,1,$4,$5,$6,$7,$8,$9,'draft','component','{}',NULL,$10,false,$11,$12,$13,$14)`,
        [full(c.id), COURSE, LEGO.seed, ++pos, c.known, c.target, c.target.length, c.target.split(/\s+/).length, JSON.stringify({ format: 'build_use', source: SWEEP, job: JOB }), LEGO.id, Ev.add, slotOf(c.id, 'known'), slotOf(c.id, 'target1'), slotOf(c.id, 'target2')]);
      if (ins.rowCount !== 1) throw new Error(`${c.id}: insert ${ins.rowCount}`);
    }
    const un = await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number = ANY($3) AND approved_at IS NOT NULL', [Ev.unapprove, COURSE, SEEDS_TO_UNAPPROVE]);
    log.unapproved = { seeds: SEEDS_TO_UNAPPROVE, rowsThatWereApproved: un.rowCount };
    // female readings: the render key for target1 is expanded_f of the exact text; write it where it differs (never overwrite)
    log.genderRows = [];
    for (const t of [...new Set([...EDITS.map((e) => e.after.target), LEGO.to.target])]) {
      if (femaleReading(t) === t) continue;
      const { rows: ex } = await pg.query("SELECT 1 FROM course_gender_expansions WHERE course_code=$1 AND text_side='target' AND original_text=$2", [COURSE, t]);
      if (ex.length) continue;
      await pg.query("INSERT INTO course_gender_expansions (course_code, original_text, language, expanded_f, expanded_m, text_side, processed_at) VALUES ($1,$2,'ita',$3,$2,'target',now())", [COURSE, t, femaleReading(t)]);
      log.genderRows.push(t);
    }
    const { rows: [cnt] } = await pg.query('SELECT count(*)::int AS n FROM course_legos WHERE course_code=$1 AND seed_number=$2', [COURSE, LEGO.seed]);
    if (cnt.n !== 2) throw new Error(`LEGO count in ${LEGO.seed} is ${cnt.n}, expected 2 — never delete a LEGO`);
    const probs = endStateProblems(await loadRows(pg));
    if (probs.length) throw new Error('end state does not hold inside the transaction:\n  ' + probs.join('\n  '));
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  await require('../../services/shared/round-index-refresh.cjs').refreshNow();
  const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs');
  log.audioPass = await queueAudioPass(supabase, { courseCode: COURSE, requestedBy: `@${SWEEP}`, reason: `job ${JOB}: could rule — S0313L01 grown, ${EDITS.length} rows re-texted, ${COMPONENT_ADDS.length} components added; every slot filled make-before-break through /api/audio/render`, metadata: { job: JOB, seeds: SEEDS_TO_UNAPPROVE } });
}

/** Verify on the live course: every row this job wrote has all slots, right voices, clip text = row text (target1 = female reading). */
async function verifyAudio(pg) {
  const ids = [...EDITS.filter((e) => !e.id.startsWith('SEED:')).map((e) => full(e.id)), ...COMPONENT_ADDS.map((c) => full(c.id))];
  const { rows } = await pg.query(`SELECT x.id, x.known_text, x.target_text, ak.voice_id kv, ak.text kx, a1.voice_id v1, a1.text x1, a2.voice_id v2, a2.text x2, x.target1_audio_id t1, x.target2_audio_id t2
    FROM (SELECT id, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2)
          UNION ALL SELECT lego_id, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id FROM course_legos WHERE course_code=$1 AND lego_id=$3
         ) x
    LEFT JOIN course_audio ak ON ak.id=x.known_audio_id LEFT JOIN course_audio a1 ON a1.id=x.target1_audio_id LEFT JOIN course_audio a2 ON a2.id=x.target2_audio_id ORDER BY 1`, [COURSE, ids, LEGO.id]);
  const probs = [];
  for (const r of rows) {
    const id = short(r.id);
    if (!r.kx || !r.x1 || !r.x2) probs.push(`${id}: NULL slot`);
    if (r.t1 && r.t1 === r.t2) probs.push(`${id}: target1 = target2`);
    if (r.kx && norm(r.kx) !== norm(r.known_text)) probs.push(`${id}: known clip says "${r.kx}"`);
    if (r.x1 && norm(r.x1) !== norm(femaleReading(r.target_text)) && norm(r.x1) !== norm(r.target_text)) probs.push(`${id}: target1 clip says "${r.x1}"`);
    if (r.x2 && norm(r.x2) !== norm(r.target_text)) probs.push(`${id}: target2 clip says "${r.x2}"`);
    if (r.x1 && !/Elsa|xai_|elevenlabs/.test(r.v1 || '')) probs.push(`${id}: target1 voice ${r.v1}`);
    if (r.x2 && !/Benigno|xai_|elevenlabs/.test(r.v2 || '')) probs.push(`${id}: target2 voice ${r.v2}`);
  }
  const { rows: [p] } = await pg.query(`SELECT a.text FROM course_legos l LEFT JOIN course_audio a ON a.id::text=l.presentation_audio_id::text WHERE l.course_code=$1 AND l.lego_id=$2`, [COURSE, LEGO.id]);
  if (!p?.text) probs.push(`${LEGO.id}: intro SILENT`); else if (p.text !== LEGO.intro) probs.push(`${LEGO.id}: intro clip says "${p.text}"`);
  return { rows: rows.length, probs };
}

async function main() {
  const { Client } = require('pg');
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const log = { sweep: SWEEP, job: JOB, ruling: RULING, started: new Date().toISOString() };
  const save = (tag) => { const f = evidencePath(`tools/course-optimization/${SWEEP}/${tag}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`); fs.writeFileSync(f, JSON.stringify(log, null, 2)); console.log(`Wrote ${f}`); };
  try {
    if (process.env.CHECK === '1') {
      const probs = endStateProblems(await loadRows(pg));
      const a = await verifyAudio(pg);
      console.log(probs.length ? 'END STATE PROBLEMS:\n  ' + probs.join('\n  ') : 'end state holds on the live course');
      console.log(a.probs.length ? 'AUDIO PROBLEMS:\n  ' + a.probs.join('\n  ') : `audio: ${a.rows} rows, every slot filled, right voice, right words; intro mirrors`);
      process.exitCode = probs.length || a.probs.length ? 2 : 0; return;
    }
    const APPLY = process.env.APPLY === '1';
    const rows = await loadRows(pg);
    const before = endStateProblems(rows);
    const probs = [...planProblems(rows), ...(await vocabularyGuards(pg))];
    const zut = await zutAgainstCourse(pg); probs.push(...zut.map((z) => `ZUT: ${z}`));
    const after = endStateProblems(applyPlanToRows(rows));
    probs.push(...after.map((p) => `after-plan: ${p}`));
    log.before = before; log.problems = probs;
    console.log(`\n══ ${COURSE} — could rule — ${APPLY ? 'APPLY' : 'DRY RUN'} ══\n${EDITS.length} rows + LEGO ${LEGO.id} + ${COMPONENT_ADDS.length} components; seeds ${SEEDS_TO_UNAPPROVE.join(', ')}`);
    console.log(`rule violations on the live course now: ${before.length}`);
    console.log(probs.length ? '\nPROBLEMS:\n  ' + probs.join('\n  ') : '\nguards hold: live text = plan, every row contains its LEGO, no untaught word, no ZUT clash, end state holds on the planned rows');
    if (probs.length) { process.exitCode = 2; save('dryrun'); return; }
    if (process.env.RENDER_DRY === '1' || APPLY) {
      const clips = await makeClips(pg, log, { dryOnly: !APPLY });
      const chars = log.audio.reduce((s, a) => s + (a.dry.wouldSpendChars || 0), 0);
      for (const a of log.audio) console.log(`  ${a.role.padEnd(12)} ${String(a.dry.source || a.dry.code).padEnd(12)} ${a.result.padEnd(10)} "${a.text}"${a.clip ? ` [${a.clip.voice_id} ${a.clip.duration_ms}ms]` : ''}`);
      console.log(`${log.audio.length} distinct clips; would spend ${chars} chars on the dry run`);
      if (APPLY) {
        if (clips.missing.length) {
          log.held = clips.missing.map((n) => `${n.rowId}.${n.slot}`);
          console.log(`HELD — ${clips.missing.length} slots have no verified clip, NOTHING written (make-before-break):\n  ${log.held.join('\n  ')}`);
          process.exitCode = 2; save('held'); return;
        }
        const { createClient } = require('@supabase/supabase-js');
        await applyContent(pg, createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } }), clips, log);
        console.log(`APPLIED. events=${JSON.stringify(log.events)} unapproved=${JSON.stringify(log.unapproved)} genderRows=${log.genderRows.length}`);
        const v = await verifyAudio(pg); log.verify = v.probs;
        console.log(v.probs.length ? 'AUDIO PROBLEMS:\n  ' + v.probs.join('\n  ') : `audio verified on ${v.rows} rows`);
      }
    }
    save(APPLY ? 'applied' : 'dryrun');
  } finally { await pg.end(); }
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { endStateProblems, applyPlanToRows, planProblems, femaleReading, isThinkCould, isSaidCould, neededClips, LEGO, EDITS, COMPONENT_ADDS, SEEDS_TO_UNAPPROVE, FOR_KAI, HELD };
