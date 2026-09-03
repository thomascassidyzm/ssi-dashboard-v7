# Making a Cartesia clone from the Voice Lab

**It works, and it is live now.** Popty → Admin → Configs → **Voice Lab**. The pink
button at the top of the Languages tab says *"+ Make a new voice — clone one with
Cartesia"*. That is the whole feature.

## What you do

1. **Press the pink button.** It is the first thing under the heading, above every
   language — not buried at the bottom any more.
2. **Give it a sample.** Two ways, side by side: **Upload a file**, or **Record it
   here** — the browser records straight into the page, you play the take back, and
   you can redo it before anything is uploaded. Ten seconds is the floor, up to sixty
   is better, clean and without pauses.
3. **Name it**, set the language and, if you know it, the gender.
4. **Create the clone.** Cartesia returns a voice in a few seconds.
5. **Hear it.** A "hear it" press appears under the result and speaks up to three
   short clips in the new voice. Cloning itself renders nothing; this is the only
   part that touches money, and it is counted against the lab's daily character
   ceiling exactly like a run.
6. **Cast it.** The voice is registered the moment it is created, so it is in the
   language table below and in the lab's Play menu without a refresh or a restart.

These are Cartesia's **instant** clones. The fine-tuned professional product is a
separate thing their clone endpoint cannot reach, so there is no way to spend on it
by accident.

Cartesia cannot clone a language it does not support — Welsh, Breton and Cornish are
refused with a message rather than a failure.

## What was wrong, and what I fixed today

The feature shipped on 28 August and was made usable on 30 August. Two faults
remained, both found by actually cloning a voice through the live page rather than
reading the code:

**A voice deleted at Cartesia went on being offered.** The lab reads Cartesia's voice
list once and remembers it for as long as the server is up. A clone created and then
removed at Cartesia was still sitting in English's castable list an hour later. Cast
it and the render fails — a dead voice wearing a green tick. The list now refreshes
every five minutes, so a vanished voice can haunt the menu for minutes, not days.

**A new clone appeared twice in its own language.** Once from its own registration and
once from Cartesia's list, same voice, same id, the second one labelled as if it were
not registered. Two rows for one voice reads as a choice between two voices. One row
now, the registered one, carrying its gender and its pace.

## How I know it works

I cloned a voice through the deployed route, watched it land in English's candidate
list as a single castable row, auditioned it — 3.5 seconds of real speech came back —
then deleted it from Cartesia and from the estate's voice table. The estate is exactly
as I found it: the same two Cartesia rows as before, and nothing left on the vendor
account. I also cleared a dead test voice the previous run left behind.

The page itself is the proof and it is one tap away: **popty.app → Admin → Configs →
Voice Lab**.

## One thing that still needs you

**There is no way to un-make a clone from the page.** If you clone something you did
not mean to, the voice stays in the estate's list until somebody removes it by hand at
the database. A small "remove this voice" control on the lab would close it. Say the
word and it is half an hour's work — I have not built it, because you asked for
creating clones, not managing them.
