# The standing native-speaker review queue

**Opened 2026-08-17 (Kai's ruling, plate A-135): "the Japanese-author need for the 213 rewrites goes
on the standing speaker list alongside Sinhala's and Korean's."**

Until now each plate carried its own "for a future speaker" list buried in its own report, so nobody
could see the estate's total exposure in one place. This is that place. It is a **pointer index**,
not a copy — the detail stays in each plate's own doc, which is where the evidence is.

## The standing ruling this queue exists under

Kai, repeatedly and most recently 2026-08-17: **park nothing on "not a native speaker."** Make the
best attempt, label the confidence honestly, ship it if it is likely an improvement on what is
there, and record what a speaker would need to confirm. Every entry below has therefore **already
shipped or been deliberately held** — nothing here is blocked *waiting* on this queue. It is a list
of things a human could cheaply make certain, not a backlog of stalled work.

An entry leaves this queue when a speaker of that language has read it and either confirmed it or
replaced it.

---

## Open entries

| Language | What needs reading | Volume | Status of the content | Source |
|---|---|---|---|---|
| **Japanese** | 213 authored `rewrite` strings that replace a grammar label with a person marker on the Japanese known side of 5 live beta courses | 213 rows | **NOT shipped** — the whole plan is held on a separate blast-radius refutation, so this is not the only thing stopping it | `docs/a135-jpn-paren-kor-2026-08-17/adj-buckets.md`, `jrefute-verdict.md` |
| **Korean** | 9 authored known-side prompts in `eng_for_kor` | 9 rows | **Shipped and live.** Best attempt, labelled | `docs/a135-jpn-paren-kor-2026-08-17/REPORT.md` §"Still for a future Korean speaker" |
| **Sinhala** | Grammaticality of the `ඒත්` substitutions, seed 178's adopted word order, `කැමැති` vs `කැමති` as a real distinction, seed 246's word order | 4 judgement calls | **Shipped and live.** Structurally attested, linguistically unverified | `docs/a134-sin27-2026-08-17/latelego-report-2026-08-17.md` §11 |

### Japanese — the specific doubt

Two independent adversarial passes agreed on the same limit: both judged the rewrites *mechanically*
(does the marker debut before this seed; does the target actually have a person) and neither could
referee **naturalness**. The sharpest concrete worry, which a speaker settles in seconds:

- 「彼・彼女が」 appears in **no** known-side prompt at **any** seed in `deu_for_jpn` or `ita_for_jpn`
  — it is a `por_for_jpn` house convention. It is also a *written* convention on a **spoken** prompt:
  the `・` will be read aloud as two nouns in a list ("kare, kanojo ga").
- 84 of the rewrites assert a human subject onto targets that have none (`hat`, `wird`,
  `esercitarsi`, `funktioniert`, `importa`).

### Korean — the specific doubts, most doubtful first

1. **`S0300L02U02`** — `까다롭게` is a word this course never otherwise uses. It was chosen on web
   evidence over the original `어렵게`, which is used of *tasks* ("looks difficult to do") and not of
   a person's character. Confirm the register is right.
2. **`S0290L01U05`** — `알아야 해요` means "have to know" where the target says "find out"; the exact
   word `알아내다` appears nowhere in the course. Also debuts 3 seeds late.
3. **`S0280L03U05` / `U06`** — `일만 했어요` renders "only did the work"; the English says "only *had
   to* do the job". The obligation is not carried.
4. The remaining medium-confidence rows in `kor-final-plan.json` and `kor-round2-plan.json`.

---

## Why this keeps happening, in one line

The known-side gate only runs where a **pair contract** exists, and its tokenizer split on `a`–`z`
until 2026-08-17. So for every non-Latin known side the estate has been generating content with no
mechanical check at all and no human check either. This queue is the human half; the contract
backlog (34 courses with no known-side check, including all 8 Japanese-known) is the other half.
