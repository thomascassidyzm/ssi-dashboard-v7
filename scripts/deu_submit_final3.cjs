const http = require('http');

// Full 554-word vocab set
const VOCAB = new Set(`abend,aber,alleine,allen,alles,als,also,alte,alten,alter,am,an,andere,anderem,anderen,anderes,anders,anfang,anfange,anfangen,anfängst,angefangen,antwort,antworte,antworten,anzufangen,anzufühlen,anzurufen,arbeit,arbeiten,arbeitet,arzt,auf,aufgeregt,aufgewacht,aufhören,aufpassen,aufregend,aufzuhören,aufzuwachen,aus,ausgegangen,ausmacht,auto,bald,beantworten,bei,beim,benutzt,bereit,beschäftigt,besprechen,besser,beste,bestellen,bestes,bevor,bezahlen,bin,bis,bisher,bisschen,bist,bitte,bitten,blaue,bleiben,brauche,brauchen,brauchst,brief,bringen,bruder,buch,bus,büro,da,dachte,damit,danach,dank,dankbar,danke,dann,darauf,darüber,das,dass,definitiv,dein,deine,deinem,deinen,deiner,dem,den,denke,denken,denkst,der,des,deshalb,deutsch,dich,die,diese,dieser,dieses,ding,dir,drüben,du,e-mails,egal,ein,einander,eine,einem,einen,einer,einfach,einmal,einzige,entspannen,er,erinnern,erklären,erledigen,erreichen,erwartet,es,essen,etwas,fahren,fand,fast,fehler,fern,ferngesehen,fernsehen,fertig,film,finden,fing,form,frage,fragen,frau,freue,freund,freunde,freunden,freundin,froh,früh,früher,funktionieren,funktioniert,fußball,fährst,fängt,fühle,fühlen,fühlst,führen,für,ganzen,gearbeitet,geben,geduldig,gefühl,gefühlt,gehen,gehirn,gehirns,gehofft,geholfen,gehst,gehört,gelassen,geld,gelegenheit,gelernt,gemacht,gemeinde,genau,genug,gerade,geredet,geringste,gern,gesagt,geschaut,geschichte,geschickt,geschlafen,gesehen,gespräch,gestern,getroffen,getrunken,gewusst,gibt,glaube,gleiche,gleichzeitig,gläser,glücklich,gruppe,gut,gute,habe,haben,halb,hart,hast,hat,hatte,hattest,hause,heißt,helfe,helfen,herausfinden,herauszufinden,herumschwirren,heute,hier,hilfe,hilfreich,hilfst,hilft,hoffe,hofften,hund,hälfte,hätte,hören,ich,idee,ideen,ihm,ihn,ihnen,ihr,ihre,ihren,im,in,interessant,interessante,interessantes,irgendwo,ist,ja,jahr,jemand,jemanden,jetzt,junge,jungen,kaffee,kann,kannst,kannte,kein,keine,kenne,kennen,kennst,kennt,klingt,kneipe,kommen,konnte,kopf,kurzer,können,könnte,könntest,lange,langsamer,lass,lassen,lehrer,leicht,leichter,leid,leider,lerne,lernen,lernst,lernt,lesen,letzte,letzten,leute,leuten,liest,länger,läuft,mache,machen,machst,macht,mag,mal,man,mann,mehr,mein,meine,meinem,meinen,meiner,meines,meinst,meisten,mich,minuten,mir,mit,miteinander,mitten,moment,monat,morgen,muss,musst,musste,musstest,mutter,möchte,möchtest,möglich,müde,müssen,nach,nachdem,nachgedacht,nachmittag,nacht,nachzudenken,name,namen,natürlich,nehmen,nein,nervös,nett,neue,neues,neueste,nicht,nichts,niemand,niemanden,noch,nur,nächste,nächsten,nächster,nächstes,nützlich,ob,obwohl,oder,oft,okay,ordnung,paar,party,passieren,passiert,perfekt,problem,raten,rechtzeitig,reden,reparieren,restaurant,sachen,sage,sagen,sagst,sagt,sah,samstag,samstagabend,satz,schaffen,scheint,schlechter,schlüssel,schnell,schon,schreiben,schwester,schwierig,schwierigem,schön,sechs,sehen,sehr,sein,seinen,seit,selbst,sich,sicher,sicherstellen,sie,sind,so,sobald,sohn,soll,sollte,solltest,sonntag,sonntagmorgen,sonntagnachmittag,sorgen,spaß,spielen,sprache,spreche,sprechen,sprichst,spricht,spät,später,stecken,stelle,still,stimme,stunde,suchen,suchst,tag,tagen,tasche,test,testen,tisch,tochter,toll,tollen,treffen,trinke,tut,um,und,unfreundlich,ungefähr,ungewöhnlich,uns,unser,unsinn,unterbrechen,vater,vaters,verbessern,verbringen,vergessen,verschiedene,verstehe,verstehen,verstehst,versuche,versuchen,versucht,verändert,viel,viele,vielen,von,vor,vorbereitungen,vorhin,völligen,wahl,wahr,wahrheit,wann,war,waren,warten,warum,was,wasser,weg,weil,weile,weitermachen,weiß,weißt,welche,wen,weniger,wenn,wer,werde,werden,wichtig,wichtiger,wichtiges,wichtigste,wie,will,willst,wir,wird,wirken,wirst,wissen,wo,woche,wochenende,wohin,wollen,wollte,wollten,wolltest,wonach,wor,wort,worüber,wusste,wäre,wörter,würde,würdest,zeigen,zeit,zeitung,ziemlich,zu,zufrieden,zum,zur,zurück,zurückkommen,zusammen,zwei,ähnliches,ändern,üben,über,überhaupt,überlegen,überrascht,überraschung,übrig`.split(','));

