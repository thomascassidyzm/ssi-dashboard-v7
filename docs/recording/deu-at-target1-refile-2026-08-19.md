# Sasha's 11 Austrian takes: refiled to target2 — and the answer is that there is nothing to refile

**2026-08-19. Nothing was written. That is the finding, not a failure.**

## The brief

Tom's ruling: 11 takes Sasha recorded into `deu_at_for_eng` **target1** could never be
filed there, because target1 still holds Azure's `de-AT-IngridNeural` and the backfill's
human-voice guard refused — correctly — to credit a human recording to a synthetic voice.
target1 does **not** become a second slot for her; the two-slot design exists so learners
hear two *different* voices. So: treat the 11 as mis-slotted recordings of her voice and
file them to **target2**, where she is genuinely cast, under this repo's normal
take-selection rule.

## What the 11 actually are

Re-derived through the reviewed tool (`tools/recording/backfill-orphan-takes.cjs`, run
from the `-prod` checkout on `main` at `32642565`), not from memory. All 11 confirmed:
natural cadence, `deu_at_for_eng`, role `target1`, recorded 2026-08-07 and 2026-08-08,
S3 objects all present, non-zero, `audio/mpeg`, and **all 11 decode under ffprobe**.

They are **not 11 lines. They are 5 lines, recorded 11 times.**

| line | takes | dates |
|---|---|---|
| i wü iatz wos auf Deitsch sogn | 3 | 08-07 ×2, 08-08 |
| i wer mit wem aundern reden übn | 2 | 08-07, 08-08 |
| i versuch zum lernen, wia ma redt | 2 | 08-07, 08-08 |
| i wü mit dir lernen, wia ma wos sogt | 2 | 08-07, 08-08 |
| wia ma so oft wia möglich redt | 2 | 08-07, 08-08 |

Newest-take-wins collapses those 11 to **5 winners**; 6 are superseded retakes and were
never candidates for anything.

## Why all 5 winners are parked

Those same 5 lines were re-recorded by Sasha **on target2, on 2026-08-19 at 13:34** — the
correct slot, with her cast voice — and yesterday's backfill already filed all five as
live `course_audio` rows. The refile therefore lands on an identity that is already
occupied by a take **eleven days newer** than the one being refiled.

The repo's rule for that case is not ambiguous: newest take wins, and an occupied identity
is refused rather than overwritten. Filing any of the 11 would mean putting a
2026-08-07/08 read in front of a learner *in place of* the 2026-08-19 read she recorded
to replace it. Per Tom's instruction not to force it, all 11 are parked.

| take (winner) | line | incumbent `course_audio` | incumbent recorded |
|---|---|---|---|
| 75299682… | i wü iatz wos auf Deitsch sogn | `bba5d9fe…` | 2026-08-19 13:33:51 |
| FBC49113… | i wer mit wem aundern reden übn | `86dd7da5…` | 2026-08-19 13:34:05 |
| 9E727978… | i versuch zum lernen, wia ma redt | `a3e7297a…` | 2026-08-19 13:34:14 |
| D6525FCB… | i wü mit dir lernen, wia ma wos sogt | `582de4ad…` | 2026-08-19 13:34:26 |
| 4695989A… | wia ma so oft wia möglich redt | `b0d69759…` | 2026-08-19 13:34:37 |

Nothing is lost: the 11 takes' bytes remain in S3, and the take-fallback on
`/api/production/audio/:uuid/stream` still plays every one of them back (3 spot-checked,
all 200 + decodable), so a recordist can still hear them.

## Playback verified from production

All five incumbent target2 clips streamed from the live API the recordist's browser hits
(`watson-1.tail4968cb.ts.net:8443`), 200 + `audio/mpeg`, each decoding to exactly the
duration stored on its row:

```
bba5d9fe…  200  26330 B  1.593 s   (row says 1593 ms)
86dd7da5…  200  25076 B  1.507 s   (1507 ms)
a3e7297a…  200  25494 B  1.540 s   (1540 ms)
582de4ad…  200  28420 B  1.721 s   (1721 ms)
b0d69759…  200  24240 B  1.438 s   (1438 ms)
```

Every deu_at line Sasha has recorded is already servable in her cast slot. target1 stays
TTS until a genuinely different Austrian voice is cast.

## The tool change

Rather than a one-off script, `backfill-orphan-takes.cjs` gained
`--refile-from <role> --refile-to <role>` (plus `--probe`, which decode-verifies bytes in
a dry run). Every existing guard still applies and now applies to the **destination** slot:
the destination must itself resolve to a human voice, so a refile can no more credit a
human take to a synthetic slot than a plain backfill can, and the identity-occupied
refusal — now logging both takes' recording dates — is what makes an older mis-slotted
take unable to displace a newer correct one.

The mechanism is live and reusable; it just has no work to do here.

Full per-take verdicts: `docs/recording/deu-at-target1-refile-dryrun-log.json`.

## One loose thread, flagged not acted on

The parked target1 takes run notably longer than their target2 replacements for the same
line (e.g. 3.03 s vs 1.59 s, 2.68 s vs 1.51 s). Marked `natural` in provenance, but the
gap is large enough that some of the August 7–8 target1 reads may have been slow reads
mislabelled by the recorder. It changes nothing about the parking decision, and it is not
worth chasing unless those takes are ever wanted.
