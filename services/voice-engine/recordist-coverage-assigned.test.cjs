/**
 * Tom, 2026-10-08: "/admin/recording should show all recording that is assigned
 * to someone." The coverage page listed only human_only policy languages and
 * only the voices those policy rows name, so Dan (South Welsh, cast on
 * cym_s_for_eng with no policy row) and any non-human_only policy voice were
 * invisible although their booths worked. These pin the set of languages the
 * page is built from.
 */
'use strict'

const test = require('node:test')
const assert = require('node:assert')
const { assignedLanguages } = require('./recordist-queue.cjs')

function fakeDb({ policies, courses }) {
  const tables = { language_recording_policy: policies, courses }
  return {
    from(name) {
      let rows = tables[name] || []
      const q = {
        select: () => q,
        order: () => q,
        eq: (col, v) => { rows = rows.filter((r) => r[col] === v); return q },
        then: (ok, bad) => Promise.resolve({ data: rows, error: null }).then(ok, bad),
      }
      return q
    },
  }
}

const dan = { Guest: { name: 'Dan', gender: 'm', voiceId: 'human_dan_cym_s' } }

test('a voice cast on a course but named by no policy row is listed under its language', async () => {
  const db = fakeDb({
    policies: [{ language: 'cym', human_only: true, voices: { m: { voiceId: 'human_aran_cym_n' } } }],
    courses: [
      { course_code: 'cym_s_for_eng', target_lang: 'cym', voice_config: { podCast: dan } },
    ],
  })
  const { languages, castVoices } = await assignedLanguages(db)
  assert.deepStrictEqual(languages.map((l) => l.language), ['cym'])
  assert.strictEqual(castVoices.get('human_dan_cym_s'), 'cym')
})

test('a language with only cast voices and no policy row still gets a row', async () => {
  const db = fakeDb({
    policies: [],
    courses: [{ course_code: 'cat_for_gle', target_lang: 'cat', voice_config: { podCast: { Jordi: { voiceId: 'human_x_cat', gender: 'm' } } } }],
  })
  const { languages } = await assignedLanguages(db)
  assert.deepStrictEqual(languages.map((l) => [l.language, l.policy]), [['cat', null]])
})

test('a non-human_only policy that names a voice is listed; one naming none is not', async () => {
  const db = fakeDb({
    policies: [
      { language: 'deu', human_only: false, voices: { f: { voiceId: 'human_sasha_deu_at' } } },
      { language: 'fra', human_only: false, voices: {} },
      { language: 'bre', human_only: true, voices: {} },
    ],
    courses: [],
  })
  const { languages } = await assignedLanguages(db)
  assert.deepStrictEqual(languages.map((l) => l.language).sort(), ['bre', 'deu'])
})

test('TTS voices cast on a course are not human assignments', async () => {
  const db = fakeDb({
    policies: [],
    courses: [{ course_code: 'fra_for_eng', target_lang: 'fra', voice_config: { podCast: { A: { voiceId: 'cartesia_abc' } } } }],
  })
  const { languages } = await assignedLanguages(db)
  assert.deepStrictEqual(languages, [])
})
