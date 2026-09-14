# Tom's recording pack — the phase-2 clone source

**One session. A phone is fine. Read straight down this page.**

2026-08-26. You are the test-clone source for the TTS bake-off: your voice records the consent
clip and the cloning sample, and phase 2 scores clone fidelity and repeatability on you. No
consent conversation with Aran or Catrin is needed — production voice casting is a separate,
later decision, once we know which vendor we're on and what its real consent terms are.

Three candidates get cloned: **Cartesia**, **OpenAI**, **Chatterbox** (self-hosted, open weights).

---

## The one thing that decides the shape of this

I expected the strictest vendor to demand a long recording. It's the opposite. **OpenAI's
documented limit is a ceiling: "The audio samples must be 30 seconds or less."** Cartesia's
instant clone is "a clip of up to 10 seconds". Chatterbox states no duration requirement at all.

So the sample that all three candidates can share is **about 25 seconds long** — and it has to be,
because anything longer is unusable by OpenAI. That is the like-for-like test, and it takes you
under five minutes to record including the consent clip.

There *is* a long requirement, and it belongs to exactly one vendor: **Cartesia's Pro Voice Clone
— "30 minutes is the minimum, and 2 hours or more gives the best results."** No other candidate
can consume that. Recording 30 minutes and feeding it to Cartesia alone would compare a pro-tier
Cartesia clone against instant-tier everything else, which measures the tier, not the vendor.

**My recommendation: record blocks 1–3 today (five minutes) and stop.** Block 4 — the 30-minute
pro read — is written out below and stays optional: worth doing only if Cartesia is otherwise
winning and we want to see its ceiling. It doesn't need to happen in this sitting.

---

## Before you press record — the control principle

This is a same-conditions test. Every candidate must be judged on the same audio, or we're
scoring your microphone instead of their models.

- **One room, one mic, one sitting, one distance from the phone.** Don't move mid-session.
- **Don't re-record block 3 later.** If you fluff it, do the retake immediately, same position.
- **Same delivery throughout** — the voice you'd actually want narrating a course. Cartesia's own
  guidance: *"Use clean recordings of a single speaker at the volume, pacing, and audio quality
  you want."* OpenAI's: *"The model copies exactly what you give it — tone, cadence, energy,
  pauses, habits."* Whatever you do, they copy.
- **Quiet room, no background noise, nobody else audible, no music.**
- **Avoid long pauses.** Cartesia: *"Pauses in the recording will be mimicked by the cloned
  voice."* Don't leave silence at the start or end either.
