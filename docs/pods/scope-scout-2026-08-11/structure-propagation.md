# Pod-0 structure & propagation — scope scout, 2026-08-11

Survey only, read-only, no DB writes, no TTS. All numbers below are live-queried against
Supabase during this session (2026-08-11) unless marked otherwise. `psql` unavailable;
all queries via `@supabase/supabase-js` (SUPABASE_URL/SUPABASE_SERVICE_KEY from `.env`).

**Note on concurrency**: this branch (`fix/idkey-writers-shared`) had other agents landing
commits on it *during* this survey (e.g. `tools/pods/align-pod0-to-canonical.cjs` and
`tools/pods/clone-pod.cjs` appeared mid-session, both dated 2026-08-11). Findings below
reflect the DB and repo state as queried; re-verify before acting.

---

## 1. The pod-0 vs pod-0-unrecorded split — THE URGENT QUESTION

**Read path, verified in code** (`ssi-learning-app/packages/player-vue/src/composables/useListeningPods.ts:161`):

```js
const podId = `${course}:pod-0`
const { data } = await supabase.from('listening_pod_sentences')...eq('pod_id', podId)...
```

The app **only ever** queries the literal id `<course>:pod-0`. There is no fallback,
no redirect, no logic anywhere in `ssi-learning-app` that reads `pod-0-unrecorded` —
grepped the whole repo for `pod-0-unrecorded` and `unrecorded`: zero hits outside this
dashboard repo. A pod on any other slug is **completely invisible to the app**. This
matches the intent documented in `tools/pods/clone-pod.cjs`'s header.

**Live DB state, queried just now:**

| pod id | pod row exists | sentence rows |
|---|---|---|
| `cym_n_for_eng:pod-0` | yes | **0** |
| `cym_n_for_eng:pod-0-unrecorded` | yes | 232 |
| `cym_s_for_eng:pod-0` | yes | **0** |
| `cym_s_for_eng:pod-0-unrecorded` | yes | 232 |
| `spa_for_eng:pod-0` | yes | 142 (old canon) |
| `spa_for_eng:pod-0-unrecorded` | yes | 232 |
| `deu_at_for_eng:pod-0` | yes | 232 (new canon, direct) |
| `deu_at_for_eng:pod-0-unrecorded` | **no row** | — |

Course status (`courses.status`): `cym_n_for_eng` = **released**, `cym_s_for_eng` =
**released**, `spa_for_eng` = **released**, `deu_at_for_eng` = **draft**.

### Definitive answer to "does a Welsh learner get content today?"

**No. A learner opening pod-0 in `cym_n_for_eng` or `cym_s_for_eng` right now gets an
empty scene list — zero sentences, not stale content, not an error, just nothing.**
This is a live hole on two **released** courses, not a draft/staging concern.

### How it happened (traced from code + row-level timestamps)

Two different tools touched Welsh pod-0, six weeks apart, with **opposite semantics**,
and nobody reconciled the difference:

1. **2026-08-06, `tools/pods/align-welsh-pod0-to-canonical.cjs`** (Welsh-specific,
   predates the generalised tool). This script's `applyCourse()` (line ~282-298)
   aligns **in place**: it reads `podId = ${course}:pod-0`, upserts rows by their
   existing `id` (same ids, same `pod_id`), against the *default* `POD_SLUG = 'pod-0'`.
   It does **not** write to a separate slug in this version — there is no
   `pod-0-unrecorded` write path in this file at all (confirmed by reading the file:
   every `pod_id: podId` reference resolves to the single default `podId`).
   I verified this against the row data itself: every sentence row now living under
   `cym_n_for_eng:pod-0-unrecorded` still carries an `id` of the form
   `cym_n_for_eng:pod-0:SC01-S001` (never renamed) and `created_at: 2026-06-11`
   (pre-dating the 2026-08-06 run by two months — these are the original rows,
   edited in place, not new inserts).
