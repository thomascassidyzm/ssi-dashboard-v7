#!/usr/bin/env node
'use strict';
// tools/course-optimization/swe-native-flags-web-evidence-2026-09-28.cjs
//
// swe_for_eng — the flags job #610·I left "for a native reader", settled from real usage online
// (Kai, 2026-09-28, job #620·I: no native Swedish reader is available; try anyway and label confidence).
//
// EVIDENCE (Språkbanken Korp, 12 corpora ≈ blogs, Familjeliv, Flashback, GP 2012–13, novels, 8 Sidor;
// counts are sentence-internal word sequences, queried 2026-09-28; plus SO/Wiktionary and teaching sources):
//   (a) "this weekend" = i helgen — "i helgen" 20,507 vs "på helgen" 3,431 (habitual); The Local / SO: i helgen = this/at the
//       weekend, past or future. #610's change CONFIRMED, nothing to revert.                                     [high]
//   (b) "träffas med dig/mig" is not Swedish — "träffa dig" 1,264 / "träffa mig" 1,039 vs "träffas med dig" 1 /
//       "träffas med mig" 1. träffas is reciprocal and takes no object (Wiktionary: "kan bara användas om flera
//       personer än en"; SFI med Helena: object → träffa, no object → träffas; elon.io: "träffa med dig" wrong).
//       Five phrases take träffa + object; the two under the reciprocal LEGO S0293L02 become genuinely mutual
//       ("var vi ska träffas" — "vi ska träffas" 318). "träffas med alla andra" (3 rows, seeds 18/19) is the
//       colloquial group use ("träffas med" 167) and is left as a recommendation, not changed.               [high]
//   (c) "know how to" — seed-level, RECOMMEND only, seeds 59/60 untouched. "vet hur man" 11,540 is fine Swedish
//       for a procedure ("vet inte hur man säger" 15, "vet hur man säger" 32); a SKILL takes kan ("kan svenska" 2,265,
//       "kan prata svenska" 296 vs "vet hur man pratar svenska" 9; The Local: veta = know in theory, kunna = the skill).
//       The one phrase that names a skill under LEGO vet, S0059L01U01 "I know how to speak Swedish", becomes
//       "I know how to say it → jag vet hur man säger det" (a procedure; säger taught at seed 4).             [high]
//   (d) vet + definite noun — "vet svaret" 1,188 / "vet sanningen" 492 are normal; "vet frågan" 7, "vet idén" 0,
//       "vet arrangemangen" 0, "vet problemet" 14 vs "vet om problemet" 46 + "känner till problemet" 42. SO/Wiktionary
//       list "veta om" = know about. känner till is not taught by seed 300, om is (seed 10). So: problem → vet om
//       (know about); question → vet svaret på frågan ("svaret på frågan" 1,304, "vet svaret på frågan" 41);
//       idea → vad tycker du om idén ("vad tycker du om" 1,379); the latest → är det den senaste (16);
//       arrangements → kan du hjälpa mig med arrangemangen ("hjälpa mig med" 4,749).           [high; problem rows medium-high]
//   (e) S0070L02U02 "vet du var svaret är?" heard as "vad": colloquial Swedish drops final -d in vad and -r in var, so
//       both are [vɑː] (WordReference native thread). The checker cannot tell them apart, so its "vad" is not evidence
//       of a bad take. NOT a proven defect; nothing changed, nothing re-rendered.                          [medium]
//   (f) S0227L01U03 "hon vet den" — "hon vet det" 153 vs "hon vet den" 3; den is the LEGO, so the phrase takes a
//       person: "she knows that man → hon känner den mannen" (känner seed 85, mannen seed 226).            [high]
//       S0066L02U04 "hitta svaret sig själv" — "svaret själv" 336 / "hitta svaret själv" 13 vs "svaret sig själv" 0;
//       emphatic "yourself" is bare själv (Wikipedia/Språknämnden: sig själv is the reflexive object).     [high]
//
// Every changed row keeps its LEGO on the side written, adds no word untaught at its seed, collides with no ZUT pair,
// and has its seed unapproved. Swedish clips re-render on Sofie/Mattias under temporary cast rows exactly as #610·I
// did (rows removed in a finally block, cast asserted byte-identical); English on Charlotte. Only changed clips render.
//
//   node tools/course-optimization/swe-native-flags-web-evidence-2026-09-28.cjs            # dry run: guards + plan
//   APPLY=1 node tools/course-optimization/swe-native-flags-web-evidence-2026-09-28.cjs    # write + render + link
//   AUDIO_ONLY=1 APPLY=1 node …                                                            # re-run the audio fill only

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'swe_for_eng';
const SWEEP = 'swe-native-flags-web-evidence-2026-09-28';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const JOB = '#620·I';
const RULING = 'Kai, 2026-09-28 (job #620·I): #610·I native-reader flags settled from corpus evidence (Korp) — träffa + object never träffas med; vet om / svaret på frågan for vet + definite noun; bare själv for emphatic yourself; hon vet den → hon känner den mannen; i helgen confirmed';
const SOFIE = { voiceId: 'azure_sv-SE-SofieNeural', castVoiceId: 'sv-SE-SofieNeural', voiceName: 'sv-SE-SofieNeural', gender: 'f' };
const MATTIAS = { voiceId: 'azure_sv-SE-MattiasNeural', castVoiceId: 'sv-SE-MattiasNeural', voiceName: 'sv-SE-MattiasNeural', gender: 'm' };
const SWE_VOICE_IDS = { target1: ['azure_sv-SE-SofieNeural', 'sv-SE-SofieNeural'], target2: ['azure_sv-SE-MattiasNeural', 'sv-SE-MattiasNeural'] };
const CHARLOTTE = { voiceId: 'cartesia_71a7ad14-091c-4e8e-a314-022ece01c121', cartesiaId: '71a7ad14-091c-4e8e-a314-022ece01c121', voiceName: 'Charlotte (Cartesia)' };
const CHARLOTTE_IDS = ['cartesia_71a7ad14-091c-4e8e-a314-022ece01c121', '71a7ad14-091c-4e8e-a314-022ece01c121'];
const TEMP_SWE_ROWS = [
  { slot: 'phrase', language: 'swe', gender: 'f', rank: 5, voice_id: SOFIE.castVoiceId },
  { slot: 'phrase', language: 'swe', gender: 'm', rank: 5, voice_id: MATTIAS.castVoiceId },
];

