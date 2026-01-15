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
      if (json.violations) {
        json.violations.forEach(v => console.log(`   Unknown: ${v.unknown}`));
      }
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

async function buildSeed17() {
  // Seed 17: "She wants to find out what the answer is."

  // she wants
  await postLego({
    course_code: 'deu_for_eng',
    seed: 17,
    idx: 1,
    type: 'M',
    known: 'she wants',
    target: 'sie will',
    components: [
      { known: 'she', target: 'sie' },
      { known: 'wants', target: 'will' }
    ],
    phrases: [
      { known: 'she wants', target: 'sie will' },
      { known: 'she wants to speak', target: 'sie will sprechen' },
      { known: 'she wants to speak German', target: 'sie will Deutsch sprechen' },
      { known: 'she wants to learn', target: 'sie will lernen' },
      { known: 'she wants to learn German', target: 'sie will Deutsch lernen' },
      { known: 'she wants to understand', target: 'sie will verstehen' },
      { known: 'she wants to practise', target: 'sie will üben' },
      { known: 'I think she wants to speak German', target: 'ich denke sie will Deutsch sprechen' },
      { known: 'she wants to speak German with you now', target: 'sie will jetzt mit dir Deutsch sprechen' },
      { known: 'I think that she wants to learn German every day', target: 'ich denke dass sie jeden Tag Deutsch lernen will' }
    ]
  });

  // to find out
  await postLego({
    course_code: 'deu_for_eng',
    seed: 17,
    idx: 2,
    type: 'A',
    known: 'to find out',
    target: 'herauszufinden',
    phrases: [
      { known: 'to find out', target: 'herauszufinden' },
      { known: 'I want to find out', target: 'ich will herausfinden' },
      { known: 'she wants to find out', target: 'sie will herausfinden' },
      { known: 'I need to find out', target: 'ich brauche herausfinden' },
      { known: 'I am trying to find out', target: 'ich versuche herauszufinden' },
      { known: 'I am going to find out', target: 'ich werde herausfinden' },
      { known: 'I want to find out now', target: 'ich will jetzt herausfinden' },
      { known: 'she wants to find out something', target: 'sie will etwas herausfinden' },
      { known: 'I am trying to find out something in German', target: 'ich versuche etwas auf Deutsch herauszufinden' },
      { known: 'I think she wants to find out something now', target: 'ich denke sie will jetzt etwas herausfinden' }
    ]
  });

  // what
  await postLego({
    course_code: 'deu_for_eng',
    seed: 17,
    idx: 3,
    type: 'A',
    known: 'what',
    target: 'was',
    phrases: [
      { known: 'what', target: 'was' },
      { known: 'I want to find out what', target: 'ich will herausfinden was' },
      { known: 'she wants to find out what', target: 'sie will herausfinden was' },
      { known: 'I need to understand what', target: 'ich brauche zu verstehen was' },
      { known: 'I do not understand what', target: 'ich verstehe nicht was' },
      { known: 'I want to learn what', target: 'ich will lernen was' },
      { known: 'I am trying to find out what', target: 'ich versuche herauszufinden was' },
      { known: 'what you say', target: 'was du sagst' },
      { known: 'I think I understand what you say now', target: 'ich denke ich verstehe jetzt was du sagst' },
      { known: 'she wants to find out what I want to say in German', target: 'sie will herausfinden was ich auf Deutsch sagen will' }
    ]
  });

  // the answer
  await postLego({
    course_code: 'deu_for_eng',
    seed: 17,
    idx: 4,
    type: 'M',
    known: 'the answer',
    target: 'die Antwort',
    components: [
      { known: 'the', target: 'die' },
      { known: 'answer', target: 'Antwort' }
    ],
    phrases: [
      { known: 'the answer', target: 'die Antwort' },
      { known: 'I want the answer', target: 'ich will die Antwort' },
      { known: 'she wants the answer', target: 'sie will die Antwort' },
      { known: 'I need the answer', target: 'ich brauche die Antwort' },
      { known: 'I do not understand the answer', target: 'ich verstehe die Antwort nicht' },
      { known: 'I want to find out the answer', target: 'ich will die Antwort herausfinden' },
      { known: 'she wants to find out the answer now', target: 'sie will jetzt die Antwort herausfinden' },
      { known: 'I think I understand the answer', target: 'ich denke ich verstehe die Antwort' },
      { known: 'I am trying to find out what the answer is', target: 'ich versuche herauszufinden was die Antwort ist' },
      { known: 'I think she wants to find out what the answer is in German', target: 'ich denke sie will herausfinden was die Antwort auf Deutsch ist' }
    ]
  });

  // is
  await postLego({
    course_code: 'deu_for_eng',
    seed: 17,
    idx: 5,
    type: 'A',
    known: 'is',
    target: 'ist',
    phrases: [
      { known: 'is', target: 'ist' },
      { known: 'what is', target: 'was ist' },
      { known: 'what is the answer', target: 'was ist die Antwort' },
      { known: 'this is', target: 'das ist' },
      { known: 'this is difficult', target: 'das ist schwierig' },
      { known: 'it is important', target: 'es ist wichtig' },
      { known: 'what is difficult', target: 'was ist schwierig' },
      { known: 'I want to find out what the answer is', target: 'ich will herausfinden was die Antwort ist' },
      { known: 'she wants to find out what the answer is now', target: 'sie will jetzt herausfinden was die Antwort ist' },
      { known: 'I think it is important to understand what the answer is', target: 'ich denke es ist wichtig zu verstehen was die Antwort ist' }
    ]
  });
}

buildSeed17().then(() => console.log('Done with seed 17'));
