#!/usr/bin/env node
'use strict';
// tools/course-optimization/ita-seed-348-notnew-and-203-dup-2026-09-28.cjs
//
// ita_for_eng — two of Kai's rulings of 2026-09-28 (job #576·I), one pass:
//
//  1. SEED 348 "she didn't want to know what was going to happen" → "non voleva sapere che cosa sarebbe
//     successo". Its one LEGO S0348L01 read "would have happened" → "sarebbe successo": the English
//     is not in the seed at all (the seed says "was going to happen" — Kai's future-in-the-past rule:
//     "would" after a past frame is the Italian conditional perfect, and the English that MEANS it is
//     "was going to"), and a bare "would have happened" over a person-marked "sarebbe successo" names
//     nobody (K26). It becomes "what was going to happen" → "che cosa sarebbe successo", the exact
//     pair seed 201's L03 teaches (S0201L03, both sides, with the same two components "what → che
//     cosa" | "was going to happen → sarebbe successo"), so under L27(2) it is a DUPLICATE and is
//     introduced ONCE: S0348L01 is marked NOT NEW, and — the course convention (#572·I, and Kai's own
//     S0519L04) — a not-new LEGO carries no intro: the old Sonia clip is detached and kept, the drop
//     logged. Components C01/C02 are re-textured to the 201 pair. Every phrase under the LEGO is
//     brought to CONTAIN it on both sides (O12) from vocabulary seed 348 has already taught: six rows
//     only move their English ("what would have happened" → "what was going to happen", Italian and
//     its clips untouched); B01/B02 take the 201 build shape (LEGO, then "to know" + LEGO); U05, whose
//     Italian had "quello che sarebbe successo" (not the LEGO), is rewritten. The seed is unapproved.
//     COVERAGE (L27), checked after the change and REPORTED, not acted on: "she didn't want to know"
//     → "non voleva sapere" sits in no LEGO of seed 348 (no earlier LEGO teaches "non voleva" either;
//     S0053L01 teaches "she wanted to → voleva" and the learner has met "non voleva" in phrases from
//     seed 69). Closing it means adding a LEGO in front of L01, which re-indexes the seed — Kai's call.
//  2. SEED 203: S0203L01U02 and S0203L01U03 are word for word the same row ("I want to know what you
//     would do" → "voglio sapere che cosa faresti", the same three clips). U03 is deleted (a phrase
//     may go; the LOWER position, U02 at 8, stays). Positions are NOT repacked: this course keeps
//     gaps (343 LEGO baskets have one; this basket already lacks U07), so nothing re-numbers.
//
//  Italian target1/target2 through the guarded door on Elsa/Benigno (every Italian text here already
//  has a cast clip from seed 201 — linked, not rendered); English prompts on the temporary Sonia route
//  (ita-sonia-temporary-fill SCOPE=ids), so they land on the live re-voice list by construction (A23).
//  Every write is conditional on the row still reading its BEFORE text; guardLive refuses to start if
//  another surface has touched our rows today.
//
//   node tools/course-optimization/ita-seed-348-notnew-and-203-dup-2026-09-28.cjs            # dry run
//   APPLY=1 node tools/course-optimization/ita-seed-348-notnew-and-203-dup-2026-09-28.cjs    # apply + Italian audio
//   AUDIO_ONLY=1 APPLY=1 node …                                                                # audio step only

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'ita_for_eng';
const SEED = 348;
const DUP_SEED = 203;
const SWEEP = 'ita-seed-348-notnew-and-203-dup-2026-09-28';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const JOB = '#576·I';
const RULING = 'Kai, 2026-09-28 (job #576·I): S0348L01 "would have happened → sarebbe successo" becomes "what was going to happen → che cosa sarebbe successo" to match the seed; seed 201 L03 teaches that exact pair so it is NOT NEW (no intro, L27); components re-cut; every phrase under it contains the LEGO (O12); seed 348 unapproved. S0203L01U03 deleted as a word-for-word duplicate of U02';
const ELSA = { voiceId: 'azure_it-IT-ElsaNeural', voiceName: 'it-IT-ElsaNeural' };
const BENIGNO = { voiceId: 'azure_it-IT-BenignoNeural', voiceName: 'it-IT-BenignoNeural' };
const AZURE_VOICE_IDS = { target1: ['azure_it-IT-ElsaNeural', 'it-IT-ElsaNeural'], target2: ['azure_it-IT-BenignoNeural', 'it-IT-BenignoNeural'] };
const SONIA = { voiceId: 'azure_en-GB-SoniaNeural' };

