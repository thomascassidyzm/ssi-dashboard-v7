#!/usr/bin/env node
'use strict';
// tools/course-optimization/ita-seed-343-recut-2026-09-28.cjs
//
// ita_for_eng seed 343 — "who said that she's worried about the economy" →
// "che ha detto che è preoccupata per l'economia". Kai's design, ruled 2026-09-28 (job #529):
//
//   The Italian facts: preoccupato/a PER + noun ("preoccupata per l'economia") and
//   preoccupato/a DI + infinitive ("di giocare male"). The seed's "per" is right; what was wrong
//   was that no LEGO covered it, and two phrases put PER in front of an infinitive.
//
//   L01  she's worried → è preoccupata        UNCHANGED. Its B01 "worried → preoccupata" stays
//        exactly as it is: the gender clash with seed 270's "worried → preoccupato" is FINE
//        (Kai's ruling, do not touch). Its U03 takes DI before the infinitive.
//   L02  the economy → l'economia   EXPANDS to   about the economy → per l'economia
//        (never deleted; the same slot, re-textured). Still NEW: no earlier LEGO carries "about"
//        → "per" on both sides — every earlier "per" LEGO is "sto per" / "per rispondere" /
//        "in order to" / "non è per questo che". Components grow to about→per · the→l' ·
//        economy→economia, and the ghost tiles the player draws from that array follow.
//        Its phrases practise "preoccupata per" + noun. The presentation clip said
//        "The Italian for: 'the economy' …" and no longer mirrors the LEGO, so the slot is
//        emptied and an audio-pass request names it: intros are never rendered here.
//
//   Tiling, no gap and no overlap:  che ha detto che (S0342L01 / S0235L01, earlier) |
//   è preoccupata (L01) | per l'economia (L02).
//
// PHRASES (5 rows change, 1 component row is added):
//   S0343L01U03  è preoccupata per giocare male   → è preoccupata di giocare male
//   S0343L02B01  the economy → l'economia         → about the economy → per l'economia   (the LEGO itself)
//   S0343L02B03  …per l'economia oggi             → …per l'economia          (the stray oggi; = U01's Italian)
//   S0343L02U05  "she said she must consider what's important for the economy" did not contain the
//                LEGO on the English side → "he's worried about the economy → è preoccupato per l'economia"
//                (every word taught: preoccupato at 270; practises preoccupato PER + noun on the other gender)
//   S0351L02U05  …era preoccupato per stare da solo → …era preoccupato di stare da solo   (same defect, other seed)
//   S0343L02C03  about → per   INSERTED (component; never played, keeps the rows in step with the array)
//
// GLOSS SWEEP (whole course, both sides, done live in the dry run and again before apply):
//   every phrase whose English carries "about the economy" must carry "per l'economia" and vice
//   versa; and no phrase anywhere may carry preoccupat* PER + infinitive. The dry run prints
//   what it finds; the apply aborts on anything outside the rows above.
//
// WHAT IT WRITES: course_legos 1 row (S0343L02: text, components, presentation_audio_id=NULL,
// target clips NULL — the text changed), course_practice_phrases 5 rows + 1 insert,
// course_seeds 343 and 351 approved_at=NULL, content_edit_events 3 rows stamped on every row.
// No lego_id / lego_index / seed_number moves; learner progress (keyed by phrase id) is untouched.
//
// AUDIO — AZURE ONLY (Kai): Italian on the course's cast, Elsa (target1) / Benigno (target2),
// through the one TTS door with voiceBound; an existing clip in the right voice is linked, never
// re-rendered. English slots are left for the temporary-Sonia fill tool
// (ita-sonia-temporary-fill-2026-09-28.cjs, SCOPE=course). Never Cartesia, never xAI, nothing deleted.
//
//   node tools/course-optimization/ita-seed-343-recut-2026-09-28.cjs             # dry run: rules, live guard, ZUT, sweep
//   APPLY=1 node tools/course-optimization/ita-seed-343-recut-2026-09-28.cjs     # write content, then render Italian
//   RENDER=1 node tools/course-optimization/ita-seed-343-recut-2026-09-28.cjs    # audio only (after an apply)

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'ita_for_eng';
const SEED = 343;
const SWEEP = 'ita-seed-343-recut-2026-09-28';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const RULING = 'Kai, 2026-09-28 (job #529): seed 343 — L02 expands to "about the economy → per l\'economia"; preoccupato/a DI + infinitive, PER + noun; the worried→preoccupata/preoccupato gender clash with 270 stays';

