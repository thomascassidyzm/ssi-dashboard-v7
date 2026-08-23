# Why three of Catrin's four takes were empty

2026-08-23. Welsh north **Pod 1** (the data still calls it `cym_n_for_eng:pod-0`), recorded 14:44–14:48 UTC on a Blue Snowball into a Chromebook.

---

## For Aran and Catrin — the short version

**Nobody did anything wrong, and Catrin's microphone is fine.** The first take is a perfect read. The other three are the recorder saving the *quiet between the lines* instead of the lines.

Here is what happens. The recorder never stops. It runs from the moment the mic opens and keeps running the whole session, so that tapping **Next** a fraction early can never chop off the last word. It is supposed to throw away the dead air while you are between lines — and it does, **right up until it hears any voice at all on that line.** The moment it hears one, it decides the line has started and keeps everything from then until the next tap.

In a chalet with two people in it, that is the problem. **A word to each other between lines counts as the line starting.** From that point on, every tap of Next saves everything since the last tap — a chat, a pause, the room, and in one case a sheep.

The numbers say exactly that and there is no room to argue with them. Take 3 lasted 46.65 seconds; the gap between the two taps was 45.47 seconds. Take 4 lasted 31.46 seconds; the gap was 30.22 seconds. **Each empty take is precisely the wall-clock time since the previous tap**, plus the fraction of a second the recorder deliberately adds at each end.

### What Catrin can do right now

Three things, and they are all about the gap between lines rather than the reading itself:

1. **Tap Next, then read straight away.** The shorter the gap between the tap and the first word, the less there is to go wrong.
2. **Try not to talk between lines** — even quietly, even to each other. That is the thing that trips it.
3. **If you need a proper break, stop the session** and start it again after, rather than leaving it running.

Nothing else needs to change. Don't move room, don't touch the mic settings, don't hard-refresh — none of those are the cause.

### Are the takes she has already made safe?

- **Take 1 — "Bore da. Sut wyt ti?" — is good and is staying.**
- **Takes 2, 3 and 4 need re-recording.** They are now marked as bad in our records. Nothing was deleted.
- ⚠️ **Those three are currently live to learners.** They will play as background noise until they are re-recorded or unlinked. That is the one thing here that needs a decision rather than a fix — see below.

### One correction worth passing on

Aran wondered whether he "may not have been using the latest version". It is the other way round: **this behaviour needs the latest version.** The continuous-capture recorder landed on 22 August and the microphone change the day after that. An older bundle could not have produced these takes.

---

## The technical account

### The evidence

| # | Line | Duration | RMS | Dynamic range | Noise floor | Verdict |
|---|---|---|---|---|---|---|
| 1 | SC01-S002 "Bore da. Sut wyt ti?" | 3.25 s | −18.5 dBFS | **62.7 dB** | **−76 dBFS** | a genuine read |
| 2 | SC01-S004 | 96.80 s | −20.5 dBFS | 37.4 dB | −52.9 dBFS | the room |
| 3 | SC02-S001 | 46.65 s | −20.8 dBFS | 19.9 dB | −37.2 dBFS | the room (the sheep) |
| 4 | SC02-S002 | 31.46 s | −20.0 dBFS | 32.5 dB | −47.6 dBFS | the room |

The RMS column is why job #98's earlier read — "healthy RMS, the gain fix worked" — was true about level and wrong about content. All four measure like speech. The two columns that separate them are the ones nobody was looking at: the empty takes have **23 to 39 dB more room noise** and **25 to 43 dB less dynamic range** than the good one.

That is the signature of automatic gain control, and it is confirmed in the takes' own data rather than inferred. Every one of the four rows carries `capture:voice` in its `recording_device` string — the profile that asks for `autoGainControl: true`, landed the day before as `41980443b`. AGC amplifies a quiet room until it reads at voice level. **Tom's hypothesis was right.**

### The mechanism, proved by arithmetic

