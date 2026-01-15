/**
 * German Course Builder - Batch 4 (Seeds 46-55)
 */

const fetch = require('node-fetch');
const API = 'http://localhost:3471/api/lego';

async function postLego(data) {
  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) {
      console.log(`✗ S${String(data.seed).padStart(4,'0')}L${String(data.idx).padStart(2,'0')}: ${json.error}`);
      if (json.violations) json.violations.slice(0,3).forEach(v => console.log(`   Unknown: ${v.unknown}`));
      return false;
    }
    console.log(`✓ S${String(data.seed).padStart(4,'0')}L${String(data.idx).padStart(2,'0')}: ${data.known} → ${data.target} (${json.phrases} phrases)`);
    return true;
  } catch (err) {
    console.log(`Error: ${err.message}`);
    return false;
  }
}

function A(seed, idx, known, target, phrases) {
  return { course_code: 'deu_for_eng', seed, idx, type: 'A', known, target, components: null, phrases };
}

function M(seed, idx, known, target, components, phrases) {
  return { course_code: 'deu_for_eng', seed, idx, type: 'M', known, target, components, phrases };
}

async function buildSeeds() {

  // Seed 46: "But I don't worry about making mistakes."
  await postLego(M(46, 1, "I don't worry", 'ich mache mir keine Sorgen',
    [{ known: 'worry', target: 'Sorgen' }],
    [
      { known: "I don't worry", target: 'ich mache mir keine Sorgen' },
      { known: "I don't worry about", target: 'ich mache mir keine Sorgen über' },
      { known: "but I don't worry", target: 'aber ich mache mir keine Sorgen' },
      { known: "I don't worry about it", target: 'ich mache mir keine Sorgen darüber' },
      { known: 'I worry a little', target: 'ich mache mir ein bisschen Sorgen' },
      { known: "I don't worry about speaking German", target: 'ich mache mir keine Sorgen über das Deutschsprechen' },
      { known: "because I don't worry about how to answer", target: 'weil ich mir keine Sorgen mache wie ich antworte' },
      { known: "I don't worry about meeting people who speak German", target: 'ich mache mir keine Sorgen Leute zu treffen die Deutsch sprechen' },
      { known: "but I don't worry about feeling tired at the moment", target: 'aber ich mache mir im Moment keine Sorgen müde zu sein' },
      { known: "I don't worry about knowing everything at the moment", target: 'ich mache mir im Moment keine Sorgen alles zu wissen' }
    ]
  ));

  await postLego(A(46, 2, 'about making', 'über das Machen',
    [
      { known: 'about making', target: 'über das Machen' },
      { known: 'about making mistakes', target: 'über das Machen von Fehlern' },
      { known: "I don't worry about making", target: 'ich mache mir keine Sorgen über das Machen' },
      { known: 'thinking about making', target: 'über das Machen nachdenken' },
      { known: 'I was thinking about making', target: 'ich dachte über das Machen nach' },
      { known: 'I started to think about making', target: 'ich fing an über das Machen nachzudenken' },
      { known: "I don't need to worry about making mistakes", target: 'ich brauche mir keine Sorgen über das Machen von Fehlern zu machen' },
      { known: 'because I am not worried about making mistakes when I speak German', target: 'weil ich mir keine Sorgen über das Machen von Fehlern mache wenn ich Deutsch spreche' },
      { known: "but I don't worry about making mistakes with people who speak German", target: 'aber ich mache mir keine Sorgen über das Machen von Fehlern mit Leuten die Deutsch sprechen' },
      { known: 'I was starting to feel better about making mistakes last night', target: 'ich fing letzte Nacht an mich besser über das Machen von Fehlern zu fühlen' }
    ]
  ));

  await postLego(A(46, 3, 'mistakes', 'Fehler',
    [
      { known: 'mistakes', target: 'Fehler' },
      { known: 'making mistakes', target: 'Fehler machen' },
      { known: "I don't worry about making mistakes", target: 'ich mache mir keine Sorgen Fehler zu machen' },
      { known: 'I make mistakes', target: 'ich mache Fehler' },
      { known: 'I made mistakes', target: 'ich habe Fehler gemacht' },
      { known: "everyone makes mistakes", target: 'jeder macht Fehler' },
      { known: 'I am not afraid of making mistakes', target: 'ich habe keine Angst Fehler zu machen' },
      { known: 'because I think making mistakes is okay', target: 'weil ich denke Fehler zu machen ist okay' },
      { known: "I don't need to worry about making mistakes when I speak German", target: 'ich brauche mir keine Sorgen zu machen Fehler zu machen wenn ich Deutsch spreche' },
      { known: 'I was starting to understand that making mistakes helps me improve', target: 'ich fing an zu verstehen dass Fehler machen mir hilft zu verbessern' }
    ]
  ));

  // Seed 47: "Because I think that it's a good thing to make mistakes."
  await postLego(M(47, 1, "it's a good thing", 'es ist eine gute Sache',
    [{ known: 'good thing', target: 'gute Sache' }],
    [
      { known: "it's a good thing", target: 'es ist eine gute Sache' },
      { known: "I think it's a good thing", target: 'ich denke es ist eine gute Sache' },
      { known: "it's a good thing to learn", target: 'es ist eine gute Sache zu lernen' },
      { known: "it's a good thing to speak", target: 'es ist eine gute Sache zu sprechen' },
      { known: "because it's a good thing", target: 'weil es eine gute Sache ist' },
      { known: "it's a good thing to feel ready", target: 'es ist eine gute Sache bereit zu sein' },
      { known: "I think it's a good thing to make mistakes", target: 'ich denke es ist eine gute Sache Fehler zu machen' },
      { known: "it's a good thing to meet people who speak German", target: 'es ist eine gute Sache Leute zu treffen die Deutsch sprechen' },
      { known: "because I think it's a good thing to improve at the moment", target: 'weil ich denke es ist im Moment eine gute Sache zu verbessern' },
      { known: "it's a good thing to know how to answer carefully", target: 'es ist eine gute Sache zu wissen wie man sorgfältig antwortet' }
    ]
  ));

  await postLego(A(47, 2, 'to make', 'machen',
    [
      { known: 'to make', target: 'machen' },
      { known: 'to make mistakes', target: 'Fehler machen' },
      { known: 'I want to make', target: 'ich will machen' },
      { known: "it's a good thing to make mistakes", target: 'es ist eine gute Sache Fehler zu machen' },
      { known: 'I am going to make', target: 'ich werde machen' },
      { known: 'I need to make', target: 'ich muss machen' },
      { known: 'because I think that it is a good thing to make mistakes', target: 'weil ich denke dass es eine gute Sache ist Fehler zu machen' },
      { known: "I don't worry about making mistakes when I learn German", target: 'ich mache mir keine Sorgen Fehler zu machen wenn ich Deutsch lerne' },
      { known: 'I was starting to make fewer mistakes last month', target: 'ich fing letzten Monat an weniger Fehler zu machen' },
      { known: "it's a good thing to make time to meet other people here", target: 'es ist eine gute Sache Zeit zu machen um andere Leute hier zu treffen' }
    ]
  ));

  // Seed 48: "I don't care about making mistakes."
  await postLego(M(48, 1, "I don't care", 'es ist mir egal',
    [{ known: 'care', target: 'egal' }],
    [
      { known: "I don't care", target: 'es ist mir egal' },
      { known: "I don't care about", target: 'es ist mir egal' },
      { known: "I don't care about it", target: 'es ist mir egal' },
      { known: "I don't care about mistakes", target: 'Fehler sind mir egal' },
      { known: "I don't care about making mistakes", target: 'es ist mir egal Fehler zu machen' },
      { known: "but I don't care", target: 'aber es ist mir egal' },
      { known: "I don't care about how I feel at the moment", target: 'es ist mir egal wie ich mich im Moment fühle' },
      { known: "because I don't care about being tired this morning", target: 'weil es mir egal ist heute Morgen müde zu sein' },
      { known: "I don't care about what other people think", target: 'es ist mir egal was andere Leute denken' },
      { known: "I don't care about speaking German better than other people", target: 'es ist mir egal besser Deutsch zu sprechen als andere Leute' }
    ]
  ));

  // Seed 49: "It's like this, if you know what I mean."
  await postLego(M(49, 1, "it's like this", 'es ist so',
    [{ known: 'like this', target: 'so' }],
    [
      { known: "it's like this", target: 'es ist so' },
      { known: "it's like this when I speak", target: 'es ist so wenn ich spreche' },
      { known: "I think it's like this", target: 'ich denke es ist so' },
      { known: "it's like this at the moment", target: 'es ist im Moment so' },
      { known: "it's like this when I learn German", target: 'es ist so wenn ich Deutsch lerne' },
      { known: "because it's like this for everyone", target: 'weil es für jeden so ist' },
      { known: "it's like this when I feel tired", target: 'es ist so wenn ich mich müde fühle' },
      { known: "I think it's like this when you meet people who speak German", target: 'ich denke es ist so wenn man Leute trifft die Deutsch sprechen' },
      { known: "it's like this if you know everything already", target: 'es ist so wenn man schon alles weiß' },
      { known: "it's like this when I make mistakes and I don't care", target: 'es ist so wenn ich Fehler mache und es mir egal ist' }
    ]
  ));

  await postLego(M(49, 2, 'what I mean', 'was ich meine',
    [{ known: 'I mean', target: 'ich meine' }],
    [
      { known: 'what I mean', target: 'was ich meine' },
      { known: 'if you know what I mean', target: 'wenn du weißt was ich meine' },
      { known: 'do you know what I mean', target: 'weißt du was ich meine' },
      { known: 'I think you know what I mean', target: 'ich denke du weißt was ich meine' },
      { known: "I'm not sure if you know what I mean", target: 'ich bin nicht sicher ob du weißt was ich meine' },
      { known: 'because you know what I mean', target: 'weil du weißt was ich meine' },
      { known: "it's like this, if you know what I mean", target: 'es ist so, wenn du weißt was ich meine' },
      { known: 'I was trying to explain what I mean', target: 'ich versuchte zu erklären was ich meine' },
      { known: "I don't care if you know what I mean or not", target: 'es ist mir egal ob du weißt was ich meine oder nicht' },
      { known: 'making mistakes is a good thing if you know what I mean', target: 'Fehler zu machen ist eine gute Sache wenn du weißt was ich meine' }
    ]
  ));

  // Seed 50: "I'm not trying to finish as quickly as possible."
  await postLego(M(50, 1, "I'm not trying", 'ich versuche nicht',
    [{ known: 'not trying', target: 'versuche nicht' }],
    [
      { known: "I'm not trying", target: 'ich versuche nicht' },
      { known: "I'm not trying to speak", target: 'ich versuche nicht zu sprechen' },
      { known: "I'm not trying to learn", target: 'ich versuche nicht zu lernen' },
      { known: "I'm not trying to go", target: 'ich versuche nicht zu gehen' },
      { known: "but I'm not trying", target: 'aber ich versuche nicht' },
      { known: "I'm not trying to improve quickly", target: 'ich versuche nicht schnell zu verbessern' },
      { known: "I'm not trying to make mistakes", target: 'ich versuche nicht Fehler zu machen' },
      { known: "because I'm not trying to know everything", target: 'weil ich nicht versuche alles zu wissen' },
      { known: "I'm not trying to feel better than other people", target: 'ich versuche nicht mich besser zu fühlen als andere Leute' },
      { known: "I'm not trying to meet people who speak German at the moment", target: 'ich versuche im Moment nicht Leute zu treffen die Deutsch sprechen' }
    ]
  ));

  await postLego(A(50, 2, 'to finish', 'beenden',
    [
      { known: 'to finish', target: 'beenden' },
      { known: 'I want to finish', target: 'ich will beenden' },
      { known: "I'm not trying to finish", target: 'ich versuche nicht zu beenden' },
      { known: 'I need to finish', target: 'ich muss beenden' },
      { known: 'I am going to finish', target: 'ich werde beenden' },
      { known: 'to finish the story', target: 'die Geschichte beenden' },
      { known: 'I want to finish before I go', target: 'ich will beenden bevor ich gehe' },
      { known: "I'm not trying to finish as quickly as possible", target: 'ich versuche nicht so schnell wie möglich zu beenden' },
      { known: 'because I want to finish reading the story carefully', target: 'weil ich die Geschichte sorgfältig zu Ende lesen will' },
      { known: 'I was starting to finish learning German last month', target: 'ich fing letzten Monat an Deutsch zu lernen fertig zu werden' }
    ]
  ));

  await postLego(M(50, 3, 'as quickly as possible', 'so schnell wie möglich',
    [{ known: 'as possible', target: 'wie möglich' }],
    [
      { known: 'as quickly as possible', target: 'so schnell wie möglich' },
      { known: 'I want to finish as quickly as possible', target: 'ich will so schnell wie möglich beenden' },
      { known: "I'm not trying to finish as quickly as possible", target: 'ich versuche nicht so schnell wie möglich zu beenden' },
      { known: 'to learn as quickly as possible', target: 'so schnell wie möglich lernen' },
      { known: 'she wants to go as quickly as possible', target: 'sie will so schnell wie möglich gehen' },
      { known: 'I am trying to improve as quickly as possible', target: 'ich versuche so schnell wie möglich zu verbessern' },
      { known: "because I don't need to finish as quickly as possible", target: 'weil ich nicht so schnell wie möglich beenden muss' },
      { known: "I'm not worried about speaking German as quickly as possible", target: 'ich mache mir keine Sorgen so schnell wie möglich Deutsch zu sprechen' },
      { known: "it's a good thing to learn as quickly as possible if you know what I mean", target: 'es ist eine gute Sache so schnell wie möglich zu lernen wenn du weißt was ich meine' },
      { known: "I'm not trying to meet people who speak German as quickly as possible", target: 'ich versuche nicht so schnell wie möglich Leute zu treffen die Deutsch sprechen' }
    ]
  ));

  // Seed 51: "I enjoy doing interesting things with my friends."
  await postLego(A(51, 1, 'I enjoy', 'ich genieße',
    [
      { known: 'I enjoy', target: 'ich genieße' },
      { known: 'I enjoy speaking', target: 'ich genieße das Sprechen' },
      { known: 'I enjoy learning', target: 'ich genieße das Lernen' },
      { known: 'I enjoy meeting', target: 'ich genieße das Treffen' },
      { known: 'I enjoy reading', target: 'ich genieße das Lesen' },
      { known: 'I enjoy doing', target: 'ich genieße es zu tun' },
      { known: 'I enjoy speaking German with other people', target: 'ich genieße es Deutsch mit anderen Leuten zu sprechen' },
      { known: 'because I enjoy learning more at the moment', target: 'weil ich im Moment genieße mehr zu lernen' },
      { known: 'I enjoy meeting people who speak German', target: 'ich genieße es Leute zu treffen die Deutsch sprechen' },
      { known: "I enjoy making mistakes because it's a good thing", target: 'ich genieße es Fehler zu machen weil es eine gute Sache ist' }
    ]
  ));

  await postLego(A(51, 2, 'doing', 'machen',
    [
      { known: 'doing', target: 'machen' },
      { known: 'I enjoy doing', target: 'ich genieße es zu machen' },
      { known: 'doing things', target: 'Dinge machen' },
      { known: 'doing interesting things', target: 'interessante Dinge machen' },
      { known: 'I like doing', target: 'ich mag machen' },
      { known: "I'm not trying to stop doing", target: 'ich versuche nicht aufzuhören zu machen' },
      { known: 'I enjoy doing things with other people', target: 'ich genieße es Dinge mit anderen Leuten zu machen' },
      { known: 'because I enjoy doing interesting things every day', target: 'weil ich genieße jeden Tag interessante Dinge zu machen' },
      { known: 'I was starting to enjoy doing more things last week', target: 'ich fing letzte Woche an es zu genießen mehr Dinge zu machen' },
      { known: 'doing interesting things is a good way to learn German', target: 'interessante Dinge zu machen ist ein guter Weg Deutsch zu lernen' }
    ]
  ));

  await postLego(M(51, 3, 'interesting things', 'interessante Dinge',
    [{ known: 'interesting', target: 'interessante' }, { known: 'things', target: 'Dinge' }],
    [
      { known: 'interesting things', target: 'interessante Dinge' },
      { known: 'doing interesting things', target: 'interessante Dinge machen' },
      { known: 'I enjoy doing interesting things', target: 'ich genieße es interessante Dinge zu machen' },
      { known: 'I like interesting things', target: 'ich mag interessante Dinge' },
      { known: 'interesting things happen', target: 'interessante Dinge passieren' },
      { known: 'I want to learn interesting things', target: 'ich will interessante Dinge lernen' },
      { known: 'because I enjoy doing interesting things with people who speak German', target: 'weil ich genieße interessante Dinge mit Leuten zu machen die Deutsch sprechen' },
      { known: 'I was starting to find interesting things to read', target: 'ich fing an interessante Dinge zu finden zum Lesen' },
      { known: 'doing interesting things helps me improve as quickly as possible', target: 'interessante Dinge zu machen hilft mir so schnell wie möglich zu verbessern' },
      { known: "I enjoy doing interesting things even when I'm a little tired", target: 'ich genieße es interessante Dinge zu machen auch wenn ich ein bisschen müde bin' }
    ]
  ));

  await postLego(M(51, 4, 'with my friends', 'mit meinen Freunden',
    [{ known: 'my friends', target: 'meinen Freunden' }],
    [
      { known: 'with my friends', target: 'mit meinen Freunden' },
      { known: 'I enjoy doing things with my friends', target: 'ich genieße es Dinge mit meinen Freunden zu machen' },
      { known: 'I speak German with my friends', target: 'ich spreche Deutsch mit meinen Freunden' },
      { known: 'I want to meet my friends', target: 'ich will meine Freunde treffen' },
      { known: 'I like learning with my friends', target: 'ich mag mit meinen Freunden lernen' },
      { known: 'I enjoy doing interesting things with my friends', target: 'ich genieße es interessante Dinge mit meinen Freunden zu machen' },
      { known: 'because I enjoy speaking German with my friends every day', target: 'weil ich genieße jeden Tag mit meinen Freunden Deutsch zu sprechen' },
      { known: 'I was starting to meet my friends who speak German last month', target: 'ich fing letzten Monat an meine Freunde zu treffen die Deutsch sprechen' },
      { known: 'doing interesting things with my friends helps me feel better', target: 'interessante Dinge mit meinen Freunden zu machen hilft mir mich besser zu fühlen' },
      { known: "I don't worry about making mistakes with my friends", target: 'ich mache mir keine Sorgen Fehler mit meinen Freunden zu machen' }
    ]
  ));

  // Seed 52: "He wanted to write a letter to his friend last week."
  await postLego(M(52, 1, 'he wanted', 'er wollte',
    [{ known: 'wanted', target: 'wollte' }],
    [
      { known: 'he wanted', target: 'er wollte' },
      { known: 'he wanted to speak', target: 'er wollte sprechen' },
      { known: 'he wanted to learn', target: 'er wollte lernen' },
      { known: 'he wanted to go', target: 'er wollte gehen' },
      { known: 'he wanted to meet', target: 'er wollte treffen' },
      { known: 'but he wanted to help', target: 'aber er wollte helfen' },
      { known: 'he wanted to do interesting things', target: 'er wollte interessante Dinge machen' },
      { known: 'he wanted to finish as quickly as possible', target: 'er wollte so schnell wie möglich beenden' },
      { known: 'because he wanted to meet people who speak German', target: 'weil er Leute treffen wollte die Deutsch sprechen' },
      { known: 'he wanted to enjoy doing things with his friends', target: 'er wollte es genießen Dinge mit seinen Freunden zu machen' }
    ]
  ));

  await postLego(A(52, 2, 'to write', 'schreiben',
    [
      { known: 'to write', target: 'schreiben' },
      { known: 'I want to write', target: 'ich will schreiben' },
      { known: 'he wanted to write', target: 'er wollte schreiben' },
      { known: 'I need to write', target: 'ich muss schreiben' },
      { known: 'I am going to write', target: 'ich werde schreiben' },
      { known: 'to write a letter', target: 'einen Brief schreiben' },
      { known: 'I enjoy writing in German', target: 'ich genieße auf Deutsch zu schreiben' },
      { known: 'he wanted to write a letter to his friend', target: 'er wollte einen Brief an seinen Freund schreiben' },
      { known: 'because I want to write something interesting', target: 'weil ich etwas Interessantes schreiben will' },
      { known: 'I was starting to write more carefully last month', target: 'ich fing letzten Monat an sorgfältiger zu schreiben' }
    ]
  ));

  await postLego(M(52, 3, 'a letter', 'einen Brief',
    [{ known: 'letter', target: 'Brief' }],
    [
      { known: 'a letter', target: 'einen Brief' },
      { known: 'to write a letter', target: 'einen Brief schreiben' },
      { known: 'he wanted to write a letter', target: 'er wollte einen Brief schreiben' },
      { known: 'I wrote a letter', target: 'ich schrieb einen Brief' },
      { known: 'I want to read a letter', target: 'ich will einen Brief lesen' },
      { known: 'a letter to my friend', target: 'einen Brief an meinen Freund' },
      { known: 'he wanted to write a letter to his friend', target: 'er wollte einen Brief an seinen Freund schreiben' },
      { known: 'because I enjoy writing a letter in German', target: 'weil ich genieße einen Brief auf Deutsch zu schreiben' },
      { known: 'I was starting to write a letter last week', target: 'ich fing letzte Woche an einen Brief zu schreiben' },
      { known: 'writing a letter is an interesting thing to do', target: 'einen Brief zu schreiben ist eine interessante Sache zu tun' }
    ]
  ));

  await postLego(M(52, 4, 'to his friend', 'an seinen Freund',
    [{ known: 'his friend', target: 'seinen Freund' }],
    [
      { known: 'to his friend', target: 'an seinen Freund' },
      { known: 'he wanted to write to his friend', target: 'er wollte an seinen Freund schreiben' },
      { known: 'a letter to his friend', target: 'einen Brief an seinen Freund' },
      { known: 'he spoke to his friend', target: 'er sprach mit seinem Freund' },
      { known: 'he went to his friend', target: 'er ging zu seinem Freund' },
      { known: 'he wanted to write a letter to his friend', target: 'er wollte einen Brief an seinen Freund schreiben' },
      { known: 'because he wanted to speak German with his friend', target: 'weil er mit seinem Freund Deutsch sprechen wollte' },
      { known: 'he enjoyed doing interesting things with his friend', target: 'er genoss es interessante Dinge mit seinem Freund zu machen' },
      { known: 'he was starting to write a letter to his friend last week', target: 'er fing letzte Woche an einen Brief an seinen Freund zu schreiben' },
      { known: 'he wanted to write a letter to his friend to tell him everything', target: 'er wollte einen Brief an seinen Freund schreiben um ihm alles zu erzählen' }
    ]
  ));

  await postLego(A(52, 5, 'last week', 'letzte Woche',
    [
      { known: 'last week', target: 'letzte Woche' },
      { known: 'I met him last week', target: 'ich traf ihn letzte Woche' },
      { known: 'he wanted to write a letter last week', target: 'er wollte letzte Woche einen Brief schreiben' },
      { known: 'I started learning last week', target: 'ich fing letzte Woche an zu lernen' },
      { known: 'she finished last week', target: 'sie beendete letzte Woche' },
      { known: 'I felt tired last week', target: 'ich fühlte mich letzte Woche müde' },
      { known: 'he wanted to write a letter to his friend last week', target: 'er wollte letzte Woche einen Brief an seinen Freund schreiben' },
      { known: 'because I enjoyed doing interesting things with my friends last week', target: 'weil ich letzte Woche genoss interessante Dinge mit meinen Freunden zu machen' },
      { known: 'I was starting to speak German better than before last week', target: 'ich fing letzte Woche an besser Deutsch zu sprechen als vorher' },
      { known: 'I met people who speak German last week for about a week', target: 'ich traf letzte Woche Leute die Deutsch sprechen für ungefähr eine Woche' }
    ]
  ));

  // Seed 53: "She wanted to put his letter in her bag."
  await postLego(M(53, 1, 'she wanted', 'sie wollte',
    [],
    [
      { known: 'she wanted', target: 'sie wollte' },
      { known: 'she wanted to speak', target: 'sie wollte sprechen' },
      { known: 'she wanted to learn', target: 'sie wollte lernen' },
      { known: 'she wanted to write', target: 'sie wollte schreiben' },
      { known: 'she wanted to go', target: 'sie wollte gehen' },
      { known: 'but she wanted to help', target: 'aber sie wollte helfen' },
      { known: 'she wanted to do interesting things', target: 'sie wollte interessante Dinge machen' },
      { known: 'because she wanted to meet people who speak German', target: 'weil sie Leute treffen wollte die Deutsch sprechen' },
      { known: 'she wanted to enjoy learning with her friends', target: 'sie wollte es genießen mit ihren Freunden zu lernen' },
      { known: 'she wanted to write a letter to her friend last week', target: 'sie wollte letzte Woche einen Brief an ihre Freundin schreiben' }
    ]
  ));

  await postLego(A(53, 2, 'to put', 'legen',
    [
      { known: 'to put', target: 'legen' },
      { known: 'I want to put', target: 'ich will legen' },
      { known: 'she wanted to put', target: 'sie wollte legen' },
      { known: 'I need to put', target: 'ich muss legen' },
      { known: 'to put something', target: 'etwas legen' },
      { known: 'to put it here', target: 'es hier legen' },
      { known: 'she wanted to put the letter', target: 'sie wollte den Brief legen' },
      { known: 'because I want to put everything in the right place', target: 'weil ich alles an den richtigen Platz legen will' },
      { known: 'she wanted to put his letter in her bag', target: 'sie wollte seinen Brief in ihre Tasche legen' },
      { known: 'I was starting to put interesting things together', target: 'ich fing an interessante Dinge zusammenzulegen' }
    ]
  ));

  await postLego(M(53, 3, 'his letter', 'seinen Brief',
    [],
    [
      { known: 'his letter', target: 'seinen Brief' },
      { known: 'I read his letter', target: 'ich las seinen Brief' },
      { known: 'she wanted to put his letter', target: 'sie wollte seinen Brief legen' },
      { known: 'he wrote his letter', target: 'er schrieb seinen Brief' },
      { known: 'I want to see his letter', target: 'ich will seinen Brief sehen' },
      { known: 'his letter was interesting', target: 'sein Brief war interessant' },
      { known: 'she wanted to put his letter in her bag', target: 'sie wollte seinen Brief in ihre Tasche legen' },
      { known: 'because I enjoyed reading his letter', target: 'weil ich genoss seinen Brief zu lesen' },
      { known: 'I was starting to understand what his letter meant', target: 'ich fing an zu verstehen was sein Brief bedeutete' },
      { known: 'she wanted to show me his letter but she was too tired', target: 'sie wollte mir seinen Brief zeigen aber sie war zu müde' }
    ]
  ));

  await postLego(M(53, 4, 'in her bag', 'in ihre Tasche',
    [{ known: 'her bag', target: 'ihre Tasche' }, { known: 'bag', target: 'Tasche' }],
    [
      { known: 'in her bag', target: 'in ihre Tasche' },
      { known: 'she wanted to put it in her bag', target: 'sie wollte es in ihre Tasche legen' },
      { known: 'the letter is in her bag', target: 'der Brief ist in ihrer Tasche' },
      { known: 'she put everything in her bag', target: 'sie legte alles in ihre Tasche' },
      { known: 'I found something in her bag', target: 'ich fand etwas in ihrer Tasche' },
      { known: 'she wanted to put his letter in her bag', target: 'sie wollte seinen Brief in ihre Tasche legen' },
      { known: 'because she wanted to put everything in her bag before she went', target: 'weil sie alles in ihre Tasche legen wollte bevor sie ging' },
      { known: 'I was starting to look for something in her bag', target: 'ich fing an etwas in ihrer Tasche zu suchen' },
      { known: 'she enjoyed putting interesting things in her bag', target: 'sie genoss es interessante Dinge in ihre Tasche zu legen' },
      { known: 'she wanted to put his letter in her bag quickly last week', target: 'sie wollte letzte Woche seinen Brief schnell in ihre Tasche legen' }
    ]
  ));

  // Seed 54: "We wanted to give you a little more time."
  await postLego(M(54, 1, 'we wanted', 'wir wollten',
    [],
    [
      { known: 'we wanted', target: 'wir wollten' },
      { known: 'we wanted to speak', target: 'wir wollten sprechen' },
      { known: 'we wanted to learn', target: 'wir wollten lernen' },
      { known: 'we wanted to meet', target: 'wir wollten treffen' },
      { known: 'we wanted to help', target: 'wir wollten helfen' },
      { known: 'but we wanted to go', target: 'aber wir wollten gehen' },
      { known: 'we wanted to do interesting things with our friends', target: 'wir wollten interessante Dinge mit unseren Freunden machen' },
      { known: 'because we wanted to meet people who speak German', target: 'weil wir Leute treffen wollten die Deutsch sprechen' },
      { known: 'we wanted to finish as quickly as possible last week', target: 'wir wollten letzte Woche so schnell wie möglich beenden' },
      { known: 'we wanted to enjoy learning German with my friends', target: 'wir wollten es genießen mit meinen Freunden Deutsch zu lernen' }
    ]
  ));

  await postLego(A(54, 2, 'to give', 'geben',
    [
      { known: 'to give', target: 'geben' },
      { known: 'I want to give', target: 'ich will geben' },
      { known: 'we wanted to give', target: 'wir wollten geben' },
      { known: 'I need to give', target: 'ich muss geben' },
      { known: 'to give you', target: 'dir geben' },
      { known: 'to give something', target: 'etwas geben' },
      { known: 'we wanted to give you more time', target: 'wir wollten dir mehr Zeit geben' },
      { known: 'because I want to give you the answer', target: 'weil ich dir die Antwort geben will' },
      { known: 'she wanted to give him the letter', target: 'sie wollte ihm den Brief geben' },
      { known: 'he enjoyed giving interesting things to his friends', target: 'er genoss es seinen Freunden interessante Dinge zu geben' }
    ]
  ));

  await postLego(M(54, 3, 'a little more', 'ein bisschen mehr',
    [],
    [
      { known: 'a little more', target: 'ein bisschen mehr' },
      { known: 'a little more time', target: 'ein bisschen mehr Zeit' },
      { known: 'I want a little more', target: 'ich will ein bisschen mehr' },
      { known: 'we wanted to give you a little more', target: 'wir wollten dir ein bisschen mehr geben' },
      { known: 'I need a little more time', target: 'ich brauche ein bisschen mehr Zeit' },
      { known: 'a little more practice', target: 'ein bisschen mehr Übung' },
      { known: 'we wanted to give you a little more time', target: 'wir wollten dir ein bisschen mehr Zeit geben' },
      { known: 'because I need a little more time to finish', target: 'weil ich ein bisschen mehr Zeit brauche um zu beenden' },
      { known: 'I was starting to want a little more help last week', target: 'ich fing letzte Woche an ein bisschen mehr Hilfe zu wollen' },
      { known: 'she wanted to spend a little more time with her friends', target: 'sie wollte ein bisschen mehr Zeit mit ihren Freunden verbringen' }
    ]
  ));

  // Seed 55: "I don't enjoy waking up when I didn't sleep very well."
  await postLego(M(55, 1, "I don't enjoy", 'ich genieße nicht',
    [],
    [
      { known: "I don't enjoy", target: 'ich genieße nicht' },
      { known: "I don't enjoy speaking", target: 'ich genieße das Sprechen nicht' },
      { known: "I don't enjoy learning", target: 'ich genieße das Lernen nicht' },
      { known: "but I don't enjoy waiting", target: 'aber ich genieße das Warten nicht' },
      { known: "I don't enjoy making mistakes", target: 'ich genieße es nicht Fehler zu machen' },
      { known: "I don't enjoy doing boring things", target: 'ich genieße es nicht langweilige Dinge zu machen' },
      { known: "because I don't enjoy feeling tired", target: 'weil ich es nicht genieße mich müde zu fühlen' },
      { known: "I don't enjoy meeting people when I am tired", target: 'ich genieße es nicht Leute zu treffen wenn ich müde bin' },
      { known: "I don't enjoy speaking German when I am not ready", target: 'ich genieße es nicht Deutsch zu sprechen wenn ich nicht bereit bin' },
      { known: "I don't enjoy doing things as quickly as possible", target: 'ich genieße es nicht Dinge so schnell wie möglich zu machen' }
    ]
  ));

  await postLego(A(55, 2, 'waking up', 'aufwachen',
    [
      { known: 'waking up', target: 'aufwachen' },
      { known: "I don't enjoy waking up", target: 'ich genieße das Aufwachen nicht' },
      { known: 'I am waking up', target: 'ich wache auf' },
      { known: 'waking up early', target: 'früh aufwachen' },
      { known: 'waking up this morning', target: 'heute Morgen aufwachen' },
      { known: 'I was waking up', target: 'ich wachte auf' },
      { known: "I don't enjoy waking up when I am tired", target: 'ich genieße das Aufwachen nicht wenn ich müde bin' },
      { known: 'because I was waking up too early last week', target: 'weil ich letzte Woche zu früh aufwachte' },
      { known: 'I was starting to enjoy waking up more this month', target: 'ich fing diesen Monat an das Aufwachen mehr zu genießen' },
      { known: "I don't enjoy waking up before I have to go to meet my friends", target: 'ich genieße das Aufwachen nicht bevor ich gehen muss um meine Freunde zu treffen' }
    ]
  ));

  await postLego(M(55, 3, "I didn't sleep", 'ich habe nicht geschlafen',
    [{ known: 'sleep', target: 'geschlafen' }],
    [
      { known: "I didn't sleep", target: 'ich habe nicht geschlafen' },
      { known: "I didn't sleep well", target: 'ich habe nicht gut geschlafen' },
      { known: "when I didn't sleep", target: 'wenn ich nicht geschlafen habe' },
      { known: "I didn't sleep last night", target: 'ich habe letzte Nacht nicht geschlafen' },
      { known: "I didn't sleep very well", target: 'ich habe nicht sehr gut geschlafen' },
      { known: "because I didn't sleep enough", target: 'weil ich nicht genug geschlafen habe' },
      { known: "I don't enjoy waking up when I didn't sleep", target: 'ich genieße das Aufwachen nicht wenn ich nicht geschlafen habe' },
      { known: "I was tired because I didn't sleep well last night", target: 'ich war müde weil ich letzte Nacht nicht gut geschlafen habe' },
      { known: "I didn't sleep very well because I was thinking about it carefully", target: 'ich habe nicht sehr gut geschlafen weil ich sorgfältig darüber nachdachte' },
      { known: "I didn't sleep last week when I was trying to finish as quickly as possible", target: 'ich habe letzte Woche nicht geschlafen als ich versuchte so schnell wie möglich zu beenden' }
    ]
  ));

  console.log('\nDone building seeds 46-55');
}

buildSeeds().catch(console.error);
