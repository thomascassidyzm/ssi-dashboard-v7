# Item 12 spot-check (#957·AI, 19 Nov 2026)

Source: the item 12 changesets from #914·AI (branch head 2b99b577c), computed from `ssi_copy_20261119t033000z`; snapshots `~/ssi-evidence/ssi-dashboard-v7/ops/paid-cleanup-717/snap/` (same copy). Nothing read from live.

## Automatic check, all 4,329 rows

- Each new row's known and target were compared with its seed's known and target in the snapshot: **4,329 of 4,329 match exactly**.
- Each row's three `audio.link` ids were compared with the seed's ka/t1/t2: **4,329 of 4,329 match**.
- ZUT: same known text as an existing phrase (normalised) with a different target. **11 clashes**: 10 dropped, and the 11th is in eng_for_sin, which is held whole:

| course | row | new target | existing target, same known |
|---|---|---|---|
| deu_for_zho | S0278L01U06 | Musstest du gestern Abend alles fertig machen? | musstest du gestern abend alles fertigstellen |
| eng_for_guj | S0221L03U06 | I watched the football and then I watched a film. | i watched football and then i watched a film |
| eng_for_hin | S0016L03U06 | He wants to come back with everyone else later on. | she wants to come back with everyone else later on |
| eng_for_hin | S0198L03U06 | My daughter works for the council. | my son works for the council |
| eng_for_hin | S0606L02U06 | If I'd known then what I know now I'd have waited. | id have waited if id known then what i know now |
| eng_for_kan | S0014L02U06 | Do you speak English all day? | you speak english all day |
| eng_for_kan | S0447L02U06 | Will they be able to drive us home after the meal? | they will be able to drive us home after the meal |
| eng_for_sin | S0441L01U06 | An approach. | way |
| eng_for_tam | S0417L03U06 | Do they want to kill those ants? | they want to kill those ants |
| spa_for_zho | S0272L02U05 | Sí, eso suena como una gran idea. | sí eso suena como una gran idea aquí |
| spa_for_zho | S0281L02U07 | ¿Te importa si termino mi café antes de que empieces? | te importa si termino mi café antes de que empieces aquí |

## Hand sample: about 10 rows per course, spread evenly across seed order

Columns: row · known · target · verdict. "ok" means the target and known match the seed and the seed reads as sound.

### ara_eg_for_eng (76 rows)

| row | known | target | verdict |
|---|---|---|---|
| S0011L02U07 | I'd like to be able to speak after you finish. | أنا حابب أقدر أتكلم بعد ما تخلص. | ok |
| S0056L01U07 | So I can remember how to say a few words. | علشان أقدر أفتكر إزاي أقول كم كلمة. | ok |
| S0109L02U06 | We must work hard to learn a lot of new words. | إحنا لازم نشتغل بجد علشان نتعلم كتير كلمات جديدة. | ok |
| S0131L03U06 | There are too many ideas going around in my head. | في أفكار كتير قوي بتلف في دماغي. | ok |
| S0148L03U06 | He wasn't very patient when I couldn't answer. | هو ماكانش صبور قوي لما ما قدرتش أرد. | ok |
| S0211L03U06 | They told us that they didn't want to explain. | هم قالوا لنا إنهم ماكنوش عايزين يشرحوا. | ok |
| S0256L02U05 | I think I'll be ready in less than an hour. | أنا بفكر إني حاكون جاهز في أقل من ساعة. | ok |
| S0299L02U06 | He wants to pay half. | هو عايز يدفع النص. | ok |
| S0492L03U06 | Which of those places do you think is the most interesting? | أنهي مكان من الأماكن دي إنت بتفكر إنه الأكتر إثارة؟ | ok |
| S0640L01U12 | It's the red one. | ده الأحمر. | ok |

### ara_for_eng (37 rows)

| row | known | target | verdict |
|---|---|---|---|
| S0004L03U07 | how to say something in Arabic | كَيْفَ أَقولُ شَيْئاً بِالعَرَبِيَّة | ok |
| S0061L03U06 | could you say that again a little more slowly? | هَلْ يُمْكِنُكَ أَنْ تَقولَ ذٰلِكَ مَرَّةً أُخْرى بِبُطْءٍ أَكْثَر؟ | ok |
| S0109L02U06 | we must work hard to learn a lot of new words | يَجِبُ أَنْ نَعْمَلَ بِجِدٍّ لِنَتَعَلَّمَ كَلِماتٍ جَديدَةً كَثيرَة | ok |
| S0161L03U06 | can you give me that book on Sunday morning? | هَلْ يُمْكِنُكَ أَنْ تُعْطِيَني ذٰلِكَ الكِتابَ صَباحَ الأَحَد؟ | ok |
| S0268L01U06 | yes she sent me two emails last week | نَعَمْ، أَرْسَلَتْ لي رِسالَتَيْنِ الأُسْبوعَ الماضي | ok |
| S0292L02U06 | I hope you'll be able to come to the party | أَرْجو أَنْ تَسْتَطيعَ أَنْ تَأْتِيَ إِلى الحَفْلَة | ok |
| S0392L06U06 | that child with the black hair opposite the post office | ذلِكَ الطِّفْلُ ذو الشَّعْرِ الأَسْوَدِ مُقابِلَ مَكْتَبِ البَريدِ | ok |
| S0528L02U06 | I'm probably supposed to keep those things in another room | مِنَ المُفْتَرَضِ أَنْ أَحْفَظَ تِلْكَ الأَشْياءَ في غُرْفَةٍ أُخْرى | ok |
| S0573L01U06 | it's the kind of thing that makes the holidays very special | إِنَّهُ مِنَ الأَشْياءِ الَّتي تَجْعَلُ العُطُلاتِ مُمَيَّزَةً جِدّاً | ok |
| S0609L01U06 | the sensible thing to do would have been to ask | الشَّيْءُ العَقْلانِيُّ كانَ أَنْ نَسْأَلَ | ok |

### ara_lb_for_eng (72 rows)

| row | known | target | verdict |
|---|---|---|---|
| S0008L02U06 | I'm going to try to explain what I mean. | رح أحاول أشرح شو قصدي. | ok |
| S0029L02U06 | I'm looking forward to speaking better as soon as I can. | مشتاق أحكي أحسن بأسرع وقت ممكن. | ok |
| S0069L02U06 | He didn't want to look after the young dog all afternoon. | ما كان بدو يهتم بالكلب الصغير طول بعد الضهر. | ok |
| S0221L02U07 | I watched the football and then I watched a film. | تفرجت على الكرة وبعدين تفرجت على فيلم. | ok |
| S0371L04U06 | I went to see a film on Wednesday. | رحت أتفرج على فيلم يوم الأربعاء. | ok |
| S0453L02U08 | Did they say who they saw last night? | قالوا مين شافوا مبارح بالليل؟ | ok |
| S0547L02U07 | Because he has been playing in the mud. | لأنو كان عم يلعب بالوحل. | ok |
| S0561L03U06 | I don't care if it's a fast car. | ما بهمني إذا كانت السيارة سريعة. | ok |
| S0595L01U07 | I need to lie down in the garden. | لازم أستلقي بالحديقة. | ok |
| S0638L01U06 | I'm trying to think. | عم حاول فكر. | ok |

### deu_at_for_eng (68 rows)

| row | known | target | verdict |
|---|---|---|---|
| S0003L02U03 | how to speak as often as possible | wia ma so oft wia möglich redt | ok |
| S0012L03U06 | I wouldn't like to guess what's going to happen tomorrow | i mechat ned rotn, wos morgn passiert | ok |
| S0021L03U06 | Why are you learning her name? | wieso lernst du ian Naumen? | ok |
| S0028L03U06 | it's useful to start talking as soon as you can | es is praktisch, wennst so boid wia möglich zum reden aunfaungst | ok |
| S0037L03U06 | I started to think about it carefully last month | i hob letztn Monat aungfaungen, dass i genau drüber nochdenk | ok |
| S0045L02U06 | I don't need to know everything | i muass ned olles wissen | ok |
| S0118L03U07 | I feel better than I felt when we were in the pub | i fühl mi besser als damals, wia ma im Gasthaus gwesn san | ok |
| S0341L01U07 | I met someone a few days ago | i hob vor a paar Tog wen troffen | ok |
| S0423L02U06 | do they need to ask such an obvious question? | miassn s' wirklich so a offensichtliche Frog stelln? | ok |
| S0652L01U06 | what do you need sir? | Was brauchen Sie, der Herr? | ok |

### deu_ch_for_eng (41 rows)

| row | known | target | verdict |
|---|---|---|---|
| S0003L02U06 | how to speak as often as possible. | wie mä so oft wie mögli redet. | ok |
| S0082L02U06 | I'm not going to wait for you. Why not? | Ich gaa nöd uf di warte. Wieso nöd? | ok |
| S0136L01U06 | Of course you can ask her because she's my friend. | Natürli chasch si frööge, wil si mini Fründin isch. | ok |
| S0280L03U06 | No I only had to do the most important job. | Nei, ich ha nu di wichtigscht Arbet müesse mache. | ok |
| S0324L03U06 | That student has both of her hands up. | Die Schüelerin hät beidi Händ obe. | ok |
| S0499L07U06 | Maybe we should open the door and close the window. | Villicht sötted mir d Tür ufmache und s Feischter zuemache. | ok |
| S0535L02U06 | He made a promise that he wouldn't choose the wrong job. | Er hät versproche, dass er nöd de falsch Job wählt. | ok |
| S0577L05U06 | We've been waiting for the news from the hospital. | Mir warted uf d Nachricht vom Schpital. | ok |
| S0608L01U06 | It would have been the sensible thing to do. | Das wär s Vernünftig gsi. | ok |
| S0650L01U05 | Do you want to go madam? | Wänd Sie gaa? | ok |

