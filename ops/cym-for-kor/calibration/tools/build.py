exec(open('idx.py').read())
import json
ko=json.load(open('ko780.json'))['seeds']
SOFT={'d':['t'],'dd':['d'],'f':['b','m'],'g':['c'],'b':['p'],'l':['ll'],'r':['rh'],'ch':['c'],'ph':['p'],'th':['t'],'mh':['p'],'nh':['t'],'ng':['g'],'ngh':['c'],'m':['b'],'n':['d']}
def rads(w):
  out={w}
  for k,vs in SOFT.items():
    if w.startswith(k):
      for v in vs: out.add(v+w[len(k):])
  for v in 'aeiouwyâŵŷ':
    if w.startswith(v): out.add('g'+w)
  return out
def key(t): return norm(t)
def toks(t): return key(t).split()
# nv2 LEGO inventory by text, earliest first; HC seed-specific first
allL=sorted(L.values(),key=lambda l:(l['seed_number'],l['lego_index']))
def eqtok(a,b): return a==b or b in rads(a) or a in rads(b)
def match_at(st,i,lt):
  if i+len(lt)>len(st): return False
  return all(eqtok(st[i+j],lt[j]) for j in range(len(lt)))
inv=[]   # cym_for_kor taught LEGOs: dict(text,toks,seed,src)
rows=[]
def tile(n):
  s=S[1000+n]; st=toks(s['target_text'])
  own=sorted(s['legos'],key=lambda l:l['lego_index'])
  # candidates: own seed LEGOs first, then earlier cym_for_kor inventory, then nv2 rest
  cands=[('own',l) for l in own]+[('kor',x['src']) for x in inv]+[('nv2',l) for l in allL if l['seed_number']<1000 or l['seed_number']<1000+n]
  i=0;out=[]
  while i<len(st):
    best=None
    for pri,(tag,l) in enumerate(cands):
      lt=toks(l['target_text'])
      if lt and match_at(st,i,lt):
        sc=(len(lt), {'own':3,'kor':2,'nv2':1}[tag])
        if best is None or sc>best[0]: best=(sc,tag,l)
    if best: out.append((best[1],best[2],' '.join(st[i:i+best[0][0]]))); i+=best[0][0]
    else: out.append(('GAP',None,st[i])); i+=1
  return out
known=set()
def taught(t): return any(eqtok(t,k) for k in known) 
for n in range(1,31):
  s=S[1000+n]
  t=tile(n)
  print(f'HC{n:02d} {s["target_text"]}  [{s["status"]}]')
  for tag,l,txt in t:
    if l is None: print('    GAP',txt); continue
    new = key(l['target_text']) not in {key(x['text']) for x in inv}
    print('   ',tag,l['lego_id'],repr(l['target_text']),'=',l['known_text'],'NEW' if new else 'taught','bp',len(l['basket_phrases']))
    if new: inv.append({'text':l['target_text'],'seed':n,'src':l})
