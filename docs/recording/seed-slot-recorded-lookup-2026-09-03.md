# Aran's six lines: why the booth kept asking, and what it costs the estate

Read-only investigation plus one code fix. **Nothing was written to any clip, take, course_audio row, seed slot or S3 object.**

## 1. The root cause, in one sentence

`services/voice-engine/recordist-queue.cjs`, in `linkSeedTake` — the queue lists a seed line **because** its slot is not filled by this artist, and the linker then refused to move that same slot **because** it is not filled by this artist, so a take of it could never land: record, save, get asked again, forever.

All six of Aran's stuck seeds have `course_seeds.target2_audio_id` pointing at a **`legacy_import`** clip from 2026-01-04. His six new takes are filed correctly in `course_audio` and are the only six of his 89 target2 takes that are linked to no seed slot at all. The other 83 landed because their slots were empty.

The brief's prime suspect — `fetchRecordedKeys` in `services/course-order-script.cjs`, normalising with `normalizeForAudio` alone — is **not** the cause here. That path is not what serves Aran's booth, and it prunes all six correctly (`5879 total / 5667 recorded / 212 remaining`). The booth is served by `recordist-queue.cjs`, whose numbers match what #374 reported. Two other claims in the brief are contradicted by the code, and the code wins:

- "I found no seed/target2 handling in it" — `recordist-queue.cjs` gained seed sentences as its third queue source on 2026-09-02 and casts them from `voice_config.voices.target1/.target2`.
- "cym_n_for_eng currently casts neither target slot" — it now casts Catrin to target1 and Aran to target2. That is why his seed lines exist at all.

`fetchRecordedKeys`' `normalizeForAudio`-only keying is still a real latent defect and is listed under "found, not touched" below.

## 2. The fix

Landed on `main` as `6f5bbf92c`.

**The guard now asks who is actually holding the slot.** Another *recordist's* clip is still not ours to move — that protection is kept and tested. An **imported or synthesised** clip is precisely what the artist was asked to replace, and the take goes in. Nothing is deleted: the displaced clip stays in `course_audio`, still linked-from-nothing but still retrievable and playable, so make-before-break holds by construction.

**And the same disagreement ran the other way.** The linker wrote into *every* course of the language holding the same sentence, including courses the queue would never have offered the line for. **Eight `cym_s_for_eng` seed slots already hold a Northern take** because of it — the 2026-08-19 dialect bug in a new coat. Candidates are now the courses whose seed lines for this role are in **this** recordist's own queue, by the queue's own rule, extracted as `seedBucketFor()` so the two halves cannot drift apart again.

Tests: `services/voice-engine/recordist-seed-link.test.cjs`, 5 cases. **Two fail on `origin/main` and all five pass after.** 58 neighbouring tests (`recordist-queue`, `recordist-seed-queue`, `take-selection`, `recordist-coverage-counts`, `recordist-text-edit`, `recordist-clip-variant`) still green. The full suite was not run — the baseline is not green and the box is carrying the 16k re-render.

## 3. Are the six gone from the live queue? NO — and this is the one thing that needs you

Verified against the **live** endpoint, `GET http://localhost:3470/api/recording/voice/human_aran_cym_n` — `total 769, recorded 162, remaining 607`, and all six still listed:

```
seed:b33a7ce5…:target2  ti’n siarad hi
seed:d10e8c3a…:target2  dw i’n meddwl bo’ ti’n siarad Cymraeg yn dda iawn
seed:163a19b8…:target2  wnest ti ddechrau wythnos yn ôl
seed:d72b2446…:target2  fedri di ddeud o eto bach yn arafach?
seed:27c46427…:target2  mae o
seed:170a04fc…:target2  y ffilm ’na
```

The code fix stops the *next* artist falling into this. It cannot clear these six, because the only thing that clears them is pointing each seed's slot at the take Aran already gave us — **a write to content data, which this job's brief forbids three times.** So I did not do it. I built it, ran it dry, and committed the dry run beside it: `tools/recording/link-orphan-seed-takes-2026-09-03.cjs`, `0e8580abc`.

```
DRY RUN { 'would-link': 26 }
  cym_n_for_eng target2 human_aran_cym_n  from=legacy_import  6
  fin_for_eng   target1 human_kai_fin     from=(empty)       20
```

One command, ten seconds, 26 rows, nothing deleted, every before-state asserted at the moment of the write:

```
APPLY=1 node tools/recording/link-orphan-seed-takes-2026-09-03.cjs
```

**Until that runs, Aran will be offered those six lines again.** Say the word and it runs.

## 4. The estate-wide number: 26

Not six. **26 lines, across two courses and two artists**, where the voice being asked already has a stored take of that exact text and the queue lists the line anyway. Two distinct mechanisms:

| course | role | voice | count | slot holder | mechanism |
|---|---|---|---|---|---|
| cym_n_for_eng | target2 | human_aran_cym_n | 6 | `legacy_import` | the guard refused to displace it — fixed forward |
| fin_for_eng | target1 | human_kai_fin | 20 | **empty** | takes from 2026-08-19..23, before seed sentences entered the queue at all (2026-09-02); nothing ever linked them |

Kai's 20 are a *different* bug from Aran's six and my fix does not reach them: his takes predate the seed queue, so no link was ever attempted. They will link the next time he records each line — which is exactly the wasted morning, twenty lines of it, and it is why the backfill above covers both.

The count was made by running the real queue for every human voice in `language_recording_policy` (Catrin, Aran, Kai, and the two zzz fixtures — five voices, the whole set) and asking, per outstanding seed line, whether that voice's own clips contain the text under either normalisation convention. No scan of the 2.5M-row table; the read is `language` + `voice_id IN (spellings)`, which is a handful of hundreds of rows per voice. Script: `scripts/estate-count.cjs` (gitignored workspace), logic mirrored in the committed tool.

## 5. Found, deliberately not touched

- **8 `cym_s_for_eng` seed slots hold `human_aran_cym_n` clips.** A Northern take serving a Southern course's seeds. The fix stops the ninth; the eight are still there and are a Tom call, not a row fix.
- **`fetchRecordedKeys` in `services/course-order-script.cjs:187`** keys `course_audio.text` through `normalizeForAudio` alone, against the file's own written rule ("never on `normalizeForAudio` alone"). It happens not to bite today because both sides of *that* comparison use raw text through the same function — but it is one schema change away from biting, and it also matches on `course_code` + `role` + `origin` **without `voice_id`**, so a `target2` course-order script is currently pruned by 6,375 `legacy_import` clips and 56 of Catrin's. That is over-matching — the failure that silently loses recording work — and it is a bigger fish than the one I was sent for. Not touched: out of scope and it wants its own job.
- **19 `cym_n_for_eng` target2 seeds and 19 target1 seeds still hold `legacy_import` clips.** The six are the subset Aran has now re-read.

## 6. Not deployed

`main` is at `22216114c` with both commits. The running Production API serves from `/home/tomcassidy/SSi/ssi-dashboard-v7-clean-prod`, which is on `main` at `441b58abc` — **behind**. The fix is not live until that checkout pulls and `popty-production-api` restarts. I did not restart it: a restart kills in-flight uploads (it did exactly that twice during Aran's session this morning) and five other jobs are live on this box. Nothing is lost by waiting — the fix only bites on the next take upload, and there has been no recording activity since 13:09 UTC.
