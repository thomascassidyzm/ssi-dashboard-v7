// Authoring source for the kor_for_eng opening draft v2 (job #845, on top of #552). FIRST 20 INTRO ITEMS ONLY.
// Aran's rulings of 2026-11-23 (he is methodology lead) are binding here:
//   R1 verb intros: English is the infinitive ("to do"); explain when the form also means "I do"/"doing".
//   R2 "often" early; "as often as possible" (가능한 한 자주) not before seed 50.
//   R3 해요 before 하고 싶어요, then alternate.   R4 말해요 before 말하고 싶어요, then alternate.
//   R5 배워요 before 배우려고 해요, then alternate.  R6 after lots of that: 배우고 싶어요 and 말하려고 해요.
//   R7 "how to speak" (말하는 방법) explains why it differs from "I speak" (말해요).
// Usage: curl -s -H 'x-agent-id: you' http://localhost:3470/api/production/kor_for_eng/course-editor > ed.json
//        node kor-opening-v2-src.cjs ed.json kor-opening-v2-draft.json kor-opening-v2-review.json
// A DRAFT: nothing here writes to the course. K keep, E edit (target and/or known), R remove,
// D defer (out of the opening, back after seed 50), N new line (the editor cannot insert yet), X explanation note.
// A kept line is reported as a move when its intro differs from today's. Lines of today's intros 1-20 that are not
// placed, removed or deferred here follow after item 20 unchanged (`after20` in the output).
const fs = require('fs')
const ed = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
const byId = new Map(ed.items.map((it) => [it.id, it]))
const todayIntro = new Map(); let n = 0
for (const it of ed.items) { if (it.t === 'l') n++; todayIntro.set(it.id, n) }
const K = (id, why) => ({ id, change: 'keep', why: why || '' })
const E = (id, target, known, why) => ({ id, change: 'edit', target, known, why })
const R = (id, why) => ({ id, change: 'remove', why })
const D = (id, why) => ({ id, change: 'defer', why: why || 'R2: "as often as possible" waits until after seed 50' })
const N = (kind, target, known, why) => ({ id: 'NEW', kind, change: 'new', target, known, why })
const X = (text) => ({ explain: text })
const DUP = 'same words as its LEGO; the player already skips it'
const NATIVE = 'check with a native speaker'
const plan = [
  // 1 해요
  E('S0002L01', null, 'to do', 'R1: infinitive English (was "do")'),
  X('해요 can also mean "I do", "I\'m doing" or "let\'s do". The situation tells you which.'),
  // 2 지금
  K('S0001L02'),
  K('S0002L01B03'),
  // 3 같이
  K('S0001L03'),
  K('S0002L01U01'), K('S0002L01U04'),
  // 4 자주 (R2: often early)
  K('S0003L01'),
  K('S0003L01B02'), K('S0003L01B03'),
  // 5 하고 싶어요 (R3: after 해요)
  N('lego', '하고 싶어요', 'to want to do', 'R3: "I want to do" after "I do"; also makes 말하고 싶어요 later cost one new syllable'),
  X('하고 싶어요 can also mean "I want to do". 해요 is "I do"; 하고 싶어요 is "I want to do".'),
  N('phrase', '지금 하고 싶어요', 'I want to do it now', 'R3'),
  N('phrase', '같이 하고 싶어요', 'I want to do it together', 'R3'),
  N('phrase', '자주 하고 싶어요', 'I want to do it often', 'R3'),
  N('phrase', '지금 같이 하고 싶어요', 'I want to do it together now', 'R3'),
  // 6 한국어로
  K('S0001L04'),
  K('S0002L01U03'),
  N('phrase', '한국어로 하고 싶어요', 'I want to do it in Korean', 'R3: switch between "I do" and "I want to do"'),
  K('S0002L01U05'),
  K('S0003L01U04'),
  K('S0002L01U06'),
  // 7 말해요 (R4: "I speak" first)
  E('S0009L01', null, 'to speak', 'R1: infinitive English (was "speak")'),
  X('말해요 can also mean "I speak" or "I\'m speaking". It is 말 (words) plus the 해요 you already know.'),
  E('S0009L01B01', null, "I'm speaking now", 'R4: a whole sentence (was "speak now"); Korean recording kept'),
  E('S0009L01B02', null, 'I speak Korean', 'R4: a whole sentence (was "speak Korean"); Korean recording kept'),
  K('S0009L01U02'),
  N('phrase', '같이 말해요', "let's talk together", 'R4: a short line with known words'),
  // 8 말하고 싶어요 (R4: after 말해요; alternate)
  E('S0001L01', null, 'to want to speak', 'R1: infinitive English (was "want to speak")'),
  X('말하고 싶어요 can also mean "I want to speak". Same ending as 하고 싶어요.'),
  R('S0001L01B01', DUP),
  K('S0001L01B02'),
  K('S0001L02B01'),
  K('S0009L01U01'),
  K('S0001L04B02'),
  K('S0003L01U03'),
  K('S0001L03B02'),
  E('S0009L01U05', null, "let's speak Korean together now", 'R4: the English said "I speak Korean together now"; Korean recording kept'),
  K('S0001L04U06', 'keep: the whole first seed sentence (14 syllables, nothing new)'),
  // 9 배워요 (R5: "I learn" first)
  N('lego', '배워요', 'to learn', 'R5: "I learn" before "I\'m trying to learn". Not in the course at all today'),
  X('배워요 can also mean "I learn" or "I\'m learning".'),
  N('phrase', '지금 배워요', "I'm learning now", 'R5'),
  N('phrase', '같이 배워요', "let's learn together", 'R5'),
  // 10 배우려고 해요 (R5: alternate)
  E('S0002L02', null, 'to try to learn', 'R1: infinitive English (was "I\'m trying to learn")'),
  X('배우려고 해요 can also mean "I\'m trying to learn". 배워요 is "I learn"; 배우려고 해요 is "I\'m trying to learn".'),
  R('S0002L02B01', DUP),
  K('S0002L02B04'),
  N('phrase', '자주 배워요', 'I learn often', 'R5: switch between "I learn" and "I\'m trying to learn". ' + NATIVE),
  K('S0003L01U02'),
  N('phrase', '지금 같이 배워요', "let's learn together now", 'R5'),
  K('S0002L02U01'),
  K('S0002L02U02'),
  K('S0002L02U03'),
  K('S0002L02U04'),
  // 11 말하는 방법 (R7)
  K('S0003L03'),
  X('말하는 방법 means "the way to speak". It names a thing; it is not a sentence. 말해요 says "I speak"; 말하는 방법 sits inside a sentence, as in "I\'m trying to learn how to speak".'),
  R('S0003L03B01', DUP),
  K('S0003L03B02'),
  N('phrase', '말하는 방법 배워요', "I'm learning how to speak", 'R5 alternation. ' + NATIVE + ': 방법을 (with the object marker) may sound more natural'),
  K('S0003L03B03', NATIVE + ': 방법을 may sound more natural'),
  D('S0003L03B04'),
  R('S0003L03U01', '13 syllables; the same pattern is practised in B03 (as #552)'),
  R('S0003L03U02', '13 syllables, and "learn how to speak together" is an odd thing to say (as #552)'),
  R('S0003L03U03', '15 syllables; the pattern is already practised (as #552)'),
  D('S0003L03U04'),
  // 12 뭔가를
  K('S0004L01'),
  K('S0004L01B01'),
  N('phrase', '뭔가를 하고 싶어요', 'I want to do something', 'R3: switch between "I do" and "I want to do"'),
  K('S0004L01B02'), K('S0004L01B03'),
  K('S0004L01U02'),
  K('S0004L01U03'),
  N('phrase', '뭔가를 배워요', "I'm learning something", 'R5: switch between "I learn" and "I\'m trying to learn"'),
  K('S0004L01U04'), K('S0004L01U05'),
  R('S0004L01U07', '13 syllables; 뭔가를 already has nine shorter lines (as #552)'),
  K('S0004L01U08'),
  // 13 할 거예요
  E('S0005L01', null, 'to be going to do', 'R1: infinitive English (was "I\'m going to do")'),
  X('할 거예요 can also mean "I\'m going to do" or "I will do".'),
  R('S0005L01B01', DUP),
  N('phrase', '지금 할 거예요', "I'm going to do it now", 'short line first (as #552)'),
  N('phrase', '같이 할 거예요', "we're going to do it together", 'short line first (as #552)'),
  K('S0005L01B03'), K('S0005L01U01'), K('S0005L01U02'), K('S0005L01U03'), K('S0005L01U05'),
  // 14 사람과 (#552 split)
  N('lego', '사람과', 'with people', '#552: splits 다른 사람과 (5 new at once) into 3 + 2. ' + NATIVE + ': 사람들과 may sound more natural'),
  N('phrase', '사람과 말하고 싶어요', 'I want to talk with people', NATIVE + ' (사람들과?)'),
  N('phrase', '사람과 말해요', 'I talk with people', 'R4 alternation. ' + NATIVE + ' (사람들과?)'),
  // 15 다른 사람과
  K('S0005L02'),
  R('S0005L02B01', DUP),
  N('phrase', '다른 사람과 해요', 'I do it with someone else', 'short line first (as #552)'),
  N('phrase', '다른 사람과 같이 해요', "let's do it together with someone else", 'as #552'),
  K('S0005L02B04'),
  K('S0009L01U03'),
  K('S0005L02U01'),
  N('phrase', '다른 사람과 배워요', 'I learn with someone else', 'R5: switch between "I learn" and "I\'m trying to learn"'),
  K('S0005L02U03'),
  R('S0005L02U04', '13 syllables; B04 already practises it (as #552)'),
  R('S0005L02U05', '13 syllables, and "with someone else together" says the same thing twice (as #552)'),
  // 16 말하는 연습을
  E('S0005L03', null, 'practise speaking', 'UK spelling of the verb (was "practice"); spoken words unchanged, recordings kept'),
  R('S0005L03B01', DUP),
  E('S0005L03B03', null, 'I practise speaking', 'UK spelling of the verb (was "practice"); spoken words unchanged, recordings kept'),
  N('phrase', '말하는 연습을 하고 싶어요', 'I want to practise speaking', 'R3: switch between "I do" and "I want to do"'),
  N('phrase', '같이 말하는 연습을 해요', "let's practise speaking together", 'as #552'),
  N('phrase', '자주 말하는 연습을 해요', 'I practise speaking often', 'as #552'),
  E('S0005L03U01', null, "I'm going to practise speaking", 'UK spelling of the verb (was "practice"); spoken words unchanged, recordings kept'),
  E('S0005L03U02', null, "I'm going to practise speaking now", 'UK spelling of the verb (was "practice"); spoken words unchanged, recordings kept'),
  R('S0005L03U03', '13 syllables; the seed line just after it says nearly the same (as #552)'),
  R('S0005L03U04', '14 syllables; nothing in it is new (as #552)'),
  E('S0005L03U05', null, "I'm going to practise speaking with someone else", 'the whole seed sentence; ' + 'UK spelling of the verb (was "practice"); spoken words unchanged, recordings kept'),
  D('S0005L03U06'),
  // 17 단어 하나를
  K('S0006L01'),
  R('S0006L01B01', DUP),
  K('S0006L01B04'),
  N('phrase', '단어 하나를 배워요', "I'm learning a word", 'R5: switch between "I learn" and "I\'m trying to learn"'),
  K('S0006L01U01'),
  N('phrase', '단어 하나를 말해요', "I'm saying a word", 'R4: switch between "I say" and "I want to say". ' + NATIVE),
  R('S0006L01U02', '13 syllables; nothing in it is new (as #552)'),
  R('S0006L01U04', '15 syllables (as #552)'),
  R('S0006L01U05', '15 syllables; nothing in it is new (as #552)'),
  // 18 배우고 싶어요 (R6) — today's intro 55, moved up; its own lines there need words not yet taught and stay behind
  E('S0020L03', null, 'to want to learn', 'R1: infinitive English (was "want to learn"); R6: moved up from intro 55'),
  X('배우고 싶어요 can also mean "I want to learn". You now have three: 배워요 (I learn), 배우려고 해요 (I\'m trying to learn), 배우고 싶어요 (I want to learn).'),
  N('phrase', '지금 배우고 싶어요', 'I want to learn now', 'R6'),
  N('phrase', '같이 배우고 싶어요', 'I want to learn together', 'R6'),
  N('phrase', '뭔가를 배우고 싶어요', 'I want to learn something', 'R6'),
  N('phrase', '다른 사람과 배우고 싶어요', 'I want to learn with someone else', 'R6'),
  N('phrase', '말하는 방법 배우고 싶어요', 'I want to learn how to speak', 'R6. ' + NATIVE + ': 방법을 may sound more natural'),
  // 19 말하려고 해요 (R6)
  N('lego', '말하려고 해요', 'to try to speak', 'R6: the second crossover. Not a LEGO in the course today'),
  X('말하려고 해요 can also mean "I\'m trying to speak". Same ending as 배우려고 해요.'),
  N('phrase', '지금 말하려고 해요', "I'm trying to speak now", 'R6'),
  N('phrase', '한국어로 말하려고 해요', "I'm trying to speak Korean", 'R6'),
  N('phrase', '자주 말하려고 해요', "I'm trying to speak often", 'R6'),
  N('phrase', '뭔가를 말하려고 해요', "I'm trying to say something", 'R6'),
  N('phrase', '다른 사람과 말하려고 해요', "I'm trying to speak with someone else", 'R6'),
  // 20 기억하려고 해요
  E('S0006L02', null, 'to try to remember', 'R1: infinitive English (was "trying to remember")'),
  X('기억하려고 해요 can also mean "I\'m trying to remember". Same ending as 배우려고 해요 and 말하려고 해요.'),
  R('S0006L02B01', DUP),
  N('phrase', '같이 기억하려고 해요', "we're trying to remember together", 'short line first (as #552)'),
  K('S0006L02B03'), K('S0006L02U01'), K('S0006L02U03', 'keep: the whole seed sentence'),
  D('S0006L02U04'),
  R('S0006L02U05', '16 syllables; nothing in it is new (as #552)'),
  // R2 deferrals outside the 20 items: 가능한 한 자주 itself and its lines, and the later lines before seed 50 that use it
  D('S0003L02'), D('S0003L02B01'), D('S0003L02B03'), D('S0003L02B04'), D('S0003L02U02'), D('S0003L02U03'), D('S0003L02U04'),
  D('S0009L01U04'), D('S0011L02U05'), D('S0015L03U08'),
]
const seen = new Set()
for (const p of plan) {
  if (p.explain || p.id === 'NEW') continue
  if (!byId.has(p.id)) throw new Error('unknown id ' + p.id)
  if (seen.has(p.id)) throw new Error('twice: ' + p.id)
  seen.add(p.id)
}
let pos = 0, intro = 0, legoToday = null
const lines = []
for (const p of plan) {
  if (p.explain) { lines[lines.length - 1].explain = p.explain; continue }
  const cur = p.id === 'NEW' ? null : byId.get(p.id)
  const kind = p.kind || (cur.t === 'l' ? 'lego' : 'phrase')
  const out = p.change === 'remove' || p.change === 'defer'
  if (kind === 'lego' && !out) { intro++; legoToday = cur ? todayIntro.get(cur.id) : null }
  const target = p.target || (cur && cur.tx), known = p.known || (cur && cur.kn)
  const was = cur ? todayIntro.get(cur.id) : null
  const moved = !out && cur && (kind === 'lego' ? was !== intro : was !== legoToday)
  lines.push({ pos: out ? null : ++pos, intro: out ? null : intro, id: p.id, kind, change: p.change, moved: !!moved, out,
    target, known, current: cur ? { target: cur.tx, known: cur.kn, intro: was } : null, why: p.why || '' })
}
const after20 = ed.items.filter((it) => todayIntro.get(it.id) <= 20 && !seen.has(it.id))
  .map((it) => ({ id: it.id, kind: it.t === 'l' ? 'lego' : 'phrase', target: it.tx, known: it.kn, todayIntro: todayIntro.get(it.id) }))
