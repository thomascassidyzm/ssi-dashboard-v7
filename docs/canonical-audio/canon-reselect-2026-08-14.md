# An unaccepted proposal is never canon — 623 identities, rule fixed first

**2026-08-14. Live database. Every claim below verified on bytes fetched from the serving endpoint.**

Tom's ruling: the human-outranks-canon doctrine applied from the other direction. A take
**proposed** for a human decision and never accepted must never become canonical.

## What was wrong

Canon selection ordered by origin, then veracity, then **oldest** `created_at`. For 623
identities the oldest member row pointed at a `repair-candidates/` object — a proposal
awaiting a human decision that never came.

**All 623 were fetched individually. 623 of 623 returned HTTP 403.** Not a sample. The
estate's canonical clip for those lines was audio no learner could hear and no human had
approved.

| Prefix | Broken canons | Serves? |
|---|---|---|
| `repair-candidates/` | 597 | **403** |
| `mastered-v2/` | 26 | **403** |

## The rule, fixed in three places

**`CHECK audio_clips_serving_prefix` — an allow-list, not a deny-list.** A deny-list of
`repair-candidates/` would have said nothing about `mastered-v2/`, which was equally dead and
which nobody had thought about. A new prefix is now suspicious by default and must be admitted
deliberately.

Proven to bite:

| Test | Result |
|---|---|
| INSERT a `repair-candidates/` canon | **rejected** |
| INSERT a `pending/` canon | **rejected** |
| UPDATE an existing canon onto a bad prefix | **rejected** |
| INSERT a valid `mastered/` canon | accepted |

Also fixed: the backfill's candidacy clause, and the BEFORE INSERT trigger function (file
only — **the trigger itself stays dropped** per the standing hold).

### Why NOT VALID

289 of the 623 have **no serving member anywhere** — every `course_audio` row pointing at them
is itself on a dead prefix. There is no correct value available and inventing one would be a
guess. A validated constraint would have to be bought by deleting or falsifying those rows,
neither approved nor honest.

`NOT VALID` binds **every INSERT and UPDATE from now on** — which is the whole ask — while
leaving those 289 visible as the declared gap they are. `VALIDATE CONSTRAINT` will fail loudly
until they get a real take. That failure is a better reminder than a comment.

## The data

| | |
|---|---|
| Broken canons found | 623 |
| **Re-selected onto a verified serving take** | **334** |
| No serving take exists anywhere — declared gap | **289** |
| Canon health after | **746,246 of 746,535 serving (99.96%)** |

Selection used the same ladder as the original backfill — human, then veracity-passed, then
measured, then oldest — restricted to members on the serving prefix.

## Verification

- **Before the swap:** all 334 replacement objects fetched from the public endpoint. **334/334
  real MP3s**, none under 1KB.
- **After the swap:** all 334 re-fetched. **334/334 still serving real audio.**
- **Reversibility:** all 334 logged to `audio_clip_promotions` with the superseded key,
  reason `reselect_nonserving_canon`. No S3 object deleted.
- **Canon only:** `content_audit_log` records **zero** `course_audio` writes for this pass.
  Triggers were left **enabled** precisely so that claim could be checked. **Nothing a learner
  hears today changed** — this fixes canon for future reuse.

## The declared gap, and a separate finding

The 289 unrepairable identities span **3 courses: `deu_for_eng`, `ell_for_eng`, `zho_for_eng`**.

Separately, and pre-dating all of this work: **1,379 `course_audio` rows across the estate point
at objects a learner cannot fetch** — 1,303 `repair-candidates/`, 26 `mastered-v2/`, 50
`pending/`. Those are learner-facing silences today, independent of canon. Out of scope here,
but they should be someone's next job.
