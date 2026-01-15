/**
 * German Course Builder - Batch 6 (Seeds 66-80)
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

  // Seed 66: "We think they should stay a little longer."
  await postLego(M(66, 1, 'we think', 'wir denken',
    [],
    [
      { known: 'we think', target: 'wir denken' },
      { known: 'we think that', target: 'wir denken dass' },
      { known: 'we think you should', target: 'wir denken du solltest' },
      { known: 'we think they should', target: 'wir denken sie sollten' },
      { known: 'we think it is interesting', target: 'wir denken es ist interessant' },
      { known: 'we think they should stay', target: 'wir denken sie sollten bleiben' },
      { known: 'because we think you speak German very well', target: 'weil wir denken du sprichst sehr gut Deutsch' },
      { known: 'we think she said it correctly', target: 'wir denken sie hat es richtig gesagt' },
      { known: 'we think they should ask a question about the story', target: 'wir denken sie sollten eine Frage über die Geschichte stellen' },
      { known: 'we think you know enough words to speak German now', target: 'wir denken du kennst jetzt genug Wörter um Deutsch zu sprechen' }
    ]
  ));

  await postLego(M(66, 2, 'they should', 'sie sollten',
    [{ known: 'should', target: 'sollten' }],
    [
      { known: 'they should', target: 'sie sollten' },
      { known: 'they should stay', target: 'sie sollten bleiben' },
      { known: 'they should learn', target: 'sie sollten lernen' },
      { known: 'they should speak', target: 'sie sollten sprechen' },
      { known: 'we think they should', target: 'wir denken sie sollten' },
      { known: 'they should ask a question', target: 'sie sollten eine Frage stellen' },
      { known: 'they should stay a little longer', target: 'sie sollten ein bisschen länger bleiben' },
      { known: 'because they should know enough words now', target: 'weil sie jetzt genug Wörter wissen sollten' },
      { known: 'they should think about what to say before they speak', target: 'sie sollten darüber nachdenken was sie sagen bevor sie sprechen' },
      { known: 'she thinks they should meet people who speak German next week', target: 'sie denkt sie sollten nächste Woche Leute treffen die Deutsch sprechen' }
    ]
  ));

  await postLego(A(66, 3, 'to stay', 'bleiben',
    [
      { known: 'to stay', target: 'bleiben' },
      { known: 'I want to stay', target: 'ich will bleiben' },
      { known: 'they should stay', target: 'sie sollten bleiben' },
      { known: 'I am going to stay', target: 'ich werde bleiben' },
      { known: 'to stay a little longer', target: 'ein bisschen länger bleiben' },
      { known: 'she wants to stay here', target: 'sie will hier bleiben' },
      { known: 'we think they should stay a little longer', target: 'wir denken sie sollten ein bisschen länger bleiben' },
      { known: 'because I want to stay and speak German more', target: 'weil ich bleiben und mehr Deutsch sprechen will' },
      { known: 'I am going to stay until I learn enough words', target: 'ich werde bleiben bis ich genug Wörter lerne' },
      { known: 'they wanted to stay and enjoy doing interesting things with their friends', target: 'sie wollten bleiben und genießen interessante Dinge mit ihren Freunden zu machen' }
    ]
  ));

  await postLego(M(66, 4, 'a little longer', 'ein bisschen länger',
    [{ known: 'longer', target: 'länger' }],
    [
      { known: 'a little longer', target: 'ein bisschen länger' },
      { known: 'to stay a little longer', target: 'ein bisschen länger bleiben' },
      { known: 'we think they should stay a little longer', target: 'wir denken sie sollten ein bisschen länger bleiben' },
      { known: 'I want to stay a little longer', target: 'ich will ein bisschen länger bleiben' },
      { known: 'she wanted to speak a little longer', target: 'sie wollte ein bisschen länger sprechen' },
      { known: 'I need a little longer to finish', target: 'ich brauche ein bisschen länger um zu beenden' },
      { known: 'because I want to learn a little longer today', target: 'weil ich heute ein bisschen länger lernen will' },
      { known: 'I am going to stay a little longer to meet my friends', target: 'ich werde ein bisschen länger bleiben um meine Freunde zu treffen' },
      { known: 'they should stay a little longer to ask a question about the story', target: 'sie sollten ein bisschen länger bleiben um eine Frage über die Geschichte zu stellen' },
      { known: 'I think you should stay a little longer to speak German with people who speak it', target: 'ich denke du solltest ein bisschen länger bleiben um mit Leuten Deutsch zu sprechen die es sprechen' }
    ]
  ));

  // Seed 67: "I should have said something else before."
  await postLego(M(67, 1, 'I should have', 'ich hätte sollen',
    [{ known: 'should have', target: 'hätte sollen' }],
    [
      { known: 'I should have', target: 'ich hätte sollen' },
      { known: 'I should have said', target: 'ich hätte sagen sollen' },
      { known: 'I should have stayed', target: 'ich hätte bleiben sollen' },
      { known: 'I should have learned', target: 'ich hätte lernen sollen' },
      { known: 'I should have spoken', target: 'ich hätte sprechen sollen' },
      { known: 'I should have asked', target: 'ich hätte fragen sollen' },
      { known: 'I should have said something else', target: 'ich hätte etwas anderes sagen sollen' },
      { known: 'because I should have stayed a little longer', target: 'weil ich ein bisschen länger hätte bleiben sollen' },
      { known: 'I should have asked a question about the story', target: 'ich hätte eine Frage über die Geschichte stellen sollen' },
      { known: 'I think I should have said it correctly', target: 'ich denke ich hätte es richtig sagen sollen' }
    ]
  ));

  await postLego(M(67, 2, 'something else', 'etwas anderes',
    [{ known: 'else', target: 'anderes' }],
    [
      { known: 'something else', target: 'etwas anderes' },
      { known: 'I should have said something else', target: 'ich hätte etwas anderes sagen sollen' },
      { known: 'I want to do something else', target: 'ich will etwas anderes machen' },
      { known: 'something else to say', target: 'etwas anderes zu sagen' },
      { known: 'or something else', target: 'oder etwas anderes' },
      { known: 'I am thinking about something else', target: 'ich denke über etwas anderes nach' },
      { known: 'I should have said something else before I went', target: 'ich hätte etwas anderes sagen sollen bevor ich ging' },
      { known: 'because I want to learn something else in German', target: 'weil ich etwas anderes auf Deutsch lernen will' },
      { known: 'she thinks I should say something else', target: 'sie denkt ich sollte etwas anderes sagen' },
      { known: 'they wanted to ask about something else about the story', target: 'sie wollten über etwas anderes in der Geschichte fragen' }
    ]
  ));

  // Seed 68: "Maybe I will understand everything next time."
  await postLego(A(68, 1, 'maybe', 'vielleicht',
    [
      { known: 'maybe', target: 'vielleicht' },
      { known: 'maybe I will', target: 'vielleicht werde ich' },
      { known: 'maybe I can', target: 'vielleicht kann ich' },
      { known: 'maybe I should', target: 'vielleicht sollte ich' },
      { known: 'maybe they will stay', target: 'vielleicht werden sie bleiben' },
      { known: 'maybe I will understand', target: 'vielleicht werde ich verstehen' },
      { known: 'maybe I should have said something else', target: 'vielleicht hätte ich etwas anderes sagen sollen' },
      { known: 'because maybe I will know enough words next week', target: 'weil ich vielleicht nächste Woche genug Wörter wissen werde' },
      { known: 'maybe she thinks you speak German very well', target: 'vielleicht denkt sie du sprichst sehr gut Deutsch' },
      { known: 'maybe they wanted to ask a question about the story', target: 'vielleicht wollten sie eine Frage über die Geschichte stellen' }
    ]
  ));

  await postLego(M(68, 2, 'I will understand', 'ich werde verstehen',
    [{ known: 'will understand', target: 'werde verstehen' }],
    [
      { known: 'I will understand', target: 'ich werde verstehen' },
      { known: 'maybe I will understand', target: 'vielleicht werde ich verstehen' },
      { known: 'I will understand everything', target: 'ich werde alles verstehen' },
      { known: 'I will understand what you say', target: 'ich werde verstehen was du sagst' },
      { known: 'I will understand better', target: 'ich werde besser verstehen' },
      { known: 'I hope I will understand', target: 'ich hoffe ich werde verstehen' },
      { known: 'maybe I will understand everything next time', target: 'vielleicht werde ich nächstes Mal alles verstehen' },
      { known: 'because I will understand more if I stay a little longer', target: 'weil ich mehr verstehen werde wenn ich ein bisschen länger bleibe' },
      { known: 'I think I will understand enough words to speak German', target: 'ich denke ich werde genug Wörter verstehen um Deutsch zu sprechen' },
      { known: 'maybe I will understand what to say before I speak next week', target: 'vielleicht werde ich verstehen was ich sagen soll bevor ich nächste Woche spreche' }
    ]
  ));

  await postLego(A(68, 3, 'next time', 'nächstes Mal',
    [
      { known: 'next time', target: 'nächstes Mal' },
      { known: 'maybe next time', target: 'vielleicht nächstes Mal' },
      { known: 'I will understand next time', target: 'ich werde nächstes Mal verstehen' },
      { known: 'I will do better next time', target: 'ich werde es nächstes Mal besser machen' },
      { known: 'I will say it correctly next time', target: 'ich werde es nächstes Mal richtig sagen' },
      { known: 'I should have done something else next time', target: 'ich hätte nächstes Mal etwas anderes machen sollen' },
      { known: 'maybe I will understand everything next time', target: 'vielleicht werde ich nächstes Mal alles verstehen' },
      { known: 'because I want to stay a little longer next time', target: 'weil ich nächstes Mal ein bisschen länger bleiben will' },
      { known: 'I think I will know enough words next time', target: 'ich denke ich werde nächstes Mal genug Wörter wissen' },
      { known: 'they wanted to ask a question about the story next time', target: 'sie wollten nächstes Mal eine Frage über die Geschichte stellen' }
    ]
  ));

  // Seed 69: "He said he would help me tomorrow morning."
  await postLego(M(69, 1, 'he said', 'er sagte',
    [{ known: 'said', target: 'sagte' }],
    [
      { known: 'he said', target: 'er sagte' },
      { known: 'he said that', target: 'er sagte dass' },
      { known: 'he said he would', target: 'er sagte er würde' },
      { known: 'he said he would help', target: 'er sagte er würde helfen' },
      { known: 'he said it correctly', target: 'er sagte es richtig' },
      { known: 'he said he would stay', target: 'er sagte er würde bleiben' },
      { known: 'he said he would help me tomorrow', target: 'er sagte er würde mir morgen helfen' },
      { known: 'because he said he would understand next time', target: 'weil er sagte er würde nächstes Mal verstehen' },
      { known: 'he said he wanted to ask a question about the story', target: 'er sagte er wollte eine Frage über die Geschichte stellen' },
      { known: 'maybe he said something else before I spoke', target: 'vielleicht sagte er etwas anderes bevor ich sprach' }
    ]
  ));

  await postLego(M(69, 2, 'he would help', 'er würde helfen',
    [{ known: 'he would', target: 'er würde' }],
    [
      { known: 'he would help', target: 'er würde helfen' },
      { known: 'he said he would help', target: 'er sagte er würde helfen' },
      { known: 'he would help me', target: 'er würde mir helfen' },
      { known: 'he would understand', target: 'er würde verstehen' },
      { known: 'he would stay', target: 'er würde bleiben' },
      { known: 'he said he would help me tomorrow', target: 'er sagte er würde mir morgen helfen' },
      { known: 'because he would help me learn German', target: 'weil er mir helfen würde Deutsch zu lernen' },
      { known: 'he said he would help me speak correctly', target: 'er sagte er würde mir helfen richtig zu sprechen' },
      { known: 'maybe he would help me understand enough words', target: 'vielleicht würde er mir helfen genug Wörter zu verstehen' },
      { known: 'he said he would help me meet people who speak German next week', target: 'er sagte er würde mir helfen nächste Woche Leute zu treffen die Deutsch sprechen' }
    ]
  ));

  await postLego(A(69, 3, 'tomorrow morning', 'morgen früh',
    [
      { known: 'tomorrow morning', target: 'morgen früh' },
      { known: 'I will help you tomorrow morning', target: 'ich werde dir morgen früh helfen' },
      { known: 'he said he would help me tomorrow morning', target: 'er sagte er würde mir morgen früh helfen' },
      { known: 'I am going to speak German tomorrow morning', target: 'ich werde morgen früh Deutsch sprechen' },
      { known: 'maybe I will understand tomorrow morning', target: 'vielleicht werde ich morgen früh verstehen' },
      { known: 'she wanted to meet tomorrow morning', target: 'sie wollte morgen früh treffen' },
      { known: 'because I want to stay a little longer tomorrow morning', target: 'weil ich morgen früh ein bisschen länger bleiben will' },
      { known: 'I should have said something else tomorrow morning', target: 'ich hätte morgen früh etwas anderes sagen sollen' },
      { known: 'he said he would help me learn German tomorrow morning', target: 'er sagte er würde mir morgen früh helfen Deutsch zu lernen' },
      { known: 'I think I will know enough words by tomorrow morning', target: 'ich denke ich werde bis morgen früh genug Wörter wissen' }
    ]
  ));

  // Seed 70: "She said she would come back after lunch."
  await postLego(M(70, 1, 'she said', 'sie sagte',
    [],
    [
      { known: 'she said', target: 'sie sagte' },
      { known: 'she said that', target: 'sie sagte dass' },
      { known: 'she said she would', target: 'sie sagte sie würde' },
      { known: 'she said she would come', target: 'sie sagte sie würde kommen' },
      { known: 'she said it correctly', target: 'sie sagte es richtig' },
      { known: 'she said she would help', target: 'sie sagte sie würde helfen' },
      { known: 'she said she would come back after lunch', target: 'sie sagte sie würde nach dem Mittagessen zurückkommen' },
      { known: 'because she said she would understand next time', target: 'weil sie sagte sie würde nächstes Mal verstehen' },
      { known: 'maybe she said something else before I spoke', target: 'vielleicht sagte sie etwas anderes bevor ich sprach' },
      { known: 'she said she wanted to stay a little longer', target: 'sie sagte sie wollte ein bisschen länger bleiben' }
    ]
  ));

  await postLego(A(70, 2, 'to come back', 'zurückkommen',
    [
      { known: 'to come back', target: 'zurückkommen' },
      { known: 'I want to come back', target: 'ich will zurückkommen' },
      { known: 'she said she would come back', target: 'sie sagte sie würde zurückkommen' },
      { known: 'I am going to come back', target: 'ich werde zurückkommen' },
      { known: 'to come back tomorrow', target: 'morgen zurückkommen' },
      { known: 'he would come back', target: 'er würde zurückkommen' },
      { known: 'she said she would come back after lunch', target: 'sie sagte sie würde nach dem Mittagessen zurückkommen' },
      { known: 'because I want to come back and speak German more', target: 'weil ich zurückkommen und mehr Deutsch sprechen will' },
      { known: 'maybe I will come back next time to learn more', target: 'vielleicht werde ich nächstes Mal zurückkommen um mehr zu lernen' },
      { known: 'I should have said I would come back tomorrow morning', target: 'ich hätte sagen sollen ich würde morgen früh zurückkommen' }
    ]
  ));

  await postLego(A(70, 3, 'after lunch', 'nach dem Mittagessen',
    [
      { known: 'after lunch', target: 'nach dem Mittagessen' },
      { known: 'I will come back after lunch', target: 'ich werde nach dem Mittagessen zurückkommen' },
      { known: 'she said she would come back after lunch', target: 'sie sagte sie würde nach dem Mittagessen zurückkommen' },
      { known: 'I want to speak German after lunch', target: 'ich will nach dem Mittagessen Deutsch sprechen' },
      { known: 'maybe I will understand after lunch', target: 'vielleicht werde ich nach dem Mittagessen verstehen' },
      { known: 'he said he would help me after lunch', target: 'er sagte er würde mir nach dem Mittagessen helfen' },
      { known: 'because I am going to stay after lunch', target: 'weil ich nach dem Mittagessen bleiben werde' },
      { known: 'I should have asked a question after lunch', target: 'ich hätte nach dem Mittagessen eine Frage stellen sollen' },
      { known: 'she wanted to meet my friends after lunch tomorrow', target: 'sie wollte morgen nach dem Mittagessen meine Freunde treffen' },
      { known: 'they said they would come back after lunch to ask about the story', target: 'sie sagten sie würden nach dem Mittagessen zurückkommen um über die Geschichte zu fragen' }
    ]
  ));

  // Seed 71-75: Additional high-frequency patterns

  // Seed 71: "I told them that I couldn't come today."
  await postLego(A(71, 1, 'I told them', 'ich habe ihnen gesagt',
    [
      { known: 'I told them', target: 'ich habe ihnen gesagt' },
      { known: 'I told them that', target: 'ich habe ihnen gesagt dass' },
      { known: 'I told them I would help', target: 'ich habe ihnen gesagt ich würde helfen' },
      { known: 'I told them I would come back', target: 'ich habe ihnen gesagt ich würde zurückkommen' },
      { known: "I told them I couldn't come", target: 'ich habe ihnen gesagt ich konnte nicht kommen' },
      { known: 'I told them about the story', target: 'ich habe ihnen von der Geschichte erzählt' },
      { known: "I told them that I couldn't come today", target: 'ich habe ihnen gesagt dass ich heute nicht kommen konnte' },
      { known: 'because I told them I should have said something else', target: 'weil ich ihnen gesagt habe ich hätte etwas anderes sagen sollen' },
      { known: 'I told them I would stay a little longer after lunch', target: 'ich habe ihnen gesagt ich würde nach dem Mittagessen ein bisschen länger bleiben' },
      { known: 'maybe I should have told them I would come back tomorrow morning', target: 'vielleicht hätte ich ihnen sagen sollen ich würde morgen früh zurückkommen' }
    ]
  ));

  await postLego(M(71, 2, "I couldn't come", 'ich konnte nicht kommen',
    [{ known: "couldn't", target: 'konnte nicht' }, { known: 'come', target: 'kommen' }],
    [
      { known: "I couldn't come", target: 'ich konnte nicht kommen' },
      { known: "I couldn't come today", target: 'ich konnte heute nicht kommen' },
      { known: "I told them I couldn't come", target: 'ich habe ihnen gesagt ich konnte nicht kommen' },
      { known: "I couldn't understand", target: 'ich konnte nicht verstehen' },
      { known: "I couldn't remember", target: 'ich konnte mich nicht erinnern' },
      { known: "I couldn't stay", target: 'ich konnte nicht bleiben' },
      { known: "I told them that I couldn't come today", target: 'ich habe ihnen gesagt dass ich heute nicht kommen konnte' },
      { known: "because I couldn't come back after lunch", target: 'weil ich nach dem Mittagessen nicht zurückkommen konnte' },
      { known: "I should have told them I couldn't come tomorrow morning", target: 'ich hätte ihnen sagen sollen ich konnte morgen früh nicht kommen' },
      { known: "maybe I couldn't come because I was too tired", target: 'vielleicht konnte ich nicht kommen weil ich zu müde war' }
    ]
  ));

  await postLego(A(71, 3, 'today', 'heute',
    [
      { known: 'today', target: 'heute' },
      { known: "I couldn't come today", target: 'ich konnte heute nicht kommen' },
      { known: 'I want to speak German today', target: 'ich will heute Deutsch sprechen' },
      { known: 'she said she would help today', target: 'sie sagte sie würde heute helfen' },
      { known: 'I am going to learn more today', target: 'ich werde heute mehr lernen' },
      { known: "I told them I couldn't come today", target: 'ich habe ihnen gesagt ich konnte heute nicht kommen' },
      { known: 'because I have enough time today', target: 'weil ich heute genug Zeit habe' },
      { known: 'maybe I will understand everything today', target: 'vielleicht werde ich heute alles verstehen' },
      { known: 'I should have stayed a little longer today', target: 'ich hätte heute ein bisschen länger bleiben sollen' },
      { known: 'I think I will come back today after lunch', target: 'ich denke ich werde heute nach dem Mittagessen zurückkommen' }
    ]
  ));

  // Seed 72: "They told us that they were coming later."
  await postLego(M(72, 1, 'they told us', 'sie haben uns gesagt',
    [{ known: 'told us', target: 'haben uns gesagt' }],
    [
      { known: 'they told us', target: 'sie haben uns gesagt' },
      { known: 'they told us that', target: 'sie haben uns gesagt dass' },
      { known: 'they told us they would come', target: 'sie haben uns gesagt sie würden kommen' },
      { known: 'they told us about the story', target: 'sie haben uns von der Geschichte erzählt' },
      { known: 'they told us they were coming', target: 'sie haben uns gesagt sie würden kommen' },
      { known: 'they told us they would help', target: 'sie haben uns gesagt sie würden helfen' },
      { known: 'they told us that they were coming later', target: 'sie haben uns gesagt dass sie später kommen würden' },
      { known: 'because they told us they would stay a little longer', target: 'weil sie uns gesagt haben sie würden ein bisschen länger bleiben' },
      { known: 'they told us they should have said something else', target: 'sie haben uns gesagt sie hätten etwas anderes sagen sollen' },
      { known: 'maybe they told us they would come back tomorrow morning', target: 'vielleicht haben sie uns gesagt sie würden morgen früh zurückkommen' }
    ]
  ));

  await postLego(M(72, 2, 'they were coming', 'sie kamen',
    [{ known: 'were coming', target: 'kamen' }],
    [
      { known: 'they were coming', target: 'sie kamen' },
      { known: 'they were coming later', target: 'sie kamen später' },
      { known: 'they told us they were coming', target: 'sie haben uns gesagt sie würden kommen' },
      { known: 'I was coming', target: 'ich kam' },
      { known: 'she was coming back', target: 'sie kam zurück' },
      { known: 'they were coming to speak German', target: 'sie kamen um Deutsch zu sprechen' },
      { known: 'they told us that they were coming later today', target: 'sie haben uns gesagt dass sie heute später kommen würden' },
      { known: 'because they were coming after lunch', target: 'weil sie nach dem Mittagessen kamen' },
      { known: 'I thought they were coming tomorrow morning', target: 'ich dachte sie würden morgen früh kommen' },
      { known: 'maybe they were coming to ask a question about the story', target: 'vielleicht kamen sie um eine Frage über die Geschichte zu stellen' }
    ]
  ));

  await postLego(A(72, 3, 'later', 'später',
    [
      { known: 'later', target: 'später' },
      { known: 'they were coming later', target: 'sie kamen später' },
      { known: 'I will come later', target: 'ich werde später kommen' },
      { known: 'maybe later', target: 'vielleicht später' },
      { known: 'she said she would help later', target: 'sie sagte sie würde später helfen' },
      { known: 'they told us that they were coming later', target: 'sie haben uns gesagt dass sie später kommen würden' },
      { known: 'because I want to speak German later today', target: 'weil ich heute später Deutsch sprechen will' },
      { known: 'I should have told them I would come back later', target: 'ich hätte ihnen sagen sollen ich würde später zurückkommen' },
      { known: 'he said he would help me later after lunch', target: 'er sagte er würde mir später nach dem Mittagessen helfen' },
      { known: 'I think they will understand everything later next week', target: 'ich denke sie werden nächste Woche später alles verstehen' }
    ]
  ));

  // Seed 73: "I hope I can see you again soon."
  await postLego(A(73, 1, 'I hope', 'ich hoffe',
    [
      { known: 'I hope', target: 'ich hoffe' },
      { known: 'I hope I can', target: 'ich hoffe ich kann' },
      { known: 'I hope you understand', target: 'ich hoffe du verstehst' },
      { known: 'I hope they will come', target: 'ich hoffe sie werden kommen' },
      { known: 'I hope I can see you', target: 'ich hoffe ich kann dich sehen' },
      { known: 'I hope I said it correctly', target: 'ich hoffe ich habe es richtig gesagt' },
      { known: 'I hope I can see you again soon', target: 'ich hoffe ich kann dich bald wiedersehen' },
      { known: 'because I hope I will understand next time', target: 'weil ich hoffe ich werde nächstes Mal verstehen' },
      { known: 'I hope they told us they were coming later', target: 'ich hoffe sie haben uns gesagt sie würden später kommen' },
      { known: 'I hope I can stay a little longer tomorrow morning', target: 'ich hoffe ich kann morgen früh ein bisschen länger bleiben' }
    ]
  ));

  await postLego(M(73, 2, 'I can see you', 'ich kann dich sehen',
    [{ known: 'see you', target: 'dich sehen' }],
    [
      { known: 'I can see you', target: 'ich kann dich sehen' },
      { known: 'I hope I can see you', target: 'ich hoffe ich kann dich sehen' },
      { known: 'I can see you again', target: 'ich kann dich wiedersehen' },
      { known: 'I want to see you', target: 'ich will dich sehen' },
      { known: 'I am going to see you', target: 'ich werde dich sehen' },
      { known: 'I hope I can see you again soon', target: 'ich hoffe ich kann dich bald wiedersehen' },
      { known: 'because I want to see you speak German', target: 'weil ich dich Deutsch sprechen sehen will' },
      { known: 'I told them I wanted to see you today', target: 'ich habe ihnen gesagt ich wollte dich heute sehen' },
      { known: 'maybe I can see you after lunch tomorrow', target: 'vielleicht kann ich dich morgen nach dem Mittagessen sehen' },
      { known: 'I hope I can see you again and speak German with you', target: 'ich hoffe ich kann dich wiedersehen und mit dir Deutsch sprechen' }
    ]
  ));

  await postLego(A(73, 3, 'again', 'wieder',
    [
      { known: 'again', target: 'wieder' },
      { known: 'to see you again', target: 'dich wiedersehen' },
      { known: 'I hope I can see you again', target: 'ich hoffe ich kann dich wiedersehen' },
      { known: 'I want to do it again', target: 'ich will es wieder machen' },
      { known: 'to speak again', target: 'wieder sprechen' },
      { known: 'to come back again', target: 'wieder zurückkommen' },
      { known: 'I hope I can see you again soon', target: 'ich hoffe ich kann dich bald wiedersehen' },
      { known: 'because I want to speak German again tomorrow', target: 'weil ich morgen wieder Deutsch sprechen will' },
      { known: 'she said she would come back again after lunch', target: 'sie sagte sie würde nach dem Mittagessen wieder zurückkommen' },
      { known: 'I hope I can enjoy learning again next week', target: 'ich hoffe ich kann nächste Woche wieder genießen zu lernen' }
    ]
  ));

  // Seed 74: "They asked me where I was going."
  await postLego(M(74, 1, 'they asked me', 'sie haben mich gefragt',
    [{ known: 'asked me', target: 'haben mich gefragt' }],
    [
      { known: 'they asked me', target: 'sie haben mich gefragt' },
      { known: 'they asked me where', target: 'sie haben mich gefragt wo' },
      { known: 'they asked me what', target: 'sie haben mich gefragt was' },
      { known: 'they asked me when', target: 'sie haben mich gefragt wann' },
      { known: 'they asked me why', target: 'sie haben mich gefragt warum' },
      { known: 'they asked me where I was going', target: 'sie haben mich gefragt wohin ich ging' },
      { known: 'because they asked me if I was coming later', target: 'weil sie mich gefragt haben ob ich später kommen würde' },
      { known: 'they asked me to see them again soon', target: 'sie haben mich gebeten sie bald wiederzusehen' },
      { known: 'I hope they asked me a question about the story', target: 'ich hoffe sie haben mich eine Frage über die Geschichte gefragt' },
      { known: 'they asked me if I could stay a little longer', target: 'sie haben mich gefragt ob ich ein bisschen länger bleiben konnte' }
    ]
  ));

  await postLego(M(74, 2, 'where I was going', 'wohin ich ging',
    [{ known: 'where', target: 'wohin' }, { known: 'I was going', target: 'ich ging' }],
    [
      { known: 'where I was going', target: 'wohin ich ging' },
      { known: 'they asked me where I was going', target: 'sie haben mich gefragt wohin ich ging' },
      { known: 'I told them where I was going', target: 'ich habe ihnen gesagt wohin ich ging' },
      { known: 'she asked where I was going', target: 'sie fragte wohin ich ging' },
      { known: "I don't know where I was going", target: 'ich weiß nicht wohin ich ging' },
      { known: 'where I was going tomorrow', target: 'wohin ich morgen ging' },
      { known: 'because I wanted to know where I was going', target: 'weil ich wissen wollte wohin ich ging' },
      { known: 'I hope I can tell them where I was going later', target: 'ich hoffe ich kann ihnen später sagen wohin ich ging' },
      { known: 'they asked me where I was going after lunch', target: 'sie haben mich gefragt wohin ich nach dem Mittagessen ging' },
      { known: 'I should have told them where I was going tomorrow morning', target: 'ich hätte ihnen sagen sollen wohin ich morgen früh ging' }
    ]
  ));

  // Seed 75: "I didn't know what they were talking about."
  await postLego(M(75, 1, "I didn't know", 'ich wusste nicht',
    [{ known: "didn't know", target: 'wusste nicht' }],
    [
      { known: "I didn't know", target: 'ich wusste nicht' },
      { known: "I didn't know what", target: 'ich wusste nicht was' },
      { known: "I didn't know where", target: 'ich wusste nicht wo' },
      { known: "I didn't know how", target: 'ich wusste nicht wie' },
      { known: "I didn't know that", target: 'ich wusste nicht dass' },
      { known: "I didn't know what they were talking about", target: 'ich wusste nicht worüber sie sprachen' },
      { known: "because I didn't know where I was going", target: 'weil ich nicht wusste wohin ich ging' },
      { known: "I didn't know they asked me a question", target: 'ich wusste nicht dass sie mich eine Frage gefragt haben' },
      { known: "I hope I didn't know I should have come earlier", target: 'ich hoffe ich wusste nicht dass ich früher hätte kommen sollen' },
      { known: "I didn't know I could see you again today", target: 'ich wusste nicht dass ich dich heute wiedersehen konnte' }
    ]
  ));

  await postLego(M(75, 2, 'they were talking about', 'worüber sie sprachen',
    [{ known: 'talking about', target: 'worüber sprachen' }],
    [
      { known: 'they were talking about', target: 'worüber sie sprachen' },
      { known: 'what they were talking about', target: 'worüber sie sprachen' },
      { known: "I didn't know what they were talking about", target: 'ich wusste nicht worüber sie sprachen' },
      { known: 'I understood what they were talking about', target: 'ich verstand worüber sie sprachen' },
      { known: 'they were talking about the story', target: 'sie sprachen über die Geschichte' },
      { known: 'they were talking about something else', target: 'sie sprachen über etwas anderes' },
      { known: "because I didn't understand what they were talking about", target: 'weil ich nicht verstand worüber sie sprachen' },
      { known: 'I hope I will understand what they were talking about next time', target: 'ich hoffe ich werde nächstes Mal verstehen worüber sie sprachen' },
      { known: 'they asked me what they were talking about yesterday', target: 'sie haben mich gefragt worüber sie gestern sprachen' },
      { known: "I should have asked what they were talking about before I went", target: 'ich hätte fragen sollen worüber sie sprachen bevor ich ging' }
    ]
  ));

  // Seed 76-80: Complete the batch

  // Seed 76: "I was wondering if you could help me with this."
  await postLego(M(76, 1, 'I was wondering', 'ich habe mich gefragt',
    [{ known: 'was wondering', target: 'habe mich gefragt' }],
    [
      { known: 'I was wondering', target: 'ich habe mich gefragt' },
      { known: 'I was wondering if', target: 'ich habe mich gefragt ob' },
      { known: 'I was wondering what', target: 'ich habe mich gefragt was' },
      { known: 'I was wondering how', target: 'ich habe mich gefragt wie' },
      { known: 'I was wondering why', target: 'ich habe mich gefragt warum' },
      { known: 'I was wondering if you could help me', target: 'ich habe mich gefragt ob du mir helfen könntest' },
      { known: 'because I was wondering if they were coming later', target: 'weil ich mich gefragt habe ob sie später kommen würden' },
      { known: "I was wondering what they were talking about", target: 'ich habe mich gefragt worüber sie sprachen' },
      { known: 'I was wondering if I could see you again tomorrow', target: 'ich habe mich gefragt ob ich dich morgen wiedersehen könnte' },
      { known: 'I was wondering if I should have said something else', target: 'ich habe mich gefragt ob ich etwas anderes hätte sagen sollen' }
    ]
  ));

  await postLego(M(76, 2, 'if you could help me', 'ob du mir helfen könntest',
    [{ known: 'could help', target: 'helfen könntest' }],
    [
      { known: 'if you could help me', target: 'ob du mir helfen könntest' },
      { known: 'I was wondering if you could help me', target: 'ich habe mich gefragt ob du mir helfen könntest' },
      { known: 'if you could help me with this', target: 'ob du mir damit helfen könntest' },
      { known: 'if you could understand', target: 'ob du verstehen könntest' },
      { known: 'if you could stay', target: 'ob du bleiben könntest' },
      { known: 'I was wondering if you could help me with this', target: 'ich habe mich gefragt ob du mir damit helfen könntest' },
      { known: 'because I wanted to know if you could help me learn German', target: 'weil ich wissen wollte ob du mir helfen könntest Deutsch zu lernen' },
      { known: 'I hope you could help me understand better', target: 'ich hoffe du könntest mir helfen besser zu verstehen' },
      { known: 'I was wondering if you could help me say it correctly', target: 'ich habe mich gefragt ob du mir helfen könntest es richtig zu sagen' },
      { known: 'she asked if you could help me meet people who speak German', target: 'sie fragte ob du mir helfen könntest Leute zu treffen die Deutsch sprechen' }
    ]
  ));

  await postLego(A(76, 3, 'with this', 'damit',
    [
      { known: 'with this', target: 'damit' },
      { known: 'help me with this', target: 'mir damit helfen' },
      { known: 'if you could help me with this', target: 'ob du mir damit helfen könntest' },
      { known: 'I need help with this', target: 'ich brauche Hilfe damit' },
      { known: 'what do you do with this', target: 'was machst du damit' },
      { known: 'I was wondering if you could help me with this', target: 'ich habe mich gefragt ob du mir damit helfen könntest' },
      { known: 'because I want you to help me with this today', target: 'weil ich will dass du mir heute damit hilfst' },
      { known: 'I hope I can finish with this later', target: 'ich hoffe ich kann später damit fertig werden' },
      { known: 'she said she would help me with this tomorrow morning', target: 'sie sagte sie würde mir morgen früh damit helfen' },
      { known: 'I was wondering what to do with this after lunch', target: 'ich habe mich gefragt was ich nach dem Mittagessen damit machen soll' }
    ]
  ));

  // Seed 77: "I thought you already knew how to do it."
  await postLego(M(77, 1, 'I thought', 'ich dachte',
    [],
    [
      { known: 'I thought', target: 'ich dachte' },
      { known: 'I thought that', target: 'ich dachte dass' },
      { known: 'I thought you knew', target: 'ich dachte du wusstest' },
      { known: 'I thought they were coming', target: 'ich dachte sie würden kommen' },
      { known: 'I thought you could help', target: 'ich dachte du könntest helfen' },
      { known: 'I thought you already knew', target: 'ich dachte du wusstest schon' },
      { known: 'because I thought they were talking about something else', target: 'weil ich dachte sie sprachen über etwas anderes' },
      { known: 'I was wondering if I thought correctly', target: 'ich habe mich gefragt ob ich richtig dachte' },
      { known: 'I thought you could help me with this after lunch', target: 'ich dachte du könntest mir nach dem Mittagessen damit helfen' },
      { known: 'I hope I thought correctly about what they were saying', target: 'ich hoffe ich dachte richtig über das was sie sagten' }
    ]
  ));

  await postLego(A(77, 2, 'already', 'schon',
    [
      { known: 'already', target: 'schon' },
      { known: 'you already knew', target: 'du wusstest schon' },
      { known: 'I thought you already knew', target: 'ich dachte du wusstest schon' },
      { known: 'I already know', target: 'ich weiß schon' },
      { known: 'they already came', target: 'sie sind schon gekommen' },
      { known: 'I already finished', target: 'ich habe schon beendet' },
      { known: 'I thought you already knew how to do it', target: 'ich dachte du wusstest schon wie man es macht' },
      { known: 'because I already understood what they were talking about', target: 'weil ich schon verstand worüber sie sprachen' },
      { known: 'I was wondering if you already knew the answer', target: 'ich habe mich gefragt ob du die Antwort schon wusstest' },
      { known: 'she said she already spoke German very well', target: 'sie sagte sie sprach schon sehr gut Deutsch' }
    ]
  ));

  await postLego(M(77, 3, 'you knew', 'du wusstest',
    [{ known: 'knew', target: 'wusstest' }],
    [
      { known: 'you knew', target: 'du wusstest' },
      { known: 'I thought you knew', target: 'ich dachte du wusstest' },
      { known: 'you already knew', target: 'du wusstest schon' },
      { known: 'you knew how to do it', target: 'du wusstest wie man es macht' },
      { known: 'did you know', target: 'wusstest du' },
      { known: 'I thought you already knew how to do it', target: 'ich dachte du wusstest schon wie man es macht' },
      { known: 'because you knew what they were talking about', target: 'weil du wusstest worüber sie sprachen' },
      { known: 'I was wondering if you knew the answer', target: 'ich habe mich gefragt ob du die Antwort wusstest' },
      { known: 'I hope you knew I was coming later', target: 'ich hoffe du wusstest dass ich später kommen würde' },
      { known: 'I thought you knew I wanted to see you again soon', target: 'ich dachte du wusstest dass ich dich bald wiedersehen wollte' }
    ]
  ));

  await postLego(M(77, 4, 'how to do it', 'wie man es macht',
    [{ known: 'to do it', target: 'es machen' }],
    [
      { known: 'how to do it', target: 'wie man es macht' },
      { known: 'I know how to do it', target: 'ich weiß wie man es macht' },
      { known: 'you knew how to do it', target: 'du wusstest wie man es macht' },
      { known: 'I thought you already knew how to do it', target: 'ich dachte du wusstest schon wie man es macht' },
      { known: 'I want to learn how to do it', target: 'ich will lernen wie man es macht' },
      { known: 'she showed me how to do it', target: 'sie hat mir gezeigt wie man es macht' },
      { known: 'because I was wondering how to do it correctly', target: 'weil ich mich gefragt habe wie man es richtig macht' },
      { known: 'I hope I can learn how to do it tomorrow morning', target: 'ich hoffe ich kann morgen früh lernen wie man es macht' },
      { known: 'they asked me if I knew how to do it in German', target: 'sie haben mich gefragt ob ich wusste wie man es auf Deutsch macht' },
      { known: 'I should have asked how to do it before I started', target: 'ich hätte fragen sollen wie man es macht bevor ich anfing' }
    ]
  ));

  // Seed 78: "I would like to know more about what happened."
  await postLego(M(78, 1, 'I would like', 'ich würde gerne',
    [{ known: 'would like', target: 'würde gerne' }],
    [
      { known: 'I would like', target: 'ich würde gerne' },
      { known: 'I would like to know', target: 'ich würde gerne wissen' },
      { known: 'I would like to speak', target: 'ich würde gerne sprechen' },
      { known: 'I would like to help', target: 'ich würde gerne helfen' },
      { known: 'I would like to stay', target: 'ich würde gerne bleiben' },
      { known: 'I would like to see you', target: 'ich würde dich gerne sehen' },
      { known: 'I would like to know more', target: 'ich würde gerne mehr wissen' },
      { known: 'because I would like to learn how to do it', target: 'weil ich gerne lernen würde wie man es macht' },
      { known: 'I would like to help you with this tomorrow', target: 'ich würde dir gerne morgen damit helfen' },
      { known: 'I thought I would like to come back again soon', target: 'ich dachte ich würde gerne bald wieder zurückkommen' }
    ]
  ));

  await postLego(M(78, 2, 'to know more', 'mehr wissen',
    [{ known: 'to know', target: 'wissen' }],
    [
      { known: 'to know more', target: 'mehr wissen' },
      { known: 'I would like to know more', target: 'ich würde gerne mehr wissen' },
      { known: 'I want to know more', target: 'ich will mehr wissen' },
      { known: 'to know more about', target: 'mehr über etwas wissen' },
      { known: 'I need to know more', target: 'ich muss mehr wissen' },
      { known: 'I would like to know more about the story', target: 'ich würde gerne mehr über die Geschichte wissen' },
      { known: 'because I thought I should know more', target: 'weil ich dachte ich sollte mehr wissen' },
      { known: 'I was wondering if I could know more about how to do it', target: 'ich habe mich gefragt ob ich mehr darüber wissen könnte wie man es macht' },
      { known: 'I hope I can know more about what happened', target: 'ich hoffe ich kann mehr darüber wissen was passiert ist' },
      { known: 'she would like to know more about what they were talking about', target: 'sie würde gerne mehr darüber wissen worüber sie sprachen' }
    ]
  ));

  await postLego(A(78, 3, 'what happened', 'was passiert ist',
    [
      { known: 'what happened', target: 'was passiert ist' },
      { known: 'I would like to know what happened', target: 'ich würde gerne wissen was passiert ist' },
      { known: 'I want to know what happened', target: 'ich will wissen was passiert ist' },
      { known: 'I asked what happened', target: 'ich fragte was passiert ist' },
      { known: 'do you know what happened', target: 'weißt du was passiert ist' },
      { known: "I don't know what happened", target: 'ich weiß nicht was passiert ist' },
      { known: 'I would like to know more about what happened', target: 'ich würde gerne mehr darüber wissen was passiert ist' },
      { known: 'because I was wondering what happened yesterday', target: 'weil ich mich gefragt habe was gestern passiert ist' },
      { known: 'they told us what happened after lunch', target: 'sie haben uns erzählt was nach dem Mittagessen passiert ist' },
      { known: 'I thought you already knew what happened last week', target: 'ich dachte du wusstest schon was letzte Woche passiert ist' }
    ]
  ));

  // Seed 79: "You should try saying it a different way."
  await postLego(M(79, 1, 'you should try', 'du solltest versuchen',
    [{ known: 'should try', target: 'solltest versuchen' }],
    [
      { known: 'you should try', target: 'du solltest versuchen' },
      { known: 'you should try saying', target: 'du solltest versuchen zu sagen' },
      { known: 'you should try learning', target: 'du solltest versuchen zu lernen' },
      { known: 'you should try to understand', target: 'du solltest versuchen zu verstehen' },
      { known: 'I think you should try', target: 'ich denke du solltest versuchen' },
      { known: 'you should try saying it differently', target: 'du solltest versuchen es anders zu sagen' },
      { known: 'because you should try to know more about what happened', target: 'weil du versuchen solltest mehr darüber zu wissen was passiert ist' },
      { known: 'I would like you to try again', target: 'ich würde gerne dass du es nochmal versuchst' },
      { known: 'you should try to help me with this tomorrow', target: 'du solltest versuchen mir morgen damit zu helfen' },
      { known: 'I was wondering if you should try a different way', target: 'ich habe mich gefragt ob du einen anderen Weg versuchen solltest' }
    ]
  ));

  await postLego(A(79, 2, 'saying it', 'es zu sagen',
    [
      { known: 'saying it', target: 'es zu sagen' },
      { known: 'try saying it', target: 'versuch es zu sagen' },
      { known: 'you should try saying it', target: 'du solltest versuchen es zu sagen' },
      { known: 'I like saying it', target: 'ich mag es zu sagen' },
      { known: 'I am trying saying it', target: 'ich versuche es zu sagen' },
      { known: 'after saying it', target: 'nachdem ich es gesagt habe' },
      { known: 'you should try saying it a different way', target: 'du solltest versuchen es auf eine andere Weise zu sagen' },
      { known: 'because I thought you already knew about saying it correctly', target: 'weil ich dachte du wusstest schon wie man es richtig sagt' },
      { known: 'I would like to know more about saying it in German', target: 'ich würde gerne mehr darüber wissen wie man es auf Deutsch sagt' },
      { known: 'I was wondering how to try saying it tomorrow morning', target: 'ich habe mich gefragt wie ich morgen früh versuchen soll es zu sagen' }
    ]
  ));

  await postLego(M(79, 3, 'a different way', 'eine andere Weise',
    [{ known: 'different', target: 'andere' }, { known: 'way', target: 'Weise' }],
    [
      { known: 'a different way', target: 'eine andere Weise' },
      { known: 'in a different way', target: 'auf eine andere Weise' },
      { known: 'you should try saying it a different way', target: 'du solltest versuchen es auf eine andere Weise zu sagen' },
      { known: 'I want to try a different way', target: 'ich will einen anderen Weg versuchen' },
      { known: 'there is a different way', target: 'es gibt einen anderen Weg' },
      { known: 'I thought about it a different way', target: 'ich dachte auf eine andere Weise darüber nach' },
      { known: 'because I would like to learn a different way', target: 'weil ich auf eine andere Weise lernen würde' },
      { known: 'maybe you should try doing it a different way', target: 'vielleicht solltest du versuchen es auf eine andere Weise zu machen' },
      { known: 'I was wondering if there was a different way to help', target: 'ich habe mich gefragt ob es einen anderen Weg zu helfen gibt' },
      { known: 'she said I should try a different way next time', target: 'sie sagte ich sollte nächstes Mal einen anderen Weg versuchen' }
    ]
  ));

  // Seed 80: "I've always wanted to learn how to do that."
  await postLego(M(80, 1, "I've always", 'ich habe immer',
    [{ known: 'always', target: 'immer' }],
    [
      { known: "I've always", target: 'ich habe immer' },
      { known: "I've always wanted", target: 'ich habe immer gewollt' },
      { known: "I've always known", target: 'ich habe immer gewusst' },
      { known: "I've always liked", target: 'ich habe immer gemocht' },
      { known: "I've always wanted to learn", target: 'ich habe immer lernen wollen' },
      { known: "I've always thought", target: 'ich habe immer gedacht' },
      { known: "I've always wanted to speak German", target: 'ich habe immer Deutsch sprechen wollen' },
      { known: "because I've always known you could help me", target: 'weil ich immer wusste dass du mir helfen konntest' },
      { known: "I've always wanted to know more about what happened", target: 'ich habe immer mehr über das wissen wollen was passiert ist' },
      { known: "I've always wondered if you should try a different way", target: 'ich habe mich immer gefragt ob du einen anderen Weg versuchen solltest' }
    ]
  ));

  await postLego(M(80, 2, 'wanted to learn', 'lernen wollen',
    [],
    [
      { known: 'wanted to learn', target: 'lernen wollen' },
      { known: "I've always wanted to learn", target: 'ich habe immer lernen wollen' },
      { known: 'I wanted to learn', target: 'ich wollte lernen' },
      { known: 'she wanted to learn', target: 'sie wollte lernen' },
      { known: 'I wanted to learn German', target: 'ich wollte Deutsch lernen' },
      { known: "I've always wanted to learn how to do that", target: 'ich habe immer lernen wollen wie man das macht' },
      { known: 'because I wanted to learn a different way', target: 'weil ich auf eine andere Weise lernen wollte' },
      { known: 'I would like to know why you wanted to learn', target: 'ich würde gerne wissen warum du lernen wolltest' },
      { known: 'I was wondering if you always wanted to learn German', target: 'ich habe mich gefragt ob du immer Deutsch lernen wolltest' },
      { known: 'I thought you already wanted to learn how to do it', target: 'ich dachte du wolltest schon lernen wie man es macht' }
    ]
  ));

  await postLego(M(80, 3, 'how to do that', 'wie man das macht',
    [{ known: 'that', target: 'das' }],
    [
      { known: 'how to do that', target: 'wie man das macht' },
      { known: "I've always wanted to learn how to do that", target: 'ich habe immer lernen wollen wie man das macht' },
      { known: 'I know how to do that', target: 'ich weiß wie man das macht' },
      { known: 'you should try how to do that', target: 'du solltest versuchen wie man das macht' },
      { known: 'I want to know how to do that', target: 'ich will wissen wie man das macht' },
      { known: 'I would like to understand how to do that', target: 'ich würde gerne verstehen wie man das macht' },
      { known: 'because I always wanted to learn how to do that in German', target: 'weil ich immer lernen wollte wie man das auf Deutsch macht' },
      { known: 'I was wondering if you knew how to do that', target: 'ich habe mich gefragt ob du wusstest wie man das macht' },
      { known: 'I hope I can learn how to do that next week', target: 'ich hoffe ich kann nächste Woche lernen wie man das macht' },
      { known: 'they asked me if I knew how to do that a different way', target: 'sie haben mich gefragt ob ich wusste wie man das auf eine andere Weise macht' }
    ]
  ));

  console.log('\nDone building seeds 66-80');
}

buildSeeds().catch(console.error);
