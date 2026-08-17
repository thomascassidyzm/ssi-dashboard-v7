/**
 * Unit tests for the pure half of edit-impact-check.
 *
 * The DB-facing half (trigger facts, audio_id_for_text prediction, collision
 * checks) is verified by replay against real applied edits — see
 * docs/specs/edit-impact-check-2026-08-17.md §"Proving it against reality".
 * These tests cover the two computations that are pure functions of the course
 * snapshot: the course-wide tiling blast radius, and taught-late/used-early.
 *
 *   node --test tools/edit-impact-check.test.cjs
 */

const test = require('node:test');
const assert = require('node:assert');

const { tilingBlastRadius, orderingCheck, words } = require('./edit-impact-check.cjs');

// A miniature course: seed 1 teaches "to speak", seeds 2-3 build phrases on it.
function snap() {
  return {
    courseCode: 'tst_for_eng',
    chinese: false,
    seeds: [
      { seed_number: 1, known_text: 'kk one', target_text: 'I want to speak' },
      { seed_number: 2, known_text: 'kk two', target_text: 'I want to speak now' },
      { seed_number: 3, known_text: 'kk three late', target_text: 'I want to speak with you' },
    ],
    legos: [
      { seed_number: 1, lego_index: 1, known_text: 'kk want', target_text: 'I want', type: 'M', components: null },
      { seed_number: 1, lego_index: 2, known_text: 'kk speak', target_text: 'to speak', type: 'M', components: null },
      { seed_number: 2, lego_index: 1, known_text: 'kk now', target_text: 'now', type: 'A', components: null },
      { seed_number: 3, lego_index: 1, known_text: 'kk late with', target_text: 'with you', type: 'M', components: null },
    ],
    phrases: [
      { id: 'p1', seed_number: 1, lego_index: 2, phrase_role: 'build', known_text: 'a', target_text: 'I want to speak' },
      { id: 'p2', seed_number: 2, lego_index: 1, phrase_role: 'use', known_text: 'b', target_text: 'I want to speak now' },
      { id: 'p3', seed_number: 3, lego_index: 1, phrase_role: 'use', known_text: 'c', target_text: 'I want to speak with you' },
      { id: 'p4', seed_number: 2, lego_index: 1, phrase_role: 'build', known_text: 'd', target_text: 'I want now' },
    ],
  };
}

test('no removed chunk => no breakage, and we say so rather than reporting a hollow pass', () => {
  const r = tilingBlastRadius(snap(), 1, new Set());
  assert.strictEqual(r.broken.length, 0);
  assert.match(r.note, /No vocab unit removed/);
});

test('removing a chunk breaks every phrase course-wide that tiles through it, not just the seed\'s own', () => {
  const r = tilingBlastRadius(snap(), 1, new Set(['to speak']));
  const ids = r.broken.map(b => b.phrase_id).sort();
  // p1 (the edited seed's own), p2 and p3 — downstream, in later seeds.
  assert.deepStrictEqual(ids, ['p1', 'p2', 'p3']);
  // p4 does not use the removed chunk and must not be reported.
  assert.ok(!ids.includes('p4'));
  // The downstream ones are the point: a check that stops at the edited seed
  // would report 1 of 3.
  assert.ok(r.broken.some(b => b.seed > 1));
});

test('the walk respects tile-then-add ordering, so a seed is checked against PRIOR vocab', () => {
  // Removing "with you" (taught at seed 3) must not retroactively break seeds 1-2.
  const r = tilingBlastRadius(snap(), 3, new Set(['with you']));
  assert.ok(r.broken.every(b => b.seed >= 3), 'nothing before fromSeed may be reported');
});

test('taught late, used early — the Gap 4 shape', () => {
  // "late" is taught by the seed-3 LEGO (kk late with) but already used in seed 3's
  // own seed text... construct the real shape: a form used before its teaching seed.
  const s = snap();
  s.seeds[0].known_text = 'kk one late';   // used at seed 1
  const rows = orderingCheck(s, 'known', ['late'], 3);
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].taught_at_seed, 3);
  assert.strictEqual(rows[0].first_used_at_seed, 1);
  assert.ok(rows[0].uses_before_taught >= 1);
});