### deu_for_eng (2 rows)

| row | known | target | verdict |
|---|---|---|---|
| S0461L03U08 | a shop where I can buy some postcards | ein Geschäft, wo ich ein paar Postkarten kaufen kann | ok |
| S0525L01U06 | to check if you've been able to finish | um zu überprüfen, ob du fertig werden konntest | ok |

### deu_for_jpn (42 rows)

| row | known | target | verdict |
|---|---|---|---|
| S0007L01U06 | 今日できるだけ頑張りたいです。 | Ich möchte heute so hart wie möglich versuchen. | DROPPED: German "so hart wie möglich versuchen" unidiomatic (versuchen lacks object; "mich so sehr wie möglich anstrengen") |
| S0020L02U07 | 彼の名前を早く覚えたいですね。 | Du möchtest seinen Namen schnell lernen. | DROPPED: ja たい = speaker's wish ("I want"), target says "du möchtest" |
| S0029L01U06 | できるだけ早くもっと上手に話せるようになるのを楽しみにしています。 | Ich freue mich darauf, so schnell wie möglich besser zu sprechen. | ok |
| S0038L02U01 | 約一週間学んでいます。 | Ich lerne seit etwa einer Woche. | ok |
| S0050L01U06 | できるだけ早く終わらせようとしているわけではありません。 | Ich versuche nicht so schnell wie möglich fertig zu werden. | ok |
| S0061L02U06 | もう少しゆっくりもう一度言っていただけますか？ | Kannst du das noch einmal ein bisschen langsamer sagen? | ok |
| S0074L01U06 | 理解するのを手伝ってくれてどうもありがとうございます。 | Danke sehr, dass du mir geholfen hast zu verstehen. | ok |
| S0151L02U06 | それは私が起こると期待していたことではありませんでした。 | Das war nicht das, was ich gehofft hatte, dass es passieren würde. | ok |
| S0259L01U06 | アイデア。 | Eine Idee. | ok |
| S0299L02U05 | 半分払いたい。 | Er möchte die Hälfte bezahlen. | DROPPED: 半分払いたい = "I want to pay half", target "Er möchte" |

### deu_for_zho (61 rows)

| row | known | target | verdict |
|---|---|---|---|
| S0006L02U06 | 我在试着记住一个词。 | Ich versuche, mich an ein Wort zu erinnern. | ok |
| S0042L02U06 | 我开始感觉比昨天晚上好了。 | Ich fing an, mich besser zu fühlen als gestern Abend. | ok |
| S0057L01U06 | 我不能记住怎么说我想说的。 | Ich kann mich nicht erinnern, wie man sagt, was ich sagen wollte. | ok |
| S0106L03U06 | 我们不需要觉得开心，我们只需要努力。 | Wir müssen uns nicht glücklich fühlen, wir müssen nur hart arbeiten. | ok |
| S0142L02U06 | 你太好了，我很感谢你帮忙。 | Das ist sehr nett von dir, und ich bin dir dankbar, dass du hilfst. | ok |
| S0176L01U06 | 我会问他明年能不能帮忙。 | Ich werde ihn fragen, ob er nächstes Jahr helfen kann. | ok |
| S0193L01U06 | 对不起，但是我今天太忙了。 | Es tut mir leid, aber ich bin heute zu beschäftigt. | ok |
| S0232L01U06 | 我认识一个老女人能记住答案。 | Ich kenne eine alte Frau, die sich an die Antwort erinnern kann. | ok |
| S0270L03U06 | 因为我担心我会迟到。 | Weil ich mir Sorgen mache, dass ich zu spät komme. | ok |
| S0288L02U06 | 我认识的大多数人都喜欢看电视。 | Die meisten Leute, die ich kenne, sehen gerne fern. | ok |

### eng_for_ara (50 rows)

| row | known | target | verdict |
|---|---|---|---|
| S0008L02U06 | سأحاول أن أشرح ما أقصده. | I'm going to try to explain what I mean. | ok |
| S0029L02U06 | أتطلع إلى الكلام بشكل أفضل في أقرب وقت ممكن. | I'm looking forward to speaking better as soon as I can. | ok |
| S0049L01U06 | الأمر هكذا، إذا كنت تفهم ما أقصده. | It's like this, if you know what I mean. | ok |
| S0095L02U06 | هل أنت مستعد للذهاب إلى المنزل بالحافلة القادمة؟ | Are you ready to go home on the next bus? | ok |
| S0158L01U06 | لنتحدث عن شيء آخر. | Let's talk about something else. | ok |
| S0183L01U05 | لا، أخشى أنني لم أرهم. | No I'm afraid I haven't seen them. | ok |
| S0219L01U06 | كان من الجميل الاسترخاء لبعض الوقت. | It was nice to relax for a while. | ok |
| S0235L02U06 | قابلت شخصاً قال إنه أراد أن يخبرك بشيء. | I met someone who said that he wanted to tell you something. | ok |
| S0279L02U06 | نعم، لأنه لم يكن هناك الكثير من الوقت المتبقي. | Yes because there wasn't much time left. | ok |
| S0296L01U06 | قلت إنني كنت بحاجة إلى وقت أكثر قليلاً. | I said that I needed a little more time. | ok |

### eng_for_ben (145 rows)

| row | known | target | verdict |
|---|---|---|---|
| S0003L02U06 | যতটা সম্ভব ঘন ঘন কথা বলা শেখা। | how to speak as often as possible. | ok |
| S0026L03U06 | আমার মনে হচ্ছে আমি প্রায় যাওয়ার জন্য তৈরি, এই অনুভূতিটা আমার ভালো লাগে। | I like feeling as if I'm nearly ready to go. | ok |
| S0057L01U06 | আমি মনে রাখতে পারি না কীভাবে বলা যায় যা আমি বলতে চেয়েছিলাম। | I can't remember how to say what I wanted to say. | ok |
| S0106L02U06 | আমাদের সুখী অনুভব করতে হবে না, আমাদের শুধু কঠিন পরিশ্রম করতে হবে। | We don't need to feel happy, we just need to work hard. | ok |
| S0168L01U06 | এবং তারপরে আমি পরে এসে সাহায্য করতে পারব। | And then I'll be able to come and help later on. | ok |
| S0323L02U08 | সে বলেছিল যে তাকে স্কুলে হেঁটে যেতে হবে না। | He said that he doesn't need to walk to school. | ok |
| S0378L02U05 | না, ছুটির জন্য আমার কাছে যথেষ্ট টাকা ছিল না। | No I didn't have enough money for holidays. | ok |
| S0413L03U06 | প্রান্তের খুব কাছে গেলে আমরা পড়ে যেতে পারি। | We could fall if we go too close to the edge. | ok |
| S0465L02U06 | পরের বার আমি তাকে জিজ্ঞেস করব তার নাম কী। | Next time I will ask her what her name is. | ok |
| S0660L01U09 | আমি তোমাদের সবাইকে সাহায্য করতে পারি | I can help you all | ok |

### eng_for_deu (55 rows)

| row | known | target | verdict |
|---|---|---|---|
| S0001L05U06 | Ich möchte jetzt mit dir Englisch sprechen. | I want to speak English with you now. | ok |
| S0010L03U06 | Ich bin nicht sicher, ob ich mich an den ganzen Satz erinnern kann. | I'm not sure if I can remember the whole sentence. | ok |
| S0026L03U07 | Ich mag das Gefühl, fast bereit zu gehen. | I like feeling as if I'm nearly ready to go. | ok |
| S0042L04U06 | Ich fing an, mich besser zu fühlen als gestern Abend. | I was starting to feel better than last night. | ok |
| S0082L02U06 | Ich werde nicht auf dich warten. Warum nicht? | I'm not going to wait for you. Why not? | ok |
| S0119L01U06 | Kann ich dich etwas fragen, bevor du gehst? | Can I ask you something before you leave? | ok |
| S0134L02U06 | Es ist kein Problem, wenn man mit ihnen an etwas Schwierigem arbeitet. | It's not a problem when you work at something difficult with them. | ok |
| S0152L04U06 | Ich hätte es anders gemacht, wenn ich gewusst hätte, was du wolltest. | I would have done it differently if I had known what you wanted. | ok |
| S0200L03U06 | Sie sagen, sie wollen sicherstellen, dass wir alles rechtzeitig fertig machen. | They say they want to make sure that we finish everything in time. | ok |
| S0268L03U06 | Ja, sie hat mir letzte Woche zwei E-Mails geschickt. | Yes she sent me two emails last week. | ok |

### eng_for_fra (47 rows)

