#!/usr/bin/env python3
# Segmentation A (Descript label runs) over docs/corpus/talk-bollocks/, as specified in
# docs/pods/method-pod-re-cut-2026-08-30.md §1. Read-only; run from the repo root.
#   python3 tools/pods/measure-turn-distribution.py [part-1|part-2|part-4]
# Segmentation B (absorbed backchannels restored) is defined in §1a of that document.
import re, sys, statistics as st

SPK = {'tom':'TOM','aran':'ARAN'}
STOP = {'of','the','and','a','in','to','&','for','on','with','or','the'}

def clean(l):
    s = l.rstrip('\n')
    s = re.sub(r'^\s*-\s?', '', s)          # bullet prefix (parts 1,2)
    s = s.replace(' ',' ')
    return s.strip()

def strip_md(s):
    s = s.replace('**','').replace('__','')
    s = s.replace('[','').replace(']','')
    return s.strip()

def is_editorial(s):
    t = s.replace('**','').strip()
    if not ('[' in t or ']' in t): return False
    if not (t.startswith('[') or t.endswith(']')): return False
    return len(t.split()) <= 3

def is_heading(s):
    t = strip_md(s)
    if not t: return False
    if re.search(r'[.?!;:\u2026"\']', t): return False
    if t.endswith(','): return False
    w = t.replace(',',' ').split()
    if not (2 <= len(w) <= 10): return False
    cont = [x for x in w if x.lower() not in STOP]
    if not cont: return False
    caps = sum(1 for x in cont if x[:1].isupper())
    return caps == len(cont)

def parse(path, drop_head_lines):
    raw = open(path).read().split('\n')
    # drop front matter
    if raw and raw[0].strip()=='---':
        end = raw.index('---',1); raw = raw[end+1:]
    lines = [clean(l) for l in raw]
    lines = [l for l in lines if l!='']
    lines = lines[drop_head_lines:]
    turns=[]; cur=None; headings=[]; editorial=[]; empty_labels=0; merges=0
    for l in lines:
        key = strip_md(l).lower().strip(':').strip()
        if key in SPK:
            spk = SPK[key]
            if cur is not None and not cur['lines']:
                empty_labels += 1
                turns.pop()
                cur = turns[-1] if turns else None
            if cur is not None and cur['speaker']==spk:
                merges += 1
                continue   # keep accumulating into same turn
            cur = {'speaker':spk,'lines':[]}
            turns.append(cur)
            continue
        if is_editorial(l):
            editorial.append(l); continue
        if is_heading(l):
            headings.append(l); continue
        if cur is None:  # pre-speech junk
            continue
        cur['lines'].append(l)
    if cur is not None and not cur['lines']:
        turns.pop(); empty_labels+=1
    for t in turns:
        txt = ' '.join(strip_md(x) for x in t['lines'])
        t['text']=txt
        t['words']=len(re.findall(r"[A-Za-z0-9'’\-]+", txt))
    return turns, headings, empty_labels, merges, editorial

BC = set("yeah yes exactly correct right sure ok okay mm mmm hmm brilliant interesting gotcha absolutely quite indeed true no nope wow nice good great yep yup fine sorry oh ah huh totally definitely lovely perfect really".split())
def is_bc(t):
    w = re.findall(r"[a-z']+", t['text'].lower())
    if not w or len(w)>5: return False
    if '?' in t['text']: return False
    return all(x in BC for x in w)

def q(v,p):
    v=sorted(v); import math
    k=(len(v)-1)*p; f=math.floor(k); c=math.ceil(k)
    return v[f] if f==c else v[f]+(v[c]-v[f])*(k-f)

def stats(vals):
    m=st.mean(vals)
    return dict(n=len(vals), median=st.median(vals), mean=round(m,1),
        sd=round(st.pstdev(vals),1), cv=round(st.pstdev(vals)/m,2),
        q1=q(vals,.25), q3=q(vals,.75), mn=min(vals), mx=max(vals),
        p90=round(q(vals,.90),1), p95=round(q(vals,.95),1))

FILES=[('part-1','docs/corpus/talk-bollocks/part-1.md',4),
       ('part-2','docs/corpus/talk-bollocks/part-2.md',4),
       ('part-4','docs/corpus/talk-bollocks/part-4.md',5)]
allt=[]
for name,path,dh in FILES:
    if len(sys.argv)>1 and sys.argv[1]!=name: continue
    turns,heads,empt,mg,edi = parse(path,dh)
    for t in turns: t['part']=name
    allt += turns
    bcs=[t for t in turns if is_bc(t)]
    ft=[t for t in turns if not is_bc(t)]
    print(f"== {name}: {len(turns)} turns, {len(heads)} headings dropped, {len(edi)} editorial artefacts dropped, {empt} empty labels, {mg} same-speaker merges")
    print("   editorial:", edi)
    print("   headings:", heads[:40])
    print("   all-turns:", stats([t['words'] for t in turns]))
    print("   floor-taking only:", stats([t['words'] for t in ft]))
    print("   backchannels:", len(bcs), [t['text'] for t in bcs][:25])
    tot=sum(t['words'] for t in turns); print("   words:",tot)
    # alternation
    print("   speakers:", {s:sum(1 for t in turns if t['speaker']==s) for s in ('TOM','ARAN')})
    print("   longest:", sorted((t['words'] for t in turns))[-8:])
if len(sys.argv)<=1:
    print("== POOLED")
    print("   all:", stats([t['words'] for t in allt]))
    ft=[t for t in allt if not is_bc(t)]
    print("   floor-taking:", stats([t['words'] for t in ft]))
    print("   bc count:", len(allt)-len(ft), "of", len(allt))
