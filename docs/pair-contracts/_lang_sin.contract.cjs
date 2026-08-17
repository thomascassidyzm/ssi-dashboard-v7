// _lang_sin — LANGUAGE-LEVEL known-side contract for sin-known courses.
//
// RE-EXPORT, not a copy. The sin known-side knowledge was authored as part of the
// eng_for_sin pair brief; it is grammar of sin, not of the eng↔sin pairing, so every
// sin-known course is entitled to it. One source of truth: edit eng_for_sin.contract.cjs.
//
// Precedence (see loadPairContract): a course-specific <code>.contract.cjs wins; this file
// is the fallback for every other sin-known course. eng_for_sin therefore still resolves
// to its own file — resolution for that course is unchanged.
module.exports = require('./eng_for_sin.contract.cjs');
