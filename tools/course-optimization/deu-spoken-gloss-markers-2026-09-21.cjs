#!/usr/bin/env node
// tools/course-optimization/deu-spoken-gloss-markers-2026-09-21.cjs
//
// deu_for_eng — two clear-cut defects left aside by job #502 as out of its
// brief, ruled clear-cut under Kai's standing rules and fixed here (job #507).
//
// DEFECT 1 — A GRAMMATICAL GLOSS IN PARENTHESES IS READ ALOUD. The known-side
// voice speaks brackets to the learner, so "you all (2pl dative)" is heard as
// exactly that. Kai's rule: no parenthetical annotation in learner-facing text
// (the same rule #502 applied to 653/667: "NO (formal) tag or any other
// parenthetical"). A full scan of every course_legos, course_practice_phrases
// and course_audio row in this course found SIX LEGO rows carrying one — all of
// them is_new=false duplicate markers — and no phrase row. The query was
// calibrated on S0656L01 before its count was trusted, and a control course
// with hundreds of hits (tel_for_eng) proved the pattern finds what it should.
//
// Stripping the bracket alone is not enough: every one of the six was
// bracketed BECAUSE the bare English already maps to a different German LEGO
// (one known prompt -> two targets is the ZUT defect, a HARD rail). So each
// rename below names the collision it avoids, and the wording follows the
// course's own conventions rather than inventing new ones:
//   - a marker whose referent LEGO exists takes the referent's exact known
//     text, which is what a duplicate marker is (können = S0011L02 "to be able
//     to"; mich = S0056L02/S0595L01 "myself");
//   - a dative form with no standalone referent is glossed the way this
//     course already glosses dative pronouns — S0412L02 "to them" -> ihnen,
//     S0464L01 "to her" -> ihr — so euch -> "to you all", Kindern -> "to
//     children";
//   - a bare conjugated verb follows S0263L02 "you mean" -> meinst /
//     S0623L01 "want" -> willst: hast -> "you have", fühlst -> "feel" ("you
//     feel" is taken by S0040L01 -> "du fühlst dich").
// The bare-LEGO phrase (B01) of each marker mirrors the LEGO's known text and
// is renamed with it — a B01 left at "you all" -> euch would keep the ZUT
// collision alive one table down (S0657L01B01 "you all" -> ihr).
//
// DEFECT 2 — A DANGLING DUPLICATE MARKER. S0661L01 "makes" -> "macht" (is_new
// =false, no phrases, no presentation) pointed at S0653L01 "makes" -> "macht",
// which job #502 rewrote into the whole-seed M-LEGO "do you mind madam"
// (content_audit_log 23155632 holds the old row). No is_new LEGO with target
// "macht" remains in the course, so there is nothing to repoint it at; a marker
// with no referent is deleted. Seed 661 keeps its own text and audio; it simply
// no longer claims a re-encounter that cannot happen. Inventing a new LEGO for
// "macht" in 661 would be a content decision, which is Kai's, not this tool's.
//
// WHAT THIS TOOL DOES NOT DO. No TTS. It ends by APPENDING to the course's
// pending audio-pass request (open since 2026-08-11) — reason concatenated,
// metadata merged, requested_by untouched — never by creating or overwriting
// one. It deletes no audio row: trg_null_lego_audio_on_text_change and
// trg_null_phrase_audio_on_text_change unlink (or relink same-voice) the clips
// whose text no longer matches and record each drop in
// content_audio_link_drops, which this tool prints in full after --apply, with
// the three clips orphaned by the S0661L01 delete. Every seed it touches is
// unapproved (approved_at NULL — an edit unapproves a seed, Kai's rule) and
// every phrase it touches arrives unchecked (qa_checked NULL). It touches no
// other course and no other row.
//
// GATES, replayed before anything is written: the live LEGO-level ZUT gate
// (checkLegoConflict) and phrase-level ZUT gate (checkPhraseZUT) over every new
// known text, plus a course-wide same-known/different-target sweep that is not
// bounded by seed number (the live gate only looks backwards; a collision with
// a LATER seed is still a collision to the learner). Any 'zut' verdict blocks.
//
//   node tools/course-optimization/deu-spoken-gloss-markers-2026-09-21.cjs --dry-run
//   node tools/course-optimization/deu-spoken-gloss-markers-2026-09-21.cjs --apply

