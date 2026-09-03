# Welsh pod-0 recording pack — built against Aran's 2026-08-06 canonical

**Built 2026-08-06. Any earlier pack is superseded** — the previous one is parked at
`docs/pods/welsh-recording-pack-SUPERSEDED-2026-07/` and must not be recorded from.
It was written against the old 142-sentence pod-0 English, which is dead as a source
of truth.

Four scripts, one per (course, voice):

| File | Course | Voice | Lines to record |
|---|---|---|---|
| `cym_n_for_eng-aran.md` | Northern Welsh | Aran | 248 of 297 (49 already done) |
| `cym_n_for_eng-catrin.md` | Northern Welsh | Catrin | 56 |
| `cym_s_for_eng-aran.md` | Southern Welsh | Aran | 72 |
| `cym_s_for_eng-catrin.md` | Southern Welsh | Catrin | 286 |

Each sheet is in the exact order the recording room serves it, so the on-screen queue
and the paper agree line for line. The room is
`/record/<course>?podVoice=<voiceId>` — the link is printed at the top of each sheet.

Regenerate after any content change:

```
node tools/build-welsh-recording-pack.cjs
```

## The voicing ruling — Aran, 2026-08-06, verbatim

> "Did some interleaving in the first few scenes and then beyond that it seemed faster
> to do them as chunks, without scene-based to and fro for everything, they'll work
> fine like that (also kind of fits with what I've been saying about not needing
> multiple voices)."

And Tom's gloss on it, verbatim:

> "so we can do this in a minimum of 2 voices if we need to (especially for less
> well-served TTS langs)"

What that means concretely, and what the canonical data now says:

- **Scenes 1–14 and 22 are interleaved dialogue** with real characters. Each sheet
  marks these `*Dialogue — <characters>*`.
- **Scenes 15–21 are single-voice chunks**, `Learner` throughout apart from `Narrator`
  drill tails. Each sheet marks these `*Single-voice chunk — no scene-based to and
  fro. Read straight through.*` Do not restore a second speaker into these scenes.
- Eleven lines that had been inferred as an alternating `Friend` were changed to
  `Learner` on the strength of this ruling when the canonical was rebuilt.

The sheets read the dialogue/chunk shape back off the data rather than assuming it, so
if the canonical changes the shape, the sheets follow.

## The Welsh that has not been written yet

Aran's canonical grew pod-0 from 142 sentences to 231. Welsh exists only for the lines
whose English is unchanged; it was never invented for the rest, and never edited.

| Course | Canonical lines | Welsh written | Welsh not written yet |
|---|---|---|---|
| `cym_n_for_eng` | 231 | 122 | 109 |
| `cym_s_for_eng` | 231 | 127 | 104 |

Those lines are **not in the Welsh recording queue at all** — the sheet says so per
scene. Nobody should improvise Welsh at the microphone. Writing them is a translation
job that blocks the recording job, and it is Aran's or Kai's call, not an agent's.

The English guide line for a new sentence *is* recordable now, and does appear in the
queue, because the bilingual guide reads the English too.

A separate, smaller list needs a human's eye rather than a fresh translation: lines
whose English was reworded, where Welsh already exists but was written against the old
wording. That list — old English, new English, existing Welsh, side by side — is
`docs/pods/pod0-welsh-translation-worklist-2026-08-06.md`.

## What was done to the data, and what was deliberately not done

- The two Welsh pod-0 queues were realigned to the canonical 231 lines by
  `tools/pods/align-welsh-pod0-to-canonical.cjs`. English, speaker and ordering come
  from `canonical_pod_scenarios`; Welsh was carried forward only onto slots whose
  English is unchanged.
- **No audio was deleted or regenerated.** Where a line's English changed, the slot's
  pointer to the old take was dropped so the recorder is not told "already done" about
  a line that now reads differently — the `course_audio` row itself is untouched and
  every dropped pointer is listed in
  `docs/pods/pod0-welsh-prealign-archive-2026-08-06/`.
- **No row was deleted.** One row per course that the new canonical has no slot for is
  blanked and parked out of the queue rather than removed.
- The full pre-alignment state of both pods is archived, and
  `align-welsh-pod0-to-canonical.cjs --restore-from-archive` puts it back verbatim.

## One open decision

Aran's canonical writes the literal token `[target language]` on five lines. The pack
substitutes **"Welsh"** on both courses, which matches what the Southern rows already
said; the Northern rows previously said "Northern Welsh", which is not what a learner
would actually say out loud. If Aran wants a different word, rerun with
`--language-name="…"`.
