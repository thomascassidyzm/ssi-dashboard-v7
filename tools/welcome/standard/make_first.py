# MOVED to Popty from ssi-learning-app/tools/welcome/standard/make_first.py (job #699, Tom 2026-11-03: "we need everything that touches course content to be a popty tool"); behaviour unchanged, app paths via tools/lib/learning-app.mjs.
# NOTE: sys.path below still names the retired #83 worktree, as it did in the app (already dead there); fix before a re-run.
import sys,json
sys.path.insert(0,'/home/tomcassidy/.cs-worktrees/83-welcomes/tools/welcome/standard')
import splice as S
a=S.decode('src/deu_for_eng.mp3','build/deu.wav')
c=S.decode('clone/A_new.mp3','build/A_new.wav')
# cut times are read off the energy envelope of the real take (whisper times drift ~0.3 s), not whisper's word times
pieces=[('real','Welcome to',0.44,1.06),('clone','the SaySomethingin method of language learning.',None,None),
 ('real',"you'll be starting to speak",27.89,28.93),('real','sooner than you think.',29.47,30.60),
 ('real','The more you laugh when you make mistakes, the better it will go and the faster you learn.',35.20,40.70),
 ('real',"So, let's start playing.",40.95,42.85)]
gaps=[0.0,0.35,0.0,0.45,0.35]
parts=[];smap=[];t=0
for i,(k,txt,t0,t1) in enumerate(pieces):
    if k=='real':
        n=int(.02*S.SR)
        s=S.snap(a,t0,win=.02);e=S.snap(a,t1,win=.02)
        seg=S.fade(a[int(s*S.SR):int(e*S.SR)],8);src='deu_for_eng, Aran real take';sf,st=round(s,2),round(e,2)
    else:
        seg=S.fade(S.trim_silence(c),8);src='CLONE (Aran Cartesia clone "Aran", 2026-10-06)';sf=st=None
    d=len(seg)/S.SR
    smap.append(dict(text=txt,kind=k,source=src,src_from=sf,src_to=st,out_from=round(t,2),out_to=round(t+d,2)))
    parts.append(seg);t+=d
    if i<len(gaps):parts.append(S.silence(gaps[i]));t+=gaps[i]
S.write_mp3(S.join(parts),'build/first_welcome.mp3')
json.dump(smap,open('build/first_welcome_map.json','w'),indent=1)
for m in smap:print(m['kind'],m['out_from'],m['out_to'],m['src_from'],m['src_to'],m['text'][:40])
