'use strict';
// ITEM 5 of Kai's overnight run #785·AK (Kai's Y 23 Nov 11:02Z): por_for_eng held fixes from #426·AI (d/f1e11f9f, table
// d/8183b161). Built by cs #789·AK from the nightly QA copy ssi_copy_20261123t033000z; the live pre-check holds any seed that
// moved since. State on the copy vs #426·AI's 17 Nov read:
//   F1 64 drifted seed copies: all 64 still exactly as #426 read them → copy := seed text, on the SEED's own clips (0 chars),
//      except 341 (seed "há uns dias") and 352 ("não ia conseguir"): their copies say the LEGO's words ("há alguns dias",
//      "não conseguiria"), so the seed sentence would not contain its LEGO (P17) — those two copies stay; 62 rows go.
//   F2 390 / 403 / 358: seed := its played copy, on the copy's clips (0 chars). 315 / 384: seed + copy := the LEGO's wording
//      (render). 406: seed := "vai ficar bem" (the LEGO) + played as a USE row. 344: seed := "está contente em ajudar-te",
//      the early copy S0342L01U07 deleted, the seed played under S0344L01. S0111L01U06 := seed 79 (its clips), U05 := quando é que.
//   F3 450: OVERTAKEN — #964·AI/#976·AI applied Kai's 19 Nov "English-only" ruling to S0450 (the seed no longer says
//      "themselves", so seed and its English agree). S0450L01U05 is already gone. Not touched.
//   F4 379: LEGO grows to "I was lucky enough to | tive a sorte de" (Infopédia: "it was my good fortune to → tive a sorte de");
//      the calque "tive sorte suficiente (para)" rewritten in every row; S0379L03U01 := the seed on its clips.
//   F5 141: seed one sentence (punctuation only, clips kept, canon A7). Its only LEGO is "without | sem", which the seed's
//      English never says (P17), so a LEGO "no problem | sem problema" (problema S0134L01) is added with the seed as its USE.
//      S0141L01B02 "without problem" (not English) is deleted. 82: KEPT as it is — Kai's own ita/spa/fra play the two-sentence
//      seed 82 as written (#421·AI's evidence), so deleting this copy would make por the odd one out.
//   F6 Thursday / Tuesday / Jane capitalised (clips kept: the words are the same).
//   F7 S0079L01 intro → "…'when', when you're asking a question, is:" (K23 sense line).
//   Found in passing and fixed (same family): S0379L01U04 person ("ela disse que tive" → "she said I was lucky enough…").
const D = { course: 'por_for_eng', job: 'cs #789·AK item 5', seeds: {}, legos: {}, legoInsert: [], legoDelete: [], rep: {}, repEn: {}, phrases: {}, phraseInsert: [], items: [] };
D.intro = (known) => `The Portuguese for: '${known}', is: <break time="300ms"/> <break time="10ms"/>`;
D.approval = 'kai:2026-11-23:por_for_eng held fixes (item 5 of the overnight run, Kai Y 23 Nov 11:02Z)';
D.purpose = 'por_for_eng held fixes (#426·AI plan), Kai overnight run #785·AK item 5, cs #789·AK';
const item = (n, label) => D.items.push({ n, label });
const ph = (o) => Object.assign(D.phrases, o);
const ins = (lego, role, known, target) => D.phraseInsert.push({ lego, role, known, target });

