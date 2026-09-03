# Canonical run check — the 7/4 split voice rule, ita_for_eng:pod-1 scenes 15-21

*2026-08-25. Dispatched off plate A-248 after Tom rejected the "revert 16.9 to Learner"
proposal as exactly wrong, and flagged the job might not have finished applying the rule.*

**Verdict: the rule holds, fully, across all of scenes 15-21, as currently live. No
violations found. No writes made.**

---

## 1. The rule being checked

Tom, 2026-08-25: *"alternative answers are necessarily the same voice; alternative
questions - additional content should definitely not be ALWAYS the same voice all the way
through."*

Two halves:
- **Alternative-answer groups** (variant runs — `tools/pods/variant-run.cjs`, the ONE place
  the rule lives) must stay locked to a single voice, always. Splitting a variant run across
  voices makes the speaker contradict themselves (the scene 21 toilet-directions case that
  started this whole thread).
- **Genuine single answers / additional content** — a line that answers a question with no
  competing rephrasing sitting next to it — must NOT collapse onto the single (Learner)
  voice. That's what 16.9 ("No, we only take cash.") is: reverting it, as A-248 proposed,
  would have been exactly the failure mode Tom's second clause forbids.

## 2. Method

Read `listening_pod_sentences` for `ita_for_eng:pod-1` in script order, joined to
`course_audio.voice_id` for every `target_audio_id`/`known_audio_id`. Ran the live
`annotateVariantRuns()` over the full script (not just scenes 15-21 — a run needs its true
neighbours) and filtered the verdicts down to scenes 15-21 for reporting. Cross-checked
against `verify-pod-audio-fidelity.cjs ita_for_eng` and a dry-run of
`rerender-off-role-pod-turns.cjs --pod=ita_for_eng:pod-1`. Read-only throughout.

## 3. What's live, scene by scene

Pod-1's cast has exactly two voices: **ara** (known `bedd6226`) is Learner's voice and also
carries most incidental named characters (Anna, Sarah, Driver, Diners, Receptionist, Bar
Customers, etc.); **x7avnu1k** (known `gfzdpspr5fdp`) is the "second voice" and carries Staff,
Interlocutor, Narrator, Guest, and most other named roles.

- **Scene 15** — 11 lines, all Learner drill pairs (4 variant runs, correctly single-voice)
  plus one Narrator digit-island line on the second voice. No dialogue content at all — there
  is no Staff/Interlocutor role in this scene to check the rule against.
- **Scene 16** — Learner drills (3 variant runs, correctly single-voice) plus the real
  exchange: 16.8 Learner asks *"Can we pay by card?"*, **16.9 Staff answers on the second
  voice** *"No, we only take cash,"* 16.10 Learner replies on Learner voice. This is exactly
  the line A-248 asked about — it is correctly on the second voice, and reverting it would
  have broken the rule's second clause.
- **Scene 17** — **17.2 Staff on the second voice** asks the real question; 17.3 Learner
  answers; **17.4/17.5 are a variant run** (Staff re-asking two rephrasings after the question
  was already answered) and correctly stay locked to the Learner voice. **17.9 Interlocutor on
  the second voice** answers 17.8. Both halves of the rule fire correctly in one scene.
- **Scene 18** — 11 lines, all Learner drill pairs (4 variant runs) plus one Narrator line.
  Ten consecutive Learner lines by design (Aran's chunk ruling, commit `12e6c1ab8`) — no
  dialogue role present.
- **Scene 19** — same shape as 18: Learner drills (5 variant runs) plus one Narrator line, no
  dialogue role present.
- **Scene 20** — Learner drills (1 variant run) plus one Narrator line, no dialogue role
  present.
- **Scene 21** — the busiest scene. 21.5/21.6 (left/right directions) and 21.11/21.12/21.13
  (three drink-offer rephrasings) are variant runs, correctly locked to the Learner voice —
  this is the exact contradiction Tom's original ruling fixed. **21.8 Interlocutor on the
  second voice** answers 21.7 *"Can you say that again?"* with the one genuine reply. Narrator
  closes the scene on the second voice.

## 4. The checks that back the verdict up

- **19 variant runs** across scenes 15-21, **0 split across voices** — every alternative-answer
  group is on exactly one voice, on both target and known tracks.
- **4 genuine single-answer lines** (16.9, 17.2, 17.9, 21.8) — **100% on the second voice**,
  none flattened onto Learner's voice. These are the only non-Narrator, non-drill dialogue
  moments in the whole 15-21 span.
- **Scenes 15, 18, 19, 20 have zero Staff/Interlocutor content** — pure Learner drill chunks
  by design, so there was nothing in them for the earlier job to have missed. Tom's worry
  that the job "maybe didn't finish" does not land on these scenes: there was no candidate
  line in them to begin with.
- `verify-pod-audio-fidelity.cjs ita_for_eng` — **REPAIRED+VERIFIED**, 231 rows, 1,176 checks,
  0 scored failures.
- `rerender-off-role-pod-turns.cjs --pod=ita_for_eng:pod-1` (dry run) — **0 off-role
  whole-turn slots**. The only 14 slots it flags at all are the 7 variant-locked lines
  correctly *excluded* as candidates, listed with the rule's own reasoning.

## 5. One separate, out-of-scope finding — not touched

The same dry run reports **69 off-role split-array clips** (sub-sentence audio, a different
repair class the tool itself marks "REPORTED ONLY, re-cut work, not re-render work"): 35
Narrator, plus Bar Customer 2, Diner 2, and Driver lines. Checked their scene numbers — **all
69 sit in scenes 6-14**, none in 15-21. Pre-existing, unrelated to the 7/4 split rule, not
part of this check, not touched.

## 6. Bottom line

No metadata/casting fix was needed — the rule Tom stated on 2026-08-25 was already fully live
across scenes 15-21 before this check started. The 16.9 line A-248 questioned is correct as
it stands.

No commits. No writes to the DB. No TTS spend.
