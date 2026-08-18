# Does pressing "generate" re-link old audio?

**2026-08-18.** Commissioned by Kai to settle a documented contradiction before anyone applies a fix.
Diagnosis only — **no fix applied, nothing merged, zero TTS spend, zero live writes.**

> **REVISION 2 — 2026-08-18, 15:30Z. This supersedes revision 1, and it changes the headline.**
> Revision 1 answered "what happens if you press generate on a slot that is still linked".
> That is not the workflow in use. Kai's correction: *"we've been doing regenerations by
> **unlinking** audio (instead of deleting), and then generating again to try to replace it.
> That is when we ran into the issue."* Revision 2 reproduces that path. **On it, Kai's original
> hunch is CONFIRMED.** Revision 1's finding is not withdrawn — it is true of the never-unlinked
> case — but it was answering a question nobody was asking.

Every claim below is tagged **OBSERVED** (a line was read, a query was run, a test was executed)
or **INFERRED**. Things I could not reach are named as **GAP**, not filled with assumption.

---

## 1. The headline

**There are two paths, and they fail differently. Both end with the learner hearing the old clip.**

**Path 1 — press generate on a slot that is still linked: nothing happens at all.**
`/generate` builds its entire work list from `.is(audioCol, null)` (`phase8-audio-v13.cjs:641-650`).
A slot still pointing at a bad clip is **never a candidate**: not regenerated, not relinked, not
reported. Only a *missing S3 object* reopens a slot for TTS.

**Path 2 — unlink the slot (keeping the row), then press generate: the SAME bad row is re-linked,
with zero TTS. This is the workflow actually in use, and Kai's hunch about it is CONFIRMED.**

> **OBSERVED.** Slot unlinked (`target1_audio_id = NULL`, row kept). `/generate` run.
> Result: **0 TTS calls, 0 new `course_audio` rows, the slot points at the same row id and the
> same `s3_key` it did before** — the same physical S3 object, not a copy of it. The operator is
> told "generated"; the learner hears the identical bad clip.

The mechanism is **not** primarily the text-match reuse at `:783-791` that Kai named — though that
would produce the same outcome on its own. **The first thing `/generate` does, before it asks what
needs rendering at all, is run a link pass** (Step A, `:1985-1992`) which calls the SQL RPC
`link_all_audio_ids`. That RPC re-binds every NULL slot to any `course_audio` row with the same
`text_normalized` and `role` — `LIMIT 1`, **no voice predicate, no storage check, no ordering.**
By the time `getAudioNeeds` looks, the slot is no longer NULL, so it is not even classified.

Two independent mechanisms therefore reach the same result, and **removing either one does not
help** (§2, test H1). Worse, three things make it silent:

- **The re-link is invisible in the log.** The RPC returns `{legos:{target1:N},…}`; phase8:1396-1398
  sums `result.legos_target1` and eight other **flat keys that this RPC never returns**. The total
  is always 0, and the `Pre-generate link: bound N existing audio records` line is inside
  `if (linkResults.total > 0)` — so it never prints. **OBSERVED:** 3 slots re-bound, reported as 0.
- **The one escape hatch cannot fire.** `:2073` force-generates when `toLink > 0 && toGenerate === 0`.
  Step A already consumed the NULL, so `toLink` is 0 and the hatch never triggers (test H5).
- **The re-link write is not audited.** `audit_content_change` skips changes where the old value
  was NULL ("pure first-fill"), so NULL → old-clip-id writes **no** `content_audit_log` row. This is
  why §6's damage figure is a GAP rather than a number.

**The single sentence:** *`/generate` is a fill-the-gaps tool, not a replace tool. Unlinking does
not turn it into one — it just hands the gap straight back to the clip you were trying to get rid
of, for free, and says nothing.*

**What this means operationally, today:** unlink-then-generate **cannot** replace a bad clip, and
it **cannot** re-voice one either (test H3: the RPC matches on text and role only, so the old
voice comes straight back). The only sequences that do produce new audio are (a) delete the row
first — which works, and costs a real silent window — or (b) the `audio-repair-core` path, which
is correct and is not wired to any of these buttons (§6).

