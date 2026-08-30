# eng_for_deu — contraction drift, proposed rewrites (PROPOSE ONLY)

**Headline: 180 drill lines proposed for rewrite (mid-clause contractions the course already teaches elsewhere, that the drill spells out); 71 drill lines in the same audit refused, because the mechanical contraction is wrong, ungrammatical, or a false match — not because the underlying drift finding is wrong.** Nothing here is applied: no DB writes, no TTS, no commits.

## 1. The three scopes, and which one I'd run

| Scope | Lines | What it means |
|---|---|---|
| **Strict** — drill's own taught lego contains the contracted form, drill spells it out | **3** | Unarguable: the lesson right above the drill teaches "he's"/"isn't", the drill uses "he is"/"is not". |
| **Wide** — course teaches the contracted form *somewhere*, drill's own lego doesn't teach the expanded form | **270 raw hits / 251 unique drill lines** | The reading Tom's ruling actually calls for: "drills match the taught LEGO", and the taught form is contracted course-wide. |
| **Neither** | **~140 raw hits** | The drill's own lego, or some other lego, actively teaches the *expanded* form (`own_teaches_expanded` or `course_teaches_expanded`) — contracting here would create a second target for a known string that already has one, i.e. a ZUT break. Correctly out of scope. |

**Recommendation: run the wide scope, but only the 180 lines below that survive an English-speaker naturalness check — not all 251.** The strict scope (3 lines) is real but tiny and doesn't touch the actual complaint (7.2% same-day scatter, 410 raw hits). The wide scope is what "drills match the taught lego" means once you follow it past the single line that happens to sit under the same lesson: if the course teaches "he's"/"you're"/"I'll" as the target form at all, a drill spelling out "he is"/"you are"/"I will" is teaching the learner a form they'll never hear modelled. But the wide scope's mechanical list is not safe to run as-is — of 251 unique drill lines, 71 are contractions that don't work in English (obligation "have to", possession "have a car", simple-past "had", or outright false matches). Those 71 are listed in full in §4 with reasons; the other 180 are the actual proposal.

## 2. The 3 strict rows (unarguable — own lego teaches the contracted form)

| Phrase ID | Role | Taught lego | Known | BEFORE | AFTER |
|---|---|---|---|---|---|
| eng_for_deu:S0159L02U04 | use | S0159L02: "that isn't" | das ist nicht schwierig | this is not difficult | this isn't difficult |
| eng_for_deu:S0130L02U04 | use | S0130L02: "he's my friend" | er ist mein Freund, und ich glaube, er macht es gut | he's my friend and I believe he is doing well | he's my friend and I believe he's doing well |
| eng_for_deu:S0130L02U05 | use | S0130L02: "he's my friend" | er ist mein Freund, und er hat es definitiv leichter als beim letzten Mal | he's my friend and he is definitely doing easier than last time | he's my friend and he's definitely doing easier than last time |

All three are also in the wide-scope proposal below (S0159L02U04, S0130L02U04, S0130L02U05) — they're not double-counted in the headline.

## 3. Recommended-scope proposal — all 180 rewrites

Every line the course teaches the contracted form somewhere, and where the contraction reads naturally in an English speaker's ear. Phrase ID / role / taught lego / known / BEFORE / AFTER.

