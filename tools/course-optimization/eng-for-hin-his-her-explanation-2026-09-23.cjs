#!/usr/bin/env node
'use strict';
// eng_for_hin — the his/her explanation on the FIRST possessive his/her LEGO (job #870·H, 2026-09-23).
//
//  KAI'S ASK (2026-09-23): "in the first presentation that introduces a her/his seed, we quickly
//  mention that in English, you say it differently depending on whether you're talking about a
//  man or a woman. In hindi of course. No grammar, just practical stuff so the learner knows why
//  they're hearing the male and the female voice saying different things."
//  Hindi उसका/उसकी agrees with the thing possessed, not the possessor, so one Hindi chunk
//  (उसका नाम) is English "his name" OR "her name".
//
//  KAI'S OWN WORDING, which this line is modelled on:
//    2026-08-25 (Yoruba/Welsh thread): "the Welsh for x, will sound a little different depending
//      on whether you are talking about a man or a woman. To teach you both ways, we will have
//      the female voice talk about a woman, and the male voice talk about a man."
//    2026-09-02 (eng_for_hin gender convention, d/aab243eb): "The presentation clip explains (in
//      hindi) that in English, you say it differently depending on whether you're talking about
//      a woman's name or a man's name, and that to show you both, the woman's voice will say it
//      as if we're talking about a woman, and the man's voice a man."
//  Neither names the English words, so this line does not either: the Hindi (Kriti) voice would
//  read "his"/"her" aloud in a Devanagari sentence, and the English words are the target voices'
//  job. No grammar terms (Kai: "no grammar"), no brackets (canon K11).
//
//  WHERE: the first LEGO whose English introduces a possessive his/her, found LIVE, never assumed.
//  Today that is S0020L01 (उसका नाम → his name, is_new); "her name" first appears at S0021L03,
//  the very next seed, as a not-new reuse of the SAME Hindi chunk. Both go on the seed-20
//  presentation, the first time the learner meets the chunk. The plan refuses if the live course
//  no longer agrees (Kai: "if the first occurrence is ambiguous, report that as an explicit gap").
//
//  HOW: the human-authored presentation mechanism (Kai's ruling 2026-09-21, job #506):
//    1. a mark in human_authored_presentations keyed to the LEGO — the DB trigger then refuses
//       any write of different words to this LEGO's presentation row, and phase8 judges a pending
//       row fresh iff it carries the mark's words (never the template), so no re-author can
//       template-overwrite it and no purge can drop it;
//    2. a PENDING course_audio presentation row in the presentation voice (Kriti), exactly as
//       job #845·H attached the कल "as in" introductions — s3_key pending/…, nothing rendered.
//  The line ENDS with the course's ordinary Frame B introduction (the majority form here,
//  1,960 of 2,972 rows), so it still does the presentation's job and leads into the English.
//
//  Then seed 20 is unapproved (approved_at = NULL) so Shuchita sees it: the Hindi is a
//  NON-NATIVE DRAFT and she is the reviewer.
//
//  No TTS. No deletion. Identity: serviceIdentity + recordContentEdit (SQL-side, outside the
//  HTTP gate). Dry run by default; --apply writes. Evidence JSON goes to ~/ssi-evidence.
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
const ROOT = path.join(__dirname, '..', '..');
const COURSE = 'eng_for_hin';
const SWEEP = 'eng-for-hin-his-her-explanation-2026-09-23';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const JOB = '#870·H';
const HINDI_TEMPLATE = "{target_lang_name} में — '{known}' — जैसे — '{seed}' — में :";
const TARGET_LANG_NAME = 'अंग्रेज़ी';

// The explanation, in Hindi, spoken by Kriti before the ordinary introduction.
// Back-translation: "In English, the way you say 'उसका नाम' changes a little, depending on whether
// you are talking about a man or a woman. To teach you both ways, the woman's voice will talk
// about a woman, and the man's voice about a man."
const EXPLANATION =
  "अंग्रेज़ी में 'उसका नाम' कहने का तरीक़ा थोड़ा बदल जाता है, इस हिसाब से कि आप किसी आदमी के बारे में बात कर रहे हैं या किसी औरत के बारे में। " +
  'दोनों तरीक़े सिखाने के लिए, महिला आवाज़ एक औरत के बारे में बात करेगी और पुरुष आवाज़ एक आदमी के बारे में।';
const BACK_TRANSLATION =
  "In English, the way you say 'his/her name' changes a little, depending on whether you are talking about a man or a woman. " +
  "To teach you both ways, the woman's voice will talk about a woman, and the man's voice about a man. " +
  "In English, 'his/her name', as in 'You want to learn his name quickly.', is:";

