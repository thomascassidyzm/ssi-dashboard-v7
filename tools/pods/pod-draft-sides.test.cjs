'use strict'
const { describe, it } = require('node:test')
const assert = require('node:assert')
const { sidesFor, langsFor } = require('./pod-draft-sides.cjs')

describe('pod-draft-sides', () => {
  it('judges the TARGET against the KNOWN on a *_for_eng course — the original shape', () => {
    assert.deepEqual(sidesFor('target'), { draftCol: 'target_text', referenceCol: 'known_text' })
    assert.deepEqual(langsFor('target', { known_lang: 'eng', target_lang: 'pol' }),
      { draftLang: 'pol', referenceLang: 'eng' })
  })

  it('REVERSES on an eng_for_* course, where the draft is the known side', () => {
    // The bug: verify-pod-text.cjs read known_text as "the English" unconditionally, so
    // on eng_for_ben it handed the verifier Bengali labelled English and English
    // labelled the Bengali draft, and every verdict it returned was meaningless.
    assert.deepEqual(sidesFor('known'), { draftCol: 'known_text', referenceCol: 'target_text' })
    assert.deepEqual(langsFor('known', { known_lang: 'ben', target_lang: 'eng' }),
      { draftLang: 'ben', referenceLang: 'eng' })
  })

  it('lets a caller name the languages in words the model reads better', () => {
    assert.deepEqual(langsFor('known', { known_lang: 'ben', target_lang: 'eng' },
      { draftLang: 'Bengali', referenceLang: 'English' }),
      { draftLang: 'Bengali', referenceLang: 'English' })
  })

  it('refuses a side it does not know rather than defaulting to one', () => {
    assert.throws(() => sidesFor('either'), /unknown draft side/)
  })
})
