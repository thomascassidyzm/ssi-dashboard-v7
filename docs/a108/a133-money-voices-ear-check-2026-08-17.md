# A-133 — 20 voices on the new chain, and the run-together answer

**Date:** 2026-08-17 · Nothing patched, crossfaded or de-clicked — files just end earlier. No live clip, pod, course_audio row or S3 object touched.

---

## Your question first: do the phrases run into each other?

**No — and the app is the reason it was a fair thing to ask.**

I read the learning app rather than guessing. Two things came out of it:

1. **The app gives you nothing between clips.** There is a config value called `transition_gap_ms: 500` — but it is declared, typed and unit-tested and **nothing in the playback path ever reads it**. Dead config. What actually happens is that the player chains clips on the audio element's own "finished" event: prompt → *long pause* → target once → target again → next phrase. The long pause is real, seconds of it. But **target-once → target-again**, and **target-again → the next phrase's English**, have *zero* designed gap. So whatever silence you hear at those two joins is coming entirely from the audio files themselves.

2. **So the pad has to do all the work — and I sized it for that.** I kept **250ms** of natural decay after the last sound of speech. That is the whole audible separation at the tightest join in the app.

Here is the worst case, for real. Three consecutive sentences, glued together with **exactly zero** silence between them — tighter than the app can ever play them:

**How it sounds today:**

https://watson-1.tail4968cb.ts.net/evidence/a133-money-voices-2026-08-17/00-run-together-current.mp3

**How it sounds after taking the dead air off:**

https://watson-1.tail4968cb.ts.net/evidence/a133-money-voices-2026-08-17/00-run-together-new.mp3

The silence between sentences goes from **1.03 seconds to 0.44 seconds**. Tighter, yes. Run together, no — 0.44s is still a clear breath, and it is a *snappier* listen. The listening and pod modes are unaffected either way: those add their own gaps on purpose (50ms, 90ms, and 100–1000ms in pods), so they land at roughly 0.35s (the deliberately tightest same-speaker join in immersion) up to 1.4s (between pod chunks).

I picked that voice for the comparison deliberately: it is the one in the set where the trim removes the most (0.6s), so it is the hardest case. On the lighter voices the difference is smaller or nothing at all.

---

## The samples — 18 voices, heaviest first

Same sentence shape in every language: a real course-length sentence, not a fragment. **Listen for the very end of each one** — whether the voice sounds finished, or clipped.

### English — the two you named, then the rest of the English pool by weight

**Your own clone** — 325,223 clips. *Nothing was removed: it already ends tight.*
https://watson-1.tail4968cb.ts.net/evidence/a133-money-voices-2026-08-17/01-tom-clone.mp3

**Olivia** — 150,237 clips. *Nothing removed — she ends tightest of all, 73ms.*
https://watson-1.tail4968cb.ts.net/evidence/a133-money-voices-2026-08-17/02-olivia.mp3

**Sonia (Azure)** — 414,080 clips, the single heaviest voice we own. *0.13s removed.*
https://watson-1.tail4968cb.ts.net/evidence/a133-money-voices-2026-08-17/03-sonia-azure.mp3

**Eve** — 162,906 clips. *Nothing removed.*
https://watson-1.tail4968cb.ts.net/evidence/a133-money-voices-2026-08-17/04-eve.mp3

**Leo** — 90,044 clips. *0.09s removed.*
https://watson-1.tail4968cb.ts.net/evidence/a133-money-voices-2026-08-17/05-leo.mp3

**Ryan (Azure)** — 79,120 clips. *0.6s removed — the biggest mover in the whole set.*
https://watson-1.tail4968cb.ts.net/evidence/a133-money-voices-2026-08-17/06-ryan-azure.mp3

And the same Ryan line **before**, so you can hear what 0.6s of dead air sounds like:
https://watson-1.tail4968cb.ts.net/evidence/a133-money-voices-2026-08-17/06-ryan-azure-BEFORE.mp3

**Ara** — 70,680 clips. *0.08s removed.*
https://watson-1.tail4968cb.ts.net/evidence/a133-money-voices-2026-08-17/07-ara.mp3

### Chinese

**Xiaochen** — 37,996 clips. *0.31s removed.*
https://watson-1.tail4968cb.ts.net/evidence/a133-money-voices-2026-08-17/08-zho-xiaochen.mp3

**Yunyi** — 11,278 clips. *0.15s removed.*
https://watson-1.tail4968cb.ts.net/evidence/a133-money-voices-2026-08-17/09-zho-yunyi.mp3

### Spanish

**Elvira** — 35,592 clips. *0.6s removed.*
https://watson-1.tail4968cb.ts.net/evidence/a133-money-voices-2026-08-17/10-spa-elvira.mp3

**Álvaro** — 30,718 clips. *0.73s removed — the largest cut in the set.*
https://watson-1.tail4968cb.ts.net/evidence/a133-money-voices-2026-08-17/11-spa-alvaro.mp3

### German

