# French, first 10 rounds — have a listen

**What I am asking you for: play the two repairs in §2, then sample §3, and say go or no.** Nothing has been relinked. The course is exactly as it was.

---

## 1 · What we already own, and what actually needed making

I checked every clip slot in the first 10 rounds against the whole estate before spending anything — not just whether a clip exists, but whether it is any good, measured on the bytes the app actually serves.

**Your hunch was half right, and the half that is wrong is the more useful half.**

| | English (known) side | French (target) side |
|---|---|---|
| Distinct clips needed | 61 | 104 |
| Slots they fill | 85 | 116 |
| **Already exists elsewhere, same voice** | **27** (44%) | **0** (0%) |
| Same words, but a different voice/accent | 28 | 104 |
| Our own clip is healthy | 59 | 104 |
| Our own clip is damaged | **2** | **0** |

On the **English side you were right**: 27 of the 61 English prompts already exist in Eve's voice in other courses — German, Spanish, Korean, Japanese, Austrian German. We genuinely do not need to buy those again.

On the **French side there is nothing to reuse at all.** The French sentences do exist elsewhere — in Canadian French, and in the older Azure voices used by French-for-Japanese and French-for-Chinese — but every one of them is a different accent or a different generation. Adopting them would change how the course sounds. So that 100%-looking number is a mirage and I have not counted it as a saving.

**But the finding that actually decides tonight is this one:** almost nothing in the first 10 rounds is broken.

Of the 165 distinct clips behind these rounds, **2 failed** when I fetched and measured them. All 104 French clips are fine. The job that was queued at 01:01 tonight would have re-rendered every clip in the course; the measurement says the first 10 rounds needed **two**.

The one empty slot I found is not a gap — S0003L02 is "to speak" appearing a second time, and a repeated LEGO correctly has no introduction of its own.

### If you want to widen it

The checking costs nothing, so I ran it over a much bigger slice too — **seeds 1-10, which is 1,216 slots against the 202 in the ten rounds.** Same answer, six times the size:

| | First 10 rounds | Seeds 1-10 |
|---|---|---|
| Slots | 202 | 1216 |
| Distinct clips | 165 | 1022 |
| Healthy | 163 | 1008 |
| **Damaged — would need rendering** | **2** | **14** |
| English reusable from other courses | 27 | 128 |

So widening from 10 rounds to 10 seeds takes the repair from 2 clips to 14 — still pennies. **3 of the 655 French clips are damaged; the rest of the damage is on the English side.** Say the word and I will do that slice on the same terms: render, publish, you listen, nothing relinked until you say so.

### One more thing worth your ear

German's English side was rebuilt yesterday on the current generation, and French shares a lot of it: **25 of the 61 English prompts here exist as a German clip in the same voice, and 21 of those play back clean.** For tonight that saves nothing, because our own French-course copies are already healthy. It matters for the *next* course we build — and it is the first hard evidence that the shared-English-side idea actually pays.

---

## 2 · The two repairs — this is the actual decision

Both are English prompts. Both were noticeably rushed against every other clip in the same voice. One of them was genuinely missing words.

### "I want to speak French with you"

**This one was broken.** Transcribing the shipped clip gives *"I want to speak French."* — the words **"with you" are simply not in the audio**. This is the same fault class as the "as often as possible" clip you caught yesterday, and it is held in the same place: a practice-phrase row, which a seed-range sweep does not reach.

**Now (shipped):** 1270ms — 31% short of the ~1849ms its siblings run at

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/839D116B-09F3-470D-A56F-23BB0FE72E88.mp3

**Proposed replacement:** 1680ms, transcribes back correct

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/pilot/fra-r10-2026-08-07/i-want-to-speak-french-with-you.mp3

### "I want to learn with you"

**This one says all its words**, but delivers them a third faster than every other clip in Eve's voice. Worth your ear rather than my measurement — you have been clear that fast-but-complete is still wrong.

**Now (shipped):** 1002ms — 34% short of the ~1522ms its siblings run at

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/F0E859BD-1F77-4906-BC3F-94108C367600.mp3

**Proposed replacement:** 1392ms, transcribes back correct

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/pilot/fra-r10-2026-08-07/i-want-to-learn-with-you.mp3

---

## 3 · The first 10 rounds as they stand

Nothing here has been touched. This is the audio the course serves right now, in course order — the introduction, then the English, then the two French takes.

### Round 1 — "I want" → "je veux"

Introduction

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/90D2CB79-7FD3-4915-ABDC-E5EADAF4F5A9.mp3

English — "I want"

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/B1D7E237-A0CC-499F-B1F8-A04EB650CDD3.mp3

French, Eve — "je veux"

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/2430014C-9896-41DE-B4C4-2E9CD096AEA9.mp3

French, Leo — "je veux"

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/6335803F-C83D-4152-A49A-773F4C5DE180.mp3

### Round 2 — "to speak" → "parler"

Introduction

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/2579D40B-4679-4BD0-AF92-507B3BF69335.mp3

English — "to speak"

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/AE5B665B-73A9-4260-9901-3D49C19BC42E.mp3

French, Eve — "parler"

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/EE7B10AE-DB59-44B4-9EB8-165EC8D56ABA.mp3

