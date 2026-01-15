/**
 * German Course Builder - Batch 3 (Seeds 36-45)
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

  // Seed 36: "We don't want to interrupt the story."
  await postLego(M(36, 1, "we don't want", 'wir wollen nicht',
    [{ known: "don't", target: 'nicht' }],
    [
      { known: "we don't want", target: 'wir wollen nicht' },
      { known: "we don't want to speak", target: 'wir wollen nicht sprechen' },
      { known: "we don't want to go", target: 'wir wollen nicht gehen' },
      { known: "we don't want to stop", target: 'wir wollen nicht aufhören' },
      { known: "but we don't want to help", target: 'aber wir wollen nicht helfen' },
      { known: "we don't want to be quiet", target: 'wir wollen nicht still sein' },
      { known: "we don't want to read anything this afternoon", target: 'wir wollen heute Nachmittag nichts lesen' },
      { known: "I think we don't want to take too much time", target: 'ich denke wir wollen nicht zu viel Zeit nehmen' },
      { known: "we don't want to meet other people here tonight", target: 'wir wollen heute Nacht hier keine anderen Leute treffen' },
      { known: "because we don't want to feel as if we have to go soon", target: 'weil wir uns nicht fühlen wollen als ob wir bald gehen müssen' }
    ]
  ));

  await postLego(A(36, 2, 'to interrupt', 'unterbrechen',
    [
      { known: 'to interrupt', target: 'unterbrechen' },
      { known: 'I want to interrupt', target: 'ich will unterbrechen' },
      { known: "we don't want to interrupt", target: 'wir wollen nicht unterbrechen' },
      { known: 'please do not interrupt', target: 'bitte unterbrich nicht' },
      { known: "he doesn't want to interrupt", target: 'er will nicht unterbrechen' },
      { known: 'I need to interrupt', target: 'ich muss unterbrechen' },
      { known: "I don't like to interrupt", target: 'ich mag nicht unterbrechen' },
      { known: 'because I have to interrupt before I go', target: 'weil ich unterbrechen muss bevor ich gehe' },
      { known: "we don't want to interrupt when other people are here", target: 'wir wollen nicht unterbrechen wenn andere Leute hier sind' },
      { known: "she doesn't want to interrupt the people who speak German", target: 'sie will die Leute nicht unterbrechen die Deutsch sprechen' }
    ]
  ));

  await postLego(M(36, 3, 'the story', 'die Geschichte',
    [{ known: 'story', target: 'Geschichte' }],
    [
      { known: 'the story', target: 'die Geschichte' },
      { known: 'I like the story', target: 'ich mag die Geschichte' },
      { known: 'to interrupt the story', target: 'die Geschichte unterbrechen' },
      { known: "we don't want to interrupt the story", target: 'wir wollen die Geschichte nicht unterbrechen' },
      { known: 'I want to read the story', target: 'ich will die Geschichte lesen' },
      { known: 'she is reading the story', target: 'sie liest die Geschichte' },
      { known: 'I wanted to show you the story yesterday', target: 'ich wollte dir gestern die Geschichte zeigen' },
      { known: 'because I am looking forward to the story', target: 'weil ich mich auf die Geschichte freue' },
      { known: "he doesn't want to be quiet when he is reading the story", target: 'er will nicht still sein wenn er die Geschichte liest' },
      { known: 'I think the story is useful to learn German', target: 'ich denke die Geschichte ist nützlich um Deutsch zu lernen' }
    ]
  ));

  // Seed 37: "I started to think about it carefully last month."
  await postLego(A(37, 1, 'I started', 'ich habe angefangen',
    [
      { known: 'I started', target: 'ich habe angefangen' },
      { known: 'I started to speak', target: 'ich habe angefangen zu sprechen' },
      { known: 'I started to learn', target: 'ich habe angefangen zu lernen' },
      { known: 'I started to read', target: 'ich habe angefangen zu lesen' },
      { known: 'I started yesterday', target: 'ich habe gestern angefangen' },
      { known: 'I started to feel better', target: 'ich habe angefangen mich besser zu fühlen' },
      { known: 'because I started to speak German more', target: 'weil ich angefangen habe mehr Deutsch zu sprechen' },
      { known: 'I started to meet people who speak German', target: 'ich habe angefangen Leute zu treffen die Deutsch sprechen' },
      { known: 'I started to understand when other people are here', target: 'ich habe angefangen zu verstehen wenn andere Leute hier sind' },
      { known: 'I started to think that it is useful to learn quickly', target: 'ich habe angefangen zu denken dass es nützlich ist schnell zu lernen' }
    ]
  ));

  await postLego(A(37, 2, 'to think', 'denken',
    [
      { known: 'to think', target: 'denken' },
      { known: 'I started to think', target: 'ich habe angefangen zu denken' },
      { known: 'I like to think', target: 'ich mag denken' },
      { known: 'to think about', target: 'über etwas denken' },
      { known: 'I need to think', target: 'ich muss denken' },
      { known: 'she wants to think', target: 'sie will denken' },
      { known: 'I started to think about the story', target: 'ich habe angefangen über die Geschichte nachzudenken' },
      { known: 'because I want to think before I answer', target: 'weil ich denken will bevor ich antworte' },
      { known: "I don't like to think when other people are here", target: 'ich mag nicht denken wenn andere Leute hier sind' },
      { known: 'I started to think about meeting people who speak German', target: 'ich habe angefangen darüber nachzudenken Leute zu treffen die Deutsch sprechen' }
    ]
  ));

  await postLego(A(37, 3, 'about it', 'darüber',
    [
      { known: 'about it', target: 'darüber' },
      { known: 'to think about it', target: 'darüber nachdenken' },
      { known: 'I started to think about it', target: 'ich habe angefangen darüber nachzudenken' },
      { known: 'I want to learn about it', target: 'ich will darüber lernen' },
      { known: 'to ask about it', target: 'darüber fragen' },
      { known: 'I wanted to ask about it yesterday', target: 'ich wollte gestern darüber fragen' },
      { known: 'because I am thinking about it now', target: 'weil ich jetzt darüber nachdenke' },
      { known: "I don't want to interrupt when you are thinking about it", target: 'ich will nicht unterbrechen wenn du darüber nachdenkst' },
      { known: 'she started to feel better when she thought about it', target: 'sie hat angefangen sich besser zu fühlen als sie darüber nachdachte' },
      { known: 'I am looking forward to thinking about it more this afternoon', target: 'ich freue mich darauf heute Nachmittag mehr darüber nachzudenken' }
    ]
  ));

  await postLego(A(37, 4, 'carefully', 'sorgfältig',
    [
      { known: 'carefully', target: 'sorgfältig' },
      { known: 'to think carefully', target: 'sorgfältig nachdenken' },
      { known: 'I started to think about it carefully', target: 'ich habe angefangen sorgfältig darüber nachzudenken' },
      { known: 'to speak carefully', target: 'sorgfältig sprechen' },
      { known: 'to read carefully', target: 'sorgfältig lesen' },
      { known: 'I want to answer carefully', target: 'ich will sorgfältig antworten' },
      { known: 'because I need to think carefully before I answer', target: 'weil ich sorgfältig nachdenken muss bevor ich antworte' },
      { known: 'she is reading the story carefully', target: 'sie liest die Geschichte sorgfältig' },
      { known: 'I started to speak German carefully with other people', target: 'ich habe angefangen sorgfältig mit anderen Leuten Deutsch zu sprechen' },
      { known: 'I am looking forward to learning carefully as soon as I can', target: 'ich freue mich darauf sorgfältig zu lernen sobald ich kann' }
    ]
  ));

  await postLego(A(37, 5, 'last month', 'letzten Monat',
    [
      { known: 'last month', target: 'letzten Monat' },
      { known: 'I started last month', target: 'ich habe letzten Monat angefangen' },
      { known: 'I wanted to meet last month', target: 'ich wollte letzten Monat treffen' },
      { known: 'she learned German last month', target: 'sie hat letzten Monat Deutsch gelernt' },
      { known: 'we spoke carefully last month', target: 'wir haben letzten Monat sorgfältig gesprochen' },
      { known: 'I started to think about it carefully last month', target: 'ich habe letzten Monat angefangen sorgfältig darüber nachzudenken' },
      { known: 'because I started to learn German last month', target: 'weil ich letzten Monat angefangen habe Deutsch zu lernen' },
      { known: 'I was feeling better last month', target: 'ich fühlte mich letzten Monat besser' },
      { known: 'I met people who speak German last month', target: 'ich habe letzten Monat Leute getroffen die Deutsch sprechen' },
      { known: 'I wanted to read the story carefully last month', target: 'ich wollte die Geschichte letzten Monat sorgfältig lesen' }
    ]
  ));

  // Seed 38: "I've been learning for about a week."
  await postLego(M(38, 1, "I've been", 'ich habe',
    [{ known: "I've", target: 'ich habe' }],
    [
      { known: "I've been", target: 'ich habe' },
      { known: "I've been learning", target: 'ich habe gelernt' },
      { known: "I've been speaking", target: 'ich habe gesprochen' },
      { known: "I've been reading", target: 'ich habe gelesen' },
      { known: "I've been thinking", target: 'ich habe nachgedacht' },
      { known: "I've been feeling better", target: 'ich habe mich besser gefühlt' },
      { known: "I've been learning German carefully", target: 'ich habe sorgfältig Deutsch gelernt' },
      { known: "I've been meeting people who speak German", target: 'ich habe Leute getroffen die Deutsch sprechen' },
      { known: "because I've been thinking about it since last month", target: 'weil ich seit letztem Monat darüber nachgedacht habe' },
      { known: "I've been looking forward to speaking German with other people", target: 'ich habe mich darauf gefreut mit anderen Leuten Deutsch zu sprechen' }
    ]
  ));

  await postLego(M(38, 2, 'for about', 'für ungefähr',
    [{ known: 'about', target: 'ungefähr' }, { known: 'for', target: 'für' }],
    [
      { known: 'for about', target: 'für ungefähr' },
      { known: 'for about a week', target: 'für ungefähr eine Woche' },
      { known: 'for about a month', target: 'für ungefähr einen Monat' },
      { known: "I've been learning for about", target: 'ich habe für ungefähr gelernt' },
      { known: 'I waited for about', target: 'ich habe für ungefähr gewartet' },
      { known: 'for about a week now', target: 'für ungefähr eine Woche jetzt' },
      { known: "I've been thinking about it for about a week", target: 'ich habe für ungefähr eine Woche darüber nachgedacht' },
      { known: 'she has been reading the story for about an hour', target: 'sie hat für ungefähr eine Stunde die Geschichte gelesen' },
      { known: "I've been meeting people who speak German for about a month", target: 'ich habe für ungefähr einen Monat Leute getroffen die Deutsch sprechen' },
      { known: 'because I started learning carefully for about a week last month', target: 'weil ich letzten Monat für ungefähr eine Woche angefangen habe sorgfältig zu lernen' }
    ]
  ));

  await postLego(A(38, 3, 'a week', 'eine Woche',
    [
      { known: 'a week', target: 'eine Woche' },
      { known: 'for a week', target: 'für eine Woche' },
      { known: 'for about a week', target: 'für ungefähr eine Woche' },
      { known: "I've been learning for about a week", target: 'ich habe für ungefähr eine Woche gelernt' },
      { known: 'I started a week ago', target: 'ich habe vor einer Woche angefangen' },
      { known: 'in a week', target: 'in einer Woche' },
      { known: 'I want to meet you in a week', target: 'ich will dich in einer Woche treffen' },
      { known: 'she has been speaking German for a week', target: 'sie hat für eine Woche Deutsch gesprochen' },
      { known: "I've been thinking about the story carefully for a week", target: 'ich habe für eine Woche sorgfältig über die Geschichte nachgedacht' },
      { known: 'because I want to learn German for about a week before I meet other people', target: 'weil ich für ungefähr eine Woche Deutsch lernen will bevor ich andere Leute treffe' }
    ]
  ));

  // Seed 39: "But I'm a little tired this morning."
  await postLego(M(39, 1, "I'm a little", 'ich bin ein bisschen',
    [{ known: "I'm", target: 'ich bin' }],
    [
      { known: "I'm a little", target: 'ich bin ein bisschen' },
      { known: "I'm a little tired", target: 'ich bin ein bisschen müde' },
      { known: "I'm a little busy", target: 'ich bin ein bisschen beschäftigt' },
      { known: "I'm a little better", target: 'ich bin ein bisschen besser' },
      { known: "but I'm a little", target: 'aber ich bin ein bisschen' },
      { known: "I'm a little nervous", target: 'ich bin ein bisschen nervös' },
      { known: "I'm a little more ready now", target: 'ich bin jetzt ein bisschen bereiter' },
      { known: "because I'm a little tired after learning for a week", target: 'weil ich ein bisschen müde bin nachdem ich für eine Woche gelernt habe' },
      { known: "I'm a little looking forward to meeting other people", target: 'ich freue mich ein bisschen darauf andere Leute zu treffen' },
      { known: "but I'm a little tired from thinking about it carefully", target: 'aber ich bin ein bisschen müde davon sorgfältig darüber nachzudenken' }
    ]
  ));

  await postLego(A(39, 2, 'tired', 'müde',
    [
      { known: 'tired', target: 'müde' },
      { known: "I'm tired", target: 'ich bin müde' },
      { known: "I'm a little tired", target: 'ich bin ein bisschen müde' },
      { known: 'feeling tired', target: 'müde fühlen' },
      { known: 'too tired', target: 'zu müde' },
      { known: "I'm too tired to speak", target: 'ich bin zu müde um zu sprechen' },
      { known: 'she is tired this afternoon', target: 'sie ist heute Nachmittag müde' },
      { known: 'because I am tired from reading the story', target: 'weil ich müde vom Lesen der Geschichte bin' },
      { known: "I don't want to be quiet when I'm tired", target: 'ich will nicht still sein wenn ich müde bin' },
      { known: "but I'm a little tired from meeting people who speak German", target: 'aber ich bin ein bisschen müde vom Treffen von Leuten die Deutsch sprechen' }
    ]
  ));

  await postLego(A(39, 3, 'this morning', 'heute Morgen',
    [
      { known: 'this morning', target: 'heute Morgen' },
      { known: "I'm tired this morning", target: 'ich bin heute Morgen müde' },
      { known: 'I started this morning', target: 'ich habe heute Morgen angefangen' },
      { known: 'she wants to meet this morning', target: 'sie will heute Morgen treffen' },
      { known: 'I was learning this morning', target: 'ich habe heute Morgen gelernt' },
      { known: "but I'm a little tired this morning", target: 'aber ich bin heute Morgen ein bisschen müde' },
      { known: 'I am looking forward to speaking German this morning', target: 'ich freue mich darauf heute Morgen Deutsch zu sprechen' },
      { known: 'because I was thinking about it carefully this morning', target: 'weil ich heute Morgen sorgfältig darüber nachgedacht habe' },
      { known: 'I wanted to read the story this morning but I was too tired', target: 'ich wollte heute Morgen die Geschichte lesen aber ich war zu müde' },
      { known: 'I met people who speak German this morning for about an hour', target: 'ich habe heute Morgen für ungefähr eine Stunde Leute getroffen die Deutsch sprechen' }
    ]
  ));

  // Seed 40: "How do you feel at the moment?"
  await postLego(M(40, 1, 'how do you', 'wie machst du',
    [{ known: 'how', target: 'wie' }, { known: 'do you', target: 'machst du' }],
    [
      { known: 'how do you', target: 'wie machst du' },
      { known: 'how do you feel', target: 'wie fühlst du dich' },
      { known: 'how do you speak', target: 'wie sprichst du' },
      { known: 'how do you learn', target: 'wie lernst du' },
      { known: 'how do you know', target: 'wie weißt du' },
      { known: 'how do you say', target: 'wie sagst du' },
      { known: 'how do you feel this morning', target: 'wie fühlst du dich heute Morgen' },
      { known: 'how do you think about it', target: 'wie denkst du darüber' },
      { known: 'how do you speak German with other people', target: 'wie sprichst du Deutsch mit anderen Leuten' },
      { known: 'how do you feel after learning for about a week', target: 'wie fühlst du dich nachdem du für ungefähr eine Woche gelernt hast' }
    ]
  ));

  await postLego(A(40, 2, 'feel', 'fühlen',
    [
      { known: 'feel', target: 'fühlen' },
      { known: 'I feel', target: 'ich fühle' },
      { known: 'how do you feel', target: 'wie fühlst du dich' },
      { known: 'I feel tired', target: 'ich fühle mich müde' },
      { known: 'I feel better', target: 'ich fühle mich besser' },
      { known: 'I feel ready', target: 'ich fühle mich bereit' },
      { known: 'I feel as if', target: 'ich fühle mich als ob' },
      { known: 'how do you feel about the story', target: 'wie fühlst du dich über die Geschichte' },
      { known: 'I feel a little tired this morning', target: 'ich fühle mich heute Morgen ein bisschen müde' },
      { known: 'because I feel ready to meet people who speak German', target: 'weil ich mich bereit fühle Leute zu treffen die Deutsch sprechen' }
    ]
  ));

  await postLego(M(40, 3, 'at the moment', 'im Moment',
    [{ known: 'moment', target: 'Moment' }],
    [
      { known: 'at the moment', target: 'im Moment' },
      { known: 'I feel tired at the moment', target: 'ich fühle mich im Moment müde' },
      { known: 'how do you feel at the moment', target: 'wie fühlst du dich im Moment' },
      { known: 'I am learning at the moment', target: 'ich lerne im Moment' },
      { known: 'she is reading at the moment', target: 'sie liest im Moment' },
      { known: 'I am thinking about it at the moment', target: 'ich denke im Moment darüber nach' },
      { known: "I'm a little busy at the moment", target: 'ich bin im Moment ein bisschen beschäftigt' },
      { known: 'because I feel better at the moment than yesterday', target: 'weil ich mich im Moment besser fühle als gestern' },
      { known: 'I am meeting people who speak German at the moment', target: 'ich treffe im Moment Leute die Deutsch sprechen' },
      { known: 'how do you feel at the moment after learning for about a week', target: 'wie fühlst du dich im Moment nachdem du für ungefähr eine Woche gelernt hast' }
    ]
  ));

  // Seed 41: "I feel okay, but I'm starting to feel tired."
  await postLego(A(41, 1, 'okay', 'okay',
    [
      { known: 'okay', target: 'okay' },
      { known: 'I feel okay', target: 'ich fühle mich okay' },
      { known: "I'm okay", target: 'ich bin okay' },
      { known: 'is it okay', target: 'ist es okay' },
      { known: 'are you okay', target: 'bist du okay' },
      { known: 'that is okay', target: 'das ist okay' },
      { known: 'I feel okay at the moment', target: 'ich fühle mich im Moment okay' },
      { known: 'I feel okay but a little tired', target: 'ich fühle mich okay aber ein bisschen müde' },
      { known: 'is it okay if I interrupt the story', target: 'ist es okay wenn ich die Geschichte unterbreche' },
      { known: 'I feel okay about meeting people who speak German', target: 'ich fühle mich okay dabei Leute zu treffen die Deutsch sprechen' }
    ]
  ));

  await postLego(M(41, 2, "I'm starting to", 'ich fange an',
    [{ known: 'starting', target: 'fange an' }],
    [
      { known: "I'm starting to", target: 'ich fange an' },
      { known: "I'm starting to feel", target: 'ich fange an zu fühlen' },
      { known: "I'm starting to speak", target: 'ich fange an zu sprechen' },
      { known: "I'm starting to learn", target: 'ich fange an zu lernen' },
      { known: "I'm starting to understand", target: 'ich fange an zu verstehen' },
      { known: "I'm starting to feel tired", target: 'ich fange an mich müde zu fühlen' },
      { known: "but I'm starting to feel better", target: 'aber ich fange an mich besser zu fühlen' },
      { known: "I'm starting to think about it carefully", target: 'ich fange an sorgfältig darüber nachzudenken' },
      { known: "I'm starting to meet people who speak German", target: 'ich fange an Leute zu treffen die Deutsch sprechen' },
      { known: "because I'm starting to feel ready to speak more at the moment", target: 'weil ich im Moment anfange mich bereit zu fühlen mehr zu sprechen' }
    ]
  ));

  // Seed 42: "I was starting to feel better than last night."
  await postLego(M(42, 1, 'I was starting to', 'ich fing an',
    [{ known: 'was starting', target: 'fing an' }],
    [
      { known: 'I was starting to', target: 'ich fing an' },
      { known: 'I was starting to feel', target: 'ich fing an zu fühlen' },
      { known: 'I was starting to speak', target: 'ich fing an zu sprechen' },
      { known: 'I was starting to learn', target: 'ich fing an zu lernen' },
      { known: 'I was starting to feel better', target: 'ich fing an mich besser zu fühlen' },
      { known: 'I was starting to feel tired yesterday', target: 'ich fing gestern an mich müde zu fühlen' },
      { known: 'I was starting to think about it carefully last month', target: 'ich fing letzten Monat an sorgfältig darüber nachzudenken' },
      { known: 'because I was starting to feel okay at the moment', target: 'weil ich im Moment anfing mich okay zu fühlen' },
      { known: 'I was starting to meet people who speak German last week', target: 'ich fing letzte Woche an Leute zu treffen die Deutsch sprechen' },
      { known: 'I was starting to feel ready to read the story carefully', target: 'ich fing an mich bereit zu fühlen die Geschichte sorgfältig zu lesen' }
    ]
  ));

  await postLego(M(42, 2, 'better than', 'besser als',
    [{ known: 'than', target: 'als' }],
    [
      { known: 'better than', target: 'besser als' },
      { known: 'better than yesterday', target: 'besser als gestern' },
      { known: 'I feel better than', target: 'ich fühle mich besser als' },
      { known: 'better than before', target: 'besser als vorher' },
      { known: 'I was starting to feel better than', target: 'ich fing an mich besser zu fühlen als' },
      { known: 'I speak better than last month', target: 'ich spreche besser als letzten Monat' },
      { known: 'she is feeling better than this morning', target: 'sie fühlt sich besser als heute Morgen' },
      { known: 'because I am learning better than before', target: 'weil ich besser lerne als vorher' },
      { known: 'I feel better than I did for about a week', target: 'ich fühle mich besser als ich für ungefähr eine Woche gefühlt habe' },
      { known: 'I was starting to speak German better than other people here', target: 'ich fing an besser Deutsch zu sprechen als andere Leute hier' }
    ]
  ));

  await postLego(A(42, 3, 'last night', 'letzte Nacht',
    [
      { known: 'last night', target: 'letzte Nacht' },
      { known: 'I felt tired last night', target: 'ich fühlte mich letzte Nacht müde' },
      { known: 'better than last night', target: 'besser als letzte Nacht' },
      { known: 'I was starting to feel better than last night', target: 'ich fing an mich besser zu fühlen als letzte Nacht' },
      { known: 'I spoke German last night', target: 'ich sprach letzte Nacht Deutsch' },
      { known: 'she wanted to meet last night', target: 'sie wollte letzte Nacht treffen' },
      { known: 'I was reading the story last night', target: 'ich las letzte Nacht die Geschichte' },
      { known: 'because I was thinking about it carefully last night', target: 'weil ich letzte Nacht sorgfältig darüber nachdachte' },
      { known: 'I met people who speak German last night at six', target: 'ich traf letzte Nacht um sechs Leute die Deutsch sprechen' },
      { known: 'I was starting to feel okay last night but a little tired', target: 'ich fing letzte Nacht an mich okay aber ein bisschen müde zu fühlen' }
    ]
  ));

  // Seed 43: "I wasn't thinking about how to answer."
  await postLego(M(43, 1, "I wasn't", 'ich war nicht',
    [{ known: "wasn't", target: 'war nicht' }],
    [
      { known: "I wasn't", target: 'ich war nicht' },
      { known: "I wasn't thinking", target: 'ich dachte nicht' },
      { known: "I wasn't speaking", target: 'ich sprach nicht' },
      { known: "I wasn't feeling well", target: 'ich fühlte mich nicht gut' },
      { known: "I wasn't ready", target: 'ich war nicht bereit' },
      { known: "I wasn't tired last night", target: 'ich war letzte Nacht nicht müde' },
      { known: "because I wasn't thinking about it carefully", target: 'weil ich nicht sorgfältig darüber nachdachte' },
      { known: "I wasn't meeting people who speak German last month", target: 'ich traf letzten Monat keine Leute die Deutsch sprechen' },
      { known: "I wasn't starting to feel better than before", target: 'ich fing nicht an mich besser als vorher zu fühlen' },
      { known: "I wasn't reading the story carefully this morning", target: 'ich las heute Morgen die Geschichte nicht sorgfältig' }
    ]
  ));

  await postLego(M(43, 2, 'how to answer', 'wie man antwortet',
    [{ known: 'how to', target: 'wie man' }],
    [
      { known: 'how to answer', target: 'wie man antwortet' },
      { known: 'I know how to answer', target: 'ich weiß wie man antwortet' },
      { known: "I wasn't thinking about how to answer", target: 'ich dachte nicht darüber nach wie man antwortet' },
      { known: 'how to speak', target: 'wie man spricht' },
      { known: 'how to learn', target: 'wie man lernt' },
      { known: 'I want to learn how to answer', target: 'ich will lernen wie man antwortet' },
      { known: "I'm starting to understand how to answer", target: 'ich fange an zu verstehen wie man antwortet' },
      { known: 'because I was thinking about how to answer carefully', target: 'weil ich sorgfältig darüber nachdachte wie man antwortet' },
      { known: "I wasn't thinking about how to answer when other people are here", target: 'ich dachte nicht darüber nach wie man antwortet wenn andere Leute hier sind' },
      { known: 'I wanted to know how to answer better than last night', target: 'ich wollte wissen wie man besser antwortet als letzte Nacht' }
    ]
  ));

  // Seed 44: "Or if I need to improve."
  await postLego(A(44, 1, 'or', 'oder',
    [
      { known: 'or', target: 'oder' },
      { known: 'or if', target: 'oder ob' },
      { known: 'or not', target: 'oder nicht' },
      { known: 'yes or no', target: 'ja oder nein' },
      { known: 'now or later', target: 'jetzt oder später' },
      { known: 'this or that', target: 'dies oder das' },
      { known: 'I want to speak or learn', target: 'ich will sprechen oder lernen' },
      { known: 'I am not sure if I should go or stay', target: 'ich bin nicht sicher ob ich gehen oder bleiben soll' },
      { known: 'or if I need to think about it more carefully', target: 'oder ob ich sorgfältiger darüber nachdenken muss' },
      { known: 'I want to meet people who speak German or other people here', target: 'ich will Leute treffen die Deutsch sprechen oder andere Leute hier' }
    ]
  ));

  await postLego(A(44, 2, 'if', 'ob',
    [
      { known: 'if', target: 'ob' },
      { known: 'if I need', target: 'ob ich brauche' },
      { known: 'if you want', target: 'ob du willst' },
      { known: 'or if', target: 'oder ob' },
      { known: 'I want to know if', target: 'ich will wissen ob' },
      { known: "I'm not sure if", target: 'ich bin nicht sicher ob' },
      { known: 'if I feel tired', target: 'ob ich mich müde fühle' },
      { known: 'or if I need to speak more carefully', target: 'oder ob ich sorgfältiger sprechen muss' },
      { known: "I wasn't thinking about if I should answer", target: 'ich dachte nicht darüber nach ob ich antworten sollte' },
      { known: 'I want to find out if she wants to meet people who speak German', target: 'ich will herausfinden ob sie Leute treffen will die Deutsch sprechen' }
    ]
  ));

  await postLego(A(44, 3, 'to improve', 'verbessern',
    [
      { known: 'to improve', target: 'verbessern' },
      { known: 'I need to improve', target: 'ich muss verbessern' },
      { known: 'I want to improve', target: 'ich will verbessern' },
      { known: 'or if I need to improve', target: 'oder ob ich verbessern muss' },
      { known: 'to improve my German', target: 'mein Deutsch verbessern' },
      { known: 'I am trying to improve', target: 'ich versuche zu verbessern' },
      { known: "I'm starting to improve", target: 'ich fange an zu verbessern' },
      { known: 'I need to improve how I answer', target: 'ich muss verbessern wie ich antworte' },
      { known: 'because I want to improve better than last month', target: 'weil ich besser verbessern will als letzten Monat' },
      { known: 'or if I need to improve by meeting people who speak German', target: 'oder ob ich verbessern muss indem ich Leute treffe die Deutsch sprechen' }
    ]
  ));

  // Seed 45: "I don't need to know everything."
  await postLego(M(45, 1, "I don't need", 'ich brauche nicht',
    [{ known: "don't need", target: 'brauche nicht' }],
    [
      { known: "I don't need", target: 'ich brauche nicht' },
      { known: "I don't need to speak", target: 'ich brauche nicht zu sprechen' },
      { known: "I don't need to know", target: 'ich brauche nicht zu wissen' },
      { known: "I don't need to go", target: 'ich brauche nicht zu gehen' },
      { known: "I don't need to improve", target: 'ich brauche nicht zu verbessern' },
      { known: "but I don't need to feel tired", target: 'aber ich brauche mich nicht müde zu fühlen' },
      { known: "I don't need to answer carefully", target: 'ich brauche nicht sorgfältig zu antworten' },
      { known: "because I don't need to think about it more", target: 'weil ich nicht mehr darüber nachdenken brauche' },
      { known: "I don't need to meet people who speak German at the moment", target: 'ich brauche im Moment keine Leute zu treffen die Deutsch sprechen' },
      { known: "or if I don't need to read the story this morning", target: 'oder ob ich heute Morgen die Geschichte nicht zu lesen brauche' }
    ]
  ));

  await postLego(A(45, 2, 'to know', 'wissen',
    [
      { known: 'to know', target: 'wissen' },
      { known: 'I want to know', target: 'ich will wissen' },
      { known: 'I need to know', target: 'ich muss wissen' },
      { known: "I don't need to know", target: 'ich brauche nicht zu wissen' },
      { known: 'do you know', target: 'weißt du' },
      { known: 'I want to know how', target: 'ich will wissen wie' },
      { known: 'I want to know if she is coming', target: 'ich will wissen ob sie kommt' },
      { known: "I don't need to know everything", target: 'ich brauche nicht alles zu wissen' },
      { known: 'because I want to know how to answer better', target: 'weil ich wissen will wie ich besser antworte' },
      { known: 'I was starting to know how to speak German with other people', target: 'ich fing an zu wissen wie man mit anderen Leuten Deutsch spricht' }
    ]
  ));

  await postLego(A(45, 3, 'everything', 'alles',
    [
      { known: 'everything', target: 'alles' },
      { known: 'I know everything', target: 'ich weiß alles' },
      { known: "I don't need to know everything", target: 'ich brauche nicht alles zu wissen' },
      { known: 'everything is okay', target: 'alles ist okay' },
      { known: 'I want to learn everything', target: 'ich will alles lernen' },
      { known: 'I want to understand everything', target: 'ich will alles verstehen' },
      { known: "but I don't need to know everything at the moment", target: 'aber ich brauche im Moment nicht alles zu wissen' },
      { known: 'she wants to read everything in the story', target: 'sie will alles in der Geschichte lesen' },
      { known: 'because I am starting to understand everything better than before', target: 'weil ich anfange alles besser zu verstehen als vorher' },
      { known: "I don't need to know everything about how to speak German", target: 'ich brauche nicht alles darüber zu wissen wie man Deutsch spricht' }
    ]
  ));

  console.log('\nDone building seeds 36-45');
}

buildSeeds().catch(console.error);