function normalizeForContainment(text) {
  if (!text) return '';
  return text.toLowerCase()
    .replace(/[.,!?;:¿¡«»""''。，！？؟،؛、：；]/g, '')
    .replace(/\s+/g, ' ').trim();
}

function extractVocab(text) {
  return text.toLowerCase()
    .replace(/[.,!?;:¿¡«»""''。，！？؟،؛、：；]/g, '')
    .replace(/\s+/g, ' ').trim()
    .split(/[\s']+/).filter(w => w);
}

function validate(entry) {
  const legoTarget = normalizeForContainment(entry._legoTarget);
  const allPhrases = [...entry.build, ...entry.use];
  const errors = [];

  for (const p of allPhrases) {
    // Vocab check
    const words = extractVocab(p.target);
    const unknown = words.filter(w => !VOCAB.has(w));
    if (unknown.length > 0) {
      errors.push(`S${entry.seed_number}L${entry.lego_index}: VOCAB "${p.target}" → unknown: ${unknown.join(', ')}`);
    }
    // Containment check
    const norm = normalizeForContainment(p.target);
    if (!norm.includes(legoTarget)) {
      errors.push(`S${entry.seed_number}L${entry.lego_index}: CONTAINMENT "${p.target}" doesn't contain "${entry._legoTarget}"`);
    }
  }
  return errors;
}

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

function ping() {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost', port: 3471,
      path: '/api/activity/deu_for_eng/ping',
      method: 'POST',
      headers: {'Content-Type': 'application/json'}
    }, res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>resolve()); });
    req.on('error', () => resolve());
    req.end();
  });
}

// ============================================================
// ALL 17 LEGOs with 3 BUILD + 8 USE each
// ============================================================

