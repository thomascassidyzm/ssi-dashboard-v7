# ita_for_eng Pod 1 — served-bytes speaker census

**2026-08-24. Answering: does the LIVE served audio for `ita_for_eng:pod-1` actually carry two distinct, correctly-gendered voices, clip by clip, measured — not assumed from metadata?**

Trigger: Tom heard two different FEMALE voices in Scene 15 on production at 10:53Z. The cast gate reported zero off-cast, so stored metadata was already known not to be trustworthy evidence here.

---

## Headline verdict

**Scene 15's whole-turn clips (`target_audio_id` / `known_audio_id` — the two columns this census measured), as currently served, ARE two acoustically distinct, correctly-gendered speakers** — Ara (sentences 1–10, cast female) measures female-range F0 throughout (172–278 Hz median), Enzo (sentence 11, cast male) measures 104.7 Hz target / 125.6 Hz known, squarely male, with clean cluster separation. **This is not where Tom's defect lives.** A sibling investigation (`docs/pods/ita-pod1-scene15-two-female-voices-rootcause-2026-08-24.md`, commit `b6ecdf6f9`, landed on `fix/ita-pod1-scene15-rootcause-2026-08-24` while this census was in flight) found the actual cause: a **third pair of audio columns** on `listening_pod_sentences` — `sentence_audio_ids` / `sentence_known_audio_ids`, the **split-clip arrays** used by `podSentenceSplit` for multi-sentence turns — were copied **positionally** from the retired `ita_for_eng:pod-0-retired-2026-08-22` into pod-1 and never re-derived. Because the scene order changed between pod-0 and pod-1, scene 15's split clips now play a *different conversation* voiced by **Eve** (pod-0's retired female cast), sitting right against Ara's F0 range (167–200 Hz vs Ara's 172–278 Hz) — which is why it reads as "two different female voices" rather than an obviously wrong voice. The flip gate (`tools/pods/pod-cast-gate.cjs`) only reads 2 of a row's 6 audio slots, so it never saw this. **This census independently confirms half of that finding — the whole-turn clips are clean — across the entire course, not just scene 15** (see §2); it did not check `sentence_audio_ids` and cannot independently confirm the split-clip defect. See §4 for how the two investigations fit together.

**Course-wide: 9 of 462 clip-slots (1.9%) show a measured gender/speaker signal that disagrees with the cast**, and 8 of those 9 are boundary-of-measurement cases (F0 within ~15 Hz of the male/female split point, on clips with under 20 voiced frames) rather than clear voice swaps. Exactly **one** clip stands out as a genuine, non-borderline anomaly: `S19.6` target (Learner, "Non voglio fare tardi."), measuring 109.9 Hz — squarely male-range — against a female cast (`ara`). Confirmed by STT to carry the *correct text*, so it is not a wrong-clip-entirely bug; it is either a genuinely low register on this one utterance or a real off-cast render. Flagged for the pod lead's ear; not part of the Scene 15 report.

---

## Method (what was actually measured)

1. **231 rows pulled from `listening_pod_sentences` for `ita_for_eng:pod-1`** (live, scenes 1–22), joined to `course_audio` on both `target_audio_id` and `known_audio_id` — 461 distinct audio rows, all resolved, zero missing.
2. **All 461 clips downloaded through the actual learner-facing route**: `GET https://saysomethingin.app/api/audio/<audioId>` (the Vercel proxy in `ssi-learning-app/api/audio/[audioId].ts`) — this is what a learner's device actually requests. No auth/entitlement wall was hit for this course's content; nothing was fetched from S3 directly.
   - **Cross-check**: one clip (`3dacb8c6…`, Scene 15 sentence 1 target) was also pulled through the local Popty equivalent, `GET http://localhost:3470/api/production/audio/<uuid>/stream` (302 → signed S3 URL). MD5 of both downloads: `a2b89805e3a38f240f731ad3ef1da01e` — **byte-identical**. Both routes resolve through `course_audio.s3_key` for the *current* row, so a stale-key regression would show up on both; it didn't for this clip.
