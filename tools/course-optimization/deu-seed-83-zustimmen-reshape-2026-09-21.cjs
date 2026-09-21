#!/usr/bin/env node
// tools/course-optimization/deu-seed-83-zustimmen-reshape-2026-09-21.cjs
//
// deu_for_eng seed 83 — the seed where Kai's separable-verb ruling says the
// German split is TAUGHT. Kai ruled YES on the reshape, 2026-09-21 13:57Z.
//
// THE RULING'S CLAUSE 3, as content:
//   S0083L01 stops being the four-word split chunk "ich stimme dem zu" and
//   becomes the JOINED verb — known "to agree", target "zustimmen", type A —
//   introduced with a human-written line the learner hears (Kai's wording,
//   held as data in services/course-builder/lib/separable-verbs.cjs), and
//   drilled underneath in BOTH shapes: short split phrases, short joined
//   phrases, USE phrases that showcase the pattern. Volume and contrast, not
//   explanation (clause 4). No explanation at seed 84 (clause 5) — untouched.
//
// WHAT THIS TOOL DOES NOT DO. No TTS, ever: it ends by QUEUEING an audio pass.
// It deletes no audio row — the DB trigger trg_null_lego_audio_on_text_change
// unlinks the now-wrong clips and records the drop in content_audio_link_drops,
// so the clips survive for make-before-break. It touches no other seed.
//
// THE FIVE PHRASES IT DOES DELETE, and why that is not a loss. Every live
// BUILD/USE row under S0083L01 is built on the exact string the reshape
// removes ("Ich stimme dem zu …"), and all five carry the bare dative "dem",
// which NO LEGO or component in seeds 1..83 teaches as a chunk of its own —
// the old four-word LEGO was its only source. Post-edit every one of them is a
// live vocabulary violation (verified against the real gate, not assumed), and
// three of them already were one before this job (unknown "gesagt hast",
// "damit helfen kann", "wichtig es gut zu verstehen"). They are replaced, in
// the same basket, by twelve hand-written rows that pass every gate. Their
// audio rows are not deleted.
//
// GATES. The twelve phrases are hand-written, never generated, and are replayed
// through tools/phrase-gate/gate-check.cjs — the real /api/seed/complete gates,
// which is strictly more than the HTTP phrase route runs (it adds ZUT, the
// known-side contract, BUILD recombination and clause 4's contrast floor). A
// refusal here is a defect in the phrase and is fixed in the phrase; nothing
// here can bypass a gate. Vocabulary is judged exactly as the /v2/validate
// sweep judges this seed — with the seed's own sentence lending the separable
// pieces it realises (extraTexts), which is what makes "ich stimme zu"
// writable and keeps "stimmst du zu?" refused, the du-form being unheard.
//
// THE ONE THING THAT IS KAI'S, NOT MINE — reported, never acted on: the known
// text "to agree" collides course-wide with S0522L05 "to agree" → "einigen"
// (seed 522, whose own basket is broken German: "sie haben einigen", "wir
// können einigen"). That is a ZUT fork between two senses of "agree" and only
// Kai can rule which side moves. This tool writes Kai's instruction and prints
// the collision; it never edits seed 522.
//
//   node tools/course-optimization/deu-seed-83-zustimmen-reshape-2026-09-21.cjs --dry-run
//   node tools/course-optimization/deu-seed-83-zustimmen-reshape-2026-09-21.cjs --apply

require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
const { requestRoundIndexRefresh } = require('../../services/shared/round-index-refresh.cjs');
const { makeCourseCtx, checkPhraseSet, failureFeedback } = require('../phrase-gate/gate-check.cjs');
const { computeLegoPosition } = require('../../services/course-builder/lib/phrase-structure.cjs');
const { resolvePresentationVoiceId } = require('../../services/phases/presentation-author.cjs');
// The canonical audio-text normaliser. text_normalized is half the unique key on
// course_audio, so writing it any other way would let phase8 mint a second row.
const { normalizeForAudio } = require('../../services/shared/text-normalize.cjs');
const { HUMAN_AUTHORED_TEXT, TAUGHT_SEED } = require('../../services/course-builder/lib/separable-verbs.cjs');

const COURSE = 'deu_for_eng';
const SURFACE = 'tools:deu-seed-83-zustimmen-reshape-2026-09-21';
const SEED = TAUGHT_SEED;              // 83
const IDX = 1;
const LEGO_ID = 'S0083L01';
const NEW_KNOWN = 'to agree';
const NEW_TARGET = 'zustimmen';

