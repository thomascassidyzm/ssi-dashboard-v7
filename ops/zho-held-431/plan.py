# cs #431·AI — zho_for_eng held items (the 26 #425·AI re-checked, d/58d93baf + table d/1fce4b85), applied on
# Kai's 17 Nov 2026 12:42Z yes ("if you're reasonably confident it doesn't clash with mine or tom's rulings and it
# has a precedent, you're welcome to fix"). Builds ONE edit-batch for POST /api/production/zho_for_eng/edit-batch.
# Every op carries an `expect` read from the live course (GET /api/production/zho_for_eng/seeds) so drift aborts it.
# Usage: python3 plan.py <seeds.json> -> batch.ops.json (+ prints the rows whose text changes, for audio)
# Per-item gate (ruling clash + precedent) is gate.md beside this file.
import json, re, sys, collections

SEEDS = json.load(open(sys.argv[1]))['seeds']
BY = {s['seed_number']: s for s in SEEDS}
LEGO = {l['lego_id']: l for s in SEEDS for l in s['legos']}
PHR = {p['id'].split(':')[1]: (p, l) for s in SEEDS for l in s['legos'] for p in l.get('basket_phrases', [])}
AUTH = 'cs #431·AI zho held items, Kai 17 Nov 2026 12:42Z'
KAI_GO = "Kai, 17 Nov 2026 12:42Z, to 'Apply all six Chinese families as recommended, with a trial run first and the clips re-recorded? Y/N': Yes I think. Hard to say without more detail but if you're reasonably confident it doesn't clash with mine or tom's rulings and it has a precedent, you're welcome to fix."

# ---- pinyin: exact row text already in the course wins; else per-character from the course's own aligned rows ----
PUN = re.compile(r'[，。？！、,.?!\s“”"：:；;…]')
ROMAN_BY_TEXT = {}
cnt = collections.defaultdict(collections.Counter)
SYLL = re.compile(r"(?:zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])?[aeiouüāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]+(?:ng|n(?![aeiouüāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ])|r(?![aeiouüāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]))?")
def _rows():
    for s in SEEDS:
        yield s['target_text'], s.get('target_text_roman')
        for l in s['legos']:
            yield l['target_text'], l.get('target_text_roman')
            for p in l.get('basket_phrases', []): yield p['target_text'], p.get('target_text_roman')
for t, r in _rows():
    if not t or not r: continue
    ROMAN_BY_TEXT.setdefault(t, r)
    cs = PUN.sub('', t); ss = [x for w in re.findall(r"[^\s,.?!'’]+", r.replace("'", ' ')) for x in SYLL.findall(w)]
    if len(cs) == len(ss):
        for c, s in zip(cs, ss): cnt[c][s.lower()] += 1
# polyphones / spellings read by hand for the texts below
HAND = {'得': None}  # 得 is de after a verb everywhere it appears in this batch
def roman(t):
    if t in ROMAN_BY_TEXT: return ROMAN_BY_TEXT[t]
    out = []
    for c in t:
        if c in '，,': out.append(','); continue
        if c in '？?': out.append('?'); continue
        if c in '。.！!': continue
        if not cnt[c]: raise SystemExit(f'no pinyin for {c} in {t}')
        out.append(cnt[c].most_common(1)[0][0])
    s = ' '.join(out).replace(' ,', ',').replace(' ?', '?')
    return s

ops = []; changed = []  # changed: (kind, key, side) slots whose words change -> need audio
def lego(lid, set_, expect_keys=('known_text', 'target_text')):
    l = LEGO[lid]; s = dict(set_)
    if 'target_text' in s and 'target_text_roman' not in s: s['target_text_roman'] = roman(s['target_text'])
    ops.append({'op': 'lego.update', 'lego_id': lid, 'set': s, 'expect': {k: l[k] for k in expect_keys}})
    if s.get('known_text', l['known_text']).lower() != l['known_text'].lower(): changed.append(('lego', lid, 'known', s['known_text']))
    if s.get('target_text', l['target_text']) != l['target_text']:
        changed.append(('lego', lid, 'target1', s['target_text'])); changed.append(('lego', lid, 'target2', s['target_text']))
    if s.get('known_text', l['known_text']) != l['known_text']: changed.append(('lego', lid, 'presentation', s['known_text']))
