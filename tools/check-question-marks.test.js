// Unit tests for scan-course Check 21 — the missing-question-mark detector.
// Run: npx vitest run tools/check-question-marks.test.js
//
// The first block is the one that matters. It replays the OLD Check 14 logic — the
// inline snippet that lived in .claude/commands/scan-course.md until 2026-09-10 —
// against real ita_for_eng rows, and pins the three ways it was inert. Those tests
// FAIL against the old logic and PASS against the new detector, which is the whole
// difference between a fix that is proven and a fix that is believed.
import { describe, it, expect } from 'vitest'
import { classify, calibrate, openerHits, tierOf, suppressed, needsPairedOpen, frameKey, lastSentence, endsQ } from './question-marks/detect.cjs'

// ---------------------------------------------------------------------------
// The old Check 14, reproduced verbatim from the doc it lived in, so the
// regression is pinned against the real thing rather than against a paraphrase.
// ---------------------------------------------------------------------------
const OLD_STARTERS = {
  eng: /^(what|where|when|why|who|which|whose|how|can|could|will|would|do|does|did|is|are|was|were|am|have|has|had|should|shall|may|might|must)\b/i,
  ita: /^(che|cosa|come|dove|quando|perché|chi|quale|quali|quanto|quanti|quante|puoi|potresti)\b/i,
  spa: /^(qué|cómo|cuándo|dónde|por qué|quién|cuál|cuáles|cuánto|cuánta|cuántos|cuántas|puedes|podrías|puedo|hay)\b/i,
  fra: /^(qu'|que|qui|où|quand|comment|pourquoi|quel|quelle|quels|quelles|est-ce|peux-tu|peut-on|peux|y a-t-il)\b/i,
}
const OLD_SUB = {
  eng: /^(what|where|when|why|who|which|whose|how)\s+(i|you|we|they|he|she|it|the|a|an|some|my|your|his|her|its|our|their|someone|somebody|anyone|anybody|everyone|everybody|no one|nobody|nothing|something|anything|everything|people|things)\b/i,
  ita: /^(che|cosa|come|dove|quando|perché|chi)\s+(io|tu|lei|lui|noi|voi|loro|il|la|i|le|l'|un|una|qualcuno|tutti|nessuno|qualcosa|tutto|niente|gente)\b/i,
}
const oldEndsQ = (t) => /[?？]\s*$/.test((t || '').trim())
function oldNeedsMark(text, lang) {
  if (!text) return false
  const rx = OLD_STARTERS[lang]
  if (!rx) return false
  const t = text.trim()
  if (!rx.test(t)) return false
  if (t.split(/\s+/).length < 3) return false        // the word-count skip
  if (OLD_SUB[lang] && OLD_SUB[lang].test(t)) return false
  return !oldEndsQ(text)
}
// "Require BOTH sides to look like questions" — the old check's central rule.
const oldFlags = (row) => oldNeedsMark(row.known_text, 'eng') && oldNeedsMark(row.target_text, 'ita')

const row = (id, known_text, target_text, extra = {}) =>
  ({ id, kind: 'use', seed_number: 1, known_text, target_text, is_fragment: false, ...extra })
const ITA = { knownLang: 'eng', targetLang: 'ita' }
const flagged = (rows, opts = ITA) => {
  const r = classify(rows, opts)
  return new Set([...r.mismatches, ...r.candidates].map((x) => x.id))
}

describe('regression: the three ways the old Check 14 was inert', () => {
  // All rows below are real ita_for_eng content, hand-confirmed 2026-09-10.

  it('a side mismatch is INVISIBLE to the old check and is the new check\'s strongest class', () => {
    // The known side already ends in `?`, so oldNeedsMark returns false for it, so
    // the "both sides must look like questions" rule discards the row — the easiest
    // and most reliable defect in the whole course, discarded by construction.
    const r = row('S0092L02U02', 'can you do it for me?', 'puoi farlo per me')
    expect(oldFlags(r)).toBe(false)

    const out = classify([r], ITA)
    expect(out.mismatches).toHaveLength(1)
    expect(out.mismatches[0].side).toBe('target_missing')
  })

  it('the word-count skip drops short complete questions', () => {
    const rows = [
      row('S0643L01B01', 'do you want', 'vuole'),
      row('S0653L01B01', 'do you mind', 'le dispiace'),
      row('S0082L02B01', 'why not', 'perché no'),
    ]
    for (const r of rows) expect(oldFlags(r)).toBe(false)
    const got = flagged(rows)
    for (const r of rows) expect(got.has(r.id)).toBe(true)
  })

  it('an intonation question in statement word order is unreachable by any opener, and the frame net reaches it', () => {
    // No opener fires on "you don't mind speaking" in either check. The only evidence
    // is that its siblings in the same ladder ARE marked.
    const broken = row('S0063L01B02', "you don't mind speaking", 'non ti dispiace parlare')
    expect(oldFlags(broken)).toBe(false)
    expect(openerHits(broken.known_text, 'eng')).toHaveLength(0)

    const family = [
      broken,
      row('S0063L01U01', "you don't mind speaking slowly?", 'non ti dispiace parlare lentamente?'),
      row('S0063L01U03', "you don't mind speaking Italian?", 'non ti dispiace parlare italiano?'),
    ]
    const out = classify(family, ITA)
    expect(out.candidates.map((c) => c.id)).toContain('S0063L01B02')
    expect(out.candidates.find((c) => c.id === 'S0063L01B02').nets.join()).toMatch(/^frame:2\/3/)
  })
})

describe('the paired opening mark, which the old Check 14 had and this check must not lose', () => {
  // Spanish only, and it is a class of its own: not a missing question mark but a
  // missing half of one. Detectable with certainty, nothing to do with word order.

  it('flags a Spanish question that closes with ? and carries no ¿', () => {
    expect(needsPairedOpen('lo pasaste bien el fin de semana?', 'spa')).toBe(true)
    expect(needsPairedOpen('¿lo pasaste bien el fin de semana?', 'spa')).toBe(false)
  })

  it('does NOT require the ¿ at position 0 — it opens the clause, not the string', () => {
    // The old check's `startsSpanishQmark` was anchored, and anchoring called all of
    // these defects. On spa_for_eng that was the difference between 24 reported and
    // 2 real: 50% false on the first course it ran on.
    const correct = [
      'Si tienes un poco más de tiempo, ¿puedo preguntarte algo antes de que te vayas?',
      'No estoy seguro de entender así que ¿podrías explicar de nuevo un poco más despacio?',
      'no voy a esperarte. ¿Por qué no?',
    ]
    for (const t of correct) expect(needsPairedOpen(t, 'spa')).toBe(false)
  })

  it('applies to the SPANISH side whichever side that is, and never to English', () => {
    // A naive both-sides version flags 1,268 perfectly correct English rows on
    // spa_for_eng, where English is the known side.
    expect(needsPairedOpen('did you have a good time?', 'eng')).toBe(false)
    const out = classify([
      row('t', 'did you have a good time?', 'lo pasaste bien el fin de semana?'),
    ], { knownLang: 'eng', targetLang: 'spa' })
    expect(out.pairedOpen).toHaveLength(1)
    expect(out.pairedOpen[0].side).toBe('target')

    const flipped = classify([
      row('k', '¿lo pasaste bien?', 'did you have a good time?'),
      row('k2', 'lo pasaste bien?', 'did you have a good time?'),
    ], { knownLang: 'spa', targetLang: 'eng' })
    expect(flipped.pairedOpen.map((x) => x.id)).toEqual(['k2'])
  })

  it('carries its own denominator, so a house style is distinguishable from a defect list', () => {
    const out = classify([
      row('a', 'x?', '¿y?'), row('b', 'x?', '¿y?'), row('c', 'x?', 'y?'),
    ], { knownLang: 'eng', targetLang: 'spa' })
    expect(out.pairedClosers).toBe(3)      // three Spanish rows close with ?
    expect(out.pairedOpen).toHaveLength(1) // one of them is missing the opener
  })
})

describe('the accented word-boundary trap (canon: Check 14 never fired on Spanish or French)', () => {
  // MEASURED against the literal old patterns, not against the canon's description of
  // them. The canon says qué, cómo, cuándo, dónde, quién and où are all undetectable.
  // Only SOME of that is true, and the difference is the actual mechanism: `\b` is a
  // boundary between a word char and a non-word char, so it fails only when the last
  // character of the alternative is outside ASCII \w. Six entries die estate-wide —
  // spa qué and por qué, fra qu' and où, ita perché, por você — and eng, deu and cym
  // are untouched. Anything with the accent in the MIDDLE is fine.
  it('the trap bites only when the FINAL character is non-ASCII', () => {
    expect(OLD_STARTERS.ita.test('perché no')).toBe(false)      // trailing é — dead
    expect(OLD_STARTERS.spa.test('qué quieres')).toBe(false)    // trailing é — dead
    expect(OLD_STARTERS.spa.test('cómo estás')).toBe(true)      // accent in the middle — FIRES
    expect(OLD_STARTERS.spa.test('dónde está')).toBe(true)      // FIRES
    expect(OLD_STARTERS.spa.test('cuándo vienes')).toBe(true)   // FIRES
    expect(OLD_STARTERS.spa.test('quién es')).toBe(true)        // FIRES
  })
  it("but French qu' is FINE, because what follows it is a letter", () => {
    // Worth pinning because it is the near-miss. `\b` is a boundary between a word
    // char and a non-word char, so after the apostrophe it depends entirely on what
    // comes NEXT: `qu'est-ce` has a letter there and matches, `qué ` has a space and
    // does not. A first pass at measuring this probed every alternative against a
    // following space and wrongly called `qu'` dead. The dead list is five entries,
    // estate-wide: spa qué and por qué, fra où, ita perché, por você.
    expect(OLD_STARTERS.fra.test("qu'est-ce que c'est")).toBe(true)
    expect(OLD_STARTERS.fra.test('où est le livre')).toBe(false)
  })
  it('the new patterns fire on all of them', () => {
    expect(openerHits('perché non vuoi aspettare', 'ita')).toContain('open')
    expect(openerHits('qué quieres hacer', 'spa')).toContain('open')
    expect(openerHits('cómo estás', 'spa')).toContain('open')
    expect(openerHits('dónde está', 'spa')).toContain('open')
    expect(openerHits('où est le livre', 'fra')).toContain('open')
    expect(openerHits("qu'est-ce que c'est", 'fra')).toContain('open')
  })
  it('and does not match a longer word that merely starts the same way', () => {
    expect(openerHits('chessboard is here', 'ita')).toHaveLength(0)
    expect(openerHits('whatever he says', 'eng')).toHaveLength(0)
  })
})

describe('nets', () => {
  it('mismatch fires either way round and names which side is missing', () => {
    expect(classify([row('a', 'is it good?', 'è buono')], ITA).mismatches[0].side).toBe('target_missing')
    expect(classify([row('b', 'is it good', 'è buono?')], ITA).mismatches[0].side).toBe('known_missing')
  })
  it('a row marked on both sides is not a candidate at all', () => {
    const out = classify([row('c', 'is it good?', 'è buono?')], ITA)
    expect(out.mismatches).toHaveLength(0)
    expect(out.candidates).toHaveLength(0)
  })
  it('negative contractions and fronted adverbs fire', () => {
    expect(openerHits("shouldn't we try to ask", 'eng')).toContain('neg')
    expect(openerHits('then what happened', 'eng')).toContain('front')
  })
  it('the tail net reaches a question that is the second sentence', () => {
    expect(lastSentence('I want to. Why not')).toBe('Why not')
    expect(lastSentence('one sentence only')).toBeNull()
    const out = classify([row('t', 'I want to. why not', 'voglio. perché no')], ITA)
    expect(out.candidates[0].nets).toContain('tail')
  })
  it('a multi-sentence row does not donate a sibling frame', () => {
    // "I want to. Why not?" would otherwise make every "I want to …" declarative a
    // candidate — measured, that one contamination tripled the frame net's output.
    const rows = [
      row('q', 'I want to. why not?', 'voglio. perché no?'),
      row('d', 'I want to speak Italian', 'voglio parlare italiano'),
    ]
    const nets = classify(rows, ITA).candidates.find((c) => c.id === 'd')
    expect(nets === undefined || !nets.nets.some((n) => n.startsWith('frame:'))).toBe(true)
  })
  it('fragments are counted, never silently dropped', () => {
    const out = classify([
      row('lego', 'how much', 'quanto', { is_fragment: true }),
      row('use', 'how much do you want', 'quanto vuoi'),
    ], ITA)
    expect(out.fragments).toBe(1)
    expect(out.judged).toBe(1)
    expect(out.rows).toBe(2)
  })
  it('a wh + infinitive noun clause is suppressed, and the suppression is returned', () => {
    expect(suppressed('how to speak as often as possible', 'eng')).toBe(true)
    expect(suppressed('how do you speak', 'eng')).toBe(false)
    const out = classify([row('inf', 'how to speak', 'come parlare')], ITA)
    expect(out.candidates).toHaveLength(0)
    expect(out.suppressed).toHaveLength(1)
    expect(out.suppressed[0].reason).toMatch(/noun clause/)
  })
})

describe('tiers put the strongest evidence at the top', () => {
  it('a known-side opener is B, a mostly-marked frame is C, a target-only opener is D', () => {
    expect(tierOf(['known:open'])).toBe('B')
    expect(tierOf(['frame:14/20'])).toBe('C')
    expect(tierOf(['frame:1/23'])).toBe('D')
    expect(tierOf(['target:open'])).toBe('D')
  })
})

describe('a language with no opener set degrades honestly, it does not report clean', () => {
  it('reports NO PATTERN SET rather than a zero, and still runs the language-independent nets', () => {
    const rows = [row('m', 'ಇದು ಸರಿಯೇ?', 'is this right'), row('n', 'ಹೌದು', 'yes')]
    const out = classify(rows, { knownLang: 'kan', targetLang: 'eng' })
    expect(out.knownOpeners).toBe(false)
    expect(out.mismatches).toHaveLength(1)     // the structural net still works
  })
})

describe('self-calibration is leave-one-out', () => {
  it('a planted row cannot be its own witness, but its siblings can vouch for it', () => {
    const family = [
      row('x1', "you don't mind speaking slowly?", 'non ti dispiace parlare lentamente?'),
      row('x2', "you don't mind speaking Italian?", 'non ti dispiace parlare italiano?'),
      row('x3', "you don't mind reading the letter?", 'non ti dispiace leggere la lettera?'),
    ]
    // Each is found when planted alone, because the other two are still marked.
    expect(calibrate(family, ITA).recall).toBe(100)
    // With no siblings at all there is nothing to vouch, and the check says so
    // rather than pretending — this is the honest floor, not a bug.
    expect(calibrate([family[0]], ITA).recall).toBe(0)
  })
})

describe('endsQ handles the marks the estate actually stores', () => {
  it('accepts ASCII, fullwidth and Arabic question marks, and ignores a full stop', () => {
    expect(endsQ('is it good?')).toBe(true)
    expect(endsQ('これでいい？')).toBe(true)
    expect(endsQ('هل هذا جيد؟')).toBe(true)
    expect(endsQ('it is good.')).toBe(false)
  })
  it('a mid-string ? is not a terminal mark — that is the tail net\'s job', () => {
    expect(endsQ('who was that? an old man')).toBe(false)
  })
})

describe('frameKey', () => {
  it('folds case and punctuation and needs three words', () => {
    expect(frameKey('Do you want, really')).toBe('do you want')
    expect(frameKey('two words')).toBeNull()
  })
})
