# The loudness matching is now part of the chain, not a pass someone has to run

**2026-08-24.** Your ruling: leave every existing clip alone, no combined re-render, no rollback
needed — and no timbre lift, ever, anywhere. What you asked for instead is that every future render
comes out loudness-consistent by itself. That is done and it is on `main`.

**Nothing existing was touched.** No clip re-rendered, no course re-mastered, no link changed, no
TTS generated, nothing spent. This changes only what happens to audio rendered from here on.

---

## What was actually wrong — and it was bigger than Enzo

The closed-loop fix from this morning was real, but it only ever ran in one place: `masterAudio`,
the entry point for course and pod TTS clips. **Four other paths were still making learner-facing
audio their own way**, each with its own idea of what "levelled" means:

| path | what it did | why that lands somewhere else |
|---|---|---|
| **Recordist takes** — every human recording | one `loudnorm` inside the filter chain | single-pass loudnorm is a *dynamic* normaliser working from a forward guess: a couple of dB out on a short take, and it moves the level around inside the take |
| **Welcome clips** | the OLD open-loop chain | still had the **compressor you ruled out on 2026-07-29** ("that hissy mastering stuff"), and aimed 1 dB hot on purpose |
| **Encouragements** | the same old chain | same |
| **Presentations** (multi-segment) | `loudnorm` per segment, then another open-loop pass | segments could step in level at every join |
| **Spliced pod/phrase clips** | the old open-loop chain | a splice sat at a different level from the un-spliced clips around it |

So a human take, a "well done", and the course clip between them were levelled by three different
processes to two different targets, one of them through a compressor that is not supposed to exist
any more. **The defect was never one path being wrong. It was paths disagreeing** — which is exactly
the shape of the thing you heard.

All five now make the same call: `masterToHouseLoudness`. One loop, one target, one tolerance,
written down once instead of restated per path.

---

## The technique, and what it deliberately is not

**Measure, correct, measure again — to −16 LUFS integrated, EBU R128, ±0.5 dB.** That is the
broadcast-standard loudness measure, and −16 LUFS is the number this estate has always used.

Each pass re-renders **from the original** with a corrected total gain, so the file that ships has
been through exactly one volume stage, one true-peak limiter and one anti-click fade — the same
chain as before, aimed properly. Up to three passes; it stops early when the limiter proves to be
the floor, and refuses to lift a near-silent file into its own noise.

**Gain only. No compressor, no EQ, no shelf, no tilt — nowhere in the chain, permanently.** Your
ruling on the >500 Hz lift is written into the code as a comment and into the tests as an assertion
that fails the moment anyone adds one.

---

## The proof

Measured on synthetic peaky, bass-heavy sources — the Enzo shape — through the real chain and the
real MP3 encoder. **No TTS was generated: zero spend.**

**Level:**

| | in | out | |
|---|---|---|---|
| old single pass | −30.7 LUFS | **−17.7** | 1.7 dB short of target, and invisible to every gate |
| the closed loop | −30.7 LUFS | **−16.2** | on target in 2 passes |

**Tone — the half that matters most, given your ruling.** Measuring the level below 500 Hz minus the
level above it, which is precisely the axis a spectral lift would move:

| | source | old chain | new chain |
|---|---|---|---|
| tone | 9.7 | 10.2 | **10.2** |

**Identical to the old chain's.** The 0.5 dB between source and output is the true-peak limiter,
which is unchanged and was always there; closing the loudness loop adds nothing of its own.

And on two deliberately different "voices" — one bass-heavy, one bright, 12 dB apart:

- both land on target, within 0.2 dB of each other;
- each keeps its own low/high balance to within 0.1 dB;
- **the tonal distance between them is unchanged** — 9.1 dB before, 9.0 dB after. Matching loudness
  does not drag two voices' tone toward each other. That is a test, so it stays true.

**8 new tests**, plus the recordist path proved end to end through the real `lame` binary: a take
recorded 18 dB quiet and one recorded loud both come out on target, and the take is still encoded
exactly once at the same 128k/44.1k mono it always was.

Full suite: **331 tests green** across the audio and voice-engine services; the only failures on this
box are 11 pre-existing ones in unrelated files (deploy-repair, clip-identity), identical before and
after this change.

---

## What this does not fix, stated plainly

The phone-speaker gap. Enzo will still be around 2 dB quieter than Ara **on a phone** once every clip
sits exactly on target, because that remaining gap is spectral and no gain stage can close it. Closing
it would need the timbre lift, and you have ruled that out permanently — so this is where it rests,
by decision, not by oversight.

---

## Where it is

Landed on `main` as `436f26c0c`. **Not deployed**: the production checkout is still on an older
commit, so the running services keep the old behaviour until someone presses Deploy. Nothing about
this needs to go out urgently — it changes future renders, and there is no render in flight.

One thing I noticed and did not change, because it predates all of this and touching it could refuse
a legitimately quiet render: the 20 dB "don't lift a near-silent file into noise" ceiling is applied
to *corrections* but not to the very first gain, so a file arriving 30 dB quiet still gets a 30 dB
first pass. It has never bitten — real TTS never arrives that quiet — but it is not what the comment
next to it says. Say the word and I will make it match.
