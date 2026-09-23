#!/usr/bin/env node
'use strict';
// eng_for_hin — two bracket repairs on the HINDI (known) side, job #845·H, 2026-09-23.
//
//  PART A — कल carries its sense in the PRESENTATION, never in the LEGO text (Kai's rulings).
//  The redo agent (2026-09-11) found bare कल → tomorrow (S0015L03) and bare कल → yesterday
//  (S0030L03) colliding at the exact-match ZUT gate (checkLegoConflict) and glossed both:
//  "(आने वाला) कल" / "(बीता हुआ) कल". Kai had already ruled the other way:
//    L24, Kai 2026-09-03 — "can they be attached to a sister lego with context easily?
//      Otherwise, we can use the 'as in' context… When it comes up in a seed sentence next,
//      introduce it again (won't matter that it causes a ZUT - because we're handling it),
//      make sure the 'as in' context is in the presentation, this time with the other sense"
//      and "the merging method didn't work for all, so we should use the as in method for all."
//    K23, Kai 2026-09-10 — one known word, two target words: KEEP the ZUT clash, explain the
//      sense in the presentation, never name the sister, and never prompt a sense without
//      its context anywhere in the course.
//    L26 / K11, Kai 2026-09-09/10 — a LEGO may contain only words its own seed says; the
//      parenthetical bracket is banned. Seeds 15 and 30 say कल; neither says आने वाला or
//      बीता हुआ.
//  So both LEGOs go back to bare कल, and each gets a Frame B ("as in") introduction quoting
//  its OWN seed sentence — the same device job #358·E used for the other six कल LEGOs on
//  2026-09-03. The sense is pinned by the seed's verb: seed 15 "…आप कल मेरे साथ अंग्रेज़ी बोलें"
//  (subjunctive, forward) and seed 30 "मैं कल आपसे कुछ पूछना चाहता था" (past). Phase8 keeps a
//  context once given (phase8-audio-v13.cjs hadContext → forceFrame 'B').
//  The deliberate ZUT this creates (कल → tomorrow at 15, कल → yesterday at 30 and, not-new,
//  at 262) is Kai's named exception to K2 (L24) and is recorded in the edit event's detail so a
//  scan that finds it can read why.
//
//  PART B — the empty "( )" gap marker on S0132L02 "उससे ( ) जो वह कह रही थी" follows the
//  course's own precedent for a discontinuous Hindi chunk: S0117L02 "उससे जब हमने पिछली बार बात
//  की थी" and S0118L02 "उससे जब हम थे" carry no marker. "उससे जो वह कह रही थी" is also the text
//  the redo agent itself wrote first (audit log, 2026-09-13 11:58, v2) before adding the marker.
//  S0128L01 "आप ( ) की तरह हैं" is NOT touched: with the marker removed it reads "आप की तरह हैं" =
//  "like you", the wrong meaning, so the precedent is not clean there — it goes to Kai with
//  the seed-128 "(who)" question.
//
//  Edits unapprove seeds (Kai's rule): seeds 15, 30 and 132 get approved_at = NULL so they
//  return to Shuchita's queue. The course_legos text-change trigger handles audio links (the
//  two stale June eve presentations on S0030L03 and S0132L02 are nulled by it — both quote
//  text the LEGO no longer says). No TTS here: the Hindi (Kriti) render is HELD by the room.
//
//  Identity: serviceIdentity + recordContentEdit (SQL-side sweep, outside the HTTP gate).
//  Dry run by default; --apply writes. Evidence JSON goes to ~/ssi-evidence.
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');

const ROOT = path.join(__dirname, '..', '..');
const COURSE = 'eng_for_hin';
const SWEEP = 'eng-for-hin-kal-as-in-and-gap-marker-2026-09-23';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const RULING = "Kai, 2026-09-03 (L24): use the 'as in' method for all कल LEGOs — bare chunk, sense in the presentation, a handled ZUT is fine; Kai, 2026-09-10 (K23/L26): keep the clash, explain in the presentation, a LEGO carries only its seed's words; gap marker: course precedent S0117L02/S0118L02 (no marker)";
const HINDI_TEMPLATE = "{target_lang_name} में — '{known}' — जैसे — '{seed}' — में :";
const TARGET_LANG_NAME = 'अंग्रेज़ी';

