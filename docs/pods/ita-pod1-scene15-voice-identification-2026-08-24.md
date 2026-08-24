# ita_for_eng Pod 1 scene 15 — voice identification, 2026-08-24

**IDENTIFY ONLY. Nothing was written, no audio generated.**

## Verdict

1. **The repair IS present in the live rows.** Every scene-15 row on `ita_for_eng:pod-1`
   (the `visibility='live'` pod) has `sentence_audio_ids` / `sentence_known_audio_ids` /
   `takeg_audio_ids` = NULL, `updated_at` 2026-08-24T11:12:12Z — the repair run's own stamp.
   The whole-turn clips play, and their text matches the row text on 11/11 rows.
   The retired pod-0's scene-15 arrays are still visible for comparison and are gone from live.
2. **There is exactly ONE female voice ID in play.** All ten Learner lines carry `xai_ara`
   (Ara). Line 11 is the Narrator on `xai_x7avnu1k` (Enzo, male, f0 98.8 Hz). Across the WHOLE
   live pod there are only two target voice ids: `xai_ara`/`ara` (151 rows) and
   `xai_x7avnu1k`/`x7avnu1k` (80 rows). No second female is cast anywhere on the pod.
   → possibility (c) "two different females legitimately cast" is **eliminated by the data**.
3. Bytes were fetched through the production serving path
   `https://saysomethingin.app/api/audio/<id>` (200, audio/mpeg, all 11).
4. Measured on those bytes, the ten Ara lines do NOT sit on one stable pitch: median f0 spans
   **175.8 – 271.2 Hz**, against a same-voice reference pool from scenes 9–11 that spans only
   192.8 – 228.6 Hz. Lines 9 and 10 — Tom's "last two or three" — are the two LOWEST in the
   scene (186.0 and 175.8 Hz), both below the entire reference range.
5. **Instrument limit, stated honestly:** median f0 and a long-term-average-spectrum cosine
   separate speakers by pitch and timbre; they do **not** measure accent. They cannot, on their
   own, prove "this one sounds American". The clips are embedded below so Tom's ear settles
   which lines are the rubbish ones — that is the missing evidence, and it is his call, not a
   measurement.

## Per-line table (live rows, production bytes)

| # | speaker | target text | clip id | DB voice_id | text matches row | median f0 | dur |
|---|---------|-------------|---------|-------------|------------------|-----------|-----|
| 1 | Learner | Quanto costa? | `3dacb8c6-28af-47e8-8fac-ff1cc37153bd` | xai_ara | yes | 271.2 Hz | 1.10 s |
| 2 | Learner | Può dirmi quanto costa? | `44f61b15-3afd-466d-82b4-f92b38bcbffa` | xai_ara | yes | 216.2 Hz | 1.73 s |
| 3 | Learner | Quanto costa un taxi per andare in centro? | `da55642b-5acb-45d0-80d9-315643019f4d` | xai_ara | yes | 183.9 Hz | 2.86 s |
| 4 | Learner | Quanto costa un autobus per andare in centro? | `04a67b80-a06a-4417-9450-1ae065eae150` | xai_ara | yes | 205.1 Hz | 2.93 s |
| 5 | Learner | Dove possiamo prendere l'autobus? | `45791332-c798-4d91-b9ea-1f6bc582ee6e` | xai_ara | yes | 200.0 Hz | 2.26 s |
| 6 | Learner | Dove possiamo prendere un taxi? | `75c1c77b-9eeb-48d6-b2c1-a80fa76f852c` | xai_ara | yes | 210.5 Hz | 2.14 s |
| 7 | Learner | Quattro biglietti di sola andata per il centro, grazie. | `4a10d96a-d44f-4851-86d4-bee084e38535` | xai_ara | yes | 219.2 Hz | 3.34 s |
| 8 | Learner | Due biglietti di andata e ritorno per il centro, grazie. | `13f62ca9-77b4-42c4-8c28-8f9ebd8a0b10` | xai_ara | yes | 210.5 Hz | 3.58 s |
| 9 | Learner | Preferisco provare a parlare la tua lingua, penso sia educato. | `9b8575ae-5545-4437-9fd3-a9136552a13c` | xai_ara | yes | 186.0 Hz | 4.10 s |
| 10 | Learner | Mi dispiace, non riesco a parlare molto velocemente. | `46bf25a1-ad00-47fe-894a-0ad85d6c912f` | xai_ara | yes | 175.8 Hz | 3.24 s |
| 11 | Narrator | 100.000. 60. 70. L'una. Le 11. | `0a0b8c5b-46a4-4aaa-a37d-909be010c07b` | xai_x7avnu1k | ellipses only | 98.8 Hz | 6.52 s |

