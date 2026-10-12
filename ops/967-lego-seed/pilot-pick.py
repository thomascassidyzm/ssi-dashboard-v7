import json,random,collections,sys,os
d=json.load(open(os.environ['CS_SCRATCH']+'/lego-vs-seed.json'))
random.seed(967)
rows=[(k.split('|')[1],k.split('|')[0],v) for k,v in d.items()]
tot=[r for r in rows if r[2]['bucket']=='B7-no-relation']
par=[r for r in rows if r[2]['bucket']=='B6-partial']
# spread: total -> every 3rd (13); partial -> random across distinct courses (27)
pick=tot[::3]
bycourse=collections.defaultdict(list)
for r in par: bycourse[r[1]].append(r)
cs=sorted(bycourse); random.shuffle(cs)
for c in cs:
    if len(pick)>=40: break
    pick.append(random.choice(bycourse[c]))
json.dump([{'id':r[0],'course':r[1],**r[2]} for r in pick],open('ops/967-lego-seed/pilot-ids.json','w'),ensure_ascii=False,indent=1)
print(len(pick))
