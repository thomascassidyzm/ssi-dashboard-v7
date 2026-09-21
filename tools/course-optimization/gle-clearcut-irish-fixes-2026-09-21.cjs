#!/usr/bin/env node
// tools/course-optimization/gle-clearcut-irish-fixes-2026-09-21.cjs
//
// gle_for_eng: apply the CLEAR-CUT rows of the Irish syntax repair proposal
// (Eoghan's three defect classes; proposal published by job #496 on
// 2026-09-21, applied here under Kai's ruling the same day: "I don't care
// about the audio, just fix them if it's clear-cut"). The BORDERLINE table of
// that proposal is Kai's open decision and is NOT touched here.
//
// The three classes, in Eoghan's words: (1) qualities/emotions/states go ON
// the person (tá brón orm), (2) register/lexis — séipéal for an ordinary
// church, sráidbhaile for a village, (3) calques — English shapes wearing
// Irish words (ag an gceann eile → ar an taobh eile).
//
// PROVENANCE: the replacement Irish is machine-proposed and NOT native-
// confirmed. Every line below goes to Eoghan as a proposal for confirmation.
// Two rows deviate from the proposal's literal wording so that the seed
// still tiles into its existing LEGO slots — both are marked DEVIATION below.
//
// WHAT IT WRITES (and nothing else):
//   course_seeds            15 rows: target_text, approved_at = NULL
//   course_legos             5 rows: known/target/type/components (36 L03 L04, 214 L01 L04, 272 L02)
//   course_practice_phrases 53 rows: target_text (+known_text on 23), word_count, qa_checked = NULL,
//                                    then decomposition recomputed
//   content_edit_events      3 rows (one per table), stamped on every row via last_edit_event_id
//   audio_pass_requests      the pending gle_for_eng request gets this pass APPENDED to its reason
//                            (never overwritten — the existing note carries a do-not-render warning)
// It writes NO audio and deletes NOTHING. Stale clips are listed, not touched.
//
// No lego_id, lego_index, is_new or seed_number moves, so course_round_index
// needs no refresh and learner progress (keyed by lego_id) is untouched.
//
// Dry run is the DEFAULT. APPLY=1 writes. Every live row is asserted against
// its expected before-text and the run aborts on any drift.
//
//   node tools/course-optimization/gle-clearcut-irish-fixes-2026-09-21.cjs
//   APPLY=1 node tools/course-optimization/gle-clearcut-irish-fixes-2026-09-21.cjs

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql') });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');
const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
const { decoratePhrasesWithDecomposition } = require('../../services/phrase-decomposition-writer.cjs');
const { evidencePath } = require('../../tools/lib/evidence-path.cjs');

const COURSE = 'gle_for_eng';
const APPLY = process.env.APPLY === '1';
const SWEEP = 'gle-clearcut-irish-fixes-2026-09-21';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;

