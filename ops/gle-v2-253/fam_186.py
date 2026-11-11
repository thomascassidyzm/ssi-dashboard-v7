# Seed 186: Eoghan's 'éagsúil' for 'different' (he has it at 60, 186, 457). 'an mian leat' stays: his 'ar mhaith
# leat' is 'would you like', and want = mian is Kai's ruling. 'ar bhealach difriúil' (differently) is his at 607 and stays.
from lib import *
F='186 different'
seed(186,None,"an mian leat labhairt faoi rud éigin éagsúil an tseachtain seo chugainn?",F,"Eoghan's éagsúil; mian kept for 'want'")
lego('S0186L01',F,'',target_text='labhairt faoi rud éigin éagsúil',components=[{"known":"talk about","target":"labhairt faoi"},{"known":"something","target":"rud éigin"},{"known":"different","target":"éagsúil"}])
for k,r in sorted(R.items()):
    if r['phrase_role']=='component':
        if k.startswith('S0186L01') and 'difri' in r['target_text']: upd(k,None,r['target_text'].replace('difriúil','éagsúil'),F,'word tile follows the LEGO')
        continue
    if 'rud éigin difriúil' in r['target_text'] and not k.startswith('S0199L02'): sub(k,[('rud éigin difriúil','rud éigin éagsúil')],F,"'something different' follows the taught LEGO")
if __name__=='__main__': show(F)
