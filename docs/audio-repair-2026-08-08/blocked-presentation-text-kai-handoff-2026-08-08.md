# French and German — the 27 clips that would not render

**Kai — the short version: 24 of these 27 are not a writing job. Only 3 are.**

The overnight report handed these over as "27 LEGOs with no authored presentation text, so there is nothing to say." I went to look at the actual rows before passing that on, and for the French 24 it is not true. The text is written, the audio is rendered, it is live in S3, and the LEGO points straight at it. Nothing is missing.

What is wrong is one column. The audio row has its own `lego_id` field, and on these 24 rows it is empty — or, on two of them, holds a different LEGO's id. The audio pipeline looks the intro up **by that column**, not by the LEGO's pointer, so it looks the row up, finds nothing, and reports the intro as unwritten.

So:

- **3 German LEGOs genuinely have no intro at all** and need one authored. That is your call.
- **24 French LEGOs need one column set.** No writing, no re-recording, no spend.

---

## The 3 that need you — German

No presentation audio, no presentation text, nothing to point at.

| Round | LEGO | English | German |
|---|---|---|---|
| 1010 | S0499L05 | to close | schließen |
| 1286 | S0595L01 | myself | mich |
| 1296 | S0599L01 | would be | wäre |

**Suggested route, your decision:** phase 8's `/generate` authors intro text itself, so running it over those three LEGOs and then re-running that band would clear them without anyone writing a line by hand. Whether the machine should author these or you should is not mine to call — three intros for "to close", "myself" and "would be" are short enough that you may simply prefer to write them.

---

## The 24 that do not need you — French

Every one of these has a finished intro clip sitting in S3 right now. Two examples of what is actually in the row:

- S0171L02 — *"The French for: 'to look for', is:"* — 2.4 seconds, live
- S0408L05 — *"The French for: 'a happy family', as in — 'yes that's the best way to make a happy family', is:"* — 5.4 seconds, live

| Round | LEGO | English | French | What is wrong |
|---|---|---|---|---|
| 427 | S0171L02 | to look for | chercher | `lego_id` empty |
| 611 | S0280L02 | needed to | devais | `lego_id` empty |
| 657 | S0311L02 | to believe | croire | `lego_id` empty |
| 683 | S0324L03 | two | deux | `lego_id` empty |
| 707 | S0333L02 | to spend | passer | `lego_id` empty |
| 746 | S0351L01 | alone | seul | `lego_id` empty |
| 764 | S0358L01 | to reach | atteindre | `lego_id` empty |
| 805 | S0376L03 | nowhere | nulle part | `lego_id` empty |
| 862 | S0396L04 | to stay | rester | `lego_id` says **S0604L01** |
| 896 | S0405L02 | to ask | demander | `lego_id` empty |
| 902 | S0407L03 | to show | montrer | `lego_id` empty |
| 910 | S0408L05 | a happy family | une famille heureuse | `lego_id` says **S0408L04** |
| 933 | S0414L02 | to have | avoir | `lego_id` empty |
| 962 | S0424L02 | to lose | perdre | `lego_id` empty |
| 969 | S0426L04 | they are | ils sont | `lego_id` empty |
| 1142 | S0493L01 | to arrive | arriver | `lego_id` empty |
| 1160 | S0499L04 | to close | fermer | `lego_id` empty |
| 1265 | S0541L02 | to breathe | respirer | `lego_id` empty |
| 1308 | S0558L01 | in the night | dans la nuit | `lego_id` empty |
| 1323 | S0562L02 | over there | là-bas | `lego_id` empty |
| 1324 | S0562L03 | to arrive there | arriver là-bas | `lego_id` empty |
| 1429 | S0604L03 | at her place | chez elle | `lego_id` empty |
| 1431 | S0605L02 | need help | besoin d'aide | `lego_id` empty |
| 1460 | S0621L02 | to her | lui | `lego_id` empty |

### The two mis-keyed ones are not a conflict

Both are pairs of LEGOs that happen to share the same English. S0396L04 and S0604L01 are both "to stay"; S0408L04 and S0408L05 are both "a happy family". Each of the four has its own separate intro clip — the `lego_id` on one row of each pair simply got stamped with its twin's id. I checked every one of the 24 rows: **not a single one is claimed by two LEGOs.** Setting the column is unambiguous, with no risk of stealing an intro from something else.

### Why I have not just done it

Because the brief that sent me here said these were content gaps and were yours, and it told me in terms not to invent a rendering workaround. Setting a linkage column is not a workaround, but it is a write to 24 rows in a part of the course I was not sent to touch, so the finding comes to you rather than the change going in behind you. If you want it done, say so and it is a few minutes' work with a before-state log per row.

The fix is: for each of the 24, set `course_audio.lego_id` to the LEGO whose `presentation_audio_id` already points at that row.

---

## One thing worth knowing beyond these 27

I counted the same defect across both whole courses. Within French, those 24 are **the entire population** of "intro audio exists but is not keyed to its LEGO" — there is no larger hidden pile behind them. German has none of that class at all.

There is a separate, larger group — 124 French and 170 German LEGOs with no presentation audio of any kind — but those sit outside the released round range, so nothing has ever tried to play them and no learner is affected. Worth a look one day; not urgent, and not this.

---

*Compiled 2026-08-08 while re-voicing French and German rounds 1-200. All 27 sit well past round 200, so none of them is in that job's path — this is last night's leftover, verified against the live database rather than copied forward.*
