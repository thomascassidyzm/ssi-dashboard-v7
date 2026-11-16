# For seeds past 300 (no LEGOs yet): which taught pieces (new LEGOs, seeds 1-300) the new Irish leaves out although the
# English says them, i.e. where the learner would meet a second Irish for an English they already have.
import sys,json,re; from lib import *
S=load(sys.argv[1]); plan=json.load(open('batch-E.ops.json'))
L=[(l['known_text'].lower().strip('?. '),l['target_text']) for n in range(1,301) for l in S[n]['legos'] if l['is_new']]
for o in plan['ops']:
    n=o['seed_number']; en=' '+re.sub(r"[^\w' ]",' ',S[n]['known_text'].lower())+' '; old=S[n]['target_text']; new=o['set'].get('target_text',old)
    hits=sorted({(k,t) for k,t in L if len(k)>3 and ' '+k+' ' in en and contains(old,t) and not contains(new,t)},key=lambda x:-len(x[0]))
    if hits: print(n,'|',S[n]['known_text'],'|',new,'\n   ',hits[:4])
