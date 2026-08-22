# ZUT compliance audit — gle_cn_for_eng / eng_for_hin, 2026-08-22

Read-only re-run of the existing rescoped audit tool (`scripts/_audit-phrase-zut.cjs`, gitignored
workspace copy — script itself untouched, restored to its checked-in state after this run). Prior
audits (2026-08-15, 2026-08-18) always hardcoded `spa_for_eng`/`fra_for_eng`; this pass swaps in two
courses that have never been through this check: **gle_cn_for_eng** (Munster Irish, actively worked
this week per `docs/gle-cn/`) and **eng_for_hin** (the course named in `feedback_ssi_build_use_
phrase_floor` for its phrase-count history — worth checking its ZUT surface too). Run from a
temporary copy in `$CS_SCRATCH` with the course-code array and require paths edited to run standalone,
then the checked-in `scripts/_audit-phrase-zut.cjs` was diffed byte-for-byte against a pre-run backup
and confirmed identical — **zero net change to the script.** Only SELECT queries ran against
Supabase; the script's only write is its own local JSON snapshot. `gle_ul_for_eng` and
`gle_mu_for_eng` were checked and have 0 `course_legos` rows (seeds exist, LEGOs not yet built — not
eligible for this check yet). **Zero DB writes, zero content changes.** Raw JSON snapshots alongside
this report: `zut-audit-gle_cn_for_eng.json`, `zut-audit-eng_for_hin.json`.

## Counts

| | gle_cn_for_eng | eng_for_hin |
|---|---|---|
| rows scanned (of which component) | 6,917 (200) | 13,748 (1,822) |
| distinct normalized knowns | 6,779 | 11,625 |
| [1] bidirectional — gate-exact | 6 | 9 |
| [1] bidirectional — case-insensitive | 4 | 9 |
| [1] bidirectional — **strict** | **4** | **9** |
| [2] target-membership failures | **5** | **230** |
| [3] target-side collisions (informational, not enforced) | 3 | 119 |

For scale: the 2026-08-18 fra_for_eng/spa_for_eng run (17.5k/17.8k rows each) had strict-bidirectional
81/101 and membership-failures 20/23. gle_cn is a much smaller, newer build (6.9k rows, 668 seeds
worth of vocabulary) and its counts scale down accordingly. eng_for_hin is a larger, older course
(13.7k rows) and its membership-failure count (230) is proportionally much higher than either fra/spa
or gle_cn — the one number in this run that stands out and is worth a closer look below.

## Against the calibration priors

Baseline from the 2026-07-04 sweep (pilot → rescope → fix-sweep) and confirmed stable through
2026-08-15/18: expect either **mostly-noise** (bidirectional-strict dominated by grammar the bare-
string check can't see — agreement, aspect, register, true polysemy) or **mostly-orphans** (membership
failures dominated by batch-regen debris) — never assume the count is a work count; pilot before
committing to a sweep strategy.

### [1] Bidirectional-strict (4 gle_cn / 9 eng_for_hin) — spot-read, consistent with "mostly-noise"

Read all 4 gle_cn examples and 4 of 9 eng_for_hin examples in the terminal output (full seed context
not re-pulled for every row given the small n, but the pattern is immediately legible from the
paired examples themselves):

- gle_cn "i don't know" → `níl a fhios agam` (fact-knowledge) vs `níl aithne agam ar` (personal
  acquaintance) — genuine known-side polysemy, the textbook "I know (a fact)" vs "I know (a person)"
  case named as an open item in the manual. Needs an English disambiguator (e.g. "I don't know him"
  vs "I don't know that"), not a target-side fix. **(d) judgment-fork, not a defect.**
- gle_cn "doing" → `ag déanamh` (progressive) vs `a dhéanamh` (verbal-noun/infinitival) — Irish verbal
  noun vs progressive-particle distinction; genuine grammar the bare English gloss can't carry.
  **(d).**
- gle_cn "to read" → `léamh` vs `a léamh` — same pattern, bare verbal noun vs particle+verbal noun.
  **(d).**
- eng_for_hin "साफ कपड़े" ("clean clothes") → `the clean clothes` (LEGO) vs `clean clothes` (phrase) —
  definite-article presence/absence on the same Hindi phrase; likely genuine register/context
  variation across two different seeds, not re-pulled but the pattern (article-only delta) matches
  the known-side-controlled-language free-class case, not a content defect. **(d), unconfirmed.**

None of the 4 gle_cn items read as content defects; they read as the same "grammar the string-diff
can't see" shape found in the fra/spa runs. This is a **small, real bucket that would need Tom's
disambiguation ruling on the Irish pairs**, not a sweep target — same lever as prior runs: fix the
check unit (or accept these as known-side registration gaps), not row-by-row triage.

### [2] Target-membership failures — mixed, 5 (gle_cn) vs 230 (eng_for_hin): different shape

