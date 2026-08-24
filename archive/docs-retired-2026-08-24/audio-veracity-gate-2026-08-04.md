# Audio veracity — the standing pre-publish gate and the fast repair loop

**2026-08-04/05.** Built from Tom's ruling on 4 August, in the conversation about the French render:

> "and this is all audio content so it appears in all environments immediately"
>
> "well, it means 2 things — if there's a problem, we need to fix it faster because it's in front of
> learners, and also, we need to be sure — to bring in all the better tools we've built to assess
> audio clips veracity"

Audio is not staged. The moment a clip lands in `course_audio` and its object is on S3, a learner
can hear it. So two things now exist:

1. **Nothing publishes without being checked.** `services/audio-veracity.cjs`, wired into every
   phase8 TTS publish path.
2. **Live defects are one command to fix.** `tools/audio-veracity-repair.cjs <course>`.

This is the DEFAULT for all future renders, all courses. Not opt-in.

---

## 0. Read this before you trust any number below

**The gate is validated on SILENCE and TRUNCATION. Mispronunciation is NOT covered and was never
tested** — there is no ground truth for it, and it is exactly the class where a free ASR decode
could launder a wrong word into the expected one, because the acoustic evidence is present but
wrong and the language model has something to guess from. Silence and truncation are structurally
safe from that: they remove the evidence entirely, so there is nothing to guess from.

A clean run of this gate says nothing about pronunciation. Do not let "98.8%" travel without this.

---

## 1. The method, and the trap it avoids

An **unprimed ASR round-trip**: decode the mastered audio with whisper that has NEVER seen the
expected text, then compare the two strings afterwards. Method, thresholds and evidence:
[`forced-alignment-2026-08-04/findings.md`](./forced-alignment-2026-08-04/findings.md).

**It is not forced alignment, and it must never become forced alignment.** That route was tested
and it fails — a truncated clip scored **1.000** under constrained decode while its healthy twin
scored 0.979, because "once the grammar removes the alternatives, the softmax renormalises over
what is left and the reported probability goes to ~1 regardless of the acoustics" (findings §5).
Whisper's free-decode token probabilities are equally worthless: `min_tok_p` is *worse* for healthy
clips than for silent stubs. The method works BECAUSE the decode is free. Reaching for a confidence
number is the wrong turn.

## 2. The operating point

| rule | value | source |
|---|---|---|
| decode is empty or a non-speech marker (`[BLANK_AUDIO]`, `[Musik]`, `(silence)`) | always fail | findings §1 |
| CER (character error rate, normalised) | fail at **≥ 0.3** | findings §1 |
| **AND** absolute edit distance | fail only at **≥ 6 characters** | new, §5 below |
| languages where 0.3 was never fitted (`zh yue ja th lo my km`) | CER threshold **1.0** | findings §7 gap |
| model | `ggml-small`, no priming, language pinned from `course_audio.language` | findings §6 |
| re-render attempts before quarantine | **3** total (1 + 2) | default |

All are named constants in `services/audio-veracity.cjs` with the evidence cited next to them, and
all are env-overridable. **Every one is a DEFAULT, not a ruling from Tom.**

## 3. Three outcomes, never two

`pass: true` / `pass: false` / **`pass: null`, meaning "I could not check this"**. A gate that
cannot tell a pass from an unchecked clip is the bug that bit this estate three times on 4 August —
the xAI phonology gate silently disabling itself on hard-coded macOS paths being the headline one.
Missing binary, missing model, `AUDIO_VERACITY_GATE=off`, download failure, decode error: each
prints one LOUD line naming what is missing and stating that clips are being **PUBLISHED
UNCHECKED**, and each is counted separately in the report. Unchecked is never folded into passed.

## 4. Where it sits

`services/phases/phase8-audio-v13.cjs`, in `/generate`, `/regenerate-role` and
`/generate-components`. In each: render → `masterAudio()` → **GATE** → S3 upload → `course_audio`
row → binding. After mastering because mastering is part of what can damage a clip; before the
upload because there is no staging.

- checked against `textForTTS` (post gender expansion), never `item.text` — the pre-expansion text
  would false-alarm on every gendered clip;
- fail → re-render → re-check, up to 3 attempts;
- still failing → **quarantine**: not uploaded, not inserted, not bound. A durable JSONL record
  plus the failing audio itself lands in `scripts/audio-veracity-quarantine/`, and the item fails
  its batch entry with the decode in the message. Never a silent skip;
- the batch carries on. One bad clip never fails a render pass;
- counts appear in the render log, the progress emit and the `/generate` response:
  **n checked / n failed / n re-rendered / n quarantined / n UNCHECKED**;
- Azure is deterministic, so a re-render there advances `regenerationAttempt` — otherwise the
  retry returns the same broken bytes.

Emergency off switch: `AUDIO_VERACITY_GATE=0`. It prints a loud line every time.

## 5. Validation — what was actually measured

### 5.1 Replay of the 165 labelled clips through the production module

