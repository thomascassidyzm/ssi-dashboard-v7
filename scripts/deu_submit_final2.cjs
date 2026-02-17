const http = require('http');

function post(body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost', port: 3471,
      path: '/api/v2/phrases/deu_for_eng',
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data)}
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch(e) { resolve({raw: d}); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

(async () => {
  // All 17 LEGOs with 3+ BUILD + needed USE
  const allPhrases = [
    // S53 L1 (A): "she wanted" → "sie wollte" | Need 5 USE
    {seed_number: 53, lego_index: 1,
     build: [
       {known: "she wanted to learn", target: "sie wollte lernen"},
       {known: "she wanted more", target: "sie wollte mehr"},
       {known: "she wanted to go", target: "sie wollte gehen"}
     ],
     use: [
       {known: "I think she wanted to learn much more about it", target: "ich denke sie wollte viel mehr darüber lernen"},
       {known: "she wanted to start learning early in the morning", target: "sie wollte früh am morgen anfangen zu lernen"},
       {known: "do you know what she wanted to say to us yesterday", target: "weißt du was sie wollte uns gestern sagen"},
       {known: "she wanted to find a better way to learn German", target: "sie wollte einen besseren weg finden deutsch zu lernen"},
       {known: "I believe she wanted to speak with you about it later", target: "ich glaube sie wollte später mit dir darüber sprechen"},
       {known: "she wanted to try something different this time", target: "sie wollte dieses mal etwas anderes versuchen"},
       {known: "she wanted to help but she did not have enough time", target: "sie wollte helfen aber sie hatte nicht genug zeit"},
       {known: "she wanted to understand everything before we started", target: "sie wollte alles verstehen bevor wir angefangen haben"}
     ]},

    // S56 L2 (A): "myself" → "mich" | Need 1 USE
    {seed_number: 56, lego_index: 2,
     build: [
       {known: "I see myself", target: "ich sehe mich"},
       {known: "for myself", target: "für mich"},
       {known: "I ask myself", target: "ich frage mich"}
     ],
     use: [
       {known: "I wanted to prepare myself for the meeting tomorrow morning", target: "ich wollte mich auf das treffen morgen früh vorbereiten"},
       {known: "sometimes I ask myself if I am learning fast enough", target: "manchmal frage ich mich ob ich schnell genug lerne"},
       {known: "I need to remind myself to speak more often with others", target: "ich muss mich erinnern öfter mit anderen zu sprechen"},
       {known: "I feel myself getting better at speaking German every day", target: "ich fühle mich jeden tag besser im deutsch sprechen"},
       {known: "I could not bring myself to start the difficult task today", target: "ich konnte mich heute nicht dazu bringen die schwierige aufgabe anzufangen"},
       {known: "I told myself that I should try harder next time", target: "ich habe mir gesagt dass ich mich nächstes mal mehr anstrengen soll"},
       {known: "I found myself thinking about it all day at work", target: "ich habe mich den ganzen tag bei der arbeit dabei ertappt darüber nachzudenken"},
       {known: "I asked myself why I did not start learning earlier", target: "ich habe mich gefragt warum ich nicht früher angefangen habe zu lernen"}
     ]},

    // S56 L3 (A): "one" → "man" | Need 5 USE
    {seed_number: 56, lego_index: 3,
     build: [
       {known: "one can learn", target: "man kann lernen"},
       {known: "one should try", target: "man soll versuchen"},
       {known: "one must go", target: "man muss gehen"}
     ],
     use: [
       {known: "one can learn something new and interesting every single day", target: "man kann jeden tag etwas neues und interessantes lernen"},
       {known: "how can one find the best way to learn a new language", target: "wie kann man den besten weg finden eine neue sprache zu lernen"},
       {known: "one should not forget to take time for something fun", target: "man soll nicht vergessen sich zeit für etwas spaß zu nehmen"},
       {known: "I think one must try to speak much more often than before", target: "ich denke man muss versuchen viel öfter zu sprechen als vorher"},
       {known: "one can feel so much better after a good conversation", target: "man kann sich so viel besser fühlen nach einem guten gespräch"},
       {known: "one should always listen more than one speaks to learn well", target: "man soll immer mehr hören als man spricht um gut zu lernen"},
       {known: "sometimes one has to wait before one can start something new", target: "manchmal muss man warten bevor man etwas neues anfangen kann"},
       {known: "one never knows what might happen if one tries something different", target: "man weiß nie was passieren könnte wenn man etwas anderes versucht"}
     ]}
  ];

  console.log('Submitting batch 1 (3 LEGOs: S53, S56x2)...');
  const r1 = await post({phrases: allPhrases});
  console.log('Batch 1:', r1.phrases_inserted, 'inserted,', (r1.errors||[]).length, 'errors');
  if (r1.errors && r1.errors.length > 0) {
    for (const e of r1.errors) console.log('  ERROR:', e.entry, e.error);
  }

  // Batch 2
  const batch2 = [
    // S80 L1 (M): long target
    {seed_number: 80, lego_index: 1,
     build: [
       {known: "I am not sure when I will be ready to start", target: "ich bin nicht sicher wann ich bereit sein werde anzufangen"},
       {known: "I am not sure when I will be ready for it", target: "ich bin nicht sicher wann ich bereit sein werde dafür"},
       {known: "I am not sure when I will be ready to try again", target: "ich bin nicht sicher wann ich bereit sein werde es wieder zu versuchen"}
     ],
     use: [
       {known: "I told her that I am not sure when I will be ready to go", target: "ich habe ihr gesagt dass ich bin nicht sicher wann ich bereit sein werde zu gehen"},
       {known: "he asked me and I said I am not sure when I will be ready", target: "er hat mich gefragt und ich sagte ich bin nicht sicher wann ich bereit sein werde"},
       {known: "I am not sure when I will be ready but I want to try soon", target: "ich bin nicht sicher wann ich bereit sein werde aber ich will es bald versuchen"},
       {known: "she knows that I am not sure when I will be ready to start", target: "sie weiß dass ich bin nicht sicher wann ich bereit sein werde anzufangen"},
       {known: "I am not sure when I will be ready to speak with them about it", target: "ich bin nicht sicher wann ich bereit sein werde mit ihnen darüber zu sprechen"},
       {known: "I am not sure when I will be ready because I still need more time", target: "ich bin nicht sicher wann ich bereit sein werde weil ich noch mehr zeit brauche"},
       {known: "I am not sure when I will be ready but it should not take long", target: "ich bin nicht sicher wann ich bereit sein werde aber es sollte nicht lange dauern"},
       {known: "we all know that I am not sure when I will be ready for this", target: "wir alle wissen dass ich bin nicht sicher wann ich bereit sein werde dafür"}
     ]},

    // S93 L1 (M): "time to go" → "Zeit zu gehen"
    {seed_number: 93, lego_index: 1,
     build: [
       {known: "it is time to go now", target: "es ist jetzt zeit zu gehen"},
       {known: "it was time to go home", target: "es war zeit zu gehen nach hause"},
       {known: "almost time to go", target: "fast zeit zu gehen"}
     ],
     use: [
       {known: "I think it is time to go if we want to arrive early", target: "ich denke es ist zeit zu gehen wenn wir früh ankommen wollen"},
       {known: "she said it was time to go but I wanted to stay longer here", target: "sie sagte es war zeit zu gehen aber ich wollte hier länger bleiben"},
       {known: "is it already time to go or can we stay a bit longer", target: "ist es schon zeit zu gehen oder können wir noch ein bisschen bleiben"},
       {known: "he told me it was time to go and that I should hurry", target: "er hat mir gesagt es war zeit zu gehen und dass ich mich beeilen soll"},
       {known: "we know it is time to go but nobody wants to leave yet", target: "wir wissen es ist zeit zu gehen aber niemand will noch gehen"},
       {known: "it was almost time to go when she finally arrived at the door", target: "es war fast zeit zu gehen als sie endlich an der tür angekommen ist"},
       {known: "I feel it is time to go because it is getting very late now", target: "ich fühle es ist zeit zu gehen weil es jetzt sehr spät wird"},
       {known: "he did not notice that it was already time to go home", target: "er hat nicht bemerkt dass es schon zeit zu gehen nach hause war"}
     ]}
  ];

  console.log('Submitting batch 2 (2 LEGOs: S80, S93)...');
  const r2 = await post({phrases: batch2});
  console.log('Batch 2:', r2.phrases_inserted, 'inserted,', (r2.errors||[]).length, 'errors');
  if (r2.errors && r2.errors.length > 0) {
    for (const e of r2.errors) console.log('  ERROR:', e.entry, e.error);
  }

  // Batch 3: S103, S126, S129
  const batch3 = [
    {seed_number: 103, lego_index: 1,
     build: [
       {known: "so many things", target: "so viel sachen"},
       {known: "much more", target: "viel mehr"},
       {known: "too much work", target: "zu viel arbeit"}
     ],
     use: [
       {known: "there is so much that I still want to learn about this language", target: "es gibt so viel das ich noch über diese sprache lernen will"},
       {known: "I have so much to do today that I cannot come to the meeting", target: "ich habe so viel zu tun heute dass ich nicht zum treffen kommen kann"},
       {known: "she told me there is much more to learn if we keep trying", target: "sie hat mir gesagt es gibt viel mehr zu lernen wenn wir weitermachen"},
       {known: "I did not expect there to be so much to understand about it", target: "ich habe nicht erwartet dass es so viel darüber zu verstehen gibt"},
       {known: "you have learned so much already and I am really proud of you", target: "du hast schon so viel gelernt und ich bin wirklich stolz auf dich"},
       {known: "we have so much time tomorrow to practice speaking together", target: "wir haben morgen so viel zeit um zusammen sprechen zu üben"},
       {known: "there is not much we can do about it right now unfortunately", target: "es gibt leider nicht viel das wir gerade darüber tun können"},
       {known: "how much do you think we still need to learn before we are ready", target: "wie viel denkst du müssen wir noch lernen bevor wir bereit sind"}
     ]},
    {seed_number: 126, lego_index: 2,
     build: [
       {known: "everything has changed", target: "alles hat sich verändert"},
       {known: "nothing has changed", target: "nichts hat sich verändert"},
       {known: "something changed", target: "etwas hat sich verändert"}
     ],
     use: [
       {known: "everything has changed since we started learning together last year", target: "alles hat sich verändert seit wir letztes jahr zusammen angefangen haben zu lernen"},
       {known: "the way she speaks has really changed over the last few months", target: "die art wie sie spricht hat sich wirklich verändert in den letzten monaten"},
       {known: "nothing has changed and I still feel the same way about it", target: "nichts hat sich verändert und ich fühle mich immer noch gleich darüber"},
       {known: "something has changed but I am not sure what exactly it is", target: "etwas hat sich verändert aber ich bin nicht sicher was genau es ist"},
       {known: "a lot has changed since we last spoke about this important topic", target: "viel hat sich verändert seit wir das letzte mal über dieses wichtige thema gesprochen haben"},
       {known: "his way of thinking has completely changed since he started working", target: "seine art zu denken hat sich komplett verändert seit er angefangen hat zu arbeiten"},
       {known: "I noticed that her attitude has changed since that interesting conversation", target: "ich habe bemerkt dass sich ihre einstellung verändert hat seit dem interessanten gespräch"},
       {known: "everything has changed so fast that I cannot keep up with it", target: "alles hat sich so schnell verändert dass ich nicht mithalten kann"}
     ]},
    {seed_number: 129, lego_index: 2,
     build: [
       {known: "that you are doing so well", target: "dass du es so gut machst"},
       {known: "you are doing so well here", target: "du es so gut machst hier"},
       {known: "I see you are doing so well", target: "ich sehe du es so gut machst"}
     ],
     use: [
       {known: "I am glad to see that you are doing so well with the learning", target: "ich bin froh zu sehen dass du es so gut machst mit dem lernen"},
       {known: "she told me that you are doing so well at your new work", target: "sie hat mir gesagt dass du es so gut machst bei deiner neuen arbeit"},
       {known: "everyone can see that you are doing so well with German now", target: "alle können sehen dass du es so gut machst mit deutsch jetzt"},
       {known: "I always knew that you are doing so well because you try hard", target: "ich habe immer gewusst dass du es so gut machst weil du hart arbeitest"},
       {known: "it makes me happy that you are doing so well in everything", target: "es macht mich glücklich dass du es so gut machst in allem"},
       {known: "I heard that you are doing so well that they want you to stay", target: "ich habe gehört dass du es so gut machst dass sie wollen dass du bleibst"},
       {known: "she is surprised that you are doing so well after such a short time", target: "sie ist überrascht dass du es so gut machst nach so kurzer zeit"},
       {known: "we all know that you are doing so well with your studies", target: "wir alle wissen dass du es so gut machst mit deinem lernen"}
     ]}
  ];

  console.log('Submitting batch 3 (3 LEGOs: S103, S126, S129)...');
  const r3 = await post({phrases: batch3});
  console.log('Batch 3:', r3.phrases_inserted, 'inserted,', (r3.errors||[]).length, 'errors');
  if (r3.errors && r3.errors.length > 0) {
    for (const e of r3.errors) console.log('  ERROR:', e.entry, e.error);
  }

  // Batch 4: S160, S171, S185
  const batch4 = [
    {seed_number: 160, lego_index: 1,
     build: [
       {known: "how do you say that", target: "wie sagt man das"},
       {known: "how do you say it here", target: "wie sagt man es hier"},
       {known: "how do you say this word", target: "wie sagt man dieses wort"}
     ],
     use: [
       {known: "how do you say this word in German when you are at work", target: "wie sagt man dieses wort auf deutsch wenn man bei der arbeit ist"},
       {known: "I always wonder how do you say things like that so naturally", target: "ich frage mich immer wie sagt man solche sachen so natürlich"},
       {known: "can you tell me how do you say that in a simpler way", target: "kannst du mir sagen wie sagt man das auf eine einfachere art"},
       {known: "how do you say something when you want to be more polite about it", target: "wie sagt man etwas wenn man höflicher darüber sein will"},
       {known: "he asked me how do you say goodbye in German but I forgot", target: "er hat mich gefragt wie sagt man auf deutsch tschüss aber ich habe es vergessen"},
       {known: "I never know how do you say the right thing at the right moment", target: "ich weiß nie wie sagt man das richtige im richtigen moment"},
       {known: "she wanted to know how do you say thank you in many languages", target: "sie wollte wissen wie sagt man danke in vielen sprachen"},
       {known: "how do you say it differently if you want to sound more natural", target: "wie sagt man es anders wenn man natürlicher klingen will"}
     ]},
    {seed_number: 171, lego_index: 1,
     build: [
       {known: "she asked me to help", target: "sie hat gebeten dass ich helfe"},
       {known: "he wants me to come", target: "er will dass ich komme"},
       {known: "they told me to wait", target: "sie sagten dass ich warten soll"}
     ],
     use: [
       {known: "she asked me to help her with her work tomorrow morning", target: "sie hat mich gebeten dass ich ihr morgen früh bei der arbeit helfe"},
       {known: "he wanted me to come earlier but I was not ready yet then", target: "er wollte dass ich früher komme aber ich war noch nicht bereit"},
       {known: "they expected me to learn this all before the meeting next week", target: "sie haben erwartet dass ich das alles vor dem treffen nächste woche lerne"},
       {known: "my friend told me to try something new and I think he is right", target: "mein freund hat mir gesagt dass ich etwas neues versuchen soll und ich denke er hat recht"},
       {known: "she asked me to speak more slowly so she could understand better", target: "sie hat mich gebeten dass ich langsamer spreche damit sie besser verstehen kann"},
       {known: "he wanted me to explain everything one more time from the beginning", target: "er wollte dass ich alles noch einmal von anfang an erkläre"},
       {known: "they need me to finish this before we can start with the next part", target: "sie brauchen dass ich das fertig mache bevor wir mit dem nächsten teil anfangen können"},
       {known: "she told me to wait but I could not stay any longer at that place", target: "sie hat mir gesagt dass ich warten soll aber ich konnte nicht länger an diesem ort bleiben"}
     ]},
    {seed_number: 185, lego_index: 1,
     build: [
       {known: "I am at work now", target: "ich bin jetzt bei der arbeit"},
       {known: "busy at work today", target: "heute beschäftigt bei der arbeit"},
       {known: "she is still at work", target: "sie ist noch bei der arbeit"}
     ],
     use: [
       {known: "I always feel much better when I am at work with my good friends", target: "ich fühle mich immer viel besser wenn ich bei der arbeit mit meinen guten freunden bin"},
       {known: "something really interesting happened at work that I want to tell you", target: "etwas wirklich interessantes ist bei der arbeit passiert das ich dir sagen will"},
       {known: "she learned so much at work that she now speaks much better German", target: "sie hat so viel bei der arbeit gelernt dass sie jetzt viel besser deutsch spricht"},
       {known: "he spends too much time at work and does not have time for friends", target: "er verbringt zu viel zeit bei der arbeit und hat keine zeit für freunde"},
       {known: "I met someone new at work who wants to learn German with me", target: "ich habe jemanden neues bei der arbeit getroffen der mit mir deutsch lernen will"},
       {known: "we always speak German at work because it helps us learn faster", target: "wir sprechen immer deutsch bei der arbeit weil es uns hilft schneller zu lernen"},
       {known: "things are going very well at work and I am happy about that", target: "es läuft sehr gut bei der arbeit und ich bin froh darüber"},
       {known: "she told me that at work everyone was talking about the same thing", target: "sie hat mir gesagt dass bei der arbeit alle über das gleiche geredet haben"}
     ]}
  ];

  console.log('Submitting batch 4 (3 LEGOs: S160, S171, S185)...');
  const r4 = await post({phrases: batch4});
  console.log('Batch 4:', r4.phrases_inserted, 'inserted,', (r4.errors||[]).length, 'errors');
  if (r4.errors && r4.errors.length > 0) {
    for (const e of r4.errors) console.log('  ERROR:', e.entry, e.error);
  }

  // Batch 5: S190x2, S205, S212
  const batch5 = [
    {seed_number: 190, lego_index: 1,
     build: [
       {known: "do you mind if I ask", target: "macht es dir etwas aus wenn ich frage"},
       {known: "do you mind waiting", target: "macht es dir etwas aus zu warten"},
       {known: "do you mind helping me", target: "macht es dir etwas aus mir zu helfen"}
     ],
     use: [
       {known: "do you mind if I ask you something about your new work today", target: "macht es dir etwas aus wenn ich dich heute etwas über deine neue arbeit frage"},
       {known: "do you mind waiting a moment while I finish writing this letter", target: "macht es dir etwas aus einen moment zu warten während ich diesen brief fertig schreibe"},
       {known: "do you mind if we speak German together for a while right now", target: "macht es dir etwas aus wenn wir jetzt eine weile zusammen deutsch sprechen"},
       {known: "do you mind telling me what happened at the meeting yesterday", target: "macht es dir etwas aus mir zu sagen was gestern beim treffen passiert ist"},
       {known: "do you mind coming a bit earlier tomorrow so we have more time", target: "macht es dir etwas aus morgen ein bisschen früher zu kommen damit wir mehr zeit haben"},
       {known: "do you mind if I try to explain it in a different way this time", target: "macht es dir etwas aus wenn ich versuche es dieses mal auf eine andere art zu erklären"},
       {known: "do you mind helping me understand this because it is quite difficult", target: "macht es dir etwas aus mir zu helfen das zu verstehen weil es ziemlich schwierig ist"},
       {known: "do you mind if we go now because it is getting very late already", target: "macht es dir etwas aus wenn wir jetzt gehen weil es schon sehr spät wird"}
     ]},
    {seed_number: 190, lego_index: 3,
     build: [
       {known: "I have some questions", target: "ich habe ein paar fragen"},
       {known: "she asked some questions", target: "sie hat ein paar fragen gestellt"},
       {known: "just a few questions", target: "nur ein paar fragen"}
     ],
     use: [
       {known: "I have some questions about what we learned yesterday in class", target: "ich habe ein paar fragen über das was wir gestern gelernt haben"},
       {known: "she wanted to ask some questions before we start the new meeting", target: "sie wollte ein paar fragen stellen bevor wir das neue treffen anfangen"},
       {known: "can I ask you some questions about how to learn German faster", target: "kann ich dir ein paar fragen stellen darüber wie man schneller deutsch lernt"},
       {known: "he always has some questions when we finish the lesson together", target: "er hat immer ein paar fragen wenn wir die lektion zusammen fertig machen"},
       {known: "I wrote down some questions that I want to ask you about later", target: "ich habe ein paar fragen aufgeschrieben die ich dich später fragen will"},
       {known: "there are some questions that nobody seems to be able to answer here", target: "es gibt ein paar fragen die hier niemand beantworten kann"},
       {known: "she told me she still has some questions about how it all works", target: "sie hat mir gesagt sie hat noch ein paar fragen darüber wie das alles funktioniert"},
       {known: "we should prepare some questions before we go to the meeting tomorrow", target: "wir sollten ein paar fragen vorbereiten bevor wir morgen zum treffen gehen"}
     ]},
    {seed_number: 205, lego_index: 3,
     build: [
       {known: "what I was trying to say was", target: "das ich sagen wollte war"},
       {known: "it is what I was trying to say", target: "es ist das ich sagen wollte"},
       {known: "that is exactly what I was trying to say", target: "das ist genau das ich sagen wollte"}
     ],
     use: [
       {known: "the thing I was trying to say is that we need much more time", target: "das ich sagen wollte ist dass wir viel mehr zeit brauchen"},
       {known: "I forgot what I was trying to say because you interrupted me then", target: "ich habe vergessen das ich sagen wollte weil du mich dann unterbrochen hast"},
       {known: "she understood what I was trying to say even without using many words", target: "sie hat verstanden das ich sagen wollte auch ohne viele wörter zu benutzen"},
       {known: "what I was trying to say all along is that it was not so easy", target: "das ich sagen wollte die ganze zeit ist dass es nicht so einfach war"},
       {known: "he did not understand what I was trying to say about the problem", target: "er hat nicht verstanden das ich sagen wollte über das problem"},
       {known: "what I was trying to say got lost because everyone started talking at once", target: "das ich sagen wollte ging verloren weil alle gleichzeitig angefangen haben zu reden"},
       {known: "I finally said what I was trying to say and everyone agreed with me", target: "ich habe endlich das ich sagen wollte gesagt und alle haben mir zugestimmt"},
       {known: "nobody listened to what I was trying to say during the meeting yesterday", target: "niemand hat zugehört das ich sagen wollte während dem treffen gestern"}
     ]},
    {seed_number: 212, lego_index: 1,
     build: [
       {known: "to ask for help", target: "um hilfe bitten"},
       {known: "to ask for more time", target: "um mehr zeit bitten"},
       {known: "to ask for something", target: "um etwas bitten"}
     ],
     use: [
       {known: "I wanted to ask for help but I did not know who to call then", target: "ich wollte um hilfe bitten aber ich wusste nicht wen ich dann anrufen soll"},
       {known: "she does not like to ask for help even when she really needs it", target: "sie mag es nicht um hilfe bitten auch wenn sie es wirklich braucht"},
       {known: "sometimes you have to ask for more time to finish everything well", target: "manchmal muss man um mehr zeit bitten um alles gut fertig zu machen"},
       {known: "he wanted to ask for something but he was too tired to try it", target: "er wollte um etwas bitten aber er war zu müde es zu versuchen"},
       {known: "I will ask for help tomorrow if I still cannot do it alone then", target: "ich werde morgen um hilfe bitten wenn ich es dann immer noch nicht allein kann"},
       {known: "we should ask for help before it gets much more difficult for us", target: "wir sollten um hilfe bitten bevor es für uns viel schwieriger wird"},
       {known: "it is not always easy to ask for exactly what you really need", target: "es ist nicht immer leicht um genau das zu bitten was man wirklich braucht"},
       {known: "they told me I should ask for more time if I still need it", target: "sie haben mir gesagt ich soll um mehr zeit bitten wenn ich es noch brauche"}
     ]}
  ];

  console.log('Submitting batch 5 (4 LEGOs: S190x2, S205, S212)...');
  const r5 = await post({phrases: batch5});
  console.log('Batch 5:', r5.phrases_inserted, 'inserted,', (r5.errors||[]).length, 'errors');
  if (r5.errors && r5.errors.length > 0) {
    for (const e of r5.errors) console.log('  ERROR:', e.entry, e.error);
  }

  // Batch 6: S231, S269
  const batch6 = [
    {seed_number: 231, lego_index: 2,
     build: [
       {known: "a man who works here", target: "ein mann der hier arbeitet"},
       {known: "someone who can help", target: "jemand der helfen kann"},
       {known: "the friend who called", target: "der freund der angerufen hat"}
     ],
     use: [
       {known: "the man who works with my friend speaks very good German every day", target: "der mann der mit meinem freund arbeitet spricht jeden tag sehr gut deutsch"},
       {known: "I know someone who can help you with this difficult problem tomorrow", target: "ich kenne jemanden der dir morgen mit diesem schwierigen problem helfen kann"},
       {known: "the friend who told me about it was not sure if it was true", target: "der freund der mir davon gesagt hat war nicht sicher ob es wahr war"},
       {known: "there is a man who wants to learn German but never has time for it", target: "es gibt einen mann der deutsch lernen will aber nie zeit dafür hat"},
       {known: "I met someone who said the same thing about this place last week", target: "ich habe jemanden getroffen der letzte woche das gleiche über diesen ort gesagt hat"},
       {known: "a friend who I have not seen for a long time finally called me today", target: "ein freund der mich lange nicht gesehen hat hat mich heute endlich angerufen"},
       {known: "do you know the person who left this message for you on the table", target: "kennst du die person der diese nachricht für dich auf dem tisch gelassen hat"},
       {known: "the man who came yesterday wanted to ask you something very important", target: "der mann der gestern gekommen ist wollte dich etwas sehr wichtiges fragen"}
     ]},
    {seed_number: 269, lego_index: 1,
     build: [
       {known: "to wait for the bus", target: "auf den bus warten auf"},
       {known: "we have to wait for", target: "wir müssen warten auf"},
       {known: "to wait for an answer", target: "auf eine antwort warten auf"}
     ],
     use: [
       {known: "I do not want to wait for them any longer because I am tired now", target: "ich will nicht mehr auf sie warten auf sie weil ich jetzt müde bin"},
       {known: "sometimes you have to wait for the right moment to say something", target: "manchmal muss man auf den richtigen moment warten auf den richtigen moment zu sagen"},
       {known: "she told me to wait for her answer before I make my decision", target: "sie hat mir gesagt ich soll auf ihre antwort warten auf ihre antwort bevor ich mich entscheide"},
       {known: "we had to wait for a long time before someone finally came to help", target: "wir mussten lange warten auf jemanden der endlich gekommen ist um zu helfen"},
       {known: "I am willing to wait for you if you need a little bit more time", target: "ich bin bereit auf dich zu warten auf dich wenn du noch ein bisschen mehr zeit brauchst"},
       {known: "he does not like to wait for things because he is very impatient", target: "er mag es nicht auf sachen zu warten auf sachen weil er sehr ungeduldig ist"},
       {known: "to wait for the right opportunity takes a lot of patience sometimes", target: "auf die richtige gelegenheit zu warten auf die richtige gelegenheit braucht manchmal viel geduld"},
       {known: "they asked us to wait for the results before making any big plans", target: "sie haben uns gebeten auf die ergebnisse zu warten auf die ergebnisse bevor wir große pläne machen"}
     ]}
  ];

  console.log('Submitting batch 6 (2 LEGOs: S231, S269)...');
  const r6 = await post({phrases: batch6});
  console.log('Batch 6:', r6.phrases_inserted, 'inserted,', (r6.errors||[]).length, 'errors');
  if (r6.errors && r6.errors.length > 0) {
    for (const e of r6.errors) console.log('  ERROR:', e.entry, e.error);
  }

  // Final stats
  console.log('\n=== DONE ===');
  const total = (r1.phrases_inserted||0) + (r2.phrases_inserted||0) + (r3.phrases_inserted||0) + (r4.phrases_inserted||0) + (r5.phrases_inserted||0) + (r6.phrases_inserted||0);
  console.log('Total phrases inserted:', total);
})();
