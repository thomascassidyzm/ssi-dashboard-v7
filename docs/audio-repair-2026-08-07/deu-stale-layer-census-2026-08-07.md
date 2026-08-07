# German stale-layer census — `deu_for_eng`

2026-08-07. DB-only, read-only. No TTS, no writes to `course_audio`, no deletions.
Replaces the cancelled whisper re-score. Replicates the shape of
`docs/audio-repair-2026-08-07/fra-rounds-1-10-reuse-inventory.md`, course-wide.

Read on your phone: https://watson-1.tail4968cb.ts.net/d/e4c2f5cb

Machine-readable companion: `deu-stale-layer-census-2026-08-07.json` (this directory).

---

## The headline

**German's stale layer is not a role — it is a POSITION. Seeds 1–300 of `deu_for_eng`
are still January/February 2026 renders across all three audio layers at once
(known, target1, target2), ~75% of every slot in that band. Seeds 301–668 are ~86%
July 2026.**

That is the opposite shape to French. In French one *role* (target1) was stale and the
other three were current. In German every role is stale together, but only in the first
half of the course — the beginner half, the part every single learner hears.

The cutover is sharp and lands between seed 300 and seed 301:

| Seed | 296 | 297 | 298 | 299 | 300 | **301** | 302 | 303 | 304 | 305 |
|---|---|---|---|---|---|---|---|---|---|---|
| % Jan/Feb | 84 | 56 | 80 | 80 | 67 | **14** | 5 | 5 | 9 | 20 |

Only 8 seeds above 300 are majority-old (345, 365, 367, 416, 431, 451, 452, 655), and
44 seeds below 300 are majority-new (the seeds 1–5 August rebuild plus scattered July
repairs). Otherwise the band is clean either side.

**Scope of the redo, in render terms: 12,533 distinct clips / 12,531 distinct texts /
507,401 characters** — 162,509 English + 344,892 German. See §5–6.

---

## 1. Slot inventory

`deu_for_eng` holds **1,570 `course_legos` rows and 13,926 `course_practice_phrases`
rows** = 15,496 holder rows. Each holder carries four link columns, so
**61,984 audio slots** exist in principle.

| Role | Total slots | Linked | Missing | Dangling links | Resolved |
|---|---|---|---|---|---|
| known | 15,496 | 15,488 | 8 | 0 | 15,488 |
| target1 | 15,496 | 15,494 | 2 | 0 | 15,494 |
| target2 | 15,496 | 15,492 | 4 | 0 | 15,492 |
| presentation | 15,496 | 2,372 | **13,124** | 0 | 2,372 |
| **Total** | **61,984** | **48,846** | **13,138** | **0** | **48,846** |

Two things to read here:

- **Coverage on the three learner-facing roles is essentially complete** — 14 unlinked
  slots out of 46,488. There is no missing-audio backlog to speak of.
- **Presentation is 15% linked by design, not by damage.** Presentation clips only exist
  for LEGO debuts and component rows, not for every practice phrase. The 13,124 "missing"
  presentation slots are columns that were never meant to be filled. Do not read that
  number as a gap.
- **Zero dangling links.** Every one of the 48,846 links resolves to a live `course_audio`
  row, and every resolved row carries `course_code = 'deu_for_eng'` — there is no
  cross-course borrowing in this course, in either direction.

---

## 2. Role × generation-era matrix

Slot counts, bucketed by `course_audio.created_at` month.

| Role | 2026-01 | 2026-02 | 2026-03 | 2026-04 | 2026-05 | 2026-06 | 2026-07 | 2026-08 | resolved |
|---|---|---|---|---|---|---|---|---|---|
| known | 0 | 5,257 | 601 | 574 | 2 | 6 | 8,010 | 1,038 | 15,488 |
| target1 | 1,734 | 3,637 | 725 | 568 | 3 | 21 | 8,064 | 742 | 15,494 |
| target2 | 1,585 | 3,517 | 711 | 561 | 3 | 0 | 7,844 | 1,271 | 15,492 |
| presentation | 0 | 1 | 366 | 13 | 0 | 0 | 261 | 1,731 | 2,372 |

Collapsed into eras:

| Role | Jan–Feb | Mar–Jun | Jul | Aug | **Jan/Feb %** |
|---|---|---|---|---|---|
| known | 5,257 | 1,183 | 8,010 | 1,038 | **33.9%** |
| target1 | 5,371 | 1,317 | 8,064 | 742 | **34.7%** |
| target2 | 5,102 | 1,275 | 7,844 | 1,271 | **32.9%** |
| presentation | 1 | 379 | 261 | 1,731 | **0.0%** |

The three main roles move together — within two percentage points of each other in every
era. That is the signature of a whole-course pass, not a per-role one: whatever rebuilt
German in July rebuilt all three sides at once, and stopped at seed 300.

The English known side and the German target sides are equally affected. This is worth
saying plainly because it differs from French, where the English side was already current
and only the French needed doing.

---

## 3. Voice and provider cross-cut

