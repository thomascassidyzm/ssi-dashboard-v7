# Northern Welsh pod-0 — what was put back

**Date:** 2026-08-10 · **Course:** `cym_n_for_eng` · **Status:** applied and verified against the live database

Reverts the accidental 16:44–16:46 UTC Generate diagnosed in
[`cym-n-pod0-19-sentence-move-2026-08-10.md`](./cym-n-pod0-19-sentence-move-2026-08-10.md).

---

## Aran is safe to record

The recording queue is back on his own proofread Welsh. Nothing he records now is wasted.

---

## What was put back

All 19 rows are byte-identical to their pre-16:44 state. Verified by comparing the live rows against
`content_audit_log.old_row` across every column the Generate touched — **19/19 exact on all five**:

| Column | Rows exact |
|---|---|
| `pod_id` | 19/19 |
| `target_text` | 19/19 |
| `known_text` | 19/19 |
| `target_audio_id` | 19/19 |
| `known_audio_id` | 19/19 |

**Pod shapes now** (live DB):

| Pod | Rows |
|---|---|
| `cym_n_for_eng:pod-0` | **0** |
| `cym_n_for_eng:pod-0-unrecorded` | 232 |
| `cym_s_for_eng:pod-0` | 0 *(untouched)* |
| `cym_s_for_eng:pod-0-unrecorded` | 232 *(untouched)* |

An empty `pod-0` **is** the gate: an anonymous learner-side read of
`listening_pod_sentences?pod_id=eq.cym_n_for_eng:pod-0` returns **0 rows**, so the Dialogues tab
hides itself again. The pod header's title is the `[GATED 2026-08-06] placeholder — sentences moved
to cym_n_for_eng:pod-0-unrecorded until Aran/Catrin record them` string once more.

**The damaged lines, restored:**

| Code | Was (machine) | Now (Aran's) |
|---|---|---|
| SC02-S003 | Faint ydy hi i'r dre? | Pa mor bell ydy hi i'r dre? |
| SC03-S003 | Oes gennych chi fwyd? | Ydach chi'n gwneud bwyd? |
| SC03-S004 | Oes gennych chi snacs? | Oes gynnoch chi rywbeth ysgafn? |
| SC03-S005 | Oes gennych chi **grisps**, neu gnau, neu rywbeth? | Oes gynnoch chi greision,… neu gnau,… neu rwbath? |
| SC03-S007 | Ia, hoffech chi'r fwydlen? | Oes,… fasech chi'n licio'r fwydlen? |

---

## Two things the diagnosis got wrong, corrected here

1. **`target_text` was overwritten on 14 rows, not 15.** (`known_text` on 6, as stated.) Both counts
   are now restored in full; the discrepancy changed nothing about what had to be done.

2. **The Generate also nulled `known_audio_id` on 8 rows — and all 8 pointed at Aran's own human
   English recordings** (`origin='human'`, `voice_id='human_aran_cym_n'`), still alive in
   `course_audio` and orphaned since 16:45. The diagnosis read the post-write state, found
   `known_audio_id` null on all 19, and concluded there had never been any English audio. There had.
   Those 8 pointers are re-attached.

   This was the one write that touched an audio column, so it was made **opt-in and separately
   logged** (`--reattach-known-audio`). It re-points at existing clips and detaches nothing.

**Conversely, `target_audio_id` was not nulled on any row.** So the anomaly the diagnosis left open
is real and *inverted*: the generator nulled the known side, not the target, despite
`writeSceneSentences` setting both to null on `origin/main`. Still unexplained; the Popty API is not
running on this box so there is no HTTP log for 16:44. The revert script asserts `target_audio_id` is
unchanged rather than trusting it.

Aran's two target clips (SC01-S001, SC01-S003) came through untouched, `target_audio_id` intact.

---

## How to reverse the reversal

Every write went through `content_audit_log`, which captures `old_row` on each UPDATE — so the revert
is itself reversible. To restore the 16:44–16:46 machine state:

```sql
-- the revert's own audit rows: 19 sentences + 1 header, all stamped 2026-08-10 ~17:5x UTC
select primary_key, changed_at, old_row->>'pod_id', old_row->>'target_text'
from content_audit_log
where table_name in ('listening_pod_sentences','listening_pods')
  and primary_key like 'cym_n_for_eng:pod-0%'
  and changed_at > '2026-08-10 17:00:00+00'
