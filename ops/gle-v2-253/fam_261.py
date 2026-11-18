# Seed 261: Eoghan's 'ceapaim b'fhéidir gur rud éigin tábhachtach é' (his 'bh'féidir' spelt 'b'fhéidir', as he
# writes it at 456). 'go bhféadfadh sé a bheith' (it might be) leaves the course.
from lib import *
F="261 it might be"
seed(261,None,"ceapaim b'fhéidir gur rud éigin tábhachtach é",F,"Eoghan's; spelling slip corrected")
lego('S0261L02',F,"Eoghan's 'b'fhéidir gur'; every phrase supplies the closing 'é' (P24)",known_text='it might be',target_text="b'fhéidir gur",
     components=[{"known":"maybe","target":"b'fhéidir"},{"known":"that it is","target":"gur"}])
basket('S0261L02',[
 ('build',"it might be a good thing","b'fhéidir gur rud maith é"),
 ('build',"it might be a good idea","b'fhéidir gur smaoineamh maith é"),
 ('build',"I think it might be a good thing","ceapaim b'fhéidir gur rud maith é"),
 ('build',"it might be something important","b'fhéidir gur rud éigin tábhachtach é"),
 ('use',"I think it might be something important","ceapaim b'fhéidir gur rud éigin tábhachtach é"),
 ('use',"I am sorry but I think it might be a problem","tá brón orm ach ceapaim b'fhéidir gur fadhb é"),
 ('use',"it might be a good idea but I'm not sure","b'fhéidir gur smaoineamh maith é ach níl mé cinnte"),
 ('use',"it might be something interesting","b'fhéidir gur rud éigin suimiúil é"),
 ('use',"it might be a good thing to wait","b'fhéidir gur rud maith é fanacht"),
 ('use',"I believe it might be a good idea","creidim b'fhéidir gur smaoineamh maith é"),
 ('use',"it might be something new","b'fhéidir gur rud éigin nua é"),
],F)
upd('S0268L01U02',None,"chuala b'fhéidir gur rud éigin tábhachtach é",F,"old seed 261 wording")
dele('S0280L02U03',F,"'go bhféadfadh sé a bheith' is no longer taught")
dele('S0295L01U03',F,"'go bhféadfadh sé a bheith' is no longer taught")
if __name__=='__main__': show(F)
