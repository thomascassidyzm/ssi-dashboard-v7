# Pod-0 canon text alignment — 40 X_for_eng courses

**Decision A applied, 2026-08-11.** Every course's pod-0 English is now Aran's canonical
text: 231 lines, 22 scenes. The per-course rewordings that had drifted in are overwritten,
as ruled.

**Nothing learner-facing moved.** 37 of the 40 live `pod-0` pods are byte-for-byte what
they were before this run. The 3 that changed are the 3 draft courses, which are the pods
this run was meant to rewrite. No `--force` was used anywhere and none was wanted.

**Nothing was translated.** Every slot whose English changed is deliberately blank, which
`pods-plan.cjs` reads as "not recordable yet". No pod was promoted. Decision C is
untouched and unprejudiced.

---

## 1. Per-course before / after

"debt lines" = target lines with salvageable prior text, enumerated row by row in that
course's `*-target-needing-translation.json`. "target blank" = slots with no target text
at all, which is the larger number and the one that blocks promotion.

| course | status | pod written | rows before → after | English at canon | target carried | target blank | debt lines | target takes dropped | English takes dropped | live pod-0 |
|---|---|---|---|---|---|---|---|---|---|---|
| ara_eg_for_eng | beta | pod-0-unrecorded | 142 → 232 | 231/231 | 126 | 105 | 16 | 16 | 24 | unchanged |
| ara_for_eng | beta | pod-0-unrecorded | 142 → 232 | 231/231 | 117 | 114 | 25 | 25 | 32 | unchanged |
| ara_sy_for_eng | draft | pod-0 | 142 → 232 | 231/231 | 123 | 108 | 19 | 19 | 26 | **is** the aligned pod |
| bul_for_eng | beta | pod-0-unrecorded | 142 → 232 | 231/231 | 122 | 109 | 20 | 20 | 29 | unchanged |
| cat_for_eng | beta | pod-0-unrecorded | 142 → 232 | 231/231 | 115 | 116 | 27 | 27 | 36 | unchanged |
| dan_for_eng | beta | pod-0-unrecorded | 142 → 232 | 231/231 | 102 | 129 | 40 | 40 | 48 | unchanged |
| deu_for_eng | beta | pod-0-unrecorded | 142 → 232 | 231/231 | 119 | 112 | 23 | 23 | 34 | unchanged |
| ell_for_eng | beta | pod-0-unrecorded | 142 → 232 | 231/231 | 117 | 114 | 25 | 25 | 32 | unchanged |
| est_for_eng | beta | pod-0-unrecorded | 142 → 232 | 231/231 | 122 | 109 | 20 | 20 | 29 | unchanged |
| eus_for_eng | beta | pod-0-unrecorded | 142 → 232 | 231/231 | 120 | 111 | 22 | 22 | 29 | unchanged |
| fas_for_eng | beta | pod-0-unrecorded | 142 → 232 | 231/231 | 109 | 122 | 33 | 33 | 38 | unchanged |
| fin_for_eng | draft | pod-0 | 142 → 232 | 231/231 | 71 | 160 | 71 | 0 | 0 | **is** the aligned pod |
| fra_ca_for_eng | draft | pod-0 | 142 → 232 | 231/231 | 119 | 112 | 23 | 23 | 29 | **is** the aligned pod |
| fra_for_eng | released | pod-0-unrecorded | 142 → 232 | 231/231 | 120 | 111 | 22 | 22 | 17 | unchanged |
| gle_for_eng | beta | pod-0-unrecorded | 142 → 232 | 231/231 | 114 | 117 | 28 | 28 | 37 | unchanged |
| heb_for_eng | beta | pod-0-unrecorded | 142 → 232 | 231/231 | 105 | 126 | 37 | 37 | 44 | unchanged |
| hin_for_eng | beta | pod-0-unrecorded | 142 → 232 | 231/231 | 99 | 132 | 43 | 43 | 50 | unchanged |
| hrv_for_eng | released | pod-0-unrecorded | 142 → 232 | 231/231 | 113 | 118 | 29 | 29 | 36 | unchanged |
| hye_for_eng | beta | pod-0-unrecorded | 142 → 232 | 231/231 | 105 | 126 | 37 | 37 | 48 | unchanged |
| isl_for_eng | beta | pod-0-unrecorded | 142 → 232 | 231/231 | 95 | 136 | 47 | 47 | 55 | unchanged |
| ita_for_eng | released | pod-0-unrecorded | 142 → 232 | 231/231 | 124 | 107 | 18 | 18 | 25 | unchanged |
| jpn_for_eng | released | pod-0-unrecorded | 142 → 232 | 231/231 | 125 | 106 | 17 | 17 | 19 | unchanged |
| kor_for_eng | released | pod-0-unrecorded | 142 → 232 | 231/231 | 130 | 101 | 12 | 12 | 15 | unchanged |
| lav_for_eng | beta | pod-0-unrecorded | 142 → 232 | 231/231 | 130 | 101 | 12 | 12 | 20 | unchanged |
| lit_for_eng | beta | pod-0-unrecorded | 142 → 232 | 231/231 | 122 | 109 | 20 | 20 | 29 | unchanged |
| nep_for_eng | beta | pod-0-unrecorded | 142 → 232 | 231/231 | 131 | 100 | 11 | 11 | 15 | unchanged |
| nld_for_eng | beta | pod-0-unrecorded | 142 → 232 | 231/231 | 116 | 115 | 26 | 26 | 35 | unchanged |
| nor_for_eng | beta | pod-0-unrecorded | 142 → 232 | 231/231 | 118 | 113 | 24 | 24 | 29 | unchanged |
| pol_for_eng | beta | pod-0-unrecorded | 142 → 232 | 231/231 | 108 | 123 | 34 | 34 | 45 | unchanged |
| por_br_for_eng | beta | pod-0-unrecorded | 142 → 232 | 231/231 | 118 | 113 | 24 | 24 | 34 | unchanged |
| por_for_eng | released | pod-0-unrecorded | 142 → 232 | 231/231 | 123 | 108 | 19 | 19 | 29 | unchanged |
| ron_for_eng | beta | pod-0-unrecorded | 142 → 232 | 231/231 | 128 | 103 | 14 | 14 | 21 | unchanged |
| spa_for_eng | released | pod-0-unrecorded (pre-existing) | 231 → 231 | 231/231 | 231 | 0 | 0 | 0 | 0 | unchanged |
| spa_mx_for_eng | beta | pod-0-unrecorded | 142 → 232 | 231/231 | 114 | 117 | 28 | 28 | 33 | unchanged |
| swa_for_eng | beta | pod-0-unrecorded | 142 → 232 | 231/231 | 118 | 113 | 24 | 24 | 30 | unchanged |
| swe_for_eng | beta | pod-0-unrecorded | 142 → 232 | 231/231 | 116 | 115 | 26 | 26 | 34 | unchanged |
| tha_for_eng | beta | pod-0-unrecorded | 142 → 232 | 231/231 | 125 | 106 | 17 | 17 | 22 | unchanged |
| tur_for_eng | beta | pod-0-unrecorded | 142 → 232 | 231/231 | 113 | 118 | 29 | 29 | 37 | unchanged |
| ukr_for_eng | beta | pod-0-unrecorded | 142 → 232 | 231/231 | 122 | 109 | 20 | 20 | 28 | unchanged |
| zho_for_eng | released | pod-0-unrecorded | 142 → 232 | 231/231 | 130 | 101 | 12 | 12 | 17 | unchanged |
| **FLEET (40)** | | | **5769 → 9279** | **9240/9,240** | **4775** | **4465** | **994** | **923** | **1190** | **37/40 byte-identical; 3 drafts by design** |
Every course went 142 rows on the old text → 232 physical rows: the 231 canonical lines,
plus one retired row. Retired, not deleted — see §5.

