# The Course Methodology Canon

**This is the one place to look before you touch course content.**

If you are an agent holding a broken row and wondering what you may and may not do to it, the answer is here. Read the decision point that matches what you are holding — a seed, a LEGO, a practice phrase — then read the obligations section, because almost every fix in this system obliges a second fix somewhere else.

Assembled 2026-08-18 from every source that states a rule: the scan-course checks, the course-builder validator, the skills, both doctrine documents, Kai's written rules, Kai's rulings in conversation, and the findings of the people who review courses by ear.

---

## How to add to this

**If you learn a durable rule, it goes here.** Not in a skill, not in a brief, not in a commit message that nobody will read again.

- **Add it with all five fields** (below). A rule without a source is not a rule, it is an opinion, and the next agent cannot tell the difference.
- **If you are not sure whether you understood it correctly, ask Kai** rather than writing your best guess. A canon with an invented rule in it is more dangerous than a canon with a hole, because agents act on it.
- **If your new rule contradicts something already here, do not resolve it yourself.** Add it to the CLASHES list at the top and ask Kai. He rules in one word; you would spend an hour and be wrong.
- **If you cannot tell whether a rule is HARD or SOFT, mark it UNCLEAR** and list it. Guessing wrong in the HARD direction blocks good work; guessing wrong in the SOFT direction ships defects.

Every rule below carries: **the rule in one plain sentence · HARD or SOFT · where it came from · what breaks if you get it wrong · how to check it.**

**HARD** = violating it breaks the course or teaches the learner something wrong.
**SOFT** = judgement, taste, or a default you may depart from with a stated reason.
**UNCLEAR** = nobody has ruled yet. Listed for Kai, not guessed at.

---

# CLASHES — for Kai to rule on

These are places where two sources disagree, or where a check contradicts a stated rule. **They are not resolved here deliberately.** Each is one sentence; each needs one word from Kai.

Two of them (C1, C2) are cases where Kai has *already* ruled and the losing side is still sitting in live files being read by agents.

**C0 is RULED and has left this list.** Kai ruled make-before-break on 2026-08-27; the rule now lives at **A4** and the procedure it replaces at **A19**, and the `scan-course.md` passage has been corrected.

### Where Kai already ruled and the old text survives

**C1 — Must a USE phrase be a complete sentence?**
`ralph-methodology.md` says yes, absolutely, "NEVER acceptable" as a fragment (three separate places, L227–232, L243, L907–919). Kai ruled 2026-08-17 that full phrases are *preferred but not a hard rule*, and a fragment passes if it is standalone-sayable. **10 live locations still state the absolute**, including the text injected into a build agent's context at the moment of failure.

**C2 — Is slightly stilted English acceptable if it tiles?**
`ralph-methodology.md:49` says stilted-but-tileable English is "correct". Kai ruled 2026-08-06 that grammatical correctness is HARD and naturalness near-hard, and a ZUT compromise is a rare per-case exception, "not a standing licence". **10 live locations still carry the losing side**, including a live build agent's prompt and `docs/fix-agent-rules.md:474–481`, which presents the overruled position as "the practical reading" and explicitly flags it as needing Kai's ruling — which he has since given, the other way.

**C3 — Parenthetical tags: banned, or parked?**
Kai: "NO PARENTHETICAL TAGS in courses, ever… they're a pet peeve of mine", and existing ones get removed. But the English-brackets-in-narration objection is explicitly *parked* — "they can't be pulled just like that, so let's look at it later" — and must not be swept up. **And separately**, `docs/.../cue-library-v1-spa` is a *pending proposal to add* parentheticals to learner-facing known_text as house style across four Romance courses. These cannot all stand.

### Kai's own authority

**C4 — Does the Sinhala fix-autonomy grant generalise?**
Written memory (2026-08-06): "I don't quite trust you with fixes yet." Kai, 2026-08-17, on Sinhala: "this is your decision. Do whatever you think is best for the course… seed rebuilds, scan-course passes, direct fixes, audio generation." **Does that grant follow "languages Kai cannot judge", or was it Sinhala only?**

**C5 — Soft conflicts: eliminate, or leave alone?**
Kai, 2026-08-17: the ZUT checker is fine as it is; soft near-conflicts like Italian -o/-a are "not worth making a fuss about". Kai, same day: conflicts "even ones that aren't exactly ZUTs, which we should get rid of anyway". **Get rid of them, or leave them?**

### Rules versus code

**C6 — Gender pairs: ignore, or reject?** scan-course Check 10 says ignore amigo/amiga, "not a real ZUT". The builder's `checkLegoConflict` has no such exemption and returns a 400. A build is rejected for the exact thing the scan doctrine says is fine.

**C7 — Phrase-level ZUT: reject, or warn?** `CLAUDE.md` says "Same known → different target = reject." The code deliberately never rejects — it holds the colliding phrase out and warns, so the seed's good work survives. The code's behaviour is well-reasoned; the rails text describes something else.

**C8 — Is tiling a sanity check or a hard constraint?** `ralph-methodology.md:411` calls it "a sanity check, not a rigid constraint" and L138 says LEGOs "do NOT have to tile perfectly". `course-audit.md:35` calls full tileability CRITICAL. The validator hard-blocks.

**C9 — What does ZUT stand for, and which direction does it run?** "Zero Uncertainty Test" (ralph), "Zero Unprompted Thinking" (course-methodology-analysis), "Zero Uncertainty Translation" (COURSE_BUILDER_BRIEF). Separately, `course-methodology-analysis.md:29` gives fra_for_eng a ZUT direction of French→English, contradicting its own key insight two lines later and every other statement of the rule.

**C10 — Two different definitions of ZUT itself.** Collision-based (ralph: two rows with the same known, different target) versus single-item-hesitation (calibrate, phase1-translation: one card the learner could answer two ways). `docs/fix-agent-rules.md:162` reconciles them on its own authority, which is not authority.

**C11 — Phrase length tiers are defined in three incompatible units.** Relative to the LEGO (`ralph`: LEGO + 4–6 syllables), absolute (`course-audit`, `ssi-phrase-variety`: 6–9 syllables), and in words (`course-resume`: 6–9 words). **Six different syllable specs and six different phrase-count specs exist across the estate.**

**C12 — Do phrase tiers block a submission?** `ralph:284` says warning-only, never blocks. `course-audit.md` calls failure HIGH severity. `course-resume.md:153` lists it among errors that fail a submission. The code (`checkPhraseComplexity`) applies hard minimums from seed 6 — **unresolved whether the caller demotes it to a warning.**

**C13 — May a particle appear as a component at all?** `ralph:120–134` shows a particle listed as a component with `introduce:false`, still needed for tiling. `jpn-analysis-example.md:168–217` says it must be omitted entirely and calls including it "BULLSHIT". Both are live files.

**C14 — Are components exempt from ZUT?** `glossary.md:54` says their known side is exempt. `phase1-translation/PROMPT.md:229` says a component can fail ZUT.

**C15 — Are overlapping LEGOs the default or the exception?** `ralph:138/421` — "expected and encouraged", and a pre-submission checklist item. `layered-decomposition-brief.md:25` — don't create one when the composition is transparent, "no boring overlaps".

**C16 — Same English → two different target words.** Every absolute statement of ZUT forbids it. `phrase-fixer.md:31–35` carries a Kai-sourced carve-out saying it is an accepted technique when the target needs a distinction English cannot make, constrained only by placement. That carve-out appears in no doctrine file.

**C17 — "I want" as one chunk or two.** `ralph` and `calibrate` both use 我想 as an exemplary M-LEGO. `synonym-choice-architecture.md:108` names exactly this as an over-chunking failure — 我 + 想 are each meaningful units and should be atomic.

**C18 — Literal glosses or whole-intention glosses?** `tools/breakdown-flat.cjs:65` — "parts get LITERAL glosses". `ralph:177` — "gloss the whole intention, never the sub-word". May be legitimately scoped to component rows, but it is written as a general instruction and labelled ZUT.

**C19 — Two checks are both called "Check 17."** Under-spread LEGOs (line 613) and language-specific patterns (line 1001). The report template prints only the second. Any citation of "Check 17" is ambiguous.

**C20 — The defect humans name first is the one the machine is told not to look at.** Aran's headline Irish finding is "some very odd sentences". scan-course's only LLM pass is instructed: "Do NOT judge grammar, spelling, naturalness, or meaning." Nothing in the pipeline tests whether a sentence is one a native speaker would say.

**C21 — Deborah's whole Welsh finding set is structurally invisible to the scanner.** Her findings are disagreements between displayed text, presentation, and individual voices. scan-course reads text tables and never joins `course_audio`. No check anywhere compares what a voice actually spoke against the displayed text, or two voices against each other.

**C23 is FIXED and has left this list.** *(Raised and closed 2026-08-27.)* `/regenerate-presentations` used to answer "the introduction template text changed" by deleting the LEGO's `course_audio` row in batches of 200 and nulling `presentation_audio_id`, *then* re-rendering — so a run that died in the gap left every slot it had reached silent, with the clip's revision history, flags and sign-offs deleted along with it. The refresh is **addition-only** now: the new pending row goes in beside the old one, the old row and the FK are untouched, and the swap happens per item only after `/generate` has rendered, veracity-gated and uploaded the replacement. Superseded rows are left unlinked for a separate cleanup pass, as the flag-and-regenerate path already does; the legacy null-`lego_id` orphan delete is gone too. The precious-audio guard is unchanged. Proof is a partial-failure test — `tools/audio-regen-probe/intro-change-make-before-break.test.cjs`, real Postgres on the live schema — that kills a run after 7 of 19 renders: the old path leaves **12 slots silent**, the fixed path leaves **0**.

**C22 — "Practice after every introduction" is a must-check for the human and informational for the machine.** Deborah re-tests it across stages. scan-course Checks 16/17 are documented as "informational… never blocks a build". The legacy check that *did* block has a whitelist escape hatch.

---

# PART ONE — THE RULES

## 0. Before you touch anything

**R0.1 — Every fix must leave the whole course consistent, not just the row correct.** · **HARD** · Kai, 2026-08-06, restated and hardened 2026-08-12 · A grammatically correct fix the learner was never prepared for is *worse* than the original error, because it asks for something never taught · Check the seed, the LEGOs, and the practice phrases from everywhere in the course — not just the row you are editing.

Kai's questions, to ask on every fix:
- Will the learner know to say this, or could they be understandably confused?
- Has the corrected form actually been introduced *before* this point?
- Does the LEGO or card still teach the old form, contradicting the fix?
- If a word is taught as two different things, is there a reason? If they must stay separate, are they used consistently in different contexts and never mixed?

> "Basically **every fix needs to involve a thorough check of all the possible ways that phrase could break the course**. That's the same for every course, and every type of fix I ask you to do." — Kai, 2026-08-12

**R0.2 — No new grammatical case may appear without introduction, even when the resulting sentence is correct.** · **HARD** · Kai, 2026-08-12: "And no, we can't give new cases without introduction." · This closes the most tempting escape hatch when a flagged phrase cannot be fixed within taught material · Rebuild from LEGOs attested at or before that seed, citing each one — or delete the phrase.

**R0.3 — The fix space is wider than minimal edits: rewriting the whole phrase, or deleting it, are both legitimate.** · **SOFT** · Kai, 2026-08-06: "Don't be afraid to completely reword phrases (both target and known sides of course)… And don't be afraid to just delete a phrase if you can't fix it easily." · Contorting a bad phrase into a slightly less bad one is the worse outcome · Rewrites and deletions get reported for approval rather than applied silently — they are bigger calls than a grammar correction.