// ── Rules (pure; the test exercises these) ─────────────────────────────────────────────
const norm = (s) => String(s || '').toLowerCase().replace(/’/g, "'").replace(/[.,!?;:"«»]+/g, ' ').replace(/\s+/g, ' ').trim();
const words = (s) => norm(s).split(' ').filter(Boolean);
const squash = (s) => norm(s).replace(/\s+/g, '');
/** Live gate's phrase-contains-LEGO rule: word MULTISET (reordering tolerated). */
function containsWords(hay, needle) {
  const h = words(hay);
  for (const w of words(needle)) { const i = h.indexOf(w); if (i < 0) return false; h.splice(i, 1); }
  return true;
}
/** The LEGO is a contiguous piece of the seed on both sides (a LEGO that is not in its seed is the defect here). */
const legoInSeed = (seed, l) => (' ' + norm(seed.known) + ' ').includes(' ' + norm(l.known) + ' ') && (' ' + norm(seed.target) + ' ').includes(' ' + norm(l.target) + ' ');
const componentsTile = (l) => squash(l.components.map(c => c.target).join(' ')) === squash(l.target) && squash(l.components.map(c => c.known).join(' ')) === squash(l.known);
/** L27(2): a LEGO is a duplicate of an earlier one only if BOTH sides match (Kai, 2026-09-23). */
const sameLegoBothSides = (a, b) => norm(a.known) === norm(b.known) && norm(a.target) === norm(b.target);
/** The part of the seed the LEGOs leave uncovered, both sides (L27 census). */
function uncovered(seed, legos) {
  let k = ' ' + norm(seed.known) + ' ', t = ' ' + norm(seed.target) + ' ';
  for (const l of legos) { k = k.replace(' ' + norm(l.known) + ' ', ' '); t = t.replace(' ' + norm(l.target) + ' ', ' '); }
  return { known: k.trim(), target: t.trim() };
}
/** Seed 203: two rows are duplicates when both sides read the same; the one at the LOWER position stays. */
const sameRow = (a, b) => norm(a.known) === norm(b.known) && norm(a.target) === norm(b.target);
const rowToDrop = (a, b) => (sameRow(a, b) ? (a.position < b.position ? b : a) : null);

// ── The changes ────────────────────────────────────────────────────────────────────────
const SEED_348 = { known: "she didn't want to know what was going to happen", target: 'non voleva sapere che cosa sarebbe successo' };
const OLD_L01 = { known: 'would have happened', target: 'sarebbe successo', components: [{ known: 'would have', target: 'sarebbe' }, { known: 'happened', target: 'successo' }], is_new: true };
const NEW_L01 = { known: 'what was going to happen', target: 'che cosa sarebbe successo', components: [{ known: 'what', target: 'che cosa' }, { known: 'was going to happen', target: 'sarebbe successo' }], is_new: false, taughtBy: 'S0201L03' };
const OLD_INTRO_L01 = { audioId: 'facf7ce4-bbbe-4712-97b1-aba650639c20', text: "The Italian for: 'would have happened', as in — 'he wanted to know what would have happened', is:" };

/** Phrase rows under S0348L01: before → after. Rows whose Italian does not move keep their target clips. */
const CHANGES = [
  { id: 'S0348L01C01', role: 'component', before: { known: 'would have', target: 'sarebbe' }, after: { known: 'what', target: 'che cosa' } },
  { id: 'S0348L01C02', role: 'component', before: { known: 'happened', target: 'successo' }, after: { known: 'was going to happen', target: 'sarebbe successo' } },
  { id: 'S0348L01B01', role: 'build', before: { known: 'would have happened', target: 'sarebbe successo' }, after: { known: 'what was going to happen', target: 'che cosa sarebbe successo' } },
  { id: 'S0348L01B02', role: 'build', before: { known: 'what would have happened', target: 'che cosa sarebbe successo' }, after: { known: 'to know what was going to happen', target: 'sapere che cosa sarebbe successo' } },
  { id: 'S0348L01B03', role: 'build', before: { known: "she didn't want to know what would have happened", target: 'non voleva sapere che cosa sarebbe successo' }, after: { known: "she didn't want to know what was going to happen", target: 'non voleva sapere che cosa sarebbe successo' } },
  { id: 'S0348L01U01', role: 'use', before: { known: "she didn't want to know what would have happened", target: 'non voleva sapere che cosa sarebbe successo' }, after: { known: "she didn't want to know what was going to happen", target: 'non voleva sapere che cosa sarebbe successo' } },
  { id: 'S0348L01U02', role: 'use', before: { known: 'he wanted to know what would have happened', target: 'voleva sapere che cosa sarebbe successo' }, after: { known: 'he wanted to know what was going to happen', target: 'voleva sapere che cosa sarebbe successo' } },
  { id: 'S0348L01U03', role: 'use', before: { known: 'I liked knowing what would have happened', target: 'mi piaceva sapere che cosa sarebbe successo' }, after: { known: 'I liked knowing what was going to happen', target: 'mi piaceva sapere che cosa sarebbe successo' } },
  { id: 'S0348L01U04', role: 'use', before: { known: "I'm sure she knew what would have happened", target: 'sono sicuro che sapeva che cosa sarebbe successo' }, after: { known: "I'm sure she knew what was going to happen", target: 'sono sicuro che sapeva che cosa sarebbe successo' } },
  { id: 'S0348L01U05', role: 'use', before: { known: 'she said she was worried about what would have happened', target: 'ha detto che era preoccupata per quello che sarebbe successo' }, after: { known: 'she said she wanted to know what was going to happen', target: 'ha detto che voleva sapere che cosa sarebbe successo' } },
];
for (const c of CHANGES) { c.knownChanged = norm(c.before.known) !== norm(c.after.known); c.targetChanged = norm(c.before.target) !== norm(c.after.target); }

/** Seed 203 duplicate: both rows as they stand; the tool decides which goes with rowToDrop(). */
const DUP_ROWS = [
  { id: 'S0203L01U02', position: 8, known: 'I want to know what you would do', target: 'voglio sapere che cosa faresti' },
  { id: 'S0203L01U03', position: 9, known: 'I want to know what you would do', target: 'voglio sapere che cosa faresti' },
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
async function guardLive(pg, problems, log) {
  const { rows: [s] } = await pg.query('SELECT known_text, target_text, approved_at FROM course_seeds WHERE course_code=$1 AND seed_number=$2', [COURSE, SEED]);
  if (!s || s.known_text !== SEED_348.known || s.target_text !== SEED_348.target) problems.push(`seed 348 reads "${s?.known_text}" → "${s?.target_text}"`);
  log.seedApprovedBefore = s?.approved_at || null;
  const { rows: legos } = await pg.query('SELECT lego_id, known_text, target_text, components, is_new, presentation_audio_id FROM course_legos WHERE course_code=$1 AND seed_number=$2 ORDER BY lego_id', [COURSE, SEED]);
  if (legos.length !== 1) problems.push(`seed 348 has ${legos.length} LEGOs, expected one`);
  const l = legos[0];
  if (l && (l.known_text !== OLD_L01.known || l.target_text !== OLD_L01.target || !l.is_new)) problems.push(`S0348L01 reads "${l.known_text}" → "${l.target_text}" is_new=${l.is_new}`);
  if (l && JSON.stringify(l.components) !== JSON.stringify(OLD_L01.components)) problems.push(`S0348L01 components are ${JSON.stringify(l.components)}`);
  if (l && l.presentation_audio_id !== OLD_INTRO_L01.audioId) problems.push(`S0348L01 presentation link is ${l.presentation_audio_id}`);
  const { rows: [intro] } = await pg.query('SELECT text, voice_id, lego_id FROM course_audio WHERE id=$1', [OLD_INTRO_L01.audioId]);
  if (!intro || intro.text !== OLD_INTRO_L01.text || intro.lego_id !== 'S0348L01') problems.push(`intro clip reads "${intro?.text}" lego_id=${intro?.lego_id}`);
  // the LEGO 348 becomes is taught, both sides and same components, by S0201L03 — that is what makes it NOT NEW
  const { rows: [t] } = await pg.query('SELECT known_text, target_text, components, is_new, seed_number FROM course_legos WHERE course_code=$1 AND lego_id=$2', [COURSE, NEW_L01.taughtBy]);
  if (!t || !sameLegoBothSides({ known: t.known_text, target: t.target_text }, NEW_L01) || !t.is_new || t.seed_number >= SEED) problems.push(`${NEW_L01.taughtBy} does not teach "${NEW_L01.known}" → "${NEW_L01.target}" as a new LEGO before 348 (reads "${t?.known_text}" → "${t?.target_text}", is_new=${t?.is_new})`);
  if (t && JSON.stringify(t.components) !== JSON.stringify(NEW_L01.components)) problems.push(`${NEW_L01.taughtBy} components ${JSON.stringify(t.components)} differ from the cut planned here`);
  const { rows: under } = await pg.query('SELECT split_part(id,\':\',2) id, phrase_role, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND seed_number=$2 ORDER BY position', [COURSE, SEED]);
  const byId = Object.fromEntries(under.map(r => [r.id, r]));
  for (const c of CHANGES) { const r = byId[c.id]; if (!r || r.known_text !== c.before.known || r.target_text !== c.before.target || r.phrase_role !== c.role) problems.push(`${c.id} reads "${r?.known_text}" → "${r?.target_text}" (${r?.phrase_role}) — expected "${c.before.known}" → "${c.before.target}"`); }
  for (const r of under) if (!CHANGES.some(c => c.id === r.id)) problems.push(`${r.id} "${r.known_text}" is under seed 348 but not in CHANGES`);
  // seed 203: the two rows read the same, the same clips, and the higher-positioned one is the one to drop
  const { rows: dup } = await pg.query('SELECT split_part(id,\':\',2) id, position, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2) ORDER BY position', [COURSE, DUP_ROWS.map(d => `${COURSE}:${d.id}`)]);
  if (dup.length !== 2) problems.push(`seed 203 duplicate rows: ${dup.length} found`);
  else {
    for (const d of DUP_ROWS) { const r = dup.find(x => x.id === d.id); if (!r || r.known_text !== d.known || r.target_text !== d.target || r.position !== d.position) problems.push(`${d.id} reads "${r?.known_text}" → "${r?.target_text}" at ${r?.position}`); }
    if (!sameRow({ known: dup[0].known_text, target: dup[0].target_text }, { known: dup[1].known_text, target: dup[1].target_text })) problems.push('seed 203 rows are not word-for-word duplicates');
    log.dupDrop = rowToDrop(DUP_ROWS[0], DUP_ROWS[1]);
    log.dupClipsShared = ['known_audio_id', 'target1_audio_id', 'target2_audio_id'].every(k => dup[0][k] === dup[1][k]);
    const { rows: [flags] } = await pg.query('SELECT count(*)::int n FROM course_qa_flags WHERE phrase_id=$1', [`${COURSE}:${log.dupDrop.id}`]);
    if (flags.n) problems.push(`${log.dupDrop.id} has ${flags.n} QA flag(s) — resolve before deleting`);
  }
  // Concurrency: another surface editing our rows today — refuse rather than overwrite. Job #574·I
  // (ita-seed-203-present-frames, finished and on main) wrote S0203L01U02/U03 earlier today; the
  // BEFORE text asserted above IS its after-state, so that one finished surface is exempt.
  const FINISHED = ['ita-seed-203-present-frames-2026-09-28'];
  const { rows: ev } = await pg.query(`SELECT id, surface, operation FROM content_edit_events WHERE course_code=$1 AND occurred_at > now() - interval '24 hours' AND surface NOT LIKE '%' || $2 || '%' AND NOT (surface LIKE ANY($6)) AND (scope->'seed_numbers' ?| $3::text[] OR scope->'lego_ids' ?| $4::text[] OR scope->'phrase_ids' ?| $5::text[])`,
    [COURSE, SWEEP, [String(SEED)], ['S0348L01'], [...CHANGES.map(c => `${COURSE}:${c.id}`), ...DUP_ROWS.map(d => `${COURSE}:${d.id}`)], FINISHED.map(f => `%${f}%`)]);
  for (const e of ev) problems.push(`another surface touched our rows today: ${e.surface} ${e.operation} (${e.id}) — re-read before writing`);
}
async function guards(pg, problems, log) {
  if (legoInSeed(SEED_348, OLD_L01)) problems.push('the old L01 is in the seed — nothing to fix');
  if (!legoInSeed(SEED_348, NEW_L01)) problems.push('the new L01 is not a piece of seed 348 on both sides');
  if (!componentsTile(NEW_L01)) problems.push('new components do not tile the LEGO');
  // O12: every non-component row under L01, after, contains the LEGO on both sides
  for (const c of CHANGES) if (c.role !== 'component' && !(containsWords(c.after.known, NEW_L01.known) && containsWords(c.after.target, NEW_L01.target))) problems.push(`${c.id} after "${c.after.known}" → "${c.after.target}" does not contain the LEGO`);
  // the two components are the two rows, in order
  if (CHANGES.filter(c => c.role === 'component').map(c => `${c.after.known}|${c.after.target}`).join('/') !== NEW_L01.components.map(c => `${c.known}|${c.target}`).join('/')) problems.push('component rows do not match the LEGO components');
  // L27 coverage census — reported, never a gate here (Kai's call)
  log.coverage = uncovered(SEED_348, [NEW_L01]);
  // no new vocabulary anywhere (both sides): a word is fine if taught before 348 or already in the row's own BEFORE text (it was there; this pass did not add it)
  log.vocab = {};
  const already = (c, side) => new Set(words(c.before[side]));
  for (const c of CHANGES) {
    const nk = (await newVocabulary(pg, SEED - 1, c.after.known, 'known')).filter(w => !already(c, 'known').has(w)), nt = (await newVocabulary(pg, SEED - 1, c.after.target, 'target')).filter(w => !already(c, 'target').has(w));
    if (nk.length || nt.length) { log.vocab[c.id] = { known: nk, target: nt }; problems.push(`${c.id} introduces vocabulary not taught before 348: ${[...nk, ...nt].join(', ')}`); }
  }
  // ZUT vs the course: a new known must not already map to a different target (component rows exempt on the known side); same target under another English is listed, not a defect (Kai)
  const pairs = [{ id: 'S0348L01', ...NEW_L01 }, ...CHANGES.filter(c => c.role !== 'component').map(c => ({ id: c.id, ...c.after }))];
  const ours = new Set(pairs.map(p => p.id));
  log.zut = []; log.targetSide = [];
  for (const p of pairs) {
    const { rows } = await pg.query(
      `SELECT id, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND phrase_role<>'component' AND (lower(trim(known_text))=lower(trim($2)) OR lower(trim(target_text))=lower(trim($3)))
       UNION ALL SELECT lego_id, known_text, target_text FROM course_legos WHERE course_code=$1 AND (lower(trim(known_text))=lower(trim($2)) OR lower(trim(target_text))=lower(trim($3)))`, [COURSE, p.known, p.target]);
    for (const r of rows) {
      const rid = r.id.replace(`${COURSE}:`, ''); if (ours.has(rid)) continue;
      const sameK = norm(r.known_text) === norm(p.known), sameT = norm(r.target_text) === norm(p.target);
      if (sameK && !sameT) log.zut.push(`${p.id} "${p.known}" → "${p.target}" vs ${rid} "${r.known_text}" → "${r.target_text}"`);
      else if (sameT && !sameK) log.targetSide.push(`${p.id} "${p.known}" shares its Italian "${p.target}" with ${rid} "${r.known_text}"`);
    }
  }
  log.targetSide = [...new Set(log.targetSide)];
  problems.push(...log.zut);
  // after the pass, nothing in the course still says "would have happened" over "sarebbe successo" (the old pair is gone, course-wide)
  const { rows: old } = await pg.query(`SELECT split_part(id,':',2) id FROM course_practice_phrases WHERE course_code=$1 AND known_text ~* 'would have happened' AND seed_number<>$2 UNION ALL SELECT lego_id FROM course_legos WHERE course_code=$1 AND known_text ~* 'would have happened' AND seed_number<>$2`, [COURSE, SEED]);
  log.oldGlossElsewhere = old.map(r => r.id);
  // no intro anywhere quotes a sentence this pass changes (other than the one we detach)
  const { rows: intros } = await pg.query(`SELECT a.id, a.lego_id, a.text FROM course_audio a WHERE a.course_code=$1 AND a.role='presentation' AND a.id<>$2 AND a.id::text IN (SELECT presentation_audio_id FROM course_legos WHERE course_code=$1 AND presentation_audio_id IS NOT NULL)`, [COURSE, OLD_INTRO_L01.audioId]);
  log.introsQuoting = [];
  for (const i of intros) for (const c of CHANGES) if (c.knownChanged && i.text.includes(`'${c.before.known}'`)) log.introsQuoting.push({ audio: i.id, lego: i.lego_id, text: i.text, row: c.id });
  for (const q of log.introsQuoting) problems.push(`intro ${q.audio} (${q.lego}) quotes a sentence this pass changes (${q.row}): "${q.text}"`);
  // seed 203 basket: gaps are the course convention (no repack) — record the fact
  const { rows: [gaps] } = await pg.query(`SELECT count(*)::int n FROM (SELECT seed_number, lego_index FROM course_practice_phrases WHERE course_code=$1 GROUP BY 1,2 HAVING count(*) <> max(position)-min(position)+1) g`, [COURSE]);
  log.basketsWithGaps = gaps.n;
}

// ── Apply ───────────────────────────────────────────────────────────────────────────────
async function applyContent(pg, supabase, log) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const { rows: [dropRow] } = await pg.query('SELECT * FROM course_practice_phrases WHERE course_code=$1 AND id=$2', [COURSE, `${COURSE}:${log.dupDrop.id}`]);
  const legoEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'lego-edit', scope: { seed_numbers: [SEED], lego_ids: ['S0348L01'], rows: 1 }, detail: { ruling: RULING, job: JOB, from: OLD_L01, to: NEW_L01, intro: { from: OLD_INTRO_L01, to: null, why: `not new (${NEW_L01.taughtBy}) — carries no intro; clip detached and kept` }, coverage_gap: log.coverage } });
  const phraseEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-edit', scope: { seed_numbers: [SEED], phrase_ids: CHANGES.map(c => `${COURSE}:${c.id}`), rows: CHANGES.length },
    detail: { ruling: RULING, job: JOB, changes: CHANGES.map(c => ({ id: `${COURSE}:${c.id}`, role: c.role, known_from: c.before.known, target_from: c.before.target, known_to: c.after.known, target_to: c.after.target })) } });
  const deleteEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-delete', scope: { seed_numbers: [DUP_SEED], phrase_ids: [`${COURSE}:${log.dupDrop.id}`], rows: 1 }, detail: { ruling: RULING, job: JOB, why: `word-for-word duplicate of ${DUP_ROWS.find(d => d.id !== log.dupDrop.id).id} (lower position kept); clips shared with the kept row, untouched; positions not repacked (course convention)`, deleted_row: dropRow } });
  const unapproveEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'unapprove', scope: { seed_numbers: [SEED], rows: 1 }, detail: { why: 'LEGO re-glossed and phrases rewritten under Kai\'s rulings of 2026-09-28; needs his read', job: JOB, approved_at_before: log.seedApprovedBefore } });
  log.events = { legoEvent, phraseEvent, deleteEvent, unapproveEvent };
  await pg.query('BEGIN');
  try {
    // 1. LEGO re-textured in place, NOT NEW, no intro. Links are set explicitly: every clip is cleared (both sides move) and re-linked by fillItalian / the Sonia fill.
    const l = await pg.query('UPDATE course_legos SET known_text=$1, target_text=$2, components=$3, is_new=false, presentation_audio_id=NULL, known_audio_id=NULL, target1_audio_id=NULL, target2_audio_id=NULL, target1_duration_ms=NULL, target2_duration_ms=NULL, last_edit_event_id=$4, updated_at=now() WHERE course_code=$5 AND lego_id=$6 AND known_text=$7 AND target_text=$8 AND is_new=true',
      [NEW_L01.known, NEW_L01.target, JSON.stringify(NEW_L01.components), legoEvent, COURSE, 'S0348L01', OLD_L01.known, OLD_L01.target]);
    if (l.rowCount !== 1) throw new Error(`S0348L01: ${l.rowCount} rows`);
    await pg.query('UPDATE course_audio SET lego_id=NULL WHERE id=$1 AND lego_id=$2', [OLD_INTRO_L01.audioId, 'S0348L01']);
    await pg.query('UPDATE lego_introductions SET presentation_audio_id=NULL, audio_uuid=NULL, updated_at=now() WHERE course_code=$1 AND lego_id=$2', [COURSE, 'S0348L01']);
    await pg.query(`INSERT INTO content_audio_link_drops (table_name, row_id, course_code, seed_number, column_name, role, old_audio_id, old_text, old_voice_id, new_text, reason) VALUES ('course_legos','S0348L01',$1,$2,'presentation_audio_id','presentation',$3,$4,$5,NULL,$6)`,
      [COURSE, SEED, OLD_INTRO_L01.audioId, OLD_INTRO_L01.text, SONIA.voiceId, `${SWEEP}: LEGO re-glossed to "${NEW_L01.known}" (job ${JOB}, event ${legoEvent}); not new (${NEW_L01.taughtBy}) — carries no intro; clip detached, asset kept`]);
    // 2. Phrase rows re-textured in place; a side whose words did not move keeps its clips.
    for (const c of CHANGES) {
      const u = await pg.query(`UPDATE course_practice_phrases SET known_text=$1, target_text=$2, word_count=$3, lego_count=$4,
          known_audio_id=CASE WHEN $5 THEN NULL ELSE known_audio_id END, target1_audio_id=CASE WHEN $6 THEN NULL ELSE target1_audio_id END, target2_audio_id=CASE WHEN $6 THEN NULL ELSE target2_audio_id END,
          qa_checked=NULL, decomposition=NULL, decomposition_course_version=NULL, display_tiling=NULL, display_tiling_version=NULL, last_edit_event_id=$7, updated_at=now()
        WHERE course_code=$8 AND id=$9 AND known_text=$10 AND target_text=$11`,
        [c.after.known, c.after.target, c.after.target.length, c.after.target.split(/\s+/).length, c.knownChanged, c.targetChanged, phraseEvent, COURSE, `${COURSE}:${c.id}`, c.before.known, c.before.target]);
      if (u.rowCount !== 1) throw new Error(`${c.id}: ${u.rowCount} rows (row moved under us — re-read and re-plan)`);
    }
    // 2b. The two component rows carried historic intro links ("The Italian for: 'would have' …") that quote the old cut; components are never introduced (Tom, 2026-08-06) — unlinked, clips kept.
    await unlinkComponentIntros(pg, log, phraseEvent);
    // 3. Seed 348 loses its approval.
    const un = await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number=$3', [unapproveEvent, COURSE, SEED]);
    if (un.rowCount !== 1) throw new Error('seed unapprove');
    // 4. Seed 203: the duplicate goes (conditional on its text and position; clips stay with the kept row).
    const d = await pg.query('DELETE FROM course_practice_phrases WHERE course_code=$1 AND id=$2 AND known_text=$3 AND target_text=$4 AND position=$5', [COURSE, `${COURSE}:${log.dupDrop.id}`, log.dupDrop.known, log.dupDrop.target, log.dupDrop.position]);
    if (d.rowCount !== 1) throw new Error(`${log.dupDrop.id}: ${d.rowCount} rows deleted`);
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
  await refreshNow();
  const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs');
  log.audioPass = await queueAudioPass(supabase, { courseCode: COURSE, requestedBy: `@${SWEEP}`, reason: `job ${JOB}: S0348L01 re-glossed to "what was going to happen" (not new); Italian linked/rendered on Elsa/Benigno by the tool, English prompts on temporary Sonia (ita-sonia-temporary-fill SCOPE=ids)`, metadata: { job: JOB, seeds: [SEED, DUP_SEED], rows: CHANGES.length + 1 } });
}

