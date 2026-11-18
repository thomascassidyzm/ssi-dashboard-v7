'use strict';
// cs #440·AI — deu_for_eng held items, Kai's 17 Nov rulings (memory deu-held-rulings-17nov; #422·AI table d/29f966c2).
// The AUTHORED content of every change, block by block. build-ops.cjs turns it into Popty edit-batch ops.
// U(id, known, target)       update an existing phrase (null = side unchanged)
// N(seed, idx, kind, known, target, {seedClips}) insert a phrase (kind B|U|C)
// D(id)                      delete a phrase (clips are never deleted)
// L(legoId, set)             update a LEGO;  LI(row) insert a LEGO;  LD(legoId) delete a LEGO with its phrases
// S(seed, set)               update a seed
const U = (id, known, target) => ({ t: 'U', id, known, target });
const N = (seed, idx, kind, known, target, o = {}) => ({ t: 'N', seed, idx, kind, known, target, ...o });
const D = (id) => ({ t: 'D', id });
const L = (lego, set) => ({ t: 'L', lego, set });
const LI = (row) => ({ t: 'LI', row });
const LD = (lego) => ({ t: 'LD', lego });
const S = (seed, set) => ({ t: 'S', seed, set });
const SEEDROW = { seedClips: true }; // the seed's own sentence, linked to the seed's own clips (P26)

const blocks = {};

// ── BLOCK A: items 1–4 ─────────────────────────────────────────────
blocks.A = [
  // 1 · seed 339: schlecht → schwer verletzt; L02 "hurt himself quite badly" (6 syll.)
  S(339, { target_text: 'nein, ich denke, er hat sich ziemlich schwer verletzt' }),
  L('S0339L02', { known_text: 'hurt himself quite badly', target_text: 'sich ziemlich schwer verletzt',
    components: [{ known: 'himself', target: 'sich' }, { known: 'quite', target: 'ziemlich' }, { known: 'badly hurt', target: 'schwer verletzt' }] }),
  U('S0339L02C02', 'quite', 'ziemlich'),
  N(339, 2, 'C', 'badly hurt', 'schwer verletzt', { position: 3 }),
  U('S0339L02U01', "no I think he's hurt himself quite badly", 'nein, ich denke, er hat sich ziemlich schwer verletzt'),
  U('S0339L02U03', 'do you think he has hurt himself quite badly?', 'denkst du, dass er sich ziemlich schwer verletzt hat?'),
  U('S0339L02U05', 'I think it is important to know if he has hurt himself quite badly', 'ich denke, dass es wichtig ist zu wissen, ob er sich ziemlich schwer verletzt hat'),

  // 2 · seed 151: German → "das war nicht das, was ich mir erhofft hatte"; English unchanged; L03 passiert dropped;
  //     new closing chunk. "das," is kept in the chunk: it is the German for the "what" here, and without it the seed has a part no LEGO covers.
  S(151, { target_text: 'das war nicht das, was ich mir erhofft hatte' }),
  LD('S0151L03'),
  LI({ seed_number: 151, lego_index: 3, known_text: 'what I was hoping would happen', target_text: 'das, was ich mir erhofft hatte', type: 'A', is_new: true, status: 'draft', components: [] }),
  D('S0151L02U01'), // the seed row moves to the new last LEGO (it no longer contains "ich hatte gehofft")
  N(151, 3, 'B', 'what I was hoping would happen', 'das, was ich mir erhofft hatte'),
  N(151, 3, 'B', 'that was what I was hoping would happen', 'das war das, was ich mir erhofft hatte'),
  N(151, 3, 'U', "it wasn't what I was hoping would happen", 'es war nicht das, was ich mir erhofft hatte'),
  N(151, 3, 'U', "that wasn't what I was hoping would happen", 'das war nicht das, was ich mir erhofft hatte', SEEDROW),

  // 3 · seed 522: einigen wir uns darauf, dass … ; L05 "let's agree that" (8 syll., kept: see table)
  S(522, { target_text: 'einigen wir uns darauf, dass es dumm war, die Wahrheit zu sagen' }),
  L('S0522L05', { known_text: "let's agree that", target_text: 'einigen wir uns darauf, dass' }),
  U('S0522L05B01', "let's agree that", 'einigen wir uns darauf, dass'),
  U('S0522L05B02', null, 'sie haben sich geeinigt'),
  U('S0522L05B03', null, 'wir können uns einigen'),
  U('S0522L05U01', null, 'einigen wir uns darauf, dass es dumm war, die Wahrheit zu sagen'),
  U('S0522L05U02', null, 'einigen wir uns'),
  U('S0522L05U03', null, 'sie will, dass wir uns einigen'),
  U('S0522L05U04', null, 'können wir uns einigen?'),
  U('S0522L05U05', null, 'einigen wir uns darauf, dass es dumm war'),
  U('S0522L05U06', null, 'sie will sich einigen'),
  U('S0522L05U07', null, 'können wir uns darauf einigen, dass das dumm war?'),

  // 4 · seed 270: L01 "to be late" = zu spät kommen (option A); stand-in "it" FRAME "that I'm going to do it" (Kai's example)
  L('S0270L01', { known_text: 'to be late', target_text: 'zu spät kommen', type: 'A', components: [] }),
  D('S0270L01C01'), D('S0270L01C02'),
  U('S0270L01B01', 'to be late', 'zu spät kommen'),
  U('S0270L01B02', "I don't want to be late", 'ich will nicht zu spät kommen'),
  U('S0270L01B03', "I'm going to be late", 'ich werde zu spät kommen'),
  U('S0270L01B04', "he's going to be late", 'er wird zu spät kommen'),
  U('S0270L01U01', "you're going to be late", 'du wirst zu spät kommen'),
  U('S0270L01U03', "she doesn't want to be late", 'sie will nicht zu spät kommen'),
  U('S0270L01U04', "I think I'm going to be late", 'ich denke, ich werde zu spät kommen'),
  U('S0270L01U05', "we don't want to be late", 'wir wollen nicht zu spät kommen'),
  D('S0270L01U06'), D('S0270L01U07'), D('S0270L01U08'),
  LI({ seed_number: 270, lego_index: 2, known_text: "that I'm going to do it", target_text: 'dass ich es machen werde', type: 'M', is_new: true, status: 'draft',
    components: [{ known: 'that', target: 'dass' }, { known: "I'm going to", target: 'ich werde' }, { known: 'do it', target: 'es machen' }] }),
  N(270, 2, 'B', "that I'm going to do it", 'dass ich es machen werde'),
  N(270, 2, 'B', "I think that I'm going to do it", 'ich denke, dass ich es machen werde'),
  N(270, 2, 'B', "that I'm going to be late", 'dass ich zu spät kommen werde'),
  N(270, 2, 'U', "I know that I'm going to be late", 'ich weiß, dass ich zu spät kommen werde'),
  N(270, 2, 'U', "she knows that I'm going to try it", 'sie weiß, dass ich es versuchen werde'),
  N(270, 2, 'U', "because I'm worried that I'm going to be late", 'weil ich mir Sorgen mache, dass ich zu spät kommen werde', SEEDROW),
];