`PodLongTakeStudio.vue` uses `useTapRecorder`, which since `241431feb` (2026-08-21) records *continuously* rather than starting and stopping around each line. Its own header states the design:

> "A recorder is ALWAYS running while the mic is open — from `start()`, before the first line is even shown, and continuously thereafter."

The safety valve against shipping dead air is the pre-roll roll-over in `onMeterFrame`, and it fires only when **both** conditions hold:

```js
if (active && !lineHasSpeech.value &&
    t - active.startedAt > PRE_ROLL_MAX_MS &&
    t - lastQuietSince > ROLL_QUIET_MS) { … }
```

`lineHasSpeech` **latches**. Once anything crosses `speechFloor()` on a line it stays true until the next `beginLine()`, and the roll-over is disabled for the rest of that line. Under AGC, or with two people in the room, that latch is trivially easy to trip — and once tripped the pre-roll grows without bound until the tap.

The upload timestamps prove it left no room for doubt:

| Take | Gap since previous upload | Clip duration | Clip − gap |
|---|---|---|---|
| 2 | 123.775 s | 96.80 s | −26.98 s |
| 3 | 45.465 s | 46.65 s | **+1.185 s** |
| 4 | 30.215 s | 31.46 s | **+1.245 s** |

Takes 3 and 4 are each *longer* than the entire wall-clock gap since the previous tap, by 1.185 s and 1.245 s — two independent measurements agreeing to within 60 milliseconds, and both landing on `TAIL_MS` (900 ms) plus a slice of pre-roll. Those are the recorder's own constants showing up in production data. **The clip is everything between the two taps.**

Take 2 is 27 seconds *shorter* than its gap, which is the same story from the other side: the roll-over worked for the first 27 seconds of that line, then something crossed the speech floor, latched, and never worked again for the rest of the session.

So of the four candidate mechanisms in the brief, it is the third — the session running between takes — but **by design, with a level-based valve that AGC and crosstalk defeated.** It is not a mis-fired VAD segmentation (that lives on `AutocueStudio`, a different path), not a missed stop button (there is no stop to miss), and not a stale bundle (the behaviour requires the newest one).

### The gate

`services/recording-speech-gate.cjs`, wired into `POST /api/production/:courseCode/recording/upload` **before the S3 PUT**, so a refusal orphans no bytes and the raw original is retained regardless.

It asks how long the line *should* have taken — Tom's own syllable-rate model from `tiers/duration.cjs` — rather than how loud it is. Syllables in the script × the slowest plausible seconds-per-syllable (1.2), plus 4 seconds of grace. Measured on the four:

| Take | Syllables | Ceiling | Speech span | s/syllable | Verdict |
|---|---|---|---|---|---|
| 1 | 6 | 11.2 s | 2.67 s | **0.45** | pass — 3.4× under |
| 2 | 24 | 32.8 s | 96.50 s | 4.02 | refuse |
| 3 | 14 | 20.8 s | 46.16 s | 3.30 | refuse |
| 4 | 12 | 18.4 s | 31.45 s | 2.62 | refuse — 1.7× over |

Nobody speaks at three seconds per syllable. The signal does not depend on the language, the microphone or the room.

**Why not the veracity check, which is the obvious reach.** It was run on all four and it **cannot separate them** — measured, not assumed. It *fails the good take*: whisper-small hears "Bore da. Sut wyt ti?" as `"Poreddaa. Siwtwit'i."`, CER 0.50. And it hallucinates a paragraph of fluent-looking Welsh out of 96 seconds of noise on take 2, and `"Rwyf yn ffwrdd."` out of the sheep on take 3. Making an ASR decode the verdict here would lose real takes *and* pass empty ones. That answers the brief's question directly: the STT leg cannot carry this verdict, at least not in Welsh with this model.

**Why not the energy VAD alone.** Its own header predicted this, asking to be revisited "if we ever ingest recorded-in-the-wild audio". It called 96.5 of take 2's 96.8 seconds voiced, because under AGC the room genuinely is loud. So the VAD measures the span here and never judges it — exactly the division of labour that header asks for.

