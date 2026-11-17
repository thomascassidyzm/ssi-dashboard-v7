'use strict';
// kor_for_eng held items — job #432·AI (Kai, 17 Nov 2026 ~12:45Z: "yes" to applying #420·AI's 34 still-real items and
// re-recording, ~5,500 chars). Sources: #420·AI per-row table d/04d203c1 (23 family items), #734 proposals d/f0ab5817
// (11 held seeds). Every row below was read LIVE through Popty GET /api/production/kor_for_eng/seeds on 17 Nov.
//
// Shape (consumed by apply.cjs):
//   seeds[n]            {known_text?, target_text?}                       seed text edits
//   legos[id]           {known_text?, target_text?, type?, is_new?, comps?: [[known,target],...], intro?: 'custom line'}
//   legoInsert[]        {seed, index, known_text, target_text, type, comps}  (is_new true; structural, kai_go)
//   legoDelete[]        lego_id                                            (structural, cascade its phrases)
//   rep[legoId]         [[old,new],...]  text replacement on the Korean of EVERY non-component phrase under the LEGO,
//                                         unless that phrase is named in `phrases`
//   repEn[legoId]       [[old,new],...]  the same on the English
//   phrases[id]         [known,target] | null (delete)
//   phraseInsert[]      {lego, role:'build'|'use', known, target}
//   item[...]           which of the 34 items each edit belongs to (report only)

const D = { seeds: {}, legos: {}, legoInsert: [], legoDelete: [], rep: {}, repEn: {}, phrases: {}, phraseInsert: [], items: [] };
const item = (n, label, family, why) => D.items.push({ n, label, family, why });
const ph = (o) => Object.assign(D.phrases, o);
const ins = (lego, role, known, target) => D.phraseInsert.push({ lego, role, known, target });

// ───────────── FAMILY ITEMS (#420·AI) ─────────────

// #1 seed 82 — meaning: 왜 안 해요 = "why don't you (do it)"; the seed's reply is 왜요.
item(1, 'seed 82 why not → 왜요', 'meaning', 'seed decides (Kai 29 Oct); 왜요 is the short "why?" reply (koreanjun, KoreanClass101)');
D.legos.S0082L02 = { target_text: '왜요', type: 'A', comps: [] };
ph({ S0082L02B01: ['why not', '왜요'], S0082L02B02: ['why not', '왜요'], S0082L02B03: ['but why not', '하지만 왜요'], S0082L02B04: null,
  S0082L02U01: ['why not?', '왜요?'], S0082L02U02: ['but why not?', '하지만 왜요?'], S0082L02U03: null });

// #3 seed 90 — LEGO ≠ seed (말해 주시면 vs seed 말할 수 있으면); seed sentence not played.
item(3, 'seed 90 LEGO follows seed (말할 수 있으면) + seed played', 'wrong-word', 'seed decides');
D.legos.S0090L01 = { known_text: 'if you can speak more slowly', target_text: '더 천천히 말할 수 있으면', comps: [['more slowly', '더 천천히'], ['if you can speak', '말할 수 있으면']] };
ph({ S0090L01B01: ['if you can speak more slowly', '더 천천히 말할 수 있으면'], S0090L01B02: ['if you can speak more slowly', '더 천천히 말할 수 있으면'],
  S0090L01B03: null, S0090L01B04: ['but if you can speak more slowly', '하지만 더 천천히 말할 수 있으면'],
  S0090L01U01: ['if you can speak more slowly', '더 천천히 말할 수 있으면'], S0090L01U02: ['but if you can speak more slowly', '하지만 더 천천히 말할 수 있으면'],
  S0090L01U03: ['if you can speak more slowly to me', '저한테 더 천천히 말할 수 있으면'], S0090L01U04: ['so if you can speak more slowly', '그래서 더 천천히 말할 수 있으면'],
  S0090L01U08: ['and if you can speak more slowly', '그리고 더 천천히 말할 수 있으면'],
  S0090L02B03: ['if you can speak more slowly that would be great', '더 천천히 말할 수 있으면 좋겠어요'],
  S0090L02U01: ['if you can speak more slowly that would be great', '더 천천히 말할 수 있으면 좋겠어요'] });

// #4 seed 118 — LEGO 기분이 나아요 vs seed 기분이 더 좋아요; L02 has 우리가 the seed lacks.
item(4, 'seed 118 LEGOs follow seed (기분이 더 좋아요; no 우리가) + seed played', 'wrong-word', 'seed decides; L26');
D.legos.S0118L01 = { target_text: '기분이 더 좋아요', comps: [['feeling', '기분이'], ['better', '더 좋아요']] };
D.legos.S0118L02 = { target_text: '술집에 있었을 때보다', comps: [['in the pub', '술집에'], ['than when we were', '있었을 때보다']] };
D.rep.S0118L01 = [['기분이 나아요', '기분이 더 좋아요']];
D.rep.S0118L02 = [['우리는 우리가 술집에', '우리는 술집에'], ['우리가 술집에', '술집에'], ['기분이 나아요', '기분이 더 좋아요']];
ph({ S0118L01B02: null, S0118L01U04: null, S0118L01U08: null, S0118L01U06: null,
  S0118L02B02: null, S0118L02B04: null, S0118L02U06: null, S0118L02U07: null, S0118L02U08: null,
  S0118L02U01: ['I feel better than I felt when we were in the pub', '술집에 있었을 때보다 기분이 더 좋아요'] });

