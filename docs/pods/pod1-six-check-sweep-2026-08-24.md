# Pod 1 six-check sweep — all 22 live courses (2026-08-24)

**Tool:** `tools/pods/pod-cast-six-check.cjs` (committed, read-only, no writes).
**Source spec:** `docs/pods/spa-pod1-casting-construction-audit-2026-08-24.md` §"The template check, for the other 20 courses".
**Scope:** every `listening_pods` row with `slug='pod-1'` and `visibility='live'` — 22 courses.
**Checks run:** C1-C5. **C6 (gender agreement) is a documented stub, not implemented** — it needs a per-language gendered-adjective word list Tom hasn't supplied yet (`checkC6Stub()` in the tool returns `pass: null` and says so).

## Results

| Course | C1 | C2 | C3 | C4 | C5 collisions before→optimal | Notes |
|---|---|---|---|---|---|---|
| ara_eg_for_eng | PASS | PASS | PASS | FAIL | 10→6 | scenes 7/8/9 = 4/4/3 characters |
| ara_for_eng | PASS | PASS | PASS | FAIL | 10→6 | scenes 7/8/9 = 4/4/3 characters |
| deu_at_for_eng | PASS | PASS | PASS | FAIL | 10→6 | scenes 7/8/9 = 4/4/3 characters |
| deu_for_eng | PASS | PASS | PASS | FAIL | 10→6 | scenes 7/8/9 = 4/4/3 characters |
| eus_for_eng | PASS | PASS | PASS | FAIL | 10→6 | scenes 7/8/9 = 4/4/3 characters |
| fra_ca_for_eng | PASS | PASS | PASS | FAIL | 10→6 | scenes 7/8/9 = 4/4/3 characters |
| fra_for_eng | PASS | PASS | PASS | FAIL | 10→6 | scenes 7/8/9 = 4/4/3 characters |
| gle_for_eng | PASS | PASS | PASS | FAIL | 10→6 | scenes 7/8/9 = 4/4/3 characters |
| hin_for_eng | PASS | PASS | PASS | FAIL | 10→6 | scenes 7/8/9 = 4/4/3 characters |
| hrv_for_eng | PASS | PASS | PASS | FAIL | 10→6 | scenes 7/8/9 = 4/4/3 characters |
| isl_for_eng | PASS | PASS | PASS | FAIL | 10→6 | scenes 7/8/9 = 4/4/3 characters |
| ita_for_eng | PASS | PASS | PASS | FAIL | 10→6 | scenes 7/8/9 = 4/4/3 characters |
| jpn_for_eng | PASS | PASS | PASS | FAIL | 10→6 | scenes 7/8/9 = 4/4/3 characters |
| kor_for_eng | PASS | PASS | PASS | FAIL | 10→6 | scenes 7/8/9 = 4/4/3 characters |
| nld_for_eng | PASS | PASS | PASS | FAIL | 10→6 | scenes 7/8/9 = 4/4/3 characters |
| por_br_for_eng | PASS | PASS | PASS | FAIL | 10→6 | scenes 7/8/9 = 4/4/3 characters |
| por_for_eng | PASS | PASS | PASS | FAIL | 10→6 | scenes 7/8/9 = 4/4/3 characters |
| ron_for_eng | PASS | PASS | PASS | FAIL | 10→6 | scenes 7/8/9 = 4/4/3 characters |
| spa_for_eng | PASS | PASS | PASS | FAIL | **6**→6 | scenes 7/8/9 = 4/4/3 characters; scenes 8/9 recast to the optimum 2026-08-24 |
| spa_mx_for_eng | PASS | PASS | PASS | FAIL | **6**→6 | scenes 7/8/9 = 4/4/3 characters; scenes 8/9 recast to the optimum 2026-08-24 |
| swe_for_eng | PASS | PASS | PASS | FAIL | 10→6 | scenes 7/8/9 = 4/4/3 characters |
| zho_for_eng | PASS | PASS | PASS | FAIL | 10→6 | scenes 7/8/9 = 4/4/3 characters |

Per-scene C5 breakdown (identical across 20 of 22 courses; spa_for_eng/spa_mx_for_eng already at the optimum):

| Scene | Current (20 courses) | Current (spa/spa_mx) | Optimal | Avoidable |
|---|---|---|---|---|
| 7 | 1 | 1 | 1 | 0 (already optimal) |
| 8 | 5 | 2 | 2 | 3 avoidable (0 in spa/spa_mx) |
| 9 | 4 | 3 | 3 | 1 avoidable (0 in spa/spa_mx) |

**Fix note (2026-08-24, post-initial-sweep):** the first pass of this tool did not exclude the Narrator drill line from the C5 hand-off graph, even though C4 already excludes it and the source audit explicitly says the Narrator "delivers a one-line numbers/colours drill... not dialogue" (§3). That under-counted nothing for the 20 unrecast courses (their customers are all one gender pre-recast, so nothing collided with the Narrator's voice yet) but over-counted `spa_for_eng`/`spa_mx_for_eng` by 2 each (8→6 instead of the true 6→6), because their post-recast scene 8/9 casts now share the Narrator's male voice at the scene's last line. `checkC5` now excludes Narrator from the adjacency graph, matching `checkC4`; a regression test (`excludes the Narrator drill line from the hand-off graph`) covers it. The table above reflects the corrected run.

## Summary

**C1 (voice inventory), C2 (resolution) and C3 (speaker-stability) pass on all 22 courses, with zero exceptions.** Every pod declares exactly two target voices and exactly two known voices, every speaker string resolves through a canonical name or a `variants[]` alias, and no canonical character ever carries more than one (target, known) voice pair across a pod. **C4 (scene cast size) fails identically on all 22 courses** — scenes 7 (Coffee shop, 4 characters), 8 (Pub, 4 characters) and 9 (Restaurant, 3 characters) exceed the two-character ceiling everywhere, confirming the source audit's finding that the estate ships one English script structure for this pod and every course inherits the same three over-cast scenes; this is a **script** property, not a casting defect, and the fix (collapsing extra customers to one character, per the source audit's correction list item 3) is a taste call, not mechanical. **C5 (adjacent hand-offs) is uniformly 10→6 across 20 of the 22 courses**, exactly matching the manual figures in the source audit (scene 7 already optimal at 1, scene 8 at 5 vs an optimum of 2, scene 9 at 4 vs an optimum of 3) — the tool's brute-forced per-scene optimum reproduces the source audit's hand-worked numbers exactly, which is a good cross-check on the implementation. **`spa_for_eng` and `spa_mx_for_eng` are the two courses already recast** (2026-08-24, correction-list items 1-2 of the source audit) and both now sit exactly at their optimum, 6→6, with zero avoidable hand-offs remaining in scenes 8 or 9. No course fails C1, C2 or C3 — the estate-wide casting foundations (voice count, resolution, stability) are clean everywhere; every course fails C4 (a shared script property, taste call pending); 20 of 22 courses still have the full C5 gap open, with spa and spa_mx as the template for what closing it looks like.
