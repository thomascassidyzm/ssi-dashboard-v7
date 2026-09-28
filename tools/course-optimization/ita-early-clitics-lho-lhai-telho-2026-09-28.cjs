#!/usr/bin/env node
'use strict';
// tools/course-optimization/ita-early-clitics-lho-lhai-telho-2026-09-28.cjs
//
// ita_for_eng — P27 applied to the three clitic+avere forms job #626·I listed for Kai, which he approved
// (job #650·I, 2026-09-28): *l'ho*, *l'hai*, *te l'ho*.
//
// WHAT THE LIVE COURSE SAYS (read 2026-09-28 23:20Z, nothing assumed):
//   * l'ho    — first seed SENTENCE carrying it is 309 ("no, non l'ho mai vista prima"), and 309's own LEGO
//               S0309L02 "I've seen her | l'ho vista" (components "I've | l'ho" + "seen her | vista") already
//               carries the clitic. So the grow-the-verb-LEGO step of Kai's approach is ALREADY DONE at 309:
//               no LEGO grows, no later LEGO becomes a duplicate. What is left is P27's other half — the
//               ten phrases that use l'ho at seeds 130, 178, 195 and 244, before 309 teaches it.
//   * l'hai   — in NO seed sentence and in NO LEGO. One phrase, S0196L01B03 "have you heard it? | l'hai sentito?".
//   * te l'ho — in NO seed sentence and in NO LEGO. One phrase, S0244L01U02 "I've already told you | te l'ho già detto".
//               For these two there is no seed whose LEGO could grow (L26: a LEGO carries only its seed's words),
//               so P27's "a token no LEGO carries at all is a finding everywhere it appears" is the rule that
//               applies: the phrase is rewritten from taught words. After this pass the course teaches NEITHER
//               form anywhere — that is reported to Kai as a fact about the seed set (S15), not fixed here.
//
// WHAT THIS TOOL DOES: the 12 phrases are REWRITTEN (none deleted, no LEGO touched — #626·I's l'avrei shape):
// the clitic object is replaced by an object the learner already has at that seed — quello (8), tutto (14),
// qualcosa (4), i soldi / il libro (195 / 161), il tuo amico (83) — each phrase still containing its LEGO on both
// sides (P17), no new vocabulary on either side, no new English that the course already maps to a different
// Italian (ZUT). The one "told you" row keeps its sense with the unbound pronoun the course has used since
// seed 128 ("ti ho detto …"): te l'ho → ti ho … tutto.
//
// RAILS: is_new untouched; every changed row contains its LEGO (Italian contiguous, English contiguous); no new
// vocabulary (per word, ≤ seed, over phrases+LEGOs+seeds); ZUT; seeds 130/178/195/196/244 unapproved; Italian
// slots re-linked to an existing Elsa/Benigno clip by exact text or rendered (A7: text changed → new bytes);
// English prompt slots left NULL and printed for ita-sonia-temporary-fill (SCOPE=ids); an audio-pass request
// queued; strict intro-mirror runs at exit via recordContentEdit (no LEGO changed, so it must stay 0 MISMATCH).
// Sibling jobs own 151/159/152/153/376 and 204/257/207/350/518/644 — none of those seeds is written here.
//
//   node tools/course-optimization/ita-early-clitics-lho-lhai-telho-2026-09-28.cjs            # dry run
//   APPLY=1 node tools/course-optimization/ita-early-clitics-lho-lhai-telho-2026-09-28.cjs    # apply + Italian audio
//   FILL=1 node tools/course-optimization/ita-early-clitics-lho-lhai-telho-2026-09-28.cjs     # after apply: retry silent Italian slots only

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'ita_for_eng';
const SWEEP = 'ita-early-clitics-lho-lhai-telho-2026-09-28';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const JOB = '#650·I';
const RULING = "Kai, 2026-09-28 (job #650·I, approving #626·I's list under P27): l'ho is taught at S0309L02 and used at 130/178/195/244 before it; l'hai and te l'ho are in no LEGO. Every use before the teaching seed is rewritten from taught words (12 phrases, none deleted, no LEGO touched); each still contains its LEGO; seeds unapproved";
const ELSA = { voiceId: 'azure_it-IT-ElsaNeural', voiceName: 'it-IT-ElsaNeural' };
const BENIGNO = { voiceId: 'azure_it-IT-BenignoNeural', voiceName: 'it-IT-BenignoNeural' };
const AZURE_VOICE_IDS = { target1: ['azure_it-IT-ElsaNeural', 'it-IT-ElsaNeural'], target2: ['azure_it-IT-BenignoNeural', 'it-IT-BenignoNeural'] };

