# Is Pod 1 fully live in all 22 courses?

**2026-08-24. AUDIT ONLY** — no TTS, no spend, no DB writes, no renders. Every number below was
re-derived from the **live Supabase database and live S3**, not from documents. Where a document was
used, it was cross-checked against a fresh query and is named.

---

## The answer

**Yes — with one defect, and one text ruling waiting on you.**

Pod 1 is live, correctly cast, fully backed by real audio in S3, and actually served to a fresh
client, in **all 22 courses**. The target-side splice you paused at 12:14Z did not need to become a
render: it ran as a splice, for £0, and it worked.

| | |
|---|---|
| Courses with a live, servable Pod 1 | **22 of 23** (`ara_sy_for_eng` has only a held staged pod) |
| Sentence rows | **5,082** (231 per course, every course) |
| Target split clips alive in S3 | **5,186 / 5,186** — full sweep, not sampled |
| Clips matching their cast voice | **14,151 / 14,151** — 0 off-cast, 0 uncast speakers |
| Turns served as per-sentence splits | **2,013** |
| Turns where a learner gets no audio | **0** |
| Silent fallbacks (split refused at serve time) | **1** |
| Cost of the whole target-side splice | **£0** |

---

## Per-course table

`cast` = 30 speakers / 2 target voices / 2 known voices, every speaker resolved.
`S3` = every distinct target split clip HEAD-probed against `ssi-audio-stage` (eu-west-1).
`split` = turns the app actually emits as per-sentence units, measured on the real read path.
`residue` = multi-sentence turns still served whole-turn (script-aware boundary).

| course | cast | clips alive | on-cast | split | residue | served | no-audio |
|---|---|---|---|---|---|---|---|
| ara_eg | ✓ | 248/248 | 644/644 | 97 | 3 | ✓ | 0 |
| ara | ✓ | 258/258 | 663/663 | 99 | 1 | ✓ | 0 |
| deu_at | ✓ | 218/218 | 631/631 | 86 | 14 | ✓ | 0 |
| deu | ✓ | 238/238 | 631/631 | 92 | 8 | ✓ | 0 |
| eus | ✓ | 263/263 | 683/683 | 100 | 0 | ✓ | 0 |
| fra_ca | ✓ | 254/254 | 684/684 | 100 | 0 | ✓ | 0 |
| fra | ✓ | 251/251 | 660/660 | 96 | 4 | ✓ | 0 |
| gle | ✓ | 256/256 | 661/661 | 98 | 1 | ✓ | 0 |
| hin | ✓ | 89/89 | 392/392 | 48 | 53 | ✓ | 0 |
| hrv | ✓ | 153/153 | 593/593 | 53 | 78 | ✓ | 0 |
| isl | ✓ | 258/258 | 667/667 | 100 | 0 | ✓ | 0 |
| ita | ✓ | 257/257 | 702/702 | 99 | 1 | ✓ | 0 |
| jpn | ✓ | 250/250 | 711/711 | 97 | 6 | ✓ | 0 |
| kor | ✓ | 208/208 | 645/645 | 86 | 17 | ✓ | 0 |
| nld | ✓ | 248/248 | 643/643 | 96 | 4 | ✓ | 0 |
| por_br | ✓ | 258/258 | 670/670 | 98 | 2 | ✓ | 0 |
| por | ✓ | 257/257 | 661/661 | 98 | 2 | ✓ | 0 |
| ron | ✓ | 262/262 | 677/677 | 100 | 0 | ✓ | 0 |
| spa | ✓ | 249/249 | 686/686 | 98 | 2 | ✓ | 0 |
| spa_mx | ✓ | 259/259 | 680/680 | 100 | 0 | ✓ | 0 |
| swe | ✓ | 248/248 | 643/643 | 98 | 2 | ✓ | 0 |
| zho | ✓ | 204/204 | 584/584 | 74 | 20 | ✓ | 0 |
| **total** | **22/22** | **5,186/5,186** | **14,151/14,151** | **2,013** | **218** | **22/22** | **0** |

Residue is concentrated in **hrv (78)** and **hin (53)** — see the Croatian ruling below; hrv's is
almost entirely one text question, not audio debt.

---

## Why it is genuinely served, not just present in the DB

