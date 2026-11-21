# Item 20: thin baskets in the five English-for-Indic courses — the plan, priced (nothing applied)

*cs #740·AI, resuming #718·AI after the 18 Nov DB hold. 18 Nov 2026. PLAN ONLY: no row written, no clip rendered.*

## In one paragraph

The player skips a build row that is just the LEGO, so these baskets give the learner almost no build practice. The plan adds **3,439 real build rows** across 5 courses: 3,206 of them rewrite a bare-LEGO row in place and the rest are inserts. Every row passes the course-builder's own checks with **0 errors**: the LEGO is inside, the English is taught by that point, no prompt clashes with another (ZUT), and nothing duplicates a row already in the course. The English comes from the repaired Hindi course (eng_for_hin) wherever it fits; the planners wrote the rest. The known side was translated from the Hindi rows into each language by three Fable planners. **Price: 43,026 Cartesia characters and 84,771 Azure characters** in total, against the ~251k Cartesia once estimated. About 89% of the English (3,070 of 3,439 rows) already has a recording (free), and Azure does not count against the daily Cartesia budget. Bengali carries most of the Cartesia cost because its known voice (Pooja) is Cartesia. **48 rows are held**, each with a reason, and none is waiting on a question.

## Per course

| Course | thin baskets | owned by another job today | rows planned | rewrite bare / insert | English written new | held | validator | Cartesia chars | Azure chars |
|---|---|---|---|---|---|---|---|---|---|
| Urdu (eng_for_urd) | 387 | 16 | 390 | 352 / 38 | 28 | 0 | 0 errors, 32 warnings | 3,036 | 12,058 |
| Punjabi (eng_for_pan) | 562 | 42 | 555 | 508 / 47 | 66 | 10 | 0 errors, 83 warnings | 2,518 | 18,048 |
| Bengali (eng_for_ben) | 760 | 95 | 702 | 656 / 46 | 97 | 13 | 0 errors, 49 warnings | 26,418 | 0 |
| Marathi (eng_for_mar) | 797 | 165 | 667 | 615 / 52 | 72 | 15 | 0 errors, 68 warnings | 4,906 | 21,509 |
| Gujarati (eng_for_guj) | 1160 | 74 | 1125 | 1075 / 50 | 118 | 10 | 0 errors, 94 warnings | 6,148 | 33,156 |
| **Total** | 3,666 | 392 | 3,439 | 3,206 / 233 | 381 | 48 | 0 errors | **43,026** | **84,771** |

Urdu's 390 rows include the 55 rows hand-written by #718·AI before it was frozen (23 seeds), which the Urdu planner left as they were. The warnings are review notes, not blocks. Most are 'not this item': the basket is short of USE rows, which item 20 does not touch. A few are known-side words in a different form from the one taught, which is allowed under canon K6.

## How the price was measured

- **English (both slots: Charlotte, then Tom-006, both Cartesia).** English already recorded anywhere costs nothing: either the library links it, or the route answers EXISTS_IN_LANGUAGE and the existing clip is linked. English never recorded is rendered in both slots, so it costs 2 × its length. A line paid once is free in the other four courses, because all five share the English cast.
- **Known side.** All new text, so 1 × its length in the course's cast known voice: Azure for Urdu (Uzma), Punjabi (Vaani), Marathi (Manohar) and Gujarati (Dhwani/Niranjan by gender); Cartesia for Bengali (Pooja).
- **Source.** Bulk dry runs are refused on live by design (100 an hour per caller, `BULK_DRY_RUN_ON_LIVE`, Tom 5 Nov), so the price is computed from the 03:30Z nightly QA copy. 97 real live dry-run answers checked it: 93 agree, and the 4 that disagree are lines the estimate charges for but live would link free. **So the figure is an upper bound.**
- **What the apply will still meet.** Some English exists only in non-cast voices. Linking that clip is free; a fresh take in the cast voice is refused (EXISTS_IN_LANGUAGE) without Kai's approval token. The apply should link, and will not spend on those lines.

## Held rows (reported, not asked)

