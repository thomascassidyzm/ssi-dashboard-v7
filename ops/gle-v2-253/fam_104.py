# Seed 104: Eoghan's sentence, his two spelling slips corrected (caithfinid, ata), with muid.
from lib import *
F='104 what we are doing'
seed(104,None,"caithfidh muid an rud atá á dhéanamh againn a athrú",F,"Eoghan's 'an rud atá á dhéanamh againn a athrú', with muid")
lego('S0104L02',F,"the seed now says 'a athrú' (object before the verbal noun)",target_text='a athrú',type='M',components=[{"known":"to","target":"a"},{"known":"change","target":"athrú"}])
basket('S0104L02',[
 ('build',"to change something","rud éigin a athrú"),
 ('build',"we must change something","caithfidh muid rud éigin a athrú"),
 ('build',"you should change everything","ba cheart duit gach rud a athrú"),
 ('build',"I'd like to change something","ba mhaith liom rud éigin a athrú"),
 ('use',"I can't change anything at the moment","ní féidir liom aon rud a athrú faoi láthair"),
 ('use',"are you going to change everything tomorrow?","an bhfuil tú chun gach rud a athrú amárach?"),
 ('use',"when do you want to change it?","cathain ar mian leat é a athrú?"),
 ('use',"if I need to change something I'm not going to be worried","má chaithfidh mé rud éigin a athrú ní bheidh mé buartha"),
 ('use',"I think that it is not easy to change everything","ceapaim nach bhfuil sé éasca gach rud a athrú"),
 ('use',"thank you but I should change it now","go raibh maith agat ach ba cheart dom é a athrú anois"),
 ('use',"she doesn't want to change anything today","ní mian léi aon rud a athrú inniu"),
 ('use',"I don't know how to change it","níl a fhios agam conas é a athrú"),
],F)
lego_del('S0104L03',F,"'to do | a dhéanamh' is no longer in the seed (not-new row, no phrases)")
lego('S0104L04',F,"Eoghan's 'an rud atá'; kept apart from the next piece only because the two together are 9 syllables (cap is 8)",known_text='what',target_text='an rud atá',
     components=[{"known":"the thing","target":"an rud"},{"known":"that is","target":"atá"}])
basket('S0104L04',[
 ('build',"what is important","an rud atá tábhachtach"),
 ('build',"what is difficult","an rud atá deacair"),
 ('build',"to change what is difficult","an rud atá deacair a athrú"),
 ('build',"I like what is easy","is maith liom an rud atá éasca"),
 ('use',"you should change what is difficult","ba cheart duit an rud atá deacair a athrú"),
 ('use',"I can't remember what is important","ní féidir liom cuimhneamh ar an rud atá tábhachtach"),
 ('use',"can you explain what is important?","an féidir leat an rud atá tábhachtach a mhíniú?"),
 ('use',"I'd like to learn what is useful","ba mhaith liom an rud atá úsáideach a fhoghlaim"),
 ('use',"we must do what is difficult","caithfidh muid an rud atá deacair a dhéanamh"),
 ('use',"thank you very much and I'd like to hear what is interesting","go raibh míle maith agat agus ba mhaith liom an rud atá suimiúil a chloisteáil"),
],F)
lego('S0104L05',F,"Eoghan's 'á dhéanamh againn'",known_text="we're doing",target_text='á dhéanamh againn',
     components=[{"known":"being done","target":"á dhéanamh"},{"known":"by us","target":"againn"}])
basket('S0104L05',[
 ('build',"what we're doing","an rud atá á dhéanamh againn"),
 ('build',"the work that we're doing","an obair atá á dhéanamh againn"),
 ('build',"everything that we're doing","gach rud atá á dhéanamh againn"),
 ('use',"we need to change what we're doing","caithfidh muid an rud atá á dhéanamh againn a athrú"),
 ('use',"I like what we're doing","is maith liom an rud atá á dhéanamh againn"),
 ('use',"I like the work that we're doing","is maith liom an obair atá á dhéanamh againn"),
 ('use',"can you explain what we're doing?","an féidir leat an rud atá á dhéanamh againn a mhíniú?"),
 ('use',"I think that the work that we're doing is important","ceapaim go bhfuil an obair atá á dhéanamh againn tábhachtach"),
 ('use',"I can't remember everything that we're doing","ní féidir liom cuimhneamh ar gach rud atá á dhéanamh againn"),
 ('use',"you should change everything that we're doing","ba cheart duit gach rud atá á dhéanamh againn a athrú"),
 ('use',"unfortunately we must change everything that we're doing now","faraor caithfidh muid gach rud atá á dhéanamh againn a athrú anois"),
 ('use',"I'm not sure that the work that we're doing is easy","níl mé cinnte go bhfuil an obair atá á dhéanamh againn éasca"),
],F)
# the old seed's wording elsewhere
upd('S0153L02U06',"we need to change what we're doing, because we cannot do it in the same way anymore","caithfidh muid an rud atá á dhéanamh againn a athrú, mar ní féidir linn é a dhéanamh ar an mbealach céanna a thuilleadh",F,"old seed 104 wording; 'liom' was also wrong for 'we'")
upd('S0153L02U11',None,"Tá sé ag iarraidh gach rud a dhéanamh ar an mbealach céanna, mar tá sé buartha faoi aon rud a athrú",F,"'athrú a dhéanamh ar' was the old seed 104 wording; English also said 'afraid' for buartha")
W="'what we're doing' follows the taught piece (an rud atá á dhéanamh againn)"
upd('S0200L02U06',None,"ceapaim gur mian leo a fhios a bheith acu cad atá á dhéanamh againn agus conas atá muid ag dul",F,W)
upd('S0200L03U14',None,"Is mian liom a chinntiú go bhfuil an rud atá á dhéanamh againn anseo ar an mbealach ceart",F,W)
upd('S0200L04U04',None,"dúirt sé go bhfuil súil aige go gcríochnóidh muid an rud atá á dhéanamh againn go luath",F,W)
upd('S0245L02U03',None,"dúirt sí liom nach raibh sí sásta leis an méid oibre a bhí á dhéanamh againn",F,W)
upd('S0245L02U09',None,"ba mhian léi fáil amach an raibh mé sásta leis an méid oibre a bhí á dhéanamh againn",F,W)
if __name__=='__main__': show(F)
