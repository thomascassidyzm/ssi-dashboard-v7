# eng_for_hin S0351L03 — citation form: convention found, change NOT made (gap)

**Date:** 2026-09-03 · **Course:** `eng_for_hin` (known = Hindi, target = English) · **Ruling:** Kai, 2026-09-03
**Chunk:** `S0351L03` — known `मुझे अकेला छोड़ना` / target `to leave me on my own`

**Outcome in one line:** the gender half of the ruling was **already satisfied** and needed no change;
the citation half is reported as an **explicit gap** — this course has no notation for citing a chunk
with its governor, and Kai's standing rule is never invent notation. **Zero database writes were made.**

---

## 1. What the ruling asked for

> change the chunk's citation form so it carries its governor — `मुझे अकेला छोड़ना (चाहता था)` or whatever
> form the course's own conventions and the surrounding seeds actually support … If the course has no way
> to cite a chunk with its governor, STOP and report that as a gap rather than inventing notation.

The premise is correct and confirmed against the data: `मुझे` + verb-`ना` is Hindi's obligation frame, so the
chunk quoted bare invites the reading *"I have to leave [it] alone"* and waits for `है`. Inside all ten
sentences an overt subject and a form of `चाहना` are present, so no learner meets the incomplete reading
there. The exposure is confined to the two cycles that play the **bare LEGO**.

### Where the bare citation is actually spoken

