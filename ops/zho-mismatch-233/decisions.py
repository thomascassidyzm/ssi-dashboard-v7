#!/usr/bin/env python3
"""zho_for_eng #195 wave-1 mismatch rows (job #233, Kai approved 4 Nov 12:47Z) — every row read in full against LIVE.
Input: the 144 CONFIRM rows (cause != dropped-object) of ~/ssi-evidence/ssi-dashboard-v7/ops/mismatch-195/findings.jsonl
re-read against a live pull (argv[1] = GET /api/production/zho_for_eng/seeds). Output (beside this file):
  decisions-195.json  edits / deletes / holds in the zho-545 engine's format (DATA_DIR=ops/zho-mismatch-233)
  kept.json           rows left as they are (not a defect on reading, Tom's 试试 ruling, or already fixed live)
Rules applied: English first; Chinese only from taught chunks (the engine's P1 tiling refuses the rest); seeds, LEGO cuts,
LEGO-containment questions and naturalness calls are HELD for Kai; possessive/'some'/tense words Chinese leaves unsaid
are not defects (the dropped-object ruling's family) — listed in kept.json so Kai can overrule."""
import json, sys, os
HERE = os.path.dirname(os.path.abspath(__file__))
FIND = os.path.expanduser('~/ssi-evidence/ssi-dashboard-v7/ops/mismatch-195/findings.jsonl')

