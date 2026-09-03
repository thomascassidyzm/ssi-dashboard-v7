# Script Lab — every walk in the estate, in one place

**Branch `feat/script-lab-page`, pushed. Not merged. Deployed nowhere.**

Tom, 2026-09-01: *"can we wrap all this up into the scripts lab page? including the changes we've made to the other pods, so I can see them all in one place?"*

It does now. `/canonical/scripts` lists all twelve — the core pod, the flagship, the two Method cuts, six themed walks and the two parked ones — with the labels needed to tell them apart.

## What the page carries

**CORE vs THEMED.** `pod-1` sits alone under "Core — the default chain": compulsory, the ladder a learner descends by not choosing. Themed walks sit under "chosen", each showing *why* a learner picks it — an interest in health and care, in the trades, in hospitality. The selector is interest, never occupation. The string "sector pods" appears nowhere on the page, and a test asserts it.

**Target text.** Italian, on the two Method cuts, 276 and 309 lines. Everything else reads "no target text", because that is the truth of the canonical store — including the five themed walks ingested this morning.

**The naming trap, defused in one sentence.** Mid-cutover, `pod-1` names two different objects. In `canonical_pod_scenarios` it is the core canon, renamed from `pod-0`, and that rename has landed. In `listening_pods` it is the *new generated slate*, while `pod-0` is still the old one at 46 courses and 6,632 sentences. Seeing the same slug twice with different numbers and no explanation reads as a broken page. The page says it plainly: the learner-side cutover is 22 of 68 courses in, runs on its own tooling, and is nothing this page touches. The other seven generated slates are the cutover's business, not the walk registry's, and are not rendered.

**Audio.** Said once, plainly, at the top: the canonical store holds no audio at all, for any walk on the page. Audio exists against generated pods, downstream. No invented column.

**Status,** from the registry: authored, mapping-only, parked. `public-services` shows MAPPING-ONLY — a mapping is not a walk, so it carries no link to open.

**The Welsh health overlay** wears WELSH OVERLAY — DRAFT FOR ARAN on the health card. A worker never signs off target-language text.

**The two Method cuts** render inside one dashed frame under one sentence: *"One decision, two realisations of the same material. Tom's choice is outstanding — picking one sacks the other."* Two cards, visibly one choice.

**The parked pair** is visible with its provenance and its ruling quoted, out of the canonical store, not canon.

**The object statement** is now a bordered box you cannot skim past, with the numbers in it: the canonical English master and a course's known text are different objects; seed 1 has 116 distinct known texts across 130 courses; "Good morning, Sarah!" appears as 24 distinct known texts across 46 courses; saving here propagates to none of them, so the change is **owed** to every course rather than applied to it.

**Blast radius:** the page wears #714's banner at LIVE AT NEXT GENERATION, naming `POST /api/canonical-script`. I checked every control on the page and found none that reaches a learner directly, so the tier stands as ruled. The reasoning and the writes it was checked against are recorded in `blastRadius.js` beside the entry, where the next person will find them.

## How it survives a rename

Nothing on the page keys on a slug. The registry `tools/pods/pod-corpora.json` is imported and joined to whatever the store returns; any DB slug the registry does not name is shown as UNREGISTERED with its real counts rather than hidden. The join is done **in the page**, not server-side — the existing endpoint needed no change.

That mattered within the hour. Job #732's migration landed while I was building: the store now holds four slugs, `pod-1` at 231 rows and 22 scenes, and the two sacked slates are gone. The page needed no edit. Twelve unit tests assert it against the store as it stood on **both sides** of that rename.

## No shape claims is not zero coverage

The change that matters most. `health`, `hospitality` and `care-work` declare no shapes in their corpora, so no walk steps were parsed and coverage computes as 0 of 36 traversed. Rendered as numbers, that is a libel — Aran's 438-line hand-authored exemplar would have read as the worst-covered walk on the page.

Declaring nothing and failing to resolve what you declared are opposite facts, and they now render differently:

- **No declarations** — words, no numbers: *"This corpus declares no metagraph shapes, so no walk steps were parsed and there is no coverage to compute. That is not zero coverage — nothing was claimed, so nothing failed. Encoding its walk is the next step, not a repair."*
- **Declared** — numbers, including the unresolved count, which *is* a finding. Retail 23 of 35 unresolved, trades 40 of 84.
- **Graph rows** — the core slate, whose rows are the graph's own reference space, labelled "read off row references, not declarations".

The mode is derived rather than configured: `refSpace === 'g'` means the core slate, otherwise the declaration count decides.

## The estate moved under the page, three times, and it held

**Migration #732 landed mid-build.** The store went to four slugs, `pod-1` at 231 rows. The page needed no edit — nothing in it keys on a slug.

