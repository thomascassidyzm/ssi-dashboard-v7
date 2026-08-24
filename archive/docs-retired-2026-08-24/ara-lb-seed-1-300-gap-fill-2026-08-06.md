# ara_lb_for_eng — the 12 audio gaps inside seeds 1–300 are filled

**2026-08-06. 32 clips generated, $0.013, nothing deleted. The whole shipped zone — all 638
rounds, 14,231 items — now delivers.**

Follows `docs/ara-lb-audio-reconciliation-2026-08-06.md` (commit `577b3111`), which found these 12
and did not touch them. Pre-approved by Tom, standing in for Kai. Scope was exactly the 12 named
rows; nothing outside them was generated.

---

## Result

| | Before | After |
|---|---|---|
| Phrases with a missing audio slot, seeds 1–300 | 12 | **0** |
| Empty slots across those phrases | 32 | **0** |
| Rounds 500–519 (Tom's screenshot) | 450/452 with audio, 2 undeliverable | **452/452, 0 undeliverable** |
| Shipped zone, rounds 1–638, via the round generator | not measured before | **14,231/14,231 items deliver, 0 flagged** |
| `course_audio` rows deleted | — | **0** |

32 clips: 12 known (`azure_en-GB-SoniaNeural`), 10 target1 (`azure_ar-LB-LaylaNeural`),
10 target2 (`azure_ar-LB-RamiNeural`). Two of the twelve — S65L1 and S164L1 — needed the English
clip only; their Arabic slots were bound for free by the concurrent link pass while this ran.

**Cost.** 705 characters stored + 92 characters of diagnostic probe renders that were never stored
= 797 characters, Azure neural at $16/1M = **$0.0128**. 100.3 seconds of new audio.

---

## The twelve, each verified twice

Verification is two independent checks per slot: (1) an **unprimed whisper decode** of the actual
S3 bytes against the expected text (`services/audio-veracity.cjs` — the same gate the bulk
`/generate` path runs), and (2) the **round generator itself**, `GET /learning-journey`, which is
the path the Script Viewer and the player read.

| Seed / phrase | Roles filled | Acoustic check | Round |
|---|---|---|---|
| S65L1 "It's important" | known | CER 0 | 169 |
| S164L1 "A book" | known | CER 0 | 385 |
| S182L1 "I saw your car" | all 3 | CER 0 / 0.10 / 0.10 | 413 |
| S205L1 "I forgot the subject" | all 3 | CER 0 / 0 / 0 | 462 |
| S216L2 "I saw some friends on the bus" | all 3 | CER 0 / 0.23 / 0.18 | 487 |
| S216L2 "I saw some friends at the pub" | all 3 | CER 0 / 0 / 0.18 | 487 |
| **S223L1 "he'll ask you questions"** | all 3 | CER 0 / 0 / 0 | **500 + review 508** |
| S234L2 "he works with your brother in an office" | all 3 | CER 0 / **0.35** / 0.10 | 521 |
| S239L2 "she likes to read this book" | all 3 | CER 0 / 0.12 / 0.18 | 531 |
| S289L2 "she's going to be there early next week" | all 3 | CER 0 / 0.09 / 0.09 | 622 |
| S293L2 "he's going to meet me tomorrow afternoon" | all 3 | CER 0 / **0.37** / 0.11 | 630 |
| S293L2 "he's going to meet me next year" | all 3 | CER 0 / 0.12 / 0.12 | 630 |

All twelve English clips decode at CER 0. **34 of the 36 slots pass the acoustic gate; 2 are
below it** — both `ar-LB-LaylaNeural`, both discussed next.

S223L1 was Tom's screenshot case and the doc's suspected "one defect, two rows": confirmed. Rounds
500 and 508 are the same phrase (BUILD, then its Fibonacci review). One fill, both rows healthy.

---

## The two flagged clips — not defects of this run

`S0234L02U07` target1 (CER 0.35) and `S0293L02U07` target1 (CER 0.37) fall below the veracity
threshold. Three pieces of evidence say the clips are fine and the *checker* is out of its
validated range:

1. **Reproducible.** Two fresh renders of each text through the same voice score the same
   (0.35/0.30 and 0.41/0.44). A bad take does not reproduce; a systematic decode failure does.
2. **Not truncated or silent** — the only failure classes the gate was ever validated on. Each is
   the same length as its Rami twin (3888 ms vs 3888 ms; 4284 ms vs 4140 ms) and full-size on S3.
3. **The already-live audio scores the same.** Layla clips shipped since 2026-05-18 and heard by
   learners for eleven weeks score worse: `رح يلتقي فيي` → CER 0.67, `رح يلتقي فيي بكرا` → 0.59.
   Whisper-small systematically mis-decodes Lebanese `رح يلتقي` as `أراحي التقي` in this voice.

The gate's own doctrine is explicit that a low score cannot distinguish a mispronunciation from an
ASR miss, and that its threshold was fitted on German and English. On Lebanese Arabic it is
reading the dialect, not the clip.

**Open item for a human ear, and it is bigger than these two:** whether Layla actually mispronounces
`رح` + verb (the future particle) is a real question — but it is a question about audio that has
been live since May across the whole course, not about anything this run created. Flagged, not
acted on.

---

## What was changed in code

`services/phases/phase8-audio-v13.cjs` — `/regenerate-phrase` was storing the **bare** voice name
in `course_audio.voice_id` (`en-GB-SoniaNeural`) where the whole estate stores it prefixed
(`azure_en-GB-SoniaNeural`). The unique key `(course, text_normalized, language, role, voice_id)`
is keyed on the prefixed form, so every clip that endpoint minted was invisible to the link and
dedup passes, and its `humanRowAtAudioKey` precious-audio guard could never match a real row.
One orphan from that bug is already in this course ("in the middle", unbound since 2026-05-20).

Fixed both ways round: prefixed for storage and for the human guard, bare for TTS dispatch. A
config value that already carries the prefix now dispatches correctly instead of being sent to
Azure verbatim as a voice name. Commit `9f3dbea1`, on `main`, deployed to the watson-1 phase8
service (`popty-phase8-audio` restarted, build `9f3dbea1`) before any clip was generated — so all
32 carry the correct prefixed voice id.

---

## Make-before-break

Nothing was deleted and nothing was unlinked. Every slot filled was empty; each clip was rendered,
mastered, uploaded to S3 and bound in that order, so there was never a moment when a bound row
pointed at nothing. The only irreversible step in the run was an S3 `PutObject` of a new key.

## Method

- Fill: `POST localhost:3465/regenerate-phrase/ara_lb_for_eng/<phrase_id>` with only the null
  roles, one phrase at a time. Same recipe as the bulk path (gender expansion → TTS → −16 LUFS
  master → S3 → mint `course_audio` → bind).
- Census before/after: `scripts/ara-audit/gaps300.cjs`, keyed on
  `normalizeForAudio(text)|language|role`, target language `ara` (not `ara_lb`).
- Acoustic: `services/audio-veracity.cjs` against the bytes fetched back from S3, per slot.
- Delivery: `GET localhost:3470/api/production/ara_lb_for_eng/learning-journey`, swept in 20-lego
  windows across rounds 1–638.
- Logs: `scripts/ara-audit/{fill-applied-log,verify-log,journey-sweep-after}.json` (gitignored
  workspace).

The seed-301+ gap is untouched and remains the deliberate MVP-to-300 policy, as is the free link
pass for the remaining unlinked slots at seed 301+.
