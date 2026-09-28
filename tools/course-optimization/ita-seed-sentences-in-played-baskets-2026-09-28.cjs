#!/usr/bin/env node
'use strict';
// tools/course-optimization/ita-seed-sentences-in-played-baskets-2026-09-28.cjs
//
// ita_for_eng — EVERY SEED SENTENCE SITS IN A PLAYED BASKET (Kai, 2026-09-28 22:52Z, job #635·I).
//
// THE FACT (verified in the learning app, packages/player-vue/src/providers/generateLearningScript.ts, 2026-09-28):
//   • Rounds are built only for is_new LEGOs (~1316) and every production review pool (legoState, ~1494) is filled
//     inside that loop — a phrase is PRODUCED by the learner only if it sits under a NEW LEGO (canon P25).
//   • The seed sentence itself is HEARD by two other routes, neither of which is production and neither of which
//     reaches every seed: (a) the seed-phase spaced-rep sandwich (offset ≥144, ~1543) — target→known→target→target,
//     only for seeds with a new LEGO, only once the course is ≥144 rounds past that LEGO, capped at 12 reviews a
//     round; (b) the Layer-1 listening cups (composables/useLayer1Scheduler.ts) — "introduced" is computed over ALL
//     LEGOs (new or not), but cup fill stops at the first 600 introduced seeds and needs the seed's target1 clip.
//   So a seed sentence that is not a phrase under a NEW LEGO is never SAID by the learner, and for 11 seeds with no
//   new LEGO, the last ~68 seeds (past the 600-seed cup cap) and the last ~86 seeds' new LEGOs (inside the final
//   144 rounds) it may never be heard either.
//
// WHAT THIS DOES: for every seed whose exact sentence (known + target, normalised) is not already a non-component
// phrase under a NEW LEGO anywhere in the course, add it as a USE row under the most suitable NEW LEGO it contains:
//   1. the seed's own LAST new LEGO whose pair the sentence contains (word multiset, the live gate's rule);
//   2. else the NEAREST EARLIER new LEGO anywhere whose pair the sentence contains and at whose seed every word of
//      the sentence is already taught (as #621·I did with S0201L03 for seed 348);
//   3. else the EARLIEST LATER new LEGO whose pair it contains (vocabulary is taught by then by construction).
//   A seed with no such LEGO is LISTED, never silently skipped. No new vocabulary is involved — it is the seed.
// Audio is REUSED: the seed's own clips are linked where they are on the cast voice (Elsa target1, Benigno target2,
// known = whatever the seed carries, today temporary Sonia, which the live re-voice list already covers — A23);
// a slot whose seed clip is on the wrong voice or missing is looked up by text on the cast voice, else rendered
// (Italian only; a silent English slot is handed to ita-sonia-temporary-fill SCOPE=ids). Seeds are NOT unapproved:
// adding the seed's own sentence is not a word change (Kai's brief). ZUT: a row whose English already stands over a
// different Italian in the course is NOT added and is listed (P16 — a USE phrase must satisfy ZUT course-wide).
//
//   node tools/course-optimization/ita-seed-sentences-in-played-baskets-2026-09-28.cjs             # dry run
//   PROBE=10 APPLY=1 node …                                                                         # first 10 rows only
//   APPLY=1 node …                                                                                  # all
//   SKIP=131,360,614,152 (default) — seeds sibling jobs are editing; listed, never written.

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'ita_for_eng';
const SWEEP = 'ita-seed-sentences-in-played-baskets-2026-09-28';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const JOB = '#635·I';
const RULING = 'Kai, 2026-09-28 22:52Z (job #635·I): every seed sentence must be heard by learners — the player produces a phrase only under a NEW LEGO (P25), so each seed sentence not already in a played basket is added as a USE row under a new LEGO it contains (own last new LEGO, else nearest earlier, else earliest later), reusing the seed\'s clips; seeds not unapproved (not a word change)';
const ELSA = { voiceId: 'azure_it-IT-ElsaNeural', voiceName: 'it-IT-ElsaNeural' };
const BENIGNO = { voiceId: 'azure_it-IT-BenignoNeural', voiceName: 'it-IT-BenignoNeural' };
const CAST = { target1: ['azure_it-IT-ElsaNeural', 'it-IT-ElsaNeural'], target2: ['azure_it-IT-BenignoNeural', 'it-IT-BenignoNeural'] };
const SEED_PHASE_START_OFFSET = 144; // generateLearningScript.ts
const CUP_CAP = 600;                 // useLayer1Scheduler.ts: cups × maxSeedsPerCup = 30 × 20

