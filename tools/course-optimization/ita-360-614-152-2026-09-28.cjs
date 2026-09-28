#!/usr/bin/env node
'use strict';
// tools/course-optimization/ita-360-614-152-2026-09-28.cjs
//
// ita_for_eng — seeds 360, 614 and 152 under Kai's rulings of 2026-09-28 22:30Z (job #626·I).
//
// (1) SEED 360 "did your friend say anything else?" → "il tuo amico ha detto qualcos'altro?"
//     S0360L01 "say anything else | ha detto qualcos'altro" → "did he say anything else? | ha detto qualcos'altro?"
//     (K28: the Italian subject is in the verb, the English carries the pronoun the seed's noun takes).
//     Components "did he say | ha detto" + "anything else | qualcos'altro". B01 (the bare LEGO) follows;
//     the phrases that say "your friend" for "he" over the SAME Italian are kept (K28's seed-455 precedent:
//     one Italian under two Englishes is not a defect, K3); U04 said "he" in English over "il tuo amico" in
//     Italian — its Italian drops the noun so the two sides say the same person (K26).
//     The LEGO's and B01's Italian gain a question mark: a question mark changes the reading (A7), so the
//     statement clips are re-rendered as questions, same id, new bytes (writeOrSwapClip).
// (2) SEED 614 "it's near where your family live" → "È vicino a dove vive la tua famiglia"
//     S0614L01 "lives | vive" (A) grows to "where your family live | dove vive la tua famiglia" (M), components
//     "where | dove" + "your family live | vive la tua famiglia" (they tile on both sides — Italian inverts the
//     subject, so the verb+subject chunk is one component). Every phrase under it is rewritten to contain the
//     whole LEGO (P17, O12) from vocabulary taught by seed 614 — no new words.
// (3) SEED 152 "I would have done it differently if I had known what you wanted" → "l'avrei fatto diversamente
//     se avessi saputo cosa volevi". *l'avrei* is taught at S0153L01 "I wouldn't have said it | non l'avrei
//     detto" and used in 15 phrases at seed 152, one seed early. Kai: remove every occurrence that appears
//     before the seed that teaches it; fix or delete the phrases, never a LEGO. All 15 are REWRITTEN (none
//     deleted) with the clitic replaced by an object the learner already has (quello 8, qualcosa 4, tutto 14,
//     niente 35), each still containing its LEGO. The course-wide sweep of every clitic+avere token
//     (l'ho, l'hai, te l'ho, me l'ha, me l'avessi …) is printed with first-teaching seed and early uses; only the
//     l'avrei rows are edited here — the other early tokens are LISTED for Kai (see the report).
//     NOT touched, and reported as a gap: seed 152's OWN sentence carries *l'avrei* and no LEGO of 152 covers
//     the *l'* (L27 vs the ruling's premise that 153 teaches it) — the seed text is Kai's (S15).
//
// RAILS: is_new untouched; every non-component row contains its LEGO (Italian contiguous; English by the same
// test except the K28 noun-for-pronoun rows, listed); components tile (L4); no new vocabulary (per word, ≤ seed);
// ZUT: no new English already mapped to a different Italian; seeds 360/614/152 unapproved; the old intro clips
// detached (kept), new intro lines rendered from the live template on temporary Sonia (A23: one temporary
// presentation cast row, restored byte-identical), linked at course_legos / lego_introductions /
// course_audio.lego_id; component intro links unlinked (never played); Italian slots on Elsa/Benigno; the
// silent English prompt slots are printed for ita-sonia-temporary-fill (SCOPE=ids); strict intro-mirror runs
// at exit via recordContentEdit. Sibling jobs own 347/367/390/391/485 and 348/609/201/519/246 — untouched.
//
//   node tools/course-optimization/ita-360-614-152-2026-09-28.cjs            # dry run
//   APPLY=1 node tools/course-optimization/ita-360-614-152-2026-09-28.cjs    # apply + audio

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'ita_for_eng';
const SWEEP = 'ita-360-614-152-2026-09-28';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const JOB = '#626·I';
const RULING = 'Kai, 2026-09-28 22:30Z (job #626·I): S0360L01 → "did he say anything else? | ha detto qualcos\'altro?" (K28); S0614L01 grows to "where your family live | dove vive la tua famiglia"; seed 152: every l\'avrei used before S0153L01 teaches it is removed from the phrases (fixed, none deleted, no LEGO deleted); components tile, every phrase contains its LEGO, is_new as it was, intros mirror, seeds unapproved';
const ELSA = { voiceId: 'azure_it-IT-ElsaNeural', voiceName: 'it-IT-ElsaNeural' };
const BENIGNO = { voiceId: 'azure_it-IT-BenignoNeural', voiceName: 'it-IT-BenignoNeural' };
const AZURE_VOICE_IDS = { target1: ['azure_it-IT-ElsaNeural', 'it-IT-ElsaNeural'], target2: ['azure_it-IT-BenignoNeural', 'it-IT-BenignoNeural'] };
const SONIA = { voiceId: 'azure_en-GB-SoniaNeural', castVoiceId: 'en-GB-SoniaNeural', voiceName: 'en-GB-SoniaNeural' };
const SONIA_IDS = ['azure_en-GB-SoniaNeural', 'en-GB-SoniaNeural'];
const TEMP_PRES_ROW = { slot: 'presentation', language: 'eng', gender: 'f', rank: 1, voice_id: SONIA.castVoiceId };

