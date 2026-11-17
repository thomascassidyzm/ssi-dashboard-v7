# eng-indic-south — cleanup scan findings (#447, worker #476·AI, 17 Nov 2026)

Courses: **eng_for_kan, eng_for_tam, eng_for_tel** (live) and **eng_for_sin** (beta). English is the TARGET in all four, so I could read and judge every English line. I **cannot judge Kannada, Tamil, Telugu or Sinhala** beyond structure (word present or missing, "?" present or missing). Nothing was applied, rendered or sent. Live dumps were taken 17 Nov through Popty's own script-view route; the candidate counts matched the orchestrator's exactly.

## The short version

| course | real content findings | content audio chars | housekeeping (mechanical) | housekeeping chars |
|---|---|---|---|---|
| eng_for_kan | 115 | 12,420 | 441 | 555 |
| eng_for_tam | 309 | 21,344 | 224 | 1,384 |
| eng_for_tel | 130 | 33,280 | 762 | 20,748 |
| eng_for_sin | 530 | 77,356 | 434 | 4,449 |

"Housekeeping" = duplicate rows (delete, 0 chars), seed sentence never played (P26 tool, reuses seed clips, 0 chars), missing "?" on the known side (known clip re-read), empty audio slots. Chars = new text × 2 voices for English, × 1 for the known side, deletes cost 0; LEGO re-cuts are counted at the upper bound (the LEGO plus every row in its basket, English only — known-side re-records are NOT counted because I cannot say which known rows change).

**What matters most, in order:**

1. **eng_for_sin seeds ~345–668: the Sinhala and the English seed often say different sentences, and the LEGOs were cut from the Sinhala.** 160 new LEGOs have English the seed does not contain — e.g. S0455 seed *"We had to leave because the children were tired"* is taught as *"the child was upset"* + *"we need to go home"*; S0405 *"Should we ask if we have to book?"* is taught with *"a hug"* and *"was needed"*; S0127 *"That isn't why I wanted to see you"* teaches *"brain"*; S0454 *"Our friends came round at about six o'clock"* teaches *"six of our friends"*. On top of that sit **147 template build rows** ("liked a hug", "want the film", "said a good example", "liked my grandfather fought in Italy during the war") and **38 "near the field / near the top" tails** ("we need to go home near the top"). This half of the course needs re-authoring from the English seeds, not row fixes. Recommendation: treat sin seeds 345+ as one rebuild job (seed Sinhala re-checked against the English, LEGOs re-cut to L26, baskets regenerated); deleting the 185 template/filler rows is safe now and costs nothing.
2. **eng_for_sin seed 111 basket is nonsense** ("I hope for our brain", "I relax with our brain"; the Sinhala rows have no word for brain). 13 rows. Delete and rebuild.
3. **eng_for_tel: 428 played rows have no known-side (Telugu) clip** (424 known-only, 4 also missing English). Seeds 211–511. 18,099 Telugu chars × 1 voice at most (library-first may find some). This is A16: the learner gets no prompt.
4. **eng_for_tam: a broken stretch at seeds ~7–60 and 112–149.** English says words the Tamil does not ("I'm trying to come back today", "he wants to come back later on now", "I wouldn't like to finish tomorrow now" — 74 rows); grammar breaks ("he speak tomorrow", "I learn English last week", "how do you feel last month?", "thats very kind of you and im"); **"try" is not taught until seed 491 yet used from seed 7** (25 rows) because seed 7's LEGOs never cover "I want to try"; LEGOs that are not English ("believe that your idea very good", "don't feel as if ready", "difficult thinking quickly"); seed 140's LEGOs are about being late while the seed is *"I'm sorry that I can't see what you're trying to show me"*, and seed 239 teaches *"father"* for *"My mother likes to read"*.
5. **eng_for_tel / eng_for_kan: LEGO English drifts from the seed** (tel 54, kan 27): *"girlfriend"* for *friend* (S0267L02), *"dad"* for *father*, *"tv"* for *television*, *"I have"* for *I've got*, *"'d told me"* (a LEGO starting with 'd), kan *"that is more warm"* (S0578L02, 8 rows) and *"of the shops"*, *"growing up"* for *grow up*. Tel/kan grammar is otherwise clean — kan's real grammar breaks are 18 rows, tel's 5.
6. Over-cap LEGOs (9+ syllables, hand count): kan 4, tam 13, tel 11, sin 11 — each listed with a shorter cut below.

Patterns I added (14, all English-target, each matched its own live positive in `detect.cjs` — exit 0 on all four courses): `reports/eng-indic-south.patterns.json`. They are the ones to run on the other eng_for_* courses (hin, ben, mar, guj, pan, urd…): template builds, "near the field/top", did+past, a+vowel, missing apostrophes, "more warm", he/she + bare verb, want+ing, present + "last week", perfect + "last week", "can you to", stray "'d", "forward to to", "thought today".

**KNOWN items:** none of the findings below are on a held or ruled list. I checked canon WC-1/WC-2/L20/R0.10, the a134 eng_for_sin repair records (seeds 1–200, Aug 2026: corrupt Sinhala writing, presentation clips — different defects, all in seeds 1–200), git history for all four courses and eng_for_hin, Kai's memory index and estate-search. There are no Kai rulings on these four courses since August. L20 (Sinhala ask/hear) touches two gapped LEGOs (S0365L02 "I didn't hear", S0423L03 "do they need to ask") — when those are re-cut, L20's procedure applies.

## eng_for_kan

