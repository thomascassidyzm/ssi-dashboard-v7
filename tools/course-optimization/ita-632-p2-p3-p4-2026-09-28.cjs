#!/usr/bin/env node
'use strict';
// tools/course-optimization/ita-632-p2-p3-p4-2026-09-28.cjs
//
// ita_for_eng — Kai's rulings of 2026-09-28 on patterns P2, P3 and P4 of the #632·I downstream audit (d/197f2605),
// applied by job #639·I.
//
//   P2 — a phrase still CONTAINS its LEGO when only non / ancora / già / solo (Italian) or an English quantifier such
//        as "many of" sits inside it. No phrase is rewritten; the tolerance is a NAMED EXCEPTION in the checking tool
//        (ita-lego-downstream-audit: `containsLegoWithInterveners`), the way L28 handles dire + clitic.
//   P3 — seed 644. S0644L01 "could you say it sir? | potrebbe dirlo, signore?" is NOT re-cut: a formal LEGO keeps
//        sir/madam (signore/signora) to show it is the formal form. In its phrases the LEGO is treated as cut
//        (could you | potrebbe) and sir/madam is ALWAYS added back at the END of every phrase, on both sides
//        (Kai: "ignore the sir and add it back in at the end always. Same with madam."). The check accepts a LEGO
//        minus its trailing sir/madam when the phrase ends in sir/madam; for S0644L01 the named core is
//        could you | potrebbe (say it | dirlo is the seed's own S0644L02). Two 644 rows lacked the closing sir and
//        get it on both sides: B01 "could you" → "could you sir?", U03 "could you speak slowly?" → "…slowly sir?".
//        Other formal LEGOs whose phrases break the rule are SCANNED and REPORTED here, never fixed (Kai's call).
//   P4 — S0350L01U06 English → "I'm sure she wanted to see what was going to happen" and S0518L04U02 → "I couldn't
//        imagine what was going to happen" (Italian unchanged: "…che cosa/quello che sarebbe successo"); Kai: more
//        consistent with the LEGO gloss (S0201L03 "what was going to happen | che cosa sarebbe successo").
//
// Audio: the text-change trigger detaches the changed side's clip. Italian (644 B01/U03) is rendered here on the
// cast voices (Elsa target1 / Benigno target2, the #621·I route; spend ledger applies); English for all four rows is
// filled afterwards on temporary Sonia: SCOPE=ids IDS=… APPLY=1 node tools/course-optimization/ita-sonia-temporary-fill-2026-09-28.cjs
// Seeds 350 and 518 are unapproved (644 already is). Seed 376 is a separate job and is not touched.
//
//   node tools/course-optimization/ita-632-p2-p3-p4-2026-09-28.cjs            # dry run + formal scan
//   APPLY=1 node tools/course-optimization/ita-632-p2-p3-p4-2026-09-28.cjs    # apply + Italian audio

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'ita_for_eng';
const SWEEP = 'ita-632-p2-p3-p4-2026-09-28';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const JOB = '#639·I';
const RULING = "Kai, 2026-09-28, on #632·I patterns P3/P4: a formal LEGO keeps sir/madam; its phrases treat it as cut and add sir/madam back at the END always (644 B01/U03 get their closing sir on both sides); 350 U06 / 518 U02 English follows the LEGO gloss 'what was going to happen'";
const ELSA = { voiceId: 'azure_it-IT-ElsaNeural', voiceName: 'it-IT-ElsaNeural' };
const BENIGNO = { voiceId: 'azure_it-IT-BenignoNeural', voiceName: 'it-IT-BenignoNeural' };
const AZURE_VOICE_IDS = { target1: ['azure_it-IT-ElsaNeural', 'it-IT-ElsaNeural'], target2: ['azure_it-IT-BenignoNeural', 'it-IT-BenignoNeural'] };