**R0.4 — Follow the escalation ladder in order; do not skip to the sweep.** · **HARD (process)** · Kai, 2026-08-06 · A sweep built on an unverified fix propagates the error instead of the correction · (1) fix the one-off, (2) verify it is right *and* leaves the course consistent, (3) check the same pattern elsewhere in that course, (4) then, if applicable, other courses.

**R0.5 — Check every affected row by hand; never extrapolate from a sample.** · **HARD** · Kai, 2026-08-11 and 2026-08-15: "I do want you to check ALL the affected phrases by hand… Before we consider it." / "read through all the proposed changes, no spot-checking." · A plan whose coverage is partly extrapolated *reads as complete when it isn't* · State coverage honestly: "1,200 of 1,365 read individually, 165 inferred" is acceptable; "1,365 rows fixed" when 165 were sampled is not. Cost is not the constraint — confidence is.

**R0.6 — Never derive an estate-wide text rule from one course's evidence.** · **HARD** · Kai, 2026-08-11; proven by the "if" hand-check across 4,411 phrases · Every course hid a different trap: German "as if" → *als ob* would have become "as whether"; Swiss German spells it with an umlaut; Austrian *ob* also means "down"; Pennsylvania Dutch *eb* also means "before"; Croatian *li* is a question particle · Select on the **English sense**, never on a pattern matched against target text.

**R0.7 — Consistency decisions belong to the course they were made for.** · **HARD** · Kai, 2026-08-12: "the it's/it is rule is a **finnish-specific** one, but different courses will have different decisions made." · Applying one course's convention to another produces text that is internally coherent, passes every gate, and is simply wrong · Ask which course a convention was decided for before applying it. **The live DB outranks any document, and a documented rule is a hypothesis to verify.**

**R0.8 — Before reporting a defect in a course Kai actively rules on, check his decision log — or you will hand him back his own decisions as bugs.** · **HARD** · Three Finnish rows flagged as "still unfixed" were his own approved resolution · An automated conformance scan silently reverts his rulings unless the exceptions are recorded where the scan can see them.

**R0.9 — A raw match count in a brief is a hypothesis to re-derive, not a work order.** · **HARD** · The pdc `welle` case: a brief called for replacing 387 instances; discriminating first found **three different words** — 239 were the real defect, **138 were Kai's own deliberate choice**, 10 were the interrogative. A blanket replace would have destroyed 148 correct phrases.

---

## 1. What a SEED is, and what makes one valid

A **seed** is a sentence from the course curriculum — the thing the learner will eventually be able to say. It is delivered to the learner by being broken into LEGOs.

**S1 — A seed is a vehicle for delivering LEGOs, not the point in itself.** · **SOFT** · `ralph-methodology.md:405–409` · You optimise the sentence instead of the teaching units and produce one opaque blob per seed · Human judgement.

**S2 — Every seed must rebuild perfectly, in BOTH languages, from its own decomposition plus already-taught vocabulary.** · **HARD — this is the master rule; most other failures are special cases of breaking it** · `ralph-methodology.md:21` · The learner is asked to produce something they were never given the parts for; the round is unanswerable · Automatic on the target side (tiling + vocabulary gates in `POST /api/seed/complete`). **The known-side half is human judgement unless a pair-contract exists.**

**S3 — The seed must tile from its LEGOs: no words missed, no words added.** · **HARD** · `ralph-methodology.md:411–418`; `course-audit.md:33–42` · A piece of the seed is never taught · **Automatic — tiling gate, hard-blocks, runs even for golden seeds.** Note: multiple valid tilings are fine and overlap is encouraged (S4).

**S4 — Multiple valid tilings are expected; overlap between LEGOs is the teaching mechanism, not a defect.** · **SOFT** · `ralph-methodology.md:419–422` · You suppress overlaps to force a unique tiling and lose the mechanism · Human judgement. **See clash C15.**

**S5 — Nothing a seed leans on may be acquired by accident.** · **HARD** · `ralph-methodology.md:23` · "Grokable from context" is fine for reinforcement, **never** for a piece the seed actually needs to be rebuilt · Partly automatic (vocabulary gate); the "declared component" half is human judgement.

**S6 — You may not quietly reword the seed; your known_text must match the canonical seed after normalisation.** · **HARD** · `ralph-methodology.md:397–399` · The course teaches a different sentence than the curriculum promises · **Automatic — 400 CANONICAL MISMATCH on submission.**

**S7 — Never change canonical meaning in translation, even when the target grammar gets complex.** · **HARD** · `ssi-translation-methodology.md:22–36` · "I want you to speak" silently becomes "I want to speak" — a different sentence · Human judgement; no gate.

**S8 — A seed with five or more known-side words must never be wrapped in a single LEGO; aim for 3–5 LEGOs.** · **HARD** (stated as a must, but no gate exists) · `layered-decomposition-brief.md:7–20` · The learner gets one opaque blob and zero recombination — they cannot say any variant of it · Human judgement / checkpoint spot-check. **No automatic LEGO-count gate exists.**

**S9 — Late-course seeds may legitimately be very short, as few as 2–3 LEGOs.** · **SOFT** · `ralph-methodology.md:422` · You pad a late seed with redundant LEGOs · Human judgement.

**S10 — Seeds 1–10 get one-at-a-time human review; parallel building starts only after the seed-10 checkpoint is approved.** · **HARD (process)** · `ralph-methodology.md:951–974` · Seeds 1–10 bootstrap every pattern the rest of the course recombines; getting them wrong cascades · **Automatic — build halts at CHECKPOINT_REACHED until approval is POSTed.**

**S11 — A seed edit's blast radius is the whole course, and nothing checks it automatically.** · **HARD** · Kai, 2026-08-17: "Seed text edits are quite serious — they can affect the legos and the phrases and all phrases that use something from the seed all over the course. And therefore all of that audio (including the presentations of any affected legos)… Any changes like these need to trigger a check of the effects." · See the obligations section (O1) — this one has teeth and no automation.

**S12 — A formal-register seed that uses informal material is itself defective; fix the seed, not the phrase.** · **HARD** · Kai, 2026-08-17 · The seed changes (Finnish: `sen` → `hänen`) and its LEGO carries the formal marking · Human judgement.

**S13 — Where a register or category needs a marker word, the seed introduces it FIRST so every phrase can use it.** · **HARD** · Kai, 2026-08-17 (Finnish herra/rouva) · Phrases cannot signal a register whose marker has not been introduced.

---

## 2. What a LEGO is, and what makes one valid

A **LEGO** is a chunk the learner is taught as one unit and can then recombine. **A LEGO introduces new vocabulary — that is what a LEGO IS.**

**L1 — New vocabulary in a LEGO is REQUIRED, not a defect. Never contort a fix to avoid a new word.** · **HARD** · Kai, 2026-08-18: "that's the definition of being in the course, a lego by definition will have something new. Just need to make sure it fits the course (the word is in the seed, affected phrases are fixed if needed)." · Applying the practice-phrase rule ("never use an untaught word") to a LEGO produces mangled sentences dodging words the card was entitled to teach · **The two tests are FIT:** (a) the word belongs in its seed, (b) every downstream practice phrase using that LEGO still works afterwards — and where it does not, those phrases are fixed **in the same pass**, never left dangling.

**L2 — A LEGO must be a meaningful unit in itself.** · **HARD — stated as the methodology's hard constraint, not a guideline** · `synonym-choice-architecture.md:82–87` · You mint a card whose whole content is "this is a question marker" and the learner can produce nothing from it · Human judgement; partial proxy in `course-audit.md:44–59` (red-flag words in component known_text).

**L3 — A LEGO's target is capped at 8 syllables, and this cap runs even under skip_validation.** · **HARD** · `language-config.cjs:61` (`MAX_LEGO_SYLLABLES = 8`) · Rejection; pedagogically, an oversized LEGO exceeds what the learner can hold as one chunk · **Automatic, always-on. This is the one size limit that genuinely rejects.**

**L4 — A-LEGO is a single meaningful word; M-LEGO is a multi-word chunk. Type is author-declared, never computed.** · **HARD (structural)** · `ralph-methodology.md:94–116` · An M with no components[] is rejected; a mistyped LEGO passes silently and misleads every later reader · Automatic type/components check.

**L5 — When an atom fails ZUT, chunk it up with the context that resolves the ambiguity.** · **HARD** · `calibrate.md:39–48` · The learner hesitates between je/moi/me and confidence collapses · Automatic only after the fact; choosing the chunk size up front is judgement.

**L6 — Pronouns, articles, prepositions and conjunctions are near-always ZUT failures and should not be bare A-LEGOs.** · **SOFT** (explicitly "usually") · `calibrate.md:268–287` · "with"→avec plus "you"→tu assembles to "avec tu" · Human judgement.

**L7 — Grammatical particles are construction-features, never atomic LEGOs.** · **HARD** · `ralph-methodology.md:25,157–177`; `synonym-choice-architecture.md:266–274` · A category error: the card asks the learner to *mean* something that is not a unit of meaning, so it never reads naturally · The learner never forms an intention to "say 吗" — only to mean a whole thought the particle helps build. **See clash C13.**

**L8 — A particle is consolidated, not introduced: made salient only once enough whole-thought carriers already exist.** · **HARD** · `ralph-methodology.md:166` · Placement is **pull, not push** — the signal that the moment has come is that carrier phrases already exist in earlier baskets · Human judgement.

**L9 — A particle's first exposure is a contrastive twin debut — two or three overlapping carriers sharing it, never a bare debut.** · **HARD** · `ralph-methodology.md:168–175` · The learner has one instance and no contrast, so nothing is inferable · Human judgement.

**L10 — A multi-sense particle is introduced once per real usage, and at least one context must reconstruct the seed's own use of it.** · **HARD — a sense the seed uses but you don't teach is an ERROR** · `ralph-methodology.md:25`.

**L11 — Glosses name the whole communicative intention, never a grammar label or a sub-word.** · **HARD** · `ralph-methodology.md:27,55,177` · "把 = object marker" costs cognitive action and yields zero confidence · Warning-level check exists (`checkMetadataGloss`). **See clash C18.**

**L12 — Idiomatic, non-derivable combinations are taught whole.** · **HARD** · `ralph-methodology.md:31` · The learner composes "prepare + good" and gets something that does not mean "ready".

**L13 — Introduce the A-LEGO before the M-LEGO that contains it (non-greedy introduction).** · **HARD** (pre-submission checklist item; no gate) · `ralph-methodology.md:454–461` · The M-LEGO arrives entirely new; cognitive load doubles and the pattern is not inferable.

**L14 — Use an overlapping LEGO only where something non-obvious happens between the small piece and the big one.** · **SOFT — "the art is knowing the difference"** · `layered-decomposition-brief.md:23–68` · Redundant drilling that bores the learner and buys no inference · The test: "would the learner be surprised by how these pieces combine?" **See clash C15.**

**L15 — Each LEGO must be able to appear naturally in 3+ other sentences; if not, redraw the boundaries.** · **HARD** (checklist item) · `layered-decomposition-brief.md:88–92` · A single-use chunk costs a slot and yields nothing.

**L16 — Decomposition is driven by phrase quality, not tiling logic.** · **HARD** · `ralph-methodology.md:937–947` · Always ask "can this LEGO make meaningful BUILD phrases with existing vocabulary?" — a LEGO that tiles perfectly but cannot be practised (Dutch bare "hoe") is a wrong decomposition · Rebundle.

