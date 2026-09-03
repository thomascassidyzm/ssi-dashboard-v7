# Greek fixes, 2026-08-06 — what was actually done, and why

**Read-only reconstruction. No DB writes, no TTS, no content edits.** Sources in authority order: live Supabase (psql), git commits/diffs from today, `docs/greek-disambiguation-tags-2026-08-06.md`, and the gitignored `scripts/` workspace.

---

## The headline, up front

**No Greek-specific content fix was made today.** The Greek work of 2026-08-06 (13:05–13:22Z) was **diagnosis only** — two doc commits, zero DB writes. The doc says so and the evidence agrees.

The only DB writes that touched Greek today came from **two estate-wide sweeps ("A-22")** that were not about Greek and not about the disambiguation tags. Greek was one of 30–56 courses caught in each.

And one of those sweeps had a side effect that **cuts against** the Greek diagnosis: it put 30 tagged, tag-speaking intro clips back onto a learner read path they had been disconnected from.

---

## 1. Every individual change, evidenced

### 1a. The Greek-specific work: two commits, no rows touched

| Commit | Time (UTC) | What | Rows written |
|---|---|---|---|
| `65379869` | 13:18 | `docs(ell): Greek disambiguation tags — wrong-person bug is fixed, tags are presentational, not Greek-only` | **0** |
| `33033ad6` | 13:22 | `docs(ell): fold in two worker probes — baked-in tags are NOT Greek-only, plus corrections` | **0** |

Both touch only `docs/greek-disambiguation-tags-2026-08-06.md`. The doc's closing line: *"Nothing was written. No DB mutation, no TTS, no content edit, no approval requested."*

Corroborated independently: the 21 `scripts/_gk_*.cjs` probes (mtimes 13:05–13:20) contain **zero** write verbs — `grep -icE "update|insert|delete|upsert" scripts/_gk_person4.cjs` returns `0`. They page through `course_legos` / `course_practice_phrases` with `.select()` only.

### 1b. The two writes that DID touch Greek — both estate-wide sweeps

| # | Time (UTC) | Table | Greek rows | Column | BEFORE | AFTER | Scope |
|---|---|---|---|---|---|---|---|
| **W1** | 15:07 | `course_practice_phrases` (`phrase_role='component'`) | **548** | `presentation_audio_id` | a **dead** uuid (pointing at a deleted `course_audio` row) | `NULL` | 30 courses in the same minute |
| **W2** | 15:49 | `course_legos` | **38** | `presentation_audio_id` | `NULL` | a live `course_audio` uuid | 56 courses, 6,688 rows |

**Neither changed a single character of Greek text.** All `known_text` / `target_text` on seeds, legos and phrases are byte-identical to before; only link columns moved.

#### W1 — the dead-pointer unlink (commit `a04e9636`, 15:16Z)

> *"The regenerate-presentations orphan sweep in phase8 deleted `course_audio` rows whose id was still held by `course_practice_phrases.presentation_audio_id`. That column had no FK, so nothing nulled it: **17,480 dead pointers estate-wide across 34 courses**, every affected course dead from seed 1."*

**Why the fix took this shape** — stated in the commit itself:

> *"A dead id is far worse than a null one. `cycles.ts` resolves `'presentation_audio_id || known_audio_id'`, so a NULL falls back to the known clip while a dead id 404s and hard-stalls the player."*

So: null the dead pointer, let the fallback fire. Greek's share was 548 rows.

Verified live — the repair is complete and precise:

```
=== ell_for_eng components still bound ===
 still_bound | resolves_live | dead
         143 |           143 |    0

=== estate-wide phrase presentation pointers ===
 bound | live  | dead
 56671 | 56671 |    0
```

**0 dead pointers remain estate-wide** (was 17,480). Greek's 143 surviving bound components all resolve to live audio — i.e. the sweep nulled exactly the dead ones and left the healthy ones alone.

#### W2 — the A-22 stage-2 relink (commits `e9cb80c4`, `6d81bb69`, `e803a157`, `51049fe9`)

