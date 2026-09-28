#!/usr/bin/env node
'use strict';
// tools/course-optimization/ita-seed-519-recut-2026-09-28.cjs
//
// ita_for_eng seed 519 — "I haven't seen their new baby yet" → "non ho ancora visto il loro
// nuovo bambino". Kai's design, ruled 2026-09-28 (job #522): the seed stays exactly as it is
// on both sides; the LEGOs are re-cut and reordered like a split verb.
//
// THE DEFECT (d/cfeaa686, seed 519 section): L04 "I haven't seen → non ho ancora visto" had
// swallowed the seed's one "ancora", so L01 "yet → ancora" (not new, no phrases) had nothing
// to point at, B03 grew a doubled "…bambino ancora", U03 said "non ho ancora visto" under an
// English with no "yet", and U04 "…ancora … per niente" was not Italian.
//
// THE CUT, staged like a split verb (Kai):
//   L01  baby → bambino                     (was L02; rows unchanged)
//   L02  their → loro                       (was L03; U03 "molto bellissimo" → "bellissimo")
//   L03  I haven't seen → non ho visto      (was L04, NEW: no earlier LEGO has both sides —
//                                            S0369L01 is "I saw → ho visto"; "non ho visto"
//                                            appears inside two earlier phrases but never as a
//                                            LEGO, and a LEGO is a duplicate only if BOTH sides
//                                            match). Its phrases never carry "ancora".
//   L04  yet → ancora                       (was L01; stays NOT NEW — S0060L02 teaches it —
//                                            but now carries the phrases that practise WHERE
//                                            ancora goes: between the auxiliary and the
//                                            participle, English "…yet" at the end, building
//                                            up to the full seed.)
// Nothing is deleted: the four lego rows keep their slots and are re-textured in place (the
// phrases→legos FK is not deferrable, so slot numbers cannot be swapped under live phrases);
// every old phrase row is moved to its new slot; eight new rows are inserted under L04.
//
// GATES, before any write: the live seed must be exactly the picture this tool was written
// against (OLD below), the offline rules must hold (tiling, both-sides containment, no ancora
// under L03, ancora in the aux…participle slot under L04, no untaught words by the builder's
// own /v2/validate dry run — verified 2026-09-28: seed 519's only issues before and after are
// the course-wide bare-LEGO build-count convention), and no new pair may collide with a
// different pair elsewhere in the course (ZUT).
//
// AUDIO — AZURE ONLY (Kai): Italian on the course's cast, Elsa (target1) / Benigno (target2),
// rendered through the one TTS door (services/tts-service.cjs) with the spend guard and the
// cast gate in the way — never routed around. English: Azure Sonia is NOT in the English cast
// any more, so no new Sonia clip can be rendered; a slot is linked only where a Sonia clip
// speaking exactly those words already exists in any course, otherwise it is left SILENT and
// listed in the evidence file and the report. Never Cartesia, never xAI, even when the door
// offers an existing clip in one of those voices. Make-before-break: nothing is deleted.
//
//   node tools/course-optimization/ita-seed-519-recut-2026-09-28.cjs            # dry run
//   APPLY=1 node tools/course-optimization/ita-seed-519-recut-2026-09-28.cjs    # write content
//   RENDER=1 node tools/course-optimization/ita-seed-519-recut-2026-09-28.cjs   # fill audio slots
//   ZUT after: node tools/course-optimization/audit-phrase-zut.cjs ita_for_eng

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'ita_for_eng';
const SEED = 519;
const SWEEP = 'ita-seed-519-recut-2026-09-28';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const RULING = 'Kai, 2026-09-28 (job #522): seed 519 re-cut — "I haven\'t seen → non ho visto" without ancora, then "yet → ancora" practised in its slot between auxiliary and participle; seed unchanged';

const SEED_TEXT = { known: "I haven't seen their new baby yet", target: 'non ho ancora visto il loro nuovo bambino' };