test('a form the course never teaches is reported, not silently passed', () => {
  const s = snap();
  s.seeds[0].known_text = 'kk one neverTaught';
  const rows = orderingCheck(s, 'known', ['nevertaught'], 1);
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].taught_at_seed, null);
});

test('a form both taught early and used later is NOT reported', () => {
  const rows = orderingCheck(snap(), 'known', ['want'], 1);
  assert.deepStrictEqual(rows, []);
});

test('tokenisation is script-agnostic — Sinhala and Arabic are not tokenised to nothing', () => {
  // The known-side gate's tokenizeKnown splits on an ASCII-only class, which makes
  // it inert for 31 courses. This tool must not inherit that.
  assert.deepStrictEqual(words('ඒත් මට මගේ අම්මව'), ['ඒත්', 'මට', 'මගේ', 'අම්මව']);
  assert.deepStrictEqual(words('أريد أن أتكلم'), ['أريد', 'أن', 'أتكلم']);
  assert.deepStrictEqual(words('I want, to speak.'), ['i', 'want', 'to', 'speak']);
});

// ─────────────────────────────────────────────────────────────────────────────
// The decision block — what the PROPOSING agent acts on (Kai's ruling 2026-08-17:
// the report loops back to the original agent, and may change its proposal).
// ─────────────────────────────────────────────────────────────────────────────
const { decide, buildEnvelope, EXIT } = require('./edit-impact-check.cjs');

function baseReport(over = {}) {
  return {
    edit: { course_code: 'tst_for_eng', key: 'seed 5' },
    audio: [], presentations: [], doctrine: [],
    derived: {},
    course_wide: { tiling: { broken: [], removed_vocab_units: [] }, ordering: [], same_text_elsewhere: [] },
    tts_estimate: { clips_needing_render: 0 },
    verdicts: [],
    ...over,
  };
}

test('a self-contained edit is PROCEED, and says so without inventing work', () => {
  const d = decide(baseReport(), { seed_number: 5 });
  assert.strictEqual(d.verdict, 'proceed');
  assert.deepStrictEqual(d.required_actions, []);
});

test('a stale audio link is PROCEED-WITH-REPAIRS and the repair is in the actions', () => {
  const d = decide(baseReport({
    audio: [{ column: 'known_audio_id', verdict: 'left-stale', repair: { action: 'REPOINT IT', correct_audio_id: 'abc' } }],
  }), { seed_number: 5 });
  assert.strictEqual(d.verdict, 'proceed-with-repairs');
  assert.ok(d.required_actions.includes('REPOINT IT'));
});

test('course-wide breakage is RECONSIDER — the whole point of looping the agent back in', () => {
  const d = decide(baseReport({
    course_wide: {
      tiling: { broken: [{ seed: 9 }, { seed: 12 }], removed_vocab_units: ['to speak'] },
      ordering: [], same_text_elsewhere: [],
    },
  }), { seed_number: 5 });
  assert.strictEqual(d.verdict, 'reconsider');
  assert.ok(d.reasons.some(r => r.code === 'course-wide-breakage'));
});

test('using vocabulary the course has not taught yet is RECONSIDER, not a repairable footnote', () => {
  const d = decide(baseReport({
    course_wide: {
      tiling: { broken: [], removed_vocab_units: [] },
      ordering: [{ side: 'known', form: 'later', taught_at_seed: 469, untaught_at_this_position: true }],
      same_text_elsewhere: [],
    },
  }), { seed_number: 181 });
  assert.strictEqual(d.verdict, 'reconsider');
  assert.ok(d.reasons.some(r => r.code === 'uses-untaught-vocabulary'));
});

test('a course-wide ordering finding NOT caused by this edit does not force a reconsider', () => {
  const d = decide(baseReport({
    course_wide: {
      tiling: { broken: [], removed_vocab_units: [] },
      ordering: [{ side: 'known', form: 'olddebt', taught_at_seed: 3, untaught_at_this_position: false }],
      same_text_elsewhere: [],
    },
  }), { seed_number: 181 });
  assert.strictEqual(d.verdict, 'proceed');
});

