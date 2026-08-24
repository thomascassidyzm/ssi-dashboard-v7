# T-20 re-record queue load — the mechanism, what was written, what could not be

2026-08-14. Course `cym_n_for_eng`, pod-0. Input: the 107-line re-record list cut at commit `3fc360c3`
(92 Aran, 15 Catrin).

**Headline: the engine has no pending-task table. "Outstanding" is derived, not stored — so 81 of the
107 cannot be queued without unlinking real, playable audio. Those 81 were NOT written. 10 lines whose
audio is verified dead were queued. 15 lines cannot reach Catrin's queue at all, because the engine
gives every English line to one explainer voice, and that voice is Aran.**

---

## 1. The mechanism

There is no `*_queue` table, no recording-task row, no assignment record. A recordist's queue is
computed on every request from the pod sentences plus the cast.

**Route** — `services/voice-engine/pods-router.cjs:475`
`GET /api/production/:courseCode/pods/recording-plan?voiceId=…`, the only thing
`src/components/production/autocue/PodLongTakeStudio.vue:452` fetches.

**Who gets which lines** — `services/voice-engine/pods-plan.cjs:154` (target) and `:161` (known):

- a **target** (Welsh) item is emitted for voice V when `podCast[speaker].voiceId === V`;
- a **known** (English) item is emitted **only when V is the `__explainer__` cast entry** — the
  character does not matter. `pods-plan.cjs:161  if (isExplainer) { if (known) push(...) }`.

**What makes a line still-to-record** — `services/voice-engine/pods-plan.cjs:242`:

```js
const isRecorded = !!(a && a.origin === 'human' && accept.has(a.voice_id))
```

where `a` is the `course_audio` row pointed at by the sentence's `target_audio_id` /
`known_audio_id` (`pods-plan.cjs:216`), and `accept` is the queue's voice id plus its
`voice_config.podCastAliases` (`pods-router.cjs:496`). `totals.remaining = items - recorded`
(`pods-plan.cjs:276`); the studio resumes at `firstUnrecordedIndex`
(`src/utils/podRecordingPlan.js:198`).

**So the exact write that makes a line pending is: set the sentence's `{kind}_audio_id` to NULL** (or
repoint it at a non-human / other-voice row). That is the only lever. There is no flag, no status, no
severity, no "re-record" endpoint — `pods-router.cjs` exposes exactly five routes (`/cast`,
`/cast/propose`, `PUT /cast`, `/recording-plan`, `/drafts`, `PATCH /sentence/:id`) and none of them
can mark a recorded line as wanted again.

Dead ends checked and ruled out: `audio_clip_flags` (0 rows, referenced only in two docs, wired to
nothing); `sample_flags` (16 rows, script-mode only — `services/production-api.cjs:4645` says in
terms "Pod-mode takes also skip — pod sentences have no `sample_flags` row"); `audio_flags` (48,866
rows, the TTS-QA regen loop, not a human queue); `recording_provenance` (a log of takes made, not a
list of takes wanted).

**Side effect of the only lever.** A NULL `known_audio_id` is an overloaded signal: it is also what
enrols a line in the pod TTS bulk render (`services/pod-bulk-migrate.cjs:431`,
`if (!s.known_audio_id && s.known_text)`). That path is approval-gated, so nothing renders on its
own, but it means "queue this for a human" and "queue this for TTS" are the same bit.

## 2. State found (all 107, before any write)

| | n | pointer state | counted as |
|---|---|---|---|
| Aran, clipped Welsh target | 81 | 79 point at the clipped clip, 2 already re-pointed at a newer Aran clip; all `origin=human`, voice `human_aran_cym_n` or its alias `human_aran_cym_n_2` | **recorded** |
| Aran, empty English known | 11 | 10 point at an 834-byte stub, 1 already NULL | recorded / outstanding |
| Catrin, empty English known | 15 | 13 point at an 834-byte stub, 2 already NULL | recorded / outstanding |

All 26 stub S3 objects were head-checked: **834 bytes each, every one** (a real clipped take on the
same list is 49,318 bytes). The stubs are dead.