| Role | Voice | Slots | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug |
|---|---|---|---|---|---|---|---|---|---|---|
| known | `eve` | 13,765 | 0 | 4,651 | 549 | 519 | 2 | 3 | 7,207 | 834 |
| known | `xai_eve` | 1,723 | 0 | 606 | 52 | 55 | 0 | 3 | 803 | 204 |
| target1 | `ara` | 13,775 | 1,572 | 3,259 | 642 | 503 | 3 | 18 | 7,227 | 551 |
| target1 | `xai_ara` | 1,719 | 162 | 378 | 83 | 65 | 0 | 3 | 837 | 191 |
| target2 | `leo` | 13,782 | 1,422 | 3,175 | 636 | 497 | 3 | 0 | 7,006 | 1,043 |
| target2 | `xai_leo` | 1,710 | 163 | 342 | 75 | 64 | 0 | 0 | 838 | 228 |
| presentation | `eve` | 2,095 | 0 | 0 | 330 | 9 | 0 | 0 | 224 | 1,532 |
| presentation | `xai_eve` | 277 | 0 | 1 | 36 | 4 | 0 | 0 | 37 | 199 |

`origin` is `tts` for 48,845 of 48,846 resolved slots. The one exception is a single
`human` presentation clip (August).

**Finding — in German, `voice_id` does NOT identify the generation.** Each voice appears
under two labels, a bare name (`eve`/`ara`/`leo`, ~90%) and an `xai_`-prefixed name
(~10%), and the prefixed share is roughly constant in *every* month — 9–11% in January
through July. In French the `xai_` prefix cleanly marked the August generation and could
be used as a freshness test. **That test does not transfer to German. Use `created_at`,
not `voice_id`.**

I cannot tell from the DB alone whether that means xAI voices really were in use in
January, or whether `voice_id` was relabelled on old rows after the fact. `course_audio`
records no history for that column. **Explicit gap.**

---

## 4. The stale layer, named

**Pre-March 2026 renders, per role:**

| Role | Language | Stale slots | of resolved | Distinct clips | Distinct texts |
|---|---|---|---|---|---|
| **known** | eng | **5,257** | **33.9%** | 4,219 | 4,219 |
| **target1** | deu | **5,371** | **34.7%** | 4,246 | 4,245 |
| **target2** | deu | **5,102** | **32.9%** | 4,080 | 4,079 |
| presentation | eng | 1 | 0.0% | 1 | 1 |
| **Total** | | **15,731** | **32.2%** | **12,546** | **12,544** |

**Localised to seeds 1–300, which is where it actually lives:**

| Role | Slots in band | Stale slots | % of band | Distinct clips | Distinct texts | Characters |
|---|---|---|---|---|---|---|
| known | 6,366 | 4,793 | **75.3%** | 4,212 | 4,212 | 162,509 |
| target1 | 6,369 | 4,880 | **76.6%** | 4,242 | 4,241 | 174,871 |
| target2 | 6,370 | 4,671 | **73.3%** | 4,079 | 4,078 | 170,021 |
| presentation | 1,198 | 1 | 0.1% | 1 | 1 | 38 |

**The seeds 1–300 band captures 99.8% of the stale layer** — 4,212 of 4,219 stale known
clips, 4,242 of 4,246 target1, 4,079 of 4,080 target2. Rebuilding that band rebuilds the
stale layer; there is no meaningful long tail elsewhere.

The Jan/Feb slots that *appear* beyond seed 300 (464 known / 491 target1 / 431 target2)
are almost entirely the same clips reaching forward: 443 / 485 / 428 of them point at a
clip that also serves a seed inside the band. Only ~21 / 6 / 3 slots beyond seed 300 sit
on independently old clips.

**Repoint blast radius:** because those clips are shared, rebuilding the band necessarily
moves 443 known / 485 target1 / 428 target2 slots that live beyond seed 300. Same effect
the French slice hit (137 links for 63 slots). Flagged now so it is not a surprise later —
those phrases get a newer clip, nothing regresses, but the change does reach past the band.

---

## 5. Distinct clips vs distinct texts — scope by render cost, not slot count

| Role | Resolved slots | Distinct clips | Distinct texts | Slot→clip reuse | Clip→text duplication |
|---|---|---|---|---|---|
| known | 15,488 | 13,248 | 13,247 | 14.5% | **0.0%** |
| target1 | 15,494 | 13,239 | 13,226 | 14.6% | **0.1%** |
| target2 | 15,492 | 13,238 | 13,225 | 14.6% | **0.1%** |
| presentation | 2,372 | 2,371 | 2,370 | 0.0% | 0.0% |

Two separate savings, and only one of them is available:

- **Slot→clip reuse is real and already in place**: 15,488 known slots resolve to 13,248
  clips, so ~14.5% of slots share a clip with another slot. A redo pays per clip, not per
  slot — that is a 2,240-clip saving on the known side before anything else is done.
