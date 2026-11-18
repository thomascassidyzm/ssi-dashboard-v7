// Characterisation test: the courseConfigsId examples from the original comment
// in production-api.cjs, run first against the inline functions, then the module.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { parseCourseCodeSuffixes, buildCourseConfigsId } = require('./legacy-manifest-id.cjs')

test('no dialect suffix', () => {
  assert.equal(buildCourseConfigsId('spa_for_eng', 'eng', 'spa', 'en', 'es'), 'en-es')
  assert.deepEqual(parseCourseCodeSuffixes('spa_for_eng', 'eng', 'spa'), { targetSuffix: '', knownSuffix: '' })
})

test('target-side dialect suffix', () => {
  assert.equal(buildCourseConfigsId('spa_mx_for_eng', 'eng', 'spa', 'en', 'es'), 'en-es-mx')
  assert.equal(buildCourseConfigsId('fra_ca_for_eng', 'eng', 'fra', 'en', 'fr'), 'en-fr-ca')
  assert.equal(buildCourseConfigsId('cym_anthem_for_jpn', 'jpn', 'cym', 'ja', 'cy'), 'ja-cy-anthem')
})

test('known-side dialect suffix (hypothetical, future-proofed)', () => {
  assert.equal(buildCourseConfigsId('eng_for_fra_ca', 'fra', 'eng', 'fr', 'en'), 'fr-ca-en')
  assert.deepEqual(parseCourseCodeSuffixes('eng_for_fra_ca', 'fra', 'eng'), { targetSuffix: '', knownSuffix: 'ca' })
})

test('a course code that does not match its own langs falls back to bare legacy codes', () => {
  assert.equal(buildCourseConfigsId('xxx_for_yyy', 'eng', 'spa', 'en', 'es'), 'en-es')
})
