/**
 * Canonical English pattern inventory — matcher definitions.
 *
 * A "pattern" here is a FRAME: a shape on the KNOWN side of a seed, with slots.
 * Frame convention (used in every artefact in docs/frame-layer/):
 *   [SUBJ] [OBJ] [VP] [NP] [ADJ] [CLAUSE] [WH] [TIME]  = slots
 *   lower-case words are fixed lexical material of the frame
 *   |  = alternation inside a slot;  ...  = free material
 * e.g. P1  "[SUBJ] want(s) to [VP]"      P17 "[SUBJ]'d have [VPpp] if [SUBJ]'d [VPpp]"
 *
 * Patterns are MULTI-LABEL: one seed can instantiate several frames
 * (a question that is also a want-chain). Counts are therefore not a partition.
 *
 * P-numbers P1/P17/P18/P20/P27 are pinned to the 2026-08-29 lab sitting's usage
 * so earlier references still resolve; other ids allocated in the same series.
 */
const P = (id, name, shape, re, notes) => ({
  id, name, shape, notes: notes || '',
  // matcher may be a RegExp or a predicate over the known-side text
  test: typeof re === 'function' ? re : (k) => re.test(k),
  source: String(re),
});

module.exports = [
  P('P1',  'want-chain',            "[SUBJ] want(s)/would like to [VP]  |  [SUBJ] want(s) [SUBJ2] to [VP]",
    /\b(want|wants|wanted|'d like|would like|wouldn't like|don't want|doesn't want|didn't want)\b/i),
  P('P2',  'going-to future',       "[SUBJ] (am|is|are) going to [VP]",
    /\b(going to|gonna)\b/i),
  P('P3',  'progressive',           "[SUBJ] (am|is|are|was|were) [VPing]",
    /\b(am|i'm|is|he's|she's|it's|are|you're|we're|they're|was|were)\s+\w+ing\b/i),
  P('P4',  'modal can/could',       "[SUBJ] can|can't|could|couldn't [VP]",
    /\b(can|can't|cannot|could|couldn't)\b/i),
  P('P5',  'be able to',            "[SUBJ] ... be able to [VP]",
    /\bbe able to\b/i),
  P('P6',  'have to / need to',     "[SUBJ] (have|has|had) to [VP]  |  [SUBJ] need(s) to [VP]",
    /\b(have to|has to|had to|need to|needs to|needed to|don't have to)\b/i),
  P('P7',  'should / ought',        "[SUBJ] should|shouldn't [VP]",
    /\b(should|shouldn't|ought to)\b/i),
  P('P8',  'must / may / might',    "[SUBJ] must|may|might [VP]",
    /\b(must|mustn't|may|might)\b/i),
  P('P9',  'matrix think/believe',  "[SUBJ] think(s)/believe(s) (that) [CLAUSE]",
    /\b(think|thinks|thought|believe|believes|believed|reckon)\b/i),
  P('P10', 'matrix know/sure',      "[SUBJ] know(s)/(am|is) sure (that|if) [CLAUSE]",
    /\b(know|knows|knew|sure|certain)\b/i),
  P('P11', 'matrix hope/wish',      "[SUBJ] hope(s)/wish(es) (that) [CLAUSE]",
    /\b(hope|hopes|hoped|wish|wishes|wished)\b/i),
  P('P12', 'matrix say/tell',       "[SUBJ] said/told [OBJ] (that) [CLAUSE]",
    /\b(said|says|say|told|tell|tells|telling)\b/i),
  P('P13', 'temporal clause',       "before|after|when|while|until [CLAUSE]",
    /\b(before|after|when|while|until|as soon as|once)\b/i),
  P('P14', 'conditional if (real)', "if [CLAUSE], [CLAUSE]",
    /\bif\b/i),
  P('P15', 'because / so / but',    "[CLAUSE] because|so|but [CLAUSE]",
    /\b(because|so that|but|although|even though)\b/i),
  P('P16', 'relative clause',       "[NP] who|that|which [VP]",
    // 'that' is only relative when it is NOT the complementiser of a matrix verb,
    // and 'who' is only relative when it is not the question word opening the seed.
    (k) => /\b\w+\s+(which|whose)\b\s+\w+/i.test(k)
        || /(?<!^)(?<!\?\s)\b\w+\s+who\b\s+\w+/i.test(k)
        || /(?<!\b(?:think|thinks|thought|said|says|say|know|knows|knew|believe|believes|believed|hope|hopes|sure|certain|told|tell|tells|remember|understand|mean|means|decided|heard|feel|feels|worried|glad|happy|afraid|hoping|thinking|saying)\s)\bthat\b\s+\w+/i.test(k),
    'excludes complementiser-that and interrogative who'),
  P('P17', 'counterfactual',        "[SUBJ]'d have [VPpp] if [SUBJ]'d [VPpp]  (double-'d)",
    /('d have|would have|wouldn't have|had known|'d known|'d told|'d been)/i),
  P('P18', "It's-adjective",        "it's [ADJ] (to [VP] | that [CLAUSE])",
    /\bit(?:'s| is| was| isn't| wasn't)\s+(a |an |the )?\w+/i),
  P('P19', 'there is/are',          "there (is|are|was|were|will be) [NP]",
    /\bthere\s+(is|are|was|were|isn't|aren't|wasn't|weren't|will be|'s|'re)\b/i),
  P('P20', 'question',              "(do|did|are|is|can|would|wh-) ... ?",
    /\?/),
  P('P21', 'wh-question',           "[WH] ... ?",
    /^(what|where|when|why|who|how|which)\b|\b(what|where|when|why|who|how|which)\b[^?]*\?/i),
  P('P22', 'embedded question',     "[SUBJ] [VP] what|where|why|how [CLAUSE]",
    /\b(know|find out|remember|tell|wonder|sure|ask|explain|understand|decide)\b[^?]*\b(what|where|when|why|who|how|whether|if)\b/i),
  P('P23', 'negation',              "[SUBJ] (don't|doesn't|didn't|not|never) [VP]",
    /\b(not|n't|never|nothing|nobody|no one|nowhere)\b/i),
  P('P24', 'comparative/superlative',"more|less|-er than | the most|-est",
    /\b(more|less|better|worse|bigger|older|easier|harder|faster|than|most|best|worst)\b/i),
  P('P25', 'as ... as',             "as [ADJ] as [X]",
    /\bas\s+\w+\s+as\b/i),
  P('P26', 'imperative',            "[VP] ... !  |  bare-V opening",
    /^(don't\s+)?(please\s+)?(go|come|tell|give|take|look|listen|try|let|stop|wait|call|put|remember|think|speak|say)\b(?!.*\?)/i),
  P('P27', "what's-it-like",        "what (is|was) [NP] like?  |  it's like [CLAUSE]",
    /\bwhat(?:'s| is| was| are| were)\b[^?]*\blike\b|\b(it's|its) like\b/i),
  P('P28', 'time adjunct',          "[CLAUSE] [TIME]",
    /\b(now|today|tomorrow|yesterday|tonight|soon|later|this (morning|evening|afternoon|week|year)|next week|last night|at \w+ o'clock|always|never|sometimes|often|already|yet|still)\b/i),
  P('P29', 'perfect',               "[SUBJ] (have|has|had) [VPpp]",
    /\b(have|has|had|'ve|'s)\s+(been|done|seen|gone|made|said|told|known|driven|written|taken|got|had|finished|started|forgotten|left|eaten|found|lost|bought|read|heard|met|put|come|given|spoken)\b/i),
  P('P30', 'passive',               "[SUBJ] (is|was|were) [VPpp] (by [X])",
    /\b(is|was|were|are|been|be)\s+\w+(ed|en)\b\s+(by|in|on|at|to)\b/i),
  P('P31', 'like/enjoy (dative)',   "[SUBJ] like(s)/love(s)/enjoy(s) [NP|VPing]",
    /\b(like|likes|liked|love|loves|enjoy|enjoys|prefer|prefers|hate|hates|interested in)\b/i),
];
