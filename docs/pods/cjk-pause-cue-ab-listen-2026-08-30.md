# The pause-cue re-render — listen to it before you rule

*Published for Tom at https://watson-1.tail4968cb.ts.net/d/bf6acf23 — the audio players are in that page.*

**What changed, in plain English.** When a pod turn contains several sentences, the pipeline used to insert a little written pause marker between them before handing the text to the voice engine, so the engine would leave a real, deliberate gap at each sentence end. The rule that found those sentence ends only knew about English full stops followed by a space. Japanese and Chinese put no space after their full stop, and their full stop is a different character altogether — so no Japanese or Chinese turn ever got that marker. The engine read a five-item drill as one long run-on sentence and gave it only the small breath it gives a comma. The fix on 24 August taught the rule about the Japanese/Chinese full stops and the Arabic question mark. Everything rendered before that date still carries the old, run-together take, and that is what 988 live turns sound like today.

**The three lines, before you play anything.** On the Azure voices — all the Japanese, the Syrian Arabic, the Persian — the fix is real and consistent: every sentence gap goes from about 0.95s to about 1.35s, and on the five-item drills the whole clip grows by a second and a half. On the xAI clone voices — the Chinese, the Egyptian Arabic — the marker lands erratically: sometimes a big gap, sometimes nothing measurable at all, and **every xAI re-render is a different take of the line regardless**, because that engine is not deterministic. The whole re-render costs about **$0.56** and two to three hours of wall clock.

Ten pairs below. Each says what I expect BEFORE you press play. Top player is what a learner hears right now; bottom is the same line re-rendered under today's rule, same voice, same mastering chain.

---

## The worst cases — five-item drills

These are the ones I expect you to hear immediately.

### 1. Japanese drill — "1. 2. 3. White. Black." (Azure, Naoki)

`いち。に。さん。しろ。くろ。` — 5.75s → 7.35s. Gaps 0.95s → 1.36s at all four boundaries.

NOW:
https://watson-1.tail4968cb.ts.net/evidence/pause-cue/jpn-drill-1-old.mp3

RE-RENDERED:
https://watson-1.tail4968cb.ts.net/evidence/pause-cue/jpn-drill-1-new.mp3

### 2. Japanese drill — "16. 17. 18. Monday. Tuesday." (Azure, Naoki)

`じゅうろく。じゅうなな。じゅうはち。げつようび。かようび。` — 6.89s → 8.49s. Gaps 0.95s → 1.36s.

NOW:
https://watson-1.tail4968cb.ts.net/evidence/pause-cue/jpn-drill-2-old.mp3

RE-RENDERED:
https://watson-1.tail4968cb.ts.net/evidence/pause-cue/jpn-drill-2-new.mp3

### 3. Chinese drill — "1. 2. 3. White. Black." (xAI clone)

`一。二。三。白。黑。` — 3.96s → 5.83s. The live take runs the five items together with gaps of 0.4–0.55s. The re-render is longer but uneven: 1.36s, 0.84s, 0.59s, 0.80s.

NOW:
https://watson-1.tail4968cb.ts.net/evidence/pause-cue/zho-drill-1-old.mp3

RE-RENDERED:
https://watson-1.tail4968cb.ts.net/evidence/pause-cue/zho-drill-1-new.mp3

### 4. Chinese drill — "5. 10. 15. Red. Green." (xAI clone)

`五。十。十五。红色。绿色。` — 3.97s → 6.04s. **In the live take one of the four boundaries has no detectable gap at all** — the detector finds three pauses where there should be four, so two of the five items are simply run together.

NOW:
https://watson-1.tail4968cb.ts.net/evidence/pause-cue/zho-drill-2-old.mp3

RE-RENDERED:
https://watson-1.tail4968cb.ts.net/evidence/pause-cue/zho-drill-2-new.mp3

---

## Typical cases — ordinary two-sentence conversation turns

### 5. Japanese — "I'm from France. I've been here for two years." (Azure, Mayu)

`フランス出身です。ここに来て二年になります。` — 4.30s → 4.70s. One gap, 1.04s → 1.43s. Expect: a small but real difference.

NOW:
https://watson-1.tail4968cb.ts.net/evidence/pause-cue/jpn-typical-old.mp3

RE-RENDERED:
https://watson-1.tail4968cb.ts.net/evidence/pause-cue/jpn-typical-new.mp3

### 6. Japanese — "Good afternoon. What can I get you?" (Azure, Naoki)

`こんにちは。ご注文は？` — 2.81s → 3.21s. Gap 0.97s → 1.36s. Expect: small but real.

NOW:
https://watson-1.tail4968cb.ts.net/evidence/pause-cue/jpn-typical-2-old.mp3

RE-RENDERED:
https://watson-1.tail4968cb.ts.net/evidence/pause-cue/jpn-typical-2-new.mp3

### 7. Chinese — "I'm from Manchester, but I live in London now. And you?" (xAI clone)

`我是曼彻斯特人，但我现在住在伦敦。你呢？` — 4.32s → 4.37s. Gaps 0.39s/0.28s → 0.25s/0.46s. **Expect: no improvement.** The marker did nothing here; the two takes differ only in the way any two xAI renders differ.

NOW:
https://watson-1.tail4968cb.ts.net/evidence/pause-cue/zho-typical-old.mp3

RE-RENDERED:
https://watson-1.tail4968cb.ts.net/evidence/pause-cue/zho-typical-new.mp3

---

## The ones I expected to be indistinguishable

I picked these three because they are Arabic and Persian, where the only thing the fix changed was the Arabic question mark `؟`. **I got two of the three predictions wrong** and I am reporting that as it happened.

### 8. Egyptian Arabic — "Would you like to sit-in? The table by the window is free." (xAI clone) — prediction CORRECT

