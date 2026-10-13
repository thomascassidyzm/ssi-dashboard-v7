# Builds ~/.tmpbig/spr/shards/shard-XX.tsv from rows.json (live proof-page fetch) + lego_en.raw + contain.json + dups
import json,os,collections
B=os.path.expanduser('~/.tmpbig/spr')
d=json.load(open(B+'/rows.json'));P=d['phrases'];L=d['legos']
en={}
for line in open(B+'/lego_en.raw'):
  s,i,t=line.rstrip('\n').split('\t'); en[f"S{int(s):04d}L{int(i):02d}"]=t
cont=json.load(open(B+'/contain.json'))
seen={};dups={}
for p in P:
  k=p['cy'].strip().lower().replace('’',"'")
  if k in seen: dups[p['n']]=seen[k]
  else: seen[k]=p['n']
json.dump(dups,open(B+'/dups.json','w'))
NS=12;per=-(-len(P)//NS)
clean=lambda s:(s or '').replace('\t',' ').replace('\n',' ')
for i in range(NS):
  with open(f'{B}/shards/shard-{i+1:02d}.tsv','w') as f:
    f.write('n\tid\tlego_cy\tlego_en\twelsh\tenglish\tauto\n')
    for p in P[i*per:(i+1)*per]:
      lg=L[p['l']]; a=[]
      hc=int(p['id'][1:5])>=1001
      c=cont.get(str(p['n']))
      if c and hc: a.append('LEGO-'+c.upper())
      if p['n'] in dups: a.append(f"DUP-OF-#{dups[p['n']]}")
      a.append('HC' if hc else 'OLD')
      f.write('\t'.join(map(clean,[str(p['n']),p['id'],lg['cy'],en.get(lg['id'],''),p['cy'],p['en'],' '.join(a)]))+'\n')
print(len(dups),collections.Counter(cont.values()))
