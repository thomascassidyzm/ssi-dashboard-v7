# Aran's Welsh pods — state of play, 2026-08-11

Read-only investigation against the live database. No writes, no code changes. Every finding carries
its count and the query that produced it. Audio liveness verified with ranged GETs against
`ssi-audio-stage`; one file decoded locally with ffprobe.

---

## Headline

1. **Yesterday's two fixes are holding.** All 19 reverted rows match the applied log exactly, the 8
   re-attached English clips are still attached, both `pod-0` slugs are still empty and still
   `[GATED]`, and **nothing has touched a Welsh pod row since 17:50:24 UTC on 2026-08-10.**
2. **Aran's 87 Welsh clips are real and alive.** 65 + 22 across his two voice ids, 26 recorded
   2026-06-15 and 61 recorded 2026-08-10, every one fetchable and 6 KB–199 KB.
3. **All 26 of his English clips are dead files.** Every one is exactly 834 bytes on S3 — a bare
   MP3 header with no audio frames, undecodable. 23 are attached to pod lines, including the 8 that
   yesterday's revert re-attached. The revert restored correct pointers to empty clips.
4. **Aran is the only human who has ever recorded a pod on this estate** (bar the E2E test course).
   No human English pod clip anywhere has ever been playable.

---

## 1. What Aran has recorded

Only one Welsh pod holds any audio.

| Pod | Lines | Welsh audio | English audio | Drafts |
|---|---|---|---|---|
| `cym_n_for_eng:pod-0` | 0 | 0 | 0 | 0 |
| `cym_n_for_eng:pod-0-unrecorded` | 232 | **87** | 23 | 0 |
| `cym_s_for_eng:pod-0` | 0 | 0 | 0 | 0 |
| `cym_s_for_eng:pod-0-unrecorded` | 232 | **0** | 0 | 104 |

```sql
select p.id, count(s.id) sentences, count(s.target_audio_id) tgt_audio,
       count(s.known_audio_id) known_audio, count(*) filter (where s.target_text_draft) drafts
from listening_pods p left join listening_pod_sentences s on s.pod_id = p.id
where p.course_code like 'cym%' group by p.id order by p.id;
```

**Voice and dates** — every pod clip on either Welsh course is his:

| Voice | Role | Clips linked | Recorded |
|---|---|---|---|
| `human_aran_cym_n` | target1 (Welsh) | 65 | 4 on 2026-06-15, 61 on 2026-08-10 |
| `human_aran_cym_n_2` | target1 (Welsh) | 22 | all 2026-06-15 |
| `human_aran_cym_n` | known (English) | 23 | all 2026-06-15 15:16 UTC |

```sql
select ca.created_at::date, ca.voice_id, ca.role, count(*)
from listening_pod_sentences s join course_audio ca on ca.id = s.target_audio_id
where s.pod_id like 'cym_n%' group by 1,2,3 order by 1;
```

11 lines are chunked takes carrying `sentence_audio_ids` (23 clips total) — all 23 resolve to live
rows and all 23 fetch from S3 (13 KB–109 KB).

**Still to record on cym_n: 145 of 232 lines.** All 79 `Learner` lines are unrecorded (they do carry
real Welsh text and do need recording), plus Sarah 13, Customer 1 14, Barista 10, Receptionist 6,
Passenger 6, Anna 6, Bartender 5, Assistant 4, Narrator 1. By scene: scenes 1–14 are partly done,
scenes 15–22 have one clip each.

**cym_s (Southern Welsh) has not been started at all** — 0 audio, 104 drafts.

---

## 2. Proofread / DRAFT status

**There is no approval mechanism.** The only marker on a pod line is
`listening_pod_sentences.target_text_draft`. No `approved_at` / `proofread_at` / signoff column
exists on any pod table — per-line approval is job #94 and was not built.

```sql
select column_name, table_name from information_schema.columns
where column_name ~* 'approv|proofread|signoff' and table_name ~* 'pod|listening';  -- 0 rows
```

**cym_n: 0 drafts left, and they were cleared by Aran, not lost.** The audit log shows 109 rows
edited one at a time between 16:17 and 16:41 UTC on 2026-08-10, every one of them carrying
`target_text_draft = true` beforehand — human pace, 1–14 lines a minute. That is the proofreading
pass; saving a line clears the marker.

