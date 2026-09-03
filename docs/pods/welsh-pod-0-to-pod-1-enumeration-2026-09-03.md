# Welsh pod-0 → pod-1: the enumeration, and why I stopped before writing

*2026-09-03, 00:50. Written after Half One landed and after job #177 finished.*

## The headline

**I did not do the Welsh rename.** Two facts came out of the enumeration that the
brief's own risk assessment did not have, and the brief says explicitly: *"If ANY
step looks riskier than described once you have the real row counts, STOP and report
rather than pressing on."*

Everything else asked for is done, live and verified.

---

## Fact 1 — Welsh pod-0 has real learner progress on it

The brief: *"Welsh pods are NOT live to learners yet, so there is no learner-progress
exposure."* That is not what the table says.

| course | `learner_pod_state` rows on `:pod-0:` | distinct learners | real humans¹ | exposures |
|---|---|---|---|---|
| cym_n_for_eng | 45 | 3 | **3** | 738 |
| cym_s_for_eng | 59 | 1 | **1** | 59 |
| **total** | **104** | **4** | **4** | **797** |

¹ `realHumanLearners()` — joined `learners.user_id → auth.users.id`, excluding
school-demo, internal-staff, rehearsal-clone and machine-speed ids. Zero were
excluded on either course: all four are real people with real auth rows. Earliest
row 2026-07-18, latest 2026-08-23.

All 104 rows resolve to a live sentence today. A rename orphans every one of them —
that is precisely the `nld_for_eng` defect of 2026-08-24 (job #227, 14 rows, repaired
by hand afterwards), except 104 rows and four people instead of one.

The rows *are* trivially carryable: a rename rewrites only the slug segment, so
`cym_n_for_eng:pod-0:SC03-S003 → cym_n_for_eng:pod-1:SC03-S003` is one-to-one, same
sentence, same position, nothing inserted or reordered. But the brief says **"NEVER
touch learner progress rows"**, and that instruction was written believing there were
none. Carrying them and refusing to carry them are both defensible readings of what
you wrote; they are not the same act, and picking one of them silently at 00:50 is
not my call.

## Fact 2 — the rename rewrites the exact ids the recordists are served, hours before they record

The rename's primary act is rewriting the primary key of **462** `listening_pod_sentences`
rows (231 per Welsh course). Those ids are what `/api/recording/voice/:voiceId` hands
Aran and Catrin, and what an upload posts back against. Any browser tab open across
the cutover, or any take in flight, points at an id that no longer exists.

#177 declined a much smaller change — a `speakers` JSON rewrite — on exactly this
timing argument, and it was right to. A 462-row primary-key rewrite carries more of
that risk, not less, and the brief itself notes the pod lines are only 54 of Aran's
387 and 113 of Catrin's 428: the upside tonight is a label.

**My recommendation: do the rename after tomorrow's session, not before it.** The
cutover is not hard — it is one transaction over the five tables below — it just has
no reason to happen in the seven hours before two people sit down to record on those
rows.

---

## The enumeration you asked for

Every text/varchar/jsonb/array column of every base table in `public` was scanned for
`cym_%_for_eng:pod-0%`. 7 columns hold a reference. Row counts as at 00:45, nothing
written:

| table.column | rows | what it is | in a cutover |
|---|---|---|---|
| `listening_pod_sentences.id` | 462 | the slot key, primary key | **rewrite** (231 + 231) |
| `listening_pod_sentences.pod_id` | 462 | FK → `listening_pods.id` | **rewrite** |
| `listening_pods.id` | 4 | 2 live `pod-0` + 2 archived `pod-0-gated-2026-08-06` | **rewrite the 2 live only** |
| `listening_pods.title` | 2 | title strings naming the slug | rewrite |
| `learner_pod_state.sentence_id` | 104 | **4 real learners' progress** | **YOUR CALL — see Fact 1** |
| `recording_provenance.quality_notes` | 218 | free-text notes naming the slot | provenance; nothing joins on it |
| `content_audit_log.primary_key` | 4,224 | audit history | **never** — a log records what *was* |

**Nothing else references them.** Specifically checked and clean (zero rows):
`course_audio`, `course_audio_revisions`, `course_audio_usage`, `course_audio_envelope`,
`audio_clips`, `audio_clip_flags`, `audio_clip_promotions`, `audio_clip_signoffs`,
`audio_flags`, `audio_pass_requests`, `audio_repair_candidates`, `audio_convergence_log`,
`shared_audio`, `target_audio`, `content_audio_link_drops`, `pod_legos`,
`canonical_pod_scenarios`, `canonical_pod_walk_steps`, `canonical_script_versions`,
`course_sectors`, `course_practice_phrases`, `language_recording_policy`.

**Recorded takes and audio are safe by construction.** They are not referenced by pod
id at all: a take is a `course_audio` uuid held in a *column* of the sentence row
(`target_audio_id`, `known_audio_id`, `sentence_audio_ids`, `takeg_audio_ids`), and
`recording_provenance` keys on that uuid. Rewriting `id`/`pod_id` carries every one of
those columns with the row untouched. Zero audio rows would be read, written or
deleted.

### Named gaps

* `content_audit_log.old_row` (jsonb) could not be scanned inside a 120s statement
  timeout — the table is too large for an unindexed jsonb `like`. It is an audit log
  and would not be rewritten in any case, so this is a gap in the *census*, not in the
  plan.
* The archived `cym_*:pod-0-gated-2026-08-06` rows hold **0 sentences**, not the 142
  the brief describes — the sentences were moved off them at some point. Left
  untouched either way, as instructed.

## Invariant baseline, taken twice tonight

`tools/recording/verify-take-invariant.cjs cym_n_for_eng`, before any of my work and
again after all of it — **byte-identical, and identical to #177's**:

```
cym_n_for_eng: 231 lines, 462 tracks checked
  agree (recordist file === learner file): 156
  slot holds no human take (TTS/other):    0
  DISAGREE (different file served):        0
  learner silent while a take exists:      0
  serving a take a human marked 'bad':     64
```

The 64 is pre-existing — 32 takes a human flagged `rerecord_wanted`, across two tracks
(#177's finding).

## Recordist queues, live, after everything

| | total | recorded | remaining |
|---|---|---|---|
| Aran — #177 left it at | 413 | 26 | 387 |
| Aran — mine, 00:48 live | **413** | **26** | **387** |
| Catrin — #177 left it at | 466 | 38 | 428 |
| Catrin — mine, 00:48 live | **466** | **38** | **428** |

## The one decision

**Welsh pod-0 → pod-1: when, and what happens to the 104 learner rows?**

- **A. After tomorrow's session, carrying the 104 rows 1:1** (my recommendation). The
  carry is provably lossless — identical tails, identical sentences — and leaving them
  behind is the mis-credit the migration protocol exists to prevent.
- **B. Tonight, carrying the 104 rows.** Same write, seven hours before two people
  record on those exact ids.
- **C. Either time, discarding the 104 rows.** Four real learners lose their Welsh
  progress. I would not.
- **D. Not sure — leave it parked.** Costs nothing; nothing depends on the label.
