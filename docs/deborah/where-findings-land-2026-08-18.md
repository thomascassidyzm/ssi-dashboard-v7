# Where a reviewer finding has to land to get worked on — 2026-08-18

**Read-only scout for Kai.** No content changed, nothing written to Supabase, no audio, no spend.
Question: when Deborah reports a course-content defect, where does it have to go so it is
actually picked up *today*? Written for a watcher that must join the existing mechanism rather
than invent a parallel one.

---

## The one-paragraph answer

**There is no feedback-queue table that anyone works from.** All five candidate tables exist;
none is a live human-review queue. The mechanism that actually moves a Deborah finding into
applied work is a three-step human loop with no database in it: her words land in **repo markdown
under `docs/deborah/`**, a worker triages and **publishes a doc**, and that doc becomes a **card on
a human's board** (Tom's plate, or Kai's `needs-you` board) carrying one answerable question. The
ruling on that card is what dispatches the worker that does the fix. So a watcher needs **two
writes, not one**: a durable repo record, and a card that puts the item in front of a human. The
repo write alone is a filing cabinet — the estate has 26 finished reports from a single Saturday
that nobody read, and eight of Deborah's ten Lebanese-Arabic comments sat unread for a day for
exactly this reason.

---

## 1. The five tables: what is live, what is a sink, what is dead

Queried live via `.env.psql` at 2026-08-18. All five exist.

| Table | Rows | Newest row | Last 7d | Read by a human surface? | Verdict |
|---|---:|---|---:|---|---|
| `content_feedback` | 2,072 | 2026-08-05 | 0 | Yes, but nobody looks | **Write-only sink** |
| `course_qa_flags` | 604 | **2026-05-14** | 0 | Yes — `QAReview.vue` | **Real design, abandoned 3 months** |
| `sample_flags` | 17 | 2026-08-16 | 1 | Yes — recorder flow | **Live, but a different job** |
| `audio_clip_flags` | **0** | — | 0 | Only in a worktree branch | **Not on main — aspirational** |
| `audio_flags` | 48,867 | 2026-08-17 | 1 | Yes — Audio Pipeline UI | **Live machine queue, audio only** |

### `content_feedback` — a sink, not a queue
2,071 of the 2,072 rows were written by one machine author, `phase8-presentation-author`
(`services/phases/presentation-author.cjs:297`), as `presentation_author_flag`. The single human
row is a `guest-…` learner from 2026-01-12. **Zero rows have ever been resolved** — `resolved_at`
is NULL on all 2,072. A read path does exist and is mounted: `services/production-api.cjs:3308+`
serves `/api/production/:course/feedback/{aggregated,stats,resolve}`, and
`src/views/production/UserFeedback.vue` is routed at `src/router/index.js:626`. So the surface is
reachable — but in seven months not one flag has been actioned through it. A table nobody resolves
is not a queue.

### `course_qa_flags` — the only table with the right shape, and it is cold
This is the closest thing in the estate to a content-defect queue: `check_type`, `severity`,
`issue`, `details` jsonb, `status` open/resolved/ignored/false_positive, `resolved_by`,
`resolution_notes`, and per-item anchors (`phrase_id`, `seed_number`, `lego_id`). It has a genuine
worked history — 474 of 604 rows carry a resolution, including 393 correctly marked
`false_positive`. It is read by live code: `services/course-builder/routes/qa.cjs` (~15 call
sites) behind `/api/qa/flags/:course?status=open`, rendered by
`src/views/production/QAReview.vue:220`. **But the newest row is 2026-05-14 and nothing has moved
in three months.** Its author was an automated QA pass, not a human reviewer.

### `sample_flags` — live, but it is the recording flow
17 rows. The three recent ones (2026-08-06, 2026-08-16) are `zzz_test_for_eng` probe rows written
by the recorder path (`Recorded by … at …`, status `needs_review`). The 2026-02 rows are
`QA_Agent_3rd_Pass` text flags. `services/production-api.cjs:3203` labels it
"LEGACY FLAGS (old sample_flags table — keep for backwards compat)". Not the destination.

### `audio_clip_flags` — **zero rows, and not on main**
Well-designed (source/detector/severity/metrics/resolution), and there is a careful gate module
that owns it — but `services/course-qa-gate.cjs` and `services/audio-tail-scan.cjs`
**do not exist on the current checkout**. Every code reference is inside `.worktrees/edit-impact`
and `.worktrees/a134-ge`. It is unbuilt work, not a queue.

### `audio_flags` — genuinely live, and genuinely not for this
48,867 rows, 16,311 in the last 30 days, and a real consumer: `phase8-audio-v13.cjs:2669` reads
`status='flagged'` to decide what to regenerate, incrementing `regen_count`. This is a working
machine queue. But its authors are `gender-prep` (31,849), `dashboard_user` inline regeneration
(6,387) and `qa` batches. It flags **audio clips for re-rendering**. A finding like "Build 7 uses
a word introduced three rounds later" has nowhere to sit in it.

**Also present and not worth pursuing:** `tester_feedback` (11 rows), `feedback_aggregated` (a view).

---

