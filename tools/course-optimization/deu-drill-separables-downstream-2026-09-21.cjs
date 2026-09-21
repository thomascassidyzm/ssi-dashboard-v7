#!/usr/bin/env node
// tools/course-optimization/deu-drill-separables-downstream-2026-09-21.cjs
//
// deu_for_eng — the SECOND half of Kai's separable-verb ruling (2026-09-21):
//   "in every case, we need to practice joined and split versions a lot under
//    the lego and in the legos after it (and throughout the course)".
// Job #499 did the first half (each rejoined LEGO drills both shapes in its own
// basket). This tool does the second: the DOWNSTREAM practice, which nothing
// produces by itself.
//
// THE DEFECT, measured over the live course (job #511's calibrated census,
// tools/phrase-gate/separable-downstream-census.cjs — a reader that is first
// shown seed 524 split, seed 16 joined and a preposition that must NOT hit):
//   kennenlernen (133)  never appears again after its own seed, either shape
//   vorhaben     (496)  never appears again, either shape
//   zurückrufen  (524)  never appears again, either shape
//   fernsehen    (220)  never SPLIT again after seed 288 (one joined at 294)
//   anfangen     (23)   never SPLIT again after seed 171 (497 seeds follow)
// A verb taught once and never met again does not stick.
//
// WHAT IT DOES. Adds hand-written USE rows to baskets that ALREADY EXIST
// downstream of each verb's introduction — no new seeds, no LEGO touched, no
// restructuring. Every row contains its host LEGO, uses only vocabulary heard
// by that seed, and stands alone as a sayable sentence (USE is replayed cold).
// Each verb recurs at intervals across the rest of the course in BOTH shapes
// with varied framing: split where German splits (finite verb in a main
// clause, prefix clause-final) and joined where German joins (after a modal,
// with zu, as a participle, verb-final in a subordinate clause) — never split
// for variety, because the learner is inducing the real rule.
//
// GATES. Every row is replayed through tools/phrase-gate/gate-check.cjs — the
// real /api/seed/complete gates — twice per basket: the ROWS ALONE (containment,
// vocab, ZUT, known-side must all pass; the structural gates are about basket
// shape and are not this tool's to satisfy) and the WHOLE basket with the rows
// added (no gate may newly fail, and no failure may name a row). Plus a
// course-wide ZUT and duplicate check over every LEGO and phrase, both
// directions. A refusal is a defect in the phrase and is fixed in the phrase.
//
// UNTOUCHED, by construction: seeds 83 and 92 (human-authored presentation
// lines), 618/653/667 (job #502), and the nine rejoined baskets of #499 —
// PROTECTED below is asserted before any write.
//
// HOUSEKEEPING. Rows arrive status 'draft', qa_checked NULL (the proofreader
// sees them); every host seed is unapproved (Kai: an edit unapproves a seed);
// one content_edit_event carries the whole write; NO TTS — the pending
// deu_for_eng audio-pass request (open since 2026-08-11) has this pass
// APPENDED to its reason and metadata, nothing on it overwritten.
//
//   node tools/course-optimization/deu-drill-separables-downstream-2026-09-21.cjs --dry-run
//   node tools/course-optimization/deu-drill-separables-downstream-2026-09-21.cjs --apply

require('dotenv').config({ quiet: true });
const { supabase: sb } = require('../../services/supabase-client.cjs');
const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
const { requestRoundIndexRefresh } = require('../../services/shared/round-index-refresh.cjs');
const { makeCourseCtx, checkPhraseSet } = require('../phrase-gate/gate-check.cjs');
const { computeLegoPosition } = require('../../services/course-builder/lib/phrase-structure.cjs');
const { separableVerbsIn } = require('../../services/course-builder/lib/separable-verbs.cjs');
const { COURSE, SURFACE, JOB, PHRASES, PROTECTED, DRILL_FLOOR, drillCoverage } = require('./deu-drill-separables-downstream-2026-09-21.data.cjs');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const norm = s => (s || '').toLowerCase().trim().replace(/[.,!?;:]+$/, '');
const ROW_GATES = ['containment', 'vocab', 'zut', 'knownSide'];

