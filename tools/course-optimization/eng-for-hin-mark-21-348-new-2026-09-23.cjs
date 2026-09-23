#!/usr/bin/env node
'use strict';
// eng_for_hin — S0021L03 'her name' and S0348L02 'what was going to happen' become NEW LEGOs
// (Kai's approval, 2026-09-23, job #880·H; found by #875·H at d/2766ab56).
//
//  WHY. Both are one Hindi prompt with two English answers:
//    S0021L03  उसका नाम          → her name                 (S0020L01 is उसका नाम → his name)
//    S0348L02  क्या होने वाला है  → what was going to happen (S0201L02 is → what is going to happen)
//  Kai's both-sides rule (14:31Z) makes a LEGO a duplicate only if BOTH sides match an earlier
//  LEGO. The English differs, so each is a LEGO in its own right, and a new LEGO needs its own
//  practice and its own introduction.
//
//  WHAT IT DOES, in two stages so every phrase is read before it is written:
//    --generate   is_new is NOT touched. The course's normal phrase door
//                 (services/course-builder/lib/phrase-generation.cjs: v3 prompt on Opus, the live
//                 gates replayed — bare-LEGO, build/use floors, containment, vocabulary at the
//                 seed, ZUT, known-side — with retries) writes a proposal file. A blocked set is
//                 saved as blocked, never written.
//    --apply      reads the proposal file, re-runs the gate on it, checks the 'her name' set
//                 never says 'his', then: is_new → true (version+1, attributed); phrases submitted
//                 through POST /api/v2/phrases (the live route, its own gates again, deterministic
//                 ids, M-LEGO component build-up for S0021L03); every written row read back and
//                 ZUT-checked against the course; a PENDING presentation row in the presentation
//                 voice (Kriti), Frame A — the ordinary "अंग्रेज़ी में — '<chunk>' — में :" line with
//                 no 'as in' clause, as Kai asked — keyed to the LEGO so phase8 renders it as-is
//                 rather than re-judging the frame (getAudioNeeds: a fresh pending row covers the
//                 LEGO; linkPresentationAudio binds presentation_audio_id after the render);
//                 seeds 21 and 348 unapproved (an edit unapproves — Shuchita re-reviews); the
//                 pending audio-pass request APPENDED to, never replaced (#875 found
//                 queueAudioPass overwrites `reason`).
//
//  THE 'HER' QUESTION. The two-voice referent mechanism renders target audio from
//  course_gender_expansions keyed on the STORED phrase text (phase8 `${text}|${language}|${role}`):
//  a 'his name' phrase is spoken as 'her' by the female voice and 'his' by the male voice. A
//  phrase whose stored text already says 'her name' has no such row (checked live in --apply:
//  no target-side row's original_text is one of these phrases), so BOTH English voices read it
//  verbatim as 'her'. That is the gendered-line half of Kai's design: the neutral seed-20 line
//  splits m/f, the seed-21 line is 'her' on both voices.
//
//  RENDERS NOTHING. Deletes nothing. Identity: serviceIdentity + recordContentEdit for the SQL-side
//  writes; the phrase write goes through the HTTP gate with a declared agent identity.
//
//   node tools/course-optimization/eng-for-hin-mark-21-348-new-2026-09-23.cjs --generate
//   node tools/course-optimization/eng-for-hin-mark-21-348-new-2026-09-23.cjs --apply
//   node tools/course-optimization/eng-for-hin-mark-21-348-new-2026-09-23.cjs            (dry run: state check only)

const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');

const ROOT = path.join(__dirname, '..', '..');
const COURSE = 'eng_for_hin';
const SWEEP = 'eng-for-hin-mark-21-348-new-2026-09-23';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const JOB = '#880·H';
const RULING = "Kai, 2026-09-23 (job #880·H): S0021L03 'her name' and S0348L02 'what was going to happen' are NEW — same Hindi as an earlier LEGO but different English (both-sides rule, 14:31Z); each gets its own phrases and an ordinary '<chunk> is:' introduction";
const HINDI_TEMPLATE = "{target_lang_name} में — '{known}' — जैसे — '{seed}' — में :";
const TARGET_LANG_NAME = 'अंग्रेज़ी';
const COURSE_BUILDER = process.env.COURSE_BUILDER_URL || 'http://localhost:3471';