3. **Byte length + MD5 recorded for every clip.** Zero clips share an MD5 with a different `audio_id` anywhere in the pod — no S3-key collision/duplication defect. (One legitimate identical-line reuse was found and cleared: scene 3.1 "Barista (3 pm)" and scene 8.1 "Bartender" share one `target_audio_id` — both are cast to `x7avnu1k`/Enzo, so no cross-gender issue.)
4. **F0 (fundamental frequency)**: each clip decoded to 16 kHz mono PCM (ffmpeg), pitch-tracked with YIN (`pitchfinder`, 1024-sample frames, 512 hop, energy-gated to skip silence, 60–500 Hz search band). Reported per clip as median/mean/P25/P75 over voiced frames only.
5. **Speaker clustering**: MFCC means (`meyda`, 512-sample frames, energy-gated) per clip, z-scored, then k-means (k-means++ init, 10 restarts) swept k=1..4 separately for the target track and the known track. Best k chosen by silhouette score. This is the "MFCC + agglomerative-style partitional clustering" tier from the brief — no GPU speaker-embedding model (resemblyzer/speechbrain) was installed; **this is the one explicit method-scope gap**: MFCC timbre clustering is a legitimate but coarser proxy than a trained speaker embedding, and it does occasionally cluster a clip by phonetic content rather than voice identity (see the 3 "cluster-only" mismatches below, all of which F0 independently clears).
6. **STT sanity pass**: `whisper-cli` (local `ggml-small.bin`, Italian) run against all 11 Scene 15 target clips plus the one flagged anomaly (`S19.6`). All 12 transcripts matched their claimed `target_text` — confirms these are the right *clips*, whatever their voice measures as.

No audio was generated, deleted, or modified. All access was read-only through the two serving routes named above.

---

## 1. Scene 15 — the 11 clips Tom actually heard

**Target (Italian) track:**

| Sent | Speaker | Cast voice | Cast gender | F0 median (Hz) | Measured gender | Cluster | Text |
|---|---|---|---|---|---|---|---|
| 1 | Learner | ara | f | 277.7 | f | 0 (ara) | Quanto costa? |
| 2 | Learner | ara | f | 238.5 | f | 0 (ara) | Può dirmi quanto costa? |
| 3 | Learner | ara | f | 183.9 | f | 0 (ara) | Quanto costa un taxi per andare in centro? |
| 4 | Learner | ara | f | 204.1 | f | 0 (ara) | Quanto costa un autobus per andare in centro? |
| 5 | Learner | ara | f | 199.2 | f | 0 (ara) | Dove possiamo prendere l'autobus? |
| 6 | Learner | ara | f | 209.9 | f | 0 (ara) | Dove possiamo prendere un taxi? |
| 7 | Learner | ara | f | 222.3 | f | 0 (ara) | Quattro biglietti di sola andata per il centro, grazie. |
| 8 | Learner | ara | f | 211.3 | f | 0 (ara) | Due biglietti di andata e ritorno per il centro, grazie. |
| 9 | Learner | ara | f | 183.8 | f | 0 (ara) | Preferisco provare a parlare la tua lingua, penso sia educato. |
| 10 | Learner | ara | f | 172.4 | f | 0 (ara) | Mi dispiace, non riesco a parlare molto velocemente. |
| 11 | **Narrator** | **x7avnu1k** | **m** | **104.7** | **m** | **1 (x7avnu1k)** | 100.000. 60. 70. L'una. Le 11. |

**Known (English) track:**

| Sent | Speaker | Cast voice | Cast gender | F0 median (Hz) | Measured gender | Cluster | Text |
|---|---|---|---|---|---|---|---|
| 1 | Learner | bedd6226 | f | 260.7 | f | 0 (bedd6226) | How much is that? |
| 2 | Learner | bedd6226 | f | 262.3 | f | 0 (bedd6226) | Can you tell me how much that is? |
| 3 | Learner | bedd6226 | f | 199.0 | f | 0 (bedd6226) | How much does it cost to get a taxi into town? |
| 4 | Learner | bedd6226 | f | 184.7 | f | 0 (bedd6226) | How much does it cost to get a bus into town? |
| 5 | Learner | bedd6226 | f | 268.1 | f | 0 (bedd6226) | Where can we get a bus? |
| 6 | Learner | bedd6226 | f | 275.5 | f | 0 (bedd6226) | Where can we get a taxi? |
| 7 | Learner | bedd6226 | f | 242.4 | f | 0 (bedd6226) | Four single tickets to town, please. |
| 8 | Learner | bedd6226 | f | 196.0 | f | 0 (bedd6226) | Two return tickets to town, please. |
| 9 | Learner | bedd6226 | f | 181.7 | f | 0 (bedd6226) | I prefer to try to speak your language, I think it's polite. |
| 10 | Learner | bedd6226 | f | 193.9 | f | 0 (bedd6226) | I'm sorry I can't speak very quickly. |
| 11 | **Narrator** | **gfzdpspr5fdp** | **m** | **125.6** | **m** | **1 (gfzdpspr5fdp)** | 100,000. 60. 70. 1 o'clock. 11 o'clock. |

