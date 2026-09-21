#!/usr/bin/env node
// tools/course-optimization/deu-inversion-variant-legos-2026-09-21.cjs
//
// deu_for_eng: German verb-second (V2) inversion was drilled in 98 practice
// phrases across 33 seeds before any LEGO handed the learner that word order.
// The course's first inverted LEGO is S0168L01 "und dann werde ich"; the first
// phrase that uses the order is at seed 6 ("Jetzt will ich mich erinnern",
// composed from S0001L01 "ich will" + S0001L04 "jetzt"). Read-only audit and
// full evidence: tools/course-optimization/audit-german-v2-inversion.cjs.
//
// TOM'S RULING, 2026-09-21 12:43Z — this is the whole licence for what follows:
//
//   "It's an additional LEGO as a variant. The learner only ever hears LEGOs
//    and never seeds. So it's not that the SEED can't be decomposed into its
//    LEGOs. It's just that something appropriate as a variation is introduced
//    in the context of the SEED. Variation as additional."
//
// SEEDS ARE CANON. Nothing here adds, deletes or edits a single seed row, and
// nothing here edits an existing LEGO or an existing phrase. Every write is an
// INSERT of a new row. That is what makes the change revertible by id.
//
// WHAT IT ADDS — two LEGOs, each the inverted twin of an atom the course
// already taught, each placed at the END of its own seed's LEGO list so no
// existing lego_index moves and no existing lego_id changes:
//
//   S0001L06  "now I want" / "jetzt will ich"   (twin of S0001L01 "ich will")
//   S0056L06  "so I can"   / "also kann ich"    (twin of S0010L02 "Ich kann")
//
// The known side carries the distinction by itself, with no annotation and no
// parenthesis: English fronts "now"/"so" exactly where German fronts
// "jetzt"/"also". "I want to speak German with you now" keeps mapping to the
// uninverted "Ich will jetzt mit dir Deutsch sprechen" (S0001L05U04); "now I
// want to speak German with you" is a DIFFERENT known prompt and maps to the
// inverted form. One known -> one target, both ways. ZUT holds, and the guard
// below proves it against the live course before anything is written.
//
// S0056L06 is additionally legitimate under the stricter reading: "also kann
// ich" is a contiguous constituent of seed 56's own target sentence, "also kann
// ich mich erinnern, wie man ein paar Wörter sagt". S0001L06 is not a substring
// of seed 1 and does not need to be — that is precisely what Tom's ruling
// licenses, and the schema has never required it (course_legos has no
// containment constraint; the tiling check lives in the submission validator,
// which this path does not and must not use, because a variant is by
// definition not part of the seed's tiling).
//
// COMPONENT ROWS ARE DELIBERATELY NOT WRITTEN. The tiling pieces travel on
// course_legos.components (which is what the learner app's intro/debut cycles
// read); no course_practice_phrases rows with phrase_role='component' are
// created. A component row must be a contiguous slice of its own SEED's target
// (Tom, 2026-07-04), and "will ich" is not one in seed 1. Components are never
// introduced at runtime anyway (Tom, 2026-08-06), so nothing is lost.
//
// PHRASE COUNTS. S0056L06 gets the full floor, 4 BUILD + 5 USE. S0001L06 gets
// 2 BUILD + 2 USE and cannot get more: at seed 1 the learner's entire
// vocabulary is five LEGOs, and every additional phrase would be a duplicate.
// That matches the validator's own early-seed ramp (1/1 through S1-S3) and the
// shape of its neighbours S0001L04 and S0001L05. Reported as a gap, not hidden.
//
// ROUND MAP. Inserting a LEGO shifts every later round_index in this course by
// one. Learner progress is filed under lego_id (lego_progress.lego_id), never
// under a round number, so no learner loses or gains a position. The view is
// refreshed here as the last act, per services/shared/round-index-refresh.cjs.
//
//   node tools/course-optimization/deu-inversion-variant-legos-2026-09-21.cjs --dry-run
//   node tools/course-optimization/deu-inversion-variant-legos-2026-09-21.cjs --apply
//   node tools/course-optimization/deu-inversion-variant-legos-2026-09-21.cjs --audio   (after --apply)

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
const { requestRoundIndexRefresh } = require('../../services/shared/round-index-refresh.cjs');

