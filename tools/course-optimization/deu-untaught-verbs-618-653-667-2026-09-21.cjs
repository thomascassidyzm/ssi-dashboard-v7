#!/usr/bin/env node
// tools/course-optimization/deu-untaught-verbs-618-653-667-2026-09-21.cjs
//
// deu_for_eng seeds 618, 653, 667 — three seeds that taught the learner the
// WRONG word (found by job #486, ruled by Kai 2026-09-21, applied by job #502).
//
//   618  es fühlt sich nicht wie eine lange Zeit an   it doesn't feel like a long time
//        taught L2 "feels" → "fühlt". The verb is sich anfühlen; "an" hung loose.
//        RULING: replace L2 with the JOINED verb (clause 8), realised split in
//        the seed. The known side cannot be "to feel" — S0042L02 already maps
//        "to feel" → "fühlen", and one known → two targets is the ZUT defect —
//        so the LEGO is "to feel like" → "sich anfühlen wie", which is also the
//        sense Kai named ("'to feel' in the 'feels like' sense").
//   653  macht es Ihnen etwas aus, gnädige Frau?      do you mind madam?
//        taught L1 "makes" → "macht", which is not what the sentence means.
//   667  macht es euch allen etwas aus?               do you all mind?
//        same defect, and no phrases at all.
//        RULING for both: a whole-seed M-LEGO, NO "(formal)" tag or any other
//        parenthetical — "madam" inside the LEGO carries the formality. They
//        are split introductions after seed 92 and that is a RULED exception:
//        ausmachen was introduced joined at 63 and split at 155 and 190, so no
//        new verb arrives. Recorded as RULED_SPLIT_INTRODUCTIONS in
//        services/course-builder/lib/separable-verbs.cjs, where clause 8 lives.
//
// WHERE EVERY WORD OF THE OLD LEGOS GOES (Kai: a word taught nowhere is a
// failure of this job):
//   618 L1 "lange" — KEPT, untouched (it is also S0033L01 "long" → "lange").
//   618 L2 "fühlt" — MOVED into the new L2: the learner hears it as the split
//         realisation of "sich anfühlen wie" in the seed and in the phrases;
//         "fühlen" itself is S0042L02. "an" is now attached to its verb.
//   653 L1 "macht" — MOVED into the new L1 (first word of it); the word has
//         been heard since seed 64 ("es macht Spaß") and as "macht es dir etwas
//         aus" at 190. The gloss "makes" is what Kai ruled wrong, so it goes.
//   667 L1 "macht" — same; it was is_new=false (a duplicate marker) anyway.
//
// WHAT THIS TOOL DOES NOT DO. No TTS — it ends by queueing an audio pass. It
// deletes no audio row: trg_null_lego_audio_on_text_change / _phrase_ unlink
// the now-wrong clips and record every drop in content_audio_link_drops, which
// this tool prints in full after --apply. It touches no other seed.
//
// GATES. Every phrase is hand-written and replayed through
// tools/phrase-gate/gate-check.cjs — the real /api/seed/complete gates — with
// the seed's own sentence lending the split pieces exactly as the live route
// does (extraTexts). Tiling is checked as /v2/validate checks it. A refusal is
// a defect in the phrase and is fixed in the phrase; nothing here bypasses a
// gate. Both shapes are drilled heavily on purpose (Kai: not a token one of
// each) — the split counts are printed.
//
//   node tools/course-optimization/deu-untaught-verbs-618-653-667-2026-09-21.cjs --dry-run
//   node tools/course-optimization/deu-untaught-verbs-618-653-667-2026-09-21.cjs --apply

