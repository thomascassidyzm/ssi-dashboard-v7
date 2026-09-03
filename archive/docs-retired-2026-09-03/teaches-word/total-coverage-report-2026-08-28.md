# Every phrase must practise its word — the measurement

**28 August 2026.** Survey only: nothing was written to the database, no phrases were authored, no audio was touched.

## The rule this measures

Kai's rule, which supersedes every earlier version: **every practice phrase attached to a lesson must contain the taught word — build phrases and use phrases, all of them.** Not "at least one". A lesson with one good build rung and six sentences that never touch the word is defective.

"Contains" is judged asymmetrically. On the **target side** it is strict: the phrase must carry the taught word in exactly the form introduced, and inflected forms do not count. A multi-word chunk may be interrupted, but every one of its words must be present in the taught form. Only variation a learner would barely perceive — a mild softening mutation, a slight vowel or ending difference — is tolerable. On the **known side** the test is automaticity: it passes if the learner makes the connection instantly.

## Why this had to be re-run

The earlier check asked a weaker question — does *any* build phrase contain the word — and looked at **build phrases only**. Use phrases, which are two-thirds of all practice material, were never examined. Every number it produced was a floor.

## Headline

- **52,172 lessons** checked across **49 courses**, every one confirmed to exist in the live database.
- **448,898 practice phrases** read — build and use.
- **839 defective lessons** under the total rule, against a floor of **291** under the old build-only rule. **2.9 times larger.**
- **3,289 phrases fail** — 1,108 build and 2,181 use. Two-thirds of the defect was invisible to the old check because it never looked at use phrases.
- **91 lessons fail on every single phrase they have.** Those lessons never practise their own word at all.

## How the funnel worked

| Stage | Count |
|---|---|
| Practice phrases in scope (build + use) | 448,898 |
| Cleared mechanically — the taught chunk is present token-for-token | 444,846 |
| Handed to readers because the machine could not be certain | 4,052 |
| Confirmed defective by a reader | **3,289** |
| Cleared by a reader (inflection, elision, contraction the machine could not see) | 763 |
| Lessons with at least one confirmed failing phrase | **839** |

The mechanical stage was built so it can only ever *clear* a phrase, never convict one. Everything it could not clear went to cheap reader agents judging against the acceptance rule in plain words — no per-language ending lists, no morphology tables.

## Is the number trustworthy?

**Calibration.** Of the defects confirmed by hand earlier the same day, 166 fall inside this scope. This check flags **144 of them**. The 22 it does not flag I read against live rows: every one had its lesson label repaired at 21:40 that evening — `deine Hilfe` became `deine`, `diesen Koffer` became `diesen`, `sont beaux` became `beaux` — so they are genuinely closed, not missed. No known-real open defect escapes.

**Hand verification.** I pulled 15 confirmed defects at random and read the live rows myself. **14 of 14 that returned rows survive.** Verbatim:

- Arabic teaches `أَبْكَرَ مِمّا` ("earlier than"); its build phrase is `اسْتَيْقَظْتُ أَبْكَرَ اليَوْم` — `مِمّا` is absent.
- Spanish teaches `de la misma manera`; the phrase is `Es lo mismo de lo que estábamos hablando y es importante saberlo` — the chunk appears nowhere.
- Mexican Spanish teaches `están intentando`; the phrase is `nos dijeron que están aquí` — `intentando` is gone.
- Portuguese teaches `as minhas chaves`; the phrase is `não consigo encontrar as minhas coisas` — the keys became things.
- Lebanese Arabic teaches `تعرف`; its first build phrase is `تفهم` — a different verb under the same English gloss.
- French teaches `ce que vous avez dit madame`; the phrase is `elle sait ce que vous avez dit` — the English gloss still says "madam", the French has dropped it.
- Spanish teaches `somos amigos`; the phrase is `Somos personas que estamos intentando` — `amigos` never appears.

**Reader reliability, measured not assumed.** Two Korean batches were accidentally read twice by independent readers. Across those 353 double-read lines, the two readings **agree 95.5% of the time** (337 agree, 16 differ), and every disagreement runs the same way — one reader failing what the other cleared. So the confirmed count carries roughly a ±5% reader band, concentrated in Korean.

**The honest zeros.** Nine courses returned no defects at all. A zero usually means "did not look", so I checked two against live rows: Swiss German and Chinese-for-Tamil teach single-word lessons and every phrase genuinely contains its word. The zeros are real.