async function loadCourse() {
  const range = async (table, sel, step) => {
    const out = [];
    for (let lo = 1; lo <= 700; lo += step) {
      const { data, error } = await sb.from(table).select(sel).eq('course_code', COURSE).gte('seed_number', lo).lt('seed_number', lo + step);
      if (error) throw new Error(`${table} ${lo}: ${error.message}`);
      out.push(...data); await sleep(120);
    }
    return out;
  };
  const seeds = await range('course_seeds', 'seed_number, target_text, approved_at', 200);
  const legos = await range('course_legos', 'lego_id, seed_number, lego_index, known_text, target_text, components', 100);
  const phrases = await range('course_practice_phrases', 'id, seed_number, lego_index, position, phrase_role, known_text, target_text', 25);
  return { seeds, legos, phrases };
}

/** The rows this tool writes, given the live baskets: ids continue each basket's U-series. */
function plan(course) {
  const rows = [];
  const next = new Map(); // "seed:idx" -> { u, position }
  for (const p of PHRASES) {
    const key = `${p.seed}:${p.legoIndex}`;
    const lego = course.legos.find(l => l.seed_number === p.seed && l.lego_index === p.legoIndex);
    if (!next.has(key)) {
      const live = course.phrases.filter(x => x.seed_number === p.seed && x.lego_index === p.legoIndex);
      const u = Math.max(0, ...live.map(x => Number((x.id.match(/U(\d+)$/) || [])[1] || 0)));
      const position = Math.max(0, ...live.map(x => x.position || 0));
      next.set(key, { u, position });
    }
    const n = next.get(key); n.u++; n.position++;
    rows.push({
      id: `${COURSE}:${lego.lego_id}U${String(n.u).padStart(2, '0')}`,
      course_code: COURSE, seed_number: p.seed, lego_index: p.legoIndex, position: n.position,
      known_text: p.known, target_text: p.target,
      word_count: p.target.length, lego_count: p.known.split(/\s+/).length,
      phrase_role: 'use', introduce: true, connected_lego_ids: [],
      lego_position: computeLegoPosition(p.target, lego.target_text),
      metadata: { authored_by: SURFACE, ruling: `separable-verbs: downstream drill, both shapes throughout the course (Kai 2026-09-21, job ${JOB})`, separable: [`${p.verb}:${p.shape}`], drill_verb: p.verb, drill_shape: p.shape },
      status: 'draft', version: 1,
    });
  }
  return rows;
}

async function guard(course) {
  const problems = [];
  for (const p of PHRASES) {
    if (PROTECTED.seeds.includes(p.seed)) problems.push(`${p.target}: seed ${p.seed} is protected`);
    const lego = course.legos.find(l => l.seed_number === p.seed && l.lego_index === p.legoIndex);
    if (!lego) { problems.push(`${p.target}: no LEGO at ${p.seed}/${p.legoIndex}`); continue; }
    if (PROTECTED.legos.includes(lego.lego_id)) problems.push(`${p.target}: ${lego.lego_id} is protected`);
    if (lego.target_text !== p.hostLego) problems.push(`${p.target}: host ${lego.lego_id} moved — "${lego.target_text}" (expected "${p.hostLego}")`);
    const shapes = separableVerbsIn(p.target).filter(v => v.lemma === p.verb).map(v => v.realisation);
    if (!shapes.includes(p.shape)) problems.push(`${p.target}: reader sees ${p.verb} as [${shapes}] not ${p.shape}`);
    if (course.phrases.some(x => norm(x.target_text) === norm(p.target))) problems.push(`${p.target}: already in the course — this tool has run, or the row exists`);
  }
  // course-wide ZUT and duplicates, both directions, LEGOs and phrases, all seeds
  const byKnown = new Map();
  for (const r of [...course.legos.map(l => ({ id: l.lego_id, k: l.known_text, t: l.target_text })), ...course.phrases.map(x => ({ id: x.id, k: x.known_text, t: x.target_text }))]) {
    const k = norm(r.k); if (!byKnown.has(k)) byKnown.set(k, []); byKnown.get(k).push(r);
  }
  const zut = [];
  for (const p of PHRASES) for (const r of byKnown.get(norm(p.known)) || []) {
    if (norm(r.t) !== norm(p.target)) zut.push(`"${p.known}" → "${p.target}" vs ${r.id} → "${r.t}"`);
  }
  const seen = new Map();
  for (const p of PHRASES) { const k = norm(p.known); if (seen.has(k) && seen.get(k) !== norm(p.target)) zut.push(`within this set: "${p.known}" maps to two targets`); seen.set(k, norm(p.target)); }
  return { problems, zut };
}

