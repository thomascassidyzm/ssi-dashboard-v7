# zho_for_eng — Kai's rulings on the #545 FOR-KAI items (4 Nov 2026), job #214.
# Pure data: what each ruled row becomes. plan.py turns this into Popty edit-batch ops (expects read from a
# fresh GET /api/production/zho_for_eng/seeds dump) and checks it before anything is sent.
#   LEGO[id]   = dict(known=, target=, roman=, comps=[(known,target)...], type=, is_new=)
#   PHR[id]    = (known, target, roman)   — None for a side = unchanged;  DEL = phrase ids to delete
#   SEED[n]    = (known, target, roman)
#   INS_PHR    = full new phrase rows; INS_LEGO = new LEGO rows (structural: signed with Kai's key, kai_go)
#   DEL_LEGO   = LEGO deletes (structural, cascade)
#   PRES       = custom presentation lines (Kai's own words)  ·  PRES_MOVE = rotate an existing intro clip
#   OVERRIDE_P17 = rows Kai accepted although the LEGO is not literally contained
COMP_PATCH = {}
LEGO, PHR, SEED, DEL, INS_PHR, INS_LEGO, DEL_LEGO, PRES, PRES_MOVE, OVERRIDE_P17 = {}, {}, {}, [], [], [], [], {}, {}, set()
HELD = []  # (item, ids, why) — reported, not applied

def P(pid, known=None, target=None, roman=None): PHR[pid] = (known, target, roman)

# ---------- A1 seed 61: one time -> once (Kai: careful full knock-on) ----------
LEGO['S0061L02'] = dict(known='once')
COMP_PATCH = {'S0644L02': {'one time': 'once'}}  # its component tile 'one time | 一遍' follows
P('S0061L02B01', 'once'); P('S0061L02B02', 'say it once'); P('S0061L02B03', 'read it once'); P('S0061L02B04', 'once again')
P('S0061L02U01', 'I want to say it once'); P('S0061L02U02', 'I want to read it once'); P('S0061L02U04', 'she read it once')
P('S0061L02U05', 'I need to read it once'); P('S0061L02U07', 'he said it once')
P('S0644L02B01', 'once')  # course-wide knock-on (component gloss below)

# ---------- A2 seed 67: stop down -> to stop, not-new (dup S0019L02) ----------
LEGO['S0067L01'] = dict(known='to stop', is_new=False)
P('S0067L01B01', 'to stop')

# ---------- A3 seed 86: unfortunately | 很遗憾 ----------
LEGO['S0086L01'] = dict(target='很遗憾', roman='hěn yíhàn')
P('S0086L01B03', 'unfortunately'); DEL.append('S0086L01B01')
LEGO['S0273L02'] = dict(target='很遗憾', roman='hěn yíhàn')  # L31: not-new twin follows (seed 273 says 很遗憾)

# ---------- A4 seed 114: worse | 更差 ----------
LEGO['S0114L01'] = dict(target='更差', roman='gèng chà')
P('S0114L01B01', None, '更差', 'gèng chà'); P('S0114L01B02', 'doing worse', '做得更差', 'zuò de gèng chà')
P('S0114L01U03', "that's worse")

# ---------- A5 seed 116: out|出 -> (to) make | 做出 ----------
LEGO['S0116L01'] = dict(known='to make', target='做出', roman='zuòchū')
P('S0116L01B01', 'to make', '做出', 'zuòchū'); P('S0116L01B02', 'can make', '能做出', 'néng zuòchū')
P('S0116L01B03', 'make something', '做出东西', 'zuòchū dōngxi')

# ---------- A6 seed 161: on Sunday | 周日; time before 能 ----------
SEED[161] = (None, '你周日早上能把那本书给我吗？', 'nǐ zhōurì zǎoshang néng bǎ nà běn shū gěi wǒ ma？')
LEGO['S0161L01'] = dict(known='on Sunday', target='周日', roman='zhōurì', type='A', comps=[])
P('S0161L01B01', 'on Sunday', '周日', 'zhōurì'); DEL += ['S0161L01B03', 'S0161L01B04', 'S0161L01C01', 'S0161L01C02']
P('S0161L01U01', 'can you come on Sunday?', '你周日能来吗？', 'nǐ zhōurì néng lái ma？')
P('S0161L01U02', None, '我周日能帮你', 'wǒ zhōurì néng bāng nǐ')
P('S0161L01U04', None, '我周日早上能做', 'wǒ zhōurì zǎoshang néng zuò')
P('S0161L01U05', None, '你周日能帮我吗？', 'nǐ zhōurì néng bāng wǒ ma？')
P('S0161L01U06', None, '我周日能来', 'wǒ zhōurì néng lái')
P('S0161L01U07', 'I can find it on Sunday morning', '我周日早上能找到', 'wǒ zhōurì zǎoshang néng zhǎodào')
P('S0175L01U03', None, '你周日能来吗？', 'nǐ zhōurì néng lái ma？')  # course-wide: same B defect

