#!/usr/bin/env node
'use strict';
// eng_for_hin — seed 128 "someone (who)" → "someone" (Kai's conditional approval, 2026-09-23, job #866).
//
// S0128L02 "एक ऐसे व्यक्ति" → "someone (who)". The "(who)" was a gloss a redo agent added to
// hint at the Hindi paired construction ऐसे…जिसे; no gate forced it (#845·H, d/494c826c).
// The English voice reads it aloud (Kai's standing rule: no parenthetical annotation in
// learner-facing text). Kai approved stripping it to plain "someone" ON CONDITION that two
// things were verified first, every affected row live, no sampling:
//
//   (a) NO ZUT CLASH. The Hindi side does not change, so the strip cannot create a
//       same-Hindi → different-English fork; the gates below prove it (live LEGO gate,
//       live phrase gate, and a course-wide same-known/different-target sweep unbounded by
//       seed number). Two LEGOs map a DIFFERENT Hindi to bare "someone" — S0236L01
//       "एक व्यक्ति को" and (inside a longer chunk) S0341L01 "मैं किसी से मिला था" →
//       "I met someone" — and that direction is not a ZUT defect: the learner is prompted
//       in Hindi, and each prompt still has one answer. It is reported, not acted on.
//   (b) NOT MISLEADING. The resulting LEGO and all 14 phrases read as grammatical, natural
//       English a learner taught to seed 128 would produce from the Hindi (list in PHRASES).
//
// WHAT IT DOES: sets S0128L02.target_text = "someone"; rewrites the 14 phrases that quote
// the gloss (13 under seed 128, and S0140L01U03, a USE phrase in seed 140 that reused the
// chunk) and leaves each unchecked (qa_checked NULL); unapproves seeds 128 and 140 (an edit
// unapproves a seed — Kai's rule; 140 is touched only because its phrase is). No presentation
// quotes the English gloss: the S0128L02 intro clip is Hindi (voice eve) and is already on
// the stale-intro list for re-authoring before the Kriti render.
//
// AUDIO: nothing is rendered here. trg_null_phrase_audio_on_text_change unlinks the 28
// Cartesia clips that speak "(who)" (14 target1 + 14 target2) because no same-voice clip of
// the new text exists — older xai/azure clips of "to meet someone" etc. are a different voice
// and are NOT relinked — and records each drop in content_audio_link_drops. The empty slots
// are filled by phase8 /generate when the English render runs (all Charlotte, per Kai
// 2026-09-23). trg_null_lego_audio_on_text_change drops the S0128L02 presentation link
// (a presentation clip is not text-addressable) and records that too. The pending
// audio_pass_requests row is APPENDED to, never replaced.
//
// Left alone on purpose: S0128L01 "आप ( ) की तरह हैं" — a separate open item.
//
// Identity: serviceIdentity + recordContentEdit (SQL-side sweep, outside the HTTP gate).
// Dry run by default; --apply writes. Evidence JSON goes to ~/ssi-evidence.
//
//   node tools/course-optimization/eng-for-hin-seed-128-strip-who-2026-09-23.cjs
//   node tools/course-optimization/eng-for-hin-seed-128-strip-who-2026-09-23.cjs --apply

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
const { createClient } = require('@supabase/supabase-js');
const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
const { snapshotSeeds } = require('../../services/course-builder/lib/redo-snapshot.cjs');
const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
const { checkLegoConflict, checkPhraseZUT } = require('../../services/course-builder/lib/validation.cjs');
const { evidencePath } = require('../lib/evidence-path.cjs');

const COURSE = 'eng_for_hin';
const SWEEP = 'eng-for-hin-seed-128-strip-who-2026-09-23';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const RULING = 'Kai, 2026-09-23 (job #866): strip the "(who)" gloss from S0128L02 "someone (who)" to plain "someone", conditional on no ZUT clash and the English reading naturally — both verified live';

/** Anything the target-side voice would read out as an annotation. */
const SPOKEN_ANNOTATION = /[()\[\]+/]/;
const GLOSS = /\s*\(who\)/gi;