require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');
const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
const { requestRoundIndexRefresh } = require('../../services/shared/round-index-refresh.cjs');
const { checkLegoConflict, checkPhraseZUT } = require('../../services/course-builder/lib/validation.cjs');

const COURSE = 'deu_for_eng';
const SURFACE = 'tools:deu-spoken-gloss-markers-2026-09-21';
const RULING = 'Kai standing rule: no parenthetical annotation in learner-facing text — the voice reads it aloud (job #507, 2026-09-21)';

/** Anything the known-side voice would read out as an annotation. */
const SPOKEN_ANNOTATION = /[()\[\]+/]/;

// ─── The six renames. `from` is the exact live text; the tool refuses to act on anything else.
const RENAMES = [
  { legoId: 'S0469L03', seed: 469, idx: 3, target: 'können',  from: 'can (modal)',           to: 'to be able to',
    duplicateOf: 'S0011L02', avoids: 'S0090L01 "can" → kannst' },
  { legoId: 'S0542L03', seed: 542, idx: 3, target: 'fühlst',  from: 'you feel (2sg fühlen)', to: 'feel',
    duplicateOf: null,       avoids: 'S0040L01 "you feel" → du fühlst dich' },
  { legoId: 'S0548L03', seed: 548, idx: 3, target: 'mich',    from: 'me (accusative)',       to: 'myself',
    duplicateOf: 'S0056L02', avoids: 'S0025L03 / S0518L04 / S0589L01 "me" → mir' },
  { legoId: 'S0567L04', seed: 567, idx: 4, target: 'Kindern', from: 'children (dative pl.)', to: 'to children',
    duplicateOf: null,       avoids: 'S0455L03 / S0580L01 "children" → Kinder' },
  { legoId: 'S0616L01', seed: 616, idx: 1, target: 'hast',    from: 'have (2sg)',            to: 'you have',
    duplicateOf: null,       avoids: 'S0037L01 "have" → habe' },
  { legoId: 'S0656L01', seed: 656, idx: 1, target: 'euch',    from: 'you all (2pl dative)',  to: 'to you all',
    duplicateOf: null,       avoids: 'S0529L03 / S0657L01 "you all" → ihr' },
];

// One phrase-level side fix the phrase ZUT gate demanded: S0663L01B01 glosses the
// PLURAL "habt" as "you have", which is the singular reading — every other row of
// its own basket says "you all have" (B02 "I also asked if you all have it"), and
// this course glosses ihr as "you all" throughout. Left alone it would collide
// with S0616L01B01 "you have" → hast the moment that LEGO is renamed.
const SIDE_FIXES = [
  { id: `${COURSE}:S0663L01B01`, seed: 663, from: 'you have', to: 'you all have', target: 'habt',
    why: 'plural habt glossed with the singular reading; its own basket says "you all have"' },
];

const DELETE = { legoId: 'S0661L01', seed: 661, idx: 1, known: 'makes', target: 'macht',
  why: 'referent S0653L01 "makes" → macht was rewritten by job #502 (content_audit_log 23155632); no is_new LEGO with target "macht" remains' };

const AUDIO_COLS = ['known_audio_id', 'target1_audio_id', 'target2_audio_id', 'presentation_audio_id'];
const norm = (s) => (s || '').toLowerCase().trim().replace(/[.,!?;:]+$/, '');

function supa() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
}