**L17 — Suppress a debut (`is_new:false`) only for a pure same-meaning restatement.** · **HARD** · `ralph-methodology.md:57` · The lever is minor by design — ~15 of ~1,100 rounds in the zho audit · Distinct words, idiomatic chunks, overlap-ladder rungs and deliberate nuance re-debuts all keep their debut.

**L18 — LEGO 1 of seed 1 cannot carry content, because the learner knows only that one word.** · **HARD** · Kai, from first principles, overturning a completed worker chain (Finnish) · There is nothing to recombine with; a LEGO 1 that carries content is unanswerable.

**L19 — Needing to add a tag or a slash is a DIAGNOSIS that the LEGO is under-contexted.** · **HARD on scope, SOFT on the diagnosis** · Kai, 2026-08-18: "the need to add a tag and/or slash in the item does suggest the lego could possibly do with more context (merging to a relevant sister lego)… Even if a lego isn't going to actually clash, it could cause confusion." · You ship the tag (violating the no-parentheticals rule) or strip it and leave the cause untouched · **Non-clashing items in the same class stay in scope** — confusion is broader than collision.

**L20 — Where one target word carries two known meanings, separate the senses by word or by context, then drill both.** · **HARD (procedure)** · Kai, 2026-08-17 (Sinhala අහනවා = ask/hear) · The learner cannot know which answer is wanted — the one-prompt-two-answers defect in reverse · **The procedure, in order:** (1) do both senses actually come up in seeds? If only one, stick to it and align outliers — done. (2) If both, separate them, by **either** a distinct known-language word **or** distinct context carried in the LEGO itself by merging with sister LEGOs — these have **equal standing**, not a preference order. (3) All practice phrases stay consistent with the split; any phrase the learner could misinterpret is removed or fixed. (4) Enough phrases for BOTH senses that the distinction gets drilled.

**L21 — A word that appears in a seed must be drilled as part of a pattern, not left as a one-off.** · **HARD (the test), SOFT (the remedy)** · Kai, 2026-08-17: "If 'nimi' comes up in a seed then we should make sure it's not just a one-off. we need to make sure we drill a pattern… **Sometimes the answer is to add more, not less.**" · **The two-part availability test:** is the word available at this stage, *and* is it clear enough? Every gate we own answers only the first · An agent's reflexive fix (delete the offending phrase) is the opposite of what is wanted.

**L22 — A bound element that cannot stand alone grows to the verb IN ITS OWN SEED — not to the commonest verb, and never to a placeholder.** · **HARD (which verb), SOFT (edit-versus-delete on each phrase)** · Kai, 2026-08-27 · Six courses hit this independently and invented four different answers · The standing rule is that when one side cannot be broken down, the other side grows to match — but a bound element attaches to a *different* verb in every phrase (吧 appeared with roughly eight verbs across eight prompts), so "merge with its neighbour" looked to have no single answer. **This rule ends that.**

> "Grow it to whatever is in the seed. What does the seed say? Then the learner will just practice different phrases with that specific one - the phrases should be removed or edited as a result, of course. Same for phrases that include it, that are under future seeds. If it comes up again in a seed, we teach it with the new verb that seed uses - now the learner has two verbs to use it with. They might see the pattern and start using it in other places. Technically, if the 吧 stays a component in the M-lego, it will be available to mix with other verbs in the future. But in the beginning, when it is first introduced, it is better to keep it simple and only use it with one thing. But there is nothing blocking it being used with other verbs later when the learner is used to it. We should make sure it is drilled enough and not just dropped, anyway, and then gradually introduce new verbs, if we want to do it properly." — Kai, 2026-08-27

**The procedure, in order:**
1. **The seed decides.** Merge the bound element — a Japanese bound ending like the potential inside 覚えられる, a Chinese particle like 吧, a stranded inflection — with the verb **in its own seed sentence**. Not the commonest verb across the phrases, not a representative one.
2. **Practice phrases under that LEGO that use a different verb are EDITED to the taught combination, or DELETED.** Prefer the edit where the sentence still teaches something; delete where an edit would produce a sentence nobody would say. **Variety at first introduction is a DEFECT, not a virtue.**
3. **The same applies to phrases under LATER seeds** that use the element with another verb.
4. **Exception, and the designed path:** if a later **SEED** itself uses the element with a different verb, that seed is where combination two is legitimately taught. **Do not flatten it.** This is how generality is built — deliberately and gradually, not by accident at the debut.
5. **Keep the bound element as a COMPONENT of the merged M-LEGO.** That is what leaves it free to recombine later; merging does not close the door.
6. **Drill it enough.** "We should make sure it is drilled enough and not just dropped." If editing and deleting drop the LEGO below the phrase floor, **author new phrases using the taught combination** rather than leaving it thin (L21 — sometimes the answer is to add more, not less).

**Ruled out explicitly:** a label containing a gap, tilde, bracket or placeholder standing in for "whatever verb comes here". Kai on that option: **"yeah, this one is a no-go."** It produces a lesson the learner cannot say aloud. **See K11 and L19** — the same never-invent-notation rail, reached from a different direction.

**Obligations:** this is a LEGO edit, so O2 and O6 both fire; edits and deletions of phrases are reported rather than applied silently (R0.3, and see "What is Kai's call").

---

## 3. What a PRACTICE PHRASE is, and what makes one valid

A **practice phrase** is a sentence the learner is asked to produce. There are two kinds, and **the rules differ**.

**P1 — A practice phrase must be buildable from material already taught by that point. No untaught words.** · **HARD — this is the constraint that pairs with L1** · Kai, 2026-08-18 · A correct sentence built from untaught LEGOs is **not an acceptable fix** · Automatic on the target side (vocabulary/tiling gate). Known side is gated only where a pair-contract exists — see the enforcement table.

**P2 — Phrases tile from WHOLE already-introduced chunks, never re-split into words.** · **HARD** · `ralph-methodology.md:516–524` · This is what blocks untaught conjugations, inversions and contractions: if a wording needs a form you have not introduced as a whole chunk, it fails · Vocabulary accumulates strictly in seed/index order — **never a later sibling, no forward references** · Automatic.

### BUILD phrases

**P3 — A BUILD phrase shows the new LEGO plugging into what the learner already knows.** · **HARD** · `ralph-methodology.md:184–219` · BUILD phrases are NOT random extensions and NOT the bare LEGO in isolation ("how → hoe" is not a BUILD phrase) · Automatic — the BUILD anti-template gate rejects the LEGO plus a short filler tag.

**P4 — BUILD phrases play once, in context, and are never replayed.** · **HARD** · Kai, 2026-08-17: "Some short bits can be confusing when not in the context of having just heard the presentation… So we only play build phrases in context, and never again." · **Fragments are fine here** — the presentation just framed them · Not eternal-eligible; never enters spaced repetition.

**P5 — BUILD quantity is governed by cognitive load, not an arbitrary count.** · **SOFT** · `ralph-methodology.md:196` · If the LEGO is already long, you add almost nothing · **But note the enforced floor is 3 from seed 4 onward. See clash C11/C12 — six different specs exist.**

### USE phrases

**P6 — A USE phrase is replayed later, out of context, so it must never be confusing or misleading when met cold.** · **HARD** · Kai, 2026-08-17 · This is the whole reason the two roles exist · All USE phrases are eternal-eligible and enter spaced repetition.

**P7 — Full phrases are PREFERRED for USE but this is NOT a hard rule.** · **SOFT — Kai's ruling, 2026-08-17** · A shorter USE phrase is acceptable if it is (a) clear, (b) unambiguous for the **remainder** of the course — forward-checked, not just backward — and (c) longish · **The test: "something that you could say on its own in a conversation."** Not necessarily grammatically complete — people say incomplete things — but standalone-sayable · Non-full USE phrases need *more careful checking*, not prohibition. **⚠ Ten live files still state the overruled absolute — see clash C1.**

**P8 — A fragment's fate is decided by WHERE its conflict sits in the course.** · **HARD** · Kai, 2026-08-17: "If it's only later in the course, then it can be a build. If it's both earlier and later, then we should avoid it as a fragment, add context to it so it's clear." · Keeping an earlier-and-later ambiguous fragment as a build leaves the learner meeting a cold prompt with two right answers.

**P9 — Every USE phrase must vary along the axis the new LEGO actually changes.** · **HARD** · `ralph-methodology.md:33` · Swapping only the subject pronoun (我→你→他) holds the frame constant and teaches nothing · **BUILD may repeat frames** — its job is to automatise the chunk. **USE must buy a new frame per phrase**, because a low-diversity USE basket pollutes the eternal review pool forever · Partial check: `tools/audit-frame-diversity.cjs`; the builder's own frame-coverage warning is blind to topic-swaps.

**P10 — Every newly-taught LEGO needs practice: at minimum a build phrase and about two use phrases.** · **HARD** for empty (0 build + 0 use), **SOFT** for "fewer than 2 use" · scan-course Check 16 · A LEGO introduced and never practised is not taught · **Reported, never blocks.** Deborah checks this by hand and re-tests it across stages — see clash C22.

**P11 — A chunk taught once and never reused later gets no spaced repetition.** · **SOFT — explicitly informational, never blocks** · scan-course Check 17 (first of two with that number) · Hand-crafted Welsh originals sit at 6–9% orphans; machine-built courses left unchecked sit at 20–55% · **Runnable: `node tools/backfill-spread/analyze.cjs {course} --max-uses 1`** — add `--cjk` for unspaced scripts or the numbers are inflated artifacts.

**P12 — Reinforcement is a taper, and a contrast is never opened before both sides exist.** · **SOFT** · Kai, 2026-08-17: "add LOTS of phrases… to the seed and after… Then add a lot of them for the next few seeds wherever they can fit, then get sparser as you continue." And: "Best not to swap the pronoun before the other one is introduced or it might spook the learners too soon." · Spreading phrases evenly gets the volume right and the shape wrong — the drilling never reaches critical density at the point of confusion.

**P13 — When the first item of a new marked category debuts, practise it only with category-compatible material.** · **HARD (standing pattern)** · Kai, 2026-08-17, explicitly asked to be logged as a general pattern: "This is an issue that comes up often, worth logging it as one so I don't need to re-explain the solution." · **Two tests, both checked against the course data:** (1) the LEGO works in that marked setting as it stands; (2) **no marked counterpart is coming later** — if a more-formal version debuts later, using the plain one here teaches a pairing the learner will later be told was informal · Fragments and short builds from compatible material are legitimate here.

**P14 — Unlikely to come up is NOT a defect.** · **HARD (triage rule)** · Kai, 2026-08-17: "It's fine, weird thing to say, but it's grammatically fine and doesn't sound unnatural. Just something that's unlikely to come up, which is fine." · A sweep flagging "would a learner ever say this?" generates a queue of non-defects and spends Kai's scarcest resource disagreeing with it · **Distinguish "nobody has occasion to say that" (fine) from "nobody would phrase it that way" (fix it).** Raise it only when the phrase ALSO fails on grammar or naturalness.

**P15 — Deliberate ambiguity is a teaching tool; do not normalise it away.** · **HARD (per-course)** · Kai, 2026-08-12, on Finnish seeds 20/21 · He ruled to MIX two confusable cases and drill them, accepting the learner will initially misread the trigger — "the misreading is corrected by exposure, and arriving at the real conditioning from context is the learning" · **The ruling is not valid without the volume of practice phrases it requires** · A ZUT-style or consistency sweep that "normalises" this destroys a deliberate design. **The invariant underneath: the grammatical choice is always made by grammar, never by which pronoun appears.**

---

## 4. The known side versus the target side

