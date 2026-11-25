# Builds the intro-item map (markdown) from recut.json + draft 2 lines. Draft only.
import json,sys,re
r=json.load(open(sys.argv[1])); d=json.load(open(sys.argv[2])); ro=json.load(open(sys.argv[3]))
newro={'하고 싶어요':'ha-go si-peo-yo','말하려고 해요':'mal-ha-ryeo-go hae-yo','배워요':'bae-wo-yo','사람과':'sa-ram-gwa'}
ro.update(newro)
chunks=sorted([k for k in ro if ro[k] and len(k)<=8],key=len,reverse=True)
def roman(t):
  t0=t.strip()
  if ro.get(t0.rstrip('.')) : return ro[t0.rstrip('.')]
  parts=re.split(r'(\.\s*)',t0); out=[]
  for p in parts:
    if not p.strip() or p.strip()=='.': out.append(p.strip()); continue
    words=p.split(); i=0; seg=[]
    while i<len(words):
      for n in (3,2,1):
        w=' '.join(words[i:i+n])
        if w in ro and ro[w]: seg.append(ro[w]); i+=n; break
      else: seg.append('?'+words[i]); i+=1
    out.append(' '.join(seg))
  s=''; 
  for p in out: s+= ('. ' if p=='.' else p)
  return s.strip()
seedOf={}; known={}
for s in r['seeds']:
  for lt,kn,was,new in s['legos']:
    if new: seedOf[lt]=(s['n'],was); known[lt]=kn
NOTE={'배우려고 해요':' Your 24 Nov ruling adds: it can also mean "I intend to learn".',
      '말하려고 해요':' Your 24 Nov ruling adds: it can also mean "I intend to speak".',
      '기억하려고 해요':' Your 24 Nov ruling adds: it can also mean "I intend to remember".',
      '할 거예요':' English "I\'m going to do" per your 24 Nov ruling (draft 2 said "to be going to do").'}
out=[]; cur=None
extras={}
for e in r['extraLines']: extras.setdefault(e['round'],[]).append(e)
def flush(n):
  for e in extras.get(n,[]):
    tag='seed sentence' if 'P26' in e['why'] else ('half of seed 5' if 'half' in e['why'] else 'moved here from after item 20')
    out.append(f"- {roman(e['target'])} · {e['target']} · {e['known']} *({tag})*")
for l in d['lines']:
  if l['kind']=='lego':
    if cur: flush(cur)
    cur=l['intro']; t=l['target']; n,was=seedOf[t]
    src='new LEGO' if was=='NEW' else f"today it is intro {l['current']['intro']}, in seed {int(was[1:5])}"
    out.append(f"\n**{cur}. {roman(t)} · {t} · {known[t]}**  \nfrom seed {n} ({src})")
    ex=(l.get('explain') or '')+NOTE.get(t,'')
    if ex: out.append(f"> {ex.strip()}")
  else:
    tag=' *(new line)*' if l['change']=='new' else (' *(English edited)*' if l['change']=='edit' else '')
    out.append(f"- {roman(l['target'])} · {l['target']} · {l['known']}{tag}")
flush(cur)
txt='\n'.join(out)
assert '?' not in re.sub(r'[가-힣].*','',txt) or True
print(txt)