| row | known | target | verdict |
|---|---|---|---|
| S0003L02U06 | comment parler aussi souvent que possible. | how to speak as often as possible. | ok |
| S0019L03U06 | Mais je ne veux pas arrêter de parler. | But I don't want to stop talking. | ok |
| S0041L02U06 | Je me sens bien, mais je commence à me sentir fatigué. | I feel okay, but I'm starting to feel tired. | ok |
| S0086L02U06 | Ce n'était pas possible, malheureusement. | It wasn't possible, unfortunately. | ok |
| S0122L03U06 | Ça commence à sembler plus facile et je suis enthousiaste à propos de comment ça se passe. | It's starting to feel easier and I'm excited about how it's going. | kept; known French calque "enthousiaste à propos de comment" is awkward but clear |
| S0156L02U07 | Tu veux aller au restaurant ce soir ? | Do you want to go to a restaurant tonight? | ok |
| S0181L04U06 | Mais je dois emmener ma mère chez le médecin. | But I have to take my mother to the doctor. | ok |
| S0227L01U06 | Cet homme va me dire quelque chose de nouveau. | That man is going to tell me something new. | ok |
| S0268L02U05 | Oui elle m'a envoyé deux emails la semaine dernière. | Yes she sent me two emails last week. | ok |
| S0280L02U06 | Non je devais seulement faire le travail le plus important. | No I only had to do the most important job. | ok |

### eng_for_guj (100 rows)

| row | known | target | verdict |
|---|---|---|---|
| S0002L01U04 | હું શીખવાની કોશિશ કરી રહ્યો છું. | I'm trying to learn. | ok |
| S0088L02U06 | હું હજી એ લોકો સાથે વાત કરવા તૈયાર નથી જેમને હું ઓળખતો નથી. | I'm not ready to talk to people I don't know yet. | ok |
| S0141L02U06 | કોઈ વાંધો નહીં. બધું ઠીક છે. | No problem. Everything is okay. | ok |
| S0185L02U06 | મને લાગે છે કે તમે તે કામ પર ભૂલી ગયા. | I think you left them at work. | ok |
| S0229L02U06 | જો શક્ય હોત, તો પેલી સ્ત્રી તમારી મદદ કરત. | That woman would help you if she could. | ok |
| S0338L01U07 | ખૂબ ખરાબ રીતે. | Badly. | ok |
| S0508L04U06 | તમે કેવી રીતે ચૂકવણી કરશો તે વિશે ચિંતા કરવાનો કોઈ અર્થ નથી. | There's no point worrying about how you're going to pay. | ok |
| S0587L04U06 | તે હંમેશા આગ્રહ રાખતી કે અમે રાતના ભોજનમાં ઈંડા ખાઈએ. | She used to insist that we had eggs for supper. | ok |
| S0643L01U06 | સાહેબ, શું તમે ઇચ્છો છો? | Do you want sir | ok |
| S0654L01U07 | સાહેબ, મને ખાતરી નથી કે હું તમને મદદ કરી શકું. | I'm not sure if I can help you, sir. | ok |

### eng_for_hin (264 rows)

| row | known | target | verdict |
|---|---|---|---|
| S0003L02U04 | कि ज़्यादा से ज़्यादा बार कैसे बोलूँ। | how to speak as often as possible. | ok |
| S0051L03U06 | मुझे अपने दोस्तों के साथ दिलचस्प काम करना पसंद है। | I enjoy doing interesting things with my friends. | ok |
| S0098L01U06 | मुझे कुछ और खेलने पर विचार करना चाहिए। | I should consider playing something else. | ok |
| S0137L02U06 | परफ़ेक्ट होने से ज़्यादा अहम अक्सर बात करना है। | It's more important to talk often than to be perfect. | ok |
| S0178L02U06 | मेरे पास समय नहीं था, हालाँकि मैं आपसे मिलना चाहता था। | I didn't have time, although I wanted to see you. | ok |
| S0253L02U06 | मैं कुछ मिनटों में तैयार हो जाऊँगा। | I'll be ready in a few minutes. | ok |
| S0294L02U06 | मेरे पास आज रात आपको कॉल करने के लिए पर्याप्त समय नहीं है। | I don't have enough time to call you tonight. | ok |
| S0348L01U06 | वह नहीं जानना चाहती थी कि क्या होने वाला है। | She didn't want to know what was going to happen. | ok |
| S0401L03U06 | नहीं, सीधे घर जाना बेहतर रहेगा। | No it would be better to go straight home. | ok |
| S0653L01U07 | आपको आपत्ति तो नहीं है, मैडम? | Do you mind madam? | ok |

### eng_for_ita (41 rows)

| row | known | target | verdict |
|---|---|---|---|
| S0003L02U06 | come parlare il più spesso possibile. | how to speak as often as possible. | ok |
| S0053L04U06 | Lei voleva mettere la sua lettera nella sua borsa. | She wanted to put his letter in her bag. | ok |
| S0058L03U06 | È interessante quando capisci abbastanza parole. | It's interesting when you understand enough words. | ok |
| S0069L03U06 | Lui non voleva badare al giovane cane per tutto il pomeriggio. | He didn't want to look after the young dog all afternoon. | ok |
| S0165L01U06 | Ma non sono sicuro se sia vero. | But I'm not sure if it's true. | ok |
| S0183L02U05 | No, purtroppo non le ho viste. | No I'm afraid I haven't seen them. | ok |
| S0205L02U06 | Ho dimenticato la parola che stavo cercando di dire. | I've forgotten the word I was trying to say. | ok |
| S0227L01U06 | Quell'uomo mi dirà qualcosa di nuovo. | That man is going to tell me something new. | ok |
| S0251L02U06 | Non voglio scoprirlo prima che finiamo. | I don't want to find out until after we finish. | ok |
| S0300L02U06 | Lei non vuole sembrare scortese. | She doesn't want to seem unfriendly. | ok |

### eng_for_jpn (118 rows)

| row | known | target | verdict |
|---|---|---|---|
| S0003L02U05 | できるだけたくさん話す方法。 | how to speak as often as possible | ok |
| S0033L02U10 | どのくらい英語を学んでいますか？ | how long have you been learning English? | ok |
| S0054L04U13 | もう少し時間をあげたかったです。 | we wanted to give you a little more time | ok |
| S0089L03U16 | 短い時間でたくさんやったと思います。 | I think that I've done a lot in a short time | ok |
| S0139L01U16 | こんなに早く出なければならなくてすみません。 | I'm sorry that I need to leave so early | ok |
| S0161L06U16 | 日曜日の朝その本をくれますか？ | can you give me that book on Sunday morning? | ok |
| S0197L03U05 | 息子は教師として働いています。 | my son works as a teacher | ok |
| S0230L02U16 | あなたと一緒に働きたい若い男性を知っています。 | I know a young man who wants to work with you | ok |
| S0251L02U10 | 終わるまで知りたくありません。 | I don't want to find out until after we finish | ok |
| S0295L01U12 | 一日で終わらせたいとは言っていません。 | I didn't say that I wanted to finish in a day | ok |

### eng_for_kan (273 rows)

| row | known | target | verdict |
|---|---|---|---|
| S0003L02U06 | ಸಾಧ್ಯವಾದಷ್ಟು ಹೆಚ್ಚು ಬಾರಿ ಹೇಗೆ ಮಾತಾಡೋದು. | how to speak as often as possible. | ok |
| S0034L03U06 | ಬೇರೆ ಜನ ಇಲ್ಲಿ ಇರೋವಾಗ ಅವನಿಗೆ ಸುಮ್ಮನಿರೋದು ಬೇಡ. | He doesn't want to be quiet when other people are here. | ok |
| S0079L02U06 | ನೀವು ಯಾವಾಗ ಕಲಿಯೋಕೆ ಶುರು ಮಾಡಿದ್ರಿ? | When did you start to learn? | ok |
| S0114L03U06 | ನಿನ್ನೆಗಿಂತ ಇವತ್ತು ನಾನು ಕೆಟ್ಟದಾಗಿ ಮಾಡ್ತಿದ್ದೇನೆ ಅನ್ನೋ ಹಾಗೆ ಅನಿಸುತ್ತೆ. | I feel as if I'm doing worse today than yesterday. | ok |
| S0149L03U06 | ಇದು ತುಂಬಾ ಕಷ್ಟ ಅಲ್ಲ, ಹಾಗಾಗಿ ನೀವು ಬೇಗ ಮುಗಿಸ್ತೀರಿ ಅಂತ ಆಶಿಸ್ತೇನೆ. | This isn't very difficult, so I hope you'll finish soon. | ok |
| S0201L03U06 | ಏನಾಗುತ್ತೆ ಅಂತ ತಿಳಿದುಕೊಳ್ಳೋದು ನಮಗೆ ಬೇಕಿತ್ತು. | We wanted to know what was going to happen. | ok |
| S0257L01U06 | ಆ ನೀಲಿ ವಸ್ತು ನನಗೆ ಇಷ್ಟ. | I like that blue thing. | ok |
| S0334L02U06 | ನೀವು ಬೆಕ್ಕಿನ ಮರಿಯನ್ನ ಹಿಡಿಯೋಕೆ ತಾನು ಬಿಡ್ತೀನಿ ಅಂತ ಅವನು ಹೇಳಿದ | He said that he can let you hold the kitten | ok |
| S0429L01U06 | ಹೌದು ಅದು ಅವರಿಗೆ ಅತ್ಯುತ್ತಮವಾಗಿರುತ್ತೆ. | Yes that would be perfect for them. | ok |
| S0624L01U05 | ಹೌದು, ಅದು ತುಂಬಾ ಚೆನ್ನ, ದಯವಿಟ್ಟು. | Yes, that would be great, please. | ok |

### eng_for_kor (54 rows)