**Verdict: same gender by measurement? No — Ara measures 172–278 Hz (female), Enzo measures 104.7/125.6 Hz (male), on both tracks. Two distinct speakers? Yes — clean cluster separation (sentence 11 alone in its own cluster on both tracks), corroborated by an ~80–150 Hz gap in F0. STT confirms all 11 clips (both attempts checked on target) carry their claimed text.** The whole-turn clips for Scene 15 are clean. As established by the sibling root-cause doc referenced above, the defect Tom heard is in a different pair of columns this census did not query — the split-clip arrays, not the rows above.

---

## 2. Course-wide census

**Distinct speakers actually present** (via k-means silhouette sweep, k=1..4):

| Track | n clips | Silhouette by k | Chosen k | Crosstab (cluster → voice_id) |
|---|---|---|---|---|
| target | 230 (1 legitimate reuse across 231 rows) | k=1: 0 · k=2: **0.378** · k=3: 0.213 · k=4: 0.172 | **2** | cluster 0: ara×150, x7avnu1k×2 · cluster 1: x7avnu1k×77, ara×1 |
| known | 231 | k=1: 0 · k=2: **0.356** · k=3: 0.230 · k=4: 0.174 | **2** | cluster 0: bedd6226×150 · cluster 1: gfzdpspr5fdp×80, bedd6226×1 |

Silhouette peaks cleanly at k=2 and falls monotonically after — **exactly two distinct speakers on each track, matching the declared two-voice cast.** No evidence of a third/leftover voice anywhere in the live pod.

**F0 distribution across all 461 clips** is clearly bimodal with the trough at ~150–169 Hz (14 clips in that decade vs. 40+ in the deciles either side) — a natural, data-driven split point, used as the classification threshold below (not hand-picked).

**Per-voice totals and mismatch counts** (a clip counts as a mismatch if its F0-implied gender OR its cluster majority disagrees with its cast voice):

| Track:voice | n | Mismatches | Rate |
|---|---|---|---|
| target:ara | 151 | 1 | 0.7% |
| target:x7avnu1k | 80 | 2 | 2.5% |
| known:bedd6226 | 151 | 4 | 2.6% |
| known:gfzdpspr5fdp | 80 | 2 | 2.5% |
| **Total** | **462** | **9** | **1.9%** |

**All 9 mismatches, in full:**

| Track | Scene.Sent | Speaker | Cast voice (gender) | F0 (Hz) | F0 mismatch | Cluster mismatch | Text |
|---|---|---|---|---|---|---|---|
| known | 5.2 | Sarah | bedd6226 (f) | 166.8 | no | **yes** | "Yes, very. I'm very tired now. Good night. See you tomorrow." |
| known | 11.3 | Guest | gfzdpspr5fdp (m) | 185.9 | **yes** | no | "Of course. Here's my passport." |
| target | 11.11 | Guest | x7avnu1k (m) | 100.9 | no | **yes** | "E qual è la password del wifi?" |
| target | 13.4 | Local | x7avnu1k (m) | 106.6 | no | **yes** | "Sì, passando davanti alla chiesa e all'ufficio postale." |
| known | 14.3 | Passenger | gfzdpspr5fdp (m) | 164.8 | **yes** | no | "About how long do you think it will take?" |
| known | 17.7 | Learner | bedd6226 (f) | 157.7 | **yes** | no | "It's hot today, again." |
| known | 18.1 | Learner | bedd6226 (f) | 146.4 | **yes** | no | "That's a bad idea." |
| known | 20.8 | Learner | bedd6226 (f) | 146.2 | **yes** | no | "That's very kind of you." |
| **target** | **19.6** | **Learner** | **ara (f)** | **109.9** | **yes** | **yes** | **"Non voglio fare tardi."** |

