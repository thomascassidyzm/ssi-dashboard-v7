# The clipped German audio — traced end to end, from your live session

**The server's copy of your clip is perfect. The broken one is on your phone.**

Every fix for the last two days changed something on the server. For these clips that could never
have worked, and here is why: **the URL is the cache key, and rewriting a clip's bytes in place
does not change its URL.** Your phone cached the truncated version weeks ago and has been
replaying it ever since, never asking the server again. A new dev build does not clear it — the
audio cache is separate from the app.

---

## The chain, one clip, each link evidenced

**1. What your session actually requested** — your own event, 18:42:44Z tonight, signed in:

```
audio_play  deu_for_eng  dev
url: /api/audio/37adbbb4-4de5-4f4d-a6aa-7ecca80861cf
role: target1   legoId: S0003L01   cacheHit: TRUE
```

That is "I want to learn as often as possible". **`cacheHit: true` means the bytes came off your
device. The server was never asked.**

**2. The URL has no version on it.** The player builds `<uuid>.v<N>` only when the revision is
above 1 — revision 1 stays a bare uuid. That row is at revision 1, so the URL has been byte-identical
since February.

**3. Your cache is keyed on exactly that string.** `cache.match(url)` against `ssi-audio-v1`,
plus an IndexedDB store keyed on the id. Same URL in, same old bytes out, forever.

**4. The bytes on the server were replaced on 3 August — silently.** The database row was written
**24 February**. The S3 object it names was last modified **3 August**. Somebody rewrote the audio
in place, five months later, and left the revision at 1. The URL never moved, so no client ever
found out.

**5. I fetched the server's current bytes and ran them through whisper.** It transcribes
*"Ich will so oft wie möglich lernen."* — complete, CER 0, clean 104 ms tail. **The server's copy
is not truncated.** Same for "I want to speak as often as possible", and for the English prompts,
which I checked too: all complete.

Hear the server's copy of the clip your phone is chopping:

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/F486129F-5BDC-433E-B861-8BF8FCD48E9A.mp3

That is what you should be hearing. If that plays whole for you, the diagnosis is confirmed by your
own ear.

---

## The shared assumption all four attempts held

Silent-marked takes, unpromoted approvals, dead pointers, truncated regenerations — four competent
fixes, all of them server-side, all reported as landed, and every one of them assumed:

> **"If I fix the audio on the server, the learner hears the fix."**

For a clip at revision 1 that is false. Bytes can be replaced any number of times and every device
that already has it will keep serving the old copy. That is why regeneration "doesn't cure" the
tail-chop: it does cure it, on the server, where you cannot hear it.

It also explains the mixed old/new session exactly. In your events, the clips carrying `.v2`
(revision 2 — repaired through the proper accept path, which bumps the revision) play fresh.
The bare-uuid ones play from cache. Same session, two behaviours, one rule.

**Blast radius: of 205 revision-1 clips in deu seeds 1–5, 155 have had their bytes rewritten in
place while the revision stayed at 1.** 76%. Every one is invisible to any device that cached it.

---

## What this means for the tail-chop hypothesis

Addendum 1 pointed at `repairTailDefect` and the fade/pad chain. **I did not fix it, because the
evidence does not support it.** The clips coming out of the server today are not truncated —
measured, transcribed, tails intact. Whatever chopped those bytes did so before 3 August, and it
has already been repaired. Chasing it now would have been attempt five.

I also tested and discarded my own first idea tonight — that the English prompt clips were short
(1.74 s for eight words). Whisper hears every word. Not it either.

---

## The guarantee

> **A clip's bytes may never change without its `audio_revision` changing — enforced by a database
> trigger that bumps the revision on any `s3_key` or `duration_ms` write, so a cache-busting URL is
> not something anyone has to remember to do.**

That is a gate, not a promise. Nobody can write new bytes and forget the revision, because they no
longer control it. I am landing it next and will confirm when it is in.

**Tonight's interim, and it needs one word from you:** bumping `audio_revision` on those 155 rows
changes their URLs to `.v2` and every cached copy on every device is bypassed instantly — no app
update, no clearing anything by hand. The bytes are already verified good, so this is pure
cache-busting and it is reversible.

**My recommendation: do it.** It is the only thing that makes tonight's already-correct server audio
actually reach your ears. Say go and it is done in minutes.
