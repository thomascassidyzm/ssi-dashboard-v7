# Pods: what still needs translating, and what the audio will cost

*Counted from the live database, 2026-08-14. Where this disagrees with any audit doc in the repo, the database wins.*

## The headline

**The whole remaining pod audio render costs $4.48.**

Not $109, not $135. Those figures are real, but they belong to the *full course content* rebuild — 207,227 distinct texts. Pods are a much smaller thing: 142 to 232 lines per course, and once deduped per language the entire estate's outstanding pod render is **6,910 clips / 298,494 characters**. At the xAI premium rate that is $4.48. At the Azure rate, $1.19.

The spend is not the decision. The decision is whether to approve a cast, because **nothing renders at all until one is approved** — and right now the approvals table is completely empty.

## What the numbers actually are

| | prior (per-course unit) | live (per-language unit) |
|---|---:|---:|
| translation debt, English-known pods | ~3,471 | **3,770 distinct lines** |
| translation debt, non-English-known pods | ~623 | **0 — all translated** |
| pod audio still to render, in scope | — | **6,910 clips** |
| cost at xAI premium | — | **$4.48** |

Two of those want a sentence each.

**The 623 is gone.** Every non-English-known pod line now carries target text. That debt was paid at some point between the count that produced the prior and today; nothing is owed there.

**The 3,770 is real and slightly larger than the prior**, not smaller. That is the opposite of what the per-language dedupe did to English, and the reason is simple: English pod-0 collapsed 8.19x because 39 courses share one English known side. On the target side, most languages have exactly one course, so there is almost nothing to dedupe — 4,504 empty slots collapse to 3,770 distinct lines, a factor of 1.19.

### Correction, made the same day: 3,770 is too low. It is 4,161.

I built a tool to harvest the free lines the per-language ruling implies — if a sibling course in the same language already carries an English line, translating it again is paying twice, and risks two targets for one known line, which breaks ZUT by construction. It reported 288 free carries, including `deu_for_eng` at 112 out of 112 and `spa_mx_for_eng` at 117 out of 117.

Those two hundred-percents were the tell. `courses.target_lang` is `deu` for both `deu_for_eng` and `deu_at_for_eng`, and `spa` for both `spa_for_eng` and `spa_mx_for_eng`. A free fill on every line was really a silent dialect flattening: Austrian German pushed into the standard German course, Iberian Spanish into the Mexican one, across the board.

Keying on the target **variant** instead, the honest answer is that **there are zero mechanical carries on this estate**. All 304 apparent ones cross a variant boundary, and vosotros against ustedes, *ordenador* against *computadora*, *Jänner* against *Januar* is your ear and not a script's. So:

| | |
|---|---:|
| lines that genuinely need translating | **4,161** |
| lines where the text exists but only in another variant — **your call** | **304** |
| lines carryable with no judgement at all | **0** |

The same variant-lumping is in the cost table below, which deduped on `target_lang`. It understates by about 391 lines and roughly $0.23. The $4.48 headline becomes about $4.71 and nothing else about the decision moves.

## Where the debt actually lives

There are two pod families, and the debt is almost entirely in the second one:

- **`pod-0`** — what learners actually play, 67 courses, 142 slots per course, 9,915 slots, only 383 empty.
- **`pod-0-unrecorded`** — staging, 37 courses, **232 slots per course**, 8,583 slots, 4,121 empty.

The staging pod is the larger canon — 232 lines against 142. That is "the latest version of the PODS", and it is invisible to learners because the player reads the exact id `<course>:pod-0`. Actioning the pods means finishing that 232-line canon and promoting it, not topping up the 142-line one.

## The finding I did not expect

**The English-teaching courses are single-voiced, and the wrong gender.** The `eng_for_X` known tracks — the learner's own language — are on one Azure voice for every character. `eng_for_ita` reads Leon, the Waiter, the Bartender, the Narrator and every other male part in `it-IT-ElsaNeural`, a female voice, while the stored cast says two xAI voices. It is 100% off-cast on Italian, German, Korean, Hindi, Chinese and Arabic; 1,999 lines across 16 languages.

This is not a reading artifact — I checked the track direction, which is the trap that faked a miscast finding on 2026-08-13. For `eng_for_ita`, English is the target and Italian is the known side, and it is the Italian side that is broken. These lines are in the render table below as off-cast.

## The cost table, premium-first

Ordered as Tuesday's recount ordered it. `untrans` needs translating before it can be rendered; `no audio` is translated text with no clip; `off-cast` is a live clip on a voice that is not the two-voice cast.

