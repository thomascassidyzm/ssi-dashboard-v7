# Seed 15 — what German and Japanese lose when "want you to" is flattened

**30 August 2026. Evidence only. This document does not rule on anything.**

## What you are looking at

Seed 15 of every SSi course is the same English sentence: *and I want you to speak <language> with me tomorrow*. It is a sentence where the wanter and the doer are **different people** — I want, you speak.

The question is whether the target sentence still says that. In **German** and **Japanese** it does not. In both courses, seed 15's target says *I want to speak with you* — same person doing both. Everything below is the evidence for that, pulled live from the database on 30 August 2026, with the ids so you can check any of it.

Two readings of what this means are set out at the end. I have not picked between them; that is your call.

**One thing worth knowing before you read.** The number 15 in "seed-15" turned out to be literal: it is seed_number 15 in both courses, and the same sentence in all 78 `*_for_eng` courses. Of those 78, German and Japanese are the **only two** whose target drops the different-subject reading. Every other course keeps it, including the three other German courses.

---

## 1. German — the pair that shows it

Seed 1 and seed 15 of `deu_for_eng` are the same sentence with the people swapped round on the English side. On the German side they are the same sentence with the time word swapped.

| | known text | target text |
|---|---|---|
| `deu_for_eng` seed 1 | i want to speak German with you now | Ich will jetzt mit dir Deutsch sprechen |
| `deu_for_eng` seed 15 | and I want you to speak German with me tomorrow | und ich will morgen mit dir Deutsch sprechen |

Back-translation of seed 15's target, honestly: **"and I want to speak German with you tomorrow."**

Two things changed on the English side between seed 1 and seed 15 — the person who does the speaking, and the person who is spoken with. Neither change reached the German. *mit dir* — "with you" — is still there in seed 15, where the English says *with me*. So the target does not merely lose the different-subject reading; it also keeps the wrong one of the two people.

**What the learner can build from it.** Seed 15 introduces exactly one new LEGO:

- `deu_for_eng` S0015L01 — type A — known "and" → target "und"

That is the whole of seed 15's new material. The rest of the sentence is reused from seed 1's LEGOs — S0001L01 "I want"/"ich will", S0001L02 "to speak"/"sprechen", S0001L03 "German"/"Deutsch", S0001L05 "with you"/"mit dir". There is no LEGO anywhere in seed 15 that carries "you to", "want you to", "dass", or "mit mir". The learner finishes the round able to say *ich will … mit dir … sprechen* and nothing else.

The practice phrases confirm it. Every phrase attached to S0015L01 has had the English quietly rewritten to the same-subject version. Some of them, exactly as stored:

| role | known text | target text |
|---|---|---|
| build | And I want to speak | Und ich will sprechen |
| use | And I'd like to speak German with you tomorrow | Und ich möchte morgen mit dir Deutsch sprechen |
| use | And I want to practise speaking with someone else tomorrow | Und ich will morgen mit jemand anderem sprechen üben |
| use | And you speak German very well | Und du sprichst sehr gut Deutsch |

The seed's own English — "I want **you** to speak" — appears in none of them. That phrase bank is a same-subject bank. Note the second row especially: *Und ich möchte morgen mit dir Deutsch sprechen* is seed 15's own target sentence with *will* changed to *möchte*, and its English prompt is the same-subject one.

**When German does get the construction.** It does get it, 154 seeds later:

| lego id | known text | target text | components as stored |
|---|---|---|---|
| `deu_for_eng` S0169L01 | what do you want me to do | was willst du, dass ich mache | "what do you want" → "was willst du," ; "me to do" → "dass ich mache" |
| `deu_for_eng` S0170L01 | I would like you to tell me | ich möchte, dass du mir sagst | — |
| `deu_for_eng` S0238L01 | he wanted you to | er wollte, dass du | — |
| `deu_for_eng` S0249L01 | you to help me | dass du mir hilfst | "you to" → "dass du" ; "help me" → "mir hilfst" |

Seed 249 is the clean case. Its known side and target side both say the different-subject thing, and the split is a genuine hinge: **"you to" → "dass du"** is a part the learner can pull out and reuse with any other verb. The seed sentence is *I want you to help me before you go* → *Ich will, dass du mir hilfst, bevor du gehst*.

So German is not incapable of this and the course is not avoiding it. It has the construction, decomposed properly, from seed 169 onwards. The gap is seeds 15 to 168.

---

## 2. Japanese — the same shape, and a target that is character-for-character identical

| | known text | target text | roman |
|---|---|---|---|
| `jpn_for_eng` seed 1 | I want to speak Japanese with you now | 今、一緒に日本語を話したい | ima, issho ni nihongo o hanashitai |
| `jpn_for_eng` seed 15 | and I want you to speak Japanese with me tomorrow | 明日も一緒に日本語を話したい | ashita mo issho ni nihongo o hanashitai |

