# Why a re-read came back snipped tighter than a first read

Measured 2026-09-02 on Tom's own zzz session, before Catrin Lliar records.

**These clips are process fixtures, not a fidelity reference.** Tom recorded in a
loud room with the air conditioning on and said explicitly they must never be
used to judge sound quality. They are used here only for boundaries — where the
speech starts and stops relative to where the file starts and stops — and an air
conditioner does not move a boundary. It does raise the noise floor, which is why
the "mastered head" column below reads 0 on some of the quieter-mic takes: after
normalisation the room tone itself clears a fixed -40 dB gate. The column that
decides everything is **raw lead-in** — how much audio existed in front of the
first word in the untouched archived original — and that one is unaffected.

## The answer

**The trim is not the problem and never was.** It behaved identically on every
take on both paths. `processRecordingBuffer` asks for a 350 ms margin outside the
detected read and it got the full 350 ms on 30 of 34 takes. The four it did not
get are four takes where **the audio in front of the first word did not exist**.
The block at `services/audio-processor.cjs:1370` predicted exactly this: "the
margin is asked for, not guaranteed... the capture, not the trim, is what is
short."

**The capture is what was short, and it was short by construction.** Every line
boundary — Next, Again, Back, and the pre-roll roll-over that fires every ~2.5 s
while a recordist reads a line in silence — called `handOver()`, which did
`active = spawnRecorder()`. A MediaRecorder constructed at that instant holds
**zero** audio at that instant. So the only lead-in any clip ever got was however
long the recordist happened to hesitate before speaking.

That is why first takes looked fine: reading a line off the screen takes 1.2–3.0 s,
measured, and that hesitation *is* the pre-roll. And it is why a re-read did not:
`discardLine()` handed over and the caller opened the line in the same tick, and a
recordist re-reading a line they have just read does not stop to read it again.
Same code, opposite outcomes. The comment on `discardLine()` asserted "the
replacement recorder is already live, so the re-read has its pre-roll too" —
live is not the same as full, and that claim was false.

The roll-over had the same hole: for the 800 ms after each roll the active
recorder held nothing, and a read begun in that window arrived flush against its
own first syllable. That is what produced the worst clip in the session.

## The numbers, before the fix

34 takes, 2026-09-02, `human_tom_zzz`. Raw originals and mastered clips both
measured with the chain's own detector (`silencedetect` at -40 dB, 0.2 s minimum
silence, 0.3 s minimum speech) plus an adaptive-floor envelope on the mastered
clip.

- **30 of 34** clips: the full 350 ms margin at the head, 310–380 ms at the tail.
  Nothing wrong with these.
- **4 of 34** clips short at the capture:
  - `s16` "That was really good, thank you" — **0 ms** of raw lead-in. Head
    margin in the shipped clip: 60 ms. The onset is amputated.
  - `s11` "Good morning" — 293 ms of raw lead-in against a 350 ms ask.
  - `s1` "A coffee, please" — 291 ms of raw lead-in.
  - `s22` "See you next week, 11530" — the raw take was 2.5 s long and the read
    filled all of it. The detector found no silence to bound a read with, so the
    take was kept whole: 2.43 s of lead and **0 ms of tail**, cut flush at the end.
- One outlier of a different kind: the very first clip of the session, `s3` at
  17:52, is 12.9 s long for a five-word line — a take with a long false start in
  it. Not a trim defect; the detector correctly bounded everything he said.

Full per-take table: `table.md` in this directory. Raw JSON:
`measurements-zzz-2026-09-02.json`.

**An honest limit on this evidence.** An "Again" tap discards its audio and
leaves no record anywhere, so the database cannot tell which of these 34 uploads
followed a re-read. The "re-record of an existing clip" column marks takes that
replaced a stored clip, which is a different thing. So the split first-take
versus re-take is **not** directly measurable from tonight's data, and I am not
claiming it. What is measurable, and what the four short takes all share, is that
they began within a few hundred milliseconds of a hand-over — which is the
condition a re-read meets every single time and a first read almost never does.

## The fix

`src/composables/useTapRecorder.js` only. No change to the trim, no change to the
upload, no change to the booth's UI, no waiting added anywhere.

A **standby** recorder now runs through the quiet alongside the active one. A
boundary **promotes** it instead of constructing a new one, so the recorder that
takes over already holds the room tone recorded since the last thing anybody
said — which is precisely the lead-in the trim wants and cannot invent. The
standby is thrown away and respawned on the first quiet frame after any speech,
so a promoted recorder can never carry the previous read into the next clip.

When there is no clean standby to promote — no trusted level meter, or the room
talking right up to the tap — it falls back to exactly the old behaviour. Never
worse than before; usually much better.

The roll-over now also waits for a standby that holds a full `PRE_ROLL_MIN_MS`
before it rolls, which closes the 800 ms window that produced the 0 ms take.

Pinned by four new tests in `useTapRecorder.margins.test.js`, written against the
existing fake MediaRecorder plus a fake level meter, measuring the **age** of the
recorder that ends up holding the take — because age is the only thing the trim
can spend.

## What this costs

Two MediaRecorders now run continuously on one stream where one ran continuously
and a second ran transiently. On a phone that is a real if small step up in
encoder load, and it is the one thing to watch if anything feels off in the booth.

## What is still open

Nothing here was verified by actually speaking into the deployed booth — see the
report. The unit tests measure the mechanism; a human tapping through zzz once
measures the result.