// ── Rules (pure; the test exercises these) ─────────────────────────────────────────────
const norm = (s) => String(s || '').toLowerCase().replace(/’/g, "'").replace(/[.,!?;:"«»]+/g, ' ').replace(/\s+/g, ' ').trim();
const words = (s) => norm(s).split(' ').filter(Boolean);
/** A known-side gloss minus its bracketed note and slash alternatives: "know/feel (present)" → "know". */
const glossCore = (s) => norm(String(s || '').replace(/\([^)]*\)/g, ' ').replace(/\/\S+/g, ''));
/** Every reading of a slash gloss: "latest/most recent" → ["latest", "most recent"]; "know/feel (present)" → ["know", "feel"]. */
const glossAlternatives = (s) => { const base = String(s || '').replace(/\([^)]*\)/g, ' '); const parts = base.split('/').map(norm).filter(Boolean); return parts.length > 1 ? [glossCore(s), ...parts] : [glossCore(s)]; };
const knownContainsGloss = (known, gloss) => glossAlternatives(gloss).some(g => containsWords(known, g, { inflection: true }));
/**
 * The live gate's phrase-contains-LEGO rule: word MULTISET (reordering tolerated). On the KNOWN side an
 * English inflection of the LEGO word is tolerated ("she knows him" under "know"), which is the shape the
 * course already drills (S0230L01B03 "she knows" today); the target side is exact.
 */
const inflected = (h, w) => h === w || (w.length >= 3 && h.startsWith(w) && /^(s|es|ed|ing|n)$/.test(h.slice(w.length)));
function containsWords(hay, needle, { inflection = false } = {}) {
  const h = words(hay);
  for (const w of words(needle)) {
    const i = inflection ? h.findIndex(x => inflected(x, w)) : h.indexOf(w);
    if (i < 0) return false;
    h.splice(i, 1);
  }
  return true;
}


/**
 * Classify one phrase pair under the rulings above. Returns null when the row is fine, else a reason.
 *   traffas-med-object : träffas + med + dig/mig — the reciprocal verb given an object (träffa dig / träffa mig)
 *   vet-definite-noun  : vet + (subject) + a definite noun that is not a fact-noun (svaret, sanningen, namnet, vägen, tiden, priset)
 *   vet-hur-man-skill  : "vet hur man" carrying a language skill (pratar/talar svenska) — a skill is kan
 *   vet-den            : vet + den for English "knows that" (a fact is det)
 *   sig-sjalv-emphatic : infinitive + object + "sig själv" where the English has emphatic "yourself" (bare själv)
 */
const FACT_NOUNS = /^(svaret|sanningen|namnet|vägen|tiden|priset|datumet|adressen|numret|skillnaden|svaren)$/;
const NOT_NOUNS = /^(inte|det|den|de|vad|var|hur|när|vem|varför|om|att|allt|något|någon|inget|ingen|ingenting|mycket|lite|mer|också|redan|ännu|väl|nog|ju|en|ett)$/;
function webEvidenceDefect(known, target) {
  const t = norm(target), k = norm(known);
  if (/\bträffas med (dig|mig|honom|henne|oss|er|dem|människor|folk|någon)\b/.test(t)) return 'traffas-med-object';
  if (/\bvet hur man (pratar|talar) svenska\b/.test(t)) return 'vet-hur-man-skill';
  if (/\bvet den\b/.test(t) && /\bknows? that\b/.test(k) && !/\bthat (man|woman|one)\b/.test(k)) return 'vet-den';
  // emphatic "yourself" after a verb + object ("find the answer yourself") is bare själv; "lära sig själv" / "testa sig själv" (no object between) is the reflexive and stays
  if (/\b(hitta|göra|läsa|skriva|lära) \S+( \S+)? sig själv\b/.test(t) && /\b(yourself|myself|himself|herself|ourselves|themselves)\b/.test(k)) return 'sig-sjalv-emphatic';
  const subj = '(du |jag |hon |han |vi |de |ni |ingen )?';
  // "vet du den senaste?" — a definite adjective standing for its noun
  if (new RegExp(`\\bvet ${subj}(den|det|de) (senaste|sista|första|andra|nya|gamla|rätta|bästa)$`).test(t)) return 'vet-definite-noun';
  const m = t.match(new RegExp(`\\b(vet|visste) ${subj}(om )?([a-zåäöé]+)$`));
  if (m && !m[3] && /(en|et|na|an|erna|arna|orna|én)$/.test(m[4]) && !FACT_NOUNS.test(m[4]) && !NOT_NOUNS.test(m[4])) return 'vet-definite-noun';
  return null;
}