def phr(pid, known=None, target=None):
    p, _ = PHR[pid]; s = {}
    if known is not None and known != p['known_text']: s['known_text'] = known
    if target is not None and target != p['target_text']:
        s['target_text'] = target; s['target_text_roman'] = roman(target)
    if not s: return
    ops.append({'op': 'phrase.update', 'phrase_id': f'zho_for_eng:{pid}', 'set': s,
                'expect': {'known_text': p['known_text'], 'target_text': p['target_text']}})
    if 'known_text' in s and s['known_text'].lower().rstrip('?.') != p['known_text'].lower().rstrip('?.'): changed.append(('phrase', pid, 'known', s['known_text']))
    elif 'known_text' in s and s['known_text'].rstrip('.').endswith('?') != p['known_text'].rstrip('.').endswith('?'): changed.append(('phrase', pid, 'known', s['known_text']))
    if 'target_text' in s and PUN.sub('', s['target_text']) + ('?' if s['target_text'].endswith(('？', '?')) else '') != PUN.sub('', p['target_text']) + ('?' if p['target_text'].endswith(('？', '?')) else ''):
        changed.append(('phrase', pid, 'target1', s['target_text'])); changed.append(('phrase', pid, 'target2', s['target_text']))
def delp(pid):
    p, _ = PHR[pid]
    ops.append({'op': 'phrase.delete', 'phrase_id': f'zho_for_eng:{pid}', 'expect': {'known_text': p['known_text'], 'target_text': p['target_text']}})
def seed(n, known=None, target=None):
    s0 = BY[n]; s = {}
    if known is not None: s['known_text'] = known
    if target is not None: s['target_text'] = target; s['target_text_roman'] = roman(target)
    ops.append({'op': 'seed.update', 'seed_number': n, 'set': s, 'expect': {'known_text': s0['known_text'], 'target_text': s0['target_text']}})
    if known is not None and known.lower().rstrip('?.') != s0['known_text'].lower().rstrip('?.'): changed.append(('seed', n, 'known', known))
    if target is not None: changed.append(('seed', n, 'target1', target)); changed.append(('seed', n, 'target2', target))
def ins(pid, role, known, target, copy_seed=None):
    n = int(pid[1:5]); li = int(pid[6:8])
    row = {'id': f'zho_for_eng:{pid}', 'course_code': 'zho_for_eng', 'seed_number': n, 'lego_index': li, 'position': 100 + int(pid[-2:]),
           'known_text': known, 'target_text': target, 'target_text_roman': roman(target), 'phrase_role': role, 'status': 'draft',
           'introduce': role == 'build', 'metadata': {'format': 'build_use', 'authored': AUTH}, 'connected_lego_ids': [],
           'lego_position': 'end', 'word_count': len(known.split()), 'lego_count': 1}
    if copy_seed:
        sd = BY[copy_seed]
        for k in ('known_audio_id', 'target1_audio_id', 'target2_audio_id'): row[k] = sd[k]
    ops.append({'op': 'phrase.insert', 'row': row})
    if not copy_seed:
        changed.append(('phrase', pid, 'known', known)); changed.append(('phrase', pid, 'target1', target)); changed.append(('phrase', pid, 'target2', target))

# ======================= F1 — LEGO not in its own seed (L26 HARD; re-cut per L25) =======================
# S0025L05 好吗 'okay?' -> 帮我吗 'help me?' (seed 你会在我走之前帮我吗？ ends in it; 好吗 is never a tag in any seed)
lego('S0025L05', {'known_text': 'help me?', 'target_text': '帮我吗',
     'components': [{'known': 'to help', 'target': '帮', 'introduce': False}, {'known': 'me', 'target': '我', 'introduce': False}, {'known': 'yes-no question', 'target': '吗', 'introduce': False}]})
