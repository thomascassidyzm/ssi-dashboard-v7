# Old German clips on dev, 19:28 — what you heard and why

**Short version:** the clips were old because they *are* old. Nothing cached them, nothing
failed to deploy. The database was pointing at January and February takes, and the repair
campaign had never covered the ground you were walking on.

I found 61 slots across deu_for_eng still pointing at audio literally marked
`::superseded-regen` — takes that had already been replaced, with verified replacements sitting
generated and unlinked. **All 61 are relinked now.** One of them is the phrase on your screen.

---

## 1. Which clips you heard

You were on **seed 3, LEGO 1**, not seed 1.

| Phrase on screen | Slot | Clip you heard | Made |
|---|---|---|---|
| "As often as possible" | `S0003L01B01` | `414ebf08` / `6eb603fc` | **17 Jan 2026** |
| "I want to speak as often as possible" | `S0003L01B02` | `cd79acc3` (voice 1) | **29 Jan 2026** |
| | | `a303028e` (voice 2) | 5 Aug 2026 |
| "I want to learn as often as possible" | `S0003L01U01` | `37adbbb4` / `eadecab1` | **24 Feb 2026** |

Six of the seven clips behind those three phrases were six months old. Note `S0003L01B02`:
voice 1 January, voice 2 August. You heard the old one and the new one back to back in the
same phrase.

### Hear it for yourself

Two of the slots I fixed tonight, in seeds 2 and 5. Same defect as "As often as possible" —
superseded take still linked, verified replacement sitting unlinked. Old first, then what plays
now.

**"mit jemand anderem" — the superseded take you would have heard:**

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/1FEFB33B-1A98-4DE5-B582-B6582426BF84.mp3

**"mit jemand anderem" — the 6 August take, live now:**

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/2AB126D5-4330-4019-8C54-650FA5FDABB1.mp3

**"ich versuche zu" — the superseded take:**

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/27564534-1DF0-4261-BB3E-8B66A8D6914B.mp3

**"ich versuche zu" — the 6 August take, live now:**

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/7FB75C9F-5E28-44CE-B701-0A3663D6EBA5.mp3

The clip behind "As often as possible" itself is on a non-public bucket path, so I cannot give
you a player for it — but it is the same swap, and the new take is live.

---

## 2. Why they were old

**The promotion hand-off — not this time.** I checked the 272-clip propose batch against the
270-clip accept batch. 154 accepted, 116 aborted on drift. The 116 aborts are the guard working
correctly, not a failure: all 116 are now at revision 2 on repair-candidate keys, because a
concurrent run had already promoted them. Nothing was silently dropped there.

**A cache on dev — no.** The learner path resolves the S3 key from the database on every request
and hands back a freshly signed URL. There is no long-lived URL that can outlive a link change.
Your fresh install would not have helped and did not hurt.

**The actual mechanism — the repair never covered these slots.** Two things, both real:

- **The one that had a fix waiting.** 61 slots across the course were still linked to rows whose
  text ends `::superseded-regen`. Their replacements had been generated today, verified, and
  never linked. Commit `98b45908` fixed exactly this defect **for seed 1 only** and it was never
  swept any further, so seeds 2 upwards kept serving the superseded takes. "As often as possible"
  was one of them. **Fixed — all 61 relinked, residue re-checked at zero.**
- **The one that has no fix waiting.** The other two phrases were never queued, never proposed,
  never accepted. They were not missed — they were never in scope. The repair campaign is
  detector-driven: it fixes clips a tail-shape or word-loss check flags. It has touched
  **1,131 of 47,374 deu clips — 2.4%**. Walking the course linearly, you hit the other 97.6%.

---

## 3. Will they be new, and when

**Nothing is currently scheduled to fix them.** That is the honest answer.

The seed1-regen job for deu and fra is **not running** — I checked the jobs API, the process
table and the working tree. The branch is all that is left of it. No worker is generating deu
audio tonight.

So:

- The **61 superseded slots** are fixed now, live, no deploy needed — the app reads the database
  directly. Reload and "As often as possible" is the new take.
- **"I want to speak / learn as often as possible"** are still the old takes. There is no newer
  take in existence for them, so I could not relink and I did not generate — that costs money
  and needs your say-so.
- The remaining **97.6% of deu clips** have never been through repair at all.

There are also **13 candidates in deu that Kai rendered today and never accepted** — seed-1
clips for "I want", "to speak", "German". They cost money, they passed verification, and they
are not live because only a human can accept them. They are waiting for a listen.

---

## 4. The hand-off fix

The propose→accept gap was silent: nothing counted the candidates rendered and never decided on,
so a half-finished repair read like a finished one in every log. There is now a `pending` verb
that lists them and **exits non-zero** when any exist; `queue` and `propose` print the count
first so nobody starts new work on top of a stalled hand-off; and `propose --spend` exits 3 when
it actually proposed something, because a propose leaves work undone by design.

The human gate is untouched. `accept` still demands `--i-have-listened`.

---

## What needs you

**One decision: the 97.6%.** Repair has been detector-driven and it is not converging on the
thing you actually experience, which is walking the course from seed 1. The alternative is
coverage-driven: sweep seeds 1–20 clip by clip, oldest first, regardless of whether a detector
flagged them.

**My recommendation: coverage.** It costs money, so it is yours to call — but it is the only
approach where "the start of the course is clean" becomes a true statement rather than a hope.
Say the word and I will bring you a costed plan for seeds 1–20 before anything renders.

*Rollback for tonight's 61 relinks is in the applied log, one guarded UPDATE per slot.*
