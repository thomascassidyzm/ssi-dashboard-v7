# zho_for_eng #214 — second batch: Kai's further rulings of 4 Nov (D2–D5, D1b, E1, E3, E4b). Same shape as rulings.py.
COMP_PATCH = {}
LEGO, PHR, SEED, DEL, INS_PHR, INS_LEGO, DEL_LEGO, PRES, PRES_MOVE, OVERRIDE_P17 = {}, {}, {}, [], [], [], [], {}, {}, set()
HELD = []
TO_RULE = {}
def P(pid, known=None, target=None, roman=None): PHR[pid] = (known, target, roman)

# D1b — 试试 kept (Tom + Kai); its intro becomes Kai's own line (rendered separately, PR1)
PRES['S0002L01'] = 'One way to say "to try" in Chinese is:'

# D2 seed 21 — HELD: 你为什么记她的名字 drops 学, the word its own LEGO S0021L02 "to study | 学" teaches
HELD.append(('D2 seed 21', 'seed:21', 'Changing the seed to 你为什么记她的名字 removes 学 from seed 21, but S0021L02 "to study | 学" is that seed\'s LEGO (a LEGO must be in its seed, L26) — not consistent, so not applied. Options: keep the seed; or re-cut S0021L02 to "to memorise | 记" (学 is still taught by seed 2\'s 学习 and used widely).'))
# D3
DEL.append('S0030L01U05')
# D4
P('S0039L02U02', None, '时间有点太多', 'shíjiān yǒudiǎn tài duō')
# D5 — 没关系 is not taught anywhere in the course, so the two 还行 = "it's fine/no problem" rows go
DEL += ['S0049L01U05', 'S0050L01U03']

# E1 seed 643 — LEGO grows to the whole seed; basket made to hold it
LEGO['S0643L01'] = dict(known='do you want, sir?', target='先生，您想要吗', roman='xiānsheng, nín xiǎngyào ma',
                        comps=[('sir', '先生'), ('you', '您'), ('want', '想要'), ('', '吗')])
for suf, k, t, r in [('B01', 'do you want, sir?', '先生，您想要吗', 'xiānsheng, nín xiǎngyào ma'),
                     ('B02', 'do you want it, sir?', '先生，您想要它吗', 'xiānsheng, nín xiǎngyào tā ma'),
                     ('B03', 'do you want this one, sir?', '先生，您想要这个吗', 'xiānsheng, nín xiǎngyào zhège ma'),
                     ('U02', 'do you want coffee, sir?', '先生，您想要咖啡吗？', 'xiānsheng, nín xiǎngyào kāfēi ma？'),
                     ('U03', 'do you want some water, sir?', '先生，您想要水吗？', 'xiānsheng, nín xiǎngyào shuǐ ma？'),
                     ('U04', 'do you want a book, sir?', '先生，您想要一本书吗？', 'xiānsheng, nín xiǎngyào yī běn shū ma？'),
                     ('U05', 'do you want tea, sir?', '先生，您想要茶吗？', 'xiānsheng, nín xiǎngyào chá ma？'),
                     ('U06', 'do you want some eggs, sir?', '先生，您想要鸡蛋吗？', 'xiānsheng, nín xiǎngyào jīdàn ma？')]:
    P(f'S0643L01{suf}', k, t, r)
OVERRIDE_P17.update(f'S0643L01{s}' for s in ['B02', 'B03', 'U02', 'U03', 'U04', 'U05', 'U06'])  # K49: the object sits inside the chunk (您想要…吗)

# E3 — every 您 row says sir or madam (English), and the Chinese carries the title too, as seeds 642-655 do
for pid, k, t, r in [('S0642L02B03', 'how are you now, madam?', '女士，您现在怎么样？', 'nǚshì, nín xiànzài zěnmeyàng？'),
                     ('S0642L01B01', 'you, madam', '女士，您', 'nǚshì, nín'),
                     ('S0642L01B02', 'hello, madam', '女士，您好', 'nǚshì, nín hǎo'),
                     ('S0642L01B03', 'thank you, madam', '谢谢您，女士', 'xièxie nín, nǚshì'),
                     ('S0642L01U01', None, '先生，我可以帮助您吗？', 'xiānsheng, wǒ kěyǐ bāngzhù nín ma？'),
                     ('S0642L01U02', 'thank you very much, sir', '先生，非常谢谢您', 'xiānsheng, fēicháng xièxie nín'),
                     ('S0642L01U03', 'how are you, madam?', '女士，您好吗？', 'nǚshì, nín hǎo ma？'),
                     ('S0642L01U04', 'please sit down, sir', '先生，您请坐', 'xiānsheng, nín qǐng zuò'),
                     ('S0642L01U05', 'what would you like, madam?', '女士，您想要什么？', 'nǚshì, nín xiǎngyào shénme？'),
                     ('S0642L01U06', "I'd like to help you, madam", '女士，我想帮助您', 'nǚshì, wǒ xiǎng bāngzhù nín'),
                     ('S0649L01B03', 'are you ready, madam?', '女士，您准备好了吗？', 'nǚshì, nín zhǔnbèi hǎo le ma？'),
                     ('S0649L01U05', "when you're ready, sir, we can go", '先生，您准备好了，我们就走', 'xiānsheng, nín zhǔnbèi hǎo le, wǒmen jiù zǒu'),
                     ('S0650L01B03', 'do you want to leave, sir?', '先生，您想走吗？', 'xiānsheng, nín xiǎng zǒu ma？'),
                     ('S0653L01U04', 'madam, do you mind if I sit here?', '女士，我坐这里您介意吗？', 'nǚshì, wǒ zuò zhèlǐ nín jièyì ma？'),
                     ('S0655L01B02', 'you do it very well, sir', '先生，您做得很好', 'xiānsheng, nín zuò de hěn hǎo')]:
    P(pid, k, t, r)
