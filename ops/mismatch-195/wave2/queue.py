#!/usr/bin/env python3
"""queue.py [--slots 3] [--par 3] — wave 2 of #195 (job #241): runs stage one (Haiku judge, then Sonnet second read)
over every course in courses.txt, at most --slots courses at once. Detection only: the one Popty call is the read
GET /api/production/<course>/seeds; nothing is written to any course.
Per course: snapshot -> prep.py -> judge.py haiku (re-run while baskets are missing, pausing if the account is
refusing) -> adjudicate.py sonnet. Resumable: every step skips what is already on disk. Outputs go to
~/ssi-evidence/ssi-dashboard-v7/ops/mismatch-195/wave2/ (wave-1 files are never touched).
Pacing: a new course starts only while load1 < 2x cores-ish (LOAD_MAX) and MemAvailable > 3 GB. Touch wave2/STOP to
drain (running courses finish, no new ones start). Progress: wave2/queue.log and wave2/state/<course>."""
import os, sys, subprocess, time, json, threading
H=os.path.dirname(os.path.abspath(__file__)); B=os.path.dirname(H)
E=os.path.expanduser('~/ssi-evidence/ssi-dashboard-v7/ops/mismatch-195/wave2')
args=sys.argv[1:]
SLOTS=int(args[args.index('--slots')+1]) if '--slots' in args else 3
PAR=int(args[args.index('--par')+1]) if '--par' in args else 3
LOAD_MAX=float(os.environ.get('LOAD_MAX','14'))
for d in ('snapshots','units','runs','adj','state'): os.makedirs(f'{E}/{d}',exist_ok=True)
COURSES=[l.strip() for l in open(f'{H}/courses.txt') if l.strip()]
lock=threading.Lock()
def log(m):
    with lock, open(f'{E}/queue.log','a') as f: f.write(time.strftime('%Y-%m-%dT%H:%M:%SZ ',time.gmtime())+m+'\n')
def state(c,s): open(f'{E}/state/{c}','w').write(s+'\n')
def sh(cmd,logf):
    with open(logf,'a') as f: return subprocess.run(cmd,stdout=f,stderr=f).returncode
def missing(c):
    r=subprocess.run(['python3',f'{B}/status.py',f'{E}/units/{c}.jsonl',f'{E}/runs/{c}.jsonl'],capture_output=True,text=True)
    first=r.stdout.split('\n')[0]; n=int(first.split(' missing ')[1].split()[0]) if ' missing ' in first else -1
    return n, first
def course(c):
    try:
        snap=f'{E}/snapshots/{c}.json'
        if not os.path.exists(snap) or os.path.getsize(snap)<1000:
            state(c,'snapshot')
            if subprocess.run(['curl','-sf','-o',snap,f'http://localhost:3470/api/production/{c}/seeds']).returncode:
                state(c,'FAILED snapshot'); log(f'{c} snapshot failed'); return
        units=f'{E}/units/{c}.jsonl'
        if not os.path.exists(units):
            state(c,'prep')
            if sh(['python3',f'{B}/prep.py',snap,units],f'{E}/units/{c}.log'):
                state(c,'FAILED prep'); log(f'{c} prep failed'); return
        n_units=sum(1 for _ in open(units))
        if n_units==0: state(c,'DONE (no played baskets)'); log(f'{c} no played baskets'); return
        for attempt in range(8):
            n,line=missing(c)
            if n==0: break
            state(c,f'judging (pass {attempt+1}) {line}'); log(f'{c} judge pass {attempt+1}: {line}')
            if attempt: time.sleep(min(1800,300*attempt))  # failed parses on a pass usually mean the account is refusing
            sh(['python3',f'{B}/judge.py',units,'haiku',f'{E}/runs/{c}.jsonl','--ctx','filtered','--par',str(PAR)],f'{E}/runs/{c}.log')
        n,line=missing(c); log(f'{c} judge done: {line}')
        state(c,f'adjudicating; judge {line}')
        for attempt in range(3):
            sh(['python3',f'{B}/adjudicate.py',units,f'{E}/runs/{c}.jsonl',f'{E}/adj/{c}.jsonl','--model','sonnet','--min','4','--par',str(PAR)],f'{E}/adj/{c}.log')
            fails=sum(1 for l in open(f'{E}/adj/{c}.jsonl') if json.loads(l).get('answers') is None) if os.path.exists(f'{E}/adj/{c}.jsonl') else 0
            if not fails: break
            time.sleep(600)
        state(c,f'DONE judge {line}'); log(f'{c} DONE')
    except Exception as e:
        state(c,f'FAILED {e!r}'); log(f'{c} exception {e!r}')
def healthy():
    l1=os.getloadavg()[0]
    mem=int([x for x in open('/proc/meminfo') if x.startswith('MemAvailable')][0].split()[1])//1024
    return l1<LOAD_MAX and mem>3000, f'load {l1:.1f} memavail {mem}MB'
todo=[c for c in COURSES if not (os.path.exists(f'{E}/state/{c}') and open(f'{E}/state/{c}').read().startswith('DONE'))]
log(f'queue start: {len(todo)} courses, slots {SLOTS}, par {PAR}')
running={}
while todo or running:
    for c,t in list(running.items()):
        if not t.is_alive(): del running[c]
    if os.path.exists(f'{E}/STOP'): todo=[]
    while todo and len(running)<SLOTS:
        ok,why=healthy()
        if not ok: log(f'waiting to start {todo[0]}: {why}'); break
        c=todo.pop(0); t=threading.Thread(target=course,args=(c,),daemon=True); t.start(); running[c]=t; log(f'{c} started ({why})')
        time.sleep(20)
    time.sleep(60)
log('queue finished')
