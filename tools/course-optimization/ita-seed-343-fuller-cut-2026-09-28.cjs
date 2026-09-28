#!/usr/bin/env node
'use strict';
// tools/course-optimization/ita-seed-343-fuller-cut-2026-09-28.cjs
//
// ita_for_eng seed 343, second ruling (Kai, 2026-09-28, job #529): introduce "per" with the
// FULLER cut — L02 becomes "worried about the economy → preoccupata per l'economia" (it was
// "about the economy → per l'economia" after the first pass today). The seed is unchanged;
// L01 "she's worried → è preoccupata" is unchanged; the two LEGOs deliberately share
// "preoccupata" — the expanded LEGO carries the word the complement hangs on, the way an
// expanded-LEGO context does (see polysemous/expanded-lego doctrine). Runs AFTER
// ita-seed-343-recut-2026-09-28.cjs and asserts that picture live before writing.
//
//   L02 LEGO   about the economy → per l'economia      →  worried about the economy → preoccupata per l'economia
//   L02 B01    (the LEGO itself)                        →  same
//   L02 U05    he's worried about the economy → è preoccupato per l'economia  (no "preoccupata")
//              →  my mother is worried about the economy → mia madre è preoccupata per l'economia  (mia madre: S0181L01)
//   L02 C04    worried → preoccupata   INSERTED; components renumbered worried·about·the·economy, positions 0–3,
//              builds 4–6, uses 7–12 (UNIQUE(course,seed,lego_index,position) and position>=0 force the shift).
//
// COURSE-WIDE SWEEP (Kai's second ruling): every phrase, LEGO and seed carrying preoccupato/a/i/e
// must have DI before a verb (infinitive) and PER before a noun. The tool classifies every such
// row and prints the list; a row breaking the rule aborts the run so it can be added here. As of
// this writing the only two breakers were fixed by the first pass (S0343L01U03, S0351L02U05).
//
// AUDIO — Azure only: Italian on Elsa/Benigno through the guarded door (voiceBound), existing
// clips linked first. English goes through the temporary-Sonia fill (SCOPE=course). Presentation
// stays empty (already on the audio-pass request). Never Cartesia, nothing deleted.
//
//   node tools/course-optimization/ita-seed-343-fuller-cut-2026-09-28.cjs           # dry run
//   APPLY=1 node tools/course-optimization/ita-seed-343-fuller-cut-2026-09-28.cjs   # write + render Italian

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'ita_for_eng', SEED = 343;
const SWEEP = 'ita-seed-343-fuller-cut-2026-09-28';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const RULING = 'Kai, 2026-09-28 (job #529, second ruling): the fuller cut — "worried about the economy → preoccupata per l\'economia"; course-wide, preoccupat* takes DI + infinitive and PER + noun';
const ELSA = { voiceId: 'azure_it-IT-ElsaNeural', voiceName: 'it-IT-ElsaNeural' };
const BENIGNO = { voiceId: 'azure_it-IT-BenignoNeural', voiceName: 'it-IT-BenignoNeural' };
const AZURE_VOICE_IDS = { target1: ['azure_it-IT-ElsaNeural', 'it-IT-ElsaNeural'], target2: ['azure_it-IT-BenignoNeural', 'it-IT-BenignoNeural'] };

const SEED_TEXT = { known: "who said that she's worried about the economy", target: "che ha detto che è preoccupata per l'economia" };
const OLD_L02 = { known: 'about the economy', target: "per l'economia" };
const NEW_L02 = { known: 'worried about the economy', target: "preoccupata per l'economia",
  components: [{ known: 'worried', target: 'preoccupata' }, { known: 'about', target: 'per' }, { known: 'the', target: "l'" }, { known: 'economy', target: 'economia' }] };
