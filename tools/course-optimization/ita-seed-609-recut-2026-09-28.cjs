#!/usr/bin/env node
'use strict';
// tools/course-optimization/ita-seed-609-recut-2026-09-28.cjs
//
// ita_for_eng — SEED 609 re-cut under Kai's ruling (2026-09-28, job #579·I):
//   "I think we can just cut it up differently. Chiedere, to ask works fine as a lego."
//
// Seed 609 "the sensible thing to do would have been to ask" → "la cosa sensata da fare sarebbe stata
// chiedere". L02 read "would have been to ask | sarebbe stata chiedere"; job #577·I gave it "it" under
// K28, which does not apply here: the subject of *sarebbe stata* is the NOUN "la cosa" in the same
// seed, and *stata* is feminine BECAUSE it agrees with that noun. The fragment was broken on both
// sides — "it would have been to ask" is not in the seed and is not natural English, and "sarebbe
// stata chiedere" hands the learner a feminine participle with no feminine noun to agree with (K27).
// K28's limit: the pronoun is added only where the Italian subject is implied by the verb, never
// where an agreeing noun subject exists — there the LEGO takes the NOUN.
//
// THE CUT: L01 "to ask | chiedere" unchanged (Kai). L02 becomes "the sensible thing to do would have
// been | la cosa sensata da fare sarebbe stata", components "the sensible thing to do | la cosa
// sensata da fare" + "would have been | sarebbe stata". The two LEGOs tile the seed on both sides.
// The smaller cut (noun phrase and "would have been" as two LEGOs) was REJECTED: a bare "would have
// been | sarebbe stata" LEGO is the very defect being fixed — a feminine participle cut away from its
// noun, and a gloss naming nobody (K26). Seed 608 already taught every word ("sensible | sensata",
// "it would have been | sarebbe stata", "the thing to do | la cosa da fare"), and no LEGO in the
// course teaches the new L02 pair on both sides, so it stays NEW: what is new is the structure — the
// noun subject in front of "sarebbe stata" (608 had the verb first, subject implied).
//
// Every phrase under L02 is brought to CONTAIN the LEGO contiguously on both sides (O12), from
// vocabulary taught by seed 609; U01 (the seed) does not move. The four "the important / best / first
// / most sensible thing would have been to ask" rows cannot contain the LEGO and are re-textured in
// place, never deleted. Nothing elsewhere in the course carries the old gloss.
//
// AFTER THE EDIT (the #577·I pipeline): English slots of changed rows are detached and filled by
// ita-sonia-temporary-fill SCOPE=ids (temporary Sonia cast, restored byte-identical); Italian
// target1/target2 are linked to an existing Elsa/Benigno clip or rendered through the guarded door;
// the L02 intro is re-mirrored by ita-intro-mirror-fix in a FRESH process (the cast gate caches for
// 60 s); component intro links are unlinked (components are never introduced); seed 609 unapproved.
//
//   node tools/course-optimization/ita-seed-609-recut-2026-09-28.cjs            # dry run
//   APPLY=1 node tools/course-optimization/ita-seed-609-recut-2026-09-28.cjs    # apply + Italian audio

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'ita_for_eng';
const SEED = 609;
const SWEEP = 'ita-seed-609-recut-2026-09-28';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const JOB = '#579·I';
const RULING = 'Kai, 2026-09-28 (job #579·I): "I think we can just cut it up differently. Chiedere, to ask works fine as a lego." S0609L02 re-cut to "the sensible thing to do would have been | la cosa sensata da fare sarebbe stata" so the feminine agreement has its noun (K28 limit); every phrase under it contains the LEGO (O12); seed 609 unapproved';
const ELSA = { voiceId: 'azure_it-IT-ElsaNeural', voiceName: 'it-IT-ElsaNeural' };
const BENIGNO = { voiceId: 'azure_it-IT-BenignoNeural', voiceName: 'it-IT-BenignoNeural' };
const AZURE_VOICE_IDS = { target1: ['azure_it-IT-ElsaNeural', 'it-IT-ElsaNeural'], target2: ['azure_it-IT-BenignoNeural', 'it-IT-BenignoNeural'] };

