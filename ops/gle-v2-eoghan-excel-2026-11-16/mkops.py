# Builds the edit-batch payload for the older questions we settled ourselves (cs #251·AI).
# Input: Popty GET /api/production/gle_v2_for_eng/seeds (saved as seeds.json). Output: fix-ops.json.
# 109: purpose 'to learn' = 'chun' (focloir.ie; taught at S0065L04 'in order to'), as Eoghan wrote; 'le a lán' read badly.
# 318, 597: 'in my opinion' = 'i mo thuairim féin' (focloir.ie), as already at 618, so one English has one Irish.
# 414: 'fíon' is masculine (teanglann.ie), so its adjective in the genitive is lenited: 'buidéal fíona dheirg'.
import json,sys,copy
S={s['seed_number']:s for s in json.load(open(sys.argv[1]))['seeds']}
SEEDS={109:("caithfidh muid obair go dian le a lán focal nua a fhoghlaim","caithfidh muid obair go dian chun a lán focal nua a fhoghlaim"),
318:("Ní cheapaim, is é mo thuairim nach bhféadfadh sí é a thabhairt léi an uair seo","Ní cheapaim, i mo thuairim féin ní fhéadfadh sí é a thabhairt léi an uair seo"),
597:("Is é mo thuairim go bhfuil na céadta scéal cloiste aige faoi","I mo thuairim féin, tá na céadta scéal cloiste aige faoi"),
414:("an bhféadfadh muid buidéal fíona deirg a fháil le do thoil?","an bhféadfadh muid buidéal fíona dheirg a fháil le do thoil?")}
ops=[]
for n,(a,b) in SEEDS.items():
    assert S[n]['target_text']==a,(n,S[n]['target_text'])
    ops.append({"op":"seed.update","seed_number":n,"expect":{"target_text":a},"set":{"target_text":b}})
for s in S.values():
    for l in s['legos']:
        for p in l.get('basket_phrases') or []:
            t=p['target_text']
            if 'obair go dian le a lán' not in t: continue
            d=copy.deepcopy(p.get('decomposition'))
            for tile in d or []:
                if tile.get('legoId')=='S0038L03' and tile['target'].strip()=='le':
                    tile.update(known='in order to',legoId='S0065L04',target=' chun')
            ops.append({"op":"phrase.update","phrase_id":p['id'],"expect":{"target_text":t},
                        "set":{"target_text":t.replace('obair go dian le a lán','obair go dian chun a lán'),"decomposition":d}})
json.dump({"ops":ops},open('fix-ops.json','w'),ensure_ascii=False,indent=1)
print(len(ops))
