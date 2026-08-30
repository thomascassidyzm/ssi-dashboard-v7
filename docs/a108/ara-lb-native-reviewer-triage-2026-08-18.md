# ara_lb_for_eng — native-reviewer finding triage

**2026-08-18. Read-only diagnosis. No writes to Supabase, no audio, no code edits.**

Retry of a job killed by a server restart (exit 143) — no partial output from that
run was usable, so this is a fresh pass.

## Where the findings live

There is **no dedicated review-log table or flag column** for native-reviewer
content findings. `course_qa_flags`, `content_feedback`, `sample_flags` and
`audio_clip_flags` all return **zero rows** for `ara_lb_for_eng`. `audio_flags`
has 644 rows for the course, but all are machine `gender-prep` flags
(2026-07-21), unrelated to human review.

The actual source is a **human proofreader named Deborah** (SSi's native/near-native
reviewer for es/cy/de/eu/fr/ar), whose findings exist only as Slack notes pasted
into the repo: `docs/deborah/findings-2026-08-17.md`, with diagnosis/triage in
`docs/deborah/programme-report-2026-08-17.md` and a cross-course pattern sweep in
`docs/deborah/cross-course-sweep-2026-08-17.md`. She had **just started**
`ara_lb_for_eng` and logged exactly **two questions** (not yet a full pass).

Also observed: `.a74-scratch/deborah-ara-lb/` contains a large, dated (2026-08-18,
today) set of ZUT/filler/extra-word sweep JSON files for `ara_lb_for_eng`. This
looks like **in-flight, unreviewed work by a different concurrent process** — it
is not Deborah's output, has no accompanying report, and was not used as evidence
here (per the retry brief: don't substitute unverified partial output for real
diagnosis). Flagged for whoever owns that scratch dir to pick back up.

---

## Finding 1 — Arabic `!` renders on the wrong side

**Deborah's note:** "Is `!` still placed on the wrong side in Arabic (appearing
right, like English, should be left/end-of-sentence)? [She later confirmed `?`
is placed correctly.]"

**Root cause (already diagnosed in the 2026-08-17 programme report, verified
sound):** this is a **rendering bug, not a content/translation bug**.
- `؟` U+061F (Arabic question mark) has Unicode bidi class **AL** (strong
  right-to-left) — it joins the Arabic run and always lands at the visual left
  correctly, regardless of paragraph direction.
- `!` U+0021 has bidi class **ON** (neutral) — a trailing neutral inherits the
  **paragraph** direction. Under an LTR paragraph (confirmed: no `dir`/`direction`/
  `unicode-bidi` anywhere in the learner app's `packages/`/`apps/` trees, and only
  one unrelated `dir` in the whole Popty `src/` tree) it jumps to the visual
  right — exactly Deborah's symptom.
- The mark is almost certainly stored correctly at the logical end of the string;
  only the *display* is wrong.

**Classification:** (d)-adjacent but not a judgment-fork — it's a **confirmed
tooling/rendering defect**, not a course-content defect and not a false positive.

**Severity:** Low learner impact (cosmetic, doesn't block comprehension), but
**not ara_lb-specific** — it will reproduce on every Arabic course (ara, ara_eg,
ara_lb, any future MSA/dialect course) and any other AL-script known/target pair
rendered in an LTR paragraph.

**Recommended action:** **Not a content pass.** This needs a front-end fix
(e.g. wrap RTL spans so the paragraph direction resolves per-run, or scope
`unicode-bidi: isolate` around Arabic-script text) filed as an engineering
ticket against the learner app / Popty renderer — not against the course. No
DB or audio work required.

---

## Finding 2 — is "I speak" the same as bare "speak" (pro-drop)?

**Deborah's note:** "Arabic: are 'I speak' and bare 'speak' the same (no
obligatory personal pronoun)?"

**Generic linguistic answer already on record (2026-08-17 report):** yes for the
declarative — Arabic is pro-drop, the verb inflects for person, and the
independent pronoun is optional/emphatic. Caveat noted there: bare English
"speak" is ambiguous with the **imperative**, which is a different target form
entirely — so if the known side ever uses bare "speak" as a command, two known
prompts ("speak" and "I speak") mapping to one target would be a genuine
ZUT question.