const SONIA = { voiceId: 'azure_en-GB-SoniaNeural', voiceName: 'en-GB-SoniaNeural' };
const ELSA = { voiceId: 'azure_it-IT-ElsaNeural', voiceName: 'it-IT-ElsaNeural', role: 'target1' };
const BENIGNO = { voiceId: 'azure_it-IT-BenignoNeural', voiceName: 'it-IT-BenignoNeural', role: 'target2' };
/** Every spelling of the three voices that course_audio carries. */
const AZURE_VOICE_IDS = {
  known: ['azure_en-GB-SoniaNeural', 'en-GB-SoniaNeural'],
  target1: ['azure_it-IT-ElsaNeural', 'it-IT-ElsaNeural'],
  target2: ['azure_it-IT-BenignoNeural', 'it-IT-BenignoNeural'],
};

// ── The picture this tool was written against (live 2026-09-28 15:00Z) ─────────────────
const OLD = {
  legos: [
    { idx: 1, type: 'A', is_new: false, known: 'yet', target: 'ancora' },
    { idx: 2, type: 'A', is_new: true, known: 'baby', target: 'bambino' },
    { idx: 3, type: 'A', is_new: true, known: 'their', target: 'loro' },
    { idx: 4, type: 'M', is_new: true, known: "I haven't seen", target: 'non ho ancora visto' },
  ],
  phrases: [
    { id: 'S0519L02B01', known: 'baby', target: 'bambino' },
    { id: 'S0519L02B03', known: 'a new baby', target: 'un nuovo bambino' },
    { id: 'S0519L02B04', known: 'a beautiful baby', target: 'un bambino bellissimo' },
    { id: 'S0519L02U05', known: 'the new baby is very beautiful', target: 'il nuovo bambino è molto bello' },
    { id: 'S0519L02U06', known: 'the new baby is doing well', target: 'il nuovo bambino sta bene' },
    { id: 'S0519L02U07', known: 'the baby is beautiful', target: 'il bambino è bellissimo' },
    { id: 'S0519L02U08', known: 'do you have a new baby?', target: 'hai un nuovo bambino?' },
    { id: 'S0519L02U09', known: "it's a very beautiful baby", target: 'è un bambino molto bello' },
    { id: 'S0519L03B01', known: 'their', target: 'loro' },
    { id: 'S0519L03B02', known: 'their new baby', target: 'il loro nuovo bambino' },
    { id: 'S0519L03B03', known: "it's their baby", target: 'è il loro bambino' },
    { id: 'S0519L03U02', known: 'she said their baby is beautiful', target: 'ha detto che il loro bambino è bellissimo' },
    { id: 'S0519L03U03', known: 'their new baby is beautiful', target: 'il loro nuovo bambino è molto bellissimo' },
    { id: 'S0519L03U04', known: 'she said their baby is doing well', target: 'ha detto che il loro bambino sta bene' },
    { id: 'S0519L03U05', known: "I've heard about their new baby", target: 'ho sentito del loro nuovo bambino' },
    { id: 'S0519L03U06', known: 'I like their new baby', target: 'mi piace il loro nuovo bambino' },
    { id: 'S0519L04C01', known: "I haven't", target: 'non ho ancora' },
    { id: 'S0519L04C02', known: 'seen', target: 'visto' },
    { id: 'S0519L04B01', known: "I haven't seen", target: 'non ho ancora visto' },
    { id: 'S0519L04B02', known: "I haven't seen their baby", target: 'non ho ancora visto il loro bambino' },
    { id: 'S0519L04B03', known: "I haven't seen their new baby yet", target: 'non ho ancora visto il loro nuovo bambino ancora' },
    { id: 'S0519L04U01', known: "I haven't seen their new baby yet", target: 'non ho ancora visto il loro nuovo bambino' },
    { id: 'S0519L04U02', known: "I haven't seen the perfect house yet", target: 'non ho ancora visto la casa perfetta' },
    { id: 'S0519L04U03', known: "I haven't seen what happened", target: 'non ho ancora visto quello che è successo' },
    { id: 'S0519L04U04', known: "I haven't seen their new baby at all", target: 'non ho ancora visto il loro nuovo bambino per niente' },
    { id: 'S0519L04U05', known: "I haven't seen the new problem yet", target: 'non ho ancora visto il nuovo problema' },
  ],
};

