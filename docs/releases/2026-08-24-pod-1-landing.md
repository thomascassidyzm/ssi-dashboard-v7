# Popty release — 2026-08-24 — Pod 1 landing day

`main` tip: `47906f3e7549ab868115e48becbe787c85f4e26f` (2026-08-24 18:32 UTC). ~96 commits stamped
today, almost all pods/audio work.

This was a Pod 1 hardening and go-live day: the fade schedule that paces a listening pod as you get
familiar with it went live for real, explainers came out of the pod path end to end on Tom's
deprecation ruling, loudness measurement and correction was unified onto one house target across
every render path, a defect that let a wrong voice inherit a slot's audio was fixed at its root
cause, and the fleet-wide pod script viewer — the tool Tom tested and confirmed "works perfectly" —
landed. Pod 1 itself was independently audited and confirmed live, fully audio-complete, in all 22
courses (switchovers happened over the preceding days, not today — today's work was the audit and
the fixes around it): [Pod 1 live-state audit](https://watson-1.tail4968cb.ts.net/d/f064dc49).

## What shipped

**Fade schedule — live, on production, immediately**
- `algorithm_config` flipped to Tom's ladder: a pod's known-language support drops away and the
  target speeds up over repeated hearings, ending on bare target audio at 2× for good. Launched on
  a hard cut (no gap between clips). A master switch in Listening Config makes this reversible
  without an agent. (`131eeb0b1`, `c7e2ec874`, `4d022bfed`, `47906f3e7`)

**Explainers — removed, on Tom's deprecation ruling**
- Cut from the pod script viewer, the dashboard surfaces, the cast gate, pod-state-report,
  pod-voice-coverage, the fidelity gate, split-audio inheritance repair, and the
  generator/composite/batch endpoints and voice engine. (`b99b1147b`, `e909a66f6`, `b5c60759f`,
  `5221a2c0c`, `709948657` and siblings)

**Loudness — one house target, closed loop, on every render path**
- All four render paths that had been levelling audio their own way (human takes, welcome/
  encouragement, presentations, spliced pod/phrase clips) now converge on one measured target,
  gain-only, no EQ/compressor/tilt. Applies to renders going forward, not a retroactive change to
  already-served clips. Measurement now runs per voice on the actual served bytes, which is what
  surfaced the "Enzo effect" (one voice measurably quieter than others) as estate-wide, not a single
  course's problem. (`fa2041d17`, `f59c1ad5c`, `436f26c0c`, `0da85ce94`, `3e7f9e20c`, `1e193c99c`)

**Split audio no longer inherits the wrong slot's clips**
- Root cause fixed of the ita_for_eng two-female-voices defect: a pod-clone-then-align step could
  leave a slot's split-sentence audio pointing at a retired conversation's clips. New
  `carrySplitAudio()` rule (only carry a slot's split audio when the text it was rendered against is
  byte-identical; NULL otherwise) is now enforced in the clone/align tools and in a new switchover
  promotion gate. (`11dbae49f`)

**Text-follows-row rule, and the CJK pause-cue gap**
- Codified: a row's spliced audio follows its own text, never its slot. Fixed the sentence-split
  regex used when generating pod audio so CJK terminal punctuation (。！？) gets the same pause cue
  Latin punctuation does — the splicer needs that cue to find sentence boundaries. Future renders
  only; no audio touched today. (`11dbae49f`, `72b3a9e45`)

**Pod script viewer — fleet-wide, read-only** (the tool Tom tested: "it works perfectly")
- Every course's Pod 1 script, browsable read-only, with continuous play and a now-playing line; the
  play queue treats a dead clip reference as a skip, never a stall. (`f3b805c44`, `4513f721d`,
  `88f5c9f1f`, `037366a75`)

**Pod 1 sentence splicing — 21 courses, 1,337 turns, £0, no TTS**
- Every multi-sentence Pod 1 turn's own whole-turn clip cut at its sentence gaps with ffmpeg, so the
  learner hears the same take they hear today, now addressable per sentence — the infrastructure the
  fade schedule and the script viewer both need. Fixed a fail-open bug in the seam-quality gate along
  the way. Italian was left alone (its rendered clips are already live). 92 turns were spliced clean
  and then deliberately left unlinked: Croatian's Pod 1 uses "…" as a mid-sentence hesitation marker,
  which the splice boundary currently reads as a sentence end — see the Croatian note below.
  (`fa09c066a`)

**Speaker re-attribution — 11 lines, 22 courses**
- 11 lines that only a shop assistant, hotel receptionist or waiter would say had been published as
  the learner's own speech since 2026-08-06, across every course's scenes 16/17/21. Re-attributed to
  the correct speaker (`Staff` / `Interlocutor`) per an audit that had sat unactioned since
  2026-08-08. Text and speaker label only — no audio touched, no clip changed. One line left
  deliberately undecided (the audit calls it genuinely ambiguous). Known follow-on: the new speaker
  names aren't in any course's cast map yet, so the cast gate now correctly reports them uncast —
  casting them is Tom's call, not made here. (`47d32f00a`, `05e411a66`)

**Split-array inheritance repaired fleet-wide**
- The same slot-inheritance defect class as above, swept and confirmed clean across all of Pod 1,
  22/22 courses. (`8d756b48d`)

## Croatian — NOT on this release, flagged for Tom

The Croatian Pod 1 splice work (`df754ad80` "hrv Pod 1 sentence splice — 47/47 turns, 73 clips, 0
refused, £0" and `31e7cfb92` "'…' is hesitation, not a sentence end, for hrv") is genuinely finished
— it is exactly the fix the `92 turns... left unlinked` note above is waiting on — but as of this
release it sits on branch `feat/known-side-sentence-splice` and has **not** been merged to `main`.
It did not ship today. Someone should decide whether to land it.

## What this means for a learner

Listening pods now pace themselves as you get to know a scene — the English support fades and the
pace speeds up over repeat hearings — and a small number of lines that belonged to other characters
in a scene no longer show up as if they were your own words to say.