- **One file per block.** Record each block as its own recording — don't run them together.
- **Don't worry about the file format.** Send whatever your phone makes; we transcode once to a
  single WAV and feed that identical file to all three vendors. That's part of the control.
  (Worth knowing why we do it centrally: iPhone Voice Memos produce `.m4a`, and Cartesia's
  documented format list — flac, mp3, mpeg, mpga, oga, ogg, wav, webm — doesn't include it.)

One honest caveat: OpenAI's guidance asks for *"a professional XLR microphone"* about 7–8 inches
away. A phone is not that. It lowers the ceiling for everyone equally, so the comparison stays
fair — but a phone clone will sound worse than the best each vendor can do. If you'd rather use a
proper mic, do; just use the same one for the whole session.

---

# BLOCK 1 — the slate

Ten seconds, for our records. Not sent to any vendor.

> Tom Cassidy, twenty-sixth of August twenty twenty-six, TTS bake-off phase two, clone source
> recording, recorded on a phone.

Stop the recording. Start a fresh one for block 2.

---

# BLOCK 2 — the OpenAI consent clip

**This is mandatory and it is word-perfect.** OpenAI: *"The consent audio recording must only
include one of the following phrases. Any divergence from the script will lead to a failure."*

Record this sentence **alone** — nothing before it, nothing after it, no slate, no "right then":

> **I am the owner of this voice and I consent to OpenAI using this voice to create a synthetic
> voice model.**

Read it once, cleanly, at your normal pace. Stop.

**Cartesia requires no spoken consent clip** — its docs specify none. What it does require is
contractual: *"You may only submit your own voice and audio recordings or those of others with
explicit consent."* You're cloning yourself, so that's satisfied by fact.

**Chatterbox requires nothing at all.** It's MIT-licensed open weights running on our own
hardware — there is no vendor in the loop to consent to. Its only stated condition is a
general-conduct line in the README, and its output carries an inaudible Resemble "PerTh"
watermark by default. No consent step exists, and I'm not going to invent one.

---

# BLOCK 3 — our own consent record *(optional, 15 seconds)*

Not required by any vendor. This is for our file, so that when someone asks in two years who
authorised a clone of your voice, there's an answer in your own voice:

> I'm Tom Cassidy. This is my own voice, recorded by me on the twenty-sixth of August twenty
> twenty-six. I consent to SaySomethingin using this recording to create test voice clones with
> Cartesia, OpenAI and Chatterbox, for evaluation purposes.

Skip it if you'd rather. It's belt-and-braces, not a gate.

---

# BLOCK 4 — THE CLONING SAMPLE

**This is the one that matters.** One take, about 25 seconds, no pauses, straight through. It is
the single sample all three candidates get.

Read it in the voice you'd want teaching a course — warm, unhurried, talking to one person.

> **Right, let's begin. I'm going to say something in English, and then you're going to have a go
> at saying it back. Don't worry about getting it perfect the first time — nobody does. Take your
> time, say it out loud, and if you need to hear it again, just ask. Ready? Here's the first one.**

Notes:

- **55 words, about 22 seconds at a normal reading pace.** If it comes out over 28 seconds, cut
  the last sentence and go again — OpenAI's 30-second cap is hard.
- The **first two sentences** ("Right, let's begin… saying it back") run about 9 seconds on their
  own. That's the window we'll cut for Cartesia's instant clone, which takes up to 10 seconds. So
  read those first two sentences especially cleanly and don't drift in pace after them.
- **Nothing in the bake-off test set appears in this passage, deliberately.** The 396 benchmark
  utterances the clones will be asked to speak are held out. If the sample contained the test
  sentences we'd be measuring repetition, not cloning.

Do the retake immediately if you need one, without moving. Two or three takes is normal — we'll
pick the cleanest, and the reject takes cost nothing.

**If you're stopping here, you're done. Five minutes, and phase 2 can start.**

---

# BLOCK 5 — the Cartesia Pro read *(optional, 30+ minutes, another day is fine)*

Only Cartesia can use this: *"30 minutes is the minimum, and 2 hours or more gives the best
results"*, on the Startup plan and above, self-serve — no sales call. Training then takes up to
three hours. Nothing else on the shortlist has a tier that consumes this, so it tells us Cartesia's
ceiling and nothing comparative.

Same room, same mic, same delivery as block 4. Cartesia's docs impose **no content requirement** —
only clarity, target language, pacing, and no long pauses. So this is deliberately loose:

**The first ten minutes: read the passages below.** They're written to be varied — statements,
questions, short lines, long lines, names, numbers, and a little dialogue — because that's what
gives a clone range, even though no vendor documents it as a requirement.

**The remaining twenty minutes: just talk.** Talk about the method, about a course you're
building, about anything, at the same pace and in the same voice. Free speech is easier than
reading for half an hour and gives more natural prosody. Don't read the same page three times —
duplicated material teaches the model your reading rhythm, not your speaking voice.

---

### Passage A — plain narrative

The first time someone tries to speak a new language out loud, something odd happens. They know
the words. They've read them, they've heard them, they could pick them out on a page without
hesitating. And then they open their mouth and nothing arrives in the right order. It isn't a
memory problem. It's that knowing a thing and doing a thing sit in different places, and only one
of them is built by practice. So we practise the doing. Not the reading, not the recognising, not
the quiet confidence of understanding somebody else — the doing. You say it, out loud, badly, and
then you say it again slightly less badly, and after a while you stop noticing that you're doing
it at all.

### Passage B — questions

What would you like to do this evening? Do you think we'll get there before it closes? How long
have you been learning? Would you mind saying that again, a bit more slowly? Is it always this
busy on a Tuesday? Are you sure you've got enough time? Why does everybody stop at exactly the
same point? Shall we try that once more? Can you hear the difference between those two, or do they
sound the same to you? Where did you say you were staying?

### Passage C — short lines

Not yet. Almost. Try again. That's it. Nearly. Once more, from the top. Good. Stop there. Slower.
Louder. Again. Now without looking. Perfect. Now the other one. Don't think about it. Say it.

### Passage D — long sentences

If you've spent any time at all trying to learn a language the way most of us were taught it at
school, you'll recognise the peculiar feeling of having accumulated a great deal of information
about a language without ever having acquired the ability to use it, which is a bit like owning a
detailed map of a city you have never once walked through, and being surprised that you get lost
the moment you arrive. What we're after is something much less impressive on paper and much more
useful in practice: a small number of things you can genuinely say, without hesitating, without
translating, without rehearsing them in your head first — and then, slowly and steadily, a larger
number of them, until one day somebody asks you a question you weren't expecting and you answer it
before you've noticed you've done so.

### Passage E — names and numbers

Aberystwyth, Caernarfon, Llandudno, Machynlleth. Barcelona, Bordeaux, Bologna, Bruges. Catrin,
Aran, Sascha, Noor. It's twenty past four on the fourteenth of March. There were nine hundred and
forty-three of them, up from six hundred and eighteen last year. Room 12B, second floor, at half
past nine. Call me on oh one two three, four five six, seven eight nine oh. Twenty-five per cent
of ninety-six is twenty-four. The 2026 figures aren't out yet. Nineteen eighty-four. Three, seven,
eleven, nineteen, twenty-three.

### Passage F — dialogue

"Are you coming?" — "In a minute. I've nearly finished." — "You said that twenty minutes ago." —
"Did I? It didn't feel like twenty minutes." — "It never does. Right, I'm going without you." —
"No, wait, wait. Give me thirty seconds and I'm there." — "Thirty seconds." — "Thirty seconds,
I promise." — "I'm counting." — "You always count."

### Passage G — closing

That's the whole idea, really. You don't learn a language by understanding it. You learn it by
saying it, out loud, before you feel ready, and being wrong often enough that being wrong stops
mattering. Everything else is detail.

---

## What happens next

Send us the files. We transcode block 4 once, feed the identical WAV to all three candidates,
build a blind listening pack with the provider identity stripped, and you score it by ear against
the 396 held-out benchmark utterances. Phase 1 proved coverage doesn't discriminate between these
vendors — only your ears do.

---

## Sources, and the gaps in them

Every requirement above is quoted from the vendor's own current documentation. Where a vendor
says nothing, this pack says so rather than inventing a rule.

| Requirement | Vendor | Their words |
|---|---|---|
| Consent clip, verbatim, alone | **OpenAI** | *"The consent audio recording must only include one of the following phrases. Any divergence from the script will lead to a failure."* |
| Sample **≤ 30 seconds** — the binding constraint | **OpenAI** | *"The audio samples must be 30 seconds or less."* |
| Instant clone clip | **Cartesia** | *"You'll be asked to provide a clip of up to 10 seconds"* |
| Pro clone — the only long requirement | **Cartesia** | *"30 minutes is the minimum, and 2 hours or more gives the best results"* |
| No consent step, no account | **Chatterbox** | MIT-licensed open weights, self-hosted; docs state no consent, verification or account requirement |

- **OpenAI** — `developers.openai.com/api/docs/guides/text-to-speech`; usage policy effective
  29 Oct 2025. Custom Voices is **sales-gated**: *"Custom voices are limited to eligible
  customers. Contact our sales team."* Nobody has opened that conversation yet — it blocks the
  OpenAI leg of phase 2, not this recording.
- **Cartesia** — `docs.cartesia.ai/build-with-cartesia/capability-guides/clone-voices` and
  `/clone-voices-pro/playground`; acceptable-use and terms at `cartesia.ai/legal`.
- **Chatterbox** — `github.com/resemble-ai/chatterbox`, `huggingface.co/ResembleAI/chatterbox`.

**Gaps, stated plainly:**

- **OpenAI states no minimum sample length** — only the 30-second maximum. The widely-quoted
  "15 seconds" is from the March 2024 Voice Engine *research blog*, a capability claim about a
  product that never shipped self-serve. It is not a spec, and this pack doesn't treat it as one.
- **Cartesia states no minimum for its instant clone** either — only "up to 10 seconds". A
  "3 second minimum" circulating on third-party sites is unverified and not in their docs.
- **Chatterbox states no duration requirement of any kind.** Its README shows a filename,
  `your_10s_ref_clip.wav` — that is an example filename, not a documented rule, and it would be
  dishonest to quote it as one.
- **No vendor documents a sample rate, bit depth or mono/stereo requirement** for cloning input.
- **Cartesia documents no required consent wording.** Block 3 is our own idea, labelled as such.
- **ElevenLabs**, a control rather than a candidate, has the strictest regime we found — Pro
  cloning needs *"the bare minimum we recommend is 30 minutes"*, 2–3 hours ideally, plus a spoken
  voice-verification captcha. **The exact captcha wording is not published**, so it cannot be
  pre-recorded from this page; it would have to be read live in their interface. If we later
  decide to clone-test the controls too, that's a second, separate sitting.
- No vendor page carried a visible last-updated date. Everything here was read on 2026-08-26.
