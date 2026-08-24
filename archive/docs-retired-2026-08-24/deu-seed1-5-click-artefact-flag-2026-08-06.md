# deu_for_eng seeds 1–5: quiet click artefact on the six rebuilt clips — flagged, not diagnosed

**2026-08-06.** Tom listened to all six before/after pairs from A-42 himself (`docs`
doc `0f90ee91` / plate item A-42, "Seeds 1-5: hear the six rebuilt clips, before and after"). His
verdict: the new ones are all better — but he can hear a very quiet click artefact creeping into
the rebuilt clips. **He has explicitly accepted the artefact for now** — his words: "they're very
quiet and I'm going to accept them for now" and "it's a tiny click and it's fine." This is not a
blocker, not urgent, and not a reason to hold or revert anything. It is a diagnose-when-convenient
flag.

## The open question, in Tom's own framing

Is the click coming from the specific voices themselves, or from something in our audio
processing chain? His words: "I'm not sure what to do, whether it's the voices themselves or
something on our processing… to have a look at what it is about these particular voices that do
or are processing that does seem to be introducing a tiny [audible] click." Nobody has
investigated which of those two it is — this doc does not answer that, it only files the question.

## The six affected clips (new/rebuilt versions, from A-42)

| # | sentence | new clip S3 object |
|---|---|---|
| 1 | "möglich" | `mastered/CB6F2D0F-A85E-49FB-812E-C22A66902D27.mp3` |
| 2 | "Ich will lernen, wie man etwas auf Deutsch sagt" | `mastered/D1816821-D0F2-4F0F-A6ED-24713067A1B4.mp3` |
| 3 | "Ich will mit dir lernen, wie man so oft wie möglich spricht" | `mastered/F80A8B6B-12DA-4A1F-803E-772F145C728F.mp3` |
| 4 | "ich will mit jemand anderem sprechen" | `mastered/AC33F245-19A6-4924-A0A3-B6EB30BD6B5B.mp3` |
| 5 | "ich will mit jemand anderem sprechen" (second occurrence) | `mastered/67222760-5249-40A6-B51D-1FEF6849D1CD.mp3` |
| 6 | "Ich will jetzt lernen, wie man etwas auf Deutsch sagt" | `mastered/83088B47-CBF6-4842-8D1B-7480B4D1514E.mp3` |

Bucket: `ssi-audio-stage`, all under `mastered/`. **Gap, stated honestly:** I have not resolved
these six S3 object ids back to `course_audio` row ids / seed / lego numbers inside
`deu_for_eng` — I only have what A-42's source doc (`0f90ee91`) carries, which is the sentence
text, the S3 URL and the before/after duration. Whoever picks this up should start by resolving
these six objects to `course_audio` rows (`SELECT * FROM course_audio WHERE s3_key LIKE
'mastered/CB6F2D0F-A85E-49FB-812E-C22A66902D27%'` etc.) to get seed/lego/voice/role.

## Where the rebuild pipeline lives (start here, don't re-derive)

These six clips are part of the same repair run investigated in full in
`docs/deu-clipping-root-cause-2026-08-05.md` — read that first, it is the ground truth for this
pipeline as of 2026-08-05. Relevant pointers from it:

- The only code that trims/rebuilds these clips' tails is `repairTailDefect` in
  `services/audio-processor.cjs:686`, called from `services/phases/phase8-audio-v13.cjs:1017`
  (`masterAudio` → `repairTailDefect`).
- The cut/rebuild itself is an ffmpeg chain at `audio-processor.cjs:713-716`:
  `atrim=end=${cutAt}, areverse, afade=t=in:st=0:d=0.008, areverse, apad=pad_dur=0.1` — an 8 ms
  fade is applied at the new cut point and 100 ms of silence is padded on. **A click introduced at
  or near that fade/pad boundary is a plausible processing-side candidate** and would be the first
  thing to check against the "is it the voice or the processing" question.
- Detection of where to cut lives in `detectTailClick` (`audio-processor.cjs:377`), three rules
  (`burst`/`resurgence`/`rise`) calibrated on Italian clone-voice exhale bursts, not German —
  the root-cause doc's own finding is that these rules fire on ordinary German word-final
  consonant releases, which is a second, adjacent way "the processing" could be shaping what the
  learner ends up hearing at that boundary.
- Production as of 2026-08-05T15:40:03Z runs `TAIL_REPAIR_MODE=flag` (flags, does not auto-cut),
  deployed from `/home/tomcassidy/SSi/ssi-dashboard-v7-clean-prod`, branch `main`.

## What this doc is NOT

It is not a diagnosis, not a fix, and not a request for Tom's time — he has already ruled. It is a
pointer so whoever picks this up next starts from the real mechanism and the real six clips
instead of re-discovering both from scratch.
