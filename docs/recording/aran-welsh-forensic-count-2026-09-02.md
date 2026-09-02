# Aran's Welsh recordings — the forensic count

2026-09-02. Every number here was measured against the live database, read-only. Nothing was
deleted and no audio row was overwritten.

## The direct answer first

**Tom's "we may be only showing the first version" hypothesis is FALSE — and the good news underneath
it is bigger than the hypothesis.** Every one of Aran's 149 stored clips points at his *latest* take.
Twenty-six of his lines have more than one take; not one of them is serving an older one. And **zero
of the 45 lines currently queued for a re-record already have a newer take** — the queue is not
asking him to read anything twice.

The versioning he suspected we might not have, we do have. Every take gets its own S3 object, its own
raw original (since 2026-08-14), and its own provenance row; a re-read repoints the clip at the new
object and the old object stays where it is. **No audio has been lost.**

## The reconciliation — 149 clips, 71 lines, 26 done

| | count | what it is |
|---|---|---|
| **Clips stored in Aran's voice** | **149** | across both spellings of his id; 147 distinct pieces of work, only 2 overlaps |
| — English-side clips | 26 | filed as `known` under `eng`. Real recordings, but the known side of a Welsh course is English and never enters a Welsh queue. See "needs Tom". |
| — Welsh clips | 123 | |
| Welsh clips that reach a line in his queue | 72 | landing on **71** distinct lines (two clips share one line) |
| Welsh clips that reach **no** line | **51** | broken down below |
| — read against a **retired pod script** | 23 | June sessions, against sentences pod-0 no longer contains (pod-0 was rebuilt 2026-08-11). Mostly half-sentences of lines that are now single lines. |
| — same sentence, but the text drifted | 17 | pod-0's rebuild inserted "…" pause cues: his clip says "A be ydy cyfrinair y wifi?", the line now says "A be ydy… cyfrinair y wifi?" |
| — lines cast to **Catrin** | 11 | he read lines whose speaker is a female character (Bar Customer 2/3, Diner 2, Customer). Real takes, sitting in her half of the pod. |
| **Lines his screen gives a clip for** | **71 → 76** | the fix below adds 5 |
| — of those, queued to be read again | 45 | the T-20 full re-record commissioned 2026-08-16 |
| **Lines counted done** | **26** | 71 − 45 |

Residue: **0**. Every one of the 149 has a named reason.

## Write versus read — which half was broken

**(a) Versioning — SOUND.** Each take mints a fresh S3 key, archives the raw original, writes its own
`recording_provenance` row, and repoints the clip's `s3_key`. `course_audio` deliberately holds one
row per clip identity — the *current pointer* — and the history lives in provenance and in S3. On
2026-08-23 Aran did 36 takes: 12 made new clips and 24 re-recorded existing ones, exactly as designed.

**(b) Selection — CORRECT, but the queue's *lookup* was blind.** All three read paths agree and all
three land on the latest take: the recordist queue, the listen button (`target_audio_id` first, then
newest-first), and the learner's own path (the bundle API reads `target_audio_id`). The defect was
not "which take" — it was "does a take exist at all".

## The defect found, and the fix landed

Six pod lines were linked to Aran's clips, playing to Welsh learners, **and reported to Aran as never
recorded** — because the queue asked "is there a clip filed under this exact text?" and pod-0's
rebuild had moved the text by a pause cue.

The fix puts both questions in one place, `services/voice-engine/take-selection.cjs`:

- `lineHasTake()` — is there a take of this line by this voice, **by text or by slot**. The slot test
  is the line's own FK, which is the estate's own statement that the slot is filled and by whom. It
  is the test the seed queue already used and the one the listen button already tried first.
- `countsAsRecorded()` — does that take count as done. **This is the single predicate Tom's pending
  ruling on unaccepted takes changes**, whichever way it lands: hiding them is a change here and
  nowhere else; wiping them is a separate deletion script that never touches the display.
- `pickCurrentTake()` — newest by the server's clock, never the recordist's phone.

**Live on popty.app now:** 50 of Aran's outstanding lines carry a listen-and-compare clip, up from 45.
Five lines moved from "never recorded" to "you have a take here — this is the one we're asking you to
read again". His done count stays 26, honestly: those five *are* queued for a re-record.

**Catrin is untouched** — 466 lines, 38 done, exactly as before.

## Needs Tom

1. **Unaccepted takes: wipe or hide.** Still yours, still open, and nothing here pre-empted it. It is
   now a one-line change in `countsAsRecorded()`.
2. **The 26 English-side clips.** Aran recorded 26 English lines under the Welsh course on
   2026-06-15. They are real audio, they count towards nothing, and no queue will ever ask for them
   again. Keep, retire, or repurpose?
3. **11 clips of Catrin's lines.** He read 11 lines whose speaker is cast female. His takes exist and
   Catrin has not read them. Recast those speakers to him, or leave them for her?
4. **23 clips of a retired script.** Real Welsh in his voice, read against sentences pod-0 no longer
   has. Nothing points at them.