const TARGETS = [
  { lego_id: 'S0021L03', seed: 21, idx: 3, known: 'उसका नाम', target: 'her name', twin: 'S0020L01', twin_target: 'his name', her: true },
  { lego_id: 'S0348L02', seed: 348, idx: 2, known: 'क्या होने वाला है', target: 'what was going to happen', twin: 'S0201L02', twin_target: 'what is going to happen', her: false },
];

const MODE = process.argv.includes('--apply') ? 'apply' : process.argv.includes('--generate') ? 'generate' : 'dry';

// ── pure rules (tested) ─────────────────────────────────────────────────────

/** The pending audio-pass row is one per course and `reason` is REPLACED by queueAudioPass; this never loses the earlier account. */
function appendAudioPassReason(existingReason, mine) {
  const prev = String(existingReason || '').trim();
  return prev ? `${prev} + ${mine}` : mine;
}

/** The 'her name' LEGO's practice must be 'her' in every row and 'his' in none — the English voices read the stored text. */
function herNotHisProblems(phrases) {
  const out = [];
  for (const p of phrases) {
    const t = String(p.target || p.target_text || '');
    if (!/\bher name\b/i.test(t)) out.push(`${p.id || p.role || '?'}: "${t}" does not say 'her name'`);
    if (/\bhis\b/i.test(t)) out.push(`${p.id || p.role || '?'}: "${t}" says 'his'`);
  }
  return out;
}

/** Frame A — the ordinary introduction with no 'as in' clause: "अंग्रेज़ी में — '<chunk>' — में :". */
function frameAIntro(chunk, renderIntro) {
  return renderIntro({ frame: 'A', template: HINDI_TEMPLATE, targetLangName: TARGET_LANG_NAME, chunk, seed: '' });
}

module.exports = { TARGETS, HINDI_TEMPLATE, appendAudioPassReason, herNotHisProblems, frameAIntro };

if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });

// ── the sweep ───────────────────────────────────────────────────────────────

