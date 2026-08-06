# Where the German audio is actually being damaged — traced end to end

**2026-08-06.** Read-only trace, five parallel investigations. No audio was generated, no S3 object
written, no database row updated.

---

## The short version

The trace found **three things, and only one of them is damage.**

1. **The damage is written at render, not afterwards.** Nothing shortens a clip once it is stored.
   Every measurement agrees: 554 clips checked across three independent samples, **not one** is
   meaningfully shorter than the duration recorded when it was first mastered. The damage is baked
   into the object the moment it is first put in the bucket.

2. **The step that did it is already deleted.** `repairTailDefect`, wired into the mastering
   chokepoint every clip passes through, cut clips at a click-detector's timestamp, re-padded
   100 ms and faded — leaving a textbook-clean decay that every physical probe reads as healthy.
   It lived 24 July → 5 August. It explains damage to clips rendered in that window and nothing
   older, and **three quarters of the current flag list is older.**

3. **Repairs do not reach learners, and that is a separate fault.** On 3 August, 42,746 German rows
   had their audio pointer swapped to new objects **without bumping the revision**. The player's
   URL only carries a version when the revision is above 1, so those URLs never moved — and
   **94.8% of German plays never reach the server at all.**

And one finding that changes what the repair should cost:

4. **Most of the flagged clips are not damaged.** All 371 flagged presentation clips — 36% of the
   whole queue — are flagged for one artefact of how the check reads a cue phrase. The measured
   precision of the flag list is roughly **a third to a half**, not the 100% a 1,036-clip render
   queue assumes.

---

## 1. The damage is written at render

Three independent samples, all measuring the object S3 serves today against the `duration_ms`
recorded when the clip was first mastered:

| sample | clips | shortened after write |
|---|---|---|
| this trace, flagged + control | 54 | **0** |
| provenance worker, random across course | 500 | **0** |
| served-bytes worker, targeted at known damage | 25 | **0** |

Every difference was ±20–46 ms — MP3 frame-padding rounding, identical in flagged and healthy
clips alike.

This is corroborated from the code side. An audit of **all 15 sites in this repo that write an
audio object** found that every one mints a fresh `mastered/<UUID>.mp3`; **none writes over an
existing key.** The database's own audit log agrees: of 44,046 audit events on 3–4 August,
**0 were same-key overwrites** and 42,746 were pointer swaps to new objects. And the default
mastering chain was measured end to end as duration-neutral — 2.856000 s in, 2.856000 s out.

**So the "someone rewrote the bytes in place" hypothesis is dead.** Damage is present in the object
as first stored. That places it in the one gap the pipeline has: between the provider's response
and the PUT.

---

## 2. The named damaging step

`repairTailDefect` in `services/audio-processor.cjs`, called from `masterAudio` in
`services/phases/phase8-audio-v13.cjs` — the mastering step every TTS publish path goes through.

As it lived (`git show 8415f2d9^`):

```
atrim=end=${cutAt},asetpts=PTS-STARTPTS,areverse,afade=t=in:st=0:d=0.008,areverse,apad=pad_dur=0.1
```

`cutAt` came from `detectTailClick`, which cannot tell a tail click from a natural mid-sentence
pause. German word order makes a pause before the final verb routine, so the trim ate the final
verb. The 100 ms pad and the 8 ms fade then left a clean decay.

**That last detail is why this went unseen for so long, and I measured it directly.** Amplitude
envelopes from PCM, 10 ms frames, 25 flagged clips against a 29-clip control the same scan passed:

| group | median trailing silence | clips ending abruptly |
|---|---|---|
| flagged | 100 ms | **0%** |
| control | 100 ms | 7% |

Both groups end with the same clean ~100 ms tail. A damaged clip and a healthy one are
**acoustically indistinguishable at the tail**. The served-bytes worker hit this independently —
their first file-end energy test scored every amputated clip healthy, and they had to rebuild it
anchored at the onset of trailing silence.

`repairTailDefect` was deleted on 5 August on Tom's ruling (`8415f2d9`), and
`tools/verify-tail-repair-mode.cjs` now asserts it stays gone. German clips created on 5 August
flag at 0 of 21.

This confirms rather than replaces `docs/audio/tail-forensics-code-provenance-2026-08-06.md`, which
reached the same identification and named its own gap honestly.

### Two other proven trimmers — real, but not on this path

An audit measured both by running their exact filtergraphs over a real clip:

| path | threshold | measured loss | on the German course path? |
|---|---|---|---|
| human recording upload (`processRecordingBuffer`) | −40 dB | **443 ms (15.5%)** | **No** — RecordRoom human takes only |
| pod explainer edge-trim | −45 dB | **103 ms** | **No** — pod composites only |

Both are genuine hazards — a −40 dB threshold sits squarely inside a German word-final unvoiced
consonant, and neither path has any word-retention check before the PUT. Neither explains the
German course-phrase damage. **Worth fixing on their own merits; not this bug.**

---

## 3. The part that does not close

`repairTailDefect` existed from 24 July. **777 of the 1,036 flagged German clips — 75% — were
created before it existed**, and nothing shortened them afterwards.

So the named damaging step cannot account for three quarters of the current flag list. Section 4
shows a large part of that residue is not damage at all. What remains after that is genuinely
unexplained, and the most likely candidate is degraded provider responses at render time — the
boundary check that rejects empty provider responses only landed on 4 August (`e84e1c3f`). **I did
not prove this, and I am naming it as open rather than dressing it up.**

---

## 4. Most of the flagged clips are not damaged

The estate has just adopted the word-loss scan as ground truth for **selecting** clips to
re-render, replacing the fade predictor. That makes the scan's own precision a spending decision.
I measured it.

**The presentation artefact — 36% of the queue, one cause.** Every one of the 371 flagged
presentation clips (100%) has `is` as its expected final word: the cue format is
*"The German for: 'X', as in — '…', is:"*. Re-transcribed with the larger model, all seven sampled
presentation clips came back with the entire sentence perfect and only the trailing `is` absent.

Transcription cannot settle that, so I tested acoustically — is there speech energy after the last
transcribed word?

| result | clips |
|---|---|
| **yes — "is" is physically present, flag false** | **4 of 7** |
| no energy after the last word — genuinely absent | 3 of 7 |

**Short clips — 44% of the queue.** 454 of the 1,036 flags are one- or two-word clips, where
"final word missing" is fragile by construction. The re-transcriptions show why: `seit`→"Zeit",
`es`→"S", `denen`→"Dehnen", `far`→"Fah". These are homophones. The word is there; the recogniser
spelled it differently.

**The larger model recovers words the scan called missing.** Of 25 flagged clips re-transcribed,
**6 (24%) have their final word plainly present.** One clip is the whole story in miniature — same
bytes, two models:

| model | transcript |
|---|---|
| small (what the scan used) | "Ich frage mich, ob Sie heute Nachmittag da sein." |
| medium | "Ich frage mich, ob sie heute Nachmittag da sein **will**." |

Taken together with an independent worker's more careful pass — two whisper models plus a waveform
test, counting a word lost only when both models miss it — which classified 20 German clips as
**9 server-damaged, 3 clean, 3 clean-but-tail-suspect, 4 dead pointers, 1 needing an ear**, the
flag list runs at roughly **a third to a half real**.

**So the real damaged population is nearer 6–9% of clips than the 20.31% headline, and the
1,036-clip queue is roughly two to three times too big.** This is the same trap the estate already
avoided once: the fade predictor measured 9% precision by ear, and a prior ZUT sweep found 93% of
its flags were the audit checking the wrong unit.

---

## 5. Why the repairs never reached Tom's ear

This is a delivery fault, not damage, and it is fully established.

- **The URL only carries a version above revision 1.** In the learner app,
  `buildAudioRef(id, revision)` returns `` `${id}.v${revision}` `` only when `revision > 1`,
  otherwise the bare id. A revision-1 clip keeps a permanently cacheable URL forever.
- **On 3 August, 42,746 German rows were pointer-swapped to new objects with the revision left at
  1.** Course-wide, **86.6% of German revision-1 rows** point at an object newer than the row.
  `audio_revision = 1` does not mean "original" — it is wrong 86.6% of the time for German.
- **The cache key is the full URL, and it never expires.** No max-age, no eviction, survives a
  normal deploy. Cleared only by a semver content-version bump or the user tapping
  Settings → "Clear cache and reload".
- **The API proxy stamps `max-age=31536000, immutable`** on those bare-uuid URLs.
- **Result: 94.8% of German plays and 98.1% of all plays never reach the server.**
- **The promised database trigger does not exist.** A direct query found seven triggers on
  `course_audio`, none bumping `audio_revision`, and no function in the database references that
  column at all. The interim cache-busting bump was never run either: **867 of 1,074 known-damage
  clips (81%) are still at revision 1.**

