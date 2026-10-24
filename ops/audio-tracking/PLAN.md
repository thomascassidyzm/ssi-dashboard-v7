# Audio tracking: one live clip per text, Drill cut from the pod

Job #338, 24 October 2026. Measured on the nightly QA copy (restored 24 Oct 03:30) across all 68 courses that serve a pod.

## What the player plays today (from the code)

- **Main flow.** Every line plays the clip its own row points at, one pointer per seat (known, voice 1, voice 2). This is the **default**, which the app calls the house clip.
- **Choose-voice** is built (`clipCascade.ts`): it plays the learner's chosen voice where the clip index holds those words in that voice, otherwise it plays the default. **It is switched off in deployed builds**: `VITE_CLIP_CASCADE` was not in Vercel's environment when job #301 checked it. So today every learner hears the default.
- **Pods.** Immersion plays the turn clip. Drill plays the turn's per-sentence clips, or the whole turn when it has none.

## What is wrong

| Finding | Count |
|---|---|
| Drill clips in a different voice from their own turn (so they cannot have been cut from it) | **901 clips in 390 turns, 25 courses**. Chinese: 28 clips in 8 turns, Narrator and Barista swapped |
| Pod turns recorded in a voice that isn't the one the pod casts for that speaker | 2,061 turns in 59 courses. Chinese: 11 |
| Multi-sentence turns with no Drill clips (Drill plays the whole turn) | 1,857 |
| Turns with no audio at all | 268, mostly `fin_for_eng` (223) |
| One text, one seat, one course, but the rows point at several clips (no single default) | **5,148 texts**. Same voice: 2,757. Different voices: 2,388 |
| Drill sentences that also exist as other recordings | 3,260 sentences, 8,324 other recordings. Most are main-flow lines that are still in use. 2,987 are used by nothing |
| Pod clips borrowed from another course that went out with no revision tag | **Fixed and on staging** (see below) |

## The model, with no new table

1. **Default.** One default clip per (course, seat, text): the row pointer. A **fork** (two rows with the same words pointing at different clips) breaks that rule. The census finds every fork, and fixing one means repointing rows to the default.
2. **Choose-voice.** The clip index keeps one clip per (language, words, voice). Choose-voice picks from it and falls back to the default.
3. **Drill.** Drill clips are cut from the turn clip, so by construction they are always the turn's voice. They are never recorded separately.
4. **One answer.** `node tools/audio/live-clip.cjs which --course C --text T [--voice V]` shows the default for each seat, any fork, and what plays under a chosen voice.

## Landed

- **Duplicate-stop**, on Popty main and **live** (I checked it with dry runs: a por_for_eng sentence and a por_br_for_eng sentence were both refused, 0 characters spent): the render route now refuses (409 `DRILL_IS_CUT`) to pay for a second recording of a sentence from a served pod turn in that turn's own voice, and names the cut command instead. The same words in another voice (the main flow's second seat) still go through. Gap: the guard covers the render route only, not the older phase8 bulk-fill path.
- **Census and which-clip tools**, on Popty main: `live-clip-census.cjs` and `live-clip.cjs`.
- **Learner app**, on staging (PR 1276): pod clips borrowed from another course now carry their revision tag, so a re-recorded clip stops playing its cached old version.

## Needs your yes (none of these renders anything: 0 characters)

| | Step | Learner effect | Size |
|---|---|---|---|
| **A** | Re-cut the off-voice Drill clips from their own turn take (ffmpeg only). Old ids are kept for rollback | Drill switches to the immersion voice | 390 turns, 901 clips, 25 courses |
| **B** | Repoint same-voice forks to the default | The same voice, one take instead of two | 2,757 texts, 3,109 rows |
| **C** | Cross-voice forks | These may be deliberate male/female slots, so they need an ear. No action proposed | 2,388 texts |
| **D** | Turns off their speaker's cast | Either the speaker map follows the recording (free) or the turn is re-rendered (costs characters). Your pod-voice call (ruling 2026-09-19) | 2,061 turns |

Before A runs, `splice-sentence-clips.cjs` needs one small change: it must label each cut with the turn clip's voice rather than the cast voice, and cut rather than reuse a separately rendered take. My recommendation is to make that change and then run A. fra_for_eng seeds 1–10 are excluded from everything (#320).

## One taste call

Should the **main flow** also play the pod's cut wherever a main-flow line is word-for-word a pod sentence? Then a learner would hear one voice for those words everywhere. In Chinese the main flow is mostly Azure and the pod is xAI. **My read: not yet.** Do A first and listen. The main flow has two seats and the pod has one voice per line, so this is a redesign of what the learner hears, not a repair.

Files: `ops/audio-tracking/` in Popty, which holds the dry-run lists with rollback ids, the census summaries and this page.
