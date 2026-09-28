#!/usr/bin/env node
'use strict';
// tools/course-optimization/ita-390-391-the-one-2026-09-28.cjs
//
// ita_for_eng — KAI'S APPROVAL (2026-09-28 22:54Z, job #636·I): seeds 390 and 391 tile without overlap.
//
// Job #622·I grew S0390L02 to "who is standing | che sta in piedi" and S0391L01 to "who is walking |
// che sta camminando" (K28's other half). That left S0390L01 "the one who | quella che" sharing
// "who | che" with L02, so seed 390 no longer tiled (the one who + who is standing + near the
// entrance). Kai's ruling: trim the overlapping LEGO to "the one | quella".
//
//   S0390L01  the one who | quella che   →  the one | quella     (re-textured in place, never deleted; is_new stays TRUE)
//             components []  (one-word LEGO: the course convention, e.g. S0382L02 "where | dove"); the two
//             component rows C01 "the one | quella" / C02 "who | che" no longer describe the LEGO and go
//             (component rows are phrase rows and are never played: components_never_introduced trigger)
//   S0390L01B01  the one who | quella che  →  the one | quella   (B01 is the LEGO itself)
//
// Seed 390 then tiles: quella + che sta in piedi + vicino all'ingresso. Seed 391 ("quella che sta
// camminando verso l'autobus") has NO "the one" LEGO of its own — its "quella" is the piece 390 just
// taught (L30: a taught piece gets no LEGO), and its LEGOs are L01 "who is walking" + L02 "towards the
// bus". So 391's cut stands. What did NOT agree was gender: 391's own phrases said "QUELLO che sta
// camminando" while the seed says "QUELLA che" and 390 has just taught "the one | quella" — the same
// English ("the one who is walking towards the bus", S0391L02U01) under two Italians, one of them
// the seed sentence. The ten rows move to "quella" so both seeds say one thing (Italian side only;
// English and its clip untouched).
//
// "the one | quella" was never a LEGO before 390 (checked: no earlier LEGO has known "the one" or
// target "quella" bare), so L17 does not apply and the LEGO stays NEW — its basket plays (P25).
// Every build/use row under it already contains "the one | quella" on both sides (Kai's total rule);
// nothing is re-written there. KNOCK-ON: no row after 391 carries "the one who" or "quella/quello che"
// as "the one who" (every later "quello che" is "what", S0409L02 onward) — checked by `knockOn`, listed
// if ever found.
//
// AFTER THE EDIT: seeds 390 and 391 unapproved (a re-cut needs Kai's read); changed Italian slots are
// linked to an existing Elsa/Benigno clip or rendered on Azure Elsa/Benigno through the guarded door
// (never Cartesia); the English of S0390L01 / B01 is filled on temporary Sonia by
// ita-sonia-temporary-fill (SCOPE=ids, cast restored byte for byte; Charlotte re-voice list); the
// S0390L01 intro is re-mirrored by ita-intro-mirror-fix --only-seeds 390 (a human-authored line would
// be listed, never rewritten); audio-pass request queued; round index refreshed. Every write is
// guarded by the row's live text (sibling job #635·I is adding seed sentences course-wide: a row it
// moved no longer matches and the whole transaction rolls back — nothing is half-applied).
//
//   node tools/course-optimization/ita-390-391-the-one-2026-09-28.cjs            # plan (dry run, no writes)
//   APPLY=1 node tools/course-optimization/ita-390-391-the-one-2026-09-28.cjs    # write + Italian audio + intro
//   AUDIO_ONLY=1 node tools/course-optimization/ita-390-391-the-one-2026-09-28.cjs  # after apply: fill still-silent Italian slots, list English for Sonia
//   node … --report-from <applied.json> --out <file.md> [--zut-before a.json --zut-after b.json] [--sonia fill.json] [--intros file]

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'ita_for_eng';
const JOB = '#636·I';
const SWEEP = 'ita-390-391-the-one-2026-09-28';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const RULING = 'Kai, 2026-09-28 22:54Z (job #636·I): where "the one who | quella che" overlaps the grown "who is standing / walking" LEGOs, trim it to "the one | quella" so seeds 390 and 391 tile without overlap; re-texture in place, never delete; is_new stays true';
const ELSA = { voiceId: 'azure_it-IT-ElsaNeural', voiceName: 'it-IT-ElsaNeural' };
const BENIGNO = { voiceId: 'azure_it-IT-BenignoNeural', voiceName: 'it-IT-BenignoNeural' };
const AZURE_VOICE_IDS = { target1: ['azure_it-IT-ElsaNeural', 'it-IT-ElsaNeural'], target2: ['azure_it-IT-BenignoNeural', 'it-IT-BenignoNeural'] };

