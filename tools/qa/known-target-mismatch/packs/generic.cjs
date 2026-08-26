// Fallback pack for a language we have no pack for.
// Clause structure still comes from punctuation and from the course-derived
// lexicon; tense signals are simply UNAVAILABLE and are reported as such
// rather than guessed. A course run under this pack loses the tense signal
// but keeps content-completeness, which is the dominant defect shape.
module.exports = { CONNECTIVES: new Set(), tenses: () => null, code: 'generic' };
