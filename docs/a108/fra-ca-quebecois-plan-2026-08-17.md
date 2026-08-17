# fra_ca_for_eng — the repair is a relink, not a render

**Status: HELD AT THE BUDGET GATE. 8 sample clips rendered (~$0.01). Nothing else rendered, no links moved, nothing deleted.**

Listening page published for Kai's ear ruling: **https://watson-1.tail4968cb.ts.net/d/1bfa3ce0**

Calibration evidence is in the companion doc, `fra-ca-quebecois-calibration-2026-08-17.md`.

---

## 1. The headline

The 286 seeds are a real, learner-audible defect — confirmed 286/286 at row level and 10/10 at byte level. But **they are not a render job.**

**556 of the 572 broken links already have a correct replacement clip sitting in the database, in the right role and the same voice.** They were rendered on 2026-07-29 and never linked. Re-pointing them costs nothing.

| bucket | target1 | target2 | total | cost |
|---|---|---|---|---|
| **(a) correct clip exists, same voice — free relink** | 251 | 250 | **501** | £0 |
| **(b) exists under the other spelling of the same voice** | 27 | 28 | **55** | £0 |
| **(c) nothing exists — must render** | 8 | 8 | **16** | ~$0.01 |
| | 286 | 286 | **572** | |

Bucket (b) is not a voice swap. The stale clips carry the bare `fr-CA-SylvieNeural` / `fr-CA-AntoineNeural` ids and the replacements carry `azure_`-prefixed ones — the known estate tagging artefact, same voice. It collapses into (a).

**The whole campaign against this course is: 556 free relinks + 16 rendered clips of 538 characters.**

---

## 2. The 16 that genuinely need rendering

9 seeds, 538 characters, ~$0.01 at Azure neural rates.

| seed | roles | text |
|---|---|---|
| 67 | t1, t2 | Pourquoi tu veux arrêter? |
| 80 | t1, t2 | Chu pas sûr quand j'vas être prêt |
| 96 | t1 | Non chu pas encore prêt, j'ai besoin d'un ptit peu plus de temps |
| 104 | t2 | On a besoin de changer ce qu'on fait |
| 150 | t1, t2 | Tu peux-tu me dire c'est quoi ton nom? |
| 152 | t1, t2 | J'l'aurais fait autrement si j'avais su ce que tu voulais |
| 215 | t1, t2 | Chu sorti samedi soir |
| 244 | t1, t2 | J'ai déjà appris beaucoup |
| 298 | t1, t2 | J'ai pus rien à dire |

---

## 3. Why it broke — and it is a known estate defect

`course_legos` and `course_practice_phrases` are **100% clean**: 1,365 + 1,365 lego links and 12,830 + 12,837 phrase links, zero stale. The damage is confined entirely to `course_seeds`.

That asymmetry names the cause. Legos and phrases carry a text-edit trigger that re-resolves their audio link; **`course_seeds` has no such trigger.** When the Québécois conversion rewrote the seed text, the lego and phrase links followed the text and the seed links stayed pointing at the old metropolitan clips.

Then the 2026-07-29 render pass ran and produced the correct Québécois clips. The `audio_autolink` AFTER-INSERT trigger picked them up — but read its `WHERE` clause:

```sql
UPDATE course_seeds SET target1_audio_id = NEW.id
  WHERE course_code = NEW.course_code AND target1_audio_id IS NULL
    AND normalize_text(target_text) = NEW.text_normalized;
```

`AND target1_audio_id IS NULL`. The seed columns were **not** null — they held the stale metropolitan clip. So the autolink declined to move them, and 556 correct clips were orphaned at the moment of creation.

**This matters beyond this course: a re-render can never repair a stale seed link on its own.** The new clip is created, the trigger refuses to attach it, and the pass reports success. Any course in the 674-row ledger with stale *seed* links has the same trap waiting.

---

## 4. The voice question, answered

Azure has **exactly four** fr-CA neural voices, confirmed live against the voices/list endpoint:

| ShortName | name | gender | in use |
|---|---|---|---|
| `fr-CA-SylvieNeural` | Sylvie | Female | **target1** |
| `fr-CA-AntoineNeural` | Antoine | Male | **target2** |
| `fr-CA-JeanNeural` | Jean | Male | — |
| `fr-CA-ThierryNeural` | Thierry | Male | — |

Two consequences:

1. **Sylvie has no alternative.** She is the only female fr-CA voice Azure offers. A target1 voice change means either an all-male course or leaving fr-CA.
2. **The premise of the job was wrong in a helpful direction.** The course's target voices have been fr-CA since 2026-04-15 and every clip in the course — stale and fresh — is voiced by them. The stale clips are Québécois voices reading metropolitan *words*. There was never an accent problem.

