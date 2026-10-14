/**
 * cym_s pod-1: the 11 staff/interlocutor lines go to the male voice, the learner
 * stays female, and the recast may not make one voice answer itself — including
 * the scene-21 Narrator that follows the last Interlocutor line.
 */
'use strict'
const test = require('node:test')
const assert = require('node:assert')
const { relabels, castAfter, sameVoicePairs, applyRelabels, genderFrom, NARRATOR_2 } = require('./cym-s-pod1-staff-recast-2026-10-14.cjs')

const podCast = {
  Learner: { gender: 'f', voiceId: 'human_catrinlliar_cym_s' },
  Local: { gender: 'm', voiceId: 'human_aran_cym_s' },
  Narrator: { gender: 'm', voiceId: 'human_aran_cym_s' },
}
const row = (scene, n, speaker) => ({ scene_number: scene, sentence_number: n, speaker })

test('12 relabels: 4 Staff, 7 Interlocutor, 1 Narrator 2', () => {
  const r = relabels()
  assert.equal(r.length, 12)
  assert.equal(r.filter((x) => x.to === 'Staff').length, 4)
  assert.equal(r.filter((x) => x.to === 'Interlocutor').length, 7)
  assert.equal(r.filter((x) => x.to === NARRATOR_2).length, 1)
})

test('staff/interlocutor are cast male, the scene-21 narrator female', () => {
  const c = castAfter(podCast)
  assert.equal(c.Staff.gender, 'm')
  assert.equal(c.Interlocutor.gender, 'm')
  assert.equal(c[NARRATOR_2].gender, 'f')
})

test('without the narrator move scene 21 has a male voice answering itself; with it, none', () => {
  const rows = [row(21, 12, 'Learner'), row(21, 13, 'Learner'), row(21, 14, 'Narrator')]
  const withInterlocutor = rows.map((r) => (r.sentence_number === 13 ? { ...r, speaker: 'Interlocutor' } : r))
  const cast = castAfter(podCast)
  const naive = sameVoicePairs(withInterlocutor, genderFrom({ ...podCast, ...cast }))
  assert.equal(naive.length, 1)
  const fixed = applyRelabels(withInterlocutor, [{ scene: 21, sentence: 14, to: NARRATOR_2 }])
  assert.equal(sameVoicePairs(fixed, genderFrom({ ...podCast, ...cast })).length, 0)
})
