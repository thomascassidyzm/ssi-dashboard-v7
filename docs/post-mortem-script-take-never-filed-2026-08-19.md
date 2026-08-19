# How a recording could look saved and never become a clip

*Post-mortem, 2026-08-19. Read-only — nothing here changes any code. The bug is already fixed and merged.*

---

## What happened, in plain English

Popty's course-content recorder — the Autocue Studio — has an upload seam that handles three
different kinds of recording. A **pod** take (a listening-pod line). A **regeneration** take
(re-recording a clip that already exists). And a **script** take (reading the course script for a
new course). All three drop their audio bytes into S3 and write a `recording_provenance` row saying
who read what, when.

Only two of the three ever wrote the row that actually matters: the `course_audio` row. That row is
what makes a clip *servable* — it is what the learner app resolves, what the review screen's play
button reads, what the deploy job copies. Without it, the bytes are in S3 and nothing on earth
points at them.

Script mode never wrote one. So a script take uploaded, returned HTTP 200, showed a tick in the
studio, and could never be played back — by a learner, by a reviewer, by anyone. Kai read 50
Finnish takes on 2026-08-19 before noticing the review screen's play button was dead, and traced it
from there. The fix is commit `b645b2da`, and it is merged: it is the current head of `origin/main`.

The rest of this document is the interesting part — not that a branch was missing, but why three
separate layers of checking all looked straight at it and saw nothing wrong.

---

## 1. When was this path written, and by which job?

**The filing step was never present for script mode. It was not lost — it was never written.**

The order of events is the whole story, and it is a story of a bar being raised twice without the
earliest path being brought up to it.

| Date | Commit | What it did |
|---|---|---|
| 2026-06-10 | `5f4113a8` | The voice-engine audit lands — it *finds* the problem for the whole human-upload path |
| 2026-06-10 | `a62d4a4f` | **Regeneration** mode learns to file: repoints its `course_audio` row, `origin='human'` |
| 2026-06-10 | `4d1823f4` | **Script** mode gets its 500 fixed and `recording-upload-helpers.cjs` is born — no filing added |
| 2026-06-11 | `4760746b` | **Pod** mode is added, and files a `course_audio` row from its very first commit |
| 2026-08-19 | `b645b2da` | **Script** mode finally files, 70 days later |

The audit on 10 June saw it clearly, and said so in the plainest possible terms. Its data-model
table (`docs/voice-engine/audit/03-recorder-upload.md` §2) has one row for human uploads and the
entry reads:

> **NONE.** No insert, no update, no `origin='human'`, ever. Only `sample_flags` (broken) and
> `recording_provenance` (never reached).

So the finding existed, correctly stated, before any of the fixes. What happened next is that the
finding got *answered per-branch*. Regeneration was answered the same day by `a62d4a4f`. Pods were
answered at birth on 11 June. Script mode's answer was architectural rather than code: the voice
engine's synthesis job would file the takes later, at its `register whole-phrase natural takes`
phase (`services/voice-engine/synthesis-job.cjs`, around line 302). That is a real mechanism and it
really runs. But it only runs *if someone starts a synthesis job*, which meant every script take was
unservable in the meantime, with nothing saying so.

You can see the asymmetry frozen into the code itself. In `a62d4a4f` the filing block is guarded by
`if (existingRow)` — and `existingRow` is only ever populated when `!isScriptMode`. Script mode's
identity was *server-minted*, a fresh UUID with no row behind it, precisely because it had no row to
point at. The line that names the modes reads `mode: isScriptMode ? 'script' : 'regeneration'`:
script mode was born as a branch of the *provenance* context, not of the filing path. There was
never a place in the code where a script take's filing was deleted; there was simply never one
written.

**Authorship — partial, with an explicit gap.** All the June commits are committed under Tom's git
identity and carry `Co-Authored-By: Claude Fable 5`, so they were agent-written, and their commit
messages cite the brief they worked from by section (`Audit 03 §2`, `§3 item C`, `06-data-model §5
item F`). That tells us *which brief*, and the brief is in the repo. It does not tell us which job
number. **EXPLICIT GAP: I could not establish the job or worker.** The command-surface ledger's
`jobs` table begins on 2026-06-25, fifteen days after these commits, so there is no record of them
to look up. I am not guessing at a name.

---

## 2. What did the verification at the time actually check?

