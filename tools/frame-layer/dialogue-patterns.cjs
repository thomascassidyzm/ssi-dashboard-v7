/**
 * Dialogue frame matchers — the pod corpus's frame DELTA over the seed corpus.
 *
 * Sibling of `patterns.cjs`, same `P()` idiom, same frame convention, new id
 * namespaces so provenance is readable in one character:
 *   P*  seed corpus (patterns.cjs)   D*  pod, sentence grain   X*  pod, exchange grain
 *
 * WHY A SECOND FILE AT ALL. The 31 seed matchers fire on 169 of pod-0's 231
 * rows. The 62-row residue is not noise — it is precisely the conversational
 * register the seed corpus cannot attest, because every seed is a statement and
 * no seed has a turn before it: greetings, bare polar responses, ellipted
 * orders, deictic handovers, thanks, reckonings, read-backs. That delta is a
 * closed set of order 10-15, which is why this file is hand-maintained rather
 * than mined.
 *
 * TWO GRAINS, AND THE SECOND ONE IS THE POINT.
 *   A D-frame is an utterance shape. It is matched on one row's text, exactly
 *   as a P-frame is matched on one seed's known side.
 *   An X-frame is an EXCHANGE shape: it spans a turn boundary and therefore
 *   cannot exist at sentence grain at all. It is matched on an adjacent pair
 *   (or triple) inside one scene. Its `sentence_projection` names the D-frame a
 *   single-utterance generator can reach today; the full value of an X-frame
 *   needs the player to carry an initiating turn, which is out of scope.
 *
 * `fixed_material` IS THE GATE'S INPUT, and it is the only field with teeth.
 * It is the frame's own lexical skeleton as a list of ALTERNATES, each a list
 * of CHUNKS. A frame is instantiable for a basket only when every chunk of at
 * least one alternate resolves whole-chunk against the vocabulary that basket
 * owns — same discipline as the validator, no re-conjugation, no invention.
 * Slots (the elaboration clause, the ordered item, the price) are free material
 * and are covered by the ordinary vocabulary rules, so they are NOT listed here.
 * Keep chunks in the surface form a LEGO's known side would actually carry:
 * "thank you", not "thanks for [VP]".
 *
 * PODS CONTRIBUTE ATTESTATION AND ZERO VOCABULARY (design ruling, 2026-08-31).
 * Nothing in this file is a source of target-side material. A frame here is a
 * claim that the corpus says this shape happens — never a claim that any pair
 * can say it. That second question is `instantiableFrameSet()`.
 *
 * `shape_nodes` is a CROSS-REFERENCE into the shape store
 * (`services/shared/metagraph/nodes.json`, spec `docs/pods/shape-graph-2026-08-30.md`),
 * never an embedding. A shape is a bound sequence of positions filled by
 * families; a frame is a surface shape with slots. One shape hosts several
 * frames; one frame appears in several shapes.
 */

/** Sentence-grain frame. `re` may be a RegExp or a predicate over the row text. */
const D = (id, name, shape, re, opts = {}) => ({
  id, name, shape,
  grain: 'sentence',
  position: opts.position || 'either',          // initiating | response | either
  fixed_material: opts.fixed_material || [],
  shape_nodes: opts.shape_nodes || [],
  notes: opts.notes || '',
  test: typeof re === 'function' ? re : (t) => re.test(String(t || '')),
  source: String(re),
});

/**
 * Exchange-grain frame. `testPair(prev, cur)` is the required matcher; an
 * optional `testTriple(prev, cur, next)` tightens a three-turn shape. Both are
 * applied only WITHIN one scene — a scene boundary breaks adjacency, because
 * two unrelated conversations touching in `global_order` are not an exchange.
 */
const X = (id, name, shape, opts) => ({
  id, name, shape,
  grain: 'exchange',
  positions: opts.positions || [],
  fixed_material: opts.fixed_material || [],
  shape_nodes: opts.shape_nodes || [],
  sentence_projection: opts.sentence_projection || null,
  notes: opts.notes || '',
  testPair: opts.testPair,
  testTriple: opts.testTriple || null,
});

// --- shared sub-matchers, so a frame's intent reads in one line -------------
/**
 * A pod row is a TURN, and a turn is often several sentences: "Thank you very
 * much. Goodbye." carries two frames, and testing only the row's first word
 * loses the second every time. So a turn-opening matcher is applied to each
 * sentence of the turn, not to the turn. (This is the one place the pod grain
 * genuinely differs from the seed grain, where one seed is one sentence.)
 */
