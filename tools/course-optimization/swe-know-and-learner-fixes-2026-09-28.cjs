#!/usr/bin/env node
'use strict';
// tools/course-optimization/swe-know-and-learner-fixes-2026-09-28.cjs
//
// swe_for_eng — the "know" verb pass and the learner-report fixes (Kai, 2026-09-28, job #610·I).
//
// THE RULE (support ticket, seed 230): English "know" is three Swedish verbs.
//   - a fact, a clause, or nothing at all ("I know", "I know what you mean")  → vet / visste / veta / vetat
//   - a person or a place ("I know him", "do you know my sister?")            → känner / kände / känna
//   - "know how to" as a skill                                                 → kan  (NOT changed here — see below)
// A bare "I know" drilled as "jag känner" teaches the wrong verb: "jag känner" on its own is "I feel".
//
// WHAT THIS PASS CHANGES (every row is listed in CHANGES with its before → after and a confidence):
//   1. LEGO S0230L01 "know/feel (present) → känner" is a second debut of S0085L01 "know/feel → känner"
//      (both sides match in substance; Kai 2026-09-23: a LEGO is a duplicate only if BOTH sides match).
//      It is NOT deleted (never delete a LEGO): it stands down to is_new = false and is re-glossed
//      "know (a person)" so the prompt says which "know" it is. Its intro is unlinked (a not-new LEGO
//      plays no intro); the old clips stay in course_audio, unlinked.
//   2. The three build phrases under it drilled a bare känner ("know", "I know", "she knows"); each
//      now carries a person object the course has already taught (honom seed 176, henne seed 136).
//   3. S0130L02U03 "because she knew → för hon kände": a bare "knew" is visste.
//   4. S0133L02U03/U05 "att lär känna": a finite verb after infinitive "att" is ungrammatical; the
//      LEGO is the finite "lär känna", so the phrase takes a subject clause ("att man lär känna").
//   5. S0197L04U04 "do you know a teacher? → vet du en lärare?": a person is känner.
//   6. English-side mismatches found by the same read: S0233L01U04 (her → your sister), S0134L01U05
//      ("didn't see it as" → "didn't know that it was"), S0210L02U06 ("sees" → "knows"),
//      S0017L03U05 ("know" → "find out", the LEGO is ta reda på and vet is not yet taught at seed 17),
//      S0251L02U04 ("förrän" needs a negation: "I don't want to know until after").
//   7. Tom's learner-report items (2026-09-16, needs-you card b18bdfed…, docs d/ef797aaf + d/8e1f5163):
//      (a) the Sofie take of S0070L02U02 "vet du var svaret är?" says "vad" — re-rendered on Sofie with
//          a check that REFUSES a decode containing "vad" (the standard gate passes vad for var);
//      (b) S0020L03U03 "she's going to find out quickly → hon ska ta reda på svaret snabbt": English
//          gains "the answer";
//      (c) S0237L02U02/U04/U05/U06 "this weekend → helgen": Swedish takes "i helgen".
//
// NOT CHANGED, flagged for a native reader in the report: "vet hur man …" for "know how to" (seeds
// 59/60, approved seed sentences — "kan" would be the idiomatic skill verb); "vet + definite noun"
// rows (vet du frågan / idén / problemet / arrangemangen / den senaste — "känner till" would be
// idiomatic); S0227L01U03 "hon vet den"; S0472 "känner till fakta" (fine as it stands); the other
// ~80 second debuts the course carries by convention (only the känner one is stood down here).
//
// Every seed with an edited row is unapproved. Swedish clips are re-rendered on the course's own
// target voices (Azure Sofie / Mattias — every one of its 10,452 Swedish clips is theirs). The
// Swedish cast table lists only the four Cartesia pod voices, so, exactly as jobs #557·I/#559·I did
// for English on ita_for_eng, this run inserts TEMPORARY phrase-slot cast rows (rank 5) for Sofie and
// Mattias, renders through the one TTS door (spend guard + veracity gate in front of every render),
// deletes the rows in a finally block and refuses to exit 0 unless the swe cast is byte-identical to
// its snapshot. English prompts render on the live English cast (Cartesia Charlotte); a spend-guard
// refusal leaves the slot silent and is reported, never worked around.
//
//   node tools/course-optimization/swe-know-and-learner-fixes-2026-09-28.cjs            # dry run: guards + plan + listen to the vad/var clips
//   APPLY=1 node tools/course-optimization/swe-know-and-learner-fixes-2026-09-28.cjs    # write + render + link
//   AUDIO_ONLY=1 APPLY=1 node …                                                         # re-run the audio fill only

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'swe_for_eng';
const SWEEP = 'swe-know-and-learner-fixes-2026-09-28';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const JOB = '#610·I';
const RULING = 'Kai, 2026-09-28 (job #610·I): know = vet (fact/bare) / känner (person, place); seed 230 drilled a bare känner; Tom\'s 2026-09-16 learner-report fixes (vad/var Sofie take, find out the answer, i helgen)';
const SOFIE = { voiceId: 'azure_sv-SE-SofieNeural', castVoiceId: 'sv-SE-SofieNeural', voiceName: 'sv-SE-SofieNeural', gender: 'f' };
const MATTIAS = { voiceId: 'azure_sv-SE-MattiasNeural', castVoiceId: 'sv-SE-MattiasNeural', voiceName: 'sv-SE-MattiasNeural', gender: 'm' };
const SWE_VOICE_IDS = { target1: ['azure_sv-SE-SofieNeural', 'sv-SE-SofieNeural'], target2: ['azure_sv-SE-MattiasNeural', 'sv-SE-MattiasNeural'] };
const CHARLOTTE = { voiceId: 'cartesia_71a7ad14-091c-4e8e-a314-022ece01c121', cartesiaId: '71a7ad14-091c-4e8e-a314-022ece01c121', voiceName: 'Charlotte (Cartesia)' };
const CHARLOTTE_IDS = ['cartesia_71a7ad14-091c-4e8e-a314-022ece01c121', '71a7ad14-091c-4e8e-a314-022ece01c121'];
// voice_language_roles.slot is CHECKed to phrase|guide|presentation|known; target1/target2 read the phrase slot.
// Rank 5 (the CHECK ceiling; PK is slot+language+gender+rank) so the temporary rows never win a resolution — the cast GATE reads language + voice only.
const TEMP_SWE_ROWS = [
  { slot: 'phrase', language: 'swe', gender: 'f', rank: 5, voice_id: SOFIE.castVoiceId },
  { slot: 'phrase', language: 'swe', gender: 'm', rank: 5, voice_id: MATTIAS.castVoiceId },
];