```sql
select date_trunc('minute', changed_at), count(*),
       count(*) filter (where (old_row->>'target_text_draft')::bool)
from content_audit_log
where table_name = 'listening_pod_sentences' and primary_key like 'cym_n%'
  and changed_at > '2026-08-10' group by 1 order by 1;
```

Of those 109, **only 18 had their Welsh text actually changed** — the other 91 he read and approved
as written. (Compared each row's first pre-edit `old_row.target_text` against the current text.)

**The honest limit: 109 of 232 lines are provably human-read. The other 123 are unknown.** The
marker column dates from 2026-08-06 and defaults to `false`, so an unbadged older line is unbadged
whether or not anyone ever read it. That is exactly the untruth commit `393513c8` removed from the
screens; the data has the same limit.

**cym_s: 104 drafts, correct and intact.** Two rows (`SC02-S003`, `SC02-S004`) were toggled
`true → false → true` twelve times between 17:01 and 17:21 on 2026-08-10 — verification of the
draft-flag fix. Both ended `true`, and both texts are correct and distinct from each other. **No
line is carrying a DRAFT marker it should not, and none was wrongly cleared.**

---

## 3. Are the 2026-08-10 fixes holding? Yes

**The revert is exact.** Joined the applied log's 19 intended values against the live rows:

```
rows_checked | pod_id_mismatch | target_mismatch | known_mismatch | known_audio_mismatch | missing
     19      |        0        |       0         |       0        |          0           |    0
```

All 19 rows are on `cym_n_for_eng:pod-0-unrecorded`, the 14 restored Welsh texts and 6 English texts
are as logged, and the 8 re-attached `known_audio_id` pointers are all still in place.

**The gate is still shut.** `cym_n_for_eng:pod-0` has 0 sentences and still carries its
`[GATED 2026-08-06] placeholder — sentences moved to…` title. Same for `cym_s_for_eng:pod-0`.

**Nothing has moved since.** Max `updated_at` on any Welsh pod sentence is
`2026-08-10 17:50:24.887174+00` — the revert itself. Zero rows updated after 18:00 UTC, and
`content_audit_log` has no `cym%` entry after that either.

```sql
select count(*) from listening_pod_sentences
where pod_id like 'cym%' and updated_at > '2026-08-10 18:00:00+00';   -- 0
```

**The landmine is still there, by design.** All 232 cym_n and 232 cym_s rows still carry `:pod-0:`
id prefixes while living in `pod-0-unrecorded` — the re-slug was deliberately skipped because
`learner_pod_state` holds 54 cym_n + 72 cym_s unkeyed references to those ids. Estate-wide the only
other case is `zzz_test_for_eng:pod-0` (6 rows). The generator guard `d2223d08` is on `origin/main`.

**Gap:** I could not verify the guard is *running* anywhere — pm2 is unavailable in this shell and
the doctrine is that `main` moving does not restart the services. Unchanged from yesterday's stated
gap.

---

## 4. Broken, stuck, or exposed

### 4.1 All 26 of Aran's English clips are empty files — the serious one

Every `role='known'`, `voice_id='human_aran_cym_n'` clip is **exactly 834 bytes**, in the DB and on
S3. Fetched with ranged GETs: all 23 attached ones return `206` with `size_download=834`. Decoded
one locally:

```
ffprobe: Failed to find two consecutive MPEG audio frames. Invalid data found when processing input
xxd:     fffb 90c4 … "Info" … — a bare Xing/Info header, zero audio frames
```

They are unique in the estate:

```sql
select count(*) from course_audio where file_size_bytes = 834;                     -- 26
select course_code, voice_id, role, count(*) from course_audio
where file_size_bytes = 834 group by 1,2,3;   -- cym_n_for_eng | human_aran_cym_n | known | 26
```

23 are attached to cym_n pod lines, **including all 8 that yesterday's revert re-attached**. The
revert did the right thing — it restored the pointers that existed before the accidental generate —
but the clips behind those pointers have never been playable. Aran's 87 Welsh clips are unaffected
and fine.

They were written in two bursts (~0.8 s apart, 15:16:34–15:16:57 on 2026-06-15), which looks like a
bulk registration rather than real-time recorder uploads. **I could not establish from the database
whether they were ever good, or which code path wrote them** — `content_audit_log` does not capture
inserts, and there is no S3 version history check in this pass.

### 4.2 No human has ever successfully recorded pod English, anywhere

```sql
select ca.course_code, ca.voice_id, ca.role, count(*), min(ca.file_size_bytes), max(ca.file_size_bytes)
from listening_pod_sentences s join course_audio ca on ca.id in (s.target_audio_id, s.known_audio_id)
where ca.origin = 'human' group by 1,2,3;
```

Five rows: Aran's three (English 834/834, Welsh 6 KB–199 KB and 14 KB–145 KB) and two E2E test
voices on `zzz_test_for_eng`. **Aran is the only real human pod recorder on the estate, and the only
human English pod clips that exist are the dead ones.**

### 4.3 An empty line sits in the recording queue

`SC15-S012` (Narrator, global_order 90142) has `target_text = ''` and `known_text = ''` on **both**
Welsh pods — a line in the queue with nothing to read. The same row exists in `deu_at_for_eng:pod-0`
and `spa_for_eng:pod-0-unrecorded`: 4 estate-wide, all the same canonical slot. It is the one cym_n
row with no matching `canonical_pod_scenarios` entry.

```sql
select id, pod_id, speaker, global_order from listening_pod_sentences
where btrim(target_text) = '' or btrim(known_text) = '';   -- 4 rows
```

### 4.4 Five orphaned clips of Aran's

Three are the dead 834-byte English ones. **Two are real Welsh takes** — 50 KB and 38 KB, recorded
2026-06-15 15:43 — attached to nothing, and their text matches no current sentence, so the wording
was edited after he recorded them. Low severity; stranded takes of superseded text, not lost work on
live text.

### 4.5 No dead S3 keys, but no QC either

Every linked cym clip fetches: 87 Welsh + 23 English + 23 chunk clips, all `206`. However **all 137
of Aran's clips have `veracity_pass IS NULL`** — nothing has ever been whisper-checked, and 24 have
no `duration_ms` and 22 no `file_size_bytes`, so a size- or duration-based check cannot see them.
The 834-byte defect would have been caught by any size floor.

### 4.6 Live exposure

Nothing wrong on Welsh: both `pod-0` slugs are childless, so an anonymous learner read returns 0 rows
and the Dialogues tab hides — the gate the revert restored. `cym_n_for_eng` and `cym_s_for_eng` are
both `status=released, new_app_status=live`, so that gate is the only thing standing between the
unfinished pod and learners.

Two other courses have ungated pods that would be a problem if their courses were live:

| Pod | Lines | Target audio | Drafts | Course status |
|---|---|---|---|---|
| `deu_at_for_eng:pod-0` | 232 | 100 | **155** | `draft` / `not_available` |
| `fin_for_eng:pod-0` | 142 | **0** | 0 | `draft` / `not_available` |

Both courses are not available in either app, so **neither is learner-facing today**. Worth knowing
before either course is released.

---

## What would block a new recorder starting on a different course

1. **The English side of the recorder path is unproven and currently produces dead files.** The only
   evidence that exists — Aran's 26 clips — is 26 out of 26 empty. Before a new recorder records a
   line of English, upload one clip and fetch it back with a size and decode check.
2. **No size or decode gate exists on upload.** A row with a resolvable `s3_key` currently passes
   every check in the estate whether or not the file contains audio.
3. **The empty `SC15-S012` Narrator line is in the canonical scenario set**, so any new pod-0 built
   from canonical inherits a blank line in the queue.
4. **"No DRAFT badge" does not mean proofread** for anything predating 2026-08-06, and there is still
   no per-line approval (job #94). A new recorder cannot tell read-and-approved from never-looked-at.
5. **The generator guard is on `main` but not verified running.** Until the pod-generator service is
   restarted wherever it actually runs, the only thing protecting a gated pod is the empty-slug
   convention that failed on 2026-08-10.

## What I could not check, and why

- **Whether the 834-byte clips were ever good.** No insert history in `content_audit_log`, no S3
  version listing done.
- **Whether the generate guard is deployed and running.** pm2 unavailable in this shell; not my
  scope to restart anything.
- **Audio quality of the 87 Welsh clips.** They are alive and correctly sized; nobody listened and
  no whisper QC has ever run on them (`veracity_pass` null on all 137).
- **The learner UI as a signed-in Welsh learner.** The gate was checked at the data layer only —
  `pod-0` returns 0 rows, which is the condition the Dialogues tab hides on.