phr('S0025L05B01', 'help me?', '帮我吗')
phr('S0025L05B02', 'will he help me?', '他会帮我吗')
phr('S0025L05B03', 'will you help me?', '你会帮我吗')
phr('S0025L05B04', 'can he help me?', '他能帮我吗')
delp('S0025L05B05'); delp('S0025L05B06')
phr('S0025L05C01', 'me', '我')
phr('S0025L05U01', 'can you help me now?', '你现在能帮我吗？')
phr('S0025L05U02', 'can you help me tomorrow?', '你明天能帮我吗？')
phr('S0025L05U05', 'are you going to help me before six o\'clock?', '你会在六点之前帮我吗？')
phr('S0025L05U06', 'can she help me?', '她能帮我吗？')
phr('S0025L05U07', 'are you going to help me tomorrow?', '你明天会帮我吗？')
phr('S0025L05U08', 'is she going to help me?', '她会帮我吗？')
# knock-on: the only later ', okay?' tag prompt that leaned on the old 好吗 LEGO
phr('S0092L03U04', "let's speak Chinese together for a while", '我们一起说一会儿中文')

# S0073L02 更多要学 'more to learn' -> 还有很多要学 'got more to learn' (the seed's own words)
lego('S0073L02', {'known_text': 'got more to learn', 'target_text': '还有很多要学',
     'components': [{'known': 'still have', 'target': '还有'}, {'known': 'a lot', 'target': '很多'}, {'known': 'to', 'target': '要'}, {'known': 'learn', 'target': '学'}]})
phr('S0073L02B01', 'got more to learn', '还有很多要学')
phr('S0073L02B03', None, '我还有很多要学')
phr('S0073L02B04', None, '你还有很多要学')
phr('S0073L02C01', 'still have', '还有')
phr('S0073L02U03', None, '我觉得我还有很多要学')
phr('S0073L02U04', None, '她还有很多要学')
phr('S0073L02U05', None, '我知道我还有很多要学')
phr('S0073L02U06', 'she thinks I\'ve got more to learn', '她觉得我还有很多要学')
phr('S0073L02U07', "he's got more to learn", '他还有很多要学')
phr('S0073L02U08', "but I've got more to learn", '但是我还有很多要学')
# knock-on (L34 unify first): seed 75 said the same English with 更多要学 -> one form, 还有很多要学, course-wide
seed(75, target='你还有很多要学吗？')
lego('S0075L01', {'target_text': '你还有很多要学吗',
     'components': [{'known': 'you', 'target': '你'}, {'known': 'have', 'target': '还有'}, {'known': 'a lot', 'target': '很多'}, {'known': 'to', 'target': '要'}, {'known': 'learn', 'target': '学'}, {'known': '', 'target': '吗'}]})
for pid in ('S0075L01B02', 'S0075L01B03', 'S0075L01B04'): phr(pid, None, '你还有很多要学吗？')
phr('S0075L01C03', 'a lot', '很多')
phr('S0075L01U04', None, '她想知道，你还有很多要学吗？')
phr('S0075L01U05', None, '我问你，你还有很多要学吗？')
phr('S0075L01U07', None, '告诉我，你还有很多要学吗？')
phr('S0075L01U08', None, '但是你还有很多要学吗？')

# S0091L01 说得更快 'to speak more quickly' -> 想得够快 'to think quickly enough'
lego('S0091L01', {'known_text': 'to think quickly enough', 'target_text': '想得够快',
     'components': [{'known': 'think', 'target': '想得'}, {'known': 'quickly enough', 'target': '够快'}]})
phr('S0091L01B03', 'I think quickly enough', '我想得够快')
phr('S0091L01B04', 'to think quickly enough', '想得够快')
phr('S0091L01C01', 'think', '想得')
phr('S0091L01C02', 'quickly enough', '够快')
phr('S0091L01U01', 'I need to think quickly enough', '我需要想得够快')
phr('S0091L01U02', 'can you think quickly enough?', '你能想得够快吗？')
phr('S0091L01U03', 'he thinks quickly enough', '他想得够快')
phr('S0091L01U04', "it's difficult to think quickly enough", '很难想得够快')
phr('S0091L01U05', 'I think quickly enough now', '我现在想得够快')
phr('S0091L01U06', 'do you think quickly enough?', '你想得够快吗？')
phr('S0091L01U07', 'I hope I can think quickly enough', '我希望我能想得够快')
phr('S0091L01U08', 'she needs to think quickly enough', '她需要想得够快')

