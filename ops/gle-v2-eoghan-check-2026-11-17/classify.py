# gle_v2 Eoghan sheet FULL CHECK (cs #450·AI, 17 Nov 2026). Classifies every row of Eoghan's returned sheet against LIVE.
#   curl -s http://localhost:3470/api/production/gle_v2_for_eng/seeds > live.json ; python3 -I classify.py live.json
# HIS LINE, per row:
#   seeds 1-500, 668: his own workbook, sheet Bileog1 (saved by him 3 Nov; ../gle-v2-eoghan-excel-2026-11-16/his-bileog1.json
#                     is a cell-for-cell dump of it). C = our line as sent, F = his line, G = his note.
#   seeds 501-667:    he had not reached these on 3 Nov (F repeats C). His completed sheet was uploaded 9 Nov and is no longer
#                     on disk; the only copy of his column is the 10 Nov transcript, 'Your Irish' in
#                     ../gle-v2-eoghan-seedlist/base-2026-11-10.csv. That transcript equals his workbook on all of 1-500.
import json,re,sys,os,csv
HERE=os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0,os.path.join(HERE,'..','gle-v2-eoghan-sheet-2026-11-17'))
from helpers import nrm,options,famonly,fada
live={s['seed_number']:s for s in json.load(open(sys.argv[1]))['seeds']}
his={int(r['A']):r for r in json.load(open(os.path.join(HERE,'..','gle-v2-eoghan-excel-2026-11-16','his-bileog1.json')))[1:]}
base={int(r['Seed']):r for r in csv.DictReader(open(os.path.join(HERE,'..','gle-v2-eoghan-seedlist','base-2026-11-10.csv')))}
f=lambda s:fada(nrm(s))
SYN1X={'táim':'tá mé','nílim':'níl mé','nílím':'níl mé','atáim':'atá mé','bhfuilim':'bhfuil mé','táimid':'tá muid','táímid':'tá muid','nílimid':'níl muid'}
def tight(s):
    # letters only, fadas folded, his bracketed notes dropped, táim-type forms written as two words: for 'is it the same line?'
    s=re.sub(r'\([^)]*\)?','',re.sub(r'\[[^\]]*\]','',s or ''))
    return ''.join(fada(' '.join(SYN1X.get(w,w) for w in nrm(s).split())).split())
def hopts(H):
    o=[tight(x) for x in re.split(r'\s/\s|\s/(?=\S)',H) if tight(x)]
    o+= [tight(x) for x in re.findall(r'([^()]+)\(',H)]   # 'X (gloss) Y (gloss)'
    return o or [tight(H)]
strip_note=lambda t:re.sub(r'\s*\[note:.*$','',t or '')
rows=[]
for n in sorted(his):
    r=his[n]; sent=r['C']; src='workbook'
    H=r.get('F','')
    if 501<=n<=667: H=strip_note(base[n]['Your Irish']); src='10 Nov transcript'
    hisEn=r.get('E','') if src=='workbook' else (base[n]['Your English (only if different)'] or r['B'])
    L=live[n]['target_text']; opts=options(H) or [nrm(H)]
    made = tight(sent) not in hopts(H)[:1]   # he changed the Irish
    fadaonly = False
    if tight(L) in hopts(H): c='TAKEN' if made else 'NA'
    elif not made: c='NA' if tight(L)==tight(sent) else 'NA-CHANGED'
    else:
        fam=famonly(L,opts[0])[0]
        hs,ss,ls=set(fada(opts[0]).split()),set(f(sent).split()),set(f(L).split())
        add=hs-ss; rem=ss-hs
        adopted=len(add&ls)+len(rem-ls); total=len(add)+len(rem)
        if fam: c='TAKEN-FORM'            # his line, written with our tá mé / muid forms
        elif tight(L)==tight(sent): c='KEPT'
        elif adopted==0: c='KEPT-CHANGED'  # not his line and not the line he saw
        else: c='PARTLY'
    rows.append(dict(seed=n,cls=c,src=src,sent=sent,his=H,his_note=r.get('G',''),his_en=hisEn,live=L,live_en=live[n]['known_text'],sent_en=r['B']))
json.dump(rows,open(os.path.join(HERE,'classified.json'),'w'),ensure_ascii=False,indent=0)
from collections import Counter
print(Counter(x['cls'] for x in rows))
print('calibration',[(x['seed'],x['cls']) for x in rows if x['seed'] in (98,111,465)])