2. **A separate, uncommitted step, same day** moved those already-aligned rows'
   `pod_id` column from `pod-0` to `pod-0-unrecorded` — this is not done by any
   script in the repo (grepped `tools/`, `services/`, `scripts/` — no committed code
   sets `pod_id` to a `-unrecorded` value). It is documented only as data, in the
   pod row's own `metadata`:
   ```
   "gated": true, "gated_on": "2026-08-06",
   "gated_reason": "Aran/Catrin have not recorded these pods yet (Tom, 2026-08-06)",
   "restore_by": "move listening_pod_sentences.pod_id back to <course>:pod-0"
   ```
   That is: someone manually (SQL, one-off node script, or a Supabase console edit —
   no trace of which) pulled the *already in-place-aligned* rows off the live slug
   to gate them, leaving `pod-0` at zero rows, intending a later restore.
3. **2026-08-08, the tool was generalised** (`align-pod0-to-canonical.cjs` +
   `clone-pod.cjs`, per their headers). The *new*, safer precedent — used for Spanish
   — is: `clone-pod.cjs` copies pod-0 to `pod-0-unrecorded` **first** (source untouched,
   fresh row ids, fresh `created_at`), *then* `align-pod0-to-canonical.cjs
   --pod-slug=pod-0-unrecorded` aligns the clone. Spanish's `pod-0-unrecorded` rows
   prove this: `id` prefix is `spa_for_eng:pod-0-unrecorded:...`, `created_at:
   2026-08-08`, distinct from the untouched `spa_for_eng:pod-0` (142 rows, `created_at:
   2026-04-21`, still what learners get).
