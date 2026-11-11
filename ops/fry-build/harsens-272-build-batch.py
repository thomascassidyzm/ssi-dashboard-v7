# Builds the edit-batch for job #272: Auke's third fry_for_eng corrections file (11 Nov), "harsens" = the physical brain only.
# Auke's language facts are adopted as written; the English moves with them so both sides match (as #121 did):
#   ús/myn harsens (changes our brain)  -> ús/myn tinken, English "our/my thinking"  (noun "thinking" = tinken, same root
#                                          the course already teaches for "to think": nei te tinken / te tinken)
#   ideas yn myn harsens                 -> yn myn holle, English "in my head"         (taught at S0131L01 "in my head")
# Also moved, though not in Auke's file: S0111L04U06 (seed 111's own sentence as a phrase row), the component row
# S0111L04C03 "our brain" and both LEGOs' components JSON; S0131L03B01 becomes word-for-word S0131L03B03 and is deleted
# as a duplicate; S0176L01C01 component tile still said "takommende" after #229 and is set to "takommend".
# HELD (not built here, see the #272 record): seed 126 + LEGO S0126L03 + its 13 rows (Auke's "de wize wêrop't ik tink"
# brings in "wize" for English "way", which the course teaches as "manier" from S0094; ZUT); S0111L03B01/B03/U02/U05
# (Auke's "ús holle" rows no longer carry LEGO S0111L03, and holle is first taught at seed 131).
#   python3 ops/fry-build/harsens-272-build-batch.py all.json seeds.json harsens-272-new-texts.json auke.csv > batch.json
# all.json = list of GET /api/production/fry_for_eng/script-view pages; seeds.json = GET /api/production/fry_for_eng/seeds.
import json,sys,csv,re
pages=json.load(open(sys.argv[1])); seeds={s['seed_number']:s for s in json.load(open(sys.argv[2]))['seeds']}
NEW=json.load(open(sys.argv[3]))
auke={r['id']:r for r in csv.DictReader(open(sys.argv[4],encoding='utf-8-sig'))}
HELD=set(NEW.pop('_held'))
def auke_row(k,live_known,live_target):
    if k=='SEED111': a=auke['S0111']
    elif k.startswith('LEGO:'):
        a=[r for r in csv.DictReader(open(sys.argv[4],encoding='utf-8-sig')) if r['kind']=='lego' and r['english']==live_known]
        a=a[0] if a else None
    else: a=auke.get(k)
    return a
def check(k,known,target):
    a=auke_row(k,known,target); n=NEW[k]
    if a:
        # S0131L03U05: Auke's old text predates the #121 betinke->heuge fix that is already live; his new text keeps it,
        # so the only change allowed there is harsens -> holle on the live text.
        stale=(k=='S0131L03U05' and target.replace('harsens','holle')==a['new_frisian'])
        if (target!=a['old_frisian'] and not stale) or known!=a['english']: sys.exit(f'{k}: live row {known!r}/{target!r} is not Auke\'s old row')
        if n!='DELETE' and n[1]!=a['new_frisian']: sys.exit(f'{k}: new target is not Auke\'s')
    if n!='DELETE' and 'harsens' in n[1]: sys.exit(f'{k}: new text still says harsens')
ops=[]; seen=set()
s=seeds[111]; check('SEED111',s['known_text'],s['target_text']); seen.add('SEED111')
ops.append({"op":"seed.update","seed_number":111,"expect":{"known_text":s['known_text'],"target_text":s['target_text']},
    "set":{"known_text":NEW['SEED111'][0],"target_text":NEW['SEED111'][1]}})
COMP={'S0111L03':[{'known':'our','target':'ús'},{'known':'thinking','target':'tinken'}],
      'S0111L04':[{'known':'changes','target':'feroaret'},{'known':'that','target':'dat'},{'known':'our thinking','target':'ús tinken'}]}
for lid in COMP:
    l=[x for x in s['legos'] if x['lego_id']==lid][0]; k='LEGO:'+lid
    check(k,l['known_text'],l['target_text']); seen.add(k)
    old=[c['target'] for c in l['components']]
    assert [c['known'] for c in l['components']][:-1]==[c['known'] for c in COMP[lid]][:-1] and old[:-1]==[c['target'] for c in COMP[lid]][:-1], l['components']
    ops.append({"op":"lego.update","lego_id":lid,"expect":{"known_text":l['known_text'],"target_text":l['target_text']},
        "set":{"known_text":NEW[k][0],"target_text":NEW[k][1],"components":COMP[lid]}})
for d in pages:
    for sd in d['seeds']:
        for lg in sd['legos']:
            for p in lg['phrases']:
                k=p['id'].split(':')[-1]
                if p['type']=='lego_debut': continue
                if k not in NEW:
                    if 'harsens' in p['target_text'] and k not in HELD: sys.exit(f'unplanned row still says harsens: {k}')
                    continue
                check(k,p['known_text'],p['target_text']); seen.add(k)
                ex={"known_text":p['known_text'],"target_text":p['target_text']}
                if NEW[k]=='DELETE': ops.append({"op":"phrase.delete","phrase_id":p['id'],"expect":ex})
                else: ops.append({"op":"phrase.update","phrase_id":p['id'],"expect":ex,"set":{"known_text":NEW[k][0],"target_text":NEW[k][1]}})
if set(NEW)-seen: sys.exit(f'no live row for {sorted(set(NEW)-seen)}')
print(json.dumps({"ops":ops},ensure_ascii=False,indent=1))
