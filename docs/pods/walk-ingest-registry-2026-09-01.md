# The walk registry drives the ingest, and the four themed walks parse

**Branch `feat/walk-ingest-discovery`. Dry run only — no database write of any kind, and `--execute` was never passed to any command. Not merged, not deployed.**

Migration #732 has since completed. The canonical table now holds `learning-flagship` 367, `method-pod-43-scene` 276, `method-pod-chapters` 309 and `pod-1` 231, with no `pod-0` and no `pod-0.5`. Nothing in this work reads or writes any of those rows.

---

## What changed

`tools/pods/ingest-canonical-pods.cjs` no longer carries a hardcoded three-entry map. It reads `tools/pods/pod-corpora.json` — the registry — and resolves what to ingest from data. `--pod=all` selects every entry with `status: "authored"` and a corpus; anything else is skipped with its reason printed, on one line, by name. A missing corpus **file** is a loud named error for that entry alone and never stops the rest of the run. Every safety property survives: dry run by default, `--execute` to write, refusal on existing rows without `--reimport-destructive`, the read-back count, and the JSON log.

`tools/pods/parse-sector-walk.cjs` is new — a second import-format parser beside `parse-pod-markdown.cjs`, which is untouched and whose own tests still pass unchanged.

## The counts, against independently published figures

```
WHAT THE REGISTRY RESOLVED TO
  walk                  format          scenes  flows  lines  steps  status
  learning-flagship     pod-table           11     11    367     72  dry run
  method-pod-chapters   pod-table           12     12    309     75  dry run
  method-pod-43-scene   pod-table           43     43    276     77  dry run
  health                sector-flows        23     73    438      0  dry run
  retail                sector-flows        25     55    330     35  dry run
  trades                sector-flows        23     69    414     84  dry run
  hospitality           sector-flows        21     55    330      0  dry run
```

| walk | published | measured | verdict |
|---|---|---|---|
| health | 23 / 73 / 438 | **23 / 73 / 438** | exact |
| trades | 23 / 69 / 414 | **23 / 69 / 414** | exact |
| retail | 25 / 53 / 318 | **25 / 55 / 330** | scenes exact; the two-flow difference is reconciled below, not an error |
| hospitality | none | 21 / 55 / 330 | **unverified against a second source** |

The three pod-table walks hold their previous numbers exactly — 367 / 309 / 276 lines — so nothing regressed under the rewrite.

### Retail: a reconciled difference, not an error

The parse gives 25 scenes / 55 flows / 330 turns. `docs/sector-pods/retail-walk-report-2026-09-01.md` says *"25 scenes, 53 six-turn flows, 318 turns"*. The gap is exactly two flows and twelve turns, and it is explained rather than wrong.

Scene R0, "The contract at the counter", holds four flows of six turns each. The corpus's own header says R0 is **"inherited, not re-authored"** — a re-instantiation of CORE scene 0 whose turns "are resolved against those walks in the companion report — defers named as defers". 55 − 2 = 53 and 330 − 12 = 318: the published count excludes two of R0's four flows as pure defers to CORE scene 0. It is an editorial claim about provenance, and a correct one.