// The three edits. `before` is asserted against the live row before anything is written.
const EDITS = [
  { lego_id: 'S0015L03', seed: 15, idx: 3, before: '(आने वाला) कल', after: 'कल', target: 'tomorrow', intro: 'B', why: 'L24/K23: sense in the presentation; L26: आने वाला is not in seed 15' },
  { lego_id: 'S0030L03', seed: 30, idx: 3, before: '(बीता हुआ) कल', after: 'कल', target: 'yesterday', intro: 'B', why: 'L24/K23: sense in the presentation; L26: बीता हुआ is not in seed 30' },
  { lego_id: 'S0132L02', seed: 132, idx: 2, before: 'उससे ( ) जो वह कह रही थी', after: 'उससे जो वह कह रही थी', target: 'than what she was saying', intro: null, why: 'course precedent S0117L02/S0118L02: a discontinuous Hindi chunk carries no marker' },
];

// Words the sister senses would be named by. PR2 / K23(c): an introduction describes only
// the sense it introduces. The "as in" line quotes the seed and nothing else, so these must
// never appear in it.
const SISTER_WORDS = ['आने वाला', 'आने वाले', 'बीता हुआ', 'बीते हुए', 'tomorrow', 'yesterday'];

const devWords = (s) => (s || '').replace(/[।?!,.()"']/g, ' ').split(/\s+/).filter(Boolean);

/** L26 — every word of the LEGO's known text is a word its own seed says. Brackets are not words. */
function legoWordsInSeed(legoKnown, seedKnown) {
  if (/[()]/.test(legoKnown || '')) return false; // K11: the parenthetical bracket is banned outright
  const seed = new Set(devWords(seedKnown));
  const words = devWords(legoKnown);
  return words.length > 0 && words.every((w) => seed.has(w));
}

/** Frame B introduction text, byte-identical to presentation-author's renderIntro for this template. */
function planIntro(chunk, seedKnown, template = HINDI_TEMPLATE) {
  return template
    .replace(/\{target_lang_name\}/g, TARGET_LANG_NAME)
    .replace(/\{known\}/g, chunk)
    .replace(/\{seed\}/g, seedKnown || '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Phase8's freshness probe in miniature: a pending row is fresh iff it quotes the LEGO's current text. */
function introQuotesChunk(introText, chunk) {
  return introText.includes(`'${chunk}'`);
}

function namesSister(introText) {
  return SISTER_WORDS.some((w) => introText.includes(w));
}

/** Pure plan: what the sweep intends to write, given live rows. Throws on any precondition miss. */
function planEdits({ legos, seeds }) {
  const byId = new Map(legos.map((l) => [l.lego_id, l]));
  const seedByNum = new Map(seeds.map((s) => [s.seed_number, s]));
  return EDITS.map((e) => {
    const lego = byId.get(e.lego_id);
    const seed = seedByNum.get(e.seed);
    if (!lego) throw new Error(`${e.lego_id}: not live — refusing`);
    if (!seed) throw new Error(`seed ${e.seed}: not live — refusing`);
    if (lego.known_text !== e.before) throw new Error(`${e.lego_id}: live known_text is "${lego.known_text}", expected "${e.before}" — refusing`);
    if (lego.target_text !== e.target) throw new Error(`${e.lego_id}: live target_text is "${lego.target_text}", expected "${e.target}" — refusing`);
    if (!legoWordsInSeed(e.after, seed.known_text)) throw new Error(`${e.lego_id}: "${e.after}" is not made of seed ${e.seed}'s words — refusing`);
    const intro = e.intro === 'B' ? planIntro(e.after, seed.known_text) : null;
    if (intro && !introQuotesChunk(intro, e.after)) throw new Error(`${e.lego_id}: intro does not quote the chunk`);
    if (intro && namesSister(intro)) throw new Error(`${e.lego_id}: intro names the sister sense (PR2)`);
    return { ...e, seed_known: seed.known_text, seed_approved_at: seed.approved_at, live_version: lego.version, presentation_audio_id: lego.presentation_audio_id, intro_text: intro };
  });
}

async function main() {
  require('dotenv').config({ path: path.join(ROOT, '.env') });
  require('dotenv').config({ path: path.join(ROOT, '.env.psql') });
  const { createClient } = require('@supabase/supabase-js');
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const { snapshotSeeds } = require('../../services/course-builder/lib/redo-snapshot.cjs');
  const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
  const { normalizeForAudio } = require('../../services/shared/text-normalize.cjs');
  const presentationAuthor = require('../../services/phases/presentation-author.cjs');
  const { evidencePath } = require('../lib/evidence-path.cjs');

  const APPLY = process.argv.includes('--apply');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data; };

  const course = must(await supabase.from('courses').select('course_code, known_lang, target_lang, voice_config').eq('course_code', COURSE).single(), 'course');
  const tpl = must(await supabase.from('presentation_templates').select('template').eq('known_lang', 'hin').eq('is_active', true).order('priority', { ascending: false }).limit(1), 'template');
  if (!tpl.length || tpl[0].template !== HINDI_TEMPLATE) throw new Error(`live Hindi template is "${tpl[0]?.template}" — the plan assumes "${HINDI_TEMPLATE}"; refusing`);
  const langName = presentationAuthor.localisedLangName(course.target_lang, course.known_lang);
  if (langName !== TARGET_LANG_NAME) throw new Error(`localisedLangName gives "${langName}", plan assumes "${TARGET_LANG_NAME}" — refusing`);

  const legoIds = EDITS.map((e) => e.lego_id);
  const seedNums = EDITS.map((e) => e.seed);
  const legos = must(await supabase.from('course_legos').select('lego_id, seed_number, lego_index, known_text, target_text, version, presentation_audio_id, known_audio_id').eq('course_code', COURSE).in('lego_id', legoIds), 'legos');
  const seeds = must(await supabase.from('course_seeds').select('seed_number, known_text, target_text, approved_at').eq('course_code', COURSE).in('seed_number', seedNums), 'seeds');
  const plan = planEdits({ legos, seeds });

  // The real renderer must agree with the pure plan, or phase8 would judge the row stale.
  for (const p of plan) {
    if (!p.intro_text) continue;
    const real = presentationAuthor.renderIntro({ frame: 'B', template: HINDI_TEMPLATE, targetLangName: langName, chunk: p.after, seed: p.seed_known });
    if (real !== p.intro_text) throw new Error(`${p.lego_id}: renderIntro disagrees with the plan\n  real: ${real}\n  plan: ${p.intro_text}`);
  }

  // The deliberate ZUT, measured so the report states it rather than assumes it.
  const kal = must(await supabase.from('course_legos').select('lego_id, known_text, target_text, is_new').eq('course_code', COURSE).eq('known_text', 'कल'), 'bare kal rows');
  const existingPending = must(await supabase.from('course_audio').select('id, lego_id, text, s3_key').eq('course_code', COURSE).eq('role', 'presentation').in('lego_id', legoIds).like('s3_key', 'pending/%'), 'pending rows');

  const out = { sweep: SWEEP, apply: APPLY, at: new Date().toISOString(), ruling: RULING, plan, bare_kal_before: kal, pending_before: existingPending };
  console.log(`${APPLY ? 'APPLY' : 'DRY RUN'} — ${COURSE}`);
  for (const p of plan) {
    console.log(`\n${p.lego_id} (seed ${p.seed}, v${p.live_version}, seed approved_at=${p.seed_approved_at || 'NULL'})`);
    console.log(`  known:  "${p.before}"  →  "${p.after}"   (target "${p.target}" unchanged)`);
    console.log(`  why:    ${p.why}`);
    if (p.intro_text) console.log(`  intro:  ${p.intro_text}`);
    if (p.presentation_audio_id) console.log(`  note:   presentation link ${p.presentation_audio_id} will be nulled by the text-change trigger (stale June clip)`);
  }
  console.log(`\nbare कल LEGOs before: ${kal.map((k) => `${k.lego_id} → ${k.target_text}${k.is_new ? '' : ' (not new)'}`).join(', ') || 'none'}`);
  console.log(`existing pending intro rows on these LEGOs: ${existingPending.length}`);

  if (APPLY) {
    const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
    const snap = await snapshotSeeds(supabase, COURSE, seedNums, { reason: 'kal-as-in-ruling', notes: `${RULING}. Sweep ${SWEEP}: ${plan.map((p) => `${p.lego_id} "${p.before}"→"${p.after}"`).join('; ')}. Undo: POST /api/build/redo-undo/${COURSE} per seed.` });
    out.snapshot_batch = snap.batchId;
    const eventId = await recordContentEdit(supabase, {
      identity, courseCode: COURSE, surface: SURFACE, operation: 'lego-known-text-ruling',
      scope: { seed_numbers: seedNums, lego_ids: legoIds, rows: plan.length },
      detail: {
        ruling: RULING,
        deliberate_zut: 'कल → tomorrow (S0015L03) and कल → yesterday (S0030L03; S0262L03 not-new) is Kai\'s handled ZUT under canon L24/K23(a): each debut carries its own seed as "as in" context; do not merge or re-gloss',
        edits: plan.map((p) => ({ lego_id: p.lego_id, before: p.before, after: p.after, intro: p.intro_text })),
        snapshot_batch: snap.batchId, job: '#845·H',
      },
    });
    out.edit_event_id = eventId;

    for (const p of plan) {
      must(await supabase.from('course_legos').update({ known_text: p.after, last_edit_event_id: eventId })
        .eq('course_code', COURSE).eq('seed_number', p.seed).eq('lego_index', p.idx), `${p.lego_id} update`);
    }

    const voiceId = presentationAuthor.resolvePresentationVoiceId(course);
    const rows = plan.filter((p) => p.intro_text).map((p) => ({
      course_code: COURSE, text: p.intro_text, text_normalized: normalizeForAudio(p.intro_text),
      language: course.known_lang, role: 'presentation', voice_id: voiceId, origin: 'tts',
      s3_key: `pending/${randomUUID().toUpperCase()}.mp3`, lego_id: p.lego_id,
    }));
    if (rows.length) {
      must(await supabase.from('course_audio').upsert(rows, { onConflict: 'course_code,text_normalized,language,role,voice_id', ignoreDuplicates: true }), 'pending intros');
    }
    out.pending_voice_id = voiceId;

    must(await supabase.from('course_seeds').update({ approved_at: null, last_edit_event_id: eventId })
      .eq('course_code', COURSE).in('seed_number', seedNums), 'unapprove seeds');

    try { await refreshNow(); out.round_index_refreshed = true; } catch (e) { out.round_index_refreshed = `failed: ${e.message}`; }

    // Re-read everything the job claims.
    out.after = {
      legos: must(await supabase.from('course_legos').select('lego_id, known_text, target_text, version, presentation_audio_id, known_audio_id, last_edit_event_id').eq('course_code', COURSE).in('lego_id', legoIds), 'legos after'),
      seeds: must(await supabase.from('course_seeds').select('seed_number, approved_at, last_edit_event_id').eq('course_code', COURSE).in('seed_number', seedNums), 'seeds after'),
      pending: must(await supabase.from('course_audio').select('id, lego_id, text, voice_id, s3_key').eq('course_code', COURSE).eq('role', 'presentation').in('lego_id', legoIds).like('s3_key', 'pending/%'), 'pending after'),
      bare_kal: must(await supabase.from('course_legos').select('lego_id, target_text, is_new').eq('course_code', COURSE).eq('known_text', 'कल').order('seed_number'), 'bare kal after'),
    };
    console.log('\nAFTER:');
    for (const l of out.after.legos) console.log(`  ${l.lego_id} v${l.version} "${l.known_text}" → "${l.target_text}" presentation=${l.presentation_audio_id || 'NULL'}`);
    for (const s of out.after.seeds) console.log(`  seed ${s.seed_number} approved_at=${s.approved_at || 'NULL'}`);
    for (const r of out.after.pending) console.log(`  pending intro ${r.lego_id} [${r.voice_id}]: ${r.text}`);
    console.log(`  bare कल: ${out.after.bare_kal.map((k) => `${k.lego_id} → ${k.target_text}${k.is_new ? '' : ' (not new)'}`).join(', ')}`);
  }

  const ev = evidencePath(`tools/course-optimization/${SWEEP}${APPLY ? '' : '-dryrun'}.json`);
  fs.mkdirSync(path.dirname(ev), { recursive: true });
  fs.writeFileSync(ev, JSON.stringify(out, null, 2));
  console.log(`\nevidence: ${ev}`);
}

module.exports = { EDITS, HINDI_TEMPLATE, legoWordsInSeed, planIntro, introQuotesChunk, namesSister, planEdits };

if (require.main === module) {
  main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
}