const norm = (s) => String(s || '').toLowerCase().replace(/’/g, "'").replace(/[.,!?;:"«»]+/g, ' ').replace(/\s+/g, ' ').trim();
const containsContiguous = (hay, needle) => !!needle && (' ' + norm(hay) + ' ').includes(' ' + norm(needle) + ' ');

// ── P3: the formal rule, pure ─────────────────────────────────────────────────────────────
const FORMAL_KNOWN = /\b(sir|madam)\b/i, FORMAL_TARGET = /\b(signore|signora)\b/i;
const endsFormalKnown = (s) => /\b(sir|madam)\s*[?!.]*\s*$/i.test(String(s || ''));
const endsFormalTarget = (s) => /\b(signore|signora)\s*[?!.]*\s*$/i.test(String(s || ''));
/** The LEGO as its phrases treat it: minus a trailing sir/madam (and the comma before signore/signora). */
const formalCore = (lego) => ({ known: norm(lego.known).replace(/\s*\b(sir|madam)$/, '').trim(), target: norm(lego.target).replace(/\s*\b(signore|signora)$/, '').trim() });
/** Named cores where the seed's other LEGO carries the rest of the chunk (Kai on 644: "could you | potrebbe"). */
const NAMED_CORES = { S0644L01: { known: 'could you', target: 'potrebbe' } };
const isFormalLego = (lego) => FORMAL_KNOWN.test(lego.known) || FORMAL_TARGET.test(lego.target);
/** P3 containment: the phrase holds the core AND ends in sir/madam on both sides. */
const honorific = (s) => (String(s || '').match(/\b(sir|madam)\b/i) || [])[1]?.toLowerCase() || null;
function containsFormalLego(row, lego, id) {
  const core = NAMED_CORES[id] || formalCore(lego);
  const coreOk = (!core.known || containsContiguous(row.known, core.known)) && (!core.target || containsContiguous(row.target, core.target)); // a bare sir|signore LEGO has no core
  const lk = honorific(lego.known), rk = (row.known.match(/\b(sir|madam)\s*[?!.]*\s*$/i) || [])[1]?.toLowerCase();
  return coreOk && endsFormalKnown(row.known) && endsFormalTarget(row.target) && (!lk || lk === rk);
}
/** Why a formal phrase fails, for the report. */
function formalBreak(row, lego, id) {
  const core = NAMED_CORES[id] || formalCore(lego);
  const out = [];
  if ((core.known && !containsContiguous(row.known, core.known)) || (core.target && !containsContiguous(row.target, core.target))) out.push(`lacks the core "${core.known} | ${core.target}"`);
  if (!endsFormalKnown(row.known)) out.push('English does not end in sir/madam');
  if (!endsFormalTarget(row.target)) out.push('Italian does not end in signore/signora');
  const lk = (lego.known.match(FORMAL_KNOWN) || [])[1]?.toLowerCase(), rk = (row.known.match(/\b(sir|madam)\s*[?!.]*\s*$/i) || [])[1]?.toLowerCase();
  if (lk && rk && lk !== rk) out.push(`ends in ${rk} under a ${lk} LEGO`);
  return out;
}

// ── The edits ─────────────────────────────────────────────────────────────────────────────
const EDITS = [
  { id: 'S0644L01B01', pattern: 'P3', from: { known: 'could you', target: 'potrebbe' }, to: { known: 'could you sir?', target: 'potrebbe, signore?' } },
  { id: 'S0644L01U03', pattern: 'P3', from: { known: 'could you speak slowly?', target: 'potrebbe parlare lentamente?' }, to: { known: 'could you speak slowly sir?', target: 'potrebbe parlare lentamente, signore?' } },
  { id: 'S0350L01U06', pattern: 'P4', from: { known: "I'm sure she wanted to see what would happen", target: 'sono sicuro che voleva vedere che cosa sarebbe successo' }, to: { known: "I'm sure she wanted to see what was going to happen", target: 'sono sicuro che voleva vedere che cosa sarebbe successo' } },
  { id: 'S0518L04U02', pattern: 'P4', from: { known: "I couldn't imagine what would happen", target: 'non riuscivo a immaginarmi quello che sarebbe successo' }, to: { known: "I couldn't imagine what was going to happen", target: 'non riuscivo a immaginarmi quello che sarebbe successo' } },
];
const LEGO_644 = { known: 'could you say it sir?', target: 'potrebbe dirlo, signore?' };
const SEEDS = [...new Set(EDITS.map(e => Number(e.id.slice(1, 5))))];
const HELD_SEEDS = [376];

function paperGuards(problems) {
  for (const e of EDITS) {
    if (e.pattern === 'P3' && !containsFormalLego(e.to, LEGO_644, 'S0644L01')) problems.push(`${e.id}: after the edit it still fails P3`);
    if (e.pattern === 'P3' && containsFormalLego(e.from, LEGO_644, 'S0644L01')) problems.push(`${e.id}: it already passed P3 — why edit?`);
    if (e.pattern === 'P4' && e.from.target !== e.to.target) problems.push(`${e.id}: P4 changes the Italian`);
    if (e.pattern === 'P4' && !/what was going to happen$/.test(e.to.known)) problems.push(`${e.id}: P4 English must end in the LEGO gloss`);
  }
  for (const s of SEEDS) if (HELD_SEEDS.includes(s)) problems.push(`seed ${s} is held`);
}

async function guardLive(pg, problems, log) {
  const { rows } = await pg.query(`SELECT split_part(id,':',2) id, seed_number, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE course_code=$1 AND split_part(id,':',2) = ANY($2)`, [COURSE, EDITS.map(e => e.id)]);
  log.live = Object.fromEntries(rows.map(r => [r.id, r]));
  for (const e of EDITS) { const r = log.live[e.id]; if (!r || r.known_text !== e.from.known || r.target_text !== e.from.target) problems.push(`${e.id} reads "${r?.known_text}" → "${r?.target_text}" — expected "${e.from.known}" → "${e.from.target}"`); }
  const { rows: [l644] } = await pg.query('SELECT known_text, target_text, is_new FROM course_legos WHERE course_code=$1 AND lego_id=$2', [COURSE, 'S0644L01']);
  if (!l644 || l644.known_text !== LEGO_644.known || l644.target_text !== LEGO_644.target || !l644.is_new) problems.push(`S0644L01 reads "${l644?.known_text}" → "${l644?.target_text}" is_new=${l644?.is_new}`);
  // ZUT: the new English must not already sit over a different Italian anywhere in the course.
  log.zut = [];
  for (const e of EDITS) {
    const { rows: z } = await pg.query(`SELECT id, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND phrase_role<>'component' AND lower(trim(known_text))=lower(trim($2)) AND lower(trim(target_text))<>lower(trim($3)) UNION ALL SELECT lego_id, known_text, target_text FROM course_legos WHERE course_code=$1 AND lower(trim(known_text))=lower(trim($2)) AND lower(trim(target_text))<>lower(trim($3))`, [COURSE, e.to.known, e.to.target]);
    for (const x of z) { log.zut.push(`${e.id} "${e.to.known}" → "${e.to.target}" vs ${x.id} → "${x.target_text}"`); problems.push(log.zut[log.zut.length - 1]); }
  }
  const { rows: seeds } = await pg.query('SELECT seed_number, approved_at FROM course_seeds WHERE course_code=$1 AND seed_number = ANY($2) ORDER BY 1', [COURSE, SEEDS]);
  log.seedsApprovedBefore = Object.fromEntries(seeds.map(s => [s.seed_number, s.approved_at]));
  const { rows: ev } = await pg.query(`SELECT id, surface, operation FROM content_edit_events WHERE course_code=$1 AND occurred_at > now() - interval '90 minutes' AND surface NOT LIKE '%' || $2 || '%' AND surface NOT LIKE '%ita-sonia-temporary-fill%' AND EXISTS (SELECT 1 FROM jsonb_array_elements(scope->'seed_numbers') e WHERE (e#>>'{}')::int = ANY($3))`, [COURSE, SWEEP, SEEDS]);
  for (const e of ev) problems.push(`another surface touched these seeds in the last 90 min: ${e.surface} ${e.operation} (${e.id})`);
}

/** The course-wide formal scan (report only): every phrase under a sir/madam LEGO that breaks P3. */
async function formalScan(pg) {
  const { rows: legos } = await pg.query(`SELECT lego_id, known_text, target_text, is_new FROM course_legos WHERE course_code=$1 AND (lower(known_text) ~ '\\m(sir|madam)\\M' OR lower(target_text) ~ '\\m(signore|signora)\\M') ORDER BY lego_id`, [COURSE]);
  const out = [];
  for (const l of legos) {
    const lego = { known: l.known_text, target: l.target_text };
    const { rows } = await pg.query(`SELECT split_part(id,':',2) id, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND seed_number=$2 AND lego_index=$3 AND phrase_role<>'component' ORDER BY position`, [COURSE, Number(l.lego_id.slice(1, 5)), Number(l.lego_id.slice(6, 8))]);
    for (const r of rows) {
      const row = { known: r.known_text, target: r.target_text };
      if (!containsFormalLego(row, lego, l.lego_id)) out.push({ lego: l.lego_id, legoKnown: l.known_text, legoTarget: l.target_text, id: r.id, known: r.known_text, target: r.target_text, why: formalBreak(row, lego, l.lego_id) });
    }
  }
  return out;
}

// ── Apply ────────────────────────────────────────────────────────────────────────────────
async function apply(pg, supabase, log) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const editEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-edit', scope: { seed_numbers: SEEDS, phrase_ids: EDITS.map(e => `${COURSE}:${e.id}`), rows: EDITS.length }, detail: { ruling: RULING, job: JOB, edits: EDITS.map(e => ({ id: `${COURSE}:${e.id}`, pattern: e.pattern, known_from: e.from.known, known_to: e.to.known, target_from: e.from.target, target_to: e.to.target })) } });
  const toUnapprove = SEEDS.filter(s => log.seedsApprovedBefore[s]);
  const unapproveEvent = toUnapprove.length ? await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'unapprove', scope: { seed_numbers: toUnapprove, rows: toUnapprove.length }, detail: { why: 'phrase text edited under Kai\'s P3/P4 rulings; needs his read', job: JOB, approved_at_before: log.seedsApprovedBefore } }) : null;
  log.events = { editEvent, unapproveEvent, unapproved: toUnapprove };
  await pg.query('BEGIN');
  try {
    for (const e of EDITS) {
      const u = await pg.query('UPDATE course_practice_phrases SET known_text=$1, target_text=$2, last_edit_event_id=$3, updated_at=now() WHERE course_code=$4 AND id=$5 AND known_text=$6 AND target_text=$7', [e.to.known, e.to.target, editEvent, COURSE, `${COURSE}:${e.id}`, e.from.known, e.from.target]);
      if (u.rowCount !== 1) throw new Error(`${e.id}: update ${u.rowCount}`);
    }
    if (toUnapprove.length) {
      const un = await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number = ANY($3)', [unapproveEvent, COURSE, toUnapprove]);
      if (un.rowCount !== toUnapprove.length) throw new Error('seed unapprove');
    }
    await pg.query('COMMIT');
  } catch (err) { await pg.query('ROLLBACK'); throw err; }
  const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
  await refreshNow();
  const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs');
  log.audioPass = await queueAudioPass(supabase, { courseCode: COURSE, requestedBy: `@${SWEEP}`, reason: `job ${JOB}: P3 644 B01/U03 closing sir (both sides), P4 350 U06 / 518 U02 English → 'what was going to happen'; Italian rendered by the tool, English on temporary Sonia`, metadata: { job: JOB, seeds: SEEDS, rows: EDITS.length } });
}