Greek's applied log is committed at `docs/a22-applied/ell_for_eng.json`:

```json
{ "mode": "applied", "courses": ["ell_for_eng"], "count": 38,
  "aborted": null, "ambiguous": [] }
```

All 38 rows are `table: "course_legos"`, `column: "presentation_audio_id"`, `match: "strict"`, `candidates: 1`, `audio_language: "eng"` = `expected_language`. The 38 `ref` values in the log match the 38 rows I found live with `updated_at >= '2026-08-06'` **exactly**.

BEFORE is stated in the snapshot commit `6d81bb69` (15:47Z):

> *"All 6,688 read back NULL live at snapshot time, so the rollback is simply setting these ids back to NULL."*

**Why the fix took this shape:** these were LEGO intro slots whose audio existed in `course_audio` but was never linked — recoverable for free, no TTS spend. From `51049fe9`: *"6,688 links recovered free across 56 courses… Zero bought, zero guessed, zero drift."* Safety rested on the match key containing the carrier phrase, so two clips matching the key are the same words in the same order; `ambiguous: []` for Greek.

---

## 2. The recurring patterns

**Defect class being fixed today: broken *links*, never broken *text*.** Both sweeps operate on `presentation_audio_id` only. Not one Greek word changed today.

Three distinct link pathologies, three different shapes of fix:

| Pathology | Fix shape | Rationale |
|---|---|---|
| Pointer → deleted row (**dead**) | set to `NULL` | NULL degrades gracefully via `\|\| known_audio_id`; a dead id 404s and hard-stalls the player |
| Pointer absent (**NULL**) but audio exists | set to the real uuid | recovers a working intro at zero TTS cost |
| Pointer → live row | **left alone** | nothing to fix |

**Second pattern — make-before-break and reversibility, consistently applied.** A-22 ran dry-run → committed pre-apply snapshot → apply → committed per-course applied log → live verification. The rollback is explicitly defined ("setting these ids back to NULL"). This matches the estate doctrine in `AUDIO_PIPELINE_ARCHITECTURE.md` §6b.

**Third pattern — cheap structural repair is preferred to expensive regeneration.** Both sweeps deliberately chose relink/unlink over re-rendering audio. Zero TTS spend today on Greek.

---

## 3. What was deliberately LEFT ALONE

**The 70 tagged intro clips themselves.** Still tagged, verbatim, right now:

```
The Greek for: 'to answer (I, aorist)', is:
The Greek for: 'I can (1sg present + subjunctive)', is:
The Greek for: 'you're doing (2sg present, idiomatic progress)', is:
The Greek for: 'before (preposition', is:          <- malformed, no closing quote
```

Left alone because re-rendering is Aran's call on phrasing — the doc explicitly declines to propose wording: *"The presentation design is Aran's call; this document does not propose phrasings."*

**The 2 flagged Greek sentences.** Both still live, unchanged — I re-ran the audit today and they still appear:

```
el_for_eng:S0070L03U04  EN: "I don't know where to find it"
                        EL: δεν ξέρω πού να βρεις     (lego S0066L02 = να βρεις, 2sg)
```

Left alone correctly: *"Both need a Greek speaker's confirmation. Do not act on them on my say-so."* Acting would have been a methodology violation.

**The baked-in tags in tel/rus/nep.** Counted, not touched — flagged as a separate, bigger job.

**The 56,671 component→presentation bindings estate-wide.** From `docs/components-never-introduced-2026-08-06.md`, an explicit refusal of the brief's default:

> *"The brief's default was to unlink presentation audio from component rows. I did not, deliberately. That would have been a 56,671-row mutation across 96 courses to fix something that no longer has any effect… That is exactly the large blast radius the brief said to stop and report rather than sweep."*

### Verifying the doc's two load-bearing claims

**Claim A — "the wrong-person bug is fixed." HOLDS.** I re-ran `scripts/_gk_person4.cjs` against the live DB today and reproduced it exactly:

```
DETECTOR COVERAGE (explicit-subject cases evaluated):
  {"subject-controlled":482,"object-controlled":77} of which CORRECT: 559
CONFIRMED (explicit embedded subject, Greek person differs): 0
```

482 + 77 = **559, all correct, 0 mismatches**. Caveat inherited from the doc and unresolved: this rests on a mechanical verb-ending rule, not a Greek speaker.

**Claim B — "tags are presentational, and NOT Greek-only." HOLDS, and the doc's own correction was right.** Live counts today:

| Claim | Doc | Measured live | Verdict |
|---|---|---|---|
| `ell` legos w/ paren in `known_text` | 0 / 1,023 | **0 / 1,023** | CONFIRMED |
| `ell` legos w/ paren in `target_text` | 0 / 1,023 | **0 / 1,023** | CONFIRMED |
| `ell` phrases / seeds w/ paren | 0 | **0** | CONFIRMED |
| `ell` presentation rows tagged | 70 / 993 | **70 / 993** | CONFIRMED |
| `tel_for_eng` legos baked-in | 822 / 1,657 (49.6%) | **822 / 1,657 (49.6%)** | CONFIRMED |
| `rus_for_eng` legos baked-in | 421 / 801 (52.6%) | **421 / 801 (52.6%)** | CONFIRMED |
| `nep_for_eng` legos baked-in | 382 / 926 (41.3%) | **382 / 926 (41.3%)** | CONFIRMED |
| `kor_for_eng` legos baked-in | 24 / 1,459 | **24 / 1,459 (1.6%)** | CONFIRMED |
| estate tagged presentation rows | 4,911 / 43 courses / 127,678 | **4,936 / 47 courses / 127,698** | drifted (estate active since 13:22) |

So **"presentational" is genuinely Greek-only** — for Telugu/Russian/Nepali the tag is baked into `known_text` and any re-render reproduces it. The 13:22 correction (`33033ad6`) that walked back the flat "the tags are separate, not baked in" was correct and is confirmed by live data.

---

## 4. Evidence of reversal, correction or overrule

**Three, and the third is the significant one.**

### (i) Self-correction within 4 minutes — `65379869` → `33033ad6`

| Claim at 13:18 | Corrected at 13:22 |
|---|---|
| "The tags are **separate, not baked in.** The fix is presentational." | "**For Greek: separate… For other courses it IS baked in.**" |
| tagged intros = **69** | **70** (`'before (preposition'` — malformed quote, strict regex missed it) |
| "38 courses, ~2,280 tagged intros" | "**4,911 tagged rows across 43 courses**" |
| `to take I present` — "**it no longer exists.** No row in any course contains `(I, present)`" | "**it is gone from the Greek course**" (scope narrowed to Greek) |

### (ii) A worker claim overruled

The commit message of `33033ad6` records: *"overturned a worker claim: the paren-strip guard DOES exist, at `phase8-audio-from-baskets.cjs:163`"* — a parallel trace had concluded no stripper existed anywhere in `services/`; it had inspected the wrong file (`phase8-audio-v13.cjs`). Overruled by `git blame`.

### (iii) The Greek diagnosis was materially undercut by a later sweep — and nobody connected the two

The doc at 13:18 measured the tagged intros' reachability and reported a range:

> *"Treat **69** as the exposure and **17** as the floor… The link was fixed; the text was not."*

It read the 38 NULL links as a deliberate half-repair: *"for 38 more they set the link to NULL."*

At **15:49**, A-22 relinked those slots — because from A-22's vantage point a NULL link is simply an unhealed slot worth recovering for free. Measured live now:

```
The 70 tagged legos, link state today:
 touched_today | n  | link_null | points_at_own_tagged | points_elsewhere
       false   | 40 |         0 |                   17 |               23
       true    | 30 |         0 |                   30 |                0
```