require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');
const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
const { requestRoundIndexRefresh } = require('../../services/shared/round-index-refresh.cjs');
const { makeCourseCtx, checkPhraseSet, failureFeedback } = require('../phrase-gate/gate-check.cjs');
const { computeLegoPosition } = require('../../services/course-builder/lib/phrase-structure.cjs');
const { checkTiling } = require('../../services/course-builder/lib/validation.cjs');
const { extractVocab } = require('../../services/course-builder/lib/text-normalization.cjs');
const { separableVerbsIn, RULED_SPLIT_INTRODUCTIONS, checkSeparableLegoShape } = require('../../services/course-builder/lib/separable-verbs.cjs');

const COURSE = 'deu_for_eng';
const SURFACE = 'tools:deu-untaught-verbs-618-653-667-2026-09-21';

// ─── The three reshapes. `expected` is the live state this tool was written
// against; it refuses to act on anything else.
const JOBS = [
  {
    seed: 618, idx: 2, legoId: 'S0618L02',
    expected: {
      seedTarget: 'es fühlt sich nicht wie eine lange Zeit an', seedKnown: "it doesn't feel like a long time",
      legoKnown: 'feels', legoTarget: 'fühlt', legoCount: 2, phraseCount: 10,
    },
    // The sibling basket S0618L01 ("long" → "lange") is NOT rewritten, but the
    // replay found three rows of it that fail the live gate on their own, and
    // Kai asked for every phrase of this seed re-checked and corrected where it
    // does not fit: B01 is the bare LEGO (teaches nothing, never counts), and
    // B03/U04 gloss "war … dort" as "stayed", an English word the learner has
    // not been given. Same German where the German was fine.
    siblingFixes: [
      { id: 'deu_for_eng:S0618L01B01', known: 'a very long time',              target: 'eine sehr lange Zeit' },
      { id: 'deu_for_eng:S0618L01B03', known: 'he was also there a long time', target: 'er war auch eine lange Zeit dort' },
      { id: 'deu_for_eng:S0618L01U04', known: 'she was there a long time',     target: 'sie war eine lange Zeit dort' },
    ],
    lego: {
      known: 'to feel like', target: 'sich anfühlen wie', type: 'M', is_new: true,
      components: [{ known: 'feel', target: 'sich anfühlen' }, { known: 'like', target: 'wie' }],
    },
    // THE KNOWN SIDE IS EXACT-FORM (Tom 2026-06-15, stemKnownGloss): "feels"
    // was only ever introduced by the LEGO this tool removes, and "must" is not
    // introduced at all (muss = "have to" / "needs to"). So every English line
    // here uses "feel" — do-support, modals, negation — which the seed itself
    // does ("it doesn't feel like a long time"). The gate refused "feels" and
    // "must"; that refusal is the reason for the shape of this basket.
    build: [
      ['does it feel like a long time',   'fühlt es sich wie eine lange Zeit an?'],       // split
      ['it can feel like a long time',    'es kann sich wie eine lange Zeit anfühlen'],   // joined
      ["it doesn't feel like home",       'es fühlt sich nicht wie zu Hause an'],         // split
      ['it will feel like a long time',   'es wird sich wie eine lange Zeit anfühlen'],   // joined
    ],
    use: [
      ["it doesn't feel like a long time",            'es fühlt sich nicht wie eine lange Zeit an'],                     // split — the seed
      ["it doesn't feel like a very long time",       'es fühlt sich nicht wie eine sehr lange Zeit an'],                // split
      ['does it feel like home',                      'fühlt es sich wie zu Hause an?'],                                 // split
      ["it shouldn't feel like a long time",          'es sollte sich nicht wie eine lange Zeit anfühlen'],              // joined
      ["she said it doesn't feel like a long time",   'sie hat gesagt, es fühlt sich nicht wie eine lange Zeit an'],     // split
      ["I don't think it will feel like a long time", 'ich denke nicht, dass es sich wie eine lange Zeit anfühlen wird'], // joined, verb-final
      ['it can feel like home',                       'es kann sich wie zu Hause anfühlen'],                             // joined
      ["I hope it doesn't feel like a long time",     'ich hoffe, es fühlt sich nicht wie eine lange Zeit an'],          // split
      ['it will feel like home',                      'es wird sich wie zu Hause anfühlen'],                             // joined
      ['does it feel like a very long time',          'fühlt es sich wie eine sehr lange Zeit an?'],                     // split
    ],
  },
  {
    seed: 653, idx: 1, legoId: 'S0653L01',
    expected: {
      seedTarget: 'macht es Ihnen etwas aus, gnädige Frau?', seedKnown: 'do you mind madam?',
      legoKnown: 'makes', legoTarget: 'macht', legoCount: 1, phraseCount: 10,
    },
    lego: {
      known: RULED_SPLIT_INTRODUCTIONS[653].known, target: RULED_SPLIT_INTRODUCTIONS[653].lego, type: 'M', is_new: true,
      components: [{ known: 'does it bother you', target: 'macht es Ihnen etwas aus' }, { known: 'madam', target: 'gnädige Frau' }],
    },
    build: [
      ['do you mind madam if we wait here',  'macht es Ihnen etwas aus, gnädige Frau, wenn wir hier warten'],  // split
      ['would you mind madam',               'würde es Ihnen etwas ausmachen, gnädige Frau'],                  // joined
      ['do you mind madam if we go now',     'macht es Ihnen etwas aus, gnädige Frau, wenn wir jetzt gehen'],  // split
      ["I don't know if you mind madam",     'ich weiß nicht, ob es Ihnen etwas ausmacht, gnädige Frau'],      // joined, verb-final
    ],
    use: [
      ['do you mind madam if I ask you something',          'macht es Ihnen etwas aus, gnädige Frau, wenn ich Sie etwas frage'],          // split
      ['would you mind madam if we wait here',              'würde es Ihnen etwas ausmachen, gnädige Frau, wenn wir hier warten'],        // joined
      ['do you mind madam if we speak more slowly',         'macht es Ihnen etwas aus, gnädige Frau, wenn wir langsamer sprechen'],       // split
      ['would you mind madam if we stay here',              'würde es Ihnen etwas ausmachen, gnädige Frau, wenn wir hier bleiben'],       // joined
      ['do you mind madam if we help you',                  'macht es Ihnen etwas aus, gnädige Frau, wenn wir Ihnen helfen'],             // split
      ['would you mind madam if we go now',                 'würde es Ihnen etwas ausmachen, gnädige Frau, wenn wir jetzt gehen'],        // joined
      ['do you mind madam if we sit here',                  'macht es Ihnen etwas aus, gnädige Frau, wenn wir hier sitzen'],              // split
      ['would you mind madam if I ask you something',       'würde es Ihnen etwas ausmachen, gnädige Frau, wenn ich Sie etwas frage'],    // joined
      ['do you mind madam if we come back later',           'macht es Ihnen etwas aus, gnädige Frau, wenn wir später zurückkommen'],      // split
      ['would you mind madam if we come back tomorrow morning', 'würde es Ihnen etwas ausmachen, gnädige Frau, wenn wir morgen früh zurückkommen'], // joined
    ],
  },
  {
    seed: 667, idx: 1, legoId: 'S0667L01',
    expected: {
      seedTarget: 'macht es euch allen etwas aus?', seedKnown: 'do you all mind?',
      legoKnown: 'makes', legoTarget: 'macht', legoCount: 1, phraseCount: 0,
    },
    lego: {
      known: RULED_SPLIT_INTRODUCTIONS[667].known, target: RULED_SPLIT_INTRODUCTIONS[667].lego, type: 'M', is_new: true,
      components: [{ known: 'does it', target: 'macht es' }, { known: 'you all', target: 'euch allen' }, { known: 'bother', target: 'etwas aus' }],
    },
    build: [
      ['do you all mind if we wait here',   'macht es euch allen etwas aus, wenn wir hier warten'],   // split
      ['would you all mind',                'würde es euch allen etwas ausmachen'],                   // joined
      ['do you all mind if we go now',      'macht es euch allen etwas aus, wenn wir jetzt gehen'],   // split
      ["I don't know if you all mind",      'ich weiß nicht, ob es euch allen etwas ausmacht'],       // joined, verb-final
    ],
    use: [
      ['do you all mind if I ask you something',            'macht es euch allen etwas aus, wenn ich euch etwas frage'],            // split
      ['would you all mind if we wait here',                'würde es euch allen etwas ausmachen, wenn wir hier warten'],          // joined
      ['do you all mind if we speak more slowly',           'macht es euch allen etwas aus, wenn wir langsamer sprechen'],         // split
      ['would you all mind if we stay here',                'würde es euch allen etwas ausmachen, wenn wir hier bleiben'],         // joined
      ['do you all mind if we help you',                    'macht es euch allen etwas aus, wenn wir euch helfen'],                // split
      ['would you all mind if we go now',                   'würde es euch allen etwas ausmachen, wenn wir jetzt gehen'],          // joined
      ['do you all mind if we sit here',                    'macht es euch allen etwas aus, wenn wir hier sitzen'],                // split
      ['would you all mind if I ask you something',         'würde es euch allen etwas ausmachen, wenn ich euch etwas frage'],     // joined
      ['do you all mind if we come back later',             'macht es euch allen etwas aus, wenn wir später zurückkommen'],        // split
      ['would you all mind if we come back tomorrow morning', 'würde es euch allen etwas ausmachen, wenn wir morgen früh zurückkommen'], // joined
    ],
  },
];

