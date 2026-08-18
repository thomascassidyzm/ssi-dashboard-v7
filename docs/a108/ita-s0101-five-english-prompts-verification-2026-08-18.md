# ita_for_eng — the five-cards-one-English defect: already fixed, and now verified live

**Date:** 2026-08-18 · **Course:** `ita_for_eng` · **Seed:** **101** (lego 1 ×4, lego 3 ×1)

---

## Lead

**This item IS the already-done board card.** Deborah's five cards are `ita_for_eng` **seed 101**, and they
were re-texted and re-voiced at **2026-08-18 09:27Z** — the card on the done board
("S0101 English fix live: five cards re-texted and re-voiced, $0.0015 spend", 09:32Z) is the same work.

**I did not redo it.** I spent **$0.0000** — no TTS was generated in this pass.
What I did instead was verify, clip by clip, that the fix genuinely landed — because the brief warned that
a render can be asked for and silently not happen. It did happen. Evidence below is transcription of the
audio the **live app** actually serves, not a database reading.

---

## What the defect was (confirmed from the audit log, not inferred)

`content_audit_log` holds the before-values. Five rows, five different Italian sentences, one English prompt:

| Phrase ID | English **BEFORE** | Italian (unchanged) |
|---|---|---|
| `S0101L01U03` | I'm excited about this work | mi piace scoprire cosa vuole dire |
| `S0101L01U05` | I'm excited about this work | mi piace scoprire quando sei pronto |
| `S0101L01U06` | I'm excited about this work | mi piace scoprire dove sei |
| `S0101L01U07` | I'm excited about this work | mi piace scoprire cosa vuoi |
| `S0101L03U08` | I'm excited about this work | mi piace imparare questa lingua |

One prompt → five answers. Unanswerable. Exactly as reported.

---

## The five before/after pairs

| Phrase ID | English **AFTER** | Italian (unchanged) |
|---|---|---|
| `S0101L01U03` | **I'm enjoying finding out what it means** | mi piace scoprire cosa vuole dire |
| `S0101L01U05` | **I'm enjoying finding out when you're ready** | mi piace scoprire quando sei pronto |
| `S0101L01U06` | **I'm enjoying finding out where you are** | mi piace scoprire dove sei |
| `S0101L01U07` | **I'm enjoying finding out what you want** | mi piace scoprire cosa vuoi |
| `S0101L03U08` | **I'm enjoying learning this language** | mi piace imparare questa lingua |

Each English now genuinely means its own Italian. Five distinct prompts, one-to-one.
**The Italian was not touched** — `target_text` is byte-identical before and after in all five audit rows.

---

## Gate results

**1. ZUT, course-wide (not just within the seed).** Each of the five new English strings, checked against
every phrase row in `ita_for_eng`:

| New English prompt | distinct Italian answers course-wide | seeds |
|---|---|---|
| I'm enjoying finding out what it means | **1** | 101 |
| I'm enjoying finding out when you're ready | **1** | 101 |
| I'm enjoying finding out where you are | **1** | 101 |
| I'm enjoying finding out what you want | **1** | 101 |
| I'm enjoying learning this language | **1** | 101 |

All 1→1. No new prompt collides with a different Italian anywhere else in the course.

**2. Taught-by-this-point.** First seed at which each piece of material appears in `ita_for_eng`:

