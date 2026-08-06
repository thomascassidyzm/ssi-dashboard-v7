# French seed-1: the listening page, and a probe that did not find your defect

**2026-08-06 · measurement + a listening harness · no TTS, no regeneration, no relinking, nothing written to any course table**

## The page

**https://watson-1.tail4968cb.ts.net:8446**

Opens on your phone, no login. Every live seed-1 clip in `fra_for_eng`, one per row,
with a play button and both the English and the French of the row so you know what you
should be hearing. Mark each one **good** or **cut**; marks save to the server as you
tap and survive a refresh, a reboot and a service restart. There's a running count and
an "unmarked" filter so you can stop and resume.

Most-suspicious-by-measurement come first, but **all of them are listed** so you can
disconfirm the ranking — which, given what's below, is the point.

**It is 81 clips, not 65.** While this was being built, a components campaign linked
four new LEGOs ("I", "want", "with", "you") into seed 1 — sixteen more clips, two of
them minted at 18:01 today. The page now re-reads the clip list on every request, so
if that campaign links more while you're listening, a refresh picks them up.

---

## What the probe found: nothing that matches your defect

Your model is right about the census being blind. It looked for clips that *stop
abruptly with energy still in them*, which cannot see a clip of correct length whose
final speech was replaced by silence. So I built a probe that never asks where the file
ends, and instead measures the trailing silent region itself: how long it is, how quiet
its floor is **compared to that same clip's own internal pauses**, and how abruptly it
begins.

Across all 81 clips, **no clip shows a silence-substitution signature.** The single
most direct test:

> A clip silenced mid-word stops while the voice is still near full energy.
> A clip that ended naturally trails off first.

| how loud the clip still was when it went silent (dB below its own peak) | |
|---|---|
| loudest such clip in the set | **−13.1 dB** |
| median | **−35.3 dB** |
| clips still at near-full voice (louder than −12 dB) when they stopped | **0 of 81** |
| clips both near-full-voice AND stepping down within one frame | **0 of 81** |

Every one of the 81 has already decayed 13 dB or more below its own peak before the
silence starts. That is what a finished word looks like. None of them has the shape of
a word chopped in half.

**Trailing-silence duration, the whole distribution** — so an outlier is visible as an
outlier rather than as a number I chose:

| | min | p10 | median | p90 | max |
|---|---|---|---|---|---|
| trailing silence (ms) | 38 | 60 | **94** | 127 | 272 |
| as a fraction of the clip | 2.0% | 4.2% | **8.7%** | 17.4% | 39.0% |

There is no gap in that distribution — it's one smooth population, not a clean group
plus a damaged group. The top of the ranking is mostly *short* clips, where a normal
~100 ms pad is naturally a big fraction of a one-word clip. That's an artefact of the
ranking, not evidence.

### Confirmed vs plausible

- **CONFIRMED cut: 0.** Criterion: a clip is confirmed only if speech is measurably
  missing *and* the silence begins while the voice is still at full energy — i.e. two
  independent signals agreeing. Nothing meets it.
- **PLAUSIBLE: 0 on acoustic evidence.** I am not handing you a "plausible" list
  manufactured from the top of a ranking. The ranking orders your listening; it is not
  a claim about any clip.

I also killed the one non-file explanation worth testing — that you hear the cut in the
app from a perfect file, because the player trusts `duration_ms` and stops early. It
doesn't: `duration_ms` is never *shorter* than the file (median 24 ms longer), and on
zero clips does it land before the end of speech.

---

## Calibration: the known positives turned out to be the wrong kind

You'd expect me to check the probe against clips already judged cut. I did — all 107
`deu_for_eng` clips marked `::superseded-regen`, each paired against the replacement
that superseded it. **No metric separated old from new consistently.** Read alone that
looks like a failed probe.

It isn't, and the reason matters, because **it corrects the earlier census**:

| of the 40 pairs where the old clip genuinely has less speech | |
|---|---|
| the old **file is also shorter** — classic truncation | **37** |
| file length unchanged, speech missing — *your* defect | **3** |

The earlier census reported these clips "measure indistinguishably from their
replacements". They don't. Under a measure of *how much speech is in them* they are
plainly different — 670 ms of audio against a 1224 ms replacement, five voiced
syllables missing. Those clips were **genuinely truncated, as shorter files**. That was
a real defect and replacing them was right.

But it means they are **not examples of the defect you're describing**, so they cannot
calibrate a detector for it. I have **no confirmed positive example of
silence-substitution to calibrate against** — that is an explicit gap, not a clean bill
of health. A probe that has never been shown a true positive cannot be trusted to
report zero.

**This is why the page matters more than the probe.** When you mark clips *cut*, those
become the first real calibration set this defect has ever had, and the probe can be
re-run against them to find out which measurement — if any — sees what your ear sees.

---

## Gaps, stated plainly

- **No confirmed positive to calibrate on.** Above. The zero is only as good as a probe
  no one has validated.
- **`word_boundaries` is empty on all 81 clips.** With it this question is decidable
  outright — the array records what the synthesiser actually spoke and when, so a final
  word whose interval is silent is *proof*. Without it every number here is acoustic
  inference. Nothing in seed 1 has it.
- **Nuclei counting is approximate.** It merges diphthongs and splits some fricatives.
  It's used as a weak corroborator, never on its own.
- **The estate moved under the measurement.** 65 → 81 clips in about an hour. These
  numbers are a snapshot of 18:06 today.

## What I did not do

No TTS, no regeneration, no relinking, no content edits. The page is read-only on
course data; the only thing it writes is your marks. Any repair is a separate decision
and needs your ear first.

---

*Probe and page: `tools/seed1-listen/` on branch `fix/fra-seed1-listen-page-2026-08-06`.
Re-run the measurement with `node tools/seed1-listen/probe/run.cjs`; it writes straight
to where the page reads its ranking, so a refresh re-orders the list.*
