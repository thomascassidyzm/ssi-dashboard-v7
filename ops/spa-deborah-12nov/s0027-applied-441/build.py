import json,sys,os
S=os.environ['CS_SCRATCH']
draft=json.load(open(sys.argv[1]))
C='spa_for_eng'
# current rows (read via Popty basket routes)
cur={}
for f in os.listdir(S):
  if f.startswith('lb_'):
    for p in json.load(open(os.path.join(S,f)))['phrases']: cur[p['id'].split(':')[1]]=p
def lpos(t,l):
  a=t.lower().strip('¿?¡!. '); b=l.lower()
  if a==b: return 'middle'
  if a.startswith(b): return 'start'
  if a.endswith(b): return 'end'
  return 'middle'
def marker(pid,lid,t): return [{"known":"stale: recompute (cs #441)","legoId":lid,"target":t,"isGhost":False,"isSalient":True}]
LT={'S0027L02':'tardar demasiado','S0027L03':'contestar','S0027L04':'no me gusta'}
ops=[]
seedexp={27:("I don't like taking too much time to answer","no me gusta tomar demasiado tiempo para contestar"),65:("It's important to take time to test yourself","Es importante tomar tiempo para ponerte a prueba")}
newpos={'S0027L03B01':1,'S0027L03U09':13,'S0027L04B01':1,'S0027L04B02':2,'S0027L04B03':3,'S0027L04U01':4,'S0027L04U02':5,'S0027L04U03':6,'S0027L04U04':7,'S0027L04U05':8}
for r in draft['rows']:
  k=r['kind']; i=r['id']
  if k=='seed':
    n=int(i[1:]); ops.append({"op":"seed.update","seed_number":n,"set":{"known_text":r['known'],"target_text":r['target']},"expect":{"known_text":seedexp[n][0],"target_text":seedexp[n][1]}})
  elif k=='lego' and i=='S0026L04':
    ops.append({"op":"lego.update","lego_id":i,"set":{"components":r['components']},"expect":{"known_text":"ready to go","target_text":"listo para irme"}})
  elif k=='lego':
    exp={'S0027L02':("taking too much time","tomar demasiado tiempo"),'S0027L03':("in order to answer","para contestar")}[i]
    ops.append({"op":"lego.update","lego_id":i,"set":{"known_text":r['known'],"target_text":r['target'],"type":r['type'],"components":r['components']},"expect":{"known_text":exp[0],"target_text":exp[1]}})
  elif k=='lego_insert':
    row={"seed_number":27,"lego_index":int(i[-2:]),"known_text":r['known'],"target_text":r['target'],"type":r['type'],"is_new":r['is_new'],"components":r.get('components',[]),"status":"released"}
    pass
    ops.append({"op":"lego.insert","row":row})
  elif k=='phrase' and r.get('delete'):
    p=cur[i]; ops.append({"op":"phrase.delete","phrase_id":f"{C}:{i}","expect":{"target_text":p['target_text']}})
  elif k=='phrase':
    p=cur[i]; lid=i[:8]
    s={"known_text":r['known'],"target_text":r['target']}
    if p['target_text']!=r['target']:
      s['decomposition']=marker(i,lid,r['target']); s['word_count']=len(r['target'])
      if lid in LT: s['lego_position']=lpos(r['target'],LT[lid])
    ops.append({"op":"phrase.update","phrase_id":f"{C}:{i}","set":s,"expect":{"known_text":p['known_text'],"target_text":p['target_text']}})
  elif k in('phrase_insert','phrase_new'):
    if i.startswith('S0027L03 '): i='S0027L03U09'
    lid=i[:8]; role=r.get('role') or ('build' if i[8]=='B' else 'use')
    ops.append({"op":"phrase.insert","row":{"id":f"{C}:{i}","seed_number":27,"lego_index":int(lid[-2:]),"known_text":r['known'],"target_text":r['target'],"phrase_role":role,"position":newpos[i],"status":"released","metadata":{"format":"build_use"},"introduce":True,"word_count":len(r['target']),"lego_count":len(r['known'].split()),"connected_lego_ids":[],"lego_position":lpos(r['target'],LT[lid]),"decomposition":marker(i,lid,r['target'])}})
  else: raise SystemExit('unknown '+k)
# lego.insert must precede phrase inserts on L04 -> already in draft order (lego_insert rows come first)
json.dump({"ops":ops},open(sys.argv[2],'w'),ensure_ascii=False,indent=1)
print(len(ops),'ops'); from collections import Counter; print(Counter(o['op'] for o in ops))