// ── The changes ────────────────────────────────────────────────────────────────────────
/** Phrase rows: before → after. `side` says which text moves (the other is asserted unchanged). `flag` is the #610 flag letter. */
const CHANGES = [
  // ── (b) träffas takes no object: träffa dig / träffa mig; under the reciprocal LEGO the sentence becomes mutual ──
  { flag: 'b', seed: 237, lego: 'S0237L02', id: 'S0237L02U06', side: 'target', conf: 'high', before: { known: "i'll see you this weekend", target: 'jag ska träffas med dig i helgen' }, after: { known: "i'll see you this weekend", target: 'jag ska träffa dig i helgen' } },
  { flag: 'b', seed: 184, lego: 'S0184L01', id: 'S0184L01U04', side: 'target', conf: 'high', before: { known: 'can you meet me at the office?', target: 'kan du träffas med mig på kontoret?' }, after: { known: 'can you meet me at the office?', target: 'kan du träffa mig på kontoret?' } },
  { flag: 'b', seed: 218, lego: 'S0218L03', id: 'S0218L03U05', side: 'target', conf: 'high', before: { known: "i'll meet you on Sunday", target: 'jag ska träffas med dig på söndagen' }, after: { known: "i'll meet you on Sunday", target: 'jag ska träffa dig på söndagen' } },
  { flag: 'b', seed: 293, lego: 'S0293L01', id: 'S0293L01U01', side: 'target', conf: 'high', before: { known: "I have to find out where he's going to meet me", target: 'jag måste ta reda på var han ska träffas med mig' }, after: { known: "I have to find out where he's going to meet me", target: 'jag måste ta reda på var han ska träffa mig' } },
  { flag: 'b', seed: 293, lego: 'S0293L02', id: 'S0293L02U01', side: 'both', conf: 'high', before: { known: "I have to find out where he's going to meet me", target: 'jag måste ta reda på var han ska träffas med mig' }, after: { known: "I have to find out where we're going to meet", target: 'jag måste ta reda på var vi ska träffas' } },
  { flag: 'b', seed: 293, lego: 'S0293L02', id: 'S0293L02U05', side: 'both', conf: 'high', before: { known: 'I want to meet you', target: 'jag vill träffas med dig' }, after: { known: 'I want us to meet', target: 'jag vill att vi träffas' } },
  { flag: 'b', seed: 297, lego: 'S0297L01', id: 'S0297L01U04', side: 'both', conf: 'high', before: { known: 'I want to meet people who speak Swedish', target: 'jag vill träffas med människor som pratar svenska' }, after: { known: 'I want to meet many people who speak Swedish', target: 'jag vill träffa många människor som pratar svenska' } },
  // ── (c) the one skill phrase under LEGO vet: a procedure instead ──
  { flag: 'c', seed: 59, lego: 'S0059L01', id: 'S0059L01U01', side: 'both', conf: 'high', before: { known: 'I know how to speak Swedish', target: 'jag vet hur man pratar svenska' }, after: { known: 'I know how to say it', target: 'jag vet hur man säger det' } },
  // ── (d) vet + definite noun ──
  { flag: 'd', seed: 202, lego: 'S0202L04', id: 'S0202L04U03', side: 'both', conf: 'high', before: { known: 'do you know the question?', target: 'vet du frågan?' }, after: { known: 'do you know the answer to the question?', target: 'vet du svaret på frågan?' } },
  { flag: 'd', seed: 202, lego: 'S0202L04', id: 'S0202L04U05', side: 'both', conf: 'high', before: { known: 'he knows the question', target: 'han vet frågan' }, after: { known: 'he knows the answer to the question', target: 'han vet svaret på frågan' } },
  { flag: 'd', seed: 196, lego: 'S0196L04', id: 'S0196L04U04', side: 'both', conf: 'high', before: { known: 'do you know the idea?', target: 'vet du idén?' }, after: { known: 'what do you think about the idea?', target: 'vad tycker du om idén?' } },
  { flag: 'd', seed: 196, lego: 'S0196L03', id: 'S0196L03U04', side: 'both', conf: 'high', before: { known: 'do you know the latest?', target: 'vet du den senaste?' }, after: { known: 'is that the latest?', target: 'är det den senaste?' } },
  { flag: 'd', seed: 204, lego: 'S0204L01', id: 'S0204L01U05', side: 'both', conf: 'high', before: { known: 'do you know the arrangements?', target: 'vet du arrangemangen?' }, after: { known: 'can you help me with the arrangements?', target: 'kan du hjälpa mig med arrangemangen?' } },
  { flag: 'd', seed: 210, lego: 'S0210L02', id: 'S0210L02U04', side: 'both', conf: 'medium-high', before: { known: 'do you know the problem?', target: 'vet du problemet?' }, after: { known: 'do you know about the problem?', target: 'vet du om problemet?' } },
  { flag: 'd', seed: 210, lego: 'S0210L02', id: 'S0210L02U05', side: 'both', conf: 'medium-high', before: { known: 'we know the problem', target: 'vi vet problemet' }, after: { known: 'we know about the problem', target: 'vi vet om problemet' } },
  { flag: 'd', seed: 210, lego: 'S0210L02', id: 'S0210L02U06', side: 'both', conf: 'medium-high', before: { known: 'nobody knows the problem', target: 'ingen vet problemet' }, after: { known: 'nobody knows about the problem', target: 'ingen vet om problemet' } },
  // ── (f) the two other flags ──
  { flag: 'f', seed: 227, lego: 'S0227L01', id: 'S0227L01U03', side: 'both', conf: 'high', before: { known: 'she knows that', target: 'hon vet den' }, after: { known: 'she knows that man', target: 'hon känner den mannen' } },
  { flag: 'f', seed: 66, lego: 'S0066L02', id: 'S0066L02U04', side: 'target', conf: 'high', before: { known: "it's important to find the answer yourself", target: 'det är viktigt att hitta svaret sig själv' }, after: { known: "it's important to find the answer yourself", target: 'det är viktigt att hitta svaret själv' } },
];
const SEEDS = [...new Set(CHANGES.map(c => c.seed))].sort((a, b) => a - b);
const LEGO_IDS = [...new Set(CHANGES.map(c => c.lego))];

