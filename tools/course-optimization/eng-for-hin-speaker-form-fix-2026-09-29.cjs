#!/usr/bin/env node
'use strict';
// eng_for_hin — the 16 known-side lines whose SPEAKER form (मैं/हम + gendered verb) did not match the voice that
// speaks them (job #770·H, from #764·I's check; Kai approved the fix in principle, 2026-09-29): 13 male-form lines on
// Kriti (female) and 3 female-form lines on Rehan (male). The voice stays; the Hindi speaker verb moves to the voice's
// gender, and each line gets its course_gender_expansions pair row (original_text = the male form, expanded_f / expanded_m
// = the two sides — the format every existing known-side row has), so the voice rule knows the line is gendered.
// The edit unapproves the seeds it touches. Rendering is NOT done here: the new texts are new clip identities and go
// through POST /api/audio/render (tools/audio/render.cjs) one each, in the voice named below.
//
//   node tools/course-optimization/eng-for-hin-speaker-form-fix-2026-09-29.cjs            # dry run + live gates
//   node tools/course-optimization/eng-for-hin-speaker-form-fix-2026-09-29.cjs --apply
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });

const COURSE = 'eng_for_hin';
const JOB = '#770·H';
const SWEEP = 'eng-for-hin-speaker-form-fix-2026-09-29';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const RULING = "Kai, 2026-09-29 (job #770·H): the speaker's verb agrees with the voice — Kriti female, Rehan male — keep the voice, change the Hindi, add the pair row";

const KRITI = 'cartesia_5283efe8-07d1-4e3a-b615-2ae4a81c1b73';
const REHAN = 'cartesia_205fc552-2cce-4307-baa1-598b9dc3dd01';

/** kind: 'phrase' | 'lego'. voice = the voice the stored clip has today and keeps. */
const ROWS = [
  { kind: 'phrase', id: 'eng_for_hin:S0146L03U03', seed: 146, voice: KRITI, old: 'जब से यह काम नहीं कर रहा है, मैं बुरा कर रहा हूँ।', neu: 'जब से यह काम नहीं कर रहा है, मैं बुरा कर रही हूँ।' },
  { kind: 'phrase', id: 'eng_for_hin:S0465L02B01', seed: 465, voice: REHAN, old: 'मैं आज पूछूँगी', neu: 'मैं आज पूछूँगा' },
  { kind: 'phrase', id: 'eng_for_hin:S0489L01B02', seed: 489, voice: KRITI, old: 'मैं एक कड़क कॉफ़ी चाहता हूँ', neu: 'मैं एक कड़क कॉफ़ी चाहती हूँ' },
  { kind: 'phrase', id: 'eng_for_hin:S0489L02B04', seed: 489, voice: KRITI, old: 'मैं अभी के अभी एक कड़क कॉफ़ी चाहता हूँ', neu: 'मैं अभी के अभी एक कड़क कॉफ़ी चाहती हूँ' },
  { kind: 'phrase', id: 'eng_for_hin:S0489L01B04', seed: 489, voice: KRITI, old: 'मैं एक कड़क कॉफ़ी चाहूँगा', neu: 'मैं एक कड़क कॉफ़ी चाहूँगी' },
  { kind: 'phrase', id: 'eng_for_hin:S0489L01U04', seed: 489, voice: KRITI, old: 'मैं एक कड़क कॉफ़ी चाहूँगा क्योंकि मैं व्यस्त हूँ।', neu: 'मैं एक कड़क कॉफ़ी चाहूँगी क्योंकि मैं व्यस्त हूँ।' },
  { kind: 'phrase', id: 'eng_for_hin:S0489L02U02', seed: 489, voice: KRITI, old: 'मैं चाहता हूँ कि आप मुझे अभी के अभी बताएँ।', neu: 'मैं चाहती हूँ कि आप मुझे अभी के अभी बताएँ।' },
  { kind: 'phrase', id: 'eng_for_hin:S0489L03B02', seed: 489, voice: KRITI, old: 'अगर आपने अभी के अभी मेरे लिए एक कड़क कॉफ़ी नहीं बनाई तो मैं आपका इंतज़ार नहीं करूँगा।', neu: 'अगर आपने अभी के अभी मेरे लिए एक कड़क कॉफ़ी नहीं बनाई तो मैं आपका इंतज़ार नहीं करूँगी।' },
  { kind: 'lego', id: 'S0490L02', seed: 490, voice: KRITI, old: 'तो मैं कभी किसी पर भरोसा नहीं करूँगा', neu: 'तो मैं कभी किसी पर भरोसा नहीं करूँगी' },
  { kind: 'phrase', id: 'eng_for_hin:S0490L02U03', seed: 490, voice: KRITI, old: 'मुझे यक़ीन है कि तो मैं कभी किसी पर भरोसा नहीं करूँगा।', neu: 'मुझे यक़ीन है कि तो मैं कभी किसी पर भरोसा नहीं करूँगी।' },
  { kind: 'phrase', id: 'eng_for_hin:S0490L02U05', seed: 490, voice: KRITI, old: 'ज़िंदगी आसान नहीं है लेकिन तो मैं कभी किसी पर भरोसा नहीं करूँगा।', neu: 'ज़िंदगी आसान नहीं है लेकिन तो मैं कभी किसी पर भरोसा नहीं करूँगी।' },
  { kind: 'phrase', id: 'eng_for_hin:S0490L02B03', seed: 490, voice: KRITI, old: 'मैंने कहा था कि तो मैं कभी किसी पर भरोसा नहीं करूँगा।', neu: 'मैंने कहा था कि तो मैं कभी किसी पर भरोसा नहीं करूँगी।' },
  { kind: 'phrase', id: 'eng_for_hin:S0490L03U01', seed: 490, voice: KRITI, old: 'अगर आपने अभी के अभी मेरे लिए एक कड़क कॉफ़ी नहीं बनाई तो मैं फिर कभी किसी पर भरोसा नहीं करूँगा।', neu: 'अगर आपने अभी के अभी मेरे लिए एक कड़क कॉफ़ी नहीं बनाई तो मैं फिर कभी किसी पर भरोसा नहीं करूँगी।' },
  { kind: 'phrase', id: 'eng_for_hin:S0490L03U06', seed: 490, voice: KRITI, old: 'मैं फिर कभी वहाँ नहीं जाना चाहता।', neu: 'मैं फिर कभी वहाँ नहीं जाना चाहती।' },
  { kind: 'phrase', id: 'eng_for_hin:S0480L01U05', seed: 480, voice: REHAN, old: 'चाहे जो वे कहें, मैं इसे बदलना चाहती हूँ', neu: 'चाहे जो वे कहें, मैं इसे बदलना चाहता हूँ' },
  { kind: 'phrase', id: 'eng_for_hin:S0364L02U05', seed: 364, voice: REHAN, old: 'मैं वह जगह नहीं जानती।', neu: 'मैं वह जगह नहीं जानता।' },
];
const SEEDS_TOUCHED = [...new Set(ROWS.map(r => r.seed))].sort((a, b) => a - b);

