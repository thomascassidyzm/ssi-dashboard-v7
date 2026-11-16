# After undo.py: every row batches A-E touched is back to its before-state text (seeds, LEGOs by uuid, phrases by id);
# inserted rows gone, deleted rows back. Usage: python3 undo_check.py <live seeds.json>
import json,sys
D=json.load(open(sys.argv[1]))['seeds']; cur={}
for s in D:
    cur[('seed',s['seed_number'])]=s
    for l in s.get('legos') or []:
        cur[('lego',l.get('id'))]=l
        for p in (l.get('phrases') or [])+(l.get('basket_phrases') or []): cur[('phrase',p.get('id'))]=p
    for p in s.get('phrases') or []: cur[('phrase',p.get('id'))]=p
first={}
for b in 'ABCDE':
    for r in json.load(open(f'{b}-apply.json'))['results']:
        t=r['op'].split('.')[0]; src=r.get('before') or r.get('after') or {}
        k=('seed',src.get('seed_number')) if t=='seed' else (t,src.get('id'))
        first.setdefault(k,r.get('before'))
bad=0
for k,before in first.items():
    now=cur.get(k)
    if before is None and now is not None: bad+=1; print('STILL THERE',k,now.get('target_text'))
    elif before is not None and now is None: bad+=1; print('MISSING',k,before.get('target_text'))
    elif before and any(before.get(c)!=now.get(c) for c in('target_text','known_text') if c in before): bad+=1; print('DIFFERS',k,before.get('target_text'),'|',now.get('target_text'))
print(len(first),'rows checked,',bad,'not restored')
