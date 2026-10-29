'use strict';
// kor_for_eng job #565 (Kai, 2026-10-29): "The seed is the decider for what gets taught, the legos should reflect the seed."
// The 71 seeds of the #433 census (held list d/8516600e, item 18) whose Korean departs from their own LEGOs. Each entry
// re-states the LEGO (and its components) so that its Korean is the seed's. The seed text is NEVER touched.
//
//   S: seed number
//   L: { [lego_id]: { target, comps } }   comps = one entry per existing component row, in order: a string (new target, known
//      text kept) or [known, target]. FEWER entries than the LEGO has components => the tail component rows are deleted
//      (a component row is a tile label, not a LEGO).
//   frag: [[old, new], ...]  extra phrase-text rewrites for LEGOs the seed splits around (the LEGO text is not contiguous in
//      the seed); applied to the phrases that use the LEGO.
//   hold: why this seed is NOT applied (the reason is the question for Kai / a native reader).
const D = [];
const s = (S, L, extra = {}) => D.push({ S, L, ...extra });

s(74, { S0074L01: { target: '이해하게 도와줘서', comps: [['to understand', '이해하게'], '도와줘서'] } });
s(83, { S0083L02: { target: '친구에 대해', comps: ['친구에', '대해'] }, S0083L03: { target: '한 말에', comps: [['what you said', '한 말'], ['with', '에']] } });
s(84, { S0084L02: { target: '그가 제 친구에 대해 한 말에', comps: ['그가', '제', '친구에 대해', '한 말에'] } });
s(95, { S0095L02: { target: '다음 버스로', comps: ['다음', '버스', ['by', '로']] } });
s(97, { S0097L02: { target: '원하면 바로 갈 준비됐어요', comps: ['원하면 바로', '갈 준비됐어요'] } });
s(98, { S0098L02: { target: '다른 걸 할지', comps: ['다른 걸', ['whether to play', '할지']] } });
s(100, { S0100L01: { target: '걱정하면 안 돼요', comps: ['걱정하면', ["mustn't", '안 돼요']] }, S0100L02: { target: '비슷한 걸 하는 것에 대해', comps: ['비슷한', '걸', '하는 것에 대해'] } });
s(114, { S0114L02: { target: '오늘은 어제보다', comps: ['오늘은', '어제보다'] }, S0114L01: { target: '더 못하고 있는 것 같아요', comps: ['더 못하고 있는', '것 같아요'] } });
s(116, { S0116L01: { target: '제가 할 수 있는 최고의 선택이 아니에요', comps: ['제가 할 수 있는', '최고의 선택이', '아니에요'] } });
s(120, { S0120L01: { target: '버스로 가는 걸 좋아하는 게', comps: [['going by bus', '버스로 가는 걸'], '좋아하는 게'] } });
s(122, { S0122L01: { target: '더 쉬워지기 시작하고 있고', comps: ['더 쉬워지기', ['starting and', '시작하고 있고']] }, S0122L02: { target: '어떻게 되고 있는지 신나요', comps: ['어떻게', '되고 있는지', '신나요'] } });
s(126, { S0126L01: { target: '이 일이 바꾸고 있어요', comps: ['이 일이', '바꾸고 있어요'] }, S0126L02: { target: '뇌의 모양을', comps: [['my brain\'s', '뇌의'], ['shape', '모양을']] } },
  { frag: [['이 작업이 제 뇌의 모양을 바꾸고 있어요', '이 일이 뇌의 모양을 바꾸고 있어요'], ['이 작업이 제 뇌의', '이 일이 뇌의']] });
