# Pod keying: the re-slug that landed, and what a `pod-0` rename would really cost

**2026-09-02.** Two jobs in one. The first executed against the live database. The second is a
census that deliberately executed nothing, and the reason it executed nothing is the most useful
thing in this document.

---

## Part 1 — the Welsh health rows now have their own slug. Landed and verified.

### What was wrong

`canonical_pod_scenarios` has **one target column and no course column at all**. So when job #29
authored 438 turns of North Welsh into `pod_slug = 'health'`, it consumed the *shared English canon*
slug — the sibling of `retail`, `trades`, `hospitality`, `care-work` and `learning-flagship`, every
one of which has a null target. `health` stopped being English canon, and South Welsh had nowhere
to go. The other layer, `listening_pods`, has modelled this correctly all along: it keys by
`course_code`.

### What changed

| slug | before | after |
|---|---|---|
| `health` | 438 rows, **438 carrying Welsh**, `target_lang = cym_n` | 438 rows, **0 carrying a target** — English canon again |
| `cym_n_for_eng:health` | did not exist | **438 rows, 438 Welsh, `cym_n`** |
| `cym_s_for_eng:health` | — | still free, for the southern authoring |
| `canonical_pod_walk_steps` under `health` | 201 | **201, untouched** |

It is a **copy, then a clear** — not a move — and that was forced by the data, not chosen for
comfort. `canonical_pod_walk_steps.scenario_id` is a real foreign key to
`canonical_pod_scenarios(id)` **ON DELETE SET NULL**. Deleting the 438 source rows would have
silently nulled 201 walk-step references: the walk still there, pointing at nothing. Copying leaves
every reference intact, which is why **no walk step was touched and no walk was duplicated**. The
pair layer needs none — `pair-overlay` in the walk registry "declares no walk steps",
`health-general-welsh` has zero, and the Script Lab falls back to `walkFromCanonicalRows()` when the
API returns an empty walk, a path that explicitly carries `target` and `targetLang`.

Scenario ids bake the slug in (`health:SC01-F01-S01`), so the copies carry rewritten ids
(`cym_n_for_eng:health:SC01-F01-S01`) and the id agrees with the slug — the landmine that
`tools/pods/reslug-pod-rows.cjs` exists to defuse in the other layer.

### How it was verified — read back out of the live database, not off the script's own output

- `cym_n_for_eng:health`: **438 rows, 438 with `target_text`, all `target_lang = cym_n`.**
- `health`: **438 rows, 0 with `target_text`, `target_lang` null.**
- **English fingerprint identical on both sides and to the before-snapshot**:
  `md5(string_agg(md5(english_text)))` = `b06bf9a29cb55d6c097ee563fa5c8cc5` before, on `health`
  after, and on the pair slug after. **No `english_text` was written anywhere, by any path.**
- **Row-for-row diff of all 438 copies against the pre-change snapshot: 0 mismatches** across
  english, Welsh, target_lang, global_order, variant_key, scene_number and sentence_number.
- Walk steps: **201 under `health`, all 201 `scenario_id` references resolving, 0 dangling, 0 rows
  under the pair slug.**

### The URL works

Aran's URL moves from `popty.app/canonical/scripts/health` to
**`popty.app/canonical/scripts/cym_n_for_eng:health`**. The colon in a path segment was the real
risk, and it was checked at every layer that could have eaten it:

| layer | check | result |
|---|---|---|
| Vercel edge | `GET /canonical/scripts/cym_n_for_eng:health` and the `%3A` form | **200** both, SPA shell served |
| vue-router | resolved both forms against the real router | both → route `ScriptLabScript`, `slug = cym_n_for_eng:health`, **not the catch-all** |
| Express | `/api/admin/canonical-pods/<colon>` raw and `%3A` | **401 (auth), not 404** — the route matched and reached the handler; a genuinely unmatched path returns 404 |
| the data | replayed the endpoint's exact Supabase reads | 438 scenarios, 438 Welsh, walk `[]`, first line *"Dw i'n dysgu Cymraeg ar y funud…"* |
| the listing | replayed `GET /api/admin/canonical-pods` | both `health` (438/23) and `cym_n_for_eng:health` (438/23) present |

