<!-- Docs-surface glossary — HAND-MAINTAINED RULINGS SOURCE (founder-voiced
concepts; distilled 2026-07-27 from the retired TerminologyGlossary.vue, which
lives on in git). The compiler quotes these terms on /docs/terminology and
VERIFIES every pointer line against the code:
  > lives in: `supabase_table`     — table must be referenced by the code
  > enforced by: `symbol`          — must exist in the course-builder source
  > code: `path`                   — file must exist
Concepts and definitions belong here. Numbers that the validator owns (syllable
caps, phrase floors, ports) do NOT — the compiled Pipeline page renders those
from the code, so this file can never contradict it. -->

## seed

> lives in: `course_seeds`

One canonical known-language sentence and its chosen target translation. The seed is the atomic
unit of submission: one seed, one API call, all-or-nothing. The known text must match the
canonical seed exactly or the submission is rejected as a canonical mismatch. Seeds are not
first-class citizens — a seed is a **vehicle for delivering LEGOs**; "what LEGOs does this seed
let me teach?" is the decomposition question. Reference format: `S0001`, `S0042` — S plus a
4-digit number.

## LEGO

> lives in: `course_legos`
> enforced by: `MAX_LEGO_SYLLABLES`

The unit of communication and of learning: a pedagogically-sound chunk that removes learner
uncertainty. The test is simple — hear the known-language prompt, produce the target with zero
guessing. Two jobs: remove uncertainty (that's ZUT), and maximise patterns with minimum
vocabulary (overlapping chunks let each LEGO recombine into many sentences). LEGOs are capped by
a **target-syllable limit**, not a word count — the live value is on the Pipeline page. Overlap
is allowed and encouraged; it is how recombination happens. Reference format: `S0041L02` — seed
number plus LEGO index.

## A-LEGO and M-LEGO

> lives in: `course_legos`

The only two LEGO types, **declared by the author, never computed** — the validator checks the
letter, it does not count words. **A (atomic)** is a single meaningful word: no components, no
build-up ladder. **M (molecular)** is a multi-word chunk that bundles structure the learner
cannot yet recombine — idiomatic glue, reversed word order, anything uninferable — and it must
declare its word-level **components**. The deciding question is inferability: given what the
learner already knows, can they assemble this themselves? Yes → no new LEGO, let existing
pieces tile it. No → an M-LEGO, introduced components-first.

## component

> lives in: `course_practice_phrases`

A word-level piece of an M-LEGO, shown with a **literal translation** at the LEGO's debut so the
learner sees the pattern arrive through meaning — no grammar lecture, ever. Component rows are
per-sentence literal tiling glosses, not atomised intentions: their known side is exempt from
ZUT, but their target text must be part of their own seed's target sentence. Components still
count as available vocabulary, and some (single-letter prepositions, particles) are marked
`introduce:false` because they only make sense attached.

## practice phrases — build and use

> lives in: `course_practice_phrases`

Every LEGO carries practice phrases in exactly one of three roles: component, **build**, or
**use**. BUILD phrases are short pattern-locking phrases — fragments are fine so long as they
extend naturally — combining the new LEGO with already-introduced vocabulary only; they play in
the debut round and never return. USE phrases are complete, natural sentences — the kind of
thing a learner actually wants to say — and they are **eternal**: the only role that comes back
through spaced repetition and consolidation. Fragments are never acceptable as USE. Phrase
floors are hard rules — fewer phrases is a fail; variety never substitutes for volume. The
validator's live gate list is on the Pipeline page.

## ZUT — Zero Uncertainty Test

> enforced by: `checkPhraseZUT`
> enforced by: `checkLegoConflict`

Same known text → exactly **one** target form, course-wide, production direction only. If one
known prompt points at two different targets the learner has to guess, and guessing is the one
thing SSi refuses to ask of them. The reverse direction — many known phrasings converging on one
target — is reception, harmless, even a teaching asset. ZUT outranks naturalness: "a native
would more likely say X" is never grounds to change a ZUT-clean mapping. Enforcement is
two-level: a LEGO-level collision rejects the whole seed; a phrase-level collision holds out
only the offending phrase, with a hint to consolidate to the existing target or differentiate
the known-language prompt.

## the known side is a controlled language

> enforced by: `checkKnownSide`
> code: `docs/pair-contracts/_TEMPLATE.contract.cjs`

The known-language prompts are not free English. They compose only from the known-glosses of
introduced LEGOs, a small free class (glue, inflection, NPI-under-negation, do-support), and
constructions licensed by a debuted carrier. Tileability does not license stiltedness: grammatical correctness is HARD and naturalness near-HARD on the known side, and a ZUT compromise is a rare per-case exception rather than a standing licence (Kai, 2026-08-06).
Per-pair rules live in the pair-contract; the free class is known-language specific. Vocabulary
is always **known / target / seed** — never "source".

## tiling and the vocabulary constraint

> enforced by: `checkTiling`
> enforced by: `checkVocabViolations`

Tiling is the sanity check that a seed's target sentence can be fully rebuilt from its LEGO
targets, M-LEGO components, and vocabulary from earlier seeds — coverage, not a unique
decomposition; overlapping tilings are fine by design. The vocabulary constraint is stricter: a
practice phrase may only be assembled from **whole chunks the learner has already met** — never
re-split, re-conjugated or forward-referenced. Together they are the heart of "zero unknowns
except the new LEGO".

## spaced repetition and the round

Runtime structure, owned by the learning app: a LEGO's round runs intro → debut → practice →
review → consolidate. Only USE phrases ever enter spaced repetition, revisited at
Fibonacci-style offsets back through the course; build and component phrases are heard once, in
the round that introduces their LEGO, and never return. Position in a course is always **the
highest LEGO played** — "seed position" does not exist.

## deterministic phrase ID

> code: `services/course-builder/routes/seed-complete.cjs`

Every phrase gets a stable, self-describing ID assigned by the API — agents never set IDs.
Format: `{course}:S{NNNN}L{NN}{R}{NN}` where R is C, B or U — so `fra_for_eng:S0042L03U05` is
the fifth use phrase of LEGO 3 in seed 42. Same phrase, same ID, forever — which is what keeps
audio and learner progress stable across rebuilds.

## Voice 1 and Voice 2

> lives in: `course_audio`

Every course is taught in two target voices, referred to everywhere as **Voice 1** and
**Voice 2**. They are peers, distinguished only by index — never by gender and never by a
primary/secondary ranking; a voice's gender is an attribute of the specific TTS or human voice
assigned to the slot, not part of the slot's name. Data and API use the role names `target1`
and `target2`; the learner's own language is the separate `known` voice.

## retired terminology

Words that no longer describe the system — recognise them, then let them go. **BASE /
COMPOSITE** and the **B, C, F type codes** → A and M. **FEEDER** → componentization replaced
it. **LUT** → ZUT. **BASKET** → phrases live in `course_practice_phrases` with explicit roles
and the runtime assembles a **round**. **Amino acids**, **D-phrases / E-phrases** → gone. The
JSON files (`seed_pairs.json`, `lego_pairs.json`, `lego_baskets.json`, `audio_index.json`) are
legacy artefacts, never sources of truth — content lives in Supabase, and the manifest is
output, not input. The deprecated tables `audio_samples`, `texts` and `audio_files` must never
be written; audio belongs in `course_audio`.