// ── Rules (pure; the test exercises these) ─────────────────────────────────────────────
const norm = (s) => String(s || '').toLowerCase().replace(/’/g, "'").replace(/[.,!?;:"«»]+/g, ' ').replace(/\s+/g, ' ').trim();
const words = (s) => norm(s).split(' ').filter(Boolean);
const squash = (s) => norm(s).replace(/\s+/g, '');
const containsChunk = (hay, needle) => (' ' + norm(hay) + ' ').includes(' ' + norm(needle) + ' ');
const legoInSeed = (seed, l) => containsChunk(seed.known, l.known) && containsChunk(seed.target, l.target);
const componentsTile = (l) => squash(l.components.map(c => c.target).join(' ')) === squash(l.target) && squash(l.components.map(c => c.known).join(' ')) === squash(l.known);
/** The clitic+avere tokens (l'avrei, l'ho, me l'ha …) a target text carries. */
const CLITIC_AVERE = /(?:^|\s)((?:gliel|me l|te l|ce l|ve l|se l|l)'(?:ho|hai|ha|abbiamo|avete|hanno|avevo|avevi|aveva|avevamo|avevate|avevano|avrò|avrai|avrà|avremo|avrete|avranno|avrei|avresti|avrebbe|avremmo|avreste|avrebbero|abbia|abbiate|abbiano|avessi|avesse|avessimo|aveste|avessero))(?=\s|$)/g;
function cliticTokens(target) { const out = []; const t = String(target || '').toLowerCase().replace(/’/g, "'"); let m; CLITIC_AVERE.lastIndex = 0; while ((m = CLITIC_AVERE.exec(t))) out.push(m[1]); return out; }
/**
 * Kai's rule for seed 152, general form: a bound form is used only at or after the seed whose LEGO teaches it.
 * rows: [{id, seed, target}], taughtAt: Map token → first LEGO seed (undefined = never taught).
 * Returns the rows that use a token before it is taught.
 */
function usedBeforeTaught(rows, taughtAt) {
  const out = [];
  for (const r of rows) for (const tok of cliticTokens(r.target)) {
    const first = taughtAt.get(tok);
    if (first === undefined || r.seed < first) out.push({ id: r.id, seed: r.seed, token: tok, taughtAt: first ?? null });
  }
  return out;
}

// ── The changes ────────────────────────────────────────────────────────────────────────
const SEEDS = {
  360: { known: 'did your friend say anything else?', target: "il tuo amico ha detto qualcos'altro?" },
  614: { known: "it's near where your family live", target: 'È vicino a dove vive la tua famiglia' },
  152: { known: 'I would have done it differently if I had known what you wanted', target: "l'avrei fatto diversamente se avessi saputo cosa volevi" },
};
const OLD_LEGOS = {
  S0360L01: { id: 'S0360L01', type: 'M', known: 'say anything else', target: "ha detto qualcos'altro", components: [{ known: 'said', target: 'ha detto' }, { known: 'anything else', target: "qualcos'altro" }] },
  S0614L01: { id: 'S0614L01', type: 'A', known: 'lives', target: 'vive', components: [] },
};
const NEW_LEGOS = {
  S0360L01: { id: 'S0360L01', seed: 360, idx: 1, type: 'M', known: 'did he say anything else?', target: "ha detto qualcos'altro?", components: [{ known: 'did he say', target: 'ha detto' }, { known: 'anything else', target: "qualcos'altro" }] },
  S0614L01: { id: 'S0614L01', seed: 614, idx: 1, type: 'M', known: 'where your family live', target: 'dove vive la tua famiglia', components: [{ known: 'where', target: 'dove' }, { known: 'your family live', target: 'vive la tua famiglia' }] },
};
/** Seed 152's LEGOs do not move; the phrases under them do. */
const LEGOS_152 = {
  S0152L01: { id: 'S0152L01', known: 'I would have done', target: 'avrei fatto' },
  S0152L02: { id: 'S0152L02', known: 'differently', target: 'diversamente' },
  S0152L03: { id: 'S0152L03', known: 'if I had known', target: 'se avessi saputo' },
};
const LEGOS_AFTER = { ...NEW_LEGOS, ...LEGOS_152 };
const L = (id) => LEGOS_AFTER[id];

const CHANGES = [
  // ── 360 ──
  { id: 'S0360L01C01', lego: 'S0360L01', role: 'component', before: { known: 'said', target: 'ha detto' }, after: { known: 'did he say', target: 'ha detto' } },
  { id: 'S0360L01B01', lego: 'S0360L01', role: 'build', before: { known: 'say anything else', target: "ha detto qualcos'altro" }, after: { known: 'did he say anything else?', target: "ha detto qualcos'altro?" }, questionRerender: true },
  { id: 'S0360L01U04', lego: 'S0360L01', role: 'use', before: { known: 'she just wanted to know if he said anything else', target: "voleva solo sapere se il tuo amico ha detto qualcos'altro" }, after: { known: 'she just wanted to know if he said anything else', target: "voleva solo sapere se ha detto qualcos'altro" }, sameItalian: true },
  // ── 614 ──
  { id: 'S0614L01B01', lego: 'S0614L01', role: 'build', before: { known: 'where she lives', target: 'dove vive' }, after: { known: 'where your family live', target: 'dove vive la tua famiglia' } },
  { id: 'S0614L01B02', lego: 'S0614L01', role: 'build', before: { known: "it's near where she lives", target: 'è vicino a dove vive' }, after: { known: 'near where your family live', target: 'vicino a dove vive la tua famiglia' } },
  { id: 'S0614L01B03', lego: 'S0614L01', role: 'build', before: { known: 'your family lives', target: 'vive la tua famiglia' }, after: { known: "it's near where your family live", target: 'è vicino a dove vive la tua famiglia' } },
  { id: 'S0614L01U01', lego: 'S0614L01', role: 'use', before: { known: "it's near where your family live", target: 'è vicino a dove vive la tua famiglia' }, after: { known: "I think it's near where your family live", target: 'penso che sia vicino a dove vive la tua famiglia' } },
  { id: 'S0614L01U03', lego: 'S0614L01', role: 'use', before: { known: 'I want to know where she lives', target: 'voglio sapere dove vive' }, after: { known: 'I want to know where your family live', target: 'voglio sapere dove vive la tua famiglia' } },
  { id: 'S0614L01U04', lego: 'S0614L01', role: 'use', before: { known: "I don't know where she lives", target: 'non so dove vive' }, after: { known: "I don't know where your family live", target: 'non so dove vive la tua famiglia' } },
  { id: 'S0614L01U05', lego: 'S0614L01', role: 'use', before: { known: 'your family lives nearby', target: 'la tua famiglia vive vicino' }, after: { known: 'can you tell me where your family live?', target: 'puoi dirmi dove vive la tua famiglia?' } },
  // ── 152: the 15 l'avrei rows ──
  { id: 'S0152L01B04', lego: 'S0152L01', role: 'build', before: { known: 'I would have done it', target: "l'avrei fatto" }, after: { known: 'I would have done that', target: 'avrei fatto quello' } },
  { id: 'S0152L01U01', lego: 'S0152L01', role: 'use', before: { known: 'I would have done it yesterday', target: "l'avrei fatto ieri" }, after: { known: 'I would have done that yesterday', target: 'avrei fatto quello ieri' } },
  { id: 'S0152L01U02', lego: 'S0152L01', role: 'use', before: { known: 'I would have done it for you', target: "l'avrei fatto per te" }, after: { known: 'I would have done something for you', target: 'avrei fatto qualcosa per te' } },
  { id: 'S0152L01U03', lego: 'S0152L01', role: 'use', before: { known: 'I would have done it with you', target: "l'avrei fatto con te" }, after: { known: 'I would have done that with you', target: 'avrei fatto quello con te' } },
  { id: 'S0152L01U05', lego: 'S0152L01', role: 'use', before: { known: 'I would have done it this morning', target: "l'avrei fatto stamattina" }, after: { known: 'I would have done everything this morning', target: 'avrei fatto tutto stamattina' } },
  { id: 'S0152L02B03', lego: 'S0152L02', role: 'build', before: { known: 'I would have done it differently', target: "l'avrei fatto diversamente" }, after: { known: 'I would have done everything differently', target: 'avrei fatto tutto diversamente' } },
  { id: 'S0152L02U01', lego: 'S0152L02', role: 'use', before: { known: 'I would have said it differently', target: "l'avrei detto diversamente" }, after: { known: 'I would have said that differently', target: 'avrei detto quello diversamente' } },
  { id: 'S0152L02U03', lego: 'S0152L02', role: 'use', before: { known: 'I would have done it a little differently', target: "l'avrei fatto un po' diversamente" }, after: { known: 'I would have done everything a little differently', target: "avrei fatto tutto un po' diversamente" } },
  { id: 'S0152L02U04', lego: 'S0152L02', role: 'use', before: { known: 'I would have done it differently for you', target: "l'avrei fatto diversamente per te" }, after: { known: 'I would have done that differently for you', target: 'avrei fatto quello diversamente per te' } },
  { id: 'S0152L02U05', lego: 'S0152L02', role: 'use', before: { known: 'I think I would have done it differently', target: "penso che l'avrei fatto diversamente" }, after: { known: 'I think I would have done that differently', target: 'penso che avrei fatto quello diversamente' } },
  { id: 'S0152L02U06', lego: 'S0152L02', role: 'use', before: { known: 'I think I would have said it differently', target: "penso che l'avrei detto diversamente" }, after: { known: 'I think I would have said that differently', target: 'penso che avrei detto quello diversamente' } },
  { id: 'S0152L03U01', lego: 'S0152L03', role: 'use', before: { known: 'I would have done it if I had known', target: "l'avrei fatto se avessi saputo" }, after: { known: 'I would have done that if I had known', target: 'avrei fatto quello se avessi saputo' } },
  { id: 'S0152L03U05', lego: 'S0152L03', role: 'use', before: { known: "if I had known that, I wouldn't have done it", target: "se avessi saputo quello, non l'avrei fatto" }, after: { known: "if I had known that, I wouldn't have done anything", target: 'se avessi saputo quello, non avrei fatto niente' } },
  { id: 'S0152L03U07', lego: 'S0152L03', role: 'use', before: { known: 'if I had known what you wanted, I would have done it', target: "se avessi saputo cosa volevi, l'avrei fatto" }, after: { known: 'if I had known what you wanted, I would have done that', target: 'se avessi saputo cosa volevi, avrei fatto quello' } },
  { id: 'S0152L03U08', lego: 'S0152L03', role: 'use', before: { known: 'if I had known, I would have done it differently', target: "se avessi saputo, l'avrei fatto diversamente" }, after: { known: 'if I had known, I would have done everything differently', target: 'se avessi saputo, avrei fatto tutto diversamente' } },
];
/**
 * FOLLOW-UP (same job, after the first apply). The veracity gate refused every render ending in "qualcos'altro"
 * — 6 of 6 today on Elsa and Benigno, decode "ha detto altro" — and the three June clips of the same words that
 * have shipped since 2026-06-17 fail it the same way (probe in the evidence file). Whether Azure drops the
 * "qualcos'" or whisper does is a question for an ear (A21), not for this tool: the LEGO and B01 keep the shipped
 * June clips (their text moved by a question mark only), and U04 — silent after its Italian changed — is reworded
 * so it does not end on that word and can be voiced. APPLY=1 FOLLOWUP=1.
 */
const FOLLOWUP = [
  { id: 'S0360L01U04', lego: 'S0360L01', role: 'use', before: { known: 'she just wanted to know if he said anything else', target: "voleva solo sapere se ha detto qualcos'altro" }, after: { known: 'she just wanted to know if he said anything else yesterday', target: "voleva solo sapere se ha detto qualcos'altro ieri" }, sameItalian: true },
];
for (const c of FOLLOWUP) { c.knownChanged = norm(c.before.known) !== norm(c.after.known); c.targetChanged = norm(c.before.target) !== norm(c.after.target); }
/** New component rows for the grown 614 LEGO (positions 1–2; the eight phrases shift +2). */
const INSERTS = [
  { id: 'S0614L01C01', lego: 'S0614L01', role: 'component', position: 1, component_index: 0, known: 'where', target: 'dove' },
  { id: 'S0614L01C02', lego: 'S0614L01', role: 'component', position: 2, component_index: 1, known: 'your family live', target: 'vive la tua famiglia' },
];
/** Rows that already contain their LEGO after this pass and do not move. K28 rows carry the seed's noun for the LEGO's pronoun. */
const KEPT = [
  { id: 'S0360L01C02', lego: 'S0360L01' },
  { id: 'S0360L01B02', lego: 'S0360L01', sameItalian: true }, { id: 'S0360L01B03', lego: 'S0360L01', sameItalian: true },
  { id: 'S0360L01U01', lego: 'S0360L01', sameItalian: true }, { id: 'S0360L01U02', lego: 'S0360L01', sameItalian: true },
  { id: 'S0360L01U03', lego: 'S0360L01', sameItalian: true }, { id: 'S0360L01U06', lego: 'S0360L01', sameItalian: true },
  { id: 'S0614L01U02', lego: 'S0614L01', sameItalian: true },
  ...['B01', 'B02', 'B03', 'U06', 'U07'].map(x => ({ id: `S0152L01${x}`, lego: 'S0152L01' })),
  ...['B01', 'B02', 'U02', 'U08'].map(x => ({ id: `S0152L02${x}`, lego: 'S0152L02' })),
  ...['B01', 'B02', 'B03', 'B04', 'U02', 'U03'].map(x => ({ id: `S0152L03${x}`, lego: 'S0152L03' })),
];
for (const c of CHANGES) { c.knownChanged = norm(c.before.known) !== norm(c.after.known); c.targetChanged = norm(c.before.target) !== norm(c.after.target); }
const SEED_NUMBERS = [360, 614, 152];
const seedOf = (id) => Number(id.slice(1, 5));
/** The K28 relaxation (seed-455 precedent): a row whose English says the seed's noun for the LEGO's pronoun, or a
 *  statement for the LEGO's question, over the LEGO's OWN Italian, contains the LEGO — one Italian under two
 *  Englishes is not a defect (K3). Such rows are marked sameItalian and listed. */
const ENGLISH_CONTAINS_OR_K28 = (r, l) => containsChunk(r.known, l.known) || (!!r.sameItalian && containsChunk(r.target, l.target.replace(/\?$/, '')));
/** K28 at the LEGO boundary: the LEGO's known side may say the pronoun where the seed says the noun it stands for. */
const K28_NOUN = { S0360L01: { pronoun: 'he', noun: 'your friend' } };
const legoInSeedK28 = (seed, l) => containsChunk(seed.target, l.target) && (containsChunk(seed.known, l.known) || (K28_NOUN[l.id] && containsChunk(seed.known, l.known.replace(new RegExp(`\\b${K28_NOUN[l.id].pronoun}\\b`), K28_NOUN[l.id].noun))));

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
async function guardLive(pg, problems, log) {
  log.seedApprovedBefore = {};
  for (const n of SEED_NUMBERS) {
    const { rows: [s] } = await pg.query('SELECT known_text, target_text, approved_at FROM course_seeds WHERE course_code=$1 AND seed_number=$2', [COURSE, n]);
    if (!s || s.known_text !== SEEDS[n].known || s.target_text !== SEEDS[n].target) problems.push(`seed ${n} reads "${s?.known_text}" → "${s?.target_text}"`);
    log.seedApprovedBefore[n] = s?.approved_at || null;
  }
  const { rows: legos } = await pg.query('SELECT lego_id, type, is_new, known_text, target_text, components, presentation_audio_id FROM course_legos WHERE course_code=$1 AND seed_number = ANY($2) ORDER BY lego_id', [COURSE, SEED_NUMBERS]);
  log.legosBefore = legos;
  for (const [id, old] of Object.entries(OLD_LEGOS)) {
    const l = legos.find(x => x.lego_id === id);
    if (!l || l.known_text !== old.known || l.target_text !== old.target || l.type !== old.type) problems.push(`${id} reads "${l?.known_text}" → "${l?.target_text}" (${l?.type})`);
    if (l && JSON.stringify(l.components || []) !== JSON.stringify(old.components)) problems.push(`${id} components are ${JSON.stringify(l.components)}`);
  }
  for (const [id, l152] of Object.entries(LEGOS_152)) { const l = legos.find(x => x.lego_id === id); if (!l || norm(l.known_text) !== norm(l152.known) || norm(l.target_text) !== norm(l152.target)) problems.push(`${id} reads "${l?.known_text}" → "${l?.target_text}"`); }
  const { rows: under } = await pg.query(`SELECT split_part(id,':',2) id, seed_number, phrase_role, known_text, target_text, position FROM course_practice_phrases WHERE course_code=$1 AND seed_number = ANY($2) ORDER BY seed_number, lego_index, position`, [COURSE, SEED_NUMBERS]);
  const byId = Object.fromEntries(under.map(r => [r.id, r]));
  for (const c of CHANGES) { const r = byId[c.id]; if (!r || r.known_text !== c.before.known || r.target_text !== c.before.target || r.phrase_role !== c.role) problems.push(`${c.id} reads "${r?.known_text}" → "${r?.target_text}" (${r?.phrase_role}) — expected "${c.before.known}" → "${c.before.target}"`); }
  for (const i of INSERTS) if (byId[i.id]) problems.push(`${i.id} already exists`);
  for (const k of KEPT) { const r = byId[k.id]; if (!r) problems.push(`${k.id} missing`); else { k.known = r.known_text; k.target = r.target_text; k.role = r.phrase_role; } }
  for (const r of under) if (!CHANGES.some(c => c.id === r.id) && !KEPT.some(k => k.id === r.id)) problems.push(`${r.id} "${r.known_text}" is under seed ${r.seed_number} but not planned`);
  log.positions614 = under.filter(r => r.seed_number === 614).map(r => [r.id, r.position]);
  const FINISHED = ['ita-noun-subject-pronoun-2026-09-28', 'ita-intro-mirror-fix-2026-09-28', 'ita-sonia-temporary-fill-2026-09-28', 'ita-missing-subject-2026-09-28', 'ita-stranded-subjunctive'];
  const { rows: ev } = await pg.query(`SELECT id, surface, operation, occurred_at FROM content_edit_events WHERE course_code=$1 AND occurred_at > now() - interval '24 hours' AND surface NOT LIKE '%' || $2 || '%' AND NOT (surface LIKE ANY($4)) AND (scope->'seed_numbers' ?| $3::text[] OR scope->'lego_ids' ?| $5::text[])`,
    [COURSE, SWEEP, SEED_NUMBERS.map(String), FINISHED.map(f => `%${f}%`), Object.keys(LEGOS_AFTER)]);
  for (const e of ev) problems.push(`another surface touched one of these seeds today: ${e.surface} ${e.operation} (${e.id}, ${e.occurred_at.toISOString()}) — re-read before writing`);
}
async function guards(pg, problems, log) {
  for (const l of Object.values(NEW_LEGOS)) {
    if (!legoInSeedK28(SEEDS[l.seed], l)) problems.push(`${l.id} is not a piece of its seed on both sides`);
    if (!componentsTile(l)) problems.push(`${l.id} components do not tile the LEGO`);
  }
  // Every non-component row contains its LEGO (Italian contiguous; English, or K28 noun-for-pronoun over the same Italian)
  const rowsAfter = [...CHANGES.map(c => ({ id: c.id, lego: c.lego, role: c.role, sameItalian: c.sameItalian, ...c.after })), ...INSERTS, ...KEPT];
  log.k28Rows = [];
  for (const r of rowsAfter) {
    const l = L(r.lego);
    if (r.role === 'component') continue;
    if (!containsChunk(r.target, l.target.replace(/\?$/, ''))) problems.push(`${r.id} "${r.target}" does not contain ${r.lego} "${l.target}"`);
    if (!ENGLISH_CONTAINS_OR_K28(r, l)) problems.push(`${r.id} "${r.known}" does not contain ${r.lego} "${l.known}"`);
    else if (!containsChunk(r.known, l.known)) log.k28Rows.push(`${r.id} "${r.known}" (Italian identical: "${r.target}")`);
  }
  for (const l of Object.values(NEW_LEGOS)) {
    const comps = rowsAfter.filter(r => r.role === 'component' && r.lego === l.id).map(r => `${r.known}|${r.target}`).join('/');
    if (comps !== l.components.map(c => `${c.known}|${c.target}`).join('/')) problems.push(`${l.id} component rows (${comps}) do not match the LEGO components`);
  }
  // Seed 152: no l'avrei (or any clitic+avere form) used before the seed that teaches it — after this pass
  const { rows: legoTok } = await pg.query(`SELECT seed_number, target_text FROM course_legos WHERE course_code=$1`, [COURSE]);
  const taughtAt = new Map();
  for (const r of legoTok) for (const t of cliticTokens(r.target_text)) if (!taughtAt.has(t) || taughtAt.get(t) > r.seed_number) taughtAt.set(t, r.seed_number);
  const { rows: allPhr } = await pg.query(`SELECT split_part(id,':',2) id, seed_number, target_text FROM course_practice_phrases WHERE course_code=$1 AND phrase_role<>'component'`, [COURSE]);
  const afterById = Object.fromEntries(CHANGES.map(c => [c.id, c.after.target]));
  const before = usedBeforeTaught(allPhr.map(r => ({ id: r.id, seed: r.seed_number, target: r.target_text })), taughtAt);
  const after = usedBeforeTaught(allPhr.map(r => ({ id: r.id, seed: r.seed_number, target: afterById[r.id] ?? r.target_text })), taughtAt);
  log.cliticSweep = { taughtAt: Object.fromEntries(taughtAt), before, after };
  const lavreiAfter = after.filter(x => x.token === "l'avrei");
  if (lavreiAfter.length) problems.push(`l'avrei still used before seed 153 after this pass: ${lavreiAfter.map(x => x.id).join(', ')}`);
  log.otherEarlyTokens = after.filter(x => x.token !== "l'avrei");
  // no new vocabulary
  log.vocab = {};
  for (const c of [...CHANGES, ...INSERTS.map(i => ({ id: i.id, after: i, lego: i.lego }))]) {
    const seed = seedOf(c.id);
    const nk = await newVocabulary(pg, seed, c.after.known, 'known'), nt = await newVocabulary(pg, seed, c.after.target, 'target');
    if (nk.length || nt.length) { log.vocab[c.id] = { known: nk, target: nt }; problems.push(`${c.id} introduces vocabulary not taught by ${seed}: ${[...nk, ...nt].join(', ')}`); }
  }
  for (const l of Object.values(NEW_LEGOS)) { const nt = await newVocabulary(pg, l.seed, l.target, 'target'); if (nt.length) problems.push(`${l.id} target has untaught words ${nt.join(', ')}`); }
  // ZUT vs the course: a new known must not already map to a different target
  const pairs = [...Object.values(NEW_LEGOS), ...CHANGES.filter(c => c.role !== 'component').map(c => ({ id: c.id, ...c.after }))];
  const ours = new Set([...pairs.map(p => p.id), ...KEPT.map(k => k.id), ...INSERTS.map(i => i.id)]);
  log.zut = []; log.targetSide = [];
  for (const p of pairs) {
    const { rows } = await pg.query(
      `SELECT id, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND phrase_role<>'component' AND (lower(trim(known_text))=lower(trim($2)) OR lower(trim(target_text))=lower(trim($3)))
       UNION ALL SELECT lego_id, known_text, target_text FROM course_legos WHERE course_code=$1 AND (lower(trim(known_text))=lower(trim($2)) OR lower(trim(target_text))=lower(trim($3)))`, [COURSE, p.known, p.target]);
    for (const r of rows) {
      const rid = r.id.replace(`${COURSE}:`, ''); if (ours.has(rid)) continue;
      const sameK = norm(r.known_text) === norm(p.known), sameT = norm(r.target_text) === norm(p.target);
      if (sameK && !sameT) log.zut.push(`${p.id} "${p.known}" → "${p.target}" vs ${rid} "${r.known_text}" → "${r.target_text}"`);
      else if (sameT && !sameK) log.targetSide.push(`${p.id} "${p.known}" shares its Italian with ${rid} "${r.known_text}"`);
    }
  }
  problems.push(...log.zut);
  // O12: the old glosses elsewhere in the course
  const { rows: old } = await pg.query(`SELECT split_part(id,':',2) id, seed_number, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND seed_number <> ALL($2) AND (target_text ~* 'detto qualcos''altro' OR target_text ~* '\\mvive\\M' OR known_text ~* 'sa(y|id) anything else')`, [COURSE, SEED_NUMBERS]);
  log.oldGlossElsewhere = old;
  const { rows: tpl } = await pg.query(`SELECT template FROM presentation_templates WHERE known_lang='eng' AND is_active ORDER BY priority DESC LIMIT 1`);
  if (!tpl.length) problems.push('no active eng presentation template');
}

// ── Apply ───────────────────────────────────────────────────────────────────────────────
async function applyContent(pg, supabase, log) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const legoEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'lego-edit', scope: { seed_numbers: [360, 614], lego_ids: Object.keys(NEW_LEGOS), rows: 2 },
    detail: { ruling: RULING, job: JOB, legos: Object.values(NEW_LEGOS).map(l => ({ id: l.id, from: OLD_LEGOS[l.id], to: { type: l.type, known: l.known, target: l.target, components: l.components } })) } });
  const phraseEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-edit', scope: { seed_numbers: SEED_NUMBERS, phrase_ids: [...CHANGES, ...INSERTS].map(c => `${COURSE}:${c.id}`), rows: CHANGES.length + INSERTS.length },
    detail: { ruling: RULING, job: JOB, changes: CHANGES.map(c => ({ id: `${COURSE}:${c.id}`, role: c.role, known_from: c.before.known, target_from: c.before.target, known_to: c.after.known, target_to: c.after.target })), inserts: INSERTS.map(i => ({ id: `${COURSE}:${i.id}`, role: i.role, known: i.known, target: i.target })) } });
  const unapproveEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'unapprove', scope: { seed_numbers: SEED_NUMBERS, rows: 3 }, detail: { why: 'LEGOs re-cut / phrases rewritten under Kai\'s rulings of 2026-09-28 22:30Z; need his read', job: JOB, approved_at_before: log.seedApprovedBefore } });
  log.events = { legoEvent, phraseEvent, unapproveEvent };
  await pg.query('BEGIN');
  try {
    // 1. LEGOs re-textured in their existing slots (never deleted); is_new untouched. A side whose words did not
    //    move keeps its clips. The old intro clip is detached (kept, never deleted) and the drop logged.
    for (const l of Object.values(NEW_LEGOS)) {
      const src = log.legosBefore.find(x => x.lego_id === l.id);
      const knownSame = norm(src.known_text) === norm(l.known), targetSame = norm(src.target_text) === norm(l.target);
      const r = await pg.query(`UPDATE course_legos SET type=$1, known_text=$2, target_text=$3, components=$4, known_audio_id=CASE WHEN $5 THEN known_audio_id ELSE NULL END,
          target1_audio_id=CASE WHEN $6 THEN target1_audio_id ELSE NULL END, target2_audio_id=CASE WHEN $6 THEN target2_audio_id ELSE NULL END,
          target1_duration_ms=CASE WHEN $6 THEN target1_duration_ms ELSE NULL END, target2_duration_ms=CASE WHEN $6 THEN target2_duration_ms ELSE NULL END,
          presentation_audio_id=NULL, last_edit_event_id=$7, updated_at=now() WHERE course_code=$8 AND lego_id=$9 AND known_text=$10 AND target_text=$11`,
        [l.type, l.known, l.target, JSON.stringify(l.components), knownSame, targetSame, legoEvent, COURSE, l.id, src.known_text, src.target_text]);
      if (r.rowCount !== 1) throw new Error(`${l.id}: ${r.rowCount} rows (moved under us)`);
      if (src.presentation_audio_id) {
        const { rows: [a] } = await pg.query('SELECT text FROM course_audio WHERE id::text=$1', [src.presentation_audio_id]);
        await pg.query('UPDATE course_audio SET lego_id=NULL WHERE id::text=$1 AND lego_id=$2', [src.presentation_audio_id, l.id]);
        await pg.query(`INSERT INTO content_audio_link_drops (table_name, row_id, course_code, seed_number, column_name, role, old_audio_id, old_text, reason) VALUES ('course_legos',$1,$2,$3,'presentation_audio_id','presentation',$4,$5,$6)`,
          [l.id, COURSE, l.seed, src.presentation_audio_id, a?.text || null, `${SWEEP}: intro quotes the old cut ("${src.known_text}"), LEGO is now "${l.known}" — detached, clip kept (job ${JOB})`]);
      }
    }
    // 2. 614: shift the eight phrases +2 (descending, positions are unique) and insert the two component rows.
    for (const [id, pos] of [...log.positions614].sort((a, b) => b[1] - a[1])) {
      const m = await pg.query('UPDATE course_practice_phrases SET position=$1 WHERE course_code=$2 AND id=$3 AND position=$4', [pos + 2, COURSE, `${COURSE}:${id}`, pos]);
      if (m.rowCount !== 1) throw new Error(`${id} position shift: ${m.rowCount} rows`);
    }
    for (const i of INSERTS) {
      await pg.query(`INSERT INTO course_practice_phrases (id, course_code, seed_number, lego_index, position, known_text, target_text, word_count, lego_count, metadata, status, phrase_role, connected_lego_ids, lego_position, lego_id, introduce, last_edit_event_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,1,$9,'draft','component','{}','middle',$10,true,$11)`,
        [`${COURSE}:${i.id}`, COURSE, seedOf(i.id), 1, i.position, i.known, i.target, i.target.length, JSON.stringify({ buildup: 'component', component_index: i.component_index }), i.lego, phraseEvent]);
    }
    // 3. Phrase rows re-textured in place; a side whose words did not move keeps its clips.
    for (const c of CHANGES) {
      const u = await pg.query(`UPDATE course_practice_phrases SET known_text=$1, target_text=$2, word_count=$3, lego_count=$4,
          known_audio_id=CASE WHEN $5 THEN NULL ELSE known_audio_id END, target1_audio_id=CASE WHEN $6 THEN NULL ELSE target1_audio_id END, target2_audio_id=CASE WHEN $6 THEN NULL ELSE target2_audio_id END,
          qa_checked=NULL, decomposition=NULL, decomposition_course_version=NULL, display_tiling=NULL, display_tiling_version=NULL, last_edit_event_id=$7, updated_at=now()
        WHERE course_code=$8 AND id=$9 AND known_text=$10 AND target_text=$11`,
        [c.after.known, c.after.target, c.after.target.length, c.after.target.split(/\s+/).length, c.knownChanged, c.targetChanged, phraseEvent, COURSE, `${COURSE}:${c.id}`, c.before.known, c.before.target]);
      if (u.rowCount !== 1) throw new Error(`${c.id}: ${u.rowCount} rows (row moved under us — re-read and re-plan)`);
    }
    await unlinkComponentIntros(pg, log, phraseEvent);
    const un = await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number = ANY($3)', [unapproveEvent, COURSE, SEED_NUMBERS]);
    if (un.rowCount !== 3) throw new Error('seed unapprove');
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
  await refreshNow();
  const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs');
  log.audioPass = await queueAudioPass(supabase, { courseCode: COURSE, requestedBy: `@${SWEEP}`, reason: `job ${JOB}: S0360L01 / S0614L01 re-cut, 15 l'avrei phrases at 152 rewritten; Italian on Elsa/Benigno by the tool, English prompts on temporary Sonia, intros re-mirrored`, metadata: { job: JOB, seeds: SEED_NUMBERS, rows: CHANGES.length + INSERTS.length + 2 } });
}