/** The one text transform this tool applies. */
function stripWho(text) {
  return String(text).replace(GLOSS, '').replace(/\s{2,}/g, ' ').trim();
}

const LEGO = { legoId: 'S0128L02', seed: 128, idx: 2, known: 'एक ऐसे व्यक्ति', from: 'someone (who)', to: 'someone' };

// Every phrase in the course whose target quotes the gloss (14 rows, read live 2026-09-23).
// `from` is the exact live text; the tool refuses to act on anything else.
const PHRASES = [
  { id: `${COURSE}:S0128L02B01`, seed: 128, known: 'एक ऐसे व्यक्ति से मिलना', from: 'to meet someone (who)' },
  { id: `${COURSE}:S0128L02B02`, seed: 128, known: 'एक ऐसे व्यक्ति को देखना', from: 'to see someone (who)' },
  { id: `${COURSE}:S0128L02B03`, seed: 128, known: 'एक ऐसे व्यक्ति को सुनना', from: 'to hear someone (who)' },
  { id: `${COURSE}:S0128L02U01`, seed: 128, known: 'मैं एक ऐसे व्यक्ति से मिलना चाहता हूँ।', from: 'i want to meet someone (who)' },
  { id: `${COURSE}:S0128L02U02`, seed: 128, known: 'हम एक ऐसे व्यक्ति को देखना चाहते हैं।', from: 'we want to see someone (who)' },
  { id: `${COURSE}:S0128L02U03`, seed: 128, known: 'आप एक ऐसे व्यक्ति की तरह हैं।', from: "you're like someone (who)" },
  { id: `${COURSE}:S0128L02U04`, seed: 128, known: 'वह एक ऐसे व्यक्ति से मिलना चाहती है।', from: 'she wants to meet someone (who)' },
  { id: `${COURSE}:S0128L02U05`, seed: 128, known: 'मुझे यकीन नहीं है कि मैं एक ऐसे व्यक्ति से मिलना चाहता हूँ।', from: "i'm not sure if i want to meet someone (who)" },
  { id: `${COURSE}:S0128L03B01`, seed: 128, known: 'एक ऐसा व्यक्ति जिसे मैं पहले जानता था', from: 'someone (who) i used to know' },
  { id: `${COURSE}:S0128L03U01`, seed: 128, known: 'मैं एक ऐसे व्यक्ति से मिलना चाहता हूँ जिसे मैं पहले जानता था।', from: 'i want to meet someone (who) i used to know' },
  { id: `${COURSE}:S0128L03U02`, seed: 128, known: 'मुझे लगता है आप एक ऐसे व्यक्ति की तरह हैं जिसे मैं पहले जानता था।', from: "i think you're like someone (who) i used to know" },
  { id: `${COURSE}:S0128L03U04`, seed: 128, known: 'मुझे यकीन नहीं है कि आप एक ऐसे व्यक्ति की तरह हैं जिसे मैं पहले जानता था।', from: "i'm not sure if you're like someone (who) i used to know" },
  { id: `${COURSE}:S0128L03U05`, seed: 128, known: 'इसीलिए आप एक ऐसे व्यक्ति की तरह हैं जिसे मैं पहले जानता था।', from: "that is why you're like someone (who) i used to know" },
  { id: `${COURSE}:S0140L01U03`, seed: 140, known: 'मैं एक ऐसे व्यक्ति को नहीं देख सकता।', from: "I can't see someone (who)" },
].map(p => ({ ...p, to: stripWho(p.from) }));

const SEEDS = [...new Set(PHRASES.map(p => p.seed))].sort((a, b) => a - b); // [128, 140]
const AUDIO_COLS = ['known_audio_id', 'target1_audio_id', 'target2_audio_id', 'presentation_audio_id'];
const norm = (s) => (s || '').toLowerCase().trim().replace(/[.,!?;:।]+$/, '');

function supa() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
}

