import json,re,sys,unicodedata,collections
from pypinyin import pinyin, Style
from pypinyin.contrib.tone_convert import to_normal
D=json.load(open(sys.argv[1])); S=json.load(open(sys.argv[2]))['seeds']
HAN=re.compile(r'[㐀-鿿]')
def strip_tone(s): return ''.join(c for c in unicodedata.normalize('NFD',s) if not unicodedata.combining(c)).replace('ü','v')
def norm_roman(r, tones=True):
    r=unicodedata.normalize('NFC',r.lower())
    r=''.join(c for c in r if c.isalpha() and not HAN.match(c))
    return r if tones else strip_tone(r)
def cands(ch, tones):
    ps=pinyin(ch,style=Style.TONE,heteronym=True)[0]
    out=set()
    if ch=='儿': out.add('r')
    for p in ps:
        p=p.lower(); out.add(p if tones else strip_tone(p))
        if tones: out.add(strip_tone(p).replace('v','ü'))  # neutral tone allowed
    if tones and ch=='一': out|={'yí','yì','yī'}
    if tones and ch=='不': out|={'bú','bù','bu'}
    return out
def match(text, roman, tones):
    chars=[c for c in text if HAN.match(c)]
    extra=''.join(c.lower() for c in text if c.isascii() and c.isalpha())
    r=norm_roman(roman,tones)
    if tones: r=r.replace('v','ü')
    if extra: return None  # latin letters in target, skip
    from functools import lru_cache
    C=[cands(c,tones) for c in chars]
    @lru_cache(None)
    def f(i,j):
        if i==len(chars): return j==len(r)
        return any(r.startswith(c,j) and f(i+1,j+len(c)) for c in C[i])
    return f(0,0)
if __name__=='__main__':
    rows=[]
    for s in S: rows.append(('seed',str(s['seed_number']),s['seed_number'],s['target_text'],s.get('target_text_roman'),s.get('last_edit_event_id'),s.get('updated_at')))
    for l in D['legos']: rows.append(('lego',l['lego_id'],l['seed_number'],l['target_text'],l.get('target_text_roman'),l.get('last_edit_event_id'),l.get('updated_at')))
    for p in D['phrases']: rows.append(('phrase',p['id'],p['seed_number'],p['target_text'],p.get('target_text_roman'),p.get('last_edit_event_id'),p.get('updated_at')))
    res=collections.Counter(); out=[]
    for kind,id_,sn,t,r,ev,up in rows:
        if not r: res[kind,'missing']+=1; continue
        a=match(t,r,False)
        if a is None: res[kind,'latin']+=1; continue
        if not a: res[kind,'STALE']+=1; out.append(dict(kind=kind,id=id_,seed=sn,target=t,roman=r,ev=ev,updated=up,cls='chars')); continue
        b=match(t,r,True)
        if not b: res[kind,'tone']+=1; out.append(dict(kind=kind,id=id_,seed=sn,target=t,roman=r,ev=ev,updated=up,cls='tone')); continue
        res[kind,'ok']+=1
    for k in sorted(res): print(k,res[k])
    json.dump(out,open(sys.argv[3],'w'),ensure_ascii=False,indent=0)
