# Writes plan-seeds.md (the per-seed part of the plan document) from plan.json + knockons.json.
import json,re
K=json.load(open('knockons.json'));P=json.load(open('plan.json'))['plan'];c=json.load(open('live-snapshot.json'));S=c['S']
out=[];light=[]
TAG={'RULED':'ruled 12 Nov','COVER':'every part is a LEGO','FRAME':'wrap frame','INF':'"to …" rule','Q':'question for Eoghan','OPEN':'open question','S8':'whole seed was one LEGO'}
def tags(note):
    m=re.match(r'((?:[A-Z][A-Z0-9]*\s+)*[A-Z][A-Z0-9]*)(\s+.*)?$',note or '')
    if not m: return note or ''
    t=[TAG.get(x,x) for x in m.group(1).split()]; rest=(m.group(2) or '').strip()
    return ', '.join(t)+('. '+rest if rest else '')
for n in sorted(K,key=int):
    k=K[n]; n=int(n)
    if n>300:
        continue
    real=k['seed'] or any(x['action'] in('add','remove') and not(x['action']=='add' and not x['is_new']) for x in k['legos']) or any(x['action']=='change' and (x['before'][1].lower()!=x['target'].lower() or x['before'][0]!=x['known']) for x in k['legos'])
    flips=[x for x in k['legos'] if x['action']=='change' and x['before'][2]!=x['is_new']]
    if not real:
        bits=[]
        for x in k['legos']:
            if x['action']=='add': bits.append(f"adds not-new *{x['known']} | {x['target']}*")
            elif x['action']=='change' and x['before'][2]!=x['is_new']: bits.append(f"*{x['known']} | {x['target']}* becomes {'new (taught here)' if x['is_new'] else 'not-new'}")
        ph=len(k['phr_deleted'])+len(k['phr_moved_out'])
        if bits or ph: light.append(f"- **{n}**: "+('; '.join(bits) or 'LEGOs unchanged')+(f". Phrases: {len(k['phr_moved_in'])} in, {len(k['phr_moved_out'])} out, {len([p for p in k['phr_deleted'] if p['role']!='component'])} deleted." if ph or k['phr_moved_in'] else '.'))
        continue
    out.append(f"\n### Seed {n}\n")
    if k['seed']:
        b,a=k['seed']['before'],k['seed']['after']
        out.append(f"- Before: {b[0]} | *{b[1]}*\n- After: {a[0]} | *{a[1]}*\n")
    else: out.append(f"- Seed (unchanged): {S[str(n)]['known']} | *{S[str(n)]['target']}*\n")
    out.append("| LEGO | New? | Syll. | English | Irish | Change |\n|---|---|---|---|---|---|")
    for x in k['legos']:
        if x['action']=='remove':
            out.append(f"| {x['id'][5:]} | | | ~~{x['before'][0]}~~ | ~~{x['before'][1]}~~ | removed |"); continue
        ch={'keep':'','add':'added','change':''}[x['action']]
        if x['action']=='change':
            b=x['before'];d=[]
            if b[1].lower()!=x['target'].lower() or b[0]!=x['known']: d.append(f"was *{b[0]} \\| {b[1]}*")
            if b[2]!=x['is_new']: d.append('was '+('new' if b[2] else 'not-new'))
            ch='; '.join(d)
        note=tags(x.get('note'))
        out.append(f"| {x['id'][5:]} | {'NEW' if x['is_new'] else 'not-new'} | {x['syl']} | {x['known']} | {'(frame) ' if x.get('frame') else ''}{x['target']} | {'; '.join(y for y in (ch,note) if y)} |")
    dl=[p for p in k['phr_deleted'] if p['role']!='component']
    line=f"\nKnock-ons: {len(k['phr_reworded'])} phrases reworded, {len(k['phr_moved_in'])} moved in, {len(k['phr_moved_out'])} moved out, {len(dl)} deleted, {len(k['phr_written'])} added (the seed sentence)."
    if k['order_differs']: line+=" LEGO order here differs from the stored order (see dry-run section)."
    out.append(line)
    why={}
    for p in dl: why.setdefault(re.sub(r':.*','',p['why']),[]).append(p)
    for w,l in why.items(): out.append(f"- Deleted ({len(l)}): {w}. e.g. {l[0]['known']} | *{l[0]['target']}*")
    if k['phr_reworded']: p=k['phr_reworded'][0]; out.append(f"- Reworded e.g. *{p['before']}* → *{p['after']}*")
open('plan-seeds.md','w').write('\n'.join(out)+'\n\n### Seeds whose only change is which copy of a LEGO is the new one\n\n'+'\n'.join(light)+'\n')
print('full seeds',sum(1 for l in out if l.startswith('\n### Seed')),'light',len(light),'chars',sum(len(x) for x in out)+sum(len(x) for x in light))