// ── Rules ─────────────────────────────────────────────────────────────────────────────────
const norm = (s) => String(s || '').toLowerCase().replace(/’/g, "'").replace(/[.,!?;:"«»“”]+/g, ' ').replace(/\s+/g, ' ').trim();
const words = (s) => norm(s).split(' ').filter(Boolean);
const squash = (s) => norm(s).replace(/\s+/g, '');
/** Live gate's phrase-contains-LEGO rule: word multiset. */
function containsWords(hay, needle) {
  const h = words(hay);
  for (const w of words(needle)) { const i = h.indexOf(w); if (i < 0) return false; h.splice(i, 1); }
  return true;
}
/** A phrase contains its LEGO on both sides (Kai's total rule: build AND use). */
const phraseContainsLego = (p, l) => containsWords(p.known, l.known) && containsWords(p.target, l.target);
/** The seed's LEGOs, in order, tile the seed sentence on the Italian side WITHOUT overlap (contiguous, nothing shared, nothing missing). */
const legosTileSeed = (legos, seedTarget) => squash(legos.map((l) => l.target).join(' ')) === squash(seedTarget);
/** Seed 391's pieces: "quella" (taught at 390 L01) + its own LEGOs tile the seed. */
const legosTileSeedWith = (prefix, legos, seedTarget) => legosTileSeed([{ target: prefix }, ...legos], seedTarget);

// ── The decision, quoted so it is checkable by eye ─────────────────────────────────────────
const SEEDS = {
  390: { known: 'the one who is standing near the entrance', target: "quella che sta in piedi vicino all'ingresso" },
  391: { known: 'the one who is walking towards the bus', target: "quella che sta camminando verso l'autobus" },
};
const LEGO = {
  id: 'S0390L01', seed: 390,
  from: { known: 'the one who', target: 'quella che', components: [{ known: 'the one (f)', target: 'quella' }, { known: 'who', target: 'che' }] },
  to: { known: 'the one', target: 'quella', components: [] },
  dropComponentRows: ['S0390L01C01', 'S0390L01C02'],
};
const P = (id, seed, bk, bt, ak, at, why) => ({ id, seed, before: { known: bk, target: bt }, after: { known: ak, target: at }, why });
const PHRASES = [
  P('S0390L01B01', 390, 'the one who', 'quella che', 'the one', 'quella', 'lego: B01 is the LEGO itself'),
  // seed 391 — gender: the seed says "quella che", 390 has just taught "the one | quella"; these rows said "quello"
  P('S0391L01B02', 391, 'the one who is walking', 'quello che sta camminando', 'the one who is walking', 'quella che sta camminando', 'gender: the seed and the taught LEGO say quella'),
  P('S0391L01B03', 391, 'the one who is walking over there', 'quello che sta camminando laggiù', 'the one who is walking over there', 'quella che sta camminando laggiù', 'gender: as B02'),
  P('S0391L01U01', 391, 'the one who is walking asked me', 'quello che sta camminando mi ha chiesto', 'the one who is walking asked me', 'quella che sta camminando mi ha chiesto', 'gender: as B02'),
  P('S0391L01U02', 391, 'I asked the one who is walking', 'ho chiesto a quello che sta camminando', 'I asked the one who is walking', 'ho chiesto a quella che sta camminando', 'gender: as B02'),
  P('S0391L01U03', 391, "the one who is walking didn't agree", "quello che sta camminando non era d'accordo", "the one who is walking didn't agree", "quella che sta camminando non era d'accordo", 'gender: as B02'),
  P('S0391L01U04', 391, "the one who is walking didn't ask", 'quello che sta camminando non ha chiesto', "the one who is walking didn't ask", 'quella che sta camminando non ha chiesto', 'gender: as B02'),
  P('S0391L02U01', 391, 'the one who is walking towards the bus', "quello che sta camminando verso l'autobus", 'the one who is walking towards the bus', "quella che sta camminando verso l'autobus", 'gender: this row IS the seed sentence and disagreed with it'),
  P('S0391L02U02', 391, 'I asked the one who is walking towards the bus', "ho chiesto a quello che sta camminando verso l'autobus", 'I asked the one who is walking towards the bus', "ho chiesto a quella che sta camminando verso l'autobus", 'gender: as B02'),
  P('S0391L02U03', 391, 'did you see the one who is walking towards the bus?', "hai visto quello che sta camminando verso l'autobus?", 'did you see the one who is walking towards the bus?', "hai visto quella che sta camminando verso l'autobus?", 'gender: as B02'),
  P('S0391L02U05', 391, 'the one who asked was walking towards the bus', "quello che ha chiesto stava camminando verso l'autobus", 'the one who asked was walking towards the bus', "quella che ha chiesto stava camminando verso l'autobus", 'gender: as B02 (390 L01B02 says "the one who asked | quella che ha chiesto")'),
];
/** Rows elsewhere in the course carrying "the one who" under a different Italian, or "quella/quello che" as "the one who" — LISTED, never changed. */
const KNOCK_ON = { known: 'the one who', targets: ['quella che', 'quello che'] };

// ── The plan (pure: rows in, decisions out) ────────────────────────────────────────────────
const short = (id) => String(id).replace(/^ita_for_eng:/, '');
function plan(rows) {
  const byId = {}; for (const r of rows) byId[r.id] = r;
  const problems = [];
  const live = byId[LEGO.id];
  if (!live) problems.push(`${LEGO.id}: not live`);
  else {
    if (live.known !== LEGO.from.known || live.target !== LEGO.from.target) problems.push(`${LEGO.id}: live reads "${live.known}" | "${live.target}", expected "${LEGO.from.known}" | "${LEGO.from.target}"`);
    if (live.is_new !== true) problems.push(`${LEGO.id}: is_new is ${live.is_new} — this job keeps it true and expects it true`);
    if (!containsWords(LEGO.from.known, LEGO.to.known) || !containsWords(LEGO.from.target, LEGO.to.target)) problems.push(`${LEGO.id}: the trimmed LEGO is not inside the old one`);
  }
  for (const c of PHRASES) {
    const l = byId[c.id];
    if (!l) { problems.push(`${c.id}: not live`); continue; }
    if (l.known !== c.before.known || l.target !== c.before.target) problems.push(`${c.id}: live reads "${l.known}" | "${l.target}", expected "${c.before.known}" | "${c.before.target}"`);
    if (l.kind === 'component') problems.push(`${c.id}: is a component row`);
  }
  for (const id of LEGO.dropComponentRows) if (byId[id] && byId[id].kind !== 'component') problems.push(`${id}: not a component row`);
  // "the one | quella" must not have been a LEGO earlier (else L17 would apply and P25 would need rehoming)
  const earlier = rows.filter((r) => r.kind === 'lego' && r.sn < 390 && (norm(r.known) === norm(LEGO.to.known) || norm(r.target) === norm(LEGO.to.target)));
  if (earlier.length) problems.push(`"${LEGO.to.known} | ${LEGO.to.target}" was taught earlier: ${earlier.map((r) => r.id).join(', ')} — L17/P25 decision needed, not this plan`);
  // AFTER state
  const after = rows.filter((r) => !LEGO.dropComponentRows.includes(r.id)).map((r) => {
    if (r.id === LEGO.id) return { ...r, known: LEGO.to.known, target: LEGO.to.target, components: LEGO.to.components };
    const c = PHRASES.find((x) => x.id === r.id); return c ? { ...r, known: c.after.known, target: c.after.target } : r;
  });
  const legosOf = (sn) => after.filter((r) => r.kind === 'lego' && r.sn === sn).sort((a, b) => a.id.localeCompare(b.id));
  const tiling = { 390: legosTileSeed(legosOf(390), SEEDS[390].target), 391: legosTileSeedWith(LEGO.to.target, legosOf(391), SEEDS[391].target) };
  if (!tiling[390]) problems.push(`seed 390 does not tile after the trim: ${legosOf(390).map((l) => l.target).join(' + ')} vs "${SEEDS[390].target}"`);
  if (!tiling[391]) problems.push(`seed 391 does not tile as quella + its LEGOs: ${legosOf(391).map((l) => l.target).join(' + ')} vs "${SEEDS[391].target}"`);
  // every build/use row under the trimmed LEGO contains it on both sides; no duplicate text in the basket
  const kept = [];
  const under = after.filter((r) => r.id.startsWith(LEGO.id) && r.id !== LEGO.id && (r.kind === 'build' || r.kind === 'use'));
  for (const p of under) {
    if (!phraseContainsLego(p, LEGO.to)) problems.push(`${p.id}: "${p.known}" | "${p.target}" does not contain "${LEGO.to.known}" | "${LEGO.to.target}"`);
    if (!PHRASES.some((x) => x.id === p.id)) kept.push({ id: p.id, known: p.known, target: p.target });
  }
  const seen = new Map();
  for (const p of under) { const k = norm(p.known) + '|' + norm(p.target); if (seen.has(k)) problems.push(`${p.id} duplicates ${seen.get(k)}: "${p.known}"`); seen.set(k, p.id); }
  // every changed 391 row still contains its own LEGO, and no row of 390/391 says "quello che" as "the one who" any more
  for (const c of PHRASES) { const l = byId[c.id.slice(0, 8)]; if (l && l.id !== LEGO.id && !phraseContainsLego(c.after, l)) problems.push(`${c.id}: after no longer contains its own LEGO "${l.known}" | "${l.target}"`); }
  const gender = after.filter((r) => (r.sn === 390 || r.sn === 391) && r.kind !== 'component' && /\bthe one\b/.test(norm(r.known)) && /\bquello\b/.test(norm(r.target)));
  for (const g of gender) problems.push(`${g.id}: still says quello for "the one": "${g.known}" | "${g.target}"`);
  // knock-on elsewhere: "the one who" outside 390/391, or quella/quello che glossed as "the one who" — listed
  const knockOn = [];
  for (const r of after) {
    if (r.kind === 'component' || r.sn === 390 || r.sn === 391) continue;
    // contiguous chunk, not a word multiset: "quella donna che conosci" carries both words and is not "the one who"
    const hasK = new RegExp(`\\b${KNOCK_ON.known.replace(/ /g, '\\s+')}\\b`).test(norm(r.known));
    const hasT = KNOCK_ON.targets.some((t) => new RegExp(`\\b${t.replace(/ /g, '\\s+')}\\b`).test(norm(r.target))) && !/\b(what|all|everything|than|which)\b/.test(norm(r.known));
    if (hasK || hasT) knockOn.push({ id: r.id, seed: r.sn, known: r.known, target: r.target });
  }
  return { problems, kept, knockOn, tiling, lego: LEGO, phrases: PHRASES, seeds: SEEDS };
}

// ── Live ─────────────────────────────────────────────────────────────────────────────────
async function loadRows(pg) {
  const { rows } = await pg.query(
    `SELECT 'lego' AS kind, seed_number AS sn, lego_id AS id, known_text AS known, target_text AS target, components, is_new FROM course_legos WHERE course_code=$1
     UNION ALL SELECT phrase_role, seed_number, id, known_text, target_text, NULL, NULL FROM course_practice_phrases WHERE course_code=$1 ORDER BY 2, 3`, [COURSE]);
  return rows.map((r) => ({ ...r, sn: Number(r.sn), id: short(r.id) }));
}
async function zutAgainstCourse(pg, D) {
  const ours = new Set([...D.phrases.map((c) => c.id), D.lego.id, ...D.lego.dropComponentRows]);
  const pairs = [{ id: D.lego.id, known: D.lego.to.known, target: D.lego.to.target }, ...D.phrases.map((c) => ({ id: c.id, ...c.after }))];
  const clashes = [];
  for (const p of pairs) {
    const { rows } = await pg.query(
      `SELECT id, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND phrase_role<>'component' AND id<>$4 AND ((lower(trim(known_text))=lower($2) AND lower(trim(target_text))<>lower($3)) OR (lower(trim(target_text))=lower($3) AND lower(trim(known_text))<>lower($2)))
       UNION ALL SELECT lego_id, known_text, target_text FROM course_legos WHERE course_code=$1 AND lego_id<>$5 AND ((lower(trim(known_text))=lower($2) AND lower(trim(target_text))<>lower($3)) OR (lower(trim(target_text))=lower($3) AND lower(trim(known_text))<>lower($2)))`,
      [COURSE, p.known, p.target, `${COURSE}:${p.id}`, p.id]);
    for (const r of rows.filter((r) => !ours.has(short(r.id)))) clashes.push({ change: p.id, pair: `"${p.known}" → "${p.target}"`, vs: `${short(r.id)} "${r.known_text}" → "${r.target_text}"`, k2: r.known_text.trim().toLowerCase() === p.known.toLowerCase() });
  }
  return clashes;
}

async function applyContent(pg, supabase, D, log) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const seeds = [390, 391];
  const ev = (op, scope, detail) => recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: op, scope, detail });
  const legoEvent = await ev('lego-edit', { seed_numbers: [390], lego_ids: [D.lego.id], rows: 1 }, { ruling: RULING, job: JOB, change: { id: D.lego.id, from: D.lego.from, to: D.lego.to, is_new: 'kept true', componentRowsDropped: D.lego.dropComponentRows } });
  const phraseEvent = await ev('phrase-edit', { seed_numbers: seeds, phrase_ids: D.phrases.map((c) => `${COURSE}:${c.id}`), rows: D.phrases.length }, { ruling: RULING, job: JOB, changes: D.phrases.map((c) => ({ id: `${COURSE}:${c.id}`, known_from: c.before.known, target_from: c.before.target, known_to: c.after.known, target_to: c.after.target, why: c.why })) });
  const dropEvent = await ev('phrase-delete', { seed_numbers: [390], phrase_ids: D.lego.dropComponentRows.map((id) => `${COURSE}:${id}`), rows: D.lego.dropComponentRows.length }, { why: 'component rows of a LEGO trimmed to one word; a one-word LEGO carries no components (course convention); components are never played', job: JOB });
  const unapproveEvent = await ev('unapprove', { seed_numbers: seeds, rows: seeds.length }, { why: 'S0390L01 trimmed to "the one | quella" and seed 391 phrases moved to quella under Kai\'s 2026-09-28 22:54Z approval; need his read', job: JOB });
  log.events = { legoEvent, phraseEvent, dropEvent, unapproveEvent };
  await pg.query('BEGIN');
  try {
    const l = D.lego;
    const u = await pg.query(`UPDATE course_legos SET known_text=$1, target_text=$2, components=$3, known_audio_id=NULL, target1_audio_id=NULL, target2_audio_id=NULL, target1_duration_ms=NULL, target2_duration_ms=NULL, last_edit_event_id=$4, updated_at=now() WHERE course_code=$5 AND lego_id=$6 AND known_text=$7 AND target_text=$8 AND is_new=true`,
      [l.to.known, l.to.target, JSON.stringify(l.to.components), legoEvent, COURSE, l.id, l.from.known, l.from.target]);
    if (u.rowCount !== 1) throw new Error(`${l.id}: ${u.rowCount} rows (moved under us?)`);
    const d = await pg.query(`DELETE FROM course_practice_phrases WHERE course_code=$1 AND phrase_role='component' AND id = ANY($2)`, [COURSE, l.dropComponentRows.map((id) => `${COURSE}:${id}`)]);
    if (d.rowCount !== l.dropComponentRows.length) throw new Error(`component rows: deleted ${d.rowCount}, expected ${l.dropComponentRows.length}`);
    log.droppedComponentRows = l.dropComponentRows;
    for (const c of D.phrases) {
      const knownMoved = c.before.known !== c.after.known, targetMoved = c.before.target !== c.after.target;
      const r = await pg.query(`UPDATE course_practice_phrases SET known_text=$1, target_text=$2, word_count=$3, lego_count=$4, qa_checked=NULL, decomposition=NULL, decomposition_course_version=NULL, display_tiling=NULL, display_tiling_version=NULL,
          known_audio_id = CASE WHEN $10 THEN NULL ELSE known_audio_id END, target1_audio_id = CASE WHEN $11 THEN NULL ELSE target1_audio_id END, target2_audio_id = CASE WHEN $11 THEN NULL ELSE target2_audio_id END,
          last_edit_event_id=$5, updated_at=now() WHERE course_code=$6 AND id=$7 AND known_text=$8 AND target_text=$9`,
        [c.after.known, c.after.target, c.after.target.length, c.after.target.split(/\s+/).length, phraseEvent, COURSE, `${COURSE}:${c.id}`, c.before.known, c.before.target, knownMoved, targetMoved]);
      if (r.rowCount !== 1) throw new Error(`${c.id}: ${r.rowCount} rows (moved under us?)`);
    }
    const un = await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number = ANY($3)', [unapproveEvent, COURSE, seeds]);
    log.unapproved = { seeds, rows: un.rowCount };
    const { rows: still } = await pg.query('SELECT is_new FROM course_legos WHERE course_code=$1 AND lego_id=$2', [COURSE, l.id]);
    if (!still[0] || still[0].is_new !== true) throw new Error('is_new is no longer true on the trimmed LEGO');
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
  await refreshNow();
  const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs');
  log.audioPass = await queueAudioPass(supabase, { courseCode: COURSE, requestedBy: `@${SWEEP}`, reason: `job ${JOB}: S0390L01 trimmed to "the one | quella" (Kai's approval) and ${D.phrases.length} phrases; Italian on Elsa/Benigno by the tool, English on temporary Sonia (ita-sonia-temporary-fill SCOPE=ids), intro re-mirrored`, metadata: { job: JOB, seeds, rows: D.phrases.length + 1 } });
}

