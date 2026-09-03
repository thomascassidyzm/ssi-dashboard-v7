# The pause-cue re-render — the number that matters, then the audio

*Published for Tom at https://watson-1.tail4968cb.ts.net/d/d409527c — the audio players are in that page.*

## Your suspicion first: right question, and the census survives it

You were right to ask. The answer is **(a), not (b)** — but the useful number is smaller than 1,414 either way.

**Every single pod clip in those 15 courses predates the 24 August fix: 8,942 of 8,942.** Nothing has been re-rendered since. So the background fact you suspected is exactly true.

**But the census did not flag by rule version.** I re-derived it from scratch: run the old splitter and the new splitter over each line's own text, keep only the lines where the two disagree. That is the same test the census used, and it collapses 8,942 down to **1,427**. The other **7,515 clips — 84% — render identically under either rule** and were correctly left out.

| | Clips |
|---|---:|
| Pod clips in the 15 courses | 8,942 |
| …rendered before the 24 Aug fix | **8,942 — all of them** |
| …whose text actually splits differently under the new rule | **1,427 (16%)** |
| …whose text splits identically, so the audio would be unchanged | 7,515 (84%) |
| **Live and genuinely differing** | **994** |
| Held and genuinely differing | 433 |

Per course it runs 45–68% of clips in the Japanese and Chinese pods, and **5–6% in Arabic and Persian**. So it is not "essentially every clip" — it is half the CJK pods and a twentieth of the Arabic ones.

**And there is a second shrinkage the census could not see.** Of the 994 live differing clips, **331 are on Azure voices and 663 are on xAI clone voices**. The audio below shows the cue lands reliably on Azure and erratically or not at all on xAI. **The number of clips where a re-render demonstrably improves what a learner hears is closer to 331 than to 1,414.**

**Distinct texts, not distinct clips.** The 1,427 contain 835 distinct lines. 569 of them are the *same Japanese pod* appearing as the known-side track of six different courses (`deu_for_jpn`, `eng_for_jpn`, `fra_for_jpn`, `ita_for_jpn`, `spa_for_jpn`, `zho_for_jpn`) — 439 distinct texts read six times over. That is where your "six full languages" feeling comes from: it is largely one Japanese pod, counted six times.

---

## What changed, in plain English

When a pod turn contains several sentences, the pipeline inserts a little written pause marker between them before handing the text to the voice engine, so the engine leaves a real, deliberate gap at each sentence end. The rule that found those sentence ends only knew about English full stops followed by a space. Japanese and Chinese put no space after their full stop, and their full stop is a different character altogether — so no Japanese or Chinese turn ever got that marker. The engine read a five-item drill as one long run-on sentence and gave it only the small breath it gives a comma. The fix on 24 August taught the rule the Japanese/Chinese full stops and the Arabic question mark.

**What a correctly-cued pause actually sounds like: 1.36 seconds.** Control 3 below proves it — an Arabic line that already got the marker under the old rule, whose gaps measure 1.36s and 1.41s. The CJK clips a learner hears today have 0.3s to 0.95s at the same kind of boundary.

---

# The audio

Thirteen pairs. Each says what I expect BEFORE you press play. Top player is what a learner hears right now; bottom is the same line re-rendered under today's rule, same voice, same mastering chain.

## The worst cases — five-item drills, all from the genuinely-differing set

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

## Typical cases — ordinary two-sentence conversation turns

### 5. Japanese — "I'm from France. I've been here for two years." (Azure, Mayu)

`フランス出身です。ここに来て二年になります。` — 4.30s → 4.70s. One gap, 1.04s → 1.43s. Expect: small but real.

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

`我是曼彻斯特人，但我现在住在伦敦。你呢？` — 4.32s → 4.37s. Gaps 0.39s/0.28s → 0.25s/0.46s. **Expect: no improvement.** The marker did nothing; the two takes differ only the way any two xAI renders differ.

NOW:
https://watson-1.tail4968cb.ts.net/evidence/pause-cue/zho-typical-old.mp3

RE-RENDERED:
https://watson-1.tail4968cb.ts.net/evidence/pause-cue/zho-typical-new.mp3

## The Arabic and Persian ones I expected to be indistinguishable

I picked these because the only thing the fix changed for them was the Arabic question mark `؟`. **I got two of the three predictions wrong** and I am reporting that as it happened.

### 8. Egyptian Arabic — "Would you like to sit-in? The table by the window is free." (xAI clone) — prediction CORRECT

`هتقعد هنا؟ التربيزة جنب الشباك فاضية.` — 3.34s → 3.24s, gap 0.43s → 0.44s. No audible change expected.

NOW:
https://watson-1.tail4968cb.ts.net/evidence/pause-cue/ara-eg-old.mp3

RE-RENDERED:
https://watson-1.tail4968cb.ts.net/evidence/pause-cue/ara-eg-new.mp3

### 9. Syrian Arabic — "Could I pay by card? Do you have contactless?" (Azure, Amany) — prediction WRONG

`فيّ أدفع بالكارت؟ عندك لا تماس؟` — gap 0.93s → 1.34s. The same clean +0.4s the Japanese gets. The fix is not a CJK-only story; it reaches Arabic wherever the voice is Azure.

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

# The controls — three from the 7,515 the census left OUT

These are pre-fix clips whose text splits **identically** under both rules. If the census were flagging by rule version rather than by audible difference, these would have been in the 1,414. They were not. Play them and you should hear no change at all.

### 11. CONTROL — Japanese, no internal sentence break (Azure, Mayu)

"Would you like regular or large?" `レギュラーサイズとラージサイズ、どちらになさいますか？` — one sentence, no split point under either rule. 3.89s → 3.40s, no internal pause in either. The half-second is trailing dead air: this clip was rendered on 10 June under the *old mastering chain*, before the end-of-speech trim landed on 17 August. Nothing to do with the pause cue.