/** Component rows never play an intro; a stale link on one fails the intro-mirror exit check. Idempotent. */
async function unlinkComponentIntros(pg, log, eventId) {
  const { rows } = await pg.query(`SELECT p.id, p.known_text, p.presentation_audio_id, a.text FROM course_practice_phrases p LEFT JOIN course_audio a ON a.id=p.presentation_audio_id WHERE p.course_code=$1 AND p.seed_number=$2 AND p.phrase_role='component' AND p.presentation_audio_id IS NOT NULL`, [COURSE, SEED]);
  log.componentsUnlinked = log.componentsUnlinked || [];
  for (const r of rows) {
    const u = await pg.query('UPDATE course_practice_phrases SET presentation_audio_id=NULL, last_edit_event_id=COALESCE($1, last_edit_event_id), updated_at=now() WHERE course_code=$2 AND id=$3 AND presentation_audio_id=$4', [eventId || null, COURSE, r.id, r.presentation_audio_id]);
    if (u.rowCount === 1) await pg.query(`INSERT INTO content_audio_link_drops (table_name, row_id, course_code, seed_number, column_name, role, old_audio_id, old_text, reason) VALUES ('course_practice_phrases',$1,$2,$3,'presentation_audio_id','presentation',$4,$5,$6)`,
      [r.id, COURSE, SEED, r.presentation_audio_id, r.text, `${SWEEP}: component intro quotes the old cut ("${r.text}") not "${r.known_text}"; components are never introduced (Tom, 2026-08-06) — unlinked, clip kept (job ${JOB})`]);
    log.componentsUnlinked.push({ id: r.id, known: r.known_text, link: r.presentation_audio_id, intro: r.text, done: u.rowCount === 1 });
  }
}

