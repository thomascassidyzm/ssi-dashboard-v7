# Where else can a recording outlive an edit of its text?

*Estate-wide forensic reach study for Kai — read-only, 2026-08-19. Nothing was changed, no audio was generated, no transcription was run.*

---

## Headline

**Two things, and the second is the one that matters.**

**1. Recording provenance is effectively empty across the estate — 0.28%.** Of the 42,042 human recordings in the estate, only **117** can be tied to any record of who recorded them, when, or from what script. Not 117 courses — 117 clips. All 117 are in `cym_n_for_eng`. Every other human clip — including all 20,722 in `cym_s_for_eng` and 19,914 of the 19,914 in `cym_n_for_eng` that aren't those 117 — has no provenance record of any kind. The `recording_provenance` table exists and *is being written today* (Kai's own recording session added rows at 12:28 this morning), but it is keyed by the S3 filename, not by the audio row, so **a straight join from `course_audio` to provenance returns zero for every single course.** This is the major gap the brief anticipated, and it is worse than "empty for Welsh": it is empty everywhere, by construction, and the modern path only half-fixes it.

**2. As of two days ago, a text edit can no longer silently strand a recording — but only for the three tables that got the fix.** Since **2026-08-17** the database itself refuses to let an edited seed, LEGO or practice phrase keep pointing at a recording of the old words. That protection does **not** cover LEGO introductions, listening pods, or the case where someone edits the *audio row's own text* — and in that last shape, **623 clips across 8 courses already show it having happened**.

The Welsh "angry eyes / pretty eyes" case could not happen today through a seed or phrase edit. It could still happen through three other doors.

---

## 1. Inventory: who has human voices, and is there any provenance?

134 courses hold audio. **19 have human recordings; 115 are machine-voiced only.**

| Course | Human clips | Human voices | Provenance coverage |
|---|---:|---:|---:|
| cym_s_for_eng | 20,722 | 4 | **0.00%** |
| cym_n_for_eng | 19,914 | 6 | **0.54%** (107 clips) |
| cym_anthem_for_jpn | 354 | 2 | 0.00% |
| fin, zho, gle, ita, jpn, kor, fra, spa, swe (each) | 75 | 1–2 | 0.00% |
| ara, deu, nld, tur (each) | 74 | 1–3 | 0.00% |
| por_for_eng | 71 | 1 | 0.00% |
| zzz_test_for_eng | 9 | 3 | (10 test clips matched) |
| zzz_test2_for_eng | 1 | 1 | 0.00% |

**Kai's expectation of `bre` and `pdc` is wrong.** `bre_for_eng`, `bre_for_fra` and `pdc_for_eng` all exist as courses, and all three hold **zero** human audio — 314, 97 and 1 clip respectively, all machine-voiced. The human-voiced estate is Welsh (40,990 clips, 97.5% of all human audio) plus a thin, uniform crust of 71–75 clips per course in 16 other courses. That crust is not course content: it is **765 instruction clips, 413 encouragement clips and 9 welcome clips** under the shared voice `human_recording` — Aran's spoken furniture, reused course to course. Two courses (the Welsh pair) also carry 1,317 human *presentation* clips under voice `human`.

### Why provenance reads as zero

The table is real and healthy in itself: 345 rows, written by `services/recording-upload-helpers.cjs`, carrying speaker, device, consent, chunk map and the full course/seed/phrase context. But its primary key is `audio_uuid` — an **uppercase S3 filename UUID** like `C08A94E1-…`, not a `course_audio.id`. Joining the two tables on id matches **0 rows out of 345**, in either letter case. Matching indirectly, by reconstructing `mastered/<uuid>.mp3` and looking it up as an `s3_key`, recovers only this:

| Course named in provenance | Provenance rows | Rows that reached `course_audio` |
|---|---:|---:|
| zzz_test_for_eng | 125 | 10 |
| cym_n_for_eng | 113 | **107** |
| fin_for_eng | 70 | **0** |
| deu_at_for_eng | 38 | **0** |

