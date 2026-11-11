# Job #169 (Kai 11 Nov): fry_for_eng 'remember' round 3b APPLY — English-only rows + 4 drops.
# plan-rounds-2-3.json = every changed row, parsed from the round 2 page (d/09127ebe, sections A-E) and the
# round 3 page (d/c4c2c9ca, section F "find out"); round 3b (d/aa1c4840) keeps ûnthâlde = "remember" (selective).
# Tag D (heuge -> wit net mear, both sides) is HELD for Auke, as are the 2 ûnthâlde recall rows moved to witte
# and the 3 story rows (wit -> ken). S0077L02U05 is HELD: round 2 left "reword or drop" as Kai's call.
#   python3 build-batch.py live.json > batch.json   (live.json = rows indexed from GET script-view, 50-seed pages)
import json,sys,os
H=os.path.dirname(os.path.abspath(__file__))
L=json.load(open(sys.argv[1])); P=json.load(open(os.path.join(H,'plan-rounds-2-3.json')))
HOLD={'S0077L02U05'}
DROPS=['S0024L02U01','S0071L02B04','S0071L02U02','S0071L02U06']
MERGED={  # rows in both B (still know) and F (want to know)
 'S0017L02U03':"I can speak a little Frisian and she wants to know whether I still know the whole sentence",
 'S0017L02U05':"I'm not sure if I still know the whole sentence and she wants to know"}
new={}
for k,v in P.items():
    if any(x['tag']=='D' for x in v) or k in HOLD: continue
    new[k]=MERGED.get(k) or v[0]['known']
ops=[]
for k,t in sorted(new.items()):
    r=L[k]
    if r['known']==t: sys.exit(f'no change {k}')
    ex={'known_text':r['known'],'target_text':r['target']}
    if r['kind']=='seed': ops.append({'op':'seed.update','seed_number':r['seed'],'expect':ex,'set':{'known_text':t}})
    elif r['kind']=='lego': ops.append({'op':'lego.update','lego_id':k,'expect':ex,'set':{'known_text':t}})
    else: ops.append({'op':'phrase.update','phrase_id':r['id'],'expect':ex,'set':{'known_text':t}})
for k in DROPS:
    r=L[k]; ops.append({'op':'phrase.delete','phrase_id':r['id'],'expect':{'known_text':r['known'],'target_text':r['target']}})
print(json.dumps({'ops':ops},ensure_ascii=False,indent=1))