const CHANGES = [
  { id: 'S0343L02B01', before: { known: 'about the economy', target: "per l'economia" }, after: { known: NEW_L02.known, target: NEW_L02.target } },
  { id: 'S0343L02U05', before: { known: "he's worried about the economy", target: "è preoccupato per l'economia" }, after: { known: 'my mother is worried about the economy', target: "mia madre è preoccupata per l'economia" } },
];
const INSERT = { id: 'S0343L02C04', known: 'worried', target: 'preoccupata' };
/** Final (lego_index 2) positions: components in array order, then builds, then uses. */
const POSITIONS = { S0343L02C04: 0, S0343L02C03: 1, S0343L02C01: 2, S0343L02C02: 3, S0343L02B01: 4, S0343L02B02: 5, S0343L02B03: 6, S0343L02U01: 7, S0343L02U02: 8, S0343L02U03: 9, S0343L02U04: 10, S0343L02U05: 11, S0343L02U06: 12 };
const COMPONENT_INDEX = { S0343L02C04: 0, S0343L02C03: 1, S0343L02C01: 2, S0343L02C02: 3 };

// ── Rules ───────────────────────────────────────────────────────────────────────────────
const norm = (s) => String(s || '').toLowerCase().replace(/[.,!?;:"]+/g, ' ').replace(/’/g, "'").replace(/\s+/g, ' ').trim();
const squash = (s) => norm(s).replace(/\s+/g, '');
const contains = (hay, needle) => ` ${norm(hay)} `.includes(` ${norm(needle)} `);
/** The seed carries both LEGOs and the prior piece; L02 ends the seed. Overlap on "preoccupata" is the design. */
const legosCoverSeed = () => contains(SEED_TEXT.target, 'è preoccupata') && norm(SEED_TEXT.target).endsWith(norm(NEW_L02.target)) && norm(SEED_TEXT.known).endsWith(norm(NEW_L02.known)) && norm(SEED_TEXT.target).startsWith('che ha detto che');
const componentsTileLego = (l) => squash(l.components.map(c => c.target).join(' ')) === squash(l.target) && squash(l.components.map(c => c.known).join(' ')) === squash(l.known);
const phraseContainsLego = (p) => contains(p.target, NEW_L02.target) && contains(p.known, NEW_L02.known);
/** preoccupat* + DI must be followed by an infinitive; preoccupat* + PER must NOT be. */
const INF = /^[a-zà-ù'’]+(are|ere|ire|arsi|ersi|irsi|rre|rsi)$/i;
function classifyPreoccupato(target) {
  const m = norm(target).match(/\bpreoccupat[oaie]\s+(di|per|che)\s+([^\s]+)/);
  if (!m) return { kind: 'bare', ok: true };
  const [, prep, next] = m;
  if (prep === 'che') return { kind: 'che + clause', ok: true };
  const inf = INF.test(next.replace(/^(l'|un'|d')/, '')) && !/^(l'|un'|d')/.test(next);
  if (prep === 'di') return { kind: inf ? 'DI + infinitive' : `DI + "${next}" (not an infinitive)`, ok: inf };
  return { kind: inf ? `PER + "${next}" (infinitive)` : 'PER + noun', ok: !inf };
}

// ── Live ────────────────────────────────────────────────────────────────────────────────
async function guardLive(pg) {
  const problems = [];
  const { rows: [l2] } = await pg.query('SELECT known_text, target_text FROM course_legos WHERE course_code=$1 AND seed_number=$2 AND lego_index=2', [COURSE, SEED]);
  if (!l2 || l2.known_text !== OLD_L02.known || l2.target_text !== OLD_L02.target) problems.push(`L02 reads "${l2?.known_text}" → "${l2?.target_text}" (expected the first pass applied)`);
  for (const c of CHANGES) {
    const { rows: [r] } = await pg.query('SELECT known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND id=$2', [COURSE, `${COURSE}:${c.id}`]);
    if (!r || r.known_text !== c.before.known || r.target_text !== c.before.target) problems.push(`${c.id} reads "${r?.known_text}" → "${r?.target_text}"`);
  }
  const { rows: l2rows } = await pg.query('SELECT id FROM course_practice_phrases WHERE course_code=$1 AND seed_number=$2 AND lego_index=2', [COURSE, SEED]);
  const have = l2rows.map(r => r.id.split(':')[1]).sort().join(','), want = Object.keys(POSITIONS).filter(k => k !== INSERT.id).sort().join(',');
  if (have !== want) problems.push(`L02 rows are ${have}`);
  const { rows: exists } = await pg.query('SELECT 1 FROM course_practice_phrases WHERE course_code=$1 AND id=$2', [COURSE, `${COURSE}:${INSERT.id}`]);
  if (exists.length) problems.push(`${INSERT.id} already exists`);
  return { problems };
}
async function l02Phrases(pg) {
  const { rows } = await pg.query('SELECT id, phrase_role, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND seed_number=$2 AND lego_index=2', [COURSE, SEED]);
  const after = Object.fromEntries(CHANGES.map(c => [`${COURSE}:${c.id}`, c.after]));
  return rows.map(r => ({ id: r.id.split(':')[1], role: r.phrase_role, known: after[r.id]?.known ?? r.known_text, target: after[r.id]?.target ?? r.target_text }));
}
async function zutAgainstCourse(pg) {
  const pairs = [{ id: 'L02', ...NEW_L02 }, ...CHANGES.map(c => ({ id: c.id, ...c.after }))];
  const clashes = [];
  for (const p of pairs) {
    const { rows } = await pg.query(
      `SELECT id, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND id<>$4 AND phrase_role<>'component' AND ((lower(trim(known_text))=lower($2) AND lower(trim(target_text))<>lower($3)) OR (lower(trim(target_text))=lower($3) AND lower(trim(known_text))<>lower($2)))
       UNION ALL SELECT lego_id, known_text, target_text FROM course_legos WHERE course_code=$1 AND lego_id<>'S0343L02' AND ((lower(trim(known_text))=lower($2) AND lower(trim(target_text))<>lower($3)) OR (lower(trim(target_text))=lower($3) AND lower(trim(known_text))<>lower($2)))`,
      [COURSE, p.known, p.target, `${COURSE}:${p.id}`]);
    for (const r of rows) clashes.push(`${p.id} "${p.known}" → "${p.target}" vs ${r.id} "${r.known_text}" → "${r.target_text}"`);
  }
  return clashes;
}
/** Every row in the course carrying preoccupato/a/i/e, classified. */
async function preoccupatoSweep(pg) {
  const { rows } = await pg.query(
    `SELECT id, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND target_text ~* 'preoccupat[oaie]'
     UNION ALL SELECT lego_id, known_text, target_text FROM course_legos WHERE course_code=$1 AND target_text ~* 'preoccupat[oaie]'
     UNION ALL SELECT 'seed '||seed_number, known_text, target_text FROM course_seeds WHERE course_code=$1 AND target_text ~* 'preoccupat[oaie]' ORDER BY 1`, [COURSE]);
  return rows.map(r => ({ ...r, ...classifyPreoccupato(r.target_text) }));
}

// ── Apply ───────────────────────────────────────────────────────────────────────────────
async function applyContent(pg, supabase, log) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const legoEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'lego-recut', scope: { seed_numbers: [SEED], lego_ids: ['S0343L02'], rows: 1 }, detail: { ruling: RULING, from: OLD_L02, to: NEW_L02 } });
  const phraseEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-edit',
    scope: { seed_numbers: [SEED], phrase_ids: [...CHANGES.map(c => `${COURSE}:${c.id}`), `${COURSE}:${INSERT.id}`], rows: CHANGES.length + 1 },
    detail: { ruling: RULING, changes: CHANGES.map(c => ({ id: `${COURSE}:${c.id}`, known_from: c.before.known, target_from: c.before.target, known_to: c.after.known, target_to: c.after.target })), inserted: [{ id: `${COURSE}:${INSERT.id}`, ...INSERT, role: 'component' }], positions: POSITIONS } });
  const seedEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'unapprove', scope: { seed_numbers: [SEED], rows: 1 }, detail: { why: 'seed 343 fuller cut; needs Kai\'s read' } });
  log.events = { legoEvent, phraseEvent, seedEvent };
  await pg.query('BEGIN');
  try {
    const r = await pg.query(`UPDATE course_legos SET known_text=$1, target_text=$2, components=$3, known_audio_id=NULL, target1_audio_id=NULL, target2_audio_id=NULL, presentation_audio_id=NULL, target1_duration_ms=NULL, target2_duration_ms=NULL, last_edit_event_id=$4, updated_at=now() WHERE course_code=$5 AND seed_number=$6 AND lego_index=2 AND known_text=$7 AND target_text=$8`,
      [NEW_L02.known, NEW_L02.target, JSON.stringify(NEW_L02.components), legoEvent, COURSE, SEED, OLD_L02.known, OLD_L02.target]);
    if (r.rowCount !== 1) throw new Error(`L02: ${r.rowCount} rows`);
    for (const c of CHANGES) {
      const u = await pg.query(`UPDATE course_practice_phrases SET known_text=$1, target_text=$2, known_audio_id = CASE WHEN $1 = known_text THEN known_audio_id ELSE NULL END, target1_audio_id = CASE WHEN $2 = target_text THEN target1_audio_id ELSE NULL END, target2_audio_id = CASE WHEN $2 = target_text THEN target2_audio_id ELSE NULL END, word_count=$3, lego_count=$4, qa_checked=NULL, decomposition=NULL, decomposition_course_version=NULL, display_tiling=NULL, display_tiling_version=NULL, last_edit_event_id=$5, updated_at=now() WHERE course_code=$6 AND id=$7 AND known_text=$8 AND target_text=$9`,
        [c.after.known, c.after.target, c.after.target.length, c.after.target.split(/\s+/).length, phraseEvent, COURSE, `${COURSE}:${c.id}`, c.before.known, c.before.target]);
      if (u.rowCount !== 1) throw new Error(`${c.id}: ${u.rowCount} rows`);
    }
    // Positions: park every L02 row at +100 first so the unique key never collides mid-shift.
    await pg.query('UPDATE course_practice_phrases SET position = position + 100 WHERE course_code=$1 AND seed_number=$2 AND lego_index=2', [COURSE, SEED]);
    await pg.query(`INSERT INTO course_practice_phrases (id, course_code, seed_number, lego_index, position, known_text, target_text, word_count, lego_count, metadata, status, phrase_role, connected_lego_ids, lego_position, lego_id, introduce, last_edit_event_id) VALUES ($1,$2,$3,2,$4,$5,$6,$7,1,$8,'draft','component','{}','middle','S0343L02',true,$9)`,
      [`${COURSE}:${INSERT.id}`, COURSE, SEED, POSITIONS[INSERT.id], INSERT.known, INSERT.target, INSERT.target.length, JSON.stringify({ buildup: 'component', component_index: 0 }), phraseEvent]);
    for (const [id, pos] of Object.entries(POSITIONS)) {
      if (id === INSERT.id) continue;
      const meta = COMPONENT_INDEX[id] !== undefined ? JSON.stringify({ component_index: COMPONENT_INDEX[id] }) : '{}';
      const m = await pg.query('UPDATE course_practice_phrases SET position=$1, metadata = metadata || $2::jsonb, last_edit_event_id=$3, updated_at=now() WHERE course_code=$4 AND id=$5', [pos, meta, phraseEvent, COURSE, `${COURSE}:${id}`]);
      if (m.rowCount !== 1) throw new Error(`${id} position: ${m.rowCount} rows`);
    }
    const s = await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number=$3', [seedEvent, COURSE, SEED]);
    if (s.rowCount !== 1) throw new Error('seed unapprove');
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
  await refreshNow();
}

