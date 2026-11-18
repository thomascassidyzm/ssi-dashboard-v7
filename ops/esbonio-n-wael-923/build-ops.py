"""Aran ruling 2026-10-28 (job #923): 'esbonio yn wael' -> "esbonio’n wael" (text only, keep takes).
Fresh read through Popty, then per phrase: audio.update (clip text first), phrase.update (text + decomposition) with expect guards.
Usage: build-ops.py <course> <out.json> [dump.json]   (stdlib only; no SQL)"""
import json,re,sys,urllib.request
course,out=sys.argv[1],sys.argv[2]
PAT=re.compile(r'esbonio yn wael')
NEW='esbonio’n wael'
if len(sys.argv)>3: d=json.load(open(sys.argv[3]))
else:
    rq=urllib.request.Request(f'http://localhost:3470/api/production/{course}/seeds?status=all',headers={'x-agent-id':'aran-watson-923'})
    d=json.load(urllib.request.urlopen(rq,timeout=120))
ops=[]; clips=[]
def fixdec(dec):
    out=[];i=0
    while i<len(dec):
        s=dict(dec[i])
        if i+1<len(dec) and s['target'].rstrip().endswith('esbonio') and dec[i+1]['target']==' yn wael':
            n=dict(dec[i+1]); n['target']='’n wael'; out+= [s,n]; i+=2; continue
        out.append(s); i+=1
    return out
for s in d['seeds']:
    t=s['target_text'] or ''
    assert not PAT.search(t), ('seed',s['seed_number'])
    for l in s['legos']:
        assert not PAT.search(l['target_text'] or ''), l['lego_id']
        assert not PAT.search(json.dumps(l['components'],ensure_ascii=False)), l['lego_id']
        for p in l.get('basket_phrases') or []:
            if not PAT.search(p['target_text'] or ''): continue
            nt=PAT.sub(NEW,p['target_text'])
            ndec=fixdec(p['decomposition'])
            assert ''.join(x['target'] for x in ndec)==nt, (nt,ndec)
            for slot in ('known_audio_id','target1_audio_id','target2_audio_id','presentation_audio_id'):
                a=p.get(slot)
                if a and slot.startswith('target'):
                    ops.append(('audio',a,p['target_text'],nt))
                    clips.append({'phrase':p['id'],'slot':slot,'audio':a})
            ops.append(('phrase',p['id'],p['target_text'],nt,p['decomposition'],ndec))
res=[]
for o in ops:
    if o[0]=='audio': res.append({'op':'audio.update','audio_id':o[1],'set':{'text':o[3]},'expect':{'text':o[2]}})
for o in ops:
    if o[0]=='phrase': res.append({'op':'phrase.update','phrase_id':o[1],'set':{'target_text':o[3],'decomposition':o[5]},'expect':{'target_text':o[2],'decomposition':o[4]}})
json.dump({'ops':res,'clips':clips},open(out,'w'),ensure_ascii=False,indent=1)
print(course,len(res),'ops',len(clips),'clips')
