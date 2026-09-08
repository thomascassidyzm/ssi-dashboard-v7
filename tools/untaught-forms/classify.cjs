'use strict';
/**
 * What KIND of bend is this? The class is not decoration — it is how the reading list
 * is ranked, and the jpn_for_eng calibration measured a materially different
 * false-positive rate for each one. A raw total across all classes mixes a class that
 * reads ~30% true with one that reads ~10% true, so a single hit count is not a
 * finding and must never be quoted as one.
 *
 * The first ranking here was written a priori and the calibration CONTRADICTED it:
 * do-support was ranked last and read higher than the classes above it, because
 * "don't → doesn't" is an English PERSON inflection wearing a do-support hat. The
 * classifier below splits it, and the ranking is now the measured one.
 */
const PAST_IRREGULAR = new Set(['spoke', 'thought', 'met', 'went', 'said', 'knew', 'took', 'came',
  'got', 'made', 'saw', 'told', 'felt', 'found', 'gave', 'began', 'wrote', 'was', 'were', 'had',
  'did', "didn't", "wasn't", "weren't", "hadn't", 'ate', 'left', 'heard', 'brought', 'bought']);
const THIRD_SG = new Set(['does', "doesn't", 'is', "isn't", 'has', "hasn't"]);

function classifyDiff(taught, asked) {
  // Person before anything else: the highest-yield class, and the one the Japanese
  // known positive is made of. English marks 3rd singular where most target languages
  // mark it somewhere else entirely — or, as in Japanese desire forms, cannot mark it
  // at all without a form the course may never have taught.
  if (THIRD_SG.has(asked) && !THIRD_SG.has(taught)) return 'person';
  if (/s$/.test(asked) && !/s$/.test(taught) && !/'/.test(asked)) return 'person_or_plural';
  if (PAST_IRREGULAR.has(asked) && !PAST_IRREGULAR.has(taught)) return 'past';
  if (/ed$/.test(asked) && !/ed$/.test(taught)) return 'past';
  const neg = w => /n't$/.test(w);
  if (neg(asked) !== neg(taught)) return 'negation';
  if (/ing$/.test(asked) !== /ing$/.test(taught)) return 'ing';
  if (/'(s|ll|ve|d|re|m)$/.test(asked) || /'(s|ll|ve|d|re|m)$/.test(taught)) return 'contraction';
  return 'other';
}

// Worst-first: the order the reading list prints in, set by the calibration read and
// not by intuition.
const CLASS_RANK = ['person', 'past', 'person_or_plural', 'negation', 'other', 'ing', 'contraction', 'unseen_word'];
function rankOf(cls) { const i = CLASS_RANK.indexOf(cls); return i < 0 ? CLASS_RANK.length : i; }

module.exports = { classifyDiff, CLASS_RANK, rankOf };
