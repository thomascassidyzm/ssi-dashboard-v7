# Script Lab — every walk in the estate, in one place

**Branch `feat/script-lab-page`, pushed. Not merged. Deployed nowhere.**

Tom, 2026-09-01: *"can we wrap all this up into the scripts lab page? including the changes we've made to the other pods, so I can see them all in one place?"*

It does now. `/canonical/scripts` lists all twelve — the core pod, the flagship, the two Method cuts, six themed walks and the two parked ones — with the labels needed to tell them apart.

## What the page carries

**CORE vs THEMED.** `pod-1` sits alone under "Core — the default chain": compulsory, the ladder a learner descends by not choosing. Themed walks sit under "chosen", each showing *why* a learner picks it — an interest in health and care, in the trades, in hospitality. The selector is interest, never occupation. The string "sector pods" appears nowhere on the page, and a test asserts it.

**Target text.** Italian, on the two Method cuts, 276 and 309 lines. Everything else reads "no target text", because that is the truth of the canonical store.

**Audio.** Said once, plainly, at the top: the canonical store holds no audio at all, for any walk on the page. Audio exists against generated pods, downstream. No invented column.

**Status,** from the registry: authored, mapping-only, parked. Care-work and public-services show MAPPING-ONLY — a mapping is not a walk, and the page says so in their own words.

**The Welsh health overlay** wears WELSH OVERLAY — DRAFT FOR ARAN on the health card. A worker never signs off target-language text.

**The two Method cuts** render inside one dashed frame under one sentence: *"One decision, two realisations of the same material. Tom's choice is outstanding — picking one sacks the other."* Two cards, visibly one choice.

**The parked pair** is visible with its provenance and its ruling quoted, out of the canonical store, not canon.

**The object statement** is now a bordered box you cannot skim past, with the numbers in it: the canonical English master and a course's known text are different objects; seed 1 has 116 distinct known texts across 130 courses; "Good morning, Sarah!" appears as 24 distinct known texts across 46 courses; saving here propagates to none of them, so the change is **owed** to every course rather than applied to it.

**Blast radius:** the page wears #714's banner at LIVE AT NEXT GENERATION, naming `POST /api/canonical-script`. I checked every control on the page and found none that reaches a learner directly, so the tier stands as ruled. The reasoning and the writes it was checked against are recorded in `blastRadius.js` beside the entry, where the next person will find them.

## How it survives a rename

Nothing on the page keys on a slug. The registry `tools/pods/pod-corpora.json` is imported and joined to whatever the store returns; any DB slug the registry does not name is shown as UNREGISTERED with its real counts rather than hidden. The join is done **in the page**, not server-side — the existing endpoint needed no change.

That mattered within the hour. Job #732's migration landed while I was building: the store now holds four slugs, `pod-1` at 231 rows and 22 scenes, and the two sacked slates are gone. The page needed no edit. Twelve unit tests assert it against the store as it stood on **both sides** of that rename.

## The bug the rebuild found

Driving the page showed the core pod reading **0/36 shapes traversed, 231 lines unmapped** — zero coverage for the one walk the whole graph is derived from.

`GRAPH_REF_SLUG` in `src/lib/metagraph/walk.js` is a database slug, and the rename left it at `'pod-0'`. The core slate fell into the "walks in its own reference space" branch, where by design every line comes back unmapped. The behaviour was right; the slug was stale. Fixed, and verified in the browser against the live store: **18/36 traversed**.

Two nearby strings deliberately not renamed with it, and the comment now says why: the bundled walk file `walks/pod-0.json`, and the `origin: 'pod-0'` provenance labels in `fromStore.js`. Provenance does not get rewritten by a rename.

`MetagraphView.vue` has five more couplings on the old slug and belongs to the migration session, so I left it alone and told them.

## Verified how

A real browser, against a real `production-api` on port 3470 and the live canonical store. `e2e/script-lab/` logs in as the seeded admin, loads the page, asserts every label above, and photographs it at desktop and phone width. Two specs, both green. Every request it makes is a GET; it spends nothing.

Screenshots: `~/ssi-evidence/ssi-dashboard-v7/script-lab-shots/` — `desktop.png`, `phone.png`, `labs-index.png`.

Also green: 13 unit tests on the join, 11 on #714's labs index, and a full `vite build`. I did not run the repo-wide suite.

One hazard worth recording for the next worker on this box: Playwright's Chromium could not start, missing `libnspr4.so`, and there is no sudo here. Other sessions had already extracted the NSS libs into scratch; copying that set and putting it on `LD_LIBRARY_PATH` got a browser up. Without that trick this would have been a reported gap rather than a screenshot.

## What #714's work looks like here

`src/components/admin/blastRadius.js`, `BlastRadiusBanner.vue`, `LabsIndex.vue` and its test, the router move to `/admin/labs` with its legacy redirects, and the lab pages that wear the banner were **copied file-by-file** with `git checkout origin/feat/admin-labs-blast-radius -- <paths>`. That branch is **not merged** here and its docs deletions were not taken. I took the whole coherent set rather than half of it, so the index and the banner agree, and the Script Lab now has a front door: `/admin/labs` → Open Script Lab.

## Two things I decided rather than asked

**The registry has no counts for the parked pair.** `music` is 749 turns across 8 scenes, `travel-situations` 72 turns in 1 scene, and both live only in `listening_pods`, which the Script Lab cannot read. I did **not** add a field to the shared contract — it is not mine to edit. The parked cards show provenance without size, and job #48 has been told.

**I adopted #48's ingestability rule verbatim** — `status === 'authored' && corpus && format`. Each card shows INGESTABLE — NOT YET IN THE STORE when it holds: health, retail, trades and hospitality do; care-work and public-services do not. One rule, two readers, so the lab and the ingest tool cannot disagree about what gets picked up.