const strip = ({ out, ...l }) => l
fs.writeFileSync(process.argv[3], JSON.stringify({ course: 'kor_for_eng', scope: 'first 20 intro items (v2, Aran rulings 2026-11-23)',
  builtFrom: 'GET /api/production/kor_for_eng/course-editor, 2026-11-23', lines: lines.filter((l) => !l.out).map(strip),
  outOfOpening: lines.filter((l) => l.out).map(strip), after20 }, null, 1))
// review items: ACCEPT = keep this proposal
const review = lines.filter((l) => l.change !== 'keep' || l.moved).map((l) => ({
  id: l.id === 'NEW' ? `NEW at intro ${l.intro}` : `${l.id}${l.intro ? ' at intro ' + l.intro : ''}`,
  source: l.current ? `${l.current.target} - ${l.current.known} (today: intro ${l.current.intro})` : '(new line, nothing here now)',
  proposed: l.change === 'remove' ? `Remove this line · ${l.why}`
    : l.change === 'defer' ? `Take out of the opening; bring back after seed 50 · ${l.why}`
    : `${l.moved ? 'Move to ' : ''}intro ${l.intro}: ${l.target} - ${l.known}${l.explain ? ' · explanation: ' + l.explain : ''}${l.why ? ' · ' + l.why : ''}`,
}))
fs.writeFileSync(process.argv[4], JSON.stringify(review, null, 1))
const c = {}; for (const l of lines) { const k = l.change + (l.moved ? '+move' : ''); c[k] = (c[k] || 0) + 1 }
console.log(JSON.stringify(c), 'lines heard:', pos, 'intros:', intro, 'after20:', after20.length)
