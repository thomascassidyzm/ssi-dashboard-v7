# Where you record it

**[popty.app/r/pack-tom-clone](https://popty.app/r/pack-tom-clone)**

That is the whole answer. Open it on your phone, tap the green button, read. No login — the link is the identity, the same way Aran's and Catrin's links work.

It is the recording screen Aran and Catrin already use, loaded with your pack. Same recorder, same level meter, same play-it-back. Nothing new to learn.

---

## What you'll see

Eleven items, in the pack's order:

| | |
|---|---|
| 1 | Block 1 — the slate |
| 2 | Block 2 — the OpenAI consent clip |
| 3 | Block 3 — our own consent record |
| 4 | Block 4 — **the cloning sample** |
| 5–11 | Block 5, passages A–G — the optional Cartesia Pro read |

Each block is its own item and its own file, which is what OpenAI's rule requires: their consent line has to be alone in its recording, and it is.

**Stop after item 4 and you're done.** That's the five minutes. Items 5–11 are the optional half-hour and can wait for another day — the page will remember what you've recorded.

## Three things that are different from Aran's page

**It does not move on by itself.** Auto-advance is off here, deliberately. The 25-second cloning sample has four sentence pauses in it, and the "stop talking and it advances" behaviour would file a third of a take and call it done. Read the block, then tap **Next**. The instructions on the page say so.

**The 30-second cap is enforced, not printed.** If a take of the cloning sample runs over 30 seconds, the page refuses it and tells you how long it actually was — because OpenAI will refuse it too, and finding that out now beats finding out in phase 2. The take is still kept; it just doesn't count as done.

**Nothing is cleaned up.** The ordinary recording path trims and normalises what a learner hears. Yours is stored exactly as the microphone gave it, because trim and gain are precisely what a cloning model would otherwise learn as your voice.

## Retakes

Just read it again. Every take is kept, the newest one wins, nothing is overwritten and nothing is deleted. Tap **Again** on a line, or turn on "re-read lines I've already recorded" to go back over anything.

## Where the clips go, and where they can't

`clone-source/tom-clone/<block>/` in the audio bucket, tagged in the object itself as `purpose: tts-bakeoff-clone-source`.

They are not course audio and they cannot become course audio. This path writes no database row at all — not `course_audio`, not `recording_provenance`, nothing. There is no row for an autolinker to find and no course code anywhere in the write path, so there is nothing to leak. Verified live: recorded a take end to end, played it back byte-identical, and confirmed zero rows created anywhere.

---

*The pack itself — the words to read and every vendor quote behind them — is unchanged at [/d/d6dd5951](/d/d6dd5951). This page is only about where to do it.*
