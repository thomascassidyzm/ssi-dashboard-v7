// _lang_guj — LANGUAGE-LEVEL known-side contract for guj-known courses.
//
// RE-EXPORT, not a copy. The guj known-side knowledge was authored as part of the
// eng_for_guj pair brief; it is grammar of guj, not of the eng↔guj pairing, so every
// guj-known course is entitled to it. One source of truth: edit eng_for_guj.contract.cjs.
//
// Precedence (see loadPairContract): a course-specific <code>.contract.cjs wins; this file
// is the fallback for every other guj-known course. eng_for_guj therefore still resolves
// to its own file — resolution for that course is unchanged.
module.exports = require('./eng_for_guj.contract.cjs');
