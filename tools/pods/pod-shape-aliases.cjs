/**
 * The DECLARED alias table — the one place a shape NAME is turned into a store id.
 *
 * The three pods declare their shapes in four registers, and only two of them are
 * the store's own:
 *
 *   N1–N17, P1–P6   nodes / bound pairs   → `services/shared/metagraph/nodes.json`
 *   O1–O9           outcome overlay       → `.../outcome-shapes.json`
 *   F1–F21          the twenty moves      → `.../moves.json`
 *   m1–m23          the CONTROL ARM'S OWN move numbering, from the response-family
 *                   inventory of 2026-08-29. It is NOT the store's F register and
 *                   the store holds no crosswalk, so an `m` token resolves to
 *                   nothing here and is recorded UNRESOLVED. Guessing m→F would
 *                   fabricate coverage, which is the one number this instrument
 *                   exists to produce honestly.
 *
 * Alongside those, both chapter cuts and the 43-scene arm name shapes BY PHRASE.
 * Where the phrase is the store shape's own name, the mapping below makes it —
 * DECLARED in the open, as a judgement, the way the retired markdown parser
 * declared its own. Anything not matched here is UNRESOLVED and reported as such.
 *
 * The eight "summit shapes" the re-read named — the specimen, the counterexample
 * absorbed, the stacked commission, pre-emption, the misreading corrected, the
 * listener names it, the outsider's pitch, the reported claim too big to hold —
 * are deliberately NOT aliased. The documents themselves say these are shapes "on
 * the page, general, and walked by nobody" that "no inventory named": they have no
 * store id yet, and inventing one would be exactly the fabrication above. They are
 * recorded as register `summit-shape`, resolution `unresolved`, and counted.
 */

const DECLARED_ALIASES = [
  { nodeId: 'N1',  re: /\britual open\b|\bopen ?\/ ?close\b|\bthe ritual\b/i,        why: 'N1 Ritual open/close — the phrase is the node’s own name' },
  { nodeId: 'N6',  re: /\bself-repair\b|\breformulation\b|\brepair\b/i,               why: 'N6 Repair — non-understanding, reformulate, resume' },
  { nodeId: 'N7',  re: /\barrangement\b/i,                                            why: 'N7 Arrangement' },
  { nodeId: 'N8',  re: /\brecommendation\b/i,                                         why: 'N8 Recommendation' },
  { nodeId: 'N13', re: /not-knowing|\bi-don.t-know\b|\bnot knowing\b/i,                why: 'N13 Not-knowing' },
  { nodeId: 'N14', re: /premise audit|challenge-the-premise|teasing audit|\bthe audit\b/i, why: 'N14 Premise audit — a claim having its ground asked for' },
  { nodeId: 'N15', re: /parked (disagreement|clash)|standing clash|parked with teeth/i, why: 'N15 Parked disagreement' },
  { nodeId: 'N16', re: /\bhaggle\b/i,                                                  why: 'N16 Precision haggle' },
  { nodeId: 'N17', re: /interruption|banked thread|\bthe bank\b|\bthe recovery\b/i,     why: 'N17 Interruption-and-bank' }
]

/** The eight summit shapes, named so they are counted as a class, never aliased. */
const SUMMIT_SHAPES = [
  'the specimen',
  'the counterexample absorbed',
  'the stacked commission',
  'pre-emption',
  'the misreading corrected',
  'the listener names it',
  "the outsider's pitch",
  'the reported claim'
]

function matchAlias (phrase) {
  for (const a of DECLARED_ALIASES) if (a.re.test(phrase)) return a
  return null
}

function isSummitShape (phrase) {
  const p = String(phrase).toLowerCase().replace(/[’]/g, "'")
  return SUMMIT_SHAPES.some(s => p.includes(s))
}

module.exports = { DECLARED_ALIASES, SUMMIT_SHAPES, matchAlias, isSummitShape }
