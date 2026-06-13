# The 了-contract — proposal (2026-06-11, needs Tom's ratification)

## The principle (generalises your ZUT doctrine to construction features)

ZUT says: one English prompt → one Chinese form. The 了 problem is the feature-level version: **every construction feature must have a deterministic English cue.** If the learner can't predict 了 from the prompt, the production function forks — same disease as understand→6-forms, one level down.

了 is context/emphasis in real Chinese — but the course is not modelling real Chinese, it's building a deterministic production function that gets learners interacting. So we *choose* a convention and hold it everywhere. (Naturalness subordinate, per your doctrine.)

## Current state (audited 11,523 learner-facing rows)

- 583 rows end in 了; 1,074 contain it.
- **37 minimal pairs** (T vs T了) with incoherent gloss deltas — some backwards (摔倒 "to fall over" vs 摔倒了 "fall down"; 准备好了 glossed "*fully* prepared" — 了 is not "fully"; 左转了 "she turned left" — 了 is not "she").
- **Smoking gun:** S30 他昨天回来 "he came back yesterday" (no 了) vs S35 他昨天下午回来了 "he came back yesterday afternoon" (了).
- Past-time event rows split 68 with-了 / ~40–60 genuinely-inconsistent without (the rest of the 120 are states/comparisons, correctly bare).
- The experiential rows are ALREADY consistent: "have seen (before)" → 见过. English "have" is doing triple duty (perfect→了, experience→过, possession→有/还有) and the cue table below splits it.

## THE CONTRACT — English cue → Chinese feature, always

| English cue in the prompt | Chinese | status today |
|---|---|---|
| "have/has V-ed **before/ever**" (experience) | V过 | already consistent ✓ |
| "have/has (just) V-ed", "done/finished" (completion, relevant now) | …了 | mostly ✓ |
| **simple past, bounded event** (came, went, did, put, asked, started) | …了 **always** | the inconsistent class — ~40-60 rows to fix |
| simple past, **state/feeling/comparison** (was happy, felt, was better than) | bare, no 了 | already consistent ✓ |
| "now" + changed state, "can … now" | …了 | ✓ (我现在能听懂了) |
| "already" | 已经…了 | spot-check needed |
| "it's time to" | 该…了 | ✓ (该回家了) |
| "not … any more" | 不…了 | spot-check needed |
| "didn't" | 没…, never 了 | already consistent ✓ (S43 basket is model) |
| statives (want, like, hope, think, know) | never 了 | ✓ |

Learner experience once held: 了 is fully predictable from their own English intention. The 37 minimal pairs flip from noise to **teaching pairs** (the 你练习多久/多久了 move — the delta IS the meaning, taught by contrast, no rule stated).

## Work plan if ratified

- **Phase A — free (gloss-side):** repair the 37 minimal-pair glosses to carry the cue coherently; triage the 426 final-了 rows my crude cue-regex flagged (most have did/past cues and are fine; fix the genuinely cue-less). No audio cost.
- **Phase B — audio-cost (Chinese-side):** add 了 to the ~40–60 bounded-event past rows (他昨天回来 → 他昨天回来了 etc.). Target audio regen needed on those rows — needs your TTS approval.
- **Phase C — institutionalise:** bank the contract table in ralph-methodology.md; add a warn-only feature-cue lint beside checkBasketFrameCoverage (flags past-event-no-了 and perfect-have misroutes at submission time); fold the whole pass into the 176-collision ZUT worklist sweep (same detector → resolver → doctrine-loaded verifier → applier unit, same batching).

## Decisions needed from you

1. **Ratify the always-了 rule for past bounded events** — the one genuinely contestable row of the table. It trades a little narrative-Chinese naturalness for full determinism. (Alternative — drop 了 from the 68 — fights the stronger Chinese convention and re-voices more audio.)
2. **Approve Phase B audio spend** (~40–60 phrases re-voiced) — or do Phase A now, Phase B batched with the next audio run.
3. Bless the contract wording (or edit the table) before I bank it in the methodology file.
