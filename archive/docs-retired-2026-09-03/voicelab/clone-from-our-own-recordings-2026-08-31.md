# Cloning from the recordings we already hold — and the consent record on the voice

**2026-08-31.** What landed, what it proved on live data, and the one thing that changes what you thought was there.

---

## Read this first: the corpus you named is not what you think it is

You said Aran has recorded the English instructions and encouragements for Welsh north and south, keyed by known language, and that this is the ideal clone source.

**Those recordings exist and they are exactly where you said — 74 files, 52 minutes, one speaker, in English, shared across seventeen English-known courses.** They are filed under `voice_id = 'human_recording'` with `origin = 'human'`.

**But this estate has already established, by your own ear, that they are not Aran.** On 27 August a clone was built from one of those instruction clips and you identified the result as clone output rather than a real recording. The write-up from that day says it plainly:

> "the `instruction` clips you correctly identified as clone output *also* carry `origin: 'human'`, all 1,178 of them. So that column records an intention, not a fact, and it cannot distinguish a real recording from a good clone."

So I did not clone from that corpus, and nothing in this build treats `origin='human'` as proof of anything. **What the estate holds of Aran, confirmed by your ear, is one file: the 44-second Welsh course welcome.** That is what I built and proved against — the same clip the good clone of 27 August was cut from. Two more welcomes filed as `human_Aran` (German, 43s; Spanish, 46s) are candidates you have never confirmed.

If that 52-minute corpus really is Aran and the 27 August call was about a different clip, say so and it becomes the best clone source in the estate overnight. **Confirming or ruling it out is one listen and it is worth your minute** — the difference is between 44 seconds of source material and 52 minutes.

---

## What Cartesia actually needs — the paragraph you could read to someone

> *"Cartesia needs one single, unbroken take of you speaking naturally, not a string of short recordings edited together. Ten seconds is the least it can work with, but you'll get a noticeably steadier clone if you give it more — somewhere between twenty and sixty seconds is the sweet spot. Just talk normally, the way you want to sound when teaching: don't read in a flat, neutral voice, and don't leave long pauses or silences, because whatever gaps or hesitations are in the recording will come back out in the clone. Record somewhere quiet, on a decent microphone, with no background noise or music. Once you're done, trim the start and end so there's no dead air and you're not cut off mid-word — but otherwise leave it as one continuous piece of speech, start to finish."*

The specifics, each with where it came from:

| | | |
|---|---|---|
| Minimum | **10 seconds** — "as little as 10 seconds of audio" | Cartesia docs |
| Best | **20–60 seconds**, and the longer end matters more for an unusual accent | Cartesia docs |
| Number of clips | **Exactly one file.** There is no way to hand it several | Cartesia docs |
| Pauses | **Hurt** — "pauses in the recording will be mimicked by the cloned voice" | Cartesia docs |
| Formats | flac, mp3, mpeg, mpga, oga, ogg, wav, webm | Cartesia docs |
| Sample rate, mono/stereo | **Not specified anywhere** | gap |
| Room echo, clipping, compression | **Not addressed anywhere** — obviously bad by inference, not by rule | gap |
| Background music | **Not mentioned** | gap |
| One take vs. a stitch | **Not addressed directly** | gap — read below |

**One continuous take beats a stitch, and I have built the tool to say so.** Cartesia never addresses it head-on, so this is a read rather than a quote — but every documented behaviour points one way. The guidance talks throughout about "your recording" as a single performance, and the warning that pauses get mimicked means the whole clip's rhythm is being read as one continuous prosodic take. Splice six separately-recorded instruction lines together and the joins carry jump-cuts in tone, pacing and room sound that the clone can learn as the speaker's own rhythm. **The estate's own good result agrees**: the clone you judged good was nineteen seconds cut from the middle of one continuous 44-second take at natural pauses, and nothing else done to it.

That matters directly for the instruction-and-encouragement idea: those clips are individually short, so cloning from them means stitching, which is the shape that clones worst. Aran's welcome is 44 seconds of continuous speech and needs no stitching at all.

**One correction to the estate's own notes.** `docs/tts-bakeoff/phase2-clone-source-from-clone-2026-08-27.md` quotes Cartesia as capping an instant clone at "a clip of up to 10 seconds". That is wrong — ten seconds is the floor, not a ceiling. The Voice Lab's own on-page wording was already right; it is now sharper and cites its date.

---

## What the page does now

Open **Popty → Admin → Configs → Voice Lab → Languages → "+ Make a new voice"**.

**It opens on the estate.** Type a language, press *Find speakers we hold*, and you get every speaker the estate has recordings of with **both numbers on the row** — how many clips, and how many minutes. For English today that reads:

```
legacy_import     8,547 clips / 423 min      human            1,310 clips / 232 min
human_recording      83 clips /  59 min      human_Aran           2 clips /   1 min
Aran                  1 clip  /   1 min      human_aran_cym_n    26 clips /   0 min
```

Tap a speaker and you get their clips, **longest first**, each with a player that streams the original file straight from our own bucket. Tick what you want. The page tells you before you clone whether you have picked one continuous take (good) or several that will be joined (a compromise, and it says why).

