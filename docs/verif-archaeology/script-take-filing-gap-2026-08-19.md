# Script-mode take filing — what verification actually checked, blameless post-mortem

Read-only research. No code changes, no DB writes. Question: before commit
`b645b2da` (merged to `main`, 2026-08-19), did anything ever confirm a
script-mode recorded take could be **read back and played** — or did every
check stop at upload returning success?

---

## Ledger

One line per check. "Touches script mode?" / "Strongest assertion" / "Asserts
a `course_audio` row or fetches+decodes a clip?"

| # | Check | Touches script mode? | Strongest assertion | Asserts `course_audio` row exists / fetches+decodes audio? |
|---|---|---|---|---|
| 1 | `services/recording-upload-helpers.test.js` | Yes — `isScriptModeUpload`, `buildProvenanceContext({isScriptMode:true, ...})` are directly exercised (`:13-31`, `:66-91`) | Pure in-memory object-shape assertions, e.g. `expect(ctx.course_audio_id).toBeNull()` (`:89`) for script mode | **No.** Never opens a DB connection, never calls the HTTP endpoint, never touches S3. Tests the helper functions in isolation only. |
| 2 | `services/voice-engine/__tests__/provenance-adapter.test.mjs` | Only incidentally — `CTX.mode:'script'` appears in a fixture (`:13`), but the test is about parsing `recording_provenance.quality_notes`, not about upload/filing | `expect(take.courseCode).toBe('mkd_for_fra')` etc. against a hand-built fake row (`:51-62`); `fakeSupabase()` (`:35-47`) is an in-memory stub, never a live client | **No.** No sibling test in that directory touches the upload seam or `course_audio` at all — `pods-registration.test.mjs`, `synthesis-job.test.mjs`, `ffmpeg-roundtrip.test.mjs` etc. are pod/synthesis-only. |
| 3 | `docs/recorder-e2e-2026-08-06/report.md` + its screenshot set | Yes — the results table lists a "script-mode probe" row (report.md:39) and Fault 1/2/3 fixes apply to both script and regeneration mode | "DB duration_ms" column (report.md:37) for the script-mode probe reads from `recording_provenance`, not `course_audio` — no `course_audio` row existed to read from at the time. The 8 automated Playwright checks that DID query `course_audio` (`select count(*) from course_audio where ...`, `e2e/pod-recording/01-cast-and-record.spec.js:118-123`) are **pod-mode only**. | **No, for script mode.** The screenshots prove UI layout at phone viewport widths (390px vs 470px overflow) — a layout/CSS claim, nothing about data persistence. They cannot and do not prove playback. The report's own §"Gaps" is silent on script-mode course_audio, because nobody was asking that question yet. |
| 4 | `docs/recording-upload-write-path-2026-08-11.md` | **Yes, explicitly and correctly.** Row P2 of its per-path table states in plain words: *"Autocue script mode (new course, no clip yet) — neither — no `course_audio` row is written at all"* (`:18`) | This is a **static code trace**, not a test — no live probe, no HTTP call, no DB read beyond schema introspection (see its own §Explicit gaps, `:205-208`: "Runtime confirmation... was not attempted") | It correctly **names the absence** of a `course_audio` row for script mode eight days before the fix, but performs no live verification of its own claim — the doc is diagnosis, not a check. |
| 5 | `tools/recordist-tutorial/verify-recordist-tutorial.mjs` | No. This is a **separate teaching tool** ("standalone recordist tutorial"), not the production recorder. | Its terminal assertion is the opposite of an upload check: `check('NOTHING uploaded — no POST/PUT/PATCH at all', uploads.length === 0, ...)` (`:511`) | **No — it deliberately proves the opposite: that nothing is ever sent to a server.** Out of scope for this question entirely; it never exercises the real upload seam. |
| 6 | `e2e/pod-recording/02-mode1-autocue.spec.js` (found via search, not in original list) | **Yes — this is the actual script-mode ("Mode 1: New Course") automated test.** | `expect(res.status(), ...).toBe(200)` on `/recording/upload` responses (`:56`) — that is the **entire assertion** in the file | **No.** Zero DB reads anywhere in the file. Contrast directly with the sibling `01-cast-and-record.spec.js` (pod mode), whose final test *does* run `select count(*) from course_audio where ...` (`:118-123`) and asserts `>0`. Mode 1 gets no equivalent. |
| 7 | `docs/pods/e2e-recording-proof-2026-07-17.md` (found via search) | Yes, and this is the closest thing to a live human catching the gap before it became a filed bug | States plainly: *"the S3 upload succeeds and returns 200, but no `course_audio` row appears right away"* (`:83-84`), then **explains it away** as an intentional "two-phase design" (record → AI-segment → human review/approve → THEN `course_audio` is created), citing `SessionReview.vue` copy as evidence (`:88-94`) | **No — and this is the key finding.** The doc explicitly flags that its own suite "didn't drive far enough into that [review] screen to prove" the approve step creates the row (`:102-103`), hands that exact verification step to Tom's manual pass as step 7 (`:132-138`), and — as far as this research could determine — that manual click-through never happened or never got written up. The assumption sat unverified for 33 days (2026-07-17 → 2026-08-19). | 
| 8 | `docs/voice-engine/audit/03-recorder-upload.md` (found via search, earlier/different-branch state) | Yes | Static trace on `feature/human-voice-engine`, explicitly says "**no live DB/S3 checks were possible**" (`:7`) and independently reaches the same finding as check #4: *"never touch `course_audio` at all"* (`:16`, `:99`) | No — same shape as #4: correct diagnosis, zero live verification, and it predates check #4 by describing an earlier, more broken state (client-fabricated colliding `script-N` ids) that check #1's `isScriptModeUpload` legacy-id handling shows was since partially addressed. |
| 9 | `b645b2da`'s own commit message | Yes — this is the fix, not a pre-existing check | "Verified live against a real take through the real endpoint... 200 with filed:true, course_audio row created with the right course/language/role/voice/origin/s3_key/duration, the provenance row naming it, and the clip streaming back as decodable mp3." | **Yes — this is the first check in the whole ledger that does it.** It is a one-off manual verification described in prose in the commit message, not a committed automated test. |