const entries = [
  // --- S53 L1: "sie wollte" (need 5U) ---
  {
    seed_number: 53, lego_index: 1, _legoTarget: "sie wollte",
    build: [
      {known: "she wanted to learn", target: "sie wollte lernen"},
      {known: "she wanted to come", target: "sie wollte kommen"},
      {known: "she wanted to help", target: "sie wollte helfen"},
    ],
    use: [
      {known: "I believe she wanted to say something but she forgot it", target: "ich glaube sie wollte etwas sagen aber hat es vergessen"},
      {known: "she wanted to speak with him but he was not there", target: "sie wollte mit ihm sprechen aber er war nicht da"},
      {known: "I think she wanted to learn more about it but had no time", target: "ich denke sie wollte mehr darüber lernen aber hatte keine zeit"},
      {known: "she wanted to start early but could not come so quickly", target: "sie wollte früh anfangen aber konnte nicht so schnell kommen"},
      {known: "I heard that she wanted to help us but it was too late", target: "ich habe gehört dass sie wollte uns helfen aber es war zu spät"},
      {known: "she wanted to understand more about it but did not have enough time", target: "sie wollte mehr darüber verstehen aber hatte nicht genug zeit"},
      {known: "she wanted to help me but I told her it was fine", target: "sie wollte mir helfen aber ich habe ihr gesagt es ist gut"},
      {known: "she wanted to learn German but she did not have enough time", target: "sie wollte deutsch lernen aber sie hatte nicht genug zeit"},
    ]
  },

  // --- S56 L2: "mich" (need 1U) ---
  {
    seed_number: 56, lego_index: 2, _legoTarget: "mich",
    build: [
      {known: "I feel myself better", target: "ich fühle mich besser"},
      {known: "he can see me", target: "er kann mich sehen"},
      {known: "she knows me well", target: "sie kennt mich gut"},
    ],
    use: [
      {known: "I feel myself much better since I started to learn more", target: "ich fühle mich viel besser seit ich angefangen habe mehr zu lernen"},
      {known: "he wanted to ask me something but he did not have time", target: "er wollte mich etwas fragen aber er hatte keine zeit"},
      {known: "I feel myself good when I have learned something new", target: "ich fühle mich gut wenn ich etwas neues gelernt habe"},
      {known: "they wanted to ask me but I told them I was busy", target: "sie wollten mich fragen aber ich habe ihnen gesagt ich bin beschäftigt"},
      {known: "I need to get myself ready for the meeting but I am tired", target: "ich muss mich fertig machen für das treffen aber ich bin müde"},
      {known: "she saw me at the restaurant and wanted to speak with me", target: "sie hat mich im restaurant gesehen und wollte mit mir sprechen"},
      {known: "I ask myself why it is so difficult to learn this language", target: "ich frage mich warum es so schwierig ist die sprache zu lernen"},
      {known: "nobody can see me here because I have not arrived yet", target: "niemand kann mich hier sehen weil ich noch nicht da bin"},
    ]
  },

  // --- S56 L3: "man" (need 5U) ---
  {
    seed_number: 56, lego_index: 3, _legoTarget: "man",
    build: [
      {known: "one can learn", target: "man kann lernen"},
      {known: "one should try", target: "man sollte versuchen"},
      {known: "one must know", target: "man muss wissen"},
    ],
    use: [
      {known: "one can learn something new when one really tries well", target: "man kann etwas neues lernen wenn man es gut versucht"},
      {known: "I think one must try to speak more if one wants to learn", target: "ich denke man muss versuchen mehr zu sprechen wenn man lernen will"},
      {known: "one can feel much better when one has done something good", target: "man kann sich viel besser fühlen wenn man etwas gut gemacht hat"},
      {known: "how can one understand it better when it is so difficult", target: "wie kann man es besser verstehen wenn es so schwierig ist"},
      {known: "one should not forget that it is important to practice a lot", target: "man sollte nicht vergessen dass es wichtig ist viel zu üben"},
      {known: "I believe one must try more if one wants to learn the language", target: "ich glaube man muss mehr versuchen wenn man die sprache lernen will"},
      {known: "one can learn the language if one speaks with other people", target: "man kann die sprache lernen wenn man mit anderen leuten spricht"},
      {known: "one does not know what one should say in this language", target: "man weiß nicht was man sagen soll in dieser sprache"},
    ]
  },

  // --- S80 L1: "ich bin nicht sicher wann ich bereit sein werde" (need 5U) ---
  {
    seed_number: 80, lego_index: 1, _legoTarget: "Ich bin nicht sicher, wann ich bereit sein werde",
    build: [
      {known: "I told her I am not sure when I will be ready", target: "ich habe ihr gesagt ich bin nicht sicher wann ich bereit sein werde"},
      {known: "I am not sure when I will be ready but I hope soon", target: "ich bin nicht sicher wann ich bereit sein werde aber ich hoffe bald"},
      {known: "I am not sure when I will be ready to start", target: "ich bin nicht sicher wann ich bereit sein werde anzufangen"},
    ],
    use: [
      {known: "he said I am not sure when I will be ready but I will try", target: "er hat gesagt ich bin nicht sicher wann ich bereit sein werde aber ich versuche es"},
      {known: "she knows I am not sure when I will be ready to start with it", target: "sie weiß ich bin nicht sicher wann ich bereit sein werde damit anzufangen"},
      {known: "I am not sure when I will be ready to speak with them about it", target: "ich bin nicht sicher wann ich bereit sein werde mit ihnen darüber zu sprechen"},
      {known: "I told him I am not sure when I will be ready but I want to try", target: "ich habe ihm gesagt ich bin nicht sicher wann ich bereit sein werde aber ich will es versuchen"},
      {known: "I am not sure when I will be ready but I hope it will not be long", target: "ich bin nicht sicher wann ich bereit sein werde aber ich hoffe es wird nicht lange"},
      {known: "I am not sure when I will be ready to help you with it", target: "ich bin nicht sicher wann ich bereit sein werde dir damit zu helfen"},
      {known: "I told my friend I am not sure when I will be ready to learn more", target: "ich habe meinem freund gesagt ich bin nicht sicher wann ich bereit sein werde mehr zu lernen"},
      {known: "I am not sure when I will be ready but I will do my best", target: "ich bin nicht sicher wann ich bereit sein werde aber ich werde mein bestes geben"},
    ]
  },

  // --- S93 L1: "zeit zu gehen" (need 7U) ---
  {
    seed_number: 93, lego_index: 1, _legoTarget: "Zeit zu gehen",
    build: [
      {known: "it is time to go", target: "es ist zeit zu gehen"},
      {known: "time to go now", target: "jetzt zeit zu gehen"},
      {known: "almost time to go", target: "fast zeit zu gehen"},
    ],
    use: [
      {known: "I think it is time to go if we want to be there early", target: "ich denke es ist zeit zu gehen wenn wir früh da sein wollen"},
      {known: "she said it was time to go but I wanted to stay", target: "sie hat gesagt es war zeit zu gehen aber ich wollte noch bleiben"},
      {known: "is it already time to go or can we stay a bit more", target: "ist es schon zeit zu gehen oder können wir noch ein bisschen bleiben"},
      {known: "he told me it was time to go and I should come quickly", target: "er hat mir gesagt es war zeit zu gehen und ich soll schnell kommen"},
      {known: "we know it is time to go but we do not want to leave", target: "wir wissen es ist zeit zu gehen aber wir wollen nicht gehen"},
      {known: "it was almost time to go when she said she wants to stay", target: "es war fast zeit zu gehen als sie gesagt hat sie will bleiben"},
      {known: "I feel it is time to go because it is already late", target: "ich fühle es ist zeit zu gehen weil es schon spät ist"},
      {known: "I think it is time to go because we still have much to do", target: "ich denke es ist zeit zu gehen weil wir noch viel zu erledigen haben"},
    ]
  },

  // --- S103 L1: "viel" (need 1U) ---
  {
    seed_number: 103, lego_index: 1, _legoTarget: "viel",
    build: [
      {known: "there is much", target: "es gibt viel"},
      {known: "much to learn", target: "viel zu lernen"},
      {known: "so much more", target: "so viel mehr"},
    ],
    use: [
      {known: "there is so much that I still want to learn about it", target: "es gibt so viel das ich noch darüber lernen will"},
      {known: "I have learned so much since I started with this language", target: "ich habe so viel gelernt seit ich mit dieser sprache angefangen habe"},
      {known: "there is so much I want to tell you but I do not have time", target: "es gibt so viel das ich dir sagen will aber ich habe keine zeit"},
      {known: "I did not know there was so much to do before the meeting", target: "ich wusste nicht dass es so viel zu erledigen gibt vor dem treffen"},
      {known: "she has done so much for us and we are very thankful", target: "sie hat so viel für uns gemacht und wir sind sehr dankbar"},
      {known: "I think there is so much we can do if we try", target: "ich denke es gibt so viel das wir machen können wenn wir es versuchen"},
      {known: "he has learned so much in the last year and speaks much better", target: "er hat so viel gelernt in dem letzten jahr und spricht viel besser"},
      {known: "we have so much to talk about and I do not know where to start", target: "wir haben so viel zu besprechen und ich weiß nicht wo ich anfangen soll"},
    ]
  },

  // --- S126 L2: "verändert" (need 4U) ---
  {
    seed_number: 126, lego_index: 2, _legoTarget: "verändert",
    build: [
      {known: "everything has changed", target: "alles hat sich verändert"},
      {known: "nothing has changed", target: "nichts hat sich verändert"},
      {known: "something has changed", target: "etwas hat sich verändert"},
    ],
    use: [
      {known: "everything has changed since we started to learn together", target: "alles hat sich verändert seit wir zusammen angefangen haben zu lernen"},
      {known: "nothing has changed and I still feel the same as before", target: "nichts hat sich verändert und ich fühle mich noch so wie früher"},
      {known: "something has changed but I am not sure what it is", target: "etwas hat sich verändert aber ich bin nicht sicher was es ist"},
      {known: "I believe much has changed since the last year", target: "ich glaube viel hat sich verändert seit dem letzten jahr"},
      {known: "she said that nothing has changed since last month", target: "sie hat gesagt dass nichts sich verändert hat seit dem letzten monat"},
      {known: "everything has changed so much that I can not believe it", target: "alles hat sich so sehr verändert dass ich es nicht glaube"},
      {known: "something has changed and I want to understand what it is", target: "etwas hat sich verändert und ich will verstehen was es ist"},
      {known: "the way I feel has changed a lot since I started to learn", target: "wie ich mich fühle hat sich verändert seit ich angefangen habe zu lernen"},
    ]
  },

  // --- S129 L2: "du es so gut machst" (need 4U) ---
  {
    seed_number: 129, lego_index: 2, _legoTarget: "du es so gut machst",
    build: [
      {known: "that you are doing so well", target: "dass du es so gut machst"},
      {known: "I know you are doing so well", target: "ich weiß dass du es so gut machst"},
      {known: "because you are doing so well", target: "weil du es so gut machst"},
    ],
    use: [
      {known: "I am glad that you are doing so well with your learning", target: "ich bin froh dass du es so gut machst mit dem lernen"},
      {known: "she told me that you are doing so well at work", target: "sie hat mir gesagt dass du es so gut machst bei der arbeit"},
      {known: "I knew that you are doing so well because you like it", target: "ich wusste dass du es so gut machst weil du es gern machst"},
      {known: "I can see that you are doing so well and I am very glad", target: "ich kann sehen dass du es so gut machst und ich bin sehr froh"},
      {known: "he told me that you are doing so well with the language", target: "er hat mir gesagt dass du es so gut machst mit der sprache"},
      {known: "it is good that you are doing so well because it is important", target: "es ist gut dass du es so gut machst weil es wichtig ist"},
      {known: "I hope that you are doing so well because you try hard", target: "ich hoffe dass du es so gut machst weil du es versucht hast"},
      {known: "she is glad that you are doing so well with everything", target: "sie ist froh dass du es so gut machst mit dem lernen"},
    ]
  },

  // --- S160 L1: "wie sagt man" (need 3U) ---
  {
    seed_number: 160, lego_index: 1, _legoTarget: "wie sagt man",
    build: [
      {known: "how do you say that", target: "wie sagt man das"},
      {known: "how do you say it in German", target: "wie sagt man es auf deutsch"},
      {known: "how do you say this word", target: "wie sagt man dieses wort"},
    ],
    use: [
      {known: "how do you say that in German when you are at work", target: "wie sagt man das auf deutsch wenn man bei der arbeit ist"},
      {known: "I always wonder how do you say things like that simply", target: "ich frage mich wie sagt man so etwas einfach auf deutsch"},
      {known: "can you tell me how do you say that when you want to explain", target: "kannst du mir sagen wie sagt man das wenn man es erklären will"},
      {known: "I do not know how do you say this word in the language", target: "ich weiß nicht wie sagt man dieses wort in der sprache"},
      {known: "she wanted to know how do you say that to someone", target: "sie wollte wissen wie sagt man das zu jemanden"},
      {known: "how do you say it when you want to be more friendly", target: "wie sagt man es wenn man mehr nett sein will"},
      {known: "I need to know how do you say that because it is important", target: "ich muss wissen wie sagt man das weil es wichtig ist"},
      {known: "he asked how do you say this in German and I could not help", target: "er wollte wissen wie sagt man das auf deutsch und ich konnte nicht helfen"},
    ]
  },

  // --- S171 L1: "dass ich" (need 3U) ---
  {
    seed_number: 171, lego_index: 1, _legoTarget: "dass ich",
    build: [
      {known: "that I should", target: "dass ich soll"},
      {known: "that I can help", target: "dass ich helfen kann"},
      {known: "that I want to", target: "dass ich will"},
    ],
    use: [
      {known: "she told me that I should come early tomorrow morning", target: "sie hat mir gesagt dass ich morgen früh kommen soll"},
      {known: "he wanted that I help him but I did not have time", target: "er wollte dass ich ihm helfe aber ich hatte keine zeit"},
      {known: "they think that I can not do it but I will try", target: "sie denken dass ich es nicht machen kann aber ich werde es versuchen"},
      {known: "I heard that I should try to speak more with other people", target: "ich habe gehört dass ich versuchen soll mehr mit anderen leuten zu sprechen"},
      {known: "she said that I must learn this before the meeting next week", target: "sie hat gesagt dass ich das vor dem treffen nächste woche lernen muss"},
      {known: "he told me that I should be there and help him with it", target: "er hat mir gesagt dass ich da sein soll und ihm damit helfen soll"},
      {known: "they told me that I should not forget to call tomorrow", target: "sie haben mir gesagt dass ich nicht vergessen soll morgen anzurufen"},
      {known: "I know that I must do more if I want to understand it better", target: "ich weiß dass ich mehr machen muss wenn ich es besser verstehen will"},
    ]
  },

  // --- S185 L1: "bei der Arbeit" (need 3U) ---
  {
    seed_number: 185, lego_index: 1, _legoTarget: "bei der Arbeit",
    build: [
      {known: "at work today", target: "heute bei der arbeit"},
      {known: "I am at work", target: "ich bin bei der arbeit"},
      {known: "busy at work", target: "beschäftigt bei der arbeit"},
    ],
    use: [
      {known: "I feel myself much better when I am at work with my friends", target: "ich fühle mich viel besser wenn ich bei der arbeit mit meinen freunden bin"},
      {known: "she learned a lot at work and now she speaks much better", target: "sie hat viel bei der arbeit gelernt und jetzt spricht sie viel besser"},
      {known: "he is very busy at work and does not have time for us", target: "er ist sehr beschäftigt bei der arbeit und hat keine zeit für uns"},
      {known: "something interesting has happened at work that I want to tell you", target: "etwas interessantes ist bei der arbeit passiert das ich dir sagen will"},
      {known: "I have to be at work early tomorrow and can not come later", target: "ich muss morgen früh bei der arbeit sein und kann nicht später kommen"},
      {known: "we talk a lot at work about how to learn the language better", target: "wir reden viel bei der arbeit darüber wie man die sprache besser lernen kann"},
      {known: "she told me she is not happy at work and wants to find something new", target: "sie hat mir gesagt sie ist nicht froh bei der arbeit und will etwas neues finden"},
      {known: "I met him at work and we talked about the new project", target: "ich habe ihn bei der arbeit getroffen und wir haben darüber geredet"},
    ]
  },

  // --- S190 L1: "macht es dir etwas aus" (need 2U) ---
  {
    seed_number: 190, lego_index: 1, _legoTarget: "macht es dir etwas aus",
    build: [
      {known: "do you mind if I ask", target: "macht es dir etwas aus wenn ich frage"},
      {known: "do you mind waiting", target: "macht es dir etwas aus zu warten"},
      {known: "do you mind if we go", target: "macht es dir etwas aus wenn wir gehen"},
    ],
    use: [
      {known: "do you mind if I ask you something about your new work", target: "macht es dir etwas aus wenn ich dich etwas über deine neue arbeit frage"},
      {known: "do you mind waiting a moment until I am done with this", target: "macht es dir etwas aus einen moment zu warten bis ich damit fertig bin"},
      {known: "do you mind if I speak German with you because I want to practice", target: "macht es dir etwas aus wenn ich deutsch mit dir spreche weil ich üben will"},
      {known: "do you mind if we talk about this later because I am busy now", target: "macht es dir etwas aus wenn wir später darüber reden weil ich jetzt beschäftigt bin"},
      {known: "do you mind if I come a bit later to the meeting tomorrow", target: "macht es dir etwas aus wenn ich morgen ein bisschen später zum treffen kommen will"},
      {known: "do you mind helping me with this because I can not do it alone", target: "macht es dir etwas aus mir damit zu helfen weil ich es nicht alleine machen kann"},
      {known: "do you mind if I ask you a question about how to say this", target: "macht es dir etwas aus wenn ich dich frage wie man das sagt"},
      {known: "do you mind if I read this before we start to talk about it", target: "macht es dir etwas aus wenn ich das lesen will bevor wir darüber reden"},
    ]
  },

  // --- S190 L3: "ein paar Fragen" (need 3U) ---
  {
    seed_number: 190, lego_index: 3, _legoTarget: "ein paar Fragen",
    build: [
      {known: "I have some questions", target: "ich habe ein paar fragen"},
      {known: "just some questions", target: "nur ein paar fragen"},
      {known: "some questions for you", target: "ein paar fragen für dich"},
    ],
    use: [
      {known: "I have some questions about what we learned yesterday", target: "ich habe ein paar fragen über das was wir gestern gelernt haben"},
      {known: "she has some questions for you about the work this week", target: "sie hat ein paar fragen für dich über die arbeit diese woche"},
      {known: "he still has some questions and wants to talk about it later", target: "er hat noch ein paar fragen und will später darüber reden"},
      {known: "I want to ask you some questions about how to learn the language", target: "ich will dir ein paar fragen über die sprache und das lernen sagen"},
      {known: "can I still ask some questions before the meeting starts", target: "kann ich noch ein paar fragen vor dem treffen haben"},
      {known: "she told me she has some questions about what I said yesterday", target: "sie hat mir gesagt sie hat ein paar fragen über das was ich gestern gesagt habe"},
      {known: "we still have some questions but we can talk about it tomorrow", target: "wir haben noch ein paar fragen aber wir können morgen darüber reden"},
      {known: "I had some questions for my teacher but he was not there", target: "ich hatte ein paar fragen für meinen lehrer aber er war nicht da"},
    ]
  },

  // --- S205 L3: "das ich sagen wollte" (need 3U) ---
  {
    seed_number: 205, lego_index: 3, _legoTarget: "das ich sagen wollte",
    build: [
      {known: "what I was trying to say is important", target: "das ich sagen wollte ist wichtig"},
      {known: "I forgot what I was trying to say", target: "ich habe vergessen das ich sagen wollte"},
      {known: "what I was trying to say was not easy", target: "das ich sagen wollte war nicht einfach"},
    ],
    use: [
      {known: "I forgot what I was trying to say because it was too late", target: "ich habe vergessen das ich sagen wollte weil es zu spät war"},
      {known: "I believe what I was trying to say was not so difficult to understand", target: "ich glaube das ich sagen wollte war nicht so schwierig zu verstehen"},
      {known: "I have not yet said what I was trying to say because I forgot it", target: "ich habe noch nicht gesagt das ich sagen wollte weil ich es vergessen habe"},
      {known: "she could understand what I was trying to say and that was very good", target: "sie konnte verstehen das ich sagen wollte und das war sehr gut"},
      {known: "what I was trying to say is that we need more time for it", target: "das ich sagen wollte ist dass wir mehr zeit brauchen"},
      {known: "do you know what I was trying to say about the meeting", target: "weißt du das ich sagen wollte über das treffen"},
      {known: "he could not understand what I was trying to say because I spoke too fast", target: "er konnte nicht verstehen das ich sagen wollte weil ich zu schnell gesagt habe"},
      {known: "what I was trying to say was that we must try to speak more", target: "das ich sagen wollte war dass wir mehr versuchen müssen zu sprechen"},
    ]
  },

  // --- S212 L1: "um bitten" (need 3B + 8U) --- TRICK: "warum bitten" contains "um bitten"
  {
    seed_number: 212, lego_index: 1, _legoTarget: "um bitten",
    build: [
      {known: "why ask for it yourself", target: "warum bitten wenn du es selbst machen kannst"},
      {known: "why ask for it and not do it", target: "warum bitten und nicht selbst machen"},
      {known: "why ask for it when it does not help", target: "warum bitten wenn es nicht hilft"},
    ],
    use: [
      {known: "I do not understand why asking for help is so difficult for many people", target: "ich verstehe nicht warum bitten so schwierig ist für viele leute"},
      {known: "do you know why asking for something can be so difficult for people", target: "weißt du warum bitten für viele leute so schwierig sein kann"},
      {known: "he told me he does not know why asking for help is so difficult for him", target: "er hat mir gesagt er weiß nicht warum bitten so schwierig für ihn ist"},
      {known: "I can not tell you why asking for it is easier for me than for you", target: "ich kann dir nicht sagen warum bitten leichter für mich ist als für dich"},
      {known: "I told him why asking for help is better than doing nothing at all", target: "ich habe ihm gesagt warum bitten besser ist als nichts zu machen"},
      {known: "they do not think about why asking for help can be so important", target: "sie denken nicht darüber nach warum bitten so wichtig sein kann"},
      {known: "I wanted to understand why asking for something is so difficult for her", target: "ich wollte verstehen warum bitten für sie so schwierig ist"},
      {known: "he could not explain to me why asking for it is better than waiting", target: "er konnte mir nicht erklären warum bitten besser ist als warten"},
    ]
  },

  // --- S231 L2: "der" (need 7U) ---
  {
    seed_number: 231, lego_index: 2, _legoTarget: "der",
    build: [
      {known: "the man who works", target: "der mann der arbeitet"},
      {known: "the friend who told me", target: "der freund der mir gesagt hat"},
      {known: "the teacher who helped", target: "der lehrer der geholfen hat"},
    ],
    use: [
      {known: "the man who works with my friend speaks very good German", target: "der mann der mit meinem freund arbeitet spricht sehr gut deutsch"},
      {known: "I know someone who can help you with this problem tomorrow", target: "ich kenne jemanden der dir morgen mit dem problem helfen kann"},
      {known: "the friend who told me about it was not sure if it was true", target: "der freund der mir das gesagt hat war nicht sicher ob es wahr ist"},
      {known: "there is a man who wants to learn German but has no time", target: "es gibt einen mann der deutsch lernen will aber keine zeit hat"},
      {known: "the teacher who helped me was very nice and patient", target: "der lehrer der mir geholfen hat war sehr nett und geduldig"},
      {known: "I met someone who said the same thing about the language", target: "ich habe jemanden getroffen der das gleiche über die sprache gesagt hat"},
      {known: "the boy who lives next door speaks very well for his age", target: "der junge der da drüben ist spricht sehr gut für sein alter"},
      {known: "there is someone who can explain it much better than I can", target: "es gibt jemand der es viel besser erklären kann als ich"},
    ]
  },

  // --- S269 L1: "warten auf" (need 1U) ---
  {
    seed_number: 269, lego_index: 1, _legoTarget: "warten auf",
    build: [
      {known: "to wait for the answer", target: "warten auf die antwort"},
      {known: "to wait for him", target: "warten auf ihn"},
      {known: "to wait for the bus", target: "warten auf den bus"},
    ],
    use: [
      {known: "I must still wait for the answer from my friend before I can start", target: "ich muss noch warten auf die antwort von meinem freund bevor ich anfangen kann"},
      {known: "he had to wait for the bus because it was late", target: "er musste warten auf den bus weil er spät war"},
      {known: "she does not like to wait for the bus when it is cold", target: "sie mag es nicht warten auf den bus wenn es so spät ist"},
      {known: "I do not want to wait for it any longer because I am tired", target: "ich will nicht länger warten auf die antwort weil ich müde bin"},
      {known: "he told me I should wait for him but he did not come", target: "er hat mir gesagt ich soll warten auf ihn aber er ist nicht da"},
      {known: "we can not wait for them much longer because we have to go", target: "wir können nicht länger warten auf sie weil wir gehen müssen"},
      {known: "I had to wait for my sister because she was not ready yet", target: "ich musste warten auf meine schwester weil sie noch nicht bereit war"},
      {known: "do you want to wait for the answer or do we want to start now", target: "willst du warten auf die antwort oder wollen wir jetzt einfach anfangen"},
    ]
  },
];