Recording on the page and uploading a file both still work. They are now second and third, for people we hold no audio of.

**Nothing in this touches a single existing recording.** It copies bytes. It never writes, moves, deletes, re-encodes or re-points a `course_audio` row. And a synthetic voice can no longer be cast into Welsh, Breton or Pennsylvania Dutch at all — that guard did not exist on the casting route until today, despite your ruling of 13 August; casting one now comes back with *"cym is human-voiced only — Aran's and Catrin's recordings are never replaced by synthesis."*

---

## Consent, recorded as a fact

Nine new columns on `voices`, five states, two database constraints. **You can answer "whose voice is this, who authorised it, and when" in SQL for any voice in the estate** — it is not a sentence in `notes`.

- **A clone is born `awaiting authorisation`**, with the person **named**. It is a recorded state, not a NULL, and it never reads "unknown".
- **The tool cannot invent a yes.** "Authorised" without a named human, a means and a date is refused by the route in plain English and refused again by the database's own CHECK. Recording *who asked* and *who consented* are separate columns.
- **Naming the person is required at clone time.** Not consent — you obtain that — but a name, because a record nobody can attach to a human is decorative on the day it is written.
- **Nothing is backfilled.** All 307 existing voices read `not_recorded`, honestly.
- The fact travels onto the candidate list, the cast slot and the clone result. **Casting an unauthorised voice warns plainly first** — naming the person and what is missing — and then lets you do it. *That last part is my default, not your ruling: I did not make casting impossible, because a hard block is your call. Say the word and it becomes one.*

There is a **"consent…"** button beside every voice the question is about, which is where you record a real yes once you have actually asked.

### The voices with no consent record — yours to fill in

Twenty-one, and the question is only really about the first seventeen plus Tom_002 and Tom:

**Human recordists (17)** — the four Welsh North slots, the four Welsh South slots, the four "Welsh Course" slots, the four Spanish course slots, and `human_kai_fin` (a test identity, not a real recordist).

**Clones and personal voices (4)** — `cartesia_e7ed10ad…` "Tom_002", `gfzdpspr5fdp` "Tom" (your xAI clone, created 1 May), plus two Cartesia stock Spanish voices that arguably need nothing.

**And one that is not in the table at all**: `aran_english_003` exists at Cartesia — it is the clone of 27 August that you judged good — but has no `voices` row, so it carries no consent record and cannot be seen from the estate. It is worth a decision either way.

**Your own voice is the ten-second one**: open the Voice Lab, press *consent…* beside Tom_002, and it is done.

---

## Proof it works, end to end, on live data

Run against the real database and the real Cartesia, twice, on 31 August:

1. **Listed the speakers** — six English speakers, with both numbers. Free.
2. **Listed Aran's clips** — the one confirmed 44-second welcome, playable from our own bucket. Free.
3. **Cloned from it** — one continuous take, 44.3s, no stitching. `cartesia_a224a3b0-…`. Born **awaiting authorisation**, person named, sample provenance recorded as *"1 clip(s) already in the estate (44s), from course_audio — filed under voice id 'Aran'"*.
4. **Auditioned it on a real course line** — *"She wants to find out what the answer is."*, from **eng_for_ben**, named on screen, picked by the existing picker. One clip, 2.5 seconds, 41 characters.
5. **Refused a hollow yes** — "Say how they authorised it — in person, by email, by message, on a call." Then recorded a proper one and read it back.
6. **Cast it on English** and asked the *real render-path reader* what 84 English-known courses now resolve their instruction and encouragement voice to: **all 84 resolved to the clone**, `source: language-cast`, guide slot, rank 0. That is the acceptance test, and it passes for a clone specifically.
7. **Welsh guard held** — casting it into `cym` was refused.
8. **Removal**: refused while cast (409, naming the slot), allowed after clearing, deleted at Cartesia and in `voices`.

**Cleaned up.** Both test clones are gone from Cartesia and from `voices`. `voice_language_roles` is back to zero rows. The only owned voices at Cartesia are the three that were there before: `tom_001`, `Tom_002`, `aran_english_003`.

**Two real bugs were found by doing this rather than reading the code**, and both would have bitten you live: the clip re-read timed out against a 2.5-million-row table with no index on `s3_key`, and ffmpeg refused to build a source from a *single* clip — the commonest case there is. Both fixed and covered.

Total vendor spend for the whole verification: **two clones (free) and two audition clips, 82 characters.**

---

## What I defaulted, so you can move it

1. **Casting an unauthorised voice warns, it does not block.** Yours to harden.
2. **The removal control got built** — it was the half-hour job the 30 August run described, and a page that can create but not un-create is a trap in front of an audience. It refuses outright while the voice is cast.
3. **Consent shape**: whose voice / who authorised / how / when / who wrote it down / provenance of the sample — six facts, kept apart on purpose.
4. **Ceilings on a clone source**: 90 seconds and 12 clips. Both are about keeping the *result* good, not the bill down — building a source costs nothing.
5. **The badge is drawn only for voices the question is about** — a human recordist, a clone, or anything with a record already. Painting "no consent recorded" on 165 Azure stock rows would bury the handful that matter.