### lego_not_in_seed_target — 27 real of 34 read · 10,530 chars
The LEGO's English is not what the seed sentence says (it was glossed from the known side instead).
- `S0261L02` ಅಂತ ನನಗೆ ಅನಿಸುತ್ತೆ | **it seems to me** → Re-cut so the LEGO English is the seed's own words: seed says "I think it might be something important."; LEGO adds/changes ['seems', 'to', 'me']. Known side re-cut to match (known text not judged her (likely)
- `S0474L01` ಉಚಿತವಾಗಿ | **for free** → Re-cut so the LEGO English is the seed's own words: seed says "I don't even want it as a free offer."; LEGO adds/changes ['for']. Known side re-cut to match (known text not judged here). (likely)
- `S0474L02` ಅದನ್ನ ಕೊಟ್ಟರೂ | **even if it's given** → Re-cut so the LEGO English is the seed's own words: seed says "I don't even want it as a free offer."; LEGO adds/changes ['if', "it's", 'given']. Known side re-cut to match (known text not judged here (likely)
- `S0479L01` ಚಿಕ್ಕ | **small** → Re-cut so the LEGO English is the seed's own words: seed says "It's the least I could do."; LEGO adds/changes ['small']. Known side re-cut to match (known text not judged here). (likely)
- Not a defect (7): `S0062L02` to help; `S0469L01` to change; `S0487L01` it; `S0487L02` is; `S0575L02` has been upsetting; `S0580L02` we … — NOT A DEFECT (contraction / K54 "to" / K28 pronoun)
- Canon: L26 (K54/K28 exceptions)

### zut_lego — 4 real of 4 read · 154 chars
One known prompt, two English answers, with a LEGO on one side.
- `S0118L03` ಈಗ ನನಗೆ ಚೆನ್ನಾಗಿ ಅನಿಸ್ತಿದೆ | **I feel better** → LEGO English "I feel better now", or drop ಈಗ from the LEGO known — LEGO "I feel better" over known that says "now" (its own U01 says "I feel better now") (likely)
- `S0193L01` ನನಗೆ ತುಂಬಾ ಕೆಲಸ ಇದೆ | **I'm too busy** → give S0273/S0277 rows the S0273L02 known for "too much work" plus "I've got"; keep "I'm too busy" for ನನಗೆ ತುಂಬಾ ಕೆಲಸ ಇದೆ — same known → "I'm too busy" (S0193L01) and "I've got too much work" (S0273L0 (likely)
- `S0282L01` ಇಲ್ಲ ಅದು ಸಮಸ್ಯೆ ಅಲ್ಲ | **no that's not a problem** → unify on the LEGO: S0134L04U03 → "no, that's not a problem" — "no that's not a problem" (LEGO) vs "no it's not a problem" (S0134L04U03) on one known (likely)
- `S0163L01` ಅದು ಆಸಕ್ತಿಕರ ಅಂತ ನನಗೆ ಅನಿಸುತ್ತೆ | **I think that it's interesting** → unify the rows on the LEGO's "that" — "I think that it's interesting" (LEGO) vs "I think it's interesting" (S0089L03U02, S0120L04U02) (likely)
- Canon: K2, K22, L34

### en_grammar:more_adj — 8 real of 8 read · 484 chars
"more warm" for "warmer" — in the LEGO itself.
- `S0578L02` ಹೆಚ್ಚು ಬೆಚ್ಚಗಿರೋ | **that is more warm** → LEGO "that is more warm" → "warmer" (seed 578 says "somewhere warmer"); rows follow (sure)
- `S0578L02B01` ಹೆಚ್ಚು ಬೆಚ್ಚಗಿರೋ | **that is more warm** → LEGO "that is more warm" → "warmer" (seed 578 says "somewhere warmer"); rows follow (sure)
- `S0578L02B02` ಹೆಚ್ಚು ಬೆಚ್ಚಗಿರೋ ಚರ್ಚ್ | **the church that is more warm** → LEGO "that is more warm" → "warmer" (seed 578 says "somewhere warmer"); rows follow (sure)
- `S0578L02B03` ಅವಳಿಗೆ ಹೆಚ್ಚು ಬೆಚ್ಚಗಿರೋ ಚರ್ಚ್ ಬೇಕು | **she wants the church that is more warm** → LEGO "that is more warm" → "warmer" (seed 578 says "somewhere warmer"); rows follow (sure)
- Canon: K9/K16

### en_grammar:present_with_past_time — 2 real of 2 read · 122 chars
Present tense with a past time phrase ("I learn English last week").
- `S0067L01B04` ಕಳೆದ ವಾರ ನಿಮಗೆ ನಿಲ್ಲಿಸಬೇಕು? | **do you want to stop last week?** → reword to the past, or drop the time phrase (sure)
- `S0081L01B03` ಕಳೆದ ವಾರ ನಿಮಗೆ ಶುರು ಮಾಡಬೇಕು? | **do you want to start last week?** → reword to the past, or drop the time phrase (sure)
- Canon: K9/K16

### en_grammar:doubled_word — 3 real of 3 read · 180 chars
Doubled word or a garbage tail ("looking forward to to learn").
- `S0049L02B03` ಇವತ್ತು ಬೆಳಿಗ್ಗೆ ಅದು ಹೀಗೆ | **it's like this this morning** → "looking forward to learning/practising/meeting"; drop garbage tails (sure)
- `S0049L02U04` ಇವತ್ತು ಸಂಜೆ ಅದು ಹೀಗೆ | **it's like this this evening** → "looking forward to learning/practising/meeting"; drop garbage tails (sure)
- `S0636L01B02` ಅದು ಜೇನ್‌ಳ ಚೀಲ ಅಂತ ನನಗೆ ಅನಿಸುತ್ತೆ ಅಂತ | **that I think that that is Jane's bag** → "looking forward to learning/practising/meeting"; drop garbage tails (sure)
- Canon: K9/K16

### en_grammar:want_ing — 1 real of 1 read · 46 chars
"want" + -ing ("I don't want taking").
- `S0034L03B02` ಅವನಿಗೆ ಮಾತಾಡೋದು ಬೇಡ | **he doesn't want talking** → reword: want to + verb (e.g. "I don't want to take too much time") (sure)
- Canon: K9/K16

### en_grammar:today_tail_past — 4 real of 4 read · 0 chars
"today" bolted onto a bare past verb ("I thought today").
- `S0361L02B02` ಇವತ್ತು ಸುಮ್ಮನಿದ್ದ? | **was quiet today?** → delete the build (the LEGO has enough rows) or give the verb its object (sure)
- `S0374L02B02` ಇವತ್ತು ಅಂತ ನನಗೆ ಅನಿಸ್ತು | **I thought today** → delete the build (the LEGO has enough rows) or give the verb its object (sure)
- `S0375L02B02` ಇಲ್ಲ ಅವಳು ಇವತ್ತು ಏನು ಮಾಡ್ತಿದ್ದಳು | **no what she was doing today** → delete the build (the LEGO has enough rows) or give the verb its object (sure)
- `S0444L03B03` ಇವತ್ತು ಅವರು ಅಂದುಕೊಂಡ್ರು | **they thought today** → delete the build (the LEGO has enough rows) or give the verb its object (sure)
- Canon: K9/K16

### untaught_target — 62 real of 62 read · 904 chars
A row uses an English word (or word form) before the course teaches it.
- `S0026L01U05` ನಾವು ಬೇಗ ಮುಗಿಸಬೇಕಾಗಿರುವುದರಿಂದ ನಾನು ಹೋಗಲು ಬಹುತೇಕ ಸಿದ್ಧವಾಗಿದ್ದೇನೆ | **I'm nearly ready to go because we should finish soon** → reword with taught words, or delete (never add a LEGO) (sure)
- `S0052L03U05` ಅವನು ತನ್ನ ಸ್ನೇಹಿತನಿಗೆ ಒಂದು ಪತ್ರ ಕೊಡಬೇಕು | **he wants to give a letter to his friend** → reword with taught words, or delete (never add a LEGO) (sure)
- `S0053L03U03` ಅವನು ತನ್ನ ಸ್ನೇಹಿತನಿಗೆ ಅವನ ಪತ್ರವನ್ನ ಕೊಡಬೇಕಿತ್ತು | **he wanted to give his letter to his friend** → reword with taught words, or delete (never add a LEGO) (sure)
- `S0071L04U02` ನಮಗೆ ಅವನಿಗೆ ಸಹಾಯ ಮಾಡೋದು ಬೇಕಿರಲಿಲ್ಲ | **we didn't want to help him** → reword with taught words, or delete (never add a LEGO) (sure)
- Canon: K8, K14, K15, P27

### lego_over_8_syllables — 4 real of 4 read · 0 chars
New LEGO over the 8-syllable cap (counted by hand rule, not the tool's estimate).
- `S0100L01` ಇದೇ ತರಹದ್ದನ್ನ ಮಾಡೋ ಬಗ್ಗೆ | **about doing something similar** → 9 syllables (hand rule count). Shorter cut: about doing | something similar (likely)
- `S0159L01` ನಾನು ಹೇಳೋಕೆ ಪ್ರಯತ್ನಿಸ್ತಿರೋದು ಅದಲ್ಲ | **that isn't what I'm trying to say** → 9 syllables (hand rule count). Shorter cut: that isn't | what I'm trying to say (likely)
- `S0260L01` ನನಗೆ ಸ್ವಲ್ಪವೂ ಗೊತ್ತಿಲ್ಲ | **I don't have the faintest idea** → 9 syllables (hand rule count). Shorter cut: I don't have | the faintest idea (likely)
- `S0490L03` ಮತ್ತೆಂದೂ ಯಾರನ್ನೂ ನಂಬಲ್ಲ | **never trust anyone ever again** → 9 syllables (hand rule count). Shorter cut: never trust anyone | ever again (likely)
- Canon: L3

### qmark_mismatch — 16 real of 16 read · 555 chars
Question mark on one side only (nearly always: the known text is a question but has no "?", so its clip may be read flat).
- `S0331L02U06` ನೀವು ಯಾಕೆ ಎಲ್ಲಾ ಉತ್ತರಗಳನ್ನ ಹುಡುಕ್ತಿದ್ದೀರಿ | **why are you looking for all the answers?** → add "?" to the known text; re-record the known clip (sure)
- `S0334L01U07` ನೀವು ಯಾಕೆ ಬೆಕ್ಕಿನ ಮರಿಯನ್ನ ಹುಡುಕ್ತಿದ್ದೀರಿ | **why are you looking for the kitten?** → add "?" to the known text; re-record the known clip (sure)
- `S0379L04U06` ಆಫ್ರಿಕಾಗೆ ನೀವು ಹೋಗೋ ಮೊದಲು ನನಗೆ ಹೇಳ್ತೀರಾ | **can you tell me before you go to Africa?** → add "?" to the known text; re-record the known clip (sure)
- `S0559L01U03` ನಿಮಗೆ ಹೋಗೋ ದಾರಿ ಸಿಕ್ತಾ | **have you found the path?** → add "?" to the known text; re-record the known clip (sure)
- Canon: A7, A9

### dup_rows — 182 real of 182 read · 0 chars
The same row twice in one basket (nearly always U01 repeats B01).
- `S0004L02U02` ಹೇಗೆ ಏನಾದರೂ ಹೇಳೋದು | **how to say something** → delete this row; it repeats S0004L02B02 in the same basket (sure)
- `S0073L01U01` ತುಂಬಾ ಧನ್ಯವಾದಗಳು | **thank you very much** → delete this row; it repeats S0073L01B01 in the same basket (sure)
- `S0073L02U01` ನಾನು ಇನ್ನೂ ಕಲಿಯೋದು ಇದೆ | **I've got more to learn** → delete this row; it repeats S0073L02B01 in the same basket (sure)
- `S0075L01U01` ನಿಮಗೆ ಇನ್ನೂ ಕಲಿಯೋದು ಇದೆಯಾ? | **have you got more to learn?** → delete this row; it repeats S0075L01B01 in the same basket (sure)
- Canon: spa #189/#212 precedent

### seed_not_played — 243 real of 243 read · 0 chars
The seed's English sentence is never said in any played row.
- `S0006` ನಾನು ಒಂದು ಪದವನ್ನು ನೆನಪಿಸಿಕೊಳ್ಳೋಕೆ ಪ್ರಯತ್ನಿಸ್ತಿದ್ದೇನೆ. | **I'm trying to remember a word.** → add the seed sentence as a USE row under its last new LEGO, reusing the seed clips (the P26 tool) (sure)
- `S0008` ನನ್ನ ಅರ್ಥ ಏನು ಅಂತ ವಿವರಿಸೋಕೆ ಪ್ರಯತ್ನಿಸ್ತೀನಿ. | **I'm going to try to explain what I mean.** → add the seed sentence as a USE row under its last new LEGO, reusing the seed clips (the P26 tool) (sure)
- `S0009` ನಾನು ಈಗ ಸ್ವಲ್ಪ ಇಂಗ್ಲಿಷ್ ಮಾತಾಡ್ತೀನಿ. | **I speak a little English now.** → add the seed sentence as a USE row under its last new LEGO, reusing the seed clips (the P26 tool) (sure)
- `S0010` ಇಡೀ ವಾಕ್ಯ ನನಗೆ ನೆನಪಿರುತ್ತೋ ಇಲ್ಲವೋ ಗೊತ್ತಿಲ್ಲ. | **I'm not sure if I can remember the whole sentence.** → add the seed sentence as a USE row under its last new LEGO, reusing the seed clips (the P26 tool) (sure)
- Canon: P26


## eng_for_tam

### lego_not_in_seed_target — 16 real of 18 read · 8,914 chars
The LEGO's English is not what the seed sentence says (it was glossed from the known side instead).
- `S0091L03` கடினம் நினைக்க வேகமாக | **difficult thinking quickly** → Re-cut so the LEGO English is the seed's own words: seed says "It's difficult to think quickly enough to answer in time."; LEGO adds/changes ['thinking']. Known side re-cut to match (known text not ju (likely)
- `S0112L02` எதிர்பார்க்கவில்லை | **not expecting** → Re-cut so the LEGO English is the seed's own words: seed says "That was very interesting, and I wasn't expecting it."; LEGO adds/changes ['not']. Known side re-cut to match (known text not judged here (likely)
- `S0112L03` மிகவும் சுவாரஸ்யமானது எதிர்பார்க்கவில்லை | **wasn't expecting it to be very interesting** → Re-cut so the LEGO English is the seed's own words: seed says "That was very interesting, and I wasn't expecting it."; LEGO adds/changes ['to', 'be']. Known side re-cut to match (known text not judged (likely)
- `S0126L03` மாற்றுகிறது வடிவம் | **changes shape** → Re-cut so the LEGO English is the seed's own words: seed says "This work is changing the shape of my brain."; LEGO adds/changes ['changes']. Known side re-cut to match (known text not judged here). (likely)
- Not a defect (2): `S0661L01` you all; `S0668L01` you all — NOT A DEFECT (contraction / K54 "to" / K28 pronoun)
- Canon: L26 (K54/K28 exceptions)

### en_adds_word_known_lacks — 74 real of 74 read · 4,278 chars
The English says "now / today / again / here" and the known prompt does not.
- `S0012L02B01` யூகிக்க முயற்சிக்கிறேன் | **I'm trying to guess now** → drop "now" from the English (or add the course's own word to the known side) (likely)
- `S0012L03B02` என்ன நடக்கும் என்று விளக்கப் போகிறேன் | **I'm going to explain what's going to happen now** → drop "now" from the English (or add the course's own word to the known side) (likely)
- `S0012L03B03` என்ன நடக்கும் என்று சொல்ல முயற்சிக்கிறேன் | **I'm trying to say what's going to happen now** → drop "now" from the English (or add the course's own word to the known side) (likely)
- `S0012L04B03` பேச விரும்புவதில்லை | **I wouldn't like to speak now** → drop "now" from the English (or add the course's own word to the known side) (likely)
- Canon: K2 (prompt must ask for exactly this answer)

### phrase_missing_lego — 81 real of 81 read · 2,960 chars
A practice row does not contain its LEGO (negated, turned into a question, person swapped, or the LEGO itself is wrong).
- `S0025L04B02` இப்போது போக வேண்டும் | **I need to go now** → row changes the LEGO's verb form or words (negation, question, person, tense): reword back to the LEGO's exact form, or move under the LEGO it really practises (likely)
- `S0098L01U01` நான் இப்போது போக வேண்டும் | **I have to go now** → row changes the LEGO's verb form or words (negation, question, person, tense): reword back to the LEGO's exact form, or move under the LEGO it really practises (likely)
- `S0112L03B03` அது மிகவும் சுவாரஸ்யமானது என்று நான் எதிர்பார்க்கவில்லை | **I wasn't expecting that to be very interesting** → re-cut the LEGO to what its rows and seed say (see LEGO family) (likely)
- `S0112L03U02` இது மிகவும் சுவாரஸ்யமானது நான் இதை எதிர்பார்க்கவில்லை | **this is very interesting, I wasn't expecting it** → re-cut the LEGO to what its rows and seed say (see LEGO family) (likely)
- Canon: P17, K50

### en_grammar:missing_apostrophe — 6 real of 6 read · 486 chars
Apostrophes missing in a LEGO ("thats … im").
- `S0142L05` இது மிகவும் கருணையான நீங்கள் மற்றும் நான் | **thats very kind of you and im** → restore apostrophes: "that's very kind of you and I'm grateful"; LEGO should end at a whole phrase (sure)
- `S0142L05B01` இது மிகவும் கருணையான நீங்கள் மற்றும் நான் | **thats very kind of you and im** → restore apostrophes: "that's very kind of you and I'm grateful"; LEGO should end at a whole phrase (sure)
- `S0142L05U01` இது மிகவும் கருணையான நீங்கள் மற்றும் நான் நன்றியுள்ளவன் | **thats very kind of you and im grateful** → restore apostrophes: "that's very kind of you and I'm grateful"; LEGO should end at a whole phrase (sure)
- `S0142L05U02` நான் நினை இது மிகவும் கருணையான நீங்கள் மற்றும் நான் நன்றியுள்ளவன் | **I think thats very kind of you and im grateful** → restore apostrophes: "that's very kind of you and I'm grateful"; LEGO should end at a whole phrase (sure)
- Canon: K9/K16

### en_grammar:third_person_s — 3 real of 3 read · 124 chars
Missing -s after he/she ("he speak tomorrow").
- `S0016L01B02` அவர் நாளை பேச | **he speak tomorrow** → "he speaks tomorrow"-type fix, or delete the build (sure)
- `S0017L01B03` அவள் இன்று பேச | **she speak today** → "he speaks tomorrow"-type fix, or delete the build (sure)
- `S0128L03U02` அவன் போல் யாரோ நான் முன்பு அறிந்தேன் | **he like someone I used to know** → "he speaks tomorrow"-type fix, or delete the build (sure)
- Canon: K9/K16

### en_grammar:present_with_past_time — 11 real of 11 read · 574 chars
Present tense with a past time phrase ("I learn English last week").
- `S0037L02U01` நான் கடந்த மாதம் ஆங்கிலம் கற்கினேன் | **I learn English last month** → reword to the past, or drop the time phrase (sure)
- `S0037L02U03` நான் கடந்த மாதம் கவனமாக கற்கினேன் | **I learn carefully last month** → reword to the past, or drop the time phrase (sure)
- `S0037L02U05` நான் கடந்த மாதம் பேசினேன் | **I speak last month** → reword to the past, or drop the time phrase (sure)
- `S0037L03U05` நான் கடந்த மாதம் அதைப் பற்றி கற்கினேன் | **I learn about it last month** → reword to the past, or drop the time phrase (sure)
- Canon: K9/K16

### en_grammar:perfect_with_past_time — 2 real of 2 read · 136 chars
Present perfect with a finished time ("I've done it last week").
- `S0038L03B02` கடந்த மாதம் கற்றுவருகிறேன் | **I've been learning last month** → past simple ("I did it last week", "I was learning last month") (sure)
- `S0038L03U06` நான் கடந்த மாதம் கவனமாக கற்றுவருகிறேன் | **I've been learning carefully last month** → past simple ("I did it last week", "I was learning last month") (sure)
- Canon: K9/K16

### en_grammar:a_vowel — 2 real of 2 read · 128 chars
"a" before a vowel ("a interesting").
- `S0051L04U02` நான் சுவாரஸ்யமான விஷயம் ரசிக்கிறேன் | **I enjoy a interesting thing** → "an" (sure)
- `S0052L01U05` நான் கடந்த வாரம் சுவாரஸ்யமான விஷயம் ரசித்தேன் | **I enjoy a interesting thing last week** → "an" (sure)
- Canon: K9/K16

### en_grammar:today_tail_past — 5 real of 5 read · 0 chars
"today" bolted onto a bare past verb ("I thought today").
- `S0124L01B03` நான் நினைத்தேன் இன்று | **I thought today** → delete the build (the LEGO has enough rows) or give the verb its object (sure)
- `S0124L01U03` நீங்கள் நினைத்தீர்களா | **you thought today?** → delete the build (the LEGO has enough rows) or give the verb its object (sure)
- `S0444L01B02` இன்று அவர்கள் நினைத்தார்கள் | **they thought today** → delete the build (the LEGO has enough rows) or give the verb its object (sure)
- `S0449L02B03` இன்று இருந்ததாக | **they were today** → delete the build (the LEGO has enough rows) or give the verb its object (sure)
- Canon: K9/K16

### untaught_target — 92 real of 92 read · 3,744 chars
A row uses an English word (or word form) before the course teaches it.
- `S0002L01B02` நான் ஆங்கிலம் கற்க விரும்புகிறேன் | **I'd like to learn English** → reword with taught words, or delete (never add a LEGO) (sure)
- `S0006L02U02` நான் ஏதாவது நினைவில் கொள்ள விரும்புகிறேன் | **I'd like to remember something** → reword with taught words, or delete (never add a LEGO) (sure)
- `S0007L01B02` என்னால் முடிந்த அளவு கடினமாக முயற்சிக்கிறேன் | **I try as hard as I can** → reword with taught words, or delete (never add a LEGO) (sure)
- `S0007L02B01` இன்று முயற்சிக்க விரும்புகிறேன் | **I want to try today** → reword with taught words, or delete (never add a LEGO) (sure)
- Canon: K8, K14, K15, P27

### dup_debut — 1 real of 1 read · 0 chars
Same LEGO taught as new twice.
- `S0289L02` மதியம் | **afternoon** → mark not-new (equal to S0069L01 on both sides); re-home its rows under new LEGOs (sure)
- Canon: L17, P25

### notnew_untaught — 3 real of 3 read · 0 chars
LEGO marked not-new with no earlier LEGO equal on both sides.
- `S0207L01` செய்தீர் | **you've** → no earlier equal LEGO: make it new (blue at 257 is simply new) or re-cut (sure)
- `S0228L02` ஆரம்பித்தான் பயிற்சி பேச | **started to practise speaking** → no earlier equal LEGO: make it new (blue at 257 is simply new) or re-cut (sure)
- `S0257L01` நீலம் | **blue** → no earlier equal LEGO: make it new (blue at 257 is simply new) or re-cut (sure)
- Canon: L31

### lego_over_8_syllables — 13 real of 13 read · 0 chars
New LEGO over the 8-syllable cap (counted by hand rule, not the tool's estimate).
- `S0024L02` நினைவில் கொள்ள முடியாது | **not going to be able to remember** → 11 syllables (hand rule count). Shorter cut: not going to be | able to remember (likely)
- `S0086L03` சாத்தியமில்லை துரதிர்ஷ்டவசமாக | **wasn't possible, unfortunately** → 10 syllables (hand rule count). Shorter cut: wasn't possible | unfortunately (likely)
- `S0112L03` மிகவும் சுவாரஸ்யமானது எதிர்பார்க்கவில்லை | **wasn't expecting it to be very interesting** → 13 syllables (hand rule count). Shorter cut: I wasn't expecting it (the seed's words) (likely)
- `S0122L04` உற்சாகமாக எப்படி நடக்கிறது | **excited about how it's going** → 9 syllables (hand rule count). Shorter cut: excited about | how it's going (likely)
- Canon: L3

### qmark_mismatch — 37 real of 37 read · 1,384 chars
Question mark on one side only (nearly always: the known text is a question but has no "?", so its clip may be read flat).
- `S0012L03B04` நாளை என்ன நடக்கும் என்று யூகிக்க விரும்புவதில்லை | **what's going to happen tomorrow?** → add "?" to the known text; re-record the known clip (sure)
- `S0014L02B01` நீங்களா | **do you?** → add "?" to the known text; re-record the known clip (sure)
- `S0014L02B02` நீங்களா ஆங்கிலம் பேசுகிறீர்கள் | **do you speak English?** → add "?" to the known text; re-record the known clip (sure)
- `S0015L01U05` நீங்கள் என்னுடன் ஆங்கிலம் பயிற்சி செய்கிறீர்களா | **do you practise English with me?** → add "?" to the known text; re-record the known clip (sure)
- Canon: A7, A9

### dup_rows — 38 real of 38 read · 0 chars
The same row twice in one basket (nearly always U01 repeats B01).
- `S0027L04U06` நான் இன்று அதிக நேரம் எடுக்க விரும்பவில்லை | **I don't like taking too much time today** → delete this row; it repeats S0027L04U05 in the same basket (sure)
- `S0028L01U05` ஆங்கிலம் பேசுவது பயனுள்ளது | **it's useful speaking English** → delete this row; it repeats S0028L01U01 in the same basket (sure)
- `S0061L02U02` நீங்கள் மெதுவாக பேச வேண்டும் | **you need to speak slowly** → delete this row; it repeats S0061L02B01 in the same basket (sure)
- `S0062L02U02` நீங்கள் அதே நேரத்தில் உதவ வேண்டும் | **you need to help at the same time** → delete this row; it repeats S0062L02B03 in the same basket (sure)
- Canon: spa #189/#212 precedent

### seed_not_played — 149 real of 149 read · 0 chars
The seed's English sentence is never said in any played row.
- `S0001` நான் இப்போது உங்களுடன் ஆங்கிலம் பேச விரும்புகிறேன். | **I want to speak English with you now.** → add the seed sentence as a USE row under its last new LEGO, reusing the seed clips (the P26 tool) (sure)
- `S0003` எவ்வளவு அடிக்கடி முடியுமோ அவ்வளவு அடிக்கடி பேசுவது எப்படி. | **how to speak as often as possible.** → add the seed sentence as a USE row under its last new LEGO, reusing the seed clips (the P26 tool) (sure)
- `S0007` நான் இன்று என்னால் முடிந்த அளவு கடினமாக முயற்சிக்க விரும்புகிறேன். | **I want to try as hard as I can today.** → add the seed sentence as a USE row under its last new LEGO, reusing the seed clips (the P26 tool) (sure)
- `S0008` நான் என்ன சொல்ல வேண்டும் என்று விளக்கப் போகிறேன். | **I'm going to try to explain what I mean.** → add the seed sentence as a USE row under its last new LEGO, reusing the seed clips (the P26 tool) (sure)
- Canon: P26


## eng_for_tel

### lego_not_in_seed_target — 54 real of 55 read · 31,004 chars
The LEGO's English is not what the seed sentence says (it was glossed from the known side instead).
- `S0009L02` మాట్లాడతాను | **I'll speak** → Re-cut so the LEGO English is the seed's own words: seed says "I speak a little English now."; LEGO adds/changes ["i'll"]. Known side re-cut to match (known text not judged here). (likely)
- `S0023L02` ఇంకా ఎక్కువ | **a lot more** → Re-cut so the LEGO English is the seed's own words: seed says "I'm going to start talking more soon."; LEGO adds/changes ['a', 'lot']. Known side re-cut to match (known text not judged here). (likely)
- `S0024L02` గుర్తుంచుకోలేకపోతాను | **I can't remember** → Re-cut so the LEGO English is the seed's own words: seed says "I'm not going to be able to remember easily."; LEGO adds/changes ['i', "can't"]. Known side re-cut to match (known text not judged here). (likely)
- `S0028L01` మొదలుపెట్టడం | **to start speaking** → Re-cut so the LEGO English is the seed's own words: seed says "It's useful to start talking as soon as you can."; LEGO adds/changes ['speaking']. Known side re-cut to match (known text not judged here (likely)
- Not a defect (1): `S0064L02` it's fun — NOT A DEFECT (contraction / K54 "to" / K28 pronoun)
- Canon: L26 (K54/K28 exceptions)

### phrase_missing_lego — 28 real of 31 read · 1,566 chars
A practice row does not contain its LEGO (negated, turned into a question, person swapped, or the LEGO itself is wrong).
- `S0386L01U02` నేను ఆమెతో ఏకీభవించలేదు | **I didn't agree with her** → row changes the LEGO's verb form or words (negation, question, person, tense): reword back to the LEGO's exact form, or move under the LEGO it really practises (likely)
- `S0386L01U03` నువ్వు ఆమెతో ఏకీభవిస్తావా? | **do you agree with her?** → row changes the LEGO's verb form or words (negation, question, person, tense): reword back to the LEGO's exact form, or move under the LEGO it really practises (likely)
- `S0397L01U02` మనం సిద్ధం కావాల్సిన అవసరం ఉంది | **we need to get ready** → row changes the LEGO's verb form or words (negation, question, person, tense): reword back to the LEGO's exact form, or move under the LEGO it really practises (likely)
- `S0398L02U02` నేను ఇంకా ఎక్కువ ఓపికగా ఉండాలనుకుంటున్నాను | **I want to become more patient** → row changes the LEGO's verb form or words (negation, question, person, tense): reword back to the LEGO's exact form, or move under the LEGO it really practises (likely)
- Not a defect (3): `S0068L01U04` what's going to happen?; `S0611L02U03` let's look somewhere else; `S0623L01U03` do you want another cup of coffee? — NOT A DEFECT (fused "what's" L28 / K54 "to" / another-for-a article ruling)
- Canon: P17 exceptions

### zut_lego — 2 real of 2 read · 70 chars
One known prompt, two English answers, with a LEGO on one side.
- `S0094L01` ఇదొక్కటే మార్గం | **is the only way** → LEGO English "this is the only way" — LEGO "is the only way" has no subject; its own U02 says "this is the only way" on the same known (likely)
- `S0124L02` అది మంచి ఆలోచన | **that was a good idea** → known must mark past for S0124L02 (Telugu side, not judged) or the row unifies — LEGO "that was a good idea" vs S0123L02U01 "that's a good idea" on one known (likely)
- Canon: K2, K22, L34

### en_grammar:sentence_fragment_d — 4 real of 4 read · 130 chars
A LEGO that starts with a stray "'d".
- `S0600L02` నాకు చెప్పి ఉంటే | **'d told me** → LEGO "if you'd told me" (sure)
- `S0600L02B01` నాకు చెప్పి ఉంటే | **'d told me** → LEGO "if you'd told me" (sure)
- `S0600L02B02` నువ్వు ఎంత అలసిపోయావో నాకు చెప్పి ఉంటే | **'d told me how tired you were** → LEGO "if you'd told me" (sure)
- `S0600L02B03` ఇవాళ నాకు చెప్పి ఉంటే | **'d told me today** → LEGO "if you'd told me" (sure)
- Canon: K9/K16

### en_grammar:today_tail_past — 1 real of 1 read · 0 chars
"today" bolted onto a bare past verb ("I thought today").
- `S0617L01B02` నువ్వు ఇవాళ అనుకున్నావు | **you thought today** → delete the build (the LEGO has enough rows) or give the verb its object (sure)
- Canon: K9/K16

### untaught_target — 25 real of 25 read · 482 chars
A row uses an English word (or word form) before the course teaches it.
- `S0051L01U04` నేను ఇంగ్లీష్ మాట్లాడే వ్యక్తులను కలవడం ఆనందిస్తాను | **I enjoy meeting people who speak English** → reword with taught words, or delete (never add a LEGO) (likely)
- `S0144L02U04` నేను అనుకున్నదానికంటే ముందే వెళ్ళిపోయాను | **I left earlier than I wanted to** → reword with taught words, or delete (never add a LEGO) (likely)
- `S0144L02U05` మేము అనుకున్నదానికంటే ముందే ముగించాం | **we finished earlier than I wanted to** → reword with taught words, or delete (never add a LEGO) (likely)
- `S0147L02U01` నేను కంగారుగా ఉండటం చూసినప్పుడు ఆమె నాకు సహాయం చేసింది | **she helped me when she saw that I was nervous** → reword with taught words, or delete (never add a LEGO) (likely)
- Canon: K8, K14, K15, P27

### gapped_lego — 5 real of 5 read · 28 chars
LEGO with a "…" gap in it.
- `S0466L03` నన్ను ... నివ్వు | **let me** → known prompt carries a "…" gap: make the LEGO the whole chunk the seed says (frame + middle), as L32 does on the target side (best guess)
- `S0469L01` దానర్థం ... కాదు | **that doesn't mean** → known prompt carries a "…" gap: make the LEGO the whole chunk the seed says (frame + middle), as L32 does on the target side (best guess)
- `S0469L03` మనం ... లేము | **we can't** → known prompt carries a "…" gap: make the LEGO the whole chunk the seed says (frame + middle), as L32 does on the target side (best guess)
- `S0473L01` నాకు ... వద్దు | **I don't want** → known prompt carries a "…" gap: make the LEGO the whole chunk the seed says (frame + middle), as L32 does on the target side (best guess)
- Canon: L32

### lego_over_8_syllables — 11 real of 11 read · 0 chars
New LEGO over the 8-syllable cap (counted by hand rule, not the tool's estimate).
- `S0026L03` వెళ్ళడానికి సిద్ధంగా ఉన్నట్టు అనిపించడం | **feeling as if I'm ready to go** → 9 syllables (hand rule count). Shorter cut: feeling as if | I'm ready to go (likely)
- `S0036L01` కథకు అడ్డుపడాలని అనుకోవడం లేదు | **don't want to interrupt the story** → 9 syllables (hand rule count). Shorter cut: don't want to interrupt | the story (likely)
- `S0125L02` నీ ఆలోచన చాలా బాగుండింది | **that your idea was very good** → 9 syllables (hand rule count). Shorter cut: that your idea | was very good (likely)
- `S0131L01` మరీ ఎక్కువ ఆలోచనలు తిరుగుతున్నాయి | **too many ideas are going around** → 11 syllables (hand rule count). Shorter cut: too many ideas | are going around (likely)
- Canon: L3

### qmark_mismatch — 48 real of 48 read · 2,444 chars
Question mark on one side only (nearly always: the known text is a question but has no "?", so its clip may be read flat).
- `S0021L01B02` ఎందుకు నేర్చుకోవాలని కోరుకుంటున్నావు? | **why you want to learn** → target is not a question but known has "?": reword English as the question or drop the "?" (sure)
- `S0316L02U11` సోమవారం నువ్వు ఏం చేయబోతున్నావు | **What are you going to do on Monday?** → add "?" to the known text; re-record the known clip (sure)
- `S0316L02U12` సోమవారం నువ్వు ఎక్కడ కలవాలనుకుంటున్నావు | **Where do you want to meet on Monday?** → add "?" to the known text; re-record the known clip (sure)
- `S0316L04U01` ఆమె సోమవారం తన సోదరుడిని తీసుకురాగలదని నువ్వు అనుకుంటున్నావా | **do you think that she could bring her brother on Monday?** → add "?" to the known text; re-record the known clip (sure)
- Canon: A7, A9

### empty_audio — 428 real of 428 read · 18,304 chars
Played row with an empty audio slot.
- `S0211L01B04` ఏం జరగబోతోందో వాళ్ళు మాకు చెప్పారు | **they told us what was going to happen** → fill the empty slot(s): ka (library first, then render) (sure)
- `S0211L01U06` మనం సమస్యను చర్చించాల్సిన అవసరం ఉందని వాళ్ళు మాకు చెప్పారు | **they told us that we need to discuss the problem** → fill the empty slot(s): ka (library first, then render) (sure)
- `S0211L02U06` తాము వివరించాలని అనుకోలేదని నాకు తెలిసుంటే నేను దాన్ని చెప్పేవాడిని కాదు | **I wouldn't have said it if I had known that they didn't want to explain** → fill the empty slot(s): ka (library first, then render) (sure)
- `S0211L02U07` తాము వివరించాలని అనుకోలేదని నువ్వు విన్నావా | **have you heard that they didn't want to explain** → fill the empty slot(s): ka (library first, then render) (sure)
- Canon: A16

### dup_rows — 179 real of 179 read · 0 chars
The same row twice in one basket (nearly always U01 repeats B01).
- `S0074L02U01` నాకు సహాయం చేసినందుకు చాలా ధన్యవాదాలు | **thank you very much for helping me** → delete this row; it repeats S0074L02B03 in the same basket (sure)
- `S0075L01U01` నీకు ఇంకా నేర్చుకోవాల్సింది ఉందా? | **have you got more to learn?** → delete this row; it repeats S0075L01B01 in the same basket (sure)
- `S0127L03U01` అందుకు కాదు | **that isn't why** → delete this row; it repeats S0127L03B01 in the same basket (sure)
- `S0128L02U01` నువ్వు ఒకరిలా ఉన్నావు | **you're like someone** → delete this row; it repeats S0128L02B02 in the same basket (sure)
- Canon: spa #189/#212 precedent

### seed_not_played — 107 real of 107 read · 0 chars
The seed's English sentence is never said in any played row.
- `S0003` వీలైనంత తరచుగా ఎలా మాట్లాడాలో. | **how to speak as often as possible.** → add the seed sentence as a USE row under its last new LEGO, reusing the seed clips (the P26 tool) (sure)
- `S0009` నేను ఇప్పుడు కొంచెం ఇంగ్లీష్ మాట్లాడతాను. | **I speak a little English now.** → add the seed sentence as a USE row under its last new LEGO, reusing the seed clips (the P26 tool) (sure)
- `S0011` నువ్వు ముగించాక మాట్లాడగలగాలని ఉంది. | **I'd like to be able to speak after you finish.** → add the seed sentence as a USE row under its last new LEGO, reusing the seed clips (the P26 tool) (sure)
- `S0015` ఇంకా రేపు నువ్వు నాతో ఇంగ్లీష్ మాట్లాడాలని నేను కోరుకుంటున్నాను. | **And I want you to speak English with me tomorrow.** → add the seed sentence as a USE row under its last new LEGO, reusing the seed clips (the P26 tool) (sure)
- Canon: P26


## eng_for_sin

### lego_not_in_seed_target — 160 real of 167 read · 74,818 chars
The LEGO's English is not what the seed sentence says (it was glossed from the known side instead).
- `S0112L01` හිතුවේ නෑ | **not expecting** → Re-cut so the LEGO English is the seed's own words: seed says "That was very interesting, and I wasn't expecting it."; LEGO adds/changes ['not']. Known side re-cut to match (known text not judged here (likely)
- `S0117L02` කතා කළාට | **although I talked** → Re-cut so the LEGO English is the seed's own words: seed says "I'm definitely doing better than I was last time we talked to each other."; LEGO adds/changes ['although']. Known side re-cut to match (k (likely)
- `S0121L02` පාවිච්චි කරන්නේ | **use the car** → Re-cut so the LEGO English is the seed's own words: seed says "It's unusual that you don't like to use your car."; LEGO adds/changes ['the']. Known side re-cut to match (known text not judged here). (likely)
- `S0127L01` මස්තිෂ්කය | **brain** → Re-cut so the LEGO English is the seed's own words: seed says "That isn't why I wanted to see you."; LEGO adds/changes ['brain']. Known side re-cut to match (known text not judged here). (likely)
- Not a defect (7): `S0359L01` to turn left; `S0465L03` I'll ask; `S0569L02` how much you're willing to pay; `S0607L02` I would have done things; `S0635L01` that's jane's bag; `S0637L01` where's her bag … — NOT A DEFECT (contraction / K54 "to" / K28 pronoun)
- Canon: L26 (K54/K28 exceptions)

### sin_nonsense_basket — 13 real of 13 read · 0 chars
Seed 111's "brain" basket: whole rows of nonsense English ("I hope for our brain").
- `S0111L01B02` මම ඒ ගැන ආශා | **I hope for our brain** → delete; rebuild the S0111L01 "brain" basket from taught words (e.g. "it changes our brain", "learning changes our brain") — the known side has no word for brain in these rows (sure)
- `S0111L01B03` මම ඒ ගැන ලිහිල් වෙනවා | **I relax with our brain** → delete; rebuild the S0111L01 "brain" basket from taught words (e.g. "it changes our brain", "learning changes our brain") — the known side has no word for brain in these rows (sure)
- `S0111L01U01` මම ඒ ගැන ලෑස්ති | **I'm ready for our brain** → delete; rebuild the S0111L01 "brain" basket from taught words (e.g. "it changes our brain", "learning changes our brain") — the known side has no word for brain in these rows (sure)
- `S0111L01U02` ළමා ඒ ගැන ඒ ගැන ආශා කළේ නෑ | **I didn't hope for our brain** → delete; rebuild the S0111L01 "brain" basket from taught words (e.g. "it changes our brain", "learning changes our brain") — the known side has no word for brain in these rows (sure)
- Canon: K9, P17

### sin_template_builds — 147 real of 147 read · 0 chars
Build rows made by a template: "liked / want / said" glued in front of a noun ("liked a hug", "said the film").
- `S0353L01B02` ක්‍රීඩාංගනේ ලෙයිකයි | **liked the field** → delete (nonsense build "liked/want/said + noun"; basket keeps its other rows) (sure)
- `S0358L01B03` ඉහළ ළඟ ලෙයිකයි | **liked the top** → delete (nonsense build "liked/want/said + noun"; basket keeps its other rows) (sure)
- `S0377L02B02` ලෝකේ ලෙයිකයි | **liked the world** → delete (nonsense build "liked/want/said + noun"; basket keeps its other rows) (sure)
- `S0377L02B03` ලෝකේ ඕනේ | **want the world** → delete (nonsense build "liked/want/said + noun"; basket keeps its other rows) (sure)
- Canon: K9, P14 does not cover it (fails on grammar)

### en_grammar:sin_filler_near — 38 real of 38 read · 0 chars
"near the field" / "near the top" tacked onto the end of unrelated sentences.
- `S0371L03U03` මම ගිය ඉහළ ළඟ | **I went near the top** → delete (0 chars) (sure)
- `S0377L03U04` ඔයා කොහෙවත් ගියාද ක්‍රීඩාංගනේ? | **did you go anywhere near the field?** → delete (0 chars) (sure)
- `S0377L03U05` ඔයා කොහෙවත් ගියාද ඉහළ ළඟ? | **did you go anywhere near the top?** → delete (0 chars) (sure)
- `S0383L02U05` ඔහු ඉහළ ළඟ දාන්නයි ඕනේ කළා | **he wanted to put it near the top** → delete (0 chars) (sure)
- Canon: K9/K16

### phrase_missing_lego — 37 real of 38 read · 216 chars
A practice row does not contain its LEGO (negated, turned into a question, person swapped, or the LEGO itself is wrong).
- `S0111L03B02` ඒ ගැන වෙනස් වෙනවා | **that changes** → row changes the LEGO's verb form or words (negation, question, person, tense): reword back to the LEGO's exact form, or move under the LEGO it really practises (likely)
- `S0112L01B02` මම හිතුවේ නෑ | **I wasn't expecting it** → re-cut the LEGO to what its rows and seed say (see LEGO family) (likely)
- `S0112L01B03` මම ඒ ගැන හිතුවේ නෑ | **I wasn't expecting that** → re-cut the LEGO to what its rows and seed say (see LEGO family) (likely)
- `S0112L01U01` මම ඒ ගැන හිතුවේ නෑ කියලා මම හිතනවා | **I think I wasn't expecting that** → re-cut the LEGO to what its rows and seed say (see LEGO family) (likely)
- Not a defect (1): `S0541L01U04` can you try and breathe? — NOT A DEFECT (fused "what's" L28 / K54 "to" / another-for-a article ruling)
- Canon: P17, K50

### zut_lego — 1 real of 1 read · 20 chars
One known prompt, two English answers, with a LEGO on one side.
- `S0353L03` ඇයට ... ඕනේ | **she needed** → S0353L03 re-gloss to the seed's words; the seed English "She needed to run around the field" vs Sinhala "she wants" also disagree — ඇයට ඕනේ = "she wants" (S0017L01) and "she needed" (S0353L03) (likely)
- Canon: K2, K22, L34

### en_grammar:present_with_past_time — 2 real of 2 read · 114 chars
Present tense with a past time phrase ("I learn English last week").
- `S0042L03U04` මට වෙහෙස දැනෙනවා ඊයේ රෑ | **I feel tired last night** → reword to the past, or drop the time phrase (sure)
- `S0042L03U06` මට හොඳයි දැනෙනවා ඊයේ රෑ වඩා | **I feel okay better than last night** → reword to the past, or drop the time phrase (sure)
- Canon: K9/K16

### en_grammar:perfect_with_past_time — 1 real of 1 read · 44 chars
Present perfect with a finished time ("I've done it last week").
- `S0089L01U06` මම කළා ඒක පසුගිය සතියේ | **I've done it last week** → past simple ("I did it last week", "I was learning last month") (sure)
- Canon: K9/K16

### en_grammar:did_plus_past — 5 real of 5 read · 190 chars
Past form after "did" ("did you woke").
- `S0144L01U02` ඔයා අවදි වුණාද කලින් | **did you woke early?** → "did you wake / did you see" (sure)
- `S0144L01U04` ඔයා කවදා අවදි වුණේ? | **when did you woke?** → "did you wake / did you see" (sure)
- `S0144L01U07` ඔයා අවදි වුණාද ඊයේ රාත්‍රියේ? | **did you woke last night?** → "did you wake / did you see" (sure)
- `S0147L01U01` ඔයා ඒක දිටුවාද | **did you saw that?** → "did you wake / did you see" (sure)
- Canon: K9/K16

### en_grammar:a_vowel — 7 real of 7 read · 320 chars
"a" before a vowel ("a interesting").
- `S0123L01U04` ඒක පහසු අදහසක් | **that is a easier idea** → "an" (sure)
- `S0123L01U05` ඒක අසාමාන්‍ය අදහසක් | **that is a unusual idea** → "an" (sure)
- `S0123L01U07` අදහසක් ඕනේ | **I want a idea** → "an" (sure)
- `S0130L01U06` ඒක අසාමාන්‍ය පුදුම දෙයක් | **that is a unusual surprise** → "an" (sure)
- Canon: K9/K16

### en_grammar:doubled_word — 5 real of 5 read · 396 chars
Doubled word or a garbage tail ("looking forward to to learn").
- `S0029L01B03` ඉදිරිය ගැන ආශාවෙනවා ඉගෙනගන්න | **I'm looking forward to to learn** → "looking forward to learning/practising/meeting"; drop garbage tails (sure)
- `S0029L01B04` ඉදිරිය ගැන ආශාවෙනවා පුහුණු වෙන්න | **I'm looking forward to to practise** → "looking forward to learning/practising/meeting"; drop garbage tails (sure)
- `S0029L01U03` ඉදිරිය ගැන ආශාවෙනවා ඉංග්‍රීසි ඉගෙනගන්න | **I'm looking forward to to learn English** → "looking forward to learning/practising/meeting"; drop garbage tails (sure)
- `S0029L01U04` ඉදිරිය ගැන ආශාවෙනවා හෙට හම්බවෙන්න | **I'm looking forward to to meet tomorrow** → "looking forward to learning/practising/meeting"; drop garbage tails (sure)
- Canon: K9/K16

### en_grammar:want_ing — 4 real of 4 read · 214 chars
"want" + -ing ("I don't want taking").
- `S0005L01B03` කතා කිරීම ඕනේ | **want speaking** → reword: want to + verb (e.g. "I don't want to take too much time") (sure)
- `S0027L02U03` මට ගොඩක් වෙලාව ගන්න ඕනේ නෑ | **I don't want taking too much time** → reword: want to + verb (e.g. "I don't want to take too much time") (sure)
- `S0055L01U04` මට අවදි වෙන්න ඕනේ නෑ දැන් | **I don't want waking up now** → reword: want to + verb (e.g. "I don't want to take too much time") (sure)
- `S0098L03U05` ඔයාට ඕනේද ක්‍රීඩා කරන මොකක්හරි වෙනස් | **do you want playing something else?** → reword: want to + verb (e.g. "I don't want to take too much time") (sure)
- Canon: K9/K16

### en_grammar:modal_plus_to — 1 real of 1 read · 56 chars
"can you to help".
- `S0138L01U09` ඔයාට අපිට ඉගෙන්වන්න පුළුවන්ද | **can you to help us to learn?** → "can you help us to learn?" (sure)
- Canon: K9/K16

### en_grammar:today_tail_past — 3 real of 3 read · 0 chars
"today" bolted onto a bare past verb ("I thought today").
- `S0374L01B02` මම හිතුවා අද | **I thought today** → delete the build (the LEGO has enough rows) or give the verb its object (sure)
- `S0405L02B01` ඕනේදැ අද | **was needed today** → delete the build (the LEGO has enough rows) or give the verb its object (sure)
- `S0444L03B02` ඒ අය හිතුවා කියලා අද | **they thought that today** → delete the build (the LEGO has enough rows) or give the verb its object (sure)
- Canon: K9/K16

### en_grammar:agree_I_are — 1 real of 1 read · 0 chars
Nonsense question ("where did she have?").
- `S0382L03U03` ඇයට කොහෙද තිබිල? | **where did she have?** → delete (sure)
- Canon: K9/K16

### untaught_target — 19 real of 19 read · 968 chars
A row uses an English word (or word form) before the course teaches it.
- `S0094L01B02` එකම එකා | **the only one** → reword with taught words, or delete (never add a LEGO) (sure)
- `S0094L01U02` ඔයා එකම කෙනා මම දන්නේ | **you are the only one I know** → reword with taught words, or delete (never add a LEGO) (sure)
- `S0094L01U05` මම එකම එකා ඉංග්‍රීසි කතා කරන | **I'm the only one who speak English** → reword with taught words, or delete (never add a LEGO) (sure)
- `S0094L01U08` ඔයා එකම කෙනා ඉගෙනගන්නේ | **you are the only one learning** → reword with taught words, or delete (never add a LEGO) (sure)
- Canon: K8, K14, K15, P27

### gapped_lego — 68 real of 68 read · 0 chars
LEGO with a "…" gap in it.
- `S0080L01` මම ... වෙනවා | **I'll** → known prompt carries a "…" gap: make the LEGO the whole chunk the seed says (frame + middle), as L32 does on the target side (best guess)
- `S0236L01` ඇය කිව්ව...උත්සාහ කරනවා | **who said she was going to try** → known prompt carries a "…" gap: make the LEGO the whole chunk the seed says (frame + middle), as L32 does on the target side (best guess)
- `S0295L01` මම ... කිව්වේ නෑ | **I didn't say that** → known prompt carries a "…" gap: make the LEGO the whole chunk the seed says (frame + middle), as L32 does on the target side (best guess)
- `S0296L01` මම ... කිව්වා | **I said that** → known prompt carries a "…" gap: make the LEGO the whole chunk the seed says (frame + middle), as L32 does on the target side (best guess)
- Canon: L32

### dup_debut — 6 real of 6 read · 0 chars
Same LEGO taught as new twice.
- `S0425L03` ඒ අයට ... ඕනේ | **they want** → mark not-new (equal to S0418L03 on both sides); re-home its rows under new LEGOs (sure)
- `S0426L02` ඒ අයට ... ඕනේ | **they want** → mark not-new (equal to S0418L03 on both sides); re-home its rows under new LEGOs (sure)
- `S0447L02` ගෙදර | **home** → mark not-new (equal to S0095L01 on both sides); re-home its rows under new LEGOs (sure)
- `S0451L02` ඒ අය කිව්වා | **they said** → mark not-new (equal to S0449L03 on both sides); re-home its rows under new LEGOs (sure)
- Canon: L17, P25

### notnew_untaught — 1 real of 1 read · 0 chars
LEGO marked not-new with no earlier LEGO equal on both sides.
- `S0257L01` නිල් | **blue** → no earlier equal LEGO: make it new (blue at 257 is simply new) or re-cut (sure)
- Canon: L31

### lego_over_8_syllables — 11 real of 11 read · 0 chars
New LEGO over the 8-syllable cap (counted by hand rule, not the tool's estimate).
- `S0024L01` මට බෑ | **I'm not going to be able to** → 9 syllables (hand rule count). Shorter cut: I'm not going | to be able to (likely)
- `S0396L02` අනිත් හැමෝ සූදානම් වෙනකම් | **until everybody else is ready** → 10 syllables (hand rule count). Shorter cut: until | everybody else is ready (likely)
- `S0457L01` විවිධ ක්ෂේත්‍ර ගණන | **the number of different areas** → 10 syllables (hand rule count). Shorter cut: the number | of different areas (likely)
- `S0462L02` යුද්ධේ කාලේ ඉතාලියේ ... සටන් කළා | **fought in Italy during the war** → 9 syllables (hand rule count). Shorter cut: fought in Italy | during the war (likely)
- Canon: L3

### qmark_mismatch — 160 real of 160 read · 4,288 chars
Question mark on one side only (nearly always: the known text is a question but has no "?", so its clip may be read flat).
- `S0003L01U01` ඉංග්‍රීසි කතා කරන්නේ කොහොමද ඔයා එක්ක | **how to speak English with you?** → add "?" to the known text; re-record the known clip (sure)
- `S0003L01U02` ඉංග්‍රීසි ඉගෙනගන්නේ කොහොමද දැන් | **how to learn English now?** → add "?" to the known text; re-record the known clip (sure)
- `S0003L01U04` ඉගෙනගන්නේ කොහොමද ඔයා එක්ක | **how to learn with you?** → add "?" to the known text; re-record the known clip (sure)
- `S0004L01B01` කියන්නේ කොහොමද | **how to say?** → add "?" to the known text; re-record the known clip (sure)
- Canon: A7, A9

### empty_audio — 4 real of 4 read · 161 chars
Played row with an empty audio slot.
- `S0214L03U06` සති අන්තේ මට ආසයි යාළුවන් ටිකක් බලන්න. | **I'd like to see a few friends at the weekend.** → fill the empty slot(s): t1 (library first, then render) (sure)
- `S0484L01B04` ඒක අභියෝගයක් වෙන්න පුළුවන් | **it might be a challenge** → fill the empty slot(s): t1,t2 (library first, then render) (sure)
- `S0509L01B04` අලුත් ඇඳක් හොයන්න | **look for a new bed** → fill the empty slot(s): t1,t2 (library first, then render) (sure)
- `S0605L01U06` ඒක වෙන්න පුළුවන් අපිට උදව් ඕනේ වුණා නිසා | **It might be because we needed help** → fill the empty slot(s): t1 (library first, then render) (sure)
- Canon: A16

### dup_rows — 21 real of 21 read · 0 chars
The same row twice in one basket (nearly always U01 repeats B01).
- `S0061L03U01` ආයෙ කියන්න පුළුවන්ද? | **could you say it again?** → delete this row; it repeats S0061L03B02 in the same basket (sure)
- `S0063L02U01` මට උදව් කරන්නෙ කමක් නෑද | **I don't mind helping?** → delete this row; it repeats S0063L02B03 in the same basket (sure)
- `S0118L01U08` ශාලාවේ ඉන්නකොට මම ලෑස්ති | **I'm ready when we were in the pub** → delete this row; it repeats S0118L01U05 in the same basket (sure)
- `S0121L03B03` මම ඒ ගැන අසාමාන්‍ය | **that is unusual** → delete this row; it repeats S0121L03B02 in the same basket (sure)
- Canon: spa #189/#212 precedent

### seed_not_played — 249 real of 249 read · 0 chars
The seed's English sentence is never said in any played row.
- `S0003` හැකි තරම් නිතර කතා කරන විදිහ. | **how to speak as often as possible.** → add the seed sentence as a USE row under its last new LEGO, reusing the seed clips (the P26 tool) (sure)
- `S0004` ඉංග්‍රීසියෙන් කොහොමද මොකක් හරි කියන්නේ | **how to say something in English** → add the seed sentence as a USE row under its last new LEGO, reusing the seed clips (the P26 tool) (sure)
- `S0008` මම කියන්නේ මොකද කියලා පැහැදිලි කරන්න හදනවා. | **I'm going to try to explain what I mean.** → add the seed sentence as a USE row under its last new LEGO, reusing the seed clips (the P26 tool) (sure)
- `S0029` හැකි ඉක්මනට හොඳට කතා කරන්නට ලෑස්තිව ඉදිරිය ගැන ආශාවෙනවා. | **I'm looking forward to speaking better as soon as I can.** → add the seed sentence as a USE row under its last new LEGO, reusing the seed clips (the P26 tool) (sure)
- Canon: P26

## Coverage (real / read, per family and course)

| family | kan | tam | tel | sin |
|---|---|---|---|---|
| lego_not_in_seed_target | 27/34 | 16/18 | 54/55 | 160/167 |
| sin_nonsense_basket | 0 hits | 0 hits | 0 hits | 13/13 |
| sin_template_builds | 0 hits | 0 hits | 0 hits | 147/147 |
| en_grammar:sin_filler_near | 0 hits | 0 hits | 0 hits | 38/38 |
| en_adds_word_known_lacks | 0 hits | 74/74 | 0 hits | 0 hits |
| phrase_missing_lego | 0 hits | 81/81 | 28/31 | 37/38 |
| zut_lego | 4/4 | 0 hits | 2/2 | 1/1 |
| en_grammar:more_adj | 8/8 | 0 hits | 0 hits | 0 hits |
| en_grammar:missing_apostrophe | 0 hits | 6/6 | 0 hits | 0 hits |
| en_grammar:sentence_fragment_d | 0 hits | 0 hits | 4/4 | 0 hits |
| en_grammar:third_person_s | 0 hits | 3/3 | 0 hits | 0 hits |
| en_grammar:present_with_past_time | 2/2 | 11/11 | 0 hits | 2/2 |
| en_grammar:perfect_with_past_time | 0 hits | 2/2 | 0 hits | 1/1 |
| en_grammar:did_plus_past | 0 hits | 0 hits | 0 hits | 5/5 |
| en_grammar:a_vowel | 0 hits | 2/2 | 0 hits | 7/7 |
| en_grammar:doubled_word | 3/3 | 0 hits | 0 hits | 5/5 |
| en_grammar:want_ing | 1/1 | 0 hits | 0 hits | 4/4 |
| en_grammar:modal_plus_to | 0 hits | 0 hits | 0 hits | 1/1 |
| en_grammar:today_tail_past | 4/4 | 5/5 | 1/1 | 3/3 |
| en_grammar:agree_I_are | 0 hits | 0 hits | 0 hits | 1/1 |
| untaught_target | 62/62 | 92/92 | 25/25 | 19/19 |
| gapped_lego | 0 hits | 0 hits | 5/5 | 68/68 |
| dup_debut | 0 hits | 1/1 | 0 hits | 6/6 |
| notnew_untaught | 0 hits | 3/3 | 0 hits | 1/1 |
| lego_over_8_syllables | 4/4 | 13/13 | 11/11 | 11/11 |
| qmark_mismatch | 16/16 | 37/37 | 48/48 | 160/160 |
| empty_audio | 0 hits | 0 hits | 428/428 | 4/4 |
| dup_rows | 182/182 | 38/38 | 179/179 | 21/21 |
| seed_not_played | 243/243 | 149/149 | 107/107 | 249/249 |
Every hit counted above was read (R0.5): the mechanical families (dup_rows, seed_not_played, empty_audio, qmark_mismatch) were checked by mechanism over every row, and qmark rows were read one by one.

**Not a defect (excluded, with the mechanism):** LEGO-not-in-seed hits that are only a contraction (`it's` / `it is`), K54 "to" on a verb LEGO, or a K28 pronoun (17 in all); `what's` holding `what` (L28); "can you try and breathe" under "to try and breathe" (K54); "another cup of coffee" under "a cup of coffee" (Kai 10 Nov article ruling). Phrase-level ZUT clashes with no LEGO on either side (kan 22, tel 13, tam 3, sin 2) are not listed as findings (Kai 21 Oct) — they are in the hits files. Seeds whose English IS played but under a slightly different known prompt (kan 83, tam 184, tel 103, sin 150) are not counted: two known prompts for one English answer is K3, fine. "want something", "that that", "would have … yesterday", bare VP builds outside sin ("want a coffee") — read, fine.

**Scanned with no real hits:** tag_lego/tag_phrase, same_both, debut_no_practice, article_drift, zut_seed — 0 candidates in all four.

## Gaps (stated plainly)

- **Known-side families not judged.** `lego_not_in_seed_known` (kan 14, tam 379, tel 129, sin 166) and my own stricter known-side containment check (kan 226, tam 328, tel 257, sin 66 rows where the LEGO's known word has no stem in the row) are mostly inflection, which Dravidian languages and Sinhala do heavily; I cannot tell a real miss from a correct inflected form. Where the English showed the defect (sin S0111, S0447L03, S0462L02) it is listed. The rest is a job for a reader of each language.
- **Known side of every recommended re-cut is unverified.** For the LEGO-not-in-seed family I can say the English must become the seed's words; I cannot write or check the Kannada/Tamil/Telugu/Sinhala that goes with it.
- **LEGOs at 7–8 syllables** (kan 122, tam 170, tel 164, sin 99 by hand-rule count) are in the JSON, not hand-cut. Only the 39 over the cap carry a proposed cut.
- **Intros not read** (`/presentation/<legoId>`): every re-cut LEGO above needs its intro updated (O13); not checked.
- **Female voice / wrong word spoken / clip ≠ text:** not scanned (A22; no ear, no Whisper).
- **English grammar outside the 14 patterns** was not read row by row: ~51,000 played rows across the four courses. The patterns catch the shapes I found; a full English read of eng_for_sin seeds 300+ and eng_for_tam seeds 1–150 would find more.
- **Audio library hits** were not looked up (that is Popty's render route, and nothing was to be called), so the empty-audio figure is an upper bound.