// ── Live ────────────────────────────────────────────────────────────────────────────────
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
async function guardLive(pg, problems) {
  for (const c of CHANGES) {
    const { rows: [r] } = await pg.query('SELECT known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND id=$2', [COURSE, `${COURSE}:${c.id}`]);
    if (!r || r.known_text !== c.before.known || r.target_text !== c.before.target) problems.push(`${c.id} reads "${r?.known_text}" → "${r?.target_text}" (expected "${c.before.known}" → "${c.before.target}")`);
  }
  // Concurrency: another surface editing these seeds or LEGOs in the last 12 hours (the #610·I sweep is expected and allowed).
  const { rows: ev } = await pg.query(`SELECT id, surface, operation FROM content_edit_events WHERE course_code=$1 AND occurred_at > now() - interval '12 hours' AND surface NOT LIKE '%' || $2 || '%' AND surface NOT LIKE '%swe-know-and-learner-fixes-2026-09-28%' AND (scope->'seed_numbers' ?| $3::text[] OR scope->'lego_ids' ?| $4::text[] OR scope->'phrase_ids' ?| $5::text[])`,
    [COURSE, SWEEP, SEEDS.map(String), LEGO_IDS, CHANGES.map(c => `${COURSE}:${c.id}`)]);
  for (const e of ev) problems.push(`another surface touched our rows today: ${e.surface} ${e.operation} (${e.id})`);
}
async function guards(pg, problems, log) {
  // every non-component phrase under a changed LEGO, after the change, contains its LEGO on both sides
  const legoAfter = {};
  const { rows: legos } = await pg.query('SELECT lego_id, known_text, target_text FROM course_legos WHERE course_code=$1 AND lego_id = ANY($2)', [COURSE, LEGO_IDS]);
  for (const l of legos) legoAfter[l.lego_id] = { known: l.known_text, target: l.target_text };
  const { rows: under } = await pg.query(`SELECT split_part(id,':',2) id, phrase_role, known_text, target_text, 'S'||lpad(seed_number::text,4,'0')||'L'||lpad(lego_index::text,2,'0') lego_ref FROM course_practice_phrases WHERE course_code=$1 AND 'S'||lpad(seed_number::text,4,'0')||'L'||lpad(lego_index::text,2,'0') = ANY($2)`, [COURSE, LEGO_IDS]);
  const after = new Map(CHANGES.map(c => [c.id, c.after]));
  log.containment = { checked: 0, preexisting: [] };
  for (const r of under) {
    if (r.phrase_role === 'component') continue;
    const A = after.get(r.id) || { known: r.known_text, target: r.target_text };
    const L = legoAfter[r.lego_ref];
    log.containment.checked++;
    const okT = containsWords(A.target, L.target), okK = knownContainsGloss(A.known, L.known);
    const okTBefore = containsWords(r.target_text, L.target), okKBefore = knownContainsGloss(r.known_text, L.known);
    const change = CHANGES.find(c => c.id === r.id);
    const touchedT = change && change.side !== 'known', touchedK = change && change.side !== 'target';
    if (touchedT && !okT) problems.push(`${r.id} target after the change does not contain its LEGO ${r.lego_ref} "${L.target}": "${A.target}"`);
    if (touchedK && !okK) problems.push(`${r.id} known after the change does not contain its LEGO ${r.lego_ref} "${glossCore(L.known)}": "${A.known}"`);
    if ((!okT && !touchedT && !okTBefore) || (!okK && !touchedK && !okKBefore)) log.containment.preexisting.push(`${r.id} "${r.known_text}" → "${r.target_text}" (LEGO "${L.known}" → "${L.target}"; ${!okK ? 'known side' : 'target side'}${change ? ', row otherwise edited by this pass' : ''})`);
  }
  // no new vocabulary: every word of every "after" text must exist at or before its seed
  log.vocabulary = [];
  for (const c of CHANGES) {
    for (const side of ['known', 'target']) {
      if (c.side !== 'both' && c.side !== side) continue;
      const missing = await newVocabulary(pg, c.seed, c.after[side], side);
      if (missing.length) problems.push(`${c.id} ${side} introduces untaught words at seed ${c.seed}: ${missing.join(', ')}`);
      else log.vocabulary.push(`${c.id} ${side}: all words taught by seed ${c.seed}`);
    }
  }
  // ZUT: a changed known must not map to a different target elsewhere (and vice versa), non-component rows.
  // A sibling row this same pass rewrites is judged by its planned AFTER text, not its stale live text.
  log.zut = [];
  const planned = new Map(CHANGES.map(c => [`${COURSE}:${c.id}`, c.after]));
  for (const c of CHANGES) {
    const { rows } = await pg.query(`SELECT id, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND id<>$2 AND phrase_role<>'component' AND (lower(known_text)=lower($3) OR lower(target_text)=lower($4))`, [COURSE, `${COURSE}:${c.id}`, c.after.known, c.after.target]);
    for (const r0 of rows) {
      const r = planned.has(r0.id) ? { id: r0.id, known_text: planned.get(r0.id).known, target_text: planned.get(r0.id).target } : r0;
      if (norm(r.known_text) === norm(c.after.known) && norm(r.target_text) !== norm(c.after.target)) problems.push(`ZUT: ${c.id} after "${c.after.known}" → "${c.after.target}" collides with ${r.id} "${r.known_text}" → "${r.target_text}"`);
      else if (norm(r.target_text) === norm(c.after.target) && norm(r.known_text) !== norm(c.after.known)) log.zut.push(`${c.id}: target "${c.after.target}" also carries "${r.known_text}" at ${r.id} (two Englishes → one target is allowed)`);
      else if (norm(r.known_text) === norm(c.after.known) || norm(r.target_text) === norm(c.after.target)) log.zut.push(`${c.id}: same pair already at ${r.id} (fine)`);
    }
  }
  // every "before" row fails the rule, every "after" row passes it
  for (const c of CHANGES) {
    if (!webEvidenceDefect(c.before.known, c.before.target)) problems.push(`${c.id} before the change is not flagged by the rule — the rule and the plan disagree`);
    const d = webEvidenceDefect(c.after.known, c.after.target);
    if (d) problems.push(`${c.id} after the change still fails the rule: ${d}`);
  }
}
/** The course-wide census: every non-component row through the rule, so nothing the rule catches is left unlisted. */
async function census(pg) {
  const { rows } = await pg.query(`SELECT split_part(id,':',2) AS id, seed_number, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND phrase_role<>'component' ORDER BY seed_number, id`, [COURSE]);
  const flagged = [];
  for (const r of rows) { const d = webEvidenceDefect(r.known_text, r.target_text); if (d) flagged.push({ ...r, defect: d }); }
  return { scanned: rows.length, flagged };
}

