#!/usr/bin/env node
'use strict';
// eng_for_hin — seeds 651 and 653 get their new LEGO back (Kai, 2026-09-23, job #931·H; the defect is d/aa26b755).
//
// WHAT WENT WRONG. Shuchita proofread the Hindi of both seeds (31 Aug / 1 Sept), then the 2 Sept rebuild reused the
// OLD Hindi for the LEGO row, which matched an earlier LEGO on both sides and was stored is_new = false with no phrases:
//   651  आपका क्या ख़्याल है, मैडम?    → What do you think madam?   row: आप क्या सोचते हैं → what do you think   (= S0162L01)
//   653  आपको आपत्ति तो नहीं है, मैडम? → Do you mind madam?         row: क्या आपको आपत्ति होगी → do you mind    (= S0190L01)
// course_round_index is built from is_new = true rows only, so neither seed has ever played. Under Kai's both-sides
// rule (2026-09-23: a LEGO is a duplicate only if BOTH Hindi and English match an earlier LEGO) the seed's CURRENT
// Hindi prompt is taught nowhere earlier, so it is a new LEGO. Each seed is re-cut as
//   L01  <the seed's proofread Hindi> → <same English>   NEW, 3 build + 5 use, known vocabulary only
//   L02  मैडम → madam                                    duplicate of S0642L02, no basket (as today)
// through /edit-cascade → /seed/complete, the same gate path every seed goes through (tiling, containment, vocab
// chunk-tiling, ZUT, counts). Tom's rule — the same English is never practised twice — is checked live against every
// phrase in the course before the write. The other 11 empty seeds are NOT touched: Kai is deciding those separately.
//
// GATES before any write: offline rules; LEGO conflict check against the family (must not be a duplicate); phrase ZUT;
// the Shuchita deterministic rulebook; the edit-cascade DRY RUN per seed; no learner past seed 650. Identified write,
// redo snapshot, edit event, the seed unapproved so the proofreader sees it, round index refreshed, a pending Frame A
// intro row in the presentation voice for each new LEGO, audio pass appended (nothing rendered).
//
//   node tools/course-optimization/eng-for-hin-seeds-651-653-new-lego-2026-09-23.cjs            # dry run
//   node tools/course-optimization/eng-for-hin-seeds-651-653-new-lego-2026-09-23.cjs --rows f   # export rows for the checkers
//   node tools/course-optimization/eng-for-hin-seeds-651-653-new-lego-2026-09-23.cjs --apply

const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
const P = require('./eng-for-hin-seed-489-if-fold-490-kabhi-2026-09-23.cjs'); // phraseContainsLego, phraseRows, frameAIntro

const COURSE = 'eng_for_hin';
const JOB = '#931·H';
const SWEEP = 'eng-for-hin-seeds-651-653-new-lego-2026-09-23';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const RULING = `Kai, 2026-09-23 (job ${JOB}): seeds 651 and 653 lost their new block when the 2 Sept rebuild reused pre-proofread Hindi; the seed's current Hindi prompt is taught nowhere earlier, so it is a new LEGO (both-sides rule, 2026-09-23)`;
const BUILDER = process.env.COURSE_BUILDER_SELF_URL || 'http://localhost:3471';
const HINDI_TEMPLATE = "{target_lang_name} में — '{known}' — जैसे — '{seed}' — में :";
const TARGET_LANG_NAME = 'अंग्रेज़ी';
const MADAM = { known: 'मैडम', target: 'madam', original: 'S0642L02' };

