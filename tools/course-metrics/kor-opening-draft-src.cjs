// Authoring source for the kor_for_eng opening draft (job #552). Builds the draft JSON + review JSON from the editor list.
// Usage: curl -s -H 'x-agent-id: you' http://localhost:3470/api/production/kor_for_eng/course-editor > ed.json
//        node kor-opening-draft-src.cjs ed.json kor-opening-draft.json kor-opening-current.json kor-opening-edit-only.json kor-opening-review.json
// A DRAFT: nothing here writes to the course. Each plan entry: K keep, M move (needs a running-order / LEGO-order change),
// E edit (new recording), R remove, N new line (the editor cannot insert yet).
const fs = require('fs')
const ed = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
process.argv.splice(2, 1)
const byId = new Map(ed.items.map((it) => [it.id, it]))
const K = (id, why) => ({ id, why: why || 'keep' })
const M = (id, why) => ({ id, change: 'move', why })
const E = (id, target, known, why) => ({ id, change: 'edit', target, known, why })
const R = (id, why) => ({ id, change: 'remove', why })
const N = (kind, target, known, why) => ({ id: 'NEW', kind, change: 'new', target, known, why })
const DUP = 'same words as its LEGO; the player already skips it'
const plan = [
  // 1 해요 first: two of the most common syllables in the course, and a real thing to say
  M('S0002L01', 'first LEGO: 2 syllables, both among the most used in Korean (해, 요), instead of 6 new at once'),
  // 2 지금
  M('S0001L02', 'second LEGO so the learner can already say a whole line'),
  M('S0002L01B03', 'moves under 지금: first full sentence, 4 syllables'),
  // 3 같이
  M('S0001L03', 'third LEGO'),
  M('S0002L01U01', 'moves under 같이: "let\'s do it together" is a real thing to say to someone'),
  M('S0002L01U04', 'moves under 같이: first 6-syllable sentence, all of it already known'),
  // 4 NEW 하고 싶어요
  N('lego', '하고 싶어요', 'want to do', 'NEW LEGO: brings in 하고 싶어요 (4 new) so 말하고 싶어요 later adds only 말. Splits the current 6-new first item in two'),
  N('phrase', '지금 하고 싶어요', 'I want to do it now', 'NEW: practise the new ending with known words'),
  N('phrase', '같이 하고 싶어요', 'I want to do it together', 'NEW: same, warm and sayable'),
  N('phrase', '지금 같이 하고 싶어요', 'I want to do it together now', 'NEW: longest line so far, nothing new in it'),
  // 5 말하고 싶어요
  M('S0001L01', 'now adds just one new syllable (말)'),
  R('S0001L01B01', DUP),
  K('S0001L01B02'),
  K('S0001L02B01'),
  K('S0001L03B02'),
  K('S0001L03U01'),
  // 6 한국어로
  K('S0001L04', 'keep (3 new: 한, 국, 로)'),
  M('S0002L01U03', 'moves under 한국어로: short line first (6 syllables)'),
  K('S0001L04B02'),
  M('S0002L01U05', 'moves under 한국어로'),
  M('S0002L01U06', 'moves under 한국어로'),
  K('S0001L04U03'),
  K('S0001L04U02'),
  R('S0001L04U04', 'same Korean as U06 with a second English for it; keep the one that matches the seed'),
  R('S0001L04U05', 'same words reshuffled, 14 syllables, adds nothing new to practise'),
  K('S0001L04U06', 'keep: the whole first sentence, the first milestone (14 syllables, nothing new)'),
  // 7 배우려고 해요
  K('S0002L02', 'keep (3 new: 배, 우, 려)'),
  R('S0002L02B01', DUP),
  K('S0002L02B04'), K('S0002L02U01'), K('S0002L02U02'), K('S0002L02U03'), K('S0002L02U04'),
  // 8 자주
  K('S0003L01'), K('S0003L01B02'), K('S0003L01B03'), K('S0003L01U02'), K('S0003L01U03'), K('S0003L01U04'), K('S0003L01U05'),
  // 9 가능한 한 자주
  K('S0003L02', 'keep (only 가, 능 new: 한 came with 한국어)'),
  R('S0003L02B01', DUP),
  K('S0003L02B03'), K('S0003L02B04'), K('S0003L02U02'), K('S0003L02U03'), K('S0003L02U04'),
  // 10 말하는 방법
  K('S0003L03'),
  R('S0003L03B01', DUP),
  K('S0003L03B02'), K('S0003L03B03', 'keep (check with a native speaker: 방법을 with the object marker may sound more natural)'),
  K('S0003L03B04'),
  R('S0003L03U01', '13 syllables; the same pattern is practised in B03 at 11'),
  R('S0003L03U02', '13 syllables, and "learn how to speak together" is an odd thing to say'),
  R('S0003L03U03', '15 syllables; the same pattern is already practised in U01 and U02'),
  R('S0003L03U04', '17 syllables, the longest line in the opening; nothing in it is new'),
  // 11 뭔가를
  K('S0004L01'), K('S0004L01B01'), K('S0004L01B02'), K('S0004L01B03'), K('S0004L01U02'), K('S0004L01U03'), K('S0004L01U04'), K('S0004L01U05'), R('S0004L01U07', '13 syllables; 뭔가를 already has eight shorter lines'), K('S0004L01U08'),
  // 12 할 거예요
  K('S0005L01', 'keep (3 new: 할, 거, 예)'),
  R('S0005L01B01', DUP),
  N('phrase', '지금 할 거예요', "I'm going to do it now", 'NEW: a short line before the longer ones'),
  N('phrase', '같이 할 거예요', "we're going to do it together", 'NEW: same'),
  K('S0005L01B03'), K('S0005L01U01'), K('S0005L01U02'), K('S0005L01U03'), K('S0005L01U05'),
  // 13 NEW 사람과
  N('lego', '사람과', 'with people', 'NEW LEGO: splits 다른 사람과 (5 new at once) into 3 + 2. Check with a native speaker: 사람들과 may sound more natural'),
  N('phrase', '사람과 말하고 싶어요', 'I want to talk with people', 'NEW: check with a native speaker (사람들과?)'),
  // 14 다른 사람과
  K('S0005L02', 'keep (now only 다, 른 new)'),
  R('S0005L02B01', DUP),
  N('phrase', '다른 사람과 해요', 'I do it with someone else', 'NEW: 6 syllables before the longer lines'),
  N('phrase', '다른 사람과 같이 해요', "let's do it together with someone else", 'NEW: short and sayable'),
  K('S0005L02B04'), K('S0005L02U01'), K('S0005L02U03'),
  R('S0005L02U04', '13 syllables; B04 already practises it'),
  R('S0005L02U05', '13 syllables, and "with someone else together" says the same thing twice'),
  // 15 말하는 연습을
  K('S0005L03', 'keep (3 new: 연, 습, 을)'),
  R('S0005L03B01', DUP),
  K('S0005L03B03'),
  N('phrase', '같이 말하는 연습을 해요', "let's practise speaking together", 'NEW: a 10-syllable line before the 12-15 syllable ones'),
  N('phrase', '자주 말하는 연습을 해요', 'I practise speaking often', 'NEW: 10 syllables, all known'),
  K('S0005L03U01'), K('S0005L03U02'),
  R('S0005L03U03', '13 syllables; the seed line just after it says nearly the same'),
  R('S0005L03U04', '14 syllables; nothing in it is new'), K('S0005L03U05', 'keep: the whole seed sentence'),
  R('S0005L03U06', '16 syllables; nothing in it is new'),
  // 16 단어 하나를
  K('S0006L01'),
  R('S0006L01B01', DUP),
  K('S0006L01B04'), K('S0006L01U01'),
  R('S0006L01U02', '13 syllables; nothing in it is new'),
  R('S0006L01U04', '15 syllables; U01 and U02 already practise it'),
  R('S0006L01U05', '15 syllables; nothing in it is new'),
  // 17 기억하려고 해요
  K('S0006L02'),
  R('S0006L02B01', DUP),
  N('phrase', '같이 기억하려고 해요', "we're trying to remember together", 'NEW: a short line first'),
  K('S0006L02B03'), K('S0006L02U01'), K('S0006L02U03', 'keep: the whole seed sentence'),
  R('S0006L02U04', '13 syllables; nothing in it is new'),
  R('S0006L02U05', '16 syllables; nothing in it is new'),
  // 18 오늘
  K('S0007L01'),
  N('phrase', '오늘 해요', "I'm doing it today", 'NEW: 4 syllables, the new word first in a tiny line'),
  E('S0007L01B01', '오늘 같이 해요', "let's do it together today", 'a whole sentence instead of the fragment "today together" (spoken words change: new recording)'),
  K('S0007L01B02'), K('S0007L01U05'), K('S0007L01U01'), K('S0007L01U02'),
  R('S0007L01U03', '14 syllables; nothing in it is new'),
  R('S0007L01U04', '14 syllables; nothing in it is new'),
  // 19 열심히
  K('S0007L02', 'keep (3 new: 열, 심, 히)'),
  K('S0007L02B01'), K('S0007L02B02'),
  N('phrase', '같이 열심히 해요', "let's work hard together", 'NEW: one more short line before the longer ones'),
  K('S0007L02U02'), K('S0007L02U05'), K('S0007L02U03'),
  // 20 최대한 열심히
  K('S0007L03'),
  R('S0007L03B02', DUP),
  N('phrase', '최대한 열심히 해요', 'I do it as hard as I can', 'NEW: 8 syllables first'),
  N('phrase', '최대한 열심히 할 거예요', "I'm going to do it as hard as I can", 'NEW: 10 syllables, all known'),
  K('S0007L03U02'),
  R('S0007L03U05', '14 syllables; the seed line two items later carries the same words'),
  R('S0007L03U03', '16 syllables; nothing in it is new'),
  // 21 해 보고 싶어요
  K('S0007L04', 'keep (only 보 new)'),
  R('S0007L04B02', DUP),
  N('phrase', '지금 해 보고 싶어요', 'I want to try it now', 'NEW: short line first'),
  N('phrase', '같이 해 보고 싶어요', 'I want to try it together', 'NEW: short line first'),
  K('S0007L04U03'), K('S0007L04U01'), K('S0007L04U05', 'keep: the whole seed sentence'),
  // 22 무슨 뜻인지
  K('S0008L01', 'keep (4 new: 무, 슨, 뜻, 인). No natural shorter piece; check with a native speaker whether 무슨 뜻 could come first'),
  R('S0008L01B02', DUP),
  K('S0008L01U03'), K('S0008L01U01'),
  N('phrase', '무슨 뜻인지 말하고 싶어요', 'I want to say what I mean', 'NEW: 11 syllables, and exactly what a learner wants to say in a first chat'),
  R('S0008L01U04', '13 syllables; brings in 기억해 as a new form at the heaviest point of the opening'),
  R('S0008L01U05', '13 syllables; its English says "going to learn" for 배우려고 해요 (trying to learn)'),
  // 23 설명해 볼 거예요
  K('S0008L02', 'keep (3 new: 설, 명, 볼)'),
  R('S0008L02B02', DUP),
  N('phrase', '지금 설명해 볼 거예요', "I'm going to try to explain now", 'NEW: short line first'),
  K('S0008L02B03'),
  N('phrase', '같이 설명해 볼 거예요', "we're going to try to explain it together", 'NEW: 9 syllables, all known'),
  N('phrase', '한국어로 설명해 볼 거예요', "I'm going to try to explain in Korean", 'NEW: 11 syllables, all known'),
  K('S0008L02U01', 'keep: the whole seed sentence'),
  R('S0008L02U02', '14 syllables; nothing in it is new'),
  R('S0008L02U05', '14 syllables; nothing in it is new'),
]
const used = new Set(plan.filter((p) => p.id !== 'NEW').map((p) => p.id))
const opening = ed.items.slice(0, 135)
const missing = opening.filter((it) => !used.has(it.id)).map((it) => it.id)
if (missing.length) throw new Error('draft misses current items: ' + missing.join(' '))
for (const p of plan) if (p.id !== 'NEW' && !byId.has(p.id)) throw new Error('unknown id ' + p.id)
let pos = 0
const lines = plan.map((p) => {
  const cur = p.id === 'NEW' ? null : byId.get(p.id)
  const kind = p.kind || (cur.t === 'l' ? 'lego' : 'phrase')
  const change = p.change || 'keep'
  const target = p.target || (cur && cur.tx), known = p.known || (cur && cur.kn)
  const wordsChange = change === 'new' ? 'new recording' : change === 'edit' ? 'yes (new recording)' : change === 'remove' ? 'removed' : 'no (recording kept)'
  return { pos: change === 'remove' ? null : ++pos, id: p.id, kind, change, target, known, current: cur ? { target: cur.tx, known: cur.kn } : null, wordsChange, why: p.why }
})
fs.writeFileSync(process.argv[2], JSON.stringify({ course: 'kor_for_eng', scope: 'white belt, seeds 1-8 (current editor items 1-135)', builtFrom: 'GET /api/production/kor_for_eng/course-editor, 2026-11-22', lines }, null, 1))
// current opening in the same unit, for before/after
let lastLego = null
const curLines = opening.map((it) => { if (it.t === 'l') lastLego = it.tx; return { id: it.id, kind: it.t === 'l' ? 'lego' : 'phrase', target: it.tx, known: it.kn, change: it.t === 'p' && it.tx === lastLego ? 'remove' : 'keep' } })
fs.writeFileSync(process.argv[3], JSON.stringify({ course: 'kor_for_eng', lines: curLines }, null, 1))
// edit-only variant: current order, edits + removals applied, no moves, no inserts
const act = new Map(lines.filter((l) => l.id !== 'NEW').map((l) => [l.id, l]))
const eo = opening.map((it) => { const l = act.get(it.id); return { id: it.id, kind: it.t === 'l' ? 'lego' : 'phrase', target: l.target, known: l.known, change: l.change === 'remove' ? 'remove' : l.change } })
fs.writeFileSync(process.argv[4], JSON.stringify({ course: 'kor_for_eng', lines: eo }, null, 1))
// review items: ACCEPT = keep this proposal
const review = lines.filter((l) => l.change !== 'keep').map((l) => ({
  id: l.id === 'NEW' ? `NEW at ${l.pos}` : `${l.id}${l.pos ? ' at ' + l.pos : ''}`,
  source: l.current ? `${l.current.target} - ${l.current.known}` : '(new line, nothing here now)',
  proposed: l.change === 'remove' ? `Remove this line · ${l.why}`
    : l.change === 'move' ? `Move to position ${l.pos}: ${l.target} - ${l.known} · ${l.why}`
    : `${l.target} - ${l.known} · ${l.why}`,
}))
fs.writeFileSync(process.argv[5], JSON.stringify(review, null, 1))
const c = {}; for (const l of lines) c[l.change] = (c[l.change] || 0) + 1
console.log(JSON.stringify(c), 'lines heard:', pos)
