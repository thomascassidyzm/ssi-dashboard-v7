# Does pressing "generate" re-link old audio?

**2026-08-18.** Commissioned by Kai to settle a documented contradiction before anyone applies a fix.
Diagnosis only — **no fix applied, nothing merged, zero TTS spend, zero live writes.**

Every claim below is tagged **OBSERVED** (a line was read, a query was run, a test was executed)
or **INFERRED**. Things I could not reach are named as **GAP**, not filled with assumption.

---

## 1. The headline

**No — regeneration does not silently re-link old audio. It usually does not regenerate at all.**

Kai's instinct was right that something is wrong, and his instruction to test before fixing was
the correct call — because the mechanism he suspected turns out to be the wrong culprit on the
path that matters. Had we "fixed" the suspected cause, we would have changed code that was not
broken and left the real defect in place.

The suspected mechanism — `ignoreDuplicates: true` on the `course_audio` upserts making a write
a silent no-op — **is real, but it only exists on placeholder paths that never carry audio bytes.**
The main render path overwrites genuinely. The real defect sits one level upstream and is a
**selection** defect, not a write defect:

> `/generate` builds its entire work list from `.is(audioCol, null)`.
> A slot that still points at a bad clip is **never a candidate**. Pressing generate does
> nothing to it — it is not regenerated, not relinked, and not reported as a problem.

And there are three further layers stacked on top of that, each independently sufficient to
produce "I pressed generate and still got the old audio". They are set out in §3.

**The single sentence:** *`/generate` is a fill-the-gaps tool, not a replace tool. It is
structurally incapable of replacing audio that already exists, and the estate has a separate,
correct replacement path that the failing workflows do not call.*

---

## 2. What settles it: a real reproduction

Not a code-reading argument. **PGlite 0.5.5 / PostgreSQL 18.3, in-process** — so `ON CONFLICT`
resolution, the `BEFORE UPDATE` triggers and the `AFTER INSERT` autolink are executed by Postgres
itself, not simulated in JavaScript.

The fixture schema was dumped **verbatim from the live database** by a read-only script
(`pg_get_functiondef` / `pg_get_triggerdef`): 13 functions, 8 triggers, and the real
`UNIQUE (course_code, text_normalized, language, role, voice_id)`. This matters more than it
looks — see the GAP in §7 about live code that is not on `main`.

**OBSERVED.** `node --test tools/audio-regen-probe/regen.test.cjs` → **8 tests, 8 pass, 0 fail,
~21s, no network.** I ran this myself as well as the worker who wrote it.

| # | Scenario | Reproduced? | What was observed |
|---|---|---|---|
| A | Regenerate same text/voice, `ignoreDuplicates: true` | **YES** | `ON CONFLICT DO NOTHING` returned 0 rows; row count stayed 1; `s3_key` stayed `OLD-BAD-0001.mp3`; the freshly rendered `NEWGOOD-0001.mp3` was discarded |
| B | Same, `ignoreDuplicates: false` (the main path) | **NO** | `s3_key` genuinely replaced in place — **but `created_at` and `audio_revision` are not bumped** |
| C | Text edited T→T2, a same-voice clip for T2 already exists | **YES** | `BEFORE UPDATE` trigger re-links to the pre-existing clip; generate then has nothing to do |
| C2 | Text edited T→T2, nothing pre-exists | **NO** (healthy) | link nulled, slot queued, real TTS, autolink binds the new row |
| D | The documented delete-first workaround | **NO** (it works) | produces genuinely new audio — at the cost of a real silent window |
| E | Cosmetic edit (`.`, casing, whitespace) | **YES** | all three variants collapse onto one identity key; no second row |
| F | Bad clip linked; a second slot with same text is NULL | **YES** | **0 TTS calls**; the NULL slot was bound to the OLD BAD clip |
| G | Row exists but its S3 object is gone | **NO** (healthy) | only a missing object reopens a slot for TTS |

Scenario **F** is the headline result and **G** is its mirror: *the only condition that makes an
existing clip eligible for re-rendering is that its file has vanished.* "Bad audio" that exists
and plays never qualifies.

---

## 3. The four layers

Each is independently sufficient to produce the reported symptom.

### Layer 1 — a bad-but-linked clip is never a candidate · OBSERVED

`services/phases/phase8-audio-v13.cjs:641-650`:

