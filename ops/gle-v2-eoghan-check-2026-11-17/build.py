# Corrected sheet for Eoghan (cs #450·AI, 17 Nov 2026).  python3 -I classify.py live.json && python3 -I build.py live.json
# Yellow = live still differs from his line (or from the line he passed unchanged). TAKEN / no-suggestion rows: blank, no yellow.
import json,re,sys,os,zipfile
from xml.sax.saxutils import escape
HERE=os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0,HERE); sys.path.insert(0,os.path.join(HERE,'..','gle-v2-eoghan-sheet-2026-11-17'))
from helpers import nrm,fada
from shared import reasons
from decisions import *
live={s['seed_number']:s for s in json.load(open(sys.argv[1]))['seeds']}
rows=json.load(open(os.path.join(HERE,'classified.json')))
C448={int(k):v for k,v in json.load(open(os.path.join(HERE,'c448.json'))).items()}
NOTE="Yellow rows are where our line still differs from yours. Where we've kept ours it's usually so it matches another sentence, and the note names it; happy to change any of these another way. A yellow row with no note has the same reason as an earlier row. We write ‘tá mé’ / ‘níl mé’ and the verb with ‘muid’ throughout, so rows where that is the only difference are not marked."
BANNED=re.compile(r'lego|frame|basket|syllab|standard|word for word|\bseeds?\b|\bzut\b|\btiles?\b|translat|\bmeans\b|\bcap\b|sorry|hope (that|it)|acceptable|september|later suggestion|gave us later|\{',re.I)
fn=lambda s:fada(nrm(s))
ENG=' '.join(fn(s['known_text']) for s in live.values())
out=[];bad=[];unshared=[]
for x in rows:
    n=x['seed']; c=x['cls']
    if n in TIDY: g='TAKEN'; sub='his slip tidied'
    elif n in TAKEN_OPTION: g='TAKEN'; sub='a form he gave'
    elif n in NO_SUGGESTION: g='NA'; sub=''
    elif n in GAP: g='GAP'; sub=''
    elif c=='TAKEN': g='TAKEN'; sub='exact'
    elif c=='TAKEN-FORM': g='TAKEN'; sub='tá mé / muid form'
    elif c=='NA': g='NA'; sub=''
    elif c=='NA-CHANGED': g='NA-CHANGED'; sub=''
    elif c=='PARTLY': g='PARTLY'; sub=''
    else: g='KEPT'; sub=''
    yellow=g in ('PARTLY','KEPT','NA-CHANGED')
    com=''
    if yellow:
        com=NEW[n] if n in NEW else (C448.get(n,'') if n<=500 else '')
        if com.startswith('{'): com=''
        if not com:
            sh=SHARED.get(n)
            if sh is None:
                r=sorted(reasons(x['live'],x['his']))
                sh=(529 if r and r[0]==14.5 else int(r[0])) if r else None
            if sh is None or (sh and sh>=n): unshared.append(n)
            x['shared_with']=sh
        else:
            if BANNED.search(com): bad.append((n,'banned',BANNED.search(com).group(0)))
            nums=[int(z) for z in re.findall(r'\b(\d{1,3})\b',com) if int(z) in live and int(z)!=n]
            pool=[fn(x['his']),fn(x['live'])]+[fn(live[z]['target_text']) for z in nums]
            for q in re.findall(r'‘([^’]*)’',com):
                for f in [fn(p) for p in q.split('…') if fn(p)]:
                    if not any(f in p for p in pool) and f not in ENG: bad.append((n,'quote not found',q))
    x.update(group=g,sub=sub,yellow=yellow,comment=com); out.append(x)
for x in out:   # a shared pointer must land on a row that carries a note (0 = top note)
    sh=x.get('shared_with')
    if sh: 
        t=[y for y in out if y['seed']==sh][0]
        if not t['comment']: bad.append((x['seed'],'shared reason points at a row with no note',sh))
assert not unshared,('yellow rows with no note and no earlier reason',unshared)
assert not bad,bad
assert not BANNED.search(NOTE.replace('later',''))
from collections import Counter
print(Counter(x['group'] for x in out)); print(Counter(x['sub'] for x in out if x['group']=='TAKEN'))
print('yellow',sum(x['yellow'] for x in out),'with note',sum(1 for x in out if x['comment']))
json.dump(out,open(os.path.join(HERE,'sheet-rows.json'),'w'),ensure_ascii=False,indent=0)
H=['Seed','Gaeilge (anois)','English','Ár nóta / Our comment','Do thuairimí / Your comments']
col=lambda i:chr(65+i)
def cell(ci,ri,v,st): return f'<c r="{col(ci)}{ri}" t="inlineStr" s="{st}"><is><t xml:space="preserve">{escape(str(v))}</t></is></c>'
sh=['<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="2" topLeftCell="A3" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="1" width="6" customWidth="1"/><col min="2" max="3" width="45" customWidth="1"/><col min="4" max="4" width="70" customWidth="1"/><col min="5" max="5" width="40" customWidth="1"/></cols><sheetData>']
sh.append('<row r="1" ht="64" customHeight="1">'+cell(0,1,NOTE,5)+'</row>')
sh.append('<row r="2">'+''.join(cell(i,2,h,1) for i,h in enumerate(H))+'</row>')
for ri,x in enumerate(out,3):
    st=2 if x['yellow'] else 3
    sh.append(f'<row r="{ri}"><c r="A{ri}" s="{st}"><v>{x["seed"]}</v></c>'+cell(1,ri,x['live'],st)+cell(2,ri,x['live_en'],st)+(cell(3,ri,x['comment'],st) if x['comment'] else f'<c r="D{ri}" s="{st}"/>')+f'<c r="E{ri}" s="4"/></row>')
sh.append('</sheetData><mergeCells count="1"><mergeCell ref="A1:E1"/></mergeCells></worksheet>')
src=zipfile.ZipFile(os.path.join(HERE,'..','gle-v2-eoghan-sheet-2026-11-17','gle-v2-sheet-for-eoghan-17nov.xlsx'))
outp=os.path.join(os.environ.get('OUT_DIR',HERE),'gle-v2-sheet-for-eoghan-checked.xlsx')
z=zipfile.ZipFile(outp,'w',zipfile.ZIP_DEFLATED)
for i in src.infolist():
    z.writestr(i.filename, ''.join(sh) if i.filename=='xl/worksheets/sheet1.xml' else src.read(i.filename))
z.close(); print('wrote',outp)
