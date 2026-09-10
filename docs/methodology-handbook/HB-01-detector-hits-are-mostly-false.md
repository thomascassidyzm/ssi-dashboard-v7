# HB-01 — A detector fired and the hits are mostly false

> **SYMPTOMS.** "The tool reports N defects." · "This course is the worst on the estate." · "The check came back clean." · "It flagged every row in the class." · "Zero violations." · "The count looks too big, or too round." · "Is this a real defect population?"
>
> **NOT THIS CHAPTER.** If you have already established the hits are real and are deciding what to do about them, you want the chapter for that defect kind. If a *human* reviewer raised the flag rather than a tool, go to **HB-08** — a human's false positive fails differently and is never a tokeniser. If the detector is fine and the *brief* is what is wrong, that is **HB-12**.
>
> **RULES IN PLAY.** `course-methodology-rules.md`: "a raw match count is a hypothesis, not a work order"; "never derive an estate-wide rule from one course"; "check every affected row by hand"; "read the coverage line, not the count"; "Welsh flagging is evidence against the check". Canon ids: **R0.9, R0.6, R0.5, R0.12, A3, K6, K7, K12**.

---

## THE SHAPE

A detector's verdict is a claim about the world made through a tokeniser, a normaliser and a matcher, and **a defect count is only ever as wide as the narrowest of those three.** Nearly every case in this chapter is the same event: the machinery quietly failed to see something, and the failure surfaced as a *number* rather than an error. That is why it is dangerous. A crash gets investigated; `1,126` gets worked.

The count fails in exactly two directions and both are in this chapter, because in practice you cannot tell which you have until you look:

- **FALSE HIGH** — the check fired on things that are fine. Cognates, inflections, a normaliser mismatch, a display string compared to an identity.
- **FALSE LOW, which is worse** — the check could not read the data and returned "clean". A zero is the most expensive number in this estate, because nobody re-checks a pass.

The tell that unites them is **shape, not size**. A real defect population is ragged: spread unevenly across courses in a way that tracks who built them and when, with a vocabulary that looks like real mistakes. An artefact is *uniform* — 88% in one course, 100% of a class, exactly zero, a pile of function words. Read the distribution before you read the total.

---

## THE PROCEDURE

Run these before you report a single number. They are cheap; the sweep they prevent is not.

1. **State coverage next to the verdict.** How many rows did the matcher actually parse, out of how many it was given? A verdict without a denominator is not a result. **Below ~99% the run failed** — that is A3, and it is not a footnote you may put at the bottom.
2. **Grep your own matcher for `continue`, `if (!match)`, and early returns.** Every one is a silent skip. Make "unparsed" a first-class status that is counted and printed, never a row that quietly leaves the population.
3. **Plant a known defect and confirm the check fires — in the target script.** Take one string you *know* is bad, in the actual writing system, feed it in, and watch it come back flagged. If it comes back clean, you have measured nothing, and the honest report is "**the gate is inert here**", never "the course is clean".
4. **Check the tokeniser against the script before you look at the data.** `\b`, `[a-z]`, `split(' ')`, `split(/[^a-z']+/)` and NFD normalisation all fail outside ASCII Latin — silently, and almost always in the direction that reads as clean.
5. **Ask what would have to be true for this check to fail**, and whether an earlier gate already forbids it. If the only way to get a non-zero is "the builder violated its own validator", your zero is measuring the validator, not the content.
6. **A uniform verdict is an artefact.** 100% of a class firing, or 0%, means suspect the detector first. Always.
7. **Check the relationship between the two things you are comparing.** Related languages destroy string-overlap detectors. Dialect courses make standard-spelling matchers miss wholesale. Two normalisers in one system will disagree.
8. **Read the vocabulary of the defect list, not just its length.** Ultra-basic function words reading "never taught" is an orthography bug, because no released course fails to teach *yes*.
9. **Replay the tool's stated calibration examples.** A header is a claim, not evidence.
10. **Read the tool's own caveats and price them in.** Several tools in this estate document their own imprecision and are quoted anyway.
11. **Distinguish "my change caused this" from "I am the first person to look here."** These are completely different findings and only one of them is yours.
12. **Re-run the identical check on a course you already believe is clean.** The known-side noise floor is roughly **255 per 1,000 even on mature English courses** — judge by distance from the floor, never distance from zero.
13. **State the check's population coverage.** "The gate would catch that" is only true where the gate actually runs, and several gates in this estate run on well under half the estate.

**Then, and only then**, hand-check the survivors row by row (R0.5 — never extrapolate from a sample) and report both numbers: what the tool said, and what survived.

---

## WORKED CASES

Nine, and they are here because each one names a *different* failure organ. Read the two or three closest to your situation.

### The known/target pair are related languages — WC-F1, Catalan

A known-side answer-leak detector, itself calibrated on 27 real positives rather than a naive probe, returned **1,322 hits**. The truth was **142 high-confidence, 42 of them new**: **1,180 of 1,322 — 89% — were false**, and they were concentrated in `cat_for_spa` (1,170) and `bre_for_fra` (10). The detector's whole identity is *string overlap between the known and target fields*, and Spanish and Catalan simply share words: `recordar una palabra` → `recordar una paraula`. The shared run `recordar una` is cognate vocabulary. The known side is proper Spanish throughout.