| lang | untrans | no audio | off-cast | render units | cost |
|---|---:|---:|---:|---:|---:|
| kor | 101 | 0 | 146 | 247 | $0.12 |
| zho | 101 | 0 | 156 | 257 | $0.10 |
| ita | 107 | 0 | 152 | 259 | $0.19 |
| ara | 99 | 0 | 180 | 279 | $0.19 |
| spa | 0 | 94 | 303 | 397 | $0.33 |
| por | 103 | 0 | 128 | 231 | $0.16 |
| cym **EXCL** | 0 | 341 | 24 | 0 — human only | — |
| jpn | 106 | 0 | 181 | 287 | $0.13 |
| deu | 0 | 125 | 251 | 376 | $0.31 |
| fra | 103 | 0 | 142 | 245 | $0.19 |
| hin | 132 | 0 | 155 | 287 | $0.21 |
| fin | 160 | 71 | 0 | 231 | $0.17 |
| cat | 116 | 0 | 37 | 153 | $0.10 |
| isl | 136 | 0 | 16 | 152 | $0.09 |
| tha | 106 | 0 | 46 | 152 | $0.08 |
| fas | 122 | 0 | 25 | 147 | $0.09 |
| eus | 111 | 0 | 34 | 145 | $0.09 |
| hye | 126 | 0 | 18 | 144 | $0.09 |
| gle | 117 | 0 | 24 | 141 | $0.09 |
| heb | 126 | 0 | 14 | 140 | $0.09 |
| dan | 129 | 0 | 10 | 139 | $0.08 |
| nor | 113 | 0 | 19 | 132 | $0.08 |
| tur | 118 | 0 | 14 | 132 | $0.08 |
| hrv | 118 | 0 | 12 | 130 | $0.07 |
| est | 109 | 0 | 20 | 129 | $0.08 |
| ell | 114 | 0 | 14 | 128 | $0.07 |
| lit | 109 | 0 | 18 | 127 | $0.07 |
| pol | 123 | 0 | 4 | 127 | $0.07 |
| swa | 113 | 0 | 14 | 127 | $0.08 |
| ukr | 109 | 0 | 18 | 127 | $0.07 |
| lav | 101 | 0 | 24 | 125 | $0.07 |
| swe | 115 | 0 | 10 | 125 | $0.07 |
| bul | 109 | 0 | 14 | 123 | $0.07 |
| nld | 115 | 0 | 6 | 121 | $0.07 |
| ron | 103 | 0 | 18 | 121 | $0.07 |
| nep | 100 | 0 | 18 | 118 | $0.07 |
| ben | 0 | 0 | 114 | 114 | $0.09 |
| guj | 0 | 0 | 114 | 114 | $0.09 |
| pan | 0 | 0 | 113 | 113 | $0.09 |
| tam | 0 | 0 | 112 | 112 | $0.11 |
| urd | 0 | 0 | 112 | 112 | $0.09 |
| eng | 0 | 0 | 85 | 85 | $0.06 |
| sin | 0 | 0 | 44 | 44 | $0.04 |
| **total in scope** | **3,770** | **290** | **2,850** | **6,910** | **$4.48** |

**Welsh is excluded, permanently.** `cym` has 341 lines with no audio and 24 off-cast, and none of them are a render job — they are a recording worklist for Aran and Catrin. The guard is in code with no bypass and I verified it fires on both the course code and the language. Tuesday's queue had cym at #7 for 23,442 renders; that line proposed synthesising over real people.

**English is out of scope by your ruling** — 85 off-cast lines, reported not rendered. Separately, English pod-0 has ~251 distinct texts with no audio at all against 7,771 clips linked and alive. Also reported, not actioned.

## What is actually blocking

1. **Zero voice approvals exist.** The `pod_voice_approvals` config row is an empty object — not one course of 57 is approved, so every bulk render refuses with `no_approval`. This is the gate, and it is the only thing standing between here and a $4.48 render.
2. **46 languages have a full two-voice pool** (male and female), including all 33 with translation debt. The "60 of 66 have no cast" figure does not hold as stated — what is true is that none of them have an *approval*. Casting is available; sign-off is not.
3. **`/generate-pods` only queues sentences with no audio linked.** It skips linked clips, so it cannot re-render the 2,850 off-cast lines. That is the majority of this job and it needs a different tool.
4. **`cym_s_for_eng` is released and serving 104 unproofread machine-drafted lines to learners right now.** Flagged 2026-08-13, still true.

## What I am asking for

One approval, on the existing cast, for the first language. The recommendation from the prior worker survives its own correction and I agree with it: **approve the cast that is already stored** rather than recasting first. Swapping Olivia for Eve on the English side is a taste call and must not ride along with a render job.

Once the first language is approved I run the rest language by language without asking again.

## Method, so the numbers can be checked

- Both sides of every `pod-0` and `pod-0-unrecorded` line, keyed by the language that side is in, case-folded and trimmed — the same identity two courses' copies of a line share.
- Voice read from `course_audio.voice_id`, never from `listening_pods.speakers`, because the stored cast and the real clip voices diverge. The cast is read from `speakers` only to say what the voice *should* be.
- Off-cast matching accepts both the bare and `provider:`-prefixed spelling of a voice id, since one voice appears both ways and a single-spelling match silently misses ~14% of a layer.
- Characters counted on the actual text; untranslated lines costed on their English character count as a stated proxy, since the target text does not exist yet to measure.
