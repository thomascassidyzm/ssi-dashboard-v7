# Korean lego re-decomposition pilot — PAUSED

**Status:** **PILOT PAUSED at S230.** Concept proven (a clean re-cut *is* achievable) but 4 execution
blockers need tooling hardening + a methodology ruling before resuming. **Awaiting Kai:** fix tooling
/ spec it / park. The 647 deepening phrases are untouched by this and are GO-for-TTS.

**Plan doc:** `docs/course-optimization/kor-remediation-plan-2026-08.md` (referenced by memory;
verify it's committed — if only local, it's in the preserve commit). See also the kor pilot commits
on kai-stage: `3c22b72c`, `d27f20c2`, `51040074`.

## The idea (Kai, 2026-08-03) — "idea 2"

**Recombinability = lego quality.** Both over-fused long chunks *and* bound short forms (e.g.
`puhumaan`, `싶어하는`) are bad legos. Fable diagnostic on kor: **S150–450 was never cut to the 2–4
word grain** (97/100 in S201–300 are whole-sentence legos) — this is the **root cause of BOTH**
unspreadability AND the ~28% USE-phrase repetition. ~65–70% of the 429 kor orphans are badly cut.
(ara_lb has a similar over-fusion band at S200–299; ~100 bare-subjunctive fuse-ups per course.)

## The 4 blockers that paused the pilot at S230

1. **Edit-cascade long/short-key transport bug** — the re-cut edit cascade mis-transports long vs
   short keys.
2. **⛔ UNRELIABLE ROLLBACK** — rollback emptied the released S230 **twice**. Recovered from backup
   via `scripts/deepening/kor/restore-s230-v2.cjs`. **Recovery recipe:** STRIP the generated columns
   (`lego_id`, `target_lego_id`, `target_phrase_id`) before restore — the DB recomputes them from
   `seed + lego_index`. This is the single most important gotcha here.
3. **`/seed/complete` requires authored BUILD phrases** — a re-cut therefore costs ~2× (you can't
   just re-cut legos, you must re-author build phrases).
4. **8-syllable cap vs bound relative morpheme** `싶어하는` — the cap conflicts with legitimate bound
   forms.

## Exact next step

Kai decides: harden the tooling (fix rollback + edit-cascade), write a methodology ruling on
re-cut'ing bound morphemes and the build-phrase requirement, or park the whole re-decomposition idea.
Until then the pilot stays paused; don't resume re-cutting kor without the rollback fix (it has
already destroyed released seeds twice).

## Gotchas

- **Never two writers on one course** (DB race) — same rule as deepening.
- The kor `restore-s230-v2.cjs` and the rest of the kor pilot scripts live in
  `scripts/deepening/kor/` (local, gitignored). If the re-cut is resumed on watson-1, that recovery
  script's *recipe* (strip generated cols, let DB recompute) is the durable part — reproduce it there.
