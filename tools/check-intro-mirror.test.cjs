'use strict'
// node --test tools/check-intro-mirror.test.cjs
// Pins the mirror rules (services/shared/intro-mirror.cjs). Calibrated on the live ita_for_eng
// positive Kai named (2026-09-28, job #557·I): S0599L01C01 became 'I would have been' while its
// intro clip 4e7a8a31-… still says 'would have been'. Not a vitest spec — it is excluded from
// vite.config.js's runner and run with node directly.
const test = require('node:test')
const assert = require('node:assert/strict')
const realLog = console.log; console.log = () => {}
const M = require('../services/shared/intro-mirror.cjs')
console.log = realLog

const ENG = "The {target_lang_name} for: '{known}', as in — '{seed}', is:"
const compiled = M.compileTemplate(ENG, { knownLang: 'eng' })
const v = (introText, knownText, extra = {}) => M.verdict({ introText, knownText, compiled, ...extra })

test('calibration positive: S0599L01C01 stale chunk is a mismatch', () => {
  const r = v("The Italian for: 'would have been', as in — 'I would have been happy', is:", 'I would have been')
  assert.equal(r.status, 'mismatch'); assert.deepEqual(r.reasons, ['chunk']); assert.equal(r.parsed.frame, 'B')
})
test('frame B mirrors when the chunk is quoted and the context contains it', () => {
  const r = v("The Italian for: 'I would have been happy', as in — 'I would have been happy', is:", 'I would have been happy')
  assert.equal(r.status, 'mirror'); assert.deepEqual(r.reasons, [])
})
test('frame B context that no longer demonstrates the chunk is a mismatch', () => {
  const r = v("The Italian for: 'to stop doing', as in — 'he wants to stop talking', is:", 'to stop doing')
  assert.equal(r.status, 'mismatch'); assert.deepEqual(r.reasons, ['context'])
})
test("context containment is by whole words: 'here' is not inside 'where' (S0138L01)", () => {
  const r = v("The Italian for: 'here', as in — 'I think this was where she was talking', is:", 'here')
  assert.equal(r.status, 'mismatch'); assert.deepEqual(r.reasons, ['context'])
  assert.equal(v("The Italian for: 'here', as in — 'I live here now', is:", 'here').status, 'mirror')
  assert.equal(M.containsWords("I'm afraid I don't know", "I'm afraid"), true)
  assert.equal(M.containsWords('那是一个错误', '错误'), true)
})
test('frame A mirrors; frame A with the wrong chunk does not', () => {
  assert.equal(v("The Italian for: 'we wanted', is:", 'we wanted').status, 'mirror')
  const r = v("The Italian for: 'we wanted to', is:", 'we wanted')
  assert.equal(r.status, 'mismatch'); assert.deepEqual(r.reasons, ['chunk']); assert.equal(r.parsed.frame, 'A')
})
test('a slash-compound introduces its first option only', () => {
  assert.equal(v("The Italian for: 'to listen', is:", 'to listen / to hear').status, 'mirror')
})
test('case-only difference is a note, not a defect (same words aloud)', () => {
  const r = v("The Italian for: 'i agree', as in — 'I don't know if I agree with that', is:", 'I agree')
  assert.equal(r.status, 'mirror'); assert.deepEqual(r.reasons, ['chunk-case'])
})
test('curly apostrophes are the same word', () => {
  assert.equal(v("The Italian for: 'that you’re doing', is:", "that you're doing").status, 'mirror')
})
test("a free line (the 'when it's someone…' gloss) mirrors when it quotes the chunk", () => {
  const free = "The Italian for: 'we don't know', when it's someone or something we're not acquainted with, is:"
  const ok = v(free, "we don't know"); assert.equal(ok.status, 'mirror'); assert.equal(ok.parsed.frame, 'free')
  const bad = v(free, "we didn't know"); assert.equal(bad.status, 'mismatch'); assert.deepEqual(bad.reasons, ['chunk'])
})
test('a human-authored line with an explanation still mirrors by quoting; apostrophes in prose do not fool it', () => {
  const line = "There's more than one Italian word for knowing, and they're used for different things. The Italian for: 'I don't know', when it's someone you're not acquainted with, is:"
  assert.equal(v(line, "I don't know", { mark: { text: line } }).status, 'mirror')
  const r = v(line, "I don't know", { mark: { text: line + ' (edited)' } })
  assert.equal(r.status, 'mismatch'); assert.deepEqual(r.reasons, ['guarded-text'])
})
test('a line with no quote at all is unparsed, never judged', () => {
  const r = v('Listen to this one.', 'anything'); assert.equal(r.status, 'unparsed')
})
test('gendered known slot: both forms must be named', () => {
  const HIN = "{target_lang_name} में — '{known}' — जैसे इस वाक्य में — '{seed}' — को कहते हैं :"
  const c = M.compileTemplate(HIN, { knownLang: 'hin' })
  const forms = { f: 'चाहती हूँ', m: 'चाहता हूँ' }
  const good = M.verdict({ introText: "अंग्रेज़ी में — 'चाहती हूँ' या 'चाहता हूँ' — को कहते हैं :", knownText: 'चाहती हूँ', compiled: c, chunkForms: forms })
  assert.equal(good.status, 'mirror'); assert.equal(good.parsed.gendered, true)
  const bad = M.verdict({ introText: "अंग्रेज़ी में — 'चाहती हूँ' — को कहते हैं :", knownText: 'चाहती हूँ', compiled: c, chunkForms: forms })
  assert.equal(bad.status, 'mismatch'); assert.deepEqual(bad.reasons, ['chunk-m'])
})
test('expectedLine keeps the prior frame and a prior context that still demonstrates the chunk', () => {
  const e = M.expectedLine({ template: ENG, targetLangName: 'Italian', knownText: 'I would have been', priorText: "The Italian for: 'would have been', as in — 'I would have been happy', is:", compiled })
  assert.equal(e.frame, 'B'); assert.equal(e.text, "The Italian for: 'I would have been', as in — 'I would have been happy', is:")
})
test('expectedLine falls to the offered context, then to frame A', () => {
  const s = M.expectedLine({ template: ENG, targetLangName: 'Italian', knownText: 'to stop doing', priorText: "The Italian for: 'to stop', as in — 'he wants to stop talking', is:", compiled, contextText: 'I want to stop doing that' })
  assert.equal(s.text, "The Italian for: 'to stop doing', as in — 'I want to stop doing that', is:")
  const a = M.expectedLine({ template: ENG, targetLangName: 'Italian', knownText: 'to stop doing', priorText: "The Italian for: 'to stop', as in — 'he wants to stop talking', is:", compiled, contextText: 'nothing relevant' })
  assert.equal(a.frame, 'A'); assert.equal(a.text, "The Italian for: 'to stop doing', is:")
})
test('every expected line mirrors under its own verdict', () => {
  for (const [known, prior, ctx] of [['say it', "The Italian for: 'say that', as in — 'I'm trying to say that', is:", 'could you say it again?'], ['I think', null, null]]) {
    const e = M.expectedLine({ template: ENG, targetLangName: 'Italian', knownText: known, priorText: prior, compiled, contextText: ctx })
    assert.equal(v(e.text, known).status, 'mirror', e.text)
  }
})

// Kai's own line for ita_for_eng S0376L02 (2026-09-28, job #644·I) quotes the LEGO in DOUBLE quotes:
//   The Italian for "anywhere" in a negative phrase like 'I didn't go anywhere', is:
// A chunk quoted in "…" (or “…”) is quoted. The rule ("the line quotes its LEGO") never said which
// quote mark, and a human line reads exactly as the human wrote it.
test('a free-form human line that quotes the chunk in double quotes mirrors', () => {
  const line = `The Italian for "anywhere" in a negative phrase like 'I didn't go anywhere', is:`
  const r = v(line, 'anywhere', { mark: { text: line } })
  assert.equal(r.status, 'mirror'); assert.deepEqual(r.reasons, []); assert.equal(r.parsed.frame, 'free')
  const curly = v(`The Italian for “anywhere” in a negative phrase like 'I didn't go anywhere', is:`, 'anywhere')
  assert.equal(curly.status, 'mirror')
  // and a double-quoted line that quotes the WRONG chunk is still a mismatch
  const wrong = v(`The Italian for "somewhere" in a negative phrase like 'I didn't go anywhere', is:`, 'anywhere')
  assert.equal(wrong.status, 'mismatch'); assert.deepEqual(wrong.reasons, ['chunk'])
})
