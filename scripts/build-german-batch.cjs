/**
 * German Course Builder - Batch Processing
 * Builds LEGOs and phrases for deu_for_eng course
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
      if (json.hint) console.log(`   Hint: ${json.hint}`);
      return false;
    }
    console.log(`✓ S${String(data.seed).padStart(4,'0')}L${String(data.idx).padStart(2,'0')}: ${data.known} → ${data.target} (${json.phrases} phrases)`);
    return true;
  } catch (err) {
    console.log(`Error: ${err.message}`);
    return false;
  }
}

// Helper to build lego object
function lego(seed, idx, type, known, target, components, phrases) {
  return { course_code: 'deu_for_eng', seed, idx, type, known, target, components, phrases };
}

function A(seed, idx, known, target, phrases) {
  return lego(seed, idx, 'A', known, target, null, phrases);
}

function M(seed, idx, known, target, components, phrases) {
  return lego(seed, idx, 'M', known, target, components, phrases);
}

async function buildSeeds() {

  // Seed 18: "We want to meet at six o'clock this evening."
  await postLego(M(18, 1, 'we want', 'wir wollen',
    [{ known: 'we', target: 'wir' }, { known: 'want', target: 'wollen' }],
    [
      { known: 'we want', target: 'wir wollen' },
      { known: 'we want to speak', target: 'wir wollen sprechen' },
      { known: 'we want to speak German', target: 'wir wollen Deutsch sprechen' },
      { known: 'we want to learn', target: 'wir wollen lernen' },
      { known: 'we want to practise', target: 'wir wollen üben' },
      { known: 'we want to understand', target: 'wir wollen verstehen' },
      { known: 'we want to find out', target: 'wir wollen herausfinden' },
      { known: 'I think we want to speak German now', target: 'ich denke wir wollen jetzt Deutsch sprechen' },
      { known: 'we want to learn German with you every day', target: 'wir wollen jeden Tag mit dir Deutsch lernen' },
      { known: 'I think that we want to find out what the answer is', target: 'ich denke dass wir herausfinden wollen was die Antwort ist' }
    ]
  ));

  await postLego(A(18, 2, 'to meet', 'treffen',
    [
      { known: 'to meet', target: 'treffen' },
      { known: 'I want to meet', target: 'ich will treffen' },
      { known: 'we want to meet', target: 'wir wollen treffen' },
      { known: 'she wants to meet', target: 'sie will treffen' },
      { known: 'I am going to meet', target: 'ich werde treffen' },
      { known: 'I am trying to meet', target: 'ich versuche zu treffen' },
      { known: 'I want to meet you', target: 'ich will dich treffen' },
      { known: 'we want to meet now', target: 'wir wollen jetzt treffen' },
      { known: 'I think we want to meet with someone else', target: 'ich denke wir wollen mit jemand anderem treffen' },
      { known: 'she wants to meet with you to speak German every day', target: 'sie will mit dir treffen um jeden Tag Deutsch zu sprechen' }
    ]
  ));

  await postLego(A(18, 3, 'at six', 'um sechs',
    [
      { known: 'at six', target: 'um sechs' },
      { known: 'I want to meet at six', target: 'ich will um sechs treffen' },
      { known: 'we want to meet at six', target: 'wir wollen um sechs treffen' },
      { known: 'at six now', target: 'um sechs jetzt' },
      { known: 'I am going to speak at six', target: 'ich werde um sechs sprechen' },
      { known: 'she wants to meet at six', target: 'sie will um sechs treffen' },
      { known: 'we want to practise German at six', target: 'wir wollen um sechs Deutsch üben' },
      { known: 'I think we want to meet at six with you', target: 'ich denke wir wollen um sechs mit dir treffen' },
      { known: 'I want to find out if we can meet at six', target: 'ich will herausfinden ob wir um sechs treffen können' },
      { known: 'she wants to meet with someone else at six every day', target: 'sie will jeden Tag um sechs mit jemand anderem treffen' }
    ]
  ));

  await postLego(M(18, 4, "o'clock", 'Uhr',
    [{ known: "o'clock", target: 'Uhr' }],
    [
      { known: "o'clock", target: 'Uhr' },
      { known: "six o'clock", target: 'sechs Uhr' },
      { known: "at six o'clock", target: 'um sechs Uhr' },
      { known: "I want to meet at six o'clock", target: 'ich will um sechs Uhr treffen' },
      { known: "we want to meet at six o'clock", target: 'wir wollen um sechs Uhr treffen' },
      { known: "she wants to speak at six o'clock", target: 'sie will um sechs Uhr sprechen' },
      { known: "I am going to practise at six o'clock", target: 'ich werde um sechs Uhr üben' },
      { known: "we want to learn German at six o'clock every day", target: 'wir wollen jeden Tag um sechs Uhr Deutsch lernen' },
      { known: "I think we want to meet at six o'clock with you now", target: 'ich denke wir wollen jetzt um sechs Uhr mit dir treffen' },
      { known: "she wants to find out what the answer is at six o'clock", target: 'sie will um sechs Uhr herausfinden was die Antwort ist' }
    ]
  ));

  await postLego(A(18, 5, 'this evening', 'heute Abend',
    [
      { known: 'this evening', target: 'heute Abend' },
      { known: 'I want to speak this evening', target: 'ich will heute Abend sprechen' },
      { known: 'we want to meet this evening', target: 'wir wollen heute Abend treffen' },
      { known: 'she wants to learn this evening', target: 'sie will heute Abend lernen' },
      { known: "at six o'clock this evening", target: 'um sechs Uhr heute Abend' },
      { known: "we want to meet at six o'clock this evening", target: 'wir wollen heute Abend um sechs Uhr treffen' },
      { known: 'I am going to practise German this evening', target: 'ich werde heute Abend Deutsch üben' },
      { known: 'I think we want to speak German this evening with you', target: 'ich denke wir wollen heute Abend mit dir Deutsch sprechen' },
      { known: "she wants to meet at six o'clock this evening to speak German", target: 'sie will heute Abend um sechs Uhr treffen um Deutsch zu sprechen' },
      { known: "I want to find out what the answer is this evening at six o'clock", target: 'ich will heute Abend um sechs Uhr herausfinden was die Antwort ist' }
    ]
  ));

  // Seed 19: "But I don't want to stop talking."
  await postLego(A(19, 1, 'but', 'aber',
    [
      { known: 'but', target: 'aber' },
      { known: 'but I want', target: 'aber ich will' },
      { known: 'but she wants', target: 'aber sie will' },
      { known: 'but we want', target: 'aber wir wollen' },
      { known: 'but I need', target: 'aber ich brauche' },
      { known: 'but not very well', target: 'aber nicht sehr gut' },
      { known: 'but I am trying', target: 'aber ich versuche' },
      { known: 'but I want to speak German now', target: 'aber ich will jetzt Deutsch sprechen' },
      { known: 'but we want to meet this evening at six', target: 'aber wir wollen heute Abend um sechs treffen' },
      { known: 'but I think she wants to find out what the answer is', target: 'aber ich denke sie will herausfinden was die Antwort ist' }
    ]
  ));

  await postLego(M(19, 2, "I don't want", 'ich will nicht',
    [{ known: "don't", target: 'nicht' }, { known: "I don't", target: 'ich nicht' }],
    [
      { known: "I don't want", target: 'ich will nicht' },
      { known: "I don't want to speak", target: 'ich will nicht sprechen' },
      { known: "I don't want to learn", target: 'ich will nicht lernen' },
      { known: "I don't want to meet", target: 'ich will nicht treffen' },
      { known: "but I don't want", target: 'aber ich will nicht' },
      { known: "I don't want to speak German now", target: 'ich will jetzt nicht Deutsch sprechen' },
      { known: "but I don't want to meet this evening", target: 'aber ich will heute Abend nicht treffen' },
      { known: "I don't want to find out what the answer is", target: 'ich will nicht herausfinden was die Antwort ist' },
      { known: "I think I don't want to practise German with you now", target: 'ich denke ich will jetzt nicht mit dir Deutsch üben' },
      { known: "but I don't want to meet at six o'clock this evening with someone else", target: 'aber ich will heute Abend um sechs Uhr nicht mit jemand anderem treffen' }
    ]
  ));

  await postLego(A(19, 3, 'to stop', 'aufhören',
    [
      { known: 'to stop', target: 'aufhören' },
      { known: 'I want to stop', target: 'ich will aufhören' },
      { known: "I don't want to stop", target: 'ich will nicht aufhören' },
      { known: 'she wants to stop', target: 'sie will aufhören' },
      { known: 'we want to stop', target: 'wir wollen aufhören' },
      { known: 'I am going to stop', target: 'ich werde aufhören' },
      { known: 'but I do not want to stop now', target: 'aber ich will jetzt nicht aufhören' },
      { known: 'I do not want to stop speaking German', target: 'ich will nicht aufhören Deutsch zu sprechen' },
      { known: 'she does not want to stop practising German this evening', target: 'sie will heute Abend nicht aufhören Deutsch zu üben' },
      { known: 'but I think we do not want to stop learning German every day', target: 'aber ich denke wir wollen nicht aufhören jeden Tag Deutsch zu lernen' }
    ]
  ));

  await postLego(A(19, 4, 'talking', 'reden',
    [
      { known: 'talking', target: 'reden' },
      { known: 'I want to stop talking', target: 'ich will aufhören zu reden' },
      { known: "I don't want to stop talking", target: 'ich will nicht aufhören zu reden' },
      { known: 'she wants to stop talking', target: 'sie will aufhören zu reden' },
      { known: 'but I do not want to stop talking', target: 'aber ich will nicht aufhören zu reden' },
      { known: 'I like talking', target: 'ich mag reden' },
      { known: 'I am trying to stop talking', target: 'ich versuche aufzuhören zu reden' },
      { known: 'we do not want to stop talking German now', target: 'wir wollen jetzt nicht aufhören Deutsch zu reden' },
      { known: 'but she does not want to stop talking with you this evening', target: 'aber sie will heute Abend nicht aufhören mit dir zu reden' },
      { known: 'I think I do not want to stop talking German at six o clock', target: 'ich denke ich will nicht um sechs Uhr aufhören Deutsch zu reden' }
    ]
  ));

  // Seed 20: "You want to learn his name quickly."
  await postLego(M(20, 1, 'you want', 'du willst',
    [{ known: 'you', target: 'du' }, { known: 'want', target: 'willst' }],
    [
      { known: 'you want', target: 'du willst' },
      { known: 'you want to speak', target: 'du willst sprechen' },
      { known: 'you want to learn', target: 'du willst lernen' },
      { known: 'you want to meet', target: 'du willst treffen' },
      { known: 'you want to understand', target: 'du willst verstehen' },
      { known: 'but you want', target: 'aber du willst' },
      { known: 'I think you want to speak German', target: 'ich denke du willst Deutsch sprechen' },
      { known: 'you want to meet at six this evening', target: 'du willst heute Abend um sechs treffen' },
      { known: 'I think you want to find out what the answer is now', target: 'ich denke du willst jetzt herausfinden was die Antwort ist' },
      { known: 'but you want to stop talking and learn German every day', target: 'aber du willst aufhören zu reden und jeden Tag Deutsch lernen' }
    ]
  ));

  await postLego(M(20, 2, 'his name', 'seinen Namen',
    [{ known: 'his', target: 'seinen' }, { known: 'name', target: 'Namen' }],
    [
      { known: 'his name', target: 'seinen Namen' },
      { known: 'I want his name', target: 'ich will seinen Namen' },
      { known: 'you want his name', target: 'du willst seinen Namen' },
      { known: 'she wants his name', target: 'sie will seinen Namen' },
      { known: 'I want to learn his name', target: 'ich will seinen Namen lernen' },
      { known: 'you want to learn his name', target: 'du willst seinen Namen lernen' },
      { known: 'I need to find out his name', target: 'ich brauche seinen Namen herauszufinden' },
      { known: 'I am trying to learn his name now', target: 'ich versuche jetzt seinen Namen zu lernen' },
      { known: 'she wants to find out what his name is in German', target: 'sie will herausfinden was sein Name auf Deutsch ist' },
      { known: 'but I think you want to learn his name this evening at six', target: 'aber ich denke du willst heute Abend um sechs seinen Namen lernen' }
    ]
  ));

  await postLego(A(20, 3, 'quickly', 'schnell',
    [
      { known: 'quickly', target: 'schnell' },
      { known: 'to speak quickly', target: 'schnell sprechen' },
      { known: 'to learn quickly', target: 'schnell lernen' },
      { known: 'I want to learn quickly', target: 'ich will schnell lernen' },
      { known: 'you want to learn his name quickly', target: 'du willst seinen Namen schnell lernen' },
      { known: 'she wants to speak quickly', target: 'sie will schnell sprechen' },
      { known: 'I am trying to learn German quickly', target: 'ich versuche schnell Deutsch zu lernen' },
      { known: 'but I do not want to speak too quickly', target: 'aber ich will nicht zu schnell sprechen' },
      { known: 'you want to find out the answer quickly this evening', target: 'du willst heute Abend schnell die Antwort herausfinden' },
      { known: 'I think we want to learn his name quickly at six o clock', target: 'ich denke wir wollen um sechs Uhr schnell seinen Namen lernen' }
    ]
  ));

  // Seed 21: "Why are you learning her name?"
  await postLego(A(21, 1, 'why', 'warum',
    [
      { known: 'why', target: 'warum' },
      { known: 'why do you want', target: 'warum willst du' },
      { known: 'why are you learning', target: 'warum lernst du' },
      { known: 'why is it difficult', target: 'warum ist es schwierig' },
      { known: 'why do you want to speak German', target: 'warum willst du Deutsch sprechen' },
      { known: 'why do you want to meet this evening', target: 'warum willst du heute Abend treffen' },
      { known: 'I want to find out why', target: 'ich will herausfinden warum' },
      { known: 'why do you want to learn his name quickly', target: 'warum willst du seinen Namen schnell lernen' },
      { known: 'I do not understand why you want to stop talking', target: 'ich verstehe nicht warum du aufhören willst zu reden' },
      { known: 'why does she want to find out what the answer is now', target: 'warum will sie jetzt herausfinden was die Antwort ist' }
    ]
  ));

  await postLego(M(21, 2, 'are you learning', 'lernst du',
    [{ known: 'are you', target: 'du' }, { known: 'learning', target: 'lernst' }],
    [
      { known: 'are you learning', target: 'lernst du' },
      { known: 'are you learning German', target: 'lernst du Deutsch' },
      { known: 'why are you learning', target: 'warum lernst du' },
      { known: 'why are you learning German', target: 'warum lernst du Deutsch' },
      { known: 'are you learning quickly', target: 'lernst du schnell' },
      { known: 'are you learning his name', target: 'lernst du seinen Namen' },
      { known: 'why are you learning his name quickly', target: 'warum lernst du seinen Namen schnell' },
      { known: 'are you learning German every day now', target: 'lernst du jetzt jeden Tag Deutsch' },
      { known: 'why are you learning to speak German with someone else', target: 'warum lernst du mit jemand anderem Deutsch zu sprechen' },
      { known: 'I want to find out why are you learning German this evening', target: 'ich will herausfinden warum du heute Abend Deutsch lernst' }
    ]
  ));

  await postLego(M(21, 3, 'her name', 'ihren Namen',
    [{ known: 'her', target: 'ihren' }],
    [
      { known: 'her name', target: 'ihren Namen' },
      { known: 'I want her name', target: 'ich will ihren Namen' },
      { known: 'you want her name', target: 'du willst ihren Namen' },
      { known: 'I want to learn her name', target: 'ich will ihren Namen lernen' },
      { known: 'why are you learning her name', target: 'warum lernst du ihren Namen' },
      { known: 'she wants to find out her name', target: 'sie will ihren Namen herausfinden' },
      { known: 'I am trying to learn her name quickly', target: 'ich versuche ihren Namen schnell zu lernen' },
      { known: 'do you want to learn her name now', target: 'willst du jetzt ihren Namen lernen' },
      { known: 'I want to find out what her name is in German', target: 'ich will herausfinden was ihr Name auf Deutsch ist' },
      { known: 'why are you learning her name quickly this evening at six', target: 'warum lernst du heute Abend um sechs ihren Namen schnell' }
    ]
  ));

  // Seed 22: "Because I want to meet people who speak German."
  await postLego(A(22, 1, 'because', 'weil',
    [
      { known: 'because', target: 'weil' },
      { known: 'because I want', target: 'weil ich will' },
      { known: 'because she wants', target: 'weil sie will' },
      { known: 'because you want', target: 'weil du willst' },
      { known: 'because we want', target: 'weil wir wollen' },
      { known: 'because it is important', target: 'weil es wichtig ist' },
      { known: 'because I want to learn German', target: 'weil ich Deutsch lernen will' },
      { known: 'because I am trying to speak quickly', target: 'weil ich versuche schnell zu sprechen' },
      { known: 'because I want to find out what her name is', target: 'weil ich herausfinden will was ihr Name ist' },
      { known: 'because she wants to meet at six o clock this evening', target: 'weil sie heute Abend um sechs Uhr treffen will' }
    ]
  ));

  await postLego(A(22, 2, 'people', 'Leute',
    [
      { known: 'people', target: 'Leute' },
      { known: 'I want to meet people', target: 'ich will Leute treffen' },
      { known: 'she wants to meet people', target: 'sie will Leute treffen' },
      { known: 'we want to meet people', target: 'wir wollen Leute treffen' },
      { known: 'I like to meet people', target: 'ich mag Leute treffen' },
      { known: 'because I want to meet people', target: 'weil ich Leute treffen will' },
      { known: 'why do you want to meet people', target: 'warum willst du Leute treffen' },
      { known: 'I am trying to meet people who speak German', target: 'ich versuche Leute zu treffen die Deutsch sprechen' },
      { known: 'because I want to meet people every day', target: 'weil ich jeden Tag Leute treffen will' },
      { known: 'she wants to meet people at six o clock this evening', target: 'sie will heute Abend um sechs Uhr Leute treffen' }
    ]
  ));

  await postLego(M(22, 3, 'who speak', 'die sprechen',
    [{ known: 'who', target: 'die' }],
    [
      { known: 'who speak', target: 'die sprechen' },
      { known: 'people who speak', target: 'Leute die sprechen' },
      { known: 'people who speak German', target: 'Leute die Deutsch sprechen' },
      { known: 'I want to meet people who speak German', target: 'ich will Leute treffen die Deutsch sprechen' },
      { known: 'because I want to meet people who speak German', target: 'weil ich Leute treffen will die Deutsch sprechen' },
      { known: 'she wants to find people who speak German', target: 'sie will Leute finden die Deutsch sprechen' },
      { known: 'why do you want to meet people who speak German', target: 'warum willst du Leute treffen die Deutsch sprechen' },
      { known: 'I am trying to meet people who speak German quickly', target: 'ich versuche Leute zu treffen die schnell Deutsch sprechen' },
      { known: 'because she wants to meet people who speak German every day', target: 'weil sie jeden Tag Leute treffen will die Deutsch sprechen' },
      { known: 'I want to meet people who speak German at six this evening', target: 'ich will heute Abend um sechs Leute treffen die Deutsch sprechen' }
    ]
  ));

  // Seed 23: "I'm going to start talking more soon."
  await postLego(A(23, 1, 'to start', 'anfangen',
    [
      { known: 'to start', target: 'anfangen' },
      { known: 'I want to start', target: 'ich will anfangen' },
      { known: 'I am going to start', target: 'ich werde anfangen' },
      { known: 'she wants to start', target: 'sie will anfangen' },
      { known: 'we want to start', target: 'wir wollen anfangen' },
      { known: 'I am going to start speaking', target: 'ich werde anfangen zu sprechen' },
      { known: 'I want to start learning German', target: 'ich will anfangen Deutsch zu lernen' },
      { known: 'because I am going to start now', target: 'weil ich jetzt anfangen werde' },
      { known: 'she wants to start talking with people who speak German', target: 'sie will anfangen mit Leuten zu reden die Deutsch sprechen' },
      { known: 'I am going to start learning quickly at six o clock this evening', target: 'ich werde heute Abend um sechs Uhr anfangen schnell zu lernen' }
    ]
  ));

  await postLego(A(23, 2, 'more', 'mehr',
    [
      { known: 'more', target: 'mehr' },
      { known: 'to speak more', target: 'mehr sprechen' },
      { known: 'to learn more', target: 'mehr lernen' },
      { known: 'I want to speak more', target: 'ich will mehr sprechen' },
      { known: 'I am going to start talking more', target: 'ich werde anfangen mehr zu reden' },
      { known: 'she wants to learn more', target: 'sie will mehr lernen' },
      { known: 'we want to practise more', target: 'wir wollen mehr üben' },
      { known: 'because I want to understand more', target: 'weil ich mehr verstehen will' },
      { known: 'I am trying to meet more people who speak German', target: 'ich versuche mehr Leute zu treffen die Deutsch sprechen' },
      { known: 'why do you want to speak more German every day', target: 'warum willst du jeden Tag mehr Deutsch sprechen' }
    ]
  ));

  await postLego(A(23, 3, 'soon', 'bald',
    [
      { known: 'soon', target: 'bald' },
      { known: 'I am going to speak soon', target: 'ich werde bald sprechen' },
      { known: 'she wants to start soon', target: 'sie will bald anfangen' },
      { known: 'we want to meet soon', target: 'wir wollen bald treffen' },
      { known: 'I am going to start talking more soon', target: 'ich werde bald anfangen mehr zu reden' },
      { known: 'because I want to learn more soon', target: 'weil ich bald mehr lernen will' },
      { known: 'I am going to find out soon', target: 'ich werde bald herausfinden' },
      { known: 'you want to meet people who speak German soon', target: 'du willst bald Leute treffen die Deutsch sprechen' },
      { known: 'I think she wants to start speaking German more soon', target: 'ich denke sie will bald anfangen mehr Deutsch zu sprechen' },
      { known: 'because I am going to start learning her name soon every day', target: 'weil ich bald anfangen werde jeden Tag ihren Namen zu lernen' }
    ]
  ));

  // Seed 24: "I'm not going to be able to remember easily."
  await postLego(M(24, 1, "I'm not going to", 'ich werde nicht',
    [{ known: 'not', target: 'nicht' }],
    [
      { known: "I'm not going to", target: 'ich werde nicht' },
      { known: "I'm not going to speak", target: 'ich werde nicht sprechen' },
      { known: "I'm not going to meet", target: 'ich werde nicht treffen' },
      { known: "I'm not going to start", target: 'ich werde nicht anfangen' },
      { known: "I'm not going to stop", target: 'ich werde nicht aufhören' },
      { known: "but I'm not going to learn more soon", target: 'aber ich werde nicht bald mehr lernen' },
      { known: "I'm not going to speak German this evening", target: 'ich werde heute Abend nicht Deutsch sprechen' },
      { known: "I think I'm not going to meet people who speak German", target: 'ich denke ich werde nicht Leute treffen die Deutsch sprechen' },
      { known: "because I'm not going to start talking more soon", target: 'weil ich nicht bald anfangen werde mehr zu reden' },
      { known: "I'm not going to find out what his name is at six o clock", target: 'ich werde nicht um sechs Uhr herausfinden was sein Name ist' }
    ]
  ));

  await postLego(M(24, 2, 'to be able to', 'können',
    [{ known: 'able', target: 'können' }],
    [
      { known: 'to be able to', target: 'können' },
      { known: 'I am able to speak', target: 'ich kann sprechen' },
      { known: "I'm not going to be able to", target: 'ich werde nicht können' },
      { known: "I'm not going to be able to speak", target: 'ich werde nicht sprechen können' },
      { known: 'she is able to understand', target: 'sie kann verstehen' },
      { known: 'we are able to meet', target: 'wir können treffen' },
      { known: "I'm not going to be able to learn more soon", target: 'ich werde nicht bald mehr lernen können' },
      { known: 'because I am able to speak German quickly', target: 'weil ich schnell Deutsch sprechen kann' },
      { known: "I'm not going to be able to meet people who speak German", target: 'ich werde nicht Leute treffen können die Deutsch sprechen' },
      { known: "I think I'm not going to be able to start talking at six", target: 'ich denke ich werde nicht um sechs anfangen zu reden können' }
    ]
  ));

  await postLego(A(24, 3, 'to remember', 'erinnern',
    [
      { known: 'to remember', target: 'erinnern' },
      { known: 'I want to remember', target: 'ich will mich erinnern' },
      { known: "I'm trying to remember", target: 'ich versuche mich zu erinnern' },
      { known: "I'm not going to be able to remember", target: 'ich werde mich nicht erinnern können' },
      { known: 'I want to remember his name', target: 'ich will mich an seinen Namen erinnern' },
      { known: 'she wants to remember her name', target: 'sie will sich an ihren Namen erinnern' },
      { known: 'I need to remember what you say', target: 'ich brauche mich zu erinnern was du sagst' },
      { known: 'because I want to remember more', target: 'weil ich mich an mehr erinnern will' },
      { known: "I'm not going to be able to remember quickly", target: 'ich werde mich nicht schnell erinnern können' },
      { known: 'I think I want to remember the answer soon', target: 'ich denke ich will mich bald an die Antwort erinnern' }
    ]
  ));

  await postLego(A(24, 4, 'easily', 'leicht',
    [
      { known: 'easily', target: 'leicht' },
      { known: 'to remember easily', target: 'leicht erinnern' },
      { known: 'to learn easily', target: 'leicht lernen' },
      { known: 'I can speak easily', target: 'ich kann leicht sprechen' },
      { known: "I'm not going to be able to remember easily", target: 'ich werde mich nicht leicht erinnern können' },
      { known: 'she wants to learn German easily', target: 'sie will leicht Deutsch lernen' },
      { known: 'it is not easily to understand', target: 'es ist nicht leicht zu verstehen' },
      { known: 'because I can learn more easily now', target: 'weil ich jetzt leichter mehr lernen kann' },
      { known: 'I think you can remember his name easily', target: 'ich denke du kannst dich leicht an seinen Namen erinnern' },
      { known: "I'm not going to be able to meet people who speak German easily", target: 'ich werde nicht leicht Leute treffen können die Deutsch sprechen' }
    ]
  ));

  // Seed 25: "Are you going to help me before I have to go?"
  await postLego(M(25, 1, 'are you going to', 'wirst du',
    [{ known: 'are', target: 'wirst' }],
    [
      { known: 'are you going to', target: 'wirst du' },
      { known: 'are you going to speak', target: 'wirst du sprechen' },
      { known: 'are you going to learn', target: 'wirst du lernen' },
      { known: 'are you going to meet', target: 'wirst du treffen' },
      { known: 'are you going to start', target: 'wirst du anfangen' },
      { known: 'are you going to remember', target: 'wirst du dich erinnern' },
      { known: 'are you going to speak German soon', target: 'wirst du bald Deutsch sprechen' },
      { known: 'are you going to meet people who speak German', target: 'wirst du Leute treffen die Deutsch sprechen' },
      { known: 'are you going to learn his name quickly this evening', target: 'wirst du heute Abend schnell seinen Namen lernen' },
      { known: 'are you going to start talking more at six o clock', target: 'wirst du um sechs Uhr anfangen mehr zu reden' }
    ]
  ));

  await postLego(A(25, 2, 'to help', 'helfen',
    [
      { known: 'to help', target: 'helfen' },
      { known: 'I want to help', target: 'ich will helfen' },
      { known: 'are you going to help', target: 'wirst du helfen' },
      { known: 'she wants to help', target: 'sie will helfen' },
      { known: 'I am going to help', target: 'ich werde helfen' },
      { known: 'I need to help', target: 'ich brauche zu helfen' },
      { known: 'because I want to help you', target: 'weil ich dir helfen will' },
      { known: 'are you going to help me learn German', target: 'wirst du mir helfen Deutsch zu lernen' },
      { known: 'I think she wants to help people who speak German', target: 'ich denke sie will Leuten helfen die Deutsch sprechen' },
      { known: 'are you going to help me remember his name easily', target: 'wirst du mir helfen mich leicht an seinen Namen zu erinnern' }
    ]
  ));

  await postLego(A(25, 3, 'me', 'mir',
    [
      { known: 'me', target: 'mir' },
      { known: 'help me', target: 'hilf mir' },
      { known: 'to help me', target: 'mir zu helfen' },
      { known: 'are you going to help me', target: 'wirst du mir helfen' },
      { known: 'I want you to help me', target: 'ich will dass du mir hilfst' },
      { known: 'she wants to help me', target: 'sie will mir helfen' },
      { known: 'because she wants to help me learn more', target: 'weil sie mir helfen will mehr zu lernen' },
      { known: 'are you going to help me speak German', target: 'wirst du mir helfen Deutsch zu sprechen' },
      { known: 'I think you want to help me remember easily', target: 'ich denke du willst mir helfen mich leicht zu erinnern' },
      { known: 'are you going to help me meet people who speak German soon', target: 'wirst du mir bald helfen Leute zu treffen die Deutsch sprechen' }
    ]
  ));

  await postLego(A(25, 4, 'before', 'bevor',
    [
      { known: 'before', target: 'bevor' },
      { known: 'before I go', target: 'bevor ich gehe' },
      { known: 'before you start', target: 'bevor du anfängst' },
      { known: 'before she meets', target: 'bevor sie trifft' },
      { known: 'before we stop', target: 'bevor wir aufhören' },
      { known: 'I want to learn before', target: 'ich will vorher lernen' },
      { known: 'are you going to help me before', target: 'wirst du mir vorher helfen' },
      { known: 'I need to remember before I start talking', target: 'ich brauche mich zu erinnern bevor ich anfange zu reden' },
      { known: 'are you going to help me before six o clock', target: 'wirst du mir vor sechs Uhr helfen' },
      { known: 'I want to learn German before I meet people who speak it', target: 'ich will Deutsch lernen bevor ich Leute treffe die es sprechen' }
    ]
  ));

  await postLego(M(25, 5, 'I have to', 'ich muss',
    [{ known: 'have to', target: 'muss' }],
    [
      { known: 'I have to', target: 'ich muss' },
      { known: 'I have to go', target: 'ich muss gehen' },
      { known: 'I have to speak', target: 'ich muss sprechen' },
      { known: 'I have to learn', target: 'ich muss lernen' },
      { known: 'before I have to go', target: 'bevor ich gehen muss' },
      { known: 'I have to help', target: 'ich muss helfen' },
      { known: 'are you going to help me before I have to go', target: 'wirst du mir helfen bevor ich gehen muss' },
      { known: 'I have to remember his name quickly', target: 'ich muss mich schnell an seinen Namen erinnern' },
      { known: 'because I have to meet people who speak German soon', target: 'weil ich bald Leute treffen muss die Deutsch sprechen' },
      { known: 'I have to start learning more before I go at six o clock', target: 'ich muss anfangen mehr zu lernen bevor ich um sechs Uhr gehe' }
    ]
  ));

  await postLego(A(25, 6, 'to go', 'gehen',
    [
      { known: 'to go', target: 'gehen' },
      { known: 'I have to go', target: 'ich muss gehen' },
      { known: 'I want to go', target: 'ich will gehen' },
      { known: 'she wants to go', target: 'sie will gehen' },
      { known: 'before I have to go', target: 'bevor ich gehen muss' },
      { known: 'are you going to go', target: 'wirst du gehen' },
      { known: 'I am going to go soon', target: 'ich werde bald gehen' },
      { known: 'are you going to help me before I have to go', target: 'wirst du mir helfen bevor ich gehen muss' },
      { known: 'because I have to go at six o clock this evening', target: 'weil ich heute Abend um sechs Uhr gehen muss' },
      { known: 'I want to meet people who speak German before I go', target: 'ich will Leute treffen die Deutsch sprechen bevor ich gehe' }
    ]
  ));

  console.log('\nDone building seeds 18-25');
}

buildSeeds().catch(console.error);