Back-translation of seed 15's target, honestly: **"tomorrow too, I want us to speak Japanese together."** The verb is 話したい — the plain ~たい desiderative, which in Japanese can only express the speaker's own desire to do the thing. It cannot mean "I want you to do it". *with me* has become 一緒に, "together", which is a reasonable rendering of the togetherness but carries none of the "you do the speaking" instruction.

Seed 15 introduces one new LEGO:

- `jpn_for_eng` S0015L01 — type A — known "tomorrow too" → target 明日も (ashita mo)

**This is the strongest single row in the document.** Seed 15's target string is *character-for-character identical* to one of its own practice phrases, which carries a different English prompt:

| | known text | target text |
|---|---|---|
| `jpn_for_eng` seed 15 (the seed) | and I want you to speak Japanese with me tomorrow | 明日も一緒に日本語を話したい |
| `jpn_for_eng` seed 15, lego_index 1, role **use** | I want to speak Japanese together tomorrow too | 明日も一緒に日本語を話したい |

I ran an exact-string search across `jpn_for_eng` phrases for that target; that USE phrase is the only match, and it sits in the same seed. Two different English prompts, one identical Japanese sentence, in the same round. The learner meets both.

The rest of seed 15's phrase bank is same-subject throughout, exactly as stored:

| role | known text | target text | roman |
|---|---|---|---|
| build | want to speak tomorrow too | 明日も話したい | ashita mo hanashitai |
| use | I want to speak Japanese tomorrow too | 明日も日本語を話したい | ashita mo nihongo o hanashitai |
| use | I want to speak together tomorrow too | 明日も一緒に話したい | ashita mo issho ni hanashitai |
| use | I'll try speaking Japanese tomorrow too | 明日も日本語で話してみる | ashita mo nihongo de hanashite miru |

**When Japanese does get the construction.** Also seed 169 onwards, using ~てほしい as expected:

| lego id | known text | target text | roman |
|---|---|---|---|
| `jpn_for_eng` S0169L01 | want me to | してほしい | shite hoshii |
| `jpn_for_eng` S0170L01 | I'd like you to | てほしい | — |
| `jpn_for_eng` S0249L01 | want you to help me | 手伝ってほしい | — |
| `jpn_for_eng` S0432L02 | want you to ask | 聞いてほしい | — |

Seed 249's phrase bank is a good one and worth seeing, because it is what seed 15 does not have:

| role | known text | target text |
|---|---|---|
| build | want you to help me | 手伝ってほしい |
| use | I want you to help me now | 今、手伝ってほしい。 |
| use | I want you to help me before you go | 行く前に、手伝ってほしい。 |
| use | I think I want you to help me | 手伝ってほしいと思う。 |

**One honest complication on the Japanese side, which cuts against the simplest version of the story.** ほしい does not mark who is being asked, and it does not need to. Within `jpn_for_eng` S0169L01 the same target form serves both English directions, and both are correct Japanese:

| role | known text | target text | roman |
|---|---|---|---|
| build | what do you want me to do? | 何をしてほしい？ | nani o shite hoshii? |
| build | I want you to do that | それをしてほしい | sore o shite hoshii. |

That is not a fidelity failure — a question with ほしい naturally asks about the addressee's wish, a statement expresses the speaker's. So the Japanese problem at seed 15 is **not** "the person is unmarked". It is specifically that ~たい was used where ~てほしい was needed: 話したい can only be the speaker doing the speaking. The two are different constructions, not two levels of explicitness.

There is also `jpn_for_eng` seed 61, USE phrase, known "I want you to say that again" → もう一度言って (*moo ichido itte*) — a plain request form, "say it again". Different flattening, same direction of loss: the wanting disappears and it becomes an instruction.

---

## 3. What the other 76 courses do at the same seed

I read the seed row of all 78 `*_for_eng` courses at seed_number 15. German and Japanese are the only two that lose it. A sample, targets exactly as stored:

| course | target text at seed 15 |
|---|---|
| `fra_for_eng` | et je veux que tu parles français avec moi demain |
| `spa_for_eng` | y quiero que hables español conmigo mañana |
| `nld_for_eng` | en ik wil dat je morgen Nederlands met me spreekt |
| `deu_at_for_eng` | und i wü, dass'd morgn mit mir Deitsch redst |
| `deu_ch_for_eng` | Und ich wott, dass du morn mit mir Schwiizerdütsch redsch. |
| `pdc_for_eng` | Un ich will, as du mariye mit mir Deitsch schwetzscht. |
| `zho_for_eng` | 我也想你明天和我说中文 |
| `kor_for_eng` | 그리고 내일 저와 한국어로 말해 주면 좋겠어요 |
| `tur_for_eng` | Ve yarın benimle Türkçe konuşmanı istiyorum. |
| `gle_for_eng` | agus tá mé ag iarraidh go labhróidh tú Gaeilge liom amárach |