/** The exact live state this tool was written against, or a list of reasons not to proceed. */
async function guard(sb) {
  const problems = [];
  const state = { renames: [], del: null };
  for (const r of RENAMES) {
    const { data: lego } = await sb.from('course_legos')
      .select('id, lego_id, is_new, known_text, target_text, presentation_audio_id, known_audio_id, target1_audio_id, target2_audio_id')
      .eq('course_code', COURSE).eq('seed_number', r.seed).eq('lego_index', r.idx).maybeSingle();
    if (!lego) { problems.push(`${r.legoId} not found`); continue; }
    if (lego.known_text === r.to) { problems.push(`${r.legoId} is ALREADY "${r.to}" — this tool has run`); continue; }
    if (lego.known_text !== r.from) problems.push(`${r.legoId} known moved: "${lego.known_text}"`);
    if (lego.target_text !== r.target) problems.push(`${r.legoId} target moved: "${lego.target_text}"`);
    if (lego.is_new !== false) problems.push(`${r.legoId} is not a duplicate marker (is_new=${lego.is_new})`);
    if (SPOKEN_ANNOTATION.test(r.to)) problems.push(`${r.legoId} replacement "${r.to}" still carries an annotation character`);
    const { data: b01 } = await sb.from('course_practice_phrases')
      .select('id, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id, qa_checked')
      .eq('course_code', COURSE).eq('id', `${COURSE}:${r.legoId}B01`).maybeSingle();
    if (b01 && norm(b01.target_text) !== norm(r.target)) problems.push(`${r.legoId}B01 is not the bare LEGO: "${b01.known_text}" → "${b01.target_text}"`);
    const { data: seed } = await sb.from('course_seeds').select('id, seed_number, known_text, target_text, approved_at')
      .eq('course_code', COURSE).eq('seed_number', r.seed).maybeSingle();
    if (!seed) problems.push(`seed ${r.seed} not found`);
    // Every audio row that carries this LEGO's id — the presentation is where a gloss fix usually gets missed.
    const { data: audioRows } = await sb.from('course_audio').select('id, role, voice_id, text')
      .eq('course_code', COURSE).eq('lego_id', r.legoId);
    state.renames.push({ r, lego, b01, seed, audioRows: audioRows || [] });
  }

  state.sideFixes = [];
  for (const f of SIDE_FIXES) {
    const { data: row } = await sb.from('course_practice_phrases')
      .select('id, seed_number, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id')
      .eq('course_code', COURSE).eq('id', f.id).maybeSingle();
    if (!row) { problems.push(`${f.id} not found`); continue; }
    if (row.known_text === f.to) { problems.push(`${f.id} is ALREADY "${f.to}" — this tool has run`); continue; }
    if (row.known_text !== f.from || norm(row.target_text) !== norm(f.target)) problems.push(`${f.id} moved: "${row.known_text}" → "${row.target_text}"`);
    state.sideFixes.push({ f, row });
  }

  const { data: dl } = await sb.from('course_legos')
    .select('id, lego_id, is_new, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id')
    .eq('course_code', COURSE).eq('seed_number', DELETE.seed).eq('lego_index', DELETE.idx).maybeSingle();
  if (!dl) problems.push(`${DELETE.legoId} not found — already deleted?`);
  else {
    if (dl.known_text !== DELETE.known || dl.target_text !== DELETE.target) problems.push(`${DELETE.legoId} moved: "${dl.known_text}" → "${dl.target_text}"`);
    if (dl.is_new !== false) problems.push(`${DELETE.legoId} is not a duplicate marker (is_new=${dl.is_new}) — refusing to delete an introduction`);
    const { count: phraseCount } = await sb.from('course_practice_phrases').select('id', { count: 'exact', head: true })
      .eq('course_code', COURSE).eq('seed_number', DELETE.seed).eq('lego_index', DELETE.idx);
    if (phraseCount) problems.push(`${DELETE.legoId} has ${phraseCount} phrase rows — not a bare marker`);
    // The referent must be genuinely gone: no introducing LEGO with this target anywhere in the course.
    const { data: referents } = await sb.from('course_legos').select('lego_id, known_text')
      .eq('course_code', COURSE).eq('is_new', true).ilike('target_text', DELETE.target);
    if (referents && referents.length) problems.push(`${DELETE.legoId} still has a referent: ${referents.map(x => `${x.lego_id} "${x.known_text}"`).join(', ')} — repoint, do not delete`);
    const { data: audioRows } = await sb.from('course_audio').select('id, role, voice_id, text')
      .eq('course_code', COURSE).eq('lego_id', DELETE.legoId);
    state.del = { lego: dl, audioRows: audioRows || [] };
  }
  return { problems, state };
}

