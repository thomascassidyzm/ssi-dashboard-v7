# Tom_002 and the broken recorder — both true, 21 minutes apart

**2026-08-31, settled from the database, the server log and the deploy reflog.**

Tom made Tom_002 at **13:29:37Z**. The recorder broke at **13:50:32Z**, when the clone-demo
rewrite was merged, and reached the live site a couple of minutes later. Tom got his clone in
before the breakage, by about twenty minutes. Nobody is wrong.

## 1. What the database says about Tom_002

| fact | value |
|---|---|
| display name | Tom_002 |
| voice row | `cartesia_e7ed10ad-8aaa-41fd-b3a2-eb7d5e0b4bac` |
| created | **2026-08-31 13:29:37.416Z** |
| how it was made | `metadata_source` = *cartesia-clone (Voice Lab)*, note *"Cloned from the Voice Lab by thomas.cassidy+ssi@gmail.com"* |
| consent fields | all empty, status `not_recorded` |
| auditioned | 13:29:51Z, one clip, same account |

The empty consent fields are themselves a timestamp: consent recording was added to the clone
path at 13:32:33Z, three minutes *after* Tom_002 existed. Any clone made after that carries a
consent record. Tom_002 does not, because it predates the feature.

## 2. Which route made it

**Not the estate route.** That is not an assumption — the estate route did not exist yet.

- The endpoint it uses, `/api/voicelab/voices/cartesia/clone-from-estate`, was first written at
  **13:32:33Z**, three minutes after Tom_002 was created.
- The production API process that served the clone had been restarted at **13:20:04Z** on
  commit `a35ba03df`. That code has exactly one clone endpoint —
  `/api/voicelab/voices/cartesia/clone`, which takes a sample sent up from the browser. The
  server log confirms that route ran: *"[voicelab] cloned cartesia voice e7ed10ad… by
  thomas.cassidy+ssi@gmail.com"*.

So Tom_002 came from one of the two routes that later broke: **recorded in the browser, or
picked as a file**. It was made while both still worked.

**Honest gap:** the data cannot tell those two apart. Both post the same clip to the same
endpoint under the same filename, and nothing stored — the voice row, the server log, the lab
ledger — records which button started it. Even today's code writes the same phrase for both
("uploaded or recorded sample"). Only Tom knows which one he pressed, and for this question it
does not matter: both were alive at 13:29 and both were dead at 13:54.

## 3. The timeline, side by side

| time (UTC) | what happened |
|---|---|
| 13:20:04 | production API restarted on `a35ba03df` — one clone route, browser-sample only |
| **13:29:37** | **Tom_002 created** |
| 13:29:51 | Tom_002 auditioned, one clip |
| 13:32:33 | clone-from-estate route written (first time it exists) |
| 13:50:04 | `67794654b` — the clone-demo rewrite that deleted the recorder's script bindings |
| 13:50:32 | merged to main; Vercel builds from main |
| ~13:54 | broken bundle cached at the edge (measured from the page's own age header at 16:44) |
| 16:43:54 | fix committed |
| ~16:47–16:50 | fix deployed; prod checkout pulled it at 16:50:03 |

## 4. Verdict

**Job #481's claim was correct, and so was Tom.** They are about different clocks.

- The record-here and upload-a-file routes really were dead from about 13:54 to about 16:47 —
  roughly 2h50m. I confirmed independently that the live JavaScript now contains the recorder
  again, so the fix is genuinely deployed.
- Tom_002 was made at 13:29:37, twenty-one minutes before the breaking commit was even written.
  It is not a counter-example to the outage; it is evidence from before it.

**The fix was aimed at the right thing.** The three missing bindings and the deleted recorder
block were real, and restoring them was the correct repair. I re-ran the gate #481 left behind
against the current production checkout: **167 components clean, 2 pre-existing issues
baselined**. No second fault in the clone path.

The two baselined issues are real but unrelated and untouched: `CourseValidator.vue` reads
`phaseData` outside the loop that defines it, and `PhraseEditModal.vue` calls `window.reload`
from a template, where `window` does not exist.

One narrative detail in #481's write-up is worth correcting for the record: it guessed that
"whatever worked at 15:30 was almost certainly the estate route". For Tom_002 that guess is
wrong — Tom_002 came from the browser-sample route, before the break, not from the estate route.
