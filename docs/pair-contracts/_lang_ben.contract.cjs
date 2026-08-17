// _lang_ben — LANGUAGE-LEVEL known-side contract for ben-known courses.
//
// RE-EXPORT, not a copy. The ben known-side knowledge was authored as part of the
// eng_for_ben pair brief; it is grammar of ben, not of the eng↔ben pairing, so every
// ben-known course is entitled to it. One source of truth: edit eng_for_ben.contract.cjs.
//
// Precedence (see loadPairContract): a course-specific <code>.contract.cjs wins; this file
// is the fallback for every other ben-known course. eng_for_ben therefore still resolves
// to its own file — resolution for that course is unchanged.
module.exports = require('./eng_for_ben.contract.cjs');
