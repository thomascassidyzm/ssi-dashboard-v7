// The pure half of the K23(d) audit: given ONE prompt, does its KNOWN side carry
// the context that makes the marked sense the only available answer?
//
// K23(d) (canon, Kai 2026-09-10): "the marked sense may never be prompted without
// its context — ANYWHERE in the course", and "How to check: (d) is a whole-course
// audit, and there is no gate for any of this." This file is not that gate and must
// never become one. It produces a READING LIST. Deciding whether a given prompt
// reads as acquaintance is a human call, and a string test cannot make it.
//
// The asymmetry is deliberate: over-flagging costs a read, under-flagging ships a
// prompt that drills the learner against the pattern. So `clear` requires a POSITIVE
// cue on the known side; absence of one is a flag, never a pass.

// Generic pro-forms are NOT cues. "something we know" / "many things we don't know"
// were two of the eleven ita_for_eng defects of 2026-09-10 — the whole point is that
// they name no one and nothing, so the learner has no way to reach for the marked
// sense rather than the default.
const NEVER_A_CUE = new Set([
  'thing', 'things', 'something', 'anything', 'everything', 'nothing',
  'answer', 'answers', 'fact', 'facts', 'reason', 'reasons', 'way', 'ways',
  'truth', 'problem', 'meaning', 'question', 'questions',
])

/** Known-side words that name a person, a place, or a thing you can be acquainted with. */
const ENG_ACQUAINTANCE_CUES = [
  // people
  'man', 'men', 'woman', 'women', 'person', 'people', 'someone', 'somebody', 'anyone',
  'anybody', 'everyone', 'everybody', 'nobody', 'no one', 'friend', 'friends',
  'sister', 'brother', 'mother', 'father', 'grandfather', 'grandmother', 'parents',
  'child', 'children', 'kid', 'kids', 'boy', 'boys', 'girl', 'girls', 'son', 'daughter',
  'student', 'students', 'teacher', 'neighbour', 'neighbours', 'family', 'guy', 'lady',
  // Object pronouns only. "you" is deliberately absent: in "do you know the facts?"
  // it is the SUBJECT doing the knowing, not the thing known, and counting it cleared
  // one of the eleven defects of 2026-09-10. It is restored below, but only in object
  // position ("someone who knows you").
  'him', 'them', 'me', 'us',
  // places
  'place', 'places', 'city', 'town', 'village', 'country', 'street', 'road', 'path',
  'wood', 'park', 'office', 'house', 'home', 'hotel', 'restaurant', 'shop', 'area',
  // things one is acquainted WITH, which the ita_for_eng presentations license
  // explicitly ("someone or SOMETHING you're acquainted with")
  'name', 'names', 'word', 'words', 'story', 'stories', 'song', 'songs', 'book',
  'books', 'film', 'language', 'italian', 'english', 'welsh', 'spanish',
]

function words(s) {
  return (s || '').toLowerCase().replace(/[^a-z\s'’-]/g, ' ').split(/\s+/).filter(Boolean)
}

/**
 * @returns {{ flagged: boolean, cues: string[] }}
 *   flagged=true means "a human must read this prompt", not "this prompt is wrong".
 */
const KNOWS_YOU = /\bknows?\s+you\b|\bknew\s+you\b/i

function classifyPrompt(knownText, cues = ENG_ACQUAINTANCE_CUES) {
  const cueSet = new Set(cues)
  const ws = words(knownText)
  const hits = []
  if (KNOWS_YOU.test(knownText || '')) hits.push('you')
  for (let i = 0; i < ws.length; i++) {
    const w = ws[i].replace(/['’]s$/, '')            // friend's -> friend
    if (NEVER_A_CUE.has(w)) continue
    if (cueSet.has(w)) hits.push(w)
    const pair = `${ws[i]} ${ws[i + 1] || ''}`.trim() // "no one"
    if (cueSet.has(pair)) hits.push(pair)
  }
  return { flagged: hits.length === 0, cues: [...new Set(hits)] }
}

module.exports = { classifyPrompt, ENG_ACQUAINTANCE_CUES, NEVER_A_CUE, words }
