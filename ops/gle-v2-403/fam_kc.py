# K group C (Kai, 12 Nov): K9 in a short time = in achar gearr, K10 take time = am a chaitheamh, K11 reach = a shroicheadh,
# K12 group = buíon, K13 it was nice / beautiful = go deas / go hálainn, K14 on Sunday = ar an Domhnach, Sunday morning = maidin Domhnaigh.
from lib import *
RULES=[('K9 in achar gearr',[(r'\b([Ii])n am gearr\b',r'\1n achar gearr')]),
       ('K10 am a chaitheamh',[(r'a thógáil',r'a chaitheamh')]),
       ('K12 buíon',[(r'ghrúpa','bhuíon'),(r'ngrúpa','mbuíon'),(r'grúpa','buíon')]),
       ('K13 go deas / go hálainn',[(r'(?<!go )\bdeas\b','go deas'),(r'(?<!an-)(?<!go h)\bálainn\b','go hálainn')]),
       ('K14 Sunday',[(r'\b(maidin|tráthnóna|oíche) [Dd]é [Dd]omhnaigh',r'\1 Domhnaigh'),(r'\b[Dd]é [Dd]omhnaigh','ar an Domhnach')])]
SKIPSEED={332:'K10'}     # saol nua a thógáil = build a life, not take time
def conv(t,skip=()):
    fams=[]
    for fam,pairs in RULES:
        if fam.split()[0] in skip: continue
        t0=t
        for a,b in pairs: t=re.sub(a,b,t)
        if t!=t0: fams.append(fam)
    return t,' + '.join(fams)
for n in sorted(S,key=int):
    t,f=conv(S[n]['target'],skip=(SKIPSEED.get(int(n)),))
    if f: seed(int(n),None,t,f,f.split()[0])
# K11: two sentence-only seeds
seed(358,None,"dúirt do chara nach bhféadfadh sí an barr a shroicheadh",'K11 a shroicheadh',"K11: Eoghan's sentence")
seed(562,None,"Níl ann ach gur mian liom an áit a shroicheadh slán sábháilte",'K11 a shroicheadh',"K11: Eoghan's first option (his doubled 'ach' dropped, 'shroiceadh' spelt 'shroicheadh')")
COMP={'S0089L03':[{"known":"in","target":"in"},{"known":"a period","target":"achar"},{"known":"short","target":"gearr"}],
      'S0245L04':[{"known":"in a period","target":"in achar"},{"known":"short","target":"gearr"}],
      'S0218L03':[{"known":"on the","target":"ar an"},{"known":"Sunday","target":"Domhnach"}],
      'S0219L02':[{"known":"","target":"go"},{"known":"nice","target":"deas"}]}
for k,l in sorted(LA.items()):
    t,f=conv(l['target_text']); sd={}
    if f: sd['target_text']=t
    if k in COMP: sd['components']=COMP[k]
    elif l['components']:
        cs=[{'known':cc.get('known'),'target':re.sub(r'^[Dd]é Domhnaigh$','Domhnaigh',conv(cc.get('target') or '',skip=('K14','K13'))[0])} for cc in l['components']]
        if cs!=[{'known':cc.get('known'),'target':cc.get('target') or ''} for cc in l['components']]: sd['components']=cs
    if k=='S0219L02': sd['type']='M'
    if sd: lego(k,f or 'components','swap',**sd)
for k,r in sorted(R.items()):
    if r['phrase_role']=='component':
        if r['lego'] in LEGO:
            t=re.sub(r'^[Dd]é Domhnaigh$','Domhnaigh',conv(r['target_text'],skip=('K14',))[0])
            if t!=r['target_text']: PH[k]=('upd',r['known_text'],t,LEGO[r['lego']][1],'word tile')
        continue
    t,f=conv(r['target_text'])
    if f: PH[k]=('upd',r['known_text'],t,f,'swap')
STALE=[r'in am gearr',r'a thógáil',r'grúpa',r'[Dd]é [Dd]omhnaigh',r'(bhí|bheadh) sé (sin )?deas']
if __name__=='__main__':
    import collections
    print(collections.Counter(v[2] for v in SEED.values())); print(collections.Counter(v[3] for v in PH.values()))
    for n,v in sorted(SEED.items()): print('SEED',n,'|',v[1])
    for k,v in sorted(LEGO.items()): print(k,LA[k]['target_text'],'→',json.dumps(v[0],ensure_ascii=False)[:170])
# 'on Sunday' at seed 181 comes before 'ar an Domhnach' is taught (218): the row takes the taught 'Sunday afternoon' instead
_r=R['S0181L05U04']; PH['S0181L05U04']=('upd',re.sub(r'on Sunday\b(?! afternoon)','on Sunday afternoon',_r['known_text'],flags=re.I),re.sub(r'[Dd]é [Dd]omhnaigh','tráthnóna Domhnaigh',_r['target_text']),'K14 Sunday',"K14: ar an Domhnach is not taught until 218, so this row says Sunday afternoon")
