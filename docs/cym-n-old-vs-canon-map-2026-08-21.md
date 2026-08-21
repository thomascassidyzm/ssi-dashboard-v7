# Welsh North: the old course vs the new canon — what the update job actually is

*Read-only scout, 2026-08-21. Nothing was written to any content table: no seeds, no legos, no phrases, no canon rows, no TTS, no audio-pass queued. Every number on this page was read live from the production database this afternoon.*

---

## The answer, first

**The new canon has no Welsh in it.** Not for the North, not for the South, not at any seed number. What is filed in `canonical_seed_translations` under `cym_n` and `cym_s` is not a translation of the canon at all — it is **the old courses' own Welsh sentences dumped in positionally**, sitting under canon English sentences they have nothing to do with. Canon seed 267 reads *"Have you heard from your friend?"*; the Welsh filed against it is *"mae o wedi bod yn sâl ers ail ddiwrnod y gwyliau"* — "he's been sick since the second day of the holidays", which is the old course's seed 267. The two rows share a row number and nothing else. Spanish, Japanese, Dutch and Chinese in the same table are correctly aligned; Welsh, both dialects, is not.

So the single biggest cost driver in this job has a straight answer: **Welsh North target text for canon seeds 268–668 does not exist anywhere and has to be written.** That is 401 canon sentences to translate into northern Welsh before a single lego can be decomposed — and it is translation work at the top of the funnel, the `synonym-choice-architecture.md` pass, not a machine job.

Three things that follow:

1. **Tom's instinct about "goes a bit crappy after about SEED 267" is measurable, and the cliff is exactly where he put it.** USE phrases per lego across the old course run 2.5–4.2 all the way to seed 267, and then collapse: seeds 268–280 average **0.11 USE per lego**, seeds 281–305 average **0.06**. In the whole 268–305 stretch there are **178 legos and 14 USE phrases between them**. BUILD phrases stay normal (≈6/lego) throughout — so the last 38 seeds are a build-only shell with essentially no eternal practice. He named 267 by ear; the data puts the break at 268.

2. **Nothing is at risk in seeds 306–668, because there is nothing there.** Those 363 rows are canon English shells already inserted into `course_seeds` with **empty `target_text` and zero legos** — their `known_text` is character-identical to `canonical_seeds.source_text` at the same seed number, 363 of 363. Anything done to that range costs no migration and breaks no learner.

3. **The renumbering question is the only genuinely dangerous part of the job**, and the standing doctrine was written *because of Welsh*: `docs/pods/pod-migration-protocol.md` opens with "Position is the thing that broke Welsh." Progress is filed under a slot, not a sentence. My recommendation below is to never move a slot in 1–267 — append only.

---

## 1. Where the two things live

| | Old course | New canon |
|---|---|---|
| Table | `course_seeds` where `course_code='cym_n_for_eng'` | `canonical_seeds` (no course code — it is language-neutral) |
| Rows | **668** seed_numbers 1–668 | **668** seed_numbers 1–668 |
| English | `known_text` | `source_text` (uses a `{target}` placeholder at seed 1) |
| Welsh | `target_text` — populated for **1–305**, empty for **306–668** (363 empty) | `canonical_seed_translations` (`seed_number`, `language_code`, `translated_text`, `source_course`) — **and it holds no real Welsh, see §4** |
| Legos | `course_legos` — **635 rows**, seed_numbers **1–305 only**, 633 `is_new` | none; the canon has no decomposition layer |
| Phrases | `course_practice_phrases` — **4,997** (3,633 BUILD / 1,364 USE) | none |
| Rounds | `course_round_index` (materialised view) — **633 rows**, round_index 1–633 | n/a |
| Course row | `courses`: `status = released`, `seed_count = 300`, `content_version 0.0.2`, `released_at` null | n/a |

Join key throughout is `seed_number`. Note a trap for anyone querying: **`lego_id` is not unique across courses** — `S0264L02` exists in both `cym_n_for_eng` and `cym_s_for_eng`, so any join from `course_practice_phrases` to `course_legos` must match on `course_code` as well as `lego_id`, or the counts double.

## 2. Rounds — what "around about ROUND 400" actually is

Rounds track `is_new` legos, not seeds, and `course_round_index` is what the learning app's `api/courses/[code]/round-map.ts` reads.

| point | round |
|---|---|
| round 400 | lands at **seed 249** (`S0249L01`) |
| end of **seed 267** — Tom's cut | **round 455** (seed 267 spans rounds 452–455) |
| end of built content, seed 305 | **round 633** |

So the cut point is **round 455, not 400** — his "around about" was doing real work, and the seed number is the operative instruction. The kept range is **455 rounds of learning**, and the discarded 268–305 stretch is a further 178 rounds.