| # | Phrase ID | Role | Taught lego (id: known → target) | Known (DE) | BEFORE | AFTER |
|---|---|---|---|---|---|---|
| 1 | eng_for_deu:S0267L01U02 | use | S0267L01: "heard from" | ich habe seit gestern nicht von meinem Bruder gehört | I have not heard from my brother since yesterday | I haven't heard from my brother since yesterday *(merged: two candidate contractions on one line ("have not"->"haven't", "i have"->"I've"); "haven't" is the natural single contraction, the "I've not heard" reading is superseded)* |
| 2 | eng_for_deu:S0026L03B02 | build | S0026L03: "nearly ready to go" | er ist fast bereit zu gehen | he is nearly ready to go | he's nearly ready to go |
| 3 | eng_for_deu:S0026L03U01 | use | S0026L03: "nearly ready to go" | er ist fast bereit, Englisch zu sprechen | he is nearly ready to speak English | he's nearly ready to speak English |
| 4 | eng_for_deu:S0026L03U03 | use | S0026L03: "nearly ready to go" | er sagt, er ist fast bereit zu gehen | he says he is nearly ready to go | he says he's nearly ready to go |
| 5 | eng_for_deu:S0039L02U01 | use | S0039L02: "tired" | er ist heute Morgen ein bisschen müde | he is a little tired this morning | he's a little tired this morning |
| 6 | eng_for_deu:S0130L02U04 | use | S0130L02: "he's my friend" | er ist mein Freund, und ich glaube, er macht es gut | he's my friend and I believe he is doing well | he's my friend and I believe he's doing well |
| 7 | eng_for_deu:S0130L02U05 | use | S0130L02: "he's my friend" | er ist mein Freund, und er hat es definitiv leichter als beim letzten Mal | he's my friend and he is definitely doing easier than last time | he's my friend and he's definitely doing easier than last time |
| 8 | eng_for_deu:S0196L01U04 | use | S0196L01: "heard" | ich habe gehört, dass er beschäftigt ist | I heard that he is busy | I heard that he's busy |
| 9 | eng_for_deu:S0200L01U05 | use | S0200L01: "they say" | sie sagen, dass er morgen Abend beschäftigt ist | they say that he is busy tomorrow night | they say that he's busy tomorrow night |
| 10 | eng_for_deu:S0200L03U05 | use | S0200L03: "make sure" | kannst du sicherstellen, dass er morgen Abend da ist? | can you make sure that he is there tomorrow night? | can you make sure that he's there tomorrow night? |
| 11 | eng_for_deu:S0227L02B03 | build | S0227L02: "something new" | er wird mir etwas Neues sagen | he is going to tell me something new | he's going to tell me something new |
| 12 | eng_for_deu:S0239L02U05 | use | S0239L02: "likes to read" | der junge Mann liest gerne, obwohl er beschäftigt ist | the young man likes to read although he is busy | the young man likes to read although he's busy |
| 13 | eng_for_deu:S0253L02U01 | use | S0253L02: "in a few minutes" | er wird in ein paar Minuten fertig sein | he is going to be done in a few minutes | he's going to be done in a few minutes |
| 14 | eng_for_deu:S0253L02U04 | use | S0253L02: "in a few minutes" | er sagte, dass er in ein paar Minuten fertig ist | he said that he is done in a few minutes | he said that he's done in a few minutes |
| 15 | eng_for_deu:S0256L01U02 | use | S0256L01: "less than an hour" | er wird in weniger als einer Stunde antworten | he is going to answer in less than an hour | he's going to answer in less than an hour |
| 16 | eng_for_deu:S0270L02U03 | use | S0270L02: "late" | er hat Angst, dass er zu spät kommt | he is worried that he is going to be late | he's worried that he's going to be late |
| 17 | eng_for_deu:S0253L02U03 | use | S0253L02: "in a few minutes" | ich werde in ein paar Minuten antworten | I am going to answer in a few minutes | I'm going to answer in a few minutes |
| 18 | eng_for_deu:S0263L02U02 | use | S0263L02: "I don't know" | ich weiß nicht, ob ich bereit bin | I don't know if I am ready | I don't know if I'm ready |
| 19 | eng_for_deu:S0270L01B01 | build | S0270L01: "worried" | ich habe Angst | I am worried | I'm worried |
| 20 | eng_for_deu:S0152L04U03 | use | S0152L04: "what you wanted" | wenn ich gewusst hätte, was du wolltest, hätte ich es anders gemacht | if I had known what you wanted I would have done it differently | if I'd known what you wanted I'd have done it differently *(merged: two candidate contractions on one line ("i had"->"I'd", "i would"->"I'd"); both are natural together, merged into one rewrite rather than two separate proposals)* |
| 21 | eng_for_deu:S0205L01B02 | build | S0205L01: "forgotten" | ich habe vergessen | I have forgotten | I've forgotten |
| 22 | eng_for_deu:S0205L01B03 | build | S0205L01: "forgotten" | ich habe ein Wort vergessen | I have forgotten a word | I've forgotten a word |
| 23 | eng_for_deu:S0205L01U01 | use | S0205L01: "forgotten" | ich habe ein Wort vergessen, das ich sagen wollte | I have forgotten a word I was trying to say | I've forgotten a word I was trying to say |
| 24 | eng_for_deu:S0205L01U02 | use | S0205L01: "forgotten" | ich habe vergessen, was du gesagt hast | I have forgotten what you said | I've forgotten what you said |
| 25 | eng_for_deu:S0205L01U03 | use | S0205L01: "forgotten" | ich habe vergessen, was passieren sollte | I have forgotten what was going to happen | I've forgotten what was going to happen |
| 26 | eng_for_deu:S0205L01U04 | use | S0205L01: "forgotten" | ich habe vergessen, was ich sagen wollte | I have forgotten what I wanted to say | I've forgotten what I wanted to say |
| 27 | eng_for_deu:S0244L01B02 | build | S0244L01: "learnt a lot" | ich habe viel gelernt | I have learnt a lot | I've learnt a lot |
| 28 | eng_for_deu:S0244L01B03 | build | S0244L01: "learnt a lot" | ich habe schon viel gelernt | I have learnt a lot already | I've learnt a lot already |
| 29 | eng_for_deu:S0244L01U04 | use | S0244L01: "learnt a lot" | ich habe viel gelernt, obwohl ich beschäftigt war | I have learnt a lot although I was busy | I've learnt a lot although I was busy |
| 30 | eng_for_deu:S0245L02B02 | build | S0245L02: "I am happy with" | ich bin zufrieden damit, wie viel ich gemacht habe | I am happy with how much I have done | I am happy with how much I've done |
| 31 | eng_for_deu:S0245L02B03 | build | S0245L02: "I am happy with" | ich bin zufrieden damit, wie viel ich in kurzer Zeit gemacht habe | I am happy with how much I have done in a short time | I am happy with how much I've done in a short time |
| 32 | eng_for_deu:S0245L02U03 | use | S0245L02: "I am happy with" | ich bin zufrieden damit, wie viel ich schon gelernt habe | I am happy with how much I have learnt already | I am happy with how much I've learnt already |
| 33 | eng_for_deu:S0251L01B02 | build | S0251L01: "after" | nachdem ich gefragt habe | after I have asked | after I've asked |
| 34 | eng_for_deu:S0251L01U02 | use | S0251L01: "after" | nachdem ich gefragt habe, möchte ich antworten | after I have asked, I want to answer | after I've asked, I want to answer |
| 35 | eng_for_deu:S0251L02U02 | use | S0251L02: "find out until" | ich möchte es erst erfahren, nachdem ich gefragt habe | I don't want to find out until after I have asked | I don't want to find out until after I've asked |
| 36 | eng_for_deu:S0251L02U03 | use | S0251L02: "find out until" | er möchte es erst erfahren, nachdem ich ihm gesagt habe | he doesn't want to find out until after I have told him | he doesn't want to find out until after I've told him |
| 37 | eng_for_deu:S0254L01U01 | use | S0254L01: "since" | ich arbeite seit heute Morgen | I have been working since this morning | I've been working since this morning |
| 38 | eng_for_deu:S0254L01U02 | use | S0254L01: "since" | ich bin seit gestern beschäftigt | I have been busy since yesterday | I've been busy since yesterday |
| 39 | eng_for_deu:S0254L01U03 | use | S0254L01: "since" | ich lerne seit gestern | I have been learning since yesterday | I've been learning since yesterday |
| 40 | eng_for_deu:S0254L01U04 | use | S0254L01: "since" | ich mache das seit einer Weile | I have been doing that since a while ago | I've been doing that since a while ago |
| 41 | eng_for_deu:S0254L01U05 | use | S0254L01: "since" | ich spreche seit heute Morgen Englisch | I have been speaking English since this morning | I've been speaking English since this morning |
| 42 | eng_for_deu:S0256L01U04 | use | S0256L01: "less than an hour" | ich bin seit weniger als einer Stunde bereit | I have been ready for less than an hour | I've been ready for less than an hour |
| 43 | eng_for_deu:S0168L02U04 | use | S0168L02: "and then" | ich werde helfen und dann später gehen | I will help and then go later on | I'll help and then go later on |
| 44 | eng_for_deu:S0256L01B03 | build | S0256L01: "less than an hour" | ich werde in weniger als einer Stunde bereit sein | I will be ready in less than an hour | I'll be ready in less than an hour |
| 45 | eng_for_deu:S0256L01U01 | use | S0256L01: "less than an hour" | in weniger als einer Stunde werde ich fertig sein | in less than an hour I will be done | in less than an hour I'll be done |
| 46 | eng_for_deu:S0259L01U01 | use | S0259L01: "an idea" | ich denke, ich werde eine Idee haben | I think I will have an idea | I think I'll have an idea |
| 47 | eng_for_deu:S0152L03B03 | build | S0152L03: "if I had known" | ich hätte es anders gemacht, wenn ich gewusst hätte | I would have done it differently if I had known | I'd have done it differently if I had known |
| 48 | eng_for_deu:S0152L03U01 | use | S0152L03: "if I had known" | wenn ich gewusst hätte, hätte ich es anders gemacht | if I had known I would have done it differently | if I had known I'd have done it differently |
| 49 | eng_for_deu:S0152L03U02 | use | S0152L03: "if I had known" | wenn ich gewusst hätte, hätte ich es versucht | if I had known I would have tried it | if I had known I'd have tried it |
| 50 | eng_for_deu:S0152L03U03 | use | S0152L03: "if I had known" | wenn ich gewusst hätte, dass es schwierig ist, hätte ich es anders gemacht | if I had known it was difficult I would have done it differently | if I had known it was difficult I'd have done it differently |
| 51 | eng_for_deu:S0152L03U04 | use | S0152L03: "if I had known" | wenn ich gewusst hätte, wie man es macht, hätte ich es versucht | if I had known how to do it I would have tried | if I had known how to do it I'd have tried |
| 52 | eng_for_deu:S0152L03U05 | use | S0152L03: "if I had known" | ich hätte es dir gesagt, wenn ich gewusst hätte | I would have said it to you if I had known | I'd have said it to you if I had known |
| 53 | eng_for_deu:S0162L01U01 | use | S0162L01: "about that" | ich möchte gerne darüber reden | I would like to talk about that | I'd like to talk about that |
| 54 | eng_for_deu:S0094L01B03 | build | S0094L01: "this is" | das ist nicht leicht | this is not easy | this isn't easy |
| 55 | eng_for_deu:S0094L01U03 | use | S0094L01: "this is" | das ist nicht schwierig | this is not difficult | this isn't difficult |
| 56 | eng_for_deu:S0098L03U04 | use | S0098L03: "playing something else" | etwas anderes zu spielen ist nicht schwierig | playing something else is not difficult | playing something else isn't difficult |
| 57 | eng_for_deu:S0100L03B04 | build | S0100L03: "doing something similar" | etwas Ähnliches zu tun ist nicht schwierig | doing something similar is not difficult | doing something similar isn't difficult |
| 58 | eng_for_deu:S0101L03U01 | use | S0101L03: "this language" | ich denke, diese Sprache ist nicht schwierig | I think this language is not difficult | I think this language isn't difficult |
| 59 | eng_for_deu:S0108L03B03 | build | S0108L03: "in the middle of the night" | mitten in der Nacht aufzuwachen ist nicht gut | waking up in the middle of the night is not good | waking up in the middle of the night isn't good |
| 60 | eng_for_deu:S0108L03U05 | use | S0108L03: "in the middle of the night" | ich denke, mitten in der Nacht aufzuwachen ist nicht gut | I think waking up in the middle of the night is not good | I think waking up in the middle of the night isn't good |
| 61 | eng_for_deu:S0116L01B03 | build | S0116L01: "the best choice" | das ist nicht die beste Wahl | this is not the best choice | this isn't the best choice |
| 62 | eng_for_deu:S0116L02U01 | use | S0116L02: "I could make" | das ist nicht die beste Wahl, die ich treffen könnte | this is not the best choice I could make | this isn't the best choice I could make |
| 63 | eng_for_deu:S0159L02U04 | use | S0159L02: "that isn't" | das ist nicht schwierig | this is not difficult | this isn't difficult |
| 64 | eng_for_deu:S0166L01B03 | build | S0166L01: "my name" | mein Name ist nicht ungewöhnlich | my name is not unusual | my name isn't unusual |
| 65 | eng_for_deu:S0166L01U01 | use | S0166L01: "my name" | mein Name ist nicht sehr ungewöhnlich | my name is not very unusual | my name isn't very unusual |
| 66 | eng_for_deu:S0166L01U06 | use | S0166L01: "my name" | ich glaube, mein Name ist nicht schwierig | I believe my name is not difficult | I believe my name isn't difficult |
| 67 | eng_for_deu:S0166L02B03 | build | S0166L02: "not very" | mein Name ist nicht sehr ungewöhnlich | my name is not very unusual | my name isn't very unusual |
| 68 | eng_for_deu:S0166L02U05 | use | S0166L02: "not very" | das Buch ist nicht sehr interessant | the book is not very interesting | the book isn't very interesting |
| 69 | eng_for_deu:S0210L02U05 | use | S0210L02: "the problem" | das Problem ist nicht so schwierig | the problem is not so difficult | the problem isn't so difficult |
| 70 | eng_for_deu:S0038L03U06 | use | S0038L03: "a week" | ich lerne seit ungefähr einer Woche, und es macht Spaß | I've been learning for about a week, and it is fun | I've been learning for about a week, and it's fun |
| 71 | eng_for_deu:S0065L02U05 | use | S0065L02: "to take time" | es macht Spaß, sich Zeit zu nehmen, um Englisch zu lernen | it is fun to take time to learn English | it's fun to take time to learn English |
| 72 | eng_for_deu:S0065L03U01 | use | S0065L03: "to test yourself" | es macht Spaß, sich selbst zu testen | it is fun to test yourself | it's fun to test yourself |
| 73 | eng_for_deu:S0073L01U05 | use | S0073L01: "thank you very much" | vielen Dank, es macht Spaß, mit dir zu sprechen | thank you very much, it is fun to speak with you | thank you very much, it's fun to speak with you |
| 74 | eng_for_deu:S0073L02U04 | use | S0073L02: "but I've got more to learn" | es macht Spaß, aber ich habe noch mehr zu lernen | it is fun but I've got more to learn | it's fun but I've got more to learn |
| 75 | eng_for_deu:S0073L02U06 | use | S0073L02: "but I've got more to learn" | es macht Spaß, aber ich habe noch mehr zu lernen | it is fun, but I've got more to learn | it's fun, but I've got more to learn |
| 76 | eng_for_deu:S0076L02U05 | use | S0076L02: "how much I've learnt already" | es macht Spaß zu sehen, wie viel ich schon gelernt habe | it is fun to know how much I've learnt already | it's fun to know how much I've learnt already |
| 77 | eng_for_deu:S0077L01U05 | use | S0077L01: "I'm surprised" | ich bin überrascht, dass es Spaß macht | I'm surprised that it is fun | I'm surprised that it's fun |
| 78 | eng_for_deu:S0077L03U03 | use | S0077L03: "I'm starting to understand" | es macht Spaß, wenn ich anfange zu verstehen | it is fun when I'm starting to understand | it's fun when I'm starting to understand |
| 79 | eng_for_deu:S0275L01U05 | use | S0275L01: "longer" | ich habe Angst, dass es ein bisschen länger dauern wird | I'm worried that it is going to take a little longer | I'm worried that it's going to take a little longer |
| 80 | eng_for_deu:S0026L03B03 | build | S0026L03: "nearly ready to go" | sie ist fast bereit zu gehen | she is nearly ready to go | she's nearly ready to go |
| 81 | eng_for_deu:S0026L03U02 | use | S0026L03: "nearly ready to go" | sie sagt, sie ist fast bereit zu gehen | she says she is nearly ready to go | she says she's nearly ready to go |
| 82 | eng_for_deu:S0026L03U05 | use | S0026L03: "nearly ready to go" | sie ist fast bereit, zu gehen und mehr Leute zu treffen | she is nearly ready to go and meet more people | she's nearly ready to go and meet more people |
| 83 | eng_for_deu:S0026L03U06 | use | S0026L03: "nearly ready to go" | ich denke, sie ist fast bereit zu gehen | I think she is nearly ready to go | I think she's nearly ready to go |
| 84 | eng_for_deu:S0039L02U04 | use | S0039L02: "tired" | sie ist müde, aber sie möchte nicht still sein | she is tired but she doesn't want to be quiet | she's tired but she doesn't want to be quiet |
| 85 | eng_for_deu:S0070L01U03 | use | S0070L01: "she didn't want to tell me" | sie wollte mir nicht sagen, wonach sie sucht | she didn't want to tell me what she is looking for | she didn't want to tell me what she's looking for |
| 86 | eng_for_deu:S0199L02U05 | use | S0199L02: "the office" | ich bin mir nicht sicher, ob sie im Büro ist | I'm not sure if she is in the office | I'm not sure if she's in the office |
| 87 | eng_for_deu:S0269L01U04 | use | S0269L01: "for your father" | sie wird heute Nachmittag auf deinen Vater warten | she is going to wait for your father this afternoon | she's going to wait for your father this afternoon |
| 88 | eng_for_deu:S0274L01U04 | use | S0274L01: "days" | ich denke, sie wird in ein paar Tagen bereit sein | I think she is going to be ready in a few days | I think she's going to be ready in a few days |
| 89 | eng_for_deu:S0100L01B02 | build | S0100L01: "you should" | du solltest dir keine Sorgen machen | you should not worry | you shouldn't worry |
| 90 | eng_for_deu:S0110L01U02 | use | S0110L01: "we are friends" | wir sind Freunde, und das ist gut | we are friends and that is good | we are friends and that's good |
| 91 | eng_for_deu:S0121L01U03 | use | S0121L01: "unusual" | das ist definitiv ungewöhnlich | that is definitely unusual | that's definitely unusual |
| 92 | eng_for_deu:S0127L01B02 | build | S0127L01: "not the reason why" | das ist nicht der Grund | that is not the reason why | that's not the reason why |
| 93 | eng_for_deu:S0127L01B03 | build | S0127L01: "not the reason why" | das ist nicht der Grund, warum ich dich sehen wollte | that is not the reason why I wanted to see you | that's not the reason why I wanted to see you |
| 94 | eng_for_deu:S0127L01U01 | use | S0127L01: "not the reason why" | das ist nicht der Grund, warum ich aufgeregt bin | that is not the reason why I'm excited | that's not the reason why I'm excited |
| 95 | eng_for_deu:S0127L01U02 | use | S0127L01: "not the reason why" | das ist nicht der Grund, warum ich hier bin | that is not the reason why I'm here | that's not the reason why I'm here |
| 96 | eng_for_deu:S0127L01U03 | use | S0127L01: "not the reason why" | ich glaube, das ist nicht der Grund, warum es leichter wird | I believe that is not the reason why it's easier | I believe that's not the reason why it's easier |
| 97 | eng_for_deu:S0127L01U04 | use | S0127L01: "not the reason why" | das ist nicht der Grund, warum ich Englisch sprechen möchte | that is not the reason why I want to speak English | that's not the reason why I want to speak English |
| 98 | eng_for_deu:S0127L01U05 | use | S0127L01: "not the reason why" | das ist nicht der Grund, warum ich mit dir sprechen wollte | that is not the reason why I wanted to speak with you | that's not the reason why I wanted to speak with you |
| 99 | eng_for_deu:S0132L01B03 | build | S0132L01: "less" | das ist weniger | that is less | that's less |
| 100 | eng_for_deu:S0132L02U01 | use | S0132L02: "exciting" | das ist definitiv aufregend | that is definitely exciting | that's definitely exciting |
| 101 | eng_for_deu:S0134L01U05 | use | S0134L01: "not a problem" | ich glaube, das ist kein Problem | I believe that is not a problem | I believe that's not a problem |
| 102 | eng_for_deu:S0136L01U02 | use | S0136L01: "of course" | natürlich ist das kein Problem | of course that is not a problem | of course that's not a problem |
| 103 | eng_for_deu:S0136L01U05 | use | S0136L01: "of course" | natürlich ist das eine gute Idee | of course that is a good idea | of course that's a good idea |
| 104 | eng_for_deu:S0142L01U02 | use | S0142L01: "kind of you" | natürlich ist das freundlich von dir | of course that is kind of you | of course that's kind of you |
| 105 | eng_for_deu:S0143L01U02 | use | S0143L01: "the same thing as" | das ist nicht dasselbe wie das, was sie sagte | that is not the same thing as what she was saying | that's not the same thing as what she was saying |
| 106 | eng_for_deu:S0143L01U03 | use | S0143L01: "the same thing as" | ich glaube, das ist dasselbe wie das, was du mir zeigen möchtest | I believe that is the same thing as what you want to show me | I believe that's the same thing as what you want to show me |
| 107 | eng_for_deu:S0143L01U05 | use | S0143L01: "the same thing as" | das ist definitiv nicht dasselbe wie das, was ich erwartet habe | that is definitely not the same thing as I was expecting | that's definitely not the same thing as I was expecting |
| 108 | eng_for_deu:S0143L02U03 | use | S0143L02: "we were talking about earlier" | ich glaube, das ist dasselbe wie das, worüber wir vorhin gesprochen haben | I believe that is the same thing as we were talking about earlier | I believe that's the same thing as we were talking about earlier |
| 109 | eng_for_deu:S0143L02U04 | use | S0143L02: "we were talking about earlier" | ich dachte, das ist nicht dasselbe wie das, worüber wir vorhin gesprochen haben | I thought that is not the same thing as we were talking about earlier | I thought that's not the same thing as we were talking about earlier |
| 110 | eng_for_deu:S0145L01U03 | use | S0145L01: "not any more" | ich bin nicht mehr sicher, ob das die beste Wahl ist | I'm not sure any more if that is the best choice | I'm not sure any more if that's the best choice |
| 111 | eng_for_deu:S0146L01U04 | use | S0146L01: "nothing seems to be" | nichts scheint perfekt zu sein, und das ist kein Problem | nothing seems to be perfect and that is not a problem | nothing seems to be perfect and that's not a problem |
| 112 | eng_for_deu:S0151L02U05 | use | S0151L02: "what I was hoping would happen" | das ist das, was ich erhofft hatte, und ich bin sehr glücklich | that is what I was hoping would happen and I'm very happy | that's what I was hoping would happen and I'm very happy |
| 113 | eng_for_deu:S0166L02B04 | build | S0166L02: "not very" | das ist nicht sehr interessant | that is not very interesting | that's not very interesting |
| 114 | eng_for_deu:S0166L02U01 | use | S0166L02: "not very" | das ist nicht sehr ungewöhnlich | that is not very unusual | that's not very unusual |
| 115 | eng_for_deu:S0166L02U03 | use | S0166L02: "not very" | das ist nicht sehr schwierig | that is not very difficult | that's not very difficult |
| 116 | eng_for_deu:S0166L02U04 | use | S0166L02: "not very" | das ist nicht sehr einfach zu verstehen | that is not very easy to understand | that's not very easy to understand |
| 117 | eng_for_deu:S0172L01B03 | build | S0172L01: "helpful" | das ist sehr hilfreich | that is very helpful | that's very helpful |
| 118 | eng_for_deu:S0172L01U04 | use | S0172L01: "helpful" | das ist hilfreich, aber ich brauche mehr | that is helpful but I need more | that's helpful but I need more |
| 119 | eng_for_deu:S0259L01B03 | build | S0259L01: "an idea" | das ist eine Idee | that is an idea | that's an idea |
| 120 | eng_for_deu:S0259L01U05 | use | S0259L01: "an idea" | dieser Mann hat eine Idee, die ziemlich gut ist | that man has an idea that is fairly good | that man has an idea that's fairly good |
| 121 | eng_for_deu:S0277L01B01 | build | S0277L01: "important" | das ist wichtig | that is important | that's important |
| 122 | eng_for_deu:S0277L01U04 | use | S0277L01: "important" | das ist sehr wichtig für mich | that is very important to me | that's very important to me |
| 123 | eng_for_deu:S0088L02U05 | use | S0088L02: "to talk to people" | sie sind Leute, mit denen ich gerne rede | they are people I like to talk to people with | they're people I like to talk to people with |
| 124 | eng_for_deu:S0089L02U03 | use | S0089L02: "that I've done a lot" | sie sind überrascht, dass ich viel gemacht habe | they are surprised that I've done a lot | they're surprised that I've done a lot |
| 125 | eng_for_deu:S0196L03U03 | use | S0196L03: "have you heard" | hast du gehört, wonach sie suchen? | have you heard what they are looking for? | have you heard what they're looking for? |
| 126 | eng_for_deu:S0211L01U04 | use | S0211L01: "they told us" | sie sagten uns, dass sie morgen Abend beschäftigt sind | they told us that they are busy tomorrow night | they told us that they're busy tomorrow night |
| 127 | eng_for_deu:S0213L02U04 | use | S0213L02: "we don't know" | wir wissen nicht, wonach sie suchen | we don't know what they are looking for | we don't know what they're looking for |
| 128 | eng_for_deu:S0117L02U04 | use | S0117L02: "last time" | beim letzten Mal war ich nicht bereit | I was not ready last time | I wasn't ready last time |
| 129 | eng_for_deu:S0117L02U05 | use | S0117L02: "last time" | beim letzten Mal war es nicht so einfach | last time was not so easy | last time wasn't so easy |
| 130 | eng_for_deu:S0130L01U01 | use | S0130L01: "a surprise" | das war eine Überraschung, weil ich es nicht erwartet habe | that was a surprise because I was not expecting that | that was a surprise because I wasn't expecting that |
| 131 | eng_for_deu:S0139L01U04 | use | S0139L01: "I'm sorry" | es tut mir leid, dass ich gestern nicht hier war | I'm sorry that I was not here yesterday | I'm sorry that I wasn't here yesterday |
| 132 | eng_for_deu:S0148L01B03 | build | S0148L01: "patient" | er war nicht sehr geduldig | he was not very patient | he wasn't very patient |
| 133 | eng_for_deu:S0148L01U01 | use | S0148L01: "patient" | er war nicht sehr geduldig, als ich nervös war | he was not very patient when I was nervous | he wasn't very patient when I was nervous |
| 134 | eng_for_deu:S0148L02B03 | build | S0148L02: "couldn't answer" | er war nicht geduldig, als ich nicht antworten konnte | he was not patient when I couldn't answer | he wasn't patient when I couldn't answer |
| 135 | eng_for_deu:S0148L02U01 | use | S0148L02: "couldn't answer" | er war nicht sehr geduldig, als ich nicht antworten konnte | he was not very patient when I couldn't answer | he wasn't very patient when I couldn't answer |
| 136 | eng_for_deu:S0112L02U05 | use | S0112L02: "I wasn't expecting it" | ich habe es nicht erwartet, dass wir Freunde sind | I wasn't expecting it that we are friends | I wasn't expecting it that we're friends |
| 137 | eng_for_deu:S0122L02U02 | use | S0122L02: "excited" | ich bin sehr aufgeregt, dass wir bald miteinander sprechen | I'm very excited that we are going to speak to each other soon | I'm very excited that we're going to speak to each other soon |
| 138 | eng_for_deu:S0133L02U04 | use | S0133L02: "together" | ich bin so froh, dass wir zusammen sind | I'm so happy that we are together | I'm so happy that we're together |
| 139 | eng_for_deu:S0149L01U05 | use | S0149L01: "I hope" | ich hoffe, dass wir bald zusammen in der Kneipe sind | I hope we are in the pub together soon | I hope we're in the pub together soon |
| 140 | eng_for_deu:S0155L03U02 | use | S0155L03: "waiting for" | wir warten hier auf dich | we are waiting for you here | we're waiting for you here |
| 141 | eng_for_deu:S0187L01U04 | use | S0187L01: "happy" | wir sind alle zufrieden | we are happy | we're happy |
| 142 | eng_for_deu:S0200L03U03 | use | S0200L03: "make sure" | ich werde sicherstellen, dass wir rechtzeitig fertig sind | I'm going to make sure that we are done in time | I'm going to make sure that we're done in time |
| 143 | eng_for_deu:S0166L01B04 | build | S0166L01: "my name" | was ist mein Name auf Englisch? | what is my name in English? | what's my name in English? |
| 144 | eng_for_deu:S0260L01U02 | use | S0260L01: "the faintest idea" | niemand hat die geringste Idee, was passieren wird | nobody has the faintest idea what is going to happen | nobody has the faintest idea what's going to happen |
| 145 | eng_for_deu:S0172L01U02 | use | S0172L01: "helpful" | das wäre nicht sehr hilfreich | that would not be very helpful | that wouldn't be very helpful |
| 146 | eng_for_deu:S0036L01U05 | use | S0036L01: "we don't want" | wir möchten nicht helfen, wenn du nicht hier bist | we don't want to help when you are not here | we don't want to help when you're not here |
| 147 | eng_for_deu:S0040L01B03 | build | S0040L01: "how do you feel" | wie fühlst du dich, wenn du müde bist? | how do you feel when you are tired? | how do you feel when you're tired? |
| 148 | eng_for_deu:S0047L04U05 | use | S0047L04: "to make mistakes" | ich denke, dass es gut ist, Fehler zu machen, wenn man lernt | I think that it's a good thing to make mistakes when you are learning | I think that it's a good thing to make mistakes when you're learning |
| 149 | eng_for_deu:S0058L01U04 | use | S0058L01: "it's interesting" | es ist interessant, Fehler zu machen, wenn man lernt | it's interesting to make mistakes when you are learning | it's interesting to make mistakes when you're learning |
| 150 | eng_for_deu:S0065L03U04 | use | S0065L03: "to test yourself" | es ist wichtig, sich selbst zu testen, wenn du Englisch lernst | it's important to test yourself when you are learning English | it's important to test yourself when you're learning English |
| 151 | eng_for_deu:S0066L02U04 | use | S0066L02: "to find the answer" | es ist nicht schwierig, die Antwort zu finden, wenn du Englisch lernst | it's not difficult to find the answer when you are learning English | it's not difficult to find the answer when you're learning English |
| 152 | eng_for_deu:S0068L01U01 | use | S0068L01: "what are you looking for" | wonach suchst du, wenn du Englisch lernst? | what are you looking for when you are learning English? | what are you looking for when you're learning English? |
| 153 | eng_for_deu:S0068L01U02 | use | S0068L01: "what are you looking for" | ich möchte wissen, wonach du suchst | I want to know what you are looking for | I want to know what you're looking for |
| 154 | eng_for_deu:S0077L02U05 | use | S0077L02: "at how quickly" | ich bin sehr zufrieden, wie schnell du lernst | I'm very happy at how quickly you are learning English | I'm very happy at how quickly you're learning English |
| 155 | eng_for_deu:S0078L01U02 | use | S0078L01: "I don't understand" | ich verstehe nicht, wonach du suchst | I don't understand what you are looking for | I don't understand what you're looking for |
| 156 | eng_for_deu:S0097L02U03 | use | S0097L02: "I'm ready to go" | ich bin bereit zu gehen, wenn du bereit bist | I'm ready to go when you are ready | I'm ready to go when you're ready |
| 157 | eng_for_deu:S0099L02U01 | use | S0099L02: "ask yourself" | du solltest dich fragen, ob du bereit bist | you should ask yourself if you are ready | you should ask yourself if you're ready |
| 158 | eng_for_deu:S0101L02U04 | use | S0101L02: "finding out more about" | du solltest dich fragen, ob du es genießt, mehr darüber herauszufinden | you should ask yourself if you are enjoying finding out more about that | you should ask yourself if you're enjoying finding out more about that |
| 159 | eng_for_deu:S0114L02U05 | use | S0114L02: "doing worse today than yesterday" | du solltest dich fragen, ob du heute schlechter bist als gestern | you should ask yourself if you are doing worse today than yesterday | you should ask yourself if you're doing worse today than yesterday |
| 160 | eng_for_deu:S0115L02U02 | use | S0115L02: "to have a conversation" | du solltest dich fragen, ob du bereit bist, ein Gespräch zu führen | you should ask yourself if you are ready to have a conversation | you should ask yourself if you're ready to have a conversation |
| 161 | eng_for_deu:S0117L01U03 | use | S0117L01: "definitely" | du machst es definitiv besser als gestern | you are definitely doing better than yesterday | you're definitely doing better than yesterday |
| 162 | eng_for_deu:S0119L01U03 | use | S0119L01: "before you leave" | bist du sicher, dass du bereit bist, bevor du gehst? | are you sure you are ready before you leave? | are you sure you're ready before you leave? |
| 163 | eng_for_deu:S0125L01U02 | use | S0125L01: "I believe" | ich glaube, du machst es definitiv besser als beim letzten Mal | I believe you are definitely doing better than last time | I believe you're definitely doing better than last time |
| 164 | eng_for_deu:S0128L01B03 | build | S0128L01: "I used to know" | du bist wie jemand, den ich früher kannte | you are like someone I used to know | you're like someone I used to know |
| 165 | eng_for_deu:S0129L01U01 | use | S0129L01: "so happy that" | ich bin so froh, dass du hier bist | I'm so happy that you are here | I'm so happy that you're here |
| 166 | eng_for_deu:S0129L01U04 | use | S0129L01: "so happy that" | ich bin so froh, dass du aufgeregt bist, wie es läuft | I'm so happy that you are excited about how it's going | I'm so happy that you're excited about how it's going |
| 167 | eng_for_deu:S0133L01U03 | use | S0133L01: "get to know" | es ist leichter, jemanden kennen zu lernen, wenn man in der Kneipe ist | it's easier to get to know someone when you are in the pub | it's easier to get to know someone when you're in the pub |
| 168 | eng_for_deu:S0137L01U03 | use | S0137L01: "perfect" | es ist kein Problem, wenn du nicht perfekt bist | it's not a problem when you are not perfect | it's not a problem when you're not perfect |
| 169 | eng_for_deu:S0146L01U05 | use | S0146L01: "nothing seems to be" | nichts scheint aufregend zu sein, wenn du nicht mehr glücklich bist | nothing seems to be exciting when you are not happy any more | nothing seems to be exciting when you're not happy any more |
| 170 | eng_for_deu:S0149L01U03 | use | S0149L01: "I hope" | ich hoffe, dass du geduldig bist | I hope that you are patient | I hope that you're patient |
| 171 | eng_for_deu:S0149L01U04 | use | S0149L01: "I hope" | natürlich hoffe ich, dass du aufgeregt bist | of course I hope you are excited | of course I hope you're excited |
| 172 | eng_for_deu:S0149L02U03 | use | S0149L02: "you'll finish soon" | ich glaube, du bist bald fertig, wenn du geduldig bist | I believe you'll finish soon when you are patient | I believe you'll finish soon when you're patient |
| 173 | eng_for_deu:S0150L01U03 | use | S0150L01: "tell me" | kannst du mir sagen, warum du nervös bist? | can you tell me why you are nervous? | can you tell me why you're nervous? |
| 174 | eng_for_deu:S0154L03U05 | use | S0154L03: "where do you want to meet" | wo möchtest du dich treffen, wenn du bereit bist? | where do you want to meet when you are ready? | where do you want to meet when you're ready? |
| 175 | eng_for_deu:S0158L02U05 | use | S0158L02: "talk about something" | lass uns über etwas reden, wenn du bereit bist | let's talk about something when you are ready | let's talk about something when you're ready |
| 176 | eng_for_deu:S0160L02U03 | use | S0160L02: "how do you say" | wie sagt man das auf Englisch, wenn man nicht sicher ist? | how do you say that in English when you are not sure? | how do you say that in English when you're not sure? |
| 177 | eng_for_deu:S0167L02U01 | use | S0167L02: "what do you need to do" | was musst du tun, wenn du dort bist? | what do you need to do when you are there? | what do you need to do when you're there? |
| 178 | eng_for_deu:S0194L02U05 | use | S0194L02: "what for" | ich möchte wissen, wonach du suchst | I want to know what you are looking for | I want to know what you're looking for |
| 179 | eng_for_deu:S0252L02U05 | use | S0252L02: "to start" | ich bin bereit anzufangen, wenn du bereit bist | I'm ready to start when you are ready | I'm ready to start when you're ready |
| 180 | eng_for_deu:S0255L01U02 | use | S0255L01: "leave" | ich bin bereit zu gehen, wenn du bereit bist | I'm ready to go when you are ready | I'm ready to go when you're ready |