# S0117L01 这次 'this time' -> 上次 'last time' (seed 我肯定比上次…); 这次 stays taught at S0318L01
lego('S0117L01', {'known_text': 'last time', 'target_text': '上次',
     'components': [{'known': 'last', 'target': '上'}, {'known': 'time', 'target': '次'}]})
phr('S0117L01B01', 'last time', '上次')
phr('S0117L01B03', 'last time I', '上次我')
phr('S0117L01B04', 'last time you', '上次你')
phr('S0117L01B05', 'last time we', '上次我们')
phr('S0117L01C01', 'last', '上')
phr('S0117L01U01', 'last time I understood', '上次我懂了')
phr('S0117L01U02', 'I did better last time', '我上次做得更好')
phr('S0117L01U03', 'last time was different', '上次不一样')
phr('S0117L01U04', 'last time I knew what to do', '上次我知道做什么')
phr('S0117L01U05', 'I think last time was better', '我觉得上次更好')
phr('S0117L01U06', 'did you do better last time?', '你上次做得更好吗？')
phr('S0117L01U07', 'last time I needed to think more', '上次我需要多想想')
phr('S0117L01U08', 'I wanted to do better last time', '我上次想做得更好')
# knock-on: the one phrase in seed 117 that used 这次 before S0318L01 teaches it
phr('S0117L03U03', 'we chatted last time', '我们上次聊天了')

# S0147L01 非常紧张 'very nervous' -> 紧张 'nervous' (every phrase still contains it)
lego('S0147L01', {'known_text': 'nervous', 'target_text': '紧张', 'type': 'A', 'components': None, 'target_text_roman': 'jǐnzhāng'}, ('known_text', 'target_text', 'type'))
delp('S0147L01C01'); delp('S0147L01C02')

# S0293L02 见你 'to meet you' -> 见我 'to meet me'
lego('S0293L02', {'known_text': 'to meet me', 'target_text': '见我', 'target_text_roman': 'jiàn wǒ',
     'components': [{'known': 'meet', 'target': '见'}, {'known': 'me', 'target': '我'}]})
phr('S0293L02B01', 'to meet me', '见我')
phr('S0293L02B03', 'he wants to meet me', '他想见我')
phr('S0293L02B04', 'she can meet me', '她能见我')
phr('S0293L02C02', 'me', '我')
phr('S0293L02U01', 'I hope he can meet me soon', '我希望他很快能见我')
phr('S0293L02U02', 'she wants to meet me tonight', '她想今晚见我')
phr('S0293L02U03', "I don't know where she's going to meet me", '我不知道她要在哪里见我')
phr('S0293L02U04', 'I need to find out when he can meet me', '我需要弄清楚他什么时候能见我')
phr('S0293L02U05', 'I think it would be better if she could meet me today', '我觉得如果她今天能见我会更好')
phr('S0293L02U06', 'I have to find out where she wants to meet me', '我得弄清楚她想在哪里见我')
phr('S0293L02U07', 'can you meet me tomorrow?', '你明天能见我吗？')
phr('S0293L02U08', 'do you know when he can meet me?', '你知道他什么时候能见我吗？')

# S0336L01 扇 glossed 'door' -> 那扇门 'that door' (L34/K40: the measure word travels with its noun)
lego('S0336L01', {'known_text': 'that door', 'target_text': '那扇门', 'type': 'M', 'target_text_roman': 'nà shàn mén',
     'components': [{'known': 'that', 'target': '那'}, {'known': '(measure word for doors)', 'target': '扇'}, {'known': 'door', 'target': '门'}]}, ('known_text', 'target_text', 'type'))
