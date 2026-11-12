# Q14 (Kai, 12 Nov): every "happy" is áthas ar (tá áthas orm, go bhfuil áthas air); "happy with X" is áthas ... as X (Eoghan's 76, 245).
# sásta stays only where the English is not "happy": satisfied, pleased, glad, proud, delighted, impressed. Those rows are listed (KEEP).
# Meaning split follows the Finnish happy decisions (fin_for_eng, 21 Oct): the English word is the learner's cue, one Irish form per cue.
from lib import *
F='Q14 happy = áthas ar'
PRON={'mé':'orm','tú':'ort','sé':'air','sí':'uirthi','muid':'orainn','siad':'orthu'}
# --- seeds
seed(76,None,"Tá an-áthas orm as an méid atá foghlamtha agam cheana féin",F,"Q14: Eoghan's sentence")
seed(106,None,"Ní chaithfidh muid áthas a bheith orainn, caithfidh muid obair go dian",F,"Q14: áthas inside our caithfidh frame (his sentence uses riachtanach, which the course does not teach for 'need')")
seed(129,None,"Tá an-áthas orm go bhfuil tú ag déanamh chomh maith sin",F,"Q14: his Tá an-áthas orm; our second half kept")
seed(145,None,"Cén fáth nach bhfuil áthas ort a thuilleadh?",F,"Q14: Eoghan's sentence")
seed(187,None,"Tá áthas orm go dtí seo",F,"Q14: Eoghan's sentence")
seed(245,None,"Tá áthas orm as an méid atá déanta agam in am gearr",F,"Q14: his áthas orm as; in am gearr kept")
seed(344,None,"a dúirt go bhfuil áthas air cabhrú leat",F,"Q14: Eoghan's sentence")
seed(448,None,"beidh, beidh áthas orthu cabhrú",F,"Q14")
seed(599,None,"Bheadh áthas orm tiomáint dá n-inseofá dom faoi",F,"Q14: his áthas orm, without his an- ('very'), so 'happy' and 'very happy' stay apart")
# --- LEGOs
lego('S0076L02',F,'Q14',known_text="I'm very happy",target_text='tá an-áthas orm',components=[{"known":"there is","target":"tá"},{"known":"very","target":"an-"},{"known":"happiness","target":"áthas"},{"known":"on me","target":"orm"}])
lego('S0076L03',F,"Q14: 'happy with' is áthas ... as",target_text='as an méid',components=[{"known":"out of","target":"as"},{"known":"the","target":"an"},{"known":"how much","target":"méid"}])
lego('S0106L03',F,'Q14',known_text='to feel happy',target_text='áthas a bheith orainn',type='M',components=[{"known":"happiness","target":"áthas"},{"known":"to be","target":"a bheith"},{"known":"on us","target":"orainn"}])
lego('S0129L01',F,'Q14',known_text="I'm so happy that",target_text='tá an-áthas orm go bhfuil',components=[{"known":"I'm so happy","target":"tá an-áthas orm"},{"known":"that is","target":"go bhfuil"}])
lego('S0145L02',F,"Q14: the seed no longer has nach bhfuil tú",known_text='are you not happy',target_text='nach bhfuil áthas ort',components=[{"known":"is there not","target":"nach bhfuil"},{"known":"happiness","target":"áthas"},{"known":"on you","target":"ort"}])
lego('S0145L03',F,'Q14: not-new, no rows',target_text='áthas ort')
lego('S0187L02',F,'Q14: not-new, no rows',known_text="I'm happy",target_text='tá áthas orm',type='M',components=[{"known":"there is","target":"tá"},{"known":"happiness","target":"áthas"},{"known":"on me","target":"orm"}])
lego('S0245L01',F,'Q14',target_text='tá áthas orm',components=[{"known":"there is","target":"tá"},{"known":"happiness","target":"áthas"},{"known":"on me","target":"orm"}])
lego('S0245L02',F,"Q14: not-new; its 'satisfied with how much | sásta leis an méid' rows stay as they are",target_text='as an méid',components=[{"known":"out of","target":"as"},{"known":"the amount","target":"an méid"}])
# --- baskets rewritten whole
basket('S0076L02',[
 ('build',"I'm very happy","tá an-áthas orm"),
 ('build',"I'm very happy now","tá an-áthas orm anois"),
 ('build',"I'm very happy today","tá an-áthas orm inniu"),
 ('build',"thank you, I'm very happy","go raibh maith agat, tá an-áthas orm"),
 ('use',"I'm very happy and I want to learn Irish every day","tá an-áthas orm agus is mian liom Gaeilge a fhoghlaim gach lá"),
 ('use',"I'm very happy because I'm learning Irish","tá an-áthas orm mar tá mé ag foghlaim Gaeilge"),
 ('use',"I'm very happy because I can speak Irish with you","tá an-áthas orm mar is féidir liom Gaeilge a labhairt leat"),
 ('use',"I'm very happy and I enjoy learning Irish","tá an-áthas orm agus bainim taitneamh as Gaeilge a fhoghlaim"),
 ('use',"I'm very happy at the moment","tá an-áthas orm faoi láthair"),
 ('use',"I'm very happy tonight because it is interesting","tá an-áthas orm anocht mar tá sé suimiúil"),
 ('use',"I'm very happy and I'm looking forward to speaking better","tá an-áthas orm agus tá mé ag tnúth le labhairt níos fearr"),
 ('use',"I'm very happy and I'd like to practise as often as possible","tá an-áthas orm agus ba mhaith liom a chleachtadh chomh minic agus is féidir"),
],F,'Q14')
upd('S0076L02C02','happiness','áthas',F,'Q14: word tile')
basket('S0106L03',[
 ('build',"we need to feel happy","caithfidh muid áthas a bheith orainn"),
 ('build',"we don't need to feel happy","ní chaithfidh muid áthas a bheith orainn"),
 ('build',"we need to feel happy now","caithfidh muid áthas a bheith orainn anois"),
 ('build',"we don't need to feel happy today","ní chaithfidh muid áthas a bheith orainn inniu"),
 ('use',"we don't need to feel happy at the moment","ní chaithfidh muid áthas a bheith orainn faoi láthair"),
 ('use',"we don't need to feel happy tomorrow","ní chaithfidh muid áthas a bheith orainn amárach"),
 ('use',"thank you, we don't need to feel happy now","go raibh maith agat, ní chaithfidh muid áthas a bheith orainn anois"),
 ('use',"we need to feel happy as often as possible","caithfidh muid áthas a bheith orainn chomh minic agus is féidir"),
 ('use',"we don't need to feel happy every day","ní chaithfidh muid áthas a bheith orainn gach lá"),
 ('use',"we need to feel happy but we don't need to go","caithfidh muid áthas a bheith orainn ach ní chaithfidh muid dul"),
 ('use',"we don't need to feel happy tonight","ní chaithfidh muid áthas a bheith orainn anocht"),
],F,'Q14')
basket('S0145L02',[
 ('build',"are you not happy","nach bhfuil áthas ort"),
 ('build',"why are you not happy","cén fáth nach bhfuil áthas ort"),
 ('build',"are you not happy now","nach bhfuil áthas ort anois"),
 ('build',"why are you not happy today","cén fáth nach bhfuil áthas ort inniu"),
 ('use',"why are you not happy at the moment","cén fáth nach bhfuil áthas ort faoi láthair"),
 ('use',"why are you not happy tonight","cén fáth nach bhfuil áthas ort anocht"),
 ('use',"are you not happy to help","nach bhfuil áthas ort cabhrú"),
 ('use',"why are you not happy to speak Irish","cén fáth nach bhfuil áthas ort Gaeilge a labhairt"),
 ('use',"are you not happy to be here","nach bhfuil áthas ort a bheith anseo"),
 ('use',"why are you not happy this week","cén fáth nach bhfuil áthas ort an tseachtain seo"),
 ('use',"are you not happy because you are tired","nach bhfuil áthas ort mar tá tú tuirseach"),
],F,'Q14')
# --- S0129L01
upd('S0129L01B01',"I'm so happy that","tá an-áthas orm go bhfuil",F,'Q14')
dele('S0129L01B03',F,'Q14: same as the first row now')
upd('S0129L01B04',"I'm so happy that you are","tá an-áthas orm go bhfuil tú",F,'Q14')
upd('S0129L01C01',None,'an-áthas',F,'Q14: word tile')
ins('S0129L01','build',"I'm so happy that she is","tá an-áthas orm go bhfuil sí",F,'Q14: keeps three build rows')
# --- rows whose LEGO holds the pronoun (ní raibh muid, tá sé ...): áthas cannot sit inside, so the row takes another taught adjective
dele('S0108L01B02',F,"Q14: LEGO 'ní raibh muid' cannot carry áthas orainn; 'we were not tired' is already in the basket")
upd('S0108L01B10',"we were not tired yesterday","ní raibh muid tuirseach inné",F,'Q14: as above')
upd('S0108L01U05',"we were not tired but I think that it's a good thing","ní raibh muid tuirseach ach ceapaim gur rud maith é",F,'Q14: as above')
upd('S0148L01U03',"of course he wasn't tired","ar ndóigh ní raibh sé tuirseach",F,"Q14: LEGO 'ní raibh sé' cannot carry áthas air")
upd('S0148L01U04',"he wasn't ready because I was tired","ní raibh sé réidh mar bhí mé tuirseach",F,'Q14: as above')
dele('S0222L01B01',F,"Q14: LEGO 'tá sé' cannot carry áthas air; 'he is tired' is already in the basket")
upd('S0222L01U03',"of course he is ready so far","ar ndóigh tá sé réidh go dtí seo",F,'Q14: as above')
upd('S0270L03B04',"I hope that I'm going to be ready","tá súil agam go mbeidh mé réidh",F,"Q14: LEGO 'go mbeidh mé' cannot carry áthas orm")
dele('S0087L03U01',F,"Q14: LEGO 'iad' cannot carry áthas orthu")
dele('S0087L03U06',F,"Q14: as above")
dele('S0076L03U07',F,"Q14: English 'impressed', Irish an-sásta leis an méid; cannot carry the re-cut LEGO")
dele('S0076L03U14',F,"Q14: 'satisfied with' keeps leis, so it cannot sit under 'as an méid'")
dele('S0076L04U06',F,"Q14: English 'very happy', Irish 'mothaím go maith'; mismatched row")
# --- noun subjects and one-offs, by hand
upd('S0145L04B01',"are you not happy any more","nach bhfuil áthas ort a thuilleadh",F,'Q14')
upd('S0141L02U07',None,"tá do charr ciúin agus tá áthas ar do chara inniu",F,'Q14')
upd('S0181L02U01',None,"ceapaim go bhfuil an-áthas ar mo mháthair",F,'Q14')
upd('S0226L01U08',None,"tá an-áthas ar an bhfear go dtí seo",F,'Q14')
upd('S0229L02U03',None,"bheadh áthas orm dá bhféadfadh sí teacht ar ais",F,'Q14')
upd('S0231L02U02',None,"tá aithne agam ar sheanfhear nach raibh áthas air ag an obair",F,'Q14')
upd('S0288L03U03',None,"ceapaim go mbeadh áthas ar na daoine a bhfuil aithne agam orthu cabhrú leat leis sin",F,'Q14')
upd('S0137L01B04',None,"tá sé níos tábhachtaí áthas a bheith ort",F,'Q14')
upd('S0137L01U04',None,"tá sé níos tábhachtaí obair go dian ná áthas a bheith ort",F,'Q14')
upd('S0137L05U01',None,"tá sé níos tábhachtaí áthas a bheith ort ná a bheith foirfe",F,'Q14')
upd('S0133L01U07',None,"cuireann tú aithne mhaith ar dhuine nuair atá áthas ort",F,'Q14')
dele('S0076L03U15',F,"Q14: 'to be happy as often as possible with how much' has no clean áthas wording")
dele('S0089L04U15',F,"Q14: 'important to be happy with the progress you make' has no clean áthas wording")
upd('S0131L05U06',"i feel so tired in my head today","mothaím chomh tuirseach i mo cheann inniu",F,"Q14: 'I feel happy' cannot keep mothaím with áthas; the row takes another taught adjective")
upd('S0146L03U05',"thank you, I feel very tired since I woke earlier","go raibh maith agat, mothaím an-tuirseach ó dhúisigh mé níos luaithe",F,"Q14: as above")
upd('S0180L04U03',"for a while I felt very tired","ar feadh tamaill mhothaigh mé an-tuirseach",F,"Q14: as above")
upd('S0200L03U11',None,"ceapaim go bhfuil sé tábhachtach a chinntiú go bhfuil áthas ar gach duine sula n-imíonn muid",F,'Q14')
upd('S0247L01U05',"I was fairly tired","bhí mé réasúnta tuirseach",F,"Q14: 'fairly happy' cannot keep réasúnta next to áthas")
dele('S0076L03U06',F,"Q14: 'surprised with the amount | mothaím ionadh leis an méid' cannot sit under 'as an méid'")
upd('S0076L03B01',None,'as an méid',F,'Q14: the LEGO row')
upd('S0245L02B02',None,'as an méid',F,'Q14: the LEGO row')
dele('S0083L02U03',F,"Q14: this LEGO is 'with what | leis an méid' (agree with what); a happy-with row would need as")
dele('S0083L02U04',F,"Q14: as above")
upd('S0088L01U01',"I am not very tired at the moment","níl mé an-tuirseach faoi láthair",F,"Q14: LEGO 'níl mé' cannot carry áthas orm")
upd('S0108L05U05',"I don't enjoy waking in the middle of the night and I am not ready in the morning",R['S0108L05U05']['target_text'].replace('ní bhím sásta','ní bhím réidh'),F,"Q14: 'ní bhím sásta' would need ní bhíonn áthas orm, not taught; the row takes another taught adjective")
upd('S0226L01U08',"the man is very tired so far","tá an fear an-tuirseach go dtí seo",F,"Q14: LEGO 'tá an fear' cannot carry áthas ar")
upd('S0236L03U06',"you said that she was very tired","dúirt tú go raibh sí an-tuirseach",F,"Q14: LEGO 'go raibh sí' cannot carry áthas uirthi")
upd('S0155L02U14',None,re.sub(r"ní raibh sí sásta \w+ ar chor ar bith","ní raibh áthas uirthi faoi ar chor ar bith",R['S0155L02U14']['target_text']),F,"Q14: 'happy about it' keeps faoi")
# seed sentences in a played basket
upd('S0076L05B05',S['76']['known'],"Tá an-áthas orm as an méid atá foghlamtha agam cheana féin",F,'Q14: the seed sentence')
upd('S0129L01U01',None,"Tá an-áthas orm go bhfuil tú ag déanamh chomh maith sin",F,'Q14: the seed sentence')
upd('S0187L03B01',S['187']['known'],"Tá áthas orm go dtí seo",F,'Q14: the seed sentence')
upd('S0245L03B05',S['245']['known'],"Tá áthas orm as an méid atá déanta agam in am gearr",F,'Q14: the seed sentence')
ins('S0106L06','use',S['106']['known'],"Ní chaithfidh muid áthas a bheith orainn, caithfidh muid obair go dian",F,'Q14: the seed sentence')
ins('S0145L04','use',S['145']['known'],"Cén fáth nach bhfuil áthas ort a thuilleadh?",F,'Q14: the seed sentence')
MANUAL=set(PH)
# --- literal conversion of the rest; every result printed and read
def conv(kn,t,n):
    def a(m):
        v,s,q=m.group(1),m.group(2),m.group(3)
        return f"{v} {'an-' if q in('an-','chomh ') else ''}áthas {PRON[s]}"
    t2=re.sub(r"\b([Tt]á|[Nn]íl|[Bb]hí|raibh|bhfuil|[Bb]eidh|mbeidh)\s+(mé|tú|sé|sí|muid|siad)\s+(an-|chomh |)sásta",a,t)
    if t2!=t:
        t2=re.sub(r"(áthas \w+) leis an ",r"\1 as an ",t2); t2=re.sub(r"(áthas \w+) le gach rud",r"\1 as gach rud",t2); t2=re.sub(r"(áthas \w+) leis\b",r"\1 as",t2)
    return t2