function supa() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
}

const pid = (j, role, n) => `${COURSE}:${j.legoId}${role === 'build' ? 'B' : 'U'}${String(n).padStart(2, '0')}`;

function phraseRows(j, eventId) {
  const rows = [];
  let position = 1;
  const push = (role, list) => list.forEach(([known, target], i) => rows.push({
    id: pid(j, role, i + 1), course_code: COURSE, seed_number: j.seed, lego_index: j.idx,
    position: position++, known_text: known, target_text: target,
    word_count: target.length, lego_count: known.split(/\s+/).length,
    phrase_role: role, introduce: true, connected_lego_ids: [],
    lego_position: computeLegoPosition(target, j.lego.target),
    metadata: { format: 'build_use', source: SURFACE, ruling: 'Kai 2026-09-21 — untaught verbs 618/653/667 (job #502)' },
    status: 'draft', version: 1, last_edit_event_id: eventId,
  }));
  push('build', j.build);
  push('use', j.use);
  return rows;
}

/** Split / joined counts of the LEGO's verb across a basket — Kai wants both drilled heavily. */
function shapeCounts(j) {
  const lemmas = separableVerbsIn(j.lego.target).map(v => v.lemma);
  let split = 0, joined = 0;
  for (const [, t] of [...j.build, ...j.use]) {
    for (const v of separableVerbsIn(t)) {
      if (!lemmas.includes(v.lemma)) continue;
      if (v.realisation === 'split') split++; else joined++;
    }
  }
  return { lemmas, split, joined };
}

