# Builds the edit-batch for job #121 (Kai 11 Nov, found while recording fry_for_eng):
#   1. betinke used for "remember": "ik kin net mear betinke" -> "ik kin my net heuge" (reflexive heuge,
#      "my" after the finite verb, "mear" goes — the English never had "any more").
#   2. clause-final "ik begryp net" -> "ik begryp it net" (only where nothing follows in the clause;
#      "ik begryp net wat/hoe/wêrom…" keeps no "it").
# Regex only PROPOSES; every row's new text is listed in NEW below after being read in full, and the
# builder refuses a candidate that has no explicit entry (so nothing is changed by pattern alone).
#   python3 ops/fry-build/heuge-begryp-it-121-build-batch.py all.json > batch.json
# all.json = concatenated GET /api/production/fry_for_eng/script-view?seedStart=&seedEnd= (50-seed pages).
import json,sys,re
d=json.load(open(sys.argv[1]))
C='fry_for_eng'
NEW=json.load(open(sys.argv[2]))   # {phrase_key: new_target_text}  phrase_key = id or 'SEED57'/'LEGO:S0057L01'
seeds={s['seed_number']:s for s in d['seeds']}
ops=[]; seen=set()
def pkey(p): return p['id'].split(':')[-1]
for s in d['seeds']:
    for l in s['legos']:
        for p in l['phrases']:
            t=p['target_text']; k=pkey(p)
            if p['type']=='lego_debut': continue  # the LEGO row itself (script-view synthesises it from course_legos); edited by lego.update below
            cand = re.search(r'betink',t,re.I) or re.search(r'\bbegryp\b',t)
            if k in NEW:
                seen.add(k)
                new=NEW[k]
                if isinstance(new,dict):
                    ops.append({"op":"phrase.update","phrase_id":p['id'],
                        "expect":{"known_text":p['known_text'],"target_text":t},"set":new})
                elif new!=t:
                    ops.append({"op":"phrase.update","phrase_id":p['id'],
                        "expect":{"known_text":p['known_text'],"target_text":t},"set":{"target_text":new}})
            elif cand and re.search(r'betink',t,re.I):
                sys.exit(f'betinke row with no explicit decision: {k} {t}')
s57=seeds[57]
ops.insert(0,{"op":"seed.update","seed_number":57,"expect":{"known_text":s57['known_text'],"target_text":s57['target_text']},
    "set":{"target_text":"Ik kin my net heuge hoe't ik sizze moat wat ik sizze woe."}})
l=[x for x in s57['legos'] if x['lego_id']=='S0057L01'][0]
ops.insert(1,{"op":"lego.update","lego_id":"S0057L01","expect":{"known_text":l['known_text'],"target_text":l['target_text']},
    "set":{"target_text":"ik kin my net heuge","components":[{"known":"I can","target":"ik kin"},{"known":"myself","target":"my"},{"known":"not","target":"net"},{"known":"to recall","target":"heuge"}]}})
missing=set(NEW)-seen
if missing: sys.exit(f'NEW entries matched no live row: {sorted(missing)}')
print(json.dumps({"ops":ops},ensure_ascii=False,indent=1))
