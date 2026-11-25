# Hebrew course audio: does the missing vowel marking cause mispronounced clips?

*heb_for_eng, job #456, read-only. QA copy of 25 Nov 03:41Z. No audio made, nothing written.*

## Verdict

**There is a real but small risk, and it sits where the room expected: in one-word clips.** All 1,269 one-word target clips in the course were made from Hebrew with no vowel marks. In fact no target text anywhere in the course has vowel marks. Of the 185 one-word spellings I looked up (the 143 that learners hear most, plus a random 40 of the rest), **17 have two or more everyday readings that sound different**, such as אם *im* "if" / *em* "mother", שם *sham* "there" / *shem* "name", and ספר *sefer* "book" / *sapar* "barber". Those 17 are behind **62 clips in 158 slots**. A further **9 are masculine/feminine pairs** (28 clips, 94 slots), such as שלך *shelkha* / *shelakh* "your". For these, both readings are correct Hebrew, and the English doesn't say which one the course wants.

**Nothing here shows that any clip is actually wrong.** An ambiguous spelling is a risk, not proof. Whether a clip was read the wrong way is for a Hebrew speaker's ear. Kai's tap-to-mark page of all 90 clips (right / wrong, with Play all), marked **UNHEARD**, is here: https://watson-1.tail4968cb.ts.net/d/370a9b7f. It replaces the earlier plain listening page d/ad517af4.

**One case is certain on the spelling alone.** The bare אחר clips (`e0f1d7e8` Hila, `bd6326e2` Avri) serve 4 rows. Two of those rows mean "after" (*akhar*) and two mean "else" or "other" (*akher*). One recording can't be both words, so whichever way the voice read it, 2 rows play the wrong word. The fix there is two separate clips, not just a re-render.

**The cost of a fix is tiny.** Re-recording the 17 everyday-homograph spellings from vowel-marked text comes to about **340 characters** (62 clips). The 9 gender pairs add about 210, once Kai has ruled which gender each should be. Re-doing **every** one-word clip in the course would be about 6,900 characters unmarked, or roughly 11,000 with marks. Any re-render goes through `POST /api/audio/render` only. I did not call it, not even as a dry run.

**Popty's own speech check can't answer this, and has barely looked.** Of the course's 22,480 clips, the stored records show **37 checked, 37 passed, 0 failed**. 12 of those are Hebrew, and all 12 are full pod sentences. **No one-word clip has ever been checked.** Even if one were, a transcript of Hebrew comes back without vowels too, so a check that compares transcript with text would pass אם whether the voice said *im* or *em*. That check cannot catch this fault.

## How big is it

| | Count |
|---|---|
| One-word target slots (rows) | 1,048 phrase rows (909 component, 139 build), plus LEGOs with the same text |
| One-word clips (target1 + target2) | 1,269: 634 Azure Hila (female), 634 Azure Avri (male), 1 Cartesia (ציפינו) |
| Distinct one-word spellings | 508 |
| Looked up on Pealim and Wiktionary | 185 (the 143 heard in 3 or more slots, a random 40 of the rest, and ספר and שמח) |
| Two everyday readings (tier A) | **17**; 15 of them are heard in 5 or more slots |
| Masculine/feminine pair (tier G) | **9**; 8 of them are heard in 5 or more slots |
| Second reading real but rare (tier B) | 35 (e.g. טוב *tov* / *tuv* "be good!", a rare command form) |
| Looked ambiguous but isn't (tier X) | 11 (the two dictionaries write the same sound differently, or the second entry is an old-style spelling of another word) |
| One reading in both dictionaries | 85 |
| Not found in either (all carry prefix letters, e.g. שאני, בשבוע) | 28: **not looked up, not safe** |
| Not looked up at all | 323 lower-frequency spellings |

In the random 40, I found no tier-A word and one gender pair (ממך). That fits the idea that the everyday homographs are concentrated in the short, common words learners hear most.

## Tier A: spellings with two everyday readings

"Course means" is worked out from the course's own English for the LEGO or phrase. Slots count target1 and target2 pointers.