- **Clip→text duplication is essentially zero.** German is already deduplicated: 13,248
  clips carry 13,247 distinct texts. There is no second dedup prize here. This is *unlike*
  the estate-wide English picture the French inventory found (544,207 clips → 315,089
  texts, 42% redundancy) — that redundancy is *across* courses, and German's own internal
  house is in order.

So: **scope the German redo by distinct clips (12,533 for the band), not by slots
(14,344), and do not expect further dedup savings inside the course.**

---

## 6. Character count of the stale layer — for cost estimation only

Distinct-text character counts, so a render bill can be estimated. **Nothing was
rendered. No TTS was called.**

| Layer | Language | Distinct texts | Characters |
|---|---|---|---|
| known (seeds 1–300 stale) | eng | 4,212 | **162,509** |
| target1 (seeds 1–300 stale) | deu | 4,241 | **174,871** |
| target2 (seeds 1–300 stale) | deu | 4,078 | **170,021** |
| **Band total (three roles)** | | **12,531** | **507,401** |
| *plus the single stale presentation clip* | eng | 1 | 38 |
| *Whole-course pre-March total (for comparison)* | | 12,544 | 507,505 |
| *Whole-course pre-July total (a bigger, optional scope)* | | 16,499 | 675,507 |

For scale: the French rounds-1–10 slice that Tom has already heard was 1,282 characters.
The German band is **~396× that slice**.

**Cost is an explicit gap.** The only per-character TTS rate recorded in this repo is
Azure's, `$4.00 per million characters` (`tools/build-chunk-audio-regen-queue.cjs:28`).
At that rate the band would be **$2.03**. But these are xAI voices (`ara`/`leo`/`eve`),
and **no xAI per-character rate is recorded anywhere in this repo** — I am not going to
invent one. Treat $2.03 as an order-of-magnitude reference against a different provider's
price list, not as a quote. The real number needs the xAI rate from whoever holds the
account.

---

## 7. Limitations and gaps — read before acting on any number above

1. **`course_audio` has no `updated_at`. `created_at` is the render time of the ORIGINAL
   row.** A row created in January whose S3 object was later replaced *in place* still
   reads January in every table here. Every "stale" count above is therefore an
   **upper bound on staleness / lower bound on freshness**.

2. **That bound is partially measurable, and I measured it.** `audio_revision > 1` marks a
   row whose bytes were swapped under the same id. Among the *linked stale clips*:

   | Role | Stale clips | of which `audio_revision > 1` | % |
   |---|---|---|---|
   | known | 4,219 | 361 | 8.6% |
   | target1 | 4,246 | 277 | 6.5% |
   | target2 | 4,080 | 230 | 5.6% |
   | **Total** | **12,545** | **868** | **6.9%** |

   So **roughly 7% of the stale layer has had its bytes touched since creation** and may
   already be better than its date suggests. The other 93% has not been revised at all.
   This does not prove the 93% is bad audio — only that nothing in the DB records it being
   changed. (`course_audio_revisions` holds 1,381 rows estate-wide, consistent with this.)

3. **This census measures dates, not quality.** It cannot tell you whether a January clip
   sounds bad. The French slice made exactly this point: the old French clips passed the
   pace gate cleanly and the damage Tom heard was voice/generation quality, which no
   automated gate in the estate currently catches. **A listen on a sample from seeds 1–300
   is the only instrument that settles it**, and that listen should happen before 12,533
   clips are re-rendered on date evidence alone.

4. **Not covered by this census:** `lego_introductions.presentation_audio_id` (a fifth
   holder column that `regen-seed-clips-from-scratch.cjs` also repoints) was out of the
   brief's scope — the brief named `course_legos` and `course_practice_phrases`. If the
   redo runs, that column must be included or presentation audio and its legacy
   `audio_uuid` pointer will disagree.

5. **Unlinked rows.** `deu_for_eng` has 47,374 `course_audio` rows but only 42,096 are
   linked from the two holder tables — **5,278 rows are unreferenced** (tombstoned
   supersedes, orphans, or clips held only by `lego_introductions`). Not investigated;
   flagged as a loose end, not a finding.

6. **No S3 verification.** Nothing here was checked against served bytes. Every statement
   is a database statement.

---

## 8. What this means for scoping the German redo

- **The unit of work is seeds 1–300, all three roles together** — 14,344 stale slots,
  **12,533 distinct clips, 12,531 distinct texts, 507,401 characters**. Not the whole course.
- Seeds 301–668 are already on the July generation and need nothing on date evidence.
- Presentation is already current course-wide (92% July/August) and can be left alone.
- Rebuilding the band will also move ~1,356 slots beyond seed 300 that share clips with it.
- **Before spending that: listen to a sample from seeds 1–300.** ~7% of that layer has
  already been revised in place and may be fine, and the census cannot hear anything.

---

*Generated by `tools/deu-stale-layer-census.cjs`, `tools/deu-stale-layer-by-seed.cjs` and
`tools/deu-stale-cutover.cjs` (all read-only, committed on this branch).*