## Per course, worst first

| Course | Lessons | Phrases | Defective lessons | Old floor | Failing build | Failing use |
|---|---:|---:|---:|---:|---:|---:|
| German for English speakers | 1,422 | 12,954 | **137** | 68 | 252 | 465 |
| Korean for English speakers | 1,398 | 12,461 | **110** | 38 | 145 | 292 |
| Spanish (Spain) for English speakers | 1,383 | 15,205 | **63** | 11 | 105 | 184 |
| Italian for English speakers | 1,384 | 12,275 | **58** | 9 | 49 | 101 |
| Chinese for English speakers | 1,114 | 10,543 | **50** | 18 | 112 | 215 |
| Mexican Spanish for English speakers | 1,307 | 11,966 | **42** | 19 | 95 | 173 |
| English for Tamil speakers | 1,390 | 10,936 | **40** | 2 | 22 | 47 |
| French for English speakers | 1,537 | 14,118 | **38** | 28 | 62 | 100 |
| Brazilian Portuguese for English speakers | 1,437 | 12,057 | **38** | 26 | 20 | 138 |
| Arabic (MSA) for English speakers | 1,384 | 11,340 | **34** | 24 | 65 | 99 |
| English for Japanese speakers | 677 | 10,108 | **22** | 0 | 15 | 21 |
| Japanese for English speakers | 1,275 | 10,583 | **22** | 8 | 9 | 37 |
| English for Telugu speakers | 1,428 | 10,859 | **18** | 0 | 0 | 22 |
| Lebanese Arabic for English speakers | 1,422 | 11,520 | **17** | 4 | 15 | 30 |
| Portuguese (Portugal) for English speakers | 1,361 | 12,639 | **16** | 7 | 30 | 45 |
| Egyptian Arabic for English speakers | 1,341 | 10,812 | **14** | 0 | 2 | 19 |
| English for Hindi speakers | 1,274 | 10,599 | **12** | 0 | 4 | 14 |
| English for German speakers | 604 | 4,937 | **9** | 0 | 9 | 22 |
| English for Italian speakers | 596 | 4,982 | **9** | 1 | 11 | 20 |
| English for Urdu speakers | 1,158 | 9,746 | **9** | 0 | 3 | 10 |
| Spanish for Chinese speakers | 584 | 4,446 | **9** | 10 | 0 | 9 |
| English for Sinhala speakers | 1,241 | 10,506 | **8** | 0 | 3 | 12 |
| English for Chinese speakers | 502 | 4,392 | **8** | 3 | 15 | 30 |
| English for Korean speakers | 545 | 4,678 | **7** | 3 | 13 | 14 |
| English for Gujarati speakers | 1,424 | 11,628 | **6** | 0 | 2 | 6 |
| English for Spanish speakers | 602 | 4,898 | **6** | 0 | 8 | 9 |
| English for Punjabi speakers | 1,263 | 10,621 | **5** | 0 | 4 | 6 |
| English for Portuguese speakers | 614 | 5,104 | **5** | 0 | 2 | 3 |
| German for Japanese speakers | 633 | 4,918 | **4** | 5 | 3 | 8 |
| English for Bengali speakers | 1,281 | 10,632 | **4** | 0 | 4 | 3 |
| English for Marathi speakers | 1,389 | 11,574 | **4** | 1 | 7 | 7 |
| French for Japanese speakers | 667 | 5,472 | **4** | 0 | 6 | 12 |
| Italian for Japanese speakers | 582 | 4,866 | **4** | 0 | 5 | 9 |
| English for Arabic speakers | 592 | 4,975 | **3** | 0 | 3 | 0 |
| English for French speakers | 639 | 5,240 | **3** | 0 | 4 | 5 |
| Korean for Tamil speakers | 1,505 | 12,225 | **3** | 0 | 0 | 6 |
| Korean for Hindi speakers | 1,502 | 12,507 | **2** | 0 | 1 | 5 |
| German for Chinese speakers | 676 | 5,204 | **1** | 3 | 1 | 5 |
| French for Chinese speakers | 616 | 4,967 | **1** | 1 | 1 | 0 |
| Italian for Chinese speakers | 626 | 4,874 | **1** | 1 | 1 | 0 |
| Austrian German for English speakers | 1,253 | 11,251 | **0** | 0 | 0 | 0 |
| Swiss German for English speakers | 1,390 | 11,551 | **0** | 0 | 0 | 0 |
| English for Kannada speakers | 1,443 | 11,973 | **0** | 0 | 0 | 0 |
| Quebec French for English speakers | 1,351 | 11,007 | **0** | 0 | 0 | 0 |
| Portuguese for Japanese speakers | 741 | 6,038 | **0** | 0 | 0 | 0 |
| Spanish for Japanese speakers | 630 | 7,256 | **0** | 0 | 0 | 0 |
| Chinese for Hindi speakers | 1,353 | 11,714 | **0** | 0 | 0 | 0 |
| Chinese for Japanese speakers | 475 | 3,883 | **0** | 1 | 0 | 0 |
| Chinese for Tamil speakers | 1,161 | 9,858 | **0** | 0 | 0 | 0 |