s(134, { S0134L01: { target: '문제가 안 돼요', comps: ['문제가', ["isn't", '안 돼요']] } });
s(136, { S0136L01: { target: '물론' }, S0136L02: { target: '그녀한테 물어봐도 돼요', comps: ['그녀한테', '물어봐도 돼요'] }, S0136L03: { target: '제 친구니까요', comps: ['제', ['because friend', '친구니까요']] } });
s(138, { S0138L01: { target: '친구가 우리를 만나고 싶어했던 곳이에요', comps: ['친구가', '우리를', '만나고 싶어했던', '곳이에요'] } });
s(142, { S0142L01: { target: '아주 친절하시네요 그리고', comps: [['very', '아주'], ['kind and', '친절하시네요 그리고']] }, S0142L02: { target: '도와줘서 감사해요', comps: ['도와줘서', '감사해요'] } });
s(143, { S0143L02: { target: '아까 말했던 것과', comps: ['아까', '말했던', '것과'] } });
s(146, { S0146L02: { target: '고치려고 한 이후로', comps: [['tried to fix', '고치려고 한'], ['since', '이후로']] } });
s(147, { S0147L02: { target: '제가 긴장하는 걸 봤을 때', comps: ['제가', '긴장하는', '걸 봤을', '때'] } });
s(152, { S0152L02: { target: '뭘 원했는지 알았더라면', comps: [['what you wanted', '뭘 원했는지'], '알았더라면'] } });
s(155, { S0155L01: { target: '몇 분 기다리는 건 괜찮아요', comps: ['몇', '분', ['waiting', '기다리는 건'], '괜찮아요'] } });
s(157, { S0157L01: { target: '거기에 있지 못할 거예요', comps: ['거기에', '있지 못할 거예요'] } });
s(158, { S0158L01: { target: '다른 것에 대해 이야기해요', comps: ['다른 것에 대해', '이야기해요'] } });
s(163, { S0163L01: { target: '그건 재미있는 것 같아요', comps: [['that', '그건'], ['it seems interesting', '재미있는 것 같아요']] } });
s(169, { S0169L01: { target: '제가 뭘 해 주면 좋겠어요', comps: ['제가', '뭘', ['would you like me to do', '해 주면 좋겠어요']] } });
s(178, { S0178L02: { target: '만나고 싶었지만', comps: [['wanted to see', '만나고 싶었'], '지만'] } });
s(180, { S0180L01: { target: '잠시 동안 책을 읽고 싶어요', comps: ['잠시 동안', '책을', '읽고 싶어요'] } });
s(190, { S0190L01: { target: '질문 몇 개 해도 괜찮아요', comps: [['some', '몇 개'], '질문', ['is it okay if I ask', '해도 괜찮아요']] } });
s(198, { S0198L01: { target: '제 딸은 구청에서 일해요', comps: ['제 딸은', '구청에서', '일해요'] } });
s(199, { S0199L01: { target: '제 친구는 사무실에서 일했었어요', comps: ['제 친구는', '사무실에서', '일했었어요'] } });
s(202, { S0202L01: { target: '아무도 질문에 어떻게 대답해야 하는지 몰랐어요', comps: ['아무도', '질문에', '어떻게', '대답해야 하는지', '몰랐어요'] } });
s(203, { S0203L01: { target: '제가 도와달라고 하면 어떻게 하겠어요', comps: ['제가 도와달라고 하면', '어떻게 하겠어요'] } });
s(206, { S0206L01: { target: '같이 말하는 연습을 할 기회가 즐거워요', comps: ['같이', '말하는', '연습을 할', '기회가', '즐거워요'] } });
s(209, { S0209L01: { target: '그들은 같이 모여서 더 많은 시간을 보내고 싶어해요', comps: ['그들은', '같이', '모여서', '시간을', '더 많은', '보내고 싶어해요'] } });
s(212, { S0212L01: { target: '그들은 도움을 요청하고 싶어했어요', comps: ['그들은', '도움을', '요청하고', '싶어했어요'] } });
s(213, { S0213L01: { target: '그들이 뭘 이루려고 하는지 몰라요', comps: ['그들이', '뭘', '이루려고 하는지', '몰라요'] } });
s(219, { S0219L01: { target: '잠시 쉬니까 좋았어요', comps: ['잠시', '쉬니까', '좋았어요'] } });
s(240, { S0240L01: { target: '제 아버지는 말하는 걸 멈추는 게 싫어요', comps: ['제 아버지는', '말하는 걸', '멈추는 게', '싫어요'] } });
s(243, { S0243L01: { target: '같은 걸 달라고 할 거예요', comps: ['같은', ['thing', '걸'], '달라고', '할 거예요'] } });
s(245, { S0245L01: { target: '짧은 시간에 이만큼 해서 기뻐요', comps: ['짧은', '시간에', ['this much', '이만큼'], ['done, so', '해서'], '기뻐요'] } });
s(247, { S0247L01: { target: '그 책이 꽤 좋았다고 생각했어요', comps: ['그 책이', '꽤', '좋았다고', '생각했어요'] } });
s(249, { S0249L01: { target: '가기 전에 도와주면 좋겠어요', comps: ['가기 전에', '도와주면', '좋겠어요'] } });
s(250, { S0250L01: { target: '제가 대답하기 전에 다른 것도 말해 줄 수 있어요', comps: ['제가 대답하기 전에', '다른 것도', '말해 줄 수 있어요'] } });
s(251, { S0251L01: { target: '끝난 후까지 알고 싶지 않아요', comps: [['until after we finish', '끝난 후까지'], '알고', '싶지 않아요'] } });
s(252, { S0252L01: { target: '언제 시작할 준비가 돼요', comps: ['언제', '시작할 준비가', ['are', '돼요']] } });
s(256, { S0256L01: { target: '한 시간도 안 돼서 준비될 것 같아요', comps: ['한 시간도 안 돼서', '준비될 것 같아요'] } });
s(261, { S0261L01: { target: '중요한 거일 수도 있는 것 같아요', comps: ['중요한', '거일', '수도 있는', '것 같아요'] } });
s(264, { S0264L01: { target: '나이 든 남자', comps: ['나이 든', '남자'] } });
s(270, { S0270L01: { target: '늦을까 봐 걱정돼서요', comps: ['늦을까 봐', '걱정돼서요'] } });
s(271, { S0271L01: { target: '다음 달에 우리와 같이 오고 싶어요', comps: ['다음 달에', '우리와 같이', '오고 싶어요'] } });
s(272, { S0272L01: { target: '네 아주 좋은 생각인 것 같아요', comps: ['네', ['very', '아주'], '좋은 생각인 것 같아요'] } });
s(279, { S0279L01: { target: '네 시간이 별로 안 남았으니까요', comps: ['네', '시간이', ['not much', '별로'], '안 남았으니까요'] } });
s(281, { S0281L01: { target: '시작하기 전에 커피를 다 마셔도 괜찮아요', comps: ['시작하기 전에', '커피를', '다 마셔도', '괜찮아요'] } });
s(283, { S0283L01: { target: '친구들 중에 누가 한국어를 말해요', comps: ['친구들 중에', '누가', '한국어를', '말해요'] } });
s(285, { S0285L01: { target: '그녀는 한국어를 말해요', comps: ['그녀는', '한국어를', '말해요'] } });
s(294, { S0294L01: { target: '오늘 밤에 전화할 시간이 충분하지 않아요', comps: ['오늘 밤에', '전화할', '시간이', ["isn't enough", '충분하지 않아요']] } });
s(297, { S0297L01: { target: '한국어를 말하는 사람을 많이 알지 못해요', comps: ['한국어를', '말하는', '사람을', '많이', '알지 못해요'] } });
s(299, { S0299L01: { target: '그는 반만 내고 싶어해요', comps: ['그는', '반만', '내고 싶어해요'] } });
s(300, { S0300L01: { target: '그녀는 불친절해 보이고 싶어하지 않아요', comps: ['그녀는', '불친절해', '보이고', '싶어하지 않아요'] } });
s(381, { S0381L01: { target: '싶어하는지' } });