---

## 2. The reproduction: unlink, then generate

**OBSERVED.** `node --test tools/audio-regen-probe/*.test.cjs` → **14 tests, 14 pass, 0 fail, ~21s,
no network, zero TTS spend, zero live writes.** Six of the fourteen are new in revision 2.

Same fixture as revision 1 — **PGlite 0.5.5 / PostgreSQL 18.3 in-process**, schema dumped verbatim
from live by `pg_get_functiondef` / `pg_get_triggerdef` — plus one addition that matters: the live
body of **`link_all_audio_ids`** is now in the fixture, so *Postgres itself* decides which row a
NULL slot gets bound to. Nothing here is simulated in JavaScript.

| # | Scenario | Result | What was OBSERVED |
|---|---|---|---|
| **H** | **Unlink (row kept), then generate** | **Kai CONFIRMED** | **0 TTS calls; 1 audio row before and after; slot points at the same row id and the same `s3_key` (`mastered/OLD-BAD-0001.mp3`)** |
| H1 | Which mechanism does it? | both | Step A alone re-binds the slot before selection runs (`unlinkedCount` then 0). With Step A skipped, `getAudioNeeds:783-791` independently classifies the slot `toLink` → `toGenerate` empty. Either alone is sufficient |
| H2 | Same run, but the row is **deleted** as well as unlinked | contrast | **1 TTS call**, a genuinely new row, a new `s3_key`. The *only* difference from H is whether the old row still exists |
| H3 | Unlink, switch `voice_config`, generate | **cannot re-voice** | 0 TTS; the re-linked clip's `voice_id` is still `azure_es-ES-ElviraNeural`. The RPC has no voice predicate |
| H4 | Three slots unlinked at once | **silent** | RPC really re-bound **3**; the number phase8:1396-1399 computes from its return value is **0**, so the log line never prints |
| H5 | Does the `:2073` escape hatch save it? | **no** | `toLink` is 0 at the moment the hatch is tested, because Step A already consumed the NULL. Hatch never fires |

**H2 is the control that answers "is it the old row's continued existence that does it?" — yes.**
H and H2 are the identical operator sequence and the identical generate run; the single
difference is `DELETE FROM course_audio`. With the row present: 0 TTS, old bytes. With the row gone: 1 TTS,
new bytes. **OBSERVED, not inferred.**

**On byte-identity:** no byte comparison was needed and none would be meaningful — the slot ends up
pointing at *the same `course_audio` row with the same `s3_key`*, i.e. the same S3 object. No second
object was created for a comparison to be made against.

---

## 3. The other path: a slot that was never unlinked

Not a code-reading argument. **PGlite 0.5.5 / PostgreSQL 18.3, in-process** — so `ON CONFLICT`
resolution, the `BEFORE UPDATE` triggers and the `AFTER INSERT` autolink are executed by Postgres
itself, not simulated in JavaScript.

The fixture schema was dumped **verbatim from the live database** by a read-only script
(`pg_get_functiondef` / `pg_get_triggerdef`): 14 functions, 8 triggers, and the real
`UNIQUE (course_code, text_normalized, language, role, voice_id)`. This matters more than it
looks — see the GAP in §8 about live code that is not on `main`.

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

## 4. The four layers

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

**This is the layer that fires on the operator's actual workflow, and it is now the headline.**

`/generate` runs the link pass *before* deciding what to render (Step A, `:1985-1992`). It calls
`linkAudioIds()` (`:1363`), which is `supabase.rpc('link_all_audio_ids', …)`. The live body of that
function, read read-only out of `pg_proc`, does nine `UPDATE`s of this shape:

```sql
UPDATE course_legos cl SET target1_audio_id = (
  SELECT ca.id FROM course_audio ca
  WHERE ca.course_code = cl.course_code
    AND ca.text_normalized = normalize_text(cl.target_text)
    AND ca.role = 'target1'
  LIMIT 1)
WHERE cl.course_code = p_course_code AND cl.target1_audio_id IS NULL AND EXISTS (…);
```

`text_normalized` and `role`. **No `voice_id` predicate. No `s3_key` / storage check. No
`ORDER BY` — a bare `LIMIT 1`, so with several candidate rows the winner is arbitrary. No
`s3_key NOT LIKE 'pending/%'` filter either**, unlike the JS paths (`:1430`, `:281`), so a pending
placeholder row is a legal match here. By the time `getAudioNeeds` runs, the slot is not NULL and
is never classified at all.

The module calls this the play-what-we-have doctrine, and for a *missing* clip it is right.
Applied to a *deliberately unlinked* clip it is the whole defect: unlinking is the operator saying
"this clip is wrong, replace it", and Step A reads it as "this slot is empty, fill it" — from the
one row the operator was trying to get away from.

Three aggravating facts, all OBSERVED:

1. **Voice-blind (test H3).** The link key is text+role; the clip-identity key is
   `course_code,text_normalized,language,role,voice_id`. A re-voice attempt done by unlinking gets
   the old voice back and spends nothing. The hand-rolled guard at `:2073` only fires when
   *nothing at all* linked — and after Step A, nothing is left to link (test H5).
2. **Unreported (test H4).** `linkAudioIds` at `:1396-1398` sums `result.phrases_known`,
   `result.legos_target1`, … — **nine flat keys.** The RPC returns
   `{course_code, legos:{known,target1,target2}, phrases:{…}, seeds:{…}}`. Every one of those
   lookups is `undefined`, `rpcTotal` is always 0, and `logger.info('Pre-generate link: bound …')`
   is guarded by `if (linkResults.total > 0)`. Reproduced: **3 slots re-bound, 0 reported.**
   (The JS fallback `linkAudioIdsBatch` at `:1417` does set `total` correctly — it only runs when
   the RPC errors, which is not the normal path.)
3. **Unaudited.** `audit_content_change` (live body, read read-only) returns early unless some
   changed column had a **non-NULL** old value. The re-link write is NULL → uuid, so it produces
   no `content_audit_log` row. The *unlink* is audited; the re-link is not. See §6.

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

## 5. The documented contradiction, resolved

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

**REVISION 2 adds the sting.** The passage says **delete**, and delete works (H2/D). What people
substituted for it — unlink instead of delete, because unlinking is obviously the safer of the
two — **does not work at all**, silently. The passage's dangerous-looking step is the one that
functions; the cautious-looking variant is the one that quietly does nothing. Anyone rewriting
this passage must say that explicitly, or the next reader will invent the unlink variant again.

**One correction to the framing in the brief:** the `phase8:3683` comment *"otherwise upsert
creates duplicates"* is **not** part of this workaround. It fires only when the identity key
*differs*, and concerns duplicate `lego_id` presentation rows. Two independent workers reached
this conclusion; I accept it. (**OBSERVED** by both; I did not re-derive it line by line.)

---

## 6. The proposed fix

**Not applied. This needs Tom's decision.** The correct machinery already exists and is live —
this is a routing and wiring problem, not a build.

`services/audio-repair-core.cjs` + `ops/sql/20260805-audio-repair.sql` implement **same-id /
new-bytes** replacement: propose (render → master → measure → verify → upload to a candidate
key) → human accept → `UPDATE` the row's `s3_key` **and bump `audio_revision`** → ledger row.
Nothing created, nothing deleted, the unique index untouched, no CASCADE risk, no silent window.
Mounted live at `services/production-api.cjs:5573`
(`/api/audio/repair/:courseCode/:audioId/{propose,preview,accept,revert,reject}`).

That is make-before-break done properly, and it is what the scan-course passage should point at.

### The order has changed. Revision 2 adds a step and moves it to the front.

