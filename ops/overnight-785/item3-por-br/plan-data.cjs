'use strict';
// ITEM 3 of Kai's overnight run #785·AK (Kai's Y 23 Nov 11:02Z): por_br_for_eng held fixes (#423·AI, d/86cf198f, table
// d/4a804f2e) + the "fala isso" LEGOs (#842·AI, d/8389c0b1) + S0385L01U05. Built by cs #789·AK from the nightly QA copy
// ssi_copy_20261123t033000z (every row below read there); the live pre-check holds any seed that moved since.
// Seeds 49 and 72 are HELD for Kai (seed-text changes, L25 rung 2) — nothing here touches them.
//
// Where #423·AI's 38 items stand on the 23 Nov copy, and what this does:
//   ALREADY DONE since 17 Nov: family A (seeds 76/87/88/287/616/3/10/60 are now played: S0076L03U06, S0087L01U09, …);
//     S0419L03U01 English; S0450 (Kai's 19 Nov English-only ruling applied by #964/#976). Tiles (S0010L03, S0145L01
//     components, S0532L01) left alone under Kai's tiles rule.
//   F1 made-up LEGO English: 41 ("to feel a certain way" → "to feel", sense line in the intro, K23 vs S0026L02; bare B01
//     deleted), 284 ("female friend" → "friend", not new = S0136L04, K42/L17), 507 ("we then moved" → "we moved"; the stale
//     copy S0507L02U01 deleted — U10 already plays the seed), 314 ("to set it down" → "to put it"), 141 (seed one sentence;
//     LEGO "no problem | sem problema" added, as in por_for_eng), 79 ("started" → "you started | você começou", K26; the
//     ela/ele/it rows re-personed).
//     HELD (one-word answers in the report): 636/641/655/486/553/615L01 ("I myself think that" / "personally, I think" /
//     "I truly thought that" → "I think that"/"I thought that" collides with S0047L01 acho que / S0374L01 achei que on the
//     subject pronoun only: K19 is Kai's once-per-course call); 615L04/616L03 (em dizer / ao dizer needs a re-cut of
//     S0615L03-L04, which overlap if grown); 435 ("they were able" → "they could" collides with S0432L01 "they could |
//     eles podem", itself mis-glossed: re-gloss 432 first).
//   F2 wrong word: 7, 65, 69 (seed := the LEGO's words; 65/69 on the copy's clips), 232 (LEGO grows the se), 58
//     (percebe/nota → entende in seed, LEGO and both baskets), 70 (S0070L02 "tell me | era" → "it was"; S0070L03 → "where it
//     was | onde era" and its basket follows), 128 (re-cut: "you're like | você é como" + new "someone I used to know |
//     alguém que eu conhecia"; the 4 off-seed alguém rows deleted). 72 HELD (brief).
//   F3 English: 137 (stale copy U05 deleted; U06 plays the seed), 517, 433, 620, 331 (seed English := its own copy's English,
//     on that copy's known clip; the stale-English duplicate copy deleted), 122, 127.
//   F4 European Portuguese, every row read by hand: factos → fatos (31), ouviste → você ouviu (20), com quem trabalhas →
//     com quem você trabalha (12), que conheces → que você conhece (10), camisola → camisa (10; in BR camisola = nightgown),
//     demasiado ocupada → ocupada demais (7, = S0555L01's shape), à espera → esperando (6), entusiasmante → empolgante
//     (seed 132). Evidence: #423·AI (Gazeta do Povo / Migalhas fato; Living Language você; Superprof camisola; Infopedia
//     à espera; demais = everyday BR). Plus "ajuda a pessoa" (EP tu imperative) → "ajude".
//   F6 ZUT 194 vs 68: 194's ENGLISH → "what is it that you're looking for?" (the é que cleft keeps its own English, as
//     S0194L03U01/U02 already do) — the shortest fix, no structural change. S0247L02 intro gets a spoken sense line.
//   F7 S0195L01 "the (masculine)" → "the" (K42: the noun selects o/a; S0196L01 "the | a" is the same word, not a ZUT).
//   S0041L03 "to feel | me sentir" beside S0026L02 "to feel | sentir" is the K23 case: kept, with the sense line in its intro. Singles: 295 (LEGO grows to "I didn't say | eu não disse", basket to the
//     negative), 145 (the whole S0145L01 basket had "não mais estou" word order → "não estou mais"; U05 := the seed),
//     215 Saturday.
//   fala isso (#842·AI): "speak it" is fala / falam with the object left unsaid, as Brazilian speech does (falar isso =
//     "say that"); S0647L02, S0662L01, their 18 rows and seeds 647/662. S0385L01U05 deleted (no LEGO in it, #842 A/B).
const D = { course: 'por_br_for_eng', job: 'cs #789·AK item 3', seeds: {}, legos: {}, legoInsert: [], legoDelete: [], rep: {}, repEn: {}, phrases: {}, phraseInsert: [], items: [] };
D.intro = (known) => `The Portuguese for: '${known}', is: <break time="300ms"/> <break time="10ms"/>`;
const sense = (known, as) => `The Portuguese for: '${known}', as in — '${as}', is: <break time="300ms"/> <break time="10ms"/>`;
D.approval = 'kai:2026-11-23:por_br_for_eng held fixes + fala isso LEGOs (item 3 of the overnight run, Kai Y 23 Nov 11:02Z)';
D.purpose = 'por_br_for_eng held fixes (#423·AI) + fala isso LEGOs (#842·AI), Kai overnight run #785·AK item 3, cs #789·AK';
const item = (n, label) => D.items.push({ n, label });
const ph = (o) => Object.assign(D.phrases, o);
const ins = (lego, role, known, target) => D.phraseInsert.push({ lego, role, known, target });
D.seedClips = []; D.rowClips = []; D.preset = [];