# ---------- A7 seed 191: point -> a bit — HELD (see HELD) ----------
HELD.append(('A7 seed 191', 'S0191L01', '"a bit" is already S0039L02 a bit | 有点 (one English, two Chinese), and seed 191 never says "a bit" in English: its 一点 is part of 一点也不 "at all". Proposal: grow S0191L01 to "at all | 一点也不" (B02 already reads that).'))

# ---------- A8 seed 222: to want | 想要, thing-object only ----------
LEGO['S0222L03'] = dict(known='to want')
P('S0222L03B01', 'to want')
PRES['S0222L03'] = 'The Chinese for "to want", when you want a thing rather than want to do something, is:'
LEGO['S0473L01'] = dict(is_new=False)
P('S0222L03U02', 'I want more time', '我想要更多时间', 'wǒ xiǎngyào gèng duō shíjiān')
P('S0222L03U03', 'she wants the answer', '她想要答案', 'tā xiǎngyào dá\'àn')
P('S0223L01U07', None, '我会问他想看什么', 'wǒ huì wèn tā xiǎng kàn shénme')
P('S0224L02U08', None, '我刚开始，我想告诉你', 'wǒ gāng kāishǐ, wǒ xiǎng gàosu nǐ')
P('S0229L02B03', None, '我想的话', 'wǒ xiǎng de huà')
P('S0229L02U03', None, '他想的话，会开始', 'tā xiǎng de huà, huì kāishǐ')
P('S0230L01U08', None, '你认识想工作的人吗？', 'nǐ rènshi xiǎng gōngzuò de rén ma？')
P('S0473L01U05', 'I want that book', '我想要那本书', 'wǒ xiǎngyào nà běn shū')
P('S0473L01U06', 'do you want it?', '你想要它吗？', 'nǐ xiǎngyào tā ma？')
P('S0532L01U05', None, '除非你想', 'chúfēi nǐ xiǎng')
P('S0542L01U03', None, '每当你想', 'měi dāng nǐ xiǎng')
P('S0549L03U05', 'I want to be quiet', '我想安静', 'wǒ xiǎng ānjìng')
P('S0580L02U04', "she hopes it's a little quieter", '她希望安静一点', 'tā xīwàng ānjìng yīdiǎn')
P('S0578L01U02', "she hopes it's a little warmer", '她希望更暖和一点', 'tā xīwàng gèng nuǎnhuo yīdiǎn')
P('S0141L02U04', 'I hope everything is perfect', '我希望一切都完美', 'wǒ xīwàng yīqiè dōu wánměi')
P('S0145L01B04', 'not want it any more', '不再想要它', 'bù zài xiǎngyào tā')
P('S0191L01U03', None, '我一点也不想要它', 'wǒ yīdiǎn yě bù xiǎngyào tā')
P('S0474L02U04', None, '即使免费我也不想要它', 'jíshǐ miǎnfèi wǒ yě bù xiǎngyào tā')
P('S0643L01U04', 'do you want some water?', '您想要水吗？', 'nín xiǎngyào shuǐ ma？')
P('S0643L01U06', 'do you want this one?', '您想要这个吗？', 'nín xiǎngyào zhège ma？')
P('S0658L01U04', 'do you all want some tea?', '你们想要茶吗？', 'nǐmen xiǎngyào chá ma？')
P('S0658L01U02', 'she asked what you all want', '她问你们想要什么', 'tā wèn nǐmen xiǎngyào shénme')
HELD.append(('A8 seeds 144 / 474', 'seed:144 seed:474', 'Two SEED sentences use 想要 with no object: 144 "我今天早上比我想要的更早醒了" (earlier than I wanted to) and 474 "…我也不想要" (I don\'t even want it). A seed is only edited when wrong (S15) and both are natural Chinese, so left for Kai: 144 could become 比我想的更早 / 474 could add 它.'))

# ---------- A9 seed 224: to start | 开始, not-new (dup S0023L02) ----------
LEGO['S0224L01'] = dict(known='to start', is_new=False)
P('S0224L01B01', 'to start')

# ---------- A10 seed 228 — HELD (Kai: report if no earlier LEGO matches) ----------
HELD.append(('A10 seed 228', 'S0228L02', 'S0228L02 "to speak; speaking | 说话" is marked not-new but NO earlier LEGO teaches 说话 (only a build S0057L01B02 and S0206 component tiles). So it repeats nothing. Re-glossing it "to talk" would make it NEW (L31: intro + played basket) and turn S0355L01 "to talk | 说话" not-new. Kai to say whether to do that.'))

# ---------- A11 seed 229: woman | 女人 ----------
LEGO['S0229L01'] = dict(known='woman')
P('S0229L01B01', 'woman')

# ---------- A12 seed 244: already learnt a lot ----------
LEGO['S0244L01'] = dict(known='already learnt a lot', comps=[('already', '已经'), ('learnt', '学'), ('', '了'), ('a lot', '很多')])
P('S0244L01B01', 'already learnt a lot'); P('S0244L01B04', "you've already learnt a lot")
P('S0244L01U01', "I think you've already learnt a lot"); P('S0244L01U02', "I don't think you've already learnt a lot")
P('S0244L01U03', "because she's already learnt a lot"); P('S0244L01U04', "I know you've already learnt a lot")
P('S0244L01U05', "if you've already learnt a lot, you can help her"); P('S0244L01C02', 'learnt')

