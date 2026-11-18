import json,re,sys
c=sys.argv[1];hand=set(map(int,sys.argv[2].split(','))) if len(sys.argv)>2 and sys.argv[2] else set()
d=json.load(open(f'../{c}/sheet.json'))
n=lambda t:' '+re.sub(r"[^\w']+",' ',t.lower()).strip()+' '
st={'filled':0,'authored':0,'held':0,'empty_hand':0,'empty_other':0,'en_replaced':0}
for i,l in enumerate(d['lines']):
    if l.get('hold'): st['held']+=1; continue
    if not l.get('known'):
        st['empty_hand' if l['seed'] in hand else 'empty_other']+=1
        if l['seed'] not in hand: print('EMPTY',i,l['lego'])
        continue
    st['filled']+=1
    if l.get('author'): st['authored']+=1
    if l.get('en_was'): st['en_replaced']+=1
    if n(l['lego_en']) not in n(l['en']): print('WORD-BOUNDARY',i,l['lego'],'|',l['lego_en'],'|',l['en'])
print(st)