// ───── fala isso ─────
item('fala isso', 'S0647L02 / S0662L01 speak it = fala / falam (object unsaid); seeds 647/662; 18 rows');
D.seeds[647] = { target_text: 'a senhora fala' };
D.legos.S0647L02 = { target_text: 'fala', type: 'A', comps: [] };
D.rep.S0647L02 = [['fala isso', 'fala']];
D.seeds[662] = { target_text: 'vocês falam' };
D.legos.S0662L01 = { target_text: 'vocês falam', comps: [['you all', 'vocês'], ['speak it', 'falam']] };
D.rep.S0662L01 = [['falam isso', 'falam']];
item(385, 'S0385L01U05 deleted (does not contain você concordou)');
ph({ S0385L01U05: null });

// ───── F1 ─────
item(41, 'S0041L03 to feel (sense-line intro); bare B01 deleted');
D.legos.S0041L03 = { known_text: 'to feel', comps: [['myself', 'me'], ['to feel', 'sentir']], intro: sense('to feel', "I'm starting to feel tired") };
ph({ S0041L03B01: null });
item(284, 'S0284L02 friend, not new (= S0136L04)');
D.legos.S0284L02 = { known_text: 'friend', is_new: false };
item(507, 'S0507L01 we moved; stale copy S0507L02U01 deleted');
D.legos.S0507L01 = { known_text: 'we moved' };
ph({ S0507L01B01: ['we moved', 'nos mudamos'], S0507L02U01: null });
item(314, 'S0314L01 to put it');
D.legos.S0314L01 = { known_text: 'to put it', comps: [['to put', 'pôr'], ['it', 'isso']] };
D.repEn.S0314L01 = [['set it down', 'put it']];
item(141, 'seed one sentence; LEGO S0141L02 no problem | sem problema with the seed; S0141L01B03 "without problem" deleted');
D.seeds[141] = { known_text: 'no problem, everything is okay', target_text: 'sem problema, está tudo bem' };
D.legoInsert.push({ seed: 141, index: 2, known_text: 'no problem', target_text: 'sem problema', type: 'M', comps: [['without', 'sem'], ['problem', 'problema']] });
ins('S0141L02', 'build', 'no problem', 'sem problema');
ins('S0141L02', 'use', 'no problem, everything is okay', 'sem problema, está tudo bem');
ph({ S0141L01B03: null });
item(79, 'S0079L01 you started | você começou; ela/ele/it rows re-personed');
D.legos.S0079L01 = { known_text: 'you started', target_text: 'você começou', type: 'M', comps: [['you', 'você'], ['started', 'começou']] };
ph({
  S0079L01B01: null,
  S0079L01U04: ['you started to learn yesterday', 'você começou a aprender ontem'],
  S0079L01U05: ['you started to speak Portuguese quickly', 'você começou a falar português rapidamente'],
  S0079L01U06: null,
  S0079L01U07: ['you started yesterday and it\'s not easy', 'você começou ontem e não é fácil'],
  S0079L01U08: ['you started to write a letter last week', 'você começou a escrever uma carta na semana passada'],
  S0079L01U09: ['you started to do something interesting', 'você começou a fazer algo interessante'],
  S0079L01U10: ['you started well but now it\'s difficult', 'você começou bem mas agora é difícil'],
});