// ── Rules (pure; the test exercises these) ─────────────────────────────────────────────
const norm = (s) => String(s || '').toLowerCase().replace(/’/g, "'").replace(/[.,!?;:"«»]+/g, ' ').replace(/\s+/g, ' ').trim();
const words = (s) => norm(s).split(' ').filter(Boolean);
function containsWords(hay, needle) {
  const have = {}; for (const w of words(hay)) have[w] = (have[w] || 0) + 1;
  for (const w of words(needle)) { if (!have[w]) return false; have[w]--; }
  return true;
}
const pairKey = (k, t) => `${norm(k)}|${norm(t)}`;
const sentenceContainsLego = (seed, lego) => containsWords(seed.known_text, lego.known_text) && containsWords(seed.target_text, lego.target_text);
function legoPosition(known, legoKnown) {
  const k = norm(known), l = norm(legoKnown);
  if (k === l || k.startsWith(l + ' ')) return 'start';
  if (k.endsWith(' ' + l)) return 'end';
  return 'middle';
}
/** THE RULE (canon P25), as the player applies it. */
const phraseIsPlayed = (row, legosById) => Boolean(legosById[row.lego_id]?.is_new);

/**
 * Is the seed sentence already a played phrase? `phrases` = non-component rows joined to their LEGO's is_new.
 */
function seedSentenceCoverage(seed, phrases) {
  const k = pairKey(seed.known_text, seed.target_text);
  const same = phrases.filter(p => pairKey(p.known_text, p.target_text) === k);
  return { played: same.filter(p => p.is_new).map(p => p.id), dark: same.filter(p => !p.is_new).map(p => p.id) };
}

/**
 * Choose the NEW LEGO the seed sentence lands under. `legos` = the whole course's LEGOs (seed order);
 * `wordTaught(word, side)` → first seed number at which the word appears anywhere (phrase/LEGO/seed), or Infinity.
 * Returns { lego, why } or { lego: null, why }.
 */
function chooseHome(seed, legos, wordTaught) {
  const contained = legos.filter(l => l.is_new && sentenceContainsLego(seed, l));
  const own = contained.filter(l => l.seed_number === seed.seed_number).sort((a, b) => b.lego_index - a.lego_index)[0];
  if (own) return { lego: own, why: 'own last new LEGO' };
  const untaughtAt = (n) => [...new Set(words(seed.known_text))].filter(w => wordTaught(w, 'known') > n).concat([...new Set(words(seed.target_text))].filter(w => wordTaught(w, 'target') > n));
  const earlier = contained.filter(l => l.seed_number < seed.seed_number).sort((a, b) => b.seed_number - a.seed_number || b.lego_index - a.lego_index);
  const rejected = [];
  for (const l of earlier) { const u = untaughtAt(l.seed_number); if (!u.length) return { lego: l, why: `nearest earlier new LEGO (${earlier.length} candidate${earlier.length === 1 ? '' : 's'})` }; rejected.push(`${l.lego_id}: ${u.join(',')} untaught by seed ${l.seed_number}`); }
  const later = contained.filter(l => l.seed_number > seed.seed_number).sort((a, b) => a.seed_number - b.seed_number || a.lego_index - b.lego_index)[0];
  if (later) return { lego: later, why: `earliest later new LEGO${rejected.length ? ` (earlier rejected — ${rejected.join('; ')})` : ''}` };
  const ownAll = legos.filter(l => l.seed_number === seed.seed_number).map(l => `${l.lego_id}${l.is_new ? '' : ' (not new)'} "${l.known_text} | ${l.target_text}"`);
  return { lego: null, why: `no NEW LEGO in the course whose pair the sentence contains; the seed's LEGOs: ${ownAll.join('; ')}${rejected.length ? `; earlier candidates rejected — ${rejected.join('; ')}` : ''}` };
}
/** Next free use id + position under a LEGO, given that LEGO's existing rows. */
function nextUseSlot(lego, rows) {
  const ids = rows.map(r => r.id.replace(/^.*:/, ''));
  let maxU = 0; for (const id of ids) { const m = id.match(/U(\d+)$/); if (m) maxU = Math.max(maxU, +m[1]); }
  const maxPos = rows.reduce((m, r) => Math.max(m, r.position || 0), 0);
  return { id: `S${String(lego.seed_number).padStart(4, '0')}L${String(lego.lego_index).padStart(2, '0')}U${String(maxU + 1).padStart(2, '0')}`, position: maxPos + 1 };
}
/** The other routes the player has for a seed sentence — reported, never relied on. */
function otherRoutes(seed, legos) {
  let round = 0, ord = 0; const lastNewRound = {}, lastOrd = {};
  for (const l of legos) { ord++; lastOrd[l.seed_number] = ord; if (l.is_new) { round++; lastNewRound[l.seed_number] = round; } }
  const introIdx = Object.entries(lastOrd).sort((a, b) => a[1] - b[1] || +a[0] - +b[0]).findIndex(([s]) => +s === seed.seed_number) + 1;
  return {
    seedPhase: Boolean(seed.target1_audio_id) && lastNewRound[seed.seed_number] !== undefined && lastNewRound[seed.seed_number] + SEED_PHASE_START_OFFSET <= round,
    cup: Boolean(seed.target1_audio_id) && introIdx > 0 && introIdx <= CUP_CAP && lastOrd[seed.seed_number] <= round,
  };
}

// ── Live ────────────────────────────────────────────────────────────────────────────────
async function load(pg) {
  const { rows: seeds } = await pg.query('SELECT seed_number, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id, approved_at FROM course_seeds WHERE course_code=$1 ORDER BY seed_number', [COURSE]);
  const { rows: legos } = await pg.query('SELECT lego_id, seed_number, lego_index, is_new, known_text, target_text FROM course_legos WHERE course_code=$1 ORDER BY seed_number, lego_index', [COURSE]);
  const { rows: phrases } = await pg.query(`SELECT p.id, p.seed_number, p.lego_index, p.position, p.phrase_role, p.known_text, p.target_text, l.is_new, l.lego_id FROM course_practice_phrases p JOIN course_legos l ON l.course_code=p.course_code AND l.seed_number=p.seed_number AND l.lego_index=p.lego_index WHERE p.course_code=$1`, [COURSE]);
  // first seed at which each word appears anywhere (phrase, LEGO, seed) — the vocabulary rule, in memory
  const first = { known: new Map(), target: new Map() };
  const feed = (side, seedNum, text) => { for (const w of new Set(words(text))) { const m = first[side]; if (!m.has(w) || m.get(w) > seedNum) m.set(w, seedNum); } };
  for (const s of seeds) { feed('known', s.seed_number, s.known_text); feed('target', s.seed_number, s.target_text); }
  for (const l of legos) { feed('known', l.seed_number, l.known_text); feed('target', l.seed_number, l.target_text); }
  for (const p of phrases) { feed('known', p.seed_number, p.known_text); feed('target', p.seed_number, p.target_text); }
  const wordTaught = (w, side) => first[side].has(w) ? first[side].get(w) : Infinity;
  return { seeds, legos, phrases, wordTaught };
}

function plan(db, { skip }) {
  const { seeds, legos, phrases, wordTaught } = db;
  const legosById = Object.fromEntries(legos.map(l => [l.lego_id, l]));
  const nonComp = phrases.filter(p => p.phrase_role !== 'component');
  const census = { seeds: seeds.length, noNewLego: 0, covered: 0, uncovered: 0, darkOnly: 0, seedPhaseReach: 0, cupReach: 0, noRoute: 0 };
  const rows = [], listed = [], skipped = [];
  const knownIndex = new Map(); // norm known → set of norm targets (phrases + legos), for ZUT
  for (const p of nonComp) { const k = norm(p.known_text); if (!knownIndex.has(k)) knownIndex.set(k, new Map()); knownIndex.get(k).set(norm(p.target_text), p.id.replace(/^.*:/, '')); }
  for (const l of legos) { const k = norm(l.known_text); if (!knownIndex.has(k)) knownIndex.set(k, new Map()); if (!knownIndex.get(k).has(norm(l.target_text))) knownIndex.get(k).set(norm(l.target_text), l.lego_id); }
  const perLegoRows = new Map(); for (const p of phrases) { const k = p.lego_id; if (!perLegoRows.has(k)) perLegoRows.set(k, []); perLegoRows.get(k).push(p); }
  const pending = new Map(); // lego_id → rows planned so far (for id/position sequencing)
  for (const s of seeds) {
    const hasNew = legos.some(l => l.seed_number === s.seed_number && l.is_new);
    if (!hasNew) census.noNewLego++;
    const routes = otherRoutes(s, legos);
    if (routes.seedPhase) census.seedPhaseReach++; if (routes.cup) census.cupReach++;
    const cov = seedSentenceCoverage(s, nonComp);
    if (cov.played.length) { census.covered++; continue; }
    census.uncovered++; if (cov.dark.length) census.darkOnly++; if (!routes.seedPhase && !routes.cup) census.noRoute++;
    if (skip.includes(s.seed_number)) { skipped.push({ seed: s.seed_number, known: s.known_text, target: s.target_text, why: 'sibling job editing this seed' }); continue; }
    // ZUT (P16): the English must not already stand over a different Italian anywhere
    const others = knownIndex.get(norm(s.known_text));
    const clash = others ? [...others.entries()].filter(([t]) => t !== norm(s.target_text)) : [];
    if (clash.length) { listed.push({ seed: s.seed_number, known: s.known_text, target: s.target_text, why: `ZUT: "${s.known_text}" already stands over ${clash.map(([t, id]) => `"${t}" (${id})`).join(', ')}` }); continue; }
    const home = chooseHome(s, legos, wordTaught);
    if (!home.lego) { listed.push({ seed: s.seed_number, known: s.known_text, target: s.target_text, why: home.why, dark: cov.dark }); continue; }
    const existing = [...(perLegoRows.get(home.lego.lego_id) || []), ...(pending.get(home.lego.lego_id) || [])];
    const slot = nextUseSlot(home.lego, existing);
    const row = { seed: s.seed_number, id: slot.id, position: slot.position, lego_id: home.lego.lego_id, lego_seed: home.lego.seed_number, lego_index: home.lego.lego_index, lego_known: home.lego.known_text, lego_target: home.lego.target_text, why: home.why, known: s.known_text, target: s.target_text, lego_position: legoPosition(s.known_text, home.lego.known_text), audio: { known: s.known_audio_id, target1: s.target1_audio_id, target2: s.target2_audio_id }, dark: cov.dark, routes };
    rows.push(row); if (!pending.has(home.lego.lego_id)) pending.set(home.lego.lego_id, []); pending.get(home.lego.lego_id).push({ id: `${COURSE}:${row.id}`, position: row.position });
    // the seed's own known text also joins the index so two seeds sharing an English with different Italian collide here
    if (!knownIndex.has(norm(s.known_text))) knownIndex.set(norm(s.known_text), new Map()); knownIndex.get(norm(s.known_text)).set(norm(s.target_text), row.id);
  }
  // every planned row is played and contains its LEGO — the invariant, asserted on paper
  for (const r of rows) {
    if (!phraseIsPlayed(r, legosById)) throw new Error(`${r.id} lands under a not-new LEGO`);
    if (!containsWords(r.known, r.lego_known) || !containsWords(r.target, r.lego_target)) throw new Error(`${r.id} does not contain ${r.lego_id}`);
  }
  return { census, rows, listed, skipped };
}

async function audioFor(pg, row, log) {
  // Reuse the seed's clips where they are on the cast voice; else look up by text on the cast voice; else null (render later).
  const out = { known: row.audio.known || null, target1: null, target2: null, notes: [] };
  const { rows: clips } = await pg.query('SELECT id, voice_id, s3_key FROM course_audio WHERE id = ANY($1)', [[row.audio.target1, row.audio.target2].filter(Boolean)]);
  for (const role of ['target1', 'target2']) {
    const c = clips.find(x => x.id === row.audio[role]);
    if (c && CAST[role].includes(c.voice_id) && c.s3_key && !c.s3_key.startsWith('pending/')) { out[role] = c.id; continue; }
    const { rows: have } = await pg.query(`SELECT id, voice_id FROM course_audio WHERE language='ita' AND text_normalized=normalize_text($1) AND s3_key IS NOT NULL AND s3_key NOT LIKE 'pending/%' AND voice_id = ANY($2) ORDER BY (course_code=$3) DESC, (role=$4) DESC, created_at DESC LIMIT 1`, [row.target, CAST[role], COURSE, role]);
    if (have[0]) { out[role] = have[0].id; out.notes.push(`${role}: seed clip ${c ? `on ${c.voice_id}` : 'missing'} → linked existing ${have[0].voice_id} clip`); }
    else out.notes.push(`${role}: seed clip ${c ? `on ${c.voice_id}` : 'missing'} and no cast clip by text → RENDER`);
  }
  if (!out.known) out.notes.push('known: seed has no known clip → Sonia fill');
  return out;
}

async function applyRows(pg, supabase, rows, log) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const seedsTouched = [...new Set(rows.map(r => r.lego_seed))].sort((a, b) => a - b);
  const event = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-add', scope: { seed_numbers: seedsTouched, phrase_ids: rows.map(r => `${COURSE}:${r.id}`), rows: rows.length },
    detail: { ruling: RULING, job: JOB, rows: rows.map(r => ({ id: `${COURSE}:${r.id}`, from_seed: r.seed, lego: r.lego_id, why: r.why, known: r.known, target: r.target })) } });
  log.event = event;
  for (const r of rows) r.linked = await audioFor(pg, r, log);
  await pg.query('BEGIN');
  try {
    for (const r of rows) {
      const { rows: clash } = await pg.query('SELECT 1 FROM course_practice_phrases WHERE course_code=$1 AND id=$2', [COURSE, `${COURSE}:${r.id}`]);
      if (clash.length) throw new Error(`${r.id} already exists — re-run the plan`);
      const ins = await pg.query(`INSERT INTO course_practice_phrases (id, course_code, seed_number, lego_index, position, known_text, target_text, word_count, lego_count, metadata, status, phrase_role, connected_lego_ids, lego_position, lego_id, introduce, known_audio_id, target1_audio_id, target2_audio_id, last_edit_event_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'draft','use','{}',$11,$12,true,$13,$14,$15,$16)`,
        [`${COURSE}:${r.id}`, COURSE, r.lego_seed, r.lego_index, r.position, r.known, r.target, r.target.length, r.target.split(/\s+/).length, JSON.stringify({ format: 'build_use', source: SWEEP, job: JOB, seed_sentence_of: r.seed, why: r.why }), r.lego_position, r.lego_id, r.linked.known, r.linked.target1, r.linked.target2, event]);
      if (ins.rowCount !== 1) throw new Error(`${r.id}: insert ${ins.rowCount}`);
    }
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
  await refreshNow();
  const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs');
  log.audioPass = await queueAudioPass(supabase, { courseCode: COURSE, requestedBy: `@${SWEEP}`, reason: `job ${JOB}: ${rows.length} seed sentences added as USE rows under new LEGOs; seed clips linked, Italian gaps rendered by the tool, English gaps on temporary Sonia`, metadata: { job: JOB, rows: rows.length } });
}