// ── Audio (Italian) ─────────────────────────────────────────────────────────────────────
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
  const ids = [...CHANGES.map(c => `${COURSE}:${c.id}`), `${COURSE}:${INSERT.id}`];
  const { rows } = await pg.query(`SELECT 'course_legos' AS tbl, lego_id AS id, target_text, target1_audio_id, target2_audio_id FROM course_legos WHERE course_code=$1 AND seed_number=$2 AND lego_index=2 UNION ALL SELECT 'course_practice_phrases', id, target_text, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($3) ORDER BY 2`, [COURSE, SEED, ids]);
  const slots = [];
  for (const r of rows) for (const role of ['target1', 'target2']) if (!r[`${role}_audio_id`]) slots.push({ tbl: r.tbl, id: r.id, role, text: r.target_text });
  const link = async (slot, audioId) => (await pg.query(`UPDATE ${slot.tbl} SET ${slot.role}_audio_id=$1 WHERE course_code=$2 AND ${slot.tbl === 'course_legos' ? 'lego_id' : 'id'}=$3 AND target_text=$4 AND ${slot.role}_audio_id IS NULL`, [audioId, COURSE, slot.id, slot.text])).rowCount === 1;
  for (const slot of slots) {
    const entry = { ...slot }; log.audio.push(entry);
    const { rows: have } = await pg.query(`SELECT id, voice_id, course_code FROM course_audio WHERE language='ita' AND text_normalized=normalize_text($1) AND s3_key IS NOT NULL AND voice_id = ANY($2) ORDER BY (course_code=$3) DESC, (role=$4) DESC, created_at DESC LIMIT 1`, [slot.text, AZURE_VOICE_IDS[slot.role], COURSE, slot.role]);
    if (have[0]) { entry.result = `linked existing ${have[0].voice_id} clip ${have[0].id}`; entry.linked = await link(slot, have[0].id); continue; }
    const voice = slot.role === 'target1' ? ELSA : BENIGNO;
    try {
      const renderAndMaster = async () => {
        const out = await ttsService.generateWithRetry(slot.text, 'azure', { door: { courseCode: COURSE, intro: false, language: 'ita', voiceBound: true }, subscriptionKey: process.env.AZURE_SPEECH_KEY, region: process.env.AZURE_SPEECH_REGION || 'westeurope', voiceName: voice.voiceName, speed: 1 });
        if (out.existingClip && !AZURE_VOICE_IDS[slot.role].includes(out.existingClip.voice_id)) throw new Error(`door offered ${out.existingClip.voice_id}; Azure only`);
        const { buffer, durationMs } = await phase8.masterAudio(out.audioBuffer, slot.text, await voiceConfigService.masteringOptsFor(voice.voiceName, 'azure'));
        return { buffer, durationMs, wordBoundaries: out.wordBoundaries };
      };
      const gated = await veracity.renderChecked({ render: renderAndMaster, expectedText: slot.text, language: 'ita', sampler: veracity.ALWAYS_SAMPLER, logger, meta: { courseCode: COURSE, role: slot.role, voiceId: voice.voiceName, phrase_id: slot.id, originalText: slot.text } });
      if (!gated.published) throw new Error(`veracity gate: quarantined after ${gated.attempts} attempts (${gated.verdict?.reason})`);
      const newAudioId = uuidv4().toUpperCase(), newS3Key = `mastered/${newAudioId}.mp3`;
      await s3.send(new PutObjectCommand({ Bucket: phase8.S3_BUCKET, Key: newS3Key, Body: gated.buffer, ContentType: 'audio/mpeg', CacheControl: 'public, max-age=31536000, immutable' }));
      const verdictColumns = veracity.verdictColumns(gated.verdict, { checker: SWEEP, attempts: gated.attempts });
      const textNormalized = normalizeForAudio(slot.text);
      const base = { course_code: COURSE, text: slot.text, text_normalized: textNormalized, language: 'ita', role: slot.role, voice_id: voice.voiceId, origin: 'tts' };
      const out = await writeOrSwapClip({ supabase, identity: { course_code: COURSE, text_normalized: textNormalized, language: 'ita', role: slot.role, voice_id: voice.voiceId }, insertRow: { ...base, s3_key: newS3Key, duration_ms: gated.durationMs, word_boundaries: gated.wordBoundaries || null, ...verdictColumns }, swapPatch: { voice_id: voice.voiceId, origin: 'tts', word_boundaries: gated.wordBoundaries || null, text: slot.text, ...verdictColumns }, newS3Key, durationMs: gated.durationMs, source: SWEEP, acceptedBy: `${SWEEP} (${slot.role}, ${voice.voiceName})`, reason: RULING, logger });
      entry.result = `rendered ${voice.voiceName} clip ${out.audioId} (${gated.durationMs} ms)`;
      const { rows: [now] } = await pg.query(`SELECT ${slot.role}_audio_id AS id FROM ${slot.tbl} WHERE course_code=$1 AND ${slot.tbl === 'course_legos' ? 'lego_id' : 'id'}=$2`, [COURSE, slot.id]);
      entry.linked = now?.id ? (now.id === out.audioId || await link(slot, out.audioId)) : await link(slot, out.audioId);
    } catch (e) { entry.result = `REFUSED/FAILED: ${e.message}`; }
  }
}

