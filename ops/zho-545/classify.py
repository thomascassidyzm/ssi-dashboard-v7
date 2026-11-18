import json,re,collections
o=json.load(open('targets.out.json'))
DEI=re.compile(r'(?:^|[我你她他们是就都也还为，])得(?=[带弄去分保帮试选来安和找赶把工几留走])')
def toks(s): return (s or '').split()
def after(tokens,first):
  return [tokens[i+1] for i in range(len(tokens)-1) if tokens[i]==first]
def judge(x,ph):
  t=toks(ph); c=x['cls']; txt=x['text']
  if not ph or ph.startswith('ERR'): return 'nodata',None
  if c in('liao','C-le'):
    E=txt.count('了解')+len(re.findall('[不得]了',txt)) if c=='liao' else 0
    nx=after(t,'l'); liao=sum(1 for n in nx if n[0] in 'ɑaj' or n.startswith('iɑ')); 
    return ('ok' if liao>=E else 'SUSPECT') if c=='liao' else ('ok' if liao==0 or '了解' in txt or 'l' in txt else 'ctrl-miss'), f'liao-like {liao}/{E}'
  if c in('dei','C-de'):
    E=len(DEI.findall(txt)) if c=='dei' else 0
    nx=after(t,'t'); dei=sum(1 for n in nx if n.startswith('ei') or n.startswith('e') or n.startswith('ai'))
    return ('ok' if dei>=E else 'SUSPECT') if c=='dei' else ('ok' if dei==0 else 'ctrl-false'), f'dei-like {dei}/{E}'
  if c in('yue','C-le4'):
    s=' '.join(t); le=bool(re.search(r'\bl (əɜ|ə\d|o\d|ɤ)',s)); yue=bool(re.search(r'n (j |ɥ )?(iɛ|yɛ|y|ɥ|j)',s))
    if c=='yue': return ('ok' if yue and not re.search(r'i\d n l ',s) else 'SUSPECT'), f'yue={yue} le={le}'
    return ('ok' if le else 'ctrl-miss'), f'le={le}'
  if c in('jiao','C-jue'):
    nx=after(t,'tɕ'); jiao=sum(1 for n in nx if n.startswith('ɑ') or n.startswith('a')); jue=sum(1 for n in nx if n[0] in 'yuiə' )
    if c=='jiao': return ('ok' if jiao>=1 else 'SUSPECT'), f'tɕ+a {jiao}, tɕ+other {jue}'
    return ('ok' if jiao==0 else 'ctrl-false'), f'tɕ+a {jiao}'
  if c in('zhang','C-chang'):
    s=' '.join(t); return 'unjudged', ('ts.h' if 'ts.h' in s else 'ts.')
  return '?',None
res=[];summ=collections.Counter()
for x in o:
  for slot in ('a1','a2'):
    if not x.get(slot): continue
    v,ev=judge(x,x.get(slot+'_ph')); summ[(x['cls'],v)]+=1
    res.append(dict(id=x['id'],cls=x['cls'],slot='target1' if slot=='a1' else 'target2',audio=x[slot],text=x['text'],known=x['known'],phones=x.get(slot+'_ph'),verdict=v,evidence=ev))
json.dump(res,open('poly-res.json','w'),ensure_ascii=False,indent=0)
for k in sorted(summ): print(k,summ[k])
