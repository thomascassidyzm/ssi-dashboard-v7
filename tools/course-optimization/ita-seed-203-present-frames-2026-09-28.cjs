#!/usr/bin/env node
'use strict';
// tools/course-optimization/ita-seed-203-present-frames-2026-09-28.cjs
//
// ita_for_eng — seed 203 under Kai's rulings of 2026-09-28 (job #574·I). Two things, one pass:
//
//  1. PRESENT FRAMES FOR "faresti" (canon P24, Kai's future-in-the-past rule). Seed 203 "what would
//     you do if I asked you to help me?" → "che cosa faresti se ti chiedessi di aiutarmi?" is a
//     hypothetical in a PRESENT frame, so the conditional simple is right, and so is LEGO S0203L01
//     "what would you do" → "che cosa faresti". A phrase that puts the LEGO after a PAST frame
//     ("I wanted to know what you would do") would need the conditional perfect on the Italian
//     side ("che cosa avresti fatto"), which is not the LEGO; P24 says KEEP the LEGO and make the
//     phrase supply the frame — so the frame moves to the present: "I want to know what you would
//     do" → "voglio sapere che cosa faresti". Five rows (S0203L01U02, U03, U06, U08, S0203L02U08).
//     The census below reads every row in the course carrying "faresti" or "would you do" /
//     "what you would do" and classifies its frame, so nothing outside 203 is missed; on
//     2026-09-28 every such row lives in seed 203 and the five above are the only past frames.
//     voglio (seed 1), è (17), sia (47) are all taught before 203 — checked live, not assumed.
//  2. GROW S0203L03 (canon L27). The seed's "di" (to) sat in no LEGO: L03 was "help me" →
//     "aiutarmi". It grows to "to help me" → "di aiutarmi", so L01 + L02 + L03 tile the seed on
//     both sides. Under O12 every phrase under L03 must then CONTAIN the grown LEGO: B01 becomes
//     the LEGO itself (B02 already was — build rows repeat, as L01B01/B02 and L02B01/B02 do), and
//     the four use rows whose Italian had "aiutarmi" without "di" ("nessuno voleva aiutarmi",
//     "non fosse facile aiutarmi", "qualcuno per aiutarmi …" ×2) are rewritten as natural
//     phrases containing "to help me" → "di aiutarmi", using only vocabulary the course has
//     taught by seed 203 (checked live; note the English word "has" is first taught at 228, so
//     "nobody has time" was NOT available — hence "do you have time" / "does anyone have time").
//     The L03 intro is re-authored under O13 to quote the grown LEGO, in the course's frame B.
//
//  Seed 203 is unapproved (an edit unapproves a seed). Italian target1/target2 on Elsa/Benigno
//  through the guarded door; English prompts on the temporary Sonia route (the #522/#559 tool,
//  SCOPE=ids), so they land on the live Sonia re-voice list (A23) by construction; the L03 intro
//  on Sonia under a temporary presentation cast row, cast restored byte-identical.
//
//  Concurrency: job #573·I (missing-pronoun sweep, English only) is running course-wide. Every
//  write here is conditional on the row still reading its BEFORE text (UPDATE … WHERE known_text=
//  AND target_text=), and guardLive refuses to start if any other surface has touched our rows
//  today — so an edit of theirs is never overwritten.
//
//   node tools/course-optimization/ita-seed-203-present-frames-2026-09-28.cjs            # dry run: census, guards, plan
//   APPLY=1 node tools/course-optimization/ita-seed-203-present-frames-2026-09-28.cjs    # apply + Italian audio + intro
//   AUDIO_ONLY=1 APPLY=1 node …                                                            # re-run the audio/intro steps only

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'ita_for_eng';
const SEED = 203;
const SWEEP = 'ita-seed-203-present-frames-2026-09-28';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const JOB = '#574·I';
const RULING = 'Kai, 2026-09-28 (job #574·I): seed 203 "che cosa faresti" is a present-frame hypothetical; phrases that put it after a past frame switch the frame to the present (P24); L03 grows to "to help me → di aiutarmi" so the seed\'s "di" is taught (L27); every L03 phrase contains it (O12); intro re-authored (O13)';
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
/** Live gate's phrase-contains-LEGO rule: word MULTISET (reordering tolerated). No exception is needed here. */
function containsWords(hay, needle) {
  const h = words(hay);
  for (const w of words(needle)) { const i = h.indexOf(w); if (i < 0) return false; h.splice(i, 1); }
  return true;
}
const componentsTile = (l) => squash(l.components.map(c => c.target).join(' ')) === squash(l.target) && squash(l.components.map(c => c.known).join(' ')) === squash(l.known);
/** L27: the three LEGOs tile the seed on both sides. */
const legosTileSeed = (seed, legos) => squash(legos.map(l => l.target).join(' ')) === squash(seed.target) && squash(legos.map(l => l.known).join(' ')) === squash(seed.known);

