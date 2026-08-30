# T-20 — can Tom's 44 butchered clips be covered by existing audio instead of re-recorded?

**Date:** 2026-08-14 · Follow-up to `t20-clipped-human-recordings-diagnosis.md` (d/354848b7, d/f5579e75).
**Method:** read-only DB probe (`recording_provenance` joined on the S3-key uuid, per the known gotcha — never on `course_audio.id`).

## Bottom line

**Correction to the premise first: Tom's 44 are NOT all English.** 26 are the English known-side; **18 are Welsh target-side** — Tom recorded both halves of these conversational exchanges in the same pod session. Only the 26 English ones are even candidates for "reuse existing English audio."

Of those 44:

- **0 have a reusable human Tom-voice clip anywhere else in the estate.** `recording_provenance` has exactly 46 rows for `thomas.cassidy+ssi@gmail.com`, ever — 44 tied to the butchered set, and 2 more that were later superseded by Aran re-recordings of the same two lines (dead ends, already counted in Aran's 63). Tom has never recorded any other line, in this course or any other, that matches one of the 44 texts.
- **23 of 44 (all English) have a TTS clip of the identical normalised text somewhere else in the estate** — but *never inside `cym_n_for_eng` itself*. 22 of those 23 include a Tom-clone (`gfzdpspr5fdp`/`xai_gfzdpspr5fdp`) render, always in another course.
- **"Olivia" does not exist as a voice anywhere in `course_audio`** — I searched `voice_id ILIKE '%olivia%'` estate-wide and got zero rows. Flagging this as an explicit gap: either the name refers to something outside `course_audio`, or the premise of an Olivia clip existing is itself wrong. Not decided, not assumed.
- **All 18 Welsh lines have zero fallback of any kind** — no TTS clip, Tom-clone or otherwise, exists anywhere for any of the 18 target-side texts. They're unique conversational content (hotel booking, pharmacy, café dialogue) that was only ever produced once, in this pod session.

**So: genuinely re-record all 44.** Reuse only saves anything if Tom decides cross-course English TTS is an acceptable substitute for 22-23 of the 26 English lines — and that decision runs straight into the standing rule that English known-side audio is per-course, never shared, and borrowing it is a voice regression ([[english-known-side-is-per-course]]). I'm flagging the TTS existence, not recommending the swap.

## The table

| Text | Side | Reusable human Tom clip elsewhere? | TTS clip of same text exists (any course)? | Tom-clone TTS specifically? |
|---|---|---|---|---|
| Good morning, Sarah! | known (English) | no | yes (60 clips, other courses) | yes |
| Good morning. How are you? | known (English) | no | yes (118) | yes |
| I'm very well, thank you. Are you going to work? | known (English) | no | yes (41) | yes |
| Yes, I've got a busy day today. I hope you have a good day. See you later. | known (English) | no | yes (29) | yes |
| Excuse me, is this seat taken? | known (English) | no | yes (57) | yes |
| No, it's free. You're welcome to sit. | known (English) | no | **no** | no |
| Excuse me. Hello. What's your name? | known (English) | no | yes (38) | yes |
| I'm James. Pleased to meet you. | known (English) | no | yes (57) | yes |
| Pleased to meet you too. Where are you from? | known (English) | no | yes (112) | yes |
| I'm from Manchester, but I live in London now. And you? | known (English) | no | yes (43) | yes |
| I'm from France. I've been here for two years. | known (English) | no | yes (48) | yes |
| How interesting. Well, lovely to meet you. | known (English) | no | yes (105) | yes |
| This is a lovely city. What do you do? | known (English) | no | yes (48) | yes |
| I teach English, but not in a school. I work with adults. I'm on holiday here with my wife and children. We're having a lovely time. | known (English) | no | yes (44) | yes |
| I'm a nurse, at the hospital just round the corner. And you? | known (English) | no | yes (97) | yes |
| Yes, of course. I'm a nurse. I work at the hospital. It's near here. And what do you do? | known (English) | no | yes (45) | yes |
| Good afternoon. What can I get you? | known (English) | no | yes (102) | yes |
| Good afternoon. I'd like a coffee, please. With milk but with no sugar. To take away. | known (English) | no | yes (31) | yes |
| My name is Anna. And you? | known (English) | no | yes (46) | yes |
| Good evening, Sarah. Did you have a long day? | known (English) | no | yes (51) | yes |
| Hello, good evening! | known (English) | no | yes (113) | yes |
| I'm sorry, I didn't understand you. I'm learning Northern Welsh. Could you say that again more slowly? | known (English) | no | **no** | no |
| Hello! I'm sorry but I can't talk at the moment. I need to go home now. Can we talk tomorrow? | known (English) | no | yes (35) | no |
| No, I'm sorry, I'm busy tomorrow. But let's talk on Saturday. See you then. | known (English) | no | yes (43) | yes |
| Yes, very. I'm very tired now. Good night. I'll see you tomorrow. | known (English) | no | **no** | no |
| Thank you very much. Goodbye. | known (English) | no | yes (122) | yes |
| A be ydy cyfrinair y wifi? | target1 (Welsh) | no | **no** | no |
| A'r bil, pan fyddwch chi'n barod. Fedrwn ni ei rannu fo? | target1 (Welsh) | no | **no** | no |
| A'r risotto i mi. Efo salad gwyrdd bach i ddechrau. | target1 (Welsh) | no | **no** | no |
| Am faint o'r gloch mae brecwast yn cael ei weini? | target1 (Welsh) | no | **no** | no |
| Ardderchog. Ydy hi'n bosib i ni gael check-out hwyr? | target1 (Welsh) | no | **no** | no |
| Esgusodwch fi, dach chi'n gwybod sut i fynd i'r archfarchnad agosa? | target1 (Welsh) | no | **no** | no |
| Heibio'r eglwys yna? | target1 (Welsh) | no | **no** | no |
| Helo, noswaith dda! | target1 (Welsh) | no | **no** | no |
| Mi fasai potel o win coch y tŷ yn hyfryd. | target1 (Welsh) | no | **no** | no |
| Noswaith dda, Sarah. Gest ti ddiwrnod hir? | target1 (Welsh) | no | **no** | no |
| Oes gan y stafell olygfa? | target1 (Welsh) | no | **no** | no |
| Prynhawn da. Mae gen i stafell wedi'i bwcio dan yr enw Jones. | target1 (Welsh) | no | **no** | no |
| Triwch barasetamol at y cur pen, a'r losenni yma at y gwddw. | target1 (Welsh) | no | **no** | no |
| Un bob pedair i chwe awr, dim mwy nag wyth mewn diwrnod. | target1 (Welsh) | no | **no** | no |
| Un. Dau. Tri. Gwyn. Du. | target1 (Welsh) | no | **no** | no |
| Wrth gwrs. Be ydi'ch symptomau chi? | target1 (Welsh) | no | **no** | no |
| Wrth gwrs. Dyma fy mhasbort i. | target1 (Welsh) | no | **no** | no |
| Ydi, efo bwyd neu ar ôl bwyd sydd orau. | target1 (Welsh) | no | **no** | no |

## Bottom line, restated

- **44 of 44 need Tom's voice re-recorded** if the estate keeps its "no cross-course English audio" rule — there is no reuse-without-a-rule-change option.
- **If** Tom decides cross-course English TTS (or specifically the Tom-clone) is acceptable *for this course*, that shrinks the ask to the **18 Welsh lines only** (always still need his voice — no fallback exists for them at all) **+ the 3 English lines with zero fallback of any kind** ("No, it's free...", "I'm sorry, I didn't understand you...", "Yes, very. I'm very tired now...") = **21 lines minimum**, with 23 English lines becoming optional TTS substitutions pending his call.
- This is his decision, not mine — flagged, not made.

## Gaps

- "Olivia" voice: not found in `course_audio.voice_id` anywhere in the estate. Confirmed absent, not assumed.
- Whether the estate's per-course English convention (`english-known-side-is-per-course`) should flex for this specific re-record situation — Tom's call, not probed further here.