HAPPY=re.compile(r"\bhapp(y|ier)\b",re.I)
KEEP={}; ODD=[]
for k,r in sorted(R.items()):
    if k in MANUAL or r['phrase_role']=='component' or r['lego'] in('S0076L02','S0106L03','S0145L02'): continue
    has=re.search(r"sh?ásta",r['target_text'],re.I)
    if not has: continue
    if 'míshásta' in r['target_text']: KEEP[k]='unhappy | míshásta (not ruled)'; continue
    if not HAPPY.search(r['known_text']): KEEP[k]='English is not "happy"'; continue
    n=conv(r['known_text'],r['target_text'],int(k[1:5]))
    if n==r['target_text'] or re.search(r"sh?ásta",n,re.I): ODD.append(k); continue
    PH[k]=('upd',r['known_text'],n,F,'Q14')
# she / they before their pronoun is taught (uirthi 136, orthu 87): the row moves to 'he'
dele('S0076L03B04',F,'Q14: same as the next row once moved to he')
for k in ['S0076L03U02','S0076L03U12','S0076L04B06','S0076L04U11','S0076L04U13','S0076L05U02','S0076L05U15','S0089L04U03']:
    kn,t=PH[k][1],PH[k][2]
    t=t.replace('uirthi','air').replace('orthu','air').replace('mian léi','mian leis').replace('tá sí','tá sé').replace('Tá sí','Tá sé')
    kn=re.sub(r"\bshe's\b","he's",kn); kn=re.sub(r"\bshe\b","he",kn); kn=re.sub(r"\bShe\b","He",kn); kn=kn.replace('they were','he was')
    PH[k]=('upd',kn,t,F,"Q14; moved to 'he' because uirthi / orthu is not taught this early")
STALE=[]
if __name__=='__main__':
    show(F)
    print('\nODD (happy + sásta, not converted):')
    for k in ODD: print(' ',k,'|',R[k]['known_text'],'|',R[k]['target_text'])
    print('\nKEEP sásta:')
    for k,w in KEEP.items(): print(' ',k,'|',w,'|',R[k]['known_text'],'|',R[k]['target_text'])
