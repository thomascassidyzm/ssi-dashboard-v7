/**
 * Canonical pattern inventory — the 31 seed FRAMES (P1-P31).
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
 *
 * NO REGEX (Tom, 2026-10-07, r-2026-10-07-never-use-regex-to-classify-language).
 * Until that ruling each frame carried a regex; the #31 French trial measured
 * them against Haiku and found them wrong both ways ("\bn't" never matched
 * "don't", complementiser "that" counted as a relative clause). The frames are
 * now DEFINED in frame-codex.json and CLASSIFIED by frame-tagger.cjs, a
 * Haiku-family model reading those definitions, cached per phrase text.
 *
 * `p.test(text)` keeps its old signature so every caller still reads the same,
 * but it is a CACHE LOOKUP: it throws for a text nobody has tagged, so a
 * caller must `await ensureTagged(texts)` (frame-tagger.cjs) before testing.
 * A silent false would score an untagged course as frameless.
 */
const { CODEX, framesOf } = require('./frame-tagger.cjs');

const P = (f) => ({
  id: f.id, name: f.name, shape: f.shape, notes: f.definition,
  test: (k) => framesOf(k).includes(f.id),
});

module.exports = CODEX.frames.map(P);