// Kai: "No grammar". A learner-facing line never carries a grammar term, Hindi or English.
const GRAMMAR_TERMS = ['व्याकरण', 'सर्वनाम', 'लिंग', 'संज्ञा', 'विशेषण', 'पुल्लिंग', 'स्त्रीलिंग', 'possessive', 'pronoun', 'gender', 'grammar', 'noun'];

const HIS_OR_HER = /(^|[^a-z])(his|her)([^a-z]|$)/i;
/** English target_text carries his/her? ("her" as object — "I told her" — also matches; planLine then checks the LEGO is a possessive.) */
function carriesHisHer(targetText) { return HIS_OR_HER.test(targetText || ''); }

/** Course order (seed, then lego id): the first LEGO with his, the first with her, and the first with either. */
function firstHisHer(legos) {
  const sorted = [...legos].sort((a, b) => a.seed_number - b.seed_number || a.lego_id.localeCompare(b.lego_id));
  const first = (re) => sorted.find((l) => re.test(l.target_text || '')) || null;
  return {
    his: first(/(^|[^a-z])his([^a-z]|$)/i),
    her: first(/(^|[^a-z])her([^a-z]|$)/i),
    either: sorted.find((l) => carriesHisHer(l.target_text)) || null,
  };
}

/** Frame B introduction, byte-identical to presentation-author's renderIntro for this template. */
function planIntro(chunk, seedKnown, template = HINDI_TEMPLATE) {
  return template
    .replace(/\{target_lang_name\}/g, TARGET_LANG_NAME)
    .replace(/\{known\}/g, chunk)
    .replace(/\{seed\}/g, seedKnown || '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function planLineText(chunk, seedKnown) { return `${EXPLANATION} ${planIntro(chunk, seedKnown)}`; }

/** The rails the line must pass — each a reason the line would be wrong for a learner or for the machinery. */
function lineProblems(text, { chunk, seedKnown }) {
  const problems = [];
  if (/[A-Za-z]/.test(text)) problems.push('carries Latin letters — the Hindi voice would read English aloud');
  if (/[()[\]]/.test(text)) problems.push('carries brackets (canon K11)');
  for (const g of GRAMMAR_TERMS) if (text.toLowerCase().includes(g)) problems.push(`names a grammar term: ${g}`);
  if (!text.includes(`'${chunk}'`)) problems.push('does not quote the chunk');
  if (!text.includes(`'${seedKnown}'`)) problems.push('does not quote its own seed (Frame B)');
  if (!text.endsWith(':')) problems.push('does not end with the introduction colon that leads into the English');
  if (text.split('।').length - 1 > 4) problems.push('too long — Kai asked for a quick mention');
  return problems;
}

/** A possessive his/her: the word is followed by a noun, not sentence-final or before a verb-ish stop. */
function isPossessiveHisHer(targetText) {
  return /(^|\s)(his|her)\s+[a-z]/i.test(targetText || '');
}

/**
 * Pure plan from live rows. Throws on any precondition miss, including an ambiguous first
 * occurrence — a plan that cannot be stated is not applied.
 */
function planLine({ legos, seeds }) {
  const f = firstHisHer(legos);
  if (!f.either) throw new Error('no LEGO in the course carries his/her — nothing to explain');
  const lego = f.either;
  if (!lego.is_new) throw new Error(`${lego.lego_id}: the first his/her LEGO is not is_new — its presentation is elsewhere; refusing`);
  if (!isPossessiveHisHer(lego.target_text)) throw new Error(`${lego.lego_id} "${lego.target_text}": his/her is not a possessive here; refusing`);
  const seed = seeds.find((s) => s.seed_number === lego.seed_number);
  if (!seed) throw new Error(`seed ${lego.seed_number}: not live — refusing`);
  if (!seed.known_text.includes(lego.known_text)) throw new Error(`${lego.lego_id}: seed ${lego.seed_number} does not contain "${lego.known_text}" — Frame B would misquote; refusing`);
  const text = planLineText(lego.known_text, seed.known_text);
  const problems = lineProblems(text, { chunk: lego.known_text, seedKnown: seed.known_text });
  if (problems.length) throw new Error(`the line fails its own rails: ${problems.join('; ')}`);
  const sameChunkElsewhere = legos.filter((l) => l.known_text === lego.known_text && l.lego_id !== lego.lego_id).map((l) => `${l.lego_id} → ${l.target_text}${l.is_new ? '' : ' (not new)'}`);
  return {
    lego_id: lego.lego_id, seed: lego.seed_number, known_text: lego.known_text, target_text: lego.target_text,
    seed_known: seed.known_text, seed_target: seed.target_text, seed_approved_at: seed.approved_at,
    first_his: f.his && `${f.his.lego_id} (seed ${f.his.seed_number}) → ${f.his.target_text}`,
    first_her: f.her && `${f.her.lego_id} (seed ${f.her.seed_number}) → ${f.her.target_text}`,
    same_chunk_elsewhere: sameChunkElsewhere,
    text, back_translation: BACK_TRANSLATION,
  };
}

async function main() {
  require('dotenv').config({ path: path.join(ROOT, '.env') });
  const { createClient } = require('@supabase/supabase-js');
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const { normalizeForAudio } = require('../../services/shared/text-normalize.cjs');
  const presentationAuthor = require('../../services/phases/presentation-author.cjs');
  const ha = require('../../services/shared/human-authored-presentations.cjs');
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const APPLY = process.argv.includes('--apply');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data; };

  const course = must(await supabase.from('courses').select('course_code, known_lang, target_lang, voice_config').eq('course_code', COURSE).single(), 'course');
  const tpl = must(await supabase.from('presentation_templates').select('template').eq('known_lang', 'hin').eq('is_active', true).order('priority', { ascending: false }).limit(1), 'template');
  if (!tpl.length || tpl[0].template !== HINDI_TEMPLATE) throw new Error(`live Hindi template is "${tpl[0]?.template}" — the plan assumes "${HINDI_TEMPLATE}"; refusing`);
  const langName = presentationAuthor.localisedLangName(course.target_lang, course.known_lang);
  if (langName !== TARGET_LANG_NAME) throw new Error(`localisedLangName gives "${langName}", plan assumes "${TARGET_LANG_NAME}" — refusing`);

  // Every LEGO of the course, so "first" is measured, not remembered.
  const legos = [];
  for (let from = 0; ; from += 1000) {
    const page = must(await supabase.from('course_legos').select('lego_id, seed_number, lego_index, known_text, target_text, is_new, presentation_audio_id').eq('course_code', COURSE).order('seed_number').order('lego_index').range(from, from + 999), 'legos');
    legos.push(...page); if (page.length < 1000) break;
  }
  const seedNums = [...new Set(legos.filter((l) => carriesHisHer(l.target_text)).map((l) => l.seed_number))].slice(0, 5);
  const seeds = must(await supabase.from('course_seeds').select('seed_number, known_text, target_text, approved_at').eq('course_code', COURSE).in('seed_number', seedNums), 'seeds');
  const plan = planLine({ legos, seeds });
  const real = presentationAuthor.renderIntro({ frame: 'B', template: HINDI_TEMPLATE, targetLangName: langName, chunk: plan.known_text, seed: plan.seed_known });
  if (!plan.text.endsWith(real)) throw new Error(`renderIntro disagrees with the plan\n  real: ${real}\n  plan: ${plan.text}`);

  const existingMark = await ha.loadMark(supabase, COURSE, plan.lego_id);
  const existingRows = must(await supabase.from('course_audio').select('id, s3_key, voice_id, text').eq('course_code', COURSE).eq('role', 'presentation').eq('lego_id', plan.lego_id), 'presentation rows');
  const out = { sweep: SWEEP, job: JOB, apply: APPLY, at: new Date().toISOString(), plan, existing_mark: existingMark, presentation_rows_before: existingRows };

  console.log(`${APPLY ? 'APPLY' : 'DRY RUN'} — ${COURSE} (${JOB})`);
  console.log(`first "his": ${plan.first_his}\nfirst "her": ${plan.first_her}\nsame chunk elsewhere: ${plan.same_chunk_elsewhere.join(', ') || 'none'}`);
  console.log(`\n${plan.lego_id} (seed ${plan.seed}, approved_at=${plan.seed_approved_at || 'NULL'})  "${plan.known_text}" → "${plan.target_text}"`);
  console.log(`  seed: ${plan.seed_known}  →  ${plan.seed_target}`);
  console.log(`  line: ${plan.text}`);
  console.log(`  back: ${plan.back_translation}`);
  console.log(`  mark before: ${existingMark ? `by ${existingMark.author}` : 'none'}; presentation rows before: ${existingRows.map((r) => `${r.s3_key.split('/')[0]}/${r.voice_id}`).join(', ') || 'none'}`);

  if (APPLY) {
    const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
    const eventId = await recordContentEdit(supabase, {
      identity, courseCode: COURSE, surface: SURFACE, operation: 'presentation-human-authored-line',
      scope: { seed_numbers: [plan.seed], lego_ids: [plan.lego_id], rows: 1 },
      detail: {
        job: JOB, ask: "Kai 2026-09-23: in the first his/her presentation, say in Hindi that English says it differently for a man and a woman; no grammar",
        modelled_on: "Kai 2026-08-25 and 2026-09-02 (d/aab243eb): the woman's voice talks about a woman, the man's voice about a man",
        lego: { lego_id: plan.lego_id, known_text: plan.known_text, target_text: plan.target_text }, text: plan.text, back_translation: plan.back_translation,
        first_his: plan.first_his, first_her: plan.first_her, rendered: false, reviewer: 'Shuchita (seed unapproved)',
      },
    });
    out.edit_event_id = eventId;
    const lego = legos.find((l) => l.lego_id === plan.lego_id);
    // 1. The mark, first — the trigger then admits only these words on this LEGO's presentation row.
    const mark = await ha.markHumanAuthored(supabase, {
      courseCode: COURSE, legoId: plan.lego_id, text: plan.text, lego, by: `${SURFACE} (${JOB})`,
      author: `agent draft for Kai (${JOB}), modelled on Kai's wording of 2026-08-25/2026-09-02; Hindi non-native, reviewer Shuchita`,
      authoredOn: '2026-09-23', source: `${SURFACE}; Kai's ask 2026-09-23; ${JOB}`,
      why: "Kai's ask 2026-09-23: explain in Hindi, at the first his/her LEGO, why the two English voices say different things",
    });
    out.mark = mark;
    // 2. The pending row, in the presentation voice, exactly as #845·H attached the कल introductions.
    const voiceId = presentationAuthor.resolvePresentationVoiceId(course);
    const row = {
      course_code: COURSE, text: plan.text, text_normalized: normalizeForAudio(plan.text),
      language: course.known_lang, role: 'presentation', voice_id: voiceId, origin: 'tts',
      s3_key: `pending/${randomUUID().toUpperCase()}.mp3`, lego_id: plan.lego_id,
    };
    must(await supabase.from('course_audio').upsert([row], { onConflict: 'course_code,text_normalized,language,role,voice_id', ignoreDuplicates: true }), 'pending presentation row');
    out.pending_voice_id = voiceId;
    // 3. Unapprove the seed — Shuchita reviews the draft.
    must(await supabase.from('course_seeds').update({ approved_at: null, last_edit_event_id: eventId }).eq('course_code', COURSE).eq('seed_number', plan.seed), 'unapprove seed');
    out.after = {
      mark: await ha.loadMark(supabase, COURSE, plan.lego_id),
      rows: must(await supabase.from('course_audio').select('id, s3_key, voice_id, text').eq('course_code', COURSE).eq('role', 'presentation').eq('lego_id', plan.lego_id), 'rows after'),
      seed: must(await supabase.from('course_seeds').select('seed_number, approved_at, last_edit_event_id').eq('course_code', COURSE).eq('seed_number', plan.seed).single(), 'seed after'),
    };
    const fresh = out.after.rows.filter((r) => r.s3_key.startsWith('pending/') && ha.pendingRowIsFresh(r, out.after.mark));
    out.after.fresh_pending_rows = fresh.length;
    console.log('\nAFTER:');
    console.log(`  mark: ${out.after.mark ? `author "${out.after.mark.author}", ${out.after.mark.decisions.length} decision(s)` : 'MISSING'}`);
    for (const r of out.after.rows) console.log(`  row ${r.s3_key.split('/')[0]} [${r.voice_id}] ${r.text.slice(0, 80)}…`);
    console.log(`  fresh pending rows carrying the mark's words: ${fresh.length}`);
    console.log(`  seed ${out.after.seed.seed_number} approved_at=${out.after.seed.approved_at || 'NULL'}`);
    if (fresh.length !== 1) throw new Error(`expected exactly one fresh pending row, found ${fresh.length}`);
  }
  const ev = evidencePath(`tools/course-optimization/${SWEEP}${APPLY ? '' : '-dryrun'}.json`);
  fs.mkdirSync(path.dirname(ev), { recursive: true });
  fs.writeFileSync(ev, JSON.stringify(out, null, 2));
  console.log(`\nevidence: ${ev}`);
}

module.exports = { COURSE, HINDI_TEMPLATE, EXPLANATION, BACK_TRANSLATION, GRAMMAR_TERMS, carriesHisHer, isPossessiveHisHer, firstHisHer, planIntro, planLineText, lineProblems, planLine };
if (require.main === module) {
  main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
}