## What the failures actually are

The dominant failure is **not** inflection. It is **substitution**: the sentence frame is kept and the taught word swapped out for another. Readers found this independently in six languages.

- Spanish teaches `despertarnos en medio de la noche`; every one of its 13 phrases says only `despertarnos`.
- French-for-Japanese teaches `je peux me souvenir`; all eight phrases use a different verb — parler, dire, expliquer.
- Mexican Spanish teaches `nos dijeron`; all ten phrases say `nos dijo`.
- Korean teaches `모든 답을` ("all the answers"); `모든` is in every phrase and `답을` is in none — it is always `문제` or `방법`.
- Chinese teaches `他可以`; a phrase reads `他说我可以待着`, where both characters appear but `他` belongs to "said" and `可以` to "I", so the chunk never forms.

Three named patterns worth acting on as patterns rather than one-by-one:

**Honorific-address lessons.** Lessons that teach a chunk including `madame`, `monsieur`, `mein Herr`, `سَيِّدَتي` or `여사님`, whose phrases then drop the honorific or swap in the other one. At least eight lessons in French alone, and the same shape in German and Arabic.

**Mislabelled lessons.** Some failures are the lesson name, not the phrases. Italian S0599L01 teaches `sarebbe` while all eight phrases use `sarei` and every English gloss says "I would have been" — the label is wrong. German-for-Chinese has a lesson teaching `ob` ("whether") whose six phrases are all direct questions with no `ob` anywhere. This is the same class as the over-long-label repair applied earlier that day, and it is fixed by renaming, not by writing phrases.

**Build-ladder fragments.** 391 of the 3,289 failures — 12% — are build rungs that are a *proper part* of the taught chunk: French teaches `elle a été très gentille` and rung two is `très gentille`. That is how a ladder climbs. Under the total rule as written these are defective, and I have not quietly excluded them; they are counted, and named here so the size of the class is visible.

## Three judgement calls I am flagging for Kai to settle

None of these were resolved unilaterally, and none needs a re-run to change — the verdicts are stored per phrase, so any of them can be re-decided and the totals recomputed.

1. **Portuguese pro-drop.** Brazilian Portuguese teaches `eu não entendo` and the phrases idiomatically drop `eu`. Failed, because `eu` is a real word of the taught chunk and it is absent rather than softened — but pro-drop is not in the granted slack list and this is a meaningful slice of the Brazilian Portuguese number.
2. **Korean honorific `-시-`.** `원해요` → `원하세요`, `가고` → `가시고`. Failed as a real inflection, but it is a very regular alternation and Korean particles are already granted slack.
3. **German compounding.** Teaches `am Sonntag`, phrase says `Am Sonntagmorgen`. Failed, because compounding makes a different noun — but it is close in shape to the segmentation slack already granted elsewhere.

## What it would take to fix

Kai's ruling is that adding phrases is a positive good, and that a use phrase is never promoted into the build range to fill a gap — build and use are different kinds of phrase. So the repair is written text, of the right kind, in the right place.

**3,289 phrases need writing: 1,108 build and 2,181 use.** Every one of the 839 defective lessons is listed on the companion page with its taught word, how many of its phrases fail, an example failure, and how many phrases of each kind it is short of.

Two subtractions to make before commissioning that writing: the mislabelled lessons (fixed by renaming, and a content decision, not a mechanical one) and the 391 build-ladder fragments, if Kai decides a rung that builds toward the chunk is not a defect.

## What this survey did not check

The known side was shown to readers as context but was **never used to convict**. Every verdict here is a target-side judgement. A phrase whose target carries the taught word but whose known gloss has drifted would pass this survey — that is a different defect and needs its own measurement.
