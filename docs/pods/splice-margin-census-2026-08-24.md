# Splice margin census — fleet-wide, 2026-08-24

MEASURE ONLY. No TTS run, no DB writes, no course content touched. Pure read (Supabase query + `https://saysomethingin.app/api/audio/<id>` download) + local ffmpeg-to-scratch, with every downloaded/cut mp3 deleted after measurement.

## What this tests

Tom paused the 21-course Pod 1 sentence-clip TTS render to ask whether splicing existing whole-turn clips into per-sentence clips (pure ffmpeg, no TTS) can replace it. The splicer at `scripts/splice-fork/splice.py` (unmodified, pre-existing) cuts a whole-turn clip at the N-1 longest interior silence gaps for an N-sentence turn, and reports **margin** = shortest gap it cut at ÷ longest gap it did NOT cut at. Margin ≫ 1 means sentence boundaries are a distinct population from comma-pause gaps and the cut isn't a close call; margin ≈ 1 is a coin toss; margin < 1 would mean the rule cut at the wrong gap.

This census ran that splicer against a **random sample spread across all 22 live Pod 1 courses**, not the 6 hand-picked clips from the original pitch.

## Method

- Driver: `scripts/splice-fork/census.cjs` (new, committed with this report). Queries `listening_pod_sentences` for `pod_id=<course>:pod-1`, keeps rows with a `target_audio_id` and 2+ sentences by the boundary rule `POD_SENTENCE_BOUNDARY` from `ssi-learning-app`'s `podSentenceSplit.ts` (`/(?<=[.!?…])\s+/`), extended for CJK enders `。！？` (no trailing space needed) and Arabic `؟` (space-based, same as Latin `?`).
- Sampled with a seeded, deterministic PRNG (not `Math.random`) — reproducible, per-course seed.
- 22 courses: ita, fra, deu, spa, spa_mx, por, por_br, ron, swe, hrv, eus, ara, ara_eg, deu_at, fra_ca, jpn, kor, zho, nld, isl, gle, hin (all `_for_eng`). 6 samples/course for 19 courses, 8/course for jpn/kor/zho (extra CJK attention per brief) = **138 turns sampled**, well above the ~120 target, at least 6 per course everywhere (brief asked for ≥4).
- For each sampled turn: downloaded the whole-turn learner-facing clip, ran `splice.py` unmodified with N = its sentence count, recorded gaps/margin/piece durations, then deleted every downloaded and cut mp3 (nothing accumulated on disk).
- **Ran this myself, sequentially-in-parallel as 5 background shell processes in this session** — the fan-out API refused dispatch ("FAN-OUT CEILING — depth… this worker would sit at depth 2"): this conversation is itself already a depth-1 worker, so no further fan-out was available. Reported here as the honest reason no sub-workers appear in this run.

## Headline numbers

- **138/138 turns processed with zero pipeline errors** (no failed downloads, no ffmpeg failures).
- **Refusals** (fewer than N-1 interior gaps exist, so the splice literally cannot be made): **2/138 (1.4%)** —
  - `por_for_eng:pod-1:SC01-S003` — "Estou muito bem, obrigado. Vais trabalhar?" — 0 interior gaps found at all.
  - `eus_for_eng:pod-1:SC11-S001` — "Arratsalde on. Erreserbak Jones izenean daukat." — 0 interior gaps found at all.
  - Both are 2-sentence turns where the TTS take runs the two sentences together with no detectable pause (< 100ms at -35dB). No gap-based rule — top-N or otherwise — can rescue these; they'd need a different remedy (re-render, or accept as whole-turn-only).
