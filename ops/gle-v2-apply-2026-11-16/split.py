# Splits ops.json into one batch per family (a seed's ops always travel together, so its phrase knock-ons
# stay in the same undoable event). Writes families.json {family: [seeds]} and fam-<family>.ops.json.
import json,re,collections
ops=json.load(open('ops.json'))['ops']
tags=collections.defaultdict(set)
cur=None
for line in open('cuts.txt',encoding='utf8'):
    if line.startswith('@'): cur=int(re.match(r'@(\d+)',line).group(1)); continue
    if line.startswith('='): cur=None; m=re.match(r'=S(\d{4})',line); n=int(m.group(1)); tags[n]|=set(re.findall(r'\b(RULED|FRAME|COVER|INF|K27|S12|S220|EOG|A\d|C\d|S8|OPEN|Q)\b',line.split('##')[-1])); tags[n].add('RELABEL'); continue
    if cur and '##' in line: tags[cur]|=set(re.findall(r'\b(RULED|FRAME|COVER|INF|K27|S12|S220|EOG|A\d|C\d|S8|OPEN|Q)\b',line.split('##',1)[1]))
SPECIAL={'seed12':{12,60,135},'verbs':{1,3,4,5,20,32},'relax':{110,219},'someone':{128,234,235,236,341},'same':{153,518},
 's220':{220},'s392':{392,394,570},'guess':{260},'eoghan':{248,299,339,531,548,593,613}}
def fam(n,seedops):
    for f,s in SPECIAL.items():
        if n in s: return f
    t=tags.get(n,set())
    if 'INF' in t or 'K27' in t: return 'verbs'
    if 'FRAME' in t: return 'frames'
    if n>300 or t&{'RULED','A1','A2','A3','A8'}: return 'stageA'
    if 'A6' in t: return 'special'
    if 'A7' in t: return 'sets'
    if t&{'A5','C4','C5','RELABEL'}: return 'labels'
    if 'C2' in t: return 'little'
    whys=' '.join(json.dumps(o,ensure_ascii=False) for o in seedops)
    if t: return 'closures'
    return 'closures'
by=collections.defaultdict(list)
for o in ops: by[o['_seed']].append(o)
F=collections.defaultdict(list)
# phrase-only seeds: family of the reword that touches them
K=json.load(open('knockons.json'))
for n,so in sorted(by.items()):
    f=fam(n,so)
    if n not in tags and f=='closures':
        k=K.get(str(n),{}); why=' '.join(x.get('why','') for x in k.get('phr_reworded',[]))
        if all(o['op'] in('phrase.update',) for o in so):
            f='relax' if 'relax' in why else 'eoghan' if 'EOG' in why else 'stageA' if 'A8' in why or 'A3' in why else f
    F[f].append(n)
json.dump({f:v for f,v in F.items()},open('families.json','w'),indent=0)
for f,seeds in F.items():
    chunk=[{k:v for k,v in o.items() if k!='_seed'} for n in seeds for o in by[n]]
    json.dump({'family':f,'seeds':seeds,'ops':chunk},open(f'fam-{f}.ops.json','w'),ensure_ascii=False,indent=0)
    c=collections.Counter(o['op'] for o in chunk)
    print(f'{f:9s} seeds {len(seeds):3d} ops {len(chunk):4d}',dict(c))
