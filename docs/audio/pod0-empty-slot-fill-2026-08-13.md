# Filling the empty pod-0 English slots — what ran, what it cost, what it proved

**2026-08-13.** Tom approved a strictly-scoped render: fill the genuinely-empty pod-0
English slots using the existing cast (his clone + Olivia). No live audio replaced, no
recast, no cast change. Two items from the same audit stayed explicitly held and were
not touched: the ~11,659-clip re-render of existing-but-wrong-voice clips, and the
Eve-vs-Olivia cast question.

**Result: 725 of 728 in-scope slots filled and linked. 3 could not be rendered because
they have no text — a content defect, not an audio one. Zero live clips replaced.**

**Verification: all 725 checked, not sampled. Correct cast on 725/725 and live audio on
725/725. One clip is genuinely truncated and needs a re-render; two want a human ear. The
render itself is sound.**

---

## 1. The numbers were re-verified first, and they moved

The brief carried "680 empty slots / 251 distinct texts / 109 pods" from the overnight
audit. Measured directly against live data this morning, mirroring phase 8's own scoping
(`POD0_CANON_SLUGS` + `englishColumnFor`), the estate-wide picture is larger:

| | Audit (overnight) | Live, re-measured |
|---|---|---|
| pod-0 English slots, total | 8,451 | **17,504** |
| filled | 7,771 | **11,733** |
| empty | 680 | **5,771** |

The gap is not drift — it is scope. The approved 680 is one exact subset, and it
reconciles to the row:

- slug `pod-0` only (**not** `pod-0-unrecorded`, which holds 4,598 of the empties)
- the **known** English track only
- excluding `cym_*` (deliberately never queued) and `zzz_test_*`

`fin 232 + deu_at 129 + fra_ca 119 + ara_sy 116 + fra 74 + spa 9 + pol 1 = 680.` Exactly.

The audit's other figure — **251 distinct texts** — only reconciles if the 48 `eng_for_*`
slots are included, where English is the *target* track. Those are genuinely English and
genuinely empty, so they are in the spirit of the approval and were included. **That makes
the real job 728 slots, not 680**, and the 251 distinct texts then matches to the unit.

"109 pods" was the audit's estate-wide pod count, not the in-scope count. The actual
in-scope figure is **23 pods across 23 courses** — one pod-0 per course.

Every one of the 4,321 empty slots outside this subset was left untouched.

## 2. The cast was censused before anything rendered — not sampled

Rather than trust the audit's reading, every one of the 728 slots was resolved through
phase 8's own `resolvePodSpeakerVoice` logic to see which voice would actually be handed
to TTS:

| Voice | Slots |
|---|---|
| `xai:gfzdpspr5fdp` — Tom's clone | 397 |
| `xai:bedd6226` — Olivia | 331 |
| unresolved / foreign | **0** |

100% of the approved cast, nothing else. This is stronger evidence than the 5-clip sample
the gate asks for, because it is a complete census rather than a sample.

## 3. D5 (unproofread draft lines) does not touch this job

The audit flagged `spa_for_eng` and `deu_at_for_eng` as carrying unproofread draft lines.
Checked directly: the `target_text_draft` flag sits on the **target** text, and for those
courses the text being voiced is the **known** English track. Of the 48 target-side slots
where the flag would apply, **zero** are drafts.

- target-side slots voiced, `target_text_draft=true`: **0**
- known-side slots whose (unvoiced) target text is draft: 104 — never rendered

**Still open and not mine:** `cym_s_for_eng` is released and serving 104 unproofread draft
lines to learners. Out of scope here, flagged so it does not slip a third time.

## 4. The approval gate was opened per course and shut again immediately