// #5 seed 123 — LEGO 좋은 생각이에요 vs seed 좋은 생각인 것 같아요.
item(5, 'seed 123 LEGO follows seed (좋은 생각인 것 같아요) + seed played; 189 L01 re-judged new (L31)', 'wrong-word', 'seed decides; L31');
D.legos.S0123L01 = { known_text: "I think it's a good idea", target_text: '좋은 생각인 것 같아요', comps: [['good', '좋은'], ['idea', '생각인'], ['I think', '것 같아요']] };
ph({ S0123L01B01: ["I think it's a good idea", '좋은 생각인 것 같아요'], S0123L01B02: null,
  S0123L01B03: ["I think that's a good idea", '그건 좋은 생각인 것 같아요'], S0123L01B04: ["but I think it's a good idea", '하지만 좋은 생각인 것 같아요'],
  S0123L01U01: ["I think that's a good idea", '그건 좋은 생각인 것 같아요'], S0123L01U02: null,
  S0123L01U05: ["but I think that's a good idea", '하지만 그건 좋은 생각인 것 같아요'], S0123L01U06: ["I think that's a really good idea", '그건 정말 좋은 생각인 것 같아요'],
  S0123L01U07: ["yes, I think it's a good idea", '네 좋은 생각인 것 같아요'] });
// L31: S0189L01 "that's a good idea | 좋은 생각이에요" was not-new against 123's old LEGO; its own seed (189) says it, so it debuts here.
D.legos.S0189L01 = { is_new: true };
ins('S0189L01', 'build', "that's a good idea", '좋은 생각이에요');
ins('S0189L01', 'use', "yes that's a good idea", '네 좋은 생각이에요');
ins('S0189L01', 'use', "that's a really good idea", '정말 좋은 생각이에요');
ins('S0189L01', 'use', "but that's a good idea", '하지만 좋은 생각이에요');

// #6 seed 186 — 다른 거 이야기 vs seed (and 158's taught form) 다른 것에 대해 이야기 (P28).
item(6, 'seed 186 LEGO follows seed (다른 것에 대해) + seed played + 3 knock-ons', 'wrong-word', 'seed decides; P28 (158 teaches 다른 것에 대해)');
D.legos.S0186L01 = { target_text: '다음 주에 다른 것에 대해 이야기하고 싶어요', comps: [['next week', '다음 주에'], ['about something different', '다른 것에 대해'], ['want to talk about', '이야기하고 싶어요']] };
D.rep.S0186L01 = [['다른 거 이야기', '다른 것에 대해 이야기']];
ph({ S0186L01U05: null,
  S0237L01U01: ['I want to talk about something else before the weekend', '주말 전에 다른 것에 대해 이야기하고 싶어요'],
  S0320L01U17: ['I want to talk about something different this year', '올해 다른 것에 대해 이야기하고 싶어요'],
  S0355L01U09: ['next week I want to talk to that woman about something different', '다음 주에 그 여자와 다른 것에 대해 이야기하고 싶어요'] });
ins('S0186L01', 'use', 'do you want to talk about something different next week?', '다음 주에 다른 것에 대해 이야기하고 싶어요?');

// #7 seed 200 — the seed Korean dropped "want to make sure"; the LEGOs already teach it.
item(7, 'seed 200 seed Korean fixed to what its LEGOs teach + seed played', 'meaning', 'S7 canonical meaning lost; LEGOs already right');
D.seeds[200] = { target_text: '그들은 우리가 제시간에 다 끝내는지 확인하고 싶다고 해요' };
ph({ S0200L02U01: ['they say they want to make sure that we finish everything in time', '그들은 우리가 제시간에 다 끝내는지 확인하고 싶다고 해요'] });

// #8 seed 210 — LEGO 그 문제를 의논 vs seed 문제를 논의.
item(8, 'seed 210 LEGO follows seed (문제를 논의) + 656 knock-on 의논→논의', 'wrong-word', 'seed decides; P28');
D.legos.S0210L01 = { target_text: '그들은 우리가 문제를 논의해야 한다고 생각해요', comps: [['they', '그들은'], ['we', '우리가'], ['the problem', '문제를'], ['need to discuss', '논의해야'], ['think that', '한다고 생각해요']] };
D.rep.S0210L01 = [['그 문제를 의논해야', '문제를 논의해야']];
ph({ S0210L01B02: null, S0210L01B04: null,
  S0210L01B03: ['but they think we need to discuss the problem', '하지만 그들은 우리가 문제를 논의해야 한다고 생각해요'],
  S0210L01U01: ['they think that we need to discuss the problem', '그들은 우리가 문제를 논의해야 한다고 생각해요'],
  S0656L01U23: ['we should discuss the problem with you all', '우리는 여러분과 그 문제를 논의해야 해요'] });

// #9 seed 236 — 한다고 ("is trying") vs the seed's 할 거라고 ("was going to").
item(9, 'seed 236 LEGO 한다고 → 할 거라고 (seed); truncated-English rows dropped', 'meaning', 'seed is right: was going to = 할 거라고');
D.legos.S0236L01 = { target_text: '도와주려고 할 거라고 한 사람을 알아요', comps: [['going to try to help', '도와주려고 할 거라고'], ['who said', '한'], ['someone', '사람을'], ['know', '알아요']] };
D.rep.S0236L01 = [['도와주려고 한다고', '도와주려고 할 거라고']];
ph({ S0236L01B02: null, S0236L01B04: null, S0236L01U03: null, S0236L01U04: null, S0236L01U06: null, S0236L01U07: null, S0236L01U08: null,
  S0236L01B03: ['but I know someone who said she was going to try to help', '하지만 도와주려고 할 거라고 한 사람을 알아요'],
  S0236L01U02: ['but I know someone who said she was going to try to help', '하지만 도와주려고 할 거라고 한 사람을 알아요'],
  S0236L01U05: ['yes I know someone who said she was going to try to help', '네 도와주려고 할 거라고 한 사람을 알아요'] });

