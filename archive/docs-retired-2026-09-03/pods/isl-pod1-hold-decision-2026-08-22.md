# Icelandic (isl_for_eng) free-tier pod — HOLD, not flipped, 2026-08-22

> ## ⚠️ SUPERSEDED 2026-08-24 — the numbers below are history, not state
>
> **This page's "10 of 231 quarantined" is no longer true and must not be quoted
> in any report.** The hold was lifted under Tom's A-230 ruling on 2026-08-24.
> Measured from the database at 2026-08-24 10:05Z:
>
> - `isl_for_eng:pod-0-unrecorded` is **231/231 target and 231/231 known**, with
>   **zero off-cast clips on either track** (`unlink-off-cast-pod-clips` dry-run,
>   both tracks: "231 on-cast, 0 OFF-CAST").
> - The last two holdouts closed today: `SC17-S008` ("Er vatnið volgt?") rendered
>   at 08:34Z, and `SC20-S007` was **rephrased and re-rendered** at 09:59Z —
>   see [`isl-sc20-s007-rephrase-2026-08-24.md`](./isl-sc20-s007-rephrase-2026-08-24.md).
> - The 2026-08-22 diagnosis below — `whisper-small` is too weak for Icelandic,
>   and the gate was refusing audio it could not read — still stands and is not
>   overturned. What is stale is only the count.
>
> Keep reading for the decoder-strength evidence; ignore the counts.
> Intermediate record: [`isl-pod1-a230-2026-08-24.md`](./isl-pod1-a230-2026-08-24.md).

Romanian, Swedish and Basque all flipped to `pod-1` tonight. Icelandic did not.
This is the decision record for why, and the fork for what happens next.

## What it is, in one sentence

11 of Icelandic's 231 target clips were quarantined by the veracity gate; a
real checker bug got fixed and landed, one of the 11 now genuinely passes,
but the other 10 still fail an honest check under the audio gate as it is
actually deployed tonight — so the course stays on `pod-0` rather than
flipping on unverified audio.

## My recommendation

**Hold Icelandic tonight.** Land the checker fix (done), but don't flip on
a course where 10 of 231 slots would have no verified target audio. One
word: **hold**.

## What actually happened

### 1. The checker bug was real, and I fixed it

`SC12-S010` ("19. 20. 21. Miðvikudagur. Fimmtudagur.") was quarantined at
CER 0.43–0.74 across all 3 render attempts, even though whisper heard the
numerals correctly — the exact defect class fixed for Portuguese earlier
today (commit `5668ddb7c`), just missing the Icelandic entry. Icelandic
cardinals inflect for gender (einn/ein/eitt), so I added a lexicon offering
neuter as the default reading and masculine/feminine as alternative
readings, with tests using the real quarantined line as a fixture plus a
negative control proving a genuinely wrong number is still convicted.
Landed on `main` at commit `d65aef356`, deployed, verified live.

**Scope check, not assumed:** `is` is the only new lexicon key, and
`isl_for_eng` is the only course in the database with `language='isl'`
audio — so this change cannot flip any other course's verdicts.

### 2. What the fix actually bought — the honest number is 1, not 11

I re-rendered the 11 originally-quarantined sentences. The render pipeline's
graduated sampler (10% opening rate, relaxing further from there — a
deliberate per-course design, not a bug) meant only 1 of the 11 fresh
renders got a real veracity check; the other 9 published on trust.