// Phrases that carry a changed LEGO's old Korean but do not name it in their decomposition, read one by one in the knock-on
// pass and judged to be the SAME expression (English holds the LEGO's English): they follow, so the course says one thing.
// Phrases that look alike but mean something else (보고 싶었지만 = wanted to see the games; 걱정하지 않아도 돼요 = you needn't worry;
// S0177/S0382/S0400 싶은지 = where she wants to go) are deliberately NOT here.
const FIXES = [
  ...['S0228L01U09', 'S0392L03B05', 'S0392L03U08', 'S0393L04B04', 'S0394L03U06'].map((id) => [id, '걱정하지 않아도 돼요', '걱정하면 안 돼요']),
  ...['S0153L01U09', 'S0316L01U08', 'S0320L01U09', 'S0371L01U09'].map((id) => [id, '원하는 걸 알았더라면', '뭘 원했는지 알았더라면']),
  ['S0223L01U09', '거기 있을 수 없을 거예요', '거기에 있지 못할 거예요'],
  ...['S0211L01U12', 'S0218L01U11', 'S0260L01B06', 'S0298L01U10', 'S0213L01U11'].map((id) => [id, '다른 거 이야기해요', '다른 것에 대해 이야기해요']),
  ['S0298L01U09', '재미있다고 생각해요', '그건 재미있는 것 같아요'],
  ...['S0193L01U09', 'S0237L01U10', 'S0246L01U09', 'S0447L01U10', 'S0318L01U10'].map((id) => [id, '보고 싶었지만', '만나고 싶었지만']),
  ['S0316L01U09', '몇 가지 질문해도 될까요', '질문 몇 개 해도 괜찮아요'],
  ['S0356L01U06', '중요한 것일 수도 있다고 생각해요', '중요한 거일 수도 있는 것 같아요'],
  ...['S0381L03B03', 'S0381L03U01', 'S0381L03U05', 'S0381L02U04', 'S0381L02U02'].map((id) => [id, '싶은지', '싶어하는지']),
];