`هتقعد هنا؟ التربيزة جنب الشباك فاضية.` — 3.34s → 3.24s, gap 0.43s → 0.44s. No audible change expected. Different take, same shape.

NOW:
https://watson-1.tail4968cb.ts.net/evidence/pause-cue/ara-eg-old.mp3

RE-RENDERED:
https://watson-1.tail4968cb.ts.net/evidence/pause-cue/ara-eg-new.mp3

### 9. Syrian Arabic — "Could I pay by card? Do you have contactless?" (Azure, Amany) — prediction WRONG

`فيّ أدفع بالكارت؟ عندك لا تماس؟` — gap 0.93s → 1.34s. The same clean +0.4s the Japanese gets. The fix is not a CJK-only story; it reaches Arabic properly wherever the voice is Azure.

NOW:
https://watson-1.tail4968cb.ts.net/evidence/pause-cue/ara-sy-old.mp3

RE-RENDERED:
https://watson-1.tail4968cb.ts.net/evidence/pause-cue/ara-sy-new.mp3

### 10. Persian — "Do you have any sandwiches? I'd like a cheese sandwich, please." (Azure, Dilara) — prediction WRONG

`ساندویچ دارید؟ یه ساندویچ پنیر می‌خوام، لطفاً.` — gap 0.94s → 1.33s. Same again.

NOW:
https://watson-1.tail4968cb.ts.net/evidence/pause-cue/fas-old.mp3

RE-RENDERED:
https://watson-1.tail4968cb.ts.net/evidence/pause-cue/fas-new.mp3

---

## What it costs

Measured by a costed pass over the live database, not estimated from memory.

| | Clips | Characters to TTS | Money |
|---|---:|---:|---:|
| Live (served now) | 994 | 35,596 | **$0.40** |
| Held (staged) | 433 | 15,299 | $0.17 |
| **Both** | **1,427** | **50,895** | **≈ $0.56** |

Rates are the estate's own recorded ones: xAI $15.00/1M characters (`phase8-audio-v13.cjs:6870`, checked against x.ai pricing 2026-07-28), Azure Neural S0 $4.00/1M (`audio-generation-planner.cjs:24`). xAI carries ~87% of the bill because it is 3.75× the rate and covers most of the Chinese volume.

**Time: 2.5–3 hours wall clock for all 1,427; 1.7–2.1 hours for the live 994.** That is from the estate's own measured pod throughput (473–576 clips/hour at the concurrency ceiling of 6 the pod route enforces). The pipeline is bound by the phonology verification step, not by TTS.

**Everything else is near-free.** The per-sentence splice pass that would follow is local ffmpeg at £0, roughly ten minutes. S3 storage for 1,427 small clips is cents a month. Old clips are not touched: the new render's text differs, so it becomes a new row and nothing is deleted until something repoints the link — make-before-break by construction rather than by discipline.

**It is not one command.** `queue-audio-pass.cjs` only queues the request; the renderer only generates *missing* audio, and each of the twelve affected courses has its own voice-approval gate. Somebody writes a scoped pass. Call it half a day of work, against $0.56 of spend.

## My honest verdict

**The difference is real on Azure and I would take it — but not because a learner is suffering.** On the five-item drills the change is unmistakable in the numbers: a second and a half added to a six-second clip, four gaps going from a comma's breath to a deliberate beat. On an ordinary two-sentence turn it is +0.4s at one boundary — noticeable if you A/B it, easy to miss if you don't. If the question is strictly "is a learner being harmed by the current audio", my answer is: mildly, on the drill lines, where five separate items currently arrive as one run-on and the learner has less room to repeat each one. Elsewhere it is a polish difference.

**The real prize is downstream, and the census hints at it.** The pause cue exists so the splicer has an engineered silence to cut on. 384 of the affected turns have a whole-turn take but were never spliced into per-sentence clips — plausibly because there was no reliable pause to cut at. Re-rendering with the cue is what would let those turns be split, and per-sentence clips are worth more to a learner than 0.4s of extra gap. That is the argument for doing it, not the pause itself.

**The one thing that would stop me: the xAI half.** For Chinese and Egyptian Arabic the cue lands erratically or not at all, and every xAI re-render is a fresh, different take of the line — so re-rendering those courses swaps known-good audio for new audio that may be no better and is definitely not the same performance. That is 23,000 of the 35,600 live characters. **My recommendation: do the Azure half (Japanese, the `*_for_jpn` known tracks, Syrian Arabic, Persian) where the gain is measured and consistent, and leave the xAI courses alone until someone has heard whether an xAI re-render actually helps.** Better, simpler, cheaper all point the same way: it is the half that demonstrably works, it needs no new judgment, and it costs about seven cents.

## Gaps, stated plainly

- **I did not listen.** I am a text model; I measured these clips with silence detection and duration, and I am handing you the players so a pair of ears can settle it. Every number above is measured from the actual files; the judgement "audible enough to matter" is yours.
- **The re-rendered clips are fresh takes, not surgical edits.** Same voice, same text, same mastering chain, but the engine re-performs the line — so pacing and intonation differ a little beyond the pauses, especially on xAI. That is exactly what a real re-render would do, so the comparison is fair, but it is not a clean isolation of the pause alone.
- **Nothing was written.** Ten clips were rendered for this document and saved locally. No live content touched, no bulk audio queued, no database row changed.
- **Population count drifts by ~13 turns** between the 24 August fix doc (1,431), the census this morning (1,418) and today's re-derivation for costing (1,431). Ordinary pod-content churn; worth about a cent.
- **Provider split is inferred from voice-id shape**, not from a provider column — `course_audio` has none. Some rows store a bare clone id (`jpi39icg`) with no prefix.
