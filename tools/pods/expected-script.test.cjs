'use strict'
const { describe, it } = require('node:test')
const assert = require('node:assert')
const { SCRIPTS, inScript } = require('./expected-script.cjs')

describe('expected-script', () => {
  it('passes a line in its own script, punctuation and digits included', () => {
    assert.equal(inScript('bengali', 'সুপ্রভাত, সারা! ৩ বা 4?'), true)
    assert.equal(inScript('japanese', 'おはようございます、サラ！'), true)
    assert.equal(inScript('latin', "Dzień dobry, Sarah! It's 8 am."), true)
  })

  it('fails a line that came back in the wrong language — the failure it exists for', () => {
    assert.equal(inScript('bengali', 'Good morning, Sarah!'), false)
    assert.equal(inScript('tamil', 'नमस्ते'), false)
    assert.equal(inScript('gurmukhi', 'ગુજરાતી'), false)
  })

  it('passes an Indic conjunct written with an explicit joiner', () => {
    // ZWJ is category Cf, so \p{M} misses it, and Sinhala writes its conjuncts with one.
    // Without joiners in the table this failed 30 of 231 correct Sinhala lines as "not
    // sinhala script" — the gate rejecting the language it was asked to check for.
    assert.equal(inScript('sinhala', 'හලෝ, සුබ සන්ධ්\u200dයාවක්!'), true)
    assert.equal(inScript('devanagari', 'क्\u200dष'), true)
    // and it still catches the thing it exists for
    assert.equal(inScript('sinhala', 'Good morning, Sarah!'), false)
  })

  it('refuses an unknown script name rather than passing everything', () => {
    assert.throws(() => inScript('klingon', 'x'), /unknown script/)
  })

  it('still carries every script write-pod-drafts.cjs shipped with', () => {
    for (const s of ['latin', 'cyrillic', 'greek', 'arabic', 'hebrew', 'japanese', 'han', 'any']) {
      assert.ok(SCRIPTS[s], `${s} missing`)
    }
  })
})
