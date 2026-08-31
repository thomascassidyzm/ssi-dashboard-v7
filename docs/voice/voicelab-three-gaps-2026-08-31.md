# The Voice Lab's three gaps — all three closed, and driven on the live site

**2026-08-31.** Your three: no way to give consent to a voice, no way to hear a voice with no clip,
only one clip per voice. All three are live on popty.app now, and each screenshot below is the
DEPLOYED page, not a local build.

---

## 1. Consent — the chip that says a voice has none is now the way to give it

One tap on `consent…` opens the panel under that row. Whose voice, then either route: they read the
line aloud into the page and the machine checks the recording, or, if they are not here, a named
human states it and signs it. **They said no** sits beside the yes, one tap, same size.

![before](/evidence/voicelab-three-gaps-2026-08-31/1a-before-no-cast-button.png)

There is no Cast button on a voice with no consent — that part was already right. What was missing
is the way through, and the amber chip is now it.

![the panel](/evidence/voicelab-three-gaps-2026-08-31/1b-consent-panel.png)

The panel plays the voice first — you cannot consent to something you have not heard — then asks.

![read aloud](/evidence/voicelab-three-gaps-2026-08-31/1c-line-read-aloud.png)

The line read aloud, on the page, checked against the recording by the machine. It refuses a
recording the line is not in, and quotes what it did hear.

![the second stamp](/evidence/voicelab-three-gaps-2026-08-31/1d-second-stamp.png)

Then the second stamp, which another worker landed the same evening and which this reuses: they
hear the thing that will actually be used and answer. **No** is the same size as **yes**.

![after](/evidence/voicelab-three-gaps-2026-08-31/1e-after-authorised-and-castable.png)

Authorised — and the Cast button is there. That is the whole point: the lock had no key, and now
it has one.

**I used a TEST voice for this walk, never a real person's.** A consent record is about somebody;
writing one onto Tom_002 or onto Aran would be forging it. The test row is deleted — and nothing
was ever created at Cartesia, so there is nothing to clean up there.

---

## 2. A voice with no clip — tap the outline, it renders and plays

A dashed outline means nothing has rendered this voice yet. Tapping it renders one line and plays
it. A solid ▶ means there is a clip.

![no clip](/evidence/voicelab-three-gaps-2026-08-31/2a-no-clip.png)

![rendered](/evidence/voicelab-three-gaps-2026-08-31/2b-rendered-and-playing.png)

Same cache, same daily ceiling and same ledger as the row's **Generate preview clips** button — it
is that mechanism, one voice at a time, rather than a second one beside it. A human recordist is
heard on the estate's own recordings of them instead, because nothing synthesises a person.

---

## 3. Several clips per voice — tap the name

![the judging set](/evidence/voicelab-three-gaps-2026-08-31/3a-judging-set.png)

![three clips](/evidence/voicelab-three-gaps-2026-08-31/3b-three-clips-one-voice.png)

**What the set is, and why.** Three real lines from one named course — the material the voice would
actually speak:

- **the middle-length line** — what the course mostly sounds like. It is the same line the page has
  always used, deliberately: every clip already rendered stays valid, and a whole row is still
  compared on identical words.
- **a short one**, preferring a question where the course has one. Short is where a clone clips its
  first consonant or leaves a breath hanging with no sentence to hide it in, and a question is where
  rising intonation gives a synthetic voice away.
- **a long one** — breath, pace and drift. A voice can be convincing for four words and not for
  fourteen, and the middle line cannot show you that.

Deterministic, so two voices are never judged on different words. Three lines for a voice you have
opened, one line for a whole row you are shortlisting: the spend follows the attention rather than
the catalogue.

---

## Two defects the driving found, both fixed

**The consent button did not work.** The recorded take was written to a plain variable, so the page
never noticed it arrived: you read the line aloud, the player appeared, and **Record this consent**
stayed greyed out forever. Nobody could have completed the spoken route.

**The consent chip was being clipped out of reach.** In the two-column guide layout the row ran past
the card's edge and the chip ended up underneath the next card — a decision that looks as though it
was never offered. Rows wrap now.

---

## One thing to know, and one gap

**A recordist is not gated.** Your boundary ruling from this evening — a voice cloned from a person
is gated, a person's own recording is not — is respected here: Aran, Catrin and the Welsh recordist
slots keep their Cast button and still carry an honest "no consent recorded" label. That needed a
one-line fix in this list, which was hiding the button on the strength of a sentence that merely
describes them.

**The gap, stated plainly:** the judging set is three lines from ONE course. For a language taught
in several courses I have not verified that the chosen course is the one you would pick — the
picker prefers the plainest code and an English known side, which is a default I chose, not a
ruling you gave. Say the word and it becomes yours.
