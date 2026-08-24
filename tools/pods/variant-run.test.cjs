#!/usr/bin/env node
/**
 * Tests for the variant-drill voice rule (tools/pods/variant-run.cjs).
 *
 * THE ACCEPTANCE TEST IS THE WHOLE POINT. Tom ruled per line on the eleven
 * reattributed turns of ita_for_eng:pod-1 (docs/pods/ita-pod1-partial-revert-
 * 2026-08-24.md, commit a53e20657): FOUR keep the second voice, SEVEN go back to
 * the single learner voice. The detector has to reproduce that 4/7 split from
 * the script alone, with no Italian-specific special case anywhere in it — if it
 * cannot, the DEFINITION is wrong, not the fixture.
 *
 * The fixture below is the live script of ita_for_eng:pod-1 scenes 16-21, read
 * from the DB on 2026-08-24, plus the negative cases that matter: the
 * all-Learner drill scenes 18 and 19 (Aran's chunk ruling, 2026-08-06 — one
 * voice there is correct BY DESIGN and must produce zero flags), and four
 * genuine two-turn dialogue continuations from scenes 3, 9 and 13 that a naive
 * run-length rule flags and this one must not.
 *
 * Run: node tools/pods/variant-run.test.cjs
 */
'use strict'

const assert = require('assert')
const {
  annotateVariantRuns,
  splitVariantRuns,
  knownSimilarity,
  SIMILARITY_FLOOR,
} = require('./variant-run.cjs')

let pass = 0
const t = (name, fn) => { fn(); console.log(`  ok  ${name}`); pass++ }

const row = (scene, sentence, speaker, known) => ({
  id: `ita_for_eng:pod-1:SC${String(scene).padStart(2, '0')}-S${String(sentence).padStart(3, '0')}`,
  scene_number: scene,
  sentence_number: sentence,
  global_order: scene * 100 + sentence,
  speaker,
  known_text: known,
})
const L = 'Learner'
const N = 'Narrator'

