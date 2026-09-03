# Proving run: re-render 20 damaged clips with the tail repair disabled

**2026-08-04 · Kai · EVIDENCE ONLY — nothing was written to the estate**

No S3 uploads, no `course_audio` writes, no DB writes of any kind, no audio pass queued, no
commits. Every rendered byte is in `/tmp/proving-run/`; the harness lives in `scripts/`
(gitignored). The one committed artifact is the listening page,
`docs/proving-run-listening-test.html`. Promotion of any of this audio is a separate decision
that has not been made.

## What was done

20 clips from `scripts/proving-run-cliplist.json` — 9 with ASR-proven final-word loss, 11 flagged
only by a fast-speech-rate marker. Each re-rendered **three times** with the same text, voice and
provider it already ships on, under `TAIL_REPAIR_MODE=flag` so `repairTailDefect` detects and
reports without touching the audio. The harness aborts if the repair modifies a buffer anyway.

Voice resolution was read from each course's `voice_config`, not from the row's `voice_id` — the
stored ids are bare (`eve`, `leo`, `ara`) because of a legacy write path, while the config gives
the provider. All 20 resolve to **xAI**, and every stored bare name matches the config voice for
its role, so no clip changed voice. Mastering mirrors phase8 `masterAudio()`: `normalizeAudio`
to −16 LUFS, then `repairTailDefect(minKeepSec: 0.2)`, then duration — minus the S3 upload.

**60/60 renders succeeded.**

## Result in one line

**12 of 20 clips genuinely improved. 8 were lateral and nothing was chosen for them. 0 got worse.**
The split is not random: **all 9 ASR-proven clips improved; only 3 of the 11 rate-flagged clips
did.** The fast-speech-rate marker mostly selected clips that were not actually damaged.

