#!/usr/bin/env node
'use strict';
// ita_for_eng — audio follow-up to ita-stranded-subjunctive-legos-2026-09-28.cjs (job #520).
//
// After that tool re-texted 24 LEGOs and 92 phrases, phase8 /generate (roles target1+target2,
// Azure Elsa/Benigno, the course's voices of record) filled the empty Italian slots. Two of
// its own behaviours then left the touched rows wrong, measured live 2026-09-28:
//
//   1. ANY-VOICE REUSE (A-137, Tom 2026-09-26: known and target are not told apart) answered
//      77 target2 slots with an existing ELSA clip of the same text (and one xAI 'ara' clip)
//      instead of rendering Benigno. target1 and target2 are now the SAME voice on those rows,
//      which is the one slot defect Kai names (a slot whose voice changes partway through a
//      course). Reuse has a documented per-request escape hatch — {reuse:false} — and this
//      tool unlinks those 77 links so a reuse-off pass renders Benigno into them. The reused
//      course_audio rows are pointer rows to shared S3 objects; they are left in place,
//      unlinked, never deleted.
//
//   2. THE PRESENTATION RELINKER matches by lego_id, not text (phase8 linkAudioIds), so the
//      moment the text-change trigger dropped the 24 stale intro links (recorded as
//      'nulled-presentation-not-text-addressable'), the next pass pointed 23 of them straight
//      back at the clip that still says "The Italian for: 'I'm ready' …". Following the pattern
//      of eng-for-hin-reauthor-intros-2026-09-24.cjs, a stale intro is unlinked at every place
//      the player resolves one from — course_legos.presentation_audio_id, lego_introductions,
//      and the stale clip's own lego_id — each drop logged, nothing deleted from S3. Fresh intro
//      TEXT is then inserted by phase8 /prepare-presentations-scoped (template, no LLM) and
//      rendered by /generate — by the caller, not here, because the render voice is decided by
//      the language cast and the brief is Azure-only.
//
// OUTCOME, applied 2026-09-28 (read this before re-running part 1): the 77 target2 links were
// cleared, but a phase8 FILL PASS reuses any-voice clips UNCONDITIONALLY — reuse:false is logged
// and ignored on /generate by Tom's ruling (job #383: "fresh bytes are what /regenerate-* is
// for") — so the next fill pass pointed the same slots back at the same Elsa rows. Part 1 is
// therefore a no-op against the estate's design; the 72 Elsa-voiced target2 slots in these
// seeds are REPORTED to Kai, and fresh Benigno bytes would need a /regenerate-* call that a
// person authorises. Part 2 (stale intros) stood: 23 fresh intro texts were inserted by
// /prepare-presentations-scoped and await a render whose voice is the English cast's.
//
// Dry run by default; --apply writes. Identity: serviceIdentity + recordContentEdit.
//
//   node tools/course-optimization/ita-stranded-subjunctive-audio-followup-2026-09-28.cjs
//   node tools/course-optimization/ita-stranded-subjunctive-audio-followup-2026-09-28.cjs --apply

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
const { createClient } = require('@supabase/supabase-js');
const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
const { evidencePath } = require('../lib/evidence-path.cjs');
const { SEEDS } = require('./ita-stranded-subjunctive-legos-2026-09-28.cjs');

const COURSE = 'ita_for_eng';
const SWEEP = 'ita-stranded-subjunctive-audio-followup-2026-09-28';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const JOB = '#520';
const TARGET2_VOICE = 'azure_it-IT-BenignoNeural';
/** Legacy rows spell the same Azure voice without its provider prefix; both are Benigno. */
const isTarget2Voice = (v) => String(v || '').replace(/^azure_/, '') === TARGET2_VOICE.replace(/^azure_/, '');
const SEED_NUMBERS = SEEDS.map(S => S.seed);
/** LEGOs whose English gloss the content tool changed: their intro quotes the old gloss. */
const REGLOSSED = SEEDS.flatMap(S => (S.legos?.update || []).filter(u => u.from.known !== u.to.known).map(u => `S${String(S.seed).padStart(4, '0')}L${String(u.idx).padStart(2, '0')}`));

const quoted = (text) => { const m = /: '([^']*(?:'[^,]*)?)', (?:as in|is)/.exec(String(text || '')); return m ? m[1] : null; };

function supa() { return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } }); }
const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data; };