const SEEDS = [
  {
    seed: 651,
    text: { known: 'आपका क्या ख़्याल है, मैडम?', target: 'What do you think madam?' },
    old: { known: 'आप क्या सोचते हैं', target: 'what do you think', original: 'S0162L01' },
    lego: { known: 'आपका क्या ख़्याल है', target: 'what do you think' },
    build: [
      { known: 'इस बारे में आपका क्या ख़्याल है, मैडम?', target: 'what do you think about it madam?' },
      { known: 'उस जगह के बारे में आपका क्या ख़्याल है?', target: 'what do you think about that place?' },
      { known: 'उस फ़िल्म के बारे में आपका क्या ख़्याल है?', target: 'what do you think about the film?' },
    ],
    use: [
      { known: 'इस बारे में आपका क्या ख़्याल है, सर?', target: 'what do you think about it sir?' },
      { known: 'मेरे दोस्त के बारे में आपका क्या ख़्याल है, मैडम?', target: 'what do you think about my friend madam?' },
      { known: 'अब आपका क्या ख़्याल है, मैडम?', target: 'what do you think now madam?' },
      { known: 'उस बारे में आपका क्या ख़्याल है, सर?', target: 'what do you think about that sir?' },
      { known: 'अब इस बारे में आपका क्या ख़्याल है, मैडम?', target: 'what do you think about it now madam?' },
    ],
  },
  {
    seed: 653,
    text: { known: 'आपको आपत्ति तो नहीं है, मैडम?', target: 'Do you mind madam?' },
    old: { known: 'क्या आपको आपत्ति होगी', target: 'do you mind', original: 'S0190L01' },
    lego: { known: 'आपको आपत्ति तो नहीं है', target: 'do you mind' },
    build: [
      { known: 'आपको इंतज़ार करने में आपत्ति तो नहीं है, मैडम?', target: 'do you mind waiting madam?' },
      { known: 'आपको आज इंतज़ार करने में आपत्ति तो नहीं है?', target: 'do you mind waiting today?' },
      { known: 'आपको मेरी मदद करने में आपत्ति तो नहीं है, मैडम?', target: 'do you mind helping me madam?' },
    ],
    use: [
      { known: 'आपको यहाँ इंतज़ार करने में आपत्ति तो नहीं है, सर?', target: 'do you mind waiting here sir?' },
      { known: 'आपको आज रात इंतज़ार करने में आपत्ति तो नहीं है, मैडम?', target: 'do you mind waiting tonight madam?' },
      { known: 'आपको अंग्रेज़ी में बात करने में आपत्ति तो नहीं है, सर?', target: 'do you mind speaking English sir?' },
      { known: 'आपको कुछ मिनट इंतज़ार करने में आपत्ति तो नहीं है, मैडम?', target: 'do you mind waiting for a few minutes madam?' },
      { known: 'आपको अभी मेरी मदद करने में आपत्ति तो नहीं है, सर?', target: 'do you mind helping me now sir?' },
    ],
  },
];
const legoBody = (s) => [
  { idx: 1, type: 'A', known: s.lego.known, target: s.lego.target, build: s.build, use: s.use },
  { idx: 2, type: 'A', known: MADAM.known, target: MADAM.target, build: [], use: [] },
];
const seedId = (n) => `S${String(n).padStart(4, '0')}`;
function allRows() {
  const rows = [];
  for (const s of SEEDS) {
    rows.push({ seed: s.seed, id: seedId(s.seed), role: 'seed', known: s.text.known, target: s.text.target });
    rows.push({ seed: s.seed, id: `${seedId(s.seed)}L01`, role: 'lego', known: s.lego.known, target: s.lego.target });
    for (const p of P.phraseRows(`${seedId(s.seed)}L01`, s.build, s.use)) rows.push({ seed: s.seed, ...p });
  }
  return rows;
}
const phraseRowsOf = (s) => P.phraseRows(`${seedId(s.seed)}L01`, s.build, s.use);

function offlineCheck() {
  const problems = [];
  const targets = [];
  for (const s of SEEDS) {
    const legos = [s.lego, MADAM];
    if (!P.legosTileSeedBothSides(legos, s.text)) problems.push(`${s.seed}: L01 + मैडम do not tile the seed on both sides`);
    if (s.lego.known === s.old.known) problems.push(`${s.seed}: the new Hindi is the old Hindi — nothing to fix`);
    if (s.lego.target !== s.old.target) problems.push(`${s.seed}: the English of the LEGO must not change (${s.old.target} → ${s.lego.target})`);
    for (const p of [...s.build, ...s.use]) {
      if (!P.phraseContainsLego(s.lego, p)) problems.push(`${s.seed}: "${p.target}" does not contain the LEGO on both sides`);
      targets.push(p.target.toLowerCase());
    }
    if (s.build.length < 3 || s.use.length < 5) problems.push(`${s.seed}: basket short`);
    if (![...s.build, ...s.use].some(p => /मैडम/u.test(p.known) && /madam/i.test(p.target))) problems.push(`${s.seed}: no line carries मैडम in the madam block`);
    for (const p of [...s.build, ...s.use]) if ((/मैडम/u.test(p.known)) !== (/\bmadam\b/i.test(p.target)) || (/(^|[\s,])सर([\s,?।]|$)/u.test(p.known)) !== (/\bsir\b/i.test(p.target))) problems.push(`${s.seed}: "${p.target}" sir/madam mismatch across sides`);
  }
  if (new Set(targets).size !== targets.length) problems.push('a phrase repeats another phrase in this batch');
  return problems;
}