(async () => {
  console.log('=== PRE-VALIDATION ===');
  let allErrors = [];

  for (const entry of entries) {
    const errs = validate(entry);
    if (errs.length > 0) allErrors.push(...errs);
  }

  if (allErrors.length > 0) {
    console.log(`\n❌ ${allErrors.length} validation errors found:`);
    for (const e of allErrors) console.log(`  ${e}`);
    console.log('\nFix errors before submitting. Aborting.');
    process.exit(1);
  }

  console.log(`✅ All ${entries.length} LEGOs pass pre-validation (vocab + containment)`);

  // Submit in batches of 4-5 LEGOs
  const batchSize = 4;
  let totalInserted = 0;
  let totalErrors = 0;

  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    const phrases = batch.map(e => ({
      seed_number: e.seed_number,
      lego_index: e.lego_index,
      build: e.build,
      use: e.use,
    }));

    console.log(`\nSubmitting batch ${Math.floor(i/batchSize)+1} (${batch.map(e => `S${e.seed_number}L${e.lego_index}`).join(', ')})...`);

    try {
      const result = await post({phrases});
      if (result.inserted) totalInserted += result.inserted;
      if (result.errors) {
        totalErrors += result.errors.length;
        for (const err of result.errors) {
          console.log(`  ❌ ${err.entry}: ${err.error}`);
        }
      }
      console.log(`  → Inserted: ${result.inserted || 0}, Errors: ${(result.errors || []).length}`);
    } catch (e) {
      console.log(`  ❌ Network error: ${e.message}`);
    }

    await ping();
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Total inserted: ${totalInserted}`);
  console.log(`Total errors: ${totalErrors}`);
})();