const COURSE = 'deu_for_eng';
const SURFACE = 'tools:deu-inversion-variant-legos-2026-09-21';
const PHASE8 = process.env.PHASE8_URL || 'http://localhost:3465';

// ─── the two variant LEGOs ───────────────────────────────────────────────────
const LEGOS = [
  {
    seed: 1,
    index: 6,
    known: 'now I want',
    target: 'jetzt will ich',
    components: [
      { known: 'now', target: 'jetzt' },
      { known: 'I want', target: 'will ich' },
    ],
    // "as in" anchor for the presentation narration — pragmatic, never grammar.
    asIn: 'now I want to speak German with you',
    build: [
      ['Now I want to speak', 'Jetzt will ich sprechen'],
      ['Now I want to speak German', 'Jetzt will ich Deutsch sprechen'],
    ],
    use: [
      ['Now I want to speak with you', 'Jetzt will ich mit dir sprechen'],
      ['Now I want to speak German with you', 'Jetzt will ich mit dir Deutsch sprechen'],
    ],
  },
  {
    seed: 56,
    index: 6,
    known: 'so I can',
    target: 'also kann ich',
    components: [
      { known: 'so', target: 'also' },
      { known: 'I can', target: 'kann ich' },
    ],
    asIn: 'so I can remember how to say a few words',
    build: [
      ['So I can learn German', 'Also kann ich Deutsch lernen'],
      ['So I can speak with you', 'Also kann ich mit dir sprechen'],
      ['So I can practise today', 'Also kann ich heute üben'],
      ['So I can remember a word', 'Also kann ich mich an ein Wort erinnern'],
    ],
    use: [
      ['I am not tired now so I can learn more',
       'Ich bin jetzt nicht müde, also kann ich mehr lernen'],
      ['I have started to learn German so I can speak with you',
       'Ich habe angefangen Deutsch zu lernen, also kann ich mit dir sprechen'],
      ['I want to practise as often as possible so I can speak German well',
       'Ich will so oft wie möglich üben, also kann ich gut Deutsch sprechen'],
      ['I feel ready so I can help you today',
       'Ich fühle mich bereit, also kann ich dir heute helfen'],
      ['I have time so I can read the story now',
       'Ich habe Zeit, also kann ich jetzt die Geschichte lesen'],
    ],
  },
];

