<!-- COMMITTED COPY: the listen links are redacted here on purpose. The presigned
     query strings carry an AWS signature and access key id and must never enter git
     history. The live, tappable page is published at:
     https://watson-1.tail4968cb.ts.net/d/81770eaa -->

# Sinhala — the 27 gibberish clips, re-recorded

**Tap ▶ OLD, then ▶ NEW, on each row.** In every OLD clip the voice says **`ඒ ගෙ ඒ ගෙ ඒ ගෙ…`** over and over — three to nine times. That is the gibberish. The NEW clip says the frame and the headword, and stops.

Same voice as the rest of the course, read from the course config rather than chosen: **azure si-LK-SameeraNeural**, speed 1. Mastered on the compressor-free chain (A-131). Spend: **$0.014** across 81 renders — 27 shipping takes plus 54 spares.

> **Nothing is live.** Learners still hear the old, gibberish clips. The swap is one command and it waits on your word.

---

## The count held up, and it grew by six

I did not take the 27 on trust. Rebuilding the detection from scratch found **33** corrupt clips in this course — and exactly **27 of them are linked to a LEGO**, which is to say reachable by a learner. The other **6 are unlinked** (S0181L03, S0181L04, S0197L03, S0198L03, S0202L03, S0204L02): same defect, same course, but nothing plays them. So 27 is right as a count of the live damage, and 33 is right as a count of the damage. I have re-recorded the 27 and left the 6 alone.

Three independent things confirm the gibberish is really *spoken*, not just badly stored:

- **The provider's own token log.** `word_boundaries` records the voice speaking `ඒ` and `ගෙ` as separate tokens with real durations — 715ms to 2,243ms of filler speech per clip. 32 of 33 show three or more filler pairs; the 33rd (S0184L02) shows two plus a doubled word.
- **Duration.** Every one of the 33 is 3.4 to 13.6 standard deviations too long to be the filler-free text, and within a few tenths of the filler-bearing text, against a rate model fitted on 2,199 clean clips of this same course and voice.
- **All 33 decode cleanly** and their file durations match the database to within 36ms. Nothing here was a broken file; the voice was reading corrupt words, faithfully.

---

## Two things I need you to rule on

**1. The example sentence is gone, and it needs a Sinhala speaker.**

The corruption was in the **stored text**, not in the recording — so re-recording the old text would have produced the same gibberish, exactly. Each clip has three slots: the frame, the **headword**, and an **example sentence**. The gibberish was always in the example slot.

I rendered them with the example slot **empty**, which is the form **665 of this course's 2,237** presentation clips already ship in — including S0201L02 and S0203L02, direct siblings of two of these 27. So it is an established pattern here, not something I invented.

What I did **not** do is write 27 new Sinhala example sentences. I do not speak Sinhala, and the known side is a controlled language — inventing them would be guessing at the language *and* at which words the learner has been given by that seed. **That is a real loss: 27 example sentences want authoring by a Sinhala speaker.** If you would rather wait for that than ship the shorter form, say so and none of this goes live.

**2. On 24 of the 27, the headword was wrong too.**

This is a second defect I was not looking for. In 24 cases the old clip's headword did not match the LEGO card at all — the learner read one thing and heard another word. S0197L02 is the clearest: the card teaches *works as a teacher* and the clip says **පුතා**, "son". S0198L02 is the starkest — its headword slot *is* the gibberish, `ඒ ගෙ ඒ ගෙ`.

The new clips take the headword from the LEGO card, so card and audio now agree. **That assumes the card is right and the old clip was wrong.** The English column below is there so you can check that assumption without reading Sinhala — and it holds everywhere I looked. A Sinhala speaker should still confirm it.

---

## The 27

### 1. S0178L01 — *I didn't have time*

Card (what the learner reads): **මට වෙලාවක් තිබුණේ නෑ**

