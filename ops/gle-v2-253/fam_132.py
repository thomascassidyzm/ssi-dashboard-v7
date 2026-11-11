# Seed 132: Eoghan's sentence and his English. 'níos lú' + adjective and 'corraitheach' leave the course (he removed
# corraitheach at 132, 575 and 576). 'that isn't' is taught inside a bigger piece so it does not clash with
# 'That isn't | Ní hé sin' (127). 'That is | Tá sé sin' moves its debut to 142, the next seed that says it.
from lib import *
F='132 not as exciting'
seed(132,"that isn't as exciting in comparison with what she was saying","Níl sé sin chomh hiontach i gcomparáid leis an méid a bhí á rá aici",F,"Eoghan's sentence and his English")
OLD132=[(R[k]['phrase_role'],R[k]['known_text'],R[k]['target_text']) for k in sorted(R) if R[k]['lego']=='S0132L01' and R[k]['phrase_role']!='component']
lego('S0132L01',F,'grown so "that isn\'t" has one answer in context',known_text="that isn't as exciting",target_text='Níl sé sin chomh hiontach',
     components=[{"known":"is not","target":"Níl"},{"known":"it","target":"sé"},{"known":"that","target":"sin"},{"known":"as","target":"chomh"},{"known":"exciting","target":"hiontach"}])
basket('S0132L01',[
 ('build',"that isn't as exciting","níl sé sin chomh hiontach"),
 ('build',"that isn't as exciting today","níl sé sin chomh hiontach inniu"),
 ('build',"but that isn't as exciting","ach níl sé sin chomh hiontach"),
 ('build',"that isn't as exciting now","níl sé sin chomh hiontach anois"),
 ('use',"unfortunately that isn't as exciting","faraor níl sé sin chomh hiontach"),
 ('use',"that isn't as exciting but it is useful","níl sé sin chomh hiontach ach tá sé úsáideach"),
 ('use',"that isn't as exciting in the middle of the night","níl sé sin chomh hiontach i lár na hoíche"),
 ('use',"that isn't as exciting because we must work hard","níl sé sin chomh hiontach mar caithfidh muid obair go dian"),
 ('use',"that isn't as exciting but it is important","níl sé sin chomh hiontach ach tá sé tábhachtach"),
 ('use',"thank you but that isn't as exciting","go raibh maith agat ach níl sé sin chomh hiontach"),
],F)
lego('S0132L02',F,"'less | níos lú' is no longer in the seed; the row now carries the seed's new piece",known_text='in comparison with',target_text='i gcomparáid leis',
     components=[{"known":"in","target":"i"},{"known":"comparison","target":"gcomparáid"},{"known":"with","target":"leis"}])
basket('S0132L02',[
 ('build',"in comparison with the work","i gcomparáid leis an obair"),
 ('build',"in comparison with what you said","i gcomparáid leis an méid a dúirt tú"),
 ('build',"easy in comparison with the work","éasca i gcomparáid leis an obair"),
 ('build',"that isn't as exciting in comparison with the work","níl sé sin chomh hiontach i gcomparáid leis an obair"),
 ('use',"that is easy in comparison with what you said","tá sé sin éasca i gcomparáid leis an méid a dúirt tú"),
 ('use',"that isn't as exciting in comparison with what you said","níl sé sin chomh hiontach i gcomparáid leis an méid a dúirt tú"),
 ('use',"it is not difficult in comparison with the work","níl sé deacair i gcomparáid leis an obair"),
 ('use',"that was very interesting in comparison with what you said","bhí sé sin an-suimiúil i gcomparáid leis an méid a dúirt tú"),
 ('use',"I feel better today in comparison with the last time","mothaím níos fearr inniu i gcomparáid leis an uair dheireanach"),
 ('use',"it is easy to learn Irish in comparison with the work","tá sé éasca Gaeilge a fhoghlaim i gcomparáid leis an obair"),
],F)
lego_del('S0132L03',F,"'exciting | corraitheach' is no longer in the seed; Eoghan removed the word at 132, 575 and 576")
lego_del('S0132L04',F,"'than | ná' is no longer in the seed (not-new row, no phrases)")
lego('S0132L05',F,"Eoghan's 'á rá aici'",target_text='an méid a bhí á rá aici',
     components=[{"known":"what","target":"an méid"},{"known":"that was","target":"a bhí"},{"known":"being said","target":"á rá"},{"known":"by her","target":"aici"}])
basket('S0132L05',[
 ('build',"what she was saying","an méid a bhí á rá aici"),
 ('build',"in comparison with what she was saying","i gcomparáid leis an méid a bhí á rá aici"),
 ('build',"I don't agree with what she was saying","ní aontaím leis an méid a bhí á rá aici"),
 ('build',"I don't want to hear what she was saying","ní mian liom an méid a bhí á rá aici a chloisteáil"),
 ('use',"that isn't as exciting in comparison with what she was saying","Níl sé sin chomh hiontach i gcomparáid leis an méid a bhí á rá aici"),
 ('use',"I don't agree with what she was saying but it was interesting","ní aontaím leis an méid a bhí á rá aici ach bhí sé suimiúil"),
 ('use',"I wasn't expecting what she was saying","ní raibh mé ag súil leis an méid a bhí á rá aici"),
 ('use',"I was very happy with what she was saying","bhí mé an-sásta leis an méid a bhí á rá aici"),
 ('use',"I agree with what she was saying about the language","aontaím leis an méid a bhí á rá aici faoin teanga"),
 ('use',"I can't remember what she was saying","ní féidir liom cuimhneamh ar an méid a bhí á rá aici"),
 ('use',"I don't want to hear what she was saying again","ní mian liom an méid a bhí á rá aici a chloisteáil arís"),
],F)
# 'That is | Tá sé sin' now debuts at 142 (L31): the old 132 basket moves there unchanged.
lego('S0142L01',F,"its earlier pair at 132 is gone, so this row is the debut now (L31)",is_new=True)
for role,kn,tg in OLD132: ins('S0142L01',role,kn,tg,F,"moved unchanged from S0132L01")
# níos lú + adjective elsewhere before its own LEGO at 256
dele('S0134L04U09',F,"'níos lú buartha' leans on the removed 'less | níos lú'")
dele('S0134L04U10',F,"'níos lú corraitheach': both pieces removed")
upd('S0213L03U14',"he told us that he wants to achieve more","dúirt sé linn gur mian leis níos mó a bhaint amach",F,"'níos lú ama' leaned on the removed LEGO; clause dropped")
for k in ('S0170L02U05','S0196L01U01'): sub(k,[('a bhí sise a rá','a bhí á rá aici')],F,"follows the re-cut LEGO S0132L05")
if __name__=='__main__': show(F)
