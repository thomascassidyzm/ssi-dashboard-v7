/**
 * German Course Builder - Batch 5 (Seeds 56-70)
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

  // Seed 56: "So I can remember how to say a few words."
  await postLego(A(56, 1, 'so', 'also',
    [
      { known: 'so', target: 'also' },
      { known: 'so I can', target: 'also kann ich' },
      { known: 'so I want', target: 'also will ich' },
      { known: 'so I need', target: 'also brauche ich' },
      { known: 'so I can speak', target: 'also kann ich sprechen' },
      { known: 'so I can learn', target: 'also kann ich lernen' },
      { known: 'so I can remember', target: 'also kann ich mich erinnern' },
      { known: 'so I can meet people who speak German', target: 'also kann ich Leute treffen die Deutsch sprechen' },
      { known: 'so I can enjoy doing interesting things with my friends', target: 'also kann ich es genießen interessante Dinge mit meinen Freunden zu machen' },
      { known: 'so I can improve as quickly as possible', target: 'also kann ich so schnell wie möglich verbessern' }
    ]
  ));

  await postLego(M(56, 2, 'a few words', 'ein paar Wörter',
    [{ known: 'a few', target: 'ein paar' }, { known: 'words', target: 'Wörter' }],
    [
      { known: 'a few words', target: 'ein paar Wörter' },
      { known: 'I know a few words', target: 'ich kenne ein paar Wörter' },
      { known: 'to say a few words', target: 'ein paar Wörter sagen' },
      { known: 'I want to learn a few words', target: 'ich will ein paar Wörter lernen' },
      { known: 'so I can remember a few words', target: 'also kann ich mich an ein paar Wörter erinnern' },
      { known: 'I started to learn a few words last week', target: 'ich fing letzte Woche an ein paar Wörter zu lernen' },
      { known: 'because I want to remember how to say a few words', target: 'weil ich mich erinnern will wie man ein paar Wörter sagt' },
      { known: 'so I can remember how to say a few words in German', target: 'also kann ich mich erinnern wie man ein paar Wörter auf Deutsch sagt' },
      { known: 'I enjoy learning a few words every day', target: 'ich genieße es jeden Tag ein paar Wörter zu lernen' },
      { known: 'she wanted to give me a few words to learn last week', target: 'sie wollte mir letzte Woche ein paar Wörter zum Lernen geben' }
    ]
  ));

  // Seed 57: "I can't remember how to say what I wanted to say."
  await postLego(M(57, 1, "I can't remember", 'ich kann mich nicht erinnern',
    [{ known: "can't", target: 'kann nicht' }],
    [
      { known: "I can't remember", target: 'ich kann mich nicht erinnern' },
      { known: "I can't remember how", target: 'ich kann mich nicht erinnern wie' },
      { known: "I can't remember what", target: 'ich kann mich nicht erinnern was' },
      { known: "but I can't remember", target: 'aber ich kann mich nicht erinnern' },
      { known: "I can't remember his name", target: 'ich kann mich nicht an seinen Namen erinnern' },
      { known: "I can't remember how to speak", target: 'ich kann mich nicht erinnern wie man spricht' },
      { known: "I can't remember a few words", target: 'ich kann mich nicht an ein paar Wörter erinnern' },
      { known: "because I can't remember how to say it in German", target: 'weil ich mich nicht erinnern kann wie man es auf Deutsch sagt' },
      { known: "I can't remember what I wanted to say last week", target: 'ich kann mich nicht erinnern was ich letzte Woche sagen wollte' },
      { known: "so I can't remember how to finish as quickly as possible", target: 'also kann ich mich nicht erinnern wie man so schnell wie möglich beendet' }
    ]
  ));

  await postLego(M(57, 2, 'what I wanted to say', 'was ich sagen wollte',
    [{ known: 'what I wanted', target: 'was ich wollte' }],
    [
      { known: 'what I wanted to say', target: 'was ich sagen wollte' },
      { known: "I can't remember what I wanted to say", target: 'ich kann mich nicht erinnern was ich sagen wollte' },
      { known: 'what I wanted to do', target: 'was ich machen wollte' },
      { known: 'what I wanted to learn', target: 'was ich lernen wollte' },
      { known: "I don't know what I wanted to say", target: 'ich weiß nicht was ich sagen wollte' },
      { known: 'because I forgot what I wanted to say', target: 'weil ich vergessen habe was ich sagen wollte' },
      { known: "I can't remember how to say what I wanted to say", target: 'ich kann mich nicht erinnern wie man sagt was ich sagen wollte' },
      { known: 'she wanted to know what I wanted to say last night', target: 'sie wollte letzte Nacht wissen was ich sagen wollte' },
      { known: 'I was thinking carefully about what I wanted to say', target: 'ich dachte sorgfältig darüber nach was ich sagen wollte' },
      { known: "I can't remember what I wanted to say to my friends", target: 'ich kann mich nicht erinnern was ich meinen Freunden sagen wollte' }
    ]
  ));

  // Seed 58: "It's interesting when you understand enough words."
  await postLego(M(58, 1, "it's interesting", 'es ist interessant',
    [{ known: 'interesting', target: 'interessant' }],
    [
      { known: "it's interesting", target: 'es ist interessant' },
      { known: "I think it's interesting", target: 'ich denke es ist interessant' },
      { known: "it's interesting to learn", target: 'es ist interessant zu lernen' },
      { known: "it's interesting to speak", target: 'es ist interessant zu sprechen' },
      { known: "it's interesting when", target: 'es ist interessant wenn' },
      { known: "it's interesting to meet people who speak German", target: 'es ist interessant Leute zu treffen die Deutsch sprechen' },
      { known: "because it's interesting to do interesting things", target: 'weil es interessant ist interessante Dinge zu machen' },
      { known: "it's interesting when you understand enough words", target: 'es ist interessant wenn du genug Wörter verstehst' },
      { known: "I think it's interesting to make mistakes and learn from them", target: 'ich denke es ist interessant Fehler zu machen und von ihnen zu lernen' },
      { known: "it's interesting when you enjoy learning German with your friends", target: 'es ist interessant wenn du es genießt mit deinen Freunden Deutsch zu lernen' }
    ]
  ));

  await postLego(M(58, 2, 'when you understand', 'wenn du verstehst',
    [{ known: 'you understand', target: 'du verstehst' }],
    [
      { known: 'when you understand', target: 'wenn du verstehst' },
      { known: 'when you understand German', target: 'wenn du Deutsch verstehst' },
      { known: 'when you understand what I mean', target: 'wenn du verstehst was ich meine' },
      { known: "it's interesting when you understand", target: 'es ist interessant wenn du verstehst' },
      { known: 'I am happy when you understand', target: 'ich bin glücklich wenn du verstehst' },
      { known: 'when you understand enough words', target: 'wenn du genug Wörter verstehst' },
      { known: "it's interesting when you understand enough words", target: 'es ist interessant wenn du genug Wörter verstehst' },
      { known: 'because I enjoy speaking when you understand', target: 'weil ich es genieße zu sprechen wenn du verstehst' },
      { known: "when you understand what I wanted to say, it's a good thing", target: 'wenn du verstehst was ich sagen wollte ist es eine gute Sache' },
      { known: 'I feel better when you understand what I am trying to say', target: 'ich fühle mich besser wenn du verstehst was ich zu sagen versuche' }
    ]
  ));

  await postLego(M(58, 3, 'enough words', 'genug Wörter',
    [{ known: 'enough', target: 'genug' }],
    [
      { known: 'enough words', target: 'genug Wörter' },
      { known: 'I know enough words', target: 'ich kenne genug Wörter' },
      { known: 'to understand enough words', target: 'genug Wörter verstehen' },
      { known: 'I have enough', target: 'ich habe genug' },
      { known: 'enough time', target: 'genug Zeit' },
      { known: 'when you understand enough words', target: 'wenn du genug Wörter verstehst' },
      { known: "it's interesting when you understand enough words", target: 'es ist interessant wenn du genug Wörter verstehst' },
      { known: 'so I can remember enough words to speak German', target: 'also kann ich mich an genug Wörter erinnern um Deutsch zu sprechen' },
      { known: 'I am starting to learn enough words to enjoy speaking', target: 'ich fange an genug Wörter zu lernen um das Sprechen zu genießen' },
      { known: 'because I want to know enough words before I meet people who speak German', target: 'weil ich genug Wörter wissen will bevor ich Leute treffe die Deutsch sprechen' }
    ]
  ));

  // Seed 59: "I know how to do what I need to do next week."
  await postLego(M(59, 1, 'I know how', 'ich weiß wie',
    [{ known: 'know how', target: 'weiß wie' }],
    [
      { known: 'I know how', target: 'ich weiß wie' },
      { known: 'I know how to speak', target: 'ich weiß wie man spricht' },
      { known: 'I know how to do', target: 'ich weiß wie man macht' },
      { known: 'I know how to learn', target: 'ich weiß wie man lernt' },
      { known: 'I know how to help', target: 'ich weiß wie man hilft' },
      { known: 'I know how to answer', target: 'ich weiß wie man antwortet' },
      { known: 'I know how to say a few words', target: 'ich weiß wie man ein paar Wörter sagt' },
      { known: 'because I know how to improve quickly', target: 'weil ich weiß wie man schnell verbessert' },
      { known: 'I know how to meet people who speak German', target: 'ich weiß wie man Leute trifft die Deutsch sprechen' },
      { known: 'I know how to do what I need to do', target: 'ich weiß wie man macht was ich machen muss' }
    ]
  ));

  await postLego(M(59, 2, 'what I need to do', 'was ich machen muss',
    [{ known: 'need to do', target: 'machen muss' }],
    [
      { known: 'what I need to do', target: 'was ich machen muss' },
      { known: 'I know what I need to do', target: 'ich weiß was ich machen muss' },
      { known: 'I know how to do what I need to do', target: 'ich weiß wie man macht was ich machen muss' },
      { known: 'what you need to do', target: 'was du machen musst' },
      { known: 'I understand what I need to do', target: 'ich verstehe was ich machen muss' },
      { known: 'she knows what she needs to do', target: 'sie weiß was sie machen muss' },
      { known: 'because I know what I need to do next week', target: 'weil ich weiß was ich nächste Woche machen muss' },
      { known: "it's interesting when you know what you need to do", target: 'es ist interessant wenn du weißt was du machen musst' },
      { known: 'I was thinking about what I need to do last night', target: 'ich dachte letzte Nacht darüber nach was ich machen muss' },
      { known: 'I know what I need to do to meet people who speak German', target: 'ich weiß was ich machen muss um Leute zu treffen die Deutsch sprechen' }
    ]
  ));

  await postLego(A(59, 3, 'next week', 'nächste Woche',
    [
      { known: 'next week', target: 'nächste Woche' },
      { known: 'I know what I need to do next week', target: 'ich weiß was ich nächste Woche machen muss' },
      { known: 'I am going to speak German next week', target: 'ich werde nächste Woche Deutsch sprechen' },
      { known: 'she wants to meet next week', target: 'sie will nächste Woche treffen' },
      { known: 'I am looking forward to next week', target: 'ich freue mich auf nächste Woche' },
      { known: 'next week I want to learn more', target: 'nächste Woche will ich mehr lernen' },
      { known: 'I know how to do what I need to do next week', target: 'ich weiß wie man macht was ich nächste Woche machen muss' },
      { known: 'because I am meeting my friends next week', target: 'weil ich nächste Woche meine Freunde treffe' },
      { known: 'I want to finish the story next week', target: 'ich will nächste Woche die Geschichte beenden' },
      { known: 'I am going to enjoy doing interesting things with my friends next week', target: 'ich werde nächste Woche genießen interessante Dinge mit meinen Freunden zu machen' }
    ]
  ));

  // Seed 60: "I don't know how to say enough different words yet."
  await postLego(M(60, 1, "I don't know how", 'ich weiß nicht wie',
    [],
    [
      { known: "I don't know how", target: 'ich weiß nicht wie' },
      { known: "I don't know how to say", target: 'ich weiß nicht wie man sagt' },
      { known: "I don't know how to do", target: 'ich weiß nicht wie man macht' },
      { known: "but I don't know how", target: 'aber ich weiß nicht wie' },
      { known: "I don't know how to speak German", target: 'ich weiß nicht wie man Deutsch spricht' },
      { known: "I don't know how to answer", target: 'ich weiß nicht wie man antwortet' },
      { known: "I don't know how to say enough words", target: 'ich weiß nicht wie man genug Wörter sagt' },
      { known: "because I don't know how to improve yet", target: 'weil ich noch nicht weiß wie man verbessert' },
      { known: "I don't know how to finish as quickly as possible", target: 'ich weiß nicht wie man so schnell wie möglich beendet' },
      { known: "I don't know how to meet people who speak German next week", target: 'ich weiß nicht wie man nächste Woche Leute trifft die Deutsch sprechen' }
    ]
  ));

  await postLego(M(60, 2, 'different words', 'verschiedene Wörter',
    [{ known: 'different', target: 'verschiedene' }],
    [
      { known: 'different words', target: 'verschiedene Wörter' },
      { known: 'to say different words', target: 'verschiedene Wörter sagen' },
      { known: 'to learn different words', target: 'verschiedene Wörter lernen' },
      { known: 'I want to learn different words', target: 'ich will verschiedene Wörter lernen' },
      { known: 'enough different words', target: 'genug verschiedene Wörter' },
      { known: "I don't know how to say enough different words", target: 'ich weiß nicht wie man genug verschiedene Wörter sagt' },
      { known: 'because I need to learn different words', target: 'weil ich verschiedene Wörter lernen muss' },
      { known: "it's interesting to learn different words in German", target: 'es ist interessant verschiedene Wörter auf Deutsch zu lernen' },
      { known: 'I am starting to know different words now', target: 'ich fange jetzt an verschiedene Wörter zu kennen' },
      { known: 'I enjoy learning different words with my friends', target: 'ich genieße es verschiedene Wörter mit meinen Freunden zu lernen' }
    ]
  ));

  await postLego(A(60, 3, 'yet', 'noch',
    [
      { known: 'yet', target: 'noch' },
      { known: 'not yet', target: 'noch nicht' },
      { known: "I don't know yet", target: 'ich weiß noch nicht' },
      { known: "I haven't finished yet", target: 'ich habe noch nicht beendet' },
      { known: "I can't do it yet", target: 'ich kann es noch nicht machen' },
      { known: "I don't know how to say enough different words yet", target: 'ich weiß noch nicht wie man genug verschiedene Wörter sagt' },
      { known: "I'm not ready yet", target: 'ich bin noch nicht bereit' },
      { known: 'because I have not learned enough words yet', target: 'weil ich noch nicht genug Wörter gelernt habe' },
      { known: "I don't understand what you mean yet", target: 'ich verstehe noch nicht was du meinst' },
      { known: 'I am not able to meet people who speak German yet', target: 'ich kann noch nicht Leute treffen die Deutsch sprechen' }
    ]
  ));

  // Seed 61-70 (continuing with key patterns)

  // Seed 61: "I think you are saying it correctly."
  await postLego(M(61, 1, 'you are saying', 'du sagst',
    [{ known: 'are saying', target: 'sagst' }],
    [
      { known: 'you are saying', target: 'du sagst' },
      { known: 'what you are saying', target: 'was du sagst' },
      { known: 'I think you are saying', target: 'ich denke du sagst' },
      { known: 'I understand what you are saying', target: 'ich verstehe was du sagst' },
      { known: 'you are saying it correctly', target: 'du sagst es richtig' },
      { known: 'I think you are saying it correctly', target: 'ich denke du sagst es richtig' },
      { known: 'because I understand what you are saying in German', target: 'weil ich verstehe was du auf Deutsch sagst' },
      { known: 'I am not sure what you are saying yet', target: 'ich bin noch nicht sicher was du sagst' },
      { known: "it's interesting when I understand what you are saying", target: 'es ist interessant wenn ich verstehe was du sagst' },
      { known: 'I know what you are saying is correct', target: 'ich weiß dass das was du sagst richtig ist' }
    ]
  ));

  await postLego(A(61, 2, 'correctly', 'richtig',
    [
      { known: 'correctly', target: 'richtig' },
      { known: 'saying it correctly', target: 'es richtig sagen' },
      { known: 'speaking correctly', target: 'richtig sprechen' },
      { known: 'I want to speak correctly', target: 'ich will richtig sprechen' },
      { known: 'I think you are saying it correctly', target: 'ich denke du sagst es richtig' },
      { known: 'I am trying to say it correctly', target: 'ich versuche es richtig zu sagen' },
      { known: 'because I want to learn how to speak correctly', target: 'weil ich lernen will wie man richtig spricht' },
      { known: "it's a good thing to speak correctly", target: 'es ist eine gute Sache richtig zu sprechen' },
      { known: "I don't know if I am saying it correctly yet", target: 'ich weiß noch nicht ob ich es richtig sage' },
      { known: 'I enjoy learning how to say different words correctly', target: 'ich genieße es zu lernen wie man verschiedene Wörter richtig sagt' }
    ]
  ));

  // Seed 62: "I don't know if I said it correctly or not."
  await postLego(M(62, 1, "I don't know if", 'ich weiß nicht ob',
    [],
    [
      { known: "I don't know if", target: 'ich weiß nicht ob' },
      { known: "I don't know if I can", target: 'ich weiß nicht ob ich kann' },
      { known: "I don't know if I said it correctly", target: 'ich weiß nicht ob ich es richtig gesagt habe' },
      { known: "I don't know if you understand", target: 'ich weiß nicht ob du verstehst' },
      { known: "I don't know if I am ready", target: 'ich weiß nicht ob ich bereit bin' },
      { known: "I don't know if I have enough time", target: 'ich weiß nicht ob ich genug Zeit habe' },
      { known: "because I don't know if I said it correctly or not", target: 'weil ich nicht weiß ob ich es richtig gesagt habe oder nicht' },
      { known: "I don't know if I should meet people who speak German yet", target: 'ich weiß nicht ob ich schon Leute treffen soll die Deutsch sprechen' },
      { known: "I don't know if I can finish next week", target: 'ich weiß nicht ob ich nächste Woche beenden kann' },
      { known: "I don't know if she understands what I am saying", target: 'ich weiß nicht ob sie versteht was ich sage' }
    ]
  ));

  await postLego(M(62, 2, 'I said it', 'ich habe es gesagt',
    [{ known: 'I said', target: 'ich habe gesagt' }],
    [
      { known: 'I said it', target: 'ich habe es gesagt' },
      { known: 'I said it correctly', target: 'ich habe es richtig gesagt' },
      { known: "I don't know if I said it correctly", target: 'ich weiß nicht ob ich es richtig gesagt habe' },
      { known: 'I said what I wanted to say', target: 'ich habe gesagt was ich sagen wollte' },
      { known: 'I said a few words', target: 'ich habe ein paar Wörter gesagt' },
      { known: 'I said it to my friends last week', target: 'ich habe es meinen Freunden letzte Woche gesagt' },
      { known: "because I said it the way I thought was correct", target: 'weil ich es so gesagt habe wie ich dachte dass es richtig ist' },
      { known: "I don't know if I said it correctly or not", target: 'ich weiß nicht ob ich es richtig gesagt habe oder nicht' },
      { known: 'I think I said enough different words', target: 'ich denke ich habe genug verschiedene Wörter gesagt' },
      { known: 'I am not sure if I said it correctly in German', target: 'ich bin nicht sicher ob ich es richtig auf Deutsch gesagt habe' }
    ]
  ));

  await postLego(A(62, 3, 'or not', 'oder nicht',
    [
      { known: 'or not', target: 'oder nicht' },
      { known: 'I said it correctly or not', target: 'ich habe es richtig gesagt oder nicht' },
      { known: 'I am not sure if I said it correctly or not', target: 'ich bin nicht sicher ob ich es richtig gesagt habe oder nicht' },
      { known: 'I want to know if it is correct or not', target: 'ich will wissen ob es richtig ist oder nicht' },
      { known: 'whether or not', target: 'ob oder nicht' },
      { known: "I don't know if I said it correctly or not", target: 'ich weiß nicht ob ich es richtig gesagt habe oder nicht' },
      { known: 'she wants to know if I understand or not', target: 'sie will wissen ob ich verstehe oder nicht' },
      { known: 'I need to find out if I am ready or not', target: 'ich muss herausfinden ob ich bereit bin oder nicht' },
      { known: "I don't care if it is correct or not", target: 'es ist mir egal ob es richtig ist oder nicht' },
      { known: 'because I want to know if I said enough words or not', target: 'weil ich wissen will ob ich genug Wörter gesagt habe oder nicht' }
    ]
  ));

  // Seed 63: "I think about what to say before I speak."
  await postLego(A(63, 1, 'I think about', 'ich denke über',
    [
      { known: 'I think about', target: 'ich denke über' },
      { known: 'I think about what to say', target: 'ich denke darüber nach was ich sagen soll' },
      { known: 'I think about it', target: 'ich denke darüber nach' },
      { known: 'I think about it carefully', target: 'ich denke sorgfältig darüber nach' },
      { known: 'I was thinking about', target: 'ich dachte über nach' },
      { known: 'I think about what to do', target: 'ich denke darüber nach was ich machen soll' },
      { known: 'I think about what to say before I speak', target: 'ich denke darüber nach was ich sagen soll bevor ich spreche' },
      { known: 'because I think about it before I answer', target: 'weil ich darüber nachdenke bevor ich antworte' },
      { known: 'I think about how to say different words correctly', target: 'ich denke darüber nach wie man verschiedene Wörter richtig sagt' },
      { known: 'I enjoy thinking about what to say in German', target: 'ich genieße es darüber nachzudenken was ich auf Deutsch sagen soll' }
    ]
  ));

  await postLego(M(63, 2, 'what to say', 'was ich sagen soll',
    [{ known: 'to say', target: 'sagen soll' }],
    [
      { known: 'what to say', target: 'was ich sagen soll' },
      { known: 'I know what to say', target: 'ich weiß was ich sagen soll' },
      { known: "I don't know what to say", target: 'ich weiß nicht was ich sagen soll' },
      { known: 'I think about what to say', target: 'ich denke darüber nach was ich sagen soll' },
      { known: 'I am not sure what to say', target: 'ich bin nicht sicher was ich sagen soll' },
      { known: 'I want to know what to say', target: 'ich will wissen was ich sagen soll' },
      { known: 'I think about what to say before I speak', target: 'ich denke darüber nach was ich sagen soll bevor ich spreche' },
      { known: 'because I am thinking about what to say correctly', target: 'weil ich darüber nachdenke was ich richtig sagen soll' },
      { known: "I don't know what to say in German yet", target: 'ich weiß noch nicht was ich auf Deutsch sagen soll' },
      { known: "it's interesting to think about what to say next", target: 'es ist interessant darüber nachzudenken was ich als nächstes sagen soll' }
    ]
  ));

  await postLego(M(63, 3, 'before I speak', 'bevor ich spreche',
    [{ known: 'I speak', target: 'ich spreche' }],
    [
      { known: 'before I speak', target: 'bevor ich spreche' },
      { known: 'I think about what to say before I speak', target: 'ich denke darüber nach was ich sagen soll bevor ich spreche' },
      { known: 'I need to think before I speak', target: 'ich muss nachdenken bevor ich spreche' },
      { known: 'before I go', target: 'bevor ich gehe' },
      { known: 'before I meet my friends', target: 'bevor ich meine Freunde treffe' },
      { known: 'I want to know what to say before I speak', target: 'ich will wissen was ich sagen soll bevor ich spreche' },
      { known: 'because I need to think carefully before I speak German', target: 'weil ich sorgfältig nachdenken muss bevor ich Deutsch spreche' },
      { known: 'I am not ready before I speak to people who speak German', target: 'ich bin nicht bereit bevor ich mit Leuten spreche die Deutsch sprechen' },
      { known: "it's a good thing to think before I speak", target: 'es ist eine gute Sache nachzudenken bevor ich spreche' },
      { known: 'I want to remember enough words before I speak next week', target: 'ich will mich an genug Wörter erinnern bevor ich nächste Woche spreche' }
    ]
  ));

  // Seed 64: "She thinks you speak German very well."
  await postLego(M(64, 1, 'she thinks', 'sie denkt',
    [{ known: 'thinks', target: 'denkt' }],
    [
      { known: 'she thinks', target: 'sie denkt' },
      { known: 'she thinks that', target: 'sie denkt dass' },
      { known: 'she thinks you speak', target: 'sie denkt du sprichst' },
      { known: 'she thinks I am ready', target: 'sie denkt ich bin bereit' },
      { known: 'she thinks it is interesting', target: 'sie denkt es ist interessant' },
      { known: 'she thinks you speak German very well', target: 'sie denkt du sprichst sehr gut Deutsch' },
      { known: 'because she thinks I said it correctly', target: 'weil sie denkt ich habe es richtig gesagt' },
      { known: 'she thinks I know enough words now', target: 'sie denkt ich kenne jetzt genug Wörter' },
      { known: 'she thinks I should meet people who speak German', target: 'sie denkt ich sollte Leute treffen die Deutsch sprechen' },
      { known: 'she thinks you are saying it correctly at the moment', target: 'sie denkt du sagst es im Moment richtig' }
    ]
  ));

  await postLego(M(64, 2, 'you speak German', 'du sprichst Deutsch',
    [{ known: 'speak', target: 'sprichst' }],
    [
      { known: 'you speak German', target: 'du sprichst Deutsch' },
      { known: 'you speak German very well', target: 'du sprichst sehr gut Deutsch' },
      { known: 'she thinks you speak German', target: 'sie denkt du sprichst Deutsch' },
      { known: 'I think you speak German correctly', target: 'ich denke du sprichst richtig Deutsch' },
      { known: 'do you speak German', target: 'sprichst du Deutsch' },
      { known: 'how well do you speak German', target: 'wie gut sprichst du Deutsch' },
      { known: 'she thinks you speak German very well now', target: 'sie denkt du sprichst jetzt sehr gut Deutsch' },
      { known: 'because you speak German better than last month', target: 'weil du besser Deutsch sprichst als letzten Monat' },
      { known: 'I enjoy hearing you speak German with my friends', target: 'ich genieße es dich Deutsch mit meinen Freunden sprechen zu hören' },
      { known: "I think you speak German well enough to meet people who speak it", target: 'ich denke du sprichst gut genug Deutsch um Leute zu treffen die es sprechen' }
    ]
  ));

  // Seed 65: "They wanted to ask you a question about the story."
  await postLego(M(65, 1, 'they wanted', 'sie wollten',
    [{ known: 'they', target: 'sie' }],
    [
      { known: 'they wanted', target: 'sie wollten' },
      { known: 'they wanted to ask', target: 'sie wollten fragen' },
      { known: 'they wanted to speak', target: 'sie wollten sprechen' },
      { known: 'they wanted to learn', target: 'sie wollten lernen' },
      { known: 'they wanted to meet', target: 'sie wollten treffen' },
      { known: 'they wanted to help', target: 'sie wollten helfen' },
      { known: 'they wanted to ask you a question', target: 'sie wollten dir eine Frage stellen' },
      { known: 'because they wanted to speak German with my friends', target: 'weil sie mit meinen Freunden Deutsch sprechen wollten' },
      { known: 'they wanted to know what I said correctly', target: 'sie wollten wissen was ich richtig gesagt habe' },
      { known: 'they wanted to enjoy doing interesting things last week', target: 'sie wollten letzte Woche genießen interessante Dinge zu machen' }
    ]
  ));

  await postLego(M(65, 2, 'a question', 'eine Frage',
    [{ known: 'question', target: 'Frage' }],
    [
      { known: 'a question', target: 'eine Frage' },
      { known: 'to ask a question', target: 'eine Frage stellen' },
      { known: 'they wanted to ask a question', target: 'sie wollten eine Frage stellen' },
      { known: 'I have a question', target: 'ich habe eine Frage' },
      { known: 'a question about', target: 'eine Frage über' },
      { known: 'I want to ask you a question', target: 'ich will dir eine Frage stellen' },
      { known: 'they wanted to ask you a question about the story', target: 'sie wollten dir eine Frage über die Geschichte stellen' },
      { known: 'because I have a question about how to speak correctly', target: 'weil ich eine Frage habe wie man richtig spricht' },
      { known: "it's interesting to ask questions about different words", target: 'es ist interessant Fragen über verschiedene Wörter zu stellen' },
      { known: 'she thinks I should ask a question before I go next week', target: 'sie denkt ich sollte eine Frage stellen bevor ich nächste Woche gehe' }
    ]
  ));

  await postLego(M(65, 3, 'about the story', 'über die Geschichte',
    [],
    [
      { known: 'about the story', target: 'über die Geschichte' },
      { known: 'a question about the story', target: 'eine Frage über die Geschichte' },
      { known: 'they wanted to ask you a question about the story', target: 'sie wollten dir eine Frage über die Geschichte stellen' },
      { known: 'I want to know more about the story', target: 'ich will mehr über die Geschichte wissen' },
      { known: 'I was thinking about the story', target: 'ich dachte über die Geschichte nach' },
      { known: 'she was reading about the story', target: 'sie las über die Geschichte' },
      { known: 'because they enjoyed learning about the story', target: 'weil sie genossen über die Geschichte zu lernen' },
      { known: "it's interesting to ask questions about the story", target: 'es ist interessant Fragen über die Geschichte zu stellen' },
      { known: 'I want to write something about the story next week', target: 'ich will nächste Woche etwas über die Geschichte schreiben' },
      { known: 'they wanted to know everything about the story before they went', target: 'sie wollten alles über die Geschichte wissen bevor sie gingen' }
    ]
  ));

  console.log('\nDone building seeds 56-65');
}

buildSeeds().catch(console.error);