/** Component rows never play an intro (Tom, 2026-08-06); their stale links quote the old cut. Unlinked, clips kept. */
async function unlinkComponentIntros(pg, log, eventId) {
  const { rows } = await pg.query(`SELECT p.id, p.seed_number, p.known_text, p.presentation_audio_id, a.text FROM course_practice_phrases p LEFT JOIN course_audio a ON a.id=p.presentation_audio_id WHERE p.course_code=$1 AND p.seed_number = ANY($2) AND p.phrase_role='component' AND p.presentation_audio_id IS NOT NULL`, [COURSE, SEED_NUMBERS]);
  log.componentsUnlinked = [];
  for (const r of rows) {
    const u = await pg.query('UPDATE course_practice_phrases SET presentation_audio_id=NULL, last_edit_event_id=COALESCE($1, last_edit_event_id), updated_at=now() WHERE course_code=$2 AND id=$3 AND presentation_audio_id=$4', [eventId || null, COURSE, r.id, r.presentation_audio_id]);
    if (u.rowCount === 1) await pg.query(`INSERT INTO content_audio_link_drops (table_name, row_id, course_code, seed_number, column_name, role, old_audio_id, old_text, reason) VALUES ('course_practice_phrases',$1,$2,$3,'presentation_audio_id','presentation',$4,$5,$6)`,
      [r.id, COURSE, r.seed_number, r.presentation_audio_id, r.text, `${SWEEP}: component intro ("${r.text}"); components are never introduced (Tom, 2026-08-06) — unlinked, clip kept (job ${JOB})`]);
    log.componentsUnlinked.push({ id: r.id, known: r.known_text, link: r.presentation_audio_id, intro: r.text, done: u.rowCount === 1 });
  }
}