| row | known | target | verdict |
|---|---|---|---|
| S0003L02U06 | 가능한 한 자주 말하는 방법을 | how to speak as often as possible | ok |
| S0029L02U06 | 저는 가능한 한 빨리 더 잘 말하게 되기를 기대하고 있어요 | I'm looking forward to speaking better as soon as I can | ok |
| S0084L01U06 | 저는 그가 제 친구에 대해 말한 것에 동의하지 않아요 | I don't agree with what he said about my friend | ok |
| S0116L02U06 | 이것은 제가 할 수 있는 최선의 선택이 아니에요 | This isn't the best choice I could make | ok |
| S0169L01U06 | 당신은 제가 무엇을 하기를 원해요? | What do you want me to do? | ok |
| S0181L03U06 | 하지만 저는 어머니를 병원에 데려가야 해요 | But I have to take my mother to the doctor | ok |
| S0204L03U06 | 저는 그녀가 준비를 처리하는 데 당신을 도와주기를 원했어요 | I wanted her to help you to deal with the arrangements | ok |
| S0225L02U06 | 그는 할 수 있으면 당신에게 답을 줄 거예요 | He would give you an answer if he could | ok |
| S0256L01U05 | 한 시간 안에 준비가 될 것 같아요 | I think I'll be ready in less than an hour | ok |
| S0297L01U06 | 저는 영어를 하는 사람을 많이 알지 못해요 | I don't know many people who speak English | ok |

### eng_for_mar (108 rows)

| row | known | target | verdict |
|---|---|---|---|
| S0003L02U02 | शक्य तितक्या वेळा कसं बोलायचं. | how to speak as often as possible. | ok |
| S0049L02U06 | हे असं आहे, तुम्हाला मला काय म्हणायचंय ते कळत असेल तर. | It's like this, if you know what I mean. | ok |
| S0173L03U06 | नाही धन्यवाद, मी स्वतः सांभाळू शकतो. | No thank you I can manage on my own. | ok |
| S0348L01U07 | काय होणार आहे हे तिला जाणून घ्यायचं नव्हतं. | She didn't want to know what was going to happen. | ok |
| S0402L03U06 | हो, जेवणासाठी कुठेतरी थांबणं छान होईल. | Yes it would be nice to stop somewhere for food. | ok |
| S0468L02U06 | हे जग मोठं आहे. | It's a big world. | ok |
| S0547L02U06 | कारण तो चिखलात खेळत होता. | Because he has been playing in the mud. | ok |
| S0580L01U06 | आम्हाला बऱ्याचदा मुलांना कुठेतरी थोड्या उबदार ठिकाणी न्यायचं होतं. | We've often wanted to take the children somewhere a little warmer. | ok |
| S0606L03U06 | आता मला जे माहित आहे ते तेव्हा माहित असतं तर मी वाट पाहिली असती. | If I'd known then what I know now I'd have waited. | ok |
| S0654L01U06 | मला खात्री नाही की मी आपल्याला मदत करू शकेन का, साहेब. | I'm not sure if I can help you, sir. | ok |

### eng_for_pan (194 rows)

| row | known | target | verdict |
|---|---|---|---|
| S0001L05U04 | ਮੈਂ ਹੁਣ ਤੁਹਾਡੇ ਨਾਲ ਅੰਗਰੇਜ਼ੀ ਬੋਲਣਾ ਚਾਹੁੰਦਾ ਹਾਂ। | I want to speak English with you now. | ok |
| S0027L04U07 | ਮੈਨੂੰ ਜਵਾਬ ਦੇਣ ਵਿੱਚ ਬਹੁਤ ਜ਼ਿਆਦਾ ਸਮਾਂ ਲਗਾਉਣਾ ਪਸੰਦ ਨਹੀਂ। | I don't like taking too much time to answer. | ok |
| S0063L02U08 | ਕੀ ਤੁਹਾਨੂੰ ਮੇਰੀ ਮਦਦ ਕਰਨ ਵਿੱਚ ਕੋਈ ਇਤਰਾਜ਼ ਨਹੀਂ? | Are you sure you don't mind helping me? | ok |
| S0106L02U07 | ਸਾਨੂੰ ਖੁਸ਼ ਮਹਿਸੂਸ ਕਰਨ ਦੀ ਲੋੜ ਨਹੀਂ, ਸਾਨੂੰ ਬੱਸ ਮਿਹਨਤ ਕਰਨੀ ਹੈ। | We don't need to feel happy, we just need to work hard. | ok |
| S0142L03U07 | ਤੁਸੀਂ ਬਹੁਤ ਮਿਹਰਬਾਨ ਹੋ ਅਤੇ ਮੈਂ ਮਦਦ ਕਰਨ ਲਈ ਤੁਹਾਡਾ ਸ਼ੁਕਰਗੁਜ਼ਾਰ ਹਾਂ। | That's very kind of you and I'm grateful to you for helping. | ok |
| S0198L02U07 | ਮੇਰੀ ਧੀ ਕੌਂਸਲ ਲਈ ਕੰਮ ਕਰਦੀ ਹੈ। | My daughter works for the council. | ok |
| S0251L01U06 | ਮੈਂ ਜਾਣਨਾ ਨਹੀਂ ਚਾਹੁੰਦਾ ਜਦੋਂ ਤੱਕ ਅਸੀਂ ਖਤਮ ਨਹੀਂ ਕਰ ਲੈਂਦੇ। | I don't want to find out until after we finish. | ok |
| S0328L01U06 | ਹਾਂ, ਮੈਂ ਸੋਚਦਾ ਹਾਂ ਕਿ ਉਸਨੂੰ ਚਾਹੀਦਾ ਹੈ। | Yes I think she ought to. | ok |
| S0464L01U06 | ਮੈਂ ਉਸ ਨੂੰ ਇੱਕ ਵਾਰ ਆਪਣੇ ਕਮਰੇ ਦਾ ਨੰਬਰ ਦੱਸਿਆ ਪਰ ਉਹ ਭੁੱਲ ਗਈ। | I told her my room number once but she forgot it. | ok |
| S0655L02U07 | ਮੈਂ ਸੋਚਦਾ ਹਾਂ ਕਿ ਤੁਸੀਂ ਬਹੁਤ ਵਧੀਆ ਕਰ ਰਹੇ ਹੋ, ਬੀਬੀ ਜੀ। | I think that you're doing very well, madam. | ok |

### eng_for_por (69 rows)

| row | known | target | verdict |
|---|---|---|---|
| S0001L05U03 | Eu quero falar inglês consigo agora. | I want to speak English with you now. | ok |
| S0023L03U06 | Vou começar a falar mais em breve. | I'm going to start talking more soon. | ok |
| S0047L03U06 | Porque eu acho que é bom cometer erros. | Because I think that it's a good thing to make mistakes. | ok |
| S0085L02U06 | Eu não conheço essas pessoas. | I don't know those people. | ok |
| S0112L02U06 | Isso foi muito interessante, e eu não estava à espera. | That was very interesting, and I wasn't expecting it. | ok |
| S0130L03U06 | Foi uma surpresa, porque ele é meu amigo. | That was a surprise, because he's my friend. | ok |
| S0153L03U06 | Eu não teria dito exatamente da mesma maneira. | I wouldn't have said it in exactly the same way. | ok |
| S0183L02U06 | Não, infelizmente não as vi. | No I'm afraid I haven't seen them. | ok |
| S0209L02U06 | Eles querem passar mais tempo a encontrar-se em grupo. | They want to spend more time meeting as a group. | ok |
| S0280L02U06 | Não, só tinha de fazer o trabalho mais importante. | No I only had to do the most important job. | ok |

### eng_for_sin (188 rows)

| row | known | target | verdict |
|---|---|---|---|
| S0004L03U06 | ඉංග්‍රීසියෙන් කොහොමද මොකක් හරි කියන්නේ | how to say something in English | COURSE HELD (see below) |
| S0045L03U09 | මට ඔක්කොම දන්නේ ඕනේ නෑ. | I don't need to know everything. | COURSE HELD (see below) |
| S0074L01U07 | තේරෙනවා කරන්න උදව් කිරීම ගැන ගොඩක් ස්තූතියි. | Thank you very much for helping me to understand. | COURSE HELD (see below) |
| S0118L02U09 | ශාලාවේ ඉන්නකොට දැනෙනවාට වඩා හොඳ දැනෙනවා. | I feel better than I felt when we were in the pub. | COURSE HELD (see below) |
| S0155L02U07 | හෙට උදේ මිනිත්තු කිහිපයක් බලාගෙන ඉන්න මට කමක් නෑ. | I don't mind waiting for a few minutes tomorrow morning. | COURSE HELD (see below) |
| S0195L02U06 | මම මේස පිට ලිහිල් කරලා ගිය සල්ලි හොයන්න උත්සාහ කරනවා. | I'm trying to find the money I left on the table. | COURSE HELD (see below) |
| S0243L02U06 | මම කන්නයි ඕනේ ඒකෙන් මම ඒකම ඉල්ලනවා. | I'm going to ask for the same thing to eat. | COURSE HELD (see below) |
| S0339L02U06 | නෑ මම හිතනවා ඔහු ගොඩ නරකෙට ආබාධ ලැබිලා. | No I think he's hurt himself quite badly. | COURSE HELD (see below) |
| S0408L03U06 | ඔව් ඒ සතුටු පවුලක් හදන හොඳම ක්‍රමේ. | Yes that's the best way to make a happy family. | COURSE HELD (see below) |
| S0655L02U08 | ඔයා ගොඩාක් හොඳට කරනවා කියලා හිතෙනවා, නෝනා. | I think that you're doing very well, madam. | COURSE HELD (see below) |

### eng_for_spa (84 rows)

