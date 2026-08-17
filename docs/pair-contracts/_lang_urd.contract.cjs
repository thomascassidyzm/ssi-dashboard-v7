// _lang_urd — LANGUAGE-LEVEL known-side contract for urd-known courses.
//
// RE-EXPORT, not a copy. The urd known-side knowledge was authored as part of the
// eng_for_urd pair brief; it is grammar of urd, not of the eng↔urd pairing, so every
// urd-known course is entitled to it. One source of truth: edit eng_for_urd.contract.cjs.
//
// Precedence (see loadPairContract): a course-specific <code>.contract.cjs wins; this file
// is the fallback for every other urd-known course. eng_for_urd therefore still resolves
// to its own file — resolution for that course is unchanged.
module.exports = require('./eng_for_urd.contract.cjs');