const ELSA = { voiceId: 'azure_it-IT-ElsaNeural', voiceName: 'it-IT-ElsaNeural', role: 'target1' };
const BENIGNO = { voiceId: 'azure_it-IT-BenignoNeural', voiceName: 'it-IT-BenignoNeural', role: 'target2' };
const AZURE_VOICE_IDS = {
  target1: ['azure_it-IT-ElsaNeural', 'it-IT-ElsaNeural'],
  target2: ['azure_it-IT-BenignoNeural', 'it-IT-BenignoNeural'],
};

const SEED_TEXT = { known: "who said that she's worried about the economy", target: "che ha detto che è preoccupata per l'economia" };
/** Taught before 343: "who said that → che ha detto che" (S0235L01, S0236L01, S0342L01). */
const PRIOR = { known: 'who said that', target: 'che ha detto che' };

// ── The picture this tool was written against (live rows re-asserted before any write) ──
const OLD = {
  legos: [
    { idx: 1, type: 'M', is_new: true, known: "she's worried", target: 'è preoccupata' },
    { idx: 2, type: 'M', is_new: true, known: 'the economy', target: "l'economia" },
  ],
  phrases: [
    { id: 'S0343L01B01', known: 'worried', target: 'preoccupata' },
    { id: 'S0343L01B02', known: "she's worried", target: 'è preoccupata' },
    { id: 'S0343L01B03', known: "she said she's worried", target: 'ha detto che è preoccupata' },
    { id: 'S0343L01U01', known: "she's worried about what happened", target: 'è preoccupata per quello che è successo' },
    { id: 'S0343L01U02', known: "she said she's worried about the group", target: 'ha detto che è preoccupata per il gruppo' },
    { id: 'S0343L01U03', known: "she's worried about playing badly", target: 'è preoccupata per giocare male' },
    { id: 'S0343L01U04', known: "I'm sure she's worried", target: 'sono sicuro che è preoccupata' },
    { id: 'S0343L01U05', known: 'that young woman who said something is worried', target: 'quella giovane donna che ha detto qualcosa è preoccupata' },
    { id: 'S0343L01U06', known: "she said she's worried because she can't sell the company", target: "ha detto che è preoccupata perché non può vendere l'azienda" },
    { id: 'S0343L02C01', known: 'the', target: "l'" },
    { id: 'S0343L02C02', known: 'economy', target: 'economia' },
    { id: 'S0343L02B01', known: 'the economy', target: "l'economia" },
    { id: 'S0343L02B02', known: "she's worried about the economy", target: "è preoccupata per l'economia" },
    { id: 'S0343L02B03', known: "she said she's worried about the economy", target: "ha detto che è preoccupata per l'economia oggi" },
    { id: 'S0343L02U01', known: "she said she's worried about the economy", target: "ha detto che è preoccupata per l'economia" },
    { id: 'S0343L02U02', known: "do you think she's worried about the economy?", target: "pensi che sia preoccupata per l'economia?" },
    { id: 'S0343L02U03', known: "I'm sure she's worried about the economy", target: "sono sicuro che è preoccupata per l'economia" },
    { id: 'S0343L02U04', known: 'that student who said something is worried about the economy', target: "quella studentessa che ha detto qualcosa è preoccupata per l'economia" },
    { id: 'S0343L02U05', known: "she said she must consider what's important for the economy", target: "ha detto che deve considerare quello che è importante per l'economia" },
    { id: 'S0343L02U06', known: "she can't build a new life because she's worried about the economy", target: "non può costruire una nuova vita perché è preoccupata per l'economia" },
  ],
  other: [
    { id: 'S0351L02U05', seed: 351, known: 'she said he was worried about being on his own', target: 'ha detto che era preoccupato per stare da solo' },
  ],
};

const NEW_LEGOS = [
  { idx: 1, type: 'M', is_new: true, known: "she's worried", target: 'è preoccupata', components: [{ known: "she's worried", target: 'è preoccupata' }] },
  { idx: 2, type: 'M', is_new: true, known: 'about the economy', target: "per l'economia",
    components: [{ known: 'about', target: 'per' }, { known: 'the', target: "l'" }, { known: 'economy', target: 'economia' }] },
];

