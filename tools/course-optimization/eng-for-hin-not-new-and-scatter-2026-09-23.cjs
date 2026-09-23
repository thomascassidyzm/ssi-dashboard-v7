#!/usr/bin/env node
'use strict';
// eng_for_hin — Kai's ruling of 2026-09-23 (job #833·F), two parts, one sweep:
//
//  PART 1 — FIRST OCCURRENCE WINS. S0041L01 ("लेकिन / but") and S0240L02 ("बोलना बंद करना /
//  to stop talking") are NOT new: seed 19 (rebuilt 22 Sept from Shuchita's reviewed text)
//  teaches both first, at S0019L01 and S0019L02. Each is set is_new=false and its seed is
//  made consistent with the estate convention for a duplicate LEGO (152 in this course,
//  all with no presentation and no phrases; the learner bundle reads is_new=true only;
//  POST /v2/phrases refuses phrases on a duplicate): its presentation link is cleared
//  (the intro clip stays in course_audio — nothing is deleted from storage) and its 8
//  build/use phrases are removed AFTER a seed_redo_snapshots snapshot of the whole seed,
//  so POST /api/build/redo-undo can put them back. Both seeds are unapproved: an edit
//  unapproves (Kai's rule), and Shuchita re-reviews what changed.
//
//  PART 2 — PRACTISE THE SEED-12/19 LEGOS THROUGH THE COURSE. The 26 scatter USE phrases
//  drafted by #701·H and verified by #703·F (P09 dropped) are ADDED under their host LEGOs
//  in later seeds, never replacing anything. Every phrase contains its host LEGO and the
//  practised chunk; the live gates (vocab at host seed, containment, ZUT, length) were
//  replayed on this checkout on 2026-09-23 and all 26 passed. Host seeds are unapproved so
//  the new lines reach Shuchita's proofreading queue. Audio is NOT rendered here: the new
//  rows have NULL audio ids and phase8 /generate fills them in the configured voices.
//
//  Identity: serviceIdentity + recordContentEdit (this is a SQL-side sweep, outside the HTTP
//  gate). Dry run by default; --apply writes. Evidence JSON goes to ~/ssi-evidence.
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql') });
const { createClient } = require('@supabase/supabase-js');
const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
const { decoratePhrasesWithDecomposition } = require('../../services/phrase-decomposition-writer.cjs');
const { snapshotSeeds } = require('../../services/course-builder/lib/redo-snapshot.cjs');
const { makePhraseId, computeLegoPosition } = require('../../services/course-builder/lib/phrase-structure.cjs');
const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
const { evidencePath } = require('../lib/evidence-path.cjs');

const COURSE = 'eng_for_hin';
const SWEEP = 'eng-for-hin-not-new-and-scatter-2026-09-23';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const RULING = "Kai, 2026-09-23: S0041L01 'but' and S0240L02 'to stop talking' are not new — first occurrence (S0019L01, S0019L02) wins; scatter the seed-12/19 LEGOs through the course, add not replace";
const NOT_NEW = [
  { lego_id: 'S0041L01', seed: 41, idx: 1, first: 'S0019L01', target: 'but' },
  { lego_id: 'S0240L02', seed: 240, idx: 2, first: 'S0019L02', target: 'to stop talking' },
];
const APPLY = process.argv.includes('--apply');
const PROPOSALS = process.env.PROPOSALS
  || path.join(process.env.HOME, 'ssi-evidence/ssi-dashboard-v7/scripts/eng_for_hin-scatter-12-19-proposals-2026-09-22.json');
const DROPPED = new Set(['P09']); // #703·F: जल्द ही inside a negated wish reads as a calque

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data; };

