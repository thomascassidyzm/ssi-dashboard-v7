# German audio — fixed, and verified on the bytes the app actually serves

**2026-08-06.** German course (`deu_for_eng`). 57 slots repaired. Every one checked by downloading
the audio the live app hands out and comparing it, byte for byte, against the clip it is supposed to
be. No database inference anywhere in the verification.

---

## Hear it first

This is the phrase you named, as the live app serves it right now:

https://saysomethingin.app/api/audio/181aa253-fb41-496f-83bc-40c3656623fd.v2

And this is what it was serving before, so you can hear the difference:

https://saysomethingin.app/api/audio/4b3fb29d-20aa-492e-9547-ac2d8d1d481e

The old one is 1.0 seconds. The new one is 1.4. Same voice, same words — the old take is the rushed,
clipped generation.

---

## What was actually wrong — and why four fixes missed it

The regeneration passes **did** produce good German audio. All of it. It was sitting in the database,
finished and checked, the whole time.

What they never did was **point the course at it**. A regeneration renames the old clip to
`…::superseded-regen` and writes the new clip as a separate entry. Earlier fixes repointed the
German-language slots. Nobody ever repointed the **English side** — the prompt you hear before each
German phrase — or the presentation lines. So the course kept playing clips that had already been
formally marked dead.

That is why "regenerate and hope" kept failing: **the regeneration was never the missing step.** The
link was.

### The finding that changed the job

The brief for this run said no clean replacements existed, so this would need fresh audio generation.
**That was true when it was written and is no longer true.** My live query: all 107 superseded clips
now have a clean, voice-matched, verified replacement already sitting in the database — created
earlier today.

So this needed **no new audio and no TTS spend at all**. It was a relink: free, instant, and using
clips that had already passed verification. I state both numbers as required — the doc said 0
replacements available, my live query said 107. I trusted the live query.

### Why the fix reaches your ears this time

Each replacement has a **different id from the clip it replaces**. That matters more than it sounds:
both caches in the chain key on that id — your browser's cache keys on the URL, and the offline
store keys on the id itself. A new id moves both at once. The old approach of rewriting audio at a
stable address is precisely the bug that made previous fixes invisible; nothing here was rewritten in
place.

I also bumped the course's audio stamp, which tells already-installed devices to drop their cached
script and re-read. Without that your phone would have kept its old list of ids regardless.

---

## What was verified, and how

**The gate:** one clip repaired first, proven end to end, before anything else ran.

| | |
|---|---|
| Ref the live app hands out | `181aa253-fb41-496f-83bc-40c3656623fd.v2` |
| Old ref, before | `4b3fb29d-20aa-492e-9547-ac2d8d1d481e` |
| Bytes served by the app | sha256 `2b53ed2f6f0679916c12459df026c08adc5288e84f448a928133d4f16ecd5ec9` · 17,280 bytes |
| Bytes of the intended clip in storage | sha256 `2b53ed2f6f0679916c12459df026c08adc5288e84f448a928133d4f16ecd5ec9` · 17,280 bytes |
| **Match** | **exact** |
| Old take's bytes | sha256 `5bc3e70e241ea2c3ad12ae00f0e8b0950e07fdb65c1a33df4b1ae3802049f860` · 12,672 bytes — no longer served |

I also confirmed the old id is **absent** from the live course payload on both production and dev,
not merely deprioritised.

**Then the batch**, on the same recipe, verified the same way:

| | |
|---|---|
| Slots repaired | **57 / 57** |
| Verified by fetched bytes | **57 / 57 pass** |
| Slots still serving a superseded clip | **0** (was 57) |
| New audio generated | none needed |
| Clips deleted | none |

Breakdown: 33 phrase prompts, 5 lego prompts, 3 seed prompts, 12 presentation lines, 4 seed German
slots. Voices were matched exactly to what the course already uses — `eve` for the English side,
`ara`/`leo` for the German — no new voice introduced.

---

## One thing worth your attention

Both clips — the good one and the bad one — **pass the automated speech check identically**. I ran it
myself on the downloaded bytes: both transcribe as "as often as possible", zero character error.

The difference is 1.0s versus 1.4s: the old take is clipped and hurried. **The machine check cannot
hear that. You can.** That is why two days of automated verification kept declaring these clips fine
while you kept hearing something wrong — you were right and the gate was blind, not the other way
round.

I have not tried to fix the gate here; I am flagging it as the reason this dragged on.

---

## Honest gaps

- **The offline bundle route builds audio refs without version suffixes.** The live course routes and
  the app's own content walk all apply them correctly — that is the path you play on, and it is
  verified above. But a downloaded-for-offline course goes through a different function that omits
  the suffix. It does not affect what you are about to hear; it is a real loose end and I did not fix
  it in this run.
- **A parallel trace of the serve route and device cache was still out when this ran.** Its findings
  had not arrived by the time I finished, so they are not folded in.
- **The 107 superseded entries are still in the database**, marked and unlinked, along with their
  audio files. Nothing was deleted. Clearing them is a separate job needing its own approval.

---

## What I need from you

**Play German once.** Start at the beginning — seeds 2 to 5 are where most of these sit, and "as
often as possible" is in seed 3.

If it sounds right, this is done. If you still hear the old take, tell me and it means the break is
downstream of the app's response, which is the one layer I could not test from here without your
device.

You can also just tap the two links at the top and compare them directly.
