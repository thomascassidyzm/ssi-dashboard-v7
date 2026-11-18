import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseIntro, splitIndex, bodyCut, keyOf } from './lib.mjs'

test('parses a bare quoted intro', () => {
  assert.deepEqual(parseIntro("The Spanish for: 'I'm trying to', is:"), { lang: 'Spanish', x: "I'm trying to", c: null, tail: 'is' })
})
test('parses the unquoted form from the ruling', () => {
  assert.deepEqual(parseIntro("The Spanish for I'm trying to is:"), { lang: 'Spanish', x: "I'm trying to", c: null, tail: 'is' })
})
test('parses an as-in intro and a two-word language', () => {
  const p = parseIntro("The Scottish Gaelic for: 'to want', as in — 'I want to speak', is:")
  assert.equal(p.lang, 'Scottish Gaelic'); assert.equal(p.x, 'to want'); assert.equal(p.c, 'I want to speak')
})
test('refuses text that is not a complete intro', () => assert.equal(parseIntro('Hello there'), null))
test('splits right after "for", whatever the language-name length', () => {
  const one = { words: ['The', 'Spanish', 'for:', "'I'm", "trying", "to',", 'is:'], starts: [0, .2, .6, 1, 1.3, 1.6, 2], ends: [.2, .6, .9, 1.3, 1.6, 2, 2.3] }
  assert.equal(splitIndex(one), 3)
  const two = { words: ['The', 'Scottish', 'Gaelic', 'for:', "'to", "want',", 'is:'], starts: [0, .2, .5, .9, 1.2, 1.5, 1.9], ends: [.2, .5, .9, 1.2, 1.5, 1.9, 2.2] }
  assert.equal(splitIndex(two), 4)
  assert.deepEqual(bodyCut(two), { start: 1.2, end: 2.2, from: 4 })
})
test('misaligned timings are refused, never guessed', () => {
  assert.equal(splitIndex({ words: ['The', 'x', 'for'], starts: [0], ends: [1] }), null)
  assert.equal(splitIndex(null), null)
})
test('keyOf ignores case and punctuation', () => assert.equal(keyOf("I'm Trying to,"), 'i m trying to'))