## 2. Fleet totals

| | |
|---|---|
| Courses aligned | **39** (spa_for_eng was already done — see §4) |
| Written in place (draft) | 3 — ara_sy, fin, fra_ca |
| Written to a `pod-0-unrecorded` clone | 36 — 29 beta, 7 released |
| Rows before → after | 5,769 → 9,279 |
| English lines matching canon | **9,240 / 9,240** |
| Speakers matching canon | 9,240 / 9,240 |
| Scenes per course | 22, all 40 |
| Target lines carried forward | 4,775 |
| Target slots left blank | **4,465** |
| Target audio pointers dropped | 923 |
| English audio pointers dropped | 1,190 |
| Audio rows deleted | **0** |

Survivor / reword breakdown across the fleet: 4,494 lines survived byte-identical, 1,235
were reworded (281 of them numerals-only, whose target text and takes carry forward; 954
genuine rewordings, whose text does not), 3,511 canon lines are new, 40 rows retired.

## 3. Proof the live pods are unchanged

Not asserted — measured, twice, by an independent script that does not share code with the
aligner.

`proof/live-pod0-before-manifest.json` is a row count and a sha256 over the ordered row set
of all 40 `<course>:pod-0` pods, read before the first write. `proof/live-pod0-after-manifest
.json` is the same read after the last one.

**37 of 40 hashes are identical.** The 3 that differ — `ara_sy_for_eng`, `fin_for_eng`,
`fra_ca_for_eng` — are exactly the 3 courses with `status = draft`, which the guard aligns
in place. Every `released` and every `beta` course serves precisely what it served before.