// ── Rules (pure; the test exercises these) ─────────────────────────────────────────────
const norm = (s) => String(s || '').toLowerCase().replace(/’/g, "'").replace(/[.,!?;:"«»]+/g, ' ').replace(/\s+/g, ' ').trim();
const words = (s) => norm(s).split(' ').filter(Boolean);
/** A known-side gloss minus its bracketed note and slash alternatives: "know/feel (present)" → "know". */
const glossCore = (s) => norm(String(s || '').replace(/\([^)]*\)/g, ' ').replace(/\/\S+/g, ''));
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
 * Classify one phrase pair for the know-verb rule. Returns null when the row is fine, else a reason.
 *   bare-kanner        : känner/kände with no object at all ("jag känner", "hon kände") — that is "feel"
 *   att-finite         : "att lär känna" — a finite verb after infinitive-marker att
 *   person-with-vet    : vet/visste + an indefinite person noun ("vet du en lärare?")
 * Objects are recognised as a pronoun, a noun phrase, or a relative clause following the verb; a
 * känner that ENDS a relative clause ("människor jag inte känner") has its object as antecedent.
 */
function knowVerbDefect(known, target) {
  const t = norm(target), k = norm(known);
  if (/\batt lär känna\b/.test(t)) return 'att-finite';
  if (/\b(vet|visste)\s+(du|jag|hon|han|vi|de|ni)?\s*(en|ett)\s+(lärare|man|kvinna|vän|pojke|flicka|person)\b/.test(t)) return 'person-with-vet';
  const m = t.match(/\b(känner|kände)\b(.*)$/);
  if (m && /\b(know|knows|knew)\b/.test(k) && !/\b(feel|feels|felt|feeling)\b/.test(k)) {
    const after = m[2].trim();
    const before = t.slice(0, m.index).trim();
    const hasObjectAfter = after && !/^(inte|också|bara|redan|ännu)?$/.test(after);
    // "människor jag inte känner", "någon som jag kände", "den kvinnan du känner": the object is the antecedent
    const relativeClause = /\b(någon|ingen|människor\w*|folk|vän\w*|man\w*|kvinn\w*|flesta|alla|den|det|dem)\s+(som\s+)?(jag|du|hon|han|vi|de|ni)(\s+inte)?$/.test(before);
    if (/\bperson\b/.test(k)) return null; // the re-glossed LEGO "know (a person)" names its object in the gloss
    if (!hasObjectAfter && !relativeClause) return 'bare-kanner';
  }
  return null;
}

/** 7(b)/(c), pure: English "this weekend" needs "i helgen"; English "find out" against a Swedish "svaret" needs "the answer". */
function learnerReportDefect(known, target) {
  const t = norm(target), k = norm(known);
  if (/\bthis weekend\b/.test(k) && /\bhelgen\b/.test(t) && !/\bi helgen\b/.test(t)) return 'this-weekend-without-i';
  if (/\bsvaret\b/.test(t) && /\bfind out\b/.test(k) && !/\b(the answer|what the answer)\b/.test(k)) return 'answer-dropped-in-english';
  return null;
}

// ── The changes ────────────────────────────────────────────────────────────────────────
const OLD_L01 = { known: 'know/feel (present)', target: 'känner', is_new: true, presentation: '3c22d7df-873d-4928-8e3a-85fc078fc160' };
const NEW_L01 = { known: 'know (a person)', target: 'känner', is_new: false };

/** Phrase rows: before → after. `side` says which text moves (the other is asserted unchanged). */
const CHANGES = [
  // ── 2. seed 230: the bare känner drill takes a person object ──
  { rule: 2, seed: 230, lego: 'S0230L01', id: 'S0230L01B01', side: 'both', conf: 'high', before: { known: 'know', target: 'känner' }, after: { known: 'know him', target: 'känner honom' } },
  { rule: 2, seed: 230, lego: 'S0230L01', id: 'S0230L01B02', side: 'both', conf: 'high', before: { known: 'I know', target: 'jag känner' }, after: { known: 'I know her', target: 'jag känner henne' } },
  { rule: 2, seed: 230, lego: 'S0230L01', id: 'S0230L01B03', side: 'both', conf: 'high', before: { known: 'she knows', target: 'hon känner' }, after: { known: 'she knows him', target: 'hon känner honom' } },
  // ── 3. a bare "knew" is visste ──
  { rule: 3, seed: 130, lego: 'S0130L02', id: 'S0130L02U03', side: 'target', conf: 'high', before: { known: 'that was unusual, because she knew', target: 'det var ovanligt, för hon kände' }, after: { known: 'that was unusual, because she knew', target: 'det var ovanligt, för hon visste' } },
  // ── 4. att + finite verb ──
  { rule: 4, seed: 133, lego: 'S0133L02', id: 'S0133L02U03', side: 'both', conf: 'high', before: { known: "it's exciting to get to know someone", target: 'det är spännande att lär känna någon' }, after: { known: "it's exciting that one gets to know someone", target: 'det är spännande att man lär känna någon' } },
  { rule: 4, seed: 133, lego: 'S0133L02', id: 'S0133L02U05', side: 'both', conf: 'high', before: { known: "it's important to get to know someone", target: 'det är viktigt att lär känna någon' }, after: { known: "it's important that one gets to know someone", target: 'det är viktigt att man lär känna någon' } },
  // ── 5. a person is känner ──
  { rule: 5, seed: 197, lego: 'S0197L04', id: 'S0197L04U04', side: 'target', conf: 'high', before: { known: 'do you know a teacher?', target: 'vet du en lärare?' }, after: { known: 'do you know a teacher?', target: 'känner du en lärare?' } },
  // ── 6. English-side mismatches under "know" ──
  { rule: 6, seed: 233, lego: 'S0233L01', id: 'S0233L01U04', side: 'known', conf: 'high', before: { known: 'I know her sister', target: 'jag känner din syster' }, after: { known: 'I know your sister', target: 'jag känner din syster' } },
  { rule: 6, seed: 134, lego: 'S0134L01', id: 'S0134L01U05', side: 'known', conf: 'high', before: { known: "he didn't see it as a problem", target: 'han visste inte att det var ett problem' }, after: { known: "he didn't know that it was a problem", target: 'han visste inte att det var ett problem' } },
  { rule: 6, seed: 210, lego: 'S0210L02', id: 'S0210L02U06', side: 'known', conf: 'high (English); Swedish "vet problemet" flagged', before: { known: 'nobody sees the problem', target: 'ingen vet problemet' }, after: { known: 'nobody knows the problem', target: 'ingen vet problemet' } },
  { rule: 6, seed: 17, lego: 'S0017L03', id: 'S0017L03U05', side: 'known', conf: 'high', before: { known: "i'd like to know what the answer is", target: 'jag skulle vilja ta reda på vad svaret är' }, after: { known: "i'd like to find out what the answer is", target: 'jag skulle vilja ta reda på vad svaret är' } },
  { rule: 6, seed: 251, lego: 'S0251L02', id: 'S0251L02U04', side: 'both', conf: 'high', before: { known: 'I want to know until after', target: 'jag vill veta förrän efter' }, after: { known: "I don't want to know until after", target: 'jag vill inte veta förrän efter' } },
  // ── 7. Tom's learner-report fixes (2026-09-16) ──
  { rule: 7, seed: 20, lego: 'S0020L03', id: 'S0020L03U03', side: 'known', conf: 'high', before: { known: "she's going to find out quickly", target: 'hon ska ta reda på svaret snabbt' }, after: { known: "she's going to find out the answer quickly", target: 'hon ska ta reda på svaret snabbt' } },
  { rule: 7, seed: 237, lego: 'S0237L02', id: 'S0237L02U02', side: 'target', conf: 'medium-high, native check', before: { known: "she'll be here this weekend", target: 'hon ska vara här helgen' }, after: { known: "she'll be here this weekend", target: 'hon ska vara här i helgen' } },
  { rule: 7, seed: 237, lego: 'S0237L02', id: 'S0237L02U04', side: 'target', conf: 'medium-high, native check', before: { known: "she's busy this weekend", target: 'hon är upptagen helgen' }, after: { known: "she's busy this weekend", target: 'hon är upptagen i helgen' } },
  { rule: 7, seed: 237, lego: 'S0237L02', id: 'S0237L02U05', side: 'target', conf: 'medium-high, native check', before: { known: 'what are you doing this weekend?', target: 'vad ska du göra helgen?' }, after: { known: 'what are you doing this weekend?', target: 'vad ska du göra i helgen?' } },
  { rule: 7, seed: 237, lego: 'S0237L02', id: 'S0237L02U06', side: 'target', conf: 'medium-high, native check ("träffas med dig" flagged separately)', before: { known: "i'll see you this weekend", target: 'jag ska träffas med dig helgen' }, after: { known: "i'll see you this weekend", target: 'jag ska träffas med dig i helgen' } },
];
/** 7(a): the Sofie take that says "vad". Text unchanged; the clip is re-rendered with a stricter check. */
const VAD_VAR = { id: 'S0070L02U02', text: 'vet du var svaret är?', takes: { target1: '1ed353d6-5199-4715-b73d-b26b537b3666', target2: 'b0405a74-178d-4b76-b77a-6b0b98ea1d27' } };
// The dry run of 2026-09-28 heard BOTH live takes as "vet du vad svaret är?" (Sofie CER 0.05, Mattias CER 0.05), so both are re-rendered.
const SEEDS = [...new Set(CHANGES.map(c => c.seed).concat([230]))].sort((a, b) => a - b);
const LEGO_IDS = [...new Set(CHANGES.map(c => c.lego).concat(['S0230L01']))];

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
  const { rows: [l] } = await pg.query('SELECT known_text, target_text, is_new, presentation_audio_id FROM course_legos WHERE course_code=$1 AND lego_id=$2', [COURSE, 'S0230L01']);
  if (!l || l.known_text !== OLD_L01.known || l.target_text !== OLD_L01.target || l.is_new !== OLD_L01.is_new) problems.push(`S0230L01 reads "${l?.known_text}" → "${l?.target_text}" is_new=${l?.is_new}`);
  if (l && l.presentation_audio_id !== OLD_L01.presentation) problems.push(`S0230L01 presentation link is ${l.presentation_audio_id}`);
  const { rows: [l85] } = await pg.query('SELECT known_text, target_text, is_new FROM course_legos WHERE course_code=$1 AND lego_id=$2', [COURSE, 'S0085L01']);
  if (!l85 || l85.target_text !== 'känner' || !l85.is_new) problems.push(`S0085L01 is not the känner debut any more: "${l85?.known_text}" → "${l85?.target_text}" is_new=${l85?.is_new}`);
  for (const c of CHANGES) {
    const { rows: [r] } = await pg.query('SELECT known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND id=$2', [COURSE, `${COURSE}:${c.id}`]);
    if (!r || r.known_text !== c.before.known || r.target_text !== c.before.target) problems.push(`${c.id} reads "${r?.known_text}" → "${r?.target_text}" (expected "${c.before.known}" → "${c.before.target}")`);
  }
  const { rows: [v] } = await pg.query('SELECT target_text, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE course_code=$1 AND id=$2', [COURSE, `${COURSE}:${VAD_VAR.id}`]);
  if (!v || v.target_text !== VAD_VAR.text || v.target1_audio_id !== VAD_VAR.takes.target1 || v.target2_audio_id !== VAD_VAR.takes.target2) problems.push(`${VAD_VAR.id} reads "${v?.target_text}" t1=${v?.target1_audio_id} t2=${v?.target2_audio_id}`);
  // Concurrency: another surface editing these seeds or LEGOs in the last 12 hours.
  const { rows: ev } = await pg.query(`SELECT id, surface, operation FROM content_edit_events WHERE course_code=$1 AND occurred_at > now() - interval '12 hours' AND surface NOT LIKE '%' || $2 || '%' AND (scope->'seed_numbers' ?| $3::text[] OR scope->'lego_ids' ?| $4::text[] OR scope->'phrase_ids' ?| $5::text[])`,
    [COURSE, SWEEP, SEEDS.map(String), LEGO_IDS, CHANGES.map(c => `${COURSE}:${c.id}`)]);
  for (const e of ev) problems.push(`another surface touched our rows today: ${e.surface} ${e.operation} (${e.id})`);
}
async function guards(pg, problems, log) {
  // every non-component phrase under a changed LEGO, after the change, contains its LEGO on both sides
  const legoAfter = { S0230L01: NEW_L01 };
  const { rows: legos } = await pg.query('SELECT lego_id, known_text, target_text FROM course_legos WHERE course_code=$1 AND lego_id = ANY($2)', [COURSE, LEGO_IDS]);
  for (const l of legos) if (!legoAfter[l.lego_id]) legoAfter[l.lego_id] = { known: l.known_text, target: l.target_text };
  const { rows: under } = await pg.query(`SELECT split_part(id,':',2) id, phrase_role, known_text, target_text, 'S'||lpad(seed_number::text,4,'0')||'L'||lpad(lego_index::text,2,'0') lego_ref FROM course_practice_phrases WHERE course_code=$1 AND 'S'||lpad(seed_number::text,4,'0')||'L'||lpad(lego_index::text,2,'0') = ANY($2)`, [COURSE, LEGO_IDS]);
  const after = new Map(CHANGES.map(c => [c.id, c.after]));
  log.containment = { checked: 0, preexisting: [] };
  for (const r of under) {
    if (r.phrase_role === 'component') continue;
    const A = after.get(r.id) || { known: r.known_text, target: r.target_text };
    const L = legoAfter[r.lego_ref];
    log.containment.checked++;
    const okT = containsWords(A.target, L.target), okK = containsWords(A.known, glossCore(L.known), { inflection: true });
    const okTBefore = containsWords(r.target_text, L.target), okKBefore = containsWords(r.known_text, glossCore(L.known), { inflection: true });
    const change = CHANGES.find(c => c.id === r.id);
    const touchedT = change && change.side !== 'known', touchedK = change && change.side !== 'target';
    // a side this pass writes must contain the LEGO; a side it leaves alone that already missed is pre-existing
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
  // ZUT: a changed known must not map to a different target elsewhere (and vice versa), non-component rows
  log.zut = [];
  for (const c of CHANGES) {
    const { rows } = await pg.query(`SELECT id, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND id<>$2 AND phrase_role<>'component' AND (lower(known_text)=lower($3) OR lower(target_text)=lower($4))`, [COURSE, `${COURSE}:${c.id}`, c.after.known, c.after.target]);
    for (const r of rows) {
      if (norm(r.known_text) === norm(c.after.known) && norm(r.target_text) !== norm(c.after.target)) problems.push(`ZUT: ${c.id} after "${c.after.known}" → "${c.after.target}" collides with ${r.id} "${r.known_text}" → "${r.target_text}"`);
      else log.zut.push(`${c.id}: same pair already at ${r.id} (fine)`);
    }
  }
  // every "after" row passes the know-verb rule, every "before" row it targets failed it
  for (const c of CHANGES) {
    const d = knowVerbDefect(c.after.known, c.after.target) || learnerReportDefect(c.after.known, c.after.target);
    if (d) problems.push(`${c.id} after the change still fails the rule: ${d}`);
  }
}
/** The course-wide census: every row where "know" meets känner/vet, run through the rule. */
async function census(pg) {
  const { rows } = await pg.query(`SELECT 'phrase' AS kind, split_part(id,':',2) AS id, seed_number, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND phrase_role<>'component' AND (known_text ~* '\\mkn(ow|ew)' OR target_text ~* '\\m(känn\\w*|känd\\w*|vet|visste|veta|vetat)\\M')
    UNION ALL SELECT 'lego', lego_id, seed_number, known_text, target_text FROM course_legos WHERE course_code=$1 AND (known_text ~* '\\mkn(ow|ew)' OR target_text ~* '\\m(känn\\w*|känd\\w*|vet|visste|veta|vetat)\\M') ORDER BY 3, 2`, [COURSE]);
  const flagged = [];
  for (const r of rows) { const d = knowVerbDefect(r.known_text, r.target_text); if (d) flagged.push({ ...r, defect: d }); }
  return { scanned: rows.length, flagged };
}

// ── Apply ───────────────────────────────────────────────────────────────────────────────
async function apply(pg, supabase, log) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const legoEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'lego-edit', scope: { seed_numbers: [230], lego_ids: ['S0230L01'], rows: 1 }, detail: { ruling: RULING, job: JOB, from: OLD_L01, to: NEW_L01, why: 'second debut of S0085L01 känner; gloss says which know it is; intro unlinked (not new)' } });
  const phraseEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-edit', scope: { seed_numbers: SEEDS, phrase_ids: CHANGES.map(c => `${COURSE}:${c.id}`), rows: CHANGES.length },
    detail: { ruling: RULING, job: JOB, changes: CHANGES.map(c => ({ id: c.id, rule: c.rule, side: c.side, confidence: c.conf, before: c.before, after: c.after })) } });
  const unapproveEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'unapprove', scope: { seed_numbers: SEEDS, rows: SEEDS.length }, detail: { why: 'rows edited under the know-verb pass and the 2026-09-16 learner-report fixes; need Kai\'s read (he does not read Swedish — native check requested)', job: JOB } });
  log.events = { legoEvent, phraseEvent, unapproveEvent };

  await pg.query('BEGIN');
  try {
    const l = await pg.query('UPDATE course_legos SET known_text=$1, is_new=$2, known_audio_id=NULL, presentation_audio_id=NULL, last_edit_event_id=$3, updated_at=now() WHERE course_code=$4 AND lego_id=$5 AND known_text=$6 AND target_text=$7 AND is_new=true',
      [NEW_L01.known, NEW_L01.is_new, legoEvent, COURSE, 'S0230L01', OLD_L01.known, OLD_L01.target]);
    if (l.rowCount !== 1) throw new Error(`S0230L01 update touched ${l.rowCount} rows`);
    await pg.query('UPDATE course_audio SET lego_id=NULL WHERE id=$1 AND lego_id=$2', [OLD_L01.presentation, 'S0230L01']);
    await pg.query('DELETE FROM lego_introductions WHERE course_code=$1 AND lego_id=$2', [COURSE, 'S0230L01']);
    log.legoUpdate = 'S0230L01: known "know (a person)", is_new=false, known/presentation unlinked';
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
/** A veracity check that also refuses "vad" where the text says "var" — the standard gate passes a one-word substitution. */
function strictVarCheck(d) {
  return async (buffer, expectedText, language, opts) => {
    const v = await d.veracity.checkAudioVeracity(buffer, expectedText, language, opts);
    if (v && v.checked && v.pass && /\bvad\b/i.test(String(v.decode || ''))) return { ...v, pass: false, reason: 'heard_vad_for_var' };
    if (v && v.checked && v.pass && !/\bvar\b/i.test(String(v.decode || ''))) return { ...v, pass: false, reason: 'var_not_heard' };
    return v;
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

/** Swedish target1/target2 on every changed target row, plus the vad/var re-take: under TEMPORARY Sofie/Mattias cast rows. */
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
    // 7(a): the vad/var takes. Same text, same slots: fresh renders that must be heard as "var".
    const { rows: [vvNow] } = await pg.query(`SELECT id, target_text, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE course_code=$1 AND id=$2`, [COURSE, `${COURSE}:${VAD_VAR.id}`]);
    for (const role of ['target1', 'target2']) {
      const entry = { id: vvNow.id, role, text: vvNow.target_text, vadVar: true }; log.audio.push(entry);
      if (vvNow[`${role}_audio_id`] !== VAD_VAR.takes[role]) { entry.result = `skipped: ${role} is already ${vvNow[`${role}_audio_id`]}, not the reported take`; continue; }
      const voice = role === 'target1' ? SOFIE : MATTIAS;
      try {
        const out = await renderClip(supabase, { text: vvNow.target_text, language: 'swe', role, provider: 'azure', voice, voiceIds: SWE_VOICE_IDS[role], replacing: [VAD_VAR.takes[role]], check: strictVarCheck(d), attempts: 3 });
        entry.result = `re-rendered ${voice.voiceName} → clip ${out.audioId} ${out.swapped ? '(swapped onto the existing row, old bytes kept as the previous revision)' : '(new row)'} (${out.durationMs} ms, attempt ${out.attempts}, CER ${out.cer}, heard "${out.heard}")`;
        await pg.query(`UPDATE course_practice_phrases SET ${role}_audio_id=$1 WHERE course_code=$2 AND id=$3 AND target_text=$4`, [out.audioId, COURSE, vvNow.id, vvNow.target_text]);
        const { rows: [now] } = await pg.query(`SELECT a.id, a.voice_id, a.s3_key FROM course_practice_phrases x LEFT JOIN course_audio a ON a.id=x.${role}_audio_id WHERE x.course_code=$1 AND x.id=$2`, [COURSE, vvNow.id]);
        entry.linked = now?.id || null; entry.linkedVoice = now?.voice_id || null; entry.s3Key = now?.s3_key || null;
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
/** English prompts on the live English cast (Charlotte). A guard refusal is reported, not worked around. */
async function fillEnglish(pg, supabase, log) {
  const ids = CHANGES.filter(c => c.side !== 'target').map(c => `${COURSE}:${c.id}`);
  const { rows } = await pg.query(`SELECT 'course_practice_phrases' AS tbl, id, known_text FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2) AND known_audio_id IS NULL
    UNION ALL SELECT 'course_legos', lego_id, known_text FROM course_legos WHERE course_code=$1 AND lego_id='S0230L01' AND known_audio_id IS NULL ORDER BY 2`, [COURSE, ids]);
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
/** Dry run: listen to the two live takes of the reported phrase, so the finding is verified against live bytes, not a doc. */
async function listenToVadVar(pg, log) {
  const d = ttsDeps();
  const s3 = new d.S3.S3Client({ region: process.env.AWS_REGION || 'eu-west-1' });
  log.vadVarLive = [];
  for (const [role, id] of Object.entries(VAD_VAR.takes)) {
    const { rows: [a] } = await pg.query('SELECT id, voice_id, text, s3_key FROM course_audio WHERE id=$1', [id]);
    const entry = { role, id, voice: a?.voice_id, text: a?.text, s3Key: a?.s3_key };
    try {
      const obj = await s3.send(new d.S3.GetObjectCommand({ Bucket: d.phase8.S3_BUCKET, Key: a.s3_key }));
      const buffer = Buffer.from(await obj.Body.transformToByteArray());
      const v = await d.veracity.checkAudioVeracity(buffer, a.text, 'swe', { meta: { courseCode: COURSE, role } });
      entry.heard = v.decode; entry.pass = v.pass; entry.cer = v.cer; entry.saysVad = /\bvad\b/i.test(String(v.decode || ''));
    } catch (e) { entry.error = e.message; }
    log.vadVarLive.push(entry);
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
      log.census = { scanned: c.scanned, flagged: c.flagged.map(f => `${f.kind} ${f.id} [${f.defect}] "${f.known_text}" → "${f.target_text}"`) };
      const covered = new Set(CHANGES.map(x => x.id));
      const uncovered = c.flagged.filter(f => !covered.has(f.id) && f.id !== 'S0230L01');
      if (uncovered.length) problems.push(`know-verb census flags rows this pass does not change: ${uncovered.map(f => f.id).join(', ')}`);
      log.problems = problems;
      console.log(`[${SWEEP}] ${log.mode}: ${CHANGES.length} phrase rows + 1 LEGO across seeds ${SEEDS.join(',')}; census scanned ${c.scanned}, flagged ${c.flagged.length}`);
      for (const f of log.census.flagged) console.log('  flagged:', f);
      for (const p of problems) console.log('  PROBLEM:', p);
      if (log.containment.preexisting.length) console.log(`  note: ${log.containment.preexisting.length} pre-existing containment misses under these LEGOs (unchanged rows, listed in the evidence file)`);
      if (!APPLY) { await listenToVadVar(pg, log); for (const e of log.vadVarLive) console.log(`  live take ${e.role} ${e.voice}: heard ${JSON.stringify(e.heard)} saysVad=${e.saysVad} pass=${e.pass} cer=${e.cer}${e.error ? ' ERROR ' + e.error : ''}`); }
      if (problems.length) { log.outcome = 'refused'; throw new Error(`${problems.length} guard problem(s) — nothing written`); }
      if (APPLY) { await apply(pg, supabase, log); console.log(`  wrote: ${log.legoUpdate}; ${log.phraseUpdates.length} phrases; unapproved ${log.unapproved.rows} seeds; round index ${log.roundIndex}`); }
    }
    if (APPLY) {
      await fillSwedish(pg, supabase, log);
      await fillEnglish(pg, supabase, log);
      for (const a of log.audio) console.log(`  audio ${a.id} ${a.role}: ${a.result}`);
      const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs');
      log.audioPass = await queueAudioPass(supabase, { courseCode: COURSE, requestedBy: `@${SWEEP}`, reason: `job ${JOB}: know-verb pass + 2026-09-16 learner-report fixes; Swedish rendered on Sofie/Mattias by the tool, English on Charlotte; any slot the tool left silent is listed in its evidence file`, metadata: { job: JOB, seeds: SEEDS, rows: CHANGES.length + 1 } });
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

module.exports = { knowVerbDefect, learnerReportDefect, containsWords, glossCore, CHANGES, OLD_L01, NEW_L01, VAD_VAR };
if (require.main === module) main();
