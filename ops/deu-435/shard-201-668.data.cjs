'use strict';
// deu_for_eng seeds 201-668 — the parent's own full read (job #435; the 7 readers for this range were refused by the
// fan-out cap, so the parent read every row itself). Generated from ops/deu-435/notes-201-668.tsv by notes-to-shard.cjs.
module.exports = {
 "SHARD": "201-668",
 "READ": {
  "seeds": 468,
  "legos": 1127,
  "phrases": 10333
 },
 "FIXES": [
  [
   "S0202L01U06",
   "en-calque",
   [
    "Nobody has worked with the council before I heard",
    "Niemand hat mit der Gemeinde gearbeitet habe ich gehört"
   ],
   [
    "Nobody has worked with the council, I heard",
    null
   ],
   "German says \"…, habe ich gehört\" (I heard), English had \"before I heard\""
  ],
  [
   "S0203L01U02",
   "mismatch",
   [
    "What would you do in a situation like this?",
    "Was würdest du machen, wenn das so wäre"
   ],
   [
    "What would you do if it were like that?",
    null
   ],
   "German \"wenn das so wäre\" says nothing about \"a situation like this\""
  ],
  [
   "S0203L02B02",
   "delete",
   [
    "If I asked you",
    "Wenn ich dich bitte"
   ],
   null,
   "exact duplicate of S0203L02B01 in the same basket"
  ],
  [
   "S0203L02U03",
   "en-extra",
   [
    "I think you would say no to me if I asked you to wait for me here after work this evening tonight",
    "Ich denke, du würdest mir nein sagen, wenn ich dich bitte, heute Abend nach der Arbeit hier auf mich zu warten"
   ],
   [
    "I think you would say no to me if I asked you to wait for me here after work this evening",
    null
   ],
   "English said \"this evening tonight\"; German has only \"heute Abend\""
  ],
  [
   "S0204L03U09",
   "mismatch",
   [
    "I wanted her to help you make preparations for the meeting tomorrow morning",
    "Ich wollte, dass sie dir hilft Vorbereitungen für das Gespräch morgen zu machen"
   ],
   [
    "I wanted her to help you make the arrangements for the meeting tomorrow",
    "Ich wollte, dass sie dir hilft, die Vorbereitungen für das Gespräch morgen zu machen"
   ],
   "German had no \"morning\" and no \"die\"; English said \"make preparations\" not the LEGO \"the arrangements\""
  ],
  [
   "S0205L01B04",
   "mismatch",
   [
    "I've forgotten so I need to think about it again",
    "Ich habe vergessen also habe ich noch einmal darüber nachgedacht"
   ],
   [
    "I've forgotten, so I thought about it again",
    null
   ],
   "German \"also habe ich noch einmal darüber nachgedacht\" is past; English said \"I need to think about it again\""
  ],
  [
   "S0206L01U09",
   "mismatch",
   [
    "I didn't have the chance to practise speaking before",
    "Ich hatte nicht die Gelegenheit sprechen zu üben vorhin"
   ],
   [
    "I didn't have the chance to practise speaking earlier",
    null
   ],
   "vorhin is taught as \"earlier\" (S0143L02), not \"before\""
  ],
  [
   "S0208L01B02",
   "delete",
   [
    "I didn't want to ask you",
    "Ich wollte dich nicht fragen"
   ],
   null,
   "exact duplicate of S0208L01B01 in the same basket"
  ],
  [
   "S0210L01U05",
   "mismatch",
   [
    "They think that he does not understand what we are trying to do",
    "Sie denken, dass er nicht verstehen kann, was wir versuchen zu machen"
   ],
   [
    "They think that he can't understand what we are trying to do",
    null
   ],
   "German \"nicht verstehen kann\"; English said \"does not understand\""
  ],
  [
   "S0210L01U06",
   "mismatch",
   [
    "I believe they think that the book is too difficult for the students",
    "Ich glaube, sie denken, dass das Buch zu schwierig für die Leute ist"
   ],
   [
    "I believe they think that the book is too difficult for the people",
    null
   ],
   "German \"für die Leute\"; English said \"for the students\""
  ],
  [
   "S0210L02U07",
   "mismatch",
   [
    "We need to discuss how to make it work better together",
    "Wir müssen zusammen besprechen wie wir es besser machen"
   ],
   [
    "We need to discuss together how to make it better",
    null
   ],
   "German \"wie wir es besser machen\" (make it better) + \"zusammen besprechen\"; English said \"make it work better together\""
  ],
  [
   "S0213L01U05",
   "mismatch",
   [
    "Do you know what they're trying to achieve?",
    "Du weißt, was sie zu erreichen versuchen?"
   ],
   [
    null,
    "Weißt du, was sie zu erreichen versuchen?"
   ],
   "English is a question (\"Do you know…?\"); German was statement order \"Du weißt, …?\""
  ],
  [
   "S0214L02U03",
   "en-dropped",
   [
    "Can you come to see us at the weekend if you have enough time for us?",
    "Kannst du uns am Wochenende sehen wenn du genug Zeit für uns hast"
   ],
   [
    "Can you see us at the weekend if you have enough time for us?",
    null
   ],
   "German has no \"come\" (\"Kannst du uns … sehen\")"
  ],
  [
   "S0217L04U05",
   "en-extra",
   [
    "Have you drunk the water that I had for you yesterday evening when I came here to visit?",
    "Hast du das Wasser getrunken das ich gestern Abend für dich hatte als ich hier war"
   ],
   [
    "Have you drunk the water that I had for you yesterday evening when I was here?",
    null
   ],
   "German \"als ich hier war\"; English said \"when I came here to visit\""
  ],
  [
   "S0217L04U07",
   "en-extra",
   [
    "She has drunk two glasses of water this evening because she felt so very tired from all the work",
    "Sie hat heute Abend zwei Gläser Wasser getrunken weil sie sich von der Arbeit so sehr müde gefühlt hat"
   ],
   [
    "She has drunk two glasses of water this evening because she felt so very tired from the work",
    null
   ],
   "German \"von der Arbeit\"; English had \"all\""
  ],
  [
   "S0218L01U01",
   "en-extra",
   [
    "I think I need to go to the office on Sunday morning to finish the work",
    "Ich denke ich muss am Sonntag zum Büro um die Arbeit fertig zu machen"
   ],
   [
    "I think I need to go to the office on Sunday to finish the work",
    null
   ],
   "German \"am Sonntag\" (no morning)"
  ],
  [
   "S0218L01U02",
   "en-extra",
   [
    "I wanted to ask if you have time to meet with me on Sunday afternoon",
    "Ich wollte fragen ob du Zeit hast dich mit mir am Sonntag zu treffen"
   ],
   [
    "I wanted to ask if you have time to meet with me on Sunday",
    null
   ],
   "German \"am Sonntag\" (no afternoon)"
  ],
  [
   "S0218L01U04",
   "en-extra",
   [
    "I need to know if you will be at home on Sunday so I can come to see you",
    "Ich muss wissen ob du am Sonntag zu Hause sein wirst damit ich kommen kann"
   ],
   [
    "I need to know if you will be at home on Sunday so I can come",
    null
   ],
   "German \"damit ich kommen kann\" (no \"to see you\")"
  ],
  [
   "S0218L01U06",
   "en-extra",
   [
    "She said she cannot work on Sunday because she needs to rest and relax at home",
    "Sie hat gesagt sie kann am Sonntag nicht arbeiten weil sie sich zu Hause entspannen muss"
   ],
   [
    "She said she cannot work on Sunday because she needs to relax at home",
    null
   ],
   "German \"sich zu Hause entspannen\" (no \"rest and\")"
  ],
  [
   "S0220L03U01",
   "de-grammar",
   [
    "I watched the television yesterday evening at home with my friends",
    "Ich habe gestern Abend zu Hause mit meinen Freunden das Fernsehen ferngesehen"
   ],
   [
    "I watched television yesterday evening at home with my friends",
    "Ich habe gestern Abend zu Hause mit meinen Freunden ferngesehen"
   ],
   "\"das Fernsehen ferngesehen\" is ungrammatical (fernsehen already holds the TV)"
  ],
  [
   "S0220L03U02",
   "de-grammar",
   [
    "Have you watched the television today or did you work all day?",
    "Hast du heute das Fernsehen ferngesehen oder hast du den ganzen Tag gearbeitet"
   ],
   [
    "Have you watched television today or did you work all day?",
    "Hast du heute ferngesehen oder hast du den ganzen Tag gearbeitet?"
   ],
   "\"das Fernsehen ferngesehen\" is ungrammatical"
  ],
  [
   "S0220L03U04",
   "de-grammar",
   [
    "I have not watched the television for a long time because I was busy",
    "Ich habe lange nicht das Fernsehen ferngesehen weil ich beschäftigt war"
   ],
   [
    "I have not watched television for a long time because I was busy",
    "Ich habe lange nicht ferngesehen, weil ich beschäftigt war"
   ],
   "\"das Fernsehen ferngesehen\" is ungrammatical"
  ],
  [
   "S0220L03U05",
   "de-grammar",
   [
    "I watched the television yesterday and I thought it was very interesting",
    "Ich habe gestern das Fernsehen ferngesehen und ich dachte es war sehr interessant"
   ],
   [
    "I watched television yesterday and I thought it was very interesting",
    "Ich habe gestern ferngesehen und ich dachte, es war sehr interessant"
   ],
   "\"das Fernsehen ferngesehen\" is ungrammatical"
  ],
  [
   "S0220L03U07",
   "de-grammar",
   [
    "Have you watched the television with your friends this week or not?",
    "Hast du diese Woche das Fernsehen mit deinen Freunden ferngesehen oder nicht"
   ],
   [
    "Have you watched television with your friends this week or not?",
    "Hast du diese Woche mit deinen Freunden ferngesehen oder nicht?"
   ],
   "\"das Fernsehen ferngesehen\" is ungrammatical"
  ],
  [
   "S0220L03U06",
   "en-dropped",
   [
    "I watched at home yesterday and I learned some new words in German",
    "Ich habe gestern zu Hause ferngesehen und ich habe neue Wörter auf Deutsch gelernt"
   ],
   [
    "I watched television at home yesterday and I learned some new words in German",
    null
   ],
   "German \"ferngesehen\" = watched TV; English said only \"I watched\""
  ],
  [
   "S0221L02U06",
   "en-extra",
   [
    "I watched the football last week and it was very interesting to watch with my friends",
    "Ich habe letzte Woche Fußball geschaut und es war sehr interessant mit meinen Freunden"
   ],
   [
    "I watched the football last week and it was very interesting with my friends",
    null
   ],
   "German has no \"to watch\" at the end"
  ],
  [
   "S0221L04U04",
   "en-extra",
   [
    "I watched a film yesterday but I thought it was not very interesting to watch",
    "Ich habe gestern einen Film geschaut aber ich dachte es war nicht sehr interessant"
   ],
   [
    "I watched a film yesterday but I thought it was not very interesting",
    null
   ],
   "German has no \"to watch\" at the end"
  ],
  [
   "S0222L01B02",
   "delete",
   [
    "He is trying to tell me what he wants",
    "Er versucht mir zu sagen, was er will"
   ],
   null,
   "duplicate of S0222L01B01 (differs only in capital letter)"
  ],
  [
   "S0223L01B02",
   "delete",
   [
    "he is going to ask you tomorrow",
    "Er wird dich morgen fragen"
   ],
   null,
   "duplicate of S0223L01B01 (differs only in capital letter)"
  ],
  [
   "S0225L01U10",
   "de-dropped",
   [
    "He would give you what you need if he had time",
    "Er würde geben was du brauchst wenn er Zeit hätte"
   ],
   [
    null,
    "Er würde dir geben, was du brauchst, wenn er Zeit hätte"
   ],
   "English \"give you\"; German had no \"dir\""
  ],
  [
   "S0228L01U01",
   "en-dropped",
   [
    "That man has just started to practise speaking and I am very glad",
    "Dieser Mann hat gerade angefangen, sprechen zu üben, und ich bin sehr froh darüber"
   ],
   [
    "That man has just started to practise speaking and I am very glad about it",
    null
   ],
   "German ends \"froh darüber\""
  ],
  [
   "S0229L02U01",
   "en-extra",
   [
    "That woman would help you learn German if you asked her nicely to help you",
    "Diese Frau würde dir helfen Deutsch zu lernen wenn du sie nett fragen würdest"
   ],
   [
    "That woman would help you learn German if you asked her nicely",
    null
   ],
   "German \"wenn du sie nett fragen würdest\" has no \"to help you\""
  ],
  [
   "S0229L02U05",
   "en-extra",
   [
    "That woman would help you find the answer to your question if she had the time to help",
    "Diese Frau würde dir helfen die Antwort auf deine Frage zu finden wenn sie die Zeit hätte"
   ],
   [
    "That woman would help you find the answer to your question if she had the time",
    null
   ],
   "German \"wenn sie die Zeit hätte\" has no \"to help\""
  ],
  [
   "S0230L01B02",
   "delete",
   [
    "I know a young man who wants to work with you",
    "Ich kenne einen jungen Mann, der mit dir arbeiten will"
   ],
   null,
   "exact duplicate of S0230L01B01"
  ],
  [
   "S0227L02U05",
   "en-extra",
   [
    "I heard that she is going to tell me the truth about what really happened last week",
    "Ich habe gehört, dass sie mir die Wahrheit darüber sagen wird, was letzte Woche passiert ist"
   ],
   [
    "I heard that she is going to tell me the truth about what happened last week",
    null
   ],
   "German has no \"really\" (wirklich not taught by 227)"
  ],
  [
   "S0232L01B02",
   "delete",
   [
    "An old woman",
    "Eine alte Frau"
   ],
   null,
   "exact duplicate of S0232L01B01"
  ],
  [
   "S0232L02B01",
   "mismatch",
   [
    "The woman who is waiting",
    "Die Frau die hier ist"
   ],
   [
    "The woman who is here",
    null
   ],
   "German \"Die Frau die hier ist\"; English said \"who is waiting\""
  ],
  [
   "S0233L01B02",
   "delete",
   [
    "A young woman",
    "Eine junge Frau"
   ],
   null,
   "exact duplicate of S0233L01B01"
  ],
  [
   "S0233L03B02",
   "delete",
   [
    "Your sister",
    "Deine Schwester"
   ],
   null,
   "exact duplicate of S0233L03B01"
  ],
  [
   "S0237L01B02",
   "en-dropped",
   [
    "He wanted me to wait",
    "Er wollte, dass ich auf ihn warte"
   ],
   [
    "He wanted me to wait for him",
    null
   ],
   "German \"dass ich auf ihn warte\" has \"for him\""
  ],
  [
   "S0239L01U02",
   "mismatch",
   [
    "She reads a book at night when she is at home alone and wants to relax",
    "Sie liest ein Buch am Abend, wenn sie alleine zu Hause ist und sich entspannen will"
   ],
   [
    "She reads a book in the evening, when she is at home alone and wants to relax",
    null
   ],
   "German \"am Abend\"; English said \"at night\""
  ],
  [
   "S0239L01U06",
   "en-extra",
   [
    "She reads very quickly and easily but my brother always reads much more slowly than she does",
    "Sie liest sehr schnell und leicht, aber mein Bruder liest viel langsamer als sie"
   ],
   [
    "She reads very quickly and easily but my brother reads much more slowly than she does",
    null
   ],
   "German has no \"always\""
  ],
  [
   "S0245L02U02",
   "en-extra",
   [
    "My brother was surprised with how much money he had to use last week",
    "Mein Bruder war überrascht damit, wie viel Geld er letzte Woche benutzt hat"
   ],
   [
    "My brother was surprised with how much money he used last week",
    null
   ],
   "German \"benutzt hat\" has no \"had to\""
  ],
  [
   "S0249L02U05",
   "en-extra",
   [
    "Before you go please think about this carefully",
    "Bevor du gehst bitte denke darüber nach"
   ],
   [
    "Before you go please think about this",
    null
   ],
   "German \"bitte denke darüber nach\" has no \"carefully\""
  ],
  [
   "S0250L01U03",
   "en-extra",
   [
    "Can you tell me where your brother is because I need to talk to him about something important?",
    "Kannst du mir sagen wo dein Bruder ist weil ich mit ihm über etwas reden muss"
   ],
   [
    "Can you tell me where your brother is because I need to talk to him about something?",
    null
   ],
   "German \"über etwas reden\" has no \"important\""
  ],
  [
   "S0250L02B04",
   "en-extra",
   [
    "This is something else completely",
    "Das ist etwas anderes"
   ],
   [
    "This is something else",
    null
   ],
   "German \"Das ist etwas anderes\" has no \"completely\""
  ],
  [
   "S0250L03U07",
   "delete",
   [
    "I need to think before I answer",
    "Ich muss denken bevor ich antworte"
   ],
   null,
   "same English as S0250L03B02 with a different German (\"denken\" vs \"nachdenken\"): one English → two Germans in one basket"
  ],
  [
   "S0252L01B02",
   "delete",
   [
    "When will you be ready to start?",
    "Wann wirst du bereit sein anzufangen"
   ],
   null,
   "duplicate of S0252L01B01 (differs only in capital letter)"
  ],
  [
   "S0253L01B02",
   "delete",
   [
    "I should be ready in a few minutes",
    "Ich sollte in ein paar Minuten bereit sein"
   ],
   null,
   "exact duplicate of S0253L01B01"
  ],
  [
   "S0254L01B02",
   "delete",
   [
    "I have been ready since this morning",
    "Ich bin seit heute Morgen bereit"
   ],
   null,
   "exact duplicate of S0254L01B01"
  ],
  [
   "S0254L01U04",
   "en-extra",
   [
    "Until you tell me what time we can start I will just wait here because I have been ready since this morning for everything",
    "Bis du mir sagst, wann wir anfangen können, werde ich hier warten, weil ich seit heute Morgen für alles bereit bin"
   ],
   [
    "Until you tell me what time we can start I will wait here because I have been ready since this morning for everything",
    null
   ],
   "German \"werde ich hier warten\" has no \"just\""
  ],
  [
   "S0255L01B02",
   "delete",
   [
    "When do you think you will be ready to leave?",
    "Wann denkst du, wirst du bereit sein zu gehen"
   ],
   null,
   "exact duplicate of S0255L01B01"
  ],
  [
   "S0258L01U04",
   "mismatch",
   [
    "They were sitting over there talking about what happened at the restaurant last week",
    "Sie waren drüben und haben darüber geredet was letzte Woche im Restaurant passiert ist"
   ],
   [
    "They were over there and talked about what happened at the restaurant last week",
    null
   ],
   "German \"Sie waren drüben und haben darüber geredet\"; English said \"sitting … talking\""
  ],
  [
   "S0260L01U08",
   "en-extra",
   [
    "There is not the faintest chance that I will be ready before the test starts tomorrow morning",
    "Es gibt nicht die geringste Gelegenheit dass ich bereit bin bevor der Test morgen früh ist"
   ],
   [
    "There is not the faintest chance that I will be ready before the test tomorrow morning",
    null
   ],
   "German \"bevor der Test morgen früh ist\" has no \"starts\""
  ],
  [
   "S0261L01U07",
   "mismatch",
   [
    "She asked me if I knew something important about what they were planning to do next",
    "Sie wollte wissen ob ich etwas Wichtiges über das wusste was sie als nächstes machen wollten"
   ],
   [
    "She asked me if I knew something important about what they wanted to do next",
    null
   ],
   "German \"was sie als nächstes machen wollten\"; English said \"were planning to do\""
  ],
  [
   "S0262L01U03",
   "en-extra",
   [
    "Who was that man you were talking to yesterday outside the office building?",
    "Wer war der Mann, mit dem du gestern vor dem Büro geredet hast?"
   ],
   [
    "Who was that man you were talking to yesterday outside the office?",
    null
   ],
   "German \"vor dem Büro\" has no \"building\""
  ],
  [
   "S0263L01U01",
   "en-extra",
   [
    "Who did you see yesterday at work in the office building here?",
    "Wen hast du gestern bei der Arbeit im Büro hier gesehen?"
   ],
   [
    "Who did you see yesterday at work in the office here?",
    null
   ],
   "German \"im Büro hier\" has no \"building\""
  ],
  [
   "S0263L01U07",
   "en-extra",
   [
    "Who did you see at the restaurant when you went out to eat dinner?",
    "Wen hast du im Restaurant gesehen, als du ausgegangen bist, um zu essen?"
   ],
   [
    "Who did you see at the restaurant when you went out to eat?",
    null
   ],
   "German \"um zu essen\" has no \"dinner\""
  ],
  [
   "S0266L01U07",
   "en-extra",
   [
    "The dog of my father was always very happy when he was back at home",
    "Der Hund meines Vaters war sehr glücklich wenn er zurück zu Hause war"
   ],
   [
    "The dog of my father was very happy when he was back at home",
    null
   ],
   "German has no \"always\" (immer)"
  ],
  [
   "S0267L01U10",
   "de-word-order",
   [
    "Have you heard from the old man about that thing we need to find this afternoon?",
    "Hast du heute Nachmittag von dem alten Mann über das Ding gehört, das wir finden müssen?"
   ],
   [
    null,
    "Hast du von dem alten Mann über das Ding gehört, das wir heute Nachmittag finden müssen?"
   ],
   "English \"the thing we need to find this afternoon\"; German put \"heute Nachmittag\" with \"gehört\" (heard this afternoon)"
  ],
  [
   "S0268L01U06",
   "mismatch",
   [
    "He got two emails from work this morning that he needs to read very soon",
    "Er hat zwei E-Mails von der Arbeit heute Morgen die er sehr bald lesen muss"
   ],
   [
    "He has two emails from work this morning that he needs to read very soon",
    null
   ],
   "German \"Er hat zwei E-Mails\"; English said \"He got\""
  ],
  [
   "S0268L01U07",
   "mismatch",
   [
    "I have to write two emails before I can go home from the office this afternoon",
    "Ich muss zwei E-Mails schreiben, bevor ich heute Nachmittag von der Arbeit nach Hause gehen kann"
   ],
   [
    "I have to write two emails before I can go home from work this afternoon",
    null
   ],
   "German \"von der Arbeit\"; English said \"from the office\""
  ],
  [
   "S0269L01U02",
   "mismatch",
   [
    "I am going to wait for the answer before I make any decision",
    "Ich werde auf die Antwort warten, bevor ich etwas mache"
   ],
   [
    "I am going to wait for the answer before I do anything",
    null
   ],
   "German \"bevor ich etwas mache\"; English said \"before I make any decision\""
  ],
  [
   "S0271L02U04",
   "en-extra",
   [
    "We are going to try to have a meeting at the office next month about all the new work",
    "Wir werden versuchen nächsten Monat ein Treffen im Büro über die neue Arbeit zu haben"
   ],
   [
    "We are going to try to have a meeting at the office next month about the new work",
    null
   ],
   "German \"über die neue Arbeit\" has no \"all\""
  ],
  [
   "S0277L01U02",
   "mismatch",
   [
    "She told me she has an important meeting at the office today",
    "Sie sagt mir dass sie heute ein wichtiges Treffen im Büro hat"
   ],
   [
    "She tells me that she has an important meeting at the office today",
    null
   ],
   "German \"Sie sagt mir\" is present; English said \"She told me\""
  ],
  [
   "S0277L01U04",
   "mismatch",
   [
    "He said he cannot help us because he has an important meeting",
    "Er sagt er kann uns nicht helfen weil er ein wichtiges Treffen hat"
   ],
   [
    "He says he cannot help us because he has an important meeting",
    null
   ],
   "German \"Er sagt\" is present; English said \"He said\""
  ],
  [
   "S0277L02B02",
   "delete",
   [
    "Early next week",
    "Anfang nächster Woche"
   ],
   null,
   "exact duplicate of S0277L02B01"
  ],
  [
   "S0278L01U10",
   "mismatch",
   [
    "She told me she would like to finish it this week if that is possible",
    "Sie sagt mir sie möchte es diese Woche fertig machen wenn das möglich ist"
   ],
   [
    "She tells me she would like to finish it this week if that is possible",
    null
   ],
   "German \"Sie sagt mir\" is present; English said \"She told me\""
  ],
  [
   "S0279L01B02",
   "delete",
   [
    "Time left",
    "Zeit übrig"
   ],
   null,
   "exact duplicate of S0279L01B01"
  ],
  [
   "S0280L03U12",
   "mismatch",
   [
    "I remember you told me last week that your question was the most important one you had",
    "Ich weiß du hast mir letzte Woche gesagt dass deine Frage die wichtigste war die du hattest"
   ],
   [
    "I know you told me last week that your question was the most important one you had",
    null
   ],
   "German \"Ich weiß\"; English said \"I remember\""
  ],
  [
   "S0281L02B03",
   "mismatch",
   [
    "I really want my coffee soon",
    "Ich will meinen Kaffee sehr bald"
   ],
   [
    "I want my coffee very soon",
    null
   ],
   "German \"sehr bald\" (very soon), no \"really\""
  ],
  [
   "S0281L02U01",
   "en-extra",
   [
    "I really need my coffee before I can start working today",
    "Ich brauche meinen Kaffee sehr, bevor ich heute arbeiten kann"
   ],
   [
    "I really need my coffee before I can work today",
    null
   ],
   "German \"bevor ich heute arbeiten kann\" has no \"start\""
  ],
  [
   "S0281L02U06",
   "mismatch",
   [
    "I need my coffee every morning or I will stay very tired",
    "Ich brauche meinen Kaffee am Morgen oder ich werde sehr müde bleiben"
   ],
   [
    "I need my coffee in the morning or I will stay very tired",
    null
   ],
   "German \"am Morgen\"; English said \"every morning\""
  ],
  [
   "S0282L01B04",
   "en-extra",
   [
    "She said that's not a problem at all",
    "Sie hat gesagt das ist kein Problem"
   ],
   [
    "She said that's not a problem",
    null
   ],
   "German has no \"at all\" (überhaupt)"
  ],
  [
   "S0282L01U01",
   "en-extra",
   [
    "I can help you tomorrow morning if you need me because that's not a problem at all",
    "Ich kann dir morgen früh helfen, wenn du mich brauchst, weil das kein Problem ist"
   ],
   [
    "I can help you tomorrow morning if you need me because that's not a problem",
    null
   ],
   "German has no \"at all\""
  ],
  [
   "S0282L01U04",
   "en-extra",
   [
    "They wanted to know if we could wait a little while longer but that's not a problem",
    "Sie wollten wissen ob wir eine Weile länger warten können aber das ist kein Problem"
   ],
   [
    "They wanted to know if we could wait a while longer but that's not a problem",
    null
   ],
   "German \"eine Weile länger\" has no \"little\""
  ],
  [
   "S0283L02U09",
   "delete",
   [
    "I was hoping that my friends speak to me before they make any big decisions about work",
    "Ich dachte, dass meine Freunde mit mir sprechen, bevor sie etwas über Arbeit machen"
   ],
   null,
   "English and German say different things (\"was hoping … before they make any big decisions\" vs \"dachte … bevor sie etwas über Arbeit machen\"); basket keeps 4 USE"
  ],
  [
   "S0283L02U10",
   "mismatch",
   [
    "They wanted to know if our friends speak about us when we are not there with them",
    "Sie wollten wissen, ob die Freunde über uns sprechen, wenn wir nicht da sind"
   ],
   [
    "They wanted to know if the friends speak about us when we are not there with them",
    null
   ],
   "German \"die Freunde\"; English said \"our friends\""
  ],
  [
   "S0286L01U04",
   "mismatch",
   [
    "I think people who like speaking German would like to watch films with us",
    "Ich denke Leute, die gern Deutsch sprechen wollen mit uns fernsehen"
   ],
   [
    "I think people who like speaking German want to watch television with us",
    null
   ],
   "German \"wollen mit uns fernsehen\"; English said \"would like to watch films\""
  ],
  [
   "S0287L01B02",
   "delete",
   [
    "How many people do you know who like watching television",
    "Wie viele Leute kennst du, die gern fernsehen"
   ],
   null,
   "exact duplicate of S0287L01B01"
  ],
  [
   "S0283L01U06",
   "mismatch",
   [
    "Which of your ideas worked well for you before",
    "Welche deiner Ideen haben gut für dich vorhin funktioniert"
   ],
   [
    "Which of your ideas worked well for you earlier",
    null
   ],
   "vorhin is taught as \"earlier\" (S0143L02), not \"before\""
  ],
  [
   "S0288L01B02",
   "en-extra",
   [
    "Most people I know are busy right now today",
    "Die meisten Leute, die ich kenne, sind beschäftigt jetzt"
   ],
   [
    "Most people I know are busy right now",
    null
   ],
   "German \"sind beschäftigt jetzt\" has no \"today\""
  ],
  [
   "S0288L01B04",
   "en-extra",
   [
    "Most people I know think this is very interesting",
    "Die meisten Leute, die ich kenne, denken das ist interessant"
   ],
   [
    "Most people I know think this is interesting",
    null
   ],
   "German \"das ist interessant\" has no \"very\""
  ],
  [
   "S0289L01B02",
   "delete",
   [
    "I wonder if she's going to be there this afternoon",
    "Ich frage mich ob sie heute Nachmittag da sein wird"
   ],
   null,
   "exact duplicate of S0289L01B01"
  ],
  [
   "S0290L01B02",
   "delete",
   [
    "I wonder if he knows the answer",
    "Ich frage mich ob er die Antwort weiß"
   ],
   null,
   "exact duplicate of S0290L01B01"
  ],
  [
   "S0293L01U04",
   "mismatch",
   [
    "I have to find out why she did not come to the party",
    "Ich muss herausfinden, warum sie nicht zu der Party kommen wollte"
   ],
   [
    "I have to find out why she did not want to come to the party",
    null
   ],
   "German \"nicht … kommen wollte\"; English said \"did not come\""
  ],
  [
   "S0294L01U06",
   "en-extra",
   [
    "He always said he did not have enough time to do anything",
    "Er hat gesagt, dass er nicht genug Zeit hatte, um etwas zu machen"
   ],
   [
    "He said he did not have enough time to do anything",
    null
   ],
   "German has no \"always\""
  ],
  [
   "S0294L01U07",
   "mismatch",
   [
    "We did not have enough time to finish the work before we left",
    "Wir haben nicht genug Zeit, um die Arbeit fertig zu machen, bevor wir weg sind"
   ],
   [
    "We don't have enough time to finish the work before we leave",
    null
   ],
   "German is present (\"Wir haben nicht genug Zeit … bevor wir weg sind\"); English was past"
  ],
  [
   "S0294L01U08",
   "en-extra",
   [
    "I need to find out if I have enough time to go home first",
    "Ich muss herausfinden, ob ich genug Zeit habe, um nach Hause zu gehen"
   ],
   [
    "I need to find out if I have enough time to go home",
    null
   ],
   "German has no \"first\""
  ],
  [
   "S0294L01U09",
   "en-extra",
   [
    "She asked me if I thought we had enough time to finish",
    "Sie wollte wissen, ob ich dachte, dass wir genug Zeit haben"
   ],
   [
    "She asked me if I thought we had enough time",
    null
   ],
   "German \"dass wir genug Zeit haben\" has no \"to finish\""
  ],
  [
   "S0294L01U11",
   "mismatch",
   [
    "I am worried that I will not have enough time to learn everything",
    "Ich bin nervös, dass ich nicht genug Zeit haben werde, um alles zu lernen"
   ],
   [
    "I am nervous that I will not have enough time to learn everything",
    null
   ],
   "German \"Ich bin nervös\"; English said \"I am worried\""
  ],
  [
   "S0295L01U04",
   "en-extra",
   [
    "I did not say it would be easy to finish all the work",
    "Ich habe nicht gesagt, dass es leicht sein würde, die Arbeit fertig zu machen"
   ],
   [
    "I did not say it would be easy to finish the work",
    null
   ],
   "German \"die Arbeit\" has no \"all\""
  ],
  [
   "S0295L01U06",
   "mismatch",
   [
    "I did not say I did not like what you did",
    "Ich habe nicht gesagt, dass ich nicht mag, was du gemacht hast"
   ],
   [
    "I did not say I do not like what you did",
    null
   ],
   "German \"dass ich nicht mag\" is present; English \"I did not like\""
  ],
  [
   "S0295L02U09",
   "en-extra",
   [
    "She asked me when the work would be finished and ready",
    "Sie wollte wissen, wann die Arbeit fertig werden würde"
   ],
   [
    "She asked me when the work would be finished",
    null
   ],
   "German has no \"and ready\""
  ],
  [
   "S0295L02U11",
   "mismatch",
   [
    "They said they needed to be finished before the weekend started",
    "Sie haben gesagt, dass sie fertig werden wollten, bevor das Wochenende anfangen wird"
   ],
   [
    "They said they wanted to be finished before the weekend starts",
    null
   ],
   "German \"fertig werden wollten, bevor das Wochenende anfangen wird\"; English said \"needed … started\""
  ],
  [
   "S0296L01B02",
   "delete",
   [
    "I said that I needed a little more time",
    "Ich habe gesagt, dass ich ein bisschen mehr Zeit brauche"
   ],
   null,
   "exact duplicate of S0296L01B01"
  ],
  [
   "S0296L01U09",
   "mismatch",
   [
    "I said that I needed a little more time to understand what they were saying",
    "Ich habe gesagt, dass ich ein bisschen mehr Zeit brauche, um zu verstehen, was sie sagen wollten"
   ],
   [
    "I said that I needed a little more time to understand what they wanted to say",
    null
   ],
   "German \"was sie sagen wollten\"; English said \"what they were saying\""
  ],
  [
   "S0298L01B02",
   "delete",
   [
    "I have got",
    "Ich habe"
   ],
   null,
   "exact duplicate of S0298L01B01"
  ],
  [
   "S0298L02U07",
   "mismatch",
   [
    "He has nothing left to say because he already said everything before",
    "Er hat nichts mehr zu sagen, weil er schon vorhin alles gesagt hat"
   ],
   [
    "He has nothing left to say because he already said everything earlier",
    null
   ],
   "vorhin is taught as \"earlier\" (S0143L02), not \"before\""
  ],
  [
   "S0310L03U06",
   "mismatch",
   [
    "I think she is writing a story",
    "ich denke, dass sie eine Geschichte schreiben will"
   ],
   [
    "I think she wants to write a story",
    null
   ],
   "German \"dass sie eine Geschichte schreiben will\"; English said \"she is writing a story\""
  ],
  [
   "S0320L03B03",
   "en-calque",
   [
    "he does not need to buy no other television this year",
    "er muss dieses Jahr keinen anderen Fernseher kaufen"
   ],
   [
    "he does not need to buy another television this year",
    null
   ],
   "English had a double negative (\"does not need to buy no other television\")"
  ],
  [
   "S0324L03U02",
   "mismatch",
   [
    "she has said that she wants to keep it up",
    "sie hat gesagt, dass sie es oben haben will"
   ],
   [
    "she has said that she wants to have it up",
    null
   ],
   "German \"es oben haben will\"; English \"keep it up\" is an idiom (= continue)"
  ],
  [
   "S0333L02B02",
   "de-dropped",
   [
    "cannot spend time with the group",
    "keine Zeit mit der Gruppe verbringen"
   ],
   [
    null,
    "keine Zeit mit der Gruppe verbringen kann"
   ],
   "English \"cannot spend time\"; German had no \"kann\""
  ],
  [
   "S0341L02U02",
   "en-calque",
   [
    "I think she has met someone a few days ago",
    "ich denke, dass sie vor ein paar Tagen jemanden getroffen hat"
   ],
   [
    "I think she met someone a few days ago",
    null
   ],
   "\"has met someone a few days ago\" is not English; German perfect is fine"
  ],
  [
   "S0342L01B02",
   "en-dropped",
   [
    "someone who said something",
    "jemanden getroffen, der etwas gesagt hat"
   ],
   [
    "met someone who said something",
    null
   ],
   "German \"jemanden getroffen, der etwas gesagt hat\" has \"met\""
  ],
  [
   "S0339L01U04",
   "mismatch",
   [
    "I think the group plays quite badly",
    "ich denke, dass die Gruppe ziemlich schlecht spielen kann"
   ],
   [
    "I think the group can play quite badly",
    null
   ],
   "German \"ziemlich schlecht spielen kann\" has \"can\"; English said \"plays\""
  ],
  [
   "S0354L02B02",
   "mismatch",
   [
    "appears angry",
    "wütend wirken"
   ],
   [
    "to appear angry",
    null
   ],
   "German \"wütend wirken\" is the infinitive; English said \"appears angry\""
  ],
  [
   "S0354L02B03",
   "mismatch",
   [
    "does not need to appear angry",
    "nicht wütend wirken musste"
   ],
   [
    "did not need to appear angry",
    null
   ],
   "German \"musste\" is past; English said \"does not need\""
  ],
  [
   "S0358L02U05",
   "en-extra",
   [
    "I think being at the top is quite valuable",
    "ich denke, dass die Spitze ziemlich wertvoll ist"
   ],
   [
    "I think the top is quite valuable",
    null
   ],
   "German \"dass die Spitze ziemlich wertvoll ist\" has no \"being at\""
  ],
  [
   "S0358L03U03",
   "mismatch",
   [
    "I am sure that she could reach the top if she tried",
    "ich bin mir sicher, dass sie die Spitze erreichen könnte, wenn sie es wollte"
   ],
   [
    "I am sure that she could reach the top if she wanted to",
    null
   ],
   "German \"wenn sie es wollte\"; English said \"if she tried\""
  ],
  [
   "S0369L01U04",
   "de-dropped",
   [
    "I think there are several things to see",
    "ich denke, dass es mehrere zu sehen gibt"
   ],
   [
    null,
    "ich denke, dass es mehrere Sachen zu sehen gibt"
   ],
   "English \"several things\"; German had no noun (\"mehrere zu sehen\")"
  ],
  [
   "S0369L01U05",
   "de-dropped",
   [
    "I think there are several things to discuss",
    "ich denke, dass es mehrere zu besprechen gibt"
   ],
   [
    null,
    "ich denke, dass es mehrere Sachen zu besprechen gibt"
   ],
   "English \"several things\"; German had no noun (\"mehrere zu besprechen\")"
  ],
  [
   "S0376L02U02",
   "mismatch",
   [
    "nobody told me that she went anywhere",
    "niemand hat mir gesagt, dass sie nirgendwohin gegangen ist"
   ],
   [
    "nobody told me that she didn't go anywhere",
    null
   ],
   "German \"dass sie nirgendwohin gegangen ist\" (she went nowhere); English said \"she went anywhere\""
  ],
  [
   "S0376L02U06",
   "de-wrong-verb",
   [
    "I thought she had not gone anywhere last month",
    "ich fand, dass sie letzten Monat nirgendwohin gegangen war"
   ],
   [
    null,
    "ich dachte, dass sie letzten Monat nirgendwohin gegangen war"
   ],
   "\"I thought\" (believed) is \"ich dachte\"; \"ich fand, dass\" means \"I was of the opinion / found\""
  ],
  [
   "S0378L03U06",
   "de-wrong-verb",
   [
    "she thought she did not have enough money for holiday",
    "sie fand, dass sie nicht genug Geld für Urlaub hatte"
   ],
   [
    null,
    "sie dachte, dass sie nicht genug Geld für Urlaub hatte"
   ],
   "\"she thought\" (believed) = \"sie dachte\"; \"sie fand\" is an opinion verb"
  ],
  [
   "S0379L03U04",
   "de-wrong-verb",
   [
    "she thought she had enough money to travel to Africa",
    "sie fand, dass sie genug Geld hatte, nach Afrika zu reisen"
   ],
   [
    null,
    "sie dachte, dass sie genug Geld hatte, nach Afrika zu reisen"
   ],
   "\"she thought\" (believed) = \"sie dachte\""
  ],
  [
   "S0382L01U05",
   "de-wrong-verb",
   [
    "I thought I knew where she had gone",
    "ich fand, dass ich wusste, wohin sie gegangen war"
   ],
   [
    null,
    "ich dachte, dass ich wusste, wohin sie gegangen war"
   ],
   "\"I thought\" (believed) = \"ich dachte\""
  ],
  [
   "S0382L02U05",
   "de-wrong-verb",
   [
    "I thought she did not know where to put it",
    "ich fand, dass sie nicht wusste, wo sie es hinstellen wollte"
   ],
   [
    "I thought she did not know where she wanted to put it",
    "ich dachte, dass sie nicht wusste, wo sie es hinstellen wollte"
   ],
   "\"I thought\" (believed) = \"ich dachte\"; English said \"where to put it\", German \"where she wanted to put it\""
  ],
  [
   "S0383L02U05",
   "de-wrong-verb",
   [
    "I thought she did not want to put it in the garden",
    "ich fand, dass sie es nicht in den Garten stellen wollte"
   ],
   [
    null,
    "ich dachte, dass sie es nicht in den Garten stellen wollte"
   ],
   "\"I thought\" (believed) = \"ich dachte\""
  ],
  [
   "S0385L01U04",
   "de-wrong-verb",
   [
    "I thought she had already agreed",
    "ich fand, dass sie schon zugestimmt hatte"
   ],
   [
    null,
    "ich dachte, dass sie schon zugestimmt hatte"
   ],
   "\"I thought\" (believed) = \"ich dachte\""
  ],
  [
   "S0378L03U05",
   "en-dropped",
   [
    "I did not travel last year because I did not have enough money for holiday",
    "ich bin letztes Jahr nirgendwohin gefahren, weil ich nicht genug Geld für Urlaub hatte"
   ],
   [
    "I did not travel anywhere last year because I did not have enough money for holiday",
    null
   ],
   "German \"nirgendwohin gefahren\"; English had no \"anywhere\""
  ],
  [
   "S0379L03U05",
   "en-extra",
   [
    "I think she had the luck to travel somewhere beautiful",
    "ich denke, dass sie das Glück hatte, irgendwohin zu reisen"
   ],
   [
    "I think she had the luck to travel somewhere",
    null
   ],
   "German \"irgendwohin zu reisen\" has no \"beautiful\""
  ],
  [
   "S0387L02U02",
   "en-extra",
   [
    "I thought she was not right about it",
    "ich dachte, dass sie nicht recht hatte"
   ],
   [
    "I thought she was not right",
    null
   ],
   "German \"dass sie nicht recht hatte\" has no \"about it\""
  ],
  [
   "S0388L03B01",
   "de-dropped",
   [
    "you work",
    "arbeitest"
   ],
   [
    null,
    "du arbeitest"
   ],
   "English \"you work\"; German had only \"arbeitest\""
  ],
  [
   "S0390L02U06",
   "en-extra",
   [
    "I knew that she was standing near the entrance",
    "ich wusste, dass sie in der Nähe des Eingangs war"
   ],
   [
    "I knew that she was near the entrance",
    null
   ],
   "German \"dass sie in der Nähe des Eingangs war\" has no \"standing\""
  ],
  [
   "S0400L01U06",
   "mismatch",
   [
    "I think all were going later",
    "ich denke, dass alle später gehen wollten"
   ],
   [
    "I think all wanted to go later",
    null
   ],
   "German \"alle später gehen wollten\"; English said \"all were going later\""
  ],
  [
   "S0400L03B02",
   "mismatch",
   [
    "something to eat",
    "etwas essen"
   ],
   [
    "to eat something",
    null
   ],
   "German \"etwas essen\" is the verb phrase; English \"something to eat\" is a noun phrase (= etwas zu essen)"
  ],
  [
   "S0400L03B03",
   "mismatch",
   [
    "she needed something to eat soon",
    "sie musste bald etwas essen"
   ],
   [
    "she needed to eat something soon",
    null
   ],
   "German \"sie musste bald etwas essen\"; English said \"needed something to eat\""
  ],
  [
   "S0401L04U21",
   "delete",
   [
    "to home",
    "nach Hause"
   ],
   null,
   "\"to home\" is not English; the pair \"home | nach Hause\" is already S0401L04B01"
  ],
  [
   "S0402L02U02",
   "mismatch",
   [
    "I asked if we would go somewhere for food",
    "ich habe gefragt, ob wir irgendwo zum Essen gehen wollten"
   ],
   [
    "I asked if we wanted to go somewhere for food",
    null
   ],
   "German \"ob wir … gehen wollten\"; English said \"if we would go\""
  ],
  [
   "S0406L01U05",
   "en-extra",
   [
    "I think we should be sure about that",
    "ich denke, dass wir uns sicher sein sollten"
   ],
   [
    "I think we should be sure",
    null
   ],
   "German \"dass wir uns sicher sein sollten\" has no \"about that\""
  ],
  [
   "S0406L01U06",
   "en-extra",
   [
    "I knew she was sure about that",
    "ich wusste, dass sie sich sicher war"
   ],
   [
    "I knew she was sure",
    null
   ],
   "German \"dass sie sich sicher war\" has no \"about that\""
  ],
  [
   "S0403L02U02",
   "mismatch",
   [
    "I asked if we could stay as long as possible",
    "ich habe gefragt, ob wir so lange wie möglich bleiben können"
   ],
   [
    "I asked if we can stay as long as possible",
    null
   ],
   "German \"ob wir … bleiben können\" (can); English said \"could\" (könnten not taught by 403)"
  ],
  [
   "S0412L03U01",
   "en-dropped",
   [
    "I think we should not allow",
    "ich denke, dass wir das nicht erlauben sollten"
   ],
   [
    "I think we should not allow that",
    null
   ],
   "German \"dass wir das nicht erlauben sollten\" has \"das\""
  ],
  [
   "S0412L03U02",
   "en-dropped",
   [
    "I thought we had to allow",
    "ich dachte, dass wir das erlauben müssen"
   ],
   [
    "I thought we had to allow that",
    null
   ],
   "German \"dass wir das erlauben müssen\" has \"das\""
  ],
  [
   "S0412L03U03",
   "en-dropped",
   [
    "she told me we should not allow",
    "sie hat mir gesagt, dass wir das nicht erlauben sollten"
   ],
   [
    "she told me we should not allow that",
    null
   ],
   "German \"dass wir das nicht erlauben sollten\" has \"das\""
  ],
  [
   "S0412L03U06",
   "delete",
   [
    "I knew we had to not allow to them",
    "ich wusste, dass wir ihnen das nicht erlauben müssen"
   ],
   null,
   "English \"had to not allow to them\" is not English and the German says \"did not have to allow\"; basket keeps 5 USE"
  ],
  [
   "S0412L05B02",
   "en-calque",
   [
    "allow to them to win",
    "ihnen erlauben zu gewinnen"
   ],
   [
    "allow them to win",
    null
   ],
   "English said \"allow to them to win\""
  ],
  [
   "S0412L05U06",
   "mismatch",
   [
    "I knew we had to not allow them to win",
    "ich wusste, dass wir ihnen nicht erlauben müssen zu gewinnen"
   ],
   [
    "I knew we did not have to allow them to win",
    null
   ],
   "German \"nicht erlauben müssen\" = did not have to allow; English said \"had to not allow\""
  ],
  [
   "S0413L02U05",
   "mismatch",
   [
    "I think all thought we might fall",
    "ich denke, dass wir alle fallen könnten"
   ],
   [
    "I think we all might fall",
    null
   ],
   "German \"ich denke, dass wir alle fallen könnten\"; English said \"I think all thought we might fall\""
  ],
  [
   "S0413L05B04",
   "k45",
   [
    "we could see the edge",
    "wir konnten den Rand sehen"
   ],
   [
    null,
    "wir könnten den Rand sehen"
   ],
   "K45: \"konnte\" never without a past marker; bare \"we could see\" is könnten"
  ],
  [
   "S0414L01U06",
   "mismatch",
   [
    "I think all wanted to go please",
    "ich dachte, dass alle bitte gehen wollten"
   ],
   [
    "I thought all wanted to go please",
    null
   ],
   "German \"ich dachte\"; English said \"I think\""
  ],
  [
   "S0420L03U05",
   "mismatch",
   [
    "I think all wanted him to stay",
    "ich denke, dass alle wollten, dass er bleiben kann"
   ],
   [
    "I think all wanted him to be able to stay",
    null
   ],
   "German \"dass er bleiben kann\"; English had no \"be able to\""
  ],
  [
   "S0421L04U05",
   "mismatch",
   [
    "I think it is important that he is not weak",
    "ich denke, dass es wichtig ist, dass er nicht schwach wird"
   ],
   [
    "I think it is important that he does not get weak",
    null
   ],
   "German \"dass er nicht schwach wird\" (does not get); English said \"is not weak\""
  ],
  [
   "S0423L02U01",
   "en-dropped",
   [
    "I think that is an obvious question",
    "ich denke, dass das so eine offensichtliche Frage ist"
   ],
   [
    "I think that is such an obvious question",
    null
   ],
   "German \"so eine offensichtliche Frage\" has \"so\" (such)"
  ],
  [
   "S0423L02U02",
   "en-dropped",
   [
    "I thought that was an obvious question",
    "ich dachte, dass das so eine offensichtliche Frage war"
   ],
   [
    "I thought that was such an obvious question",
    null
   ],
   "German has \"so\" (such)"
  ],
  [
   "S0423L02U03",
   "en-dropped",
   [
    "she told me it was an obvious question",
    "sie hat mir gesagt, dass das so eine offensichtliche Frage war"
   ],
   [
    "she told me it was such an obvious question",
    null
   ],
   "German has \"so\" (such)"
  ],
  [
   "S0423L02U04",
   "en-dropped",
   [
    "I knew it was an obvious question",
    "ich wusste, dass das so eine offensichtliche Frage war"
   ],
   [
    "I knew it was such an obvious question",
    null
   ],
   "German has \"so\" (such)"
  ],
  [
   "S0424L03U03",
   "mismatch",
   [
    "I thought we had to not waste the time of everyone",
    "ich dachte, dass wir die Zeit von allen nicht verschwenden müssen"
   ],
   [
    null,
    "ich dachte, dass wir die Zeit von allen nicht verschwenden durften"
   ],
   "English \"had to not waste\" (must not); German \"nicht … müssen\" = did not have to. \"durften\" as in S0424L01U02"
  ],
  [
   "S0424L03U06",
   "mismatch",
   [
    "I knew we had to not waste everyone's time",
    "ich wusste, dass wir die Zeit von allen nicht verschwenden müssen"
   ],
   [
    null,
    "ich wusste, dass wir die Zeit von allen nicht verschwenden durften"
   ],
   "same as U03"
  ],
  [
   "S0426L01B02",
   "mismatch",
   [
    "they want to love each other",
    "sie möchten sich lieben"
   ],
   [
    "they would like to love each other",
    null
   ],
   "German \"sie möchten\" (would like); English said \"want\""
  ],
  [
   "S0426L01B03",
   "mismatch",
   [
    "but they want to love each other",
    "aber sie möchten sich lieben"
   ],
   [
    "but they would like to love each other",
    null
   ],
   "German \"sie möchten\"; English said \"want\""
  ],
  [
   "S0435L01U01",
   "en-extra",
   [
    "I think we could do it if we wanted",
    "ich denke, dass wir könnten, wenn wir wollten"
   ],
   [
    "I think we could if we wanted",
    null
   ],
   "German \"dass wir könnten, wenn wir wollten\" has no \"do it\""
  ],
  [
   "S0436L02U05",
   "mismatch",
   [
    "I think it is important to have a minimum number",
    "ich denke, dass eine Mindestzahl wichtig ist"
   ],
   [
    "I think a minimum number is important",
    null
   ],
   "German \"dass eine Mindestzahl wichtig ist\"; English said \"it is important to have a minimum number\""
  ],
  [
   "S0437L01U01",
   "mismatch",
   [
    "I think we could do so much",
    "ich denke, dass wir so viel wie möglich machen könnten"
   ],
   [
    "I think we could do as much as possible",
    null
   ],
   "German \"so viel wie möglich\"; English said \"so much\""
  ],
  [
   "S0437L01U02",
   "mismatch",
   [
    "I thought we had to do so much",
    "ich dachte, dass wir so viel wie möglich machen müssen"
   ],
   [
    "I thought we had to do as much as possible",
    null
   ],
   "German \"so viel wie möglich\"; English said \"so much\""
  ],
  [
   "S0437L01U04",
   "mismatch",
   [
    "I knew we had to do so much",
    "ich wusste, dass wir so viel wie möglich machen müssen"
   ],
   [
    "I knew we had to do as much as possible",
    null
   ],
   "German \"so viel wie möglich\"; English said \"so much\""
  ],
  [
   "S0440L03U05",
   "mismatch",
   [
    "I think it is important to travel while we are still young",
    "ich denke, dass wir reisen wollen, solange wir noch jung sind"
   ],
   [
    "I think we want to travel while we are still young",
    null
   ],
   "German \"dass wir reisen wollen\"; English said \"it is important to travel\""
  ],
  [
   "S0443L01U04",
   "mismatch",
   [
    "I think all wanted to keep doing it",
    "ich dachte, dass alle es weiter machen wollten"
   ],
   [
    "I thought all wanted to keep doing it",
    null
   ],
   "German \"ich dachte\"; English said \"I think\""
  ],
  [
   "S0443L04U05",
   "mismatch",
   [
    "I think it is important to do it the same way",
    "ich denke, dass wir es auf die gleiche Weise machen wollen"
   ],
   [
    "I think we want to do it the same way",
    null
   ],
   "German \"dass wir es auf die gleiche Weise machen wollen\"; English said \"it is important to do it\""
  ],
  [
   "S0445L03U05",
   "mismatch",
   [
    "I think it is important to be able to carry this",
    "ich denke, dass wir diesen Koffer tragen können wollen"
   ],
   [
    "I think we want to be able to carry this suitcase",
    null
   ],
   "German \"dass wir diesen Koffer tragen können wollen\"; English said \"it is important to be able to carry this\""
  ],
  [
   "S0447L01U01",
   "en-extra",
   [
    "I think we should go home after",
    "ich denke, dass wir nach Hause gehen sollten"
   ],
   [
    "I think we should go home",
    null
   ],
   "German \"dass wir nach Hause gehen sollten\" has no \"after\""
  ],
  [
   "S0447L01U02",
   "en-extra",
   [
    "I thought we had to go home after",
    "ich dachte, dass wir nach Hause gehen müssen"
   ],
   [
    "I thought we had to go home",
    null
   ],
   "German has no \"after\""
  ],
  [
   "S0447L01U03",
   "en-extra",
   [
    "she told me we had to go home after",
    "sie hat mir gesagt, dass wir nach Hause gehen müssen"
   ],
   [
    "she told me we had to go home",
    null
   ],
   "German has no \"after\""
  ],
  [
   "S0447L01U04",
   "en-extra",
   [
    "I believe we should go home after",
    "ich glaube, dass wir nach Hause gehen sollten"
   ],
   [
    "I believe we should go home",
    null
   ],
   "German has no \"after\""
  ],
  [
   "S0447L01U05",
   "en-extra",
   [
    "please could we go home after",
    "bitte könnten wir nach Hause gehen"
   ],
   [
    "please could we go home",
    null
   ],
   "German has no \"after\""
  ],
  [
   "S0447L01U06",
   "en-extra",
   [
    "I knew we had to go home after",
    "ich wusste, dass wir nach Hause gehen müssen"
   ],
   [
    "I knew we had to go home",
    null
   ],
   "German has no \"after\""
  ],
  [
   "S0450L02U01",
   "mismatch",
   [
    "I think we must have the train",
    "ich denke, dass wir den Zug brauchen"
   ],
   [
    "I think we need the train",
    null
   ],
   "German \"dass wir den Zug brauchen\"; English said \"must have\""
  ],
  [
   "S0453L01B02",
   "de-dropped",
   [
    "who they saw",
    "wen sie gesehen"
   ],
   [
    null,
    "wen sie gesehen haben"
   ],
   "German stopped at \"gesehen\" (no \"haben\")"
  ],
  [
   "S0453L01B03",
   "de-dropped",
   [
    "they said who they saw",
    "sie haben gesagt, wen sie gesehen"
   ],
   [
    null,
    "sie haben gesagt, wen sie gesehen haben"
   ],
   "German stopped at \"gesehen\""
  ],
  [
   "S0453L03B03",
   "de-dropped",
   [
    "who they saw yesterday evening",
    "wen sie gestern Abend gesehen"
   ],
   [
    null,
    "wen sie gestern Abend gesehen haben"
   ],
   "German stopped at \"gesehen\""
  ],
  [
   "S0454L06B04",
   "delete",
   [
    "our friends came round by",
    "unsere Freunde sind vorbeigekommen"
   ],
   null,
   "\"came round by\" is not English; without \"by\" it is S0454L06B02 exactly"
  ],
  [
   "S0454L06B05",
   "en-calque",
   [
    "nobody came round by yesterday",
    "niemand ist gestern vorbeigekommen"
   ],
   [
    "nobody came round yesterday",
    null
   ],
   "\"came round by\" is not English"
  ],
  [
   "S0454L06U08",
   "en-calque",
   [
    "our friends came round by at about six o'clock yesterday",
    "unsere Freunde sind gestern gegen sechs Uhr vorbeigekommen"
   ],
   [
    "our friends came round at about six o'clock yesterday",
    null
   ],
   "\"came round by\" is not English"
  ],
  [
   "S0454L06U09",
   "en-calque",
   [
    "his sister did not come round by",
    "seine Schwester ist nicht vorbeigekommen"
   ],
   [
    "his sister did not come round",
    null
   ],
   "\"come round by\" is not English"
  ],
  [
   "S0454L06U10",
   "en-calque",
   [
    "has your sister already come round by",
    "ist deine Schwester schon vorbeigekommen"
   ],
   [
    "has your sister already come round",
    null
   ],
   "\"come round by\" is not English"
  ],
  [
   "S0459L01B01",
   "mismatch",
   [
    "before",
    "vor"
   ],
   [
    "in front of",
    null
   ],
   "LEGO is \"in front of | vor\" (place); English said \"before\" (time)"
  ],
  [
   "S0459L01B02",
   "mismatch",
   [
    "not before",
    "nicht vor"
   ],
   [
    "not in front of",
    null
   ],
   "\"vor\" here is place; English said \"before\""
  ],
  [
   "S0459L01B03",
   "mismatch",
   [
    "it was not before",
    "es war nicht vor"
   ],
   [
    "it was not in front of",
    null
   ],
   "\"vor\" here is place; English said \"before\""
  ],
  [
   "S0459L01U01",
   "mismatch",
   [
    "I think it was before us",
    "ich denke, dass es vor uns war"
   ],
   [
    "I think it was in front of us",
    null
   ],
   "\"vor uns\" (place); English said \"before us\""
  ],
  [
   "S0459L01U02",
   "mismatch",
   [
    "I thought it was before us",
    "ich dachte, dass es vor uns war"
   ],
   [
    "I thought it was in front of us",
    null
   ],
   "\"vor uns\" (place)"
  ],
  [
   "S0459L01U03",
   "mismatch",
   [
    "she told me it was not before us",
    "sie hat mir gesagt, dass es nicht vor uns war"
   ],
   [
    "she told me it was not in front of us",
    null
   ],
   "\"vor uns\" (place)"
  ],
  [
   "S0459L01U04",
   "mismatch",
   [
    "I believe it was before us",
    "ich glaube, dass es vor uns war"
   ],
   [
    "I believe it was in front of us",
    null
   ],
   "\"vor uns\" (place)"
  ],
  [
   "S0459L01U05",
   "mismatch",
   [
    "please could it be before us",
    "bitte könnte es vor uns sein"
   ],
   [
    "please could it be in front of us",
    null
   ],
   "\"vor uns\" (place)"
  ],
  [
   "S0459L01U06",
   "mismatch",
   [
    "I knew it was before us",
    "ich wusste, dass es vor uns war"
   ],
   [
    "I knew it was in front of us",
    null
   ],
   "\"vor uns\" (place)"
  ],
  [
   "S0459L02B03",
   "mismatch",
   [
    "not before the blue one",
    "nicht vor dem blauen"
   ],
   [
    "not in front of the blue one",
    null
   ],
   "\"vor dem blauen\" (place, seed 459)"
  ],
  [
   "S0459L02U01",
   "mismatch",
   [
    "I think it was before the blue one",
    "ich denke, dass es vor dem blauen war"
   ],
   [
    "I think it was in front of the blue one",
    null
   ],
   "\"vor dem blauen\" (place)"
  ],
  [
   "S0459L02U02",
   "mismatch",
   [
    "I thought it was not before the blue one",
    "ich dachte, dass es nicht vor dem blauen war"
   ],
   [
    "I thought it was not in front of the blue one",
    null
   ],
   "\"vor dem blauen\" (place)"
  ],
  [
   "S0459L02U03",
   "mismatch",
   [
    "she told me it was not before the blue one",
    "sie hat mir gesagt, dass es nicht vor dem blauen war"
   ],
   [
    "she told me it was not in front of the blue one",
    null
   ],
   "\"vor dem blauen\" (place)"
  ],
  [
   "S0459L02U04",
   "mismatch",
   [
    "I believe it was before the blue one",
    "ich glaube, dass es vor dem blauen war"
   ],
   [
    "I believe it was in front of the blue one",
    null
   ],
   "\"vor dem blauen\" (place)"
  ],
  [
   "S0459L02U05",
   "mismatch",
   [
    "please could it be before the blue one",
    "bitte könnte es vor dem blauen sein"
   ],
   [
    "please could it be in front of the blue one",
    null
   ],
   "\"vor dem blauen\" (place)"
  ],
  [
   "S0459L02U06",
   "mismatch",
   [
    "I knew it was not before the blue one",
    "ich wusste, dass es nicht vor dem blauen war"
   ],
   [
    "I knew it was not in front of the blue one",
    null
   ],
   "\"vor dem blauen\" (place)"
  ],
  [
   "S0459L03B03",
   "mismatch",
   [
    "not before the blue sign",
    "nicht vor dem blauen Schild"
   ],
   [
    "not in front of the blue sign",
    null
   ],
   "\"vor dem blauen Schild\" (place, seed 459 says \"in front of\")"
  ],
  [
   "S0459L03U02",
   "mismatch",
   [
    "I think it was before the blue sign",
    "ich denke, dass es vor dem blauen Schild war"
   ],
   [
    "I think it was in front of the blue sign",
    null
   ],
   "\"vor dem blauen Schild\" (place)"
  ],
  [
   "S0459L03U03",
   "mismatch",
   [
    "I thought it was before the blue sign",
    "ich dachte, dass es vor dem blauen Schild war"
   ],
   [
    "I thought it was in front of the blue sign",
    null
   ],
   "\"vor dem blauen Schild\" (place)"
  ],
  [
   "S0459L03U04",
   "mismatch",
   [
    "she told me it was before the blue sign",
    "sie hat mir gesagt, dass es vor dem blauen Schild war"
   ],
   [
    "she told me it was in front of the blue sign",
    null
   ],
   "\"vor dem blauen Schild\" (place)"
  ],
  [
   "S0459L03U05",
   "mismatch",
   [
    "I think it is important to be before the blue sign",
    "ich denke, dass wir vor dem blauen Schild sein wollen"
   ],
   [
    "I think we want to be in front of the blue sign",
    null
   ],
   "German \"dass wir vor dem blauen Schild sein wollen\"; English said \"it is important to be before\""
  ],
  [
   "S0459L03U06",
   "mismatch",
   [
    "I knew it was before the blue sign",
    "ich wusste, dass es vor dem blauen Schild war"
   ],
   [
    "I knew it was in front of the blue sign",
    null
   ],
   "\"vor dem blauen Schild\" (place)"
  ],
  [
   "S0460L04U05",
   "mismatch",
   [
    "I think it is important to find a shop near the hotel",
    "ich denke, dass wir ein Geschäft in der Nähe des Hotels finden wollen"
   ],
   [
    "I think we want to find a shop near the hotel",
    null
   ],
   "German \"dass wir … finden wollen\"; English said \"it is important to find\""
  ],
  [
   "S0462L04U04",
   "mismatch",
   [
    "I want to understand what happened in Italy during the war",
    "ich will verstehen, was mein Großvater in Italien während des Krieges wollte"
   ],
   [
    "I want to understand what my grandfather wanted in Italy during the war",
    null
   ],
   "German \"was mein Großvater in Italien während des Krieges wollte\"; English said \"what happened in Italy\""
  ],
  [
   "S0483L02U05",
   "en-calque",
   [
    "life is meant to be not easy",
    "das Leben soll nicht einfach sein"
   ],
   [
    "life is not meant to be easy",
    null
   ],
   "English said \"life is meant to be not easy\"; German \"das Leben soll nicht einfach sein\""
  ],
  [
   "S0486L01B01",
   "mismatch",
   [
    "I think",
    "ich finde"
   ],
   [
    "I find",
    null
   ],
   "German \"ich finde\" (the LEGO \"I find\"); English \"I think\" is \"ich denke\" everywhere else (one English, two Germans)"
  ],
  [
   "S0486L01U06",
   "en-extra",
   [
    "I find it really great",
    "ich finde es toll"
   ],
   [
    "I find it great",
    null
   ],
   "German \"ich finde es toll\" has no \"really\""
  ],
  [
   "S0490L01U03",
   "mismatch",
   [
    "then she will come there",
    "dann wird sie dort sein"
   ],
   [
    "then she will be there",
    null
   ],
   "German \"dann wird sie dort sein\"; English said \"she will come there\""
  ],
  [
   "S0490L02U06",
   "en-dropped",
   [
    "then you will never try again",
    "dann wirst du das niemals wieder versuchen"
   ],
   [
    "then you will never try that again",
    null
   ],
   "German \"das niemals wieder versuchen\" has \"das\""
  ],
  [
   "S0492L02U05",
   "mismatch",
   [
    "in your opinion, what should we do?",
    "was müssen wir deiner Meinung nach machen?"
   ],
   [
    "in your opinion, what must we do?",
    null
   ],
   "German \"was müssen wir\"; English said \"should\""
  ],
  [
   "S0492L03U02",
   "mismatch",
   [
    "that is the most interesting place",
    "dieser Ort ist am interessantesten"
   ],
   [
    "this place is the most interesting",
    null
   ],
   "German \"dieser Ort ist am interessantesten\"; English said \"that is the most interesting place\""
  ],
  [
   "S0495L01U03",
   "en-dropped",
   [
    "that is important when it matters",
    "das ist sehr wichtig, wenn es darauf ankommt"
   ],
   [
    "that is very important when it matters",
    null
   ],
   "German \"das ist sehr wichtig\" has \"sehr\""
  ],
  [
   "S0497L01U03",
   "de-lego-form",
   [
    "that sounds like a challenge",
    "das klingt wie eine Herausforderung"
   ],
   [
    null,
    "das klingt nach einer Herausforderung"
   ],
   "\"sounds like\" is taught as \"klingt nach\" (S0272L01); \"klingt wie eine Herausforderung\" gave the same English a second German"
  ],
  [
   "S0497L01U07",
   "de-lego-form",
   [
    "that sounds like what I want",
    "das klingt wie das, was ich will"
   ],
   [
    null,
    "das klingt nach dem, was ich will"
   ],
   "\"sounds like\" is taught as \"klingt nach\" (S0272L01U06 \"nach genau dem, was\")"
  ],
  [
   "S0502L03U01",
   "mismatch",
   [
    "she turned left instead of right",
    "sie ist links statt rechts gegangen"
   ],
   [
    "she went left instead of right",
    null
   ],
   "German \"ist … gegangen\" (went); English said \"turned\" (abgebogen comes one LEGO later)"
  ],
  [
   "S0502L03U06",
   "en-extra",
   [
    "he went left instead of right too",
    "er ist links statt rechts gegangen"
   ],
   [
    "he went left instead of right",
    null
   ],
   "German has no \"too\" (auch)"
  ],
  [
   "S0502L04U07",
   "en-extra",
   [
    "she turned right too",
    "sie ist rechts abgebogen"
   ],
   [
    "she turned right",
    null
   ],
   "German \"sie ist rechts abgebogen\" has no \"too\""
  ],
  [
   "S0506L03U06",
   "en-calque",
   [
    "I have lived here years ago",
    "ich habe hier vor Jahren gewohnt"
   ],
   [
    "I lived here years ago",
    null
   ],
   "\"I have lived here years ago\" is not English; German perfect is fine"
  ],
  [
   "S0510L03U07",
   "en-extra",
   [
    "he wants a good place to park",
    "er will einen Platz zum Parken"
   ],
   [
    "he wants a place to park",
    null
   ],
   "German \"einen Platz zum Parken\" has no \"good\""
  ],
  [
   "S0512L01B02",
   "mismatch",
   [
    "she said it is open",
    "sie sagt, es ist offen"
   ],
   [
    "she says it is open",
    null
   ],
   "German \"sie sagt\" is present; English said \"she said\""
  ],
  [
   "S0512L04B02",
   "mismatch",
   [
    "get the keys",
    "die Schlüssel suchen"
   ],
   [
    "look for the keys",
    null
   ],
   "German \"die Schlüssel suchen\"; English said \"get the keys\""
  ],
  [
   "S0512L04U04",
   "mismatch",
   [
    "I will get the keys",
    "ich werde die Schlüssel haben"
   ],
   [
    "I will have the keys",
    null
   ],
   "German \"ich werde die Schlüssel haben\"; English said \"get\""
  ],
  [
   "S0513L03B03",
   "de-grammar",
   [
    "when I move",
    "wenn ich bewege"
   ],
   [
    null,
    "wenn ich mich bewege"
   ],
   "\"bewegen\" without an object needs \"mich\" (U04 of S0513L05 has it)"
  ],
  [
   "S0513L05B02",
   "de-grammar",
   [
    "I move up and down",
    "ich bewege hoch und runter"
   ],
   [
    null,
    "ich bewege mich hoch und runter"
   ],
   "\"bewegen\" without an object needs \"mich\""
  ],
  [
   "S0513L05U03",
   "de-grammar",
   [
    "it hurts when I move up and down ",
    "es tut weh, wenn ich hoch und runter bewege"
   ],
   [
    "it hurts when I move up and down",
    "es tut weh, wenn ich mich hoch und runter bewege"
   ],
   "\"bewegen\" without an object needs \"mich\" (English trailing space removed)"
  ],
  [
   "S0513L05U05",
   "de-grammar",
   [
    "she wants me to move up and down",
    "sie will, dass ich hoch und runter bewege"
   ],
   [
    null,
    "sie will, dass ich mich hoch und runter bewege"
   ],
   "\"bewegen\" without an object needs \"mich\""
  ],
  [
   "S0513L04B02",
   "delete",
   [
    "here is my head",
    "da ist meinen Kopf"
   ],
   null,
   "\"da ist meinen Kopf\" is wrong case and cannot hold the LEGO \"meinen Kopf\" in the right case; basket keeps B01 + B03"
  ],
  [
   "S0513L04U05",
   "mismatch",
   [
    "she wants my head to move",
    "sie will, dass ich meinen Kopf bewege"
   ],
   [
    "she wants me to move my head",
    null
   ],
   "German \"dass ich meinen Kopf bewege\"; English said \"she wants my head to move\""
  ],
  [
   "S0514L04U06",
   "mismatch",
   [
    "I have found a house",
    "ich habe das perfekte Haus gefunden"
   ],
   [
    "I have found the perfect house",
    null
   ],
   "German \"das perfekte Haus\"; English said \"a house\""
  ],
  [
   "S0515L02U04",
   "en-calque",
   [
    "she tried it at the first day of the year",
    "sie hat es am ersten Tag des Jahres versucht"
   ],
   [
    "she tried it on the first day of the year",
    null
   ],
   "English said \"at the first day\""
  ],
  [
   "S0516L01U07",
   "de-word-order",
   [
    "they both want to do it",
    "sie wollen beide es machen"
   ],
   [
    null,
    "sie wollen es beide machen"
   ],
   "the pronoun \"es\" goes before \"beide\" (\"sie wollen beide es machen\" is not German)"
  ],
  [
   "S0518L05B02",
   "de-grammar",
   [
    "I cannot imagine",
    "ich kann es nicht vorstellen"
   ],
   [
    null,
    "ich kann es mir nicht vorstellen"
   ],
   "\"vorstellen\" (imagine) is reflexive: \"sich etwas vorstellen\""
  ],
  [
   "S0518L05B03",
   "de-grammar",
   [
    "she cannot imagine",
    "sie kann es nicht vorstellen"
   ],
   [
    null,
    "sie kann es sich nicht vorstellen"
   ],
   "reflexive \"sich vorstellen\""
  ],
  [
   "S0518L05U01",
   "delete",
   [
    "I cannot imagine",
    "ich kann nicht vorstellen"
   ],
   null,
   "same English as S0518L05B02 (\"I cannot imagine\"); with the reflexive fixed the two would be one row"
  ],
  [
   "S0518L05U02",
   "delete",
   [
    "she cannot imagine",
    "sie kann nicht vorstellen"
   ],
   null,
   "same English as S0518L05B03 (\"she cannot imagine\")"
  ],
  [
   "S0518L05U03",
   "de-grammar",
   [
    "can you imagine?",
    "kannst du vorstellen?"
   ],
   [
    null,
    "kannst du dir das vorstellen?"
   ],
   "reflexive \"sich vorstellen\""
  ],
  [
   "S0518L05U04",
   "de-grammar",
   [
    "he cannot imagine",
    "er kann nicht vorstellen"
   ],
   [
    null,
    "er kann es sich nicht vorstellen"
   ],
   "reflexive \"sich vorstellen\""
  ],
  [
   "S0518L05U05",
   "de-grammar",
   [
    "I cannot imagine having the same problem",
    "ich kann nicht vorstellen, das gleiche Problem zu haben"
   ],
   [
    null,
    "ich kann mir nicht vorstellen, das gleiche Problem zu haben"
   ],
   "reflexive \"sich vorstellen\""
  ],
  [
   "S0518L05U06",
   "de-grammar",
   [
    "she cannot imagine having the problem",
    "sie kann nicht vorstellen, das Problem zu haben"
   ],
   [
    null,
    "sie kann sich nicht vorstellen, das Problem zu haben"
   ],
   "reflexive \"sich vorstellen\""
  ],
  [
   "S0518L05U07",
   "de-grammar",
   [
    "can she imagine?",
    "kann sie vorstellen?"
   ],
   [
    null,
    "kann sie sich das vorstellen?"
   ],
   "reflexive \"sich vorstellen\""
  ],
  [
   "S0520L03U01",
   "en-extra",
   [
    "it might be possible",
    "es könnte sein"
   ],
   [
    "it might be",
    null
   ],
   "German \"es könnte sein\" has no \"possible\""
  ],
  [
   "S0520L04B03",
   "mismatch",
   [
    "it affected the whole family",
    "der ganzen Familie passiert"
   ],
   [
    "happened to the whole family",
    null
   ],
   "German \"der ganzen Familie passiert\"; English said \"it affected\""
  ],
  [
   "S0522L02B01",
   "mismatch",
   [
    "really stupid",
    "sehr dumm"
   ],
   [
    "very stupid",
    null
   ],
   "German \"sehr dumm\" (very); English said \"really\""
  ],
  [
   "S0522L02U04",
   "mismatch",
   [
    "she also thinks it is stupid",
    "sie sagt, es ist auch dumm"
   ],
   [
    "she says it is stupid too",
    null
   ],
   "German \"sie sagt, es ist auch dumm\"; English said \"she also thinks\""
  ],
  [
   "S0522L02U05",
   "mismatch",
   [
    "that is really stupid",
    "das ist sehr dumm"
   ],
   [
    "that is very stupid",
    null
   ],
   "German \"sehr dumm\"; English said \"really\""
  ],
  [
   "S0522L02U07",
   "mismatch",
   [
    "that was really stupid",
    "das war sehr dumm"
   ],
   [
    "that was very stupid",
    null
   ],
   "German \"sehr dumm\"; English said \"really\""
  ],
  [
   "S0522L04U04",
   "mismatch",
   [
    "she told the truth again",
    "sie hat die Wahrheit auch gesagt"
   ],
   [
    "she told the truth too",
    null
   ],
   "German \"auch\" (too); English said \"again\""
  ],
  [
   "S0523L01U03",
   "en-dropped",
   [
    "instead of staying she went",
    "statt hier zu bleiben ist sie gegangen"
   ],
   [
    "instead of staying here she went",
    null
   ],
   "German \"statt hier zu bleiben\" has \"hier\""
  ],
  [
   "S0524L04U04",
   "mismatch",
   [
    "she did that in several minutes",
    "sie hat das in ein paar Minuten gemacht"
   ],
   [
    "she did that in a few minutes",
    null
   ],
   "German \"in ein paar Minuten\" (a few); English said \"several\""
  ],
  [
   "S0524L04U07",
   "mismatch",
   [
    "can you do it in several minutes?",
    "kannst du das in ein paar Minuten machen?"
   ],
   [
    "can you do it in a few minutes?",
    null
   ],
   "German \"in ein paar Minuten\"; English said \"several\""
  ],
  [
   "S0529L03U07",
   "mismatch",
   [
    "you all are here to try",
    "ihr alle versucht das hier"
   ],
   [
    "you all try that here",
    null
   ],
   "German \"ihr alle versucht das hier\"; English said \"you all are here to try\""
  ],
  [
   "S0531L04U07",
   "mismatch",
   [
    "she thinks it is true",
    "das stimmt für sie"
   ],
   [
    "for her it is true",
    null
   ],
   "German \"das stimmt für sie\"; English said \"she thinks it is true\""
  ],
  [
   "S0533L01U06",
   "mismatch",
   [
    "she told a word",
    "sie hat ein Wort gesagt"
   ],
   [
    "she said a word",
    null
   ],
   "German \"sie hat ein Wort gesagt\"; English said \"told\""
  ],
  [
   "S0533L01U07",
   "mismatch",
   [
    "she will find the word",
    "sie wird das Wort gefunden haben"
   ],
   [
    null,
    "sie wird das Wort finden"
   ],
   "English \"she will find the word\"; German was future perfect (\"wird … gefunden haben\")"
  ],
  [
   "S0533L02U04",
   "mismatch",
   [
    "she will find the word",
    "sie wird jedes Wort finden"
   ],
   [
    "she will find every word",
    null
   ],
   "German \"jedes Wort\"; English said \"the word\" (and \"the word\" now belongs to S0533L01U07)"
  ],
  [
   "S0533L05U03",
   "mismatch",
   [
    "she hears every word you say",
    "sie kann jedes Wort hören, das du sagst"
   ],
   [
    "she can hear every word you say",
    null
   ],
   "German \"sie kann jedes Wort hören\"; English said \"she hears\""
  ],
  [
   "S0534L03U06",
   "mismatch",
   [
    "she told me about the weather",
    "sie hat mir das Wetter gesagt"
   ],
   [
    "she told me the weather",
    null
   ],
   "German \"sie hat mir das Wetter gesagt\" has no \"about\""
  ],
  [
   "S0535L03U04",
   "de-dropped",
   [
    "she found all the wrong things",
    "sie hat alle falschen gefunden"
   ],
   [
    null,
    "sie hat alle falschen Sachen gefunden"
   ],
   "English \"all the wrong things\"; German had no noun (\"alle falschen\")"
  ],
  [
   "S0545L04U05",
   "mismatch",
   [
    "she will put the clean clothes upstairs",
    "sie wird die sauberen Kleider nach oben bringen"
   ],
   [
    "she will bring the clean clothes upstairs",
    null
   ],
   "German \"nach oben bringen\"; English said \"put\""
  ],
  [
   "S0548L02B03",
   "mismatch",
   [
    "she needs one moment",
    "sie will einen Moment"
   ],
   [
    "she wants a moment",
    null
   ],
   "German \"sie will einen Moment\"; English said \"she needs one moment\""
  ],
  [
   "S0548L04U04",
   "delete",
   [
    "I feel angry at the moment",
    "ich fühle mich wütend im Moment"
   ],
   null,
   "same English as S0548L04U06 (\"I feel angry at the moment\") with a different German word order: one English, two Germans"
  ],
  [
   "S0552L01U04",
   "delete",
   [
    "at the other end of the village",
    "am anderen Ende des Dorfes"
   ],
   null,
   "exact duplicate of S0552L01U03"
  ],
  [
   "S0556L01U06",
   "en-calque",
   [
    "they play music always",
    "sie spielen immer Musik"
   ],
   [
    "they always play music",
    null
   ],
   "\"they play music always\" is not natural English"
  ],
  [
   "S0556L01U07",
   "de-word-order",
   [
    "they play music at night",
    "sie spielen in der Nacht Musik"
   ],
   [
    null,
    "sie spielen Musik in der Nacht"
   ],
   "the same English is \"sie spielen Musik in der Nacht\" in S0556L02U01 and S0556L03U07: one English, two word orders"
  ],
  [
   "S0556L02U02",
   "de-dropped",
   [
    "she went out at night",
    "sie ist in der Nacht gegangen"
   ],
   [
    null,
    "sie ist in der Nacht ausgegangen"
   ],
   "English \"went out\"; German \"gegangen\" (went/left). \"ausgegangen\" is taught (S0215)"
  ],
  [
   "S0558L01U06",
   "de-dropped",
   [
    "she went out at night",
    "sie ist in der Nacht gegangen"
   ],
   [
    null,
    "sie ist in der Nacht ausgegangen"
   ],
   "English \"went out\"; German \"gegangen\""
  ],
  [
   "S0558L01U05",
   "mismatch",
   [
    "she is out at night",
    "sie ist in der Nacht da"
   ],
   [
    "she is there at night",
    null
   ],
   "German \"sie ist in der Nacht da\"; English said \"she is out\""
  ],
  [
   "S0563L01U05",
   "mismatch",
   [
    "she can do it a bit longer",
    "sie kann das noch länger machen"
   ],
   [
    null,
    "sie kann das ein bisschen länger machen"
   ],
   "English \"a bit longer\"; German said \"noch länger\" (even longer). \"ein bisschen länger\" is taught (S0276)"
  ],
  [
   "S0566L03U05",
   "mismatch",
   [
    "she made her choice without help",
    "sie hat eine Wahl ohne Hilfe gemacht"
   ],
   [
    "she made a choice without help",
    null
   ],
   "German \"eine Wahl\" (a choice); English said \"her choice\""
  ],
  [
   "S0567L05U01",
   "delete",
   [
    "she was with the children while playing",
    "sie war bei den Kindern beim Spielen"
   ],
   null,
   "same English as S0567L05B03 (\"she was with the children while playing\") with a different German (\"bei\" vs \"mit den Kindern\"): one English, two Germans"
  ],
  [
   "S0568L04U01",
   "mismatch",
   [
    "she wants us to meet",
    "sie will uns treffen"
   ],
   [
    "she wants to meet us",
    null
   ],
   "German \"sie will uns treffen\" = she wants to meet us; English said \"she wants us to meet\""
  ],
  [
   "S0568L04B03",
   "mismatch",
   [
    "he wants us to meet",
    "er will uns treffen"
   ],
   [
    "he wants to meet us",
    null
   ],
   "German \"er will uns treffen\"; English said \"he wants us to meet\""
  ],
  [
   "S0568L04U03",
   "mismatch",
   [
    "she said she wants us to meet",
    "sie hat gesagt, sie will uns treffen"
   ],
   [
    "she said she wants to meet us",
    null
   ],
   "German \"sie will uns treffen\""
  ],
  [
   "S0568L04U07",
   "mismatch",
   [
    "she wants us to meet here",
    "sie will uns hier treffen"
   ],
   [
    "she wants to meet us here",
    null
   ],
   "German \"sie will uns hier treffen\""
  ],
  [
   "S0568L04U02",
   "delete",
   [
    "I want us to meet",
    "ich will uns treffen"
   ],
   null,
   "\"I want us to meet | ich will uns treffen\": the German says \"I want to meet us\" — no sense in either reading"
  ],
  [
   "S0568L04U05",
   "delete",
   [
    "I expect us to meet",
    "ich erwarte, uns zu treffen"
   ],
   null,
   "\"I expect us to meet | ich erwarte, uns zu treffen\": the German says \"I expect to meet us\""
  ],
  [
   "S0573L02U05",
   "mismatch",
   [
    "she will not talk of that",
    "sie will nicht von dem reden"
   ],
   [
    "she does not want to talk of that",
    null
   ],
   "German \"sie will nicht\" (want); English said \"will not\""
  ],
  [
   "S0578L02U03",
   "en-dropped",
   [
    "she wants somewhere warmer",
    "sie will irgendwo wärmer sein"
   ],
   [
    "she wants to be somewhere warmer",
    null
   ],
   "German \"sie will irgendwo wärmer sein\" has \"sein\""
  ],
  [
   "S0579L01U06",
   "mismatch",
   [
    "she often wants to try again",
    "sie will das oft versuchen"
   ],
   [
    "she often wants to try that",
    null
   ],
   "German \"sie will das oft versuchen\" has \"das\" and no \"again\""
  ],
  [
   "S0582L01U05",
   "en-dropped",
   [
    "she wants to know what it was like",
    "sie möchte wissen, wie es war, hier aufzuwachsen"
   ],
   [
    "she wants to know what it was like to grow up here",
    null
   ],
   "German \"wie es war, hier aufzuwachsen\" has \"to grow up here\""
  ],
  [
   "S0584L01U04",
   "de-grammar",
   [
    "every morning is special",
    "jeden Morgen ist besonders"
   ],
   [
    null,
    "jeder Morgen ist besonders"
   ],
   "subject is nominative: \"jeder Morgen\", not \"jeden Morgen\""
  ],
  [
   "S0587L04B02",
   "mismatch",
   [
    "we had something there",
    "wir hatten das dort"
   ],
   [
    "we had that there",
    null
   ],
   "German \"wir hatten das dort\"; English said \"something\""
  ],
  [
   "S0589L03U01",
   "de-dropped",
   [
    "she has just seen it",
    "sie hat gerade gesehen"
   ],
   [
    null,
    "sie hat es gerade gesehen"
   ],
   "English \"seen it\"; German had no \"es\""
  ],
  [
   "S0589L03U05",
   "de-dropped",
   [
    "she just found it",
    "sie hat gerade gefunden"
   ],
   [
    null,
    "sie hat es gerade gefunden"
   ],
   "English \"found it\"; German had no \"es\""
  ],
  [
   "S0589L03B03",
   "de-dropped",
   [
    "he has just said it",
    "er hat gerade gesagt"
   ],
   [
    null,
    "er hat es gerade gesagt"
   ],
   "English \"said it\"; German had no \"es\""
  ],
  [
   "S0594L01B03",
   "mismatch",
   [
    "he likes my toys",
    "er möchte meine Spielzeuge"
   ],
   [
    "he would like my toys",
    null
   ],
   "German \"er möchte\" (would like); English said \"likes\""
  ],
  [
   "S0594L01U01",
   "mismatch",
   [
    "she likes my toys",
    "sie möchte meine Spielzeuge"
   ],
   [
    "she would like my toys",
    null
   ],
   "German \"sie möchte\"; English said \"likes\""
  ],
  [
   "S0594L01U04",
   "mismatch",
   [
    "she said she likes my toys",
    "sie hat gesagt, sie möchte meine Spielzeuge"
   ],
   [
    "she said she would like my toys",
    null
   ],
   "German \"sie möchte\"; English said \"likes\""
  ],
  [
   "S0595L03B02",
   "de-grammar",
   [
    "she also wants to lie down",
    "sie will auch hinlegen"
   ],
   [
    null,
    "sie will sich auch hinlegen"
   ],
   "\"hinlegen\" (lie down) is reflexive, as everywhere else in the basket"
  ],
  [
   "S0596L02U07",
   "delete",
   [
    "she stayed there for a while",
    "sie war eine Weile dort"
   ],
   null,
   "English \"she stayed there for a while\" but German \"sie war eine Weile dort\" = S0596L02U02's meaning; fixing the English would give one English two Germans"
  ],
  [
   "S0600L01U02",
   "mismatch",
   [
    "she had driven before",
    "sie ist früher gefahren"
   ],
   [
    "she drove before",
    null
   ],
   "German \"sie ist früher gefahren\" (perfect = drove); English said \"had driven before\""
  ],
  [
   "S0603L03U05",
   "mismatch",
   [
    "she was tired and found nothing",
    "sie war müde und hat es nirgendwo gefunden"
   ],
   [
    "she was tired and didn't find it anywhere",
    null
   ],
   "German \"hat es nirgendwo gefunden\"; English said \"found nothing\""
  ],
  [
   "S0606L01U06",
   "mismatch",
   [
    "she had more back then",
    "wir hatten damals mehr"
   ],
   [
    "we had more back then",
    null
   ],
   "German \"wir hatten\"; English said \"she had\""
  ],
  [
   "S0606L02B02",
   "mismatch",
   [
    "I had known that",
    "ich hätte das gewusst"
   ],
   [
    "I would have known that",
    null
   ],
   "German \"ich hätte das gewusst\" (would have); English said \"I had known\""
  ],
  [
   "S0627L01U05",
   "de-grammar",
   [
    "she found your coffee",
    "sie hat dein Kaffee gefunden"
   ],
   [
    "she found your house",
    "sie hat dein Haus gefunden"
   ],
   "\"sie hat dein Kaffee gefunden\" is the wrong case (deinen Kaffee), and \"deinen\" would not hold the LEGO \"dein\"; \"your house | dein Haus\" (U02) keeps both"
  ],
  [
   "S0644L01U02",
   "mismatch",
   [
    "could she do it?",
    "könnten sie das machen?"
   ],
   [
    "could they do it?",
    null
   ],
   "German \"könnten sie\" is plural (they); English said \"she\""
  ],
  [
   "S0644L01U07",
   "mismatch",
   [
    "could she also do it?",
    "könnten sie das auch machen?"
   ],
   [
    "could they also do it?",
    null
   ],
   "German \"könnten sie\" is plural (they); English said \"she\""
  ],
  [
   "S0654L01B03",
   "en-calque",
   [
    "I also told me that",
    "ich habe mir auch das gesagt"
   ],
   [
    "I also told myself that",
    null
   ],
   "German \"ich habe mir auch das gesagt\" (told myself); English said \"told me\""
  ]
 ],
 "LEGO_SEED": [
  [
   "seed 322",
   "mismatch",
   [
    "she said that she needs to read the same book",
    "Sie hat gesagt, dass sie das gleiche Buch lesen muss"
   ],
   [
    null,
    "Sie hat gesagt, dass sie dasselbe Buch lesen muss"
   ],
   "Seed German \"das gleiche Buch\" disagreed with its own LEGO S0322L02 \"the same book | dasselbe Buch\" and its own P26 row S0322L02U01 (same English, \"dasselbe\"): one English, two Germans"
  ],
  [
   "seed 347",
   "mismatch",
   [
    "he wanted to know what was happening a week ago",
    "er wollte wissen, was vor einer Woche passiert ist"
   ],
   [
    "he wanted to know what happened a week ago",
    null
   ],
   "Seed German \"was vor einer Woche passiert ist\" (= what happened), its LEGO S0347L03 \"what happened\"; English said \"what was happening\""
  ],
  [
   "seed 408",
   "mismatch",
   [
    "yes that's the best way to make a happy family",
    "ja, das ist der beste Weg, eine glückliche Familie zu haben"
   ],
   [
    "yes that's the best way to have a happy family",
    null
   ],
   "Seed German \"eine glückliche Familie zu haben\" (have); English said \"make\""
  ],
  [
   "S0454L06",
   "en-calque",
   [
    "came round by",
    "vorbeigekommen"
   ],
   [
    "came round",
    null
   ],
   "LEGO English \"came round by\" is not English; German \"vorbeigekommen\""
  ],
  [
   "S0475L04",
   "en-calque",
   [
    "to consider about",
    "nachzudenken"
   ],
   [
    "to consider",
    null
   ],
   "LEGO English \"to consider about\" is not English; \"about\" is the \"über\" of the phrase, not of the LEGO"
  ],
  [
   "seed 510",
   "en-extra",
   [
    "she's gone to look for somewhere safe to park the car",
    "Sie ist gegangen, um einen sicheren Platz zum Parken zu suchen"
   ],
   [
    "she's gone to look for somewhere safe to park",
    null
   ],
   "Seed German \"einen sicheren Platz zum Parken\" has no \"the car\""
  ],
  [
   "seed 541",
   "en-extra",
   [
    "it's a good idea to try and breathe slowly",
    "es ist eine gute Idee, langsam zu atmen"
   ],
   [
    "it's a good idea to breathe slowly",
    null
   ],
   "Seed German \"langsam zu atmen\" has no \"try\""
  ],
  [
   "S0545L05",
   "en-calque",
   [
    "turn up",
    "dran"
   ],
   [
    "turn",
    null
   ],
   "LEGO English \"turn up\" (= arrive) is wrong for \"dran\" (it's your turn); B01 already reads \"turn | dran\""
  ],
  [
   "S0569L02",
   "en-calque",
   [
    "much lot",
    "viel"
   ],
   [
    "much",
    null
   ],
   "LEGO English \"much lot\" is two glosses glued together"
  ],
  [
   "S0592L02",
   "en-calque",
   [
    "main road street",
    "Hauptstraße"
   ],
   [
    "main road",
    null
   ],
   "LEGO English \"main road street\" is two glosses glued together"
  ],
  [
   "S0606L01",
   "en-calque",
   [
    "back then that time",
    "damals"
   ],
   [
    "back then",
    null
   ],
   "LEGO English \"back then that time\" is two glosses glued together"
  ]
 ],
 "HOLDS": [
  {
   "seed": 202,
   "id": "S0202L01U08",
   "pattern": "naturalness",
   "english": "Nobody heard the latest story but I will tell it",
   "german": "Niemand hat die neueste Geschichte gehört aber ich werde sie sagen",
   "suggestion": "Niemand hat die neueste Geschichte gehört, aber ich werde sie erzählen",
   "question": "Is \"eine Geschichte sagen\" OK, or must it be \"erzählen\"?"
  },
  {
   "seed": 203,
   "id": "S0203L01U01",
   "pattern": "naturalness",
   "english": "What would you do if there were more time?",
   "german": "Was würdest du machen, wenn mehr Zeit wäre",
   "suggestion": "Was würdest du machen, wenn es mehr Zeit gäbe?",
   "question": "Is \"wenn mehr Zeit wäre\" natural, or \"wenn es mehr Zeit gäbe\"?"
  },
  {
   "seed": 203,
   "id": "S0203L01U09",
   "pattern": "naturalness",
   "english": "What would you do if there was a problem like this?",
   "german": "Was würdest du machen, wenn es ein Problem wie dieses wäre",
   "suggestion": "Was würdest du machen, wenn es so ein Problem gäbe?",
   "question": "\"wenn es ein Problem wie dieses wäre\" reads \"if it were a problem like this\" — is \"wenn es so ein Problem gäbe\" better?"
  },
  {
   "seed": 203,
   "id": "S0203L02B01",
   "pattern": "which-side",
   "english": "If I asked you",
   "german": "Wenn ich dich bitte",
   "suggestion": "A: German \"wenn ich dich bitten würde\" / B: English \"if I ask you\"",
   "question": "LEGO \"if I asked you | wenn ich dich bitte\" pairs an English past (hypothetical) with a German present. Seed 203 too. Which side should change?"
  },
  {
   "seed": 203,
   "id": "S0203L02B03",
   "pattern": "naturalness",
   "english": "I'm not sure if it works if I asked you to help me",
   "german": "ich bin mir nicht sicher, ob es funktioniert, wenn ich dich bitte mir zu helfen",
   "suggestion": "Ich bin mir nicht sicher, ob es funktioniert, wenn ich dich bitte, mir zu helfen / I'm not sure it works if I ask you to help me",
   "question": "English mixes tenses (\"if it works if I asked you\"); follows the 203 ruling above"
  },
  {
   "seed": 205,
   "id": "S0205L02U03",
   "pattern": "mismatch",
   "english": "She said that the word I was looking for was very easy",
   "german": "Sie hat gesagt dass das Wort das ich suchen wollte sehr leicht war",
   "suggestion": "Sie hat gesagt, dass das Wort, das ich gesucht habe, sehr leicht war",
   "question": "English \"the word I was looking for\", German \"das ich suchen wollte\" (wanted to look for). Use \"gesucht habe\"?"
  },
  {
   "seed": 205,
   "id": "S0205L02U09",
   "pattern": "tense",
   "english": "She said the word I needed was in the book on the table",
   "german": "Sie hat gesagt das Wort das ich brauche war im Buch auf dem Tisch",
   "suggestion": "Sie hat gesagt, das Wort, das ich brauchte, war im Buch auf dem Tisch",
   "question": "English \"I needed\", German \"brauche\" (present). brauchte is not yet taught by 205 — OK to use, or change the English to \"I need\"?"
  },
  {
   "seed": 205,
   "id": "S0205L02U12",
   "pattern": "naturalness",
   "english": "I was trying to say the word but I was too nervous to speak",
   "german": "Ich habe versucht das Wort zu sagen aber ich war zu nervös zu sprechen",
   "suggestion": "Ich war zu nervös, um zu sprechen",
   "question": "Is \"zu nervös zu sprechen\" OK, or does it need \"um zu\"?"
  },
  {
   "seed": 205,
   "id": "S0205L03B01",
   "pattern": "lego-gloss",
   "english": "I was trying to say",
   "german": "Das ich sagen wollte",
   "suggestion": "that I was trying to say | das ich sagen wollte",
   "question": "LEGO \"I was trying to say | das ich sagen wollte\": German carries the relative \"das\" (K48) and says \"wanted to\", English has neither. Grow the English to \"that I was trying to say\"? (Kai's call)"
  },
  {
   "seed": 206,
   "id": "S0206L01U08",
   "pattern": "word-order",
   "english": "The chance to practise speaking with other people is very helpful",
   "german": "Die Gelegenheit sprechen zu üben mit anderen Leuten ist sehr hilfreich",
   "suggestion": "Die Gelegenheit, mit anderen Leuten sprechen zu üben, ist sehr hilfreich",
   "question": "\"sprechen zu üben mit anderen Leuten\" — should \"mit anderen Leuten\" move before \"sprechen zu üben\"?"
  },
  {
   "seed": 209,
   "id": "S0209L01B02",
   "pattern": "word-order",
   "english": "To spend time with you",
   "german": "Zeit verbringen mit dir",
   "suggestion": "Mit dir Zeit verbringen",
   "question": "\"Zeit verbringen mit dir\" — natural, or \"mit dir Zeit verbringen\"?"
  },
  {
   "seed": 209,
   "id": "S0209L01U08",
   "pattern": "mismatch",
   "english": "We were hoping to spend time here for another week",
   "german": "Wir hofften, hier für eine andere Woche Zeit verbringen zu können",
   "suggestion": "Wir hofften, noch eine Woche hier Zeit verbringen zu können",
   "question": "\"für eine andere Woche\" reads \"for a different week\"; English says \"another week\". Use \"noch eine Woche\"?"
  },
  {
   "seed": 210,
   "id": "S0210L01U11",
   "pattern": "naturalness",
   "english": "They think that it is very important to ask questions when you do not understand",
   "german": "Sie denken, dass es sehr wichtig ist, Fragen zu fragen, wenn du nicht verstehst",
   "suggestion": "…, Fragen zu stellen, wenn du nicht verstehst",
   "question": "\"Fragen zu fragen\" — should it be \"Fragen zu stellen\" (stellen not taught by 210)?"
  },
  {
   "seed": 210,
   "id": "S0210L03B06",
   "pattern": "naturalness",
   "english": "They know about the problem",
   "german": "Sie wissen über das Problem",
   "suggestion": "Sie wissen von dem Problem",
   "question": "\"Sie wissen über das Problem\" — natural, or \"von dem Problem\"?"
  },
  {
   "seed": 211,
   "id": "seed 211",
   "pattern": "lego-structure",
   "english": "they told us that they didn't want to explain",
   "german": "Sie haben uns gesagt, dass sie nicht erklären wollten",
   "suggestion": "(no German change)",
   "question": "Seed 211 \"they told us that they didn't want to explain\" has ONE LEGO, \"test | Test\", which is not in the sentence. The seed's words are taught by no LEGO of its own. (Kai's call: re-cut seed 211.)"
  },
  {
   "seed": 214,
   "id": "seed 214",
   "pattern": "naturalness",
   "english": "did you have a good time at the weekend?",
   "german": "hattest du am Wochenende eine gute Zeit?",
   "suggestion": "Hattest du ein schönes Wochenende? / Hattest du am Wochenende Spaß?",
   "question": "\"eine gute Zeit haben\" is a calque of \"have a good time\". Natural German? (LEGO S0214L01 and its basket follow.)"
  },
  {
   "seed": 214,
   "id": "S0214L02U06",
   "pattern": "word-order",
   "english": "I hope I will have time to relax at the weekend after the work is finished",
   "german": "Ich hoffe ich werde Zeit haben am Wochenende mich zu entspannen nachdem die Arbeit fertig ist",
   "suggestion": "Ich hoffe, ich werde am Wochenende Zeit haben, mich zu entspannen, …",
   "question": "\"Zeit haben am Wochenende mich zu entspannen\" — move \"am Wochenende\" before \"Zeit haben\"?"
  },
  {
   "seed": 216,
   "id": "S0216L01B01",
   "pattern": "lego-gloss",
   "english": "I have seen",
   "german": "Ich habe gesehen",
   "suggestion": "I saw | ich habe gesehen",
   "question": "LEGO \"I have seen | ich habe gesehen\" forces English like \"I have seen something new yesterday\" (U01) and \"I have seen a few friends last week\" (U02), and seed 216 says \"I saw\". Re-gloss the LEGO English to \"I saw\"? (Kai's call)"
  },
  {
   "seed": 222,
   "id": "S0222L01U03",
   "pattern": "naturalness",
   "english": "I think he is trying to tell me what he wants me to do with the problem",
   "german": "Ich denke er versucht mir zu sagen, was er will dass ich mit dem Problem mache",
   "suggestion": "Ich denke, er versucht mir zu sagen, was ich mit dem Problem machen soll",
   "question": "\"was er will, dass ich mit dem Problem mache\" — natural German for \"what he wants me to do\"? (U11 is the same shape)"
  },
  {
   "seed": 224,
   "id": "S0224L01U01",
   "pattern": "just-yesterday",
   "english": "I just watched the film yesterday evening at home with my friends",
   "german": "Ich habe gerade gestern Abend zu Hause den Film mit meinen Freunden geschaut",
   "suggestion": "I watched the film yesterday evening… / Ich habe gestern Abend… den Film geschaut (drop just/gerade)",
   "question": "\"just\" + \"yesterday\" in one sentence (\"I just watched the film yesterday evening | Ich habe gerade gestern Abend…\") reads oddly in both languages. Drop just/gerade, or keep? (U06 the same; U06 German also lacks \"gegangen\": \"bevor ich nach Hause bin\")"
  },
  {
   "seed": 227,
   "id": "S0227L02U11",
   "pattern": "naturalness",
   "english": "My friend said that he is going to tell me everything I need to know about this",
   "german": "Mein Freund hat gesagt dass er mir alles sagen wird was ich über das wissen muss",
   "suggestion": "…, was ich darüber wissen muss",
   "question": "\"was ich über das wissen muss\" — should it be \"darüber\"?"
  },
  {
   "seed": 227,
   "id": "S0227L01U06",
   "pattern": "vorhin",
   "english": "That man told me yesterday that he wants to learn German better than before",
   "german": "Dieser Mann hat mir gestern gesagt dass er Deutsch besser lernen möchte als vorhin",
   "suggestion": "…, dass er Deutsch besser lernen möchte als vorher",
   "question": "\"better than before | besser als vorhin\" (also S0229L01U06, S0204L01U04): vorhin means \"a little while ago\". Use \"vorher\" / \"früher\"?"
  },
  {
   "seed": 234,
   "id": "S0234L01U01",
   "pattern": "naturalness",
   "english": "I met someone last night who works with your brother and he was very helpful to me",
   "german": "Ich habe gestern Abend jemanden getroffen, der mit deinem Bruder arbeitet und er war sehr hilfreich zu mir",
   "suggestion": "… und er war sehr hilfreich für mich",
   "question": "\"er war sehr hilfreich zu mir\" — \"zu mir\" or \"für mich\"?"
  },
  {
   "seed": 237,
   "id": "S0237L01U04",
   "pattern": "his-der",
   "english": "He wanted me to speak German with his mother when she comes here next week",
   "german": "Er wollte, dass ich mit der Mutter Deutsch spreche, wenn sie nächste Woche hier ist",
   "suggestion": "A: English \"the mother / the brother / the sister\" / B: German \"seiner Mutter / seinem Bruder / seiner Schwester\" (sein- not taught by 238)",
   "question": "English \"his mother/brother/sister\", German \"der Mutter / dem Bruder / der Schwester\" (S0237L01U04, U08, S0238L01U04, U06). The learner is taught \"his\" = der. Which side?"
  },
  {
   "seed": 242,
   "id": "S0242L02U03",
   "pattern": "word-order",
   "english": "We have more time now because the meeting finished early",
   "german": "Wir haben mehr Zeit jetzt weil das Treffen früh fertig war",
   "suggestion": "Wir haben jetzt mehr Zeit … / Ich hatte gestern mehr Zeit, das Buch zu lesen / Wir werden nächste Woche mehr Zeit haben, … / Ich hoffe, ich habe bald mehr Zeit, meine Freunde zu sehen",
   "question": "Basket \"more time | mehr Zeit\": the time word sits after \"mehr Zeit\" (U03 \"mehr Zeit jetzt\", U05 \"mehr Zeit gestern\", U08 \"mehr Zeit nächste Woche haben\", U10 \"mehr Zeit meine Freunde bald\"). Move it before, as suggested?"
  },
  {
   "seed": 245,
   "id": "S0245L01B01",
   "pattern": "lego-gloss",
   "english": "I am happy",
   "german": "Ich bin zufrieden",
   "suggestion": "A: English LEGO \"satisfied\" / B: keep \"happy\", basket rows say \"happy with …\"",
   "question": "LEGO \"happy | zufrieden\": the seed means \"happy WITH\", but the basket drills bare \"She is very happy | Sie ist sehr zufrieden\", while \"happy\" elsewhere is glücklich (S0118). (Kai's call)"
  },
  {
   "seed": 245,
   "id": "S0245L02B03",
   "pattern": "naturalness",
   "english": "She was surprised with how much time she had",
   "german": "Sie war überrascht damit, wie viel Zeit sie hatte",
   "suggestion": "Sie war überrascht, wie viel Zeit sie hatte",
   "question": "\"überrascht damit, wie viel\" (B03, U02, U11) — is \"damit\" right after überrascht, or \"davon\"/nothing?"
  },
  {
   "seed": 246,
   "id": "S0246L01B02",
   "pattern": "word-order",
   "english": "I wanted her to help you but she was too busy yesterday",
   "german": "Ich wollte, dass sie dir hilft, aber sie war zu beschäftigt gestern",
   "suggestion": "… aber sie war gestern zu beschäftigt",
   "question": "\"sie war zu beschäftigt gestern / heute Morgen / letzte Woche / zu der Zeit\" (B02, B04, B05, B06): move the time word before \"zu beschäftigt\"?"
  },
  {
   "seed": 246,
   "id": "S0246L01U08",
   "pattern": "naturalness",
   "english": "I wanted her to help you but she was too busy answering the questions that people were asking her",
   "german": "Ich wollte, dass sie dir hilft, aber sie war zu beschäftigt damit, die Fragen zu beantworten, die Leute ihr fragen wollten",
   "suggestion": "…, die Fragen zu beantworten, die die Leute ihr gestellt haben",
   "question": "\"die Fragen …, die Leute ihr fragen wollten\" says \"wanted to ask her\" and \"Fragen fragen\". Rewrite as suggested? (stellen not yet taught)"
  },
  {
   "seed": 246,
   "id": "S0246L01U10",
   "pattern": "de-dropped",
   "english": "I wanted her to help you but she was too busy making sure that everything was ready for the test",
   "german": "Ich wollte, dass sie dir hilft, aber sie war zu beschäftigt damit, dass alles für den Test bereit war",
   "suggestion": "… zu beschäftigt damit, sicherzustellen, dass alles für den Test bereit war",
   "question": "English \"making sure that everything was ready\", German has no verb for \"making sure\" (\"damit, dass alles … bereit war\"). Add \"sicherzustellen\" (taught S0202)?"
  },
  {
   "seed": 248,
   "id": "S0248L01U09",
   "pattern": "naturalness",
   "english": "He told me that he really wanted to see the film yesterday",
   "german": "Er hat mir gesagt, dass er den Film gestern sehr sehen wollte",
   "suggestion": "Er hat mir gesagt, dass er den Film gestern unbedingt sehen wollte",
   "question": "\"really wanted to see | sehr sehen wollte\" — is \"sehr\" wrong here?"
  },
  {
   "seed": 248,
   "id": "S0248L01U03",
   "pattern": "naturalness",
   "english": "I was thinking if you had time to see the film with me this evening",
   "german": "Ich dachte, ob du Zeit hast, den Film mit mir heute Abend zu sehen",
   "suggestion": "Ich habe überlegt, ob du heute Abend Zeit hast, den Film mit mir zu sehen",
   "question": "\"I was thinking if you had time | Ich dachte, ob du Zeit hast\" — both sides read oddly. Rewrite?"
  },
  {
   "seed": 249,
   "id": "S0249L01B02",
   "pattern": "naturalness",
   "english": "I need you to help me",
   "german": "Ich brauche dass du mir hilfst",
   "suggestion": "Ich brauche dich, um mir zu helfen / Ich brauche deine Hilfe",
   "question": "\"I need you to help me | Ich brauche dass du mir hilfst\" — natural German?"
  },
  {
   "seed": 251,
   "id": "S0251L01U08",
   "pattern": "naturalness",
   "english": "Before you tell me anything more I want you to understand that I do not want to find out about this",
   "german": "Bevor du mir mehr sagst will ich dass du verstehst dass ich es nicht darüber herausfinden will",
   "suggestion": "… dass ich nichts darüber herausfinden will",
   "question": "\"dass ich es nicht darüber herausfinden will\" — \"es\" and \"darüber\" together. Which German?"
  },
  {
   "seed": 255,
   "id": "S0255L01B04",
   "pattern": "naturalness",
   "english": "When do you think you will be ready to leave here?",
   "german": "Wann denkst du, wirst du bereit sein, hier zu gehen?",
   "suggestion": "Wann denkst du, wirst du bereit sein, von hier wegzugehen?",
   "question": "\"bereit sein, hier zu gehen\" for \"ready to leave here\" — natural?"
  },
  {
   "seed": 255,
   "id": "S0255L01U05",
   "pattern": "which-side",
   "english": "I have been here for a long time because I wanted to ask you when do you think you will be ready to go home today",
   "german": "Ich bin schon lange hier, weil ich dich fragen wollte, wann du bereit sein wirst, heute nach Hause zu gehen",
   "suggestion": "English \"… ask you when you will be ready to go home today\" (U05/U06), German keeps no \"denkst du\"",
   "question": "English embeds \"when do you think you will be ready\" (U02, U05, U06); U05/U06 German drop \"denkst du\" (\"wann du bereit sein wirst\"). Fix the English to drop \"do you think\", or the German to add \"wann du denkst, dass du …\" as U02 does? (LEGO containment is Kai's call)"
  },
  {
   "seed": 257,
   "id": "S0257L02U04",
   "pattern": "naturalness",
   "english": "The best thing would be to wait until tomorrow before we try to understand what happened",
   "german": "Das beste Ding wäre bis morgen zu warten bevor wir versuchen zu verstehen was passiert ist",
   "suggestion": "Das Beste wäre … / Das Einzige, was ich gestern machen wollte, … / Ich muss dir von dem Ding erzählen, über das wir … geredet haben",
   "question": "Basket \"thing | Ding\": \"Das beste Ding wäre\" (U04), \"Das einzige Ding das\" (U07), \"Es war ein neues Ding das ich dich fragen wollte\" (U02), \"dir über das Ding sagen worüber\" (U03), \"ein neues Ding zu sagen\" (U06) — calques of English \"thing\"? Rewrite which?"
  },
  {
   "seed": 259,
   "id": "S0259L01B04",
   "pattern": "naturalness",
   "english": "do you have an idea?",
   "german": "Hast du eine Idee",
   "suggestion": "Hast du eine Ahnung? / Ich habe nicht die geringste Ahnung",
   "question": "\"eine Idee haben, wo/was/wie …\" (S0259L01U02, U04, U08, U10, U11, U12) and seed 260 \"Ich habe nicht die geringste Idee\" — is \"Idee\" right here, or must it be \"Ahnung\" (\"idea\" in the sense of knowing)? Ahnung is not taught."
  },
  {
   "seed": 260,
   "id": "S0260L01B02",
   "pattern": "naturalness",
   "english": "There is not the faintest chance",
   "german": "Es gibt nicht die geringste Gelegenheit",
   "suggestion": "Es gibt nicht die geringste Chance, dass …",
   "question": "\"not the faintest chance | nicht die geringste Gelegenheit\" (B02, U02, U05, U08): Gelegenheit = opportunity. Chance / Möglichkeit instead? (neither taught)"
  },
  {
   "seed": 264,
   "id": "S0264L01",
   "pattern": "lego-gloss",
   "english": "I saw an old man",
   "german": "ein alter Mann",
   "suggestion": "an old man | ein alter Mann",
   "question": "Not-new LEGO S0264L01 reads \"I saw an old man | ein alter Mann\": the English has \"I saw\", the German not. Re-gloss to \"an old man\"? (would sit beside S0231L01 \"an old man | einen alten Mann\" — nominative vs accusative, ZUT)"
  },
  {
   "seed": 266,
   "id": "S0266L01U04",
   "pattern": "mismatch",
   "english": "The office of my father was in the old building that we have seen yesterday",
   "german": "Das Büro meines Vaters war in dem alten Büro das wir gestern gesehen haben",
   "suggestion": "English \"… was in the old office that we saw yesterday\" / German \"… in dem alten Gebäude …\" (Gebäude not taught)",
   "question": "\"the old building that we have seen yesterday | in dem alten Büro das wir gestern gesehen haben\": building → Büro. Which side?"
  },
  {
   "seed": 267,
   "id": "S0267L01U01",
   "pattern": "de-grammar",
   "english": "Have you heard from my friend who is now in the other house?",
   "german": "Hast du von meinem Freund gehört, der jetzt im anderen Hause ist?",
   "suggestion": "Hast du von meinem Freund gehört, der jetzt im anderen Haus ist?",
   "question": "\"im anderen Hause\" — dative -e is archaic here; \"Haus\" is not taught yet (only \"zu Hause\"). Use \"Haus\" anyway?"
  },
  {
   "seed": 270,
   "id": "S0270L01U03",
   "pattern": "naturalness",
   "english": "When I was at the restaurant it was already too late",
   "german": "Als ich beim Restaurant war war es schon zu spät",
   "suggestion": "Als ich im Restaurant war, … / … im Restaurant auf sie warten …",
   "question": "\"beim Restaurant\" for \"at the restaurant\" (S0270L01U03, S0275L01U04, S0276L01U06, S0277L02U03, S0218L01U03 \"zum Restaurant\" …) — is \"beim Restaurant\" acceptable, or always \"im Restaurant\"?"
  },
  {
   "seed": 272,
   "id": "S0272L02B03",
   "pattern": "naturalness",
   "english": "He told me about a great idea",
   "german": "Er hat mir von einer tollen Idee gesagt",
   "suggestion": "Er hat mir von einer tollen Idee erzählt",
   "question": "\"told me about | mir von … gesagt\" (S0272L02B03, U03; S0202L01U08 \"Geschichte … sagen\") — must it be \"erzählt\"? (erzählen not taught by 272)"
  },
  {
   "seed": 274,
   "id": "S0274L01U08",
   "pattern": "asked-wollte-wissen",
   "english": "She asked me if I could help her in a few days with something",
   "german": "Sie wollte wissen ob ich ihr in ein paar Tagen mit etwas helfen könnte",
   "suggestion": "A: keep / B: English \"She wanted to know if …\"",
   "question": "\"She asked me if … | Sie wollte wissen, ob …\" (S0274L01U08, S0275L01U04, S0276L01U06, S0277L02U06): the German says \"wanted to know\". Fine as a pairing, or change the English?"
  },
  {
   "seed": 278,
   "id": "S0278L01B06",
   "pattern": "de-grammar",
   "english": "When will you finish?",
   "german": "Wann wirst du fertig machen?",
   "suggestion": "Wann wirst du fertig sein? / Wann wirst du es fertig machen?",
   "question": "\"When will you finish? | Wann wirst du fertig machen?\" — fertig machen needs an object. Which?"
  },
  {
   "seed": 281,
   "id": "S0281L02U03",
   "pattern": "mismatch",
   "english": "I have my coffee every morning before I go to the office",
   "german": "Ich habe meinen Kaffee am Morgen, bevor ich zum Büro will",
   "suggestion": "Ich habe meinen Kaffee am Morgen, bevor ich zum Büro gehe / I have my coffee in the morning before I go to the office",
   "question": "\"before I go to the office | bevor ich zum Büro will\" (want to); and \"every morning | am Morgen\". Use \"gehe\"?"
  },
  {
   "seed": 281,
   "id": "S0281L04U02",
   "pattern": "word-order",
   "english": "I wanted to talk to you before you start next week",
   "german": "Ich wollte mit dir reden, bevor du anfängst nächste Woche",
   "suggestion": "… bevor du nächste Woche anfängst / … bevor du morgen anfängst",
   "question": "\"bevor du anfängst nächste Woche\" (U02), \"bevor du anfängst morgen\" (U05): time word after the verb in a verb-final clause. Move it?"
  },
  {
   "seed": 282,
   "id": "S0282L01B05",
   "pattern": "de-grammar",
   "english": "Don't worry that's not a problem",
   "german": "Keine Sorgen das ist kein Problem",
   "suggestion": "Keine Sorge, das ist kein Problem",
   "question": "\"Don't worry | Keine Sorgen\" — singular \"Keine Sorge\"?"
  },
  {
   "seed": 282,
   "id": "S0282L01U08",
   "pattern": "naturalness",
   "english": "I was thinking that we might be late but my friend said that's not a problem for him",
   "german": "Ich dachte dass wir spät sein können aber mein Freund hat gesagt das ist kein Problem für ihn",
   "suggestion": "Ich dachte, dass wir zu spät kommen könnten, …",
   "question": "\"we might be late | dass wir spät sein können\" — natural?"
  },
  {
   "seed": 291,
   "id": "S0291L01U02",
   "pattern": "mismatch",
   "english": "I hope this is going to work out well because we have been working on it for a long time",
   "german": "Ich hoffe das wird gut funktionieren weil wir lange arbeiten",
   "suggestion": "Ich hoffe, das wird gut funktionieren, weil wir schon lange daran arbeiten",
   "question": "\"because we have been working on it for a long time | weil wir lange arbeiten\" (= because we work long). Add \"schon … daran\"? (daran taught?)"
  },
  {
   "seed": 292,
   "id": "S0292L01U05",
   "pattern": "de-grammar",
   "english": "You will be able to understand everything if you read the book from the beginning",
   "german": "Du kannst alles verstehen wenn du das Buch von Anfang liest",
   "suggestion": "… wenn du das Buch von Anfang an liest",
   "question": "\"von Anfang\" — missing \"an\"?"
  },
  {
   "seed": 292,
   "id": "S0292L02U02",
   "pattern": "word-order",
   "english": "My friends are going to the party with me tomorrow",
   "german": "Meine Freunde gehen zur Party mit mir morgen",
   "suggestion": "Meine Freunde gehen morgen mit mir zur Party / Willst du mit uns zur Party gehen?",
   "question": "Basket \"to the party | zur Party\": \"gehen zur Party mit mir morgen\" (U02), \"zur Party mit uns gehen\" (U03), \"zur Party nach der Arbeit gehen\" (U04), \"zur Party am Wochenende gehen\" (U05), \"gehen zur Party zusammen\" (B04). Reorder as suggested?"
  },
  {
   "seed": 294,
   "id": "S0294L02U03",
   "pattern": "word-order",
   "english": "I tried to call you yesterday but it was too late",
   "german": "Ich habe versucht dich anzurufen gestern aber es war zu spät",
   "suggestion": "Ich habe gestern versucht, dich anzurufen, aber es war zu spät",
   "question": "\"versucht dich anzurufen gestern\" — move gestern?"
  },
  {
   "seed": 295,
   "id": "S0295L02U02",
   "pattern": "naturalness",
   "english": "She said the work would be finished by the end of the week",
   "german": "Sie hat gesagt, die Arbeit wird fertig werden bevor die Woche fertig ist",
   "suggestion": "Sie hat gesagt, die Arbeit wird bis Ende der Woche fertig",
   "question": "\"by the end of the week | bevor die Woche fertig ist\" — natural?"
  },
  {
   "seed": 298,
   "id": "S0298L02U05",
   "pattern": "de-grammar",
   "english": "She told me she had nothing left to say when I asked her about it",
   "german": "Sie hat mir gesagt, sie hatte nichts mehr zu sagen, als ich sie darüber wissen wollte",
   "suggestion": "…, als ich sie danach gefragt habe",
   "question": "\"when I asked her about it | als ich sie darüber wissen wollte\" — broken German. Use \"gefragt habe\"?"
  },
  {
   "seed": 299,
   "id": "S0299L03B01",
   "pattern": "lego-gloss",
   "english": "The half",
   "german": "Die Hälfte",
   "suggestion": "half | die Hälfte (English \"half of the food\", \"half of the money\")",
   "question": "LEGO \"the half | die Hälfte\" makes the English say \"I only want the half of the food\", \"give you the half of the money\" (U01, U03, U04, U06, U08) — unnatural English. Re-gloss the LEGO English to \"half\"? (Kai's call)"
  },
  {
   "seed": 304,
   "id": "S0304L01B01",
   "pattern": "lego-gloss",
   "english": "to do work",
   "german": "arbeiten",
   "suggestion": "work | arbeiten (already taught) — or merge into \"to work from home\"",
   "question": "LEGO \"to do work | arbeiten\" makes the English say \"she does not want to do work today\", \"I would like to do work with you\". Not natural English. Re-gloss? (Kai's call)"
  },
  {
   "seed": 309,
   "id": "S0309L02B01",
   "pattern": "lego-gloss",
   "english": "never before",
   "german": "noch nie",
   "suggestion": "never | noch nie (English \"I have never worked from home\")",
   "question": "LEGO \"never before | noch nie\" puts \"before\" in the middle of every English row: \"I have never before worked from home\", \"have you never before said that?\" — unnatural English. Re-gloss to \"never\" / move \"before\" to the end? (Kai's call)"
  },
  {
   "seed": 313,
   "id": "S0313L01",
   "pattern": "lego-structure",
   "english": "to watch all five games",
   "german": "alle fünf Spiele sehen",
   "suggestion": "(Kai's call)",
   "question": "Seed 313: S0313L01 is \"to watch all five games | alle fünf Spiele sehen\" but its basket drills bare \"to watch | schauen\"; S0313L02 \"all five games\" comes after the bigger LEGO (K47), and its basket says \"schauen\" while the seed says \"sehen\". Re-cut as \"to watch | schauen/sehen\" then \"all five games\"?"
  },
  {
   "seed": 314,
   "id": "S0314L01B01",
   "pattern": "lego-gloss",
   "english": "to lay",
   "german": "legen",
   "suggestion": "to put | legen",
   "question": "LEGO \"to lay | legen\": the seed says \"put it on the table\"; the basket's English \"I would like to lay this here\", \"you could lay the facts on the table\" is unnatural. Re-gloss LEGO English to \"to put\"? (Kai's call)"
  },
  {
   "seed": 319,
   "id": "S0319L02B01",
   "pattern": "naturalness",
   "english": "to move",
   "german": "ziehen",
   "suggestion": "umziehen (ich will umziehen / sie muss umziehen); \"in ein anderes Land ziehen\" stays",
   "question": "LEGO \"to move | ziehen\": bare \"ziehen\" means \"pull\". Rows with no destination — \"willst du ziehen?\" (U01), \"dass sie ziehen muss\" (U02), U03, U04, U05, U06, B03 — need \"umziehen\"? (umziehen not taught)"
  },
  {
   "seed": 320,
   "id": "S0320L02B01",
   "pattern": "lego-gloss",
   "english": "no other television",
   "german": "keinen anderen Fernseher",
   "suggestion": "another television | keinen anderen Fernseher (English \"another\" in a negative)",
   "question": "LEGO \"no other television | keinen anderen Fernseher\": its basket English says \"another television\" (U01-U06) and B02 says \"to buy no other television\". Re-gloss the LEGO English? (Kai's call)"
  },
  {
   "seed": 324,
   "id": "seed 324",
   "pattern": "naturalness",
   "english": "that student has both of her hands up",
   "german": "diese Schülerin hat beide Hände oben",
   "suggestion": "Diese Schülerin hält beide Hände hoch / hat beide Hände gehoben",
   "question": "\"has both of her hands up | hat beide Hände oben\" (seed 324 and the S0324L03 \"up | oben\" basket: \"sie hat es oben\") — natural German? LEGO \"up | oben\" follows."
  },
  {
   "seed": 325,
   "id": "S0325L01B01",
   "pattern": "lego-gloss",
   "english": "to think about",
   "german": "bedenken",
   "suggestion": "to consider | bedenken",
   "question": "LEGO \"to think about | bedenken\": the seed says \"consider\", and the basket's \"think about this | das bedenken\" competes with \"think about | nachdenken über\" taught earlier (one English, two Germans). Re-gloss the LEGO English to \"to consider\"? (S0326L02U05 \"think about whether | bedenken, ob\" follows) (Kai's call)"
  },
  {
   "seed": 339,
   "id": "seed 339",
   "pattern": "which-side",
   "english": "no I think he's hurt himself quite badly",
   "german": "nein, ich denke, er hat sich ziemlich schlecht verletzt",
   "suggestion": "nein, ich denke, er hat sich ziemlich schwer verletzt",
   "question": "Seed 339 German says \"ziemlich schlecht verletzt\", while its LEGO S0339L02 basket (B03, U01, U02, U04, U06) says \"ziemlich schwer verletzt\". \"schwer\" is the natural word for a bad injury — change the seed to \"schwer\"? (schwer is introduced only in these phrases)"
  },
  {
   "seed": 351,
   "id": "S0351L02B01",
   "pattern": "lego-gloss",
   "english": "to leave me alone",
   "german": "mich allein lassen",
   "suggestion": "to leave me on my own | mich allein lassen",
   "question": "LEGO \"to leave me alone | mich allein lassen\": in English \"leave me alone\" usually means \"stop bothering me\" (= \"lass mich in Ruhe\"). Seed 351 says \"on my own\". Re-gloss? (Kai's call)"
  },
  {
   "seed": 364,
   "id": "S0364L03U03",
   "pattern": "naturalness",
   "english": "I think she liked that place quite a lot",
   "german": "ich denke, dass sie diesen Ort ziemlich mochte",
   "suggestion": "ich denke, dass sie diesen Ort ziemlich gern mochte",
   "question": "\"liked that place quite a lot | diesen Ort ziemlich mochte\" — natural?"
  },
  {
   "seed": 374,
   "id": "seed 374",
   "pattern": "naturalness",
   "english": "yes I thought it was very beautiful",
   "german": "ja, ich fand es sehr wunderschön",
   "suggestion": "ja, ich fand es sehr schön / ja, ich fand es wunderschön",
   "question": "\"sehr wunderschön\" (seed 374, LEGO S0374L01 and its basket; also S0373L01U05 \"ziemlich wunderschön\") — wunderschön already means \"very beautiful\". Use \"sehr schön\" or bare \"wunderschön\"? S0374L01B03 \"I thought it was | ich fand es sehr\" carries the extra \"sehr\" too."
  },
  {
   "seed": 377,
   "id": "S0377L02U04",
   "pattern": "de-grammar",
   "english": "she has said that she wanted to go somewhere new",
   "german": "sie hat gesagt, dass sie irgendwohin Neues gehen wollte",
   "suggestion": "…, dass sie an einen neuen Ort gehen wollte / …, dass sie an einen wichtigen Ort gegangen war",
   "question": "\"irgendwohin Neues\" (U04) and \"irgendwohin Wichtiges\" (U06) are not German. Rewrite as suggested, or drop the adjective from both sides?"
  },
  {
   "seed": 378,
   "id": "S0378L02U04",
   "pattern": "de-grammar",
   "english": "I knew that there was not enough money",
   "german": "ich wusste, dass es nicht genug Geld war",
   "suggestion": "ich wusste, dass es nicht genug Geld gab",
   "question": "\"there was not enough money | dass es nicht genug Geld war\" — \"es gab\" (there was), not \"es war\"?"
  },
  {
   "seed": 379,
   "id": "S0379L01B03",
   "pattern": "lego-gloss",
   "english": "I had the luck",
   "german": "ich hatte das Glück",
   "suggestion": "I was lucky | ich hatte das Glück",
   "question": "LEGO \"luck | Glück\" basket: \"I had the luck to see it\", \"she had the luck to go to the cinema\" — calqued English (seed 379 says \"I was lucky enough\"). Re-gloss the English to \"was lucky enough\"? (Kai's call)"
  },
  {
   "seed": 388,
   "id": "S0388L02B01",
   "pattern": "lego-structure",
   "english": "this",
   "german": "diese",
   "suggestion": "(Kai's call)",
   "question": "LEGO S0388L02 \"that person | diese Person\" has a basket of bare \"this | diese\" rows (\"I think this is quite important | ich denke, dass diese ziemlich wichtig ist\") — no row holds \"that person\", and \"diese\" alone reads as \"this (one, feminine)\". Rebuild the basket on \"that person\"?"
  },
  {
   "seed": 392,
   "id": "S0392L01B01",
   "pattern": "demonstrative",
   "english": "that child",
   "german": "das Kind",
   "suggestion": "A: German \"dieses Kind / dieser Junge / dieses Mädchen\" / B: English \"the child / the boy / the girl\"",
   "question": "\"that child | das Kind\" (S0392L01), \"that boy | der Junge\" (S0393L01), \"that girl | das Mädchen\" (S0394L01) teach \"that\" = der/das, while \"that man | dieser Mann\" (S0227) and \"that woman | diese Frau\" (S0229) use dies-. Which side?"
  },
  {
   "seed": 402,
   "id": "S0402L01U02",
   "pattern": "naturalness",
   "english": "I asked if there was somewhere to go",
   "german": "ich habe gefragt, ob es irgendwo zu gehen gibt",
   "suggestion": "ich habe gefragt, ob wir irgendwohin gehen können",
   "question": "\"if there was somewhere to go | ob es irgendwo zu gehen gibt\" — natural German?"
  },
  {
   "seed": 404,
   "id": "S0404L02B02",
   "pattern": "lego-structure",
   "english": "right before the road",
   "german": "direkt vor der Straße",
   "suggestion": "(Kai's call)",
   "question": "LEGO S0404L02 \"before | vor\" is from \"before Thursday\" (time), but its basket drills place: \"right before the road | direkt vor der Straße\", \"we are right before the post | direkt vor der Post\" — English \"before\" for \"in front of\", and \"the post\" for the post office. Rebuild the basket on time (\"before Thursday\", \"before the weekend\")?"
  },
  {
   "seed": 412,
   "id": "S0412L02B01",
   "pattern": "lego-gloss",
   "english": "to them",
   "german": "ihnen",
   "suggestion": "them | ihnen (English \"tell them\", \"give them\")",
   "question": "LEGO \"to them | ihnen\" makes every basket row say \"tell to them\": \"I think we should tell to them\", \"I knew we had to tell to them\" (U01-U06) — not English. Re-gloss the LEGO English to \"them\" (dative), so the rows read \"tell them\"? (Kai's call; S0241L01 \"to him | ihm\" is the same shape but its rows read naturally)"
  },
  {
   "seed": 414,
   "id": "S0414L01U01",
   "pattern": "naturalness",
   "english": "I think we should please go",
   "german": "ich denke, dass wir bitte gehen sollten",
   "suggestion": "(delete, or rewrite the basket)",
   "question": "Basket \"please | bitte\": \"I think we should please go | ich denke, dass wir bitte gehen sollten\", \"I knew we had to go please | … bitte gehen müssen\", \"please could we stay | bitte könnten wir bleiben\" — \"bitte\" inside reported clauses is odd in both languages. Rewrite the basket around requests (\"könnten wir bitte …?\")?"
  },
  {
   "seed": 419,
   "id": "S0419L01U03",
   "pattern": "mismatch",
   "english": "I thought the people would like them",
   "german": "ich dachte, dass die Leute sie mögen wollten",
   "suggestion": "ich dachte, dass die Leute sie mögen würden (würden not taught by 419)",
   "question": "\"the people would like them | dass die Leute sie mögen wollten\" (U03, U04, U06): \"mögen wollten\" = \"wanted to like\". Use \"mögen würden\", or rewrite the English?"
  },
  {
   "seed": 427,
   "id": "S0427L01U01",
   "pattern": "template",
   "english": "I think they would not like that you think",
   "german": "ich denke, dass sie nicht wollen, dass du denkst",
   "suggestion": "(rewrite the basket)",
   "question": "Basket \"you think | du denkst\": \"I think they would not like that you think | dass sie nicht wollen, dass du denkst\" (U01-U05) — the English is not English and \"would like\" ≠ \"wollen\". Same template as seeds ~386-432, where most baskets are \"I think / I thought / she told me / I knew / I think all … / please could …\" around the LEGO (e.g. S0421L01 \"I asked because he is important\"). Worth a basket rewrite pass on that stretch?"
  },
  {
   "seed": 433,
   "id": "S0433L02U01",
   "pattern": "template",
   "english": "I think we could find out when",
   "german": "ich denke, dass wir herausfinden könnten, wann",
   "suggestion": "(rewrite as full sentences)",
   "question": "Baskets S0433L02 \"when | wann\" and S0433L03 \"film | Film\" end mid-sentence: \"I think we could find out when\", \"I knew we could not find out when the film\" (U01-U04 of each). USE rows are meant to be sayable on their own. Rebuild?"
  },
  {
   "seed": 443,
   "id": "S0443L02B01",
   "pattern": "lego-structure",
   "english": "on",
   "german": "auf",
   "suggestion": "(Kai's call: re-cut seed 443)",
   "question": "Seed 443 S0443L02 \"on | auf\" is a bare preposition LEGO (K47) taken from \"auf die gleiche Weise\"; its basket \"keep it on | es weiter auf machen\" (B03, U01-U06) is not German. S0443L03 \"same | gleiche\" basket \"es gleiche machen\" (U01-U06) and B03 \"den gleiche Ansatz\" are not German either. Re-cut as \"the same way | auf die gleiche Weise\"?"
  },
  {
   "seed": 445,
   "id": "S0445L03U02",
   "pattern": "naturalness",
   "english": "I think we will be able to carry this suitcase",
   "german": "ich denke, dass wir diesen Koffer tragen können werden",
   "suggestion": "… dass wir diesen Koffer werden tragen können",
   "question": "\"dass wir diesen Koffer tragen können werden\" (S0445L03U02-U04, U06; S0447L04U02-U04, U06 \"nach Hause fahren können werden\") — is \"werden tragen können\" the natural order?"
  },
  {
   "seed": 454,
   "id": "S0454L03",
   "pattern": "lego-gloss",
   "english": "about around",
   "german": "gegen",
   "suggestion": "at about | gegen",
   "question": "LEGO S0454L03 reads \"about around | gegen\" — two Englishes glued together. Re-gloss to \"at about\"? (\"about | über\" is taught, so bare \"about\" would clash)"
  },
  {
   "seed": 466,
   "id": "seed 466",
   "pattern": "word-order",
   "english": "let me throw it over the wall",
   "german": "lass mich es über die Mauer werfen",
   "suggestion": "lass es mich über die Mauer werfen",
   "question": "\"lass mich es über die Mauer werfen\" (seed 466, S0466L03U01; also S0466L01U02 \"lass mich es sehen\", U05 \"lass mich es jetzt machen\", S0466L03U04) — natural order \"lass es mich …\"?"
  },
  {
   "seed": 469,
   "id": "seed 469",
   "pattern": "which-side",
   "english": "but that doesn't mean we can't change it",
   "german": "aber das bedeutet nicht, dass wir sie nicht ändern können",
   "suggestion": "aber das bedeutet nicht, dass wir es nicht ändern können",
   "question": "Seed 469 \"we can't change it | dass wir sie nicht ändern können\": \"sie\" (feminine/plural) for \"it\", while S0469L03U02 says \"es ändern\". Out of context, should it be \"es\"?"
  },
  {
   "seed": 475,
   "id": "S0475L04U02",
   "pattern": "de-grammar",
   "english": "I think there are many reasons to consider",
   "german": "ich denke, dass es viele Gründe nachzudenken gibt",
   "suggestion": "ich denke, dass es viele Gründe gibt, darüber nachzudenken",
   "question": "\"many reasons to consider | dass es viele Gründe nachzudenken gibt\" — not German. Rewrite as suggested?"
  },
  {
   "seed": 489,
   "id": "S0489L01B03",
   "pattern": "register",
   "english": "please make me a strong cup of coffee",
   "german": "bitte machen Sie mir eine starke Tasse Kaffee",
   "suggestion": "please make me a strong cup of coffee, sir / bitte mach mir eine starke Tasse Kaffee",
   "question": "\"please make me a strong cup of coffee | bitte machen Sie mir …\": the only formal \"Sie\" in the basket, with no \"sir/madam\" on the English (formal-register rule). Switch to \"mach\" (du), or mark the English?"
  },
  {
   "seed": 493,
   "id": "S0493L02B01",
   "pattern": "lego-gloss",
   "english": "what's next",
   "german": "als Nächstes",
   "suggestion": "next | als Nächstes",
   "question": "LEGO \"what's next | als Nächstes\": the English has \"what\", the German not (the rows are \"what comes next | was als Nächstes kommt\"). Re-gloss the LEGO English to \"next\"? (Kai's call)"
  },
  {
   "seed": 498,
   "id": "S0498L01B01",
   "pattern": "consistency",
   "english": "entrance",
   "german": "Eingangsbereich",
   "suggestion": "(Kai's call)",
   "question": "\"entrance\" is \"Eingang\" in S0390L02 (\"near the entrance | in der Nähe des Eingangs\") and \"Eingangsbereich\" in S0498L01 (\"in the entrance | im Eingangsbereich\"). Keep both, or make seed 498 \"im Eingang\"?"
  },
  {
   "seed": 521,
   "id": "S0521L01B01",
   "pattern": "lego-gloss",
   "english": "fear",
   "german": "Angst",
   "suggestion": "afraid | Angst (haben)",
   "question": "LEGO \"fear | Angst\" makes English \"I have so much fear\" (U05), \"does she have fear?\" (U06), \"we all have fear\" (U07). Re-gloss to \"afraid\" so the English reads \"I am so afraid\"? (Kai's call)"
  },
  {
   "seed": 522,
   "id": "seed 522",
   "pattern": "de-grammar",
   "english": "let's agree that it was stupid to tell the truth",
   "german": "lass uns einigen, dass es dumm war, die Wahrheit zu sagen",
   "suggestion": "lass uns uns darauf einigen, dass es dumm war, die Wahrheit zu sagen / einigen wir uns darauf, dass …",
   "question": "Seed 522 and LEGO S0522L05 \"to agree | einigen\": \"sich einigen\" is reflexive — \"lass uns einigen\" (U02, U05), \"sie haben einigen\" (B02, = \"they agreed\"; should be \"sie haben sich geeinigt\"), \"wir können einigen\" (B03), \"dass wir einigen\" (U03). Which German for \"let's agree that …\"? (\"zustimmen\" is taught at S0384)"
  },
  {
   "seed": 523,
   "id": "S0523L01U01",
   "pattern": "de-grammar",
   "english": "instead of that",
   "german": "statt das",
   "suggestion": "stattdessen / statt dessen",
   "question": "\"instead of that | statt das\" (U01), \"instead of that she did this | statt das hat sie das gemacht\" (U02), \"instead of that she tried | statt das hat sie versucht\" (U07) — German needs \"stattdessen\". Use it?"
  },
  {
   "seed": 524,
   "id": "S0524L01B01",
   "pattern": "lego-structure",
   "english": "you",
   "german": "dich",
   "suggestion": "(Kai's call)",
   "question": "LEGO S0524L01 \"call you | rufe dich\" has a basket of bare \"you | dich\" rows (\"I need you\", \"she found you\") — none says \"call you\". Rebuild the basket on \"call you\"?"
  },
  {
   "seed": 527,
   "id": "S0527L01B03",
   "pattern": "naturalness",
   "english": "she told me a story",
   "german": "sie hat mir eine Geschichte gesagt",
   "suggestion": "sie hat mir eine Geschichte erzählt",
   "question": "Same \"eine Geschichte sagen\" question as S0272L02B03: S0527L01B03 \"she told me a story | … gesagt\" and U07 \"she can tell a story | … sagen\", one LEGO before \"erzählt\" is taught (S0527L02)."
  },
  {
   "seed": 534,
   "id": "S0534L03U02",
   "pattern": "naturalness",
   "english": "what is the weather?",
   "german": "was ist das Wetter?",
   "suggestion": "wie ist das Wetter?",
   "question": "\"what is the weather? | was ist das Wetter?\" — German asks \"wie ist das Wetter?\". Also U03 \"das Wetter ist hier\", U05 \"sie hat das Wetter hier\" say nothing. Rewrite the basket?"
  },
  {
   "seed": 542,
   "id": "S0542L01B01",
   "pattern": "lego-gloss",
   "english": "always",
   "german": "immer",
   "suggestion": "whenever | immer wenn",
   "question": "LEGO \"whenever | immer\": \"immer\" alone is \"always\"; the basket mixes \"always | immer\" (B01, B02, U03-U07) with \"whenever | immer wenn\" (B03, B04, U01, U02, U08). Re-cut as \"whenever | immer wenn\" (and \"always\" already taught?) (Kai's call)"
  },
  {
   "seed": 554,
   "id": "S0554L01U01",
   "pattern": "lego-structure",
   "english": "this is ugly",
   "german": "dieses ist hässlich",
   "suggestion": "(Kai's call)",
   "question": "LEGO S0554L01 \"this towel | dieses Handtuch\" has a basket of bare \"this | dieses\" rows: \"this is ugly | dieses ist hässlich\", \"this is good | dieses ist gut\" — German says \"das ist …\" here. Same shape as S0388L02. Rebuild the basket on \"this towel\"?"
  },
  {
   "seed": 558,
   "id": "S0558L01B01",
   "pattern": "lego-structure",
   "english": "the",
   "german": "der",
   "suggestion": "(Kai's call)",
   "question": "Seed 558's only new LEGO is \"the | der\" — a bare article (K47). Its basket is really \"at night | in der Nacht\". Re-cut as \"so late at night | so spät in der Nacht\"?"
  },
  {
   "seed": 557,
   "id": "S0557L02U01",
   "pattern": "naturalness",
   "english": "they wouldn't play loud music",
   "german": "sie würden nicht laute Musik spielen",
   "suggestion": "sie würden keine laute Musik spielen / sie würden keine Musik spielen",
   "question": "\"sie würden nicht laute Musik spielen\" (S0557L02U01), \"nicht Musik spielen\" (U03, S0557L03U02) — must it be \"keine\"?"
  },
  {
   "seed": 557,
   "id": "S0557L03B01",
   "pattern": "lego-gloss",
   "english": "I wished",
   "german": "ich wünschte",
   "suggestion": "I wish | ich wünschte",
   "question": "LEGO \"I wished | ich wünschte\": \"ich wünschte\" here is the subjunctive \"I wish\" (seed 557), but the LEGO and its basket say \"I wished\" (past): \"I wished they would stop playing\". Re-gloss to \"I wish\"? (Kai's call)"
  },
  {
   "seed": 559,
   "id": "S0559L02B03",
   "pattern": "naturalness",
   "english": "she went along the path",
   "german": "sie ist durch den Weg gegangen",
   "suggestion": "sie ist den Weg entlang gegangen",
   "question": "\"she went along the path | sie ist durch den Weg gegangen\" — \"durch den Weg\" = through the path. Also U03 \"she went through | sie ist durch gegangen\". Rewrite?"
  },
  {
   "seed": 568,
   "id": "S0568L03B02",
   "pattern": "consistency",
   "english": "next time",
   "german": "nächsten Mal",
   "suggestion": "beim nächsten Mal / das nächste Mal",
   "question": "\"the next time\" is \"beim nächsten Mal\" (LEGO S0568L03) and \"das nächste Mal\" (S0568L02U01, S0568L03U02); \"next time\" is \"nächstes Mal\" (S0568L02B02) and \"nächsten Mal\" (S0568L03B02, missing \"beim\"); S0568L03B04 English \"at the next time\" is not English. Which German for which English?"
  },
  {
   "seed": 569,
   "id": "S0569L05B02",
   "pattern": "naturalness",
   "english": "he has decided to pay",
   "german": "er hat entschieden zu zahlen",
   "suggestion": "er hat sich entschieden, zu zahlen",
   "question": "\"he has decided to pay | er hat entschieden zu zahlen\" (S0569L05B02, U03, U04, U07; seed 569 \"hast du entschieden, wie viel …\") — with a following clause, is it \"sich entscheiden\"?"
  },
  {
   "seed": 572,
   "id": "S0572L03U02",
   "pattern": "de-grammar",
   "english": "she asked about the last time",
   "german": "sie hat gefragt, über das letzte Mal",
   "suggestion": "sie hat nach dem letzten Mal gefragt",
   "question": "\"she asked about the last time | sie hat gefragt, über das letzte Mal\" (U02, U07) — not German. Rewrite as suggested?"
  },
  {
   "seed": 573,
   "id": "S0573L02B01",
   "pattern": "lego-structure",
   "english": "of",
   "german": "von",
   "suggestion": "(Kai's call)",
   "question": "LEGO S0573L02 \"of | von\" is a bare preposition (K47); its basket \"she talks of that | sie redet von dem\" is odd in both languages. Merge into \"the kind of thing | die Art von Sache\" (L03)?"
  },
  {
   "seed": 573,
   "id": "seed 573",
   "pattern": "naturalness",
   "english": "it's the kind of thing that makes the holidays very special",
   "german": "es ist die Art von Sache, die die Feiertage sehr besonders macht",
   "suggestion": "… die die Feiertage zu etwas ganz Besonderem macht / … sind für jeden etwas ganz Besonderes",
   "question": "\"sehr besonders\" (seed 573, seed 574 \"die Feiertage sind sehr besonders für jeden\", S0573L05 basket) — \"besonders\" is an adverb (\"particularly\"); is \"sehr besonders\" acceptable German?"
  },
  {
   "seed": 579,
   "id": "S0579L01B02",
   "pattern": "word-order",
   "english": "he often does it",
   "german": "er macht oft das",
   "suggestion": "er macht das oft / sie will das oft / sie macht das oft",
   "question": "\"er macht oft das\" (S0579L01B02, B03 \"sie will oft das\", U03, U05) — the pronoun \"das\" normally comes before \"oft\". Reorder?"
  },
  {
   "seed": 589,
   "id": "S0589L03U06",
   "pattern": "naturalness",
   "english": "she would just like to know",
   "german": "sie möchte gerade wissen",
   "suggestion": "sie möchte nur wissen",
   "question": "\"she would just like to know | sie möchte gerade wissen\" — \"gerade\" means \"just now\", not \"only\". Use \"nur\"?"
  },
  {
   "seed": 593,
   "id": "seed 593",
   "pattern": "naturalness",
   "english": "however much I argued I still had to share",
   "german": "egal wie viel ich argumentiert habe, ich musste immer noch teilen",
   "suggestion": "egal wie viel ich gestritten / protestiert habe, …",
   "question": "\"however much I argued | egal wie viel ich argumentiert habe\" (seed 593, S0593L02 \"argued | argumentiert\" and its basket) — \"argumentieren\" is \"to make an argument\"; for a child protesting, is it \"gestritten\" / \"protestiert\"? (\"to argue | streiten\" is taught at S0501)"
  },
  {
   "seed": 599,
   "id": "seed 599",
   "pattern": "naturalness",
   "english": "I'd have been happy to drive if you'd told me",
   "german": "Ich wäre glücklich gewesen zu fahren, wenn du mir gesagt hättest",
   "suggestion": "Ich wäre gern gefahren, wenn du es mir gesagt hättest",
   "question": "\"I'd have been happy to drive | Ich wäre glücklich gewesen zu fahren\" (seed 599, S0599L03U04 \"sie wäre glücklich zu fahren\", S0599L01U04) — \"happy to\" is \"gern\", not \"glücklich … zu\". Rewrite?"
  },
  {
   "seed": 603,
   "id": "S0603L03B03",
   "pattern": "k45",
   "english": "I could find it nowhere",
   "german": "ich konnte es nirgendwo finden",
   "suggestion": "ich konnte es nirgendwo finden → ich habe es nirgendwo gefunden / gestern konnte ich es nirgendwo finden",
   "question": "K45: \"I could find it nowhere | ich konnte es nirgendwo finden\" (B03) and \"she could go nowhere | sie konnte nirgendwo gehen\" (U03) use bare \"konnte\" with no past marker; the English is also calqued (\"couldn't … anywhere\"). Rewrite with a past marker?"
  },
  {
   "seed": 608,
   "id": "seed 608",
   "pattern": "naturalness",
   "english": "it would have been the sensible thing to do",
   "german": "es wäre die vernünftige Sache zu tun gewesen",
   "suggestion": "es wäre das Vernünftigste gewesen / das Vernünftigste wäre gewesen, zu fragen",
   "question": "\"the sensible thing to do | die vernünftige Sache zu tun\" (seeds 608, 609 and the S0608L02 basket) — a calque of English \"thing to do\". Natural German?"
  },
  {
   "seed": 614,
   "id": "seed 614",
   "pattern": "naturalness",
   "english": "it's near where your family live",
   "german": "es ist in der Nähe von wo deine Familie lebt",
   "suggestion": "es ist in der Nähe von dort, wo deine Familie lebt / es ist in der Nähe, wo deine Familie lebt",
   "question": "Seed 614 (and S0614L04U01): \"in der Nähe von wo deine Familie lebt\" — \"von wo\" is a calque. Natural German?"
  },
  {
   "seed": 616,
   "id": "S0616L02B02",
   "pattern": "de-grammar",
   "english": "he has also thought about it",
   "german": "er hat auch darüber gedacht",
   "suggestion": "er hat auch darüber nachgedacht",
   "question": "Basket S0616L02 (\"you thought that | du das gedacht hast\"): \"er hat auch darüber gedacht\" (B02, B03, U02-U05, U07) and \"sie hat über alles gedacht\" (U06) — \"think about\" is \"nachdenken über\" (taught S0565). The rows cannot change to \"nachgedacht\" without leaving the LEGO \"gedacht\". Rebuild the basket on \"dass du das gedacht hast\"?"
  },
  {
   "seed": 619,
   "id": "seed 619",
   "pattern": "naturalness",
   "english": "it's a long time since we saw each other",
   "german": "es ist eine lange Zeit, seit wir uns gesehen haben",
   "suggestion": "es ist lange her, dass wir uns gesehen haben",
   "question": "\"it's a long time since … | es ist eine lange Zeit, seit wir uns gesehen haben\" (seeds 619, 620; S0619L01U06) — natural German says \"es ist lange her, dass/seit …\". Rewrite?"
  },
  {
   "seed": 639,
   "id": "S0639L01U02",
   "pattern": "register",
   "english": "she wants to stay with you",
   "german": "sie will mit Ihnen bleiben",
   "suggestion": "she wants to stay with you, sir",
   "question": "Basket S0639L01 \"with you sir | mit Ihnen, mein Herr\": the rows use formal \"Ihnen\" but their English has no \"sir\" (\"she wants to stay with you | sie will mit Ihnen bleiben\", U02-U07, B02, B03), so \"with you\" is taught as both \"mit dir\" and \"mit Ihnen\" (formal-register rule). Add \"sir\" to the English?"
  },
  {
   "seed": 642,
   "id": "S0642L01B02",
   "pattern": "lego-structure",
   "english": "I also said she is a dear lady",
   "german": "ich habe auch gesagt, sie ist eine gnädige Frau",
   "suggestion": "(Kai's call)",
   "question": "LEGO S0642L01 \"gracious | gnädige\" (from \"madam | gnädige Frau\"): its basket says \"she is a dear lady | sie ist eine gnädige Frau\" (B02, B03, U03, U05, U06) — \"gnädige Frau\" is only a form of address, so these rows teach something no German says. Rebuild the basket on the address \"…, gnädige Frau\"?"
  },
  {
   "seed": 643,
   "id": "seed 643",
   "pattern": "which-side",
   "english": "do you want sir?",
   "german": "wollen Sie, mein Herr",
   "suggestion": "do you want it, sir? / wollen Sie das, mein Herr?",
   "question": "Seed 643 \"do you want sir? | wollen Sie, mein Herr\" and seed 658 \"do you all want? | wollt ihr alle?\" — neither side has an object. Add one?"
  },
  {
   "seed": 655,
   "id": "seed 655",
   "pattern": "de-grammar",
   "english": "I think that you're doing very well, madam",
   "german": "Ich denke, dass Sie sehr gut machen, gnädige Frau",
   "suggestion": "Ich denke, dass Sie das sehr gut machen, gnädige Frau",
   "question": "Seed 655 \"dass Sie sehr gut machen\" has no object for \"machen\". Add \"das\"? (or \"dass Sie sich sehr gut machen\")"
  },
  {
   "seed": 661,
   "id": "seed 661",
   "pattern": "lego-structure",
   "english": "you're all doing something",
   "german": "ihr macht alle etwas",
   "suggestion": "(Kai's call)",
   "question": "Seed 661 \"you're all doing something | ihr macht alle etwas\" has no LEGOs at all."
  }
 ]
};
