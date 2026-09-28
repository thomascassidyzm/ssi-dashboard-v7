#!/usr/bin/env node
'use strict';
// tools/course-optimization/ita-608p8-618p8-ten-calls-2026-09-28.cjs
//
// ita_for_eng — Kai's rulings of 2026-09-28 21:25–22:06Z (job #618·I):
//
// (1) S0608L03U03 (pos 8 under "the thing to do | la cosa da fare"): "it was the thing to do | era la cosa da
//     fare" (written by #590·I) → "she did the sensible thing to do | ha fatto la cosa sensata da fare". The
//     containment gate is the LIVE one (checkWordContainment, a word multiset), asserted here — if it refused
//     the sensata insertion this tool would stop and say so, not work around it.
// (2) S0618L01U03 (pos 8 under "it doesn't feel like | non sembra"): "it doesn't feel like the right way | non
//     sembra il modo da fare" (broken both sides) → "it doesn't feel like the way to do it | non sembra il modo
//     di farlo" IF farlo and modo are taught before 618 (they are: S0092L02 "do it | farlo", S0094L01 "the only
//     way | l'unico modo", S0408L01 "the best way | il modo migliore"); otherwise the row is DELETED (the LEGO
//     keeps four good phrases). The tool asserts which branch holds rather than trusting this comment.
// (3) The ten taste calls of #591·I (d/51543e91), under KAI'S COMPONENT RULE (canon K29): a later phrase may use
//     a word on its own if that word appears as a COMPONENT on its own somewhere earlier, or if we can add it as
//     a component of the LEGO that teaches it; then it is fine and need not use the full LEGO.
//       speravo (6 phrases, seeds 165–280)  — SETTLED, no change: S0151L02.components already carries
//                                              "I was hoping | speravo" (the learner's tiles come from course_legos.components).
//       la gente (S0421L01U01)              — SETTLED, no change: S0419L01.components carries "people | la gente".
//       è successo (24 phrases, 311–528)    — SETTLED BY ADDING THE COMPONENT: "successo" is first taught at S0201L03
//                                              "what was going to happen | che cosa sarebbe successo", whose components
//                                              were "what | che cosa" + "was going to happen | sarebbe successo". They are
//                                              re-cut to "what | che cosa" + "was going to | sarebbe" + "happen | successo" (the
//                                              gloss 201's own pre-recut LEGO used), so they still tile the LEGO on both sides
//                                              (L4); S0348L01 (same LEGO, not-new) follows.
//                                              "è" is taught from the first seeds and è + participle is heard from seed 130.
//       S0246L02 marked new                 — canon L17: it is S0204L01 + S0204L02 and was met as the phrase S0204L02B03,
//                                              so NOT NEW, no intro (S0519L04 / S0609L02 precedent); clip detached, kept.
//       three "penso che + subjunctive"     — canon P17 (phrase contains its LEGO): the "I think" frame comes off so the
//                                              taught form is the one heard: S0112L01U03 → "it was yesterday | era ieri",
//                                              S0126L03U02 → "it is changing how I think about things | sta cambiando come
//                                              penso alle cose" (the old English never carried "it is" either), S0520L01U02 → "it might have happened
//                                              before | potrebbe essere successo prima".
//       S0396L05U05 word order              — Italian fixed: "non sono ancora pronti" (was "non sono pronti ancora").
//       S0354L01 "she" rows                 — left: one Italian under two Englishes is not a defect (K3 runs the other way).
//       seed 343 tiling overlap             — nothing to do (L29, Kai's own ruling).
//       LEFT FOR KAI (listed in the doc)    — seed 376 (five phrases under "I didn't go anywhere" carry only "anywhere":
//                                              a re-cut, and C27 is open); seed 152 l'avrei one seed early (leave).
//
// STANDING RULE: every LEGO/component change is followed by a knock-on check of all later phrases, LEGOs and intros
// (the downstream audit tool, check-intro-mirror --strict, audit-phrase-zut strict ≤ 56).
//
// AFTER THE EDIT: Italian slots of changed targets are linked to an existing Elsa/Benigno clip or rendered through the
// one TTS door; English slots are detached and filled by ita-sonia-temporary-fill SCOPE=ids (temporary Sonia, cast
// restored byte-identical); the touched seeds are unapproved; an audio pass is queued.
//
//   node tools/course-optimization/ita-608p8-618p8-ten-calls-2026-09-28.cjs            # dry run
//   APPLY=1 node tools/course-optimization/ita-608p8-618p8-ten-calls-2026-09-28.cjs    # apply + Italian audio

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const { norm, containsWords, rightWithoutGiusta, debutStatus } = require('./ita-seed-608-phrases-609-notnew-2026-09-28.cjs');
const { checkWordContainment } = require('../../services/course-builder/lib/text-normalization.cjs');
const words = (s) => norm(s).split(' ').filter(Boolean);

const COURSE = 'ita_for_eng';
const SWEEP = 'ita-608p8-618p8-ten-calls-2026-09-28';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const JOB = '#618·I';
const RULING = 'Kai, 2026-09-28 21:25–22:06Z (job #618·I): S0608L03U03 → "she did the sensible thing to do | ha fatto la cosa sensata da fare"; S0618L01U03 → "it doesn\'t feel like the way to do it | non sembra il modo di farlo" (farlo/modo taught before 618); component rule (canon K29): a word taught only inside a chunk may be used alone once it is a component on its own — speravo and la gente already are, "happen | successo" added to S0201L03/S0348L01; S0246L02 not-new (L17); three penso-che phrases lose the frame so they contain their LEGO (P17); S0396L05U05 Italian word order';
const ELSA = { voiceId: 'azure_it-IT-ElsaNeural', voiceName: 'it-IT-ElsaNeural' };
const BENIGNO = { voiceId: 'azure_it-IT-BenignoNeural', voiceName: 'it-IT-BenignoNeural' };
const AZURE_VOICE_IDS = { target1: ['azure_it-IT-ElsaNeural', 'it-IT-ElsaNeural'], target2: ['azure_it-IT-BenignoNeural', 'it-IT-BenignoNeural'] };
const SONIA_VOICE_ID = 'azure_en-GB-SoniaNeural';

