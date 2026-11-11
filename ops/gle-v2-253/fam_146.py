# Seed 146: Eoghan's sentence (with muid). 'seems' is 'Tá an chuma air'; 'working' here is 'ag feidhmiú', taught
# inside a bigger piece so it does not clash with 'working | ag obair' (99, 106); 'nothing' is his 'rud ar bith'.
from lib import *
F='146 it seems'
seed(146,None,"Tá an chuma air nach bhfuil rud ar bith ag feidhmiú ó rinne muid iarracht é a dheisiú",F,"Eoghan's, with muid")
lego('S0146L06',F,"Eoghan's 'Tá an chuma air'; the old gloss 'nothing seems | Ní cosúil' was not what the Irish said",known_text='it seems',target_text='Tá an chuma air',
     components=[{"known":"is","target":"Tá"},{"known":"the appearance","target":"an chuma"},{"known":"on it","target":"air"}])
lego('S0146L01',F,"Eoghan's 'nach bhfuil rud ar bith ag feidhmiú', one piece",known_text='that nothing is working',target_text='nach bhfuil rud ar bith ag feidhmiú',
     components=[{"known":"that is not","target":"nach bhfuil"},{"known":"anything","target":"rud ar bith"},{"known":"working","target":"ag feidhmiú"}])
lego_del('S0146L02',F,"'working | ag obair' is no longer in the seed; ag obair is already taught at 99 and 106")
basket('S0146L01',[
 ('build',"that nothing is working","nach bhfuil rud ar bith ag feidhmiú"),
 ('build',"I think that nothing is working","ceapaim nach bhfuil rud ar bith ag feidhmiú"),
 ('build',"that nothing is working today","nach bhfuil rud ar bith ag feidhmiú inniu"),
 ('build',"you said that nothing is working","dúirt tú nach bhfuil rud ar bith ag feidhmiú"),
 ('use',"I'm sorry that nothing is working","tá brón orm nach bhfuil rud ar bith ag feidhmiú"),
 ('use',"are you sure that nothing is working?","an bhfuil tú cinnte nach bhfuil rud ar bith ag feidhmiú?"),
 ('use',"I'm surprised that nothing is working yet","tá ionadh orm nach bhfuil rud ar bith ag feidhmiú fós"),
 ('use',"thank you but I think that nothing is working at the moment","go raibh maith agat ach ceapaim nach bhfuil rud ar bith ag feidhmiú faoi láthair"),
 ('use',"it's unusual that nothing is working","tá sé neamhghnách nach bhfuil rud ar bith ag feidhmiú"),
 ('use',"I know that nothing is working tonight","tá a fhios agam nach bhfuil rud ar bith ag feidhmiú anocht"),
],F)
basket('S0146L04',[
 ('build',"we tried yesterday","rinne muid iarracht inné"),
 ('build',"of course we tried","ar ndóigh rinne muid iarracht"),
 ('build',"we tried but it was difficult","rinne muid iarracht ach bhí sé deacair"),
 ('use',"we tried to learn Irish together","rinne muid iarracht Gaeilge a fhoghlaim le chéile"),
 ('use',"we tried to help you last night","rinne muid iarracht cabhrú leat aréir"),
 ('use',"thank you, we tried as hard as possible","go raibh maith agat, rinne muid iarracht chomh dian agus is féidir"),
],F,"the basket was empty (flagged by #241); a debut needs practice (P30)")
basket('S0146L06',[
 ('build',"it seems","Tá an chuma air"),
 ('build',"it seems that nothing is working","Tá an chuma air nach bhfuil rud ar bith ag feidhmiú"),
 ('build',"it seems that you are ready","Tá an chuma air go bhfuil tú réidh"),
 ('build',"it seems that it is not working","Tá an chuma air nach bhfuil sé ag obair"),
 ('use',"nothing seems to be working since we tried to fix it","Tá an chuma air nach bhfuil rud ar bith ag feidhmiú ó rinne muid iarracht é a dheisiú"),
 ('use',"it seems that nothing is working since yesterday","Tá an chuma air nach bhfuil rud ar bith ag feidhmiú ó inné"),
 ('use',"it seems that you are very happy today","Tá an chuma air go bhfuil tú an-sásta inniu"),
 ('use',"it seems that you are doing better than the last time","Tá an chuma air go bhfuil tú ag déanamh níos fearr ná an uair dheireanach"),
 ('use',"it seems that it is not easy to learn Irish","Tá an chuma air nach bhfuil sé éasca Gaeilge a fhoghlaim"),
 ('use',"it seems that you are not ready yet","Tá an chuma air nach bhfuil tú réidh fós"),
 ('use',"it seems that we must fix it as quickly as possible","Tá an chuma air go gcaithfidh muid é a dheisiú chomh tapa agus is féidir"),
 ('use',"it seems that nothing is working and I'm not sure what to do","Tá an chuma air nach bhfuil rud ar bith ag feidhmiú agus níl mé cinnte cad ba cheart dom a dhéanamh"),
],F,"rewritten on Eoghan's wording; several old rows also had broken Irish")
upd('S0298L03U05',"it seems that there is nothing left to say","Tá an chuma air nach bhfuil aon rud fágtha agam le rá",F,"'ní cosúil go' is no longer taught")
if __name__=='__main__': show(F)