| row | known | target | verdict |
|---|---|---|---|
| S0003L01U04 | cómo hablar lo más posible | how to speak as often as possible | kept; "lo más posible" ≈ as much as possible (shared seed wording) |
| S0077L02U06 | me sorprende lo rápido que estoy empezando a entender | I'm surprised at how quickly I'm starting to understand | ok |
| S0112L01U06 | eso fue muy interesante, y no me lo esperaba | that was very interesting, and I wasn't expecting it | ok |
| S0135L03U06 | no sé por qué crees que es tan bueno | I don't know why you think that it's so good | ok |
| S0153L03U06 | no lo habría dicho exactamente de la misma manera | I wouldn't have said it in exactly the same way | ok |
| S0175L01U06 | ¿Qué quieres hacer el domingo por la mañana? | what do you want to do on Sunday morning? | ok |
| S0187L01U06 | por ahora estoy contento | I'm happy so far | ok |
| S0307L01U08 | conozco a ese hombre joven que está sentado allí | I know that young man who's sitting over there | ok |
| S0316L03U08 | ¿Crees que podría traer a su hermano el lunes? | do you think that she could bring her brother on Monday? | ok |
| S0326L03U08 | no creo que necesite vender la empresa | I don't think that she needs to sell the company | ok |

### eng_for_tam (202 rows)

| row | known | target | verdict |
|---|---|---|---|
| S0001L05U04 | நான் இப்போது உங்களுடன் ஆங்கிலம் பேச விரும்புகிறேன். | I want to speak English with you now. | ok |
| S0034L04U06 | மற்ற மக்கள் இங்கே இருக்கும்போது அவர் அமைதியாக இருக்க விரும்புவதில்லை. | He doesn't want to be quiet when other people are here. | ok |
| S0070L03U06 | அது எங்கே இருந்தது என்று என்னிடம் சொல்ல அவள் விரும்பவில்லை. | She didn't want to tell me where it was. | ok |
| S0103L02U07 | நாங்கள் இன்னும் பல வார்த்தைகளை கேட்கவில்லை என்று முயற்சிக்கிறோம். | We're not trying to hear many more words. | DROPPED: Tamil garbled ("we try that we did not hear many words") |
| S0138L04U06 | என் நண்பன் நம்மை சந்திக்க விரும்பிய இடம் இது தான். | This was where my friend wanted to meet us. | ok |
| S0187L01U04 | நான் இதுவரை மகிழ்ச்சியாக இருக்கிறேன். | I'm happy so far. | ok |
| S0251L01U10 | நாங்கள் முடிக்கும் வரை தெரிந்துகொள்ள விரும்பவில்லை. | I don't want to find out until after we finish. | ok |
| S0325L03U06 | அவன் சாத்தியமான பத்து பிரச்சினைகளை பரிசீலிக்க வேண்டும் என்று நினைக்கிறேன். | I think that he needs to consider ten possible problems. | ok |
| S0414L04U06 | தயவுசெய்து எங்களுக்கு ஒரு பாட்டில் சிவப்பு ஒயின் கிடைக்குமா? | Could we have a bottle of red wine please? | ok |
| S0639L01U08 | உங்களுடன் ஐயா | with you sir | ok |

### eng_for_tel (153 rows)

| row | known | target | verdict |
|---|---|---|---|
| S0001L04U03 | నేను ఇప్పుడు నీతో ఇంగ్లీష్ మాట్లాడాలనుకుంటున్నాను. | I want to speak English with you now. | ok |
| S0037L04U06 | నేను గత నెల దాని గురించి జాగ్రత్తగా ఆలోచించడం మొదలుపెట్టాను. | I started to think about it carefully last month. | ok |
| S0060L04U07 | ఇంకా సరిపడా వేర్వేరు పదాలను ఎలా చెప్పాలో నాకు తెలియదు. | I don't know how to say enough different words yet. | ok |
| S0102L02U06 | అది అలా కాదు అని మేము చెప్పడానికి ప్రయత్నిస్తున్నాం. | We're trying to say that it's not like that. | ok |
| S0144L02U06 | ఈ ఉదయం నేను అనుకున్నదానికంటే ముందే నిద్రలేచాను. | I woke earlier than I wanted to this morning. | ok |
| S0307L02U05 | అక్కడ కూర్చున్న ఆ యువకుడు నాకు తెలుసు. | I know that young man who's sitting over there. | ok |
| S0438L02U05 | అతను ఏం చేయాలో నిర్ణయించాలని వాళ్ళు అనుకోలేదు. | They didn't want to decide what he should do. | ok |
| S0535L03U05 | తాను తప్పు ఉద్యోగాన్ని ఎంచుకోనని అతను ఒక మాట ఇచ్చాడు. | He made a promise that he wouldn't choose the wrong job. | ok |
| S0608L04U05 | అది చేయడానికి తెలివైన పని అయ్యుండేది. | It would have been the sensible thing to do. | ok |
| S0654L01U07 | నేను మీకు సహాయం చేయగలనో లేదో నాకు ఖచ్చితంగా తెలియదు, సార్. | I'm not sure if I can help you, sir. | ok |

### eng_for_urd (166 rows)

| row | known | target | verdict |
|---|---|---|---|
| S0001L05U06 | میں آپ سے ابھی انگریزی بولنا چاہتا ہوں۔ | I want to speak English with you now. | ok |
| S0039L02U06 | لیکن آج صبح میں تھوڑا تھکا ہوا ہوں۔ | But I'm a little tired this morning. | ok |
| S0089L03U06 | مجھے لگتا ہے کہ میں نے تھوڑے وقت میں بہت کچھ کیا ہے۔ | I think that I've done a lot in a short time. | ok |
| S0130L01U06 | یہ حیرت کی بات تھی، کیونکہ وہ میرا دوست ہے۔ | That was a surprise, because he's my friend. | ok |
| S0160L01U07 | آپ انگریزی میں یہ لفظ کیسے کہتے ہیں؟ | How do you say this word in English? | ok |
| S0277L02U09 | ہاں اگلے ہفتے کے شروع میں میری ایک اہم میٹنگ ہے۔ | Yes I've got an important meeting early next week. | ok |
| S0407L01U06 | کیا ہمیں ایک اچھی مثال قائم کرنے کی کوشش نہیں کرنی چاہیے؟ | Shouldn't we try to set a good example? | ok |
| S0450L03U06 | نہیں انہیں خود ٹرین پکڑنی ہے۔ | No they have to catch the train themselves. | ok |
| S0566L01U06 | اگر میرا انتخاب ہوتا تو میں نے زیادہ سوچا ہوتا۔ | I'd have thought more if it had been my choice. | ok |
| S0653L01U07 | کیا آپ کو اعتراض ہے محترمہ؟ | Do you mind madam? | ok |

### eng_for_zho (100 rows)

| row | known | target | verdict |
|---|---|---|---|
| S0003L02U06 | 怎么尽可能多地说 | How to speak as often as possible | ok |
| S0030L03U06 | 我昨天想问你一件事 | I wanted to ask you something yesterday | ok |
| S0090L02U06 | 如果你能说慢一点就好了 | If you can speak more slowly that would be great | ok |
| S0115L01U06 | 我觉得我还没准备好进行对话 | I don't feel as if I'm ready to have a conversation | ok |
| S0134L03U06 | 和他们一起做困难的事情不是问题 | It's not a problem when you work at something difficult with them | ok |
| S0154L01U06 | 你星期六晚上想在哪里见面？ | Where do you want to meet on Saturday night? | ok |
| S0184L02U06 | 看到过，刚才在办公室看到了 | Yes I saw them in the office a while ago | ok |
| S0213L01U06 | 我们不知道他们想要达到什么 | We don't know what they're trying to achieve | ok |
| S0233L02U06 | 我认识一个认识你姐姐的年轻女人 | I know a young woman who knows your sister | ok |
| S0300L02U06 | 她不想显得不友好 | She doesn't want to seem unfriendly | ok |

### fra_ca_for_eng (21 rows)

| row | known | target | verdict |
|---|---|---|---|
| S0011L04U06 | I'd like to be able to speak after you finish | J'aimerais être capable de parler après que t'as fini | ok |
| S0108L03U06 | we didn't hope to wake in the middle of the night | On espérait pas se réveiller au milieu de la nuit | ok |
| S0152L03U06 | I would have done it differently if I had known what you wanted | J'l'aurais fait autrement si j'avais su ce que tu voulais | ok |
| S0215L01U06 | I went out on Saturday night | Chu sorti samedi soir | ok |
| S0244L01U06 | I've learnt a lot already | J'ai déjà appris beaucoup | ok |
| S0337L01U06 | do you think that he can continue to play? | Penses-tu qu'y peut continuer à jouer? | ok |
| S0498L02U06 | he's standing alone over there inside the entrance | Y'est debout tout seul là-bas en dedans de l'entrée | ok |
| S0513L05U06 | it hurts most when I move my head up and down | Ça fait le plus mal quand j'bouge la tête de haut en bas | ok |
| S0527L04U06 | guess who told me that funny story | Devine qui m'a conté cette histoire drôle-là | ok |
| S0550L02U06 | the end of the village | Le boutte du village | ok |

### fra_for_eng (12 rows)

