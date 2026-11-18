# Paid courses cleanup scan: fix list (#447·AI, 17 Nov 2026)

**Status: 42 of 50 paid courses have a hand-read fix list. Eight have machine candidate counts only (the Spanish, French, German and Italian courses for Japanese and Chinese speakers), and ara_sy_for_eng could not be read at all.** Nothing was applied, rendered, linked or sent to anyone.

Each slice below is one worker's report, unedited. Items already on a held or ruled list are marked KNOWN there and are not in the numbers here. "Audio" is an estimate from text length (target × 2 voices, known × 1), not a render dry run.

## The short version

| course | new real items | audio if all fixed | biggest items |
|---|---|---|---|
| **spa_mx_for_eng** | 895 | ≈35,600 | "I think" taught as both *creo que* (S0047L01) and *pienso* (S0123L01); Deborah's seed corrections (27, 55, 65, 115, 122, 139, 140, 147, 414, 416, 437, 567) never made here; 159 seeds never said; 275 rows without their LEGO |
| spa_for_eng | 322 | ≈22,600 | 127 duplicate rows; ~127 rows using a word before it is taught; 13 LEGOs left behind by seed edits |
| **por_br_for_eng** | 1,719 | ≈21,100 | ~1,170 filler rows from seed 400 on ("no, of the holidays"), all deletes; 86 rows with European forms |
| por_for_eng | 1,074 | ≈14,200 | 495 duplicate rows; 110 rows on untaught *perguntou/perguntaram*; 37 rows where the person does not match |
| **fra_ca_for_eng** | 137 + a 96-row formal block | ≈14,300 | formal "sir/madam" seeds 639–655 glossed "you all"; "to meet \| se voir"; 33 seeds never said |
| fra_for_eng | 193 | small | 21 baskets drilling less than their LEGO; 56 untaught forms; 27 LEGOs over 8 syllables; 487 duplicate rows |
| ita_for_eng | 108 (+440 duplicate rows) | ≈8,700 | every earlier Italian fix still holds; 8 formal LEGOs (643, 649–655) without sir/madam; seed 212 *aiuto* used long before it is taught; seed 479 *che potessi fare* |
| deu_for_eng | 567 | ≈32,000 | 39 LEGOs whose baskets mostly do not contain the LEGO (≈22,600 of the cost); *dort* used though "there" is taught as *da*; 33 more want/*möchte* rows; 8 fixes from the #435 record that never reached the live course |
| **deu_at_for_eng** | 419 | ≈1,200 | 12 formal LEGOs drop sir/madam; want/*möchten*; 118 seeds never said |
| **deu_ch_for_eng** (draft) | 194 | ≈800 | formal LEGOs are bare verbs; plural verbs without a pronoun; 58 seeds never said |
| ara_for_eng | 563 | ≈25,900 | 24 grammar errors (case, mood, agreement); 44 played rows with empty audio; the builder cannot count Arabic syllables (1 flagged, 123 over the cap by vowel marks) |
| **ara_eg_for_eng** | 670 | ≈7,600 | 14 pairs taught as new twice (fixed in main only); 345 empty English slots; invented English glosses ("yonder", "azure") |
| **ara_lb_for_eng** | 805 | ≈12,100 | LEGO "fun \| مبسط" (seed 64) means "simplified", 16 rows; 333 empty English slots; broken English in the formal block |
| ara_sy_for_eng (draft) | not readable | – | Popty's seed routes return no seeds for it |
| jpn_for_eng | 409 (394 in seeds 1–300) | ≈15,600 | S0282L01 "no \| うん" (うん means yes), 13 rows; 21 LEGOs that are a bare particle or ending; 49 rows where English says he/she/they and the Japanese says "I want"; 180 duplicate rows |
| kor_for_eng | 1,196 (863 are duplicate rows) | ≈25,500 (≈6,000 outside the known over-8 re-cut) | the 5 Nov rebuild of seeds 301–430 dropped the seed sentence from 109 seeds; 49 LEGOs drifted from their seed |
| **kor_for_hin** | 106 | ≈530 | 76 seeds never played; 9 gapped LEGOs |
| **kor_for_tam** | 161 | ≈3,100 | 80 rows + 8 seeds in plain 나/내 where the course uses 저/제; "madam" said as 선생님 |
| zho_for_eng | 85 (+252 unread gloss candidates) | ≈3,900 | 33 LEGOs whose rows drill only part of the LEGO; S0572L02 "last time" taught twice since today's #431 change |
| **zho_for_hin** | 156 | ≈2,800 | 131 seeds never played; time word after the modal |
| **zho_for_tam** | 405 | ≈670 | 363 seeds never played; seeds 161, 316, 625 keep word order the main course already changed |
| **zho_for_jpn** | 404 | ≈13,600 | 171 LEGO glosses written like dictionary entries (〜, ・); 91 played rows with empty audio; 167 seeds never played |
| zho_for_gle (5 seeds) | 5 | 0 | 3 seeds never played |
| eng_for_spa / fra / deu / ita / por | 223 / 148 / 198 / 136 / 146 | ≈13,700 together | seed sentences were reworded after the rows were built, so rows carry old wording; S0207L01 "you've done" fixed in spa only; about a third of each count is seeds never practised (0 chars) |
| eng_for_jpn | 1,345 | ≈18,600 | far the worst of the four: 192 rows in seeds 226–230 whose Japanese prompt is only the LEGO's words; 425 duplicate rows; 375 rows using English not yet taught |
| eng_for_kor / zho / ara | 149 / 176 / 111 | ≈2,700 / 1,900 / 900 | seed 108 "wake / wake up" across all four (≈3,600 more) |
| eng_for_hin | 385 | ≈1,900 | 354 seeds never said (0 chars); the 8 rows of the "never" drill (S0490L01) have no audio |
| **eng_for_ben / guj / mar / pan / urd** | 1,044 / 1,479 / 1,771 / 1,475 / 545 | ≈53,700 / 89,600 / 106,400 / 68,600 / 24,600 | most of the cost (≈268,000) is one family: baskets under 3 real build rows; empty known clips pan 615, mar 454, guj 199 (audio passes queued since August and never run); mar "he's my friend yet"; pan LEGOs that change the seed's meaning |
| eng_for_kan / tam / tel / sin | 115 / 309 / 130 / 530 | ≈12,400 / 21,300 / 33,300 / 77,400 | **eng_for_sin from about seed 345 needs rebuilding, not row fixes**: seed and LEGOs say different sentences; eng_for_tel has 428 played rows with no Telugu prompt clip |

Bold = a variant. The priority Kai asked for (fixed in the main course, not in the variant) is the first section of each slice below. In almost every family the variant is its own build, not a copy, so the same rule is broken in its own rows.

## Checked by the orchestrator against live rows (17 Nov)

One headline claim per slice was re-read from a fresh live dump. All held.

- **spa_mx "I think":** S0047L01 "I think that | creo que", S0123L01 "I think | pienso". Of 502 played rows starting "I think", 136 say *pienso que*, 363 *creo que*.
- **por_br filler:** 1,061 "yes / no + bare LEGO" rows, 1,047 in seeds 400–699. **Caution:** a few are good sentences ("no, thank you"), so walk a sample before any bulk delete.
- **fra_ca formal block:** S0639L01 is "you all | vous".
- **ita formal block:** S0643L01 is "do you want | vuole" under seed "do you want sir? | vuole, signore?"; S0212L01 is "to ask for | chiedere" and *aiuto* appears in rows well before seed 564.
- **deu:** S0064L01 still has the use row "I want learning German". No LEGO teaches *dort*; "there" is *da* (S0157L01, S0456L01). 115 rows contain *dort* counting unplayed ones (the worker lists 74 as new).
- **ara_lb:** S0064L02 is "fun | مبسط"; 16 rows carry the word. Empty slots: ara_lb 336 and ara_eg 361 rows have no English clip, and no row in either is missing a target clip. This settles the earlier disagreement with the 12 Nov fill record: that record was about target slots and still holds.
- **jpn:** S0282L01 is "no | うん", with rows such as "no, I like it | うん、好き".
- **kor:** in seeds 301–430, 108 seeds have no row carrying the seed's own Korean.
- **zho_for_tam:** seeds 161 and 316 still read 你能周日早上… and 她能周一….
- **eng_for_fra:** S0207L01 "you've done" is marked not-new and no other LEGO teaches it.
- **eng_for_jpn:** 192 of 234 rows in seeds 226–230 have a prompt equal to the LEGO's own Japanese under a longer English sentence.
- **eng_for_mar:** "he's my friend yet" is live at S0130L01.
- **eng_for_sin:** seed 455 "We had to leave because the children were tired." has LEGOs "the child was upset" and "we need to go home".
- **Baskets under 3 real build rows (the ≈268,000-character Indic family):** the premise is that a build row whose text is the LEGO itself is never played. The player code says so (`api/courses/[code]/cycles.ts`: "The debut IS the bare LEGO — claim it so no later cycle replays it"). So the family is real, but whether to spend that much on it is Kai's call. It was counted only in the Indic slice; the other slices did not count it.

## Coverage

The 17 mechanical families in `patterns.md` were run on all 50 courses. They were read by hand in 42. Language patterns mined from the fix history, each calibrated on a pre-fix example: Spanish 33, Portuguese 11, French 19, Italian 14, German 10, Arabic 8, Japanese 7, Korean 7, Chinese 8, English-target 17 + 14 + 10 (5 more dropped because they had no known example).

Detector faults the workers found and worked round by hand (the shared tool was not changed): the untaught-word check blames an early seed word whose first LEGO comes later; it cannot run on Japanese or Chinese (no spaces); the syllable count is wrong for Arabic, Japanese and under-counts English; the seed-not-played check does not strip the Hindi full stop.

## Gaps

- **Eight courses unread:** spa, fra, deu and ita `_for_jpn` and `_for_zho`. No worker was dispatched for that slice: this job was held to three workers and the room sent the other ten slices but not this one. Candidate counts only (`candidate-counts-2026-11-17.txt`).
- **ara_sy_for_eng:** not readable through any Popty seed route.
- **Known languages nobody here can judge:** Hindi, Bengali, Gujarati, Marathi, Punjabi, Urdu, Kannada, Tamil, Telugu, Sinhala, and the Hindi/Tamil/Japanese/Irish prompts of the Korean and Chinese variants. Only structure was checked there.
- **Not read row by row in most slices:** LEGOs of 7–8 syllables (few shorter cuts proposed), English-side "LEGO says words its seed doesn't" candidates, intros, seeds 301–668 of jpn_for_eng (a known rebuild), and the Japanese prompts of eng_for_jpn beyond what the checks pointed at.
- **Female voice saying the male form:** text-only at-risk counts, nobody listened: spa_mx ≈454 slots, fra_ca 376 rows, por_br 310, ara_for_eng 399, eng_for_guj 472, eng_for_pan 1,982, eng_for_urd 1,406.
- **"Free" fixes are unconfirmed:** adding an unplayed seed as a row assumes the seed has its own clips; linking empty English slots assumes the library accepts the existing clip. Neither was dry-run.
- **Fix history:** Popty's edit-event history needs an admin login and was not read; history came from `ops/` records and published docs. Kai's chat archive stops at 19 Aug. Recommendations cite dictionaries and grammars, not a native speaker.

## Jobs and accounts

Every job ran on kai-gmail.

| slice | job | account | model | own report |
|---|---|---|---|---|
| orchestrator | #447·AI | kai-gmail | fable | this document |
| spa | #453·AI | kai-gmail | opus | d/8e3ddc70 |
| por | #454·AI | kai-gmail | opus | d/08a802d4 |
| fra | #455·AI | kai-gmail | opus | d/2119e6af |
| ita | #467·AI | kai-gmail | opus | d/ae7390b7 |
| deu | #468·AI | kai-gmail | opus | d/10ff0a29 |
| ara | #469·AI | kai-gmail | opus | d/abc97457 |
| jpn | #470·AI | kai-gmail | opus | d/e121e461 |
| kor | #471·AI | kai-gmail | opus | see slice |
| zho | #472·AI | kai-gmail | opus | see slice |
| eng-eu | #473·AI | kai-gmail | opus | d/03ebc194 |
| eng-asia | #474·AI | kai-gmail | opus | d/d23dd572 |
| eng-indic-north | #475·AI | kai-gmail | opus | d/825316aa |
| eng-indic-south | #476·AI | kai-gmail | opus | d/a75822ac |
| x-for-jpn-zho | not dispatched | – | – | – |

#453–#455 were dispatched by this job; #467–#476 by Kai's room after the surface refused this job a fourth worker. Numbers #456–#459 and #464 are void: no worker ran under them.

---

