/**
 * Word-level diff for a single line of dialogue.
 *
 * The Copy area diffs whole documents and so works line by line (see the LCS in
 * CopyEditor.vue). A canonical script line IS one line, and a line-level diff of
 * one line says only "this line changed" — which the reader already knows. What
 * they are actually asking is WHICH WORDS changed, so the unit here is the word.
 *
 * Same algorithm, different token: an LCS over word tokens, walked back into a
 * run of { kind: 'same' | 'del' | 'add', text }. Whitespace is carried on the
 * token so the rendered diff reads as the sentence it came from rather than as a
 * word list, and comparison ignores that whitespace so a re-wrapped line is not
 * reported as a rewrite.
 *
 * One consequence worth naming: a matched word carries the NEW text's spacing,
 * because the single stream on screen is what the line is about to become. The
 * new text therefore reassembles byte-exactly from same+add; the old one
 * reassembles word-exactly from same+del, which is what a diff of one line is
 * for.
 *
 * Punctuation is deliberately part of the word: "yes." and "yes!" are different
 * things to say, and a diff that hid the difference would be lying about a line
 * someone is about to record.
 */

/** Split into tokens that keep their trailing whitespace, so joins are lossless. */
export function tokenise(text) {
  return String(text ?? '').match(/\S+\s*/g) || [];
}

const bare = t => t.trim();

/**
 * @param {string} before  the older text
 * @param {string} after   the newer text
 * @returns {Array<{kind:'same'|'del'|'add', text:string}>} runs, in reading order
 */
export function wordDiff(before, after) {
  const a = tokenise(before);
  const b = tokenise(after);
  const n = a.length, m = b.length;

  const lcs = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = bare(a[i]) === bare(b[j])
        ? lcs[i + 1][j + 1] + 1
        : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const out = [];
  const push = (kind, text) => {
    const last = out[out.length - 1];
    if (last && last.kind === kind) last.text += text;
    else out.push({ kind, text });
  };

  let i = 0, j = 0;
  while (i < n && j < m) {
    if (bare(a[i]) === bare(b[j])) { push('same', b[j]); i++; j++; }
    else if (lcs[i + 1][j] >= lcs[i][j + 1]) { push('del', a[i]); i++; }
    else { push('add', b[j]); j++; }
  }
  while (i < n) push('del', a[i++]);
  while (j < m) push('add', b[j++]);
  return out;
}

/** True when the two texts differ in anything but whitespace. */
export function textChanged(before, after) {
  return tokenise(before).map(bare).join(' ') !== tokenise(after).map(bare).join(' ');
}
