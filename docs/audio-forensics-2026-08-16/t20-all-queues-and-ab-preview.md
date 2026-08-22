# T-20 ALL — both queues are loaded, and the A/B preview is live

**Nothing has been sent to Aran or Catrin. This is preparation only; the contacting is yours.**

2026-08-16. Two things were asked for: make the recording queues say what you ruled — Catrin's entire
Welsh queue across both dialects, Aran's whole set rather than the twelve damaged clips — and build
Aran a way to hear a take in both forms before he starts. Both are done, landed on `main`, deployed,
and verified on the live public surface in a phone-sized browser rather than from the source.

**Tap-to-play evidence, including the two clips side by side:**
https://watson-1.tail4968cb.ts.net/evidence/t20-ab-preview-2026-08-16/index.html

---

## The two links, as they read right now

| | Link | Queue |
|---|---|---|
| **Aran** | `https://popty.app/r/human_aran_cym_n` | **170 lines, 0 recorded, 170 left** |
| **Catrin** | `https://popty.app/r/human_catrinlliar_cym_n` | **276 lines, 0 recorded, 276 left** |

One link each, both dialects inside it — the surface is scoped by language, not by course. A line
that is word-for-word the same in north and south Welsh is read **once**, and that collapse is the
whole difference between the raw counts and these: Aran 87+87 lines becomes 170, Catrin 144+144
becomes 276. Your 276 was exactly right.

Per dialect, before the collapse:

| | cym_n | cym_s |
|---|---|---|
| Aran (all male characters) | 87 | 87 |
| Catrin (all female characters) | 144 | 144 |

The casting rule you set already holds in the data: every male character in both courses is cast to
Aran, every female one to Catrin. Nothing needed recasting.

---

## What actually had to change to make "ALL" true

**The queue could not express "re-record this".** It knew only whether a clip existed under a voice
and a text — so the 90 re-record wants written for T-20 two days ago were **invisible on the page
Aran and Catrin actually open**. His link said 71 of his lines were done when every one of them was
queued for a fresh take.

The fix names the missing fact: *a clip exists* and *the clip is good* are different things. A want
now makes a line outstanding **without unlinking anything** — the old take stays linked, stays
playable, and is what the A/B preview plays. Make-before-break by construction, not by discipline.
The other half is that a want retires by clip identity once the replacement take is stored and
linked; without that the new take would inherit the old one's flag and the line would never close.

Then your ruling, applied non-destructively: **71 of Aran's 111 stored Welsh takes flagged for a
fresh take.** No audio deleted, no S3 object touched, no pointer moved.

**Catrin needed no write at all** — she has never recorded a line of Welsh pod dialogue, so her
276 were already outstanding. Her only recordings anywhere are 35 clips on `cym_anthem_for_jpn`,
and those measure clean.

### The 40 I did not flag, and why

Aran has 111 stored Welsh takes; 40 of them are of text that **appears in no pod line of any course
today** — historic glued multi-line utterances ("Na, mae'n ddrwg gen i… Ond gawn ni siarad ddydd
Sadwrn. Wela i chdi bryd hynny." as one take) and superseded wordings. Flagging them put 40 items in
his queue that the take route physically cannot accept a recording for, i.e. lines he would tap and
fail on. They are also work nobody wants — the text is not in the course. Flags cleared back to null;
the takes themselves are untouched and listed in
`docs/audio-forensics-2026-08-16/t20-aran-orphan-takes-applied.json`.

### A trap found on the way, and closed

Eighteen Welsh **narration** clips already carried a re-record flag — 17 in Aran's queue, 1 in
Catrin's — and all eighteen **404'd when tapped**. The queue has been content-type-agnostic since
you ruled it should be; the take route was not, resolving every line against pod sentences only.
Aran would have met the first of these in his first session. They are now recorded through the
upload seam's regeneration mode: the row keeps its id, so the 18 `course_legos` pointers that make
a learner hear them keep working with no relink, and the old object stays put for reversibility.

---

## The A/B preview

On the recording page, under any line with a stored take, **Compare** opens two independent
tap-to-play buttons — *Original (raw)* and *Processed (what learners hear)* — each showing its own
duration, with the difference stated underneath in words. No autoplay, one at a time, thumb-sized.

Measured on a real take, end to end through the public host:

| | Duration | Bytes |
|---|---|---|
| Original (raw) | **1.408 s** | 13,843 |
| Processed (what learners hear) | **1.400 s** | 23,404 |

8 ms apart — the fixed filter. The old filter would have returned 1.200 s, a fifth of a second of
speech gone off the front. That is the number that tells you a take is safe, and it is now one tap.

### The honest gap, and it is a real one

**Aran cannot A/B his existing recordings in both forms, because the originals do not exist.**
Raw retention started 2026-08-14; every one of his 111 Welsh takes predates it. The T-20 post-mortem
already established those originals are gone everywhere — not on S3, not in backups, not in logs.

So the surface tells him the truth rather than showing a dead player: *"No original was kept for this
take — recorded before 2026-08-14, when raw originals started being retained. Re-record it and both
versions will be here to compare."* He can still hear the **processed** old take, which is worth
having: the first clip on his page, "Bore da, Sarah!", plays back at **0.65 s**. That is the damage,
audible, without needing a waveform.

Where the A/B genuinely earns its place is **from his first new take onward** — he reads a line, taps
Compare, and sees for himself that the processing is no longer eating his speech. That is the
reassurance worth having before committing to 170 lines, and it works today.

---

## Testing done before anyone is contacted

On `zzz_test_for_eng` — hidden, draft, unreachable by any learner — through real HTTP on the actual
router, against the live database and live S3:

- a take recorded on a fresh line: stored, linked, raw original archived;
- that clip flagged for a re-record: the line **re-opens**, and its old take is still playable;
- a replacement take recorded over it: the want **retires**, the line closes, the flag is gone;
- a non-pod narration re-record: **200**, row keeps its id, want retired;
- a clip not queued for a re-record: **409** — this surface re-records what was asked for, nothing else;
- an unknown id: **404**, unchanged.

In a phone-sized browser against popty.app: Compare opens, both versions play, durations render,
the delta reads "Processed is 8 ms SHORTER than the original", and Aran's honest empty state renders.

Tests: 23 pass under `node --test` (13 queue, 10 clip-variant), 267 pass under vitest.

**One bug this browser pass caught that no unit test would have:** with every line outstanding, the
listen-back section — and Compare with it — vanished from Aran's page entirely, because it was keyed
off "line is done" rather than "line has a take". Exactly the moment he most needs to hear what he
already gave us. Fixed and re-verified live.

---

## Two things that are yours, not mine

1. **Aran's own device or browser** is still the only unexplored place a pre-processing original of
   his clips could survive. A human has to ask him; code cannot.
2. **Presentation narration has no attributable recordist.** `voice_id='human'` is one shared bucket
   with no per-actor tag. The 18 narration re-records are routed by the voice the *replacement*
   needs, never by who recorded the original — which is correct, but it does mean nobody can tell you
   whether those 18 were Aran's work or someone else's.

---

## Landing line

Commits are on `feat/t20-ab-preview-2026-08-16` (which merged in `feat/t20-ab-preview-ui-2026-08-16`
from worker #784), **merged to `main`** at `58f8c7e8`. Deployed: the production checkout is
fast-forwarded to `main` and `popty-production-api.service` was restarted onto it at 20:02:47 UTC;
the frontend rebuilt on Vercel and the served `RecordistRoom` chunk carries the new code. **Verified
live on popty.app** — both queues, both A/B variants, and the UI driven in a browser.