5. **17 pause-cue drifts, of which 5 are now recovered and 1 line (SC14-S008) is not** — its clip
   matches the line's words but the line is not linked to it. Left alone deliberately: promoting a
   take by loose text match would risk telling him a line is done when his read may not carry the
   pauses the cue now asks for. One line, your call.

## What was not done

No audio row was deleted or overwritten. `RecordistRoom.vue` was not touched — jobs #142 and #143 are
live in it and the fix reaches the screen through the API instead. The headline could also say
"149 recordings given, 45 queued to read again" rather than only "26 done"; that is a display change
in a file another job is holding, so it is a recommendation, not a landing.

---

# Part 2 — the invariant: what we record IS what the learner hears

Tom, 2026-09-02: *"we really should know that what we are recording — as the take we are happy with
— … we should be able to know for sure that what we record IS what is served to the learner."*

## The proof, run

`tools/recording/verify-take-invariant.cjs` resolves every track of every pod line **twice** — once
as the learner's playback sees it, once as the recordist's Listen button sees it — and compares the
resulting file.

**cym_n_for_eng: 231 lines, 462 tracks checked. 156 agree. ZERO disagree. ZERO lines where the
learner is silent while a take exists.** The invariant holds today, measured, not asserted.

`cym_s_for_eng` **refuses to run**: no southern recordist is cast, so there is nobody to compare
against. Its first draft did not refuse, and scored every filled slot as agreement — a proof that
proves nothing is worse than no proof, so the tool now stops instead. Exit status is 1 on any
divergence, so it can be run as a gate on any course.

## How it is held — one resolver, not three agreeing implementations

`resolveCurrentClip()` in `services/voice-engine/take-selection.cjs`. **The slot decides**: a line's
own `target_audio_id` is the column the learner's bundle API reads, so every other reader starts
from the same row. The two callers differ only in *declared parameters*:

| | voice restriction | may fall back past the slot |
|---|---|---|
| learner playback | none — plays whatever is linked | **no** — an empty slot is silence |
| recordist Listen | their own spellings only | yes — their own take of the same text |

So a divergence can only ever be one of two facts: the slot is empty, or the slot holds another
voice. The Listen route's private copy of that logic is gone; it calls the resolver.

## Write side, stated plainly

**Nothing is overwritten except a pointer.** Every take gets its own S3 object, its own
`recording_provenance` row, and (since 2026-08-14) its raw original archived before processing.
`course_audio` holds **one row per clip identity** — that row is the *current pointer*, and a re-read
moves it. The history is in provenance and in the bucket, not in extra `course_audio` rows.

So the invariant is structural for the case Tom describes going forward: read a line, keep reading,
and the last take you gave us is the take that plays. Verified end to end above.

**Where it is not yet structural, and this is the one real gap:** *acceptance is not persisted
anywhere*. The booth uploads every take; "Again" uploads another; the last upload wins. There is no
column, anywhere, saying "this is the one I was happy with". Today that is the same thing — you keep
reading until you are happy and then move on, so the last take **is** the accepted take. But if a
recordist ever reads three and prefers the second, nothing in the system can express it. That is a
booth/write-path change, not a read-path one, and it is the only thing standing between "what we
record is what is served" being true by practice and true by construction.

## What the check found beyond the invariant

- **64 tracks of cym_n_for_eng are serving a take Tom marked bad on 2026-08-23** (51 target, 13
  English-side). Every one of the 64 is already flagged to be read again — so the bookkeeping is
  coherent, make-before-break is doing its job, and the learner is hearing a clipped take until the
  re-read lands. That is the honest size of the outstanding Welsh audio problem.
- **13 of those are on the KNOWN (English) track**, and there are **26 known-side re-record wants**
  in the pod. The known side never enters a recordist queue by design, so those wants can be
  written but never fulfilled through the recordist surface. Open item.
- **7 lines carry a re-record want with no track key** — `{"reason": "…"}` and nothing else, left by
  the 2026-08-23 marking pass. No queue can honour it and no upload can retire it. All seven were
  re-read on 23 August anyway, so nothing is broken today; the payload shape is the trap. Reported,
  not touched.

## Prior art read (and one honest gap)

The three files the pointer named are **deletions in the shared working tree** — they are not on
disk there. Read from `origin/main` instead:

- `mark-aran-clipped-takes-2026-08-23.cjs` + its applied log: 100 takes marked bad in **provenance
  only**, on Tom's ear, moving no pointer and deleting nothing. That matches what I measured
  independently: 27 of them have since been superseded by his 23 August re-reads, 76 are still the
  current clip, and every one of those that sits on a live line is flagged.
- `backfill-orphan-takes.cjs` — script-mode takes with no `course_audio` row, a different content
  type. Not Aran's pods, and not evidence for a second identity.
- `20260806_clip_identity_canonical_functions.sql` — canonical identity, deliberately inert, and it
  defines **no versioning semantics**. Versioning lives in provenance and S3, as above.
