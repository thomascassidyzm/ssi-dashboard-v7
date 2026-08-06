# German audio on staging — your test

**Staging is live and running the versioned-URL code.** Everything below is verified, not assumed.

---

## The 30-second version, before you install anything

Tap these two. Same clip, same word — **"auf Deutsch"** — old recording then new.

**OLD (clipped):** https://staging.saysomethingin.app/api/audio/b3e4a980-62d4-4365-b94d-1e382c3afae4.v1

**NEW (repaired):** https://staging.saysomethingin.app/api/audio/b3e4a980-62d4-4365-b94d-1e382c3afae4.v2

602ms → 936ms. You should hear the tail that was being cut off. Both are live right now, from the
same server, at the same instant — that *is* the whole fix: a replaced clip gets its own address, and
the old one never stops working.

If the second one sounds right and the first sounds clipped, the scheme works. The rest below is you
testing it in the actual app.

---

## Step 1 — clear it out properly

**This matters more on staging than anywhere else.** Staging deliberately does *not* auto-update its
service worker (that's on purpose — it behaves like production so the test team sees what learners
see). So if you skip this you may be handed the OLD app code and conclude nothing changed.

**iPhone / iPad, if you have it installed:**
1. Delete the SSi app from your home screen (press and hold → Remove App → Delete App).
2. Settings → Safari → Advanced → Website Data → search "saysomethingin" → swipe left → Delete. Do
   this for **staging.saysomethingin.app** and any other saysomethingin entries.
3. Close Safari completely (swipe it away from the app switcher).

**Android / desktop Chrome:**
1. Uninstall the installed app if you have one.
2. Settings → Privacy → Site settings → All sites → **staging.saysomethingin.app** → **Delete data**.
3. Close all tabs for the site.

---

## Step 2 — open staging fresh

**https://staging.saysomethingin.app**

Then install it again if you want the full re-install test (Share → Add to Home Screen on iOS).

---

## Step 3 — check you're on the right build before you judge anything

Open this: **https://staging.saysomethingin.app/version.json**

It must say **`cb66b2c`**.

If it says anything else, the clear-out didn't take — repeat step 1. Don't test until this number
matches, or you'll be judging old code.

---

## Step 4 — the German course

Open **deu_for_eng** and start from the beginning. You do not need to hunt for the repaired clips:
**the very first LEGO of the course has one.**

| LEGO | English | German | repaired clips |
|---|---|---|---|
| **S0001L01** | I want | ich will | 1 |
| S0001L04 | now | jetzt | 1 |
| S0001L05 | with you | mit dir | 2 |
| S0002L03 | to learn German | Deutsch zu lernen | 1 |
| S0003L01 | as often as possible | so oft wie möglich | 2 |
| S0003L02 | how to speak | wie man spricht | 1 |
| S0004L02 | to say | sagen | 2 |
| S0004L03 | in German | auf Deutsch | 1 |
| S0004L04 | how to say something in German | wie man etwas auf Deutsch sagt | 1 |
| S0005L02 | I'm going to | ich werde | 2 |
| S0005L03 | with someone else | mit jemand anderem | 2 |

**What to listen for:**

1. **Tails intact.** The repaired clips were cut off at the end. Nothing should sound truncated or
   clipped short — especially "auf Deutsch" at S0004L03.
2. **You're hearing the NEW audio at all.** That was the actual bug: before this, a device that had
   already played the old clip would keep it for a year. If the first LEGO sounds right, it landed.
3. **Both voices on every LEGO.** Intro, voice 1, voice 2 — all three present. A missing one is
   course-breaking, not cosmetic.
4. **Nothing else regressed.** Unrepaired clips should be exactly as they were; the whole point is
   that only replaced clips got a new address.

---

## How I verified staging is genuinely running this code

Not "it deployed" — three independent checks:

1. **App bundle:** `/version.json` serves `cb66b2c`, the promotion commit. That file is never cached
   and never goes through the service worker.
2. **Server code:** `/api/audio/<id>.v2` returns **200 with audio**. The old code rejected any id
   that wasn't a bare uuid with a 400, so a working versioned ref *only* exists on the new code.
   This proves the serverless functions deployed, not just the front end.
3. **Real content:** the live German bundle from staging contains **89 versioned refs**, and the
   first 40 cycles contain 32. The routes are genuinely handing out versioned ids for the repaired
   clips and bare ids for everything else.

And the rollback, proved live on staging on the same clip: `.v1` → 8,064 bytes, `.v2` → 11,808 bytes.
Two different recordings, both reachable, neither deleted.

---

## What else rode along — you should know this

Promoting `dev → staging` moved **37 commits**, not just mine. Three are the audio work. The other 34
were already queued on the train:

- player deep links (launch straight into a round/cycle)
- component_intro playback, the intro fallback, presentation pre-warm
- the belt speed ramp on the instant-playback path
- MVP courses stopping at their built boundary instead of walking into silence
- a BUILD no longer replaying the bare LEGO the debut just taught
- the branded org invite email via Resend

That's the normal promotion train and it's all reversible — staging is a branch pointer. But if you
wanted *only* the audio change on staging, say so and I'll reset it to just that.

---

## Production

Untouched. `main` has none of this. It waits for your word.