// #10 seed 248 — LEGO 그 영화가 vs seed 그 영화는.
item(10, 'seed 248 LEGO follows seed (그 영화는) + seed played', 'wrong-word', 'seed decides');
D.legos.S0248L01 = { target_text: '그 영화는 완전 쓰레기라고', comps: [['the film', '그 영화는'], ['complete', '완전'], ['rubbish', '쓰레기라고']] };
D.rep.S0248L01 = [['그 영화가', '그 영화는']];
ph({ S0248L01B04: null, S0248L01U04: null, S0248L01U05: null, S0248L01U06: null, S0248L01U07: null,
  S0248L01U03: ['of course I thought the film was complete rubbish', '물론 그 영화는 완전 쓰레기라고 생각했어요'] });
ins('S0248L02', 'use', 'I thought the film was complete rubbish and I want my money back', '그 영화는 완전 쓰레기라고 생각했고 돈을 돌려받고 싶어요');

// #11 seed 581 — seed 좀 더 vs 조금 더 taught for "a little more" (54, 581 L02).
item(11, 'seed 581 seed 좀 더 → 조금 더 + seed played', 'taught-form', 'P28: a little more = 조금 더');
D.seeds[581] = { target_text: '그게 어떤지 조금 더 알고 싶어해요' };
ins('S0581L03', 'use', "he'd like to know a little more about what it's like", '그게 어떤지 조금 더 알고 싶어해요');

// #12 seed 584 — 보는 게 어때요 = "how about seeing" (a suggestion); the seed says 보는 건 어때요.
item(12, 'seed 584 LEGO 보는 게 → 보는 건 (seed); basket rewritten', 'meaning', '-는 게 어때요 is a suggestion (sayhikorean, sublearn, KoreanClass101)');
D.legos.S0584L04 = { target_text: '보는 건', comps: [['seeing', '보는'], ['thing', '건']] };
ph({ S0584L04B01: ['seeing', '보는 건'], S0584L04B02: ['seeing the mountains', '산을 보는 건'], S0584L04B03: ['waking up and seeing the mountains', '일어나서 산을 보는 건'],
  S0584L04U01: ["what's it like to see the mountains?", '산을 보는 건 어때요?'],
  S0584L04U02: ["what's it like to wake up every morning and see the mountains?", '매일 아침 일어나서 산을 보는 건 어때요?'],
  S0584L04U03: ['seeing the mountains is special', '산을 보는 건 특별해요'], S0584L04U04: null, S0584L04U05: null, S0584L04U06: null });

// #13/#15/#16 seed 596 — for a while / eyes / must close. Seed Korean unified with 92+180's 잠시 동안 (L34: unify first),
// so L01 becomes the not-new twin of 92 L02; L02 eyes merges into L03 → "close my eyes | 눈을 감아야" (감다 is only for eyes).
// That also clears the eyes (486 눈이) and must-close (499 닫아야) clashes without touching 486/499.
item(13, 'seed 596 for a while: seed 잠시 → 잠시 동안 (=92/180), L01 not-new twin of 92 L02', 'zut', 'L34 unify to one target form; 92 vs 596 known-side clash resolved');
item(15, 'eyes 486/596: 596 eyes LEGO merged into close my eyes', 'zut', '감다 only takes eyes (sublearn, italki, gobillykorean)');
item(16, 'must close 499/596: 596 must close → close my eyes', 'zut', 'same merge; 499 keeps 닫아야 for the window');
D.seeds[596] = { target_text: '그리고 잠시 동안 눈을 감아야 해요' };
D.legos.S0596L01 = { target_text: '잠시 동안', type: 'M', is_new: false, comps: [['a moment', '잠시'], ['during', '동안']] };
for (const id of ['B01', 'B02', 'B03', 'U01', 'U02', 'U03', 'U04', 'U05', 'U06', 'U07']) D.phrases[`S0596L01${id}`] = null; // unplayed garbage under a now not-new LEGO
D.legoDelete.push('S0596L02');
D.legos.S0596L03 = { known_text: 'close my eyes', target_text: '눈을 감아야', comps: [['eyes', '눈을'], ['close', '감아야']] };
ph({ S0596L03B01: ['close my eyes', '눈을 감아야'], S0596L03B02: ['need to close my eyes', '눈을 감아야 해요'],
  S0596L03B03: ['need to close my eyes for a while', '잠시 동안 눈을 감아야 해요'],
  S0596L03U01: ['she needs to close her eyes', '그녀는 눈을 감아야 해요'],
  S0596L03U02: ['so I need to close my eyes for a while', '그래서 잠시 동안 눈을 감아야 해요'],
  S0596L03U03: ['and I need to close my eyes for a while', '그리고 잠시 동안 눈을 감아야 해요'],
  S0596L03U04: null, S0596L03U05: ['the children need to close their eyes', '아이들은 눈을 감아야 해요'], S0596L03U06: null });

// #14 351/378 — ZUT go (가고 / 갈); neither "go" is in its seed's English (L26).
item(14, 'go 351/378: 351 leave = 두고 가고 (go merged), 378 for holidays = 휴가 갈 (go merged)', 'zut', 'K23a independent reason (L26); 두고 가다 = leave behind (Lingoland, WordReference)');
D.legos.S0351L02 = { target_text: '두고 가고' };
D.legoDelete.push('S0351L03');
ph({ S0351L02B04: null, S0351L02B05: ['leave some old friends', '오래된 친구들을 두고 가고'], S0351L02B06: ['want to leave', '두고 가고 싶어요'], S0351L02B07: null,
  S0351L02U06: ["my father didn't want to leave the cat alone", '제 아버지는 고양이를 혼자 두고 가고 싶어하지 않았어요'],
  S0351L02U07: null, S0351L02U08: null,
  S0351L02U09: ['why do you want to leave some old friends and go on monday', '왜 월요일에 오래된 친구들을 두고 가고 싶어요'],
  S0351L02U10: ['the student said he wants to leave my keys on the table', '학생은 제 열쇠를 탁자 위에 두고 가고 싶다고 했어요'],
  S0351L02U11: ["the student who doesn't want to leave the cat alone is holding up both hands", '고양이를 혼자 두고 가고 싶어하지 않는 학생은 양손을 들고 있어요'] });
