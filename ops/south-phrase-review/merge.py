# Merge out/shard-XX.json (+ .legos.json) into ~/.tmpbig/south-phrase-review-2026-10-13.json and build review batches.
# Page text is trusted over worker-copied text. Re-runnable.
import json,os,collections,re
B=os.path.expanduser('~/.tmpbig/spr')
d=json.load(open(B+'/rows.json'));byn={p['n']:p for p in d['phrases']};L=d['legos']
flags=[];legos=[];missing=[]
for i in range(1,13):
  f=f'{B}/out/shard-{i:02d}.json'
  if not os.path.exists(f): missing.append(i); continue
  for x in json.load(open(f)):
    p=byn[int(x['n'])]; hc=int(p['id'][1:5])>=1001
    x={'n':p['n'],'id':p['id'],'welsh':p['cy'],'english':p['en'],'lego':L[p['l']]['cy'],'cat':int(x['cat']),
       'sev':'High' if str(x.get('sev','')).lower().startswith('h') else 'Check','reason':x.get('reason',''),'fix':(x.get('fix') or '').strip()}
    if x['cat']==4 and not hc: continue   # Aran ruling (a): OLD rows never cat 4
    flags.append(x)
  lf=f'{B}/out/shard-{i:02d}.legos.json'
  if os.path.exists(lf): legos+=json.load(open(lf))
# Consistency pass (#804): shards disagreed on three house-style points, so they are counted deterministically over ALL rows
# and reported once as bulk items instead of scattered row flags.
CAP=re.compile(r"lower.?case|capitali|needs a capital|should be capitalised",re.I)
def cap_only(x): return x['cat']==3 and CAP.search(x['reason']) and not re.search(r'tense|past|present|missing|drops|mean',x['reason'],re.I)
dropped=collections.Counter()
keep=[]
for x in flags:
  if cap_only(x): dropped['capitalisation']+=1; continue
  if 'unrhywbeth' in x['reason'] and x['cat']==1: dropped['unrhywbeth']+=1; continue
  if "'gytre' is not a word" in x['reason']: dropped['gytre']+=1; continue
  keep.append(x)
flags=keep
LOWI=re.compile(r"(^|[^A-Za-z'])i($|[^A-Za-z])|(^|\s)i'(m|ve|d|ll)\b")
PROPER=re.compile(r"\b(welsh|english|monday|tuesday|wednesday|thursday|friday|saturday|sunday|wales|italy|spain|france|cardiff|swansea)\b")
bulk={'english_lower_i':[p['n'] for p in d['phrases'] if LOWI.search(p['en'])],
      'english_lower_proper':[p['n'] for p in d['phrases'] if PROPER.search(p['en'])],
      'unrhywbeth':[p['n'] for p in d['phrases'] if 'unrhywbeth' in p['cy'].lower()],
      'gytre':[p['n'] for p in d['phrases'] if re.search(r'\bgytre\b',p['cy'].lower())],
      'dwlid':[p['n'] for p in d['phrases'] if re.search(r'\b[dt]wlid\b',p['cy'].lower())],
      'draw_fanco':[p['n'] for p in d['phrases'] if 'fanco' in p['cy'].lower()]}
flags.sort(key=lambda x:(x['n'],x['cat']))
NAMES={1:'Unnatural Welsh',2:'Mutation',3:'English ≠ Welsh',4:'LEGO not in phrase',5:'Northern form',6:'Odd sense',7:'Exact duplicate'}
json.dump({'course':'cym_sv2_for_eng','rows':len(byn),'missing_shards':missing,'category_names':NAMES,'lego_wide':legos,'bulk':bulk,'dropped_in_consistency_pass':dropped,'flags':flags},
  open(os.path.expanduser('~/.tmpbig/south-phrase-review-2026-10-13.json'),'w'),ensure_ascii=False,indent=1)
SHORT={1:'Welsh',2:'Mutation',3:'English',4:'LEGO',5:'Northern form',6:'Sense',7:'Duplicate'}
items=[];seen=collections.Counter()
for x in flags:
  base=f"{x['id']}#{x['n']}"; seen[base]+=1; iid=base if seen[base]==1 else f"{base}-{seen[base]}"
  tag='likely wrong' if x['sev']=='High' else 'check'
  fix=x['fix']
  items.append({'id':iid,'n':x['n'],'source':f"#{x['n']} [{tag} · {SHORT[x['cat']]}]\n{x['welsh']}\n{x['english']}\nWhy: {x['reason']}",
    'proposed':fix or x['welsh'],'options':['Keep as it is','Remove this phrase'] if fix else ['Remove this phrase']})
batches=[items[i:i+60] for i in range(0,len(items),60)]
out=[]
for k,b in enumerate(batches,1):
  out.append({'title':f"South phrases, review batch {k} of {len(batches)} (#{b[0]['n']}–#{b[-1]['n']}). Accept = use the wording shown",
              'items':[{kk:v for kk,v in it.items() if kk!='n'} for it in b]})
json.dump(out,open(B+'/review-batches.json','w'),ensure_ascii=False)
print({k:len(v) for k,v in bulk.items()},dict(dropped));print('flags',len(flags),'legos',len(legos),'missing',missing,'batches',len(out))
print(sorted(collections.Counter((x['cat'],x['sev']) for x in flags).items()))