/** The live state this tool is written against. It refuses to act on anything else. */
const EXPECTED = {
  seedTarget: 'Ich stimme dem zu, was du über deinen Freund gesagt hast',
  seedKnown: 'I agree with what you said about your friend',
  legoKnown: 'I agree with',
  legoTarget: 'ich stimme dem zu',
  phraseIds: [
    'deu_for_eng:S0083L01B01', 'deu_for_eng:S0083L01U01', 'deu_for_eng:S0083L01U03',
    'deu_for_eng:S0083L01U05', 'deu_for_eng:S0083L01U06',
  ],
};

// ─── The basket. Hand-written; every row judged by the gate before it is written.
// Short and blunt on purpose: the split is taught by contrast and volume.
// "dir" is the only object available — the bare dative "dem" is not taught
// anywhere by seed 83 once the four-word LEGO goes.
const BUILD = [
  ['I agree',                'ich stimme zu'],          // split
  ["I don't agree",          'ich stimme nicht zu'],    // split
  ['I want to agree',        'ich will zustimmen'],     // joined
  ["I don't want to agree",  'ich will nicht zustimmen'], // joined
];
const USE = [
  ['I agree with you',                    'Ich stimme dir zu'],                        // split
  ["I don't agree with you",              'Ich stimme dir nicht zu'],                  // split
  ['I think I agree with you',            'Ich denke, ich stimme dir zu'],             // split
  ['I agree with you today',              'Ich stimme dir heute zu'],                  // split
  ['I want to agree with you',            'Ich will dir zustimmen'],                   // joined
  ["I don't want to agree with you",      'Ich will dir nicht zustimmen'],             // joined
  ['I can agree with you today',          'Ich kann dir heute zustimmen'],             // joined
  ["I don't know if I can agree with you", 'Ich weiß nicht, ob ich dir zustimmen kann'], // joined
];

/** Kai's line, with the placeholder filled by the LEGO's own known text. */
function presentationText() {
  return HUMAN_AUTHORED_TEXT.bySeed[SEED].text.replace('[word in English]', NEW_KNOWN);
}

function supa() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

const pid = (role, n) =>
  `${COURSE}:${LEGO_ID}${role === 'build' ? 'B' : 'U'}${String(n).padStart(2, '0')}`;

function phraseRows() {
  const rows = [];
  let position = 1;
  BUILD.forEach(([known, target], i) => rows.push({
    id: pid('build', i + 1), course_code: COURSE, seed_number: SEED, lego_index: IDX,
    position: position++, known_text: known, target_text: target,
    word_count: target.length, lego_count: known.split(/\s+/).length,
    phrase_role: 'build', introduce: true, connected_lego_ids: [],
    lego_position: computeLegoPosition(target, NEW_TARGET),
    metadata: { format: 'build_use', source: SURFACE, ruling: 'Kai 2026-09-21 clause 4' },
    status: 'draft', version: 1,
  }));
  USE.forEach(([known, target], i) => rows.push({
    id: pid('use', i + 1), course_code: COURSE, seed_number: SEED, lego_index: IDX,
    position: position++, known_text: known, target_text: target,
    word_count: target.length, lego_count: known.split(/\s+/).length,
    phrase_role: 'use', introduce: true, connected_lego_ids: [],
    lego_position: computeLegoPosition(target, NEW_TARGET),
    metadata: { format: 'build_use', source: SURFACE, ruling: 'Kai 2026-09-21 clause 4' },
    status: 'draft', version: 1,
  }));
  return rows;
}