ins('S0351L02', 'build', 'leave', '두고 가고');
ins('S0351L02', 'use', "no he didn't want to leave me on my own", '아니요 그는 저를 혼자 두고 가고 싶어하지 않았어요');
D.legoDelete.push('S0378L01');
D.legos.S0378L02 = { known_text: 'for holidays', target_text: '휴가 갈', type: 'M', comps: [['holiday', '휴가'], ['to go', '갈']] };
ph({ S0378L02B04: ['for holidays', '휴가 갈'], S0378L02B05: ['money for holidays', '휴가 갈 돈이'], S0378L02B06: ['time for holidays', '휴가 갈 시간이'], S0378L02B07: null,
  S0378L02U08: ["last year I didn't have enough money for holidays", '작년에 휴가 갈 돈이 충분하지 않았어요'],
  S0378L02U09: ["no I didn't have enough money for holidays", '아니요 휴가 갈 돈이 충분하지 않았어요'],
  S0378L02U10: ["this year I don't have enough time for holidays", '올해 휴가 갈 시간이 충분하지 않아요'],
  S0378L02U11: null, S0378L02U12: null });

// #17 625/630 — ZUT to drink (마시고/마실). 630 grows to its seed's own "something to drink | 뭔가 마실 걸".
item(17, 'to drink 625/630: 630 L01 → something to drink | 뭔가 마실 걸 (seed words); 625 keeps to drink | 마시고', 'zut', '마실 것 = something to drink (90daykorean); 뭔가 kept inside so the prompt has one answer');
D.legos.S0630L01 = { known_text: 'something to drink', target_text: '뭔가 마실 걸', comps: [['something', '뭔가'], ['to drink', '마실 걸']] };
ph({ S0630L01B01: ['something to drink', '뭔가 마실 걸'], S0630L01B02: ['and something to drink', '그리고 뭔가 마실 걸'], S0630L01B03: null,
  S0630L01U01: null, S0630L01U02: null, S0630L01U03: null, S0630L01U04: null, S0630L01U05: null, S0630L01U06: null,
  S0630L02B02: ['can I have something to drink?', '뭔가 마실 걸 주실 수 있어요?'], S0630L02B03: null,
  S0630L02U02: ['so can I have something to drink?', '그래서 뭔가 마실 걸 주실 수 있어요?'], S0630L02U03: null, S0630L02U04: null,
  S0630L02U05: ['could you give the children something to drink?', '아이들한테 뭔가 마실 걸 주실 수 있어요?'], S0630L02U06: null });

// #33 seed 136 — one stray reversed copy of the seed under L03 (same English as the seed, other order).
item(33, 'seed 136 stray reversed seed copy deleted', 'zut', 'same English, second Korean order');
ph({ S0136L03U01: null });

// #89 seed 628 — register K19: L02 좋아하세요? vs seed 좋아해요?.
item(89, 'seed 628 LEGO 좋아하세요? → 좋아해요? (K19)', 'register', 'one register per course; seed decides');
D.legos.S0628L02 = { target_text: '좋아해요?', comps: [['like', '좋아해요?']] };
ph({ S0628L02B01: ['do you like?', '좋아해요?'], S0628L02B02: null, S0628L02B03: null, S0628L02U03: null, S0628L02U04: null,
  S0628L02U01: ['do you like tea?', '차를 좋아해요?'], S0628L02U02: ['so do you like tea?', '그래서 차를 좋아해요?'],
  S0628L02U05: ['do the children like tea?', '아이들이 차를 좋아해요?'], S0628L02U06: ['does the family like tea?', '가족이 차를 좋아해요?'] });

// #90 seed 614 — not-new L03 근처예요 is not in its seed and has no earlier pair (L31): re-judged to the seed's 근처에 있어요, new.
item(90, 'seed 614 L03 → it\'s near | 근처에 있어요 (seed), debuts; seed played', 'wrong-word', 'L31 re-judge; seed decides');
D.legos.S0614L03 = { target_text: '근처에 있어요', is_new: true, type: 'M', comps: [['near', '근처에'], ['it is', '있어요']] };
ph({ S0614L03B01: ["it's near", '근처에 있어요'], S0614L03B02: ["it's near the house", '집 근처에 있어요'], S0614L03B03: null,
  S0614L03U01: ["it's near where your family live", '가족이 사는 곳 근처에 있어요'], S0614L03U02: ["so it's near the house", '그래서 집 근처에 있어요'],
  S0614L03U03: ["it's near where I live", '제가 사는 곳 근처에 있어요'], S0614L03U04: null, S0614L03U05: null, S0614L03U06: null });

// #93 seed 664 — copy 여러분 준비됐어요? vs seed 여러분 다 준비됐어요? (여러분 다 debuts at 662 below).
item(93, 'seed 664 copy → 여러분 다 준비됐어요?', 'wrong-word', 'seed decides; 여러분 다 taught at 662');
ph({ S0664L02U01: ['are you all ready?', '여러분 다 준비됐어요?'] });

