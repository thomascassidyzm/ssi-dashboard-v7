// fra_for_eng pair-contract — SECOND PASS (2026-11-20, cs #593, WORKLIST [#3]). NOT yet ratified.
// First pass (2026-06-15) left the French layer empty so the lint flags would be the worklist.
// This pass fills the CONSTRUCTIONS the worklist line names (going-to / ne…pas / question forms /
// relative / clitics), each keyed to a carrier target that EXISTS in the live course (checked
// against GET :3471/api/vocab/fra_for_eng and the first seed whose target carries it, 2026-11-20):
//   je vais     ~S5   "I'm going to practise speaking…"         → going-to
//   ce que      ~S8   "…explain what I mean"                     → free relative "what I…"
//   pas         ~S10  "I'm not sure…" = "Je ne suis pas sûr…"    → negation (ne…pas)
//   est-ce que  ~S25  "are you going to help me…?"               → do-support questions
//   qui                                                          → "someone/people who…"
//   lui         ~S136 "you can ask her" = "tu peux lui demander" → tell/ask/give him|her
// The gate resolves each carrier to its debut seed from the live order, so the seed numbers above
// are context, not configuration. ratified stays null: the known-side gate keeps construction
// licensing advisory (warn) until a French speaker + adversarial pass ratify — Tom's/Kai's call.
//
// KEY REUSE: known_lang === 'eng', so the KNOWN-SIDE scaffold (free class, NPI, negation words) is
// IDENTICAL to zho_for_eng — copied verbatim below.
module.exports = {
  course_code: 'fra_for_eng',
  ratified: null,            // advisory/warn-only until a French speaker + adversarial pass ratify
  known_lang: 'eng',

  // ── KNOWN-SIDE SCAFFOLD — shared across ALL _for_eng pairs (verbatim from zho_for_eng) ──
  freeGlue: ['a', 'an', 'the', 'to', 'it', 'and', 'of', 'some', "'s", 'is', 'are', 'am', 'be'],
  npiTokens: ['any', 'anyone', 'anything', 'anywhere', 'ever', 'yet', 'either'],
  negationMarkers: /\b(not|n't|don't|doesn't|didn't|won't|can't|never|no)\b/i,
  negationWords: ['not', 'never', "don't", "doesn't", "didn't", "won't", "can't", 'dont', 'doesnt', 'didnt', 'wont', 'cant'],
  // NO INFLECTION ALLOWANCE (Tom 2026-06-15): a known form is usable only if introduced as a
  // LEGO/component (exact form, no stemming, no tense-class licensing). Enforced by the gate's
  // exact stemKnownGloss. Same rule for every _for_eng pair.

  // ── TARGET-SPECIFIC (French) ──
  // Relative qui is glossed "who" at its debut (one French target, the English relative pronoun), so
  // "someone who…" is licensed by the qui carrier rather than needing a separate "who" LEGO. The
  // pilot's d2 synonym forks (avoir peur/s'inquiéter etc.) stay OUT: those are Tom's ear.
  glossSynonyms: {
    qui: ['who'],
  },
  glossUnits: [
    // "what I mean" is taught whole at the seed-8 carrier, exactly as zho's 意思 unit.
    { phrase: 'what i mean', carrier: 'ce que' },
  ],

  // Construction licenses: English known-side machinery, each unavailable until its French carrier
  // debuts. Tests match the KNOWN prompt; carriers are exact (normalised) target texts.
  constructions: [
    // ne…pas: the learner meets negation as a whole-intention carrier (pas inside "je ne suis pas"),
    // never as a bare "ne" debut — construction-feature, not a unit of intention.
    { id: 'negation',     test: /\b(don't|doesn't|didn't|not|won't|can't|isn't|aren't|wasn't|wouldn't|couldn't|shouldn't)\b/i, carrier: 'pas' },
    { id: 'going-to',     test: /\bgoing to\b/i,                                                    carrier: 'je vais' },
    // Do-support questions (yes/no and wh-) — the course's question machinery is est-ce que.
    { id: 'do-support-q', test: /\b(do|does|did) (you|i|we|they|she|he)\b/i, carrier: 'est-ce que' },
    { id: 'relative-who', test: /\b(someone|somebody|people|person|man|woman|friend|anyone|those|one)\s+who\b/i, carrier: 'qui' },
    { id: 'free-relative-what', test: /\b(know|explain|say|said|understand|remember|tell me|is|was)\s+what (i|you|he|she|we|they)\b/i, carrier: 'ce que' },
    // Indirect-object clitic: "ask her / tell him / give them" → lui/leur before the verb.
    { id: 'clitic-indirect', test: /\b(ask|asked|tell|told|give|gave|show|showed|say to|said to|speak to|talk to|write to)\s+(him|her)\b/i, carrier: 'lui' },
  ],
  clusterRounds: {},

  // Gloss/ZUT rules enforced by authoring + the ZUT gate (recorded; not pure tiling).
  // These carry the WORKLIST [#3] "make ZUT-colliding English person/number/gender-specific" half:
  // the English prompt must carry the distinction the French form makes, in words — never brackets.
  glossRules: {
    tuFirst: 'bare "you" -> tu forms (Tom 2026-07-04 "tu first as default, unless context insists"); vous-singular only where the seed context insists, marked vocatively ("sir"/"madam")',
    youPlural: 'plural "you" -> vous, marked in the English by "you all" / "both of you" / a group vocative — never "(pl.)"',
    theyGender: 'ils/elles collide on bare "they": where both forms live in the course, the English names the group ("the girls", "my sisters") rather than tagging gender',
    agreement: 'adjective/participle agreement (sûr/sûre, allé/allée) is a target-side variant of ONE English prompt: carry the speaker/subject in the English context, or keep one form course-wide',
    negation: 'ne…pas is one construction: never debut bare "ne"; gloss the whole intention ("I\'m not sure"), and ne…jamais / ne…plus each enter as their own whole-intention carriers',
    clitics: 'object pronouns are construction-features placed before the verb (le/la/l\'/les direct, lui/leur indirect, y/en); debut inside a whole thought, never as a bare clitic gloss',
    questions: 'the course mixes est-ce que, inversion (apprends-tu) and intonation for the same English question shape — a target-side ZUT fork to resolve per question, not licensed here',
  },
};
