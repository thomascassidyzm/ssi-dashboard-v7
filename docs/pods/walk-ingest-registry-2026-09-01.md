# The walk registry drives the ingest, and the four themed walks parse

**Branch `feat/walk-ingest-discovery`, commit `a2713e6fd`. Dry run only — no database write of any kind. Not merged, not deployed.**

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
| retail | 25 / 53 / 318 | **25 / 55 / 330** | scenes exact; **the published flow and turn figures are wrong** |
| hospitality | none | 21 / 55 / 330 | **unverified against a second source** |

The three pod-table walks hold their previous numbers exactly — 367 / 309 / 276 lines — so nothing regressed under the rewrite.

### Retail: the published figure is the one that is wrong

`docs/sector-pods/retail-walk-report-2026-09-01.md` line 4 says *"25 scenes, 53 six-turn flows, 318 turns"*. Three independent pieces of evidence say 55 and 330:

1. **The same report's own §5 speaker table sums to 330**, not 318: worker 158 + customer 122 + regular 12 + colleague 12 + manager 6 + new starter 6 + specialist 2 = 330. A raw `grep -c` of the corpus's speaker bullets gives exactly those seven numbers.
2. **Every flow in the corpus is exactly six turns** — the parse's turns-per-flow histogram is `{ '6': 55 }`, with no exceptions. 55 × 6 = 330. 53 × 6 = 318, so the headline is self-consistent only with a flow count of 53.
3. **A raw `grep -c '^### '` finds 55 flow headings**, all of them inside scenes, and the report's own prose names four flows in R0 and three in R19 — both of which the parse reproduces.

The headline was almost certainly written before two flows were added and never re-derived. The scene count of 25 is right in both. I have not edited the report: it is another worker's branch.

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

## Failure paths, exercised

Removing the trades corpus and rerunning `--pod=all`: trades reported `MISSING CORPUS` with the branch to fetch it from, hospitality still ran after it, the summary table showed the failure, and the tool exited 1. An unknown `--pod` prints the whole registry with each entry's ingestable state and reason.

## Notes

- The three corpora were copied onto this branch with `git checkout origin/<branch> -- <path>` from `feat/retail-walk`, `feat/trades-walk-canonical` and `feat/hospitality-walk`. **Those branches are not merged here** — only the files were copied.
- The tool's JSON log moved out of the tracked tree to `~/ssi-evidence/ssi-dashboard-v7/docs/pods/pod-ingest-log.json`. Its old path under `docs/` is gitignored, so the log was being written where nothing could find it.
- A peer session flagged the `pod-0` → `pod-1` canonical rename. Nothing in this work hardcodes `pod-0`; the registry already carries `pod-1`, with `corpus: null`, so the tool skips it and the DB stays canon for it.
- Tests: `node tools/pods/parse-sector-walk.test.cjs` and `node tools/pods/parse-pod-markdown.test.cjs`, both green. The repo-wide vitest suite was not run — it tests code this job never touches.

## The execute pass, when the gate on job #732 is clean

`node tools/pods/ingest-canonical-pods.cjs --pod=health --execute`, and the same for retail, trades and hospitality. Expect 1,512 scenario rows and 119 walk steps across the four. The tool refuses if rows already exist under a slug.