// ── The new cut ─────────────────────────────────────────────────────────────────────────
/** New lego slots, and which OLD slot each one's clips and presentation come from. */
const NEW_LEGOS = [
  { idx: 1, type: 'A', is_new: true, known: 'baby', target: 'bambino', components: [], from: 2 },
  { idx: 2, type: 'A', is_new: true, known: 'their', target: 'loro', components: [], from: 3 },
  { idx: 3, type: 'M', is_new: true, known: "I haven't seen", target: 'non ho visto',
    components: [{ known: "I haven't", target: 'non ho' }, { known: 'seen', target: 'visto' }], from: 4 },
  { idx: 4, type: 'A', is_new: false, known: 'yet', target: 'ancora', components: [], from: 1 },
];

/** Every phrase row after the cut. `from` names the old row that becomes it (its position and,
 *  where the text on a side is unchanged, its clip on that side survive); rows without `from`
 *  are inserted. Positions under L03 keep the old L04 numbering (C01 C02 = 1 2, B = 3–5, U = 6–10). */
const NEW_PHRASES = [
  // L01 baby — unchanged rows, moved from slot 2
  ...['B01', 'B03', 'B04', 'U05', 'U06', 'U07', 'U08', 'U09'].map(s => ({ id: `S0519L01${s}`, from: `S0519L02${s}` })),
  // L02 their — moved from slot 3; U03 loses the double superlative
  ...['B01', 'B02', 'B03', 'U02', 'U04', 'U05', 'U06'].map(s => ({ id: `S0519L02${s}`, from: `S0519L03${s}` })),
  { id: 'S0519L02U03', from: 'S0519L03U03', known: 'their new baby is beautiful', target: 'il loro nuovo bambino è bellissimo' },
  // L03 I haven't seen → non ho visto — never with ancora
  { id: 'S0519L03C01', from: 'S0519L04C01', known: "I haven't", target: 'non ho' },
  { id: 'S0519L03C02', from: 'S0519L04C02', known: 'seen', target: 'visto' },
  { id: 'S0519L03B01', from: 'S0519L04B01', known: "I haven't seen", target: 'non ho visto' },
  { id: 'S0519L03B02', from: 'S0519L04B02', known: "I haven't seen their baby", target: 'non ho visto il loro bambino' },
  { id: 'S0519L03B03', from: 'S0519L04B03', known: "I haven't seen their new baby", target: 'non ho visto il loro nuovo bambino' },
  { id: 'S0519L03U01', from: 'S0519L04U03', known: "I haven't seen what happened", target: 'non ho visto quello che è successo' },
  { id: 'S0519L03U02', from: 'S0519L04U04', known: "I haven't seen anything", target: 'non ho visto niente' },
  { id: 'S0519L03U03', from: 'S0519L04U02', known: "I haven't seen the perfect house", target: 'non ho visto la casa perfetta' },
  { id: 'S0519L03U04', from: 'S0519L04U05', known: "I haven't seen the new problem", target: 'non ho visto il nuovo problema' },
  { id: 'S0519L03U05', from: 'S0519L04U01', known: "I haven't seen the film", target: 'non ho visto il film' },
  // L04 yet → ancora — where ancora goes, building up to the seed
  { id: 'S0519L04B01', position: 1, known: "I haven't seen anything yet", target: 'non ho ancora visto niente' },
  { id: 'S0519L04B02', position: 2, known: "I haven't seen their baby yet", target: 'non ho ancora visto il loro bambino' },
  { id: 'S0519L04B03', position: 3, known: "I haven't seen their new baby yet", target: 'non ho ancora visto il loro nuovo bambino' },
  { id: 'S0519L04U01', position: 4, known: "I haven't seen the perfect house yet", target: 'non ho ancora visto la casa perfetta' },
  { id: 'S0519L04U02', position: 5, known: "I haven't seen the new problem yet", target: 'non ho ancora visto il nuovo problema' },
  { id: 'S0519L04U03', position: 6, known: "I haven't seen what happened yet", target: 'non ho ancora visto quello che è successo' },
  { id: 'S0519L04U04', position: 7, known: "I haven't seen the film yet", target: 'non ho ancora visto il film' },
  { id: 'S0519L04U05', position: 8, known: "I haven't seen it yet", target: "non l'ho ancora visto" },
];