async function main() {
  const APPLY = process.env.APPLY === '1';
  const { Client } = require('pg');
  const { createClient } = require('@supabase/supabase-js');
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const log = { sweep: SWEEP, ruling: RULING, apply: APPLY, started: new Date().toISOString(), problems: [], zut: [], preoccupato: [], audio: [] };
  console.log(`\n══ ${COURSE} seed ${SEED} fuller cut — ${APPLY ? 'APPLY' : 'DRY RUN'} ══`);
  if (!legosCoverSeed()) log.problems.push('L02 does not end the seed / L01 not in the seed');
  if (!componentsTileLego(NEW_L02)) log.problems.push('L02 components do not tile the LEGO');
  const live = await guardLive(pg); log.problems.push(...live.problems);
  if (!live.problems.length) {
    for (const p of await l02Phrases(pg)) if (p.role !== 'component' && !phraseContainsLego(p)) log.problems.push(`${p.id} "${p.known}" → "${p.target}" does not contain the new L02 on both sides`);
    log.zut = await zutAgainstCourse(pg); log.problems.push(...log.zut);
    log.preoccupato = await preoccupatoSweep(pg);
    console.log(`preoccupat* sweep: ${log.preoccupato.length} rows`);
    for (const r of log.preoccupato) console.log(`  ${r.ok ? 'ok ' : 'BAD'} ${r.id.padEnd(26)} ${r.kind.padEnd(18)} "${r.known_text}" → "${r.target_text}"`);
    log.problems.push(...log.preoccupato.filter(r => !r.ok).map(r => `preoccupat* rule broken: ${r.id}`));
  }
  console.log(log.problems.length ? 'PROBLEMS:\n  ' + log.problems.join('\n  ') : 'rules hold: L02 ends the seed, components tile it, every L02 phrase contains it, no ZUT clash, preoccupat* sweep clean');
  console.log(`  L02  "${NEW_L02.known}" → "${NEW_L02.target}"`);
  for (const c of CHANGES) console.log(`  ${c.id}  "${c.after.known}" → "${c.after.target}"`);
  console.log(`  ${INSERT.id} INSERT  "${INSERT.known}" → "${INSERT.target}"`);
  if (APPLY && !log.problems.length) {
    await applyContent(pg, supabase, log); console.log(`APPLIED. events=${JSON.stringify(log.events)}; course_round_index refreshed`);
    await fillAudio(pg, supabase, log);
    console.log('AUDIO (Italian):'); for (const a of log.audio) console.log(`  ${a.id} ${a.role} "${a.text}": ${a.result}${a.linked ? ' → linked' : ''}`);
  }
  const f = evidencePath(`tools/course-optimization/${SWEEP}/${APPLY ? 'applied' : 'dryrun'}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(f, JSON.stringify(log, null, 2)); console.log(`Wrote ${f}`);
  await pg.end(); process.exit(log.problems.length ? 2 : 0);
}
module.exports = { NEW_L02, OLD_L02, CHANGES, INSERT, POSITIONS, classifyPreoccupato, componentsTileLego, legosCoverSeed, phraseContainsLego };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