**Explicit gap:** I could not drive the rendered page in a browser. Both the Popty API and the
Vercel versioning API require a Supabase admin JWT, and a worker has none. Every layer *underneath*
the render is verified above; the pixels are not.

### One code change, and it is data

`tools/pods/pod-corpora.json` gains one entry for `cym_n_for_eng:health`. Without it the Script Lab
lists the pod under **"Unregistered — in the canonical store but not in the walk registry… find out
which before editing it"**, which is an alarm, not a home. The entry is `corpus: null`, so the
ingest tool skips it and **the database is canon**, exactly as for `pod-1`. This is the mechanism
the registry advertises: one JSON entry, no code change anywhere.

**One taste call for Tom, and nothing was invented:** the Script Lab shows a walk by its registry
`name`. The pair layer is registered as **"Health — North Welsh pair layer"** and sits in the Themed
group beside "Health". If it should instead be nested under Health, or named some other way, that is
a one-line change to that entry — no convention was invented and no display code was touched.

### Checked and deliberately not acted on

- **`variant_key` is a flow variant, not a course discriminator.** Nine values —
  `flow-01/02/03` (126 rows each, scenes 2–23), `english-flow-01/02/03` and `welsh-flow-01/02/03`
  (scenes 1 and 13) — every one of them `target_lang = cym_n`. It is not a hidden alternative to
  the re-slug.
- **`canonical_script_versions` holds nothing under `health`.** Job #29 wrote the 438 Welsh lines
  by direct database write, not through the Script Lab, so there is no edit history to carry across.
  A clean start, not a loss.
- **`course_sectors`** has one row, `sector_slug = 'health'`, `sector_pod_slug` null. That column
  names a sector, not a pod slug, and nothing there moved.

---

## Part 2 — the `pod-0` → `pod-1` census. **Nothing was executed, and here is the number.**

Tom: *"pod-0 has gone so we need to update that to pod-1 and so on."* The gate I was given: rename
in full if the footprint is the two Welsh pods plus under about twenty nameable code sites; census
and cost it if it is the estate.

**It is the estate, and it is worse than a big rename — it is a rename that would collide with work
already in flight.** I took the second branch.

### The finding that decides it: `pod-1` already exists, live, on 22 courses

| slug | pods | sentence rows | visibility |
|---|---|---|---|
| `pod-0` | **46** | **6,640** | 44 live, 2 held |
| `pod-1` | **22** | **5,082** | 21 live, 1 held |
| `pod-0-unrecorded` | 17 | 3,927 | held |
| `pod-0-retired-2026-08-22` | 16 | 2,272 | held |
| `pod-0-retired-2026-08-24` | 6 | 1,031 | held |
| `pod-0-gated-2026-08-06` | 2 | 0 | held |
| `pod-1-retired-2026-08-24` | 16 | 3,696 | held |
| `pod-1-retired-2026-08-22` | 1 | 180 | held |
| `pod-1-staged-2026-08-23` | 1 | 231 | held |

**Zero courses hold both**, and the 22 courses on `pod-1` are *exactly* the 22 with a
`pod-0-retired-*` row. That is not a coincidence and it is not a naming mess: **it is a content
switchover, already running, 22 of 68 courses in.** The old pod-0 is 142 lines; the new pod-1 is
231. Renaming the string would not converge these two — it would drop the new content's name on top
of the old content.

The code says so itself, in the Script Lab's own copy: *"One slug, two meanings, while the cutover
runs… on the generated side `pod-1` is the new slate and `pod-0` is still the old one."* And in
`services/pod-dialogue-generator.cjs`: *"it is NOT a course's listening-pod slug, which is
per-course, still 'pod-0' on most courses, and migrating separately."*

### The full database blast radius

