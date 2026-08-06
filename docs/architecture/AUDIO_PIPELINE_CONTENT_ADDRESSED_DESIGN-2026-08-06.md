# The audio pipeline, designed from scratch

**2026-08-06. Design only — nothing built, nothing changed.**

> **A clip is named after its own sound. The same sound always gets the same name, and a different
> sound can never wear an old name — so a fix you have made is a fix you will hear.**

That one sentence is the whole system. Everything below is what it forces.

---

## Why the German bug would not die

Two days, four fixes, all of them real, none of them audible. The reason is one line long: **an audio
clip in this estate has a name that does not depend on what it sounds like.** New bytes can be
written behind an old name, and every phone, browser and CDN holding the old bytes has no way to
find out. We are even telling them not to look — every audio object goes to S3 with
`public, max-age=31536000, immutable` (`services/shared/audio-cache-control.cjs`), a promise that
the file will never change, made about a file the system permits anyone to change. On 3 August, ten
of the clips Tom played had had their bytes rewritten 160 days after their row was written. Nothing
in the database can even see that happen, because the row did not change.

Name the clip after its sound and that entire class of bug stops being forbidden and starts being
**impossible to express**.

---

## The pipeline, end to end

Eight steps. Each one is only allowed to hand its work to the next.

**1 · Ask.** One queue is the only way a clip is ever born — new text, a voice change, or a gate
failure. Three doors, one corridor. The existing `audio_pass_requests` queue is that corridor; the
work is closing the side doors (today 35 files can write clips directly).

**2 · Choose the voice.** Each course side has exactly one voice, declared on the course, and the
renderer cannot be handed another. Today `deu_for_eng` has **ten** different voice ids on its German
side and the English voice `eve` appears on German rows; 200 course-sides across the estate carry
more than two voices. That is drift, not choice.

**3 · Render.** TTS produces the raw take. This is the only step that costs money and it stays
behind Tom's approval, exactly as now.

**4 · Master.** Normalise to the estate's level. Do it *before* judging, so what gets judged is what
a learner would hear.

**5 · Listen — and this is the new part.** Three cheap measurements on the mastered bytes:

| | question | catches |
|---|---|---|
| **Size it** | how fast would this voice have to talk to fit those syllables in? | the 1.0-second take of a phrase that needs 1.4 |
| **Read the ending** | did the voice stop, or was it cut? | mid-word chops |
| **Read the words** | are the right words in there? (whisper, as today) | wrong words, silence, gross truncation |

Whisper alone passed *both* takes of "as often as possible" with zero errors. Sizing it against the
voice's own speaking rate separates them at a glance. **Tom's ear was the only instrument in the
system that could hear this; these three measurements are its replacement.** They are already
written — `services/audio-intelligence/` in this working tree — and unfinished.

**6 · Admit to the store.** A clip that passes gets hashed and stored under its hash. A clip that
fails is never stored and never named, so it cannot be linked by accident later. Identical audio
lands on the identical address, so the 81,686 files already shared between courses stay shared —
for free, by identity, rather than by luck.

**7 · Link, and prove it.** The course row is repointed at the new address, then the app is asked
for that slot and the bytes it hands back are compared against the bytes we meant. **Verified at
generation time, on served bytes** — not discovered stale two days later by a man in headphones.
Make-before-break (`AUDIO_PIPELINE_ARCHITECTURE.md` §6b) survives intact and gets easier: its fourth
step, deleting the old clip, becomes optional. The old object is still valid, still addressable, and
harms nobody.

**8 · Serve.** Nothing to invalidate, ever. `immutable` becomes an honest header. No revision
counter, no cache-busting suffix, no `audio_stamp` bump needed for the bytes to be right — an
address that can only ever mean one thing cannot go stale. Offline bundles become a plain list of
permanent addresses: a downloaded bundle is never *wrong*, only ever *short of a newer list*.

---

## Better × simpler × cheaper — honestly

**Better.** A whole class of bug becomes inexpressible. Not "less likely with more discipline" —
gone. Four fixes that landed correctly and were inaudible could not have happened.

**Simpler.** Delete the machinery invented to work around mutable names: the revision counter, the
`.v2` suffix, the two cache layers keyed differently, and the standing worry about which fix needs
which stamp bumped. Sharing stops needing a strategy.

**Cheaper.** No re-download of unchanged audio, no cache-busting churn, no TTS spent regenerating
clips that were already good — tonight's real fix cost nothing to render, because the good audio
already existed and only the link was missing. Storage grows, and only there: we keep old objects
instead of overwriting them. On today's estate that is roughly a percent-scale addition, and it buys
back the ability to never fear a swap.

**The leg I will not oversell:** the migration is real work, and until a course is fully through it
both models are live at once. That cost is in the appendix, stated plainly, including what happens
if it stalls half-done.

---

## What stays Tom's

Spend. TTS generation stays approval-gated and passes still end by queueing a request. Nothing here
changes who says go.

## Three things I would like a word on

1. **Keep the per-course row?** Today every course has its own row pointing at a shared file. I say
   **keep it** — it is the link layer, it is what the serve path already reads, and the census
   proved there is no central table to lose. *Yes/no.*
2. **Recorded pod audio — in or out?** The gates are designed for TTS. Human recordings have real
   pauses and breaths and would flag. I say **out for now**, stated openly rather than silently.
   *Agree?*
3. **Delete anything?** I propose **no deletions at all** in this design. The 107 superseded German
   rows and their files stay exactly where they are. Garbage collection is mentioned once in the
   appendix as a future, gated option and nothing more.

*Migration path, per-piece adopt-or-replace of the existing tooling, gate settings and the live
numbers behind every claim here: the companion appendix.*
