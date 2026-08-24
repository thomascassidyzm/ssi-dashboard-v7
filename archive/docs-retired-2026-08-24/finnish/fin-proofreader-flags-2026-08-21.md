# Finnish proofreader flags — triage and resolution, 2026-08-21

**Course:** `fin_for_eng` · **Reviewer:** Kai, in the dashboard proofreading tool
**Applied by:** worker session `finnish-proofreader-flags-triage`

## Where the flags live

Not in Deborah's Basecamp review column — I read every card in every column of the
Creu Cyrsiau card table (`26277678` / card table `7038571695`) and **there is no Finnish
card there at all**. Nor in any database flag table: `course_qa_flags`, `content_feedback`,
`sample_flags`, `audio_flags`, `audio_clip_flags`, `course_seed_drafts` and
`course_seeds.flagged_at` all hold **zero** rows for `fin_for_eng`.

They live in the **proofreading tool's own progress store** —
`tools/proofread/progress/fin_for_eng.json` in the checkout the live server runs from
(`scripts/proofread-live`, PID confirmed by `/proc/<pid>/cwd`). At the start of this pass
that file held **2,860 decisions: 2,854 `ok` and 6 `flagged`**, all six left on
**2026-08-18**.

### The tool has no "resolved" state

Statuses are `ok` | `flagged` | *cleared*. There is no third state, and **nothing in the
data path writes back to it** — the tool's only writer is a reviewer clicking in the UI.
Fixing a flagged row in the database therefore leaves the flag sitting open in Kai's
queue forever unless someone edits the progress file by hand. This pass edited it by hand.

**Already resolved before this pass:** 2 flags, both from 2026-08-04 —
`S0057L01U06` (flipped to `ok` on 2026-08-06 with an agent note after `sen nimen` →
`sen nimeä`) and `S0059L01U07` (its phrase was deleted and the entry removed).
Of the 6 outstanding flags, **0** had been resolved.

## Resolved: the `kysyä` group — 4 flags, 6 rows pulled

Flags `S0030L02U06`, `S0030L03U06`, `S0052L01U08`, `S0062L01U06`. Kai's note on the first,
inherited by the other three ("same here", "same as earlier flags", "kysyä issue"):

> *"Actually this kind of sounds better as nimeä to me I think - we should probably pull it
> rather than fix it as it's a confusing one for the learners"*

Applied as written: **pulled, not fixed.**

`kysyä` governs a partitive object, and these were the only places in the course where it
took a genitive/total one. Fixing them to `sen nimeä` would have collided head-on with the
seed 20 / seed 21 split the course already carries (`his name → sen nimen` at 20,
`her name → sen nimeä` at 21) — which is exactly the learner confusion Kai names.

### The sweep

Swept the whole course, not the flagged rows: every phrase, lego and seed row containing
both `kys*` and `nim*`. That found **two rows Kai had not reached** at seed 380, in the
same error class and with the same English shape. Both pulled under the same ruling.

| Seed | Row | Known | Finnish pulled |
|---|---|---|---|
| 30 | L2 p9 | I wanted to ask her name | mä halusin kysyä sen nimen |
| 30 | L3 p12 | I wanted to ask you her name | mä halusin kysyä sulta sen nimen |
| 52 | L1 p14 | he wanted to ask her name | se halusi kysyä sen nimen |
| 62 | L1 p12 | can I ask her name? | voinko mä kysyä sen nimen? |
| 380 | L1 p12 | I asked his name | mä kysyin sen nimen |
| 380 | L1 p16 | I asked her name | mä kysyin sen nimen |

**0 rows of this class remain** — re-read live from the database after the write.

### Consistency and safety

- All six rows were `use` phrases. **No lego card and no seed sentence** carried the form,
  so nothing taught was removed — verified against `course_legos` and `course_seeds`.
- Every affected lego keeps a healthy phrase count: 30/L2 9→8, 30/L3 12→11, 52/L1 14→13,
  62/L1 12→11, 380/L1 16→14. Nothing near a floor.
- Positions stay contiguous at seeds 30, 52 and 62 (all four were the last row of their
  lego). Seed 380 keeps gaps at 12 and 16, ids not reissued — the same shape the
  2026-08-06 pull of `S0059L01U07` left, which the course has run with since.
- **No audio touched, generated or deleted.** All six rows had NULL on all four audio
  columns; `fin_for_eng` holds no target-side clips at all.
- The only foreign key onto `course_practice_phrases` is `course_qa_flags.phrase_id`,
  which has zero Finnish rows.

### Seeds unapproved

**1 row: seed 62.** Seeds 30, 52 and 380 were already unapproved before this pass.

### Rollback

All six rows are snapshotted verbatim in
`docs/finnish/fin-kysya-pull-2026-08-21-rollback.json` — a straight re-insert restores
them if Kai meant "fix to nimeä" rather than "pull".

## Left for Kai — 2 flags

**1. `S0054L02U06` (seed 54): "reads a bit awkward."**
*I want to give something to her friend* — **mä haluun antaa jotain kaverillensa**.
The awkwardness is real and structural: `-nsa` is a third-person possessive with nothing
to bind to when the subject is `mä`. The natural Finnish is **sen kaverille** — but
`kaverille` is not introduced until **seed 306**, and `kaverillensa` is itself a **taught
lego card at seed 52** ("to his friend"), used in 18 phrases across seeds 52, 54, 185, 357
and 527. Repairing it properly means moving a teaching point, which is a course decision
Kai has not made. Not touched.

Incidental: at seed 54 the prompts *his friend* (p4) and *her friend* (p9) render as the
identical Finnish, so the learner drills the same sentence twice. Rides with the same call.

**2. `S0105L02B05` (seed 105): "this is fine, but we could also add some 'she didn't
know's in here, you know?"**
The row is correct — *he didn't know her name* / **se ei tiennyt sen nimeä**. How many
mirror rows and which sentences is an authoring choice, not something the note settles.
Not touched.

## One thing raised, not acted on

The sweep also surfaced `S0380L01U09` / `S0380L01U10` — *I asked it on Wednesday / Monday*
→ **mä kysyin sen keskiviikkona / maanantaina**. Same government defect (`kysyä` with a
total object; partitive `kysyin sitä` is the correct form), but **not** the case Kai's
"confusing for learners" rationale covers, and the obvious repair here is to fix rather
than pull. Left alone pending his word.

## Method

Read the whole course, not a sample: 668 seeds, all legos, all 14,117 remaining phrase
rows. All counts and every post-write verification re-read live from the database rather
than from the edit log.