All ten Ara clips were rendered in one batch, 2026-08-22 12:43–12:47Z.

## Listen — the ten Learner lines in scene order

1. Quanto costa?

https://ssi-learning-app.vercel.app/api/audio/3dacb8c6-28af-47e8-8fac-ff1cc37153bd?f=.mp3

2. Può dirmi quanto costa?

https://ssi-learning-app.vercel.app/api/audio/44f61b15-3afd-466d-82b4-f92b38bcbffa?f=.mp3

3. Quanto costa un taxi per andare in centro?

https://ssi-learning-app.vercel.app/api/audio/da55642b-5acb-45d0-80d9-315643019f4d?f=.mp3

4. Quanto costa un autobus per andare in centro?

https://ssi-learning-app.vercel.app/api/audio/04a67b80-a06a-4417-9450-1ae065eae150?f=.mp3

5. Dove possiamo prendere l'autobus?

https://ssi-learning-app.vercel.app/api/audio/45791332-c798-4d91-b9ea-1f6bc582ee6e?f=.mp3

6. Dove possiamo prendere un taxi?

https://ssi-learning-app.vercel.app/api/audio/75c1c77b-9eeb-48d6-b2c1-a80fa76f852c?f=.mp3

7. Quattro biglietti di sola andata per il centro, grazie.

https://ssi-learning-app.vercel.app/api/audio/4a10d96a-d44f-4851-86d4-bee084e38535?f=.mp3

8. Due biglietti di andata e ritorno per il centro, grazie.

https://ssi-learning-app.vercel.app/api/audio/13f62ca9-77b4-42c4-8c28-8f9ebd8a0b10?f=.mp3

9. Preferisco provare a parlare la tua lingua, penso sia educato.

https://ssi-learning-app.vercel.app/api/audio/9b8575ae-5545-4437-9fd3-a9136552a13c?f=.mp3

10. Mi dispiace, non riesco a parlare molto velocemente.

https://ssi-learning-app.vercel.app/api/audio/46bf25a1-ad00-47fe-894a-0ad85d6c912f?f=.mp3

## Which of the four possibilities survives

- **(a) cached pre-repair bundle** — possible for the *app*, but it does not explain what Tom
  describes. Pre-repair, scene 15 rows 1,2,3,5,6,7,8,9,10,11 ALL carried pod-0 split arrays
  voiced by **Eve**; only row 4 lacked them. A cached bundle would therefore play Eve on nearly
  every line and would also SHOW pod-0's text ("Le dispiacerebbe se provassi a praticare
  l'italiano con lei?…"), not the "Quanto costa?" drill Tom heard. A hard refresh is still
  worth doing to rule it out, but it does not fit the symptom.
- **(b) repair missed rows** — **ruled out.** 11/11 scene-15 rows have all three split arrays
  NULL, live, right now.
- **(c) two different female voice IDs cast in the scene** — **ruled out.** One female voice ID
  on the whole pod.
- **(d) one voice ID, non-deterministic renders** — **the surviving explanation.** Voice ID
  **`xai_ara`** (xAI, name "Ara"), the Italian female on `ita_for_eng` Pod 1. Same ID, same
  render batch, pitch spread 175.8–271.2 Hz where the same voice elsewhere on the pod holds
  192.8–228.6 Hz. If Tom's ear says lines 9 and 10 are the rubbish ones, that lands exactly on
  the two clips that sit furthest below the voice's own reference band.

## Gaps

- Accent was not measured, only pitch and spectral timbre. The "Italian vs American" judgment
  needs Tom's ear on the ten clips above.
- The pairwise LTAS cosines do not split the ten into two clean clusters (0.74–0.98, a
  continuum), so the measurement supports "unstable single voice" and cannot support
  "two distinct speakers" — which is consistent with (d), not with (c).
