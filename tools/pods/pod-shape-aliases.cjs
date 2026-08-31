/**
 * The DECLARED alias table — the one place a shape NAME is turned into a store id.
 *
 * The three pods declare their shapes in four registers:
 *
 *   N*, P*          nodes / bound pairs   → `services/shared/metagraph/nodes.json`
 *   O1–O9           outcome overlay       → `.../outcome-shapes.json`
 *   F*              the move families     → `.../moves.json`
 *   m1–m23          the CONTROL ARM'S OWN move numbering, from the 23-move corpus
 *                   inventory (method-pod-full-2026-08-30.md §1c). Since the
 *                   2026-08-31 ratification the store DOES hold a declared
 *                   crosswalk for it — M_CROSSWALK below — built from the ruled
 *                   landings in proposed/talk-bollocks-additions-2026-08-30.json
 *                   and the ratification pass. Three m-tokens (m6 self-repair,
 *                   m14 abandonment, m15 solo enacted dialogue) are intra-turn
 *                   phenomena by ruling — not exchange positions — and stay
 *                   unresolved on purpose, with that ruling as the note.
 *
 * Alongside those, the pods name shapes BY PHRASE. Where the phrase is a store
 * shape's own name (which, since the ratification, includes the former "summit
 * shapes" — N301–N306, F301–F306, N902–N909), the mapping below makes it —
 * DECLARED in the open, as a judgement. Anything not matched is UNRESOLVED and
 * reported as such. Order matters: first match wins, so the digression entry
 * sits ABOVE N6 — scene 4's "reformulation, flagged digression and return" is
 * N302's walk, and matching it to N6 via /reformulation/ was the one recorded
 * over-mapping of the pre-ratification table.
 */

const DECLARED_ALIASES = [
  // -- ratified 2026-08-31: the discursive shapes the Method Pod stages --------
  { nodeId: 'N302', re: /\bdigression\b|where were we|\breturn marker\b|world breaks in/i, why: 'N302 Digression-and-return — the thread held as joint property; an unflagged, world-caused detour is still this shape (the flag is optional by its own gloss)' },
  { nodeId: 'N301', re: /joint construction|metaphor handover/i,                     why: 'N301 Joint construction — the metaphor handover is N301 at arc scale (talk-bollocks ruling: an arc, not a second mint)' },
  { nodeId: 'N303', re: /\bthe specimen\b/i,                                          why: 'N303 The specimen — the partner enrolled as the live case' },
  { nodeId: 'N304', re: /reported claim/i,                                            why: 'N304 The reported claim too big to hold — the verdict jointly withheld' },
  { nodeId: 'N305', re: /outsider.s pitch|proxy pitch/i,                              why: 'N305 The proxy pitch — the owner audits, ratifies, may adopt' },
  { nodeId: 'N306', re: /puppet show|co-staged scene/i,                               why: 'N306 The co-staged scene — both parties voice roles inside one built world' },
  { nodeId: 'N902', re: /\brazor\b/i,                                                 why: 'N902 The razor — dismantled by full restatement; deployment as a shared line stays F303' },
  { nodeId: 'N903', re: /position-abandonment|recantation/i,                          why: 'N903 Public position-abandonment — recanted at full strength, jointly, no hedge' },
  { nodeId: 'N907', re: /misreading corrected/i,                                      why: 'N907 The misreading corrected — interpretation fails, not transmission' },
  { nodeId: 'N908', re: /complaint,? with a partner turn|complaint-with-partner-turn/i, why: 'N908 Complaint-with-partner-turn — the grievance completed rather than answered' },
  { nodeId: 'N909', re: /story .. matched story|matched story/i,                      why: 'N909 Story → matched story — the match carries the claim' },
  { nodeId: 'N11',  re: /mirrored tease/i,                                            why: 'N11 walked on an other-directed tease — talk-bollocks reading A, its recorded verdict: every subsequent position maps one-to-one' },
  { nodeId: 'F301', re: /listener names it|so what you.re saying/i,                   why: 'F301 So what you\'re saying is — the compression/name handed back and adopted (the listener-names-it summit shape is F301 with a name, per its consolidation ruling)' },
  { nodeId: 'F302', re: /flagged guess|anecdote-with-flag|flagged anecdote/i,         why: 'F302 It proves nothing — accept it anyway; the flag licenses full-strength delivery (scene 7\'s guess and scene 2\'s anecdote are its own attested passages)' },
  { nodeId: 'F303', re: /co-owned line|\bcallback\b|shared line/i,                    why: 'F303 The shared line — minted between the parties, redeployed as a joint tool' },
  { nodeId: 'F304', re: /comment on the medium|the medium named|meta-comment/i,       why: 'F304 Comment on the medium — the machinery as a shared toy' },
  { nodeId: 'F305', re: /counterexample absorbed|concession-then-build/i,             why: 'F305 Absorb and build — the counter folded in as an upgrade' },
  { nodeId: 'F306', re: /pre-emption|exactly where I.m about to go/i,                 why: 'F306 Exactly where I\'m about to go — the floor merges rather than passes' },
  { nodeId: 'F1',   re: /stacked commission/i,                                        why: 'F1 at summit scale — the one-word acceptance of a five-part commission (talk-bollocks ruling: lands on F1, with strain; the stack-management is walk behaviour, not a position)' },
  // -- outcome overlay, named by phrase in the outcome-mint scenes -------------
  { nodeId: 'O1',   re: /\b(bare|flat) no\b/i,                                        why: 'O1 Non-delivery — the bare no, delivered and survived' },
  { nodeId: 'O3',   re: /listener does not understand you|native does not understand/i, why: 'O3 — the native/listener does not understand you' },
  { nodeId: 'O4',   re: /read-back was wrong|read-back corrected/i,                   why: 'O4 — your read-back was wrong' },
  { nodeId: 'O5',   re: /premise refused|premise of your ask/i,                       why: 'O5 — the premise of your ask is wrong' },
  { nodeId: 'O6',   re: /trouble that is your own fault/i,                            why: 'O6 — trouble that is your own fault' },
  { nodeId: 'O7',   re: /disclosure acknowledged|discloses worry/i,                   why: 'O7 — the native discloses worry or difficulty' },
  // -- the pre-ratification table, unchanged and in its original order --------
  { nodeId: 'N1',  re: /\britual open\b|\bopen ?\/ ?close\b|\bthe ritual\b|resisted goodbye/i, why: 'N1 Ritual open/close — the phrase is the node’s own name; the resisted goodbye is its close half held open' },
  { nodeId: 'N6',  re: /\bself-repair\b|\breformulation\b|\brepair\b/i,               why: 'N6 Repair — non-understanding, reformulate, resume' },
  { nodeId: 'N7',  re: /\barrangement\b/i,                                            why: 'N7 Arrangement' },
  { nodeId: 'N8',  re: /\brecommendation\b/i,                                         why: 'N8 Recommendation' },
  { nodeId: 'N13', re: /not-knowing|\bi-don.t-know\b|\bnot knowing\b/i,                why: 'N13 Not-knowing' },
  { nodeId: 'N14', re: /premise audit|challenge-the-premise|teasing audit|\bthe audit\b/i, why: 'N14 Premise audit — a claim having its ground asked for' },
  { nodeId: 'N15', re: /parked (disagreement|clash)|standing clash|parked with teeth/i, why: 'N15 Parked disagreement' },
  { nodeId: 'N16', re: /\bhaggle\b/i,                                                  why: 'N16 Precision haggle' },
  { nodeId: 'N17', re: /interruption|banked thread|thread recovered|\bthe bank\b|\bthe recovery\b/i, why: 'N17 Interruption-and-bank' }
]

