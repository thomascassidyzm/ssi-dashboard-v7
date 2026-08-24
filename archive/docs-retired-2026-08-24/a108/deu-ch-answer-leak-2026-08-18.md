# deu_ch_for_eng — Swiss German in the English prompt: mechanism, repair, residue

**2026-08-18 · draft course, `new_app_status=not_available` · no audio generated · spend $0.00**

## The mechanism

Not a column-mapping bug and not a fallback in the writer. `deu_ch_for_eng` was built in one
continuous run on 2026-07-16 (03:01Z → 13:20Z). The German was already in the `known` field of the
payload the build agent submitted.

Two things had to combine:

1. **Nothing validates the known side of a build phrase.** `checkBuildUsePhrases`
   (`services/course-builder/lib/phrase-structure.cjs:141`) filters on `p.target` only; the
   known-side quality gates that follow are `use.filter(...)` (lines 167–190). The known-side vocab
   gate in `seed-complete.cjs` was warn-only *and* contract-gated at the time — `loadPairContract`
   finds no `deu_ch_for_eng` contract, and the `_default_eng` fallback landed 2026-07-27, eleven
   days after this build. Length-ratio can't fire either: a verbatim copy has ratio 1.0.
   **Nothing anywhere checks that `known_text` is in the known language.**
2. **The re-prime after a pause feeds the course its own prior rows as the worked example.**
   `routes/course-data.cjs:216` echoes the previous seed's build rows back as
   `{known: p.known_text, target: p.target_text}`. Once seed 452 was damaged, every later re-prime
   showed German-on-both-sides as house style — self-reinforcing.

The timing fits exactly. Damage begins at seed 452, immediately after an 11-minute pause
(451 at 09:47:12Z → 452 at 09:58:41Z), stops at 490 across a 9-minute pause (491 at 10:38:28Z),
and restarts at 608 after a 5-minute pause (607 at 12:44:39Z → 608 at 12:49:56Z), running to the
end of the course. Span 2 is worse than span 1 — contamination compounding — with even the first
build variant damaged 43% of the time versus 3% in span 1.

## Damage shape — why this was repair, not rebuild

| layer | damaged |
|---|---|
| `course_seeds` | **0** |
| `course_legos` | **0** |
| practice phrases, `use` role | **0** |
| practice phrases, `component` role | **0** |
| practice phrases, **`build`** role | **313** |
| one stray `use` row (S0299L01U02) | 1 |

Build rows outside the two spans: 4,195, of which 3 identical — 0.07%. Inside them: 98% and ~80%.

**The target side was intact everywhere.** The Swiss German being taught was correct; only the
English prompt was missing and back-filled with a copy. So the boundary was drawn at *the damaged
field*, not the damaged seeds: rebuilding seeds 452–490 and 608–668 would have discarded verified-good
Swiss German, legos and use-phrases and regenerated them through the same pipeline that caused this,
for no gain. Where a fragment itself was mis-cut, it *was* rebuilt (below).

## Detector calibration

Reproduced the 2026-08-18 estate detector scoped to one course, reusing that run's own
`lexicon2.json` / `cap_profile.json`: **288 on deu_ch_for_eng, matching the published report
exactly**. Negative controls `eng_for_deu` and `eng_for_por`: 0 and 0.

Two independent detectors were added because the published scan warned its 288 were sampled, not
read row by row — and it was right to warn. A self-calibrating English lexicon (built from the known
side of every other `*_for_eng` course) found **314** damaged rows, 26 more than the bigram detector.
The 26 include copies differing only in capitalisation — `known "isch I de Nöchi"` vs
`target "isch i de Nöchi"` — which an identity test cannot see. Measured noise floor of that
detector on the course's clean zone: 194 false positives (rare English: *brilliant, thither, ajar,
pondered*), 1 true positive.

## What was done

- **298 rows** — English prompt written from the Swiss German, using the lego gloss and the
  undamaged sibling rows in the same seed as the wording guide. Target text untouched.
- **33 of those** then took their seed's formal marker (`, sir` / `, madam`). Evidence: undamaged
  `use` rows in seeds 639–655 carry it at **86% (54/63)**, and an unmarked build prompt is genuinely
  ambiguous — the learner cannot tell `wottsch` from `wänd Sie`.
- **6 rows** were re-cut (target *and* known changed) because the fragment itself was mis-cut. Each
  new form is a literal substring of an undamaged, correct sentence in the same lego, with its
  English taken from that sentence — recombination, not invention. e.g.
  `"em Hotel" → "im Hotel"` / "at the hotel", on the evidence of the undamaged
  `S0460L03U03 "mir sind geschter im Hotel gsi" = "we were at the hotel yesterday"`.