async function main() {
  const apply = process.argv.includes('--apply');
  const sb = supa();
  console.log(`\n══════ ${COURSE}: audio follow-up for the stranded-subjunctive pass ══════`);

  // ── 1. target2 slots answered by a wrong-voice reuse ──────────────────────────────────
  const phrases = must(await sb.from('course_practice_phrases').select('id, seed_number, lego_index, target_text, target2_audio_id').eq('course_code', COURSE).in('seed_number', SEED_NUMBERS).not('target2_audio_id', 'is', null), 'phrases');
  const legos = must(await sb.from('course_legos').select('id, lego_id, seed_number, lego_index, is_new, known_text, target_text, target2_audio_id, presentation_audio_id').eq('course_code', COURSE).in('seed_number', SEED_NUMBERS), 'legos');
  const clipIds = [...new Set([...phrases.map(p => p.target2_audio_id), ...legos.map(l => l.target2_audio_id)].filter(Boolean))];
  const clips = new Map();
  for (let i = 0; i < clipIds.length; i += 200) for (const c of must(await sb.from('course_audio').select('id, voice_id, text, role, created_at').in('id', clipIds.slice(i, i + 200)), 'clips')) clips.set(c.id, c);
  const wrongT2 = [];
  for (const p of phrases) { const c = clips.get(p.target2_audio_id); if (c && !isTarget2Voice(c.voice_id)) wrongT2.push({ table: 'course_practice_phrases', row_id: p.id, seed: p.seed_number, label: p.id, clip: c, text: p.target_text }); }
  for (const l of legos) { const c = clips.get(l.target2_audio_id); if (c && !isTarget2Voice(c.voice_id)) wrongT2.push({ table: 'course_legos', row_id: l.id, seed: l.seed_number, label: l.lego_id, clip: c, text: l.target_text }); }
  const byVoice = {}; for (const w of wrongT2) byVoice[w.clip.voice_id] = (byVoice[w.clip.voice_id] || 0) + 1;
  console.log(`target2 slots in the 19 touched seeds not in ${TARGET2_VOICE}: ${wrongT2.length}  ${JSON.stringify(byVoice)}`);
  // Only links to clips that ARRIVED in this pass are ours to undo; older mixed-voice links are pre-existing and reported.
  const t0 = must(await sb.from('content_audio_link_drops').select('dropped_at').eq('course_code', COURSE).like('reason', 'nulled%').gte('dropped_at', new Date(Date.now() - 6 * 3600e3).toISOString()).order('dropped_at', { ascending: true }).limit(1), 'window')[0]?.dropped_at;
  const ours = wrongT2.filter(w => t0 && w.clip.created_at >= t0);
  const preexisting = wrongT2.filter(w => !ours.includes(w));
  console.log(`  ${ours.length} linked in this pass (clip created ≥ ${t0}) → unlink; ${preexisting.length} pre-existing mixed-voice link(s) left alone${preexisting.length ? ': ' + preexisting.map(w => `${w.label} ${w.clip.voice_id}`).join(', ') : ''}`);

  // ── 2. stale intros on the re-glossed LEGOs ──────────────────────────────────────────
  const reglossed = legos.filter(l => REGLOSSED.includes(l.lego_id));
  const presIds = reglossed.map(l => l.presentation_audio_id).filter(Boolean);
  const presClips = new Map();
  if (presIds.length) for (const c of must(await sb.from('course_audio').select('id, lego_id, text, voice_id, s3_key').in('id', presIds), 'pres clips')) presClips.set(c.id, c);
  const byLego = must(await sb.from('course_audio').select('id, lego_id, text, voice_id, s3_key').eq('course_code', COURSE).eq('role', 'presentation').in('lego_id', REGLOSSED), 'pres by lego');
  const intros = must(await sb.from('lego_introductions').select('id, lego_id, presentation_audio_id, audio_uuid').eq('course_code', COURSE).in('lego_id', REGLOSSED), 'intros');
  const stale = [];
  for (const l of reglossed) {
    const linked = l.presentation_audio_id ? presClips.get(l.presentation_audio_id) : null;
    const staleClips = byLego.filter(c => c.lego_id === l.lego_id && quoted(c.text) !== l.known_text && !(c.s3_key || '').startsWith('pending/'));
    if (linked && quoted(linked.text) !== l.known_text && !staleClips.some(c => c.id === linked.id)) staleClips.push(linked);
    const introRows = intros.filter(i => i.lego_id === l.lego_id);
    if (!linked && !staleClips.length && !introRows.length) continue;
    stale.push({ lego: l, linked, staleClips, introRows, mirrors: linked ? quoted(linked.text) === l.known_text : null });
  }
  console.log(`re-glossed LEGOs: ${REGLOSSED.length}; with a linked intro: ${stale.filter(s => s.linked).length}; linked intro quotes the CURRENT gloss: ${stale.filter(s => s.mirrors === true).length}; stale clips to detach: ${stale.reduce((n, s) => n + s.staleClips.length, 0)}; lego_introductions rows to retire: ${stale.reduce((n, s) => n + s.introRows.length, 0)}`);
  for (const s of stale) console.log(`  ${s.lego.lego_id}  now "${s.lego.known_text}"  intro says ${s.linked ? `"${quoted(s.linked.text)}"` : '(none linked)'}${s.staleClips.length ? `  detach ${s.staleClips.length}` : ''}${s.introRows.length ? `  retire ${s.introRows.length} intro row(s)` : ''}`);

  const out = { sweep: SWEEP, apply, at: new Date().toISOString(), window_from: t0, wrongT2: wrongT2.map(w => ({ ...w, clip: { id: w.clip.id, voice_id: w.clip.voice_id, created_at: w.clip.created_at } })), preexisting: preexisting.map(w => w.label), stale: stale.map(s => ({ lego: s.lego.lego_id, linked: s.linked?.id, linkedText: s.linked?.text, detach: s.staleClips.map(c => c.id), introRows: s.introRows.map(i => i.id) })), events: [] };
  if (!apply) {
    const ev = evidencePath(`tools/course-optimization/${SWEEP}-dryrun.json`);
    fs.writeFileSync(ev, JSON.stringify(out, null, 1));
    console.log(`\nDRY RUN — nothing written. Re-run with --apply. evidence: ${ev}`);
    return;
  }

  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const eventId = await recordContentEdit(sb, {
    identity, courseCode: COURSE, surface: SURFACE, operation: 'unlink-wrong-voice-and-stale-intro-audio',
    scope: { seed_numbers: SEED_NUMBERS, lego_ids: stale.map(s => s.lego.lego_id), rows: ours.length + stale.length },
    detail: { job: JOB, target2_unlinked: ours.map(w => ({ row: w.label, clip: w.clip.id, voice: w.clip.voice_id })), intros: out.stale },
  });
  out.events.push(eventId);
  console.log(`\nedit event ${eventId}`);

  const drops = [];
  for (const w of ours) {
    must(await sb.from(w.table).update({ target2_audio_id: null }).eq('course_code', COURSE).eq('id', w.row_id), w.label);
    drops.push({ table_name: w.table, row_id: w.row_id, course_code: COURSE, seed_number: w.seed, column_name: 'target2_audio_id', role: 'target2', old_audio_id: w.clip.id, new_audio_id: null, old_text: w.clip.text, new_text: w.text, old_voice_id: w.clip.voice_id, reason: `unlinked-wrong-voice-reuse: target2 voice of record is ${TARGET2_VOICE}; reuse answered with ${w.clip.voice_id} (job ${JOB}, event ${eventId})` });
  }
  console.log(`target2: ${ours.length} wrong-voice link(s) cleared`);

  for (const s of stale) {
    if (s.linked) {
      must(await sb.from('course_legos').update({ presentation_audio_id: null }).eq('course_code', COURSE).eq('id', s.lego.id), s.lego.lego_id);
      drops.push({ table_name: 'course_legos', row_id: s.lego.id, course_code: COURSE, seed_number: s.lego.seed_number, column_name: 'presentation_audio_id', role: 'presentation', old_audio_id: s.linked.id, new_audio_id: null, old_text: s.linked.text, new_text: s.lego.known_text, old_voice_id: s.linked.voice_id, reason: `stale-intro-unlinked: quotes "${quoted(s.linked.text)}", LEGO now "${s.lego.known_text}" (job ${JOB}, event ${eventId})` });
    }
    for (const c of s.staleClips) {
      must(await sb.from('course_audio').update({ lego_id: null }).eq('id', c.id), `detach ${c.id}`);
      drops.push({ table_name: 'course_audio', row_id: c.id, course_code: COURSE, seed_number: s.lego.seed_number, column_name: 'lego_id', role: 'presentation', old_audio_id: c.id, new_audio_id: null, old_text: c.text, new_text: s.lego.known_text, old_voice_id: c.voice_id, reason: `stale-intro-detached from ${s.lego.lego_id}: the relinker matches by lego_id, not text (job ${JOB}, event ${eventId})` });
    }
    if (s.introRows.length) {
      must(await sb.from('lego_introductions').delete().in('id', s.introRows.map(i => i.id)), `intro rows ${s.lego.lego_id}`);
      for (const i of s.introRows) drops.push({ table_name: 'lego_introductions', row_id: i.id, course_code: COURSE, seed_number: s.lego.seed_number, column_name: 'presentation_audio_id', role: 'presentation', old_audio_id: i.presentation_audio_id || i.audio_uuid || null, new_audio_id: null, old_text: null, new_text: s.lego.known_text, old_voice_id: null, reason: `stale-intro: legacy lego_introductions row retired for ${s.lego.lego_id}; phase8 re-populates on link (job ${JOB}, event ${eventId})` });
    }
  }
  for (let i = 0; i < drops.length; i += 200) must(await sb.from('content_audio_link_drops').insert(drops.slice(i, i + 200)), 'drop log');
  console.log(`intros: ${stale.filter(s => s.linked).length} stale link(s) cleared, ${stale.reduce((n, s) => n + s.staleClips.length, 0)} clip(s) detached, ${stale.reduce((n, s) => n + s.introRows.length, 0)} legacy intro row(s) retired; ${drops.length} drop(s) logged`);
  out.drops = drops.length;
  const ev = evidencePath(`tools/course-optimization/${SWEEP}.json`);
  fs.writeFileSync(ev, JSON.stringify(out, null, 1));
  console.log(`evidence: ${ev}\nNEXT: POST phase8 /generate {seeds, roles:[target2], reuse:false} then /prepare-presentations-scoped {seeds} and a presentation dry run to read the voice it would use.`);
}

if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