// ───── F2 ─────
item(7, 'seed := o máximo que puder; copy S0007L03U06 := seed');
D.seeds[7] = { target_text: 'eu quero tentar o máximo que puder hoje' };
D.legos.S0007L02 = { comps: [['as much as', 'o máximo'], ['I can', 'que puder']] };
ph({ S0007L03U06: ['I want to try as hard as I can today', 'eu quero tentar o máximo que puder hoje'] });
item(65, 'seed := dedicar tempo para se testar (copy B03 clips); S0069L04U04 the same');
D.seeds[65] = { target_text: 'é importante dedicar tempo para se testar' };
D.rowClips.push('S0065L03B03');
D.legos.S0065L03 = { comps: [['to', 'para'], ['yourself', 'se'], ['test', 'testar']] };
ph({ S0069L04U04: ['it\'s difficult to take time to test yourself all afternoon', 'é difícil dedicar tempo para se testar a tarde toda'] });
item(69, 'seed := cachorro jovem (copy S0069L04U05 clips)');
D.seeds[69] = { target_text: 'ele não queria tomar conta do cachorro jovem a tarde toda' };
D.rowClips.push('S0069L04U05');
D.legos.S0069L03 = { comps: [['dog', 'cachorro'], ['young', 'jovem']] };
item(232, 'S0232L02 who can remember | que consegue se lembrar');
D.legos.S0232L02 = { target_text: 'que consegue se lembrar', comps: [['who can', 'que consegue'], ['remember', 'se lembrar']] };
D.rep.S0232L02 = [['que consegue lembrar', 'que consegue se lembrar']];
ph({ S0232L02U01: ['I know an old woman who can remember the answer', 'eu conheço uma senhora idosa que consegue se lembrar da resposta'] }); // = the seed, on its clips
D.seedClips.push(232);
item(58, 'percebe / nota → entende (BR perceber = notice); seed, S0058L02, S0058L03 rows');
D.seeds[58] = { target_text: 'é interessante quando você entende palavras suficientes' };
D.legos.S0058L02 = { known_text: 'when you understand', target_text: 'quando você entende', comps: [['when', 'quando'], ['you understand', 'você entende']] };
D.rep.S0058L02 = [['você nota', 'você entende']];
D.repEn.S0058L02 = [['you notice', 'you understand']];
D.rep.S0058L03 = [['você percebe', 'você entende']];
D.repEn.S0058L03 = [['you notice', 'you understand']];
item(70, 'S0070L02 it was | era; S0070L03 where it was | onde era, basket follows');
D.legos.S0070L02 = { known_text: 'it was' };
D.legos.S0070L03 = { target_text: 'onde era', comps: [['where', 'onde'], ['it was', 'era']] };
ph({
  S0070L03B01: ['where it was', 'onde era'],
  S0070L03B02: ['she wanted to tell me where it was', 'ela queria me dizer onde era'],
  S0070L03B03: ['where was it?', 'onde era?'],
  S0070L03U02: ['I don\'t know where it was', 'não sei onde era'],
  S0070L03U03: ['she wanted to know where it was', 'ela queria saber onde era'],
  S0070L03U04: ['do you know where it was?', 'você sabe onde era?'],
  S0070L03U05: null,
  S0070L03U06: ['I think I know where it was', 'acho que sei onde era'],
});
item(128, 're-cut: S0128L01 you\'re like | você é como + new S0128L02 someone I used to know | alguém que eu conhecia');
D.legos.S0128L01 = { known_text: 'you\'re like', target_text: 'você é como', type: 'M', comps: [['you are', 'você é'], ['like', 'como']] };
ph({ S0128L01U01: null, S0128L01U02: null, S0128L01U03: null, S0128L01U04: null });
ins('S0128L01', 'build', 'you\'re like', 'você é como');
ins('S0128L01', 'build', 'you\'re like me', 'você é como eu');
ins('S0128L01', 'use', 'you\'re like him', 'você é como ele');
ins('S0128L01', 'use', 'I think you\'re like me', 'acho que você é como eu');
D.legoInsert.push({ seed: 128, index: 2, known_text: 'someone I used to know', target_text: 'alguém que eu conhecia', type: 'M', comps: [['someone', 'alguém'], ['that', 'que'], ['I used to know', 'eu conhecia']] });
ins('S0128L02', 'build', 'someone I used to know', 'alguém que eu conhecia');
ins('S0128L02', 'use', 'you\'re like someone I used to know', 'você é como alguém que eu conhecia');
ins('S0128L02', 'use', 'she\'s like someone I used to know', 'ela é como alguém que eu conhecia');
D.seedClips.push(128);

