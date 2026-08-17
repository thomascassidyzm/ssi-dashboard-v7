// _lang_hin — LANGUAGE-LEVEL known-side contract for hin-known courses.
//
// RE-EXPORT, not a copy. The hin known-side knowledge was authored as part of the
// eng_for_hin pair brief; it is grammar of hin, not of the eng↔hin pairing, so every
// hin-known course is entitled to it. One source of truth: edit eng_for_hin.contract.cjs.
//
// Precedence (see loadPairContract): a course-specific <code>.contract.cjs wins; this file
// is the fallback for every other hin-known course. eng_for_hin therefore still resolves
// to its own file — resolution for that course is unchanged.
module.exports = require('./eng_for_hin.contract.cjs');
