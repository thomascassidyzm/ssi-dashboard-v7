// _known_kan — KNOWN-SIDE BRIEF for the Kannada known-side agent. FIRST PASS (2026-08-18), ratified:null.
// LANGUAGE-LEVEL contract: the loader falls back to this file for EVERY course whose KNOWN/prompt
// language is Kannada. Today that is exactly one course, eng_for_kan (English target, 668 seeds,
// released), and every number below is measured on it.
// Authored by an Opus agent from the real eng_for_kan corpus. RULE (Tom): no regex for language —
// this is the agent's reference knowledge, NOT a regex gate config. The known-side check is an agent
// that reads this brief + the introduced-vocab list + the prompt and judges. See
// docs/course-optimization/eng-for-x-known-side-pilot.md, and the three calibration fixes from that
// pilot are already applied here (a real npiLicensing rule with 9 environments; every high-frequency
// function word explicitly placed in freeClass or knownConstructions, or named in the honest-gap list
// at the bottom of this header with the reason it could not be placed).
//
// ⚠ NOT TO BE CONFUSED WITH docs/pair-contracts/kan_for_eng.contract.cjs. That file exists but its
// known_lang is 'eng' — there Kannada is the TARGET and English is the prompt. It says nothing about
// Kannada as a known language and must never be loaded as one.
//
// ── WHAT WAS READ ────────────────────────────────────────────────────────────────────
// Pulled live from Supabase 2026-08-18 (read-only; nothing in this job wrote to the DB):
//   course_legos.known_text            1,554 rows →  3,389 tokens / 1,284 types
//   course_legos.components[].known    2,325 entries → 2,532 tokens /  984 types
//   course_practice_phrases.known_text 14,230 rows → 55,083 tokens / 1,699 types
//   course_seeds.known_text              668 rows →  4,079 tokens / 1,292 types
// Union of lego + component types (the "introduced" inventory the gate matches against): 1,325.
// Frequencies quoted below are PHRASE-corpus token counts (the 55,083), because the phrase layer is
// what the gate reads most of; "S<n>" is the seed at which a form first appears as a lego or an
// M-lego component, i.e. its debut. Tokenised with a Unicode \p{L}\p{M}+ scanner, never with `\b`:
// JS `\b` is defined over [A-Za-z0-9_] and never fires between two Kannada letters, so any
// `\b`-anchored probe of this corpus returns a meaningless zero.
//
// ── TYPOLOGY, AND WHAT IT MEANS FOR THE GATE ─────────────────────────────────────────
// Kannada (kan) is Dravidian — same family as Tamil, so eng_for_tam.contract.cjs is the nearest
// model and the parallels below are drawn deliberately, but nothing here is copied from it: every
// classification was re-derived from this corpus. Kannada is agglutinative, head-final (SOV),
// pro-drop, nominative-accusative (NOT ergative), written in an abugida with ordinary word spacing.
// Case is a stack of bound suffixes on the noun; tense + person + number + gender + polarity are
// fused into one clause-final finite verb. Three pressures dominate this pair:
//
//   1. FUSION, and it is the whole story for `morphology`. ಮಾಡು 'do' surfaces as ಮಾಡಬೇಕು
//      'want/must do', ಮಾಡೋಕೆ 'to do' (201), ಮಾಡೋದು 'doing' (88), ಮಾಡ್ತೀನಿ 'I do' (55),
//      ಮಾಡ್ತಿದ್ದೀರಿ 'you are doing' (54), ಮಾಡಿದ್ದೇನೆ "I've done" (23), ಮಾಡಬಹುದು 'can do' (41),
//      ಮಾಡಲಿಲ್ಲ "didn't do". Those are eight unrelated strings to an exact-form matcher and one
//      lexeme to a learner. Measured: 3.10% of phrase tokens (1,710 of 55,083) are either never
//      introduced or used before their debut seed, and reading the list by hand, the clear majority
//      are a fused tense/aspect/polarity form of a lexeme that HAS debuted in some other form
//      (ಹೇಳಬೇಕು 39× before its S170 debut while ಹೇಳೋಕೆ / ಹೇಳಿದೆ are long since taught). This is
//      exactly the case `morphology: 'agglutinative'` exists for: on exact-form failure the gate may
//      NOT call a violation, and if stem containment cannot settle it, the honest outcome is
//      UNCHECKED(morphology_unresolved).
//
//   2. DATIVE SUBJECTS. Experiencers, wanters, knowers and possessors go in the DATIVE, with no
//      nominative subject at all. ನನಗೆ is the commonest token in the entire corpus (2,551) because
//      "I want", "I know", "I feel", "I have" and "I don't have" are all ನನಗೆ frames, while ನಾನು
//      (1,516) is the nominative for ordinary agentive verbs. English uses a nominative subject for
//      every one of them, so the case alternation is completely invisible on the English side and
//      ನಾನು and ನನಗೆ are one English 'I'.
//
//   3. SPOKEN REGISTER THROUGHOUT. This course is authored in colloquial Kannada, not the literary
//      register: ಮಾಡೋಕೆ not ಮಾಡುವುದಕ್ಕೆ, ಹೇಳ್ತೀನಿ not ಹೇಳುತ್ತೇನೆ, ಆಗಲ್ಲ not ಆಗುವುದಿಲ್ಲ, -ದ್ರೆ not
//      -ದರೆ, -ನ್ನ not -ನ್ನು, ಅಂತ not ಎಂದು (ಎಂದು scores 3 in 55,083 tokens; ಅಂತ scores 1,872). Any
//      external word list built from literary Kannada will not match this corpus. The register is a
//      choice, not an error, and must be held constant: mixing a spoken and a literary form of the
//      same lexeme is a live ZUT hazard (two known prompts, one English answer).
//
// ── WHY stemStrip IS EMPTY, MEASURED RATHER THAN ASSERTED ────────────────────────────
// The Bengali brief ships a real stemStrip because stripping -কে/-র/-টা there is safe and rewarded.
// I tested the same question here instead of assuming, with the obvious Kannada candidate list
// (-ಗಿಂತ, -ದಲ್ಲಿ/-ನಲ್ಲಿ/-ಯಲ್ಲಿ/-ಲ್ಲಿ, -ಗಳನ್ನ/-ಗಳಿಗೆ/-ಗಳು, -ವನ್ನ/-ನ್ನು/-ನ್ನ, -ಕ್ಕೆ/-ಇಗೆ/-ಗೆ,
// -ದಿಂದ/-ಇಂದ, -ವು). Two numbers decide it:
//   • REWARD. Exact-form match of phrase tokens against the introduced inventory is ALREADY 98.0%
//     (53,969 / 55,083). Stripping the full candidate list recovers 27 more types / 72 more tokens
//     — 0.13% of the corpus. There is almost nothing to win, because the corpus's real matching
//     problem is verbal fusion, which no end-strip touches: ಮಾಡ್ತೀನಿ minus -ತೀನಿ is ಮಾಡ್, a bare
//     consonant with a virama, not a word, and never the form that debuted.
//   • DAMAGE. 86 introduced tokens end in one of those suffixes and strip onto a DIFFERENT
//     introduced token. Two of them are catastrophic rather than merely noisy: ಇಲ್ಲಿಂದ 'from here'
//     strips to ಇಲ್ಲ, the negative existential 'there isn't / no', and ಅಲ್ಲಿಗೆ 'to there' strips to
//     ಅಲ್ಲ, the nominal negator 'is not'. A stripper would silently turn a locative adverb into a
//     negation marker, and the NPI machinery in this same file keys off exactly those two words.
//     The rest are pseudo-suffixes, and they are high-frequency: ಹೇಗೆ 'how' (101) → ಹೇ, ಹಾಗೆ 'so'
//     (124) → ಹಾ, ಬಗ್ಗೆ 'about' (285) → ಬಗ್, ಬೆಳಿಗ್ಗೆ 'morning' (239), ಕೆಲವು 'some' (120), ನನ್ನ
//     'my' (417), ತನ್ನ (83), ಚೆನ್ನ (46). None of those endings is a suffix; they are just how the
//     word is spelt.
// 0.13% reward against a rule that maps 'from here' onto 'not' is not a trade worth taking, so
// stemStrip ships EMPTY and this is a positive answer, not a shrug: on this corpus, naive
// suffix-stripping is measurably wrong. Kannada lemma recovery has to be morphological (or agentic),
// not string-terminal. stemMinLen is therefore inert; it is set to 4 CODE POINTS (≈2 aksharas —
// ಇಲ್ಲ is 4 code points and 2 aksharas) as the floor to use if anyone ever does add an affix here.
// Note that even a floor of 4 would not have blocked ಇಲ್ಲಿಂದ → ಇಲ್ಲ; length is not the guard.
// One consequence to hold onto: with stemStrip empty, `morphology: 'agglutinative'` is the ONLY
// thing standing between this course and a wave of false violations. Do not let a future tuning pass
// quietly demote it to 'fusional'-with-stripping and call the resulting hits findings.
//
// ── ZWNJ: A REAL TOKENISATION DISTORTION IN THIS CORPUS ──────────────────────────────
// 737 of the 15,784 lego+phrase rows carry U+200C ZERO WIDTH NON-JOINER between a Latin-script
// loanword and its Kannada case suffix. ZWNJ is neither \p{L} nor \p{M}, so any Unicode tokeniser
// SPLITS there: ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ "in English" → ["ಇಂಗ್ಲಿಷ್", "ನಲ್ಲಿ"]. The stranded tails, counted
// across the whole corpus, are ನಲ್ಲಿ (635), ಳ (30), ಗೆ (26), ಕೇಸ್ (17), ಬಾಲ್ (16), ಕಾರ್ಡ್ (15),
// ಗಿಂತ (1), ನ (1). That manufactures ~700 standalone bare-case-suffix tokens that do not otherwise
// exist in written Kannada, and ನಲ್ಲಿ lands at rank 10 in the frequency table purely because of it.
// ನಲ್ಲಿ, ಗೆ and ಗಿಂತ are therefore in the free class — not because Kannada writes them separately,
// but because this corpus's ZWNJ makes the tokeniser see them separately, and a locative or dative
// marker is glue under either analysis. ಕೇಸ್ / ಬಾಲ್ / ಕಾರ್ಡ್ are loanword STEMS split off their
// suffixes and are left out: they are content. The bare graphemes ನ (1) and ಳ (30) are left out too
// — they are fragments of a suffix rather than morphemes, and freeing a single grapheme would mask
// real tokens.
//
// ── THE TELUGU-VOWEL CORRUPTION: LARGELY REPAIRED, ONE ROW LEFT ──────────────────────
// A 2026-08-17 sweep recorded 12 distinct tokens / 58 occurrences across 51 eng_for_kan phrase rows
// whose final -u vowel sign was the TELUGU U+0C41 ు instead of the Kannada U+0CC1 ು — visually near
// identical, so invisible on the page, and unmatchable by any known-side check. I re-ran that probe
// by codepoint range (Telugu U+0C00–U+0C7F vs Kannada U+0C80–U+0CFF) over everything I pulled today.
// RESULT: 0 Telugu codepoints in 14,230 phrase known_text rows, 0 in 1,554 lego known_text rows,
// 0 in 668 seed known_text rows — the phrase-side corruption is repaired. ONE survivor remains, in a
// place the earlier sweep did not look: lego S0302L04 (seed 302), components[] entry
//   { known: "ಅವಳು ಹೇಳಿದಳు", target: "she said" }
// where ಹೇಳಿದಳు ends in U+0C41. This is a corrupt string, not a variant. It is REPORTED here and NOT
// fixed — this job is read-only against the DB, and any repair is a known_text edit that would null
// or relink the row's audio, so it goes through the audio-first sequencing in
// docs/architecture/AUDIO_PIPELINE_ARCHITECTURE.md §6b. Do NOT "fix" it by adding the corrupt
// spelling to the free class. Also do not treat this file's silence on Telugu as a clean bill: if
// Telugu-script characters ever appear in Kannada known_text again, report them as corruption, never
// classify them as vocabulary.
//
// ── TOKENS I COULD NOT CONFIDENTLY CLASSIFY, AND WHY ─────────────────────────────────
// These are in NEITHER freeClass nor knownConstructions, on purpose. Guessing here would either
// mask a real breach or manufacture one.
//   • ಮೊದಲು (145, S25) — 'before' / 'first'. Both a postposition and a temporal adverb, and in this
//     corpus it occurs only inside the frozen M-chunk ಹೋಗಬೇಕಾಗೋ ಮೊದಲು "before I have to go". I
//     cannot tell from the corpus whether it is productive glue or bound to that carrier, so
//     per-carrier licensing is safer than an always-free classing. Same for ಮುಂಚೆ (23).
//   • ಆಗ (43) — 'then'. Attested both as the temporal adverb 'then' (S490 ಆಗ | "then") and as the
//     bare imperative of ಆಗು 'become' (S397 ಸಿದ್ಧ ಆಗ | "get ready"). One string, one function word
//     reading and one verb reading; genuinely ambiguous without a speaker.
//   • ಸರಿ (86, S141) — glossed 'okay' in ಸರಿ ಇದೆ | "is okay". Reads as a predicate adjective here,
//     not the discourse particle 'right/okay' it can be elsewhere. Left as content.
//   • ಆಯ್ತು (69) — I checked this one specifically, because an earlier pass called it a discourse
//     particle. It is not, in this corpus: every occurrence I read is the past of ಆಗು inside a
//     compound predicate (ಅರ್ಥ ಆಯ್ತು "I understand", ಸಮಯ ಆಯ್ತು "it's time"). Verbal, so content.
//   • ತಾನೆ (27, S224) — likewise re-checked. Not a tag particle here: it occurs only in ಈಗ ತಾನೆ
//     "just (now)" (ಅವನು ಈಗ ತಾನೆ ಕಲಿಯೋಕೆ ಶುರು ಮಾಡಿದ್ದಾನೆ | "he's just started to learn"). An
//     adverbial collocation, not free-standing machinery. Beware also that the string ತಾನೆ appears
//     far more often INSIDE the 3sg agreement ending -ತ್ತಾನೆ (ಮಾಡ್ತಾನೆ 'he does') — a substring
//     count of ತಾನೆ is meaningless.
//   • ಇಲ್ಲದೆ (33, S540) — 'without'. A privative negative converb (ಕಾರ್ ಇಲ್ಲದೆ | "without the
//     car"). It CONTAINS the negator ಇಲ್ಲ but is not a clausal negation, so freeing it or listing it
//     as negation would both be wrong; it is described in the negation construction instead.
//   • ಸಾಧ್ಯವಾದಷ್ಟು (79, S3) 'as much as possible' and ಸಾಕಷ್ಟು (48) 'enough' — both occur only inside
//     comparative M-chunks (ನನ್ನಿಂದ ಸಾಧ್ಯವಾದಷ್ಟು | "as hard as I can"), which are first-person-bound.
//   • Deictic and directional adverbs are OUT of the free class even though they behave like glue,
//     because each has a real debut seed and freeing them would silently license an untaught frame:
//     ಇಲ್ಲಿ (293, S34), ಅಲ್ಲಿ (129, S157), ಹೊರಗೆ (53, S215), ಕೆಳಗೆ (41, S487), ಒಳಗೆ (9, S498),
//     ಕಡೆ (26, S488), ಆಮೇಲೆ (61, S16). Same reasoning for the very high-frequency temporals
//     ಇವತ್ತು (971), ಈಗ (903), ಮುಂದಿನ (345), ಭಾನುವಾರ (281): frequent, but taught.
//   • ಪರವಾಗಿಲ್ಲ (44, S41) sits in neither list and gets its own gloss rule: it CONTAINS -ಇಲ್ಲ but
//     glosses POSITIVELY ("I feel okay"). Any substring negation test reads it as negated, which
//     happens to be harmless for NPI licensing but is the wrong reason, and an agent must not cite
//     it as evidence of negation.
//   • ಯಾರಾದರೂ 'someone/anyone' — expected in the free-choice series and scores ZERO as a standalone
//     token in all 15,784 rows. The corpus fills that slot with ಒಬ್ಬರು (24, S133/S236, "I know
//     someone") and with -ಆದರೂ on the postposition instead of the wh-word (ಬೇರೆ ಯಾರ ಜೊತೆಯಾದರೂ |
//     "with someone else", S5). Recorded rather than assumed.
//   • The familiar 2sg ನೀನು / ನಿನಗೆ / ನಿನ್ನ scores ZERO as a standalone token in all 15,784 rows.
//     'you' is uniformly honorific ನೀವು (908) / ನಿಮಗೆ (857), exactly as Tamil நீங்கள். There is no
//     register split to model — but that is a fact about THIS course, and a second kan-known course
//     could introduce one, at which point it becomes a new construction, never a silent variant.
//
// ── HOW TO READ A SWEEP OF THIS CONTRACT ─────────────────────────────────────────────
// Every exact-form finding on a Kannada known side is TRIAGE, not a verdict. The gate is
// seed-granular, so an intra-seed ordering violation passes clean and still needs a human. Expect
// most "unknown gloss" hits to be (a) a verb in a fused tense/aspect/polarity form other than the
// one that debuted, (b) a case-stacked form of an introduced noun, (c) a ZWNJ artefact, or (d) a
// spoken-register form of a literary one. Only (e) — a genuinely new lexeme — is a real finding, and
// on the 2026-08-18 measurement it is the minority of the 3.10%.
module.exports = {
  course_code: '_known_kan',
  ratified: null,
  known_lang: 'kan',
  known_lang_name: 'Kannada',
  is_known_default: true,

  // ── Tokenizer / outcome machinery ──────────────────────────────────────────────────
  script: 'Knda',            // ISO 15924. Kannada block U+0C80–U+0CFF. See the Telugu note above:
                             // U+0C00–U+0C7F appearing in a kan known_text is CORRUPTION, not script.
  segmentation: 'space',     // Kannada is written with ordinary word spacing. Caveat: ZWNJ (U+200C)
                             // in 737 rows splits loanword+suffix compounds into two tokens; see
                             // header. Do not "fix" that by switching to 'dictionary'.
  morphology: 'agglutinative', // Load-bearing. Exact-form failure is NOT a violation here; fall back
                             // to stem containment, and where that is inconclusive emit
                             // UNCHECKED(morphology_unresolved). See the fusion paragraph above.
  stemStrip: [],             // DELIBERATELY EMPTY, and measured: +0.13% recall against a rule that
                             // strips ಇಲ್ಲಿಂದ 'from here' onto ಇಲ್ಲ 'not'. Full working in header.
  stemMinLen: 4,             // Code points (≈2 aksharas). Inert while stemStrip is empty; this is
                             // the floor to use if an affix is ever added. Length is not the guard.

  // ── Free class ─────────────────────────────────────────────────────────────────────
  // Kannada closed-class function words, corpus-derived from the eng_for_kan phrase prompts. EVERY
  // entry below was verified to occur as a standalone token in this corpus — candidates that scored
  // zero (ನೀನು / ನಿನಗೆ / ನಿನ್ನ, ಯಾರಾದರೂ, ಯಾವ, ಯಾವುದೇ, ಅಷ್ಟು, ಎಂಬ, ಸಹ, ಬಳಿ, ವರೆಗೆ, ಎಲ್ಲರೂ) were
  // dropped rather than carried on intuition. Pronouns are listed in every case form the corpus
  // attests, because with stemStrip empty nothing can relate ನಾನು to ನನಗೆ to ನನ್ನನ್ನ.
  freeClass: [
    // personal + demonstrative pronouns, nominative
    'ನಾನು', 'ನಾವು', 'ನೀವು', 'ನೀವೆಲ್ಲ', 'ಅವನು', 'ಅವಳು', 'ಅವರು', 'ಅದು', 'ಇದು', 'ತಾನು',
    // dative (-ಗೆ) — the case of experiencers, wanters, knowers and possessors
    'ನನಗೆ', 'ನಮಗೆ', 'ನಿಮಗೆ', 'ಅವನಿಗೆ', 'ಅವಳಿಗೆ', 'ಅವರಿಗೆ', 'ನೀವೆಲ್ಲರಿಗೆ',
    // accusative (-ನ್ನ, the spoken form of -ನ್ನು)
    'ನನ್ನನ್ನ', 'ನಮ್ಮನ್ನ', 'ನಿಮ್ಮನ್ನ', 'ಅದನ್ನ', 'ಇದನ್ನ', 'ಅವನ್ನ', 'ಅವಳನ್ನ', 'ಅವರನ್ನ',
    // genitive
    'ನನ್ನ', 'ನಮ್ಮ', 'ನಿಮ್ಮ', 'ಅವನ', 'ಅವಳ', 'ಅವರ', 'ಅದರ', 'ತನ್ನ', 'ಯಾರ', 'ಒಬ್ಬರ',
    // instrumental / ablative (-ಇಂದ) — carries the ability construction, so it is glue, not content
    'ನನ್ನಿಂದ', 'ನಮ್ಮಿಂದ', 'ನಿಮ್ಮಿಂದ', 'ಅವನಿಂದ', 'ಅವಳಿಂದ', 'ಅವರಿಂದ',
    // demonstratives / manner deictics
    'ಆ', 'ಈ', 'ಅದೇ', 'ಇದೇ', 'ಹಾಗೆ', 'ಹೀಗೆ',
    // determiners, quantifiers, degree, focus
    'ಒಂದು', 'ಒಬ್ಬ', 'ಒಬ್ಬರು', 'ಕೆಲವು', 'ಎಲ್ಲಾ', 'ಎಲ್ಲರಿಗೂ', 'ಎಲ್ಲವನ್ನೂ',
    'ತುಂಬಾ', 'ಹೆಚ್ಚು', 'ಸ್ವಲ್ಪ', 'ಇಷ್ಟು', 'ಬೇರೆ', 'ಮಾತ್ರ',
    // conjunctions, quotative complementizers, discourse glue
    'ಆದರೆ', 'ಮತ್ತು', 'ಮತ್ತೆ', 'ಅಥವಾ', 'ಯಾಕಂದ್ರೆ', 'ಅಂತ', 'ಅನ್ನೋ', 'ಹೌದು',
    // free (non-bound) relational postpositions
    'ಜೊತೆ', 'ಬಗ್ಗೆ', 'ಮೇಲೆ', 'ಹತ್ರ', 'ಗಿಂತ', 'ತನಕ', 'ನಂತರ',
    // interrogatives — closed-class machinery, though each also debuts as a wh-lego
    'ಏನು', 'ಯಾರು', 'ಎಲ್ಲಿ', 'ಯಾವಾಗ', 'ಹೇಗೆ', 'ಎಷ್ಟು', 'ಯಾಕೆ',
    // bound case markers stranded as standalone tokens by ZWNJ in this corpus (see header)
    'ನಲ್ಲಿ', 'ಗೆ',
  ],

  // ── NPI ────────────────────────────────────────────────────────────────────────────
  // The -ಊ series only. The -ಆದರೂ / -ಓ free-choice series is deliberately NOT here.
  npi: ['ಏನೂ', 'ಯಾರೂ', 'ಯಾರಿಗೂ', 'ಎಲ್ಲಿಯೂ', 'ಸ್ವಲ್ಪವೂ', 'ಇನ್ನೂ'],
  npiLicensing: {
    rule: "Kannada, like Tamil, builds indefinites by suffixing a particle to a wh-word, and TWO "
      + "series result with opposite polarity behaviour — so the rule must be stated per series, or "
      + "the agent will drift between batches exactly as the Hindi pilot did on कुछ भी. "
      + "(A) The -ಊ SERIES — ಏನೂ 'anything/nothing' (45), ಯಾರೂ 'anyone/nobody' (12), ಯಾರಿಗೂ (35), "
      + "ಎಲ್ಲಿಯೂ 'anywhere' (23), ಸ್ವಲ್ಪವೂ 'the least bit / at all' (23), plus the aspectual ಇನ್ನೂ "
      + "'yet/still' (207) — is the negative-concord / negative-polarity series. In this corpus it "
      + "is essentially always under a licenser: ನಾನು ಎಲ್ಲಿಯೂ ಹೋಗಲಿಲ್ಲ \"I didn't go anywhere\" "
      + "(S376); ಇಲ್ಲ ಯಾರೂ ನನಗೆ ಹೇಳಲಿಲ್ಲ \"no nobody told me\" (S367); ನನಗೆ ಸ್ವಲ್ಪವೂ ಬೇಸರ ಇಲ್ಲ "
      + "\"I don't mind at all\" (S191); ಏನೂ ಹೇಳೋದು 'to say anything' under a want/infinitive frame "
      + "(S35); ನನಗೆ ಇನ್ನೂ ಇಡೀ ವಾಕ್ಯ ನೆನಪಾಗ್ತಿಲ್ಲ \"I can't remember the whole sentence yet\" (S60). "
      + "(B) The -ಆದರೂ / -ಓ FREE-CHOICE series — ಏನಾದರೂ 'something/anything' (165), ಎಲ್ಲಾದರೂ "
      + "'anywhere' (68), ಏನೋ 'something' (199), ಯಾರೋ 'someone' (12), and the human indefinite "
      + "ಒಬ್ಬರು 'someone' (24) — is specific-unknown / free-choice and is PERFECTLY FINE in a plain "
      + "positive declarative meaning 'some-': ನನಗೆ ಈಗ ಏನಾದರೂ ಹೇಳಬೇಕು \"I want to say something "
      + "now\" (S4); ನಿನ್ನೆ ಏನೋ ಕೇಳಬೇಕಿತ್ತು \"I wanted to ask something yesterday\" (S30); ನನಗೆ "
      + "ಒಬ್ಬರು ಗೊತ್ತು \"I know someone\" (S133). "
      + "THE ONLY THING TO TREAT AS AN NPI BREACH is an -ಊ item standing in a positive declarative "
      + "with no licenser anywhere in the clause. An -ಆದರೂ / -ಓ item in a positive declarative is "
      + "NEVER a breach and must not be 'corrected' into an -ಊ form; the two series are different "
      + "known items with different English renderings. "
      + "Three Kannada-specific warnings the agent must hold. FIRST, the licenser is normally a "
      + "BOUND SUFFIX on the clause-final verb (-ಇಲ್ಲ, -ಲಿಲ್ಲ, -ಲ್ಲ, the polar clitic -ಆ, the "
      + "conditional -ದ್ರೆ), so there is no free 'not' / 'do' / 'if' word to find, and because "
      + "Kannada is head-final the licenser comes AFTER the NPI. Any left-to-right 'negator before "
      + "the NPI' test reports a false breach on every well-formed Kannada sentence in this course. "
      + "Read the verb's fused polarity and mood, not the word order. SECOND, ಬೇಡ is a negator in "
      + "its own right (negative desiderative 'don't want / don't') with no -ಇಲ್ಲ anywhere in it, "
      + "and ಅಲ್ಲ is the nominal negator 'is not'; both license the -ಊ series and neither will be "
      + "found by looking for ಇಲ್ಲ. THIRD, -ಆದರೂ can attach to a postposition rather than to the "
      + "wh-word (ಬೇರೆ ಯಾರ ಜೊತೆಯಾದರೂ \"with someone else\", S5), so free-choice marking is not "
      + "always visible on the indefinite itself.",
    licensedIn: [
      "Suffixal verbal negation -ಇಲ್ಲ on the present/perfect (ಗೊತ್ತಿಲ್ಲ \"don't know\" 193, "
        + "ಅರ್ಥ ಆಗ್ತಿಲ್ಲ \"don't understand\", ನೆನಪಾಗ್ತಿಲ್ಲ \"can't remember\", ಇಷ್ಟವಿಲ್ಲ "
        + "\"don't like\" 33) and its spoken contraction -ಲ್ಲ (ಆಗಲ್ಲ \"I'm not going to be able\" "
        + "133, ಅನಿಸಲ್ಲ \"doesn't seem\" 27, ಚಿಂತಿಸಲ್ಲ \"I don't worry\")",
      "Past / anterior negation -ಲಿಲ್ಲ and -ಿರಲಿಲ್ಲ (ಹೇಳಲಿಲ್ಲ \"didn't say\" 38, ಆಗಲಿಲ್ಲ "
        + "\"couldn't / didn't like it\" 120, ಇರಲಿಲ್ಲ 76, ಗೊತ್ತಿರಲಿಲ್ಲ \"didn't know\" 35, "
        + "ಬೇಕಿರಲಿಲ್ಲ \"didn't want\" 83)",
      "The free negative existential ಇಲ್ಲ 'there isn't / no / don't have' (322) and the negative "
        + "desiderative ಬೇಡ 'don't want' (242) — note ಬೇಡ contains no ಇಲ್ಲ and is missed by any "
        + "ಇಲ್ಲ-shaped probe; the prohibitive -ಬೇಡಿ occurs only fused to a verb (ಚಿಂತಿಸಬೇಡಿ "
        + "\"don't worry\")",
      "The nominal negator ಅಲ್ಲ 'is not' (95: ಅದು ಸುಲಭ ಅಲ್ಲ \"it isn't easy\", S64) and negated "
        + "obligation ಬೇಕಾಗಿಲ್ಲ \"don't need to\"",
      "Yes/no questions formed by the clitic -ಆ agglutinated onto the questioned constituent "
        + "(ಬೇಕಾ? 60 standalone, ಗೊತ್ತಾ? 78, ಇದ್ದೀರಾ?, ಹೋಗಬೇಕಾ? 38, ಸಂತೋಷ ಇಲ್ಲವಾ? \"are you not "
        + "happy?\" S145) and wh-questions with ಏನು / ಯಾರು / ಎಲ್ಲಿ / ಯಾವಾಗ / ಎಷ್ಟು / ಯಾಕೆ",
      "Conditional and counterfactual clauses in -ದ್ರೆ, the spoken contraction of -ದರೆ "
        + "(ಗೊತ್ತಿದ್ದಿದ್ರೆ \"if I had known\" S152, ಕೇಳಿದ್ರೆ S190, ಬೇಕಿದ್ರೆ S317) and the embedded "
        + "polar alternative -ಓ … ಇಲ್ಲವೋ (ನನಗೆ ನೆನಪಿರುತ್ತೋ ಇಲ್ಲವೋ \"whether or not I can remember\", "
        + "S10, 73 hits)",
      "The desiderative/deontic modal ಬೇಕು ('want / need to / have to / must' — 547 standalone, "
        + "1,671 including its fused forms) and its past ಬೇಕಿತ್ತು, plus obligation ಬೇಕಾಗುತ್ತೆ: "
        + "a want/need complement is non-veridical and licenses free-choice readings",
      "Ability and possibility in all three of their Kannada shapes — the permissive-epistemic "
        + "-ಬಹುದು 'may / might / can' (200), the potential participle -ಬಲ್ಲ 'can / be able to' "
        + "(121: ನೆನಪಿಟ್ಟುಕೊಳ್ಳಬಲ್ಲ \"who can remember\" S232), and the oblique-subject "
        + "NP-ಇಂದ … ಆಗುತ್ತೆ / ದative-subject ನನಗೆ … ಆಗಲ್ಲ construction",
      "Restrictive focus ಮಾತ್ರ 'only' (17), comparatives in -ಗಿಂತ 'than' (38) and superlative or "
        + "scalar frames (ಅತ್ಯಂತ 47, ಸಾಧ್ಯವಾದಷ್ಟು 79), plus 'before' / 'until' clauses "
        + "(ಮೊದಲು 145, ಮುಂಚೆ 23, ಮುಗಿಸೋ ತನಕ \"until we finish\" S251)",
      "Imperatives, hortatives, and the bound temporal -ಾಗ 'when' clause — non-assertive contexts "
        + "where the event is not asserted as actual",
    ],
  },

  // ── Negation ───────────────────────────────────────────────────────────────────────
  // Reference list for the agent, NOT a matcher. In Kannada negation is a BOUND SUFFIX on the
  // clause-final verb, so several entries here are suffix fragments rather than free words — which
  // is precisely why a free-standing-'not' search finds nothing on this known side. Debuts:
  // ಇಲ್ಲ S12, ಬೇಡ S19, ಆಗಲ್ಲ S24, ಅಲ್ಲ S64, ಆಗಲಿಲ್ಲ S86.
  negation: [
    'ಇಲ್ಲ', 'ಿಲ್ಲ', 'ಲ್ಲ', 'ಲಿಲ್ಲ', 'ಿರಲಿಲ್ಲ', 'ಇರಲಿಲ್ಲ', 'ಆಗಲ್ಲ', 'ಆಗಲಿಲ್ಲ',
    'ಬೇಡ', 'ಬೇಡಿ', 'ಅಲ್ಲ', 'ಬೇಕಾಗಿಲ್ಲ', 'ಬೇಕಿರಲಿಲ್ಲ', 'ಗೊತ್ತಿಲ್ಲ', 'ಇಷ್ಟವಿಲ್ಲ', 'ಇಲ್ಲವೋ', 'ಇಲ್ಲವಾ',
  ],

  // ── Kannada machinery, licensed at its carrier's debut ─────────────────────────────
  knownConstructions: [
    { id: 'honorific_you', marker: 'ನೀವು / ನಿಮಗೆ', description: "Kannada 'you' in this course is uniformly honorific-plural ನೀವು (908, debut S1), dative ನಿಮಗೆ (857, S20), accusative ನಿಮ್ಮನ್ನ (105), genitive ನಿಮ್ಮ (319), instrumental ನಿಮ್ಮಿಂದ (28), plus the composite ನೀವೆಲ್ಲ / ನೀವೆಲ್ಲರಿಗೆ 'you all'. The familiar ನೀನು / ನಿನಗೆ / ನಿನ್ನ does not occur once as a standalone token in 15,784 rows. Licensed at ನೀವು's debut; accept ನೀವು, all its case forms, and the -ೀರಿ / -ತೀರಾ agreement for every English 'you'." },
    { id: 'dative_subject_experiencer', marker: 'ನನಗೆ … ಬೇಕು / ಗೊತ್ತು / ಅನಿಸುತ್ತೆ / ಇಲ್ಲ', description: "THE signature Kannada frame, and the reason ನನಗೆ is the corpus's commonest token (2,551). Experiencers, wanters, knowers and possessors take the DATIVE -ಗೆ with no nominative subject at all: ನನಗೆ … ಬೇಕು \"I want / I need\" (S1), ನಿಮಗೆ ಗೊತ್ತಾ? \"do you know?\", ನನಗೆ ಅನಿಸುತ್ತೆ \"I think / it seems to me\" (391, S89), ನನಗೆ ಇಷ್ಟ \"I like\" (194), ನನಗೆ ಪರವಾಗಿಲ್ಲ \"I feel okay\" (S41), ನನಗೆ … ಇಲ್ಲ \"I don't have\". English uses a NOMINATIVE subject for every one of them. Licensed at S1. ನಾನು and ನನಗೆ are ONE English 'I'; which one appears is chosen by the Kannada predicate and is invisible in the English." },
    { id: 'ಬೇಕು', marker: 'ಬೇಕು', description: "want / need to / have to / must / would like — the desiderative-deontic modal, and the direct Kannada analogue of Tamil வேண்டும் and Hindi चाहिए, the item the pilot found leaking precisely because it was left unclassified. 547 standalone hits, 1,671 counting its fused forms; debut S1. It either stands after a dative subject (ನನಗೆ … ಬೇಕು 'I want') or suffixes to a verb stem (ಮಾಡಬೇಕು 175, ಮಾತಾಡಬೇಕು 122, ಹೇಳಬೇಕು 77, ಹೋಗಬೇಕು 57, ಕಲಿಯಬೇಕು 57). Its past is ಬೇಕಿತ್ತು 'had to / wanted' (59) and ಬೇಕಿರಲಿಲ್ಲ \"didn't want\" (83); its deontic negative is ಬೇಕಾಗಿಲ್ಲ \"don't need to\"; its polar question form is ಬೇಕಾ (60). ONE Kannada form covers five English modals. License it as a modal construction; never introduce it as content." },
    { id: 'ಬೇಡ', marker: 'ಬೇಡ / ಬೇಡಿ', description: "don't want / don't — the NEGATIVE of ಬೇಕು, and a negator in its own right containing no ಇಲ್ಲ at all (242, debut S19): ಅವಳಿಗೆ ಬೇಡ \"she doesn't want\", ನನಗೆ ಇನ್ನೂ … ಬೇಡ \"I don't want to … yet\", prohibitive ಚಿಂತಿಸಬೇಡಿ \"don't worry\". Same modal machinery in negative polarity, and an NPI licenser that an ಇಲ್ಲ-shaped probe will miss entirely." },
    { id: 'ability_oblique_subject', marker: '-ಇಂದ … ಆಗುತ್ತೆ / ನನಗೆ … ಆಗಲ್ಲ', description: "can / could / be able to — expressed NOT by an auxiliary but by an impersonal ಆಗು 'it comes about' plus an OBLIQUE subject, and this corpus attests two oblique cases for it. Instrumental/ablative -ಇಂದ: ಅವಳಿಂದ ಆಗುತ್ತೆ \"she could\" (S317), ಅವನಿಂದ ಸಹಾಯ ಮಾಡೋಕೆ ಆಗುತ್ತಾ \"if he'll be able to help\" (S176), ನಿಮ್ಮಿಂದ ಮುಗಿಸೋಕೆ ಆಗಿದೆಯಾ \"you've been able to finish\" (S525), ನನ್ನಿಂದ ಸಾಧ್ಯವಾದಷ್ಟು \"as hard as I can\" (S7). DATIVE -ಗೆ in the negative: ನನಗೆ ಆಗಲ್ಲ \"I'm not going to be able\", ನನಗೆ ಮಾತಾಡಲು ಆಗಲ್ಲ \"I'm not going to be able to speak\" (S24). Either way the English nominative subject appears in Kannada as an oblique and there is no auxiliary word to tile. License the case-shift with the construction; do not read the -ಇಂದ form as new vocabulary." },
    { id: 'ಬಹುದು', marker: '-ಬಹುದು', description: "may / might / can (permission and epistemic possibility) — a bound modal suffix on the verb stem, 200 hits: ಎಷ್ಟು ಬೇಗ ಕಲಿಯಬಹುದು \"how quickly I can learn\" (S77), ಯಾವಾಗ ಸಹಾಯ ಮಾಡಬಹುದು? \"when can you help me?\" (S79), ಮಾತಾಡಬಹುದಾ? \"can we talk?\" (with the polar clitic riding on it), ಇರಬಹುದು 'might be'. Distinct from the ability construction above (capability) and from -ಬಲ್ಲ (potential participle). Machinery, not content, and an NPI licenser." },
    { id: 'ಬಲ್ಲ', marker: '-ಬಲ್ಲ / -ಬಲ್ಲೆ / -ಬಲ್ಲಳು', description: "can / be able to (potential) — a THIRD ability exponent, distinct from both -ಬಹುದು and the oblique-subject frame, and easy to miss because it surfaces mostly inside relative participles: 121 hits, e.g. ಉತ್ತರ ನೆನಪಿಟ್ಟುಕೊಳ್ಳಬಲ್ಲ ಒಬ್ಬ ಮುದುಕಿ \"an old woman who can remember the answer\" (S232), ಬರೆಯಬಲ್ಲಳು \"she can write\" (36, S310), ಮಾಡಬಲ್ಲೆ 'I can do' (23, S645). It agrees for person/gender like any finite verb. License as one potential construction so its agreeing forms are not each read as new vocabulary." },
    { id: 'quotative_anta', marker: 'ಅಂತ / ಅನ್ನೋ', description: "ಅಂತ is the quotative complementizer, and it CLOSES its embedded clause where English 'that' opens one — 1,872 hits, the second commonest token in the corpus, debut S8: ನಾನು ಎಷ್ಟು ಬೇಗ ಕಲಿಯಬಹುದು ಅಂತ ನನಗೆ ಗೊತ್ತಿಲ್ಲ \"I don't know how quickly I can learn\" (S77); ಅವಳಿಂದ ಆಗುತ್ತೆ ಅಂತ ನನಗೆ ಅನಿಸುತ್ತೆ \"I think she could\" (S317). Its adnominal form is ಅನ್ನೋ (68). English routinely omits 'that' altogether, so ಅಂತ frequently has NO English counterpart token at all — never require one, never treat its English absence as a missing gloss, never gloss it as a copula. It also carries embedded QUESTIONS, where English again needs no complementizer. Spoken register: the literary ಎಂದು scores 3 against ಅಂತ's 1,872." },
    { id: 'question_clitic_aa', marker: '-ಆ', description: "Polar (yes/no) questions are formed by the interrogative clitic -ಆ agglutinated onto the questioned constituent, normally the clause-final verb: ಗೊತ್ತಾ? \"do you know?\" (78), ಬೇಕಾ? (60), ಹೋಗಬೇಕಾ? (38), ಮಾತಾಡಬೇಕಾ? (27), ಸಂತೋಷ ಇಲ್ಲವಾ? \"are you not happy?\" (S145), ನೋಡಿದ್ರಾ? (33). No do-support, no inversion, no word-order change. English do / does / did are absorbed by this clitic plus the verb's own tense and are NOT separate Kannada glosses. Because the clitic FUSES with the preceding suffix (ಬೇಕು → ಬೇಕಾ, ಗೊತ್ತು → ಗೊತ್ತಾ), the whole word looks new to an exact-form matcher even when its base debuted long ago — a leading source of false 'unknown gloss' hits." },
    { id: 'conditional_dre', marker: '-ದ್ರೆ / -ಓ … ಇಲ್ಲವೋ', description: "Conditionals and counterfactuals are the bound verb suffix -ದ್ರೆ (spoken contraction of literary -ದರೆ), not an 'if' word: ಗೊತ್ತಿದ್ದಿದ್ರೆ \"if I had known\" (S152), ಕೇಳಿದ್ರೆ (S190), ಬೇಕಿದ್ರೆ (S317); the same suffix builds the causal ಯಾಕಂದ್ರೆ 'because' (63, S22). The counterfactual apodosis is itself a fused form (ಕೊಡ್ತಿದ್ದ 'he would give', ಮಾಡ್ತಿದ್ದಳು 'she would do'). Separately, embedded 'whether/if' is the alternative frame -ಓ … ಇಲ್ಲವೋ: ನನಗೆ ನೆನಪಿರುತ್ತೋ ಇಲ್ಲವೋ \"whether or not I can remember\" (S10, 73 hits) — glossed in this course simply as 'if I can remember', so the Kannada carries an 'or not' the English drops. Both are key NPI licensers; there is no free 'if' word to look for." },
    { id: 'temporal_aaga', marker: '-ಾಗ', description: "when / while — a bound temporal-clause subordinator -ಾಗ on a non-finite verb, distinct from the interrogative ಯಾವಾಗ 'when' (which is a free word in the free class). Subordinating machinery glued to the verb; license as one construction so a 'when'-clause is not mis-read as an interrogative or as content. Note the string -ಾಗ is also the stem of ಆಗು 'become/happen', so a substring count of it is meaningless — judge by the clause." },
    { id: 'fused_tense_agreement', marker: '-ತೀನಿ / -ತೀರಿ / -ತಾನೆ / -ದೆ / -ದಳು / -ದ್ದೇನೆ', description: "Tense, person, number and gender are FUSED into one clause-final finite verb, so the subject pronoun is freely droppable: ಮಾಡ್ತೀನಿ 'I do' (55), ಮಾಡ್ತಿದ್ದೀರಿ 'you are doing' (54), ಮಾಡ್ತಾನೆ 'he does', ನೋಡಿದೆ 'I saw' (185), ಹೇಳಿದಳು 'she said' (87), ಮಾಡಿದ್ದೇನೆ \"I've done\" (23), ಪ್ರಯತ್ನಿಸ್ತಿದ್ದೇನೆ \"I'm trying\" (58). English tense/aspect (past -ed, perfect have-V-ed, progressive -ing, future will, habitual 'would') is realised by ONE fused Kannada form, never by a separate auxiliary. Licensed at the first finite verb (S1) — and be warned this construction is the single largest source of apparent 'unknown gloss' hits, because every tense of a known verb is a different string and stemStrip is empty by design." },
    { id: 'verbal_nouns', marker: '-ಓಕೆ / -ಓದು / -ಲು', description: "Three productive non-finite forms, all rendering as an English infinitive or gerund: purposive -ಓಕೆ (spoken, 1,200 occurrences of the ending: ಮಾಡೋಕೆ 'to do' 201, ಕಲಿಯೋಕೆ 'to learn' 88, ಹೇಳೋಕೆ 58, ಮಾತಾಡೋಕೆ 62), verbal noun -ಓದು (862: ಮಾಡೋದು 'doing' 88, ಮಾತಾಡೋದು 84, ಹೇಳೋದು 49), and the alternate infinitive -ಲು (473: ಮಾತಾಡಲು 111, ಬರಲು 39, ಭೇಟಿಯಾಗಲು 37). One verb, three surface forms, one English 'to V' / 'V-ing'. Licensed as ONE construction at the first non-finite form (S1/S2) — do not require each of the three to debut separately." },
    { id: 'case_suffix_stacking', marker: '-ಗೆ / -ನ್ನ / -ಲ್ಲಿ / -ಇಂದ / -ಗಿಂತ', description: "Grammatical and oblique relations are BOUND suffixes agglutinated onto the noun, and they stack: dative -ಗೆ (6,031 string occurrences — ನನಗೆ, ಮನೆಗೆ 'to the house', ಗಂಟೆಗೆ \"at o'clock\"), accusative -ನ್ನ (2,998 — ಅದನ್ನ, ಪದಗಳನ್ನ 'the words'), locative -ಲ್ಲಿ (1,800 — ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ 'in English', ಸಮಯದಲ್ಲಿ 'in time'), instrumental/ablative -ಇಂದ (477), comparative -ಗಿಂತ (38), plus the free postpositions ಜೊತೆ 'with' (319), ಬಗ್ಗೆ 'about' (285), ಮೇಲೆ 'on' (96), ಹತ್ರ 'near' (51), ತನಕ 'until' (22), ನಂತರ 'after' (27). English a / an / the / to / in / with / about / than have NO separate Kannada token — they are absorbed here and need no introduction. Mask the case-marked span as one unit. See the header on ZWNJ, which sometimes strands these suffixes as standalone tokens, and the stemStrip note on why they must not be stripped." },
    { id: 'negation_suffixal', marker: '-ಇಲ್ಲ / -ಲಿಲ್ಲ / -ಲ್ಲ / ಇಲ್ಲ / ಬೇಡ / ಅಲ್ಲ', description: "Negation is a BOUND SUFFIX on the clause-final verb, not a free word: present/perfect -ಇಲ್ಲ (ಗೊತ್ತಿಲ್ಲ 193, ಆಗ್ತಿಲ್ಲ, ಇಷ್ಟವಿಲ್ಲ 33), past -ಲಿಲ್ಲ / -ಿರಲಿಲ್ಲ (ಹೇಳಲಿಲ್ಲ 38, ಆಗಲಿಲ್ಲ 120, ಇರಲಿಲ್ಲ 76), spoken contraction -ಲ್ಲ (ಆಗಲ್ಲ 133, ಅನಿಸಲ್ಲ 27). Alongside them: the free negative existential ಇಲ್ಲ 'there isn't / no / don't have' (322), the negative desiderative ಬೇಡ (242), and the NOMINAL negator ಅಲ್ಲ 'is not' (95) which negates a predicate nominal or adjective where -ಇಲ್ಲ negates a verb (ಅದು ಸುಲಭ ಅಲ್ಲ \"it isn't easy\", S64). The privative converb ಇಲ್ಲದೆ 'without' (33, S540) belongs to this family too but is NOT clausal negation and licenses nothing. This is ONE polarity construction licensed at ಇಲ್ಲ's debut (S12): each tense's negative form is the same construction, not new vocabulary. Because the negator is clause-final and bound, any check expecting a free 'not' before the verb finds nothing at all." },
    { id: 'spoken_register', marker: 'ಮಾಡೋಕೆ / ಹೇಳ್ತೀನಿ / ಆಗಲ್ಲ / -ದ್ರೆ / -ನ್ನ / ಅಂತ', description: "The whole course is authored in SPOKEN Kannada and the contractions are systematic: -ಓಕೆ for -ುವುದಕ್ಕೆ, -ತೀನಿ for -ುತ್ತೇನೆ, -ತ್ತೆ for -ುತ್ತದೆ (ಆಗುತ್ತೆ 154, ಅನಿಸುತ್ತೆ 391), -ಲ್ಲ for -ುವುದಿಲ್ಲ, -ದ್ರೆ for -ದರೆ, -ನ್ನ for -ನ್ನು, ಅಂತ for ಎಂದು. This is a REGISTER, not an error. Two consequences: any inventory built from literary Kannada matches nothing here, and an exact-form matcher treats a spoken form and its literary equivalent as two unrelated words. License the register once — and never 'correct' a spoken form to the literary one in content, because mixing the two for the same lexeme creates two known prompts with one English answer, which is a ZUT break." },
    { id: 'gender_number_agreement_3sg', marker: 'ಅವನು / ಅವಳು / ಅವರು', description: "Third person splits by gender AND respect: ಅವನು 'he' (545, S52), ಅವಳು 'she' (520, S132), ಅವರು 'they, or honorific he/she' (371, S87), each with matching verb agreement (ಹೇಳಿದಳು 'she said' vs ಮಾಡ್ತಾನೆ 'he does' vs ಹೇಳಿದ್ರು 'they said'). ಅವರು is genuinely ambiguous between plural 'they' and honorific singular. Licensed at each pronoun's debut; the honorific/plural ambiguity is a Kannada feature, not an English one." },
  ],

  // ── Known-side ZUT / rendering rules ───────────────────────────────────────────────
  glossRules: [
    { id: 'dativeSubjectIsEnglishNominative', rule: "ನನಗೆ … ಬೇಕು → 'I want'; ನಿಮಗೆ ಗೊತ್ತಾ? → 'do you know?'; ನನಗೆ ಅನಿಸುತ್ತೆ → 'I think'; ನನಗೆ … ಇಲ್ಲ → \"I don't have\". The Kannada experiencer/possessor is DATIVE where the English subject is NOMINATIVE. ನಾನು and ನನಗೆ are ONE English 'I' — the case is chosen by the Kannada predicate, not by anything visible in the English. Never gloss ನನಗೆ as 'to me' inside these frames, and never read the absent nominative as a missing pronoun." },
    { id: 'bekuManyToOne', rule: "ONE ಬೇಕು covers English want / need to / have to / must / would like; its negative ಬೇಡ covers don't want / don't / mustn't; ಬೇಕಾಗಿಲ್ಲ is \"don't need to\", ಬೇಕಿತ್ತು 'had to / wanted', ಬೇಕಿರಲಿಲ್ಲ \"didn't want\", ಬೇಕಾ the polar question. Many-English→one-Kannada. Record the intended English modal per carrier, so the same known prompt cannot license two different English modals — that would break ZUT on the target side." },
    { id: 'abilityHasThreeExponentsAndMovesTheSubject', rule: "English can / could / be able to has THREE distinct Kannada exponents and they are not interchangeable: (1) NP-ಇಂದ … ಆಗುತ್ತೆ / ದative ನನಗೆ … ಆಗಲ್ಲ — capability, with the able person in an OBLIQUE case and an impersonal verb, so the English nominative subject has no Kannada nominative counterpart and there is no auxiliary to tile; (2) -ಬಹುದು — permission and epistemic possibility ('may/might/can'); (3) -ಬಲ್ಲ — potential, usually inside a relative participle ('who can remember'). Fix which English modal each carrier renders and hold it; do not let 'can' float between the three." },
    { id: 'negationIsSuffixalAndClauseFinal', rule: "Negation is the bound -ಇಲ್ಲ / -ಲಿಲ್ಲ / -ಲ್ಲ on the clause-final verb, or the free ಇಲ್ಲ / ಬೇಡ / ಅಲ್ಲ. English don't / doesn't / didn't / isn't / won't / can't all map to whichever fused form the tense and mood dictate — one Kannada negative form per English negation. The cue is the presence of one of these forms, not a separate 'not' word, and because Kannada is head-final it arrives at the END of the clause, AFTER anything it licenses. ಅಲ್ಲ negates a NOMINAL predicate ('isn't easy') while -ಇಲ್ಲ negates a verbal one; English uses the same 'not' for both, so the choice is Kannada-internal." },
    { id: 'paravaagillaIsPositive', rule: "ಪರವಾಗಿಲ್ಲ (44, S41) contains the negative suffix -ಇಲ್ಲ but means \"I feel okay / no problem\" — a POSITIVE reply. Any substring negation test reads it as negated. Do not cite it as a negation licenser for an NPI, and do not gloss it with an English 'not'. Same trap in reverse for ಇಲ್ಲದೆ 'without', which is privative, not clausal negation." },
    { id: 'questionByClitic', rule: "English do/does/did-support and copular questions correspond to the Kannada clitic -ಆ fused onto the questioned constituent (ಬೇಕಾ, ಗೊತ್ತಾ, ಹೋಗಬೇಕಾ, ಇಲ್ಲವಾ). do/does/did are NOT separate Kannada glosses and must never be tiled as such; conversely a -ಆ-final prompt IS a question even though its word order is declarative." },
    { id: 'quotativeAntaClosesTheClause', rule: "ಅಂತ (and adnominal ಅನ್ನೋ) is a quotative complementizer that FOLLOWS its clause, where English 'that' precedes — and English usually omits 'that' altogether. Free grammatical glue: never require an English 'that' for it, never read its English absence as a missing gloss, never gloss it as a copula. At 1,872 hits it is the second commonest token in the corpus, so getting this wrong is expensive." },
    { id: 'fusedTenseNotAuxiliary', rule: "English tense/aspect (past -ed, perfect have-V-ed, progressive -ing, future will, habitual 'would') is realised by a SINGLE fused Kannada finite form — ನೋಡಿದೆ 'I saw', ಮಾಡಿದ್ದೇನೆ \"I've done\", ಮಾಡ್ತಿದ್ದೀರಿ 'you are doing', ಕೊಡ್ತಿದ್ದ 'he would give'. Do not tile English auxiliaries as separate Kannada tokens, and do not require each tense of an already-taught verb to be introduced again as new vocabulary." },
    { id: 'spokenRegisterVariantsAreOneLexeme', rule: "ಮಾಡೋಕೆ / ಮಾಡೋದು / ಮಾಡಬೇಕು / ಮಾಡ್ತೀನಿ / ಮಾಡಿದ್ದೇನೆ are forms of ONE verb; ಆಗಲ್ಲ is the spoken -ುವುದಿಲ್ಲ. An exact-form matcher sees them as unrelated strings, so the majority of its findings on a kan known side are register and inflection artefacts, not untaught vocabulary — adjudicate accordingly. The authoring rule that follows: keep the whole course in ONE register, because a spoken and a literary form of the same lexeme are two known prompts with one English answer, and that is a ZUT break." },
    { id: 'caseSuffixesAreGlue', rule: "English a / an / the / to / in / with / about / than are realised as Kannada bound case suffixes (-ಗೆ, -ನ್ನ, -ಲ್ಲಿ, -ಇಂದ, -ಗಿಂತ) inside a single token, or as the free postpositions ಜೊತೆ / ಬಗ್ಗೆ / ಮೇಲೆ / ಹತ್ರ / ತನಕ / ನಂತರ. They are free on the known side and never need a separate introduced lego. Where ZWNJ has stranded a suffix as its own token (ನಲ್ಲಿ, ಗೆ, ಗಿಂತ) it is still glue, which is why those forms are in the free class — but a stranded suffix is a tokenisation artefact, so never report one as an untaught word, and never treat its 'debut seed' as meaningful." },
    { id: 'enaadaruuVsEnuu', rule: "ಏನಾದರೂ (165) and ಏನೋ (199) are 'something' — free-choice / specific-unknown, and perfectly fine in a plain positive declarative (\"I want to say something now\", S4). ಏನೂ (45) is 'anything / nothing' — the -ಊ NPI form, which needs a licenser. Likewise ಎಲ್ಲಾದರೂ 'anywhere (free-choice)' vs ಎಲ್ಲಿಯೂ 'anywhere (NPI)', and ಯಾರೋ / ಒಬ್ಬರು 'someone' vs ಯಾರೂ / ಯಾರಿಗೂ 'anyone/nobody'. These are DIFFERENT known items with different English renderings: never normalise one series onto the other, and never treat the -ಆದರೂ / -ಓ series as NPIs. Note ಯಾರಾದರೂ, the expected free-choice 'someone', does not occur in this corpus at all — ಒಬ್ಬರು fills that slot." },
    { id: 'innuu', rule: "ಇನ್ನೂ (207) is polarity-conditioned: under a negator it renders 'yet' (ಇನ್ನೂ ಯಾರೂ ನನಗೆ ಹೇಳಲಿಲ್ಲ \"nobody told me yet\", S367; ಇನ್ನೂ … ನೆನಪಾಗ್ತಿಲ್ಲ \"can't remember yet\", S60), and in a positive or additive clause it renders 'still' or 'more'. One Kannada form → two English renderings selected by polarity; this is a rendering rule, not a ZUT collision, and must not be flagged as one. Same treatment as Tamil இன்னும்." },
    { id: 'ondu', rule: "ಒಂದು (600) is both the numeral 'one' and the indefinite article 'a/an' (ಒಂದು ಪದವನ್ನು = 'a word', not 'one word'), with the human classifier ಒಬ್ಬ / ಒಬ್ಬರು for people (and ಒಬ್ಬರು doubling as 'someone'). One Kannada form → two English renderings; the article reading is glue and must never require the numeral's debut." },
    { id: 'avaruIsTheyOrHonorificHe', rule: "ಅವರು (371) is 'they' AND honorific 3sg 'he/she'; ಅವರಿಗೆ / ಅವರ / ಅವರನ್ನ / ಅವರಿಂದ likewise. The English rendering must be fixed per prompt from the verb agreement and context, and the SAME known prompt must never be answerable as both 'they' and 'he' — that is a straight ZUT break, and it is the most likely place for one to hide on this known side." },
    { id: 'noFamiliarYou', rule: "Every English 'you / your' renders to the honorific ನೀವು / ನಿಮಗೆ / ನಿಮ್ಮ / ನಿಮ್ಮನ್ನ / ನಿಮ್ಮಿಂದ paradigm plus -ೀರಿ agreement. Never split the English into polite vs plural, and never treat a case form of ನೀವು as a new pronoun. If a future kan-known course ever introduces the familiar ನೀನು, that is a NEW construction with its own debut — never a silent variant of this one." },
  ],
};