// ── Audio ──────────────────────────────────────────────────────────────────────────────
function ttsDeps() {
  process.env.PHASE8_NO_LISTEN = '1';
  return {
    phase8: require('../../services/phases/phase8-audio-v13.cjs'), ttsService: require('../../services/tts-service.cjs'), veracity: require('../../services/audio-veracity.cjs'),
    voiceConfigService: require('../../services/voice-config-service.cjs'), writeOrSwapClip: require('../../services/shared/audio-revision-swap.cjs').writeOrSwapClip,
    normalizeForAudio: require('../../services/shared/text-normalize.cjs').normalizeForAudio, S3: require('@aws-sdk/client-s3'), uuidv4: require('uuid').v4,
  };
}
async function renderClip(supabase, { text, language, role, voice, voiceIds, intro }) {
  const d = ttsDeps();
  const s3 = new d.S3.S3Client({ region: process.env.AWS_REGION || 'eu-west-1' });
  const renderAndMaster = async () => {
    const out = await d.ttsService.generateWithRetry(text, 'azure', { door: { courseCode: COURSE, intro: !!intro, language, voiceBound: true }, subscriptionKey: process.env.AZURE_SPEECH_KEY, region: process.env.AZURE_SPEECH_REGION || 'westeurope', voiceName: voice.voiceName, speed: 1 });
    if (out.existingClip && !voiceIds.includes(out.existingClip.voice_id)) throw new Error(`door offered ${out.existingClip.voice_id}; ${voice.voiceName} only`);
    const { buffer, durationMs } = await d.phase8.masterAudio(out.audioBuffer, text, await d.voiceConfigService.masteringOptsFor(voice.voiceName, 'azure'));
    return { buffer, durationMs, wordBoundaries: out.wordBoundaries };
  };
  const gated = await d.veracity.renderChecked({ render: renderAndMaster, expectedText: text, language, sampler: d.veracity.ALWAYS_SAMPLER, logger: console, meta: { courseCode: COURSE, role, voiceId: voice.voiceName, originalText: text } });
  if (!gated.published) throw new Error(`veracity gate: quarantined after ${gated.attempts} attempts (${gated.verdict?.reason})`);
  const newAudioId = d.uuidv4().toUpperCase(), newS3Key = `mastered/${newAudioId}.mp3`;
  await s3.send(new d.S3.PutObjectCommand({ Bucket: d.phase8.S3_BUCKET, Key: newS3Key, Body: gated.buffer, ContentType: 'audio/mpeg', CacheControl: 'public, max-age=31536000, immutable' }));
  const verdictColumns = d.veracity.verdictColumns(gated.verdict, { checker: SWEEP, attempts: gated.attempts });
  const textNormalized = d.normalizeForAudio(text);
  const base = { course_code: COURSE, text, text_normalized: textNormalized, language, role, voice_id: voice.voiceId, origin: 'tts' };
  const out = await d.writeOrSwapClip({ supabase, identity: { course_code: COURSE, text_normalized: textNormalized, language, role, voice_id: voice.voiceId }, insertRow: { ...base, s3_key: newS3Key, duration_ms: gated.durationMs, word_boundaries: gated.wordBoundaries || null, ...verdictColumns }, swapPatch: { voice_id: voice.voiceId, origin: 'tts', word_boundaries: gated.wordBoundaries || null, text, ...verdictColumns }, newS3Key, durationMs: gated.durationMs, source: SWEEP, acceptedBy: `${SWEEP} (${role}, ${voice.voiceName})`, reason: RULING, logger: console });
  return { audioId: out.audioId, durationMs: gated.durationMs };
}
/** Italian: every NULL target slot on the changed rows — link an existing Elsa/Benigno clip, else render.
 *  Rows marked questionRerender (the 360 LEGO and B01 whose Italian gained a "?") are re-rendered as questions
 *  whatever the slot holds (A7): same identity → writeOrSwapClip swaps the bytes in place. */