# ---------- A13 seed 247 ----------
P('S0247L01U03', 'you are doing fairly well'); OVERRIDE_P17.add('S0247L01U03')

# ---------- A14 seed 317: if she wants | 她如果想的话 ----------
LEGO['S0317L01'] = dict(known='if she wants', target='她如果想的话', roman='tā rúguǒ xiǎng de huà',
                        comps=[('she', '她'), ('if', '如果'), ('want', '想'), ('', '的话')])
P('S0317L01B01', 'if she wants', '她如果想的话', 'tā rúguǒ xiǎng de huà'); DEL.append('S0317L01B03')
P('S0317L01B04', 'she can if she wants')
P('S0317L01U01', 'she can come if she wants', '她如果想的话可以来', 'tā rúguǒ xiǎng de huà kěyǐ lái')
P('S0317L01U04', 'she can see it on Monday if she wants', '她如果想的话周一可以看', 'tā rúguǒ xiǎng de huà zhōuyī kěyǐ kàn')
P('S0317L01U06', 'she can finish watching if she wants', '她如果想的话可以看完', 'tā rúguǒ xiǎng de huà kěyǐ kàn wán')
P('S0317L01U08', 'I think she can put it there if she wants', '我觉得她如果想的话可以把它放在那', 'wǒ juéde tā rúguǒ xiǎng de huà kěyǐ bǎ tā fàng zài nà')

# ---------- A15/A16 seed 338: really terrible | 很糟糕 ----------
SEED[338] = ('really terrible', None, None)
LEGO['S0338L01'] = dict(known='really terrible', target='很糟糕', roman='hěn zāogāo')
DEL += ['S0338L01B01', 'S0338L01B04', 'S0338L01U08']
P('S0338L01B02', 'really terrible'); P('S0338L01B03', "think it's really terrible", '觉得很糟糕', 'juéde hěn zāogāo')
P('S0338L01U01', 'this is really terrible'); P('S0338L01U02', "that's really terrible", '那很糟糕', 'nà hěn zāogāo')
P('S0338L01U03', 'I think this is really terrible'); P('S0338L01U04', 'she said this is really terrible')
P('S0338L01U05', 'this film is really terrible', '这个电影很糟糕', 'zhège diànyǐng hěn zāogāo')
P('S0338L01U06', "do you think it's really terrible?"); P('S0338L01U07', 'he thinks the answer is really terrible')

# ---------- A17 / B2 / C1 deletes ----------
DEL += ['S0440L01U04', 'S0044L01U06', 'S0011L03U01']

# ---------- A18 seed 574 ----------
P('S0574L02B01', 'towards')
HELD.append(('A18 seed 574', 'S0574L02', 'B01 re-glossed to the LEGO\'s own "towards". But the LEGO itself is wrong for this seed: in 574 对 is half of 对…来说 "for (someone)" — "for everyone" — not "towards". S0574L01 "for someone | 来说" is the other half. Proposal: grow S0574L01 to "for everyone | 对每个人来说" (the seed\'s own words), which takes in this 对; S0574L02 then has nothing left to teach (it is not-new, its basket is not played).'))

# ---------- A19 seed 615: to say out loud | 说出 ----------
LEGO['S0615L02'] = dict(known='to say out loud', comps=[('to say', '说'), ('out', '出')])
P('S0615L02B01', 'to say out loud'); P('S0615L02B02', 'to say words like that out loud'); P('S0615L02B03', 'said it out loud')
P('S0615L02U02', 'I said those words out loud'); P('S0615L02U03', 'he said out loud what everyone was thinking')
P('S0615L02U04', 'go ahead and say it out loud'); P('S0615L02U05', 'she dared to say it out loud')

# ---------- B1 seed 23 ----------
SEED[23] = (None, '我很快就要开始多说了', 'wǒ hěn kuài jiù yào kāishǐ duō shuō le')

# ---------- C2 seed 15: I want you to | 我希望你 (want-you-to rule) ----------
SEED[15] = (None, '我也希望你明天和我说中文', 'wǒ yě xīwàng nǐ míngtiān hé wǒ shuō zhōngwén')
INS_LEGO.append(dict(seed_number=15, lego_index=2, known_text='I want you to', target_text='我希望你', target_text_roman='wǒ xīwàng nǐ',
                     type='M', components=[{'known': 'I', 'target': '我'}, {'known': 'hope', 'target': '希望'}, {'known': 'you', 'target': '你'}], is_new=True))