Revision 1 proposed: (1) flagged-clip button → repair path, (2) `/regenerate-single`
`ReferenceError`, (3) `audio_revision` bump, (4) rewrite the scan-course passage.

**That order was written for Path 1 and it under-serves Path 2.** None of steps 1–4 stops
unlink-then-generate silently handing the old clip back — that is the workflow in daily use, and
it is the one that has been quietly producing "I regenerated it and nothing changed". The
revised order, in dependency order:

0. **NEW — STOP USING UNLINK-THEN-GENERATE, and say so today.** This is an operational
   instruction, not a code change, and it costs nothing to issue. It is step 0 because every hour
   it is not issued produces more slots that look regenerated and are not. Until step 1 lands, the
   only sequences that actually replace audio are `audio-repair-core` (correct, make-before-break)
   or delete-then-generate (works, real silent window).
1. **NEW — make the silence stop, whatever else is decided.** Two small, independent changes,
   neither of which alters what `/generate` does:
   - **`phase8:1396-1398` reads nine keys the RPC does not return.** Read the nested shape
     (`legos.target1`, …) so `Pre-generate link: bound N` prints the truth. Today an unlink sweep
     of any size reports 0. This is a one-line-per-key fix and it is the cheapest safety net here.
   - **Emit the re-link at slot granularity** where an operator can see it — the RPC gives counts
     only, so this means either an `emitProgress` line per re-linked slot or a `RETURNING` clause.
     An operator who could see "re-linked 412 slots to their existing clips, rendered 0" would
     have caught this months ago.
2. **Fix the flagged-clip button** (`production-api.cjs:5039`) to route to the repair path
   instead of `/generate`, and **stop marking flags complete on a 200 that did nothing**
   (`:5057`). Unchanged from revision 1, one place down.
3. **Fix `/regenerate-single`'s `ReferenceError`** at `phase8:4310`. One-line scope bug that is
   currently burning money per click. Unchanged.
4. **Bump `audio_revision` on every in-place `s3_key` write** — `:2416`, `:2929`, `:4519`,
   `:4308`. Unchanged. Note this is *downstream* of the Path-2 defect: on the unlink path no new
   bytes are ever written, so a revision bump would have nothing to announce.
5. **Then decide what Step A should do about a deliberately-NULL slot.** This is the real design
   question and it should not be rushed. `link_all_audio_ids` cannot distinguish "never had audio"
   from "an operator just took its audio away" — both are `IS NULL`. Options, not recommendations:
   an explicit `audio_unlinked_at` / tombstone column the RPC skips; a `--no-link` flag on
   `/generate`; or leaving Step A alone and routing all replacement through `audio-repair-core`.
   **The last is the smallest and probably the right one** — but it is Tom's call, and it depends
   on whether unlink-then-generate is retired outright.
6. **Replace the scan-course passage** with a pointer to the repair path — *after* the above,
   never before. Note that this passage documents **delete**-first, which (test H2/D) genuinely
   works; the workflow that fails is the *safer-looking* unlink variant people substituted for it.
7. **Consider** an operator-facing force flag on `/generate` that widens selection past
   `.is(audioCol, null)`. Lowest priority.

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

### Damage estimate — asked for, and NOT derivable. This is a GAP, stated as one.

**How many clips across the estate were "regenerated" by unlink-then-generate and silently kept
their old audio? The data cannot answer this, and I am not going to guess at it.** The reason is
specific and was verified rather than assumed:

- **The re-link write leaves no record.** `audit_content_change` (live body, read read-only) only
  logs an `UPDATE` if some changed column had a **non-NULL** old value — a "pure first-fill" is
  skipped by design. The RPC's re-link sets `target1_audio_id` from `NULL` to a uuid and touches
  nothing else, so it writes **no** `content_audit_log` row. **OBSERVED** in the function body.
- **The re-link leaves no state difference either.** After unlink-then-generate the row is
  byte-for-byte the row it was before the unlink. There is nothing in the current state that
  distinguishes "was unlinked and got the same clip back" from "was never touched".