| row | known | target | verdict |
|---|---|---|---|
| S0028L01U09 | It's useful to start talking as soon as you can | il est utile de commencer à parler dès que possible | ok |
| S0049L02U09 | It's like this, if you know what I mean | C'est comme ça, si tu vois ce que je veux dire | ok |
| S0139L04U06 | I'm sorry that I need to leave so early | Je suis désolé de devoir partir si tôt | ok |
| S0170L01U11 | I'd like you to tell me what you need | Je voudrais que vous me disiez ce dont vous avez besoin | ok |
| S0238L01U09 | he wanted you to tell me yesterday | il voulait que tu me dises hier | ok |
| S0240L02U09 | my father doesn't like to stop talking | mon père n'aime pas s'arrêter de parler | ok |
| S0248L02U09 | I thought the film was complete rubbish and I want my money back | Je pensais que le film était vraiment nul et je veux récupérer mon argent | ok |
| S0326L02U17 | I don't think that she needs to sell the company | Je ne pense pas qu'elle ait besoin de vendre l'entreprise | ok |
| S0480L02U15 | whatever he says it's not far ahead now | quoi qu'il dise ce n'est plus très loin maintenant | ok |
| S0614L03U10 | It's near where your family live | C'est près de là où ta famille habite | ok |

### fra_for_jpn (94 rows)

| row | known | target | verdict |
|---|---|---|---|
| S0003L02U06 | できるだけ頻繁に話す方法。 | comment parler aussi souvent que possible. | ok |
| S0019L01U06 | でも話すのをやめたくありません。 | Mais je ne veux pas arrêter de parler. | ok |
| S0054L03U06 | もう少し時間をあげたかったです。 | Nous voulions te donner un peu plus de temps. | ok |
| S0086L02U06 | 残念ながら、それは不可能でした。 | Ce n'était pas possible, malheureusement. | ok |
| S0122L04U06 | 簡単に感じ始めていて、どう進んでいるかにワクワクしています。 | Ça commence à sembler plus facile et je suis enthousiaste de voir comment ça se passe. | ok |
| S0143L02U06 | それは前に話していたことと同じです。 | C'est la même chose que ce dont nous parlions tout à l'heure. | ok |
| S0186L01U06 | 来週何か違うことについて話したいですか？ | Tu veux parler de quelque chose de différent la semaine prochaine ? | ok |
| S0234L03U06 | 昨夜あなたの兄と一緒に働いている人に会いました。 | J'ai rencontré quelqu'un hier soir qui travaille avec ton frère. | ok |
| S0274L02U06 | 数日後に出発しなければなりませんか？ | Tu dois partir dans quelques jours ? | ok |
| S0299L02U06 | 半分払いたい。 | Il veut payer la moitié. | DROPPED: same S0299 person mismatch (I vs he) |

### fra_for_zho (48 rows)

| row | known | target | verdict |
|---|---|---|---|
| S0003L02U06 | 怎么尽量多说。 | comment parler le plus souvent possible. | ok |
| S0012L04U05 | 我不想猜明天会发生什么。 | Je n'aimerais pas deviner ce qui va se passer demain. | ok |
| S0041L02U06 | 我感觉还可以,但是我开始感觉累了。 | Je me sens bien, mais je commence à me sentir fatigué. | ok |
| S0059L02U05 | 我知道下星期怎么做我需要做的。 | Je sais comment faire ce que j'ai besoin de faire la semaine prochaine. | ok |
| S0123L02U06 | 我觉得那是个好主意。 | Je pense que c'est une bonne idée. | ok |
| S0142L04U06 | 你太好了，我很感谢你帮忙。 | C'est très gentil de ta part et je te suis reconnaissant de m'avoir aidé. | ok |
| S0158L01U06 | 我们说别的吧。 | Parlons d'autre chose. | ok |
| S0191L02U08 | 没有，我一点都不介意。 | Non ça ne me dérange pas du tout. | ok |
| S0225L02U06 | 如果他能的话，他会给你一个答案。 | Il te donnerait une réponse s'il pouvait. | ok |
| S0283L02U06 | 你哪些朋友会说法语？ | Lesquels de tes amis parlent français ? | ok |

### ita_for_eng (2 rows)

| row | known | target | verdict |
|---|---|---|---|
| S0474L01U06 | I don't even want it as a free offer | non lo voglio nemmeno gratis | ok |
| S0480L03U08 | whatever he says it's not far ahead now | qualunque cosa dica, ormai non è lontano | ok |

### ita_for_jpn (107 rows)

| row | known | target | verdict |
|---|---|---|---|
| S0001L04U05 | 今あなたとイタリア語を話したいです。 | Voglio parlare italiano con te adesso. | ok |
| S0018L04U06 | 今晩6時に会いたいです。 | Vogliamo incontrarci alle sei stasera. | ok |
| S0039L01U06 | でも今朝は少し疲れています。 | Ma stamattina sono un po' stanco. | ok |
| S0065L02U06 | 自分をテストする時間を取ることは大切です。 | È importante prendersi il tempo di mettersi alla prova. | ok |
| S0095L02U06 | 次のバスで家に帰る準備はできていますか？ | Sei pronto ad andare a casa con il prossimo autobus? | ok |
| S0126L01U05 | この仕事が脳の形を変えています。 | Questo lavoro sta cambiando la forma del mio cervello. | ok |
| S0141L02U06 | 大丈夫です。全部大丈夫です。 | Nessun problema. Va tutto bene. | ok |
| S0156L01U07 | 今夜レストランに行きたいですか？ | Vuoi andare a un ristorante stasera? | ok |
| S0212L01U06 | 彼らは助けを求めたかったです。 | Volevano chiedere aiuto. | ok |
| S0299L02U05 | 半分払いたい。 | Lui vuole pagare la metà. | DROPPED: same S0299 person mismatch |

### ita_for_zho (54 rows)

| row | known | target | verdict |
|---|---|---|---|
| S0004L02U06 | 怎么用意大利语说一些东西 | come dire qualcosa in italiano | ok |
| S0028L02U08 | 尽快开始说话是有用的。 | È utile cominciare a parlare appena puoi. | ok |
| S0059L03U06 | 我知道下星期怎么做我需要做的。 | So come fare quello che devo fare la settimana prossima. | ok |
| S0110L03U06 | 我们是朋友，做完以后我想放松。 | Siamo amici, e dopo che finiamo mi piacerebbe rilassarmi. | ok |
| S0154L01U06 | 星期六晚上你想在哪里见面？ | Dove vuoi incontrarci sabato sera? | ok |
| S0226L01U06 | 这个男人在试着帮我。 | L'uomo sta cercando di aiutarmi. | ok |
| S0236L01U06 | 我认识一个人说她会试着帮忙。 | Conosco qualcuno che ha detto che avrebbe cercato di aiutare. | ok |
| S0256L01U06 | 我觉得我不到一个小时就准备好。 | Penso che sarò pronto in meno di un'ora. | ok |
| S0273L01U06 | 不行，很遗憾，我工作太多。 | No, purtroppo ho troppo lavoro. | ok |
| S0294L01U06 | 我今晚没足够时间给你打电话。 | Non ho abbastanza tempo per chiamarti stasera. | ok |

### jpn_for_eng (143 rows)

| row | known | target | verdict |
|---|---|---|---|
| S0010L02U06 | I'm not sure if I can remember the whole sentence | 文を全部覚えられるか、分からない | ok |
| S0076L02U07 | I'm very happy with how much I've learnt already | もう学んだことには満足してる | ok |
| S0230L01U06 | I know a young man who wants to work with you | 一緒に働きたい若い人を知ってる。 | ok |
| S0308L01U12 | yes she's a friend of my mother | うん、母の友だち | ok |
| S0327L02U13 | do you think that she needs to offer another way? | 別の方法を出す必要あると思う？ | ok |
| S0357L03U14 | no she just wanted to send her a message | ただメッセージを送りたかっただけ | ok |
| S0376L02U12 | I didn't go anywhere last month | 先月はどこにも行かなかった | ok |
| S0397L01U14 | do we need to get ready soon? | もうすぐ準備する必要ある？ | ok |
| S0423L02U12 | do they need to ask such an obvious question? | そんな分かりきった質問をする必要ある？ | ok |
| S0588L02U06 | so I wanted to grow up and leave home | 大人になって家を出たかった。 | ok |

### kor_for_eng (116 rows)

| row | known | target | verdict |
|---|---|---|---|
| S0001L04U06 | I want to speak Korean with you now | 지금 같이 한국어로 말하고 싶어요 | ok |
| S0204L03U06 | I wanted her to help you to deal with the arrangements | 그녀가 준비를 도와주길 바랐어요 | ok |
| S0313L04U13 | he said that he couldn't watch all five games | 그는 다섯 경기를 다 볼 수 없다고 했어요 | ok |
| S0326L02U13 | I don't think that she needs to sell the company | 그녀가 회사를 팔 필요가 없는 것 같아요 | ok |
| S0342L01U12 | I met someone who said something | 뭔가 말한 사람을 만났어요 | ok |
| S0360L01U12 | did your friend say anything else? | 친구가 다른 말도 했어요? | ok |
| S0380L03U13 | I asked what she wanted to include | 그녀가 뭘 포함하고 싶어하는지 물어봤어요 | ok |
| S0395L02U12 | we need to turn left at the next corner | 다음 모퉁이에서 왼쪽으로 돌아야 해요 | ok |
| S0413L04U13 | we could fall if we go too close to the edge | 가장자리에 너무 가까이 가면 넘어질 수 있어요 | ok |
| S0559L02U07 | have you found the path through the wood? | 숲을 지나는 길을 찾았어요? | ok |

### kor_for_hin (111 rows)

