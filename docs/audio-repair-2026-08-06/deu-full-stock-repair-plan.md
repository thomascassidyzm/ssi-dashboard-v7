# German chopped clips — extending the repair from 46 clips to the full stock

2026-08-06. Written after you listened in Popty and said: *"only some of the files are fixed"*,
*"as often as possible"*, *"clips still a lot after as"*, *"the new ones are all good"*,
*"the old ones are hit and miss, same failure rate"*.

---

## What you heard was exactly right, and I found the clips

I whisper-checked the whole "as often as possible" family — 29 clips. Four of them are cut off
after "as", precisely as you described:

| what it should say | what it actually says |
|---|---|
| Are you learning German as often as possible? | "Are you learning German as often?" |
| I want to learn now how to speak as often as possible | "I want to learn now how to speak as often as" |
| I'm trying to say something as often as possible | "I'm trying to say something as often as—" |
| it is useful to ask as often as possible | "It is useful to ask as often as" |

**All four are rebuilt, live, and verified.** I fetched the new bytes back off the server and
listened to them with speech recognition: all four now say the whole sentence. You can play them
in Popty now. Nothing was deleted — the old clips are still there for comparison.

One more clip in that family is also chopped, but nothing in the course points at it, so no
learner can ever hear it. I left it alone rather than pay to fix a clip nobody plays.

Worth noting: **every one of those is an ENGLISH clip.** This is not a German-voice problem. The
English side is being cut off just as badly as the German side.

---

## Why the first repair only fixed some of it — two separate reasons

**Reason one: it was only ever pointed at 46 clips.** The pipeline works, exactly as you heard.
It just never got aimed at the rest of the course.

**Reason two, and this one is the interesting bit: a clip is often used in more than one place.**
When I planned the next batch of 1,036 clips, 923 of them turned out to be used in more than one
spot in the course, and 542 are used by practice phrases as well as by the LEGO itself. The
original repair only ever updated the LEGO's copy of the link. So a clip could be genuinely fixed
in one place and still play the old broken version somewhere else in the same course. That is a
large part of "hit and miss". The new code updates every place a clip is used — 2,347 links across
those 1,036 clips, where the old code would have updated 1,036 of them and left 1,311 broken.

There is also a smaller pocket: 205 of those 1,036 clips *were* repaired overnight, but the new
audio was filed in a place Popty doesn't look, so Popty still plays the old broken one. Those get
picked up by the same run.

---

## How much is actually broken — two numbers, from two different measurements

I want to be straight about where each number comes from, because they were measured differently.

**From the census job (not mine):** it measured all 46,277 German clips with a physical test —
does the sound stop abruptly at full volume. It found **7,254 chopped**, and because that test is
known to catch only about half of them, its corrected estimate is **~15,100, about a third of the
German course.** Its full report is at https://watson-1.tail4968cb.ts.net/d/a318a0b6

**From my scan:** I used speech recognition on the actual deployed audio and asked the only
question that matters — is the last word actually there. That is ground truth, not an estimate,
but it has only covered the LEGO clips so far: **1,036 of 5,100 LEGO clips are chopped — 20.3%.**

The two agree well enough to act on. A scan of the remaining 42,231 clips is running now, free,
and will give the same ground-truth answer for the whole course in about seven hours.

---

## What I'd like to spend

The money here is almost nothing. The honest caveat: this repo holds exactly one rate figure for
the voice engine we use, and its own comment says it is a rough guess, not a billed rate. On that
figure:

| | clips | cost | time |
|---|---|---|---|
| **The LEGO queue — what I'm asking for** | 1,036 | about 11p | ~3.5 hours |
| The whole German course, later | ~15,000 | about £2 | ~50 hours |

**The real cost is time, not money.** About twelve seconds per clip, one at a time.

**My recommendation: yes to the 1,036.** They are the LEGO clips — the intro, voice one and voice
two that carry the learning journey, which is the ordering you asked for. It is the queue I have
ground truth for. It fixes a fifth of the spine of the German course, tonight, for about the price
of a stamp. And while it runs, the free scan builds the ground-truth list for everything else, so
the next decision is a properly-measured one rather than a guess.

If you'd rather see it faster than 3.5 hours, I can run several clips at once — say so and I'll
do that.

---

## Rails held

- Nothing deleted. Old clip rows and old audio files all retained, tombstoned, and logged in the
  revision ledger with both versions' lengths, so old and new stay comparable.
- Make-before-break: each clip is rendered, checked for silence and truncation, speech-recognised,
  and only then does the course start pointing at it. Any failure at any step unwinds and the old
  clip keeps playing.
- Every rebuilt clip gets a new id, which is what makes it actually reach your ears — it defeats
  the browser cache and the phone's stored-audio cache at the same time.
- No re-levelling. That was measured and settled: the new clips sit +0.9 dB above what they
  replace, well inside normal.

## Still open, not mine to fix

The learning app serves audio with a cache header that tells phones to keep it forever. The fix
for that is on an unmerged branch in the learning-app repo (`feat/audio-revision-cache-bust-2026-08-05`),
still unmerged as of today. It does not block any of this — the new-id approach steps around it
deliberately.