/** Refuse to act on a course that has moved under us. */
async function guard(sb) {
  const problems = [];
  const { data: seed } = await sb.from('course_seeds')
    .select('seed_number, known_text, target_text, approved_at, status')
    .eq('course_code', COURSE).eq('seed_number', SEED).maybeSingle();
  if (!seed) problems.push(`seed ${SEED} not found`);
  else {
    if (seed.target_text !== EXPECTED.seedTarget) problems.push(`seed target moved: "${seed.target_text}"`);
    if (seed.known_text !== EXPECTED.seedKnown) problems.push(`seed known moved: "${seed.known_text}"`);
  }

  const { data: legos } = await sb.from('course_legos')
    .select('lego_id, lego_index, type, known_text, target_text')
    .eq('course_code', COURSE).eq('seed_number', SEED).order('lego_index');
  const l1 = (legos || []).find(l => l.lego_index === IDX);
  if (!l1) problems.push(`${LEGO_ID} not found`);
  else if (l1.known_text === NEW_KNOWN && l1.target_text === NEW_TARGET) {
    problems.push(`${LEGO_ID} is ALREADY reshaped — this tool has run; nothing to do`);
  } else {
    if (l1.known_text !== EXPECTED.legoKnown) problems.push(`${LEGO_ID} known moved: "${l1.known_text}"`);
    if (l1.target_text !== EXPECTED.legoTarget) problems.push(`${LEGO_ID} target moved: "${l1.target_text}"`);
  }
  if ((legos || []).length !== 2) problems.push(`seed ${SEED} has ${legos?.length} LEGOs, expected 2`);

  const { data: live } = await sb.from('course_practice_phrases')
    .select('id, phrase_role, known_text, target_text')
    .eq('course_code', COURSE).eq('seed_number', SEED).eq('lego_index', IDX).order('position');
  const liveIds = (live || []).map(p => p.id).sort();
  if (JSON.stringify(liveIds) !== JSON.stringify([...EXPECTED.phraseIds].sort())) {
    problems.push(`S0083L01 phrase rows moved: found ${liveIds.join(', ') || '(none)'}`);
  }

  // ZUT, production direction, course-wide, for every row this tool writes.
  const { data: allLegos } = await sb.from('course_legos')
    .select('lego_id, known_text, target_text').eq('course_code', COURSE);
  const norm = (s) => (s || '').toLowerCase().trim().replace(/[.,!?;:]+$/, '');
  const newRows = [{ id: LEGO_ID, known: NEW_KNOWN, target: NEW_TARGET },
    ...phraseRows().map(p => ({ id: p.id, known: p.known_text, target: p.target_text }))];
  const zut = [];
  for (const n of newRows) {
    for (const l of allLegos || []) {
      if (l.lego_id === LEGO_ID) continue;
      if (norm(l.known_text) === norm(n.known) && norm(l.target_text) !== norm(n.target)) {
        zut.push(`LEGO ${l.lego_id} "${l.known_text}" → "${l.target_text}" vs ${n.id} → "${n.target}"`);
      }
    }
    const { data: hits } = await sb.from('course_practice_phrases')
      .select('id, known_text, target_text').eq('course_code', COURSE).ilike('known_text', n.known);
    for (const h of hits || []) {
      if (EXPECTED.phraseIds.includes(h.id)) continue; // being deleted by this tool
      if (norm(h.target_text) !== norm(n.target)) {
        zut.push(`phrase ${h.id} "${h.known_text}" → "${h.target_text}" vs ${n.id} → "${n.target}"`);
      } else {
        zut.push(`DUPLICATE: ${n.id} repeats existing ${h.id}`);
      }
    }
  }
  return { problems, zut, live: live || [], seed };
}