phr('S0336L01B02', 'I can see that door', '我能看见那扇门')
phr('S0336L01B03', 'I like that door', '我喜欢那扇门')
phr('S0336L01U02', 'she wants to see that door', '她想看那扇门')
phr('S0336L01U04', 'he needs to find that door', None)
phr('S0336L01U07', 'she said she likes that door', '她说她喜欢那扇门')

# S0129L01 这么高兴 — HELD (see gate.md): re-cutting to 我很高兴 leaves 这么 (做得这么好) taught by no LEGO, against Kai's
# 12 Nov 'every seed part is a LEGO'; the fix needs a lego.insert, a structural op this approval did not name.

# S0259L01 好想法 'good idea' -> 想法 'idea' (every phrase still contains it)
lego('S0259L01', {'known_text': 'idea', 'target_text': '想法', 'type': 'A', 'components': None, 'target_text_roman': 'xiǎngfǎ'}, ('known_text', 'target_text', 'type'))
delp('S0259L01C01'); delp('S0259L01C02')

# S0337L01 喜欢玩 'to like to play' -> 继续玩 'to keep playing' (继续 taught S0092L02)
lego('S0337L01', {'known_text': 'to keep playing', 'target_text': '继续玩', 'target_text_roman': 'jìxù wán',
     'components': [{'known': 'keep on', 'target': '继续'}, {'known': 'play', 'target': '玩'}]})
phr('S0337L01B01', 'to keep playing', '继续玩')
phr('S0337L01B03', 'she wants to keep playing', '她想继续玩')
phr('S0337L01B04', 'I want to keep playing', '我想继续玩')
phr('S0337L01C01', 'keep on', '继续')
phr('S0337L01U03', 'do you want to keep playing?', '你想继续玩吗？')
phr('S0337L01U04', "he can't keep playing", '他不能继续玩')
phr('S0337L01U06', 'I think she can keep playing', '我觉得她还能继续玩')
phr('S0337L01U07', 'do you think he can keep playing?', '你觉得他还能继续玩吗？')   # P26 seed copy: seed 337's own clips

# ======================= F2 — capitals (orthography, 0 chars) =======================
for lid, k in (('S0064L01', 'Chinese'), ('S0316L01', 'Monday'), ('S0371L01', 'Wednesday'), ('S0404L02', 'Thursday'), ('S0428L01', 'Tuesday')):
    lego(lid, {'known_text': k})
phr('S0064L02B04', 'fun Chinese'); phr('S0404L02B01', 'Thursday'); phr('S0428L01B01', 'Tuesday')
phr('S0120L01U05', 'can we go by bus?')

# ======================= F3 — two sentences =======================
seed(61, target='你能慢一点再说一遍吗？')
ins('S0061L03U09', 'use', 'could you say that again a little more slowly?', '你能慢一点再说一遍吗？')   # seed's NEW clips, linked after render
ins('S0082L01U08', 'use', "I'm not going to wait for you", '我不会等你')
seed(141, known='no problem, everything is okay')
ins('S0141L02U09', 'use', 'no problem, everything is okay', '没问题，一切都好', copy_seed=141)

# ======================= F4 — meaning =======================
seed(643, known='do you want it, sir?')
lego('S0643L01', {'known_text': 'do you want it, sir?'})
phr('S0643L01B01', 'do you want it, sir?'); phr('S0643L01U01', 'do you want it, sir?')
delp('S0643L01B02')   # 'do you want it, sir?' | 先生，您想要它吗 would be one English with two answers
seed(659, known='could you all say that again?')
phr('S0659L01U01', 'could you all say that again?')

# ======================= F6 — 儿 tile =======================
lego('S0092L03', {'components': [{'known': 'a while', 'target': '一会'}]}, ('known_text', 'target_text'))

# ======================= extra — seed 162 ZUT 'about that' =======================
phr('S0162L01B03', 'what do you think about this', '这个你觉得怎么样')