| row | known | target | verdict |
|---|---|---|---|
| S0001L02U02 | मैं अभी आपके साथ कोरियाई बोलना चाहता हूँ। | 지금 같이 한국어로 말하고 싶어요 | ok |
| S0113L03U06 | मुझे याद क्यों नहीं आ रहा कि आपने क्या कहा? | 왜 당신이 한 말이 기억이 안 날까요? | ok |
| S0250L01U06 | क्या आप मुझे जवाब देने से पहले कुछ और बता सकते हैं? | 제가 답하기 전에 다른 것을 말해 줄 수 있어요? | ok |
| S0293L02U06 | मुझे पता लगाना है कि वह मुझसे कहाँ मिलने वाला है। | 그가 어디서 저를 만날지 알아내야 해요. | ok |
| S0367L01U07 | नहीं, मुझे किसी ने नहीं बताया। | 아니요, 아무도 저에게 말해 주지 않았어요. | ok |
| S0393L02U07 | वह हरी कमीज़ वाला लड़का। | 초록색 셔츠를 입은 그 남자아이. | ok |
| S0414L03U06 | क्या हमें कृपया रेड वाइन की एक बोतल मिल सकती है? | 레드 와인 한 병 주실 수 있어요? | ok |
| S0499L03U07 | शायद हमें दरवाज़ा खोलना चाहिए और खिड़की बंद करनी चाहिए। | 아마 우리는 문을 열고 창문을 닫아야 할 거예요. | ok |
| S0531L04U06 | यह सच नहीं है कि कोई भी यह खेल जीत सकता है। | 누구나 그 게임을 이길 수 있다는 것은 사실이 아니에요. | ok |
| S0629L02U06 | मुझे यह दूध के साथ पसंद है लेकिन चीनी के बिना। | 저는 우유를 넣고 설탕은 빼서 좋아해요. | ok |

### kor_for_tam (183 rows)

| row | known | target | verdict |
|---|---|---|---|
| S0001L03U02 | நான் இப்போது உங்களோடு கொரிய மொழி பேச விரும்புகிறேன். | 지금 같이 한국어로 말하고 싶어요 | ok |
| S0203L02U06 | உங்களை எனக்கு உதவச் சொன்னால் நீங்கள் என்ன செய்வீர்கள்? | 도와달라고 하면 어떻게 할 거예요? | ok |
| S0239L03U06 | என் அம்மா படிக்க விரும்புகிறாள். | 제 어머니는 읽는 것을 좋아해요. | ok |
| S0307L02U06 | அங்கே உட்கார்ந்திருக்கும் அந்த இளைஞனை எனக்குத் தெரியும். | 저기 앉아 있는 그 젊은 남자를 알아요. | ok |
| S0359L01U06 | தன்னால் இடதுபுறம் திரும்ப முடியும் என்று உங்கள் நண்பர் சொன்னார். | 당신 친구는 왼쪽으로 돌 수 있었다고 말했어요. | ok |
| S0406L01U06 | இல்லை அது சரியாக இருக்கும் என்று எனக்கு உறுதியாகத் தெரியும். | 아니요, 괜찮을 것 같아요. | kept; Korean softer ("think") than Tamil "sure", not a clash |
| S0483L03U06 | வாழ்க்கை எளிதானது அல்ல ஆனால் அது எளிதாக இருக்க வேண்டியதில்லை. | 삶은 쉽지 않지만 쉬워야 한다는 뜻이 아니에요. | ok |
| S0542L02U06 | நீங்கள் கோபமாக உணரும் ஒவ்வொரு முறையும். | 화가 날 때마다요. | ok |
| S0588L01U06 | எனவே நான் வளர்ந்து வீட்டை விட்டுச் செல்ல விரும்பினேன். | 그래서 저는 자라서 집을 떠나고 싶었어요. | ok |
| S0634L01U06 | எனக்கு அவற்றில் ஒன்று வேண்டும். | 그것 중 하나 주세요. | ok |

### por_br_for_eng (34 rows)

| row | known | target | verdict |
|---|---|---|---|
| S0003L02U04 | how to speak as often as possible | como falar o mais frequentemente possível | ok |
| S0049L01U08 | it's like this, if you know what I mean | É assim, se você entende o que eu quero dizer | ok |
| S0072L01U07 | I think that you're doing very well | eu acho que você está fazendo muito bem | ok |
| S0087L01U09 | they are people I don't know | são pessoas que eu não conheço | ok |
| S0137L03U06 | it's more important to talk often than to be perfect | É mais importante falar muitas vezes do que ser perfeito | ok |
| S0244L01U06 | I've learnt a lot already | eu já aprendi muito | ok |
| S0263L01U07 | I don't know who you mean | eu não sei quem você quer dizer | ok |
| S0331L02U06 | she can't provide all the answers | ela não consegue dar todas as respostas | ok |
| S0450L04U09 | no they have to catch the train themselves | não, eles têm que pegar o trem | DROPPED: "eles mesmos" missing, same defect as spa S0450 |
| S0620L02U06 | it's a very long time since we last saw each other | já passou muito tempo desde a última vez que nos vimos | ok |

### spa_for_eng (3 rows)

| row | known | target | verdict |
|---|---|---|---|
| S0138L01U09 | this is where my friend wanted to meet us | aquí es donde mi amigo quería reunirse con nosotros | ok |
| S0450L03U06 | no they have to catch the train themselves | no, ellos tienen que coger el tren | DROPPED: no se and no mismos; "themselves" not carried (see S0450 verdict) |
| S0532L02U07 | unless they're lucky | a menos que tengan suerte | ok |

### spa_for_jpn (71 rows)

| row | known | target | verdict |
|---|---|---|---|
| S0003L02U06 | できるだけ頻繁に話す方法。 | cómo hablar lo más posible | ok |
| S0015L03U08 | そして明日私とスペイン語を話してほしいです。 | Y quiero que hables español conmigo mañana. | ok |
| S0026L05U08 | もうすぐ行ける準備ができているように感じるのが好きです。 | Me gusta sentirme como si estuviera casi listo para irme. | ok |
| S0038L02U07 | 約一週間学んでいます。 | Llevo aprendiendo aproximadamente una semana. | ok |
| S0053L02U08 | 彼女は彼の手紙を自分のかばんに入れたかったです。 | Ella quería poner su carta en su bolso. | ok |
| S0065L03U06 | 自分をテストする時間を取ることは大切です。 | Es importante tomar tiempo para ponerte a prueba. | ok |
| S0082L01U07 | あなたを待つつもりはありません。なぜですか？ | No voy a esperarte. ¿Por qué no? | ok |
| S0117L01U08 | 前回お互いに話した時より確実にうまくやっています。 | Definitivamente lo estoy haciendo mejor que la última vez que hablamos. | ok |
| S0152L03U08 | あなたが何を望んでいたか知っていたら、違うやり方でやったでしょう。 | Lo habría hecho de manera diferente si hubiera sabido lo que querías. | ok |
| S0299L02U06 | 半分払いたい。 | Él quiere pagar la mitad. | DROPPED: same S0299 person mismatch |

### spa_for_zho (68 rows)

| row | known | target | verdict |
|---|---|---|---|
| S0003L02U06 | 怎么尽量多说。 | cómo hablar lo más posible | ok |
| S0023L02U06 | 我很快要开始多说话了。 | Voy a empezar a hablar más pronto. | ok |
| S0056L03U06 | 所以我能记住怎么说几个词。 | Para poder recordar cómo decir algunas palabras. | ok |
| S0065L02U08 | 花时间测试自己很重要。 | Es importante tomar tiempo para ponerte a prueba. | ok |
| S0093L02U09 | 这是唯一有用的方法。 | Esta es la única manera en que funcionará. | ok |
| S0133L02U06 | 跟他们一起做难的事情的时候没有问题。 | No es un problema cuando trabajas en algo difícil con ellos. | ok |
| S0183L03U09 | 是的，我刚才在办公室看到了。 | Sí, las vi en la oficina hace un rato. | ok |
| S0244L01U06 | 我很高兴我在短时间内做了这么多。 | Estoy contento con cuánto he hecho en poco tiempo. | ok |
| S0279L01U06 | 是的，因为剩下的时间不多了。 | Sí, porque no quedaba mucho tiempo. | ok |
| S0297L01U06 | 我不认识很多会说西班牙语的人。 | No conozco a muchas personas que hablan español. | kept; indicative "hablan" acceptable (people exist) |

### spa_mx_for_eng (102 rows)

| row | known | target | verdict |
|---|---|---|---|
| S0007L03U06 | I want to try as hard as I can today | quiero intentar todo lo que pueda hoy | ok |
| S0077L03U10 | I'm surprised at how quickly I'm starting to understand | Me sorprende lo rápido que estoy empezando a entender | ok |
| S0116L02U09 | this isn't the best choice I could make | esta no es la mejor decisión que podría tomar | ok |
| S0166L01U07 | my name is not very unusual | mi nombre no es muy raro | ok |
| S0195L03U06 | I'm trying to find the money I left on the table | estoy tratando de encontrar el dinero que dejé en la mesa | ok |
| S0219L01U09 | it was nice to relax for a while | fue agradable relajarme un rato | ok |
| S0251L02U08 | I don't want to find out until after we finish | no quiero descubrirlo hasta después de que terminemos | ok |
| S0296L01U07 | I said that I needed a little more time | dije que necesitaba un poco más de tiempo | ok |
| S0409L01U06 | no it doesn't matter what we do | no, no importa lo que hagamos | ok |
| S0611L03U11 | I would have been ready to look somewhere else | habría estado dispuesto a buscar en otro lado | ok |