**Nothing, anywhere, ever confirmed that a script take could be read back and played — until the
fix itself. Every check stopped at "the upload returned success."**

This is the finding, and it holds up under checking rather than assumption.

| Check | Touches script mode? | Its strongest assertion |
|---|---|---|
| `services/recording-upload-helpers.test.js` | Yes, directly | In-memory object shape only — e.g. `expect(ctx.course_audio_id).toBeNull()`. No DB, no HTTP, no S3. 17 tests, all pass. |
| `services/voice-engine/__tests__/provenance-adapter.test.mjs` | Only as a fixture string | Parses `quality_notes` off a hand-built fake row against an in-memory stub |
| `e2e/pod-recording/02-mode1-autocue.spec.js` | **Yes — this is the script-mode e2e** | `expect(res.status()).toBe(200)`. That is the entire upload assertion in the file; there are no DB reads anywhere in it. |
| `e2e/pod-recording/01-cast-and-record.spec.js` | No — pod mode | `select count(*) from course_audio where … origin='human'` → `expect(humanRows).toBeGreaterThan(0)` |
| `docs/recorder-e2e-2026-08-06/report.md` | Yes | Its script-mode probe's "DB duration_ms" column reads `recording_provenance`, not `course_audio` |
| `tools/recordist-tutorial/verify-recordist-tutorial.mjs` | No — separate teaching tool | Asserts the *opposite*: `check('NOTHING uploaded — no POST/PUT/PATCH at all', uploads.length === 0)` |
| `b645b2da`'s own verification | Yes | First serve-back check in the whole history — and it is prose in a commit message, not a committed test |

The sharpest single fact is the middle two rows. The script-mode e2e spec and the pod-mode e2e spec
sit in the same directory. The pod one queries `course_audio` and asserts a row exists. The script
one asserts `200`. The pattern was known, written down, and working — sixteen lines away — and it
was simply never written for the other mode.

And the human test script had the same shape. `docs/voice-engine/READY-FOR-TESTING.md` sets out the
E2E only a human can run. Step 3 is the recording step, and its success criteria are, verbatim:

> uploads succeed, `recording_provenance` rows appear (context JSON in `quality_notes`), S3 keys
> under `mastered/`.

All three of those were true. All three stayed true for 70 days while nothing could be played. The
read-back does appear — but at step 4, *after* a synthesis run, listening to a **spliced** phrase.
That is the far end of the pipeline, and the far end genuinely worked. Verifying the far end is what
made the missing near end invisible: if you only ever listen after running the synthesis job, the
job's filing step covers for the seam's missing one, every time.

That is the shape of the gap, and it is worth stating baldly because it is so counter-intuitive: **a
test that asserts a 200 and a provenance row is true, is passing, is well-written, and tells you
nothing at all about whether a learner could hear the clip.**

**Where the fix leaves us.** `b645b2da` ships `services/script-take-filing.test.js` alongside its new
module — eleven cases, and good ones: they pin the natural/slow split, the known-slot language
choice, and that a database failure reports rather than throws. But they are unit tests against a
fake Supabase, so they assert the *plan* is right, not that a clip came out the other end. The
end-to-end serve-back proof of the fix is still the one-off manual run described in the commit
message, against a second API instance that was then torn down. **There is still no committed
automated check that a take becomes a playable clip.**

---

## 3. Why did the recent Popty chain reviews miss it?

**Because every one of them was examining clips that already exist. None asked whether a take
becomes a clip at all.**

I classified the recording and audio reviews in the window. Of roughly 43 documents, **39 examined
clips that already exist** — 16 on quality (tail clicks, clipping, loudness, wrong voice, veracity,
alignment), 14 on links and coverage (unlinked FKs, cross-course mislinks, reuse accounting,
regeneration relinking, glued-vs-whole), and 9 on the recording programme around the takes (casts,
queues, routing, who has recorded what). Every one of those takes the existence of a clip as its
starting point and asks whether it is the *right* clip. That is a completely reasonable question,
and it was the question that kept finding real defects, which is exactly why it kept being asked.

The prior question — does a recording become a clip in the first place? — has no natural home in
that frame, and the estate's recurring trap made it harder to see: **row counts that look complete.**
A take that was never filed does not appear as a bad row in any of those audits. It does not appear
as a row at all. It was never in the denominator, so every count they produced looked finished.

