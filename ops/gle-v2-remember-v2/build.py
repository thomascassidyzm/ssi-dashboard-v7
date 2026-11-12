# Rebuilds proposal.json for the gle_v2_for_eng "remember" family, second pass (job #426, read-only; nothing applied).
# Input: argv[1] = the JSON from Popty GET /api/production/gle_v2_for_eng/seeds (read 2026-11-12, after #403's K1-K14).
# Two options are carried. A (recommended): keep 'cuimhneamh ar' - no rows change. B: Eoghan's own form,
# 'cuimhneamh a dhéanamh ar', wherever a THING is remembered - every row's proposed text is in 'option_b'.
# Row lists come from the live read; the SEEDS / LEGOS / SPECIAL tables below are hand-written judgement.
import json,re,sys,csv,os
d=json.load(open(sys.argv[1]))['seeds']
here=os.path.dirname(os.path.abspath(__file__))
eo={int(r['Seed']):r for r in csv.DictReader(open(os.path.join(here,'..','gle-v2-eoghan-seedlist','irish-seed-list-for-eoghan.csv')))}
rx=re.compile(r'remember|cuimh|meabh',re.I)
PREP=r'(ar|air|uirthi|orthu|orm|ort|orainn|oraibh)'
def b_form(t):
    """Eoghan's form: put 'a dhéanamh' between cuimhneamh and its preposition. Every result was read."""
    return re.sub(r'(?i)\b(cuimhneamh)( go cúramach)? '+PREP+r'\b',lambda m:f"{m.group(1)} a dhéanamh{m.group(2) or ''} {m.group(3)}",t)
ORIG={6:"Tá mé ag triail focal a chuimhneamh",10:"Níl mé cinnte an féidir liom an abairt iomlán a chuimhneamh",24:"Ní bheidh mé ábalta cuimhneamh go héasca",
 56:"mar sin is féidir liom cuimhneamh conas cúpla focal a rá",57:"Ní féidir liom cuimhneamh conas a rá cad a bhí mé ag iarraidh a rá",
 113:"Cén fáth nach féidir liom cuimhneamh ar cad a dúirt tú?",232:"Tá aithne agam ar sheanbean a bhfuil an freagra ar cuimhin léi"}  # gle_for_eng, live read 2026-11-12
SEEDS_B={  # seed -> (option B Irish, note)
 6:("Tá mé ag iarraidh cuimhneamh a dhéanamh ar fhocal","Eoghan's form without 'ar leith' (English has no 'particular'). 'a dhéanamh' is first taught at seed 7, so at seed 6 it lives inside one chunk."),
 10:("Níl mé cinnte an féidir liom cuimhneamh a dhéanamh ar an abairt iomlán","Eoghan's form; 'abairt' kept (English says 'sentence')."),
 24:("Ní bheidh mé in ann cuimhneamh a dhéanamh air sin go héasca","Eoghan's 'cuimhneamh a dhéanamh air sin' inside our sentence shape. LEGO must be re-cut (8-syllable cap)."),
 56:(None,"UNCHANGED in both options: no 'ar' here (cuimhneamh + 'conas' clause). Eoghan's 'is cuimhin liom' drops 'can' and evicts S0056L01 'so that I can | mar sin is féidir liom'."),
 57:(None,"UNCHANGED in both options: no 'ar' here. Eoghan's version drops 'how to say' (needs the English changed)."),
 113:("Cén fáth nach féidir liom cuimhneamh a dhéanamh ar an rud a dúirt tú?","Eoghan's wording exactly. LEGO must be re-cut (8-syllable cap)."),
 232:("Tá aithne agam ar sheanbean a bheidh in ann cuimhneamh a dhéanamh ar an bhfreagra","Eoghan's wording exactly. LEGO must be re-cut (8-syllable cap)."),
}
LEGOS_B={
 'S0006L02':{'action':'retext','known':'to remember','target':'cuimhneamh a dhéanamh ar','components':[{'known':'remembering','target':'cuimhneamh'},{'known':'to do','target':'a dhéanamh'},{'known':'on','target':'ar'}],'note':'7 by the builder estimate; under the cap of 8.'},
 'S0024L02':{'action':'recut','known':'to remember that','target':'cuimhneamh a dhéanamh air sin','components':[{'known':'remembering','target':'cuimhneamh'},{'known':'to do','target':'a dhéanamh'},{'known':'on that','target':'air sin'}],'add_lego':{'lego':'S0024L03','known':'easily','target':'go héasca'},'note':"'cuimhneamh a dhéanamh air sin go héasca' estimates 11 syllables (cap 8), so 'easily | go héasca' becomes its own LEGO. Basket phrases keep their sentences."},
 'S0113L03':{'action':'recut','known':'what you said','target':'an rud a dúirt tú','components':[{'known':'the thing that','target':'an rud a'},{'known':'you said','target':'dúirt tú'}],'note':"With 'a dhéanamh' the LEGO estimates 12 syllables (cap 8; it already estimates 9 today). 'remember' is carried by S0006L02. Basket phrases keep their sentences."},
 'S0232L05':{'action':'delete_or_not_new','note':"'cuimhneamh a dhéanamh ar an bhfreagra' estimates 11 syllables (cap 8). Both halves are already taught (S0006L02 remember, S0027L04 / S0066L03 answer), so this LEGO has nothing new left; its basket phrases can move to S0232L03 or go with it. Applier to settle with Kai."},
}
SPECIAL={  # phrase -> ('keep'|'delete'|'hold', note) overriding the mechanical rule in option B
 'S0208L02U06':('keep',"'ar chor ar bith' is 'at all', not the preposition of remember: no change."),
 'S0113L03U03':('delete',"progressive 'ag cuimhneamh ar': Eoghan's form would need 'ag déanamh cuimhnimh ar', which he never wrote. No precedent, so delete."),
 'S0114L06U06':('delete',"progressive 'ag cuimhneamh ar focail' (also unlenited): same as S0113L03U03."),
 'S0288L03U13':('hold',"'cuimhneamh ar cé mhéad…' is remember + a question clause; no Eoghan precedent for 'a dhéanamh ar' before a question word. Hold for Eoghan."),
 'S0064L01U07':('fix',"'cúpla focal cuimhneamh' is the old object-first form Eoghan removed; becomes 'cuimhneamh a dhéanamh ar chúpla focal' (option A: 'cuimhneamh ar chúpla focal')."),
}
out={'course':'gle_v2_for_eng','job':'#426','read_at':'2026-11-12','applied':False,
 'recommended':'A','options':{'A':"Keep 'cuimhneamh ar'. No row changes.",'B':"Eoghan's 'cuimhneamh a dhéanamh ar' wherever a thing is remembered; bare 'cuimhneamh' rows and 'cuimhneamh conas…' rows unchanged."},
 'seeds':[],'legos':[],'phrases':[]}
