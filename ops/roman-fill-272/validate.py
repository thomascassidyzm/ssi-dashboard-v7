"""Check a reader's answer file against its chunk (job #272).
python3 validate.py chunks/<course>/NN.tsv out/<course>/NN.tsv
The answer file is TSV with header 'key\troman' and EXACTLY one line per chunk row.
Mechanical checks only (coverage, no blanks, script); zho is also matched character-by-character
against pypinyin's readings (tone marks), kor by Hangul-syllable count. Passing is necessary, not sufficient:
the reading is the reader's job."""
import sys, re, unicodedata, os
chunk, ans = sys.argv[1], sys.argv[2]
course = os.path.basename(os.path.dirname(os.path.abspath(chunk)))
lang = course.split('_')[0]
rows = [l.rstrip('\n').split('\t') for l in open(chunk)][1:]
A = {}
errs = []
lines = [l.rstrip('\n') for l in open(ans)]
if lines[0] != 'key\troman': errs.append('header must be key<TAB>roman')
for i, l in enumerate(lines[1:], 2):
    if not l.strip(): continue
    p = l.split('\t')
    if len(p) != 2: errs.append(f'line {i}: needs exactly 2 tab-separated fields'); continue
    if p[0] in A: errs.append(f'line {i}: duplicate key {p[0]}')
    A[p[0]] = p[1].strip()
keys = [r[1] for r in rows]
for k in keys:
    if k not in A: errs.append(f'missing {k}')
    elif not A[k]: errs.append(f'blank roman for {k}')
for k in A:
    if k not in set(keys): errs.append(f'unknown key {k}')
if lang == 'zho':
    # the character-by-character matcher of ops/zho-pinyin-252/check_pinyin.py (#252), which loads its files at import
    _p = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'zho-pinyin-252', 'check_pinyin.py')).read()
    _p = _p.split("if __name__")[0].replace("D=json.load(open(sys.argv[1])); S=json.load(open(sys.argv[2]))['seeds']", "")
    _g = {}; exec(_p, _g); match = _g['match']
for r in rows:
    k, t = r[1], r[4]; ro = A.get(k, '')
    if not ro: continue
    if re.search(r'[؀-ۿ぀-ヿ㐀-鿿가-힯Ѐ-ӿ԰-֏֐-׿ऀ-ॿ฀-๿Ͱ-Ͽ]', ro):
        errs.append(f'{k}: roman still contains non-Latin script: {ro}')
    if lang == 'zho' and match(t, ro, True) is False:
        errs.append(f'{k}: pinyin does not spell {t} (tone or syllable): {ro}')
    if lang == 'kor':
        n = len(re.findall(r'[가-힯]', t)); m = len([x for x in re.split(r'[\s\-]+', re.sub(r'[^\w\s\-]', ' ', ro)) if x])
        if n != m: errs.append(f'{k}: {n} Hangul syllables but {m} hyphen/space units: {t} | {ro}')
print(f'{course} {os.path.basename(chunk)}: {len(rows)} rows, {len(A)} answers, {len(errs)} problems')
for e in errs[:200]: print('  ' + e)
sys.exit(1 if errs else 0)