**Tagged intros reachable via `presentation_audio_id` went 17 → 47** (17 + 30). Reconciles exactly. Of A-22's 38 Greek rows, **30 own a tagged clip and 8 are clean.**

The single clip the doc used as its worked example is among them — `S0043L03`, whose A-22 log entry records `"duration_ms": 4056`, the exact 4,056 ms the doc measured for `The Greek for: 'to answer (I, aorist)', is:`.

**This is not a reversal of a considered decision.** A-22 was tag-blind by design — it matches on carrier text and language, and has no notion of grammatical annotation. The competing explanations of *why* those 38 were NULL (Greek doc: a deliberate half-repair; A-22: never-healed orphan slots, an estate-wide structural gap) were never reconciled, because the two pieces of work ran hours apart and neither cites the other. The honest statement is: **an estate-wide link-healing sweep re-exposed 30 tag-speaking clips on one of the two read paths, and no one has yet noticed.**

The doc's cross-pointing example survives intact and shows what the earlier partial repair looked like:

```
 lego_id  | known_text |                own_pres_row                        | link_points_to |      link_text
 S0152L03 | if         | The Greek for: 'if (conditional conjunction)', is: | S0165L03       | The Greek for: 'if', is:
 S0165L03 | if         | The Greek for: 'if', is:                          | S0165L03       | The Greek for: 'if', is:
```

S0152L03 still borrows S0165L03's clean `'if'` clip. 23 tagged legos still point elsewhere this way.

---

## 5. EXPLICIT GAPS

1. **The premise of my brief is not supported.** I was asked to reconstruct "fixes made today on Greek". No Greek-targeted content fix exists today. What exists is diagnosis plus two estate sweeps that incidentally touched Greek link columns. I report that rather than manufacture a fix list.

2. **I could not obtain true BEFORE values for W1 (the 548 components).** No pre-apply snapshot was committed for the dead-pointer unlink (unlike A-22 stage 2, which has one). "BEFORE = a dead uuid" is inferred from three converging facts — the commit message describing 17,480 dead pointers, the perfect correlation (548/548 touched are now NULL, 143/143 untouched are non-NULL), and 0 dead pointers remaining estate-wide — **not** from a recorded before-image. The 548 individual old uuids are unrecoverable.

3. **The doc's "38 NULL among the 70 tagged" does not reconcile with A-22's 38.** A-22's 38 Greek rows are 30 tagged + 8 clean. Either the doc's 38 was measured differently or 8 tagged slots were linked by some other path. I could not resolve this; `course_audio` has **no `updated_at` column**, which forecloses the direct check.

4. **The doc's residual count does not reproduce.** The doc reports 42 no-subject cases (40 impersonal + 2 wh-complements). Re-running the named script `_gk_person4.cjs` today gives **"PLAUSIBLE impersonal/generic: 94"**. The doc may have used `_gk_resid.cjs` with a narrower filter. The **0 mismatches** headline reproduces exactly; the 42 does not. I did not resolve which is right.

5. **Which read path a live learner is on remains unestablished** — the doc's own gap #3, and I did not close it. It now matters more, not less: on `getIntroductionAudio()` the exposure is 70; on `cycles.ts` it went 17 → 47 today.

6. **Every Greek grammatical judgement remains unconfirmed by a Greek speaker.** The 559/559 result is a mechanical verb-ending rule. Unchanged from the doc's gap #5.

7. **Estate-wide tag counts drifted** between the doc's 13:22 measurement (4,911 / 43 courses) and mine (4,936 / 47 courses / 127,698). Other courses are actively being worked; I did not chase the 25-row delta.

8. **No `ell_*` course other than `ell_for_eng` exists** with content — `course_legos` has exactly one `ell` course code. So "possibly other ell_* courses" has no target.

9. **I could not fan out.** The dispatch API refused at the depth ceiling (this session is already a depth-2 worker), so all of the above is single-session work. Two planned parallel probes — a full `scripts/_gk_*.cjs` read-through and an independent estate re-count — were done in reduced form by me instead.
