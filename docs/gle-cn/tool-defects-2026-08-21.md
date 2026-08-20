# Six tools caught lying — Connemara build, night of 20–21 August 2026

> **Kai's standing rule: a measure that lies is worse than no measure. Fix the thing that claims to
> work.** Every one of these was caught by a worker checking rather than trusting, and each had
> already come within one step of becoming a linguistic ruling or a rewritten sentence.

Read this before you cite a number from any of these tools.

---

## The shape they share

Five of the six produce **a plausible-looking number that is an artefact of the tool**, not a fact
about the language or the course. That is worse than a crash. A crash stops you; a false zero reads
exactly like *"this dialect does not have this form"* and gets written into a ruling.

The generalised defence, which is now enforced in the corpus probe itself:

> **When a probe returns zero, check that every word in the probe has a positive control of its
> own.** A zero for a phrase means nothing if one of its own words is near-zero in the corpus's
> own spelling.

---

## 1. The corpus reader returns false zeros on binary-classified files

Ó Curnáin vols I–III are phonetic transcription in a custom font; 6–13% of every file extracts as
control bytes. `grep` classifies them as binary and prints *"Binary file matches"* instead of
counting, so `grep -c` returns **0** for words that are demonstrably present. It produced a false
zero for `Gaeilge`, whose real count is **121**.

**Fixed:** read in Python via `tools/gle-cn/ocurnain-probe.py`, which prints its controls first and
refuses to be trusted until they pass.

## 2. The apostrophe bug — the same false zero, but *near*-zero, so it survives the check

The apostrophe in the extracted volumes is almost never U+0027. In `b'fhéidir` it is U+0092, a
Windows-1252 curly quote that survived extraction, in 160 of 166 hits against exactly **one** real
ASCII apostrophe. Probing `b'fhéidir` returns **1** when the true count is 166+.

This is nastier than the binary trap, because a *near*-zero looks like a genuine noise-floor result
and therefore **survives the "a bare zero is not evidence" check**. A worker was one step from
ruling that Connemara does not use `b'fhéidir`.

**Fixed:** every apostrophe variant is folded to U+0027 in both corpus and pattern, at the source.

## 3. The orthography trap — found 2026-08-21, same family, third instance

Ó Curnáin does not spell the prepositional pronouns the way the standard does. **`agat` scores 21
across ~2,700 pages. The form he actually writes, `a'd`, scores 527.**

So a probe for `ceart agat` returns 0 — and that zero is a fact about spelling, not about the
dialect. Anyone measuring an idiom built from prepositional pronouns (`tá an ceart agat`,
`tá fhios agam`, `tá Gaeilge agat`) will otherwise "discover" that Connemara lacks the commonest
idioms in the language.

**Fixed:** `ocurnain-probe.py` now detects a zero on a probe containing a standard-spelling
prepositional pronoun, re-probes it in the dialect spelling automatically, and prints
*"THIS ZERO IS NOT EVIDENCE until you read that number instead."*

## 4. The vocabulary lister was rewriting English

`scripts/gle-cn/vocab.cjs` applied **Irish demutation to the English known side**. Its lenition
clause (consonant + `h` → consonant) silently rewrote ordinary English before storing it:

| written | stored as |
|---|---|
| the | `te` |
| that | `tat` |
| think | `tink` |
| this | `tis` |
| thank | `tank` |
| she | `se` |
| show | `sow` |
| than | `tan` |

Two kinds of damage. It **filled the known list with non-words**, which is why the list reads far
larger than the gate actually accepts and why a worker could look up a plainly-taught word and not
find it. And it **conflated distinct English words** — because *thank* stored as `tank`, a phrase
using an untaught *tank* would have passed. **A checker that lets a breach through is worse than
no checker at all.**

**Fixed:** the known side no longer demutates. The Irish `words`/`demutate` path is untouched —
mutation handling on the target side was always correct and is still needed.

## 5. The checkpoint disagreed with the submit endpoint about English contractions

Same bug's second head: nothing expanded contractions, so *she's* tokenised as `se's` and matched
nothing — while `/api/seed/complete` expands it to *she is* and accepts it happily.

The two therefore disagreed about **natural English**, and the disagreement pushed workers into
stiffer phrasing to appease a tool that was wrong. That is a quality cost paid invisibly, right
across the course, and it never shows up as an error.

**Fixed:** the known side now tokenises through the submit endpoint's **own** exported
`tokenizeKnown` from `services/course-builder/lib/validation.cjs`, so the two agree by
construction rather than by coincidence.

## 6. The bracket number means two different things ⚠️ NOT YET FIXED

The build brief documents the number on a USE line as **the target syllable count**:

    - I don't understand everything now → ní thuigim chuile shórt anois [8]

The parser does something else with it. `markdown-parser.cjs` copies a single bracket number into
**both** `known_score` and `target_score`; `phrase-structure.cjs` then rejects any USE phrase with
`known_score < 5` and reports it as **"broken English. Remove or rewrite them."**

So **a short, natural, perfectly correct sentence is rejected as broken English** — and the message
sends the worker off rewriting English that was never wrong. A worker hit this tonight.

**The fix is small but it is a decision, not a patch**, which is why it is flagged rather than
applied: either the docs stop calling it a syllable count, or the parser stops feeding a syllable
count into a quality gate. The two-number form `[7,8]` sets the fields separately and is the
existing escape hatch. Until it is resolved, **do not shorten a good sentence to satisfy this
gate** — write the sentence and note the rejection.

---

## Where the tools live

The build tools were in `scripts/`, which is gitignored — so the fixes above would have died with
one machine and the next worker would have lost the same hours again. The specific files are now
**tracked exceptions**, committed at their existing paths so that every brief, README and dispatch
that already references them keeps working:

- `scripts/gle-cn/vocab.cjs` — learner vocabulary; **defects 4 and 5 fixed here**
- `scripts/gle-cn/checkpoint.cjs` — the seven-point band check
- `scripts/gle-cn/q.cjs` — DB access (reads credentials from the environment; holds none)
- `scripts/gle-cn/scratch-d1/precheck.cjs`, `scripts/gle-cn/scratch-d2/preflight.cjs` — the
  pre-checkers that call the server's own validation library, and cut per-seed time from ~55
  minutes to 10–15
- `scripts/gle-cn/w-D2/chunks.cjs` — the palette lister: prints every `known → target` chunk
  introduced before a seed. **This is the list the gate actually enforces**, as against the word
  list `vocab.cjs` prints
- `scripts/gle-cn/w-D5/tile.cjs` — syllable estimate against the cap, and "can this target tile
  from taught chunks?"
- `scripts/gle-cn/READ-ME-PRECHECK.md` — how to use them, and the traps they save you from

A later tidy could move them to `tools/gle-cn/`; that was not done tonight because live workers
are running against these paths right now and moving them would break them mid-build.