## 2. `docs/deborah/*.md` — the de-facto durable record, and who picks it up

18 files, all created 2026-08-17/18, in seven commits starting `e27f19c4`
*"docs(deborah): her 2026-08-17 findings, out of Slack and into the repo"*. The header of
`findings-2026-08-17.md` states the intent plainly: *"Filed here so the findings stop living in a
chat."*

This **is** the de-facto record, and it works as a record. What it does not do is cause anything.
`programme-report-2026-08-17.md` says in its own second line: *"Nothing has been posted to
Deborah."* Nothing reads `docs/deborah/` on a schedule; nothing polls it. It is picked up when a
human dispatches a worker and names the file in the brief.

**One thing you must know before you build:** `tools/deborah/basecamp-column-watch.cjs` **already
exists**, dated today 11:28, **uncommitted** (`??` in git status). It is a complete, working,
read-only Basecamp column watcher for the Creu Cyrsiau card table (project `26277678`, card table
`7038571695`, "Content checking" column), with pagination, durable diff state at
`~/.local/state/deborah-watch/state.json`, and reviewer filtering to Deborah's own comments. It
writes to `docs/deborah/queue/<YYYY-MM-DD>.md` and `docs/deborah/review-progress.json` — **neither
of which exists yet**, so it has not had a productive run. Its header comment names your exact
problem: *"Two reached our queue. The other eight sat unread."* Either that is your watcher already
half-built by a concurrent worker, or you are about to build it twice. **Check this file first.**

Note also: Deborah's findings are on the **Creu Cyrsiau card table**, not the "Deborah" Basecamp
project. That project's to-do lists are per-course `Content Checking` / `Checking on Stage` cards
with no findings on them.

---

## 3. `WORKLIST.md` — not the queue for this

The claim protocol is real and well-specified. But the last commit touching `WORKLIST.md` is
`ef488faf`, **2026-07-29** — three weeks ago. It holds 15 open and 4 claimed items, all of them
programme-scale directions ("Known-language control policy for the regen prompt"), and its own
header says it is *"not a bug tracker or a subtask list"*. Zero mentions of Deborah. A per-finding
defect does not belong here and would not be seen if it were.

---

## 4. The command surface: plates, cards and commissions are the live machinery

This is where the actual work-starting happens, and all of it is machine-callable.

- **Tom's plate** — `ops/plate.json`, 12 open items, driven by `plate.js`. `plate.js add` **refuses**
  an item with no `--url`, no `--plain` and no `--rec`: a link, one plain-English sentence, and a
  one-word-answerable recommendation. Doctrine, `ops/worker-doctrine.md:698`. The plate is
  **Tom-only**.
- **Kai's plate** — `ops/plates/kai.json` exists and is live: 15 open items, including `S-19`
  *"ara_lb native-reviewer triage complete…"*. It is mostly outbound (done cards, approvals).
- **`needs-you` board** — `POST /api/needs-you` with `"needs":"kai"`. **This is the live inbound
  door**, and it is in current use: Kai has 7 open cards, the newest 2026-08-17, one of them
  *"Italian course, the thing Deborah passed on: five cards in one seed all show the English…"*.
- **Done cards** — `POST /api/done`, actively used (two Kai cards landed this morning, 11:16Z and
  11:25Z).
- **Commissions** — `POST /api/commission` takes a one-line intent plus a `cwd` and asynchronously
  briefs *and dispatches* a real worker. **421 rows, 408 dispatched, most recent today.** This is
  the live door from "a decision was made" to "an agent is working on it".

---

## 5. The trace: how the two Lebanese-Arabic findings actually got worked

Reconstructed from git, `ops/plate.archive.json` and the surface database. Every step is evidenced.

1. **Deborah** leaves ten comments on the Lebanese Arabic card, Creu Cyrsiau board, 2026-08-17.
2. **Kai** pastes two of them into `docs/deborah/findings-2026-08-17.md` (commit `e27f19c4`,
   08-17) — the `ara_lb_for_eng` section, two questions. *The other eight never left Basecamp.*
3. A **worker is dispatched** and triages, producing `docs/deborah/ara-lb-triage-2026-08-18.md`
   and `docs/a108/ara-lb-native-reviewer-triage-2026-08-18.md`. Its own opening line records the
   negative result: *"There is no dedicated review-log table or flag column… `course_qa_flags`,
   `content_feedback`, `sample_flags` and `audio_clip_flags` all return zero rows."*
4. **Two different outcomes, two different routes:**
   - **Finding A (the extra word في, R83)** — low risk, no spend, no rendering. The worker
     **applied it directly** to `S0030L02B03` and verified live. No queue, no card, no ruling.
     It reached "done" because a worker was already looking at it.
   - **Finding B (the `!` on the wrong side)** — cross-repo, learner-facing. The worker
     **published a doc** (`/d/8a73114f`), which became plate item **`A-157`**, *"Arabic exclamation
     mark renders on the wrong side"*, filed **09:42Z**.
5. **Tom ruled YES.** Commission **#18** — *"Tom ruled YES on plate A-157: fix the Arabic
   exclamation-mark rendering bug Deborah…"* — dispatched **09:45Z**.