async function gate(course) {
  const ctx = makeCourseCtx(sb, COURSE);
  const failures = [];
  const groups = new Map();
  for (const p of PHRASES) { const key = `${p.seed}:${p.legoIndex}`; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(p); }
  for (const [key, ps] of groups) {
    const [seed, idx] = key.split(':').map(Number);
    const lego = course.legos.find(l => l.seed_number === seed && l.lego_index === idx);
    const entry = { courseCode: COURSE, seedNumber: seed, legoIndex: idx, legoId: lego.lego_id, legoKnown: lego.known_text, legoTarget: lego.target_text, components: lego.components, seedTarget: course.seeds.find(s => s.seed_number === seed).target_text };
    const live = course.phrases.filter(x => x.seed_number === seed && x.lego_index === idx).sort((a, b) => a.position - b.position)
      .map(x => ({ role: x.phrase_role, known: x.known_text, target: x.target_text }));
    const mine = ps.map(p => ({ role: 'use', known: p.known, target: p.target }));
    const alone = await checkPhraseSet({ ...entry, phrases: mine }, ctx);
    for (const g of ROW_GATES) if (alone.failingGates.includes(g)) failures.push(`${lego.lego_id} rows alone fail ${g}: ${JSON.stringify(alone.gates[g]).slice(0, 300)}`);
    await sleep(100);
    const base = await checkPhraseSet({ ...entry, phrases: live }, ctx);
    const whole = await checkPhraseSet({ ...entry, phrases: [...live, ...mine] }, ctx);
    for (const g of whole.failingGates) {
      const s = JSON.stringify(whole.gates[g]);
      if (!base.failingGates.includes(g)) failures.push(`${lego.lego_id} basket NEWLY fails ${g}: ${s.slice(0, 300)}`);
      else if (ps.some(p => s.includes(p.target) || s.includes(p.known))) failures.push(`${lego.lego_id} ${g} names a new row: ${s.slice(0, 300)}`);
    }
    await sleep(150);
  }
  return failures;
}

async function audioImplications(rows) {
  const texts = [...new Set(rows.flatMap(r => [r.target_text, r.known_text]))];
  const { data } = await sb.from('course_audio').select('text, role').eq('course_code', COURSE).in('text', texts);
  const have = new Set((data || []).map(a => `${a.text}|${a.role}`));
  let target = 0, known = 0;
  for (const r of rows) {
    for (const role of ['target1', 'target2']) if (!have.has(`${r.target_text}|${role}`)) target++;
    if (!have.has(`${r.known_text}|known`)) known++;
  }
  return { rows: rows.length, targetClipsNeeded: target, knownClipsNeeded: known, existingClipsReused: rows.length * 3 - target - known };
}