**What caught it:** refusing to hand up a raw count. Sorting by course showed 88% sitting in one minority course, which is the shape of an artefact, not of a defect population. Real positives look nothing like it — `eng_for_spa` S54 `queríamos give you más tiempo` is what a leak actually looks like.

**Take away:** before believing any cross-field string-overlap count, check the **genetic distance** between the two languages. Precision on unrelated pairs was ~96%; without the exemption, the estate's cleanest minority courses read as its worst.

### The tokeniser cannot read the alphabet — WC-F2, the inert gate

The known-side vocabulary gate — the check this estate treats as catching the most mistakes — reported **zero violations** on Hindi, Tamil, Japanese and Arabic. Not lenient. **Inert.** Feeding real `known_text` through the exported function showed **13 language families and 31 courses tokenise to zero tokens**. The cause is one line, `split(/[^a-z']+/)`: every non-ASCII character is a separator, the violation loop never executes, and the function returns "no problems".

**What caught it:** reading the code, then confirming by direct invocation on live text.

**Take away:** a zero from a check is only as wide as its tokeniser. This is procedure step 3, and it is the single highest-yield thing in this chapter.

### The matcher silently skipped 70% of the data — WC-F3, Check 18

Check 18 reported clean, course after course. Against a known set of **229 drifted rows it flagged 2**. It was parsing **21,342 of 72,063** presentation clips and silently skipping **50,721** — one template with a hardcoded connector, `, as in`, followed by `if (!m) continue`. The estate mostly says `, is:`. A census found **13,762 distinct narration skeletons**: Tamil, Hindi em-dash forms, Kannada, Chinese, Korean; two families carry no quotes at all (legacy Welsh `<src>`/`<tgt>` markup, and a Japanese frame); Dutch SSML actively poisons a quote scanner.

**What caught it:** measuring coverage instead of trusting the verdict — running the template against every clip and counting the `continue`s.

**Take away:** the replacement is the model to copy. It parses **delimiters, not sentences**; covers 99.99%; returns an explicit `unparsed` status so nothing is dropped silently; and **exits non-zero below 99%**. It now flags 226 of the 229, and surfaced 2,744 previously invisible drift rows across 70 courses. A detector must report its own coverage next to its verdict, and a coverage shortfall is a **failure, not a footnote**. Any matcher containing `if (!match) continue` is a silent-skip machine.

### The normaliser was wrong for the script — WC-F4, Arabic

The estate-wide untaught-word audit read `ara_for_eng` at **1,126 high-confidence defects** — by far the worst course on the estate. After fixing the normaliser, the same course read **0**, and estate-wide residue fell **1,697 → 552** on that one change. The tokeniser stripped Latin punctuation only and folded diacritics via a Unicode range that does not contain Arabic marks, so `هنا؟` never matched the taught `هنا`.

**What caught it:** the *vocabulary* of the defect list. A pile of ultra-basic function words — yes, how, there, not — reading "never taught" is an orthography bug, because no released course fails to teach *yes*. The worker found it mid-run and re-ran before reporting.

**Take away:** when a script-specific audit names a course as your worst, sanity-check the defect list against core function words, and re-run the identical check on a course you already believe is clean.

### The zero was structurally impossible to break — WC-F5, `pdc_for_eng`

"**0 out-of-corpus target tokens across 1,093 generated rows, 0 forward references**" was reported as independent verification. It is **0 by construction**. `checkTiling` already validates every LEGO target against the seed at submit time, and phrases are rebuilt from already-introduced chunks — the vocabulary can hardly escape the corpus it was validated against. The zero confirms the guard is working and carries no information whatsoever about whether the content is right.

Worth knowing where the real signal was: `checkTiling` validates the **target side only**. The known side is genuinely unvalidated, which is exactly where independent evidence lives.

**Take away:** ask what would have to be true for this check to fail. If the answer is "the builder violated its own validator", the zero measures the validator.

### The tool's definition was not the problem's definition — WC-F6, filler BUILD phrases

`filler-build-scan.cjs` defines a filler BUILD phrase *structurally* — the LEGO plus a residue of 1–3 tokens — with no notion of semantic emptiness. Deborah's actual complaint is padding that adds no new grammar (`here`, `yesterday`, `before`); a residue of `Spanish` or `to help` is genuine recombination and precisely what the method wants. Its RAW→CONFIRMED promotion requires the residue to recur 3+ times, which `my`, `your`, `a` and `the` satisfy trivially — **the promotion adds no evidence while sounding like verification.** ~81% false positives.

**What caught it:** running the tool against the five examples its own header claimed it reproduced. It flagged zero of them.

**Take away:** a tool's header is a claim, not evidence. Replay its stated calibration examples before quoting a single number, and always check what a RAW→CONFIRMED promotion actually excludes — a promotion that excludes nothing is decoration.

