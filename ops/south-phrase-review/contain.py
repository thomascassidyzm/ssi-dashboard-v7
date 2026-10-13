import json,re,collections,sys
d=json.load(open(sys.argv[1]));P=d['phrases'];L=d['legos']
def toks(s):
  s=s.lower().replace('’',"'").replace('‘',"'")
  s=re.sub(r"'r\b"," yr",s); s=re.sub(r"'n\b"," yn",s); s=re.sub(r"'i\b"," ei",s); s=re.sub(r"'w\b"," ei",s)
  t=re.findall(r"[a-zâêîôûŵŷáéíóúàèìòùäëïöüÿ']+",s)
  return ['yr' if w in ('y','yr') else w.strip("'") for w in t if w.strip("'")]
soft={'p':'b','t':'d','c':'g','b':'f','d':'dd','g':'','m':'f','ll':'l','rh':'r'}
nasal={'p':'mh','t':'nh','c':'ngh','b':'m','d':'n','g':'ng'}
asp={'p':'ph','t':'th','c':'ch'}
def variants(w):
  v={w}
  for tab in (soft,nasal,asp):
    for k,r in tab.items():
      if w.startswith(k): v.add(r+w[len(k):])
  if w and w[0] in 'aeiouwyâêîôûŵŷ': v.add('h'+w)
  # reverse: lego word itself mutated
  return v
def m(a,b): return b in variants(a) or a in variants(b)
out={}
for p in P:
  lt=toks(L[p['l']]['cy']); pt=toks(p['cy'])
  if not lt: continue
  contig=any(all(m(lt[j],pt[i+j]) for j in range(len(lt))) for i in range(len(pt)-len(lt)+1))
  if contig: continue
  # in-order with gaps
  i=0;
  for w in pt:
    if i<len(lt) and m(lt[i],w): i+=1
  out[p['n']]='split' if i==len(lt) else 'absent'
json.dump(out,open(sys.argv[2],'w'))
print(collections.Counter(out.values()))