// F1 — the played copy is the exact seed sentence (P26), on the seed's own clips
item('F1', '64 seed copies := seed text (pro-drop / small-word drift), seed clips');
ph({
  S0001L05U04: ['I want to speak Portuguese with you now', 'eu quero falar português contigo agora'], // seed 1: was 'quero falar português contigo agora'
  S0008L02U01: ["I'm going to try to explain what I mean", 'eu vou tentar explicar o que quero dizer'], // seed 8: was 'vou tentar explicar o que quero dizer'
  S0009L02U04: ['I speak a little Portuguese now', 'eu falo um pouco de português agora'], // seed 9: was 'falo um pouco de português agora'
  S0012L04U01: ["I wouldn't like to guess what's going to happen tomorrow", 'eu não gostaria de adivinhar o que vai acontecer amanhã'], // seed 12: was 'não gostaria de adivinhar o que vai acontecer amanhã'
  S0013L02U01: ['you speak Portuguese very well', 'tu falas português muito bem'], // seed 13: was 'falas português muito bem'
  S0018L03U01: ["we want to meet at six o'clock this evening", 'nós queremos encontrar-nos às seis da tarde'], // seed 18: was 'queremos encontrar-nos às seis da tarde'
  S0020L03U01: ['you want to learn his name quickly', 'tu queres aprender o nome dele rapidamente'], // seed 20: was 'queres aprender o nome dele rapidamente'
  S0023L02U01: ["I'm going to start talking more soon", 'eu vou começar a falar mais em breve'], // seed 23: was 'vou começar a falar mais em breve'
  S0024L02U01: ["I'm not going to be able to remember easily", 'eu não vou conseguir lembrar-me facilmente'], // seed 24: was 'não vou conseguir lembrar-me facilmente'
  S0025L03U01: ['are you going to help me before I have to go?', 'tu vais ajudar-me antes de eu ter de ir?'], // seed 25: was 'vais ajudar-me antes de eu ter de ir?'
  S0026L02B02: ["I like feeling as if I'm nearly ready to go", 'eu gosto de sentir que estou quase pronto para ir'], // seed 26: was 'gosto de sentir que estou quase pronto para ir'
  S0026L02U01: ["I like feeling as if I'm nearly ready to go", 'eu gosto de sentir que estou quase pronto para ir'], // seed 26: was 'gosto de sentir que estou quase pronto para ir'
  S0027L02B02: ["I don't like taking too much time to answer", 'eu não gosto de demorar demasiado tempo a responder'], // seed 27: was 'não gosto de demorar demasiado tempo a responder'
  S0027L02U01: ["I don't like taking too much time to answer", 'eu não gosto de demorar demasiado tempo a responder'], // seed 27: was 'não gosto de demorar demasiado tempo a responder'
  S0030L03U01: ['I wanted to ask you something yesterday', 'eu queria perguntar-te algo ontem'], // seed 30: was 'queria perguntar-te algo ontem'
  S0031L02U01: ['you wanted to speak with me tonight', 'tu querias falar comigo esta noite'], // seed 31: was 'querias falar comigo esta noite'
  S0037L03B02: ['I started to think about it carefully last month', 'eu comecei a pensar nisso com cuidado no mês passado'], // seed 37: was 'comecei a pensar nisso com cuidado no mês passado'
  S0037L03U01: ['I started to think about it carefully last month', 'eu comecei a pensar nisso com cuidado no mês passado'], // seed 37: was 'comecei a pensar nisso com cuidado no mês passado'
  S0045L02U06: ["I don't need to know everything", 'eu não preciso de saber tudo'], // seed 45: was 'não preciso de saber tudo'
  S0048L01U05: ["I don't care about making mistakes", 'eu não me importo de cometer erros'], // seed 48: was 'não me importo de cometer erros'
  S0054L04U06: ['we wanted to give you a little more time', 'nós queríamos dar-te um pouco mais de tempo'], // seed 54: was 'queríamos dar-te um pouco mais de tempo'
  S0059L04U05: ['I know how to do what I need to do next week', 'eu sei como fazer o que preciso de fazer na próxima semana'], // seed 59: was 'sei como fazer o que preciso de fazer na próxima semana'
  S0060L04U05: ["I don't know how to say enough different words yet", 'eu ainda não sei como dizer palavras diferentes suficientes'], // seed 60: was 'ainda não sei como dizer palavras diferentes suficientes'
  S0125L02U07: ['I believe that your idea was very good', 'eu acredito que a tua ideia era muito boa'], // seed 125: was 'acredito que a tua ideia era muito boa'
  S0212L03U08: ['they wanted to ask for help', 'eles queriam pedir ajuda'], // seed 212: was 'queriam pedir ajuda'
  S0297L01B04: ["I don't know many people who speak Portuguese", 'eu não conheço muitas pessoas que falam português'], // seed 297: was 'não conheço muitas pessoas que falam português'
  S0303L01U03: ['I think that he wants to sit down', 'eu acho que ele quer sentar-se'], // seed 303: was 'acho que ele quer sentar-se'
  S0325L04U01: ['I think that he needs to consider ten possible problems', 'eu acho que ele precisa de considerar dez problemas possíveis'], // seed 325: was 'acho que ele precisa de considerar dez problemas possíveis'
  S0336L02U01: ["I don't think that she can open the door", 'eu não acho que ela consiga abrir a porta'], // seed 336: was 'não acho que ela consiga abrir a porta'
  S0342L01U01: ['I met someone who said something', 'eu conheci alguém que disse algo'], // seed 342: was 'conheci alguém que disse algo'
  S0364L04U01: ["I heard that he didn't like that place", 'eu ouvi dizer que ele não gostava daquele lugar'], // seed 364: was 'ouvi dizer que ele não gostava daquele lugar'
  S0365L01U01: ["I didn't hear what she said to him", 'eu não ouvi o que ela lhe disse'], // seed 365: was 'não ouvi o que ela lhe disse'
  S0371L02U01: ['I went to see a film on Wednesday', 'eu fui ver um filme na quarta-feira'], // seed 371: was 'fui ver um filme na quarta-feira'
  S0376L01U01: ["I didn't go anywhere last month", 'eu não fui a lado nenhum no mês passado'], // seed 376: was 'não fui a lado nenhum no mês passado'
  S0380L02U01: ['I asked what she wanted to include', 'eu perguntei o que ela queria incluir'], // seed 380: was 'perguntei o que ela queria incluir'
  S0381L01U01: ["I didn't ask if he wanted to follow us", 'eu não perguntei se ele queria seguir-nos'], // seed 381: was 'não perguntei se ele queria seguir-nos'
  S0395L02U01: ['we need to turn left at the next corner', 'nós precisamos de virar à esquerda na próxima esquina'], // seed 395: was 'precisamos de virar à esquerda na próxima esquina'
  S0411L03U01: ['we would like to reserve a table for four tonight', 'nós gostaríamos de reservar uma mesa para quatro esta noite'], // seed 411: was 'gostaríamos de reservar uma mesa para quatro esta noite'
  S0437L02U01: ['they wanted to raise as much as possible for charity', 'eles queriam angariar o máximo possível para caridade'], // seed 437: was 'queriam angariar o máximo possível para caridade'
  S0438L02U01: ["they didn't want to decide what he should do", 'eles não queriam decidir o que ele devia fazer'], // seed 438: was 'não queriam decidir o que ele devia fazer'
  S0439L01B01: ["they don't want to die", 'eles não querem morrer'], // seed 439: was 'não querem morrer'
  S0447L02U01: ['will they be able to drive us home after the meal?', 'eles vão conseguir levar-nos a casa depois da refeição?'], // seed 447: was 'vão conseguir levar-nos a casa depois da refeição?'
  S0449L02U01: ['they said that they were almost ready', 'eles disseram que estavam quase prontos'], // seed 449: was 'disseram que estavam quase prontos'
  S0451L01U01: ['they said what they wanted to do', 'eles disseram o que queriam fazer'], // seed 451: was 'disseram o que queriam fazer'
  S0452L01U01: ["they didn't say what they wanted to do", 'eles não disseram o que queriam fazer'], // seed 452: was 'não disseram o que queriam fazer'
  S0453L02U01: ['did they say who they saw last night?', 'eles disseram quem viram ontem à noite?'], // seed 453: was 'disseram quem viram ontem à noite?'
  S0455L03U01: ['we had to leave because the children were tired', 'nós tivemos de sair porque as crianças estavam cansadas'], // seed 455: was 'tivemos de sair porque as crianças estavam cansadas'
  S0460L03U01: ['I want to find a shop near the hotel', 'eu quero encontrar uma loja perto do hotel'], // seed 460: was 'quero encontrar uma loja perto do hotel'
  S0589L04U01: ["she told me she'd just seen the last bus", 'ela disse-me que tinha acabado de ver o último autocarro'], // seed 589: was 'disse-me que tinha acabado de ver o último autocarro'
  S0015L03U05: ['and I want you to speak Portuguese with me tomorrow', 'e eu quero que fales português comigo amanhã'], // seed 15: was 'e quero que fales português comigo amanhã'
  S0019L03B04: ["but I don't want to stop talking", 'mas eu não quero parar de falar'], // seed 19: was 'mas não quero parar de falar'
  S0019L03U01: ["but I don't want to stop talking", 'mas eu não quero parar de falar'], // seed 19: was 'mas não quero parar de falar'
  S0022L02U04: ['because I want to meet people who speak Portuguese', 'porque eu quero conhecer pessoas que falam português'], // seed 22: was 'porque quero conhecer pessoas que falam português'
  S0162L01U02: ['what do you think about that?', 'o que é que achas disso?'], // seed 162: was 'o que é que tu achas disso?'
  S0213L02U06: ["we don't know what they're trying to achieve", 'nós não sabemos o que eles estão a tentar alcançar'], // seed 213: was 'não sabemos o que estão a tentar alcançar'
  S0368L01U01: ['yes I heard that he wanted to grow tomatoes', 'sim, eu ouvi dizer que ele queria cultivar tomates'], // seed 368: was 'sim, ouvi dizer que ele queria cultivar tomates'
  S0374L01U01: ['yes I thought it was very beautiful', 'sim, eu achei que era muito bonito'], // seed 374: was 'sim, achei que era muito bonito'
  S0375L01U01: ["no I didn't know what she was doing", 'não, eu não sabia o que ela estava a fazer'], // seed 375: was 'não, não sabia o que ela estava a fazer'
  S0386L01U01: ['yes I agreed with her', 'sim, eu concordei com ela'], // seed 386: was 'sim, concordei com ela'
  S0327L01U01: ['do you think that she needs to offer another way?', 'achas que ela precisa de oferecer outra maneira?'], // seed 327: was 'achas que ela precisa de oferecer outra forma?'
  S0378L02U01: ["no I didn't have enough money for holidays", 'não, eu não tinha dinheiro suficiente para férias'], // seed 378: was 'não, não tinha dinheiro suficiente para as férias'
  S0477L02U02: ["he's been sick since the second day of the holidays", 'ele está doente desde o segundo dia das férias'], // seed 477: was 'ele está doente desde o segundo dia de férias'
});
D.seedClips = [1, 8, 9, 12, 13, 15, 18, 19, 20, 22, 23, 24, 25, 26, 27, 30, 31, 37, 45, 48, 54, 59, 60, 125, 162, 212, 213, 297, 303, 325, 327, 336, 342, 364, 365, 368, 371, 374, 375, 376, 378, 380, 381, 386, 395, 411, 437, 438, 439, 447, 449, 451, 452, 453, 455, 460, 477, 589, 79];

