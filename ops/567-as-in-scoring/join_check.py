# Read-only join check (job #567): does each presentation intro's X equal its LEGO's known_text?
# Inputs are exports taken by psql from live Supabase (read-only SELECTs); nothing is written to course data.
# Usage: python3 join_check.py <scratch-dir>   (expects legos-live.csv and intro-live.csv inside it)
import csv, collections, re, sys, os

SCRATCH = sys.argv[1]
INTRO_RX = re.compile(r"^The .+? for: '(.*?)'(?:, as in — '.*?')?, is:$")
SUPERSEDED = '::superseded'


def norm(s):
    s = (s or '').replace('’', "'").replace('‘', "'")
    return re.sub(r'\s+', ' ', s).strip().lower()


def parse_x(text):
    m = INTRO_RX.match(text)
    return m.group(1) if m else None


legos = {}
for r in csv.DictReader(open(os.path.join(SCRATCH, 'legos-live.csv'), encoding='utf-8')):
    legos[(r['course_code'], r['lego_id'])] = r

clips = collections.defaultdict(list)
for r in csv.DictReader(open(os.path.join(SCRATCH, 'intro-live.csv'), encoding='utf-8')):
    clips[(r['course_code'], r['lego_id'])].append(r['text'])

defects = []
unparsed = 0
checked = 0
for key, texts in clips.items():
    lego = legos.get(key)
    if lego is None:
        continue
    current = [t for t in texts if SUPERSEDED not in t]
    for t in current:
        x = parse_x(t)
        if x is None:
            unparsed += 1
            continue
        checked += 1
        if norm(x) != norm(lego['known_text']):
            defects.append({'course_code': key[0], 'lego_id': key[1], 'known_text': lego['known_text'],
                            'intro_x': x, 'intro_text': t, 'as_in': ", as in — '" in t})

per = collections.Counter(d['course_code'] for d in defects)
out = os.path.join(SCRATCH, 'join-defects.csv')
with open(out, 'w', newline='', encoding='utf-8') as f:
    w = csv.DictWriter(f, fieldnames=list(defects[0].keys()))
    w.writeheader()
    w.writerows(sorted(defects, key=lambda d: (d['course_code'], d['lego_id'])))
print('current intro clips checked', checked, 'unparsed', unparsed, 'defects', len(defects))
print('defect LEGOs', len({(d['course_code'], d['lego_id']) for d in defects}))
for c, n in sorted(per.items(), key=lambda kv: -kv[1]):
    print(c, n)
