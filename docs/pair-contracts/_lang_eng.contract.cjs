// _lang_eng — LANGUAGE-LEVEL known-side contract for English-known courses.
//
// RE-EXPORT of the long-standing _default_eng scaffold, so that English resolution under
// the new language-keyed resolver is byte-identical to what it was before 2026-08-17.
// Every *_for_eng course without its own contract resolved to _default_eng then, and
// resolves to the same object (via this file) now.
module.exports = require('./_default_eng.contract.cjs');
