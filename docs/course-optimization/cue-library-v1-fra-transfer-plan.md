# Cue-library v1.0 → fra_for_eng transfer test — set-up

*2026-07-04. Scaffolding for the transfer test named in the spa_for_eng cue-library doc
(`cue-library-v1-spa.md`: "F1, F2 GO as-is; F3, F4, F5, F6, F7 GO once their fold-ins land and
re-verify"). This is the **plan + concrete seed evidence**, not a completed closed-loop
adversarial verification — that's a Fable-5-design + N-Sonnet-adversary run (the same shape as
the original spa run), sized for a dedicated pass, not something to fold silently into this
session.*

## Headline finding: fra_for_eng shares spa_for_eng's seed scaffold

`fra_for_eng` (668 seeds, 1,653 legos, released) was built from the same English known-side
seed script as `spa_for_eng` — confirmed by spot-checking every seed number the spa cue-library
patched. The same seed numbers carry the same intentions in French:

| Seed | spa_for_eng intention | fra_for_eng (live, unmodified) |
|---|---|---|
| 297 | people who speak Spanish (F3) | `qui parlent français` — but **indicative**, not subjunctive (see below) |
| 330 | I don't think it's (F2) | `L1 "I don't think it's" = "je ne pense pas que ce soit"` — already correctly subjunctive |
| 396 | until they are ready (F4) | `jusqu'à ce que ... soit prêt` — correct trigger-glue, but see the L8 bug below |
| 427 | they wouldn't like you to think (F1) | `L2 "that you think" = "que tu penses"` |
| 497 | as if you needed to sleep (F5) | `L3 "that sounds as though" = "on dirait que"` (no `comme si` yet at this seed) |
| 506 | before we moved (F4) | `L4 "before we moved" = "avant qu'on déménage"` |
| 542 | whenever you feel (F4) | `L2 "whenever you feel" = "chaque fois que tu te sens"` |
| 646/651/652/653/655 | formal-you (F7) | all use `vous`, and **646 reproduces spa's exact bug** (see below) |
| 668 | I hope you all can (F1/F2) | `L2 "you will all be able to go" = "vous pourrez tous partir"` |

This means the transfer test doesn't have to be designed from scratch — it can be run directly
against these seeds once resourced.

## F7 (formal-you) — confirmed to transfer, same bug shape

`fra_for_eng` seed 646, independently of anything done to `spa_for_eng` today, has **the exact
same bare-build trap** the spa cue-library fixed:

```
L1 build pos3: "you are doing" = "vous faites"                    <- bare, no vocative
L1 build pos4: "you are doing something" = "vous faites quelque chose"   <- bare
L1 build pos5: "you are doing well" = "vous faites bien"           <- bare
L1 use  pos6: "you are doing something sir" = "vous faites quelque chose monsieur"  <- marked
L1 use  pos7: "you are doing well sir" = "vous faites bien monsieur"                <- marked
```
Same pattern spa_for_eng had before today's fix: builds bare, USE lines marked. French's
tu/vous split is the exact grammatical analogue of Spanish tú/usted, so the informal twin
(`tu fais`) is primed by the bare build exactly like `estás haciendo` was in Spanish. **F7's
fold-in mechanism (vocative marker on every surfaced row) transfers verbatim** — the fix
pattern applied to spa 646 (`you're doing sir` on the lego + builds) is directly reusable here.

## F4 (trigger-glue) — mechanism transfers; also surfaced an unrelated live bug

`jusqu'à ce que` + subjunctive is present and mostly correct (seed 396 L6, L8 build/use lines).
But the same seed also has what looks like a **real French grammar error**, unrelated to the
cue-library mechanism, worth flagging separately:
```
L8 use pos6: "I know he is ready" = "je sais qu'il soit prêt"     <- savoir+affirmative takes indicative (est), not subjunctive
L8 use pos7: "I think he is ready" = "je pense qu'il soit prêt"   <- penser+affirmative (non-negated) takes indicative (est)
```
Not touched here — it's a native-French-speaker call, not a mechanical fold-in, and it's outside
this sweep's scope. Flagging for the native-speaker adjudication pass (same bucket as the spa
doc's own `no estoy seguro de que` mood-consistency item).

## F3 (indefinite antecedent / subjunctive relative) — does NOT manifest identically

Seed 297's French relative clause (`des gens qui parlent français` / `qui parlent français`) is
**indicative**, correctly — the antecedent ("many people I know") is affirmative and specific
enough that French doesn't trigger the subjunctive the way Spanish's negated/indefinite frame
does. This is a genuine cross-language difference, not a gap in the transfer: French only takes
the subjunctive relative under a stronger negation/indefiniteness than this particular seed
carries. **F3's mechanism (bundle the subjunctive relative inside the antecedent chunk) is
still correct doctrine for French**, but seed 297 isn't the seed where it would fire — a future
verification pass needs to find fra_for_eng's actual negated/indefinite-antecedent seeds (e.g.
"I don't know anyone who...") rather than assume seed-number parity implies mood parity.

## F1, F2, F5 — present and plausible, not spot-checked for bugs
Seeds 330 (F2), 427/668 (F1), and the `comme si` construction (F5, not yet seeded by 497 in
fra but present course-wide per the cue-library's own "Romance transfer" notes) all show the
right grammatical machinery in place. No bare/collision check was run on these this session —
that's exactly the adversarial-verification work a dedicated pass would do.

## What a real transfer-test run would need (not done here)
Per the spa doc's own provenance: Fable-5 design (spring-finding across a full-course journey
walk) + N parallel Sonnet adversaries (simulate the learner holding the rehearsed wrong twin,
check discrimination / new-collision / reachability) + Fable-5 synthesis. That's a dedicated,
resourced pass — this plan gives it a running start (seed numbers, confirmed live bugs,
confirmed non-transfers) rather than starting from zero.

## Recommended next step
Spend a Workflow-orchestrated pass (design + adversarial verify, same shape as the spa run)
scoped to `fra_for_eng`, seeded with this doc's seed list, rather than a full fresh
"14×50-seed journey walk" — the seed scaffold parity means the springs are largely already
known; the work is verifying French's actual mood/register behavior at each one and building
the French-specific patch set.
