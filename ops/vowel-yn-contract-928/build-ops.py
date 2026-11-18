"""Aran ruling 2026-10-28 (job #928): contract 'X yn Y' -> "X’n Y" for groups A (adverb/adj/predicate), B (progressive yn + verb-noun), C (ages)
after a vowel-final word, in phrases and seeds of cym_nv2_for_eng / cym_sv2_for_eng. D (preposition/fixed) and E (yn + possessive) untouched.
Text only; clip text relabelled first (audio.update), then row text (+ decomposition for phrases). LEGO text and component phrases never touched: listed.
Input: fresh Popty read dump (GET /api/production/<course>/seeds?status=all). No SQL.
Usage: build-ops.py <course> <dump.json> <outdir>   -> <outdir>/<course>.ops.json (batches) + <course>.skips.json"""
import json,re,sys,collections
course,dump,outdir=sys.argv[1:4]
VOW='aeiouwyâêîôûŵŷáéíóúẃýàèìòùäëïöü'
ART={'y','yr'}
POSS={'ei','eu','ein','fy','dy'}
D_NEXT={'gymraeg','ystod','lle','hytrach','fan','rhywle','ôl','anffodus'}
NUM={'ddeg','bump','bymtheg'}
VN={'gweithio','gadael','dod','nabod','edrych','dishgwl','cael','digwydd','arfer','chwarae','cyfri’','gwylio’r'}
def grp(nx):
    if nx in ART: return None
    if nx in POSS: return 'E'
    if nx in D_NEXT: return 'D'
    if nx in NUM: return 'C'
    if nx in VN: return 'B'
    return 'A'
RX=re.compile(r"(?<![\w’'])([\w’']*[%s]) yn ([\w’']+)"%VOW, re.I)
def matches(t):
    """positions (index of the space before 'yn') of qualifying contractions, with group"""
    out=[]; pos=0
    while True:
        m=RX.search(t,pos)
        if not m: break
        prev,nx=m.group(1),m.group(2).lower()
        pos=m.start(2)   # allow overlapping chains (next word may itself be followed by yn)
        if prev.lower().endswith(('’n',"'n")): continue
        g=grp(nx)
        if g in ('A','B','C'): out.append((m.start(1)+len(prev),g))
    return out
def contract(t,ms):
    for i,_ in sorted(ms,reverse=True): t=t[:i]+'’n'+t[i+3:]   # ' yn' -> '’n'
    return t
def contract_dec(dec,ms):
    chars=[]   # (seg index, char)
    for si,s in enumerate(dec):
        for ch in s['target']: chars.append([si,ch])
    for i,_ in sorted(ms,reverse=True):
        assert chars[i][1]==' ' and ''.join(c for _,c in chars[i+1:i+3])=='yn'
        chars[i][1]='’'
        del chars[i+1]
    out=[]
    for si,s in enumerate(dec):
        n=dict(s); n['target']=''.join(c for k,c in chars if k==si); out.append(n)
    return out
d=json.load(open(dump))
# which rows reference each clip (to refuse relabelling a clip another untouched row still uses)
refs=collections.defaultdict(list)
for s in d['seeds']:
    for sl in ('target1_audio_id','target2_audio_id'):
        if s.get(sl): refs[s[sl]].append(('seed',s['seed_id']))
    for l in s['legos']:
        for sl in ('target1_audio_id','target2_audio_id','presentation_audio_id'):
            if l.get(sl): refs[l[sl]].append(('lego',l['lego_id']))
        for p in l.get('basket_phrases') or []:
            for sl in ('target1_audio_id','target2_audio_id','presentation_audio_id'):
                if p.get(sl): refs[p[sl]].append(('phrase',p['id']))
cands=[]; skips=[]; seen=set()
def consider(kind,rid,t,row):
    ms=matches(t or '')
    if ms: cands.append((kind,rid,t,ms,row))