- **10 rows left alone.** See residue.

**LEGO / phrase split: 0 legos, 314 phrases** (313 build + 1 use). Vocabulary introduction was never
damaged, which is why no downstream phrase lost material it depends on.

## Verification

| check | before | after |
|---|---|---|
| calibrated estate detector | **288** | **10** |
| self-calibrating English-lexicon detector, in-span | 314 | 10 + 4 known false positives |
| non-ASCII script test on the English side | — | 4, all in the residue |
| ZUT collisions introduced (one prompt → two answers) | — | **0** |
| repaired targets failing to tile their lego | — | **0** |
| pre-existing ZUT collisions, untouched | 178 | 178 |
| audio clips / linked rows | 1 / 0 | 1 / 0 |

The 10 remaining are *exactly* the 10 rows left by design — verified by set equality, not by count.

## Consistency sweep (downstream)

Checked every repaired row against its lego and against the rest of the course:

- **Tiling: 0 failures** across 298/298 rows resolved to their lego.
- **Reverse-ZUT** (one Swiss German form, several English prompts): 4 involving a repair, against
  **219 pre-existing**. All 4 examined and none caused by this repair: `bitte` is genuine polysemy
  (verb *to ask for* at S0212 vs the particle *please* at S0624/S0630); `bereit` diverges between
  two *undamaged* seeds (569 glosses it "willing", 611's own undamaged use rows gloss it
  "prepared" — the repair correctly followed its local seed); the two `wänd Sie` cases are seed 643
  saying "sir" where seed 650 says "madam", which is the course's own pre-existing inconsistency.
- **Novel English introduced: 2 words.** "difference" (deliberate — "it makes no difference", to
  avoid colliding with "it doesn't matter", already owned by `es spielt kei Rolle`) and "seriously"
  (derived from the seed's established "serious" = `ernscht`).
- **Later seeds:** no later seed lost buildable material, because no lego and no target text in the
  vocabulary layer changed. The 6 re-cuts are all fragment-internal to their own lego.

**A correction worth recording:** the first pass of the lego-consistency check joined on
`course_practice_phrases.lego_id`, which is **NULL for all 13,301 rows of this course** — the link is
by seed number plus lego index encoded in the row id. That check passed vacuously and was re-run
properly. A uniformly-clean result on a check that has never failed is worth distrusting.

## Residue — 10 rows, needing a native reader

These are a **different defect**: the build fragment itself is mis-cut, or the Swiss German is
ungrammatical. They cannot carry an honest English prompt as they stand, and the recommended re-cut
is not attested in undamaged material in that seed, so applying it would mean inventing Swiss German
without a reader. Left leaked rather than papered over. Full list with recommendations:
`docs/a108/deu-ch-answer-leak-2026-08-18-recut-open.json`.

Examples: `S0628L01B03 "gern hesch Tee"` fronts `gern` and breaks the discontinuous `hesch … gern`
frame; `S0614L01B04 "wo isch i de Nöchi"` has no subject and the wrong order for a `wo` clause;
`S0642L01B02 "sie mit Ihne"` reads as "you with you".

## Estate exposure (from the parallel sweep, job #65)

`deu_ch_for_eng` was **not** the largest instance, and it is the cheap one. A script-mismatch test
(identity-independent) found:

| course | status | rows | already rendered |
|---|---|---|---|
| `por_for_jpn` | draft | **361** (not the 99 identity found) | 0 |
| `por_for_aze` | draft | 368 (untranslated tail, seeds 301–668) | 0 |
| `eus_for_spa` | **beta** | 61 | **61 known + 61 presentation clips** |
| `zho_for_jpn` | **beta** | 49 | **49** |
| `gle_for_eng` | **beta** | 24 | **24** |
| `swe_for_eng` | **beta** | 8 | **8** |
| `nep_for_eng` | **beta** | 8 | 2 |

**142 rows are already rendered to speech in live beta courses** — those cost a re-render; this one
didn't. Only `deu_ch_for_eng` shows this exact build-only, post-pause mechanism.

## Gaps

- **No native Swiss German reader.** All judgements rest on internal consistency with the course's
  own undamaged rows, not on a reading. The 298 repairs are English written from correct German;
  the 6 re-cuts recombine attested German. Neither has been heard by a speaker.
- The build orchestrator transcript for 2026-07-16 no longer exists, so the re-prime path taken at
  09:58Z and 12:49Z is inferred from code, not proven (confidence: high on the missing validation,
  medium on the contamination loop).
- Single-word leaks remain below every detector's floor.
