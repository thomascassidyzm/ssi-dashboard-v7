import sys,os,json; S=os.environ['CS_SCRATCH']; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import vc
from view import norm,has,words_in,load
def rc(course, lid, nk, nt, show_rows=True):
    d=load(course); n=int(lid[1:5])
    s=[x for x in d['seeds'] if x['n']==n][0]
    l=[x for x in s['legos'] if x['id']==lid][0]
    print(f"\n##### {lid}  {l['known']} | {l['target']}  ==>  {nk} | {nt}    seed: {s['known']} | {s['target']}")
    print('   target contiguous in seed:',has(s['target'],nt),' known in seed:',has(s['known'],nk))
    for x in vc.legos(course,known=nk,exact=True):
        if x['lego_id']!=lid: print('   same-known:',vc.fl(x), '' if norm(x['target_text'])==norm(nt) else '  <<< ZUT?')
    for x in vc.legos(course,target=nt,exact=True):
        if x['lego_id']!=lid and norm(x['known_text'])!=norm(nk): print('   same-target:',vc.fl(x))
    # remainder words: seed words not in new lego; where first taught, excluding this lego
    v={}
    for x in sorted(vc.snap(course)['legos'],key=lambda x:(x['seed_number'],x['lego_index'])):
        if x['lego_id']==lid: continue
        if x['seed_number']>n: break
        for t in [x['target_text']]+[(c.get('target') if isinstance(c,dict) else c[1]) for c in (x.get('components') or [])]:
            for w in vc.toks(t): v.setdefault(w,x['lego_id'])
    rem=[w for w in vc.toks(s['target']) if w not in vc.toks(nt)]
    print('   remainder:',', '.join(f"{w}@{v.get(w,'UNTAUGHT')}" for w in rem))
    ph=[p for p in l['phrases'] if p['type'] not in('lego_debut','component')]
    bad=[p for p in ph if not(has(p['target'],nt) and words_in(p['known'],nk))]
    print(f'   rows {len(ph)} still-miss {len(bad)}')
    if show_rows:
        for p in bad: print('      ',p['id'][-3:],('T' if not has(p['target'],nt) else 'k'),'|',p['known'],'|',p['target'])
if __name__=='__main__':
    course=sys.argv[1]
    for a in sys.argv[2:]:
        lid,nk,nt=a.split('|'); rc(course,lid.strip(),nk.strip(),nt.strip())