const HOLD = {
  77: 'the seed splits "how quickly I\'m starting to understand" differently from the LEGO (known side of S0077L02 would change, so its English intro clip too). Needs the intro line authored.',
  92: 'seed has "잠시 동안" (for a while) where the LEGO S0092L02 is "좀 더" (for a while longer): known side of the LEGO changes, so its English intro clip too.',
  149: 'the seed folds "so" into "어렵지 않으니까"; moving it means the known side of S0149L01/L02 changes, so their English intro clips too.',
  108: 'the seed\'s own English and Korean disagree: English "didn\'t hope to wake", Korean 일어나고 싶지 않았어요 = "didn\'t want to get up". Following the seed would teach "hope" = 싶다 in 14 phrases. Kai: fix the seed English, or keep 깨기를 바라지 않았어요?',
  131: 'the seed\'s own English and Korean disagree: English "too many ideas going around in my head", Korean 머리에 생각이 너무 많아요 = "I have too many thoughts". Following the seed teaches "going around" = nothing in 15 phrases.',
  558: 'the seed puts 너무 inside the LEGO (밤이 너무 늦었어요); S0558L01 이렇게 + S0558L02 밤이 늦었어요 cannot tile it without a re-cut of both.',
  618: 'the seed is 오래된 것 같지 않아요 (it doesn\'t seem old); the LEGOs are 오랜 시간처럼 + 느껴지지 않아요 (like a long time + doesn\'t feel). Different construction: a re-cut, not a swap.',
  624: 'S0624L03 (please = 감사합니다) has no counterpart anywhere in the seed Korean 네, 그러면 좋겠어요. A LEGO cannot be deleted; needs a decision.',
  631: 'seed 뭘 드릴까요 = "what shall I give you / what can I get you"; the LEGO 드시겠어요 = "will you have". Changing the LEGO moves every "would you like…?" phrase to an offer wording.',
  633: 'the seed Korean 큰 물 한 잔이면 ("big water, one glass") is not how Korean says a large glass of water (큰 컵 / 큰 잔). The seed itself may be wrong.',
  662: 'S0662 LEGOs are all not-new duplicates (여러분 / 그걸 / 말해요) and the seed adds 다 and 그거 — a not-new LEGO cannot be rewritten; needs a new LEGO design.',
};
module.exports = { COURSE: 'kor_for_eng', D, HOLD, FIXES };