## 3. Old vs canon on the English side — and what "completely absent" should mean

Normalised text comparison (lowercased, punctuation and curly apostrophes stripped):

- Of the **267 canon seeds numbered ≤267**, **256 do not appear anywhere** in the old course's kept 1–267 English. Only **11** match. Widening the comparison to the whole built range 1–305 adds nothing — still 256.
- Of the **401 canon seeds numbered 268–668**, only **6** appear in the kept 1–267 English.
- The 363 canon seeds that "already appear" in `course_seeds` are just the shells at 306–668. Not overlap.

**256 is the wrong number to look at, and Tom should not plan against it.** The two courses are different sentences about the same language: the old course teaches "I don't even want it as a free offer" where the canon at that row teaches "A friend." A sentence-text miss says nothing about whether the canon seed teaches anything new. The unit that matters is the **LEGO — the intention-unit**. A canon seed all of whose legos the kept course already taught is not absent; it is a duplicate wearing different words, and building it would burn a round teaching nothing.

*(New-LEGO-contribution measure: worker #841's numbers, folded in below.)*

## 4. The canon's Welsh — what is actually in there

`canonical_seed_translations` coverage: `jpn` / `nld` / `spa` / `zho` at 668 each; **`cym_s` at 334; `cym_n` at 305.** Those two counts are the tell — 305 is exactly the old North course's built range and 334 is the South's. They are not canon coverage; they are a dump of the old courses.

Verified against the canon English at the same seed number:

| seed | canon `source_text` | filed as `cym_n` | what it actually is |
|---|---|---|---|
| 1 | *I want to speak {target} with you now.* | `dw i isio siarad Cymraeg` | old course seed 1 |
| 267 | *Have you heard from your friend?* | `mae o wedi bod yn sâl ers ail ddiwrnod y gwyliau` | old course seed 267 |
| 305 | *Woman.* | `mi wnaeth addewid na fyddai fo'n dewis y swydd anghywir` | old course seed 305 |
| 306+ | *(canon continues)* | **null** | nothing at all |

The same is true of `cym_s`: canon seed 267 *"Have you heard from your friend?"* carries `ddwedes i fod e ddim yn moyn mynd`. Spanish at the same row reads `Has sabido de tu amigo?` — correctly translated. **The Welsh rows are the anomaly, and they are a live data-integrity hazard**: anything downstream that reads `canonical_seed_translations` for Welsh is reading mislabelled sentences. This applies to **Welsh South exactly as much as to Welsh North** — flagged, untouched.

Dialect check on what is there: the North rows are cleanly northern (*isio*, *mae o*, *chdi*, *rŵan*, *efo*) and the South rows cleanly southern (*moyn*, *mae e*). The old courses are dialectally sound. There is simply no canon Welsh to be southern *or* northern about.

*(Estate-wide hunt for Welsh canon text outside the DB: worker #843's findings, folded in below.)*

## 5. Two defects found in passing (kept range)

- **Cyrillic homoglyphs in live lego text.** `S0264L02` "problem" → `problеm` and `S0271L01` "a challenge" → `hеr` both contain a Cyrillic **е** (U+0435) instead of Latin e. **S0264 is inside the kept 1–267 range.** These will not match, will not search, and will mis-render or mis-speak. Two rows, both `course_legos`, zero phrases affected. Logged, not fixed — this scout writes nothing.
- **Phrase floors are not met in the kept range either.** Against the standing floors of ≥4 BUILD and ≥5 USE per lego: of the 457 legos in seeds 1–267, **389 meet the BUILD floor but only 109 meet the USE floor**. Seeds 51–100 are notably thin (1.78 BUILD/lego). This is *not* a reason to re-open the decision to keep 1–267 — it is a cost that will show up later if the course is ever taken to floor compliance, and it should be a separate, scoped pass.

---

## 6. The number Tom should actually look at

Worker **#841** measured both units. Sentence-text: **258 of 267** canon seeds ≤267 are "absent" (my own normalisation said 256 — same picture, punctuation handling differs). New-LEGO contribution, approximated by content-word coverage against the 455 kept legos' vocabulary (357 distinct words, ~90-word function-word stoplist):

| canon seeds ≤267 | count |
|---|---|
| **fully covered** — every content word already taught; a duplicate wearing different words | **129 (48%)** |
| 75–89% covered | 53 |
| 50–74% covered | 55 |
| under 50% covered | 30 |

**So the real backfill candidate list is 138, not 258.** Roughly half the canon's first 267 sentences teach nothing the kept course has not already taught — canon seed 13 *"You speak {target} very well"* matches no old sentence at all, yet every word in it is already taught. Planning against 258 would buy 129 rounds of nothing.

The 138 that *do* introduce something miss on ordinary vocabulary — *practise, word, hard, little, sentence, able, meet, six, o'clock, evening*.

**Caveat, stated plainly:** this is word-presence, not real decomposition. It cannot see construction-level gaps, and it will over-count "fully covered" wherever the same words assemble into a construction the course never debuted. The true backfill number is between 129 and 258 and nearer the 138 end. Nobody should treat it as final until a decomposition pilot runs on a sample.

## 7. Past 267 — how much of the canon is genuinely new, and what it costs

Same measure, canon seeds 268–668 against the full kept vocabulary:

| canon 268–668 (401 seeds) | count |
|---|---|
| **fully covered — introduces nothing new** | **85 (21%)** |
| introduces at least one new content word | **316 (79%)** |

So the dedup Tom asked for removes about a fifth of the tail before anyone writes a word.

**Build size.** Anchoring on the course's own two rates — 1.70 new legos/seed across the kept 1–267 range, 4.68 across the later 268–305 stretch — the 316 seeds needing new content come out at **~540 legos at the early rate and ~1,480 at the late rate**. #841's judgement, which I share: 268+ is late-course material, so weight to the top — **roughly 1,000–1,500 new legos**. At the standing floors (≥4 BUILD + ≥5 USE, so ≥9 phrases per lego) that is **~9,000–13,000 phrases to author**, on top of 401 sentences to translate. The course today holds 4,997 phrases in total. **This job roughly triples the course.**

**ZUT risk, counted.** Six canon seeds in 268–668 are verbatim-identical (normalised) to English already used at kept seeds 259–267: canon 464→seed 259, 465→260, 466→261, 472→264, 474→265, 477→267. Those are hard collisions — same English prompt, and a second Welsh form would fork the learner. They should be dropped from the new-content set, not rebuilt. That count is a **floor, not a ceiling**: it is exact-match only, and paraphrase collisions ("I'm going to try" vs "I will try") need a reading pass nobody has done.

**Known-side controlled language.** Of 30 canon seeds sampled from 268–668, several use English machinery the kept 1–267 course never introduces: relative-clause-with-contraction (*"that young man who's sitting"*, canon 307), third conditional (*"if I'd known… I'd have waited"*, 606), concessive *however much* (593), *supposed to* (528), and reciprocal/reflexive *each other / themselves / everybody's*. These are not vocabulary gaps, they are constructions that need debuting with proper carriers. Note the sting in the tail: *instead of* **is** already taught — at seeds 284 and 299, inside the range the plan discards. Cut 268–305 and it has to be re-taught.

## 8. Learners and audio

**There is effectively nobody on this course.** Worker **#842** read all 88 rows in `course_enrollments` for `cym_n_for_eng`:

- **7 internal/admin/tester accounts** — including the only row that reaches seed 400 (a tester, sitting out in the empty canon shells).
- **59 demo accounts** (`learners.is_demo = true`) — synthetic school learners with fictional Welsh names in fake classes ("Blwyddyn 6", "Welsh Club"), bulk-stamped timestamps. **All the seed-depth in this course lives here**, max seed 90, and it is fabricated.
- **22 genuinely real accounts** — real email addresses. **Every one of them is at `highest_completed_seed` = 0 or null.** The most practised has 10 minutes.

**Zero real learners past seed 267. Zero between 100 and 267. Zero below 100 with any actual progress.** The course is `status: released` but nobody is on it.

That matters because progress here is keyed by position-encoded IDs — `course_enrollments.highest_completed_lego_id`, `seed_progress.seed_id` (`S0267`), `lego_progress.lego_id` (`S0267L03`). The seed number is baked into the identifier, so renumbering does not relabel a row, it orphans it. That is the failure `docs/pods/pod-migration-protocol.md` was written about — its first line is *"Position is the thing that broke Welsh."* The doctrine's own scope is pod dialogue, and #842 confirms **no written doctrine exists for lego/seed-ID renumbering specifically** — a real gap, not an assumed one. But with zero real progress on this course, **the migration risk here is theoretical rather than live**. Do not generalise that to Welsh South without checking its enrolments.

**Audio is in good shape and the plan barely touches it:**

| | legos | complete | phrases | complete |
|---|---|---|---|---|
| seeds 1–267 (kept) | 457 | **453** (4 missing known-side only) | 3,948 | **3,948 — 100%** |
| seeds 268–305 (dropped) | 178 | 177 | 1,049 | 1,038 |

The bulk is `legacy_import` — audio carried over from the old course, not TTS we paid for. Real human Welsh exists in the mix: `human_aran_cym_n`, `human_aran_cym_n_2`, `human_catrinlliar_cym_n`, plus 641 presentation clips on voice `human`. **The audio consequence of the plan is simple: the kept 1–267 range needs nothing, and every new sentence past 267 needs audio from scratch** — 401 seeds plus 1,000–1,500 legos plus ~9,000–13,000 phrases. That is the second big cost after translation, and it is an audio-pass request at the end, never a TTS run in the middle. Nothing was generated or queued by this scout.

## 9. Proposed execution plan

Each phase names what it touches, whether it can be undone, and what proves it landed.

| # | phase | touches | reversible? | verified by |
|---|---|---|---|---|
| 0 | **Quarantine the fake canon Welsh.** Mark or remove the 305 `cym_n` and 334 `cym_s` rows in `canonical_seed_translations` so nothing downstream reads them as canon translations | `canonical_seed_translations` only — no course content | yes, trivially (snapshot the rows first) | the table holds zero Welsh rows, or they carry an explicit `source_course` naming the old course |
| 1 | **Decomposition pilot on 40 canon seeds** — 20 from ≤267, 20 from 268+. Establishes the real new-lego rate and turns §6/§7's word-coverage approximation into a measured number | nothing; produces a document | yes — read-only | a per-seed table of legos actually needed vs predicted, and a revised build estimate |
| 2 | **Translate canon 268–668 into northern Welsh** — 401 sentences, minus the 6 ZUT collisions and minus whatever phase 1 shows is fully duplicative. Top-of-funnel work under `synonym-choice-architecture.md`, before any decomposition | a staging table or a document; **not** `course_seeds` | yes | dialect audit — northern markers present (*isio, mae o, chdi, efo, rŵan*), southern markers absent (*moyn, mae e, gyda, nawr*) |
| 3 | **Backfill the ≤267 gap** — build the ~138 canon seeds that genuinely add something, appended after 267, never inserted among the kept seeds | `course_seeds`/`course_legos`/`course_practice_phrases`, append only | yes, by deletion of the appended range | no existing seed_number 1–267 changed; ZUT gate clean course-wide |
| 4 | **Build the deduped tail** — canon 268–668 minus duplicates, at the floors | same tables, append only | yes | floors met per lego; `course_round_index` refreshed and extending past round 455 |
| 5 | **Audio pass** — one queued request covering everything built in 3 and 4 | `course_audio` | expensive to redo; make-before-break applies | every new lego and phrase carries known + target1 ids; voice matches the human Welsh already in the course |
| 6 | **Retire 268–305** — the old build-only tail | `course_legos`/`course_practice_phrases` for those 38 seeds | yes if snapshotted first | round index continuous; no orphaned phrases |

Two ordering rules that are not negotiable: **phase 1 before phase 2** (translating 401 sentences you then discover are duplicates is the expensive mistake available here), and **phase 5 after everything textual is settled** — the standing gate is that content passes end by *queueing* an audio pass, never by running TTS.

## 10. What needs Tom — five questions, one word each

1. **The 38 old seeds at 268–305 — discard them?** They hold 178 legos but only 14 USE phrases between them, and the canon will teach those intentions properly. One catch: *instead of* is taught there and nowhere else in 1–267, so it needs re-adding. *My recommendation: **discard**.*
2. **Who writes the 401 Welsh sentences — a native, or a machine draft a native then checks?** This is the top of the funnel; every lego below inherits its choices, and the course already carries real human northern Welsh. *My recommendation: **native**.*
3. **Numbering — append the canon material after 267 and re-seat its seed numbers, keeping a canon-number mapping alongside?** The alternative is preserving canon numbers, which forces a renumber of the kept range. IDs are position-encoded; there is nobody on the course today, but the doctrine still says do not move slots. *My recommendation: **append**.*
4. **Run the 40-seed decomposition pilot before committing to the translation spend?** It converts a 129-vs-258 word-coverage guess into a measured build size. *My recommendation: **yes**.*
5. **Quarantine the mislabelled Welsh rows in `canonical_seed_translations`, South as well as North?** They are old-course sentences filed under unrelated canon English, and anything reading them is reading a lie. *My recommendation: **yes**.*

## Gaps — what this scout could not establish

- **The new-lego numbers in §6 and §7 are word-coverage approximations, not decompositions.** They cannot see construction gaps, and phase 1 exists to replace them.
- **The ZUT collision count of 6 is exact-match only.** Paraphrase collisions are unmeasured and will be higher.
- **No doctrine exists for lego/seed-ID renumbering.** The pod protocol covers pod dialogue; the equivalent rule for position-encoded lego IDs is unwritten.
- **Audio "complete" means the id columns are non-null.** No clip was fetched or played; nothing was verified as audible.
- **The two `gfzdpspr5fdp` voice ids were not traced to a provider.**
- **Welsh South was looked at only where it touched this question.** Its canon rows are corrupt in the same way; its enrolments were not counted.