| | headword spoken | length | listen |
|---|---|---|---|
| **OLD** | හැබැයි ← **wrong** | 6000ms | [▶ play OLD](https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/3DF5115B-6214-403F-927A-814BC220BA38.mp3?<presigned — see published page>) |
| **NEW** | මට වෙලාවක් තිබුණේ නෑ ✓ | 5256ms | [▶ play NEW](https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/repair-candidates/a134-sin27-2026-08-17/S0178L01.mp3?<presigned — see published page>) |

<small>old text as stored: `ඉංග්‍රීසිෙන්. 'හැබැයි'. 'හැබැයි මමා ඒ ගෙ ඒ ගෙ ඒ ගෙ' ඉතින්. :`</small>

---

### 2. S0178L02 — *although I wanted to see you*

Card (what the learner reads): **ඔයාව දකින්න ඕනේ වුණත්**

| | headword spoken | length | listen |
|---|---|---|---|
| **OLD** | මමා ළඟ ටයිම් නොතිබුණා ← **wrong** | 7992ms | [▶ play OLD](https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/1A9A0DA6-447E-482B-A5D9-0359ABB8664C.mp3?<presigned — see published page>) |
| **NEW** | ඔයාව දකින්න ඕනේ වුණත් ✓ | 5148ms | [▶ play NEW](https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/repair-candidates/a134-sin27-2026-08-17/S0178L02.mp3?<presigned — see published page>) |

<small>old text as stored: `ඉංග්‍රීසිෙන්. 'මමා ළඟ ටයිම් නොතිබුණා'. 'මමා ළඟ ටයිම් නොතිබුණා හැබැයි මමා ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ' ඉතින්. :`</small>

---

### 3. S0180L01 — *to read my book*

Card (what the learner reads): **මගේ පොත කියවන්න**

| | headword spoken | length | listen |
|---|---|---|---|
| **OLD** | කියවන්නයි ← **wrong** | 7200ms | [▶ play OLD](https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/1751F796-B581-4CA0-B8EF-E32DBBC717E1.mp3?<presigned — see published page>) |
| **NEW** | මගේ පොත කියවන්න ✓ | 5076ms | [▶ play NEW](https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/repair-candidates/a134-sin27-2026-08-17/S0180L01.mp3?<presigned — see published page>) |

<small>old text as stored: `ඉංග්‍රීසිෙන්. 'කියවන්නයි'. 'මමා ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ කියවන්නයි' ඉතින්. :`</small>

---

### 4. S0181L02 — *take my mother*

Card (what the learner reads): **මගේ අම්මව එක්කගෙන යන්න**

| | headword spoken | length | listen |
|---|---|---|---|
| **OLD** | අරගෙන ← **wrong** | 6936ms | [▶ play OLD](https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/E5FF43AD-4DE6-4D74-A534-CCCF4A940B4D.mp3?<presigned — see published page>) |
| **NEW** | මගේ අම්මව එක්කගෙන යන්න ✓ | 5400ms | [▶ play NEW](https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/repair-candidates/a134-sin27-2026-08-17/S0181L02.mp3?<presigned — see published page>) |

<small>old text as stored: `ඉංග්‍රීසිෙන්. 'අරගෙන'. 'හැබැයි මමා ළඟ ඒ ගාවෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ අරගෙන' ඉතින්. :`</small>

---

### 5. S0184L02 — *a while ago*

Card (what the learner reads): **ටිකක් කලින්**

| | headword spoken | length | listen |
|---|---|---|---|
| **OLD** | ටිකක් කලින් ✓ | 7152ms | [▶ play OLD](https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/608B9DFC-F38C-44FF-A606-979AF852F5EC.mp3?<presigned — see published page>) |
| **NEW** | ටිකක් කලින් ✓ | 4680ms | [▶ play NEW](https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/repair-candidates/a134-sin27-2026-08-17/S0184L02.mp3?<presigned — see published page>) |

<small>old text as stored: `ඉංග්‍රීසිෙන්. 'ටිකක් කලින්'. 'ඒ ගෙ ඒ ගෙ ඒ ගෙ ඔෆිස් එකේ ටිකක් ටිකක් කලින් දැක්කා' ඉතින්. :`</small>