The three other German courses all use the dass-clause at seed 15, and two of them decompose it into a reusable hinge — which is direct evidence that the split is buildable at that point in a course, in a language with exactly German's grammar:

| lego id | known text | target text | components as stored |
|---|---|---|---|
| `deu_at_for_eng` S0015L03 | I want you to | i wü, dass'd | "I want" → "i wü" ; "that you" → "dass'd" |
| `nld_for_eng` S0015L02 | I want you to | ik wil dat je | "I want" → "ik wil" ; "that" → "dat" ; "you" → "je" |
| `fra_for_eng` S0015L03 | I want you to speak | je veux que tu parles | "I want" → "je veux" ; "that you speak" → "que tu parles" |
| `spa_for_eng` S0015L02 | I want you to speak | quiero que hables | single component, not split further |

Note that `spa_for_eng` keeps the meaning but does **not** split it into a reusable hinge — its M-LEGO has one component covering the whole thing. So "keeps the meaning" and "splits it into parts" are two separate axes, and Spanish sits between the German/Japanese case and the Austrian/Dutch/French case.

**Where this evidence is thin.** For those 76 other courses I read only the seed row, not their LEGOs or phrases — except the five in the table above. So I can say their seed 15 target keeps the different-subject meaning; I cannot say how many of them decompose it usefully. That would be a separate read.

---

## 4. Two readings

I present both. I do not pick.

### Reading A — deliberate deferral

Seed 15 sits fifteen sentences into a course. The German dass-clause needs a subordinate finite verb with person agreement, and the Japanese ~てほしい needs the te-form plus a second desiderative construction — neither is fifteen-sentences-in material, so the seed was written to a target the beginner can actually produce with the LEGOs already introduced, and the fidelity is handed over later at seed 169. On this reading the English prompt is a controlled-language artefact that is slightly ahead of the target, the learner is never taught anything false about German or Japanese, and the construction arrives properly decomposed when they can carry it.

**What would have to be true for A to be the right reading**: that no learner is asked to produce a target that means something other than the prompt they hear, or that being asked to is an acceptable price for early producibility. **What in the evidence supports A**: both courses do acquire the construction, decomposed cleanly, at seed 169 and after — `deu_for_eng` S0249L01 "you to" → "dass du" and `jpn_for_eng` S0249L01 手伝ってほしい are exactly what the methodology would want. The deferral is real and it is honoured.

### Reading B — defect class needing a fidelity rule

The learner hears "and I want **you** to speak German with **me** tomorrow" and is asked to produce a sentence that means "and I want to speak German with **you** tomorrow". That is not a simplification of the prompt; it is a different sentence, and in the German case the pronoun is not merely dropped but reversed. In Japanese two different English prompts within the same round land on one identical target string, so the learner is being trained that those two English sentences are the same thing.

**What would have to be true for B to be the right reading**: that the known prompt is a promise about what the target means, and that a target which does not honour that promise is a defect regardless of how early it is. **What in the evidence supports B**: the character-identical Japanese pair at seed 15; the surviving *mit dir* in the German where the English says *with me*; the fact that every one of seed 15's practice phrases in both courses has had its English rewritten to the same-subject version, so the seed sentence's own English is orphaned; and 76 of 78 courses — including three other German courses, two of which split it into a reusable hinge at that same seed — doing it without the loss.

---

## 5. Where the evidence is thin or absent

- I read seeds 1, 5, 13-16, 169, 249 and 432 closely in the two named courses, plus every LEGO from seeds 1 to 16 in both, plus every phrase whose known side contains "want <someone> to". I did not read seeds 17 to 168 phrase by phrase, so if the construction appears somewhere in that range with a different treatment, I have not seen it.
- I did not check whether the learner ever hears the seed 15 English prompt against the seed 15 target in the app, versus only hearing the rewritten same-subject phrases. That is a player-side read and would change how much the seed-level mismatch actually matters in practice.
- For 73 of the 78 other courses I read only the seed target, not the decomposition.
- I did not look at any language other than English on the known side.

---

## Noticed in passing, not part of this question

- `deu_for_eng` seed 115, USE phrase: known "I wanted to ask if you want me to lead the conversation tonight at home" → target "Ich wollte fragen ob du willst dass ich heute Abend das Gespräch führen kann". The target has an extra *kann* the English does not have.
- `deu_for_eng` seed 568, USE phrase: known "I want us to meet" → target "ich will uns treffen". Same flattening pattern, and the German reads oddly.
- `jpn_for_eng` seed 98 has a USE phrase 行く前に、手伝ってほしい whose LEGO 手伝ってほしい is not introduced until seed 249. Possibly a forward reference; I did not verify whether 手伝う arrives earlier by another route.

---

*Read live from `course_seeds`, `course_legos` and `course_practice_phrases` on 30 August 2026. Nothing in this job wrote to the database or changed any course content. Every row above is quoted exactly as stored, including its punctuation and capitalisation.*