```js
let query = supabase
  .from(slot.table)
  .select(slot.textCol)
  .eq('course_code', courseCode)
  .is(slot.audioCol, null)          // ← the whole selection rule
  .lte('seed_number', releaseTarget)
```

There is no quality predicate, no `veracity_pass` filter, no flag join, no age check, no
text-vs-clip comparison. The variable is honestly named `unlinked` (`:637`); `linkable`,
`toGenerate` and `toCopy` are all partitions of it.

`forceGenerate` does **not** widen this (`:779-781`) — it only stops step 2 reclassifying an
unlinked slot as linkable. It still starts from the same NULL-only set, and it is passed `true`
at exactly one internal call site (`:2076`); **zero callers** in `src/`, `services/`, `api/`,
`tools/`. There is no operator-facing force-regenerate flag.

### Layer 2 — a NULL slot is bound to the old clip before any render · OBSERVED

`/generate` runs the link pass *before* deciding what to render (`:1987-1995`). By the time
`getAudioNeeds` runs at `:1998`, every NULL slot whose text matches *any* existing clip has
already been bound to it. It never enters `toGenerate`, so zero TTS is spent and it is reported
as "linked" rather than "generated".

The module calls this the play-what-we-have doctrine, and for a *missing* clip it is right.
Applied to a *bad* clip it is exactly the "looks new, is old" case.

Note the two keys disagree: the link key (`:1443`, `:1470`) is `text|language|role` computed in
JS and is **voice-blind**; the conflict key is `course_code,text_normalized,language,role,voice_id`
and is **voice-sensitive**. **INFERRED:** a slot can therefore be linked to a clip on the wrong
voice. There is a hand-rolled guard at `:2065-2073`, but it only fires when *nothing at all*
linked; a partial mismatch passes silently.

### Layer 3 — replaced bytes never reach a learner who already heard the clip · OBSERVED

This is the layer that most exactly matches "I regenerated it and still hear the old one."

When the main path *does* overwrite a row in place, the upsert payload (`:2418-2438`) contains
no `audio_revision`. Nor does `/regenerate-role`'s patch (`:2930-2945`), nor `:4519`, nor `:4308`.

I closed the code-trace's open question here with a live read-only query: **no trigger on
`course_audio` bumps `audio_revision`.** The seven live triggers are `audio_autolink`,
`course_audio_audit`, `course_audio_sync_duration`, `course_audio_touch_audio_stamp`,
`course_audio_touch_content_stamp`, `trg_course_audio_canonical_identity`,
`trg_course_audio_normalize`. `touch_course_audio_stamp` *fires on* an `s3_key` change but only
sets `courses.audio_stamp` — it busts the **script** cache, not the per-clip audio cache.

The learner side (**OBSERVED**, `ssi-learning-app`):

```ts
// packages/player-vue/src/providers/revisedAudioRefs.ts:66  (and api/_utils/audioAccess.ts:130)
return revision && revision > 1 ? `${id}.v${revision}` : id
```
```ts
// api/audio/[audioId].ts:150
res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
```

So with `audio_revision` still `1`, the URL is unchanged, the response is immutable for a year,
and player-vue's IndexedDB blob cache is keyed by that same ref. **New bytes in S3; the learner
keeps the old audio.** `phase8-audio-v13.cjs:6946-6957` states this consequence in its own words
and calls it *"the documented cause of 'we kept replacing clips and got the same clip'."*

Only two paths do the versioned swap correctly: `reuseRenderClip` (`:6961-7005`) and
`services/audio-repair-core.cjs:686-733`.

**Live scale (OBSERVED):** `course_audio` = 2,565,615 rows; `audio_revision > 1` = 254,686 (9.9%);
`course_audio_revisions` ledger = 51,891 rows. The gap between 254,686 and 51,891 means something
bumped the revision without writing a ledger row — **GAP**, not identified.

### Layer 4 — the "regenerate" button on flagged clips regenerates nothing · OBSERVED

`services/production-api.cjs:5031-5047`. The flagged UUIDs are collected into `samples`, and then
**`samples` is never used**:

```js
// Note: Phase 8's /generate endpoint generates MISSING audio, not regenerates
// For UUID-based regeneration, we need to use the direct TTS approach
// For now, proxy to generate endpoint with courseCode in path
const response = await proxyToPhase8('POST', `/generate/${courseCode}`, {
  dryRun: false,
  limit: uuids.length
})
```

