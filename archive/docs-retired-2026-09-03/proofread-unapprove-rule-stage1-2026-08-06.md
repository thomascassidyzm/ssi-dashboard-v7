# Approved-but-unchecked: stage 1 (measure only, nothing written)

Kai, 2026-08-06. **No unapprovals were written.** This is the count and the tool change; stage 2 waits on your yes.

## 1. The number

**21 seeds** in `fin_for_eng` are approved while holding at least one phrase that has never been looked at.

Scope of that number: **fin_for_eng only** — the only course with a proofread progress file.

| | |
|---|---|
| approved seeds in fin_for_eng | 102 |
| of those, holding ≥1 unchecked phrase | **21** |
| of the 21, partly reviewed | 7 |
| of the 21, never touched at all | 14 (S0002–S0015) |
| approved seeds fully checked but containing a flagged phrase | 0 |

The 21:

```
S0001  16/18 unchecked  (partly reviewed)
S0002–S0015                (never touched — 25 to 60 phrases each)
S0020   1/27  (partly reviewed)
S0025   6/56   S0026  9/59   S0034  8/59
S0037   7/49   S0052  4/46
```

"Unchecked" = the progress file holds no decision at all for that phrase id. A **flagged** phrase counts as checked — it has been looked at.

## 2. Estate-wide would be a catastrophe — this is your call

Applying the same rule to every course with approved seeds gives **31,576 of 32,149 approved seeds across 82 courses** — 98% of the estate. That is not a finding about quality; it is just the fact that nobody has proofread those courses, so every phrase in them is unchecked by definition.

**Recommendation: apply the rule only to courses that have a progress file** — today, fin_for_eng alone, 21 seeds. Approval elsewhere was never claiming "proofread in this tool", and unapproving it would destroy real state to satisfy a rule that has no evidence behind it. If you want the estate to mean "reviewed", that is a review programme, not a flag flip.

You need to rule on this before anything is written.

## 3. Calibration — how I know the test is right

Checked by hand on **fin_for_eng S0020**: DB says approved 2026-07-20, 27 non-component phrases. `grep '"fin_for_eng:S0020L'` in the progress file returns 26 decisions; the missing one is `S0020L02U06` ("I'm not sure if I can remember his name"). 26 checked, 1 unchecked, seed still approved — exactly the case the rule is meant to catch.

Two independent code paths then agreed on 21: the standalone dry-run script, and the tool's own new `staleApprovals` computation served live at :8445.

## 4. What changed in the tool, and where the rule lives

`tools/proofread/server.cjs` + `index.html`, tool only.

- **On decision write** — clearing a decision inside an approved seed unapproves that seed immediately. Targeted, one seed, reviewer-driven, safe to fire automatically.
- **On state load** — the drift is *reported, not written*: `/api/state` returns `staleApprovals`, and the seed box now shows **"approved · unreviewed"** instead of "approved". Writing at load would fire the bulk pass on startup, which is stage 2 and needs your yes, so it sits behind `--enforce-on-load`, **off by default**.

That flag is the switch: your yes either flips it on for fin_for_eng, or runs the backfill once — say which and I will do it.

## 5. Service

Restarted to pick up the new server (the client was already being served fresh from disk). Live at `https://watson-1.tail4968cb.ts.net:8445`, HTTP 200, all 2,245 decisions intact, position still `fin_for_eng:S0106L04U05`.

## Gaps

- The 31,576 estate-wide figure is arithmetic on absent evidence, not a quality measurement. Do not read it as 31,576 bad seeds.
- 492 approved seeds estate-wide have zero non-component phrases in the DB. They pass the rule trivially (nothing to check). Not investigated here.