/** The live ZUT gates plus a course-wide sweep unbounded by seed number. Returns blocking findings. */
async function zutGates(sb) {
  const findings = [];
  const { data: allLegos } = await sb.from('course_legos').select('lego_id, is_new, known_text, target_text').eq('course_code', COURSE);
  for (const r of RENAMES) {
    const live = await checkLegoConflict(sb, COURSE, r.to, r.target, r.seed);
    if (live.conflict === 'zut') findings.push(`${r.legoId} "${r.to}": live LEGO gate — ${live.error}`);
    const verdict = live.conflict === 'duplicate' ? `duplicate of ${live.legoId}` : live.conflict ? live.conflict : 'no earlier LEGO with this known text';
    if (r.duplicateOf && (live.conflict !== 'duplicate' || live.legoId !== r.duplicateOf)) findings.push(`${r.legoId} "${r.to}": expected a duplicate of ${r.duplicateOf}, gate says ${verdict}`);
    const later = (allLegos || []).filter(l => l.lego_id !== r.legoId && norm(l.known_text) === norm(r.to) && norm(l.target_text) !== norm(r.target));
    for (const l of later) findings.push(`${r.legoId} "${r.to}": course-wide — ${l.lego_id} "${l.known_text}" → "${l.target_text}"`);
    // A collision with a row this tool itself corrects is not a collision after the run.
    const phraseHits = (await checkPhraseZUT(sb, COURSE, [{ known: r.to, target: r.target }], null))
      .filter(h => !SIDE_FIXES.some(f => f.seed === h.existing_seed && norm(f.target) === norm(h.existing_target) && norm(f.from) === norm(r.to)));
    for (const h of phraseHits) findings.push(`${r.legoId}B01 "${r.to}" → "${r.target}": phrase gate — seed ${h.existing_seed} already says "${h.existing_target}"`);
    console.log(`  ${r.legoId}  "${r.from}"  →  "${r.to}"  [${r.target}]   LEGO gate: ${verdict}; phrase gate: ${phraseHits.length ? phraseHits.length + ' collision(s)' : 'clean'}; avoids ${r.avoids}`);
  }
  for (const f of SIDE_FIXES) {
    const phraseHits = await checkPhraseZUT(sb, COURSE, [{ known: f.to, target: f.target }], null);
    for (const h of phraseHits) findings.push(`${f.id} "${f.to}" → "${f.target}": phrase gate — seed ${h.existing_seed} already says "${h.existing_target}"`);
    const legoHits = (allLegos || []).filter(l => norm(l.known_text) === norm(f.to) && norm(l.target_text) !== norm(f.target));
    for (const l of legoHits) findings.push(`${f.id} "${f.to}": course-wide — ${l.lego_id} "${l.known_text}" → "${l.target_text}"`);
    console.log(`  ${f.id}  "${f.from}"  →  "${f.to}"  [${f.target}]   phrase gate: ${phraseHits.length ? phraseHits.length + ' collision(s)' : 'clean'}; ${f.why}`);
  }
  return findings;
}