/**
 * The m→store crosswalk — the control arm's 23-move numbering, resolved by the
 * ruled landings (talk-bollocks `explicitly_not_minted` verdicts and the
 * 2026-08-31 ratification). `null` = unresolved BY RULING, with the reason.
 */
const M_CROSSWALK = {
  m1:  { id: 'F8',   why: 'reformulation — F8 Said again, differently' },
  m2:  { id: 'N301', why: 'joint construction — ratified N301' },
  m3:  { id: 'F3',   why: 'question-as-handover — lands where the prior work put it: P5/F3; the move register form is F3' },
  m4:  { id: 'F302', why: 'anecdote-with-flag — consolidated into F302' },
  m5:  { id: 'N15',  why: 'challenge mid-story — lands on N15 (store edge M3)' },
  m6:  { id: null,   why: 'self-repair is intra-turn by ruling (talk-bollocks: not an exchange shape) — no store position exists or should' },
  m7:  { id: 'F305', why: 'concession-then-build — consolidated into F305' },
  m8:  { id: 'F303', why: 'callback — consolidated into F303 The shared line' },
  m9:  { id: 'N302', why: 'live intrusion folded back — N302 with the flag absent and the cause external; the fold-back is N302 position 5 (detour claimed as evidence)' },
  m10: { id: 'F10',  why: 'backchannel — F10 Keep going' },
  m11: { id: 'F302', why: 'provisional flag — consolidated into F302' },
  m12: { id: 'F304', why: 'meta-comment on the medium — ratified F304' },
  m13: { id: 'N902', why: 'the razor — ratified N902' },
  m14: { id: null,   why: 'abandonment is intra-turn by ruling (talk-bollocks: not an exchange shape)' },
  m15: { id: null,   why: 'solo enacted dialogue is intra-turn by ruling; the across-turn form is N306 and declares itself by name' },
  m16: { id: 'N301', why: 'metaphor handover — an arc of N301, per its recorded verdict' },
  m17: { id: 'N11',  why: 'mirrored tease — N11 walked with inverted polarity (talk-bollocks reading A)' },
  m18: { id: 'F302', why: 'status flag — consolidated into F302' },
  m19: { id: 'N17',  why: 'topic parking — N17 Interruption-and-bank' },
  m20: { id: 'F303', why: 'co-owned line — consolidated into F303' },
  m21: { id: 'N16',  why: 'haggle — N16' },
  m22: { id: 'N13',  why: 'I-don\'t-know — N13' },
  m23: { id: 'N14',  why: 'challenge-the-premise — N14' }
}

/** The eight summit shapes — kept for the class count; since the ratification
 * every one of them resolves through DECLARED_ALIASES to a real store id. */
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

function matchCrosswalk (mToken) {
  return M_CROSSWALK[String(mToken).toLowerCase()] || null
}

function isSummitShape (phrase) {
  const p = String(phrase).toLowerCase().replace(/[’]/g, "'")
  return SUMMIT_SHAPES.some(s => p.includes(s))
}

module.exports = { DECLARED_ALIASES, M_CROSSWALK, SUMMIT_SHAPES, matchAlias, matchCrosswalk, isSummitShape }