| Spelling | Course means | Other readings (dictionary) | Slots | Clips (Hila / Avri, Azure) | Sources |
|---|---|---|---|---|---|
| אם (אִם) | im "if / if" | if (im) / mother (em) | 24 | `0fa207df`, `6f78d7d7`, `962b88ef`, `b532425e` | [1](https://www.pealim.com/dict/2664-em/) [2](https://www.pealim.com/dict/5213-im/) |
| לך (לְךָ) | lecha "to you / to you" | to you, man (lekha) / to you, woman (lakh) / go! (lekh) | 24 | `a89ebcc7`, `aa41b976`, `c5b9bde4`, `d0393960` | [1](https://en.wiktionary.org/wiki/%D7%9C%D7%9A) [2](https://www.pealim.com/dict/6014-le/) [3](https://www.pealim.com/dict/7-lalechet/) |
| אחר (אַחֵר) | acher "after / different" | other, else (akher) / after (akhar) | 12 | `89d90f11`, `bd6326e2`, `d3813022`, `e0f1d7e8` | [1](https://en.wiktionary.org/wiki/%D7%90%D7%97%D7%A8) [2](https://www.pealim.com/dict/4276-achar/) [3](https://www.pealim.com/dict/4630-acher/) [4](https://www.pealim.com/dict/88-leacher/) |
| לגלות (לְגַלּוֹת) | legalot "to find out / to find out" | to discover (legalot) / to be exiled (liglot) | 12 | `7e969a3d`, `b452d792`, `cb0579c9`, `fa031882` | [1](https://www.pealim.com/dict/331-legalot/) [2](https://www.pealim.com/dict/333-liglot/) |
| דבר (דָּבָר) | davar "thing / thing" | thing (davar) / speak! (daber) / plague (dever) | 10 | `14ac1e50`, `2058ed15`, `35f3c4e4`, `c607a40b` | [1](https://en.wiktionary.org/wiki/%D7%93%D7%91%D7%A8) [2](https://www.pealim.com/dict/2-ledaber/) [3](https://www.pealim.com/dict/6063-davar/) [4](https://www.pealim.com/dict/8310-dever/) |
| לענות (לַעֲנוֹת) | la'anot "to answer / to answer" | to answer (la'anot) / to torment (le'anot) | 10 | `0c933812`, `8e3c0f8a`, `d530e049`, `dbaf543d` | [1](https://www.pealim.com/dict/1519-leanot/) [2](https://www.pealim.com/dict/40-laanot/) |
| מדי (n/a) | midai "too much / too much" | too much (midai) / each, every (midei) / uniforms of (madei) | 8 | `1a2cbdde`, `1ba72f37`, `3959fa3b`, `b0b0341f` | [1](https://en.wiktionary.org/wiki/%D7%9E%D7%93%D7%99) [2](https://www.pealim.com/dict/7845-madim/) |
| עם (עִם) | im "with / with" | with (im) / people, nation (am) | 8 | `07a05076`, `09fba21b`, `2c11ba12`, `c473f9a9` | [1](https://en.wiktionary.org/wiki/%D7%A2%D7%9D) [2](https://www.pealim.com/dict/4112-im/) [3](https://www.pealim.com/dict/5928-am/) |
| זקן (זָקֵן) | zaken "old / old" | old (zaken) / beard (zakan) / grew old (zakan) | 6 | `2beb49e6`, `2c814cfb`, `2d8bcd72`, `b930a7ab` | [1](https://en.wiktionary.org/wiki/%D7%96%D7%A7%D7%9F) [2](https://www.pealim.com/dict/3364-zaken/) [3](https://www.pealim.com/dict/5014-zakan/) [4](https://www.pealim.com/dict/6852-zaken/) |
| חבר (חָבֵר) | chaver "friend / friend" | friend (khaver) / joined (khavar) / connect! (khaber) / group (kh(e)ver) | 6 | `63fb6dcd`, `64506cd9`, `9d8b0671`, `a10958f7` | [1](https://en.wiktionary.org/wiki/%D7%97%D7%91%D7%A8) [2](https://www.pealim.com/dict/2537-lachavor/) [3](https://www.pealim.com/dict/4744-chaver/) [4](https://www.pealim.com/dict/551-lechaber/) |
| לקחת (לָקַחַת) | lakachat "to take / to take" | to take (lakakhat) / you took, man (lakakhta) / you took, woman (lakakht) | 6 | `27cb36ed`, `40b96473`, `5c4c64c6`, `ba59489e` | [1](https://en.wiktionary.org/wiki/%D7%9C%D7%A7%D7%97%D7%AA) [2](https://www.pealim.com/dict/2427-lakachat/) |
| לשנות (לְשַׁנּוֹת) | leshanot "to change / to change" | to change (leshanot) / to repeat, revise (lishnot) | 6 | `20929b40`, `27e5b420`, `a279531b`, `f7c3a9c0` | [1](https://www.pealim.com/dict/2263-lishnot/) [2](https://www.pealim.com/dict/24-leshanot/) |
| עזרה (עֶזְרָה) | ezra "help / help" | help, noun (ezra) / she helped (azra) | 6 | `111a227b`, `68a6a6a4`, `ec70fd4b`, `ed1d0b2c` | [1](https://en.wiktionary.org/wiki/%D7%A2%D7%96%D7%A8%D7%94) [2](https://www.pealim.com/dict/4332-ezer/) [3](https://www.pealim.com/dict/46-laazor/) [4](https://www.pealim.com/dict/5557-ezra/) |
| שלו (שֶׁלּוֹ) | shelo "his" | his (shelo) / calm (shalev) / they drew out (shalu) | 6 | `6f6e90ea`, `cd936aca` | [1](https://en.wiktionary.org/wiki/%D7%A9%D7%9C%D7%95) [2](https://www.pealim.com/dict/2215-lishlot/) [3](https://www.pealim.com/dict/2643-shel/) [4](https://www.pealim.com/dict/2723-linshol/) |
| שם (שָׁם) | sham "there / there" | there (sham) / name (shem) / puts (sam) | 6 | `bf7c6460`, `ed202ca3`, `f2fd0029`, `f4d132be` | [1](https://en.wiktionary.org/wiki/%D7%A9%D7%9D) [2](https://www.pealim.com/dict/3193-sham/) [3](https://www.pealim.com/dict/3194-shem/) [4](https://www.pealim.com/dict/45-lasim/) |
| ספר (סֵפֶר) | sefer "a book" | book (sefer) / counted (safar) / barber (sapar) / tell! (saper) | 4 | `682a7a03`, `accf804f` | [1](https://en.wiktionary.org/wiki/%D7%A1%D7%A4%D7%A8) [2](https://www.pealim.com/dict/1408-lispor/) [3](https://www.pealim.com/dict/1409-lesaper/) [4](https://www.pealim.com/dict/6104-sefer/) |
| שמח (שָׂמֵחַ) | sameach "happy" | happy (same'akh) / was happy (samakh) / be happy! (smakh) | 4 | `1c713fdf`, `8c5d31b6` | [1](https://en.wiktionary.org/wiki/%D7%A9%D7%9E%D7%97) [2](https://www.pealim.com/dict/2241-lismoach/) [3](https://www.pealim.com/dict/2242-lesameach/) [4](https://www.pealim.com/dict/4348-sameach/) |

## Tier G: masculine/feminine pairs (the English doesn't decide)

The course has the same text read by a female voice (Hila) and a male voice (Avri). For "I want" (רוצה), a woman says *rotsa* and a man says *rotse*, so each voice may well be reading it differently. Whether that's wanted is a course-design call for Kai, not a dictionary fact.

| Spelling | Course means | Other readings (dictionary) | Slots | Clips (Hila / Avri, Azure) | Sources |
|---|---|---|---|---|---|
| רוצה (רוֹצֶה / רוֹצָה) | rotze / rotza "want / want" | wants: man (rotse) / woman (rotsa); the English does not say which | 28 | `65208c3c`, `836a271c`, `a617bcf0`, `e92d7185` | [1](https://www.pealim.com/dict/12-lirtzot/) [2](https://www.pealim.com/dict/2090-leratzot/) |
| שלך (שֶׁלְּךָ / שֶׁלָּךְ) | shelcha / shelach "your / your" | your: to a man (shelkha) / to a woman (shelakh) | 18 | `255f77ba`, `3197e146`, `9eae3cc4`, `e151ca96` | [1](https://en.wiktionary.org/wiki/%D7%A9%D7%9C%D7%9A) [2](https://www.pealim.com/dict/2643-shel/) |
| ראית (רָאִיתָ / רָאִית) | ra'ita / ra'it "you saw / did you watch" | you saw: man (ra'ita) / woman (ra'it) | 12 | `14ea4d37`, `32dc6a19`, `77f63b28`, `ea4dd63e` | [1](https://www.pealim.com/dict/1972-lirot/) |
| אותך (אוֹתְךָ / אוֹתָךְ) | otcha / otach "you" | you (object): man (otkha) / woman (otakh) | 8 | `42e0dc09`, `b6d4ddf0` | [1](https://www.pealim.com/dict/1284-lehatich/) [2](https://www.pealim.com/dict/2710-et/) [3](https://www.pealim.com/dict/5595-ot/) [4](https://www.pealim.com/dict/5596-ot/) |
| שמעת (שָׁמַעְתָּ / שָׁמַעְתְּ) | shamata / shamat "you heard / you heard" | you heard: man (shamata) / woman (shamat) | 8 | `2d12bfd0`, `53533150`, `b14c4736`, `b253ca52` | [1](https://www.pealim.com/dict/2250-lishmoa/) |
| עצמך (עַצְמְךָ / עַצְמֵךְ) | atzmecha / atzmech "yourself" | yourself: man (atsmekha) / woman (atsmekh) | 6 | `549c925b`, `c94aa894` | [1](https://www.pealim.com/dict/3705-etzem/) [2](https://www.pealim.com/dict/3706-etzem/) |
| עשית (עָשִׂיתָ / עָשִׂית) | asita / asit "you've done / you did" | you did: man (asita) / woman (asit) | 6 | `23892d0f`, `53efda52`, `b6a7c98a`, `dcbcc222` | [1](https://www.pealim.com/dict/3-laasot/) |
| קשה (קָשֶׁה / קָשָׁה) | kashe / kasha "difficult / hard" | hard: masculine (kashe) / feminine (kasha) | 6 | `0a9d6650`, `8112d2be` | [1](https://en.wiktionary.org/wiki/%D7%A7%D7%A9%D7%94) [2](https://www.pealim.com/dict/1962-likshot/) [3](https://www.pealim.com/dict/4445-kashe/) [4](https://www.pealim.com/dict/7264-kash/) |
| ממך (מִמְּךָ / מִמֵּךְ) | mimcha / mimech "from you" | from you: man (mimkha) / woman (mimekh) | 2 | `616b4f9f`, `ffc8c40c` | [1](https://www.pealim.com/dict/6051-min/) |

## Tier B, tier X and the words not found

- **Tier B (second reading is real but rare: a command form, a passive or an archaic word):** אני, שלי, היה, יותר, זמן, כמה, הולך, ש, טוב, לעשות, אנשים, הזה, מתי, הבא, הם, הרבה, חשוב, כבר, לתת, קצת, השם, כי, מכיר, עדיין, עובד, עוד, שכחתי, של, חושב, מילה, איפה, הדרך, מוחלט, סרט, שתלך. The single-letter clip ש is in here too. A voice given one bare letter may say the letter's name (*shin*) rather than the word *she*. That's unchecked.
- **Tier X (not really ambiguous):** אתמול, מעניין, בעיה, כאילו, לקרוא, איך, בקרוב, לאט, לאן, רק, מהר.
- **Not found, so neither cleared nor flagged:** באוטובוס, ביום, בסידורים, בעירייה, בשבוע, האיש, הזאת, החברים, הכול, הסיבה, כשאתה, מהבוקר, ממה, מצידך, שאמר, שאמרה, שאמרת, שאני, שאתה, שהוא, שזה, שיותר, שלא, שנגמור, שעובד, שרציתי, שתגיד, שתעזור.

## How this was done, and what it could not do

- **Rows** came from `tools/qa/known-target-mismatch/dump.cjs`. **Clip ids and voices** came from `tools/audio/live-clip.cjs which`, run once per text. Both tools are on main, were run unchanged, and read the nightly QA copy. **Stored check results** were read through Popty's own read-only route `GET /api/production/heb_for_eng/audio-preview/clips?filter=checked`. Clips for the listening page came from Popty's `…/audio/:id/url`. No hand-written database code was used.
- **Calibration first.** Run on known homographs, Pealim found 4 readings each for ספר, דבר and שמח. It **missed** the second reading of חלב (*chelev*, "fat"), which Wiktionary has, and it finds nothing for words with prefix letters. So every spelling was checked on both sites, and a word found on neither is listed as **not looked up**, never as safe.
- **Rules I applied (taste-safe defaults):** I counted a reading only where it sounds different (stress-only and transcription-style differences were merged). A reading that exists only in an old-style or vowel-marked spelling (e.g. ספר read as *siper*, which is normally written סיפר) was not counted. Words carrying prefix letters were treated as one word. Scope was heb_for_eng only. The A/B/G/X sorting of the 72 machine-flagged spellings is my judgement from the dictionary entries, and each row cites its sources.
- **Gaps.** (1) 323 lower-frequency spellings were not looked up, and the 28 prefixed ones were found in neither dictionary. (2) I haven't checked whether Azure's Hebrew voices (Hila, Avri) actually follow vowel marks when they're given them. Re-rendering from vowel-marked text is the proposed fix, but it's unproven for these voices, so a test clip should be heard before any batch. (3) Full phrases and sentences were not scanned word by word. Context lowers their risk, but doesn't remove it. (4) Only the vowel-marked spelling of מדי (*midai*) wasn't on Pealim's form list, so its cost is counted unmarked.

Evidence files (row lists, dictionary pages, curation): `~/ssi-evidence/ssi-dashboard-v7/docs/heb-homograph-456/`.