// #94 seed 207 — orphan not-new LEGO with other Korean than its seed.
item(94, 'seed 207 LEGO → 해야 했던 걸 했어요 (seed), debuts', 'wrong-word', 'seed decides; no earlier pair (P25)');
D.legos.S0207L01 = { target_text: '해야 했던 걸 했어요', is_new: true, comps: [['what you needed to do', '해야 했던 걸'], ['have done', '했어요']] };
D.rep.S0207L01 = [['해야 할 일을 다 했어요', '해야 했던 걸 했어요']];
ph({ S0207L01B02: null, S0207L01B04: null, S0207L01U03: null, S0207L01U06: null, S0207L01U08: null,
  S0207L01B03: ["but you've done what you needed to do", '하지만 해야 했던 걸 했어요'] });

// #95 seed 257 — orphan not-new LEGO with 것을 where the seed says 거.
item(95, 'seed 257 LEGO → 그 파란 거 좋아해요 (seed), debuts', 'wrong-word', 'seed decides; no earlier pair (P25)');
D.legos.S0257L01 = { target_text: '그 파란 거 좋아해요', is_new: true, comps: [['that', '그'], ['blue', '파란'], ['thing', '거'], ['I like', '좋아해요']] };
D.rep.S0257L01 = [['그 파란 것을 좋아해요', '그 파란 거 좋아해요']];
ph({ S0257L01B04: null, S0257L01U03: null, S0257L01U04: null });

// #96 639/656 — with = 같이 course-wide; not-new 함께 LEGOs are in neither seed (L26).
item(96, 'with 639/656: not-new 함께 LEGOs deleted (639 L02, 656 L02); 656 B02 함께 → 같이', 'taught-form', 'L26; P28 with = 같이 (seeds 1, 639, 656)');
D.legoDelete.push('S0639L02', 'S0656L02');
ph({ S0656L01B02: ['with you all', '여러분과 같이'] });

// ───────────── THE 11 HELD SEEDS (#734 d/f0ab5817) ─────────────

// 92 — follow the seed: for a while | 잠시 동안.
item(86, 'seed 92 L02 → for a while | 잠시 동안 (seed)', 'held-11', '#734 rec; 180 uses 잠시 동안 too');
D.legos.S0092L02 = { known_text: 'for a while', target_text: '잠시 동안', comps: [['a moment', '잠시'], ['during', '동안']] };
ph({ S0092L02B01: ['for a while', '잠시 동안'], S0092L02B02: ['for a while', '잠시 동안'],
  S0092L02B03: ['keep on doing this for a while', '잠시 동안 이걸 계속하고'],
  S0092L02B04: ["I'd like to keep on doing this for a while", '잠시 동안 이걸 계속하고 싶어요'],
  S0092L02U01: ["I'd like to keep on doing this for a while", '잠시 동안 이걸 계속하고 싶어요'],
  S0092L02U02: ['he wants to keep on doing this for a while', '그는 잠시 동안 이걸 계속하고 싶어해요'],
  S0092L02U03: ['she wants to keep on doing this for a while', '그녀는 잠시 동안 이걸 계속하고 싶어해요'],
  S0092L02U04: ["but I'd like to keep on doing this for a while", '하지만 잠시 동안 이걸 계속하고 싶어요'],
  S0092L02U05: ['we want to keep on doing this for a while', '우리는 잠시 동안 이걸 계속하고 싶어요'],
  S0092L02U06: null, S0092L02U07: null, S0092L02U08: null });

// 631 — follow the seed: 뭘 드릴까요? (드릴까요 taught at 623).
item(83, 'seed 631 L01 뭘, L02 드릴까요? (seed)', 'held-11', '#734 option A');
D.legos.S0631L01 = { target_text: '뭘' };
D.legos.S0631L02 = { target_text: '드릴까요?', comps: [['shall I get you', '드릴까요?']] };
ph({ S0631L01B01: ['what', '뭘'], S0631L01B02: ['what do you know?', '뭘 알아요?'], S0631L01B03: null,
  S0631L01U01: ['what do you want to drink?', '뭘 마시고 싶어요?'], S0631L01U02: ['what do you want to do?', '뭘 하고 싶어요?'],
  S0631L01U03: ['what did you do?', '뭘 했어요?'], S0631L01U04: null, S0631L01U05: null, S0631L01U06: null,
  S0631L02B01: ['would you like?', '드릴까요?'], S0631L02B02: ['what would you like?', '뭘 드릴까요?'], S0631L02B03: null,
  S0631L02U01: ['what would you like?', '뭘 드릴까요?'], S0631L02U02: ['so what would you like?', '그래서 뭘 드릴까요?'],
  S0631L02U03: ['what would the children like?', '아이들한테 뭘 드릴까요?'], S0631L02U04: null, S0631L02U05: null,
  S0631L02U06: ['would you like some coffee or tea?', '커피나 차 드릴까요?'] });

