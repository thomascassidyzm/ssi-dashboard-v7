# fra_for_eng — what deleted 1,972 audio links on 2026-08-04 16:08Z

**Read-only forensics, 2026-08-05. No DB writes, no TTS, no deletions.**

## Verdict in one line

**Nothing was deleted at 16:08Z on 08-04. The hypothesis is REFUTED.** That timestamp is a
*symptom*, not a cause: a no-op link sweep that, by construction, touches only rows that were
*already* missing audio. The real event is **24 hours earlier — 2026-08-03 14:18:55Z**, when
**31,310 fra_for_eng `course_audio` rows in the discontinued Azure voices were deliberately
purged**, cascading `SET NULL` onto the phrase links. The re-render that followed covered most
of them but **left 4,434 clips never replaced**. Every purged clip's **S3 object is still
present** — the audio is orphaned, not destroyed.

---

## 1. The 16:08Z event: a red herring, proven three ways

### 1.1 The audit log records no deletion, and no nulling

`course_audio` carries `course_audio_audit` — `AFTER DELETE OR UPDATE … audit_content_change()`
— which writes the **full old row** into `content_audit_log` on every DELETE. So does
`course_practice_phrases` (`course_practice_phrases_audit`).

```
== course_audio DELETEs on 2026-08-04, by minute ==   (last one of the day)
2026-08-04T14:55  DELETE  deu_for_eng  2
```
**There is no `course_audio` DELETE anywhere near 16:08Z.** The last of the day is 14:55Z.

```
== all content_audit_log rows 2026-08-04 15:30–17:00Z ==
courses  UPDATE  16:08  6
courses  UPDATE  16:09  7
```
**Zero `course_practice_phrases` audit rows at 16:08–16:09.** This is decisive, because
`audit_content_change()` audits any change that overwrites a non-null value:

```sql
AND (old_json->k) IS DISTINCT FROM (new_json->k)
AND (old_json->k) IS NOT NULL
AND jsonb_typeof(old_json->k) <> 'null'   -- → has_overwrite := true
```
A real `known_audio_id: <uuid> → NULL` is exactly such an overwrite and **would have been
logged**. It wasn't. Whatever ran at 16:08:32Z wrote nothing over anything.

### 1.2 The timestamp signature is a `WHERE … IS NULL` no-op write

1,961 of the 1,972 rows share a **single** `updated_at` — one statement, one transaction:

| updated_at | rows | known NULL | target1 NULL | target2 NULL |
|---|---|---|---|---|
| `2026-08-04T16:08:32.570Z` | **1961** | 1158 | 4 | 903 |
| 9 further timestamps, 16:08:40 → 16:09:27 | 11 total | 0 | 0 | 0 |

Control query — fra phrase rows touched in that window with **no** null slot: **11**, i.e.
exactly the 11 rows in the nine unrelated single-row updates. **Not one fully-linked row was
touched by the 16:08:32.570Z statement.** A cause would hit rows regardless of their state; only
a `WHERE … IS NULL` predicate can select the broken set so perfectly.

### 1.3 The culprit statement is named in the repo, with measurements

Commit `050030b6` (2026-08-04 17:41Z), *"perf(db): stop link_all_audio_ids rewriting rows it
cannot link"*, and its migration `database/migrations/20260804_link_all_audio_ids_skip_no_op_updates.sql`:

> The function runs nine UPDATEs of the shape
> ```sql
> UPDATE course_practice_phrases cpp
>    SET target1_audio_id = (SELECT ca.id FROM course_audio ca WHERE … LIMIT 1)
>  WHERE cpp.course_code = p_course_code AND cpp.target1_audio_id IS NULL;
> ```
> When no matching audio row exists the scalar subquery returns NULL, so the statement **writes
> NULL over NULL**. Postgres still creates a new row version and still fires every AFTER trigger.

That is the 16:08:32Z statement precisely: it stamps `updated_at`/`version` on every already-null
slot and changes no value — hence a bumped timestamp with **no audit row**. Call sites:
`services/phases/phase8-audio-v13.cjs:1209` and `services/voice-engine/db.cjs:185`.