async function fillItalian(pg, supabase, log) {
  const ids = CHANGES.filter(c => c.targetChanged || c.questionRerender).map(c => `${COURSE}:${c.id}`);
  const { rows } = await pg.query(
    `SELECT 'course_legos' AS tbl, lego_id AS id, target_text, target1_audio_id, target2_audio_id FROM course_legos WHERE course_code=$1 AND lego_id = ANY($2)
     UNION ALL SELECT 'course_practice_phrases', id, target_text, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($3) ORDER BY 2`, [COURSE, Object.keys(NEW_LEGOS), ids]);
  const idCol = (tbl) => tbl === 'course_legos' ? 'lego_id' : 'id';
  const question = new Set(['S0360L01', ...CHANGES.filter(c => c.questionRerender).map(c => `${COURSE}:${c.id}`)]);
  for (const r of rows) for (const role of ['target1', 'target2']) {
    const force = question.has(r.id);
    if (r[`${role}_audio_id`] && !force) continue;
    const entry = { tbl: r.tbl, id: r.id, role, text: r.target_text }; log.audio.push(entry);
    const voice = role === 'target1' ? ELSA : BENIGNO;
    try {
      let audioId = null;
      if (!force) {
        const { rows: have } = await pg.query(`SELECT id, voice_id FROM course_audio WHERE language='ita' AND text_normalized=normalize_text($1) AND s3_key IS NOT NULL AND s3_key NOT LIKE 'pending/%' AND voice_id = ANY($2) AND text=$1 ORDER BY (course_code=$3) DESC, (role=$4) DESC, created_at DESC LIMIT 1`, [r.target_text, AZURE_VOICE_IDS[role], COURSE, role]);
        audioId = have[0]?.id; if (audioId) entry.result = `linked existing ${have[0].voice_id} clip ${audioId}`;
      }
      if (!audioId) { const out = await renderClip(supabase, { text: r.target_text, language: 'ita', role, voice, voiceIds: AZURE_VOICE_IDS[role] }); audioId = out.audioId; entry.result = `rendered ${voice.voiceName} clip ${audioId} (${out.durationMs} ms)${force ? ' [question re-render]' : ''}`; }
      await pg.query(`UPDATE ${r.tbl} SET ${role}_audio_id=$1 WHERE course_code=$2 AND ${idCol(r.tbl)}=$3 AND target_text=$4`, [audioId, COURSE, r.id, r.target_text]);
      const { rows: [now] } = await pg.query(`SELECT a.id, a.voice_id, a.text FROM ${r.tbl} x LEFT JOIN course_audio a ON a.id=x.${role}_audio_id WHERE x.course_code=$1 AND x.${idCol(r.tbl)}=$2`, [COURSE, r.id]);
      entry.linked = now?.id || null; entry.linkedVoice = now?.voice_id || null; entry.linkedText = now?.text || null;
      if (!now?.id || !AZURE_VOICE_IDS[role].includes(now.voice_id)) entry.result += ` — SLOT NOT ON CAST VOICE (${now?.voice_id})`;
    } catch (e) { entry.result = `REFUSED/FAILED: ${e.message}`; }
  }
}
/** The two intros: the line the live template gives for the new chunk (prior frame kept), rendered on Sonia
 *  under ONE temporary presentation cast row (restored byte-identical), linked at the three places the learner path reads. */
