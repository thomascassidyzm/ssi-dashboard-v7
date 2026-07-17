# Seam decay — the naturalness dial

*2026-07-16/17. Live founder discussion (Tom + CoS), captured at first articulation —
rough-but-honest, positions preserved where they differ, open questions left open.
Context assumed: `pod-ladder-proposal.md` §9/§9a/§9b (S-LEGO canon),
`chunk-granularity-state-of-play-2026-07-16.md` (the ellipsis ruling and its data),
`real-vs-authored-texture-analysis.md` (what "natural" costs). Item 3 below is
founder-ruled and implemented; everything else is in discussion.*

---

## 1. The idea: the pause is a rendering knob

The pause a learner hears at an S-LEGO seam — the '…' baked into `target_text` — is
not a fixed property of the content. It is a **rendering knob, exactly like speed**.
Today the seam renders at roughly 400ms (xAI native, Azure `<break time="400ms"/>`).
Nothing says it must stay there.

The proposal: the seam pause *decays* as the learner climbs —

> **400ms → 250ms → 100ms → native prosody.**

The crucial framing, Tom's: **the end state is native-sized seams, not no seams.**
Native speakers do pause at intention boundaries — that is why the S-LEGO seam rule
places '…' at finite-clause seams in the first place; the mark sits where a real
speaker's breath sits. So the decay never deletes the seam, it shrinks it until it is
indistinguishable from the prosody a native would produce anyway. The seam was always
real; only its *exaggeration* was pedagogical. Decaying the exaggeration to zero
leaves the truth behind.

This reframes what the 400ms pause *is*. It is not scaffolding bolted onto the
language (which would eventually need removing, with all the cliff-edge worries that
implies) — it is the language itself, slowed down at exactly the joints where slowing
is honest. Same doctrine as the speed ramp in `pod-ladder-proposal.md` §3: content
complexity and delivery pace are separate axes, and pace is set at render time. Seam
size is now a third named axis of the same kind. Call it the **naturalness dial**:
speed and seam size together are how far the render sits from native delivery, and
both dial toward native without the text ever changing.

## 2. The ladder already IS the decay — one ladder, two knobs

The second realisation of the discussion, and the one that stops this becoming a new
feature: **nothing new needs building. The ladder is already the decay mechanism,
twice over.**

- **The speed decay already exists.** The main flow's Stage 1 → Stage 8
  listening-config patterns are a speed ramp: every sentence enters whole and the
  cascade tightens delivery stage by stage. That is the speed knob, shipped.
- **The seam decay already exists — as the fusion rungs.** The ladder's rung
  progression (finest S-LEGO units → pairwise fusion → whole sentence → conjoined
  sentences → whole turn) is seam decay *by structure*: each rung up, a seam that was
  a hard break between separately-rendered takes becomes an internal joint of a
  larger fused take — rendered with whatever prosody the larger unit naturally gives
  it. Climbing a rung doesn't shrink a pause parameter; it *re-renders the seam as
  part of a bigger whole*, which is what native-sized seams actually are.

So: **one ladder, two knobs.** The stages turn the speed knob; the rungs turn the
seam knob. The 400ms→native decay of §1 doesn't need a milliseconds schedule wired
into the player — the rung climb delivers it discretely, and the fused takes deliver
the native prosody for free because a TTS engine (or a human in the booth) rendering
a whole sentence puts a whole sentence's prosody on it, including its natural
intention-boundary breath.

Whether a *continuous* milliseconds dial is ever wanted on top of the discrete rung
decay is left open (it would be cheap — the Azure `<break>` substitution already
parameterises the duration) — but the default position from the discussion is that
the rungs are the decay, and a second, smoother mechanism should not be built until
the rungs are shown to be too coarse.

**Deliberate exception: listening mode stays flat.** The Listening Drill's t-k-t-t
@1x pattern does not participate in the decay — by design. Listening mode is the flat
reference surface: the same pattern at the same rate, every time. The decay is a
main-flow ladder property; the drill is where the learner goes to hear the units
plainly, and plainness there is the feature.

## 3. S-LEGO seams are the definitive breaks (ruled and implemented)

Founder-ruled 2026-07-17, implemented same day (commit `6ea402a7`, merged to main in
`68b12bb4`): **the '…' marks already baked into `target_text` — the S-LEGO canon of
§9a/§9b — are the definitive breaks in the ladder.** Not a hand-drafted fine-unit
map; the canon itself.

