"""#357: list each course's chunk rows as unique target lines (seed order) for one reader; answers in work-357/<course>/a*.tsv"""
import os,sys,collections
H=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
c=sys.argv[1]; cdir=f'{H}/chunks/{c}'
seen={}; order=[]
for f in sorted(os.listdir(cdir)):
  if f=='examples.tsv': continue
  for l in list(open(f'{cdir}/{f}'))[1:]:
    r=l.rstrip('\n').split('\t'); t=r[4]
    if t not in seen: seen[t]=[]; order.append((int(r[2]),t))
    if r[3] not in seen[t]: seen[t].append(r[3])
os.makedirs(f'{H}/work-357/{c}',exist_ok=True)
with open(f'{H}/work-357/{c}/todo.tsv','w') as o:
  for i,(s,t) in enumerate(order):
    o.write(f'{i+1}\t{s}\t{" / ".join(seen[t][:3])}\t{t}\n')
print(c,len(order))
