# Austrian German: the main voice slot is fixed — Sascha can record today

**21 August 2026.** Everything below was read from the live system, and the fix was
verified on the live system.

---

## Can Sascha's main-voice recordings become clips now? Yes.

Before today, the Austrian German course had a machine voice — Azure's "Ingrid" — sitting in
the main target voice slot. A recording only becomes a playable clip if the slot it is read
for holds a **human** voice, so every take read for the main voice was saved to storage and
then refused as a clip: the recorder was told "this course has no human voice assigned to the
slot you are recording."

Sascha was cast, correctly and since 4 August — but into the **second** target voice, which
this course does not use at all. It has no audio in it whatsoever. All 11,645 of the course's
existing target clips are in the main slot. So the person doing the recording was pointed at
the empty slot, and the slot the course actually uses was still a machine.

Sascha now holds the **main** target voice slot. The second slot went back to the machine
voice it had before, exactly as the system's own "unassign" does. Nothing else in the course's
voice settings changed — the English voice and the presentation voice are byte-for-byte
identical.

**Proved live, not from the code.** A real take of a real Austrian line, in Sascha's own voice,
was put through the live recording upload. It came back filed, a clip row was created in
Sascha's voice, and the clip played back as real audio. That test clip was then removed so it
could not sit in the course unheard; the audio itself was left untouched in storage.

Sascha's voice is recorded as **Neutral**, carried across to the new slot as Kai set it on
8 August. Nothing was guessed.

---

## What happens to the ones already recorded

The bytes all survive in storage. Not one recording was lost. But the "47 refused takes" are
not what the number suggests, and this matters more than the number does:

- **19 of them are Kai's own voice**, recorded on 19 August to test the recordist's pause
  marks. They are not Austrian German course content and must never end up in the course.
  Now that the slot holds a human voice, an assembly run would have picked them up and
  spliced Kai into the Austrian course. They have been taken out of circulation, using the
  system's existing marker, in a way that is reversible in one step.
- **25 are Sascha's, from 8 August** — and they are five lines, one of them attempted sixteen
  times, from the session where the old pause-marking rule was asking for one word at a time.
  That rule was fixed this morning.
- **Five of Sascha's takes from 19 August already became clips**, in the second slot, and are
  safe.

**Those five lines are the first five lines of the script.** Nothing needs rescuing: they will
come round again at the very start of today's session, under the right voice, with the fixed
pause rule. Filing the older attempts would not happen on its own — it would need a deliberate
re-run — and nobody has listened to them.

**Do not run a bulk backfill of the old Austrian takes.** It cannot tell Kai's nineteen from
Sascha's, and it would file a struggling session into the course's main voice unheard.

---

## What a human still has to do

1. **Nothing, to start recording.** Sascha signs in and records as before; takes now file.
2. **Decide about the five earlier lines** (a one-line change either way): leave them and let
   Sascha simply read them again today — the recommendation — or move the five already-filed
   clips across to the main slot.
3. **Listen.** Nobody has yet listened to any Austrian German recording. Everything above is
   measurement.

---

## Gaps — what could not be proved

- **No one has heard any of it.** No listening was done, by design.
- **The single-link recordist page does not work for German.** That surface only exists for
  languages with a recording policy row, and German has none. Sascha must use the studio while
  signed in. Not changed here — adding German would change routing beyond this course.
- **There is no entry for Sascha's voice in the voice register** (the table that holds voice
  names and genders). The recording path does not read it, so it changes nothing today, but it
  means other tools cannot look their voice up. Not created here: it is a separate decision.
- **What a future machine-audio run would do with this course's main slot was not tested.** It
  now names a human, which is the intent, but audio generation is approval-gated and none was
  run — no audio of any kind was generated for this work.

---

*Live end-to-end verification, database reads, and one voice-slot change. No audio was
generated. No recording was deleted.*