// --- live ita_for_eng:pod-1, scenes 16-21, verbatim -------------------------
const SCENE_16 = [
  row(16, 1, L, "But if you can speak slowly I think we'll be able to manage."),
  row(16, 2, L, "You spoke a little too quickly, so I'm not sure if I understood."),
  row(16, 3, L, 'Can we try again?'),
  row(16, 4, L, 'Can we see the menu?'),
  row(16, 5, L, 'Can we see the dessert menu also?'),
  row(16, 6, L, 'Do you have anything to eat?'),
  row(16, 7, L, 'Can we pay?'),
  row(16, 8, L, 'Can we pay by card?'),
  row(16, 9, 'Staff', 'No, we only take cash.'),
  row(16, 10, L, "I'm sorry, I don't have any cash."),
  row(16, 11, N, 'A million. 80. 90. 2 o\'clock. 10 o\'clock.'),
]
const SCENE_17 = [
  row(17, 1, L, 'Is there a cash machine near here?'),
  row(17, 2, 'Staff', 'Do you want to pay by cash or card or put it on the room?'),
  row(17, 3, L, 'Can we put it on the room, please?'),
  row(17, 4, 'Staff', 'Would you like to pay by cash or card or on the room?'),
  row(17, 5, 'Staff', 'Did you want to pay by cash or card?'),
  row(17, 6, L, "We'll pay by card again, please."),
  row(17, 7, L, "It's hot today, again."),
  row(17, 8, L, 'Is the water warm?'),
  row(17, 9, 'Interlocutor', "No, it's a little cold today."),
  row(17, 10, L, "It's not bad."),
  row(17, 11, N, '3 o\'clock. 9 o\'clock. January. February.'),
]
const SCENE_18 = [
  row(18, 1, L, "That's a bad idea."),
  row(18, 2, L, 'Do you have any orange juice?'),
  row(18, 3, L, 'Do you have any apple juice?'),
  row(18, 4, L, 'Does the boat leave from here?'),
  row(18, 5, L, 'Does the bus leave from here?'),
  row(18, 6, L, 'Where does the bus leave from?'),
  row(18, 7, L, 'Is that correct? Am I correct?'),
  row(18, 8, L, 'Am I wrong about that?'),
  row(18, 9, L, "I'm sorry, my son lost his ticket."),
  row(18, 10, L, 'We have paid, but my daughter has lost her ticket.'),
  row(18, 11, N, '4 o\'clock. 8 o\'clock. March. April.'),
]
const SCENE_19 = [
  row(19, 1, L, 'That makes me happy.'),
  row(19, 2, L, 'That makes me feel a little worried.'),
  row(19, 3, L, 'When you talk quickly, it makes me feel stupid.'),
  row(19, 4, L, 'Is it okay if I sit here?'),
  row(19, 5, L, 'Is it okay if we put this here?'),
  row(19, 6, L, "I don't want to be late."),
  row(19, 7, L, 'Are we going to be late?'),
  row(19, 8, L, "I promise I won't be late."),
  row(19, 9, L, "I promise we won't be late."),
  row(19, 10, L, "I'd like two scoops of ice-cream, please."),
  row(19, 11, N, '5 o\'clock. 7 o\'clock. May. June.'),
]
const SCENE_21 = [
  row(21, 1, L, 'It sounds as though we need to leave soon.'),
  row(21, 2, L, 'It sounds as though you want us not to do that.'),
  row(21, 3, L, 'Is there a toilet here?'),
  row(21, 4, L, 'Can you tell me where the toilet is?'),
  row(21, 5, 'Interlocutor', "It's down there on the left."),
  row(21, 6, 'Interlocutor', "It's down there on the right."),
  row(21, 7, L, 'Can you say that again?'),
  row(21, 8, 'Interlocutor', "Yes, I said it's over there."),
  row(21, 9, L, 'What is that?'),
  row(21, 10, L, 'What is that over there?'),
  row(21, 11, 'Interlocutor', 'Would you like to order some drinks?'),
  row(21, 12, 'Interlocutor', 'Do you want to order some drinks first?'),
  row(21, 13, 'Interlocutor', 'Did you want something to drink first?'),
  row(21, 14, N, 'October. November. December.'),
]

/** Genuine two-turn dialogue: one character continuing, NOT rephrasing. */
const DIALOGUE_CONTINUATIONS = [
  row(3, 6, 'Barista', "No, we've only got drinks."),
  row(3, 7, 'Barista', 'Yes, would you like the menu?'),
  row(9, 2, 'Waiter', 'Welcome. Please follow me. Here are the menus.'),
  row(9, 3, 'Waiter', 'Would you like still or sparkling water to start?'),
  row(13, 4, 'Local', 'Yes, past the church and the post office.'),
  row(13, 5, 'Local', 'At the second roundabout, take the first exit.'),
]

const SCRIPT = [...SCENE_16, ...SCENE_17, ...SCENE_18, ...SCENE_19, ...SCENE_21]

/** Tom's ruling, as data. The eleven reattributed turns and nothing else. */
const REATTRIBUTED = ['16.9', '17.2', '17.4', '17.5', '17.9', '21.5', '21.6', '21.8', '21.11', '21.12', '21.13']
const TOM_KEEPS_SECOND_VOICE = ['16.9', '17.2', '17.9', '21.8']
const TOM_LOCKS_TO_ONE_VOICE = ['17.4', '17.5', '21.5', '21.6', '21.11', '21.12', '21.13']

// ---------------------------------------------------------------------------
// THE ACCEPTANCE TEST
// ---------------------------------------------------------------------------