**K1 — The known side is a controlled language too, not free natural English.** · **HARD** · `ralph-methodology.md:45–49` · A prompt using unlicensed machinery is *unmappable* — it forks or stalls production exactly like a target-side ZUT violation · Every prompt must compose from: the known-glosses of introduced LEGOs, the **free class** (glue words, -s/-ed/-ing inflection, "any/ever" under negation, do/does/did), and constructions **licensed by a debuted carrier**.

**K2 — ZUT: one known intention → exactly one target form, course-wide, always.** · **HARD — the top rail** · `ralph-methodology.md:39`; `CLAUDE.md` · A learner with a deterministic production function interacts fearlessly; one juggling natural variants freezes · **It runs in the PRODUCTION direction, on intentions.** The reverse — one target rendered by several natural English phrasings — is the *reception* direction and is **harmless**. Never atomise a construction-feature just because its English shadow varies.

**K3 — Two different known prompts mapping to the SAME target is not a defect. The reverse IS.** · **HARD** · Kai, 2026-08-06 · It may be redundant, especially when the twins sit next to each other, but it is not an error · Do not spend attention on the harmless direction.

**K4 — ZUT is enforced at the level of the thing that collides.** · **HARD** · Tom, 2026-06-14 · A **LEGO's** colliding known→target is the seed's core wiring — hard reject, fix and resubmit. A **practice phrase's** colliding known is held out per-phrase — never inserted, so the guarantee holds, while the seed and every conforming phrase still save · **ZUT is never a reason to lose a whole seed of good work.** See clash C7.

**K5 — Do not widen the ZUT checker to catch soft conflicts.** · **HARD** · Kai, 2026-08-17: "The ZUT checker is fine as it is, it catches the really obvious ones. The others are a bit soft and fuzzy, so they need us to look at them properly to decide." · Widening it floods the queue with technically-true non-defects · **The severity test is the LEARNER'S EXPERIENCE, not formal correctness:** if the learner says one form and hears another, would they notice — and if they noticed, would it derail them? Italian -o/-a fails both tests. **See clash C5.**

**K6 — The known side MAY use uninstructed forms of taught words; only genuinely different WORDS are defects.** · **HARD** · Kai, 2026-08-17: "Sometimes grammar in known is more complicated than the target… the known can use a different case, or conjugation, contraction, gender or whatever if it needs, even if it isn't introduced… They'll try with the closest thing they know, and be pleasantly surprised." · **The controlled-language constraint on the known side is about LEXEMES, not surface forms.**

**K7 — A known-side finding is NOT serious by definition. The real question is: can the learner produce the answer yet?** · **HARD — this is the framing rule that kills most known-side findings** · Kai, 2026-08-17/18 · It killed 467 of 486 findings in a German sample · **Three tiers:**
1. **Fine (design):** a contraction, gender, case or conjugation of a word they know.
2. **Mild defect — fix by removing or editing the phrase:** a *distinct lexeme* for a concept whose mapping they were taught differently. Kai's example: "know" taught as *sapere*, then a phrase needs *conosco* — to the learner it feels like a whole new word, "it could scare a learner a bit too much". It becomes legal the moment any form of *conoscere* is introduced.
3. **Serious:** the learner has NO CHANCE of guessing at all — even the reach for the closest word is unavailable. **Even if the pair is technically correct, the SCARE alone makes it serious.**

This adjudication needs language knowledge, not string matching. **A matcher cannot place a finding on this scale.** Run it as a background programme, course by course: tick off tier-1 acceptable findings first, then take the remainder one by one.

**K8 — The TARGET side stays strict, always.** · **HARD** · Kai, 2026-08-17 · Every target sentence tiles from taught chunks, no exceptions. K6 and K7 are known-side latitude only.

**K9 — English must be grammatical AND natural; a ZUT compromise is a rare justified exception, not a licence.** · **HARD (grammar), near-HARD (naturalness)** · Kai, 2026-08-06, explicitly settling a documented contradiction between two methodology docs: "It shouldn't sound very weird, especially when English is the target language. It should be grammatically correct — sometimes we might need to pick something slightly suboptimal for ZUT reasons, but usually that's not necessary." · **See clash C2 — the overruled position is still live in 10 places.**

**K10 — Register compatibility is a hard constraint wherever formality matters.** · **HARD** · Kai, 2026-08-17 · **Three rules:** (1) every phrase on a formal card carries a register signal the learner can SEE in the prompt, carried *inside the sentence* ("…, sir" / "…, madam"); (2) a formal seed using informal material is a seed defect (S12); (3) **any informal LEGO with no formal version introduced is UNAVAILABLE inside formal phrases** — "They're just not compatible." · **The test: imagine the phrase spoken in a formal setting for THIS course's language, near its own baseline** — Finnish barely uses formal, so imagine addressing the president; Japanese must NOT imagine the emperor, rather a new friend you don't want to seem rude to.

**K11 — NO PARENTHETICAL TAGS in courses, ever.** · **HARD** · Kai, 2026-08-17: "they're a pet peeve of mine." · Register, plurality, grammar notes — all carried inside the sentence or not at all · **They also get spoken aloud**: bracketed English in narration is read to the learner exactly as written. When one word needs disambiguating, the answer is a **narrower plain gloss that survives being spoken** ("to know a person", not "to know (a person)") · **See clash C3 — the narration-brackets objection is separately PARKED and must not be swept up.**

**K12 — Every language pair gets its own rule layer; never copy one pair's rules to another.** · **HARD** · `ralph-methodology.md:63–67` · The Chinese rules are instances of categories, not universals · The free class, inflection and machinery are **known-language-specific** — English regexes must never gate a non-English-known course · **If the contract is absent the known-side check silently skips.**

---

## 5. Audio and text agreement

**A1 — The clip must speak the text it is linked to.** · **HARD** · *Stated in no doctrine file at all* — it exists only as the intent behind Check 18 · The learner hears one thing and reads another.

**A2 — A presentation clip must say exactly what its LEGO says; fix both in the SAME pass.** · **HARD** · Kai, 2026-08-11: "presentations should reflect the lego — so if the legos are fixed, presentations should be fixed to say the same thing as the lego as well. **That's kind of a general rule.**" · A text fix that leaves the presentation speaking the old wording is **not a fix** · **Runnable: `node tools/check-presentation-drift.cjs <course|--all>`.** Three things follow: a mislabelled clip gets **regenerated** without the label, not hidden or unlinked; removing a disambiguating tag causes ZUT collisions and handling them is part of the job; and **the defect often lives in the frozen audio text, not the authored tables** — mirror the LEGO's own known_text rather than stripping characters.

**A3 — Read the coverage line, not just the count. A run below 99% coverage is a FAILED run, not a clean course.** · **HARD** · `tools/check-presentation-drift.cjs` · **This is the single most transferable principle in the repo** — see the false-positive cases · Anything unparseable is reported as UNPARSED and counted, never dropped.

**A4 — Make-before-break: generate and verify the new asset before the old one is touched, always.** · **HARD** · **Kai's ruling, 2026-08-27, closing clash C0**; `CLAUDE.md`; the fra_for_eng purge left ~2,000 slots silent for two days · (1) generate new audio, (2) verify each new clip is alive and correct-voiced, (3) swap links atomically, (4) only then delete the old clip · **Deletion never precedes a verified replacement — not even "we'll regenerate right after."**

> **C0 ruled, 2026-08-27.** `scan-course.md` told agents to delete the old `course_audio` record, then unlink, then regenerate — the exact shape of the two-day outage. Kai ruled for make-before-break and the passage has been rewritten (`.claude/commands/scan-course.md`, "Stale Audio After Text Changes"). The evidence that decided it: **two generation jobs died mid-run on 2026-08-27**; under delete-first one of them would have left **57 slots silent on a live course**, and as it was nothing was lost. The reasoning stands on its own — a job that dies between the delete and the regenerate leaves silence, and a job dying mid-run is not rare.
>
> **The strengthened form: for a text change, do not delete the old clip at all** — not even last. See **A19**. Deleting a `course_audio` row cascades away its repair candidates, its QA flags, its human sign-offs, its revision history and its envelope, and forecloses both a revert and any reuse. An unlinked row reaches no learner, so there is nothing to gain by deleting it.

**A5 — Editing text mutates audio links, and the database now does that for you — safely, and it logs it.** · **HARD** · **Re-verified against the live DB 2026-08-27; this supersedes the 2026-08-17 reading below, which is now factually wrong** · All three content tables carry an enabled BEFORE UPDATE trigger — `trg_null_seed_audio_on_text_change`, `trg_null_lego_audio_on_text_change`, `trg_null_phrase_audio_on_text_change` — and all three behave the same way: **keep** the link if the clip still speaks the new words (whitespace/casing/trailing punctuation only), else **re-link to a same-voice clip** that does (`audio_id_for_text_same_voice` — the voice can no longer be silently swapped), else **NULL** it; and write a row to **`content_audio_link_drops`** recording old and new audio id, old and new text, old voice and the reason. 1,783 drops logged 2026-08-17 → 2026-08-27 · `course_legos` additionally **respects a link you set in the same UPDATE as the text** (the audio-first repair shape); `course_seeds` and `course_practice_phrases` do not, and will overwrite one · **A text-only fix still never is one — but the unlinking step is no longer yours to write.** *(The superseded 2026-08-17 reading — "course_seeds has no trigger; the phrase resolver ignores voice" — was true when written and is not true now. Do not act on it.)*

**A6 — Render the audio FIRST, then update the text.** · **HARD (sequencing)** · The phrase trigger re-resolves on text change, so a clip uploaded after the UPDATE leaves the row silent · Fix `course_audio.text` before the phrase/lego text that points at it.

**A7 — Full stops make no difference; question marks are significant.** · **HARD (triage)** · Kai, 2026-08-17: "Full stop makes no difference btw! Question marks can make it sound different so they're significant enough to regenerate if needed." · **The stale-audio programme flagged 155 jpn clips as stale purely on a trailing full stop — on this ruling every one is clean** · Re-rendering identical clips costs money and finds nothing.

**A8 — Punctuation that looks spurious may have been added deliberately to make TTS say a word properly.** · **HARD** · Kai, 2026-08-17: "Sometimes punctuation was added to the generation in order for it to say the word better. Usually only for the very short words." · A normalising sweep degrades how short words are spoken · **Do not strip punctuation you did not put there without checking why it is there.**

**A9 — A question mark must be present before audio is generated, because it changes how the line is read aloud.** · **HARD** · Kai, on pdc · Deprioritised explicitly ("please do not let it jump the queue") but ruled it must precede generation.

**A10 — Never generate TTS without showing a plan and getting explicit approval.** · **HARD (approval gate)** · `CLAUDE.md` · Content passes end by **queueing an audio-pass request**, never by running TTS · Exception: Kai, 2026-08-17 — "the cost won't be high" for a handful of clips; batches are a spend decision, pennies are not.

**A11 — Never delete generated assets without a deletion plan and approval.** · **HARD (approval gate)** · `CLAUDE.md`.

**A12 — For minority-language and new builds: bank the content, generate no voice at all.** · **HARD** · Kai, 2026-08-15: "**Don't generate any voice. We can record later. It's good to have the content banked.**" · Not even sample clips to listen to · **"No voice pool" is not a blocker — it is a non-issue.** Voice availability is not a gate on a build.

**A13 — Displayed text, the presentation, and every voice must all express the same target form.** · **HARD** · Deborah, Welsh QA · Real instances: English and both voices say "pretty eyes", the Welsh text shows "llygaid blin" (*angry* eyes); presentation says "byth", text and one voice say "byth eto" · **No automatic check exists for any of this — see clash C21.**

