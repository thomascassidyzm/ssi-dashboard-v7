# Seed 199: Eoghan's past habitual d'oibríodh for "used to work"; fadó ("long ago") leaves the seed and the course.
from lib import *
F='199 used to work'
seed(199,None,"d'oibríodh mo chara in oifig",F,"Eoghan's; his note: fadó means long ago")
lego('S0199L01',F,"re-cut to the seed's new verb form",known_text='used to work',target_text="d'oibríodh")
basket('S0199L01',[
 ('build','used to work',"d'oibríodh"),
 ('build','my friend used to work',"d'oibríodh mo chara"),
 ('build','my friend used to work in an office',"d'oibríodh mo chara in oifig"),
 ('use','he used to work in an office',"d'oibríodh sé in oifig"),
 ('use','she used to work in an office',"d'oibríodh sí in oifig"),
 ('use','my friend used to work in the office',"d'oibríodh mo chara san oifig"),
 ('use','he used to work in the office every day',"d'oibríodh sé san oifig gach lá"),
 ('use','she used to work hard every day',"d'oibríodh sí go dian gach lá"),
 ('use','he used to work hard',"d'oibríodh sé go dian"),
 ('use','my friend used to work hard',"d'oibríodh mo chara go dian"),
 ('use','my friend used to work here',"d'oibríodh mo chara anseo"),
],F)
lego_del('S0199L02',F,"'long ago | fadó' is no longer in the seed (L26); its 11 phrases go with it")
W="d'oibrigh (worked) is no longer taught anywhere: moved to the taught 'used to work'"
upd('S0198L02U06',"I know that my daughter wanted to learn Irish","Tá a fhios agam gur mhian le m'iníon Gaeilge a fhoghlaim",F,"d'oibrigh was used before it was taught and is now not taught at all; clause dropped")
upd('S0227L01U04',"That man used to work with me","d'oibríodh an fear sin liom",F,W)
upd('S0231L03U05',"that man who wanted to ask for help used to work for the council","d'oibríodh an fear sin ar mhian leis cabhair a iarraidh don chomhairle",F,W+"; fadó dropped")
upd('S0240L02B03',"my father used to work","d'oibríodh m'athair",F,W)
upd('S0240L02U04',"my father used to work as a teacher","d'oibríodh m'athair mar mhúinteoir",F,W+"; fadó dropped")
upd('S0283L03U05',"your friends who speak Irish used to work here","d'oibríodh do chairde a labhraíonn Gaeilge anseo",F,W+"; fadó dropped")
upd('S0284L03U06',"my sister's old friend used to work as a teacher","d'oibríodh seanchara mo dheirféar mar mhúinteoir",F,W+"; fadó dropped")
dele('S0214L01U05',F,"fadó is no longer taught; without it the row adds nothing")
dele('S0215L01U05',F,"fadó is no longer taught; without it the row adds nothing")
if __name__=='__main__': show(F)