PRES['S0015L02'] = 'The Chinese for "I want you to", which literally means "I hope you", is:'
C2_BASKET = [('B01', 'build', 'I want you to', '我希望你', 'wǒ xīwàng nǐ'),
             ('B02', 'build', 'I want you to speak', '我希望你说', 'wǒ xīwàng nǐ shuō'),
             ('B03', 'build', 'I want you to practise', '我希望你练习', 'wǒ xīwàng nǐ liànxí'),
             ('U01', 'use', 'I want you to speak Chinese', '我希望你说中文', 'wǒ xīwàng nǐ shuō zhōngwén'),
             ('U02', 'use', 'I want you to speak Chinese with me', '我希望你和我说中文', 'wǒ xīwàng nǐ hé wǒ shuō zhōngwén'),
             ('U03', 'use', 'I want you to practise with me tomorrow', '我希望你明天和我练习', 'wǒ xīwàng nǐ míngtiān hé wǒ liànxí'),
             ('U04', 'use', 'I want you to try', '我希望你试试', 'wǒ xīwàng nǐ shìshi'),
             ('U05', 'use', 'I want you to explain', '我希望你解释', 'wǒ xīwàng nǐ jiěshì'),
             ('U06', 'use', 'and I want you to speak Chinese with me tomorrow', '我也希望你明天和我说中文', 'wǒ yě xīwàng nǐ míngtiān hé wǒ shuō zhōngwén')]
for i, (suf, role, k, t, r) in enumerate(C2_BASKET):
    INS_PHR.append(dict(id=f'zho_for_eng:S0015L02{suf}', seed_number=15, lego_index=2, known_text=k, target_text=t, target_text_roman=r,
                        phrase_role=role, position=i + 1, status='draft'))

# ---------- C3 seed 69 — HELD ----------
HELD.append(('C3 seed 69', 'S0069L03U01', '要 is taught by seed 69 only as "going to" (我要, S0005L01), not as "want". 我要那只 is natural Chinese, but it would teach a new 要 = want without saying so. Not applied. (The row is under a not-new LEGO, so it is not played either way.)'))

# ---------- C4 seed 95: bus · the next bus · on the next bus | 坐下一班车 (rotation, no insert) ----------
LEGO['S0095L02'] = dict(known='bus', target='班车', roman='bānchē', type='A', comps=[])
LEGO['S0095L03'] = dict(known='the next bus', target='下一班车', roman='xià yī bān chē', type='M', comps=[('next', '下一'), ('bus', '班车')])
LEGO['S0095L04'] = dict(known='on the next bus', target='坐下一班车', roman='zuò xià yī bān chē', type='M', comps=[('ride', '坐'), ('the next bus', '下一班车')])
PRES_MOVE['S0095L02'] = 'S0095L03'; PRES_MOVE['S0095L03'] = 'S0095L04'
for suf, k, t, r in [('B01', 'bus', '班车', 'bānchē'), ('B02', 'that bus', '那班车', 'nà bān chē'), ('B03', 'wait for the bus', '等班车', 'děng bānchē'),
                     ('U01', "I'm waiting for the bus", '我在等班车', 'wǒ zài děng bānchē'), ('U02', 'where is the bus?', '班车在哪里？', 'bānchē zài nǎlǐ？'),
                     ('U03', 'the bus is very slow', '班车很慢', 'bānchē hěn màn'), ('U04', 'I like that bus', '我喜欢那班车', 'wǒ xǐhuan nà bān chē'),
                     ('U05', 'why is the bus slow?', '班车为什么很慢？', 'bānchē wèishénme hěn màn？'), ('U06', 'is the bus ready?', '班车准备好了吗？', 'bānchē zhǔnbèi hǎo le ma？'),
                     ('U07', 'the bus is slow today', '班车今天很慢', 'bānchē jīntiān hěn màn'), ('U08', "I don't want to wait for the bus", '我不想等班车', 'wǒ bù xiǎng děng bānchē')]:
    P(f'S0095L02{suf}', k, t, r)
for suf, k, t, r in [('B01', 'the next bus', '下一班车', 'xià yī bān chē'), ('B02', 'wait for the next bus', '等下一班车', 'děng xià yī bān chē'),
                     ('B03', 'is it the next bus?', '是下一班车吗？', 'shì xià yī bān chē ma？'), ('B04', "that's the next bus", '那是下一班车', 'nà shì xià yī bān chē'),
                     ('U01', "I'm waiting for the next bus", '我在等下一班车', 'wǒ zài děng xià yī bān chē'), ('U02', 'where is the next bus?', '下一班车在哪里？', 'xià yī bān chē zài nǎlǐ？'),
                     ('U03', 'the next bus is slow', '下一班车很慢', 'xià yī bān chē hěn màn'), ('U04', 'the next bus is very good', '下一班车很好', 'xià yī bān chē hěn hǎo'),
                     ('U05', 'is the next bus slow?', '下一班车慢吗？', 'xià yī bān chē màn ma？'), ('U06', 'I want to wait for the next bus', '我想等下一班车', 'wǒ xiǎng děng xià yī bān chē'),
                     ('U07', 'is the next bus ready?', '下一班车准备好了吗？', 'xià yī bān chē zhǔnbèi hǎo le ma？'), ('U08', "I don't want to wait for the next bus", '我不想等下一班车', 'wǒ bù xiǎng děng xià yī bān chē')]:
    P(f'S0095L03{suf}', k, t, r)