Bulk `/generate-pods` is refused unless a stored approval matches the course's live cast
fingerprint (Tom's ruling, 2026-08-07). All 23 courses sat at `no_approval`.

The gate was opened only as wide and as long as the approved job needed:
**approve → run narrowed to `pod_ids` + the single English `role` → revoke**, per course.
The estate is now back to **every course BULK-BLOCKED**, exactly as it started, so the
held out-of-scope work (the 11,659-clip re-render) stays gated behind the same door.

Each approval records what it was for and that it is a scoped, temporary grant.

## 5. What ran

`fin_for_eng` went first as a shakedown: 5-clip sample → verified green → bulk.

Every course's queued count matched the count predicted from the scope reconstruction —
**23 of 23, exactly** — which is an independent confirmation that the scope was right.

- **589 clips generated**
- **136 clips reused** (identical text+voice already on S3 — free)
- **3 failed**, all for the same reason (§7)

## 6. Verification: every clip, six checks, not a sample

Tom asked for a voice-match check, not an HTTP 200. Every filled slot was checked on all
six of:

1. **`voice_id`** — the definitive substitution check. Phase 8 falls back to an Azure
   voice when xAI fails, which is exactly the "wrong or substitute voice" outcome that was
   forbidden. A fallback records an Azure voice id, so this catches it outright.
2. **language** is `eng`
3. **S3 bytes alive** and non-trivial
4. **decodable with real duration** (ffprobe)
5. **voice match, acoustically** — see below
6. **content** — unprimed Whisper ASR round-trip against the expected text
   (`services/audio-veracity.cjs`)

### The voice-match method, and its honest limit

A pitch baseline was measured over **41 pre-existing English clips per cast member**:

| Voice | min | median | max |
|---|---|---|---|
| clone `xai_gfzdpspr5fdp` | 79 Hz | **103 Hz** | 176 Hz |
| Olivia `xai_bedd6226` | 148 Hz | **195 Hz** | 250 Hz |

The tails **overlap** at 148–176 Hz, so a hard band would lie. Classification is therefore
nearest-baseline-median, and a clip that classifies to the *other* cast member is flagged
**REVIEW** for a human listen — never silently passed, and never auto-failed on pitch
alone. Pitch is corroborating evidence that the recorded `voice_id` is not lying; it is
not the primary check and is not presented as one.

### The result: 725 clips checked, 1 real defect

| | slots |
|---|---|
| clean on all six checks | **693** |
| flagged, pitch ambiguity only | 17 |
| flagged, content or metadata | 15 |
| **total verified** | **725** |

The 725 slots resolve to **602 distinct clips** — 136 slots were filled by reusing an
existing clip, so several slots share one audio row and one verdict.

**The two checks that cannot be argued with came back perfect:**

- **`voice_id`: 725 / 725 correct cast.** Zero Azure fallbacks, zero foreign voices. The
  substitution risk that made this render conditional did not materialise anywhere.
- **S3 bytes alive and decodable: 725 / 725.** No dead links, no stubs, no zero-length files.

### Every flag was read, not counted

The content/metadata flags come from **19 distinct clips**. Each was re-decoded and the ASR
output read against the script. **18 of the 19 are the checker's spelling, not the audio's
fault:**

- **currency and digits** — the script says *"That's eight pound forty altogether"*, Whisper
  writes *"That's £8.40 altogether"*. Same for `£12.50`, `€8.40`, *"room 709"*, and
  *"1. 2. 3."* → *"One, two, three"*. Character-error rate 0.34–0.65 on audio that is
  perfectly correct.
- **compound splitting** — `check-out`→"checkout", `sit-in`→"sit in", `takeaway`→"take away",
  `half-pint`→"half pint", `draught`→"draft". These tripped the *last-word* rule at CER
  0.02–0.05 — the rule saying the final word is missing when it has merely been respelled.
  **This exact fault was fixed on `main` at 02:11 tonight** (`d951ddae`, "the last-word rule
  asked how a word is SPELT, not whether it was said"), an hour before this verification ran
  in a checkout that had not pulled it. Re-judged against the fixed rule, **all 7 of these
  slots pass**, which is why the table above reads 693 clean and not 686. Nothing about the
  audio changed; the detector's question did.
- **one metadata-only flag** — `deu_at_for_eng` `SC14-S008` has `language = "en-GB"` where the
  column convention is `eng`. The audio is correct English and its content check passed. This
  is a pre-existing reused clip carrying an old id format, not something this render made.

**One clip is a genuine defect:**

> `ara_sy_for_eng` `pod-0` `SC01-S004`
> script: *"Yes, I've got a busy day today. I hope you have a good day. See you later."*
> heard: *"Yes, I've got a busy day today."* — **the clip stops after the first sentence.**

This is a truncation, which is one of the two failure classes `audio-veracity.cjs` is
actually validated against. It is also confirmed independently of ASR, by arithmetic: at
2.76 seconds for 74 characters it runs at **26.8 characters/second against a 725-clip median
of 14.2**, and it is the only outlier in the estate — the next fastest clip is 19.7 c/s.
Nobody speaks that sentence in 2.76 seconds. The words are not there.

That speech-rate sweep is worth stating as its own result: **run across all 725 clips, it
produced exactly one outlier, and it is the same clip ASR caught.** Two independent methods
agreeing on one clip is decent evidence that no second truncation is hiding behind a passing
CER score.

### Two more want a human ear, and one number-drill quirk

- `ara_sy_for_eng` `SC08-S016` — *"4. 6. 8. Blue. Yellow."* decodes as *"four, point six,
  point eight, point blue, point yellow"*. Either the voice is reading the full stops aloud
  as "point", or Whisper is inventing them. Its duration is 5.02s against 5.16s for the
  identically-shaped *"1. 2. 3. White. Black."* which decoded cleanly — that near-identical
  length argues the extra words are not in the audio, but it is a 30-second listen to settle.
- `fra_for_eng` `SC11-S012` — *"Have a lovely stay"* decodes as *"Have a lovely day"*. Under
  the fixed last-word rule this now **passes**, and that is the correct machine verdict —
  but `d951ddae` names this class explicitly as the one it deliberately gives up on: "whisper
  mishearing a spoken word and TTS speaking the wrong one produce the same transcript, and
  only listening separates them." It is a passing clip that is worth thirty seconds of ear,
  and it is listed here rather than buried in a green count.

### The 17 pitch flags are prosody, and the distributions say so

None of the 17 is a voice substitution — all 17 carry a correct `voice_id`. Measured across
this run:

| Voice | clips | min | median | max |
|---|---|---|---|---|
| clone | 389 | 79 Hz | 113 Hz | 163 Hz |
| Olivia | 331 | 138 Hz | 211 Hz | 314 Hz |

The two populations overlap only in **138–163 Hz**, and every cross-classified clip sits
inside that band. The pattern inside it is not random:

- the 9 clone clips at 150–163 Hz are **all short questions** — *"How much is that?"*,
  *"Am I wrong about that?"*, *"Could I pay by card?"* — where terminal rise pulls the median up;
- the 4 Olivia clips at 138–148 Hz are **short falling statements** — *"Yes, please."*,
  *"That's a bad idea."*

A further 5 are `unmeasurable`: number drills and two-word lines with too few voiced frames
to estimate pitch at all. That is the method declining to guess, which is the behaviour
asked for.

So the honest position: pitch never contradicted `voice_id` anywhere, and where pitch was
ambiguous there is a prosodic explanation for every case. These are logged for a listen, not
presented as suspicion.

## 7. The three that could not be rendered — a content defect, not an audio one

All three failures are the same sentence, `SC15-S012`, in `fin_for_eng`, `ara_sy_for_eng`
and `fra_ca_for_eng`. TTS refused them with `Text cannot be empty`, correctly.

That sentence is the numbers line — *"One hundred thousand. Sixty. Seventy. One o'clock.
Eleven o'clock."* It exists in **44 of 47** pod-0 courses with text on both tracks. In
exactly these 3 it is blank on **both** the known and the target track.

So this is not missing audio. It is **missing text**, and it needs authoring in Finnish,
Syrian Arabic and Québécois French (plus the English known side) before any render can
succeed. Rendering was not forced and nothing was invented.

## 8. Reconciliation — the delta equals the work, exactly

| | before | after | delta |
|---|---|---|---|
| pod-0 English slots filled | 11,733 | 12,458 | **+725** |
| pod-0 English slots empty | 5,771 | 5,046 | **−725** |
| of which target-side (`eng_for_*`) | 48 | **0** | −48 |

In-scope: 728 slots → **725 filled, 3 still empty**, and the 3 are precisely the
blank-text rows. No slot outside the approved subset changed. No existing clip was
replaced, repointed or deleted.

## 9. What is still outstanding

**One action, and it is not automatic.** `ara_sy_for_eng` `pod-0` `SC01-S004` needs a
re-render. It is deliberately left undone here: the bulk endpoint only fills *empty* slots,
so that slot — now filled — would be skipped by a re-run, and fixing it means replacing a
clip that is already live in front of learners. That is make-before-break territory
(generate → verify → swap → only then delete), and the approval gate was shut again at the
end of the render. Reopening it for one clip is a call to make deliberately, not a tidy-up
to slip in.

Two clips want a listen before anyone decides anything about them: `ara_sy_for_eng`
`SC08-S016` and `fra_for_eng` `SC11-S012` (§6). The 17 pitch flags are logged, explained,
and want nothing.

And still not mine, flagged for the third time: `cym_s_for_eng` is released and serving 104
unproofread draft lines to learners.

## 10. Two things the verification pass fixed about itself

Worth recording, because both were the tooling lying rather than the audio being wrong:

- **The checker reported 8 clips as `WRONG-VOICE` that were the right voice.** `course_audio`
  stores this cast in two id formats — 594 rows as `xai_gfzdpspr5fdp`, and 8 older reused
  rows as the bare `gfzdpspr5fdp`. Same voice, historical drift. The check now strips the
  provider prefix, so it tests *who spoke* rather than *which id format was fashionable that
  month*. Had this gone unnoticed it would have manufactured 8 fake substitution alarms on
  the one check that is supposed to be definitive.
- **The first attempt at this pass lost everything.** It held all results in memory and wrote
  its JSON at the end; it was killed by a session boundary twelve minutes in, having already
  decoded roughly 350 clips, and none of them survived. `verify.cjs` now streams each verdict
  to a shared `verify-results.jsonl` as it is produced and skips on resume, so a rerun costs
  only the clips nobody has reached. Whisper time is too expensive to hold hostage to a
  process lifetime.

---

*Evidence and re-runnable tooling: `tools/pod0-fill/` in the Popty checkout —
`recount.cjs` (the live measurement), `castcheck.cjs` (the 728-slot cast census),
`baseline.cjs` (the pitch baseline), `pitch.cjs` (the F0 estimator), `verify.cjs` (the six
checks, resumable), `triage.cjs` (re-decode a flagged clip and print script vs ASR side by
side), `rollout.cjs` + `rollout-log.json` (every approve/render/revoke step).*

---

## Addendum, 2026-08-13: the one truncated clip is fixed

Tom approved a strictly-scoped follow-up: re-render the single confirmed truncation from
§6/§9, `ara_sy_for_eng` `pod-0` `SC01-S004` (known/English track). Nothing else touched.

**What was wrong.** `course_audio` row `263240af-71e2-4d7d-9c2e-ea9f4dd993aa` — text "Yes,
I've got a busy day today. … I hope you have a good day. … See you later." (three sentences,
joined by the pod pause cue) — held only 2.76s of audio, cut off after the first sentence.
Confirmed twice in §6: ASR decoded just the first sentence, and the clip ran at 26.8
chars/second, the only outlier in the 725-clip set (median 14.2).

**What ran.** New tool: `tools/pod0-fill/fix-ara-sy-sc01-s004.cjs`. Make-before-break,
scoped to this one row:

1. The approval gate was opened for `ara_sy_for_eng` only (`pod-approve-voices.cjs
   --course=ara_sy_for_eng`), narrower even than the original run — noted in the approval
   record as a single-clip re-render, not a bulk fill.
2. Speaker `Sarah`'s known-role voice was re-resolved live from the pod's own cast
   (`resolvePodSpeakerVoice`) and checked against the voice already on the live row
   (`xai_bedd6226` / Olivia) before rendering — confirms the cast has not moved since the
   original render.
3. A fresh clip was synthesised with the same text and the same pause-cue join phase 8
   uses for multi-sentence turns, and uploaded to a **new** S3 key
   (`mastered/318A649F-8117-4472-A48D-F943FB894AE4.mp3`). The live row was not touched at
   this point — the old object (`mastered/7268ABA9-EE92-47B3-9E8A-0D3A8C6AAA90.mp3`) was
   still the one being served.
4. The new object was verified before anything pointed at it:
   - **ASR** (`services/audio-veracity.cjs`) decoded all three sentences with **zero
     character error**: `"Yes, I've got a busy day today. I hope you have a good day. See
     you later."` — an exact match.
   - **Duration**: 4.78s, 73% longer than the truncated original's 2.76s, consistent with
     three sentences rendering instead of one.
   - **Speech rate**: 12.1 chars/sec — in line with the run's 14.2 median, nowhere near the
     truncated clip's 26.8 outlier.
   - **Pitch**: median F0 211Hz, inside Olivia's range from the original run's baseline
     (138–314Hz across 331 clips, median 195Hz) and nowhere near the clone's range
     (79–176Hz) — corroborates the correct cast member, on top of the voice_id check in
     step 2.
5. Only once all four checks passed did a single `UPDATE course_audio SET s3_key = …`
   swap the live row onto the new object. The old object was left on S3, untouched and
   undeleted — nothing to make-before-break because nothing was broken.
6. **Post-swap, the live link was independently re-verified**: downloaded the new object
   fresh from its public S3 URL (not from the render buffer still in memory) and re-ran
   ASR against it — same result, exact match, zero error. What learners now hear was
   checked as bytes actually on S3, not as bytes about to be uploaded.
7. The approval gate was revoked for `ara_sy_for_eng` immediately after
   (`pod-approve-voices.cjs --revoke=ara_sy_for_eng`) — confirmed back to
   `No pod voice approvals on record. Every course is currently BULK-BLOCKED.`, the same
   state every other course was left in at the end of §4.

No other clip, sentence, pod or course was touched. The two items flagged in §9 that "want
a human ear" (`ara_sy_for_eng` `SC08-S016`, `fra_for_eng` `SC11-S012`) are unaffected and
still open, as is the `cym_s_for_eng` draft-line flag.