**I did not trust that.** I independently re-ran the exact same checker
logic (`verdictFromDecode`, deployed model) against all 9 "trusted" clips'
actual bytes. **All 9 would have failed** the real gate — the sampler had
let genuinely bad audio through unverified. I unlinked them (never deleted
the underlying files — they're archived, not gone) rather than let unverified
audio sit live in a course about to be presented as flip-ready.

So the real count, checked honestly against the audio gate as deployed
tonight: **1 of 11 passes** (`SC07-S002`, CER 0.276, genuinely checked).
**10 of 11 still fail or are unresolved.**

### 3. Why the other 10 don't clear — a decoder-strength gap, not (mostly) bad audio

I decoded all 11 clips' audio with `whisper-medium` (available on this box,
not what's deployed) as a diagnostic, pinned to `is`. Medium recovers most
of them cleanly:

| Sentence | Small (deployed) | Medium (diagnostic only) |
|---|---|---|
| SC03-S007 | fail (CER 0.35–0.50) | still borderline-fail (CER 0.30–0.35) |
| SC07-S002 | **pass** (0.276, real check) | — |
| SC07-S012 | fail (0.50) | pass (0.08) |
| SC12-S010 | fail (0.38–0.47, even with the numeral fix) | pass (0.24–0.29, numeral fix required) |
| SC14-S006 | fail (0.40) | pass (0.22) |
| SC17-S003 | fail (0.37) | pass (0.11) |
| SC17-S008 | fail (0.40–0.53, quarantined again 4×) | borderline (0.33, still fails threshold) |
| SC18-S002 | fail (0.55) | still fails (0.45–0.50) |
| SC18-S004 | fail (0.39) | pass (0.11–0.22) |
| SC18-S007 | fail (0.42) | pass (0.09–0.15) |
| SC20-S007 | fail (0.67–0.71) | borderline (0.19 first take, 0.33 fresh take — inconsistent) |

Read plainly: **most of these 10 are a decoder-strength gap, not a
mispronunciation gap.** `whisper-small` (the deployed default, fitted on
German and English per the module's own header) is measurably too weak
for Icelandic's phonology on short, compound-noun-heavy clips. 6–7 of the
10 clear cleanly on medium; 2–3 (`SC03-S007`, `SC18-S002`, and `SC17-S008`
on a bad day) stay borderline-to-genuinely-wrong even on medium, and are
plausibly real TTS mispronunciation of long compounds (matseðilinn,
appelsínusafa) rather than a decoder problem.

**I did not switch the deployed model to medium.** `WHISPER_MODEL` is a
single process-wide constant, not configurable per course or language.
Switching it globally would change every decode across the whole estate,
and the module's own doctrine is "MEASURED, not assumed" — exactly what a
global model swap on the strength of one course's 10 clips is not. That is
a real, separate decision, scoped much bigger than tonight's job, and it is
not mine to make unilaterally.

### 4. Which of the three findings — stated plainly

- **Checker false alarm**: confirmed for the numeral class (`SC12-S010`) —
  fixed, landed, real.
- **Decoder-strength gap** (new category, not one of the three named in the
  brief, but the honest one): the deployed `whisper-small` is under-powered
  for Icelandic; a stronger decoder recovers most of the rest. This is a
  measurement finding, not a fix I can land tonight without a broader,
  measured model-swap decision.
- **Genuinely bad audio**: plausible for 2–3 clips specifically
  (`SC03-S007`, `SC18-S002`) — both are long, unusual Icelandic compound
  nouns (matseðilinn = menu, appelsínusafa = orange juice), consistently
  garbled across every one of 3–4 independent TTS renders, on both models.
  That consistency across renders (not random ASR noise) is what points at
  the audio itself rather than the checker.

## Listen for yourself — the 10 unresolved clips, script alongside audio

Casting is Tom's ear, not mine — nothing here recommends a voice swap; a
different voice was never tried, since Icelandic's existing pair is already
approved and this is a decoder/pronunciation question, not a casting one.

| Sentence | Script | Listen |
|---|---|---|
| SC03-S007 | Já, viltu matseðilinn? | https://watson-1.tail4968cb.ts.net/evidence/isl-pod1-quarantine-2026-08-22/SC03-S007.mp3 |
| SC07-S012 | Auðvitað. Þarna er posinn. | https://watson-1.tail4968cb.ts.net/evidence/isl-pod1-quarantine-2026-08-22/SC07-S012.mp3 |
| SC12-S010 | 19. 20. 21. Miðvikudagur. Fimmtudagur. | https://watson-1.tail4968cb.ts.net/evidence/isl-pod1-quarantine-2026-08-22/SC12-S010.mp3 |
| SC14-S006 | Já, ég skutla þér beint að miðasölunni. | https://watson-1.tail4968cb.ts.net/evidence/isl-pod1-quarantine-2026-08-22/SC14-S006.mp3 |
| SC17-S003 | Getum við sett það á herbergið, takk? | https://watson-1.tail4968cb.ts.net/evidence/isl-pod1-quarantine-2026-08-22/SC17-S003.mp3 |
| SC17-S008 | Er vatnið volgt? | https://watson-1.tail4968cb.ts.net/evidence/isl-pod1-quarantine-2026-08-22/SC17-S008.mp3 |
| SC18-S002 | Ertu með appelsínusafa? | https://watson-1.tail4968cb.ts.net/evidence/isl-pod1-quarantine-2026-08-22/SC18-S002.mp3 |
| SC18-S004 | Fer báturinn héðan? | https://watson-1.tail4968cb.ts.net/evidence/isl-pod1-quarantine-2026-08-22/SC18-S004.mp3 |
| SC18-S007 | Er það rétt? Hef ég rétt fyrir mér? | https://watson-1.tail4968cb.ts.net/evidence/isl-pod1-quarantine-2026-08-22/SC18-S007.mp3 |
| SC20-S007 | Gangi þér vel með það! | https://watson-1.tail4968cb.ts.net/evidence/isl-pod1-quarantine-2026-08-22/SC20-S007.mp3 |

## The fork, if you disagree with "hold"

- **Hold Icelandic** (my recommendation) until either a stronger decoder is
  measured and rolled out estate-wide, or these specific clips get a fresh
  render that clears the deployed small-model gate.
- **Accept as-is and flip anyway** — under the player's plays-what-it-has
  doctrine, these 10 slots would simply carry no target audio rather than
  bad audio (the gate never links a failing clip). This is a real option,
  not a broken one, but it means 10 of 231 lines are silently silent on
  launch.

## State left behind

- `services/audio-veracity.cjs` / `.test.cjs`: Icelandic numeral lexicon,
  landed on `main`, deployed and running live.
- Database (`listening_pod_sentences`, `isl_for_eng:pod-0-unrecorded`):
  221/231 target rows resolved (was 220/231 before tonight — net +1,
  `SC07-S002`), 10/231 honestly unresolved. No bad audio is live-linked.
  The 10 rejected takes' underlying `target_audio` rows are untouched,
  archived, not deleted.
- The systemd sampling override I used to get an honest check on the fresh
  renders (`AUDIO_VERACITY_SAMPLE_FIRST=1.0`, temporary) was removed and
  the service restarted back to normal defaults — this was never left live.
- Icelandic pod-0 is untouched and fully playable. No migration, no
  switchover, nothing pending.
