#!/usr/bin/env node
/**
 * Add overlapping M-LEGOs to German course (deu_for_eng)
 * to handle structural patterns that differ from English:
 *
 * 1. Verb-final in subordinate clauses (weil, dass, ob, wenn, nachdem, bevor)
 * 2. Modal + infinitive bracket
 * 3. Separable prefix verbs (split vs together)
 * 4. zu-insertion in separable verbs
 * 5. Reflexive verb patterns
 */

const API_URL = 'http://localhost:3471';
const COURSE_CODE = 'deu_for_eng';

// Track results
const results = {
  added: [],
  failed: [],
  skipped: []
};

/**
 * Add a LEGO via API with validation bypass for overlapping LEGOs
 */
async function addLego(seed, idx, type, known, target, components, build, use) {
  // Combine build and use phrases
  const phrases = [
    ...(build || []).map(p => ({ known: p.known, target: p.target })),
    ...(use || []).map(p => ({ known: p.known, target: p.target, score: p.score || 7 }))
  ];

  const payload = {
    course_code: COURSE_CODE,
    seed,
    idx,
    type,
    known,
    target,
    components,
    phrases,
    SKIP_VALIDATION: true  // Allow overlapping LEGOs
  };

  try {
    const response = await fetch(`${API_URL}/api/lego`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (response.ok) {
      const legoId = `S${String(seed).padStart(4,'0')}L${String(idx).padStart(2,'0')}`;
      console.log(`  [OK] ${legoId}: "${known}" -> "${target}"`);
      results.added.push({ seed, idx, known, target, pattern: payload.pattern });
      return true;
    } else {
      console.log(`  [FAIL] Seed ${seed} L${idx}: ${data.error || 'Unknown error'}`);
      results.failed.push({ seed, idx, known, target, error: data.error });
      return false;
    }
  } catch (err) {
    console.log(`  [ERROR] Seed ${seed} L${idx}: ${err.message}`);
    results.failed.push({ seed, idx, known, target, error: err.message });
    return false;
  }
}

// ==================== PATTERN 1: VERB-FINAL IN SUBORDINATE CLAUSES ====================
// Shows verb going to END after subordinating conjunctions

async function addVerbFinalPatterns() {
  console.log('\n=== PATTERN 1: VERB-FINAL IN SUBORDINATE CLAUSES ===\n');

  // Seed 10: "ob ich...kann" (whether I...can)
  await addLego(10, 8, 'M',
    'if/whether I...can (subordinate)',
    'ob ich...kann',
    [
      { known: 'if/whether', target: 'ob' },
      { known: 'I', target: 'ich' },
      { known: 'can', target: 'kann' }
    ],
    [
      { known: 'if/whether', target: 'ob' },
      { known: 'if/whether I', target: 'ob ich' },
      { known: 'if/whether I can (do it)', target: 'ob ich...kann' },
      { known: 'if/whether I can remember', target: 'ob ich mich erinnern kann' }
    ],
    [
      { known: "I don't know if I can come", target: 'Ich weiß nicht, ob ich kommen kann', score: 7 },
      { known: 'Do you know if I can help?', target: 'Weißt du, ob ich helfen kann?', score: 7 },
      { known: "He asks if I can speak German", target: 'Er fragt, ob ich Deutsch sprechen kann', score: 8 },
      { known: "I'm not sure if I can do it", target: 'Ich bin nicht sicher, ob ich es machen kann', score: 7 },
      { known: 'Tell me if I can start', target: 'Sag mir, ob ich anfangen kann', score: 7 },
      { known: "She wants to know if I can come tomorrow", target: 'Sie will wissen, ob ich morgen kommen kann', score: 8 }
    ]
  );

  // Seed 11: "nachdem du...bist" (after you...are)
  await addLego(11, 4, 'M',
    'after you...are (verb-final)',
    'nachdem du...bist',
    [
      { known: 'after', target: 'nachdem' },
      { known: 'you', target: 'du' },
      { known: 'are', target: 'bist' }
    ],
    [
      { known: 'after', target: 'nachdem' },
      { known: 'after you', target: 'nachdem du' },
      { known: 'after you are finished', target: 'nachdem du fertig bist' },
      { known: 'after you are ready', target: 'nachdem du bereit bist' }
    ],
    [
      { known: 'I will speak after you are finished', target: 'Ich werde sprechen, nachdem du fertig bist', score: 7 },
      { known: 'Call me after you are home', target: 'Ruf mich an, nachdem du zu Hause bist', score: 7 },
      { known: 'We can talk after you are ready', target: 'Wir können reden, nachdem du bereit bist', score: 7 },
      { known: 'I will help after you are done', target: 'Ich werde helfen, nachdem du fertig bist', score: 8 },
      { known: 'Start after you are there', target: 'Fang an, nachdem du da bist', score: 7 },
      { known: 'Tell me after you are sure', target: 'Sag mir, nachdem du sicher bist', score: 7 }
    ]
  );

  // Seed 15: "dass du...sprichst" (that you...speak)
  await addLego(15, 8, 'M',
    'that you...speak (verb-final)',
    'dass du...sprichst',
    [
      { known: 'that', target: 'dass' },
      { known: 'you', target: 'du' },
      { known: 'speak', target: 'sprichst' }
    ],
    [
      { known: 'that', target: 'dass' },
      { known: 'that you', target: 'dass du' },
      { known: 'that you speak', target: 'dass du sprichst' },
      { known: 'that you speak German', target: 'dass du Deutsch sprichst' }
    ],
    [
      { known: 'I want that you speak German', target: 'Ich will, dass du Deutsch sprichst', score: 7 },
      { known: 'He knows that you speak well', target: 'Er weiß, dass du gut sprichst', score: 7 },
      { known: 'She says that you speak too fast', target: 'Sie sagt, dass du zu schnell sprichst', score: 8 },
      { known: 'I hope that you speak with me', target: 'Ich hoffe, dass du mit mir sprichst', score: 7 },
      { known: 'It is good that you speak', target: 'Es ist gut, dass du sprichst', score: 7 },
      { known: 'I think that you speak German now', target: 'Ich denke, dass du jetzt Deutsch sprichst', score: 8 }
    ]
  );

  // Seed 17: "was die Antwort ist" - verb-final with "ist"
  await addLego(17, 4, 'M',
    'what...is (verb-final)',
    'was...ist',
    [
      { known: 'what', target: 'was' },
      { known: 'is', target: 'ist' }
    ],
    [
      { known: 'what', target: 'was' },
      { known: 'what it is', target: 'was es ist' },
      { known: 'what the answer is', target: 'was die Antwort ist' },
      { known: 'what the problem is', target: 'was das Problem ist' }
    ],
    [
      { known: 'I want to know what it is', target: 'Ich will wissen, was es ist', score: 7 },
      { known: 'Tell me what the answer is', target: 'Sag mir, was die Antwort ist', score: 7 },
      { known: 'Do you know what the problem is?', target: 'Weißt du, was das Problem ist?', score: 8 },
      { known: 'She asks what the word is', target: 'Sie fragt, was das Wort ist', score: 7 },
      { known: 'I understand what the question is', target: 'Ich verstehe, was die Frage ist', score: 7 },
      { known: 'He wants to find out what the truth is', target: 'Er will herausfinden, was die Wahrheit ist', score: 8 }
    ]
  );

  // Seed 22: "weil ich...will" (because I...want)
  await addLego(22, 6, 'M',
    'because I...want (verb-final)',
    'weil ich...will',
    [
      { known: 'because', target: 'weil' },
      { known: 'I', target: 'ich' },
      { known: 'want', target: 'will' }
    ],
    [
      { known: 'because', target: 'weil' },
      { known: 'because I', target: 'weil ich' },
      { known: 'because I want', target: 'weil ich will' },
      { known: 'because I want to learn', target: 'weil ich lernen will' }
    ],
    [
      { known: 'I study because I want to learn', target: 'Ich lerne, weil ich lernen will', score: 7 },
      { known: 'I am here because I want to speak German', target: 'Ich bin hier, weil ich Deutsch sprechen will', score: 8 },
      { known: 'She comes because she wants to help', target: 'Sie kommt, weil sie helfen will', score: 7 },
      { known: 'He asks because he wants to know', target: 'Er fragt, weil er wissen will', score: 7 },
      { known: 'I stay because I want to practise', target: 'Ich bleibe, weil ich üben will', score: 7 },
      { known: 'We meet because we want to talk', target: 'Wir treffen uns, weil wir reden wollen', score: 8 }
    ]
  );

  // Seed 25: "bevor ich...muss" (before I...must)
  await addLego(25, 8, 'M',
    'before I...must (verb-final)',
    'bevor ich...muss',
    [
      { known: 'before', target: 'bevor' },
      { known: 'I', target: 'ich' },
      { known: 'must', target: 'muss' }
    ],
    [
      { known: 'before', target: 'bevor' },
      { known: 'before I', target: 'bevor ich' },
      { known: 'before I must go', target: 'bevor ich gehen muss' },
      { known: 'before I have to leave', target: 'bevor ich gehen muss' }
    ],
    [
      { known: 'Help me before I must go', target: 'Hilf mir, bevor ich gehen muss', score: 7 },
      { known: 'Tell me before I have to leave', target: 'Sag mir, bevor ich gehen muss', score: 7 },
      { known: 'I want to speak before I must stop', target: 'Ich will sprechen, bevor ich aufhören muss', score: 8 },
      { known: 'Ask me before I have to work', target: 'Frag mich, bevor ich arbeiten muss', score: 7 },
      { known: 'Call me before I must start', target: 'Ruf mich an, bevor ich anfangen muss', score: 7 },
      { known: 'We should talk before I have to go home', target: 'Wir sollten reden, bevor ich nach Hause gehen muss', score: 8 }
    ]
  );

  // Seed 34: "wenn andere Leute hier sind" (when other people are here)
  await addLego(34, 9, 'M',
    'when...are (verb-final)',
    'wenn...sind',
    [
      { known: 'when', target: 'wenn' },
      { known: 'are', target: 'sind' }
    ],
    [
      { known: 'when', target: 'wenn' },
      { known: 'when people', target: 'wenn Leute' },
      { known: 'when other people are here', target: 'wenn andere Leute hier sind' },
      { known: 'when they are here', target: 'wenn sie hier sind' }
    ],
    [
      { known: 'I speak when people are here', target: 'Ich spreche, wenn Leute hier sind', score: 7 },
      { known: 'He is quiet when other people are here', target: 'Er ist still, wenn andere Leute hier sind', score: 7 },
      { known: 'She helps when we are ready', target: 'Sie hilft, wenn wir bereit sind', score: 8 },
      { known: 'I practise when they are not here', target: 'Ich übe, wenn sie nicht hier sind', score: 7 },
      { known: 'Tell me when you are finished', target: 'Sag mir, wenn du fertig bist', score: 7 },
      { known: 'We can start when all people are here', target: 'Wir können anfangen, wenn alle Leute hier sind', score: 8 }
    ]
  );

  // Seed 43: "wie ich antworten soll" (how I should answer)
  await addLego(43, 8, 'M',
    'how I should (verb-final)',
    'wie ich...soll',
    [
      { known: 'how', target: 'wie' },
      { known: 'I', target: 'ich' },
      { known: 'should', target: 'soll' }
    ],
    [
      { known: 'how', target: 'wie' },
      { known: 'how I', target: 'wie ich' },
      { known: 'how I should answer', target: 'wie ich antworten soll' },
      { known: 'how I should do it', target: 'wie ich es machen soll' }
    ],
    [
      { known: 'I think about how I should answer', target: 'Ich denke darüber nach, wie ich antworten soll', score: 7 },
      { known: 'Tell me how I should do it', target: 'Sag mir, wie ich es machen soll', score: 7 },
      { known: 'I do not know how I should say it', target: 'Ich weiß nicht, wie ich es sagen soll', score: 8 },
      { known: 'She asks how I should help', target: 'Sie fragt, wie ich helfen soll', score: 7 },
      { known: 'He explains how I should start', target: 'Er erklärt, wie ich anfangen soll', score: 7 },
      { known: 'I understand how I should learn', target: 'Ich verstehe, wie ich lernen soll', score: 8 }
    ]
  );

  // Seed 47: "dass es...ist" (that it...is)
  await addLego(47, 10, 'M',
    'that it...is (verb-final)',
    'dass es...ist',
    [
      { known: 'that', target: 'dass' },
      { known: 'it', target: 'es' },
      { known: 'is', target: 'ist' }
    ],
    [
      { known: 'that', target: 'dass' },
      { known: 'that it', target: 'dass es' },
      { known: 'that it is good', target: 'dass es gut ist' },
      { known: 'that it is a good thing', target: 'dass es eine gute Sache ist' }
    ],
    [
      { known: 'I think that it is good', target: 'Ich denke, dass es gut ist', score: 7 },
      { known: 'He says that it is important', target: 'Er sagt, dass es wichtig ist', score: 7 },
      { known: 'She knows that it is difficult', target: 'Sie weiß, dass es schwierig ist', score: 8 },
      { known: 'I believe that it is true', target: 'Ich glaube, dass es wahr ist', score: 7 },
      { known: 'You understand that it is useful', target: 'Du verstehst, dass es nützlich ist', score: 7 },
      { known: 'We know that it is a good idea', target: 'Wir wissen, dass es eine gute Idee ist', score: 8 }
    ]
  );
}

// ==================== PATTERN 2: MODAL BRACKET ====================
// Shows modal verb in V2, infinitive at END with material between

async function addModalBracketPatterns() {
  console.log('\n=== PATTERN 2: MODAL + INFINITIVE BRACKET ===\n');

  // Seed 1: "ich will...sprechen" (I want...to speak) - modal bracket
  await addLego(1, 6, 'M',
    'I want...to speak (modal bracket)',
    'ich will...sprechen',
    [
      { known: 'I', target: 'ich' },
      { known: 'want', target: 'will' },
      { known: 'to speak', target: 'sprechen' }
    ],
    [
      { known: 'I want', target: 'ich will' },
      { known: 'I want to speak', target: 'ich will sprechen' },
      { known: 'I want to speak German', target: 'ich will Deutsch sprechen' },
      { known: 'I want to speak with you', target: 'ich will mit dir sprechen' }
    ],
    [
      { known: 'I want to speak German now', target: 'Ich will jetzt Deutsch sprechen', score: 7 },
      { known: 'I want to speak with you tomorrow', target: 'Ich will morgen mit dir sprechen', score: 7 },
      { known: 'I want to speak more', target: 'Ich will mehr sprechen', score: 8 },
      { known: 'I want to speak well', target: 'Ich will gut sprechen', score: 7 },
      { known: 'I want to speak every day', target: 'Ich will jeden Tag sprechen', score: 7 },
      { known: 'I want to speak German with people', target: 'Ich will Deutsch mit Leuten sprechen', score: 8 }
    ]
  );

  // Seed 5: "ich werde...üben" (I will...practise)
  await addLego(5, 5, 'M',
    'I will...practise (modal bracket)',
    'ich werde...üben',
    [
      { known: 'I', target: 'ich' },
      { known: 'will', target: 'werde' },
      { known: 'practise', target: 'üben' }
    ],
    [
      { known: 'I will', target: 'ich werde' },
      { known: 'I will practise', target: 'ich werde üben' },
      { known: 'I will practise speaking', target: 'ich werde sprechen üben' },
      { known: 'I will practise with someone', target: 'ich werde mit jemand üben' }
    ],
    [
      { known: 'I will practise tomorrow', target: 'Ich werde morgen üben', score: 7 },
      { known: 'I will practise German every day', target: 'Ich werde jeden Tag Deutsch üben', score: 7 },
      { known: 'I will practise speaking with you', target: 'Ich werde mit dir sprechen üben', score: 8 },
      { known: 'I will practise more soon', target: 'Ich werde bald mehr üben', score: 7 },
      { known: 'I will practise with someone else', target: 'Ich werde mit jemand anderem üben', score: 7 },
      { known: 'I will practise speaking German now', target: 'Ich werde jetzt Deutsch sprechen üben', score: 8 }
    ]
  );

  // Seed 16: "er will...kommen" (he wants...to come) - with separable verb
  await addLego(16, 5, 'M',
    'he wants...to come (modal bracket)',
    'er will...kommen',
    [
      { known: 'he', target: 'er' },
      { known: 'wants', target: 'will' },
      { known: 'to come', target: 'kommen' }
    ],
    [
      { known: 'he wants', target: 'er will' },
      { known: 'he wants to come', target: 'er will kommen' },
      { known: 'he wants to come back', target: 'er will zurückkommen' },
      { known: 'he wants to come with us', target: 'er will mit uns kommen' }
    ],
    [
      { known: 'He wants to come tomorrow', target: 'Er will morgen kommen', score: 7 },
      { known: 'He wants to come back later', target: 'Er will später zurückkommen', score: 7 },
      { known: 'He wants to come with everyone', target: 'Er will mit allen kommen', score: 8 },
      { known: 'He wants to come soon', target: 'Er will bald kommen', score: 7 },
      { known: 'He wants to come with me', target: 'Er will mit mir kommen', score: 7 },
      { known: 'He wants to come back with everyone else', target: 'Er will mit allen anderen zurückkommen', score: 8 }
    ]
  );

  // Seed 19: "ich will nicht...reden" (I don't want...to talk)
  await addLego(19, 6, 'M',
    'I don\'t want...to talk (modal bracket)',
    'ich will nicht...reden',
    [
      { known: 'I', target: 'ich' },
      { known: 'don\'t want', target: 'will nicht' },
      { known: 'to talk', target: 'reden' }
    ],
    [
      { known: 'I don\'t want', target: 'ich will nicht' },
      { known: 'I don\'t want to talk', target: 'ich will nicht reden' },
      { known: 'I don\'t want to stop talking', target: 'ich will nicht aufhören zu reden' },
      { known: 'I don\'t want to stop', target: 'ich will nicht aufhören' }
    ],
    [
      { known: 'I don\'t want to talk now', target: 'Ich will jetzt nicht reden', score: 7 },
      { known: 'I don\'t want to stop yet', target: 'Ich will noch nicht aufhören', score: 7 },
      { known: 'I don\'t want to go', target: 'Ich will nicht gehen', score: 8 },
      { known: 'I don\'t want to wait', target: 'Ich will nicht warten', score: 7 },
      { known: 'I don\'t want to stop speaking German', target: 'Ich will nicht aufhören Deutsch zu sprechen', score: 7 },
      { known: 'I don\'t want to be quiet', target: 'Ich will nicht still sein', score: 8 }
    ]
  );

  // Seed 23: "ich werde...anfangen" (I will...start)
  await addLego(23, 7, 'M',
    'I will...start (modal bracket)',
    'ich werde...anfangen',
    [
      { known: 'I', target: 'ich' },
      { known: 'will', target: 'werde' },
      { known: 'start', target: 'anfangen' }
    ],
    [
      { known: 'I will', target: 'ich werde' },
      { known: 'I will start', target: 'ich werde anfangen' },
      { known: 'I will start soon', target: 'ich werde bald anfangen' },
      { known: 'I will start talking', target: 'ich werde anfangen zu reden' }
    ],
    [
      { known: 'I will start tomorrow', target: 'Ich werde morgen anfangen', score: 7 },
      { known: 'I will start talking more soon', target: 'Ich werde bald anfangen mehr zu reden', score: 7 },
      { known: 'I will start now', target: 'Ich werde jetzt anfangen', score: 8 },
      { known: 'I will start speaking German', target: 'Ich werde anfangen Deutsch zu sprechen', score: 7 },
      { known: 'I will start to learn', target: 'Ich werde anfangen zu lernen', score: 7 },
      { known: 'I will start practising soon', target: 'Ich werde bald anfangen zu üben', score: 8 }
    ]
  );
}

// ==================== PATTERN 3: SEPARABLE VERBS ====================
// Shows when separable verbs SPLIT vs STAY together

async function addSeparableVerbPatterns() {
  console.log('\n=== PATTERN 3: SEPARABLE VERBS (SPLIT vs TOGETHER) ===\n');

  // Seed 16: "er kommt...zurück" (he comes...back) - SPLIT in main clause
  await addLego(16, 6, 'M',
    'he comes...back (separable split)',
    'er kommt...zurück',
    [
      { known: 'he', target: 'er' },
      { known: 'comes', target: 'kommt' },
      { known: 'back', target: 'zurück' }
    ],
    [
      { known: 'he comes', target: 'er kommt' },
      { known: 'he comes back', target: 'er kommt zurück' },
      { known: 'he comes back later', target: 'er kommt später zurück' },
      { known: 'he comes back tomorrow', target: 'er kommt morgen zurück' }
    ],
    [
      { known: 'He comes back tomorrow', target: 'Er kommt morgen zurück', score: 7 },
      { known: 'He comes back with everyone', target: 'Er kommt mit allen zurück', score: 7 },
      { known: 'He comes back later today', target: 'Er kommt heute später zurück', score: 8 },
      { known: 'He comes back soon', target: 'Er kommt bald zurück', score: 7 },
      { known: 'He comes back every day', target: 'Er kommt jeden Tag zurück', score: 7 },
      { known: 'He comes back with me', target: 'Er kommt mit mir zurück', score: 8 }
    ]
  );

  // Seed 17: "sie findet...heraus" (she finds...out) - SPLIT in main clause
  await addLego(17, 5, 'M',
    'she finds...out (separable split)',
    'sie findet...heraus',
    [
      { known: 'she', target: 'sie' },
      { known: 'finds', target: 'findet' },
      { known: 'out', target: 'heraus' }
    ],
    [
      { known: 'she finds', target: 'sie findet' },
      { known: 'she finds out', target: 'sie findet heraus' },
      { known: 'she finds it out', target: 'sie findet es heraus' },
      { known: 'she finds out the answer', target: 'sie findet die Antwort heraus' }
    ],
    [
      { known: 'She finds out tomorrow', target: 'Sie findet es morgen heraus', score: 7 },
      { known: 'She finds out the truth', target: 'Sie findet die Wahrheit heraus', score: 7 },
      { known: 'She finds out what it is', target: 'Sie findet heraus, was es ist', score: 8 },
      { known: 'She finds out soon', target: 'Sie findet es bald heraus', score: 7 },
      { known: 'She finds out the answer', target: 'Sie findet die Antwort heraus', score: 7 },
      { known: 'She finds it out every time', target: 'Sie findet es jedes Mal heraus', score: 8 }
    ]
  );

  // Seed 19: "ich höre...auf" (I stop) - SPLIT in main clause
  await addLego(19, 7, 'M',
    'I stop (separable split)',
    'ich höre...auf',
    [
      { known: 'I', target: 'ich' },
      { known: 'stop', target: 'höre...auf' }
    ],
    [
      { known: 'I stop', target: 'ich höre auf' },
      { known: 'I stop talking', target: 'ich höre auf zu reden' },
      { known: 'I stop now', target: 'ich höre jetzt auf' },
      { known: 'I stop soon', target: 'ich höre bald auf' }
    ],
    [
      { known: 'I stop now', target: 'Ich höre jetzt auf', score: 7 },
      { known: 'I stop talking', target: 'Ich höre auf zu reden', score: 7 },
      { known: 'I stop soon', target: 'Ich höre bald auf', score: 8 },
      { known: 'I never stop', target: 'Ich höre nie auf', score: 7 },
      { known: 'I stop working', target: 'Ich höre auf zu arbeiten', score: 7 },
      { known: 'I stop when you come', target: 'Ich höre auf, wenn du kommst', score: 8 }
    ]
  );

  // Seed 23: "ich fange...an" (I start) - SPLIT in main clause
  await addLego(23, 8, 'M',
    'I start (separable split)',
    'ich fange...an',
    [
      { known: 'I', target: 'ich' },
      { known: 'start', target: 'fange...an' }
    ],
    [
      { known: 'I start', target: 'ich fange an' },
      { known: 'I start now', target: 'ich fange jetzt an' },
      { known: 'I start talking', target: 'ich fange an zu reden' },
      { known: 'I start soon', target: 'ich fange bald an' }
    ],
    [
      { known: 'I start now', target: 'Ich fange jetzt an', score: 7 },
      { known: 'I start tomorrow', target: 'Ich fange morgen an', score: 7 },
      { known: 'I start talking', target: 'Ich fange an zu reden', score: 8 },
      { known: 'I start soon', target: 'Ich fange bald an', score: 7 },
      { known: 'I start learning German', target: 'Ich fange an Deutsch zu lernen', score: 7 },
      { known: 'I start when you are ready', target: 'Ich fange an, wenn du bereit bist', score: 8 }
    ]
  );

  // Seed 37: "ich denke...nach" (I think about) - SPLIT in main clause
  await addLego(37, 7, 'M',
    'I think about (separable split)',
    'ich denke...nach',
    [
      { known: 'I', target: 'ich' },
      { known: 'think about', target: 'denke...nach' }
    ],
    [
      { known: 'I think about', target: 'ich denke nach' },
      { known: 'I think about it', target: 'ich denke darüber nach' },
      { known: 'I think about it carefully', target: 'ich denke sorgfältig darüber nach' },
      { known: 'I think about the answer', target: 'ich denke über die Antwort nach' }
    ],
    [
      { known: 'I think about it now', target: 'Ich denke jetzt darüber nach', score: 7 },
      { known: 'I think about what to say', target: 'Ich denke darüber nach, was ich sagen soll', score: 7 },
      { known: 'I think about it carefully', target: 'Ich denke sorgfältig darüber nach', score: 8 },
      { known: 'I think about the question', target: 'Ich denke über die Frage nach', score: 7 },
      { known: 'I think about it every day', target: 'Ich denke jeden Tag darüber nach', score: 7 },
      { known: 'I think about what I should do', target: 'Ich denke darüber nach, was ich tun soll', score: 8 }
    ]
  );

  // Seed 41: "ich fange an" vs "anfangen" contrast
  await addLego(41, 7, 'M',
    'I am starting (separable split)',
    'ich fange...an',
    [
      { known: 'I', target: 'ich' },
      { known: 'am starting', target: 'fange...an' }
    ],
    [
      { known: 'I start', target: 'ich fange an' },
      { known: 'I am starting to', target: 'ich fange an zu' },
      { known: 'I am starting to feel', target: 'ich fange an mich zu fühlen' },
      { known: 'I am starting now', target: 'ich fange jetzt an' }
    ],
    [
      { known: 'I am starting to feel tired', target: 'Ich fange an, mich müde zu fühlen', score: 7 },
      { known: 'I am starting to understand', target: 'Ich fange an zu verstehen', score: 7 },
      { known: 'I am starting to speak German', target: 'Ich fange an Deutsch zu sprechen', score: 8 },
      { known: 'I am starting to learn', target: 'Ich fange an zu lernen', score: 7 },
      { known: 'I am starting to feel better', target: 'Ich fange an, mich besser zu fühlen', score: 7 },
      { known: 'I am starting to think about it', target: 'Ich fange an darüber nachzudenken', score: 8 }
    ]
  );
}

// ==================== PATTERN 4: ZU-INSERTION ====================
// Shows "zu" going INSIDE separable verbs

async function addZuInsertionPatterns() {
  console.log('\n=== PATTERN 4: ZU-INSERTION IN SEPARABLE VERBS ===\n');

  // Seed 19: "aufhören" -> "aufzuhören" (to stop)
  await addLego(19, 8, 'M',
    'to stop (zu-insertion)',
    'aufzuhören',
    [
      { known: 'to', target: 'zu' },
      { known: 'stop', target: 'aufhören' }
    ],
    [
      { known: 'to stop', target: 'aufzuhören' },
      { known: 'not to stop', target: 'nicht aufzuhören' },
      { known: 'to try to stop', target: 'versuchen aufzuhören' },
      { known: 'to want to stop', target: 'aufhören wollen' }
    ],
    [
      { known: 'I try not to stop', target: 'Ich versuche nicht aufzuhören', score: 7 },
      { known: 'It is hard to stop', target: 'Es ist schwer aufzuhören', score: 7 },
      { known: 'I want to stop talking', target: 'Ich will aufhören zu reden', score: 8 },
      { known: 'It is time to stop', target: 'Es ist Zeit aufzuhören', score: 7 },
      { known: 'I need to stop now', target: 'Ich muss jetzt aufhören', score: 7 },
      { known: 'It is good to stop sometimes', target: 'Es ist gut manchmal aufzuhören', score: 8 }
    ]
  );

  // Seed 28: "anfangen" -> "anzufangen" (to begin/start)
  await addLego(28, 7, 'M',
    'to begin/start (zu-insertion)',
    'anzufangen',
    [
      { known: 'to', target: 'zu' },
      { known: 'begin/start', target: 'anfangen' }
    ],
    [
      { known: 'to begin', target: 'anzufangen' },
      { known: 'to start talking', target: 'anzufangen zu reden' },
      { known: 'to try to start', target: 'versuchen anzufangen' },
      { known: 'to be ready to start', target: 'bereit anzufangen' }
    ],
    [
      { known: 'It is useful to start now', target: 'Es ist nützlich jetzt anzufangen', score: 7 },
      { known: 'It is time to begin', target: 'Es ist Zeit anzufangen', score: 7 },
      { known: 'I try to start talking', target: 'Ich versuche anzufangen zu reden', score: 8 },
      { known: 'It is good to begin early', target: 'Es ist gut früh anzufangen', score: 7 },
      { known: 'It is hard to start', target: 'Es ist schwer anzufangen', score: 7 },
      { known: 'It is important to begin soon', target: 'Es ist wichtig bald anzufangen', score: 8 }
    ]
  );

  // Seed 37: "nachdenken" -> "nachzudenken" (to think about)
  await addLego(37, 8, 'M',
    'to think about (zu-insertion)',
    'nachzudenken',
    [
      { known: 'to', target: 'zu' },
      { known: 'think about', target: 'nachdenken' }
    ],
    [
      { known: 'to think about', target: 'nachzudenken' },
      { known: 'to think about it', target: 'darüber nachzudenken' },
      { known: 'to try to think about', target: 'versuchen nachzudenken' },
      { known: 'to begin to think about', target: 'anfangen nachzudenken' }
    ],
    [
      { known: 'I started to think about it', target: 'Ich habe angefangen darüber nachzudenken', score: 7 },
      { known: 'It is good to think about it', target: 'Es ist gut darüber nachzudenken', score: 7 },
      { known: 'I need time to think about it', target: 'Ich brauche Zeit darüber nachzudenken', score: 8 },
      { known: 'It is hard to think about', target: 'Es ist schwer nachzudenken', score: 7 },
      { known: 'I try to think about the answer', target: 'Ich versuche über die Antwort nachzudenken', score: 7 },
      { known: 'It is important to think about it carefully', target: 'Es ist wichtig sorgfältig darüber nachzudenken', score: 8 }
    ]
  );
}

// ==================== PATTERN 5: REFLEXIVE VERBS ====================
// Shows reflexive pronoun patterns (mich/dich/sich/uns/euch/sich)

async function addReflexivePatterns() {
  console.log('\n=== PATTERN 5: REFLEXIVE VERBS ===\n');

  // Seed 6: "mich...erinnern" (myself...remember)
  await addLego(6, 6, 'M',
    'to remember (reflexive)',
    'sich erinnern an',
    [
      { known: 'oneself', target: 'sich' },
      { known: 'remember', target: 'erinnern' },
      { known: 'at/of', target: 'an' }
    ],
    [
      { known: 'to remember', target: 'sich erinnern' },
      { known: 'to remember something', target: 'sich an etwas erinnern' },
      { known: 'I remember', target: 'ich erinnere mich' },
      { known: 'I remember it', target: 'ich erinnere mich daran' }
    ],
    [
      { known: 'I am trying to remember', target: 'Ich versuche mich zu erinnern', score: 7 },
      { known: 'I remember the word', target: 'Ich erinnere mich an das Wort', score: 7 },
      { known: 'Do you remember?', target: 'Erinnerst du dich?', score: 8 },
      { known: 'I cannot remember it', target: 'Ich kann mich nicht daran erinnern', score: 7 },
      { known: 'She remembers everything', target: 'Sie erinnert sich an alles', score: 7 },
      { known: 'We remember the answer', target: 'Wir erinnern uns an die Antwort', score: 8 }
    ]
  );

  // Seed 10: reflexive with "mich"
  await addLego(10, 9, 'M',
    'I...myself (reflexive)',
    'ich...mich',
    [
      { known: 'I', target: 'ich' },
      { known: 'myself', target: 'mich' }
    ],
    [
      { known: 'I myself', target: 'ich mich' },
      { known: 'I remember', target: 'ich erinnere mich' },
      { known: 'I can remember', target: 'ich kann mich erinnern' },
      { known: 'I try to remember', target: 'ich versuche mich zu erinnern' }
    ],
    [
      { known: 'I can remember the sentence', target: 'Ich kann mich an den Satz erinnern', score: 7 },
      { known: 'I feel good', target: 'Ich fühle mich gut', score: 7 },
      { known: 'I ask myself', target: 'Ich frage mich', score: 8 },
      { known: 'I am trying to concentrate', target: 'Ich versuche mich zu konzentrieren', score: 7 },
      { known: 'I cannot remember', target: 'Ich kann mich nicht erinnern', score: 7 },
      { known: 'I remember the whole thing', target: 'Ich erinnere mich an das Ganze', score: 8 }
    ]
  );

  // Seed 40: "fühlst du dich" (do you feel - reflexive)
  await addLego(40, 4, 'M',
    'do you feel (reflexive)',
    'fühlst du dich',
    [
      { known: 'feel', target: 'fühlst' },
      { known: 'you', target: 'du' },
      { known: 'yourself', target: 'dich' }
    ],
    [
      { known: 'you feel', target: 'du fühlst dich' },
      { known: 'do you feel', target: 'fühlst du dich' },
      { known: 'how do you feel', target: 'wie fühlst du dich' },
      { known: 'do you feel good', target: 'fühlst du dich gut' }
    ],
    [
      { known: 'How do you feel now?', target: 'Wie fühlst du dich jetzt?', score: 7 },
      { known: 'Do you feel better?', target: 'Fühlst du dich besser?', score: 7 },
      { known: 'How do you feel today?', target: 'Wie fühlst du dich heute?', score: 8 },
      { known: 'Do you feel tired?', target: 'Fühlst du dich müde?', score: 7 },
      { known: 'How do you feel at the moment?', target: 'Wie fühlst du dich im Moment?', score: 7 },
      { known: 'Do you feel ready?', target: 'Fühlst du dich bereit?', score: 8 }
    ]
  );

  // Seed 41: "ich fühle mich" (I feel - reflexive)
  await addLego(41, 8, 'M',
    'I feel (reflexive)',
    'ich fühle mich',
    [
      { known: 'I', target: 'ich' },
      { known: 'feel', target: 'fühle' },
      { known: 'myself', target: 'mich' }
    ],
    [
      { known: 'I feel', target: 'ich fühle mich' },
      { known: 'I feel good', target: 'ich fühle mich gut' },
      { known: 'I feel tired', target: 'ich fühle mich müde' },
      { known: 'I feel okay', target: 'ich fühle mich okay' }
    ],
    [
      { known: 'I feel okay now', target: 'Ich fühle mich jetzt okay', score: 7 },
      { known: 'I feel better today', target: 'Ich fühle mich heute besser', score: 7 },
      { known: 'I feel tired at the moment', target: 'Ich fühle mich im Moment müde', score: 8 },
      { known: 'I feel good after practising', target: 'Ich fühle mich gut nach dem Üben', score: 7 },
      { known: 'I feel ready to speak', target: 'Ich fühle mich bereit zu sprechen', score: 7 },
      { known: 'I feel more comfortable now', target: 'Ich fühle mich jetzt wohler', score: 8 }
    ]
  );
}

// ==================== MAIN ====================

async function main() {
  console.log('='.repeat(60));
  console.log('Adding Overlapping M-LEGOs for German Course (deu_for_eng)');
  console.log('='.repeat(60));

  // Add all patterns
  await addVerbFinalPatterns();
  await addModalBracketPatterns();
  await addSeparableVerbPatterns();
  await addZuInsertionPatterns();
  await addReflexivePatterns();

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`\nLEGOs added: ${results.added.length}`);
  console.log(`LEGOs failed: ${results.failed.length}`);

  if (results.failed.length > 0) {
    console.log('\nFailed LEGOs:');
    results.failed.forEach(f => {
      console.log(`  - Seed ${f.seed} L${f.idx}: ${f.error}`);
    });
  }

  // Output results for logging
  return results;
}