// ── Italian audio (the #621·I route) ─────────────────────────────────────────────────────
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
async function fillItalian(pg, supabase, log) {
  const ids = EDITS.filter(e => e.from.target !== e.to.target).map(e => `${COURSE}:${e.id}`);
  log.audio = [];
  const { rows } = await pg.query(`SELECT id, target_text, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2) ORDER BY id`, [COURSE, ids]);
  for (const r of rows) for (const role of ['target1', 'target2']) {
    const entry = { id: r.id, role, text: r.target_text }; log.audio.push(entry);
    const { rows: [cur] } = await pg.query(`SELECT a.id, a.voice_id, a.text FROM course_practice_phrases x LEFT JOIN course_audio a ON a.id=x.${role}_audio_id WHERE x.course_code=$1 AND x.id=$2`, [COURSE, r.id]);
    if (cur?.id && AZURE_VOICE_IDS[role].includes(cur.voice_id) && norm(cur.text) === norm(r.target_text)) { entry.result = `already linked to a cast clip ${cur.id} (trigger re-link)`; continue; }
    const voice = role === 'target1' ? ELSA : BENIGNO;
    try {
      const { rows: have } = await pg.query(`SELECT id, voice_id FROM course_audio WHERE language='ita' AND text_normalized=normalize_text($1) AND s3_key IS NOT NULL AND s3_key NOT LIKE 'pending/%' AND voice_id = ANY($2) ORDER BY (course_code=$3) DESC, (role=$4) DESC, created_at DESC LIMIT 1`, [r.target_text, AZURE_VOICE_IDS[role], COURSE, role]);
      let audioId = have[0]?.id;
      if (audioId) entry.result = `linked existing ${have[0].voice_id} clip ${audioId}`;
      else { const out = await renderClip(supabase, { text: r.target_text, role, voice, voiceIds: AZURE_VOICE_IDS[role] }); audioId = out.audioId; entry.result = `rendered ${voice.voiceName} clip ${audioId} (${out.durationMs} ms)`; }
      await pg.query(`UPDATE course_practice_phrases SET ${role}_audio_id=$1 WHERE course_code=$2 AND id=$3 AND target_text=$4`, [audioId, COURSE, r.id, r.target_text]);
      const { rows: [now] } = await pg.query(`SELECT a.id, a.voice_id FROM course_practice_phrases x LEFT JOIN course_audio a ON a.id=x.${role}_audio_id WHERE x.course_code=$1 AND x.id=$2`, [COURSE, r.id]);
      entry.linked = now?.id || null; entry.linkedVoice = now?.voice_id || null;
      if (!now?.id || !AZURE_VOICE_IDS[role].includes(now.voice_id)) entry.result += ` — SLOT NOT ON CAST VOICE (${now?.voice_id})`;
    } catch (e) { entry.result = `REFUSED/FAILED: ${e.message}`; }
  }
}

