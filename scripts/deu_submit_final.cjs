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
  const phrases = [
    // S53 L1 (A): "she wanted" → "sie wollte" | Need 5 USE
    {seed_number: 53, lego_index: 1, build: [], use: [
      {known: "I think she wanted to learn more about it", target: "ich denke sie wollte mehr darüber lernen"},
      {known: "she wanted to start early in the morning", target: "sie wollte früh am morgen anfangen"},
      {known: "do you know what she wanted to say to us", target: "weißt du was sie wollte uns sagen"},
      {known: "she wanted to find a better way to learn", target: "sie wollte einen besseren weg finden zu lernen"},
      {known: "I believe she wanted to speak with you later", target: "ich glaube sie wollte später mit dir sprechen"}
    ]},
    // S56 L2 (A): "myself" → "mich" | Need 1 USE
    {seed_number: 56, lego_index: 2, build: [], use: [
      {known: "I wanted to prepare myself for the meeting tomorrow", target: "ich wollte mich auf das treffen morgen vorbereiten"}
    ]},
    // S56 L3 (A): "one" → "man" | Need 5 USE
    {seed_number: 56, lego_index: 3, build: [], use: [
      {known: "one can learn something new every day", target: "man kann jeden tag etwas neues lernen"},
      {known: "how can one find a good way to learn", target: "wie kann man einen guten weg finden zu lernen"},
      {known: "one should not forget to take a break sometimes", target: "man soll nicht vergessen sich manchmal eine pause zu geben"},
      {known: "I think one must try to speak more often", target: "ich denke man muss versuchen öfter zu sprechen"},
      {known: "one can feel much better after learning something", target: "man kann sich viel besser fühlen nach dem lernen"}
    ]},
    // S80 L1 (M): "I'm not sure when I'll be ready" → "Ich bin nicht sicher, wann ich bereit sein werde" | Need 5 USE
    {seed_number: 80, lego_index: 1, build: [], use: [
      {known: "I told her I am not sure when I will be ready", target: "ich habe ihr gesagt ich bin nicht sicher wann ich bereit sein werde"},
      {known: "he asked me and I said I am not sure when I will be ready", target: "er hat mich gefragt und ich habe gesagt ich bin nicht sicher wann ich bereit sein werde"},
      {known: "I am not sure when I will be ready but I will try", target: "ich bin nicht sicher wann ich bereit sein werde aber ich werde versuchen"},
      {known: "she knows I am not sure when I will be ready to start", target: "sie weiß ich bin nicht sicher wann ich bereit sein werde anzufangen"},
      {known: "I am not sure when I will be ready to speak with them", target: "ich bin nicht sicher wann ich bereit sein werde mit ihnen zu sprechen"}
    ]},
    // S93 L1 (M): "time to go" → "Zeit zu gehen" | Need 7 USE
    {seed_number: 93, lego_index: 1, build: [], use: [
      {known: "I think it is time to go if we want to be there early", target: "ich denke es ist zeit zu gehen wenn wir früh dort sein wollen"},
      {known: "she said it was time to go but I wanted to stay longer", target: "sie hat gesagt es war zeit zu gehen aber ich wollte länger bleiben"},
      {known: "is it already time to go or can we stay a bit more", target: "ist es schon zeit zu gehen oder können wir noch ein bisschen bleiben"},
      {known: "he told me it was time to go and I should hurry", target: "er hat mir gesagt es war zeit zu gehen und ich soll mich beeilen"},
      {known: "we know it is time to go but we do not want to leave", target: "wir wissen es ist zeit zu gehen aber wir wollen nicht gehen"},
      {known: "it was almost time to go when she finally arrived", target: "es war fast zeit zu gehen als sie endlich angekommen ist"},
      {known: "I feel it is time to go because it is getting late", target: "ich fühle es ist zeit zu gehen weil es spät wird"}
    ]},
    // S103 L1 (A): "many" → "viel" | Need 1 USE
    {seed_number: 103, lego_index: 1, build: [], use: [
      {known: "there is so much that I still want to learn about this", target: "es gibt so viel das ich noch darüber lernen will"}
    ]},
    // S126 L2 (A): "changing" → "verändert" | Need 4 USE
    {seed_number: 126, lego_index: 2, build: [], use: [
      {known: "everything has changed since we started learning together", target: "alles hat sich verändert seit wir zusammen angefangen haben zu lernen"},
      {known: "the way she speaks has really changed over the last months", target: "die art wie sie spricht hat sich wirklich verändert in den letzten monaten"},
      {known: "nothing has changed and I still feel the same about it", target: "nichts hat sich verändert und ich fühle mich noch gleich darüber"},
      {known: "something has changed but I am not sure what it is", target: "etwas hat sich verändert aber ich bin nicht sicher was es ist"}
    ]},
    // S129 L2 (M): "you are doing so well" → "du es so gut machst" | Need 4 USE
    {seed_number: 129, lego_index: 2, build: [], use: [
      {known: "I am glad that you are doing so well with your learning", target: "ich bin froh dass du es so gut machst mit deinem lernen"},
      {known: "she told me that you are doing so well at work", target: "sie hat mir gesagt dass du es so gut machst bei der arbeit"},
      {known: "everyone can see that you are doing so well right now", target: "alle können sehen dass du es so gut machst gerade jetzt"},
      {known: "I knew that you are doing so well because you try hard", target: "ich wusste dass du es so gut machst weil du hart arbeitest"}
    ]}
  ];

  // Submit batch 1
  console.log('Submitting batch 1 (8 LEGOs)...');
  const r1 = await post({phrases});
  console.log('Result:', JSON.stringify(r1).slice(0, 500));

  // Batch 2
  const phrases2 = [
    // S160 L1 (M): "how do you say" → "wie sagt man" | Need 3 USE
    {seed_number: 160, lego_index: 1, build: [], use: [
      {known: "how do you say this word in German when you are at work", target: "wie sagt man dieses wort auf deutsch wenn man bei der arbeit ist"},
      {known: "I always wonder how do you say things like that naturally", target: "ich frage mich immer wie sagt man solche sachen natürlich"},
      {known: "can you tell me how do you say that in a simple way", target: "kannst du mir sagen wie sagt man das auf eine einfache art"}
    ]},
    // S171 L1 (M): "me to" → "dass ich" | Need 3 USE
    {seed_number: 171, lego_index: 1, build: [], use: [
      {known: "she asked me to help her with her new project tomorrow", target: "sie hat mich gebeten dass ich ihr morgen mit ihrem neuen projekt helfe"},
      {known: "he wanted me to come earlier but I was not ready yet", target: "er wollte dass ich früher komme aber ich war noch nicht bereit"},
      {known: "they expect me to learn this before the meeting next week", target: "sie erwarten dass ich das vor dem treffen nächste woche lerne"}
    ]},
    // S185 L1 (M): "at work" → "bei der Arbeit" | Need 3 USE
    {seed_number: 185, lego_index: 1, build: [], use: [
      {known: "I always feel much better when I am at work with my friends", target: "ich fühle mich immer viel besser wenn ich bei der arbeit mit meinen freunden bin"},
      {known: "something interesting happened at work that I want to tell you about", target: "etwas interessantes ist bei der arbeit passiert das ich dir erzählen will"},
      {known: "she learned a lot at work and now she speaks much better", target: "sie hat viel bei der arbeit gelernt und jetzt spricht sie viel besser"}
    ]},
    // S190 L1 (M): "do you mind" → "macht es dir etwas aus" | Need 2 USE
    {seed_number: 190, lego_index: 1, build: [], use: [
      {known: "do you mind if I ask you something about your new job", target: "macht es dir etwas aus wenn ich dich etwas über deine neue arbeit frage"},
      {known: "do you mind waiting a moment while I finish writing this", target: "macht es dir etwas aus einen moment zu warten während ich das fertig schreibe"}
    ]},
    // S190 L3 (M): "some questions" → "ein paar Fragen" | Need 3 USE
    {seed_number: 190, lego_index: 3, build: [], use: [
      {known: "I have some questions about what we learned yesterday", target: "ich habe ein paar fragen über das was wir gestern gelernt haben"},
      {known: "she wanted to ask some questions before we start the meeting", target: "sie wollte ein paar fragen stellen bevor wir das treffen anfangen"},
      {known: "can I ask you some questions about how to learn faster", target: "kann ich dir ein paar fragen stellen über wie man schneller lernt"}
    ]},
    // S205 L3 (M): "I was trying to say" → "das ich sagen wollte" | Need 3 USE
    {seed_number: 205, lego_index: 3, build: [], use: [
      {known: "what I was trying to say is that we need more time", target: "das ich sagen wollte ist dass wir mehr zeit brauchen"},
      {known: "I forgot what I was trying to say because you interrupted me", target: "ich habe vergessen das ich sagen wollte weil du mich unterbrochen hast"},
      {known: "she understood what I was trying to say even without many words", target: "sie hat verstanden das ich sagen wollte auch ohne viele wörter"}
    ]},
    // S212 L1 (M): "to ask for" → "um bitten" | Need 3B + 8U
    {seed_number: 212, lego_index: 1, build: [
      {known: "to ask for help", target: "um hilfe bitten"},
      {known: "to ask for more time", target: "um mehr zeit bitten"},
      {known: "to ask for it", target: "darum bitten"}
    ], use: [
      {known: "I wanted to ask for help but I did not know who to call", target: "ich wollte um hilfe bitten aber ich wusste nicht wen ich anrufen soll"},
      {known: "she does not like to ask for help even when she needs it", target: "sie mag es nicht um hilfe bitten auch wenn sie es braucht"},
      {known: "sometimes you have to ask for more time to finish everything", target: "manchmal muss man um mehr zeit bitten um alles fertig zu machen"},
      {known: "he wanted to ask for something but he was too tired to try", target: "er wollte um etwas bitten aber er war zu müde um es zu versuchen"},
      {known: "I will ask for help tomorrow if I still cannot do it alone", target: "ich werde morgen um hilfe bitten wenn ich es immer noch nicht allein machen kann"},
      {known: "we should ask for help before it gets more difficult for us", target: "wir sollten um hilfe bitten bevor es schwieriger für uns wird"},
      {known: "it is not always easy to ask for what you really need", target: "es ist nicht immer leicht um das zu bitten was man wirklich braucht"},
      {known: "they told me I should ask for more time if I need it", target: "sie haben mir gesagt ich soll um mehr zeit bitten wenn ich es brauche"}
    ]},
    // S231 L2 (A): "who" → "der" | Need 7 USE
    {seed_number: 231, lego_index: 2, build: [], use: [
      {known: "the man who works with my friend speaks very good German", target: "der mann der mit meinem freund arbeitet spricht sehr gut deutsch"},
      {known: "I know someone who can help you with this problem tomorrow", target: "ich kenne jemanden der dir morgen mit diesem problem helfen kann"},
      {known: "the friend who told me about it was not sure if it was true", target: "der freund der mir davon erzählt hat war nicht sicher ob es wahr ist"},
      {known: "there is a man who wants to learn German but has no time", target: "es gibt einen mann der deutsch lernen will aber keine zeit hat"},
      {known: "the person who was here yesterday left something for you", target: "die person der gestern hier war hat etwas für dich gelassen"},
      {known: "I met someone who said the same thing about this place", target: "ich habe jemanden getroffen der das gleiche über diesen ort gesagt hat"},
      {known: "a friend who I have not seen for a long time called me today", target: "ein freund der ich lange nicht gesehen habe hat mich heute angerufen"}
    ]},
    // S269 L1 (M): "to wait for" → "warten auf" | Need 1 USE
    {seed_number: 269, lego_index: 1, build: [], use: [
      {known: "I do not like to wait for someone who is always late", target: "ich mag es nicht auf jemanden zu warten auf den man immer warten muss"}
    ]}
  ];

  console.log('Submitting batch 2 (9 LEGOs)...');
  const r2 = await post({phrases: phrases2});
  console.log('Result:', JSON.stringify(r2).slice(0, 500));
})();
