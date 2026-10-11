# Job #567: select the stub/default rows from the job #543 scores and cut them into worker batches.
# Stub = reason text recurs 3+ times across the 8,397 rows (a template, not a per-row reason),
# or the reason is 2 words or fewer. "context repeats X" is rubric-prescribed, so it is kept as-is.
# Reads the copied #543 scores; writes batches under ops/567-as-in-scoring/batches/. Nothing touches course data.
import csv, glob, collections, re, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', '543-as-in-context')
N_BATCHES = int(sys.argv[1]) if len(sys.argv) > 1 else 12
RX = re.compile(r"^The .+? for: '(.*?)'(?:, as in — '(.*?)')?, is:$")
REPEATS = 'context repeats X'

asin = {(r['course_code'], r['lego_id']): r for r in csv.DictReader(open(os.path.join(ROOT, 'input/as-in-rows.csv'), encoding='utf-8'))}
scored = []
for f in sorted(glob.glob(os.path.join(ROOT, 'scores/shard-*.scored.csv'))):
    scored += list(csv.DictReader(open(f, encoding='utf-8')))
rc = collections.Counter(r['reason'] for r in scored)


def is_stub(reason):
    if reason == REPEATS:
        return False
    return rc[reason] >= 3 or len(reason.split()) <= 2


stubs = [r for r in scored if is_stub(r['reason'])]
stubs.sort(key=lambda r: (r['course_code'], r['lego_id']))
print('scored rows', len(scored), 'stub rows', len(stubs))
print('stub rows by course:', sorted(collections.Counter(r['course_code'] for r in stubs).items(), key=lambda kv: -kv[1]))

outdir = os.path.join(HERE, 'batches')
os.makedirs(outdir, exist_ok=True)
size = -(-len(stubs) // N_BATCHES)
for i in range(N_BATCHES):
    chunk = stubs[i * size:(i + 1) * size]
    path = os.path.join(outdir, 'batch-%02d.csv' % (i + 1))
    with open(path, 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(['course_code', 'lego_id', 'known_text', 'target_text', 'intro_text', 'intro_x', 'context', 'old_score', 'old_reason'])
        for r in chunk:
            a = asin[(r['course_code'], r['lego_id'])]
            m = RX.match(a['intro_text'])
            x, ctx = (m.group(1), m.group(2) or '') if m else ('', '')
            w.writerow([r['course_code'], r['lego_id'], a['known_text'], a['target_text'], a['intro_text'], x, ctx, r['score'], r['reason']])
    print(path, len(chunk))