/** Rows that change (id → after). Everything else under the seed is carried unchanged. */
const CHANGES = [
  { id: 'S0343L01U03', known: "she's worried about playing badly", target: 'è preoccupata di giocare male' },
  { id: 'S0343L02B01', known: 'about the economy', target: "per l'economia" },
  { id: 'S0343L02B03', known: "she said she's worried about the economy", target: "ha detto che è preoccupata per l'economia" },
  { id: 'S0343L02U05', known: "he's worried about the economy", target: "è preoccupato per l'economia" },
  { id: 'S0351L02U05', seed: 351, known: 'she said he was worried about being on his own', target: 'ha detto che era preoccupato di stare da solo' },
];
/** The added component row: position 0 so it reads about · the · economy; C01/C02 keep their ids. */
const INSERT = { id: 'S0343L02C03', idx: 2, position: 0, role: 'component', known: 'about', target: 'per', componentIndex: 0 };
const SEEDS_TO_UNAPPROVE = [343, 351];

// ── The rules, as code ──────────────────────────────────────────────────────────────────
const norm = (s) => String(s || '').toLowerCase().replace(/[.,!?;:"]+/g, ' ').replace(/’/g, "'").replace(/\s+/g, ' ').trim();
const idParts = (id) => ({ seed: Number(id.slice(1, 5)), idx: Number(id.slice(6, 8)), role: { B: 'build', U: 'use', C: 'component' }[id[8]], n: Number(id.slice(9)) });

/** The seed's rows after the change (old rows with CHANGES applied, plus the insert). */
function resolvedPhrases() {
  const byId = Object.fromEntries(CHANGES.map(c => [c.id, c]));
  const rows = OLD.phrases.map(p => {
    const c = byId[p.id];
    const known = c ? c.known : p.known, target = c ? c.target : p.target;
    return { id: p.id, ...idParts(p.id), known, target, knownChanged: known !== p.known, targetChanged: target !== p.target };
  });
  rows.push({ id: INSERT.id, ...idParts(INSERT.id), known: INSERT.known, target: INSERT.target, inserted: true });
  return rows;
}

/** Both sides of a phrase carry both sides of its LEGO (components carry their own piece). */
function phraseContainsLego(lego, phrase) {
  if (phrase.role === 'component') return true;
  return ` ${norm(phrase.target)} `.includes(` ${norm(lego.target)} `) && ` ${norm(phrase.known)} `.includes(` ${norm(lego.known)} `);
}
/** Prior piece + LEGOs read the seed in order on both sides: contiguous, no gap, no overlap. */
function legosTileSeed(legos, seed) {
  const t = [PRIOR.target, ...legos.map(l => l.target)].map(norm).join(' ');
  const k = [PRIOR.known, ...legos.map(l => l.known)].map(norm).join(' ');
  return t === norm(seed.target) && k === norm(seed.known);
}
/** preoccupato/a takes DI before an infinitive and PER before a noun — never PER + infinitive. */
const PER_INFINITIVE = /\bpreoccupat[oaie] per [a-zà-ù'’]+(are|ere|ire|arsi|ersi|irsi)\b/i;
const perInfinitive = (target) => PER_INFINITIVE.test(target);
/** The LEGO's components tile the LEGO itself. */
const squash = (s) => norm(s).replace(/\s+/g, '');   // "l'" + "economia" is "l'economia"
const componentsTileLego = (l) => squash(l.components.map(c => c.target).join(' ')) === squash(l.target) && squash(l.components.map(c => c.known).join(' ')) === squash(l.known);
/** Nothing under L02 says "oggi" without "today". */
const strayOggi = (p) => /\boggi\b/i.test(p.target) && !/\btoday\b/i.test(p.known);
/** B01 under L01 is untouched (Kai: the gender clash with 270 stays). */
const b01Untouched = (phrases) => { const p = phrases.find(x => x.id === 'S0343L01B01'); return p && p.known === 'worried' && p.target === 'preoccupata'; };

function checkOffline() {
  const phrases = resolvedPhrases();
  const problems = [];
  if (!legosTileSeed(NEW_LEGOS, SEED_TEXT)) problems.push('LEGOs do not tile the seed');
  for (const l of NEW_LEGOS) if (!componentsTileLego(l)) problems.push(`L0${l.idx} components do not tile the LEGO`);
  for (const p of phrases) {
    const lego = NEW_LEGOS.find(l => l.idx === p.idx);
    // Containment is asserted on every row under the re-cut LEGO (L02) and on every row this
    // job edits. L01's pre-existing rows are Kai's: B01 "worried → preoccupata" stays by his
    // ruling, and U05 "…is worried → …è preoccupata" (same Italian, a different English) predates
    // this job and is noted, not touched.
    const mine = p.idx === 2 || p.knownChanged || p.targetChanged || p.inserted;
    if (mine && !phraseContainsLego(lego, p)) problems.push(`${p.id} "${p.known}" → "${p.target}" does not contain LEGO ${lego.idx} on both sides`);
    if (perInfinitive(p.target)) problems.push(`${p.id}: preoccupat* PER + infinitive`);
    if (strayOggi(p)) problems.push(`${p.id}: stray oggi`);
  }
  for (const o of CHANGES.filter(c => c.seed && c.seed !== SEED)) if (perInfinitive(o.target)) problems.push(`${o.id}: preoccupat* PER + infinitive`);
  if (!b01Untouched(phrases)) problems.push('S0343L01B01 was touched');
  const ids = phrases.map(p => p.id);
  if (new Set(ids).size !== ids.length) problems.push('duplicate phrase ids');
  return { problems, phrases };
}

// ── Live ────────────────────────────────────────────────────────────────────────────────
async function guardLive(pg) {
  const problems = [];
  const { rows: [seed] } = await pg.query('SELECT known_text, target_text FROM course_seeds WHERE course_code=$1 AND seed_number=$2', [COURSE, SEED]);
  if (!seed) problems.push('seed missing');
  else if (seed.known_text !== SEED_TEXT.known || seed.target_text !== SEED_TEXT.target) problems.push(`seed reads "${seed.known_text}" → "${seed.target_text}"`);
  const { rows: legos } = await pg.query('SELECT * FROM course_legos WHERE course_code=$1 AND seed_number=$2 ORDER BY lego_index', [COURSE, SEED]);
  const live = legos.map(l => `${l.lego_index}|${l.type}|${l.is_new}|${l.known_text}|${l.target_text}`).join('\n');
  const want = OLD.legos.map(l => `${l.idx}|${l.type}|${l.is_new}|${l.known}|${l.target}`).join('\n');
  if (live !== want) problems.push(`LEGOs are not the picture this tool was written against:\n${live}`);
  const { rows: phrases } = await pg.query('SELECT * FROM course_practice_phrases WHERE course_code=$1 AND seed_number=$2 ORDER BY lego_index, position', [COURSE, SEED]);
  const liveP = phrases.map(p => `${p.id.split(':')[1]}|${p.known_text}|${p.target_text}`).sort().join('\n');
  const wantP = OLD.phrases.map(p => `${p.id}|${p.known}|${p.target}`).sort().join('\n');
  if (liveP !== wantP) problems.push(`phrases are not the picture this tool was written against:\n${liveP}`);
  for (const o of OLD.other) {
    const { rows: [r] } = await pg.query('SELECT known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND id=$2', [COURSE, `${COURSE}:${o.id}`]);
    if (!r || r.known_text !== o.known || r.target_text !== o.target) problems.push(`${o.id} reads "${r?.known_text}" → "${r?.target_text}"`);
  }
  return { problems, legos, phrases };
}

/** ZUT against the rest of the course: a new pair must not share a side with a different pair
 *  elsewhere (component rows exempt on the known side, as audit-phrase-zut has it). Only the
 *  rows this tool changes are asked — the pre-existing flags on the seed are not this job's. */
async function zutAgainstCourse(pg) {
  const pairs = [{ id: 'L2', known: NEW_LEGOS[1].known, target: NEW_LEGOS[1].target }, ...CHANGES.map(c => ({ id: c.id, known: c.known, target: c.target, seed: c.seed || SEED }))];
  const clashes = [];
  for (const p of pairs) {
    const { rows } = await pg.query(
      `SELECT id, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND id<>$5 AND phrase_role<>'component' AND ((lower(trim(known_text))=lower($2) AND lower(trim(target_text))<>lower($3)) OR (lower(trim(target_text))=lower($3) AND lower(trim(known_text))<>lower($2)))
       UNION ALL SELECT lego_id, known_text, target_text FROM course_legos WHERE course_code=$1 AND NOT (seed_number=$4 AND lego_index=2) AND ((lower(trim(known_text))=lower($2) AND lower(trim(target_text))<>lower($3)) OR (lower(trim(target_text))=lower($3) AND lower(trim(known_text))<>lower($2)))`,
      [COURSE, p.known, p.target, SEED, `${COURSE}:${p.id}`]);
    for (const r of rows) clashes.push(`${p.id} "${p.known}" → "${p.target}" vs ${r.id} "${r.known_text}" → "${r.target_text}"`);
  }
  return clashes;
}

/** Whole-course gloss sweep: rows outside CHANGES that still carry an old gloss. */
async function glossSweep(pg) {
  const changed = new Set(CHANGES.map(c => `${COURSE}:${c.id}`));
  const { rows } = await pg.query(
    `SELECT id, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND phrase_role<>'component' AND (
        (known_text ILIKE '%about the economy%' AND target_text NOT ILIKE '%per l''economia%')
     OR (target_text ILIKE '%per l''economia%' AND known_text NOT ILIKE '%about the economy%')
     OR target_text ~* $2
     OR (target_text ILIKE '%economia oggi%' AND known_text NOT ILIKE '%today%'))
     UNION ALL
     SELECT lego_id, known_text, target_text FROM course_legos WHERE course_code=$1 AND NOT (seed_number=$3 AND lego_index=2) AND (
        (known_text ILIKE '%about the economy%' AND target_text NOT ILIKE '%per l''economia%')
     OR (target_text ILIKE '%per l''economia%' AND known_text NOT ILIKE '%about the economy%')
     OR target_text ~* $2)
     ORDER BY 1`, [COURSE, PER_INFINITIVE.source, SEED]);
  return rows.map(r => ({ ...r, inChanges: changed.has(r.id) }));
}

// ── Apply ───────────────────────────────────────────────────────────────────────────────
async function applyContent(pg, supabase, liveLegos, livePhrases, log) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const src = liveLegos.find(l => l.lego_index === 2);
  const l2 = NEW_LEGOS[1];

  const legoEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'lego-recut',
    scope: { seed_numbers: [SEED], lego_ids: ['S0343L02'], rows: 1 },
    detail: { ruling: RULING, from: OLD.legos[1], to: { idx: 2, known: l2.known, target: l2.target, is_new: l2.is_new, type: l2.type, components: l2.components } } });
  const phraseEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-edit',
    scope: { seed_numbers: SEEDS_TO_UNAPPROVE, phrase_ids: [...CHANGES.map(c => `${COURSE}:${c.id}`), `${COURSE}:${INSERT.id}`], rows: CHANGES.length + 1 },
    detail: { ruling: RULING,
      changes: CHANGES.map(c => { const o = [...OLD.phrases, ...OLD.other].find(p => p.id === c.id); return { id: `${COURSE}:${c.id}`, known_from: o.known, target_from: o.target, known_to: c.known, target_to: c.target }; }),
      inserted: [{ id: `${COURSE}:${INSERT.id}`, known: INSERT.known, target: INSERT.target, role: INSERT.role }] } });
  const seedEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'unapprove',
    scope: { seed_numbers: SEEDS_TO_UNAPPROVE, rows: SEEDS_TO_UNAPPROVE.length }, detail: { why: 'seed 343 re-cut and 351 U05 corrected; need Kai\'s read' } });
  log.events = { legoEvent, phraseEvent, seedEvent };

  await pg.query('BEGIN');
  try {
    // 1. L02 re-textured in place. The Italian changed, so the target clips are emptied; the
    //    English clip is emptied too (new words); the presentation no longer mirrors the LEGO.
    const r = await pg.query(
      `UPDATE course_legos SET known_text=$1, target_text=$2, components=$3, known_audio_id=NULL, target1_audio_id=NULL, target2_audio_id=NULL, presentation_audio_id=NULL, target1_duration_ms=NULL, target2_duration_ms=NULL, last_edit_event_id=$4, updated_at=now()
        WHERE course_code=$5 AND seed_number=$6 AND lego_index=2 AND known_text=$7 AND target_text=$8`,
      [l2.known, l2.target, JSON.stringify(l2.components), legoEvent, COURSE, SEED, src.known_text, src.target_text]);
    if (r.rowCount !== 1) throw new Error(`lego S0343L02: ${r.rowCount} rows`);
    // 2. The five phrase rows. A changed side loses its clip (the same-voice relink trigger may
    //    put one back where a clip already speaks the new text); an unchanged side keeps it.
    for (const c of CHANGES) {
      const o = [...OLD.phrases, ...OLD.other].find(p => p.id === c.id);
      const u = await pg.query(
        `UPDATE course_practice_phrases SET known_text=$1, target_text=$2,
           known_audio_id = CASE WHEN $1 = known_text THEN known_audio_id ELSE NULL END,
           target1_audio_id = CASE WHEN $2 = target_text THEN target1_audio_id ELSE NULL END,
           target2_audio_id = CASE WHEN $2 = target_text THEN target2_audio_id ELSE NULL END,
           word_count=$3, lego_count=$4, qa_checked=NULL, decomposition=NULL, decomposition_course_version=NULL, display_tiling=NULL, display_tiling_version=NULL,
           last_edit_event_id=$5, updated_at=now()
         WHERE course_code=$6 AND id=$7 AND known_text=$8 AND target_text=$9`,
        [c.known, c.target, c.target.length, c.target.split(/\s+/).length, phraseEvent, COURSE, `${COURSE}:${c.id}`, o.known, o.target]);
      if (u.rowCount !== 1) throw new Error(`${c.id}: ${u.rowCount} rows`);
    }
    // 3. The component row for "about → per"; C01/C02 move to indexes 1 and 2 in the array.
    await pg.query(
      `INSERT INTO course_practice_phrases (id, course_code, seed_number, lego_index, position, known_text, target_text, word_count, lego_count, metadata, status, phrase_role, connected_lego_ids, lego_position, lego_id, introduce, last_edit_event_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,1,$9,'draft','component','{}','middle',$10,true,$11)`,
      [`${COURSE}:${INSERT.id}`, COURSE, SEED, INSERT.idx, INSERT.position, INSERT.known, INSERT.target, INSERT.target.length, JSON.stringify({ buildup: 'component', component_index: INSERT.componentIndex }), 'S0343L02', phraseEvent]);
    for (const [id, i] of [['S0343L02C01', 1], ['S0343L02C02', 2]]) {
      const m = await pg.query(`UPDATE course_practice_phrases SET metadata = metadata || $1::jsonb, last_edit_event_id=$2, updated_at=now() WHERE course_code=$3 AND id=$4`, [JSON.stringify({ component_index: i }), phraseEvent, COURSE, `${COURSE}:${id}`]);
      if (m.rowCount !== 1) throw new Error(`${id} metadata: ${m.rowCount} rows`);
    }
    // 4. Both seeds lose their approval.
    const s = await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number = ANY($3)', [seedEvent, COURSE, SEEDS_TO_UNAPPROVE]);
    if (s.rowCount !== SEEDS_TO_UNAPPROVE.length) throw new Error(`unapproved ${s.rowCount} seeds`);
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
  await refreshNow();
}