What that means in the ladder tool, as built:

- **No sub-S-LEGO cuts, ever.** The fusion ladder's rung 0 is the S-LEGO spans; the
  ladder fuses upward from there and can never go finer. The per-atom / breath-group
  cutting of earlier eras is gone from the ladder's reachable space.
- **Per-sentence rung depth follows seam count.** A sentence's ladder is exactly as
  deep as its seams demand — two seams, three spans, so many rungs; the depth is
  derived, not configured.
- **Zero-seam sentences enter as whole sentences.** A sentence with no internal '…'
  is a single span and rides straight to its whole with no fusion rung of its own. A
  short clean sentence never gets chopped just so the ladder has something to fuse.
- The seam editor demotes to a review surface: canon '…' positions are the default
  truth; `atom_map_fine` is read back only as an override (removed/moved seams,
  budget-capped), never a from-scratch draft.

This ruling is what makes §1 and §2 coherent: because the seams are canon — placed
once, in the text, at honest intention boundaries — the same seam is what the tiles
show, what the TTS pauses at, what the booth is directed to breathe at, and what the
ladder fuses across. One set of joints, every layer agreeing on where they are. The
decay is then well-defined, because there is exactly one thing decaying.

## 4. Open questions — deliberately left open

Discussed, positions noted, **not resolved**. No implementation should assume an
answer to any of these.

### 4a. Behavioural rung-advance

Today a turn advances one rung per visit, fixed. The open question: should the
learner's *behaviour* drive it instead — replaying a line, toggling eyes, or
scrubbing **holds** that turn's rung (the learner is telling us it isn't fused yet),
while a lap that touches nothing **advances** it (silence is the signal of ease)?
The appeal is that the decay then paces itself per-learner per-turn with zero UI —
the controls the learner already touches become the sensor. The hesitation is the
usual adaptive-machinery one: an implicit rule the learner can't see can misread them
(replaying because you *liked* a line would wrongly hold it back), and fixed
one-rung-per-visit is at least legible. Unresolved.

### 4b. Fusion mode: pairwise vs chained overlap

The one place the founders' positions genuinely differ, and both are live in the
ladder tool as a toggle:

- **Pairwise (Aran):** disjoint pairs, left to right — spans fuse two-at-a-time, an
  odd tail stands alone until the next rung. Clean, each rung halves the span count,
  every take at a rung is new material.
- **Chained overlap (Tom):** adjacent windows share an edge chunk — each fused take
  overlaps its neighbour by one span, so every seam is heard *inside* a fusion from
  both sides on the way up. Costs more takes per rung; buys the overlap-as-teaching
  mechanism (the same instinct as A-LEGO-inside-M-LEGO in the speaking course:
  overlap IS the teaching mechanism).

Not resolved. The tool defaults to pairwise; the toggle exists precisely so both can
be heard side by side before anyone rules.

### 4c. Ceiling vs meaning

The §9a syllable ceiling forces a '…' into any piece over C (8 pod-0, 12 pod-1+) —
and when a long clause has **no natural seam** under the ceiling, the current rule
takes one forced mid-clause cut at the best prosodic point, flagged for human ear.
The open question is whether that is the right way round: **when the ceiling and the
meaning fight, does the ceiling yield?** The case for yielding: a mid-clause '…' is
the one seam that is *not* honest — no native breathes there, so it can never decay
to native prosody; it is scaffolding of exactly the kind §1 says the seams are not.
The case for holding: an unbroken 15-syllable wall defeats the learner the ceiling
exists to protect, and the data (`chunk-granularity` §3) says such clauses are real —
one 30-syllable clause in pod-1 has no internal boundary at all. Possibilities
floated but not ruled: let the ceiling flex per-case (the flag queue is small), or
let the forced seams exist but decay *first and fastest* since they are the only
dishonest ones. Unresolved — the flagged-forced-split queue should stay a queue until
this is ruled.

---

*Status: discussion capture. §3 is founder-ruled and live; §§1–2 are the agreed
framing awaiting nothing but use; §4 items are open and awaiting rulings. Next
concrete surface where these bite: the pod-lab ladder tool (fusion-mode toggle,
forced-split flags) and any future audio-pass plan for fused takes.*