// F2 — seed and LEGO say the same thing two ways: the seed takes the LEGO's wording
item(390, 'seed := aquele que está parado perto da entrada (copy clips)');
D.seeds[390] = { target_text: 'aquele que está parado perto da entrada' };
item(403, 'seed := o máximo de tempo possível (copy clips)');
D.seeds[403] = { target_text: 'devíamos ficar calados o máximo de tempo possível' };
item(358, 'seed := a tua amiga … (the English says she; copy clips)');
D.seeds[358] = { target_text: 'a tua amiga disse que não conseguia chegar ao topo' };
D.rowClips = ['S0390L03U01', 'S0403L03U01', 'S0358L02U01'];
item(315, 'seed + copy := não conseguia pagar o carro');
D.seeds[315] = { target_text: 'eu acho que ele não conseguia pagar o carro que queria' };
ph({ S0315L01U01: ['I think that he couldn\'t afford the car that he wanted', 'eu acho que ele não conseguia pagar o carro que queria'] });
item(384, 'seed + copy := há um momento');
D.seeds[384] = { target_text: 'eu não conseguia concordar com o que ele disse há um momento' };
ph({ S0384L02U01: ['I couldn\'t agree with what he said a moment ago', 'eu não conseguia concordar com o que ele disse há um momento'] });
item(406, 'seed := vai ficar bem; played as a USE row');
D.seeds[406] = { target_text: 'não, tenho a certeza de que vai ficar bem' };
ins('S0406L01', 'use', 'no I\'m sure it will be okay', 'não, tenho a certeza de que vai ficar bem');
item(344, 'seed := está contente em ajudar-te; early copy S0342L01U07 deleted; played under S0344L01');
D.seeds[344] = { target_text: 'que disse que está contente em ajudar-te' };
ph({ S0342L01U07: null });
ins('S0344L01', 'use', 'who said that he\'s happy to help you', 'que disse que está contente em ajudar-te');
item('111', 'S0111L01U06 := seed 79 (quando é que, ZUT with seed 79); U05 := quando é que vais falar comigo?');
ph({
  S0111L01U06: ['when did you start to learn?', 'quando é que começaste a aprender?'],
  S0111L01U05: ['when are you going to talk to me?', 'quando é que vais falar comigo?'],
});

