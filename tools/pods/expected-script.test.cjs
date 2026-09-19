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

  it('refuses an unknown script name rather than passing everything', () => {
    assert.throws(() => inScript('klingon', 'x'), /unknown script/)
  })

  it('still carries every script write-pod-drafts.cjs shipped with', () => {
    for (const s of ['latin', 'cyrillic', 'greek', 'arabic', 'hebrew', 'japanese', 'han', 'any']) {
      assert.ok(SCRIPTS[s], `${s} missing`)
    }
  })
})