const SENTENCES = (t) => String(t || '').split(/(?<=[.!?…])[\s"'“”]+|\s+[-—]\s+/)
  .map(s => s.replace(/^[\s"'“”(]+/, '').trim()).filter(Boolean);
const OPENS = (re) => (t) => SENTENCES(t).some(s => re.test(s));

const SENTENCE_FRAMES = [
  D('D1', 'ritual open/close',
    "hello|good morning|goodbye|see you ( , [NAME] )",
    OPENS(/^(hello|hi|hiya|good morning|good afternoon|good evening|good night|goodbye|bye|welcome|see you|morning|afternoon)\b/i),
    { position: 'either', shape_nodes: ['N1'],
      fixed_material: [['hello'], ['hi'], ['good morning'], ['good afternoon'], ['good evening'], ['goodbye'], ['bye'], ['welcome'], ['see you']],
      notes: 'the frame the seed corpus cannot attest at all: no seed opens a conversation' }),

  D('D2', 'polar response + elaboration',
    "yes|no|of course , [CLAUSE]",
    OPENS(/^(yes|no|yeah|nope|of course|certainly|absolutely|definitely|i'm afraid|afraid not)\b/i),
    { position: 'response', shape_nodes: ['N2', 'N3', 'N9'],
      fixed_material: [['yes'], ['no'], ['of course']],
      notes: 'the strongest single argument for the whole design: the particle is cut early in essentially every pair, so the response register becomes reachable at almost zero cost' }),

  D('D3', 'thanks / gratitude close',
    "thank you ( for [NP|VPing] ) | thanks ( , [CLAUSE] )",
    /\b(thank you|thanks|thank goodness|much obliged|i appreciate it|very kind of you)\b/i,
    { position: 'either', shape_nodes: ['N2', 'N10'],
      fixed_material: [['thank you'], ['thanks']] }),

  D('D4', 'apology / attention-getter',
    "excuse me , [CLAUSE|WH-Q] | (I'm) sorry , [CLAUSE]",
    OPENS(/^(excuse me|sorry|i'm sorry|i am sorry|pardon|forgive me)\b/i),
    { position: 'initiating', shape_nodes: ['N2', 'N6'],
      fixed_material: [['excuse me'], ['sorry'], ["i'm sorry"]] }),

  D('D5', 'deictic handover',
    "here's [NP] | here you are | here it is | there's [NP]",
    /\b(here you are|here it is|here we are|here'?s (your|the|my|a|an|one)|here are the|there'?s (the|your) \w+)\b/i,
    { position: 'response', shape_nodes: ['N2'],
      fixed_material: [['here you are'], ['here it is'], ["here's"], ['here is']],
      notes: 'the physical hand-over move; the seeds have no deixis-in-situation at all' }),

  D('D6', 'reciprocal return',
    "[ANSWER] . and you ? | what about you ?",
    /\b(and you|and yourself|what about you|how about you|and you\?)\s*\??/i,
    { position: 'response', shape_nodes: ['N5'],
      fixed_material: [['and you'], ['what about you']],
      notes: 'the sentence projection of X1. THE WORKED CASE: spa_for_eng has cut no "and you", no "y tu", no bare "tu" — so this frame is unreachable for spa at every position, and the gate must say so' }),

  D('D7', 'uptake assessment',
    "[ASSESSMENT] . [CONTINUATION]",
    OPENS(/^(excellent|lovely|perfect|great|wonderful|brilliant|no problem|that's fine|that's no|marvellous|good idea|exactly)\b/i),
    { position: 'response', shape_nodes: ['N2', 'N8'],
      fixed_material: [['lovely'], ['perfect'], ['great'], ['of course'], ['no problem']],
      notes: 'same frame carries a service uptake ("Excellent choice") and a clinical graceful-switch ("Of course, no problem at all") — which is what the register tag is for' }),

  D('D8', 'ellipted order',
    "[NP] , please   (no finite verb)",
    (t) => SENTENCES(t).some(s => /,\s*please\b/i.test(s)
        && s.split(/\s+/).length >= 3
        && !/^(yes|no|yeah|ok|okay)\b/i.test(s)
        && !/\b(i'?ll|i would|can i|could i|may i|we'?ll|i want|i'd like|would like|have|take|follow|stop|tell|give|come|wait)\b/i.test(s)),
    { position: 'initiating', shape_nodes: ['N2'],
      fixed_material: [['please']],
      notes: 'ellipsis IS the frame — "Four single tickets to town, please" has no verb and no seed looks like it' }),

  D('D9', 'reckoning',
    "that's [AMOUNT] ( altogether )",
    /\b(that'?s|that will be|that'll be|comes to)\b[^.?!]*\b(pound|pounds|euro|euros|pence|p|dollars?)\b/i,
    { position: 'initiating', shape_nodes: ['N2'],
      fixed_material: [["that's"], ['that is']] }),

  D('D10', 'read-back receipt',
    "[REPEATED INSTRUCTION] . got it | understood | will do",
    OPENS(/^(got it|understood|noted|word perfect|exactly right|that'?s right)\b/i),
    { position: 'response', shape_nodes: ['N4'],
      fixed_material: [['got it'], ['understood']],
      notes: 'mined from the health source, as the design predicted the sector sources would add: the learner says the instruction back and marks receipt' }),

  D('D11', 'reassurance / normalising',
    "don't worry | that's normal | you're doing [ADV]",
    /\b(don'?t worry|no need to worry|nothing to worry about|(is|are) (completely |perfectly )?normal|you'?re doing (fine|well|marvellous|grand)|it'?s (fine|alright|okay)\b|no trouble|not at all)\b/i,
    { position: 'response', shape_nodes: ['N12'],
      fixed_material: [["don't worry"], ["that's normal"], ['not at all']] }),

  D('D12', 'compliance commitment',
    "I will | I'll [VP] ( , then )",
    OPENS(/^(i will|we will|will do|righto|right you are|deal|i'?ll do that|i promise)\b/i),
    { position: 'response', shape_nodes: ['N4'],
      fixed_material: [['i will'], ['will do'], ["i'll"]],
      notes: 'the confirm position of N4; distinct from D10 because it commits forward rather than echoing back' }),
];

// --- exchange grain ---------------------------------------------------------
const isQ = (t) => /\?/.test(String(t || ''));
const fires = (frames, ids, t) => frames.filter(f => ids.includes(f.id)).some(f => f.test(t));
const D_BY = Object.fromEntries(SENTENCE_FRAMES.map(f => [f.id, f]));

const EXCHANGE_FRAMES = [
  X('X1', 'reciprocal return',
    "[WH-Q] -> [A] + and you ? -> [A]",
    { positions: ['answer-plus-return', 'return-answer'],
      fixed_material: [['and you'], ['what about you']],
      sentence_projection: 'D6',
      shape_nodes: ['N5'],
      testPair: (prev, cur) => isQ(prev) && D_BY.D6.test(cur),
      testTriple: (prev, cur, next) => isQ(prev) && D_BY.D6.test(cur) && !!next && !isQ(next),
      notes: 'the design\'s worked case, quoted live from pod-0 SC06' }),

  X('X2', 'polar-response-to-question',
    "[POLAR Q] -> yes|no , [CLAUSE]",
    { positions: ['question', 'polar-response'],
      fixed_material: [['yes'], ['no'], ['of course']],
      sentence_projection: 'D2',
      shape_nodes: ['N3', 'N9'],
      testPair: (prev, cur) => isQ(prev) && D_BY.D2.test(cur),
      notes: 'the commonest exchange in the corpus and the cheapest to make instantiable' }),

  X('X3', 'repair',
    "[TURN] -> non-understanding + request -> [REFORMULATION]",
    { positions: ['trouble-source', 'repair-initiation', 'reformulation'],
      fixed_material: [['sorry'], ["i don't understand"], ['say that again']],
      sentence_projection: 'D4',
      shape_nodes: ['N6'],
      testPair: (prev, cur) => !!prev && /\b(sorry|say (that )?again|didn'?t (quite )?catch|don'?t understand|what do you mean|come again|pardon|slow(ly| down)|repeat that)\b/i.test(String(cur || '')),
      notes: 'the one exchange whose whole point is that the FIRST turn failed; a sentence-grain map cannot see it' }),

  X('X4', 'instruction -> read-back',
    "[INSTRUCTION] -> [INSTRUCTION REPEATED] + receipt",
    { positions: ['instruct', 'read-back'],
      fixed_material: [['got it'], ['understood'], ['i will']],
      sentence_projection: 'D10',
      shape_nodes: ['N4'],
      testPair: (prev, cur) => !!prev && !isQ(prev) && D_BY.D10.test(cur),
      notes: 'the safety-critical shape of the health source: the learner proves uptake by saying it back' }),

  X('X5', 'order -> deictic handover',
    "[ORDER|REQUEST] -> here you are | here's [NP]",
    { positions: ['order', 'deliver'],
      fixed_material: [['here you are'], ['here it is'], ["here's"]],
      sentence_projection: 'D5',
      shape_nodes: ['N2'],
      testPair: (prev, cur) => !!prev && D_BY.D5.test(cur) }),

  X('X6', 'thanks -> downgrade',
    "thank you -> not at all | no problem | you're welcome",
    { positions: ['thank', 'downgrade'],
      fixed_material: [['not at all'], ['no problem'], ["you're welcome"]],
      sentence_projection: 'D11',
      shape_nodes: ['N10', 'N2'],
      testPair: (prev, cur) => D_BY.D3.test(prev) && /\b(not at all|no problem|you'?re welcome|no trouble|any time|my pleasure|none taken|that'?s (quite )?alright)\b/i.test(String(cur || '')) }),
];

/**
 * The MERGED matcher list the diversity metric and the generator both see.
 * P-frames first so existing signatures keep their leading component and the
 * old ordering of a signature string is unchanged where no D-frame fires.
 * Exchange frames are NOT here: they do not match a single utterance, and a
 * sentence-grain consumer must reach them through their `sentence_projection`.
 */
function allSentenceMatchers() {
  return [...require('./patterns.cjs'), ...SENTENCE_FRAMES];
}

module.exports = { SENTENCE_FRAMES, EXCHANGE_FRAMES, allSentenceMatchers, D, X };