## 4. Refused — 71 drill lines NOT proposed, with reason

Grouped by reason. These are lines the wide-scope audit flagged, but the mechanical contraction is wrong as English, not merely stylistically flat.

### 4a. "have to" (obligation modal) — never contracts (33 lines)

| Phrase ID | BEFORE (unchanged) |
|---|---|
| eng_for_deu:S0027L03U04 | I want to answer before I have to go |
| eng_for_deu:S0029L02U05 | I want to answer better before I have to go |
| eng_for_deu:S0030L03U05 | I wanted to ask before I have to go |
| eng_for_deu:S0033L01U05 | I want to find out how long I have to speak |
| eng_for_deu:S0041L04U05 | I don't want to get tired before I have to go |
| eng_for_deu:S0042L01U04 | I want to feel better before I have to go |
| eng_for_deu:S0050L02U02 | I want to finish before I have to go |
| eng_for_deu:S0050L02U04 | I don't think that I have to finish today |
| eng_for_deu:S0051L01U03 | I enjoy doing something before I have to go |
| eng_for_deu:S0171L01U04 | I have to look for it tomorrow |
| eng_for_deu:S0173L02U05 | I have to do that on my own |
| eng_for_deu:S0177L01U01 | I have to ask her where she wants to go |
| eng_for_deu:S0181L01B03 | I have to take my mother |
| eng_for_deu:S0181L01U01 | I have to take my mother tomorrow |
| eng_for_deu:S0181L01U04 | I have to take my mother next week |
| eng_for_deu:S0181L02U01 | but I have to take my mother to the doctor |
| eng_for_deu:S0181L02U02 | I have to go to the doctor tomorrow |
| eng_for_deu:S0181L02U04 | I have to go to the doctor next week |
| eng_for_deu:S0183L01U02 | I'm afraid I have to go now |
| eng_for_deu:S0274L01B02 | I have to leave in a few days |
| eng_for_deu:S0274L01U02 | I'm worried that I have too much work in a few days |
| eng_for_deu:S0274L01U05 | that sounds like I have to leave in a few days |
| eng_for_deu:S0277L02U05 | I have to go to an important meeting |
| eng_for_deu:S0278L01B03 | I have to finish that |
| eng_for_deu:S0278L01U03 | I have to finish that before the weekend |
| eng_for_deu:S0280L01U01 | I have to finish this job today |
| eng_for_deu:S0280L01U05 | I have to do this job before the weekend |
| eng_for_deu:S0280L02B03 | I have to do the most important job |
| eng_for_deu:S0281L03U04 | I have to finish that before you start |
| eng_for_deu:S0293L01B03 | I have to find out where he's going to meet me |
| eng_for_deu:S0295L01U05 | I didn't say that I have to go tomorrow |
| eng_for_deu:S0299L01U03 | I have to pay before I go |
| eng_for_deu:S0299L01U05 | I think that you have to pay |

