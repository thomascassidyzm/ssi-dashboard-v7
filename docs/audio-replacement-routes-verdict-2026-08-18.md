# Which audio-replacement route actually works

**2026-08-18 · Kai's reconciliation · isolated reproduction + live read-only forensics · zero TTS spend**

Kai spotted that our reproduction and Tom's live verification were describing **two different routes**, not
contradicting each other. That is correct, and it holds up. But settling it turned up something neither
result had looked for, and it changes the recommendation.

---

## The answer, in one table

Each route was put through the same four questions. **OBSERVED** = reproduced in the harness or read off the
live database. **INFERRED** = a chain of individually-observed facts, labelled where it appears.

| Route | Re-renders? | New bytes reach the slot? | Re-voices? | **Does a returning learner hear it?** | Undoable? |
|---|---|---|---|---|---|
| **(a) flag → `/regenerate-single`** | **yes** — 1 TTS | **yes** — new `mastered/` key, same row id | **yes** | **NO** — `audio_revision` never bumped | no |
| **(b) unlink FK → `/generate`** | **no** — 0 TTS | **no** — re-binds the same bad row | **no** | n/a — nothing changed | n/a |
| **(c) delete row → `/generate`** | yes — 1 TTS | yes — brand-new row | yes | yes (new id) | **no** — history CASCADEd away |
| **(d) repair `propose` → `accept`** | yes — 1 TTS at propose | yes — new key, same row id | **no** (bytes only) | **YES** — ref becomes `<uuid>.v2` | **yes** — `revert`, free |

Measured side by side on one bad clip, one intent — *"different bytes, different voice"* (test `R10`):

```
b unlink+generate         {"tts":0,"newBytes":false,"voice":"azure_es-ES-ElviraNeural","slotSilentWindow":true, "undoable":false}
c delete+generate         {"tts":1,"newBytes":true, "voice":"azure_es-ES-AlvaroNeural","slotSilentWindow":true, "undoable":false}
a flag+regenerate-single  {"tts":1,"newBytes":true, "voice":"azure_es-ES-AlvaroNeural","slotSilentWindow":false,"undoable":false}
d repair propose+accept   {"tts":1,"newBytes":true, "voice":"azure_es-ES-ElviraNeural","slotSilentWindow":false,"undoable":true}
```

---

## The recommended workflow, in one sentence

**Use the Audio Repair panel — propose, listen to both, accept — because it is the only route that replaces
the bytes *and* moves the address the learner's caches key on, and the only one you can undo.**

### The routes that silently fail

1. **(b) unlink-then-`/generate` — fails completely and says nothing.** 0 TTS calls, 0 new rows, the slot
   lands back on the identical `s3_key`. The operator is told nothing at all, because the "Pre-generate link:
   bound N" line computes N=0 from keys the RPC doesn't return (test `H4`).
2. **(a) `/regenerate-single` — half-fails, invisibly.** It really does render and really does write new
   bytes. But it leaves `audio_revision` untouched, so **the learner-facing ref does not move**, and any
   device that already played the clip keeps the old audio behind a `max-age=31536000, immutable` header. The
   operator gets `{success:true, newS3Key:...}` and the file on S3 really is new — so it looks and sounds
   fixed to whoever checks it.

**This second one is new, and it is the reason the fix order needs changing.**

---

## Kai's hypothesis: right about the routes, and the flag detail needs correcting

> *"the correct operational workflow is FLAG the audio and then regenerate via that path — NOT
> unlink-then-generate."*

The **NOT unlink-then-generate** half is confirmed, decisively. The **flag → regenerate** half needs two
corrections before it becomes operator guidance:

- **The flag button and `/regenerate-single` are not connected.** There are two flag tables. The human flag
  button (`CourseQAGate.vue:365` → `course-qa-gate.cjs:336-356`) writes **`audio_clip_flags`**.
  `/regenerate-single` reads and writes **`audio_flags`**, which *no Vue component writes at all*
  (`src/services/api.js:1805` `flagAudioSample()` has zero callers). Neither table is read by the repair
  panel's queue, which runs its own detectors over `course_audio`. So flagging does not put a clip in front
  of any regenerate path — the bridge is a human remembering.
- **No UI button calls `/regenerate-single`.** `grep` over the whole installed checkout finds exactly one
  reference outside `phase8` itself: the proxy that exposes it (`production-api.cjs:5855`). Tom's afternoon
  verification reached it by direct HTTP, not by pressing anything. The route that renders correctly is not
  reachable from the dashboard.

---

