#!/usr/bin/env node
'use strict';
// eng_for_hin — Kai's rule of 2026-09-23 14:31Z (job #875·F): "If we have a new known text
// with it, then it's new." A LEGO is a duplicate (is_new=false) ONLY if BOTH its Hindi
// (known) and its English (target) match an earlier is_new LEGO. The same English under a
// DIFFERENT Hindi stays NEW, with its phrases.
//
// This morning's sweep (eng-for-hin-not-new-and-scatter-2026-09-23.cjs, job #833·F) matched on
// English alone and set two LEGOs not-new:
//   S0041L01 लेकिन → but                : S0019L01 is लेकिन → but          SAME Hindi — stays not-new
//   S0240L02 बोलना बंद करना → to stop talking : S0019L02 is बात करना बंद करना    DIFFERENT — reversed here
//
// The S0240L02 reversal is BY HAND, not via POST /api/build/redo-undo: seed 240's L01/L03
// phrases gained audio pointers at 12:38 (after the 11:47 snapshot) and a whole-seed undo
// would strip them. So: is_new→true, the snapshot's presentation link put back, and the 8
// snapshot phrases re-inserted verbatim (same ids) then re-decomposed against the live
// vocabulary. The restored intro clip 40980855 still presents the WRONG chunk ('वह पसंद नहीं
// करते'), as it did before this morning — it stays on the re-author list, nothing is rendered.
// Seed 240 is unapproved: an edit unapproves (Kai's rule).
//
// The sweep half lists every not-new LEGO in the course with no earlier is_new LEGO matching
// on BOTH sides. It writes nothing for those: the older ones are Kai's call.
//
// Identity: serviceIdentity + recordContentEdit (SQL-side sweep, outside the HTTP gate).
// Dry run by default; --apply writes. Evidence JSON goes to ~/ssi-evidence.
const path = require('path');
const fs = require('fs');

const COURSE = 'eng_for_hin';
const SWEEP = 'eng-for-hin-not-new-both-sides-recheck-2026-09-23';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const RULING = "Kai, 2026-09-23 14:31Z: 'If we have a new known text with it, then it's new' — a LEGO is a duplicate only if BOTH Hindi and English match an earlier LEGO";
const SNAPSHOT_ID = '37224a9b-99bc-4be2-b979-892b5118826b'; // batch 1fe47f75-95ed-46b2-a9f3-76cc28393b90, seed 240, taken 11:47:06Z by #833
const RESTORE = { lego_id: 'S0240L02', seed: 240, idx: 2, known: 'बोलना बंद करना', target: 'to stop talking', twin: 'S0019L02', twin_known: 'बात करना बंद करना' };
const APPLY = process.argv.includes('--apply');

const norm = s => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
const before = (a, b) => a.seed_number < b.seed_number || (a.seed_number === b.seed_number && a.lego_index < b.lego_index);

// THE RULE. `earlier` is every is_new LEGO taught before `lego` (same course). A LEGO may be
// not-new only when one of them matches it on BOTH sides; English alone is not enough.
function isDuplicateLego(lego, earlier) {
  return earlier.some(e => e.is_new && before(e, lego) && norm(e.target_text) === norm(lego.target_text) && norm(e.known_text) === norm(lego.known_text));
}

// Every is_new=false LEGO with no both-sides twin, with the earlier same-English / same-Hindi
// LEGOs beside it so a reader can see which side differs.
function findMismatchedNotNew(legos) {
  const out = [];
  for (const l of legos) {
    if (l.is_new) continue;
    if (isDuplicateLego(l, legos)) continue;
    const sameEnglish = legos.filter(e => e.is_new && before(e, l) && norm(e.target_text) === norm(l.target_text));
    const sameHindi = legos.filter(e => e.is_new && before(e, l) && norm(e.known_text) === norm(l.known_text));
    out.push({ lego_id: l.lego_id, seed_number: l.seed_number, known_text: l.known_text, target_text: l.target_text, updated_at: l.updated_at,
      earlier_same_english: sameEnglish.map(e => ({ lego_id: e.lego_id, known_text: e.known_text })),
      earlier_same_hindi: sameHindi.map(e => ({ lego_id: e.lego_id, target_text: e.target_text })) });
  }
  return out.sort((a, b) => a.seed_number - b.seed_number || a.lego_id.localeCompare(b.lego_id));
}