async function fillIntros(pg, supabase, log) {
  const mirror = require('../../services/shared/intro-mirror.cjs');
  const { localisedLangName } = require('../../services/phases/presentation-author.cjs');
  const { rows: [tpl] } = await pg.query(`SELECT template FROM presentation_templates WHERE known_lang='eng' AND is_active ORDER BY priority DESC LIMIT 1`);
  const compiled = mirror.compileTemplate(tpl.template, { knownLang: 'eng' });
  const targetLangName = localisedLangName('ita', 'eng');
  const castKey = (r) => `${r.slot}|${r.language}|${r.gender}|${r.rank}|${r.voice_id}|${r.notes ?? ''}|${r.assigned_by ?? ''}|${r.created_at?.toISOString?.() ?? r.created_at}|${r.updated_at?.toISOString?.() ?? r.updated_at}`;
  const engCast = async () => (await pg.query(`SELECT slot, language, gender, rank, voice_id, notes, assigned_by, created_at, updated_at FROM voice_language_roles WHERE language='eng' ORDER BY slot, gender, rank, voice_id`)).rows;
  log.intros = [];
  for (const l of Object.values(NEW_LEGOS)) {
    const src = log.legosBefore.find(x => x.lego_id === l.id);
    const { rows: [prior] } = src.presentation_audio_id ? await pg.query('SELECT text FROM course_audio WHERE id::text=$1', [src.presentation_audio_id]) : { rows: [null] };
    const e = mirror.expectedLine({ template: tpl.template, targetLangName, knownText: l.known, priorText: prior?.text || null, compiled, contextText: SEEDS[l.seed].known });
    const entry = { lego: l.id, frame: e.frame, text: e.text, prior: prior?.text || null }; log.intros.push(entry);
    const { rows: [cur] } = await pg.query('SELECT presentation_audio_id FROM course_legos WHERE course_code=$1 AND lego_id=$2', [COURSE, l.id]);
    if (cur.presentation_audio_id) { entry.result = `already linked ${cur.presentation_audio_id}`; continue; }
    const before = await engCast();
    let audioId = null, durationMs = null;
    const { rows: have } = await pg.query(`SELECT id, duration_ms FROM course_audio WHERE course_code=$1 AND language='eng' AND role='presentation' AND text_normalized=normalize_text($2) AND s3_key IS NOT NULL AND s3_key NOT LIKE 'pending/%' AND voice_id = ANY($3) ORDER BY created_at DESC LIMIT 1`, [COURSE, e.text, SONIA_IDS]);
    if (have[0]) { audioId = have[0].id; durationMs = have[0].duration_ms; entry.result = `linked existing Sonia intro clip ${audioId}`; }
    else {
      const { rows: theirs } = await pg.query(`SELECT assigned_by FROM voice_language_roles WHERE slot='presentation' AND language='eng' AND voice_id=$1`, [SONIA.castVoiceId]);
      const ownRow = !theirs.length;
      try {
        if (ownRow) await pg.query(`INSERT INTO voice_language_roles (slot, language, gender, rank, voice_id, notes, assigned_by) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [TEMP_PRES_ROW.slot, TEMP_PRES_ROW.language, TEMP_PRES_ROW.gender, TEMP_PRES_ROW.rank, TEMP_PRES_ROW.voice_id, `TEMPORARY — ${RULING}. Removed by the same run.`, SWEEP]);
        const out = await renderClip(supabase, { text: e.text, language: 'eng', role: 'presentation', voice: SONIA, voiceIds: SONIA_IDS, intro: true });
        audioId = out.audioId; durationMs = out.durationMs; entry.result = `rendered Sonia intro clip ${audioId} (${durationMs} ms)`; entry.castRow = ownRow ? 'own temporary row' : `rode ${theirs[0].assigned_by}'s temporary row`;
      } catch (err) { entry.result = `REFUSED/FAILED: ${err.message}`; }
      finally {
        if (ownRow) await pg.query(`DELETE FROM voice_language_roles WHERE slot=$1 AND language=$2 AND gender=$3 AND rank=$4 AND voice_id=$5 AND assigned_by=$6`, [TEMP_PRES_ROW.slot, TEMP_PRES_ROW.language, TEMP_PRES_ROW.gender, TEMP_PRES_ROW.rank, TEMP_PRES_ROW.voice_id, SWEEP]);
        const after = await engCast();
        entry.castRestored = before.length === after.length && before.every((r, i) => castKey(r) === castKey(after[i]));
        if (ownRow && !entry.castRestored) throw new Error('eng cast NOT byte-identical after the temporary Sonia presentation row was removed');
      }
      if (!audioId) continue;
    }
    await pg.query('UPDATE course_legos SET presentation_audio_id=$1, last_edit_event_id=COALESCE($2, last_edit_event_id) WHERE course_code=$3 AND lego_id=$4 AND presentation_audio_id IS NULL', [audioId, log.events?.legoEvent || null, COURSE, l.id]);
    await pg.query(`INSERT INTO lego_introductions (course_code, lego_id, presentation_audio_id, audio_uuid, duration_ms, updated_at) VALUES ($1,$2,$3,$3,$4,now()) ON CONFLICT (course_code, lego_id) DO UPDATE SET presentation_audio_id=EXCLUDED.presentation_audio_id, audio_uuid=EXCLUDED.audio_uuid, duration_ms=COALESCE(EXCLUDED.duration_ms, lego_introductions.duration_ms), updated_at=now()`, [COURSE, l.id, audioId, durationMs]);
    await pg.query('UPDATE course_audio SET lego_id=$1 WHERE id=$2 AND (lego_id IS NULL OR lego_id<>$1)', [l.id, audioId]);
    entry.audioId = audioId;
  }
}
async function silentEnglish(pg) {
  const { rows } = await pg.query(`SELECT id FROM course_practice_phrases WHERE course_code=$1 AND seed_number = ANY($2) AND phrase_role<>'component' AND known_audio_id IS NULL UNION ALL SELECT lego_id FROM course_legos WHERE course_code=$1 AND seed_number = ANY($2) AND known_audio_id IS NULL ORDER BY 1`, [COURSE, SEED_NUMBERS]);
  return rows.map(r => r.id);
}

async function followup(pg, supabase, log) {
  const { rows: [r] } = await pg.query(`SELECT known_text, target_text, phrase_role FROM course_practice_phrases WHERE course_code=$1 AND id=$2`, [COURSE, `${COURSE}:S0360L01U04`]);
  const c = FOLLOWUP[0];
  if (!r || r.known_text !== c.before.known || r.target_text !== c.before.target) { log.problems.push(`follow-up: S0360L01U04 reads "${r?.known_text}" → "${r?.target_text}"`); return; }
  const l = L(c.lego);
  if (!containsChunk(c.after.target, l.target.replace(/\?$/, '')) || !ENGLISH_CONTAINS_OR_K28({ ...c.after, sameItalian: c.sameItalian }, l)) { log.problems.push('follow-up: U04 would not contain its LEGO'); return; }
  const nt = await newVocabulary(pg, 360, c.after.target, 'target'), nk = await newVocabulary(pg, 360, c.after.known, 'known');
  if (nt.length || nk.length) { log.problems.push(`follow-up: new vocabulary ${[...nk, ...nt].join(', ')}`); return; }
  const { rows: zut } = await pg.query(`SELECT id, target_text FROM course_practice_phrases WHERE course_code=$1 AND lower(trim(known_text))=lower(trim($2)) AND id<>$3`, [COURSE, c.after.known, `${COURSE}:${c.id}`]);
  if (zut.some(z => norm(z.target_text) !== norm(c.after.target))) { log.problems.push(`follow-up: ZUT ${JSON.stringify(zut)}`); return; }
  if (!process.env.APPLY) { console.log(`FOLLOW-UP PLAN: ${c.id} "${c.before.known}" → "${c.before.target}"  ⇒  "${c.after.known}" → "${c.after.target}"`); return; }
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const ev = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-edit', scope: { seed_numbers: [360], phrase_ids: [`${COURSE}:${c.id}`], rows: 1 },
    detail: { ruling: RULING, job: JOB, why: 'the veracity gate refuses every render ending in qualcos\'altro (decode "ha detto altro"; the shipped June clips fail the same way) — reworded so the USE phrase can be voiced', changes: [{ id: `${COURSE}:${c.id}`, role: c.role, known_from: c.before.known, target_from: c.before.target, known_to: c.after.known, target_to: c.after.target }] } });
  const u = await pg.query(`UPDATE course_practice_phrases SET known_text=$1, target_text=$2, word_count=$3, lego_count=$4, known_audio_id=NULL, target1_audio_id=NULL, target2_audio_id=NULL, qa_checked=NULL, decomposition=NULL, decomposition_course_version=NULL, display_tiling=NULL, display_tiling_version=NULL, last_edit_event_id=$5, updated_at=now() WHERE course_code=$6 AND id=$7 AND known_text=$8 AND target_text=$9`,
    [c.after.known, c.after.target, c.after.target.length, c.after.target.split(/\s+/).length, ev, COURSE, `${COURSE}:${c.id}`, c.before.known, c.before.target]);
  if (u.rowCount !== 1) throw new Error('follow-up: row moved');
  log.followup = { event: ev, change: c };
  for (const role of ['target1', 'target2']) {
    const voice = role === 'target1' ? ELSA : BENIGNO; const entry = { tbl: 'course_practice_phrases', id: `${COURSE}:${c.id}`, role, text: c.after.target }; log.audio.push(entry);
    try { const out = await renderClip(supabase, { text: c.after.target, language: 'ita', role, voice, voiceIds: AZURE_VOICE_IDS[role] }); await pg.query(`UPDATE course_practice_phrases SET ${role}_audio_id=$1 WHERE course_code=$2 AND id=$3 AND target_text=$4`, [out.audioId, COURSE, `${COURSE}:${c.id}`, c.after.target]); entry.result = `rendered ${voice.voiceName} clip ${out.audioId} (${out.durationMs} ms)`; }
    catch (e) { entry.result = `REFUSED/FAILED: ${e.message}`; log.problems.push(`follow-up ${role}: ${e.message}`); }
  }
  console.log('FOLLOW-UP AUDIO:'); for (const a of log.audio) console.log(`  ${a.id} ${a.role}: ${a.result}`);
  console.log(`ENGLISH prompt to fill on temporary Sonia:\n  SCOPE=ids IDS=${COURSE}:${c.id} APPLY=1 node tools/course-optimization/ita-sonia-temporary-fill-2026-09-28.cjs`);
}