// ── Italian audio: link an existing Elsa/Benigno clip, else render on Azure through the guarded door ──
async function fillItalian(pg, supabase, D, log) {
  const { rows } = await pg.query(
    `SELECT 'course_legos' AS tbl, lego_id AS id, target_text, target1_audio_id, target2_audio_id FROM course_legos WHERE course_code=$1 AND lego_id=$2
     UNION ALL SELECT 'course_practice_phrases', id, target_text, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($3)`,
    [COURSE, D.lego.id, D.phrases.map((c) => `${COURSE}:${c.id}`)]);
  const slots = [];
  for (const r of rows) for (const role of ['target1', 'target2']) if (!r[`${role}_audio_id`]) slots.push({ tbl: r.tbl, id: r.id, role, text: r.target_text });
  const idCol = (tbl) => (tbl === 'course_legos' ? 'lego_id' : 'id');
  const link = async (slot, audioId) => (await pg.query(`UPDATE ${slot.tbl} SET ${slot.role}_audio_id=$1 WHERE course_code=$2 AND ${idCol(slot.tbl)}=$3 AND target_text=$4 AND ${slot.role}_audio_id IS NULL`, [audioId, COURSE, slot.id, slot.text])).rowCount === 1;
  const current = async (slot) => (await pg.query(`SELECT ${slot.role}_audio_id AS id FROM ${slot.tbl} WHERE course_code=$1 AND ${idCol(slot.tbl)}=$2`, [COURSE, slot.id])).rows[0]?.id || null;
  log.italian = [];
  for (const slot of slots) {
    const entry = { ...slot }; log.italian.push(entry);
    const { rows: have } = await pg.query(`SELECT id, voice_id FROM course_audio WHERE language='ita' AND text_normalized=normalize_text($1) AND s3_key IS NOT NULL AND voice_id = ANY($2) ORDER BY (course_code=$3) DESC, (role=$4) DESC, created_at DESC LIMIT 1`, [slot.text, AZURE_VOICE_IDS[slot.role], COURSE, slot.role]);
    if (have[0]) {
      const already = await current(slot);
      entry.result = `linked existing ${have[0].voice_id} clip ${have[0].id}`;
      entry.linked = already ? (already === have[0].id || `slot already holds ${already}`) : await link(slot, have[0].id);
      continue;
    }
    entry.result = await renderItalian(supabase, slot, link, current);
    entry.linked = (await current(slot)) !== null;
  }
}
async function renderItalian(supabase, slot, link, current) {
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
    if (!(await current(slot))) await link(slot, out.audioId);
    return `rendered ${voice.voiceName} clip ${out.audioId} (${gated.durationMs} ms)`;
  } catch (e) { return `REFUSED/FAILED: ${e.message}`; }
}
function reMirrorIntros(log, seeds) {
  const { spawnSync } = require('child_process');
  const script = path.join(__dirname, 'ita-intro-mirror-fix-2026-09-28.cjs');
  const r = spawnSync(process.execPath, [script, '--only-seeds', seeds.join(',')], { encoding: 'utf8', env: { ...process.env, APPLY: '1', INTRO_MIRROR_AT_EXIT: '0' }, timeout: 20 * 60 * 1000 });
  log.introFix = { status: r.status, tail: String(r.stdout || '').split('\n').slice(-40).join('\n'), stderr: String(r.stderr || '').slice(-4000) };
  return r.status;
}