- **Seed 1 LEGOs** (all five courses): nothing is taught before them, or every taught combination is already in the basket.
- **Baskets that already hold a duplicate pair**: the validator blocks any touch to the basket until one of the two rows is deleted, and deleting rows is not item 20's job. This is about 10 baskets across pan, ben, mar and guj.
- **Fragment or split LEGOs** no natural sentence contains: e.g. 'only could', 'on the', 'were in', 'makes very special', 'I myself' (guj reflexive), Marathi 'badly' (जोरात only fits 'hurt badly').
- **Baskets owned by another job today** (392): items 4, 9 and 10 and the #447 LEGO families are rebuilding them, so item 20 leaves them alone (`<course>/holds.json`).

## Quality notes

- The planners replaced several hundred of the Hindi course's English picks (urd 35, ben 83, mar 104, guj 101, plus pan) where:
  - the LEGO was only inside another word ('learnt' for learn, 'useful' for use);
  - the sentence was an odd fragment ('to look after here');
  - it used a word whose known-side equivalent this course has not taught yet;
  - or the known side would clash with an existing row.
- Gender follows each course's own LEGO known form. Gujarati stays masculine where the course's LEGO is masculine, even where the Hindi row was feminine. Bengali verbs carry no gender.
- Where the course's own known wording is unidiomatic (e.g. Gujarati મારે જતા), the planners followed the course rather than correcting it here. That is a separate fix.
- Seen while planning, outside this item: some baskets that count 3 'real' builds hold nonsense rows. Example: Urdu S0005L01 'I want to say something I'm going to practise speaking'.

## Samples (random, 6 per course)

**Urdu**

| LEGO | LEGO English | new row English | new row known | gender |
|---|---|---|---|---|
| S0305L01 | woman | it might be an old woman | یہ ایک بوڑھی عورت ہو سکتی ہے |  |
| S0211L01 | they told us | they told us that it's true | انہوں نے ہمیں بتایا کہ یہ درست ہے |  |
| S0326L01 | I don't think that | I don't think that student has both of her hands up | مجھے نہیں لگتا کہ اس طالبہ کے دونوں ہاتھ اوپر ہیں |  |
| S0643L01 | do you want sir | so what do you want sir? | تو آپ کیا چاہتے ہیں جناب؟ |  |
| S0174L02 | what I'm saying | I know what I'm saying | مجھے معلوم ہے کہ میں کیا کہہ رہا ہوں | m |
| S0182L02 | my keys | to see my keys | میری چابیاں دیکھنا |  |

**Punjabi**

| LEGO | LEGO English | new row English | new row known | gender |
|---|---|---|---|---|
| S0628L01 | do you like tea | do you like tea for supper? | ਕੀ ਤੁਸੀਂ ਰਾਤ ਦੇ ਖਾਣੇ ਲਈ ਚਾਹ ਪਸੰਦ ਕਰਦੇ ਹੋ? |  |
| S0069L02 | young | I like the young dog | ਮੈਨੂੰ ਛੋਟਾ ਕੁੱਤਾ ਪਸੰਦ ਹੈ |  |
| S0370L02 | that I knew | I didn't see anyone that I knew yesterday | ਮੈਂ ਕੱਲ੍ਹ ਕਿਸੇ ਨੂੰ ਨਹੀਂ ਦੇਖਿਆ ਜਿਸਨੂੰ ਮੈਂ ਜਾਣਦਾ ਸੀ | m |
| S0023L01 | to start | I want to start today | ਮੈਂ ਅੱਜ ਸ਼ੁਰੂ ਕਰਨਾ ਚਾਹੁੰਦਾ ਹਾਂ | m |
| S0494L03 | of the show | I'll be ready after the first part of the show | ਮੈਂ ਸ਼ੋਅ ਦੇ ਪਹਿਲੇ ਹਿੱਸੇ ਤੋਂ ਬਾਅਦ ਤਿਆਰ ਹੋਵਾਂਗੀ | f |
| S0202L02 | how to answer the question | I know how to answer the question | ਮੈਨੂੰ ਪਤਾ ਹੈ ਕਿ ਸਵਾਲ ਦਾ ਜਵਾਬ ਕਿਵੇਂ ਦੇਣਾ ਹੈ |  |

