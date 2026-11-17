# Eoghan's gle_v2 sheet, rebuilt on the LIVE course after the 17 Nov final pass (cs #445·AI, 17 Nov 2026).
#   curl -s http://localhost:3470/api/production/gle_v2_for_eng/seeds > live.json; python3 -I build.py live.json
# Rows mirror his Bileog1 (../gle-v2-eoghan-excel-2026-11-16/his-bileog1.json). Column C comes ONLY from comments.txt.
# The build FAILS if: a row differing from his line has no entry; an entry was written for Irish that is no longer live;
# a quoted piece is not in his line, ours, a sentence named by number, or our English; a banned word appears.
import json,re,sys,os,csv,zipfile
from xml.sax.saxutils import escape
HERE=os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0,HERE)
from helpers import nrm,options,famonly,fada
live={s['seed_number']:s for s in json.load(open(sys.argv[1]))['seeds']}
his=json.load(open(os.path.join(HERE,'..','gle-v2-eoghan-excel-2026-11-16','his-bileog1.json')))[1:]
SEPT="This already had your September correction (your sheet was written over the older text), so we've kept that."
LATER="We've gone with your later suggestion here."
# Lighter tone (cs #448·AI, Kai 17 Nov 13:31Z): the openness is said ONCE, in this note above the header; rows stay short.
NOTE="Where we've kept ours it's usually to avoid a clash with another sentence, and the note names it. Happy to change any of these another way."
APOLOGY=re.compile(r"\bsorry\b|hope (that|it)|acceptable|happy to change|\{T\}",re.I)
import csv as _csv
BASE={int(x['Seed']):x for x in _csv.DictReader(open(os.path.join(HERE,'..','gle-v2-eoghan-seedlist','irish-seed-list-for-eoghan.csv')))}
C={};cur=None
for ln in open(os.path.join(HERE,'comments.txt'),encoding='utf-8').read().split('\n'):
    if ln.startswith('#'): continue
    m=re.match(r'@(\d+) \| (.*)$',ln)
    if m: cur=int(m.group(1)); C[cur]=[m.group(2).strip(),'']; continue
    if cur is not None and ln.strip() and not C[cur][1]: C[cur][1]=ln.strip()
fnrm=lambda s:fada(nrm(s))
ENGLISH=' '.join(fnrm(s['known_text']) for s in live.values())
PHR=' | '.join(fnrm(p.get('target_text')) for s in live.values() for l in s['legos'] for p in (l.get('basket_phrases') or []))
BANNED=re.compile(r'lego|frame|basket|syllab|\bboth\b|standard|word for word|the english is|\bseeds?\b|\bzut\b|\btiles?\b|translat|\bmeans\b|\bcap\b',re.I)
rows=[];missing=[];stale=[];badq=[];banned=[];cite=[];k=0;cls={}
for r in his:
    n=int(r['A']); s=live[n]; ours=s['target_text']; F=r.get('F',''); opts=options(F)
    if fada(nrm(ours))==fada(nrm(F)) or (opts and fada(nrm(ours))==fada(opts[0])): c='same'
    elif nrm(ours) in opts[1:]: c='option'
    elif famonly(ours,opts[0] if opts else F)[0]: c='fam'
    else: c='diff'
    cls[n]=c; com=''
    if n in C:
        if nrm(C[n][0])!=nrm(ours): stale.append(n)
        com=C[n][1]
    elif c=='diff': missing.append(n)
    if com in ('{SEPT}','{LATER}'):
        b=BASE[n]
        if com=='{SEPT}': ok='September' in b['Why we differ'] and fada(nrm(b['Irish now (our draft)']))==fada(nrm(ours))
        else:
            bo=options(re.sub(r'\([^)]*\)','',b['Your Irish']))   # his later line; our analytic 'muid' forms count as his
            ok=fada(nrm(ours)) in [fada(x) for x in bo] or bool(bo and famonly(ours,bo[0])[0])
        if not ok: badq.append((n,com))
        com=SEPT if com=='{SEPT}' else LATER
    if com:
        if APOLOGY.search(com): banned.append((n,APOLOGY.search(com).group(0)))
        nums=[int(x) for x in re.findall(r'\b(\d{1,3})\b',com) if int(x) in live and int(x)!=n]
        pool=[fnrm(F),fnrm(ours)]+[fnrm(live[x]['target_text']) for x in nums]
        frags=[fnrm(x) for q in re.findall(r'‘([^’]*)’',com) for x in q.split('…') if fnrm(x)]
        for f in frags:
            if not any(f in p for p in pool) and f not in ENGLISH: badq.append((n,f))
        for x in nums:
            if not any(f in fnrm(live[x]['target_text']) for f in frags): cite.append((n,x))
        if BANNED.search(com): banned.append((n,BANNED.search(com).group(0)))
    rows.append((n,ours,s['known_text'],com,c))
