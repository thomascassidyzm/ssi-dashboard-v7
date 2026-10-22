#!/usr/bin/env python3
"""Candidate detectors for the fin/ita -> nine-course pattern transfer (job #420).
Every detector prints its COVERAGE (rows scanned) and writes a candidate TSV.
A hit is a CANDIDATE for a reader, never a verdict (canon R0.16 / Kai: no regex verdicts)."""
import json, re, sys, os, unicodedata, collections, csv

LIVE = os.environ.get('LIVE', 'live')
OUT = os.environ.get('OUT', 'cand')
course = sys.argv[1]
lang = course.split('_for')[0]
os.makedirs(f'{OUT}/{course}', exist_ok=True)

d = json.load(open(f'{LIVE}/{course}.seeds.json'))
seeds = sorted(d['seeds'], key=lambda s: s['seed_number'])
legos, phrases = [], []
for s in seeds:
    for l in sorted(s['legos'], key=lambda l: l['lego_index'] or 0):
        l['_seed'] = s
        legos.append(l)
        for p in l.get('basket_phrases') or []:
            p['_lego'] = l; p['_seed'] = s
            phrases.append(p)
pres = {}
pp = f'{LIVE}/{course}.pres.json'
if os.path.exists(pp):
    pres = json.load(open(pp))

NONLATIN = lang in ('ara', 'zho', 'jpn', 'kor')
def norm(t):
    t = (t or '').strip().lower()
    t = t.replace('’', "'").replace('‘', "'").replace('“', '"').replace('”', '"')
    return re.sub(r'\s+', ' ', t)
def toks(t, side='known'):
    t = norm(t)
    if side == 'target' and lang in ('zho', 'jpn'):
        return [c for c in re.sub(r'[\s\W]', '', t)]
    return [w for w in re.findall(r"[^\W\d_]+(?:'[^\W\d_]+)?", t)]
def strip_punct(t):
    return re.sub(r'[^\w\s\']', ' ', norm(t))

cov = {}
def write(name, header, rows):
    cov[name + '_hits'] = len(rows)
    with open(f'{OUT}/{course}/{name}.tsv', 'w', newline='') as f:
        w = csv.writer(f, delimiter='\t', lineterminator='\n')
        w.writerow(header); w.writerows(rows)

def seed_line(s): return f"S{s['seed_number']:04d}"
def lego_line(l): return f"{l['lego_id']}{'' if l.get('is_new') else ' (not new)'}: {l['known_text']} | {l['target_text']}"

# ---------------- D1 want-you-to ----------------
WANT = re.compile(r"\b(want(?:s|ed)?|'d like|would like|wouldn't like|would not like|like|liked|likes|need(?:s|ed)?|expect(?:s|ed)?|ask(?:s|ed)?|told|tell|allow(?:s|ed)?|get|got)\s+(me|you|him|her|us|them|it|someone|somebody|people|everyone|everybody|anyone|the \w+|my \w+|your \w+|his \w+|her \w+|our \w+|their \w+|\w+)\s+(not\s+)?to\b")
HOPE = re.compile(r"\b(hope(?:s|d)?|wish(?:es|ed)?|insist(?:s|ed)?|suggest(?:s|ed)?|prefer(?:s|red)?|demand(?:s|ed)?)\s+(that\s+)?(i|you|he|she|we|they|it|my|your|his|her|our|their|people|everyone)\b")
rows = []
for s in seeds:
    k = norm(s['known_text'])
    m = WANT.search(k) or HOPE.search(k)
    if not m: continue
    # exclude same-subject "I want to"
    rows.append([seed_line(s), s['known_text'], s['target_text'], m.group(0), ' || '.join(lego_line(l) for l in s['legos'])])
cov['D1_seeds_scanned'] = len(seeds)
write('D1_want_you_to', ['seed', 'english', 'target', 'match', 'legos_in_seed'], rows)

