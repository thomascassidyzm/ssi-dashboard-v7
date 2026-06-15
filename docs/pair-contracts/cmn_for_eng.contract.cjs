// cmn_for_eng — the CONTROLLED-REGENERATION (v2) partition for Mandarin Chinese.
// Same language as zho_for_eng; a distinct, schema-valid course_code is used purely to
// isolate the regenerated course in its own DB partition (the zho_for_eng/_v2 forms are
// rejected by the courses.chk_course_code_format check constraint). Re-exports the ratified
// zho_for_eng pair-contract verbatim so the gated golden path applies the identical rule
// layer (gloss synonyms, NPI/free class, construction licenses, 了-contract, known_lang:'eng').
module.exports = require('./zho_for_eng.contract.cjs');
