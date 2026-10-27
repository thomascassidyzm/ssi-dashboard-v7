/**
 * spoken-words.cjs — WHAT A READER SAYS, as one key: two lines with the same key are ONE recording.
 *
 * Aran's standing rule (methodology lead, 2026-10-14 / 10-15 / 10-27, job #198): "once a phrase
 * has been recorded, the take must be reused everywhere those exact words are needed, and it must
 * never be asked for again." Capitalisation and punctuation are not words: "we don't need to
 * re-record anything that only had a capitalisation fix — those recordings will be exactly the
 * same", and when every Welsh question gained a '?' (10-21) he kept the existing takes ("I put
 * some question intonation in most"). So a LEGO, a seed sentence, a practice phrase, the same line
 * in another course, a pod line — whatever asked for the words — is satisfied by one take.
 *
 * On 27 Oct 2026 the booth asked him for the same words a second time 14 times in one session:
 * seed sentence then the LEGO of exactly its words (10x), practice phrase then seed (and LEGO),
 * North English seed then South. This key is what every queue, collapse and linker now compares.
 *
 * THE KEY: markup (<tgt>…</tgt>) dropped, Unicode NFC, lower case, every apostrophe one
 * straight ', every other punctuation mark (incl. ? ! . , — … - : ; " ( )) a space, apostrophes
 * at a word's edge dropped (be’ = be, 'n = n: elision marks), apostrophes INSIDE a word kept
 * (a'i "and his" is not ai "or"), whitespace collapsed.
 *
 * WHAT IT IS NOT: it is not the audio identity key (text-normalize.cjs, Tom 2026-10-13, which
 * keeps a trailing '?' so TTS renders a question and a statement apart). That key still files
 * clips; this one only decides "has this reader already said these words".
 *
 * Different words stay different, and that is the point of the key rather than an accident:
 * a LEGO standalone (unmutated, "blasus") and the same LEGO in context (mutated, "flasus") are
 * different words; "'n barod" vs "yn barod" are different words; a gapped Take G read is a
 * different PERFORMANCE of the same words and is kept apart by its callers, not by this key.
 *
 * Mirrored for the booth client in src/views/recordist/spoken-words.js; spoken-words.test.cjs
 * holds the two to the same answers.
 */
'use strict'

const APOSTROPHES = /[’‘ʼʻ`´′]/g

function spokenWordsKey(text) {
  if (text === null || text === undefined) return ''
  return String(text)
    .replace(/<[^>]*>/g, ' ')
    .normalize('NFC')
    .toLowerCase()
    .replace(APOSTROPHES, "'")
    .replace(/[^\p{L}\p{N}\p{M}' ]+/gu, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/^'+|'+$/g, ''))
    .filter(Boolean)
    .join(' ')
}

/** Do these two texts say the same words? Empty never matches. */
function sameSpokenWords(a, b) {
  const ka = spokenWordsKey(a)
  return !!ka && ka === spokenWordsKey(b)
}

module.exports = { spokenWordsKey, sameSpokenWords }