// ── Rules (pure; the test exercises these) ─────────────────────────────────────────────
const norm = (s) => String(s || '').toLowerCase().replace(/’/g, "'").replace(/[.,!?;:"«»]+/g, ' ').replace(/\s+/g, ' ').trim();
const words = (s) => norm(s).split(' ').filter(Boolean);
const squash = (s) => norm(s).replace(/\s+/g, '');
/** Contiguous containment (stricter than the live gate's word multiset). */
const containsChunk = (hay, needle) => (' ' + norm(hay) + ' ').includes(' ' + norm(needle) + ' ');
const legoInSeed = (seed, l) => containsChunk(seed.known, l.known) && containsChunk(seed.target, l.target);
const componentsTile = (l) => squash(l.components.map(c => c.target).join(' ')) === squash(l.target) && squash(l.components.map(c => c.known).join(' ')) === squash(l.known);
/** The part of the seed the LEGOs leave uncovered, both sides (L27). */
function uncovered(seed, legos) {
  let k = ' ' + norm(seed.known) + ' ', t = ' ' + norm(seed.target) + ' ';
  for (const l of legos) { k = k.replace(' ' + norm(l.known) + ' ', ' '); t = t.replace(' ' + norm(l.target) + ' ', ' '); }
  return { known: k.trim(), target: t.trim() };
}
/**
 * K28's limit. A LEGO whose target carries a participle that AGREES with a noun subject of its seed
 * must carry that noun; a pronoun is licensed only where no such noun exists (subject implied by the verb).
 */
function agreementCarriesItsNoun(lego, { participle, noun }) {
  return !containsChunk(lego.target, participle) || containsChunk(lego.target, noun);
}
const AGREEMENT_609 = { participle: 'stata', noun: 'la cosa' };

// ── The changes ────────────────────────────────────────────────────────────────────────
const SEED_609 = { known: 'the sensible thing to do would have been to ask', target: 'la cosa sensata da fare sarebbe stata chiedere' };
const L01 = { known: 'to ask', target: 'chiedere' };
const OLD_L02 = { known: 'it would have been to ask', target: 'sarebbe stata chiedere', components: [{ known: 'it would have been', target: 'sarebbe stata' }, { known: 'to ask', target: 'chiedere' }] };
const NEW_L02 = { known: 'the sensible thing to do would have been', target: 'la cosa sensata da fare sarebbe stata', components: [{ known: 'the sensible thing to do', target: 'la cosa sensata da fare' }, { known: 'would have been', target: 'sarebbe stata' }] };

const CHANGES = [
  { id: 'S0609L02C01', role: 'component', before: { known: 'would have been', target: 'sarebbe stata' }, after: { known: 'the sensible thing to do', target: 'la cosa sensata da fare' } },
  { id: 'S0609L02C02', role: 'component', before: { known: 'to ask', target: 'chiedere' }, after: { known: 'would have been', target: 'sarebbe stata' } },
  { id: 'S0609L02B01', role: 'build', before: { known: 'it would have been to ask', target: 'sarebbe stata chiedere' }, after: { known: 'the sensible thing to do would have been', target: 'la cosa sensata da fare sarebbe stata' } },
  { id: 'S0609L02B02', role: 'build', before: { known: 'the sensible thing would have been to ask', target: 'la cosa sensata sarebbe stata chiedere' }, after: { known: 'the sensible thing to do would have been to ask', target: 'la cosa sensata da fare sarebbe stata chiedere' } },
  { id: 'S0609L02B03', role: 'build', before: { known: 'the important thing would have been to ask', target: 'la cosa importante sarebbe stata chiedere' }, after: { known: 'the sensible thing to do would have been to wait', target: 'la cosa sensata da fare sarebbe stata aspettare' } },
  { id: 'S0609L02U02', role: 'use', before: { known: 'the best thing would have been to ask', target: 'la cosa migliore sarebbe stata chiedere' }, after: { known: 'I think the sensible thing to do would have been to ask', target: 'penso che la cosa sensata da fare sarebbe stata chiedere' } },
  { id: 'S0609L02U03', role: 'use', before: { known: 'the most sensible thing would have been to ask', target: 'la cosa più sensata sarebbe stata chiedere' }, after: { known: 'the sensible thing to do would have been to ask my mother', target: 'la cosa sensata da fare sarebbe stata chiedere a mia madre' } },
  { id: 'S0609L02U04', role: 'use', before: { known: 'the first thing would have been to ask', target: 'la prima cosa sarebbe stata chiedere' }, after: { known: 'the sensible thing to do would have been to ask his friend', target: 'la cosa sensata da fare sarebbe stata chiedere al suo amico' } },
  { id: 'S0609L02U05', role: 'use', before: { known: 'at the time the sensible thing would have been to ask', target: 'in quel periodo la cosa sensata sarebbe stata chiedere' }, after: { known: 'at the time the sensible thing to do would have been to ask', target: 'in quel periodo la cosa sensata da fare sarebbe stata chiedere' } },
];
/** Rows under L02 that already contain the new LEGO and do not move. */
const KEPT = [{ id: 'S0609L02U01', role: 'use', known: SEED_609.known, target: SEED_609.target }];
for (const c of CHANGES) { c.knownChanged = norm(c.before.known) !== norm(c.after.known); c.targetChanged = norm(c.before.target) !== norm(c.after.target); }

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
  if (!s || s.known_text !== SEED_609.known || s.target_text !== SEED_609.target) problems.push(`seed 609 reads "${s?.known_text}" → "${s?.target_text}"`);
  log.seedApprovedBefore = s?.approved_at || null;
  const { rows: legos } = await pg.query('SELECT lego_id, known_text, target_text, components, presentation_audio_id FROM course_legos WHERE course_code=$1 AND seed_number=$2 ORDER BY lego_id', [COURSE, SEED]);
  const l1 = legos.find(l => l.lego_id === 'S0609L01'), l2 = legos.find(l => l.lego_id === 'S0609L02');
  if (legos.length !== 2) problems.push(`seed 609 has ${legos.length} LEGOs, expected two`);
  if (!l1 || l1.known_text !== L01.known || l1.target_text !== L01.target) problems.push(`S0609L01 reads "${l1?.known_text}" → "${l1?.target_text}"`);
  if (!l2 || l2.known_text !== OLD_L02.known || l2.target_text !== OLD_L02.target) problems.push(`S0609L02 reads "${l2?.known_text}" → "${l2?.target_text}"`);
  if (l2 && JSON.stringify(l2.components) !== JSON.stringify(OLD_L02.components)) problems.push(`S0609L02 components are ${JSON.stringify(l2.components)}`);
  log.oldIntroL02 = l2?.presentation_audio_id || null;
  const { rows: under } = await pg.query(`SELECT split_part(id,':',2) id, phrase_role, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND seed_number=$2 AND id LIKE $3 ORDER BY position`, [COURSE, SEED, `${COURSE}:S0609L02%`]);
  const byId = Object.fromEntries(under.map(r => [r.id, r]));
  for (const c of CHANGES) { const r = byId[c.id]; if (!r || r.known_text !== c.before.known || r.target_text !== c.before.target || r.phrase_role !== c.role) problems.push(`${c.id} reads "${r?.known_text}" → "${r?.target_text}" (${r?.phrase_role}) — expected "${c.before.known}" → "${c.before.target}"`); }
  for (const k of KEPT) { const r = byId[k.id]; if (!r || r.known_text !== k.known || r.target_text !== k.target) problems.push(`${k.id} reads "${r?.known_text}" → "${r?.target_text}"`); }
  for (const r of under) if (!CHANGES.some(c => c.id === r.id) && !KEPT.some(k => k.id === r.id)) problems.push(`${r.id} "${r.known_text}" is under S0609L02 but not planned`);
  // Concurrency: another surface editing seed 609 in the last 24 h, other than the finished #577·I pass whose after-state is our BEFORE.
  const FINISHED = ['ita-noun-subject-pronoun-2026-09-28', 'ita-intro-mirror-fix-2026-09-28', 'ita-sonia-temporary-fill-2026-09-28'];
  const { rows: ev } = await pg.query(`SELECT id, surface, operation FROM content_edit_events WHERE course_code=$1 AND occurred_at > now() - interval '24 hours' AND surface NOT LIKE '%' || $2 || '%' AND NOT (surface LIKE ANY($5)) AND (scope->'seed_numbers' ?| $3::text[] OR scope->'lego_ids' ?| $4::text[])`,
    [COURSE, SWEEP, [String(SEED)], ['S0609L01', 'S0609L02'], FINISHED.map(f => `%${f}%`)]);
  for (const e of ev) problems.push(`another surface touched seed 609 today: ${e.surface} ${e.operation} (${e.id}) — re-read before writing`);
}
async function guards(pg, problems, log) {
  if (legoInSeed(SEED_609, OLD_L02)) problems.push('the old L02 is in the seed — nothing to fix');
  if (!legoInSeed(SEED_609, NEW_L02)) problems.push('the new L02 is not a piece of seed 609 on both sides');
  if (!componentsTile(NEW_L02)) problems.push('new components do not tile the LEGO');
  if (!agreementCarriesItsNoun(NEW_L02, AGREEMENT_609)) problems.push('the new L02 carries "stata" without "la cosa"');
  log.coverage = uncovered(SEED_609, [NEW_L02, L01]);
  if (log.coverage.known || log.coverage.target) problems.push(`seed not fully covered: "${log.coverage.known}" / "${log.coverage.target}"`);
  for (const c of CHANGES) if (c.role !== 'component' && !(containsChunk(c.after.known, NEW_L02.known) && containsChunk(c.after.target, NEW_L02.target))) problems.push(`${c.id} after does not contain the LEGO`);
  if (CHANGES.filter(c => c.role === 'component').map(c => `${c.after.known}|${c.after.target}`).join('/') !== NEW_L02.components.map(c => `${c.known}|${c.target}`).join('/')) problems.push('component rows do not match the LEGO components');
  // L27(2): is the new pair already taught? duplicate only if BOTH sides match
  const { rows: dup } = await pg.query('SELECT lego_id, known_text, target_text FROM course_legos WHERE course_code=$1 AND lego_id<>$2 AND (lower(known_text)=lower($3) OR lower(target_text)=lower($4))', [COURSE, 'S0609L02', NEW_L02.known, NEW_L02.target]);
  log.sameEitherSide = dup;
  if (dup.some(d => norm(d.known_text) === norm(NEW_L02.known) && norm(d.target_text) === norm(NEW_L02.target))) problems.push(`the new L02 is already taught: ${JSON.stringify(dup)}`);
  // no new vocabulary: every word taught by seed 609 (L01 "chiedere" lands earlier in the same seed)
  log.vocab = {};
  for (const c of CHANGES) {
    const nk = await newVocabulary(pg, SEED, c.after.known, 'known'), nt = await newVocabulary(pg, SEED, c.after.target, 'target');
    if (nk.length || nt.length) { log.vocab[c.id] = { known: nk, target: nt }; problems.push(`${c.id} introduces vocabulary not taught by 609: ${[...nk, ...nt].join(', ')}`); }
  }
  // ZUT vs the course: a new known must not already map to a different target
  const pairs = [{ id: 'S0609L02', ...NEW_L02 }, ...CHANGES.filter(c => c.role !== 'component').map(c => ({ id: c.id, ...c.after }))];
  const ours = new Set([...pairs.map(p => p.id), ...KEPT.map(k => k.id)]);
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
  // O12 course-wide: the old gloss anywhere else
  const { rows: old } = await pg.query(`SELECT split_part(id,':',2) id, known_text FROM course_practice_phrases WHERE course_code=$1 AND (known_text ~* 'would have been to ask' OR target_text ~* 'sarebbe stata chiedere') AND seed_number<>$2`, [COURSE, SEED]);
  log.oldGlossElsewhere = old;
}

// ── Apply ───────────────────────────────────────────────────────────────────────────────
async function applyContent(pg, supabase, log) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const legoEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'lego-edit', scope: { seed_numbers: [SEED], lego_ids: ['S0609L02'], rows: 1 }, detail: { ruling: RULING, job: JOB, from: OLD_L02, to: NEW_L02 } });
  const phraseEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-edit', scope: { seed_numbers: [SEED], phrase_ids: CHANGES.map(c => `${COURSE}:${c.id}`), rows: CHANGES.length },
    detail: { ruling: RULING, job: JOB, changes: CHANGES.map(c => ({ id: `${COURSE}:${c.id}`, role: c.role, known_from: c.before.known, target_from: c.before.target, known_to: c.after.known, target_to: c.after.target })) } });
  const unapproveEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'unapprove', scope: { seed_numbers: [SEED], rows: 1 }, detail: { why: 'L02 re-cut and its phrases rewritten under Kai\'s ruling of 2026-09-28; needs his read', job: JOB, approved_at_before: log.seedApprovedBefore } });
  log.events = { legoEvent, phraseEvent, unapproveEvent };
  await pg.query('BEGIN');
  try {
    // 1. L02 re-textured in place (never deleted). Both sides move: every clip link cleared and re-filled; the intro is re-mirrored after.
    const l = await pg.query('UPDATE course_legos SET known_text=$1, target_text=$2, components=$3, known_audio_id=NULL, target1_audio_id=NULL, target2_audio_id=NULL, target1_duration_ms=NULL, target2_duration_ms=NULL, last_edit_event_id=$4, updated_at=now() WHERE course_code=$5 AND lego_id=$6 AND known_text=$7 AND target_text=$8',
      [NEW_L02.known, NEW_L02.target, JSON.stringify(NEW_L02.components), legoEvent, COURSE, 'S0609L02', OLD_L02.known, OLD_L02.target]);
    if (l.rowCount !== 1) throw new Error(`S0609L02: ${l.rowCount} rows`);
    // 2. Phrase rows re-textured in place; a side whose words did not move keeps its clips.
    for (const c of CHANGES) {
      const u = await pg.query(`UPDATE course_practice_phrases SET known_text=$1, target_text=$2, word_count=$3, lego_count=$4,
          known_audio_id=CASE WHEN $5 THEN NULL ELSE known_audio_id END, target1_audio_id=CASE WHEN $6 THEN NULL ELSE target1_audio_id END, target2_audio_id=CASE WHEN $6 THEN NULL ELSE target2_audio_id END,
          qa_checked=NULL, decomposition=NULL, decomposition_course_version=NULL, display_tiling=NULL, display_tiling_version=NULL, last_edit_event_id=$7, updated_at=now()
        WHERE course_code=$8 AND id=$9 AND known_text=$10 AND target_text=$11`,
        [c.after.known, c.after.target, c.after.target.length, c.after.target.split(/\s+/).length, c.knownChanged, c.targetChanged, phraseEvent, COURSE, `${COURSE}:${c.id}`, c.before.known, c.before.target]);
      if (u.rowCount !== 1) throw new Error(`${c.id}: ${u.rowCount} rows (row moved under us — re-read and re-plan)`);
    }
    await unlinkComponentIntros(pg, log, phraseEvent);
    const un = await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number=$3', [unapproveEvent, COURSE, SEED]);
    if (un.rowCount !== 1) throw new Error('seed unapprove');
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
  await refreshNow();
  const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs');
  log.audioPass = await queueAudioPass(supabase, { courseCode: COURSE, requestedBy: `@${SWEEP}`, reason: `job ${JOB}: S0609L02 re-cut to "the sensible thing to do would have been"; Italian linked/rendered on Elsa/Benigno by the tool, English prompts on temporary Sonia, intro re-mirrored`, metadata: { job: JOB, seeds: [SEED], rows: CHANGES.length + 1 } });
}