# rows that never held their (whole-sentence) LEGO before; only the title was added
OVERRIDE_P17.update(['S0642L01B01', 'S0642L01B02', 'S0642L01B03', 'S0642L01U01', 'S0642L01U02', 'S0642L01U03', 'S0642L01U04', 'S0642L01U05', 'S0642L01U06',
                     'S0642L02B03', 'S0649L01B03', 'S0649L01U05', 'S0650L01B03', 'S0653L01U04', 'S0655L01B02'])

# E4b — formal-you practice in played (new) baskets after 643; taught words only; LEGO kept whole
E4B = [('S0652L01', 'what do you need, madam?', '女士，您需要什么？', 'nǚshì, nín xūyào shénme？'),
       ('S0654L02', 'sir, can you come or not?', '先生，您能不能来？', 'xiānsheng, nín néng bù néng lái？'),
       ('S0655L01', "I think you're doing very well, sir", '先生，我觉得您做得很好', 'xiānsheng, wǒ juéde nín zuò de hěn hǎo'),
       ('S0657L01', 'how do you feel today, sir?', '先生，您今天感觉怎么样？', 'xiānsheng, nín jīntiān gǎnjué zěnmeyàng？'),
       ('S0661L01', 'madam, what are you doing?', '女士，您正在做什么？', 'nǚshì, nín zhèngzài zuò shénme？'),
       ('S0662L01', 'sir, you speak very well', '先生，您说得很好', 'xiānsheng, nín shuō de hěn hǎo'),
       ('S0663L01', 'I agree with what you just said, sir', '先生，我同意您刚才说的', 'xiānsheng, wǒ tóngyì nín gāngcái shuō de'),
       ('S0664L01', "sir, when you're ready, tell me", '先生，您准备好了告诉我', 'xiānsheng, nín zhǔnbèi hǎo le gàosu wǒ')]

# E4b rows, ids = next free USE number in each basket (from the 4 Nov dump)
INS_PHR.append(dict(id='zho_for_eng:S0652L01U07', seed_number=652, lego_index=1, known_text='what do you need, madam?', target_text='女士，您需要什么？', target_text_roman='nǚshì, nín xūyào shénme？', phrase_role='use', position=99, status='draft'))
INS_PHR.append(dict(id='zho_for_eng:S0654L02U07', seed_number=654, lego_index=2, known_text='sir, can you come or not?', target_text='先生，您能不能来？', target_text_roman='xiānsheng, nín néng bù néng lái？', phrase_role='use', position=99, status='draft'))
INS_PHR.append(dict(id='zho_for_eng:S0655L01U08', seed_number=655, lego_index=1, known_text="I think you're doing very well, sir", target_text='先生，我觉得您做得很好', target_text_roman='xiānsheng, wǒ juéde nín zuò de hěn hǎo', phrase_role='use', position=99, status='draft'))
INS_PHR.append(dict(id='zho_for_eng:S0657L01U08', seed_number=657, lego_index=1, known_text='how do you feel today, sir?', target_text='先生，您今天感觉怎么样？', target_text_roman='xiānsheng, nín jīntiān gǎnjué zěnmeyàng？', phrase_role='use', position=99, status='draft'))
INS_PHR.append(dict(id='zho_for_eng:S0661L01U04', seed_number=661, lego_index=1, known_text='madam, what are you doing?', target_text='女士，您正在做什么？', target_text_roman='nǚshì, nín zhèngzài zuò shénme？', phrase_role='use', position=99, status='draft'))
INS_PHR.append(dict(id='zho_for_eng:S0662L01U07', seed_number=662, lego_index=1, known_text='sir, you speak very well', target_text='先生，您说得很好', target_text_roman='xiānsheng, nín shuō de hěn hǎo', phrase_role='use', position=99, status='draft'))
INS_PHR.append(dict(id='zho_for_eng:S0663L01U07', seed_number=663, lego_index=1, known_text='I agree with what you just said, sir', target_text='先生，我同意您刚才说的', target_text_roman='xiānsheng, wǒ tóngyì nín gāngcái shuō de', phrase_role='use', position=99, status='draft'))
INS_PHR.append(dict(id='zho_for_eng:S0664L01U07', seed_number=664, lego_index=1, known_text="sir, when you're ready, tell me", target_text='先生，您准备好了告诉我', target_text_roman='xiānsheng, nín zhǔnbèi hǎo le gàosu wǒ', phrase_role='use', position=99, status='draft'))
OVERRIDE_P17.update(['S0652L01U07', 'S0654L02U07', 'S0655L01U08', 'S0657L01U08', 'S0661L01U04', 'S0662L01U07', 'S0663L01U07', 'S0664L01U07'])  # English LEGO glosses here are whole-sentence or word-order fragments ('need what', 'can or cannot', 'how does it feel'); Chinese chunk is contained