E = 'edit'; D = 'delete'; H = 'hold'; K = 'keep'
# id: (action, known | None, target | None, roman | None, why)
DEC = {
 'S0007L02U07': (K, None, None, None, "copy of seed 7; 'try as hard as I can' = 尽可能努力 is the idiom, and try rows stay as they are (Tom's 试试 ruling)"),
 'S0025L04U09': (H, 'are you going to help me before I go?', None, None, "copy of seed 25 — the fix is a SEED English edit ('have to' has no 得 in 我走之前), so it is Kai's call (S15)"),
 'S0033L01U05': (E, None, '你要练习多久？', 'nǐ yào liànxí duō jiǔ？', "'going to' had no 要"),
 'S0034L02U02': (E, "it's too quiet", None, None, "English first: no 这里 'here' in the Chinese (这里 is not taught by seed 34)"),
 'S0039L03U01': (E, "she's too tired this afternoon, she doesn't want to practise", None, None, "English first: the Chinese says 不想 'doesn't want to'"),
 'S0051L04U09': (K, None, None, None, "copy of seed 51; 和朋友 for 'with my friends' is natural Chinese (possessive left unsaid)"),
 'S0057L01U06': (K, None, None, None, "和朋友 for 'with my friends' is natural Chinese (possessive left unsaid)"),
 'S0059L01U09': (H, 'I know what I need to do next week', None, None, "copy of seed 59 — the SEED English says 'how to do', which the Chinese does not; a seed edit is Kai's call"),
 'S0077L01U04': (E, "I'm surprised you said this", None, None, "English first: the Chinese says 这个 'this'"),
 'S0086L02U09': (E, None, '可能会发生', 'kěnéng huì fāshēng', "'happen' had no 发生"),
 'S0101L04U01': (E, "I'm learning this language right now", None, None, "English first: no 'try' in the Chinese"),
 'S0106L01U04': (E, "we don't need to feel happy", None, None, "English first: no 'about this' in the Chinese"),
 'S0107L01U09': (H, 'we originally hoped to see what you were doing', None, None, "copy of seed 107 — the SEED English lacks its own LEGO 'originally | 本来'; a seed edit is Kai's call"),
 'S0108L01U08': (E, None, '我们需要改变这个半夜醒的事情', 'wǒmen xūyào gǎibiàn zhège bànyè xǐng de shìqing.', "'this' had no 这个"),
 'S0121L01U08': (K, None, None, None, "copy of seed 121; 用车 for 'use your car' is natural Chinese (possessive left unsaid)"),
 'S0144L02B01': (D, None, None, None, "'earlier than | 比我更早' lacks 'me'; corrected it is an exact twin of B02 'earlier than me | 比我更早', so deleted"),
 'S0150L01U07': (E, "do you remember what she's called?", None, None, "English first: 你记得…吗 is 'do you remember'"),
 'S0161L03U09': (K, None, None, None, "我想看一会儿书 for 'read my book' is natural Chinese (possessive left unsaid)"),
 'S0173L01B04': (E, None, '我觉得我自己能行', 'wǒ juéde wǒ zìjǐ néng xíng', "'I think' is taught as 我觉得; 我想 is taught as 'I want'"),
 'S0197L01U15': (E, 'I speak Chinese with the teacher as much as possible', None, None, "English first: no 'try' in the Chinese"),
 'S0198L03U03': (E, None, '我需要去政府办公室', 'wǒ xūyào qù zhèngfǔ bàngōngshì。', "'office' had no 办公室"),
 'S0221L01U07': (K, None, None, None, "和朋友 for 'with my friend' is natural Chinese (possessive left unsaid)"),
 'S0251L03U02': (E, "let's finish this work, we'll deal with it later", None, None, "English first: no 先 'first' in the Chinese"),
 'S0272L01B03': (K, None, None, None, "好啊我去 is how Chinese says 'sure, I'll go'; Chinese does not mark the future here and 会 would make it a prediction"),
 'S0272L01B05': (K, None, None, None, "好啊我也去 is 'sure, I'll go too'; no 会 needed (as B03)"),
 'S0272L01B06': (K, None, None, None, "好啊我现在去 is 'sure, I'll go now'; no 会 needed (as B03)"),
 'S0273L01U02': (E, "no, I can't do that", None, None, "English first: no 'sorry' in the Chinese; 不行 is the LEGO 'no'"),
 'S0311L03U04': (E, 'I need three days', None, None, "English first: no 'more' in the Chinese (再三天 is not Chinese)"),
 'S0313L01U04': (E, 'I need five days', None, None, "English first: no 'more' in the Chinese"),
 'S0332L02U07': (E, 'can you understand his life?', None, None, "English first: no 'what … is like' in the Chinese"),
 'S0348L01U01': (K, None, None, None, "将要…了 is the imminent future, so 'soon' is in it; 很快将要 would be unnatural"),
 'S0348L01U07': (K, None, None, None, "将要…了 carries 'soon' (as U01)"),
 'S0351L01B04': (E, 'let me stay on my own', None, None, "English first: the Chinese has 让我 'let me'"),
 'S0352L02U02': (E, "I'm sorry, I can't manage it", None, None, "English first: no 但是 'but' in the Chinese"),
 'S0353L01U03': (E, 'she was at the field all day', None, None, "English first: 一整天 is 'all day'"),
 'S0353L02U03': (E, "he's been running around all day", None, None, "English first: 一整天 is 'all day'"),
 'S0360L01U06': (E, 'can you tell me something else?', None, None, "English first: no 'about it' in the Chinese"),
 'S0362L01U06': (E, 'after you left, he sat there quietly', None, None, "English first: no 'just' in the Chinese (很安静地 is the adverb, not 'very')"),
 'S0365L01U04': (E, "I didn't hear clearly", None, None, "English first: no 'enough' in the Chinese"),
 'S0370L01U04': (E, "she didn't tell anyone", None, None, "English first: the Chinese is 'tell anyone'"),
 'S0371L01B03': (E, 'go and see a film on Wednesday', None, None, "English first: the Chinese has 去 'go'"),
 'S0377L01U06': (E, 'do you want to go somewhere new in the world?', None, None, "English first: the Chinese says 去 'go'"),
 'S0378L01U01': (K, None, None, None, "没钱去度假 is how Chinese says 'didn't have enough money for holidays'"),
 'S0378L01U07': (K, None, None, None, "copy of seed 378; 没钱 = 'not enough money' (as U01)"),
 'S0385L01B03': (E, 'that way of speaking', None, None, "English first: 那个说法 is 'that way of speaking', and the English now holds the LEGO"),
 'S0390L02U06': (E, 'who was near the entrance?', None, None, "English first: no 站 'standing' in the Chinese"),
 'S0391L01B02': (E, 'walking towards the bus', '朝公交车走', 'cháo gōngjiāochē zǒu', "the row held neither side of its LEGO 'towards the bus | 朝公交车'; now it holds both"),
 'S0395L01B03': (E, 'turn left at the corner', None, None, "English first: the Chinese has 向左 'left'"),
 'S0403L01U05': (E, "let's keep this as much as possible", None, None, "English first: no 'try to', 'going' or 'long' in 我们尽可能保持这个 (长 is not taught by 403, so the Chinese cannot grow)"),
 'S0406L01U06': (E, "I'm sure this is right", None, None, "English first: 对的 is 'right'"),
 'S0408L01B03': (E, 'to live happily', None, None, "English first: 幸福地生活 is 'live happily'"),
 'S0408L01U05': (E, 'we all want happiness', None, None, "English first: the Chinese is 'we all want happiness'"),
 'S0409L01B02': (E, 'it really doesn\'t matter', None, None, "English first: the Chinese has 真的 'really'"),
 'S0409L01U05': (E, "I think it doesn't matter", None, None, "English first: no 真的 'really' in the Chinese"),
 'S0410L01U03': (E, "they don't understand each other", '他们互相不了解', 'tāmen hùxiāng bù liǎojiě', "了解 is 'understand', not 'trust'; 不 moved after 互相, the natural order"),
 'S0410L01U04': (E, 'we should help each other', None, None, "English first: 应该 'should', 帮助 'help'"),
 'S0410L01U05': (E, 'I think we should help each other', None, None, "English first: 帮忙 is 'help', not 'respect'"),
 'S0411L01B03': (D, None, None, None, "'for four | 四人的桌子' has an extra 桌子; corrected it would clash with S0411L02B04 'a table for four | 一张四人的桌子', so deleted"),
 'S0411L02U05': (E, 'is there a table?', None, None, "English first: no 'available' in the Chinese"),
 'S0414L02U02': (K, None, None, None, "我想要红酒 for 'I'd like some red wine' is natural Chinese; 一些 is not needed"),
 'S0414L02U05': (E, "we'll have a bottle of red wine", None, None, "English first: 我们要一瓶红酒 is ordering 'a bottle'"),
 'S0416L01B03': (E, None, '带头', 'dàitóu', "'take the lead' had an extra 做 'do'"),
 'S0417L02B03': (E, None, '杀掉那些蚂蚁', 'shādiào nàxiē mǎyǐ', "'those' had no 那些"),
 'S0421L01U01': (E, "my body's been feeling tired lately", None, None, "English first: the Chinese says 身体 'body' (the LEGO)"),
 'S0424L01B03': (E, 'everybody come', None, None, "English first: 大家来 is 'everybody come'; the English now holds its LEGO"),
 'S0426L02B03': (E, 'love each other', None, None, "English first: 彼此相爱 is 'love each other'"),
 'S0426L02U01': (E, 'everyone wants to love each other', None, None, "English first: 相爱 is mutual love, not passive 'be loved'"),
 'S0428L02U03': (E, 'she went to visit her friends', None, None, "English first: the Chinese has 去 'went to'; the possessive is left unsaid in Chinese"),
 'S0437L01U01': (E, 'they wanted to do more for charity', None, None, "English first: 做更多 is 'do more'"),
 'S0437L01U04': (E, 'I want to help out with charity', None, None, "English first: 帮忙 is 'help out'"),
 'S0437L02U02': (K, None, None, None, "'try to' row: left as it is (Tom's 试试 ruling)"),
 'S0440L01B01': (E, 'while', None, None, "English first: the build says only its LEGO 趁 'while' (趁你能 is not Chinese)"),
 'S0441L02B02': (E, 'one way', None, None, "English first: no 'to do it' in the Chinese"),
 'S0452L01B02': (E, "didn't say what they wanted to do", None, None, "English first: the Chinese has 想做 'wanted to do', the LEGO"),
 'S0453L01U04': (E, 'he never mentioned it', None, None, "English first: 说过 is 'mentioned' (the LEGO), object left unsaid in Chinese"),
 'S0454L01B03': (D, None, None, None, "大约来了 'arrives about then' is not good Chinese and 'then' (那时) is not taught before 454 — no valid reword"),
 'S0455L04U01': (H, 'we left because the children were tired', None, None, "copy of seed 455 — the SEED English says 'had to', which the Chinese does not; a seed edit is Kai's call"),
 'S0461L01U01': (H, None, '我能买明信片的商店', 'wǒ néng mǎi míngxìnpiàn de shāngdiàn', "copy of seed 461 — the SEED Chinese says 我想 'I want' for 'I can'; a seed edit is Kai's call"),
 'S0466L01U05': (E, 'she had a look at the wall', None, None, "English first: 看了看墙 is 'had a look at the wall', not 'over'"),
 'S0470L03B03': (E, 'before we stop, how high we climb', None, None, "English first: the Chinese has 爬 'climb'"),
 'S0477L01U03': (E, "I don't like holidays that are too long", None, None, "English first: the Chinese has 太 'too'"),
 'S0482L01B03': (E, 'really not serious', None, None, "English first: 并不 is the emphatic 'really not', not 'not very' (plain 'not serious' would clash with B02 不认真)"),
 'S0489L02U02': (E, 'I want a strong one', None, None, "English first: 要很浓的 is 'want a strong one'"),
 'S0498L01U06': (H, "he's standing alone inside the entrance", None, None, "copy of seed 498 — the SEED English says 'over there', which the Chinese does not; a seed edit is Kai's call"),
 'S0506L02U01': (E, 'before we moved away', None, None, "English first: 搬走 is 'move away'"),
 'S0506L03B03': (E, 'I used to', None, None, "English first: no 'be' in 我曾"),
 'S0507L01B02': (E, 'move to the city', None, None, "English first: the Chinese has 搬 'move'"),
 'S0507L01U02': (E, 'I like the city', None, None, "English first: 喜欢 is 'like'"),
 'S0512L02U05': (D, None, None, None, "no 'managed to' in 我把它打开了, and no reword keeps the LEGO's 'to open' without adding a meaning the Chinese lacks; row is under a not-new LEGO (unplayed), so deleted"),
 'S0514L02U06': (E, 'did you see that one?', None, None, "English first: 你看到那所了吗 is 'did you see'"),
 'S0516L01B02': (E, 'come on their own', None, None, "English first: the Chinese has 来 'come' (also clears the B01 same-English clash #545 held)"),
 'S0520L01U03': (D, None, None, None, "我吃了整个 is not complete Chinese (整个 needs a noun) and 我吃了整个东西 is unnatural — no valid reword"),
 'S0520L01U05': (E, None, '没有人看到整个事情', 'méiyǒu rén kàndào zhěnggè shìqing', "整个 needed its noun: 'the whole thing' = 整个事情"),
 'S0524L01U04': (E, 'nobody wanted to wait a few minutes', None, None, "English first: no 'even' in the Chinese"),
 'S0540L02U12': (D, None, None, None, "no 'seems to' in 没有人介意; corrected it is a twin of S0540L02U04, so deleted (row is under a not-new LEGO, unplayed)"),
 'S0541L02U07': (K, None, None, None, "copy of seed 541 and a 'try' row: left as it is (Tom's 试试 ruling)"),
 'S0546L05U06': (D, None, None, None, "那只狗又来了，又湿 is broken Chinese (又…又 needs two adjectives; 'back' missing); no taught reword says 'came back wet'"),
 'S0549L01U08': (H, None, None, None, "this row is under LEGO 'have to | 得 (děi)' but its 得 is the 做得 de — it does not hold its LEGO; reword to 得 děi changes the meaning, so delete or re-home is Kai's call"),
 'S0549L01U09': (H, 'she has to do different things', '她得做不同的事', None, "as U08: 做得 de, not the LEGO 得 děi — proposed reword or delete, Kai's call"),
 'S0556L01U06': (E, 'she came home late at night', None, None, "English first: no 'very' in the Chinese"),
 'S0560L01U05': (E, 'the road leads to the forest', None, None, "English first: 通向 is 'leads to'"),
 'S0560L02U05': (K, None, None, None, "小路 is the ordinary word for 'path'; 'small' is not a mismatch"),
 'S0567L01B02': (E, 'be outdoors', None, None, "English first: no 'spend time' in 在户外"),
 'S0567L01B03': (E, 'outdoor', None, None, "English first: 户外的 is 'outdoor'"),
 'S0567L04U01': (K, None, None, None, "copy of seed 567; Chinese does not need 花时间 for 'spending time' — the seed reads naturally"),
 'S0573L03U03': (E, None, '我想让事情变得更好', 'wǒ xiǎng ràng shìqing biànde gèng hǎo', "'better' needs 更"),
 'S0573L04U01': (K, None, None, None, "copy of seed 573; 变得特别 reads naturally — not wrong enough for a seed edit (S15)"),
 'S0597L02B03': (E, 'a hundred of them', None, None, "English first: 一百个 is a number and measure word"),
 'S0603L01B03': (E, 'at the time, we', None, None, "English first: the Chinese has 我们 'we'"),
 'S0608L03U07': (E, 'the sensible thing to do is to go and ask', None, None, "English first: no 本来 counterfactual in the Chinese, which says 去问 'go and ask'"),
 'S0612L01U05': (E, "I didn't have the money to buy it", None, None, "English first: the Chinese says 钱 'money'"),
 'S0614L02U02': (K, None, None, None, "家人 for 'my family' is natural Chinese (possessive left unsaid)"),
 'S0614L02U03': (K, None, None, None, "和家人 for 'with her family' is natural Chinese"),
 'S0614L02U06': (K, None, None, None, "给家人打电话 for 'calls her family' is natural Chinese"),
 'S0615L04U06': (E, 'everyone thought she was brave', None, None, "English first: 都觉得 is 'all thought'"),
 'S0622L03U05': (E, 'they broke it', '他们把它弄坏了', 'tāmen bǎ tā nònghuài le', "'made it happen' ≠ 弄好; the row now says its LEGO 把它弄坏"),
 'S0627L01U04': (E, "I'm all ready", None, None, "English first: no 'to go' in 我准备好了 ('I'm ready' and 'I'm ready now' already belong to other Chinese in the course)"),
 'S0627L01U05': (K, None, None, None, "好了吗 is the natural 'is it ready yet?' — 了 carries 'yet'"),
 'S0629L02U02': (K, None, None, None, "加牛奶 is how Chinese says milk in a drink — 'do you want milk?' is right"),
 'S0629L02U06': (K, None, None, None, "加多少牛奶 is 'how much milk' in a drink (as U02)"),
 'S0633L01U02': (E, "that's just fine", None, None, "English first: no 'enough' in 那就好"),
 'S0633L01U06': (D, None, None, None, "什么方法就好 is not grammatical (natural is 什么方法都行, which drops the LEGO 就好) — no valid reword"),
 'S0636L01B02': (E, 'I think that', None, None, "English first: 我觉得 is the LEGO 'I think'"),
 'S0636L01U18': (E, 'I think walking is good', None, None, "English first: no 'for you' in the Chinese (走路对你很好 would mean 'is nice to you')"),
 'S0639L01U05': (K, None, None, None, "和家人 for 'with her family' is natural Chinese"),
 'S0643L01B02': (K, None, None, None, "'any' is an object Chinese leaves unsaid (the dropped-object ruling's family); 'do you want it?' would clash with S0473L01U06 你想要它吗"),
 'S0655L01U03': (E, 'everyone thinks she does it well', None, None, "English first: 觉得 is 'think'"),
 'S0655L01U05': (E, 'she always does very well', None, None, "English first: no 'everything' in the Chinese"),
 'S0655L01U06': (E, "I didn't think I was doing well", None, None, "English first: no 'enough' in the Chinese"),
 'S0658L01U03': (E, 'do you all want coffee?', None, None, "English first: 你们 is 'you all'"),
 'S0661L01U06': (E, 'what are all of you doing right now?', None, None, "English first: no 'exactly' in the Chinese"),
 'S0663L01U01': (H, 'what you all just said', None, None, "copy of seed 663 — the SEED English lacks 'just' from its own LEGO 'what was just said | 刚才说的'; a seed edit is Kai's call"),
 'S0664L01U04': (E, "we'll go when you're all ready", None, None, "English first: 我们就走 is 'we'll go'"),
 'S0668L01U21': (E, None, '我希望能一起吃晚饭', 'wǒ xīwàng néng yìqǐ chī wǎnfàn', "'can' had no 能"),
 'S0668L02U04': (E, 'we all need help', None, None, "English first: no 'sometimes' in the Chinese"),
}

