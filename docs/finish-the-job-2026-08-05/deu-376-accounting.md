# The German "missing 376" — closed

**Date:** 2026-08-05
**Method:** counted directly from the run's own artifacts on this host. Nothing here is quoted
from another document.

Artifacts read:
- `/tmp/deu-repair-run.log` — the 2026-08-04 repair run's stdout (1,861 lines)
- `/tmp/repair-deu_for_eng-1107.json` — the run's per-clip record (1,101 records)

## The claim being tested

`docs/overnight-audio-2026-08-05/deu-scope-divergence-2026-08-05.md` reports 449 clips down the
amputating branch and 282 down the safe flag branch — 731 against a scope of 1,107 and 1,082
actual replacements. The 376 remainder was unexplained.

## What the log actually contains

Branch signatures, counted by `grep -c`:

| signature | count |
|---|---|
| `tail rise …dB repaired in N pass(es)` | 219 |
| `tail resurgence …dB repaired in N pass(es)` | 212 |
| `tail burst …dB repaired in N pass(es)` | 18 |
| **amputating branch, total** | **449** |
| `tail flag (resurgence …) is resumed speech — pausey render shipped untouched` | 218 |
| `tail flag (rise …) …` | 56 |
| `tail flag (burst …) …` | 8 |
| **safe flag branch, total** | **282** |

Both published figures reproduce exactly. 449 + 282 = 731.

## Where the other 376 went

Progress lines `[n/1107]` run from 1 to 1107, so the full approved scope was attempted. Outcomes:

| outcome | count | evidence |
|---|---|---|
| replaced (`… ms -> … ms`) | 1,082 | `grep -cE '[0-9]+ms -> [0-9]+ms'` |
| kept (probe said healthy) | 17 | JSON `action` histogram |
| failed | 2 | JSON `action` histogram |
| skipped, row already gone | 6 | `grep -c 'gone (already repaired?)'` |
| **total** | **1,107** | 1082 + 17 + 2 + 6 |

The JSON holds 1,101 records (1,082 + 17 + 2); the 6 skips never produced a record.

So the arithmetic closes as:

```
1,107 scope
  −  25 never re-rendered at all (17 kept + 2 failed + 6 gone)
= 1,082 re-rendered and replaced
  − 731 whose tail detector fired (449 amputated + 282 held)
= 351 re-rendered with the detector never firing
```

**376 = 351 + 25.** The doc's remainder was measured against the 1,107 scope while the 731 was
measured against renders, which is what made it look unexplained.

## What this means

A clip only logs a branch signature when the tail detector fires. The 351 are renders where it
never fired — nothing was cut from them, because the amputating code path was never entered. The
25 were never re-rendered at all.

**The remainder is untouched-and-unamputated, not unaccounted.** The 449 figure stands as the
upper bound on amputation damage from that run, and it is an upper bound rather than a count of
damage because a log line records that a code branch executed, not that the resulting file is
bad.

## The caveat that matters

A log line is a claim about a code branch. It is not evidence about a file. The only thing that
proves the audio a learner hears is good is fetching the object and probing it. The log was used
here to TARGET; the acoustic detection and ffprobe passes recorded alongside this document are
what DECIDE.

## Incidental finding

Every one of the 1,082 replacements came back materially longer than the clip it replaced
(minimum +208 ms, median +552 ms, maximum +2,030 ms; zero came back the same or shorter). Under
the before/after duration-delta discriminator, that makes all 1,082 confirmed truncations rather
than detector false alarms — the run was fixing real damage, whatever it then did to the tails.