/** Component rows never play an intro (Tom, 2026-08-06); their stale links quote the old cut. Unlinked, clips kept. */
async function unlinkComponentIntros(pg, log, eventId) {
  const { rows } = await pg.query(`SELECT p.id, p.known_text, p.presentation_audio_id, a.text FROM course_practice_phrases p LEFT JOIN course_audio a ON a.id=p.presentation_audio_id WHERE p.course_code=$1 AND p.seed_number=$2 AND p.phrase_role='component' AND p.presentation_audio_id IS NOT NULL`, [COURSE, SEED]);
  log.componentsUnlinked = [];
  for (const r of rows) {
    const u = await pg.query('UPDATE course_practice_phrases SET presentation_audio_id=NULL, last_edit_event_id=COALESCE($1, last_edit_event_id), updated_at=now() WHERE course_code=$2 AND id=$3 AND presentation_audio_id=$4', [eventId || null, COURSE, r.id, r.presentation_audio_id]);
    if (u.rowCount === 1) await pg.query(`INSERT INTO content_audio_link_drops (table_name, row_id, course_code, seed_number, column_name, role, old_audio_id, old_text, reason) VALUES ('course_practice_phrases',$1,$2,$3,'presentation_audio_id','presentation',$4,$5,$6)`,
      [r.id, COURSE, SEED, r.presentation_audio_id, r.text, `${SWEEP}: component intro quotes the old cut ("${r.text}") not "${r.known_text}"; components are never introduced (Tom, 2026-08-06) — unlinked, clip kept (job ${JOB})`]);
    log.componentsUnlinked.push({ id: r.id, known: r.known_text, link: r.presentation_audio_id, intro: r.text, done: u.rowCount === 1 });
  }
}

