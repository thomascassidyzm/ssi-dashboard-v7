// Adjudicated-correct exceptions for the language-name-contamination detectors.
//
// A row listed here IS a true positive for the raw pattern match (a foreign
// language name really does sit in the text) but has been researched and
// judged NOT a defect. Detectors must still report the row — as ADJUDICATED,
// not silently drop it — so a future reader sees the judgement instead of a
// hole. Do not delete an entry without re-doing the research that added it.
//
// Shape: one entry per (course_code, name) pair. `name` matches the token
// the detector's own pattern captured (see scan5.cjs's NAMES alternation).
module.exports = [
  {
    course_code: 'cym_for_yor',
    name: 'Welsh',
    reason: 'Yoruba has no nativised word for Welsh, so the English name "Welsh" is the ' +
      'correct and only usable form. Wiktionary\'s Yoruba language-name category has exactly ' +
      'eleven members and Welsh is not among them; neither the Wales nor the Welsh translation ' +
      'table carries a Yoruba line. The published Yoruba loan-adaptation rules (Kenstowicz, ' +
      'ACAL 35, 2006) reject both candidate nativised spellings — one preserves an English ' +
      'sibilant Yoruba always remaps, the other preserves a consonant cluster the Yoruba ' +
      'syllable template forbids. A rules-derived candidate exists but was deliberately not ' +
      'recommended: deriving a spelling no Yoruba writer has ever used is invention, not evidence.',
    doc: 'https://watson-1.tail4968cb.ts.net/d/0d8882fb',
    adjudicated: '2026-08-19',
  },
];