async function main() {
  const apply = process.argv.includes('--apply');
  const course = await loadCourse();
  const { problems, zut } = await guard(course);
  for (const p of problems) console.error(`BLOCKED  ${p}`);
  if (problems.length) process.exit(1);
  if (zut.length) { for (const z of zut) console.error(`ZUT  ${z}`); process.exit(1); }
  console.log(`guard: ${PHRASES.length} rows, every host LEGO as expected, no protected seed or basket, ZUT clean course-wide\n`);

  const cov = drillCoverage(PHRASES);
  for (const [verb, c] of Object.entries(cov)) console.log(`  ${verb.padEnd(13)} split ${c.split}  joined ${c.joined}  across seeds ${c.seeds.join(', ')}`);
  const thin = Object.entries(cov).filter(([, c]) => c.split < DRILL_FLOOR.eachShape || c.joined < DRILL_FLOOR.eachShape || c.seeds.length < DRILL_FLOOR.distinctSeeds);
  if (thin.length) { console.error(`\nBLOCKED  drill floor not met for ${thin.map(t => t[0]).join(', ')}`); process.exit(1); }

  console.log('\ngate: replaying the real phrase gates over every basket …');
  const failures = await gate(course);
  for (const f of failures) console.error(`  GATE  ${f}`);
  if (failures.length) { console.error('\nA gate refusal is a defect in the phrase. Nothing written.'); process.exit(1); }
  console.log('gate: ALL PASS — rows alone pass containment/vocab/ZUT/known-side in every basket; no basket newly fails any gate\n');

  const rows = plan(course);
  for (const r of rows) console.log(`  ${r.id.replace(COURSE + ':', '')}  pos ${String(r.position).padStart(2)}  ${r.metadata.separable[0].padEnd(20)} ${r.target_text}  | ${r.known_text}`);
  const seeds = [...new Set(rows.map(r => r.seed_number))].sort((a, b) => a - b);
  const audio = await audioImplications(rows);
  console.log(`\naudio (NOT rendered here): ${audio.targetClipsNeeded} target clips (Ara + Leo, xAI) and ${audio.knownClipsNeeded} known clips (Tom clone, xAI) will be owed to the pending deu_for_eng request; ${audio.existingClipsReused} existing clips reused`);
  console.log(`seeds to unapprove (${seeds.length}): ${seeds.join(', ')}`);

  if (!apply) { console.log('\nDRY RUN — nothing written. Re-run with --apply.'); return; }

  // ─── apply ────────────────────────────────────────────────────────────────
  const identity = serviceIdentity(SURFACE);
  const eventId = await recordContentEdit(sb, {
    identity, courseCode: COURSE, surface: SURFACE, operation: 'separable-verbs-downstream-drill',
    scope: { seed_numbers: seeds, lego_ids: [...new Set(rows.map(r => r.id.replace(/U\d+$/, '').replace(COURSE + ':', '')))], phrase_ids: rows.map(r => r.id), rows: rows.length + seeds.length },
    detail: { ruling: 'Kai 2026-09-21: practise joined and split a lot under the LEGO and in the LEGOs after it, throughout the course', job: JOB, coverage: cov, audio },
  });
  console.log(`\nedit event ${eventId}`);
  const { error: insErr } = await sb.from('course_practice_phrases').insert(rows.map(r => ({ ...r, last_edit_event_id: eventId })));
  if (insErr) throw new Error(`phrase insert: ${insErr.message}`);
  console.log(`inserted ${rows.length} USE rows (draft, qa_checked NULL — they reach the proofreader)`);
  const { error: seedErr } = await sb.from('course_seeds').update({ approved_at: null, last_edit_event_id: eventId }).eq('course_code', COURSE).in('seed_number', seeds);
  if (seedErr) throw new Error(`seed unapprove: ${seedErr.message}`);
  console.log(`unapproved ${seeds.length} seeds`);

  // APPEND to the pending request — reason and requested_by are REPLACED by
  // queueAudioPass, so read the row and carry the old text forward ourselves.
  const { data: pending } = await sb.from('audio_pass_requests').select('id, reason, requested_by, metadata').eq('course_code', COURSE).eq('status', 'pending').maybeSingle();
  const note = `downstream separable-verb drill, ${rows.length} USE rows across ${seeds.length} seeds (Kai 2026-09-21, job ${JOB})`;
  if (pending) {
    const { error } = await sb.from('audio_pass_requests').update({
      reason: `${pending.reason} + ${note}`,
      requested_by: [pending.requested_by, SURFACE].filter(Boolean).join(' + '),
      metadata: { ...pending.metadata, separableDownstreamDrill: { job: JOB, phraseIds: rows.map(r => r.id), seeds, ...audio, editEventId: eventId } },
      updated_at: new Date().toISOString(),
    }).eq('id', pending.id);
    if (error) throw new Error(`audio-pass append: ${error.message}`);
    console.log(`audio-pass request ${pending.id}: reason and metadata APPENDED (nothing overwritten)`);
  } else {
    const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs');
    console.log('no pending request found — queued a new one:', JSON.stringify(await queueAudioPass(sb, { courseCode: COURSE, reason: note, requestedBy: SURFACE, metadata: { separableDownstreamDrill: { job: JOB, phraseIds: rows.map(r => r.id), seeds, ...audio } } })));
  }
  const refresh = await requestRoundIndexRefresh(COURSE, { immediate: true, reason: SURFACE });
  console.log(`round map: ${JSON.stringify(refresh)}`);
}

main().catch(e => { console.error(e.stack || e.message); process.exit(1); });