for suf, k, t, r in [('B01', 'on the next bus', '坐下一班车', 'zuò xià yī bān chē'), ('B02', 'want to go on the next bus', '想坐下一班车', 'xiǎng zuò xià yī bān chē'),
                     ('B03', 'can go on the next bus', '能坐下一班车', 'néng zuò xià yī bān chē'), ('B04', 'ready to go on the next bus', '准备好坐下一班车', 'zhǔnbèi hǎo zuò xià yī bān chē'),
                     ('U01', 'I want to go on the next bus', '我想坐下一班车', 'wǒ xiǎng zuò xià yī bān chē'), ('U02', 'can I go on the next bus?', '我能坐下一班车吗？', 'wǒ néng zuò xià yī bān chē ma？'),
                     ('U04', 'I need to go on the next bus', '我需要坐下一班车', 'wǒ xūyào zuò xià yī bān chē'), ('U05', 'can you go on the next bus?', '你能坐下一班车吗？', 'nǐ néng zuò xià yī bān chē ma？'),
                     ('U06', 'I hope to go on the next bus', '我希望坐下一班车', 'wǒ xīwàng zuò xià yī bān chē'), ('U07', 'why do you want to go on the next bus?', '你为什么想坐下一班车？', 'nǐ wèishénme xiǎng zuò xià yī bān chē？'),
                     ('U08', "I'm ready to go on the next bus", '我准备好坐下一班车了', 'wǒ zhǔnbèi hǎo zuò xià yī bān chē le')]:
    P(f'S0095L04{suf}', k, t, r)

# ---------- C5 seed 98: to play | 玩 ----------
SEED[98] = (None, '我应该考虑玩别的', 'wǒ yīnggāi kǎolǜ wán bié de')
LEGO['S0098L03'] = dict(known='to play', target='玩', roman='wán')
for pid, t, r in [('S0098L03B01', '玩这个', 'wán zhège'), ('S0098L03B02', '能玩', 'néng wán'), ('S0098L03B03', '想玩', 'xiǎng wán'),
                  ('S0098L03U01', '我想玩这个', 'wǒ xiǎng wán zhège'), ('S0098L03U02', '你能玩这个吗？', 'nǐ néng wán zhège ma？'),
                  ('S0098L03U03', '我现在不想玩', 'wǒ xiànzài bù xiǎng wán'), ('S0098L03U04', '我觉得我能玩这个', 'wǒ juéde wǒ néng wán zhège'),
                  ('S0098L03U05', '我应该玩这个', 'wǒ yīnggāi wán zhège'), ('S0098L03U06', '我需要考虑玩什么', 'wǒ xūyào kǎolǜ wán shénme'),
                  ('S0098L03U07', '我能玩这个吗？', 'wǒ néng wán zhège ma？'), ('S0098L03U08', '我准备好玩这个了', 'wǒ zhǔnbèi hǎo wán zhège le'),
                  ('S0098L04B03', '玩别的', 'wán bié de'), ('S0098L04U02', '我应该玩别的', 'wǒ yīnggāi wán bié de'), ('S0098L04U05', '我想玩别的', 'wǒ xiǎng wán bié de'),
                  ('S0100L02U05', '我想玩类似的', 'wǒ xiǎng wán lèisì de')]:
    P(pid, None, t, r)
LEGO['S0501L01'] = dict(is_new=False)

# ---------- C6 seed 126: this exercise | 这项练习 ----------
SEED[126] = ('this exercise is changing the shape of my brain', None, None)
LEGO['S0126L01'] = dict(known='this exercise', comps=[('this', '这'), ('', '项'), ('exercise', '练习')])
for pid, k in [('S0126L01B01', 'this exercise'), ('S0126L01B03', 'doing this exercise'), ('S0126L01B04', 'like this exercise'),
               ('S0126L01U01', 'this exercise is good'), ('S0126L01U02', 'I like this exercise'), ('S0126L01U03', 'this exercise was extremely unusual'),
               ('S0126L01U04', 'I want to do this exercise'), ('S0126L01U05', 'this exercise is changing my brain'), ('S0126L01U06', "I'm excited about this exercise"),
               ('S0126L01U07', "she didn't do this exercise"), ('S0126L01C03', 'exercise'), ('S0129L01U08', "I'm so happy that this exercise was so unusual")]:
    P(pid, k)

# ---------- C7 seed 131: in my head · going around in my head (L01 re-cut, L02 inserted) ----------
LEGO['S0131L01'] = dict(known='in my head', target='在我脑子里', roman='zài wǒ nǎozi lǐ', type='M',
                        comps=[('in', '在'), ('my', '我'), ('head', '脑子'), ('inside', '里')])
for suf, k, t, r in [('B01', 'in my head', '在我脑子里', 'zài wǒ nǎozi lǐ'), ('B02', "it's in my head", '它在我脑子里', 'tā zài wǒ nǎozi lǐ'),
                     ('B03', "that's in my head", '那在我脑子里', 'nà zài wǒ nǎozi lǐ'),
                     ('U01', 'his words are in my head', '他的话在我脑子里', 'tā de huà zài wǒ nǎozi lǐ'),
                     ('U02', 'this idea is in my head now', '这个主意现在在我脑子里', 'zhège zhǔyi xiànzài zài wǒ nǎozi lǐ'),
                     ('U03', 'so many things are in my head', '这么多东西在我脑子里', 'zhème duō dōngxi zài wǒ nǎozi lǐ'),
                     ('U04', 'his name is in my head', '他的名字在我脑子里', 'tā de míngzi zài wǒ nǎozi lǐ'),
                     ('U13', 'the answer is in my head', '答案在我脑子里', 'dá\'àn zài wǒ nǎozi lǐ')]:
    P(f'S0131L01{suf}', k, t, r)