**For ingest the document is canon** (Tom's ruling). All 25 scenes, 55 flows and 330 turns are ingested. A row is dialogue that exists; a report's flow count is a claim about where that dialogue came from, and the two answer different questions. Nothing was trimmed to match the report, and the report was not edited — it is another worker's branch.

The parse is corroborated three ways: the same report's §5 speaker table sums to 330, not 318 — worker 158 + customer 122 + regular 12 + colleague 12 + manager 6 + new starter 6 + specialist 2 — and a raw `grep -c` of the corpus's speaker bullets returns exactly those seven numbers; every flow is uniformly six turns, histogram `{ '6': 55 }` with no exceptions; and `grep -c '^### '` finds 55 flow headings, all inside scenes.

### Two independent counts agree, on all four walks

A second count was run deliberately without reading this parser, applying only the defining rule. It matches line for line: health 23 / 73 / 438, retail 25 / 55 / 330, trades 23 / 69 / 414, hospitality 21 / 55 / 330. There is no disagreement to resolve.

The retail scene-by-scene breakdown, offered as the evidence behind that agreement — every flow six turns, no exceptions:

| scene | flows | | scene | flows | | scene | flows |
|---|---|---|---|---|---|---|---|
| R0 | **4** | | R9 | 2 | | R17 | **3** |
| R1 | 2 | | R10 | 2 | | R18 | **1** |
| R2 | 2 | | R11 | 2 | | R19 | **3** |
| R3 | 2 | | R12 | 2 | | R20 | 2 |
| R4 | 2 | | R13 | 2 | | R21 | **3** |
| R5 | 2 | | R14 | 2 | | R22 | 2 |
| R6 | **3** | | R15 | 2 | | R23 | 2 |
| R7 | 2 | | R16 | 2 | | R24 | 2 |
| R8 | 2 | | | | | **total** | **55 × 6 = 330** |

## The defining rule, and what it excluded

A `##` section is a scene only if it holds a `###` flow that holds a dialogue turn. Nothing is special-cased by title.

| walk | `##` seen | rejected | what was rejected |
|---|---|---|---|
| health | 24 | 1 | the doc subtitle |
| retail | 26 | 1 | the doc subtitle |
| trades | 30 | 7 | the doc subtitle plus six accounting sections |
| hospitality | 22 | 1 | the doc subtitle |

## The mapping onto the schema

A flow is a `variant_key`. `scene_number` is the scene's 1-based index in document order; `sentence_number` is the turn's index **within its flow**; `global_order` is 1-based across the whole document. `scene_label` is the authored label as written — `R0.`, `Scene 1`, `1.0` — `scene_title` the heading title, `scene_subtitle` the italic `*(...)*` tag or null. `target_text` and `target_lang` stay null: these corpora are the canonical English known side and are pair-invariant.

Row ids are `<slug>:SC01-F01-S01` — the existing `:SC01-S01` shape extended to carry the variant. Scene and flow indices are positional, not read off the heading, so `R0.` and `1.0` and `Scene 1` are all the first scene of their document and the id is stable across runs. Verified per walk: ids unique, `(scene, sentence, variant)` unique, `global_order` a gapless 1..N.

Variant keys derive from the flow heading: `Flow 1` → `flow-01`, and health's two arms → `welsh-flow-01` / `english-flow-02`. Zero collisions across all four corpora.

`author_notes` carries the `# Part N` group name, the flow's tag and the safety flag as one readable string — for example `Part 1: The nurse sequence · flow: safety-critical ⚠ - refusing tablets · ⚠ safety-critical line`. No new columns, no DDL.

**The ⚠ marker.** Health, trades and hospitality put it outside the quotes, where it is unambiguously a marker: it is stripped into the boolean and out of the text. Retail puts it inside them, mid-sentence in one case, where it is authored text: the line is still flagged, and the text is left exactly as authored. Flagged-turn counts match a raw grep of every corpus — health 14, hospitality 15, retail 8, trades 20.

**One line keeps its quotes on purpose.** Health has `- **P:** *(breathes)* "Like this?"`. The rule is to strip only *wrapping* quotes; this line is not wrapped in them, so its inner quotes stay. That is one row across 1,512.

## The walk steps, honestly

Steps are emitted only where a scene genuinely declares shapes, read for the store's own N/P/O/F registers alone — so the mapping's encounter ids (`E3`), survivability ids (`S703`), pressure ids (`K4`) and the core walk files (`W1201`) are left alone rather than manufactured into declarations. Every id goes through the existing `resolveShape`; unresolved stays unresolved and no alias was invented.

| walk | declaration source | steps | resolved | unresolved | scenes declaring nothing |
|---|---|---|---|---|---|
| trades | `*Walks:*` / `*Admits:*` lines | 84 | 44 | 40 | **0 of 23** |
| retail | the scene heading's italic tag | 35 | 12 | 23 | **3 of 25** |
| health | — | 0 | 0 | 0 | **23 of 23** |
| hospitality | — | 0 | 0 | 0 | **21 of 21** |

Health and hospitality declare no shapes anywhere, so they get no walk steps. That is a reported number, not a gap papered over. `*Branch set:*` names branches rather than shapes and is deliberately not read.

## The ninth walk is a data change — proven, not asserted

I added a ninth entry to `walks[]` and a two-turn corpus file, ran the tool, and removed both. `git status` on `tools/pods/` showed no code file touched by the addition:

```
── ninth-walk-proof — The ninth walk [sector-flows]
   2 lines across 1 scenes and 1 flows; 2 walk steps
   resolution: {"id":2}
   resolved store shapes: N1, O7
   the defining rule rejected 1 of 2 '##' sections as not-a-scene
```

**One JSON entry, one corpus file, zero code.** The registry now says so in an `addingAWalk` field at its top. The one thing that still needs code is a new *format* — a parser plus its entry in `PARSERS` — and that is correct: a format is code.

## Skipped and refused are different sentences

`pod-1`, `learning-flagship`, `method-pod-chapters` and `method-pod-43-scene` all have live rows now, and the two states they can be in are not the same fact:

- **Skipped** — the entry has no markdown to ingest, so the tool has nothing to do and never asks the database anything. `pod-1` is the case that matters: an authored walk whose canon lives in the DB rather than in a corpus file. Its 231 live rows are the point, not an obstacle, and this run neither read nor touched them.
- **Refused** — the entry has a corpus, it parsed, the write was ready, and live rows were found in the way. That is a collision with somebody's Script Lab edits and needs `--reimport-destructive`.

A run that said "skipped" when it meant "refused" would report a walk as having no content when the truth is the tool declined to overwrite its content. They now print different sentences and occupy different rows in the summary table, which lists every registry entry rather than only the ingestable ones:

```
WHAT THE REGISTRY RESOLVED TO
  'skipped' = no markdown to ingest, the DB was never asked. 'refused' = parsed and ready,
  live rows in the way. They are different facts and they are never the same row.
  walk                  format          scenes  flows  lines  steps  status
  pod-1                 —                    —      —      —      —  skipped: no corpus, the DB is canon
  care-work             sector-flows         —      —      —      —  skipped: mapping-only, no walk yet
  public-services       sector-flows         —      —      —      —  skipped: mapping-only, no walk yet
  learning-flagship     pod-table           11     11    367     72  dry run
  method-pod-chapters   pod-table           12     12    309     75  dry run
  method-pod-43-scene   pod-table           43     43    276     77  dry run
  health                sector-flows        23     73    438      0  dry run
  retail                sector-flows        25     55    330     35  dry run
  trades                sector-flows        23     69    414     84  dry run
  hospitality           sector-flows        21     55    330      0  dry run
```

**One honest gap:** the refusal branch only runs under `--execute`, which this job did not pass, so its new wording has been verified by reading and by a syntax check, not by seeing it print. The execute pass will be the first time that sentence appears — and on the three pod-table walks it will appear, because they all have live rows.

## One rule, two readers

The Script Lab has adopted the ingestable predicate verbatim — `isIngestable()` in `src/lib/walkGroups.js` on `feat/script-lab-page` is `status === 'authored' && corpus && format`, and badges health, retail, trades and hospitality as ingestable-but-not-yet-in-the-store, with care-work and public-services correctly excluded.

That is the right rule in two places, which is one place too many: if they ever drift, the lab shows a walk as ready that the tool will not touch, or hides one it would. The rule now lives in the registry itself as `ingestableRule`, and both readers' comments name it as their source. Change the field and both readers together, never one. It is a string beside `addingAWalk`; no field in `walks[]` or `parked[]` moved.

## The slug rename has an inverted guard nobody owns

Flagged while checking my own code for slug couplings. `GRAPH_REF_SLUG` in `src/lib/metagraph/walk.js` still reads `'pod-0'`, which made the core pod report 0 of 36 shapes traversed; that one is fixed on `feat/script-lab-page` (48d33e5b5). **The one still live is sharper than a stale reference.** `src/views/MetagraphView.vue:267`:

```js
const HIDDEN = new Set(['pod-1', 'pod-0.5'])
```

That set was written to hide two sacked slates whose row numbers collided with the graph's by accident. After the 2026-09-01 rename, `pod-1` **is** the live CORE pod — the 231-row slate formerly called `pod-0`. So the guard now hides the very pod it was written to protect, while `ORDER`, `LABELS` and `ORIGINS` in the same file all key on `'pod-0'`, which no longer exists. The CORE pod is currently both hidden and unlabelled on that view.

I have not touched it: it is not my file, another session is working in that area, and it is a view change outside a dry-run parser job. Naming it because a rename that inverts a guard is exactly the kind of thing that reads as "working" until someone opens the page.

## Failure paths, exercised

Removing the trades corpus and rerunning `--pod=all`: trades reported `MISSING CORPUS` with the branch to fetch it from, hospitality still ran after it, the summary table showed the failure, and the tool exited 1. An unknown `--pod` prints the whole registry with each entry's ingestable state and reason.

## Notes

- The three corpora were copied onto this branch with `git checkout origin/<branch> -- <path>` from `feat/retail-walk`, `feat/trades-walk-canonical` and `feat/hospitality-walk`. **Those branches are not merged here** — only the files were copied.
- The tool's JSON log moved out of the tracked tree to `~/ssi-evidence/ssi-dashboard-v7/docs/pods/pod-ingest-log.json`. Its old path under `docs/` is gitignored, so the log was being written where nothing could find it.
- A peer session flagged the `pod-0` → `pod-1` canonical rename. Nothing in this work hardcodes `pod-0`; the registry already carries `pod-1`, with `corpus: null`, so the tool skips it and the DB stays canon for it.
- Tests: `node tools/pods/parse-sector-walk.test.cjs` and `node tools/pods/parse-pod-markdown.test.cjs`, both green. The repo-wide vitest suite was not run — it tests code this job never touches.

## The execute pass, when the gate on job #732 is clean

`node tools/pods/ingest-canonical-pods.cjs --pod=health --execute`, and the same for retail, trades and hospitality. Expect 1,512 scenario rows and 119 walk steps across the four — health 438/0, retail 330/35, trades 414/84, hospitality 330/0. All four slugs are new, so none should refuse; `--pod=all --execute` would additionally refuse the three pod-table walks against their live rows and skip `pod-1` without asking the database anything.