## Tom's bul_for_eng render — what actually happened in the database

The literal query (`created_at > 2026-08-18 10:00Z`) returns **zero rows**, which would have read as "nothing
happened". The real trail is in `content_audit_log`, because the write was an **UPDATE**, not an INSERT:

```
course_audio 829d6387-d6c6-42ff-aa0e-696abd0fca98   role=known   text="at"   (bul_for_eng)
  s3_key            mastered/D7B76335-....mp3  →  mastered/5B169BC0-....mp3     CHANGED
  duration_ms       1008                       →  1800                          CHANGED
  veracity_checker  null                       →  'phase8-regenerate-single'    CER 0, pass
  audio_revision    2                          →  2                             NOT CHANGED
  id / clip_id / voice_id / created_at          unchanged
  changed_at        2026-08-18T15:08:00.560Z
```

`veracity_checker` names the route beyond doubt. **Tom's verification was correct on every point he
checked** — a real render happened, CER 0, the old S3 object was not deleted. The row's `course_audio_revisions`
ledger is empty, and `audio_revision` sat still.

The consequence, split honestly:

- A learner opening that clip **for the first time** gets the new bytes. `resolveRevisionS3Key`
  (`audioAccess.ts:164`) returns `currentS3Key` when the requested revision equals the current one, so
  `.v2` resolves to the new file. **OBSERVED.**
- A learner who had **already played** it keeps the old bytes indefinitely: the ref `<uuid>.v2` is unchanged,
  the browser HTTP cache keys by URL, and player-vue's IndexedDB `AudioCache` keys by the bare ref string
  (`AudioCache.ts:160`, `keyPath: 'id'`). Neither is ever invalidated. **INFERRED** — every link in the chain
  is observed, the end-to-end replay on a real device is not (see Gaps).

Tom heard the fix because he was checking the file, not replaying a cached lesson.

---

## This is not one route's bug — it is six

`audio_revision` is a real, working, well-built versioning system (`api/_utils/audioAccess.ts`,
`revisedAudioRefs.ts`, the `courses.audio_stamp` trigger). Exactly **three** writers bump it:
`audio-repair-core.cjs:582` (accept), `:758` (revert), and `phase8:7771` (the reuse-first swap). Everything
else that swaps bytes in place does not:

| Route | Same row id | New `s3_key` | Bumps revision | Returning learner keeps old bytes |
|---|---|---|---|---|
| `/regenerate-single` | yes | yes | **no** | **yes** |
| `/regenerate-role` (incl. the gender-flag re-voice button) | yes | yes | **no** | **yes** |
| `/regenerate-phrase` — text *unchanged* | yes | yes | **no** | **yes** |
| `/regenerate-lego` — text *unchanged* | yes | yes | **no** | **yes** |
| `/regenerate-presentation` — row exists | yes | yes | **no** | **yes** |
| recordist human retake | yes | yes | **no** | **yes** |
| repair `accept` | yes | yes | yes | no |
| reuse-first RENDER | yes | yes | yes | no |

Two of these — `/regenerate-role`'s "Regenerate" button and the recordist retake — *are* wired to buttons
operators press regularly. The Vercel CDN is `no-store` (`[audioId].ts:151-152`), so the CDN is not a vector;
the browser cache and IndexedDB are.

The correct implementation already exists **in the same file**, 3,100 lines below `/regenerate-single`:
`reuseRenderClip` (`phase8:7704-7790`), whose own comment names this exact failure mode as *"the documented
cause of 'we kept replacing clips and got the same clip'"*.

---

## Does this change the approved fix order?

Currently: **flag button → repair path; cache-bust in-place writes; doc rewrite last.**

**Yes — swap the first two.**

1. **Cache-bust the in-place writes, first.** It is now the highest-severity item and it has a precise,
   copyable target: make the six routes above bump `audio_revision` and write a `course_audio_revisions` row,
   exactly as `reuseRenderClip` (`phase8:7747-7772`) and `audio-repair-core.cjs:558-582` already do. Until
   this lands, `/regenerate-role` — a button operators press today — replaces bytes that returning learners
   will not hear.
2. **Then wire the flag button to the repair path.** Still right, and now better specified: the human flag
   writes `audio_clip_flags`, and `audio-repair-core.cjs`'s queue never reads it. The wiring is
   queue-reads-flags, not a new flag mechanism.