cnt={'b_update':0,'b_delete':0,'b_hold':0,'b_keep':0}
for s in d:
    n=s['seed_number']
    if rx.search(s['known_text']+' '+s['target_text']):
        e=eo.get(n,{}); p=SEEDS_B[n]
        out['seeds'].append({'seed':n,'english':s['known_text'],'ours':s['target_text'],'original_gle_for_eng':ORIG[n],
          'eoghan_english':(e.get('Your English (only if different)') or '').strip() or None,'eoghan':e.get('Your Irish'),
          'option_a':s['target_text'],'option_b':p[0] or s['target_text'],'b_changes':bool(p[0]) and p[0]!=s['target_text'],'note':p[1]})
    for l in s.get('legos') or []:
        if rx.search(l['known_text']+' '+l['target_text']):
            out['legos'].append({'lego':l['lego_id'],'known':l['known_text'],'target':l['target_text'],'components':l.get('components'),
              'phrases_in_basket':len(l.get('basket_phrases') or []),'option_a':'keep','option_b':LEGOS_B[l['lego_id']]})
        for ph in l.get('basket_phrases') or []:
            if not rx.search((ph.get('known_text') or '')+' '+(ph.get('target_text') or '')): continue
            k=ph['id'].split(':')[1]; t=ph['target_text']; row={'phrase':k,'role':ph.get('phrase_role'),'known':ph['known_text'],'target':t,'option_a':'keep'}
            sp=SPECIAL.get(k)
            if sp and sp[0] in('keep','delete','hold'): row['option_b']={'action':sp[0],'note':sp[1]}
            elif k=='S0064L01U07': row['option_b']={'action':'update','target':'níl sé éasca cuimhneamh a dhéanamh ar chúpla focal','note':sp[1]}
            elif ph.get('phrase_role')=='component': row['option_b']={'action':'delete','note':'word tile of a LEGO that option B re-cuts; regenerated from the new components.'}
            elif re.search(r'(?i)iarracht a dhéanamh cuimhneamh '+PREP+r'\b',t):
                row['option_b']={'action':'hold','target':b_form(t),'note':"doubles 'a dhéanamh' (iarracht a dhéanamh cuimhneamh a dhéanamh ar…): clumsy; reword or delete, applier to settle with Kai."}
            else:
                nt=b_form(t)
                row['option_b']={'action':'update','target':nt} if nt!=t else {'action':'keep'}
            cnt['b_'+row['option_b']['action']]+=1
            out['phrases'].append(row)
out['counts']={'seeds':len(out['seeds']),'legos':len(out['legos']),'phrases':len(out['phrases']),
 'option_a':{'seeds_changed':0,'legos_changed':0,'phrases_changed':0},
 'option_b':{'seeds_changed':sum(1 for s in out['seeds'] if s['b_changes']),'legos_retexted':1,'legos_recut':2,'legos_deleted_or_not_new':1,'legos_added':1,
   'phrases_updated':cnt['b_update'],'phrases_deleted':cnt['b_delete'],'phrases_held':cnt['b_hold'],'phrases_unchanged':cnt['b_keep'],'seeds_rehomed':0}}
json.dump(out,open(os.path.join(here,'proposal.json'),'w'),ensure_ascii=False,indent=1)
print(json.dumps(out['counts'],indent=1))
for r in out['phrases']:
    if r['option_b']['action']!='keep': print(r['phrase'],r['option_b']['action'],'|',r['target'],'=>',r['option_b'].get('target',''))