/** The exact live state this tool was written against, or a list of reasons not to proceed. */
async function guard(sb) {
  const problems = [];
  const { data: lego, error: le } = await sb.from('course_legos')
    .select('id, lego_id, is_new, known_text, target_text, presentation_audio_id, known_audio_id, target1_audio_id, target2_audio_id')
    .eq('course_code', COURSE).eq('seed_number', LEGO.seed).eq('lego_index', LEGO.idx).single();
  if (le || !lego) problems.push(`${LEGO.legoId}: ${le ? le.message : 'missing'}`);
  else {
    if (lego.target_text !== LEGO.from) problems.push(`${LEGO.legoId} target is "${lego.target_text}", expected "${LEGO.from}"`);
    if (lego.known_text !== LEGO.known) problems.push(`${LEGO.legoId} known is "${lego.known_text}", expected "${LEGO.known}"`);
  }
  const { data: rows, error: pe } = await sb.from('course_practice_phrases')
    .select('id, seed_number, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id, qa_checked')
    .eq('course_code', COURSE).in('id', PHRASES.map(p => p.id));
  if (pe) problems.push(`phrases: ${pe.message}`);
  const byId = new Map((rows || []).map(r => [r.id, r]));
  for (const p of PHRASES) {
    const r = byId.get(p.id);
    if (!r) { problems.push(`${p.id}: missing`); continue; }
    if (r.target_text !== p.from) problems.push(`${p.id} target is "${r.target_text}", expected "${p.from}"`);
    if (r.known_text !== p.known) problems.push(`${p.id} known is "${r.known_text}", expected "${p.known}"`);
  }
  // Completeness: no row anywhere in the course quotes the gloss that this tool does not name.
  const { data: others } = await sb.from('course_practice_phrases').select('id, target_text')
    .eq('course_code', COURSE).ilike('target_text', '%(who)%');
  for (const o of others || []) if (!PHRASES.some(p => p.id === o.id)) problems.push(`unlisted phrase quotes the gloss: ${o.id} "${o.target_text}"`);
  const { data: otherLegos } = await sb.from('course_legos').select('lego_id, target_text')
    .eq('course_code', COURSE).ilike('target_text', '%(who)%');
  for (const o of otherLegos || []) if (o.lego_id !== LEGO.legoId) problems.push(`unlisted LEGO quotes the gloss: ${o.lego_id} "${o.target_text}"`);
  const { data: seeds } = await sb.from('course_seeds').select('seed_number, approved_at, status')
    .eq('course_code', COURSE).in('seed_number', SEEDS);
  const { data: audio } = await sb.from('course_audio').select('id, role, voice_id, text')
    .eq('course_code', COURSE).ilike('text', '%(who)%').order('text');
  return { problems, state: { lego, phrases: PHRASES.map(p => byId.get(p.id)), seeds: seeds || [], audio: audio || [] } };
}