---

## Regression guard for the fix itself — EXPLICIT GAP

`services/script-take-filing.cjs` (the new module `b645b2da` introduces,
containing `planScriptTakeFiling`/`fileScriptTake`) has **no test file**.
Searched `find . -iname "*script-take-filing*"` — the only match is the
`.cjs` implementation. The fix's own correctness rests entirely on the
one-off manual verification quoted in row 9 above, run against a second API
instance on port 3999 and then torn down. If this regresses, nothing catches
it before a recordist does.

---

## The shape of the gap

The interesting shape holds, checked rather than assumed: **every automated
check that touched script mode stopped at HTTP 200.** Not one committed test
— unit, contract, or e2e — ever asserted a `course_audio` row existed for a
script-mode take, or fetched a script-mode clip back and decoded it. The one
e2e spec that runs Mode 1 (`02-mode1-autocue.spec.js`) asserts nothing past
`status === 200`, in a file sitting right next to a sibling spec
(`01-cast-and-record.spec.js`) that proves the pattern was known and
available — it runs the exact `select count(*) from course_audio where...`
check for pod mode, sixteen lines away in the same directory, and it was
simply never written for script mode.

Two documents (`recording-upload-write-path-2026-08-11.md`,
`voice-engine/audit/03-recorder-upload.md`) *did* correctly identify the
absence of a `course_audio` write for script mode, by static code trace,
independently, on different dates and different branches — and both stopped
at diagnosis. Neither triggered a fix or a test. One document
(`e2e-recording-proof-2026-07-17.md`) came within one click of catching it
as a real bug: it saw the exact symptom, reasoned its way to a plausible
alternative explanation ("two-phase design, review step files it later"),
named precisely the verification step needed to confirm that story, handed
it to a human as a to-do, and — as far as the available record shows — the
to-do was never closed. The commit message for `b645b2da` states the
architecture's actual answer was "the voice engine files them later," which
matches the 2026-07-17 doc's guess in spirit but not in mechanism: there was
no review/approve step at all; the real second-stage filer
(`voice-engine/synthesis-job.cjs`) only ran "later, if someone starts a
synthesis job" — which is why 50 real script-mode takes recorded on
2026-08-19 sat with zero `course_audio` rows until the fix landed the same
day.

So: a test asserting 200-and-a-provenance-row was true, passing, and told
nothing about playback — confirmed, not assumed. The fix (`b645b2da`) is the
first point in this entire history where anyone verified serve-back for real,
and that verification itself is a one-off manual run, not a committed test.

---

## Test run (read-only, not modified)

`npx vitest run services/recording-upload-helpers.test.js` from repo root:
**17 tests / 1 file, all pass** (0 failures). Confirms the file runs cheaply
and its assertions are exactly as quoted in row 1 — no DB/network dependency,
consistent with "stops at object shape."

`provenance-adapter.test.mjs` (run together with the same command against the
worktree tree, which incidentally swept in 25 stale copies of the same file
across `.worktrees/*` and `scripts/*` — all pass, same shape, confirming this
is a repo-wide copy-paste, not something specific to one branch): **all
pass**, same in-memory-fixture shape as row 2.

Landing line: no commits. This session made none — read-only research only.