// ── the speaker-form rule, as data a line either breaks or does not ──────────────────────────────────────
const FEM_SPEAKER = /(चाहती हूँ|चाहूँगी|करूँगी|कर रही हूँ|पूछूँगी|जानती|चाहती)(?![\p{L}\p{M}])/u;
const MASC_SPEAKER = /(चाहता हूँ|चाहूँगा|करूँगा|कर रहा हूँ|पूछूँगा|जानता|चाहता)(?![\p{L}\p{M}])/u;
/** true when the line's speaker verb is the wrong gender for its voice. The "यह काम नहीं कर रहा है" clause is about a thing, not the speaker, and is masked. */
function speakerMismatch(text, voice) {
  const t = String(text).replace(/यह काम नहीं कर रहा है/gu, '');
  return voice === KRITI ? MASC_SPEAKER.test(t) && !FEM_SPEAKER.test(t) : FEM_SPEAKER.test(t) && !MASC_SPEAKER.test(t);
}
/** the pair row for one line: original_text = the male form, the two sides beside it. */
function pairFor(row) {
  const fem = row.voice === KRITI ? row.neu : row.old;
  const masc = row.voice === KRITI ? row.old : row.neu;
  return { original_text: masc, expanded_f: fem, expanded_m: masc };
}
function defects(rows, which) {
  return rows.filter(r => speakerMismatch(which === 'old' ? r.old : r.neu, r.voice)).map(r => r.id);
}

function supa() {
  const { createClient } = require('@supabase/supabase-js');
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
}
function must(res, what) { if (res.error) throw new Error(`${what}: ${res.error.message}`); return res.data; }

