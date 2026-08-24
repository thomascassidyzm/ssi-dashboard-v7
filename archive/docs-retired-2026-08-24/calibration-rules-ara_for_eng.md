# Calibration Rules — ara_for_eng (Arabic for English Speakers)

## Romanisation Convention (SSi Custom — Option C)

All `target_roman` fields use this scheme. No diacritics, no numbers, all lowercase.

### Vowels
| Arabic | Roman | Notes |
|--------|-------|-------|
| Short فَتْحَة | a | |
| Short كَسْرَة | i | |
| Short ضَمَّة | u | |
| Long ا/آ | aa | doubled |
| Long ي | ee | doubled |
| Long و | oo | doubled |

### Consonants — Special Cases
| Arabic | Roman | Notes |
|--------|-------|-------|
| خ | kh | |
| غ | gh | |
| ش | sh | |
| ث | th | voiceless |
| ذ | dh | voiced |
| ح | hh | doubled — deeper pharyngeal |
| ه | h | plain h |
| ع | ' | apostrophe (ayn) |
| ء | ' | apostrophe (hamza) |

### Emphatics — Plain Letters
| Arabic | Roman | Notes |
|--------|-------|-------|
| ص | s | same as س in romanisation |
| ض | d | same as د |
| ط | t | same as ت |
| ظ | z | same as ز |

### Other
| Arabic | Roman |
|--------|-------|
| ق | q |
| ج | j |
| ر | r |

### Principles
- All lowercase, no diacritics, no numbers
- Long vowels = doubled letter (aa, ee, oo)
- Emphatics written as plain letters — audio carries the distinction
- ال (definite article) written as "al-" with hyphen, assimilation NOT reflected (always "al-", not "ash-shams")
- تاء مربوطة in construct = -at, pausal = -a

---

## Arabic Grammar Rules (from QA)

### Subjunctive after أَنْ
Verbs following أَنْ take subjunctive (فتحة on final radical):
- ✅ أُرِيدُ أَنْ أَتَعَلَّمَ (ureedu an ata'allama)
- ❌ أُرِيدُ أَنْ أَتَعَلَّمُ (indicative after أَنْ is wrong)

### Case Agreement
- Genitive after prepositions: بِالعَرَبِيَّةِ (kasra)
- Accusative for direct objects: أُرِيدُ شَيْئًا
- Diptotes take فتحة in genitive: آخَرَ not آخَرٍ

### لَسْتُ Predicates
- لَسْتُ + accusative (خبر ليس): لَسْتُ مُتَأَكِّدًا

### Definite Article Assimilation
- Sun letters (ت ث د ذ ر ز س ش ص ض ط ظ ل ن): assimilate but we write "al-" anyway in romanisation
- Moon letters: no assimilation

---

## LEGO Strategy

### Verb Conjugation = Separate LEGOs
Arabic verbs conjugate heavily. Each form is a separate LEGO:
- أُرِيدُ (ureedu — I want) = one LEGO
- يُرِيدُ (yureedu — he wants) = separate LEGO
- تُرِيدُ (tureedu — you want) = separate LEGO

Indicative vs subjunctive of the same person = separate LEGOs:
- أَتَكَلَّمُ (atakallamu — I speak, indicative)
- أَتَكَلَّمَ (atakallama — I speak, subjunctive after أَنْ)

### Preposition + Case in M-LEGOs
Prepositions govern case. Bundle preposition + noun in M-LEGOs:
- "in Arabic" → بِالعَرَبِيَّةِ (bil'arabiyyati) — one M-LEGO
- Components: بِـ (bi- = in), العَرَبِيَّة (al'arabiyya = Arabic)

### Pronoun Handling
Arabic is pro-drop — subject pronouns optional. Teach verbs without pronouns by default.
Add أَنَا / أَنْتَ etc. as separate LEGOs when disambiguation is needed.

---

## Standard SSi Rules

### BUILD Phrases
- New LEGO + previously introduced LEGOs
- Shows how the new piece plugs into what the learner already knows
- Fragments OK — not complete sentences
- NOT the LEGO by itself, NOT component build-up

### USE Phrases
- Complete sentences for eternal spaced repetition
- Must be natural things a learner would say
- Scored 5-9

### LEGO Form Is Fixed
- LEGOs must be used exactly as-is in all phrases — never conjugated or inflected differently
- Choose phrases where the exact LEGO form works naturally

### Cascade / Tiling
- Seeds must be submitted in order (each builds on prior vocab)
- Every phrase must tile from introduced vocabulary only

### target_roman Required
Every LEGO and phrase must include `target_roman` alongside `target` (Arabic script).
Romanisation follows the convention above.

### M-LEGO Components
M-LEGOs MUST declare components. Without them, the DP vocab tiler can't verify phrase tiling.

### Optional Component Introduction (`introduce: false`)
Set `introduce: false` on a component when it would confuse more than help as a standalone item — single-letter prepositions, particles, or stubs that only make sense attached. The component still exists for tiling but the learner won't hear it solo. Default is `true`.