There is also a reason the frame was inherited rather than chosen. The one architecture document a
reviewer would open to learn what recording does — `docs/architecture/AUDIO_PIPELINE_ARCHITECTURE.md`
§5, "Human Recording Workflow" — lists the writes an upload performs as: S3 object, update
`audio_samples`, insert `recording_provenance`, update flag, emit socket event. There is no
`course_audio` insert anywhere in the canonical picture, step 2 names a table `CLAUDE.md` lists as
deprecated, and script mode does not appear in §5 at all. The document models recording as
*replacing a sample*, never as *creating a clip*. A reviewer reading it would not know there was a
third mode, let alone that it owed a row.

### The near-misses

Four documents had the seam in frame, and each had a good local reason to keep walking.

**The 2026-06-10 audit did not just find it — it prescribed the fix.** Its fix list, item 1:

> **Make the upload write the registry.** Upsert/insert a `course_audio` row … with `origin:'human'`,
> real `s3_key`, `duration_ms`, `voice_id` of the *person*; key S3 objects by a server-minted UUID —
> never a client string. Kills §2 dead-ends 1–2 and the `script-N` collision in one move.

That is `b645b2da`, written 70 days early. What happened is that the item's second half — the
server-minted UUID killing the `script-N` collision — was done immediately in `4d1823f4`, and the
registry half was done for regeneration and pods but answered architecturally for script. One
recommendation, two halves, and the half that got deferred is the one nothing else was watching.

**The 2026-08-11 write-path review put it in a table and marked it "n/a".** Its P2 row reads
`**neither** — no course_audio row is written at all`, then `n/a | n/a | n/a` across revision bumps,
stamps and view refresh, and later `P2 writes no row, so nothing is keyed.` The absence is recorded
precisely and correctly. It read as a non-event because of the question the doc set itself in its
opening line: *what does the write path do to a clip that **already exists**?* Script mode was, by
construction, the case with no clip — so it fell outside the question rather than answering it.

**The 2026-08-10 autocue scoping review named it as a section heading** — "1.4 Upload writes no
`course_audio` row" — and then met its consequence and scoped it as timing: "pruning only reflects a
session *after* a synthesis job has run." It had the mechanism that made "late" plausible, quoting
the engine's own comment that a recorded whole-phrase natural take always beats splicing it. The
absence was read as **late**, not as **never**. It was load-bearing enough to shape a paragraph.

**The Welsh state-of-the-nation on 2026-08-07 set up the subtraction and did not perform it.** It has
a section headed "5. Take → stored clip" — exactly the right unit, named — and on the same page
reports `recording_provenance` holds 142 rows estate-wide while counting clips from `course_audio`.
A take count and a clip count, one page apart. The subtraction was out of scope because the doc's
scope was Welsh, where the provenance figure was zero, so the 142 was reported and passed over.

### The one that came within a single click

One document came within a single mouse click, and it is worth quoting because it shows how
reasonable the wrong turn was. `docs/pods/e2e-recording-proof-2026-07-17.md` saw the exact symptom
and traced it correctly:

> Mode 1 (New Course) looked at first like it silently dropped recordings — the S3 upload succeeds
> and returns 200, but no `course_audio` row appears right away. … the `course_audio` INSERT only
> happens for **regeneration mode** (re-recording an existing row by real uuid) and **pod mode**.

That is the bug, described accurately, 33 days early. The next sentence is:

> This isn't a gap

— and the reasoning behind it was sound. The UI genuinely says what it says: `ModeSelector.vue`
lists "Batch review and approval" as a Mode-1 feature, and `SessionReview.vue` says "Review
AI-detected segments and approve for upload." From that copy, a two-phase design is the natural
reading: record → review → approve → *then* it becomes a clip. The observation fitted the story, so
the story was believed.

The document was also scrupulous about what it had not proved. It flagged its own uncertainty —
that the suite "didn't drive far enough into that screen to prove it" — and wrote the exact
verification step needed as step 7 of a manual pass:

> confirm approving a segment there is what makes it real, playable audio. That's the one piece this
> suite proved reaches the review screen but didn't click through.

As far as the record shows, that click never happened. The honest caveat was filed, and then the
plausible explanation did the work the caveat was meant to hold open. The architecture's real answer
turned out to be neither the doc's guess nor nothing: there was no approve-step filer at all, and
the actual second-stage filer was the synthesis job, which only runs when someone starts one.