// ── Audio (the #576·I route, unchanged) ──────────────────────────────────────────────────
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
async function fillItalian(pg, supabase, log) {
  const ids = CHANGES.map(c => `${COURSE}:${c.id}`);
  const { rows } = await pg.query(
    `SELECT 'course_legos' AS tbl, lego_id AS id, target_text, target1_audio_id, target2_audio_id FROM course_legos WHERE course_code=$1 AND lego_id='S0609L02'
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
async function silentEnglish(pg) {
  const { rows } = await pg.query(`SELECT id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2) AND known_audio_id IS NULL UNION ALL SELECT '${COURSE}:'||lego_id FROM course_legos WHERE course_code=$1 AND lego_id='S0609L02' AND known_audio_id IS NULL`, [COURSE, CHANGES.map(c => `${COURSE}:${c.id}`)]);
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
  console.log(`\n══ ${COURSE} — seed 609 re-cut — ${APPLY ? 'APPLY' : 'DRY RUN'} ══`);
  await guardLive(pg, log.problems, log);
  if (!log.problems.length) await guards(pg, log.problems, log);
  console.log('\nPLAN:');
  console.log(`  S0609L02  "${OLD_L02.known}" → "${OLD_L02.target}"  ⇒  "${NEW_L02.known}" → "${NEW_L02.target}"  components ${NEW_L02.components.map(c => `${c.known}→${c.target}`).join(' | ')}`);
  for (const c of CHANGES) console.log(`  ${c.id.padEnd(12)} "${c.before.known}" → "${c.before.target}"  ⇒  "${c.after.known}" → "${c.after.target}"`);
  console.log(`  unapprove seed ${SEED} (approved_at before: ${log.seedApprovedBefore})`);
  if (log.sameEitherSide?.length) console.log(`  same English or Italian as another LEGO (one side only — not a duplicate): ${JSON.stringify(log.sameEitherSide)}`);
  if (log.targetSide?.length) { console.log('same Italian under a different English elsewhere (listed, not a defect):'); for (const t of new Set(log.targetSide)) console.log('  ' + t); }
  console.log(`old gloss elsewhere: ${JSON.stringify(log.oldGlossElsewhere || [])}`);
  console.log(log.problems.length ? '\nPROBLEMS:\n  ' + log.problems.join('\n  ') : '\nguards hold');
  if (APPLY && !log.problems.length) {
    await applyContent(pg, supabase, log); console.log(`APPLIED. events=${JSON.stringify(log.events)} components unlinked=${JSON.stringify(log.componentsUnlinked)}`);
    await fillItalian(pg, supabase, log);
    console.log('ITALIAN AUDIO:'); for (const a of log.audio) console.log(`  ${a.tbl}.${a.id} ${a.role} "${a.text}": ${a.result}`);
    log.silentEnglish = await silentEnglish(pg);
    console.log(`ENGLISH prompts to fill on temporary Sonia (${log.silentEnglish.length}):\n  SCOPE=ids IDS=${log.silentEnglish.join(',')} APPLY=1 node tools/course-optimization/ita-sonia-temporary-fill-2026-09-28.cjs`);
    if (log.audio.some(a => /REFUSED|FAILED|NOT ON CAST/.test(a.result))) log.problems.push('some Italian slots were not filled — see audio');
  }
  const f = evidencePath(`tools/course-optimization/${SWEEP}/${APPLY ? 'applied' : 'dryrun'}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(log, null, 2)); console.log(`Wrote ${f}`);
  await pg.end(); process.exit(log.problems.length ? 2 : 0);
}
module.exports = { containsChunk, legoInSeed, componentsTile, uncovered, agreementCarriesItsNoun, AGREEMENT_609, SEED_609, L01, OLD_L02, NEW_L02, CHANGES, KEPT };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