---

### 6. S0194L01 — *are you looking for*

Card (what the learner reads): **ඔයා හොයන්නේ**

| | headword spoken | length | listen |
|---|---|---|---|
| **OLD** | හොයන්නේ ← **wrong** | 6936ms | [▶ play OLD](https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/75479B04-CD38-4C4A-9BBC-9288DDE27F18.mp3?<presigned — see published page>) |
| **NEW** | ඔයා හොයන්නේ ✓ | 4716ms | [▶ play NEW](https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/repair-candidates/a134-sin27-2026-08-17/S0194L01.mp3?<presigned — see published page>) |

<small>old text as stored: `ඉංග්‍රීසිෙන්. 'හොයන්නේ'. 'ඔයා ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ හොයන්නේ' ඉතින්. :`</small>

---

### 7. S0196L02 — *have you heard*

Card (what the learner reads): **ඔයා අහලා තියෙනවාද**

| | headword spoken | length | listen |
|---|---|---|---|
| **OLD** | අලුත්ම ← **wrong** | 7704ms | [▶ play OLD](https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/20A062E4-91A1-498B-82C3-5A98CA2BCC33.mp3?<presigned — see published page>) |
| **NEW** | ඔයා අහලා තියෙනවාද ✓ | 5040ms | [▶ play NEW](https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/repair-candidates/a134-sin27-2026-08-17/S0196L02.mp3?<presigned — see published page>) |

<small>old text as stored: `ඉංග්‍රීසිෙන්. 'අලුත්ම'. 'ඔයා ඒ ගෙ ඒ ගෙ ඒ ගෙ ගැන ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ අලුත්ම' ඉතින්. :`</small>

---

### 8. S0197L02 — *works as a teacher*

Card (what the learner reads): **ගුරුවරයෙක් හැටියට වැඩ කරනවා**

| | headword spoken | length | listen |
|---|---|---|---|
| **OLD** | පුතා ← **wrong** | 6624ms | [▶ play OLD](https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/CAAD6BC3-2A09-4C43-BA32-460B7B6938EC.mp3?<presigned — see published page>) |
| **NEW** | ගුරුවරයෙක් හැටියට වැඩ කරනවා ✓ | 5436ms | [▶ play NEW](https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/repair-candidates/a134-sin27-2026-08-17/S0197L02.mp3?<presigned — see published page>) |

<small>old text as stored: `ඉංග්‍රීසිෙන්. 'පුතා'. 'මගේ පුතා ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ' ඉතින්. :`</small>

---

### 9. S0198L01 — *my daughter*

Card (what the learner reads): **මගේ දුව**

| | headword spoken | length | listen |
|---|---|---|---|
| **OLD** | මමා ගේ දුව ← **wrong** | 6936ms | [▶ play OLD](https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/6B04B09D-9F0B-41FE-9B99-FA551B811453.mp3?<presigned — see published page>) |
| **NEW** | මගේ දුව ✓ | 4752ms | [▶ play NEW](https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/repair-candidates/a134-sin27-2026-08-17/S0198L01.mp3?<presigned — see published page>) |

<small>old text as stored: `ඉංග්‍රීසිෙන්. 'මමා ගේ දුව'. 'මමා ගේ දුව ඒ ගාවෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ' ඉතින්. :`</small>

---

### 10. S0198L02 — *works for the council*

Card (what the learner reads): **සභාව වෙනුවෙන් වැඩ කරනවා**

| | headword spoken | length | listen |
|---|---|---|---|
| **OLD** | ඒ ගෙ ඒ ගෙ ← **wrong** | 7512ms | [▶ play OLD](https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/B8113407-DED6-4430-836E-36336B41F5B7.mp3?<presigned — see published page>) |
| **NEW** | සභාව වෙනුවෙන් වැඩ කරනවා ✓ | 5256ms | [▶ play NEW](https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/repair-candidates/a134-sin27-2026-08-17/S0198L02.mp3?<presigned — see published page>) |

