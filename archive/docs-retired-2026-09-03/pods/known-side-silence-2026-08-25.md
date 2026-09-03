# The English lines that didn't play — found, and mostly fixed

**Tom, by ear, 2026-08-25 ~02:00Z, Italian Pod 1: "a couple of phrases didn't exist just then for me."**

You were right, they were real, and there were more than a couple. In Italian Pod 1 there were
**41** of them. Across the whole live estate there were **1,479**.

**1,301 of them now play. It cost nothing.**

---

## What was actually wrong

Not missing audio. Every single clip the pod points at is alive — an independent probe fetched all
932 of Italian Pod 1's clips through the real learner endpoint and got **932 serving, 0 failures**.
Nothing is 404ing, nothing is dangling, no text is missing.

The lines were silent because of a **pairing rule**.

When a turn's Italian side has been cut into per-sentence clips, the app takes its sentence count
from the Italian side. It will only use the English per-sentence clips if there are **exactly as
many of them**. One short, and it doesn't use *some* of them — it throws away the whole English
array for that turn and gives every sentence `knownAudioId: null`. There is no fall-back to the
whole-turn English clip on that path; the app has already committed to the split.

Both places the learner can meet a pod then drop that beat **silently and deliberately** — the
overlay just doesn't queue it, the main-flow scheduler just skips the trans play. No error, no
warning, no gap you could see. Only your ear was ever going to catch this.

The English **text** still appears on the card. That is exactly what you described: lines you could
see, that made no sound.

## How they got that way

Yesterday's known-side splice pass refused 12 Italian rows on its audio gates — the whole-turn
English takes have no clean interior silence to cut at, so refusing was the *right* call. The pass's
premise was that a refused row simply falls back to its whole-turn clip and still plays.

**It doesn't, whenever the target side is already split.** That premise is the whole bug. It held
for rows nobody had split; it was false for exactly the rows the pass was working on.

## Why the fix was free

The pass looked for a reusable existing clip **scoped to the course**. But the known-side narration
is one pooled corpus — the Pod 1 scenario is the same in every course, and clips are matched to rows
by *text*, not owned by anyone. 39 of Italian's 41 refused sentences already existed, in the right
voice, filed under another course's code. Course-scoping the lookup is the only reason they were
invisible.

So the fix is a link update. No TTS, no rendering, no S3 write, **£0**.

Every pick was proved before it was written, not assumed: exact stored text (the clip's text is what
the card displays, so a lower-cased variant would be a visible regression), the same language as the
row's *own* known clip — read from the clip, never guessed from the course code, because
`cat_for_spa` has a Spanish known side — the same voice, and a live HTTP fetch returning real bytes.
All-or-nothing per row, because a short array is no win at all.

## Where it stands

| | before | after |
|---|---|---|
| Italian Pod 1 | 41 silent | **6** |
| All live pods | 1,479 silent, 495 rows, 39 pods | **178 silent, 63 rows, 33 pods** |

432 rows written. Every one filled a NULL — **nothing existing was overwritten**. `sentence_audio_ids`,
the split-unit progress key, was not touched, so no learner progress migration is in play.

## What's left, and the one thing that needs you

**178 units can't be pooled**, for two honest reasons:

1. **Course-specific lines.** Italian's last two are *"I'm learning Italian."* and *"You speak very
   good Italian."* — no other course's pod ever said them, so there is nothing to borrow.
2. **The `_for_jpn` / `_for_spa` pods** (Japanese- and Spanish-known). Their known side has few
   sibling courses to pool from, so almost nothing was recoverable there: `ita_for_jpn` 11,
   `spa_for_jpn` 9, `fra_for_jpn` 8, `eus_for_spa` 8, `deu_for_jpn` 5.

These need **new TTS** — short lines, pennies — which is a spend, so it's stopped here rather than
run. **Say the word and I'll render them.** Italian's own two would take Italian Pod 1 to zero.

## The thing worth fixing properly

The splice tool should look for reusable clips **across the pooled corpus, not within one course**,
and it should treat "target split + known refused" as a *failure* rather than an acceptable outcome —
because on that path, refusing to splice means going silent, not falling back. Both are one-line
changes to `splice-known-sentence-clips.cjs`. Worth doing before the next pass, or the next refusal
re-creates this quietly.

---

*Landed on `main`: `9757cb231` (Italian), `31412d18b` (fleet). Per-pod logs in
`docs/pods/*-known-repoint-2026-08-25-applied-log.json`; tools in `tools/pods/`.*
