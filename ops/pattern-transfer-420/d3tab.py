import csv, sys, re, collections, json
course=sys.argv[1]; lang=course.split('_for')[0]
FORMS={'fra':{'le/l\'':r"\b(le|l')\b|\ble\b", 'ça':r"\bça\b", 'cela':r"\bcela\b", 'ceci':r"\bceci\b"},
 'spa':{'lo':r"\blo\b|[aeiíáé]r(?:lo|los)\b|[aeiouáéíóú]ndo(?:lo)\b|(?:ha|hé|he|ga|ca|ce|ci|te|me|se|ra|rá|ré|re|ré|ía|ya|ga|ta|da)lo\b", 'eso':r"\beso\b", 'esto':r"\besto\b", 'ello':r"\bello\b", 'aquello':r"\baquello\b"},
 'por':{'o/-lo':r"\bo\b|-lo\b|-la\b|\blo\b", 'isso':r"\bisso\b", 'isto':r"\bisto\b", 'aquilo':r"\baquilo\b"},
 'por_br':{'o/-lo':r"\bo\b|-lo\b|-la\b|\blo\b", 'isso':r"\bisso\b", 'isto':r"\bisto\b", 'aquilo':r"\baquilo\b"},
 'deu':{'es':r"\bes\b", 'das':r"\bdas\b", 'dies':r"\bdies\b", 'davon/darüber/daran':r"\bda(von|rüber|ran|rauf|zu|mit|für)\b"},
 'ita':{'lo':r"\b(lo|l')\b|rlo\b|rmelo|rtelo|rcelo|rglielo|rselo|dirlo|farlo|saperlo|capirlo", 'quello':r"\bquello\b", 'questo':r"\bquesto\b", 'ciò':r"\bciò\b"},
 'fin':{'sen/sitä/se':r"\b(sen|sitä|se|siitä|siihen)\b", 'tuo/toi':r"\b(tuo|toi|tuon|tota|tuota|sitä)\b", 'tämä/tää':r"\b(tämä|tää|tämän|tätä|tän)\b", 'niin':r"\bniin\b"},
 'ara':{'ه/ها (suffix)':r"(ه|ها)\b", 'ذلك/هذا':r"(ذلك|هذا|هذه|ذاك)", 'كذلك':r"كذلك"},
 'zho':{'它':r"它", '那/那个':r"那", '这/这个':r"这", '这样/那样/这么/那么':r"(这样|那样|这么|那么)"},
 'jpn':{'それ':r"それ", 'これ':r"これ", 'そう':r"そう", 'こう':r"こう", 'あれ':r"あれ"},
 'kor':{'그것/그거':r"(그것|그거|그걸|그게)", '이것/이거':r"(이것|이거|이걸|이게)", '그렇게':r"그렇게", '이렇게':r"이렇게", '그렇다':r"그렇"}}
forms=FORMS[lang]
rows=list(csv.DictReader(open(f'cand/{course}/D3_say_it_that_this.tsv'),delimiter='\t'))
def cls(t):
    hit=[k for k,p in forms.items() if re.search(p,t.lower())]
    return '+'.join(hit) if hit else '(none of the listed forms)'
tab=collections.Counter()
for r in rows:
    r['form']=cls(r['target']); tab[(r['pronoun'],r['form'])]+=1
# majority form per English pronoun
maj={}
for pr in ('it','that','this'):
    c={f:n for (p,f),n in tab.items() if p==pr}
    if c: maj[pr]=max(c,key=c.get)
out=[]
for r in rows:
    r['majority_form_for_this_pronoun']=maj.get(r['pronoun'],'')
    r['minority']='MINORITY' if r['form']!=maj.get(r['pronoun']) else ''
    out.append(r)
with open(f'cand/{course}/D3_say_it_that_this.tsv','w',newline='') as f:
    w=csv.DictWriter(f,fieldnames=['seed','row','verb','pronoun','form','majority_form_for_this_pronoun','minority','english','target'],delimiter='\t',lineterminator='\n'); w.writeheader(); w.writerows(out)
summary={'rows':len(rows),'table':{f'{p} -> {fm}':n for (p,fm),n in sorted(tab.items())},'majority':maj,'minority_rows':sum(1 for r in out if r['minority'])}
json.dump(summary,open(f'cand/{course}/D3_summary.json','w'),ensure_ascii=False,indent=1)
print(course, json.dumps(summary,ensure_ascii=False))