def main(live_path):
    api = json.load(open(live_path))
    ph = {}
    for s in api['seeds']:
        for l in s['legos']:
            for p in l['basket_phrases']: ph[p['id'].split(':')[-1]] = p
    rows = [json.loads(x) for x in open(FIND)]
    z = [r for r in rows if r['course'] == 'zho_for_eng' and r['decision'] == 'CONFIRM' and r['cause'] != 'dropped-object']
    assert len(z) == 144, len(z)
    decisions, kept = [], []
    for r in z:
        p = ph.get(r['id'])
        if not p:
            kept.append({'id': r['id'], 'state': 'gone', 'why': 'deleted live since the #195 snapshot (#206/#214)'}); continue
        if (p['known_text'], p['target_text']) != (r['known'], r['target']):
            kept.append({'id': r['id'], 'state': 'already-fixed', 'before': [r['known'], r['target']], 'live': [p['known_text'], p['target_text']], 'why': 'changed live since the #195 snapshot (#206/#214); re-read and it now matches'}); continue
        if r['id'] not in DEC: raise SystemExit(f'no decision for live row {r["id"]}')
        a, k, t, rom, why = DEC[r['id']]
        before = {'known': p['known_text'], 'target': p['target_text']}
        if a == K:
            kept.append({'id': r['id'], 'state': 'not-a-defect', 'before': [before['known'], before['target']], 'cause': r['cause'], 'what195': r['what'], 'why': why}); continue
        d = {'id': f"zho_for_eng:{r['id']}", 'table': 'phrase', 'role': p['phrase_role'], 'point': r['cause'], 'action': a, 'before': before, 'why': why, 'what195': r['what']}
        if a in (E, H) and (k or t):
            d['after'] = {'known': k, 'target': t, 'roman': rom}
        decisions.append(d)
    json.dump({'job': '#233', 'source': 'mismatch-195 wave 1, zho_for_eng', 'decisions': decisions}, open(os.path.join(HERE, 'decisions-195.json'), 'w'), ensure_ascii=False, indent=1)
    json.dump(kept, open(os.path.join(HERE, 'kept.json'), 'w'), ensure_ascii=False, indent=1)
    from collections import Counter
    print(Counter(d['action'] for d in decisions), Counter(k['state'] for k in kept))

if __name__ == '__main__': main(sys.argv[1])