`scripts/veracity-validate/replay.cjs` (gitignored) runs the real `services/audio-veracity.cjs`
over the experiment's labelled set:

| group | n | flagged |
|---|---:|---:|
| `silent_stub` | 25 | **25** |
| `near_silent` | 21 | **21** |
| `truncated` | 25 | **23** |
| `good_paired` | 50 | 0 |
| `good_unflagged` | 27 | 0 |
| `good_kept` | 17 | 13 — exactly the 13 findings §2 says are truncated |

After the findings' §2 reclassification: **97.6% recall (82/84), 0% false alarm (0/81).**
Runtime 3.2 s/clip at concurrency 4 on this 8-core box, including the mp3→wav conversion the
experiment did up front.

Two things the replay caught that the experiment code never had to care about:

- **`whisper-cli -nt` stdout DROPS segments the `-oj` JSON carries.** Measured on a two-segment
  German clip: stdout gave `"Aber ich will nicht fertig sein,"`, JSON gave the whole sentence. A
  gate reading stdout would have manufactured a truncation false alarm on every multi-segment clip
  in the estate. The module reads the JSON.
- **A near-silent Chinese clip decoded as `"字幕:J Chong"`** — whisper's signature subtitle-credit
  hallucination on silence. It sailed through when CER was merely advisory for unfitted languages,
  which is why those languages get a 1.0 threshold rather than no check.

### 5.2 The absolute edit floor — found by running it on the real estate

The first 12 live `deu_for_eng` clips the detector ever saw produced **7 "failures", all healthy**:

| expected | heard | CER | characters out |
|---|---|---:|---:|
| `mir` | `Mia.` | 0.33 | 1 |
| `er` | `Ja.` | 1.00 | 2 |
| `sie` | `Z.` | 1.00 | 3 |
| `Fehler` | `Fila.` | 0.67 | 3 |
| `verändert` | `verinnern.` | 0.33 | 3 |

CER is a ratio; on a two-character text the denominator is two, so any ASR near-miss looks
catastrophic. Single-LEGO clips are everywhere in this estate, so left alone this would have filled
every repair queue with healthy short clips.

So a clip must now be wrong by a large **fraction** *and* by at least **6 characters**. Replaying
the labelled set at floors 0/2/3/4/5/6, recall is **flat at 97.6% throughout** — no real defect in
the set is a near-miss — and at 6 the last genuine false alarm goes too. Every genuinely bad short
clip is caught by the non-speech rule, which the floor does not touch.

Independent of the curve fit: **a five-character difference is not a learner-facing audio defect
worth a re-render.** Silence and truncation are never five-character events.

After the floor: 60 live `deu_for_eng` clips checked, **0 failures, 0 unchecked**.

### 5.3 Agreement with the fra job's manual pilot

The `fra-audio-verify-and-render` session ran the same method by hand over 250 live `fra_for_eng`
clips ([`fra-render-pilot-gate-2026-08-04.md`](./fra-render-pilot-gate-2026-08-04.md)) and
hand-adjudicated the flags. Scoring their recorded decodes through this gate's rule — read-only, no
fra audio touched, no TTS:

| | result |
|---|---|
| raw agreement with their harness | **247 / 250 (98.8%)** |
| the one confirmed truncation, `"I'd like to guess"` → `"I'd like"` | **both flag it** (CER 0.53, 9 characters out) |
| the three they flagged and adjudicated as NOT defects — `"ce"`, `"vas"`, `"te"` | **this gate clears all three** (1–3 characters out) |
| clips this gate flags that they cleared | **0** |

So against the human-adjudicated ground truth the agreement is **exact**: one real defect caught,
zero false alarms. The three disagreements are all the short-text class §5.2 fixed — the fra
session hit the same problem independently and resolved it by hand; this gate resolves it by rule.

### 5.4 Does it catch tail-damaged clips? (input to the pending tail memo)

Relevant because `repairTailDefect` runs **inside** `masterAudio`
(`phase8-audio-v13.cjs:946`) and this gate checks `masterAudio`'s output — so it is structurally
positioned to catch tail damage. `docs/audio-tail-gate-decision-memo-2026-08-04.md` is still
awaiting Tom's ruling and **nothing here changes that function's behaviour**.

`scripts/veracity-validate/tail-probe.cjs`, read-only on copies:

**Dose-response, synthetic amputation of the tail on 12 healthy clips:**

| tail removed | flagged |
|---|---:|
| 150 ms | **0 / 12** |
| 300 ms | **0 / 12** |
| 500 ms | 5 / 12 |
| 800 ms | **12 / 12** |

**So: yes for a lost final word, no for a clipped tail.** An amputation that costs a whole word
(~800 ms at SSi speech rates) is caught every time. One that shaves ≤300 ms — an abrupt-sounding
cut-off that still contains all the words — is invisible to this gate, and always will be: the gate
asks whether the words are there, not whether the ending sounds right. If the "ends abruptly"
defect at ~45% of 7,209 clips is mostly the ≤300 ms kind, **this gate does not cover it** and the
tail memo's decision still matters on its own terms.

