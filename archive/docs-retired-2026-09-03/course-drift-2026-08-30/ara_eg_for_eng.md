# ara_eg_for_eng — pronoun drift: proposed drill rewrites

*Egyptian Arabic for English speakers. Proposal only — nothing applied, no DB writes, no commits.*  
*Course-wide pass, 2026-08-30.*

---

## Headline

I read all **394** drill lines where the drill spells out a subject pronoun that its own lesson drops. I propose changing **352** and I am refusing **42**.

Every proposed change is the same single edit: delete the explicit subject pronoun (أنا / إحنا / إنت / إنتي / إنتو / هو / هي / هم) and leave every other character alone. Egyptian marks person on the verb, so in these lines the sentence still says exactly what it said before — `أنا حاسأله بكرة` and `حاسأله بكرة` are the same sentence, and the second is the one the lesson taught. Split: 1p 47, 1s 143, 2 17, 3p 63, 3s 50, 3sf 32; by role, 313 use, 39 build.

**The refusals land in third person, but not for the reason the brief expected.** 21 of the 42 refusals are third-person (3sf 18, 3p 3) against 166 third-person rows — so the prediction holds on direction and badly overshoots on cause. Almost none of it is verb ambiguity. Egyptian verbal agreement does the disambiguating work: `هي محتاجة تنتقل` → `محتاجة تنتقل` is still unmistakably *she*, because `تنتقل` is third-person feminine. Only **6** rows in the whole set fail on language grounds — the completely verbless ones, a bare adjective or participle with no verb anywhere, where the pronoun really was the only thing naming the subject.

**The big refusal class is something else entirely: 35 of these lines are not drift at all.** This course contains **42 legos that teach the pronoun ON PURPOSE** — `I want = أنا عايز` (seed 1), `I'm trying to = أنا بحاول` (seed 2), `we want = إحنا عايزين`, `she wants = هي عايزة`, `she was = هي كانت`, `I've been = أنا بقالي`, `I think that = أنا بفكر إن`. 35 of the flagged drills open with one of those taught chunks verbatim. They are correctly tiling an earlier lesson. Deleting the pronoun would break the tiling AND create a genuine ZUT break, because the same known string would then map to two targets. The detector cannot see this because it only compares a drill against the ONE lego it hangs off.

