# Seeds 105, 127, 138: Eoghan's 'an chúis' for 'the reason / why' (he wrote it at 105 and 127), and 'wanted' on
# 'mian' (Kai's want = mian ruling, canon S16 note of 2026-11-09) in place of the old 'theastaigh ó', which was
# neither Eoghan's nor the course's want. 'cén fáth' (the question word) is his everywhere and stays.
from lib import *
F='reason + wanted'
seed(105,None,"sin é an chúis nach raibh an freagra ar eolas aige",F,"Eoghan's 'an chúis'; needed so 'the reason' has one form once 127 takes it")
seed(127,None,"Ní hé sin an chúis ar mhian liom tú a fheiceáil",F,"Eoghan's 'an chúis'; 'wanted' = mian (Kai's ruling) so our English stays; his 'ar mhaith liom labhairt leat' is 'would like to speak to you'")
seed(138,None,"seo an áit ar mhian le mo chara bualadh linn",F,"Eoghan's shape with mian for 'wanted' (Kai's ruling); theastaigh was the old text")
lego('S0105L01',F,'',target_text='sin é an chúis',components=[{"known":"that","target":"Sin"},{"known":"it","target":"é"},{"known":"the reason","target":"an chúis"}])
lego('S0127L02',F,'',target_text='an chúis ar mhian liom',components=[{"known":"the reason","target":"an chúis"},{"known":"that I wanted","target":"ar mhian liom"}])
lego('S0138L02',F,'',target_text='ar mhian le mo chara',components=[{"known":"where","target":"ar"},{"known":"wanted","target":"mhian"},{"known":"with","target":"le"},{"known":"my","target":"mo"},{"known":"friend","target":"chara"}])
RX=[(r"(?<![Cc]én )\ban fáth\b","an chúis"),(r"[Nn]íor theastaigh uaim",lambda m:m.group(0)[:4]+" mhian liom"),(r"\ba theastaigh uaim","ba mhian liom"),(r"ar theastaigh uait","ar mhian leat"),(r"ar theastaigh ó mo chara","ar mhian le mo chara"),(r"ar theastaigh uaim","ar mhian liom"),(r"\btheastaigh uaim","ba mhian liom")]
for k,r in sorted(R.items()):
    t=r['target_text']
    if r['phrase_role']=='component':
        if k.startswith(('S0105L01','S0127L02','S0138L02')): dele(k,F,'stale word tile of the re-cut LEGO')
        continue
    if re.search(r"(?<![Cc]én )\ban fáth\b|theastaigh",t): sub(k,RX,F,"an chúis / mian, read back by hand")
P26="the exact seed sentence, so the learner says it (P26)"
upd('S0105L05U02',"That is why he didn't know the answer","sin é an chúis nach raibh an freagra ar eolas aige",F,P26)
ins('S0127L03','use',"That isn't why I wanted to see you","Ní hé sin an chúis ar mhian liom tú a fheiceáil",F,P26)
upd('S0138L03U07',"this was where my friend wanted to meet us","seo an áit ar mhian le mo chara bualadh linn",F,P26)
if __name__=='__main__': show(F)
