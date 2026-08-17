# fin_for_eng — the his/her expansion, applied

**Date:** 2026-08-17 · **Course:** `fin_for_eng` · **Applied:** 70 phrases · **Held:** 3 · **Audio generated:** none

Kai approved the 73-phrase proposal on 2026-08-17, explicitly including the five marginals flagged
on the page. The three phrases that use `mikä sen nimi on` *before* seed 465 — where that frame is
taught — are **held** pending the separate question of whether `nimi` is drilled as a pattern or
arrives as a one-off. Everything else went in.

Machine-readable record of exactly what was written: [`fin-hisher-applied-log-2026-08-17.json`](./fin-hisher-applied-log-2026-08-17.json).

---

## What the change is for

`sen` is genderless — the same word for *his* and *her*. The course had let the English gender word
predict the Finnish case ending, so a learner could read a **case** contrast as a **gender** rule.
That is the defect recorded as doctrine on 2026-08-12 (commit `5808218d`), and the seed-21
corrective set was the first instalment. This is the rest of the course.

> That doctrine file, `docs/course-conventions/fin_for_eng.md`, exists **only on the unmerged branch
> `docs/course-conventions-fin-2026-08-12`** — it is not on `main` and not in a normal checkout. Worth
> merging: two separate jobs have now gone looking for it and found nothing.

Two boxes in the his/her × case table were empty across all 668 seeds: **her + `nimen`** and
**his + `nimi`**. Both are now filled, measured live after the apply:

| | `nimen` (gen) | `nimeä` (part) | `nimi` (nom) |
|---|---|---|---|
| **his** | 23 | 33 | **4** *(was 0)* |
| **her** | **29** *(was 0)* | 22 | 11 |

The case is still chosen by the grammar and never by taste. Mixing varies which gender appears in
which context, not where a case may sit.

## Method

Reuses the 2026-08-12 seed-21 method verbatim — same harness, same insert path, same verification
shape. Nothing in the proposal's week-old gate runs was trusted; every gate was re-run at apply time
against a fresh dump (668 seeds / 1,425 legos / 14,053 phrases).

Gates run per basket, called the way `services/course-builder/routes/seed-complete.cjs` calls them:

| Gate | Result across all 49 baskets |
|---|---|
| containment (phrase must contain the host lego's Finnish) | **49/49 PASS** |
| `checkVocabViolations` (DP tiling against taught chunks) | **49/49 PASS** |
| `checkPhraseZUT`, prior seeds — as the submit path runs it | **49/49 PASS, 0 collisions** |
| `checkPhraseZUT`, whole course, no seed cutoff — stricter | **49/49 PASS, 0 collisions** |
| `checkKnownSide` known-vocab breaches | **0 breaches** |
| intra-batch ZUT (the 70 against each other) | **0** |
| exact duplicates of existing phrases | **0** |
| NFC / Unicode sanity | **0 defects** |

Every host lego was checked `is_new` before insert. Ids are deterministic and continue each basket's
own `B`/`U` sequence; positions append after the basket's existing maximum. The player splits by
`phrase_role` and orders within role (`ssi-learning-app/api/courses/[code]/cycles.ts:773`), so an
appended build still plays in the build block.

### Two signals that look like failures and are not

A third, found afterwards by the parallel investigation and checked here: the shared harness pages
`course_legos` with `.range()` and **no `.order()`**, so on courses with more than 1,000 prior legos
the known-side context can silently drop rows. Re-ran the known-side gate over all 70 phrases with
ordered paging: **0 breaches either way, 0 phrases where the two disagree.** The bug can only remove
evidence that a gloss was introduced, so it makes the gate *stricter* — a PASS under it stays a PASS.
This run's result is unaffected, but the harness should be fixed before reuse.

**`checkPhraseComplexity` reports 48 blocking failures — all pre-existing.** The gate is a
whole-basket band-balance check, and the harness computes it over the *existing* basket. Measured
before-vs-after: 48 of the 49 baskets already failed today with nothing added, and the 70 phrases
changed the verdict on **none** of them — 0 broken, 0 fixed. Overwhelmingly `LONG: need 3+, got 0`.
This is a standing property of the course, worth its own decision, and not something this change
caused.

**11 known-side advisories — all inherited from the host cards.** Every one is `machinery "going"
needs going-to` or `machinery "have" needs have-you-been/have-got/want-to-have`. The card at
`S0024L02` *is* "I'm not going to be able to remember" and the card's own English trips the same
advisory; 9 of its 11 pre-existing phrases already warn identically. Same at S0025L01, S0025L06,
S0033L02, S0182L01, S0205L01, S0309L02. No new known-side machinery was introduced.

## Verification after the write

Against a full pre-apply backup of all 40 seeds (`.a74-scratch/fin-hisher-apply/backup.json`):

- **all 40 seeds UNCHANGED** on `status`, `approved_at`, `flagged_at`, `version`, `known_text`,
  `target_text`, `updated_at`, `decomposed_at` — **zero seeds unapproved as a side effect**
- all **103 lego cards** byte-identical
- all **1,040 pre-existing phrases** byte-identical, positions and audio ids untouched
- all **70 new phrases** present, byte-exact NFC, correct role, correct basket
- counts: 1,040 → 1,110 in the touched seeds (+70); course total 14,053 → **14,123**
- course-wide ZUT sweep over all 14,123 phrases: **0** collisions involve a phrase applied today

No trigger on `course_practice_phrases` touches seed approval. The INSERT triggers are
`components_never_introduced`, `pull_duration` and `touch_content_stamp`; the last bumped
`courses.content_stamp` to 2026-08-17, which is the legitimate cache-invalidation effect and nothing
more.

## Audio

**None generated, none required, nothing deleted.** Verified rather than assumed: `fin_for_eng`
carries 313 `course_audio` rows and **every one is `language='eng'`** — 238 `known`, 48
`instruction`, 26 `encouragement`, 1 `welcome`. Non-English clips: **0**. The 70 new rows carry no
audio id. (An earlier brief put this at 75 clips; the real figure is 313, and the substance — no
Finnish audio — holds.)

No audio pass was queued. The standing rule exists so text edits don't accumulate as a silent
missing-audio backlog, but this course is already 100% unvoiced on the target side, so a pass would
push ~14,000 phrases into the render queue. That is a cost decision for Kai, not housekeeping.

## The three held phrases

| seed | English | Finnish |
|---|---|---|
| S0170 L01 | you tell me what his name is | sä kerrot mulle, mikä sen nimi on |
| S0176 L01 | I'll ask him what his name is | mä kysyn siltä, mikä sen nimi on |
| S0205 L01 | I've forgotten what his name is | mä oon unohtanut, mikä sen nimi on |

All three pass every gate. They are held only because they would introduce `mikä sen nimi on` before
seed 465, and Kai's question is whether that frame is drilled as a pattern at all — *"if nimi comes
up in a seed then we should make sure it's not just a one-off… sometimes the answer is to add more,
not less."* Seed 176 drops out of the change entirely; its only proposed phrase is one of the three.

## Learner impact

None yet. `courses.status='draft'` and **`new_app_status='not_available'`**; the learner catalogue
gate is `new_app_status IN ('live','beta')`
(`ssi-learning-app/api/courses/available.ts:35`). The phrases are live in the database and will be
served the moment the course is published.

## One applied phrase needs Kai's judgement — S0654L01 register

Found by the parallel `nimi` investigation and **confirmed here against the live basket**. The phrase
applied today at `S0654L01#12`:

> **i'm not sure what his name is** → **en ole varma, mikä sen nimi on**

sits on the **formal-register** card `i'm not sure (formal)` → `en ole varma`. Since **seed 10** the
course has taught the identical English frame in the informal register — `I'm not sure what the
answer is` → *mä en oo varma, mikä vastaus on* — and there are dozens of them.

The basket's own convention is that the phrases drop the `(formal)` tag from the English and instead
carry a register signal **inside the sentence**: `i'm not sure, sir` → *en ole varma, herra*; `i'm
not sure what you said` → *en ole varma, mitä **te** sanoitte*; `i'm not sure about that, sir`. The
new phrase carries **no register signal at all**, so nothing in the prompt tells the learner which
register is wanted. On Kai's severity test — would the learner notice, would it derail them — this
is **yes and yes**: they will answer *mä en oo varma, mikä sen nimi on* and be marked wrong.

Not a hard ZUT hit (no identical English prompt exists), which is why the gate passed it. Two fixes,
both one-line, **neither applied** — this is Kai's call:

- **(a) match the basket** — `i'm not sure what his name is, sir` → `en ole varma, mikä sen nimi on,
  herra`. Follows what three of the basket's five `use` phrases already do, and adds no parenthetical.
- **(b) tag the known side** — `i'm not sure what his name is (formal)`. Simpler, but bakes a
  parenthetical into `known_text`, which the estate has had to clean up elsewhere.

(a) is the better fit for the basket. Nothing is urgent: the course is unpublished, so no learner can
reach it.

## Noted in passing, not acted on

The course-wide ZUT sweep found **203 English prompts that already have more than one Finnish
answer** across the 14,123 phrases. None involves anything applied today. That is a pre-existing
condition of `fin_for_eng` and worth its own pass.