async function main() {
  require('dotenv').config({ path: path.join(ROOT, '.env'), quiet: true });
  require('dotenv').config({ path: path.join(ROOT, '.env.psql'), quiet: true });
  const { createClient } = require('@supabase/supabase-js');
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const { normalizeForAudio } = require('../../services/shared/text-normalize.cjs');
  const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
  const presentationAuthor = require('../../services/phases/presentation-author.cjs');
  const { checkPhraseZUT } = require('../../services/course-builder/lib/validation.cjs');
  const { normalizeForContainment } = require('../../services/course-builder/lib/text-normalization.cjs');
  const { makeCourseCtx, checkPhraseSet, failureFeedback } = require('../phrase-gate/gate-check.cjs');
  const { evidencePath } = require('../lib/evidence-path.cjs');

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data; };
  const proposalsPath = evidencePath(`tools/course-optimization/${SWEEP}-proposals.json`);
  fs.mkdirSync(path.dirname(proposalsPath), { recursive: true });

  console.log(`=== ${MODE.toUpperCase()} — ${COURSE} (${JOB}) ===`);

  // 1. The live state this was written against. Refuse on any drift.
  const state = [];
  for (const d of TARGETS) {
    const lego = must(await supabase.from('course_legos').select('lego_id,seed_number,lego_index,known_text,target_text,is_new,type,components,presentation_audio_id,version')
      .eq('course_code', COURSE).eq('seed_number', d.seed).eq('lego_index', d.idx).single(), d.lego_id);
    const twin = must(await supabase.from('course_legos').select('lego_id,known_text,target_text,is_new').eq('course_code', COURSE).eq('lego_id', d.twin).single(), d.twin);
    const seed = must(await supabase.from('course_seeds').select('seed_number,known_text,target_text,approved_at').eq('course_code', COURSE).eq('seed_number', d.seed).single(), `seed ${d.seed}`);
    const phrases = must(await supabase.from('course_practice_phrases').select('id').eq('course_code', COURSE).eq('seed_number', d.seed).eq('lego_index', d.idx), `${d.lego_id} phrases`);
    const pres = must(await supabase.from('course_audio').select('id,s3_key,voice_id,text').eq('course_code', COURSE).eq('role', 'presentation').eq('lego_id', d.lego_id), `${d.lego_id} presentation rows`);
    if (lego.known_text !== d.known || lego.target_text !== d.target) throw new Error(`${d.lego_id} is "${lego.known_text}" → "${lego.target_text}", expected "${d.known}" → "${d.target}" — refusing`);
    if (twin.known_text !== d.known || twin.target_text !== d.twin_target || !twin.is_new) throw new Error(`${d.twin} is "${twin.known_text}" → "${twin.target_text}" new=${twin.is_new} — refusing`);
    if (!seed.known_text.includes(d.known)) throw new Error(`seed ${d.seed} "${seed.known_text}" does not contain "${d.known}" — refusing`);
    if (MODE !== 'dry' && lego.is_new) throw new Error(`${d.lego_id} is already is_new=true — nothing to do`);
    if (phrases.length) throw new Error(`${d.lego_id} already has ${phrases.length} phrases — refusing to write on top`);
    if (lego.presentation_audio_id) throw new Error(`${d.lego_id} already has a presentation linked (${lego.presentation_audio_id}) — refusing`);
    const pendingPres = pres.filter(p => p.s3_key.startsWith('pending/'));
    if (pendingPres.length) throw new Error(`${d.lego_id} already has a pending presentation row (${pendingPres.map(p => p.id).join(',')}) — refusing`);
    // A rendered row may exist from the 2026-06 build (S0021L03 has one: eve voice, quoting the
    // OLD chunk 'उसकी नाम'). It is not linked, its text no longer matches known_text, and its voice
    // is not the presentation voice, so linkPresentationAudio refuses it; it is left alone (never
    // delete a generated asset) and listed. phase8 renders a pending row regardless (Step 3).
    const legacy = pres.filter(p => !p.s3_key.startsWith('pending/'));
    state.push({ d, lego, twin, seed, legacy });
    console.log(`${d.lego_id} [${lego.type}] "${lego.known_text}" → "${lego.target_text}"  is_new=${lego.is_new}  twin ${d.twin} → "${twin.target_text}"  seed ${d.seed}: ${seed.known_text} → ${seed.target_text} (approved_at=${seed.approved_at || 'NULL'})`);
    for (const p of legacy) console.log(`  legacy presentation row left alone: ${p.id} [${p.voice_id}] ${p.text}`);
  }
  if (MODE === 'dry') { console.log('dry run — state verified, nothing generated, nothing written'); return; }

  // 2. --generate: the course's normal phrase door, gates inside, proposals to a file.
  if (MODE === 'generate') {
    const { generateLegoPhrases } = require('../../services/course-builder/lib/phrase-generation.cjs');
    const proposals = { sweep: SWEEP, job: JOB, at: new Date().toISOString(), ruling: RULING, sets: [] };
    for (const { d } of state) {
      console.log(`\ngenerating ${d.lego_id} through generateLegoPhrases (Opus, gated)…`);
      const r = await generateLegoPhrases(supabase, COURSE, d.seed, d.idx);
      const her = d.her ? herNotHisProblems([...r.build.map(p => ({ ...p, role: 'build' })), ...r.use.map(p => ({ ...p, role: 'use' }))]) : [];
      proposals.sets.push({ lego_id: d.lego_id, seed: d.seed, idx: d.idx, blocked: r.blocked, her_problems: her, gate: r.gate, attempts: r.attempts, score: r.score, build: r.build, use: r.use, model: r.model, elapsedMs: r.elapsedMs });
      console.log(`  ${r.blocked ? 'BLOCKED' : 'gate PASS'} after ${r.attempts.length} attempt(s), ${r.build.length} build / ${r.use.length} use, ${Math.round(r.elapsedMs / 1000)}s${her.length ? `; HER PROBLEMS: ${her.join('; ')}` : ''}`);
      for (const p of r.build) console.log(`    BUILD ${p.known} → ${p.target}`);
      for (const p of r.use) console.log(`    USE   ${p.known} → ${p.target}`);
      if (r.blocked) for (const a of r.attempts) console.log(`    attempt ${a.attempt}: ${a.failingGates.join(',')} — ${a.reasons.join(' | ')}`);
    }
    fs.writeFileSync(proposalsPath, JSON.stringify(proposals, null, 1));
    console.log(`\nproposals: ${proposalsPath}`);
    return;
  }

  // 3. --apply
  if (!fs.existsSync(proposalsPath)) throw new Error(`no proposals at ${proposalsPath} — run --generate first`);
  const proposals = JSON.parse(fs.readFileSync(proposalsPath, 'utf8'));
  const course = must(await supabase.from('courses').select('course_code,known_lang,target_lang,voice_config').eq('course_code', COURSE).single(), 'course');
  const tpl = must(await supabase.from('presentation_templates').select('template').eq('known_lang', 'hin').eq('is_active', true).order('priority', { ascending: false }).limit(1), 'template');
  if (!tpl.length || tpl[0].template !== HINDI_TEMPLATE) throw new Error(`live Hindi template is "${tpl[0]?.template}" — plan assumes "${HINDI_TEMPLATE}"; refusing`);
  if (presentationAuthor.localisedLangName(course.target_lang, course.known_lang) !== TARGET_LANG_NAME) throw new Error('localisedLangName disagrees with the plan — refusing');
  const presVoice = presentationAuthor.resolvePresentationVoiceId(course);
  const pending = must(await supabase.from('audio_pass_requests').select('id,reason,metadata').eq('course_code', COURSE).eq('status', 'pending').maybeSingle(), 'pending audio pass');
  if (!pending) throw new Error(`no pending audio-pass request for ${COURSE} — refusing (queue one by hand first, this tool only appends)`);
  const gateCtx = makeCourseCtx(supabase, COURSE);
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const out = { sweep: SWEEP, job: JOB, at: new Date().toISOString(), ruling: RULING, proposals: proposalsPath, legos: [], events: [], audio_pass: null };

  // 3a. Re-gate every proposal before a single write; refuse the whole run on any failure.
  for (const { d } of state) {
    const set = proposals.sets.find(s => s.lego_id === d.lego_id);
    if (!set) throw new Error(`no proposal for ${d.lego_id}`);
    if (set.blocked) throw new Error(`${d.lego_id} proposal is BLOCKED (${set.attempts.map(a => a.failingGates.join(',')).join(' / ')}) — nothing written`);
    const gate = await checkPhraseSet({ courseCode: COURSE, seedNumber: d.seed, legoIndex: d.idx, legoId: d.lego_id, legoKnown: d.known, legoTarget: d.target, components: state.find(s => s.d === d).lego.components, build: set.build, use: set.use }, gateCtx);
    if (!gate.overallPass) throw new Error(`${d.lego_id} fails the gate on replay: ${failureFeedback(gate).join(' | ')}`);
    const her = d.her ? herNotHisProblems([...set.build, ...set.use]) : [];
    if (her.length) throw new Error(`${d.lego_id}: ${her.join('; ')}`);
    console.log(`${d.lego_id}: gate replay PASS (${set.build.length} build / ${set.use.length} use)${d.her ? ", every row says 'her name', none says 'his'" : ''}`);
  }

  // 3b. Per LEGO: is_new → true, phrases through the live route, read back, ZUT every row, pending intro.
  for (const { d, lego, seed } of state) {
    const set = proposals.sets.find(s => s.lego_id === d.lego_id);
    const eventId = await recordContentEdit(supabase, {
      identity, courseCode: COURSE, surface: SURFACE, operation: 'lego-new-mark',
      scope: { seed_numbers: [d.seed], lego_ids: [d.lego_id], rows: 1 },
      detail: { job: JOB, ruling: RULING, twin: d.twin, twin_target: d.twin_target, before: { is_new: false, phrases: 0, presentation_audio_id: null }, phrases_via: 'POST /api/v2/phrases', proposals: proposalsPath },
    });
    out.events.push(eventId);
    must(await supabase.from('course_legos').update({ is_new: true, version: (lego.version || 1) + 1, last_edit_event_id: eventId })
      .eq('course_code', COURSE).eq('seed_number', d.seed).eq('lego_index', d.idx), `${d.lego_id} is_new`);
    console.log(`\n${d.lego_id}: is_new false → true (event ${eventId})`);

    // The live route: its own count / vocab / bare / containment gates, deterministic ids, component build-up for M.
    const res = await fetch(`${COURSE_BUILDER}/api/v2/phrases/${COURSE}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-agent-id': `${SWEEP} (${JOB})`, 'x-agent-role': 'content-sweep' },
      body: JSON.stringify({ phrases: [{ seed_number: d.seed, lego_index: d.idx, build: set.build.map(p => ({ known: p.known, target: p.target })), use: set.use.map(p => ({ known: p.known, target: p.target })) }] }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.errors?.length || !body.phrases_inserted) throw new Error(`${d.lego_id} POST /v2/phrases: HTTP ${res.status} ${JSON.stringify(body).slice(0, 600)} — is_new is already true; phrases NOT written`);
    console.log(`  POST /api/v2/phrases → ${body.phrases_inserted} rows inserted`);

    // Read back and check every row: containment, ZUT against the course, her/his.
    const rows = must(await supabase.from('course_practice_phrases').select('id,phrase_role,position,known_text,target_text,known_audio_id,target1_audio_id,target2_audio_id')
      .eq('course_code', COURSE).eq('seed_number', d.seed).eq('lego_index', d.idx).order('position'), `${d.lego_id} rows`);
    const practice = rows.filter(r => r.phrase_role !== 'component');
    const legoNorm = normalizeForContainment(d.target);
    const noContain = practice.filter(r => !normalizeForContainment(r.target_text).includes(legoNorm)).map(r => r.id);
    if (noContain.length) throw new Error(`${d.lego_id}: rows without the LEGO: ${noContain.join(', ')}`);
    const zut = await checkPhraseZUT(supabase, COURSE, practice.map(r => ({ known: r.known_text, target: r.target_text })), d.seed);
    const herRows = d.her ? herNotHisProblems(practice.map(r => ({ id: r.id, target: r.target_text }))) : [];
    if (herRows.length) throw new Error(`${d.lego_id}: ${herRows.join('; ')}`);
    // The seed-20 'his' rows whose licensed female reading is one of ours: the gate treated them as the same phrase, listed for the record.
    const expansions = must(await supabase.from('course_gender_expansions').select('original_text,expanded_f,expanded_m').eq('course_code', COURSE).eq('text_side', 'target')
      .in('original_text', practice.map(r => r.target_text)), 'expansions');
    const audioLess = rows.filter(r => !r.known_audio_id || !r.target1_audio_id || !r.target2_audio_id);
    console.log(`  ${rows.length} rows read back (${rows.length - practice.length} component, ${practice.length} practice); containment OK on all; ZUT collisions: ${zut.length}; target-side expansion rows keyed on these texts: ${expansions.length}; rows missing some audio: ${audioLess.length}`);
    for (const r of rows) console.log(`    ${r.id} [${r.phrase_role}] ${r.known_text} → ${r.target_text}${r.known_audio_id && r.target1_audio_id && r.target2_audio_id ? '' : '   (audio pending)'}`);
    for (const z of zut) console.log(`    ZUT: "${z.known}" → "${z.new_target}" vs seed ${z.existing_seed} "${z.existing_target}"`);
    if (zut.length) throw new Error(`${d.lego_id}: ${zut.length} ZUT collision(s) on read-back — see above (phrases are written; is_new is true)`);

    // The pending introduction, Frame A, in the presentation voice, keyed to the LEGO.
    const intro = frameAIntro(d.known, presentationAuthor.renderIntro);
    if (!intro.includes(`'${d.known}'`) || /जैसे|as in/.test(intro)) throw new Error(`intro "${intro}" is not the bare Frame A line — refusing`);
    const presRow = { course_code: COURSE, text: intro, text_normalized: normalizeForAudio(intro), language: course.known_lang, role: 'presentation', voice_id: presVoice, origin: 'tts', s3_key: `pending/${randomUUID().toUpperCase()}.mp3`, lego_id: d.lego_id };
    must(await supabase.from('course_audio').upsert([presRow], { onConflict: 'course_code,text_normalized,language,role,voice_id', ignoreDuplicates: true }), `${d.lego_id} pending presentation`);
    const presAfter = must(await supabase.from('course_audio').select('id,s3_key,voice_id,text,lego_id').eq('course_code', COURSE).eq('role', 'presentation').eq('text_normalized', presRow.text_normalized).eq('voice_id', presVoice), 'pending row after');
    console.log(`  presentation (pending, ${presVoice}): ${intro}  → row ${presAfter.map(p => `${p.id} ${p.s3_key.split('/')[0]} lego ${p.lego_id}`).join('; ')}`);
    if (!presAfter.some(p => p.lego_id === d.lego_id)) throw new Error(`${d.lego_id}: the pending presentation row is keyed to another LEGO (${presAfter.map(p => p.lego_id).join(',')}) — phase8 would not cover this LEGO`);

    must(await supabase.from('course_seeds').update({ approved_at: null, last_edit_event_id: eventId }).eq('course_code', COURSE).eq('seed_number', d.seed), `seed ${d.seed} unapprove`);
    console.log(`  seed ${d.seed} unapproved (was ${seed.approved_at || 'NULL'})`);

    out.legos.push({ lego_id: d.lego_id, seed: d.seed, event: eventId, is_new: 'false → true', rows: rows.map(r => ({ id: r.id, role: r.phrase_role, known: r.known_text, target: r.target_text, audio: !!(r.known_audio_id && r.target1_audio_id && r.target2_audio_id) })),
      audio_less_rows: audioLess.map(r => r.id), zut_collisions: zut, licensed_twins: expansions, presentation: { text: intro, voice: presVoice, rows: presAfter }, legacy_presentation_rows: state.find(s => s.d === d).legacy, seed_was_approved_at: seed.approved_at });
  }

  // 3c. The audio pass: APPEND to the one pending row.
  const audioLessIds = out.legos.flatMap(l => l.audio_less_rows);
  const mine = `S0021L03 'her name' and S0348L02 'what was going to happen' marked NEW (Kai, job ${JOB}, 2026-09-23) — ${audioLessIds.length} new phrase rows without audio (Kriti known, Charlotte + Tom target; the 'her name' rows are read verbatim as 'her' by both English voices) and 2 pending Frame A intros in Kriti`;
  const reason = appendAudioPassReason(pending.reason, mine);
  must(await supabase.from('audio_pass_requests').update({ reason, metadata: { ...pending.metadata, job880Mark21and348New: { events: out.events, legos: TARGETS.map(t => t.lego_id), phrases: audioLessIds, presentations: out.legos.map(l => l.presentation.rows.map(r => r.id)).flat() } }, updated_at: new Date().toISOString() })
    .eq('id', pending.id), 'audio pass append');
  out.audio_pass = { id: pending.id, reason_before: pending.reason, reason_after: reason };
  console.log(`\naudio pass ${pending.id}: reason appended (was ${pending.reason.length} chars, now ${reason.length})`);

  await refreshNow();
  console.log('course_round_index refreshed');
  const ev = evidencePath(`tools/course-optimization/${SWEEP}.json`);
  fs.writeFileSync(ev, JSON.stringify(out, null, 1));
  console.log(`evidence: ${ev}`);
}