The fix landed at 17:41Z — **93 minutes after** the 16:08Z sweep — which is why this artefact
exists on 08-04 and should not recur.

> **The nulls predate 16:08:32Z.** They are what made those rows eligible for the sweep.

---

## 2. The real event: 2026-08-03 14:18:55Z, a bulk purge of the Azure voices

```
== fra_for_eng course_audio DELETEs, 2026-08-03 ==
first_del 2026-08-03T14:18:55.117Z   last_del 14:19:52.879Z   n = 31,310
```

**Deleted, by role and voice** (from `content_audit_log.old_row`):

| role | voice_id | count |
|---|---|---|
| known | `azure_en-GB-SoniaNeural` | 14,791 |
| target2 | `fr-FR-HenriNeural` | 14,476 |
| presentation | `azure_en-GB-SoniaNeural` | 1,534 |
| target2 | `azure_fr-FR-HenriNeural` | 317 |
| known | `en-GB-SoniaNeural` | 128 |
| known | Libby / Hollie / Ryan / Maisie / Alfie / Thomas (Neural) | 64 |

**Every single deleted row is an Azure voice.** Nothing in a current house voice was touched.

**Shape of the job** — batches of exactly 200 rows per statement, ~0.6 s apart, 57 s end to end:

```
14:18:55.117  200      14:18:56.505  200      14:18:57.347  200   … (157 batches)
```
`changed_by_uid` is **NULL** on all 31,310 → ran under the **service role** (a script or service),
not an authenticated dashboard user session. The same actor hit `deu_for_eng` 22 minutes later
(950 rows, 14:40:44–14:41:37Z) — same 200-row batching, same null uid.

**Then the re-render, starting 11 minutes after the purge finished:** first new `xai_eve` known
row at `14:29:58.454Z`, running to `17:17:31Z` — known `xai_eve` 12,648, target2 `xai_leo` 12,473,
presentation `xai_eve` 2,163.

The cascade is confirmed at the catalogue level — every link FK to `course_audio` is
`confdeltype = 'n'` (**SET NULL**):
```
course_practice_phrases.{known,target1,target2}_audio_id   n
course_legos.*, course_seeds.*, listening_pod_sentences.*   n
lego_introductions.presentation_audio_id                    c  (CASCADE)
course_audio_envelope.audio_id                              c  (CASCADE)
```
and the resulting nulling **was** audited, at the right time — 33,471 fra phrase-row audit
UPDATEs in the 14:00Z hour of 08-03, of which 15,871 had a non-null `known_audio_id` and 31,711 a
non-null `target2_audio_id` before the change.

---

## 3. What was lost: the coverage gap

Matching each deleted clip's `(role, text_normalized)` against `course_audio` as it stands today:

| role | deleted 08-03 | replaced | **never replaced** |
|---|---|---|---|
| known | 14,983 | 12,807 | **2,176** |
| target2 | 14,793 | 13,718 | **1,075** |
| presentation | 1,534 | 351 | **1,183** |
| **total** | **31,310** | **26,876** | **4,434** |

(Your 2,355 missing slots are the subset inside release target 668; these are course-wide totals.)

The never-replaced clips were **real, rendered audio** — not placeholders:

| role | never replaced | `pending/` stubs | null duration | avg duration |
|---|---|---|---|---|
| known | 2,176 | **0** | **0** | 2,477 ms |
| target2 | 1,075 | **0** | **0** | 2,541 ms |
| presentation | 1,183 | **0** | **0** | 4,605 ms |

So the purge was clean and complete; the **re-render simply did not cover everything**. The gap
is the accident, not the deletion.

---

## 4. Was it the discontinued voice, or good audio lost? — the decision-relevant fact

