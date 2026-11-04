import json,os
S=os.environ['CS_SCRATCH']
items=json.load(open('ops/zho-545/outofscope-219/items-191.json'))
a=json.load(open('ops/zho-545/outofscope-219/apply-set.json'))
ed={e['id']:e for e in a['edits']}; de={d['id']:d for d in a['deletes']}
RULED={'seed:21':'D2','zho_for_eng:S0030L01U05':'D3','zho_for_eng:S0039L02U02':'D4','zho_for_eng:S0049L01U05':'D5','zho_for_eng:S0056L01U08':'D6','zho_for_eng:S0058L02B03':'D6','zho_for_eng:S0069L01U09':'D6'}
TRY={'zho_for_eng:S0348L01U04','zho_for_eng:S0224L01U08','seed:2','seed:6','seed:222','seed:226','zho_for_eng:S0222L01B02','zho_for_eng:S0222L01B03','zho_for_eng:S0222L01U01','zho_for_eng:S0222L02U08','zho_for_eng:S0222L03U05','zho_for_eng:S0226L01U01','zho_for_eng:S0228L02U04','zho_for_eng:S0229L01U01','zho_for_eng:S0230L01U04','zho_for_eng:S0230L02U02','zho_for_eng:S0230L04U04'}
LATER={'zho_for_eng:S0224L01B03':'S0224L01 is A9 (#214 re-glosses it and makes it not-new); 在开始 rows decided after #214 lands','zho_for_eng:S0224L01U02':'same',}
NOFIX={'S0546L04U06':'no defect: 她说她又错又对 does say "she said she\'s both wrong and right" (the reader\'s note was about another row); the LEGO gloss is Kai item'}
KAI={ # item id -> Kai item key
'S0073L02':'k-73','seed:76':'k-76','S0091L01':'k-91','S0095L03':'k-95bus','S0101L03':'k-101','seed:103':'k-103','seed:108':'k-108','S0121L01':'k-121','S0129L01':'k-129','seed:130':'k-130','S0147L01':'k-147','S0157L02':'k-157','seed:166':'k-166','seed:178':'k-178','seed:185':'k-185','S0198L01':'k-198','S0221L03':'k-221','seed:231':'k-231','S0232L01':'k-232','zho_for_eng:S0232L01U04':'k-232','S0239L01':'k-mother','S0266L01':'k-father','zho_for_eng:S0259L01U02':'k-259','zho_for_eng:S0285L01U01':'k-285','zho_for_eng:S0285L01U04':'k-285','S0323L01':'k-323','S0336L01':'k-measure','S0411L02':'k-measure','S0337L01':'k-337','seed:461':'k-seeds-late','seed:464':'k-seeds-late','seed:479':'k-seeds-late','seed:483':'k-seeds-late','zho_for_eng:S0488L02B03':'k-measure','zho_for_eng:S0488L02U03':'k-measure','zho_for_eng:S0455L04U06':'k-455','S0505L01':'k-labels','S0514L02':'k-baskets','S0522L02':'k-labels','S0546L01':'k-measure','seed:563':'k-seeds-late','seed:565':'k-seeds-late','S0593L01':'k-593','seed:596':'k-seeds-late','S0597L01U04':'k-597','S0597L01U05':'k-597','S0625L01':'k-baskets','S0631L01':'k-631'}
rec=[]
for d in items:
  i=d['id']; s=i.split(':')[-1]
  r={'id':i,'before':d['before'],'reader_why':d['why']}
  if i in RULED: r.update(bucket='ruled',note='already ruled by Kai ('+RULED[i]+') — out of scope, left to #214')
  elif i in TRY: r.update(bucket=2,note='试试 "trying to" — SETTLED, no change (Tom + Kai 4 Nov: keep 试试 for trying to; canon prefers the reduplicated form)')
  elif i in LATER: r.update(bucket='after214',note=LATER[i])
  elif s in NOFIX: r.update(bucket=1,action='none',note=NOFIX[s])
  elif i in KAI or s in KAI: r.update(bucket=3,kai=KAI.get(i) or KAI.get(s))
  elif s in ed: r.update(bucket=1,action='edit',after=ed[s]['after'],why=ed[s]['why'])
  elif s in de: r.update(bucket=1,action='delete',why=de[s]['why'])
  else: r.update(bucket='UNCLASSIFIED')
  rec.append(r)
from collections import Counter
print(Counter(str(r['bucket'])+'/'+str(r.get('action','')) for r in rec))
print([r['id'] for r in rec if r['bucket']=='UNCLASSIFIED'])
items_ids={d['id'].split(':')[-1] for d in items}
extra=[x for x in list(ed)+list(de) if x not in items_ids]
print('knock-on extras beyond the 191:',extra)
json.dump({'job':'#219','items':rec,'knockOnExtras':extra},open('ops/zho-545/outofscope-219/record.json','w'),ensure_ascii=False,indent=1)
