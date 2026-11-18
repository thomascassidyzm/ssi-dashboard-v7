import json,os,re,unicodedata,collections,sys
S=os.environ['CS_SCRATCH']
INI=['zh','ch','sh','b','p','m','f','d','t','n','l','g','k','h','j','q','x','r','z','c','s','y','w','']
FIN=['iang','iong','uang','ang','eng','ing','ong','uan','ian','iao','uai','ai','ei','ao','ou','an','en','in','un','ia','ie','iu','ua','uo','ui','ue','ve','van','vn','er','a','o','e','i','u','v','n','ng','m']
SYL=set(i+f for i in INI for f in FIN)|{'er','ng','n','m','yo','lü','nü','lüe','nüe'}
def base(s):
  s=unicodedata.normalize('NFD',s); s=''.join(c for c in s if unicodedata.category(c)!='Mn' or c=='̈')
  return unicodedata.normalize('NFC',s).replace('ü','v')
def syllabify(word):
  """split a toned pinyin word into syllables (greedy longest, backtracking)"""
  b=base(word.lower())
  if len(b)!=len(word): return None
  memo={}
  def go(i):
    if i==len(b): return []
    if i in memo: return memo[i]
    for L in range(6,0,-1):
      if b[i:i+L] in SYL:
        r=go(i+L)
        if r is not None: memo[i]=[(i,i+L)]+r; return memo[i]
    memo[i]=None; return None
  r=go(0)
  return None if r is None else [word[a:z] for a,z in r]
HAN=re.compile(r'[㐀-鿿]')
def build(course):
  B=json.load(open(f'{S}/baskets-{course}.json'))
  char=collections.defaultdict(collections.Counter); words=collections.defaultdict(collections.Counter)
  n=bad=0
  for ph in B.values():
    for p in ph or []:
      t,r=p.get('target_text') or '',p.get('target_text_roman') or ''
      if not r.strip(): continue
      hz=HAN.findall(t); rw=re.findall(r"[a-zA-Züāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]+",r)
      segs=[];ok=True
      for w in rw:
        s=syllabify(w)
        if s is None: ok=False;break
        segs.append(s)
      if not ok or sum(len(s) for s in segs)!=len(hz): bad+=1; continue
      n+=1;k=0
      for s in segs:
        wz=''.join(hz[k:k+len(s)]); words[wz][' '.join(s)]+=1
        for j,y in enumerate(s): char[hz[k+j]][y.lower()]+=1
        k+=len(s)
  return char,words,n,bad
if __name__=='__main__':
  c,w,n,bad=build(sys.argv[1]); print(n,bad,len(c),len(w))
  json.dump({'char':{k:dict(v) for k,v in c.items()},'words':{k:dict(v) for k,v in w.items()}},open(f'{S}/lex-{sys.argv[1]}.json','w'),ensure_ascii=False)