function supa() { const { createClient } = require('@supabase/supabase-js'); return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } }); }
async function postJson(url, body, headers = {}) { const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) }); let json = null; try { json = await r.json(); } catch { /* */ } return { ok: r.ok, status: r.status, json }; }
const IDENTITY_HEADERS = { 'x-agent-id': `${SWEEP} (${JOB})`, 'x-agent-role': 'content-sweep', 'x-service-name': SWEEP };

async function guard(sb) {
  const problems = [];
  for (const s of SEEDS) {
    const { data: seed } = await sb.from('course_seeds').select('known_text, target_text').eq('course_code', COURSE).eq('seed_number', s.seed).single();
    if (!seed || seed.known_text !== s.text.known || seed.target_text !== s.text.target) problems.push(`seed ${s.seed} is "${seed?.known_text}" → "${seed?.target_text}"`);
    const { data: legos } = await sb.from('course_legos').select('lego_id, is_new, known_text, target_text').eq('course_code', COURSE).eq('seed_number', s.seed).order('lego_index');
    const live = (legos || []).map(l => `${l.lego_id}|${l.is_new}|${l.known_text}|${l.target_text}`).join('\n');
    const want = [`${seedId(s.seed)}L01|false|${s.old.known}|${s.old.target}`, `${seedId(s.seed)}L02|false|${MADAM.known}|${MADAM.target}`].join('\n');
    if (live !== want) problems.push(`seed ${s.seed} LEGOs are not the rows this tool was written against:\n${live}`);
    const { count: nPhrases } = await sb.from('course_practice_phrases').select('id', { count: 'exact', head: true }).eq('course_code', COURSE).eq('seed_number', s.seed);
    if (nPhrases) problems.push(`seed ${s.seed} has ${nPhrases} phrases; expected none`);
    // both-sides rule, checked live: nothing earlier teaches the new Hindi with this English
    const { data: earlier } = await sb.from('course_legos').select('lego_id').eq('course_code', COURSE).lt('seed_number', s.seed).eq('known_text', s.lego.known).eq('target_text', s.lego.target);
    if ((earlier || []).length) problems.push(`seed ${s.seed}: "${s.lego.known}" → "${s.lego.target}" is already taught at ${earlier.map(l => l.lego_id).join(', ')} — it IS a duplicate`);
    const { data: orig } = await sb.from('course_legos').select('known_text, target_text, is_new').eq('course_code', COURSE).eq('lego_id', s.old.original).single();
    if (!orig || orig.known_text !== s.old.known || orig.target_text !== s.old.target) problems.push(`${s.old.original} is not "${s.old.known}" → "${s.old.target}"`);
    const { data: dupes } = await sb.from('course_practice_phrases').select('id, target_text').eq('course_code', COURSE).in('target_text', [...s.build, ...s.use].map(p => p.target));
    for (const d of dupes || []) problems.push(`seed ${s.seed}: "${d.target_text}" is already practised at ${d.id}`);
  }
  const { data: madam } = await sb.from('course_legos').select('known_text, target_text, is_new').eq('course_code', COURSE).eq('lego_id', MADAM.original).single();
  if (!madam || madam.known_text !== MADAM.known || madam.target_text !== MADAM.target || !madam.is_new) problems.push(`${MADAM.original} is not the new मैडम → madam`);
  const { count } = await sb.from('course_enrollments').select('learner_id', { count: 'exact', head: true }).eq('course_id', COURSE).gte('highest_completed_seed', 650);
  const { count: prog } = await sb.from('lego_progress').select('*', { count: 'exact', head: true }).eq('course_id', COURSE).or('lego_id.like.S0651%,lego_id.like.S0653%');
  if ((count || 0) > 0 || (prog || 0) > 0) problems.push(`learners past seed 650: ${count}; progress rows on S0651*/S0653*: ${prog} — migrate progress first`);
  return problems;
}

