#!/usr/bin/env node
'use strict';
// eng_for_hin — eight rows written by the red-seeds fix (#943·H) corrected after the cross-family Astra reads (#945·H, #946·H).
//
// What the reads got right, and this tool applies:
//   * Seed 480: चाहे जो ("whatever") takes the SUBJUNCTIVE — the seed itself says वह चाहे जो कहे and the basket's own
//     "whatever they want" says चाहे जो वे चाहें. Six rows #943 wrote with the indicative (कहते हैं / चाहता हूँ) move to
//     कहें / चाहूँ. Those are inflections of taught verbs (कहना, चाहना), not new lexemes (Kai: uninstructed forms of
//     taught words are design, only new lexemes count).
//   * S0604L01B01 "offered to let us stay today": the Hindi had dropped हमें ("us"); the basket's own B02 carries it.
//   * S0355L02B01 "that woman you know today": clumsy English; becomes a real sentence the basket already has the chunks for.
// What the reads flagged that is the COURSE's pairing, not this job's, and stays for Kai: जाना for "move" (S0319L01),
// हज़ारों for "a thousand" (S0598L01), इसे दोबारा for "that again" (S0061L02), ज़्यादा दूर for "far ahead" (S0480L02),
// उसने चोट पहुँचाई है for "he's hurt" (S0339L02, transitive by every phrase's object), ऐसे लोग हैं for "are people" (S0087L01).
//
// Guarded: every row must read exactly what #943 wrote (or already what this writes — idempotent). Nothing rendered.

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'eng_for_hin';
const JOB = '#943·H (after #945·H / #946·H)';
const SWEEP = 'eng-for-hin-red-seeds-astra-followup-2026-09-23';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;

const P = (id, target, known, targetTo, knownTo, why) => ({ id: `${COURSE}:${id}`, expect: { target, known }, set: { target: targetTo ?? target, known: knownTo ?? known }, why });
const ROWS = [
  P('S0480L01B01', 'whatever they say', 'चाहे जो वे कहते हैं', null, 'चाहे जो वे कहें', 'subjunctive after चाहे जो'),
  P('S0480L01B02', 'whatever I want', 'चाहे जो मैं चाहती हूँ', null, 'चाहे जो मैं चाहूँ', 'subjunctive after चाहे जो'),
  P('S0480L01U01', "whatever they say, I don't want it", 'चाहे जो वे कहते हैं, मुझे यह नहीं चाहिए', null, 'चाहे जो वे कहें, मुझे यह नहीं चाहिए', 'subjunctive after चाहे जो'),
  P('S0480L01U02', "whatever they say, it's not very likely", 'चाहे जो वे कहते हैं, ज़्यादा संभावना नहीं है', null, 'चाहे जो वे कहें, ज़्यादा संभावना नहीं है', 'subjunctive after चाहे जो'),
  P('S0480L01U03', "whatever I want, it isn't easy", 'चाहे जो मैं चाहती हूँ, यह आसान नहीं है', null, 'चाहे जो मैं चाहूँ, यह आसान नहीं है', 'subjunctive after चाहे जो'),
  P('S0480L01U05', 'whatever they say, I want to change it', 'चाहे जो वे कहते हैं, मैं इसे बदलना चाहती हूँ', null, 'चाहे जो वे कहें, मैं इसे बदलना चाहती हूँ', 'subjunctive after चाहे जो'),
  P('S0604L01B01', 'offered to let us stay today', 'आज रहने देने की पेशकश की', null, 'आज हमें रहने देने की पेशकश की', '"us" = हमें was missing'),
  P('S0355L02B01', 'that woman you know today', 'आज उस औरत से जिसे आप जानते हैं', 'did she need to talk to someone you know?', 'क्या उसे किसी से बात करनी थी जिसे आप जानते हैं?', 'clumsy English; chunks: did she / need to talk to / someone / you know'),
];
/** The LEGO each row must still contain, on both sides (Hindi: in order, gaps allowed). */
const LEGO_OF = { S0480L01: { target: 'whatever', known: 'चाहे जो' }, S0604L01: { target: 'offered to let us stay', known: 'रहने देने की पेशकश की' }, S0355L02: { target: 'you know', known: 'जिसे आप जानते हैं' } };