`ssi-learning-app/api/courses/[code]/cycles.ts` builds two cycles per LEGO from `course_legos.known_text`:
an `intro` (line ~817) and a `debut` (line ~846). `S0351L03` has **no presentation clip**
(`presentation_audio_id IS NULL` — 433 of this course's 1,489 LEGOs are in the same state), so the intro
falls back to `known_audio_id` and the learner hears the bare Hindi chunk twice, with no framing narration.
So the citation surface is exactly one column: `course_legos.known_text`.

---

## 2. The convention the course actually uses — and it is bare

I read every dative-initial chunk in the course (141 LEGOs matching `^(मुझे|आपको|उसे|हमें|तुम्हें|इसे|उन्हें) `).
The course draws a **systematic contrast**, and it is the opposite of an oversight:

**(a) Object-infinitive chunks — dative + `-ना`, glossed as an English `to`-infinitive — are cited BARE.**
Six siblings of the identical shape, none carrying a governor:

| LEGO | Hindi chunk | English |
|---|---|---|
| S0032L01 | मुझे दिखाना | to show me |
| S0070L02 | मुझे बताना | to tell me |
| S0235L03 | आपको बताना | to tell you |
| S0301L02 | आपको दिखाना | to show you |
| S0383L03 | इसे रखना | to put it |
| S0443L03 | इसे करते रहना | to keep doing it |
| **S0351L03** | **मुझे अकेला छोड़ना** | **to leave me on my own** |

`मुझे बताना` carries the *same* latent obligation reading ("I have to tell") as `मुझे अकेला छोड़ना`, and has
been cited bare since seed 70. S0351L03 is not anomalous; it is the seventh member of an established set.

**(b) Obligation chunks always carry their licensor overtly.** `मुझे जाना है` → *I need to leave* (139),
`मुझे ले जाना है` → *I have to take* (181), `मुझे चुप रहना है` → *I have got to be quiet* (549),
`मुझे लेटना है` → *I need to lie down* (595), `हमें बदलना होगा` → *we need to change* (104),
`हमें जाना पड़ा` → *we had to leave* (455), `हमें चुप रहना चाहिए` → *we should remain quiet* (403).

The presence or absence of `है / था / होगा / पड़ा / चाहिए` **is** the course's disambiguator. On that convention
the bare citation of S0351L03 is already the correct member of the contrast: no licensor, therefore not an
obligation, therefore an object infinitive.

---

## 3. Why no citation change was made — the gap

Three routes exist to make the citation carry `चाहता था`. All three are closed:

**(A) Parenthetical — `मुझे अकेला छोड़ना (चाहता था)`. Notation that does not exist.**
`eng_for_hin` has **zero** LEGOs containing `( ) [ ] …` in either text column (0 of 1,489). Estate-wide,
brackets in `course_legos` appear on the **English side of `*_for_eng` courses only** — `search/find(obl)`,
`should(mid-sentence)`, `my/mine(genitive f)` in `hin_for_eng` — i.e. as metalinguistic annotation on a
gloss. A query for brackets on the **non-English** side of `hin_for_eng`, `mar_for_eng`, `nep_for_eng`,
`tel_for_eng`, `rus_for_eng` returns **0 rows**. In `eng_for_hin` the Hindi side is the *spoken cue*, not a
gloss. Putting a parenthesis there would invent notation on a side the estate has never annotated.

**(B) Grow the chunk to `मुझे अकेला छोड़ना चाहता था`.** This is the course's real precedent for a
governor-less cue — it is exactly what was applied this morning to the है/हैं and gapped-चाहिए cues
(`docs/course-optimization/…-hin-chunk-merges-hai-chahiye-kal-2026-09-03.md`) — but that fix **grows both
sides**, and the ruling forbids touching the English (`to leave me on my own` is exactly right). It would
also desync all eight stored decompositions, which name `मुझे अकेला छोड़ना` as the tile text.

**(C) Frame it in the presentation narration** ("the English for X, as in — <example> — is:").
Requires new TTS. This course is **all-xAI and xAI is retired**: it cannot render. And this LEGO has no
presentation clip to amend.

**And a destructive side-effect that rules out (A) and (B) independently of the above.** `course_legos` carries
`trg_null_lego_audio_on_text_change`: any edit to `known_text` re-resolves `known_audio_id` and, failing to
find a same-voice clip speaking the new text, **nulls it** (logging to `content_audio_link_drops`). On a
course that cannot re-render, editing this cue's text **silences the chunk's intro and debut permanently**.
There is no same-voice clip for `मुझे अकेला छोड़ना (चाहता था)` or `मुझे अकेला छोड़ना चाहता था`, so the null is
certain, not a risk.

**Therefore: STOP, as the ruling instructs.** The citation form is unchanged and awaits a decision from Kai.
The two decisions available to him are named in §6.

---

## 4. The gender variant — already correct, no change needed

Kai confirmed the female-speaker variant changes ONE word, `अकेला → अकेली`, and that agreement does not
spread. `course_gender_expansions` holds **exactly ten rows** for this material (`text_side: 'known'`,
`language: 'hin'`) — the seed, the eight practice phrases, and the LEGO chunk itself. That is Kai's "ten
sentences".

Every one of the ten was checked token-by-token:

- `expanded_m` is **byte-identical** to `original_text` in all 10 rows.
- `expanded_f` differs from `expanded_m` in **exactly one token** in all 10 rows, and that token is
  `अकेला → अकेली` in all 10.
- `चाहता` is **never** touched — correct, since it agrees with `वह` (the third-person subject), not with
  the speaker. Word counts are identical between the two variants in every row.

**Nothing to correct.** The store already says what Kai ruled.

---

## 5. Confirmation the ten sentences are unchanged

**No UPDATE, INSERT or DELETE was issued in this session — every statement was a SELECT.** As evidence, at
`db_now = 2026-09-03T10:14:14Z` the most recent `updated_at` anywhere in seed 351 was
`2026-09-03T08:14:54Z`, hours before this work began; the seed row itself last moved at
`2026-09-02T21:02:22Z`. MD5s of all eleven Hindi strings (seed + 3 LEGOs + 8 phrases) are recorded below and
match the values read at the start of the session:

| Row | md5(known_text) | len |
|---|---|---|
| seed 351 | 7e2d6bdec29a8913becc520082b42429 | 41 |
| S0351L01 | 7cb4aaca5dbdcc8b2b82a85f50865a4d | 4 |
| S0351L02 | c81a112e43c1a188e8de8f2f0fe609b5 | 16 |
| S0351L03 | dce15d9284cd3061d68db35df40b6a15 | 17 |
| phrase 1 | b2ca61c86da1f806b01cbfdabde82a82 | 35 |
| phrase 2 | 109f8e5adfc1dc40e382a5de6516df98 | 35 |
| phrase 3 | 2e6d8676a545099d4d959d567bed62ea | 34 |
| phrase 4 | 367ef827b0fe5b0058a6028b175c0f84 | 48 |
| phrase 5 | 80337e87f81c7e07e7e7c3113949133e | 38 |
| phrase 6 | 84de6f94849d067bcc8169731621e28f | 51 |
| phrase 7 | b3e528ec2cd5257390dc3bad9872186f | 38 |
| phrase 8 | 509c00d60988cac3647573af9036efde | 42 |

No audio pointer was touched; no gender row was touched; no English text was touched.

---

## 6. The two decisions this leaves with Kai

1. **Citation form.** Either (i) accept the bare citation as the course's own convention — it is the seventh
   of seven identically-shaped chunks, and the licensor-presence contrast in §2 already does the
   disambiguating work; or (ii) establish a *new* notation for citing a governor, which would be a
   course-wide (arguably estate-wide) decision affecting at least the other six chunks, and which on this
   course cannot be applied without silencing the cue until the post-xAI provider is in place. A third
   option — grow the chunk on both sides — is available only if the English gloss may move after all.
2. **The tiling defect (noted, not fixed, per instruction).** Kai flagged that in the four negated
   sentences `नहीं` sits physically inside this chunk's span while the decomposition assigns it to the
   other chunk. Measured, the defect is **wider than that**: **all eight** phrases fail
   sentence-equals-concatenation-of-tiles, negated or not, because Hindi is verb-final — the governing
   chunk (`वह चाहता था`) is stored *first* to match English word order but is *spoken last*:

   > sentence `क्या वह मुझे अकेला छोड़ना चाहता था?` · tiles `क्या वह चाहता था` + `मुझे अकेला छोड़ना`

   The `नहीं` misassignment is one visible symptom of that ordering, not a separate bug. Left untouched
   for Kai's separate ruling.
