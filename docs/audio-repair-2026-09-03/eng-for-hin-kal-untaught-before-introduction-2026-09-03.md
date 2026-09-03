# eng_for_hin — every place कल was used before it was taught, closed by teaching it

**Date** 2026-09-03 · **Course** eng_for_hin (known = Hindi, target = English), 668 seeds, `new_app_status: live`
**Ruling applied** Kai, 2026-09-03: *"Yes, critical fail to have stuff that isn't taught."*

Every number below was re-measured against the live database immediately before and immediately after the
writes — 20:23Z and 20:35Z, twelve minutes apart. Nothing is inherited from the earlier report.

---

## In one page

| | |
|---|---|
| **Census, re-derived** | **60** practice phrases showed कल with no lego behind it — not 57. Method and the difference are in §1 |
| **Fixed** | **60 of 60.** Zero remain |
| **How** | Two new legos, **not** 51 phrase rewrites: `कल → tomorrow` at seed **15**, `कल रात → last night` at seed **234** |
| **Phrases rewritten** | **0** |
| **Seed sentences rewritten** | **0** — including seed 15, whose defect is closed by teaching the word in its own seed |
| **Clips nulled** | **0** |
| **Clips deleted** | **0** |
| **TTS generated** | **none** |
| **Clips recovered** | **6** — both new debuts are fully audible today, from clips that already existed in the course's own voices |
| **Lego rows inserted / deleted / `is_new` flipped** | **+2 / 0 / +2** (1,489 → 1,491 legos; 1,337 → 1,339 `is_new`) |
| **Phrase rows inserted / deleted** | **+16 / 0** (10,959 → 10,975) |
| **Validator** | **622 passed / 46 failed before, 622 / 46 after — byte-identical failing SET.** 0 newly failing, 0 newly passing |
| **Phrases that lost tileability** | **0** |
| **Decomposition ↔ target concat mismatches** | **0 → 0** across all 76 rows re-decomposed |
| **Learners whose position moves** | **0** — measured, §4 |

The single most important thing: **the round cost Kai was asked to accept did not have to be paid.**
Placing the lego at seed 15 rather than seed 223 fixes all 54 "tomorrow" ghosts *including the eight that
sit before seed 30*, needs no phrase rewrite at all, and removes the seed-15 seed-sentence defect without
touching the sentence — so the three clips that fix was going to silence are still speaking.

---

## 1. The census, re-derived — 60, not 57

I did not take 57/8/43 on trust. Method, stated so it can be argued with:

A practice phrase is **defective** if its Hindi (known) side contains the standalone token `कल` and its
stored `decomposition` contains **no non-ghost tile whose Hindi covers कल**. That is exactly the learner's
experience: the word is on screen with nothing behind it.

- Phrases whose known side contains standalone `कल`: **330**
- Of those, **uncovered: 60**; covered: 270; no decomposition at all: 0

Split by sense and position:

| population | count |
|---|---|
| `कल` = **tomorrow**, ghost | **54** |
| `कल रात` = **last night**, ghost | **6** |
| of the 54, sitting **before seed 30** (where कल is taught as *yesterday*) | **8** — seeds 23, 24, 25, 26, 27×2, 28, 29 |
| of the 60, carrying any clip | **6** (all six from the "last night" group) |

The prior job's 8 pre-seed-30 rows are **exactly** my 8, same ids. The difference at the top (60 vs 57) is
three rows the earlier pass's substring match did not reach; the sense split it reported (43 + 6) sums to
49, mine to 60, and I have listed all 60 rather than a subset. I acted on my own number.

**Why no gate ever saw this.** The validator's vocabulary check is **target-side** and whole-chunk: English
"tomorrow" enters the cumulative set at seed 12 as a *component* of `कल क्या होगा`, so every one of these 60
phrases passes it. The known-side gate is inert on Devanagari estate-wide. The defect is entirely on the
Hindi side, where nothing checks. Seed 15 was never a failing seed and still is not.