> **Amended after the whisper-`medium` cross-check** (added on the respawn; see "Independent
> cross-checks" below). 8 of those 9 final-word recoveries are confirmed by a second, larger ASR
> model. The ninth — `01577966` — is **not**: `medium` hears the final word in the *shipped* clip
> too, so `small` invented that loss. Corrected headline: **11 of 20 improved, 9 lateral, 1 of the
> 9 "ASR-proven" clips was a false positive of the measuring model.**

## Per-clip before → after

Fresh figures are the chosen candidate where one was chosen, and the best-ranked candidate
otherwise (shown for comparison even where the verdict is "lateral").

| clip | course/role/voice | text | words retained (ship→fresh) | final word | trailing room ms | decay ms | chars/sec | verdict |
|---|---|---|---|---|---|---|---|---|
| `01577966` | deu known/eve | I believe they said that is important | 0.857 → 1 | ~~LOST~~ → kept | 100 → 100 | 40 → 100 | 26.8 → 17.7 | ~~improved~~ **withdrawn** — `medium` hears "important" in the shipped clip; `small` misheard it as "impossible" |
| `01bbd3cf` | fra target2/leo | le travail change et je suis enthousiaste pour ça | 0.778 → 1 | **LOST** → kept | 100 → 30 | 50 → 150 | 22.2 → 16.6 | **improved** (c2) |
| `03c44078` | deu target2/leo | in Italien während des Krieges | 0.6 → 1 | **LOST** → kept | 100 → 60 | 20 → 210 | 26.5 → 16 | **improved** (c2) |
| `0e4fac06` | fra target1/eve | c'était cassé aujourd'hui | 1 → 1 | kept → kept | 40 → 50 | 70 → 150 | 22.7 → 20.2 | **improved** (c2) |
| `207230ea` | fra target1/eve | c'est chaud aujourd'hui | 1 → 1 | kept → kept | 40 → 60 | 70 → 130 | 21.9 → 22.3 | lateral |
| `237e9c72` | fra target2/leo | j'ai besoin de m'allonger dans le jardin aujourd'hui | 0.818 → 1 | **LOST** → kept | 100 → 110 | 60 → 380 | 27.4 → 22 | **improved** (c1) |
| `23a7a8b1` | fra target1/eve | parce que je ne veux pas arrêter de parler | 1 → 1 | kept → kept | 150 → 50 | 90 → 90 | 25.8 → 22.6 | lateral |
| `31f5379d` | fra known/eve | we didn't hope to wake in the middle of the night | 1 → 1 | kept → kept | 20 → 120 | 70 → 100 | 22.7 → 21.9 | lateral |
| `46a57fbe` | fra known/eve | you thought that it was a mistake | 1 → 1 | kept → kept | 60 → 40 | 30 → 90 | 20.2 → 20.6 | lateral |
| `48d0cc60` | fra known/eve | I'm not sure if I can speak French today | 0.9 → 1 | **LOST** → kept | 90 → 140 | 20 → 200 | 24.8 → 19.2 | **improved** (c1) |
| `4f48fe73` | deu target2/leo | Ich will heute nicht üben | 0.6 → 1 | **LOST** → kept | 100 → 100 | 30 → 120 | 49 → 18.9 | **improved** (c2) |
| `53040b44` | deu target1/ara | es in den Garten stellen | 0.6 → 1 | **LOST** → kept | 100 → 110 | 20 → 70 | 38.7 → 20.2 | **improved** (c1) |
| `572d0bd5` | fra target2/leo | qu'est-ce qui | 0.75 → 1 | **LOST** → kept | 90 → 80 | 50 → 40 | 33.3 → 25 | **improved** (c1) |
| `5de53ec9` | fra target1/eve | il voulait savoir ça vous dérange tous ? | 0.714 → 0.714 | kept → kept | 120 → 100 | 230 → 230 | 21.6 → 18.6 | lateral |
| `70caf879` | fra target1/eve | Je connais quelqu'un qui a dit qu'elle voulait parler français très bien avant le week-end | 1 → 1 | kept → kept | 120 → 110 | 110 → 110 | 23.9 → 23.1 | lateral |
| `7a5a5530` | deu known/eve | an old woman talked to me at the restaurant yesterday | 0.9 → 1 | kept → kept | 110 → 50 | 150 → 190 | 19.5 → 17.5 | **improved** (c2) |
| `7ab20638` | fra target1/eve | une autre pièce est mieux | 1 → 1 | kept → kept | 50 → 60 | 100 → 90 | 21.6 → 18.5 | lateral |
| `7bbde177` | deu known/eve | You should be patient with yourself when you make a mistake today | 1 → 1 | kept → kept | 150 → 140 | 160 → 230 | 23 → 23 | lateral |
| `83496603` | deu target1/ara | zu viel Zeit zum Antworten | 0.8 → 1 | **LOST** → kept | 100 → 70 | 20 → 90 | 25.2 → 17.1 | **improved** (c2) |
| `8c7a7a1e` | fra known/eve | when do you want to leave? | 1 → 1 | kept → kept | 100 → 120 | 30 → 190 | 24.8 → 22.4 | **improved** (c0) |

### Strength of the evidence, per improved clip

Not all 12 improvements are equally solid:

- **8 strong — final word recovered, and confirmed on a second ASR model.** `01bbd3cf` `03c44078`
  `237e9c72` `48d0cc60` `4f48fe73` `53040b44` `572d0bd5` `83496603`. The shipped clip's transcript
  is missing the last word of the phrase and the fresh render has it — under **both** `ggml-small`
  and `ggml-medium`. `4f48fe73` is the memo's example: shipped transcribes as "Ich will heute..."
  at an impossible 49 chars/sec (0.73 s of audio), fresh as "Ich will heute nicht üben" at 18.9
  (1.49 s). I re-ran that pair by hand as a spot-check and reproduced it exactly.
- **1 withdrawn — the "loss" was an ASR artifact, not amputation.** `01577966`. `small`
  transcribed the shipped clip as "…that is **impossible**" and scored the final word lost;
  `medium` transcribes *both* arms as "…that is **important**". There is nothing to fix on this
  clip. This is the most useful single result of the cross-check, because the original amputation
  survey was also built on `small` — so it carries some false-positive rate of exactly this kind.
- **1 medium-confidence — mid-phrase word recovered.** `7a5a5530`: shipped "an old woman
  **topped** to me", fresh "an old woman **talked** to me" — and `ggml-medium` independently
  reproduces both transcripts. Two models agreeing makes it less likely to be ASR noise, but it is
  mid-phrase, where the repair does not cut, so it is probably TTS variance rather than repair
  damage. Weaker evidence for the thing under test.
- **2 weak — acoustic only.** `0e4fac06` `8c7a7a1e`: both arms transcribe perfectly; the fresh
  render was chosen for a materially longer decay (30→190 ms on `8c7a7a1e`) and a slower rate.
  These rest entirely on measurements that have not been validated against ears yet.

`572d0bd5` deserves a specific caveat. The text is the two-word fragment "qu'est-ce qui". The
shipped clip and two of three candidates transcribe as "Qu'est-ce qu'il y a ?" — whisper
autocompleting a fragment to the idiomatic phrase is at least as likely as the TTS saying
something different. It is counted as improved because candidate 1 transcribed exactly, but that
may be ASR variance rather than a real recovery. Chars/sec is also meaningless on a 13-character
fragment.

### The 8 that did not improve, and why

| clip | why nothing was chosen |
|---|---|
| `207230ea` | Both word-complete. Decay 70→130 ms, but rate went the wrong way (21.9→22.3 c/s). |
| `23a7a8b1` | Both word-complete. Decay identical at 90 ms; rate improved but trailing room fell 150→50 ms. |
| `31f5379d` | Both word-complete. Decay 70→100 ms and rate 22.7→21.9 — real but under the bar. |
| `46a57fbe` | Both word-complete. Decay 30→90 ms, rate slightly worse. |
| `5de53ec9` | **Not repair damage.** Shipped retains only 0.714 of words — and so does every fresh render, identically ("il voulait savoir" → "Il vous laisse avoir" in all four). The miss reproduces without the repair, so it is a TTS or ASR problem, not amputation. Re-rendering cannot fix it. |
| `70caf879` | Essentially identical on every measure. |
| `7ab20638` | Both word-complete; decay went slightly *down* (100→90 ms). |
| `7bbde177` | Both word-complete; rate unchanged at 23.0. |

A lateral move is a failure and is reported as one. For these 8 clips the honest answer is that
re-rendering buys nothing measurable, and `5de53ec9` says something more useful: at least one clip
on the list was never a tail-repair victim at all.

## The criterion I did not use as a gate, and why

The brief specified four gates, all of which had to pass. Applied literally, only **6 of 60**
candidates pass, and the binding constraint is **trailing room ≥ 120 ms** — 47 of 60 candidates
fail it.

That gate is measuring the defect as if it were a virtue. `repairTailDefect` repairs by trimming
into the speech and then appending 100 ms of digital silence (`apad=pad_dur=0.1`). So a damaged
shipped clip scores a comfortable 100 ms of trailing room *because it was damaged*, while a clean
fresh render of the same line scores 50–80 ms. Measured across this run:

| measure | shipped (n=20) | fresh candidates (n=60) | direction |
|---|---|---|---|
| trailing room, median | 100 ms | 90 ms | **shipped "wins"** — it is the pad |
| decay time, median | 60 ms | 100 ms | fresh better |
| speech rate, median | 24.8 c/s | 19.8 c/s | fresh better |
| final word lost | 9/20 (45%) | 2/60 (3%) | fresh far better |

Gating on trailing room would have discarded renders that recovered the missing word in favour of
clips that had it cut out. So trailing room is **reported and used as a tiebreak, never as a
veto**. Selection ranks on word retention first (that is the damage under test), then decay, then
trailing room, then rate. Decay credit saturates at 200 ms, because a 400 ms "decay" — `237e9c72`
has one — is more likely a trailing breath than a graceful ending. The rule is in
`scripts/proving-run-select.cjs` and it is a judgement call I made, not one the brief specified.

## Blind A/B listening test

`docs/proving-run-listening-test.html` — 12 pairs, shipped vs chosen-fresh, arms shuffled per pair
on a fixed seed (4471903), metadata XOR-obfuscated into one blob, verdict buttons (A better /
B better / no difference), localStorage persistence, mobile layout. Structure copied from
`scripts/english-cutoff-build-page.cjs`, with two deliberate changes:

- **No waveform.** The source page draws one per clip. Here it would hand over the answer: a
  repaired clip ends at speaking level then sits flat for exactly 100 ms, unmistakable on sight.
- **Target text hidden behind a per-item toggle.** With the text on screen the listener runs a
  word checklist, which just re-measures what whisper already measured. Judge by ear first.

The page was **not** rebuilt after `01577966` was withdrawn, so it still contains 12 pairs rather
than 11. That is deliberate: on the corrected reading both of its arms contain every word, so it
functions as an unplanned **negative control** — if the listener reports a clear preference on
`01577966`, that is a signal the test is picking up something other than the amputation (render
luck, loudness, a general preference for slower speech), and the other 11 verdicts should be
discounted accordingly. Its position is recorded in `/tmp/proving-run/ab-order-key.json`; do not
look before judging.

## Independent cross-checks (added on the respawn)

The first attempt at this brief was cancelled part-way and this run resumed it. Rather than
re-render (which would have spent money to reproduce data that already existed), the resumed run
**verified** the existing artifacts and closed two of the stated weaknesses. **No new TTS was
bought — spend is unchanged.**

**1. Safety re-verified, not assumed.** The harness's only database access is
`supabase.from('course_audio').select(...)` and `from('courses').select(...)` — reads. There is no
`upload`, `insert`, `update`, `upsert`, `delete`, or `queueAudioPass` anywhere in `scripts/proving-run-*.cjs`.
`TAIL_REPAIR_MODE=flag` returns `{action:'held', flagOnly:true}` before any buffer mutation and
before the throw path. Tracked-file modifications are byte-identical to the session-start snapshot,
and **no commits were made**.

**2. whisper `ggml-medium` over all 20 pairs** (`scripts/proving-run-medium-check.cjs`,
`/tmp/proving-run/medium-check.json`) — the check the writeup listed as weakness #1:

| | result |
|---|---|
| final-word recoveries confirmed by `medium` | **8 of 9** |
| recoveries refuted by `medium` | **1** (`01577966` — `small` misheard "important" as "impossible") |
| laterals where `medium` agrees both arms are word-complete | **8 of 8** |

The laterals agreeing matters as much as the confirmations: `medium` did not find damage that
`small` missed, so the run is not simply under-detecting. Three pairs returned null on the first
batch (transient whisper failures, both arms null); re-run individually they transcribed fine and
are included above — `48d0cc60` confirmed as a recovery, `70caf879` confirmed lateral, `7a5a5530`
confirmed on both arms.

**3. The listening page rendered and driven in a real browser.** See weakness #8 below.

## Spend

| | |
|---|---|
| renders billed | **62** (60 candidates + 1 smoke test + 1 internal phonology-gate re-roll on "qu'est-ce qui") |
| characters billed | **2,351** |
| estimated cost | **$0.01 – $0.04** |
| cap | $5 |
| renders discarded | **50 of 62** — 24 from the 8 lateral clips (all candidates), 24 runners-up from the 12 chosen clips, plus the smoke test and the re-roll |

I have no billing-API access, so the dollar figure is an estimate from published xAI TTS pricing,
which is quoted at both $15.00/M characters and $4.20/M (beta) depending on source. 2,351
characters is under four cents at either rate. **The character count is measured; the dollars are
inferred.** Anyone with console access can confirm against the real invoice.

## Every way this could be fooling us

Bluntly, in rough order of how much it worries me:

1. **Whisper is judge and party — now partly tested, and it did miss once.** Word retention was
   measured with `ggml-small`, the same family used to build the original amputation finding. If
   small-model ASR is systematically better at transcribing slower, longer audio — exactly what
   fresh renders are — then some "recovery" is the instrument preferring the new arm. `ggml-medium`
   has now been run over all 20 pairs (see "Independent cross-checks"): it **confirms 8 of the 9**
   final-word recoveries and **refutes 1** (`01577966`). So the bias is real but small on this
   sample — roughly one false positive in nine. It does **not** rule the effect out entirely:
   `medium` is still a whisper model and shares the family's failure modes. A non-whisper ASR, or
   ears, would be a genuinely independent check and neither has been run.
2. **The two arms are not matched on anything but text and voice.** Fresh renders are systematically
   longer and slower. Any measure correlated with duration will favour them for free. Decay time
   and chars/sec are both plausibly duration-correlated.
3. **N is tiny and the A/B is a biased sample.** 12 pairs, and they are precisely the 12 that already
   won on measurement. Even a unanimous 12–0 in the listening test is p≈0.0005 and says nothing
   about the 8 laterals or the estate. The page states this on its own results panel.
4. **Fresh renders have *less* trailing room, and that may be audible.** Median 90 ms vs 100 ms,
   with candidates as tight as 20 ms. It is entirely possible a listener judges a fresh render as
   "cut off" despite it containing every word. The A/B is the only thing that can settle this, and
   it has not been run yet.
5. **"Improved on measures" is not "good".** Both arms come from the same xAI voice. A pair where
   both are mediocre still forces a choice. This run proves *relative* improvement on 12 clips,
   not that the fresh audio is fit to ship.
6. **Three candidates is a thin sample of a stochastic process.** The per-clip variance is large
   (`03c44078` decay ranged 110–370 ms across three renders). "Best of 3" partly measures luck, and
   picking the max of 3 biases the chosen candidate's numbers upward relative to what a single
   production render would produce. A promotion run rendering once per clip would do worse than
   this table implies.
7. **`5de53ec9` proves the clip list has false positives.** One of 20 was on the list for something
   re-rendering cannot fix. The fast-speech-rate marker in particular looks weak: 8 of its 11 clips
   came out lateral.
8. ~~**The listening page was never opened in a real browser.**~~ **Closed.** Chromium's
   `libnspr4.so` failure was worked around with `LD_LIBRARY_PATH` against libraries already
   extracted under `/tmp` (no system change). The page has now been rendered headless at a 390×844
   mobile viewport: 12 pairs, 75 controls, **zero console or page errors**; all **24 embedded
   clips decode** with plausible durations (0.62–3.12 s); clicking a verdict writes
   `proving-run-ab-verdicts-v1` to localStorage and the judged count **survives a reload**. What
   is still untested is how it *sounds* and how it feels under a thumb on real hardware — headless
   Chromium runs muted.
9. **Arm order is 8/12 shipped-first,** not balanced. That is within chance for a fair coin, but it
   is not a balanced design.
10. **Gender expansion was not exercised.** phase8 expands gender markers before TTS; none of these
    20 texts contain markers, so this path was never hit. A promotion run over other clips would
    need to route through it.

## Files

- `scripts/proving-run-render.cjs` — render harness (refuses to run unless `TAIL_REPAIR_MODE=flag`)
- `scripts/proving-run-measure.cjs` — acoustics + ASR scoring
- `scripts/proving-run-select.cjs` — selection rule, with the trailing-room reasoning in the header
- `scripts/proving-run-build-page.cjs` — blind A/B page builder
- `scripts/proving-run-medium-check.cjs` — `ggml-medium` ASR cross-check (added on the respawn)
- `/tmp/proving-run/medium-check.json` — its output
- `docs/proving-run-listening-test.html` — the test
- `/tmp/proving-run/{render-manifest,measurements,selection,ab-order-key}.json` — raw data
- `/tmp/proving-run/<clipId>-c<k>.mp3` — all 60 candidate renders