**A voice change is the expensive path.** It invalidates all 556 free relinks and forces a full course re-render: ~29,800 target clips over 368,025 characters, roughly **$12** in Azure fees plus days of pipeline time, and it discards 14,921 already-verified clips per voice. That trade must be made knowingly, which is why the listening page states it above the blind test rather than below it.

---

## 5. The blind listening test — key

**Do not put this in anything Kai reads before he rules.**

Group A — *"M'as pratiquer à parler avec quelqu'un d'autre"* (seed 5)

| label | voice | clip id |
|---|---|---|
| A1 | Thierry | `85aeb55d-a99e-459d-bd9b-e35a5ccf15c4` |
| A2 | **Sylvie (incumbent)** | `a62fd1c7-4da2-4550-9ad8-dc6d6e304888` |
| A3 | Jean | `fe9a1bc3-a3d0-4fdd-95b2-2283dd849eb4` |
| A4 | **Antoine (incumbent)** | `f2914689-3de7-4177-b49e-a2f18af7c8bc` |

Group B — *"Tu parles-tu québécois toute la journée?"* (seed 14)

| label | voice | clip id |
|---|---|---|
| B1 | **Antoine (incumbent)** | `b52f59f1-2ec5-48f7-b858-dc01600f53b3` |
| B2 | Jean | `40babcbb-34db-4d0f-a5f1-a5f3ad15944e` |
| B3 | Thierry | `670248bb-641e-4bb2-8703-651dbd79ff6d` |
| B4 | **Sylvie (incumbent)** | `1b5d22f5-07c4-4a0b-a4d0-645f11c79e55` |

All 8 rendered at the course's own 0.85 speed and put through `normalizeAudioClean` at −16 LUFS — the same compressor-free mastering the shipping pipeline applies — so the comparison is like for like. All 8 whisper-verified as speaking the right words.

### How they are hosted, and how to remove them

The samples are **not course content and cannot reach a learner**, but they are real rows and should be cleaned up once Kai has ruled.

They are `course_audio` rows in `fra_ca_for_eng` with `role='instruction'`, their `text` prefixed `[VOICE SAMPLE 2026-08-17 — not course content]`. That role was chosen deliberately:

- `audio_autolink` only acts on `known` / `target1` / `target2` / `presentation`, so these rows cannot attach themselves to any seed, lego or phrase;
- the learner reads instruction audio from **`shared_audio`**, not `course_audio` (`CourseDataProvider.ts:744`), so nothing in the player can reach them.

A distinct role like `voice_sample` would have been cleaner, but `course_audio_role_check` permits only twelve fixed values.

```sql
-- cleanup once the ruling lands (also delete the 8 mastered/<UUID>.mp3 S3 objects)
DELETE FROM course_audio
 WHERE course_code = 'fra_ca_for_eng'
   AND text LIKE '[VOICE SAMPLE 2026-08-17%';
```

---

## 6. Also found, out of scope, not touched

**All 3,057 presentation clips say "The French for:".** Zero say "Québécois". The clips faithfully speak their script; the script was never converted. This is a *text* defect on the English known side, not stale audio, and it is wider than the defect this job was commissioned for.

**The presentation narrator changes voice mid-course.** `voice_config` names Sonia (`en-GB-SoniaNeural`); the 2026-07-29 pass rendered 1,671 presentation clips as `xai_gfzdpspr5fdp` (Tom) instead, against 1,386 earlier Sonia clips. **The render path did not honour `voice_config.voices.presentation`** — a pipeline finding from the same pass that stranded the 556 seed clips, and it should be understood before any further render on this course.

---

## 7. Recommended sequence, on Kai's word

1. **If the incumbents survive the ear test** — relink the 556 (make-before-break: each replacement verified alive and correct-voiced *before* the swap; six already are), render the 16, verify, then bump `content_stamp` / `audio_stamp`. Old clips retired only after the new links are verified live.
2. **Do not delete the stale metropolitan clips** in the same pass. Verify the relinks on served bytes first.
3. **Take the presentation text and presentation-voice findings as separate decisions.**
4. **Carry the trigger finding to the wider campaign** — the other courses with stale *seed* links cannot be repaired by re-rendering alone.

---

*2026-08-17. Read-only except: 8 sample clips rendered and registered as inert `instruction` rows, listed above with their cleanup SQL. No course link was changed, no clip deleted, no bulk render run.*
