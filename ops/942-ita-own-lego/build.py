import sys,csv
from lib import *
from plan import P,E_,J,F6
OUT=sys.argv[1]
cs={E_:C(E_),J:C(J)}
def key(t): return ' '.join(norm(t))
rowsout=[]; stats=collections.Counter(); chars=collections.Counter(); fam=collections.Counter(); baskets={}
for c in (J,E_):
    co=cs[c]
    tix=collections.defaultdict(list); kix=collections.defaultdict(list)
    for sd,l,p in co.all():
        if p['t1'] and p['t2']: tix[p['target'].strip().lower()].append(p['id'])
        if p['ka']: kix[p['known'].strip().lower()].append(p['id'])
    for r in sorted(stale(c),key=lambda r:r['id']):
        pid=r['id'].split(':')[1]; sd,l,p=co.ph[r['id']]
        if p['type']=='component':
            inlego=contains(l['target'],p['target'])
            act='LEAVE'; nk=nt=''; f=F6; n=0; lib=''
            why='Component rows are never played or introduced (canon O13) and are parts of the LEGO by design, so P17 does not apply; '+('its text is a whole-word part of the LEGO.' if inlego else 'its text is the plain form of a fused word in the LEGO ("%s" in "%s"), which is what a component is for.'%(p['target'],l['target']))
            if not inlego: stats[(c,'component out of step')]+=1
        else:
            act,nk,nt,f,why=P[(c,pid)]
            n=0; lib=''
            if act=='RE-WORD':
                tfree=[x for x in tix.get(nt.strip().lower(),[]) if x!=p['id']]
                kfree=[x for x in kix.get(nk.strip().lower(),[]) if x!=p['id']]
                kchg = nk.strip()!=p['known'].strip()
                tn=2*len(nt); kn=len(nk) if kchg else 0
                n=tn+kn
                chars[(c,'full')]+=n
                n2=(0 if tfree else tn)+(0 if kfree else kn)
                chars[(c,'after-library')]+=n2
                if tfree or kfree: lib=' May be in library: '+('; '.join((['target clips seen on '+tfree[0].split(':')[-1]] if tfree else [])+(['known clip seen on '+kfree[0].split(':')[-1]] if kfree else [])))+'.'
        stats[(c,act)]+=1; fam[(f,act)]+=1
        rowsout.append([c,pid,p['type'],l['id'],sd['n'],l['known']+' | '+l['target'],p['known']+' | '+p['target'],act,nk,nt,n,f,why+lib])
    # basket after
    for lid in sorted({r['parent'] for r in stale(c)}):
        sd,l=co.legos[lid]; b=u=0
        for p in l['phrases']:
            if p['type'] not in('build','use'): continue
            pid=p['id'].split(':')[-1]; a=P.get((c,pid))
            if a and a[0]=='DELETE': continue
            t=a[2] if a else p['target']
            if not contains(t,l['target']) or norm(t)==norm(l['target']): continue
            if p['type']=='build': b+=1
            else: u+=1
        if any((c,r['id'].split(':')[1]) in P for r in stale(c) if r['parent']==lid): baskets[(c,lid)]=(b,u,l['known'],l['target'])
    # extras
    ex=[p['id'] for sd,l,p in co.all() if p['type'] in('build','use') and l['is_new'] and not contains(p['target'],l['target']) and p['id'] not in {r['id'] for r in stale(c)}]
    stats[(c,'EXTRA not in the 132')]=len(ex); open(f'{S}/w/extra-{c}.txt','w').write('\n'.join(ex))
with open(OUT+'/plan.tsv','w',newline='') as f:
    w=csv.writer(f,delimiter='\t',lineterminator='\n')
    w.writerow(['course','phrase_id','row_type','lego_id','seed','lego_now (known | target)','phrase_now (known | target)','action','new_known','new_target','chars','family','reason'])
    w.writerows(rowsout)
for k in sorted(stats,key=str): print(k,stats[k])
for k in sorted(chars): print(k,chars[k])
for k in sorted(fam): print(k,fam[k])
print('baskets after (real build, real use; bare LEGO rows not counted):')
for k,v in sorted(baskets.items()): print(' ',k,v)
for r in rowsout:
    if 'May be in library' in r[-1]: print('LIB',r[1],r[9],'|',r[-1].split('May be')[1])
    if 'NOTE' in r[-1]: print('COMP',r[1],r[6],'||',r[5])