// ── Report (phone-readable before → after) ────────────────────────────────────────────────
function report(D, extra) {
  const L = [];
  L.push(`# ita_for_eng — seeds 390 / 391: "the one who" trimmed to "the one" (job ${JOB}, 2026-09-28)`, '');
  L.push(`**Your approval (22:54Z):** where "the one who | quella che" overlapped the grown "who is standing / who is walking" LEGOs, trim it to "the one | quella" so the LEGOs tile the seed without overlap. Re-textured in place, never deleted, **is_new stays true** ("the one | quella" was never a LEGO before 390, so L17 does not apply and its basket plays).`, '');
  L.push('## The two seeds now', '', '| Seed | Sentence | Tiles as |', '|---|---|---|');
  L.push(`| 390 | ${D.seeds[390].known} → ${D.seeds[390].target} | **the one** → quella · **who is standing** → che sta in piedi · **near the entrance** → vicino all'ingresso |`);
  L.push(`| 391 | ${D.seeds[391].known} → ${D.seeds[391].target} | *the one* → quella (taught at 390, no LEGO of its own: L30) · **who is walking** → che sta camminando · **towards the bus** → verso l'autobus |`);
  if (extra.zut) L.push('', `**ZUT (strict bidirectional, audit-phrase-zut):** ${extra.zut.before} → ${extra.zut.after}. ${extra.zut.newly.length ? 'New: ' + extra.zut.newly.join('; ') : 'None new.'} ${extra.zut.resolved.length ? 'Resolved: ' + extra.zut.resolved.join('; ') : ''}`);
  if (extra.unapproved) L.push('', `**Seeds unapproved:** ${extra.unapproved.join(', ')}.`);
  L.push('', '## The LEGO', '', '| Seed | LEGO | Before | After | Components |', '|---|---|---|---|---|');
  L.push(`| 390 | ${D.lego.id} | ${D.lego.from.known} → ${D.lego.from.target} | **${D.lego.to.known} → ${D.lego.to.target}** | none (one word); the two component rows "the one (f) → quella" and "who → che" removed |`);
  L.push('', '## Phrases changed', '', '| Seed | Row | Before | After | Why |', '|---|---|---|---|---|');
  for (const c of D.phrases) L.push(`| ${c.seed} | ${c.id} | ${c.before.known} → ${c.before.target} | **${c.after.known} → ${c.after.target}** | ${c.why} |`);
  L.push('', '## Phrases kept under "the one | quella" (already contain it)', '', '| Row | Phrase | Italian |', '|---|---|---|');
  for (const k of D.kept) L.push(`| ${k.id} | ${k.known} | ${k.target} |`);
  if (D.knockOn.length) { L.push('', '## Elsewhere in the course (listed, not changed)', '', '| Seed | Row | English | Italian |', '|---|---|---|---|'); for (const k of D.knockOn) L.push(`| ${k.seed} | ${k.id} | ${k.known} | ${k.target} |`); }
  else L.push('', '**Knock-on:** no row after 391 carries "the one who" or "quella/quello che" as "the one who" (every later "quello che" is "what"). Nothing to change.');
  if (extra.forKai && extra.forKai.length) { L.push('', '## For you', ''); for (const f of extra.forKai) L.push(`- ${f}`); }
  if (extra.italian) L.push('', '## Italian audio', '', extra.italian);
  if (extra.sonia) L.push('', '## English re-voiced on temporary Sonia — Charlotte re-voice list', '', extra.sonia);
  if (extra.intros) L.push('', '## Intro re-mirrored (temporary Sonia)', '', extra.intros);
  return L.join('\n');
}
const FOR_KAI = [
  'Seed 391 gender: its phrases said "QUELLO che sta camminando" while the seed says "QUELLA che" and 390 now teaches "the one | quella". The ten rows were moved to quella so one English has one Italian (S0391L02U01 is the seed sentence itself and disagreed with it). If you would rather 391 practise the masculine, say so and they go back — the English and its clips were not touched.',
  'The "the one | quella" basket keeps its six existing rows (the one who asked / works with you / agreed with her / didn\'t ask / wanted to travel / wanted to follow us), all of which contain the trimmed LEGO; "who | che" inside them is taught long before 390.',
];