INS_LEGO.append(dict(seed_number=131, lego_index=2, known_text='going around in my head', target_text='在我脑子里转', target_text_roman='zài wǒ nǎozi lǐ zhuàn',
                     type='M', components=[{'known': 'in my head', 'target': '在我脑子里'}, {'known': 'turn', 'target': '转'}], is_new=True))
C7_BASKET = [('B01', 'build', 'going around in my head', '在我脑子里转', 'zài wǒ nǎozi lǐ zhuàn'),
             ('B02', 'build', 'words going around in my head', '话在我脑子里转', 'huà zài wǒ nǎozi lǐ zhuàn'),
             ('B03', 'build', 'his name going around in my head', '他的名字在我脑子里转', 'tā de míngzi zài wǒ nǎozi lǐ zhuàn'),
             ('U01', 'use', 'his words are going around in my head', '他的话在我脑子里转', 'tā de huà zài wǒ nǎozi lǐ zhuàn'),
             ('U02', 'use', 'this idea is going around in my head now', '这个主意现在在我脑子里转', 'zhège zhǔyi xiànzài zài wǒ nǎozi lǐ zhuàn'),
             ('U03', 'use', 'so many things are going around in my head', '这么多东西在我脑子里转', 'zhème duō dōngxi zài wǒ nǎozi lǐ zhuàn'),
             ('U04', 'use', 'her name is going around in my head', '她的名字在我脑子里转', 'tā de míngzi zài wǒ nǎozi lǐ zhuàn'),
             ('U05', 'use', 'the answer is going around in my head', '答案在我脑子里转', 'dá\'àn zài wǒ nǎozi lǐ zhuàn'),
             ('U06', 'use', 'there are too many ideas going around in my head', '我脑子里有太多想法在转', 'wǒ nǎozi lǐ yǒu tài duō xiǎngfǎ zài zhuàn')]
for i, (suf, role, k, t, r) in enumerate(C7_BASKET):
    INS_PHR.append(dict(id=f'zho_for_eng:S0131L02{suf}', seed_number=131, lego_index=2, known_text=k, target_text=t, target_text_roman=r,
                        phrase_role=role, position=i + 1, status='draft'))
OVERRIDE_P17.update(['S0131L02U06', 'S0015L02U06',  # seed sentences: the seed's own words sit inside the chunk (K49)
    'S0229L02B03', 'S0229L02U03', 'S0230L01U08',  # never held their LEGO; edited only to drop 想要+verb (pre-existing P17, listed)
    'S0578L01U02', 'S0615L02B03', 'S0615L02U02', 'S0615L02U03',  # warmer / said = forms of the LEGO word (K6)
    'S0658L01U02', 'S0644L02B01'])  # 'you all want' inside 'do you all want'; 644 B01 was never the LEGO (pre-existing)  # the seed sentence: 我脑子里…在转 is the seed's own split of the chunk (K49 words inside)

# ---------- C8 seed 133: to know someone well | 了解一个人 ----------
SEED[133] = ('you know someone very well when you work together', None, None)
LEGO['S0133L01'] = dict(known='to know someone well', comps=[('know well', '了解'), ('a', '一个'), ('person', '人')])
for pid, k, t, r in [('S0133L01B01', 'to know someone well', None, None), ('S0133L01B02', 'know someone very well', None, None),
                     ('S0133L01B03', 'want to know someone well', None, None), ('S0133L01B04', 'help you know someone well', None, None),
                     ('S0133L01U01', 'you know someone well when you talk often', None, None), ('S0133L01U02', 'I need time to know someone well', None, None),
                     ('S0133L01U03', "it's important to know someone well before working together", None, None),
                     ('S0133L01U04', 'you know someone very well when you work together', None, None),
                     ('S0133L01U06', 'knowing someone well takes time', None, None),
                     ('S0133L01U07', 'I want to know someone well', '我想了解一个人', 'wǒ xiǎng liǎojiě yī gè rén'),
                     ('S0133L01U09', 'I hope to know someone well', '我希望了解一个人', 'wǒ xīwàng liǎojiě yī gè rén'),
                     ('S0133L01U10', 'this helps me know someone well', '这帮我了解一个人', 'zhè bāng wǒ liǎojiě yī gè rén'),
                     ('S0133L01C01', 'know well', None, None),
                     ('S0553L01U08', 'I think knowing someone well is important', None, None)]:
    P(pid, k, t, r)

# ---------- C9 把 chunks — SHOW-FIRST, not applied (proposals in the record doc) ----------