/**
 * Rule 1 — the frame around "faresti". The Italian conditional SIMPLE is right in a present frame
 * (a main-clause question, a present-tense verb of knowing/thinking, an "if I asked you"
 * hypothetical) and wrong after a PAST frame (Kai, 2026-09-28: would after a past frame is the
 * conditional perfect). The English is what carries the frame: a past-tense matrix verb in front
 * of "what you would do" / "would you do" is a past frame. "if I asked you" is the hypothetical
 * (imperfect subjunctive), NOT a past frame, and "if it was difficult" is the same hypothetical.
 */
const PAST_MATRIX = /\b(wanted|didn't|wasn't|weren't|was|were|had|thought|said|told|knew|asked me|wondered|forgot)\b[^?]*\b(what you would do|would you do|what would you do)\b/i;
const HYPOTHETICAL_ONLY = /^\s*(what would you do|would you do)\b/i;
function frameOf(known) {
  const k = norm(known);
  if (!/\b(would you do|what you would do)\b/.test(k)) return null;
  if (HYPOTHETICAL_ONLY.test(k)) return 'present';                                   // the question itself, whatever follows
  if (/^\s*if i asked you\b/.test(k)) return 'present';                             // "if I asked you to help, would you do it?" — the hypothetical
  if (PAST_MATRIX.test(k) && !/\bif (it|i|you|he|she|we|they) (was|were|asked)\b/.test(k.split(/\b(?:what|would)\b/)[0])) return 'past';
  return 'present';
}

// ── The changes ────────────────────────────────────────────────────────────────────────
const SEED_203 = { known: 'what would you do if I asked you to help me?', target: 'che cosa faresti se ti chiedessi di aiutarmi?' };
const L01 = { known: 'what would you do', target: 'che cosa faresti' };
const L02 = { known: 'if I asked you', target: 'se ti chiedessi' };
const OLD_L03 = { known: 'help me', target: 'aiutarmi', components: null };
const NEW_L03 = { known: 'to help me', target: 'di aiutarmi', components: [{ known: 'to help me', target: 'di aiutarmi' }] };
const OLD_INTRO_L03 = { audioId: '323637b5-71db-46d5-87ee-395a43866427', text: "The Italian for: 'help me', as in — 'I wanted someone to help me answer the question', is:" };
const NEW_INTRO_L03 = "The Italian for: 'to help me', as in — 'if I asked you to help me', is:";
const OTHER_INTROS = { S0203L01: "The Italian for: 'what would you do', is:", S0203L02: "The Italian for: 'if I asked you', as in — 'what would you do if I asked you to answer?', is:" };

/** Phrase rows: before → after. `side` says which text moves (the other is asserted unchanged). */
const CHANGES = [
  // ── 1. present frames (P24) ──
  { rule: 1, lego: 'S0203L01', id: 'S0203L01U02', side: 'both', before: { known: 'I wanted to know what you would do', target: 'volevo sapere che cosa faresti' }, after: { known: 'I want to know what you would do', target: 'voglio sapere che cosa faresti' } },
  { rule: 1, lego: 'S0203L01', id: 'S0203L01U03', side: 'both', before: { known: 'I wanted to know what you would do', target: 'volevo sapere che cosa faresti' }, after: { known: 'I want to know what you would do', target: 'voglio sapere che cosa faresti' } },
  { rule: 1, lego: 'S0203L01', id: 'S0203L01U06', side: 'both', before: { known: "it wasn't easy to know what you would do", target: 'non era facile sapere che cosa faresti' }, after: { known: "it isn't easy to know what you would do", target: 'non è facile sapere che cosa faresti' } },
  { rule: 1, lego: 'S0203L01', id: 'S0203L01U08', side: 'both', before: { known: 'I think nobody was sure what you would do', target: 'penso che nessuno fosse sicuro di che cosa faresti' }, after: { known: 'I think nobody is sure what you would do', target: 'penso che nessuno sia sicuro di che cosa faresti' } },
  { rule: 1, lego: 'S0203L02', id: 'S0203L02U08', side: 'both', before: { known: 'I wanted to know what you would do if I asked you to come', target: 'volevo sapere che cosa faresti se ti chiedessi di venire' }, after: { known: 'I want to know what you would do if I asked you to come', target: 'voglio sapere che cosa faresti se ti chiedessi di venire' } },
  // ── 2. L03 grown: every non-component row under it contains "to help me" → "di aiutarmi" (O12) ──
  { rule: 2, lego: 'S0203L03', id: 'S0203L03B01', side: 'both', before: { known: 'help me', target: 'aiutarmi' }, after: { known: 'to help me', target: 'di aiutarmi' } },
  { rule: 2, lego: 'S0203L03', id: 'S0203L03U02', side: 'both', before: { known: 'nobody wanted to help me today', target: 'nessuno voleva aiutarmi oggi' }, after: { known: 'do you have time to help me today?', target: 'hai tempo di aiutarmi oggi?' } },
  { rule: 2, lego: 'S0203L03', id: 'S0203L03U04', side: 'both', before: { known: "I think it wasn't easy to help me", target: 'penso che non fosse facile aiutarmi' }, after: { known: "I know you're happy to help me", target: 'so che sei felice di aiutarmi' } },
  { rule: 2, lego: 'S0203L03', id: 'S0203L03U07', side: 'both', before: { known: 'I wanted someone to help me with the work', target: 'volevo qualcuno per aiutarmi con il lavoro' }, after: { known: 'does anyone have time to help me with the work?', target: 'qualcuno ha tempo di aiutarmi con il lavoro?' } },
  { rule: 2, lego: 'S0203L03', id: 'S0203L03U09', side: 'both', before: { known: 'I wanted someone to help me answer the question', target: 'volevo qualcuno per aiutarmi a rispondere alla domanda' }, after: { known: 'I think you have time to help me answer the question', target: 'penso che tu abbia tempo di aiutarmi a rispondere alla domanda' } },
];
/** Rule 1's Italian needs these, taught before 203 (asserted live). */
const FRAME_WORDS = ['voglio', 'è', 'sia'];
const LEGO_IDS = ['S0203L01', 'S0203L02', 'S0203L03'];

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
async function firstSeedOf(pg, target) {
  const { rows } = await pg.query(`SELECT min(seed_number) AS first FROM (SELECT seed_number, target_text FROM course_practice_phrases WHERE course_code=$1 UNION ALL SELECT seed_number, target_text FROM course_legos WHERE course_code=$1) x WHERE ' '||lower(regexp_replace(target_text,'[.,!?;:]',' ','g'))||' ' LIKE '% '||$2||' %'`, [COURSE, target]);
  return rows[0]?.first;
}
/** Rule 1 census: every row in the course carrying "faresti" or "would you do", with its frame. */
async function faresticensus(pg) {
  const { rows } = await pg.query(
    `SELECT kind, id, seed, known_text, target_text FROM (
       SELECT 'seed' kind, seed_number::text id, seed_number seed, known_text, target_text FROM course_seeds WHERE course_code=$1
       UNION ALL SELECT 'lego', lego_id, seed_number, known_text, target_text FROM course_legos WHERE course_code=$1
       UNION ALL SELECT phrase_role, split_part(id,':',2), seed_number, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND phrase_role<>'component') x
     WHERE target_text ~* '\\mfaresti\\M' OR known_text ~* 'would you do' OR known_text ~* 'what you would do' ORDER BY seed, kind, id`, [COURSE]);
  return rows.map(r => ({ kind: r.kind, id: r.id, seed: r.seed, known: r.known_text, target: r.target_text, frame: frameOf(r.known_text) }));
}
async function guardLive(pg, problems) {
  const { rows: [s] } = await pg.query('SELECT known_text, target_text FROM course_seeds WHERE course_code=$1 AND seed_number=$2', [COURSE, SEED]);
  if (!s || s.known_text !== SEED_203.known || s.target_text !== SEED_203.target) problems.push(`seed 203 reads "${s?.known_text}" → "${s?.target_text}"`);
  const { rows: legos } = await pg.query('SELECT lego_id, known_text, target_text, components, presentation_audio_id FROM course_legos WHERE course_code=$1 AND seed_number=$2 ORDER BY lego_id', [COURSE, SEED]);
  const byId = Object.fromEntries(legos.map(l => [l.lego_id, l]));
  for (const [id, exp] of [['S0203L01', L01], ['S0203L02', L02], ['S0203L03', OLD_L03]]) { const l = byId[id]; if (!l || l.known_text !== exp.known || l.target_text !== exp.target) problems.push(`${id} reads "${l?.known_text}" → "${l?.target_text}" (expected "${exp.known}" → "${exp.target}")`); }
  if (byId.S0203L03 && byId.S0203L03.components !== null) problems.push(`S0203L03 components are ${JSON.stringify(byId.S0203L03.components)}, expected none`);
  if (byId.S0203L03 && byId.S0203L03.presentation_audio_id !== OLD_INTRO_L03.audioId) problems.push(`S0203L03 presentation link is ${byId.S0203L03.presentation_audio_id}`);
  const { rows: intros } = await pg.query(`SELECT lego_id, text FROM course_audio WHERE course_code=$1 AND role='presentation' AND id::text IN (SELECT presentation_audio_id FROM course_legos WHERE course_code=$1 AND seed_number=$2)`, [COURSE, SEED]);
  for (const i of intros) { const exp = i.lego_id === 'S0203L03' ? OLD_INTRO_L03.text : OTHER_INTROS[i.lego_id]; if (i.text !== exp) problems.push(`intro ${i.lego_id} reads "${i.text}"`); }
  for (const c of CHANGES) {
    const { rows: [r] } = await pg.query('SELECT known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND id=$2', [COURSE, `${COURSE}:${c.id}`]);
    if (!r || r.known_text !== c.before.known || r.target_text !== c.before.target) problems.push(`${c.id} reads "${r?.known_text}" → "${r?.target_text}" (expected "${c.before.known}" → "${c.before.target}")`);
  }
  // Concurrency: another surface editing seed 203 or its rows today (job #573·I's pronoun sweep is running course-wide) — refuse rather than overwrite.
  const { rows: ev } = await pg.query(`SELECT id, surface, operation FROM content_edit_events WHERE course_code=$1 AND occurred_at > now() - interval '24 hours' AND surface NOT LIKE '%' || $2 || '%' AND (scope->'seed_numbers' ?| $3::text[] OR scope->'lego_ids' ?| $4::text[] OR scope->'phrase_ids' ?| $5::text[])`,
    [COURSE, SWEEP, [String(SEED)], LEGO_IDS, CHANGES.map(c => `${COURSE}:${c.id}`)]);
  for (const e of ev) problems.push(`another surface touched our rows today: ${e.surface} ${e.operation} (${e.id}) — re-read before writing`);
}
async function guards(pg, problems, log) {
  // rule 2: tiling
  if (!componentsTile(NEW_L03)) problems.push('S0203L03 components do not tile the grown LEGO');
  if (!legosTileSeed(SEED_203, [L01, L02, NEW_L03])) problems.push('L01 + L02 + grown L03 do not tile seed 203');
  if (legosTileSeed(SEED_203, [L01, L02, OLD_L03])) problems.push('the old L03 already tiled the seed — nothing to grow');
  // containment: every non-component phrase under a changed LEGO, after the change, contains its LEGO on both sides
  const legoAfter = { S0203L01: L01, S0203L02: L02, S0203L03: NEW_L03 };
  const { rows: under } = await pg.query(`SELECT split_part(id,':',2) id, phrase_role, known_text, target_text, 'S'||lpad(seed_number::text,4,'0')||'L'||lpad(lego_index::text,2,'0') lego_ref FROM course_practice_phrases WHERE course_code=$1 AND seed_number=$2`, [COURSE, SEED]);
  const after = new Map(CHANGES.map(c => [c.id, c.after]));
  log.containment = { checked: 0, preexisting: [] };
  for (const r of under) {
    if (r.phrase_role === 'component') continue;
    const A = after.get(r.id) || { known: r.known_text, target: r.target_text };
    const L = legoAfter[r.lego_ref];
    log.containment.checked++;
    const held = containsWords(A.target, L.target) && containsWords(A.known, L.known);
    if (!held) {
      const LB = r.lego_ref === 'S0203L03' ? OLD_L03 : L;
      const heldBefore = containsWords(r.target_text, LB.target) && containsWords(r.known_text, LB.known);
      if (heldBefore || after.has(r.id)) problems.push(`${r.id} "${A.known}" → "${A.target}" does not contain its LEGO ${r.lego_ref} "${L.known}" → "${L.target}"`);
      else log.containment.preexisting.push(`${r.id} "${r.known_text}" → "${r.target_text}" never contained ${r.lego_ref} (pre-existing, untouched)`);
    }
  }
  // rule 1: every change was a past frame before and is a present frame after; the census has no other past frame
  for (const c of CHANGES.filter(c => c.rule === 1)) { if (frameOf(c.before.known) !== 'past') problems.push(`${c.id} was not a past frame before`); if (frameOf(c.after.known) !== 'present') problems.push(`${c.id} is not a present frame after`); if (!/\bfaresti\b/.test(c.after.target)) problems.push(`${c.id} lost faresti`); }
  const handled = new Set(CHANGES.filter(c => c.rule === 1).map(c => c.id));
  log.census = await faresticensus(pg);
  for (const r of log.census) if (r.frame === 'past' && !handled.has(r.id)) problems.push(`census: ${r.kind} ${r.id} (seed ${r.seed}) "${r.known}" → "${r.target}" is a past frame not in CHANGES`);
  for (const id of handled) if (!log.census.some(r => r.id === id && r.frame === 'past')) problems.push(`${id} is in CHANGES but the census does not read it as a past frame`);
  // the frame words are taught before 203
  log.frameWords = {};
  for (const w of FRAME_WORDS) { const f = await firstSeedOf(pg, w); log.frameWords[w] = f; if (!(f && f < SEED)) problems.push(`"${w}" first appears at seed ${f}, not before ${SEED} — list, do not edit`); }
  // no new vocabulary anywhere (both sides), judged against everything taught by seed 203
  log.vocab = {};
  for (const c of CHANGES) {
    const nk = await newVocabulary(pg, SEED, c.after.known, 'known'), nt = await newVocabulary(pg, SEED, c.after.target, 'target');
    if (nk.length || nt.length) { log.vocab[c.id] = { known: nk, target: nt }; problems.push(`${c.id} introduces new vocabulary: ${[...nk, ...nt].join(', ')}`); }
  }
  // ZUT vs current: the new known must not already map to a different target, nor the new target to a different known (non-component rows + legos)
  const pairs = [{ id: 'S0203L03', ...NEW_L03 }, ...CHANGES.map(c => ({ id: c.id, ...c.after }))];
  const ours = new Set(pairs.map(p => p.id));
  log.zut = [];
  for (const p of pairs) {
    const { rows } = await pg.query(
      `SELECT id, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND phrase_role<>'component' AND id<>$4 AND ((lower(trim(known_text))=lower(trim($2)) AND lower(trim(target_text))<>lower(trim($3))) OR (lower(trim(target_text))=lower(trim($3)) AND lower(trim(known_text))<>lower(trim($2))))
       UNION ALL SELECT lego_id, known_text, target_text FROM course_legos WHERE course_code=$1 AND lego_id<>$5 AND ((lower(trim(known_text))=lower(trim($2)) AND lower(trim(target_text))<>lower(trim($3))) OR (lower(trim(target_text))=lower(trim($3)) AND lower(trim(known_text))<>lower(trim($2))))`,
      [COURSE, p.known, p.target, `${COURSE}:${p.id}`, p.id]);
    for (const r of rows) if (!ours.has(r.id.replace(`${COURSE}:`, ''))) log.zut.push(`${p.id} "${p.known}" → "${p.target}" vs ${r.id} "${r.known_text}" → "${r.target_text}"`);
  }
  problems.push(...log.zut);
  // intros (O13): the new L03 line quotes the grown LEGO and a context that contains it; no other intro in the course quotes a sentence we change
  if (!NEW_INTRO_L03.includes(`'${NEW_L03.known}'`) || !containsWords('if I asked you to help me', NEW_L03.known)) problems.push('new L03 intro does not mirror the grown LEGO');
  const { rows: intros } = await pg.query(`SELECT a.id, a.lego_id, a.text FROM course_audio a WHERE a.course_code=$1 AND a.role='presentation' AND (a.id::text IN (SELECT presentation_audio_id FROM course_legos WHERE course_code=$1 AND presentation_audio_id IS NOT NULL) OR a.lego_id LIKE 'S0203%')`, [COURSE]);
  log.introsQuoting = [];
  for (const i of intros) {
    if (i.id === OLD_INTRO_L03.audioId) continue;
    for (const c of CHANGES) if (c.before.known !== c.after.known && i.text.includes(`'${c.before.known}'`)) log.introsQuoting.push({ audio: i.id, lego: i.lego_id, text: i.text, row: c.id });
  }
  for (const q of log.introsQuoting) problems.push(`intro ${q.audio} (${q.lego}) quotes a sentence this pass changes (${q.row}): "${q.text}" — re-author needed`);
}

// ── Apply ───────────────────────────────────────────────────────────────────────────────
async function applyContent(pg, supabase, log) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const legoEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'lego-edit', scope: { seed_numbers: [SEED], lego_ids: ['S0203L03'], rows: 1 }, detail: { ruling: RULING, job: JOB, from: OLD_L03, to: NEW_L03, intro: { from: OLD_INTRO_L03, to: NEW_INTRO_L03 } } });
  const phraseEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-edit', scope: { seed_numbers: [SEED], phrase_ids: CHANGES.map(c => `${COURSE}:${c.id}`), rows: CHANGES.length },
    detail: { ruling: RULING, job: JOB, changes: CHANGES.map(c => ({ id: `${COURSE}:${c.id}`, rule: c.rule, known_from: c.before.known, target_from: c.before.target, known_to: c.after.known, target_to: c.after.target })) } });
  const unapproveEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'unapprove', scope: { seed_numbers: [SEED], rows: 1 }, detail: { why: 'rows edited under Kai\'s rulings of 2026-09-28; need his read', job: JOB } });
  log.events = { legoEvent, phraseEvent, unapproveEvent };
  await pg.query('BEGIN');
  try {
    const l = await pg.query('UPDATE course_legos SET known_text=$1, target_text=$2, components=$3, known_audio_id=NULL, target1_audio_id=NULL, target2_audio_id=NULL, target1_duration_ms=NULL, target2_duration_ms=NULL, last_edit_event_id=$4, updated_at=now() WHERE course_code=$5 AND lego_id=$6 AND known_text=$7 AND target_text=$8',
      [NEW_L03.known, NEW_L03.target, JSON.stringify(NEW_L03.components), legoEvent, COURSE, 'S0203L03', OLD_L03.known, OLD_L03.target]);
    if (l.rowCount !== 1) throw new Error(`S0203L03: ${l.rowCount} rows`);
    for (const c of CHANGES) {
      // conditional on the BEFORE text: if #573·I (or anyone) moved the row since the dry run, this is 0 rows and the whole pass rolls back
      const u = await pg.query(`UPDATE course_practice_phrases SET known_text=$1, target_text=$2, word_count=$3, lego_count=$4, known_audio_id=NULL, target1_audio_id=NULL, target2_audio_id=NULL, qa_checked=NULL, decomposition=NULL, decomposition_course_version=NULL, display_tiling=NULL, display_tiling_version=NULL, last_edit_event_id=$5, updated_at=now() WHERE course_code=$6 AND id=$7 AND known_text=$8 AND target_text=$9`,
        [c.after.known, c.after.target, c.after.target.length, c.after.target.split(/\s+/).length, phraseEvent, COURSE, `${COURSE}:${c.id}`, c.before.known, c.before.target]);
      if (u.rowCount !== 1) throw new Error(`${c.id}: ${u.rowCount} rows (row moved under us — re-read and re-plan)`);
    }
    const un = await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number=$3', [unapproveEvent, COURSE, SEED]);
    log.unapproved = { seeds: [SEED], rows: un.rowCount };
    // intro: the old clip no longer mirrors — detach from the LEGO (asset kept), link cleared until the Sonia clip lands
    await pg.query('UPDATE course_legos SET presentation_audio_id=NULL WHERE course_code=$1 AND lego_id=$2', [COURSE, 'S0203L03']);
    await pg.query('UPDATE course_audio SET lego_id=NULL WHERE id=$1 AND lego_id=$2', [OLD_INTRO_L03.audioId, 'S0203L03']);
    await pg.query(`INSERT INTO content_audio_link_drops (table_name, row_id, course_code, seed_number, column_name, role, old_audio_id, old_text, old_voice_id, new_text, reason) VALUES ('course_legos','S0203L03',$1,$2,'presentation_audio_id','presentation',$3,$4,$5,$6,$7)`,
      [COURSE, SEED, OLD_INTRO_L03.audioId, OLD_INTRO_L03.text, SONIA.voiceId, NEW_INTRO_L03, `${SWEEP}: intro quotes the old LEGO (job ${JOB}, event ${legoEvent}); clip detached from S0203L03, asset kept`]);
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
  await refreshNow();
  const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs');
  log.audioPass = await queueAudioPass(supabase, { courseCode: COURSE, requestedBy: `@${SWEEP}`, reason: `job ${JOB}: seed 203 present frames + L03 grown to "to help me"; Italian rendered on Elsa/Benigno by the tool, English prompts on temporary Sonia (ita-sonia-temporary-fill SCOPE=ids), intro S0203L03 on Sonia`, metadata: { job: JOB, seeds: [SEED], rows: CHANGES.length + 1 } });
}