// ── The rules, as code ──────────────────────────────────────────────────────────────────
const norm = (s) => String(s || '').toLowerCase().replace(/[.,!?;:"]+/g, ' ').replace(/’/g, "'").replace(/\s+/g, ' ').trim();
const idParts = (id) => ({ seed: Number(id.slice(1, 5)), idx: Number(id.slice(6, 8)), role: { B: 'build', U: 'use', C: 'component' }[id[8]], n: Number(id.slice(9)) });

/** Resolve every new phrase row to full text (inheriting from its old row where unchanged). */
function resolvedPhrases() {
  const old = Object.fromEntries(OLD.phrases.map(p => [p.id, p]));
  return NEW_PHRASES.map(p => {
    const src = p.from ? old[p.from] : null;
    if (p.from && !src) throw new Error(`${p.id}: old row ${p.from} is not in the OLD picture`);
    const known = p.known ?? src.known, target = p.target ?? src.target;
    return { ...p, ...idParts(p.id), known, target, knownChanged: !!src && src.known !== known, targetChanged: !!src && src.target !== target };
  });
}

/** Both sides of a phrase carry both sides of its LEGO (components carry their own piece). */
function phraseContainsLego(lego, phrase) {
  if (phrase.role === 'component') return true;
  return ` ${norm(phrase.target)} `.includes(` ${norm(lego.target)} `) && ` ${norm(phrase.known)} `.includes(` ${norm(lego.known)} `);
}
/** The LEGO pieces plus the seed's earlier-taught words (il, nuovo / new) are the seed, on both
 *  sides. Checked as a bag: L04 "ancora" sits INSIDE L03's Italian span in the seed
 *  (non ho ANCORA visto), so an ordered read cannot be the test — that is the split-verb staging. */
const PRIOR_WORDS = { ita: ['il', 'nuovo'], eng: ['new'] };
function legosTileSeed(legos, seed) {
  const bag = (words) => words.map(norm).join(' ').split(' ').sort().join(' ');
  return bag([...legos.map(l => l.target), ...PRIOR_WORDS.ita]) === bag([seed.target])
    && bag([...legos.map(l => l.known), ...PRIOR_WORDS.eng]) === bag([seed.known]);
}
/** Under L03 no phrase says ancora; under L04 every build/use phrase puts ancora between the
 *  auxiliary and the participle and ends its English with "yet". */
const ANCORA_SLOT = /\bnon (l')?ho ancora visto\b/;
function ancoraRules(phrases) {
  const bad = [];
  for (const p of phrases) {
    if (p.idx === 3 && /\bancora\b/i.test(p.target)) bad.push(`${p.id}: ancora under "non ho visto"`);
    if (p.idx === 4 && p.role !== 'component' && !(ANCORA_SLOT.test(p.target) && /\byet$/i.test(p.known))) bad.push(`${p.id}: ancora not in the aux…participle slot / English not ending in yet`);
  }
  return bad;
}
/** L04's phrases build up to the full seed. */
const buildsUpToSeed = (phrases) => phrases.some(p => p.idx === 4 && p.role === 'build' && norm(p.known) === norm(SEED_TEXT.known) && norm(p.target) === norm(SEED_TEXT.target));
/** Never a doubled ancora. */
const noDoubledAncora = (phrases) => phrases.every(p => (norm(p.target).match(/\bancora\b/g) || []).length <= 1);

function checkOffline() {
  const phrases = resolvedPhrases();
  const problems = [];
  if (!legosTileSeed(NEW_LEGOS, SEED_TEXT)) problems.push('LEGOs do not tile the seed');
  for (const p of phrases) {
    const lego = NEW_LEGOS.find(l => l.idx === p.idx);
    if (!phraseContainsLego(lego, p)) problems.push(`${p.id} "${p.known}" → "${p.target}" does not contain LEGO ${lego.idx} on both sides`);
  }
  problems.push(...ancoraRules(phrases));
  if (!buildsUpToSeed(phrases)) problems.push('L04 build phrases do not reach the full seed');
  if (!noDoubledAncora(phrases)) problems.push('a phrase carries ancora twice');
  const ids = phrases.map(p => p.id);
  if (new Set(ids).size !== ids.length) problems.push('duplicate new phrase ids');
  const froms = phrases.filter(p => p.from).map(p => p.from);
  if (new Set(froms).size !== froms.length) problems.push('an old row is used twice');
  const unused = OLD.phrases.filter(o => !froms.includes(o.id));
  if (unused.length) problems.push(`old rows not carried forward: ${unused.map(o => o.id).join(', ')}`);
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
  return { problems, legos, phrases };
}

/** ZUT against the rest of the course: a new pair must not share a side with a different pair
 *  elsewhere (component rows exempt on the known side, as audit-phrase-zut has it). */
async function zutAgainstCourse(pg, phrases) {
  const pairs = [...NEW_LEGOS.map(l => ({ id: `L${l.idx}`, known: l.known, target: l.target, component: false })), ...phrases.map(p => ({ id: p.id, known: p.known, target: p.target, component: p.role === 'component' }))];
  const clashes = [];
  for (const p of pairs) {
    const { rows } = await pg.query(
      `SELECT id, known_text, target_text, phrase_role FROM course_practice_phrases WHERE course_code=$1 AND seed_number<>$2 AND ((lower(trim(known_text))=lower($3) AND lower(trim(target_text))<>lower($4) AND phrase_role<>'component') OR (lower(trim(target_text))=lower($4) AND lower(trim(known_text))<>lower($3) AND phrase_role<>'component'))
       UNION ALL SELECT lego_id, known_text, target_text, 'lego' FROM course_legos WHERE course_code=$1 AND seed_number<>$2 AND ((lower(trim(known_text))=lower($3) AND lower(trim(target_text))<>lower($4)) OR (lower(trim(target_text))=lower($4) AND lower(trim(known_text))<>lower($3)))`,
      [COURSE, SEED, p.known, p.target]);
    for (const r of rows) if (!p.component) clashes.push(`${p.id} "${p.known}" → "${p.target}" vs ${r.id} "${r.known_text}" → "${r.target_text}"`);
  }
  return clashes;
}

// ── Apply ───────────────────────────────────────────────────────────────────────────────
async function applyContent(pg, supabase, liveLegos, livePhrases, phrases, log) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const oldL = Object.fromEntries(liveLegos.map(l => [l.lego_index, l]));
  const oldP = Object.fromEntries(livePhrases.map(p => [p.id.split(':')[1], p]));

  const legoEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'lego-recut',
    scope: { seed_numbers: [SEED], lego_ids: OLD.legos.map(l => `S0519L0${l.idx}`), rows: 4 },
    detail: { ruling: RULING, from: OLD.legos, to: NEW_LEGOS.map(l => ({ idx: l.idx, known: l.known, target: l.target, is_new: l.is_new, type: l.type })) } });
  const phraseEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-edit',
    scope: { seed_numbers: [SEED], phrase_ids: phrases.map(p => `${COURSE}:${p.id}`), rows: phrases.length },
    detail: { ruling: RULING, moved: phrases.filter(p => p.from).map(p => ({ from: p.from, to: p.id, known: p.known, target: p.target })), inserted: phrases.filter(p => !p.from).map(p => ({ id: p.id, known: p.known, target: p.target })) } });
  const seedEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'unapprove',
    scope: { seed_numbers: [SEED], rows: 1 }, detail: { why: 'seed 519 re-cut; needs Kai\'s read' } });
  log.events = { legoEvent, phraseEvent, seedEvent };

  await pg.query('BEGIN');
  try {
    // 1. LEGO slots, re-textured in place; clips and presentation follow the content, set
    //    explicitly in the same UPDATE so the text-change trigger respects them.
    for (const l of NEW_LEGOS) {
      const src = oldL[l.from];
      const targetSame = norm(src.target_text) === norm(l.target);
      const r = await pg.query(
        `UPDATE course_legos SET type=$1, is_new=$2, known_text=$3, target_text=$4, components=$5, known_audio_id=$6, target1_audio_id=$7, target2_audio_id=$8, presentation_audio_id=$9, target1_duration_ms=$10, target2_duration_ms=$11, last_edit_event_id=$12, updated_at=now()
          WHERE course_code=$13 AND seed_number=$14 AND lego_index=$15`,
        [l.type, l.is_new, l.known, l.target, JSON.stringify(l.components), src.known_audio_id, targetSame ? src.target1_audio_id : null, targetSame ? src.target2_audio_id : null,
          l.is_new ? src.presentation_audio_id : null, targetSame ? src.target1_duration_ms : null, targetSame ? src.target2_duration_ms : null, legoEvent, COURSE, SEED, l.idx]);
      if (r.rowCount !== 1) throw new Error(`lego slot ${l.idx}: ${r.rowCount} rows`);
    }
    // 2. Old phrase rows move to their new slot, in slot order so (lego_index, position) never collides:
    //    slot 1 is empty, then 2 empties as its rows leave, then 3.
    for (const idx of [1, 2, 3]) {
      for (const p of phrases.filter(x => x.from && x.idx === idx)) {
        const src = oldP[p.from];
        const r = await pg.query(
          `UPDATE course_practice_phrases SET id=$1, lego_index=$2, lego_id=$3, known_text=$4, target_text=$5,
             known_audio_id=$6, target1_audio_id=$7, target2_audio_id=$8, word_count=$9, lego_count=$10,
             qa_checked=NULL, decomposition=NULL, decomposition_course_version=NULL, display_tiling=NULL, display_tiling_version=NULL,
             last_edit_event_id=$11, updated_at=now()
           WHERE course_code=$12 AND id=$13`,
          [`${COURSE}:${p.id}`, p.idx, `S0519L0${p.idx}`, p.known, p.target,
            p.knownChanged ? null : src.known_audio_id, p.targetChanged ? null : src.target1_audio_id, p.targetChanged ? null : src.target2_audio_id,
            p.target.length, p.target.split(/\s+/).length, phraseEvent, COURSE, `${COURSE}:${p.from}`]);
        if (r.rowCount !== 1) throw new Error(`${p.from} → ${p.id}: ${r.rowCount} rows`);
      }
    }
    // 3. The eight new rows under L04.
    for (const p of phrases.filter(x => !x.from)) {
      await pg.query(
        `INSERT INTO course_practice_phrases (id, course_code, seed_number, lego_index, position, known_text, target_text, word_count, lego_count, metadata, status, phrase_role, connected_lego_ids, lego_position, lego_id, introduce, last_edit_event_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'{}','draft',$10,'{}','middle',$11,true,$12)`,
        [`${COURSE}:${p.id}`, COURSE, SEED, p.idx, p.position, p.known, p.target, p.target.length, p.target.split(/\s+/).length, p.role, `S0519L0${p.idx}`, phraseEvent]);
    }
    // 4. The seed loses its approval.
    const s = await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number=$3', [seedEvent, COURSE, SEED]);
    if (s.rowCount !== 1) throw new Error('seed unapprove');
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
  await refreshNow();
}