6. **Merged to main in both repos by 10:15Z**, then a `bidi-live-rollout-check` worker reported the
   fix *not yet live* — the loop closing honestly.
7. A **done card** landed on Kai's plate as `S-19`.

**Deborah's words → repo markdown → published doc → plate card → human ruling → commission →
dispatched worker → merged.** Roughly 33 minutes from card to merge once a human ruled. Zero
database rows involved at any step. The identical pattern is in the archive for
`A-17` (8 course fixes, 08-06), `A-100` (Basque, 08-13) and `A-122` (Basque rulings, 08-16).

---

## The recommendation, ranked

### 1. PRIMARY — write the durable record into `docs/deborah/queue/<YYYY-MM-DD>.md`

Exact path: `docs/deborah/queue/2026-08-18.md`, plus per-course progress markers in
`docs/deborah/review-progress.json`.

**Do not design this format.** `tools/deborah/basecamp-column-watch.cjs` already emits both files,
already handles Basecamp pagination, already diffs against durable state so it reports only what
is new, and already filters to Deborah's own comments so Kai's restating checklists don't
double-queue. Commit it, run it, extend it. Building a second watcher beside it is the exact
parallel mechanism you asked me to help you avoid.

*Why this is the primary write:* it is the only destination with a demonstrated record of a
finding reaching applied, verified, merged work. Seven commits and two live fixes in two days,
against zero in three months for every table.

### 2. MANDATORY SECOND WRITE — a card, or the finding is invisible

The repo write is durable but inert. The card is what causes work.

- **For Kai** (triage, most findings): `POST http://localhost:4317/api/needs-you`, body
  `{"text": "<one plain sentence a person can act on>", "needs": "kai", "url": "<published doc>"}`.
  In current use; 7 open cards on his board.
- **For Tom** (decisions with cost, irreversibility or cross-repo blast radius):
  publish first via `POST /api/publish-doc`, then `plate.js add --list approve --title … --url …
  --plain … --rec …`. The gate will reject the add without all four.
- **Batch, don't spam.** A-157 was one card from a ten-comment card. One card per *course pass*
  with a ranked list beats ten cards per morning; the plate's own doctrine is that a surface
  handing a human items is only half a fix until each row says something a person can act on.

### 3. OPTIONAL — `course_qa_flags`, only if you want a machine-queryable index

If you want findings queryable by course/seed/lego rather than only greppable:

```
course_qa_flags (course_code, check_type, severity, issue, details, status,
                 phrase_id, seed_number, lego_id, resolved_at, resolved_by, resolution_notes)
```
Minimum insert: `course_code`, `check_type`, `issue`. Defaults supply
`severity='warning'`, `status='open'`, `flagged_at=now()`, `id`. Suggested
`check_type='native_reviewer'`, `details` jsonb carrying the Basecamp comment id, card id,
round number and verbatim text.

**Be honest about what this buys you:** it is a *machine index*, not activation. It has been cold
since May, and `QAReview.vue` shows it per-course to someone who has to go looking. It does not
cause work. Write it only alongside (1) and (2), never instead of them. **Do not** use
`content_feedback` (2,072 rows, 0 ever resolved) or `audio_flags` (a render queue — a row there
schedules a regeneration, which is a real side effect you do not want a text finding to trigger).

### 4. If a finding is already ruled and needs execution — `POST /api/commission`

`{"conv_id", "intent": "<one line>", "cwd": "/home/tomcassidy/SSi/ssi-dashboard-v7-clean"}`.
408 dispatched to date. Do not call this on an unruled finding: the human ruling is the gate that
keeps a reviewer's opinion from silently becoming a database write.

---

## GAPS — what I could not verify

- **Whether `tools/deborah/basecamp-column-watch.cjs` is yours.** It was modified at 11:28 today,
  during this session, and is untracked. I did not run it, even `--dry-run`. I cannot tell you
  whether a concurrent worker is mid-build on it or it is finished and unrun. **Check before you
  write a line of code.**
- **Whether anyone opens `UserFeedback.vue` or `QAReview.vue`.** I inferred "nobody works from
  these" from data (0 resolutions in `content_feedback`; nothing moving in `course_qa_flags` since
  May), not from access logs. I found no page-view telemetry to confirm it.
- **Whether `POST /api/needs-you` accepts `"needs":"kai"` from a worker curl.** The handler carries
  an escalation gate added 2026-08-07 that I read but did not exercise — I made no write calls to
  the surface. Test it with one throwaway card before you depend on it.
- **The eight unqueued Lebanese-Arabic comments.** I did not fetch the Creu Cyrsiau card
  (`26277678` / `7038571695`) to confirm they are still there and still unactioned. The watcher's
  own header asserts it; I did not independently verify it.
- **Live `audio_clip_flags` migration state.** It has 0 rows and the owning modules are absent from
  this checkout, but I did not check whether another branch is close to landing them. If that gate
  ships, the honest answer for *audio* findings may change.
- **`.a74-scratch/deborah-ara-lb/`** — a dated set of sweep JSONs from today by an unidentified
  concurrent process, with no accompanying report. Not used as evidence here; flagged for whoever
  owns it.
