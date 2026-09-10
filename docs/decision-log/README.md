# The Decision Log

> **DO NOT READ THIS AS PART OF A FIX. It exists to be SEARCHED.** No worker loads the log to do a job. You come here when a terse rule or a handbook chapter does not convince you and you want the evidence behind it, or when you are about to escalate under H3 and need the nearest analogous past decision. Grep `INDEX.md` first; open at most one or two entries.

Kai, 2026-09-10: *"Also wouldn't hurt to have a long log of decisions and reasons, just so we can go back and check there if needed - but that doesn't need to be read most of the time."*

**This is the third document.** `course-methodology-rules.md` is binding and read whole. `docs/methodology-handbook/` is patterns, read one chapter at a time. **This is the archive, and it is what lets the other two stay short** — a ruling arrives dragging its specifics with it (which dictionary said what, which 41 rows, which detector was 100% false on which language), and those specifics are genuinely valuable but they are archive, not instruction. They land here. The rule keeps one sentence; the chapter keeps the pattern plus one line of evidence; everything else lives here under a citable id.

**Nothing is ever deleted from the log.** A decision that was later reversed stays, with a `SUPERSEDED BY` pointer, because *why it was reversed* is usually the more transferable thing.

---

## FILE LAYOUT — one file per entry

```
docs/decision-log/INDEX.md              one line per entry — this is what you grep
docs/decision-log/2026-09/2026-09-10-03-irish-try-both-courses.md
docs/decision-log/2026-09/2026-09-10-04-check-18-coverage.md
```

**Id:** `DL-YYYY-MM-DD-NN`, `NN` counting entries within that date. The filename carries the same date and index plus a slug.

**One file per entry, not one file per month, and the reason is concurrency.** Every worker on this estate now runs in its own git worktree on its own branch off `origin/main`. An append-only single file — even a monthly one — puts every worker's append on the same last line, so two rulings landed the same afternoon conflict on merge, and the loser gets resolved by hand by whoever merges second. A new file per entry never conflicts, is greppable with a single `grep -rl`, and lets an entry be corrected later without touching its neighbours. The month directory exists only to keep directory listings usable.

## HOW BIG IT GETS, AND WHAT HAPPENS THEN

Rulings currently land at roughly two to four a day. At ~2,500 characters an entry that is ~2.5 MB a year across ~1,000 files. **That is fine, because nobody reads it by default** — an archive can be far larger than a document everyone loads, but not unbounded, and the thing that must stay bounded is the **INDEX**: one line per entry, under ~200 characters, no exceptions. At 1,000 entries the index is ~200 KB, which is still grep-able but past reading.

**When the index outgrows a single grep**, the answer is to add *facets* — generated sub-indexes by rule id, by language and by decider — **never to prune entries**. Pruning the log destroys the only thing it is for.

## WHO WRITES AN ENTRY, AND WHEN

**The job that obtains the ruling writes the entry, as part of landing it.** A ruling that lands in a rule or a chapter without a log entry is an incomplete job — that is the only thing standing between this design and the ordinary fate of a decision log, which is that nobody writes to it. If you are the worker who asked Kai a question and got an answer, the entry is yours.

---

## ENTRY FORMAT

Nine fields. Five are required on every entry; four may be `—`.

```markdown
# DL-YYYY-MM-DD-NN — <one-line title>

- **Date:** YYYY-MM-DD
- **Decided by:** Kai | Tom | <agent name>, under delegated autonomy granted by <who, when, for what occasion>
- **Status:** STANDING | SUPERSEDED BY DL-… | REVERSED BY DL-…
- **Produced:** <rule ids, chapter ids, code paths, tests> — or `nothing`

## DECIDED            (required)
One sentence. The ruling as it would be quoted.

## CONTEXT           (required)
What was being worked on when this came up, and what forced the question.

## REASONING         (required)
Why. Including the decider's own words verbatim where they exist — a paraphrase of
Kai is not a ruling by Kai.

## EVIDENCE, AND ITS LIMITS      (required)
The specifics: sources, counts, rows, courses, tools. **And what could not be
reached.** An entry that states no limit is treated as not having looked.

## REJECTED, AND WHY             (required — `nothing was rejected` is a valid value)
The alternatives considered and turned down, stated at their strongest, with the
reason each lost. **This field is the point of the log.** A well-sourced
recommendation that was overturned carries more forward than the ruling did: the
ruling tells you what to do here, the overturn tells you what kind of argument
loses, which is reusable.

## SUPERSEDES / SUPERSEDED BY    (may be `—`)
## OPEN AFTER THIS               (may be `—`)
What this decision did NOT settle, and who owns the remainder.
```

---

## CROSS-REFERENCING — the mechanism that keeps the short documents trustworthy

**Every rule and every handbook chapter cites the log entries behind it. Every log entry names what it produced.** This is not bookkeeping; it is what makes terseness safe. A worker that doubts a one-sentence rule follows the pointer to the evidence, instead of the rule having to carry the evidence inline — which is exactly how the canon reached 235,000 characters.

- In `course-methodology-rules.md`, a rule ends with its citations: `R0.18 — a SOFT preference never reaches backwards into correct live content. [DL-2026-09-10-01]`
- In a handbook chapter, a worked case ends with `[DL-…]`, and the chapter's front matter lists the entries behind its procedure.
- In a log entry, `Produced:` names every rule id, chapter id, code path and test that came out of it — or `nothing`, which is a real and common answer.

**This gets a test, not a convention.** A convention maintained by memory is not maintained. Proposed: `docs/decision-log/links.test.js`, run in the nightly checks, asserting three things —

1. every `DL-…` id cited anywhere in `course-methodology-rules.md` or `docs/methodology-handbook/` resolves to an existing entry file;
2. every entry whose `Produced:` names a rule or chapter is cited back by that rule or chapter (the link is bidirectional or it is broken);
3. every entry file appears in `INDEX.md` exactly once, and the index line's id matches the filename.

A dangling citation is then a failing test rather than a reader's dead end.
