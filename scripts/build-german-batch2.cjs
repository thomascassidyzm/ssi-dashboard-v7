/**
 * German Course Builder - Batch 2 (Seeds 26-35)
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

function A(seed, idx, known, target, phrases) {
  return { course_code: 'deu_for_eng', seed, idx, type: 'A', known, target, components: null, phrases };
}

function M(seed, idx, known, target, components, phrases) {
  return { course_code: 'deu_for_eng', seed, idx, type: 'M', known, target, components, phrases };
}

async function buildSeeds() {

  // Seed 26: "I like feeling as if I'm nearly ready to go."
  await postLego(A(26, 1, 'feeling', 'fühlen',
    [
      { known: 'feeling', target: 'fühlen' },
      { known: 'I like feeling', target: 'ich mag mich fühlen' },
      { known: 'she likes feeling', target: 'sie mag sich fühlen' },
      { known: 'I am feeling', target: 'ich fühle mich' },
      { known: 'I am feeling good', target: 'ich fühle mich gut' },
      { known: 'I like feeling more', target: 'ich mag mich mehr fühlen' },
      { known: 'because I am feeling better', target: 'weil ich mich besser fühle' },
      { known: 'are you feeling more easily now', target: 'fühlst du dich jetzt leichter' },
      { known: 'I like feeling that I can speak German', target: 'ich mag fühlen dass ich Deutsch sprechen kann' },
      { known: 'she is feeling that she wants to meet people who speak German', target: 'sie fühlt dass sie Leute treffen will die Deutsch sprechen' }
    ]
  ));

  await postLego(A(26, 2, 'as if', 'als ob',
    [
      { known: 'as if', target: 'als ob' },
      { known: 'I feel as if', target: 'ich fühle mich als ob' },
      { known: 'as if I can speak', target: 'als ob ich sprechen kann' },
      { known: 'as if I want to go', target: 'als ob ich gehen will' },
      { known: 'I like feeling as if', target: 'ich mag mich fühlen als ob' },
      { known: 'as if I am able to remember easily', target: 'als ob ich mich leicht erinnern kann' },
      { known: 'she feels as if she has to start', target: 'sie fühlt sich als ob sie anfangen muss' },
      { known: 'because I feel as if I want to speak more', target: 'weil ich mich fühle als ob ich mehr sprechen will' },
      { known: 'I like feeling as if I can meet people who speak German', target: 'ich mag mich fühlen als ob ich Leute treffen kann die Deutsch sprechen' },
      { known: 'are you feeling as if you are going to learn more soon', target: 'fühlst du dich als ob du bald mehr lernen wirst' }
    ]
  ));

  await postLego(A(26, 3, 'nearly', 'fast',
    [
      { known: 'nearly', target: 'fast' },
      { known: 'nearly ready', target: 'fast bereit' },
      { known: 'I am nearly ready', target: 'ich bin fast bereit' },
      { known: 'she is nearly ready', target: 'sie ist fast bereit' },
      { known: 'we are nearly ready', target: 'wir sind fast bereit' },
      { known: 'I am nearly ready to go', target: 'ich bin fast bereit zu gehen' },
      { known: 'I like feeling as if I am nearly ready', target: 'ich mag mich fühlen als ob ich fast bereit bin' },
      { known: 'she is nearly ready to start speaking German', target: 'sie ist fast bereit anzufangen Deutsch zu sprechen' },
      { known: 'because I am nearly ready to meet people who speak German', target: 'weil ich fast bereit bin Leute zu treffen die Deutsch sprechen' },
      { known: 'I feel as if I am nearly able to remember more easily now', target: 'ich fühle mich als ob ich mich jetzt fast leichter erinnern kann' }
    ]
  ));

  await postLego(A(26, 4, 'ready', 'bereit',
    [
      { known: 'ready', target: 'bereit' },
      { known: 'I am ready', target: 'ich bin bereit' },
      { known: 'ready to go', target: 'bereit zu gehen' },
      { known: 'ready to speak', target: 'bereit zu sprechen' },
      { known: 'are you ready', target: 'bist du bereit' },
      { known: 'she is ready to start', target: 'sie ist bereit anzufangen' },
      { known: 'I am ready to help you', target: 'ich bin bereit dir zu helfen' },
      { known: 'I like feeling as if I am nearly ready to go', target: 'ich mag mich fühlen als ob ich fast bereit bin zu gehen' },
      { known: 'because I am ready to meet people who speak German soon', target: 'weil ich bereit bin bald Leute zu treffen die Deutsch sprechen' },
      { known: 'are you ready to start learning more before you have to go', target: 'bist du bereit mehr zu lernen bevor du gehen musst' }
    ]
  ));

  // Seed 27: "I don't like taking too much time to answer."
  await postLego(M(27, 1, "I don't like", 'ich mag nicht',
    [{ known: "don't like", target: 'mag nicht' }],
    [
      { known: "I don't like", target: 'ich mag nicht' },
      { known: "I don't like speaking", target: 'ich mag nicht sprechen' },
      { known: "I don't like feeling", target: 'ich mag mich nicht fühlen' },
      { known: "but I don't like", target: 'aber ich mag nicht' },
      { known: "I don't like waiting", target: 'ich mag nicht warten' },
      { known: "I don't like stopping", target: 'ich mag nicht aufhören' },
      { known: "I don't like feeling as if I have to go", target: 'ich mag mich nicht fühlen als ob ich gehen muss' },
      { known: "because I don't like speaking quickly", target: 'weil ich nicht schnell sprechen mag' },
      { known: "I don't like meeting people who speak German easily", target: 'ich mag nicht leicht Leute treffen die Deutsch sprechen' },
      { known: "but I don't like feeling nearly ready to start soon", target: 'aber ich mag mich nicht fast bereit fühlen bald anzufangen' }
    ]
  ));

  await postLego(A(27, 2, 'taking', 'nehmen',
    [
      { known: 'taking', target: 'nehmen' },
      { known: 'I am taking', target: 'ich nehme' },
      { known: 'taking time', target: 'Zeit nehmen' },
      { known: "I don't like taking", target: 'ich mag nicht nehmen' },
      { known: 'she is taking more', target: 'sie nimmt mehr' },
      { known: 'I am taking time to learn', target: 'ich nehme Zeit zu lernen' },
      { known: "I don't like taking time to speak", target: 'ich mag nicht Zeit nehmen zu sprechen' },
      { known: 'because I am taking time to remember', target: 'weil ich Zeit nehme mich zu erinnern' },
      { known: 'are you taking time to help me before you go', target: 'nimmst du Zeit mir zu helfen bevor du gehst' },
      { known: "I don't like taking time to meet people who speak German", target: 'ich mag nicht Zeit nehmen um Leute zu treffen die Deutsch sprechen' }
    ]
  ));

  await postLego(M(27, 3, 'too much', 'zu viel',
    [{ known: 'too', target: 'zu' }, { known: 'much', target: 'viel' }],
    [
      { known: 'too much', target: 'zu viel' },
      { known: 'too much time', target: 'zu viel Zeit' },
      { known: 'taking too much time', target: 'zu viel Zeit nehmen' },
      { known: "I don't like taking too much time", target: 'ich mag nicht zu viel Zeit nehmen' },
      { known: 'I have too much', target: 'ich habe zu viel' },
      { known: 'she is taking too much time', target: 'sie nimmt zu viel Zeit' },
      { known: 'because I am taking too much time to learn', target: 'weil ich zu viel Zeit nehme zu lernen' },
      { known: "I don't like taking too much time to speak German", target: 'ich mag nicht zu viel Zeit nehmen um Deutsch zu sprechen' },
      { known: 'are you taking too much time to remember easily', target: 'nimmst du zu viel Zeit um dich leicht zu erinnern' },
      { known: 'I feel as if I am taking too much time to meet people who speak German', target: 'ich fühle mich als ob ich zu viel Zeit nehme um Leute zu treffen die Deutsch sprechen' }
    ]
  ));

  await postLego(A(27, 4, 'time', 'Zeit',
    [
      { known: 'time', target: 'Zeit' },
      { known: 'too much time', target: 'zu viel Zeit' },
      { known: 'taking time', target: 'Zeit nehmen' },
      { known: 'I have time', target: 'ich habe Zeit' },
      { known: 'I need time', target: 'ich brauche Zeit' },
      { known: "I don't have time", target: 'ich habe keine Zeit' },
      { known: 'she has time to help', target: 'sie hat Zeit zu helfen' },
      { known: 'I have time to speak German', target: 'ich habe Zeit Deutsch zu sprechen' },
      { known: "I don't like taking too much time to answer", target: 'ich mag nicht zu viel Zeit nehmen zu antworten' },
      { known: 'because I have time to meet people who speak German this evening', target: 'weil ich heute Abend Zeit habe Leute zu treffen die Deutsch sprechen' }
    ]
  ));

  await postLego(A(27, 5, 'to answer', 'antworten',
    [
      { known: 'to answer', target: 'antworten' },
      { known: 'I want to answer', target: 'ich will antworten' },
      { known: 'I need to answer', target: 'ich brauche zu antworten' },
      { known: 'I am going to answer', target: 'ich werde antworten' },
      { known: 'time to answer', target: 'Zeit zu antworten' },
      { known: 'taking time to answer', target: 'Zeit nehmen zu antworten' },
      { known: "I don't like taking too much time to answer", target: 'ich mag nicht zu viel Zeit nehmen zu antworten' },
      { known: 'because I need to answer quickly', target: 'weil ich schnell antworten muss' },
      { known: 'she wants to answer before she has to go', target: 'sie will antworten bevor sie gehen muss' },
      { known: 'I feel as if I am nearly ready to answer easily now', target: 'ich fühle mich als ob ich jetzt fast bereit bin leicht zu antworten' }
    ]
  ));

  // Seed 28: "It's useful to start talking as soon as you can."
  await postLego(M(28, 1, "it's useful", 'es ist nützlich',
    [{ known: 'useful', target: 'nützlich' }],
    [
      { known: "it's useful", target: 'es ist nützlich' },
      { known: "it's useful to speak", target: 'es ist nützlich zu sprechen' },
      { known: "it's useful to learn", target: 'es ist nützlich zu lernen' },
      { known: "it's useful to start", target: 'es ist nützlich anzufangen' },
      { known: "it's useful to remember", target: 'es ist nützlich sich zu erinnern' },
      { known: "I think it's useful", target: 'ich denke es ist nützlich' },
      { known: "it's useful to answer quickly", target: 'es ist nützlich schnell zu antworten' },
      { known: "it's useful to meet people who speak German", target: 'es ist nützlich Leute zu treffen die Deutsch sprechen' },
      { known: "I think it's useful to start learning more soon", target: 'ich denke es ist nützlich bald mehr zu lernen' },
      { known: "because it's useful to feel ready before you have to go", target: 'weil es nützlich ist sich bereit zu fühlen bevor man gehen muss' }
    ]
  ));

  await postLego(M(28, 2, 'as soon as', 'sobald',
    [{ known: 'as soon', target: 'sobald' }],
    [
      { known: 'as soon as', target: 'sobald' },
      { known: 'as soon as you can', target: 'sobald du kannst' },
      { known: 'as soon as I can', target: 'sobald ich kann' },
      { known: 'as soon as possible', target: 'sobald wie möglich' },
      { known: 'I want to start as soon as I can', target: 'ich will anfangen sobald ich kann' },
      { known: 'she wants to speak as soon as she can', target: 'sie will sprechen sobald sie kann' },
      { known: "it's useful to start as soon as you can", target: 'es ist nützlich anzufangen sobald du kannst' },
      { known: 'I am going to answer as soon as I am ready', target: 'ich werde antworten sobald ich bereit bin' },
      { known: 'because I want to meet people who speak German as soon as I can', target: 'weil ich Leute treffen will die Deutsch sprechen sobald ich kann' },
      { known: "it's useful to start talking as soon as you can every day", target: 'es ist nützlich anzufangen zu reden sobald du kannst jeden Tag' }
    ]
  ));

  await postLego(M(28, 3, 'you can', 'du kannst',
    [{ known: 'can', target: 'kannst' }],
    [
      { known: 'you can', target: 'du kannst' },
      { known: 'you can speak', target: 'du kannst sprechen' },
      { known: 'you can learn', target: 'du kannst lernen' },
      { known: 'you can help', target: 'du kannst helfen' },
      { known: 'as soon as you can', target: 'sobald du kannst' },
      { known: 'I think you can remember easily', target: 'ich denke du kannst dich leicht erinnern' },
      { known: 'you can start talking more soon', target: 'du kannst bald anfangen mehr zu reden' },
      { known: "it's useful to start as soon as you can", target: 'es ist nützlich anzufangen sobald du kannst' },
      { known: 'because you can meet people who speak German this evening', target: 'weil du heute Abend Leute treffen kannst die Deutsch sprechen' },
      { known: 'I feel as if you can answer more quickly as soon as you are ready', target: 'ich fühle als ob du schneller antworten kannst sobald du bereit bist' }
    ]
  ));

  // Seed 29: "I'm looking forward to speaking better as soon as I can."
  await postLego(M(29, 1, "I'm looking forward to", 'ich freue mich auf',
    [{ known: 'looking forward', target: 'freue mich' }, { known: 'to', target: 'auf' }],
    [
      { known: "I'm looking forward to", target: 'ich freue mich auf' },
      { known: "I'm looking forward to speaking", target: 'ich freue mich aufs Sprechen' },
      { known: "I'm looking forward to learning", target: 'ich freue mich aufs Lernen' },
      { known: "I'm looking forward to meeting", target: 'ich freue mich aufs Treffen' },
      { known: "I'm looking forward to helping", target: 'ich freue mich aufs Helfen' },
      { known: "I'm looking forward to going", target: 'ich freue mich aufs Gehen' },
      { known: "I'm looking forward to this evening", target: 'ich freue mich auf heute Abend' },
      { known: "I'm looking forward to meeting people who speak German", target: 'ich freue mich Leute zu treffen die Deutsch sprechen' },
      { known: "because I'm looking forward to starting soon", target: 'weil ich mich freue bald anzufangen' },
      { known: "I'm looking forward to speaking German more every day", target: 'ich freue mich jeden Tag mehr Deutsch zu sprechen' }
    ]
  ));

  await postLego(A(29, 2, 'better', 'besser',
    [
      { known: 'better', target: 'besser' },
      { known: 'speaking better', target: 'besser sprechen' },
      { known: 'feeling better', target: 'besser fühlen' },
      { known: 'learning better', target: 'besser lernen' },
      { known: 'I want to speak better', target: 'ich will besser sprechen' },
      { known: "I'm looking forward to speaking better", target: 'ich freue mich besser zu sprechen' },
      { known: 'she is feeling better now', target: 'sie fühlt sich jetzt besser' },
      { known: "I'm trying to remember better", target: 'ich versuche mich besser zu erinnern' },
      { known: 'because I want to answer better as soon as I can', target: 'weil ich besser antworten will sobald ich kann' },
      { known: "I'm looking forward to speaking German better with people this evening", target: 'ich freue mich heute Abend besser Deutsch mit Leuten zu sprechen' }
    ]
  ));

  // Seed 30: "I wanted to ask you something yesterday."
  await postLego(M(30, 1, 'I wanted', 'ich wollte',
    [{ known: 'wanted', target: 'wollte' }],
    [
      { known: 'I wanted', target: 'ich wollte' },
      { known: 'I wanted to speak', target: 'ich wollte sprechen' },
      { known: 'I wanted to learn', target: 'ich wollte lernen' },
      { known: 'I wanted to meet', target: 'ich wollte treffen' },
      { known: 'I wanted to help', target: 'ich wollte helfen' },
      { known: 'I wanted to go', target: 'ich wollte gehen' },
      { known: 'I wanted to find out', target: 'ich wollte herausfinden' },
      { known: 'but I wanted to start more soon', target: 'aber ich wollte bald mehr anfangen' },
      { known: 'I wanted to meet people who speak German', target: 'ich wollte Leute treffen die Deutsch sprechen' },
      { known: 'because I wanted to feel better before I had to go', target: 'weil ich mich besser fühlen wollte bevor ich gehen musste' }
    ]
  ));

  await postLego(A(30, 2, 'to ask', 'fragen',
    [
      { known: 'to ask', target: 'fragen' },
      { known: 'I want to ask', target: 'ich will fragen' },
      { known: 'I wanted to ask', target: 'ich wollte fragen' },
      { known: 'I need to ask', target: 'ich brauche zu fragen' },
      { known: 'I am going to ask', target: 'ich werde fragen' },
      { known: 'to ask you', target: 'dich fragen' },
      { known: 'I wanted to ask you something', target: 'ich wollte dich etwas fragen' },
      { known: 'because I want to ask before I go', target: 'weil ich fragen will bevor ich gehe' },
      { known: 'she wanted to ask why you are learning German', target: 'sie wollte fragen warum du Deutsch lernst' },
      { known: "I'm looking forward to asking people who speak German", target: 'ich freue mich Leute zu fragen die Deutsch sprechen' }
    ]
  ));

  await postLego(A(30, 3, 'yesterday', 'gestern',
    [
      { known: 'yesterday', target: 'gestern' },
      { known: 'I wanted to ask yesterday', target: 'ich wollte gestern fragen' },
      { known: 'I spoke yesterday', target: 'ich sprach gestern' },
      { known: 'she wanted to meet yesterday', target: 'sie wollte gestern treffen' },
      { known: 'we learned yesterday', target: 'wir lernten gestern' },
      { known: 'I wanted to ask you something yesterday', target: 'ich wollte dich gestern etwas fragen' },
      { known: 'yesterday I was feeling better', target: 'gestern fühlte ich mich besser' },
      { known: 'I wanted to start speaking more yesterday', target: 'ich wollte gestern mehr zu sprechen anfangen' },
      { known: 'because I wanted to meet people who speak German yesterday', target: 'weil ich gestern Leute treffen wollte die Deutsch sprechen' },
      { known: 'I was looking forward to helping you yesterday before I had to go', target: 'ich freute mich darauf dir gestern zu helfen bevor ich gehen musste' }
    ]
  ));

  // Seed 31: "You wanted to speak with me tonight."
  await postLego(M(31, 1, 'you wanted', 'du wolltest',
    [{ known: 'wanted', target: 'wolltest' }],
    [
      { known: 'you wanted', target: 'du wolltest' },
      { known: 'you wanted to speak', target: 'du wolltest sprechen' },
      { known: 'you wanted to learn', target: 'du wolltest lernen' },
      { known: 'you wanted to ask', target: 'du wolltest fragen' },
      { known: 'you wanted to meet', target: 'du wolltest treffen' },
      { known: 'you wanted to help me', target: 'du wolltest mir helfen' },
      { known: 'you wanted to speak German yesterday', target: 'du wolltest gestern Deutsch sprechen' },
      { known: 'I think you wanted to ask something', target: 'ich denke du wolltest etwas fragen' },
      { known: 'because you wanted to feel ready before you had to go', target: 'weil du dich bereit fühlen wolltest bevor du gehen musstest' },
      { known: 'you wanted to meet people who speak German as soon as you could', target: 'du wolltest Leute treffen die Deutsch sprechen sobald du konntest' }
    ]
  ));

  await postLego(A(31, 2, 'with me', 'mit mir',
    [
      { known: 'with me', target: 'mit mir' },
      { known: 'speak with me', target: 'sprich mit mir' },
      { known: 'to speak with me', target: 'mit mir sprechen' },
      { known: 'you wanted to speak with me', target: 'du wolltest mit mir sprechen' },
      { known: 'I want to speak with me', target: 'ich will mit mir sprechen' },
      { known: 'she wants to meet with me', target: 'sie will mit mir treffen' },
      { known: 'are you going to speak with me', target: 'wirst du mit mir sprechen' },
      { known: 'I am looking forward to speaking with me in German', target: 'ich freue mich mit mir auf Deutsch zu sprechen' },
      { known: 'because you wanted to speak with me yesterday', target: 'weil du gestern mit mir sprechen wolltest' },
      { known: 'you wanted to speak with me before you had to go at six', target: 'du wolltest mit mir sprechen bevor du um sechs gehen musstest' }
    ]
  ));

  await postLego(A(31, 3, 'tonight', 'heute Nacht',
    [
      { known: 'tonight', target: 'heute Nacht' },
      { known: 'I want to speak tonight', target: 'ich will heute Nacht sprechen' },
      { known: 'you wanted to speak with me tonight', target: 'du wolltest heute Nacht mit mir sprechen' },
      { known: 'she wants to meet tonight', target: 'sie will heute Nacht treffen' },
      { known: 'we are going to learn tonight', target: 'wir werden heute Nacht lernen' },
      { known: 'I am looking forward to tonight', target: 'ich freue mich auf heute Nacht' },
      { known: 'because I want to ask you something tonight', target: 'weil ich dich heute Nacht etwas fragen will' },
      { known: 'you wanted to speak German with me tonight at six', target: 'du wolltest heute Nacht um sechs mit mir Deutsch sprechen' },
      { known: 'I feel as if I am nearly ready to speak better tonight', target: 'ich fühle mich als ob ich fast bereit bin heute Nacht besser zu sprechen' },
      { known: 'are you going to help me meet people who speak German tonight', target: 'wirst du mir heute Nacht helfen Leute zu treffen die Deutsch sprechen' }
    ]
  ));

  // Seed 32: "Did you want to show me something?"
  await postLego(M(32, 1, 'did you want', 'wolltest du',
    [{ known: 'did', target: 'wolltest' }],
    [
      { known: 'did you want', target: 'wolltest du' },
      { known: 'did you want to speak', target: 'wolltest du sprechen' },
      { known: 'did you want to learn', target: 'wolltest du lernen' },
      { known: 'did you want to ask', target: 'wolltest du fragen' },
      { known: 'did you want to meet', target: 'wolltest du treffen' },
      { known: 'did you want to help me', target: 'wolltest du mir helfen' },
      { known: 'did you want to speak German yesterday', target: 'wolltest du gestern Deutsch sprechen' },
      { known: 'did you want to meet people who speak German', target: 'wolltest du Leute treffen die Deutsch sprechen' },
      { known: 'did you want to feel better before you had to go', target: 'wolltest du dich besser fühlen bevor du gehen musstest' },
      { known: 'did you want to start speaking more as soon as you could', target: 'wolltest du anfangen mehr zu sprechen sobald du konntest' }
    ]
  ));

  await postLego(A(32, 2, 'to show', 'zeigen',
    [
      { known: 'to show', target: 'zeigen' },
      { known: 'I want to show', target: 'ich will zeigen' },
      { known: 'did you want to show', target: 'wolltest du zeigen' },
      { known: 'to show me', target: 'mir zeigen' },
      { known: 'I am going to show you', target: 'ich werde dir zeigen' },
      { known: 'she wants to show', target: 'sie will zeigen' },
      { known: 'I wanted to show you something yesterday', target: 'ich wollte dir gestern etwas zeigen' },
      { known: 'did you want to show me something', target: 'wolltest du mir etwas zeigen' },
      { known: 'because I want to show you the answer', target: 'weil ich dir die Antwort zeigen will' },
      { known: 'I am looking forward to showing you how to speak German better', target: 'ich freue mich darauf dir zu zeigen wie man besser Deutsch spricht' }
    ]
  ));

  // Seed 33: "How long have you been learning German?"
  await postLego(M(33, 1, 'how long', 'wie lange',
    [{ known: 'long', target: 'lange' }],
    [
      { known: 'how long', target: 'wie lange' },
      { known: 'how long have you', target: 'wie lange hast du' },
      { known: 'how long is it', target: 'wie lange ist es' },
      { known: 'how long do you want', target: 'wie lange willst du' },
      { known: 'how long have you been learning', target: 'wie lange hast du gelernt' },
      { known: 'I want to know how long', target: 'ich will wissen wie lange' },
      { known: 'how long are you going to stay', target: 'wie lange wirst du bleiben' },
      { known: 'how long did you want to speak', target: 'wie lange wolltest du sprechen' },
      { known: 'I want to find out how long she has been learning', target: 'ich will herausfinden wie lange sie gelernt hat' },
      { known: 'how long have you been meeting people who speak German', target: 'wie lange hast du Leute getroffen die Deutsch sprechen' }
    ]
  ));

  await postLego(M(33, 2, 'have you been', 'hast du',
    [{ known: 'have', target: 'hast' }],
    [
      { known: 'have you been', target: 'hast du' },
      { known: 'have you been learning', target: 'hast du gelernt' },
      { known: 'have you been speaking', target: 'hast du gesprochen' },
      { known: 'how long have you been', target: 'wie lange hast du' },
      { known: 'have you been feeling better', target: 'hast du dich besser gefühlt' },
      { known: 'have you been helping', target: 'hast du geholfen' },
      { known: 'how long have you been learning German', target: 'wie lange hast du Deutsch gelernt' },
      { known: 'have you been meeting people who speak German', target: 'hast du Leute getroffen die Deutsch sprechen' },
      { known: 'I want to ask how long have you been learning', target: 'ich will fragen wie lange du gelernt hast' },
      { known: 'have you been feeling ready to speak more soon', target: 'hast du dich bereit gefühlt bald mehr zu sprechen' }
    ]
  ));

  // Seed 34: "He doesn't want to be quiet when other people are here."
  await postLego(M(34, 1, "he doesn't want", 'er will nicht',
    [{ known: 'he', target: 'er' }],
    [
      { known: "he doesn't want", target: 'er will nicht' },
      { known: "he doesn't want to speak", target: 'er will nicht sprechen' },
      { known: "he doesn't want to learn", target: 'er will nicht lernen' },
      { known: "he doesn't want to go", target: 'er will nicht gehen' },
      { known: "he doesn't want to stop", target: 'er will nicht aufhören' },
      { known: "but he doesn't want to help", target: 'aber er will nicht helfen' },
      { known: "he doesn't want to feel as if he has to go", target: 'er will sich nicht fühlen als ob er gehen muss' },
      { known: "I think he doesn't want to meet people who speak German", target: 'ich denke er will nicht Leute treffen die Deutsch sprechen' },
      { known: "he doesn't want to speak German with me tonight", target: 'er will heute Nacht nicht mit mir Deutsch sprechen' },
      { known: "because he doesn't want to start learning more as soon as he can", target: 'weil er nicht anfangen will mehr zu lernen sobald er kann' }
    ]
  ));

  await postLego(M(34, 2, 'to be quiet', 'still sein',
    [{ known: 'quiet', target: 'still' }, { known: 'to be', target: 'sein' }],
    [
      { known: 'to be quiet', target: 'still sein' },
      { known: 'I want to be quiet', target: 'ich will still sein' },
      { known: "he doesn't want to be quiet", target: 'er will nicht still sein' },
      { known: 'she wants to be quiet', target: 'sie will still sein' },
      { known: 'I need to be quiet', target: 'ich muss still sein' },
      { known: 'please be quiet', target: 'bitte sei still' },
      { known: 'I am going to be quiet soon', target: 'ich werde bald still sein' },
      { known: 'because I want to be quiet before I go', target: 'weil ich still sein will bevor ich gehe' },
      { known: "he doesn't want to be quiet when he is speaking German", target: 'er will nicht still sein wenn er Deutsch spricht' },
      { known: 'I feel as if I need to be quiet before I can answer', target: 'ich fühle als ob ich still sein muss bevor ich antworten kann' }
    ]
  ));

  await postLego(A(34, 3, 'when', 'wenn',
    [
      { known: 'when', target: 'wenn' },
      { known: 'when I speak', target: 'wenn ich spreche' },
      { known: 'when you learn', target: 'wenn du lernst' },
      { known: 'when she goes', target: 'wenn sie geht' },
      { known: 'when I have to go', target: 'wenn ich gehen muss' },
      { known: 'when I am ready', target: 'wenn ich bereit bin' },
      { known: "he doesn't want to be quiet when", target: 'er will nicht still sein wenn' },
      { known: 'when I am meeting people who speak German', target: 'wenn ich Leute treffe die Deutsch sprechen' },
      { known: 'I want to feel better when I have to answer', target: 'ich will mich besser fühlen wenn ich antworten muss' },
      { known: "he doesn't want to be quiet when he is speaking German tonight", target: 'er will nicht still sein wenn er heute Nacht Deutsch spricht' }
    ]
  ));

  await postLego(M(34, 4, 'other people', 'andere Leute',
    [{ known: 'other', target: 'andere' }],
    [
      { known: 'other people', target: 'andere Leute' },
      { known: 'with other people', target: 'mit anderen Leuten' },
      { known: 'other people are here', target: 'andere Leute sind hier' },
      { known: 'I want to meet other people', target: 'ich will andere Leute treffen' },
      { known: 'when other people are here', target: 'wenn andere Leute hier sind' },
      { known: "he doesn't want to be quiet when other people are here", target: 'er will nicht still sein wenn andere Leute hier sind' },
      { known: 'she wants to speak German with other people', target: 'sie will mit anderen Leuten Deutsch sprechen' },
      { known: 'I am looking forward to meeting other people who speak German', target: 'ich freue mich andere Leute zu treffen die Deutsch sprechen' },
      { known: 'because I want to help other people learn German', target: 'weil ich anderen Leuten helfen will Deutsch zu lernen' },
      { known: 'when other people are here I want to speak German more', target: 'wenn andere Leute hier sind will ich mehr Deutsch sprechen' }
    ]
  ));

  await postLego(A(34, 5, 'here', 'hier',
    [
      { known: 'here', target: 'hier' },
      { known: 'I am here', target: 'ich bin hier' },
      { known: 'she is here', target: 'sie ist hier' },
      { known: 'other people are here', target: 'andere Leute sind hier' },
      { known: 'when other people are here', target: 'wenn andere Leute hier sind' },
      { known: 'I want to be here', target: 'ich will hier sein' },
      { known: 'because I am here to learn German', target: 'weil ich hier bin um Deutsch zu lernen' },
      { known: "he doesn't want to be quiet when other people are here", target: 'er will nicht still sein wenn andere Leute hier sind' },
      { known: 'I am looking forward to being here tonight', target: 'ich freue mich darauf heute Nacht hier zu sein' },
      { known: 'when I am here I want to speak German with people', target: 'wenn ich hier bin will ich mit Leuten Deutsch sprechen' }
    ]
  ));

  // Seed 35: "She doesn't want to read anything this afternoon."
  await postLego(M(35, 1, "she doesn't want", 'sie will nicht',
    [],
    [
      { known: "she doesn't want", target: 'sie will nicht' },
      { known: "she doesn't want to speak", target: 'sie will nicht sprechen' },
      { known: "she doesn't want to learn", target: 'sie will nicht lernen' },
      { known: "she doesn't want to go", target: 'sie will nicht gehen' },
      { known: "she doesn't want to help", target: 'sie will nicht helfen' },
      { known: "but she doesn't want to stop", target: 'aber sie will nicht aufhören' },
      { known: "she doesn't want to be quiet when other people are here", target: 'sie will nicht still sein wenn andere Leute hier sind' },
      { known: "I think she doesn't want to meet people who speak German", target: 'ich denke sie will nicht Leute treffen die Deutsch sprechen' },
      { known: "she doesn't want to feel as if she has to go tonight", target: 'sie will sich nicht fühlen als ob sie heute Nacht gehen muss' },
      { known: "because she doesn't want to take too much time to answer", target: 'weil sie nicht zu viel Zeit nehmen will zu antworten' }
    ]
  ));

  await postLego(A(35, 2, 'to read', 'lesen',
    [
      { known: 'to read', target: 'lesen' },
      { known: 'I want to read', target: 'ich will lesen' },
      { known: "she doesn't want to read", target: 'sie will nicht lesen' },
      { known: 'I am going to read', target: 'ich werde lesen' },
      { known: 'I like to read', target: 'ich mag lesen' },
      { known: 'I need to read', target: 'ich muss lesen' },
      { known: 'to read more', target: 'mehr lesen' },
      { known: 'I want to read more in German', target: 'ich will mehr auf Deutsch lesen' },
      { known: "because she doesn't want to read when other people are here", target: 'weil sie nicht lesen will wenn andere Leute hier sind' },
      { known: 'I am looking forward to reading better as soon as I can', target: 'ich freue mich besser zu lesen sobald ich kann' }
    ]
  ));

  await postLego(A(35, 3, 'anything', 'irgendetwas',
    [
      { known: 'anything', target: 'irgendetwas' },
      { known: 'I want anything', target: 'ich will irgendetwas' },
      { known: "she doesn't want to read anything", target: 'sie will nichts lesen' },
      { known: "I don't want anything", target: 'ich will nichts' },
      { known: 'do you want anything', target: 'willst du irgendetwas' },
      { known: 'I need anything', target: 'ich brauche irgendetwas' },
      { known: 'did you want to show me anything', target: 'wolltest du mir irgendetwas zeigen' },
      { known: "she doesn't want to read anything this afternoon", target: 'sie will heute Nachmittag nichts lesen' },
      { known: "I don't want to say anything when other people are here", target: 'ich will nichts sagen wenn andere Leute hier sind' },
      { known: 'because I am looking forward to learning anything in German', target: 'weil ich mich freue irgendetwas auf Deutsch zu lernen' }
    ]
  ));

  await postLego(A(35, 4, 'this afternoon', 'heute Nachmittag',
    [
      { known: 'this afternoon', target: 'heute Nachmittag' },
      { known: 'I want to speak this afternoon', target: 'ich will heute Nachmittag sprechen' },
      { known: "she doesn't want to read anything this afternoon", target: 'sie will heute Nachmittag nichts lesen' },
      { known: 'I am going to meet you this afternoon', target: 'ich werde dich heute Nachmittag treffen' },
      { known: 'are you going to help me this afternoon', target: 'wirst du mir heute Nachmittag helfen' },
      { known: 'I wanted to ask you something this afternoon', target: 'ich wollte dich heute Nachmittag etwas fragen' },
      { known: 'because I am feeling better this afternoon', target: 'weil ich mich heute Nachmittag besser fühle' },
      { known: 'I am looking forward to learning German this afternoon', target: 'ich freue mich heute Nachmittag Deutsch zu lernen' },
      { known: "he doesn't want to be quiet this afternoon when other people are here", target: 'er will heute Nachmittag nicht still sein wenn andere Leute hier sind' },
      { known: 'I want to meet people who speak German this afternoon as soon as I can', target: 'ich will heute Nachmittag sobald ich kann Leute treffen die Deutsch sprechen' }
    ]
  ));

  console.log('\nDone building seeds 26-35');
}

buildSeeds().catch(console.error);
