# Seed-aligned sequence optimizer — zho_for_eng (2026-06-10)

Yield = cumulative USE phrases producible from the course's own corpus (3262 phrases, exact decomposition provenance). 1103 new-LEGO rounds.

| R | CANON | FREE | FREE× | ALIGNED | ALIGNED× |
|---|---|---|---|---|---|
| 50 | 191 | 205 | 1.07 | 205 | 1.07 |
| 100 | 542 | 569 | 1.05 | 543 | 1.00 |
| 200 | 1106 | 1276 | 1.15 | 1184 | 1.07 |
| 300 | 1757 | 1954 | 1.11 | 1801 | 1.03 |
| 400 | 2310 | 2614 | 1.13 | 2412 | 1.04 |
| 548 | 3212 | 3262 | 1.02 | 3247 | 1.01 |
| 700 | 3251 | 3262 | 1.00 | 3262 | 1.00 |
| 900 | 3262 | 3262 | 1.00 | 3262 | 1.00 |
| 1103 | 3262 | 3262 | 1.00 | 3262 | 1.00 |

Frame-novelty-weighted (+0.5 per first-seen frame):

| R | CANON | FREE× | ALIGNED× |
|---|---|---|---|
| 100 | 551 | 1.05 | 1.01 |
| 200 | 1119 | 1.15 | 1.07 |
| 400 | 2326 | 1.13 | 1.04 |
| 1103 | 3278 | 1.00 | 1.00 |

**Learner-weighted expected producible phrases per learner-event:** CANON 806 | FREE 847 (1.05×) | ALIGNED 821 (1.02×)

ALIGNED constraint: seeds complete on the canonical drumbeat (slack 2) in ~canonical order — the cross-course coordinate system survives intact.

## Learner-weighted integral over the May-2026 experiment curves

Weights = real learner activity by round position (player_events, school-demo fakes excluded; 15,424 positioned events; 79.1% of activity sits in R1–R200, median position R41).

| statistic | v2 A | v2 B | v2 C |
|---|---|---|---|
| Endpoint ratio (R548) — what the reversion weighed | 1.20× | 1.10× | 0.98× |
| **Learner-weighted (all courses pooled)** | **1.29×** | 1.20× | 1.09× |
| Learner-weighted (zho events only) | 1.27× | 1.15× | 1.04× |
| Per-position ratio across R1–R200 (where 79% of activity lives) | ~1.37× | ~1.40× | ~1.33× |

**Reading:** the reversion-era framing ("narrows to 1.0–1.2×") weighted the endpoint, where learners aren't. The live, learner-experienced advantage of the designed sequence is ~1.3×, and for the typical learner at their actual position it's ~1.4×.

## Honest caveats on the optimizer table above

1. **The corpus metric is biased toward CANON.** The yield universe is the course's own USE phrases (3,262 with decomposition provenance), which were authored FOR the canonical order — content a better sequence would unlock early simply doesn't exist in this corpus. So FREE's 1.05–1.15× is a LOWER BOUND on real reordering gain; the experiment's de-novo enumeration (1.3–1.6×) is closer to truth.
2. **The structural finding survives the bias:** the ALIGNED constraint (canonical seed-completion drumbeat, slack 2) retains the coordinate system while keeping most of whatever gain the greedy finds (1.02× of 1.05× learner-weighted; 1.07× of 1.15× at R200). Seeds-as-milestones is cheap. Definitive cost measurement needs ALIGNED run inside the experiment's agent-scored harness.
3. Only USE phrases with populated decomposition (3,262 of 6,610) participate.

## Recommended next steps

1. **Fresh pairs are the prize** (per the integral): for new courses, design the sequence from scratch under the v2 scorer with the seed-milestone alignment constraint — coordinates preserved, ~1.3× learner-experienced gain available.
2. **Run ALIGNED inside the de-novo value-weighted harness** (agent-scored, same anchors as May) — the one number still missing: true cost of alignment under the unbiased metric.
3. **For existing zho:** reorder gains look modest under the corpus metric; the cheaper, already-underway win is basket-level frame/paradigm recovery + the contract work.