// ── Audio ───────────────────────────────────────────────────────────────────────────────
/** Every NULL slot on seed 519's legos and phrases, with the text it must speak. */
async function emptySlots(pg) {
  const { rows } = await pg.query(
    `SELECT 'course_legos' AS tbl, lego_id AS id, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id FROM course_legos WHERE course_code=$1 AND seed_number=$2
     UNION ALL SELECT 'course_practice_phrases', id, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE course_code=$1 AND seed_number=$2
     ORDER BY 2`, [COURSE, SEED]);
  // A slot holding a clip in a voice outside the Azure cast (six rows under L01/L02 carried
  // xAI Eve / Ara / Leo from an earlier pass) is treated as empty: the seed is Azure only (Kai),
  // and a slot whose voice changes between rows of one seed is the defect voice-slots doctrine
  // names. The old clip row is never deleted — make-before-break — only the link moves.
  const { rows: voices } = await pg.query('SELECT id, voice_id FROM course_audio WHERE id = ANY($1)', [[...new Set(rows.flatMap(r => [r.known_audio_id, r.target1_audio_id, r.target2_audio_id]).filter(Boolean))]]);
  const voiceOf = Object.fromEntries(voices.map(v => [v.id, v.voice_id]));
  const offCast = (audioId, role) => audioId && !AZURE_VOICE_IDS[role].includes(voiceOf[audioId]);
  const slots = [];
  for (const r of rows) {
    for (const [role, audioId, text, language] of [['known', r.known_audio_id, r.known_text, 'eng'], ['target1', r.target1_audio_id, r.target_text, 'ita'], ['target2', r.target2_audio_id, r.target_text, 'ita']]) {
      if (!audioId) slots.push({ tbl: r.tbl, id: r.id, role, text, language });
      else if (offCast(audioId, role)) slots.push({ tbl: r.tbl, id: r.id, role, text, language, replacing: audioId, replacingVoice: voiceOf[audioId] });
    }
  }
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
  const RENDER = process.env.RENDER === '1';

  const link = async (slot, audioId) => {
    const idCol = slot.tbl === 'course_legos' ? 'lego_id' : 'id';
    const textCol = slot.role === 'known' ? 'known_text' : 'target_text';
    const r = await pg.query(`UPDATE ${slot.tbl} SET ${slot.role}_audio_id=$1 WHERE course_code=$2 AND ${idCol}=$3 AND ${textCol}=$4 AND ${slot.role}_audio_id IS NOT DISTINCT FROM $5`, [audioId, COURSE, slot.id, slot.text, slot.replacing || null]);
    return r.rowCount === 1;
  };

  for (const slot of await emptySlots(pg)) {
    const entry = { ...slot };
    log.audio.push(entry);
    // An existing clip in the right Azure voice, from any course, is linked — never re-rendered.
    const { rows: have } = await pg.query(
      `SELECT id, voice_id, course_code FROM course_audio WHERE language=$1 AND text_normalized=normalize_text($2) AND s3_key IS NOT NULL AND voice_id = ANY($3)
        ORDER BY (course_code=$4) DESC, (role=$5) DESC, created_at DESC LIMIT 1`, [slot.language, slot.text, AZURE_VOICE_IDS[slot.role], COURSE, slot.role]);
    if (have[0]) { entry.result = `linked existing ${have[0].voice_id} clip ${have[0].id} (${have[0].course_code})`; entry.linked = await link(slot, have[0].id); continue; }
    if (slot.role === 'known') { entry.result = slot.replacing ? `KEPT ${slot.replacingVoice}: no Azure Sonia clip speaks these words anywhere, and Sonia is not in the English cast (no new render)` : 'SILENT: no Azure Sonia clip speaks these words anywhere, and Sonia is not in the English cast (no new render)'; continue; }
    if (!RENDER) { entry.result = 'would render on Azure ' + (slot.role === 'target1' ? 'Elsa' : 'Benigno'); continue; }
    const voice = slot.role === 'target1' ? ELSA : BENIGNO;
    try {
      const renderAndMaster = async () => {
        const out = await ttsService.generateWithRetry(slot.text, 'azure', {
          // voiceBound: the course has TWO Italian voices speaking the same words; without it the
          // door answers the Benigno request with the Elsa clip it has just stored (any voice
          // answers first). The cast gate and the spend guard still stand in front of the render.
          door: { courseCode: COURSE, intro: false, language: 'ita', voiceBound: true, replacing: slot.replacing ? [slot.replacing] : [] },
          subscriptionKey: process.env.AZURE_SPEECH_KEY, region: process.env.AZURE_SPEECH_REGION || 'westeurope', voiceName: voice.voiceName, speed: 1,
        });
        // Belt and braces: only the cast Azure voice may sit on this slot.
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
      entry.linked = await link(slot, out.audioId);
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
  const log = { sweep: SWEEP, ruling: RULING, apply: APPLY, render: RENDER, started: new Date().toISOString(), problems: [], zut: [], audio: [] };

  const { problems: offline, phrases } = checkOffline();
  log.problems.push(...offline);
  console.log(`\n══ ${COURSE} seed ${SEED} re-cut — ${APPLY ? 'APPLY' : RENDER ? 'RENDER' : 'DRY RUN'} ══`);
  console.log(`offline rules: ${offline.length ? offline.join('\n  ') : 'tiling, containment, no ancora under L03, ancora slot + "…yet" under L04, builds up to the seed, no doubled ancora — all hold'}`);

  if (!RENDER) {
    const live = await guardLive(pg);
    log.problems.push(...live.problems);
    if (live.problems.length) console.log('LIVE STATE DIFFERS:\n  ' + live.problems.join('\n  '));
    else {
      const zut = await zutAgainstCourse(pg, phrases);
      log.zut = zut;
      console.log(`ZUT against the rest of the course: ${zut.length ? '\n  ' + zut.join('\n  ') : 'no clash'}`);
      if (zut.length) log.problems.push(...zut);
    }
    for (const l of NEW_LEGOS) console.log(`  L0${l.idx} ${l.is_new ? 'NEW' : 'not new'} ${l.type}  "${l.known}" → "${l.target}"`);
    for (const p of phrases) console.log(`  ${p.id} ${p.from ? `← ${p.from}` : 'INSERT'}  "${p.known}" → "${p.target}"`);
    if (APPLY && !log.problems.length) {
      await applyContent(pg, supabase, live.legos, live.phrases, phrases, log);
      console.log(`APPLIED. events=${JSON.stringify(log.events)}; course_round_index refreshed`);
    }
  }
  if (RENDER || (APPLY && !log.problems.length)) {
    await fillAudio(pg, supabase, log);
    console.log('\nAUDIO slots:');
    for (const a of log.audio) console.log(`  ${a.id} ${a.role} "${a.text}": ${a.result}${a.linked ? ' → linked' : ''}`);
  }
  const f = evidencePath(`tools/course-optimization/${SWEEP}/${APPLY ? 'applied' : RENDER ? 'render' : 'dryrun'}-${stamp}.json`);
  fs.writeFileSync(f, JSON.stringify(log, null, 2));
  console.log(`Wrote ${f}`);
  await pg.end();
  process.exit(log.problems.length ? 2 : 0);
}

module.exports = { OLD, NEW_LEGOS, NEW_PHRASES, SEED_TEXT, resolvedPhrases, checkOffline, phraseContainsLego, ancoraRules, buildsUpToSeed, noDoubledAncora, legosTileSeed };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
