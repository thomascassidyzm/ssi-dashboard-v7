# census helper: python3 cen.py <known regex> [target regex] [-v target-exclude]  -> counts by seed + samples
import sys,re,json,collections
sys.path.insert(0,'../gle-v2-eoghan-43-2026-11-16')
from lib import *
S=load('live.json')
def rows():
    for n,s in sorted(S.items()):
        yield ('SEED',n,str(n),s['known_text'],s['target_text'])
        for l in s['legos']:
            yield ('LEGO'+('N' if l['is_new'] else '-'),n,l['lego_id'],l['known_text'],l['target_text'])
            for p in l.get('basket_phrases') or []:
                if p['phrase_role']!='component': yield ('ph',n,p['id'].split(':')[1],p['known_text'],p['target_text'])
if __name__=='__main__':
    kx=re.compile(sys.argv[1],re.I); tx=re.compile(sys.argv[2],re.I) if len(sys.argv)>2 and sys.argv[2]!='-' else None
    nx=re.compile(sys.argv[3],re.I) if len(sys.argv)>3 else None
    for typ,n,i,k,t in rows():
        if kx.search(k or '') and (not tx or tx.search(t or '')) and not (nx and nx.search(t or '')):
            print(f"{typ:5} {i:12} {k} | {t}")