/** Cumulative LEGO vocabulary of seeds < n, as /v2/validate accumulates it. */
async function priorLegoVocab(sb, n) {
  const vocab = new Set();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('course_legos').select('target_text, type, components')
      .eq('course_code', COURSE).lt('seed_number', n).order('seed_number').order('lego_index').range(from, from + 999);
    if (error) throw new Error(error.message);
    for (const l of data) {
      extractVocab(l.target_text, false).forEach(v => vocab.add(v));
      if (l.type === 'M' && l.components) for (const c of l.components) extractVocab(c.target, false).forEach(v => vocab.add(v));
    }
    if (data.length < 1000) break;
  }
  return vocab;
}

/** Refuse to act on a course that has moved under us. Returns the live rows too. */
async function guard(sb, j) {
  const problems = [];
  const { data: seed } = await sb.from('course_seeds').select('seed_number, known_text, target_text, approved_at, status')
    .eq('course_code', COURSE).eq('seed_number', j.seed).maybeSingle();
  if (!seed) problems.push(`seed ${j.seed} not found`);
  else {
    if (seed.target_text !== j.expected.seedTarget) problems.push(`seed ${j.seed} target moved: "${seed.target_text}"`);
    if (seed.known_text !== j.expected.seedKnown) problems.push(`seed ${j.seed} known moved: "${seed.known_text}"`);
  }
  const { data: legos } = await sb.from('course_legos')
    .select('id, lego_id, lego_index, type, is_new, known_text, target_text, components, known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id')
    .eq('course_code', COURSE).eq('seed_number', j.seed).order('lego_index');
  const lego = (legos || []).find(l => l.lego_index === j.idx);
  if (!lego) problems.push(`${j.legoId} not found`);
  else if (lego.known_text === j.lego.known && lego.target_text === j.lego.target) problems.push(`${j.legoId} is ALREADY reshaped — this tool has run`);
  else {
    if (lego.known_text !== j.expected.legoKnown) problems.push(`${j.legoId} known moved: "${lego.known_text}"`);
    if (lego.target_text !== j.expected.legoTarget) problems.push(`${j.legoId} target moved: "${lego.target_text}"`);
  }
  if ((legos || []).length !== j.expected.legoCount) problems.push(`seed ${j.seed} has ${legos?.length} LEGOs, expected ${j.expected.legoCount}`);

  const { data: live } = await sb.from('course_practice_phrases')
    .select('id, phrase_role, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id')
    .eq('course_code', COURSE).eq('seed_number', j.seed).eq('lego_index', j.idx).order('position');
  if ((live || []).length !== j.expected.phraseCount) problems.push(`${j.legoId} has ${live?.length} phrase rows, expected ${j.expected.phraseCount}`);

  return { problems, seed, legos: legos || [], lego, live: live || [] };
}

