# Hearing one LEGO piece of a slow take

**For Kai and Tom — 2026-08-11**

## Short version

Kai was right. The browser already spots every pause you leave between LEGOs
while you are reading a slow pass — it has to, or it would cut your take at the
first gap. But it only ever *counted* the pauses and threw away *when* they
happened, the moment it counted them. So by the time your take reached the
review screen, nothing knew where one LEGO ended and the next began, and the
only two things it could offer you were "play the whole take" and "record the
whole phrase again."

The timings are now kept. Each slow-pass take on the review screen has a row of
**LEGO PIECES** buttons under the waveform, one per chunk, each named with its
own LEGO text. Tap one and you hear that piece on its own — a clean cut, with
the pauses either side left out.

## What you get on the review card

- **One button per LEGO piece**, labelled with the LEGO's own words
  (`▶ dw i` · `▶ eisiau` · `▶ siarad`), not "chunk 1, 2, 3".
- **Only the piece you tapped lights up**, and it stops itself at the end of the
  piece.
- **A warning when the cut does not match the script**: if you missed a pause
  and two LEGOs came out welded together, the card says "2 heard, script has 3"
  and the pieces are numbered instead of named. It will not guess. A
  mislabelled piece would quietly answer the exact question you are asking it.
- **Nothing changes for natural-speed phrases.** A phrase read straight through
  has no pieces, and the card looks exactly as it did before — the Play button
  above already is that.

## Was it being thrown away, as Kai suspected?

Yes, and precisely there. The VAD's chunk counter incremented on every pause
over 400ms and the timing went nowhere — no variable, no upload field, nothing.

Two things changed:

1. **In the browser.** Each pause is now recorded with both its edges (where it
   started, where you started speaking again), timed from the start of the take.
   The final pause is reported with no end, because its start *is* the end of
   your last chunk.
2. **On the upload.** Those boundaries now travel with the take and are stored
   in its provenance record. The server-side aligner still measures the audio
   itself with ffmpeg — this is a second, cheaper witness beside it, and it is
   the speaker's own account of the cut rather than a guess made afterwards.

## How playback works, and why not the obvious way

Each piece plays by decoding the take and playing a slice of it, sample-exact.
The obvious approach — seek the audio player to 1.2s and stop at 1.6s — does not
work on these recordings: a browser-recorded webm carries no duration and no
seek index, so the seek lands somewhere else and you hear the wrong words.

## How it was verified

Not just unit tests. The real studio was driven in a real browser, with the
microphone fed a purpose-built slow read — three bursts of real speech with a
one-second pause between each, exactly the take this feature is for. It was
recorded through the live path, taken to review, and then every piece button was
pressed while the test measured **the actual audio sent to the speakers**.

On a 3.6-second take, the three pieces came out at **0–290ms**, **1210–1590ms**
and **2510–2890ms** — the three bursts of speech, to within one 50ms poll.
Inside each piece: speech. Immediately either side of every edge: silence. That
is what "clean isolated cut" means, measured rather than asserted.

The upload was inspected in the same run and carried all three boundaries.

Also covered by 19 new unit tests: the pause timings coming out of the VAD, the
cut maths (including breaths that must not count, and takes read straight
through), and the review UI wiring.

## What is NOT in this

**Re-recording a single piece is not built yet.** This is the listening half:
you can now hear which piece is wrong, and the boundaries needed to replace one
are captured and stored. Redo still queues the whole phrase. That is the natural
next step, and it is now cheap, but it is not done.

One unrelated test file (`LearningJourneyAudioFlags`) was already failing on
`main` before this work and still is — untouched by this change.

## Where it is

Branch `feat/autocue-chunk-review-playback-2026-08-11`, pushed. Not merged, not
deployed anywhere yet.