### 4b. Possessive/experiential "have" (main verb, not perfect aux) — never contracts (23 lines)

| Phrase ID | BEFORE (unchanged) |
|---|---|
| eng_for_deu:S0217L01U01 | I have one or two questions |
| eng_for_deu:S0259L01B02 | I have an idea |
| eng_for_deu:S0259L01U03 | I have an idea before I answer |
| eng_for_deu:S0265L01B02 | I have a friend |
| eng_for_deu:S0265L01U01 | I have a friend who wants to help me |
| eng_for_deu:S0265L01U05 | I have a friend who said that he wanted to help you |
| eng_for_deu:S0273L01B02 | I have too much work |
| eng_for_deu:S0273L01B03 | unfortunately I have too much work |
| eng_for_deu:S0273L01U01 | no unfortunately I have too much work |
| eng_for_deu:S0273L01U02 | I have too much work to be able to come |
| eng_for_deu:S0273L01U04 | I'm worried that I have too much work |
| eng_for_deu:S0277L02B02 | I have an important meeting |
| eng_for_deu:S0277L02U01 | I have an important meeting tomorrow |
| eng_for_deu:S0277L02U03 | I have an important meeting tonight |
| eng_for_deu:S0277L03B03 | I have an important meeting early next week |
| eng_for_deu:S0277L03U03 | I have a lot to do early next week |
| eng_for_deu:S0277L03U05 | yes I have an important meeting early next week |
| eng_for_deu:S0280L01B03 | I have a job |
| eng_for_deu:S0298L01B02 | I have nothing left to say |
| eng_for_deu:S0298L01U01 | I believe I have nothing left to say |
| eng_for_deu:S0298L01U02 | I have nothing left to say about that |
| eng_for_deu:S0298L01U05 | I think I have nothing left to say |
| eng_for_deu:S0189L01U05 | yes that's a good idea if you have time |

