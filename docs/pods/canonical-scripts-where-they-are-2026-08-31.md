# The canonical scripts: they exist, at popty.app/canonical/scripts

**[popty.app/canonical/scripts](https://popty.app/canonical/scripts)** — all six generated scripts, viewable and editable, no course to load.
**[popty.app/canonical/metagraph](https://popty.app/canonical/metagraph)** — the graph, read-only, with each script as an overlay.

**[Screenshots of exactly what you will see →](https://watson-1.tail4968cb.ts.net/evidence/script-lab-2026-08-31/index.html)**

---

## The plain answer

**Viewing: yes.** One place, all six scripts in the canonical format, live now.

**Editing: yes, but bare.** Every line is a text box; type, tap away, it saves to the language-neutral English master. There is **no history, no attribution, no undo and no diff**. That is the one thing the estate's rule for learner-facing copy demands and this page has not got.

**Why you could not see it: you looked at the Pod Lab, and the Pod Lab points nowhere.** `/admin/configs/pods` is the pod surface, so it is the right place to look — but it is the *acquisition-ladder* lab, it asks you to choose a course, and it has never carried a link to the canonical scripts. The Script Lab was put on the Courses nav row instead, beside Seeds, Content and Pods, on 30 August. Nothing was behind a flag; it was one door away from where you were standing.

## What is in it

Six scripts, read from `canonical_pod_scenarios` — the markdown is no longer canon:

| script | scenes | lines |
|---|---|---|
| `learning-flagship` — the Learning flagship | 11 | 367 |
| `method-pod-43-scene` — the control arm | 43 | 276 |
| `method-pod-chapters` — the chapter cut | 12 | 309 |
| `pod-0` — the live POD 1 | 22 | 231 |
| `pod-1` — separate slate | 16 | 236 |
| `pod-0.5` — separate slate | 7 | 27 |

Everything written up to and including the three pods of 30 August is in there. **Explicit gap: Aran's health flows — the nurse and doctor sequences — are not in this repo or in the store.** They were searched for and not found; they exist wherever he is building them. The data contract for loading one is written down, but nothing has been loaded.

Each script page leads with coverage: shapes traversed, hit twice, and the deficit list of shapes never reached.

## Two things wrong that you would have hit

**1. The coverage numbers are wrong live for the three new scripts.** They read *0 of 23 traversed, 23 never reached*. The scripts and their shape walks are both in the database and correct — `pod-0` reads 18/23 properly — but the **production API process has not been restarted since 30 August 17:01**, so it is still serving a version of the endpoint that does not return the walk steps. The page then honestly has nothing to score. **Fix: restart the production API on watson-1.** That is one action, and I have deliberately not taken it — other jobs are running on that process. Nothing else is broken.

**2. Editing has no safety net.** An edit overwrites the master immediately. Nothing records who changed what, and there is no way back to the previous wording. On this estate that is exactly what versioning and a diff exist to prevent.

## What I have done

**Landed to a branch, not to main** (staging authority, as briefed):

- The Pod Lab now carries two links above the course picker — the canonical scripts, and the shape graph. Tap only.
- The Metagraph gets its own tab on the canonical nav row, so it is not reachable only via a button inside the Script Lab.

Branch: `feat/script-lab-signposts-and-versioning`. It reaches popty.app only when it is merged to `main`.

**In flight:** worker **#433** is building the versioning and the diff back on top of that branch, following the pattern already proven by the Copy editor — an append-only version store, the original frozen, every save attributed, restore by appending rather than deleting, and a word-level diff on tap. It is being built as a Vercel API route rather than on the production API, on purpose: that layer deploys with the front end, so it will not need the process restart that has just bitten the coverage numbers.

## Decision for you — one

**Restart the production API on watson-1?** It fixes the coverage read-out for the three new scripts and costs nothing else. Say the word, or do it whenever the box is quiet.
