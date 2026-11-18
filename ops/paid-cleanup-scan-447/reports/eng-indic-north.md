# English for Hindi, Bengali, Gujarati, Marathi, Punjabi and Urdu speakers: cleanup scan findings (#447, worker #475·AI)

Courses: **eng_for_hin** (the main course), plus **eng_for_ben, eng_for_guj, eng_for_mar, eng_for_pan, eng_for_urd**. All six are released and live. English is the TARGET language in all of them.
I read them live through Popty's script-view on 17 Nov 2026 at 14:06Z. **Nothing was applied, rendered, linked or sent.**
The full row list is in `ops/paid-cleanup-scan-447/reports/eng-indic-north.json` (10,853 rows, each marked REAL, NOT A DEFECT, KNOWN, AT RISK or MINOR). The new patterns are in `eng-indic-north.patterns.json`. All 10 pass their own known positive (detect.cjs exit 0 on all six courses).

**Two things to know first.**
1. The five variants are not copies of eng_for_hin. They have the same 668 English seeds, but each was built separately: different LEGO cuts, and different practice rows from one shared generator. So "fixed in hin, still live in the variant" means the same *defect shape* is in the variant's own rows. It does not mean the same row ids.
2. **I cannot judge the known side (Hindi, Bengali, Gujarati, Marathi, Punjabi, Urdu) beyond its structure.** The canon says so too (Part Two: the known-side gate is inert on these scripts). Known-side findings below are structural: gaps, question words, first-person gender endings, a pronoun with no gender. Two exceptions are marked "best guess". The detector's "LEGO known text not in its seed" family (133–238 hits per course) is **not read** for this reason.

Audio characters = new target text × 2 voices + new known text × 1, for the sides that change. Deletes and relinks cost 0. LEGO changes include about 24 characters for the intro. All counts are estimates (±10%).

---

## PRIORITY — fixed in eng_for_hin, still live in the variants