**Then five themed walks were ingested at 11:29,** while I was writing the tests. Health, retail, trades, hospitality and care-work all appeared in `canonical_pod_scenarios`. The page absorbed it: their INGESTABLE badges cleared, their store counts and coverage arrived, and they gained script pages to open.

**That surfaced a real drift.** `care-work` landed in the store with 306 rows while the registry still recorded it as `mapping-only` — a status that *claims* it is not in the store. The page flags exactly that contradiction: a red REGISTRY IS BEHIND THE DATABASE chip and a plain sentence saying which source to believe. Same principle as the unregistered row — this page never quietly resolves a disagreement between its two sources, because the disagreement is the thing worth seeing.

**Then the write pass landed and the drift resolved.** The store holds nine walks; `care-work` is `authored` with a corpus and a branch, so its flag cleared on its own. `public-services` stays `mapping-only` — its branch exists but carries no corpus — so it shows as a mapping without a walk and offers no link. The drift machinery stays, because the next one will not announce itself.

**The lesson landed in the tests, hard.** Three separate specs broke this session because they named `care-work` as mapping-only; it moved twice in twenty minutes. Statuses, ingestability, drift and links are now all derived from the registry, and the drift case is tested against a *constructed* contradiction plus a live assertion that the real registry currently has none. A test that goes red because the work went right is a bad test.

## The bugs the rebuild found

Driving the page showed the core pod reading **0/36 shapes traversed, 231 lines unmapped** — zero coverage for the one walk the whole graph is derived from.

`GRAPH_REF_SLUG` in `src/lib/metagraph/walk.js` is a database slug, and the rename left it at `'pod-0'`. The core slate fell into the "walks in its own reference space" branch, where by design every line comes back unmapped. The behaviour was right; the slug was stale. Fixed, and verified in the browser against the live store: **18/36 traversed**.

Two nearby strings deliberately not renamed with it, and the comment now says why: the bundled walk file `walks/pod-0.json`, and the `origin: 'pod-0'` provenance labels in `fromStore.js`. Provenance does not get rewritten by a rename.

**The second was the `MetagraphView.vue` guard inversion** — `HIDDEN` hiding the live core pod after the rename. I fixed it when the owning session had exited, and it was then fixed properly on the base branch. On merging I took **their** version wholesale at the conflict: it is their fix, and their two-namespace comment is the authority. I then checked my own page against that same distinction. The only slug literals left in it are in `walkFacts.js`, and they are `listening_pods` slugs on the generated side — named deliberately, because the entire point of that sentence is that the two namespaces disagree.

## Verified how

A real browser, against a real `production-api` on port 3470 and the live canonical store. `e2e/script-lab/` logs in as the seeded admin, loads the page, asserts every label above, and photographs it at desktop and phone width. Three specs, all green — the third asserts the metagraph shows the core pod rather than hiding it. Every request it makes is a GET; it spends nothing.

Screenshots: `~/ssi-evidence/ssi-dashboard-v7/script-lab-shots/` — `desktop.png`, `phone.png`, `labs-index.png`, `metagraph.png`.

Also green: 25 unit tests on the join, 11 on #714's labs index, and a full `vite build`. I did not run the repo-wide suite.

One hazard worth recording for the next worker on this box: Playwright's Chromium could not start, missing `libnspr4.so`, and there is no sudo here. Other sessions had already extracted the NSS libs into scratch; copying that set and putting it on `LD_LIBRARY_PATH` got a browser up. Without that trick this would have been a reported gap rather than a screenshot.

## What #714's work looks like here

`src/components/admin/blastRadius.js`, `BlastRadiusBanner.vue`, `LabsIndex.vue` and its test, the router move to `/admin/labs` with its legacy redirects, and the lab pages that wear the banner were **copied file-by-file** with `git checkout origin/feat/admin-labs-blast-radius -- <paths>`. That branch is **not merged** here and its docs deletions were not taken. I took the whole coherent set rather than half of it, so the index and the banner agree, and the Script Lab now has a front door: `/admin/labs` → Open Script Lab.

## Two things I decided rather than asked

**The registry has no counts for the parked pair.** `music` is 749 turns across 8 scenes, `travel-situations` 72 turns in 1 scene, and both live only in `listening_pods`, which the Script Lab cannot read. I did **not** add a field to the shared contract — it is not mine to edit. The parked cards show provenance without size, and job #48 has been told.

**The registry's fields are now read, not duplicated.** `parked[].size` replaced my local snapshot, which I deleted rather than maintain in parallel, and the page shows the registry's own `measured` provenance string beside it. `ingestableRule` is **cited verbatim** in the footer rather than paraphrased, and a test asserts our predicate still implements exactly what the field says — reword the field and the test fails, which is the point of hoisting it.
