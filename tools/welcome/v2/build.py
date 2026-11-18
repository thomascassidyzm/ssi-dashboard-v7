# MOVED to Popty from ssi-learning-app/ops/welcome-v2/build.py (job #699, Tom 2026-11-03: "we need everything that touches course content to be a popty tool"); behaviour unchanged, app paths via tools/lib/learning-app.mjs.
# NOTE: sys.path below still names the retired #83 worktree, as it did in the app (already dead there); fix before a re-run.
import sys,json
sys.path.insert(0,'/home/tomcassidy/.cs-worktrees/83-welcomes/tools/welcome/standard')
import splice as S
src={k:S.decode(f'src/{k}_for_eng.mp3',f'build/{k}.wav') for k in ('cym_n','deu')}
nat=S.decode('clone/native.mp3','build/native.wav')
R=lambda tk,a,b,t:('real',tk,a,b,t)
P1=R('cym_n',0.50,2.72,'Welcome to this unusual game.')
P2=R('cym_n',5.06,6.88,"Here's how it works.")
P3=R('deu',7.00,8.57,'I teach you something,')
P4=R('deu',9.40,13.70,'then I say something in English and give you a chance to say it out loud.')
P5=R('cym_n',14.31,17.01,'Then you listen carefully to the')
CL=('clone',None,None,None,'native')
P6=R('cym_n',17.34,19.11,'speakers who will model it for you.')
P7=R('cym_n',24.11,29.58,"Even if you aren't sure, have a go at saying whatever you can and you'll be starting to speak")
P8=R('deu',29.47,31.00,'sooner than you think.')
P9=R('deu',40.93,42.86,"So, let's start playing.")
CANDS={
 'A':([P1,P7,P8,P9],[.4,.05,.35]),
 'B':([P1,P2,P3,P4,P9],[.35,.3,.05,.4]),
 'C':([P1,P3,P4,P5,CL,P6],[.35,.05,.4,.03,.03]),
}
for name,(ps,gaps) in CANDS.items():
    parts=[];sm=[];t=0
    for i,p in enumerate(ps):
        if p[0]=='real':
            a=src[p[1]]; s=S.snap(a,p[2],win=.06); e=S.snap(a,p[3],win=.06)
            seg=S.fade(a[int(s*S.SR):int(e*S.SR)],8); srcname=f"{p[1]=='deu' and 'deu_for_eng' or 'cym_n_for_eng'}, Aran real take"; sf,st=round(s,2),round(e,2)
        else:
            seg=S.fade(S.trim_silence(nat),8); srcname='CLONE (Aran Cartesia clone, 6 Oct) - one word'; sf=st=None
        d=len(seg)/S.SR
        sm.append(dict(text=p[4],kind=p[0],source=srcname,src_from=sf,src_to=st,out_from=round(t,2),out_to=round(t+d,2)))
        parts.append(seg);t+=d
        if i<len(gaps): parts.append(S.silence(gaps[i]));t+=gaps[i]
    S.write_mp3(S.join(parts),f'out/welcome_{name}.mp3')
    json.dump(sm,open(f'out/welcome_{name}_map.json','w'),indent=1)
    print(name,round(t,1),'s'); [print('  ',m['kind'],m['out_from'],m['out_to'],m['text']) for m in sm]
