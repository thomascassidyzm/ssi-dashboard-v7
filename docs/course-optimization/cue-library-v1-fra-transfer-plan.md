# Cue-library v1.0 → fra_for_eng transfer test — set-up

*2026-07-04. Scaffolding for the transfer test named in the spa_for_eng cue-library doc
(`cue-library-v1-spa.md`: "F1, F2 GO as-is; F3, F4, F5, F6, F7 GO once their fold-ins land and
re-verify"). This is the **plan + concrete seed evidence**, not a completed closed-loop
adversarial verification — that's a Fable-5-design + N-Sonnet-adversary run (the same shape as
the original spa run), sized for a dedicated pass, not something to fold silently into this
session.*

---
## STATUS UPDATE — 2026-07-04 dedicated formal-vous pass (COMPLETE for the 639-655 block)

The dedicated Fable-5-design + N-Sonnet-adversary pass this doc called for has run. Scope was
widened per the scope note ("every formal-`vous` seed, not just the F7-labelled ones"): a
course-wide scan found the formal-vous block is seeds **639-655** (the original 9-seed list
missed 639/643/644/645/647/648/649/650/654, and mis-included 162/657/661/666 — see below).

- **FIXED & VERIFIED (13 seeds): 642, 643, 644, 645, 647, 648, 649, 650, 651, 652, 653, 654,
  655.** 81 actions (58 vocative marks, 9 lego realignments to each seed's own spoken form,
  14 redundant-bare-precursor deletions), each independently verified by one of three Sonnet
  adversaries against the live DB before apply (before-states, course-wide uniqueness incl.
  new-vs-new, deletion safety, closed loop, house law). Post-apply re-scan: **zero bare
  formal-vous cued rows across 639-655**. Apply tool + verified proposals + applied log:
  `tools/course-optimization/apply-formal-vous-pass-fra.cjs` / `formal-vous-pass-fra-proposals.json`
  / `formal-vous-pass-fra-applied-log.json`. Audio staged/nulled only (see
  `tts-staged-for-approval.md`); `course_round_index` needs no refresh (view holds ids/order
  only; no legos added/removed). 651's "structurally harder" case (below) resolved cleanly:
  the debut realigns to the seed's own `qu'en pensez-vous madame ?` (byte-copy of its U01 and
  of `course_seeds` 651) — no editorial wording was needed anywhere.
- **639 and 646**: already clean / already fixed; only component rows (visual tiles, not cued
  production) remain bare there and course-wide, per the committed 646 precedent.
- **NOT formal seeds, delisted**: 657/661/666 are plural "you all" seeds (discriminated by
  all/tous) — only their component tiles are bare; no action. 162 is an early bare-vous seed —
  moved to the owner decision list below.
- **OWNER DECISION LIST (not applied — register/wording calls, no vocative vocabulary available
  at those course positions since monsieur/madame debut at 639):** seeds **161, 162, 165, 179,
  194, 196, 204** each drill bare `vous` cues (lego/build/use, not just components) whose known
  texts collide with drilled `tu` twins (e.g. 162 U02 "do you think I can do that?" =
  `vous pensez...` vs seed 135 U02 identical known = `tu penses...`). Options per seed:
  plural-mark the known ("you all..."), reword one side, or accept as register variation.
  Plus two minor flags: seed 414/624/630 "please" doublet (`s'il vous plaît` vs `s'il te
  plaît` under the same bare known), and seed 267 "have you heard" = `tu as eu` (looks like a
  mis-gloss: that target means "you have had"). Machine-readable collision list:
  `unmarkedVousLiveCollisions` in `formal-vous-pass-fra-proposals.json`.
- **Native-review flags from the adversaries** (pre-existing, untouched): embedded-inversion
  French in 642 U03/U04 (`j'aimerais savoir comment vous sentez-vous`), redundant `en` + `de
  cela` in 651 B02/U04 (`qu'en pensez-vous de cela`), 649 lego now lowercase-initial
  (`êtes-vous...`, matches its donor row), `course_seeds` 645 capitalisation nit.