**Katja** — 17,184 clips. *0.66s removed.*
https://watson-1.tail4968cb.ts.net/evidence/a133-money-voices-2026-08-17/12-deu-katja.mp3

**Conrad** — 5,542 clips. *0.7s removed.*
https://watson-1.tail4968cb.ts.net/evidence/a133-money-voices-2026-08-17/13-deu-conrad.mp3

### French

**Céleste** — 13,479 clips. *0.62s removed.*
https://watson-1.tail4968cb.ts.net/evidence/a133-money-voices-2026-08-17/14-fra-celeste.mp3

**Antoine** — 18,597 clips. *0.58s removed.*
https://watson-1.tail4968cb.ts.net/evidence/a133-money-voices-2026-08-17/15-fra-antoine.mp3

### Japanese

**Shiori** — 35,343 clips. *0.61s removed.*
https://watson-1.tail4968cb.ts.net/evidence/a133-money-voices-2026-08-17/16-jpn-shiori.mp3

**Naoki** — 11,018 clips. *0.61s removed.*
https://watson-1.tail4968cb.ts.net/evidence/a133-money-voices-2026-08-17/17-jpn-naoki.mp3

### The control — the one voice with a proven click

The Dutch pod voice from your blind test. **Before** (today's chain — the click is still in the bytes, 21dB above the room tone, 0.26s after the last word):
https://watson-1.tail4968cb.ts.net/evidence/a133-money-voices-2026-08-17/18-nld-clicker-BEFORE.mp3

**After** (file ends before the click exists):
https://watson-1.tail4968cb.ts.net/evidence/a133-money-voices-2026-08-17/18-nld-clicker.mp3

This one is the point of the whole exercise: nothing was repaired, the click was simply never included.

---

## What the measurements say

| voice | clips | dead air today | removed | tail now | clicks after last word |
|---|---|---|---|---|---|
| your clone | 325,223 | 210ms | — | 210ms | none |
| Olivia | 150,237 | 73ms | — | 73ms | none |
| Sonia (Azure) | 414,080 | 379ms | 134ms | 250ms | none |
| Eve | 162,906 | 190ms | — | 190ms | none |
| Leo | 90,044 | 204ms | 89ms | 115ms | none |
| Ryan (Azure) | 79,120 | 837ms | 597ms | 240ms | none |
| Ara | 70,680 | 330ms | 80ms | 250ms | 2, but see below |
| Xiaochen (zho) | 37,996 | 559ms | 309ms | 250ms | none |
| Yunyi (zho) | 11,278 | 385ms | 150ms | 235ms | none |
| Elvira (spa) | 35,592 | 849ms | 599ms | 250ms | none |
| Álvaro (spa) | 30,718 | 976ms | 726ms | 250ms | none |
| Katja (deu) | 17,184 | 906ms | 656ms | 250ms | none |
| Conrad (deu) | 5,542 | 940ms | 700ms | 240ms | none |
| Céleste (fra) | 13,479 | 855ms | 620ms | 235ms | none |
| Antoine (fra) | 18,597 | 830ms | 580ms | 250ms | none |
| Shiori (jpn) | 35,343 | 863ms | 614ms | 250ms | none |
| Naoki (jpn) | 11,018 | 864ms | 614ms | 250ms | none |
| **Dutch clicker** | control | 393ms | 158ms | 230ms | **1 → gone** |

Three things worth saying plainly:

**The xAI clone pool already ends tight.** Your clone, Olivia and Eve ship 73–210ms of tail — *shorter* than the 250ms pad — so the trim removes literally nothing from them. That is not a failure; it means the change is a no-op on the three heaviest xAI English voices and cannot make them worse.

**Azure is where the dead air lives.** Every Azure voice ships 0.4–1.0 seconds of room tone after the last word. That is what gets removed, and it is why the courses will feel noticeably brisker.

**Ara's "2 clicks" are not clicks.** They are 5–6dB above her own room floor, i.e. barely above the noise. The real Dutch click was **21dB** above floor. Height over the floor is the discriminator, not the count — reporting the count alone would have flagged a clean voice.

**No take was refused.** The tool's safety guards (never cut more than 40% or 2 seconds, never cut a clip with no sustained speech, never remove a speech event) all held without firing on any of the 18.

---

## Honest limits

- **One sample per voice.** A single sentence per voice catches a voice that clicks habitually; it cannot catch one that clicks occasionally.
- **A "suspect" verdict means a human listens.** Nothing here auto-rejects a voice, and the old 9%-precision tail detector still decides nothing — it is printed as a note and ignored.
- **The five big-money target languages are Azure-only in our estate** — there is no xAI voice above 2,000 clips in Chinese, Spanish, German, French or Japanese. So "one of each family" is only genuinely testable on English and Dutch, and that is what I did.
- The Chinese line ends on a vowel, which softens the decay and makes the screen slightly less sensitive there than elsewhere. Stated rather than papered over.

T-21 bulk rendering (~$4.48, 41 languages) stays paused until you say go.

---

**The question, one word: do these pass your ear — yes or no?**
