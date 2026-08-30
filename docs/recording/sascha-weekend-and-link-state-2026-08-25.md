# What the course played for "i wü" yesterday, and every object Sascha's weekend uploaded

**2026-08-25 · read-only · nothing was changed**
Sascha (they/them) — recordist for `deu_at_for_eng`, `sasha.wanasky@gmail.com`, voice `human_sasha_wanasky_deu_at`.

👉 **Listening page: https://watson-1.tail4968cb.ts.net/evidence/sascha-weekend-uploads-2026-08-25/index.html**

---

## 1. THE ANSWER: yesterday "i wü" played a human take — and it was the bad one

**On 2026-08-24 the course pointed "i wü" at Sascha's voice.** Kai's instinct that it was human yesterday is correct. But the human clip it pointed at is `058ead18` → `mastered/E0C0EC74-0C5A-4EDC-BEC1-08E092CE3BDF.mp3`, the 15:32 take that reads as **"Platt!"**. I fetched both that clip *and its raw original* and both say "Platt!" — it is bad at source, not a mastering casualty.

**That lego has never in its life pointed at any other human clip.** Its complete audit history:

| when | target2_audio_id was | what that is |
|---|---|---|
| 2026-07-27 → 2026-08-06 | `c5ab6493` | Azure Jonas TTS |
| *(gap — set to NULL)* | *(empty)* | |
| **2026-08-21 15:32:24** | NULL → **`058ead18`** | auto-linked the instant the "Platt!" take was inserted |
| **2026-08-21 15:32 → 2026-08-25 16:33** | **`058ead18`** | **← this is the whole of 08-24** |
| 2026-08-25 16:33 | `058ead18` → TTS | today's unlink pass |
| 2026-08-25 17:10 | TTS → `058ead18` | today's restore |
| 2026-08-25 18:36 | `058ead18` → `c5ab6493` | today's 14-row repoint |

**There is no good "i wü" that was in play yesterday and is gone now.** Nothing re-pointed it between 08-21 and today.

### I checked the wrong table first — correcting that

My first pass concluded "the churn left no trace", because I looked at `course_audio.s3_key`. That was wrong. **The course→audio link is a foreign key on `course_legos` / `course_practice_phrases` / `course_seeds` (`target2_audio_id`), not the S3 key on `course_audio`.** The snapshot Kai pointed me to is what showed me this. On the correct tables today's churn is fully visible and matches the brief:

| time (UTC) | legos | phrases | seeds | what it was |
|---|---|---|---|---|
| 16:16–16:18 | | 529 | | fills empty phrase slots with TTS |
| 16:33 | 28 | 258 | 25 | unlink the human takes |
| **17:10** | 28 | 266 | 25 | **the restore** (brief said ~17:13) |
| **18:36** | **2** | **11** | **1** | **the 14-row repoint** (brief said ~18:26) — exactly the 14 in the snapshot |
| 19:20 | | 2 | | a later junk-take repoint |

### 08-24 versus now, for every link touched today

**Legos (28):** 26 unchanged, human both days. **2 CHANGED** — `S0001L01 "i wü"` and `S0001L02 "reden"`, both human → Azure Jonas.

**Practice phrases (795 touched):**

| verdict | on 08-24 | now | count |
|---|---|---|---|
| same | human | human | 247 |
| CHANGED | **nothing at all** | Azure Jonas | 525 |
| CHANGED | human | Azure Jonas | 11 |
| CHANGED | nothing | human | 4 |
| CHANGED | Azure Jonas | human | 4 |

The 11 human→TTS are the junk takes (the "i wü" family). Note the 525: **yesterday those phrase slots had no audio at all**; they are TTS-filled today.

**Limit on this reconstruction, stated plainly:** the audit trigger on all four tables is `AFTER DELETE OR UPDATE` — **it does not fire on INSERT**. So I can replay any row that has been *changed*, but a row created and never touched leaves no history. Every row above had at least one change today, so all of them are reconstructible; rows never touched still hold their original value, which is also readable. The blind spot is a row that was inserted and deleted, which would vanish entirely.

---

## 2. The bucket listed by upload time — Kai's method

I enumerated **all 5,167,495 objects** in `ssi-audio-stage` by `LastModified`, not from the database. **5,706** were uploaded Fri 08-21 → Sun 08-23:

| day | `mastered/` | `raw/` | total |
|---|---|---|---|
| Fri 2026-08-21 | 411 | 96 | **507** |
| Sat 2026-08-22 | 2,814 | 6 | **2,820** |
| Sun 2026-08-23 | 2,021 | 358 | **2,379** |

**Only two prefixes. There is no third place.** No session bucket, no pending queue, no holding area — I checked `vad-lab/`, `pending/`, `sessions/`, `uploads/`, `longtake/`, `takes/`, `tutorial/` and all are empty, and the bucket-wide prefix census turned up nothing else.

### Straight-through capture: settled, and the answer is no