## STATUS UPDATE — 2026-07-04 transfer execution (seed 646 applied; wider F7 bug confirmed live)

The confirmed F7 finding above (seed 646 reproduces spa's exact bare-build bug) was applied to
`fra_for_eng` live. Apply script (idempotent, assertion-guarded, dry-run capable):
`tools/course-optimization/apply-cue-library-v1-fra-transfer.cjs`; before/after log:
`tools/course-optimization/cue-library-v1-fra-transfer-applied-log.json`.

- **S0646L01 — APPLIED.** Lego debut + build pos3 ("you are doing" = "vous faites", bare)
  re-glossed "you are doing sir" (target unchanged, already formal `vous`). Build rows pos4/5
  ("you are doing something" / "you are doing well") were NOT re-glossed the same way: fra_for_eng
  bakes the vocative into the **French target audio** on some rows (USE lines already read
  "…monsieur"/"…madame" aloud) but not others (builds) — a pre-existing authoring difference from
  spa_for_eng, which never speaks "señor"/"señora" in the Spanish target, only in the English cue.
  Marking these two builds "sir" would have made their known_text byte-identical to the seed's own
  later USE rows (`S0646L01U01`/`U02`), which already own that exact marked text under a
  *different* target (with "monsieur" spoken) — a same-known-two-targets ZUT violation. Resolved
  by **deleting the redundant bare precursor** (mirrors the spa precedent of deleting bare rungs
  that duplicate already-correct text at seeds 297/396/497), not by editing target text. The two
  previously-bare USE lines (`U03`, `U05`) were marked directly — confirmed unique course-wide, no
  target edit needed. No audio generated; all changed rows have audio_id fields nulled, staged per
  `docs/course-optimization/tts-staged-for-approval.md`. Closed-loop check post-apply: seed 646 now
  has zero bare formal-`vous` rows, headroom 8 phrases (was 10, floor is ≥3), zero new collisions
  introduced (verified against the full tu-form corpus — see below).

- **New finding, bigger than this plan's original scope: the F7 bare-build bug is not confined to
  646.** Collision-checking the live DB against fra_for_eng's own heavily-rehearsed **informal
  `tu`-form corpus** (the exact discriminator the spa mechanism protects) turned up the identical
  bare-`vous` bug, independently confirmed, at seeds **162, 642, 651, 652, 653, 655, 657, 661,
  666** — e.g. seed 651's lego debut "what do you think?" = "qu'en pensez-vous ?" is bare while
  "penses-tu"/"tu penses" (the informal twin) is drilled across 30+ phrases in seeds 121–492;
  653's "do you mind?" = bare `vous dérange` sits downstream of "ça te dérange" drilled at seed
  281; 642/657's "how do you feel" sits downstream of "comment te sens-tu" drilled at seed 40.
  **None of these were fixed in this pass** — per-seed inspection (done for 651 as a test case)
  shows fra_for_eng's baked-in target-side vocatives (see above) make several of them structurally
  harder than 646: 651's bare lego text collides with **both** existing marked USE variants
  ("…sir?"/"…madam?") under different targets, so the mechanical "just append a marker" move isn't
  available — the fix needs either a target-text realignment (copying the seed's own later spoken
  form onto the debut) or an editorial call on wording, which is exactly the kind of judgment this
  session was told not to make unilaterally. Flagging for the dedicated Fable-5-design +
  N-Sonnet-adversary pass this doc already called for below — that pass should treat "every
  formal-`vous` seed, not just the F7-labelled ones from spa's seed-parity table" as its search
  scope, since the bug appears tied to the register itself, not to the specific seed numbers spa
  happened to patch.

- **F3/F4/F5 (seeds 297/396/427/497/506/542/668):** not touched, per the plan's own findings above
  — 297 doesn't manifest the bug (French subjunctive-relative behaves correctly there), 396's only
  live issue is the unrelated mood error (flagged, untouched, native-review queue), and F1/F2/F5
  were never spot-checked for bugs in the first place (no confirmed defect to fix).

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