<small>old text as stored: `ඉංග්‍රීසිෙන්. 'ඒ ගෙ ඒ ගෙ'. 'මගේ දුව ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ' ඉතින්. :`</small>

---

### 11. S0201L01 — *what was going to happen*

Card (what the learner reads): **මොකද වෙන්න යන්නේ**

| | headword spoken | length | listen |
|---|---|---|---|
| **OLD** | මොකද වෙන්නේ කියලා දැනගන්නයි ← **wrong** | 9456ms | [▶ play OLD](https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/9A2E2ECF-307A-4285-9F25-190A6D4A6622.mp3?<presigned — see published page>) |
| **NEW** | මොකද වෙන්න යන්නේ ✓ | 4968ms | [▶ play NEW](https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/repair-candidates/a134-sin27-2026-08-17/S0201L01.mp3?<presigned — see published page>) |

<small>old text as stored: `ඉංග්‍රීසිෙන්. 'මොකද වෙන්නේ කියලා දැනගන්නයි'. 'මමා ඕනේ ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ මොකද වෙන්නේ කියලා දැනගන්නයි' ඉතින්. :`</small>

---

### 12. S0202L01 — *nobody was sure*

Card (what the learner reads): **කාටවත් විශ්වාස තිබුණේ නෑ**

| | headword spoken | length | listen |
|---|---|---|---|
| **OLD** | ප්‍රශ්නෙ ← **wrong** | 6336ms | [▶ play OLD](https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/3D630CE9-65C7-46BA-BB7C-36599F84F758.mp3?<presigned — see published page>) |
| **NEW** | කාටවත් විශ්වාස තිබුණේ නෑ ✓ | 5364ms | [▶ play NEW](https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/repair-candidates/a134-sin27-2026-08-17/S0202L01.mp3?<presigned — see published page>) |

<small>old text as stored: `ඉංග්‍රීසිෙන්. 'ප්‍රශ්නෙ'. 'ප්‍රශ්නෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ' ඉතින්. :`</small>

---

### 13. S0202L02 — *answer the question*

Card (what the learner reads): **ප්‍රශ්නෙට උත්තර දෙන්න**

| | headword spoken | length | listen |
|---|---|---|---|
| **OLD** | විශ්වාස ← **wrong** | 7416ms | [▶ play OLD](https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/BE4AE2BE-5932-4C34-9C16-933917078FC7.mp3?<presigned — see published page>) |
| **NEW** | ප්‍රශ්නෙට උත්තර දෙන්න ✓ | 5256ms | [▶ play NEW](https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/repair-candidates/a134-sin27-2026-08-17/S0202L02.mp3?<presigned — see published page>) |

<small>old text as stored: `ඉංග්‍රීසිෙන්. 'විශ්වාස'. 'ප්‍රශ්නෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ විශ්වාස' ඉතින්. :`</small>

---

### 14. S0203L01 — *what would you do*

Card (what the learner reads): **ඔයා මොකද කරන්නේ**

| | headword spoken | length | listen |
|---|---|---|---|
| **OLD** | ඉල්ලුවොත් ← **wrong** | 6696ms | [▶ play OLD](https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/8C25EB44-B254-4A5C-B7CA-2B7ABCC1D2C2.mp3?<presigned — see published page>) |
| **NEW** | ඔයා මොකද කරන්නේ ✓ | 4968ms | [▶ play NEW](https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/repair-candidates/a134-sin27-2026-08-17/S0203L01.mp3?<presigned — see published page>) |

<small>old text as stored: `ඉංග්‍රීසිෙන්. 'ඉල්ලුවොත්'. 'මමා ඉල්ලුවොත් ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ' ඉතින්. :`</small>

---

### 15. S0204L01 — *to deal with the arrangements*

Card (what the learner reads): **කටයුතු හදාගන්න**

