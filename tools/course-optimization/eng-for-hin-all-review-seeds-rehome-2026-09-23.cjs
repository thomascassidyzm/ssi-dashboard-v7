#!/usr/bin/env node
'use strict';
// eng_for_hin — the all-review seeds: re-home each sentence, never pad (Kai's rule, 2026-09-23 19:40Z, job #932·H).
//
// Kai, verbatim: "we shouldn't include a big block just to stop a seed from being empty. We can try to include bits
// from the seed under other legos in the area to make sure they're not fully lost and even make sure we include the
// seed itself somewhere (if it is completely taught by a certain point in the course before the seed, then there must
// be a point where the final needed lego is taught - that's where it can go)."
//
// THE 11 EMPTY SEEDS (every LEGO a duplicate, so the app never plays them; 651 and 653 are job #931's and untouched):
//   WRITE — the sentence becomes one extra 'use' phrase under the LEGO whose debut completes its coverage:
//     189  हाँ, यह अच्छा विचार है।                      → yes that's a good idea            host S0123L02 (यह अच्छा विचार है), piece S0097L01 हाँ
//     650  क्या आप जाना चाहती हैं, मैडम?                → do you want to go madam?          host S0642L02 (मैडम), piece S0156L01; चाहती agrees with madam
//     654  मुझे यक़ीन नहीं है कि मैं आपकी मदद कर सकता हूँ या नहीं, सर। → I'm not sure if I can help you sir  host S0639L02 (सर), pieces S0010L03 + S0062L01; या नहीं met in S0525L02
//     665  क्या आप सब जाना चाहते हैं?                   → do you all want to go?            host S0658L01 (क्या आप सब चाहते हैं), piece S0177L01 जाना
//   NOTHING TO WRITE — the sentence already reaches the learner:
//     194, 543  the sentence IS an earlier LEGO (S0068L01 "what are you looking for", S0387L03 "she was right"): met at that debut
//     636, 645, 648, 649, 655  already a phrase, byte-for-byte in English, under S0635L01B01 / S0642L02B03 / S0642L02U03 /
//                              S0639L02B02 / S0642L02U05 — the same English is never practised twice (Tom)
//   Shorter bits: every shorter bit of these sentences is itself a LEGO or is already practised ("I'm not sure if I can
//   help you" exists), so no bit phrases are added.
//
// THE 12 NEAR-EMPTY SEEDS (75, 145, 175, 227, 245, 356, 435, 515, 552, 576, 583, 668): all KEPT. None of their blocks
// tiles from earlier LEGO PAIRS on both sides (services/course-builder/lib/all-review-seed.cjs paddedBlockPieces is
// null for every one), so the learner does not have every piece as a chunk; 145 carries an untaught "any", 227 an
// untaught बताने. Kai's keep-by-default stands. Nothing here touches them.
//
// GATES before any write: offline rules (each phrase contains its host on both sides, is not a bare LEGO, uses no word
// the learner has not met in an earlier LEGO); live guard (seed texts, host baskets, the sentence not already practised);
// phrase ZUT against the family; the Shuchita checker on --rows; a cross-family (Astra) read of the four lines. Then:
// edit event, 4 inserts, host seeds 123/639/642/658 unapproved so the proofreader sees the new rows, audio noted on the
// pending audio-pass request (no render), round index untouched (no is_new changes).
//
//   node tools/course-optimization/eng-for-hin-all-review-seeds-rehome-2026-09-23.cjs            # dry run through the gates
//   node tools/course-optimization/eng-for-hin-all-review-seeds-rehome-2026-09-23.cjs --rows f   # export rows for the checkers
//   node tools/course-optimization/eng-for-hin-all-review-seeds-rehome-2026-09-23.cjs --apply

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
const R = require('../../services/course-builder/lib/all-review-seed.cjs');

const COURSE = 'eng_for_hin';
const JOB = '#932·H';
const SWEEP = 'eng-for-hin-all-review-seeds-rehome-2026-09-23';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const RULING = `Kai, 2026-09-23 19:40Z (job ${JOB}): no big block to keep a seed alive; an all-review seed's sentence goes under the LEGO whose debut completes its coverage`;