// ───── F3 English ─────
item(137, 'stale copy S0137L03U05 deleted (U06 plays the seed)');
ph({ S0137L03U05: null });
item(517, 'seed English := but they left together (S0517L01B01 clip)');
D.seeds[517] = { known_text: 'but they left together' };
D.rowClips.push('S0517L01B01');
item(433, 'seed English := …was starting (S0433L04U01 clips); stale copy S0433L03U06 deleted');
D.seeds[433] = { known_text: 'they couldn\'t find out when the film was starting' };
D.rowClips.push('S0433L04U01'); ph({ S0433L03U06: null });
item(620, 'seed English := …since the last time we saw each other (S0620L04U01); stale copy S0620L02U06 deleted');
D.seeds[620] = { known_text: 'it\'s a very long time since the last time we saw each other' };
D.rowClips.push('S0620L04U01'); ph({ S0620L02U06: null });
item(331, 'seed English := she can\'t give all the answers (S0331L02B03); stale copy S0331L02U06 deleted');
D.seeds[331] = { known_text: 'she can\'t give all the answers' };
D.rowClips.push('S0331L02B03'); ph({ S0331L02U06: null });
item(122, 'seed English := …excited about the progress (S0122L04U04); stale copy S0122L03U07 deleted');
D.seeds[122] = { known_text: 'it\'s starting to feel easier and I\'m excited about the progress' };
D.rowClips.push('S0122L04U04'); ph({ S0122L03U07: null });
item(127, 'seed English := that wasn\'t why I wanted to see you; LEGO that was why; seed played under S0127L02');
D.seeds[127] = { known_text: 'that wasn\'t why I wanted to see you' };
D.legos.S0127L01 = { known_text: 'that was why' };
ph({ S0127L01B01: ['that was why', 'foi por isso que'] });
ins('S0127L02', 'use', 'that wasn\'t why I wanted to see you', 'não foi por isso que eu queria te ver');
D.seedClips.push(127);

