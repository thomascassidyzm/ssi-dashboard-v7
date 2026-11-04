"""Cut a course's rows that LACK target_text_roman into reading chunks (job #272, 4 Nov 2026).

python3 extract.py <dumpdir> <course> <chunk_rows> [--min-seed N] [--max-seed N] [--no-phrases-above N]
  <dumpdir>/<course>.json        tools/course-optimization/course-dump-readonly-2026-10-14.cjs
  <dumpdir>/<course>.seeds.json  GET :3470/api/production/<course>/seeds?status=all (seeds carry target_text_roman)
Writes chunks/<course>/NN.tsv  (kind key seed known target proposal context)
and    chunks/<course>/examples.tsv (existing romanised rows: the course's own convention, ≤ seed 300).
The proposal column is a MACHINE GUESS (pypinyin+jieba / pykakasi / korean-romanizer; empty for Arabic etc.).
A reader decides every row; nothing here is applied.
"""
import json, os, sys, random, re, argparse
ap = argparse.ArgumentParser()
ap.add_argument('dumpdir'); ap.add_argument('course'); ap.add_argument('chunk', type=int)
ap.add_argument('--no-phrases-above', type=int, default=None)
ap.add_argument('--out', default=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'chunks'))
a = ap.parse_args()
D = json.load(open(f'{a.dumpdir}/{a.course}.json'))
S = json.load(open(f'{a.dumpdir}/{a.course}.seeds.json'))['seeds']
lang = a.course.split('_')[0]

def has(r): return bool((r.get('target_text_roman') or '').strip())
def clean(s): return re.sub(r'[\t\r\n]+', ' ', s or '').strip()

prop = lambda t: ''
if lang == 'zho':
    import jieba
    from pypinyin import lazy_pinyin, Style
    jieba.setLogLevel(60)
    def prop(t):
        out = []
        for w in jieba.cut(t):
            if re.match(r'[㐀-鿿]', w): out.append(''.join(lazy_pinyin(w, style=Style.TONE)))
            elif w.strip(): out.append({'，': ',', '。': '.', '？': '?', '！': '!', '、': ','}.get(w, w))
        s = ' '.join(out)
        return re.sub(r' ([,.?!])', r'\1', s)
elif lang == 'jpn':
    import pykakasi
    K = pykakasi.kakasi()
    def prop(t): return ' '.join(x['hepburn'] for x in K.convert(t) if x['hepburn'].strip())
elif lang == 'kor':
    from korean_romanizer.romanizer import Romanizer
    def prop(t): return Romanizer(t).romanize()

seed_text = {s['seed_number']: (s['known_text'], s['target_text']) for s in S}
rows = []
for s in S:
    if not has(s): rows.append(('seed', str(s['seed_number']), s['seed_number'], s['known_text'], s['target_text'], ''))
for l in D['legos']:
    if not has(l): rows.append(('lego', l['lego_id'], l['seed_number'], l['known_text'], l['target_text'], seed_text.get(l['seed_number'], ('', ''))[1]))
for p in D['phrases']:
    if has(p): continue
    if a.no_phrases_above is not None and p['seed_number'] > a.no_phrases_above: continue
    rows.append(('phrase', p['id'], p['seed_number'], p['known_text'], p['target_text'], seed_text.get(p['seed_number'], ('', ''))[1]))
rows.sort(key=lambda r: (r[2], ['seed', 'lego', 'phrase'].index(r[0]), r[1]))
od = os.path.join(a.out, a.course); os.makedirs(od, exist_ok=True)
hdr = 'kind\tkey\tseed\tknown\ttarget\tproposal\tseed_target\n'
n = 0
for i in range(0, len(rows), a.chunk):
    n += 1
    with open(f'{od}/{n:02d}.tsv', 'w') as f:
        f.write(hdr)
        for k, key, sn, kn, t, ctx in rows[i:i + a.chunk]:
            f.write('\t'.join([k, key, str(sn), clean(kn), clean(t), clean(prop(t)), clean(ctx)]) + '\n')
ex = [('seed', s) for s in S if has(s) and s['seed_number'] <= 300] + [('lego', l) for l in D['legos'] if has(l) and l['seed_number'] <= 300] + [('phrase', p) for p in D['phrases'] if has(p) and p['seed_number'] <= 300]
random.seed(272)
with open(f'{od}/examples.tsv', 'w') as f:
    f.write('kind\tseed\tknown\ttarget\troman\n')
    for k, r in sorted(random.sample(ex, min(150, len(ex))), key=lambda x: (x[1]['seed_number'], x[0])):
        f.write('\t'.join([k, str(r['seed_number']), clean(r['known_text']), clean(r['target_text']), clean(r['target_text_roman'])]) + '\n')
print(a.course, len(rows), 'rows ->', n, 'chunks in', od)