/** The four re-homes. English follows the host basket's convention (lower-case start, no final full stop, no comma before sir/madam). */
const REHOMES = [
  { seed: 189, host: 'S0123L02', pieces: ['S0097L01', 'S0123L02'], seedKnown: 'हाँ, यह अच्छा विचार है।', seedTarget: "Yes that's a good idea.",
    known: 'हाँ, यह अच्छा विचार है।', target: "yes that's a good idea" },
  { seed: 650, host: 'S0642L02', pieces: ['S0156L01', 'S0642L02'], seedKnown: 'क्या आप जाना चाहती हैं, मैडम?', seedTarget: 'Do you want to go madam?',
    known: 'क्या आप जाना चाहती हैं, मैडम?', target: 'do you want to go madam?' },
  { seed: 654, host: 'S0639L02', pieces: ['S0010L03', 'S0062L01', 'S0639L02'], seedKnown: 'मुझे यक़ीन नहीं है कि मैं आपकी मदद कर सकता हूँ या नहीं, सर।', seedTarget: "I'm not sure if I can help you, sir.",
    known: 'मुझे यक़ीन नहीं है कि मैं आपकी मदद कर सकता हूँ या नहीं, सर।', target: "I'm not sure if I can help you sir" },
  { seed: 665, host: 'S0658L01', pieces: ['S0658L01', 'S0177L01'], seedKnown: 'क्या आप सब जाना चाहते हैं?', seedTarget: 'Do you all want to go?',
    known: 'क्या आप सब जाना चाहते हैं?', target: 'do you all want to go?' },
];
/** The host LEGOs as live on 2026-09-23 and their basket sizes (the guard). */
const HOSTS = {
  S0123L02: { seed_number: 123, lego_index: 2, known: 'यह अच्छा विचार है', target: "that's a good idea", phrases: 8 },
  S0642L02: { seed_number: 642, lego_index: 2, known: 'मैडम', target: 'madam', phrases: 8 },
  S0639L02: { seed_number: 639, lego_index: 2, known: 'सर', target: 'sir', phrases: 8 },
  S0658L01: { seed_number: 658, lego_index: 1, known: 'क्या आप सब चाहते हैं', target: 'do you all want', phrases: 8 },
};
/** The seven empty seeds that need no write, and why. */
const NO_WRITE = [
  { seed: 194, why: 'bare-lego', at: 'S0068L01' }, { seed: 543, why: 'bare-lego', at: 'S0387L03' },
  { seed: 636, why: 'already-practised', at: `${COURSE}:S0635L01B01` }, { seed: 645, why: 'already-practised', at: `${COURSE}:S0642L02B03` },
  { seed: 648, why: 'already-practised', at: `${COURSE}:S0642L02U03` }, { seed: 649, why: 'already-practised', at: `${COURSE}:S0639L02B02` },
  { seed: 655, why: 'already-practised', at: `${COURSE}:S0642L02U05` },
];
const NEAR_EMPTY_KEPT = [75, 145, 175, 227, 245, 356, 435, 515, 552, 576, 583, 668];
const UNTOUCHED = [651, 653, 490];

const hostLego = (id) => ({ lego_id: id, ...HOSTS[id], known_text: HOSTS[id].known, target_text: HOSTS[id].target });
const phraseId = (r) => `${COURSE}:${r.host}U${String(HOSTS[r.host].phrases - 3 + 1).padStart(2, '0')}`; // 3 build + 5 use today → U06

