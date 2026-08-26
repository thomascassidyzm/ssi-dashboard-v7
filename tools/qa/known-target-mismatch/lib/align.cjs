// Course-derived bilingual lexicon via Dice co-occurrence over the course's own
// parallel corpus (every known/target pair in the course). Language-agnostic:
// no dictionary, no morphology, no external resource, so it ports to any course.
const { tokens } = require('./text.cjs');

function buildLexicon(pairs) {
  const cK = new Map(), cT = new Map(), cJ = new Map();
  for (const [k, t] of pairs) {
    const ks = new Set(tokens(k)), ts = new Set(tokens(t));
    for (const a of ks) cK.set(a, (cK.get(a) || 0) + 1);
    for (const b of ts) cT.set(b, (cT.get(b) || 0) + 1);
    for (const a of ks) for (const b of ts) {
      const key = a + ' ' + b;
      cJ.set(key, (cJ.get(key) || 0) + 1);
    }
  }
  // Dice(a,b) = 2*joint / (freq_a + freq_b); keep the best few targets per known token.
  const lex = new Map();
  for (const [key, j] of cJ) {
    const sp = key.indexOf(' ');
    const a = key.slice(0, sp), b = key.slice(sp + 1);
    const dice = (2 * j) / (cK.get(a) + cT.get(b));
    if (dice < 0.10 || j < 2) continue;
    if (!lex.has(a)) lex.set(a, []);
    lex.get(a).push({ t: b, dice, j });
  }
  for (const [a, arr] of lex) {
    arr.sort((x, y) => y.dice - x.dice);
    lex.set(a, arr.slice(0, 10));
  }
  return { lex, cK, cT, n: pairs.length };
}

// A known token counts as RENDERED if any of its strong target correspondents
// appears in the target string. Prefix match absorbs inflection.
// Returns null when the lexicon has no opinion (absence of evidence, not evidence).
function rendered(lexicon, ktok, targetToks, stopTarget) {
  const all = lexicon.lex.get(ktok);
  // Too rare in the corpus for the co-occurrence lexicon to have an opinion.
  if (!all || !all.length || (lexicon.cK.get(ktok) || 0) < 3) return null;
  // Only the confident correspondents may CLEAR a word. Weak Dice tails
  // (a content word co-occurring with "los", "que", ...) clear everything and
  // were the single biggest source of false clean verdicts in calibration.
  const best = all[0].dice;
  // A token with no CONFIDENT correspondent is not judgeable. This is what
  // separates content words ("office" -> oficina, 0.99) from structural words
  // ("him", "on", "than"), whose alignment is diffuse in every language pair —
  // and it does it without a hand-written function-word list.
  if (best < (module.exports.MIN_BEST_DICE)) return null;
  const floor = Math.max(0.28, 0.45 * best);
  const cands = all.filter(c => c.dice >= floor && !(stopTarget && stopTarget.has(c.t)));
  if (!cands.length) return null;
  for (const c of cands) {
    for (const tt of targetToks) {
      if (tt === c.t) return c.dice;
      // shared stem absorbs inflection, and a clitic-suffixed target token
      // ("ayudarme" for "ayudar") still counts as a rendering
      const n = Math.min(tt.length, c.t.length);
      if (n >= 5 && tt.slice(0, n - 1) === c.t.slice(0, n - 1)) return c.dice * 0.9;
      if (c.t.length >= 5 && tt.length > c.t.length && tt.startsWith(c.t.slice(0, c.t.length - 1))) return c.dice * 0.9;
    }
  }
  return 0;
}

// How strongly the lexicon believes it knows this token's counterpart.
// A miss on a 0.96 word ("things" -> cosas) is evidence; a miss on a 0.41 word
// may just be the lexicon's limit, so the two are not scored alike.
function confidence(lexicon, ktok) {
  const all = lexicon.lex.get(ktok);
  return all && all.length ? all[0].dice : 0;
}

// Known-side BIGRAM lexicon. Whole classes of false positives come from
// idiomatic multi-word renderings — "this time" -> "esta vez", "right now" ->
// "en este momento", "someone else" -> "otra persona" — where the individual
// known token has no counterpart but the pair plainly does. Built the same
// language-agnostic way, so it ports with everything else.
function buildBigramLexicon(pairs, minFreq = 4) {
  const bigs = s => { const t = tokens(s), o = []; for (let i = 0; i + 1 < t.length; i++) o.push(t[i] + '_' + t[i + 1]); return o; };
  const cB = new Map();
  for (const [k] of pairs) for (const b of new Set(bigs(k))) cB.set(b, (cB.get(b) || 0) + 1);
  const keep = new Set([...cB.entries()].filter(x => x[1] >= minFreq).map(x => x[0]));
  const cT = new Map(), cJ = new Map();
  for (const [k, t] of pairs) {
    const ks = new Set(bigs(k).filter(b => keep.has(b))), ts = new Set(tokens(t));
    for (const b of ts) cT.set(b, (cT.get(b) || 0) + 1);
    for (const a of ks) for (const b of ts) {
      const key = a + ' ' + b;
      cJ.set(key, (cJ.get(key) || 0) + 1);
    }
  }
  const lex = new Map();
  for (const [key, j] of cJ) {
    const sp = key.indexOf(' ');
    const a = key.slice(0, sp), b = key.slice(sp + 1);
    const dice = (2 * j) / (cB.get(a) + cT.get(b));
    if (dice < 0.35 || j < 3) continue;
    if (!lex.has(a)) lex.set(a, []);
    lex.get(a).push({ t: b, dice, j });
  }
  for (const [a, arr] of lex) { arr.sort((x, y) => y.dice - x.dice); lex.set(a, arr.slice(0, 6)); }
  return { lex, cK: cB, cT, bigram: true };
}

// Is the known token at index i cleared by a bigram it belongs to?
function bigramRendered(blex, knownToks, i, targetToks) {
  if (!blex) return false;
  for (const b of [knownToks[i - 1] !== undefined ? knownToks[i - 1] + '_' + knownToks[i] : null,
                   knownToks[i + 1] !== undefined ? knownToks[i] + '_' + knownToks[i + 1] : null]) {
    if (!b) continue;
    const cands = blex.lex.get(b);
    if (!cands) continue;
    for (const c of cands) {
      for (const tt of targetToks) {
        if (tt === c.t) return true;
        const n = Math.min(tt.length, c.t.length);
        if (n >= 5 && tt.slice(0, n - 1) === c.t.slice(0, n - 1)) return true;
      }
    }
  }
  return false;
}

module.exports = { buildLexicon, buildBigramLexicon, bigramRendered, rendered, confidence, MIN_BEST_DICE: 0.40 };