Flag 10 bad clips → up to 10 **unrelated missing** clips are generated → and on a 200 the code
then **marks your 10 flags complete** (`:5057`). The bad clips are untouched and the evidence
that they were bad is cleared.

This is, precisely, "a mix of newly generated files and the old files that relinked, even though
they were bad ones that we wanted to replace." The new files are real; they are just for
*different slots*.

**Related, already known and recorded:** `/regenerate-single` throws `ReferenceError:
storedVoiceId is not defined` at `:4310` *after* billing TTS and uploading the mp3, orphaning a
paid clip per retry. Independently re-confirmed here.

---

## 4. The documented contradiction, resolved

`.claude/commands/scan-course.md` (~1440-1469) says delete-then-unlink-then-regenerate.
`CLAUDE.md` and canon rule **A4** / clash **C0** say make-before-break, HARD.

**The canon's recommendation — "make-before-break, and the scan-course passage is simply wrong" —
is right about the doctrine but incomplete about the mechanism, and Kai was right to be wary.**

The passage is a **workaround**, and it works: scenario D reproduced *nothing* — delete-first
does produce genuinely new audio. It is the only sequence available to someone who has
`/generate` and a bad clip, because Layers 1 and 2 make every non-destructive route a no-op.
Its cost is exactly the fra_for_eng failure mode: a real silent window between the delete and
the render.

So deleting the passage without providing a working replacement path would leave that workflow
with no way to replace bad audio at all — which is what Kai predicted.

**One correction to the framing in the brief:** the `phase8:3683` comment *"otherwise upsert
creates duplicates"* is **not** part of this workaround. It fires only when the identity key
*differs*, and concerns duplicate `lego_id` presentation rows. Two independent workers reached
this conclusion; I accept it. (**OBSERVED** by both; I did not re-derive it line by line.)

---

## 5. The proposed fix

**Not applied. This needs Tom's decision.** The correct machinery already exists and is live —
this is a routing and wiring problem, not a build.

`services/audio-repair-core.cjs` + `ops/sql/20260805-audio-repair.sql` implement **same-id /
new-bytes** replacement: propose (render → master → measure → verify → upload to a candidate
key) → human accept → `UPDATE` the row's `s3_key` **and bump `audio_revision`** → ledger row.
Nothing created, nothing deleted, the unique index untouched, no CASCADE risk, no silent window.
Mounted live at `services/production-api.cjs:5573`
(`/api/audio/repair/:courseCode/:audioId/{propose,preview,accept,revert,reject}`).

That is make-before-break done properly, and it is what the scan-course passage should point at.

Proposed, in dependency order:

1. **Fix the flagged-clip button** (`production-api.cjs:5039`) to route to the repair path
   instead of `/generate`, and **stop marking flags complete on a 200 that did nothing**
   (`:5057`). Smallest change, largest effect, no schema impact.
2. **Fix `/regenerate-single`'s `ReferenceError`** at `phase8:4310`. One-line scope bug that is
   currently burning money per click.
3. **Bump `audio_revision` on every in-place `s3_key` write** — `:2416`, `:2929`, `:4519`,
   `:4308`. Without this, a successful replacement is invisible to learners who already cached
   the clip. Alternative: a DB trigger, which would cover paths we have not enumerated.
4. **Replace the scan-course passage** with a pointer to the repair path — *after* 1–3, never
   before.
5. **Consider** an operator-facing force flag on `/generate` that widens selection past
   `.is(audioCol, null)`. Lowest priority; 1–3 may make it unnecessary.

### Two files not to reason from · OBSERVED

- **`services/s3-audio-service.cjs` is dead code.** `grep -rn "s3-audio-service"` outside
  `node_modules` returns **zero** hits. Its key scheme (`courses/<code>/audio/<uuid>.mp3`) does
  **not** describe the estate — the real scheme is `mastered/<uuid>.mp3`, minted fresh at five
  sites, and phase8 uses `@aws-sdk/client-s3` directly (`:26`). It also sets `ACL: 'public-read'`,
  which the live scheme does not.
- **`services/audio-generation-planner.cjs` is off the generate path.** Five references
  repo-wide, all comments citing its `$4/M chars` Azure cost constant. Its entry points take a
  *manifest*, which `CLAUDE.md` records as legacy and not on the learner path.