# ---------------- D2 conjunction placement ----------------
CONJ = {'fin': ['että', 'ettei'], 'ita': ['che'], 'fra': ['que', "qu'"], 'spa': ['que'], 'por': ['que'], 'por_br': ['que'],
        'deu': ['dass', 'ob'], 'ara': ['أن', 'أنّ', 'إن', 'إنّ', 'بأن', 'إنه', 'أنه', 'أنك', 'أنني', 'إنني', 'أننا', 'أنها', 'أنهم'],
        'jpn': ['と', 'って', 'か'], 'kor': ['고', '다고', '라고', '냐고', '자고', '지'], 'zho': []}
cj = CONJ.get(lang, [])
rows = []
shape_count = collections.Counter()
for l in legos:
    t = norm(l['target_text'])
    if lang in ('zho',): break
    if lang in ('jpn',):
        tt = re.sub(r'[\s。、,，]', '', t)
        hit = [c for c in cj if c in tt]
        if not hit: continue
        if any(tt.endswith(c) for c in cj): shape = 'clause+marker (ends with marker)'
        elif any(tt.startswith(c) for c in cj): shape = 'marker+head (starts with marker)'
        else: shape = 'marker inside chunk'
    elif lang == 'kor':
        ws = t.split()
        hit = [c for c in cj if any(w.endswith(c) for w in ws)]
        if not hit: continue
        if any(ws[-1].endswith(c) for c in cj): shape = 'clause+marker (ends with marker)'
        elif len(ws) > 1 and any(ws[0].endswith(c) for c in cj): shape = 'marker on first word (clause-initial)'
        else: shape = 'marker inside chunk'
    else:
        ws = re.findall(r"[^\W\d_]+'?", t.replace("’", "'"))
        ws = [w for w in ws]
        if lang == 'fra':
            hit = [w for w in ws if w in ('que', "qu'") or w.startswith("qu'")]
        else:
            hit = [w for w in ws if w.rstrip(',') in cj]
        if not hit: continue
        first, last = ws[0], ws[-1]
        isc = lambda w: (w in cj) or (lang == 'fra' and w.startswith("qu'"))
        if len(ws) == 1: shape = 'conjunction alone'
        elif isc(last): shape = 'head+conj (ends with conjunction)'
        elif isc(first): shape = 'conj+clause (starts with conjunction)'
        else: shape = 'conj inside chunk'
    shape_count[shape] += 1
    rows.append([seed_line(l['_seed']), l['lego_id'], 'new' if l.get('is_new') else 'not new', shape, l['known_text'], l['target_text'], l['_seed']['known_text'], l['_seed']['target_text'], len(l.get('basket_phrases') or [])])
cov['D2_legos_scanned'] = len(legos); cov['D2_shapes'] = dict(shape_count)
write('D2_conjunction_placement', ['seed', 'lego', 'new', 'shape', 'english', 'target', 'seed_english', 'seed_target', 'phrases'], rows)

# ---------------- D3 say it / that / this ----------------
SAY = re.compile(r"\b(say|says|said|saying|tell|tells|told|telling|do|does|did|doing|done|know|knows|knew|mean|means|meant|understand|understood|explain|explained|repeat|repeated|hear|heard)\s+(it|that|this)\b(?!\s+(i|you|he|she|we|they|it|there|the|my|your|his|her|our|their|a|an|was|is|would|could|will|can|might|should|must)\b)")
rows = []
for p in phrases + legos:
    k = norm(p['known_text'])
    for m in SAY.finditer(k):
        rows.append([seed_line(p['_seed']), p.get('id') or p['lego_id'], m.group(1), m.group(2), p['known_text'], p['target_text']])
cov['D3_rows_scanned'] = len(phrases) + len(legos)
write('D3_say_it_that_this', ['seed', 'row', 'verb', 'pronoun', 'english', 'target'], rows)