/** The live ZUT gates plus a course-wide sweep unbounded by seed number. Returns blocking findings. */
async function zutGates(sb) {
  const findings = [];
  const olds = new Set([LEGO.from, ...PHRASES.map(p => p.from)].map(norm));
  const { data: allLegos } = await sb.from('course_legos').select('lego_id, is_new, known_text, target_text').eq('course_code', COURSE);

  // (a1) live LEGO gate, backwards from seed 128, on the new pair.
  const live = await checkLegoConflict(sb, COURSE, LEGO.known, LEGO.to, LEGO.seed);
  if (live.conflict === 'zut') findings.push(`${LEGO.legoId} "${LEGO.known}": live LEGO gate — ${live.error}`);
  const verdict = live.conflict === 'duplicate' ? `duplicate of ${live.legoId}` : live.conflict ? live.conflict : 'no earlier LEGO with this known text';

  // (a2) course-wide, any seed: same Hindi → a different English is a fork the learner meets.
  const forks = (allLegos || []).filter(l => l.lego_id !== LEGO.legoId && norm(l.known_text) === norm(LEGO.known) && norm(l.target_text) !== norm(LEGO.to));
  for (const l of forks) findings.push(`${LEGO.legoId} "${LEGO.known}": course-wide — ${l.lego_id} "${l.known_text}" → "${l.target_text}"`);

  // (a3) the reverse direction, reported not blocked: other Hindi → bare "someone".
  const sameTarget = (allLegos || []).filter(l => l.lego_id !== LEGO.legoId && norm(l.target_text) === norm(LEGO.to));
  console.log(`  ${LEGO.legoId}  "${LEGO.known}"  "${LEGO.from}" → "${LEGO.to}"   LEGO gate: ${verdict}; course-wide forks: ${forks.length}; other LEGOs → "${LEGO.to}": ${sameTarget.length ? sameTarget.map(l => `${l.lego_id} "${l.known_text}"${l.is_new ? '' : ' (dup)'}`).join(', ') : 'none'} (different Hindi, one answer each — not a ZUT defect)`);

  // (a4) live phrase gate on every new pair, whole course; a hit against the very text this
  // tool is replacing is the row itself, not a collision.
  const hits = (await checkPhraseZUT(sb, COURSE, PHRASES.map(p => ({ known: p.known, target: p.to })), null))
    .filter(h => !olds.has(norm(h.existing_target)));
  for (const h of hits) findings.push(`"${h.known}" → "${h.new_target}": phrase gate — seed ${h.existing_seed} already says "${h.existing_target}"`);
  console.log(`  phrase gate over ${PHRASES.length} new pairs: ${hits.length ? hits.length + ' collision(s)' : 'clean'}`);
  return findings;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const sb = supa();
  console.log(`\n══════ ${COURSE}: seed 128 "someone (who)" → "someone" ══════`);
  const { problems, state } = await guard(sb);
  for (const p of problems) console.error(`BLOCKED  ${p}`);
  if (problems.length) { console.error('\nBLOCKED — the live state is not what this tool was written against. Nothing written.'); process.exit(1); }
  console.log('guard: live state is exactly what this tool was written against\n');

  console.log('ZUT, the live gates plus a course-wide sweep:');
  const findings = await zutGates(sb);
  for (const f of findings) console.error(`  ZUT  ${f}`);
  if (findings.length) { console.error('\nBLOCKED — a ZUT gate refused. Nothing written.'); process.exit(1); }
  console.log('ZUT: clean\n');

  console.log(`${LEGO.legoId}  "${LEGO.known}" → "${LEGO.from}"  becomes  "${LEGO.to}"`);
  for (const p of PHRASES) console.log(`    ${p.id}  "${p.known}" → "${p.from}"  becomes  "${p.to}"  (qa_checked NULL)`);
  for (const s of state.seeds) console.log(`    seed ${s.seed_number}: ${s.approved_at ? 'approved → unapproved' : 'already unapproved'}`);
  console.log(`    clips speaking the gloss: ${state.audio.length} (${state.audio.filter(a => a.role === 'target1').length} target1, ${state.audio.filter(a => a.role === 'target2').length} target2) — unlinked by trigger, re-rendered by the English pass`);
  console.log(`    ${LEGO.legoId} presentation link: ${state.lego.presentation_audio_id || 'none'} (Hindi intro, not text-addressable — the trigger drops it; already on the stale-intro list)`);

  const out = { sweep: SWEEP, apply, at: new Date().toISOString(), ruling: RULING, lego: LEGO, phrases: PHRASES, seeds: state.seeds, clips_before: state.audio, events: [], snapshots: [], drops: [] };
  if (!apply) {
    const ev = evidencePath(`tools/course-optimization/${SWEEP}-dryrun.json`);
    fs.writeFileSync(ev, JSON.stringify(out, null, 1));
    console.log(`\nDRY RUN — nothing written. Re-run with --apply. evidence: ${ev}`);
    return;
  }

  // ─── apply ────────────────────────────────────────────────────────────────
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const snap = await snapshotSeeds(sb, COURSE, SEEDS, { reason: 'strip-who-gloss', notes: `${RULING}. Sweep ${SWEEP}. Undo: POST /api/build/redo-undo/${COURSE}.` });
  out.snapshots.push(snap);
  const eventId = await recordContentEdit(sb, {
    identity, courseCode: COURSE, surface: SURFACE, operation: 'strip-spoken-gloss',
    scope: { seed_numbers: SEEDS, lego_ids: [LEGO.legoId], phrase_ids: PHRASES.map(p => p.id), rows: 1 + PHRASES.length + SEEDS.length },
    detail: { ruling: RULING, lego: LEGO, phrases: PHRASES.map(p => ({ id: p.id, from: p.from, to: p.to })), snapshot_batch: snap.batchId, clips_unlinked: state.audio.map(a => a.id) },
  });
  out.events.push(eventId);
  console.log(`\nedit event ${eventId}; snapshot batch ${snap.batchId}`);

  const dropsFor = async (table, rowId, label) => {
    const { data: drops } = await sb.from('content_audio_link_drops').select('column_name, old_audio_id, new_audio_id, old_text, reason')
      .eq('table_name', table).eq('row_id', rowId).order('dropped_at', { ascending: false }).limit(8);
    for (const d of drops || []) if (d.old_audio_id) out.drops.push({ where: `${label}.${d.column_name}`, clip: d.old_audio_id, why: `${d.reason} (spoke "${d.old_text}")${d.new_audio_id ? ` → relinked to ${d.new_audio_id}` : ''}` });
  };

  const { error: le } = await sb.from('course_legos').update({ target_text: LEGO.to, last_edit_event_id: eventId })
    .eq('course_code', COURSE).eq('seed_number', LEGO.seed).eq('lego_index', LEGO.idx);
  if (le) throw new Error(`${LEGO.legoId}: ${le.message}`);
  await dropsFor('course_legos', state.lego.id, LEGO.legoId);
  console.log(`${LEGO.legoId} → "${LEGO.to}"`);

  for (const p of PHRASES) {
    const { error: pe } = await sb.from('course_practice_phrases').update({ target_text: p.to, qa_checked: null, last_edit_event_id: eventId })
      .eq('course_code', COURSE).eq('id', p.id);
    if (pe) throw new Error(`${p.id}: ${pe.message}`);
    await dropsFor('course_practice_phrases', p.id, p.id);
    console.log(`${p.id} → "${p.to}" (unchecked)`);
  }

  const { error: se } = await sb.from('course_seeds').update({ approved_at: null, last_edit_event_id: eventId })
    .eq('course_code', COURSE).in('seed_number', SEEDS);
  if (se) throw new Error(`seeds ${SEEDS.join(',')}: ${se.message}`);
  console.log(`seeds ${SEEDS.join(', ')} unapproved`);

  await refreshNow();
  console.log('course_round_index refreshed');

  // APPEND to the pending audio-pass request — never create a second, never overwrite.
  const { data: pending } = await sb.from('audio_pass_requests').select('id, reason, metadata')
    .eq('course_code', COURSE).eq('status', 'pending').maybeSingle();
  if (!pending) throw new Error(`no pending audio-pass request for ${COURSE} — NOT creating one; queue by hand with queue-audio-pass.cjs`);
  const mine = `seed 128 "(who)" gloss stripped — ${state.audio.length} English clips (S0128L02 basket, S0128L03 basket, S0140L01U03) to re-render in Charlotte (Kai, job #866, 2026-09-23)`;
  const { error: qe } = await sb.from('audio_pass_requests').update({
    reason: `${pending.reason} + ${mine}`,
    metadata: { ...pending.metadata, job866StripWho: { editEventId: eventId, lego: LEGO.legoId, phrases: PHRASES.map(p => p.id), clipsUnlinked: state.audio.map(a => a.id) } },
    updated_at: new Date().toISOString(),
  }).eq('id', pending.id);
  if (qe) throw new Error(`audio-pass append: ${qe.message}`);
  console.log(`audio pass: appended to pending request ${pending.id}`);

  console.log(`\nAUDIO LINKS DROPPED — ${out.drops.length}, listed in full:`);
  for (const d of out.drops) console.log(`    ${d.where}  ${d.clip}  — ${d.why}`);
  const ev = evidencePath(`tools/course-optimization/${SWEEP}.json`);
  fs.writeFileSync(ev, JSON.stringify(out, null, 1));
  console.log(`evidence: ${ev}`);
}

module.exports = { LEGO, PHRASES, SEEDS, SPOKEN_ANNOTATION, stripWho };

if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