`proof/post-apply-verification.json` re-reads all 39 aligned pods from the database and
checks per course: 231 English lines matching canon after the pod's own language-name
substitution; 231 speakers matching; 22 scenes; 232 rows with exactly 1 parked; metadata
stamped `canonical_aligned_at: 2026-08-06` with 22 sections and 22 scene hashes; and every
audio id named in the pre-align archive still present in `course_audio`. **Zero anomalies.**
10,791 referenced takes probed, 10,791 alive.

The applied run matched the dry run on all 11 counters for 39 of 39 courses. Nothing
diverged, so nothing is unexplained.

Reproduce either half:

```
node docs/pods/pod0-canon-align-2026-08-11/proof/snapshot-pod0.cjs <tag>
node docs/pods/pod0-canon-align-2026-08-11/proof/verify-pod0.cjs <course>…
```

## 4. Everything that refused, diverged or was skipped — all of it

**Three courses refused on the first dry run, and the refusal was right.** `hin_for_eng`,
`hye_for_eng` and `swa_for_eng` write *"I am learning Hindi."* where the other 37 write
*"I'm learning Danish."* The aligner learns the language name by reading it back off the
pod's own English rather than guessing it from the course code, and its regex only matched
the contraction — so it refused rather than ship the literal token `[target language]` to a
recorder. I broadened the regex to accept both forms rather than hand-feed
`--language-name` on three courses, because hand-feeding is the guessing the detector
exists to prevent. Committed in `f285483a`; all three then planned and applied identically
to the rest.

**`spa_for_eng` was verified and left alone.** Its `pod-0-unrecorded` clone already held 231
rows across 22 scenes, stamped `canonical_aligned_at: 2026-08-06`, with all 231 target lines
written and 128 flagged draft. The guard finds the existing clone and plans a no-op, so
re-running it would only churn the metadata. It contributes **zero** translation debt. Its
live `pod-0` still holds the old 142 rows and is untouched, like every other live pod.

**Two courses look unlike the rest in the numbers, and both are explained.**
`fin_for_eng` has the fewest survivors (68) and dropped zero audio pointers: it is a draft
that was fully translated and never recorded, so its English simply drifted furthest and
there was no audio to lose. `fra_for_eng` kept 51 English takes where others kept ~110:
its pod-0 only ever had 68 English takes to begin with. Pre-existing coverage, not an
effect of this run.

**No other course hit a data issue.** 39 of 39 applied on the first attempt, none aborted
on a before-state assertion, none needed a retry.

## 5. The one retired row, in every course

Each old pod's last line — `SC15-S012`, global_order 142, the numbers drill *"One hundred
thousand. Sixty. Seventy. One o'clock. Eleven o'clock."* — has no slot in the new canonical.
It is **not deleted**. Its text is blanked and its ordering parked at +90,000 so it can
never re-enter a recording queue, its `course_audio` rows are untouched, and its old target
text is preserved verbatim in that course's `*-target-needing-translation.json`. 40 rows,
one per course. Whether those lines should come back is Aran's call, not this run's.

## 6. The translation debt — the number decision C has to size

**4,465 target lines across the 40 courses have no target text.** That is what must be
written before any clone can be promoted to `pod-0`. It splits:

| | lines | what it is |
|---|---|---|
| From scratch | **3,511** | new canonical lines no served pod ever had |
| Adapt and review | **954** | a prior target line exists, written for slightly different English |
| Orphaned, no destination | 40 | the retired numbers drill, archived only |

The **994** figure in the committed `*-target-needing-translation.json` files is the second
and third rows added together — the lines that come with salvageable prior text. The number
that sizes the whole job is **4,465**.

Per-course debt is the "target blank" column in §1. Heaviest: fin 160, isl 136, hin 132,
dan 129, heb/hye 126. Lightest: spa 0, nep 100, kor/lav/zho 101.

## 7. What was deliberately not done

No TTS. No audio deleted — not one row. No pod deleted, no sentence row deleted. No
`write-pod0-drafts.cjs`, no `pod-dialogue-generator --sync`, no translation by any other
means. No `promote-pod.cjs`: every clone ends with 100–160 blank lines, so promotion stays
blocked on decision C, as briefed. Nothing outside `listening_pod_sentences` and
`listening_pods.metadata` was written — `listening_pods.speakers` is the other worker's
column and was not touched.

## 8. The way back

`docs/pods/pod0-canon-align-2026-08-11/` holds, per pod: the full pre-align sentence rows,
the diff summary, the complete ops log with a before and after state for every row, and the
target-needing-translation list. To restore any pod exactly:

```
node tools/pods/align-pod0-to-canonical.cjs --course=<code> \
  --archive-dir=docs/pods/pod0-canon-align-2026-08-11 \
  [--pod-slug=pod-0-unrecorded] --restore-from-archive
```

The restore verifies itself field-by-field and throws if a single field differs.