4. **Nobody went back and re-ran Welsh through the safe (clone) path**, and nobody
   executed the `restore_by` instruction either — which is itself the wrong fix now:
   restoring would put the **pre-canonical, off-canon English back live**, exactly
   what the 2026-08-06 brief ("make sure the human recording is not doing the older
   stuff") was written to prevent. So the honest current state is: Welsh pod-0 has
   been sitting empty for released courses since 2026-08-06 (5 days as of today),
   with the one documented "undo" path being one nobody actually wants to take.

`clone-pod.cjs`'s own header claims *"cym_n_for_eng — a released course — has carried
both since 2026-08-06"* (i.e. both slugs holding rows). **That comment is stale/wrong
against the live DB right now** — `cym_n_for_eng:pod-0` is empty, not carrying rows.
Flag this as a documentation-vs-reality gap for whoever owns that file next.

**Gap**: no record of who ran the manual gating move, or via what exact command —
this is an explicit gap, not a guess.

---

## 2. The 231 vs 232 arithmetic

Canon (`canonical_pod_scenarios`, `pod_slug='pod-0'`) = **231 rows**, confirmed by
direct count. Compared `deu_at_for_eng:pod-0` (232 rows, the only course sitting
directly on canonical `pod-0` with real content) against canon, aligned by
`global_order`:

- **226 / 232 exact byte match** (matches the parent's ~226/232 finding).
- **5 rows differ by design**: canon carries the literal placeholder
  `[target language]`; the course row has it substituted with the course's actual
  target-language name (`German`, at global_order 33, 94, 95, 221, 226). This is the
  documented `"[target language]"` placeholder-substitution the parent flagged —
  confirmed, all 5 of them, no surprises.
- **The 232nd row is not a canon line at all.** It's a pre-existing, fully blank
  stray row: `deu_at_for_eng:pod-0:SC15-S012`, scene 15 / sentence 12, speaker
  "Narrator", `target_text: ""`, `known_text: ""`, no audio ids, `created_at:
  2026-07-20` (two weeks before the canonical alignment ran on 2026-08-06). The
  align tool evidently left it untouched rather than deleting it — it's dead weight,
  not new content. `global_order: 90142` — clearly a parked/orphaned slot (compare
  to the "park out of the way" mechanism at `align-welsh-pod0-to-canonical.cjs:284`,
  which moves surplus rows to `global_order: 100000+`; a value of `90142` looks like
  the same kind of park-and-forget from an earlier pass, never cleaned up).

**deu_at_for_eng took a different route than Welsh/Spanish**, confirmed:
- Its `listening_pods` row has `slug: 'pod-0'` (not `-unrecorded`), no `"gated"` flag
  in metadata, and its `canonical_alignment_note` cites
  `tools/pods/align-pod0-to-canonical.cjs` (the generic tool) — but with **no**
  matching `pod-0-unrecorded` row ever created (confirmed: query returns no row at
  all for `deu_at_for_eng:pod-0-unrecorded`).
- This is correct per the tool's own documented rule: `deu_at_for_eng.status =
  'draft'`, and `align-pod0-to-canonical.cjs`'s comment block says a clone-first
  detour is needed only "on a LIVE course" — a draft course is free to align
  in place. Welsh and Spanish are `released`; deu_at is not. The tooling behaved
  exactly as designed for deu_at. The Welsh failure is a **process gap** (the
  2026-08-06 run predates the safety mechanism), not a tool misuse.

---

## 3. Propagation tooling catalogue

| Tool | What it does | Dry-run? | Course-agnostic today? |
|---|---|---|---|
| `tools/pods/clone-pod.cjs` | Copies a course's pod row + all sentence rows to a new slug (e.g. `pod-0` → `pod-0-unrecorded`). Nothing deleted, nothing moved, source untouched, audio ids copied not reassigned. Refuses to overwrite a destination that already has rows. | Yes, default; `--apply` to write | **Yes** — `--course=<code> --to=<slug>`, no hardcoded course list |
| `tools/pods/align-pod0-to-canonical.cjs` | Rewrites a pod's English (+ speakers + ordering) to the 2026-08-06 canonical. Target text carried forward ONLY onto slots whose English is byte-identical to what it was written against; everywhere else target_text is left empty (not NULL) — deliberately unrecordable rather than silently wrong. Archives the pre-align state for restore. Audio never deleted; a changed line's audio pointer is dropped (not the underlying clip). | Yes, default; `--apply` to write; `--restore-from-archive` | **Yes**, generalised 2026-08-08 — `--course=<code>[,<code>...]`. **Guard**: courses whose *known* language isn't English are explicitly NOT supported yet (see `planCourse` guard) — this excludes any eng_for_X course from this exact tool as-is. |
| `tools/pods/align-welsh-pod0-to-canonical.cjs` | The superseded predecessor of the above, hardcoded to Welsh, aligns **in place** at `pod-0` (no clone-first safety). Still present in the repo and still runnable — **this is a live footgun**: running it again on a released course would repeat the 2026-08-06 mistake. Recommend either deleting it or gating it with a hard `if (status==='released') throw`. | Yes default, `--apply` to write | No — Welsh-only, and unsafe on live courses |
| `services/pod-bulk-migrate.cjs` | The heavy fleet-wide tool: 4 resumable stages per course — **regen** (full dialogue rebuild from canon via `pod-dialogue-generator.cjs --force`), **recolour** (reassign speaker voices, null changed audio), **tts** (render missing audio — in-proc or via live Phase 8), **explainers** (rebuild explainer text+audio). Auto-discovers its course list by querying `listening_pods` directly (`discoverPod0Courses()`) — no hardcoded list. Ledger at `scripts/pod-bulk-migrate-ledger.json` (gitignored `scripts/`, so **no ledger currently exists / no run has happened yet**, confirmed — file not found). | `--dry-run` flag exists | **Yes**, but this is the tool that actually **spends money** (TTS stage) — needs the approval gate before any real run, per CLAUDE.md. Also `--only=`, `--from=`, `--redo=` for scoping a partial run. |
| `tools/seed-canonical-pods.cjs` | One-off: parses Aran's English master markdown into `canonical_pod_scenarios`. Not a per-course propagation tool — this is upstream of everything else (populates the canon itself, not a course's copy of it). Not relevant to propagating canon TO courses. | Yes default, `--execute` to write | N/A — operates on the canon table, not courses |
| `tools/pod-sync.cjs` | Parses a hand-written markdown pod file and upserts to `listening_pods`+`listening_pod_sentences` wholesale (delete+insert by pod_id). This is the **pre-canonical-pipeline** authoring path (markdown → DB), distinct from the canon-driven tools above. Still usable for `music`/`travel-situations`-style bespoke pods that have no canonical-scenario backing. | `--dry-run` flag | Yes, always was — takes `--course=`/`--slug=` |
| `tools/pods/pod0-recording-diff.cjs` | Pure diff function (no DB/IO): three-way diff of served-vs-canonical English, bucketed SURVIVES_UNCHANGED / REWORDED (sub-typed numerals_only / placeholder / wording) / NEW / STALE, plus audio-pointer invalidation counts. This is the analysis engine `align-pod0-to-canonical.cjs` calls internally — also directly reusable standalone for a read-only risk check (used below, §5). | N/A (pure function) | Yes — takes any `(served, canon)` row arrays |

### What this means for the ~60 remaining courses

The expensive, genuinely missing piece is **not** the align/clone/diff layer — that's
already course-agnostic, dry-run-capable, and audio-safe by construction (drops
pointers, never deletes clips). The gaps that make the remaining courses non-trivial:

1. **No committed "gate a live course off cleanly" tool.** The clone step exists;
   the *swap-back* step (promote a completed `pod-0-unrecorded` to replace `pod-0`
   once translation+recording is done) has no committed script either — the Welsh
   incident shows this step was done by hand, once, undocumented in code. This is
   the single highest-leverage missing tool: write a `swap-pod.cjs` that atomically
   (a) archives current `pod-0`, (b) points `pod-0`'s sentences at the finished
   clone's rows (or vice versa), (c) never in a state where `pod-0` has 0 rows.
2. **Known-language guard**: `align-pod0-to-canonical.cjs` explicitly does not yet
   support courses whose known language isn't English — this blocks every
   `eng_for_X` course (the reverse direction) from this exact tool without further
   work. Worth checking how many of the ~60 remaining courses are `eng_for_X`.
3. **`pod-bulk-migrate.cjs` is a different, heavier pipeline** (full dialogue
   *regeneration* via LLM, not the conservative "carry forward what still matches"
   align approach) — its header explicitly says align is preferred *because* bulk
   regen "WRITES TARGET TEXT as a side effect," which the align tool avoids. These
   are two different strategies for the same problem, both already built; the choice
   between them (surgical align+translate vs. full regen) is itself a decision
   worth a one-line ruling before fanning out to 60 courses, not something to infer.
4. **Translation is not automated at all** in either pipeline — align only ever
   carries forward *existing* target text on matched lines; every new/reworded line
   is left empty for a human (or a separate, unreviewed-here process) to fill in.
   For the ~60 remaining courses this is very likely the actual bottleneck, not the
   scripting.

---

## 4. Non-pod-0 pods — scope inventory

**Canonical scenario coverage** (`canonical_pod_scenarios`, grouped by `pod_slug`):

| pod_slug | canon rows |
|---|---|
| `pod-0` | 231 |
| `pod-0.5` | 27 |
| `pod-1` | 236 |

**Live pod rows checked:**

| pod id | sentence rows | canon exists? |
|---|---|---|
| `hrv_for_eng:pod-1` | 180 | yes — 236 canon rows for `pod-1`, **not yet aligned** (180≠236, same shape of gap as pod-0 pre-alignment) |
| `spa_for_eng:music` | 749 | **no** — `music` isn't a `canonical_pod_scenarios` slug at all; bespoke content authored via `pod-sync.cjs`, out of scope for the canon-propagation effort |
| `spa_for_eng:travel-situations` | 72 | **no** — same, bespoke |
| `zzz_test_for_eng:pod-0` | 6 | test course (`status: draft`, name says it all) — exclude from any real count |

`pod-0.5` (27 canon rows) has **no live pod row queried** in this pass matching that
slug — did not find any course with a `pod-0.5` id; flag as an open question for
whoever scopes that tier (may simply be unbuilt everywhere yet).

**In scope for "propagate canon to courses"**: `pod-0` (the whole survey above),
and `pod-1` as the next tier once pod-0 is settled (hrv_for_eng is the pathfinder
there, same shape of problem). **Out of scope**: `music`, `travel-situations` —
no canonical backing, different authoring path entirely, don't fold them into
the pod-0/pod-1 canon-alignment sweep.

---

## 5. Risk — orphaning audio when a pod moves from 142 rows to canon

Ran the (read-only, no DB writes) diff engine `pod0-recording-diff.cjs` against four
**live, released** courses' current `pod-0` (142 rows each) vs. the 231-row canon, to
quantify what a text-align pass would actually do if pointed at a live pod directly:

| course | served rows | unchanged | reworded | new (no counterpart) | stale | target audio pointers invalidated | known(English) audio pointers invalidated |
|---|---|---|---|---|---|---|---|
| spa_for_eng | 142 | 87 | 54 | 90 | 1 | **43 / 142 (30%)** | **54 / 133 (41%)** |
| fra_for_eng | 142 | 110 | 31 | 90 | 1 | **26 / 142 (18%)** | **19 / 68 (28%)** |
| deu_for_eng | 142 | 105 | 36 | 90 | 1 | **26 / 142 (18%)** | **37 / 142 (26%)** |
| ita_for_eng | 142 | 113 | 28 | 90 | 1 | **22 / 142 (16%)** | **29 / 142 (20%)** |

**Interpretation:**

- The parent's finding is confirmed quantitatively: real, independent rewording of
  the English (not just "[target language]" placeholder churn) has invalidated
  16–30% of TARGET-language audio pointers and 20–41% of KNOWN-language (English)
  audio pointers *per course*, purely from English text drift away from canon.
- **The tool itself does not delete audio.** Confirmed in code
  (`align-pod0-to-canonical.cjs` header: *"Audio is NEVER deleted and never
  regenerated. A take whose line changed has its pointer dropped from the slot...
  so the recorder is not told 'already done' about a line that now reads
  differently."*) — the `course_audio` clip row survives; only the
  `target_audio_id`/`known_audio_id` FK on the *sentence* row is nulled.
- **But dropping the pointer IS breaking the learner-facing link**, full stop, for
  whichever pod the write lands on. If this tool were ever run with `--apply`
  directly against a **live** `pod-0` (skipping the clone step), 16–30% of that
  course's currently-playing target clips and 20–41% of its English guide clips
  would go silent for real learners on the very next page load — not because the
  clip was deleted, but because nothing points at it anymore. That is a real,
  immediate, learner-facing break, indistinguishable from data loss at the UI layer
  even though the underlying audio asset is intact and technically recoverable.
- **The clone-first precedent is what actually prevents this**, and it is optional
  behaviour, not enforced by the tool: `align-pod0-to-canonical.cjs` defaults
  `--pod-slug` to `pod-0` (comment: *"Defaults to the learner-facing pod-0, which is
  right for a course that is not live"*) — nothing in the tool itself checks
  `courses.status` and refuses to run against a released course without
  `--pod-slug=pod-0-unrecorded`. The safety is a documented convention, not a code
  guard. Recommend adding that check before this tool is pointed at the remaining
  ~60 courses at scale — a single missed `--pod-slug` flag on a released course
  reproduces the Welsh-shaped hole, except with audio silently unlinked instead of
  the whole pod at zero rows.
- **Make-before-break compliance, as currently practiced**: clone-pod.cjs / the
  generalised align tool together implement it correctly *when both steps are used
  and the swap only happens once the clone is complete* — but as §1 shows, the
  swap-back half of that sequence has no committed tool and was done by hand at
  least once, with the live pod left empty rather than swapped. A pointer-move
  repair (the `restore_by` metadata note) is exactly the kind of shortcut the
  standing rules warn against — restoring old pointers now would silently
  reintroduce off-canon English, not fix anything.

**Plain answer**: a text-align pass does **not**, by itself, "silently break working
audio" in the sense of deleting anything — but pointed at a live pod directly (no
clone), it silently *unlinks* 16–41% of a course's currently-serving clips per the
measurements above, which is functionally identical to breakage for a learner. The
clone-first workflow avoids this, and is already built; it just isn't enforced.

---

## Summary for the order-of-work section

1. **Fix the two live holes first, deliberately, not via `restore_by`.** Welsh
   `pod-0` (cym_n, cym_s — both released) is serving zero content right now. The
   correct fix is finishing the pending translation/recording work already staged
   in `pod-0-unrecorded` (232 rows, cym_n has 0 draft target rows recorded yet,
   cym_s has 104/232) and then swapping it in — not restoring the old off-canon
   English.
2. **Build the missing swap-back tool** before touching any more courses — it's the
   one step in the pipeline that's been done by hand, undocumented, and got it wrong
   once already.
3. **Add a `status==='released' ⇒ refuse without explicit --pod-slug=*-unrecorded`
   guard** to `align-pod0-to-canonical.cjs` before running it at fleet scale — the
   16-41% audio-pointer-invalidation numbers above are the cost of a missed flag.
4. **Decide align-vs-regen** (align+carry-forward vs. `pod-bulk-migrate.cjs`'s full
   LLM regen) once, in writing, before fanning out to the remaining ~60 courses —
   both tools exist and do materially different things to already-recorded audio.
5. Translation-into-empty-slots is the real bottleneck for volume, not tooling —
   confirm this reading with Tom before treating "the remaining 60 courses" as a
   scripting problem.
