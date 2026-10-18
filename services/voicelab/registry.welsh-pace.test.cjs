const test = require('node:test')
const assert = require('node:assert/strict')
const { describeLanguage } = require('./registry.cjs')

test('Welsh North slots report the language exception in their displayed speeds', () => {
  const voice = { voice_id: 'human_aran', type: 'human', gender: 'm', languages: ['cym'], is_active: true }
  const row = describeLanguage({
    code: 'cym_north', baseCode: 'cym',
    langCourses: [{ course_code: 'cym_n_for_eng', target_lang: 'cym', known_lang: 'eng', dialect: 'north' }],
    roles: [{ voice_id: voice.voice_id, slot: 'phrase', gender: 'm', rank: 0 }],
    voices: [voice], voiceById: new Map([[voice.voice_id, voice]]),
  })
  assert.deepEqual({ easy: row.slots.m[0].pace.easy, fast: row.slots.m[0].pace.fast }, { easy: 1, fast: 1 })
})