// ── Audio render (the #579·I/#580·I/#621·I route, unchanged) ────────────────────────────
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
async function fillItalian(pg, supabase, rows, log) {
  const ids = rows.map(r => `${COURSE}:${r.id}`);
  const { rows: silent } = await pg.query(`SELECT id, target_text, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2) AND (target1_audio_id IS NULL OR target2_audio_id IS NULL) ORDER BY seed_number, position`, [COURSE, ids]);
  for (const r of silent) for (const role of ['target1', 'target2']) {
    if (r[`${role}_audio_id`]) continue;
    const entry = { id: r.id, role, text: r.target_text }; log.audio.push(entry);
    const voice = role === 'target1' ? ELSA : BENIGNO;
    try {
      const out = await renderClip(supabase, { text: r.target_text, role, voice, voiceIds: CAST[role] }); entry.result = `rendered ${voice.voiceName} clip ${out.audioId} (${out.durationMs} ms)`;
      const u = await pg.query(`UPDATE course_practice_phrases SET ${role}_audio_id=$1 WHERE course_code=$2 AND id=$3 AND target_text=$4 AND ${role}_audio_id IS NULL`, [out.audioId, COURSE, r.id, r.target_text]);
      const { rows: [now] } = await pg.query(`SELECT a.id, a.voice_id FROM course_practice_phrases x LEFT JOIN course_audio a ON a.id=x.${role}_audio_id WHERE x.course_code=$1 AND x.id=$2`, [COURSE, r.id]);
      if (u.rowCount !== 1 && now?.id === out.audioId) entry.result += ' — linked by the audio_autolink trigger';
      entry.linked = now?.id || null; entry.linkedVoice = now?.voice_id || null;
      if (!now?.id || !CAST[role].includes(now.voice_id)) entry.result += ` — SLOT NOT ON CAST VOICE (${now?.voice_id})`;
    } catch (e) { entry.result = `REFUSED/FAILED: ${e.message}`; }
  }
}

