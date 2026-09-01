# The walk census — every walk in the estate, where it lives, and why the Script Lab cannot see it

*2026-09-01. Read-only: no DB writes, no schema changes, no registration, no authoring. Every
number below was counted, not quoted — the SQL and the file counts are in the working notes of
jobs #692 (DB), #693 (files) and #694 (labs).*

---

## The one-page answer

**There are eleven walks in the estate. The Script Lab can see six of them, and two of those six
are slates you sacked.**

Tom asked whether walks exist for trade and retail. **They do not, and the estate's own files say
so in their own words.** What exists for trade, retail, hospitality, care work and Irish public
services is a *mapping* — an analysis of which conversational shapes the sector needs — with
**zero lines of dialogue**. `services/shared/metagraph/proposed/retail-2026-08-30.json` records
its corpus as `"NONE. There is no retail corpus"` and mints nothing; `trades-2026-08-30.json` says
the same. The ratification pass of 2026-08-31 closes it: *"Sector proposals … were not ratified.
They stay proposed."*

**Health is the exception, and it is the find.** Aran's hand-authored corpus is real, on `main`,
and nowhere near a database.

**Two more walks are already live to learners and appear in no lab at all** — a 749-turn Spanish
music pod with 1,076 audio clips already rendered, and a 72-turn travel pod.

---

## Deliverable 1 — the census

### A. In `canonical_pod_scenarios` — the six the Script Lab lists

| slug | scenes | lines | target text | walk steps | audio | classification |
|---|---|---|---|---|---|---|
| **`pod-0`** — *the live POD 1* | 22 | 231 | none | 0 | yes, via 22 course instantiations | **authored dialogue**, shipped |
| `learning-flagship` | 11 | 367 | none | 72 in 11 walks | **none** | **authored dialogue**, registered nowhere |
| `method-pod-chapters` | 12 | 309 | **309 rows, `ita`** | 75 in 12 walks | **none** | **authored dialogue**, registered nowhere |
| `method-pod-43-scene` | 43 | 276 | **276 rows, `ita`** | 77 in 43 walks | **none** | **authored dialogue**, registered nowhere |
| `pod-1` | 16 | 236 | none | 0 | — | **SACKED SLATE — not a walk** |
| `pod-0.5` | 7 | 27 | none | 0 | — | **SACKED SLATE — not a walk** |

