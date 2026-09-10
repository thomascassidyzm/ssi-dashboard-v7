# Splitting the methodology canon — proposed shape

*(Revised 2026-09-10 after Kai's addition: the design is **three** documents, not two. The decision log is §4; the classification table in §5 now has `decision-log` as a fourth destination, and the language-appendix column has been reconsidered in its light.)*

**For Kai to rule on. Nothing is being rewritten until he does.**

**Censused at commit `6aa2b716` (origin/main, 2026-09-10).** `course-methodology-canon.md` at that commit: **234,815 characters, 1,275 lines** — it has grown ~8,300 characters since this job's brief was written, which is itself part of the argument. It carries **142 numbered rules** (R0.1–R0.18, S1–S16, L1–L26, PR1–PR2, P1–P23, K1–K24, A1–A22, O1–O11), **27 clashes** C0–C26 of which **only C24 is still open**, **16 worked cases** (WC-1…WC-7, WC-F1…WC-F9), a 13-item counting checklist, the enforcement table, the redirect map and 24 gaps.

Every course-fix worker is told to read it first. Our standing rule is that a shared document over ~20,000 characters gets digested rather than handed over; this is **eleven times** that, and a worker that reads it at step 5 of a 90-step run carries all of it through the other 85.

---

## 1. THE SHAPE

Three documents, plus a thin per-language layer, exactly as Kai described it on 2026-09-10:

> "I'd like it to focus on how we do fixes, with language-specific examples that can be treated as a framework if valid. So a simpler set of very basic rules can be its own document, then one sort of handbook on how to handle all kinds of issues that come up often — which is the really valuable stuff. Both should be available, but perhaps the agent can read only the parts of the manual it thinks are relevant, and keep looking until it finds it? And if nothing's available, that's when you come back to me to ask for direction — still with a suggestion, based on past fixes!"

| Layer | File(s) | Read | Target size |
|---|---|---|---|
| **THE RULES** | `course-methodology-rules.md` (repo root) | **Whole, every time, by every worker.** No digest, ever. | **≤ 14,000 chars; hard ceiling 15,000** |
| **THE HANDBOOK** | `docs/methodology-handbook/00-index.md` + `HB-01…HB-16` | Index whole; then **exactly one chapter**; back to the index if it was the wrong one | index ~8k; chapters ≤ 18k each |
| **LANGUAGE APPENDICES** | `docs/methodology-handbook/lang/<code>.md` | Only your own language, only when a chapter sends you | ≤ 6k each |
| **THE DECISION LOG** | `docs/decision-log/INDEX.md` + one file per entry | **NOT part of a fix.** Grepped — when a terse rule fails to convince, or before an H3 escalation | index bounded at one line/entry; entries ~2.5k; corpus unbounded |

Kai's addition, 2026-09-10: *"Also wouldn't hurt to have a long log of decisions and reasons, just so we can go back and check there if needed - but that doesn't need to be read most of the time."*

**The log is not a bolt-on; it is what makes the other two able to be short.** The canon is long partly because every ruling drags its specifics in with it — which dictionary said what, which 41 rows were affected, which detector ran 100% false on which language. Those specifics are genuinely valuable and they are **archive, not instruction**. The log absorbs them; the rule keeps one sentence, the chapter keeps the pattern plus one line of evidence, and both cite the entry. Full design in §4.

A worker's worst case is **rules (14k) + index (10k) + two chapters (36k) = 60k**, and its typical case is **rules + index + one chapter ≈ 38k** — against 235k today. **The log adds nothing to either figure**, which is the whole point of it: it is read by exception, one entry at a time, and most jobs never open it. The rules document alone, which is what a worker doing routine work actually needs, is **6% of the current canon**.

**The split axis is the KIND OF PROBLEM, not the language.** This is Kai's correction of the alternative proposal and it is the crux of the design. A Japanese fixer wants the Irish worked case when the *shape* of the problem is the same, and wants none of Irish grammar. So a chapter is "a LEGO is deadlocked" or "one word, two senses" or "a detector returned hits that are mostly false", with Irish, Welsh, Arabic and Catalan cases inside it. Language-specific *answers* — the ones that must never travel — are quarantined in `lang/`.

**Two things do NOT go into either document,** because they are project state rather than methodology, and keeping them in the canon is a large part of why it grew:

- **PART FOUR, the redirect map** (183 rule statements across 61 files, plus the stale list and the single-source list) → `docs/canon-redirect-map.md`. It is a work order for a stripping pass, not a rule anyone applies.
- **The GAPS list** (24 items) → `docs/canon-gaps.md`, or WORKLIST items. Same reasoning.

Both stay, verbatim. They just stop being loaded by every fixer.

---

## 2. THE RULES DOCUMENT — proposed table of contents

**69 entries, one sentence each.** The design move that makes 14,000 characters achievable is that **each rule here is a single sentence carrying its id and a citation into the decision log**. Its provenance quote, its evidence and its rejected alternatives live in the log; its application lives in a handbook chapter. The rules document says *what is binding*; it does not argue for it, and it no longer has to, because the argument is one grep away and permanently addressable.

```
R0.18  a SOFT preference never reaches backwards into correct live content  [DL-2026-09-10-01]
K24    a harmless-direction clash still fails when the known word is basic and very early  [DL-2026-09-10-03]
```

That is the whole line format. ~150 characters × 69 ≈ 10,400, plus headings and front matter ≈ 12,500 — inside the 14,000 target, with real headroom for the rulings that land tomorrow.

```
COURSE METHODOLOGY — THE RULES
  Front matter: what HARD and SOFT mean (R0.18), and the one open clash (C24)

0. BEFORE YOU TOUCH ANYTHING  (13)
   R0.1  whole-course consistency, not just the row
   R0.2  no new grammatical case without introduction
   R0.3  rewriting or deleting the phrase are both legitimate fixes
   R0.4  follow the escalation ladder; never skip to the sweep
   R0.5  hand-check every affected row; never extrapolate
   R0.6  never derive an estate-wide rule from one course
   R0.7  consistency decisions belong to the course they were made for
   R0.9  a raw match count is a hypothesis, not a work order
   R0.10 fix autonomy is granted per occasion, by Kai, and never recurs
   R0.11 builder prompts and shared tooling go through Tom
   R0.12 Welsh is the template; a check that flags Welsh is probably wrong
   R0.13 prefer authored work to find-and-replace; read back what a regex touched
   R0.18 a SOFT preference never reaches backwards into correct live content

1. WHAT A SEED IS  (10)   S1 S2 S3 S4 S5 S7 S8 S10 S11 S15
2. WHAT A LEGO IS  (9)    L1 L2 L3 L4 L11 L12 L15 L16 L26
3. WHAT A PRACTICE PHRASE IS  (9)   P1 P2 P3 P4 P6 P10 P14 P16 P17
4. THE KNOWN SIDE AND THE TARGET SIDE  (11)   K1 K2 K3 K6 K7 K8 K11 K12 K16 K21 K22
5. AUDIO AND TEXT  (6)    A1 A2 A3 A4 A10 A11
6. OBLIGATIONS — fix X, you must also fix Y  (11)   O1–O11, the table unchanged
7. WHAT IS KAI'S CALL, NOT YOURS  — the ours/his table, his languages, and the
   two "asking him is the error" cases, unchanged
8. WHAT THE MACHINE ACTUALLY BLOCKS — the ten-row enforcement table and the
   bypasses, unchanged.  (The blind-spots list moves to HB-01, where it is used.)
9. HOW TO USE THE HANDBOOK — three lines: index, one chapter, and H3 on no-match
```

**Selection rule, stated so Kai can disagree with it cleanly:** a rule is in this document if it is (a) a *definition* of a seed, LEGO, phrase, ZUT or clip, (b) a constraint that applies on **every** job regardless of what kind of problem you arrived with, or (c) a gate on cost or irreversibility. Everything else — the procedures, the judgement calls, the "how do I actually do this" — is handbook.

---

## 3. THE HANDBOOK — full chapter list

Derived from what is actually in the canon plus the worked cases in PART THREE. Not invented from first principles: every chapter below is backed by named rules and, where they exist, named worked cases.

| # | Chapter | One line | Worked cases it carries |
|---|---|---|---|
| **HB-01** | A detector fired and the hits are mostly false | Establishing whether a count is a defect population or an artefact of a tokeniser, a normaliser or a matcher — in both directions, including the false zero | **WC-F1…WC-F9** + the 13-item checklist |
| **HB-02** | One known word, two target words | ZUT collisions: when to merge, when to separate by context, when to keep the clash and explain it in the presentation | WC-4 (partly) |
| **HB-03** | A LEGO is the wrong size, or deadlocked | Redrawing chunk boundaries; the LEGO that cannot be glossed; two LEGOs that block each other; suppressing a debut | — (richest gap; needs the gle bucket-1 reorder work written up) |
| **HB-04** | A phrase uses something untaught | Adjudicating untaught-vocabulary findings: inflection vs new word, known side vs target side, and fixing the prompt rather than the translation | **WC-7** |
| **HB-05** | The audio says something the text does not | Deciding whether the *recording* or the *writing* is wrong, then repairing without deleting anything | **WC-1, WC-3, WC-4** |
| **HB-06** | A text edit is about to break audio | Ordering a text change against its clips: what nulls a link, what survives, what a question mark costs | WC-F9 (punctuation half) |
| **HB-07** | The seed itself is the defect | When the fix is the seed, not the phrase: register, marker words, moving a pattern, rebuilding a stretch | — |
| **HB-08** | A human reviewer's flag does not survive checking | Validating Deborah's and proofreaders' findings before applying them, and overturning an applied chain | **WC-6, WC-2** |
| **HB-09** | Practice coverage is thin, or a bucket is empty | Reading phrase-count and spread findings; what an empty basket actually means; never manufacturing BUILD phrases | — |
| **HB-10** | A particle or function word needs introducing | Consolidation, the contrastive twin debut, multi-sense particles, bound elements | — |
| **HB-11** | The known side reads badly, or needs editing | Naturalness against ZUT, tags, answer-leak, and what editing the known side costs | **WC-2** |
| **HB-12** | A one-off fix wants to become a sweep | The escalation ladder in practice; re-deriving a brief's count; where a sweep is legitimate and where it propagates an error | WC-F1 (partly) |
| **HB-13** | It is deliberate design, not a defect | Recognising intentional ambiguity, deliberate overlap, "unlikely to come up", components, and Welsh | — |
| **HB-14** | A course reports clean but is not ready | Coverage vs verdict at release; missing slots; human-voice courses; banking content without voice | **WC-5**, WC-F3 (partly) |
| **HB-15** | A per-course convention has to be decided | Register, pro-drop, honorifics, gender, compounding, minority-language orthography — decided once, held consistent | — |
| **HB-16** | The fix is right but the blast radius is not mapped | Finding everything a change touches: shared English seeds, sibling courses, approval state, downstream phrases | WC-3 (partly), WC-4 (partly) |

**HB-01 is written in full**, as the specimen: `HB-01-detector-hits-are-mostly-false.md` (17,350 chars). It was chosen because it has by far the richest existing material — nine worked cases, a 13-item checklist and a measured blind-spots list — so it is the fairest test of the format.

**Six chapters carry no worked case yet** (HB-03, HB-07, HB-09, HB-10, HB-13, HB-15). That is honest and it is useful: it names exactly where the canon is thin on evidence, and HB-03 in particular is the biggest hole given how much LEGO-boundary work the estate actually does.

### What a chapter keeps, and what it hands to the log

**Pattern plus one line of evidence per case, then a `[DL-…]` pointer.** The line to draw, stated so Kai can argue with it: the numbers that make a pattern *recognisable* stay in the chapter — "89% of the hits sat in one course", "21,342 of 72,063 clips", "27 candidates, 1 real". The forensic apparatus does not: which six gates were run per clip, which z-score, which dictionaries, the ⚠ live-status of a fix that never landed.

HB-01 was written at that altitude already, so it is a fair specimen of the target. **WC-1, the Sinhala case, is the clearest example of material that must move** — its six-gates-per-clip verification, its `z = 0.0` argument about headword duration, and its "⚠ still points at the corrupt clips, checked 2026-08-18" are three different kinds of thing, and only the first sentence of it belongs in HB-05.

That third kind is worth naming separately: **the ⚠ live-status notes in WC-1 and WC-3 are neither rule nor archive — they are open work**, and belong in `docs/canon-gaps.md` or WORKLIST. A fix that was designed, verified and never applied is currently recorded as a worked case, where it reads as finished.

### Chapter format, as the specimen shows it

Fixed, so a worker can skim any chapter the same way: **symptoms** → **not this chapter** (sister pointers) → **rules in play** (ids into the rules doc) → **the shape** (one paragraph on what is really going on) → **the procedure** (numbered, actionable) → **worked cases** (Situation / What caught it / Take away) → **what you owe when you report** → **if this chapter did not fit**.

### How a chapter is loaded

**One chapter per file, flat, with the index as the only manifest.** A worker `cat`s the index, then `cat`s one chapter. Not a single file with anchors, because the load unit has to equal the read unit and a `cat` of an anchored file still costs the whole file — which is the defect being fixed. Not a JSON manifest, because it adds a parse step that a worker under load will skip in favour of just reading the file, and because grepping a markdown table of symptom sentences is something every worker already does correctly without being told.

### The no-match path — **H3**, written into the handbook's own front matter

Kai's instruction is a rule of the handbook, not a courtesy. An escalation has five required parts and is incomplete without any of them: the symptom and its rows with a denominator; **which chapters you tried and why each was wrong**; **the nearest analogous past fix, named**, with one sentence on why it is close and one on where it differs; **your proposed answer as a decision he can accept or reject**, with the blast radius already measured; and your confidence plus the one thing you could not verify. Plus: do not sit idle — do everything the answer does not depend on first, and say what is already done. Full text at `00-index.md` § H3.

---

## 4. THE DECISION LOG

**Files committed in this pass:** `docs/decision-log/README.md` (the format), `docs/decision-log/INDEX.md`, and two specimen entries — **DL-2026-09-10-03** (the Irish overturn Kai named) and **DL-2026-09-10-04** (an agent-decided tool ruling, included to show the non-Kai decider and the `Produced:` field carrying code).

### Front matter — the first line of the log

> **DO NOT READ THIS AS PART OF A FIX. It exists to be SEARCHED.**

That is the opening line of `README.md`, and it is repeated at the head of `INDEX.md`. Without it the log becomes a fourth thing every worker loads and the split has achieved nothing.

### Entry format — nine fields, five required

`id` · `date` · **decided by** (Kai / Tom / an agent, and if an agent, *under whose grant, given when, for what occasion* — R0.10 makes that distinction load-bearing) · `status` (STANDING / SUPERSEDED BY / REVERSED BY) · **produced** (rule ids, chapter ids, code paths, tests — or `nothing`, which is a real and common answer). Then five prose fields:

| Field | Required | What it holds |
|---|---|---|
| **DECIDED** | ✓ | One sentence. The ruling as it would be quoted. |
| **CONTEXT** | ✓ | What was being worked on, and what forced the question. |
| **REASONING** | ✓ | Why — **including the decider's verbatim words**. A paraphrase of Kai is not a ruling by Kai. |
| **EVIDENCE, AND ITS LIMITS** | ✓ | The specifics: sources, counts, rows, courses, tools. **And what could not be reached.** An entry stating no limit is treated as not having looked. |
| **REJECTED, AND WHY** | ✓ (`nothing was rejected` is valid) | The alternatives, **stated at their strongest**, with the reason each lost. |
| **SUPERSEDES / SUPERSEDED BY** | — | |
| **OPEN AFTER THIS** | — | What this did *not* settle, and who owns the remainder. |

**REJECTED, AND WHY is the field that earns the log its keep**, and Kai's own example is why. On 2026-09-10 a well-sourced recommendation to exempt the Connemara course from the `iarracht`/`ag iarraidh` split was overturned. The recommendation was strong — de Bhaldraithe, the foundational Cois Fharraige lexicographer, glosses `ag iarraidh` as *trying to* throughout his own dictionary; so do Ó Dónaill and Bedell's 1685 Bible; no dedicated alternative exists that Connemara natives reach for instead; and the clash it proposed is in the direction this canon itself calls harmless (**K3**). Kai granted all of that and ruled the other way anyway, because a very basic word arriving very early with two senses throws learners regardless. **That reason is more transferable than the ruling** — it is a rule about clashes, not a fact about Irish, which is exactly why it produced **K24** rather than an Irish note. The ruling tells you what to do in Irish; the overturn tells you what *kind of argument loses*, which works in every language. An entry without this field would have kept the first and thrown away the second.

Full worked specimen: **DL-2026-09-10-03**, reproduced in Appendix C.

### One file per entry — and the reason is concurrency, not taste

**Recommendation: one file per entry**, `docs/decision-log/YYYY-MM/YYYY-MM-DD-NN-slug.md`, with a generated `INDEX.md` of one line each. Not one file, and not one file per month.

Judged on how it will actually be appended to. Rulings land at **two to four a day**, and **every worker on this estate now runs in its own git worktree on its own branch off `origin/main`** — that is a structural fact about this machine, not a preference. An append-only single file, monthly or otherwise, puts every worker's append on the same last line: two rulings landed on the same afternoon conflict on merge, and whoever merges second resolves it by hand. A new file per entry **never conflicts**, greps in one `grep -rl`, and lets an entry be corrected later without touching its neighbours. The month directory exists only to keep listings readable.

### What happens when it gets large

~2,500 characters an entry × ~1,000 entries a year ≈ **2.5 MB/year**. That is fine, because nobody reads it by default — an archive can be far larger than a document everyone loads. But **not unbounded**, and the thing that must stay bounded is the **INDEX: one line per entry, under ~200 characters, no exceptions.** At 1,000 entries that is ~200 KB — still grep-able, past reading.

**When the index outgrows a single grep, add facets** — generated sub-indexes by rule id, by language, by decider. **Never prune entries.** Pruning the log destroys the only thing it is for, and a superseded decision is one of the most valuable things in it.

### Cross-referencing — and it is a test, not a convention

Every rule and every chapter cites the entries behind it; every entry names what it produced. This is what makes terseness safe: a worker that doubts a one-sentence rule follows the pointer instead of the rule having to carry its evidence inline — which is precisely how the canon reached 235,000 characters.

A convention maintained by memory is not maintained, so this gets a check — `docs/decision-log/links.test.js`, in the nightly run — asserting that (1) every `DL-…` cited in the rules or the handbook resolves to an entry file, (2) every entry whose `Produced:` names a rule or chapter is **cited back** by it, so the link is bidirectional or broken, and (3) every entry appears in `INDEX.md` exactly once with a matching id. A dangling citation becomes a failing test rather than a reader's dead end.

### The back-fill

The existing canon is a decision log that was never filed as one — 142 rules, 27 clashes and 16 worked cases, most carrying a date, a decider and verbatim words already. **Back-filling it is its own job** and should follow Kai's ruling on the shape, not precede it. It is also the natural moment to recover what the log format asks for and the canon does not consistently record: the **rejected alternative**. For most existing rules that information is in the git history of the canon and in the conversations, and for the oldest ones — pre-2026-08-02, where the conversation record begins — it is gone, and the entry should say so rather than invent one.

---

## 5. CLASSIFICATION — every rule and worked case

**Four destinations: `rules` · `handbook chapter` · `language appendix` · `decision-log`.** Nothing is dropped; two entries are flagged as redundant and **neither is deleted**.

The rule/chapter allocations below are unchanged from the two-document version — the log does not move *rules*, it moves the **material inside them**. So read the table as "where the instruction goes", and the subsection after it as "where the evidence goes", and note that **almost every row in the table also produces at least one log entry**.

Two rows changed on reconsideration, and both moved *toward* the log:

- **S16 (Irish *try*)** was `language-appendix`. It splits three ways now. The operative preference and the HARD genitive rule (`ag déanamh iarrachta`, never `iarracht`) are things a fixer **applies**, so they stay in `lang/gle.md` as four short lines; the *try*/*want* clash pattern goes to **HB-02** as one line of evidence; and **the four dictionaries, Bedell's 1685 Bible, the unreachable corpas.ie and Pota Focal, the two self-labelled feel-not-source paragraphs, and the overturned de Bhaldraithe recommendation all go to the log** — DL-2026-09-10-03, which is why it is the specimen.
- **R0.12 (Welsh)** was `rules` + `lang/cym`. Still both, but the third statement buried under that one id — the history of the grammar sweep that "fixed" Aran's deliberate mutations and had to be reverted — is **archive**, and is the evidence a doubting worker will want. It goes to the log.

**The general form of that reconsideration:** a language appendix holds only what a fixer must *apply* in that language. The attestations, the sources and the arguments that produced it are log. This shrinks `lang/` substantially and is the right direction — an appendix full of evidence is an invitation to reason from another language's evidence, which R0.6, R0.7 and K12 each forbid separately.

### Part One rules

| Rule | Goes to | Rule | Goes to | Rule | Goes to |
|---|---|---|---|---|---|
| R0.1 | **rules** | L1 | **rules** | P1 | **rules** |
| R0.2 | **rules** | L2 | **rules** | P2 | **rules** |
| R0.3 | **rules** | L3 | **rules** | P3 | **rules** |
| R0.4 | **rules** | L4 | **rules** | P4 | **rules** |
| R0.5 | **rules** | L5 | HB-02 | P5 | HB-09 |
| R0.6 | **rules** | L6 | HB-03 | P6 | **rules** |
| R0.7 | **rules** | L7 | HB-10 | P7 | HB-09 |
| R0.8 | HB-08 | L8 | HB-10 | P8 | HB-09 |
| R0.9 | **rules** | L9 | HB-10 | P9 | HB-09 |
| R0.10 | **rules** | L10 | HB-10 | P10 | **rules** |
| R0.11 | **rules** | L11 | **rules** | P11 | HB-09 |
| R0.12 | **rules** + `lang/cym` | L12 | **rules** | P12 | HB-09 |
| R0.13 | **rules** | L13 | HB-03 | P13 | HB-15 |
| R0.14 | HB-07 | L14 | HB-03 | P14 | **rules** |
| R0.15 | HB-13 (+ rules §7 pointer) | L15 | **rules** | P15 | HB-13 |
| R0.16 | HB-08 | L16 | **rules** | P16 | **rules** |
| **R0.17** | ⚠ **REDUNDANT — flagged, not deleted** | L17 | HB-03 | P17 | **rules** |
| R0.18 | **rules** (front matter) | L18 | HB-03 | P18 | HB-09 |
| S1 | **rules** | L19 | HB-02 | P19 | HB-09 |
| S2 | **rules** | L20 | HB-02 | P20 | HB-09 |
| S3 | **rules** | L21 | HB-09 | P21 | HB-09 |
| S4 | **rules** (+ HB-13) | L22 | HB-10 | P22 | HB-09 |
| S5 | **rules** | L23 | HB-13 | P23 | HB-09 |
| S6 | HB-07 | L24 | HB-02 | K1 | **rules** |
| S7 | **rules** | L25 | HB-03 | K2 | **rules** |
| S8 | **rules** | L26 | **rules** | K3 | **rules** |
| S9 | HB-03 | PR1 | HB-02 | K4 | HB-02 |
| S10 | **rules** | PR2 | HB-02 | K5 | HB-02 |
| S11 | **rules** (+ HB-16) | A1 | **rules** | K6 | **rules** |
| S12 | HB-07 | A2 | **rules** | K7 | **rules** |
| S13 | HB-15 | A3 | **rules** | K8 | **rules** |
| S14 | HB-07 | A4 | **rules** | K9 | HB-11 |
| S15 | **rules** | A5 | HB-06 | K10 | HB-15 |
| **S16** | **`lang/gle.md`** | A6 | HB-06 | K11 | **rules** |
| O1–O11 | **rules** §6, table unchanged | A7 | HB-06 | K12 | **rules** |
| §7 Kai's call | **rules** §7, unchanged | A8 | HB-06 | K13 | HB-11 |
| PART TWO — blocks table | **rules** §8 | A9 | HB-06 | K14 | HB-04 |
| PART TWO — blind spots | **HB-01** | A10 | **rules** | K15 | HB-04 |
| PART TWO — Check 20 | HB-01 + `docs/canon-gaps.md` | A11 | **rules** | K16 | **rules** |
| PART FOUR — redirect map | `docs/canon-redirect-map.md` | A12 | HB-14 | K17 | HB-02 |
| GAPS 1–24 | `docs/canon-gaps.md` | A13 | HB-05 | K18 | HB-15 |
| CLASHES C0–C23, C25, C26 | closed; provenance stays in canon history | A14 | HB-05 | K19 | HB-15 |
| **CLASH C24** (open) | **rules** front matter — the one live clash | A15 | HB-05 | **K20** | ⚠ **REDUNDANT — superseded by K22; flagged, not deleted** |
| | | A16 | HB-14 | K21 | **rules** |
| | | A17 | HB-14 | K22 | **rules** |
| | | A18 | HB-14 | K23 | HB-02 |
| | | A19 | HB-05 | K24 | HB-02 |
| | | A20 | HB-05 | | |
| | | A21 | HB-05 | | |
| | | A22 | HB-05 | | |

**Totals: 69 to the rules document · 70 to handbook chapters · 1 to a language appendix (S16) · 2 flagged redundant · 0 deleted.**

### Worked cases

| Case | Goes to | Why |
|---|---|---|
| WC-1 Sinhala — corrupt stored text, not a bad recording | HB-05 | The canonical "which one is lying" case |
| WC-2 `yaskot` — the answer sitting in the question | HB-11 (+ HB-08 pointer) | Answer-leak on the known side; also the "did the gate exist yet?" lesson |
| WC-3 Chinese — 236 wrong recordings, right ones already existed | HB-05 (+ HB-16) | Mechanism-before-repair; the correct clips already existed |
| WC-4 Italian — one English over five Italians | HB-05 (+ HB-02) | Fixing the side that is actually wrong |
| WC-5 Portuguese — a speed error inside shipped work | HB-14 | Nothing failed; only config comparison caught it |
| WC-6 Finnish — an applied chain overturned from first principles | HB-08 | A completed, confirmed chain can still be wrong at the root |
| WC-7 Arabic *yesterday* — right detector, wrong question | HB-04 (+ HB-01 pointer) | The framing failed, not the detection |
| WC-F1…WC-F9 | **HB-01**, all nine | Each names a different failure organ |
| "Before you believe a count", 13 items | **HB-01**, as the procedure | It *is* the chapter's procedure |

### What moves to the decision log, by category

| Material | Currently in | Log takes |
|---|---|---|
| **Every rule's provenance quote and date** | inline in each of the 142 rules | the verbatim words, the date, the conversation it came from |
| **The 27 clashes C0–C26** | a whole section at the head of the canon | each closed clash becomes an entry: what was in tension, how Kai ruled, **what he rejected**. C14 was ruled three times — that history is exactly what the log is for. Only **C24** (open) stays in the rules front matter |
| **The 16 worked cases' forensic apparatus** | inline in PART THREE | the six gates per clip, the z-scores, the whisper confirmations, the spend figures, the "checked 2026-08-18" stamps |
| **Language attestations** | S16, R0.12, minority-orthography rails | dictionaries, corpora, what could not be reached |
| **Overturned recommendations** | mostly nowhere — this is the biggest current loss | the REJECTED, AND WHY field on every entry |
| **PART TWO's superseded checks** (Check 14 → 21, the second Check 17, K20 → K22) | inline, as corrections | supersession is a `Status:` field, and the old entry stays readable |
| **The 24 GAPS** | a section of the canon | **no** — gaps are open work, not decided; `docs/canon-gaps.md` |
| **PART FOUR's redirect map** | a section of the canon | **no** — a work order; `docs/canon-redirect-map.md` |
| **The ⚠ live-status notes in WC-1 / WC-3** | inside worked cases, reading as finished | **no** — unapplied fixes are open work; WORKLIST |

### The two flagged as redundant — **not deleted, for Kai to rule on**

- **R0.17** — "a check number names exactly one check; the second Check 17 gets renumbered". This is a **work order with a file-and-line table**, not a rule anyone applies while fixing a course. It should become a WORKLIST item; the ruling itself ("renumber", Kai, 2026-09-08) stays in git history and in `docs/canon-redirect-map.md`. It is flagged because it is the clearest example of the canon absorbing operational state.
- **K20** — explicitly marked "SUPERSEDED BY K22 (Tom, 2026-09-08)" in its own first words. It should survive as a one-line redirect stub so anything citing K20 still lands somewhere, but it carries no independent content. **With the log this stops being a judgement call**: K20 becomes an entry with `Status: SUPERSEDED BY DL-…`, fully readable, and the rules document simply does not list it. That is the cleanest case for the log's existence — a rule that is dead as instruction and alive as history.

Everything else earns its place. Notably **not** flagged, though a reader might expect it to be: **S4** (overlap is never a defect) looks like it merely restates **S3**, and does not — S3 is the HARD coverage rule and S4 exists precisely to stop a worker reading coverage as a partition. Keep both, adjacent.

---

## 6. HONEST READ — the three things most likely to go wrong

### (a) Rules that resist the split, because they are half-binding and half-guidance

Nine, in descending order of how much trouble they will cause.

1. **R0.18, S15 and R0.15 together — the meaning of SOFT.** R0.18 is a **HARD rule about what SOFT means**, and it is only comprehensible next to the SOFT rules it governs. If R0.18 sits in the rules document while every SOFT rule sits in a handbook chapter, the definition and its instances are in different files — which is exactly the separation that produced clash C26 in the first place. **Mitigation:** R0.18 goes in the rules front matter *and* its operative sentence is repeated verbatim at the head of every chapter carrying a SOFT rule. Duplication is the right trade here; a worker must not be able to reach a SOFT preference without reading what SOFT costs.

2. **R0.16 — self-declared as both.** Its own text reads "**HARD (that the read happens), SOFT** (how)". The half that is binding is a one-line obligation; the half that is guidance is a whole procedure — study the grammar first, read a span, judge against the LEGOs the learner holds, and keep it out of the scanner. It has to be cut in two, and cutting a rule in two is how rules drift apart.

3. **K23 and K24 — one binding sentence wrapped in a judgement procedure.** K23 states a *standard* ("keep the clash, explain the sense in the presentation…") whose entire application is a set of judgement calls, and K24 then carves an exception out of it on two soft axes — how *basic* the known word is and how *early* it arrives. The kernel belongs in the rules document; everything that makes it usable is HB-02. Split badly, a worker gets a rule it cannot apply or a procedure with no authority.

4. **R0.12, Welsh.** Labelled **HARD (calibration)**, but it is a *prior*, not a rule: "a check that flags Welsh is more likely to be a wrong check than a defect". The genuinely binding part is procedural — stop, and re-examine the check before the content — and belongs in the rules document. "Welsh is the gold standard for LEGOs, read it and follow it" is guidance and belongs in `lang/cym.md`. Kai's 2026-09-10 "Welsh needs no fixes" is a third thing again: an operational bar on opening a repair pass. Three statements under one id.

5. **L2 — the definition of a LEGO.** "Not too small to be meaningless, not too big to be inflexible; the balance is judgement." It **must** be in the rules document, because it is the definition. It is also entirely unfalsifiable as written and gives a worker no decision procedure whatsoever. HB-03 is that procedure, and the rules entry has to point at it or it is decoration.

6. **The phrase-length family, P19–P22 versus P7.** C11's ruling made every absolute length spec in the estate stale, and P21 says outright that **length never blocks a submission**. So P19, P20 and P22 are pure guidance — which sits oddly against P19 and P20 being labelled the way they are — while **P7** (fragments never as USE phrases) is a genuine bar. Splitting this family by its own HARD/SOFT labels would put a non-blocking preference in the binding document.

7. **A3 — "below 99% coverage is a FAILED run".** Binding, and it is one of the highest-value lines in the canon. But it is *unusable* without HB-01's procedure for measuring coverage in the first place, and the failure mode is a worker that reads the rule, believes its tool's coverage number, and never checks it. Same shape as L2.

8. **O1–O11, the obligations.** Each is a HARD trigger ("edit a seed → sweep the whole course") whose *discharge* is an entire chapter. The table must stay whole and in the rules document — it is the single best thing in the canon for preventing half-fixes — but every row needs a chapter pointer, or a worker reads "sweep the whole course" and invents a sweep.

9. **R0.11 — builder prompts go through Tom.** This is estate governance, not course methodology; it is about who authorises a change to a shared tool. It belongs in the rules document only because a worker will otherwise breach it, not because it is a rule about courses. Worth Kai deciding whether it should live in `CLAUDE.md` instead.

### (b) Where the symptom index will mislead a worker

Seven, and two of them are serious.

1. **HB-02 versus HB-03 is the dangerous boundary, and I do not think it can be fully fixed by wording.** "One word, two senses" and "this LEGO is the wrong size" are frequently *the same event seen from two ends* — L5, L19 and L25 all say, in different words, that a sense problem **is** a chunking problem. A worker arriving with "the learner can't tell which sense" will pick HB-02 and get the disambiguation answer when the real fix was to redraw the chunk. **Mitigation:** each chapter's first procedure step forces a look at the other. **If Kai wants one change to this proposal, my recommendation is that he consider merging HB-02 and HB-03 into one chapter** and letting it be long. I have kept them separate here so he can see the seam.

2. **HB-13 — "it is deliberate design, not a defect" — is unreachable from the index, structurally.** Nobody ever arrives saying "this is deliberate". They arrive saying "this looks wrong", which routes them to the chapter for the defect kind. A worker who *knew* to look here would not need it. **Mitigation:** it can only be reached by a pointer, so every other chapter's procedure must open with "is this deliberate? → HB-13", and HB-13's symptom lines have to be written in the *wrong* voice — the confident-it's-broken voice — rather than the correct one.

3. **A worker holding an artefact is usually confident it is real.** WC-F4's worker was holding "1,126 defects, the worst course on the estate" — which reads as a finding, not a symptom, and would not naturally send anyone to a chapter about false positives. HB-01's symptom lines therefore deliberately include the *confident* phrasings ("this course is the worst on the estate"), which feels wrong to write and is the only thing that catches this case.

4. **HB-05 and HB-06 will be read one at a time when both are needed.** A worker who finds an audio/text mismatch (HB-05) then has to change text that has clips attached (HB-06) — and having found its chapter, it will stop. This is the index doing its job and doing harm. **Mitigation:** HB-05's procedure ends by *handing off* to HB-06 rather than pointing at it, and says plainly that the job is not finished.

5. **HB-01 will be over-read.** Every worker holding any number will start there, including the many holding real defect populations, costing a wasted 17k read. I judge this the acceptable direction of error — the reverse costs a sweep — but it is a real cost and it argues for keeping HB-01's opening "NOT THIS CHAPTER" block sharp.

6. **The symptom lines are written in one person's English.** A worker on a Japanese course will phrase the same symptom differently and miss the match. Because the index is grepped rather than parsed, the fix is cheap and continuous: **every no-match escalation under H3 must name which chapters it tried, and when the answer turns out to have been in one of them, the missing phrasing gets added to that chapter's symptom line.** The index improves by being wrong in public.

7. **The language appendices will leak.** H2 says take the shape and not the grammar, but an Irish worked case sitting inside HB-02 is a live temptation to import the Irish *answer* — which is exactly what R0.6, R0.7 and K12 forbid, three separate rules aimed at one failure. Wording alone will not hold this. The structural defence is that a language's answers are physically not in the chapter: they are in `lang/`, and a chapter states shapes only.

### (c) How the decision log fails

It has one dominant failure mode and three smaller ones, and I would rather name them than sell the design.

1. **THE DOMINANT ONE: nobody writes to it.** This is the ordinary fate of every decision log ever proposed, and there is no wording that prevents it. The only defence with any history of working is to make filing the entry **part of the job that obtained the ruling** — a ruling landed in a rule or a chapter without a log entry is an incomplete job — and to have `links.test.js` make the absence visible, since a rule citing no entry is at least greppable. That is a real but partial defence: it catches a ruling that reached the rules document, and catches nothing about a ruling Kai gave in chat that nobody wrote down at all. **That second case is the actual risk**, and it is the same risk the canon already carries today.

2. **REJECTED, AND WHY will decay into `nothing was rejected`.** It is the field with the most work in it and the least immediate payoff to the person filing, so it is the one that gets filled with a dash. When it does, the log becomes a list of outcomes — which is what the canon already is, minus the convenience. If Kai wants one enforcement here rather than a convention, this is where I would put it: an entry recording a Kai ruling that *overturned a stated recommendation* must have this field non-empty, and that is checkable, because those entries are the ones where the job that filed them had a recommendation in flight.

3. **Terse rule + distant evidence is a real loss, not just a cost saving.** Today a worker reading R0.12 sees the Welsh mutation-sweep disaster in the same breath as the rule and is *persuaded*. Under this design it sees one sentence and a pointer, and most workers will not follow the pointer. The rule survives; the persuasion does not, and a rule a worker does not believe is a rule it will reason its way around under pressure. **Mitigation, imperfect:** the one sentence must carry the *consequence*, not just the instruction — "a check that flags Welsh is probably a wrong check" rather than "treat Welsh as a template" — so that the sentence itself does some of the persuading.

4. **Back-filling will manufacture rejected alternatives that never existed.** Reconstructing "what was rejected" for 142 existing rules from git history and conversation is genuine research for the recent ones and **impossible for anything pre-2026-08-02**, where the conversation record begins. The entry must say "not recorded" and be believed. A back-fill job under time pressure will guess instead, and a guessed rejected-alternative is worse than a blank one — it reads as history.

---

## 7. WHAT IS NOT IN THIS PASS

Deliberately, by the brief: `course-methodology-canon.md` is **unmodified** — several jobs are reading it right now. Chapters HB-02 to HB-16 are **not written**; only their titles, one-line descriptions and rule allocations exist. `course-methodology-rules.md` is **not written**; only its table of contents exists. No language appendix is written. **The decision log has its format, its index and two specimen entries; the other ~200 entries are not written** and the back-fill is a separate job (§4). `links.test.js` is specified, not implemented. Nothing is deleted.

**Estimated cost of filling this in once Kai rules:** one job for the rules document (mechanical — 69 sentences from text that already exists, plus their DL citations, so it must come *after* the back-fill or the citations dangle); one job per chapter, and the six chapters carrying no worked case need evidence gathered before they can be written honestly; one job for the log back-fill, which is the largest and should go first; one small job for `links.test.js`. HB-03 should go first among the chapters, and to someone who has done LEGO-boundary work.

**Order matters and is not obvious:** back-fill the log → write the rules document → write the chapters. Doing it the other way round means writing citations to entries that do not exist yet, and a dangling citation is worse than no citation, because it looks like evidence.