module.exports = { isDuplicateLego, findMismatchedNotNew, RESTORE, SNAPSHOT_ID, norm };

if (require.main === module) main().catch(e => { console.error('SWEEP FAILED:', e.message); process.exit(2); });

async function main() {
  require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
  require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql') });
  const { createClient } = require('@supabase/supabase-js');
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const { decoratePhrasesWithDecomposition } = require('../../services/phrase-decomposition-writer.cjs');
  const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
  const { evidencePath } = require('../lib/evidence-path.cjs');

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data; };

  async function restoreS0240L02(identity, out) {
    const d = RESTORE;
    const lego = must(await supabase.from('course_legos').select('lego_id,is_new,known_text,target_text,presentation_audio_id,version')
      .eq('course_code', COURSE).eq('seed_number', d.seed).eq('lego_index', d.idx).single(), d.lego_id);
    const twin = must(await supabase.from('course_legos').select('lego_id,is_new,known_text,target_text').eq('course_code', COURSE).eq('lego_id', d.twin).single(), d.twin);
    if (lego.known_text !== d.known || lego.target_text !== d.target) throw new Error(`${d.lego_id} is "${lego.known_text}" → "${lego.target_text}", expected "${d.known}" → "${d.target}" — refusing`);
    if (twin.known_text !== d.twin_known || twin.target_text !== d.target || !twin.is_new) throw new Error(`${d.twin} is "${twin.known_text}" → "${twin.target_text}" new=${twin.is_new}, expected "${d.twin_known}" → "${d.target}" new — refusing`);
    if (norm(twin.known_text) === norm(lego.known_text)) throw new Error(`${d.lego_id} and ${d.twin} share their Hindi — it IS a duplicate, nothing to reverse`);
    if (lego.is_new) { console.log(`${d.lego_id} is already is_new=true — nothing to reverse`); out.restore = { already_new: true }; return; }

    const snap = must(await supabase.from('seed_redo_snapshots').select('id,batch_id,seed_number,legos,phrases').eq('id', SNAPSHOT_ID).single(), 'snapshot');
    if (snap.seed_number !== d.seed) throw new Error(`snapshot ${SNAPSHOT_ID} is for seed ${snap.seed_number}, not ${d.seed}`);
    const snapLego = snap.legos.find(l => l.lego_id === d.lego_id);
    if (!snapLego || snapLego.is_new !== true || !snapLego.presentation_audio_id) throw new Error(`snapshot ${d.lego_id} is not is_new with a presentation link — refusing`);
    const snapPhrases = snap.phrases.filter(p => p.lego_index === d.idx).sort((a, b) => a.position - b.position);
    if (snapPhrases.length !== 8) throw new Error(`snapshot holds ${snapPhrases.length} phrases under ${d.lego_id}, expected 8`);
    const live = must(await supabase.from('course_practice_phrases').select('id').eq('course_code', COURSE).eq('seed_number', d.seed).eq('lego_index', d.idx), 'live phrases');
    if (live.length) throw new Error(`${d.lego_id} already has ${live.length} phrases — refusing to restore on top`);
    const clip = must(await supabase.from('course_audio').select('id,role,text').eq('id', snapLego.presentation_audio_id).maybeSingle(), 'presentation clip');
    if (!clip) throw new Error(`presentation clip ${snapLego.presentation_audio_id} no longer exists`);

    out.restore = {
      lego_id: d.lego_id, twin: d.twin, known: lego.known_text, twin_known: twin.known_text, target: lego.target_text,
      is_new: `${lego.is_new} → true`, presentation_audio_id: snapLego.presentation_audio_id, presentation_text: clip.text,
      phrases: snapPhrases.map(p => ({ id: p.id, role: p.phrase_role, known: p.known_text, target: p.target_text })),
    };
    console.log(`${d.lego_id} "${lego.known_text}" → "${lego.target_text}" vs ${d.twin} "${twin.known_text}": Hindi differs → is_new false → true, presentation ${snapLego.presentation_audio_id} relinked (still presents the wrong chunk: ${clip.text}), 8 phrases restored:`);
    for (const p of snapPhrases) console.log(`  ${p.id} [${p.phrase_role}] ${p.known_text} → ${p.target_text}`);
    if (!APPLY) return;

    const eventId = await recordContentEdit(supabase, {
      identity, courseCode: COURSE, surface: SURFACE, operation: 'lego-new-restore',
      scope: { seed_numbers: [d.seed], lego_ids: [d.lego_id], phrase_ids: snapPhrases.map(p => p.id), rows: 1 + snapPhrases.length },
      detail: { ruling: RULING, reverses: 'eng-for-hin-not-new-and-scatter-2026-09-23 lego-not-new (job #833·F)', twin: d.twin, twin_known: twin.known_text, snapshot_id: SNAPSHOT_ID, snapshot_batch: snap.batch_id, restored_by_hand: 'whole-seed undo would strip the L01/L03 audio pointers added 12:38Z', before: { is_new: false, presentation_audio_id: null, phrases: 0 } },
    });
    must(await supabase.from('course_legos').update({ is_new: true, presentation_audio_id: snapLego.presentation_audio_id, version: (lego.version || 1) + 1, last_edit_event_id: eventId })
      .eq('course_code', COURSE).eq('seed_number', d.seed).eq('lego_index', d.idx), `${d.lego_id} update`);
    const rows = snapPhrases.map(({ lego_id, ...p }) => ({ ...p, last_edit_event_id: eventId })); // lego_id is GENERATED ALWAYS
    must(await supabase.from('course_practice_phrases').insert(rows), 'restore phrases');
    await decoratePhrasesWithDecomposition(supabase, rows);
    must(await supabase.from('course_seeds').update({ approved_at: null, last_edit_event_id: eventId }).eq('course_code', COURSE).eq('seed_number', d.seed), `seed ${d.seed} unapprove`);
    out.events.push(eventId);
  }

  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const out = { sweep: SWEEP, apply: APPLY, at: new Date().toISOString(), ruling: RULING, restore: null, events: [], mismatched: [] };
  console.log(APPLY ? '=== APPLY ===' : '=== DRY RUN (nothing written) ===');
  await restoreS0240L02(identity, out);
  if (APPLY) { await refreshNow(); console.log('course_round_index refreshed'); }

  const legos = must(await supabase.from('course_legos').select('lego_id,seed_number,lego_index,known_text,target_text,is_new,updated_at')
    .eq('course_code', COURSE).order('seed_number').order('lego_index').limit(10000), 'legos');
  out.mismatched = findMismatchedNotNew(legos);
  console.log(`\n${legos.filter(l => !l.is_new).length} not-new LEGOs in ${COURSE}; ${out.mismatched.length} with no both-sides twin (listed, not changed):`);
  for (const m of out.mismatched) console.log(`  ${m.lego_id} "${m.known_text}" → "${m.target_text}" | same English earlier: ${m.earlier_same_english.map(e => `${e.lego_id} "${e.known_text}"`).join('; ') || 'NONE'} | same Hindi earlier: ${m.earlier_same_hindi.map(e => `${e.lego_id} "${e.target_text}"`).join('; ') || 'NONE'}`);

  const ev = evidencePath(`tools/course-optimization/${SWEEP}${APPLY ? '' : '-dryrun'}.json`);
  fs.writeFileSync(ev, JSON.stringify(out, null, 1));
  console.log(`evidence: ${ev}`);
}