async function main() {
  const apply = process.argv.includes('--apply');
  const pre = defects(ROWS, 'old'), post = defects(ROWS, 'neu');
  if (pre.length !== ROWS.length) throw new Error(`pre-fix: expected all ${ROWS.length} rows to be speaker mismatches, got ${pre.length}`);
  if (post.length) throw new Error(`post-fix rows still mismatched: ${post.join(', ')}`);
  console.log(`offline: ${pre.length} mismatches before, 0 after`);

  const sb = supa();
  const problems = [];
  const phraseIds = ROWS.filter(r => r.kind === 'phrase').map(r => r.id);
  const phrases = must(await sb.from('course_practice_phrases').select('id, seed_number, lego_id, known_text, target_text, known_audio_id').eq('course_code', COURSE).in('id', phraseIds), 'phrases');
  const legoRows = must(await sb.from('course_legos').select('lego_id, seed_number, known_text, target_text, known_audio_id').eq('course_code', COURSE).in('lego_id', ROWS.filter(r => r.kind === 'lego').map(r => r.id)), 'legos');
  const clipIds = [...phrases.map(p => p.known_audio_id), ...legoRows.map(l => l.known_audio_id)].filter(Boolean);
  const clips = must(await sb.from('course_audio').select('id, text, voice_id').in('id', clipIds), 'clips');
  for (const r of ROWS) {
    const live = r.kind === 'phrase' ? phrases.find(p => p.id === r.id) : legoRows.find(l => l.lego_id === r.id);
    if (!live) { problems.push(`${r.id} missing`); continue; }
    if (live.known_text !== r.old) problems.push(`${r.id} is "${live.known_text}", tool expects "${r.old}"`);
    const clip = clips.find(c => c.id === live.known_audio_id);
    if (!clip) problems.push(`${r.id} has no linked known clip`);
    else if (clip.voice_id !== r.voice) problems.push(`${r.id} clip voice is ${clip.voice_id}, tool expects ${r.voice}`);
    r.oldClipId = live.known_audio_id; r.target = live.target_text; r.lego = r.kind === 'lego' ? r.id : live.lego_id;
  }
  // pair rows: none may already exist with a different meaning
  const pairs = [];
  for (const r of ROWS) {
    const p = pairFor(r);
    const ex = must(await sb.from('course_gender_expansions').select('id, expanded_f, expanded_m').eq('course_code', COURSE).eq('text_side', 'known').eq('original_text', p.original_text), 'pair lookup');
    if (ex.length && (ex[0].expanded_f !== p.expanded_f || ex[0].expanded_m !== p.expanded_m)) problems.push(`${r.id}: a pair row for "${p.original_text}" already exists with other sides`);
    pairs.push({ ...p, exists: ex.length > 0 });
  }
  if (problems.length) { console.error('GUARD FAILED:\n  ' + problems.join('\n  ')); process.exit(2); }
  console.log(`guard: 16 live rows match, every clip carries its expected voice; ${pairs.filter(p => !p.exists).length} pair rows to add (${pairs.filter(p => p.exists).length} already present)`);

  // ZUT: the new known text must not sit beside another known text that maps to a different target
  const { checkPhraseZUT } = require('../../services/course-builder/lib/validation.cjs');
  const { courseFamily } = require('../../services/course-builder/lib/course-family.cjs');
  const family = await courseFamily(sb, COURSE);
  // Baseline-relative: hits the seeds already carry (word-level tiling clashes in other rows) are not this edit's;
  // only a hit that appears with the NEW texts and not with the OLD ones is.
  const zutRun = async (which) => {
    const hitsOut = [];
    for (const seed of SEEDS_TOUCHED) {
      const all = must(await sb.from('course_practice_phrases').select('id, known_text, target_text, phrase_role').eq('course_code', COURSE).eq('seed_number', seed), 'seed phrases');
      const rows = all.map(p => { const m = ROWS.find(r => r.id === p.id); return { id: p.id, seed, role: p.phrase_role, known: m ? m[which] : p.known_text, target: p.target_text }; });
      const hits = await checkPhraseZUT(sb, COURSE, rows, seed, { family });
      hitsOut.push(...hits.filter(h => !rows.some(r => r.known === h.known && r.target === h.target && h.existingId === r.id)));
    }
    return hitsOut;
  };
  const zutBefore = (await zutRun('old')).map(h => JSON.stringify(h));
  const zutHits = (await zutRun('neu')).filter(h => !zutBefore.includes(JSON.stringify(h)));
  console.log(`ZUT: ${zutBefore.length} pre-existing hit(s) unchanged; ${zutHits.length} new from this edit${zutHits.length ? ' ' + JSON.stringify(zutHits).slice(0, 1500) : ''}`);
  if (zutHits.length) throw new Error('ZUT hits — refusing');

  const { evidencePath } = require('../lib/evidence-path.cjs');
  const seedsBefore = must(await sb.from('course_seeds').select('seed_number, approved_at').eq('course_code', COURSE).in('seed_number', SEEDS_TOUCHED), 'seeds');
  const out = { sweep: SWEEP, job: JOB, at: new Date().toISOString(), ruling: RULING, apply, rows: ROWS, pairs, approvalsBefore: seedsBefore };
  for (const r of ROWS) console.log(`  ${r.id.replace('eng_for_hin:', '').padEnd(12)} ${r.voice === KRITI ? 'Kriti' : 'Rehan'}  ${r.old}  →  ${r.neu}`);
  if (!apply) { const ev = evidencePath(`tools/course-optimization/${SWEEP}-dryrun.json`); fs.writeFileSync(ev, JSON.stringify(out, null, 1)); console.log(`DRY RUN — nothing written. evidence: ${ev}`); return; }

  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const { snapshotSeeds } = require('../../services/course-builder/lib/redo-snapshot.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const snap = await snapshotSeeds(sb, COURSE, SEEDS_TOUCHED, { reason: 'speaker-form-fix', notes: `${RULING}. Undo: POST /api/build/redo-undo/${COURSE}.` });
  const eventId = await recordContentEdit(sb, {
    identity, courseCode: COURSE, surface: SURFACE, operation: 'known-text-fix',
    scope: { seed_numbers: SEEDS_TOUCHED, lego_ids: ROWS.filter(r => r.kind === 'lego').map(r => r.id), phrase_ids: phraseIds },
    detail: { job: JOB, ruling: RULING, rows: ROWS.map(r => ({ id: r.id, voice: r.voice, before: r.old, after: r.neu, old_clip: r.oldClipId })), snapshot_batch: snap.batchId, approvals_before: seedsBefore },
  });
  console.log(`edit event ${eventId}; snapshot batch ${snap.batchId}`);

  for (const r of ROWS) {
    if (r.kind === 'phrase') must(await sb.from('course_practice_phrases').update({ known_text: r.neu, last_edit_event_id: eventId }).eq('course_code', COURSE).eq('id', r.id).eq('known_text', r.old), r.id);
    else must(await sb.from('course_legos').update({ known_text: r.neu, last_edit_event_id: eventId }).eq('course_code', COURSE).eq('lego_id', r.id).eq('known_text', r.old), r.id);
  }
  for (const p of pairs.filter(x => !x.exists)) must(await sb.from('course_gender_expansions').insert({ course_code: COURSE, language: 'hin', text_side: 'known', ...{ original_text: p.original_text, expanded_f: p.expanded_f, expanded_m: p.expanded_m } }), `pair ${p.original_text}`);
  const unapproveEvent = await recordContentEdit(sb, { identity, courseCode: COURSE, surface: SURFACE, operation: 'unapprove', scope: { seed_numbers: SEEDS_TOUCHED }, detail: { why: 'speaker-form fix edits known text; the seeds need a fresh read', job: JOB } });
  must(await sb.from('course_seeds').update({ approved_at: null, last_edit_event_id: unapproveEvent }).eq('course_code', COURSE).in('seed_number', SEEDS_TOUCHED), 'unapprove');

  const bad = [];
  const now = must(await sb.from('course_practice_phrases').select('id, known_text').eq('course_code', COURSE).in('id', phraseIds), 'after');
  for (const r of ROWS.filter(x => x.kind === 'phrase')) if (now.find(p => p.id === r.id)?.known_text !== r.neu) bad.push(r.id);
  if (bad.length) throw new Error(`POST-APPLY CHECK FAILED (snapshot ${snap.batchId}): ${bad.join(', ')}`);
  const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
  await refreshNow();
  out.eventId = eventId; out.unapproveEvent = unapproveEvent; out.snapshot = snap;
  const ev = evidencePath(`tools/course-optimization/${SWEEP}.json`);
  fs.writeFileSync(ev, JSON.stringify(out, null, 1));
  console.log(`applied; evidence: ${ev}`);
}

module.exports = { ROWS, KRITI, REHAN, speakerMismatch, pairFor, defects };
if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
