import json,re,glob,os,sys,importlib.util,subprocess
from lib import *
R='/home/tomcassidy/.cs-worktrees/ssi-dashboard-v7-clean/468-cleanup-scan-deu/ops/deu-435'
fixes=[]
for f in sorted(glob.glob(R+'/shard-*.data.cjs')):
    js=subprocess.run(['node','-e','const d=require(process.argv[1]);const a=Array.isArray(d)?d:(d.fixes||d.FIXES||d.rows||Object.values(d).find(Array.isArray));console.log(JSON.stringify(a))',f],capture_output=True,text=True).stdout
    fixes+=json.loads(js)
# also 195 decisions
sys.path.insert(0,'/home/tomcassidy/.cs-worktrees/ssi-dashboard-v7-clean/468-cleanup-scan-deu/ops/deu-mismatch-195')
norm=lambda s:re.sub(r'[^\w\s]','',(s or '').replace('’',"'").lower()).split()
main=json.load(open(f'{S}/deu_for_eng.json'))
mrows={}
for s in main['seeds']:
    for l in s['legos']:
        for p in l.get('phrases',[]): mrows[p['id'].split(':')[-1]]=p
res={}
for c in ['deu_at_for_eng','deu_ch_for_eng']:
    d=json.load(open(f'{S}/{c}.json')); byk={}
    for s in d['seeds']:
        for l in s['legos']:
            for p in l.get('phrases',[]):
                byk.setdefault(' '.join(norm(p['known'])),[]).append((p['id'].split(':')[-1],p['known'],p['target'],l.get('is_new')))
    hits=[]
    for r in fixes:
        rid,fam,old,new,why=r[0],r[1],r[2],r[3],r[4] if len(r)>4 else ''
        if fam=='delete' or (new and new[0]):
            key=' '.join(norm(old[0]))
            if key in byk:
                hits.append((rid,fam,old[0],(new[0] if new else 'DELETE'),why[:120],byk[key]))
    res[c]=hits
    from collections import Counter
    print(c,len(hits),Counter(h[1] for h in hits))
json.dump(res,open(f'{S}/w/xfix.json','w'),ensure_ascii=False)
print(len(fixes))
