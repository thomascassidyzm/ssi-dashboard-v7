# Voice Lab — Play mode

**2026-08-07 · shipped to `main` (`b7046dc0`) and live on watson-1**
**Open it: <https://popty.app/admin/configs/voice>**

Your ruling last night: *"looks fantastic but a few levels too deep in granularity… I'm going
to want to actually USE it without spending a week working out what these things mean. A
slightly simpler interface, more obvious — with trial and error sliders showing us what we can
play with."*

The lab now opens on **Play**. Everything from last night is behind an **Engineering** toggle,
whole and unchanged — the depth stopped being the entrance, which is not the same as stopping
existing.

---

## What Play mode is

A voice (your clone first), a language, a sentence you type or pull out of a real course,
**three sliders**, **one Generate**, and **one line** of verdict with the detail on tap.

Provider is not a picker any more. A voice belongs to a provider, so picking your clone picks
xAI. One decision instead of two that could contradict each other.

## Why three sliders and not five

Every slider here moves something you can **hear**. That is the whole selection rule, and it is
why there are three rather than a tidier five — the estate does not currently have five audible
knobs, and inventing two would be worse than showing three.

| Slider | Ear-words | What it really moves | Live on |
|---|---|---|---|
| **Pace** | slower ↔ faster | provider `speed` (SSML `<prosody rate>`) | Azure. **Disabled on xAI, and says why** |
| **Loudness** | quieter ↔ louder | `masterLufs` — the level the clip is mastered to | both |
| **Detail** | leaner ↔ richer | sample rate + bit rate, as one control | xAI. Disabled on Azure, whose format is pinned |

Each slider shows the ear-word big and the real number small — "house level · −16 LUFS" — so
the thing you'd put in a report is always visible without being the thing you have to read.

Every position of every slider is inside a range that renders and passes the gates. You cannot
drag yourself into a refusal by accident.

## One thing I had to change underneath, and why

**The loudness slider had to reach the audio.** `masterAudio` hardcoded −16.0 LUFS, so a
"quieter ↔ louder" control could only have moved the *gate's band* — which changes a verdict and
not one byte of what you hear. That is exactly the dead-control failure this lab was built to
avoid, so:

- `masterAudio` now takes an optional `targetLufs`, **defaulted to −16.0** — every existing
  caller in the course pipeline masters byte-identically to before;
- a lab config carries `masterLufs` as a **render** field, kept deliberately separate from the
  loudness gate's band. The band says what the store would admit; this says what comes out of
  the speaker;
- if a config ever does master outside the band, the run's caveats say so up front rather than
  leaving the verdict looking like a mystery.

**The honest limit:** the swing is **2 dB** (−17 to −15), not more. The gate's band is
−15.5 ±1.5 dB and the house mastering level is −16.0, so the widest *symmetric* swing around
house that still passes the loudness gate is ±1 dB. That is the band's arithmetic, not caution
— if you want a wider slider, the thing to rule on is the band, not the slider. The screen says
this in one line under the control.

## Compare two settings

One button. It opens a second row on each live slider, renders both, and lays them out **blind**
— left and right, in an order the server chose per experiment, so position cannot leak the
answer. "Reveal which is which" then tells you, in ear-words, exactly what differed
("Loudness — A was house level, B was quieter"). If both sides are identical it says so, because
that comparison measures nothing.

## The verdict, in one line

Admitted or quarantined, and if quarantined, which gate — in the words of what the gate is
actually asking ("the level", "it says the right words"), not fifteen numbers. The per-gate
detail is one tap away under "what each gate said".

## Spend guards

Unchanged. The backend estimates before the button arms, the daily character ceiling refuses
rather than quietly costing money, and the cost sits next to the button before you press it.
Nothing here writes to `course_audio`.

---

## How it was verified

Not with a mock — a mocked Play mode has not been verified at all, because the two things most
likely to be wrong (does the config the sliders build survive `normaliseConfig`, and does a clip
come back playable) only exist on the real path.

`e2e/voice-lab/play-mode.spec.js` drives a real browser end to end: logs in, opens the lab,
asserts Play is the landing layer with exactly three sliders and no gate thresholds in sight,
asserts Pace is disabled *with its reason* on your clone, **renders a real German clip with the
loudness slider moved off centre**, and checks the one-line verdict and the blind compare.

- 7 browser specs green against the local stack, then **all 7 green again against the deployed
  popty.app talking to the live watson-1 backend**
- 46 unit tests green (`services/voicelab/lab.test.js`, `thresholds.test.js`), including new
  ones asserting the mastering level and the gate band stay two different numbers
- the live runs, read back off watson-1's own experiment records: a single at
  `masterLufs -15.5` (slider moved off centre) → **admitted**; the compare at `-16` vs `-17`
  → two genuinely different mastering levels, both **admitted**

## Two things worth knowing

**1 · That `-122` error was the box, not the lab.** Your own A/B at 00:59 failed both clips with
`Unknown system error -122 … write` — the disk quota on watson-1, exhausted at the time. It has
since cleared. If you see it again, it is the box.

**2 · A fragility I found while verifying, which is worth a decision at some point.**
`popty.app` is a public origin and watson-1's tailnet address (100.108.9.37) is inside the CGNAT
range browsers class as *private*. Chromium blocks public→private subresource fetches, so in a
strict Chromium the lab's calls fail with a bare "Failed to fetch" while a direct navigation to
the very same URL returns fine — I proved it both ways. It is **not** CORS (watson-1 answers the
preflight correctly) and not the lab. It evidently does not bite your browser — your runs
tonight landed on watson-1 — but it is a real trapdoor under every popty.app→watson-1 screen, not
just this one, and the day a browser update turns enforcement on it will look like the backend
died. Worth putting the backend behind a public name rather than a tailnet address before that
happens. No action taken; flagging it.
