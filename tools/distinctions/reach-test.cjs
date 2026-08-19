/**
 * reach-test.cjs — THE GATE. Kai's ruling, 2026-08-19:
 *
 *   "Just because the same word can be used in both ways, does not mean the
 *    learner will find the process painless."
 *
 * The question is NOT "is the target form genuinely the same?" That is a fact about
 * the language, and it is not sufficient. The question is:
 *
 *   WILL THE LEARNER REACH FOR THE THING THEY ALREADY KNOW?
 *
 * His two worked examples define the boundary, and they are the test cases below.
 *
 * WORKS — gender. Taught "she speaks" = se puhuu. Later asked for "he speaks", the
 * learner thinks: "hmm, I don't think I know that! I only know how to say she
 * speaks… I'll just say that." And it is the same. Surprise, reward, lesson learned.
 *
 * FAILS — unrelated meanings. Taught "I am learning" = dw i'n dysgu. Later asked for
 * "I am teaching" — the same Welsh word — the learner does NOT think "the closest
 * thing I know is learning". They think "I don't know that one, aaa!" That is a
 * wall, not a lesson.
 *
 * WHAT MAKES THE DIFFERENCE. In the gender case the two known-side prompts are
 * obviously neighbours FROM THE LEARNER'S SIDE — same sentence, one word different,
 * and the relationship is visible without being told. In learn/teach the two prompts
 * have no perceived relationship at all; the connection exists only in the target
 * language, which is exactly what the learner cannot yet see.
 *
 * So the test is applied to the KNOWN-SIDE prompts, in the known language, judged as
 * someone who does not yet speak the target. Two ways to be obviously neighbours:
 *   1. the differing words are forms of the SAME word (चाहता/चाहती, cansado/cansada)
 *   2. the differing words are members of one small closed paradigm the learner
 *      already holds as a set (he/she, my/your, this/that)
 * learn/teach is neither: two open-class words with different meanings that happen
 * to collide in the target.
 *
 * WHAT THIS TEST CANNOT DO, stated so nobody over-reads it. It works on surface
 * form. It cannot know meaning, so a homograph pair can pass it. Its relatedness
 * measure is affix-based, which fits suffixing and prefixing languages (Hindi,
 * Spanish, Welsh mutation) and fits templatic morphology (Arabic, Hebrew) badly.
 * For scripts written without spaces it has no tokens to align at all. In both of
 * those cases it returns 'flag' — never a confident verdict it has not earned.
 */

// Scripts written without word spaces: token alignment is meaningless there.
const UNSPACED = /[぀-ヿ㐀-鿿฀-๿가-힯]/;
// Templatic morphology: relatedness lives in a consonantal root, not in affixes.
const TEMPLATIC = /[֐-׿؀-ۿ]/;

const VERDICTS = {
  REACHES: 'reaches',
  FLAG: 'flag',
  UNREACHABLE: 'unreachable',
};