3. **Doc rewrite last** — unchanged, and now with a settled table to write from. Three corrections belong in
   it: the `?v=<rev>` mechanism described in `audio-repair-core.cjs:44-47` does not exist (the real mechanism
   is the `<uuid>.vN` suffix); the `lego_introductions` CASCADE warning at `:26` is wrong (live
   `pg_constraint` says `SET NULL` for that FK and all 11 content-side FKs); and the operator guidance must
   say *use the repair panel*, not *unlink and regenerate*.

One thing **not** to do: do not "fix" route (b) by removing the re-link. Two independent mechanisms produce
it — Step A's RPC fires first and writes the FK, and `getAudioNeeds` :783-791 would have classified it as a
free re-link anyway (test `H1`). Removing either alone changes nothing, and route (b) is not a route anyone
should be using once (a)/(d) work.

---

## Route-by-route detail

### (a) flag → `/regenerate-single` — renders, cannot be undone, cannot reach a cached learner

`phase8:4385-4640`, installed copy. The `storedVoiceId` ReferenceError **is fixed** (`:4438`) — verified in
the running checkout, not the repo copy.

- **Renders.** 1 TTS, behind an `ALWAYS_SAMPLER` veracity gate — a human pressing "this is wrong" is exactly
  the render you want checked (`R1`).
- **In place, new key.** `UPDATE course_audio ... WHERE id = audioUuid` with `mastered/<new uuid>.mp3`. Same
  row id, so no FK moves and nothing can be orphaned; `unique_course_audio_per_voice` is never contended
  because `text_normalized` doesn't change (`R1`).
- **Re-voices.** It patches `voice_id` from the course config. The identical intent through route (b) makes
  0 TTS calls and leaves the old voice in place (`R2` vs `H3`). **This is the sharpest split between the two
  routes Kai was reconciling.**
- **Two honest non-renders.** `origin='human'` → 409 before spending (`R4`). And on a *re-voice* with reuse
  enabled it may take a sibling course's clip: 0 TTS, but the bytes genuinely change and the response says
  `reused:true` (`R3`). On a *same-voice* press reuse is never consulted — correct, since the operator wants
  different bytes and only a render gives them.
- **No undo.** It writes no `course_audio_revisions` row, so the superseded key survives only in
  `content_audit_log`.
- **Cannot reach a cached learner** — the finding above.

### (b) unlink FK → `/generate` — the silent failure, confirmed

0 TTS, 0 new rows, slot back on the same row id and same `s3_key` (`H`). Cause: Step A (`phase8:1985`) calls
`link_all_audio_ids`, whose **live** body matches on `(course_code, text_normalized, role)` with a bare
`LIMIT 1` — no `ORDER BY`, no `voice_id` filter, no `pending/%` exclusion — and re-binds the NULL slot before
selection runs. It cannot re-voice (`H3`), and the stuck-linkable escape hatch never fires because Step A has
already consumed the NULL (`H5`).

Worth flagging separately: **207,911** `(course_code, text_normalized, role)` groups estate-wide have 2+
distinct `s3_key`s. A bare `LIMIT 1` over groups that size is not deterministic about which file it picks.

### (c) delete row → `/generate` — works on the audio, pays for it in history

It does re-render (`R7`), and it re-voices, but only because the delete is doing the work (`R8`). The cost,
from live `pg_constraint`: the 11 content-side FKs are `ON DELETE SET NULL`, so **the slot goes silent** until
the render lands; and `audio_clip_flags`, `course_audio_revisions`, `audio_repair_candidates`,
`course_audio_envelope` and `audio_clip_signoffs` are all `ON DELETE CASCADE` — the clip's flag history,
signoffs and undo trail are destroyed. Meanwhile `audio_flags` has no FK and survives as a dangling row.
Routes (a) and (d) reach the same audio outcome with no silent window and no data loss.

### (d) repair `propose` → `accept` — the recommended route

`services/audio-repair-core.cjs`, mounted `production-api.cjs:6055` (not ~5573), UI at `AudioRepairPanel.vue`.

- **Make-before-break holds.** After `propose`, the learner is still on the old clip; the candidate sits under
  `repair-candidates/` and `accept` HEADs the object before pointing anything at it (`R5`).
- **Same id, new key, revision bumped, history written** (`R5`). The `repair-candidates/` prefix is not
  publicly readable, but the learner path uses presigned URLs, so that is cosmetic.
- **Undoable.** `revert` is data-only, costs nothing, and goes *forward* to revision 3 rather than back to 1
  (`R5`).
- **The only route that can replace a bad human clip.** `propose --source=upload` spends nothing, and `accept`
  keeps `origin='human'` so no later TTS pass eats it (`R6`). `/regenerate-single` 409s on the same clip.
