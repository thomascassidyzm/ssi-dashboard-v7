# French missing audio — unlinked vs truly missing

**2026-08-05.** Tom's question on `popty.app/production/fra_for_eng/audio-preview`: *"this seems
like a lot missing — I wonder if it should first see if the files are merely unlinked. I can't
believe there are that many missing from ANY course — unless we deleted all clips with a click in
them."*

Both halves of the instinct were worth checking. Here is what storage and the database actually say.

---

## The answer in one line

**They are not unlinked. 2,618 of the 2,620 are genuinely absent — no audio row, no file, nothing to
link.** 2 slots were merely unbound, 31 more can be filled by copying audio already rendered in this
course's own voice for another course, and **zero** of the course's 49,098 existing clips point at a
file that has gone missing from storage.

| Bucket | Count | What it costs |
|---|---|---|
| **Truly missing** — no audio anywhere | **2,587** | TTS |
| of which: `known` (English prompt) | 1,254 | |
| of which: `target2` (French, Leo) | 1,087 | |
| of which: `target1` (French, Eve) | 14 | |
| of which: LEGO intros still to author | 263 | text authoring + TTS |
| **Copyable** — same text, this course's voice, already rendered elsewhere | 31 | free, `/generate` does it |
| **Unlinked** — audio exists here, slot unbound | **2** | free, one link |
| **Storage-broken** — row points at a file that's gone | **0** | — |

Every one of the 34 copy candidates was HEAD-checked in the bucket: all alive, all in `xai_eve`, the
course's own known-side voice.

---

## How this was established

**The unlinked check, done properly.** A slot counts as "has audio" when a `course_audio` row exists
with the same normalised text, language and role. All 2,355 unbound phrase/lego/seed slots were
re-derived directly from the database and matched against all 49,098 French audio rows: 2 matched.
Loosening the match (punctuation, spacing, trailing `?`) adds 7 more — near-misses like `d'` vs `d`
that are different renders, not the same clip.

**Cross-course, and why it mostly doesn't help.** 1,011 of the 2,029 distinct missing texts *do*
exist in another course. Nearly all are in the wrong voice — `azure_en-GB-SoniaNeural` for the
English side, `azure_fr-CA-AntoineNeural` and friends for French. That is precisely the Azure voice
class the estate has been sweeping *out*; binding them would reintroduce the wrong-voice defect the
last fortnight's work removed. Filtered to this course's configured voices, the recoverable set is
14 distinct texts (34 candidate rows across courses), all verified alive in S3.

**The reverse defect, checked too.** Every one of the 49,098 `course_audio` rows for
`fra_for_eng` had its `s3_key` HEAD-checked against the bucket. **0 dead links.** The detection was
validated against a deliberately fake key first, so the all-clear is a measurement, not an
assumption.

---

## Why the number appeared

Not a deletion of clicked clips. It was a **re-voice that didn't finish**, and the database keeps a
full audit trail of it: `course_audio` and `course_practice_phrases` both carry AFTER-DELETE-OR-UPDATE
audit triggers writing the old row into `content_audit_log`.

**2026-08-03, 14:18:55–14:19:52 UTC — the purge.** 31,310 `fra_for_eng` audio rows were deleted in
157 batches of 200, ~0.6s apart. **Every single one was an Azure voice** —
`azure_en-GB-SoniaNeural` (14,791 known), `fr-FR-HenriNeural` (14,476 target2), 1,534 presentations,
and a scatter of Libby/Hollie/Ryan siblings. Nothing in a current house voice was touched. The audio
FKs are `ON DELETE SET NULL`, so every phrase slot pointing at those rows was nulled in the same
breath — 33,471 audited phrase updates in that hour.

**14:29:58–17:17 UTC — the re-render.** Eleven minutes later the replacement run started on the
house xAI voices: 12,648 `known` (`xai_eve`), 12,473 `target2` (`xai_leo`), 2,163 presentations.

**It didn't cover everything.** Matching each deleted clip's text against what exists today:

| role | deleted | replaced | never replaced |
|---|---|---|---|
| known | 14,983 | 12,807 | 2,176 |
| target2 | 14,793 | 13,718 | 1,075 |
| presentation | 1,534 | 351 | 1,183 |
| **total** | **31,310** | **26,876** | **4,434** |

That is course-wide; the 2,355 unbound slots on the dashboard are the subset inside release target
668. The never-replaced clips were real rendered audio, not placeholders — zero `pending/` stubs,
zero null durations, ~2.5s average.

**The 08-04 16:08 timestamp is a red herring.** 1,972 phrase rows do share an `updated_at` in that
minute, but no audit row exists for any of them — because nothing was overwritten. That was
`link_all_audio_ids` running `UPDATE … SET x = (subquery) WHERE x IS NULL`, writing NULL over NULL
on rows that were *already* broken. Postgres still bumps `updated_at`. Commit `050030b6` fixed
exactly that no-op 93 minutes later. The nulls predate the sweep; they are what made those rows
eligible for it.

**The purged Azure clips are still in S3** — `HeadObject` on a sample of the deleted rows' keys
returns them present; none of the repair tools issue `DeleteObjectCommand`. So the old audio is
orphaned, not destroyed. But it is the discontinued voice class the whole re-voicing programme
existed to remove, so putting it back is not a recovery — it is a regression. The fix is to render
the gap on `xai_eve`/`xai_leo`.

Coverage detail worth noting: **seeds 1–50 are complete** — nothing below seed 51 is missing on the
known side. The gap is scattered across 421 distinct seeds from 51 to 668.

**GAP, stated honestly:** the *process* that ran the 08-03 purge cannot be named. No commit lands in
that window, no agent transcript mentions `fra_for_eng` on 08-03, and the popty services were only
put under systemd supervision at 16:47 on 08-04, so nothing captured their output. What is proven:
service-role credentials (no authenticated user), 200-row batches, selecting strictly on Azure
voices, followed 11 minutes later by an xAI re-render — and the same actor repeated the pattern on
`deu_for_eng` 22 minutes later. Most likely an ad-hoc purge-then-regenerate script; unproven.

---

## What changed on the dashboard

`popty.app` now separates the three states instead of adding them together
(commit `883136d6`, live):

- **Total Missing** — no audio exists. The only bucket that costs money.
- **Unlinked** — audio exists in storage, the slot just isn't bound. Free.
- **Copyable** — the same text is already voiced in this course's voice for another course.
  `/generate` binds it by copy, no TTS.
- **Storage broken** — a bound row naming an object the bucket doesn't have. New state; French
  currently has none.

The panel also now *asks storage* before it calls something linkable: the linkable set is
HEAD-checked against S3, and a row promising audio the bucket doesn't have is counted as missing
rather than offered as a free link. The check is bounded to that set — one HEAD per distinct object,
usually tens — so it costs nothing on a page load.

---

## What has NOT been done

**Nothing has been re-rendered.** No TTS was spent on this investigation. The 2,587 genuinely-absent
clips are the unfinished tail of the 08-03 re-voice, but finishing it is spend, and spend is Tom's
call.

For scale: ~2,000 phrase clips plus 263 authored intros inside the release target (4,434 course-wide
if the out-of-scope tail is included). The comparable German batch ran at roughly 2 cents for 916
phrases, so this is small money — but it is a decision, not an inference, and it stays with Tom.

One thing worth deciding alongside it: the same purge ran on `deu_for_eng` 22 minutes later, so
German may carry the same unfinished-tail shape. Not measured here.