t('THE FIXTURE: the detector reproduces Tom\'s 4 keep / 7 lock split exactly', () => {
  const { rows } = annotateVariantRuns(SCRIPT)
  const verdict = new Map(rows.map((r) => [r.label, r.variantLocked]))

  const locked = REATTRIBUTED.filter((l) => verdict.get(l) === true).sort()
  const eligible = REATTRIBUTED.filter((l) => verdict.get(l) === false).sort()

  assert.deepStrictEqual(eligible, [...TOM_KEEPS_SECOND_VOICE].sort(),
    'second-voice-eligible must be exactly Tom\'s four keepers')
  assert.deepStrictEqual(locked, [...TOM_LOCKS_TO_ONE_VOICE].sort(),
    'variant-locked must be exactly Tom\'s seven reverts')
  assert.strictEqual(eligible.length, 4)
  assert.strictEqual(locked.length, 7)
})

t('every one of the eleven reattributed turns gets a verdict — none fall through', () => {
  const { rows } = annotateVariantRuns(SCRIPT)
  const seen = new Set(rows.map((r) => r.label))
  for (const l of REATTRIBUTED) assert.ok(seen.has(l), `${l} missing from the annotation`)
})

t('the three variant runs are found, with the right shapes', () => {
  const { runs } = annotateVariantRuns(SCRIPT)
  const nonLearner = runs.filter((r) => r.speaker !== 'Learner')
  assert.deepStrictEqual(nonLearner.map((r) => r.labels), [
    ['17.4', '17.5'],
    ['21.5', '21.6'],
    ['21.11', '21.12', '21.13'],
  ])
  assert.deepStrictEqual(nonLearner.map((r) => r.speaker), ['Staff', 'Interlocutor', 'Interlocutor'])
})

t('17.2 keeps the second voice even though 17.4/17.5 rephrase it — 17.3 answers it', () => {
  const { rows } = annotateVariantRuns(SCENE_17)
  const at = (l) => rows.find((r) => r.label === l)
  assert.strictEqual(at('17.2').variantLocked, false, 'an answered question is a real exchange')
  assert.ok(knownSimilarity(SCENE_17[1].known_text, SCENE_17[3].known_text) >= SIMILARITY_FLOOR,
    'and it IS a paraphrase of 17.4 — proving the rule is adjacency, not similarity at a distance')
})

t('every reason line names the run and quotes the contradiction in plain English', () => {
  const { runs } = annotateVariantRuns(SCENE_21)
  const drinks = runs.find((r) => r.runId === 's21/11-13')
  assert.ok(drinks, 'the three drink offers are one run')
  assert.match(drinks.reason, /3 consecutive Interlocutor lines at 21\.11, 21\.12, 21\.13/)
  assert.match(drinks.reason, /Would you like to order some drinks\?/)
  assert.match(drinks.reason, /stays on ONE voice/)
})

// ---------------------------------------------------------------------------
// THE NEGATIVES — what must NOT be flagged
// ---------------------------------------------------------------------------

t('an all-Learner practice scene produces ZERO flags (scene 18, Aran\'s chunk ruling)', () => {
  const { runs, rows } = annotateVariantRuns(SCENE_18)
  const nonLearner = runs.filter((r) => r.speaker !== 'Learner')
  assert.deepStrictEqual(nonLearner, [], 'scene 18 has no second speaker at all — nothing to flag')
  assert.deepStrictEqual(splitVariantRuns(SCENE_18, () => 'voiceA'), [],
    'and one voice throughout is the CORRECT state, never a defect')
  assert.ok(rows.every((r) => r.speaker === 'Learner' || r.speaker === 'Narrator'))
})

t('scene 19 likewise: single-voice by design, zero split-run defects', () => {
  assert.deepStrictEqual(splitVariantRuns(SCENE_19, () => 'voiceA'), [])
})

t('a character taking two turns with NEW content is drama, not a variant run', () => {
  const { runs } = annotateVariantRuns(DIALOGUE_CONTINUATIONS)
  assert.deepStrictEqual(runs, [],
    'Barista, Waiter and Local continuations must not be flagged — this is why run-length alone fails')
})

t('a run never crosses a scene boundary', () => {
  const crossing = [
    row(1, 4, 'Sarah', "Yes, I've got a busy day today."),
    row(2, 1, 'Sarah', "Yes, I've got a busy day today."),
  ]
  assert.deepStrictEqual(annotateVariantRuns(crossing).runs, [])
})