function tokens(s) {
  return (s || '')
    .replace(/[.,!?;:¡¿।॥"“”]/gu, ' ')
    .trim()
    .split(/\s+/u)
    .filter(Boolean);
}

const fold = (w) => (w || '').toLocaleLowerCase().replace(/[’']/gu, "'");

function commonPrefix(a, b) {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
  return i;
}
function commonSuffix(a, b) {
  let i = 0;
  while (i < a.length && i < b.length && a[a.length - 1 - i] === b[b.length - 1 - i]) i += 1;
  return i;
}

/**
 * Are these two words plausibly forms of the same word, judged on surface shape?
 * Deliberately generous at the edges and reported as such — the caller downgrades to
 * 'flag' rather than treating a marginal score as proof.
 */
function shareStem(a, b) {
  const x = fold(a); const y = fold(b);
  if (x === y) return { related: true, ratio: 1, how: 'identical' };
  const longest = Math.max(x.length, y.length);
  if (longest < 3) return { related: false, ratio: 0, how: 'too-short-to-judge' };

  const pre = commonPrefix(x, y);
  // Welsh initial mutation (dysgu/ddysgu), Irish (bord/bhord): retry the prefix
  // measure with one leading letter dropped on either side.
  const mut = Math.max(commonPrefix(x.slice(1), y), commonPrefix(x, y.slice(1)));
  const suf = commonSuffix(x, y);

  const ok = (n) => n / longest >= 0.5 && n >= 3;
  if (ok(pre)) return { related: true, ratio: +(pre / longest).toFixed(2), how: 'shared-stem' };
  if (ok(mut)) return { related: true, ratio: +(mut / longest).toFixed(2), how: 'initial-mutation' };
  // A shared ENDING is not a shared word. In the suffixing languages that dominate
  // this estate the stem is the front of the word, so sostener/mantener share an
  // inflection and nothing else — two different verbs that a suffix measure calls
  // relatives. Real false positive, spa_for_eng "can you hold this". Reported as
  // weak evidence so the caller can flag it instead of asserting a verdict.
  if (ok(suf)) return { related: true, weak: true, ratio: +(suf / longest).toFixed(2), how: 'shared-ending-only' };
  return { related: false, ratio: +(Math.max(pre, mut, suf) / longest).toFixed(2), how: 'unrelated' };
}

/**
 * How much of the shorter prompt's material survives in the longer one, ignoring
 * order, counting a stem match as a hit. Word ORDER is not what makes two prompts
 * look like neighbours — "you started to practice" and "did you start to practice?"
 * are obviously the same material to an English speaker, and a positional diff calls
 * them unrelated. Found on cym_s_for_eng, where the Welsh answers a statement and its
 * question with one form.
 */
function materialOverlap(ta, tb, related = (a, b) => shareStem(a, b).related) {
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  const pool = long.map(fold);
  let hits = 0;
  for (const w of short) {
    const i = pool.findIndex((p) => p === fold(w) || related(p, w));
    if (i >= 0) { hits += 1; pool.splice(i, 1); }
  }
  return short.length ? hits / short.length : 0;
}

/** Members of one closed paradigm the learner already holds as a set. */
function sameParadigm(a, b, paradigms) {
  for (const [name, set] of Object.entries(paradigms || {})) {
    const members = new Set(set.map(fold));
    if (members.has(fold(a)) && members.has(fold(b))) return name;
  }
  return null;
}

/**
 * Compare two prompts IN THE SAME LANGUAGE and judge whether a learner who knows one
 * would reach for it when asked the other.
 *
 * opts.paradigms   closed sets for that language (see axes.cjs)
 * opts.axisPairs   Set of "a|b" strings known to be inflectional variants on a
 *                  configured axis. These are the strongest possible evidence: the
 *                  pair is related BY CONSTRUCTION, not by a surface guess.
 * opts.hasFrame    false for bare fragments/components, where there is no shared
 *                  sentence to make the relationship visible.
 */
function reachTest(a, b, opts = {}) {
  const { paradigms = {}, axisPairs = new Set(), hasFrame = true } = opts;
  const out = (verdict, reason, extra = {}) => ({ verdict, reason, ...extra });

  if (fold(a) === fold(b)) return out(VERDICTS.FLAG, 'the two prompts are the same text');

  if (UNSPACED.test(a) || UNSPACED.test(b)) {
    return out(VERDICTS.FLAG, 'unspaced script — there are no tokens to align, so this '
      + 'needs a human who reads the language');
  }

  const ta = tokens(a); const tb = tokens(b);

  // One predicate for "these two words are forms of one another", used both for the
  // single-substitution verdict and for the material-overlap fallback. Configured
  // morphology counts here: Devanagari words are short enough that a shared-affix
  // measure alone misses था/थी, which the table already knows is one pair.
  const related = (x, y) => axisPairs.has([fold(x), fold(y)].sort().join('|'))
    || !!sameParadigm(x, y, paradigms)
    || shareStem(x, y).related;
  const overlap = () => materialOverlap(ta, tb, related);

  // Same length: look for a single substitution — the minimal-pair shape.
  if (ta.length === tb.length) {
    const diffs = [];
    for (let i = 0; i < ta.length; i += 1) if (fold(ta[i]) !== fold(tb[i])) diffs.push(i);

    if (diffs.length === 1) {
      const [wa, wb] = [ta[diffs[0]], tb[diffs[0]]];
      const key = [fold(wa), fold(wb)].sort().join('|');
      if (axisPairs.has(key)) {
        return out(VERDICTS.REACHES,
          `minimal pair: identical sentence, and ${wa}/${wb} are forms of one word on a `
          + 'configured distinction — the learner sees the relationship without being told',
          { differing: [wa, wb], evidence: 'configured-axis-pair' });
      }
      const para = sameParadigm(wa, wb, paradigms);
      if (para) {
        return out(VERDICTS.REACHES,
          `minimal pair: identical sentence, and ${wa}/${wb} belong to the ${para} set, `
          + 'which the learner already holds as a group',
          { differing: [wa, wb], evidence: `paradigm:${para}` });
      }
      const stem = shareStem(wa, wb);
      if (stem.related && stem.weak) {
        return out(VERDICTS.FLAG,
          `${wa}/${wb} share only an ENDING (${stem.ratio}), which in a suffixing language `
          + 'is shared inflection rather than a shared word — a human should say whether '
          + 'these are two forms of one thing or two different things',
          { differing: [wa, wb], evidence: 'shared-ending-only' });
      }
      if (stem.related) {
        if (TEMPLATIC.test(wa) || TEMPLATIC.test(wb)) {
          return out(VERDICTS.FLAG,
            `${wa}/${wb} look related by affix, but this script's morphology lives in a `
            + 'consonantal root — a surface measure has not earned a verdict here',
            { differing: [wa, wb], evidence: `${stem.how}:${stem.ratio}` });
        }
        if (!hasFrame) {
          return out(VERDICTS.FLAG,
            `${wa}/${wb} share a stem, but this is a bare fragment with no sentence around `
            + 'it, so there is no frame making the relationship visible',
            { differing: [wa, wb], evidence: `${stem.how}:${stem.ratio}` });
        }
        return out(VERDICTS.REACHES,
          `minimal pair: identical sentence, and ${wa}/${wb} are surface forms of the same `
          + `word (${stem.how}, ${stem.ratio})`,
          { differing: [wa, wb], evidence: `${stem.how}:${stem.ratio}` });
      }
      return out(VERDICTS.UNREACHABLE,
        `${wa} and ${wb} are unrelated words on the learner's side. The connection exists `
        + 'only in the target language, which is exactly what the learner cannot see yet — '
        + 'this is the learn/teach shape, a wall rather than a lesson',
        { differing: [wa, wb], evidence: 'no-surface-relation' });
    }

    if (diffs.length === 0) return out(VERDICTS.FLAG, 'prompts differ only in punctuation or case');

    // More than one substitution. Agreement often forces several words to change
    // together (मैं थका हुआ हूँ → मैं थकी हुई हूँ), which is still one distinction.
    const each = diffs.map((i) => related(ta[i], tb[i]));
    if (each.every(Boolean) && diffs.length <= 3) {
      return out(VERDICTS.REACHES,
        `${diffs.length} words differ but each is a form of its counterpart — one `
        + 'distinction propagating through agreement, not several changes',
        { differing: diffs.map((i) => `${ta[i]}/${tb[i]}`), evidence: 'agreement-chain' });
    }
    if (overlap() >= 0.7) {
      return out(VERDICTS.FLAG,
        `${diffs.length} words differ but the prompts are built from the same material — `
        + 'a human should decide whether these read as neighbours',
        { differing: diffs.map((i) => `${ta[i]}/${tb[i]}`), evidence: 'same-material' });
    }
    return out(VERDICTS.UNREACHABLE,
      `${diffs.length} words differ and the prompts share little material — a learner has `
      + 'no reason to see them as versions of one another',
      { differing: diffs.map((i) => `${ta[i]}/${tb[i]}`) });
  }

  // Different lengths: an insertion or deletion. Never confidently reachable, never
  // confidently not — the middle ground the brief asks to be flagged, not guessed.
  const shorter = ta.length < tb.length ? ta : tb;
  const longer = ta.length < tb.length ? tb : ta;
  const kept = shorter.filter((t) => longer.some((u) => fold(u) === fold(t))).length;
  if (longer.length - shorter.length <= 2 && kept === shorter.length) {
    return out(VERDICTS.FLAG,
      'same sentence with a word added or dropped — whether that reads as the same '
      + 'question is a judgement about the language, not about form',
      { evidence: 'insertion-deletion' });
  }
  if (overlap() >= 0.7) {
    return out(VERDICTS.FLAG,
      'the prompts are built from the same material, reordered or re-inflected (a '
      + 'statement and its question, typically) — related enough that a human should '
      + 'decide rather than a heuristic',
      { evidence: 'same-material-reordered' });
  }
  return out(VERDICTS.UNREACHABLE,
    'the two prompts are not the same sentence — a learner has no reason to see them as '
    + 'versions of one another',
    { evidence: 'different-sentences' });
}

module.exports = {
  reachTest, VERDICTS, tokens, shareStem, sameParadigm,
};