| | headword spoken | length | listen |
|---|---|---|---|
| **OLD** | සම්බන්ධව ← **wrong** | 7200ms | [▶ play OLD](https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/226FC0AD-8578-45D1-BE93-DC60652BF807.mp3?<presigned — see published page>) |
| **NEW** | කටයුතු හදාගන්න ✓ | 4968ms | [▶ play NEW](https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/repair-candidates/a134-sin27-2026-08-17/S0204L01.mp3?<presigned — see published page>) |

<small>old text as stored: `ඉංග්‍රීසිෙන්. 'සම්බන්ධව'. 'සම්බන්ධව ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ' ඉතින්. :`</small>

---

### 16. S0206L01 — *the chance*

Card (what the learner reads): **අවස්ථාව**

| | headword spoken | length | listen |
|---|---|---|---|
| **OLD** | අවස්ථාව ✓ | 7128ms | [▶ play OLD](https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/01BF4662-4A8A-4196-A483-C7053DD020A8.mp3?<presigned — see published page>) |
| **NEW** | අවස්ථාව ✓ | 4680ms | [▶ play NEW](https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/repair-candidates/a134-sin27-2026-08-17/S0206L01.mp3?<presigned — see published page>) |

<small>old text as stored: `ඉංග්‍රීසිෙන්. 'අවස්ථාව'. 'අවස්ථාව ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ' ඉතින්. :`</small>

---

### 17. S0207L01 — *you've done*

Card (what the learner reads): **ඔයා කරලා තියෙනවා**

| | headword spoken | length | listen |
|---|---|---|---|
| **OLD** | ඔයා කරලා ← **wrong** | 7368ms | [▶ play OLD](https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/33FB1CDB-4D1E-48D5-A822-B6CB3152A8FE.mp3?<presigned — see published page>) |
| **NEW** | ඔයා කරලා තියෙනවා ✓ | 4896ms | [▶ play NEW](https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/repair-candidates/a134-sin27-2026-08-17/S0207L01.mp3?<presigned — see published page>) |

<small>old text as stored: `ඉංග්‍රීසිෙන්. 'ඔයා කරලා'. 'ඔයා කරලා ඒ ගාවෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ' ඉතින්. :`</small>

---

### 18. S0210L01 — *to discuss the problem*

Card (what the learner reads): **ප්‍රශ්නේ ගැන සාකච්ඡා කරන්න**

| | headword spoken | length | listen |
|---|---|---|---|
| **OLD** | සාකච්ඡා ← **wrong** | 7008ms | [▶ play OLD](https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/BF77767C-0014-4697-A69E-5F8EE0CF050D.mp3?<presigned — see published page>) |
| **NEW** | ප්‍රශ්නේ ගැන සාකච්ඡා කරන්න ✓ | 5508ms | [▶ play NEW](https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/repair-candidates/a134-sin27-2026-08-17/S0210L01.mp3?<presigned — see published page>) |

<small>old text as stored: `ඉංග්‍රීසිෙන්. 'සාකච්ඡා'. 'සාකච්ඡා ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ' ඉතින්. :`</small>

---

### 19. S0214L01 — *did you have*

Card (what the learner reads): **ඔයාට ලැබුණාද**

| | headword spoken | length | listen |
|---|---|---|---|
| **OLD** | ලැබුණා ← **wrong** | 7224ms | [▶ play OLD](https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/442112C1-B9CF-4E08-AF1A-1C20B18DE6B8.mp3?<presigned — see published page>) |
| **NEW** | ඔයාට ලැබුණාද ✓ | 4824ms | [▶ play NEW](https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/repair-candidates/a134-sin27-2026-08-17/S0214L01.mp3?<presigned — see published page>) |

<small>old text as stored: `ඉංග්‍රීසිෙන්. 'ලැබුණා'. 'ලැබුණා ඒ ගාවෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ' ඉතින්. :`</small>

---

### 20. S0214L02 — *a good time*

Card (what the learner reads): **හොඳ ටයිමක්**