// ── Rules (pure; the test exercises these) ─────────────────────────────────────────────
const norm = (s) => String(s || '').toLowerCase().replace(/’/g, "'").replace(/[.,!?;:"«»]+/g, ' ').replace(/\s+/g, ' ').trim();
const words = (s) => norm(s).split(' ').filter(Boolean);
const containsChunk = (hay, needle) => (' ' + norm(hay) + ' ').includes(' ' + norm(needle) + ' ');
/** The clitic+avere tokens (l'ho, l'hai, te l'ho, me l'ha …) a target text carries — the same regex as #626·I's tool. */
const CLITIC_AVERE = /(?:^|\s)((?:gliel|me l|te l|ce l|ve l|se l|l)'(?:ho|hai|ha|abbiamo|avete|hanno|avevo|avevi|aveva|avevamo|avevate|avevano|avrò|avrai|avrà|avremo|avrete|avranno|avrei|avresti|avrebbe|avremmo|avreste|avrebbero|abbia|abbiate|abbiano|avessi|avesse|avessimo|aveste|avessero))(?=\s|$)/g;
function cliticTokens(target) { const out = []; const t = String(target || '').toLowerCase().replace(/’/g, "'"); let m; CLITIC_AVERE.lastIndex = 0; while ((m = CLITIC_AVERE.exec(t))) out.push(m[1]); return out; }
/** P27: a bound form is used only at or after the seed whose LEGO teaches it. rows [{id, seed, target}]; taughtAt Map token → first LEGO seed. */
function usedBeforeTaught(rows, taughtAt) {
  const out = [];
  for (const r of rows) for (const tok of cliticTokens(r.target)) {
    const first = taughtAt.get(tok);
    if (first === undefined || r.seed < first) out.push({ id: r.id, seed: r.seed, token: tok, taughtAt: first ?? null });
  }
  return out;
}
/** The three forms this job owns; every other early token the sweep finds is listed, never edited. */
const FORMS = ["l'ho", "l'hai", "te l'ho"];

// ── The plan ───────────────────────────────────────────────────────────────────────────
const SEEDS = {
  130: { known: "that was a surrpise, because he's my friend", target: 'È stata una sorpresa, perché è un mio amico' },
  178: { known: "I didn't have time, although I wanted to see you", target: 'non avevo tempo, anche se volevo vederti' },
  195: { known: "I'm trying to find the money I left on the table", target: 'sto provando a trovare i soldi che ho lasciato sul tavolo' },
  196: { known: 'have you heard the latest idea?', target: "hai sentito l'ultima idea?" },
  244: { known: "I've learnt a lot already", target: 'ho già imparato molto' },
};
/** The LEGOs the changed rows sit under — read from the live course and guarded; NOT edited. */
const LEGOS = {
  S0130L02: { id: 'S0130L02', known: "he's my friend", target: 'è un mio amico' },
  S0178L02: { id: 'S0178L02', known: 'although', target: 'anche se' },
  S0195L02: { id: 'S0195L02', known: 'left', target: 'lasciato' },
  S0195L03: { id: 'S0195L03', known: 'on the table', target: 'sul tavolo' },
  S0196L01: { id: 'S0196L01', known: 'have you heard', target: 'hai sentito' },
  S0244L01: { id: 'S0244L01', known: 'already', target: 'già' },
};
const CHANGES = [
  // ── l'ho before 309 ──
  { id: 'S0130L02U05', lego: 'S0130L02', role: 'use', before: { known: "I did it because he's my friend", target: "l'ho fatto perché è un mio amico" }, after: { known: "I did that because he's my friend", target: 'ho fatto quello perché è un mio amico' } },
  { id: 'S0178L02U02', lego: 'S0178L02', role: 'use', before: { known: "I did it although I didn't want to", target: "l'ho fatto anche se non volevo" }, after: { known: "I did that although I didn't want to", target: 'ho fatto quello anche se non volevo' } },
  { id: 'S0195L02B02', lego: 'S0195L02', role: 'build', before: { known: 'I left it', target: "l'ho lasciato" }, after: { known: 'I left everything', target: 'ho lasciato tutto' } },
  { id: 'S0195L02U01', lego: 'S0195L02', role: 'use', before: { known: 'I left it at home', target: "l'ho lasciato a casa" }, after: { known: 'I left everything at home', target: 'ho lasciato tutto a casa' } },
  { id: 'S0195L02U02', lego: 'S0195L02', role: 'use', before: { known: 'I left it here yesterday', target: "l'ho lasciato qui ieri" }, after: { known: 'I left the money here yesterday', target: 'ho lasciato i soldi qui ieri' } },
  { id: 'S0195L02U04', lego: 'S0195L02', role: 'use', before: { known: "I don't know where I left it", target: "non so dove l'ho lasciato" }, after: { known: "I don't know where I left the money", target: 'non so dove ho lasciato i soldi' } },
  { id: 'S0195L02U07', lego: 'S0195L02', role: 'use', before: { known: "I'm trying to remember where I left it", target: "sto provando a ricordare dove l'ho lasciato" }, after: { known: "I'm trying to remember where I left the book", target: 'sto provando a ricordare dove ho lasciato il libro' } },
  { id: 'S0195L03U01', lego: 'S0195L03', role: 'use', before: { known: 'I left it on the table', target: "l'ho lasciato sul tavolo" }, after: { known: 'I left everything on the table', target: 'ho lasciato tutto sul tavolo' } },
  { id: 'S0244L01B03', lego: 'S0244L01', role: 'build', before: { known: "I've already done it", target: "l'ho già fatto" }, after: { known: "I've already done everything", target: 'ho già fatto tutto' } },
  { id: 'S0244L01U06', lego: 'S0244L01', role: 'use', before: { known: "I've already met him before", target: "l'ho già incontrato prima" }, after: { known: "I've already met your friend", target: 'ho già incontrato il tuo amico' } },
  // ── l'hai (no LEGO anywhere) ──
  { id: 'S0196L01B03', lego: 'S0196L01', role: 'build', before: { known: 'have you heard it?', target: "l'hai sentito?" }, after: { known: 'have you heard something?', target: 'hai sentito qualcosa?' } },
  // ── te l'ho (no LEGO anywhere) ──
  { id: 'S0244L01U02', lego: 'S0244L01', role: 'use', before: { known: "I've already told you", target: "te l'ho già detto" }, after: { known: "I've already told you everything", target: 'ti ho già detto tutto' } },
];
for (const c of CHANGES) { c.knownChanged = norm(c.before.known) !== norm(c.after.known); c.targetChanged = norm(c.before.target) !== norm(c.after.target); }
const SEED_NUMBERS = [130, 178, 195, 196, 244];
const SIBLING_SEEDS = [151, 159, 152, 153, 376, 204, 257, 207, 350, 518, 644];
const seedOf = (id) => Number(id.slice(1, 5));

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
  if (SEED_NUMBERS.some(n => SIBLING_SEEDS.includes(n))) problems.push('a planned seed belongs to a sibling job');
  log.seedApprovedBefore = {};
  for (const n of SEED_NUMBERS) {
    const { rows: [s] } = await pg.query('SELECT known_text, target_text, approved_at FROM course_seeds WHERE course_code=$1 AND seed_number=$2', [COURSE, n]);
    if (!s || s.known_text !== SEEDS[n].known || s.target_text !== SEEDS[n].target) problems.push(`seed ${n} reads "${s?.known_text}" → "${s?.target_text}"`);
    log.seedApprovedBefore[n] = s?.approved_at || null;
  }
  const { rows: legos } = await pg.query('SELECT lego_id, is_new, known_text, target_text FROM course_legos WHERE course_code=$1 AND lego_id = ANY($2)', [COURSE, Object.keys(LEGOS)]);
  for (const l of Object.values(LEGOS)) { const r = legos.find(x => x.lego_id === l.id); if (!r || norm(r.known_text) !== norm(l.known) || norm(r.target_text) !== norm(l.target)) problems.push(`${l.id} reads "${r?.known_text}" → "${r?.target_text}"`); }
  const { rows: byIdRows } = await pg.query(`SELECT split_part(id,':',2) id, phrase_role, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2)`, [COURSE, CHANGES.map(c => `${COURSE}:${c.id}`)]);
  const byId = Object.fromEntries(byIdRows.map(r => [r.id, r]));
  for (const c of CHANGES) { const r = byId[c.id]; if (!r || r.known_text !== c.before.known || r.target_text !== c.before.target || r.phrase_role !== c.role) problems.push(`${c.id} reads "${r?.known_text}" → "${r?.target_text}" (${r?.phrase_role}) — expected "${c.before.known}" → "${c.before.target}"`); }
  const { rows: ev } = await pg.query(`SELECT id, surface, operation, occurred_at FROM content_edit_events WHERE course_code=$1 AND occurred_at > now() - interval '6 hours' AND surface NOT LIKE '%' || $2 || '%' AND (scope->'seed_numbers' ?| $3::text[] OR scope->'lego_ids' ?| $4::text[])`,
    [COURSE, SWEEP, SEED_NUMBERS.map(String), Object.keys(LEGOS)]);
  for (const e of ev) problems.push(`another surface touched one of these seeds in the last 6 h: ${e.surface} ${e.operation} (${e.id}, ${e.occurred_at.toISOString()}) — re-read before writing`);
}
async function guards(pg, problems, log) {
  // P17: every changed row contains its LEGO on both sides
  for (const c of CHANGES) {
    const l = LEGOS[c.lego];
    if (!containsChunk(c.after.target, l.target)) problems.push(`${c.id} "${c.after.target}" does not contain ${c.lego} "${l.target}"`);
    if (!containsChunk(c.after.known, l.known)) problems.push(`${c.id} "${c.after.known}" does not contain ${c.lego} "${l.known}"`);
    if (cliticTokens(c.after.target).length) problems.push(`${c.id} still carries a clitic+avere token: ${cliticTokens(c.after.target).join(' ')}`);
  }
  // P27 sweep over the whole course, before and after this pass
  const { rows: legoTok } = await pg.query(`SELECT seed_number, target_text FROM course_legos WHERE course_code=$1`, [COURSE]);
  const taughtAt = new Map();
  for (const r of legoTok) for (const t of cliticTokens(r.target_text)) if (!taughtAt.has(t) || taughtAt.get(t) > r.seed_number) taughtAt.set(t, r.seed_number);
  const { rows: allPhr } = await pg.query(`SELECT split_part(id,':',2) id, seed_number, target_text FROM course_practice_phrases WHERE course_code=$1 AND phrase_role<>'component'`, [COURSE]);
  const afterById = Object.fromEntries(CHANGES.map(c => [c.id, c.after.target]));
  const before = usedBeforeTaught(allPhr.map(r => ({ id: r.id, seed: r.seed_number, target: r.target_text })), taughtAt);
  const after = usedBeforeTaught(allPhr.map(r => ({ id: r.id, seed: r.seed_number, target: afterById[r.id] ?? r.target_text })), taughtAt);
  log.cliticSweep = { taughtAt: Object.fromEntries(taughtAt), before, after };
  const ours = after.filter(x => FORMS.includes(x.token));
  if (ours.length) problems.push(`${FORMS.join('/')} still used before taught after this pass: ${ours.map(x => `${x.id}(${x.token})`).join(', ')}`);
  const oursBefore = before.filter(x => FORMS.includes(x.token));
  if (oursBefore.length !== CHANGES.length) problems.push(`the live course has ${oursBefore.length} early ${FORMS.join('/')} rows, the plan has ${CHANGES.length}: ${oursBefore.map(x => x.id).join(', ')}`);
  log.otherEarlyTokens = after.filter(x => !FORMS.includes(x.token));
  // no new vocabulary on either side
  log.vocab = {};
  for (const c of CHANGES) {
    const seed = seedOf(c.id);
    const nk = await newVocabulary(pg, seed, c.after.known, 'known'), nt = await newVocabulary(pg, seed, c.after.target, 'target');
    if (nk.length || nt.length) { log.vocab[c.id] = { known: nk, target: nt }; problems.push(`${c.id} introduces vocabulary not taught by ${seed}: ${[...nk, ...nt].join(', ')}`); }
  }
  // ZUT vs the course: a new known must not already map to a different target; same target under another known is listed
  const ours2 = new Set(CHANGES.map(c => c.id));
  log.zut = []; log.targetSide = [];
  for (const p of CHANGES.map(c => ({ id: c.id, ...c.after }))) {
    const { rows } = await pg.query(
      `SELECT id, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND phrase_role<>'component' AND (lower(trim(known_text))=lower(trim($2)) OR lower(trim(target_text))=lower(trim($3)))
       UNION ALL SELECT lego_id, known_text, target_text FROM course_legos WHERE course_code=$1 AND (lower(trim(known_text))=lower(trim($2)) OR lower(trim(target_text))=lower(trim($3)))`, [COURSE, p.known, p.target]);
    for (const r of rows) {
      const rid = r.id.replace(`${COURSE}:`, ''); if (ours2.has(rid)) continue;
      const sameK = norm(r.known_text) === norm(p.known), sameT = norm(r.target_text) === norm(p.target);
      if (sameK && !sameT) log.zut.push(`${p.id} "${p.known}" → "${p.target}" vs ${rid} "${r.known_text}" → "${r.target_text}"`);
      else if (sameT && !sameK) log.targetSide.push(`${p.id} "${p.known}" shares its Italian with ${rid} "${r.known_text}"`);
    }
  }
  problems.push(...log.zut);
  // within-plan: no two changed rows become the same pair in one basket
  const seen = new Map();
  for (const c of CHANGES) { const k = `${c.lego}|${norm(c.after.known)}|${norm(c.after.target)}`; if (seen.has(k)) problems.push(`${c.id} duplicates ${seen.get(k)} in the same basket`); seen.set(k, c.id); }
}

// ── Apply ───────────────────────────────────────────────────────────────────────────────
async function applyContent(pg, supabase, log) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const phraseEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-edit', scope: { seed_numbers: SEED_NUMBERS, phrase_ids: CHANGES.map(c => `${COURSE}:${c.id}`), rows: CHANGES.length },
    detail: { ruling: RULING, job: JOB, changes: CHANGES.map(c => ({ id: `${COURSE}:${c.id}`, role: c.role, known_from: c.before.known, target_from: c.before.target, known_to: c.after.known, target_to: c.after.target })) } });
  const unapproveEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'unapprove', scope: { seed_numbers: SEED_NUMBERS, rows: SEED_NUMBERS.length }, detail: { why: "phrases rewritten under P27 (l'ho / l'hai / te l'ho before their teaching seed); need Kai's read", job: JOB, approved_at_before: log.seedApprovedBefore } });
  log.events = { phraseEvent, unapproveEvent };
  await pg.query('BEGIN');
  try {
    for (const c of CHANGES) {
      const u = await pg.query(`UPDATE course_practice_phrases SET known_text=$1, target_text=$2, word_count=$3, lego_count=$4,
          known_audio_id=CASE WHEN $5 THEN NULL ELSE known_audio_id END, target1_audio_id=CASE WHEN $6 THEN NULL ELSE target1_audio_id END, target2_audio_id=CASE WHEN $6 THEN NULL ELSE target2_audio_id END,
          qa_checked=NULL, decomposition=NULL, decomposition_course_version=NULL, display_tiling=NULL, display_tiling_version=NULL, last_edit_event_id=$7, updated_at=now()
        WHERE course_code=$8 AND id=$9 AND known_text=$10 AND target_text=$11`,
        [c.after.known, c.after.target, c.after.target.length, c.after.target.split(/\s+/).length, c.knownChanged, c.targetChanged, phraseEvent, COURSE, `${COURSE}:${c.id}`, c.before.known, c.before.target]);
      if (u.rowCount !== 1) throw new Error(`${c.id}: ${u.rowCount} rows (row moved under us — re-read and re-plan)`);
    }
    const un = await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number = ANY($3)', [unapproveEvent, COURSE, SEED_NUMBERS]);
    if (un.rowCount !== SEED_NUMBERS.length) throw new Error('seed unapprove');
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
  await refreshNow();
  const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs');
  log.audioPass = await queueAudioPass(supabase, { courseCode: COURSE, requestedBy: `@${SWEEP}`, reason: `job ${JOB}: 12 early l'ho / l'hai / te l'ho phrases rewritten (P27); Italian on Elsa/Benigno by the tool, English prompts on temporary Sonia`, metadata: { job: JOB, seeds: SEED_NUMBERS, rows: CHANGES.length } });
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
/** Italian: every NULL target slot on the changed rows — link an existing Elsa/Benigno clip by exact text, else render. */
async function fillItalian(pg, supabase, log) {
  const ids = CHANGES.filter(c => c.targetChanged).map(c => `${COURSE}:${c.id}`);
  const { rows } = await pg.query(`SELECT id, target_text, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2) ORDER BY id`, [COURSE, ids]);
  for (const r of rows) for (const role of ['target1', 'target2']) {
    if (r[`${role}_audio_id`]) continue;
    const entry = { id: r.id, role, text: r.target_text }; log.audio.push(entry);
    const voice = role === 'target1' ? ELSA : BENIGNO;
    try {
      let audioId = null;
      const { rows: have } = await pg.query(`SELECT id, voice_id FROM course_audio WHERE language='ita' AND text_normalized=normalize_text($1) AND s3_key IS NOT NULL AND s3_key NOT LIKE 'pending/%' AND voice_id = ANY($2) AND text=$1 ORDER BY (course_code=$3) DESC, (role=$4) DESC, created_at DESC LIMIT 1`, [r.target_text, AZURE_VOICE_IDS[role], COURSE, role]);
      audioId = have[0]?.id; if (audioId) entry.result = `linked existing ${have[0].voice_id} clip ${audioId}`;
      if (!audioId) { const out = await renderClip(supabase, { text: r.target_text, language: 'ita', role, voice, voiceIds: AZURE_VOICE_IDS[role] }); audioId = out.audioId; entry.result = `rendered ${voice.voiceName} clip ${audioId} (${out.durationMs} ms)`; }
      await pg.query(`UPDATE course_practice_phrases SET ${role}_audio_id=$1 WHERE course_code=$2 AND id=$3 AND target_text=$4`, [audioId, COURSE, r.id, r.target_text]);
      const { rows: [now] } = await pg.query(`SELECT a.id, a.voice_id, a.text FROM course_practice_phrases x LEFT JOIN course_audio a ON a.id=x.${role}_audio_id WHERE x.course_code=$1 AND x.id=$2`, [COURSE, r.id]);
      entry.linked = now?.id || null; entry.linkedVoice = now?.voice_id || null; entry.linkedText = now?.text || null;
      if (!now?.id || !AZURE_VOICE_IDS[role].includes(now.voice_id) || now.text !== r.target_text) entry.result += ` — SLOT NOT ON CAST VOICE / TEXT (${now?.voice_id} "${now?.text}")`;
    } catch (e) { entry.result = `REFUSED/FAILED: ${e.message}`; }
  }
}
async function silentEnglish(pg) {
  const { rows } = await pg.query(`SELECT id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2) AND known_audio_id IS NULL ORDER BY 1`, [COURSE, CHANGES.map(c => `${COURSE}:${c.id}`)]);
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
  if (process.env.FILL === '1') {
    // Post-apply retry: the rows already carry the AFTER texts; only NULL Italian slots are touched (a render that
    // hit a DB statement timeout on the first pass, for instance). No content is written.
    const { rows } = await pg.query(`SELECT split_part(id,':',2) id, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2)`, [COURSE, CHANGES.map(c => `${COURSE}:${c.id}`)]);
    for (const c of CHANGES) { const r = rows.find(x => x.id === c.id); if (!r || r.known_text !== c.after.known || r.target_text !== c.after.target) log.problems.push(`${c.id} does not carry the AFTER texts: "${r?.known_text}" → "${r?.target_text}"`); }
    if (!log.problems.length) { await fillItalian(pg, supabase, log); console.log('ITALIAN AUDIO (fill):'); for (const a of log.audio) console.log(`  ${a.id} ${a.role} "${a.text}": ${a.result}`); if (log.audio.some(a => /REFUSED|FAILED|NOT ON CAST/.test(a.result))) log.problems.push('some Italian slots were not filled'); }
    log.silentEnglish = await silentEnglish(pg); console.log(`silent English prompts: ${log.silentEnglish.length} ${log.silentEnglish.join(',')}`);
    console.log(log.problems.length ? 'PROBLEMS:\n  ' + log.problems.join('\n  ') : 'fill ok');
    const f = evidencePath(`tools/course-optimization/${SWEEP}/fill-${new Date().toISOString().replace(/[:.]/g, '-')}.json`); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(log, null, 2)); console.log(`Wrote ${f}`);
    await pg.end(); process.exit(log.problems.length ? 2 : 0);
  }
  console.log(`\n══ ${COURSE} — early l'ho / l'hai / te l'ho (P27) — ${APPLY ? 'APPLY' : 'DRY RUN'} ══`);
  await guardLive(pg, log.problems, log);
  if (!log.problems.length) await guards(pg, log.problems, log);
  console.log('\nPLAN (no LEGO changes):');
  for (const c of CHANGES) console.log(`  ${c.id.padEnd(12)} ${c.role.padEnd(5)} "${c.before.known}" → "${c.before.target}"  ⇒  "${c.after.known}" → "${c.after.target}"`);
  console.log(`  unapprove seeds ${SEED_NUMBERS.join(', ')} (approved_at before: ${JSON.stringify(log.seedApprovedBefore)})`);
  if (log.targetSide?.length) { console.log('same Italian under a different English elsewhere (listed, not a defect):'); for (const t of new Set(log.targetSide)) console.log('  ' + t); }
  if (log.cliticSweep) {
    console.log(`clitic+avere sweep — first LEGO seed per token: ${JSON.stringify(log.cliticSweep.taughtAt)}`);
    console.log(`  used before taught, BEFORE this pass: ${log.cliticSweep.before.length} rows; AFTER: ${log.cliticSweep.after.length} rows`);
    const by = {}; for (const x of log.cliticSweep.after) (by[x.token] = by[x.token] || []).push(`${x.id}@${x.seed}`);
    for (const [t, ids] of Object.entries(by)) console.log(`  ${t} (taught ${log.cliticSweep.taughtAt[t] ?? 'never'}): ${ids.join(', ')}`);
  }
  console.log(log.problems.length ? '\nPROBLEMS:\n  ' + log.problems.join('\n  ') : '\nguards hold');
  if (APPLY && !log.problems.length) {
    await applyContent(pg, supabase, log); console.log(`APPLIED. events=${JSON.stringify(log.events)} audioPass=${JSON.stringify(log.audioPass)}`);
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
module.exports = { norm, containsChunk, cliticTokens, usedBeforeTaught, FORMS, SEEDS, LEGOS, CHANGES, SEED_NUMBERS, SIBLING_SEEDS };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