# ---------------- D4 negative-polarity words without their negator ----------------
NEG_EN = re.compile(r"^(?:(?:to|for|with|at|about|from|of|in|on) )?(?:anything|anyone|anybody|anywhere|anymore|any more|nothing|nobody|no one|nowhere|never|ever|yet|any|none|either|neither|at all)$")
NEGATOR = {'fra': r"\b(ne|n')", 'spa': r"\b(no|ni|sin)\b", 'por': r"\b(não|nem|sem)\b", 'por_br': r"\b(não|nem|sem)\b",
           'ita': r"\b(non|né|senza)\b", 'deu': None, 'fin': r"\b(ei|en|et|emme|ette|eivät|eikä|ettei|älä)\b",
           'ara': r"(لا|ما|لم|لن|ليس|ليست|لست|لسنا|غير|بدون)", 'jpn': r"(ない|ません|なかった|ませんでした|ず|ぬ)", 'kor': r"(안 |못 |않|없|말|아니)", 'zho': r"(不|没|別|别|无|無)"}
rows = []
if NEGATOR.get(lang) is not None:
    for l in legos:
        k = norm(l['known_text'])
        if NEG_EN.match(k):
            has = bool(re.search(NEGATOR[lang], norm(l['target_text'])))
            rows.append([seed_line(l['_seed']), l['lego_id'], 'new' if l.get('is_new') else 'not new', 'negator present' if has else 'NO negator', l['known_text'], l['target_text'], l['_seed']['known_text'], l['_seed']['target_text']])
cov['D4_legos_scanned'] = len(legos)
write('D4_negative_polarity', ['seed', 'lego', 'new', 'negator', 'english', 'target', 'seed_english', 'seed_target'], rows)

# ---------------- D5 bare function-word LEGOs ----------------
FUNC_EN = set('to that in on at of for with from about by as than the a an not up down out into over under off'.split())
FUNC_T = {'fra': "à de que qu' en pour par sur dans avec si le la les un une du des au aux et ou mais ne pas y".split(),
          'spa': 'a de que en por para con si el la los las lo un una y o pero no al del'.split(),
          'por': 'a de que em por para com se o os as um uma e ou mas não ao do da dos das no na nos nas'.split(),
          'por_br': 'a de que em por para com se o os as um uma e ou mas não ao do da dos das no na nos nas'.split(),
          'deu': 'zu dass in an auf mit von bei nach für über ob wenn weil der die das ein eine nicht und oder aber als wie um aus durch vor seit bis'.split(),
          'ita': 'a di che in per con da su se il la lo le un una e o ma non al del della nel'.split(),
          'fin': 'että ettei ja tai mutta kun jos niin ei'.split(),
          'ara': 'في من على إلى أن إن ب ل عن و أو لكن مع عند حتى'.split(),
          'jpn': 'を に が は の と で へ か から まで も や って'.split(),
          'kor': '을 를 이 가 은 는 의 에 에서 와 과 로 으로 고 도 만 한테 에게'.split(),
          'zho': '的 了 在 把 被 和 跟 对 给 从 到 吗 呢 吧 就 也 都 很'.split()}
ft = set(FUNC_T.get(lang, []))
rows = []
for l in legos:
    if not l.get('is_new'): continue
    kw = toks(l['known_text']); tw = toks(l['target_text'], 'target') if lang not in ('zho','jpn') else [norm(l['target_text']).strip()]
    k1 = len(kw) == 1 and kw[0] in FUNC_EN
    t1 = len(tw) == 1 and tw[0].rstrip(',') in ft
    if k1 or t1:
        rows.append([seed_line(l['_seed']), l['lego_id'], 'known single function word' if k1 else '', 'target single function word' if t1 else '', l['known_text'], l['target_text'], l['_seed']['known_text'], l['_seed']['target_text'], len(l.get('basket_phrases') or [])])
cov['D5_new_legos_scanned'] = sum(1 for l in legos if l.get('is_new'))
write('D5_bare_function_word_legos', ['seed', 'lego', 'known_flag', 'target_flag', 'english', 'target', 'seed_english', 'seed_target', 'phrases'], rows)