// ── BLOCK B: items 5–11 (ZUT) ──────────────────────────────────────
blocks.B = [
  // 5 · 634: L02 "one" + L03 "those" merge into "one of those" = eines von denen (man @56 untouched)
  LD('S0634L02'),
  L('S0634L03', { known_text: 'one of those', target_text: 'eines von denen', type: 'A', components: [] }),
  U('S0634L03B01', 'one of those', 'eines von denen'),
  D('S0634L03B03'), D('S0634L03U02'), D('S0634L03U04'), D('S0634L03U07'),
  N(634, 3, 'U', 'she also wanted one of those', 'sie wollte auch eines von denen'),
  N(634, 3, 'U', 'he said he has one of those', 'er hat gesagt, er hat eines von denen'),

  // 6 · 377: L02 "go anywhere" = irgendwohin gefahren (anywhere = irgendwo stays @182)
  L('S0377L02', { known_text: 'go anywhere', target_text: 'irgendwohin gefahren', type: 'A', components: [] }),
  U('S0377L02B01', 'go anywhere', 'irgendwohin gefahren'),
  U('S0377L02B02', 'did you go anywhere?', 'bist du irgendwohin gefahren?'),
  U('S0377L02B03', 'did you go anywhere last year?', 'bist du letztes Jahr irgendwohin gefahren?'),
  U('S0377L02U01', 'did she go anywhere?', 'ist sie irgendwohin gefahren?'),
  U('S0377L02U02', 'did he go anywhere last year?', 'ist er letztes Jahr irgendwohin gefahren?'),
  U('S0377L02U03', 'did they go anywhere last year?', 'sind sie letztes Jahr irgendwohin gefahren?'),
  D('S0377L02U04'), D('S0377L02U05'), D('S0377L02U06'),

  // 7 · 537: L02 "I was wrong" = ich hatte unrecht (wrong = falschen stays @535)
  L('S0537L02', { known_text: 'I was wrong', target_text: 'ich hatte unrecht' }),
  D('S0537L02B01'),

  // 8 · 564: L01 "your help" = deine Hilfe (your = dein stays @121/627)
  L('S0564L01', { known_text: 'your help', target_text: 'deine Hilfe', type: 'A', components: [] }),
  U('S0564L01B01', 'your help', 'deine Hilfe'),
  U('S0564L01B02', 'without your help', 'ohne deine Hilfe'),
  U('S0564L01B03', 'he wants your help', 'er will deine Hilfe'),
  U('S0564L01U01', 'I need your help', 'ich brauche deine Hilfe'),
  U('S0564L01U02', 'she wants your help now', 'sie will jetzt deine Hilfe'),
  U('S0564L01U03', 'she did it without your help', 'sie hat das ohne deine Hilfe gemacht'),
  U('S0564L01U04', 'she has your help', 'sie hat deine Hilfe'),
  U('S0564L01U05', 'I want your help', 'ich will deine Hilfe'),
  U('S0564L01U06', 'she wants your help here', 'sie will deine Hilfe hier'),
  U('S0564L01U07', "she doesn't want your help", 'sie will deine Hilfe nicht'),

  // 9 · 514: L01 "the perfect house" = das perfekte Haus (perfect = perfekt stays @137/429)
  L('S0514L01', { known_text: 'the perfect house', target_text: 'das perfekte Haus', type: 'A', components: [] }),
  U('S0514L01B01', 'the perfect house', 'das perfekte Haus'),
  U('S0514L01B02', 'that is the perfect house', 'das ist das perfekte Haus'),
  U('S0514L01B03', 'I want the perfect house', 'ich will das perfekte Haus'),
  U('S0514L01U01', 'do you want the perfect house?', 'willst du das perfekte Haus?'),
  U('S0514L01U02', 'he wants the perfect house', 'er will das perfekte Haus'),
  U('S0514L01U03', 'she has the perfect house', 'sie hat das perfekte Haus'),
  U('S0514L01U04', 'the perfect house is here', 'das perfekte Haus ist hier'),
  U('S0514L01U05', 'he has the perfect house', 'er hat das perfekte Haus'),
  D('S0514L01U06'), D('S0514L01U07'),

  // 10 · 499: L02 "maybe we should" = vielleicht sollten wir (we should = wir sollten stays @403)
  L('S0499L02', { known_text: 'maybe we should', target_text: 'vielleicht sollten wir',
    components: [{ known: 'maybe', target: 'vielleicht' }, { known: 'should', target: 'sollten' }, { known: 'we', target: 'wir' }] }),
  D('S0499L02B01'),

  // 11 · 478: L02 "such a kind heart" = so ein gutes Herz (such a = so eine stays @423)
  L('S0478L02', { known_text: 'such a kind heart', target_text: 'so ein gutes Herz',
    components: [{ known: 'such', target: 'so' }, { known: 'a', target: 'ein' }, { known: 'kind heart', target: 'gutes Herz' }] }),
  U('S0478L02B01', 'such a kind heart', 'so ein gutes Herz'),
  N(478, 2, 'U', 'he has such a kind heart', 'er hat so ein gutes Herz'),
  N(478, 2, 'U', 'I think she has such a kind heart', 'ich denke, sie hat so ein gutes Herz'),
];