Pod selection (`servedPod.ts:77-118`) is a two-value slug lookup:
`course_code = ? AND pod_type = 'core' AND slug IN ('pod-1','pod-0')`, pod-1 preferred. There is no
ordering and no visibility filter. Verified live: all 22 pod-1 rows are `pod_type='core'` and
`visibility='live'`, so every course resolves to Pod 1 and none silently drops to pod-0. The 21
retired `pod-1-retired-2026-08-24` rows carry a different slug and are unreachable by the player.

Read with the **anon key** — a real fresh client's credentials — and cross-checked against the
service key. Identical results, so RLS hides nothing. Three courses were closed end-to-end to a
playable URL (fra, zho, gle): HTTP 200, `audio/mpeg`, real bytes.

**One asymmetry worth remembering:** the live player gates on **slug**, the offline bundler gates on
**visibility**. A morning slug-only retirement therefore left downloads shipping both old and new
Pod 1 until commit `1a2c3ad2b` (09:39Z) set the retired pods to `held`. Two different gates on two
different columns for the same question.

---

## Splice vs render — the question from 12:14Z

**It was answered, and the answer was splice.** `docs/pods/splice-margin-census-2026-08-24.md` ran the
unmodified splicer against **138 randomly-sampled turns across all 22 courses**: 138/138 processed,
2 refusals (1.4%), median margin 3.77, **zero cases where the rule cut at the wrong gap**. The splice
then applied to 21 courses (Italian excluded — its 311 sentence clips were already rendered fresh).

**Why splicing works at all:** `generatePodAudio` already inserts a `" … "` pause cue on both the
target and known tracks, precisely so a multi-sentence take stays cleanly splittable. Target-side
voices render that cue as **300–800 ms** of silence, against the known side's 110–200 ms — so the
target side splices *better* than the known side that already shipped successfully.

### Coverage

1,501 turns needed splitting; **1,501 processed, 1,429 linked, 3,596 clips cut, 479 reused, 72
refused, 0 errors**, on identical gates fleet-wide (`margin_floor 1.5, seam_db -35, seam_window 0.03,
min_piece 0.35`).

### The 72 refusals are the gates working

| reason | n | cause |
|---|---:|---|
| `margin_below_floor` | 56 | The chosen gap was under 1.5× the longest rejected gap — a comma pause and a sentence break are statistically the same population, so cutting is a coin toss. |
| `seam_not_silent` | 10 | The cut edge, re-measured at 30 ms, still had audible speech energy. |
| `too_few_gaps` | 6 | The take ran the tokens together with no interior pause at all. |

`min_piece_s` never bound on a single refusal. Every refused turn keeps the whole-turn clip it has
today — **correct audio, exactly as before, just not addressable per sentence**.

### Two later passes deliberately withdrew more splits

- **92 turns — `known-mismatch-unlink` (12:50Z):** the target split into N sentences but the English
  known side didn't, which would show a card with a silent translation slot. **78 of these are
  Croatian** and are one text question, not an audio fault (below). The rest: jpn 6, kor 5, gle 1,
  hin 1, zho 1.
- **3 turns — `zho-misaligned-splice-unlink` (13:45Z):** these passed every audio gate (margins
  1.53/1.59/1.75, all above floor) but whisper proved the cut landed on a **comma**, not a sentence
  end — the pause-cue placement regex is Latin-punctuation-only and never matched `。`. **Margin
  alone could not discriminate these**: two correct zho cuts scored 1.65 and 2.10, straddling the bad
  ones. Only STT caught it. That is the single most useful methodological finding of the day.

### Cost

Measured population: 1,501 turns = 4,289 sentences = **88,175 target characters**. Provider mix from
the live cast: azure 37,694 chars, xai 38,559, mixed 11,922.

Pricing is **repo-documented list rate, not verified against an invoice**: Azure Neural S0
$4/1M chars (`services/audio-generation-planner.cjs:24`); xAI $15/1M chars (`docs/DECISIONS.md:899`).

| route | TTS cost | total cost |
|---|---|---|
| **Splice (taken)** | **£0** | ffmpeg only, ~12 min wall-clock, reuses already-verified already-cast takes |
| Render (cancelled) | ≈ $0.78–0.91 | + casting, generation, make-before-break verification, STT QA — and a *different take* with no prosodic continuity against surrounding whole-turn clips |
| Render just the 75 refusals | ≈ $0.07–0.09 | the only render list that still makes sense |

**The dollar figure is a rounding error either way — that is not what decided it.** Splice won on
*total* cost: no new performance variance, no verification pipeline, no risk of a re-rendered
sentence sitting audibly apart from the whole-turn take around it. Better, simpler, cheaper on all
three legs.

