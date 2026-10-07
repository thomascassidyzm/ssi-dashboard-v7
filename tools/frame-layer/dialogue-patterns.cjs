/**
 * Dialogue frame matchers — the pod corpus's frame DELTA over the seed corpus.
 *
 * Sibling of `patterns.cjs`, same `P()` idiom, same frame convention, new id
 * namespaces so provenance is readable in one character:
 *   P*  seed corpus (patterns.cjs)   D*  pod, sentence grain   X*  pod, exchange grain
 *
 * WHY A SECOND FILE AT ALL. The 31 seed matchers fire on 169 of pod-1's 231
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

/**
 * NO REGEX (Tom, 2026-10-07, r-2026-10-07-never-use-regex-to-classify-language).
 * Each frame used to carry a regex over the turn text. The frames are now
 * DEFINED in dialogue-codex.json (D, one turn) and exchange-codex.json (X, an
 * adjacent pair or triple) and CLASSIFIED by frame-tagger.cjs, a Haiku-family
 * model reading those definitions, cached per text. What stays here is DATA
 * the model never decides: position, fixed_material, shape_nodes,
 * sentence_projection, notes.
 *
 * `test(text)` / `testPair(prev, cur)` / `testTriple(prev, cur, next)` keep
 * their old signatures but are CACHE LOOKUPS that throw for untagged text, so
 * an async caller runs `ensureDialogueTagged` first (extract-dialogue-patterns
 * does). A silent false would report a cold cache as an absent frame.
 *
 * WHY X IS A SECOND CODEX, NOT MORE FRAMES IN D: the unit tagged is different.
 * D reads one turn; X reads a rendered exchange "A: <prev> || B: <cur>". In one
 * codex the model would be asked whether a single turn is a repair exchange,
 * and the cache would hold turn texts and exchange texts under one key space.
 */
const { framesOf, ensureTagged } = require('./frame-tagger.cjs');
const D_CODEX = require('./dialogue-codex.json');
const X_CODEX = require('./exchange-codex.json');
const defOf = (codex, id) => {
  const f = codex.frames.find(x => x.id === id);
  if (!f) throw new Error(`${codex.id} codex has no frame ${id}`);
  return f;
};
const blank = (t) => !String(t || '').trim();

/** Sentence-grain frame: definition from the D codex, data from here. */
const D = (id, opts = {}) => {
  const def = defOf(D_CODEX, id);
  return {
    id, name: def.name, shape: def.shape,
    grain: 'sentence',
    position: opts.position || 'either',          // initiating | response | either
    fixed_material: opts.fixed_material || [],
    shape_nodes: opts.shape_nodes || [],
    notes: opts.notes || '',
    definition: def.definition,
    test: (t) => !blank(t) && framesOf(t, D_CODEX).includes(id),
    source: `${D_CODEX.id} codex ${D_CODEX.version}`,
  };
};

/**
 * The exchange as the X codex reads it. Speakers are rendered A/B because the
 * matcher API carries texts only; a third turn (testTriple) is A again.
 */
const exchangeText = (prev, cur, next) =>
  `A: ${String(prev || '').trim()} || B: ${String(cur || '').trim()}` + (blank(next) ? '' : ` || A: ${String(next).trim()}`);

/**
 * Exchange-grain frame. `testPair(prev, cur)` is the required matcher; X1's
 * `testTriple(prev, cur, next)` tightens a three-turn shape. Both are applied
 * only WITHIN one scene — a scene boundary breaks adjacency, because two
 * unrelated conversations touching in `global_order` are not an exchange.
 */
const X = (id, opts = {}) => {
  const def = defOf(X_CODEX, id);
  const fires = (text) => framesOf(text, X_CODEX).includes(id);
  return {
    id, name: def.name, shape: def.shape,
    grain: 'exchange',
    positions: opts.positions || [],
    fixed_material: opts.fixed_material || [],
    shape_nodes: opts.shape_nodes || [],
    sentence_projection: opts.sentence_projection || null,
    notes: opts.notes || '',
    definition: def.definition,
    testPair: (prev, cur) => !blank(prev) && !blank(cur) && fires(exchangeText(prev, cur)),
    testTriple: opts.triple ? (prev, cur, next) => !blank(prev) && !blank(cur) && !blank(next) && fires(exchangeText(prev, cur, next)) : null,
  };
};