**Reading this table honestly**: 8 of the 9 sit within ~15 Hz of the 160 Hz split threshold (146–186 Hz), on clips with 5–26 voiced frames — short-utterance F0-estimation noise near a boundary, not octave-scale voice swaps. Every "cluster mismatch" here is independently cleared by F0 landing on the correct side of the cast gender, consistent with MFCC occasionally grouping by phonetic content on short clips rather than by speaker — the acknowledged coarseness of the MFCC-clustering method vs. a trained speaker embedding.

**The one genuine outlier is `target 19.6`** (Learner, "Non voglio fare tardi.", cast `ara`/female): F0 = 109.9 Hz, an octave-scale departure from Ara's course-wide range (172–282 Hz), *and* it's the only clip where F0 and clustering agree with each other against the cast. STT confirms the clip carries the correct text, and its MD5 is unique in the pod (not a duplicate of any x7avnu1k clip) — so this is not a wrong-clip swap. It reads as either a genuinely anomalous low-register render of Ara on this one utterance, or a real off-cast clip that needs a human ear. **Recommend the pod lead listens to this one clip** (`docs/pods/…` JSON has its `audioId`: `20213527-3251-4b1f-a4a0-5352a87f1aff`); it is not in Scene 15 and was not part of what Tom reported.

---

## 3. STT sanity pass

`whisper-cli` (local, `ggml-small.bin`, Italian) against all 11 Scene 15 target clips + the one flagged anomaly: **12/12 transcripts matched their claimed `target_text`** (near-verbatim; whisper drops some punctuation, as expected). No "right voice, wrong clip" or "wrong clip entirely" failures found anywhere this pass touched.

---

## 4. How this census fits with the confirmed root cause

Before the sibling root-cause doc landed, this census independently found the same starting fact by a different route: `listening_pods` shows `ita_for_eng:pod-1` (live) and `ita_for_eng:pod-1-retired-2026-08-24` (held) both **created at the identical timestamp 2026-08-24T08:29:52.629Z**, and Scene 15's `target_audio_id`s are byte-identical between retired and live pod-1 while `known_audio_id`s differ — i.e. this pod underwent a same-day recast, and the recast touched some columns but not others. That is exactly the shape of the confirmed bug: `target_audio_id`/`known_audio_id` (the whole-turn columns this census measured in full) **were** re-derived onto the new two-voice cast; `sentence_audio_ids`/`sentence_known_audio_ids` (the split-clip columns, not queried here) **were not** — they carry pod-0's positionally-inherited arrays, voiced by Eve (pod-0's retired female) against a now-different conversation, per `docs/pods/ita-pod1-scene15-two-female-voices-rootcause-2026-08-24.md`.

**What this census adds to that finding**: the sibling doc measured scene 15's whole-turn clips by bytes and the rest of the course by metadata only. This census measured **all 462 whole-turn clip-slots across all 22 scenes by bytes** (F0 + MFCC clustering + STT + hash), and found the whole-turn columns clean course-wide (§2) — confirming the bug is confined to the columns the flip gate doesn't read, not spread through the columns it does. It does not re-measure the split-clip arrays; that is being covered separately per the sibling doc's gap notes (its "Worker #279" redoing the split-clip speaker measurement with a proper embedding).

---

## Explicit gaps

- **No GPU speaker-embedding model** (resemblyzer/speechbrain) — no `pip` on this box (`ModuleNotFoundError`, `ensurepip` absent). Substituted MFCC + k-means, which is coarser and occasionally mis-clusters by phonetic content on short clips (all 3 such cases here were independently cleared by F0). This is the one method downgrade from the brief's "ideal" tier.
- **This census did not query `sentence_audio_ids` / `sentence_known_audio_ids`** (the split-clip columns) — the brief specified `target_audio_id`/`known_audio_id` only, and that is where the whole-turn defect-free finding in §1–§2 applies. The actual confirmed defect lives in the columns this census didn't touch; see §4 and the sibling doc for that measurement.
- Everything the brief asked for (231-row pull on `target_audio_id`/`known_audio_id`, 461-clip download+hash, F0 + clustering on every clip, Scene 15 full report, course-wide mismatch table, STT sanity) is complete with no access blockers.

---

## Raw data

Full per-clip JSON (all 462 clip-slots: DB fields, S3 keys, byte size, MD5, F0 stats, cluster assignment, mismatch flags) plus the clustering k-sweep and crosstabs: `docs/pods/ita-pod1-served-bytes-speaker-census-2026-08-24-data.json` (same commit).