async function main() {
  const apply = process.argv.includes('--apply');
  const sb = supa();

  const { problems, zut, live } = await guard(sb);
  for (const p of problems) console.error(`BLOCKED  ${p}`);
  if (problems.length) process.exit(1);
  console.log('guard: live state is exactly what this tool was written against\n');

  // Replay the real gates over the basket. Nothing is written if one refuses.
  const ctx = makeCourseCtx(sb, COURSE);
  const gate = await checkPhraseSet({
    courseCode: COURSE, seedNumber: SEED, legoIndex: IDX, legoId: LEGO_ID,
    legoKnown: NEW_KNOWN, legoTarget: NEW_TARGET,
    // the sibling LEGO's gloss, so the known-side contract sees the whole seed
    components: [{ known: 'about your friend', target: 'über deinen Freund' }],
    phrases: [...BUILD.map(([known, target]) => ({ role: 'build', known, target })),
      ...USE.map(([known, target]) => ({ role: 'use', known, target }))],
  }, ctx);
  console.log(`gate: ${gate.overallPass ? 'ALL PASS' : 'FAILED'} — contrast ${gate.gates.separableContrast.split} split / ${gate.gates.separableContrast.joined} joined (needs ${gate.gates.separableContrast.required} of each)`);
  for (const line of failureFeedback(gate)) console.error(`  GATE  ${line}`);
  if (!gate.overallPass) { console.error('\nA gate refusal is a defect in the phrase. Nothing written.'); process.exit(1); }

  console.log(`\n${LEGO_ID}  "${EXPECTED.legoKnown}" → "${EXPECTED.legoTarget}"  [M]`);
  console.log(`      becomes  "${NEW_KNOWN}" → "${NEW_TARGET}"  [A]\n`);
  console.log(`DELETE ${live.length} superseded phrase row(s):`);
  for (const p of live) console.log(`    ${p.id}  ${p.target_text}  | ${p.known_text}`);
  console.log(`\nWRITE ${phraseRows().length} phrase row(s):`);
  for (const p of phraseRows()) console.log(`    ${p.phrase_role.toUpperCase()} ${p.id}  ${p.target_text}  | ${p.known_text}`);
  console.log(`\nPRESENTATION text row (pending/, no TTS): "${presentationText()}"`);

  if (zut.length) {
    console.log('\nZUT, course-wide, production direction — REPORTED, NOT BLOCKED (Kai\'s call):');
    for (const z of zut) console.log(`    ${z}`);
  } else console.log('\nZUT: clean course-wide for every row written.');

  if (!apply) { console.log('\nDRY RUN — nothing written. Re-run with --apply.'); return; }

  // ─── apply ────────────────────────────────────────────────────────────────
  const identity = serviceIdentity(SURFACE);
  const rows = phraseRows();
  const eventId = await recordContentEdit(sb, {
    identity, courseCode: COURSE, surface: SURFACE, operation: 'seed-83-separable-reshape',
    scope: { seed_numbers: [SEED], lego_ids: [LEGO_ID],
      phrase_ids: [...EXPECTED.phraseIds, ...rows.map(r => r.id)],
      rows: 1 + EXPECTED.phraseIds.length + rows.length + 1 },
    detail: {
      ruling: 'Kai 2026-09-21: seed 83 teaches the German split; the LEGO is introduced joined',
      lego: { from: { known: EXPECTED.legoKnown, target: EXPECTED.legoTarget, type: 'M' },
        to: { known: NEW_KNOWN, target: NEW_TARGET, type: 'A' } },
      deleted_phrases: EXPECTED.phraseIds,
      presentation_text: presentationText(),
      zut_reported: zut,
    },
  });
  console.log(`\nedit event ${eventId}`);

  // 1. phrases out, LEGO changed, phrases in — in that order, because the LEGO
  //    row is the FK parent and the new ids reuse the freed B01/U01 slots.
  const { error: delErr, count: delCount } = await sb.from('course_practice_phrases')
    .delete({ count: 'exact' }).eq('course_code', COURSE).in('id', EXPECTED.phraseIds);
  if (delErr) throw new Error(`phrase delete: ${delErr.message}`);
  if (delCount !== EXPECTED.phraseIds.length) throw new Error(`phrase delete removed ${delCount}, expected ${EXPECTED.phraseIds.length}`);
  console.log(`deleted ${delCount} superseded phrase rows`);

  const { error: legoErr } = await sb.from('course_legos')
    .update({ known_text: NEW_KNOWN, target_text: NEW_TARGET, type: 'A', components: null,
      last_edit_event_id: eventId })
    .eq('course_code', COURSE).eq('seed_number', SEED).eq('lego_index', IDX);
  if (legoErr) throw new Error(`lego update: ${legoErr.message}`);
  console.log(`${LEGO_ID} → "${NEW_KNOWN}" / "${NEW_TARGET}" [A]`);

  // 2. An edit unapproves the seed (Kai's rule). decomposed_at stands — the seed
  //    is still decomposed — and `status` is left alone: it governs delivery, and
  //    pulling a live seed out of the course is not what "unapprove" means.
  const { error: seedErr } = await sb.from('course_seeds')
    .update({ approved_at: null, last_edit_event_id: eventId })
    .eq('course_code', COURSE).eq('seed_number', SEED);
  if (seedErr) throw new Error(`seed unapprove: ${seedErr.message}`);
  console.log(`seed ${SEED} unapproved`);

  const { error: insErr } = await sb.from('course_practice_phrases')
    .insert(rows.map(r => ({ ...r, last_edit_event_id: eventId })));
  if (insErr) throw new Error(`phrase insert: ${insErr.message}`);
  console.log(`inserted ${rows.length} phrase rows (draft, qa_checked NULL — they reach the proofreader)`);

  // 3. The presentation TEXT row. s3_key 'pending/…' is how phase8 stores a
  //    presentation that has text but no audio yet; /generate picks those up.
  //    NOT linked to course_legos.presentation_audio_id — that column takes a
  //    rendered clip, and the trigger has just nulled the wrong one.
  const { data: course } = await sb.from('courses')
    .select('course_code, known_lang, target_lang, voice_config').eq('course_code', COURSE).single();
  const text = presentationText();
  const { data: presRow, error: presErr } = await sb.from('course_audio').insert({
    course_code: COURSE, text, text_normalized: normalizeForAudio(text),
    language: course.known_lang, role: 'presentation',
    voice_id: resolvePresentationVoiceId(course), origin: 'tts',
    s3_key: `pending/${uuidv4().toUpperCase()}.mp3`, lego_id: LEGO_ID,
  }).select('id, voice_id').single();
  if (presErr) throw new Error(`presentation text row: ${presErr.message}`);
  console.log(`presentation text row ${presRow.id} (voice ${presRow.voice_id}, s3_key pending/, NO TTS)`);

  const refresh = await requestRoundIndexRefresh(COURSE, { immediate: true, reason: SURFACE });
  console.log(`round map: ${JSON.stringify(refresh)}`);
  console.log('\nNow queue the audio pass:\n  node tools/course-optimization/queue-audio-pass.cjs deu_for_eng --reason "seed 83 zustimmen reshape (Kai 2026-09-21)"');
}

main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
