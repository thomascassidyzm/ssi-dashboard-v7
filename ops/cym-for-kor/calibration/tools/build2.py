exec(open('build.py').read().split("known=set()")[0])
import collections
inv=[];out=[]
def taughtTok(seq,upto):
  # can seq (normalized string) be tiled by inventory texts?
  st=seq.split(); texts=[toks(x['text']) for x in inv]
  ok=[False]*(len(st)+1); ok[0]=True
  for i in range(len(st)):
    if not ok[i]: continue
    for lt in texts:
      if lt and match_at(st,i,lt): ok[i+len(lt)]=True
  return ok[len(st)]
for n in range(1,31):
  s=S[1000+n]; t=tile(n); seedrows=[]
  # merge consecutive GAP tokens into one new LEGO
  merged=[]
  for tag,l,txt in t:
    if tag=='GAP' and merged and merged[-1][0]=='GAP': merged[-1]=('GAP',None,merged[-1][2]+' '+txt)
    else: merged.append((tag,l,txt))
  for tag,l,txt in merged:
    text = txt if l is None else l['target_text']
    new = key(text) not in {key(x['text']) for x in inv}
    rec={'seed':n,'tag':tag,'src':l if l else {'target_text':text,'lego_id':None,'known_text':'?','basket_phrases':[],'seed_number':0,'lego_index':0},'text':text,'new':new}
    if new: inv.append(rec)
    seedrows.append(rec)
  out.append((n,s,seedrows))
# phrases
for n,s,rows in out:
  for r in rows:
    if not r['new']: continue
    lt=key(r['text']); cands=[]
    for p in P:
      pt=key(p['target_text'])
      if (' '+lt+' ') not in (' '+pt+' '): continue
      if int(p['seed_number'])>=1000+n and int(p['seed_number'])!=1000+n: pass
      # vocab at seed n: inventory as of seed n
      cands.append(p)
    r['cands']=cands
import pickle; pickle.dump(out,open('out.pkl','wb'))