// ── Audio (the #559·I route, unchanged) ─────────────────────────────────────────────────
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
/** Italian target1/target2 on every changed row and the grown LEGO: link an existing Elsa/Benigno clip, else render. English prompts are NOT rendered here. */
async function fillItalian(pg, supabase, log) {
  const ids = CHANGES.filter(c => c.side !== 'known').map(c => `${COURSE}:${c.id}`);
  const { rows } = await pg.query(
    `SELECT 'course_legos' AS tbl, lego_id AS id, target_text, target1_audio_id, target2_audio_id FROM course_legos WHERE course_code=$1 AND lego_id='S0203L03'
     UNION ALL SELECT 'course_practice_phrases', id, target_text, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2) ORDER BY 2`, [COURSE, ids]);
  const idCol = (tbl) => tbl === 'course_legos' ? 'lego_id' : 'id';
  for (const r of rows) for (const role of ['target1', 'target2']) {
    if (r[`${role}_audio_id`]) continue;
    const entry = { tbl: r.tbl, id: r.id, role, text: r.target_text }; log.audio.push(entry);
    const voice = role === 'target1' ? ELSA : BENIGNO;
    try {
      const { rows: have } = await pg.query(`SELECT id, voice_id FROM course_audio WHERE language='ita' AND text_normalized=normalize_text($1) AND s3_key IS NOT NULL AND s3_key NOT LIKE 'pending/%' AND voice_id = ANY($2) ORDER BY (course_code=$3) DESC, (role=$4) DESC, created_at DESC LIMIT 1`, [r.target_text, AZURE_VOICE_IDS[role], COURSE, role]);
      let audioId = have[0]?.id;
      if (audioId) entry.result = `linked existing ${have[0].voice_id} clip ${audioId}`;
      else { const out = await renderClip(supabase, { text: r.target_text, language: 'ita', role, voice, voiceIds: AZURE_VOICE_IDS[role] }); audioId = out.audioId; entry.result = `rendered ${voice.voiceName} clip ${audioId} (${out.durationMs} ms)`; }
      await pg.query(`UPDATE ${r.tbl} SET ${role}_audio_id=$1 WHERE course_code=$2 AND ${idCol(r.tbl)}=$3 AND target_text=$4 AND ${role}_audio_id IS NULL`, [audioId, COURSE, r.id, r.target_text]);
      const { rows: [now] } = await pg.query(`SELECT a.id, a.voice_id FROM ${r.tbl} x LEFT JOIN course_audio a ON a.id=x.${role}_audio_id WHERE x.course_code=$1 AND x.${idCol(r.tbl)}=$2`, [COURSE, r.id]);
      entry.linked = now?.id || null; entry.linkedVoice = now?.voice_id || null;
      if (!now?.id || !AZURE_VOICE_IDS[role].includes(now.voice_id)) entry.result += ` — SLOT NOT ON CAST VOICE (${now?.voice_id})`;
    } catch (e) { entry.result = `REFUSED/FAILED: ${e.message}`; }
  }
}
/** The S0203L03 intro on Sonia under a temporary presentation cast row (the #557·I route), linked at all three places the learner path reads. */
async function fillIntro(pg, supabase, log) {
  const { rows: [l] } = await pg.query('SELECT known_text, presentation_audio_id FROM course_legos WHERE course_code=$1 AND lego_id=$2', [COURSE, 'S0203L03']);
  if (l.known_text !== NEW_L03.known) throw new Error('S0203L03 is not the grown LEGO');
  if (l.presentation_audio_id) { log.intro = { skipped: `already linked ${l.presentation_audio_id}` }; return; }
  const castKey = (r) => `${r.slot}|${r.language}|${r.gender}|${r.rank}|${r.voice_id}|${r.notes ?? ''}|${r.assigned_by ?? ''}|${r.created_at?.toISOString?.() ?? r.created_at}|${r.updated_at?.toISOString?.() ?? r.updated_at}`;
  const engCast = async () => (await pg.query(`SELECT slot, language, gender, rank, voice_id, notes, assigned_by, created_at, updated_at FROM voice_language_roles WHERE language='eng' ORDER BY slot, gender, rank, voice_id`)).rows;
  const before = await engCast();
  let audioId = null, durationMs = null;
  const { rows: have } = await pg.query(`SELECT id, duration_ms FROM course_audio WHERE course_code=$1 AND language='eng' AND role='presentation' AND text_normalized=normalize_text($2) AND s3_key IS NOT NULL AND s3_key NOT LIKE 'pending/%' AND voice_id = ANY($3) ORDER BY created_at DESC LIMIT 1`, [COURSE, NEW_INTRO_L03, SONIA_IDS]);
  if (have[0]) { audioId = have[0].id; durationMs = have[0].duration_ms; log.intro = { result: `linked existing Sonia intro clip ${audioId}` }; }
  else {
    const { rows: theirs } = await pg.query(`SELECT assigned_by FROM voice_language_roles WHERE slot='presentation' AND language='eng' AND voice_id=$1`, [SONIA.castVoiceId]);
    const ownRow = !theirs.length;
    try {
      if (ownRow) await pg.query(`INSERT INTO voice_language_roles (slot, language, gender, rank, voice_id, notes, assigned_by) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [TEMP_PRES_ROW.slot, TEMP_PRES_ROW.language, TEMP_PRES_ROW.gender, TEMP_PRES_ROW.rank, TEMP_PRES_ROW.voice_id, `TEMPORARY — ${RULING}. Removed by the same run.`, SWEEP]);
      const out = await renderClip(supabase, { text: NEW_INTRO_L03, language: 'eng', role: 'presentation', voice: SONIA, voiceIds: SONIA_IDS, intro: true });
      audioId = out.audioId; durationMs = out.durationMs; log.intro = { result: `rendered Sonia intro clip ${audioId} (${durationMs} ms)`, castRow: ownRow ? 'own temporary row' : `rode ${theirs[0].assigned_by}'s temporary row` };
    } finally {
      if (ownRow) await pg.query(`DELETE FROM voice_language_roles WHERE slot=$1 AND language=$2 AND gender=$3 AND rank=$4 AND voice_id=$5 AND assigned_by=$6`, [TEMP_PRES_ROW.slot, TEMP_PRES_ROW.language, TEMP_PRES_ROW.gender, TEMP_PRES_ROW.rank, TEMP_PRES_ROW.voice_id, SWEEP]);
      const after = await engCast();
      const same = before.length === after.length && before.every((r, i) => castKey(r) === castKey(after[i]));
      log.castRestored = same;
      if (ownRow && !same) throw new Error('eng cast NOT byte-identical after the temporary Sonia presentation row was removed');
    }
  }
  await pg.query('UPDATE course_legos SET presentation_audio_id=$1, last_edit_event_id=COALESCE($2, last_edit_event_id) WHERE course_code=$3 AND lego_id=$4 AND presentation_audio_id IS NULL', [audioId, log.events?.legoEvent || null, COURSE, 'S0203L03']);
  await pg.query(`INSERT INTO lego_introductions (course_code, lego_id, presentation_audio_id, audio_uuid, duration_ms, updated_at) VALUES ($1,$2,$3,$3,$4,now()) ON CONFLICT (course_code, lego_id) DO UPDATE SET presentation_audio_id=EXCLUDED.presentation_audio_id, audio_uuid=EXCLUDED.audio_uuid, duration_ms=COALESCE(EXCLUDED.duration_ms, lego_introductions.duration_ms), updated_at=now()`, [COURSE, 'S0203L03', audioId, durationMs]);
  await pg.query('UPDATE course_audio SET lego_id=$1 WHERE id=$2 AND (lego_id IS NULL OR lego_id<>$1)', ['S0203L03', audioId]);
  log.intro.audioId = audioId;
}
/** English prompt slots this pass leaves silent — to be filled by ita-sonia-temporary-fill SCOPE=ids. */
async function silentEnglish(pg) {
  const ids = CHANGES.filter(c => c.side !== 'target').map(c => `${COURSE}:${c.id}`);
  const { rows } = await pg.query(`SELECT id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2) AND known_audio_id IS NULL UNION ALL SELECT lego_id FROM course_legos WHERE course_code=$1 AND lego_id='S0203L03' AND known_audio_id IS NULL`, [COURSE, ids]);
  return rows.map(r => r.id);
}

async function main() {
  const APPLY = process.env.APPLY === '1', AUDIO_ONLY = process.env.AUDIO_ONLY === '1';
  const { Client } = require('pg');
  const { createClient } = require('@supabase/supabase-js');
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const log = { sweep: SWEEP, ruling: RULING, job: JOB, apply: APPLY, started: new Date().toISOString(), problems: [], audio: [] };
  console.log(`\n══ ${COURSE} — seed 203 present frames + L03 grown — ${AUDIO_ONLY ? 'AUDIO ONLY' : APPLY ? 'APPLY' : 'DRY RUN'} ══`);
  if (!AUDIO_ONLY) {
    await guardLive(pg, log.problems);
    if (!log.problems.length) await guards(pg, log.problems, log);
    if (log.census) {
      console.log(`faresti / would-you-do census: ${log.census.length} rows, ${log.census.filter(r => r.frame === 'past').length} past frames, seeds ${[...new Set(log.census.map(r => r.seed))].join(', ')}`);
      for (const r of log.census) console.log(`  ${(r.frame || '-').padEnd(7)} ${r.kind.padEnd(5)} ${r.id.padEnd(12)} "${r.known}"   (${r.target})`);
    }
    console.log(`frame words first taught: ${JSON.stringify(log.frameWords)}`);
    if (log.containment?.preexisting?.length) { console.log('PRE-EXISTING containment gaps (untouched):'); for (const x of log.containment.preexisting) console.log('  ' + x); }
    console.log('\nPLAN:');
    console.log(`  S0203L03  "${OLD_L03.known}" → "${OLD_L03.target}"  ⇒  "${NEW_L03.known}" → "${NEW_L03.target}"`);
    for (const c of CHANGES) console.log(`  [${c.rule}] ${c.id.padEnd(12)} "${c.before.known}" → "${c.before.target}"  ⇒  "${c.after.known}" → "${c.after.target}"`);
    console.log(`  intro S0203L03  "${OLD_INTRO_L03.text}"  ⇒  "${NEW_INTRO_L03}"`);
    console.log(`  unapprove seed ${SEED}`);
    console.log(log.problems.length ? '\nPROBLEMS:\n  ' + log.problems.join('\n  ') : `\nguards hold: L01+L02+L03 tile seed 203, ${log.containment.checked} phrases contain their LEGO both sides, five past frames and no others course-wide, voglio/è/sia taught before 203, no new vocabulary, no new ZUT clash, no other intro quotes a changed sentence`);
    if (APPLY && !log.problems.length) { await applyContent(pg, supabase, log); console.log(`APPLIED. events=${JSON.stringify(log.events)} unapproved=${JSON.stringify(log.unapproved)} audioPass=${JSON.stringify(log.audioPass)}`); }
  }
  if (APPLY && !log.problems.length) {
    await fillItalian(pg, supabase, log);
    console.log('ITALIAN AUDIO:'); for (const a of log.audio) console.log(`  ${a.tbl}.${a.id} ${a.role} "${a.text}": ${a.result}`);
    try { await fillIntro(pg, supabase, log); console.log(`INTRO: ${JSON.stringify(log.intro)} castRestored=${log.castRestored}`); } catch (e) { log.problems.push(`intro: ${e.message}`); console.log(`INTRO FAILED: ${e.message}`); }
    log.silentEnglish = await silentEnglish(pg);
    console.log(`ENGLISH prompts to fill on temporary Sonia (${log.silentEnglish.length}):\n  SCOPE=ids IDS=${log.silentEnglish.join(',')} APPLY=1 node tools/course-optimization/ita-sonia-temporary-fill-2026-09-28.cjs`);
    if (log.audio.some(a => /REFUSED|FAILED|NOT ON CAST/.test(a.result))) log.problems.push('some Italian slots were not filled — see audio');
  }
  const f = evidencePath(`tools/course-optimization/${SWEEP}/${AUDIO_ONLY ? 'audio' : APPLY ? 'applied' : 'dryrun'}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(log, null, 2)); console.log(`Wrote ${f}`);
  await pg.end(); process.exit(log.problems.length ? 2 : 0);
}
module.exports = { containsWords, componentsTile, legosTileSeed, frameOf, SEED_203, L01, L02, OLD_L03, NEW_L03, CHANGES, NEW_INTRO_L03, OLD_INTRO_L03 };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
