const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const { createRequire } = require('node:module')
const { clipTextKey } = require('../../services/shared/clip-index.cjs')

test('an uncast target2 remains a missing seat when target1 holds every line', async () => {
  const filename = require.resolve('./gap-report.cjs')
  const context = { require: createRequire(filename), module: { exports: {} }, console, process }
  vm.runInNewContext(fs.readFileSync(filename, 'utf8') + '\nmodule.exports.reportCourse = reportCourse;', context, { filename })
  const voiceId = 'cartesia_fra-f0'
  const audioId = '11111111-1111-4111-8111-111111111111'
  const pg = { query: async sql => {
    if (/FROM course_seeds/.test(sql)) return { rows: [{ seed_number: 1, target_text: 'salut' }] }
    if (/FROM course_legos|FROM course_practice_phrases|FROM listening_pods/.test(sql)) return { rows: [] }
    if (/FROM clip_index/.test(sql)) return { rows: [{ text_key: clipTextKey('salut'), voice_id: voiceId, audio_id: audioId }] }
    if (/FROM course_audio/.test(sql)) return { rows: [{ id: audioId, s3_key: 'audio/salut.mp3', duration_ms: 1000, veracity_pass: true }] }
    throw new Error(`Unexpected fake query: ${sql}`)
  } }
  const cast = {
    roles: [{ language: 'fra', gender: 'f', slot: 'phrase', rank: 0, voice_id: voiceId, assigned_by: 'thomas.cassidy+ssi@gmail.com' }],
    voices: [{ voice_id: voiceId, is_active: true, gender: 'f' }],
  }
  const result = await context.module.exports.reportCourse(pg, { course_code: 'fra_for_eng', target_lang: 'fra', known_lang: 'eng' }, cast)
  assert.equal(result.seeds1to100.missingAnySeat, 1)
  assert.equal(result.seeds1to100.chars, 5)
})