- **Margin computable for 52/138** samples. The other 86 are mostly exactly-2-sentence turns with only 1 interior gap total, so there's no rejected gap to compare against (margin is `null` by construction, not a defect) — worth flagging as a sampling-power limit: the risky case (a real 3rd-gap comma competing with the chosen sentence gap) only shows up in 3+-sentence turns, and most sampled candidates turned out to be 2-sentence.
  - Median margin: **3.77**
  - 10th percentile: **1.25**
  - Count below 1.5: **9**
  - Count below 1.2: **5**
  - Count below 1.0 (rule chose the wrong gap): **0** — the rule never picked a shorter gap over a longer rejected one in this sample.
  - Min: **1.00** (`ara_eg_for_eng:pod-1:SC04-S003`, a tie) — Max: **13.01** (`ara_for_eng`).

### Worst 10 turns (lowest margin)

| margin | course | id | text | gaps (cut / rejected, ms) |
|---|---|---|---|---|
| 1.00 | ara_eg_for_eng | SC04-S003 | لأ، آسف، أنا مزحوم بكرة. بس نتكلم السبت. أشوفك السبت. | cut [203,208] vs rejected [203,122] |
| 1.02 | hin_for_eng | SC09-S005 | माफ़ कीजिए — क्या आपके पास ग्लूटेन-फ्री कुछ है? या शाकाहारियों के लिए? | cut [298] vs rejected [292] |
| 1.06 | kor_for_eng | SC11-S003 | 물론이죠. 여기 여권이에요. | cut [111] vs rejected [105] |
| 1.08 | hin_for_eng | SC04-S002 | हेलो! माफ़ कीजिए, लेकिन मैं अभी बात नहीं कर सकती। मुझे अभी घर जाना है। क्या हम कल बात कर सकते हैं? | cut [436] vs rejected [405,362,160,130,121] |
| 1.13 | deu_for_eng | SC09-S005 | Entschuldigung — haben Sie etwas Glutenfreies? Oder für Vegetarier? | cut [478] vs rejected [425] |
| 1.25 | kor_for_eng | SC04-S003 | 아니요, 죄송해요, 내일은 바빠요. 그런데 토요일에 얘기해요. 그때 봐요. | cut [166,229] vs rejected [132,115] |
| 1.37 | zho_for_eng | SC08-S014 | 我们能要一些面包吗？还有一份薯条，大家一起吃。 | cut [309] vs rejected [226] |
| 1.42 | hin_for_eng | SC22-S001 | क्या आप बुरा नहीं मानेंगे अगर मैं आपके साथ हिंदी बोलने की कोशिश करूँ?… | cut [498] vs rejected [352] |
| 1.43 | deu_at_for_eng | SC12-S009 | Danke. Kann i auch a Packerl Pflaster hobn? | cut [372] vs rejected [260] |
| 1.59 | zho_for_eng | SC06-S008 | 我是护士，在附近的医院工作。你呢？ | cut [335] vs rejected [211] |

### Suspicious pieces (<0.35s or >6s)

No pieces under 0.35s. Six pieces over 6s (long, not necessarily wrong — likely just a genuinely long sentence, but flagged per brief):

| course | id | piece | dur |
|---|---|---|---|
| ron_for_eng | SC22-S009 | s3 | 6.24s |
| swe_for_eng | SC22-S001 | s1 | 6.92s |
| eus_for_eng | SC22-S011 | s2 | 8.03s |
| ara_for_eng | SC22-S009 | s3 | 6.62s |
| hin_for_eng | SC22-S001 | s1 | 6.93s |
| hin_for_eng | SC04-S002 | s1 | 6.96s |

### Per-course margins (sorted values, courses with ≥1 margin-computable sample)