### It fired on 100% of a class — WC-F7, the edit-impact tool

On its first production use, the edit-impact tool reported that **every** phrase edit had "1 other row carrying the identical old text", and that **every** CJK edit's proposed text was taught "at no point at all". Both artefacts. A display label was compared against an identity, so self-exclusion never fired and the count was always the edited row itself; and `words()` split on a space, so a Japanese known side is one token that can never match a LEGO.

**Take away:** when a detector fires on 100% of a class, suspect the detector, not the class. And never compare a display string to an identity.

### Inflection and inheritance, mistaken for breach — WC-F8, Sinhala

The tool reproduced **27** untaught-vocabulary candidates for the day's `eng_for_sin` edits. Exhaustive adjudication found **1 real breach**. **13** were inflectional variants of a word already taught (`ඔයාගෙන්` ← `ඔයා`, seed 1); **13** were inherited — not introduced by the edits at all: `මිනිස්සු` had been in the course since seed 69. The matcher is unstemmed and exact-surface, **and says so in its own caveat**, which nobody had acted on.

**Take away:** read the tool's caveat and price it in. For any inflecting language an exact-form "untaught" count is an **upper bound, not a finding**. And always ask: *did my change introduce this, or did I just become the first person to look?* (This is also where **K6** bites — the known side may use uninstructed forms of taught words; only genuinely different **words** are defects.)

### Two normalisers in one system disagreed — WC-F9, Spanish `poder`

During the Spanish `poder` audio-generation run of 2026-08-27, a verification pass comparing each generated clip's text against its database row raised **15 apparent mismatches. All 15 were false.** The JavaScript-side `normalizeForAudio` **keeps** a trailing question mark; the database-side normaliser **strips** it. Two normalisers in the same system disagree, so any comparison routed through both reports differences that do not exist.

**What caught it:** the worker noticing the *shape* of the difference — every one a trailing `?` — and re-running on a direct text comparison, which came back clean.

The same run named a genuinely benign class so nobody re-investigates it: **40 pre-existing clips differ from their row text by capitalisation or a trailing full stop only** — same words. That predates the work and is not a defect.

**Take away, and note the sting in its tail:** when a check compares text through a normaliser, verify the normaliser against a **known-identical pair** before trusting any mismatch it reports. A punctuation-only or case-only difference is almost never a real defect — **but a question mark changes how the line is read aloud** (A7, A9), so it is not simply noise either. The two cases must be told apart. Never filter punctuation differences wholesale.

---

## MEASURED BLIND SPOTS — read this before you quote a zero

These are measured, not suspected. If your clean result comes from one of these, you have not measured the course.

- **The known-side vocabulary gate is INERT on 31 courses** (`validation.cjs:818`, `split(/[^a-z']+/)`): every Devanagari, Tamil, Arabic and CJK character is a separator.
- **The same gate silently skips 60 of 145 courses** — the contract fallback fires only for `*_for_eng`. No warning, no log line.
- **Check 6 (unpronounceable) flags EVERY phrase as garbage** on Hindi, Hebrew, Thai and the Indic courses; their scripts are missing from its keep-list.
- **Check 3/4 (wrong language) has detectors for five scripts only.** Cyrillic, Greek, Hebrew, Devanagari, Thai, Tamil, Kannada, Telugu, Georgian and Ge'ez are invisible.
- **Check 13b returns `NaN` on caseless scripts, and `NaN` reads as a pass.**
- **Check 15 (identical known/target) has a five-pair cognate allowlist, all `eng|X`.** Every related-language pair — `cat_for_spa`, `bre_for_fra`, `nld`/`deu` — reports its legitimate cognates as defects. This is WC-F1 wearing a different hat.
- **Checks 11 and 12 are inert on CJK and Thai**: the tokeniser produces one token for a whole sentence.
- **The submit-time gate has never examined the ~1M rows already in the database.** It runs at submit time only. "The gate would catch that" says nothing about existing content.

Before you quote any of these numbers, re-derive the blind-spot list from the code — this list is a starting point and the code moves.

---

## WHAT YOU OWE WHEN YOU REPORT

- **Both numbers**: what the tool said, and what survived hand-checking. Never the raw count alone.
- **The denominator and the coverage percentage**, next to the verdict.
- **The distribution across courses**, not just the total — that is what makes an artefact visible to your reader as well as to you.
- **Named false-positive classes**, so the next worker does not re-investigate them. WC-F9's "40 clips differ by case or a full stop only" is the model: name the benign class explicitly and it stops costing anyone time.
- **If the check was inert: say "the gate is inert here", not "the course is clean."** These are opposite findings and the estate has repeatedly read one as the other.

---

## IF THIS CHAPTER DID NOT FIT

Try **HB-08** (a human raised it), **HB-12** (the detector is fine and the brief is wrong), **HB-14** (the course reports clean and the question is whether to release), **HB-04** (the untaught hits survived and you now have to fix them).

If none of those fit either, escalate under **H3** in `00-index.md` — with a proposed answer, drawn from whichever of the nine cases above is nearest, and say which one and why.