async function partOne(identity, out) {
  for (const d of NOT_NEW) {
    const lego = must(await supabase.from('course_legos').select('lego_id,is_new,known_text,target_text,presentation_audio_id')
      .eq('course_code', COURSE).eq('seed_number', d.seed).eq('lego_index', d.idx).single(), d.lego_id);
    const first = must(await supabase.from('course_legos').select('lego_id,is_new,target_text').eq('course_code', COURSE).eq('lego_id', d.first).single(), d.first);
    if (!first.is_new || first.target_text !== d.target) throw new Error(`${d.first} is not the live first occurrence of "${d.target}" — refusing`);
    if (lego.target_text !== d.target) throw new Error(`${d.lego_id} target is "${lego.target_text}", expected "${d.target}" — refusing`);
    const phrases = must(await supabase.from('course_practice_phrases').select('id,position,phrase_role,known_text,target_text')
      .eq('course_code', COURSE).eq('seed_number', d.seed).eq('lego_index', d.idx).order('position'), `${d.lego_id} phrases`);
    out.notNew.push({ ...d, was_is_new: lego.is_new, presentation_audio_id: lego.presentation_audio_id, phrases_removed: phrases.map(p => ({ id: p.id, known: p.known_text, target: p.target_text })) });
    console.log(`${d.lego_id} "${lego.known_text}" → "${lego.target_text}": is_new ${lego.is_new} → false; first occurrence ${d.first} confirmed; ${phrases.length} phrases to remove; presentation link ${lego.presentation_audio_id ? 'cleared' : 'already null'}`);
    if (!APPLY) continue;

    const snap = await snapshotSeeds(supabase, COURSE, [d.seed], { reason: 'not-new-ruling', notes: `${RULING}. Sweep ${SWEEP}: ${d.lego_id} is_new→false, presentation link cleared, ${phrases.length} phrases removed. Undo: POST /api/build/redo-undo/${COURSE} seed ${d.seed}.` });
    out.snapshots.push(snap);
    const eventId = await recordContentEdit(supabase, {
      identity, courseCode: COURSE, surface: SURFACE, operation: 'lego-not-new',
      scope: { seed_numbers: [d.seed], lego_ids: [d.lego_id], phrase_ids: phrases.map(p => p.id), rows: 1 + phrases.length },
      detail: { ruling: RULING, first_occurrence: d.first, before: { is_new: lego.is_new, presentation_audio_id: lego.presentation_audio_id, phrases: phrases.length }, snapshot_batch: snap.batchId },
    });
    if (phrases.length) {
      const del = await supabase.from('course_practice_phrases').delete({ count: 'exact' })
        .eq('course_code', COURSE).eq('seed_number', d.seed).eq('lego_index', d.idx);
      must(del, `${d.lego_id} delete phrases`);
      if (del.count !== phrases.length) throw new Error(`${d.lego_id}: deleted ${del.count}, expected ${phrases.length}`);
    }
    must(await supabase.from('course_legos').update({ is_new: false, presentation_audio_id: null, last_edit_event_id: eventId })
      .eq('course_code', COURSE).eq('seed_number', d.seed).eq('lego_index', d.idx), `${d.lego_id} update`);
    must(await supabase.from('course_seeds').update({ approved_at: null, last_edit_event_id: eventId })
      .eq('course_code', COURSE).eq('seed_number', d.seed), `seed ${d.seed} unapprove`);
    out.events.push(eventId);
  }
}