for s in d['seeds']:
    consider('seed',s['seed_id'],s['target_text'],s)
    for l in s['legos']:
        ms=matches(l['target_text'] or '')+matches(json.dumps(l['components'],ensure_ascii=False) if l['components'] else '')
        if ms: skips.append({'kind':'lego/component','id':l['lego_id'],'text':l['target_text'],'why':'LEGO/component text never made bare n form'})
        for p in l.get('basket_phrases') or []:
            if p['id'] in seen: continue
            seen.add(p['id'])
            if p['phrase_role'] not in ('build','use'):
                if matches(p['target_text'] or ''): skips.append({'kind':'phrase('+str(p['phrase_role'])+')','id':p['id'],'text':p['target_text'],'why':'component/other-role row, not a build/use phrase'})
                continue
            consider('phrase',p['id'],p['target_text'],p)
# decide, per candidate
plan={}   # id -> dict
tomod={c[1] for c in cands}
for kind,rid,t,ms,row in cands:
    nt=contract(t,ms)
    slots=[(sl,row.get(sl)) for sl in ('target1_audio_id','target2_audio_id') if row.get(sl)]
    bad=None
    for sl,a in slots:
        others=[r for r in refs[a] if r[1]!=rid and not (r[1] in tomod)]
        if others: bad=f'clip {a} also used by {others[:3]}'
    if kind=='phrase' and row['decomposition']:
        ndec=contract_dec(row['decomposition'],ms)
        if ''.join(x['target'] for x in ndec)!=nt.rstrip('?!.,… ') and ''.join(x['target'] for x in ndec)!=nt: bad=bad or 'decomposition does not tile phrase text'
    if bad: skips.append({'kind':kind,'id':rid,'text':t,'why':bad}); continue
    groups=sorted({g for _,g in ms})
    plan[rid]=dict(kind=kind,id=rid,old=t,new=nt,groups=groups,slots=slots,row=row,ms=ms)
# shared clips between two planned rows must get the same new text
clipnew={}
for r in list(plan.values()):
    for sl,a in r['slots']:
        if a in clipnew and clipnew[a][1]!=r['new']:
            skips.append({'kind':r['kind'],'id':r['id'],'text':r['old'],'why':'clip shared with a row of different new text'}); plan.pop(r['id'],None)
        else: clipnew[a]=(r['old'],r['new'])
# build ordered op batches (clips first inside each batch), 60 rows a batch
rows=sorted(plan.values(),key=lambda r:(r['kind']!='seed',r['id']))
batches=[]; done_clips=set()
for i in range(0,len(rows),60):
    ops=[]; chunk=rows[i:i+60]; sums=[]
    for r in chunk:
        for sl,a in r['slots']:
            if a in done_clips: continue
            done_clips.add(a); ops.append({'op':'audio.update','audio_id':a,'set':{'text':r['new']},'expect':{'text':r['old']}})
    for r in chunk:
        if r['kind']=='seed':
            ops.append({'op':'seed.update','seed_number':r['row']['seed_number'],'set':{'target_text':r['new']},'expect':{'target_text':r['old']}})
        else:
            o={'op':'phrase.update','phrase_id':r['id'],'set':{'target_text':r['new']},'expect':{'target_text':r['old']}}
            if r['row']['decomposition']:
                o['set']['decomposition']=contract_dec(r['row']['decomposition'],r['ms']); o['expect']['decomposition']=r['row']['decomposition']
            ops.append(o)
        sums.append({'id':r['id'],'kind':r['kind'],'groups':r['groups'],'old':r['old'],'new':r['new'],'clips':[a for _,a in r['slots']]})
    batches.append({'ops':ops,'rows':sums})
json.dump({'batches':batches},open(f'{outdir}/{course}.ops.json','w'),ensure_ascii=False,indent=1)
json.dump(skips,open(f'{outdir}/{course}.skips.json','w'),ensure_ascii=False,indent=1)
cnt=collections.Counter((r['kind'],''.join(r['groups'])) for r in plan.values())
print(course,len(plan),'rows',len(batches),'batches',sum(len(b['ops']) for b in batches),'ops',dict(cnt),'skips',len(skips))