| | headword spoken | length | listen |
|---|---|---|---|
| **OLD** | සති අන්තේ ← **wrong** | 7200ms | [▶ play OLD](https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/63A76463-3F52-4A12-B6CD-BB333F5B594F.mp3?<presigned — see published page>) |
| **NEW** | හොඳ ටයිමක් ✓ | 4716ms | [▶ play NEW](https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/repair-candidates/a134-sin27-2026-08-17/S0214L02.mp3?<presigned — see published page>) |

<small>old text as stored: `ඉංග්‍රීසිෙන්. 'සති අන්තේ'. 'සති අන්තේ ලැබුණා ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ' ඉතින්. :`</small>

---

### 21. S0218L01 — *I didn't do much*

Card (what the learner reads): **මම ගොඩාක් දේ කළේ නෑ**

| | headword spoken | length | listen |
|---|---|---|---|
| **OLD** | මමා ඉරිදා ගොඩාක් දේ කළේ නෑ ← **wrong** | 8424ms | [▶ play OLD](https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/C45DC622-2DD8-4F8B-AC35-C4C99ECBA239.mp3?<presigned — see published page>) |
| **NEW** | මම ගොඩාක් දේ කළේ නෑ ✓ | 5184ms | [▶ play NEW](https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/repair-candidates/a134-sin27-2026-08-17/S0218L01.mp3?<presigned — see published page>) |

<small>old text as stored: `ඉංග්‍රීසිෙන්. 'මමා ඉරිදා ගොඩාක් දේ කළේ නෑ'. 'මමා ඉරිදා ගොඩාක් දේ කළේ නෑ ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ' ඉතින්. :`</small>

---

### 22. S0225L01 — *an answer*

Card (what the learner reads): **උත්තරයක්**

| | headword spoken | length | listen |
|---|---|---|---|
| **OLD** | ඔයාට දෙනවා ← **wrong** | 7416ms | [▶ play OLD](https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/F070E3D7-C62E-430B-95F1-362752FC6FB7.mp3?<presigned — see published page>) |
| **NEW** | උත්තරයක් ✓ | 4644ms | [▶ play NEW](https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/repair-candidates/a134-sin27-2026-08-17/S0225L01.mp3?<presigned — see published page>) |

<small>old text as stored: `ඉංග්‍රීසිෙන්. 'ඔයාට දෙනවා'. 'ඔහු ඔයාට දෙනවා ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ' ඉතින්. :`</small>

---

### 23. S0230L01 — *who wants to work with you*

Card (what the learner reads): **ඔයා එක්ක වැඩ කරන්නයි කැමති**

| | headword spoken | length | listen |
|---|---|---|---|
| **OLD** | කැමැති ← **wrong** | 6648ms | [▶ play OLD](https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/F9D565E5-92A7-4D51-9743-174AAB29E14F.mp3?<presigned — see published page>) |
| **NEW** | ඔයා එක්ක වැඩ කරන්නයි කැමති ✓ | 5472ms | [▶ play NEW](https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/repair-candidates/a134-sin27-2026-08-17/S0230L01.mp3?<presigned — see published page>) |

<small>old text as stored: `ඉංග්‍රීසිෙන්. 'කැමැති'. 'මමා දන්නවා ඒ ගෙ කැමැති ඒ ගෙ ඒ ගෙ ඒ ගෙ' ඉතින්. :`</small>

---

### 24. S0231L01 — *old*

Card (what the learner reads): **මහලු**

| | headword spoken | length | listen |
|---|---|---|---|
| **OLD** | මහලු ✓ | 6576ms | [▶ play OLD](https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/5636605E-6D1C-43A7-8BD2-5D584F327C30.mp3?<presigned — see published page>) |
| **NEW** | මහලු ✓ | 4464ms | [▶ play NEW](https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/repair-candidates/a134-sin27-2026-08-17/S0231L01.mp3?<presigned — see published page>) |

