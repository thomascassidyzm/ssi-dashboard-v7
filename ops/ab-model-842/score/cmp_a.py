import json,sys
ref=json.load(open(sys.argv[1])); arm=json.load(open(sys.argv[2]))
def m(d,k,key='id'): return {str(x.get(key)):x.get('target') for x in d.get(k,[])}
out={}
for k,key in (('phrases','id'),('legos','id'),('seeds','n')):
  R,A=m(ref,k,key),m(arm,k,key)
  same=[i for i in R if i in A and A[i].strip().lower()==R[i].strip().lower()]
  diff=[(i,R[i],A[i]) for i in R if i in A and A[i].strip().lower()!=R[i].strip().lower()]
  miss=[(i,R[i]) for i in R if i not in A]; extra=[(i,A[i]) for i in A if i not in R]
  out[k]=dict(ref=len(R),arm=len(A),same=len(same),diff=diff,missing=miss,extra=extra)
out['deletes']=dict(ref=ref.get('deletes'),arm=arm.get('deletes'))
print(json.dumps(out,ensure_ascii=False,indent=1))