With those 35 removed, I re-ran the ZUT check across every known string in the course: the 352 proposed edits introduce **0 new collisions**. (Three pre-existing collisions are untouched and unrelated — e.g. *he wasn't today* already has two targets.)

**Lebanese forms: none found.** I checked all 394 rows for `إنو`, `بتحكي`, `بحكي`, `شو`, `بدي`, `منيح`, `هيدا`, `هلق`, `ليش`, `عم` — zero genuine hits. I did **not** look outside these rows, so this says nothing about the rest of the course.

**The one thing I would put in front of Tom.** After this pass the course still teaches `أنا عايز` for *I want* at seed 1 and drops the pronoun for near-identical intentions from seed 45 onward. That is a lesson-versus-lesson disagreement, not a drill problem, and this pass deliberately does not touch it.

---

## Proposed rewrites — all 352

| # | phrase id | role | lesson | lesson known → target | drill known | BEFORE | AFTER |
|--:|---|---|---|---|---|---|---|
| 1 | `S0108L02U02` | use | `S0108L02` | we wake up → نصحى | we hope to wake up on time | إحنا نتمنى نصحى في الوقت | **نتمنى نصحى في الوقت** |
| 2 | `S0108L02U05` | use | `S0108L02` | we wake up → نصحى | we need to wake up to go | إحنا محتاجين نصحى علشان نمشي | **محتاجين نصحى علشان نمشي** |
| 3 | `S0108L02U06` | use | `S0108L02` | we wake up → نصحى | we hope to wake up before tomorrow night | إحنا نتمنى نصحى قبل ما يبقى الليلة | **نتمنى نصحى قبل ما يبقى الليلة** |
| 4 | `S0108L02U04` | use | `S0108L02` | we wake up → نصحى | we need to wake up before the morning meeting | إحنا محتاجين نصحى الصبح علشان نتقابل | **محتاجين نصحى الصبح علشان نتقابل** |
| 5 | `S0108L02U03` | use | `S0108L02` | we wake up → نصحى | we didn't hope to wake up now | إحنا ماكناش نتمنى نصحى دلوقتي | **ماكناش نتمنى نصحى دلوقتي** |
| 6 | `S0059L01U01` | use | `S0059L01` | I know → عارف | I know how to speak Arabic | أنا عارف إزاي أتكلم عربي | **عارف إزاي أتكلم عربي** |
| 7 | `S0059L01U03` | use | `S0059L01` | I know → عارف | I know how to do that | أنا عارف إزاي أعمل كده | **عارف إزاي أعمل كده** |
| 8 | `S0059L01U04` | use | `S0059L01` | I know → عارف | I know what I want to say | أنا عارف اللي عايز أقوله | **عارف اللي عايز أقوله** |
| 9 | `S0059L01U02` | use | `S0059L01` | I know → عارف | I know how to say something in Arabic | أنا عارف إزاي أقول حاجة بالعربي | **عارف إزاي أقول حاجة بالعربي** |
| 10 | `S0059L01U06` | use | `S0059L01` | I know → عارف | I know how to learn Arabic | أنا عارف إزاي أتعلم عربي | **عارف إزاي أتعلم عربي** |
| 11 | `S0059L01U05` | use | `S0059L01` | I know → عارف | I know what I need to say | أنا عارف اللي محتاج أقوله | **عارف اللي محتاج أقوله** |
| 12 | `S0045L01U02` | use | `S0045L01` | I know → أعرف | I need to know something | أنا محتاج أعرف حاجة | **محتاج أعرف حاجة** |
| 13 | `S0045L01U03` | use | `S0045L01` | I know → أعرف | I don't need to know how | أنا مش محتاج أعرف إزاي | **مش محتاج أعرف إزاي** |
| 14 | `S0045L01U01` | use | `S0045L01` | I know → أعرف | I don't need to know everything | أنا مش محتاج أعرف كل حاجة | **مش محتاج أعرف كل حاجة** |
| 15 | `S0045L01U05` | use | `S0045L01` | I know → أعرف | I don't need to know anything now | أنا مش محتاج أعرف أي حاجة دلوقتي | **مش محتاج أعرف أي حاجة دلوقتي** |
| 16 | `S0180L01B03` | build | `S0180L01` | I read → أقرا | I need to read | أنا محتاج أقرا | **محتاج أقرا** |
| 17 | `S0180L01U05` | use | `S0180L01` | I read → أقرا | I can read that | أنا أقدر أقرا ده | **أقدر أقرا ده** |
| 18 | `S0180L01U01` | use | `S0180L01` | I read → أقرا | I need time to read | أنا محتاج وقت أقرا | **محتاج وقت أقرا** |
| 19 | `S0052L05U06` | use | `S0052L05` | he wanted → كان عايز | he wanted to be quiet | هو كان عايز يسكت | **كان عايز يسكت** |
| 20 | `S0052L05U05` | use | `S0052L05` | he wanted → كان عايز | he wanted to go back yesterday | هو كان عايز يرجع إمبارح | **كان عايز يرجع إمبارح** |
| 21 | `S0052L05U03` | use | `S0052L05` | he wanted → كان عايز | he wanted to write to his friend | هو كان عايز يكتب لصاحبه | **كان عايز يكتب لصاحبه** |
| 22 | `S0052L05U02` | use | `S0052L05` | he wanted → كان عايز | he wanted to write a letter | هو كان عايز يكتب جواب | **كان عايز يكتب جواب** |
| 23 | `S0052L05U04` | use | `S0052L05` | he wanted → كان عايز | he wanted to write a letter to his friend | هو كان عايز يكتب جواب لصاحبه | **كان عايز يكتب جواب لصاحبه** |
| 24 | `S0052L05U01` | use | `S0052L05` | he wanted → كان عايز | he wanted to write | هو كان عايز يكتب | **كان عايز يكتب** |
| 25 | `S0119L01U07` | use | `S0119L01` | I can → أقدر | I can play | أنا أقدر ألعب | **أقدر ألعب** |
| 26 | `S0291L01U03` | use | `S0291L01` | I'll be able to speak better → حاقدر أتكلم أحسن | I hope I'll be able to speak better with you | أنا متمنى إني حاقدر أتكلم أحسن معاك | **متمنى إني حاقدر أتكلم أحسن معاك** |
| 27 | `S0291L01B02` | build | `S0291L01` | I'll be able to speak better → حاقدر أتكلم أحسن | I hope I'll be able to speak better | أنا متمنى إني حاقدر أتكلم أحسن | **متمنى إني حاقدر أتكلم أحسن** |
| 28 | `S0291L01U05` | use | `S0291L01` | I'll be able to speak better → حاقدر أتكلم أحسن | I'm happy I'll be able to speak better | أنا مبسوط إني حاقدر أتكلم أحسن | **مبسوط إني حاقدر أتكلم أحسن** |
| 29 | `S0291L01U01` | use | `S0291L01` | I'll be able to speak better → حاقدر أتكلم أحسن | I hope I'll be able to speak better soon | أنا متمنى إني حاقدر أتكلم أحسن قريب | **متمنى إني حاقدر أتكلم أحسن قريب** |
| 30 | `S0291L01B03` | build | `S0291L01` | I'll be able to speak better → حاقدر أتكلم أحسن | I know I'll be able to speak better | أنا عارف إني حاقدر أتكلم أحسن | **عارف إني حاقدر أتكلم أحسن** |
| 31 | `S0291L01U02` | use | `S0291L01` | I'll be able to speak better → حاقدر أتكلم أحسن | I think I'll be able to speak better | أنا بفكر إني حاقدر أتكلم أحسن | **بفكر إني حاقدر أتكلم أحسن** |
| 32 | `S0291L01U04` | use | `S0291L01` | I'll be able to speak better → حاقدر أتكلم أحسن | I'm not sure if I'll be able to speak better soon | أنا مش متأكد لو حاقدر أتكلم أحسن قريب | **مش متأكد لو حاقدر أتكلم أحسن قريب** |
| 33 | `S0015L02U03` | use | `S0015L02` | I want you to speak → عايزك تتكلم | I want you to speak Arabic with someone else | أنا عايزك تتكلم عربي مع حد تاني | **عايزك تتكلم عربي مع حد تاني** |
| 34 | `S0015L02U05` | use | `S0015L02` | I want you to speak → عايزك تتكلم | I want you to speak Arabic now | أنا عايزك تتكلم عربي دلوقتي | **عايزك تتكلم عربي دلوقتي** |
| 35 | `S0015L02U02` | use | `S0015L02` | I want you to speak → عايزك تتكلم | I want you to speak a little Arabic | أنا عايزك تتكلم عربي شوية | **عايزك تتكلم عربي شوية** |
| 36 | `S0015L02U04` | use | `S0015L02` | I want you to speak → عايزك تتكلم | I want you to speak Arabic very well | أنا عايزك تتكلم عربي كويس جدا | **عايزك تتكلم عربي كويس جدا** |
| 37 | `S0015L02U01` | use | `S0015L02` | I want you to speak → عايزك تتكلم | I want you to speak Arabic | أنا عايزك تتكلم عربي | **عايزك تتكلم عربي** |
| 38 | `S0270L02U04` | use | `S0270L02` | I'll be late → حاتأخر | I know I'm going to be late | أنا عارف إني حاتأخر | **عارف إني حاتأخر** |
| 39 | `S0270L02B03` | build | `S0270L02` | I'll be late → حاتأخر | I think I'm going to be late | أنا بفكر إني حاتأخر | **بفكر إني حاتأخر** |
| 40 | `S0270L02B02` | build | `S0270L02` | I'll be late → حاتأخر | I'm worried I'll be late | أنا قلقان إني حاتأخر | **قلقان إني حاتأخر** |
| 41 | `S0270L02U02` | use | `S0270L02` | I'll be late → حاتأخر | I'm going to be late today | أنا حاتأخر النهارده | **حاتأخر النهارده** |
| 42 | `S0148L01U02` | use | `S0148L01` | he wasn't → ماكانش | he wasn't happy | هو ماكانش مبسوط | **ماكانش مبسوط** |
| 43 | `S0148L01U01` | use | `S0148L01` | he wasn't → ماكانش | he wasn't here | هو ماكانش هنا | **ماكانش هنا** |
| 44 | `S0148L01U04` | use | `S0148L01` | he wasn't → ماكانش | he wasn't good | هو ماكانش كويس | **ماكانش كويس** |
| 45 | `S0148L01U05` | use | `S0148L01` | he wasn't → ماكانش | he wasn't with me | هو ماكانش معايا | **ماكانش معايا** |
| 46 | `S0148L01U03` | use | `S0148L01` | he wasn't → ماكانش | he wasn't today | هو ماكانش النهارده | **ماكانش النهارده** |
| 47 | `S0238L01U02` | use | `S0238L01` | he wanted you to → كان عايزك | he wanted you to tell me yesterday | هو كان عايزك تقول لي إمبارح | **كان عايزك تقول لي إمبارح** |
| 48 | `S0200L01B01` | build | `S0200L01` | they say → بيقولوا | they say | هم بيقولوا | **بيقولوا** |
| 49 | `S0200L01B03` | build | `S0200L01` | they say → بيقولوا | they say it's important | هم بيقولوا إنه مهم | **بيقولوا إنه مهم** |
| 50 | `S0200L01U03` | use | `S0200L01` | they say → بيقولوا | they say it's a good idea | هم بيقولوا إنه فكرة كويسة | **بيقولوا إنه فكرة كويسة** |
| 51 | `S0200L01U04` | use | `S0200L01` | they say → بيقولوا | they say we need to finish | هم بيقولوا إننا محتاجين نخلص | **بيقولوا إننا محتاجين نخلص** |
| 52 | `S0200L01B02` | build | `S0200L01` | they say → بيقولوا | they say that | هم بيقولوا إن | **بيقولوا إن** |
| 53 | `S0200L01U05` | use | `S0200L01` | they say → بيقولوا | they say it's still too early | هم بيقولوا إنه لسه بدري قوي | **بيقولوا إنه لسه بدري قوي** |
| 54 | `S0213L01U02` | use | `S0213L01` | we know → عارفين | we know what the problem is | إحنا عارفين إيه المشكلة | **عارفين إيه المشكلة** |
| 55 | `S0213L01U05` | use | `S0213L01` | we know → عارفين | we all know this is important | إحنا عارفين إن ده مهم | **عارفين إن ده مهم** |
| 56 | `S0249L02U05` | use | `S0249L02` | I want you → عايزك | I want you to help me before you go | أنا عايزك تساعدني قبل ما تروح | **عايزك تساعدني قبل ما تروح** |
| 57 | `S0163L01U01` | use | `S0163L01` | I think that it's fun → بفكر إنه ممتع | I think that it's interesting | أنا بفكر إنه ممتع | **بفكر إنه ممتع** |
| 58 | `S0212L01U04` | use | `S0212L01` | they ask for (request) → يطلبوا | they say they want to ask | هم بيقولوا إنهم عايزين يطلبوا | **بيقولوا إنهم عايزين يطلبوا** |
| 59 | `S0212L01B01` | build | `S0212L01` | they ask for (request) → يطلبوا | they ask for something | هم يطلبوا | **يطلبوا** |
| 60 | `S0212L01U01` | use | `S0212L01` | they ask for (request) → يطلبوا | they didn't want to ask | هم ماكنوش عايزين يطلبوا | **ماكنوش عايزين يطلبوا** |
| 61 | `S0212L01U05` | use | `S0212L01` | they ask for (request) → يطلبوا | they want to ask for something | هم عايزين يطلبوا حاجة | **عايزين يطلبوا حاجة** |
| 62 | `S0043L02U02` | use | `S0043L02` | I'm thinking → بفكر | I'm thinking about how to speak arabic | أنا بفكر إزاي أتكلم عربي | **بفكر إزاي أتكلم عربي** |
| 63 | `S0043L02U01` | use | `S0043L02` | I'm thinking → بفكر | I wasn't thinking about how to answer | أنا ماكنتش بفكر إزاي أرد | **ماكنتش بفكر إزاي أرد** |
| 64 | `S0043L02U05` | use | `S0043L02` | I'm thinking → بفكر | I'm thinking about how to answer | أنا بفكر إزاي أرد | **بفكر إزاي أرد** |
| 65 | `S0043L02B03` | build | `S0043L02` | I'm thinking → بفكر | I'm thinking now | أنا بفكر دلوقتي | **بفكر دلوقتي** |
| 66 | `S0043L02U03` | use | `S0043L02` | I'm thinking → بفكر | I'm thinking about it now | أنا بفكر فيها دلوقتي | **بفكر فيها دلوقتي** |
| 67 | `S0285L01U05` | use | `S0285L01` | she speaks → بتتكلم عربي | she speaks Arabic with me | هي بتتكلم عربي معايا | **بتتكلم عربي معايا** |
| 68 | `S0285L01U01` | use | `S0285L01` | she speaks → بتتكلم عربي | she speaks Arabic | هي بتتكلم عربي | **بتتكلم عربي** |
| 69 | `S0285L01U02` | use | `S0285L01` | she speaks → بتتكلم عربي | she speaks Arabic well | هي بتتكلم عربي كويس | **بتتكلم عربي كويس** |
| 70 | `S0285L01U03` | use | `S0285L01` | she speaks → بتتكلم عربي | she speaks Arabic here today | هي بتتكلم عربي هنا النهارده | **بتتكلم عربي هنا النهارده** |
| 71 | `S0285L01U04` | use | `S0285L01` | she speaks → بتتكلم عربي | she speaks Arabic with them | هي بتتكلم عربي معاهم | **بتتكلم عربي معاهم** |
| 72 | `S0212L03U04` | use | `S0212L03` | they wanted to → كانوا عايزين | they wanted us to know | هم كانوا عايزين نعرف | **كانوا عايزين نعرف** |
| 73 | `S0212L03U02` | use | `S0212L03` | they wanted to → كانوا عايزين | they wanted to meet | هم كانوا عايزين يتقابلوا | **كانوا عايزين يتقابلوا** |
| 74 | `S0212L03U06` | use | `S0212L03` | they wanted to → كانوا عايزين | they wanted us to talk about this | هم كانوا عايزين نتكلم عن ده | **كانوا عايزين نتكلم عن ده** |
| 75 | `S0212L03U01` | use | `S0212L03` | they wanted to → كانوا عايزين | they wanted to ask for assistance | هم كانوا عايزين يطلبوا مساعدة | **كانوا عايزين يطلبوا مساعدة** |
| 76 | `S0182L01U03` | use | `S0182L01` | you saw → شفت | you didn't see that | إنت ما شفتش ده | **ما شفتش ده** |
| 77 | `S0188L01U05` | use | `S0188L01` | I change → أتغير | I'm happy to change | أنا مبسوط أتغير | **مبسوط أتغير** |
| 78 | `S0174L01U02` | use | `S0174L01` | I'm saying → بقوله | I know what I'm saying | أنا عارف اللي بقوله | **عارف اللي بقوله** |
| 79 | `S0174L01U04` | use | `S0174L01` | I'm saying → بقوله | I'm not sure you understand what I'm saying | أنا مش متأكد إنك فاهم اللي بقوله | **مش متأكد إنك فاهم اللي بقوله** |
| 80 | `S0174L01U05` | use | `S0174L01` | I'm saying → بقوله | I think you understand what I'm saying | أنا بفكر إنك فاهم اللي بقوله | **بفكر إنك فاهم اللي بقوله** |
| 81 | `S0103L01U01` | use | `S0103L01` | we hear → نسمع | we're not trying to hear many more words | إحنا مش بنحاول نسمع كلمات تانية كتير | **مش بنحاول نسمع كلمات تانية كتير** |
| 82 | `S0296L01U04` | use | `S0296L01` | I said → قلت | I know what I said | أنا عارف اللي قلت | **عارف اللي قلت** |
| 83 | `S0206L02U01` | use | `S0206L02` | I practice → أتدرب | I enjoy the chance to practise speaking with you | أنا بستمتع بفرصة إني أتدرب أتكلم معاك | **بستمتع بفرصة إني أتدرب أتكلم معاك** |
| 84 | `S0222L01U04` | use | `S0222L01` | he is trying → بيحاول | he is trying to come back | هو بيحاول يرجع | **بيحاول يرجع** |
| 85 | `S0222L01U03` | use | `S0222L01` | he is trying → بيحاول | he is trying to write | هو بيحاول يكتب | **بيحاول يكتب** |
| 86 | `S0222L01B03` | build | `S0222L01` | he is trying → بيحاول | he is trying with me | هو بيحاول معايا | **بيحاول معايا** |
| 87 | `S0222L01B02` | build | `S0222L01` | he is trying → بيحاول | he is still trying | هو لسه بيحاول | **لسه بيحاول** |
| 88 | `S0222L01U06` | use | `S0222L01` | he is trying → بيحاول | he is still trying with me | هو لسه بيحاول معايا | **لسه بيحاول معايا** |
| 89 | `S0222L01U05` | use | `S0222L01` | he is trying → بيحاول | he is trying so much | هو بيحاول كتير | **بيحاول كتير** |
| 90 | `S0233L03U02` | use | `S0233L03` | she knows / who knows → بتعرف | she knows Arabic | هي بتعرف عربي | **بتعرف عربي** |
| 91 | `S0233L03U04` | use | `S0233L03` | she knows / who knows → بتعرف | she knows a lot | هي بتعرف كتير | **بتعرف كتير** |
| 92 | `S0106L01U01` | use | `S0106L01` | we feel → نحس | we feel that this is hard | إحنا نحس إن ده صعب | **نحس إن ده صعب** |
| 93 | `S0106L01U02` | use | `S0106L01` | we feel → نحس | we feel that this is important | إحنا نحس إن ده مهم | **نحس إن ده مهم** |
| 94 | `S0106L01U04` | use | `S0106L01` | we feel → نحس | we feel that this is useful | إحنا نحس إن ده مفيد | **نحس إن ده مفيد** |
| 95 | `S0106L01U05` | use | `S0106L01` | we feel → نحس | we feel that this is fun | إحنا نحس إن ده ممتع | **نحس إن ده ممتع** |
| 96 | `S0106L01U03` | use | `S0106L01` | we feel → نحس | we don't need to feel good right now | إحنا مش محتاجين نحس كويس دلوقتي | **مش محتاجين نحس كويس دلوقتي** |
| 97 | `S0215L01U01` | use | `S0215L01` | I went out → خرجت | I went out on Saturday night | أنا خرجت السبت بالليل | **خرجت السبت بالليل** |
| 98 | `S0184L01U02` | use | `S0184L01` | I saw them → شفتهم | I saw them yesterday | أنا شفتهم إمبارح | **شفتهم إمبارح** |
| 99 | `S0184L01U01` | use | `S0184L01` | I saw them → شفتهم | I saw them a while ago | أنا شفتهم من شوية | **شفتهم من شوية** |
| 100 | `S0184L01U03` | use | `S0184L01` | I saw them → شفتهم | I saw them this morning | أنا شفتهم الصبح | **شفتهم الصبح** |
| 101 | `S0184L01U05` | use | `S0184L01` | I saw them → شفتهم | I saw them before | أنا شفتهم من قبل | **شفتهم من قبل** |
| 102 | `S0224L01U03` | use | `S0224L01` | he learns → يتعلم | he is still trying to learn | هو لسه بيحاول يتعلم | **لسه بيحاول يتعلم** |
| 103 | `S0224L01U01` | use | `S0224L01` | he learns → يتعلم | he's just started to learn | هو لسه بدأ يتعلم | **لسه بدأ يتعلم** |
| 104 | `S0224L01U02` | use | `S0224L01` | he learns → يتعلم | he started to learn today | هو بدأ يتعلم النهارده | **بدأ يتعلم النهارده** |
| 105 | `S0224L01U05` | use | `S0224L01` | he learns → يتعلم | he wants to learn | هو عايز يتعلم | **عايز يتعلم** |
| 106 | `S0083L01U02` | use | `S0083L01` | I agree → موافق | I agree a lot | أنا موافق كتير | **موافق كتير** |
| 107 | `S0083L01U03` | use | `S0083L01` | I agree → موافق | I agree with that | أنا موافق على ده | **موافق على ده** |
| 108 | `S0083L01U01` | use | `S0083L01` | I agree → موافق | I agree | أنا موافق | **موافق** |
| 109 | `S0083L01U05` | use | `S0083L01` | I agree → موافق | I agree with what you said | أنا موافق على اللي قلته | **موافق على اللي قلته** |
| 110 | `S0289L01B02` | build | `S0289L01` | I wonder → متسائل | I am wondering | أنا متسائل | **متسائل** |
| 111 | `S0289L01U01` | use | `S0289L01` | I wonder → متسائل | I am wondering about this | أنا متسائل عن ده | **متسائل عن ده** |
| 112 | `S0289L01U05` | use | `S0289L01` | I wonder → متسائل | I wonder if she is there | أنا متسائل لو هي هناك | **متسائل لو هي هناك** |
| 113 | `S0289L01U04` | use | `S0289L01` | I wonder → متسائل | I wonder if it is good | أنا متسائل لو ده كويس | **متسائل لو ده كويس** |
| 114 | `S0289L01U02` | use | `S0289L01` | I wonder → متسائل | I wonder if she is here | أنا متسائل لو هي هنا | **متسائل لو هي هنا** |
| 115 | `S0289L01U03` | use | `S0289L01` | I wonder → متسائل | I wonder if he knows | أنا متسائل لو هو عارف | **متسائل لو هو عارف** |
| 116 | `S0021L02B01` | build | `S0021L02` | you are learning → بتتعلم | you are learning | إنت بتتعلم | **بتتعلم** |
| 117 | `S0021L02U03` | use | `S0021L02` | you are learning → بتتعلم | you are learning Arabic a little | إنت بتتعلم عربي شوية | **بتتعلم عربي شوية** |
| 118 | `S0021L02U05` | use | `S0021L02` | you are learning → بتتعلم | you are learning Arabic all day | إنت بتتعلم عربي طول اليوم | **بتتعلم عربي طول اليوم** |
| 119 | `S0021L02U01` | use | `S0021L02` | you are learning → بتتعلم | you are learning Arabic now | إنت بتتعلم عربي دلوقتي | **بتتعلم عربي دلوقتي** |
| 120 | `S0021L02B03` | build | `S0021L02` | you are learning → بتتعلم | you are learning Arabic | إنت بتتعلم عربي | **بتتعلم عربي** |
| 121 | `S0054L01B03` | build | `S0054L01` | we were → كنا | we were not wanting | إحنا كنا مش عايزين | **كنا مش عايزين** |
| 122 | `S0054L01B02` | build | `S0054L01` | we were → كنا | we were wanting | إحنا كنا عايزين | **كنا عايزين** |
| 123 | `S0054L01B01` | build | `S0054L01` | we were → كنا | we were | إحنا كنا | **كنا** |
| 124 | `S0054L01U02` | use | `S0054L01` | we were → كنا | we were not wanting to stop | إحنا كنا مش عايزين نبطل | **كنا مش عايزين نبطل** |
| 125 | `S0054L01U06` | use | `S0054L01` | we were → كنا | we were wanting more | إحنا كنا عايزين كتير | **كنا عايزين كتير** |
| 126 | `S0054L01U04` | use | `S0054L01` | we were → كنا | we were not here last week | إحنا كنا مش هنا الأسبوع اللي فات | **كنا مش هنا الأسبوع اللي فات** |
| 127 | `S0054L01U05` | use | `S0054L01` | we were → كنا | we were wanting to meet | إحنا كنا عايزين نتقابل | **كنا عايزين نتقابل** |
| 128 | `S0054L01U01` | use | `S0054L01` | we were → كنا | we were here yesterday | إحنا كنا هنا إمبارح | **كنا هنا إمبارح** |
| 129 | `S0038L02U04` | use | `S0038L02` | I'm learning → بتعلم | I'm learning with someone else | أنا بتعلم مع حد تاني | **بتعلم مع حد تاني** |
| 130 | `S0055L02U05` | use | `S0055L02` | I didn't sleep → ما نمتش | I won't be able to speak well when I didn't sleep | أنا مش حاقدر أتكلم كويس لما ما نمتش | **مش حاقدر أتكلم كويس لما ما نمتش** |
| 131 | `S0055L02U01` | use | `S0055L02` | I didn't sleep → ما نمتش | I don't enjoy waking up when I didn't sleep well | أنا مش بستمتع لما أصحى لما ما نمتش كويس | **مش بستمتع لما أصحى لما ما نمتش كويس** |
| 132 | `S0055L02U02` | use | `S0055L02` | I didn't sleep → ما نمتش | I don't enjoy the morning when I didn't sleep well | أنا مش بستمتع الصبح لما ما نمتش كويس | **مش بستمتع الصبح لما ما نمتش كويس** |
| 133 | `S0104L03U01` | use | `S0104L03` | we're doing it → بنعمله | we need to change what we're doing | إحنا محتاجين نغير اللي بنعمله | **محتاجين نغير اللي بنعمله** |
| 134 | `S0205L01U06` | use | `S0205L01` | I forgot → نسيت | I forgot his name | أنا نسيت اسمه | **نسيت اسمه** |
| 135 | `S0205L01U07` | use | `S0205L01` | I forgot → نسيت | I forgot your idea | أنا نسيت فكرتك | **نسيت فكرتك** |
| 136 | `S0205L01U08` | use | `S0205L01` | I forgot → نسيت | I forgot the arrangements | أنا نسيت الترتيبات | **نسيت الترتيبات** |
| 137 | `S0176L03B02` | build | `S0176L03` | I'll ask him → حاسأله | I'll ask him | أنا حاسأله | **حاسأله** |
| 138 | `S0176L03U05` | use | `S0176L03` | I'll ask him → حاسأله | I'll ask him later | أنا حاسأله بعدين | **حاسأله بعدين** |
| 139 | `S0176L03U03` | use | `S0176L03` | I'll ask him → حاسأله | I'll ask him about that | أنا حاسأله عن ده | **حاسأله عن ده** |
| 140 | `S0176L03U02` | use | `S0176L03` | I'll ask him → حاسأله | I'll ask him tomorrow | أنا حاسأله بكرة | **حاسأله بكرة** |
| 141 | `S0176L03U01` | use | `S0176L03` | I'll ask him → حاسأله | I'll ask him if he can help | أنا حاسأله لو حيقدر يساعد | **حاسأله لو حيقدر يساعد** |
| 142 | `S0176L03B03` | build | `S0176L03` | I'll ask him → حاسأله | I'll ask him now | أنا حاسأله دلوقتي | **حاسأله دلوقتي** |
| 143 | `S0176L03U04` | use | `S0176L03` | I'll ask him → حاسأله | I'll ask him what he needs | أنا حاسأله اللي محتاجه | **حاسأله اللي محتاجه** |
| 144 | `S0074L01U02` | use | `S0074L01` | you helped me → ساعدتني | you helped me to learn something | إنت ساعدتني أتعلم حاجة | **ساعدتني أتعلم حاجة** |
| 145 | `S0074L01U05` | use | `S0074L01` | you helped me → ساعدتني | you helped me to remember how to say it | إنت ساعدتني أفتكر إزاي أقوله | **ساعدتني أفتكر إزاي أقوله** |
| 146 | `S0074L01U03` | use | `S0074L01` | you helped me → ساعدتني | you helped me to say something in Arabic | إنت ساعدتني أقول حاجة بالعربي | **ساعدتني أقول حاجة بالعربي** |
| 147 | `S0211L02U04` | use | `S0211L02` | they told us → قالوا لنا | they told us we need to learn a lot | هم قالوا لنا إننا محتاجين نتعلم كتير | **قالوا لنا إننا محتاجين نتعلم كتير** |
| 148 | `S0211L02U01` | use | `S0211L02` | they told us → قالوا لنا | they told us they don't want to explain | هم قالوا لنا إنهم مش عايزين يشرحوا | **قالوا لنا إنهم مش عايزين يشرحوا** |
| 149 | `S0191L01U02` | use | `S0191L01` | I've not got → عنديش | I don't have what I need | أنا ما عنديش اللي محتاجه | **ما عنديش اللي محتاجه** |
| 150 | `S0191L01U03` | use | `S0191L01` | I've not got → عنديش | I don't mind | أنا ما عنديش مانع | **ما عنديش مانع** |
| 151 | `S0191L01U01` | use | `S0191L01` | I've not got → عنديش | I don't have time | أنا ما عنديش وقت | **ما عنديش وقت** |
| 152 | `S0191L01U04` | use | `S0191L01` | I've not got → عنديش | I don't have any questions | أنا ما عنديش أسئلة | **ما عنديش أسئلة** |
| 153 | `S0191L01U05` | use | `S0191L01` | I've not got → عنديش | I don't have a problem with that | أنا ما عنديش مشكلة في ده | **ما عنديش مشكلة في ده** |
| 154 | `S0211L03U01` | use | `S0211L03` | they didn't want to → ماكنوش عايزين | they didn't want to explain | هم ماكنوش عايزين يشرحوا | **ماكنوش عايزين يشرحوا** |
| 155 | `S0211L03U05` | use | `S0211L03` | they didn't want to → ماكنوش عايزين | they didn't want us to work together | هم ماكنوش عايزين نشتغل سوا | **ماكنوش عايزين نشتغل سوا** |
| 156 | `S0211L03U03` | use | `S0211L03` | they didn't want to → ماكنوش عايزين | they didn't want us to know | هم ماكنوش عايزين نعرف | **ماكنوش عايزين نعرف** |
| 157 | `S0211L03U02` | use | `S0211L03` | they didn't want to → ماكنوش عايزين | they didn't want to meet | هم ماكنوش عايزين يتقابلوا | **ماكنوش عايزين يتقابلوا** |
| 158 | `S0211L03U04` | use | `S0211L03` | they didn't want to → ماكنوش عايزين | they didn't want us to talk about this | هم ماكنوش عايزين نتكلم عن ده | **ماكنوش عايزين نتكلم عن ده** |
| 159 | `S0109L02U04` | use | `S0109L02` | we learn → نتعلم | we need to learn this | إحنا محتاجين نتعلم ده | **محتاجين نتعلم ده** |
| 160 | `S0109L02U03` | use | `S0109L02` | we learn → نتعلم | we hope to learn more soon | إحنا نتمنى نتعلم أكتر قريب | **نتمنى نتعلم أكتر قريب** |
| 161 | `S0109L02U05` | use | `S0109L02` | we learn → نتعلم | we must learn how to say more things | إحنا لازم نتعلم إزاي نقول حاجات أكتر | **لازم نتعلم إزاي نقول حاجات أكتر** |
| 162 | `S0106L04U04` | use | `S0106L04` | we work → نشتغل | we need to work today | إحنا محتاجين نشتغل النهارده | **محتاجين نشتغل النهارده** |
| 163 | `S0106L04U01` | use | `S0106L04` | we work → نشتغل | we need to work on this | إحنا محتاجين نشتغل على ده | **محتاجين نشتغل على ده** |
| 164 | `S0106L04U05` | use | `S0106L04` | we work → نشتغل | we feel happy when we work | إحنا نحس إننا مبسوطين لما نشتغل | **نحس إننا مبسوطين لما نشتغل** |
| 165 | `S0106L04U02` | use | `S0106L04` | we work → نشتغل | we don't want to work right now | إحنا مش عايزين نشتغل دلوقتي | **مش عايزين نشتغل دلوقتي** |
| 166 | `S0302L01U03` | use | `S0302L01` | she lives → تعيش | she said that she wants to live there | هي قالت إنها عايزة تعيش هناك | **قالت إنها عايزة تعيش هناك** |
| 167 | `S0302L01U04` | use | `S0302L01` | she lives → تعيش | she doesn't want to live here now | هي مش عايزة تعيش هنا دلوقتي | **مش عايزة تعيش هنا دلوقتي** |
| 168 | `S0146L04U03` | use | `S0146L04` | we tried to fix it → حاولنا نصلحها | we tried to fix it yesterday | إحنا حاولنا نصلحها إمبارح | **حاولنا نصلحها إمبارح** |
| 169 | `S0177L01B03` | build | `S0177L01` | I'll ask her → حاسألها | I'll ask her now | أنا حاسألها دلوقتي | **حاسألها دلوقتي** |
| 170 | `S0177L01B02` | build | `S0177L01` | I'll ask her → حاسألها | I'll ask her | أنا حاسألها | **حاسألها** |
| 171 | `S0177L01U04` | use | `S0177L01` | I'll ask her → حاسألها | I'll ask her what she needs | أنا حاسألها اللي محتاجه | **حاسألها اللي محتاجه** |
| 172 | `S0177L01U05` | use | `S0177L01` | I'll ask her → حاسألها | I'll ask her later | أنا حاسألها بعدين | **حاسألها بعدين** |
| 173 | `S0177L01U02` | use | `S0177L01` | I'll ask her → حاسألها | I'll ask her tomorrow | أنا حاسألها بكرة | **حاسألها بكرة** |
| 174 | `S0177L01U01` | use | `S0177L01` | I'll ask her → حاسألها | I'll ask her where she wants to go | أنا حاسألها فين عايزة تروح | **حاسألها فين عايزة تروح** |
| 175 | `S0177L01U03` | use | `S0177L01` | I'll ask her → حاسألها | I'll ask her about that | أنا حاسألها عن ده | **حاسألها عن ده** |
| 176 | `S0301L01U01` | use | `S0301L01` | he shows you → يوريك | he wants to show you something | هو عايز يوريك حاجة | **عايز يوريك حاجة** |
| 177 | `S0301L01U02` | use | `S0301L01` | he shows you → يوريك | he's trying to show you something | هو بيحاول يوريك حاجة | **بيحاول يوريك حاجة** |
| 178 | `S0301L01U03` | use | `S0301L01` | he shows you → يوريك | he said that he wants to show you something | هو قال إنه عايز يوريك حاجة | **قال إنه عايز يوريك حاجة** |
| 179 | `S0301L01U05` | use | `S0301L01` | he shows you → يوريك | he wants to show you something at the party | هو عايز يوريك حاجة في الحفلة | **عايز يوريك حاجة في الحفلة** |
| 180 | `S0082L01U02` | use | `S0082L01` | I'll wait for you → حاستناك | I won't wait for you | أنا مش حاستناك | **مش حاستناك** |
| 181 | `S0125L01U04` | use | `S0125L01` | I believe → أصدق | I believe that this is fun | أنا أصدق إن ده ممتع | **أصدق إن ده ممتع** |
| 182 | `S0125L01U03` | use | `S0125L01` | I believe → أصدق | I believe that this is hard | أنا أصدق إن ده صعب | **أصدق إن ده صعب** |
| 183 | `S0125L01U02` | use | `S0125L01` | I believe → أصدق | I believe that this was a good idea | أنا أصدق إن دي كانت فكرة كويسة | **أصدق إن دي كانت فكرة كويسة** |
| 184 | `S0125L01U01` | use | `S0125L01` | I believe → أصدق | I believe that this is important | أنا أصدق إن ده مهم | **أصدق إن ده مهم** |
| 185 | `S0125L01U05` | use | `S0125L01` | I believe → أصدق | I believe he's excited | أنا أصدق إنه متحمس | **أصدق إنه متحمس** |
| 186 | `S0125L01U06` | use | `S0125L01` | I believe → أصدق | I believe it's worse | أنا أصدق إنه أوحش | **أصدق إنه أوحش** |
| 187 | `S0310L01U01` | use | `S0310L01` | she writes → تكتب | she could write about my mom | هي ممكن تكتب على أمي | **ممكن تكتب على أمي** |
| 188 | `S0310L01U02` | use | `S0310L01` | she writes → تكتب | she writes about that young woman | هي تكتب على الست الشابة دي | **تكتب على الست الشابة دي** |
| 189 | `S0310L01U04` | use | `S0310L01` | she writes → تكتب | she said she could write about that young man | هي قالت إنها ممكن تكتب على الراجل الشاب ده | **قالت إنها ممكن تكتب على الراجل الشاب ده** |
| 190 | `S0057L02U05` | use | `S0057L02` | I wanted to → كنت عايز | I wanted to learn more last week | أنا كنت عايز أتعلم أكتر الأسبوع اللي فات | **كنت عايز أتعلم أكتر الأسبوع اللي فات** |
| 191 | `S0057L02U01` | use | `S0057L02` | I wanted to → كنت عايز | I wanted to speak with you | أنا كنت عايز أتكلم معاك | **كنت عايز أتكلم معاك** |
| 192 | `S0057L02U04` | use | `S0057L02` | I wanted to → كنت عايز | I wanted to explain but I can't | أنا كنت عايز أشرح بس ما أقدرش | **كنت عايز أشرح بس ما أقدرش** |
| 193 | `S0057L02U03` | use | `S0057L02` | I wanted to → كنت عايز | I wanted to remember how to say something | أنا كنت عايز أفتكر إزاي أقول حاجة | **كنت عايز أفتكر إزاي أقول حاجة** |
| 194 | `S0057L02U02` | use | `S0057L02` | I wanted to → كنت عايز | I wanted to say something in Arabic | أنا كنت عايز أقول حاجة بالعربي | **كنت عايز أقول حاجة بالعربي** |
| 195 | `S0057L01U03` | use | `S0057L01` | I can't → ما أقدرش | I can't explain what I mean | أنا ما أقدرش أشرح اللي أنا قصده | **ما أقدرش أشرح اللي أنا قصده** <br>*second `أنا` kept — subject of the relative clause `اللي أنا قصده`; dropping it would turn *what I mean* into *what he means** |
| 196 | `S0057L01U02` | use | `S0057L01` | I can't → ما أقدرش | I can't speak Arabic well | أنا ما أقدرش أتكلم عربي كويس | **ما أقدرش أتكلم عربي كويس** |
| 197 | `S0057L01U01` | use | `S0057L01` | I can't → ما أقدرش | I can't say anything | أنا ما أقدرش أقول حاجة | **ما أقدرش أقول حاجة** |
| 198 | `S0057L01U04` | use | `S0057L01` | I can't → ما أقدرش | I can't speak with you now | أنا ما أقدرش أتكلم معاك دلوقتي | **ما أقدرش أتكلم معاك دلوقتي** |
| 199 | `S0057L01U05` | use | `S0057L01` | I can't → ما أقدرش | I can't try to remember how to say something | أنا ما أقدرش أحاول أفتكر إزاي أقول حاجة | **ما أقدرش أحاول أفتكر إزاي أقول حاجة** |
| 200 | `S0108L01U04` | use | `S0108L01` | we hope / we wish → نتمنى | we didn't hope to go now | إحنا ماكناش نتمنى نمشي دلوقتي | **ماكناش نتمنى نمشي دلوقتي** |
| 201 | `S0108L01U02` | use | `S0108L01` | we hope / we wish → نتمنى | we hope to meet tomorrow | إحنا نتمنى نتقابل بكرة | **نتمنى نتقابل بكرة** |
| 202 | `S0108L01U01` | use | `S0108L01` | we hope / we wish → نتمنى | we didn't hope for that | إحنا ماكناش نتمنى ده | **ماكناش نتمنى ده** |
| 203 | `S0108L01U03` | use | `S0108L01` | we hope / we wish → نتمنى | we hope to meet soon | إحنا نتمنى نتقابل قريب | **نتمنى نتقابل قريب** |
| 204 | `S0108L01U05` | use | `S0108L01` | we hope / we wish → نتمنى | we hope to say something good | إحنا نتمنى نقول حاجة كويسة | **نتمنى نقول حاجة كويسة** |
| 205 | `S0309L02B03` | build | `S0309L02` | I saw her → شفتها | I never saw her | أنا عمري ما شفتها | **عمري ما شفتها** |
| 206 | `S0309L02U01` | use | `S0309L02` | I saw her → شفتها | I saw her here | أنا شفتها هنا | **شفتها هنا** |
| 207 | `S0309L02U02` | use | `S0309L02` | I saw her → شفتها | I saw her with my mom | أنا شفتها مع أمي | **شفتها مع أمي** |
| 208 | `S0309L02U03` | use | `S0309L02` | I saw her → شفتها | I think I saw her | أنا بفكر إني شفتها | **بفكر إني شفتها** |
| 209 | `S0309L02U04` | use | `S0309L02` | I saw her → شفتها | I think I never saw her | أنا بفكر إني عمري ما شفتها | **بفكر إني عمري ما شفتها** |
| 210 | `S0309L02U05` | use | `S0309L02` | I saw her → شفتها | I said I saw her | أنا قلت إني شفتها | **قلت إني شفتها** |
| 211 | `S0314L01U01` | use | `S0314L01` | she puts it → تحطها | she could put it on the table | هي تقدر تحطها على الترابيزة | **تقدر تحطها على الترابيزة** |
| 212 | `S0314L01U05` | use | `S0314L01` | she puts it → تحطها | she likes to put it on the table | هي بتحب تحطها على الترابيزة | **بتحب تحطها على الترابيزة** |
| 213 | `S0316L01U01` | use | `S0316L01` | she brings → تجيب | she could bring the car | هي تقدر تجيب العربية | **تقدر تجيب العربية** |
| 214 | `S0316L01U04` | use | `S0316L01` | she brings → تجيب | she could bring the five things | هي تقدر تجيب الخمس حاجات | **تقدر تجيب الخمس حاجات** |
| 215 | `S0320L01U01` | use | `S0320L01` | he buys → يشتري | he doesn't need to buy another television this year | هو مش محتاج يشتري تلفزيون تاني السنة دي | **مش محتاج يشتري تلفزيون تاني السنة دي** |
| 216 | `S0320L01U02` | use | `S0320L01` | he buys → يشتري | he needs to buy a car | هو محتاج يشتري العربية | **محتاج يشتري العربية** |
| 217 | `S0320L01U04` | use | `S0320L01` | he buys → يشتري | he said he needs to buy a car this year | هو قال إنه محتاج يشتري العربية السنة دي | **قال إنه محتاج يشتري العربية السنة دي** |
| 218 | `S0320L01U05` | use | `S0320L01` | he buys → يشتري | he needs to buy the car this year | هو محتاج يشتري العربية السنة دي | **محتاج يشتري العربية السنة دي** |
| 219 | `S0319L02U01` | use | `S0319L02` | she moves → تنتقل | she needs to move now | هي محتاجة تنتقل دلوقتي | **محتاجة تنتقل دلوقتي** |
| 220 | `S0319L02U04` | use | `S0319L02` | she moves → تنتقل | she said she needs to move | هي قالت إنها محتاجة تنتقل | **قالت إنها محتاجة تنتقل** |
| 221 | `S0319L01U01` | use | `S0319L01` | she needs → محتاجة | she needs to bring her brother | هي محتاجة تجيب أخوها | **محتاجة تجيب أخوها** |
| 222 | `S0319L01U04` | use | `S0319L01` | she needs → محتاجة | she needs to use the room | هي محتاجة تستخدم الأوضة | **محتاجة تستخدم الأوضة** |
| 223 | `S0240L03U04` | use | `S0240L03` | he stops → يبطل | he doesn't like to stop talking | هو مش بيحب يبطل كلام | **مش بيحب يبطل كلام** |
| 224 | `S0240L03U03` | use | `S0240L03` | he stops → يبطل | he doesn't know when to stop | هو مش عارف إمتى يبطل | **مش عارف إمتى يبطل** |
| 225 | `S0323L01U01` | use | `S0323L01` | he walks → يمشي | he doesn't need to walk | هو مش محتاج يمشي | **مش محتاج يمشي** |
| 226 | `S0323L01U02` | use | `S0323L01` | he walks → يمشي | he needs to walk now | هو محتاج يمشي دلوقتي | **محتاج يمشي دلوقتي** |
| 227 | `S0323L01U05` | use | `S0323L01` | he walks → يمشي | he doesn't need to walk with me | هو مش محتاج يمشي معايا | **مش محتاج يمشي معايا** |
| 228 | `S0324L02U02` | use | `S0324L02` | she has → عندها | she has the car | هي عندها العربية | **عندها العربية** |
| 229 | `S0041L01U01` | use | `S0041L01` | I started to feel → بدأت أحس | I feel okay but I'm starting to feel tired | أنا كويس، بس بدأت أحس إني تعبان | **كويس، بس بدأت أحس إني تعبان** |
| 230 | `S0325L01U01` | use | `S0325L01` | he considers → يفكر في | he needs to consider that | هو محتاج يفكر في كده | **محتاج يفكر في كده** |
| 231 | `S0325L01U05` | use | `S0325L01` | he considers → يفكر في | he needs to consider it now | هو محتاج يفكر في كده دلوقتي | **محتاج يفكر في كده دلوقتي** |
| 232 | `S0326L01U01` | use | `S0326L01` | she sells → تبيع | she needs to sell the car | هي محتاجة تبيع العربية | **محتاجة تبيع العربية** |
| 233 | `S0326L01U04` | use | `S0326L01` | she sells → تبيع | she said she needs to sell the room | هي قالت إنها محتاجة تبيع الأوضة | **قالت إنها محتاجة تبيع الأوضة** |
| 234 | `S0223L01U01` | use | `S0223L01` | he will ask you → حيسألك | he's going to ask you tomorrow | هو حيسألك بكرة | **حيسألك بكرة** |
| 235 | `S0327L01U02` | use | `S0327L01` | she offers → تعرض | she needs to offer a book | هي محتاجة تعرض كتاب | **محتاجة تعرض كتاب** |
| 236 | `S0333L01U01` | use | `S0333L01` | she spends → تقضي | she can't spend much time here | هي مش قادرة تقضي وقت كتير هنا | **مش قادرة تقضي وقت كتير هنا** |
| 237 | `S0332L01U01` | use | `S0332L01` | he's able → يقدر | he's able to consider that | هو يقدر يفكر في كده | **يقدر يفكر في كده** |
| 238 | `S0332L02U01` | use | `S0332L02` | he builds → يبني | he's able to build the house | هو يقدر يبني البيت | **يقدر يبني البيت** |
| 239 | `S0335L01U02` | use | `S0335L01` | he adds → يضيف | he can add some things | هو يقدر يضيف شوية حاجات | **يقدر يضيف شوية حاجات** |
| 240 | `S0335L01U05` | use | `S0335L01` | he adds → يضيف | he can add ten things | هو يقدر يضيف عشر حاجات | **يقدر يضيف عشر حاجات** |
| 241 | `S0336L01U02` | use | `S0336L01` | she opens → تفتح | she can open the room | هي تقدر تفتح الأوضة | **تقدر تفتح الأوضة** |
| 242 | `S0334L01U01` | use | `S0334L01` | he lets you → يخليك | he can let you sell the car | هو يقدر يخليك تبيع العربية | **يقدر يخليك تبيع العربية** |
| 243 | `S0334L01U04` | use | `S0334L01` | he lets you → يخليك | he can let you use the room | هو يقدر يخليك تستخدم الأوضة | **يقدر يخليك تستخدم الأوضة** |
| 244 | `S0209L02B03` | build | `S0209L02` | they meet → يتقابلوا | they want to spend more time meeting | هم عايزين يقضوا وقت أكتر يتقابلوا سوا | **عايزين يقضوا وقت أكتر يتقابلوا سوا** |
| 245 | `S0209L02U02` | use | `S0209L02` | they meet → يتقابلوا | they want to spend more time meeting | هم عايزين يقضوا وقت أكتر يتقابلوا | **عايزين يقضوا وقت أكتر يتقابلوا** |
| 246 | `S0209L02U06` | use | `S0209L02` | they meet → يتقابلوا | they want to meet here | هم عايزين يتقابلوا هنا | **عايزين يتقابلوا هنا** |
| 247 | `S0209L02U01` | use | `S0209L02` | they meet → يتقابلوا | they want to meet every week | هم عايزين يتقابلوا كل أسبوع | **عايزين يتقابلوا كل أسبوع** |
| 248 | `S0340L01U05` | use | `S0340L01` | he'll be → حيكون | he'll be here tomorrow | هو حيكون هنا بكرة | **حيكون هنا بكرة** |
| 249 | `S0343L01U01` | use | `S0343L01` | she's worried → قلقانة | she said she's worried | هي قالت إنها قلقانة | **قالت إنها قلقانة** |
| 250 | `S0346L01U02` | use | `S0346L01` | I liked → حبيت | I think I liked it | أنا بفكر إني حبيت كده | **بفكر إني حبيت كده** |
| 251 | `S0346L01U05` | use | `S0346L01` | I liked → حبيت | I know I liked it | أنا أعرف إني حبيت كده | **أعرف إني حبيت كده** |
| 252 | `S0351L01U04` | use | `S0351L01` | he leaves me → يسيبني | he wants to leave me with the group | هو عايز يسيبني مع المجموعة | **عايز يسيبني مع المجموعة** |
| 253 | `S0371L01U01` | use | `S0371L01` | I went → رحت | I think I went there | أنا بفكر إني رحت هناك | **بفكر إني رحت هناك** |
| 254 | `S0350L01U01` | use | `S0350L01` | he sees → يشوف | he wants to see that | هو عايز يشوف كده | **عايز يشوف كده** |
| 255 | `S0353L01U01` | use | `S0353L01` | she runs → تجري | she needs to run now | هي محتاجة تجري دلوقتي | **محتاجة تجري دلوقتي** |
| 256 | `S0353L01U03` | use | `S0353L01` | she runs → تجري | she said she needed to run | هي قالت إنها كانت محتاجة تجري | **قالت إنها كانت محتاجة تجري** |
| 257 | `S0357L01U02` | use | `S0357L01` | she sends → تبعت | she said she wants to send it to her | هي قالت إنها عايزة تبعت لها كده | **قالت إنها عايزة تبعت لها كده** |
| 258 | `S0370L01U01` | use | `S0370L01` | I didn't see → ما شفتش | I think I didn't see it | أنا بفكر إني ما شفتش كده | **بفكر إني ما شفتش كده** |
| 259 | `S0363L01U01` | use | `S0363L01` | he felt like → حس إنه عايز | he felt like buying a car | هو حس إنه عايز يشتري العربية | **حس إنه عايز يشتري العربية** |
| 260 | `S0365L01U02` | use | `S0365L01` | I didn't hear → ما سمعتش | I think I didn't hear that | أنا بفكر إني ما سمعتش كده | **بفكر إني ما سمعتش كده** |
| 261 | `S0376L01U01` | use | `S0376L01` | I didn't go → ما رحتش | I think I didn't go there | أنا بفكر إني ما رحتش هناك | **بفكر إني ما رحتش هناك** |
| 262 | `S0379L01U01` | use | `S0379L01` | I was lucky → كان عندي حظ | I was really lucky | أنا كان عندي حظ كتير | **كان عندي حظ كتير** |
| 263 | `S0379L01U05` | use | `S0379L01` | I was lucky → كان عندي حظ | I'm sure that I was lucky | أنا متأكد إن كان عندي حظ | **متأكد إن كان عندي حظ** |
| 264 | `S0379L01U03` | use | `S0379L01` | I was lucky → كان عندي حظ | I'm happy that I was so lucky | أنا مبسوط إني كان عندي حظ كتير | **مبسوط إني كان عندي حظ كتير** |
| 265 | `S0385L01U01` | use | `S0385L01` | you agreed → وافقت | you agreed with what he said | إنت وافقت على اللي قاله | **وافقت على اللي قاله** |
| 266 | `S0385L01U04` | use | `S0385L01` | you agreed → وافقت | you agreed a moment ago | إنت وافقت من شوية | **وافقت من شوية** |
| 267 | `S0385L01U05` | use | `S0385L01` | you agreed → وافقت | you really agreed | إنت وافقت بجد | **وافقت بجد** |
| 268 | `S0386L01U04` | use | `S0386L01` | I agreed with her → وافقت معاها | I think that I agreed with her | أنا بفكر إني وافقت معاها | **بفكر إني وافقت معاها** |
| 269 | `S0395L01B02` | build | `S0395L01` | we turn → نخش | we need to turn | إحنا محتاجين نخش | **محتاجين نخش** |
| 270 | `S0395L01U01` | use | `S0395L01` | we turn → نخش | we need to turn left | إحنا محتاجين نخش شمال | **محتاجين نخش شمال** |
| 271 | `S0399L01B02` | build | `S0399L01` | we lose → نخسر | we don't want to lose | إحنا مش عايزين نخسر | **مش عايزين نخسر** |
| 272 | `S0399L01U03` | use | `S0399L01` | we lose → نخسر | we really don't want to lose | بجد إحنا مش عايزين نخسر | **بجد مش عايزين نخسر** |
| 273 | `S0402L01U04` | use | `S0402L01` | we stop → نوقف | we really want to stop | بجد إحنا عايزين نوقف | **بجد عايزين نوقف** |
| 274 | `S0398L01B03` | build | `S0398L01` | we become → نبقى | we don't want to become | إحنا مش عايزين نبقى | **مش عايزين نبقى** |
| 275 | `S0398L01U05` | use | `S0398L01` | we become → نبقى | we really want to become happy | بجد إحنا عايزين نبقى مبسوطين | **بجد عايزين نبقى مبسوطين** |
| 276 | `S0400L01U03` | use | `S0400L01` | we eat → ناكل | we really want to eat something later | بجد إحنا عايزين ناكل حاجة بعدين | **بجد عايزين ناكل حاجة بعدين** |
| 277 | `S0403L03U04` | use | `S0403L03` | we can → نقدر | we really can get ready now | بجد إحنا نقدر نتجهز دلوقتي | **بجد نقدر نتجهز دلوقتي** |
| 278 | `S0401L01U04` | use | `S0401L01` | we head → نروح | we really want to go | بجد إحنا عايزين نروح | **بجد عايزين نروح** |
| 279 | `S0411L01U03` | use | `S0411L01` | we'd like → حابين | we'd really like to get ready now | بجد إحنا حابين نتجهز دلوقتي | **بجد حابين نتجهز دلوقتي** |
| 280 | `S0411L01U04` | use | `S0411L01` | we'd like → حابين | we'd like to stop here | إحنا حابين نوقف هنا | **حابين نوقف هنا** |
| 281 | `S0410L01B02` | build | `S0410L01` | they fight → بيتخانقوا | they still fight | هم لسه بيتخانقوا | **لسه بيتخانقوا** |
| 282 | `S0410L01U02` | use | `S0410L01` | they fight → بيتخانقوا | they've been fighting for a long time | من زمان هم بيتخانقوا | **من زمان بيتخانقوا** |
| 283 | `S0410L01U03` | use | `S0410L01` | they fight → بيتخانقوا | they really fight a lot | بجد هم بيتخانقوا كتير | **بجد بيتخانقوا كتير** |
| 284 | `S0410L01U04` | use | `S0410L01` | they fight → بيتخانقوا | they're fighting now | هم بيتخانقوا دلوقتي | **بيتخانقوا دلوقتي** |
| 285 | `S0412L04U03` | use | `S0412L04` | they win → يكسبوا | they said they want to win | هم قالوا إنهم عايزين يكسبوا | **قالوا إنهم عايزين يكسبوا** |
| 286 | `S0416L01U03` | use | `S0416L01` | they be → يكونوا | they said they want to be happy | هم قالوا إنهم عايزين يكونوا مبسوطين | **قالوا إنهم عايزين يكونوا مبسوطين** |
| 287 | `S0417L01U02` | use | `S0417L01` | they kill → يقتلوا | they really want to kill everything | بجد هم عايزين يقتلوا كل حاجة | **بجد عايزين يقتلوا كل حاجة** |
| 288 | `S0417L01U03` | use | `S0417L01` | they kill → يقتلوا | they said they don't want to kill | هم قالوا إنهم مش عايزين يقتلوا | **قالوا إنهم مش عايزين يقتلوا** |
| 289 | `S0420L01U02` | use | `S0420L01` | they ask → يسألوا | they really don't want to ask | بجد هم مش عايزين يسألوا | **بجد مش عايزين يسألوا** |
| 290 | `S0420L01U03` | use | `S0420L01` | they ask → يسألوا | they said they want to ask | هم قالوا إنهم عايزين يسألوا | **قالوا إنهم عايزين يسألوا** |
| 291 | `S0418L01U02` | use | `S0418L01` | they serve → يخدموا | they really want to serve | بجد هم عايزين يخدموا | **بجد عايزين يخدموا** |
| 292 | `S0418L01U03` | use | `S0418L01` | they serve → يخدموا | they said they want to serve the people | هم قالوا إنهم عايزين يخدموا الناس | **قالوا إنهم عايزين يخدموا الناس** |
| 293 | `S0439L01U04` | use | `S0439L01` | they die → يموتوا | they said no one wants to die | هم قالوا إن محدش عايز يموتوا | **قالوا إن محدش عايز يموتوا** |
| 294 | `S0426L01B03` | build | `S0426L01` | they love → يحبوا | they would like to love each other but they're unhappy | هم حابين يحبوا بعض بس هم مش مبسوطين | **حابين يحبوا بعض بس هم مش مبسوطين** <br>*second `هم` kept — `بس هم مش مبسوطين` is a verbless clause with no other subject marker* |
| 295 | `S0426L01U02` | use | `S0426L01` | they love → يحبوا | they really love each other a lot | بجد هم يحبوا بعض كتير | **بجد يحبوا بعض كتير** |
| 296 | `S0426L01U03` | use | `S0426L01` | they love → يحبوا | they said they love each other | هم قالوا إنهم يحبوا بعض | **قالوا إنهم يحبوا بعض** |
| 297 | `S0421L01U02` | use | `S0421L01` | he weakens → بيضعف | he's really getting very weak | بجد هو بيضعف كتير | **بجد بيضعف كتير** |
| 298 | `S0421L01U04` | use | `S0421L01` | he weakens → بيضعف | he's still getting weak now | لسه هو بيضعف دلوقتي | **لسه بيضعف دلوقتي** |
| 299 | `S0424L01U02` | use | `S0424L01` | they waste → بيضيعوا | they're really wasting everything | بجد هم بيضيعوا كل حاجة | **بجد بيضيعوا كل حاجة** |
| 300 | `S0424L01U03` | use | `S0424L01` | they waste → بيضيعوا | they said they're not wasting time | هم قالوا إنهم مش بيضيعوا وقت | **قالوا إنهم مش بيضيعوا وقت** |
| 301 | `S0428L01U02` | use | `S0428L01` | they visit us → يزورونا | they really visit us a lot | بجد هم يزورونا كتير | **بجد يزورونا كتير** |
| 302 | `S0428L01U03` | use | `S0428L01` | they visit us → يزورونا | they want to visit us | هم عايزين يزورونا | **عايزين يزورونا** |
| 303 | `S0432L01U02` | use | `S0432L01` | they mean → يقصدوا | they really mean something else | بجد هم يقصدوا حاجة تانية | **بجد يقصدوا حاجة تانية** |
| 304 | `S0432L01U03` | use | `S0432L01` | they mean → يقصدوا | they said they mean that | هم قالوا إنهم يقصدوا كده | **قالوا إنهم يقصدوا كده** |
| 305 | `S0432L02U03` | use | `S0432L02` | they want you → عايزينك | they said they want you to ask | هم قالوا إنهم عايزينك تسأل | **قالوا إنهم عايزينك تسأل** |
| 306 | `S0431L02B03` | build | `S0431L02` | they'll be → حيكونوا | they're not ready yet but they'll be ready soon | هم مش جاهزين لسه بس حيكونوا جاهزين قريب | **مش جاهزين لسه بس حيكونوا جاهزين قريب** |
| 307 | `S0431L02U03` | use | `S0431L02` | they'll be → حيكونوا | they said they'll be here soon | هم قالوا إنهم حيكونوا هنا قريب | **قالوا إنهم حيكونوا هنا قريب** |
| 308 | `S0437L02U04` | use | `S0437L02` | they can → يقدروا | they still can now | لسه هم يقدروا دلوقتي | **لسه يقدروا دلوقتي** |
| 309 | `S0433L02B03` | build | `S0433L02` | they find out → يعرفوا | they couldn't find out when the film started | هم ما قدروش يعرفوا إمتى الفيلم بدأ | **ما قدروش يعرفوا إمتى الفيلم بدأ** |
| 310 | `S0434L04U03` | use | `S0434L04` | they take them → بياخدوهم | they still take them | لسه هم بياخدوهم | **لسه بياخدوهم** |
| 311 | `S0435L01U02` | use | `S0435L01` | they could if they wanted to → ممكن لو كانوا عايزين | they said it's possible if they wanted to | هم قالوا إن ممكن لو كانوا عايزين | **قالوا إن ممكن لو كانوا عايزين** |
| 312 | `S0436L01U02` | use | `S0436L01` | they need it → محتاجينه | they said they really need it | هم قالوا إن محتاجينه بجد | **قالوا إن محتاجينه بجد** |
| 313 | `S0440L01U04` | use | `S0440L01` | they travel → يسافروا | they're still traveling a lot | لسه هم يسافروا كتير | **لسه يسافروا كتير** |
| 314 | `S0445L02U04` | use | `S0445L02` | they carry → يشيلوا | they're still carrying everything | لسه هم يشيلوا كل حاجة | **لسه يشيلوا كل حاجة** |
| 315 | `S0448L01U04` | use | `S0448L01` | they help → يساعدوا | they're still helping now | لسه هم يساعدوا دلوقتي | **لسه يساعدوا دلوقتي** |
| 316 | `S0446L01U04` | use | `S0446L01` | they break → يكسروا | they're still breaking something | لسه هم يكسروا حاجة | **لسه يكسروا حاجة** |
| 317 | `S0443L02U04` | use | `S0443L02` | they do it → يعملوه | they're still doing it every day | لسه هم يعملوه كل يوم | **لسه يعملوه كل يوم** |
| 318 | `S0452L01B03` | build | `S0452L01` | they didn't say → ما قالوش | they didn't say what they wanted to do | هم ما قالوش اللي كانوا عايزين يعملوه | **ما قالوش اللي كانوا عايزين يعملوه** |
| 319 | `S0447L01U04` | use | `S0447L01` | they drive us → يوصلونا | they're still driving us now | لسه هم يوصلونا دلوقتي | **لسه يوصلونا دلوقتي** |
| 320 | `S0450L01U04` | use | `S0450L01` | they catch → يلحقوا | they're still catching it now | لسه هم يلحقوا دلوقتي | **لسه يلحقوا دلوقتي** |
| 321 | `S0461L01U01` | use | `S0461L01` | I buy → أشتري | I think I can buy this | أنا بفكر إني أقدر أشتري ده | **بفكر إني أقدر أشتري ده** |
| 322 | `S0476L01U01` | use | `S0476L01` | i'm waiting → بستنى | I think I'm waiting a lot | أنا بفكر إني بستنى كتير | **بفكر إني بستنى كتير** |
| 323 | `S0479L01U01` | use | `S0479L01` | I do it → أعملها | I think I can manage it | أنا بفكر إني أقدر أعملها | **بفكر إني أقدر أعملها** |
| 324 | `S0485L02U01` | use | `S0485L02` | I get away → أبعد | I think I want to get away | أنا بفكر إني عايز أبعد | **بفكر إني عايز أبعد** |
| 325 | `S0490L02U01` | use | `S0490L02` | i'll trust → حاثق | I think I'll trust someone | أنا بفكر إني حاثق في حد | **بفكر إني حاثق في حد** |
| 326 | `S0496L01U01` | use | `S0496L01` | I plan → بخطط | I think I plan well | أنا بفكر إني بخطط كويس | **بفكر إني بخطط كويس** |
| 327 | `S0504L01U01` | use | `S0504L01` | I will run → حاجري | I think I'll really run | أنا بفكر إني حاجري بجد | **بفكر إني حاجري بجد** |
| 328 | `S0504L01B02` | build | `S0504L01` | I will run → حاجري | I'm going to run | أنا حاجري | **حاجري** |
| 329 | `S0496L02U01` | use | `S0496L02` | I lose → أخسر | I think I don't want to lose | أنا بفكر إني مش عايز أخسر | **بفكر إني مش عايز أخسر** |
| 330 | `S0501L02U01` | use | `S0501L02` | I trust → أثق | I think I trust a lot | أنا بفكر إني أثق كتير | **بفكر إني أثق كتير** |
| 331 | `S0503L01U01` | use | `S0503L01` | I hate → بكره | I think I hate this | أنا بفكر إني بكره ده | **بفكر إني بكره ده** |
| 332 | `S0513L02U01` | use | `S0513L02` | I move → أحرك | I think I move well | أنا بفكر إني أحرك كويس | **بفكر إني أحرك كويس** |
| 333 | `S0512L02U01` | use | `S0512L02` | I fetch → أجيب | I think I'll fetch this | أنا بفكر إني أجيب ده | **بفكر إني أجيب ده** |
| 334 | `S0518L01U01` | use | `S0518L01` | I imagine → أتخيل | I think I imagine this | أنا بفكر إني أتخيل ده | **بفكر إني أتخيل ده** |
| 335 | `S0524L01U01` | use | `S0524L01` | i'll call → حاتصل | I think I'll call you | أنا بفكر إني حاتصل بيك | **بفكر إني حاتصل بيك** |
| 336 | `S0514L01U01` | use | `S0514L01` | I found → لاقيت | I think I found this | أنا بفكر إني لاقيت ده | **بفكر إني لاقيت ده** |
| 337 | `S0530L01U01` | use | `S0530L01` | I count them → أعدهم | I think I count them well | أنا بفكر إني أعدهم كويس | **بفكر إني أعدهم كويس** |
| 338 | `S0521L01U01` | use | `S0521L01` | i'm afraid → خايف | I think he's afraid | أنا بفكر إنه خايف | **بفكر إنه خايف** |
| 339 | `S0528L02U01` | use | `S0528L02` | I put → أحط | I think I put this here | أنا بفكر إني أحط ده هنا | **بفكر إني أحط ده هنا** |
| 340 | `S0538L01U01` | use | `S0538L01` | I seem → أبان | I think I seem good | أنا بفكر إني أبان كويس | **بفكر إني أبان كويس** |
| 341 | `S0562L01B03` | build | `S0562L01` | I arrive → أوصل | I just want to arrive | أنا بس عايز أوصل | **بس عايز أوصل** |
| 342 | `S0562L01U01` | use | `S0562L01` | I arrive → أوصل | I think I'll arrive early | أنا بفكر إني أوصل بدري | **بفكر إني أوصل بدري** |
| 343 | `S0563L01U01` | use | `S0563L01` | I continue → أكمل | I think I'll continue | أنا بفكر إني أكمل | **بفكر إني أكمل** |
| 344 | `S0595L01B03` | build | `S0595L01` | I lie down → أنام | I need to lie down in the garden | أنا محتاج أنام في الجنينة | **محتاج أنام في الجنينة** |
| 345 | `S0604L02B03` | build | `S0604L02` | she lets us → تخلينا | she offered to let us stay with her | هي عرضت إنها تخلينا نسكن معاها | **عرضت إنها تخلينا نسكن معاها** |
| 346 | `S0654L01B04` | build | `S0654L01` | i'm not sure if → مش متأكد لو | I'm not sure if I can help you, sir | أنا مش متأكد لو أقدر أساعدك يا فندم | **مش متأكد لو أقدر أساعدك يا فندم** |
| 347 | `S0647L01B04` | build | `S0647L01` | you speak it → بتتكلميها | you speak it, madam | إنت بتتكلميها يا مدام | **بتتكلميها يا مدام** |
| 348 | `S0661L01B04` | build | `S0661L01` | you all are doing → بتعملوا | you're all doing something | إنتو بتعملوا حاجة | **بتعملوا حاجة** |
| 349 | `S0661L01U03` | use | `S0661L01` | you all are doing → بتعملوا | you all are really doing something | إنتو بتعملوا حاجة فعلا | **بتعملوا حاجة فعلا** |
| 350 | `S0661L01U04` | use | `S0661L01` | you all are doing → بتعملوا | you all are still doing something | لسه إنتو بتعملوا حاجة | **لسه بتعملوا حاجة** |
| 351 | `S0661L01U05` | use | `S0661L01` | you all are doing → بتعملوا | you all are doing something again | إنتو بتعملوا حاجة تاني | **بتعملوا حاجة تاني** |
| 352 | `S0331L01U01` | use | `S0331L01` | she can't → مش قادرة | she can't sell the company | هي مش قادرة تبيع الشركة | **مش قادرة تبيع الشركة** |

---

## Not proposing to change — 42

### A. Tiles a lesson that teaches the pronoun on purpose — 35

Not drift. Each of these opens with the exact target text of another lego in the course. Removing the pronoun would break the tiling and split that lego's known string across two targets.

| phrase id | drill known | current target | the lesson it is tiling |
|---|---|---|---|
| `S0108L02U01` | we want to wake up early tomorrow morning | إحنا عايزين نصحى الصبح بكرة | `S0018L01` we want = إحنا عايزين |
| `S0045L01U04` | I want to know how to speak arabic | أنا عايز أعرف إزاي أتكلم عربي | `S0001L01` I want = أنا عايز |
| `S0180L01U02` | I want to learn to read | أنا عايز أتعلم أقرا | `S0001L01` I want = أنا عايز |
| `S0180L01U04` | I'm trying to read more | أنا بحاول أقرا أكتر | `S0002L01` I'm trying to = أنا بحاول |
| `S0147L02U02` | she was kind when she saw me here | هي كانت طيبة لما شافتني هنا | `S0246L02` she was = هي كانت |
| `S0147L02U03` | she was kind when she saw me yesterday | هي كانت طيبة لما شافتني إمبارح | `S0246L02` she was = هي كانت |
| `S0147L02U05` | she was kind when she saw me today | هي كانت طيبة لما شافتني النهارده | `S0246L02` she was = هي كانت |
| `S0147L02U04` | she was kind when she saw me with you | هي كانت طيبة لما شافتني معاك | `S0246L02` she was = هي كانت |
| `S0147L02U01` | she was very kind when she saw me | هي كانت طيبة جدا لما شافتني | `S0246L02` she was = هي كانت |
| `S0188L01U01` | I'm trying to change | أنا بحاول أتغير | `S0002L01` I'm trying to = أنا بحاول |
| `S0003L02U05` | I want to learn how I can speak Arabic | أنا عايز أتعلم إزاي أقدر أتكلم عربي | `S0001L01` I want = أنا عايز |
| `S0038L02B02` | I've been learning | أنا بقالي بتعلم | `S0038L01` I've been = أنا بقالي |
| `S0038L02U05` | I've been learning with many people | أنا بقالي بتعلم مع ناس كتير | `S0038L01` I've been = أنا بقالي |
| `S0038L02U01` | I've been learning Arabic | أنا بقالي بتعلم عربي | `S0038L01` I've been = أنا بقالي |
| `S0195L03U01` | I'm trying to find the money I left | أنا بحاول ألاقي الفلوس اللي سيبتها | `S0002L01` I'm trying to = أنا بحاول |
| `S0109L02U02` | we want to learn more | إحنا عايزين نتعلم أكتر | `S0018L01` we want = إحنا عايزين |
| `S0302L01U01` | she wants to live here | هي عايزة تعيش هنا | `S0017L01` she wants = هي عايزة |
| `S0302L01U05` | she wants to live with someone else | هي عايزة تعيش مع حد تاني | `S0017L01` she wants = هي عايزة |
| `S0257L02U05` | I like the blue thing | أنا بحب الحاجة الزرقا دي | `S0026L01` I like to = أنا بحب |
| `S0310L01U05` | she wants to write now | هي عايزة تكتب دلوقتي | `S0017L01` she wants = هي عايزة |
| `S0333L01U05` | she wants to spend much time with me | هي عايزة تقضي وقت كتير معايا | `S0017L01` she wants = هي عايزة |
| `S0336L01U05` | she wants to open the room | هي عايزة تفتح الأوضة | `S0017L01` she wants = هي عايزة |
| `S0246L01U01` | she was very busy | هي كانت مشغولة جداً | `S0246L02` she was = هي كانت |
| `S0246L01U04` | she was busy today | هي كانت مشغولة النهارده | `S0246L02` she was = هي كانت |
| `S0236L03U03` | she wants to help | هي عايزة تساعد | `S0017L01` she wants = هي عايزة |
| `S0357L01U01` | she wants to send it to her | هي عايزة تبعت لها كده | `S0017L01` she wants = هي عايزة |
| `S0357L01U05` | she just wanted to send it | هي كانت بس عايزة تبعت كده | `S0246L02` she was = هي كانت |
| `S0399L01B03` | we want to lose | إحنا عايزين نخسر | `S0018L01` we want = إحنا عايزين |
| `S0398L01B02` | we want to become | إحنا عايزين نبقى | `S0018L01` we want = إحنا عايزين |
| `S0398L01U01` | we want to become happy | إحنا عايزين نبقى مبسوطين | `S0018L01` we want = إحنا عايزين |
| `S0400L01B02` | we want to eat | إحنا عايزين ناكل | `S0018L01` we want = إحنا عايزين |
| `S0538L01B03` | I don't want to seem as though I don't care | أنا مش عايز أبان زي ما أنا مش مهتم | `S0019L02` I don't want = أنا مش عايز |
| `S0549L01U01` | I think I have to be quiet | أنا بفكر إن لازم أسكت | `S0553L01` I think that = أنا بفكر إن |
| `S0565L01U01` | I think I'd have thought about it more carefully | أنا بفكر إن كنت فكرت فيها كويس أكتر | `S0553L01` I think that = أنا بفكر إن |
| `S0505L01U01` | I think I don't stay here | أنا بفكر إن ما أبقاش هنا | `S0553L01` I think that = أنا بفكر إن |

### B. Verbless — the pronoun is the only thing naming the subject — 6

| phrase id | person | drill known | current target | why not |
|---|---|---|---|---|
| `S0246L01U05` | 3sf | she's too busy | هي مشغولة كتير | `مشغولة كتير` has no verb anywhere — cold it reads as *I am / you are very busy* at least as readily as *she is*. |
| `S0246L01U03` | 3sf | she's still busy | هي لسه مشغولة | `لسه مشغولة` has nothing but a feminine-singular adjective to carry the subject. |
| `S0343L01U04` | 3sf | she's worried about the company | هي قلقانة على الشركة | `قلقانة على الشركة` gives no clue that the worrier is *she* rather than *I* or *you*. |
| `S0432L02U02` | 3p | they really want you here | بجد هم عايزينك هنا | `بجد عايزينك هنا` reads as *we really want you here* — dropping flips the meaning, it does not just shorten it. |
| `S0432L02U04` | 3p | they still want you now | لسه هم عايزينك دلوقتي | `لسه عايزينك دلوقتي` would be heard as *we*, not *they*. |
| `S0436L01U03` | 3p | they still need it | لسه هم محتاجينه | `لسه محتاجينه` defaults to *we still need it*; the plural participle marks number, not person. |

### C. Detector artefact — 1

| phrase id | drill known | current target | why not |
|---|---|---|---|
| `S0553L01U05` | I'm not sure but I think that it's good | مش متأكد بس أنا بفكر إن ده كويس | The lesson here is the EXPLICIT one (`أنا بفكر إن`) and this drill already contains it verbatim, just not in the first three words. Nothing to change. |

### Two lines where I keep a SECOND pronoun

- `S0057L01U03` — *I can't explain what I mean* / `أنا ما أقدرش أشرح اللي أنا قصده`. First `أنا` goes. The second is the subject of the relative clause and is required: `اللي قصده` means *what **he** means*.
- `S0426L01B03` — *they would like to love each other but they're unhappy* / `هم حابين يحبوا بعض بس هم مش مبسوطين`. First `هم` goes; the second holds up a verbless clause.

### Three things I noticed in passing, none of them in scope here

- **`S0647L01B04`** — *you speak it, madam* / `إنت بتتكلميها يا مدام`. The verb is second-person **feminine** but the pronoun is masculine `إنت`, not `إنتي`. I am deleting it anyway so it stops mattering on this line, but the same mismatch elsewhere would be a real defect.
- **`S0041L01U01`** — `أنا كويس، بس بدأت أحس إني تعبان` carries a comma. Punctuation inside a drill target is outside this pass; I left it byte-identical.
- **Seed 246 is internally at odds.** `S0246L01` teaches *she's busy* as the bare `مشغولة` while `S0246L02` in the same seed teaches *she was* as `هي كانت`. Its drills sit between the two, and `S0246L01U04` and `S0246L02U04` are byte-identical rows under the same known text. That is a lesson-level defect, not a drill one.

---

## What this pass is really doing, in plain words

A lesson teaches you to say *I'll ask him* as `حاسأله` — no `أنا`, because Egyptian already puts the *I* inside the verb. Then the practice sentences built on that lesson put the `أنا` back in. The learner is taught one shape and drilled on another. That happens 394 times, spread evenly across every batch and every build date since May, so it is a habit the generator picked up rather than one bad afternoon.

This proposal makes the drills match their lessons, because the lesson is the thing that teaches. For 352 lines that is a pure deletion: one word out, nothing else moved, meaning identical, and the result is the more natural Egyptian anyway.

For the other 42 it is not, and the biggest group is the interesting one. 35 of these lines were never drift. This course spends its first fifty seeds teaching the pronoun deliberately — *I want* is taught as `أنا عايز`, *she was* as `هي كانت` — and those drills are faithfully repeating what they were taught. The survey's 18.5% figure is comparing each drill against only the one lesson it hangs off, so it counts a drill built out of two lessons as a disagreement with one of them. Strip that out and the real drill-level drift in this course is about 352 lines, not 425.

Six more I am refusing on plain language grounds: sentences with no verb at all, where `هي مشغولة كتير` only means *she's very busy* because of the `هي`. Take it out and a native hears *I'm very busy*. The honest reading of those is that the **lessons** behind them are where the problem lives — a lesson teaching *she's busy* as the bare adjective `مشغولة` cannot stand on its own either. That is a lesson-level call, and it is Tom's.
