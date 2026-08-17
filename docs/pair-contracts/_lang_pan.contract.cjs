// _lang_pan — LANGUAGE-LEVEL known-side contract for pan-known courses.
//
// RE-EXPORT, not a copy. The pan known-side knowledge was authored as part of the
// eng_for_pan pair brief; it is grammar of pan, not of the eng↔pan pairing, so every
// pan-known course is entitled to it. One source of truth: edit eng_for_pan.contract.cjs.
//
// Precedence (see loadPairContract): a course-specific <code>.contract.cjs wins; this file
// is the fallback for every other pan-known course. eng_for_pan therefore still resolves
// to its own file — resolution for that course is unchanged.
module.exports = require('./eng_for_pan.contract.cjs');