async function main() {
  const APPLY = process.env.APPLY === '1';
  if (process.env.FOLLOWUP === '1') {
    const { Client } = require('pg'); const { createClient } = require('@supabase/supabase-js'); const { evidencePath } = require('../lib/evidence-path.cjs');
    const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
    const log = { sweep: SWEEP, job: JOB, followup: true, apply: APPLY, problems: [], audio: [] };
    await followup(pg, supabase, log);
    console.log(log.problems.length ? 'PROBLEMS:\n  ' + log.problems.join('\n  ') : 'follow-up ok');
    const f = evidencePath(`tools/course-optimization/${SWEEP}/followup-${APPLY ? 'applied' : 'dryrun'}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(log, null, 2)); console.log(`Wrote ${f}`);
    await pg.end(); process.exit(log.problems.length ? 2 : 0);
  }
  const { Client } = require('pg');
  const { createClient } = require('@supabase/supabase-js');
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const log = { sweep: SWEEP, ruling: RULING, job: JOB, apply: APPLY, started: new Date().toISOString(), problems: [], audio: [] };
  console.log(`\n══ ${COURSE} — seeds 360 / 614 / 152 — ${APPLY ? 'APPLY' : 'DRY RUN'} ══`);
  await guardLive(pg, log.problems, log);
  if (!log.problems.length) await guards(pg, log.problems, log);
  console.log('\nPLAN:');
  for (const l of Object.values(NEW_LEGOS)) console.log(`  ${l.id} "${OLD_LEGOS[l.id].known}" → "${OLD_LEGOS[l.id].target}"  ⇒  "${l.known}" → "${l.target}"  [${l.type}; ${l.components.map(c => `${c.known}|${c.target}`).join(' + ')}]`);
  for (const i of INSERTS) console.log(`  ${i.id.padEnd(12)} NEW component "${i.known}" → "${i.target}" (pos ${i.position})`);
  for (const c of CHANGES) console.log(`  ${c.id.padEnd(12)} "${c.before.known}" → "${c.before.target}"  ⇒  "${c.after.known}" → "${c.after.target}"`);
  console.log(`  unapprove seeds ${SEED_NUMBERS.join(', ')} (approved_at before: ${JSON.stringify(log.seedApprovedBefore)})`);
  if (log.k28Rows?.length) { console.log('K28 rows kept — the seed\'s noun stands for the LEGO\'s pronoun over the same Italian:'); for (const t of log.k28Rows) console.log('  ' + t); }
  if (log.targetSide?.length) { console.log('same Italian under a different English elsewhere (listed, not a defect):'); for (const t of new Set(log.targetSide)) console.log('  ' + t); }
  if (log.cliticSweep) {
    console.log(`clitic+avere sweep — first LEGO seed per token: ${JSON.stringify(log.cliticSweep.taughtAt)}`);
    console.log(`  used before taught, BEFORE this pass: ${log.cliticSweep.before.length} rows; AFTER: ${log.cliticSweep.after.length} rows`);
    const by = {}; for (const x of log.cliticSweep.after) (by[x.token] = by[x.token] || []).push(`${x.id}@${x.seed}`);
    for (const [t, ids] of Object.entries(by)) console.log(`  ${t} (taught ${log.cliticSweep.taughtAt[t] ?? 'never'}): ${ids.join(', ')}`);
  }
  console.log(`old gloss elsewhere (detto qualcos'altro / vive / say anything else): ${JSON.stringify(log.oldGlossElsewhere || [])}`);
  console.log(log.problems.length ? '\nPROBLEMS:\n  ' + log.problems.join('\n  ') : '\nguards hold');
  if (APPLY && !log.problems.length) {
    await applyContent(pg, supabase, log); console.log(`APPLIED. events=${JSON.stringify(log.events)} components unlinked=${JSON.stringify(log.componentsUnlinked)}`);
    await fillItalian(pg, supabase, log);
    console.log('ITALIAN AUDIO:'); for (const a of log.audio) console.log(`  ${a.tbl}.${a.id} ${a.role} "${a.text}": ${a.result}`);
    await fillIntros(pg, supabase, log);
    console.log('INTROS:'); for (const i of log.intros) console.log(`  ${i.lego} [${i.frame}] "${i.text}": ${i.result} castRestored=${i.castRestored ?? 'n/a'}`);
    log.silentEnglish = await silentEnglish(pg);
    console.log(`ENGLISH prompts to fill on temporary Sonia (${log.silentEnglish.length}):\n  SCOPE=ids IDS=${log.silentEnglish.join(',')} APPLY=1 node tools/course-optimization/ita-sonia-temporary-fill-2026-09-28.cjs`);
    if (log.audio.some(a => /REFUSED|FAILED|NOT ON CAST/.test(a.result)) || log.intros.some(i => /REFUSED|FAILED/.test(i.result || ''))) log.problems.push('some slots were not filled — see audio/intros');
  }
  const f = evidencePath(`tools/course-optimization/${SWEEP}/${APPLY ? 'applied' : 'dryrun'}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(log, null, 2)); console.log(`Wrote ${f}`);
  await pg.end(); process.exit(log.problems.length ? 2 : 0);
}
module.exports = { FOLLOWUP, norm, containsChunk, legoInSeed, legoInSeedK28, K28_NOUN, componentsTile, cliticTokens, usedBeforeTaught, SEEDS, OLD_LEGOS, NEW_LEGOS, LEGOS_152, LEGOS_AFTER, CHANGES, INSERTS, KEPT, ENGLISH_CONTAINS_OR_K28 };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
