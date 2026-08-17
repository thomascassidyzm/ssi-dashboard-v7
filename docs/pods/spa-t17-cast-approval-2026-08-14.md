# T-17 landed: the Spanish cast is Manuel and Elvira, on the record

*Live database, 2026-08-14. Every number below was read back off the live DB after the write.*

## What you asked for, and the one thing that was in the way

Your ruling was **xAI Manuel + Azure Elvira** for Iberian Spanish — the mixed cast you picked by ear
off the A/B page.

The live cast said **Alvaro**, not Manuel. The approval record is keyed to a fingerprint of the
casting that is actually stored, so approving what was there would have put your name against the
option you rejected. The recast had to happen first, and it did.

**37 male target seats** across all four `spa_for_eng` pods moved from Azure Alvaro to xAI Manuel.
**All 18 Elvira seats are untouched**, exactly as you ruled — she is not recast. The whole English
side is untouched too; no ruling covers it, so nothing there moved.

| | before | after |
|---|---|---|
| male target seats | Azure Alvaro ×37 | **xAI Manuel `yis75yfp` @ es-ES ×37** |
| female target seats | Azure Elvira ×18 | **Azure Elvira ×18 — unchanged** |
| English (known) side | 6 voices | **unchanged, byte for byte** |
| cast fingerprint | `4959aa03d979cc80` | `29cc217afb5fa101` |

Approval now on record, reading **LIVE** against that fingerprint, for `spa_for_eng` and nothing else:

```
[LIVE ] spa_for_eng
        approved 29cc217afb5fa101 by Tom Cassidy at 2026-08-14T16:20:56Z
        sample: the A/B page you listened to
```

No audio was generated, nothing was deleted, and the existing Alvaro clips are all still there.
Make-before-break: they get replaced by a render, never by deletion in advance of one.

**Why the cast carries the locale and the pool does not.** You listened to Manuel at an explicit
`es-ES`. Voice-pool entries cannot express a locale — none of the 145 entries on the estate has one,
and the casting resolver drops the field — so putting Manuel in the pool would have rendered him at
plain `es`, which is a different handle from the one you heard. The stored cast holds `es-ES`
directly. The cost of that is named at the bottom.

## The render: I did not run it, and this is why

**There is no proofread gate in the renderer.** Not a weak one — none. `target_text_draft` appears
**zero times** in the audio phase the services actually run, and the render queue is built purely on
"this line has no audio yet". The voice approval was the only thing standing in front of the Spanish
pods, and it is not the gate that question needs.

So the moment I recorded your approval, an unscoped bulk render of `spa_for_eng` became able to
generate this:

| pod | target clips | English clips | note |
|---|---:|---:|---|
| `music` | 749 | 373 | proofread, fine |
| `travel-situations` | 72 | 72 | proofread, fine |
| `pod-0-unrecorded` | **112** | 0 | **every one an unproofread A-105 draft** |
| `pod-0` | 0 | 0 | fully rendered already |
| **total** | **933** | **445** | 1,378 clips, ~$1.12 |

Those 112 are exactly the lines you have not ruled on. Nothing in the code would stop them.

**The containment is clean, and it is one flag.** `pod-0-unrecorded`'s entire target gap is drafts —
112 of 112 — and every other pod has zero. So excluding that one pod from the render excludes exactly
the A-105 lines and nothing else:

> render `music` + `travel-situations` only → **1,266 clips, ~$1.06**, zero unproofread lines.

I have not run it. Two reasons. The spend is yours, and the number you were given for "the Spanish
render" was **397 units** — what is actually unblocked is 1,378, across two pods nobody mentioned
(`music` and `travel-situations`, which together are 90% of it). I would rather hand you the real
figure than spend against one that does not reconcile.

## Mexican Spanish: still gated, and the samples are up

`spa_mx_for_eng` is untouched and still refuses every render with `no_approval` — verified directly,
not assumed. Its casting is unchanged.

Your samples are live on the every-language listening page. Mexican Spanish has **four clips**, and
the page is honest that this one is a real fork rather than a default: the official pool is Azure-only
while four xAI voices are already in production on that course.

- *Luciano* — male, Azure — the official pool
- *Carlota* — female, Azure — the official pool
- *rex* — male, xAI — in production now, 83 clips
- *eve* — xAI — in production now, 78 clips

All four return 200 and play. I checked the two Azure clips are genuinely two different voices and
not one voice rendered twice — same byte length, different content.

**One labelling error to know before you listen:** the page tags *eve* as **male**. Eve is the female
candidate — she is cast on every female speaker in the Mexican pods, and she was the female option on
your Iberian A/B page. The clip is the right voice, only the label is wrong. Worth knowing so the
mislabel does not steer your ear.

Two smaller corrections to the framing: the page carries **41 languages**, not 46, and Welsh is
deliberately absent because Aran's and Catrin's recordings are never replaced by synthesis.

## What is now on your plate

1. **The Spanish render — one word.** `music` + `travel-situations` only, 1,266 clips, ~$1.06, no
   unproofread lines. Say go and it runs scoped.
2. **The 112 A-105 lines.** Still yours. They will not render by accident while the scope above holds,
   but nothing in the code enforces that — only the scope on the call does.
3. **Mexican Spanish.** Four clips on the page above, whenever you want to listen. Nothing renders
   until you pick.
4. **The pool still says Alvaro.** I left it. Reordering it cannot encode `es-ES`, so it would record
   a slightly different cast from the one you approved. The live consequence: if anyone re-syncs
   `spa_for_eng` from its markdown, Manuel gets stomped back to Alvaro. The approval would then
   self-invalidate and block the render, which is the gate working correctly — but it is a trap worth
   naming rather than discovering. The real fix is teaching pools to carry a locale, which is a
   one-line change in someone else's file and not mine to make quietly.

## Gaps, stated plainly

- **The proofread gate does not exist in code.** I contained it by scope, not by fixing it. Any
  future unscoped `/generate-pods spa_for_eng` re-opens it.
- I did not verify the *sound* of the recast — no clip has been rendered on Manuel inside the pods
  yet. Your ear approved him on the A/B page; the pods will only prove it out on the first render.
- The 397-vs-1,378 discrepancy is unreconciled. I could not find what scope the 397 referred to.