const normWords = (s) => String(s || '').toLowerCase().replace(/[.,!?;:।"“”]+/g, ' ').replace(/’/g, "'").replace(/\s+/g, ' ').trim();
function containsInOrder(hay, needle, gapsAllowed) {
  const h = normWords(hay).split(' ').filter(Boolean), n = normWords(needle).split(' ').filter(Boolean);
  if (!gapsAllowed) return ` ${h.join(' ')} `.includes(` ${n.join(' ')} `);
  let i = 0; for (const w of h) if (w === n[i]) i++;
  return i === n.length;
}
/** Every चाहे जो row carries a subjunctive verb (कहें / चाहूँ / चाहें / हो), never an indicative कहते हैं / चाहता(ी) हूँ. */
const subjunctiveViolations = (rows) => rows.filter(r => /चाहे जो/.test(r.known) && /(कहते हैं|कहता है|चाहत[ाी] हूँ)/.test(r.known.split(',')[0])).map(r => r.id); // the चाहे जो clause only; the main clause after the comma is rightly indicative
function offlineCheck() {
  const problems = [];
  for (const r of ROWS) {
    const lego = LEGO_OF[r.id.split(':')[1].slice(0, 8)];
    if (!containsInOrder(r.set.target, lego.target, false) || !containsInOrder(r.set.known, lego.known, true)) problems.push(`${r.id} does not contain its LEGO on both sides`);
  }
  const v = subjunctiveViolations(ROWS.map(r => ({ id: r.id, known: r.set.known })));
  if (v.length) problems.push(`indicative after चाहे जो: ${v.join(', ')}`);
  return problems;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const offline = offlineCheck();
  if (offline.length) { console.error('RULE ' + offline.join('\nRULE ')); process.exit(1); }
  const before = subjunctiveViolations(ROWS.map(r => ({ id: r.id, known: r.expect.known })));
  console.log(`offline: ${before.length} rows carried the indicative after चाहे जो before; 0 after; every row contains its LEGO on both sides`);
  const { createClient } = require('@supabase/supabase-js');
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const { data: live, error } = await sb.from('course_practice_phrases').select('id, known_text, target_text').eq('course_code', COURSE).in('id', ROWS.map(r => r.id));
  if (error) throw new Error(error.message);
  const problems = []; const todo = [];
  for (const r of ROWS) {
    const row = (live || []).find(x => x.id === r.id);
    if (!row) { problems.push(`${r.id} missing`); continue; }
    if (row.known_text === r.set.known && row.target_text === r.set.target) continue;
    if (row.known_text === r.expect.known && row.target_text === r.expect.target) todo.push(r);
    else problems.push(`${r.id} is "${row.target_text}" | ${row.known_text}`);
  }
  for (const p of problems) console.error(`BLOCKED  ${p}`);
  if (problems.length) process.exit(1);
  if (!todo.length) { console.log('already applied. Nothing to do.'); return; }
  console.log(`${todo.length} row(s) to write`);
  if (!apply) { console.log('dry run — pass --apply to write.'); return; }
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const { checkPhraseZUT } = require('../../services/course-builder/lib/validation.cjs');
  const { courseFamily } = require('../../services/course-builder/lib/course-family.cjs');
  const family = await courseFamily(sb, COURSE);
  for (const seed of [...new Set(todo.map(r => +r.id.split(':')[1].slice(1, 5)))]) {
    const z = await checkPhraseZUT(sb, COURSE, todo.filter(r => +r.id.split(':')[1].slice(1, 5) === seed).map(r => ({ known: r.set.known, target: r.set.target })), seed, { family });
    if (z.length) throw new Error(`ZUT: ${JSON.stringify(z).slice(0, 400)}`);
  }
  const eventId = await recordContentEdit(sb, { identity: serviceIdentity(SWEEP, { role: 'content-sweep' }), courseCode: COURSE, surface: SURFACE, operation: 'update',
    scope: { seed_numbers: [355, 480, 604], phrase_ids: todo.map(r => r.id) }, detail: { job: JOB, why: 'cross-family Astra reads #945·H/#946·H: subjunctive after चाहे जो; हमें restored; one clumsy English build reworded' } });
  for (const r of todo) {
    const { error: e } = await sb.from('course_practice_phrases').update({ known_text: r.set.known, target_text: r.set.target, qa_checked: null, last_edit_event_id: eventId }).eq('course_code', COURSE).eq('id', r.id);
    if (e) throw new Error(`${r.id}: ${e.message}`);
    console.log(`  ${r.id.split(':')[1]} → "${r.set.target}" | ${r.set.known}`);
  }
  const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
  await refreshNow();
  const reason = `astra follow-up ${JOB}: ${todo.length} rows (${SWEEP})`;
  const { data: pending } = await sb.from('audio_pass_requests').select('id,reason').eq('course_code', COURSE).eq('status', 'pending').order('created_at', { ascending: false }).limit(1);
  if (pending && pending.length) await sb.from('audio_pass_requests').update({ reason: `${String(pending[0].reason || '').trim()} + ${reason}` }).eq('id', pending[0].id);
  else { const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs'); await queueAudioPass(COURSE, { reason, requestedBy: `@${SWEEP}` }); }
  console.log(`done (event ${eventId}); audio pass ${pending && pending.length ? 'appended' : 'queued'}`);
}

module.exports = { ROWS, LEGO_OF, containsInOrder, subjunctiveViolations, offlineCheck };
if (require.main === module) main().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