// ── Apply ───────────────────────────────────────────────────────────────────────────────
async function apply(pg, supabase, log) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const phraseEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-edit', scope: { seed_numbers: SEEDS, phrase_ids: CHANGES.map(c => `${COURSE}:${c.id}`), rows: CHANGES.length },
    detail: { ruling: RULING, job: JOB, changes: CHANGES.map(c => ({ id: c.id, flag: c.flag, side: c.side, confidence: c.conf, before: c.before, after: c.after })) } });
  const unapproveEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'unapprove', scope: { seed_numbers: SEEDS, rows: SEEDS.length }, detail: { why: 'rows edited under the #610·I native-reader flags, settled from corpus evidence; need Kai\'s read', job: JOB } });
  log.events = { phraseEvent, unapproveEvent };

  await pg.query('BEGIN');
  try {
    log.phraseUpdates = [];
    for (const c of CHANGES) {
      const sets = ['qa_checked=NULL', 'decomposition=NULL', 'decomposition_course_version=NULL', 'display_tiling=NULL', 'display_tiling_version=NULL', 'last_edit_event_id=$1', 'updated_at=now()'];
      const params = [phraseEvent];
      if (c.side !== 'target') { params.push(c.after.known); sets.push(`known_text=$${params.length}`, 'known_audio_id=NULL'); }
      if (c.side !== 'known') { params.push(c.after.target); sets.push(`target_text=$${params.length}`, 'target1_audio_id=NULL', 'target2_audio_id=NULL', 'target1_duration_ms=NULL', 'target2_duration_ms=NULL'); params.push(c.after.target.length); sets.push(`word_count=$${params.length}`); params.push(words(c.after.target).length); sets.push(`lego_count=$${params.length}`); }
      params.push(COURSE, `${COURSE}:${c.id}`, c.before.known, c.before.target);
      const u = await pg.query(`UPDATE course_practice_phrases SET ${sets.join(', ')} WHERE course_code=$${params.length - 3} AND id=$${params.length - 2} AND known_text=$${params.length - 1} AND target_text=$${params.length}`, params);
      if (u.rowCount !== 1) throw new Error(`${c.id} update touched ${u.rowCount} rows`);
      log.phraseUpdates.push(`${c.id} (${c.side}): "${c.before.known}" → "${c.before.target}"  ⇒  "${c.after.known}" → "${c.after.target}"`);
    }
    const un = await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number = ANY($3)', [unapproveEvent, COURSE, SEEDS]);
    log.unapproved = { seeds: SEEDS, rows: un.rowCount };
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
  log.roundIndex = await refreshNow().then(() => 'refreshed').catch(e => `NOT refreshed: ${e.message}`);
}

