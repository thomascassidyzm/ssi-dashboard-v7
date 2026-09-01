# Every walk, one page

The Script Lab showed three walks and had never shown a fourth. It now shows twelve — nine in the
canonical store, one mapping still waiting for its dialogue, and the two parked pre-metagraph POCs
that no lab could see at all.

## What was actually wrong

Not the endpoint. `GET /api/admin/canonical-pods` has no filter and returns the whole table. The
walks were absent because they had never been ingested: `tools/pods/ingest-canonical-pods.cjs`
carried a **hardcoded three-entry map**, so a corpus that existed could not be ingested without
someone editing code, and nobody ever did.

That map is gone. In its place is **`tools/pods/pod-corpora.json`, the walk registry** — one file
with two readers. The ingest tool discovers what to ingest; the page reads the labels needed to
tell walks apart. **Adding a walk is one JSON entry plus its corpus file, and no code change.**

That claim got tested rather than asserted. The **care-work** corpus landed while this job was
running. Promoting it from mapping-only to ingested took editing three fields and copying one
markdown file. No code changed anywhere.

## The walks

| walk | rows | scenes | flows | target text |
|---|---|---|---|---|
| **pod-1 — CORE** | 231 | 22 | — | — |
| learning-flagship | 367 | 11 | — | — |
| method-pod-43-scene | 276 | 43 | — | 276 Italian |
| method-pod-chapters | 309 | 12 | — | 309 Italian |
| health | 438 | 23 | 73 | — |
| trades | 414 | 23 | 69 | — |
| retail | 330 | 25 | 55 | — |
| hospitality | 330 | 21 | 55 | — |
| care-work | 306 | 20 | 51 | — |

**1,818 rows written across five walks.** The four that were already there are untouched. Italian
is still the only target language in the canonical store — 585 rows across the two Method cuts.

**Public services** is still being authored: the branch exists, the corpus does not. It shows as a
mapping with no walk, which is what it is.

**Music and travel are visible and parked, not ingested.** Music is 749 turns across 8 scenes with
585 target and 491 known clips already rendered; travel is 72 turns in one scene. They carry their
sizes now, because 749 rendered turns is a different thing to leave parked than 72 is — the size
is what makes the parking decision reviewable rather than just recorded.

## Counts checked three ways

I counted the corpora myself, with a throwaway parser written from the rule alone, before either
builder reported — so their numbers were checked, not accepted.

Health and trades match their published figures **exactly**: 23/73/438 and 23/69/414. Retail
measures 25 scenes / 55 flows / 330 turns against a published 53/318. The gap is exactly two
six-turn flows in the R0 prologue, which the document itself calls inherited from CORE scene 0
rather than authored. The document is canon for ingest, so all 330 turns went in and the
difference is recorded as reconciled — not trimmed to match a report.

## Three things the page gets right that it would have been easy to get wrong

**No shape claims is not zero coverage.** health, hospitality and care-work declare no metagraph
shapes, so no walk steps were parsed and none were invented. Their coverage reads as *words*, not
numbers: "nothing was claimed, so nothing failed." Rendering that identically to retail's 23-of-35
unresolved declarations would have libelled Aran's exemplar corpus as having zero coverage.

**One slug, two meanings.** Mid-cutover, `pod-1` means the live CORE canon in
`canonical_pod_scenarios` and the *new generated slate* in `listening_pods`, where `pod-0` is still
the old one. The page says so in one sentence. The learner-side cutover is 22 of 68 courses in and
nothing here touched it.

**The canonical seed and a course's known text are different objects.** Re-measured
non-circularly: at the slot whose canonical line is "Good morning, Sarah!", the generated pods hold
**24 distinct known texts across 46 courses** — including *¡Buenos días, Sarah!* and *Bonjour,
Sarah !* — and seed 1 has **116 distinct values across 130 courses**. Editing the canonical does
not propagate; the change is **owed** to every course rather than applied to it. The page states
which object it edits, unmissably.

## One call I made against the brief

**The page wears LIVE AT NEXT GENERATION, not LIVE NOW.**

The brief cited job #714's finding that a seam saved in the fine-map editor is read by the next
learner. That is **Pod Lab's** fine-map editor — `PATCH /api/pod-fine-map` writing `atom_map_fine`,
read live at `useListeningPods.ts:179` — and #714 classified Pod Lab live on exactly that evidence.

The Script Lab's only write is `POST /api/canonical-script`, onto `canonical_pod_scenarios`.
Nothing learner-facing reads that table; `pod-dialogue-generator.cjs` flexes it into
`listening_pod_sentences` only when explicitly invoked, and I confirmed no scheduler triggers it.
#714's own rule is to classify by what the code writes, and applying it faithfully gives deferred.

It is the same fact as the paragraph above: editing the canonical is owed to every course, not
applied to it. Labelling the most deferred write in the estate LIVE NOW would be the class of lie
that rule exists to prevent. **If a control that reaches a learner is ever added to this page, the
tier flips** — the banner names the specific write it rests on, so the claim stays checkable.

## A live defect the rename caused, found and fixed

`MetagraphView.vue` hid `pod-1` as a sacked slate. After the rename, `pod-1` **is** the live CORE
pod — so the guard hid the exact pod it was written to protect, while the labels and the default
selection still pointed at a `pod-0` that no longer exists. CORE was both invisible and unnamed
on that view.

Fixed by re-reasoning rather than a string swap: the guard is empty, because both slates it hid
were deleted. `ORIGINS` and `node.origin` were deliberately **left alone** — they are the metagraph
store's own provenance namespace, which the database migration never touched. Twelve nodes still
declare `provenance: "pod-0"` and the schema enum still reads `["pod-0", "method-pod"]`. Two
namespaces, the same pod, both correctly rendering "POD 1", with a comment saying so.

## What I did not do

- **The gate held first.** I checked the migration before writing anything and found it dirty —
  `pod-0`, `pod-0.5` and the old `pod-1` all still present. I wrote nothing and did read-only work
  until #732 finished. Verified clean before every write.
- **Nothing learner-facing was touched.** No `listening_pods`, no `learner_pod_state`, no
  `listening_pod_sentences`, no `source_text` rename.
- **No branch was merged to main**, and nobody else's branch was merged anywhere. Corpora were
  copied from their branches by path.
- **Public services** is not ingested, because it does not exist yet.
