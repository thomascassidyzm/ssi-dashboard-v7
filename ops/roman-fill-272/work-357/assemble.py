"""#357: map the reader's per-unique-target answers (work-357/<course>/a*.tsv) back onto every chunk key -> out/<course>/NN.tsv"""
import os,sys
H=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
c=sys.argv[1]; w=f'{H}/work-357/{c}'
todo={}; 
for l in open(f'{w}/todo.tsv'):
  n,s,en,t=l.rstrip('\n').split('\t'); todo[t]=int(n)
ans={}
for f in sorted(os.listdir(w)):
  if f.startswith('a') and f.endswith('.tsv'):
    for l in open(f'{w}/{f}'):
      if not l.strip(): continue
      n,r=l.rstrip('\n').split('\t'); n=int(n)
      if n in ans: print('DUP',n,f); 
      ans[n]=r
miss=[n for n in todo.values() if n not in ans]
print(c,'unique',len(todo),'answered',len(ans),'missing',len(miss),miss[:20])
if miss: sys.exit(1)
cdir=f'{H}/chunks/{c}'; odir=f'{H}/out/{c}'; os.makedirs(odir,exist_ok=True)
for f in sorted(os.listdir(cdir)):
  if f=='examples.tsv': continue
  rows=[l.rstrip('\n').split('\t') for l in list(open(f'{cdir}/{f}'))[1:]]
  with open(f'{odir}/{f}','w') as o:
    o.write('key\troman\n')
    for r in rows: o.write(f'{r[1]}\t{ans[todo[r[4]]]}\n')
  print(' wrote',f,len(rows))