Relevant because both look authoritative by filename and would mislead an implementer about S3
keys and about where generation is planned.

### Blast radius

- **146 courses** in the estate; **63** carry audio flags.
- **40,884 flags currently `flagged`; 7,983 `resolved`.** Of the resolved, **6,420 have
  `regen_count > 0`** and **1,563 have `regen_count = 0`** — resolved with no recorded
  regeneration at all.
- **GAP — and it is the important one.** `audio_flags` has no column recording *how* a flag was
  resolved (schema: `id, audio_uuid, course_code, status, reason, flagged_by, created_at,
  resolved_at, regen_count`). **We cannot tell from the data how many of the 7,983 were closed
  by the no-op button versus a real repair.** 7,983 is an upper bound on flags that may have been
  closed without the clip being fixed, not a count of confirmed bad closures. Establishing the
  real number needs per-clip verification, not a query.
- Change 3 is the widest: it would cause cache-busting URLs for clips that currently have none.
  Risk is a one-off re-download for affected learners, not incorrect audio.
- Change 1 is contained to one route. Change 2 is one line and strictly reduces failure.
- **Nothing proposed here deletes any row or any S3 object.**

---

## 6. Tests and where they live

- `tools/audio-regen-probe/regen.test.cjs` — the 8 scenarios, `node:test`.
- `tools/audio-regen-probe/harness.cjs` — PostgREST upsert semantics as the SQL supabase-js
  actually causes; replicas of the two phase8 write shapes and of `getAudioNeeds` steps 1–2;
  `fakeTts()` (offline, free — the only "renderer").
- `tools/audio-regen-probe/schema.sql` — fixture schema generated verbatim from live.
- `tools/audio-regen-probe/tables.sql` — table DDL, columns checked against `information_schema`.
- `tools/audio-regen-probe/dump-live-schema.cjs` — the read-only live dump. Not run by the tests.

Run: `node --test tools/audio-regen-probe/regen.test.cjs`. Self-contained, no network,
no credentials, no cost.

---

## 7. What is still unknown

1. **Live code is running that is not on `main`.** The database is executing trigger/function
   code from `feat/lego-audio-link-integrity-2026-08-17`, a 17-commit branch **not merged to
   `main`**, with rows dated 2026-08-17/18. Reading only `main` would misdescribe production.
   The reproduction avoided this by dumping from live, but **any fix must be written against
   live definitions, not the repo's.** This is the biggest trap here.
2. **How many of the 7,983 resolved flags were closed by the no-op button.** Not derivable from
   the schema (§5).
3. **Which on-screen button a human actually presses.** At least four front-end paths exist and
   two post to endpoints with **no server-side handler** (`/api/audio/regenerate`,
   `/api/audio/generate-missing`). Not determinable from code alone.
4. **What bumped `audio_revision` on 254,686 rows** when the ledger holds only 51,891.
5. **Scenario F asserts against a faithful re-implementation** of `getAudioNeeds` steps 1–2,
   not the shipped function — the one claim in the reproduction not resting on running real
   code. Layer 1 is independently confirmed by direct reading of `:641-650`.
6. **Not measured:** how many orphaned mp3s `/regenerate-single` has already paid for.
7. The reproduction omits seven bookkeeping triggers, `text_stripped` is absent, and the S3 HEAD
   is a predicate rather than a real call.

---

## 8. Method note

Three workers, disjoint scopes: **#104** code trace, **#105** the reproduction, **#106** live
forensics and git provenance. Their findings converged and **corrected my own initial reading** —
I had proposed `ignoreDuplicates` as the third layer, and the reproduction refuted it for the
main path. I re-verified every load-bearing claim myself: ran the tests, read `:2417`, `:783-791`,
`:641-650`, `production-api.cjs:5039`, `revisedAudioRefs.ts:66`, `[audioId].ts:150`, and queried
the live triggers and counts read-only.

**Constraints honoured:** zero TTS spend; zero writes to any database (live access was
`SELECT`-only against `pg_proc`, `pg_trigger`, `pg_constraint`, `information_schema`,
`course_audio`, `audio_flags`, `courses`); no S3 access; no live course touched; no audio row
deleted anywhere; **no fix applied.**
