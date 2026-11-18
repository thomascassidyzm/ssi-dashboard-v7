# Builds the edit-batch for job #229 (Kai approved 11 Nov 15:22Z): Auke's "takommend jier" family, fry_for_eng.
# Auke's rule: "jier" is an it-word; with no article the adjective takes no -e ("takommend jier", "folgjend jier");
# "it takommende jier" (with article) keeps -e. No live row carries an article before these words (checked course-wide).
# Changes seed 176, LEGO S0176L01 (target + its "next" component), the 16 phrases with "takommende jier", seed 416, and
# S0416L03U09 (seed 416's own sentence as a phrase row: Auke did not list it, but it is the seed text and must move with it).
# Every new text is listed by hand in takommend-jier-229-new-texts.json; the builder refuses a row whose live text is not
# Auke's old text (where Auke listed the row) or whose new text is not Auke's new text, and any course row it did not plan
# that still says "takommende/folgjende jier" without an article.
#   python3 ops/fry-build/takommend-jier-229-build-batch.py all.json seeds.json new-texts.json auke.csv > batch.json
# all.json = list of GET /api/production/fry_for_eng/script-view pages; seeds.json = GET /api/production/fry_for_eng/seeds.
import json,sys,csv,re
pages=json.load(open(sys.argv[1])); seeds={s['seed_number']:s for s in json.load(open(sys.argv[2]))['seeds']}
NEW=json.load(open(sys.argv[3]))
auke={r['id']:r for r in csv.DictReader(open(sys.argv[4],encoding='utf-8-sig'))}
AUKE_ID={'SEED176':'S0176','LEGO:S0176L01':'S0176-L','SEED416':'S0416'}
BAD=re.compile(r'(?<!\bit )(?<!\bdit )(?<!\bdat )\b(takommende|folgjende) jier',re.I)
def check(k,live):
    a=auke.get(AUKE_ID.get(k,k))
    if a:
        if live!=a['old_frisian']: sys.exit(f'{k}: live text {live!r} is not Auke\'s old text')
        if NEW[k]!=a['new_frisian']: sys.exit(f'{k}: new text is not Auke\'s new text')
    elif not BAD.search(live): sys.exit(f'{k}: unlisted row does not carry the error')
ops=[]; seen=set()
for n in (176,416):
    k=f'SEED{n}'; s=seeds[n]; check(k,s['target_text']); seen.add(k)
    ops.append({"op":"seed.update","seed_number":n,"expect":{"known_text":s['known_text'],"target_text":s['target_text']},"set":{"target_text":NEW[k]}})
l=[x for x in seeds[176]['legos'] if x['lego_id']=='S0176L01'][0]
check('LEGO:S0176L01',l['target_text']); seen.add('LEGO:S0176L01')
comps=[dict(c) for c in l['components']]
assert comps[0]=={'known':'next','target':'takommende'}, comps
comps[0]['target']='takommend'
ops.append({"op":"lego.update","lego_id":"S0176L01","expect":{"known_text":l['known_text'],"target_text":l['target_text']},
    "set":{"target_text":NEW['LEGO:S0176L01'],"components":comps}})
for d in pages:
    for s in d['seeds']:
        if BAD.search(s['target_text']) and f"SEED{s['seed_number']}" not in NEW: sys.exit(f"unplanned seed {s['seed_number']}")
        for lg in s['legos']:
            for p in lg['phrases']:
                k=p['id'].split(':')[-1]
                if p['type']=='lego_debut': continue
                if k not in NEW:
                    if BAD.search(p['target_text']): sys.exit(f'unplanned row still wrong: {k}')
                    continue
                check(k,p['target_text']); seen.add(k)
                ops.append({"op":"phrase.update","phrase_id":p['id'],
                    "expect":{"known_text":p['known_text'],"target_text":p['target_text']},"set":{"target_text":NEW[k]}})
if set(NEW)-seen: sys.exit(f'no live row for {sorted(set(NEW)-seen)}')
print(json.dumps({"ops":ops},ensure_ascii=False,indent=1))