# ---------------- D6 duplicates / new flags / dark baskets ----------------
def key(l): return (strip_punct(l['known_text']).strip(), strip_punct(l['target_text']).strip())
seen = {}
dup_new, notnew_nopair, = [], []
for l in legos:
    k = key(l)
    if l.get('is_new'):
        if k in seen:
            dup_new.append([seed_line(l['_seed']), l['lego_id'], seen[k], l['known_text'], l['target_text'], len(l.get('basket_phrases') or [])])
    else:
        if k not in seen:
            # any earlier lego matching one side only?
            notnew_nopair.append([seed_line(l['_seed']), l['lego_id'], l['known_text'], l['target_text'], len(l.get('basket_phrases') or [])])
    seen.setdefault(k, l['lego_id'])
dark_seeds = [[seed_line(s), s['known_text'], s['target_text'], ' || '.join(lego_line(l) for l in s['legos'])] for s in seeds if not any(l.get('is_new') for l in s['legos'])]
notnew_with_phrases = sum(len(l.get('basket_phrases') or []) for l in legos if not l.get('is_new'))
cov['D6_legos_scanned'] = len(legos); cov['D6_phrases_under_not_new_legos'] = notnew_with_phrases
write('D6a_new_but_duplicate', ['seed', 'lego', 'earlier_identical', 'english', 'target', 'phrases'], dup_new)
write('D6b_not_new_without_earlier_pair', ['seed', 'lego', 'english', 'target', 'phrases'], notnew_nopair)
write('D6c_seeds_with_no_new_lego', ['seed', 'english', 'target', 'legos'], dark_seeds)

# ---------------- D7 oversized LEGOs ----------------
def syll(t):
    t = norm(t)
    if lang in ('zho', 'jpn'): return len(re.sub(r'[\s\W]', '', t))
    if lang == 'kor': return len(re.sub(r'[\s\W]', '', t))
    if lang == 'ara': return max(1, round(len(re.sub(r'[\s\W]', '', t)) / 2))
    return len(re.findall(r'[aeiouyäöåáéíóúàèìòùâêîôûãõëïüœæ]+', t))
rows = []
for l in legos:
    if not l.get('is_new'): continue
    kw = len(toks(l['known_text'])); sy = syll(l['target_text'])
    if kw >= 7 or sy > 8:
        rows.append([seed_line(l['_seed']), l['lego_id'], kw, sy, l['known_text'], l['target_text'], l['_seed']['known_text'], len(l.get('basket_phrases') or [])])
cov['D7_new_legos_scanned'] = cov['D5_new_legos_scanned']
write('D7_oversized_legos', ['seed', 'lego', 'known_words', 'target_syll_est', 'english', 'target', 'seed_english', 'phrases'], rows)

# ---------------- D8 person missing on the known side (K26) ----------------
FIN_VERBS = set('said says wanted wants could couldn\'t would wouldn\'t will won\'t can can\'t is isn\'t was wasn\'t were weren\'t has hasn\'t had hadn\'t needs needed likes liked thinks thought knows knew told asked asks hopes hoped tried tries came comes went goes did does doesn\'t didn\'t got gets seems seemed feels felt speaks spoke lives lived works worked left means meant happened happens started finished arrived arrives wanted\'t prefers preferred decided decides forgot forgets remembers remembered understands understood believes believed answered answers called calls bought buys found finds gave gives took takes made makes put puts saw sees met meets sent sends promised promises wondered wonders expects expected managed manages plays played stayed stays looked looks talked talks moved moves ate eats drank drinks slept sleeps learnt learned learns taught teaches hurt hurts opened opens closed closes read reads wrote writes helped helps paid pays stopped stops waited waits showed shows explained explains returned returns kept keeps lost loses won wins sat sits stood stands ran runs let lets enjoyed enjoys loved loves hated hates missed misses'.split())
rows = []
if lang in ('ita', 'spa', 'por', 'por_br', 'ara', 'fin'):
    for l in legos:
        kw = toks(l['known_text'])
        if kw and kw[0] in FIN_VERBS and not re.search(r"\b(i|you|he|she|we|they|it|me|him|her|us|them|let|let's|sir|madam|everyone|people|someone|somebody|nobody|who|what)\b", norm(l['known_text'])) and not re.match(r"^(to|i|you|he|she|we|they|it|that|what|who|which|where|when|why|how|there|my|your|his|her|our|their|the|a|an|this|these|those|if|because|not|so|and|but|or|in|on|at|of|for|with|from|about|by|as|than|everyone|people|someone|nobody|somebody)\b", norm(l['known_text'])):
            rows.append([seed_line(l['_seed']), l['lego_id'], 'new' if l.get('is_new') else 'not new', l['known_text'], l['target_text'], l['_seed']['known_text'], l['_seed']['target_text'], len(l.get('basket_phrases') or [])])