async function main() {
  const APPLY = process.env.APPLY === '1';
  const argv = process.argv.slice(2);
  const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
  if (arg('--report-from')) {
    const applied = JSON.parse(fs.readFileSync(arg('--report-from'), 'utf8'));
    const extra = { unapproved: applied.unapproved?.seeds, forKai: FOR_KAI };
    if (arg('--zut-before') && arg('--zut-after')) {
      const b = JSON.parse(fs.readFileSync(arg('--zut-before'), 'utf8')), a = JSON.parse(fs.readFileSync(arg('--zut-after'), 'utf8'));
      const key = (g) => g.known_norm; const bk = new Set(b.bidirectionalStrict.map(key)), ak = new Set(a.bidirectionalStrict.map(key));
      const show = (g) => `"${g.known_norm}" → ${g.distinct_targets.map((t) => `"${t.example.target}" (${t.example.seed} ${t.example.phrase_role || 'lego'})`).join(' / ')}`;
      extra.zut = { before: b.counts.bidirectional.strict, after: a.counts.bidirectional.strict, newly: a.bidirectionalStrict.filter((g) => !bk.has(key(g))).map(show), resolved: b.bidirectionalStrict.filter((g) => !ak.has(key(g))).map(show) };
    }
    if (applied.italian) extra.italian = ['| Row | Slot | Italian | Result |', '|---|---|---|---|', ...applied.italian.map((x) => `| ${short(x.id)} | ${x.role} | ${x.text} | ${x.result}${x.linked === true ? ' → linked' : x.linked ? ` (${x.linked})` : ''} |`)].join('\n');
    if (arg('--sonia')) { const f = JSON.parse(fs.readFileSync(arg('--sonia'), 'utf8')); extra.sonia = ['| Row | English | Clip |', '|---|---|---|', ...(f.filled || []).map((x) => `| ${short(x.id)} | ${x.text} | ${x.result || x.audioId || ''} |`)].join('\n'); }
    if (arg('--intros')) extra.intros = fs.readFileSync(arg('--intros'), 'utf8');
    const md = report(applied.plan, extra); fs.writeFileSync(arg('--out'), md); console.log(`report → ${arg('--out')} (${md.length} chars)`); return;
  }
  const { Client } = require('pg');
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const log = { sweep: SWEEP, job: JOB, ruling: RULING, apply: APPLY, started: new Date().toISOString() };
  try {
    if (process.env.AUDIO_ONLY === '1') {
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
      const D = { lego: LEGO, phrases: PHRASES };
      await fillItalian(pg, supabase, D, log);
      console.log('ITALIAN AUDIO (audio-only pass):'); for (const a of log.italian) console.log(`  ${a.tbl}.${short(a.id)} ${a.role} "${a.text}": ${a.result}${a.linked === true ? ' → linked' : a.linked ? ` (${a.linked})` : ''}`);
      const { rows: silent } = await pg.query(`SELECT id FROM course_practice_phrases WHERE course_code=$1 AND known_audio_id IS NULL AND id = ANY($2) UNION ALL SELECT lego_id FROM course_legos WHERE course_code=$1 AND known_audio_id IS NULL AND lego_id=$3`, [COURSE, PHRASES.map((c) => `${COURSE}:${c.id}`), LEGO.id]);
      console.log(`ENGLISH still silent (${silent.length}): ${silent.length ? 'SCOPE=ids IDS=' + silent.map((r) => r.id).join(',') + ' APPLY=1 node tools/course-optimization/ita-sonia-temporary-fill-2026-09-28.cjs' : 'none'}`);
      const f = evidencePath(`tools/course-optimization/${SWEEP}/audio-only-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
      fs.writeFileSync(f, JSON.stringify(log, null, 2)); console.log(`Wrote ${f}`);
      return;
    }
    const rows = await loadRows(pg);
    const D = plan(rows);
    console.log(`\n══ ${COURSE} — seeds 390/391: trim "the one who" to "the one" — ${APPLY ? 'APPLY' : 'DRY RUN'} ══`);
    console.log(`  LEGO ${D.lego.id}  "${D.lego.from.known}" | "${D.lego.from.target}"  →  "${D.lego.to.known}" | "${D.lego.to.target}"   components []  drop rows ${D.lego.dropComponentRows.join(', ')}`);
    for (const c of D.phrases) console.log(`  ${c.id}  "${c.before.known}" | "${c.before.target}"  →  "${c.after.known}" | "${c.after.target}"   (${c.why.split(':')[0]})`);
    console.log(`tiling after: 390=${D.tiling[390]} 391=${D.tiling[391]}; kept under the trimmed LEGO: ${D.kept.length}; knock-on rows elsewhere listed: ${D.knockOn.length}`);
    for (const k of D.knockOn) console.log(`  listed ${k.id} "${k.known}" | "${k.target}"`);
    const clashes = await zutAgainstCourse(pg, D);
    console.log(`ZUT against the course: ${clashes.length ? '\n  ' + clashes.map((z) => `${z.k2 ? 'K2 HOLD' : 'two Englishes, one Italian (not a defect)'}: ${z.change} ${z.pair} vs ${z.vs}`).join('\n  ') : 'no clash'}`);
    for (const z of clashes.filter((z) => z.k2)) D.problems.push(`ZUT K2: ${z.change} ${z.pair} vs ${z.vs}`);
    log.plan = D; log.zutInTool = clashes;
    if (D.problems.length) console.log('\nPROBLEMS:\n  ' + D.problems.join('\n  ')); else console.log('\nguards hold: live text matches, is_new true, both seeds tile without overlap, every phrase under the trimmed LEGO contains it on both sides, no quello for "the one" in 390/391, no duplicate, no K2 clash');
    if (APPLY && !D.problems.length) {
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
      await applyContent(pg, supabase, D, log);
      console.log(`APPLIED. events=${JSON.stringify(log.events)} unapproved=${JSON.stringify(log.unapproved)} audioPass=${JSON.stringify(log.audioPass)}`);
      await fillItalian(pg, supabase, D, log);
      console.log('ITALIAN AUDIO:'); for (const a of log.italian) console.log(`  ${a.tbl}.${short(a.id)} ${a.role} "${a.text}": ${a.result}${a.linked === true ? ' → linked' : a.linked ? ` (${a.linked})` : ''}`);
      const st = reMirrorIntros(log, [390]);
      console.log(`intro re-mirror: exit ${st}\n${log.introFix.tail}`);
      const ids = [D.lego.id, ...D.phrases.filter((c) => c.before.known !== c.after.known).map((c) => `${COURSE}:${c.id}`)];
      log.soniaIds = ids;
      console.log(`\nENGLISH prompts to fill on temporary Sonia (${ids.length}):\n  SCOPE=ids IDS=${ids.join(',')} APPLY=1 node tools/course-optimization/ita-sonia-temporary-fill-2026-09-28.cjs`);
    }
    const f = evidencePath(`tools/course-optimization/${SWEEP}/${APPLY ? 'applied' : 'dryrun'}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(f, JSON.stringify(log, null, 2)); console.log(`Wrote ${f}`);
    if (D.problems.length) process.exitCode = 2;
  } finally { await pg.end(); }
}

module.exports = { plan, LEGO, PHRASES, SEEDS, containsWords, phraseContainsLego, legosTileSeed, legosTileSeedWith };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
