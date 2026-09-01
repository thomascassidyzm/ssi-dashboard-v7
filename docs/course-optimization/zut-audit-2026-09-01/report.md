# ZUT compliance audit — jpn_for_eng, 2026-09-01

Reset-eve spare-capacity pass, read-only. Prior runs (2026-08-11/15/18/25) always hardcoded
`spa_for_eng`/`fra_for_eng`; the 2026-08-22 pass widened to `gle_cn_for_eng`/`eng_for_hin` and
recommended the next pass "pick courses not yet covered rather than a fourth fra/spa snapshot." This
pass follows that recommendation and covers **jpn_for_eng** — live, 13,232 rows, never audited by
this tool before, and structurally interesting because Japanese verb morphology and the agglutinative
particle system stress the substring-containment check differently than French/Spanish/Irish/Hindi did.

The tool (`tools/course-optimization/audit-phrase-zut.cjs`) is still not on `main` — same open gap as
every prior run, unchanged by this pass (restoring it is out of scope for a read-only audit). Pulled
the checked-in gitignored copy already sitting in `scripts/_audit-phrase-zut.cjs` (a leftover from an
earlier session's restore), fixed its two relative `require()` paths for `scripts/`'s actual depth,
and edited only the hardcoded course-array line to run `jpn_for_eng` in place of `spa_for_eng`/
`fra_for_eng`. After the run, **diffed the script byte-for-byte against a pre-run backup and restored
it to its exact original state** — zero net change to the script, confirmed by `diff`. Only SELECT
queries ran against Supabase; the script's only write is its own local JSON snapshot (now copied to
`zut-audit-jpn_for_eng.json` alongside this report). Follow-up spot-checks (below) also ran read-only
`SELECT` queries directly against `course_seeds` / `course_practice_phrases`. **Zero DB writes, zero
content changes, zero fixes applied.**

## Counts

| | jpn_for_eng | (for scale: fra/spa 08-18, gle_cn/eng_for_hin 08-22) |
|---|---|---|
| rows scanned (of which component) | 13,232 (1,281) | 17.5k/17.8k, 6.9k, 13.7k |
| distinct normalized knowns | 10,709 | 14.2k/15.5k, 6.8k, 11.6k |
| [1] bidirectional — strict | **514** | 81/101, 4, 9 |
| [2] target-membership failures | **174** | 20/23, 5, 230 |
| [3] target-side collisions (informational, not enforced) | 68 | 77/34, 3, 119 |

jpn_for_eng's bucket [1] (514) is by far the largest strict-bidirectional count seen in any of the
five courses audited to date — 5-6x fra/spa, 57x gle_cn. That is not a diffuse "more noise" result;
it has one dominant, identifiable cause (below).

## Bucket [1] — dominant cause: a batch corruption, not diffuse taste-forks

Skimming the printed examples immediately showed a repeating shape: pairs where one target variant is
a plain LEGO/phrase and the other is the **exact same text with a bare `から` appended** ("もう一度" vs
"もう一度から", "隣" vs "隣にあるから", "君" vs "君があるから", "下" vs "下にあるから" — none of these
make sense as "because…" continuations; `から` is glossing nothing and attaches to fragments that
don't support it grammatically). This is unlike anything seen in the fra/spa/gle_cn/eng_for_hin runs,
where bucket [1] read as clean register/agreement taste-forks.

Quantified against the raw JSON, then confirmed independently against the DB:

- **358 of the 514 bidirectional-strict groups (70%)** have at least one target variant ending in a
  bare `から`.
- A direct `course_practice_phrases` query for `target_text ILIKE '%から'` (course-wide, all seeds)
  returns **683 rows**, of which **664 are `phrase_role:'build'`** (only 7 component, 12 use).
- **Timestamp clustering** (manual §Failure-mode-catalog #1 — batch debris clusters in known-bad
  windows): 652 of the 683 `から`-suffixed rows are stamped **2026-06-09**, with a small secondary
  cluster of 12 on 2026-06-08. The remaining ~19 rows scattered across 2026-02-10/11, 2026-06-19 and
  2026-07-07 look like unrelated legitimate uses of `から` ("from"/"because") — the June 9 date is the
  signature of one batch event, not course-wide corruption.

This is the same *shape* as the fix-sweep's fra/spa finding and the eng_for_hin batch-window finding
(manual §7 point 1) — a small number of batch-regen events wrote bad rows across many seeds at once,
not hundreds of independent per-seed authoring errors. **A single-date grep for `から`-suffixed BUILD
rows on 2026-06-09 is the fast, cheap detector here** — the same move the fix-sweep recommended
generally ("grep before paying for per-row LLM triage").

Read at face value, a bare `から` glued onto an otherwise-complete BUILD phrase is very likely a **tier-3
necessarily-wrong** clunkiness violation (manual §R8) on top of being a ZUT collision — but this pass
did not evidence-pull all 664 rows against their seeds to confirm that classification course-wide; it
confirmed the pattern's existence, scale, and date-clustering, which is enough to scope a follow-up,
not enough to certify every row as (c)-cut without the full per-item evidence standard.

The remaining **156 of 514 (30%)** bidirectional-strict groups do not show the `から` pattern and, on a
spot-read of ~15 of them, look like the familiar shape from prior runs: register/sense variation the
bare-known string can't disambiguate ("she" → 彼女/彼女から — actually still から-tainted; genuine
non-から examples like "seen" → 見た/見, "long" → 長い/長く, "not" → じゃない/ない/しない are inflection
and negation-form choices, not obviously defects) — **(d) judgment-fork / audit-blind-spot**,
consistent with the fra/spa/gle_cn calibration prior.