/** Course-wide ZUT, production direction, for every row this tool writes. Reported, not blocking — that call is Kai's. */
async function zutReport(sb, j, deletingIds) {
  const norm = (s) => (s || '').toLowerCase().trim().replace(/[.,!?;:]+$/, '');
  const { data: allLegos } = await sb.from('course_legos').select('lego_id, known_text, target_text').eq('course_code', COURSE);
  const newRows = [{ id: j.legoId, known: j.lego.known, target: j.lego.target },
    ...[...j.build, ...j.use].map(([known, target], i) => ({ id: `${j.legoId} phrase ${i + 1}`, known, target }))];
  const out = [];
  for (const n of newRows) {
    for (const l of allLegos || []) {
      if (l.lego_id === j.legoId) continue;
      if (norm(l.known_text) === norm(n.known) && norm(l.target_text) !== norm(n.target)) {
        out.push(`LEGO ${l.lego_id} "${l.known_text}" → "${l.target_text}"  vs  ${n.id} → "${n.target}"`);
      }
    }
    const { data: hits } = await sb.from('course_practice_phrases').select('id, known_text, target_text')
      .eq('course_code', COURSE).ilike('known_text', n.known.replace(/[%_]/g, ''));
    for (const h of hits || []) {
      if (deletingIds.includes(h.id)) continue;
      if (norm(h.known_text) !== norm(n.known)) continue;
      if (norm(h.target_text) !== norm(n.target)) out.push(`phrase ${h.id} "${h.known_text}" → "${h.target_text}"  vs  ${n.id} → "${n.target}"`);
      else out.push(`DUPLICATE: ${n.id} repeats existing ${h.id}`);
    }
  }
  return out;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const sb = supa();
  const ctx = makeCourseCtx(sb, COURSE);
  const states = [];
  let blocked = false;

  for (const j of JOBS) {
    console.log(`\n══════ seed ${j.seed}  ${j.legoId} ══════`);
    const st = await guard(sb, j);
    for (const p of st.problems) console.error(`BLOCKED  ${p}`);
    if (st.problems.length) { blocked = true; continue; }
    console.log('guard: live state is exactly what this tool was written against');

    // Tiling, as /v2/validate checks it: prior LEGO vocab + this seed's (new) LEGOs.
    const newLegos = st.legos.map(l => (l.lego_index === j.idx
      ? { target: j.lego.target, type: j.lego.type, components: j.lego.components }
      : { target: l.target_text, type: l.type, components: l.components }));
    const tiling = checkTiling(st.seed.target_text, newLegos, COURSE, await priorLegoVocab(sb, j.seed), { seedNumber: j.seed });
    console.log(`tiling: ${tiling.valid ? 'PASS' : 'FAIL — ' + tiling.message}`);
    if (!tiling.valid) blocked = true;

    // Clause 8, as the gate reports it — a ruled exception prints as null.
    const shape = checkSeparableLegoShape(COURSE, j.seed, j.lego.target);
    console.log(`clause 8: ${shape ? 'FINDING — ' + shape.finding : 'no finding' + (RULED_SPLIT_INTRODUCTIONS[j.seed] ? ' (ruled split introduction)' : '')}`);

    // The real phrase gates over the hand-written basket.
    const gate = await checkPhraseSet({
      courseCode: COURSE, seedNumber: j.seed, legoIndex: j.idx, legoId: j.legoId,
      legoKnown: j.lego.known, legoTarget: j.lego.target, components: j.lego.components,
      seedTarget: st.seed.target_text,
      phrases: [...j.build.map(([known, target]) => ({ role: 'build', known, target })),
        ...j.use.map(([known, target]) => ({ role: 'use', known, target }))],
    }, ctx);
    const sc = shapeCounts(j);
    console.log(`gate: ${gate.overallPass ? 'ALL PASS' : 'FAILED'} — ${j.build.length} BUILD + ${j.use.length} USE; ${sc.lemmas.join(',')} realised ${sc.split} split / ${sc.joined} joined`);
    for (const line of failureFeedback(gate)) console.error(`  GATE  ${line}`);
    if (gate.gates.knownSide?.advisories) console.log(`  knownSide advisories: ${gate.gates.knownSide.advisories}`);
    if (!gate.overallPass) blocked = true;

    // The seed's OTHER baskets are not rewritten, but Kai asked for every phrase
    // of these seeds to be re-checked against the new LEGOs — so replay them too.
    for (const sib of st.legos.filter(l => l.lego_index !== j.idx)) {
      const { data: sp } = await sb.from('course_practice_phrases').select('id, phrase_role, known_text, target_text')
        .eq('course_code', COURSE).eq('seed_number', j.seed).eq('lego_index', sib.lego_index).order('position');
      const fixes = new Map((j.siblingFixes || []).map(f => [f.id, f]));
      for (const f of fixes.values()) if (!(sp || []).some(p => p.id === f.id)) { console.error(`BLOCKED  sibling fix target ${f.id} not found`); blocked = true; }
      const asFixed = (sp || []).map(p => (fixes.has(p.id) ? { ...p, known_text: fixes.get(p.id).known, target_text: fixes.get(p.id).target } : p));
      const sg = await checkPhraseSet({
        courseCode: COURSE, seedNumber: j.seed, legoIndex: sib.lego_index, legoId: sib.lego_id,
        legoKnown: sib.known_text, legoTarget: sib.target_text, components: sib.components, seedTarget: st.seed.target_text,
        phrases: asFixed.map(p => ({ role: p.phrase_role, known: p.known_text, target: p.target_text })),
      }, ctx);
      console.log(`sibling ${sib.lego_id} "${sib.known_text}" → "${sib.target_text}" — ${sp?.length || 0} live phrases, ${fixes.size} corrected in place: gate ${sg.overallPass ? 'ALL PASS' : 'FAILED'}`);
      for (const line of failureFeedback(sg)) console.log(`  SIBLING GATE  ${line}`);
      if (!sg.overallPass) blocked = true;
      for (const p of sp || []) if (fixes.has(p.id)) console.log(`    FIX ${p.id}  "${p.target_text}" | "${p.known_text}"  →  "${fixes.get(p.id).target}" | "${fixes.get(p.id).known}"`);
    }

    const zut = await zutReport(sb, j, st.live.map(p => p.id));
    if (zut.length) { console.log('ZUT, course-wide, production direction — REPORTED (Kai\'s call):'); for (const z of zut) console.log(`    ${z}`); }
    else console.log('ZUT: clean course-wide for every row written');

    console.log(`\n${j.legoId}  "${st.lego.known_text}" → "${st.lego.target_text}"  [${st.lego.type}${st.lego.is_new ? '' : ', is_new=false'}]`);
    console.log(`      becomes  "${j.lego.known}" → "${j.lego.target}"  [${j.lego.type}]  components ${JSON.stringify(j.lego.components)}`);
    console.log(`DELETE ${st.live.length} superseded phrase row(s):`);
    for (const p of st.live) console.log(`    ${p.id}  ${p.target_text}  | ${p.known_text}`);
    console.log(`WRITE ${j.build.length + j.use.length} phrase row(s):`);
    for (const p of phraseRows(j, null)) console.log(`    ${p.phrase_role.toUpperCase()} ${p.id}  ${p.target_text}  | ${p.known_text}`);
    states.push({ j, st, zut });
  }

  if (blocked) { console.error('\nBLOCKED — a guard, the tiling gate or a phrase gate refused. Nothing written.'); process.exit(1); }
  if (!apply) { console.log('\nDRY RUN — nothing written. Re-run with --apply.'); return; }

  // ─── apply ────────────────────────────────────────────────────────────────
  const identity = serviceIdentity(SURFACE);
  const staleReport = [];
  for (const { j, st, zut } of states) {
    const rows = phraseRows(j, null);
    const eventId = await recordContentEdit(sb, {
      identity, courseCode: COURSE, surface: SURFACE, operation: 'untaught-verb-lego-reshape',
      scope: { seed_numbers: [j.seed], lego_ids: [j.legoId],
        phrase_ids: [...st.live.map(p => p.id), ...rows.map(r => r.id), ...(j.siblingFixes || []).map(f => f.id)],
        rows: 1 + 1 + st.live.length + rows.length + (j.siblingFixes || []).length },
      detail: {
        ruling: 'Kai 2026-09-21 (job #502): the seed taught a misleading fragment; the LEGO now carries the verb the learner is meant to produce',
        lego: { from: { known: st.lego.known_text, target: st.lego.target_text, type: st.lego.type, is_new: st.lego.is_new },
          to: { ...j.lego } },
        deleted_phrases: st.live.map(p => ({ id: p.id, known: p.known_text, target: p.target_text })),
        sibling_fixes: j.siblingFixes || [],
        zut_reported: zut,
      },
    });
    console.log(`\nseed ${j.seed}: edit event ${eventId}`);

    // Clips referenced by the rows being deleted are left in course_audio, unreferenced.
    for (const p of st.live) for (const col of ['known_audio_id', 'target1_audio_id', 'target2_audio_id', 'presentation_audio_id']) {
      if (p[col]) staleReport.push({ where: `${p.id}.${col}`, clip: p[col], why: 'phrase row deleted' });
    }

    const { error: delErr, count: delCount } = await sb.from('course_practice_phrases').delete({ count: 'exact' })
      .eq('course_code', COURSE).in('id', st.live.map(p => p.id).concat(['__none__']));
    if (delErr) throw new Error(`phrase delete: ${delErr.message}`);
    if (delCount !== st.live.length) throw new Error(`phrase delete removed ${delCount}, expected ${st.live.length}`);
    console.log(`deleted ${delCount} superseded phrase rows`);

    const { error: legoErr } = await sb.from('course_legos')
      .update({ known_text: j.lego.known, target_text: j.lego.target, type: j.lego.type, is_new: j.lego.is_new,
        components: j.lego.components, last_edit_event_id: eventId })
      .eq('course_code', COURSE).eq('seed_number', j.seed).eq('lego_index', j.idx);
    if (legoErr) throw new Error(`lego update: ${legoErr.message}`);
    console.log(`${j.legoId} → "${j.lego.known}" / "${j.lego.target}" [${j.lego.type}]`);

    // An edit unapproves the seed (Kai's rule). status is delivery and is left alone.
    const { error: seedErr } = await sb.from('course_seeds').update({ approved_at: null, last_edit_event_id: eventId })
      .eq('course_code', COURSE).eq('seed_number', j.seed);
    if (seedErr) throw new Error(`seed unapprove: ${seedErr.message}`);
    console.log(`seed ${j.seed} unapproved`);

    const { error: insErr } = await sb.from('course_practice_phrases').insert(rows.map(r => ({ ...r, last_edit_event_id: eventId })));
    if (insErr) throw new Error(`phrase insert: ${insErr.message}`);
    console.log(`inserted ${rows.length} phrase rows (draft, qa_checked NULL — they reach the proofreader unchecked)`);

    for (const f of j.siblingFixes || []) {
      const { data: before } = await sb.from('course_practice_phrases').select('id, known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id')
        .eq('course_code', COURSE).eq('id', f.id).single();
      const { error: fixErr } = await sb.from('course_practice_phrases')
        .update({ known_text: f.known, target_text: f.target, qa_checked: null, last_edit_event_id: eventId })
        .eq('course_code', COURSE).eq('id', f.id);
      if (fixErr) throw new Error(`sibling fix ${f.id}: ${fixErr.message}`);
      console.log(`corrected ${f.id} → "${f.target}" | "${f.known}" (qa_checked NULL)`);
      for (const col of ['known_audio_id', 'target1_audio_id', 'target2_audio_id', 'presentation_audio_id']) {
        if (before?.[col]) staleReport.push({ where: `${f.id}.${col}`, clip: before[col], why: 'phrase text corrected — trigger unlinked or relinked it (see content_audio_link_drops)' });
      }
    }

    // What the trigger did to the LEGO's own clips.
    const { data: drops } = await sb.from('content_audio_link_drops').select('column_name, old_audio_id, new_audio_id, old_text, reason')
      .eq('table_name', 'course_legos').eq('row_id', st.lego.id).order('created_at', { ascending: false }).limit(8);
    for (const d of drops || []) {
      if (['known_audio_id', 'target1_audio_id', 'target2_audio_id', 'presentation_audio_id'].includes(d.column_name) && d.old_audio_id) {
        staleReport.push({ where: `${j.legoId}.${d.column_name}`, clip: d.old_audio_id, why: `${d.reason} (spoke "${d.old_text}")` });
      }
    }
  }

  const refresh = await requestRoundIndexRefresh(COURSE, { immediate: true, reason: SURFACE });
  console.log(`\nround map: ${JSON.stringify(refresh)}`);

  console.log(`\nAUDIO LEFT STALE / UNREFERENCED — ${staleReport.length} clip link(s), listed in full:`);
  for (const s of staleReport) console.log(`    ${s.where}  ${s.clip}  — ${s.why}`);
  console.log(`\nEvery new row (${states.reduce((n, s) => n + 1 + s.j.build.length + s.j.use.length, 0)}) has no audio yet.`);
  console.log('\nNow queue the audio pass:\n  node tools/course-optimization/queue-audio-pass.cjs deu_for_eng --reason "untaught verbs 618/653/667 (Kai 2026-09-21, job #502)"');
}

main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
