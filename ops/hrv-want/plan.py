"""hrv_for_eng 'want' switch (cs #119·AI, Kai's ruling 16 Nov 2026): hoću-family -> želim-family
where the English cue means WANT; the future auxiliary (will / going to / won't) stays on htjeti.
Reads Popty read-route dumps (seeds, legos, phrases) from argv dir; writes ops + a decision table."""
import json,re,sys,os
D=sys.argv[1]
AFF={'hoću':'želim','hoćeš':'želiš','hoće':'želi','hoćemo':'želimo','hoćete':'želite','oću':'želim','oćeš':'želiš','oće':'želi'}
NEG={'neću':'ne želim','nećeš':'ne želiš','neće':'ne želi','nećemo':'ne želimo','nećete':'ne želite'}
TOK=re.compile(r"(?<![\wčćđšž])([Hh]?oć(?:u|eš|e|emo|ete)|[Nn]eć(?:u|eš|e|emo|ete)|[Nn]e [Hh]oć(?:u|eš|e|emo|ete))(?![\wčćđšž])(\s+li\b)?")
NEGWANT=re.compile(r"(n't|not|never)\s+(you\s+|he\s+|she\s+|they\s+|we\s+|I\s+|even\s+)?want|\bnobody wants|\bno one wants",re.I)
WANT=re.compile(r"\bwant",re.I)
FUT=re.compile(r"\b(will|won't|wouldn't|going to)\b|'ll\b",re.I)
THEY=re.compile(r"\bthey\s+(don't\s+|do not\s+|still\s+)?want|\bdo they\s+want|\bthey\s+wanted",re.I)
# hand decisions (reviewed one by one; reasons go in the record)
KEEP={'hrv_for_eng:S0289L01B02':"'I wonder if' — hoće li here is 'whether ... will', no want in the cue"}
OVERRIDE={'hrv_for_eng:S0274L02U03':('rekao mi je da hoće doći za dva dana','rekao mi je da će doći za dva dana',"cue 'he's coming' is future; long hoće + infinitive reads 'wants to come', so the clitic će"),
  'hrv_for_eng:S0069L03U03':('zašto nije htio čuvati mladog psa','zašto ne želi čuvati mladog psa',"cue is present 'why doesn't he want'; the row had past nije htio, present negative want = ne želi"),
  '470':('Koliko visoko hoćeš se popeti prije nego stanemo?','Koliko visoko se želiš popeti prije nego stanemo?',"want switch, with the clitic se moved to second position (after the first constituent 'Koliko visoko')")}
def cap(src,dst): return dst[0].upper()+dst[1:] if src[0].isupper() else dst
def convert(k,t,rid):
  if rid in KEEP: return t,[('keep',KEEP[rid])]
  if rid in OVERRIDE:
    a,b,why=OVERRIDE[rid]; assert t==a,(rid,t); return b,[('override',why)]
  notes=[];out=[];pos=0
  for m in TOK.finditer(t):
    w=m.group(1); lw=w.lower().replace('ne h','neh').replace('ne o','neo'); li=m.group(2)
    neg=lw.startswith('ne')
    if neg:
      base='ne'+lw[3:] if lw.startswith('neh') else lw
      base={'nehoću':'neću','nehoćeš':'nećeš','nehoće':'neće','nehoćemo':'nećemo','nehoćete':'nećete'}.get(base,base)
      do=bool(NEGWANT.search(k)); new=NEG.get(base)
      if do and new in('ne želi',) and THEY.search(k): new='ne žele'
    else:
      do=bool(WANT.search(k)) and not (li and FUT.search(k) and not re.search(r"if (he|she|they|you|i) wants?\b|do you want|want",k,re.I))
      new=AFF.get(lw)
      if do and new=='želi' and THEY.search(k): new='žele'
    out.append(t[pos:m.start()]); 
    if do and new:
      out.append(cap(w,new)+(li or '')); notes.append(('switch',f'{w}{li or ""} -> {cap(w,new)}{li or ""}'))
    else:
      out.append(m.group(0)); notes.append(('keep-future' if (FUT.search(k) or not WANT.search(k)) else 'keep-??',w+(li or '')))
    pos=m.end()
  out.append(t[pos:]); return ''.join(out),notes
rows=[]
for s in json.load(open(f'{D}/seeds.json'))['seeds']:
  rows.append(('seed',s['seed_number'],s['known_text'],s['target_text'],None))
_seen=set()
for l in map(json.loads,open(f'{D}/leg.jsonl')):
  if l['lego_id'] in _seen: continue
  _seen.add(l['lego_id'])
  rows.append(('lego',l['lego_id'],l['known_text'],l['target_text'],l['components']))
for p in map(json.loads,open(f'{D}/phr.jsonl')):
  rows.append(('phrase',p['id'],p['known_text'],p['target_text'],None))
ops=[];table=[]
for kind,key,k,t,comps in rows:
  if str(key) not in OVERRIDE and not TOK.search(t or '') and not (comps and any(TOK.search(c.get('target') or '') for c in comps)): continue
  nt,notes=convert(k,t,str(key))
  newc=None
  if comps:
    newc=[]
    for c in comps:
      ct=c.get('target') or ''; ck=c.get('known') or ''
      if TOK.search(ct) and WANT.search(ck) and nt!=t:
        n2,_=convert(ck,ct,'c'); newc.append({**c,'target':n2})
      else: newc.append(dict(c))
    if str(key)=='S0025L04': newc=[{**c,'known':'will you'} if c.get('target')=='hoćeš' else c for c in newc]
    if newc==comps: newc=None
  fam=('negative' if any('ne želi' in n[1] or 'ne žel' in n[1] for n in notes if n[0]=='switch') else 'affirmative')
  table.append({'kind':kind,'key':key,'known':k,'before':t,'after':nt,'notes':notes,'family':fam,'components_after':newc})
  if nt!=t or newc:
    st={}; 
    if nt!=t: st['target_text']=nt
    if newc: st['components']=newc
    op={'op':f'{kind}.update','expect':{'target_text':t},'set':st}
    op[{'seed':'seed_number','lego':'lego_id','phrase':'phrase_id'}[kind]]=key
    ops.append({'family':f'{kind}-{fam}','op':op})
json.dump(table,open(f'{D}/table.json','w'),ensure_ascii=False,indent=1)
json.dump(ops,open(f'{D}/ops.json','w'),ensure_ascii=False)
from collections import Counter
print(Counter(o['family'] for o in ops)); print('rows touched',len(table))
for r in table:
  if any(n[0] in('keep-??','keep','override') for n in r['notes']) or (r['kind']!='phrase'): pass
print('--- keeps / ?? ---')
for r in table:
  for n in r['notes']:
    if n[0]!='switch': print(r['key'],'|',r['known'],'|',r['before'],'|',n)