| table / object | rows keyed on `pod-0` | note |
|---|---|---|
| `listening_pods` | 46 (87 including `pod-0-*` variants) | slug column |
| `listening_pod_sentences` | **6,640** (13,870 including variants) | **primary keys**, `<course>:<slug>:<tail>` |
| **`pod_legos.first_seen_sentence`** | **13,222** of 19,742 | *not in the original brief* — sentence-id references |
| **`learner_pod_state.sentence_id`** | **269** rows, 20 learners, 12 courses | **learner progress is filed against the slot key** |
| `estate_map()` (live SQL function) | hardcodes `WHERE p.slug = 'pod-0'` | emits JSON keys `pod_0` and `courses_with_pod_0` |
| `canonical_pod_scenarios` / `_walk_steps` | **0** | renamed to `pod-1` on 2026-09-01 (#732, audited #751) |
| `canonical_script_versions` | 0 under `pod-0`; 6 under `pod-0.5` | edit history of a sacked slate |

The `learner_pod_state` line is the one that turns this from a rename into a **progress migration**
under the standing content-change protocol: progress is filed under a sentence's *slot*, not its
text, so a naive slug swap credits a learner with something they never heard. `pod-0` was measured
at 46 pods / 6,632 sentences by `src/lib/walkFacts.js` on 2026-09-01 and is 6,640 today — an
eight-row drift, worth knowing before anyone quotes the old number.

### Live code sites — 31 files, named

**The serving resolver (three copies of one two-element allowlist):**
- `src/lib/servingPod.js:50` — `export const SERVING_SLUGS = ['pod-1', 'pod-0']`
- `api/pod-content.js:79,86` — same list, plus `|| 'pod-0'` as the final fallback
- `services/pod-voice-approvals.cjs:269` — `['pod-0-unrecorded', 'pod-1', 'pod-0']`

These already handle the split, deliberately: preference order, explicit allowlist, never a prefix
match. `src/views/PodsDoc.vue:25` states the doctrine — *"Which slug a course serves is a per-course
fact: resolve it, never assume it."*

**Hardcoded `pod-0` defaults and constants:**
- `services/production-api.cjs:4691` — `String(req.body?.slug || 'pod-0')`
- `services/phases/phase8-audio-v13.cjs:7415` — `POD0_CANON_SLUGS = new Set(['pod-0', 'pod-0-unrecorded'])`, used at `:7968` to scope canon reuse
- `services/pod-bulk-migrate.cjs:83` — `const POD_SLUG = 'pod-0'`
- `services/pod-dialogue-generator.cjs:533,714` — `podSlug = 'pod-0'` parameter defaults
- `services/pod-lego-extractor.cjs:332` — `TARGET_POD_SUFFIX = 'pod-0'`
- `src/views/PodsView.vue:241` — `generatePod(force, slug = 'pod-0')`
- `src/views/admin/PodLab.vue:264` — `|| \`${courseCode}:pod-0\`` fallback
- `api/pod-cast-voices.js:247` — `no pod-0 found for ${courseCode}`

**API contract strings** (machine-readable, consumed downstream): `services/production-api.cjs`
1089–1200 — blocker reasons `pod0_awaiting_voice_approval`, `pod0_stale_voice_approval`,
`pod0_known_track_incomplete`, `pod0_target_track_incomplete`, and the `course.pod_0` estate-map
block.

**Recorded measurements that would go stale:** `src/lib/walkFacts.js:42-44`
(`GENERATED_CORE.oldSlate/newSlate`), `src/views/ScriptLabView.vue:66-70`,
`src/content/pod-thinking-meta.js` (10 doc-index entries, mostly `pod-0.5`).

**Tests and fixtures: 33 files** assert on the literal `pod-0` — 19 in `services/`, `src/` and
`api/` (heaviest: `services/pod-voice-approvals.test.cjs`, `api/canonical-script.test.js`,
`src/lib/servingPod.visibility.test.js`, five `services/voice-engine/__tests__/pods-*`), 14 in
`tools/`, plus the fixture `src/views/admin/__fixtures__/eng_for_guj-cast.json`.

### The learning app — already resolver-based, and it is the good news

`../ssi-learning-app` reads Supabase directly, so a slug rename reaches learners through it. It
was censused read-only (worker **#76**, and independently re-grepped here). **Only two functional
sites exist; everything else is comment:**

- `packages/player-vue/src/composables/servedPod.ts:41,44` — `SERVING_POD_SLUGS = ['pod-1', 'pod-0']`
  and `FALLBACK_POD_SLUG = 'pod-0'`. Its own header records the history: five player read paths
  (`useListeningPods.ts`, `listeningMetaCache.ts`, `usePodLapScheduler.ts`,
  `generateLearningScript.ts`, `usePodStage0.ts`) used to hardcode `<course>:pod-0` each; since
  Tom's 2026-08-22 ruling they share **one resolver**, and every unknown resolves to `pod-0` rather
  than rejecting.
- `api/courses/[code]/bundle.ts:412` — `.in('slug', ['pod-1', 'pod-0'])`, with the comment naming
  `servedPod.ts` as the source of truth.

**6 test files** assert on the literal (`servedPod.test.ts`, `bundle.test.ts`,
`listeningMetaCache.test.ts`, `usePodLapScheduler.test.ts`, `ListeningOverlay.podScene.test.ts`,
`revisedAudioRefs.lanes.test.ts`).

**And it writes learner progress against the slug.**
`packages/core/src/persistence/PodStateStore.ts` upserts `learner_pod_state` on
`(learner_id, course_code, sentence_id)` — and `sentence_id` is `<course>:<slug>:<tail>`. So a slug
rename in `listening_pod_sentences` without a matched progress migration does two things at once:
it orphans the 269 existing rows, and the app immediately starts writing fresh zero-count rows
under the new key. That is the failure `pod-switchover.cjs` already prevents by doing both in one
transaction.

**Two more structural sites, from #76's full report and re-verified here:**

- `packages/player-vue/src/composables/usePodStage0.ts:104` — `.like('id', \`${course}:${podSlug}:%\`)`.
  A **prefix match on the slug embedded in the sentence id**. It reads the slug from the resolver, so
  it survives a rename *provided the ids are rewritten in lockstep with the pod row* — which is
  precisely the landmine `tools/pods/reslug-pod-rows.cjs` exists to defuse, and which bit for real on
  2026-08-10 (19 rows).
- `api/courses/[code]/bundle.ts:414` — `.order('pod_order', { ascending: true, nullsFirst: true })`.
  **The same null-ordering problem as `pods-plan.cjs`, on the learner's download path**: `pod_order`
  is NULL on 45 of 46 `pod-0` rows and all 22 `pod-1` rows, so download priority is arbitrary today.
  This strengthens the `pod_order` recommendation below — it is not only a build-side concern.

The delivery side is otherwise **already migration-ready**: the only thing a completed cutover
would let anyone delete is the `pod-0` fallback constant, and that can only go once every course is
across. #76's own reading is worth quoting: the real cost there is **not string-replace volume** —
it is redesigning the fallback semantics in `servedPod.ts` (what does a query error degrade to, once
`pod-0` no longer exists?) and the `learner_pod_state` migration.

**Two corrections to what the code says about itself:**

- **Nine comments across the learning app still say "the ~68 older courses serve `pod-0`"** — that
  was true before the switchover started and is now overstated by 22. The live split is **46 on
  `pod-0`, 22 on `pod-1`, 68 total**.
- #76 flagged `supabase/schema.sql:3016-3066` (`pod0 AS (… WHERE p.slug = 'pod-0')`) as something it
  could not verify from the delivery repo. **Closed here against the live database: `estate_map()`
  is a real function in `public`, it does hardcode `'pod-0'`, and it does emit the `pod_0` and
  `courses_with_pod_0` keys.** It is live, not a captured ad-hoc query.

**Grep noise, for shape:** #76's raw grep over its whole checkout returned 832 hits, of which
**714 (86%) were exact duplicates across seven parallel worktrees**. The real primary-tree count is
96 hits, and **only two files are gating logic**. The same lesson as the Popty docs count: a raw
occurrence number across a working estate measures worktrees and spent logs, not work.

### Docs — a count and a shape, because that is the useful answer

218 files, 11,427 occurrences. **Six JSON files carry 9,130 of them (80%)** — spent run logs, led by
`docs/pods/pod1-recast-regen-queue-by-language-2026-08-23.json` (5,358) and
`docs/pods/chunk-audio-cut-candidates-2026-07-17.json` (3,176). The remaining 2,078 are spread
across 199 markdown files, and **those are historical records: they describe what was true when they
were written and must not be rewritten.** In `tools/`, the same shape — 22 JSON files hold the bulk
(`tools/pod0-fill/scope.json` alone, 2,184), and 14 of the 102 `.cjs` files carry a date or `pod0`
in their own filename, marking them spent one-offs.

*(These counts are from a clean checkout of `origin/main`. The briefing's 3,253 files / 14,854
occurrences was measured in the shared working tree, which carries ~130 uncommitted files and a
large volume of untracked run logs.)*

### The recommendation

**Do not rename the string. Finish the switchover.** `tools/pods/pod-switchover.cjs` already exists
and already does the right things: make-before-break, the old pod renamed rather than deleted, audio
ids carried across untouched, a refusal to promote onto an occupied slug, a casting gate, and —
since Tom's A-107 ruling of 2026-08-14 — **learner-progress migration inside the same transaction**.
22 of 68 courses are through it. The remaining 46 are blocked on content, casting and, for the two
Welsh courses, human recording — not on a name.

A costed string-rename, for comparison, would be: 46 pod rows + 6,640 primary keys + 13,222
`pod_legos` references + 269 learner-progress rows, one live SQL function, four machine-readable API
reason strings and the `pod_0` estate-map key, 31 live code files across two repositories, 33 test
files — and at the end of it, 46 courses named `pod-1` holding 142-line old content sitting beside
22 courses named `pod-1` holding 231-line new content. **A half-done rename is worse than the
off-by-one, and a fully-done rename would be worse still.**

---

## Part 3 — where pod numbering is actually load-bearing

Flagged, not acted on. Tom retired pod numbering as a content label on 2026-08-31 — CORE plus
optional walks named by what they mask — so this is the evidence a naming pass would need. The
distinction: does the ordinal **drive behaviour**, or does it merely **appear in a name**?

**LOAD-BEARING — the ordinal drives behaviour:**

1. **`services/voice-engine/pods-plan.cjs:143`** — the sharpest one.
   `(a.pod_order || 0) - (b.pod_order || 0) || (a.slug < b.slug ? -1 : 1)`. **`pod_order` is NULL on
   45 of the 46 `pod-0` rows and on all 22 `pod-1` rows** — one row in the entire estate has a
   value, `0`. So the real sort key is the **slug string itself**, alphabetically. Renaming, or
   retiring numbers from names, silently changes plan ordering with nothing left to order by.
   *Populate `pod_order` before touching any pod name.*
2. **`services/voice-engine/pods-router.cjs:130`** — `.order('pod_order')` over the same nulls:
   ordering that is currently arbitrary and would stay arbitrary.
3. **The serving resolver**, three copies (above). The order of `['pod-1', 'pod-0']` *is* the
   preference rule that decides which pod a learner is served. Load-bearing, but as a two-element
   allowlist, not as arithmetic — retiring numbers means replacing it with a declared pointer.
4. **`services/phases/phase8-audio-v13.cjs:7415`** — set membership on `pod-0`/`pod-0-unrecorded`
   scopes which pods get canon-reuse in an audio pass.
5. **`estate_map()`**, live in the database — `WHERE p.slug = 'pod-0'` decides what the estate map
   *counts as a pod at all*, and its `pod_0` / `courses_with_pod_0` keys are an API contract.

**NOT load-bearing — the number is only a label:** every `title` in `listening_pods` ("… — Pod 0"),
`src/content/pod-thinking-meta.js`, `src/views/PodsDoc.vue`, `src/views/ScriptLabView.vue` and the
registry `name` fields. Renaming these is prose work, not behaviour.

**Already fixed, and it is the pattern to copy: `services/shared/pod-tiers.cjs`.** The code it
replaced read the pedagogical tier off the pod's *name* — `podSlug === 'pod-0' ? 8 : 12` — so
renaming a pod would have silently changed how hard its content is. Tom's ruling of 2026-09-01 made
the tier a **declared property** instead. That is the shape every remaining item on this list wants:
declare the fact, stop reading it out of the name.

*(Checked and cleared: `syllableCeilingFor()` takes the **canonical** slug, which is already
`pod-1`, so the 46 courses still on a `pod-0` listening slug are **not** silently getting the wrong
breathing ceiling. It reads like a live bug and it is not one.)*

---

## Open for Tom — each answerable in a word

1. **Finish the switchover rather than rename the slug?** My read: yes — the tooling exists, migrates
   progress in-transaction, and is 22/68 through. *(Y / N)*
2. **"Health — North Welsh pair layer"** as the Script Lab's name for the re-slugged pod, sitting in
   Themed beside Health? *(keep / rename / nest under Health)*
3. **Populate `pod_order` before any naming pass?** Without it, pod ordering falls back to
   alphabetical slug, which is the thing being retired. *(Y / N)*