- **One real defect (`R11`):** on a re-voice, `accept` does not patch `voice_id` — deliberate, since patching
  it would contend `unique_course_audio_per_voice`. The bytes become Alvaro; the row still says Elvira. So
  route (d) is a *byte* repair, not a re-voice. For a genuine re-voice, (a) updates both — at the cost of the
  cache problem. **Neither route currently does a clean, cache-safe re-voice.**

### Routes found beyond the four in the brief

`/regenerate-role` (+ the gender-flag re-voice button), `/regenerate-phrase`, `/regenerate-lego`,
`/regenerate-presentation`, reuse-first apply, the recordist human-take upload, and the CLIs
(`tools/audio-repair.cjs`, `tools/revoice-clips.cjs` — which mints a *new* row id and so is cache-safe by
accident; `tools/repair-silent-clips.cjs` is a retired forwarder). **19 in total.** Full inventory with
line-level citations in worker **#148**'s report.

---

## How this was established

- **Harness:** `tools/audio-regen-probe/`, extended from Kai's 14-test reproduction to **27 tests, 34s,
  all green, zero TTS spend.** Real PostgreSQL (PGlite, in-process wasm) with the live schema dump — Postgres
  itself resolves the ON CONFLICT, the triggers and the RPC. New: `routes.cjs`, `routes-tables.sql`,
  `replacement-routes.test.cjs` (12 new tests, `R0`–`R12`).
- **Route simulators are diffable against the installed code.** Every step carries the `phase8` /
  `audio-repair-core` line number it mirrors, taken from
  `/home/tomcassidy/SSi/ssi-dashboard-v7-clean-prod` (main, `a9bd62da`) — verified as the `cwd` of the
  running `production-api.cjs`, `course-builder-api.cjs` and `phase8-audio-v13.cjs` processes, per Tom's
  warning not to trust the repo copy.
- **A fidelity gap in the inherited fixture was found and closed.** `schema.sql` declared the content tables'
  `*_audio_id` columns with **no foreign keys** to `course_audio`. Live has 11, all `ON DELETE SET NULL`.
  Harmless for the unlink route; load-bearing for the delete route, where without them a deleted clip leaves
  a dangling id instead of a NULL and the slot is invisible to `getAudioNeeds`. Added by `ALTER` in the
  addendum so the original 14 tests still run against the exact fixture they were written for.
- **Live database: reads only**, in `BEGIN READ ONLY` transactions (no `psql` on this host; a direct `pg`
  client was used instead). Nothing was written, generated, unlinked or deleted.

**TTS spend: zero.** No live course was touched.

---

## Explicit gaps

1. **No end-to-end learner replay.** The claim that a returning learner keeps the old bytes after
   `/regenerate-single` is **INFERRED**: the write path, the trigger, `buildAudioRef`, the `immutable` header
   and the IndexedDB `keyPath` are each **OBSERVED**, but nobody played the clip on a real device before and
   after. Settling it needs one Playwright run against a course with a revision-less swap in it.
2. **Route (d) was not exercised against live infrastructure.** `propose`'s S3 upload, the veracity gate and
   the `storage.head` make-before-break check are modelled, not run. Doing it live costs a render on a real
   clip, which the brief's spend limit rules out. The *data* behaviour — same id, new key, revision, history,
   revert — is reproduced faithfully against real Postgres.
3. **The recordist upload path was read, not reproduced.** Its cache exposure is inherited from worker #148's
   line-level reading, not from a test here.
4. **`audio_clips` / `clip_id` unexplored.** Tom's bul_for_eng row kept its `clip_id` across the overwrite;
   what that canon row now points at was not chased.
5. **Worker #148's `phase8` line numbers for §5 came from the non-prod checkout** in one section (4289-4300
   vs 4576-4590 installed). The substance was re-verified by hand against the installed copy: the
   `.update({...})` block contains no `audio_revision`, and `grep` finds the identifier nowhere in the route.

---

## Workers

- **#147** live-DB forensics — found Tom's render in `content_audit_log` after the literal query returned
  zero, and reported that empty result as a gap rather than as "nothing happened". Published:
  `https://watson-1.tail4968cb.ts.net/d/7abd34ca`
- **#148** route inventory — the 19-route map and the six-route cache-poisoning table.
- **#149** learner-side cache-bust — refuted the `?v=<rev>` mechanism, found the real one, and found the
  `/regenerate-single` gap the brief had not asked about. Published:
  `https://watson-1.tail4968cb.ts.net/d/b1e01753`
