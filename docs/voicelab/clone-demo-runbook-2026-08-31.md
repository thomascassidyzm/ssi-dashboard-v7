# The clone demo, with Aran — how to drive it

**2026-08-31.** One page. Read it once before you sit down with him.

---

## Where

**Popty → Admin → Configs → Voice Lab → Languages → "+ Make a new voice"**. It opens on *From a recording we hold*. That is the whole surface; there is nothing else to find.

## Set it up once, before he's watching

Three fields, top to bottom. Thirty seconds.

1. **Every clone says** — the line all the clones will speak. Defaulted to *"This is my own voice, and I have never said this sentence in my life."* Change it to anything you like; the point is that it is the **same** line for every clone, so the only thing that varies is the source.
2. **Whose voice** — type `Aran`. Required once, then every clone inherits it.
3. Language `eng`, press **Find speakers we hold**.

## The demo itself

Tap a speaker, and their recordings list — **longest first**, each with a player.

For each one:

1. **Press play on the original.** "This is you, from the Welsh course welcome, forty-four seconds."
2. **Press "Clone this →"** on that same row.
3. **Press play on the original again while it builds.** This is not filler: a clone takes six to thirteen seconds, and a 44-second welcome covers the whole wait exactly. The row counts the seconds out so nobody thinks it has hung.
4. The clone appears **indented under its own source**, playing the line. Press it.

**Then do it again on a different recording.** The first clone stays exactly where it is. That is the point — after three taps you have three clones under three different originals, all saying the same sentence, and the only thing that changed is which recording it learned from.

A running list of everything made sits at the bottom, with the original and the clone side by side on one line each, so you can go back and forth without scrolling to find them.

## What to clone from, in order

| Speaker | What it is | Why |
|---|---|---|
| `Aran` — 44s welcome | The Welsh course welcome | **The confirmed one.** You identified this as genuinely him on 27 August, and the clone judged good was cut from it. Start here. |
| `human_Aran` — 46s and 43s welcomes | The same script, German and Spanish courses | If these are also him, three near-identical sources should give three near-identical clones — which is itself the point being made. If one sounds like a different person, you have learned something. |
| `human_recording` — 83 clips, 5s to 84s | The English instruction and encouragement set | **Probably not him** — see the caveat below. But it is the best material in the estate for showing how source LENGTH changes the result: a 12-second clip and an 84-second clip, side by side. |

**The length demo is the strongest one you have.** Clone the shortest clip and the longest clip in the same speaker's list, one after the other, and play them back to back. Cartesia's own advice is that ten seconds is the floor and twenty to sixty is where it gets steady, and you will hear it.

## The caveat to say out loud, before he asks

The 52 minutes of English instructions filed under `human_recording` **are probably not Aran**. On 27 August a clone was built from one of those clips and you identified the output as synthetic, not a recording. The estate's `origin='human'` column records an intention, not a fact.

So: the tool never claims who a speaker is. It shows the clip and makes you listen. If, listening today, that corpus turns out to be him after all, say so — it takes the material from 44 seconds to 52 minutes.

## What Aran will see about permission

Every clone is stamped **"awaiting authorisation"**, with his name on it, from the second it exists. It says so on the clone, in the voice list, and beside any slot it is cast into. Nothing infers permission from the fact that a recording exists.

**It does not block anything** — that is deliberate, so you can show him his own voice before there is any authorisation to have. If you cast one, it warns first, names him, and says what is missing.

When he says yes: **consent…** beside the clone, fill in who, how and when. It will not let you record a yes without all three.

## Tidying up

**discard** on any clone deletes it at Cartesia and in the estate's voice list, in one press. Do it for the ones he doesn't want kept. Anything you leave is a real, castable voice.

## What it costs

Cloning is **free** — no speech is rendered. Hearing a clone is one short clip through the ordinary lab path, counted against the daily character ceiling. Three clones and three listens is under 250 characters. You cannot run up a bill from this screen.

## If something goes wrong

- **A clone fails** — that one row goes red with the reason. Every other clone stays exactly where it is. Press dismiss and carry on.
- **It clones but won't speak** — that is the daily character ceiling, not the clone. The clone is real and kept; press **say it again** later.
- **The button is greyed out** — the "Whose voice" field at the top is empty.

---

### Measured, on this box, today

Six real clones. Cartesia takes **6.0s from a 12-second source, 10.4s from 44 seconds, 10.7s from 84 seconds** — it climbs with length and then flattens — plus **~2.3s** to hear it. Three taps end to end took **38.5 seconds** of wall clock. A single chosen clip goes to Cartesia **byte for byte, untouched**: no re-encoding, which is both faster and better, and is exactly what was done to the clone you judged good.
