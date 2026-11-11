# After the apply: every decision is live. Reads a FRESH course.json (CS_SCRATCH) and decisions.json.
import json,os
c=json.load(open(os.path.join(os.environ['CS_SCRATCH'],'course.json'))); d=json.load(open('decisions.json')); bad=[]
for n,s in d['seeds'].items():
    if (c['S'][n]['known'],c['S'][n]['target'])!=(s['known'],s['target']): bad.append(('seed',n))
for k,l in d['legos'].items():
    for f,v in l['set'].items():
        if c['LA'][k][f]!=v: bad.append(('lego',k,f))
for k in d['lego_deletes']:
    if k in c['LA']: bad.append(('lego not deleted',k))
    bad+= [('phrase survived',q) for q in d['lego_deletes'][k]['phrases_deleted'] if q in c['rows']]
gone=set(q for k in d['lego_deletes'] for q in d['lego_deletes'][k]['phrases_deleted'])
for k,p in d['phrases'].items():
    if k in gone: continue
    if p['action']=='del':
        if k in c['rows']: bad.append(('phrase not deleted',k))
    elif (c['rows'][k]['known_text'],c['rows'][k]['target_text'])!=(p['known'],p['target']): bad.append(('phrase',k))
for r in d['phrase_inserts']:
    k=r['id'].split(':')[1]
    if k not in c['rows'] or c['rows'][k]['target_text']!=r['target_text']: bad.append(('insert',k))
print('seeds',len(d['seeds']),'legos',len(d['legos']),'lego deletes',len(d['lego_deletes']),'phrases',len(d['phrases']),'inserts',len(d['phrase_inserts']),'| NOT LIVE:',bad or 'none')