cov['D8_legos_scanned'] = len(legos)
write('D8_person_missing_known_side', ['seed', 'lego', 'new', 'english', 'target', 'seed_english', 'seed_target', 'phrases'], rows)

# ---------------- D9 bare-verb gloss over a target infinitive (K41) ----------------
INF = {'fra': r"^(?:(?:me|te|se|nous|vous|le|la|les|lui|leur|y|en|l'|m'|t'|s'|ne|n')\s*)*[^\W\d_]+(?:er|ir|re|oir)$",
       'spa': r"^[^\W\d_]+(?:ar|er|ir)(?:se|me|te|lo|la|los|las|le|les|nos|os)?(?:lo|la|los|las|le|les|me|te|nos)?$",
       'por': r"^[^\W\d_]+(?:ar|er|ir|or)(?:-(?:me|te|se|lo|la|los|las|lhe|lhes|nos|vos|o|a|os|as))?$",
       'por_br': r"^[^\W\d_]+(?:ar|er|ir|or)(?:-(?:me|te|se|lo|la|los|las|lhe|lhes|nos|vos|o|a|os|as))?$",
       'ita': r"^[^\W\d_]+(?:are|ere|ire|arre|orre|urre|ar|er|ir)(?:mi|ti|si|ci|vi|lo|la|li|le|ne|gli|melo|mela|telo|tela|celo|cela|glielo|gliela|sene|cene|si)?$",
       'deu': r"^[^\W\d_]+en$"}
STOP_EN = set("to i you he she we they it that what who which where when why how there my your his her our their the a an this these those if because not so and but or in on at of for with from about by as than everyone people someone nobody somebody no yes very more less much many some any all every each both either neither another other such only just still already yet again never ever always sometimes often now then here there today tomorrow yesterday soon later early late well also too enough quite rather really maybe perhaps please thanks sorry".split())
rows = []
if lang in INF:
    pat = re.compile(INF[lang])
    for l in legos:
        tw = norm(l['target_text']).replace('’', "'").split()
        if not tw: continue
        first_t = tw[0] if lang != 'fra' else ' '.join(tw[:3])
        # fra: allow clitics before the verb; test each prefix
        tmatch = False
        if lang == 'fra':
            for n in range(1, min(4, len(tw)) + 1):
                if pat.match(' '.join(tw[:n]).replace(' ', '')) and re.search(r'(er|ir|re|oir)$', tw[n-1]): tmatch = True; break
            tmatch = tmatch and not re.match(r"^(le|la|les|un|une|des|du|de|à|au|aux|ce|cette|ces|mon|ma|mes|ton|ta|tes|son|sa|ses|notre|votre|leur|leurs|je|tu|il|elle|on|nous|vous|ils|elles|ne|n'|pas|et|ou|mais|si|que|qu'|quand|où|comment|pourquoi)$", tw[0])
        elif lang == 'deu':
            tmatch = bool(pat.match(tw[-1])) and len(tw) <= 3 and 'zu' not in tw and not re.match(r"^(ich|du|er|sie|es|wir|ihr|den|dem|der|die|das|ein|eine|einen|einem|einer|mein|dein|sein|unser|euer|ihr|kein|keine|keinen|wenn|dass|ob|weil|und|oder|aber|nicht|sehr|mit|in|an|auf|zu|bei|von|nach|über|für|am|im)$", tw[0]) and tw[-1] not in ('wochen','morgen','essen','leben','garten','wagen','jungen','freunden','kinder','eltern','schon','denn','wen','ihnen','ihren','seinen','meinen','deinen','unseren','diesen','keinen','einen','jeden','wegen','gegen','zwischen','neben','gern','gerne','sieben','abend','morgen','ferien','ideen','kosten','zeiten')
        else:
            tmatch = bool(pat.match(tw[0])) and tw[0] not in ('per','mar','pur','bar','ser','ter','ver','vir','ir','dar','por','ayer','mujer','placer','dover','potere','volere','avere','essere','señor','mejor','peor','mayor','menor','lugar','hogar','mar','par','sur','azar','militar','familiar','escolar','popular','mujer','taller','poder','deber','saber','querer','haber')
        if not tmatch: continue
        kw = toks(l['known_text'])
        if not kw: continue
        if kw[0] in STOP_EN or kw[0].endswith('ing') or kw[0] == 'to': continue
        rows.append([seed_line(l['_seed']), l['lego_id'], 'new' if l.get('is_new') else 'not new', l['known_text'], l['target_text'], l['_seed']['known_text'], l['_seed']['target_text'], len(l.get('basket_phrases') or [])])