// ── Audio ───────────────────────────────────────────────────────────────────────────────
/** Every NULL Italian slot on the rows this job touches (English is the Sonia tool's). */
async function emptySlots(pg) {
  const ids = [...CHANGES.map(c => `${COURSE}:${c.id}`), `${COURSE}:${INSERT.id}`];
  const { rows } = await pg.query(
    `SELECT 'course_legos' AS tbl, lego_id AS id, target_text, target1_audio_id, target2_audio_id FROM course_legos WHERE course_code=$1 AND seed_number=$2 AND lego_index=2
     UNION ALL SELECT 'course_practice_phrases', id, target_text, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($3)
     ORDER BY 2`, [COURSE, SEED, ids]);
  const slots = [];
  for (const r of rows) for (const role of ['target1', 'target2']) if (!r[`${role}_audio_id`]) slots.push({ tbl: r.tbl, id: r.id, role, text: r.target_text, language: 'ita' });
  return slots;
}

async function fillAudio(pg, supabase, log) {
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

  const link = async (slot, audioId) => {
    const idCol = slot.tbl === 'course_legos' ? 'lego_id' : 'id';
    const r = await pg.query(`UPDATE ${slot.tbl} SET ${slot.role}_audio_id=$1 WHERE course_code=$2 AND ${idCol}=$3 AND target_text=$4 AND ${slot.role}_audio_id IS NULL`, [audioId, COURSE, slot.id, slot.text]);
    return r.rowCount === 1;
  };

  for (const slot of await emptySlots(pg)) {
    const entry = { ...slot };
    log.audio.push(entry);
    const { rows: have } = await pg.query(
      `SELECT id, voice_id, course_code FROM course_audio WHERE language=$1 AND text_normalized=normalize_text($2) AND s3_key IS NOT NULL AND voice_id = ANY($3)
        ORDER BY (course_code=$4) DESC, (role=$5) DESC, created_at DESC LIMIT 1`, [slot.language, slot.text, AZURE_VOICE_IDS[slot.role], COURSE, slot.role]);
    if (have[0]) { entry.result = `linked existing ${have[0].voice_id} clip ${have[0].id} (${have[0].course_code})`; entry.linked = await link(slot, have[0].id); continue; }
    const voice = slot.role === 'target1' ? ELSA : BENIGNO;
    try {
      const renderAndMaster = async () => {
        const out = await ttsService.generateWithRetry(slot.text, 'azure', {
          // voiceBound: two Italian voices speak the same words; without it the door answers the
          // Benigno request with the Elsa clip it has just stored. Cast gate + spend guard stand.
          door: { courseCode: COURSE, intro: false, language: 'ita', voiceBound: true },
          subscriptionKey: process.env.AZURE_SPEECH_KEY, region: process.env.AZURE_SPEECH_REGION || 'westeurope', voiceName: voice.voiceName, speed: 1,
        });
        if (out.existingClip && !AZURE_VOICE_IDS[slot.role].includes(out.existingClip.voice_id)) throw new Error(`door offered an existing ${out.existingClip.voice_id} clip; Azure only — left silent`);
        const { buffer, durationMs } = await phase8.masterAudio(out.audioBuffer, slot.text, await voiceConfigService.masteringOptsFor(voice.voiceName, 'azure'));
        return { buffer, durationMs, wordBoundaries: out.wordBoundaries };
      };
      const gated = await veracity.renderChecked({ render: renderAndMaster, expectedText: slot.text, language: 'ita', sampler: veracity.ALWAYS_SAMPLER, logger,
        meta: { courseCode: COURSE, role: slot.role, voiceId: voice.voiceName, phrase_id: slot.id, originalText: slot.text } });
      if (!gated.published) throw new Error(`veracity gate: quarantined after ${gated.attempts} attempts (${gated.verdict?.reason})`);
      const newAudioId = uuidv4().toUpperCase();
      const newS3Key = `mastered/${newAudioId}.mp3`;
      await s3.send(new PutObjectCommand({ Bucket: phase8.S3_BUCKET, Key: newS3Key, Body: gated.buffer, ContentType: 'audio/mpeg', CacheControl: 'public, max-age=31536000, immutable' }));
      const verdictColumns = veracity.verdictColumns(gated.verdict, { checker: SWEEP, attempts: gated.attempts });
      const textNormalized = normalizeForAudio(slot.text);
      const base = { course_code: COURSE, text: slot.text, text_normalized: textNormalized, language: 'ita', role: slot.role, voice_id: voice.voiceId, origin: 'tts' };
      const out = await writeOrSwapClip({ supabase,
        identity: { course_code: COURSE, text_normalized: textNormalized, language: 'ita', role: slot.role, voice_id: voice.voiceId },
        insertRow: { ...base, s3_key: newS3Key, duration_ms: gated.durationMs, word_boundaries: gated.wordBoundaries || null, ...verdictColumns },
        swapPatch: { voice_id: voice.voiceId, origin: 'tts', word_boundaries: gated.wordBoundaries || null, text: slot.text, ...verdictColumns },
        newS3Key, durationMs: gated.durationMs, source: SWEEP, acceptedBy: `${SWEEP} (${slot.role}, ${voice.voiceName})`, reason: RULING, logger });
      entry.result = `rendered ${voice.voiceName} clip ${out.audioId} (${gated.durationMs} ms)`;
      const { rows: [now] } = await pg.query(`SELECT ${slot.role}_audio_id AS id FROM ${slot.tbl} WHERE course_code=$1 AND ${slot.tbl === 'course_legos' ? 'lego_id' : 'id'}=$2`, [COURSE, slot.id]);
      entry.linked = now?.id ? now.id === out.audioId || (await link(slot, out.audioId)) : await link(slot, out.audioId);
      if (now?.id && now.id !== out.audioId) entry.result += ` — slot already held ${now.id} (trigger-linked)`;
    } catch (e) { entry.result = `REFUSED/FAILED: ${e.message}`; }
  }
}