- **`content_audio_link_drops` does not cover it.** 184 rows total, and the triggers that write it
  (`null_*_audio_on_text_change`) fire on **text** changes only. A hand-run
  `SET target1_audio_id = NULL` fires nothing and logs nothing. **OBSERVED.**
- **`audio_flags` still records no resolution method** — carried forward from revision 1, and it
  is a different path from this one anyway.

**What I could bound, and did (all OBSERVED, live read-only):**

| Measure | Value |
|---|---|
| `audio_flags` rows total | **48,867** |
| still `flagged` | **40,884** |
| flags with ≥1 recorded regeneration attempt | **14,712** |
| total recorded regeneration attempts (`sum(regen_count)`) | **15,802** |
| `content_audio_link_drops` rows, all time | **184** (2 distinct reasons; text-change drops only) |
| `content_audit_log` coverage window | **2026-07-03 → now** — anything earlier is invisible |
| audited `course_legos` UPDATEs in that window | **67,266** |
| of those, net-reverted (old row identical to current row) | **114** — 109 `eng_for_sin`, 3 `ben_for_eng`, 2 `eus_for_eng` |

The 114 is the closest thing to a fingerprint I found, and **I am explicitly not presenting it as
the damage figure**: an unlink→re-link pair and a text edit that was later reverted produce the
identical trace, and the audit window misses everything before 2026-07-03. It is a starting point
for someone with the campaign history, not an answer.

One thing that *is* checkable: of the **6,535** flags raised since the audit window opened that
carry `regen_count > 0`, **6,482** show a later `s3_key` change on the flagged clip (bytes really
were replaced at some point), **3** show none at all, and **50** no longer have a `course_audio`
row. That is a lower bound of 3 for the *flag-button* path, and it says nothing about the unlink
path — the s3_key changes cannot be attributed to the regen attempt rather than to one of the
estate-wide re-voice campaigns running in the same window.

**To get a real number, someone has to name the unlink sweeps that were actually run** (which
courses, which dates, run by whom) and check those slots individually. That is a matter of
recollection and campaign logs, not of a query. If those sweeps were run from `scripts/` one-offs,
those files are gitignored and may still exist on the machine that ran them.

### Blast radius of the proposed changes

- **146 courses** in the estate; **63** carry audio flags.
- Step 1 (fix the log arithmetic) changes no behaviour whatsoever — it only makes an existing
  action visible. It is the safest thing on the list and should not wait for the rest.
- Step 4 is the widest: cache-busting URLs for clips that currently have none. Risk is a one-off
  re-download for affected learners, not incorrect audio.
- Step 2 is contained to one route. Step 3 is one line and strictly reduces failure.
- Step 5 touches a live SQL function every `/generate` run depends on — it needs its own plan.
- **Nothing proposed here deletes any row or any S3 object.**

---

## 7. Tests and where they live

- `tools/audio-regen-probe/unlink-then-generate.test.cjs` — **NEW in revision 2.** The six H
  scenarios: the operator path, the two mechanisms, the delete control, the voice-blindness, the
  log invisibility, the dead escape hatch.
