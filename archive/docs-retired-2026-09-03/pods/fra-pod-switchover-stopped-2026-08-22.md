# French listening pod — stopped, not flipped

*2026-08-22. Italian and Chinese both flipped and are verified live (separate reports). French
did not flip. This page is the diagnosis and the stop, for Tom's ear.*

---

## The headline

**French stays on `pod-0` today.** The single quarantined row, `SC11-S008`, was re-rendered once
in this job and quarantined again on the same failure. The diagnosis below is now solid: this
reads as a **known gap in the audio-veracity comparator**, not a defect in the script or the TTS
audio — but confirming that beyond doubt needs a human ear, which this job does not have. Per the
brief's own stop condition, this is reported plainly rather than forced or guessed.

---

## What was tried

**Row:** `fra_for_eng:pod-0-unrecorded:SC11-S008`, scene 11, sentence 8, speaker "Receptionist".
- `known_text`: "From half-past seven until ten o'clock. We have fruit and cereals or a cooked
  breakfast."
- `target_text`: "De sept heures et demie jusqu'à dix heures. Nous avons des fruits et des
  céréales ou un petit-déjeuner chaud." — **already fully spelled out, no digits.** The
  contradiction flagged in the brief was real: there was nothing to "normalise to spelled-out
  numerals" because the script never had digits in the first place.

**Re-render, target track only, scoped explicitly** (`POST /generate-pods/fra_for_eng` with
`pod_ids: ["fra_for_eng:pod-0-unrecorded"]` and an explicit `sentence_ids` scope — nothing else in
the pod was touched), run in the foreground:

```
quarantined after 3 attempts (numeral_mismatch, CER 0.1682,
heard "de 7h30 jusqu'à 10h.  Nous avons des fruits et des céréales ")
```

`target_audio_id` is still `null` — the gate did its job and refused to link a clip it could not
verify. **Nothing was force-linked.**

---

## The diagnosis

The `numeral_mismatch` reason is Rule 4 of the production veracity comparator
(`services/audio-veracity.cjs`), added 2026-08-13 (commit `e12383d8b`) for exactly this shape of
problem: Whisper's transcription prefers the orthography a language's writing system prefers, and
for time/price/quantity that is very often DIGITS, regardless of what was actually spoken. The
English half of that fix is well-tested and in production (26 tests, a 5,341-decode corpus
re-judged with zero collateral changes) — a script reading "forty-eight pounds" that comes back
"£48" is recognised as the same clip, not a mismatch.

**That fix's number-word parser (`NUM_SMALL`, `NUM_TENS`, `numberToWords`, etc.) is English-only.**
It has no French vocabulary — it cannot read "sept heures et demie" as a number at all. So when
Whisper decodes the audio as "7h30" (the standard French clock-time shorthand — this is how French
orthography canonically WRITES a spoken time, independent of how it is said), Rule 4 finds digits
in the decode with nothing on the French-script side it knows how to parse as the same number, and
convicts.

**Corroborating evidence**, not just theory — 14 other French rows in this same pod contain
number or time words, several using this exact "3 heures. 9 heures." digit-plus-word convention in
their own script text, and every one of them is linked and passed:

| Row | Script (excerpt) | Status |
|---|---|---|
| SC07-S010 | "Ça fait huit livres quarante en tout." | linked |
| SC12-S006 | "Un toutes les quatre à six heures, pas plus de huit par jour." | linked |
| SC14-S007 | "Voilà. Ça fait douze livres cinquante." | linked |
| SC14-S010 | "100. 200. 1000. Dimanche. 12 heures." | linked |
| SC15-S011 through SC20-S011 | "100 000. 60. 70. 1 heure. 11 heures." and similar | all linked |

That spread — spelled-out numbers, digit numbers, and mixed digit+word clock times all passing —
is consistent with the fix covering the OTHER 14 cases by coincidence of format (several already
write the hour as a digit, which needs no canonicalisation to match a digit decode) rather than by
actually understanding French numerals, and SC11-S008 being the one row unlucky enough to spell a
time out in full words while Whisper wrote its decode in the "Xh30" shorthand.

**This reads as the same class of comparator gap the English fix was built to close, not yet
extended to French.** The strong likelihood is that the audio itself is healthy French speech.

---

## Why this stops here rather than being forced or guessed

The brief's own instruction: *"If the render actually produces correct French audio and only the
veracity/transcription comparison fails on digits-versus-words, the honest fix is to make the
comparison tolerate that normalisation for this check, or to accept the clip on a documented
manual listen. Do not mangle correct French to satisfy a broken comparator."*

Both honest paths are out of reach for this job, stated plainly rather than papered over:

1. **Extending the comparator to French** means writing and testing a French numeral-word parser
   inside `services/audio-veracity.cjs` — the same shape of work as the original English fix (367
   lines, 124 new tests, a full-corpus re-judge for zero collateral damage). That is shared
   production code every course's renders run through, not a French-only or single-row change —
   a genuine scope change, and by the master instructions that stays Tom's call to open, not
   something to fold into a pod-flip job.
2. **Accepting the clip on a documented manual listen** needs an actual human ear on the actual
   audio. This job has neither ears nor a way to play the clip for Tom inline — and the render
   that would have produced a listenable file was rejected by the gate before linking, so there
   is no linked clip to point Tom at yet even if there were a way to play it here.

So: **not flipped, not force-linked, not guessed.** French sits on `pod-0` exactly where it was
before this job started.

---

## What's needed from Tom

One of:

- **(a)** Approve extending Rule 4's numeral parser to French (and, if this is a recurring pattern,
  the other T-V/clock-notation languages in the estate) — a scoped follow-up job, not a quick
  patch, modelled on commit `e12383d8b`.
- **(b)** Listen to the actual rendered clip once it exists and, if it is correct French, approve a
  documented manual override for this one row only.
- **(c)** Something else — this is Tom's call, not this job's.

Either way, French can flip in its own follow-up job once the row is resolved, using the exact
same procedure already proven twice today (Italian, Chinese): dry run, rehearse, prospective log,
apply, independent re-read, fleet checks, browser verification staging then production.

---

## What's untouched, stated once more

`fra_for_eng` was **not** flipped, promoted, archived, or migrated in any way. `pod-0` (142
sentences, live) and `pod-0-unrecorded` (231 sentences, staged, 230/231 audio-complete) are exactly
as they were before this job, except for the one re-render attempt on `SC11-S008` recorded above,
which left `target_audio_id` unchanged (still `null`).

---

*Protocol: `docs/pods/pod-migration-protocol.md` (plate A-111, adopted 2026-08-16). Diagnosis
evidence: `services/audio-veracity.cjs` commit `e12383d8b` (the English numeral fix this gap
extends from); job #949's own French report, published at
`https://watson-1.tail4968cb.ts.net/d/7a88b086`.*
