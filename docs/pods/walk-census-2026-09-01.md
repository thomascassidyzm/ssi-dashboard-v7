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
  row, identical by definition, **cascades to every course**.
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

Seven labs. The write/ephemeral split is traced through each lab's endpoints into
`services/` — not guessed.

| lab | URL | writes or ephemeral | what it touches | blast radius | linked from `admin/configs`? |
|---|---|---|---|---|---|
| **Script Lab** | `/canonical/scripts`, `/canonical/scripts/:slug` | **WRITES** — `POST /api/canonical-script` | `canonical_pod_scenarios.english_text` + a version row in `canonical_script_versions` | **canonical content — every learner in every course, cascades** | **no** |
| **Metagraph** | `/canonical/metagraph` | ephemeral — GET only, zero write methods | reads `canonical_pod_scenarios` | nobody | **no** |
| **Pod Lab** | `/admin/configs/pods` | **WRITES** — `POST /api/algorithm-config`, `POST /api/pod-voice-approval`, `PATCH /api/pod-fine-map` | live algorithm config, voice approvals, fine maps | **live settings — every learner immediately**, plus per-course casting | yes |
| **Voice Lab** | `/admin/configs/voice` | **WRITES, and spends money** — `/api/voicelab/voices/cartesia/clone`, `/clone-from-estate`, `POST /api/voices/declare` | creates real voice clones at an external provider; declares voices of record | **irreversible + billable**, then every learner of that language | yes |
| **VAD Lab** | `/admin/configs/vad` | **WRITES** — `/api/vad-recordings` | its own calibration corpus | nobody but itself | yes |
| **Basket Lab** | `/admin/configs/basket` | **ephemeral** — mounted `{ readOnly: true }` at `production-api.cjs:176` | reads courses, computes in the browser | nobody | yes |
| **Capture A/B** | `/admin/capture-ab` | **ephemeral** — makes no `/api/` calls at all | records and measures locally on the phone | nobody | **no** |

Also present and not a lab, but on the same tree: `/admin/configs/listening` and
`/admin/configs/speaking` — both **live settings**, both linked.

### What exists today against that shape, and the gap

`ConfigsIndex.vue` offers exactly six tiles: **basket, listening, pods, speaking, vad, voice**. It
offers **no route to the Script Lab, the Metagraph or Capture A/B.** So of the seven labs, four are
reachable from the configs hub and three are reachable only by typing the URL — and the one Tom
went looking for is in the unreachable three.

The gap, stated as four lines:

1. **There is no `admin/labs`.** Labs are scattered across `/admin/configs/*`, `/canonical/*` and
   `/admin/capture-ab`, with no index anywhere. Three of the seven have no link at all.
2. **Labs are nested under configs, which is the wrong tree.** Basket Lab and VAD Lab sit beside
   Listening Config and Speaking Config as if they were the same kind of thing. One is a place to
   mess about; the other changes what every learner hears on their next session.
3. **Nothing is labelled by blast radius.** The two labs that write live — Pod Lab into
   `algorithm_config`, Voice Lab into a billable external clone endpoint — carry no marking that
   distinguishes them from Basket Lab, which is mounted read-only and cannot write at all.
4. **The one cascading-canonical surface is the least findable page in the estate.** The Script
   Lab writes the master text every course flexes from, and it is reachable only from inside
   `/canonical/*`, from a button on a page with the same problem, or from line 2361 of another
   lab. It also does not say which of its six scripts are sacked — which is how an edit landed on
   `pod-0.5` yesterday morning.

---

## What I read, and what I did not

**Read:** `canonical_pod_scenarios`, `canonical_pod_walk_steps`, `canonical_script_versions`,
`listening_pods`, `listening_pod_sentences`, `course_sectors`, `pod_legos`, `canonical_seeds`,
`course_seeds`, and a schema-wide search for any other dialogue-bearing table (none found).
`services/production-api.cjs` (canonical-pods and canonical-seeds endpoints),
`tools/pods/ingest-canonical-pods.cjs`, `src/router/index.js`, `src/components/AppNavbar.vue`,
`src/views/ScriptLabView.vue`, `ScriptLabScriptView.vue`, `MetagraphView.vue`, all five
`src/views/admin/*Lab.vue` plus `ConfigsIndex.vue` and `src/views/admin/voicelab/`,
`services/shared/metagraph/` including all four `walks/` and all twelve `proposed/` files,
`docs/sector-pods/` in full, and the `docs/pods/` and `docs/corpus/talk-bollocks/` corpus files.

**Did not read, and it does not change the census:** the archived `archive/docs-retired-2026-08-24/`
tree beyond a grep; the learning-app's player code (delivery, not content); the audio object store
itself — clip counts here come from `listening_pod_sentences` audio-id columns, not from S3.

**Not verified:** whether the two Spanish choice pods play correctly for a learner today. They are
marked `visibility: 'live'` with audio attached; I did not open the app.
