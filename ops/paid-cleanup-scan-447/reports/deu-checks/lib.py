import json,re,glob,os
S=os.environ['CS_SCRATCH']
def load(c): return json.load(open(f'{S}/{c}.json')), json.load(open(f'{S}/{c}.hits.json'))
MAIN_DOCS=['af093f03','29f966c2','ca698dea','f808c41c','2776cf45','76f2a86d']
CH_DOCS=['740ccd8e','a37deb0b','5d06152c','c2e3e0d4','28b9d133','7d9d7a6b']
def known_ids(docs):
    ids=set()
    for d in docs:
        t=open(f'{S}/d-{d}.txt').read()
        ids|=set(re.findall(r'S\d{4}L\d{2}(?:[BU]\d{2})?',t))
    return ids
def isknown(rid,ids):
    if not rid: return ''
    if rid in ids: return 'K'
    if rid[:8] in ids: return 'k'
    return ''
def index(dump):
    rows={};legos={}
    for s in dump['seeds']:
        for l in s['legos']:
            legos[l['id']]=(s['n'],l)
            for p in l.get('phrases',[]):
                rows[p['id']]=(s['n'],l,p)
    return rows,legos
