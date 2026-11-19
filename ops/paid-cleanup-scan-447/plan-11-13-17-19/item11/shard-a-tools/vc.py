import json,os,sys,re,unicodedata,collections
S=os.environ['CS_SCRATCH']
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from view import norm,has,words_in
_c={}
def snap(course):
    if course not in _c: _c[course]=json.load(open(f'{S}/snap/{course}.json'))
    return _c[course]
def toks(t):
    return re.findall(r"[^\W\d_]+(?:['’][^\W\d_]+)*", unicodedata.normalize('NFC',t or '').lower().replace('’',"'"))
def vocab(course, seed):
    v={}
    for l in sorted(snap(course)['legos'],key=lambda l:(l['seed_number'],l['lego_index'])):
        if l['seed_number']>seed: break
        ts=[l['target_text']]+[ (c.get('target') if isinstance(c,dict) else c[1]) for c in (l.get('components') or [])]
        for t in ts:
            for w in toks(t): v.setdefault(w,l['lego_id'])
    return v
def untaught(course, seed, text, extra=()):
    v=vocab(course,seed); ex=set(w for e in extra for w in toks(e))
    return [w for w in toks(text) if w not in v and w not in ex]
def legos(course, known=None, target=None, upto=9999, exact=False):
    out=[]
    for l in sorted(snap(course)['legos'],key=lambda l:(l['seed_number'],l['lego_index'])):
        if l['seed_number']>upto: continue
        k,t=norm(l['known_text']),norm(l['target_text'])
        if known is not None and not ((k==norm(known)) if exact else has(k,known)): continue
        if target is not None and not ((t==norm(target)) if exact else has(t,target)): continue
        out.append(l)
    return out
def fl(l): return f"{l['lego_id']} {'NEW' if l['is_new'] else 'old'} {l['type']} | {l['known_text']} | {l['target_text']}"
def phr(course, target=None, known=None, upto=9999, lim=15):
    out=[]
    for p in snap(course)['phrases']:
        if p['seed_number']>upto: continue
        if target and not has(p['target_text'],target): continue
        if known and not has(p['known_text'],known): continue
        out.append(p)
    out.sort(key=lambda p:(p['seed_number'],p['lego_index']))
    return out[:lim]
if __name__=='__main__':
    cmd,course=sys.argv[1],sys.argv[2]
    if cmd=='l':   # l course k=.. t=.. 
        kw=dict(a.split('=',1) for a in sys.argv[3:])
        for l in legos(course,kw.get('k'),kw.get('t'),int(kw.get('upto',9999)),'x' in kw): print(fl(l))
    if cmd=='p':
        kw=dict(a.split('=',1) for a in sys.argv[3:])
        for p in phr(course,kw.get('t'),kw.get('k'),int(kw.get('upto',9999)),int(kw.get('lim',15))): print(f"S{p['seed_number']:04d}L{p['lego_index']:02d} {p['phrase_role'][0]} | {p['known_text']} | {p['target_text']}")
    if cmd=='w':   # w course seed word word: where each word first taught
        v=vocab(course,9999)
        for w in sys.argv[4:]: print(w, v.get(w.lower()))