# ---------- C10 seed 372: to create | 创造 ----------
SEED[372] = (None, '你看到她想创造什么了吗？', 'nǐ kàndào tā xiǎng chuàngzào shénme le ma？')
LEGO['S0372L01'] = dict(target='创造', roman='chuàngzào')
for pid, k, t, r in [('S0372L01B01', 'create something', '创造点什么', 'chuàngzào diǎn shénme'), ('S0372L01B02', 'want to create', '想创造', 'xiǎng chuàngzào'),
                     ('S0372L01B03', 'what she was creating', '她在创造什么', 'tā zài chuàngzào shénme'),
                     ('S0372L01U01', None, '你看到她想创造什么了吗？', 'nǐ kàndào tā xiǎng chuàngzào shénme le ma？'),
                     ('S0372L01U02', 'I want to create something', '我想创造点什么', 'wǒ xiǎng chuàngzào diǎn shénme'),
                     ('S0372L01U03', 'she wants to create something new', '她想创造新的东西', 'tā xiǎng chuàngzào xīn de dōngxi'),
                     ('S0372L01U04', 'he wants to create something different', '他想创造不同的东西', 'tā xiǎng chuàngzào bùtóng de dōngxi'),
                     ('S0372L01U05', 'he asked me what I was creating', '他问我我在创造什么', 'tā wèn wǒ wǒ zài chuàngzào shénme'),
                     ('S0372L01U06', "I didn't see what he was trying to create", '我没看到他想创造什么', 'wǒ méi kàndào tā xiǎng chuàngzào shénme')]:
    P(pid, k, t, r)

# ---------- C11 seed 407: merge L02+L03 -> to set a good example | 树立好榜样 ----------
LEGO['S0407L02'] = dict(known='to set a good example', target='树立好榜样', roman='shùlì hǎo bǎngyàng',
                        comps=[('set', '树立'), ('good', '好'), ('example', '榜样')])
DEL_LEGO.append('S0407L03')
for suf, k, t, r in [('B01', 'to set a good example', '树立好榜样', 'shùlì hǎo bǎngyàng'), ('B02', 'try to set a good example', '试着树立好榜样', 'shìzhe shùlì hǎo bǎngyàng'),
                     ('B03', 'should set a good example', '应该树立好榜样', 'yīnggāi shùlì hǎo bǎngyàng'),
                     ('U01', 'shouldn\'t we try to set a good example?', '我们不应该试着树立好榜样吗？', 'wǒmen bù yīnggāi shìzhe shùlì hǎo bǎngyàng ma？'),
                     ('U02', 'she wants to set a good example', '她想树立好榜样', 'tā xiǎng shùlì hǎo bǎngyàng'),
                     ('U03', 'everyone should try to set a good example', '所有人都应该试着树立好榜样', 'suǒyǒu rén dōu yīnggāi shìzhe shùlì hǎo bǎngyàng'),
                     ('U04', 'I want to set a good example', '我想树立好榜样', 'wǒ xiǎng shùlì hǎo bǎngyàng'),
                     ('U05', "let's try to set a good example", '让我们试着树立好榜样', 'ràng wǒmen shìzhe shùlì hǎo bǎngyàng'),
                     ('U06', "it's important to set a good example", '树立好榜样很重要', 'shùlì hǎo bǎngyàng hěn zhòngyào'),
                     ('C01', 'set', '树立', 'shùlì'), ('C02', 'example', '榜样', 'bǎngyàng')]:
    P(f'S0407L02{suf}', k, t, r)

# ---------- C12 seed 556: music · to play music | 放音乐 (rotation L02<->L03) ----------
LEGO['S0556L02'] = dict(known='music', target='音乐', roman='yīnyuè', comps=[('sound', '音'), ('music', '乐')])
LEGO['S0556L03'] = dict(known='to play music', target='放音乐', roman='fàng yīnyuè', comps=[('play', '放'), ('music', '音乐')])
PRES_MOVE['S0556L02'] = 'S0556L03'
for suf, k, t, r in [('B01', 'music', '音乐', 'yīnyuè'), ('B02', 'that music', '那个音乐', 'nàge yīnyuè'), ('B03', 'like music', '喜欢音乐', 'xǐhuan yīnyuè'),
                     ('U01', 'she likes music', '她喜欢音乐', 'tā xǐhuan yīnyuè'), ('U02', 'I want to hear music', '我想听音乐', 'wǒ xiǎng tīng yīnyuè'),
                     ('U03', 'nobody likes that music', '没有人喜欢那个音乐', 'méiyǒu rén xǐhuan nàge yīnyuè'), ('U04', 'I like that music', '我喜欢那个音乐', 'wǒ xǐhuan nàge yīnyuè'),
                     ('U05', 'the music is very good', '音乐很好', 'yīnyuè hěn hǎo'), ('U06', 'what music do you like?', '你喜欢什么音乐？', 'nǐ xǐhuan shénme yīnyuè？')]:
    P(f'S0556L02{suf}', k, t, r)