// F4 — the calque
item(379, 'LEGO → I was lucky enough to | tive a sorte de; calque rows rewritten; copy := seed');
D.legos.S0379L01 = { known_text: 'I was lucky enough to', target_text: 'tive a sorte de', comps: [['I was lucky', 'tive a sorte'], ['enough to', 'de']] };
ph({
  S0379L01B01: ['I was lucky enough to', 'tive a sorte de'],
  S0379L01B02: ['I was lucky enough to go', 'tive a sorte de ir'],
  S0379L01B03: ['I was lucky enough to go somewhere', 'tive a sorte de ir a algum lugar'],
  S0379L01U01: ['I was lucky enough to go somewhere last year', 'tive a sorte de ir a algum lugar no ano passado'],
  S0379L01U02: ['I think I was lucky enough to find a good place', 'acho que tive a sorte de encontrar um lugar bom'],
  S0379L01U03: null,
  S0379L01U04: ['she said I was lucky enough to be there', 'ela disse que tive a sorte de estar lá'],
  S0379L01U05: ['I was lucky enough to find a good place', 'tive a sorte de encontrar um lugar bom'],
  S0379L01U06: ['yes I was lucky enough to go', 'sim, tive a sorte de ir'],
  S0379L02B03: ['I was lucky enough to travel', 'tive a sorte de viajar'],
  S0379L02U06: ['I was lucky enough to travel last year', 'tive a sorte de viajar no ano passado'],
  S0379L03B03: ['I was lucky enough to travel to Africa', 'tive a sorte de viajar até África'],
  S0379L03U01: ['yes I was lucky enough to travel to Africa', 'sim, tive a sorte de viajar até África'],
});
D.seedClips.push(379);