So the modern recorder *does* populate provenance — and the 108 rows recorded in the last day carry `"course_audio_id": null`, meaning the take was captured but has not been banked into the course. The provenance trail and the course audio are two systems that presently do not meet. **Explicit gap: for 41,925 of 42,042 human clips (99.72%) there is no recorded answer to "who said this, when, reading what".** For the Welsh corpus specifically that is 40,883 of 40,990 clips.

---

## 2. Legacy-import blast radius

The brief's second proxy — `s3_key like 'mastered/%'` — **does not identify legacy imports.** `mastered/` is the storage prefix for essentially every clip in the estate, machine-voiced included; 2.56 million rows match it. Using it would have implicated the whole estate. The real marker is `voice_id = 'legacy_import'`, and it is narrow:

| Course | Legacy-import clips | Roles | Import date |
|---|---:|---|---|
| cym_s_for_eng | 19,971 | known 6,604 / target1 6,694 / target2 6,694 | 2026-01-04 |
| cym_n_for_eng | 19,061 | known 6,312 / target1 6,384 / target2 6,384 | 2026-01-04 |
| cym_anthem_for_jpn | 319 | target1 144 / target2 175 | 2026-03-04 |
| *everything else* | **0** | — | — |

**39,351 clips, three courses, all Welsh.** The un-auditable text/audio pairing inherited from the legacy manifest reaches no further than Welsh. That is genuinely good news and it is the tightest boundary in this report.

### The one limb that works without history: one file, two texts

A single recording cannot say two different things. Where one `s3_key` is attached to two different texts, at least one of those pairings is a lie — and this test needs no provenance, no history and no listening.

| Course | Files with 2+ texts | Rows involved |
|---|---:|---:|
| cym_n_for_eng | 7 | 14 |
| cym_s_for_eng | 2 | 4 |
| dan_for_eng | 1 | 2 |
| est_for_eng | 1 | 2 |
| swa_for_eng | 1 | 2 |
| swe_for_eng | 1 | 2 |
| **Total (within-course)** | **13** | **26** |

Estate-wide, ignoring course boundaries, 31 files carry more than one text across 201 rows — the extra 18 are files shared between courses, which is expected reuse rather than a defect on its own.

The Welsh nine are worth naming because they are two distinct shapes. Two of them (`cym_s`) are a **content** collision: the same file attached both to `maen nhw` and to `maen nhw wedi symud i'r un ddinas` — a two-word clip and a whole sentence cannot both be right. The other seven (`cym_n`) are a **format** collision: the same presentation recording attached both to `The Cymraeg for <src>did you have?</src>` and to `The Welsh for: 'did you have?', is:` — the same spoken sentence written two ways, one in the old prose style and one in the modern tagged style. Those seven are near-certainly harmless; the two `cym_s` ones are not.

**This check does not find the "angry eyes" defect and cannot.** That defect is one file, one text, and the text is simply wrong. No structural test reaches it.

---

## 3. Can it recur today?

**In one sentence: no — if you edit the text of a seed, LEGO or practice phrase today, the database itself either finds a recording of the *new* words in the same voice or unhooks the audio entirely, so a recording of the old words cannot stay silently attached; but that protection is only two days old, and it does not cover LEGO introductions, listening pods, or someone editing the wording stored on the audio row itself.**

The line that decides it, for phrases (the seeds and LEGOs versions are the same shape):

> `CONTINUE WHEN v_found AND (v_prev.text_normalized = normalize_text(v_new_text) OR normalize_text(v_prev.text) = normalize_text(v_new_text));`
> — `null_phrase_audio_on_text_change()`, live in the database; mirrored at `supabase/schema.sql`

Read plainly: *keep the recording only if it still says the new words.* Anything else falls through to a same-voice re-resolve, and failing that, to NULL.

**This is enforced in the database, not in any one service.** That is the important structural fact: there is no write path to audit and no handler that can forget to call it. Every route — the dashboard's seed editor, `/api/seed/complete`, backfill-submit, a script, a person typing SQL by hand — passes through the same three `BEFORE UPDATE` triggers:

| Table | Trigger | Fires on |
|---|---|---|
| `course_seeds` | `trg_null_seed_audio_on_text_change` | known_text or target_text changing |
| `course_legos` | `trg_null_lego_audio_on_text_change` | known_text or target_text changing |
| `course_practice_phrases` | `trg_null_phrase_audio_on_text_change` | known_text or target_text changing |