// ───── F4 European Portuguese ─────
item('factos', 'factos → fatos (31 rows)');
D.seeds[311] = { target_text: 'ele não conseguia acreditar nos três fatos mais importantes' };
D.legos.S0311L03 = { target_text: 'três fatos', comps: [['three', 'três'], ['facts', 'fatos']] };
D.rep.S0311L03 = [['factos', 'fatos']]; D.rep.S0311L04 = [['factos', 'fatos']]; D.rep.S0313L01 = [['factos', 'fatos']];
ph({
  S0318L01U05: ['this time she couldn\'t believe in five facts', 'desta vez ela não podia acreditar nos cinco fatos'],
  S0320L02U05: ['he doesn\'t need to believe in five facts', 'ele não precisa acreditar nos cinco fatos'],
  S0325L01U04: ['I know ten facts', 'eu conheço dez fatos'],
  S0369L01B02: ['several facts', 'vários fatos'],
  S0369L01U01: ['I know several facts', 'eu conheço vários fatos'],
  S0369L01U04: ['did you hear about several facts?', 'você ouviu sobre vários fatos?'],
  S0369L01U05: ['I heard about several facts', 'eu ouvi sobre vários fatos'],
});
item('ouviste', 'ouviste → você ouviu (20 rows; S0366L01 you heard | você ouviu)');
D.seeds[366] = { target_text: 'você ouviu o que ele queria cultivar?' };
D.legos.S0366L01 = { target_text: 'você ouviu', type: 'M', comps: [['you', 'você'], ['heard', 'ouviu']] };
D.rep.S0366L01 = [['ouviste', 'você ouviu']];
ph({
  S0366L01B02: ['did you hear that?', 'você ouviu isso?'],
  S0366L02U01: ['did you hear what he wanted to grow?', 'você ouviu o que ele queria cultivar?'],
  S0366L02U03: ['did you hear what she was going to grow?', 'você ouviu o que ela ia cultivar?'],
  S0369L02U02: ['did you hear about several horses?', 'você ouviu sobre vários cavalos?'],
  S0369L03U03: ['did you hear about the road?', 'você ouviu sobre a estrada?'],
  S0371L02U03: ['did you hear what happened on Wednesday?', 'você ouviu o que aconteceu na quarta-feira?'],
  S0372L01U03: ['did you hear what she was trying to create?', 'você ouviu o que ela estava tentando criar?'],
  S0373L01U05: ['did you hear that it was beautiful?', 'você ouviu que era bonito?'],
  S0377L02U05: ['did you hear what happened last year?', 'você ouviu o que aconteceu no ano passado?'],
  S0407L01U05: ['did you hear a good example?', 'você ouviu um bom exemplo?'],
});
item('trabalhas', 'com quem trabalhas → com quem você trabalha (12 rows); ajuda → ajude');
D.seeds[388] = { target_text: 'aquela pessoa com quem você trabalha' };
D.legos.S0388L02 = { target_text: 'com quem você trabalha', comps: [['with whom', 'com quem'], ['you work', 'você trabalha']] };
D.rep.S0388L02 = [['com quem trabalhas', 'com quem você trabalha'], ['ajuda a pessoa', 'ajude a pessoa']];
ph({ S0388L02U05: ['I want to meet the person you work with', 'quero conhecer a pessoa com quem você trabalha'] });
item('conheces', 'que conheces → que você conhece (10 rows)');
D.seeds[355] = { target_text: 'ela precisava falar com aquela mulher que você conhece?' };
D.legos.S0355L01 = { target_text: 'que você conhece', comps: [['that', 'que'], ['you know', 'você conhece']] };
D.rep.S0355L01 = [['que conheces', 'que você conhece']];
item('camisola', 'camisola → camisa (10 rows)');
D.seeds[393] = { target_text: 'aquele rapaz com a camisa verde' };
D.legos.S0393L02 = { target_text: 'a camisa verde', comps: [['the shirt', 'a camisa'], ['green', 'verde']] };
D.rep.S0393L02 = [['camisola', 'camisa']];
item('demasiado', 'demasiado ocupada → ocupada demais (7 rows)');
D.seeds[246] = { target_text: 'eu queria que ela te ajudasse mas ela estava ocupada demais' };
D.legos.S0246L03 = { target_text: 'ela estava ocupada demais', comps: [['she was', 'ela estava'], ['busy', 'ocupada'], ['too', 'demais']] };
D.rep.S0246L03 = [['demasiado ocupada', 'ocupada demais']];
item('à espera', 'à espera → esperando (6 rows)');
D.seeds[112] = { target_text: 'isso foi muito interessante, e eu não estava esperando' };
D.legos.S0112L02 = { comps: [['expecting', 'esperando']] };
D.rep.S0112L02 = [['à espera de ', 'esperando '], ['à espera', 'esperando']];
ph({ S0112L01U09: ['that was very interesting, and I wasn\'t expecting it', 'isso foi muito interessante, e eu não estava esperando'] });
item(132, 'seed entusiasmante → empolgante (S0132L03U04 clips)');
D.seeds[132] = { target_text: 'isso é menos empolgante do que o que ela estava dizendo' };
D.rowClips.push('S0132L03U04');