const SENTENCE_FRAMES = [
  D('D1', { position: 'either', shape_nodes: ['N1'],
    fixed_material: [['hello'], ['hi'], ['good morning'], ['good afternoon'], ['good evening'], ['goodbye'], ['bye'], ['welcome'], ['see you']],
    notes: 'the frame the seed corpus cannot attest at all: no seed opens a conversation' }),
  D('D2', { position: 'response', shape_nodes: ['N2', 'N3', 'N9'],
    fixed_material: [['yes'], ['no'], ['of course']],
    notes: 'the strongest single argument for the whole design: the particle is cut early in essentially every pair, so the response register becomes reachable at almost zero cost' }),
  D('D3', { position: 'either', shape_nodes: ['N2', 'N10'],
    fixed_material: [['thank you'], ['thanks']] }),
  D('D4', { position: 'initiating', shape_nodes: ['N2', 'N6'],
    fixed_material: [['excuse me'], ['sorry'], ["i'm sorry"]] }),
  D('D5', { position: 'response', shape_nodes: ['N2'],
    fixed_material: [['here you are'], ['here it is'], ["here's"], ['here is']],
    notes: 'the physical hand-over move; the seeds have no deixis-in-situation at all' }),
  D('D6', { position: 'response', shape_nodes: ['N5'],
    fixed_material: [['and you'], ['what about you']],
    notes: 'the sentence projection of X1. THE WORKED CASE: spa_for_eng has cut no "and you", no "y tu", no bare "tu" — so this frame is unreachable for spa at every position, and the gate must say so' }),
  D('D7', { position: 'response', shape_nodes: ['N2', 'N8'],
    fixed_material: [['lovely'], ['perfect'], ['great'], ['of course'], ['no problem']],
    notes: 'same frame carries a service uptake ("Excellent choice") and a clinical graceful-switch ("Of course, no problem at all") — which is what the register tag is for' }),
  D('D8', { position: 'initiating', shape_nodes: ['N2'],
    fixed_material: [['please']],
    notes: 'ellipsis IS the frame — "Four single tickets to town, please" has no verb and no seed looks like it' }),
  D('D9', { position: 'initiating', shape_nodes: ['N2'],
    fixed_material: [["that's"], ['that is']] }),
  D('D10', { position: 'response', shape_nodes: ['N4'],
    fixed_material: [['got it'], ['understood']],
    notes: 'mined from the health source, as the design predicted the sector sources would add: the learner says the instruction back and marks receipt' }),
  D('D11', { position: 'response', shape_nodes: ['N12'],
    fixed_material: [["don't worry"], ["that's normal"], ['not at all']] }),
  D('D12', { position: 'response', shape_nodes: ['N4'],
    fixed_material: [['i will'], ['will do'], ["i'll"]],
    notes: 'the confirm position of N4; distinct from D10 because it commits forward rather than echoing back' }),
];

// --- exchange grain ---------------------------------------------------------
const EXCHANGE_FRAMES = [
  X('X1', { positions: ['answer-plus-return', 'return-answer'],
    fixed_material: [['and you'], ['what about you']],
    sentence_projection: 'D6', shape_nodes: ['N5'], triple: true,
    notes: 'the design\'s worked case, quoted live from pod-1 SC06' }),
  X('X2', { positions: ['question', 'polar-response'],
    fixed_material: [['yes'], ['no'], ['of course']],
    sentence_projection: 'D2', shape_nodes: ['N3', 'N9'],
    notes: 'the commonest exchange in the corpus and the cheapest to make instantiable' }),
  X('X3', { positions: ['trouble-source', 'repair-initiation', 'reformulation'],
    fixed_material: [['sorry'], ["i don't understand"], ['say that again']],
    sentence_projection: 'D4', shape_nodes: ['N6'],
    notes: 'the one exchange whose whole point is that the FIRST turn failed; a sentence-grain map cannot see it' }),
  X('X4', { positions: ['instruct', 'read-back'],
    fixed_material: [['got it'], ['understood'], ['i will']],
    sentence_projection: 'D10', shape_nodes: ['N4'],
    notes: 'the safety-critical shape of the health source: the learner proves uptake by saying it back' }),
  X('X5', { positions: ['order', 'deliver'],
    fixed_material: [['here you are'], ['here it is'], ["here's"]],
    sentence_projection: 'D5', shape_nodes: ['N2'] }),
  X('X6', { positions: ['thank', 'downgrade'],
    fixed_material: [['not at all'], ['no problem'], ["you're welcome"]],
    sentence_projection: 'D11', shape_nodes: ['N10', 'N2'] }),
];

/**
 * Tag what the dialogue matchers will read: every turn against D, every
 * adjacent pair against X, and — only where X1 fired on the pair — the
 * triple that X1's testTriple reads. `exchanges` is [[prev, cur, next?], ...].
 */
async function ensureDialogueTagged({ turns = [], exchanges = [] } = {}, opts = {}) {
  const ledgers = [await ensureTagged(turns, { ...opts, codex: D_CODEX })];
  const pairs = exchanges.filter(([a, b]) => !blank(a) && !blank(b));
  ledgers.push(await ensureTagged(pairs.map(([a, b]) => exchangeText(a, b)), { ...opts, codex: X_CODEX }));
  const triples = pairs.filter(([a, b, c]) => !blank(c) && framesOf(exchangeText(a, b), X_CODEX).includes('X1'));
  ledgers.push(await ensureTagged(triples.map(([a, b, c]) => exchangeText(a, b, c)), { ...opts, codex: X_CODEX }));
  return ledgers;
}

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

module.exports = { SENTENCE_FRAMES, EXCHANGE_FRAMES, allSentenceMatchers, ensureDialogueTagged, exchangeText, D_CODEX, X_CODEX, D, X };