// ── BLOCK C: items 12–21 (LEGO ≠ seed) ─────────────────────────────
blocks.C = [
  // 12 · 149: L01 "so I hope" = also hoffe ich; new L02 "that you'll finish soon" = dass du bald fertig wirst
  L('S0149L01', { known_text: 'so I hope', target_text: 'also hoffe ich', type: 'A', components: [] }),
  D('S0149L01C01'), D('S0149L01C02'),
  N(149, 1, 'B', 'so I hope', 'also hoffe ich', { position: 1 }),
  U('S0149L01B02', 'so I hope you understand', 'also hoffe ich, dass du verstehst'),
  U('S0149L01B03', 'so I hope you can help', 'also hoffe ich, dass du helfen kannst'),
  U('S0149L01B04', 'so I hope you know', 'also hoffe ich, dass du es weißt'),
  U('S0149L01U01', 'so I hope you can help me tomorrow', 'also hoffe ich, dass du mir morgen helfen kannst'),
  U('S0149L01U02', 'so I hope you know how important this is', 'also hoffe ich, dass du weißt, wie wichtig das ist'),
  D('S0149L01U03'), D('S0149L01U04'), D('S0149L01U06'), D('S0149L01U08'), D('S0149L01U09'),
  LI({ seed_number: 149, lego_index: 2, known_text: "that you'll finish soon", target_text: 'dass du bald fertig wirst', type: 'A', is_new: true, status: 'draft', components: [] }),
  N(149, 2, 'B', "that you'll finish soon", 'dass du bald fertig wirst'),
  N(149, 2, 'B', "I hope that you'll finish soon", 'ich hoffe, dass du bald fertig wirst'),
  N(149, 2, 'B', "so I hope that you'll finish soon", 'also hoffe ich, dass du bald fertig wirst'),
  N(149, 2, 'U', "I think that you'll finish soon", 'ich denke, dass du bald fertig wirst'),
  N(149, 2, 'U', "I know that you'll finish soon", 'ich weiß, dass du bald fertig wirst'),
  N(149, 2, 'U', "this isn't very difficult, so I hope you'll finish soon", 'das ist nicht sehr schwierig, also hoffe ich, dass du bald fertig wirst', SEEDROW),

  // 13 · 197: L01 "my son" = mein Sohn; L02 "as a teacher" = als Lehrer (third-person male subjects only: Lehrer would be Lehrerin in a woman's mouth)
  L('S0197L01', { known_text: 'my son', target_text: 'mein Sohn' }),
  U('S0197L01B01', 'My son will come tomorrow', 'Mein Sohn wird morgen kommen'),
  U('S0197L01B02', 'My son was here yesterday', 'Mein Sohn war gestern hier'),
  U('S0197L01B03', 'My son would like to help me', 'Mein Sohn möchte mir helfen'),
  U('S0197L01U04', 'I heard that my son will come on Saturday evening', 'Ich habe gehört, dass mein Sohn am Samstagabend kommen wird'),
  U('S0197L01U06', 'My son told me he needs money before tomorrow morning', 'Mein Sohn hat mir gesagt, er brauche Geld vor morgen früh'),
  U('S0197L01U07', 'I do not know if my son has heard about the problem', 'Ich weiß nicht, ob mein Sohn über das Problem gehört hat'),
  U('S0197L01U08', 'My son would like to read but he does not have time now', 'Mein Sohn möchte lesen, aber er hat jetzt keine Zeit'),
  L('S0197L02', { known_text: 'as a teacher', target_text: 'als Lehrer' }),
  U('S0197L02B01', 'as a teacher', 'als Lehrer'),
  U('S0197L02B02', 'he works as a teacher', 'er arbeitet als Lehrer'),
  U('S0197L02B03', 'my friend works as a teacher', 'mein Freund arbeitet als Lehrer'),
  U('S0197L02U01', 'he wants to work as a teacher', 'er will als Lehrer arbeiten'),
  U('S0197L02U02', 'my son would like to work as a teacher', 'mein Sohn möchte als Lehrer arbeiten'),
  U('S0197L02U03', 'does he work as a teacher?', 'arbeitet er als Lehrer?'),
  U('S0197L02U04', 'my son works as a teacher', 'mein Sohn arbeitet als Lehrer'), // the seed row
  D('S0197L02U06'), D('S0197L02U07'), D('S0197L02U08'), D('S0197L02U09'), D('S0197L02U10'),

  // 14 · 239: L01 "likes to read" = liest gern
  L('S0239L01', { known_text: 'likes to read', target_text: 'liest gern' }),
  N(239, 1, 'B', 'likes to read', 'liest gern', { position: 1 }),
  U('S0239L01B02', 'I think she likes to read', 'Ich denke, sie liest gern'),
  U('S0239L01B03', 'He likes to read at home', 'Er liest gern zu Hause'),
  U('S0239L01U01', 'My friend likes to read in the morning', 'Mein Freund liest gern am Morgen'),
  U('S0239L01U02', 'She likes to read in the evening when she is at home', 'Sie liest gern am Abend, wenn sie zu Hause ist'),
  D('S0239L01U05'), D('S0239L01U06'), D('S0239L01U07'),
  N(239, 1, 'U', 'my mother likes to read', 'meine Mutter liest gern', SEEDROW),

  // 15 · 195: L02 "left on the table" = auf dem Tisch gelassen (on the table = auf den Tisch stays @314)
  L('S0195L02', { known_text: 'left on the table', target_text: 'auf dem Tisch gelassen' }),
  U('S0195L02B01', 'left on the table', 'auf dem Tisch gelassen'),
  U('S0195L02B03', 'I left it on the table', 'ich habe es auf dem Tisch gelassen'),
  U('S0195L02U01', 'I left the money on the table', 'ich habe das Geld auf dem Tisch gelassen'),
  U('S0195L02U03', 'she left the book on the table', 'sie hat das Buch auf dem Tisch gelassen'),
  U('S0195L02U04', 'did you leave it on the table?', 'hast du es auf dem Tisch gelassen?'),
  U('S0195L02U06', 'he left something on the table', 'er hat etwas auf dem Tisch gelassen'),
  U('S0195L02U08', 'I left the money here on the table for you', 'ich habe das Geld hier auf dem Tisch für dich gelassen'),
  D('S0195L02U07'),

  // 16 · 231: S0231L01 "an old man" grows to "I know an old man" (8 syll., kept: see table) — item 21's 264 clash.
  //     L02 "who wanted to ask for help" is CUT (Kai 13:07Z) into a stand-in "it" frame + its middle:
  //     L02 "who wanted to do it" = der es machen wollte (6) and new L03 "to ask for help" = um Hilfe bitten (4).
  L('S0231L01', { known_text: 'I know an old man', target_text: 'ich kenne einen alten Mann', type: 'A', components: [] }),
  D('S0231L01B01'),
  L('S0231L02', { known_text: 'who wanted to do it', target_text: 'der es machen wollte',
    components: [{ known: 'who', target: 'der' }, { known: 'wanted to do it', target: 'es machen wollte' }] }),
  U('S0231L02B01', 'who wanted to do it', 'der es machen wollte'),
  U('S0231L02B02', 'the man who wanted to do it', 'der Mann, der es machen wollte'),
  U('S0231L02B03', 'someone who wanted to try it', 'jemand, der es versuchen wollte'),
  U('S0231L02B04', 'the man who wanted to help', 'der Mann, der helfen wollte'),
  D('S0231L02B06'), D('S0231L02B07'), D('S0231L02U02'), D('S0231L02U03'), D('S0231L02U04'), D('S0231L02U05'),
  N(231, 2, 'U', 'I know an old man who wanted to do it', 'ich kenne einen alten Mann, der es machen wollte'),
  LI({ seed_number: 231, lego_index: 3, known_text: 'to ask for help', target_text: 'um Hilfe bitten', type: 'A', is_new: true, status: 'draft', components: [] }),
  N(231, 3, 'B', 'to ask for help', 'um Hilfe bitten'),
  N(231, 3, 'B', 'I want to ask for help', 'ich will um Hilfe bitten'),
  N(231, 3, 'B', 'who wanted to ask for help', 'der um Hilfe bitten wollte'),
  N(231, 3, 'U', 'the man who wanted to ask for help', 'der Mann, der um Hilfe bitten wollte'),
  N(231, 3, 'U', 'can I ask for help?', 'kann ich um Hilfe bitten?'),
  D('S0231L01U07'), // the seed row moves to the last LEGO
  N(231, 3, 'U', 'I know an old man who wanted to ask for help', 'Ich kenne einen alten Mann, der um Hilfe bitten wollte', SEEDROW),

  // 17 · 307: L03 "who's sitting over there" = der da drüben sitzt (5 syll.; over there = drüben stays @258)
  L('S0307L03', { known_text: "who's sitting over there", target_text: 'der da drüben sitzt', type: 'A', components: [] }),
  D('S0307L03C01'), D('S0307L03C02'),
  U('S0307L03B01', "who's sitting over there", 'der da drüben sitzt'),
  U('S0307L03B02', "the man who's sitting over there", 'der Mann, der da drüben sitzt'),
  U('S0307L03B03', "I know the man who's sitting over there", 'ich kenne den Mann, der da drüben sitzt'),
  U('S0307L03U01', "do you know the man who's sitting over there?", 'kennst du den Mann, der da drüben sitzt?'),
  D('S0307L03U02'), D('S0307L03U03'), D('S0307L03U04'), D('S0307L03U05'), D('S0307L03U06'),
  D('S0307L02U07'), // the seed row moves to the last LEGO
  N(307, 3, 'U', "I know that young man who's sitting over there", 'Ich kenne diesen jungen Mann, der da drüben sitzt', SEEDROW),

  // 18 · 391: L01 English "towards the bus"; L02 "who is walking towards the bus" = die zum Bus geht (4 syll.)
  L('S0391L01', { known_text: 'towards the bus' }),
  U('S0391L01B01', 'towards the bus', null),
  L('S0391L02', { known_text: 'who is walking towards the bus', target_text: 'die zum Bus geht' }),
  U('S0391L02B01', 'who is walking towards the bus', 'die zum Bus geht'),
  U('S0391L02B02', 'the woman who is walking towards the bus', 'die Frau, die zum Bus geht'),
  U('S0391L02B03', 'I know the woman who is walking towards the bus', 'ich kenne die Frau, die zum Bus geht'),
  U('S0391L02U01', 'do you know the woman who is walking towards the bus?', 'kennst du die Frau, die zum Bus geht?'),
  D('S0391L02U02'), D('S0391L02U03'), D('S0391L02U04'), D('S0391L02U05'),
  N(391, 2, 'U', 'the one who is walking towards the bus', 'die Person, die zum Bus geht', SEEDROW),

  // 19 · 134: L03 "at something difficult" = an etwas Schwierigem (6 syll.)
  L('S0134L03', { known_text: 'at something difficult', target_text: 'an etwas Schwierigem' }),
  N(134, 3, 'B', 'at something difficult', 'an etwas Schwierigem', { position: 1 }),
  N(134, 3, 'B', 'to work at something difficult', 'an etwas Schwierigem arbeiten', { position: 2 }),
  N(134, 3, 'B', 'she works at something difficult', 'sie arbeitet an etwas Schwierigem', { position: 3 }),
  U('S0134L03U06', 'he is working at something difficult', 'er arbeitet an etwas Schwierigem'),
  U('S0134L03U07', 'we are working at something difficult', 'wir arbeiten an etwas Schwierigem'),
  U('S0134L03U08', 'I want to work at something difficult', 'ich will an etwas Schwierigem arbeiten'),
  U('S0134L03U09', "it's not a problem when you work at something difficult", 'es ist kein Problem, wenn man an etwas Schwierigem arbeitet'),
  D('S0134L02U12'), // the seed row moves to the last LEGO
  N(134, 3, 'U', "it's not a problem when you work at something difficult with them", 'es ist kein Problem, wenn man mit ihnen an etwas Schwierigem arbeitet', SEEDROW),

  // 20 · 50: L01 "to finish" = fertig zu werden; 278 and 200 carry their object (alles fertig machen) so "finish" keeps one answer
  L('S0050L01', { known_text: 'to finish', target_text: 'fertig zu werden' }),
  N(50, 1, 'B', 'to finish', 'fertig zu werden', { position: 1 }),
  U('S0050L01B02', "I'm trying to finish", 'ich versuche, fertig zu werden'),
  U('S0050L01B03', 'I want to finish', 'ich will fertig werden'),
  U('S0050L01U02', 'I want to finish quickly', 'ich will schnell fertig werden'),
  U('S0050L01U03', "I'm trying to finish quickly", 'ich versuche, schnell fertig zu werden'),
  D('S0050L01U04'), D('S0050L01U06'), D('S0050L01U08'),
  N(50, 1, 'U', "I'm not trying to finish as quickly as possible", 'Ich versuche nicht, so schnell wie möglich fertig zu werden', SEEDROW),
  L('S0200L02', { known_text: 'finish everything', target_text: 'alles fertig machen', type: 'A', components: [] }),
  D('S0200L02C01'), D('S0200L02C02'),
  U('S0200L02B01', 'finish everything', 'alles fertig machen'),
  U('S0200L02B02', "I'd like to finish everything", 'ich möchte alles fertig machen'),
  U('S0200L02B04', 'we need to finish everything', 'wir müssen alles fertig machen'),
  U('S0200L02B05', 'can you finish everything soon?', 'kannst du bald alles fertig machen?'),
  U('S0200L02B06', 'I will finish everything later', 'ich werde später alles fertig machen'),
  U('S0200L02U01', 'I need to finish everything before I can go home today', 'ich muss alles fertig machen, bevor ich heute nach Hause gehen kann'),
  U('S0200L02U03', 'She told me that she wanted to finish everything this week', 'Sie hat mir gesagt, dass sie diese Woche alles fertig machen wollte'),
  U('S0200L02U11', 'I think it is important that we can finish everything in a short time', 'Ich denke, es ist wichtig, dass wir alles in kurzer Zeit fertig machen können'),
  L('S0278L01', { known_text: 'to finish everything', target_text: 'alles fertig machen', type: 'A', components: [], is_new: false }),
  U('S0278L01B01', 'to finish everything', 'alles fertig machen'),
  U('S0278L01B02', 'I need to finish everything', 'ich muss alles fertig machen'),
  U('S0278L01B03', 'can you finish everything today?', 'kannst du heute alles fertig machen?'),
  U('S0278L01B04', "I'd like to finish everything", 'Ich möchte alles fertig machen'),
  D('S0278L01B06'), D('S0278L01U11'),
  U('S0278L01U03', 'I need to finish everything today because I have a meeting early tomorrow morning', 'Ich muss heute alles fertig machen, weil ich morgen früh ein Treffen habe'),
  U('S0278L01U10', 'She tells me she would like to finish everything this week', 'Sie sagt mir, sie möchte diese Woche alles fertig machen'),
  U('S0278L01U12', 'We need to finish everything today if we can', 'Wir müssen heute alles fertig machen, wenn wir können'),

  // 21 · 211: L01 "test" → "that they didn't want to explain" = dass sie nicht erklären wollten (8 syll., kept: see table)
  L('S0211L01', { known_text: "that they didn't want to explain", target_text: 'dass sie nicht erklären wollten' }),
  U('S0211L01B01', "that they didn't want to explain", 'dass sie nicht erklären wollten'),
  U('S0211L01B02', "they said that they didn't want to explain", 'sie haben gesagt, dass sie nicht erklären wollten'),
  U('S0211L01B03', "I know that they didn't want to explain", 'ich weiß, dass sie nicht erklären wollten'),
  U('S0211L01U02', "I think that they didn't want to explain", 'ich denke, dass sie nicht erklären wollten'),
  U('S0211L01U03', "she told me that they didn't want to explain", 'sie hat mir gesagt, dass sie nicht erklären wollten'),
  U('S0211L01U04', "they told us that they didn't want to explain", 'Sie haben uns gesagt, dass sie nicht erklären wollten'), // the seed row
  U('S0211L01U06', "it's not a problem that they didn't want to explain", 'es ist kein Problem, dass sie nicht erklären wollten'),
  D('S0211L01U07'), D('S0211L01U08'),
  // the 10 later rows that leaned on "Test": a taught noun instead (Arbeit @126, Buch @194), or the test dropped
  U('S0242L02U11', 'My brother told me he will need more time for the work', 'Mein Bruder hat mir gesagt, er wird mehr Zeit für die Arbeit brauchen'),
  U('S0246L01U02', 'I wanted her to help you but she was too busy talking to the teacher about the work', 'Ich wollte, dass sie dir hilft, aber sie war zu beschäftigt damit, mit dem Lehrer über die Arbeit zu reden'),
  U('S0246L01U10', 'I wanted her to help you but she was too busy making sure that everything was ready for the work', 'Ich wollte, dass sie dir hilft, aber sie war zu beschäftigt damit, dass alles für die Arbeit bereit war'),
  U('S0258L01U06', 'When I was over there yesterday I heard them talking about the work they have to do', 'Als ich gestern drüben war, habe ich sie über die Arbeit reden hören, die sie machen müssen'),
  U('S0260L01U08', 'There is not the faintest chance that I will be ready before tomorrow morning', 'Es gibt nicht die geringste Gelegenheit, dass ich vor morgen früh bereit bin'),
  U('S0269L01U11', 'I will wait for the answer from my teacher about the book', 'Ich werde auf die Antwort von meinem Lehrer über das Buch warten'),
  U('S0284L02U09', "I need to ask my sister's friend about the work", 'Ich muss den Freund meiner Schwester über die Arbeit fragen'),
  U('S0291L01U06', "I hope this work is not going to be too difficult because I haven't had time to learn", 'Ich hoffe, diese Arbeit wird nicht zu schwierig sein, weil ich keine Zeit hatte zu lernen'),
  U('S0291L02U04', 'I hope I will be able to find the answer to this question before tomorrow', 'Ich hoffe, ich kann die Antwort auf diese Frage vor morgen finden'),
  U('S0292L01U08', 'I hope you will be able to finish the work on time because it is very important for your work', 'Ich hoffe, du kannst die Arbeit rechtzeitig fertig machen, weil es sehr wichtig für deine Arbeit ist'),
];

