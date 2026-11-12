# Rebuilds proposal.json for the gle_v2_for_eng "remember" family (job #410, read-only proposal; nothing applied).
# Input: argv[1] = the JSON from Popty GET /api/production/gle_v2_for_eng/seeds (read 2026-11-12).
# The proposals and side findings below are hand-written judgement; the row lists are pulled from the live read.
import json,re,sys,csv,os
d=json.load(open(sys.argv[1]))['seeds']
here=os.path.dirname(os.path.abspath(__file__))
eo={int(r['Seed']):r for r in csv.DictReader(open(os.path.join(here,'..','gle-v2-eoghan-seedlist','irish-seed-list-for-eoghan.csv')))}
rx=re.compile(r'remember|cuimh',re.I)
SEEDS={  # seed -> (proposed Irish, proposed English or None, note)
 6:("Tá mé ag iarraidh cuimhneamh ar fhocal",None,"KEEP. 'trying' is S0002L01 ag iarraidh (Eoghan's own form at seed 2); lightest form that carries 'trying to remember'."),
 10:("Níl mé cinnte an féidir liom cuimhneamh ar an abairt iomlán",None,"KEEP. Needs a verbal noun after 'an féidir liom'."),
 24:("Ní bheidh mé ábalta cuimhneamh air sin go héasca",None,"KEEP. Needs a verbal noun after 'ábalta'."),
 56:("mar sin is féidir liom cuimhneamh conas cúpla focal a rá",None,"KEEP (recommended). Eoghan's 'is cuimhin liom' needs the English changed to 'so I remember…' and evicts S0056L01 'so that I can | mar sin is féidir liom'; see decision 3 for the size."),
 57:("Ní féidir liom cuimhneamh conas a rá cad ba mhian liom a rá",None,"KEEP. Eoghan also writes 'Ní féidir liom cuimhneamh…' here; only his 'a dhéanamh ar an rud' differs."),
 113:("Cén fáth nach féidir liom cuimhneamh ar an rud a dúirt tú?",None,"KEEP. Verbal noun after 'nach féidir liom'."),
 232:("Tá aithne agam ar sheanbean a bheidh ábalta cuimhneamh ar an bhfreagra",None,"KEEP. Verbal noun after 'ábalta'."),
}
SIDE={  # remember rows whose English and Irish do not say the same thing today (found while reading; not part of the family decision)
 'S0021L01U08':"English says 'learn', Irish says remember (cuimhneamh)",
 'S0061L03B04':"English 'I wasn't able to say…', Irish 'I can't remember how to say…'",
 'S0064L01U07':"'cúpla focal cuimhneamh' is the old direct-object form; should be 'cuimhneamh ar chúpla focal'",
 'S0065L01U07':"English 'to think about', Irish cuimhneamh (think about is smaoineamh elsewhere)",
 'S0065L03U08':"English 'remember all the words', Irish 'remember how to say lots of words'",
 'S0065L04U05':"same as S0065L03U08",
 'S0066L04U05':"English 'cannot remember it', Irish 'nach bhfuil tú ábalta cuimhneamh' (no 'it'; cannot is 'ní féidir' elsewhere)",
 'S0114L03U11':"English 'when I try to remember', Irish 'ag iarraidh' (= trying)",
 'S0114L06U06':"'ar focail' should be lenited 'ar fhocail'",
 'S0124L01U06':"English 'whether I would be able to', Irish 'an féidir liom' (if I can)",
 'S0127L02U13':"English '…remember what I wanted to say', Irish adds 'conas a rá'; 'would be able' vs 'an féidir'",
 'S0130L01U06':"English 'you can remember', Irish 'go bhfuil tú ábalta' (are able)",
 'S0160L02U08':"second half of the Irish says something else than the English",
 'S0202L02U11':"English 'I remember how to answer…', Irish 'Tá a fhios agam…' (I know). The only state 'I remember' in the course.",
 'S0208L02U07':"English 'I have been trying', Irish 'bhí mé ag iarraidh' (I was trying)",
}
out={'course':'gle_v2_for_eng','read_at':'2026-11-12','applied':False,'seeds':[],'legos':[],'phrases':[],'side_findings':[]}
for s in d:
    n=s['seed_number']
    if rx.search(s['known_text']+' '+s['target_text']):
        e=eo.get(n,{})
        p=SEEDS[n]
        out['seeds'].append({'seed':n,'english':s['known_text'],'ours':s['target_text'],'eoghan_english':e.get('Your English (only if different)') or None,'eoghan':e.get('Your Irish'),'proposed':p[0],'proposed_english':p[1],'change':p[0]!=s['target_text'],'note':p[2]})
    for l in s.get('legos') or []:
        if rx.search(l['known_text']+' '+l['target_text']):
            out['legos'].append({'lego':l['lego_id'],'known':l['known_text'],'target':l['target_text'],'components':l.get('components'),'phrases_in_basket':len(l.get('basket_phrases') or []),'proposed':'keep'})
        for ph in l.get('basket_phrases') or []:
            if rx.search((ph.get('known_text') or '')+' '+(ph.get('target_text') or '')):
                k=ph['id'].split(':')[1]
                row={'phrase':k,'role':ph.get('phrase_role'),'known':ph['known_text'],'target':ph['target_text'],'proposed':'keep'}
                out['phrases'].append(row)
                if k in SIDE: out['side_findings'].append({'phrase':k,'known':ph['known_text'],'target':ph['target_text'],'problem':SIDE[k]})
assert len(out['side_findings'])==len(SIDE),(len(out['side_findings']),len(SIDE))
out['counts']={'seeds':len(out['seeds']),'legos':len(out['legos']),'phrases':len(out['phrases']),'side_findings':len(out['side_findings'])}
json.dump(out,open(os.path.join(here,'proposal.json'),'w'),ensure_ascii=False,indent=1)
print(out['counts'])