There is no continuous-blob path. `useContinuousRecorder.ts` keeps the mic open across a session but a VAD cuts **one blob per phrase** and uploads each separately; `PodLongTakeStudio` commits one upload per tap (`// Deliberately no raw-blob fallback`); and the ModeSelector's *"straight through from the start"* is a **reading order**, not a capture mode. The bucket enumeration confirms it independently: every weekend byte is a per-line take.

### Classification of all 5,706

| | count |
|---|---|
| Machine TTS renders, linked to a course row | 4,680 |
| Sascha takes, linked and live | 325 |
| Takes with a provenance row but **no clip** (mostly slow reads) | 104 |
| **Unexplained — no provenance row, no course row** | **167** |

Of the 167 unexplained: **136 are an Italian TTS batch** uploaded Sat 12:30–13:44 (I transcribed a sample: *"Possiamo pagare?"*, *"Wolle ordinare da bere prima?"*) — nothing to do with Sascha. **31 are Austrian raw takes** that were refused by an upload gate: the handler archives the raw *first*, then all three refusal branches return **before** the provenance INSERT, so the bytes survive and no database row is ever written.

---

## 3. Friday 08-21 was a real recording day — #601's characterisation was wrong

Job #601 explained 08-21 as the tool-test burst. **It was 45 real takes and 4 test takes.**

| Friday 08-21 | |
|---|---|
| 10:54–11:10 | **34 takes** — full sentences, natural + slow pairs |
| 12:57–13:14 | **11 takes** — the long-sentence set |
| **15:32:17–15:32:29** | **4 takes** — the test burst ("i wü iatz mit dir Deitsch reden" / "i wü" / "reden" / "i wü reden") |

The 10:55:46 and 10:55:53 takes are **`i wü's ned amoi gschenkt ois Gratisangebot`** — real Friday "i wü" recording, an hour before anyone touched the test tooling. Do not let the burst stand for the day.

**Saturday 08-22: Sascha recorded nothing.** Zero provenance rows, zero raw objects attributable to them, in UTC or in Vienna time. Saturday's 2,820 uploads are the Italian TTS batch plus six of Tom's `zzz_test` takes. Kai's recollection of "mostly Saturday" is not supported by any location I can reach.

**Sunday 08-23: 244 takes**, 15:10–17:59 — the big session.

---

## 4. The listening page

**https://watson-1.tail4968cb.ts.net/evidence/sascha-weekend-uploads-2026-08-25/index.html**

**454 objects** — every Friday and Sunday upload that is not a machine TTS render — in upload-time order, grouped into sessions, tap to play, nothing preloaded, played rows dim so you can see where you got to. Filters for **"i wü" only (103 takes)**, **Unexplained only (31)**, Friday, Sunday.

Colour tells you the status honestly: green = this exact clip is what the course plays today; blue = Sascha recorded it and it is linked to nothing (mostly the slow reads, kept for assembly and never filed as clips); **red = no provenance row and no course row, nothing in any database can say what it is.**

The 30 raw-only takes were **transcoded to MP3 locally** for the page — iOS Safari will not play WebM/Opus, and Kai is on a phone. Original bytes in S3 are untouched.

**Not a duplicate of #619.** That job's page (`sasha-take-chooser-2026-08-25`) is a curated chooser for seven specific lines with a verdict per line. This one is the complete weekend upload index, built from S3 rather than the database, and its value is the 31 red rows — takes #619's page cannot know about because they have no database row to query. The two are complementary; the 31 unexplained takes should be added to #619's page if it is to be complete.

---

## 5. Where I looked, and what I could not reach

**Reached:** the whole `ssi-audio-stage` bucket by LastModified (5,167,495 objects) and per-object S3 metadata; `recording_provenance`; `course_audio`; `audio_clips`; `target_audio`; `shared_audio`; `course_audio_revisions`; `content_audit_log` for `course_audio`, `course_legos`, `course_practice_phrases`, `course_seeds`; the recorder/upload source in this repo; the snapshot from job #601 at `/tmp/cs-4347bc94-…/snapshot-testtakes.json` (a different conversation's scratch — readable on this machine; Kai named it, so I read it rather than guessing, and it is what corrected my priority-1 method).

**Could not reach / did not do:**
- **Popty service logs** — I did not locate a log store covering 08-24 for the recording or link paths. Not searched exhaustively; if there is one, it could corroborate the audit replay.
- **Takes refused before 2026-08-14** leave nothing at all — raw retention began that day (`0d76bd5c`). Sascha's 08-07/08-08 takes have no raw. Unrecoverable, count unknown.
- **Whisper is not an authority on Austrian dialect.** Every transcript is indicative; forced German flattens `i wü` / `i wer` / `i wär`. This is precisely the distinction the question turns on — **the page exists so Kai can settle it by ear.**
- **A row inserted and then deleted** would leave no audit trace at all (no INSERT trigger), so I cannot rule that class out.

---

## 6. What I changed

Nothing. No database writes, no S3 writes, no TTS, no relinking, no commits. Probe scripts are in the gitignored `scripts/`; page audio is a local copy under `command-surface/public/evidence/`.