main().then(results => {
  // Write summary to file
  const fs = require('fs');
  const summaryPath = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/scripts/quality-reports/deu_for_eng-fixes-summary.md';

  const summary = `# German Course (deu_for_eng) - Overlapping M-LEGO Fixes Summary

## Date: ${new Date().toISOString().split('T')[0]}

## Overview

Added overlapping M-LEGOs to handle German structural patterns that differ from English.

## Patterns Addressed

### 1. Verb-Final in Subordinate Clauses (9 LEGOs)
- Seeds: 10, 11, 15, 17, 22, 25, 34, 43, 47
- Conjunctions: ob, nachdem, dass, was, weil, bevor, wenn, wie
- Pattern: Verb goes to END after subordinating conjunction
- Example: "ob ich kommen **kann**" (whether I can come)

### 2. Modal + Infinitive Bracket (5 LEGOs)
- Seeds: 1, 5, 16, 19, 23
- Pattern: Modal verb in V2 position, infinitive at END
- Example: "Ich **will** jetzt Deutsch **sprechen**" (I want to speak German now)

### 3. Separable Verbs - Split Pattern (6 LEGOs)
- Seeds: 16, 17, 19, 23, 37, 41
- Pattern: Prefix separates from verb in main clause
- Example: "Er **kommt** morgen **zurück**" (He comes back tomorrow)

### 4. zu-Insertion in Separable Verbs (3 LEGOs)
- Seeds: 19, 28, 37
- Pattern: "zu" goes INSIDE separable verbs
- Example: "an**zu**fangen" (to start), "nach**zu**denken" (to think about)

### 5. Reflexive Verbs (4 LEGOs)
- Seeds: 6, 10, 40, 41
- Pattern: Reflexive pronoun (mich/dich/sich/uns/euch/sich)
- Example: "Ich fühle **mich** gut" (I feel good)

## Results

- **Total LEGOs added:** ${results.added.length}
- **Failed:** ${results.failed.length}
- **Skipped:** ${results.skipped.length}

## LEGOs Added

${results.added.map(l => `- **S${String(l.seed).padStart(4,'0')}L${String(l.idx).padStart(2,'0')}**: "${l.known}" -> "${l.target}"`).join('\n')}

${results.failed.length > 0 ? `## Failed LEGOs

${results.failed.map(f => `- S${f.seed}L${f.idx}: ${f.error}`).join('\n')}` : ''}

## Key Insights

1. **Bracket patterns** are crucial for German word order - learners need to see material between the bracket elements
2. **Overlapping LEGOs** provide multiple entry points to the same vocabulary in different structural contexts
3. **Separable verbs** need both split and together forms practiced
4. **Reflexive verbs** require explicit pronoun practice (ich-mich, du-dich, etc.)

## Recommendations for Future Courses

1. **Always identify structural differences** between source and target language during course planning
2. **Create overlapping M-LEGOs** for patterns that require different word order
3. **Include contrastive examples** showing when patterns apply vs. don't apply
4. **Use BUILD phrases** to show the bracket construction step-by-step
5. **Consider automation** to detect pattern candidates during seed analysis

---
*Generated by German course fix script*
`;

  fs.writeFileSync(summaryPath, summary);
  console.log(`\nSummary written to: ${summaryPath}`);
}).catch(console.error);