// ── The rules, as code ───────────────────────────────────────────────────────
/** Every phrase contains its host on both sides, is not the host itself, and is the seed's own sentence in the basket's English convention. */
function offlineCheck() {
  const problems = [];
  for (const r of REHOMES) {
    const host = hostLego(r.host);
    if (!R.phraseContainsLego(host, r)) problems.push(`${r.seed}: "${r.target}" does not contain ${r.host} on both sides`);
    if (R.normalizedEnglish(r.target) === R.normalizedEnglish(host.target)) problems.push(`${r.seed}: the phrase IS the host LEGO`);
    if (R.normalizedEnglish(r.target) !== R.normalizedEnglish(r.seedTarget)) problems.push(`${r.seed}: phrase English is not the seed's`);
    if (R.tokens(r.known).join(' ') !== R.tokens(r.seedKnown).join(' ')) problems.push(`${r.seed}: phrase Hindi is not the seed's`);
    if (!r.pieces.includes(r.host)) problems.push(`${r.seed}: host is not one of its pieces`);
    if (Math.max(...r.pieces.map(p => Number(p.slice(1, 5)))) !== Number(r.host.slice(1, 5))) problems.push(`${r.seed}: host ${r.host} is not the latest-taught piece`);
    if (r.seed <= Number(r.host.slice(1, 5))) problems.push(`${r.seed}: host is not earlier than the seed`);
  }
  const targets = REHOMES.map(r => R.normalizedEnglish(r.target));
  if (new Set(targets).size !== targets.length) problems.push('two re-homes share one English');
  for (const s of [...NO_WRITE.map(n => n.seed), ...REHOMES.map(r => r.seed)]) if (UNTOUCHED.includes(s) || NEAR_EMPTY_KEPT.includes(s)) problems.push(`${s} must not be touched`);
  return problems;
}
/** Against the live earlier LEGOs: the rule finds the same host, and no word is new to the learner. */
function liveRuleCheck(r, priorLegos) {
  const problems = [];
  const f = R.findRehomeHost({ known_text: r.seedKnown, target_text: r.seedTarget }, priorLegos);
  if (!f.host) problems.push(`${r.seed}: the rule finds no host (${f.reason})`);
  else if (R.legoId(f.host) !== r.host) problems.push(`${r.seed}: the rule homes it under ${R.legoId(f.host)}, this tool says ${r.host}`);
  const eng = new Set(priorLegos.flatMap(l => R.tokens(l.target_text)));
  const hin = new Set(priorLegos.flatMap(l => R.tokens(l.known_text)));
  for (const w of R.tokens(r.target)) if (!eng.has(w)) problems.push(`${r.seed}: English word "${w}" is not in any earlier LEGO`);
  for (const w of R.tokens(r.known)) if (!hin.has(w)) problems.push(`${r.seed}: Hindi word "${w}" is not in any earlier LEGO`);
  return { problems, coverage: f.coverage, pieces: f.tiling ? f.tiling.map(R.legoId) : [] };
}
function allRows() {
  return REHOMES.map(r => ({ seed: HOSTS[r.host].seed_number, source_seed: r.seed, id: phraseId(r), role: 'use', known: r.known, target: r.target }));
}

// ── Live ────────────────────────────────────────────────────────────────────
function supa() { const { createClient } = require('@supabase/supabase-js'); return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } }); }
const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data; };