## Bucket [2] — target-membership failures (174): audit-blind-spot, not orphans

Spot-checked 30 printed examples plus a root-prefix heuristic across all 174 (component `target_text`
with its trailing 2 characters stripped, tested for substring presence in the seed's target sentence):
**163 of 174 (94%) root-match** — the component is glossing the same verb/adjective root the seed uses,
just in a different inflected form (dictionary form こする/する/見せる/覚える/言う vs the seed's
conjugated て-form, volitional, past, or -たい form). This is the same failure-mode already cataloged
for eng_for_hin's contractions and the fra/spa elision cases (manual §Failure-mode-catalog #7,
§Open-decisions "interposed-word tolerance") — **the substring-containment check is blind to regular
morphological inflection**, which is structurally common in Japanese (every verb/adjective the course
teaches has multiple surface forms). This is a **gate-limitation, not a course content defect**: (d),
same open item, needs the same tolerance ruling from Tom already logged as
`[NEEDS TOM EVIDENCE]` in the manual.

The remaining 11/174 (6%) that failed the root-prefix heuristic were individually read (listed in the
raw JSON) — on inspection most are still morphological near-misses the crude 2-character heuristic
missed (e.g. "good"→いい vs seed's 良く/良くなってきた, an orthographic kanji/kana variant of the same
adjective; "to do"→する vs seed's よう/した, volitional/past of the same verb). None of the 11 read as
a confirmed orphan on this pass — no seed rewrite, no severed component, no stale-decomposition
artifact of the kind found in eng_for_hin's confirmed cut candidates. **Provisional: 0 confirmed
orphans in bucket [2] this run**, pending a full per-item evidence pull if this bucket is ever worked.

## Bucket [3] — 68, informational, not enforced

Not spot-read this pass (out of scope per the 2026-08-25 report's standing position: whether bucket
[3] should ever be gate-enforced is still `[NEEDS TOM EVIDENCE]`, so no sweep against an unconfirmed
spec).

## Against the calibration priors

Protocol: expect either mostly-noise (checking the wrong unit) or mostly-orphans (batch debris); pilot
before committing to a sweep strategy; never assume a count is a work count. jpn_for_eng lands
**between** the two prior shapes rather than cleanly in either:

- Bucket [1] (514) is **70% mostly-orphans** (the `から` batch corruption, dated 2026-06-09) and 30%
  mostly-noise (register/inflection taste-forks) — the first time a bucket [1] in this series has had
  a real, dateable, mechanical majority rather than being dominated by judgment-forks.
- Bucket [2] (174) is **~94%+ mostly-noise / audit-blind-spot** (verb morphology defeating substring
  containment) — consistent with the fra/spa/eng_for_hin calibration prior, not orphans.

## What a follow-up sweep would look like

1. **The `から`-suffix corruption (664 BUILD rows, 652 dated 2026-06-09) is the one genuinely new,
   actionable finding from this pass** and the obvious next step if jpn_for_eng gets worked: pull all
   664 rows with seed + sibling context (the evidence standard, §0 of the rubric), confirm the tier-3
   clunkiness read, and if confirmed, this is a **cut-it-out** candidate at scale (99-of-148 was the
   comparable ratio in the July fix-sweep) — but that pull was not done this pass and should not be
   assumed; 664 items is well beyond what a single read-only pilot should certify from a sample.
2. **Bucket [2] (174) does not need a fresh triage pass** — it reads as the same inflection/morphology
   gate-limitation already open in the manual (§8), just with Japanese's much richer verb morphology
   making the ratio starker (94% vs eng_for_hin's mixed orphan/near-miss split). What it needs is the
   same standing Tom ruling on interposed/morphological tolerance, not another course-specific sweep.
3. **Bucket [3] (68) still isn't gate-enforced and the spec is still unconfirmed** — no action.
4. **Widen further next time**: por_for_eng (14,155 rows), ita_for_eng (13,507), kor_for_eng (13,910),
   zho_for_eng (11,879) are all live and unaudited by this tool. Given jpn_for_eng just surfaced a
   real, dateable batch-corruption pattern that the fra/spa/gle_cn/eng_for_hin runs never showed,
   scanning the other live courses for the same `%から`-style single-date suffix-corruption signature
   (adapted per script — the `から` string is Japanese-specific) is worth doing before assuming this
   was jpn-only.

**No fixes were applied. No content, gate code, or audit tool was modified this pass** — the working
copy of `tools/course-optimization/audit-phrase-zut.cjs`/`scripts/_audit-phrase-zut.cjs` was diffed
back to its pre-run byte-identical state after the run.