t('two DIFFERENT speakers saying similar things is a conversation, not a run', () => {
  const pair = [
    row(21, 5, 'Interlocutor', "It's down there on the left."),
    row(21, 6, 'Local', "It's down there on the right."),
  ]
  assert.deepStrictEqual(annotateVariantRuns(pair).runs, [])
})

t('parenthesised speaker variants canonicalise to one speaker', () => {
  const pair = [
    row(21, 5, 'Interlocutor (M)', "It's down there on the left."),
    row(21, 6, 'Interlocutor', "It's down there on the right."),
  ]
  assert.strictEqual(annotateVariantRuns(pair).runs.length, 1)
})

// ---------------------------------------------------------------------------
// THE GATE VIEW
// ---------------------------------------------------------------------------

t('splitVariantRuns reports a run split across two cast voices', () => {
  const voiceOf = (r) => (['Staff', 'Interlocutor'].includes(r.speaker) ? 'voiceB' : 'voiceA')
  const split = splitVariantRuns(SCENE_21, (r) => (r.sentence_number === 6 ? 'voiceA' : voiceOf(r)))
  assert.strictEqual(split.length, 1)
  assert.strictEqual(split[0].runId, 's21/5-6')
  assert.deepStrictEqual(split[0].voices.sort(), ['voiceA', 'voiceB'])
})

t('a variant run wholly on ONE voice is never reported — that is the fix, not the fault', () => {
  assert.deepStrictEqual(splitVariantRuns(SCENE_21, () => 'voiceA'), [])
  assert.deepStrictEqual(splitVariantRuns(SCENE_21, () => 'voiceB'), [])
})

t('rows whose voice cannot be resolved are ignored, never guessed at', () => {
  const split = splitVariantRuns(SCENE_21, (r) => (r.sentence_number === 6 ? null : 'voiceB'))
  assert.deepStrictEqual(split, [], 'one resolvable voice left in the run — no split claim possible')
})

// ---------------------------------------------------------------------------
// THE SAFE DEFAULT
// ---------------------------------------------------------------------------

t('an uncomparable adjacent pair locks, and says so', () => {
  const pair = [
    row(21, 5, 'Interlocutor', ''),
    row(21, 6, 'Interlocutor', "It's down there on the right."),
  ]
  const { rows, runs } = annotateVariantRuns(pair)
  assert.ok(rows.every((r) => r.variantLocked), 'if in doubt, single voice')
  assert.ok(runs[0].undecidable)
  assert.match(runs[0].reason, /cannot be compared/)
})

t('the measured margin still holds: locked pairs >= floor, dialogue pairs well below', () => {
  const sim = (a, b) => knownSimilarity(a.known_text, b.known_text)
  const lowestLocked = sim(SCENE_17[3], SCENE_17[4]) // 17.4 -> 17.5
  const highestDialogue = sim(DIALOGUE_CONTINUATIONS[4], DIALOGUE_CONTINUATIONS[5]) // Local 13.4 -> 13.5
  assert.ok(lowestLocked >= SIMILARITY_FLOOR, `17.4->17.5 scored ${lowestLocked}`)
  assert.ok(highestDialogue < SIMILARITY_FLOOR, `Local 13.4->13.5 scored ${highestDialogue}`)
  assert.ok(lowestLocked - highestDialogue > 0.4, 'the gap must stay wide enough to be a rule, not a tuning')
})

t('the module never re-sorts: script order is the caller\'s to establish', () => {
  const shuffled = [SCENE_21[5], SCENE_21[4]] // 21.6 then 21.5
  const { runs } = annotateVariantRuns(shuffled)
  assert.strictEqual(runs.length, 1, 'still adjacent, so still a run')
  assert.deepStrictEqual(runs[0].labels, ['21.6', '21.5'], 'reported in the order given, not re-ordered')
})

console.log(`\n${pass}/${pass} green`)