order by changed_at, primary_key;
```

Those `old_row` values are the machine text. Nobody should want them back — this is recorded so the
door is provably open, not because it is a good idea.

**Tool:** `tools/pods/revert-cym-n-pod0-move-2026-08-10.cjs` — dry-run by default, `--apply` to write,
per-row before-state assertions that abort on drift, and a transaction. Logs:
`cym-n-pod0-revert-2026-08-10-{dryrun,applied}-log.json` in this directory.

---

## The hole is closed

`services/pod-dialogue-generator.cjs` now refuses two things before any write and before any model
spend, covering `full` / `sync` / `resume` alike:

- **`assertNoForeignRowIds`** — refuses a generate whose row ids are currently occupied by *another*
  pod's rows, naming the course, the row ids and their real owner. This is the actual mechanism:
  gating a pod by repointing `pod_id` leaves the working copy's rows still carrying the *live* pod's
  id prefix, and `upsert onConflict:'id'` then steals them back.
- **`assertNotGated`** — refuses to replace a pod header whose title carries a `[GATED` marker with
  the generated template.

`force: true` overrides both and logs loudly with a `!!` line. **This is a judgement call and one word
overrules it** — the endpoint already treats `force` as the I-know-what-I-am-doing hatch, so making it
absolute would have broken legitimate rebuilds. Say the word and it becomes unconditional.

Verified live: the guard refuses `cym_n_for_eng:pod-0` naming all 232 rows and their true owner, and
`force: true` produces both override lines. It wrote nothing during testing.

---

## Collateral exposure across the estate

Scanned every pod sentence row for the same landmine — an id prefix naming a different pod than the
row lives in:

| Pod | Rows on the landmine |
|---|---|
| `cym_n_for_eng:pod-0-unrecorded` | 232 — *the course fixed tonight* |
| **`cym_s_for_eng:pod-0-unrecorded`** | **232 — identically exposed** |

**Southern Welsh sits on exactly the same landmine and was never touched today.** It is now protected
on both counts — its `pod-0` is empty *and* carries a `[GATED` title, so a Generate on it trips both
guards. No data change was made to it, per scope.

Everything else is clean. Only four courses hold more than one pod, and the rest are self-consistent:

| Pod | Rows | Ids matching their own pod |
|---|---|---|
| `spa_for_eng:pod-0-unrecorded` | 232 | **232/232** |
| `spa_for_eng:pod-0` | 142 | 142/142 |
| `spa_for_eng:music` / `:travel-situations` | 749 / 72 | all |
| `hrv_for_eng:pod-0` / `:pod-1` | 142 / 180 | all |

**Spanish — checked specifically — is not exposed.** Its `pod-0-unrecorded` was made with
`tools/pods/clone-pod.cjs`, which re-slugs row ids, which is precisely the thing the 6 August Welsh
gating did not do. The guard cannot fire on any generate those courses would legitimately run.

---

## The re-slug was skipped, deliberately

The plan was to re-slug `cym_n_for_eng:pod-0-unrecorded`'s row ids so the two pods stop sharing an id
space. **It was not done, because there is a reference that cannot be safely followed.**

`learner_pod_state.sentence_id` is a plain `text` column with no foreign key, holding **54 rows for
`cym_n_for_eng`** that point at `cym_n_for_eng:pod-0:SCxx-Sxxx` ids — real learner progress. Some use a
*sub-segment* form (`…:SC01-S003:s0`, `:s1`) for chunked takes, so the id space is used as a prefix,
not just as a key. Renaming the sentence rows would silently orphan that progress — no error, no
cascade, just state that stops matching. That is a worse trade than the guard already covers.

There is also an argument it would be wrong on the merits: when this pod is eventually promoted to
live, the right move is to repoint `pod_id` and keep the ids — which is what the 6 August gating did
and what tonight's revert restored. The ids as they stand are what learner state expects.

**The guard alone closes the recurrence risk.** The re-slug was belt-and-braces, and the braces cost
more than they are worth.

---

## Gaps, stated plainly

- **The guard is on `main` but is not running anywhere I can verify.** The Popty API is not running on
  this box (pm2 log last wrote 30 July), and `main` moving does not restart it. It takes effect
  wherever the pod-generator service actually runs, after a deploy and restart that I did not do.
  The **database** fix is live the instant it was written, and that is the part protecting Aran.
- **No unit test was added for the guard.** It was proven against the real live landmine instead,
  which is stronger evidence than a mock, but a regression test is worth adding.
- The `target_audio_id` anomaly above remains unexplained.
- Nobody drove the learner UI as a signed-in Welsh learner. The learner-side check is an anonymous
  Supabase read returning 0 rows — the exact condition the Dialogues tab hides on.