# ======================= F5 — 'that one' 那座 vs 那个 (ZUT; L34 + K23(d) + K47) — SECOND batch =======================
# 教堂 'church' is taught first (K47), then S0551 那座 grows to 那座教堂 'that church' so 座 never stands bare.
# The reorder relabels L01<->L02; the ops after it name the NEW labels (the batch runs in order in one transaction).
ops2 = []
_main_ops, _main_changed = ops, changed
ops, changed = ops2, []
ops.append({'op': 'lego.reorder', 'seed_number': 551, 'order': ['S0551L02', 'S0551L01', 'S0551L03']})
def _old(pid_new):  # the phrase as read, under its pre-reorder label
    m = {'S0551L01': 'S0551L02', 'S0551L02': 'S0551L01'}
    return m.get(pid_new[:8], pid_new[:8]) + pid_new[8:]
_PHR_OLD = dict(PHR)
for k in list(PHR):
    if k.startswith('S0551L0'): PHR[k[:8].replace('S0551L01','X').replace('S0551L02','S0551L01').replace('X','S0551L02') + k[8:]] = _PHR_OLD[k]
LEGO['S0551L02n'] = LEGO['S0551L01']
ops.append({'op': 'lego.update', 'id': 'ede3ee9a-a9de-45a2-96af-21d6d01e0e3b', 'set': {'known_text': 'that church', 'target_text': '那座教堂', 'target_text_roman': 'nà zuò jiàotáng',
    'components': [{'known': 'that', 'target': '那'}, {'known': '(measure word for buildings)', 'target': '座'}, {'known': 'church', 'target': '教堂'}]},
    'expect': {'known_text': 'that one', 'target_text': '那座'}})
changed += [('lego', 'S0551L02', 'known', 'that church'), ('lego', 'S0551L02', 'target1', '那座教堂'), ('lego', 'S0551L02', 'target2', '那座教堂'), ('lego', 'S0551L02', 'presentation', 'that church')]
# church basket (now L01): its 那座教堂 phrases would reach forward to L02 -> say 'the church' with bare 教堂
phr('S0551L01B02', 'go to church', '去教堂')
phr('S0551L01U01', 'the church is beautiful', '教堂很美')
phr('S0551L01U03', 'I want to go to church', '我想去教堂')
phr('S0551L01U04', 'nobody goes to the church', '没有人去教堂')
phr('S0551L01U06', 'I saw the church', '我看到了教堂')
# that-church basket (now L02): every phrase carries its building
phr('S0551L02B02', 'that church', '那座教堂')
phr('S0551L02B03', 'in that church', '在那座教堂里')
phr('S0551L02U01', 'she was in that church', '她在那座教堂里')
phr('S0551L02U02', 'I saw that church', '我看到了那座教堂')
phr('S0551L02U03', 'nobody knows that church', '没有人知道那座教堂')
phr('S0551L02U04', 'that big church', '那座大教堂')
phr('S0551L02U05', 'she chose that church', '她选了那座教堂')
phr('S0551L02U06', 'that church is very beautiful', '那座教堂很美')
# ugly basket: English says 'that' where 那 says it; no bare 那座
phr('S0551L03U01', 'that church is ugly', None)
phr('S0551L03U03', 'that church is very ugly', '那座教堂非常丑')
phr('S0551L03U07', 'I think that church is ugly', None)
phr('S0551L03U09', 'I think that small church is very ugly', None)
seed(551, known='that church is ugly')
seed(634, known="I'd like that one")
phr('S0634L01U01', "I'd like that one", None)
ops2, changed2 = ops, changed
ops, changed = _main_ops, _main_changed

if __name__ == '__main__':
    json.dump({'ops': ops}, open('batch.ops.json', 'w'), ensure_ascii=False, indent=1)
    json.dump({'ops': ops2, 'kai_go': KAI_GO}, open('batch2.ops.json', 'w'), ensure_ascii=False, indent=1)
    json.dump(changed + changed2, open('changed-slots.json', 'w'), ensure_ascii=False, indent=1)
    print(len(ops2), 'ops in batch 2')
    print(len(ops), 'ops;', len(changed), 'audio slots change')