// ───── F6 / F7 / singles ─────
item(194, 'seed 194 English → what is it that you\'re looking for? (é que keeps its own English)');
D.seeds[194] = { known_text: 'what is it that you\'re looking for?' };
item(247, 'S0247L02 intro sense line (no spoken bracket)');
D.legos.S0247L02 = { intro: sense('that book', 'the one over there') };
item(195, 'S0195L01 the (masculine) → the (K42)');
D.legos.S0195L01 = { known_text: 'the' };
item(295, 'S0295L01 I didn\'t say | eu não disse; basket to the negative');
D.legos.S0295L01 = { known_text: 'I didn\'t say', target_text: 'eu não disse', type: 'M', comps: [['I', 'eu'], ['didn\'t', 'não'], ['say', 'disse']] };
ph({
  S0295L01B01: ['I didn\'t say', 'eu não disse'],
  S0295L01B02: ['I didn\'t say that', 'eu não disse isso'],
  S0295L01B03: ['I didn\'t say more', 'eu não disse mais'],
  S0295L01U01: ['I didn\'t say no', 'eu não disse não'],
  S0295L01U02: ['I didn\'t say yes', 'eu não disse sim'],
  S0295L01U03: ['I didn\'t say I can come', 'eu não disse que posso vir'],
  S0295L01U04: ['I didn\'t say I want to', 'eu não disse que quero'],
  S0295L01U05: ['I didn\'t say I don\'t know', 'eu não disse que não sei'],
});
item(145, 'S0145L01 basket word order não … mais (não estou mais); U05 := the seed');
ph({
  S0145L01B02: ['you are not any more', 'não está mais'],
  S0145L01B03: ['I am not happy any more', 'não estou mais contente'],
  S0145L01B04: ['I am not grateful any more', 'não estou mais grato'],
  S0145L01B05: ['he is not kind any more', 'ele não é mais simpático'],
  S0145L01U01: ['I do not know this any more', 'não sei mais isso'],
  S0145L01U02: ['I am not thinking about that any more', 'não estou mais pensando nisso'],
  S0145L01U03: ['I think you are not trying any more', 'acho que você não está mais tentando'],
  S0145L01U04: ['I think he is not kind any more', 'acho que ele não é mais simpático'],
  S0145L01U05: ['why are you not happy any more?', 'Por que não está mais contente?'],
});
D.seedClips.push(145);
item(215, 'S0215L02 Saturday');
D.legos.S0215L02 = { known_text: 'Saturday' };

module.exports = D;