French, Leo — "parler"

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/603256D7-C593-4D80-AA9F-CE3E98728E0F.mp3

### Round 3 — "French" → "français"

Introduction

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/A7F14959-62D3-45C0-B098-6D958B694A1E.mp3

English — "French"

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/1FAA54B8-80C4-4624-9241-817CBE94BF55.mp3

French, Eve — "français"

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/E3FC37E2-8F8A-4B02-B858-362A9BE2BB1A.mp3

French, Leo — "français"

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/2F3DEF0B-299B-423F-9D6C-385654DF3289.mp3

### Round 4 — "with you" → "avec toi"

Introduction

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/A2791327-20CA-4F5C-A243-E153BF9271B2.mp3

English — "with you"

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/5F7E77B2-E36F-4418-964D-AF08E1966203.mp3

French, Eve — "avec toi"

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/02CB6246-AEF6-4880-AC88-039F5B579522.mp3

French, Leo — "avec toi"

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/F789B5CD-0DC7-4C65-BAC3-720B919ED22E.mp3

### Round 5 — "now" → "maintenant"

Introduction

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/F507AFF5-1994-471E-B20C-3DDA52EA6776.mp3

English — "now"

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/1A39BA6E-1FB3-4634-A42E-877D5A4822B1.mp3

French, Eve — "maintenant"

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/2C24CA71-942B-4767-8F24-D382F1F9CCFE.mp3

French, Leo — "maintenant"

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/444FC3C3-9A2F-43BF-A6F7-D7733A530A61.mp3

### Round 6 — "to learn" → "apprendre"

Introduction

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/45C9E1A7-B2ED-4C60-8475-835E2ACA2DBB.mp3

English — "to learn"

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/A812E6B9-BD00-4AF1-9372-75E9279101A3.mp3

French, Eve — "apprendre"

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/4F6D23F6-A998-47F0-AC49-44924DD3AA49.mp3

French, Leo — "apprendre"

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/316C6B15-72D4-4009-BE84-85AC30A7E5A9.mp3

### Round 7 — "I'm trying to" → "j'essaie de"

Introduction

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/55A2E916-CAD6-4DD7-AF07-53170A66B205.mp3

English — "I'm trying to"

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/0E72ECCA-49D9-40E5-AA00-FD495A4195AC.mp3

French, Eve — "j'essaie de"

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/AAC7CD58-09BB-4C31-A7CD-ED6FF6956784.mp3

French, Leo — "j'essaie de"

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/7EEDC621-9EDD-40DF-AD5E-3DEA2635ACC5.mp3

### Round 8 — "I'm trying to learn" → "j'essaie d'apprendre"

Introduction

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/ADD4D03C-93A6-45A4-92D5-B8124F196449.mp3

English — "I'm trying to learn"

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/C8EB47C1-34F9-4992-A867-2E504D30FC33.mp3

French, Eve — "j'essaie d'apprendre"

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/1C7FEF32-3EC5-4855-B660-CD3B7499A820.mp3

French, Leo — "j'essaie d'apprendre"

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/78289411-78D5-4768-9A5A-607484C1E939.mp3

### Round 9 — "how" → "comment"

Introduction

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/6329F3F1-3940-4CD8-80B0-0C0AB866AC2F.mp3

English — "how"

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/EFBC7D46-7FDF-46E6-A123-E887E9A91AB7.mp3

French, Eve — "comment"

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/8BFC5453-540E-4F12-88FF-3AEE2A4C49A7.mp3

French, Leo — "comment"

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/26BD5D95-2BB2-4930-BDEF-85B0BC5EE71A.mp3

### Round 10 — "to speak" → "parler"  *(repeat of an earlier round — no introduction, by design)*

English — "to speak"

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/AE5B665B-73A9-4260-9901-3D49C19BC42E.mp3

French, Eve — "parler"

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/EE7B10AE-DB59-44B4-9EB8-165EC8D56ABA.mp3

French, Leo — "parler"

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/603256D7-C593-4D80-AA9F-CE3E98728E0F.mp3

---

## 4 · Phrases, rounds 1-2

The lego clips above are the skeleton; these are what the learner spends most of the round hearing. Both repairs in §2 live in this layer, which is why it matters that a seed-range sweep cannot see it.

**BUILD** — "I want" → "je veux"

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/B1D7E237-A0CC-499F-B1F8-A04EB650CDD3.mp3

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/2430014C-9896-41DE-B4C4-2E9CD096AEA9.mp3

**BUILD** — "I want to speak" → "je veux parler"

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/34635AED-93A2-4FA1-B517-37444EA2BE30.mp3

https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/3D1DB0C0-1AF9-46D3-9347-775B8E26D313.mp3

---

## 5 · What I have not done

- **Nothing is relinked.** The two new clips sit in a scratch folder. The course still serves the old ones.
- **Nothing is deleted.** No row, no object.
- **Nothing beyond round 10** has been rendered.

**If you say go**, I swap those two clips in — new ids, so caches cannot serve you the old bytes — and run the same measurement wider. **If you say no**, nothing happens and the scratch folder is the only trace.

One thing I could not settle by measurement: the second clip says all its words and is only fast. I have treated fast-as-wrong because you have ruled that way before, but it is your ear that decides it.