### 4c. Simple-past "had" (possessed/drank/watched, not past-perfect aux) — never contracts (10 lines)

| Phrase ID | BEFORE (unchanged) |
|---|---|
| eng_for_deu:S0214L01B03 | I had a good weekend |
| eng_for_deu:S0214L01U02 | I had a good weekend with someone else |
| eng_for_deu:S0214L01U05 | I had a good weekend, although I was busy |
| eng_for_deu:S0217L02B02 | I had a glass or two of water |
| eng_for_deu:S0217L02U01 | I had a glass or two of water a while ago |
| eng_for_deu:S0217L02U04 | I had a glass or two of water and then I went out |
| eng_for_deu:S0218L02U02 | although I had time, I didn't do much |
| eng_for_deu:S0218L02U05 | I didn't do much, although I had a good weekend |
| eng_for_deu:S0220L01U01 | I had a bit of television on Sunday |
| eng_for_deu:S0220L01U05 | I had a bit of television on Saturday night |

### source word order is already "would have not" (not "would not have"); the mechanical contraction "I would haven't done it" is ungrammatical — the drill's own word order looks like the real defect here, not a contraction gap

| Phrase ID | BEFORE (unchanged) |
|---|---|
| eng_for_deu:S0152L02U01 | I would have not done it |

### possessive "have" on both sides of a deliberate contrast ("you HAVE something... I HAVE nothing") — killed under the possessive-have rule, and the parallel contrast is a second reason to leave both long