**Bengali**

| LEGO | LEGO English | new row English | new row known | gender |
|---|---|---|---|---|
| S0016L01 | he wants | he wants to learn English all day | সে সারাদিন ইংরেজি শিখতে চায় |  |
| S0040L02 | at the moment | I'm tired at the moment | আমি এই মুহূর্তে ক্লান্ত |  |
| S0483L01 | not meant to be easy | I'm sure it's not meant to be easy | আমি নিশ্চিত এটা সহজ হওয়ার কথা নয় |  |
| S0473L01 | I don't want it | I think I don't want it | আমি মনে করি আমি এটা চাই না |  |
| S0033L01 | how long | how long did you want to learn? | কতদিন ধরে শিখতে চেয়েছিলে? |  |
| S0174L01 | can you understand | can you understand today? | তুমি কি আজ বুঝতে পারছ? |  |

**Marathi**

| LEGO | LEGO English | new row English | new row known | gender |
|---|---|---|---|---|
| S0066L02 | to find | to find a letter | एक पत्र शोधणे |  |
| S0568L03 | we meet | I'll be ready when we meet | आम्ही भेटू तेव्हा मी तयार असेन |  |
| S0459L01 | the blue sign | I saw the blue sign on the road | मी रस्त्यावर निळी पाटी पाहिली |  |
| S0023L01 | soon | to meet soon | लवकरच भेटणे |  |
| S0575L01 | upsetting | I'm sure it's been upsetting | मला खात्री आहे की ते त्रासदायक होतं |  |
| S0107L02 | we hoped to see | we hoped to see you today | आज तुम्हाला बघायची आम्हाला आशा होती |  |

**Gujarati**

| LEGO | LEGO English | new row English | new row known | gender |
|---|---|---|---|---|
| S0199L02 | in an office | my son works in an office | મારો દીકરો એક ઑફિસમાં કામ કરે છે |  |
| S0049L02 | if you know | if you know the story | જો તમે વાર્તા સમજો |  |
| S0464L01 | once | I met someone once | મને એક વાર કોઈ મળ્યું |  |
| S0038L03 | for about a week | here for about a week | અહીં લગભગ એક અઠવાડિયાથી |  |
| S0197L01 | my son | you want to meet my son | તમે મારા દીકરાને મળવા માગો છો |  |
| S0037L01 | I started to | I started to learn English | મેં અંગ્રેજી શીખવાનું શરૂ કર્યું |  |

## Live dry run

Each course got one live `edit-batch` dry run of ≤50 rows (a real transaction, rolled back). These confirm that Popty accepts the ops against today's live rows:

| Course | rows | result | time |
|---|---|---|---|
| Urdu | 43 (seeds 100+) | HTTP 200 ok | 57 s |
| Punjabi | 40 | HTTP 200 ok | 74 s |
| Bengali | 40 | HTTP 200 ok | **3 h 20 min** (15:12Z → 18:33Z) |
| Marathi | — | **not run** | — |
| Gujarati | — | **not run** | — |

The Bengali call sat for over three hours before it answered OK. That is most likely a lock or contention on the shared DB from the other writers today. So Marathi and Gujarati were **not** sent to live, so as not to add load. Their plans pass the same local validator (`build.cjs`, the course-builder's own functions) with 0 errors. **The apply must run each batch's live dry run first anyway** (`post.cjs` refuses to apply without one), and should do so in a quiet window, in ≤50-row batches.

## What is not done

- **Nothing is applied or rendered.**
- The plan was written against the live read of 13:24-13:27Z on 18 Nov. Before applying, the apply must re-read every touched seed live: `build.cjs` refuses any row that has moved since it was seen.
- No native speaker has read the known side. In line with Kai's standing rule, proofreaders read the finished course later.
- Applying it: per course, `post.cjs validate` then `dry` then `apply`, in ≤50-row batches, then audio through the one route, then link.

Files: `ops/paid-cleanup-item20/` on branch cs/740-resume-718-item20-indic-baskets- (each course has sheet.json, plans/, batches/plan.*; audio/estimate.json).