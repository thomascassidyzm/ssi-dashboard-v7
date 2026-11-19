import json,os,sys,re,unicodedata,collections
S=os.environ['CS_SCRATCH']
def norm(t):
    t = unicodedata.normalize('NFC', t or '').lower()
    t = re.sub(r"[’‘`]", "'", t)
    t = re.sub(r"[\.,!?¿¡;:\"“”«»()\[\]…—–\-]+", " ", t)
    return re.sub(r'\s+', ' ', t).strip()
def has(p,l):
    a,b=norm(l),norm(p); return bool(a) and (' '+a+' ') in (' '+b+' ')
def stem(w):
    w = w.replace("'s", '')
    for suf in ('ing', 'ed', 'es', 's'):
        if len(w) > 4 and w.endswith(suf):
            w = w[:-len(suf)]; break
    return w.rstrip('e')
def words_in(phrase, lego):
    st=[stem(w) for w in norm(phrase).split()]; pool=collections.Counter(st)
    for w in [stem(x) for x in norm(lego).split()]:
        if pool[w]<=0: return False
        pool[w]-=1
    return True
def load(course): 
    d=json.load(open(f'{S}/dumps/{course}.json')); return d
def scanrows(course):
    here=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..')
    return [r for r in json.load(open(here+'/data/scan-P17.json')) if r['course']==course]
def show(course, seeds, only=None, full=False):
    d=load(course); live=set(d['live_seeds'])
    for s in d['seeds']:
        if s['n'] not in seeds: continue
        print(f"\n=== S{s['n']:04d} {'LIVE' if s['n'] in live else 'SNAP'} | {s['known']} | {s['target']}")
        ids={l['id'] for l in s['legos']}
        sys.path.insert(0,os.path.dirname(os.path.abspath(__file__))); import vc
        for sl in sorted([x for x in vc.snap(course)['legos'] if x['seed_number']==s['n'] and x['lego_id'] not in ids],key=lambda x:x['lego_index']):
            print('  (snap-only)',vc.fl(sl))
        for l in s['legos']:
            ph=[p for p in l['phrases'] if p['type'] not in ('lego_debut','component')]
            miss=[p for p in ph if not (has(p['target'],l['target']) and words_in(p['known'],l['known']))]
            print(f"  {l['id']} {'NEW' if l['is_new'] else 'old'} {l['type']} | {l['known']} | {l['target']}   rows {len(ph)} miss {len(miss)}")
            if only and l['id'] not in only and not full: continue
            if not l['is_new'] and not (only and l['id'] in only): continue
            if not miss and not full and not (only and l['id'] in only): continue
            for p in ph:
                m='' if p not in miss else ('T' if not has(p['target'],l['target']) else 'k')
                print(f"      {p['id'].split(':')[1][8:]} {p['type'][0]} {m:1} | {p['known']} | {p['target']}")
if __name__=='__main__':
    course=sys.argv[1]; args=sys.argv[2:]
    only={a for a in args if a.startswith('S')}
    seeds={int(a[1:5]) for a in only}|{int(a) for a in args if a.isdigit()}
    show(course,seeds,only or None,'--full' in args)