test('a silent voice swap is RECONSIDER — nothing else reports it and the learner hears it', () => {
  const d = decide(baseReport({
    audio: [{
      column: 'target1_audio_id', verdict: 'relinked', voice_change: true,
      current_clip: { voice_id: 'v_old' }, predicted_clip: { voice_id: 'v_new' },
    }],
  }), { seed_number: 5 });
  assert.strictEqual(d.verdict, 'reconsider');
  assert.ok(d.reasons.some(r => r.code === 'silent-voice-change'));
});

test('required actions are de-duplicated so the agent gets a list it can work through', () => {
  const rep = baseReport({
    audio: [
      { column: 'a', verdict: 'left-stale', repair: { action: 'SAME ACTION', correct_audio_id: 'x' } },
      { column: 'b', verdict: 'left-stale', repair: { action: 'SAME ACTION', correct_audio_id: 'x' } },
    ],
  });
  const d = decide(rep, { seed_number: 5 });
  assert.strictEqual(d.required_actions.filter(x => x === 'SAME ACTION').length, 1);
});

test('the batch envelope takes the WORST verdict and maps it to the exit code', () => {
  const mk = (v) => ({ ...baseReport(), decision: { verdict: v, required_actions: [], reasons: [] } });
  const env = buildEnvelope('tst_for_eng', [mk('proceed'), mk('reconsider'), mk('proceed-with-repairs')], 'plan');
  assert.strictEqual(env.decision.verdict, 'reconsider');
  assert.strictEqual(env.decision.exit_code, EXIT.reconsider);
  assert.strictEqual(env.decision.reconsider_edits.length, 1);
});

test('the envelope survives a report whose decision came from the no-change early return', () => {
  // A submit path that re-sends a row's CURRENT text (POST /seed/complete re-upserts
  // the canonical seed text every time) produces the no-change report. Before the
  // 2026-08-17 fix that report carried no `decision`, no `tts_estimate` and no
  // `course_wide`, so buildEnvelope threw and the caller saw "the check failed"
  // instead of "nothing to do" — measured live on eng_for_sin seed 181.
  const noChange = {
    edit: { course_code: 'tst_for_eng', key: 'seed 5' },
    audio: [], presentations: [], doctrine: [],
    derived: { note: 'No text change.' },
    course_wide: { tiling: { broken: [], removed_vocab_units: [] }, ordering: [], same_text_elsewhere: [] },
    tts_estimate: { clips_needing_render: 0 },
    verdicts: [{ level: 'ok', message: 'No text change — nothing to check.' }],
    decision: { verdict: 'proceed', headline: 'identical', reasons: [], required_actions: [] },
  };
  const env = buildEnvelope('tst_for_eng', [noChange], 'api');
  assert.strictEqual(env.decision.verdict, 'proceed');
  assert.strictEqual(env.summary.clips_needing_render, 0);
  assert.strictEqual(env.summary.phrases_broken_course_wide, 0);
});

test('exit codes are distinct, and 2 is never a decision — it means the tool failed', () => {
  const codes = Object.values(EXIT);
  assert.strictEqual(new Set(codes).size, codes.length);
  assert.ok(!codes.includes(2), 'exit 2 is reserved for tool failure');
});

test('a voice-id tagging artefact is NOT a voice change — reconsider must be worth the word', () => {
  const { sameVoice } = require('./edit-impact-check.cjs');
  // Measured live on eng_for_sin lego 108:2 during the replay: the naive string
  // compare called this a silent voice swap. It is one voice, tagged two ways.
  assert.ok(sameVoice('si-LK-SameeraNeural', 'azure_si-LK-SameeraNeural'));
  assert.ok(sameVoice('bedd6226', 'xai_bedd6226'));
  assert.ok(!sameVoice('azure_si-LK-SameeraNeural', 'azure_si-LK-ThiliniNeural'));
  assert.ok(!sameVoice('azure_en-GB-SoniaNeural', 'bedd6226'));
});
