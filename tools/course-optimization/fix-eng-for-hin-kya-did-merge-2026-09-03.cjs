#!/usr/bin/env node
/**
 * eng_for_hin — retire the क्या → "did" cue by merging, not deleting.
 *
 * Defect: seed 355's M-LEGO S0355L03 (क्या उसे → "did she") is split into two
 * component cues, the first of which teaches the Hindi yes/no question particle
 * क्या as the English auxiliary "did". क्या marks interrogation; the past tense in
 * the English answer comes from थी at the end of the sentence. Same defect class as
 * the six copula cues merged earlier today (job #323,
 * docs/course-optimization/eng-for-hin-bare-copula-cue-merges-2026-09-03.md §5a),
 * which parked this one because retiring the cue strands seed 385.
 *
 * Fix, per Kai's ruling 2026-09-03 ("merge the did with a sister lego … 385 can
 * just introduce it again"):
 *   A. S0355L03 — merge both components away. The parent already carries the whole
 *      Hindi chunk and the whole English chunk, so nothing is grown and nothing is
 *      lost: क्या उसे → "did she" stands as one honest unit. This is the course's
 *      dominant convention (14 of the 15 क्या-question chunks carry no component split).
 *   B. S0385L01 — grow उससे सहमत थे → "agree with her" to the seed's own sentence,
 *      क्या आप उससे सहमत थे → "did you agree with her". Seed 385 contains क्या in its
 *      own right, so it introduces its own question chunk rather than borrowing 355's
 *      tile. Contiguous on both sides, ZUT-unique, covers the seed with no gap.
 *      All three clips for the new text already exist (they are the seed sentence's
 *      own), so the grow costs no audio on a course whose voices are retired xAI.
 *   C. Re-point the decompositions at seed 385 that carried a ghost "did".
 *
 * Usage:  node tools/course-optimization/fix-eng-for-hin-kya-did-merge-2026-09-03.cjs [--apply]
 * Default is a dry run. Writes a log next to this file.
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { createClient } = require('@supabase/supabase-js');

const COURSE = 'eng_for_hin';
const APPLY = process.argv.includes('--apply');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const log = { mode: APPLY ? 'apply' : 'dry-run', at: new Date().toISOString(), steps: [] };
const note = (o) => { log.steps.push(o); console.log(JSON.stringify(o, null, 1)); };

const GROWN_KNOWN = 'क्या आप उससे सहमत थे';
const GROWN_TARGET = 'did you agree with her';

async function main() {
  // ── A. merge S0355L03's components away ────────────────────────────────
  const { data: l355 } = await sb.from('course_legos')
    .select('lego_id,type,components,known_text,target_text,known_audio_id,target1_audio_id,target2_audio_id')
    .eq('course_code', COURSE).eq('seed_number', 355).eq('lego_index', 3).single();
  note({ step: 'A.before', lego: l355 });

  const { data: comps355 } = await sb.from('course_practice_phrases')
    .select('id,position,known_text,target_text')
    .eq('course_code', COURSE).eq('seed_number', 355).eq('lego_index', 3)
    .eq('phrase_role', 'component').order('position');
  const { data: rest355 } = await sb.from('course_practice_phrases')
    .select('id,position')
    .eq('course_code', COURSE).eq('seed_number', 355).eq('lego_index', 3)
    .in('phrase_role', ['build', 'use']).order('position');
  note({ step: 'A.plan', delete_component_rows: comps355, renormalise: rest355.length });

  if (APPLY) {
    await must(sb.from('course_legos').update({ components: null, type: 'A' })
      .eq('course_code', COURSE).eq('seed_number', 355).eq('lego_index', 3));
    await must(sb.from('course_practice_phrases').delete()
      .eq('course_code', COURSE).eq('seed_number', 355).eq('lego_index', 3)
      .eq('phrase_role', 'component'));
    // two-step shift: position is uniquely constrained per (course, seed, lego_index)
    for (const p of rest355) await must(sb.from('course_practice_phrases')
      .update({ position: p.position + 10000 }).eq('id', p.id));
    for (let i = 0; i < rest355.length; i++) await must(sb.from('course_practice_phrases')
      .update({ position: i + 1 }).eq('id', rest355[i].id));
    note({ step: 'A.done', components_merged: 2, rows_deleted: comps355.length, repositioned: rest355.length });
  }

  // ── B. grow S0385L01 to the seed sentence ──────────────────────────────
  const { data: l385 } = await sb.from('course_legos')
    .select('lego_id,known_text,target_text,components,known_audio_id,target1_audio_id,target2_audio_id,presentation_audio_id')
    .eq('course_code', COURSE).eq('seed_number', 385).eq('lego_index', 1).single();
  note({ step: 'B.before', lego: l385 });

  // the clips the grown text must land on — they already exist (seed 385's own)
  const wanted = [
    { col: 'known_audio_id', role: 'known', text: GROWN_KNOWN },
    { col: 'target1_audio_id', role: 'target1', text: GROWN_TARGET },
    { col: 'target2_audio_id', role: 'target2', text: GROWN_TARGET },
  ];
  const relink = {};
  for (const w of wanted) {
    const { data: clips } = await sb.from('course_audio').select('id,voice_id,text,text_normalized,role,s3_key')
      .eq('course_code', COURSE).eq('role', w.role).eq('text_normalized', w.text);
    const clip = (clips || []).find(c => c.s3_key);
    if (!clip) throw new Error(`no ${w.role} clip for "${w.text}" — refusing to grow (would silence the slot)`);
    relink[w.col] = clip.id;
    note({ step: 'B.clip', role: w.role, clip: clip.id, voice: clip.voice_id, text: clip.text });
  }

  if (APPLY) {
    await must(sb.from('course_legos')
      .update({ known_text: GROWN_KNOWN, target_text: GROWN_TARGET })
      .eq('course_code', COURSE).eq('seed_number', 385).eq('lego_index', 1));
    // the text-change trigger nulls the pointers; put them back on the verified clips
    await must(sb.from('course_legos').update(relink)
      .eq('course_code', COURSE).eq('seed_number', 385).eq('lego_index', 1));
    const { data: after } = await sb.from('course_legos')
      .select('known_text,target_text,known_audio_id,target1_audio_id,target2_audio_id,presentation_audio_id')
      .eq('course_code', COURSE).eq('seed_number', 385).eq('lego_index', 1).single();
    note({ step: 'B.done', after });
  }

  // ── C. re-point seed 385's decompositions ──────────────────────────────
  const { data: p385 } = await sb.from('course_practice_phrases')
    .select('id,position,phrase_role,known_text,target_text,decomposition')
    .eq('course_code', COURSE).eq('seed_number', 385).eq('lego_index', 1).order('position');

  const HER = { known: 'उसे', legoId: 'S0309L02', isGhost: false };
  const rebuilt = [];
  for (const p of p385) {
    const d = p.decomposition;
    if (!Array.isArray(d) || !d.length) continue;
    let nd = null;
    // the five/six that opened with a ghost "did" then S0334L01 "you" then S0385L01
    const i0 = d.findIndex(t => t.isGhost && t.target.trim() === 'did');
    if (i0 === 0 && d[1] && d[1].legoId === 'S0334L01' && d[2] && d[2].legoId === 'S0385L01') {
      nd = [{ known: GROWN_KNOWN, legoId: 'S0385L01', target: GROWN_TARGET, isGhost: false }, ...d.slice(3)];
    } else if (d.length === 1 && d[0].legoId === 'S0385L01' && d[0].target === 'agree with her') {
      // the debut BUILD is now a partial of its grown LEGO — tile it from its parts
      nd = [{ known: 'सहमत', legoId: null, target: 'agree', isGhost: true },
            { known: '', legoId: null, target: ' with', isGhost: true },
            { ...HER, target: ' her' }];
    } else if (d.length === 2 && d[0].legoId === 'S0334L01' && d[1].legoId === 'S0385L01') {
      nd = [{ known: 'आपको', legoId: 'S0334L01', target: 'you', isGhost: false },
            { known: 'सहमत', legoId: null, target: ' agree', isGhost: true },
            { known: '', legoId: null, target: ' with', isGhost: true },
            { ...HER, target: ' her' }];
    }
    if (!nd) continue;
    const concat = nd.map(t => t.target).join('');
    if (concat.replace(/\s+/g, ' ').trim() !== p.target_text.replace(/\s+/g, ' ').trim()) {
      throw new Error(`decomposition would not concatenate for ${p.id}: "${concat}" vs "${p.target_text}"`);
    }
    rebuilt.push({ id: p.id, position: p.position, target: p.target_text, from: d, to: nd });
  }
  note({ step: 'C.plan', rebuilt: rebuilt.length, detail: rebuilt.map(r => ({ id: r.id, target: r.target, tiles: r.to.length })) });

  if (APPLY) {
    for (const r of rebuilt) await must(sb.from('course_practice_phrases')
      .update({ decomposition: r.to }).eq('id', r.id));
    note({ step: 'C.done', updated: rebuilt.length });
  }

  const out = path.join(__dirname, `fix-eng-for-hin-kya-did-merge-2026-09-03-${APPLY ? 'applied' : 'dryrun'}-log.json`);
  fs.writeFileSync(out, JSON.stringify(log, null, 1));
  console.log('\nlog →', out);
}

async function must(q) { const { error } = await q; if (error) throw new Error(error.message); }
main().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