**A14 — All voices in a course must agree with each other.** · **HARD** · Deborah, Welsh South: "'some postcards' — R says 'bwl o gardiau'; M says 'cwpl o gardiau post'" · The learner hears two different correct answers to one prompt: **a ZUT violation delivered through audio** · No check exists.

**A15 — The prompt the learner hears must contain the whole sentence they are asked to produce.** · **HARD** · Deborah, Welsh South: text is "could you tell me something before you go?", prompt is only "something before you go" · No check exists.

**A16 — Every course slot must have its audio present, and its known-side translation, before release.** · **HARD** · Aran and Deborah, repeatedly, on Welsh North/South, French, eng_for_jpn, eng_for_kor · **A course can pass the structural scan cleanly while silent** — this sits outside scan-course entirely.

**A17 — Concatenation is audible on human voices, and gets worse deeper into a course.** · **HARD (finding)** · Kai's blind A/B, 2026-08-11: he picked the whole recording 20 times out of 24, and **8 out of 8 in the last stretch** · Phrases get longer and carry more joins · Record-everything is an **option**, not the default.

**A18 — Human-voice-only courses must never be TTS-voiced.** · **HARD** · Welsh, Breton, Pennsylvania Dutch · Note the open question: nine course shells exist where Welsh is the *known* language, and all nine currently report machine voices are fine (see "Kai's call").

**A19 — Replacing a clip: which route depends on whether the TEXT or the RECORDING is wrong, and neither route deletes anything.** · **HARD** · Kai's C0 ruling, 2026-08-27; verified against the live code and DB the same day · Deleting a `course_audio` row is irreversible and cascades away that clip's repair candidates, QA flags, human sign-offs, revision history and envelope · Two routes:

- **The RECORDING is bad, the text is right** (clipped, silent, wrong voice, hallucinated words) → **flag it and regenerate the flagged clips** (A20 mechanism 1: raise the flag from the dashboard, then `POST /api/audio/regenerate-role/:courseCode` with `flaggedOnly`; phase 8 renders, veracity-gates, uploads to a new key, then swaps in place at the same id with a revision bump, and clears the flag only on success). Where a human should hear both takes first, use the **non-destructive audio repair flow** instead: `POST /api/audio/repair/:courseCode/:audioId/propose`, `GET …/preview`, `POST …/accept`, `POST …/revert`, `POST …/reject` on the production API (port 3470); dashboard surface is the Audio Repair panel; core is `services/audio-repair-core.cjs`. It renders, masters, measures and veracity-checks a candidate to a **separate S3 key** before a human is offered the accept; a failed propose mutates nothing; the accept is **same id, new bytes** with `audio_revision` bumped, so nothing cascades, no link moves and no cached bytes survive. The superseded object is never deleted, so a revert is data-only. **1,309 accepted swaps in the live DB** — this is a used road, not a design. **Machines may flag audio; only a human may pass it** — nothing in that module puts bytes on the learner path without an accept.
- **The TEXT changed** → repair **cannot** be used: `accept` asserts the text did not move and throws if it did. Instead: render the replacement for the new text in the same voice/role/language **first**; verify it (row exists, `s3_key` non-NULL, role/voice/language match, `duration_ms` non-zero and plausible, `text_normalized` = `normalize_text(new text)`, object present in the bucket); **then** update the content text and let the A5 trigger land the link; read the link back and assert; leave the old row in place. If you cannot render first, update the text anyway and queue the audio pass — the trigger unlinks and logs, the slot goes quiet, and quiet is the honest state when the clip speaks the wrong words. **Delete nothing, ever, in either branch.**

· Full procedure with the SQL: `.claude/commands/scan-course.md`, "Stale Audio After Text Changes".

**A20 — There are FOUR flag mechanisms, only two of them carry traffic, and none of them handles a text change.** · **HARD (map)** · Verified against live code and DB, 2026-08-27 · Naming "the flag flow" without saying which one is how a wrong instruction gets followed · The four:

1. **`audio_flags` + "regenerate flagged" — the working flag-and-replace road.** 48,868 rows since 2026-02-16, 7,125 in the last 30 days, 63 courses; raised from the dashboard (`/api/production/:courseCode/flags/*`) by QA, the gender-prep pass and human dashboard users. Regeneration is `POST /api/audio/regenerate-role/:courseCode` with `flaggedOnly`, which proxies to phase 8. **It is make-before-break:** phase 8 renders, passes a veracity gate, uploads to a **new** S3 key, and only then calls `swapClipInPlace` — an in-place UPDATE at the same `course_audio` id with `audio_revision` bumped. Nothing is deleted, no link moves, and the flag is cleared only after the run reports success. Human-origin clips are excluded by the precious-audio guard.
2. **The repair flow (`audio_repair_candidates`)** — the human-in-the-loop version of the same idea, with a preview and an explicit accept. See A19. 1,309 accepted swaps, all between 2026-08-05 and 2026-08-11 on `deu_for_eng` and `ell_for_eng`; **773 candidates are still `pending`** — proposed replacements nobody has listened to.
3. **`audio_clip_flags` / `audio_clip_signoffs`** — the newer flag-and-signoff schema behind the manual approval gate (`services/course-qa-gate.cjs`). **Zero rows, ever.** Built, correct, and never wired to raise one. Do not cite it as evidence of anything.
4. **`course_audio.rerecord_wanted`** — the non-destructive "this *human* take needs redoing" flag (1,334 rows, `eng_for_sin` and `cym_n_for_eng`). Routes a line to a recordist queue **without unlinking**, so the old take keeps playing until a new one is filed.

· **None of the four handles a clip that is wrong because the TEXT changed** — every one of them re-renders or re-records the *same* text. For a text change use A19's second branch · **When someone says "just flag it", ask which table**: (1) auto-regenerates, (2) waits for a human ear, (3) does nothing at all, (4) waits for a recordist.

---

## 6. Obligations — fix X and you must also fix Y

This section exists because most damage in this system comes from fixes that were correct in isolation.

**O1 — Edit a SEED → sweep the whole course.** Which LEGOs derive from this seed; which phrases use its chunks; which audio (including presentations of affected LEGOs) now speaks superseded text. **Nothing checks this automatically.** The seed's own audio link will silently keep pointing at the old clip (A5).

**O2 — Edit a LEGO's text → fix its presentation clip in the same pass** (A2), and fix every downstream practice phrase that used it (L1).

**O3 — Edit any text → the audio link is already mutated** (A5). Check for NULLs before you overwrite anything; "my audio reverted" is usually a NULL pointer.

**O4 — Strip a disambiguating tag → handle the ZUT collisions it was preventing.** Plan the collision handling into the pass; don't discover it after. Stripping the Greek labels naively would have collided *that*, *when* and *time*.

**O5 — Make any edit → unapprove the affected seeds.** · Kai, 2026-08-11: "Edits justify unapproving a seed… **So it only happens if WE decide to do fixes.**" The trigger is the *edit*, not the *finding* · Scope it to courses genuinely in proofreading — most courses have never been proofread, so an estate-wide rule would flag ~98% of approved seeds.

**O6 — Change a LEGO → check the phrase still respects the LEGO it sits under.** If editing breaks that link, re-shape or delete the phrase so the link survives.

**O7 — Apply a human reviewer's suggestion → validate it against the course first.** · Kai, 2026-08-18: "check that none of her suggestions or fixes affect the course validity" — the "as always" marks it as standing · A proofreader editing a known-side prompt for naturalness can silently break the introduced-before-used chain, create a ZUT collision, or orphan an audio link · **This applies to Kai's own correction lists too** — three items on his 303-item pdc list were overridden for course-wide consistency.

**O8 — Finish a content pass → queue an audio-pass request.** Never by running TTS. Keeps text edits from silently accumulating as a missing-audio backlog.

**O9 — Change pod content → migrate learner progress.** Never edit a live pod in place. Progress is filed under a sentence's *slot*, not its text, so an in-place edit silently credits a learner with a sentence they never heard, with no error and no alarm.

**O10 — Normalise spellings → test for genuine lexical distinctions first.** In pdc, `ken`/`kenn`, `hat`/`hatt` and `alle`/`allee` are **different words**, not spelling variants. This must be tested in any language before any normalisation runs.

**O11 — Replace a clip → make before you break, and delete nothing.** · Kai, 2026-08-27 (C0) · Whichever route you are on (A19), the replacement must exist and be verified before the old link moves, and the old `course_audio` row is never deleted — an unlinked row reaches no learner, and deleting it destroys the repair candidates, flags, sign-offs, revision history and envelope that a revert would need · **If a job can die between your delete and your regenerate, it will, and the slot is silent until someone notices.**

---

## 7. What is Kai's call, not an agent's

**Machine verifies, Kai judges.** His division, 2026-08-12: "just make sure they pass verification and don't cause ZUTs, **that's something I can't tell myself**. But happy to read through the phrases to make sure they sound good."

| **Ours** | **His** |
|---|---|
| Passing verification | Whether the phrases sound right |
| Not creating ZUT collisions | Taste, naturalness, register |
| Tiling, untaught vocabulary, syllable caps | The language judgement, in the languages he has |

**Nothing that fails a gate is passed up to him.** It gets fixed or dropped first — handing him a gate failure is handing him work that is definitionally ours.

**Kai's languages:** fluent and can rule on grammar/phrasing/taste — **Finnish, Italian, Welsh, English**. Can follow, but cannot advise on correctness — **Irish, Spanish, German, Japanese**. Everything else needs full scaffolding or he cannot engage. **Deborah** is the other native-level resource: fluent Spanish and Welsh, strong German and Basque, good French and Japanese.