// 108 — fix the English seed: want, not hope (the Korean already says want).
item(26, 'seed 108 English → want (not hope); L01 → didn\'t want to wake up | 일어나고 싶지 않았어요', 'held-11', '#734 option B; course "wake up" = 일어나다');
D.seeds[108] = { known_text: "we didn't want to wake up in the middle of the night" };
D.legos.S0108L01 = { known_text: "didn't want to wake up", target_text: '일어나고 싶지 않았어요', comps: [['to get up', '일어나고'], ["didn't want", '싶지 않았어요']] };
ph({ S0108L01B01: ["didn't want to wake up", '일어나고 싶지 않았어요'], S0108L01B02: null,
  S0108L01B03: ["we didn't want to wake up", '일어나고 싶지 않았어요'], S0108L01B04: ["but we didn't want to wake up", '하지만 일어나고 싶지 않았어요'],
  S0108L01U01: ["we didn't want to wake up", '일어나고 싶지 않았어요'], S0108L01U02: ["I didn't want to wake up", '일어나고 싶지 않았어요'],
  S0108L01U03: null, S0108L01U04: null, S0108L01U05: ["but we didn't want to wake up", '하지만 일어나고 싶지 않았어요'], S0108L01U06: null,
  S0108L01U07: null, S0108L01U08: ["so we didn't want to wake up", '그래서 일어나고 싶지 않았어요'],
  S0108L02B03: ["didn't want to wake up in the middle of the night", '한밤중에 일어나고 싶지 않았어요'],
  S0108L02U01: ["we didn't want to wake up in the middle of the night", '한밤중에 일어나고 싶지 않았어요'],
  S0108L02U02: ["I didn't want to wake up in the middle of the night", '한밤중에 일어나고 싶지 않았어요'],
  S0108L02U03: null, S0108L02U04: null, S0108L02U05: null, S0108L02U07: null,
  S0108L02U06: ["but we didn't want to wake up in the middle of the night", '하지만 한밤중에 일어나고 싶지 않았어요'],
  S0108L02U08: ["so we didn't want to wake up in the middle of the night", '그래서 한밤중에 일어나고 싶지 않았어요'] });

// 131 — follow the Korean, cut in two: in my head | 머리에 + there are too many ideas going around | 생각이 너무 많아요.
item(31, 'seed 131 re-cut: L01 in my head | 머리에, new L02 there are too many ideas going around | 생각이 너무 많아요', 'held-11', '#734 option A');
D.legos.S0131L01 = { known_text: 'in my head', target_text: '머리에', type: 'A', comps: [] };
D.legoInsert.push({ seed: 131, index: 2, known_text: 'there are too many ideas going around', target_text: '생각이 너무 많아요', type: 'M', comps: [['thoughts', '생각이'], ['there are too many', '너무 많아요']] });
ph({ S0131L01B01: ['in my head', '머리에'], S0131L01B02: ["it's in my head", '머리에 있어요'], S0131L01B03: null, S0131L01B04: null,
  S0131L01U01: ["it's in my head", '머리에 있어요'], S0131L01U02: ["it's still in my head", '아직 머리에 있어요'],
  S0131L01U03: null, S0131L01U04: null, S0131L01U05: null, S0131L01U07: null, S0131L01U08: null, S0131L01U09: null });
ins('S0131L02', 'build', 'there are too many ideas going around', '생각이 너무 많아요');
ins('S0131L02', 'build', 'there are too many ideas going around in my head', '머리에 생각이 너무 많아요');
ins('S0131L02', 'use', 'there are too many ideas going around in my head', '머리에 생각이 너무 많아요');
ins('S0131L02', 'use', 'but there are too many ideas going around in my head', '하지만 머리에 생각이 너무 많아요');
ins('S0131L02', 'use', 'so there are too many ideas going around in my head', '그래서 머리에 생각이 너무 많아요');
ins('S0131L02', 'use', 'he has too many ideas going around in his head', '그는 머리에 생각이 너무 많아요');

// 149 — follow the seed: the -(으)니까 connector inside the sentence.
item(38, 'seed 149 L01 this isn\'t very difficult, so | 이건 별로 어렵지 않으니까; L02 I hope you\'ll finish soon | 곧 끝나면 좋겠어요', 'held-11', '#734 option A');
D.legos.S0149L01 = { known_text: "this isn't very difficult, so", target_text: '이건 별로 어렵지 않으니까', comps: [['this', '이건'], ['not very', '별로'], ["isn't difficult, so", '어렵지 않으니까']] };
D.legos.S0149L02 = { known_text: "I hope you'll finish soon", target_text: '곧 끝나면 좋겠어요', comps: [['soon', '곧'], ['if it finishes, would be good', '끝나면 좋겠어요']] };
ph({ S0149L01B01: ["this isn't very difficult, so", '이건 별로 어렵지 않으니까'],
  S0149L01B02: ["this isn't very difficult, so it's okay", '이건 별로 어렵지 않으니까 괜찮아요'], S0149L01B03: null, S0149L01B04: null,
  S0149L01U01: ["this isn't very difficult, so we can do it", '이건 별로 어렵지 않으니까 할 수 있어요'],
  S0149L01U02: ["but this isn't very difficult, so it's okay", '하지만 이건 별로 어렵지 않으니까 괜찮아요'],
  S0149L01U03: ["this isn't very difficult, so I want to do it", '이건 별로 어렵지 않으니까 하고 싶어요'],
  S0149L01U04: null, S0149L01U05: null, S0149L01U07: null, S0149L01U08: null, S0149L01U09: null, S0149L01U10: null,
  S0149L02B01: ["I hope you'll finish soon", '곧 끝나면 좋겠어요'], S0149L02B02: null,
  S0149L02B03: ["this isn't very difficult, so I hope you'll finish soon", '이건 별로 어렵지 않으니까, 곧 끝나면 좋겠어요'],
  S0149L02U01: ["this isn't very difficult, so I hope you'll finish soon", '이건 별로 어렵지 않으니까, 곧 끝나면 좋겠어요'],
  S0149L02U07: ["but I hope you'll finish soon", '하지만 곧 끝나면 좋겠어요'] });

