# cs #410·AI — trivial knock-on fixes found by wholecheck.py after the #398 pass was applied. Builds fixes.ops.json from live-after.json.
# Each fix restores taught-before-used where the pass removed the word's teaching LEGO, using the form the course now teaches.
import json,sys,re
sys.path.insert(0,'../gle-v2-eoghan-43-2026-11-16'); from lib import *
S=load(sys.argv[1] if len(sys.argv)>1 else 'live-after.json')
P={p['id'].split(':')[1]:p for s in S.values() for l in s['legos'] for p in (l.get('basket_phrases') or [])}
ops=[]
def upd(pid,target,known=None):
    p=P[pid]; st={'target_text':target}
    if known: st['known_text']=known
    ops.append({'op':'phrase.update','phrase_id':'gle_v2_for_eng:'+pid,'set':st,'expect':{'known_text':p['known_text'],'target_text':p['target_text']}})
def dele(pid): ops.append({'op':'phrase.delete','phrase_id':'gle_v2_for_eng:'+pid,'expect':{'target_text':P[pid]['target_text']}})
# 1. 'gach seachtaine' leaned on 38's old 'timpeall seachtaine' (now 'thart ar sheachtain'); 'gach' takes the nominative anyway: gach seachtain
for pid in ['S0065L01U14','S0065L03U01','S0065L03U13','S0065L05U01','S0065L05U12','S0065L06U03']:
    assert 'gach seachtaine' in P[pid]['target_text']; t=P[pid]['target_text'].replace('gach seachtaine','gach seachtain')
    upd(pid,t.replace('ceapaim Tá sé','ceapaim go bhfuil sé'))   # S0065L05U12 also read 'ceapaim Tá sé' (needs go bhfuil, taught well before 65)
# 2. 'athraíonn sé' is no longer taught (111 is athraítear); this line has no passive wording that keeps its LEGO -> dropped, like the 3 in #398
dele('S0111L04U15')
# 3. 'buíoch' alone is no longer taught (142 teaches an-bhuíoch)
upd('S0142L07B03','an-bhuíoch as do chabhair','very grateful for your help')
upd('S0199L02U04','ba mhian leis rud éigin ó mo chara a fháil agus dúirt sé go raibh sé an-bhuíoch','he wanted to get something from my friend and he said he was very grateful')
dele('S0155L02U08')   # also wrong tense (bhí = I was, for "I would be"); 'bheinn' is untaught; S0155L02 is not a debut and keeps 18
# 4. 'an-neamhghnách' moved to 300 with Eoghan's orm line; 121 teaches 'neamhghnách'
upd('S0202L01U01','Ní raibh duine ar bith cinnte cad a bhí muid ag iarraidh a rá agus bhí sé sin neamhghnách dúinn ar fad','nobody was sure what we were trying to say and that was unusual for all of us')
# 5. 'ag cleachtadh labhartha' left with 228, which now teaches 'tosú ar labhairt a chleachtadh'
upd('S0252L01B03','cathain a bheidh tú réidh le tosú ar labhairt a chleachtadh')
upd('S0252L01U02','níl a fhios agam cathain a bheidh tú réidh le tosú ar labhairt a chleachtadh')
upd('S0242L02U06','dá bhféadfá níos mó ama a chaitheamh ag caint bheadh sé sin go hiontach','if you could spend more time speaking that would be great')
upd('S0294L02U01','ba chóir duit dóthain ama a chaitheamh ag caint','you should spend enough time speaking')
json.dump({'batch':'fixes','ops':ops},open('fixes.ops.json','w'),ensure_ascii=False,indent=0); print(len(ops),'ops')
for o in ops: print(o['op'],o['phrase_id'][15:],(o.get('set') or {}).get('target_text',''))