assert not stale,('entry written for Irish no longer live',stale)
assert os.environ.get('PARTIAL') or not missing,('rows differing from his line with no entry',missing)
assert not badq,('quoted pieces not found',badq)
assert not banned,('banned words',banned)
assert not BANNED.search(NOTE)
if cite: print('WARN cited sentence holds none of the quotes:',cite)
from collections import Counter
print('rows',len(rows),'commented',sum(1 for x in rows if x[3]),'blank',sum(1 for x in rows if not x[3]),Counter(cls.values()))
print('diff rows left blank:',sum(1 for x in rows if not x[3] and x[4]=='diff'))
json.dump([dict(seed=n,irish=a,english=b,comment=c,cls=z) for n,a,b,c,z in rows],open(os.path.join(HERE,'sheet-rows.json'),'w'),ensure_ascii=False,indent=0)
H=['Seed','Gaeilge (anois)','English','Ár nóta / Our comment','Do thuairimí / Your comments']
col=lambda i:chr(65+i)
def cell(ci,ri,v,st): return f'<c r="{col(ci)}{ri}" t="inlineStr" s="{st}"><is><t xml:space="preserve">{escape(str(v))}</t></is></c>'
sh=['<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="2" topLeftCell="A3" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="1" width="6" customWidth="1"/><col min="2" max="3" width="45" customWidth="1"/><col min="4" max="4" width="70" customWidth="1"/><col min="5" max="5" width="40" customWidth="1"/></cols><sheetData>']
sh.append('<row r="1" ht="32" customHeight="1">'+cell(0,1,NOTE,5)+'</row>')
sh.append('<row r="2">'+''.join(cell(i,2,h,1) for i,h in enumerate(H))+'</row>')
for ri,(n,a,b,c,_) in enumerate(rows,3):
    st=2 if c else 3
    sh.append(f'<row r="{ri}"><c r="A{ri}" s="{st}"><v>{n}</v></c>'+cell(1,ri,a,st)+cell(2,ri,b,st)+(cell(3,ri,c,st) if c else '')+f'<c r="E{ri}" s="4"/></row>')
sh.append('</sheetData><mergeCells count="1"><mergeCell ref="A1:E1"/></mergeCells></worksheet>')
styles='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF2A8"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEAF4FF"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="6"><xf/><xf fontId="1" applyFont="1"><alignment wrapText="1" vertical="top"/></xf><xf fillId="2" applyFill="1"><alignment wrapText="1" vertical="top"/></xf><xf><alignment wrapText="1" vertical="top"/></xf><xf fillId="3" applyFill="1"><alignment wrapText="1" vertical="top"/></xf><xf fontId="1" applyFont="1"><alignment wrapText="1" vertical="center"/></xf></cellXfs></styleSheet>'
out=os.path.join(os.environ.get('OUT_DIR',HERE),'gle-v2-sheet-for-eoghan-17nov.xlsx')
z=zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED)
z.writestr('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>')
z.writestr('_rels/.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')
z.writestr('xl/workbook.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Bileog1" sheetId="1" r:id="rId1"/></sheets></workbook>')
z.writestr('xl/_rels/workbook.xml.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>')
z.writestr('xl/styles.xml',styles); z.writestr('xl/worksheets/sheet1.xml',''.join(sh)); z.close()
print('wrote',out)