// 77 — follow the seed: 놀라워요, how quickly | 얼마나 빨리, I'm starting to understand | 이해하기 시작하고 있는지 (new).
item(19, 'seed 77 L01 I\'m surprised | 놀라워요 (basket restricted to "I"), L02 how quickly | 얼마나 빨리, new L03 | 이해하기 시작하고 있는지', 'held-11', '#734 option A');
D.legos.S0077L01 = { known_text: "I'm surprised", target_text: '놀라워요' };
D.legos.S0077L02 = { known_text: 'how quickly', target_text: '얼마나 빨리', comps: [['how much', '얼마나'], ['quickly', '빨리']] };
D.legoInsert.push({ seed: 77, index: 3, known_text: "I'm starting to understand", target_text: '이해하기 시작하고 있는지', type: 'M', comps: [['to understand', '이해하기'], ["I'm starting", '시작하고 있는지']] });
ph({ S0077L01B01: ["I'm surprised", '놀라워요'], S0077L01B02: ["I'm really surprised", '정말 놀라워요'], S0077L01B03: ["I'm very surprised", '아주 놀라워요'],
  S0077L01U01: ["I'm surprised", '놀라워요'], S0077L01U05: ["but I'm surprised", '하지만 놀라워요'], S0077L01U06: ["I'm really surprised", '정말 놀라워요'],
  S0077L01U07: ["so I'm surprised", '그래서 놀라워요'], S0077L01U02: null, S0077L01U03: null, S0077L01U04: null, S0077L01U08: null,
  S0077L02B01: ['how quickly', '얼마나 빨리'], S0077L02B02: ['how quickly do you want to go?', '얼마나 빨리 가고 싶어요?'],
  S0077L02U01: ['how quickly do you want to learn?', '얼마나 빨리 배우고 싶어요?'], S0077L02U02: ['how quickly do you want to do it?', '얼마나 빨리 하고 싶어요?'],
  S0077L02B03: null, S0077L02B04: null, S0077L02U03: null, S0077L02U04: null, S0077L02U05: null, S0077L02U06: null, S0077L02U07: null, S0077L02U08: null,
  S0097L01U08: ["yes I'm surprised", '네 놀라워요'], S0384L03U10: ["I'm surprised because I can agree", '동의할 수 있어서 놀라워요'] });
ins('S0077L03', 'build', "I'm starting to understand", '이해하기 시작하고 있는지');
ins('S0077L03', 'build', "how quickly I'm starting to understand", '얼마나 빨리 이해하기 시작하고 있는지');
ins('S0077L03', 'use', "I'm surprised at how quickly I'm starting to understand", '얼마나 빨리 이해하기 시작하고 있는지 놀라워요');
ins('S0077L03', 'use', "I'm really surprised at how quickly I'm starting to understand", '얼마나 빨리 이해하기 시작하고 있는지 정말 놀라워요');
ins('S0077L03', 'use', "but I'm surprised at how quickly I'm starting to understand", '하지만 얼마나 빨리 이해하기 시작하고 있는지 놀라워요');
ins('S0077L03', 'use', "I want to know if I'm starting to understand", '이해하기 시작하고 있는지 알고 싶어요');

// 618 — re-cut to the seed: a long time | 오래된 + doesn't feel like | 것 같지 않아요.
item(81, 'seed 618 re-cut: a long time | 오래된, doesn\'t feel like | 것 같지 않아요', 'held-11', '#734 option A; 115 already teaches 것 같지 않아요');
D.legos.S0618L01 = { known_text: 'a long time', target_text: '오래된', type: 'A', comps: [] };
D.legos.S0618L02 = { known_text: "doesn't feel like", target_text: '것 같지 않아요', comps: [['thing', '것'], ["doesn't seem", '같지 않아요']] };
ph({ S0618L01B01: ['a long time', '오래된'], S0618L01B02: null, S0618L01B03: null,
  S0618L01U01: null, S0618L01U02: null, S0618L01U03: null, S0618L01U04: null, S0618L01U05: null, S0618L01U06: null,
  S0618L02B01: ["doesn't feel like", '것 같지 않아요'], S0618L02B02: ["it doesn't feel like a long time", '오래된 것 같지 않아요'], S0618L02B03: null,
  S0618L02U01: ["it doesn't feel like a long time", '오래된 것 같지 않아요'], S0618L02U02: ["so it doesn't feel like a long time", '그래서 오래된 것 같지 않아요'],
  S0618L02U03: ["but it doesn't feel like a long time", '하지만 오래된 것 같지 않아요'], S0618L02U04: ["really, it doesn't feel like a long time", '정말 오래된 것 같지 않아요'],
  S0618L02U05: null, S0618L02U06: null });

// 633 — fix the seed Korean (큰 컵으로 물 한 잔이면 괜찮아요); L02 grows to the "…would be fine" frame; L03 (좋겠어요, not in the seed) goes.
item(84, 'seed 633 seed Korean → 큰 컵으로 물 한 잔이면 괜찮아요; L02 a glass of water would be fine | 물 한 잔이면 괜찮아요; L03 deleted', 'held-11', '#734 option B (L01 already says 큰 컵으로)');
D.seeds[633] = { target_text: '큰 컵으로 물 한 잔이면 괜찮아요' };
D.legos.S0633L02 = { known_text: 'a glass of water would be fine', target_text: '물 한 잔이면 괜찮아요', comps: [['water', '물'], ['one glass', '한 잔'], ['if it is', '이면'], ['fine', '괜찮아요']] };
D.legoDelete.push('S0633L03');
ph({ S0633L01B02: null, S0633L01B03: null, S0633L01U01: null, S0633L01U02: null, S0633L01U03: null, S0633L01U04: null, S0633L01U05: null, S0633L01U06: null,
  S0633L02B01: ['a glass of water would be fine', '물 한 잔이면 괜찮아요'], S0633L02B02: ['a large glass of water would be fine', '큰 컵으로 물 한 잔이면 괜찮아요'],
  S0633L02B03: null, S0633L02U01: ['a large glass of water would be fine', '큰 컵으로 물 한 잔이면 괜찮아요'],
  S0633L02U02: ['so a glass of water would be fine', '그래서 물 한 잔이면 괜찮아요'], S0633L02U03: null,
  S0633L02U04: ['yes, a glass of water would be fine', '네 물 한 잔이면 괜찮아요'], S0633L02U05: null, S0633L02U06: null });