### The two prior claims, verified — one confirmed, one now out of date

- **"A text edit re-resolves the audio link by text rather than nulling it" — CONFIRMED, and it is deliberate.** The trigger tries `audio_id_for_text_same_voice(...)` first and only NULLs when that finds nothing. Both outcomes are written to an audit table, `content_audio_link_drops`, with a reason.
- **"`audio_id_for_text` constrains no voice" — NO LONGER TRUE of the path that runs.** The triggers call `audio_id_for_text_same_voice`, which pins the substitute to the same voice and the same language: `AND audio_canon_voice(a.voice_id) = audio_canon_voice(prev.voice_id) AND a.language IS NOT DISTINCT FROM prev.language`. The older voice-blind `audio_id_for_text` still exists in the database, but no text-change trigger uses it. The prior finding was correct when written and has been superseded.

The mechanism is demonstrably live, not theoretical — it has been firing since **2026-08-17 14:37**, most recently at **09:56 this morning**:

| What happened | Count | Courses |
|---|---:|---|
| `nulled-no-same-voice-clip-for-new-text` (audio unhooked) | 171 | eng_for_sin 101, eus_for_eng 70, eng_for_spa 40, … |
| `relinked-same-voice` (a correct clip found) | 73 | 9 courses |

### Nothing marks the old recording as wanted-again

The trigger cleans up the *link*. It does **not** set `course_audio.rerecord_wanted`, does not bump `audio_revision`, and does not flag the orphaned recording in any way. `rerecord_wanted` is populated on exactly two courses estate-wide — `eng_for_sin` (1,241) and `cym_n_for_eng` (88) — and both look like deliberate human queues, not an automatic consequence of editing. So after a text edit the learner is protected (they hear silence or the right clip, never the wrong words), but **no queue is created telling anyone a recording now needs re-doing.** For a machine voice that is fine; the next render fills the hole. For a human voice it means a silent slot that nothing is asking anyone to fill.

### Three doors this protection does not close

**(a) Editing the wording stored on the audio row itself.** The triggers watch the content tables. Nothing watches `course_audio.text`. If someone corrects the text on the audio row while the file stays put, the row now claims words the recording may never have said — and the database records this as a perfectly ordinary update. **This has already happened, 623 times.**

Comparing every `course_audio` update in the audit log against the row's current state, restricted to cases where the file (`s3_key`) is byte-for-byte the same key and the words changed by more than punctuation or spacing:

| Course | Clips | …of which the revision counter never moved |
|---|---:|---:|
| zho_for_eng | 181 | 0 |
| fra_for_eng | 132 | 57 |
| deu_for_eng | 77 | 18 |
| ita_for_eng | 55 | 0 |
| eng_for_mar | 48 | 17 |
| spa_for_eng | 46 | 0 |
| eng_for_kan | 43 | 7 |
| ita_for_jpn | 41 | 41 |
| **Total** | **623** | **140** |