async function dryRunThroughGates(s) {
  const body = { seed_number: s.seed, target_text: s.text.target, generateAudio: false, dryRun: true, legos: legoBody(s) };
  const [dry, base] = await Promise.all([postJson(`${BUILDER}/api/course/${COURSE}/edit-cascade`, body, IDENTITY_HEADERS), postJson(`${BUILDER}/api/v2/validate/${COURSE}`, { fromSeed: s.seed })]);
  if (!dry.ok || !dry.json?.ok) throw new Error(`edit-cascade dry run ${s.seed} refused: ${dry.status} ${JSON.stringify(dry.json).slice(0, 800)}`);
  const baseline = new Map((base.json?.failures || []).map(f => [f.seed, new Set(f.issues)]));
  const caused = [];
  // The dry-run override marks EVERY submitted LEGO is_new (edit-cascade.cjs buildValidateOverride), so it demands a
  // basket for the मैडम duplicate; the real write stores it is_new = false and the validator skips it. That one issue
  // on L2 of the edited seed is the override's artefact, not a failure of the cut — anything else counts.
  const overrideArtefact = (f, i) => f.seed === s.seed && /^L2: BUILD: need/.test(i);
  for (const f of dry.json.blastRadius?.failures || []) { const fresh = (f.issues || []).filter(i => !(baseline.get(f.seed) || new Set()).has(i) && !overrideArtefact(f, i)); if (fresh.length) caused.push({ seed: f.seed, issues: fresh }); }
  return { seed: s.seed, case: dry.json.case, vocabDelta: dry.json.vocabDelta, baselineRed: baseline.size, caused };
}

