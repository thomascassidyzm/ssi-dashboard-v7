# Your voice, four ways — listen and pick

**2026-08-27.** Two legs made it in, one is confirmed out, one is half a step away. Everything below is raw model output — nothing mastered, nothing tidied — because mastering one leg and not another would flatter whichever leg got polished.

**Start here, not with the tables.** Play the source clip first so your ear has the target, then play B1 through both legs back to back. Three lines, all held out of the clone source, so no leg is repeating something it was trained on.

---

## The target — your clone source

This is what every leg was given, and what they are all trying to sound like. 6.3 seconds, the cut that fits Cartesia's 10-second ceiling:

https://watson-1.tail4968cb.ts.net/evidence/tom-clone-source-2026-08-27/clips/cartesia-cut-raw.mp3

The longer 24.5s version, which is what Chatterbox actually got:

https://watson-1.tail4968cb.ts.net/evidence/tom-clone-source-2026-08-27/clips/block4-extended-raw.mp3

---

## B1 — "I'm not going to be able to remember the whole sentence"

**xAI** — your existing Tom001 clone, the reference:

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/xai-b1.mp3

**Chatterbox** — self-hosted on Holmes, no per-use cost:

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/chatterbox-b1.mp3

---

## B2 — "what's it like in the part of the world right now?"

**xAI:**

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/xai-b2.mp3

**Chatterbox:**

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/chatterbox-b2.mp3

---

## B3 — "he fought in Italy at about six o'clock"

**xAI:**

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/xai-b3.mp3

**Chatterbox:**

https://watson-1.tail4968cb.ts.net/evidence/tts-bakeoff-2026-08-27/chatterbox-b3.mp3

---

## One thing worth listening for on Chatterbox

Play its three clips **in a row** and ask whether they sound like the same person, before you ask whether they sound like you. A crude pitch measurement across the three came out noticeably spread — one clip below your source, one above — which suggests take-to-take consistency may be this leg's weak point even if the timbre lands. That is a hypothesis from one number, not a verdict, and your ear settles it in ten seconds.

Also true, and the paid legs do not share it: **Chatterbox watermarks every clip it makes.** Resemble's "perth" watermarker is always on and cannot be switched off. It is designed to be inaudible, but it is a signal deliberately added to the waveform of anything we would ship.

---

## Where each leg stands

| Leg | In? | Cost to run | What happened |
|---|---|---|---|
| **xAI** | ✅ in | pennies per clip, per use, forever | The working baseline. Tom001, `gfzdpspr5fdp`, straight through the existing production path |
| **Chatterbox** | ✅ in | **£0 per use** — ~3s of Mac compute per 1s of speech | Running on Holmes (M4) on Metal. ~5 GB installed, removable in one command |
| **Cartesia** | ⏳ one step away | $5/mo Pro, already paid | Key works and generates speech; **cloning alone returns 402 "not available on the free tier"** |
| **OpenAI** | ❌ out | — | Voice cloning is still sales-gated. Not a self-serve feature at any price |

---

## The two honest gaps

**Cartesia is not here, and it is not for want of a key.** Your key authenticates, lists voices, and generates real audio on sonic-3, sonic-2 and sonic-turbo — I checked all three. Only `POST /voices/clone` is refused, with `plan_upgrade_required`: *"This feature is not available on the free tier."* So the account is live and the Pro entitlement has not attached to the workspace this key belongs to. The usual cause is a workspace mismatch — subscription bought on one, key created in another. A retry is running every 90 seconds in case it is only propagation lag. There is a card on your plate with the 30-second console check.

**OpenAI is out, and this was re-checked today rather than taken from the August note.** The current guide still reads: *"Custom voices are limited to eligible customers. Contact our sales team to learn more."* It is an organisation-level flag their sales team switches on; no API key unlocks it. The nearest self-serve thing, `gpt-4o-mini-tts`'s `instructions` parameter, steers how a stock voice performs — it cannot be your voice. Nobody has opened that sales conversation, and I did not open it, because that is yours to start or not.

---

## What this cost

Three xAI clips at a few pence. Three Cartesia probe calls, a few hundred credits out of 20,000. Chatterbox: nothing but Holmes's own electricity. The $5 Cartesia subscription is the only real money, and it is inside the $20 cap you set.

## The decision, when your ear has had its say

If Chatterbox holds up, it is the only leg with **no per-use cost at all** — which at estate scale is not a small thing, and it is the leg whose ceiling is our own hardware rather than someone's pricing page. If it does not hold up, the real comparison is xAI against Cartesia, and Cartesia needs one console check from you before it can speak at all.