**It was the discontinued voice.** All 31,310 deleted rows were Azure
(`azure_en-GB-Sonia*`, `fr-FR-Henri*` and siblings) — the exact class the 08-03/08-04 re-voicing
programme existed to remove, and the same defect `tools/revoice-clips.cjs` was later written to
handle (`a47e1d6d`, 2026-08-04 13:51Z — note this tool **did not yet exist** on 08-03, so it was
not the actor).

**And it is not gone.** S3 `HeadObject` on four of the deleted rows' `s3_key` values:

```
PRESENT mastered/2EBCA4B4-4AC6-4E2C-94F8-F9693F6C7AC3.mp3  15840 bytes  LastModified 2026-05-22
PRESENT mastered/EFCA4700-F3F3-4E96-BEBF-1D60106F8C37.mp3  48672 bytes  LastModified 2026-06-10
PRESENT mastered/F78A5D0E-CE2B-41C5-AE04-0A94DD26AE98.mp3  48096 bytes  LastModified 2026-06-10
PRESENT mastered/88CBB71C-8743-45DB-8C5E-6FD099F40AAA.mp3  14976 bytes  LastModified 2026-05-22
```
4 of 4 present in `ssi-audio-stage`. No `DeleteObjectCommand` appears in `tools/revoice-clips.cjs`,
`tools/repair-silent-clips.cjs` or phase8 — **these tools never delete from S3**. The DB rows are
gone; the objects are orphaned and recoverable.

**Net:** you have not lost audio you want. You have 4,434 slots whose *replacement* on the house
xAI voices was never rendered. Restoring the Azure clips would put the discontinued voice back
into the course — almost certainly not what you want; the fix is to render the gap on
`xai_eve` / `xai_leo`, which is a cost decision, not a recovery operation.

---

## 5. Explicit gaps

- **I cannot name the process that ran the 08-03 14:18:55Z purge.** No commit lands in that
  window (repo is silent 2026-08-03 12:56Z → 2026-08-04 10:46Z). No agent transcript under
  `/home/tomcassidy/.cs-accounts/*/projects/*ssi-dashboard*/` from 08-03 mentions `fra_for_eng`
  at all. No journal exists: the popty units were only put under systemd supervision at
  **2026-08-04 16:47Z** (`82460d85`), so nothing was capturing their stdout on 08-03. What is
  *proven* about the actor: service-role credentials, 200-row delete batches ~0.6 s apart,
  selecting strictly on Azure voices, followed 11 minutes later by an xAI re-render of the same
  course — and it repeated the pattern on `deu_for_eng` 22 minutes later.
- **MOST LIKELY, UNPROVEN:** a purge-then-regenerate script of the same family as the 08-04
  repair fleet, run ad-hoc, deleting by voice before invoking phase8 `/generate`. The
  delete-first ordering rules out `revoice-clips.cjs`'s insert-first design — and that tool did
  not exist yet.
- The `(role, text_normalized)` replacement match in §3 is exact-string; a replacement rendered
  under a *differently normalised* text would read as "never replaced" here. The count is
  therefore an upper bound on the true gap, though it agrees closely with your independently
  measured 2,355-in-target-668.

---

## 6. Queries behind each claim

All read-only, via `scripts/fra-audio/db.cjs` (`q(sql, params)`, node-postgres, `.env.psql`).

| Claim | Source |
|---|---|
| FK on-delete actions | `pg_constraint` where `confrelid = 'course_audio'` |
| audit trigger semantics | `pg_proc.prosrc` for `audit_content_change` |
| no delete/null at 16:08Z | `content_audit_log` filtered to 2026-08-04 15:30–17:00Z |
| timestamp signature | `course_practice_phrases` grouped by `updated_at` in the window |
| the no-op UPDATE | commit `050030b6` + `database/migrations/20260804_link_all_audio_ids_skip_no_op_updates.sql` |
| the 08-03 purge | `content_audit_log` DELETEs, `old_row->>'voice_id'`, `old_row->>'role'` |
| replacement coverage | `content_audit_log` DELETE rows anti-joined to live `course_audio` |
| S3 survival | `HeadObjectCommand` against `ssi-audio-stage` |