async function main() {
  const apply = process.argv.includes('--apply');
  const rowsAt = process.argv.indexOf('--rows');
  if (rowsAt >= 0) { fs.writeFileSync(process.argv[rowsAt + 1], JSON.stringify(allRows(), null, 1)); console.log(`${allRows().length} rows → ${process.argv[rowsAt + 1]}`); return; }
  const sb = supa();
  console.log(`\n══════ ${COURSE}: seeds 651 + 653 get their new LEGO (${JOB}) ══════`);
  const offline = offlineCheck();
  if (offline.length) throw new Error(`offline rules: ${offline.join('; ')}`);
  console.log('offline: L01 + मैडम tile each seed both sides; every phrase contains its LEGO both sides; 3 build + 5 use each; sir/madam matched across sides');
  const problems = await guard(sb);
  for (const p of problems) console.error(`BLOCKED  ${p}`);
  if (problems.length) { console.error('\nBLOCKED — live state differs. Nothing written.'); process.exit(1); }
  console.log('live: both seeds hold the pre-proofread duplicate rows and no phrases; the new Hindi is taught nowhere earlier; no English practised elsewhere; learners past 650: 0');

  const { checkLegoConflict, checkPhraseZUT, isDedupConflict } = require('../../services/course-builder/lib/validation.cjs');
  const { courseFamily } = require('../../services/course-builder/lib/course-family.cjs');
  const { runDeterministic } = require('./eng-for-hin-shuchita-rulebook.cjs');
  const family = await courseFamily(sb, COURSE);
  const gates = [];
  for (const s of SEEDS) {
    const c = await checkLegoConflict(sb, COURSE, s.lego.known, s.lego.target, s.seed, { family });
    if (c.conflict === 'zut') throw new Error(`${s.seed} L01 ZUT: ${c.error || JSON.stringify(c)}`);
    if (isDedupConflict(c)) throw new Error(`${s.seed} L01 would be stored as a duplicate of ${c.legoId}`);
    const zut = await checkPhraseZUT(sb, COURSE, [...s.build, ...s.use], s.seed, { family });
    if (zut.length) throw new Error(`phrase ZUT ${s.seed}: ${JSON.stringify(zut)}`);
    const hits = allRows().filter(r => r.seed === s.seed && r.role !== 'seed').flatMap(r => runDeterministic({ seed: r.seed, id: r.id, role: r.role, known: r.known, target: r.target }));
    if (hits.length) throw new Error(`Shuchita deterministic ${s.seed}: ${JSON.stringify(hits)}`);
    const g = await dryRunThroughGates(s);
    gates.push(g);
    console.log(`${s.seed}: L01 not a duplicate (${c.conflict || 'no conflict'}); ZUT clean; Shuchita deterministic 0 hits; edit-cascade dry run ${g.case}, vocab +${JSON.stringify(g.vocabDelta?.added)} −${JSON.stringify(g.vocabDelta?.removed)}, already red from ${s.seed}: ${g.baselineRed}, caused: ${g.caused.length ? JSON.stringify(g.caused) : 'none'}`);
    if (g.caused.length) { console.error('BLOCKED — the cut fails a live gate.'); process.exit(1); }
  }

  const { evidencePath } = require('../lib/evidence-path.cjs');
  const out = { sweep: SWEEP, job: JOB, at: new Date().toISOString(), ruling: RULING, apply, seeds: SEEDS, gates };
  if (!apply) { const ev = evidencePath(`tools/course-optimization/${SWEEP}-dryrun.json`); fs.writeFileSync(ev, JSON.stringify(out, null, 1)); console.log(`\nDRY RUN — nothing written. evidence: ${ev}`); return; }

  // ─── apply ──────────────────────────────────────────────────────────────
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const { snapshotSeeds } = require('../../services/course-builder/lib/redo-snapshot.cjs');
  const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
  const { normalizeForAudio } = require('../../services/shared/text-normalize.cjs');
  const presentationAuthor = require('../../services/phases/presentation-author.cjs');
  const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data; };
  const course = must(await sb.from('courses').select('course_code,known_lang,target_lang,voice_config').eq('course_code', COURSE).single(), 'course');
  const tpl = must(await sb.from('presentation_templates').select('template').eq('known_lang', 'hin').eq('is_active', true).order('priority', { ascending: false }).limit(1), 'template');
  if (!tpl.length || tpl[0].template !== HINDI_TEMPLATE) throw new Error(`live Hindi template is "${tpl[0]?.template}" — refusing`);
  if (presentationAuthor.localisedLangName(course.target_lang, course.known_lang) !== TARGET_LANG_NAME) throw new Error('localisedLangName disagrees — refusing');
  const presVoice = presentationAuthor.resolvePresentationVoiceId(course);
  const pending = must(await sb.from('audio_pass_requests').select('id, reason, metadata').eq('course_code', COURSE).eq('status', 'pending').maybeSingle(), 'pending audio pass');
  if (!pending) throw new Error(`no pending audio-pass request for ${COURSE}`);
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const results = [];
  for (const s of SEEDS) {
    const sid = seedId(s.seed);
    const snap = await snapshotSeeds(sb, COURSE, [s.seed], { reason: 'seed-651-653-new-lego', notes: `${RULING}. Undo: POST /api/build/redo-undo/${COURSE}.` });
    const eventId = await recordContentEdit(sb, { identity, courseCode: COURSE, surface: SURFACE, operation: 'lego-recut',
      scope: { seed_numbers: [s.seed], lego_ids: [`${sid}L01`, `${sid}L02`], phrase_ids: phraseRowsOf(s).map(p => p.id) },
      detail: { job: JOB, ruling: RULING, from: [s.old, MADAM], to: [s.lego, MADAM], phrases: phraseRowsOf(s).length, snapshot_batch: snap.batchId } });
    console.log(`${s.seed}: edit event ${eventId}; snapshot batch ${snap.batchId}`);
    const cascade = await postJson(`${BUILDER}/api/course/${COURSE}/edit-cascade`, { seed_number: s.seed, target_text: s.text.target, generateAudio: false, dryRun: false, legos: legoBody(s) }, IDENTITY_HEADERS);
    if (!cascade.ok || !cascade.json?.ok) throw new Error(`edit-cascade apply ${s.seed} failed (route rolled back): ${cascade.status} ${JSON.stringify(cascade.json).slice(0, 800)}`);
    const after = must(await sb.from('course_legos').select('lego_id, known_text, target_text, is_new').eq('course_code', COURSE).eq('seed_number', s.seed).order('lego_index'), 'legos after');
    if (after.length !== 2 || !after[0].is_new || after[0].known_text !== s.lego.known || after[0].target_text !== s.lego.target || after[1].is_new || after[1].known_text !== MADAM.known) throw new Error(`seed ${s.seed} after: ${JSON.stringify(after)}`);
    const { count: nPhrases } = await sb.from('course_practice_phrases').select('id', { count: 'exact', head: true }).eq('course_code', COURSE).eq('seed_number', s.seed);
    if (nPhrases !== phraseRowsOf(s).length) throw new Error(`seed ${s.seed}: ${nPhrases} phrases after, expected ${phraseRowsOf(s).length}`);
    for (const l of after) console.log(`  ${l.lego_id}  is_new=${l.is_new}  "${l.known_text}" → "${l.target_text}"`);
    console.log(`  ${nPhrases} phrases written`);
    must(await sb.from('course_legos').update({ last_edit_event_id: eventId }).eq('course_code', COURSE).eq('seed_number', s.seed), 'legos event');
    must(await sb.from('course_practice_phrases').update({ last_edit_event_id: eventId }).eq('course_code', COURSE).eq('seed_number', s.seed), 'phrases event');
    const intro = P.frameAIntro(s.lego.known, presentationAuthor.renderIntro);
    if (!intro.includes(`'${s.lego.known}'`) || /जैसे|as in/.test(intro)) throw new Error(`intro "${intro}" is not the bare Frame A line — refusing`);
    const row = { course_code: COURSE, text: intro, text_normalized: normalizeForAudio(intro), language: course.known_lang, role: 'presentation', voice_id: presVoice, origin: 'tts', s3_key: `pending/${randomUUID().toUpperCase()}.mp3`, lego_id: `${sid}L01` };
    must(await sb.from('course_audio').upsert([row], { onConflict: 'course_code,text_normalized,language,role,voice_id', ignoreDuplicates: true }), `${sid}L01 pending presentation`);
    const got = must(await sb.from('course_audio').select('id,s3_key,lego_id').eq('course_code', COURSE).eq('role', 'presentation').eq('text_normalized', row.text_normalized).eq('voice_id', presVoice), 'pending row after');
    if (!got.some(p => p.lego_id === `${sid}L01`)) throw new Error(`${sid}L01: presentation row keyed elsewhere (${got.map(p => p.lego_id).join(',')})`);
    console.log(`  intro (${got[0].s3_key.startsWith('pending/') ? 'pending' : 'existing'}, ${presVoice}) ${sid}L01: ${intro}`);
    must(await sb.from('course_seeds').update({ approved_at: null, last_edit_event_id: eventId }).eq('course_code', COURSE).eq('seed_number', s.seed), 'unapprove');
    results.push({ seed: s.seed, eventId, snapshot: snap.batchId, after, phrases: nPhrases, presentation: got.map(g => g.id), cascade: cascade.json?.message });
  }
  await refreshNow();
  const { data: idx } = await sb.from('course_round_index').select('lego_id, seed_number').eq('course_code', COURSE).in('seed_number', SEEDS.map(s => s.seed));
  console.log(`seeds unapproved; course_round_index refreshed — now lists ${(idx || []).map(r => r.lego_id).join(', ') || 'NOTHING for 651/653'}`);
  if ((idx || []).length !== SEEDS.length) throw new Error('round index does not list both new LEGOs');
  const mine = `seeds 651 + 653 re-cut with a NEW L01 matching the proofread Hindi (आपका क्या ख़्याल है → what do you think; आपको आपत्ति तो नहीं है → do you mind), 8 phrases each null-audio in Kriti/Charlotte, 2 pending Frame A intros in the presentation voice (job ${JOB}, Kai 2026-09-23)`;
  must(await sb.from('audio_pass_requests').update({ reason: `${pending.reason} + ${mine}`, metadata: { ...pending.metadata, job931Seeds651653: results.map(r => ({ seed: r.seed, editEventId: r.eventId, snapshotBatch: r.snapshot, presentations: r.presentation })) }, updated_at: new Date().toISOString() }).eq('id', pending.id), 'audio-pass append');
  console.log(`audio pass: appended to pending request ${pending.id}`);
  out.results = results;
  const ev = evidencePath(`tools/course-optimization/${SWEEP}.json`); fs.writeFileSync(ev, JSON.stringify(out, null, 1)); console.log(`evidence: ${ev}`);
}

module.exports = { COURSE, SEEDS, MADAM, legoBody, allRows, offlineCheck };
if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