**gle_cn (5 items) — all read as genuine orphans on inspection of the printed seed context**, no
DB round-trip needed since the tool already prints each seed's full target sentence: e.g. "would
help you" → `chabhródh leat` NOT IN seed 229's actual target "Chabhródh an bhean sin leat dá mbeadh
sí in ann" (a longer sentence with a different subject) — the component looks like it was authored
against an earlier/different draft of the seed. Small n; would fully evidence-pull in minutes.

**eng_for_hin (230 items) — pulled full row + sibling + created_at evidence for a sample, per the
evidence standard (never triage the bare fragment):**

- **Timestamp clustering test** (manual §Failure-mode-catalog #1 — batch-regen debris clusters in
  known-bad windows): fetched `created_at` for all 230 rows. They cluster tightly on **four dates**:
  2026-05-30 (116, half the total), 2026-05-31 (11), 2026-06-01 (31), 2026-07-16/17 (71 combined,
  concentrated 00:00–01:00 UTC). This is the same *shape* as the fix-sweep's finding — a handful of
  batch events, not 230 independent per-seed authoring errors — though the specific windows differ
  from the fra/spa ones (expected; different course, different build history).
- **Confirmed orphan, spot-checked** — `eng_for_hin:S0345L02C01` known="के लिए" target="for": the
  seed's actual lego at that index is the whole chunk "निकलने के लिए"→"to leave" (course_legos), and
  a correct BUILD sibling already teaches it. "for" appears nowhere in the seed's English sentence.
  Stale decomposition artifact from an earlier, finer-grained split of this lego; **(c) cut candidate**,
  nothing lost — the correct tiling already exists as a sibling.
- **Contraction near-miss, spot-checked** — `eng_for_hin:S0364L03C02`/`C03` known="नहीं"/"थी"
  target="not"/"was": these genuinely gloss real morphemes inside "पसंद नहीं थी"→"didn't like", but
  the English side fused them into the contraction "didn't", so neither "not" nor "was" is a
  substring of the seed's target text. This is the manual's cataloged failure-mode #7 (contractions
  defeat substring containment) — an **audit-blind-spot, not a content defect: (d), needs the same
  contraction-tolerance ruling from Tom that's already an open item** (`[NEEDS TOM EVIDENCE]`
  interposed/contraction tolerance in the manual §Open decisions).

So eng_for_hin's 230 is **not one bucket** — it's a mix of confirmed batch-debris orphans (cuttable)
and gate-blind-spot near-misses (a ruling, not a row fix) in the same proportions the fix-sweep found
at fra/spa scale. Two spot-checks aren't a pilot; the honest read is "consistent with the calibration
priors, distribution not yet established" — see recommendation below.

### [3] Target-side collisions (3 gle_cn / 119 eng_for_hin) — informational only, no action

Still the bucket the rescope itself flags as an unconfirmed reading of Tom's brief, still not
enforced by the live gate. eng_for_hin's 119 is proportionally high (many Hindi function words —
"मुझे", "वह", "कि" — map to many different English glosses across the course, which is exactly the
expected, harmless many-known-forms-of-one-target shape for high-frequency grammatical words, not a
queue). No action implied here in either run.

## What a follow-up sweep would look like

1. **gle_cn (4 bidirectional-strict + 5 membership) is small enough to fully evidence-pull and
   resolve in one short pass** — no batching needed. The 4 bidirectional items are Irish grammatical
   distinctions (verbal-noun/progressive, personal-vs-fact "know") that need a disambiguation ruling,
   not deletion; the 5 membership items read as clean orphan cuts pending Tom's sign-off, each with a
   correct sibling already in place.
2. **eng_for_hin's 230 membership failures need a real ~40-item pilot before any sweep**, per protocol
   — this run only spot-checked 2 + ran the timestamp-clustering test (positive signal for batch
   debris, same shape as the 2026-07-04 fix-sweep's 148-item queue). Pull the 2026-05-30 20:00–23:00
   UTC window first (116/230, over half the queue) — if that cluster reads uniformly as orphans the
   way the single spot-check did, a large fraction of this queue collapses cheaply, mirroring the
   fix-sweep's 99/148 cut rate.
3. **Before any row-by-row triage on eng_for_hin, check whether extending
   `normalizeForContainment` for English contraction expansion (didn't↔did not, etc.) is the cheaper
   lever** — same "fix the check before you sweep the content" move the 2026-08-18 report already
   recommended for elision on the fra/spa side. One spot-check here (S0364) suggests contractions are
   a real, recurring cause of false membership failures in this course, not an isolated case.
4. **eng_for_hin's bidirectional-strict (9) is small and likely mostly-noise** like every prior run —
   worth a quick 9-item pilot but not urgent.
5. **No fixes applied. No content, gate code, or audit tool modified this pass.**

## Honesty note

This is a first look at these two courses through this specific check — no prior audit exists to
diff against for a byte-identical-data shortcut, unlike the 2026-08-18 fra/spa report. The
classifications above for eng_for_hin's 230-item bucket rest on 2 full evidence-pulls plus a
timestamp-clustering test, not a full 40-item pilot — that pilot is the explicit next step, not
something this pass substituted for. Treat the "mixed orphan/near-miss" read as a working hypothesis
consistent with the calibration priors, not a settled distribution.