// F5 — 141 one sentence, played under a LEGO its English says
item(141, 'seed one sentence (clips kept); new LEGO S0141L02 no problem | sem problema with the seed as USE; L01B02 deleted');
D.seeds[141] = { known_text: 'no problem, everything is okay', target_text: 'sem problema, está tudo bem' };
D.legoInsert.push({ seed: 141, index: 2, known_text: 'no problem', target_text: 'sem problema', type: 'M', comps: [['without', 'sem'], ['problem', 'problema']] });
ins('S0141L02', 'build', 'no problem', 'sem problema');
ins('S0141L02', 'use', 'no problem, everything is okay', 'sem problema, está tudo bem');
ph({ S0141L01B02: null });

// F6 — capitals (same words, clips kept)
item('F6', 'Thursday / Tuesday / Jane capitalised');
D.legos.S0404L01 = { known_text: 'Thursday' };
D.legos.S0428L01 = { known_text: 'Tuesday' };
ph({ S0428L01B01: ['Tuesday', 'terça-feira'] });
D.legos.S0635L02 = { known_text: 'Jane', target_text: 'Jane' };
ph({ S0635L02B01: ['Jane', 'Jane'], S0635L02B02: ['Jane\'s', 'da Jane'] });

// F7 — the intro reads its sense line aloud properly (K23)
item(79, 'S0079L01 intro → when, when you\'re asking a question');
D.legos.S0079L01 = { intro: 'The Portuguese for: \'when\', when you\'re asking a question, is: <break time="300ms"/> <break time="10ms"/>' };

module.exports = D;