| # | what hin fixed | hin record | still live in | size |
|---|---|---|---|---|
| 1 | **The known line's first-person verb matches the voice speaking it** (Kriti says the female form, Rehan the male) | #770, #941·H, #710 | **guj, pan, urd**: each has one FEMALE known voice (Azure Dhwani, Vaani, Uzma), and the known text uses MALE first-person forms | **AT RISK** (text only, not heard): guj 472 rows, pan 1,982, urd 1,406 |
| 2 | **A build row that just repeats the LEGO is made a real phrase**, so each basket has 3 counted builds | #943·H, step 3 of `eng-for-hin-red-seeds-fix-2026-09-23.cjs` | all five | hin has 1 basket left under 3. ben 748, guj 1,149, mar 782, pan 543, urd 369. Of these, 165 baskets have only 0–1 real builds |
| 3 | **No gapped LEGOs** (seed 128 re-cut gap-free) | #871, #943·H | ben, mar, urd | 15 LEGOs with "..." on the known side |
| 4 | **his/her from one known pronoun**: Kai approved an explanation intro on the first LEGO | #870·H, #880·H (S0020L01, S0021L03) | ben (তাকে = him and her); pan uses a broken form to mark "her"; urd uses "that girl's name" | 2 ZUT clashes + 1 grammar item; about 1,800 Bengali rows carry a pronoun with no gender |
| 5 | **Not-new only when both sides match an earlier LEGO** | #833, #875 | ben S0177L01 "her", not-new with no earlier pair. mar teaches 4 pairs as NEW twice | 5 |
| 6 | **"never" taught at seed 490** | #914·H | ben's only seed-490 LEGO is "trust anyone ever", which is not English | 1 |
| 7 | **Broken English from the tag-glue generator** (fixed in mar's 10 flagged seeds on 6 Aug, not elsewhere) | mar 54f405e6c | mar, rest of course | 126 rows (yet/already/very well/not sure) + 304 rows ("in English") |

Not found in the variants (no action): the seed-128 bracket gloss "someone (who)" (0 brackets in any variant); the seed-489 "right now / at the moment" clash (no variant uses one known word for both).

---

## eng_for_hin (main course): 385 REAL, ≈1,900 chars

**Empty audio — 19 rows, ≈1,340 chars.** S0490L01 is "never", the drill added on 23 Sept (#914·H). All 8 of its rows have no clip at all (known, target1, target2): `I'm never late`, `you never tell me`, and 6 more. 11 more rows in S0128/S0140 have no known clip. These are the "28 Cartesia clips unlinked" left by the seed-128 edit (#866). A pending audio pass has been queued since 12 Oct and has not run. **Fix:** run that pass. **Canon:** A16. **Confidence:** sure.

**Seed sentence never said in a played basket (P26) — 354 seeds.** Example: S0004 `how to say something in English`, S0008, S0011, S0015. Rule P26 (Kai, 28 Sept) was applied to Italian only. **Fix:** run the ita #635·I tool's method. It reuses the seed's own clips, so it costs 0 chars. **Confidence:** sure (target-side match; 451 if the Hindi must match exactly too).

**LEGO English not in its seed (L26) — 8.** S0111L03 `it brings about changes` (seed: "it changes our brain"); S0328L01 `she ought to` (seed: "she should"); S0461L01 `such a shop`; S0437L03 `as much money as possible` (seed has no "money"); S0375L03 `what she is doing` (seed: "was"). **Fix:** re-gloss each to the seed's words. ≈460 chars.

**ZUT — 1 REAL, 2 KNOWN.** कल = `tomorrow` (S0015L03) and `yesterday` (S0030L03). One prompt has two answers. **Fix (L34):** teach "yesterday" inside a larger LEGO with its own context word. Likely. KNOWN: उसका नाम his/her (#870·H); क्या होने वाला है is/was (#880·H).

**Small items.** S0001L01C02 component says `चाहता हूँ` (male) under the female LEGO `मैं चाहती हूँ`. S0611L03U05 English `do you want to go somewhere else` over Hindi "can we go somewhere else?". S0357L03 has 2 counted builds.
**KNOWN:** 32 LEGOs over 8 syllables (Kai applied 1 of the 92 proposed cuts); 11 seeds with no LEGO (2 Sept rebuild).
**Not a defect:** 30 "?" mismatches where both sides carry a question word. S0001L01 has no practice of its own, but seed 1 is graduated and L02–L05 all carry "I want".

---

## eng_for_mar: 1,771 REAL, ≈106,000 chars

**1. Empty known audio — 454 rows, ≈15,800 chars.** Seeds 31–668 in about 26 runs (31, 35–39, 51–60, 184–200, 301–340, 454–476, 652–668…). Almost all are rows U06 and later, added after the course was voiced. 5 rows also have no target clip (S0312L03U06, S0316L04U06/U07, S0318L02U06, S0323L02B04). The course's pending audio pass has been queued since **6 Aug** and has not run. No missing text has a clip elsewhere in the course, so the library will probably not fill them free. **Fix:** run the pass. **Confidence:** sure.

**2. Tag-glue broken English — 126 REAL of 157 read.** This is the generator defect the 6 Aug repair fixed in 10 seeds. The rest of the course was never repaired:
- S0130L01B03 `he's my friend yet`
- S0153L01B03 `in exactly already`
- S0102L01U04 `we're very well`
- S0197L01B03 `as a teacher very well`
- S0256L02B04 `I think I'll be ready already`

31 were fine (`have you decided yet?`, `you've done very well`).
**Fix:** replace each with a real phrase from taught words, as the 6 Aug repair did. Replacing keeps every basket's count; deleting does not. **Canon:** K9, P3. **Chars:** ≈8,900. **Confidence:** sure.

**3. "in English" stuck onto a fragment — 304 REAL of 339 read.** Examples: S0161L02U02 `Sunday in English`; `pub in English`, `brain in English`, `last month in English`, `or if in English`. The 6 Aug triage (3355555fd) called this slot "the drill format, not a defect". That was an agent's call, not Kai's. K9 says target English must be grammatical. 35 are fine (`to explain in English`, `could you say that in English?`).
**Fix:** delete where counts allow, else replace. **Chars:** ≤22,200 if every row is rewritten; 0 for deletes. **Confidence:** likely. **This is your call:** keep the slot or not.

**4. ZUT and broken LEGO English — 5.**
- S0136L01 LEGO is `course | अर्थातच`, with rows `course you`, `course you can`. **Fix:** `of course`. Sure.
- छान होईल is both `would be great` (S0090L03U04) and the LEGO `it would be nice` (S0402L01). **Fix:** delete U04.
- ते चालेल is both `it will work` (S0094L03U02) and the LEGO `that would be fine` (S0633L02). **Fix:** delete U02.
- S0065L01U05 `important something`. **Fix:** delete.
- S0161L02U03/U05 `on Sunday morning` / `Sunday morning here`, over a known side that says "here" in both. **Fix:** delete both.

**5. Same pair taught NEW twice — 4 REAL, 1 KNOWN.** S0215L01 `on Saturday night` (first at S0154L01), S0218L01 `on Sunday`, S0219L03 `for a while`, S0271L01 `next month`. **Fix:** mark not-new and rehome the played rows (P25). 0 chars. KNOWN: S0238L01 `he wanted` (6 Aug repair: proposed, not applied).

**6. Phrase without its LEGO — 14.** Example: S0215L01U01 `I can't remember Saturday night`, under the LEGO `on Saturday night`. S0161L02 has 5 rows without "on". S0636L01U04 `that was` under `that is`. **Fix:** reword or delete. ≈990 chars.

**7. Bare build rows — 782 baskets under 3 counted builds** (34 with 0–1). See the priority table. ≈57,800 chars to make them all real.

**8. Other.** P26: 67 seeds never said. L26: 5. Example: S0018L03 `we need to meet` (seed: "want"). S0024L02 `won't be able to remember` (seed: "I'm not going to be able to"). Over 8 syllables: 3, with cuts in the JSON. Example: S0548L02 `I am feeling sad / at the moment`. Gapped: 2 (S0014L02 `तुम्ही ... का`, S0485L03). Duplicate rows: 5 (deletes).
**Not read:** the other filler tags (here 224, today 228, again 204, now 157, tonight 113…). I read "here" in full: most are nonsense (`great here`, `bus here`, `pub here`). They are counted in the JSON, not row-judged.

---

## eng_for_pan: 1,475 REAL, ≈68,600 chars (+1,982 AT RISK)

**1. Empty known audio — 615 rows, ≈21,800 chars.** Seeds 31–668 in 17 runs (351–429 is the largest). Rows U06 and later again. S0316L04U07 and S0379L01B05 also have no target clip. The pending pass has been queued since **12 Aug**. **Fix:** run it. Sure.

**2. LEGO English drifts from the seed (L26) — 60 REAL of 70.** This is the biggest content defect in pan. From seed ~500 on, LEGOs carry English the seed never says, sometimes with a different meaning:
- S0513L02 `when I turn my head upside down` (seed: "when I move my head up and down")
- S0618L01 `it doesn't take much time` (seed: "it doesn't feel like a long time")
- S0597L02 `he must have heard` (seed: "I suspect that he's heard")
- S0507L01 `we moved into town` (seed: "to the city")
- S0543L01 `he was right` (seed: "She was right")
- S0599L02 `I would have happily driven`

hin has no case like this; its 8 are small. **Fix:** re-gloss each LEGO to the seed's words and carry the change into its phrases. **Chars:** ≈3,900 for the LEGOs; phrases that copy the drift add more. **Confidence:** likely. 10 not a defect: contraction only, stand-in "it" (L33).

**3. Known voice is female, known text is male (AT RISK).** 1,982 played rows say `ਮੈਂ ਚਾਹੁੰਦਾ ਹਾਂ`-type male forms. The only known voice is Azure pa-IN-VaaniNeural (female). 63 rows already use female forms (`ਚਾਹੁੰਦੀ ਹਾਂ`), so the course mixes both. This is the state hin was in before #770/#941·H.
**Fix:** your voice call. Either flip the text to female forms (≈77,000 known chars) or give these rows a male known voice. **Not heard.**

**4. Untaught words — 27 rows.** `for` is used from seed 38 but first taught at seed 68. Example: S0038L02U01 `I want to learn English for about a week`. `most` at seed 280 is taught at 288 (`the most important job` ×5). **Fix:** grow S0038L02 to `for about a week` and S0280's LEGO to `the most important job`. That is two LEGO changes, and the rows then pass. Likely.

**5. Other.** "again" filler from seed ~500 (`the church is ugly again`, `unless he's lucky again`, `he was right again`): about 120 read, mostly nonsense, not row-counted. Bare build rows: 543 baskets (40 with 0–1). P26: 198 seeds. Over 8 syllables: 9, with cuts in the JSON. Questions: 7 REAL. Example: S0157L02U01 English `I want to do something next month` over a known "what do I want to do next month?". S0058L01U05 `I want to understand something with you?`.
S0021L03 `ਉਸਦੀ ਨਾਂ`: the possessive should agree with ਨਾਂ, which is masculine (ਉਸਦਾ ਨਾਂ). It looks like a hack to mark "her". Best guess; the fix is the hin explanation intro. Duplicate rows: 7. Phrase without LEGO: 5.

---

## eng_for_guj: 1,479 REAL, ≈89,600 chars (+472 AT RISK)

**1. Empty known audio — 199 rows, ≈6,800 chars.** Seeds 528–560, 611–635, 639–641, 645–668. S0489L02B05 has no target1 clip. The pending pass has been queued since 12 Oct. Sure.

**2. Female known voice, male text (AT RISK).** 472 rows. Example: S0002L01 `હું કોશિશ કરી રહ્યો છું` read by Azure gu-IN-DhwaniNeural (female). Only 2 rows use the female form. ≈18,700 known chars to flip. Your voice call.

**3. LEGO English drifts (L26) — 25 REAL of 35.**
- **Gender swaps:** S0285L01 `he speaks` (seed: "She speaks"); S0289L02 `he'll be there` (seed: "she's going to be there"); S0290L01 `she knows` (seed: "he knows")
- **Meaning:** S0293L02 `where it's being held` (seed: "where he's going to meet me"); S0495L01 `important` (seed: "When it matters")

**Fix:** re-gloss to the seed. ≈1,340 chars. Likely.

**4. Other.**
- **Bare build rows:** 1,149 baskets, the most of any course (48 with 0–1 real builds); ≈80,000 chars to make them all real.
- **P26:** 74 seeds never said.
- **Over 8 syllables:** 7. Example: S0492L05 `which do you think / is the most interesting`.
- **Phrase without its LEGO:** S0075L01 `have you got` → rows `do you have to go?` (a different meaning, 3 rows); S0053L03U04 `her letter` under `his letter`.
- **ZUT:** S0493L02U05 `what is going to come now` vs the LEGO `what's going to come next`.
- **Rows whose known side leaves out a word:** S0055L02U03 `a little tired`; S0255L01U05 `ready to answer`, over a known that says "speak English".
- **Seed words no LEGO teaches:** `let` at 71, `quite` at 339.
- **Duplicate rows:** 6.

---

## eng_for_ben: 1,044 REAL, ≈53,700 chars

**1. Gapped LEGOs — 11.** All are on the Bengali side: S0549L02 `আমাকে ... থাকতে হবে | I have got to be`, S0630L01 `আমি কি ... পারি | could I have`, S0626L02 `না, ... ধন্যবাদ | no thank you`. S0626L02 is also a second NEW debut of S0173L01. **Fix:** fill the gap with the seed's own middle words, or re-cut as hin did at seed 128. ≈490 chars. Likely.

**2. Him/her and he/she from one Bengali pronoun.** তাকে is `him` (S0176L02) and `her` (S0177L01, not-new with no earlier pair; L31). সে জানতে চেয়েছিল is both `he wanted to know` (LEGO S0347L03) and `she wanted to know`. Bengali সে/তার/তাকে carry no gender. About 1,800 played rows use one of them.
**Fix:** the hin precedent. Kai approved an explanation intro on the first his/her LEGO (S0020L01). Put the same intro on the first সে, তার and তাকে LEGOs, and make S0177L01 NEW. About 3 intros. Likely.

**3. LEGO English drifts (L26) — 33 REAL of 39.**
- S0127L01 `didn't want to see` (seed: "I wanted to see")
- S0501L04 `believe` (seed: "trust")
- S0563L03 `couldn't have` (seed: "wouldn't have")
- S0631L01 `what will you have` (seed: "What would you like?")
- S0638L01 `I'm trying to remember` (seed: "to think")
- Formal block 642–665: `do you have any objection` (seed: "Do you mind madam?")

Broken English: S0490L01 `trust anyone ever`; S0573L02 `makes so special`. ≈1,950 chars.

**4. Untaught words — 44 rows.** `my` is used from seed 51 (`with my friends`) but first taught at seed 126 (25 rows). `keep` at 24/28 is taught at 92. `fetched`, `continued` and `hates` are never taught. **Fix:** teach `my friends` at S0051L02, the seed's own words; the rest are rewords. Likely. 25 more are "we'll" rows: not a defect (we + 'll, both taught).

**5. Other.**
- **Bare build rows:** 748 baskets (32 with 0–1).
- **P26:** 153 seeds never said.
- **Phrase without its LEGO:** 17. Example: S0211L02 `doesn't want to explain`, where the seed says "didn't" and the rows say "don't" (4 rows).
- **Duplicate rows:** 13.
- **Questions:** 7 REAL. The known prompt has no কি and no "?", so it is heard as a statement: S0021L02B01 `তুমি শিখছ | are you learning?`, S0075L01B01 `তোমার আছে | have you got?`.
- **Over 8 syllables:** 6.
- **No empty audio.** The pending pass, queued since 12 Oct, has nothing left to fill.

---

## eng_for_urd: 545 REAL, ≈24,600 chars (+1,406 AT RISK)

**1. Female known voice, male text (AT RISK).** 1,406 rows. Example: `میں چاہتا ہوں` read by Azure ur-PK-UzmaNeural (female). 23 rows already use female forms (S0177L01B01 `میں اس سے پوچھوں گی`). ≈48,000 known chars to flip. Your voice call.

**2. Untaught words — 30 rows. Seed words no LEGO teaches — 11 seeds.** `make` (seed 47), `every` (449, 463, 533, 584), `bad` (462, 511, 534, 536), `such` (423, 478, 557), `from` (85, 170, 181), `baby` (516) are used before, or without, a LEGO that teaches them. **Fix:** grow each seed's LEGO to carry the word, at the shortest cut. Likely.

**3. Questions — 11 REAL.** The Urdu prompt has no کیا and no "?": S0631L01B02–B04 `کچھ لینا چاہیں گے | would you like something?`, S0174L01B01, S0196L01B02/B03, S0644L01B01. **Fix:** add کیا … ؟ ≈180 known chars.

**4. Other.**
- **Gapped LEGOs:** 2 (S0080L01 `میں ... ہوں گا`, S0119L02).
- **Duplicate rows:** 8, including S0007L01U05 `I'm trying to try` (nonsense).
- **Phrase without its LEGO:** 8 (S0051L01 `I enjoy` → `I like to speak`).
- **L26:** 5. S0280L03 `only had to do the work` (seed: "the most important job"); S0300L01 `friendly` (seed: "unfriendly").
- **Tag-glue:** 4 (`a lot yet`, `isn't yet`).
- **Bare build rows:** 369 (22 with 0–1).
- **P26:** 94 seeds never said.
- **Empty audio:** 1 row (S0422L01U07 target).
- **S0489L02:** `مضبوط` means sturdy. "Strong coffee" is `کڑک کافی`, as hin has it. Best guess.
- **S0021L03:** `اس لڑکی کا نام` is a workaround for "her"; listed only so it can match hin.

---

## Coverage

| family | hin | ben | guj | mar | pan | urd |
|---|---|---|---|---|---|---|
| empty audio | read all | read (0) | read all | read all | read all | read all |
| ZUT LEGO/use | read | read | read | read | read (0) | read |
| LEGO English not in seed (L26) | read 8 | read 39 | read 35 | read 6 | read 70 | read 7 |
| LEGO known not in seed | **not read** (known side) | not read | not read | not read | not read | not read |
| over 8 syllables (hand count) | KNOWN | read | read | read | read | read |
| 7–8 syllables (Kai's shortest cut) | counted 132, **no cuts proposed** | 67 | 79 | 99 | 94 | 54 |
| phrase without LEGO | 0 | read 19 | read 9 | read 14 | read 13 | read 14 |
| duplicate rows | 0 | read | read | read | read | read |
| untaught target words | 0 | read 69 | read 6 | 0 | read 36 | read 30 |
| gapped / not-new / NEW twice | 0 | read | 0 | read | 0 | read |
| question on one side | read 31 | read 9 | read 22 | read 12 | read 28 | read 11 |
| P26 seed never said | counted (seed-level) | counted | counted | counted | counted | counted |
| tag-glue yet/already/very well/not sure | read 4 | read 8 | read 12 | read 157 | read 7 | read 19 |
| "in English" tag | not judged (31) | not judged (6) | not judged (16) | **read 339** | not judged (16) | not judged (14) |
| other filler tags (here/today/now/again…) | counted 520 | counted 637 | counted 625 | counted 1,081; "here" read | counted 1,060; "again" part-read | counted 390 |
| bare build rows | counted | counted | counted | counted | counted | counted |
| first-person gender vs known voice | not applicable (two voices) | not applicable (no gender) | counted | checked: male voice, male forms, consistent | counted | counted |
| intros | **not scanned** | not scanned | not scanned | not scanned | not scanned | not scanned |

## Gaps

- **The known side is not judged** beyond structure (canon Part Two). This covers "LEGO known not in seed" (133–238 hits per course) and the naturalness of the Indic text. The two known-side "best guess" items are marked as such.
- **Intros not scanned.** Script-view has no intro text. hin's intros were re-authored to mirror their LEGOs (#20·I); nobody has checked the variants.
- **"A bare build row is never played"** is the finding of hin's #943·H tool header. I did not re-verify it in the player code. If it is wrong, family 2 shrinks to a P3 (anti-filler) question.
- **Female voice saying a male form:** these are text counts only. No clip was heard (A22). The known voice per slot is inferred from estate-map voices_of_record, which lists one dominant known voice per course.
- **Filler tags** (here/today/now/again…): about 4,300 rows counted (hin 520, ben 637, guj 625, mar 1,081, pan 1,060, urd 390), not judged row by row, apart from mar "here" and part of pan "again".
- **7–8 syllable LEGOs:** counted, no shorter cuts proposed.
- **Audio characters are estimates from text length.** For empty slots, the library may already hold some English target clips (other eng_for_ courses), which would make them free. I did not dry-run the render route.
- **The formal "sir/madam" block (639–655)** has no honorific in any of the six courses, hin included. So it is not a "fixed in main" item. Not judged further.