**Explicitly his:**
- Whether a phrase sounds natural, in a language he has.
- Rewrites and deletions of phrases (report, don't apply silently — R0.3).
- Editing translated seed text in a course he owns.
- Orthography normalisation in minority languages — **never a build-time fix** (see below).
- Whether to mix or separate a confusable contrast (P15).
- Any spend decision at batch scale.

**Explicitly NOT his, and asking him is the error:**
- **Do not commission a native reviewer as a way of deferring.** Kai, 2026-08-17: "We don't have a Sinhala speaker right now — we should fix it as much as we can in the meantime. **You keep bringing this up with all languages.** We don't expect you to be as good as a real human Sinhala speaker and that's okay, **you can still try!**" · Author the fix and label the confidence honestly.
- **When the human reviewer covers only the known side, WE rule on the target side.** Kai, 2026-08-18: "What? We don't have a human ear, that's exactly why I told you to rule on the Arabic."
- **The bar is improvement over what is there now, not certainty.** Kai: "If the weak ones are likely to be improvements on what's currently there, it's worth doing, even if the agent isn't sure it's right either. You can also use the internet to search for korean text, or people talking about grammar rules etc."
- Gate failures, ZUT results, verification — ours in every language, including the ones he speaks.

**Minority-language rails:** name an **external orthographic authority** rather than inventing a house standard (Neapolitan follows Neapolitan Wikipedia, by his ruling). Establish with evidence what the corpus already uses and **change nothing** — normalising is a human decision. **Mixed dialects are a significant finding, not a tidy-up**, on the stated principle that *a learner taught a mixture is taught nothing*. Non-Latin scripts ship in their own script by default with romanisation as an in-app toggle.

**A clean self-check proves internal consistency ONLY.** A pairing that is wrong *consistently everywhere* contradicts nothing and is structurally undetectable. A build reports "internally consistent, N questions outstanding for a speaker" — never "verified correct". Those are different claims.

---

# PART TWO — WHAT THE MACHINE ACTUALLY ENFORCES

**A rule existing is not the same as a rule being enforced.** This table is the honest version. Read it before you claim a course is clean.

## What genuinely blocks a submission

`POST /api/seed/complete` validates everything before any insert; on error it returns 400 and **nothing is written**.

| Rule | What it blocks |
|---|---|
| **ZUT (LEGO level)** | Same known text already mapped to a different target in an earlier seed |
| **Syllable cap** | LEGO target over 8 syllables — *runs even under skip_validation* |
| **Tiling** | Seed's target not covered by its LEGOs — *runs even for golden seeds* |
| **Target vocabulary** | Any phrase not fully tileable from already-introduced chunks |
| **LEGO containment** | A build/use phrase that doesn't actually contain its LEGO |
| **BUILD anti-filler** | The bare LEGO plus a short filler tag instead of real recombination |
| **Known-side vocabulary** | A prompt using a word not yet introduced — *only where a pair-contract exists* |
| **Length ratio** | Known and target more than 2.5× apart in characters |
| **Phrase counts** | Below 3 BUILD / 5 USE per LEGO (graduated for seeds 1–5) |
| **Balance, 3rd strike** | Phrases leaning on the same over-taught vocabulary |

**Bypasses that define the real perimeter:** `skip_validation` is clamped to seeds ≤ 3. `draft=true` — **or any existing draft row for the course** — disables ZUT and duplicate detection entirely. `x-agent-role: creator` gets a 403; only the checker submits.

## What only warns

Phrase-level ZUT (held out, never rejected — K4) · metadata glosses · frame coverage (self-documented as having false positives and blind to topic-swaps) · known-side construction advisories · **phrase complexity tiers** (see clash C12).

## Where the checks are blind — read this before quoting a zero

These are measured, not suspected:

- **The known-side vocabulary gate is INERT on 31 courses.** `validation.cjs:818` tokenises with `split(/[^a-z']+/)`, so every Devanagari, Tamil, Arabic and CJK character is a separator, the token list comes back empty, and the function returns "no problems". 13 language families affected. A fix exists on `fix/known-side-tokenizer-unicode-2026-08-17` (commit `1104a6c1`), **not merged**. Accented Latin is *shredded* rather than skipped — 41 Azerbaijani words become 70 fragments — which is worse, because the gate then compares garbage.
- **The same gate silently skips 60 of 145 courses** — the contract fallback only fires for `*_for_eng`. No warning, no log line. The largest known-side leak population sits in exactly those skipped courses.
- **Check 14 (question marks) never fires on Spanish or French question words.** `\b` after an accented letter does not match, so `qué`, `cómo`, `cuándo`, `dónde`, `quién` and `où` are undetectable — in a file that documents that exact trap 700 lines later.
- **Check 6 (unpronounceable) flags EVERY phrase as garbage** on Hindi, Hebrew, Thai and the Indic courses — their scripts are missing from its keep-list.
- **Check 3/4 (wrong language) has detectors for five scripts only.** Cyrillic, Greek, Hebrew, Devanagari, Thai, Tamil, Kannada, Telugu, Georgian and Ge'ez are invisible. Latin Extended-A (Polish ł, Welsh ŵ, Turkish ğ) is misread as "not Latin".
- **Check 13b returns `NaN` on caseless scripts and reads as a pass.**
- **Check 15 (identical known/target) has a five-pair cognate allowlist**, all `eng|X`. Every related-language pair — cat_for_spa, bre_for_fra, nld/deu — reports its legitimate cognates as corruption.
- **Checks 11 and 12 are inert on CJK and Thai**: the tokeniser produces one token for a whole sentence.
- **scan-course as written never fetches `is_new`, `type`, or `presentation_audio_id`**, so Checks 10, 12 and 18 report zero if run literally, and Check 11 crashes. There is **no committed runnable implementation of Checks 1–16** — every agent that has "run scan-course" wrote a throwaway script.
- **Check 18 was fixed 2026-08-18.** The old inline matcher parsed 21,342 of 72,063 clips and silently skipped 50,721; against 229 known drifted rows it flagged 2. The replacement covers 72,058/72,063 and exits non-zero below 99%.
- **The gate has never examined the ~1M rows already in the database.** It runs at submit time only.

---

# PART THREE — WORKED CASES

Rules say what is forbidden. These show what a good fix looked like when the situation was genuinely hard.

## Real fixes, when the situation was genuinely hard

### WC-1 — Sinhala: 27 clips broken in the WRITING, not the recording
**Demonstrates: A1, A2, L1, and "find out which one is lying".**

33 presentation clips in `eng_for_sin` had corrupt *stored text*, 27 of them linked to a LEGO and reachable by learners. LEGO `S0197L02` reads `ගුරුවරයෙක් හැටියට වැඩ කරනවා` / "works as a teacher" — its presentation clip announces `පුතා` ("son"), followed by five repetitions of the filler `ඒ ගෙ`. The sibling `S0197L01` ("my son") carries `ගේ ඒ ගෙ වැඩ` in both its known and presentation clips.

**Why it was hard:** it presents as an audio defect. Re-rendering the stored text would have reproduced the gibberish byte-for-byte and *looked like a completed repair*. Underneath sat a second, worse defect on 24 of the 27 — the headword itself was wrong, so the learner read one word and heard another.

**Done:** detection rebuilt from scratch rather than inherited. Three independent confirmations that the filler is genuinely *spoken*: `word_boundaries` showing `ඒ`/`ගෙ` voiced separately for 715–2,243 ms; duration 3.4–13.6 standard deviations long against a rate model fitted on 2,199 clean clips of the same course and voice; and clean decodes. Headwords re-sourced **from the LEGO card**, rendered with the example slot empty. **Deliberately not done:** inventing the 27 missing Sinhala example sentences — "the known side is a controlled language, and guessing at it isn't mine to do." Flagged as Kai's call.

**Verified:** six gates per clip on first take — decode, duration within 1.4 sd, headword voiced *per token* rather than by duration (a 4-character headword gives z = 0.0, so a duration test would pass anything), no truncation, zero filler regression, tail floor −87.6 dB against a −40 dB threshold. 81 renders, $0.014. Staged additively to S3; the swap tool is dry-run by default and make-before-break.

**⚠ Live status, checked 2026-08-18:** `S0197L01` and `S0197L02` **still point at the corrupt clips** while the clean re-renders sit unlinked. For those two rows the swap has not landed. 42 corrupt presentation rows still exist in `course_audio`.

### WC-2 — `yaskot`: the answer sitting in the question
**Demonstrates: K1, P1, K2 — the canonical specimen of the answer-leak class.**

Seven practice-phrase rows in `ara_lb_for_eng` had romanised Lebanese Arabic in the English prompt field: `S0034L01B01` known_text = `"yaskot"`; `B02` = `"doesn't want yaskot"`; `B03` = `"yaskot today"`; plus `yihki`, `bido`, `baddha`, `min`. **Clips already existed** — three orphaned `course_audio` rows, role `known`, English voice `azure_en-GB-SoniaNeural`, an English voice reading Arabic aloud to the learner.

**Why it was hard:** the obvious reading — "this phrase keeps breaking" — was wrong twice. First, it is the *slot*, not the phrase: seed S0034 is shared master English carried by ~50 English-known courses, so it is the one prompt guaranteed to appear in every review Deborah does. Second, the promising `target_phrase_id IS NULL` lead was worthless — 825,348 of 831,932 phrase rows estate-wide are NULL, so it is the default, not a fingerprint. **The decisive evidence was spelling:** the course romanises that verb `yiskat`/`yuskit`/`yuskat`/`yiskit` and **never once** writes `yaskot` — so the string was not copied from any field, it was independently romanised by the authoring model.

**Done:** Deborah rewrote the English — `"yaskot"` → `"be quiet"`, `"doesn't want yaskot"` → `"doesn't want to be quiet"`, `min` → `"since"`. **Not done:** touching the Arabic, or the `course_legos` rows, which were never corrupted.

**Verified:** audited from `content_audio_link_drops`, the trigger's own forensic log, rather than regex-scraping `content_audit_log` (which false-positived heavily). Every row's current clip confirmed to speak its current text; zero rows left in the worst state (English on screen, Arabic in the ear). All seven replayed through the current known-side vocab gate: **7/7 BLOCK, both correct forms PASS**.

**The rule it teaches:** check whether the gate that should have caught it *existed yet*. This one landed 2026-07-27 — ten weeks after these rows were written.

### WC-3 — Chinese: 236 wrong recordings, and the right ones already existed
**Demonstrates: R0.4, A5, and "check before you regenerate".**

236 known-side seed links in `zho_for_eng` play a completely unrelated English sentence. Seed 351 shows "No he didn't want to leave me on my own" and the clip says *"I want to see the new movie that just came out"*. Seed 361 shows "He was quiet." and speaks *"he said that he's too busy to help right now"*.

**Why it was hard:** nothing ever mislinked anything. The links were **correct on the day they were made** (2026-05-03), against another course's placeholder English at the same seed number — 236/236 at offset exactly 0. Then the seed text was corrected in July, and **`course_seeds` has no audio-nulling trigger** (the migration created it on legos and phrases only). Second lock: `link_all_audio_ids` only fills FKs that are already NULL, so the 206 correct clips generated in July **could never be adopted**.

**Done:** mechanism named before repair, on Kai's instruction — *"Find the MECHANISM before repairing 236, so we do not invite the 237th."* False positives hunted first: 0 of 236 are punctuation-only, mean word overlap 0.042, 122 share no word at all with their seed. 20 target-side links were **rejected from the set** as a different, minor class. Repair costed at **236/236 relinkable in the identical voice, 0 clips to render**. **Not done:** re-recording; and not adopting 164 clips in a cloned male voice, which would have been a silent voice swap.

**Verified:** whisper transcription of the served bytes on 6/6 sampled clips (all HTTP 200 — being served to learners right now), plus duration corroboration: seed 361's wrong clip runs 3,096 ms for three short words, the correct clip runs 1,608 ms.

**⚠ Live status, checked 2026-08-18:** awaiting Kai's one-word approval; **not applied**. Seeds 351/357/361/500/668 still serve the wrong sentence. The identical-voice replacements exist.

### WC-4 — Italian: one English sentence over five different Italian ones
**Demonstrates: K2, K3, A6, and fixing the side that is actually wrong.**

Five rows in `ita_for_eng` seed S0101 all carried the boilerplate known_text **"I'm excited about this work"** over five different, individually *correct* Italian targets — `mi piace scoprire cosa vuole dire`, `…quando sei pronto`, `…dove sei`, `…cosa vuoi`, `mi piace imparare questa lingua`. One known prompt, five target forms. All five shared **one** English audio clip.

**Why it was hard:** five wrong Englishes over correct Italian could equally read as five *mistranslations*, which would mean editing the Italian of a released course. **The shared clip was the fingerprint** that said "filler string", not "five bad translations". It also came with a false second defect: "excited" is the only pre-R309 appearance of that word, which looks like an ordering breach — but the *Italian* never uses `entusiasta` there, so nothing is built from an untaught LEGO, and correcting the English removes the ordering problem too. Calibration mattered: 66 of 11,771 English prompts in that course map to more than one Italian, and the rest are legitimate register, gender and word-order variants.

**Done:** English corrected to match each Italian, using the house pattern already in that round ("I'm enjoying finding out…"). Five new clips, ~$0.0015. **Judgement call:** `voice_config` nominates xAI "Eve", but all 88 English prompts in seeds 100–102 are Azure Sonia — so Sonia was rendered. Using the standard `/regenerate-phrase` endpoint would have **dropped a different speaker into the middle of a round**. **Not done:** touching the Italian; touching the presentations (the LEGO text was never wrong).

**Verified:** audio fetched and transcribed on *both* sides before the fix, establishing this as a writing defect rather than a recording one; each new clip transcribed word-for-word before acceptance; and the exact database function the learner route calls returned the corrected English with zero "excited". **Gap stated honestly:** round 254 sits behind the subscription gate, so verification was the read path minus the paywall.

### WC-5 — Portuguese: a speed error caught in its own shipped work
**Demonstrates: A4 — make-before-break — and reading the course's own config.**

Three narration clips were re-rendered in the released course `por_for_eng` to strip English grammar tags the *voice* was still announcing: `"The Portuguese for: 'when (for questions)', is:"` → `"…'when did you start', is:"`. They were rendered at speed **1.0**. The course's known voice is configured at **0.95** — so three clips in a released course were slightly fast against everything around them.

**Why it was hard:** nothing failed. The clips decoded, spoke the right words, and passed every content check. Only a recon sub-worker comparing against `voice_config` caught it. **Speed is invisible to text-level verification**, and the error was in the agent's own already-shipped work — it had to audit what it had just declared done.

**Done:** re-rendered at 0.95; the new S3 objects uploaded and **verified alive before the rows were repointed**; old objects left in place, not deleted. The same recon found that for 19 of 20 sampled annotated rows a clip at the stripped text **already exists**, so the estate-wide move is relink rather than render — reported **with the caveat that the sample used a guessed tag vocabulary and needs redoing exhaustively**, rather than banking the near-zero bill. **Not done:** no authored text changed anywhere (zero ZUT risk). A companion `ben_for_eng` fix from the same pass was **reverted** on evidence that stripping "(a person)" would leave the learner unable to choose between চিনি and জানি.

**Verified:** corrected clips live at 3,697 / 3,841 / 3,289 ms, each confirmed as the current `presentation_audio_id` of its LEGO. Total spend $0.007.

### WC-6 — Finnish: a completed, applied chain overturned from first principles
**Demonstrates: R0.2, P2, L18, R0.1.**

A proofread flag on `fin_for_eng:S0034L02U06` ("I don't want to be here all day") said the Finnish "would have to be *koko päivää*". A worker applied it and swept a twin fix into S0069. A **second** worker then confirmed the change was sound, reasoning that the learner meets `koko päivän` from seed 14 and that negation→partitive is Finnish's normal rule, so only the case-switch is new. **The chain was finished and applied.**

**Why it was hard:** the grammar was genuinely correct. The reasoning was the ordinary, defensible one — an established pattern plus a taught chunk. Overturning it needed a principle, not a counter-example.

**Done:** Kai ruled from first principles — *"we cannot give new cases without introduction… A case form the learner has not been introduced to for THIS chunk is not available, however well-established the pattern is on other words"* — and refused to take the choice back ("Choose and act; do not hand the choice back"). Re-checked strictly, `koko päivää` has **no card anywhere in the course**. The rewrite then hit a **second breach the first attempt missed**: `täällä` ("here") debuts as chunk 5 of seed 34 while the phrase sits under chunk 2 — a forward reference within the same seed. Final text: `mä en tykkää siitä, kun mun pitää olla valmis koko päivän`, with every element cited to a seed (27 / 25 / 34-own-chunk / 26 / 14). **Deletion deliberately not chosen** — it would have dropped the chunk below the phrase minimum.

**Verified:** element-by-element seed citation; confirmation the phrase still exercises its parent card; a whole-course collision check on both new English and new Finnish; `koko päivää` swept to **zero** occurrences course-wide, confirmed live.

**The rule it teaches:** a completed, applied, independently-confirmed chain can still be wrong at the root.

### WC-7 — Arabic "yesterday": right detector, wrong question
**Demonstrates: K7 — the framing rule.**

90 rows in `eng_for_ara` use bare `أمس` where the course teaches `بالأمس`. It was the estate's largest single "confirmed defect".

**Why it was hard:** the detector was correct — the string genuinely differs from the taught form, and the brief said a known-side defect is serious "almost by definition". **The framing was what failed.** `eng_for_ara` teaches English *to Arabic speakers*: the learner is a native Arabic reader looking at an Arabic word, and the thing they must **produce** is the English "yesterday", taught at S0030L03. 84 of the 90 sit after seed 30. **Nobody is stuck.**

**Done:** the worker overturned its own brief against Kai's standing ruling ("the source wins"), reclassified the 90 as **borderline at worst**, and re-cut the whole estate sweep on the axis that actually predicts harm — *can the learner produce the answer yet?* — giving serious 1,355 versus borderline ~3,900. The same cross-tab had already killed 467 of 486 findings in a German pilot. **Not done:** no rows edited, and no bulk repair launched off a number that would have been mostly noise.

Kai's summary: *"This one overturned the frame I gave it, and it was right to."*

**Verified:** seed positions of all 90 checked live, and German tier-3 debut seeds re-derived rather than trusted. **Gaps stated:** 6,715 CJK rows unclassified; several courses read only partially through statement timeouts; a live re-count today returns 91 rows, not 90, and the one-row difference was not reconciled.


## Cases where the FALSE POSITIVE was the lesson

"Why this looked like a defect and was not" is as valuable as "why this was one."

### WC-F1 — 1,170 Catalan hits that were just cognates
**Demonstrates: R0.6, and the checklist below.**
A known-side answer-leak detector — calibrated on 27 real positives, not a naive probe — returned **1,322 hits**. The truth was **142 high-confidence, 42 of them new**. **1,180 of 1,322 (89%) were false**, concentrated in two courses: `cat_for_spa` (1,170) and `bre_for_fra` (10). The detector's identity is *string overlap between the known and target fields*, and Spanish and Catalan simply share words: `recordar una palabra` → `recordar una paraula`. The shared run `recordar una` is cognate vocabulary, not a leak; the known side is proper Spanish throughout.

**Caught by** refusing to hand up a raw count: sorting by course showed 88% in one minority course, which is the shape of an artefact, not a defect population. Real positives look nothing like it — `eng_for_spa` S54 `queríamos give you más tiempo`.

**The rule:** before believing a cross-field string-overlap count, check the genetic distance between the two languages. Precision on unrelated pairs was ~96%; without the exemption, the estate's cleanest minority courses read as its worst.

### WC-F2 — The check that returned a clean pass because it could not read the alphabet
**Demonstrates: A3, K12, and the enforcement table.**
The known-side vocabulary gate — the check the estate treats as catching the most mistakes — reported **zero violations** on Hindi, Tamil, Japanese and Arabic. Not lenient: **inert**. Feeding real `known_text` through the exported function showed **13 language families and 31 courses tokenise to zero tokens**. The cause is one line: `split(/[^a-z']+/)`. Every non-ASCII character is a separator, the violation loop never executes, and the function returns "no problems".

**Caught by** reading the code, then confirming by direct invocation on live text.

**The rule:** a zero from a check is only as wide as its tokeniser. **Feed the check one string you know is bad in the target script.** If it returns clean on a planted defect, you have measured nothing — report "the gate is inert here", never "the course is clean".

### WC-F3 — Check 18 looked at 30% of the estate and reported clean
**Demonstrates: A3 — the coverage principle.**
Check 18 reported clean course after course. Against a known set of **229 drifted rows it flagged 2**. It was parsing **21,342 of 72,063** presentation clips and silently skipping **50,721**. One template with a hardcoded connector — `, as in` — followed by `if (!m) continue`. The estate mostly says `, is:`. A census found **13,762 distinct narration skeletons**: Tamil, Hindi em-dash forms, Kannada, Chinese, Korean; two families carry no quotes at all (legacy Welsh `<src>`/`<tgt>` markup, and a Japanese frame); Dutch SSML actively poisons a quote scanner.

**Caught by** measuring coverage instead of trusting the verdict — running the template against every clip and counting the `continue`s. The replacement parses **delimiters, not sentences**, covers 99.99%, returns an explicit `unparsed` status so nothing is dropped silently, and **exits non-zero below 99%**. It now flags 226 of the 229, and surfaced 2,744 new drift rows across 70 courses.

**The rule:** a detector must report its own coverage next to its verdict, and a coverage shortfall must be a **failure, not a footnote**. Any matcher with `if (!match) continue` is a silent-skip machine.

### WC-F4 — Arabic tokenisation invented 1,126 defects
**Demonstrates: R0.9, and the checklist.**
The estate-wide untaught-word audit read `ara_for_eng` at **1,126 high-confidence defects** — by far the worst course on the estate. After fixing the normaliser the same course reads **0**. Estate-wide residue fell **1,697 → 552** on that single change. The tokeniser stripped Latin punctuation only and folded diacritics via a Unicode range that does not contain Arabic marks, so `هنا؟` never matched the taught `هنا`.

**Caught by** the *vocabulary* of the defect list: a pile of ultra-basic function words (yes, how, there, not) reading "never taught" is an orthography bug, because no released course fails to teach "yes". The worker found it mid-run and re-ran before reporting.

**The rule:** when a script-specific audit names a course as your worst, sanity-check the defect list against core function words, and re-run the identical check on a course you already believe is clean.

### WC-F5 — The zero that could not fail
**Demonstrates: the difference between verifying and re-measuring your own guard.**
"**0 out-of-corpus target tokens across 1,093 generated rows, 0 forward references**" was reported on `pdc_for_eng` as independent verification. It is **0 by construction**. `checkTiling` already validates every LEGO target against the seed at submit time, and phrases are rebuilt from already-introduced chunks — the vocabulary can hardly escape the corpus it was validated against. The zero confirms the guard is working and carries no information about whether the content is right. Note also that `checkTiling` validates the **target side only** — the known side is genuinely unvalidated, which is where independent signal lives.

**The rule:** ask what would have to be true for this check to fail. If the answer is "the builder violated its own validator", the zero measures the validator.

### WC-F6 — A tool whose header claimed a calibration it failed
**Demonstrates: R0.9.**
`filler-build-scan.cjs` defines a filler BUILD phrase structurally — the LEGO plus a residue of 1–3 tokens — with no notion of semantic emptiness. Deborah's actual complaint is padding that adds no new grammar (`here`, `yesterday`, `before`); a residue of `Spanish` or `to help` is genuine recombination and exactly what the method wants. Its RAW→CONFIRMED promotion requires the residue to recur 3+ times, which `my`, `your`, `a` and `the` satisfy trivially — **the promotion adds no evidence while sounding like verification**. ~81% false positives.

**Caught by** running the tool against the five examples its own header claimed it reproduced. It flagged zero of them.

**The rule:** a tool's header is a claim, not evidence. Replay its stated calibration examples before quoting a single number, and check what any RAW→CONFIRMED promotion actually excludes.

### WC-F7 — Two false RECONSIDERs, both the tool's own fault
**Demonstrates: uniformity is the signature of an artefact.**
On its first production use, the edit-impact tool reported that **every** phrase edit had "1 other row carrying the identical old text", and that **every** CJK edit's proposed text was taught "at no point at all". Both artefacts. A display label was compared against an identity, so self-exclusion never fired and the count was always the edited row itself; and `words()` split on a space, so a Japanese known side is one token that can never match a LEGO.

**The rule:** when a detector fires on 100% of a class, suspect the detector, not the class. And never compare a display string to an identity.

### WC-F8 — 27 untaught-vocabulary candidates, 1 real
**Demonstrates: K6, K7.**
The tool reproduced **27** untaught-vocabulary candidates for the day's `eng_for_sin` edits. Exhaustive adjudication found **1 real breach**. **13** were inflectional variants of a word already taught (`ඔයාගෙන්` ← `ඔයා`, seed 1); **13** were inherited, not introduced by the edits — `මිනිස්සු` had been in the course since seed 69. The matcher is unstemmed and exact-surface, **and says so in its own caveat**, which nobody had acted on.

**The rule:** read the tool's own caveat and price it in. For any inflecting language an exact-form "untaught" count is an upper bound, not a finding. And always ask: *did my change introduce this, or did I just become the first person to look?*

### WC-F9 — 15 Spanish mismatches invented by two normalisers that disagree
**Demonstrates: A7, and the checklist.**
During the Spanish `poder` audio-generation run, 2026-08-27, a verification pass comparing each generated clip's text against its database row raised **15 apparent mismatches. All 15 were false.** The JavaScript-side `normalizeForAudio` **keeps** a trailing question mark; the database-side normaliser **strips** it. Two normalisers in the same system disagree, so any comparison routed through both reports differences that do not exist.

**Caught by** the worker noticing the shape of the difference and re-running on a direct text comparison, which came back clean.

The same run also named a genuinely benign class, so nobody re-investigates it: **40 PRE-EXISTING clips differ from their row text by capitalisation or a trailing full stop only** — same words. This predates the work and is not a defect (A7).

**The rule:** **when a check compares text through a normaliser, verify the normaliser against a known-identical pair before trusting any mismatch it reports.** A punctuation-only or case-only difference is almost never a real defect — but a **question mark can change the sound** (A7, A9), so it is not simply noise either. The two cases must be told apart, never filtered wholesale.

## Before you believe a count

1. **Report coverage next to the verdict.** A verdict without a denominator is not a result. Below ~99%, the run failed.
2. **Grep your own matcher for `continue`, `if (!match)` and early returns.** Every one is a silent skip. Make "unparsed" a first-class status.
3. **Plant a known defect and confirm the check fires** — especially in the target script.
4. **Check the tokeniser against the script before the data.** `\b`, `[a-z]`, `split(' ')` and NFD all fail outside ASCII Latin, silently, usually in the direction that reads as clean.
5. **Ask what would have to be true for this check to fail** — and whether an earlier gate already forbids it.
6. **A uniform verdict is an artefact.** 100% of a class firing, or 0%, means suspect the detector first.
7. **Check the relationship between the two things you are comparing.** Related languages break string-overlap detectors; dialect courses make standard spellings miss wholesale.
8. **Look at the vocabulary of your defect list, not just its size.** Basic function words reading "never taught" is an orthography bug.
9. **Replay the tool's stated calibration examples.**
10. **Read the tool's own caveats and price them in.**
11. **Distinguish "my change caused this" from "I am the first to look here."**
12. **Re-run the check on a course you believe is clean.** The known-side noise floor is ~255 per 1,000 even on mature English courses — **judge by distance from the floor, not from zero.**
13. **State the check's population coverage.** "The gate would catch that" is only true where the gate runs.

---

# PART FOUR — THE REDIRECT MAP

Kai's reasoning: **a partial copy of the rules is worse than no copy**, because an agent reads it, believes it has what it needs, and never opens this document. Every duplicate is a future clash and a future staleness.

**NOTHING IS TO BE STRIPPED YET.** Nothing may be removed from any skill, doc or comment until that rule is provably in this canon, and until Kai has seen this document. This map exists so the follow-up pass is mechanical.

**183 rule statements recorded across 61 files.**

| Classification | Count | Where the weight sits |
|---|---:|---|
| REDUNDANT — canon says the same thing; safe to replace with a pointer | 78 | `ralph-methodology.md` (38), `synonym-choice-architecture.md` (16), `docs/fix-agent-rules.md` (13) |
| **PARTIAL — says less than the canon; an ACTIVE DECOY; priority** | **34** | `CLAUDE.md` L19–20 (auto-loaded), `WORKLIST.md` L25 (auto-read), `validation.cjs` METHODOLOGY_HINTS, `methodology-expert.md`, `course-resume.md` L57 |
| **CLASHES — do not touch; for Kai** | **31** | clash C1 ×10, clash C2 ×10, clash C3 ×1, plus 10 newly surfaced |
| LOAD-BEARING — executable; code stays, canon is the intent behind it | 24 | `validation.cjs` (12), `phrase-structure.cjs` (4), `language-config.cjs`, pair-contracts |
| **STALE — no longer true** | **16** | see below |

## Stale, called out by name — ranked by damage to the reader

1. **`docs/fix-agent-rules.md:474–481`** — a reasoned reconciliation of clash C2, labelled "Practical reading" and explicitly flagged as needing Kai's ruling. **Kai ruled the other way on 2026-08-06.** Live in an agent brief, presented as the practical answer. *The most dangerous single line found.*
2. **`.claude/agents/methodology-expert.md:11`** — the methodology oracle's declared highest-priority source, "real decisions from Kai", is a **macOS path that does not exist on this machine**. The oracle silently falls through to six stale copies.
3. **Three dead `memory/…` pointers** — `methodology-zut-resolution.md` and `feedback_subjunctive_penso_che.md` (both referenced by scan-course) and the path above. **There is a whole missing rulings layer.**
4. **`ssi-phrase-variety.md:32`** — "Seeds 1–5: at least 1 phrase" when the validator hard-rejects seeds 4–5 below 3 BUILD / 5 USE. **Causes real rejected submissions.**
5. **`course-resume.md:145`** — labels the vocabulary constraint "the ZUT principle", seven lines before stating ZUT correctly at L152. An agent onboarding after a compaction learns the wrong gate.
6. **`public/prompts/phase3_worker.md` + `phase5_worker.md` (1,612 lines)** — **completely orphaned**; no code loads them; they teach a retired rule vocabulary. Served over HTTP, read by nothing. **The largest decoy body in the repo by volume.**
7. **`ralph-methodology.md:1006`** — "Known: [**source** language sentence]" — the banned term, inside the doctrine file the never-"source" rail points at. Same violation in `audio-generation.md` L412/L418, `phase8`/`phase9` PROMPT.md, both orphaned phase prompts.
8. **`docs/COURSE_BUILDER_BRIEF.md:199,209–213`** — a third ZUT expansion plus a DEBUT/ETERNAL phrase-role table using terminology retired in favour of component/build/use.
9. **`docs/fix-agent-rules.md:462–469`** — states that `phrase-fixer.md` contradicts Kai's rules. **It no longer does** — it was rewritten to lead with them. A stale description of a fixed problem, which will send a worker to "fix" a correct file.
10. **`services/briefs/deprecated/`** — 6 files, ~10 rule restatements. Should be **deleted, not repointed**.
11. **`docs/qa-landscape-scout-2026-08-04.md:122`** — "absent contract = silent skip" is now true only for non-English-known pairs.
12–16. Unverified and flagged rather than asserted: whether `checkPhraseComplexity` blocks or warns (`ralph:284`); whether the creator/checker 403 guard still exists (`ralph:744`); whether "Opus Polish" exists (`course-methodology-analysis:38`); the "prefer markdown submission" lesson with a hardcoded `localhost:3471` (`ralph:998–1034`); whether `english_canonical` still exists.

## Rules that exist in EXACTLY ONE place — blockers for the stripping pass

If any of these is removed before this canon absorbs it, **it is lost permanently**:

- **FORM discipline**, named as the #1 failure mode — `fix-agent-rules.md:135–141`
- **Multi-word chunks protected as units** — `fix-agent-rules.md:142–145`
- **Sense-vs-word**: "a word being seen is not its sense being taught" — `fix-agent-rules.md:146`
- **The use↔use role restriction on ZUT reporting** (3,547 → 768 findings) — `fix-agent-rules.md:155–172`
- **Register: one per course, documented** — `ssi-translation-methodology.md:99–113`
- **Cognate preference, seeds 1–100** — `ssi-translation-methodology.md:38–57`
- **Speaker-gender agreement + T-V default** — `docs/a108/BRIEF.md:8–11`
- **Sibling variants are distinct courses** — `docs/a108/BRIEF.md:34–36`
- **"No regex/stemmer EVER for a language judgment"** — `HANDOFF-kai-eng-for-x:27–28`
- **"The cue lives in what the learner sees"** — `cue-library-v1-spa:12`
- **BUILD anti-template / filler-tag rule** — `validation.cjs:927–940` and its audit doc only
- **Don't pad phrases to hit length targets** — `validation.cjs:84–88`
- **`convergence_pairs` as a declared first-class thing** — `tools/README.md:31`
- **"The clip must speak the text it is linked to"** — **stated in no doctrine file at all** (recorded here as A1)

---

# GAPS — what this canon could not reach

Reported honestly, because a canon with a known hole is usable and one with an invented rule is dangerous.

1. **Three of Kai's memory files named in the brief do not exist** under those names: `flagged-phrase-fix-rule`, `punctuation-in-audio-text-matching`, `audio-clip-lego-id-is-provenance`. The first is a dangling `[[link]]` inside `lego-vs-phrase-vocabulary-rule` — **the rule is referenced but was never written**. Its substance is partly reconstructed here from P1 and R0.2, but not from its own source.
2. **Deborah's substantive findings for Spanish, German, Basque, French and Japanese are not in Basecamp.** Her project has an empty message board, empty vault, empty kanban and zero chat lines; her 13 per-course lists hold bare checkboxes with empty descriptions. Everything substantive she has written there is Welsh, plus one Korean line and a 2022 Spanish note. **If those findings exist, they are somewhere this workspace cannot see.**
3. **Two documents could not be read** — both binary formats the tool cannot extract:
   - `Spanish Level 1 Course Text - highlighted V2.docx` (Deborah, 2022, 99KB, in "Suggested Changes to Current Course"). The highlights are almost certainly her itemised Spanish defect list.
   - **`HILT - an introduction.pdf`** — Aran, 2026-04-24, **alone in the HQ vault's "Methodology" folder**, which holds nothing else. Author, date and location suggest it may state methodology bearing directly on this canon.
   Also unread: Borglite v1.1 ("the new course production process end to end") and Course.pdf.
4. **A brief premise was wrong and is corrected here.** The "words practised before introduced" findings for French, Arabic and Korean are **Tom's observations recorded by Aran**, not Deborah's. Only the Japanese and German lines in Aran's document are hers.
5. **scan-course.md was not audited for the redirect map** — job #44 owned that file during this work. It is a large rule-carrying surface and **the map is incomplete without it**; whoever owns it must produce the same five fields, or the stripping pass will strip around a hole.
6. **`apml/` (~15 rule-bearing files) was located but not line-audited** — it is a spec layer with its own sync tooling, and repointing it is a different decision from repointing prose.
7. **The 511-file `docs/` tree was grep-swept, not read.** Risk is low for ZUT/known-side/tiling and moderate for one-off rules stated in ordinary language.
8. **No check in this canon was re-run against the live database.** Every coverage figure is read from code, verified in a local regex harness, or quoted from a figure already written into the repo.
9. **The 411 worker conversations were not read** — Kai occasionally replies inside them, so rulings may still be sitting there uncollected. This is the largest unswept surface for new rules.
10. **None of the 2,744 presentation-drift rows were verified by listening.** `course_audio.text` is what a row *claims* was spoken; only `word_boundaries` records what TTS actually voiced.
11. **Every worker on this job was refused fan-out** (depth ceiling), so each section is one pass by one reader with no independent second look. Line numbers are the most reliable part; the REDUNDANT-vs-PARTIAL calls are the part most worth a second opinion.
