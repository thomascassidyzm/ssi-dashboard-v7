"""Apply readers' romanisation through Popty's edit-batch (job #272). Dry run unless --apply.
python3 apply.py <dumpdir> <course> [NN ...] [--apply]
Only target_text_roman is written; every op carries expect {target_text, target_text_roman} from the
dump, so a row someone edited since is skipped (DRIFT), never overwritten. Audio is not touched."""
import json, sys, os, urllib.request
H = os.path.dirname(os.path.abspath(__file__))
args = [a for a in sys.argv[1:] if not a.startswith('--')]; APPLY = '--apply' in sys.argv
dumpdir, course, nums = args[0], args[1], args[2:]
D = json.load(open(f'{dumpdir}/{course}.json')); S = json.load(open(f'{dumpdir}/{course}.seeds.json'))['seeds']
cur = {('seed', str(s['seed_number'])): s for s in S}
cur.update({('lego', l['lego_id']): l for l in D['legos']}); cur.update({('phrase', p['id']): p for p in D['phrases']})
cdir = f'{H}/chunks/{course}'; odir = f'{H}/out/{course}'
nums = nums or sorted(f[:-4] for f in os.listdir(odir) if f.endswith('.tsv'))
ops = []
for n in nums:
    rows = [l.rstrip('\n').split('\t') for l in open(f'{cdir}/{n}.tsv')][1:]
    ans = dict(l.rstrip('\n').split('\t') for l in list(open(f'{odir}/{n}.tsv'))[1:] if l.strip())
    for r in rows:
        kind, key, t = r[0], r[1], r[4]; ro = ans[key].strip()
        row = cur[(kind, key)]
        if (row.get('target_text_roman') or '') == ro: continue  # already written (a re-run only writes what changed)
        exp = {'target_text': row['target_text'], 'target_text_roman': row.get('target_text_roman')}
        op = ({'op': 'seed.update', 'seed_number': int(key)} if kind == 'seed' else
              {'op': 'lego.update', 'lego_id': key} if kind == 'lego' else {'op': 'phrase.update', 'phrase_id': key})
        op.update(set={'target_text_roman': ro}, expect=exp); ops.append(op)
def post(batch):
    req = urllib.request.Request(f'http://localhost:3470/api/production/{course}/edit-batch', method='POST',
        data=json.dumps({'ops': batch, 'apply': APPLY}).encode(),
        headers={'Content-Type': 'application/json', 'x-agent-id': 'roman-fill-272'})
    try:
        with urllib.request.urlopen(req, timeout=300) as r: return json.load(r)
    except urllib.error.HTTPError as e: return json.load(e)
done, skipped, events = 0, [], []
for i in range(0, len(ops), 500):
    batch = ops[i:i + 500]
    while batch:
        r = post(batch)
        if r.get('ok'):
            done += len(batch); events.append(r.get('event_id')); break
        if r.get('code') == 'DRIFT' and r.get('index') is not None:
            skipped.append((batch[r['index']], r['error'])); batch = batch[:r['index']] + batch[r['index'] + 1:]; continue
        print('REFUSED', json.dumps(r)[:600]); sys.exit(1)
print(f"{course}: {'APPLIED' if APPLY else 'dry-run ok'} {done} ops; drift-skipped {len(skipped)}; events {[e for e in events if e]}")
for op, err in skipped: print('  SKIP', op.get('phrase_id') or op.get('lego_id') or op.get('seed_number'), err[:200])