cov['D9_legos_scanned'] = len(legos)
write('D9_bare_verb_over_infinitive', ['seed', 'lego', 'new', 'english', 'target', 'seed_english', 'seed_target', 'phrases'], rows)

# ---------------- D10 annotation that gets read aloud ----------------
ANN = re.compile(r"[()\[\]{}+*_~^<>|#=]|/(?!\d)|\b(formal|informal|polite|masc|fem|plural|singular|sg|pl|subj|subjunctive|lit\.?|literally)\b")
rows = []
for s in seeds:
    for side in ('known_text', 'target_text'):
        if ANN.search(s[side] or ''): rows.append([seed_line(s), s['seed_id'], side, s[side]])
for l in legos:
    for side in ('known_text', 'target_text'):
        if ANN.search(l[side] or ''): rows.append([seed_line(l['_seed']), l['lego_id'], side, l[side]])
    for c in l.get('components') or []:
        for side in ('known', 'target'):
            if ANN.search(str(c.get(side) or '')): rows.append([seed_line(l['_seed']), l['lego_id'] + ' component', side, c.get(side)])
for p in phrases:
    for side in ('known_text', 'target_text'):
        if ANN.search(p[side] or ''): rows.append([seed_line(p['_seed']), p['id'], side, p[side]])
for lid, pr in pres.items():
    t = pr.get('text') or ''
    body = re.sub(r"^The \w+ for:?\s*", '', t)
    if re.search(r"[()\[\]{}+*_~^<>|#=]|/(?!\d)", body): rows.append(['', lid + ' presentation', 'presentation', t])
cov['D10_texts_scanned'] = 2*len(seeds) + 2*len(legos) + 2*len(phrases) + len(pres)
write('D10_annotation_read_aloud', ['seed', 'row', 'side', 'text'], rows)

# ---------------- D11 presentations: mirror + target words ----------------
rows_mirror, rows_target, rows_missing = [], [], []
tvocab = collections.Counter()
kvocab = collections.Counter()
for l in legos:
    for w in toks(l['target_text'], 'target'): tvocab[w] += 1
    for w in toks(l['known_text']): kvocab[w] += 1
for p in phrases:
    for w in toks(p['target_text'], 'target'): tvocab[w] += 1
    for w in toks(p['known_text']): kvocab[w] += 1
