import json,urllib.request,sys
H={'Content-Type':'application/json','x-cs-conv':__import__('os').environ['CS_CONV_TOKEN']}
CONV='b0982527-4707-4c4d-a772-356ecca3060a'
urls=json.load(open('review-urls.json'))
v={}
for l in open('verdicts.jsonl'):
  r=json.loads(l); v[r['id']]=r
OPTS={'F316':['Keep original (sitä)'],'F238':['Accept for 336/340, keep 512 "ovea"'],'F431':['Keep seed 608 as is'],'F242':['Keep "sille käy hyvin"'],'F389':['Delete the row'],'F219':['Accept, but B02 gets a complement']}
EXTRA={'F192':'F008 VERDICT IS REFUSE, so THIS item\'s own version ("hetken") is the one to take.','F109':'F008 VERDICT IS REFUSE, so THIS item\'s own version ("hetken") is the one to take.'}
def get(id):
  rq=urllib.request.Request('http://localhost:4317/api/review-page/state?id='+id,headers=H)
  return json.load(urllib.request.urlopen(rq))
def post(body):
  rq=urllib.request.Request('http://localhost:4317/api/review-page',data=json.dumps(body,ensure_ascii=False).encode(),headers=H,method='POST')
  return json.load(urllib.request.urlopen(rq))
out=[];cnt={}
dry='--dry' in sys.argv
for n,u in enumerate(urls):
  pid=u['url'].rsplit('/',1)[1]; st=get(pid); items=[]
  for it in st['items']:
    r=v[it['id']]; it=dict(it); k=r['v']; cnt[k]=cnt.get(k,0)+1
    if k=='CHANGE':
      head='✎ VERIFIED: CHANGE. The #226 proposal was: "'+it.get('proposed','')+'". Corrected version above. '+r['note']
      it['proposed']=r['fix']
    elif k=='FLAG':
      head='⚑ VERIFIED: FLAG FOR KAI. '+r['note']
    else:
      head='✓ VERIFIED OK'+(' ('+r['note']+')' if r['note'] else ' (grammar and usage read in full)')
    if it['id'] in EXTRA: head+=' '+EXTRA[it['id']]
    it['note']=head+'\n\n'+(it.get('note') or '')
    if it['id'] in OPTS: it['options']=OPTS[it['id']]
    items.append(it)
  title=st['title']+' (VERIFIED v2)'
  nc=sum(1 for i in items if v[i['id']]['v']!='OK')
  if dry: print(title,len(items),'changed/flagged',nc); continue
  res=post({'title':title,'items':items,'conv_id':CONV})
  out.append({'title':title,'url':res['url'],'n':res['items'],'changed_or_flagged':nc,'replaces':u['url']}); print(res['url'],title,nc)
if not dry: json.dump(out,open('review-urls-v2.json','w'),indent=1,ensure_ascii=False)
print(cnt)