The off-by-one, stated once: **`pod_slug 'pod-0'` IS the live POD 1.** The slates named `pod-1`
and `pod-0.5` are the sacked ones (your ruling, 2026-08-29 — *"let's not EVER look at this stuff
again"*), and they are excluded here as sacked, not counted as walks.

Italian is the **only** target language anywhere in the canonical store: 585 rows, both Method
cuts, nothing else. The Learning flagship and POD 1 are English-only in this table.

**The two Method cuts are the sharpest finding in the table.** 585 authored, Italian-translated
rows — two complete unchosen realisations of the same substance, a 43-scene cut and a chapters
cut — and `select count(*) from listening_pods where slug in ('method-pod-chapters',
'method-pod-43-scene','learning-flagship')` returns **0**. Authored, translated, and reaching no
learner in any course.

### B. Live to learners, invisible to every lab

| walk | where | turns | scenes | text | audio | classification |
|---|---|---|---|---|---|---|
| **`spa_for_eng:music`** | `listening_pods` only | **749** | 8 | full spa + eng | **585 target + 491 known clips** | **authored dialogue**, visibility `live` |
| **`spa_for_eng:travel-situations`** | `listening_pods` only | 72 | 1 | full spa + eng | none | **authored dialogue**, visibility `live` |

Both are `pod_type: 'choice'`, ingested 2026-04-21 from `spanish-podcast-music.md` and
`spanish-pod-travel-situations.md`. Neither has ever existed in `canonical_pod_scenarios`, so no
lab, index or coverage read-out knows they are there. The music pod alone is over three times the
size of POD 1 and already has more than a thousand rendered clips.

### C. Authored dialogue that lives only as files

| walk | path | turns | text | classification |
|---|---|---|---|---|
| **Health sector — nurse + doctor** | `docs/sector-pods/source/health-sector-conversations-v3.md` | **438** (73 flows × 6, 23 contexts) | English; Welsh present as **six tokens total** | **authored dialogue**, in no table |
| `core-scene-0` | `services/shared/metagraph/walks/core-scene-0.json` | 24 steps, 4 walks | English | **authored dialogue**, in no table |
| `core-recoveries` | `services/shared/metagraph/walks/core-recoveries.json` | 28 steps, 5 walks | English | **authored dialogue**, in no table |
| `core-scene-0-notice` | `services/shared/metagraph/walks/core-scene-0-notice.json` | 8 steps, 1 walk | English | **authored dialogue**, in no table |

The three `core-*` files are **60 steps of genuinely new dialogue staged 2026-08-31** — the medium
contract, the street-notice realisation, five recovery attachments. Verified line by line: every
step carries speaker and surface text. `select … where table_name ilike '%core%'` returns zero
rows and no canonical slug contains "core". They exist as JSON in one repo and nowhere else.

The health corpus is 703 lines, and its 438 turns were counted, not taken on trust. Worth naming:
it is a corpus *about* a healthcare worker learning Welsh, written in English — the Welsh is six
interjections (`Chwarae teg` ×2, `Diolch` ×2, `bach` ×2). There is no target text for any pair.

*(A stale note in `docs/pods/script-lab-2026-08-30.md` says Aran's nurse and doctor sequences are
"not in this repo — searched and not found." That was true when written; v3 landed on `main`
afterwards at `28b6a4f96`. The doc is wrong now.)*

### D. Mapping only — the trade and retail answer

| sector | mapping document | dialogue lines | nodes minted | corpus |
|---|---|---|---|---|
| **retail** | `docs/sector-pods/retail-metagraph-mapping-2026-08-30.md`, 670 lines | **0** | **0** | **NONE, by its own record** |
| **trades** | `…/trades-metagraph-mapping-2026-08-30.md`, 647 lines | **0** | 1 | **NONE** |
| hospitality | `…/hospitality-metagraph-mapping-2026-08-30.md`, 696 lines | **0** | **0** | **NONE** |
| care work | `…/care-work-metagraph-mapping-2026-08-30.md`, 560 lines | **0** | 0 | **NONE** |
| Ireland public services | `…/ireland-public-services-metagraph-mapping-2026-08-30.md`, 572 lines | **0** | 2 | **NONE** |
| health | `…/health-metagraph-mapping-2026-08-30.md`, 571 lines | 0 | 10 | **the 438-turn corpus above** |

Five sectors mapped, zero authored lines — the standing debt, confirmed exactly as recorded. The
encounter inventories (E1–E16, E1–E18) are *derived by the mapping itself*, not observed. Every
one of these files states its own emptiness; none of them is pretending.

### E. Not walks — recorded so nobody re-counts them

`docs/pods/core-pod-seed-set-2026-08-31.md` (195 CP-seeds) and
`docs/sector-pods/health-general-seed-set-2026-08-31.md` (57 HG-seeds) are **seed sets, not
walks** — a different object, addressed below. `pod0-english-canonical.md`,
`pod-1-english-canonical.md`, `pod05-english-canonical.md` and the four
`welsh-recording-pack/*.md` files are re-serialisations of slates already in the table.
`docs/corpus/talk-bollocks/part-{1,2,4}.md` (1,299 lines, part 3 lost) is the raw transcript the
Method cuts were made from — source material, not a walk. `core-walks-ratification-2026-08-31.md`
authored no dialogue and says so.

### F. One thing the fleet is doing that no document records

Learner-facing pod slugs do not map to canonical slugs, and the naming is inverted:

- `listening_pods.slug = 'pod-1'` — **22 courses, exactly 231 rows each, 5,082 clips, 100% audio**.
  A clean 1:1 with canonical `pod-0`.
- `listening_pods.slug = 'pod-0'` — **46 courses, 2 to 232 rows, 40 of them stuck in the 100–230
  band**. The same slate, generated incompletely.

No course carries both. The sacked canonical `pod-1` has been generated to nobody, which is
correct. So the fleet is mid-cutover: 22 courses complete under the new name, 46 ragged under the
old one. That is a coverage gap to close, not a mystery.

---

## Deliverable 2 — why the Script Lab cannot see them

The page is `/canonical/scripts` (`src/views/ScriptLabView.vue`), reading `GET
/api/admin/canonical-pods` in `services/production-api.cjs:4744`.

**There is no filter and no bug.** The endpoint pages through the whole of
`canonical_pod_scenarios`, groups by `pod_slug`, and returns everything it finds — including both
sacked slates. The live API answers it (401, not 404), so the process is current and the view's
own "not restarted yet" fallback is not firing. The lab is showing, faithfully, all six things
that are in the table.

**The walks are absent because nothing ever put them in the table.**
`tools/pods/ingest-canonical-pods.cjs` carries a **hardcoded three-entry `PODS` map** — the
Learning flagship and the two Method cuts — and it is a deliberate one-way, one-time importer.
Nothing has ever been added to it. So the health corpus, the three `core-*` walks and the two live
Spanish choice pods have no route into the table the lab reads.

**The fix, in one sentence:** add one `PODS` entry per corpus and run the tool — health
(`docs/sector-pods/source/health-sector-conversations-v3.md`, 438 turns) and the three `core-*`
JSON walks; the two Spanish choice pods need a different door because they are already
per-course rows in `listening_pods`, so they want lifting to canonical rather than ingesting.
Trade and retail need no fix — there is nothing to ingest.

**And a second, separate cause, which is the one you actually hit.** The lab does not distinguish
live from sacked. `canonical_script_versions` holds exactly six rows in the whole database: all
`pod-0.5`, all saved by you on 2026-08-31 between **10:54:25 and 10:55:28** — four rewrites of one
line and then a revert to the original. You reached the lab, edited the first script it offered,
found it was a slate you had personally sacked two days earlier, and put it back inside 63
seconds. The index prints a grey note reading *"a separate slate — outside the graph's reference
space"*; that is not the word SACKED.

---

## Deliverable 3 — the front door and the admin IA

### Why there is no front door

`/canonical/scripts` **is** in the navbar — `src/components/AppNavbar.vue:361` — but inside
`if (isCoursesBoard || isCanonical)`, where `isCanonical` is `route.path.startsWith('/canonical/')`
and `isCoursesBoard` is `route.path === '/courses'`. **The link only renders once you are already
there.** From `/home`, `/admin` or `/admin/configs` there is no route in. The only other doors are
a button on `/canonical/metagraph` (same trap) and a `router-link` at **line 2361** of
`PodLab.vue`. That is the whole of the front door: a link visible only to people who have already
arrived.

### The shape the room settled on — grouped by blast radius, not by feel

Recorded, not built.

**1. `admin/labs` — affects nobody.** Timings, voices, messing about. Ephemeral. Needs an index.
A lab is not a kind of config, so nesting labs under `admin/configs` is the wrong tree.

**2. Live settings — affects every learner immediately.** Speaking gap lengths as ratios of model
response length, boot-up times; listening frequencies, the pod ladder. Reversible but live, and
should be **visibly labelled as live**.

**3. Canonical content editing — affects every learner in every course, and cascades.** Canonical
seeds, canonical pod content. Canonical means IDENTICAL, so an edit propagates to all courses by
definition. This is authorship, not a knob: it wants a diff, a record of what changed, and the
standing text-approval path for target language — **Aran signs off Welsh, never a worker**.

**4. Course-level — affects one course**, reachable only from that course's Overview page.
Unchanged.

### The distinction that must be visible on every editing surface

**The canonical seed and a course's known text are different objects.**

- `canonical_seeds` — **668 rows**. `/canonical/seeds` PATCHes `canonical_seeds.source_text`. One
  row, identical by definition. Note the mechanism: the endpoint comment states that editing the
  canonical **does not auto-propagate** — re-translation is a separate pipeline step. Canonical means
  identical, so the change is owed to every course; it simply is not automatic.
- `course_seeds.known_text` — for seed 1 alone: **130 course rows carrying 116 distinct known
  texts**. Derived, and legitimately differentiated per pair. The known side is a teaching
  instrument, not a copy of the seed.

The same split runs through the pods, and the pod layer shows it most vividly: the single
canonical line *"Good morning, Sarah!"* appears as **24 distinct `known_text` values** across the
46 courses carrying it — `¡Buenos días, Sarah!`, `おはようございます、サラ！`,
`صباح الخير يا Sarah!`, and twenty-one others. One canonical line; twenty-four correct known
renderings.

`/canonical/scripts/:slug` edits `canonical_pod_scenarios.english_text` — **canonical, cascading**.
Its own page already says so in one line of small text.

**A naming hazard worth fixing on sight:** the canonical column is called `source_text`, and
"source" is the one word the house vocabulary bans in favour of known / target / seed. The column
name is actively feeding the confusion it is at the centre of.

### Every lab, with the column that matters

Seven labs. Six are titled "… Lab" on the Configs index itself; the seventh is the Script Lab.
The write/ephemeral column is traced through each lab into `services/` — not guessed.

| lab | URL | writes or ephemeral | what it touches | blast radius | linked from `admin/configs`? |
|---|---|---|---|---|---|
| **Listening Lab** | `/admin/configs/listening` | **WRITES** — `PATCH /api/algorithm-config` via `algorithmConfigShared.js:104` | `algorithm_config`, key `listening` | **live settings — every learner, every course, ~5-min cache TTL, no draft/env split** | yes |
| **Speaking Lab** | `/admin/configs/speaking` | **WRITES** — same endpoint, key `speaking` | `algorithm_config` | **live settings — every learner, every course, immediately** | yes |
| **Pod Lab** | `/admin/configs/pods` | **WRITES, but never config** — `PATCH /api/pod-fine-map`, `POST /api/pod-cast-voices`, `POST /api/pod-voice-approval` | `atom_map_fine` (a draft column), `listening_pods.speakers`, voice approvals | **one course**, and none of the three is immediate — casting sits until a re-render is approved | yes |
| **Voice Lab** | `/admin/configs/voice` | **WRITES, and spends money** — ~15 routes in `services/voicelab/router.cjs`, incl. `cartesia/clone`, `clone-from-estate`, slot cast `PUT`/`DELETE` | creates real clones at an external provider; `voice_language_roles` | **irreversible + billable**; slot casts reach every course in that language **on the next render**, never existing audio | yes |
| **VAD Lab** | `/admin/configs/vad` | **WRITES** — `POST /api/vad-recordings` | S3 `ssi-audio-stage/vad-lab/recordings/` | **nobody** — a private research corpus with no learner path | yes |
| **Basket Lab** | `/admin/configs/basket` | **ephemeral** — mounted `{ readOnly: true }` at `production-api.cjs:176`; generation 403s on this mount, verdicts go to a local `verdicts.ndjson` | nothing in the DB | nobody | yes |
| **Script Lab** | `/canonical/scripts`, `/canonical/scripts/:slug` | **WRITES** — `POST /api/canonical-script` | `canonical_pod_scenarios.english_text` (+ speaker, notes), versioned in `canonical_script_versions` | **canonical content — the master every course flexes from** | **no** |

Two more surfaces on the same tree, neither a lab:

- **Metagraph**, `/canonical/metagraph` — read-only, zero write methods, GET only. Also **not**
  linked from Configs.
- **Capture A/B**, `/admin/capture-ab` — ephemeral by its own copy (*"Nothing on this page is
  uploaded or saved. Reload and it is gone"*), and a **true orphan**: zero `router-link`, `to=` or
  `href` references to it anywhere in `src/`.

**Three labs deliberately refuse to write `algorithm_config`, and each says why in the same words.**
Pod Lab's header comment: *"`algorithm_config` writes are immediately global to every learner
(~5-min cache TTL, no draft/env split), so this Lab never writes config — it reads the LIVE config
as a starting point … and exports the tuned JSON for a human to apply deliberately."* The same
sentence appears in `VoiceLab.vue:31-33` and `ExperimentsPanel.vue:12`. The estate already knows
which surfaces are live and has been routing around them by hand, in comments, because the IA does
not carry the distinction.

### What exists today against that shape, and the gap

`ConfigsIndex.vue` offers exactly six tiles — Listening Lab, Speaking Lab, Pod Lab, Voice Lab, VAD
Lab, Basket Lab — under the subtitle *"Global algorithm config — applies across every course and
every learner."* It offers **no route to the Script Lab, the Metagraph or Capture A/B.**

The Script Lab is not merely unlinked from Configs; it is on a **different branch of the nav tree**.
Its sub-tab row — Library / Seeds / Content / Pods / Script Lab / Metagraph — renders only when
`route.path === '/courses'` or `route.path.startsWith('/canonical/')`. Someone standing in Admin
never sees that it exists.

The gap, stated as four lines:

1. **There is no `admin/labs`.** Seven labs, no index. Three surfaces have no link from the configs
   hub, and Capture A/B has no link anywhere in the codebase.
2. **Labs are nested under configs, which is the wrong tree** — and the Configs subtitle actively
   misdescribes what is under it. Basket Lab is mounted read-only and cannot write anything; it sits
   beneath a heading claiming everything there applies to every course and every learner.
3. **Nothing is labelled by blast radius.** Listening and Speaking Lab genuinely are immediately
   global — and are, to their credit, labelled so on their own pages. Voice Lab's slot casting
   reaches every course in a language on the next render and carries **no such banner**, only a code
   comment.
4. **The one cascading-canonical surface is the least findable page in the estate**, and it does not
   say which of its six scripts are sacked — which is how an edit landed on `pod-0.5` yesterday
   morning.

---

## What I read, and what I did not

**Read:** `canonical_pod_scenarios`, `canonical_pod_walk_steps`, `canonical_script_versions`,
`listening_pods`, `listening_pod_sentences`, `course_sectors`, `pod_legos`, `canonical_seeds`,
`course_seeds`, and a schema-wide search for any other dialogue-bearing table (none found).
`services/production-api.cjs` (canonical-pods and canonical-seeds endpoints),
`tools/pods/ingest-canonical-pods.cjs`, `src/router/index.js`, `src/components/AppNavbar.vue`,
`src/views/ScriptLabView.vue`, `ScriptLabScriptView.vue`, `MetagraphView.vue`, all six lab views
plus `ConfigsIndex.vue`, `Admin.vue`, `src/views/admin/algorithmConfigShared.js`,
`src/views/admin/voicelab/`, `services/voicelab/router.cjs`, `labs/basket-lab/server.cjs`,
`api/canonical-script.js`, `api/pod-fine-map.js`, `api/pod-cast-voices.js`, `api/vad-recordings.js`,
`services/shared/metagraph/` including all four `walks/` and all twelve `proposed/` files,
`docs/sector-pods/` in full, and the `docs/pods/` and `docs/corpus/talk-bollocks/` corpus files.

**Did not read, and it does not change the census:** the archived `archive/docs-retired-2026-08-24/`
tree beyond a grep; the learning-app's player code (delivery, not content); the audio object store
itself — clip counts here come from `listening_pod_sentences` audio-id columns, not from S3.

**Corrected after publication:** my first pass listed Metagraph among the seven labs and credited
Pod Lab with writing `algorithm_config`. Both were wrong — the six Configs tiles are each titled
"… Lab", and Pod Lab only *reads* config, at `PodLab.vue:197`, with an explicit safety comment
saying why. The table above is the corrected one.

**Not verified:** whether the two Spanish choice pods play correctly for a learner today. They are
marked `visibility: 'live'` with audio attached; I did not open the app.