async function verifyLive(pg, rows) {
  const { rows: live } = await pg.query(`SELECT split_part(p.id,':',2) id, p.known_text, p.target_text, p.phrase_role, p.position, l.is_new, l.known_text lk, l.target_text lt, p.known_audio_id, p.target1_audio_id, p.target2_audio_id FROM course_practice_phrases p JOIN course_legos l ON l.course_code=p.course_code AND l.seed_number=p.seed_number AND l.lego_index=p.lego_index WHERE p.course_code=$1 AND p.id = ANY($2)`, [COURSE, rows.map(r => `${COURSE}:${r.id}`)]);
  const problems = [];
  for (const r of rows) {
    const x = live.find(y => y.id === r.id);
    if (!x) { problems.push(`${r.id} NOT LIVE`); continue; }
    if (x.known_text !== r.known || x.target_text !== r.target) problems.push(`${r.id} text differs live`);
    if (!x.is_new) problems.push(`${r.id} under a not-new LEGO live`);
    if (x.phrase_role !== 'use') problems.push(`${r.id} role ${x.phrase_role}`);
    if (!containsWords(x.known_text, x.lk) || !containsWords(x.target_text, x.lt)) problems.push(`${r.id} does not contain its LEGO live`);
    r.live = { known_audio: x.known_audio_id, target1_audio: x.target1_audio_id, target2_audio: x.target2_audio_id, position: x.position };
  }
  return problems;
}