`podCastAliases` = `{human_aran_cym_n: [human_aran_cym_n_2, human_aranv3_cym_n], human_catrinlliar_cym_n: [human_catrinv2_cym_n]}`,
so the 16 clips on `_2` count as Aran's — they are recorded, not orphans.

## 3. What was written

Ten rows, one statement, inside a transaction with a before-state assertion that aborted on drift:

```sql
update listening_pod_sentences set known_audio_id = null, updated_at = now()
 where id in (<the 11 Aran English-known ids>) and known_audio_id is not null;
-- UPDATE 10
```

Only these ten, because they are the one slice where every guard holds at once: the audio is verified
dead (834 bytes), the character is male *and* the explainer is Aran, so both readings of the
assignment agree, and nothing playable is lost — the learner already hears silence there. No
`course_audio` row deleted, no S3 object touched, restore data is the before-state table above.

**Nothing was written for the 81 clipped Welsh lines.** Their audio is real and playable; the only
way to make them pending is to unlink it, which is exactly what make-before-break forbids. Reported
rather than done, per the brief.

## 4. Verification, through the engine's own plan builder

`buildRecordingPlan` + `finalizeRecordingPlan` run against live data for both voice ids:

```
human_aran_cym_n        | items 318  recorded 100  REMAINING 218  | outstanding by kind {"known":218}
human_catrinlliar_cym_n | items 144  recorded   0  REMAINING 144  | outstanding by kind {"target":144}
```

The ten writes land in Aran's queue as `PENDING known` items on the right sentence ids, e.g.
`PENDING known cym_n_for_eng:pod-0:SC01-S003 Neighbour | I'm very well, thank you. Are you going to wo…`.

Per-line reconciliation of the 107:

```
 csv_assignee |   defect   |      track      | n  | now_outstanding | still_counted_recorded
--------------+------------+-----------------+----+-----------------+------------------------
 aran         | clipped    | Welsh (target)  | 81 |               0 |                     81
 aran         | EMPTY STUB | English (known) | 11 |              11 |                      0
 catrin       | EMPTY STUB | English (known) | 15 |               2 |                     13
```

**Final counts against the brief's 92 / 15: Aran 11 of 92 queued, Catrin 0 of 15 queued.**

## 5. Explicit gaps

**(a) The 81 clipped Welsh lines have no non-destructive route.** The engine cannot distinguish
"recorded, and bad" from "recorded". Read-only outcome, as instructed.

**(b) Catrin cannot be given an English line.** The brief's ground truth — Catrin records all female
voices — does not extend to the known track under this engine: `pods-plan.cjs:161` gives every
English line to `__explainer__`, and `cym_n_for_eng`'s `__explainer__` is Aran. So the CSV's
15 English lines for Sarah/Passenger/Barista are, in the engine's terms, Aran's. Writing them would
have put 15 lines in the wrong person's queue, so they were left alone. This is a genuine
podCast-vs-brief disagreement and it is yours to settle, not mine.

**(c) Unrelated but material, found on the way:** Catrin's Welsh target queue is **144 items,
0 recorded** — she has recorded nothing on this course yet, and no female character's Welsh line has
any `target_audio_id` at all. Aran's English explainer queue was already 208 outstanding before this
work. The 107-line re-record list is a small part of what pod-0 is actually missing.

## 6. Smallest change that would give the engine a real pending concept

One nullable column, no new table, no parallel system:
`alter table listening_pod_sentences add column rerecord_wanted text[]` holding the kinds wanted
(`{'target'}`, `{'known'}`). Then one line in `finalizeRecordingPlan`
(`services/voice-engine/pods-plan.cjs:242`):

```js
const wanted = Array.isArray(row.rerecord_wanted) && row.rerecord_wanted.includes(it.kind)
const isRecorded = !wanted && !!(a && a.origin === 'human' && accept.has(a.voice_id))
```

A wanted line goes pending with its audio still linked and still playable — make-before-break by
construction — and the existing take-registration path clears the flag when a new take lands. It also
separates the human queue from the TTS "needs audio" signal, which today share one bit.

Gender assignment for the known track would still need deciding (gap b) before that column could
carry Catrin's 15.
