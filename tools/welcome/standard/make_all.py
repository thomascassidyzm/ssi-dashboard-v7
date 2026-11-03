# MOVED to Popty from ssi-learning-app/tools/welcome/standard/make_all.py (job #699, Tom 2026-11-03: "we need everything that touches course content to be a popty tool"); behaviour unchanged, app paths via tools/lib/learning-app.mjs.
# NOTE: sys.path below still names the retired #83 worktree, as it did in the app (already dead there); fix before a re-run.
import sys,json,os,array,math
sys.path.insert(0,'/home/tomcassidy/.cs-worktrees/83-welcomes/tools/welcome/standard')
import splice as S
REAL={'Spanish':('spa_for_eng',8.54,9.16),'German':('deu_for_eng',8.66,9.08),'French':('fra_for_eng',7.185,7.76),'Finnish':('fin_for_eng',8.26,8.66),
 'Irish':('gle_for_eng',15.9,16.37),'Italian':('ita_for_eng',8.36,8.83),'Korean':('kor_for_eng',16.24,16.64),
 'Swedish':('swe_for_eng',8.39,8.91),'Chinese':('zho_for_eng',9.35,9.97)}
SPEAK={'North Welsh':'Welsh','South Welsh':'Welsh'}
names=json.load(open('names_by_course.json'))
rms=lambda a:(sum(x*x for x in a)/max(1,len(a)))**.5
deu=S.decode('src/deu_for_eng.mp3','build/deu.wav')
wt=(0.44,1.06)
s0=S.snap(deu,wt[0],win=.02);e0=S.snap(deu,wt[1],win=.02)
wel=S.fade(deu[int(s0*S.SR):int(e0*S.SR)],8)
dec={}
def dk(tk):
    if tk not in dec: dec[tk]=S.decode(f'src/{tk}.mp3',f'build/{tk}.wav')
    return dec[tk]
def gain(a,ref):
    g=rms(ref)/max(1,rms(a)); return array.array('h',[max(-32768,min(32767,int(x*g))) for x in a])
os.makedirs('out/new',exist_ok=True)
tail=S.fade(S.trim_silence(S.decode('clone/tail.mp3','build/tail.wav')),8)
smaps={}
for code,disp in sorted(names.items()):
    spoken=SPEAK.get(disp,disp)
    m=[dict(text='Welcome to',kind='real',source='deu_for_eng, Aran real take',src_from=round(s0,2),src_to=round(e0,2))]
    parts=[wel];tags=[0]
    if spoken in REAL:
        tk,a0,a1=REAL[spoken]; a=dk(tk)
        nm=gain(S.fade(a[int(a0*S.SR):int(a1*S.SR)],8),wel)
        parts+= [S.silence(0.03),nm,S.silence(0.2),tail];tags+=[None,1,None,2]
        m+= [dict(text=spoken,kind='real',source=f'{tk}, Aran real take',src_from=a0,src_to=a1),
             dict(text="let's get started right away!",kind='clone',source='CLONE (Aran Cartesia clone "Aran", 2026-10-06)',src_from=None,src_to=None)]
    else:
        c=S.fade(S.trim_silence(S.decode(f'clone/names/{spoken}.mp3',f'build/c_{spoken.replace(" ","_")}.wav')),8)
        parts+=[S.silence(0.03),c];tags+=[None,1]
        m.append(dict(text=f"{spoken}, let's get started right away!",kind='clone',source='CLONE (Aran Cartesia clone "Aran", 2026-10-06)',src_from=None,src_to=None))
    S.write_mp3(S.join(parts),f'out/new/{code}.mp3')
    t=0
    for tg,p in zip(tags,parts):
        d=len(p)/S.SR
        if tg is not None: m[tg]['out_from']=round(t,2);m[tg]['out_to']=round(t+d,2)
        t+=d
    smaps[code]=dict(name=disp,spoken=spoken,pieces=m)
json.dump(smaps,open('out/new_course_maps.json','w'),indent=1,ensure_ascii=False)
print(len(smaps))