**Explicit gap:** the direct experiment — run the real `repairTailDefect` and score before/after —
returned nothing usable. It detected **no defect on any of 12 healthy `deu_for_eng` clips**, so
there was no repair to score. Consistent with the memo's 11.6% flag rate on a 12-clip sample, but
it means the before/after measurement was **not obtained**. Only the synthetic curve above is
evidence.

## 6. The repair loop

```
node tools/audio-veracity-repair.cjs <course>            # detect + cost. DRY RUN.
node tools/audio-veracity-repair.cjs <course> --limit 40 # pilot first, always
node tools/audio-veracity-repair.cjs <course> --apply    # RE-RENDERS. costs money.
```

Detect → re-render → replace, one motion. It does not re-implement replacement: it writes a repair
list in `tools/audio-batch-gate.cjs --out` shape and hands it to `tools/repair-silent-clips.cjs`,
which already mints a **new** audio id on purpose (the learning app serves audio
`immutable, max-age=31536000` and the player caches blobs in IndexedDB by audio id, so reusing the
id would never reach a device holding the bad bytes), heals every link, and can undo itself.

- **Dry run by default.** `--apply` is the only thing that spends money, and the plan prints the
  re-render count, the character count and a cost reference first.
- **It refuses to run if whisper is missing.** This tool *is* the acoustic check; reporting
  "0 defects" while blind is worse than not running.
- **Resumable and idempotent** — a cache keyed on audio id + `s3_key`, so a replaced clip is
  automatically re-checked and an interrupted sweep resumes.
- Never nominates `presentation` (deleting one CASCADEs into authored content) or `pod_*` rows.
- Compares against the **gender-expanded** text, like the pre-publish gate.

### Why it nominates `confirmed`, never `suspect`

`suspect` routes into `repair-silent-clips`' probe-and-keep branch — the logic findings §2 shows
has a hole:

> "It keeps a clip when a fresh render is a similar length — but if the provider truncates that
> text reproducibly, both renders are short and the clip is kept."

13 clips the 4 August `deu_for_eng` repair run probe-tested and deliberately kept are, on the
physical evidence, truncated, and the same path ran across the whole 4 August estate sweep. The
acoustic evidence IS the confirmation, so this tool bypasses that branch entirely.

### One change made to `repair-silent-clips.cjs`

`renderVerified` now also checks the **replacement** acoustically. Every other test it runs is
level and length; none can see a clip of plausible length and normal loudness that does not contain
the words, and the 4 August truncated set measures a perfectly normal −16.8 dB median. Without
this, the repair loop could replace bad audio with equally bad audio and certify it fixed. It
degrades: if whisper is absent, the old behaviour stands and the loud line says so.

**The probe-and-keep branch itself was NOT changed** — out of scope, and this tool routes around
it. Recommendation for Tom in §8.

## 7. Defaults flagged as defaults

None of these has a ruling. Each is a one-line change.

| default | value | why |
|---|---|---|
| CER threshold | 0.3 | findings §1 operating point, verbatim |
| absolute edit floor | 6 characters | §5.2 — measured, recall flat 0→6 |
| unfitted-language CER threshold | 1.0 | findings §7 gap; catches hallucination, cannot mass-quarantine |
| model | `ggml-small` | findings §6 — `medium` costs ~3× for headroom the result does not need |
| re-render attempts | 3 (1 + 2) | matches `repair-silent-clips`' budget for the same damage class |
| quarantine | durable JSONL + the audio kept | so a clip can be listened to; findings §7 notes nobody has |
| gate | ON everywhere, all courses | Tom's ruling |
| a failing clip | fails its item, never the batch | Tom's brief |

## 8. What needs Tom

1. **13 probe-kept `deu_for_eng` clips are live and look truncated** (findings §2), and the same
   probe-and-keep path ran across the whole 4 August estate sweep. This tool makes finding them
   cheap — one dry run per course, free, no TTS. **Nothing has been swept; that is not authorised.**
   Recommendation: run the dry detector across the estate, read the distribution, then decide.
2. **Should `repair-silent-clips`' probe-and-keep branch require an acoustic pass on the STORED
   clip before keeping it?** That closes the hole at source for every caller, not just this one.
   Not done — out of scope tonight.
3. **The tail memo is unaffected.** §5.4 is the input this job could contribute: the gate catches a
   lost final word, and is blind to a ≤300 ms clipped tail.
4. **Mispronunciation remains uncovered**, and it is the class Tom named first. Nothing in this job
   addresses it. `aligner-landscape.md` recommends torchaudio `forced_align` + `MMS_FA` if it is
   ever worth building — with a CC-BY-NC licence question to resolve before, not after.

---

*Code: `services/audio-veracity.cjs` (+ `.test.cjs`, 38 tests), `tools/audio-veracity-repair.cjs`,
`services/phases/phase8-audio-v13.cjs`, `tools/repair-silent-clips.cjs`.
Validation harnesses: `scripts/veracity-validate/` (gitignored workspace).*