// ─── (1) SEEDS: the clear-cut table, verbatim from the proposal ──────────────
// gloss = literal back-translation for Eoghan's list.
const SEEDS = [
  { n: 36,  cls: 3, before: 'Níl muid ag iarraidh an scéal a bhriseadh isteach air',
    after: 'Níl muid ag iarraidh cur isteach ar an scéal', gloss: 'we are not wanting to put in on the story' },
  { n: 126, cls: 2, before: 'Tá an obair seo ag athrú cruth mo chinn',
    after: "Tá an obair seo ag athrú cruth m'inchinne", gloss: 'this work is changing the shape of my brain (inchinn, not ceann = head)' },
  { n: 214, cls: 3, before: 'an raibh am maith agat ag an deireadh seachtaine?',
    after: 'Ar bhain tú sult as an deireadh seachtaine?', gloss: 'did you take enjoyment out of the weekend?' },
  // DEVIATION from the proposal's "Tá, is iontach an smaoineamh é sin": that copula
  // shape cannot tile into the seed's three LEGO slots (yes | that's | a great idea).
  // "Sin smaoineamh iontach" is the everyday form and keeps L03 "a great idea" intact.
  { n: 272, cls: 3, before: 'Tá, tá sé sin cosúil le smaoineamh iontach',
    after: 'Tá, sin smaoineamh iontach', gloss: "yes, that's a great idea (proposal offered: is iontach an smaoineamh é sin)" },
  { n: 379, cls: 1, before: 'chuaigh, bhí mé ádhmharach go leor taisteal go dtí an Afraic',
    after: 'chuaigh, bhí an t-ádh orm taisteal go dtí an Afraic', gloss: 'went, the luck was on me to travel to Africa' },
  { n: 427, cls: 2, before: 'níor mhaith leo go gceapfá go bhfuil siad leamh',
    after: 'níor mhaith leo go gceapfá go bhfuil leadrán orthu', gloss: "they wouldn't like that you'd think that boredom is on them" },
  { n: 485, cls: 1, before: 'Ní dhéanfadh aon rud mé níos sásta ná éalú',
    after: 'Ní chuirfeadh aon rud níos mó áthais orm ná éalú', gloss: 'nothing would put more happiness on me than escaping' },
  { n: 497, cls: 3, before: 'Tá sé sin cosúil le go gcaithfidh tú beagán codlata a fháil',
    after: 'Is cosúil go gcaithfidh tú beagán codlata a fháil', gloss: 'it is apparent that you must get a little sleep' },
  { n: 538, cls: 3, before: 'Níl mé ag iarraidh a bheith cosúil le nach bhfuil mé ag cur suim ann',
    after: 'Níl mé ag iarraidh go mbeadh cuma orm nach bhfuil suim agam ann', gloss: "I don't want that there'd be an appearance on me that I have no interest in it" },
  { n: 550, cls: 2, before: 'ceann an bhaile',
    after: 'ceann an tsráidbhaile', gloss: 'the end of the village (sráidbhaile, not baile = town/home)' },
  { n: 551, cls: 2, before: 'Tá an eaglais gránna',
    after: 'Tá an séipéal gránna', gloss: 'the church (séipéal) is ugly' },
  { n: 552, cls: 3, before: 'Tá an eaglais ag an gceann eile den bhaile gránna',
    after: 'Tá an séipéal ar an taobh eile den tsráidbhaile gránna', gloss: 'the church on the other side of the village is ugly' },
  { n: 553, cls: 2, before: 'ceapaim go bhfuil an eaglais bheag an-ghránna',
    after: 'ceapaim go bhfuil an séipéal beag an-ghránna', gloss: 'I think the small church is very ugly (séipéal is masculine, so beag is not lenited)' },
  { n: 614, cls: 3, before: 'Tá sé in aice le cá bhfuil do chlann ina gcónaí',
    after: 'Tá sé in aice leis an áit a bhfuil do chlann ina gcónaí', gloss: 'it is near the place that your family live' },
  { n: 618, cls: 3, before: 'Ní mhothaíonn sé mar am fada',
    after: 'Ní bhraitheann sé fada', gloss: 'it is not felt long' },
];

// ─── (2) LEGOS: re-decomposition of the three seeds ≤300 ────────────────────
// Slots keep their lego_id. Seed 36: L01 + L03 + L04 tile the new sentence
// exactly; L02 "the story"/"an scéal" stays as the atom L04 builds on.
const LEGOS = [
  { id: 'S0036L03', before: { known: 'to interrupt', target: 'a bhriseadh isteach' },
    after: { known: 'to interrupt', target: 'cur isteach', type: 'M',
      components: [{ known: 'putting', target: 'cur' }, { known: 'inwards', target: 'isteach' }] } },
  { id: 'S0036L04', before: { known: 'on it', target: 'air' },
    after: { known: 'on the story', target: 'ar an scéal', type: 'M',
      components: [{ known: 'on', target: 'ar' }, { known: 'the', target: 'an' }, { known: 'story', target: 'scéal' }] } },
  { id: 'S0214L01', before: { known: 'did you have a good time', target: 'an raibh am maith agat' },
    after: { known: 'did you enjoy', target: 'ar bhain tú sult as', type: 'M',
      components: [{ known: 'did', target: 'ar' }, { known: 'take', target: 'bhain' }, { known: 'you', target: 'tú' }, { known: 'enjoyment', target: 'sult' }, { known: 'out of', target: 'as' }] } },
  { id: 'S0214L04', before: { known: 'at the weekend', target: 'ag an deireadh seachtaine' },
    after: { known: 'the weekend', target: 'an deireadh seachtaine', type: 'M',
      components: [{ known: 'the', target: 'an' }, { known: 'end', target: 'deireadh' }, { known: 'week', target: 'seachtaine' }] } },
  // DEVIATION (see seed 272 above).
  { id: 'S0272L02', before: { known: 'that sounds like', target: 'tá sé sin cosúil le' },
    after: { known: "that's", target: 'sin', type: 'A', components: null } },
];