(A looser test that also counted punctuation-only rewrites returns 1,682 clips across 18 courses; `fra_ca_for_eng`'s 743 are entirely cosmetic and drop out under the stricter test, which is why the stricter number is the one to quote.) **All 623 are machine-voiced; none are human.** The 140 where the revision counter never moved are the cleanest instances of the exact shape under investigation: the words on the row changed, the file did not, and nothing recorded that anything might now be out of step.

**Honest limit on that number:** some of the 623 will be legitimate — a re-render that overwrote the same storage key would look identical from the outside. Distinguishing the two requires listening to the file, which is out of scope by instruction. Treat 623 as *the population that has this shape*, not as 623 confirmed wrong clips.

**(b) LEGO introductions and listening pods.** `lego_introductions` and `listening_pods` carry only audit and timestamp triggers. There is **no** text-change audio invalidation on either. Introductions are the narration a learner hears before a LEGO; pods are whole listening episodes. Edit the text on either today and the audio link is untouched. Given that `lego_introductions` has 8,059 recorded updates and `listening_pod_sentences` has 51,460, this is not a dormant path.

**(c) Everything that predates 2026-08-17.** A `BEFORE UPDATE` trigger only ever sees future edits. Every text edit made before that date passed through no such check — which includes the entire life of the Welsh corpus, imported 2026-01-04 and never re-examined by anything. The fix stops the bleeding; it does not diagnose the patient.

---

## 4. Machine-voiced courses: same exposure, different consequence

**115 of 134 courses are machine-voiced only, and they carry the same structural exposure — but a far cheaper one.**

The exposure is identical in kind: a TTS clip is a file with a text written next to it, and every gap above (audio-row text edits, introductions, pods, pre-2026-08-17 history) applies to it exactly as written. Indeed all 623 confirmed text-edit-under-a-fixed-file cases are TTS clips — the shape shows up *more* in machine-voiced courses simply because that is where the editing volume is.

The difference is what a discovery costs. A wrong TTS clip is re-rendered for pennies. A wrong human clip requires a person, a microphone, a room, and — for the Welsh corpus — a speaker who may not be available, working from a script nobody can now reconstruct because the provenance is gone. So the machine-voiced estate is exposed but recoverable; the human estate is exposed and, in places, not obviously recoverable.

**But nothing detects the staleness in either case.** The one mechanism that could is the veracity check, and its coverage is close to nil:

| | Clips | Checked | Coverage |
|---|---:|---:|---:|
| Machine-voiced | 2,523,605 | 2,850 | **0.113%** |
| Human | 42,042 | **1** | **0.002%** |
| **Estate** | **2,565,647** | **2,851** | **0.111%** |

50 of 134 courses have any veracity data at all. The best-covered course in the estate is `deu_for_eng` at 2.30%; `nld_for_eng` is second at 1.81%; every other course is under 0.4%. Three clips estate-wide have ever failed, all in `ita_for_jpn`.

**The reason for the near-zero coverage is architectural, not operational.** Veracity is a *pre-publish gate inside the renderer* (`services/audio-veracity.cjs`, invoked at `services/phases/phase8-audio-v13.cjs:2196`): it runs on clips as they are generated, and never again. It therefore cannot, even in principle, notice that a clip published in January has since had its text changed. Nothing in the estate re-checks a published clip. Compounding this, the gate has never meaningfully run on the human corpus at all — one human clip out of 42,042 — so **the Welsh recordings have never passed through any content check of any kind, at render time or since.**

Per the brief this is reported as evidence about the system, not as a detector to run: I have treated the veracity columns purely as a record of what the system has and hasn't looked at, and have run no transcription.

---

## Gaps and limits — stated, not inferred around

1. **Provenance is unrecoverable for 99.72% of human clips.** No amount of querying will produce who recorded them or from what script. This is a hard stop, not a research gap.
2. **The 623 audio-row text edits cannot be adjudicated without listening.** Some are legitimate same-key re-renders. Separating them requires either an S3 object-modified timestamp comparison (not attempted here; it would need bucket metadata access) or listening, which is out of scope.
3. **The audit log has no INSERT record**, so a clip created wrong at birth — which is precisely the Welsh shape — leaves no trace anywhere. Every count in this report about *edits* is therefore a lower bound on defects overall, and says nothing about defects that were present from day one.
4. **`cym_anthem_for_jpn` (354 human clips, 319 legacy-import) was not investigated beyond the counts here.** It shares the Welsh import lineage and nobody appears to have looked at it.
5. **The Welsh text/audio detector itself is out of scope** — a sibling worker holds it, and I have not duplicated or second-guessed that work.

---

## What this means, briefly

The un-auditable legacy pairing is **Welsh-only**, three courses, 39,351 clips — a much smaller blast radius than "the estate". The general power to strand a recording behind an edit was **closed two days ago for seeds, LEGOs and phrases**, at the database level, which is the right place. What remains open is narrower and nameable: the audio row's own text, LEGO introductions, listening pods, and the whole of history before 2026-08-17. And underneath all of it sits the fact that for 41,925 human recordings there is no record of who made them or what they were reading — which is why, in the Welsh case, the only way to find out what a recording says is still to listen to it.