**I re-checked this against the live `ara_lb_for_eng` data** (the 2026-08-17
answer was generic/MSA-flavoured and didn't cite actual course rows):

| seed | lego | known | target | roman |
|---|---|---|---|---|
| S0001 | L02 (A) | to speak | أحكي | ahki |
| S0009 | L01 (M) | I speak | عم بحكي | 'am b-heh-ki |
| S0013 | L01 (M) | you speak | بتحكي | btihki |
| S0034 | L02 (A) | he speaks | يحكي | yihkii |

No bare "speak" LEGO exists at all — only "to speak" (بأحكي/ahki, bare
imperfect used as the infinitive substitute) and person-marked forms. So
**there is no ZUT collision in the data** — Deborah's hypothetical doesn't
currently occur.

**A separate, real nuance I found while checking this** (not what she asked,
but adjacent and worth her eye): "I speak" (S0009L01) is rendered with the
Levantine **progressive marker** عم (*'am*) — "عم بحكي" = **"I am speaking"**
(right now), not the plain habitual imperfect "بحكي" (*bhiki*, "I speak", as a
general/habitual statement of fact or ability). If the known-side gloss "I
speak" is meant as habitual ("I speak Arabic" = I am able to / I do), the
progressive target may be a genuine mismatch — this is exactly the register
question the imperative caveat above was gesturing at, just a different fork of
it (aspect, not mood).

**Classification:** (d) judgment-fork — needs Deborah's ear, not a mechanical
fix. Not provable from the seed/sibling text alone (both readings are
grammatical Arabic; only a native speaker's sense of what "I speak Arabic" as
a standalone LEGO-debut should mean settles it).

**Severity:** Low-moderate. If wrong, it's a one-LEGO aspect mismatch at a very
early, high-visibility seed (S0009), not a structural defect — but S0009 is a
debut round others build on, so worth confirming early rather than late.

**Recommended action:** Needs a real content-pass answer from Deborah
specifically on S0009L01 ("عم بحكي" vs "بحكي" for the "I speak" debut) — flag it
back to her alongside her own two questions rather than resolving it
unilaterally.

---

## Related findings — Kai's cross-course pattern sweep, extended to ara_lb

Separately from Deborah's direct notes, `docs/deborah/cross-course-sweep-2026-08-17.md`
took the defect *patterns* she found in the five courses she'd actually checked and
swept them mechanically across all other courses, including `ara_lb_for_eng` (which
she'd only just started). These are automated-detector findings, not human review,
but they're findings recorded for this course and worth carrying into the same
triage:

### Filler-Build padding (her `spa_for_eng` pattern: LEGO + stock adverb x2-3)
`ara_lb_for_eng`: 4,311 Builds → **367 RAW, 78 CONFIRMED clusters** (detector
validated at ~85-90% precision on spot-check). Moderate — present but not the
worst course (`ces_for_eng` 776 confirmed is the outlier).
**Action: needs a real content pass** — same defect class Deborah already
flagged as course-breaking in `spa_for_eng`; this course wasn't sampled by eye
here, only by the pattern detector. Cite `docs/deborah/filler-build-sweep-v2-2026-08-17.json`.

### Text-vs-voiced mismatch (her eus_for_eng "my fixes are reverting" pattern)
`ara_lb_for_eng`: 14,674 witnessed clips → **382 CONFIRMED mismatches (2.60%)**.
The sweep sorted its top-course samples into four defect sub-types (stale
Basque re-voice, gender-agreement mismatch, Croatian known-side drift, cym_n
markup-in-boundary-stream) but **did not sample ara_lb specifically** — which
sub-type this is for ara_lb is an open gap, not a settled diagnosis.
**Action: needs a fresh sample** (10-15 of the 382, cross-referenced against
`course_audio.updated_at` vs the linked clip's render date) before deciding
fix-now vs re-render-batch. Cite `docs/deborah/text-vs-voiced-sweep-2026-08-17.json`.

### Gender-voice mismatch — explicitly NOT measured for Arabic
The cross-course sweep's Task 3 (gendered-speech mismatch) **skipped `ara`
entirely** — its detector uses regex lookaheads incompatible with Postgres
regex, and a full client-side scan timed out. This is a **stated gap**, not a
clean bill of health: absence of a finding here must not be read as "no gender
mismatches in ara_lb."
**Action: not a defect classification — a coverage gap.** If gender-voice
mismatch triage becomes a priority for ara_lb, it needs a bespoke detector run
(same shape as `ara_eg_for_eng`'s confirmed 8.10% rate in the same sweep, which
*was* measurable via the text-vs-voiced route, not Task 3) — worth checking
first before spinning up new tooling.

---

## Summary table

| # | Finding | Source | Root cause | Severity | Action |
|---|---|---|---|---|---|
| 1 | `!` renders right-of-text | Deborah, confirmed 08-17 | Bidi class ON on a neutral punctuation mark under LTR paragraph — rendering, not content | Low (cosmetic), estate-wide not ara_lb-only | Front-end fix (CSS/dir isolation), not a content pass |
| 2 | "I speak" vs bare "speak" pro-drop | Deborah, 2 open Qs | Confirmed pro-drop generically; no actual ZUT collision in the data; found a real aspect nuance (progressive vs habitual) at S0009L01 instead | Low-moderate, one early debut LEGO | Ask Deborah to confirm عم بحكي vs بحكي for S0009L01 specifically |
| 3 | Filler-Build padding | Cross-course sweep (pattern-matched, not eyeballed) | Same class Deborah flagged in spa_for_eng; detector ~85-90% precision | Moderate (78 confirmed clusters / 4,311 Builds) | Needs a real content pass; not yet human-verified for this course |
| 4 | Text-vs-voiced mismatch | Cross-course sweep | Unclassified sub-type for this course specifically (stale audio? gender? known-side drift?) | Moderate (382/14,674, 2.60%) | Needs a fresh 10-15 row sample before any fix decision |
| 5 | Gender-voice mismatch | Cross-course sweep | Not measured — tooling gap (regex lookahead incompatible with Postgres) | Unknown — explicit coverage gap, not "clean" | Coverage gap; needs bespoke measurement if prioritised |

Nothing above was fixed, edited, or generated. Two items (1, 2) are fully
diagnosed and ready for a decision; three (3, 4, 5) are flagged for a real
content/audio pass that has not yet happened for this course.

---

No commits produced by this job — diagnosis only, written to this one file.