/** How many live rows still point at a clip, so an orphaned clip is named as such. */
async function refCount(sb, clipId) {
  let n = 0;
  for (const [table, cols] of [['course_legos', AUDIO_COLS], ['course_practice_phrases', AUDIO_COLS], ['course_seeds', AUDIO_COLS.slice(0, 3)]]) {
    for (const col of cols) {
      const { count } = await sb.from(table).select('id', { count: 'exact', head: true }).eq(col, clipId);
      n += count || 0;
    }
  }
  return n;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const sb = supa();

  console.log(`\n══════ ${COURSE}: spoken-aloud glosses on six duplicate markers, and one dangling marker ══════`);
  const { problems, state } = await guard(sb);
  for (const p of problems) console.error(`BLOCKED  ${p}`);
  if (problems.length) { console.error('\nBLOCKED — the live state is not what this tool was written against. Nothing written.'); process.exit(1); }
  console.log('guard: live state is exactly what this tool was written against\n');

  console.log('ZUT, the live gates plus a course-wide sweep:');
  const findings = await zutGates(sb);
  for (const f of findings) console.error(`  ZUT  ${f}`);
  if (findings.length) { console.error('\nBLOCKED — a ZUT gate refused. Nothing written.'); process.exit(1); }
  console.log('ZUT: every new known text is clean, or the exact duplicate of its referent\n');

  for (const s of state.renames) {
    console.log(`${s.r.legoId}  "${s.lego.known_text}" → "${s.lego.target_text}"  becomes  "${s.r.to}"`);
    if (s.b01 && s.b01.known_text !== s.r.to) console.log(`    ${s.b01.id}  "${s.b01.known_text}" → "${s.b01.target_text}"  becomes  "${s.r.to}"  (qa_checked NULL)`);
    else if (s.b01) console.log(`    ${s.b01.id} already reads "${s.b01.known_text}" — text unchanged, qa_checked NULL so it is re-read`);
    console.log(`    seed ${s.r.seed} ${s.seed.approved_at ? 'unapproved' : 'already unapproved'}`);
    console.log(`    audio rows tagged ${s.r.legoId}: ${s.audioRows.length ? s.audioRows.map(a => `${a.role}/${a.voice_id} "${a.text}"`).join('; ') : 'none (no presentation row)'}`);
  }
  for (const s of state.sideFixes) console.log(`${s.f.id}  "${s.row.known_text}" → "${s.row.target_text}"  becomes  "${s.f.to}"  (qa_checked NULL; seed ${s.f.seed} unapproved)`);
  console.log(`\nDELETE ${DELETE.legoId}  "${DELETE.known}" → "${DELETE.target}"  [is_new=false, 0 phrases] — ${DELETE.why}`);
  console.log(`    audio rows tagged ${DELETE.legoId}: ${state.del.audioRows.length || 'none'}`);

  if (!apply) { console.log('\nDRY RUN — nothing written. Re-run with --apply.'); return; }

  // ─── apply ────────────────────────────────────────────────────────────────
  const identity = serviceIdentity(SURFACE);
  const eventId = await recordContentEdit(sb, {
    identity, courseCode: COURSE, surface: SURFACE, operation: 'spoken-gloss-marker-cleanup',
    scope: {
      seed_numbers: [...RENAMES.map(r => r.seed), ...SIDE_FIXES.map(f => f.seed), DELETE.seed],
      lego_ids: [...RENAMES.map(r => r.legoId), DELETE.legoId],
      phrase_ids: [...state.renames.filter(s => s.b01).map(s => s.b01.id), ...SIDE_FIXES.map(f => f.id)],
      rows: RENAMES.length * 2 + state.renames.filter(s => s.b01).length + SIDE_FIXES.length * 2 + 1 + 1,
    },
    detail: {
      ruling: RULING,
      renames: RENAMES.map(r => ({ lego_id: r.legoId, from: r.from, to: r.to, target: r.target, avoids: r.avoids, duplicate_of: r.duplicateOf })),
      side_fixes: SIDE_FIXES,
      deleted: { lego_id: DELETE.legoId, known: DELETE.known, target: DELETE.target, why: DELETE.why,
        audio_ids: AUDIO_COLS.map(c => state.del.lego[c]).filter(Boolean) },
    },
  });
  console.log(`\nedit event ${eventId}`);

  const stale = [];
  const dropsFor = async (table, rowId, label) => {
    const { data: drops } = await sb.from('content_audio_link_drops').select('column_name, old_audio_id, new_audio_id, old_text, reason')
      .eq('table_name', table).eq('row_id', rowId).order('dropped_at', { ascending: false }).limit(8);
    for (const d of drops || []) if (d.old_audio_id) stale.push({ where: `${label}.${d.column_name}`, clip: d.old_audio_id, why: `${d.reason} (spoke "${d.old_text}")${d.new_audio_id ? ` → relinked to ${d.new_audio_id}` : ''}` });
  };

  for (const s of state.renames) {
    const { error: le } = await sb.from('course_legos').update({ known_text: s.r.to, last_edit_event_id: eventId })
      .eq('course_code', COURSE).eq('seed_number', s.r.seed).eq('lego_index', s.r.idx);
    if (le) throw new Error(`${s.r.legoId}: ${le.message}`);
    await dropsFor('course_legos', s.lego.id, s.r.legoId);
    if (s.b01) {
      const { error: pe } = await sb.from('course_practice_phrases').update({ known_text: s.r.to, qa_checked: null, last_edit_event_id: eventId })
        .eq('course_code', COURSE).eq('id', s.b01.id);
      if (pe) throw new Error(`${s.b01.id}: ${pe.message}`);
      await dropsFor('course_practice_phrases', s.b01.id, s.b01.id);
    }
    const { error: se } = await sb.from('course_seeds').update({ approved_at: null, last_edit_event_id: eventId })
      .eq('course_code', COURSE).eq('seed_number', s.r.seed);
    if (se) throw new Error(`seed ${s.r.seed}: ${se.message}`);
    console.log(`${s.r.legoId} → "${s.r.to}"; ${s.b01 ? s.b01.id + ' → "' + s.r.to + '" (unchecked); ' : ''}seed ${s.r.seed} unapproved`);
  }

  for (const s of state.sideFixes) {
    const { error: pe } = await sb.from('course_practice_phrases').update({ known_text: s.f.to, qa_checked: null, last_edit_event_id: eventId })
      .eq('course_code', COURSE).eq('id', s.f.id);
    if (pe) throw new Error(`${s.f.id}: ${pe.message}`);
    await dropsFor('course_practice_phrases', s.f.id, s.f.id);
    const { error: se } = await sb.from('course_seeds').update({ approved_at: null, last_edit_event_id: eventId })
      .eq('course_code', COURSE).eq('seed_number', s.f.seed);
    if (se) throw new Error(`seed ${s.f.seed}: ${se.message}`);
    console.log(`${s.f.id} → "${s.f.to}" (unchecked); seed ${s.f.seed} unapproved`);
  }

  const delClips = AUDIO_COLS.map(c => state.del.lego[c]).filter(Boolean);
  const { error: de, count: dc } = await sb.from('course_legos').delete({ count: 'exact' }).eq('id', state.del.lego.id);
  if (de) throw new Error(`delete ${DELETE.legoId}: ${de.message}`);
  if (dc !== 1) throw new Error(`delete ${DELETE.legoId} removed ${dc} rows`);
  console.log(`deleted ${DELETE.legoId}`);
  for (const clip of delClips) stale.push({ where: `${DELETE.legoId} (deleted)`, clip, why: `unreferenced by the delete; ${await refCount(sb, clip)} other live row(s) still link it` });

  const { error: ue } = await sb.from('course_seeds').update({ last_edit_event_id: eventId }).eq('course_code', COURSE).eq('seed_number', DELETE.seed);
  if (ue) throw new Error(`seed ${DELETE.seed}: ${ue.message}`);

  const refresh = await requestRoundIndexRefresh(COURSE, { immediate: true, reason: SURFACE });
  console.log(`round map: ${JSON.stringify(refresh)}`);

  // APPEND to the pending audio-pass request — never create a second, never overwrite.
  const { data: pending } = await sb.from('audio_pass_requests').select('id, reason, metadata')
    .eq('course_code', COURSE).eq('status', 'pending').maybeSingle();
  if (!pending) throw new Error('no pending audio-pass request for deu_for_eng — expected the row open since 2026-08-11; NOT creating one');
  const mine = 'spoken-aloud glosses on six duplicate markers — new known clips for S0469L03/S0542L03/S0548L03/S0567L04/S0616L01/S0656L01 and their B01 phrases, plus S0663L01B01 (Kai, job #507, 2026-09-21)';
  const { error: qe } = await sb.from('audio_pass_requests').update({
    reason: `${pending.reason} + ${mine}`,
    metadata: { ...pending.metadata, job507SpokenGlossMarkers: { editEventId: eventId, legos: RENAMES.map(r => r.legoId), phrases: [...state.renames.filter(s => s.b01).map(s => s.b01.id), ...SIDE_FIXES.map(f => f.id)] } },
    updated_at: new Date().toISOString(),
  }).eq('id', pending.id);
  if (qe) throw new Error(`audio-pass append: ${qe.message}`);
  console.log(`audio pass: appended to pending request ${pending.id}`);

  console.log(`\nAUDIO LEFT STALE / UNREFERENCED — ${stale.length} clip link(s), listed in full:`);
  for (const s of stale) console.log(`    ${s.where}  ${s.clip}  — ${s.why}`);
}

module.exports = { RENAMES, SIDE_FIXES, DELETE, SPOKEN_ANNOTATION };

if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