// ─── helpers ─────────────────────────────────────────────────────────────────
function supa() {
  const envPath = path.join(__dirname, '..', '..', '.env');
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = /^(SUPABASE_URL|SUPABASE_SERVICE_KEY)=(.*)$/.exec(line.trim());
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

const legoIdOf = (l) => `S${String(l.seed).padStart(4, '0')}L${String(l.index).padStart(2, '0')}`;
const phraseIdOf = (l, role, n) =>
  `${COURSE}:${legoIdOf(l)}${role === 'build' ? 'B' : 'U'}${String(n).padStart(2, '0')}`;
const norm = (s) => (s || '').toLowerCase().trim();

/** lego_position / word_count / lego_count exactly as the course-builder computes them
 *  (services/course-builder/lib/phrase-structure.cjs). */
function legoPosition(phraseTarget, legoTarget) {
  const i = phraseTarget.trim().indexOf(legoTarget.trim());
  if (i === -1) return null;
  const c = (i / phraseTarget.trim().length + (i + legoTarget.trim().length) / phraseTarget.trim().length) / 2;
  return c < 0.33 ? 'start' : c > 0.67 ? 'end' : 'middle';
}

function rows(l) {
  const legoRow = {
    course_code: COURSE,
    seed_number: l.seed,
    lego_index: l.index,
    type: 'M',
    is_new: true,
    known_text: l.known,
    target_text: l.target,
    components: l.components,
    status: 'draft',
    version: 1,
  };
  const phraseRows = [];
  let position = 0;
  l.build.forEach(([known, target], i) => {
    position++;
    phraseRows.push({
      id: phraseIdOf(l, 'build', i + 1), course_code: COURSE, seed_number: l.seed,
      lego_index: l.index, position, known_text: known, target_text: target,
      word_count: target.length, lego_count: known.split(/\s+/).length,
      phrase_role: 'build', introduce: true, connected_lego_ids: [],
      lego_position: legoPosition(target, l.target), metadata: {}, status: 'draft', version: 1,
    });
  });
  l.use.forEach(([known, target], i) => {
    position++;
    phraseRows.push({
      id: phraseIdOf(l, 'use', i + 1), course_code: COURSE, seed_number: l.seed,
      lego_index: l.index, position, known_text: known, target_text: target,
      word_count: target.length, lego_count: known.split(/\s+/).length,
      phrase_role: 'use', introduce: true, connected_lego_ids: [],
      lego_position: legoPosition(target, l.target), metadata: {}, status: 'draft', version: 1,
    });
  });
  return { legoRow, phraseRows };
}

/** Refuse to act on a course that has moved under us, and prove ZUT before writing. */
async function guard(sb) {
  const problems = [];

  for (const l of LEGOS) {
    const { data: seed, error: se } = await sb.from('course_seeds')
      .select('seed_number, known_text, target_text').eq('course_code', COURSE)
      .eq('seed_number', l.seed).maybeSingle();
    if (se) throw new Error(se.message);
    if (!seed) problems.push(`seed ${l.seed} not found`);

    const { data: sibs, error: le } = await sb.from('course_legos')
      .select('lego_id, lego_index, known_text, target_text')
      .eq('course_code', COURSE).eq('seed_number', l.seed).order('lego_index');
    if (le) throw new Error(le.message);
    if (sibs.some((s) => s.lego_index === l.index)) {
      problems.push(`${legoIdOf(l)} already exists — nothing to do, or the seed moved`);
    }
    if (sibs.length !== l.index - 1) {
      problems.push(`seed ${l.seed} has ${sibs.length} LEGOs, expected ${l.index - 1} `
        + `(index ${l.index} must be the next free slot so no existing lego_id moves)`);
    }
  }

  // ZUT, production direction: the new known texts must not already map to a
  // different target anywhere in the course, and the new target texts must not
  // already be claimed by a different known text.
  const { data: allLegos } = await sb.from('course_legos')
    .select('lego_id, known_text, target_text').eq('course_code', COURSE);
  const newRows = LEGOS.flatMap((l) => {
    const { phraseRows } = rows(l);
    return [{ id: legoIdOf(l), known: l.known, target: l.target },
      ...phraseRows.map((p) => ({ id: p.id, known: p.known_text, target: p.target_text }))];
  });
  for (const n of newRows) {
    const { data: knownHits } = await sb.from('course_practice_phrases')
      .select('id, known_text, target_text').eq('course_code', COURSE).ilike('known_text', n.known);
    const clashes = [
      ...(knownHits || []).filter((h) => norm(h.target_text) !== norm(n.target)),
      ...allLegos.filter((h) => norm(h.known_text) === norm(n.known) && norm(h.target_text) !== norm(n.target)),
    ];
    for (const c of clashes) problems.push(`ZUT: "${n.known}" -> "${n.target}" (${n.id}) collides with ${c.id || c.lego_id} -> "${c.target_text}"`);
    // exact duplicate row (same known AND same target) is a wasted row, not a ZUT break
    const dupes = (knownHits || []).filter((h) => norm(h.target_text) === norm(n.target));
    for (const d of dupes) problems.push(`DUPLICATE: ${n.id} repeats existing ${d.id}`);
  }
  return problems;
}

// ─── main ────────────────────────────────────────────────────────────────────
async function main() {
  const apply = process.argv.includes('--apply');
  const audio = process.argv.includes('--audio');
  const sb = supa();

  if (!audio) {
    const problems = await guard(sb);
    for (const p of problems) console.error(`BLOCKED  ${p}`);
    if (problems.length) process.exit(1);
    console.log('guard: clean — slots free, ZUT holds, no duplicates\n');

    for (const l of LEGOS) {
      const { legoRow, phraseRows } = rows(l);
      console.log(`${legoIdOf(l)}  ${legoRow.known_text}  ->  ${legoRow.target_text}   [${legoRow.type}]`);
      for (const p of phraseRows) console.log(`    ${p.phrase_role.toUpperCase()} ${p.id}  ${p.known_text}  ->  ${p.target_text}`);
      console.log('');
    }
    if (!apply) { console.log('DRY RUN — nothing written. Re-run with --apply.'); return; }

    const identity = serviceIdentity(SURFACE);
    for (const l of LEGOS) {
      const { legoRow, phraseRows } = rows(l);
      const eventId = await recordContentEdit(sb, {
        identity, courseCode: COURSE, surface: SURFACE, operation: 'variant-lego-insert',
        scope: { seed_numbers: [l.seed], lego_ids: [legoIdOf(l)], phrase_ids: phraseRows.map((p) => p.id), rows: 1 + phraseRows.length },
        detail: { ruling: 'Tom 2026-09-21: variation as additional', known: l.known, target: l.target },
      });
      const { error: lerr } = await sb.from('course_legos').insert({ ...legoRow, last_edit_event_id: eventId });
      if (lerr) throw new Error(`lego insert ${legoIdOf(l)}: ${lerr.message}`);
      const { error: perr } = await sb.from('course_practice_phrases')
        .insert(phraseRows.map((p) => ({ ...p, last_edit_event_id: eventId })));
      if (perr) throw new Error(`phrase insert ${legoIdOf(l)}: ${perr.message}`);
      console.log(`INSERTED ${legoIdOf(l)} + ${phraseRows.length} phrases  (edit event ${eventId})`);
    }

    const refresh = await requestRoundIndexRefresh(COURSE, { immediate: true, reason: SURFACE });
    console.log(`round map: ${JSON.stringify(refresh)}`);
    console.log('\nnow run --audio to render the new rows (new rows only; nothing existing is touched).');
    return;
  }

  // ─── audio: NEW ROWS ONLY. Nothing that already has a clip is re-rendered. ──
  for (const l of LEGOS) {
    const id = legoIdOf(l);
    const { data: lego } = await sb.from('course_legos')
      .select('lego_id, known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id')
      .eq('course_code', COURSE).eq('lego_id', id).maybeSingle();
    if (!lego) { console.error(`SKIP ${id}: not present — run --apply first`); continue; }

    const missing = ['known', 'target1', 'target2'].filter((r) => !lego[`${r}_audio_id`]);
    if (missing.length) {
      const res = await fetch(`${PHASE8}/regenerate-lego/${COURSE}/${encodeURIComponent(id)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roles: missing }),
      });
      console.log(`lego ${id} [${missing.join(',')}]: ${res.status} ${(await res.text()).slice(0, 400)}`);
    } else console.log(`lego ${id}: all three clips already linked — not touched`);

    if (!lego.presentation_audio_id) {
      const text = `The German for: '${l.known}', as in — '${l.asIn}', is:`;
      const res = await fetch(`${PHASE8}/regenerate-presentation/${COURSE}/${encodeURIComponent(id)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }),
      });
      console.log(`presentation ${id}: ${res.status} ${(await res.text()).slice(0, 400)}`);
    } else console.log(`presentation ${id}: already linked — not touched`);

    const { phraseRows } = rows(l);
    for (const p of phraseRows) {
      const { data: row } = await sb.from('course_practice_phrases')
        .select('id, known_audio_id, target1_audio_id, target2_audio_id').eq('id', p.id).maybeSingle();
      if (!row) { console.error(`SKIP phrase ${p.id}: not present`); continue; }
      const need = ['known', 'target1', 'target2'].filter((r) => !row[`${r}_audio_id`]);
      if (!need.length) { console.log(`phrase ${p.id}: already complete — not touched`); continue; }
      const res = await fetch(`${PHASE8}/regenerate-phrase/${COURSE}/${encodeURIComponent(p.id)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roles: need }),
      });
      console.log(`phrase ${p.id} [${need.join(',')}]: ${res.status} ${(await res.text()).slice(0, 200)}`);
    }
  }
}

main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
