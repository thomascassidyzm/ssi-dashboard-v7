# Austrian German — every take Sascha recorded, and why "newest" is the wrong rule

**2026-08-25 · `deu_at_for_eng` · Sascha's 331 takes · read-only except where stated**

*Sascha uses they/them. They record the male voice; that describes the part, not them.*

## The rule is dead, and it was never implementable anyway

**There is no acceptance flag anywhere.** Not on `course_audio`, not on
`recording_provenance`, not in `services/recording-upload-helpers.cjs`. The
recordist surface has only `discardLine()`, which discards *before* upload. In
script mode — which is what all 331 of Sascha's takes were recorded in — the
autocue's Approve tick never leaves the browser:
`useAutocueState.finalizeSession` returns early for `scriptMode` with the comment
*"Approval in script mode is the recordist's own tick-list, not a gate."* So
"newest **accepted**" was never implementable, and no linker anywhere can respect
a flag that does not exist.

And the fallback — "newest overall" — is **actively harmful here**. Job #601
proved the mechanism against the live database and this job's ASR sweep of all
331 takes confirms it independently: Sascha repeatedly read a line correctly and
then flubbed the retry seconds later, and the linker took the later one.

**Newest is not better. On this course it is reliably worse.**

## What 331 decodes actually show

Every take was decoded with whisper-medium and scored against the line the tool
prompted for. A good take lands around **0.77** similarity — whisper renders
Austrian dialect into Standard German, so that is the ceiling and it is the
course median. Below about **0.5** the audio is not a reading of the line at all:

| prompted line | what the bound audio is |
|---|---|
| `i wü` | "Platt!" |
| `i wü reden` | "Baba." |
| `i wü iatz mit dir Deitsch reden` | "blabla blabla blabla" |
| `reden` | *[clapping]* |
| `kannst d'Tür offen hoitn, solang i de Schlüssl hol?` | "Ups!" |
| `wer a immer gsogt hot, dass des schwa wird…` | *[laughter]* |
| `wir mechatn heit auf d'Nocht an Tisch für vier reservieren` | "Ich wünsche euch heute Nacht eine schöne Nacht" — a different sentence |

Two things this **rules out**:

- **No clip anywhere decodes as a different course line.** The take-N-filed-under-
  phrase-N+1 mislabel theory is disconfirmed.
- **The prompted text and the course-slot text agree on all 331 takes** — zero
  disagreements. So mis-filing is not the defect either.

What is left is the simple, ugly one: **the recordist's fumbles, mic checks and
reactions are filed as clips, and newest-take promotes them over the good read
that came seconds earlier.**

## The three proven cases, and their current state

| line | good take | flubbed retry | state |
|---|---|---|---|
| `kannst d'Tür offen hoitn…` | `A9E2B785` 10:57→13:00, 10.0s, full line | `481AB75B` 13:13, 4.9s, "Ups!" | **restored** — this job, revision 2 |
| `wer a immer gsogt hot…` | `D06A4593` 13:13:38, 8.3s, full line | `8D0C77FA` 13:14:27, 5.5s, laughter | **restored** — this job, revision 4 |
| `wir mechatn heit auf d'Nocht…` | `0AA52677` 10:57:37, 2.9s, full line | `A3DF263D` 10:57:45, 3.5s, wrong sentence | **STILL LIVE AND WRONG** |

### Note on the revert instruction

Kai asked that any repoint written *under the newest rule* be reverted. **The two
repoints in this job went the opposite way** — each moved a row *off* the newest,
flubbed take and *back onto* the earlier good read. That is the operation #601
recommends. Reverting them would put "Ups!" and a laugh back in front of
learners, so they stand. The rollback is one command if that reading is wrong:
`course_audio_revisions`, `source = 'deu-at-junk-take-repoint'`, revisions 2 and 4.
Nothing was deleted; the superseded objects are still at their keys.

## Report only, not performed: restoring `0AA52677`

Kai is right about the shape. The good take **has no `course_audio` row of its
own** — it *was* revision 1 of row `65f8618f-b103-407f-ae33-aaa689a74a76` and a
`recordist-retake` swap at 10:57:51 replaced it. So this is not a relink; there is
no second row to point at.

**The operation.** One call to `swapClipInPlace` (`services/shared/audio-revision-swap.cjs`):

- `audioId` `65f8618f-b103-407f-ae33-aaa689a74a76`
- `newS3Key` `mastered/0AA52677-B285-485B-8DCE-F5DC490F36ED.mp3`
- `durationMs` 2864
- takes `audio_revision` 2 → **3**, writes a `course_audio_revisions` row naming
  `previous_s3_key` for rollback, and updates nothing else — not text, not
  language, not role, not `voice_id`.

**The risk, honestly.**

- *Low.* The row id never moves, so no learner FK changes and the course cannot
  reference a missing clip at any instant. Nothing is deleted — `A3DF263D` stays
  at its key. `verifyObject` proves the new bytes are in the bucket before the
  row is pointed at them. It is exactly reversible by a second swap.
- *The one real cost.* `audio_revision` is the learner's cache key
  (`<uuid>.v<rev>`, served immutable and held in player-vue's IndexedDB). Bumping
  it is what makes the fix actually reach a learner who already played the bad
  clip — and it also means every learner re-downloads that clip once. For one
  clip that is nothing; it is only a consideration at scale.
- *The judgement risk, which is the real one.* The evidence that `0AA52677` is
  good is a whisper decode and a duration, not an ear. Whisper is not a reliable
  referee of Austrian dialect. **This is precisely what the listening page is
  for** — one tap on that line settles it.

## The instrument

**https://watson-1.tail4968cb.ts.net:8450**

Every one of Sascha's 331 takes over 225 prompted lines — including the 106 that
are invisible from the course side. Grouped by the line the tool asked for, in
time order, with the gap between takes shown (`+4s`) so a good-read-then-flubbed-
retry pair reads as a pair. The live take is marked. One-tap Good/Bad per take,
persisted across reload and restart; `/api/export` returns the take Kai called
good, the take that is live, and a `needs_repoint` flag.
