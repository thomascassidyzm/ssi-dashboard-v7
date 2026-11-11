# Family A: person endings (Kai 11 Nov ruling 1): verb + muid for "we"; one-word elsewhere.
from lib import *
F='muid'
seed(111,target='nuair a fhoghlaimíonn muid rud nua athraíonn sé ár n-inchinn',fam=F)
seed(409,target='Níor cheart, is cuma cad a dhéanann muid',fam=F)
seed(412,target='Ní fhéadfadh muid ligean dóibh gach rud a bhuachan',fam=F)
seed(413,target="d'fhéadfadh muid titim dá rachadh muid ró-ghar don imeall",fam=F)
seed(414,target='an bhféadfadh muid buidéal fíona deirg a fháil le do thoil?',fam=F)
seed(470,target='cé chomh hard is mian leat dreapadh sula stopann muid?',fam=F)
seed(568,target='Tá mé ag súil le feabhas a fheiceáil an chéad uair eile a bhuailfidh muid le chéile',fam=F)
lego('S0111L01',fam=F,target_text='nuair a fhoghlaimíonn muid',components=[{"known":"when","target":"Nuair"},{"known":"we learn","target":"a fhoghlaimíonn muid"}])
for k,r in R.items():
    if 'fhoghlaimímid' in r['target_text']: sub(k,[('fhoghlaimímid','fhoghlaimíonn muid')],fam=F)
    if 'dhéanaimid' in r['target_text']: sub(k,[('dhéanaimid','dhéanann muid')],fam=F)
sub('S0108L05U05',[('ní bhíonn mé','ní bhím')],fam=F,why='one-word I form (report: ní bhím)')