// ── Audio ───────────────────────────────────────────────────────────────────────────────
function ttsDeps() {
  process.env.PHASE8_NO_LISTEN = '1';
  return {
    phase8: require('../../services/phases/phase8-audio-v13.cjs'), ttsService: require('../../services/tts-service.cjs'), veracity: require('../../services/audio-veracity.cjs'),
    voiceConfigService: require('../../services/voice-config-service.cjs'), writeOrSwapClip: require('../../services/shared/audio-revision-swap.cjs').writeOrSwapClip,
    normalizeForAudio: require('../../services/shared/text-normalize.cjs').normalizeForAudio, S3: require('@aws-sdk/client-s3'), uuidv4: require('uuid').v4,
    castGate: require('../../services/shared/voice-cast-gate.cjs'), locale: require('../../services/shared/tts-locale-steer.cjs'),
  };
}
async function renderClip(supabase, { text, language, role, provider, voice, voiceIds, replacing, check, attempts }) {
  const d = ttsDeps();
  const s3 = new d.S3.S3Client({ region: process.env.AWS_REGION || 'eu-west-1' });
  const door = { courseCode: COURSE, intro: false, language, voiceBound: true, job: JOB, replacing: replacing || [] };
  const renderAndMaster = async () => {
    const out = provider === 'azure'
      ? await d.ttsService.generateWithRetry(text, 'azure', { door, subscriptionKey: process.env.AZURE_SPEECH_KEY, region: process.env.AZURE_SPEECH_REGION || 'westeurope', voiceName: voice.voiceName, speed: 1 })
      : await d.ttsService.generateWithRetry(text, 'cartesia', { door, apiKey: process.env.CARTESIA_API_KEY, voiceId: voice.cartesiaId, locale: d.locale.ttsLocaleForRole(null, role, language), speed: 1 });
    if (out.existingClip && !voiceIds.includes(out.existingClip.voice_id)) throw new Error(`door offered ${out.existingClip.voice_id}; ${voice.voiceName} only`);
    const { buffer, durationMs } = await d.phase8.masterAudio(out.audioBuffer, text, await d.voiceConfigService.masteringOptsFor(provider === 'azure' ? voice.voiceName : voice.voiceId, provider));
    return { buffer, durationMs, wordBoundaries: out.wordBoundaries };
  };
  const gated = await d.veracity.renderChecked({ render: renderAndMaster, expectedText: text, language, sampler: d.veracity.ALWAYS_SAMPLER, logger: console, check, attempts, meta: { courseCode: COURSE, role, voiceId: voice.voiceName, originalText: text } });
  if (!gated.published) throw new Error(`veracity gate: quarantined after ${gated.attempts} attempts (${gated.verdict?.reason}; heard ${JSON.stringify(String(gated.verdict?.decode || '').slice(0, 60))})`);
  const newAudioId = d.uuidv4().toUpperCase(), newS3Key = `mastered/${newAudioId}.mp3`;
  await s3.send(new d.S3.PutObjectCommand({ Bucket: d.phase8.S3_BUCKET, Key: newS3Key, Body: gated.buffer, ContentType: 'audio/mpeg', CacheControl: 'public, max-age=31536000, immutable' }));
  const verdictColumns = d.veracity.verdictColumns(gated.verdict, { checker: SWEEP, attempts: gated.attempts });
  const textNormalized = d.normalizeForAudio(text);
  const base = { course_code: COURSE, text, text_normalized: textNormalized, language, role, voice_id: voice.voiceId, origin: 'tts' };
  const out = await d.writeOrSwapClip({ supabase, identity: { course_code: COURSE, text_normalized: textNormalized, language, role, voice_id: voice.voiceId }, insertRow: { ...base, s3_key: newS3Key, duration_ms: gated.durationMs, word_boundaries: gated.wordBoundaries || null, ...verdictColumns }, swapPatch: { voice_id: voice.voiceId, origin: 'tts', word_boundaries: gated.wordBoundaries || null, text, ...verdictColumns }, newS3Key, durationMs: gated.durationMs, source: SWEEP, acceptedBy: `${SWEEP} (${role}, ${voice.voiceName})`, reason: RULING, logger: console });
  return { audioId: out.audioId, durationMs: gated.durationMs, attempts: gated.attempts, heard: gated.verdict?.decode || null, cer: gated.verdict?.cer ?? null, s3Key: newS3Key, swapped: !out.created };
}
const castKey = (r) => `${r.slot}|${r.language}|${r.gender}|${r.rank}|${r.voice_id}|${r.notes ?? ''}|${r.assigned_by ?? ''}|${r.created_at?.toISOString?.() ?? r.created_at}|${r.updated_at?.toISOString?.() ?? r.updated_at}`;
const sweCast = async (pg) => (await pg.query(`SELECT slot, language, gender, rank, voice_id, notes, assigned_by, created_at, updated_at FROM voice_language_roles WHERE language='swe' ORDER BY slot, gender, rank, voice_id`)).rows;
const sameCast = (a, b) => a.length === b.length && a.every((r, i) => castKey(r) === castKey(b[i]));