**But it is not what Tom is hearing in Popty.** Popty mints a fresh presigned S3 URL per request
with `no-store`, so damage heard there is server-side by construction — and the served-bytes trace
found **zero** clips that were clean on the server and stale on the client. The staleness bites the
learning app, not Popty. Both faults are real; they are just not the same fault, and the earlier
single-clip finding does not generalise.

---

## 6. The gate that let it through

Independently worth knowing: **the veracity gate cannot see a missing final word.** It is
character-error-rate only, threshold 0.3. Fed real single-final-word truncations:

| expected | decoded | CER | verdict |
|---|---|---|---|
| Ich will jetzt mit dir Deutsch **sprechen** | Ich will jetzt mit dir Deutsch | 0.231 | **PASS** |
| Ich bin sehr müde heute **Abend** | Ich bin sehr müde heute | 0.207 | **PASS** |
| I am trying to learn how to **speak** | I am trying to learn how to | 0.182 | **PASS** |

Any phrase whose final word is under ~30% of its characters sails through — which is most phrases
in the estate. Two further holes: an unchecked verdict (`pass: null`) is not treated as a fault, so
a missing whisper binary means clips publish unchecked; and seven CJK/SEA languages run at
threshold 1.0, which is no check at all.

---

## 7. Which prior fixes were aimed at the wrong layer

Without blame — each was competent and honestly reported.

- **Four server-side content fixes** assumed *"if I fix the audio on the server, the learner hears
  the fix."* False for a revision-1 clip.
- **The tail-fade predictor sweep** aimed at a proxy rather than the defect, at ~1.4× better than
  chance. It was stopped before the money was spent — the right call.
- **The 3 August event was read as an in-place byte rewrite.** The audit log shows it was a
  pointer swap to new objects. The visible symptom is the same; the mechanism, and therefore the
  fix, is not.
- **The word-loss scan was adopted as ground truth without a precision measurement.** It is a far
  better *ordering* than the fade predictor, and it is still roughly half noise.

The shared false assumption in the first group is already named. This trace adds a second:
**a flag list is not a work list until it has been read against a control group.** Every
measurement in this job only became interpretable when clips the scan *passed* were measured the
same way — and one of them, the 3 August event, looked exactly like the smoking gun until the
control group showed it touched healthy clips identically.

---

## 8. What would prevent recurrence

- **The content-addressed design** (`AUDIO_PIPELINE_CONTENT_ADDRESSED_DESIGN-2026-08-06.md`) would
  have prevented the delivery half completely: if the key is a hash of the bytes, changed bytes are
  a different URL by construction, no cache can serve a stale copy, and nobody has to remember to
  bump a revision. The 3 August swap would have been visible instead of silent.
- **It would not have prevented the amputation.** `repairTailDefect` ran before the object was
  stored; a content-addressed store would have faithfully stored damaged bytes. What prevents that
  half is the rule the deletion already encodes: **no automated step may mutate a finished clip on
  a detector with unmeasured precision.** Detection may report for human ears; it may never gate,
  mutate or auto-act.
- **Make the gate able to see the defect it exists to catch.** A final-word retention check, not a
  character-error rate, and `pass: null` treated as a failure.
- **Measure precision against a control group before spending on a flag list.** Cheap, repeatable,
  and it would have caught both the fade predictor and the word-loss scan.

---

## 9. Gaps — what this trace could not establish

- **The pre-24-July flag population is unexplained** beyond the false-positive share (§3, §4).
  Degraded provider responses at render are the leading candidate; unproven.
- **When a word was lost is unrecoverable for the 3 August objects** — they are single-version in
  S3, so damage can be proved today but not dated.
- **The three pre-July clusters cannot be attributed to a tool.** The database audit log only
  starts 3 July. One signature was recovered: a 15 June cluster (654 German / 813 French objects)
  runs at double the bitrate of every other cluster and carries an `Lavf61.7.100` encoder tag,
  identifying a distinct ffmpeg-based tool. The others are ffprobe-indistinguishable.
- **The 2026-03-11 windows named in prior work are refuted** for these two courses — zero objects.
- **No browser was driven and no device inspected**, so the size of the stale population is
  inferred from the mechanism and telemetry, not observed on a phone.
- **No TTS was generated**, per the standing approval gate. The VOICELAB pilot's finding that fresh
  output is clean was taken as given.
- **12 dead German rows** point at `pending/` keys that were never generated — an Azure *English*
  voice on German presentations, NULL duration. A learner gets a 404. That is a missing-audio
  class, not a damage class.