async function main() {
  const { Client } = require('pg');
  const { createClient } = require('@supabase/supabase-js');
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY);
  const log = { job: JOB, sweep: SWEEP, at: new Date().toISOString(), apply: process.env.APPLY === '1' };
  const problems = [];
  paperGuards(problems);
  await guardLive(pg, problems, log);
  log.formalScan = await formalScan(pg);
  console.log(`${SWEEP} — ${log.apply ? 'APPLY' : 'DRY RUN'}`);
  for (const e of EDITS) console.log(`  ${e.pattern} ${e.id}: "${e.from.known}" | "${e.from.target}"  →  "${e.to.known}" | "${e.to.target}"`);
  console.log(`  seeds to unapprove: ${SEEDS.filter(s => log.seedsApprovedBefore[s]).join(',') || 'none'}`);
  const ours = new Set(EDITS.map(e => e.id));
  console.log(`\nFORMAL SCAN (report only, P3): ${log.formalScan.length} phrase(s) under sir/madam LEGOs break the rule${log.formalScan.length ? ':' : ''}`);
  for (const f of log.formalScan) console.log(`  ${ours.has(f.id) ? '[fixed here] ' : ''}${f.id} under ${f.lego} "${f.legoKnown} | ${f.legoTarget}": "${f.known}" | "${f.target}" — ${f.why.join('; ')}`);
  if (problems.length) { console.log('\nPROBLEMS:\n  ' + problems.join('\n  ')); await pg.end(); process.exit(1); }
  console.log('\nguards hold: live text matches, 644 rows fail P3 before and pass after, P4 Italian unchanged, no ZUT clash, no held seed');
  if (log.apply) {
    await apply(pg, supabase, log);
    await fillItalian(pg, supabase, log);
    console.log(`\nAPPLIED. events ${JSON.stringify(log.events)}; audio pass ${JSON.stringify(log.audioPass)}`);
    for (const a of log.audio) console.log(`  ${a.id} ${a.role}: ${a.result}`);
    console.log(`ENGLISH prompts to fill on temporary Sonia:\n  SCOPE=ids IDS=${EDITS.map(e => `${COURSE}:${e.id}`).join(',')} APPLY=1 node tools/course-optimization/ita-sonia-temporary-fill-2026-09-28.cjs`);
  }
  const out = evidencePath(`tools/course-optimization/${SWEEP}.${log.apply ? 'applied' : 'dry'}.json`);
  fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, JSON.stringify(log, null, 2));
  console.log(`evidence: ${out}`);
  await pg.end();
}
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
module.exports = { EDITS, LEGO_644, NAMED_CORES, containsFormalLego, formalBreak, formalCore, isFormalLego, endsFormalKnown, endsFormalTarget, paperGuards };
