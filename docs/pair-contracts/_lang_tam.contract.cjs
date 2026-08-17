// _lang_tam — LANGUAGE-LEVEL known-side contract for tam-known courses.
//
// RE-EXPORT, not a copy. The tam known-side knowledge was authored as part of the
// eng_for_tam pair brief; it is grammar of tam, not of the eng↔tam pairing, so every
// tam-known course is entitled to it. One source of truth: edit eng_for_tam.contract.cjs.
//
// Precedence (see loadPairContract): a course-specific <code>.contract.cjs wins; this file
// is the fallback for every other tam-known course. eng_for_tam therefore still resolves
// to its own file — resolution for that course is unchanged.
module.exports = require('./eng_for_tam.contract.cjs');
