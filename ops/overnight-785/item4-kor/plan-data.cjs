'use strict';
// ITEM 4 of Kai's overnight run #785·AK (Kai's Y 23 Nov 11:02Z): kor_for_eng held fixes from #420·AI (d/c38294a1), including
// the S0082 duplicate rows. Found by cs #789·AK on the 23 Nov copy: the #420·AI family items were ALREADY APPLIED by #432·AI
// (31 of 34 items, 17 Nov, 38 events cd4a1d17…51148a4d, ops/kor-held-432) and #484·AI (seeds 633/656/662/664, ops/kor-held-484);
// spot-read on the copy: 248 그 영화는, 210 논의, 186 다른 것에 대해, 581 조금 더, 628 좋아해요?, 236, 200 all carry the fix.
// What is left is the S0082 duplicates #432·AI's 왜요 re-gloss created / left: the same prompt twice in one basket.
//   S0082L01: B02 = B01 exactly; U01 = B03 and U05 = B04 exactly → delete B02, U01, U05 (6 USE rows remain).
//   S0082L02: B02 = B01 exactly; B03 "but why not" = U02 "but why not?" → delete B02, B03 (keep the USE question).
// 0 characters: deletes only (clips stay in the library; make-before-break has nothing to break).
const D = { course: 'kor_for_eng', job: 'cs #789·AK item 4', seeds: {}, legos: {}, legoInsert: [], legoDelete: [], rep: {}, repEn: {}, phrases: {}, phraseInsert: [], items: [] };
D.intro = (known) => `The Korean for: '${known}', is: <break time="300ms"/> <break time="10ms"/>`;
D.approval = 'kai:2026-11-23:kor_for_eng held fixes (item 4 of the overnight run, Kai Y 23 Nov 11:02Z)';
D.purpose = 'kor_for_eng S0082 duplicate rows (#420·AI held list), Kai overnight run #785·AK item 4, cs #789·AK';
D.items.push({ n: 82, label: 'S0082L01 B02/U01/U05 + S0082L02 B02/B03 duplicates deleted' });
Object.assign(D.phrases, { S0082L01B02: null, S0082L01U01: null, S0082L01U05: null, S0082L02B02: null, S0082L02B03: null });
module.exports = D;