async function main() {
  const APPLY = process.env.APPLY === '1';
  const PROBE = process.env.PROBE ? parseInt(process.env.PROBE, 10) : 0;
  const skip = (process.env.SKIP ?? '131,360,614,152').split(',').filter(Boolean).map(Number);
  const { Client } = require('pg');
  const { createClient } = require('@supabase/supabase-js');
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const log = { sweep: SWEEP, ruling: RULING, job: JOB, apply: APPLY, probe: PROBE, skip, started: new Date().toISOString(), problems: [], audio: [] };
  console.log(`\n══ ${COURSE} — every seed sentence in a played basket — ${APPLY ? (PROBE ? `PROBE ${PROBE}` : 'APPLY') : 'DRY RUN'} ══`);
  const db = await load(pg);
  const p = plan(db, { skip });
  Object.assign(log, { census: p.census, listed: p.listed, skipped: p.skipped, planned: p.rows.length });
  console.log('CENSUS', JSON.stringify(p.census));
  const byWhy = {}; for (const r of p.rows) { const k = r.why.replace(/ \(.*$/, ''); byWhy[k] = (byWhy[k] || 0) + 1; }
  console.log(`PLAN: ${p.rows.length} rows — ${JSON.stringify(byWhy)}; listed (no row): ${p.listed.length}; skipped (siblings): ${p.skipped.map(s => s.seed).join(',') || 'none'}`);
  for (const r of p.rows) console.log(`  seed ${String(r.seed).padStart(3)} → ${r.id.padEnd(12)} pos ${String(r.position).padStart(2)} [${r.lego_id} "${r.lego_known} | ${r.lego_target}"] ${r.why.replace(/ \(.*$/, '')}  "${r.known}" → "${r.target}"`);
  console.log('LISTED for Kai (no row written):'); for (const l of p.listed) console.log(`  seed ${l.seed} "${l.known}" → "${l.target}": ${l.why}`);
  console.log('SKIPPED (sibling jobs):'); for (const s of p.skipped) console.log(`  seed ${s.seed} "${s.known}" → "${s.target}"`);
  let rows = p.rows; if (PROBE) rows = rows.slice(0, PROBE);
  log.rows = rows;
  if (APPLY && rows.length) {
    await applyRows(pg, supabase, rows, log); console.log(`APPLIED ${rows.length} rows, event ${log.event}`);
    for (const r of rows) if (r.linked.notes.length) console.log(`  ${r.id}: ${r.linked.notes.join('; ')}`);
    await fillItalian(pg, supabase, rows, log);
    if (log.audio.length) { console.log('ITALIAN RENDERS:'); for (const a of log.audio) console.log(`  ${a.id} ${a.role} "${a.text}": ${a.result}`); }
    const silentEnglish = rows.filter(r => !r.linked.known).map(r => `${COURSE}:${r.id}`);
    if (silentEnglish.length) console.log(`ENGLISH prompts to fill on temporary Sonia (${silentEnglish.length}):\n  SCOPE=ids IDS=${silentEnglish.join(',')} APPLY=1 node tools/course-optimization/ita-sonia-temporary-fill-2026-09-28.cjs`);
    log.problems.push(...await verifyLive(pg, rows));
    if (log.audio.some(a => /REFUSED|FAILED|NOT ON CAST/.test(a.result))) log.problems.push('some Italian slots were not filled — see audio');
    const silent = rows.filter(r => r.live && (!r.live.known_audio || !r.live.target1_audio || !r.live.target2_audio));
    console.log(`LIVE: ${rows.length - log.problems.filter(x => /NOT LIVE/.test(x)).length}/${rows.length} rows verified; silent slots after fill: ${silent.length ? silent.map(r => r.id).join(',') : 'none'}`);
  }
  console.log(log.problems.length ? '\nPROBLEMS:\n  ' + log.problems.join('\n  ') : '\nno problems');
  const f = evidencePath(`tools/course-optimization/${SWEEP}/${APPLY ? (PROBE ? 'probe' : 'applied') : 'dryrun'}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(log, null, 2)); console.log(`Wrote ${f}`);
  await pg.end(); process.exit(log.problems.length ? 2 : 0);
}
module.exports = { norm, containsWords, pairKey, sentenceContainsLego, legoPosition, phraseIsPlayed, seedSentenceCoverage, chooseHome, nextUseSlot, otherRoutes, plan, SEED_PHASE_START_OFFSET, CUP_CAP };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