There is a small, exact coincidence that makes the point better than any argument. The oldest
unfiled script take in the database is dated **2026-07-17** in the course `zzz_test_for_eng` — that
is that document's own test course, on that document's own day. The evidence of the bug was created
by the run that noticed it and explained it away.

---

## What the database says

Read-only queries against the live DB, joining `recording_provenance` (whose `quality_notes` holds
the take context as JSON) to `course_audio` on the S3 key.

**The commit message's measurement is confirmed.** Of the script-mode takes recorded on 2026-08-19
*before* the fix landed at 17:07 UTC, none had been filed at the time the fix was written. All 19
pod takes from the same afternoon were filed.

**But the population is much wider than one day**:

| Mode | Takes | Filed | Unfiled | First | Last |
|---|---|---|---|---|---|
| pod | 200 | 136 | 64 | 2026-06-15 | 2026-08-19 |
| script | 208 | 17 | 191 | 2026-07-17 | 2026-08-19 |
| regeneration | 1 | 0 | 1 | 2026-08-16 | 2026-08-16 |

191 unfiled script takes, across five weeks and four courses — `fin_for_eng`, `deu_at_for_eng`, and
the `zzz_test_for_eng` test course. Kai's 50 Finnish takes are the visible tip of it. *(Those 50 are
out of scope here — Watson has separately asked Kai about backfilling them from S3, and a backfill
was in flight while this was being written; that is also why 12 of the 2026-08-19 takes show as
filed in a single burst at 17:19 UTC, minutes after the fix. They were not filed at the time the
commit message measured them.)*

After the fix, the split is exactly the fix's stated design: natural-cadence takes filed 10/10, slow
cadence deliberately 0/11.

**One observation for Tom, not investigated:** 64 pod takes are also unfiled. Most look benign —
re-records superseded by a later take at a fresh key would show this way — but 48 of them are a
single `zzz_test_for_eng` run on 2026-07-17, and 6 are in `cym_n_for_eng` on 2026-06-15, which is
real Welsh. I have not looked further and I am not proposing anyone does; noting it because it is
the kind of thing that is cheap to check now and annoying to discover later.

---

## The one change

**Make a take that never became a clip a visible, standing number — one query, reconciling
`recording_provenance` against `course_audio`, reported per mode per day, that should read zero.**

Concretely, as a one-line commission: *add a takes-versus-clips reconciliation to the recording
dashboard — for every `recording_provenance` row, does a `course_audio` row exist at its S3 key? —
grouped by mode and day, with any non-zero count for a natural-cadence take surfaced as an alert.*

Tom's instinct — verify by reading back rather than by upload success — is exactly right, and this
is that instinct moved from the test suite to the ledger. Here is the sentence for why it belongs
there rather than in a test.

A read-back assertion in the script-mode e2e would have caught this bug. But the failure was *a mode
without a branch*, and a per-mode test has precisely the same weakness: it only exists for the modes
someone remembered to write it for. That is not hypothetical — the pod spec had the read-back check
already, in the same directory, and the script spec did not. Adding a second copy of that check
fixes the case we now know about and leaves the fourth mode, whenever it arrives, exactly as exposed
as script mode was.

The reconciliation has no such blind spot, because it is written against the population rather than
against a path. Every take checks itself. A new mode that forgets to file shows up on the day it
ships without anyone writing a new test. A regression in the fix that just landed shows up the same
way. And it is cheap: I wrote the query for this post-mortem in about ten lines of SQL, and it found
191 unfiled takes going back to 17 July — nearly four times the incident itself, five weeks earlier,
across three courses nobody was looking at. It would have gone amber on 2026-07-17, the day the
near-miss document was written, and Kai would not have lost 50 takes five weeks later.

It is also the smallest possible addition to what the estate already does. The Welsh
state-of-the-nation had both halves of this subtraction on one page on 7 August. The commit message
that fixed the bug ran exactly this query, by hand, on one course, on one afternoon. All that is
missing is running it on all of them, all the time.

One number. It should be zero. When it is not, someone recorded something that will never be heard.

---

*Read-only throughout. No code, content, or database rows were changed in the writing of this
document. Query scripts used are in the gitignored `scripts/` workspace.*
