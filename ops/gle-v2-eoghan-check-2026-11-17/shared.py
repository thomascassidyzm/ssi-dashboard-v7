# Which already-given reason covers a row that differs from his line but carries no note of its own.
import re,sys
sys.path.insert(0,'../gle-v2-eoghan-sheet-2026-11-17')
from helpers import nrm,fada,SYN1
def toks(s):
    s=re.sub(r'\([^)]*\)?','',re.sub(r'\[[^\]]*\]','',s or '')); o=[]
    for w in nrm(s).split(): o+= list(SYN1[w]) if w in SYN1 else [w]
    return [fada(w) for w in o]
SYNV=re.compile(r'(amar|omar|imid|aimid|imis|aimis|adar|finid)$')
def reasons(L,H):
    l,h=toks(L),toks(H); ls,hs=set(l),set(h); R=set()
    if 'ullamh' in hs and 'reidh' in ls: R.add(26)
    if 'a' in hs-ls|hs and re.search(r'\bá\b',nrm(H)) and (hs&{'agat','agam','aige','aici','agaibh','againn','acu'}) and 'ag' in ls and not re.search(r'\bá\b',nrm(L)): R.add(14)
    if 'chun' in ls and 'chun' not in hs and l[0] in ('ta','nil','an','cad','chuala','ta,'): R.add(5)
    if 'cuimhneamh' in ls and 'dheanamh' in hs and 'dheanamh' not in ls: R.add(6)
    if ('mhaith' in hs or 'maith' in hs) and ('mian' in ls or 'mhian' in ls) and not ('mian' in hs or 'mhian' in hs): R.add(81)
    if 'fonn' in hs and ('mian' in ls or 'mhian' in ls): R.add(35)
    if (hs&{'iarraidh','theastaigh','theastaionn','intinn'}) and ('mian' in ls or 'mhian' in ls) and not (ls&{'iarraidh','intinn'}): R.add(34)
    if 'rud' in hs and 'rud' not in ls and 'cad' in ls: R.add(57)
    if (('uile' in hs) or ('leir' in hs)) and 'fad' in ls: R.add(14.5)
    if 'ud' in hs and 'sin' in ls: R.add(388)
    if 'de' in ls and 'de' not in hs and 'ar' in hs: R.add(316)
    if any(SYNV.search(w) for w in hs-ls) and (ls&{'muid','siad'}): R.add(0)
    if ('beagainin' in hs) and 'beagan' in ls: R.add(39)
    if 'mhian' in hs and 'mian' in ls and ('ni' in ls or 'nach' in ls): R.add(19)
    return R