async function fillSwedish(pg, supabase, log) {
  const ids = CHANGES.filter(c => c.side !== 'known').map(c => `${COURSE}:${c.id}`);
  const { rows } = await pg.query(`SELECT id, target_text, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2) ORDER BY 1`, [COURSE, ids]);
  const d = ttsDeps();
  const before = await sweCast(pg);
  log.audio = log.audio || [];
  try {
    for (const r of TEMP_SWE_ROWS) await pg.query(`INSERT INTO voice_language_roles (slot, language, gender, rank, voice_id, notes, assigned_by) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [r.slot, r.language, r.gender, r.rank, r.voice_id, `TEMPORARY — ${RULING}. Removed by the same run.`, SWEEP]);
    d.castGate.useCastRows(null); // drop the gate's 60 s cache so the door sees the rows
    for (const r of rows) for (const role of ['target1', 'target2']) {
      if (r[`${role}_audio_id`]) continue;
      const entry = { id: r.id, role, text: r.target_text }; log.audio.push(entry);
      const voice = role === 'target1' ? SOFIE : MATTIAS;
      try {
        const { rows: have } = await pg.query(`SELECT id, voice_id FROM course_audio WHERE language='swe' AND text_normalized=normalize_text($1) AND s3_key IS NOT NULL AND s3_key NOT LIKE 'pending/%' AND voice_id = ANY($2) AND veracity_pass IS DISTINCT FROM false ORDER BY (course_code=$3) DESC, (role=$4) DESC, created_at DESC LIMIT 1`, [r.target_text, SWE_VOICE_IDS[role], COURSE, role]);
        let audioId = have[0]?.id;
        if (audioId) entry.result = `linked existing ${have[0].voice_id} clip ${audioId}`;
        else { const out = await renderClip(supabase, { text: r.target_text, language: 'swe', role, provider: 'azure', voice, voiceIds: SWE_VOICE_IDS[role] }); audioId = out.audioId; entry.result = `rendered ${voice.voiceName} clip ${audioId} (${out.durationMs} ms, attempt ${out.attempts}, CER ${out.cer}, heard "${out.heard}")`; }
        await pg.query(`UPDATE course_practice_phrases SET ${role}_audio_id=$1 WHERE course_code=$2 AND id=$3 AND target_text=$4 AND ${role}_audio_id IS NULL`, [audioId, COURSE, r.id, r.target_text]);
        const { rows: [now] } = await pg.query(`SELECT a.id, a.voice_id FROM course_practice_phrases x LEFT JOIN course_audio a ON a.id=x.${role}_audio_id WHERE x.course_code=$1 AND x.id=$2`, [COURSE, r.id]);
        entry.linked = now?.id || null; entry.linkedVoice = now?.voice_id || null;
        if (!now?.id || !SWE_VOICE_IDS[role].includes(now.voice_id)) entry.result += ` — SLOT NOT ON CAST VOICE (${now?.voice_id})`;
      } catch (e) { entry.result = `REFUSED/FAILED: ${e.message}`; }
    }
  } finally {
    await pg.query(`DELETE FROM voice_language_roles WHERE assigned_by=$1 AND language='swe'`, [SWEEP]);
    d.castGate.useCastRows(null);
    const after = await sweCast(pg);
    log.sweCastRestored = sameCast(before, after);
    if (!log.sweCastRestored) throw new Error('swe cast NOT byte-identical after the temporary Sofie/Mattias rows were removed');
  }
}
async function fillEnglish(pg, supabase, log) {
  const ids = CHANGES.filter(c => c.side !== 'target').map(c => `${COURSE}:${c.id}`);
  const { rows } = await pg.query(`SELECT 'course_practice_phrases' AS tbl, id, known_text FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2) AND known_audio_id IS NULL ORDER BY 2`, [COURSE, ids]);
  const idCol = (tbl) => tbl === 'course_legos' ? 'lego_id' : 'id';
  log.audio = log.audio || [];
  for (const r of rows) {
    const entry = { id: r.id, role: 'known', text: r.known_text }; log.audio.push(entry);
    try {
      const { rows: have } = await pg.query(`SELECT id, voice_id FROM course_audio WHERE language='eng' AND text_normalized=normalize_text($1) AND s3_key IS NOT NULL AND s3_key NOT LIKE 'pending/%' AND voice_id = ANY($2) AND veracity_pass IS DISTINCT FROM false ORDER BY (course_code=$3) DESC, (role='known') DESC, created_at DESC LIMIT 1`, [r.known_text, CHARLOTTE_IDS, COURSE]);
      let audioId = have[0]?.id;
      if (audioId) entry.result = `linked existing ${have[0].voice_id} clip ${audioId}`;
      else { const out = await renderClip(supabase, { text: r.known_text, language: 'eng', role: 'known', provider: 'cartesia', voice: CHARLOTTE, voiceIds: CHARLOTTE_IDS }); audioId = out.audioId; entry.result = `rendered ${CHARLOTTE.voiceName} clip ${audioId} (${out.durationMs} ms, attempt ${out.attempts}, CER ${out.cer})`; }
      await pg.query(`UPDATE ${r.tbl} SET known_audio_id=$1 WHERE course_code=$2 AND ${idCol(r.tbl)}=$3 AND known_text=$4 AND known_audio_id IS NULL`, [audioId, COURSE, r.id, r.known_text]);
      const { rows: [now] } = await pg.query(`SELECT a.id, a.voice_id FROM ${r.tbl} x LEFT JOIN course_audio a ON a.id=x.known_audio_id WHERE x.course_code=$1 AND x.${idCol(r.tbl)}=$2`, [COURSE, r.id]);
      entry.linked = now?.id || null; entry.linkedVoice = now?.voice_id || null;
    } catch (e) { entry.result = `REFUSED/FAILED: ${e.message}`; }
  }
}

// ── Main ────────────────────────────────────────────────────────────────────────────────
async function main() {
  const { Client } = require('pg');
  const { createClient } = require('@supabase/supabase-js');
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const APPLY = process.env.APPLY === '1', AUDIO_ONLY = process.env.AUDIO_ONLY === '1';
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const log = { sweep: SWEEP, job: JOB, mode: APPLY ? (AUDIO_ONLY ? 'apply:audio-only' : 'apply') : 'dry-run', at: new Date().toISOString(), changes: CHANGES.length, seeds: SEEDS };
  try {
    if (!AUDIO_ONLY) {
      const problems = [];
      await guardLive(pg, problems);
      await guards(pg, problems, log);
      const c = await census(pg);
      log.census = { scanned: c.scanned, flagged: c.flagged.map(f => `${f.id} [${f.defect}] "${f.known_text}" → "${f.target_text}"`) };
      const covered = new Set(CHANGES.map(x => x.id));
      const uncovered = c.flagged.filter(f => !covered.has(f.id));
      if (uncovered.length) problems.push(`census flags rows this pass does not change: ${uncovered.map(f => `${f.id} [${f.defect}]`).join(', ')}`);
      log.problems = problems;
      console.log(`[${SWEEP}] ${log.mode}: ${CHANGES.length} phrase rows across seeds ${SEEDS.join(',')}; census scanned ${c.scanned}, flagged ${c.flagged.length}`);
      for (const f of log.census.flagged) console.log('  flagged:', f);
      for (const p of problems) console.log('  PROBLEM:', p);
      if (log.containment.preexisting.length) console.log(`  note: ${log.containment.preexisting.length} pre-existing containment misses under these LEGOs (unchanged rows, listed in the evidence file)`);
      if (problems.length) { log.outcome = 'refused'; throw new Error(`${problems.length} guard problem(s) — nothing written`); }
      if (APPLY) { await apply(pg, supabase, log); console.log(`  wrote: ${log.phraseUpdates.length} phrases; unapproved ${log.unapproved.rows} seeds; round index ${log.roundIndex}`); }
    }
    if (APPLY) {
      await fillSwedish(pg, supabase, log);
      await fillEnglish(pg, supabase, log);
      for (const a of log.audio) console.log(`  audio ${a.id} ${a.role}: ${a.result}`);
      const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs');
      log.audioPass = await queueAudioPass(supabase, { courseCode: COURSE, requestedBy: `@${SWEEP}`, reason: `job ${JOB}: #610·I native-reader flags settled from corpus evidence; Swedish rendered on Sofie/Mattias by the tool, English on Charlotte; any slot the tool left silent is listed in its evidence file`, metadata: { job: JOB, seeds: SEEDS, rows: CHANGES.length } });
      log.outcome = 'applied';
    } else log.outcome = 'dry-run ok';
  } catch (e) { log.error = e.message; log.outcome = log.outcome || 'failed'; console.error(`[${SWEEP}] ${e.message}`); process.exitCode = 1; }
  finally {
    await pg.end();
    const out = evidencePath(`tools/course-optimization/${SWEEP}-${log.mode.replace(/[^a-z-]/g, '-')}-${Date.now()}.json`);
    fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, JSON.stringify(log, null, 2));
    console.log(`[${SWEEP}] evidence: ${out}`);
  }
}

module.exports = { webEvidenceDefect, containsWords, glossCore, glossAlternatives, knownContainsGloss, CHANGES, SEEDS };
if (require.main === module) main();
