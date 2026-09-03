# eng_for_hin — three chunking fixes: है/हैं, चाहिए, कल

**Date:** 2026-09-03 · **Course:** `eng_for_hin` (known = Hindi, target = English) · **Rulings:** Kai, 2026-09-03
**Course state at time of work:** `status: released`, `new_app_status: live`, `visibility: public`, 668 seeds.

Two of the three rulings are **applied and verified**. The third is **half applied**: the seed-12 half is
done, and the seed-30 half was applied, tested, found to break 96 phrases, and **reverted in full**. That
half needs a decision from Kai and is written up below as an explicit gap.

---

## 0. Where the defects actually lived

Every one of these three defects lives in the **component layer**, not in the top-level LEGOs.

`course_legos.components` is a JSONB list of sub-chunks. Each one is emitted as a real drilled cue —
a `course_practice_phrases` row with `phrase_role = 'component'`. So a component *is* a cue the learner
is asked to answer, not bookkeeping.

No bare है, हैं or चाहिए existed as a top-level LEGO anywhere in the course. They existed as component
cues. That is what was fixed.

---

## 1. है/हैं must not stand alone — APPLIED

Six component cues had a bare copula as the whole prompt:

| Seed | LEGO | LEGO chunk | The cue that was removed |
|---|---|---|---|
| 13 | S0013L02 | बोलते हैं → *you speak* | हैं → **"you"** |
| 16 | S0016L04 | चाहता है → *he wants* | है → **"he"** |
| 17 | S0017L04 | चाहती है → *she wants* | है → **"she"** |
| 21 | S0021L02 | सीख रहे हैं → *are you learning* | हैं → **"are"** |
| 322 | S0322L02 | पढ़नी है → *needs to read* | है → **"needs"** |
| 339 | S0339L02 | चोट पहुँचाई है → *hurt* | है → **"has"** |

Kai's four (he/she/you/are) plus two more of exactly the same shape found by the census.
Each is now merged into its verb chunk: the copula lives inside the LEGO, and **both sides grew** —
the Hindi cue is the whole verb chunk and the English answer is the whole English chunk.

### Sibling copulas the ruling does not name — NOT touched, flagged for Kai

The census found six more bare-copula cues in the same course. They are the same defect by the same
reasoning ("it is a copula, not a pronoun"), but the ruling names है/हैं, so I left them:

| Seed | Cue | Glossed as |
|---|---|---|
| 9 | हूँ | "I" |
| 346 | हो | "be" |
| 355 | थी | **"need to"** |
| 364 | थी | "was" |
| 385 | थे | "were" |
| 386 | था | "was" |

`थी → "need to"` (seed 355) is the worst of them. **One word from Kai and these go the same way.**

---

## 2. चाहिए must not be glossed as "should" on its own — APPLIED

The premise needed a small correction against the live DB: चाहिए never appeared *bare*. What it
appeared as was **gapped** — a chunk built from the dative pronoun at the front and चाहिए at the back,
skipping the verb in the middle. That is the same defect Kai described, and it is worse than bare,
because the resulting Hindi is a real phrase with a *different* meaning:

> `मुझे चाहिए → "I should"` — but मुझे चाहिए actually means **"I want / I need"**,
> which is exactly what seed 44 already teaches as `मुझे ज़रूरत है → "I need"`.

Seven such cues removed, each merged into the construction that genuinely licenses the "should" reading:

| Seed | LEGO chunk | The cue that was removed |
|---|---|---|
| 98 | मुझे खेलने पर विचार करना चाहिए → *I should consider playing* | मुझे चाहिए → "I should" |
| 99 | आपको ख़ुद से पूछना चाहिए → *you should ask yourself* | आपको चाहिए → "you should" |
| 100 | आपको चिंता नहीं करनी चाहिए → *you shouldn't worry about* | आपको नहीं चाहिए → "you shouldn't" |
| 403 | हमें चुप रहना चाहिए → *we should remain quiet* | हमें चाहिए → "we should" |
| 404 | हमें उम्मीद नहीं करनी चाहिए → *we shouldn't expect* | हमें नहीं चाहिए → "we shouldn't" |
| 407 | क्या हमें कोशिश नहीं करनी चाहिए → *shouldn't we try* | क्या हमें नहीं चाहिए → "shouldn't we" |
| 528 | मुझे शायद रखनी चाहिए → *I'm probably supposed to keep* | मुझे शायद चाहिए → "I'm probably supposed to" |