| Italian material | first taught | English word | first appears |
|---|---|---|---|
| scoprire | 17 | enjoying / finding | 101 (this seed's lego 1) |
| imparare | 2 | learning | 19 |
| cosa | 4 | what | 8 |
| vuoi | 20 | want | 1 |
| vuole dire | 35 | means | 101 (this seed) |
| quando | 34 | when | 34 |
| pronto | 26 | ready | 26 |
| dove | 70 | where | 70 |
| lingua | 101 (this seed's lego 3) | language | 101 (this seed's lego 3) |

Nothing debuts late. `lingua`/`language` at 101 is correct — it *is* lego 3 of seed 101.

**3. Grammatical and natural.** All five are ordinary spoken English. None is stilted or translationese.

**4. Presentations and audio-row text mirror the LEGO.** Seed 101's three lego rows read
`I'm enjoying finding out` / `more about` / `language` — unchanged and consistent with the new card text.
Every one of the five `course_audio.text` fields matches its card's new `known_text` exactly (table below).

---

## Audio — verified by transcription of what the live app serves

I did **not** trust the database. For each of the five cards I fetched the clip through the **live
learner audio proxy** (`ssi-learning-app.vercel.app/api/audio/<id>`) and ran whisper (ggml-medium) on
the bytes that came back.

| Phrase ID | `course_audio.text` | clip created | HTTP | bytes | **whisper transcript of the live clip** |
|---|---|---|---|---|---|
| `S0101L01U03` | I'm enjoying finding out what it means | 09:27:14.785Z | 200 | 33,408 | *"I'm enjoying finding out what it means."* ✅ |
| `S0101L01U05` | I'm enjoying finding out when you're ready | 09:27:18.790Z | 200 | 33,408 | *"I'm enjoying finding out when you're ready."* ✅ |
| `S0101L01U06` | I'm enjoying finding out where you are | 09:27:19.271Z | 200 | 31,392 | *"I'm enjoying finding out where you are."* ✅ |
| `S0101L01U07` | I'm enjoying finding out what you want | 09:27:19.744Z | 200 | 33,984 | *"I'm enjoying finding out what you want."* ✅ |
| `S0101L03U08` | I'm enjoying learning this language | 09:27:20.219Z | 200 | 30,816 | *"I'm enjoying learning this language."* ✅ |

All five: voice `azure_en-GB-SoniaNeural`, five **distinct** md5s, five distinct S3 keys, all created
2026-08-18 09:27Z. **5/5 transcripts match the corrected text word for word.**

**The relink trap did not fire.** The live finding warns that generation can match on text and silently
re-link the OLD row instead of recording. It did not happen here — proof: I fetched the old clip
(`fd44f54a-2ce1-40ca-8c87-91f033a6150a`) through the same live proxy and transcribed it. It says
***"I'm excited about this work."*** Its md5 differs from all five new clips. The new clips are genuinely
new recordings, not the old row re-pointed.

---

## Explicit gaps — what I could NOT verify

**The paid `/cycles` route is subscription-gated and I have no learner credentials.**
`GET /api/courses/ita_for_eng/cycles?from=S0101L01` returns **403** `{"error":"Subscription required",
"reason":"preview_only"}`. The un-gated `bundle` route returns `previewOnly: true` with 405 phrases — the
free preview window, which does not reach seed 101. `round-map` returns 200 but carries no text at all.

So "verified live" here means: **the live audio proxy served the five real clips and they say the corrected
words** (that is direct observation, and it is the part the brief was most worried about). It does **not**
mean I watched a subscribed learner's seed-101 card render in the player. To close that last gap someone
with a paid account needs to open seed 101. I am flagging it rather than papering over it.

**The $0.0015 spend figure is the prior pass's, reported on the done card — I did not see the bill.**
It is arithmetically consistent: the five prompts total 191 characters, and 191 chars at Azure Neural
$8/1M = $0.0015. That is corroboration, not observation. **My own spend this pass: $0.0000.**

---

## One loose end, and one thing for you to decide

**Loose end (no action needed).** The old clip carrying "I'm excited about this work"
(`fd44f54a-2ce1-40ca-8c87-91f033a6150a`) still exists as a `course_audio` row. I checked every link column
— `known_audio_id`, `presentation_audio_id`, lego `known_audio_id` — and it is referenced by **nothing**.
It is a harmless orphan. Per make-before-break I did **not** delete it.

**For you to decide — out of scope, unverified, offered as a lead.** While running the course-wide ZUT
check I swept every `use` phrase in `ita_for_eng`. No other seed has the ≥3-answers shape. But **13 English
prompts still map to 2 different Italian sentences each**. Three of those are *within a single seed*
(the sharpest form). They are a much milder defect than seed 101 — mostly a clitic or an optional word —
but they are the same class:

| English prompt | seed(s) | the two Italians |
|---|---|---|
| can you all finish it? | **529** (same seed) | potete finire? / potete finire tutti? |
| can you all keep those things? | **529** (same seed) | potete tenere quelle cose? / potete tenere tutti quelle cose? |
| I think that's a good idea | **123** (same seed) | penso sia una buona idea / penso che sia una buona idea |
| I know how to say it | 59, 208 | so come dirlo / so come dire questo |
| I don't know how to say it | 60, 208 | non so come dirlo / non so come dire questo |
| I wanted to know how to say it | 56, 208 | volevo sapere come dirlo / volevo sapere come dire questo |
| I can help you madam | 642, 645 | posso aiutarla, signora / posso aiutare, signora |
| I'm going to help you madam | 642, 645 | sto per aiutarla, signora / sto per aiutare, signora |
| I want a bit of water | 217, 220 | voglio un po' d'acqua / voglio un po' di acqua |
| I don't want to think about it now | 37, 91 | non voglio pensarci adesso / non voglio pensare a questo adesso |
| he said he could write a story about that man | 310, 313 | ha detto che poteva… / ha detto che potrebbe… |
| I'd have been happy to help if you'd told me | 599, 600 | …se me l'avessi detto / …se me lo avessi detto |
| unfortunately I can't stay longer than that | 275, 276 | …non posso restare… / …non posso stare… |

I have **not** triaged these and I am **not** acting on them — they need a native reader's eye, and several
may be deliberate (the `aiutare`/`aiutarla` pair at 642/645 looks like a taught formal-register contrast,
not a defect). Say the word if you want them worked.

---

## Method — why I chose it

**I did not use a build team.** The fix already existed; the open question was not *what to write* but
*whether the write and the render actually landed*. That is a verification question, and verification is
better done by one pass with direct evidence — audit-log before-values, a course-wide ZUT sweep, and
whisper on the bytes the live proxy returns — than by re-running a build that would have re-spent money
re-deciding a settled answer.