// ── Audio (the #559·I / #574·I route, unchanged) ────────────────────────────────────────
function ttsDeps() {
  process.env.PHASE8_NO_LISTEN = '1';
  return {
    phase8: require('../../services/phases/phase8-audio-v13.cjs'), ttsService: require('../../services/tts-service.cjs'), veracity: require('../../services/audio-veracity.cjs'),
    voiceConfigService: require('../../services/voice-config-service.cjs'), writeOrSwapClip: require('../../services/shared/audio-revision-swap.cjs').writeOrSwapClip,
    normalizeForAudio: require('../../services/shared/text-normalize.cjs').normalizeForAudio, S3: require('@aws-sdk/client-s3'), uuidv4: require('uuid').v4,
  };
}
async function renderClip(supabase, { text, language, role, voice, voiceIds }) {
  const d = ttsDeps();
  const s3 = new d.S3.S3Client({ region: process.env.AWS_REGION || 'eu-west-1' });
  const renderAndMaster = async () => {
    const out = await d.ttsService.generateWithRetry(text, 'azure', { door: { courseCode: COURSE, intro: false, language, voiceBound: true }, subscriptionKey: process.env.AZURE_SPEECH_KEY, region: process.env.AZURE_SPEECH_REGION || 'westeurope', voiceName: voice.voiceName, speed: 1 });
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
/** Italian target1/target2 on the LEGO and every row whose Italian moved: link an existing Elsa/Benigno clip, else render. */
async function fillItalian(pg, supabase, log) {
  const ids = CHANGES.map(c => `${COURSE}:${c.id}`);
  const { rows } = await pg.query(
    `SELECT 'course_legos' AS tbl, lego_id AS id, target_text, target1_audio_id, target2_audio_id FROM course_legos WHERE course_code=$1 AND lego_id='S0348L01'
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
/** English prompt slots this pass leaves silent — to be filled by ita-sonia-temporary-fill SCOPE=ids. */
async function silentEnglish(pg) {
  const { rows } = await pg.query(`SELECT id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2) AND known_audio_id IS NULL UNION ALL SELECT lego_id FROM course_legos WHERE course_code=$1 AND lego_id='S0348L01' AND known_audio_id IS NULL`, [COURSE, CHANGES.map(c => `${COURSE}:${c.id}`)]);
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
  console.log(`\n══ ${COURSE} — seed 348 L01 not-new re-gloss + seed 203 duplicate — ${AUDIO_ONLY ? 'AUDIO ONLY' : APPLY ? 'APPLY' : 'DRY RUN'} ══`);
  if (!AUDIO_ONLY) {
    await guardLive(pg, log.problems, log);
    if (!log.problems.length) await guards(pg, log.problems, log);
    console.log('\nPLAN:');
    console.log(`  S0348L01  "${OLD_L01.known}" → "${OLD_L01.target}" [new]  ⇒  "${NEW_L01.known}" → "${NEW_L01.target}" [not new: ${NEW_L01.taughtBy}]  components ${NEW_L01.components.map(c => `${c.known}→${c.target}`).join(' | ')}`);
    for (const c of CHANGES) console.log(`  ${c.id.padEnd(12)} "${c.before.known}" → "${c.before.target}"  ⇒  "${c.after.known}" → "${c.after.target}"${c.targetChanged ? '' : '   (Italian unchanged, clips kept)'}`);
    console.log(`  intro S0348L01  "${OLD_INTRO_L01.text}"  ⇒  detached (not new), clip kept`);
    console.log(`  unapprove seed ${SEED}`);
    if (log.dupDrop) console.log(`  seed 203: delete ${log.dupDrop.id} (position ${log.dupDrop.position}) — duplicate of the row kept at the lower position; clips shared=${log.dupClipsShared}; no repack (${log.basketsWithGaps} baskets in the course already have gaps)`);
    if (log.coverage) console.log(`\nL27 COVERAGE after the change — seed 348 words in no LEGO: "${log.coverage.known}" → "${log.coverage.target}"  (reported for Kai, not acted on)`);
    if (log.targetSide?.length) { console.log('same Italian under a different English elsewhere (not a defect — listed):'); for (const t of log.targetSide) console.log('  ' + t); }
    if (log.oldGlossElsewhere?.length) console.log(`"would have happened" elsewhere in the course: ${log.oldGlossElsewhere.join(', ')}`);
    console.log(log.problems.length ? '\nPROBLEMS:\n  ' + log.problems.join('\n  ') : '\nguards hold: live picture matches, S0201L03 teaches the pair both sides, components tile, every row contains the LEGO both sides, no vocabulary untaught before 348, no known→target ZUT clash, no other intro quotes a changed sentence, 203 rows are word-for-word duplicates with no QA flag');
    if (APPLY && !log.problems.length) { await applyContent(pg, supabase, log); console.log(`APPLIED. events=${JSON.stringify(log.events)} audioPass=${JSON.stringify(log.audioPass)}`); }
  }
  if (APPLY && !log.problems.length) {
    if (AUDIO_ONLY) { await unlinkComponentIntros(pg, log, null); console.log(`component intro links dropped: ${JSON.stringify(log.componentsUnlinked)}`); }
    await fillItalian(pg, supabase, log);
    console.log('ITALIAN AUDIO:'); for (const a of log.audio) console.log(`  ${a.tbl}.${a.id} ${a.role} "${a.text}": ${a.result}`);
    log.silentEnglish = await silentEnglish(pg);
    console.log(`ENGLISH prompts to fill on temporary Sonia (${log.silentEnglish.length}):\n  SCOPE=ids IDS=${log.silentEnglish.join(',')} APPLY=1 node tools/course-optimization/ita-sonia-temporary-fill-2026-09-28.cjs`);
    if (log.audio.some(a => /REFUSED|FAILED|NOT ON CAST/.test(a.result))) log.problems.push('some Italian slots were not filled — see audio');
  }
  const f = evidencePath(`tools/course-optimization/${SWEEP}/${AUDIO_ONLY ? 'audio' : APPLY ? 'applied' : 'dryrun'}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(log, null, 2)); console.log(`Wrote ${f}`);
  await pg.end(); process.exit(log.problems.length ? 2 : 0);
}
module.exports = { containsWords, legoInSeed, componentsTile, sameLegoBothSides, uncovered, sameRow, rowToDrop, SEED_348, OLD_L01, NEW_L01, CHANGES, DUP_ROWS, OLD_INTRO_L01 };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