// ── Rules (pure; the test exercises these) ─────────────────────────────────────────────
/** Kai's component rule (K29): a bare later use of `word` is fine if some earlier LEGO's components carry it on its own. */
function bareWordSettled(word, side, earlierLegos) {
  const w = norm(word);
  return earlierLegos.some(l => (l.components || []).some(c => norm(side === 'target' ? c.target : c.known) === w));
}
/** The 396 defect as a rule: "ancora" AFTER a predicate adjective where a native puts it before ("non sono ancora pronti"). */
const ancoraAfterAdjective = (target) => /\bpront[oaie] ancora\b/.test(norm(target));
/** The 618 pos-8 defect as a rule: "il modo da fare" is not Italian; the phrase also says "right" with no giusto. */
const modoDaFare = (target) => /\bil modo da fare\b/.test(norm(target));
/** P17 by the live gate's rule, both sides. */
const phraseContainsLego = (row, lego) => checkWordContainment(lego.target, row.target) && containsWords(row.known, lego.known);
/** Components tile their LEGO (L4): joined in order they read the LEGO on both sides (apostrophes squashed). */
const squash = (s) => norm(s).replace(/' /g, "'");
const componentsTile = (lego) => squash(lego.components.map(c => c.target).join(' ')) === squash(lego.target) && squash(lego.components.map(c => c.known).join(' ')) === squash(lego.known);

// ── The changes ────────────────────────────────────────────────────────────────────────
const LEGOS = {
  S0608L03: { known: 'the thing to do', target: 'la cosa da fare' },
  S0618L01: { known: "it doesn't feel like", target: 'non sembra' },
  S0112L01: { known: 'it was', target: 'era' },
  S0126L03: { known: 'it is changing', target: 'sta cambiando' },
  S0520L01: { known: 'it might have happened', target: 'potrebbe essere successo' },
  S0396L05: { known: 'they are ready', target: 'sono pronti' },
  S0201L03: { known: 'what was going to happen', target: 'che cosa sarebbe successo' },
  S0348L01: { known: 'what was going to happen', target: 'che cosa sarebbe successo' },
  S0246L02: { known: 'I wanted her to help you', target: 'volevo che lei ti aiutasse' },
};
const CHANGES = [
  { id: 'S0608L03U03', seed: 608, lego: 'S0608L03', role: 'use', why: 'Kai (1): pos 8 rewritten both sides', before: { known: 'it was the thing to do', target: 'era la cosa da fare' }, after: { known: 'she did the sensible thing to do', target: 'ha fatto la cosa sensata da fare' } },
  { id: 'S0618L01U03', seed: 618, lego: 'S0618L01', role: 'use', why: 'Kai (2): "il modo da fare" is not Italian; farlo and modo taught before 618', before: { known: "it doesn't feel like the right way", target: 'non sembra il modo da fare' }, after: { known: "it doesn't feel like the way to do it", target: 'non sembra il modo di farlo' }, deleteIfUntaught: ['farlo', 'modo'] },
  { id: 'S0112L01U03', seed: 112, lego: 'S0112L01', role: 'use', why: 'P17: penso che + subjunctive never contained "era"', before: { known: 'I think it was yesterday', target: 'penso che fosse ieri' }, after: { known: 'it was yesterday', target: 'era ieri' } },
  { id: 'S0126L03U02', seed: 126, lego: 'S0126L03', role: 'use', why: 'P17: penso che + subjunctive never contained "sta cambiando"', before: { known: 'I think this is changing how I think about things', target: 'penso che questo stia cambiando come penso alle cose' }, after: { known: 'it is changing how I think about things', target: 'sta cambiando come penso alle cose' } },
  { id: 'S0520L01U02', seed: 520, lego: 'S0520L01', role: 'use', why: 'P17: penso che + subjunctive never contained "potrebbe essere successo"', before: { known: 'I think it might have happened before', target: 'penso che possa essere successo prima' }, after: { known: 'it might have happened before', target: 'potrebbe essere successo prima' } },
  { id: 'S0396L05U05', seed: 396, lego: 'S0396L05', role: 'use', why: 'Italian word order: ancora goes before the adjective', before: { known: 'they are not ready yet', target: 'non sono pronti ancora' }, after: { known: 'they are not ready yet', target: 'non sono ancora pronti' } },
];
for (const c of CHANGES) { c.knownChanged = norm(c.before.known) !== norm(c.after.known); c.targetChanged = norm(c.before.target) !== norm(c.after.target); }

/** The component re-cut of the LEGO that teaches "successo" (K29), and of its not-new twin. */
const OLD_COMPONENTS = [{ known: 'what', target: 'che cosa' }, { known: 'was going to happen', target: 'sarebbe successo' }];
const NEW_COMPONENTS = [{ known: 'what', target: 'che cosa' }, { known: 'was going to', target: 'sarebbe' }, { known: 'happen', target: 'successo' }];
const RECUT = [{ lego_id: 'S0201L03', seed: 201, lego_index: 3 }, { lego_id: 'S0348L01', seed: 348, lego_index: 1 }];
// C rows under each: C01 keeps its text; C02 changes text (all three slots detached); C03 is inserted after it.
const NOT_NEW = { lego_id: 'S0246L02', ...LEGOS.S0246L02, madeOf: ['S0204L01', 'S0204L02'] };
const TOUCHED_SEEDS = [...new Set([...CHANGES.map(c => c.seed), ...RECUT.map(r => r.seed), 246])].sort((a, b) => a - b);

// Settled without a change — asserted live so the report's "no change needed" is a fact, not a memory.
const SETTLED_BY_EXISTING_COMPONENT = [
  { word: 'speravo', side: 'target', lego_id: 'S0151L02', laterUse: "bare 'speravo' in six phrases, seeds 165–280" },
  { word: 'la gente', side: 'target', lego_id: 'S0419L01', laterUse: 'S0421L01U01 perché la gente vuole vincere' },
];

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
async function firstTaught(pg, word) {
  const { rows: [r] } = await pg.query(`SELECT min(seed_number) s FROM (SELECT seed_number, target_text FROM course_legos WHERE course_code=$1 UNION ALL SELECT seed_number, target_text FROM course_practice_phrases WHERE course_code=$1) x WHERE lower(target_text) ~ ('\\m' || $2 || '\\M')`, [COURSE, word]);
  return r.s;
}
async function guardLive(pg, problems, log) {
  const { rows: seeds } = await pg.query('SELECT seed_number, approved_at FROM course_seeds WHERE course_code=$1 AND seed_number = ANY($2) ORDER BY 1', [COURSE, TOUCHED_SEEDS]);
  log.seedsApprovedBefore = Object.fromEntries(seeds.map(s => [s.seed_number, s.approved_at]));
  const { rows: legos } = await pg.query('SELECT lego_id, known_text, target_text, is_new, components, presentation_audio_id::text AS presentation_audio_id FROM course_legos WHERE course_code=$1 AND lego_id = ANY($2)', [COURSE, Object.keys(LEGOS)]);
  for (const [id, l] of Object.entries(LEGOS)) { const r = legos.find(x => x.lego_id === id); if (!r || r.known_text !== l.known || r.target_text !== l.target) problems.push(`${id} reads "${r?.known_text}" → "${r?.target_text}"`); }
  for (const r of RECUT) { const l = legos.find(x => x.lego_id === r.lego_id); if (JSON.stringify(l?.components) !== JSON.stringify(OLD_COMPONENTS)) problems.push(`${r.lego_id}.components is ${JSON.stringify(l?.components)} — expected ${JSON.stringify(OLD_COMPONENTS)}`); }
  const l246 = legos.find(x => x.lego_id === NOT_NEW.lego_id);
  if (l246 && !l246.is_new) problems.push(`${NOT_NEW.lego_id} is already is_new=false`);
  log.oldIntro = null;
  if (l246?.presentation_audio_id) { const { rows: [a] } = await pg.query('SELECT id::text AS id, text, voice_id FROM course_audio WHERE id=$1', [l246.presentation_audio_id]); log.oldIntro = a || { id: l246.presentation_audio_id }; }
  const { rows } = await pg.query(`SELECT split_part(id,':',2) id, phrase_role, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND split_part(id,':',2) = ANY($2)`, [COURSE, CHANGES.map(c => c.id)]);
  const byId = Object.fromEntries(rows.map(r => [r.id, r]));
  for (const c of CHANGES) { const r = byId[c.id]; if (!r || r.known_text !== c.before.known || r.target_text !== c.before.target || r.phrase_role !== c.role) problems.push(`${c.id} reads "${r?.known_text}" → "${r?.target_text}" (${r?.phrase_role}) — expected "${c.before.known}" → "${c.before.target}"`); }
  // Component rows under the two re-cut LEGOs: C01/C02 present with the old texts, no C03, no intro links.
  const { rows: crows } = await pg.query(`SELECT split_part(id,':',2) id, position, known_text, target_text, presentation_audio_id FROM course_practice_phrases WHERE course_code=$1 AND phrase_role='component' AND (split_part(id,':',2) LIKE 'S0201L03%' OR split_part(id,':',2) LIKE 'S0348L01%') ORDER BY id`, [COURSE]);
  log.componentRowsBefore = crows;
  for (const r of RECUT) {
    const mine = crows.filter(x => x.id.startsWith(r.lego_id));
    if (mine.length !== 2 || mine[0].target_text !== 'che cosa' || mine[1].target_text !== 'sarebbe successo' || mine[1].known_text !== 'was going to happen') problems.push(`${r.lego_id} component rows are ${JSON.stringify(mine)} — expected C01 che cosa, C02 sarebbe successo`);
    if (mine.some(x => x.presentation_audio_id)) problems.push(`${r.lego_id} has a component intro link — unlink first (O13)`);
  }
  // Concurrency: another surface editing these seeds in the last 24 h (the finished passes of the day excepted).
  const FINISHED = ['ita-seed-608-phrases-609-notnew-2026-09-28', 'ita-sonia-temporary-fill-2026-09-28', 'ita-intro-mirror-fix-2026-09-28', 'ita-lego-downstream-audit-2026-09-28', 'ita-noun-subject-pronoun-2026-09-28', 'ita-missing-subject-2026-09-28', 'ita-seed-201-recut-2026-09-28', 'ita-seed-348-notnew-and-203-dup-2026-09-28', 'ita-zut-groupa', 'ita-future-in-past-2026-09-28', 'ita-heads-up-intros-2026-09-28', 'ita-say-it-that-this-2026-09-28', 'ita-599-159-160-tell-answer-2026-09-28', 'ita-seed-609'];
  const { rows: ev } = await pg.query(`SELECT id, surface, operation FROM content_edit_events WHERE course_code=$1 AND occurred_at > now() - interval '24 hours' AND surface NOT LIKE '%' || $2 || '%' AND NOT (surface LIKE ANY($4)) AND scope->'seed_numbers' ?| $3::text[]`,
    [COURSE, SWEEP, TOUCHED_SEEDS.map(String), FINISHED.map(f => `%${f}%`)]);
  for (const e of ev) problems.push(`another surface touched ${TOUCHED_SEEDS.join('/')} today: ${e.surface} ${e.operation} (${e.id}) — re-read before writing`);
}
async function guards(pg, problems, log) {
  // (2) the 618 branch: farlo and modo taught before 618, or the row is deleted instead.
  const c618 = CHANGES.find(c => c.id === 'S0618L01U03');
  log.taughtBefore618 = {};
  for (const w of c618.deleteIfUntaught) { const s = await firstTaught(pg, w); log.taughtBefore618[w] = s; }
  c618.delete = Object.values(log.taughtBefore618).some(s => s === null || s >= 618);
  // (1)/(P17): every after-row contains its LEGO by the LIVE gate (Kai asked for this on 608 specifically); no new vocabulary.
  for (const c of CHANGES) {
    if (c.delete) continue;
    if (!phraseContainsLego(c.after, LEGOS[c.lego])) problems.push(`${c.id} "${c.after.known}" → "${c.after.target}" does not contain ${c.lego} under the live gate (checkWordContainment)`);
    const nk = await newVocabulary(pg, c.seed, c.after.known, 'known'), nt = await newVocabulary(pg, c.seed, c.after.target, 'target');
    if (nk.length || nt.length) problems.push(`${c.id} introduces vocabulary not taught by seed ${c.seed}: ${[...nk, ...nt].join(', ')}`);
  }
  log.containment608 = { live: checkWordContainment(LEGOS.S0608L03.target, CHANGES[0].after.target), knownSide: containsWords(CHANGES[0].after.known, LEGOS.S0608L03.known) };
  // The defects are real before and gone after (the proving test runs these on the rows too).
  for (const c of CHANGES) {
    const wasDefective = !phraseContainsLego(c.before, LEGOS[c.lego]) || rightWithoutGiusta(c.before) || modoDaFare(c.before.target) || ancoraAfterAdjective(c.before.target) || c.id === 'S0608L03U03';
    if (!wasDefective) problems.push(`${c.id}: before-row has no defect this tool knows — why change it?`);
    if (!c.delete && (rightWithoutGiusta(c.after) || modoDaFare(c.after.target) || ancoraAfterAdjective(c.after.target))) problems.push(`${c.id}: after-row still defective`);
  }
  // ZUT / duplicates against the course for every after text
  const ours = new Set(CHANGES.map(c => c.id));
  log.zut = []; log.targetSide = []; log.duplicates = [];
  for (const c of CHANGES) {
    if (c.delete) continue;
    const { rows } = await pg.query(
      `SELECT id, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND phrase_role<>'component' AND (lower(trim(known_text))=lower(trim($2)) OR lower(trim(target_text))=lower(trim($3)))
       UNION ALL SELECT lego_id, known_text, target_text FROM course_legos WHERE course_code=$1 AND (lower(trim(known_text))=lower(trim($2)) OR lower(trim(target_text))=lower(trim($3)))`, [COURSE, c.after.known, c.after.target]);
    for (const r of rows) {
      const rid = r.id.replace(`${COURSE}:`, ''); if (ours.has(rid)) continue;
      const sameK = norm(r.known_text) === norm(c.after.known), sameT = norm(r.target_text) === norm(c.after.target);
      if (sameK && sameT) log.duplicates.push(`${c.id} duplicates ${rid}`);
      else if (sameK && !sameT) log.zut.push(`${c.id} "${c.after.known}" → "${c.after.target}" vs ${rid} "${r.known_text}" → "${r.target_text}"`);
      else if (sameT && !sameK) log.targetSide.push(`${c.id} "${c.after.known}" shares its Italian with ${rid} "${r.known_text}"`);
    }
  }
  problems.push(...log.zut, ...log.duplicates);
  // K29: what the rule settles as things stand, and what the re-cut settles.
  const { rows: allLegos } = await pg.query('SELECT lego_id, seed_number, known_text AS known, target_text AS target, components FROM course_legos WHERE course_code=$1 ORDER BY seed_number, lego_index', [COURSE]);
  log.settled = [];
  for (const s of SETTLED_BY_EXISTING_COMPONENT) {
    const lego = allLegos.find(l => l.lego_id === s.lego_id);
    const ok = bareWordSettled(s.word, s.side, [lego]);
    log.settled.push({ ...s, ok, components: lego?.components });
    if (!ok) problems.push(`${s.word}: ${s.lego_id}.components does not carry it on its own — the "settled, no change" claim is false`);
  }
  log.successoFirstTaught = await firstTaught(pg, 'successo');
  if (log.successoFirstTaught !== 201) problems.push(`"successo" is first taught at seed ${log.successoFirstTaught}, not 201 — the component belongs on the LEGO that teaches it`);
  const before201 = allLegos.filter(l => l.seed_number < 311);
  log.successoSettledBefore = bareWordSettled('successo', 'target', before201);
  log.successoSettledAfter = bareWordSettled('successo', 'target', before201.map(l => l.lego_id === 'S0201L03' ? { ...l, components: NEW_COMPONENTS } : l));
  if (log.successoSettledBefore) problems.push('"successo" is already a component on its own before 311 — the re-cut is not needed, re-plan');
  if (!log.successoSettledAfter) problems.push('the re-cut does not settle "successo" — tool bug');
  for (const r of RECUT) { const l = allLegos.find(x => x.lego_id === r.lego_id); if (!componentsTile({ ...l, components: NEW_COMPONENTS })) problems.push(`${r.lego_id}: new components do not tile the LEGO (L4)`); }
  const { rows: [eParticiple] } = await pg.query(`SELECT min(seed_number) s FROM course_practice_phrases WHERE course_code=$1 AND lower(target_text) ~ '\\mè (andat|stat|passat|success|arrivat|venut)[oaie]\\M'`, [COURSE]);
  log.eParticipleFirstHeard = eParticiple.s;
  const { rows: [uses] } = await pg.query(`SELECT count(*)::int n, min(seed_number) lo, max(seed_number) hi FROM course_practice_phrases WHERE course_code=$1 AND seed_number BETWEEN 311 AND 571 AND lower(target_text) ~ 'è successo'`, [COURSE]);
  log.eSuccessoUses = uses;
  // L17: S0246L02 not-new from the live course
  const earlier = allLegos.filter(l => l.seed_number < 246);
  const { rows: metRows } = await pg.query(`SELECT split_part(id,':',2) id FROM course_practice_phrases WHERE course_code=$1 AND seed_number < 246 AND phrase_role<>'component' AND lower(known_text)=lower($2) AND lower(target_text)=lower($3)`, [COURSE, NOT_NEW.known, NOT_NEW.target]);
  log.debut246 = { status: debutStatus(NOT_NEW, { earlierLegos: earlier, earlierPhrasePairs: metRows.map(() => NOT_NEW) }), madeOf: earlier.filter(l => NOT_NEW.madeOf.includes(l.lego_id)).map(l => `${l.lego_id} "${l.known}|${l.target}"`), metAsPhrase: metRows.map(r => r.id) };
  if (log.debut246.status !== 'not-new') problems.push(`S0246L02 debut status from the live course is "${log.debut246.status}", expected not-new`);
  // Positions of the C rows we insert: the next free slot after C02 is taken by shifting builds/uses up by one.
  log.positions = {};
  for (const r of RECUT) {
    const { rows: prs } = await pg.query('SELECT split_part(id,\':\',2) id, position, phrase_role FROM course_practice_phrases WHERE course_code=$1 AND seed_number=$2 AND lego_index=$3 ORDER BY position', [COURSE, r.seed, r.lego_index]);
    const c02 = prs.find(p => p.id === `${r.lego_id}C02`);
    if (!c02) { problems.push(`${r.lego_id}C02 missing`); continue; }
    const plan = {};
    for (const p of prs) plan[p.id] = p.position > c02.position ? p.position + 1 : p.position;
    plan[`${r.lego_id}C03`] = c02.position + 1;
    log.positions[r.lego_id] = plan;
  }
}

// ── Apply ───────────────────────────────────────────────────────────────────────────────
async function applyContent(pg, supabase, log) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const live = CHANGES.filter(c => !c.delete), dead = CHANGES.filter(c => c.delete);
  const phraseEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-edit', scope: { seed_numbers: [...new Set(live.map(c => c.seed))], phrase_ids: live.map(c => `${COURSE}:${c.id}`), rows: live.length },
    detail: { ruling: RULING, job: JOB, containment608: log.containment608, taughtBefore618: log.taughtBefore618, changes: live.map(c => ({ id: `${COURSE}:${c.id}`, role: c.role, why: c.why, known_from: c.before.known, target_from: c.before.target, known_to: c.after.known, target_to: c.after.target })) } });
  const deleteEvent = dead.length ? await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-delete', scope: { seed_numbers: [...new Set(dead.map(c => c.seed))], phrase_ids: dead.map(c => `${COURSE}:${c.id}`), rows: dead.length }, detail: { ruling: RULING, job: JOB, why: 'Kai (2): farlo/modo not taught before 618, so the phrase is deleted; the LEGO keeps four good phrases', taughtBefore618: log.taughtBefore618, deleted: dead.map(c => ({ id: `${COURSE}:${c.id}`, known: c.before.known, target: c.before.target })) } }) : null;
  const componentEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'lego-edit', scope: { seed_numbers: RECUT.map(r => r.seed), lego_ids: RECUT.map(r => r.lego_id), rows: RECUT.length }, detail: { ruling: RULING, job: JOB, kind: 'components', why: 'K29: "successo" (used bare as "è successo" from seed 311) becomes a component of the LEGO that teaches it; S0348L01 is the same LEGO', components_from: OLD_COMPONENTS, components_to: NEW_COMPONENTS, changes: RECUT.map(r => ({ id: r.lego_id, kind: 'components', known_from: LEGOS[r.lego_id].known, known_to: LEGOS[r.lego_id].known, target: LEGOS[r.lego_id].target })), eSuccessoUses: log.eSuccessoUses } });
  const notNewEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'lego-edit', scope: { seed_numbers: [246], lego_ids: [NOT_NEW.lego_id], rows: 1 }, detail: { ruling: RULING, job: JOB, change: 'is_new true → false; no text change', why: `combination of ${NOT_NEW.madeOf.join('+')}, met as phrase ${log.debut246.metAsPhrase.join(',')} (canon L17); not-new carries no intro — clip detached and kept`, intro: { from: log.oldIntro, to: null } } });
  const unapproveSeeds = TOUCHED_SEEDS.filter(s => log.seedsApprovedBefore[s]);
  const unapproveEvent = unapproveSeeds.length ? await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'unapprove', scope: { seed_numbers: unapproveSeeds, rows: unapproveSeeds.length }, detail: { why: 'content edited under Kai\'s rulings of 2026-09-28 21:25–22:06Z; needs his read', job: JOB, approved_at_before: log.seedsApprovedBefore } }) : null;
  log.events = { phraseEvent, deleteEvent, componentEvent, notNewEvent, unapproveEvent };
  await pg.query('BEGIN');
  try {
    // 1. Phrase rows re-textured in place; a side whose words did not move keeps its clips.
    for (const c of live) {
      const u = await pg.query(`UPDATE course_practice_phrases SET known_text=$1, target_text=$2, word_count=$3, lego_count=$4,
          known_audio_id=CASE WHEN $5 THEN NULL ELSE known_audio_id END, target1_audio_id=CASE WHEN $6 THEN NULL ELSE target1_audio_id END, target2_audio_id=CASE WHEN $6 THEN NULL ELSE target2_audio_id END,
          target1_duration_ms=CASE WHEN $6 THEN NULL ELSE target1_duration_ms END, target2_duration_ms=CASE WHEN $6 THEN NULL ELSE target2_duration_ms END,
          qa_checked=NULL, decomposition=NULL, decomposition_course_version=NULL, display_tiling=NULL, display_tiling_version=NULL, last_edit_event_id=$7, updated_at=now()
        WHERE course_code=$8 AND id=$9 AND known_text=$10 AND target_text=$11`,
        [c.after.known, c.after.target, c.after.target.length, c.after.target.split(/\s+/).length, c.knownChanged, c.targetChanged, phraseEvent, COURSE, `${COURSE}:${c.id}`, c.before.known, c.before.target]);
      if (u.rowCount !== 1) throw new Error(`${c.id}: ${u.rowCount} rows (row moved under us — re-read and re-plan)`);
    }
    for (const c of dead) {
      const d = await pg.query('DELETE FROM course_practice_phrases WHERE course_code=$1 AND id=$2 AND known_text=$3 AND target_text=$4', [COURSE, `${COURSE}:${c.id}`, c.before.known, c.before.target]);
      if (d.rowCount !== 1) throw new Error(`${c.id}: delete ${d.rowCount} rows`);
    }
    // 2. Component re-cut on 201 and 348: LEGO.components, C02 re-textured (slots detached), C03 inserted, positions shifted.
    for (const r of RECUT) {
      const l = await pg.query('UPDATE course_legos SET components=$1, last_edit_event_id=$2, updated_at=now() WHERE course_code=$3 AND lego_id=$4 AND components=$5', [JSON.stringify(NEW_COMPONENTS), componentEvent, COURSE, r.lego_id, JSON.stringify(OLD_COMPONENTS)]);
      if (l.rowCount !== 1) throw new Error(`${r.lego_id}.components: ${l.rowCount} rows`);
      await pg.query('UPDATE course_practice_phrases SET position = position + 100 WHERE course_code=$1 AND seed_number=$2 AND lego_index=$3', [COURSE, r.seed, r.lego_index]);
      const c02 = NEW_COMPONENTS[1], c03 = NEW_COMPONENTS[2];
      const { rows: [old02] } = await pg.query('SELECT known_audio_id, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE course_code=$1 AND id=$2', [COURSE, `${COURSE}:${r.lego_id}C02`]);
      const u = await pg.query(`UPDATE course_practice_phrases SET known_text=$1, target_text=$2, word_count=$3, lego_count=1, known_audio_id=NULL, target1_audio_id=NULL, target2_audio_id=NULL, target1_duration_ms=NULL, target2_duration_ms=NULL, presentation_audio_id=NULL, metadata = metadata || '{"component_index":1}'::jsonb, last_edit_event_id=$4, updated_at=now() WHERE course_code=$5 AND id=$6 AND known_text=$7 AND target_text=$8`,
        [c02.known, c02.target, c02.target.length, componentEvent, COURSE, `${COURSE}:${r.lego_id}C02`, OLD_COMPONENTS[1].known, OLD_COMPONENTS[1].target]);
      if (u.rowCount !== 1) throw new Error(`${r.lego_id}C02: ${u.rowCount} rows`);
      for (const [col, role] of [['known_audio_id', 'known'], ['target1_audio_id', 'target1'], ['target2_audio_id', 'target2']]) if (old02?.[col]) await pg.query(`INSERT INTO content_audio_link_drops (table_name, row_id, course_code, seed_number, column_name, role, old_audio_id, old_text, new_text, reason) VALUES ('course_practice_phrases',$1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [`${COURSE}:${r.lego_id}C02`, COURSE, r.seed, col, role, old02[col], role === 'known' ? OLD_COMPONENTS[1].known : OLD_COMPONENTS[1].target, role === 'known' ? c02.known : c02.target, `${SWEEP}: component re-cut (K29), text changed — clip detached, asset kept (job ${JOB}, event ${componentEvent})`]);
      await pg.query(`INSERT INTO course_practice_phrases (id, course_code, seed_number, lego_index, position, known_text, target_text, word_count, lego_count, metadata, status, phrase_role, connected_lego_ids, lego_position, introduce, last_edit_event_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,1,$9,'draft','component','{}','end',true,$10)`,
        [`${COURSE}:${r.lego_id}C03`, COURSE, r.seed, r.lego_index, log.positions[r.lego_id][`${r.lego_id}C03`] + 200, c03.known, c03.target, c03.target.length, JSON.stringify({ buildup: 'component', component_index: 2 }), componentEvent]);
      for (const [id, pos] of Object.entries(log.positions[r.lego_id])) {
        const m = await pg.query('UPDATE course_practice_phrases SET position=$1 WHERE course_code=$2 AND id=$3', [pos, COURSE, `${COURSE}:${id}`]);
        if (m.rowCount !== 1) throw new Error(`${id} position: ${m.rowCount} rows`);
      }
    }
    // 3. S0246L02 not new, intro detached (clip kept), drop recorded
    const n = await pg.query('UPDATE course_legos SET is_new=false, presentation_audio_id=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND lego_id=$3 AND known_text=$4 AND target_text=$5 AND is_new=true', [notNewEvent, COURSE, NOT_NEW.lego_id, NOT_NEW.known, NOT_NEW.target]);
    if (n.rowCount !== 1) throw new Error(`${NOT_NEW.lego_id}: ${n.rowCount} rows`);
    if (log.oldIntro?.id) {
      await pg.query('UPDATE course_audio SET lego_id=NULL WHERE id=$1 AND lego_id=$2', [log.oldIntro.id, NOT_NEW.lego_id]);
      await pg.query('UPDATE lego_introductions SET presentation_audio_id=NULL, audio_uuid=NULL, updated_at=now() WHERE course_code=$1 AND lego_id=$2', [COURSE, NOT_NEW.lego_id]);
      await pg.query(`INSERT INTO content_audio_link_drops (table_name, row_id, course_code, seed_number, column_name, role, old_audio_id, old_text, old_voice_id, new_text, reason) VALUES ('course_legos',$1,$2,246,'presentation_audio_id','presentation',$3,$4,$5,NULL,$6)`,
        [NOT_NEW.lego_id, COURSE, log.oldIntro.id, log.oldIntro.text || null, log.oldIntro.voice_id || SONIA_VOICE_ID, `${SWEEP}: S0246L02 marked not new (combination of ${NOT_NEW.madeOf.join('+')}, drilled at ${log.debut246.metAsPhrase.join(',')}; canon L17) — a not-new LEGO carries no intro (S0519L04/S0609L02 precedent); clip detached, asset kept (job ${JOB}, event ${notNewEvent})`]);
    }
    if (unapproveSeeds.length) {
      const un = await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number = ANY($3) AND approved_at IS NOT NULL', [unapproveEvent, COURSE, unapproveSeeds]);
      if (un.rowCount !== unapproveSeeds.length) throw new Error('seed unapprove');
    }
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
  await refreshNow();
  const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs');
  log.audioPass = await queueAudioPass(supabase, { courseCode: COURSE, requestedBy: `@${SWEEP}`, reason: `job ${JOB}: 608/618 pos-8 phrases, three penso-che phrases, 396 word order, 201/348 component re-cut; Italian linked/rendered on Elsa/Benigno by the tool, English prompts on temporary Sonia`, metadata: { job: JOB, seeds: TOUCHED_SEEDS, rows: live.length + RECUT.length * 2 } });
}

// ── Audio (the #579·I/#580·I/#590·I route, unchanged) ───────────────────────────────────
function ttsDeps() {
  process.env.PHASE8_NO_LISTEN = '1';
  return {
    phase8: require('../../services/phases/phase8-audio-v13.cjs'), ttsService: require('../../services/tts-service.cjs'), veracity: require('../../services/audio-veracity.cjs'),
    voiceConfigService: require('../../services/voice-config-service.cjs'), writeOrSwapClip: require('../../services/shared/audio-revision-swap.cjs').writeOrSwapClip,
    normalizeForAudio: require('../../services/shared/text-normalize.cjs').normalizeForAudio, S3: require('@aws-sdk/client-s3'), uuidv4: require('uuid').v4,
  };
}
async function renderClip(supabase, { text, role, voice, voiceIds }) {
  const d = ttsDeps();
  const s3 = new d.S3.S3Client({ region: process.env.AWS_REGION || 'eu-west-1' });
  const renderAndMaster = async () => {
    const out = await d.ttsService.generateWithRetry(text, 'azure', { door: { courseCode: COURSE, intro: false, language: 'ita', voiceBound: true }, subscriptionKey: process.env.AZURE_SPEECH_KEY, region: process.env.AZURE_SPEECH_REGION || 'westeurope', voiceName: voice.voiceName, speed: 1 });
    if (out.existingClip && !voiceIds.includes(out.existingClip.voice_id)) throw new Error(`door offered ${out.existingClip.voice_id}; ${voice.voiceName} only`);
    const { buffer, durationMs } = await d.phase8.masterAudio(out.audioBuffer, text, await d.voiceConfigService.masteringOptsFor(voice.voiceName, 'azure'));
    return { buffer, durationMs, wordBoundaries: out.wordBoundaries };
  };
  const gated = await d.veracity.renderChecked({ render: renderAndMaster, expectedText: text, language: 'ita', sampler: d.veracity.ALWAYS_SAMPLER, logger: console, meta: { courseCode: COURSE, role, voiceId: voice.voiceName, originalText: text } });
  if (!gated.published) throw new Error(`veracity gate: quarantined after ${gated.attempts} attempts (${gated.verdict?.reason})`);
  const newAudioId = d.uuidv4().toUpperCase(), newS3Key = `mastered/${newAudioId}.mp3`;
  await s3.send(new d.S3.PutObjectCommand({ Bucket: d.phase8.S3_BUCKET, Key: newS3Key, Body: gated.buffer, ContentType: 'audio/mpeg', CacheControl: 'public, max-age=31536000, immutable' }));
  const verdictColumns = d.veracity.verdictColumns(gated.verdict, { checker: SWEEP, attempts: gated.attempts });
  const textNormalized = d.normalizeForAudio(text);
  const base = { course_code: COURSE, text, text_normalized: textNormalized, language: 'ita', role, voice_id: voice.voiceId, origin: 'tts' };
  const out = await d.writeOrSwapClip({ supabase, identity: { course_code: COURSE, text_normalized: textNormalized, language: 'ita', role, voice_id: voice.voiceId }, insertRow: { ...base, s3_key: newS3Key, duration_ms: gated.durationMs, word_boundaries: gated.wordBoundaries || null, ...verdictColumns }, swapPatch: { voice_id: voice.voiceId, origin: 'tts', word_boundaries: gated.wordBoundaries || null, text, ...verdictColumns }, newS3Key, durationMs: gated.durationMs, source: SWEEP, acceptedBy: `${SWEEP} (${role}, ${voice.voiceName})`, reason: RULING, logger: console });
  return { audioId: out.audioId, durationMs: gated.durationMs };
}
function italianSlotIds() {
  return [...CHANGES.filter(c => !c.delete && c.targetChanged).map(c => `${COURSE}:${c.id}`), ...RECUT.flatMap(r => [`${COURSE}:${r.lego_id}C02`, `${COURSE}:${r.lego_id}C03`])];
}
async function fillItalian(pg, supabase, log) {
  const { rows } = await pg.query(`SELECT id, target_text, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2) ORDER BY id`, [COURSE, italianSlotIds()]);
  for (const r of rows) for (const role of ['target1', 'target2']) {
    if (r[`${role}_audio_id`]) continue;
    const entry = { id: r.id, role, text: r.target_text }; log.audio.push(entry);
    const voice = role === 'target1' ? ELSA : BENIGNO;
    try {
      const { rows: have } = await pg.query(`SELECT id, voice_id FROM course_audio WHERE language='ita' AND text_normalized=normalize_text($1) AND s3_key IS NOT NULL AND s3_key NOT LIKE 'pending/%' AND voice_id = ANY($2) ORDER BY (course_code=$3) DESC, (role=$4) DESC, created_at DESC LIMIT 1`, [r.target_text, AZURE_VOICE_IDS[role], COURSE, role]);
      let audioId = have[0]?.id;
      if (audioId) entry.result = `linked existing ${have[0].voice_id} clip ${audioId}`;
      else { const out = await renderClip(supabase, { text: r.target_text, role, voice, voiceIds: AZURE_VOICE_IDS[role] }); audioId = out.audioId; entry.result = `rendered ${voice.voiceName} clip ${audioId} (${out.durationMs} ms)`; }
      const u = await pg.query(`UPDATE course_practice_phrases SET ${role}_audio_id=$1 WHERE course_code=$2 AND id=$3 AND target_text=$4 AND ${role}_audio_id IS NULL`, [audioId, COURSE, r.id, r.target_text]);
      const { rows: [now] } = await pg.query(`SELECT a.id, a.voice_id FROM course_practice_phrases x LEFT JOIN course_audio a ON a.id=x.${role}_audio_id WHERE x.course_code=$1 AND x.id=$2`, [COURSE, r.id]);
      // The audio_autolink trigger links the empty slot on insert (seen live, job #580·I): rowCount 0 with our own clip in the slot is success.
      if (u.rowCount !== 1 && now?.id === audioId) entry.result += ' — linked by the audio_autolink trigger on insert';
      entry.linked = now?.id || null; entry.linkedVoice = now?.voice_id || null;
      if (!now?.id || !AZURE_VOICE_IDS[role].includes(now.voice_id)) entry.result += ` — SLOT NOT ON CAST VOICE (${now?.voice_id})`;
    } catch (e) { entry.result = `REFUSED/FAILED: ${e.message}`; }
  }
}
async function silentEnglish(pg) {
  const ids = [...CHANGES.filter(c => !c.delete).map(c => `${COURSE}:${c.id}`), ...RECUT.flatMap(r => [`${COURSE}:${r.lego_id}C02`, `${COURSE}:${r.lego_id}C03`])];
  const { rows } = await pg.query(`SELECT id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2) AND known_audio_id IS NULL ORDER BY id`, [COURSE, ids]);
  return rows.map(r => r.id);
}

async function main() {
  const APPLY = process.env.APPLY === '1';
  const { Client } = require('pg');
  const { createClient } = require('@supabase/supabase-js');
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const log = { sweep: SWEEP, ruling: RULING, job: JOB, apply: APPLY, started: new Date().toISOString(), problems: [], audio: [] };
  console.log(`\n══ ${COURSE} — 608 pos 8, 618 pos 8, the ten calls — ${APPLY ? 'APPLY' : 'DRY RUN'} ══`);
  await guardLive(pg, log.problems, log);
  if (!log.problems.length) await guards(pg, log.problems, log);
  console.log('\nPLAN:');
  for (const c of CHANGES) console.log(`  ${c.id.padEnd(12)} "${c.before.known}" → "${c.before.target}"  ⇒  ${c.delete ? 'DELETE (farlo/modo untaught before 618)' : `"${c.after.known}" → "${c.after.target}"`}${c.targetChanged && !c.delete ? '  [Italian moves]' : ''}${c.knownChanged && !c.delete ? '  [English moves]' : ''}   — ${c.why}`);
  console.log(`  608 containment under the live gate: ${JSON.stringify(log.containment608)}`);
  console.log(`  taught before 618: ${JSON.stringify(log.taughtBefore618)}`);
  for (const r of RECUT) console.log(`  ${r.lego_id} components ${JSON.stringify(OLD_COMPONENTS.map(c => c.known + '|' + c.target))} ⇒ ${JSON.stringify(NEW_COMPONENTS.map(c => c.known + '|' + c.target))}; positions ${JSON.stringify(log.positions?.[r.lego_id] || {})}`);
  console.log(`  "successo" first taught at ${log.successoFirstTaught}; bare-use settled before re-cut: ${log.successoSettledBefore}, after: ${log.successoSettledAfter}; è+participle first heard at seed ${log.eParticipleFirstHeard}; è successo uses 311–571: ${JSON.stringify(log.eSuccessoUses)}`);
  for (const s of log.settled || []) console.log(`  settled by an existing component, no change: ${s.word} (${s.lego_id} ${JSON.stringify(s.components)}) — ${s.laterUse}: ${s.ok}`);
  console.log(`  ${NOT_NEW.lego_id} "${NOT_NEW.known}" → "${NOT_NEW.target}": is_new true ⇒ false; intro detached (${log.oldIntro?.id || 'none'}: "${log.oldIntro?.text || ''}"); debut from the live course: ${JSON.stringify(log.debut246)}`);
  console.log(`  unapprove seeds (approved_at before): ${JSON.stringify(log.seedsApprovedBefore)}`);
  if (log.targetSide?.length) { console.log('same Italian under a different English elsewhere (listed, not a defect):'); for (const t of new Set(log.targetSide)) console.log('  ' + t); }
  console.log(log.problems.length ? '\nPROBLEMS:\n  ' + log.problems.join('\n  ') : '\nguards hold');
  if (APPLY && !log.problems.length) {
    await applyContent(pg, supabase, log); console.log(`APPLIED. events=${JSON.stringify(log.events)}`);
    await fillItalian(pg, supabase, log);
    console.log('ITALIAN AUDIO:'); for (const a of log.audio) console.log(`  ${a.id} ${a.role} "${a.text}": ${a.result}`);
    log.silentEnglish = await silentEnglish(pg);
    console.log(`ENGLISH prompts to fill on temporary Sonia (${log.silentEnglish.length}):\n  SCOPE=ids IDS=${log.silentEnglish.join(',')} APPLY=1 node tools/course-optimization/ita-sonia-temporary-fill-2026-09-28.cjs`);
    if (log.audio.some(a => /REFUSED|FAILED|NOT ON CAST/.test(a.result))) log.problems.push('some Italian slots were not filled — see audio');
  }
  const f = evidencePath(`tools/course-optimization/${SWEEP}/${APPLY ? 'applied' : 'dryrun'}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(log, null, 2)); console.log(`Wrote ${f}`);
  await pg.end(); process.exit(log.problems.length ? 2 : 0);
}
module.exports = { bareWordSettled, ancoraAfterAdjective, modoDaFare, phraseContainsLego, componentsTile, CHANGES, LEGOS, OLD_COMPONENTS, NEW_COMPONENTS, NOT_NEW, RECUT };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