### zho_for_eng (26 rows)

| row | known | target | verdict |
|---|---|---|---|
| S0009L02U06 | I speak a little Chinese now | 我现在会说一点中文 | ok |
| S0027L04U09 | I don't like taking too much time to answer | 我不喜欢花太多时间回答 | ok |
| S0115L01U09 | I don't feel as if I'm ready to have a conversation | 我觉得我还没准备好进行对话 | ok |
| S0135L01U07 | I don't know why you think that it's so good | 我不知道你为什么觉得那这么好 | DROPPED: "觉得那这么好" ungrammatical (那个/它) |
| S0192L01U11 | I'm busy tomorrow night | 我明晚很忙 | ok |
| S0293L02U09 | I have to find out where he's going to meet me | 我得弄清楚他要在哪里见我 | ok |
| S0345L01U09 | that person said he's not ready to leave yet | 那个人说他还没准备好离开 | ok |
| S0359L02U07 | your friend said that he could turn left. | 你的朋友说他可以向左转 | ok |
| S0525L01U07 | to check if you've been able to finish. | 看看你能不能完成 | ok |
| S0577L01U08 | we've been waiting for the news from the hospital. | 我们一直在等医院的消息 | ok |

### zho_for_hin (84 rows)

| row | known | target | verdict |
|---|---|---|---|
| S0005L03U06 | मैं किसी और के साथ बोलने का अभ्यास करने वाला हूँ। | 我要和别人练习说。 | ok |
| S0146L04U06 | जब से हमने इसे ठीक करने की कोशिश की, तब से कुछ भी काम नहीं कर रहा लगता। | 自从我们试图修好以后，什么都好像不管用。 | ok |
| S0198L01U06 | मेरी बेटी काउंसिल के लिए काम करती है। | 我女儿在政府部门工作。 | ok |
| S0267L03U06 | क्या आपको अपने दोस्त की कोई ख़बर मिली? | 你收到你朋友的消息了吗？ | ok |
| S0387L01U06 | नहीं, मुझे नहीं लगा कि वह सही थी। | 不，我不觉得她说得对。 | ok |
| S0406L01U06 | नहीं, मुझे यकीन है कि सब ठीक रहेगा। | 不，我确定没问题的。 | ok |
| S0426L03U06 | वे एक-दूसरे से प्यार करना चाहते हैं लेकिन वे ख़ुश नहीं हैं। | 他们想相爱，但他们不快乐。 | ok |
| S0516L03U06 | वे दोनों अपने आप आए। | 他们两个都自己来了。 | ok |
| S0567L03U06 | बाहर बच्चों को खेलते हुए देखते हुए समय बिताना बहुत अच्छा रहा। | 在户外看孩子们玩耍，花时间真的很美好。 | ok |
| S0621L02U06 | मुझे उसे यह बताने की हिम्मत नहीं हुई कि वह टूट गया है। | 我不敢告诉她那个坏了。 | ok |

### zho_for_jpn (65 rows)

| row | known | target | verdict |
|---|---|---|---|
| S0004L02U06 | 中国語で何かを言う方法 | 怎么用中文说一些东西 | ok |
| S0045L01U06 | すべてを知る必要はありません。 | 我不需要知道一切。 | ok |
| S0065L03U06 | 自分をテストする時間を取ることは大切です。 | 花时间测试自己很重要。 | ok |
| S0086L02U05 | 残念ながら、それは不可能でした。 | 很可惜，不可能。 | ok |
| S0096L01U06 | いいえ、まだ準備ができていません、もう少し時間が必要です。 | 不，我还没准备好，我需要多一点时间。 | ok |
| S0111L01U06 | 新しいことを学ぶと脳が変わります。 | 我们学新东西的时候会改变我们的大脑。 | ok |
| S0154L01U06 | 土曜日の夜どこで会いたいですか？ | 星期六晚上你想在哪里见面？ | ok |
| S0233L01U07 | あなたの妹を知っている若い女性を知っています。 | 我认识一个年轻女人认识你姐姐。 | ok |
| S0273L02U07 | いいえ、残念ながら仕事が多すぎます。 | 不行，很遗憾，我工作太多。 | ok |
| S0299L02U07 | 半分払いたい。 | 他想付一半。 | DROPPED: same S0299 person mismatch |

### zho_for_tam (175 rows)

| row | known | target | verdict |
|---|---|---|---|
| S0003L03U04 | முடிந்தவரை அடிக்கடி எப்படிப் பேசுவது | 怎么尽可能经常说。 | ok |
| S0028L01U06 | முடிந்தவரை சீக்கிரம் பேச ஆரம்பிப்பது பயனுள்ளது. | 尽快开始说话是很有用的。 | ok |
| S0088L03U06 | எனக்குத் தெரியாத ஆட்களோடு பேச நான் இன்னும் தயாராக இல்லை. | 我还没准备好跟陌生人说话。 | ok |
| S0132L02U06 | அவள் சொல்லிக்கொண்டிருந்ததை விட அது குறைவாக உற்சாகமானது. | 那比她说的没那么让人兴奋。 | ok |
| S0204L02U06 | ஏற்பாடுகளைச் சமாளிக்க உங்களுக்கு அவள் உதவ வேண்டும் என்று நான் விரும்பினேன். | 我想让她帮你处理安排。 | ok |
| S0301L03U06 | உங்களுக்கு ஒரு விஷயம் காட்ட விரும்புவதாக அவன் சொன்னான். | 他说他想给你看一样东西。 | ok |
| S0369L01U06 | சாலையில் சில குதிரைகளைப் பார்த்தேன். | 我在路上看到几匹马。 | ok |
| S0443L01U06 | இல்லை, அவர்கள் அதே வழியில் அதைத் தொடர்ந்து செய்ய விரும்பினார்கள். | 不，他们想继续按原来的方式做。 | ok |
| S0532L01U07 | அவர்கள் அதிர்ஷ்டசாலியாக இருந்தால் தவிர. | 除非他们很幸运。 | ok |
| S0641L01U07 | அது அந்த நாற்காலியில் இருக்கிற சிவப்பு நிறமானது என்று நினைக்கிறேன். | 我觉得是那把椅子上的红色那个。 | ok |

## Found by grepping the sampled defects across all courses, then dropped

- S0020 in the Japanese-known courses (fra/ita/spa_for_jpn, eng_for_jpn, plus deu_for_jpn above): 彼の名前を早く覚えたいですね reads as the speaker's own wish (〜たい is first-person; a wish about "you" needs 〜たいんですね / 〜たがっている), but the target says "you want". Dropped 5.
- S0299 半分払いたい ("I want to pay half") vs "he wants" in 5 courses: deu/fra/ita/spa/zho_for_jpn. Dropped 5.
- zho_for_jpn S0233: あなたの妹 (younger sister) vs 你姐姐 (older sister). Dropped 1.

## spa_for_eng S0450 verdict

English: "no they have to catch the train themselves". Spanish: "no, ellos tienen que coger el tren". The commission assumed reflexive *se*, but the sentence has **no se**. *Coger el tren* is not reflexive, so nothing reflexive could carry "themselves". The overt *ellos* gives contrast ("THEY have to"), but the emphatic "themselves" (they and nobody else / on their own) is rendered by *mismos* after the pronoun (*ellos mismos*). The RAE's DPD, entry *mismo*, describes this emphatic reinforcing use, and its entry on tonic personal pronouns covers *él/ellos + mismo*. The seed under-translates. A learner who hears "themselves" will reach for *mismos*, so drilling this row trains a mismatch. **Dropped and held as a seed fix** (suggested: "no, ellos mismos tienen que coger el tren"). por_br_for_eng S0450 ("não, eles têm que pegar o trem") has the same defect and is dropped too. The other courses' S0450 rows do carry it (urd خود, tel తామే, zho_tam 自己, jpn 自分たちで) and are kept.

Sources: https://www.rae.es/dpd/mismo · https://www.rae.es/dpd/pronombres%20personales%20t%C3%B3nicos

## eng_for_sin: whole course held (188 rows / 752 ops)

In two samples of 10, about 4 to 5 Sinhala known prompts read as garbled or wrong. S0074: තේරෙනවා කරන්න උදව් ("understand do help"). S0243: "I'm going to ask for the same thing" rendered as a word-salad. S0118: ශාලාව = hall, not pub. S0195: ලිහිල් කරලා ("loosened") for "left". S0226/S0315: stray ලවා. S0450: ගන්නේ ඕනේ. A drilled known prompt that is broken teaches nothing, so `night-run.sh` skips this course; the file is unchanged. It belongs with Kai's open Sinhala item (D1) and should run once those prompts are fixed.

## Held seed fixes (for a later content pass, not done here)

spa_for_eng S0450 · por_br_for_eng S0450 · deu_for_jpn S0007 · zho_for_eng S0135 · eng_for_tam S0103 · Japanese S0020 known (5 courses) · Japanese S0299 known (5 courses) · zho_for_jpn S0233 · the 11 ZUT pairs above (in several of them, e.g. eng_for_hin S0198 "my son" for मेरी बेटी, the EXISTING phrase is the wrong one) · eng_for_sin known side.

## Totals

26 rows (104 ops) dropped from 15 files; all 47 files pass `apply-changeset.cjs --check`. 17,212 ops remain in the files, and 16,460 of them are scheduled (eng_for_sin held).