- `tools/audio-regen-probe/regen.test.cjs` — revision 1's 8 scenarios, unchanged.
- `tools/audio-regen-probe/harness.cjs` — PostgREST upsert semantics as the SQL supabase-js
  actually causes; replicas of the two phase8 write shapes and of `getAudioNeeds` steps 1–2;
  **new in revision 2:** `linkAudioIdsStepA()` (calls the real RPC and also computes the number
  phase8 would log) and `runGenerate()` (Step A → getAudioNeeds → escape hatch → render, in
  phase8's order). `fakeTts()` (offline, free) is still the only "renderer".
- `tools/audio-regen-probe/schema.sql` — fixture schema generated verbatim from live, now
  including `link_all_audio_ids`.
- `tools/audio-regen-probe/tables.sql` — table DDL, columns checked against `information_schema`.
- `tools/audio-regen-probe/dump-live-schema.cjs` — the read-only live dump. Not run by the tests.

Run: `node --test tools/audio-regen-probe/*.test.cjs`. Self-contained, no network,
no credentials, no cost. **14 tests, 14 pass.**

**One realism fix worth knowing about.** Revision 1's fixture course used two-letter language
codes (`en`/`es`); the estate uses three-letter ones on `courses` (**146 of 146 rows**, OBSERVED),
and `course_audio.language` is canonicalised to the same three-letter form by
`course_audio_canonical_identity`. The fixture now uses `eng`/`spa`, so the key
`normalizeText(text)|language|role` at `:788` really does meet the key built at `:295`. With the
old two-letter fixture that comparison would have been vacuous.

---

## 8. What is still unknown

1. **Live code is running that is not on `main`.** The database is executing trigger/function
   code from `feat/lego-audio-link-integrity-2026-08-17`, a 17-commit branch **not merged to
   `main`**, with rows dated 2026-08-17/18. Reading only `main` would misdescribe production.
   The reproduction avoided this by dumping from live, but **any fix must be written against
   live definitions, not the repo's.** This is the biggest trap here.
2. **How many of the 7,983 resolved flags were closed by the no-op button.** Not derivable from
   the schema (§6).
3. **Which on-screen button a human actually presses.** At least four front-end paths exist and
   two post to endpoints with **no server-side handler** (`/api/audio/regenerate`,
   `/api/audio/generate-missing`). Not determinable from code alone.
4. **What bumped `audio_revision` on 254,686 rows** when the ledger holds only 51,891.
5. **Scenarios F and H1's second half assert against a faithful re-implementation** of
   `getAudioNeeds` steps 1–2, not the shipped function. **Scenario H's headline result does not
   depend on that** — Step A is the real live RPC, executed by Postgres, and it re-binds the slot
   before `getAudioNeeds` is consulted at all.
6. **How many slots have been through unlink-then-generate.** Not derivable — see §6. This is the
   single most important open number in this document.
7. **Not measured:** how many orphaned mp3s `/regenerate-single` has already paid for.
8. The reproduction omits seven bookkeeping triggers, `text_stripped` is absent, and the S3 HEAD
   is a predicate rather than a real call.
9. **Whether operators also unlink via a UI button** rather than by hand SQL. The repo has no
   route that nulls a content `*_audio_id` on request that I found; the sweeps appear to have been
   ad-hoc. Not established.

---

## 9. Method note

**Revision 1** — three workers, disjoint scopes: **#104** code trace, **#105** the reproduction,
**#106** live forensics and git provenance. Their findings converged and corrected my own initial
reading: I had proposed `ignoreDuplicates` as the third layer, and the reproduction refuted it for
the main path.

**Revision 2** — no workers; done in one session against revision 1's harness, as instructed.
Added `link_all_audio_ids` to the fixture from live via the existing read-only dump script,
extended the harness with Step A and a full `/generate` walk, wrote six scenarios, ran the suite
(14/14), read the live bodies of `link_all_audio_ids`, `audit_content_change` and
`null_lego_audio_on_text_change` out of `pg_proc`, and ran the counting queries in §6.

**Two things I got wrong in revision 1 and am correcting here:** the headline answered the
never-unlinked case as though it were the only case; and Layer 2 described the link pass without
naming the RPC, its voice-blindness, or the fact that its result is never reported. Kai's
correction was right on both counts.

**Constraints honoured in revision 2:** **zero TTS spend** (the only "renderer" is `fakeTts()`,
offline); **zero writes to any database** — every live statement ran under
`SET default_transaction_read_only = on`, against `pg_proc`, `pg_trigger`, `information_schema`,
`language_canonical`, `courses`, `course_audio`, `course_legos`, `audio_flags`,
`content_audit_log`, `content_audio_link_drops`; **no audio row unlinked or deleted live** — the
unlink happens only inside the in-process PGlite fixture; no S3 access; no live course generated
against; **no fix applied, nothing merged.**
