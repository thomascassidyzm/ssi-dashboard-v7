"""plan2.py: resolve which course OWNS each clip (audio.update is scoped to the owner course) by a dry-run probe, and split rows into
SAFE (no clip, or every clip used only by rows this job changes) and HELD (a clip is also used by an untouched row elsewhere, e.g. the parent
cym_n/cym_s course - relabelling it would put that course's row text and clip text out of step). Output: <course>.calls.json, <course>.held.json."""
import json,os,sys,urllib.request,collections
S=os.environ['CS_SCRATCH']
H={'Content-Type':'application/json','x-agent-id':'aran-watson-928'}
CODES={'cym_nv2_for_eng':['cym_nv2_for_eng','cym_n_for_eng'],'cym_sv2_for_eng':['cym_sv2_for_eng','cym_s_for_eng']}
refs=collections.defaultdict(set)
for c in ['cym_n_for_eng','cym_s_for_eng','cym_nv2_for_eng','cym_sv2_for_eng']:
    d=json.load(open(f'{S}/{c}.json'))
    for s in d['seeds']:
        for k in ('known_audio_id','target1_audio_id','target2_audio_id'):
            if s.get(k): refs[s[k]].add((c,'seed',s['seed_id']))
        for l in s['legos']:
            for k in ('target1_audio_id','target2_audio_id','presentation_audio_id'):
                if l.get(k): refs[l[k]].add((c,'lego',l['lego_id']))
            for p in l.get('basket_phrases') or []:
                for k in ('target1_audio_id','target2_audio_id','presentation_audio_id'):
                    if p.get(k): refs[p[k]].add((c,'phrase',p['id']))
def owner(course,op):
    for cc in CODES[course]:
        rq=urllib.request.Request(f'http://localhost:3470/api/production/{cc}/edit',data=json.dumps({**op,'dryRun':True}).encode(),headers=H)
        try: urllib.request.urlopen(rq,timeout=60); return cc
        except urllib.error.HTTPError as e:
            if e.code==409: return 'MISMATCH:'+cc+':'+e.read().decode()[:160]
            if e.code!=404: raise
    return None
for course in CODES:
    B=json.load(open(f'{course}.ops.json'))['batches']
    mine={r['id'].split(':')[-1] for b in B for r in b['rows']}   # ids changed by this job (seed S#### / phrase course:id)
    mineids={(course,r['kind'],r['id']) for b in B for r in b['rows']}
    seen=set(); ALLA={o['audio_id']:o for b in B for o in b['ops'] if o['op']=='audio.update'}
    cache=f'{S}/{course}.owners.json'; own=json.load(open(cache)) if os.path.exists(cache) else {}; calls=[]; held=[]; unowned=[]
    for bi,b in enumerate(B):
        audio=ALLA
        rowops=[o for o in b['ops'] if o['op']!='audio.update']
        okrows=[]; bad=set()
        for r in b['rows']:
            why=None
            for a in r['clips']:
                if a not in own: own[a]=owner(course,audio[a]) if a in audio else None
                if own[a] and own[a].startswith('MISMATCH'): why='clip text differs from row text: '+own[a][9:]; break
                if own[a] is None: why='clip owner not found in '+'/'.join(CODES[course]); break
                others=[x for x in refs[a] if x not in mineids]
                if others: why='clip also used by '+', '.join(f'{c[4:7]}:{i.split(":")[-1]}' for c,_,i in sorted(others)[:3]); break
            if why: held.append({**r,'why':why})
            else: okrows.append(r)
        ids={r['id'] for r in okrows}
        a_by_owner=collections.defaultdict(list)
        for r in okrows:
            for a in r['clips']:
                if a not in seen: seen.add(a); a_by_owner[own[a]].append(audio[a])
        for oc,ops in a_by_owner.items(): calls.append({'batch':bi,'course':oc,'ops':ops,'kind':'clips'})
        rops=[o for o in rowops if (o.get('phrase_id') in ids) or (o['op']=='seed.update' and any(r['kind']=='seed' and r['id']==f"S{o['seed_number']:04d}" for r in okrows))]
        if rops: calls.append({'batch':bi,'course':course,'ops':rops,'kind':'rows','rows':okrows})
    json.dump(own,open(cache,'w'))
    json.dump(calls,open(f'{course}.calls.json','w'),ensure_ascii=False,indent=1)
    json.dump(held,open(f'{course}.held.json','w'),ensure_ascii=False,indent=1)
    print(course,'safe rows',sum(len(c['rows']) for c in calls if c['kind']=='rows'),'held',len(held),'calls',len(calls),collections.Counter(h['why'][:25] for h in held).most_common(4))