for suf, k, t, r in [('B01', 'to play music', '放音乐', 'fàng yīnyuè'), ('B02', 'play music late at night', '深夜放音乐', 'shēnyè fàng yīnyuè'),
                     ('B03', 'they play music', '他们放音乐', 'tāmen fàng yīnyuè'), ('C01', 'play', '放', 'fàng'), ('C02', 'music', '音乐', 'yīnyuè'),
                     ('U01', 'they play music late at night', '他们深夜放音乐', 'tāmen shēnyè fàng yīnyuè'),
                     ('U02', 'she plays music at home', '她在家放音乐', 'tā zài jiā fàng yīnyuè'),
                     ('U03', "I don't want to play music now", '我现在不想放音乐', 'wǒ xiànzài bù xiǎng fàng yīnyuè'),
                     ('U04', 'can you play music?', '你能放音乐吗？', 'nǐ néng fàng yīnyuè ma？'),
                     ('U05', 'why do they play music late at night?', '他们为什么深夜放音乐？', 'tāmen wèishénme shēnyè fàng yīnyuè？'),
                     ('U06', "please don't play music now", '请现在不要放音乐', 'qǐng xiànzài bùyào fàng yīnyuè')]:
    P(f'S0556L03{suf}', k, t, r)

# ---------- TO-RULE (Kai 4 Nov): verb LEGO English is "to [verb]"; imperatives never. Read in seed, one by one. ----------
TO_RULE = {
 'S0010L04': 'to remember the whole sentence', 'S0011L01': 'to hope', 'S0029L03': 'to speak better', 'S0049L02': 'to understand',
 'S0050L01': 'to finish as quickly as possible', 'S0053L04': 'to put it in', 'S0058L01': 'to listen', 'S0063L01': 'to mind', 'S0065L03': 'to test',
 'S0066L01': 'to find', 'S0069L05': 'to look after', 'S0070L03': 'to tell', 'S0071L01': 'to let', 'S0078L01': 'to understand clearly',
 'S0080L01': 'to prepare', 'S0082L01': 'to wait', 'S0091L01': 'to speak more quickly', 'S0091L02': 'to answer in time', 'S0092L02': 'to keep on',
 'S0095L05': 'to go home', 'S0098L02': 'to consider', 'S0099L01': 'to ask', 'S0100L01': 'to worry', 'S0101L01': 'to enjoy', 'S0104L01': 'to change',
 'S0106L02': 'to work', 'S0110L01': 'to relax', 'S0115L01': 'to have a conversation', 'S0117L03': 'to chat', 'S0120L01': 'to go by bus',
 'S0142L03': 'to help out', 'S0146L02': 'to fix', 'S0149L03': 'to finish', 'S0150L01': 'to be called', 'S0151L01': 'to happen', 'S0154L02': 'to meet',
 'S0156L01': 'to go', 'S0168L02': 'to come and help', 'S0200L01': 'to make sure', 'S0205L01': 'to forget', 'S0210L01': 'to discuss',
 'S0212L01': 'to ask for', 'S0213L01': 'to achieve', 'S0217L01': 'to drink', 'S0230L01': 'to know a young man', 'S0240L02': 'to stop',
 'S0242L01': 'to give more time', 'S0243L01': 'to eat', 'S0246L01': 'to let her help', 'S0248L02': 'to return', 'S0251L01': 'to know',
 'S0251L02': 'to wait to finish', 'S0252L01': 'to be ready', 'S0252L02': 'to start', 'S0255L01': 'to leave', 'S0269L01': 'to wait for',
 'S0281L01': 'to finish coffee', 'S0292L01': 'to come to the party', 'S0293L01': 'to find out', 'S0293L02': 'to meet you', 'S0299L01': 'to pay',
 'S0300L01': 'to seem', 'S0301L01': 'to give', 'S0301L02': 'to want to look at', 'S0301L03': 'to show you', 'S0303L01': 'to think',
 'S0303L02': 'to sit down', 'S0304L01': 'to work at home', 'S0311L01': 'to dare', 'S0311L02': 'to believe', 'S0313L03': 'to finish watching',
 'S0314L01': 'to put it on the table', 'S0319L01': 'to move', 'S0323L02': 'to walk', 'S0324L03': 'to raise up', 'S0326L02': 'to sell off',
 'S0327L02': 'to provide', 'S0332L01': 'to establish', 'S0333L01': 'to spend time', 'S0334L02': 'to let you hold', 'S0335L01': 'to add',
 'S0336L02': 'to open', 'S0337L01': 'to like to play', 'S0340L01': 'to be fine', 'S0386L01': 'to agree', 'S0395L02': 'to turn left',
 'S0399L01': 'to lose hope', 'S0403L01': 'to remain', 'S0410L02': 'to fight', 'S0426L01': 'to love each other', 'S0443L02': 'to keep doing',
 'S0491L02': 'to try to help', 'S0511L02': 'to reach', 'S0521L01': 'to stay here', 'S0525L01': 'to check', 'S0534L03': 'to go out',
 'S0557L01': 'to wish', 'S0563L02': 'to keep going', 'S0566L01': 'to think for a bit', 'S0573L02': 'to make', 'S0625L01': 'to drink something',
 'S0660L01': 'to help you all', 'S0662L01': 'to speak well',
}