NOW:
https://watson-1.tail4968cb.ts.net/evidence/pause-cue/ctrl-jpn-old.mp3

RE-RENDERED:
https://watson-1.tail4968cb.ts.net/evidence/pause-cue/ctrl-jpn-new.mp3

### 12. CONTROL — Chinese, commas but no sentence break (xAI clone)

"I'll have a large, with oat milk if you have it." `我要大杯的，如果有燕麦奶的话，加燕麦奶。` — 3.91s → 3.89s, internal pause 0.31s → 0.29s. Unchanged.

NOW:
https://watson-1.tail4968cb.ts.net/evidence/pause-cue/ctrl-zho-old.mp3

RE-RENDERED:
https://watson-1.tail4968cb.ts.net/evidence/pause-cue/ctrl-zho-new.mp3

### 13. CONTROL — Syrian Arabic, three sentences that the OLD rule already handled (Azure, Amany)

`أي، عندي نهار مشغول اليوم. بتمنالك نهار حلو. بشوفك بعدين.` — Latin-style full stops with spaces, so the old rule already inserted the marker. **The two clips are identical to the centisecond: 7.87s and 7.87s, gaps 0.32s / 1.36s / 1.41s in both.**

This is the most useful clip on the page for two reasons. It proves Azure re-renders are deterministic — same text in, same audio out, so re-rendering a non-differing clip changes literally nothing. **And it is the benchmark: 1.36s and 1.41s is what a properly cued sentence boundary sounds like.** Every CJK clip in the differing set is currently getting 0.3–0.95s at the same kind of boundary.

NOW:
https://watson-1.tail4968cb.ts.net/evidence/pause-cue/ctrl-ara-old.mp3

RE-RENDERED:
https://watson-1.tail4968cb.ts.net/evidence/pause-cue/ctrl-ara-new.mp3

---

## What it costs

Measured against the live database, not estimated.

| | Clips | Characters to TTS | Money |
|---|---:|---:|---:|
| Live and differing | 994 | 35,596 | **$0.40** |
| Held and differing | 433 | 15,299 | $0.17 |
| **Both** | **1,427** | **50,895** | **≈ $0.56** |
| *Azure-only subset, live* | *331* | *12,606* | *$0.05* |

Rates are the estate's own recorded ones: xAI $15.00/1M characters (`phase8-audio-v13.cjs:6870`), Azure Neural S0 $4.00/1M (`audio-generation-planner.cjs:24`). **2.5–3 hours wall clock for all 1,427; the Azure-only slice is well under an hour.** The pipeline is bound by the phonology verification step, not by TTS. The per-sentence splice pass that would follow is local ffmpeg at £0. Old clips are not deleted — the new render's text differs, so it becomes a new row and nothing is touched until something repoints the link.

**It is not one command.** Each affected course has its own voice-approval gate, so somebody writes a scoped pass. Call it half a day of work against 56 cents of spend.

## My honest verdict

**I cannot hear — I measured. The players are there so a pair of ears settles it.** With that said:

**The census is sound.** It measured the right quantity: text that genuinely splits differently, not clips that happen to be old. Your instinct was the correct one to have, and it holds up as a caution rather than a catch — 84% of the pod audio in those courses was already correctly excluded.

**The real number is 331, not 1,414.** That is the live, genuinely-differing, Azure-voiced set — the clips where a re-render measurably changes the audio in the intended direction, every gap going from a comma's breath to the 1.36s beat that control 13 shows is correct. The 663 xAI clips are differing-by-text but the engine largely ignores the marker, and every xAI re-render is a fresh, different performance of the line — so re-rendering those swaps known-good audio for new audio that may be no better.

**Is it audible enough to matter?** On the five-item drills, on the numbers, unmistakably: a second and a half added to a six-second clip, four boundaries going from run-on to deliberate. On ordinary two-sentence turns it is +0.4s at one boundary — clear in an A/B, easy to miss in the wild. If the question is "is a learner being harmed today", my answer is: mildly, on drill lines, where five items to repeat arrive as one run-on.

**The stronger argument is downstream.** The cue exists so the splicer has an engineered silence to cut on. 384 of the affected turns have a whole-turn take but were never spliced into per-sentence clips — plausibly because there was no reliable pause to cut at. Per-sentence clips are worth more to a learner than 0.4s of gap.

**Recommendation: do the 331 Azure clips. Leave the 663 xAI ones alone until somebody has heard whether an xAI re-render helps at all.** Five cents, under an hour, deterministic engine so the change is surgical — only the pauses move. Better, simpler and cheaper all point at the same half.

## Gaps, stated plainly

- **I did not listen.** Every number above is measured from the actual files with silence detection; the judgement "audible enough to matter" is yours.
- **Re-renders are fresh takes, not edits.** On Azure they are deterministic, so a differing clip changes only where the marker goes (control 13 proves it). On xAI they are not — the same input twice gave me 6.87s and 5.83s.
- **Old clips also carry old mastering.** Anything rendered before 17 August was mastered under the previous chain, so a re-render silently re-masters it too (control 11: 0.49s of trailing dead air removed). Neutral to good, but it is a second change riding along.
- **Nothing was written.** Thirteen pairs rendered for this document. No live content touched, no bulk audio queued, no database row changed.
- **Provider split is inferred from voice-id shape** — `course_audio` has no provider column, and some rows store a bare clone id (`jpi39icg`) with no prefix.
- **Counts drift by ~13 turns** between the 24 August fix doc (1,431), the census this morning (1,418) and today's re-derivation (1,427/1,431 depending on the day's pod text). Ordinary content churn, worth about a cent.