<small>old text as stored: `ඉංග්‍රීසිෙන්. 'මහලු'. 'මමා දන්නවා ඒ ගෙ මහලු ඒ ගෙ ඒ ගෙ ඒ ගෙ' ඉතින්. :`</small>

---

### 25. S0249L01 — *I want you to*

Card (what the learner reads): **මට ඕනේ ඔයා**

| | headword spoken | length | listen |
|---|---|---|---|
| **OLD** | මමා ඔයාට ඕනේ ← **wrong** | 7296ms | [▶ play OLD](https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/03A00C1D-04B6-4247-B9DE-292910D292DB.mp3?<presigned — see published page>) |
| **NEW** | මට ඕනේ ඔයා ✓ | 4824ms | [▶ play NEW](https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/repair-candidates/a134-sin27-2026-08-17/S0249L01.mp3?<presigned — see published page>) |

<small>old text as stored: `ඉංග්‍රීසිෙන්. 'මමා ඔයාට ඕනේ'. 'මමා ඔයාට ඕනේ ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ' ඉතින්. :`</small>

---

### 26. S0260L01 — *the faintest idea*

Card (what the learner reads): **කිසිම අදහසක්**

| | headword spoken | length | listen |
|---|---|---|---|
| **OLD** | කිසිම ← **wrong** | 6840ms | [▶ play OLD](https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/84573F8A-93D4-4905-9D6E-974ADC64F222.mp3?<presigned — see published page>) |
| **NEW** | කිසිම අදහසක් ✓ | 4788ms | [▶ play NEW](https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/repair-candidates/a134-sin27-2026-08-17/S0260L01.mp3?<presigned — see published page>) |

<small>old text as stored: `ඉංග්‍රීසිෙන්. 'කිසිම'. 'මමා ගාව කිසිම ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ' ඉතින්. :`</small>

---

### 27. S0261L01 — *it might be*

Card (what the learner reads): **ඒක වෙන්න පුළුවන්**

| | headword spoken | length | listen |
|---|---|---|---|
| **OLD** | වෙන්නට ඕනේ ← **wrong** | 8448ms | [▶ play OLD](https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/F06EC563-CC72-4C87-95FB-3CDC744D24CA.mp3?<presigned — see published page>) |
| **NEW** | ඒක වෙන්න පුළුවන් ✓ | 4932ms | [▶ play NEW](https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/repair-candidates/a134-sin27-2026-08-17/S0261L01.mp3?<presigned — see published page>) |

<small>old text as stored: `ඉංග්‍රීසිෙන්. 'වෙන්නට ඕනේ'. 'ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ වෙන්නට ඕනේ ඒ ගෙ ඒ ගෙ ඒ ගෙ ඒ ගෙ' ඉතින්. :`</small>

---

## How each new clip was checked

All 27 passed **six gates on the first take**, and two spare takes of each are held on disk in case you reject one by ear:

1. **Decodes** — no ffmpeg error.
2. **Plausible duration** — against the rate model fitted on 2,199 clean clips of this course and voice (`ms ≈ 3143 + 45.4 × chars`, residual sd 221ms). All 27 land within **1.4 sd**.
3. **Headword voiced** — every word of the headword appears in the provider's per-token boundary array. Duration alone cannot prove this: for the four-character headword මහලු the duration test is completely blind (z = 0.0), so this is checked per token, not by length. That gate is the reason I re-rendered rather than shipping the first batch.
4. **No truncation** — the final word ඉතින් present in the same boundary array.
5. **No filler regression** — zero `ඒ ගෙ` pairs voiced. This is the defect itself, so it gets a permanent gate rather than a one-off eyeball.
6. **No end click** — tail floor between **−87.6 and −88.4 dB** relative to each clip's own speech peak, against a −40 dB threshold. Comfortably clean.

Old clips were never touched: the new audio sits under a new S3 prefix, `repair-candidates/a134-sin27-2026-08-17/`, and nothing was overwritten or deleted. Make-before-break, in that order.

**The listen links above are presigned and expire 2026-08-24.** If you come to this later than that, ask and I will re-mint them.