// 558 — whole-seed LEGO; 이렇게 (not in the seed, no earlier pair) goes with lego.delete, which Popty now has.
item(80, 'seed 558 L02 grows to it\'s so late at night | 밤이 너무 늦었어요; L01 이렇게 deleted', 'held-11', '#734 option A (blocker gone: lego.delete exists)');
D.legos.S0558L02 = { known_text: "it's so late at night", target_text: '밤이 너무 늦었어요', comps: [['night', '밤이'], ['so', '너무'], ['is late', '늦었어요']] };
D.legoDelete.push('S0558L01');
ph({ S0558L02B01: ["it's so late at night", '밤이 너무 늦었어요'], S0558L02B02: ["now it's so late at night", '지금 밤이 너무 늦었어요'], S0558L02B03: null,
  S0558L02U01: ["it's so late at night", '밤이 너무 늦었어요'], S0558L02U02: ["but it's so late at night", '하지만 밤이 너무 늦었어요'],
  S0558L02U03: ["yes it's so late at night", '네 밤이 너무 늦었어요'], S0558L02U04: null, S0558L02U05: null, S0558L02U06: null });

// 624 — grow the seed: 네, 그러면 좋겠어요, 감사합니다 (the only place 감사합니다 is taught); L03 please with a PR1 heads-up intro.
item(82, 'seed 624 seed grows …, 감사합니다; L02 yes, that would be great | 네, 그러면 좋겠어요; L03 please | 감사합니다 + tiny intro', 'held-11', '#734 option A');
D.seeds[624] = { target_text: '네, 그러면 좋겠어요, 감사합니다' };
D.legos.S0624L02 = { known_text: 'yes, that would be great', target_text: '네, 그러면 좋겠어요', comps: [['yes', '네'], ['if so', '그러면'], ['would be good', '좋겠어요']] };
D.legos.S0624L03 = { known_text: 'please', intro: "The Korean for: 'please', when you're accepting something you've been offered, is:" };
ph({ S0624L02B01: ['yes, that would be great', '네, 그러면 좋겠어요'], S0624L02B02: null, S0624L02B03: null,
  S0624L02U01: ['yes, that would be great', '네, 그러면 좋겠어요'], S0624L02U02: ['so yes, that would be great', '그래서 네, 그러면 좋겠어요'],
  S0624L02U03: null, S0624L02U04: null, S0624L02U05: null, S0624L02U06: null,
  S0624L03B01: ['please', '감사합니다'], S0624L03B02: ['yes please', '네 감사합니다'], S0624L03B03: ['that would be great, please', '그러면 좋겠어요, 감사합니다'],
  S0624L03U01: ['yes, that would be great, please', '네, 그러면 좋겠어요, 감사합니다'], S0624L03U02: ['so yes please', '그래서 네 감사합니다'],
  S0624L03U03: null, S0624L03U04: null, S0624L03U05: null, S0624L03U06: null });

// 662 — new design: you all | 여러분 다 (debut), speak it | 그거 말해요 (debut).
item(85, 'seed 662 L01 you all | 여러분 다 (new), L02 speak it | 그거 말해요 (new)', 'held-11', '#734 option A');
D.legos.S0662L01 = { target_text: '여러분 다', is_new: true, type: 'M', comps: [['you all', '여러분'], ['all', '다']] };
D.legos.S0662L02 = { known_text: 'speak it', target_text: '그거 말해요', is_new: true, type: 'M', comps: [['it', '그거'], ['speak', '말해요']] };
ins('S0662L01', 'build', 'you all', '여러분 다');
ins('S0662L01', 'use', 'you all know', '여러분 다 알아요');
ins('S0662L01', 'use', 'do you all want to learn?', '여러분 다 배우고 싶어요?');
ph({ S0662L02B01: ['speak it', '그거 말해요'], S0662L02B02: ['you all speak it', '여러분 다 그거 말해요'], S0662L02B03: null, S0662L02B04: null,
  S0662L02U01: ['you all speak it', '여러분 다 그거 말해요'], S0662L02U02: ['she speaks it', '그녀는 그거 말해요'], S0662L02U03: null, S0662L02U04: null,
  S0662L02U05: null, S0662L02U06: null });

// ───────────── KNOCK-ONS found by the plan's decomposition/text sweep (P28, K17: a form the fixed LEGO no longer teaches) ─────────────
ph({ S0125L03B03: ['I think that idea is a good idea', '그 생각이 좋은 생각인 것 같아요'],          // 123 now teaches 좋은 생각인 것 같아요
  S0130L02U04: null, S0130L02U05: null, S0130L02U06: null,                                     // 놀랐어요 no longer taught at 77; seed 130 says 놀라웠어요
  S0219L01U10: ['it was nice to relax for a while and I feel better than last night', '잠시 쉬니까 좋았어요 그리고 어젯밤보다 기분이 더 좋아요'],
  S0237L01U04: ['I feel better before the weekend', '주말 전에 기분이 더 좋아요'],
  S0302L01U12: ['I feel better in a city', '도시에서 기분이 더 좋아요'],
  S0413L01U10: ['if I go to the top I feel better', '꼭대기에 가면 기분이 더 좋아요'],
  S0401L01U06: ['it would be better if you can speak more slowly', '더 천천히 말할 수 있으면 나을 거예요'] });

module.exports = D;