async function main() {
  const APPLY = process.env.APPLY === '1';
  const RENDER = process.env.RENDER === '1';
  const { Client } = require('pg');
  const { createClient } = require('@supabase/supabase-js');
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const log = { sweep: SWEEP, ruling: RULING, apply: APPLY, render: RENDER, started: new Date().toISOString(), problems: [], zut: [], sweep_hits: [], audio: [] };

  const { problems: offline, phrases } = checkOffline();
  log.problems.push(...offline);
  console.log(`\n══ ${COURSE} seed ${SEED} re-cut — ${APPLY ? 'APPLY' : RENDER ? 'RENDER' : 'DRY RUN'} ══`);
  console.log(`offline rules: ${offline.length ? offline.join('\n  ') : 'tiling, components tile the LEGO, containment, no PER + infinitive, no stray oggi, L01 B01 untouched — all hold'}`);

  if (!RENDER) {
    const live = await guardLive(pg);
    log.problems.push(...live.problems);
    if (live.problems.length) console.log('LIVE STATE DIFFERS:\n  ' + live.problems.join('\n  '));
    else {
      const zut = await zutAgainstCourse(pg);
      log.zut = zut;
      console.log(`ZUT against the rest of the course: ${zut.length ? '\n  ' + zut.join('\n  ') : 'no clash'}`);
      if (zut.length) log.problems.push(...zut);
      const hits = await glossSweep(pg);
      log.sweep_hits = hits;
      const outside = hits.filter(h => !h.inChanges);
      console.log(`gloss sweep (whole course): ${hits.length} row(s) carry an old gloss — ${hits.filter(h => h.inChanges).length} in this job's changes, ${outside.length} outside`);
      for (const h of hits) console.log(`  ${h.inChanges ? 'fixed here' : 'OUTSIDE  '} ${h.id} "${h.known_text}" → "${h.target_text}"`);
      if (outside.length) log.problems.push(...outside.map(h => `gloss sweep: ${h.id} outside this job's changes`));
    }
    for (const l of NEW_LEGOS) console.log(`  L0${l.idx} ${l.is_new ? 'NEW' : 'not new'} ${l.type}  "${l.known}" → "${l.target}"`);
    for (const p of phrases.filter(p => p.knownChanged || p.targetChanged || p.inserted)) console.log(`  ${p.id} ${p.inserted ? 'INSERT' : 'EDIT  '}  "${p.known}" → "${p.target}"`);
    for (const c of CHANGES.filter(c => c.seed && c.seed !== SEED)) console.log(`  ${c.id} EDIT    "${c.known}" → "${c.target}"`);
    if (APPLY && !log.problems.length) {
      await applyContent(pg, supabase, live.legos, live.phrases, log);
      console.log(`APPLIED. events=${JSON.stringify(log.events)}; course_round_index refreshed`);
    }
  }
  if (RENDER || (APPLY && !log.problems.length)) {
    await fillAudio(pg, supabase, log);
    console.log('\nAUDIO slots (Italian):');
    for (const a of log.audio) console.log(`  ${a.id} ${a.role} "${a.text}": ${a.result}${a.linked ? ' → linked' : ''}`);
  }
  const f = evidencePath(`tools/course-optimization/${SWEEP}/${APPLY ? 'applied' : RENDER ? 'render' : 'dryrun'}-${stamp}.json`);
  fs.writeFileSync(f, JSON.stringify(log, null, 2));
  console.log(`Wrote ${f}`);
  await pg.end();
  process.exit(log.problems.length ? 2 : 0);
}

module.exports = { OLD, NEW_LEGOS, CHANGES, INSERT, SEED_TEXT, PRIOR, resolvedPhrases, checkOffline, phraseContainsLego, legosTileSeed, perInfinitive, componentsTileLego, strayOggi, b01Untouched };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