**Cost.** A normal take costs nothing: the ceiling is tested against a duration the upload path has already measured, so no decode happens at all. Only a take that trips the ceiling is decoded, and then only to confirm the length is speech span rather than padding — so a good take with a long silent lead is never refused.

**Three outcomes, never two.** No script text, an uncountable script (digits), a missing decoder or a decode error all return `pass: null, checked: false`: the take is **let through with a loud warning**, never refused. An infrastructure absence may never cost a recordist a read.

**Reject, not flag** — the taste-safe default the brief called for, and the measurement supports it: 3.4× headroom under the line for the good take and 1.7× over it for the worst empty one, in a direction where the two errors cost very different things. Refusing a good take costs one re-read; passing an empty one puts a sheep in front of a learner.

**What the recordist sees:**

> "That take came out far longer than the line, so it looks like it caught the room rather than your voice. It hasn't been saved — please read the line again."

and for a take with no voice in it at all:

> "That take didn't capture any speech — check the right microphone is selected, then read the line again."

Both are taste calls for Tom — happy to reword.

**Server-side deliberately.** A stale client bundle cannot bypass it, which matters given the version question. No client-side hint was added; that is a separate, optional nicety and not the authoritative check.

Tests: 16 unit tests pin the operating point (`services/recording-speech-gate.test.cjs`), and `tools/recording/validate-speech-gate-catrin-four.cjs` runs the real decode against the four real S3 objects end to end. All green.

### The mark on the three bad takes

Provenance only, applied 2026-08-23 via `tools/recording/mark-empty-takes-2026-08-23.cjs` (dry run first, per-row before-state assertions, read-back verified).

`recording_provenance` has no status, quality-flag or rejected column, so rather than invent one the mark rides in `quality_notes` under its own `take_quality` key, carrying the verdict, the reason in plain words, the measurements, and who found it. Every pre-existing key was asserted intact after the write; the good take was read and confirmed unmarked.

**Nothing was deleted. No pointer was moved. `course_audio` and `listening_pod_sentences` were not touched. No re-record or regeneration was triggered.**

---

## Needs Tom — one word each

1. **The three empty takes are live to learners right now** (`listening_pod_sentences.target_audio_id` points at them; the FK is repointed in the same request as the upload, with no review step). Unlink them so those three sentences fall back to silence/TTS until Catrin re-records — **yes or no?** *My recommendation: yes.* I did not do it because the brief was explicit that no pointer moves in this job.
2. **Merge the gate to `main`.** It is pushed but not merged and not deployed, so it is **not protecting Catrin's session right now** — **merge?** *My recommendation: yes, it is additive and refuses before the S3 PUT.* It needs a Popty restart to take effect, which I did not do per the rails.
3. **The wording the recordist sees** (both sentences above) — *fine as-is, or reword?*

## Explicit gaps

- **There is no session id in pod-mode recording data.** "All four came from one session" is inferred from a 3-minute-19-second timestamp cluster, not read from a field. Pod mode carries no session, take-index or chunk concept at all.
- **No client bundle hash is recorded** on any take. The version conclusion is drawn from commit dates versus the recording time, not from what Catrin's browser actually served.
- **`recorded_by` on all four rows is `aran@hey.com`**, the authenticated session's email — Catrin recorded on Aran's logged-in browser. `human_catrinlliar_cym_n` appears only as the resolved cast voice.
- **The 0 ms lead/tail figures in the earlier brief are not independent evidence of splicing.** They are a consequence of the AGC-lifted noise floor sitting above the VAD gate for the whole file. The timestamp arithmetic is the real proof, and it is stronger.
- **The gate's thresholds are fitted on four clips in one language.** That qualifier is written into the module header and the tests so it travels, the way the veracity gate's German-and-English caveat once failed to.
