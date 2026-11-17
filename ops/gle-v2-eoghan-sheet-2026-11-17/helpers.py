import re
nrm=lambda s:' '.join(re.sub(r"[^\w ]",'',(s or '').lower().replace('’',"'")).split())
def options(t):
    t=re.sub(r'\[[^\]]*\]','',t or '')
    t=re.sub(r'\((?=[^)]*\b(?:means|is|=|more|ne|on her|she and|sport|the person|buartha|sásta|nóiméad|Ní raibh)\b)[^)]*\)?','',t)   # his notes in brackets
    return [nrm(x) for x in re.split(r'\s/\s|\s/(?=\S)',t) if nrm(x)]
SYN1={'táim':('tá','mé'),'nílim':('níl','mé'),'nílím':('níl','mé'),'atáim':('atá','mé'),'bhfuilim':('bhfuil','mé'),'táimid':('tá','muid'),'táímid':('tá','muid'),'nílimid':('níl','muid')}
SYN=re.compile(r'(.+?)(aíomar|íomar|eamar|amar|omar|aímid|ímid|aimid|imid|aimis|imis)$')
ANA=re.compile(r'(.+?)(idh|adh|eadh|dh|aíonn|íonn|ann|eann)$')
fada=lambda t:t.translate(str.maketrans('áéíóú','aeiou'))
skel=lambda t:re.sub(r'[aeiou]','',fada(t))
def famonly(ours,histext):
    """True when his line becomes ours by writing his synthetic verb forms analytically (fadas aside): (only, used)."""
    a=nrm(ours).split(); b=nrm(histext).split(); i=j=0; used=False
    while i<len(a) and j<len(b):
        x,y=a[i],b[j]
        if fada(x)==fada(y): i+=1; j+=1; continue
        if y in SYN1 and i+1<len(a) and (x,a[i+1])==SYN1[y]: i+=2; j+=1; used=True; continue
        m=SYN.match(y)
        if m and i+1<len(a) and a[i+1]=='muid':
            n=ANA.match(x); xs=n.group(1) if n else x
            if skel(xs)==skel(m.group(1)): i+=2; j+=1; used=True; continue
        return False,False
    return (i==len(a) and j==len(b) and used),used