---

## 2. The fix: two legos, no rewrites

### `कल → tomorrow` — **S0015L03**, seed 15, A-LEGO, `is_new`

Placed at 15, not 223, and the reason is the seed's own sentence:

> **seed 15** — और मैं चाहता हूँ कि आप **कल** मेरे साथ अंग्रेज़ी बोलें। / *"And I want you to speak English with me tomorrow."*

That is the **first seed sentence in the course where bare कल means tomorrow**, fifteen seeds before seed 30
teaches it as *yesterday*. Kai's own instruction was *"when it comes up in a seed sentence, introduce it
again with the other sense"* — seed 15 is where it comes up. Seed 12's कल is future too but bound inside
`कल क्या होगा`, never answerable alone, and it already declares `{कल → tomorrow}` as a component, so the
material is attested before it is consolidated (canon L13's non-greedy order, arriving from the M side).

What that placement buys, measured:

- All **54** "tomorrow" ghosts tile, at every seed from 23 to 474.
- The **8 pre-seed-30 rows need no swap at all.** They were already correct English; they were only ever
  wrong because nothing taught the word. Nothing was rewritten, so no clip moved and no sentence changed.
- **Seed 15's seed sentence is fixed without being touched.** The brief flagged that editing it would null
  three rendered clips on a course that cannot re-render. It does not have to be edited: the word it uses is
  now taught by its own seed, which is what canon L1 means by *"the word is in the seed"*. Three clips saved.
- Seeds 15 → 29 now use कल in **one sense only** (verified: every कल between 15 and 29 is future), and seed 30
  then re-introduces the other sense with its own "as in" context already pinned to the past by चाहता था.
  That is the shape Kai asked for, in the right order.

**The collision, stated deliberately.** Bare कल now answers *tomorrow* at seed 15 and *yesterday* at seed 30.
That is a ZUT, and it is the one Kai already priced — *"won't matter that it causes a ZUT — because we're
handling it."* It is handled the way he ruled for all six कल chunks: an **"as in" introduction** carrying live
course text whose tense fixes the direction. The decomposer is unaffected either way — it keys on the English
side, so "tomorrow" resolves to S0015L03 and "yesterday" to S0030L03 with no ambiguity anywhere.

### `कल रात → last night` — **S0234L05**, seed 234, A-LEGO, `is_new`

Six phrases (seeds 363, 385, 386, 477×2 and 363 again) use bare `कल रात` meaning *last night*. The course
teaches बare `कल रात` only as **tomorrow night** (S0192L02, seed 192); *last night* exists only bound inside
whole-clause chunks at 234, 278 and 453, none of which tiles a bare use.

> **seed 234** — मैं **कल रात** एक व्यक्ति से मिला जो आपके भाई के साथ काम करता है। / *"I met someone last night who works with your brother."*

First seed sentence where the bare chunk carries that sense; placed there, after 192, so the existing
tomorrow-night debut (which has real audio) keeps its position. It sits alongside `S0234L01` /`S0234L02`,
which **already** overlap each other — an overlap ladder is this seed's existing, deliberate pattern.
All six phrases now tile. Four of them carry clips and **none of those clips moved.**

### The introductions

One pending "as in" row per new lego, in the same format as the seven the earlier pass wrote, quoting live
course text and nothing invented:

- S0015L03 — अंग्रेज़ी में — 'कल' — जैसे — 'और मैं चाहता हूँ कि आप कल मेरे साथ अंग्रेज़ी बोलें।' — में :
- S0234L05 — अंग्रेज़ी में — 'कल रात' — जैसे — 'मैं कल रात एक व्यक्ति से मिला जो आपके भाई के साथ काम करता है।' — में :

Both pinned by their own verb (बोलें future / मिला past). Neither can be rendered today — see §5.

### The 16 new drills

Eight per lego: 3 BUILD + 5 USE, the enforced floor. Every one was priced by the validator's `override`
dry-run **before** any write and again after; every one concatenates back to its target text exactly (the
player's Strategy-0 guard); every one is built only from chunks taught at or before its seed, and every one
is tense-pinned to its lego's sense — future for seed 15, past for seed 234. The seed-234 set is modelled on
frames the course already attests (`शनिवार की रात` sits in exactly the slot `कल रात` takes, at seeds 215–221).

---

## 3. What the validator says, before and after

| | before (20:23Z) | after (20:35Z) |
|---|---|---|
| seeds passed | 622 | 622 |
| seeds failed | 46 | 46 |
| failing **set** | 21,34,36,47,49,58,64,87,90,106,136,176,177,204,224,241,242,268,309,319,320,322,325,327,339,343,344,345,346,355,363,364,365,385,386,438,465,477,478,480,589,597,604,610,621,637 | **identical** |
| newly failing | — | **0** |
| newly passing | — | **0** |

Both new seeds (15 and 234) pass. The 46 are the course's pre-existing backlog and this job neither added to
nor cleared any of it. `course_round_index` was **not** refreshed and is **not** cited as evidence anywhere —
it is stale on the last quarter of this course.

Row-level diff of the whole course, before against after: **16 phrases added, 0 removed, 0 phrase texts
changed, 0 phrase clips nulled; 2 legos added, 0 lego texts changed, 0 lego clips nulled; 0 seed texts
changed, 0 seed clips nulled.**

---

## 4. The round cost, measured rather than assumed

Learner progress on this course is anchored by **lego id** (`course_enrollments.highest_completed_lego_id`),
not by a round ordinal; `highest_completed_round_index` is a derived `seed × 3` for every one of the 226
enrolments, so it does not move when a lego is added.

- eng_for_hin enrolments: **226** (220 with any progress recorded)
- Learners past **seed 234**: **0.** The furthest learner on the course is at S0190L01. Every learner will
  meet `कल रात → last night` in order. **Zero migration cost.**
- Learners past **seed 15**: **208.** Their anchor lego still exists, so nothing is mis-credited and no
  position shifts — but **they will not be shown the new कल→tomorrow introduction in the linear walk.**
  18 are at or before seed 15 and will meet it normally.

That last line is the honest cost and it is not the one that was feared: nobody's round numbers shift;
instead, 208 learners already past seed 15 get the corrected *tiles* everywhere (which is what they actually
see) but never the introduction itself unless review surfaces it. Kai may want a view on whether that
matters enough to re-seed those learners; I have not touched anyone's progress.

---

## 5. Audio — counted, none generated, six recovered

**Nothing was nulled and nothing was deleted.** No text on any existing row changed, so no clip could move.

Both new debuts are **audible today**, at zero cost, because the clips already existed in this course's own
voices with byte-identical text. Each was verified alive (`mastered/`, non-zero duration), correct role and
correct voice **before** the link was written — make-before-break, with nothing to break:

| lego | role | clip | voice | text |
|---|---|---|---|---|
| S0015L03 | known | `0b98b489` | xai_eve | कल (504 ms) |
| S0015L03 | target1 | `d812bd1b` | bedd6226 | tomorrow (840 ms) |
| S0015L03 | target2 | `12b2eb66` | gfzdpspr5fdp | tomorrow (816 ms) |
| S0234L05 | known | `f9e4b426` | eve | कल रात (696 ms) |
| S0234L05 | target1 | `28dab856` | bedd6226 | last night (1128 ms) |
| S0234L05 | target2 | `75cee3f3` | gfzdpspr5fdp | last night (1104 ms) |

**Still wanted: 50 clips** — 2 introductions and 48 practice clips (16 phrases × known/target1/target2).
No exact-text clip exists for any of the 16 new sentences, so none could be reused.

**None of those 50 can be rendered by anyone today.** All four voices on this course — known, target1,
target2 and presentation — are xAI, and xAI is retired; phase8 passes the provider explicitly, so it
hard-fails rather than falling back. This is Kai's known constraint; the number is reported, not solved.
An audio-pass request naming this set has been queued (canon O8). Until it can be filled, the two new
introductions play without their "as in" line and the 16 new drills play without audio in a walk that
emits them anyway (`buildLegoCycles` does not filter on audio completeness — only the *review* pool does).

---

## 6. The course-wide sweep — same class, everything else

Kai's ruling is general, so I ran it course-wide. Three populations, three different answers.

### 6a. Untaught **target** (English) material — 214 phrases, already visible, pre-existing

Running the validator's own whole-chunk vocabulary DP per phrase: **214 practice phrases across 43 seeds**
use English the course has not taught by that point. These roll up into 43 of the 46 failing seeds, so this
is the backlog the gate has been reporting all along, not a new discovery. Commonest: *"are here"* (11),
*"an email"* (5), *"it"* (5). Full list committed alongside this doc as `sweepA.json`.

**Not fixed here.** 214 phrase-level judgements, each a rewrite, is a piece of work in its own right and
canon R0.3 puts phrase rewrites in Kai's hands. Flagged, counted, listed.

### 6b. Untaught **known** (Hindi) material — the same defect as कल, and it is small

This is the class no gate can see, so I built the detector the कल case implies: a Hindi token used in a
practice phrase before any lego (or lego component) introduces it, tolerant of **nuqta** spelling (हफ्ते vs
हफ़्ते) and of **regular Hindi inflection** (oblique infinitives बोलने/सीखने/समझाने, oblique nouns
बेटे/कमरे/लड़के, gender agreement).

The raw token detector returns **544 phrases**; almost all of it is inflection and nuqta, which is exactly
the false-positive trap the canon's WC-F1/WC-F4 cases warn about, so that number is an upper bound and not a
finding. After filtering, and after removing Hindi **function words** that canon L7 says should never be
atomic legos anyway (की 133, वह 46, तो 22, कि 10, में 8, आप 8, उसे 7 — taught inside chunks, never isolated),
the genuine residue is:

**9 practice phrases using a Hindi content word the course never teaches before that point.**

| seed | phrase | untaught word | Hindi | English | clips |
|---|---|---|---|---|---|
| 320 | S0320L01U04 | गाड़ी | उसे अपनी गाड़ी खरीदने की ज़रूरत नहीं है | he doesn't need to buy your car | 3 |
| 113 | S0113L01U04 | लड़की | उस लड़की का नाम मुझे याद क्यों नहीं रहता? | why can't I remember her name? | 0 |
| 180 | S0180L01U02 | देर | मैं कुछ देर अपनी किताब पढ़ना चाहता हूँ। | I want to read my book for a while | 0 |
| 290 | S0290L01U01 | आश्चर्य | मुझे आश्चर्य है कि उसे जवाब पता है। | I wonder if he knows the answer | 3 |
| 290 | S0290L01U03 | आश्चर्य | मुझे आश्चर्य है कि उसे पहले से जवाब पता है। | I wonder if he knows the answer already | 3 |
| 477 | S0477L04U02 | भोजन | वह भोजन के बाद से बीमार रहा है | he's been sick since the meal | 3 |
| 477 | S0477L03U02 | भोजन | वे भोजन के बाद बीमार थे | they were sick after the meal | 3 |
| 344 | S0344L02U05 | बेशक | बेशक मैं आपकी मदद करने में खुश हूँ | of course I'm happy to help you | 3 |
| 621 | S0621L02U04 | मालूम | अगर मुझे मालूम होता तो मुझे हिम्मत नहीं होती। | if I'd known I wouldn't have dared | 3 |

Two of these carry a second defect worth Kai's eye:
- **s320** says *your car* in English but अपनी (*his/one's own*) in Hindi — and the course already teaches
  **कार** for "car" at seed 121, so गाड़ी is a needless synonym as well as an untaught one.
- **s113** says *her name* in English but उस लड़की का नाम (*that girl's name*) in Hindi, and लड़की is not
  taught until seed 394.

**Not fixed here, and the reason is not timidity.** Unlike कल, none of these words is in its seed sentence,
so canon L1's test fails and a new lego is not available — the only fix is a **rewrite of a live phrase**,
which canon §7 and R0.3 name explicitly as Kai's call, not an agent's. Seven of the nine carry three rendered
clips each: rewriting them nulls **21 clips on a course that cannot re-render**, so they would go silent.
Two (s113, s180) are clip-free and could be fixed at zero audio cost the moment Kai says so.

Two apparent hits were **false positives** and are named so nobody re-finds them: `बदलनी` (s104) is regular
feminine agreement of बदलना, taught by its own seed; `गईं` (s559) is gender/number agreement inside मिल गया.

### 6c. Seed sentences using Hindi their own legos never cover — 44, of which 9 are content words

Applying the same detector to the 668 seed sentences: **44 carry Hindi covered by no lego at or before their
seed**; 9 of those are non-glue content words. Every one carries 2 rendered clips.

| seed | word | sentence |
|---|---|---|
| 4 | कहूँ | कि अंग्रेज़ी में कुछ कैसे कहूँ। |
| 29 | पाने | मैं जल्दी से जल्दी बेहतर बोल पाने के लिए उत्सुक हूँ। |
| 57 | कहूँ | मुझे याद नहीं आ रहा कि मैं जो कहना चाहता था उसे कैसे कहूँ। |
| 140 | माफ़ | माफ़ करना कि मैं वह नहीं देख सकता… |
| 144 | सोना | मैं आज सुबह जितना सोना चाहता था, उससे पहले ही जाग गया। |
| 180 | देर | मैं कुछ देर अपनी किताब पढ़ना चाहूँगा। |
| 597 | सैकड़ों | मुझे लगता है उसने इस बारे में सैकड़ों कहानियाँ सुनी हैं। |
| 624 | प्लीज़ | हाँ, यह बहुत अच्छा रहेगा, प्लीज़। |
| 10 | या | मुझे यक़ीन नहीं है कि मैं पूरा वाक्य याद कर सकता हूँ या नहीं। |

**Deliberately untouched.** These are a different defect from कल: the sentence is not *wrong*, it is
*under-decomposed* — the known side is not fully covered by its own legos, and the tiling gate only ever
checked the target side. The standing rule is not to rewrite a seed sentence unless it is actually wrong, and
none of these is. The right fix is a decomposition change (more legos), not a text change, and that is a
separate pass. Named here so the count exists.

---

## 7. What I did not do, and why

- **Did not rewrite the 8 pre-seed-30 phrases.** The same-slot swap the brief authorised was unnecessary
  once the lego went in at seed 15. Fewer edits, no clips touched.
- **Did not edit seed 15's seed sentence.** Closing the defect by teaching the word is strictly better and
  keeps three clips alive.
- **Did not place the lego at seed 223.** Seed 223 already teaches `वह कल आपसे पूछने वाला है` whole; a bare
  lego there would still have left the 8 pre-30 rows and the 4 at seed 44 needing rewrites. Seed 15 fixes
  everything and costs less.
- **Did not fix the 214 target-side or the 9 known-side untaught-word phrases.** Both are phrase rewrites,
  which are Kai's call; 7 of the 9 would silence clips that cannot be re-rendered.
- **Did not refresh `course_round_index`**, and did not use it as evidence.
- **Did not generate any TTS**, and did not delete a single `course_audio` row.

## 8. Gaps

- The two "as in" introductions and the 48 clips for the 16 new drills **cannot be rendered by anyone**
  while this course's four voices are retired. Reported, not solved.
- 208 learners already past seed 15 will not be shown the new introduction in the linear walk. Their tiles
  are corrected; their introduction is not re-issued. No progress row was touched.
- The 777 stale introductions on this course, and `/regenerate-presentations` re-rolling contexts at random,
  are unchanged and would re-break the "as in" contexts if run. Pre-existing, flagged again.