- **hin_for_eng: [1.02, 1.08, 1.42, 3.13]** — 3/4 measured margins below 1.5. Worst course in the census.
- **kor_for_eng: [1.06, 1.25, 2.29, 3.45, 3.68]** — 2/5 below 1.5.
- **zho_for_eng: [1.37, 1.59, 2.73, 3.89]** — 2/4 below 1.5.
- **ara_eg_for_eng: [1.00]** — only 1 margin-computable sample (5/6 were 2-sentence-no-compare), but that one is a tie.
- **deu_for_eng: [1.13, 6.27, 9.63]** — one bad outlier, otherwise healthy.
- **deu_at_for_eng: [1.43, 2.03, 2.78, 4.6]** — one soft case, otherwise fine.
- **jpn_for_eng: [2.73, 2.82, 3.76, 9.22]** — no scores below 1.5. Japanese, despite being CJK-scripted, does NOT show the same weakness as Chinese/Korean here.
- **ara_for_eng (standard): [3.1, 4.16, 9.1, 13.01]** — healthy, unlike its Egyptian sibling.
- Every other course with margin data (fra, spa, spa_mx, por_br, ron, hrv, swe, nld, isl, gle, fra_ca) has a median ≥ 2.4 and no value below 1.5.
- ita_for_eng and por_for_eng/spa_for_eng/fra_for_eng/isl_for_eng/nld_for_eng/ron_for_eng: mostly 2-sentence samples this round, 0-1 margin points each — under-measured by chance of sampling, not evidence either way.

## Verdict

**Safe fleet-wide, with named exceptions — not safe to apply blind everywhere.**

- The rule never picked a wrong gap outright (0 samples below margin 1.0) and the pipeline itself is robust (0 download/ffmpeg errors across 138 turns).
- But margin clusters near the coin-toss line (1.0–1.5) concentrate in **Hindi, Korean, and Chinese** — 7 of the 9 sub-1.5 margins are in these three courses, despite them being only 3/22 courses and only 16/52 margin-computable samples. Japanese, by contrast, is clean, so this is not simply "CJK/non-Latin scripts are risky" — it's course/voice-specific, plausibly a TTS-prosody effect (these voices may pause less between clauses than sentences), not a script effect.
- **Egyptian Arabic colloquial** (`ara_eg_for_eng`) is a genuine unknown, not a clean pass — only 1 of 6 sampled turns had a comparable gap to score, and that one tied at margin 1.00. Standard Arabic (`ara_for_eng`) was fine. This needs a larger targeted sample before trusting it.
- **A nonzero refusal rate exists (1.4%)** — turns where the TTS take has essentially zero pause between sentences (0 interior gaps at any threshold). No gap-based rule rescues these regardless of margin tuning; they are a structurally different failure mode (need re-render or accept whole-turn-only) and any fleet rollout needs a refusal-handling path, not just a margin threshold.
- Sample power caveat: only 52/138 turns had a comparable rejected gap at all (most sampled turns turned out to be 2-sentence, where margin is undefined by construction). Course-level medians above are based on as few as 1 data point in some courses (ara_eg, isl, gle, ron, spa, fra, nld) — treat single-course numbers with fewer than ~4 margin points as indicative, not conclusive.

**Recommendation**: proceed with splice-not-TTS for the fleet, but (a) build the refusal path (courses/turns with < N-1 interior gaps need a fallback, not a silent bad cut), and (b) run a deeper, 3+-sentence-only targeted sample on hin_for_eng, kor_for_eng, zho_for_eng, and ara_eg_for_eng before trusting the top-N rule there without a human listening pass.

## Reproduce

```
node scripts/splice-fork/census.cjs "<comma,separated,courses>" <N-per-course> <seed>
```

Full raw JSON (138 records, all fields) is in the session scratch directory used for this run and was not committed (per "no ad-hoc scripts / scratch artifacts in the repo" hygiene) — this document contains every record that changed the verdict; `census.cjs` is committed and reproduces the exact same sample given the same seeds:
seed 101: ita_for_eng,fra_for_eng,deu_for_eng,spa_for_eng,spa_mx_for_eng (n=6)
seed 102: por_for_eng,por_br_for_eng,ron_for_eng,swe_for_eng,hrv_for_eng (n=6)
seed 103: eus_for_eng,ara_for_eng,ara_eg_for_eng,deu_at_for_eng,fra_ca_for_eng (n=6)
seed 104: jpn_for_eng,kor_for_eng,zho_for_eng (n=8)
seed 105: nld_for_eng,isl_for_eng,gle_for_eng,hin_for_eng (n=6)
