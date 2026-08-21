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

*Sections 6–9 (dedup shape past 267, build size, learners and audio, execution plan) follow.*