LANGNAME = {'fra':'French','spa':'Spanish','por':'Portuguese','por_br':'Portuguese','deu':'German','ara':'Arabic','zho':'Chinese','jpn':'Japanese','kor':'Korean','ita':'Italian','fin':'Finnish'}
byid = {l['lego_id']: l for l in legos}
for lid, pr in pres.items():
    l = byid.get(lid)
    if not l: continue
    if not pr.get('exists') and not pr.get('text'):
        rows_missing.append([seed_line(l['_seed']), lid, l['known_text'], l['target_text']]); continue
    t = pr.get('text') or ''
    tn = norm(t); kn = norm(l['known_text'])
    if kn not in tn and strip_punct(kn).strip() not in strip_punct(tn):
        rows_mirror.append([seed_line(l['_seed']), lid, 'suggested' if pr.get('is_suggested') else ('human' if pr.get('human_authored') else 'stored'), l['known_text'], l['target_text'], t])
    # target words in narration
    if NONLATIN:
        if lang == 'ara': bad = re.findall(r'[؀-ۿ]+', t)
        elif lang == 'kor': bad = re.findall(r'[가-힯]+', t)
        else: bad = re.findall(r'[぀-ヿ一-鿿]+', t)
    else:
        words = toks(t)
        bad = [w for w in words if tvocab[w] >= 1 and kvocab[w] == 0 and w not in ('is', 'as', 'in', 'for', 'the', 'a', 'to', 'of', 'and', 'or', 'with', 'this', 'that', 'it', 'you', 'we', 'they', 'use', 'word', 'form', 'way', 'means', 'say', 'literally', 'which', 'when', 'talk', 'about', 'different', 'same', 'one', 'two', 'so', 'be', 'not', 'if', 'at', 'on', 'can', 'but', 'an', 'are', 'like', 'more', 'than', 'do', 'does', 'did', 'have', 'has', 'here', 'there', 'also', 'kind', 'sense', 'short', 'long', 'formal', 'informal', 'polite', 'masculine', 'feminine', 'plural', 'singular', 'man', 'woman', 'person', 'people', 'thing', 'things', 'something', 'someone', 'no', 'yes', 'very', 'just', 'only', 'still', 'already', 'yet', 'again', 'now', 'then', 'who', 'what', 'where', 'why', 'how', 'because', 'before', 'after')]
        bad = [w for w in bad if len(w) > 1]
    if bad:
        rows_target.append([seed_line(l['_seed']), lid, ' '.join(sorted(set(bad))), l['known_text'], l['target_text'], t])
cov['D11_presentations_read'] = len(pres); cov['D11_new_legos'] = cov['D5_new_legos_scanned']
write('D11a_presentation_not_mirroring_lego', ['seed', 'lego', 'source', 'english', 'target', 'presentation'], rows_mirror)
write('D11b_target_words_in_presentation', ['seed', 'lego', 'suspect_words', 'english', 'target', 'presentation'], rows_target)
write('D11c_presentation_missing', ['seed', 'lego', 'english', 'target'], rows_missing)

# ---------------- D12 future-in-the-past ----------------
FIP = re.compile(r"\b(said|told|thought|knew|promised|hoped|believed|expected|was sure|wasn't sure|wasn't sure|was afraid|realised|realized|decided|wondered|understood|imagined|assumed|supposed|heard|found out|mentioned|explained|wrote)\b[^.?!]{0,60}?\b(would|'d)\s+(?!have\b|had\b)(\w+)")
rows = []
for p in phrases + legos + seeds:
    k = norm(p['known_text'])
    m = FIP.search(k)
    if m:
        rows.append([seed_line(p.get('_seed') or p), p.get('id') or p.get('lego_id') or p.get('seed_id'), m.group(1), m.group(2) + ' ' + m.group(3), p['known_text'], p['target_text']])
cov['D12_rows_scanned'] = len(phrases) + len(legos) + len(seeds)
write('D12_would_after_past_frame', ['seed', 'row', 'frame', 'would_verb', 'english', 'target'], rows)

cov['course'] = course; cov['seeds'] = len(seeds); cov['legos'] = len(legos); cov['phrases'] = len(phrases); cov['new_legos'] = cov['D5_new_legos_scanned']
json.dump(cov, open(f'{OUT}/{course}/coverage.json', 'w'), indent=1, ensure_ascii=False)
print(json.dumps(cov, ensure_ascii=False))