async function guard(sb) {
  const problems = [];
  const seedNums = [...REHOMES.map(r => r.seed), ...NO_WRITE.map(n => n.seed)];
  const seeds = must(await sb.from('course_seeds').select('seed_number, known_text, target_text').eq('course_code', COURSE).in('seed_number', seedNums), 'seeds');
  for (const r of REHOMES) {
    const s = seeds.find(x => x.seed_number === r.seed);
    if (!s || s.known_text !== r.seedKnown || s.target_text !== r.seedTarget) problems.push(`seed ${r.seed} is "${s?.known_text}" → "${s?.target_text}"`);
  }
  const legos = must(await sb.from('course_legos').select('lego_id, seed_number, is_new, known_text, target_text').eq('course_code', COURSE).in('seed_number', seedNums), 'legos');
  for (const n of seedNums) if (legos.some(l => l.seed_number === n && l.is_new)) problems.push(`seed ${n} has a NEW lego today — it is not empty`);
  const hosts = must(await sb.from('course_legos').select('lego_id, is_new, known_text, target_text').eq('course_code', COURSE).in('lego_id', Object.keys(HOSTS)), 'hosts');
  for (const [id, h] of Object.entries(HOSTS)) {
    const l = hosts.find(x => x.lego_id === id);
    if (!l || !l.is_new || l.known_text !== h.known || l.target_text !== h.target) problems.push(`${id} is ${JSON.stringify(l)}`);
  }
  for (const r of REHOMES) {
    const h = HOSTS[r.host];
    const ph = must(await sb.from('course_practice_phrases').select('id, phrase_role, position').eq('course_code', COURSE).eq('seed_number', h.seed_number).eq('lego_index', h.lego_index), `${r.host} basket`);
    if (ph.length !== h.phrases) problems.push(`${r.host} basket has ${ph.length} phrases, expected ${h.phrases}`);
    if (ph.some(p => p.id === phraseId(r))) problems.push(`${phraseId(r)} already exists`);
    const same = must(await sb.from('course_practice_phrases').select('id, target_text').eq('course_code', COURSE).ilike('target_text', `%${R.tokens(r.target).join('%')}%`), 'same English');
    const dup = R.alreadyPractised(r.target, same.map(p => p.target_text));
    if (dup) problems.push(`${r.seed}: "${r.target}" is already practised as ${same.find(p => p.target_text === dup).id}`);
  }
  for (const n of NO_WRITE) {
    if (n.why === 'already-practised') {
      const p = must(await sb.from('course_practice_phrases').select('target_text').eq('course_code', COURSE).eq('id', n.at).maybeSingle(), n.at);
      const s = seeds.find(x => x.seed_number === n.seed);
      if (!p || R.normalizedEnglish(p.target_text) !== R.normalizedEnglish(s.target_text)) problems.push(`seed ${n.seed}: ${n.at} is not its sentence any more (${p?.target_text})`);
    } else {
      const l = must(await sb.from('course_legos').select('target_text, is_new').eq('course_code', COURSE).eq('lego_id', n.at).maybeSingle(), n.at);
      const s = seeds.find(x => x.seed_number === n.seed);
      if (!l || !l.is_new || R.normalizedEnglish(l.target_text) !== R.normalizedEnglish(s.target_text)) problems.push(`seed ${n.seed}: ${n.at} is not its sentence any more (${l?.target_text})`);
    }
  }
  return problems;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const rowsAt = process.argv.indexOf('--rows');
  if (rowsAt >= 0) { fs.writeFileSync(process.argv[rowsAt + 1], JSON.stringify(allRows(), null, 1)); console.log(`${allRows().length} rows → ${process.argv[rowsAt + 1]}`); return; }
  const sb = supa();
  console.log(`\n══════ ${COURSE}: all-review seeds re-homed, never padded (${JOB}) ══════`);
  const offline = offlineCheck();
  if (offline.length) throw new Error(`offline rules: ${offline.join('; ')}`);
  console.log('offline: 4 phrases each contain their host on both sides, none is a bare LEGO, host is the latest-taught piece and earlier than the seed');
  const problems = await guard(sb);
  for (const p of problems) console.error(`BLOCKED  ${p}`);
  if (problems.length) { console.error('\nBLOCKED — live state differs. Nothing written.'); process.exit(1); }
  console.log('live guard: seed texts, host LEGOs and baskets as written against; no sentence already practised; the 7 no-write seeds still reach the learner where stated');

  const rule = [];
  for (const r of REHOMES) {
    const prior = await R.loadPriorNewLegos(sb, COURSE, r.seed);
    const c = liveRuleCheck(r, prior);
    if (c.problems.length) throw new Error(c.problems.join('; '));
    rule.push({ seed: r.seed, host: r.host, coverage: c.coverage, pieces: c.pieces });
    console.log(`  ${r.seed} → ${phraseId(r)} under ${r.host}; pieces ${c.pieces.join(' + ')}; coverage ${c.coverage}; every word met earlier`);
  }

  const { checkPhraseZUT } = require('../../services/course-builder/lib/validation.cjs');
  const { courseFamily } = require('../../services/course-builder/lib/course-family.cjs');
  const family = await courseFamily(sb, COURSE);
  const zut = await checkPhraseZUT(sb, COURSE, allRows(), 668, { family });
  if (zut.length) throw new Error(`phrase ZUT: ${JSON.stringify(zut)}`);
  console.log('ZUT: 4 phrases clean against the family');

  const { evidencePath } = require('../lib/evidence-path.cjs');
  const out = { sweep: SWEEP, job: JOB, at: new Date().toISOString(), ruling: RULING, apply, rehomes: REHOMES.map(r => ({ ...r, id: phraseId(r) })), rule, noWrite: NO_WRITE, nearEmptyKept: NEAR_EMPTY_KEPT, untouched: UNTOUCHED };
  if (!apply) { const ev = evidencePath(`tools/course-optimization/${SWEEP}-dryrun.json`); fs.writeFileSync(ev, JSON.stringify(out, null, 1)); console.log(`\nDRY RUN — nothing written. evidence: ${ev}`); return; }

  // ─── apply ──────────────────────────────────────────────────────────────
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const { snapshotSeeds } = require('../../services/course-builder/lib/redo-snapshot.cjs');
  const hostSeeds = [...new Set(REHOMES.map(r => HOSTS[r.host].seed_number))].sort((a, b) => a - b);
  const pending = must(await sb.from('audio_pass_requests').select('id, reason, metadata').eq('course_code', COURSE).eq('status', 'pending').maybeSingle(), 'pending audio pass');
  if (!pending) throw new Error(`no pending audio-pass request for ${COURSE}`);

  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const snap = await snapshotSeeds(sb, COURSE, hostSeeds, { reason: 'all-review-seeds-rehome', notes: `${RULING}. Undo: POST /api/build/redo-undo/${COURSE}.` });
  const eventId = await recordContentEdit(sb, { identity, courseCode: COURSE, surface: SURFACE, operation: 'insert',
    scope: { seed_numbers: hostSeeds, lego_ids: Object.keys(HOSTS), phrase_ids: REHOMES.map(phraseId), source_seeds: REHOMES.map(r => r.seed) },
    detail: { job: JOB, ruling: RULING, rehomes: REHOMES.map(r => ({ seed: r.seed, host: r.host, id: phraseId(r) })), no_write: NO_WRITE, near_empty_kept: NEAR_EMPTY_KEPT, snapshot_batch: snap.batchId } });
  console.log(`edit event ${eventId}; snapshot batch ${snap.batchId}`);

  const inserted = [];
  for (const r of REHOMES) {
    const host = hostLego(r.host);
    const existing = must(await sb.from('course_practice_phrases').select('position, phrase_role').eq('course_code', COURSE).eq('seed_number', host.seed_number).eq('lego_index', host.lego_index), 'basket');
    const row = R.seedSentenceRow({ course_code: COURSE, seed_number: r.seed, known_text: r.known, target_text: r.target, host, existingPhrases: existing, eventId });
    if (row.id !== phraseId(r)) throw new Error(`${r.seed}: id ${row.id} ≠ ${phraseId(r)} — basket changed under us`);
    must(await sb.from('course_practice_phrases').insert(row), `insert ${row.id}`);
    inserted.push(row);
    console.log(`  ✓ ${row.id} pos ${row.position}: ${row.known_text} → ${row.target_text}   (seed ${r.seed} → ${r.host})`);
  }
  must(await sb.from('course_seeds').update({ approved_at: null, last_edit_event_id: eventId }).eq('course_code', COURSE).in('seed_number', hostSeeds), 'unapprove hosts');
  // The learner app caches the bundle by courses.content_version (#933·H): a phrase insert alone bumps nothing, so bump it here.
  const { bumpCourseVersion } = require('../../services/shared/course-version.cjs');
  const bumped = await bumpCourseVersion(sb, COURSE, 'minor');
  console.log(`course version bumped: ${JSON.stringify(bumped)}`);
  console.log(`host seeds unapproved for the proofreader: ${hostSeeds.join(', ')} (the source seeds carry no edited row)`);
  const mine = `4 all-review seed sentences re-homed as use phrases (Kai's rule, job ${JOB}, 2026-09-23): ${REHOMES.map(phraseId).map(id => id.split(':')[1]).join(', ')} — 4 English clips in Charlotte, 4 Hindi prompts in Kriti, none rendered`;
  must(await sb.from('audio_pass_requests').update({ reason: `${pending.reason} + ${mine}`, metadata: { ...pending.metadata, job932Rehome: { editEventId: eventId, snapshotBatch: snap.batchId, phraseIds: inserted.map(r => r.id) } }, updated_at: new Date().toISOString() }).eq('id', pending.id), 'audio-pass append');
  console.log(`audio pass: appended to pending request ${pending.id}`);
  out.eventId = eventId; out.snapshot = snap; out.inserted = inserted; out.hostSeedsUnapproved = hostSeeds;
  const ev = evidencePath(`tools/course-optimization/${SWEEP}.json`); fs.writeFileSync(ev, JSON.stringify(out, null, 1)); console.log(`evidence: ${ev}`);
}

module.exports = { COURSE, REHOMES, HOSTS, NO_WRITE, NEAR_EMPTY_KEPT, UNTOUCHED, hostLego, phraseId, offlineCheck, liveRuleCheck, allRows };
if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