async function partTwo(identity, out) {
  const doc = JSON.parse(fs.readFileSync(PROPOSALS, 'utf8'));
  const proposals = doc.phrases.filter(p => !DROPPED.has(p.id));
  if (proposals.length !== 26) throw new Error(`expected 26 proposals after dropping P09, got ${proposals.length}`);
  const byHost = new Map();
  for (const p of proposals) { if (!byHost.has(p.host)) byHost.set(p.host, []); byHost.get(p.host).push(p); }

  const rows = [];
  const hostSeeds = new Set();
  for (const [hostId, ps] of byHost) {
    const seed = parseInt(hostId.slice(1, 5), 10), idx = parseInt(hostId.slice(6, 8), 10);
    const host = must(await supabase.from('course_legos').select('lego_id,is_new,target_text,known_text').eq('course_code', COURSE).eq('seed_number', seed).eq('lego_index', idx).single(), hostId);
    if (!host.is_new) throw new Error(`${hostId} is a duplicate lego — a duplicate carries no phrases`);
    for (const p of ps) {
      if (host.target_text !== p.host_target) throw new Error(`${p.id}: host ${hostId} target "${host.target_text}" ≠ proposal "${p.host_target}"`);
      const prac = must(await supabase.from('course_legos').select('lego_id,seed_number,target_text').eq('course_code', COURSE).eq('lego_id', p.practises).single(), p.practises);
      if (prac.target_text !== p.practises_target || prac.seed_number >= seed) throw new Error(`${p.id}: practised lego ${p.practises} mismatch or not earlier than host`);
      const norm = s => s.toLowerCase().replace(/[^\p{L}\p{N}' ]/gu, ' ').replace(/\s+/g, ' ').trim();
      if (!norm(p.target).includes(norm(host.target_text)) || !norm(p.target).includes(norm(prac.target_text))) throw new Error(`${p.id}: containment failed`);
    }
    const existing = must(await supabase.from('course_practice_phrases').select('id,position,phrase_role,target_text,known_text')
      .eq('course_code', COURSE).eq('seed_number', seed).eq('lego_index', idx).order('position'), `${hostId} phrases`);
    let useCount = existing.filter(e => e.phrase_role === 'use').length;
    let position = existing.reduce((m, e) => Math.max(m, e.position), 0);
    for (const p of ps) {
      const clash = must(await supabase.from('course_practice_phrases').select('id').eq('course_code', COURSE).or(`target_text.eq.${JSON.stringify(p.target)},known_text.eq.${JSON.stringify(p.known)}`).limit(1), 'dup check');
      if (clash.length) throw new Error(`${p.id}: "${p.target}" / "${p.known}" already exists as ${clash[0].id}`);
      useCount += 1; position += 1;
      rows.push({
        id: makePhraseId(COURSE, seed, idx, 'use', useCount),
        course_code: COURSE, seed_number: seed, lego_index: idx, position,
        known_text: p.known, target_text: p.target,
        word_count: p.target.length,                                // v2 convention (character length)
        lego_count: (p.known.match(/\s+/g) || []).length + 1,      // v2 convention (known-side word count)
        phrase_role: 'use', introduce: true,
        connected_lego_ids: [p.practises],
        lego_position: computeLegoPosition(p.target, host.target_text),
        metadata: { format: 'build_use', pipeline: 'scatter', practises: p.practises, proposal: p.id, why: p.why, source: 'drafted #701·H 2026-09-22, verified #703·F, ruled by Kai 2026-09-23 (job #833·F)' },
        status: 'draft', version: 1,
      });
      hostSeeds.add(seed);
      console.log(`${p.id} → ${rows[rows.length - 1].id} (pos ${position}) under ${hostId} "${host.target_text}", practises ${p.practises}: ${p.known} → ${p.target}`);
    }
  }
  out.scatter = rows.map(r => ({ id: r.id, host: `S${String(r.seed_number).padStart(4, '0')}L${String(r.lego_index).padStart(2, '0')}`, practises: r.connected_lego_ids[0], known: r.known_text, target: r.target_text }));
  out.hostSeeds = [...hostSeeds].sort((a, b) => a - b);
  console.log(`${rows.length} phrases across ${byHost.size} host LEGOs in ${hostSeeds.size} seeds: ${out.hostSeeds.join(', ')}`);
  if (!APPLY) return;

  const eventId = await recordContentEdit(supabase, {
    identity, courseCode: COURSE, surface: SURFACE, operation: 'phrases-write',
    scope: { seed_numbers: out.hostSeeds, phrase_ids: rows.map(r => r.id), rows: rows.length },
    detail: { ruling: RULING, practises: ['S0012L01', 'S0012L02', 'S0012L03', 'S0019L01', 'S0019L02'], dropped: [...DROPPED] },
  });
  out.events.push(eventId);
  const stamped = rows.map(r => ({ ...r, last_edit_event_id: eventId }));
  must(await supabase.from('course_practice_phrases').insert(stamped), 'insert scatter phrases');
  await decoratePhrasesWithDecomposition(supabase, stamped);
  must(await supabase.from('course_seeds').update({ approved_at: null, last_edit_event_id: eventId })
    .eq('course_code', COURSE).in('seed_number', out.hostSeeds), 'unapprove host seeds');
}

(async () => {
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const out = { sweep: SWEEP, apply: APPLY, at: new Date().toISOString(), ruling: RULING, notNew: [], snapshots: [], events: [], scatter: [], hostSeeds: [] };
  console.log(APPLY ? '=== APPLY ===' : '=== DRY RUN (nothing written) ===');
  await partOne(identity, out);
  await partTwo(identity, out);
  if (APPLY) {
    await refreshNow();
    console.log('course_round_index refreshed');
  }
  const ev = evidencePath(`tools/course-optimization/${SWEEP}${APPLY ? '' : '-dryrun'}.json`);
  fs.writeFileSync(ev, JSON.stringify(out, null, 1));
  console.log(`evidence: ${ev}`);
})().catch(e => { console.error('SWEEP FAILED:', e.message); process.exit(2); });