Three चाहिए components were **left alone** because they are contiguous and already carry the licensing
verb: `करना चाहिए → "ought to"` (328), `क्या करना चाहिए → "what should do"` (438),
`हमें खोलना चाहिए → "we should open"` (499).

Two of those are worth a separate look, though neither is in scope here:
`क्या करना चाहिए → "what should do"` is not grammatical English, and seed 328 glosses the dative
`उसे → "she"`.

---

## 3. कल is genuinely both "tomorrow" and "yesterday" — HALF APPLIED

### The claim is confirmed, from the course's own data

Kai asked me to confirm this myself rather than take it on trust. Hindi कल is genuinely ambiguous —
it means the day adjacent to today in either direction, and the verb tense disambiguates (परसों behaves
the same way at two days out). Rather than assert that, here is the course's **own** bilingual evidence,
authored independently across 668 seeds:

| Reading | Seed | Hindi | English | What disambiguates |
|---|---|---|---|---|
| tomorrow | 12 | कल क्या होगा | what's going to happen tomorrow | होगा (future) |
| tomorrow | 223 | वह कल आपसे पूछने वाला है | he's going to ask you tomorrow | वाला है (prospective) |
| yesterday | 30 | मैं कल आपसे कुछ पूछना चाहता था | I wanted to ask you something yesterday | चाहता था (past) |
| yesterday | 234 | मैं कल रात एक व्यक्ति से मिला | I met someone last night | मिला (past) |
| yesterday | 453 | उन्होंने कल रात किसे देखा था | who they saw last night | देखा था (past) |

Same word, both readings, tense doing the work every time. Claim confirmed.

*(Method note: the substring search for कल returned 16 LEGOs, of which 4 were false positives — कल inside
विकल्प, कल्पना, निकलने, निकलते. **False-positive rate 25%.** Every hit was read before acting.)*

### Applied: seed 12

`S0012L03` had a component cue `कल → "tomorrow"`. That cue is gone. The LEGO
`कल क्या होगा → "what's going to happen tomorrow"` already carries होगा, so कल is now only ever met
inside a chunk that fixes its reading. The surviving component is `क्या होगा → "what will happen"`.

### NOT applied, and reverted: seed 30 — THIS NEEDS KAI

`S0030L03` is the LEGO `कल → "yesterday"`. It is cued bare at its intro and debut, so it is exactly what
the ruling forbids.

I grew it to `मैं कल चाहता था → "yesterday I wanted"` and re-ordered its 8 practice phrases so the chunk
stayed contiguous ("yesterday I wanted to speak English", etc. — Hindi side untouched). Then I ran the
course-wide check the brief requires, and it killed the fix:

> **113 phrases across the course tile कल through `S0030L03`. Only 17 of them involve चाहता था.
> The other 96 use कल = "yesterday" in completely unrelated frames** — "I didn't sleep yesterday"
> (seed 55), "it wasn't possible yesterday" (86), "I'm doing worse than yesterday" (114),
> "we were talking about yesterday" (143), and so on to seed 453.

Growing that LEGO into a चाहता था chunk removes the only unit in the course that teaches कल = "yesterday",
and strands those 96 phrases. So the fix was wrong and I **reverted it completely** — the LEGO text, all 8
phrase texts, and the four audio pointers the text-change trigger had nulled (recovered exactly from
`content_audit_log`, verified clip-by-clip against `course_audio.text_normalized`). Seed 30 is byte-for-byte
as it was.

**The structural finding.** For कल there is a real conflict between two things the course needs:

- the ruling says कल must never be cued bare, and
- 96 phrases need कल = "yesterday" to exist as a *bare tileable unit*, because the vocabulary gate tiles a
  phrase out of whole taught chunks (`extractVocab` returns the entire chunk string, not words — so
  "yesterday" is only available if some unit's target is exactly "yesterday").

Both cannot hold as the data model stands. The options, for Kai to choose:

1. **Accept the bare cue at seed 30.** The competing "tomorrow" cue at seed 12 is now gone, so bare कल has
   exactly one right answer in the course. It is still an unanswerable prompt in principle, but it is no
   longer ambiguous *within this course*. Cheapest, zero further work.
2. **Suppress the intro, keep the tile.** Set `S0030L03` to `is_new = false` (verified: `is_new=false` LEGOs
   generate no rounds — `learning-script-generator.cjs:732`) and teach कल inside a tensed chunk instead.
   कल stays tileable for the 96 phrases and is never cued bare. **Caveat: this removes a round from a live
   course and shifts every later round number**, which is a learner-progress migration, not a free change.
3. **Re-author the 96 phrases** so they tile through larger tensed chunks. Most expensive by far.

My recommendation is (2), but it is a live-course structural change and it is Kai's call, not mine.

### Related, not acted on: कल रात has the same shape one level up

`कल रात` is taught as `"tomorrow night"` (seeds 192, 312) and used meaning `"last night"` inside four
chunks (42, 234, 278, 453). No bare cue collides, so it is not a ZUT violation today — but a learner who
learned कल रात = tomorrow night will meet it meaning last night. Same phenomenon, one level up.

### Dead data

`S0262L03` is still the bare LEGO `कल → "yesterday"`. It is `is_new = false` with zero phrases, so it
generates no rounds and no learner ever meets it. Left in place; it will need to follow whatever Kai
decides for seed 30.

---

## 4. The course-wide check after the merges

A merge changes chunk boundaries, so every phrase using an affected LEGO was checked.

### Decomposition references — 398 checked, 396 hold

| | count |
|---|---|
| Phrases whose stored decomposition references one of the 15 affected LEGOs | **398** |
| Still matching the LEGO's current known text | **396** |
| Stale | **2** |
| Stale **because of this work** | **0** |

The 2 are `S0355L02U04` and `S0355L03B04`, which store `कल को` for `S0030L03` while the LEGO reads `कल`.
That is pre-existing drift from an earlier rename (the seed-30 presentation clip still speaks "कल को" too).
Not caused by this work, and not repaired here — see §6.

### Vocabulary and tiling — the real cost, 49 downstream seeds

Running the course-builder's own course-wide sweep (`POST /api/v2/validate/eng_for_hin`) and baselining
each affected seed against its pre-merge state through the validator's `override`, the cost is precisely
attributable to **three** of the fourteen retired cues:

| Retired cue | Downstream seeds whose phrases no longer tile | Which |
|---|---|---|
| `कल → "tomorrow"` (seed 12) | **40** | 23–29, 44, 243, 252, 269, 305, 312, 316, 333, 334, 336, 391, 395, 397, 402, 405, 407, 418, 420, 423, 425, 434, 435, 445–448, 450, 456, 466, 470, 471, 473, 474 |
| `हैं → "are"` (seed 21) | **8** | 34, 36, 47, 49, 58, 64, 87, 90 |
| `आपको चाहिए → "you should"` (seed 99) | **1** | 106 |
| the other **eleven** retired cues | **0** | — |

**Why this happens.** `extractVocab` returns the whole chunk as one vocabulary unit, so the course's
teaching inventory is a set of exact target strings. Removing a component removes a whole tile. "tomorrow",
"are" and "you should" had no other source in the course.

**This is not learner breakage.** No phrase text changed, no audio changed, and the learner still meets all
this material inside the larger chunks. What it is: 49 seeds now fail the course's own write-time validator,
which is a maintenance liability and will block future edits to those seeds.

**It is also not something I should paper over by putting the banned cues back** — that would undo the
rulings. Supplying "tomorrow", "are" and "you should" with legitimate teaching units that are not bare
copula/adverb prompts is a content decision for Kai, and it is the same decision as §3.

### What I did NOT remove

My first pass merged each affected LEGO down to nothing, which also deleted innocent sibling components and
stranded far more vocabulary. That was wrong, and the corrected principle — **remove only what the ruling
bans** — is what is now in the DB. Eight sibling components were restored: `बोलते → "speak"`,
`चाहता → "wants"`, `चाहती → "wants"`, `सीख रहे → "learning"`, `पढ़नी → "to read"`,
`चिंता करना → "worry about"`, `उम्मीद करना → "expect"`, `कोशिश करना → "try"`, plus
`क्या होगा → "what will happen"`, `खेलने पर विचार करना → "consider playing"`,
`ख़ुद से पूछना → "ask yourself"`, `चुप रहना → "remain quiet"`, `रखनी → "keep"`.

---

## 5. Audio: nothing lost, nothing generated

This course's voices are **all xAI, and xAI is retired** — it cannot render new TTS at all. So losing a clip
pointer here is not recoverable by regeneration, and this was handled accordingly.

| | count |
|---|---|
| Practice-phrase rows before / after, across the affected seeds | 393 / 379 |
| Rows removed (the 14 retired cues) | 14 |
| Surviving rows that lost an audio pointer | **0** |
| Clip pointers re-linked to their clip after a slot-id reuse | **31** |
| Clip pointers that were already absent before this work | 8 |
| TTS generated | **none** |
| Audio passes queued | **none — no text changed anywhere, so none is warranted** |

The 31 re-links were each guarded: the clip's `text_normalized` and `role` had to match the row's current
text before the pointer was written. Zero mismatches. The clips behind the 14 retired cues still exist in
`course_audio`; nothing was deleted.

---

## 6. Found, not fixed

1. **Six sibling bare-copula cues** (हूँ, हो, था, थी ×2, थे) — §1. Same defect, ruling names only है/हैं.
2. **The seed-30 कल conflict** — §3. Needs Kai's ruling.
3. **49 seeds failing the vocabulary gate** — §4. Same decision as (2).
4. **480 stale decompositions course-wide.** The dashboard's own content-keyed detector
   (`tools/course-optimization/refresh-stale-phrase-decompositions.cjs --course=eng_for_hin`) reports
   480 stale phrases, 467 rewritable, 13 parent-unlocatable. Pre-existing, almost certainly from the
   2026-09-02 teaching-layer rebuild; **0 attributable to this work**. Not run — a 467-row rewrite on a
   live course is well outside this brief.
5. **The seed-30 presentation clip is garbled Hindi.** `22ad7aaf` speaks
   *"अंग्रेज़ी में — 'कल को' — जैसे — 'मैं कल को बोलना बहुत अच्छी चाहता था।' — में :"* — the example
   sentence is not grammatical, and it uses the old `कल को` form.
6. **`S0021L03` components disagree with their LEGO** — the LEGO is `उसका नाम` but its component says
   `उसकी`. Untouched.
7. **A one-line bug in the components backfill route**, fixed on this branch: when a `?force=true` call
   merged components away to zero, the build/use phrases kept their old positions and left positions 1..N
   empty. `services/course-builder/routes/components.cjs`.

---

## 7. How this was done

All content writes went through the dashboard's own endpoints — no bespoke data script:

- `PATCH /api/production/:course/lego/:legoId` (production-api, 3470) — merge both sides of a chunk
- `POST /api/course/:course/components/backfill?force=true` (course-builder, 3471) — set components and
  regenerate the component cue rows
- `DELETE /api/qa/phrase/:phraseId` (3471) — retire a cue row
- `PATCH /api/phrases/:id` (3471) — phrase text
- `POST /api/v2/validate/:course` (3471) — the course-wide sweep, including the `override` baselines

The two exceptions, both stated plainly: restoring `S0030L03`'s four audio pointers during the revert, and
the 31 guarded clip re-links, are direct `UPDATE`s of audio-id columns. No dashboard endpoint exposes those
columns, and the alternative was leaving live slots silent on a course that cannot re-render.

Work ran strictly sequentially in ascending seed order. No seed ranges were sharded across workers, and no
sub-workers were dispatched.