// ── BLOCK D: English tidies, seed rows 322/276, 453 option B, 264 ──
blocks.D = [
  // 158 let us talk → let's talk
  L('S0158L01', { known_text: "let's talk", components: [{ known: "let's", target: 'lass uns' }, { known: 'talk', target: 'reden' }] }),
  U('S0158L01C01', "let's", null),
  U('S0158L01B01', "let's talk", null),
  U('S0158L01B02', "let's talk later", null),
  U('S0158L01B04', "let's talk tomorrow", null),
  U('S0158L01U03', "If you have time later let's talk about the new work", null),
  U('S0158L01U05', "There are some things we need to talk about so let's talk soon", null),
  U('S0158L01U06', "I think something is not good so let's talk and make it better", null),
  U('S0158L01U08', "Being nervous is not good so let's talk tomorrow morning", null),
  N(158, 1, 'U', "let's talk about something else", 'lass uns über etwas anderes reden', SEEDROW),
  // 301 he has said that → he said that
  L('S0301L01', { known_text: 'he said that', components: [{ known: 'he', target: 'er' }, { known: 'has said', target: 'hat gesagt' }] }),
  U('S0301L01C02', 'has said', null),
  U('S0301L01B01', 'he said that', null),
  U('S0301L01B02', 'he said that he wants', null),
  U('S0301L01B03', "he said that he doesn't know", null),
  U('S0301L01U01', 'he said that he wants to speak German', null),
  U('S0301L01U02', "he said that he isn't ready", null),
  U('S0301L01U03', 'he said that he wants to go', null),
  U('S0301L01U04', 'he said that he wants to help', null),
  U('S0301L01U05', "he said that he doesn't want to go", null),
  U('S0301L01U06', "he said that he's nearly ready", null),
  N(301, 1, 'U', 'he said that he wants to show you something', 'er hat gesagt, dass er dir etwas zeigen will', SEEDROW),
  // 130 because he is my friend → because he's my friend
  L('S0130L02', { known_text: "because he's my friend" }),
  U('S0130L02B01', "because he's my friend", null),
  N(130, 2, 'U', "that was a surprise, because he's my friend", 'das war eine Überraschung, weil er mein Freund ist', SEEDROW),
  // 165 I'm / it's
  L('S0165L01', { known_text: "but I'm not sure" }),
  U('S0165L01B01', "but I'm not sure", null),
  L('S0165L02', { known_text: "if it's true" }),
  U('S0165L02B01', "if it's true", null),
  N(165, 2, 'U', "but I'm not sure if it's true", 'aber ich bin mir nicht sicher, ob es wahr ist', SEEDROW),
  // lowercase why in six seed English texts (clips unchanged)
  S(21, { known_text: 'why are you learning her name?' }),
  S(67, { known_text: 'why do you want to stop?' }),
  S(113, { known_text: "why can't I remember what you said?" }),
  S(145, { known_text: 'why are you not happy any more?' }),
  S(269, { known_text: "why don't you want to wait for your father?" }),
  S(500, { known_text: "why don't you want to sit between the two girls?" }),
  // seed rows (P26), seed clips reused: 276 under L01. (322: S0322L02U01 already carries the seed's sentence — nothing to add.)
  N(276, 1, 'U', 'no I can stay here for a little longer', 'nein, ich kann noch ein bisschen länger hier bleiben', SEEDROW),
  // 453 OPTION B (Kai): English → yesterday evening, this course only; gestern Abend kept; seed row under L03
  S(453, { known_text: 'did they say who they saw yesterday evening?' }),
  N(453, 3, 'U', 'did they say who they saw yesterday evening?', 'haben sie gesagt, wen sie gestern Abend gesehen haben?', SEEDROW),
  // 264: L01 "an old man" = ein alter Mann, NEW + intro (231 grown above so the two no longer clash)
  L('S0264L01', { known_text: 'an old man', is_new: true }),
  U('S0264L01B01', 'an old man', 'ein alter Mann'), // the seed row (already on the seed's clips)
];
module.exports = { blocks };
