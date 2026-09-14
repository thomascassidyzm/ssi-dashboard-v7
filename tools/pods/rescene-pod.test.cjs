/**
 * The ten-sentence scene rule, asserted (Aran + Tom, 2026-09-14; job #649).
 *
 * A pod ingested one scene per speaker turn (the Senedd/S4C pod: 160 scenes
 * for 567 sentences, dozens of them one or two lines long) is regrouped into
 * scenes of 8–12 sentences aiming at 10, breaking only where a turn changes,
 * never between a question and its answer, and splitting a long monologue
 * only at a topic turn a human named — or, when nothing else is legal, at
 * the sentence boundary that best balances the scenes.
 */
'use strict'

const test = require('node:test')
const assert = require('node:assert')
const { planScenes, sceneTable, unitKeyOf, endsWithQuestion } = require('./rescene-pod.cjs')

/** Build rows from a compact script: [speaker, sentences[], contribution] per turn. */
function rows(turns) {
  const out = []
  let go = 0
  turns.forEach(([speaker, sentences], t) => {
    sentences.forEach((known, i) => {
      go += 1
      out.push({
        id: `pod:SC${String(t + 1).padStart(3, '0')}-S${String(go).padStart(4, '0')}`,
        scene_number: t + 1, // one scene per turn, as ingested
        global_order: go,
        speaker,
        beat_label: `contribution ${1000 + t} · part ${i + 1}/${sentences.length}`,
        known_text: known,
        target_text: known,
      })
    })
  })
  return out
}
const lines = (n, text = 'A sentence.') => Array.from({ length: n }, () => text)
const sizes = (plan) => plan.scenes.map((s) => s.length)

test('every sentence is kept, in order, and only scene_number moves', () => {
  const r = rows([['A', lines(4)], ['B', lines(1)], ['C', lines(1)], ['A', lines(2)], ['D', lines(2)], ['A', lines(10)]])
  const plan = planScenes(r)
  assert.equal(plan.assignments.length, r.length)
  assert.deepEqual(plan.assignments.map((a) => a.global_order), r.map((x) => x.global_order))
  assert.deepEqual(plan.assignments.map((a) => a.id), r.map((x) => x.id))
  // scene numbers are 1..N, non-decreasing along the pod
  const sc = plan.assignments.map((a) => a.new_scene)
  assert.equal(sc[0], 1)
  for (let i = 1; i < sc.length; i++) assert.ok(sc[i] === sc[i - 1] || sc[i] === sc[i - 1] + 1)
  assert.equal(sc[sc.length - 1], plan.scenes.length)
})

test('tiny one- and two-line scenes are merged into ~10-sentence scenes', () => {
  // The Senedd opening as ingested: 4,1,1,2,2 then a 10 — six scenes for 20 lines.
  const r = rows([['Chair', lines(4)], ['Rhodri', lines(1)], ['Chris', lines(1)], ['Chair', lines(2)], ['Alun', lines(2)], ['Chair', lines(10)]])
  assert.deepEqual(sceneTable(r).map((x) => x.size), [4, 1, 1, 2, 2, 10])
  assert.deepEqual(sizes(planScenes(r)), [10, 10])
})

test('a scene boundary falls at a change of turn, not inside one, when it can', () => {
  const r = rows([['A', lines(6)], ['B', lines(5)], ['A', lines(4)], ['B', lines(5)]])
  const plan = planScenes(r)
  for (let k = 0; k < plan.scenes.length - 1; k++) {
    const last = plan.scenes[k][plan.scenes[k].length - 1]
    assert.notEqual(unitKeyOf(r[last - 1]), unitKeyOf(r[last]), `cut after ${last} is inside a turn`)
  }
  assert.deepEqual(sizes(plan), [11, 9])
})

test('a question and its answer stay together', () => {
  // 9 lines, then a one-line question, then a 9-line answer. Greedy would
  // close the first scene at 10 — right after the question. The rule forbids it.
  const r = rows([['A', lines(9)], ['B', ['So what did you do about it?']], ['A', lines(9)]])
  const plan = planScenes(r)
  for (let k = 0; k < plan.scenes.length - 1; k++) {
    const last = plan.scenes[k][plan.scenes[k].length - 1]
    assert.ok(!endsWithQuestion(r[last - 1]), `scene ${k + 1} ends on the question at ${last}`)
  }
  assert.deepEqual(sizes(plan), [9, 10])
  // A question the punctuation missed can be named by hand.
  const r2 = rows([['A', lines(9)], ['B', ["I'd just like to know when this will happen."]], ['A', lines(9)]])
  assert.deepEqual(sizes(planScenes(r2)), [10, 9])
  assert.deepEqual(sizes(planScenes(r2, { noBreakAfter: [10] })), [9, 10])
})

test('a long monologue splits at the topic turn a human named', () => {
  const r = rows([['Chair', lines(19)]])
  const plan = planScenes(r, { splitAfter: [10] })
  assert.deepEqual(plan.scenes.map((s) => [s[0], s[s.length - 1]]), [[1, 10], [11, 19]])
})

test('a long monologue with no named topic turn still splits, at the best-balanced boundary', () => {
  const r = rows([['Chair', lines(19)]])
  const plan = planScenes(r)
  assert.equal(plan.scenes.length, 2)
  for (const n of sizes(plan)) assert.ok(n >= 8 && n <= 12, `scene of ${n}`)
})

test('one sentence over the band beats cutting a speaker mid-turn at an unnamed point', () => {
  // A 3-line question bound to a 10-line answer makes 13. Either a 13, or a
  // cut inside the answer somewhere nobody chose. The rule prefers the 13.
  const r = rows([['A', lines(10)], ['B', [...lines(2), 'And why was that?']], ['C', lines(10)], ['A', lines(10)]])
  const plan = planScenes(r)
  assert.deepEqual(sizes(plan), [10, 13, 10])
  for (let k = 0; k < plan.scenes.length - 1; k++) {
    const last = plan.scenes[k][plan.scenes[k].length - 1]
    assert.notEqual(unitKeyOf(r[last - 1]), unitKeyOf(r[last]), `cut after ${last} is inside a turn`)
  }
})

test('naming the topic turn makes the cut free, so the band holds', () => {
  const r = rows([['A', lines(10)], ['B', [...lines(2), 'And why was that?']], ['C', lines(10)], ['D', lines(5)]])
  assert.deepEqual(sizes(planScenes(r, { splitAfter: [18] })), [10, 8, 10])
  const plan = planScenes(r, { splitAfter: [18] })
  assert.deepEqual(plan.scenes[1], [11, 12, 13, 14, 15, 16, 17, 18])
})

test('unitKeyOf reads the contribution id first and falls back to the speaker', () => {
  assert.equal(unitKeyOf({ beat_label: 'contribution 555182 · part 3/19', speaker: 'X' }), 'c:555182')
  assert.equal(unitKeyOf({ beat_label: null, speaker: ' Delyth Jewell ' }), 's:delyth jewell')
})