// ─── (3) PHRASES: rules over the live rows that carry the seed-36 calque ────
// Order matters: the longest old shape first.
function rewritePhrase(row) {
  let t = row.target_text;
  let k = row.known_text;
  const id = row.id;
  if (id.endsWith('S0036L03C01')) return { target: 'cur', known: 'putting' };          // component "to"/"a"
  if (id.endsWith('S0036L03C02')) return { target: 'isteach', known: 'inwards' };         // component "break into"/"bhriseadh isteach"
  if (id.endsWith('S0036L04B01')) return { target: 'ar an scéal', known: 'on the story' };
  if (/S0036L04[BU]\d\d$/.test(id)) {
    // Phrases under L04 carried the seed's object: "…to interrupt on it" / "…a bhriseadh isteach air".
    // L04 is now "on the story"/"ar an scéal", so the English follows the LEGO.
    t = t.replace(/an scéal a bhriseadh isteach air/g, 'cur isteach ar an scéal')
         .replace(/a bhriseadh isteach air/g, 'cur isteach ar an scéal')
         .replace(/a bhriseadh isteach/g, 'cur isteach');
    k = k.replace(/interrupt on it/g, 'interrupt the story');
    return { target: t, known: k };
  }
  if (/S0037L03[BU]\d\d$/.test(id)) {
    // Under S0037L03 "about it"/"air": the phrase must keep "air", and its English never
    // mentioned the story, so "cur isteach air" (interrupt him/it) is the honest form.
    t = t.replace(/an scéal a bhriseadh isteach air/g, 'cur isteach air')
         .replace(/a bhriseadh isteach air/g, 'cur isteach air');
    return { target: t, known: k };
  }
  // S0036L03 rows, S0067L03U15, S0069L05U13: the story is named in the English where it is in the Irish.
  t = t.replace(/an scéal a bhriseadh isteach air/g, 'cur isteach ar an scéal')
       .replace(/a bhriseadh isteach air/g, 'cur isteach air')
       .replace(/a bhriseadh isteach/g, 'cur isteach');
  return { target: t, known: k };
}

const PHRASE_SELECT = `
  SELECT id, seed_number, lego_index, lego_id, phrase_role, known_text, target_text, word_count, qa_checked,
         known_audio_id, target1_audio_id, target2_audio_id
    FROM course_practice_phrases
   WHERE course_code = $1
     AND (target_text ILIKE '%bhriseadh isteach%' OR id IN ($2, $3))
   ORDER BY seed_number, lego_index, phrase_role, position`;