---

## What needs Tom

**1. Croatian "…" — a text ruling, 78 turns.** Croatian Pod 1 uses `…` as a *mid-sentence hesitation*
marker, but the app's boundary regex treats it as sentence-terminal. The audio cut is fine; the
*unit* isn't a sentence. Until this is ruled, those 78 turns stay whole-turn. Options: (a) treat `…`
as non-terminal for hrv and re-splice, (b) rewrite the affected Croatian text to use terminal
punctuation only, (c) leave them whole-turn. **Recommendation: (a)** — it is a boundary-rule fix, it
touches no learner-facing text, and it is the largest single block of residue in the estate.

**2. `gle_for_eng:pod-1:SC12-S010` — one real defect.** Master sentence is
`"A naoi déag. Fiche. Fiche a haon. Dé Céadaoin. Déardaoin."`; the first split clip's stored text is
`"Naoi déag."`, missing the leading `"A "`. Found independently by two workers; it is the only
text-parity failure in 2,014 split turns. The serve-time oracle caught it and fell back to correct
whole-turn audio, so **no learner is harmed today**. Open question a query cannot settle: **does the
clip's audio also drop the "A", or is only the text field wrong?** That needs an ear.

**3. Optional — render the ~75 gate-refused turns**, ≈$0.09. A one-line approval, not a spend
decision. Honest view: roughly half are rapid numeral/colour drills where per-sentence isolation
adds little; the other half are long natural turns that do lose the "click your own sentence"
affordance. **Recommendation: don't** — accept the floor. The gates refused these for good reasons
and a fresh render risks exactly the prosodic mismatch the splice route avoids.

**4. Optional — re-listen to Arabic MSA.** `ara_for_eng` is voiced by `ar-EG-Salma/Shakir`
(Egyptian-accented Azure). **This is already your ruling**, 2026-08-18, after you rejected all four
original candidates ("none sound authentic"); Azure has no dedicated MSA locale and you picked ar-EG
over ar-SA/ar-JO/ar-AE. `ara_eg_for_eng` uses an entirely different pair on a different provider
(xAI `rex`/`eve`), so the two courses do not collide. Nothing needs deciding — the only untested
thing is that nobody has re-heard it since it went live in the player rather than in a sample doc.

---

## Italian is *different*, not ahead or behind

Same 30-speaker/2-voice shape as the other 21. It is the one course where a per-line exception was
carved out, and it is live and coherent clip-for-clip: **4 lines kept** on the second voice
(SC16-S009, SC17-S002, SC17-S009, SC21-S008), **7 reverted** to the learner voice (SC17-S004/S005,
SC21-S005/S006/S011/S012/S013) — the variant-drill rephrasings, where casting the same beat as a
second character makes the pod contradict itself. The generalised rule then found **zero** other
instances fleet-wide. Documented gap that still stands: the cast map lists Staff/Interlocutor as
fully second-voice, because a per-role map cannot express a per-line exception — that lives in the
sentence links.

---

## Explicit gaps — what this audit did not establish

- **No clip was listened to.** Every check here is DB, S3-object, or HTTP-level. The `gle` question
  above is precisely the case where that limit bites.
- **HTTP closure covered 3 courses of 22** (fra, zho, gle) and ran against the **dev** Vercel alias,
  not production. The other 19 were verified at the DB/S3/split-logic layer, which is the same oracle
  the app itself uses — but that is not the same as a fetch.
- **TTS pricing is repo list rate**, not reconciled against a live invoice.
- **Entitlement paths were not tested.** The `/api/audio` fetches used no auth header and returned
  200, consistent with pod-1 being open, but a blocked-entitlement learner was not simulated.
- **`hrv_for_eng` carries two retired generations** (`-08-22` and `-08-24`); the lineage of the older
  one was not chased.
- One measurement bug was made and corrected mid-audit: comparing cast voice ids without stripping
  the `azure_` provider prefix reported 3,691 false off-cast clips. Corrected independently by two
  workers to **0**. Recorded here because the same trap is live in any future voice-match script.

---

*Sources: live Supabase, live S3 (`ssi-audio-stage`), and the committed logs
`docs/pods/*-sentence-splice-2026-08-24-applied-log.json`,
`known-mismatch-unlink-2026-08-24-applied-log.json`,
`zho-misaligned-splice-unlink-2026-08-24-applied-log.json`,
`splice-margin-census-2026-08-24.md`, each independently re-derived from the DB rather than trusted.*