| Phrase ID | BEFORE (unchanged) |
|---|---|
| eng_for_deu:S0298L01U03 | I hope you have something to say because I have nothing left to say |

### "that" here closes the gerund object ("about that"), "is" opens a new predicate for the whole clause "finding out more about that" — fusing them into "about that's good" breaks the parse; this is a false match, not a real contractible pair

| Phrase ID | BEFORE (unchanged) |
|---|---|
| eng_for_deu:S0101L02B04 | finding out more about that is good |

### "do you have to go" is a do-support question; there is no natural contraction of "you have" inside it ("do you've to go" is ungrammatical) — false match

| Phrase ID | BEFORE (unchanged) |
|---|---|
| eng_for_deu:S0274L01B03 | do you have to go in a few days? |

### same do-support question pattern as above — false match, not a real contractible pair

| Phrase ID | BEFORE (unchanged) |
|---|---|
| eng_for_deu:S0274L01U01 | do you have to leave in a few days? |

## 5. What this pass is really doing

The survey found this course spells out contracted forms 7.2% of the time, scattered evenly across build dates — not a batch bug, a steady drift. Tom's ruling says: don't ask which form is "more correct", ask whether the drill matches what the lesson right above it (or elsewhere in the course) actually teaches the learner to say. Where the course teaches "he's"/"you're"/"I'll" as the target form, a drill that spells out "he is"/"you are"/"I will" is quietly undoing the lesson.

But "contract everything the regex found" is not the same instruction, and running it blind would have broken English grammar in about a quarter of the flagged lines — a mechanical script doesn't know that "have" only contracts as a perfect auxiliary ("I've forgotten"), never as the verb for possession ("I have a car", never "I've a car") or the obligation modal ("I have to go", never "I've to go"). Those 71 lines are correctly flagged by the drift finder — the drills genuinely don't match the taught contracted form — but the taught form itself can't be forced onto them without writing broken English, so they stay long. The 180 lines in §3 are the ones where contracting is both what the lesson teaches AND what a native speaker would actually say.