async function main() {
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = `tools/course-optimization/gle-clearcut-2026-09-21`;
  const log = { apply: APPLY, started: new Date().toISOString(), seeds: [], legos: [], phrases: [], staleAudio: [], aborted: [] };

  // ── read + assert seeds ──
  const { rows: seedRows } = await pg.query(
    `SELECT seed_number, known_text, target_text, approved_at, target1_audio_id, target2_audio_id
       FROM course_seeds WHERE course_code=$1 AND seed_number = ANY($2) ORDER BY seed_number`,
    [COURSE, SEEDS.map(s => s.n)]);
  for (const s of SEEDS) {
    const live = seedRows.find(r => r.seed_number === s.n);
    if (!live) { log.aborted.push(`seed ${s.n} not found`); continue; }
    if (live.target_text !== s.before) { log.aborted.push(`seed ${s.n} drift: live="${live.target_text}" expected="${s.before}"`); continue; }
    log.seeds.push({ n: s.n, cls: s.cls, known: live.known_text, before: s.before, after: s.after, gloss: s.gloss,
      audio: [live.target1_audio_id, live.target2_audio_id].filter(Boolean) });
  }

  // ── read + assert legos ──
  const { rows: legoRows } = await pg.query(
    `SELECT lego_id, known_text, target_text, type, components, known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id
       FROM course_legos WHERE course_code=$1 AND lego_id = ANY($2)`, [COURSE, LEGOS.map(l => l.id)]);
  for (const l of LEGOS) {
    const live = legoRows.find(r => r.lego_id === l.id);
    if (!live) { log.aborted.push(`lego ${l.id} not found`); continue; }
    if (live.known_text !== l.before.known || live.target_text !== l.before.target) {
      log.aborted.push(`lego ${l.id} drift: live=${live.known_text}/${live.target_text}`); continue;
    }
    log.legos.push({ id: l.id, before: l.before, after: l.after,
      audio: { known: live.known_audio_id, t1: live.target1_audio_id, t2: live.target2_audio_id, presentation: live.presentation_audio_id } });
  }

  // ── read + rewrite phrases ──
  const { rows: phraseRows } = await pg.query(PHRASE_SELECT, [COURSE, `${COURSE}:S0036L03C01`, `${COURSE}:S0036L04B01`]);
  for (const row of phraseRows) {
    const { target, known } = rewritePhrase(row);
    if (target === row.target_text && known === row.known_text) { log.aborted.push(`phrase ${row.id} rule produced no change: "${row.target_text}"`); continue; }
    if (/bhriseadh/.test(target)) { log.aborted.push(`phrase ${row.id} still carries the calque after rewrite: "${target}"`); continue; }
    log.phrases.push({ id: row.id, lego_id: row.lego_id, role: row.phrase_role, knownBefore: row.known_text, knownAfter: known,
      before: row.target_text, after: target, knownChanged: known !== row.known_text, wasChecked: !!row.qa_checked,
      audio: { known: row.known_audio_id, t1: row.target1_audio_id, t2: row.target2_audio_id } });
  }

  // ── ZUT guard: no OTHER lego already owns any new known or new target ──
  for (const l of log.legos) {
    const { rows } = await pg.query(
      `SELECT lego_id, known_text, target_text FROM course_legos WHERE course_code=$1 AND lego_id<>$2
          AND (lower(known_text)=lower($3) OR lower(target_text)=lower($4))`, [COURSE, l.id, l.after.known, l.after.target]);
    for (const r of rows) {
      // Same known → different target is the ZUT breach. Same target under a different known is allowed.
      if (r.known_text.toLowerCase() === l.after.known.toLowerCase() && r.target_text.toLowerCase() !== l.after.target.toLowerCase()) {
        log.aborted.push(`ZUT: ${l.id} new known "${l.after.known}" already maps to "${r.target_text}" at ${r.lego_id}`);
      }
      l.zutNote = (l.zutNote || []).concat(`${r.lego_id} ${r.known_text}/${r.target_text}`);
    }
  }
  // Phrase-level ZUT: a changed phrase's known must not already map elsewhere to a different target.
  for (const p of log.phrases) {
    const { rows } = await pg.query(
      `SELECT id, target_text FROM course_practice_phrases WHERE course_code=$1 AND id<>$2 AND lower(trim(known_text))=lower(trim($3))
          AND lower(trim(target_text))<>lower(trim($4))`, [COURSE, p.id, p.knownAfter, p.after]);
    const unchangedOthers = rows.filter(r => !log.phrases.some(q => q.id === r.id));
    if (unchangedOthers.length) p.zutNote = unchangedOthers.map(r => `${r.id}: ${r.target_text}`);
  }

  // ── stale audio census: every clip whose text no longer matches its row, and whether any untouched row still uses it ──
  const changedPhraseIds = new Set(log.phrases.map(p => p.id));
  const clipIds = new Set();
  for (const s of log.seeds) s.audio.forEach(a => clipIds.add(a));
  for (const l of log.legos) { [l.audio.t1, l.audio.t2].forEach(a => a && clipIds.add(a)); if (l.after.known !== l.before.known) { l.audio.known && clipIds.add(l.audio.known); } l.audio.presentation && clipIds.add(l.audio.presentation); }
  for (const p of log.phrases) { [p.audio.t1, p.audio.t2].forEach(a => a && clipIds.add(a)); if (p.knownChanged && p.audio.known) clipIds.add(p.audio.known); }
  const ids = [...clipIds];
  const { rows: clips } = await pg.query(`SELECT id, role, voice_id, text, lego_id FROM course_audio WHERE id = ANY($1::uuid[])`, [ids]);
  const { rows: presClips } = await pg.query(`SELECT id, role, voice_id, text, lego_id FROM course_audio WHERE course_code=$1 AND role='presentation' AND lego_id = ANY($2)`, [COURSE, LEGOS.map(l => l.id)]);
  for (const c of presClips) if (!clipIds.has(c.id)) { clips.push(c); clipIds.add(c.id); }
  const allIds = [...clipIds];
  const { rows: otherUsers } = await pg.query(`
    SELECT a.id,
      (SELECT count(*) FROM course_practice_phrases p WHERE p.course_code=$1 AND a.id IN (p.known_audio_id,p.target1_audio_id,p.target2_audio_id) AND NOT (p.id = ANY($3))) AS other_phrases,
      (SELECT count(*) FROM course_legos l WHERE l.course_code=$1 AND (a.id IN (l.known_audio_id,l.target1_audio_id,l.target2_audio_id) OR l.presentation_audio_id::text=a.id::text) AND NOT (l.lego_id = ANY($4))) AS other_legos,
      (SELECT count(*) FROM course_seeds s WHERE s.course_code=$1 AND a.id IN (s.known_audio_id,s.target1_audio_id,s.target2_audio_id) AND NOT (s.seed_number = ANY($5))) AS other_seeds
    FROM course_audio a WHERE a.id = ANY($2::uuid[])`,
    [COURSE, allIds, [...changedPhraseIds], LEGOS.map(l => l.id), SEEDS.map(s => s.n)]);
  for (const c of clips) {
    const o = otherUsers.find(u => u.id === c.id) || {};
    log.staleAudio.push({ id: c.id, role: c.role, voice: c.voice_id, lego_id: c.lego_id, text: c.text,
      stillUsedByUntouchedRows: Number(o.other_phrases || 0) + Number(o.other_legos || 0) + Number(o.other_seeds || 0) });
  }

  // ── report the plan ──
  console.log(`\n${APPLY ? 'APPLY' : 'DRY RUN'} — ${COURSE}`);
  console.log(`seeds ${log.seeds.length}/${SEEDS.length}  legos ${log.legos.length}/${LEGOS.length}  phrases ${log.phrases.length} (known changed on ${log.phrases.filter(p => p.knownChanged).length})  stale clips ${log.staleAudio.length} (${log.staleAudio.filter(c => c.stillUsedByUntouchedRows > 0).length} also used by untouched rows)`);
  if (log.aborted.length) { console.log('\nABORT CONDITIONS:'); log.aborted.forEach(a => console.log('  ' + a)); }
  const zutPhr = log.phrases.filter(p => p.zutNote);
  if (zutPhr.length) { console.log('\nPhrase ZUT notes (same English maps elsewhere to a different Irish — pre-existing or new):'); zutPhr.forEach(p => console.log(`  ${p.id} "${p.knownAfter}" -> "${p.after}" | ${p.zutNote.join(' ; ')}`)); }

  if (!APPLY || log.aborted.length) {
    const f = evidencePath(`${outDir}/dryrun-${stamp}.json`);
    fs.writeFileSync(f, JSON.stringify(log, null, 2));
    console.log(`\nWrote ${f}${log.aborted.length ? ' — NOT applying' : ''}`);
    await pg.end();
    process.exit(log.aborted.length ? 2 : 0);
  }

  // ── APPLY ──
  const seedEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'seed-update',
    scope: { seed_numbers: log.seeds.map(s => s.n), rows: log.seeds.length },
    detail: { proposal: 'd/899c8b4f clear-cut table', edits: log.seeds.map(s => ({ n: s.n, before: s.before, after: s.after })) } });
  const legoEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'lego-update',
    scope: { lego_ids: log.legos.map(l => l.id), rows: log.legos.length },
    detail: { edits: log.legos.map(l => ({ id: l.id, before: l.before, after: { known: l.after.known, target: l.after.target } })) } });
  const phraseEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-edit',
    scope: { phrase_ids: log.phrases.map(p => p.id), rows: log.phrases.length },
    detail: { rule: 'a bhriseadh isteach (air) -> cur isteach (ar an scéal | air)', knownChanged: log.phrases.filter(p => p.knownChanged).length } });
  log.events = { seedEvent, legoEvent, phraseEvent };

  await pg.query('BEGIN');
  try {
    for (const s of log.seeds) {
      const r = await pg.query(
        `UPDATE course_seeds SET target_text=$1, approved_at=NULL, last_edit_event_id=$2, updated_at=now()
          WHERE course_code=$3 AND seed_number=$4 AND target_text=$5`, [s.after, seedEvent, COURSE, s.n, s.before]);
      if (r.rowCount !== 1) throw new Error(`seed ${s.n} write race`);
    }
    for (const l of log.legos) {
      const r = await pg.query(
        `UPDATE course_legos SET known_text=$1, target_text=$2, type=$3, components=$4, last_edit_event_id=$5, updated_at=now()
          WHERE course_code=$6 AND lego_id=$7 AND target_text=$8`,
        [l.after.known, l.after.target, l.after.type, l.after.components ? JSON.stringify(l.after.components) : null, legoEvent, COURSE, l.id, l.before.target]);
      if (r.rowCount !== 1) throw new Error(`lego ${l.id} write race`);
    }
    for (const p of log.phrases) {
      const r = await pg.query(
        `UPDATE course_practice_phrases SET target_text=$1, known_text=$2, word_count=length($1), qa_checked=NULL, last_edit_event_id=$3, updated_at=now()
          WHERE course_code=$4 AND id=$5 AND target_text=$6`, [p.after, p.knownAfter, phraseEvent, COURSE, p.id, p.before]);
      if (r.rowCount !== 1) throw new Error(`phrase ${p.id} write race`);
    }
    // Audio pass: APPEND to the pending request, never replace it (the live one carries a do-not-render warning).
    const note = `${SWEEP}: ${log.seeds.length} seeds, ${log.legos.length} legos, ${log.phrases.length} phrases re-worded (Eoghan clear-cut set, Kai's ruling 2026-09-21); ${log.staleAudio.length} clips stale, listed in the job's published doc. No TTS run.`;
    const q = await pg.query(
      `UPDATE audio_pass_requests SET reason = reason || ' || ' || $2, metadata = coalesce(metadata,'{}'::jsonb) || $3::jsonb, updated_at=now()
        WHERE course_code=$1 AND status='pending' RETURNING id`, [COURSE, note, JSON.stringify({ [SWEEP]: { staleClips: log.staleAudio.length, rowsTouched: log.seeds.length + log.legos.length + log.phrases.length } })]);
    if (q.rowCount === 0) {
      await pg.query(`INSERT INTO audio_pass_requests (course_code, reason, requested_by, metadata) VALUES ($1,$2,$3,$4)`,
        [COURSE, note, `@${SWEEP}`, JSON.stringify({ staleClips: log.staleAudio.length })]);
      log.audioPass = 'inserted new pending request';
    } else log.audioPass = `appended to pending request ${q.rows[0].id}`;
    await pg.query('COMMIT');
  } catch (e) {
    await pg.query('ROLLBACK');
    console.error('ROLLED BACK:', e.message);
    await pg.end();
    process.exit(1);
  }

  // Recompute the stored decompositions for the re-worded phrases (they embed the old Irish per block).
  const decoRows = log.phrases.map(p => ({ id: p.id, course_code: COURSE, seed_number: Number(p.id.match(/S(\d{4})/)[1]), target_text: p.after }));
  try {
    log.decomposition = await decoratePhrasesWithDecomposition(supabase, decoRows);
  } catch (e) { log.decomposition = { error: e.message }; }

  const f = evidencePath(`${outDir}/applied-${stamp}.json`);
  fs.writeFileSync(f, JSON.stringify(log, null, 2));
  console.log(`\nAPPLIED. events=${JSON.stringify(log.events)} audioPass=${log.audioPass} decomposition=${JSON.stringify(log.decomposition)}`);
  console.log(`Wrote ${f}`);
  await pg.end();
}

module.exports = { rewritePhrase, SEEDS, LEGOS };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
